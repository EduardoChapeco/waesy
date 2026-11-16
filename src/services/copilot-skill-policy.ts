import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { CANONICAL_SKILLS_DEFINITIONS } from "./ai-skills-router.functions";

export type EffectiveSkillSource = "native" | "custom" | "community";

export interface EffectiveSkillEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  source: EffectiveSkillSource;
  isActive: boolean;
  isSystem: boolean;
  riskTier: "READ" | "WRITE" | "EXTERNAL_WRITE" | "FINANCIAL";
  icon: string;
  storeId: string | null;
  ownerId: string | null;
  allowedTools: string[];
  systemInstructions: string | null;
  modelPreference: string | null;
  triggerExplicit: string | null;
  whenNotToUse: string | null;
  capabilities: string[];
}

export interface EffectiveSkillPolicy {
  activeSlugs: string[];
  disabledSlugs: string[];
  blockedTools: string[];
  explicitAllowedTools: string[] | null;
  customInstructions: string[];
  modelPreference: string | null;
  skills: EffectiveSkillEntry[];
  isToolAllowed: (toolName: string) => boolean;
}

const CANONICAL_SKILL_META: Record<
  string,
  { name: string; description: string; category: string; icon: string; riskTier: "READ" | "WRITE" | "EXTERNAL_WRITE" | "FINANCIAL" }
> = {
  commercial_proposal: { name: "Propostas Comerciais", description: "Elaboração de propostas e orçamentos estruturados.", category: "vendas", icon: "FileText", riskTier: "WRITE" },
  receipt_organizer: { name: "Organizador Fiscal", description: "Extração e classificação de notas e recibos.", category: "financeiro", icon: "Receipt", riskTier: "READ" },
  lead_qualifier_sdr: { name: "Qualificador SDR", description: "Qualificação consultiva de leads e oportunidades no CRM.", category: "crm", icon: "Target", riskTier: "WRITE" },
  contract_reviewer: { name: "Revisor de Contratos", description: "Análise de cláusulas, riscos e obrigações contratuais.", category: "juridico", icon: "Scale", riskTier: "READ" },
  tourism_itinerary_builder: { name: "Roteiros de Turismo", description: "Planejamento de pacotes e roteiros de viagem completos.", category: "turismo", icon: "Compass", riskTier: "READ" },
  real_estate_appraiser: { name: "Avaliador Imobiliário", description: "Análise comparativa e memorial de imóveis.", category: "imoveis", icon: "Building2", riskTier: "READ" },
  ad_copywriter: { name: "Redator de Anúncios", description: "Criação de copies e criativos para campanhas e redes sociais.", category: "marketing", icon: "Megaphone", riskTier: "WRITE" },
  support_auto_responder: { name: "Atendimento Consultivo", description: "Respostas ágeis com base em pedidos e políticas reais.", category: "atendimento", icon: "MessageSquare", riskTier: "READ" },
  accessibility_checker: { name: "Auditor WCAG 2.2", description: "Revisão de acessibilidade, contraste e alvos táteis.", category: "engenharia", icon: "Eye", riskTier: "READ" },
  inventory_forecaster: { name: "Previsão de Estoque", description: "Previsão de ruptura, giro e reposição de catálogo.", category: "operacoes", icon: "Package", riskTier: "READ" },
};

const SKILL_EXCLUSIVE_TOOL_MAP: Record<string, string[]> = {
  simlab: ["simlab_run_batch_simulation", "simlab_generate_seven_sins_copy"],
  "simlab-research": ["simlab_run_batch_simulation", "simlab_generate_seven_sins_copy"],
  mining: [
    "mining_scrape_url",
    "mining_run_local_places_harvest",
    "mining_query_mined_catalog",
    "copilot_autonomous_prospecting",
  ],
  squad_orchestrator: ["squad_orchestrator_run"],
  "web-agent": ["browser_navigate_url"],
  outbound_communication_dispatcher: ["send_connector_email", "send_outbound_webhook"],
  wallet_token_governor: ["deduct_wz_tokens"],
  catalog: ["search_catalog_products", "query_master_catalog"],
  lead_qualifier_sdr: ["crm_sync_qualified_lead_conversion", "crm_list_leads", "crm_create_lead"],
  ad_copywriter: ["meta_ads_diagnose_tracking", "simlab_generate_seven_sins_copy"],
  inventory_forecaster: ["search_catalog_products", "query_master_catalog"],
};

export const CreateCustomSkillInputSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres").max(80),
  description: z.string().trim().min(8, "Descrição deve ter no mínimo 8 caracteres").max(500),
  category: z.string().trim().min(2).max(40).default("operacional"),
  icon: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .refine((v) => !/sparkle/i.test(v), "Ícone 'Sparkles' é proibido pelo sistema de design")
    .default("Brain"),
  allowedTools: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
  systemInstructions: z.string().trim().min(10, "Instruções devem ter no mínimo 10 caracteres").max(4000),
  modelPreference: z.string().trim().max(80).optional().nullable(),
  riskTier: z.enum(["READ", "WRITE", "EXTERNAL_WRITE", "FINANCIAL"]).default("READ"),
});

