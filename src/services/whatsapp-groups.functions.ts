import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES, MANAGER_ROLES } from "@/lib/server-access";
import { normalizeWhatsAppPhoneInput } from "@/lib/phone-links";
import { slugify } from "@/lib/slug-utils";

export type WhatsAppGroupDirectoryDTO = {
  id: string;
  store_id: string;
  instance_id: string;
  group_jid: string;
  kind: "group" | "channel" | "community";
  subject: string;
  description: string | null;
  avatar_url: string | null;
  invite_code: string | null;
  invite_url: string | null;
  member_count: number;
  admin_count: number;
  max_capacity: number;
  is_announcement_only: boolean;
  is_archived: boolean;
  group_role?: "unclassified" | "promo_offers" | "internal_team" | "client_vip" | "operational";
  auto_publish_eligible?: boolean;
  silence_lead_capture?: boolean;
  default_instance_id?: string | null;
  offer_dispatch_preferences?: Record<string, any>;
  last_synced_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type RepeatedGroupMemberSummary = {
  key: string;
  phoneE164: string | null;
  displayName: string;
  groupCount: number;
  groups: Array<{
    groupId: string;
    subject: string;
    role: string;
    instanceId: string;
  }>;
};

export type WhatsAppGroupCampaignDTO = {
  id: string;
  store_id: string;
  instance_id: string;
  slug: string;
  title: string;
  description: string | null;
  group_name_template: string;
  group_description: string | null;
  overflow_threshold: number;
  max_capacity: number;
  next_group_sequence: number;
  admin_phones: string[];
  lead_form_id: string | null;
  is_active: boolean;
  active_group_id: string | null;
  active_invite_url: string | null;
  total_redirects: number;
  created_at: string;
  updated_at: string;
  active_group?: {
    id: string;
    subject: string;
    member_count: number;
    max_capacity: number;
    invite_url: string | null;
  } | null;
  pools?: Array<{
    id: string;
    group_id: string;
    sequence_number: number;
    status: "active" | "full" | "archived";
    invite_url: string | null;
    joined_count: number;
    subject?: string | null;
    member_count?: number;
  }>;
};

/** Calcula se o grupo ativo atingiu o limiar de transbordo para criacao automatica do proximo grupo. */
export function evaluateOverflowNeeded(params: {
  memberCount: number;
  overflowThreshold: number;
  maxCapacity: number;
}): boolean {
  const effectiveThreshold = Math.max(2, Math.min(params.overflowThreshold, params.maxCapacity));
  return params.memberCount >= effectiveThreshold;
}

/** Agrega participantes repetidos presentes em 2 ou mais grupos distintos da empresa. */
export function detectRepeatedGroupMembers(
  rows: Array<{
    group_id: string;
    instance_id: string;
    participant_jid: string;
    phone_e164: string | null;
    phone_digits: string | null;
    display_name: string | null;
    role: string;
    group_subject: string;
  }>,
): RepeatedGroupMemberSummary[] {
  const byMember = new Map<
    string,
    {
      key: string;
      phoneE164: string | null;
      displayName: string;
      groupsMap: Map<string, { groupId: string; subject: string; role: string; instanceId: string }>;
    }
  >();

  for (const row of rows) {
    const key = (row.phone_digits && row.phone_digits.length >= 8 ? row.phone_digits : row.participant_jid || "").trim();
    if (!key) continue;

    let entry = byMember.get(key);
    if (!entry) {
      entry = {
        key,
        phoneE164: row.phone_e164 || (row.phone_digits ? `+${row.phone_digits}` : null),
        displayName: row.display_name || row.phone_e164 || key,
        groupsMap: new Map(),
      };
      byMember.set(key, entry);
    }

    if (
      row.display_name &&
      row.display_name.trim() &&
      (entry.displayName === entry.key || entry.displayName === entry.phoneE164)
    ) {
      entry.displayName = row.display_name.trim();
    }

    if (!entry.groupsMap.has(row.group_id)) {
      entry.groupsMap.set(row.group_id, {
        groupId: row.group_id,
        subject: row.group_subject,
        role: row.role || "member",
        instanceId: row.instance_id,
      });
    }
  }

  return Array.from(byMember.values())
    .filter((entry) => entry.groupsMap.size >= 2)
    .map((entry) => ({
      key: entry.key,
      phoneE164: entry.phoneE164,
      displayName: entry.displayName,
      groupCount: entry.groupsMap.size,
      groups: Array.from(entry.groupsMap.values()),
    }))
    .sort((a, b) => b.groupCount - a.groupCount);
}

function slugifyCampaignSlug(raw: string): string {
  return slugify(raw).slice(0, 64) || `grupo-${Date.now().toString(36)}`;
}

function normalizePhoneArray(phones: string[]): string[] {
  const result = new Set<string>();
  for (const raw of phones) {
    const norm = normalizeWhatsAppPhoneInput(raw);
    if (norm?.digits) result.add(norm.digits);
  }
  return Array.from(result);
}

async function assertCanManageGroups(db: any, identity: any, storeId: string, instanceId?: string) {
  const membership = (identity.memberships || []).find((m: any) => m.store_id === storeId);
  const role = membership?.role || identity.role;
  const isSupervisor = [...MANAGER_ROLES].includes(role as any) || identity.role === "platform_admin" || identity.role === "master";
  if (isSupervisor) return;
  assertStoreAccess(identity, STAFF_ROLES, storeId);
  if (instanceId) {
    const { data: perm } = await db
      .from("whatsapp_instance_member_permissions")
      .select("can_manage_groups")
      .eq("store_id", storeId)
      .eq("instance_id", instanceId)
      .eq("profile_id", identity.id)
      .maybeSingle();
    if (perm?.can_manage_groups) return;
  }
  throw new Error("Apenas gerentes ou atendentes autorizados podem criar ou modificar grupos.");
}

async function createEvolutionGroupAndPromoteAdmins(params: {
  db: any;
  storeId: string;
  instance: any;
  subject: string;
  description?: string | null;
  adminPhones: string[];
  initialParticipantPhones?: string[];
  maxCapacity?: number;
}) {
  const { resolveEvolutionCredentialsForInstance } = await import("./whatsapp-media.server");
  const creds = resolveEvolutionCredentialsForInstance(params.instance);
  if (!creds) throw new Error("Credenciais da Evolution API indisponíveis para este canal WhatsApp.");

  const adminDigits = normalizePhoneArray(params.adminPhones);
  const extraDigits = normalizePhoneArray(params.initialParticipantPhones || []);
  const participantDigits = Array.from(new Set([...adminDigits, ...extraDigits]));

  const createRes = await fetch(
    `${creds.baseUrl}/group/create/${encodeURIComponent(creds.externalName)}`,
    {
      method: "POST",
      headers: { apikey: creds.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: params.subject,
        ...(params.description ? { description: params.description } : {}),
        ...(participantDigits.length > 0 ? { participants: participantDigits } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Falha ao criar grupo na Evolution API (HTTP ${createRes.status}): ${errText.slice(0, 140)}`);
  }

  const createdJson = (await createRes.json().catch(() => ({}))) as Record<string, any>;
  const groupJid = String(createdJson.id || createdJson.jid || createdJson.groupMetadata?.id || "").trim();
  if (!groupJid) {
    throw new Error("Evolution API criou resposta sem identificar o JID do grupo.");
  }

  // Promover administradores da empresa dentro do grupo
  if (adminDigits.length > 0) {
    await fetch(
      `${creds.baseUrl}/group/updateParticipant/${encodeURIComponent(creds.externalName)}?groupJid=${encodeURIComponent(groupJid)}`,
      {
        method: "POST",
        headers: { apikey: creds.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "promote",
          participants: adminDigits,
        }),
        signal: AbortSignal.timeout(10000),
      },
    ).catch(() => null);
  }

  // Gerar link de convite oficial do WhatsApp
  let inviteCode: string | null = null;
  let inviteUrl: string | null = null;
  const inviteRes = await fetch(
    `${creds.baseUrl}/group/inviteCode/${encodeURIComponent(creds.externalName)}?groupJid=${encodeURIComponent(groupJid)}`,
    {
      method: "GET",
      headers: { apikey: creds.apiKey },
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null);

  if (inviteRes && inviteRes.ok) {
    const invJson = (await inviteRes.json().catch(() => ({}))) as Record<string, any>;
    inviteCode = String(invJson.inviteCode || invJson.code || "").trim() || null;
    const rawUrl = String(invJson.inviteUrl || "").trim();
    inviteUrl = rawUrl || (inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null);
  }

  const nowIso = new Date().toISOString();
  const { data: dirRow, error: dirErr } = await params.db
    .from("whatsapp_groups_directory")
    .upsert(
      {
        store_id: params.storeId,
        instance_id: params.instance.id,
        group_jid: groupJid,
        kind: "group",
        subject: params.subject,
        description: params.description || null,
        invite_code: inviteCode,
        invite_url: inviteUrl,
        member_count: Math.max(1, participantDigits.length),
        admin_count: Math.max(1, adminDigits.length),
        max_capacity: params.maxCapacity || 1024,
        last_synced_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "store_id,instance_id,group_jid" },
    )
    .select("*")
    .single();

  if (dirErr || !dirRow) {
    throw new Error(`Grupo criado no WhatsApp, mas falhou ao registrar localmente: ${dirErr?.message}`);
  }

  for (const digits of participantDigits) {
    await params.db
      .from("whatsapp_group_members")
      .upsert(
        {
          store_id: params.storeId,
          group_id: dirRow.id,
          instance_id: params.instance.id,
          participant_jid: `${digits}@s.whatsapp.net`,
          phone_e164: `+${digits}`,
          phone_digits: digits,
          display_name: `+${digits}`,
          role: adminDigits.includes(digits) ? "admin" : "member",
          is_company_admin: adminDigits.includes(digits),
          last_seen_at: nowIso,
        },
        { onConflict: "group_id,participant_jid" },
      )
      .catch(() => null);
  }

  return dirRow as WhatsAppGroupDirectoryDTO;
}

async function rotateCampaignOverflowInternal(params: {
  db: any;
  campaign: any;
  instance: any;
  reason?: string;
}) {
  const { db, campaign, instance } = params;
  const nextSeq = Number(campaign.next_group_sequence || 1);
  const template = String(campaign.group_name_template || campaign.title || "Grupo VIP").trim();
  const formattedName = template.includes("{n}")
    ? template.replace(/\{n\}/g, String(nextSeq))
    : `${template} #${nextSeq}`;

  if (campaign.active_group_id) {
    await db
      .from("whatsapp_group_campaign_pools")
      .update({ status: "full", updated_at: new Date().toISOString() })
      .eq("campaign_id", campaign.id)
      .eq("group_id", campaign.active_group_id);
  }

  const createdGroup = await createEvolutionGroupAndPromoteAdmins({
    db,
    storeId: campaign.store_id,
    instance,
    subject: formattedName,
    description: campaign.group_description || campaign.description || null,
    adminPhones: Array.isArray(campaign.admin_phones) ? campaign.admin_phones : [],
    maxCapacity: Number(campaign.max_capacity || 1024),
  });

  const nowIso = new Date().toISOString();
  await db.from("whatsapp_group_campaign_pools").insert({
    store_id: campaign.store_id,
    campaign_id: campaign.id,
    group_id: createdGroup.id,
    sequence_number: nextSeq,
    status: "active",
    invite_url: createdGroup.invite_url,
    joined_count: createdGroup.member_count,
    updated_at: nowIso,
  });

  const { data: updatedCampaign } = await db
    .from("whatsapp_group_campaigns")
    .update({
      active_group_id: createdGroup.id,
      active_invite_url: createdGroup.invite_url,
      next_group_sequence: nextSeq + 1,
      updated_at: nowIso,
    })
    .eq("id", campaign.id)
    .select("*")
    .single();

  return {
    campaign: updatedCampaign || campaign,
    createdGroup,
    inviteUrl: createdGroup.invite_url,
  };
}

export const listStoreWhatsAppGroups = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional(), instanceId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) return { groups: [] as WhatsAppGroupDirectoryDTO[], repeatedMembers: [] as RepeatedGroupMemberSummary[] };
    const storeId = data?.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) return { groups: [] as WhatsAppGroupDirectoryDTO[], repeatedMembers: [] as RepeatedGroupMemberSummary[] };
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const db = getServerClient();
    let groupQuery = db
      .from("whatsapp_groups_directory")
      .select("*")
      .eq("store_id", storeId)
      .order("member_count", { ascending: false })
      .order("updated_at", { ascending: false });

    if (data?.instanceId) {
      groupQuery = groupQuery.eq("instance_id", data.instanceId);
    }

    const [{ data: groups, error }, { data: members }] = await Promise.all([
      groupQuery,
      db
        .from("whatsapp_group_members")
        .select("group_id, instance_id, participant_jid, phone_e164, phone_digits, display_name, role")
        .eq("store_id", storeId)
        .limit(5000),
    ]);

    if (error) throw new Error(`Falha ao listar grupos: ${error.message}`);
    const groupRows = (groups || []) as WhatsAppGroupDirectoryDTO[];
    const subjectById = new Map<string, string>(groupRows.map((g) => [g.id, g.subject]));

    const repeatedMembers = detectRepeatedGroupMembers(
      (members || []).map((m: any) => ({
        group_id: String(m.group_id),
        instance_id: String(m.instance_id),
        participant_jid: String(m.participant_jid),
        phone_e164: m.phone_e164 || null,
        phone_digits: m.phone_digits || null,
        display_name: m.display_name || null,
        role: String(m.role || "member"),
        group_subject: subjectById.get(String(m.group_id)) || "Grupo WhatsApp",
      })),
    );

    return {
      groups: groupRows,
      repeatedMembers,
    };
  });

export const listWhatsAppGroupMembers = createServerFn({ method: "GET" })
  .validator(z.object({ groupId: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const db = getServerClient();

    const { data: group } = await db
      .from("whatsapp_groups_directory")
      .select("id, store_id, subject, member_count")
      .eq("id", data.groupId)
      .maybeSingle();

    if (!group) throw new Error("Grupo não encontrado");
    assertStoreAccess(identity, STAFF_ROLES, group.store_id);

    const { data: members, error } = await db
      .from("whatsapp_group_members")
      .select("*")
      .eq("group_id", data.groupId)
      .order("role", { ascending: false })
      .order("display_name", { ascending: true });

    if (error) throw new Error(`Falha ao listar participantes do grupo: ${error.message}`);
    return {
      group,
      members: members || [],
    };
  });

export const syncStoreWhatsAppGroups = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid().optional(), instanceId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const storeId = data?.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const db = getServerClient();
    let instQuery = db
      .from("whatsapp_channel_instances")
      .select("*")
      .eq("store_id", storeId)
      .eq("provider", "evolution_api")
      .eq("is_active", true);

    if (data?.instanceId) {
      instQuery = instQuery.eq("id", data.instanceId);
    }

    const { data: instances, error: instErr } = await instQuery;
    if (instErr) throw new Error(instErr.message);
    if (!instances || instances.length === 0) {
      throw new Error("Nenhum canal Evolution API ativo para sincronizar grupos.");
    }

    const { resolveEvolutionCredentialsForInstance } = await import("./whatsapp-media.server");
    let syncedGroups = 0;
    let syncedMembers = 0;
    const nowIso = new Date().toISOString();

    for (const inst of instances) {
      const creds = resolveEvolutionCredentialsForInstance(inst as any);
      if (!creds) continue;

      const res = await fetch(
        `${creds.baseUrl}/group/fetchAllGroups/${encodeURIComponent(creds.externalName)}?getParticipants=true`,
        {
          method: "GET",
          headers: { apikey: creds.apiKey },
          signal: AbortSignal.timeout(18000),
        },
      ).catch(() => null);

      if (!res || !res.ok) continue;
      const rawGroups = (await res.json().catch(() => [])) as Array<Record<string, any>>;
      if (!Array.isArray(rawGroups)) continue;

      for (const g of rawGroups) {
        const groupJid = String(g.id || g.jid || "").trim();
        if (!groupJid) continue;
        const kind = groupJid.includes("@newsletter") ? "channel" : "group";
        const participants = Array.isArray(g.participants) ? g.participants : [];
        const adminCount = participants.filter((p: any) => p.admin === "admin" || p.admin === "superadmin" || p.isAdmin).length;
        const memberCount = Number(g.size || participants.length || 0);
        const subject = String(g.subject || g.name || "Grupo WhatsApp").trim();

        let inviteUrl: string | null = null;
        if (g.inviteCode) {
          inviteUrl = `https://chat.whatsapp.com/${String(g.inviteCode)}`;
        }

        const { data: dirRow } = await db
          .from("whatsapp_groups_directory")
          .upsert(
            {
              store_id: storeId,
              instance_id: inst.id,
              group_jid: groupJid,
              kind,
              subject,
              description: typeof g.desc === "string" ? g.desc : null,
              avatar_url: typeof g.pictureUrl === "string" ? g.pictureUrl : null,
              invite_code: g.inviteCode ? String(g.inviteCode) : undefined,
              ...(inviteUrl ? { invite_url: inviteUrl } : {}),
              member_count: memberCount,
              admin_count: adminCount,
              is_announcement_only: Boolean(g.announce),
              last_synced_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: "store_id,instance_id,group_jid" },
          )
          .select("*")
          .single();

        if (!dirRow) continue;
        syncedGroups += 1;

        for (const p of participants.slice(0, 500)) {
          const pJid = String(p?.id || p?.jid || "").trim();
          if (!pJid) continue;
          const isLid = pJid.endsWith("@lid");
          const digits = isLid ? "" : pJid.replace(/@.*$/, "").replace(/\D/g, "");
          const role = p.admin === "superadmin" ? "superadmin" : p.admin === "admin" || p.isAdmin ? "admin" : "member";
          try {
            await db
              .from("whatsapp_group_members")
              .upsert(
                {
                  store_id: storeId,
                  group_id: dirRow.id,
                  instance_id: inst.id,
                  participant_jid: pJid,
                  phone_e164: digits.length >= 8 ? `+${digits}` : null,
                  phone_digits: digits.length >= 8 ? digits : null,
                  display_name: String(p.name || p.pushName || (digits ? `+${digits}` : "Participante")).trim(),
                  role,
                  is_company_admin: role !== "member",
                  last_seen_at: nowIso,
                },
                { onConflict: "group_id,participant_jid" },
              );
          } catch {
            // Best-effort sync of group participants
          }
          syncedMembers += 1;
        }

        // Checa transbordo automatico se o grupo estiver ativo em alguma campanha
        const { data: activeCampaigns } = await db
          .from("whatsapp_group_campaigns")
          .select("*")
          .eq("store_id", storeId)
          .eq("active_group_id", dirRow.id)
          .eq("is_active", true);

        for (const camp of activeCampaigns || []) {
          await db
            .from("whatsapp_group_campaign_pools")
            .update({ joined_count: memberCount, updated_at: nowIso })
            .eq("campaign_id", camp.id)
            .eq("group_id", dirRow.id);

          if (
            evaluateOverflowNeeded({
              memberCount,
              overflowThreshold: Number(camp.overflow_threshold || 950),
              maxCapacity: Number(camp.max_capacity || 1024),
            })
          ) {
            await rotateCampaignOverflowInternal({
              db,
              campaign: camp,
              instance: inst,
              reason: "sync_threshold_reached",
            }).catch(() => null);
          }
        }
      }
    }

    return { syncedGroups, syncedMembers };
  });

