import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Tipos & Contratos de Memória e Curadoria (Prompt 24)
// ============================================================

export type AIMemoryLayerType = "session" | "user" | "brand" | "niche" | "product";

export interface AIMemoryItemDTO {
  id: string;
  layer_type: AIMemoryLayerType;
  owner_user_id?: string;
  owner_store_id?: string;
  session_id?: string;
  niche?: string;
  product_id?: string;
  memory_key: string;
  memory_value: string;
  context_source: string;
  confidence: number;
  is_sensitive: boolean;
  consent_granted_at?: string;
  expires_at?: string;
  citation_tag: string;
  created_at: string;
}

export interface BrandVoiceSettingsDTO {
  id?: string;
  store_id: string;
  persona_name: string;
  formality: "casual" | "consultative" | "formal" | "technical";
  verbosity: "concise" | "balanced" | "detailed";
  approved_examples: string[];
  forbidden_terms: string[];
}

export interface CuratedContentDTO {
  id: string;
  store_id: string;
  title: string;
  content: string;
  category: string;
  status: "proposed" | "under_review" | "approved" | "unpublished";
  version: number;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// ============================================================
// Helpers Puros de Citação e Formatação de Tom
// ============================================================

export function generateCitationTag(layer: AIMemoryLayerType, key: string, nicheOrEntity?: string): string {
  switch (layer) {
    case "user":
      return `[Memória do Usuário: ${key}]`;
    case "brand":
      return `[Diretriz de Marca: ${key}]`;
    case "niche":
      return `[Regra de Nicho (${nicheOrEntity || "geral"}): ${key}]`;
    case "product":
      return `[Ficha Técnica do Produto: ${key}]`;
    case "session":
    default:
      return `[Memória da Sessão: ${key}]`;
  }
}

export function formatBrandVoicePrompt(settings: BrandVoiceSettingsDTO): string {
  const lines: string[] = [
    `[DIRETRIZ DE VOZ E PERSONA: ${settings.persona_name}]`,
    `Nível de Formalidade: ${settings.formality}`,
    `Densidade de Resposta: ${settings.verbosity}`,
  ];

  if (settings.forbidden_terms && settings.forbidden_terms.length > 0) {
    lines.push(`Termos e Frases Proibidas: [${settings.forbidden_terms.join(", ")}]`);
  }

  if (settings.approved_examples && settings.approved_examples.length > 0) {
    lines.push(`Exemplos Canônicos de Tom Aprovado:`);
    for (const ex of settings.approved_examples) {
      lines.push(`- "${ex}"`);
    }
  }

  return lines.join("\n");
}

// ============================================================
// Server Functions: Camadas de Memória (Fases A, B, C, E)
// ============================================================

export const recordMemory = createServerFn({ method: "POST" })
  .validator(
    z.object({
      layer_type: z.enum(["session", "user", "brand", "niche", "product"]),
      memory_key: z.string().min(1),
      memory_value: z.string().min(1),
      context_source: z.string().default("conversa"),
      confidence: z.number().min(0).max(1).default(0.85),
      is_sensitive: z.boolean().default(false),
      consent_granted: z.boolean().optional(),
      session_id: z.string().optional(),
      niche: z.string().optional(),
      product_id: z.string().uuid().optional(),
      expires_in_hours: z.number().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; memoryId: string; citation: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // Regra Dura: Dado sensível exige consentimento explícito prévio
    if (input.is_sensitive === true && (input.consent_granted === false || input.consent_granted === undefined)) {
      throw new Error("Consentimento explícito do usuário é mandatório para registrar dados sensíveis na memória.");
    }

    let ownerUserId: string | null = null;
    let ownerStoreId: string | null = null;
    let sessionId: string | null = input.session_id || null;

    if (input.layer_type === "user") {
      if (identity?.id === null || identity?.id === undefined) {
        throw new Error("Usuário autenticado obrigatório para gravar memória na camada de usuário.");
      }
      ownerUserId = identity.id;
    } else if (input.layer_type === "brand") {
      if (identity?.store_id === null || identity?.store_id === undefined) {
        throw new Error("Loja ativa obrigatória para gravar memória na camada de marca.");
      }
      ownerStoreId = identity.store_id;
    } else if (input.layer_type === "session") {
      if (sessionId === null || sessionId === undefined) {
        sessionId = `sess_${Date.now()}`;
      }
    }

    // Regra Dura: Memória sem dono é P0
    if (
      ownerUserId === null &&
      ownerStoreId === null &&
      sessionId === null &&
      input.layer_type !== "niche"
    ) {
      throw new Error("Violação de Governança P0: Toda memória deve possuir um proprietário explícito ou sessão associada.");
    }

    let expiresAt: string | null = null;
    if (input.expires_in_hours && input.expires_in_hours > 0) {
      expiresAt = new Date(Date.now() + input.expires_in_hours * 3600 * 1000).toISOString();
    }

    const { data: record, error } = await supabase
      .from("ai_memory_layers")
      .insert({
        layer_type: input.layer_type,
        owner_user_id: ownerUserId,
        owner_store_id: ownerStoreId,
        session_id: sessionId,
        niche: input.niche || null,
        product_id: input.product_id || null,
        memory_key: input.memory_key,
        memory_value: input.memory_value,
        context_source: input.context_source,
        confidence: input.confidence,
        is_sensitive: input.is_sensitive,
        consent_granted_at: input.is_sensitive ? new Date().toISOString() : null,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || record === null || record === undefined) {
      console.error("[ai-memory] Erro ao gravar memória:", error);
      throw new Error("Falha ao registrar memória soberana.");
    }

    const citation = generateCitationTag(input.layer_type, input.memory_key, input.niche);

    return {
      success: true,
      memoryId: record.id,
      citation,
    };
  });

export const queryMemory = createServerFn({ method: "POST" })
  .validator(
    z.object({
      searchTerm: z.string().optional(),
      layers: z.array(z.enum(["session", "user", "brand", "niche", "product"])).optional(),
      sessionId: z.string().optional(),
      niche: z.string().optional(),
      productId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    })
  )
  .handler(async ({ data: input }): Promise<AIMemoryItemDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    let query = supabase
      .from("ai_memory_layers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(input.limit);

    // Filtro estrito de isolamento por dono (Fase E: Provar isolamento cross-tenant)
    if (identity?.id && identity?.store_id) {
      query = query.or(
        `owner_user_id.eq.${identity.id},owner_store_id.eq.${identity.store_id},layer_type.eq.niche${input.sessionId ? `,session_id.eq.${input.sessionId}` : ""}`
      );
    } else if (identity?.id) {
      query = query.or(
        `owner_user_id.eq.${identity.id},layer_type.eq.niche${input.sessionId ? `,session_id.eq.${input.sessionId}` : ""}`
      );
    } else if (input.sessionId) {
      query = query.or(`session_id.eq.${input.sessionId},layer_type.eq.niche`);
    } else {
      query = query.eq("layer_type", "niche");
    }

    if (input.layers && input.layers.length > 0) {
      query = query.in("layer_type", input.layers);
    }

    if (input.niche) {
      query = query.eq("niche", input.niche);
    }

    if (input.productId) {
      query = query.eq("product_id", input.productId);
    }

    if (input.searchTerm && input.searchTerm.trim().length > 0) {
      query = query.or(`memory_key.ilike.%${input.searchTerm}%,memory_value.ilike.%${input.searchTerm}%`);
    }

    const { data: rows, error } = await query;
    if (error || rows === null || rows === undefined) {
      console.error("[ai-memory] Erro ao consultar memórias:", error);
      return [];
    }

    return rows.map((r: any) => ({
      id: r.id,
      layer_type: r.layer_type,
      owner_user_id: r.owner_user_id || undefined,
      owner_store_id: r.owner_store_id || undefined,
      session_id: r.session_id || undefined,
      niche: r.niche || undefined,
      product_id: r.product_id || undefined,
      memory_key: r.memory_key,
      memory_value: r.memory_value,
      context_source: r.context_source,
      confidence: Number(r.confidence || 0.85),
      is_sensitive: r.is_sensitive === true,
      consent_granted_at: r.consent_granted_at || undefined,
      expires_at: r.expires_at || undefined,
      citation_tag: generateCitationTag(r.layer_type, r.memory_key, r.niche),
      created_at: r.created_at,
    }));
  });

export const deleteUserMemory = createServerFn({ method: "POST" })
  .validator(
    z.object({
      memoryId: z.string().uuid().optional(),
      deleteAllUserData: z.boolean().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; deletedCount: number }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (identity?.id === null || identity?.id === undefined) {
      throw new Error("Não autenticado para exclusão de memória LGPD.");
    }

    let deleteQuery = supabase.from("ai_memory_layers").delete().eq("owner_user_id", identity.id);

    if (input.deleteAllUserData !== true && input.memoryId) {
      deleteQuery = deleteQuery.eq("id", input.memoryId);
    }

    const { error } = await deleteQuery;
    if (error) {
      console.error("[ai-memory] Erro ao excluir memória:", error);
      throw new Error("Falha ao excluir dados de memória solicitados.");
    }

    return { success: true, deletedCount: 1 };
  });

// ============================================================
// Server Functions: Curadoria de Conteúdo (Fase D)
// ============================================================

export const proposeCuratedContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().default("geral"),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; contentId: string; status: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data, error } = await supabase
      .from("ai_curated_content")
      .insert({
        store_id: identity.store_id,
        title: input.title,
        content: input.content,
        category: input.category,
        status: "proposed",
        version: 1,
      })
      .select("id, status")
      .single();

    if (error || data === null || data === undefined) {
      throw new Error("Falha ao propor conteúdo para curadoria.");
    }

    return { success: true, contentId: data.id, status: data.status };
  });