export const UpdateCustomSkillInputSchema = z.object({
  skillId: z.string().uuid(),
  storeId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().min(8).max(500).optional(),
  category: z.string().trim().min(2).max(40).optional(),
  icon: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .refine((v) => !/sparkle/i.test(v), "Ícone 'Sparkles' é proibido pelo sistema de design")
    .optional(),
  allowedTools: z.array(z.string().trim().min(2).max(80)).max(30).optional(),
  systemInstructions: z.string().trim().min(10).max(4000).optional(),
  modelPreference: z.string().trim().max(80).optional().nullable(),
  isActive: z.boolean().optional(),
});

function slugifySkillName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `custom_${base || "skill"}_${Date.now().toString(36).slice(-4)}`;
}

export async function listEffectiveSkillsForUser(params: {
  userId?: string | null;
  storeId?: string | null;
}): Promise<EffectiveSkillEntry[]> {
  const db = getServerClient();

  let dbSkillsRes: any = { data: [], error: null };
  try {
    dbSkillsRes = await db
      .from("ai_skills")
      .select(
        "id, slug, name, description, category, icon, is_active, is_enabled, is_system, is_official, owner_id, store_id, risk_tier, permissions, allowed_tools, system_instructions, model_preference, trigger_explicit, when_not_to_use",
      )
      .order("created_at", { ascending: false })
      .limit(120);

    if (dbSkillsRes.error && /store_id|allowed_tools|42703/i.test(dbSkillsRes.error.message || "")) {
      dbSkillsRes = await db
        .from("ai_skills")
        .select(
          "id, slug, name, description, category, icon, is_active, is_enabled, is_system, is_official, owner_id, risk_tier, permissions, trigger_explicit, when_not_to_use",
        )
        .order("created_at", { ascending: false })
        .limit(120);
    }
  } catch {
    dbSkillsRes = { data: [], error: null };
  }

  let userOverrides = new Map<string, boolean>();
  if (params.userId) {
    const { data: uRows } = await (db as any)
      .from("user_skill_preferences")
      .select("skill_slug, is_active")
      .eq("user_id", params.userId);
    for (const row of uRows || []) {
      const slug = row?.skill_slug;
      if (slug) userOverrides.set(String(slug), row.is_active !== false);
    }
  }

  let workspaceOverrides = new Map<string, boolean>();
  if (params.storeId) {
    const { data: wRows } = await db
      .from("workspace_skill_settings")
      .select("is_enabled, ai_skills!inner(slug)")
      .eq("store_id", params.storeId);
    for (const row of wRows || []) {
      const slug = (row as any)?.ai_skills?.slug;
      if (slug) workspaceOverrides.set(String(slug), row.is_enabled !== false);
    }
  }

  const bySlug = new Map<string, EffectiveSkillEntry>();

  for (const [slug, def] of Object.entries(CANONICAL_SKILLS_DEFINITIONS)) {
    const meta = CANONICAL_SKILL_META[slug];
    const isActive = userOverrides.has(slug)
      ? Boolean(userOverrides.get(slug))
      : workspaceOverrides.has(slug)
        ? Boolean(workspaceOverrides.get(slug))
        : true;
    bySlug.set(slug, {
      id: `canonical:${slug}`,
      slug,
      name: meta?.name || slug.replace(/_/g, " "),
      description: meta?.description || def.definitionOfDone || def.systemPrompt.slice(0, 140),
      category: meta?.category || "geral",
      source: "native",
      isActive,
      isSystem: true,
      riskTier: meta?.riskTier || "READ",
      icon: meta?.icon || "Brain",
      storeId: null,
      ownerId: null,
      allowedTools: SKILL_EXCLUSIVE_TOOL_MAP[slug] || [],
      systemInstructions: def.systemPrompt || null,
      modelPreference: null,
      triggerExplicit: null,
      whenNotToUse: null,
      capabilities: Array.isArray(def.numberedProcedure) ? def.numberedProcedure : [],
    });
  }

  for (const row of (dbSkillsRes.data || []) as any[]) {
    const slug = String(row.slug || "").trim();
    if (!slug) continue;

    // Multi-tenant filtering: custom skills belong strictly to their owner or current store
    const rowStoreId = row.store_id ? String(row.store_id) : null;
    const rowOwnerId = row.owner_id ? String(row.owner_id) : null;
    const isSystem = Boolean(row.is_system ?? row.is_official ?? !rowOwnerId);
    if (!isSystem) {
      const sameUser = Boolean(params.userId && rowOwnerId === params.userId);
      const sameStore = Boolean(params.storeId && rowStoreId && rowStoreId === params.storeId);
      if (!sameUser && !sameStore) continue;
    }

    const baseEnabled = row.is_enabled !== false && row.is_active !== false;
    const isActive = userOverrides.has(slug)
      ? Boolean(userOverrides.get(slug))
      : workspaceOverrides.has(slug)
        ? Boolean(workspaceOverrides.get(slug))
        : baseEnabled;

    const existing = bySlug.get(slug);
    const source: EffectiveSkillSource = !isSystem
      ? "custom"
      : existing
        ? "native"
        : "community";

    const rawAllowed = Array.isArray(row.allowed_tools)
      ? row.allowed_tools.map(String)
      : existing?.allowedTools || SKILL_EXCLUSIVE_TOOL_MAP[slug] || [];

    bySlug.set(slug, {
      id: String(row.id),
      slug,
      name: String(row.name || existing?.name || slug),
      description: String(row.description || existing?.description || ""),
      category: String(row.category || existing?.category || "geral"),
      source,
      isActive,
      isSystem,
      riskTier: (row.risk_tier as any) || existing?.riskTier || "READ",
      icon: /sparkle/i.test(String(row.icon || "")) ? "Brain" : String(row.icon || existing?.icon || "Brain"),
      storeId: rowStoreId,
      ownerId: rowOwnerId,
      allowedTools: rawAllowed,
      systemInstructions: row.system_instructions ? String(row.system_instructions) : existing?.systemInstructions || null,
      modelPreference: row.model_preference ? String(row.model_preference) : null,
      triggerExplicit: row.trigger_explicit ? String(row.trigger_explicit) : existing?.triggerExplicit || null,
      whenNotToUse: row.when_not_to_use ? String(row.when_not_to_use) : existing?.whenNotToUse || null,
      capabilities: Array.isArray(row.permissions) ? row.permissions.map(String) : existing?.capabilities || [],
    });
  }

  return Array.from(bySlug.values());
}