export const createAutoWhatsAppGroup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      instanceId: z.string().uuid(),
      subject: z.string().trim().min(2).max(100),
      description: z.string().trim().max(500).optional(),
      adminPhones: z.array(z.string()).default([]),
      initialParticipantPhones: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

    const db = getServerClient();
    await assertCanManageGroups(db, identity, storeId, data.instanceId);

    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select("*")
      .eq("id", data.instanceId)
      .eq("store_id", storeId)
      .eq("provider", "evolution_api")
      .maybeSingle();

    if (!instance) throw new Error("Canal WhatsApp Evolution não encontrado.");

    const group = await createEvolutionGroupAndPromoteAdmins({
      db,
      storeId,
      instance,
      subject: data.subject,
      description: data.description || null,
      adminPhones: data.adminPhones,
      initialParticipantPhones: data.initialParticipantPhones,
    });

    return { group };
  });

export const listGroupOverflowCampaigns = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) return [] as WhatsAppGroupCampaignDTO[];
    const storeId = data?.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) return [] as WhatsAppGroupCampaignDTO[];
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const db = getServerClient();
    const { data: campaigns, error } = await db
      .from("whatsapp_group_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Falha ao listar campanhas de grupo: ${error.message}`);
    const list = (campaigns || []) as any[];
    if (list.length === 0) return [] as WhatsAppGroupCampaignDTO[];

    const campIds = list.map((c) => c.id);
    const [{ data: pools }, { data: groups }] = await Promise.all([
      db
        .from("whatsapp_group_campaign_pools")
        .select("*")
        .in("campaign_id", campIds)
        .order("sequence_number", { ascending: true }),
      db
        .from("whatsapp_groups_directory")
        .select("id, subject, member_count, max_capacity, invite_url")
        .eq("store_id", storeId),
    ]);

    const groupMap = new Map<string, any>((groups || []).map((g: any) => [g.id, g]));
    const poolsByCampaign = new Map<string, any[]>();
    for (const p of pools || []) {
      const grp = groupMap.get((p as any).group_id);
      const arr = poolsByCampaign.get((p as any).campaign_id) || [];
      arr.push({
        ...(p as any),
        subject: grp?.subject || `Grupo #${(p as any).sequence_number}`,
        member_count: grp?.member_count ?? (p as any).joined_count ?? 0,
      });
      poolsByCampaign.set((p as any).campaign_id, arr);
    }

    return list.map((c) => ({
      ...c,
      active_group: c.active_group_id ? groupMap.get(c.active_group_id) || null : null,
      pools: poolsByCampaign.get(c.id) || [],
    })) as WhatsAppGroupCampaignDTO[];
  });