export const updateCuratedContentStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contentId: z.string().uuid(),
      newStatus: z.enum(["under_review", "approved", "unpublished"]),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const updates: Record<string, any> = {
      status: input.newStatus,
      updated_at: new Date().toISOString(),
    };

    if (input.newStatus === "approved") {
      updates.reviewed_by = identity.id;
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("ai_curated_content")
      .update(updates)
      .eq("id", input.contentId)
      .eq("store_id", identity.store_id);

    if (error) {
      throw new Error("Falha ao atualizar status de curadoria do conteúdo.");
    }

    return { success: true, status: input.newStatus };
  });

export const listApprovedCuratedContentForAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      category: z.string().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<CuratedContentDTO[]> => {
    const supabase = getServerClient();

    // Regra Dura: A IA só cita conteúdo com status 'approved'
    let query = supabase
      .from("ai_curated_content")
      .select("*")
      .eq("store_id", input.storeId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (input.category) {
      query = query.eq("category", input.category);
    }

    const { data, error } = await query;
    if (error || data === null || data === undefined) {
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      store_id: d.store_id,
      title: d.title,
      content: d.content,
      category: d.category,
      status: d.status,
      version: d.version,
      reviewed_by: d.reviewed_by || undefined,
      reviewed_at: d.reviewed_at || undefined,
      created_at: d.created_at,
    }));
  });