export async function getEffectiveSkillPolicyForUser(params: {
  userId?: string | null;
  storeId?: string | null;
}): Promise<EffectiveSkillPolicy> {
  const skills = await listEffectiveSkillsForUser(params);
  const activeSkills = skills.filter((s) => s.isActive);
  const disabledSkills = skills.filter((s) => !s.isActive);

  const activeToolSet = new Set<string>();
  const blockedSet = new Set<string>();

  for (const skill of activeSkills) {
    for (const t of skill.allowedTools) activeToolSet.add(t);
    for (const t of SKILL_EXCLUSIVE_TOOL_MAP[skill.slug] || []) activeToolSet.add(t);
  }

  for (const skill of disabledSkills) {
    for (const t of skill.allowedTools) {
      if (!activeToolSet.has(t)) blockedSet.add(t);
    }
    for (const t of SKILL_EXCLUSIVE_TOOL_MAP[skill.slug] || []) {
      if (!activeToolSet.has(t)) blockedSet.add(t);
    }
  }

  const orderedForInstructions = [
    ...activeSkills.filter((s) => s.source === "custom"),
    ...activeSkills.filter((s) => s.source === "community"),
    ...activeSkills.filter((s) => s.source === "native"),
  ];

  const customInstructions = orderedForInstructions
    .filter((s) => Boolean(s.systemInstructions))
    .map((s) => `[Skill ${s.name}]: ${s.systemInstructions}`)
    .slice(0, 10);

  const modelPreference =
    activeSkills.find((s) => !s.isSystem && s.modelPreference)?.modelPreference ||
    activeSkills.find((s) => s.modelPreference)?.modelPreference ||
    null;

  return {
    activeSlugs: activeSkills.map((s) => s.slug),
    disabledSlugs: disabledSkills.map((s) => s.slug),
    blockedTools: Array.from(blockedSet),
    explicitAllowedTools: null,
    customInstructions,
    modelPreference,
    skills,
    isToolAllowed: (toolName: string) => !blockedSet.has(toolName),
  };
}