export const upsertGroupOverflowCampaign = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      instanceId: z.string().uuid(),
      title: z.string().trim().min(2).max(120),
      slug: z.string().trim().min(2).max(80),
      description: z.string().trim().max(500).optional(),
      groupNameTemplate: z.string().trim().min(2).max(90),
      groupDescription: z.string().trim().max(500).optional(),
      overflowThreshold: z.number().int().min(2).max(1024).default(950),
      maxCapacity: z.number().int().min(2).max(1024).default(1024),
      adminPhones: z.array(z.string()).default([]),
      leadFormId: z.string().uuid().optional().nullable(),
      isActive: z.boolean().default(true),
      initialGroupId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");

    const db = getServerClient();
    await assertCanManageGroups(db, identity, storeId, data.instanceId);

    const cleanSlug = slugifyCampaignSlug(data.slug);
    const adminDigits = normalizePhoneArray(data.adminPhones);
    const effectiveThreshold = Math.min(data.overflowThreshold, data.maxCapacity);

    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select("*")
      .eq("id", data.instanceId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!instance) throw new Error("Instância WhatsApp selecionada não encontrada.");

    const nowIso = new Date().toISOString();
    let activeGroupId = data.initialGroupId || null;
    let activeInviteUrl: string | null = null;
    if (activeGroupId) {
      const { data: g } = await db
        .from("whatsapp_groups_directory")
        .select("id, invite_url")
        .eq("id", activeGroupId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (g) activeInviteUrl = g.invite_url || null;
    }

    const rowPayload: Record<string, any> = {
      store_id: storeId,
      instance_id: data.instanceId,
      slug: cleanSlug,
      title: data.title,
      description: data.description || null,
      group_name_template: data.groupNameTemplate,
      group_description: data.groupDescription || null,
      overflow_threshold: effectiveThreshold,
      max_capacity: data.maxCapacity,
      admin_phones: adminDigits,
      lead_form_id: data.leadFormId || null,
      is_active: data.isActive,
      updated_at: nowIso,
      ...(activeGroupId ? { active_group_id: activeGroupId, active_invite_url: activeInviteUrl } : {}),
    };

    let savedCampaign: any = null;
    if (data.id) {
      const { data: updated, error } = await db
        .from("whatsapp_group_campaigns")
        .update(rowPayload)
        .eq("id", data.id)
        .eq("store_id", storeId)
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao atualizar campanha: ${error.message}`);
      savedCampaign = updated;
    } else {
      const { data: inserted, error } = await db
        .from("whatsapp_group_campaigns")
        .insert({
          ...rowPayload,
          created_by: identity.id,
        })
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar campanha de transbordo: ${error.message}`);
      savedCampaign = inserted;
    }

    if (savedCampaign && !savedCampaign.active_group_id) {
      try {
        const rotated = await rotateCampaignOverflowInternal({
          db,
          campaign: savedCampaign,
          instance,
          reason: "initial_group_seed",
        });
        savedCampaign = rotated.campaign;
      } catch (seedErr: any) {
        // Se gateway estiver offline em ambiente sem Evolution, preserva campanha salva para operacao posterior
        console.warn("[whatsapp-groups] Aviso ao provisionar grupo inicial automatico:", seedErr?.message);
      }
    } else if (savedCampaign?.active_group_id && !data.id) {
      try {
        await db
          .from("whatsapp_group_campaign_pools")
          .upsert(
            {
              store_id: storeId,
              campaign_id: savedCampaign.id,
              group_id: savedCampaign.active_group_id,
              sequence_number: 1,
              status: "active",
              invite_url: savedCampaign.active_invite_url,
            },
            { onConflict: "campaign_id,group_id" },
          );
      } catch {
        // Best-effort pool registration on initial campaign creation
      }
    }

    return { campaign: savedCampaign as WhatsAppGroupCampaignDTO };
  });

