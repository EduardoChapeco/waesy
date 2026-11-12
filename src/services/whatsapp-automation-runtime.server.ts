import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { encryptConversationMessage } from "@/lib/conversation-crypto.server";
import { toolLookupTourismPackages, toolGetTourismAviationPolicies } from "@/services/whatsapp-ai-agent-tools.server";

function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length >= 7 ? `+${digits}` : null; }
function phoneHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

type InboundIdentityInput = { storeId: string; instanceId: string | null; provider: string; externalUserId: string | null; phone: string; displayName: string | null };

export async function resolveWhatsAppIdentity(input: InboundIdentityInput) {
  const db = getServerClient();
  const phone = normalizePhone(input.phone);
  if (!phone) return null;
  const hash = phoneHash(phone);
  let existing: any = null;
  if (input.externalUserId) {
    const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", input.storeId).eq("provider", input.provider).eq("external_user_id", input.externalUserId).maybeSingle();
    existing = result.data;
  }
  if (!existing) {
    const result = await db.from("whatsapp_contact_identities").select("*").eq("store_id", input.storeId).eq("provider", input.provider).eq("phone_hash", hash).maybeSingle();
    existing = result.data;
  }
  const base = { store_id: input.storeId, channel_instance_id: input.instanceId, provider: input.provider, channel: "whatsapp", external_user_id: input.externalUserId, phone_e164: phone, phone_hash: hash, display_name: input.displayName || existing?.display_name || phone, profile_name: input.displayName || existing?.profile_name || null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (existing) {
    const { data, error } = await db.from("whatsapp_contact_identities").update(base).eq("id", existing.id).eq("store_id", input.storeId).select().single();
    if (error) throw new Error(`identity_update_failed:${error.message}`);
    return data;
  }
  const { data, error } = await db.from("whatsapp_contact_identities").insert(base).select().single();
  if (error) throw new Error(`identity_insert_failed:${error.message}`);
  return data;
}

function conditionMatches(condition: any, input: Record<string, any>) {
  if (!condition?.config) return true;
  // Keyword match condicional (Typebot-grade)
  if (condition.config.keyword) {
    const kw = String(condition.config.keyword).toLowerCase().trim();
    const text = String(input.text || "").toLowerCase();
    return text.includes(kw);
  }
  if (condition.config.keywords && Array.isArray(condition.config.keywords)) {
    const text = String(input.text || "").toLowerCase();
    return condition.config.keywords.some((k: string) => text.includes(k.toLowerCase().trim()));
  }
  if (!condition.config.field) return true;
  const actual = input[condition.config.field];
  if (condition.config.equals !== undefined) return actual === condition.config.equals;
  if (condition.config.in && Array.isArray(condition.config.in)) return condition.config.in.includes(actual);
  return true;
}

export function isOutsideSupportSchedule(
  schedules: Array<{ day: string; hours: string; active: boolean }> | undefined,
  now: Date = new Date(),
): boolean {
  if (!Array.isArray(schedules) || schedules.length === 0) return false;
  const dayIndex = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const matchSchedule = schedules.find((item) => {
    const d = String(item.day || "").toLowerCase();
    if (dayIndex === 0) return d.includes("dom");
    if (dayIndex === 6) return d.includes("sáb") || d.includes("sab");
    return d.includes("seg") || d.includes("úteis") || d.includes("uteis");
  });

  if (!matchSchedule) return false;
  if (!matchSchedule.active) return true;

  const rangeMatch = String(matchSchedule.hours || "").match(/(\d{1,2}):(\d{2})\s*(?:às|as|-|a)\s*(\d{1,2}):(\d{2})/i);
  if (!rangeMatch) return false;
  const startMinutes = Number(rangeMatch[1]) * 60 + Number(rangeMatch[2]);
  const endMinutes = Number(rangeMatch[3]) * 60 + Number(rangeMatch[4]);
  return currentMinutes < startMinutes || currentMinutes > endMinutes;
}

/**
 * Verifica se o horário atual está fora do expediente da loja e enfileira resposta automática de ausência
 */
export async function checkStoreBusinessHoursAndAutoReply(input: {
  storeId: string;
  instanceId: string | null;
  provider: string;
  threadId: string;
  phone: string;
  senderName?: string | null;
}) {
  const db = getServerClient();
  const { data: store } = await db.from("stores").select("name, settings").eq("id", input.storeId).maybeSingle();
  const supportSettings = (store?.settings as any)?.support_settings;

  if (!supportSettings || supportSettings.auto_reply_enabled === false) return false;

  const todayKey = new Date().toISOString().slice(0, 10);
  const customerName = input.senderName?.trim() || "Cliente";
  const storeName = store?.name || "Nossa Loja";

  const isOutside = isOutsideSupportSchedule(supportSettings.support_schedules);
  const awayMessage = String(supportSettings.away_message || "").trim();
  const greetingMessage = String(supportSettings.greeting_message || "").trim();

  if (isOutside && awayMessage) {
    const renderedAway = awayMessage
      .replace(/\{\{\s*(nome_cliente|nome|senderName)\s*\}\}/gi, customerName)
      .replace(/\{\{\s*loja\s*\}\}/gi, storeName);
    const idempotencyKey = `away:${input.storeId}:${input.phone}:${todayKey}`;

    await db.from("whatsapp_outbox").upsert(
      {
        store_id: input.storeId,
        thread_id: input.threadId,
        channel_instance_id: input.instanceId,
        provider: input.provider,
        idempotency_key: idempotencyKey,
        recipient_phone: input.phone,
        message_type: "text",
        payload: { text: renderedAway },
        status: "pending",
      },
      { onConflict: "store_id,idempotency_key", ignoreDuplicates: true }
    );
    return true;
  }

  if (greetingMessage && supportSettings.greeting_enabled !== false) {
    const renderedGreeting = greetingMessage
      .replace(/\{\{\s*(nome_cliente|nome|senderName)\s*\}\}/gi, customerName)
      .replace(/\{\{\s*loja\s*\}\}/gi, storeName);
    const idempotencyKey = `greeting:${input.storeId}:${input.phone}:${todayKey}`;

    await db.from("whatsapp_outbox").upsert(
      {
        store_id: input.storeId,
        thread_id: input.threadId,
        channel_instance_id: input.instanceId,
        provider: input.provider,
        idempotency_key: idempotencyKey,
        recipient_phone: input.phone,
        message_type: "text",
        payload: { text: renderedGreeting },
        status: "pending",
      },
      { onConflict: "store_id,idempotency_key", ignoreDuplicates: true }
    );
    return true;
  }

  return false;
}

export async function dispatchWhatsAppInboundFlows(input: { storeId: string; instanceId: string | null; provider: string; threadId: string; identityId: string; phone: string; text: string; eventId?: string | null; payload: Record<string, any> }) {
  const db = getServerClient();
  const { data: flows, error } = await db.from("store_workflows").select("id, nodes, edges, workflow_version, execution_count, channel_instance_id, trigger_type, channel").eq("store_id", input.storeId).eq("status", "active");
  if (error) throw new Error(`flow_lookup_failed:${error.message}`);
  const results: Array<{ workflowId: string; runId?: string; status: string; error?: string }> = [];
  const senderName = String(input.payload?.pushName || input.payload?.senderName || "Cliente");

  // 1. Checa mensagem de ausência fora de horário de expediente ou saudação
  await checkStoreBusinessHoursAndAutoReply({ ...input, senderName }).catch(() => null);
  await evaluateControlledAiInboundRuntime(input).catch(() => null);

  const eligibleFlows = (flows || []).filter(
    (f: any) =>
      f.channel === "whatsapp" ||
      ["whatsapp_inbound", "greeting_message", "keyword_auto_reply", "away_hours"].includes(String(f.trigger_type || "")),
  );

  for (const flow of eligibleFlows) {
    if (flow.channel_instance_id && flow.channel_instance_id !== input.instanceId) continue;
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];

    // Trigger keyword match
    const trigger = nodes.find((n: any) => n.type === "trigger");
    if (trigger?.config?.keyword) {
      const kw = String(trigger.config.keyword).toLowerCase().trim();
      if (!input.text.toLowerCase().includes(kw)) continue;
    }
    if (trigger?.config?.keywords && Array.isArray(trigger.config.keywords)) {
      const matchAny = trigger.config.keywords.some((k: string) => input.text.toLowerCase().includes(k.toLowerCase().trim()));
      if (!matchAny) continue;
    }

    const conditions = nodes.filter((node: any) => node.type === "condition");
    if (!conditions.every((node: any) => conditionMatches(node, { ...input.payload, text: input.text, provider: input.provider }))) continue;
    const { data: run, error: runError } = await db.from("whatsapp_flow_runs").insert({ workflow_id: flow.id, store_id: input.storeId, thread_id: input.threadId, identity_id: input.identityId, trigger_event_id: input.eventId || null, status: "running", input_payload: { text: input.text, provider: input.provider, payload: input.payload }, output_payload: {}, current_node_id: nodes[0]?.id || null }).select("id").single();
    if (runError || !run) { results.push({ workflowId: flow.id, status: "failed", error: runError?.message || "run_not_created" }); continue; }
    try {
      let sent = 0;
      for (const node of nodes.filter((n: any) => n.type === "action")) {
        const action = node.config?.action || (node.config?.messageTemplate ? "send_text" : undefined);
        if (action === "set_consent") {
          const consent = node.config?.consent_status;
          if (["unknown", "opted_in", "opted_out"].includes(consent)) await db.from("whatsapp_contact_identities").update({ consent_status: consent, consent_source: `flow:${flow.id}`, consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", input.identityId).eq("store_id", input.storeId);
        } else if (action === "assign_agent" && node.config?.profile_id) {
          await db.from("chat_threads").update({ assigned_to_profile_id: node.config.profile_id, updated_at: new Date().toISOString() }).eq("id", input.threadId).eq("store_id", input.storeId);
        } else if (action === "route_department" && node.config?.department) {
          await db.from("chat_threads").update({ department: node.config.department, updated_at: new Date().toISOString() }).eq("id", input.threadId).eq("store_id", input.storeId);
        } else if (action === "add_tag" && node.config?.tag) {
          const { data: t } = await db.from("chat_threads").select("tags").eq("id", input.threadId).single();
          const currentTags = Array.isArray(t?.tags) ? t.tags : [];
          if (!currentTags.includes(node.config.tag)) {
            await db.from("chat_threads").update({ tags: [...currentTags, node.config.tag], updated_at: new Date().toISOString() }).eq("id", input.threadId).eq("store_id", input.storeId);
          }
        } else if (action === "send_text") {
          const rawBody = String(node.config?.text || node.config?.messageTemplate || "").trim();
          if (!rawBody) continue;
          const body = rawBody
            .replace(/\{\{\s*(senderName|nome_cliente|nome)\s*\}\}/gi, senderName)
            .replace(/\{\{\s*(senderMobile|telefone)\s*\}\}/gi, input.phone)
            .replace(/\{(nome_cliente|nome)\}/gi, senderName);
          const { data: outbox, error: outboxError } = await db.from("whatsapp_outbox").upsert({ store_id: input.storeId, thread_id: input.threadId, channel_instance_id: input.instanceId, provider: input.provider, idempotency_key: `flow:${flow.id}:run:${run.id}:node:${node.id}`, recipient_phone: input.phone, message_type: "text", payload: { text: body }, status: "pending" }, { onConflict: "store_id,idempotency_key", ignoreDuplicates: true }).select("id").maybeSingle();
          if (outboxError) throw new Error(`outbox_enqueue_failed:${outboxError.message}`);
          if (outbox?.id) sent++;
        }
        await db.from("whatsapp_flow_runs").update({ current_node_id: node.id, updated_at: new Date().toISOString() }).eq("id", run.id);
      }
      await db.from("whatsapp_flow_runs").update({ status: "completed", output_payload: { outbox_enqueued: sent }, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
      await db.from("store_workflows").update({ execution_count: (flow as any).execution_count ? (flow as any).execution_count + 1 : 1, last_run_at: new Date().toISOString() }).eq("id", flow.id).eq("store_id", input.storeId);
      results.push({ workflowId: flow.id, runId: run.id, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "flow_execution_failed";
      await db.from("whatsapp_flow_runs").update({ status: "failed", error_code: "ACTION_FAILED", error_message: message, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
      results.push({ workflowId: flow.id, runId: run.id, status: "failed", error: message });
    }
  }
  return results;
}

export type ControlledAiMode = "disabled" | "assisted" | "sandbox";

export interface ControlledAiDecisionLog {
  decisionId: string;
  timestamp: string;
  storeId: string;
  threadId: string;
  mode: ControlledAiMode;
  intent: "quote_request" | "support_issue" | "financial_query" | "human_handoff" | "general_inquiry";
  agentSlug: string;
  actionTaken:
    | "halted_disabled"
    | "halted_human_active"
    | "halted_from_me"
    | "halted_loop_guard"
    | "halted_cooldown"
    | "handoff_to_human_queue"
    | "copilot_suggestion_saved"
    | "sandbox_outbox_queued";
  reason: string;
  suggestedReply?: string;
  crmContextSummary?: {
    opportunitiesCount: number;
    activeStage: string | null;
    quotesCount: number;
  };
}

export function detectInboundIntent(text: string): {
  intent: ControlledAiDecisionLog["intent"];
  agentSlug: string;
} {
  const normalized = String(text || "").toLowerCase();
  if (/(atendente|humano|pessoa|falar com algu[eé]m|gerente|reclama[cç][aã]o|cancelar)/i.test(normalized)) {
    return { intent: "human_handoff", agentSlug: "human_supervisor" };
  }
  if (/(or[cç]amento|cota[cç][aã]o|pacote|roteiro|viagem|pre[cç]o|valor|excurs[aã]o|passagem|reserva)/i.test(normalized)) {
    return { intent: "quote_request", agentSlug: "commercial_closer" };
  }
  if (/(boleto|pix|fatura|pagamento|cobran[cç]a|recibo|parcela)/i.test(normalized)) {
    return { intent: "financial_query", agentSlug: "sdr_agent" };
  }
  if (/(problema|erro|ajuda|suporte|atraso|chamado|d[uú]vida)/i.test(normalized)) {
    return { intent: "support_issue", agentSlug: "sdr_agent" };
  }
  return { intent: "general_inquiry", agentSlug: "sdr_agent" };
}

export async function evaluateControlledAiInboundRuntime(input: {
  storeId: string;
  instanceId: string | null;
  provider: string;
  threadId: string;
  identityId: string;
  phone: string;
  text: string;
  eventId?: string | null;
  payload: Record<string, any>;
}): Promise<ControlledAiDecisionLog> {
  const db = getServerClient();
  const nowIso = new Date().toISOString();
  const decisionId = createHash("sha256")
    .update(`${input.storeId}:${input.threadId}:${input.eventId || input.text}:${nowIso.slice(0, 16)}`)
    .digest("hex")
    .slice(0, 24);

  // 1. Proteção absoluta contra loop de mensagens enviadas pelo próprio celular/sistema
  if (input.payload?.fromMe === true || input.payload?.origin === "whatsapp_device" || input.payload?.origin === "waesy_panel") {
    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode: "disabled",
      intent: "general_inquiry",
      agentSlug: "none",
      actionTaken: "halted_from_me",
      reason: "Mensagem originada pelo próprio estabelecimento (fromMe=true).",
    };
  }

  // 2. Carrega configuração da loja (Modo padrão: disabled em produção)
  const { data: store } = await db
    .from("stores")
    .select("name, settings")
    .eq("id", input.storeId)
    .maybeSingle();

  const aiConfig = ((store?.settings as any)?.ai_automation_config || {}) as {
    mode?: ControlledAiMode;
    enabled_agents?: string[];
    sandbox_allowed_phones?: string[];
    max_consecutive_turns?: number;
    cooldown_seconds?: number;
  };

  const mode: ControlledAiMode = aiConfig.mode || "disabled";
  const { intent, agentSlug } = detectInboundIntent(input.text);

  if (mode === "disabled") {
    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode: "disabled",
      intent,
      agentSlug,
      actionTaken: "halted_disabled",
      reason: "Automação de IA desativada por padrão em produção para esta loja.",
    };
  }

  if (
    Array.isArray(aiConfig.enabled_agents) &&
    aiConfig.enabled_agents.length > 0 &&
    !aiConfig.enabled_agents.includes(agentSlug) &&
    intent !== "human_handoff"
  ) {
    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode,
      intent,
      agentSlug,
      actionTaken: "halted_disabled",
      reason: `Agente ${agentSlug} desativado na configuração da loja.`,
    };
  }

  // 3. Carrega thread e verifica handoff humano, cooldown e limite de turnos
  const { data: thread } = await db
    .from("chat_threads")
    .select("id, customer_id, guest_name, guest_phone, metadata")
    .eq("id", input.threadId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  const meta = (thread?.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;

  if (meta.handoff_mode === "human_active" || meta.handoff_mode === "human_queue" || meta.ai_auto_reply_enabled === false) {
    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode,
      intent,
      agentSlug,
      actionTaken: "halted_human_active",
      reason: `Conversa sob controle humano (${meta.handoff_mode || "ai_paused"}).`,
    };
  }

  if (intent === "human_handoff") {
    const nextMeta = {
      ...meta,
      handoff_mode: "human_queue",
      ai_auto_reply_enabled: false,
      ai_halted_reason: "customer_requested_human",
      ai_halted_at: nowIso,
    };
    await db
      .from("chat_threads")
      .update({ metadata: nextMeta, updated_at: nowIso })
      .eq("id", input.threadId)
      .eq("store_id", input.storeId);

    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode,
      intent,
      agentSlug,
      actionTaken: "handoff_to_human_queue",
      reason: "Cliente solicitou atendimento humano; IA pausada imediatamente.",
    };
  }

  const maxTurns = typeof aiConfig.max_consecutive_turns === "number" ? aiConfig.max_consecutive_turns : 5;
  const currentTurns = Number(meta.ai_consecutive_turns || 0);
  if (currentTurns >= maxTurns) {
    return {
      decisionId,
      timestamp: nowIso,
      storeId: input.storeId,
      threadId: input.threadId,
      mode,
      intent,
      agentSlug,
      actionTaken: "halted_loop_guard",
      reason: `Limite máximo de turnos consecutivos da IA atingido (${currentTurns}/${maxTurns}).`,
    };
  }

  const cooldownSeconds = typeof aiConfig.cooldown_seconds === "number" ? aiConfig.cooldown_seconds : 15;
  if (meta.ai_last_reply_at) {
    const elapsedMs = Date.now() - new Date(meta.ai_last_reply_at).getTime();
    if (Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < cooldownSeconds * 1000) {
      return {
        decisionId,
        timestamp: nowIso,
        storeId: input.storeId,
        threadId: input.threadId,
        mode,
        intent,
        agentSlug,
        actionTaken: "halted_cooldown",
        reason: `Cooldown anti-rajada ativo (${Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000)}s restantes).`,
      };
    }
  }

  // 4. Acesso contextual controlado ao CRM (mesmo store_id)
  const phoneDigits = String(input.phone || "").replace(/\D/g, "");
  let opportunitiesCount = 0;
  let activeStage: string | null = null;
  let quotesCount = 0;

  if (phoneDigits.length >= 8) {
    const suffix = phoneDigits.slice(-8);
    const [leadsRes, quotesRes] = await Promise.all([
      db.from("leads_crm").select("id, status, name").eq("store_id", input.storeId).ilike("phone", `%${suffix}%`).limit(5),
      db.from("travel_quotes").select("id, status").eq("store_id", input.storeId).limit(5),
    ]);
    opportunitiesCount = (leadsRes.data || []).length;
    activeStage = leadsRes.data?.[0]?.status || null;
    quotesCount = (quotesRes.data || []).length;
  }

  const customerName = String(thread?.guest_name || input.payload?.pushName || "Cliente").trim();
  const storeName = String(store?.name || "Nossa Equipe").trim();

  const textLower = String(input.text || "").toLowerCase();
  const mentionsTourism = /(pacote|roteiro|viagem|passeio|destino|voo|aéreo|aereo|hotel|anac|bagagem|cancelamento|parcelamento|cia a[ée]rea)/i.test(textLower);

  let packageInfoText = "";
  if (mentionsTourism) {
    const packages = await toolLookupTourismPackages({ storeId: input.storeId, query: input.text, limit: 2 }).catch(() => []);
    if (packages && packages.length > 0) {
      const p = packages[0];
      packageInfoText = `\n\n[PACOTE DISPONÍVEL] *${p.title}* (${p.destination})\n- Valor: ${p.priceDisplay}\n- Condições: ${p.installmentTerms}\n- Datas: ${p.datesDescription || "Consulte saídas"}\n- Itens inclusos: ${(p.includedItems || []).slice(0, 3).join(", ")}`;
    }
  }

  let aviationInfoText = "";
  if (/(anac|bagagem|mala|cancelamento|arrependimento|no-show|no show|atraso)/i.test(textLower)) {
    const aviation = toolGetTourismAviationPolicies();
    if (/(bagagem|mala)/i.test(textLower)) {
      const bag = aviation.policies.find((p) => p.topic.includes("Bagagem"));
      if (bag) aviationInfoText = `\n\n[Regras de Bagagem - ANAC Res. 400]:\n- ${bag.rules[0]}\n- ${bag.rules[1]}\n- ${bag.rules[2]}`;
    } else if (/(cancelamento|arrependimento|desist)/i.test(textLower)) {
      const cancel = aviation.policies.find((p) => p.topic.includes("Arrependimento"));
      if (cancel) aviationInfoText = `\n\n[Política de Cancelamento e Arrependimento]:\n- ${cancel.rules[0]}\n- ${cancel.rules[1]}`;
    } else if (/(no-show|no show)/i.test(textLower)) {
      const noshow = aviation.policies.find((p) => p.topic.includes("No-Show"));
      if (noshow) aviationInfoText = `\n\n[Regra de No-Show na Ida - ANAC e STJ]:\n- ${noshow.rules[0]}\n- ${noshow.rules[1]}`;
    } else if (/(atraso)/i.test(textLower)) {
      const delay = aviation.policies.find((p) => p.topic.includes("Atrasos"));
      if (delay) aviationInfoText = `\n\n[Assistência Material por Atraso - ANAC]:\n- ${delay.rules[0]}\n- ${delay.rules[1]}\n- ${delay.rules[2]}`;
    }
  }

  let suggestedReply = "";
  if (packageInfoText || aviationInfoText) {
    suggestedReply = `Olá, ${customerName}! Aqui é o assistente virtual da ${storeName}.${packageInfoText}${aviationInfoText}\n\nPosso detalhar o roteiro completo ou conectar você com um dos nossos consultores para finalizar sua reserva?`;
  } else if (intent === "quote_request") {
    suggestedReply = `Olá, ${customerName}! Aqui é o assistente da ${storeName}. Identifiquei seu interesse em cotação/roteiro${opportunitiesCount > 0 ? ` (já localizei seu histórico comercial conosco)` : ""}. Qual destino e período você planeja para prepararmos sua proposta?`;
  } else if (intent === "financial_query") {
    suggestedReply = `Olá, ${customerName}! Recebi sua solicitação sobre pagamento/fatura na ${storeName}. Já estou verificando os detalhes financeiros do seu cadastro.`;
  } else {
    suggestedReply = `Olá, ${customerName}! Bem-vindo(a) à ${storeName}. Como posso ajudar você hoje?`;
  }

  const crmContextSummary = { opportunitiesCount, activeStage, quotesCount };

  const decisionLog: ControlledAiDecisionLog = {
    decisionId,
    timestamp: nowIso,
    storeId: input.storeId,
    threadId: input.threadId,
    mode,
    intent,
    agentSlug,
    actionTaken: mode === "sandbox" ? "sandbox_outbox_queued" : "copilot_suggestion_saved",
    reason:
      mode === "sandbox"
        ? "Resposta gerada em modo Sandbox controlado e enfileirada com idempotência."
        : "Sugestão gerada em modo Copilot Assistido para revisão do atendente.",
    suggestedReply,
    crmContextSummary,
  };

  const sandboxAllowed =
    mode === "sandbox" &&
    (!Array.isArray(aiConfig.sandbox_allowed_phones) ||
      aiConfig.sandbox_allowed_phones.length === 0 ||
      aiConfig.sandbox_allowed_phones.some((p) => phoneDigits.endsWith(String(p).replace(/\D/g, "").slice(-8))));

  if (mode === "sandbox" && sandboxAllowed) {
    const idempotencyKey = `ai_sandbox:${input.storeId}:${input.threadId}:${input.eventId || decisionId}`;
    await db.from("whatsapp_outbox").upsert(
      {
        store_id: input.storeId,
        thread_id: input.threadId,
        channel_instance_id: input.instanceId,
        provider: input.provider,
        idempotency_key: idempotencyKey,
        recipient_phone: input.phone,
        message_type: "text",
        payload: {
          text: suggestedReply,
          origin: "ai_sandbox",
          agent_slug: agentSlug,
          intent,
        },
        status: "pending",
      },
      { onConflict: "store_id,idempotency_key", ignoreDuplicates: true },
    );
  } else {
    decisionLog.actionTaken = "copilot_suggestion_saved";
  }

  const prevLogs = Array.isArray(meta.ai_decision_logs) ? meta.ai_decision_logs.slice(-9) : [];
  await db
    .from("chat_threads")
    .update({
      metadata: {
        ...meta,
        ai_consecutive_turns: currentTurns + 1,
        ai_last_reply_at: nowIso,
        ai_copilot_suggestion: {
          decisionId,
          agentSlug,
          intent,
          suggestedReply,
          createdAt: nowIso,
          crmContextSummary,
        },
        ai_decision_logs: [...prevLogs, decisionLog],
      },
      updated_at: nowIso,
    })
    .eq("id", input.threadId)
    .eq("store_id", input.storeId);

  return decisionLog;
}

export function protectedInboundPreview(text: string) { return encryptConversationMessage(text); }
