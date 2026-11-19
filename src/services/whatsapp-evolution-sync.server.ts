/**
 * whatsapp-evolution-sync.server.ts — Motor de Sincronizacao Delta Limitada e Auto-Recuperacao Evolution API v2.
 *
 * Projetado para execucao segura dentro dos limites de subrequests e tempo de Cloudflare Workers:
 * - Batching de lookup de threads e external_message_id (evita loops N+1 em 475+ conversas)
 * - Indice em memoria de contatos (`findContacts`)
 * - Reaper automatico de jobs travados em `running` (> 3 min)
 * - Finalizacao deterministica (`completed` / `failed`) com try/catch/finally
 * - Suporte integral a DMs, `@lid` sem numero sintetico `+`, grupos `@g.us` e mensagens `fromMe`
 */
import type { getServerClient } from "@/lib/supabase";
import { isRawLidOrSyntheticName, isSyntheticMetaLid } from "@/lib/chat-media-attachment";
import { buildBrazilPhoneVariants } from "@/lib/phone-match";
import { isBrokenOrMissingMediaUri } from "@/lib/whatsapp-media-utils";
import {
  extractParticipantPhone,
  isGroupJidOrSyntheticPhone,
  normalizePhoneE164,
} from "@/services/omnichannel-attribution.server";
import {
  buildEvolutionWebhookUrl,
  ensureEvolutionWebhookRegisteredDetailed,
  extractEvolutionMediaPayload,
  extractEvolutionMessageText,
  extractEvolutionMessageType,
  fetchEvolutionWebhookState,
  hasEvolutionWebhookDrift,
  normalizeEvolutionTimestampIso,
  pickFirstString,
  resolveEvolutionGatewayAccess,
  type JsonObject,
} from "@/services/whatsapp-evolution-config.server";
import {
  findExistingMessageExternalIds,
  persistWhatsAppMessagesIdempotently,
} from "@/services/whatsapp-message-persistence.server";

export type DeltaSyncMode = "manual_full" | "delta" | "auto_connect";

export interface EvolutionInstanceRow {
  id: string;
  store_id: string;
  instance_key: string;
  external_instance_id?: string | null;
  provider: string;
  status?: string | null;
  sync_mode?: string | null;
  webhook_url?: string | null;
  public_config?: JsonObject | null;
  secret_payload_encrypted?: string | null;
}

export interface EvolutionDeltaSyncResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  jobId?: string | null;
  instanceId: string;
  storeId: string;
  totalFound: number;
  importedChats: number;
  importedMessages: number;
  syncedAt: string;
  webhookReconciled?: boolean;
  error?: string;
}

type ContactIndexEntry = {
  jid: string;
  name: string | null;
  avatarUrl: string | null;
  altPhone: string | null;
};

const SYSTEM_EXCLUDED_JIDS = new Set(["status@broadcast", "newsletter", "broadcast"]);

function isExcludedJid(jid: string): boolean {
  const clean = jid.trim().toLowerCase();
  if (!clean) return true;
  if (SYSTEM_EXCLUDED_JIDS.has(clean)) return true;
  if (clean.endsWith("@broadcast") || clean.endsWith("@newsletter")) return true;
  return false;
}

function normalizeCandidateDigits(jid: string): string {
  return jid.replace(/@.*$/, "").replace(/\D/g, "");
}

function parseTimestampMs(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string" && raw.trim()) {
    const num = Number(raw.trim());
    if (Number.isFinite(num) && num > 0) {
      return num > 1e12 ? num : num * 1000;
    }
    const parsed = Date.parse(raw.trim());
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function extractChatsArray(json: any): JsonObject[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.chats)) return json.chats;
  return [];
}

function extractContactsArray(json: any): JsonObject[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.contacts)) return json.contacts;
  return [];
}

function extractFindMessagesRecords(json: any): JsonObject[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.messages?.records)) return json.messages.records;
  if (Array.isArray(json?.messages)) return json.messages;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

async function fetchEvolutionGroupSubjectsMap(
  cleanBase: string,
  apiKey: string,
  externalName: string,
): Promise<Map<string, string>> {
  const subjects = new Map<string, string>();
  try {
    const res = await fetch(
      `${cleanBase}/group/fetchAllGroups/${encodeURIComponent(externalName)}?getParticipants=false`,
      {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(4000),
      },
    ).catch(() => null);
    if (!res || !res.ok) return subjects;
    const json = (await res.json().catch(() => null)) as any;
    const rows: JsonObject[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.groups)
          ? json.groups
          : [];
    for (const row of rows) {
      const jid = pickFirstString(row?.id, row?.jid, row?.remoteJid);
      const subj = pickFirstString(row?.subject, row?.name);
      if (jid && subj && !isRawLidOrSyntheticName(subj)) {
        subjects.set(jid.trim().toLowerCase(), subj);
      }
    }
  } catch {
    // Fallback silencioso para instancias sem suporte a /group/fetchAllGroups
  }
  return subjects;
}

