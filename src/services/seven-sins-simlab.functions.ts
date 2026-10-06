import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SevenSinHookDTO } from "../types/squads-and-onboarding";
import type { SimLabProvenance } from "../types/simlab";
import { getStoreBrandDna } from "./market-radar.functions";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { assertStoreAccess } from "@/lib/server-access";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { executeCreateSimLabExperiment, executeSimLabBatchSimulation } from "./simlab.functions";

// ── DEFINIÇÃO DOS 7 PECADOS & GATILHOS PSICOLÓGICOS ─────────────────────────
export const SEVEN_SINS_DEFINITIONS = {
  orgulho: {
    label: "Orgulho e Exclusividade",
    subconscious: "Necessidade de status, validação, ser visto como especial ou superior à média.",
    color: "#EAB308", // Amber
  },
  ganancia: {
    label: "Ganância e Retorno",
    subconscious: "Sensação de estar lucrando, economizando dinheiro real ou levando vantagem justa.",
    color: "#16A34A", // Emerald
  },
  luxuria: {
    label: "Luxúria e Desejo Sensorial",
    subconscious: "Ativação de prazer imediato, apetite visual incontrolável e indulgência sensorial.",
    color: "#E11D48", // Rose
  },
  inveja: {
    label: "Inveja e Destaque Social",
    subconscious: "Desejo de possuir o que os outros cobiçam e ser o modelo seguido pelo grupo.",
    color: "#8B5CF6", // Violet
  },
  gula: {
    label: "Gula e Abundância",
    subconscious: "Fartura, saciedade máxima, porções generosas sem sensação de escassez.",
    color: "#EA580C", // Orange
  },
  ira: {
    label: "Ira e Inconformismo",
    subconscious: "Revolta contra abusos de mercado, indignação com produtos ruins ou promessas falsas.",
    color: "#DC2626", // Red
  },
  preguica: {
    label: "Preguiça e Zero Esforço",
    subconscious: "Conveniência máxima, fricção eliminada, entrega pronta sem burocracia ou perda de tempo.",
    color: "#0A84FF", // Blue
  },
};

export type SinType = keyof typeof SEVEN_SINS_DEFINITIONS;

// ── PERSONAS SINTÉTICAS DO SIMLAB V2 ────────────────────────────────────────
export interface SimLabPersonaResult {
  persona_id: string;
  name: string;
  archetype_label: string;
  avatar_url: string | null;
  profile_origin: string;
  calibration_status: string;
  response_origin: "llm_synthetic";
  reaction_qualitative: string;
  primary_objection?: string;
  recommended_fix?: string;
  provenance: SimLabProvenance;
}