// ============================================================
// Server Functions: Tom de Voz e Persona da Marca (Fase D)
// ============================================================

export const getBrandVoiceSettings = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ data: input }): Promise<BrandVoiceSettingsDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const storeId = input?.storeId || identity?.store_id;

    if (storeId === null || storeId === undefined) {
      return {
        store_id: "",
        persona_name: "Assistente Oficial",
        formality: "consultative",
        verbosity: "concise",
        approved_examples: [],
        forbidden_terms: [],
      };
    }

    const { data: row } = await supabase
      .from("ai_brand_voice_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (row === null || row === undefined) {
      return {
        store_id: storeId,
        persona_name: "Consultor Waesy",
        formality: "consultative",
        verbosity: "concise",
        approved_examples: [
          "Olá! Como posso ajudar você hoje a encontrar as melhores ofertas?",
          "Seu pedido já foi despachado e está a caminho com código de rastreio.",
        ],
        forbidden_terms: ["barato demais", "top", "show de bola"],
      };
    }

    return {
      id: row.id,
      store_id: row.store_id,
      persona_name: row.persona_name,
      formality: row.formality,
      verbosity: row.verbosity,
      approved_examples: row.approved_examples || [],
      forbidden_terms: row.forbidden_terms || [],
    };
  });

export const saveBrandVoiceSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      persona_name: z.string().min(2),
      formality: z.enum(["casual", "consultative", "formal", "technical"]),
      verbosity: z.enum(["concise", "balanced", "detailed"]),
      approved_examples: z.array(z.string()),
      forbidden_terms: z.array(z.string()),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; formattedPrompt: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("ai_brand_voice_settings")
      .upsert(
        {
          store_id: identity.store_id,
          persona_name: input.persona_name,
          formality: input.formality,
          verbosity: input.verbosity,
          approved_examples: input.approved_examples,
          forbidden_terms: input.forbidden_terms,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

    if (error) {
      console.error("[ai-memory] Erro ao salvar diretrizes de voz da marca:", error);
      throw new Error("Falha ao salvar configurações de tom de voz da marca.");
    }

    const formattedPrompt = formatBrandVoicePrompt({
      store_id: identity.store_id,
      persona_name: input.persona_name,
      formality: input.formality,
      verbosity: input.verbosity,
      approved_examples: input.approved_examples,
      forbidden_terms: input.forbidden_terms,
    });

    return { success: true, formattedPrompt };
  });