export async function createCustomSkillForUser(params: {
  identity: NonNullable<any>;
  input: z.infer<typeof CreateCustomSkillInputSchema>;
}): Promise<EffectiveSkillEntry> {
  const parsed = CreateCustomSkillInputSchema.parse(params.input);
  if (parsed.storeId) {
    assertStoreAccess(params.identity, STAFF_ROLES, parsed.storeId);
  }

  const db = getServerClient();
  const slug = slugifySkillName(parsed.name);

  const { data, error } = await db
    .from("ai_skills")
    .insert({
      slug,
      name: parsed.name,
      description: parsed.description,
      category: parsed.category,
      niche: "general",
      icon: parsed.icon,
      is_active: true,
      is_enabled: true,
      is_system: false,
      is_official: false,
      owner_id: params.identity.id,
      store_id: parsed.storeId || null,
      risk_tier: parsed.riskTier,
      allowed_tools: parsed.allowedTools,
      system_instructions: parsed.systemInstructions,
      model_preference: parsed.modelPreference || null,
      permissions: parsed.allowedTools,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Falha ao criar skill customizada.");
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: data.category || "operacional",
    source: "custom",
    isActive: data.is_enabled !== false,
    isSystem: false,
    riskTier: (data.risk_tier as any) || "READ",
    icon: data.icon || "Brain",
    storeId: data.store_id || null,
    ownerId: data.owner_id || params.identity.id,
    allowedTools: Array.isArray(data.allowed_tools) ? data.allowed_tools : parsed.allowedTools,
    systemInstructions: data.system_instructions || parsed.systemInstructions,
    modelPreference: data.model_preference || null,
    triggerExplicit: null,
    whenNotToUse: null,
    capabilities: parsed.allowedTools,
  };
}

export async function updateCustomSkillForUser(params: {
  identity: NonNullable<any>;
  input: z.infer<typeof UpdateCustomSkillInputSchema>;
}): Promise<EffectiveSkillEntry> {
  const parsed = UpdateCustomSkillInputSchema.parse(params.input);
  const db = getServerClient();

  const { data: existing, error: fetchErr } = await db
    .from("ai_skills")
    .select("*")
    .eq("id", parsed.skillId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error("Skill não encontrada.");
  }
  if (existing.is_system || existing.is_official) {
    throw new Error("Skills oficiais do sistema não podem ser editadas estruturalmente.");
  }

  const isOwner = existing.owner_id === params.identity.id;
  if (!isOwner) {
    if (existing.store_id) {
      assertStoreAccess(params.identity, STAFF_ROLES, existing.store_id);
    } else {
      throw new Error("Sem permissão para editar esta skill customizada.");
    }
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.name !== undefined) updatePayload.name = parsed.name;
  if (parsed.description !== undefined) updatePayload.description = parsed.description;
  if (parsed.category !== undefined) updatePayload.category = parsed.category;
  if (parsed.icon !== undefined) updatePayload.icon = parsed.icon;
  if (parsed.allowedTools !== undefined) {
    updatePayload.allowed_tools = parsed.allowedTools;
    updatePayload.permissions = parsed.allowedTools;
  }
  if (parsed.systemInstructions !== undefined) updatePayload.system_instructions = parsed.systemInstructions;
  if (parsed.modelPreference !== undefined) updatePayload.model_preference = parsed.modelPreference;
  if (parsed.isActive !== undefined) {
    updatePayload.is_enabled = parsed.isActive;
    updatePayload.is_active = parsed.isActive;
  }

  const { data: updated, error: updateErr } = await db
    .from("ai_skills")
    .update(updatePayload)
    .eq("id", parsed.skillId)
    .select("*")
    .single();

  if (updateErr || !updated) {
    throw new Error(updateErr?.message || "Falha ao atualizar skill customizada.");
  }

  return {
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    description: updated.description,
    category: updated.category || "operacional",
    source: "custom",
    isActive: updated.is_enabled !== false,
    isSystem: false,
    riskTier: (updated.risk_tier as any) || "READ",
    icon: updated.icon || "Brain",
    storeId: updated.store_id || null,
    ownerId: updated.owner_id || null,
    allowedTools: Array.isArray(updated.allowed_tools) ? updated.allowed_tools : [],
    systemInstructions: updated.system_instructions || null,
    modelPreference: updated.model_preference || null,
    triggerExplicit: null,
    whenNotToUse: null,
    capabilities: Array.isArray(updated.allowed_tools) ? updated.allowed_tools : [],
  };
}

export async function deleteCustomSkillForUser(params: {
  identity: NonNullable<any>;
  skillId: string;
}): Promise<{ deleted: true; id: string }> {
  const db = getServerClient();
  const { data: existing, error } = await db
    .from("ai_skills")
    .select("id, owner_id, store_id, is_system, is_official")
    .eq("id", params.skillId)
    .maybeSingle();

  if (error || !existing) throw new Error("Skill não encontrada.");
  if (existing.is_system || existing.is_official) {
    throw new Error("Skills oficiais do sistema não podem ser removidas.");
  }

  if (existing.owner_id !== params.identity.id) {
    if (existing.store_id) {
      assertStoreAccess(params.identity, STAFF_ROLES, existing.store_id);
    } else {
      throw new Error("Sem permissão para excluir esta skill.");
    }
  }

  const { error: delErr } = await db.from("ai_skills").delete().eq("id", params.skillId);
  if (delErr) throw new Error(delErr.message || "Falha ao remover skill.");
  return { deleted: true, id: params.skillId };
}
