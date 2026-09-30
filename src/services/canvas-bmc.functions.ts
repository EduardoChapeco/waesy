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
  confidence: z.number().min(0).max(1).optional(),
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
  confidence: z.number().min(0).max(1).default(0.95),
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
        evidence: anyItem.evidence ? String(anyItem.evidence) : undefined,
        confidence: typeof anyItem.confidence === "number" ? anyItem.confidence : undefined,
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
    let targetStoreId = data?.storeId;

    if (!targetStoreId) {
      const identity = await getServerIdentity().catch(() => null);
      if (!identity?.store_id) return null;
      targetStoreId = identity.store_id;
    }

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
          confidence: 1.0,
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
        confidence: Number(row.confidence) || 0.95,
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
    let targetStoreId = identity.store_id;
    if (data.storeId && (identity.role === "platform_admin" || data.storeId === identity.store_id)) {
      targetStoreId = data.storeId;
    }

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
      confidence: data.bmc.confidence ?? 0.95,
      edited_by_human: true,
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
    let targetStoreId = identity.store_id;
    if (data.storeId && (identity.role === "platform_admin" || data.storeId === identity.store_id)) {
      targetStoreId = data.storeId;
    }

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
      name: store?.name || "Empresa Local",
      category: data.niche || store?.category || "Comércio e Serviços Locais",
      location: store?.city && store?.state ? `${store.city} - ${store.state}` : "Brasil",
      description: data.businessDescription || store?.description || "Negócio com presença física e digital no ecossistema Waesy.",
      archetype: brandDna?.archetype || "O Criador",
      topProducts: (topProducts || []).map((p) => p.title || p.name).filter(Boolean),
      targetAudience: data.targetAudience || "Consumidores locais e regionais com foco em agilidade e confiança",
    };

    const promptSystem = `Você é o Estrategista de Modelos de Negócio do Waesy, mestre na metodologia de Alexander Osterwalder (Business Model Canvas).
Sua missão é deduzir e estruturar os 9 blocos do BMC oficial para o negócio informado.
Cada bloco deve conter de 3 a 5 itens objetivos, estratégicos e realistas para a realidade brasileira e economia local.
Você DEVE fornecer evidência ou justificativa para cada afirmação e uma taxa de confiança (0.0 a 1.0).

Retorne ESTRITAMENTE um objeto JSON no formato:
{
  "key_partners": [{"id": "kp-1", "text": "...", "evidence": "...", "confidence": 0.9}],
  "key_activities": [{"id": "ka-1", "text": "...", "evidence": "...", "confidence": 0.9}],
  "key_resources": [{"id": "kr-1", "text": "...", "evidence": "...", "confidence": 0.9}],
  "value_propositions": [{"id": "vp-1", "text": "...", "evidence": "...", "confidence": 0.95}],
  "customer_relationships": [{"id": "cr-1", "text": "...", "evidence": "...", "confidence": 0.9}],
  "channels": [{"id": "ch-1", "text": "...", "evidence": "...", "confidence": 0.9}],
  "customer_segments": [{"id": "cs-1", "text": "...", "evidence": "...", "confidence": 0.95}],
  "cost_structure": [{"id": "co-1", "text": "...", "evidence": "...", "confidence": 0.85}],
  "revenue_streams": [{"id": "rs-1", "text": "...", "evidence": "...", "confidence": 0.9}]
}`;

    const promptUser = `Dados do Negócio:
Nome: ${storeContext.name}
Nicho / Categoria: ${storeContext.category}
Localização: ${storeContext.location}
Descrição: ${storeContext.description}
Arquétipo de Marca: ${storeContext.archetype}
Produtos / Serviços Principais: ${storeContext.topProducts.join(", ") || "Catálogo próprio"}
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
      generated_by_job_id: `bmc-job-${Date.now()}`,
      ai_model: aiResponse.model || "waesy-ai-orchestrator",
      confidence: 0.95,
      edited_by_human: false,
    };

    // Salva automaticamente o BMC recém-gerado no banco
    await saveStoreBmc({
      data: {
        storeId: targetStoreId,
        bmc: result,
      },
    }).catch((err) => {
      console.warn("[canvas-bmc] Aviso ao persistir BMC gerado:", err);
    });

    return result;
  });

// ── GENERATE AI SWOT ANALYSIS FROM STORE ─────────────────────────────────────
export interface SwotAnalysisDTO {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

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
    let targetStoreId = identity.store_id;
    if (data.storeId && (identity.role === "platform_admin" || data.storeId === identity.store_id)) {
      targetStoreId = data.storeId;
    }

    const { data: store } = await supabase
      .from("stores")
      .select("name, description, category, city, state")
      .eq("id", targetStoreId)
      .maybeSingle();

    const brandDna = await getStoreBrandDna({ data: { storeId: targetStoreId } }).catch(() => null);

    const storeName = store?.name || "Empresa";
    const storeCategory = store?.category || "Comércio & Serviços Locais";
    const storeLocation = store?.city && store?.state ? `${store.city} - ${store.state}` : "Brasil";
    const storeDesc = store?.description || "Empresa operando no ecossistema Waesy.";

    const systemPrompt = `Você é o Estrategista Corporativo Chefe do Waesy.
Sua missão é gerar uma análise de Matriz SWOT (Strengths, Weaknesses, Opportunities, Threats) rigorosa, realista e contextualizada para uma empresa operando no mercado brasileiro.

Diretrizes Obrigatórias:
1. Retorne estritamente um objeto JSON com as chaves: "strengths", "weaknesses", "opportunities", "threats".
2. Cada chave deve conter um array de 3 a 5 strings concisas, diretas e profundas (sem jargões prolixos).
3. "strengths": Diferenciais competitivos reais, qualidade, reputação, atendimento humano, agilidade.
4. "weaknesses": Gargalos internos, dependência de poucos fornecedores, controle de custos, marketing digital embrionário.
5. "opportunities": Expansão regional, canais omnichannel, clube de benefícios, digitalização local, convênios.
6. "threats": Concorrência predatória de grandes marketplaces, flutuação de custos, inflação, mudança de hábitos de consumo.`;

    const userPrompt = `Empresa: ${storeName}
Segmento/Categoria: ${storeCategory}
Localização: ${storeLocation}
Descrição: ${storeDesc}
Arquétipo de Marca: ${brandDna?.archetype || "O Prestativo"}

Gere a análise SWOT estratégica completa em JSON estruturado.`;

    const aiRes = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      responseFormat: "json_object",
      temperature: 0.4,
    });

    const parsed = aiRes?.parsedJson as any;
    const result: SwotAnalysisDTO = {
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.filter((s: any) => typeof s === "string" && s.trim()) : [],
      weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses.filter((s: any) => typeof s === "string" && s.trim()) : [],
      opportunities: Array.isArray(parsed?.opportunities) ? parsed.opportunities.filter((s: any) => typeof s === "string" && s.trim()) : [],
      threats: Array.isArray(parsed?.threats) ? parsed.threats.filter((s: any) => typeof s === "string" && s.trim()) : [],
    };

    // Auto-persiste no brand_dna_profiles
    try {
      await supabase
        .from("brand_dna_profiles")
        .upsert(
          {
            store_id: targetStoreId,
            swot_analysis: result,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );
    } catch (err) {
      console.warn("[swot] Falha no auto-save:", err);
    }

    return result;
  });
