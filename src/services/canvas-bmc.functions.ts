import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { getStoreBrandDna } from "./market-radar.functions";

// ── SCHEMA CANÔNICO DO BMC (9 BLOCOS DE OSTERWALDER) ─────────────────────────
export const bmcBlockItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Texto não pode ser vazio"),
  evidence: z.string().optional(),
  confidence: z.null().optional(),
});

export const storeBmcSchema = z.object({
  key_partners: z.array(bmcBlockItemSchema).default([]),
  key_activities: z.array(bmcBlockItemSchema).default([]),
  key_resources: z.array(bmcBlockItemSchema).default([]),
  value_propositions: z.array(bmcBlockItemSchema).default([]),
  customer_relationships: z.array(bmcBlockItemSchema).default([]),
  channels: z.array(bmcBlockItemSchema).default([]),
  customer_segments: z.array(bmcBlockItemSchema).default([]),
  cost_structure: z.array(bmcBlockItemSchema).default([]),
  revenue_streams: z.array(bmcBlockItemSchema).default([]),
  generated_by_job_id: z.string().nullable().optional(),
  ai_model: z.string().nullable().optional(),
  confidence: z.null().optional(),
  edited_by_human: z.boolean().default(false),
});

export type BmcBlockItem = z.infer<typeof bmcBlockItemSchema>;
export type StoreBmcDTO = z.infer<typeof storeBmcSchema>;

export interface BmcFullResponseDTO {
  id?: string;
  store_id: string;
  bmc: StoreBmcDTO;
  updated_at?: string;
}

// ── AUXILIARES DE NORMALIZAÇÃO ───────────────────────────────────────────────
function normalizeBlock(raw: unknown): BmcBlockItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    if (typeof item === "string") {
      return { id: `item-${index + 1}`, text: item };
    }
    if (item && typeof item === "object") {
      const anyItem = item as Record<string, unknown>;
      return {
        id: String(anyItem.id || `item-${index + 1}`),
        text: String(anyItem.text || anyItem.title || anyItem.content || ""),
      };
    }
    return { id: `item-${index + 1}`, text: String(item) };
  }).filter((i) => i.text.trim().length > 0);
}

// ── GET STORE BMC ────────────────────────────────────────────────────────────
export const getStoreBmc = createServerFn({ method: "GET" })
  .validator((input?: { storeId?: string }) => input || {})
  .handler(async ({ data }): Promise<BmcFullResponseDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "proprietario", "manager", "gerente", "marketing", "content"]);
    if (data?.storeId && identity.role !== "platform_admin" && data.storeId !== identity.store_id) {
      throw new Error("Acesso negado ao BMC de outro workspace.");
    }
    const targetStoreId = data?.storeId && identity.role === "platform_admin" ? data.storeId : identity.store_id;
    if (!targetStoreId) return null;

    const { data: row, error } = await supabase
      .from("store_business_model_canvas")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (error) {
      console.warn("[canvas-bmc] Erro ao buscar BMC:", error.message);
      return null;
    }

    if (!row) {
      return {
        store_id: targetStoreId,
        bmc: {
          key_partners: [],
          key_activities: [],
          key_resources: [],
          value_propositions: [],
          customer_relationships: [],
          channels: [],
          customer_segments: [],
          cost_structure: [],
          revenue_streams: [],
          confidence: null,
          edited_by_human: false,
        },
      };
    }

    return {
      id: row.id,
      store_id: row.store_id,
      updated_at: row.updated_at,
      bmc: {
        key_partners: normalizeBlock(row.key_partners),
        key_activities: normalizeBlock(row.key_activities),
        key_resources: normalizeBlock(row.key_resources),
        value_propositions: normalizeBlock(row.value_propositions),
        customer_relationships: normalizeBlock(row.customer_relationships),
        channels: normalizeBlock(row.channels),
        customer_segments: normalizeBlock(row.customer_segments),
        cost_structure: normalizeBlock(row.cost_structure),
        revenue_streams: normalizeBlock(row.revenue_streams),
        generated_by_job_id: row.generated_by_job_id,
        ai_model: row.ai_model,
        confidence: null,
        edited_by_human: Boolean(row.edited_by_human),
      },
    };
  });