export const triggerGroupCampaignOverflowNow = createServerFn({ method: "POST" })
  .validator(z.object({ campaignId: z.string().uuid(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    const db = getServerClient();

    const { data: campaign } = await db
      .from("whatsapp_group_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (!campaign) throw new Error("Campanha não encontrada.");
    await assertCanManageGroups(db, identity, campaign.store_id, campaign.instance_id);

    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select("*")
      .eq("id", campaign.instance_id)
      .maybeSingle();

    if (!instance) throw new Error("Instância WhatsApp vinculada não encontrada.");

    const result = await rotateCampaignOverflowInternal({
      db,
      campaign,
      instance,
      reason: "manual_rotate",
    });

    return {
      campaign: result.campaign as WhatsAppGroupCampaignDTO,
      createdGroup: result.createdGroup,
      inviteUrl: result.inviteUrl,
    };
  });

/** Server Function publica segura para a rota `/g/$slug`: nao vaza PII nem lista de participantes. */
export const resolvePublicGroupCampaignInvite = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: z.string().trim().min(1).max(80),
      incrementRedirect: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const cleanSlug = data.slug.trim().toLowerCase();

    const { data: campaign } = await db
      .from("whatsapp_group_campaigns")
      .select("id, store_id, instance_id, slug, title, description, group_name_template, group_description, overflow_threshold, max_capacity, next_group_sequence, admin_phones, is_active, active_group_id, active_invite_url, total_redirects")
      .eq("slug", cleanSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!campaign) {
      return { found: false as const };
    }

    let activeGroup: any = null;
    if (campaign.active_group_id) {
      const { data: gRow } = await db
        .from("whatsapp_groups_directory")
        .select("id, group_jid, subject, member_count, max_capacity, invite_url")
        .eq("id", campaign.active_group_id)
        .maybeSingle();
      activeGroup = gRow;
    }

    let currentCount = Number(activeGroup?.member_count || 0);
    let inviteUrl: string | null = activeGroup?.invite_url || campaign.active_invite_url || null;
    let activeGroupName = String(activeGroup?.subject || campaign.title);
    let rotated = false;

    const { data: instance } = await db
      .from("whatsapp_channel_instances")
      .select("*")
      .eq("id", campaign.instance_id)
      .eq("is_active", true)
      .maybeSingle();

    // Checagem ao vivo opcional da lotacao atual via Evolution API
    if (instance && activeGroup?.group_jid) {
      try {
        const { resolveEvolutionCredentialsForInstance } = await import("./whatsapp-media.server");
        const creds = resolveEvolutionCredentialsForInstance(instance as any);
        if (creds) {
          const infoRes = await fetch(
            `${creds.baseUrl}/group/findGroupInfos/${encodeURIComponent(creds.externalName)}?groupJid=${encodeURIComponent(activeGroup.group_jid)}`,
            {
              method: "GET",
              headers: { apikey: creds.apiKey },
              signal: AbortSignal.timeout(4000),
            },
          ).catch(() => null);

          if (infoRes && infoRes.ok) {
            const infoJson = (await infoRes.json().catch(() => ({}))) as Record<string, any>;
            const liveSize = Number(
              infoJson.size || (Array.isArray(infoJson.participants) ? infoJson.participants.length : currentCount),
            );
            if (Number.isFinite(liveSize) && liveSize >= 0) {
              currentCount = liveSize;
              await db
                .from("whatsapp_groups_directory")
                .update({ member_count: liveSize, last_synced_at: new Date().toISOString() })
                .eq("id", activeGroup.id);
            }
          }
        }
      } catch {
        // segue com contagem em cache
      }
    }

    if (
      instance &&
      evaluateOverflowNeeded({
        memberCount: currentCount,
        overflowThreshold: Number(campaign.overflow_threshold || 950),
        maxCapacity: Number(campaign.max_capacity || 1024),
      })
    ) {
      try {
        const overflowed = await rotateCampaignOverflowInternal({
          db,
          campaign,
          instance,
          reason: "public_visit_overflow",
        });
        inviteUrl = overflowed.inviteUrl;
        activeGroupName = overflowed.createdGroup.subject;
        currentCount = overflowed.createdGroup.member_count;
        rotated = true;
      } catch {
        // Fallback para link ativo atual se API WhatsApp momentaneamente indisponivel
      }
    }

    if (data.incrementRedirect) {
      await db
        .from("whatsapp_group_campaigns")
        .update({ total_redirects: Number(campaign.total_redirects || 0) + 1 })
        .eq("id", campaign.id);
    }

    return {
      found: true as const,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description || null,
      activeGroupName,
      memberCount: currentCount,
      overflowThreshold: Number(campaign.overflow_threshold || 950),
      maxCapacity: Number(campaign.max_capacity || 1024),
      inviteUrl,
      rotated,
    };
  });

export const updateWhatsAppGroupRoleAndPrefsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      groupId: z.string().uuid(),
      groupRole: z.enum(["unclassified", "promo_offers", "internal_team", "client_vip", "operational"]),
      autoPublishEligible: z.boolean().optional(),
      silenceLeadCapture: z.boolean().optional(),
      defaultInstanceId: z.string().uuid().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, MANAGER_ROLES, data.storeId);
    const db = getServerClient();

    const isInternal = data.groupRole === "internal_team";
    const silence = isInternal ? true : (data.silenceLeadCapture ?? false);
    const autoPub = isInternal ? false : (data.autoPublishEligible ?? false);

    const { data: updated, error } = await db
      .from("whatsapp_groups_directory")
      .update({
        group_role: data.groupRole,
        auto_publish_eligible: autoPub,
        silence_lead_capture: silence,
        default_instance_id: data.defaultInstanceId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.groupId)
      .eq("store_id", data.storeId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar papel do grupo WhatsApp: ${error.message}`);
    }
    return updated;
  });