/** Finaliza jobs travados em `running` ha mais de 3 minutos antes de iniciar novo ciclo. */
export async function reapStaleWhatsAppSyncJobs(
  db: ReturnType<typeof getServerClient>,
  storeId?: string,
  instanceId?: string,
): Promise<number> {
  const cutoffIso = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  let query = db
    .from("whatsapp_history_sync_jobs")
    .update({
      status: "failed",
      notes: "Sincronizacao interrompida antes da conclusao (auto-reaper 3m).",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("started_at", cutoffIso);

  if (storeId) query = query.eq("store_id", storeId);
  if (instanceId) query = query.eq("instance_id", instanceId);

  const { data } = await query.select("id");
  return Array.isArray(data) ? data.length : 0;
}

/** Garante que o webhook Evolution da instancia esta alinhado sem deriva. */
export async function reconcileEvolutionWebhookIfNeeded(
  db: ReturnType<typeof getServerClient>,
  instance: EvolutionInstanceRow,
  forceCheck = false,
): Promise<{ reconciled: boolean; ok: boolean; webhookUrl: string; error?: string | null }> {
  let enrichedInst = instance;
  if (!enrichedInst.secret_payload_encrypted) {
    const { data: secRow } = await db
      .from("whatsapp_channel_instances")
      .select("secret_payload_encrypted")
      .eq("id", instance.id)
      .maybeSingle();
    if (secRow?.secret_payload_encrypted) {
      enrichedInst = { ...instance, secret_payload_encrypted: secRow.secret_payload_encrypted };
    }
  }
  const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(enrichedInst);
  const canonicalUrl = buildEvolutionWebhookUrl(instance.instance_key || externalName);

  if (!baseUrl || !apiKey || !externalName) {
    return { reconciled: false, ok: false, webhookUrl: canonicalUrl, error: "missing_gateway_credentials" };
  }

  const prevCfg = (instance.public_config && typeof instance.public_config === "object"
    ? instance.public_config
    : {}) as JsonObject;
  const lastVerifiedMs = parseTimestampMs(prevCfg.webhook_verified_at);
  const needsCheck =
    forceCheck ||
    !instance.webhook_url ||
    instance.webhook_url.replace(/\/+$/, "") !== canonicalUrl ||
    !lastVerifiedMs ||
    Date.now() - lastVerifiedMs > 10 * 60 * 1000;

  if (!needsCheck) {
    return { reconciled: false, ok: true, webhookUrl: canonicalUrl };
  }

  const remote = await fetchEvolutionWebhookState(baseUrl, apiKey, externalName);
  const drifted = !remote.ok || hasEvolutionWebhookDrift(remote, canonicalUrl);

  let regResult = { ok: true, error: null as string | null };
  if (drifted) {
    const res = await ensureEvolutionWebhookRegisteredDetailed(
      baseUrl,
      apiKey,
      externalName,
      canonicalUrl,
    );
    regResult = { ok: res.ok, error: res.error };
  }

  const nowIso = new Date().toISOString();
  await db
    .from("whatsapp_channel_instances")
    .update({
      webhook_url: canonicalUrl,
      public_config: {
        ...prevCfg,
        webhook_verified_at: nowIso,
        webhook_last_drift_repaired: drifted,
        webhook_base64_disabled: true,
        ...(regResult.error ? { webhook_last_error: regResult.error } : { webhook_last_error: null }),
      },
      updated_at: nowIso,
    })
    .eq("id", instance.id);

  return {
    reconciled: drifted,
    ok: regResult.ok,
    webhookUrl: canonicalUrl,
    error: regResult.error,
  };
}

/**
 * Executa sincronizacao delta ou inicial segura contra Evolution API.
 * Nunca deixa `whatsapp_history_sync_jobs` preso em `running`.
 */
export async function runEvolutionDeltaSyncForInstance(params: {
  db: ReturnType<typeof getServerClient>;
  instance: EvolutionInstanceRow;
  storeId: string;
  requestedBy?: string | null;
  mode?: DeltaSyncMode;
  maxChats?: number;
  messagesPerChat?: number;
  force?: boolean;
}): Promise<EvolutionDeltaSyncResult> {
  const {
    db,
    instance,
    storeId,
    requestedBy = null,
    mode = "delta",
    maxChats = mode === "manual_full" ? 35 : 15,
    messagesPerChat = mode === "manual_full" ? 20 : 10,
    force = false,
  } = params;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const cfg = (instance.public_config && typeof instance.public_config === "object"
    ? instance.public_config
    : {}) as JsonObject;

  await reapStaleWhatsAppSyncJobs(db, storeId, instance.id);

  // Cooldown e trava concorrente para chamadores automaticos (tabs, reconexao, cron)
  if (!force && mode !== "manual_full") {
    const lastAutoMs = parseTimestampMs(cfg.last_auto_sync_at || cfg.last_synced_at);
    if (lastAutoMs && nowMs - lastAutoMs < 25_000) {
      return {
        success: true,
        skipped: true,
        reason: "cooldown_active",
        instanceId: instance.id,
        storeId,
        totalFound: 0,
        importedChats: 0,
        importedMessages: 0,
        syncedAt: new Date(lastAutoMs).toISOString(),
      };
    }

    const { data: activeJob } = await db
      .from("whatsapp_history_sync_jobs")
      .select("id, started_at")
      .eq("store_id", storeId)
      .eq("instance_id", instance.id)
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeJob) {
      return {
        success: true,
        skipped: true,
        reason: "job_already_running",
        jobId: activeJob.id,
        instanceId: instance.id,
        storeId,
        totalFound: 0,
        importedChats: 0,
        importedMessages: 0,
        syncedAt: nowIso,
      };
    }
  }

  let hydratedInstance = instance;
  if (!hydratedInstance.secret_payload_encrypted) {
    const { data: secRow } = await db
      .from("whatsapp_channel_instances")
      .select("secret_payload_encrypted")
      .eq("id", instance.id)
      .maybeSingle();
    if (secRow?.secret_payload_encrypted) {
      hydratedInstance = {
        ...instance,
        secret_payload_encrypted: secRow.secret_payload_encrypted,
      };
    }
  }

  const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(hydratedInstance);
  if (!baseUrl || !apiKey || !externalName) {
    return {
      success: false,
      instanceId: instance.id,
      storeId,
      totalFound: 0,
      importedChats: 0,
      importedMessages: 0,
      syncedAt: nowIso,
      error: "Instância WhatsApp sem URL/API Key configurada no cofre.",
    };
  }

  // Reconcilia webhook automaticamente se necessario (corrige URL/eventos/base64:false)
  let webhookReconciled = false;
  let workingCfg: JsonObject = { ...cfg };
  try {
    const whRes = await reconcileEvolutionWebhookIfNeeded(
      db,
      hydratedInstance,
      mode === "manual_full" || mode === "auto_connect",
    );
    webhookReconciled = whRes.reconciled;
    workingCfg = {
      ...workingCfg,
      webhook_verified_at: nowIso,
      webhook_last_drift_repaired: whRes.reconciled,
      webhook_base64_disabled: true,
      webhook_last_error: whRes.error || null,
    };
  } catch {
    // Nao abortar sync caso /webhook/find oscile
  }

  const { data: createdJob } = await db
    .from("whatsapp_history_sync_jobs")
    .insert({
      store_id: storeId,
      instance_id: instance.id,
      requested_by: requestedBy,
      sync_mode: mode,
      status: "running",
      total_found: 0,
      imported_chats: 0,
      started_at: nowIso,
    })
    .select("id")
    .maybeSingle();

  const jobId = createdJob?.id || null;
  let totalFound = 0;
  let importedChats = 0;
  let importedMessages = 0;

  try {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const [chatsRes, contactsRes] = await Promise.all([
      fetch(`${cleanBase}/chat/findChats/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${cleanBase}/chat/findContacts/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(8000),
      }).catch(() => null),
    ]);

    if (!chatsRes.ok) {
      const txt = await chatsRes.text().catch(() => "");
      throw new Error(`Evolution /chat/findChats HTTP ${chatsRes.status}: ${txt.slice(0, 160)}`);
    }

    const chatsJson = await chatsRes.json().catch(() => []);
    const allChats = extractChatsArray(chatsJson).filter((c) => {
      const jid = String(c.remoteJid || c.id || "").trim();
      return Boolean(jid) && !isExcludedJid(jid);
    });
    totalFound = allChats.length;

    const contactsJson = contactsRes && contactsRes.ok
      ? await contactsRes.json().catch(() => [])
      : [];
    const contactEntries = extractContactsArray(contactsJson);

    const contactsByJid = new Map<string, ContactIndexEntry>();
    const contactsByDigits = new Map<string, ContactIndexEntry>();
    for (const c of contactEntries) {
      const jid = String(c.remoteJid || c.id || "").trim();
      if (!jid) continue;
      const candidateName = pickFirstString(c.pushName, c.name, c.verifiedName);
      const safeName =
        candidateName && !isRawLidOrSyntheticName(candidateName, normalizeCandidateDigits(jid))
          ? candidateName
          : null;
      const avatarUrl = pickFirstString(c.profilePicUrl, c.profilePictureUrl, c.pictureUrl);
      const rawAltPhone = pickFirstString(c.phoneNumber, c.pn);
      const altPhone =
        rawAltPhone && !isSyntheticMetaLid(rawAltPhone, normalizeCandidateDigits(rawAltPhone))
          ? normalizePhoneE164(rawAltPhone)
          : null;
      const entry: ContactIndexEntry = {
        jid,
        name: safeName,
        avatarUrl: avatarUrl && avatarUrl.startsWith("http") ? avatarUrl : null,
        altPhone,
      };
      contactsByJid.set(jid.toLowerCase(), entry);
      const digits = normalizeCandidateDigits(jid);
      if (digits && !jid.endsWith("@g.us")) {
        contactsByDigits.set(digits, entry);
      }
    }

    // Ordenar pelas conversas mais recentemente ativas e limitar estritamente ao orcamento
    const sortedChats = [...allChats]
      .sort((a, b) => {
        const aTs = Math.max(
          parseTimestampMs(a.updatedAt),
          parseTimestampMs(a.lastMessage?.messageTimestamp),
        );
        const bTs = Math.max(
          parseTimestampMs(b.updatedAt),
          parseTimestampMs(b.lastMessage?.messageTimestamp),
        );
        return bTs - aTs;
      })
      .slice(0, Math.max(1, Math.min(maxChats, 45)));

    // Pre-carregar threads existentes, instancias ativas e indice de leads deste store em queries em paralelo
    const [{ data: existingThreads }, { data: activeInstanceRows }, { data: storeLeadRows }] = await Promise.all([
      db
        .from("chat_threads")
        .select(
          "id, store_id, channel_instance_id, lead_id, customer_id, guest_name, entity_id, primary_phone_e164, status, last_message_at, last_message_text, metadata, thread_type, group_subject, unread_count",
        )
        .eq("store_id", storeId)
        .eq("context_type", "whatsapp")
        .order("updated_at", { ascending: false })
        .limit(1000),
      db
        .from("whatsapp_channel_instances")
        .select("id")
        .eq("store_id", storeId)
        .eq("status", "active"),
      db
        .from("leads_crm")
        .select("id, phone, customer_id")
        .eq("store_id", storeId)
        .limit(500),
    ]);
    const activeInstanceIds = new Set<string>(
      (activeInstanceRows || []).map((r: { id: string }) => r.id).filter(Boolean),
    );
    activeInstanceIds.add(instance.id);
    const leadByPhoneVariant = new Map<string, { id: string; customer_id: string | null }>();
    for (const l of storeLeadRows || []) {
      if (!l?.id || !l?.phone) continue;
      for (const variant of buildBrazilPhoneVariants(l.phone)) {
        if (!leadByPhoneVariant.has(variant)) {
          leadByPhoneVariant.set(variant, { id: l.id, customer_id: l.customer_id || null });
        }
      }
    }

    const groupThreadByJid = new Map<string, JsonObject>();
    const groupThreadByEntity = new Map<string, JsonObject>();
    const dmThreadByJid = new Map<string, JsonObject>();
    const dmThreadByEntity = new Map<string, JsonObject>();
    const dmThreadByPhone = new Map<string, JsonObject>();

    for (const th of existingThreads || []) {
      const meta = (th.metadata && typeof th.metadata === "object" ? th.metadata : {}) as JsonObject;
      const entityLower = typeof th.entity_id === "string" ? th.entity_id.trim().toLowerCase() : "";
      const thIsChannel = th.thread_type === "channel" || meta.is_channel === true || entityLower.includes("@newsletter");
      if (thIsChannel) continue;
      const thIsGroup = Boolean(
        th.thread_type === "group" ||
          meta.is_group === true ||
          entityLower.includes("@g.us") ||
          isGroupJidOrSyntheticPhone(entityLower, entityLower.replace(/\D/g, "")),
      );
      const j1 = typeof meta.whatsapp_jid === "string" ? meta.whatsapp_jid.trim().toLowerCase() : "";
      const j2 =
        typeof meta.whatsapp_jid_alt === "string" ? meta.whatsapp_jid_alt.trim().toLowerCase() : "";

      if (thIsGroup) {
        if (j1 && !groupThreadByJid.has(j1)) groupThreadByJid.set(j1, th);
        if (entityLower && !groupThreadByEntity.has(entityLower)) groupThreadByEntity.set(entityLower, th);
      } else {
        if (j1 && !j1.includes("@g.us") && !dmThreadByJid.has(j1)) dmThreadByJid.set(j1, th);
        if (j2 && !j2.includes("@g.us") && !dmThreadByJid.has(j2)) dmThreadByJid.set(j2, th);
        if (entityLower && !entityLower.includes("@g.us") && !dmThreadByEntity.has(entityLower)) {
          dmThreadByEntity.set(entityLower, th);
        }
        if (typeof th.primary_phone_e164 === "string" && th.primary_phone_e164.trim()) {
          if (!dmThreadByPhone.has(th.primary_phone_e164.trim())) {
            dmThreadByPhone.set(th.primary_phone_e164.trim(), th);
          }
        }
      }
    }

    const hasMissingGroupSubject = sortedChats.some((chat) => {
      const rj = String(chat.remoteJid || chat.id || "").trim().toLowerCase();
      return rj.endsWith("@g.us") && !pickFirstString(chat.subject, chat.name);
    });
    const groupSubjectCache = new Map<string, string>();
    if (hasMissingGroupSubject) {
      const fetchedSubjects = await fetchEvolutionGroupSubjectsMap(cleanBase, apiKey, externalName);
      fetchedSubjects.forEach((v, k) => groupSubjectCache.set(k, v));
    }

    type PreparedChatWork = {
      chat: JsonObject;
      thread: JsonObject;
      threadId: string;
      remoteJid: string;
      altJid: string | null;
      isGroup: boolean;
      chatUpdatedMs: number;
      needFetchMessages: boolean;
      rawMessages: JsonObject[];
    };

    const preparedWork: PreparedChatWork[] = [];
    const groupDirectoryUpserts: Array<Record<string, any>> = [];

    for (const chat of sortedChats) {
      const remoteJid = String(chat.remoteJid || chat.id || "").trim();
      const lowerJid = remoteJid.toLowerCase();
      const digits = normalizeCandidateDigits(remoteJid);
      const isGroup = isGroupJidOrSyntheticPhone(remoteJid, digits) || lowerJid.endsWith("@g.us");
      const lastMsg = chat.lastMessage && typeof chat.lastMessage === "object" ? (chat.lastMessage as JsonObject) : null;
      const altJid = isGroup
        ? null
        : pickFirstString(
            lastMsg?.key?.remoteJidAlt,
            lastMsg?.key?.senderPn,
            chat.remoteJidAlt,
          );
      const altLower = altJid ? altJid.toLowerCase() : null;

      const indexedContact = isGroup
        ? undefined
        : contactsByJid.get(lowerJid) ||
          (altLower ? contactsByJid.get(altLower) : undefined) ||
          (digits ? contactsByDigits.get(digits) : undefined);

      const resolvedPhone = !isGroup
        ? extractParticipantPhone(altJid) ||
          indexedContact?.altPhone ||
          (!isSyntheticMetaLid(remoteJid, digits) ? normalizePhoneE164(remoteJid) : null)
        : null;

      const isPureLid = !isGroup && lowerJid.endsWith("@lid") && !resolvedPhone;

      let existing = isGroup
        ? groupThreadByJid.get(lowerJid) ||
          groupThreadByEntity.get(lowerJid) ||
          (digits ? groupThreadByEntity.get(digits) : undefined) ||
          null
        : dmThreadByJid.get(lowerJid) ||
          (altLower ? dmThreadByJid.get(altLower) : undefined) ||
          dmThreadByEntity.get(lowerJid) ||
          (resolvedPhone ? dmThreadByPhone.get(resolvedPhone) : undefined) ||
          (!isPureLid && digits ? dmThreadByEntity.get(digits) : undefined) ||
          null;

      const lastMsgSenderName = !isGroup && !lastMsg?.key?.fromMe ? lastMsg?.pushName : null;
      const candidateName = isGroup
        ? pickFirstString(
            groupSubjectCache.get(lowerJid),
            chat.subject,
            chat.name,
          )
        : pickFirstString(
            chat.name,
            chat.subject,
            chat.pushName,
            indexedContact?.name,
            lastMsgSenderName,
          );
      const senderPushName = isGroup && !lastMsg?.key?.fromMe ? pickFirstString(lastMsg?.pushName) : null;
      const matchesSenderPushName = Boolean(
        isGroup &&
          candidateName &&
          senderPushName &&
          candidateName.trim().toLowerCase() === senderPushName.trim().toLowerCase(),
      );
      const safeName =
        candidateName &&
        !matchesSenderPushName &&
        !isRawLidOrSyntheticName(candidateName, digits)
          ? candidateName
          : null;
      const fallbackLabel = isGroup
        ? "Grupo WhatsApp"
        : isPureLid
          ? digits
            ? `Contato Meta #${digits.slice(-4)}`
            : "Contato Meta"
          : resolvedPhone || (digits ? `+${digits}` : "Contato WhatsApp");

      const avatarUrl =
        pickFirstString(chat.profilePicUrl, chat.profilePictureUrl, indexedContact?.avatarUrl) || null;
      const chatLastMsgMs = Math.max(
        parseTimestampMs(chat.updatedAt),
        parseTimestampMs(lastMsg?.messageTimestamp),
      );
      const lastMsgTimeIso = chatLastMsgMs > 0 ? new Date(chatLastMsgMs).toISOString() : nowIso;
      const lastMsgPreview = lastMsg ? extractEvolutionMessageText(lastMsg) : null;
      const matchedLead =
        !isGroup && resolvedPhone
          ? buildBrazilPhoneVariants(resolvedPhone)
              .map((v) => leadByPhoneVariant.get(v))
              .find(Boolean) || null
          : null;

      if (!existing) {
        const displayName = safeName || fallbackLabel;
        const insertPayload: Record<string, any> = {
          store_id: storeId,
          channel_instance_id: instance.id,
          ...(matchedLead ? { lead_id: matchedLead.id } : {}),
          ...(matchedLead?.customer_id ? { customer_id: matchedLead.customer_id } : {}),
          guest_name: displayName,
          guest_email: `${digits || remoteJid.replace(/[^a-zA-Z0-9]/g, "")}@whatsapp.waesy`,
          primary_phone_e164: resolvedPhone,
          status: "open",
          subject: isGroup ? `Grupo: ${displayName}` : `WhatsApp ${resolvedPhone || displayName}`,
          context_type: "whatsapp",
          entity_id: resolvedPhone || remoteJid,
          department: "geral",
          priority: "normal",
          thread_type: isGroup ? "group" : "store",
          group_subject: isGroup && safeName ? safeName : null,
          last_message_text: lastMsgPreview ? lastMsgPreview.slice(0, 280) : null,
          last_message_at: chatLastMsgMs > 0 ? lastMsgTimeIso : nowIso,
          last_history_synced_at: nowIso,
          metadata: {
            whatsapp_jid: remoteJid,
            history_bootstrap_done: false,
            ...(chatLastMsgMs > 0 ? { sync_cursor_ms: chatLastMsgMs } : {}),
            ...(matchedLead ? { active_lead_id: matchedLead.id } : {}),
            ...(altJid ? { whatsapp_jid_alt: altJid } : {}),
            ...(isGroup ? { is_group: true, ...(safeName ? { group_subject: safeName } : {}) } : {}),
            ...(isPureLid ? { is_lid: true } : {}),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
            ...(safeName && !isGroup ? { push_name: safeName } : {}),
          },
        };

        const { data: insertedThread, error: insErr } = await db
          .from("chat_threads")
          .insert(insertPayload)
          .select(
            "id, store_id, channel_instance_id, lead_id, customer_id, guest_name, entity_id, primary_phone_e164, status, last_message_at, last_message_text, metadata, thread_type, group_subject, unread_count",
          )
          .single();

        if (insErr || !insertedThread) {
          continue;
        }
        existing = insertedThread;
        if (isGroup) {
          groupThreadByJid.set(lowerJid, existing);
          groupThreadByEntity.set(lowerJid, existing);
        } else {
          dmThreadByJid.set(lowerJid, existing);
          if (resolvedPhone) dmThreadByPhone.set(resolvedPhone, existing);
        }
        importedChats += 1;
      } else {
        const prevMeta = (existing.metadata && typeof existing.metadata === "object"
          ? existing.metadata
          : {}) as JsonObject;
        const curGuest = String(existing.guest_name || "").trim();
        const shouldUpgradeName =
          Boolean(safeName) &&
          (!curGuest ||
            isRawLidOrSyntheticName(curGuest, digits) ||
            curGuest.startsWith("WhatsApp ") ||
            curGuest.startsWith("Contato Meta") ||
            curGuest === "Grupo WhatsApp" ||
            curGuest === "Cliente");

        const shouldAutoBindLead =
          Boolean(matchedLead?.id) &&
          !existing.lead_id &&
          prevMeta.active_lead_id !== "none";

        const metaChanged =
          (!prevMeta.whatsapp_jid && Boolean(remoteJid)) ||
          (Boolean(shouldAutoBindLead && matchedLead) && prevMeta.active_lead_id !== matchedLead?.id) ||
          (Boolean(altJid) && !prevMeta.whatsapp_jid_alt) ||
          (isGroup && !prevMeta.is_group) ||
          (Boolean(avatarUrl) && !prevMeta.avatar_url) ||
          (Boolean(safeName && isGroup) && !prevMeta.group_subject);

        const mergedMeta = {
          ...prevMeta,
          whatsapp_jid: prevMeta.whatsapp_jid || remoteJid,
          ...(shouldAutoBindLead && matchedLead ? { active_lead_id: matchedLead.id } : {}),
          ...(altJid && !prevMeta.whatsapp_jid_alt ? { whatsapp_jid_alt: altJid } : {}),
          ...(isGroup ? { is_group: true } : {}),
          ...(avatarUrl && !prevMeta.avatar_url ? { avatar_url: avatarUrl } : {}),
          ...(safeName && isGroup ? { group_subject: prevMeta.group_subject || safeName } : {}),
        };

        const existingLastMsgMs = parseTimestampMs(existing.last_message_at);
        const existingChannelInactive =
          Boolean(existing.channel_instance_id) &&
          existing.channel_instance_id !== instance.id &&
          !activeInstanceIds.has(String(existing.channel_instance_id)) &&
          chatLastMsgMs >= existingLastMsgMs;

        const isGenericPreview =
          !lastMsgPreview ||
          lastMsgPreview === "[Mensagem WhatsApp]" ||
          lastMsgPreview === "Mensagem WhatsApp";
      const shouldRepairPreviewText =
          (!existing.last_message_text || !String(existing.last_message_text).trim()) &&
          !isGenericPreview &&
          Boolean(lastMsgPreview && lastMsgPreview.trim());

        const patch: Record<string, any> = {};
        if (metaChanged) {
          patch.metadata = mergedMeta;
        }
        if (shouldAutoBindLead && matchedLead) {
          patch.lead_id = matchedLead.id;
          if (matchedLead.customer_id && !existing.customer_id) {
            patch.customer_id = matchedLead.customer_id;
          }
        }
        if (!existing.channel_instance_id || existingChannelInactive) {
          patch.channel_instance_id = instance.id;
        }
        if (!existing.primary_phone_e164 && resolvedPhone && !isGroup) {
          patch.primary_phone_e164 = resolvedPhone;
        }
        if (shouldUpgradeName && safeName) {
          patch.guest_name = safeName;
          if (isGroup) {
            patch.group_subject = safeName;
            patch.subject = `Grupo: ${safeName}`;
          }
        }
        if (shouldRepairPreviewText && lastMsgPreview) {
          patch.last_message_text = lastMsgPreview.slice(0, 280);
          if (chatLastMsgMs > 0 && (!existing.last_message_at || chatLastMsgMs >= existingLastMsgMs)) {
            patch.last_message_at = lastMsgTimeIso;
          }
        }
        if (Object.keys(patch).length > 0) {
          await db.from("chat_threads").update(patch).eq("id", existing.id);
          existing = { ...existing, ...patch, ...(patch.metadata ? { metadata: patch.metadata } : { metadata: mergedMeta }) };
        }
      }

      if (isGroup) {
        groupDirectoryUpserts.push({
          store_id: storeId,
          instance_id: instance.id,
          group_jid: remoteJid,
          subject: safeName || existing.group_subject || existing.guest_name || "Grupo WhatsApp",
          avatar_url: avatarUrl,
          last_message_at: chatLastMsgMs > 0 ? lastMsgTimeIso : nowIso,
          updated_at: nowIso,
        });
      }

      const existingMeta = (existing.metadata && typeof existing.metadata === "object"
        ? existing.metadata
        : {}) as JsonObject;
      const cursorMs = Math.max(
        parseTimestampMs(existingMeta.sync_cursor_ms),
        parseTimestampMs((existing as any).sync_cursor_at),
        parseTimestampMs(existing.last_message_at),
      );
      const hasBootstrapped = Boolean(
        existingMeta.history_bootstrap_done || (existing as any).history_bootstrap_done,
      );
      const isNewerThanCursor =
        !hasBootstrapped ||
        cursorMs === 0 ||
        (chatLastMsgMs > 0 && chatLastMsgMs > cursorMs);

      preparedWork.push({
        chat,
        thread: existing,
        threadId: existing.id,
        remoteJid,
        altJid,
        isGroup,
        chatUpdatedMs: chatLastMsgMs,
        needFetchMessages: isNewerThanCursor || force,
        rawMessages: lastMsg?.key?.id ? [lastMsg] : [],
      });
    }

    // Se alguma thread ja sincronizada ainda estiver com last_message_text vazio,
    // repara a partir das mensagens ja persistidas no Postgres sem chamar a Evolution.
    const missingPreviewByDb = preparedWork.filter(
      (w) =>
        !w.needFetchMessages &&
        (!w.thread?.last_message_text || !String(w.thread.last_message_text).trim()),
    );
    const dbRepairedPreviewMap = new Map<string, { text: string; atIso: string; ms: number }>();
    if (missingPreviewByDb.length > 0) {
      const targetIds = missingPreviewByDb.map((w) => w.threadId);
      const { data: persistedPreviews } = await db
        .from("chat_messages")
        .select("thread_id, message, message_type, created_at")
        .in("thread_id", targetIds)
        .order("created_at", { ascending: false })
        .limit(Math.max(10, targetIds.length * 4));
      for (const row of (persistedPreviews || []) as any[]) {
        if (!row?.thread_id || dbRepairedPreviewMap.has(row.thread_id)) continue;
        const msgType = String(row.message_type || "text");
        if (msgType === "internal_note" || msgType === "system_event") continue;
        const txt = String(row.message || "").trim();
        if (!txt) continue;
        const ms = parseTimestampMs(row.created_at);
        dbRepairedPreviewMap.set(row.thread_id, {
          text: txt.slice(0, 280),
          atIso: String(row.created_at || nowIso),
          ms: ms || nowMs,
        });
      }
    }

    // Atualizar catalogo de grupos descobertos em lote unico (tolerante a schema parcial)
    if (groupDirectoryUpserts.length > 0) {
      await db
        .from("whatsapp_groups_directory")
        .upsert(groupDirectoryUpserts, { onConflict: "instance_id,group_jid" })
        .then(() => undefined, () => undefined);
    }

    // Prioriza threads sem bootstrap ou com atividade estritamente mais recente que o cursor
    const maxFindMsgCalls = mode === "manual_full" ? 22 : 10;
    const threadsToFetch = preparedWork
      .filter((w) => w.needFetchMessages)
      .sort((a, b) => {
        const aBoot = (a.thread?.metadata as any)?.history_bootstrap_done ? 1 : 0;
        const bBoot = (b.thread?.metadata as any)?.history_bootstrap_done ? 1 : 0;
        if (aBoot !== bBoot) return aBoot - bBoot;
        return b.chatUpdatedMs - a.chatUpdatedMs;
      })
      .slice(0, maxFindMsgCalls);

    for (let idx = 0; idx < threadsToFetch.length; idx += 4) {
      const slice = threadsToFetch.slice(idx, idx + 4);
      await Promise.all(
        slice.map(async (item) => {
          try {
            const fmRes = await fetch(
              `${cleanBase}/chat/findMessages/${encodeURIComponent(externalName)}`,
              {
                method: "POST",
                headers: { apikey: apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({
                  where: { key: { remoteJid: item.remoteJid } },
                  page: 1,
                  offset: messagesPerChat,
                }),
                signal: AbortSignal.timeout(4500),
              },
            );
            if (!fmRes.ok) return;
            const fmJson = await fmRes.json().catch(() => null);
            const recs = extractFindMessagesRecords(fmJson);
            if (recs.length > 0) {
              const seenIds = new Set<string>();
              const combined: JsonObject[] = [];
              for (const r of [...recs, ...item.rawMessages]) {
                const mid = String(r?.key?.id || r?.id || "").trim();
                if (!mid || seenIds.has(mid)) continue;
                seenIds.add(mid);
                combined.push(r);
              }
              item.rawMessages = combined;
            }
          } catch {
            // Melhor esforco: chat.lastMessage continua disponivel para importacao
          }
        }),
      );
    }

    const fetchedThreadIds = new Set(threadsToFetch.map((t) => t.threadId));

    // Coletar todos os external_message_id candidatos e checar duplicatas GLOBALMENTE (evita falhas cross-thread)
    const allExtIds: string[] = [];
    const extIdSet = new Set<string>();

    for (const work of preparedWork) {
      for (const rec of work.rawMessages) {
        const extId = String(rec?.key?.id || rec?.id || "").trim();
        if (extId && !extIdSet.has(extId)) {
          extIdSet.add(extId);
          allExtIds.push(extId);
        }
      }
    }

    const existingMsgExtIds =
      allExtIds.length > 0 ? await findExistingMessageExternalIds(db, allExtIds) : new Set<string>();

    const rowsToInsert: Array<Record<string, any>> = [];
    const threadLatestUpdate = new Map<
      string,
      { text: string; atIso: string; ms: number; hasCustomerMsg: boolean; customerIso: string | null }
    >();
    const threadLatestSeen = new Map<
      string,
      { text: string; atIso: string; ms: number }
    >();

    for (const work of preparedWork) {
      const ordered = [...work.rawMessages].sort(
        (a, b) => parseTimestampMs(a.messageTimestamp) - parseTimestampMs(b.messageTimestamp),
      );
      for (const rec of ordered) {
        const extId = String(rec?.key?.id || rec?.id || "").trim();
        if (!extId) continue;
        // Ignorar protocolMessage puro sem texto util
        if (rec?.message?.protocolMessage && !rec?.message?.conversation && !rec?.message?.extendedTextMessage) {
          continue;
        }

        const fromMe = Boolean(rec?.key?.fromMe ?? rec?.fromMe);
        const mType = extractEvolutionMessageType(rec);
        const mText = extractEvolutionMessageText(rec);
        const msgIso = normalizeEvolutionTimestampIso(rec.messageTimestamp || work.chat.updatedAt);
        const msgMs = Date.parse(msgIso) || nowMs;

        const curSeen = threadLatestSeen.get(work.threadId);
        if (!curSeen || msgMs >= curSeen.ms) {
          threadLatestSeen.set(work.threadId, {
            text: mText.slice(0, 280),
            atIso: msgIso,
            ms: msgMs,
          });
        }

        if (existingMsgExtIds.has(extId)) continue;
        existingMsgExtIds.add(extId);

        const media = extractEvolutionMediaPayload(rec);
        const senderParticipant = pickFirstString(
          rec?.key?.participantAlt,
          rec?.key?.participant,
          rec?.participant,
        );
        const senderPhone = senderParticipant ? extractParticipantPhone(senderParticipant) : null;
        const senderName = !fromMe ? pickFirstString(rec.pushName) : null;

        const cleanMediaUrl =
          media.mediaUrl && !isBrokenOrMissingMediaUri(media.mediaUrl, mType) ? media.mediaUrl : null;

        rowsToInsert.push({
          thread_id: work.threadId,
          sender_id: null,
          is_staff_reply: fromMe,
          message: mText,
          message_type: mType,
          attachments: cleanMediaUrl ? [cleanMediaUrl] : [],
          channel: "whatsapp",
          provider: instance.provider,
          external_message_id: extId,
          provider_message_id: extId,
          provider_name: instance.provider,
          delivery_status: fromMe ? "sent" : "delivered",
          sent_at: fromMe ? msgIso : null,
          delivered_at: !fromMe ? msgIso : null,
          is_encrypted: false,
          encryption_version: 1,
          created_at: msgIso,
          payload: {
            origin: fromMe ? "whatsapp_device_sync" : "whatsapp_customer_sync",
            from_me: fromMe,
            is_group: work.isGroup,
            whatsapp_jid: work.remoteJid,
            ...(work.isGroup ? { group_jid: work.remoteJid } : {}),
            ...(work.altJid ? { whatsapp_jid_alt: work.altJid } : {}),
            ...(senderName ? { sender_name: senderName } : {}),
            ...(senderPhone ? { sender_phone: senderPhone } : {}),
            ...(media.mimetype || media.fileName || media.mediaKey || media.seconds || media.ptt
              ? {
                  media: {
                    mimetype: media.mimetype,
                    file_name: media.fileName,
                    caption: media.caption,
                    media_key: media.mediaKey,
                    seconds: media.seconds,
                    ptt: media.ptt,
                    gif_playback: media.gifPlayback,
                    external_message_id: extId,
                  },
                }
              : {}),
          },
        });

        const curLatest = threadLatestUpdate.get(work.threadId);
        if (!curLatest || msgMs >= curLatest.ms) {
          threadLatestUpdate.set(work.threadId, {
            text: mText.slice(0, 280),
            atIso: msgIso,
            ms: msgMs,
            hasCustomerMsg: curLatest?.hasCustomerMsg || !fromMe,
            customerIso: !fromMe ? msgIso : curLatest?.customerIso || null,
          });
        } else if (!fromMe) {
          curLatest.hasCustomerMsg = true;
          if (!curLatest.customerIso || msgMs > Date.parse(curLatest.customerIso)) {
            curLatest.customerIso = msgIso;
          }
        }
      }
    }

    if (rowsToInsert.length > 0) {
      const persistRes = await persistWhatsAppMessagesIdempotently<{
        id: string;
        thread_id: string;
        message_type?: string | null;
        external_message_id?: string | null;
        is_staff_reply?: boolean | null;
      }>(db, rowsToInsert, {
        selectFields: "id, thread_id, message_type, external_message_id, is_staff_reply",
        skipGlobalPrecheck: true,
      });
      importedMessages += persistRes.insertedCount;

      const mediaRowsToHydrate = persistRes.insertedRows
        .filter(
          (row) =>
            row?.id &&
            row?.external_message_id &&
            ["audio", "image", "video", "document", "sticker"].includes(String(row.message_type || "")),
        )
        .slice(-3);

      if (mediaRowsToHydrate.length > 0) {
        const [{ hydrateMediaFromEvolution }, { transcribeAudioMediaServer }] = await Promise.all([
          import("@/services/whatsapp-media.server"),
          import("@/services/whatsapp-media-intelligence.server"),
        ]);
        const workByThread = new Map(preparedWork.map((w) => [w.threadId, w]));
        for (const mRow of mediaRowsToHydrate) {
          const w = workByThread.get(mRow.thread_id);
          await hydrateMediaFromEvolution({
            db,
            storeId: instance.store_id,
            instance: instance as any,
            channelInstanceId: instance.id,
            threadId: mRow.thread_id,
            messageId: mRow.id,
            externalMessageId: String(mRow.external_message_id),
            remoteJid: w?.remoteJid || null,
            fromMe: Boolean(mRow.is_staff_reply),
            messageType: mRow.message_type || null,
            persistToMessage: true,
          }).catch(() => null);

          if (mRow.message_type === "audio" && !mRow.is_staff_reply) {
            await transcribeAudioMediaServer({
              db,
              storeId: instance.store_id,
              threadId: mRow.thread_id,
              messageId: mRow.id,
            }).catch(() => null);
          }
        }
      }
    }

    // Atualizar cursores incrementais e previews apenas onde houve novidade real ou preview ausente
    for (const work of preparedWork) {
      const thId = work.threadId;
      const thObj = work.thread;
      const info = threadLatestUpdate.get(thId);
      const seen = threadLatestSeen.get(thId);
      const dbRepaired = dbRepairedPreviewMap.get(thId);
      const prevMs = parseTimestampMs(thObj?.last_message_at);
      const prevMeta = (thObj?.metadata && typeof thObj.metadata === "object" ? thObj.metadata : {}) as JsonObject;
      const prevCursorMs = parseTimestampMs(prevMeta.sync_cursor_ms);
      const latestMs = info?.ms || seen?.ms || dbRepaired?.ms || work.chatUpdatedMs || prevCursorMs;
      const latestText = info?.text || seen?.text || dbRepaired?.text || "";
      const latestAtIso = info?.atIso || seen?.atIso || dbRepaired?.atIso || (latestMs > 0 ? new Date(latestMs).toISOString() : nowIso);
      const wasFetched = fetchedThreadIds.has(thId);
      const needsCursorAdvance =
        (wasFetched && !prevMeta.history_bootstrap_done) ||
        Boolean(info && info.ms > prevCursorMs) ||
        Boolean(seen && seen.ms > prevCursorMs);
      const needsPreviewRepair =
        (!thObj?.last_message_text || !String(thObj.last_message_text).trim()) &&
        Boolean(latestText);
      const hasNewerMsg = Boolean(info && info.ms > prevMs);

      if (!hasNewerMsg && !needsPreviewRepair && !needsCursorAdvance) {
        continue;
      }

      const nextMeta = {
        ...prevMeta,
        ...(wasFetched || hasNewerMsg ? { history_bootstrap_done: true } : {}),
        ...(latestMs > prevCursorMs ? { sync_cursor_ms: latestMs } : {}),
      };

      const threadPatch: Record<string, any> = {};
      if (needsCursorAdvance || hasNewerMsg) {
        threadPatch.metadata = nextMeta;
      }

      if (hasNewerMsg && info) {
        const hasNewerActivity = prevMs === 0 || info.ms > prevMs + 1000;
        const isRecentActivity = Date.now() - info.ms < 48 * 3600_000;
        threadPatch.last_message_text = info.text;
        threadPatch.last_message_at = info.atIso;
        if (info.customerIso) threadPatch.last_customer_message_at = info.customerIso;
        if (hasNewerActivity && isRecentActivity) threadPatch.status = "open";
        threadPatch.updated_at = new Date().toISOString();
      } else if (needsPreviewRepair && latestText) {
        threadPatch.last_message_text = latestText;
        if (!thObj?.last_message_at && latestMs > 0) {
          threadPatch.last_message_at = latestAtIso;
        }
      }

      if (Object.keys(threadPatch).length === 0) {
        continue;
      }

      await db.from("chat_threads").update(threadPatch).eq("id", thId);
    }

    const doneIso = new Date().toISOString();
    await db
      .from("whatsapp_channel_instances")
      .update({
        status: "connected",
        public_config: {
          ...workingCfg,
          last_synced_at: doneIso,
          last_auto_sync_at: doneIso,
          last_sync_error: null,
        },
        updated_at: doneIso,
      })
      .eq("id", instance.id);

    if (jobId) {
      await db
        .from("whatsapp_history_sync_jobs")
        .update({
          status: "completed",
          total_found: totalFound,
          imported_chats: importedChats,
          notes: `${importedMessages} mensagem(ns) sincronizada(s) em modo ${mode}.`,
          completed_at: doneIso,
        })
        .eq("id", jobId);
    }

    return {
      success: true,
      jobId,
      instanceId: instance.id,
      storeId,
      totalFound,
      importedChats,
      importedMessages,
      syncedAt: doneIso,
      webhookReconciled,
    };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err || "Erro na sincronizacao");
    const failIso = new Date().toISOString();

    if (jobId) {
      await db
        .from("whatsapp_history_sync_jobs")
        .update({
          status: "failed",
          total_found: totalFound,
          imported_chats: importedChats,
          notes: errMsg.slice(0, 300),
          completed_at: failIso,
        })
        .eq("id", jobId);
    }

    await db
      .from("whatsapp_channel_instances")
      .update({
        public_config: {
          ...workingCfg,
          last_sync_error: errMsg.slice(0, 200),
          last_auto_sync_at: failIso,
        },
        updated_at: failIso,
      })
      .eq("id", instance.id);

    return {
      success: false,
      jobId,
      instanceId: instance.id,
      storeId,
      totalFound,
      importedChats,
      importedMessages,
      syncedAt: failIso,
      webhookReconciled,
      error: errMsg,
    };
  }
}