// ── SAVE STORE BMC ───────────────────────────────────────────────────────────
export const saveStoreBmc = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      bmc: storeBmcSchema,
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean; id?: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "proprietario", "manager", "gerente", "marketing", "content"]);
    if (data.storeId && identity.role !== "platform_admin" && data.storeId !== identity.store_id) {
      throw new Error("Acesso negado ao BMC de outro workspace.");
    }
    const targetStoreId = data.storeId && identity.role === "platform_admin" ? data.storeId : identity.store_id;

    const payload = {
      store_id: targetStoreId,
      key_partners: data.bmc.key_partners,
      key_activities: data.bmc.key_activities,
      key_resources: data.bmc.key_resources,
      value_propositions: data.bmc.value_propositions,
      customer_relationships: data.bmc.customer_relationships,
      channels: data.bmc.channels,
      customer_segments: data.bmc.customer_segments,
      cost_structure: data.bmc.cost_structure,
      revenue_streams: data.bmc.revenue_streams,
      generated_by_job_id: data.bmc.generated_by_job_id ?? null,
      ai_model: data.bmc.ai_model ?? null,
      confidence: data.bmc.confidence ?? null,
      edited_by_human: data.bmc.edited_by_human,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from("store_business_model_canvas")
      .upsert(payload, { onConflict: "store_id" })
      .select("id")
      .single();

    if (error) {
      console.error("[canvas-bmc] Falha ao persistir BMC:", error);
      throw new Error(`Falha ao gravar BMC: ${error.message}`);
    }

    return { success: true, id: upserted?.id };
  });

// ── GENERATE AI BMC FROM STORE ───────────────────────────────────────────────
export const generateAiBmcFromStore = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      businessDescription: z.string().optional(),
      niche: z.string().optional(),
      targetAudience: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<StoreBmcDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "proprietario", "manager", "gerente", "marketing", "content"]);
    if (data.storeId && identity.role !== "platform_admin" && data.storeId !== identity.store_id) {
      throw new Error("Acesso negado ao BMC de outro workspace.");
    }
    const targetStoreId = data.storeId && identity.role === "platform_admin" ? data.storeId : identity.store_id;

    // Carrega contexto da loja
    const { data: store } = await supabase
      .from("stores")
      .select("name, description, category, city, state")
      .eq("id", targetStoreId)
      .maybeSingle();

    // Carrega Brand DNA se existir
    const brandDna = await getStoreBrandDna({ data: { storeId: targetStoreId } }).catch(() => null);

    // Carrega principais produtos
    const { data: topProducts } = await supabase
      .from("products")
      .select("title, name, price_cents, category")
      .eq("store_id", targetStoreId)
      .limit(6);

    const storeContext = {
      name: store?.name || "",
      category: data.niche || store?.category || "",
      location: store?.city && store?.state ? `${store.city} - ${store.state}` : "",
      description: data.businessDescription || store?.description || "",
      archetype: brandDna?.archetype || "",
      topProducts: (topProducts || []).map((p) => p.title || p.name).filter(Boolean),
      targetAudience: data.targetAudience || "",
    };

    const promptSystem = `Você é o Estrategista de Modelos de Negócio do Waesy, mestre na metodologia de Alexander Osterwalder (Business Model Canvas).
Sua missão é produzir um rascunho de BMC baseado somente nos dados fornecidos. Não invente segmentos, parceiros, custos, canais ou evidências. Campos sem suporte ficam vazios; conclusões não observadas devem ser rotuladas como hipótese.
Não force quantidade mínima por bloco; use arrays vazios quando os dados forem insuficientes.
Não gere confiança numérica. Evidência só deve conter trechos fornecidos; não crie citações.

Retorne ESTRITAMENTE um objeto JSON no formato:
{
  "key_partners": [],
  "key_activities": [],
  "key_resources": [],
  "value_propositions": [],
  "customer_relationships": [],
  "channels": [],
  "customer_segments": [],
  "cost_structure": [],
  "revenue_streams": []
}`;

    const promptUser = `Dados do Negócio:
Nome: ${storeContext.name}
Nicho / Categoria: ${storeContext.category}
Localização: ${storeContext.location}
Descrição: ${storeContext.description}
Arquétipo de Marca: ${storeContext.archetype}
Produtos / Serviços Principais: ${storeContext.topProducts.join(", ") || ""}
Público Alvo: ${storeContext.targetAudience}

Gere agora o Business Model Canvas completo de 9 blocos com rigor analítico.`;

    const aiResponse = await executeUnifiedAiCall({
      systemPrompt: promptSystem,
      userPrompt: promptUser,
      responseFormat: "json_object",
      temperature: 0.4,
    });

    const parsed = aiResponse?.parsedJson;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("A IA não retornou o esquema esperado para o Business Model Canvas.");
    }

    const result: StoreBmcDTO = {
      key_partners: normalizeBlock(parsed.key_partners),
      key_activities: normalizeBlock(parsed.key_activities),
      key_resources: normalizeBlock(parsed.key_resources),
      value_propositions: normalizeBlock(parsed.value_propositions),
      customer_relationships: normalizeBlock(parsed.customer_relationships),
      channels: normalizeBlock(parsed.channels),
      customer_segments: normalizeBlock(parsed.customer_segments),
      cost_structure: normalizeBlock(parsed.cost_structure),
      revenue_streams: normalizeBlock(parsed.revenue_streams),
      generated_by_job_id: null,
      ai_model: aiResponse.model || null,
      confidence: null,
      edited_by_human: false,
    };

    // Salva automaticamente o BMC recém-gerado no banco
    await saveStoreBmc({
      data: {
        storeId: targetStoreId,
        bmc: result,
      },
    });

    return result;
  });

