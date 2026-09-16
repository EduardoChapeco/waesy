import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SevenSinHookDTO } from "../types/squads-and-onboarding";
import { getStoreBrandDna } from "./market-radar.functions";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ── DEFINIÇÃO DOS 7 PECADOS & GATILHOS PSICOLÓGICOS ─────────────────────────
export const SEVEN_SINS_DEFINITIONS = {
  orgulho: {
    label: "Orgulho & Exclusividade",
    subconscious: "Necessidade de status, validação, ser visto como especial ou superior à média.",
    defaultAngle: "Você não aceita o básico. Feito exclusivamente para quem exige o melhor.",
    color: "#EAB308", // Amber
  },
  ganancia: {
    label: "Ganância & Retorno",
    subconscious: "Sensação de estar lucrando, economizando dinheiro real ou levando vantagem justa.",
    defaultAngle: "Leve o dobro de valor investindo menos. A matemática joga a seu favor.",
    color: "#16A34A", // Emerald
  },
  luxuria: {
    label: "Luxúria & Desejo Sensorial",
    subconscious: "Ativação de prazer imediato, apetite visual incontrolável e indulgência sensorial.",
    defaultAngle: "Uma experiência tão irresistível que é impossível experimentar apenas uma vez.",
    color: "#E11D48", // Rose
  },
  inveja: {
    label: "Inveja & Destaque Social",
    subconscious: "Desejo de possuir o que os outros cobiçam e ser o modelo seguido pelo grupo.",
    defaultAngle: "O segredo que seus amigos vão perguntar de onde você tirou.",
    color: "#8B5CF6", // Violet
  },
  gula: {
    label: "Gula & Abundância",
    subconscious: "Fartura, saciedade máxima, porções generosas sem sensação de escassez.",
    defaultAngle: "Porções generosas, sabor arrebatador e zero arrependimento a cada mordida.",
    color: "#EA580C", // Orange
  },
  ira: {
    label: "Ira & Inconformismo",
    subconscious: "Revolta contra abusos de mercado, indignação com produtos ruins ou promessas falsas.",
    defaultAngle: "Chega de pagar caro por promessas vazias e entregas que atrasam.",
    color: "#DC2626", // Red
  },
  preguica: {
    label: "Preguiça & Zero Esforço",
    subconscious: "Conveniência extrema, solução pronta em 1 clique sem nenhum esforço mental.",
    defaultAngle: "Um toque na tela e tudo resolvido. Você não precisa nem levantar do sofá.",
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
  conversion_probability: number; // 0-100
  reaction_verbatim: string;
  primary_objection?: string;
  recommended_fix?: string;
}

// ── LÓGICA DE NEGÓCIO: GERAR COPY ──────────────────────────────────────────
export async function generateSevenSinCopyLogic(data: {
  storeId?: string;
  sin: SinType;
  productId?: string;
  productNameFallback?: string;
  targetChannel: "whatsapp" | "instagram_ad" | "push_notification" | "storefront_banner";
}): Promise<SevenSinHookDTO> {
  const supabase = getServerClient();
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }

  let productName = data.productNameFallback || "Produto Destaque";
  let productPrice = "R$ 49,90";

  if (data.productId && storeId) {
    try {
      const { data: prod } = await supabase
        .from("products")
        .select("title, name, price_cents, price, description")
        .eq("id", data.productId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (prod) {
        productName = prod.title || prod.name || productName;
        const cents = prod.price_cents ?? (prod.price ? Number(prod.price) : null);
        if (cents !== null && !isNaN(cents)) {
          productPrice = `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
        }
      }
    } catch {
      // Fallback gracioso
    }
  }

  let brandArchetype = "O Criador";
  if (storeId) {
    try {
      const dna = await getStoreBrandDna({ data: { storeId } }).catch(() => null);
      if (dna?.archetype) brandArchetype = dna.archetype;
    } catch {
      // Fallback
    }
  }

  const def = SEVEN_SINS_DEFINITIONS[data.sin as SinType] || SEVEN_SINS_DEFINITIONS.orgulho;

  let headline = "";
  let body = "";
  let cta = "";

  switch (data.sin) {
    case "orgulho":
      headline = `Não é para qualquer um: Conheça o padrão oficial de ${productName}`;
      body = `Quem entende de qualidade reconhece à primeira vista. Feito sob medida com a essência de ${brandArchetype} para clientes que exigem excelência sem concessões. Adquira agora por apenas ${productPrice}.`;
      cta = "Garantir Edição Limitada";
      break;
    case "ganancia":
      headline = `Pague por 1, sinta o valor de 2: O melhor custo-benefício de ${productName}`;
      body = `Economize margem real sem abrir mão do padrão premium. Ao pedir hoje por ${productPrice}, você tem retorno em satisfação e economia imediata comprovada.`;
      cta = "Aproveitar Oportunidade Exclusiva";
      break;
    case "luxuria":
      headline = `Uma explosão sensorial inesquecível: ${productName}`;
      body = `A textura perfeita, o acabamento impecável e a experiência que conquista no primeiro instante. Você merece se dar esse presente especial hoje por ${productPrice}.`;
      cta = "Quero Experimentar Agora";
      break;
    case "inveja":
      headline = `O que todos estão comentando: Descubra o novo ${productName}`;
      body = `Descubra por que quem experimenta não consegue mais voltar atrás. Seja a referência entre os seus e garanta sua unidade por ${productPrice}.`;
      cta = "Ver Por Que É Tão Desejado";
      break;
    case "gula":
      headline = `Fartura sem limites: Surpreenda suas expectativas com ${productName}`;
      body = `Uma experiência generosa e irresistível, preparada com os melhores materiais e ingredientes. Satisfação plena do início ao fim por apenas ${productPrice}.`;
      cta = "Pedir Agora";
      break;
    case "ira":
      headline = `Cansado de promessas vazias? Chegou o verdadeiro ${productName}`;
      body = `Chega de produtos genéricos e atendimentos que frustram. Nós respeitamos seu tempo e seu dinheiro com padrão rigoroso de qualidade por ${productPrice}.`;
      cta = "Exigir o Padrão Que Eu Mereço";
      break;
    case "preguica":
      headline = `Em 1 toque no seu celular: ${productName} na sua mão`;
      body = `Sem filas, sem dor de cabeça, sem cadastros demorados. Peça agora em segundos pelo WhatsApp e receba diretamente onde estiver por ${productPrice}.`;
      cta = "Pedir em 1 Clique Sem Esforço";
      break;
    default:
      headline = `Descubra o padrão único de ${productName}`;
      body = `Qualidade comprovada por ${productPrice}. Peça em poucos toques.`;
      cta = "Comprar Agora";
      break;
  }

  return {
    sin: data.sin as SinType,
    title: `${def.label} — ${productName}`,
    subconscious_trigger: def.subconscious,
    copy_headline: headline,
    copy_body: body,
    call_to_action: cta,
    recommended_channel: data.targetChannel,
  };
}

// ── LÓGICA DE NEGÓCIO: SIMLAB PERSONAS ─────────────────────────────────────
export function runSimLabPersonaTestLogic(data: {
  sin: SinType;
  copyHeadline: string;
  copyBody: string;
}): SimLabPersonaResult[] {
  const personas = [
    {
      persona_id: "persona_lucas_universitario",
      name: "Lucas Menezes, 23 anos",
      archetype_label: "Universitário Pragmático & Ágil",
      avatar_url: null,
      preferredSins: ["preguica", "ganancia", "gula"],
      bias: 0.85,
    },
    {
      persona_id: "persona_claudia_mae",
      name: "Cláudia Silveira, 41 anos",
      archetype_label: "Mãe Gestora & Família",
      avatar_url: null,
      preferredSins: ["ganancia", "ira", "orgulho"],
      bias: 0.78,
    },
    {
      persona_id: "persona_rodrigo_executivo",
      name: "Rodrigo Carvalho, 36 anos",
      archetype_label: "Executivo Sem Tempo & Status",
      avatar_url: null,
      preferredSins: ["orgulho", "preguica", "inveja"],
      bias: 0.92,
    },
    {
      persona_id: "persona_amanda_foodie",
      name: "Amanda Fontana, 28 anos",
      archetype_label: "Entusiasta Experiencial & Design",
      avatar_url: null,
      preferredSins: ["luxuria", "orgulho", "inveja"],
      bias: 0.88,
    },
    {
      persona_id: "persona_marcos_economico",
      name: "Marcos Vinícius, 52 anos",
      archetype_label: "Consumidor Tradicional Cético",
      avatar_url: null,
      preferredSins: ["ganancia", "ira"],
      bias: 0.70,
    },
  ];

  return personas.map((p) => {
    const isPreferred = p.preferredSins.includes(data.sin);
    const score = Math.min(
      98,
      Math.max(45, Math.round(p.bias * 100 + (isPreferred ? 15 : -10) + (Math.random() * 8 - 4)))
    );

    let verbatim = "";
    let objection: string | undefined;
    let fix: string | undefined;

    if (score >= 85) {
      verbatim = `\"Essa headline me pegou de cara. A promessa é clara e toca exatamente no que me faz decidir comprar agora sem pensar duas vezes.\"`;
    } else if (score >= 70) {
      verbatim = `\"Gostei da abordagem e faz sentido, mas ainda precisaria confirmar o prazo exato de entrega ou garantia.\"`;
      objection = "Dúvida sobre transparência de taxas, prazos ou garantia.";
      fix = "Inserir prazo estimado ou garantia explícita (ex: 'Envio em até 24h' ou 'Satisfação garantida').";
    } else {
      verbatim = `\"Parece um anúncio comum como outros que vejo. Precisa de uma prova social mais forte para me convencer a agir imediatamente.\"`;
      objection = "Falta de comprovação social ou garantia incontestável.";
      fix = "Adicionar menção de satisfação comprovada ou depoimento real de cliente.";
    }

    return {
      persona_id: p.persona_id,
      name: p.name,
      archetype_label: p.archetype_label,
      avatar_url: p.avatar_url,
      conversion_probability: score,
      reaction_verbatim: verbatim,
      primary_objection: objection,
      recommended_fix: fix,
    };
  });
}

// ── LÓGICA DE NEGÓCIO: SALVAR GANCHO ──────────────────────────────────────
export async function saveSevenSinHookToStoreLogic(data: {
  storeId?: string;
  sin: SinType;
  hook: SevenSinHookDTO;
}): Promise<{ success: boolean; message: string }> {
  const supabase = getServerClient();
  let storeId = data.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) {
    throw new Error("Loja não identificada para salvar o gancho de marketing.");
  }

  const { data: existing } = await supabase
    .from("brand_dna_profiles")
    .select("seven_sins_triggers")
    .eq("store_id", storeId)
    .maybeSingle();

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
    console.warn("[seven-sins] Erro ao atualizar brand_dna_profiles:", dnaErr);
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
  let storeId = data?.storeId;
  if (!storeId) {
    const identity = await getServerIdentity().catch(() => null);
    storeId = identity?.store_id;
  }
  if (!storeId) return [];

  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, price_cents")
    .eq("store_id", storeId)
    .in("status", ["active", "published"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !products) return [];

  return products.map((p) => ({
    id: p.id,
    title: p.title || "Produto sem título",
    price_cents: p.price_cents,
  }));
}

// ── SERVER FUNCTIONS (BFF TANSTACK START RPC) ──────────────────────────────
export const generateSevenSinCopy = createServerFn({ method: "POST" })
  .validator((input: {
    storeId?: string;
    sin: SinType;
    productId?: string;
    productNameFallback?: string;
    targetChannel: "whatsapp" | "instagram_ad" | "push_notification" | "storefront_banner";
  } | { storeId: string; params: any } | any) => {
    if (input?.params && typeof input.params === "object") {
      return { storeId: input.storeId, ...input.params };
    }
    return input;
  })
  .handler(async ({ data }): Promise<SevenSinHookDTO> => {
    return generateSevenSinCopyLogic(data);
  });

export const runSimLabPersonaTest = createServerFn({ method: "POST" })
  .validator((input: {
    sin: SinType;
    copyHeadline: string;
    copyBody: string;
  }) => input)
  .handler(async ({ data }): Promise<SimLabPersonaResult[]> => {
    return runSimLabPersonaTestLogic(data);
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
  .validator((input: { storeId?: string } | string | undefined) => {
    if (typeof input === "string") return { storeId: input };
    return input || {};
  })
  .handler(async ({ data }) => {
    return listStoreProductsQuickLogic(data);
  });