// ── LÓGICA DE NEGÓCIO: GERAR COPY ──────────────────────────────────────────
export async function generateSevenSinCopyLogic(data: {
  storeId?: string;
  sin: SinType;
  productId?: string;
  productNameFallback?: string;
  targetChannel: "whatsapp" | "instagram_ad" | "push_notification" | "storefront_banner";
}): Promise<SevenSinHookDTO> {
  const identity = await getServerIdentity();
  const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
  if (!storeId) throw new Error("Selecione um workspace antes de gerar a copy.");
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);

  const definition = SEVEN_SINS_DEFINITIONS[data.sin];
  if (!definition) throw new Error("Selecione um gatilho válido.");
  let productName = data.productNameFallback?.trim() || "";
  let productDescription = "";
  let priceBrl: number | null = null;

  if (data.productId) {
    const supabase = getServerClient();
    const { data: product, error } = await supabase
      .from("products")
      .select("title, name, price_cents, description")
      .eq("id", data.productId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao carregar o produto selecionado: ${error.message}`);
    if (!product) throw new Error("O produto não existe neste workspace.");
    productName = product.title || product.name || productName;
    productDescription = product.description || "";
    priceBrl = Number.isFinite(product.price_cents) && product.price_cents != null ? product.price_cents / 100 : null;
  }
  if (!productName) throw new Error("Selecione um produto ou informe um nome antes de gerar a copy.");

  const brandDna = await getStoreBrandDna({ data: { storeId } }).catch(() => null);
  const brandArchetype = brandDna?.archetype || null;
  const knownFacts = {
    product_name: productName,
    product_description: productDescription || null,
    price_brl: priceBrl,
    brand_archetype: brandArchetype,
    channel: data.targetChannel,
    creative_lens: definition.label,
    lens_context: definition.subconscious,
  };

  const aiResult = await executeUnifiedAiCall({
    systemPrompt: `Você é um redator de marketing que produz rascunhos para revisão humana. Gere somente a copy para o canal informado e use apenas fatos explícitos no contexto.
Nunca invente preço, desconto, escassez, prova social, avaliação, certificação, garantia, prazo/entrega, resultado, disponibilidade ou alegação de superioridade. Se preço não estiver informado, não mencione preço. Não apresente hipótese como fato. Use o gatilho criativo selecionado como lente opcional, sem alegar eficácia científica ou conversão. Retorne JSON estrito: {"headline":"...","body":"...","cta":"..."}.`,
    userPrompt: JSON.stringify(knownFacts),
    responseFormat: "json_object",
    temperature: 0.4,
    feature: "seven_sins_marketing_copy",
    storeId,
  });

  let parsed: any = aiResult.parsedJson;
  if (!parsed && aiResult.content) {
    try { parsed = JSON.parse(aiResult.content); } catch { throw new Error("A IA retornou conteúdo que não é JSON válido; nenhuma copy de fallback foi usada."); }
  }
  const copy = z.object({ headline: z.string().trim().min(2).max(240), body: z.string().trim().min(2).max(2000), cta: z.string().trim().min(2).max(120) }).safeParse(parsed);
  if (!copy.success) throw new Error("A IA não retornou uma copy válida; nenhuma resposta predefinida foi usada.");

  return {
    sin: data.sin,
    title: `${definition.label} — ${productName}`,
    subconscious_trigger: definition.subconscious,
    copy_headline: copy.data.headline,
    copy_body: copy.data.body,
    call_to_action: copy.data.cta,
    recommended_channel: data.targetChannel,
  };
}

export async function runSimLabPersonaTestWithAI(data: {
  storeId?: string;
  sin: SinType;
  copyHeadline: string;
  copyBody: string;
}): Promise<SimLabPersonaResult[]> {
  const identity = await getServerIdentity();
  const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
  if (!storeId) throw new Error("Selecione um workspace antes de explorar a campanha.");
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);

  const definition = SEVEN_SINS_DEFINITIONS[data.sin];
  if (!definition) throw new Error("Selecione um gatilho válido.");
  const title = `Exploração de campanha — ${definition.label}`;
  const objective = `Reagir qualitativamente, como perfis sintéticos não representativos, à campanha fornecida. Lente criativa: ${definition.label}. Não estimar conversão, compra ou performance.\nHeadline: ${data.copyHeadline}\nCorpo: ${data.copyBody}`;
  const { experiment } = await executeCreateSimLabExperiment({
    storeId,
    title,
    objective,
    stimulusPayload: { title, description: objective, creative_lens: definition.label },
    sampleSize: 5,
  });
  const result = await executeSimLabBatchSimulation({ experimentId: experiment.id, storeId });
  return result.responses.map((response) => {
    const persona = response.archetype;
    return {
      persona_id: response.archetype_code || response.id,
      name: persona?.display_name || "Perfil sintético",
      archetype_label: persona ? `${persona.age} anos · classe ${persona.abep_social_class} · ${persona.region}` : "Perfil sintético · atributos limitados",
      avatar_url: null,
      profile_origin: String(response.provenance?.persona_profile_origin || "legacy_unknown"),
      calibration_status: String(response.provenance?.calibration_status || "unknown"),
      response_origin: "llm_synthetic",
      reaction_qualitative: response.verbatim_reaction || "Resposta indisponível.",
      primary_objection: response.primary_barrier_objection || undefined,
      provenance: response.provenance || {},
    };
  });
}

export const RunSimLabPersonaTestSchema = z.object({
  storeId: z.string().uuid().optional(),
  sin: z.enum(["orgulho", "ganancia", "luxuria", "inveja", "gula", "ira", "preguica"]),
  copyHeadline: z.string().trim().min(1).max(500),
  copyBody: z.string().trim().min(1).max(4000),
});

// ── LÓGICA DE NEGÓCIO: SALVAR GANCHO ──────────────────────────────────────
export async function saveSevenSinHookToStoreLogic(data: {
  storeId?: string;
  sin: SinType;
  hook: SevenSinHookDTO;
}): Promise<{ success: boolean; message: string }> {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
  if (!storeId) {
    throw new Error("Loja não identificada para salvar o gancho de marketing.");
  }
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);

  const { data: existing, error: readError } = await supabase
    .from("brand_dna_profiles")
    .select("seven_sins_triggers")
    .eq("store_id", storeId)
    .maybeSingle();
  if (readError) throw new Error(`Falha ao carregar Brand DNA: ${readError.message}`);

  const currentTriggers = (existing?.seven_sins_triggers as Record<string, string>) || {};
  currentTriggers[data.sin] = `${data.hook.copy_headline} — ${data.hook.copy_body}`;

  const { error: dnaErr } = await supabase
    .from("brand_dna_profiles")
    .upsert(
      {
        store_id: storeId,
        seven_sins_triggers: currentTriggers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

  if (dnaErr) {
    throw new Error(`Falha ao atualizar Brand DNA: ${dnaErr.message}`);
  }

  return {
    success: true,
    message: `Gatilho do pecado "${data.sin}" salvo com sucesso no Brand DNA oficial da loja!`,
  };
}

// ── LÓGICA DE NEGÓCIO: LISTAR PRODUTOS RÁPIDOS ─────────────────────────────
export async function listStoreProductsQuickLogic(data: {
  storeId?: string;
}): Promise<Array<{ id: string; title: string; price_cents: number | null }>> {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  const storeId = data?.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
  if (!storeId) throw new Error("Selecione um workspace para consultar os produtos.");
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"], storeId);

  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, price_cents")
    .eq("store_id", storeId)
    .in("status", ["active", "published"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(`Falha ao consultar produtos: ${error.message}`);
  if (!products) return [];

  return products.map((p) => ({
    id: p.id,
    title: p.title || "Produto sem título",
    price_cents: p.price_cents,
  }));
}

// ── SERVER FUNCTIONS (BFF TANSTACK START RPC) ──────────────────────────────
const GenerateSevenSinCopySchema = z.object({
  storeId: z.string().uuid().optional(),
  sin: z.enum(["orgulho", "ganancia", "luxuria", "inveja", "gula", "ira", "preguica"]),
  productId: z.string().uuid().optional(),
  productNameFallback: z.string().trim().max(160).optional(),
  targetChannel: z.enum(["whatsapp", "instagram_ad", "push_notification", "storefront_banner"]),
});

export const generateSevenSinCopy = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const input: any = raw;
    if (input?.params && typeof input.params === "object") {
      return GenerateSevenSinCopySchema.parse({ storeId: input.storeId, ...input.params });
    }
    return GenerateSevenSinCopySchema.parse(raw);
  })
  .handler(async ({ data }): Promise<SevenSinHookDTO> => {
    return generateSevenSinCopyLogic(data);
  });

export const runSimLabPersonaTest = createServerFn({ method: "POST" })
  .validator((input: unknown) => RunSimLabPersonaTestSchema.parse(input))
  .handler(async ({ data }): Promise<SimLabPersonaResult[]> => {
    return runSimLabPersonaTestWithAI(data);
  });

export const saveSevenSinHookToStore = createServerFn({ method: "POST" })
  .validator((input: {
    storeId?: string;
    sin: SinType;
    hook: SevenSinHookDTO;
  }) => input)
  .handler(async ({ data }) => {
    return saveSevenSinHookToStoreLogic(data);
  });

export const listStoreProductsQuick = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const normalized = typeof input === "string" ? { storeId: input } : (input || {});
    return z.object({ storeId: z.string().uuid().optional() }).parse(normalized);
  })
  .handler(async ({ data }) => {
    return listStoreProductsQuickLogic(data);
  });