// ── GENERATE AI SWOT ANALYSIS FROM STORE ─────────────────────────────────────
export interface SwotAnalysisDTO {
  analysis_status: "ai_generated_draft";
  requires_human_review: true;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

const SwotAiOutputSchema = z.object({
  strengths: z.array(z.string().trim().min(1).max(500)).max(20),
  weaknesses: z.array(z.string().trim().min(1).max(500)).max(20),
  opportunities: z.array(z.string().trim().min(1).max(500)).max(20),
  threats: z.array(z.string().trim().min(1).max(500)).max(20),
}).strict();

export const generateAiSwotAnalysis = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }): Promise<SwotAnalysisDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "proprietario", "manager", "gerente", "marketing", "content"]);
    if (data.storeId && identity.role !== "platform_admin" && data.storeId !== identity.store_id) {
      throw new Error("Acesso negado ao BMC de outro workspace.");
    }
    const targetStoreId = data.storeId && identity.role === "platform_admin" ? data.storeId : identity.store_id;

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, description, category, city, state")
      .eq("id", targetStoreId)
      .maybeSingle();
    if (storeError) throw new Error(`Falha ao ler dados da loja para SWOT: ${storeError.message}`);
    if (!store) throw new Error("Loja não encontrada; a SWOT não foi gerada.");

    const brandDna = await getStoreBrandDna({ data: { storeId: targetStoreId } });

    const storeName = store?.name || "";
    const storeCategory = store?.category || "";
    const storeLocation = store?.city && store?.state ? `${store.city} - ${store.state}` : "";
    const storeDesc = store?.description || "";

    const systemPrompt = `Você é um analista que prepara um rascunho SWOT. Use somente as informações efetivamente fornecidas. Não presuma qualidade, reputação, operação, fornecedores, canais, concorrentes, custos ou hábitos de clientes. Itens que sejam inferências devem começar com "Hipótese:"; sem base suficiente, use arrays vazios. Retorne JSON com strengths, weaknesses, opportunities e threats. Este resultado é exploratório e requer revisão humana.`;

    const userPrompt = `Empresa: ${storeName}
Segmento/Categoria: ${storeCategory}
Localização: ${storeLocation}
Descrição: ${storeDesc}
Arquétipo de Marca: ${brandDna?.archetype || ""}

Gere a análise SWOT estratégica completa em JSON estruturado.`;

    const aiRes = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      responseFormat: "json_object",
      temperature: 0.4,
    });

    const parsed = SwotAiOutputSchema.safeParse(aiRes?.parsedJson);
    if (!parsed.success) {
      throw new Error("A IA não retornou uma SWOT estruturada válida; nenhum fallback foi aplicado.");
    }
    const result: SwotAnalysisDTO = {
      analysis_status: "ai_generated_draft",
      requires_human_review: true,
      strengths: parsed.data.strengths,
      weaknesses: parsed.data.weaknesses,
      opportunities: parsed.data.opportunities,
      threats: parsed.data.threats,
    };

    const aiMetadata = aiRes as typeof aiRes & { provider?: string; model?: string };
    const { error: persistError } = await supabase
      .from("brand_dna_profiles")
      .upsert(
        {
          store_id: targetStoreId,
          swot_analysis: {
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            opportunities: result.opportunities,
            threats: result.threats,
          },
          analysis_status: "ai_generated_draft",
          edited_by_human: false,
          confidence: null,
          source_url: null,
          source_evidence: {
            source_type: "store_record_and_brand_dna",
            store_id: targetStoreId,
            store_name: storeName,
            segment: storeCategory,
            location: storeLocation,
            description: storeDesc,
            archetype: brandDna.archetype,
          },
          ai_provider: typeof aiMetadata.provider === "string" ? aiMetadata.provider : null,
          ai_model: typeof aiMetadata.model === "string" ? aiMetadata.model : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" },
      );
    if (persistError) throw new Error(`SWOT gerada, mas não foi persistida: ${persistError.message}`);

    return result;
  });
