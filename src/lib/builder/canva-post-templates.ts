/**
 * canva-post-templates.ts — Motor Paramétrico de Templates, Elementos, Seções e Cards (Canva Studio Engine)
 * Alimenta a Segunda Sidebar Contextual do Waesy Copilot e o extrator semântico de Posts, Stories e Apresentações.
 */

import type {
  CreativeArchetype,
  CreativeAspectRatio,
  CreativeThemeId,
} from "@/components/studio/creative-artboard-renderer";

export interface CanvaTemplatePreset {
  id: string;
  name: string;
  category:
    | "turismo"
    | "gastronomia"
    | "varejo"
    | "servicos"
    | "imoveis"
    | "apresentacao"
    | "corporativo";
  categoryLabel: string;
  archetype: CreativeArchetype;
  themeId: CreativeThemeId;
  aspectRatio: CreativeAspectRatio;
  badge: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  offerBadge?: string;
  offerPrice?: string;
  installments?: string;
  ctaText: string;
  locationLabel?: string;
  hashtags: string[];
}

export interface CanvaBuilderElementCard {
  id: string;
  label: string;
  kind: "badge" | "price_card" | "checklist" | "cta_banner" | "location_pin" | "slide_split";
  description: string;
  applyPatch: Partial<CanvaTemplatePreset>;
}

export const CANVA_TEMPLATE_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "turismo", label: "Turismo & Viagens" },
  { id: "varejo", label: "Ofertas & Varejo" },
  { id: "gastronomia", label: "Gastronomia" },
  { id: "servicos", label: "Serviços & Clínicas" },
  { id: "imoveis", label: "Imóveis & Autos" },
  { id: "apresentacao", label: "Apresentações 16:9" },
] as const;

export const CANVA_STUDIO_TEMPLATES: CanvaTemplatePreset[] = [
  {
    id: "tpl-travel-story-all-inclusive",
    name: "Story Resort All Inclusive",
    category: "turismo",
    categoryLabel: "Turismo & Viagens",
    archetype: "travel",
    themeId: "gold",
    aspectRatio: "9:16",
    badge: "Oferta Por Tempo Limitado",
    headline: "Super Ofertas All Inclusive para Sua Próxima Viagem",
    subheadline:
      "Garanta sua viagem com descontos exclusivos, aéreo + resort completo e acompanhamento especializado.",
    bullets: [
      "All Inclusive completo (refeições, bebidas e lazer)",
      "Aéreo + traslado + bagagem selecionada",
      "Suporte completo antes e durante a viagem",
    ],
    offerBadge: "Desconto Exclusivo",
    offerPrice: "R$ 4.990",
    installments: "por pessoa em até 10x sem juros",
    ctaText: "Conferir Ofertas Agora",
    locationLabel: "Caribe & Nordeste • Saídas Garantidas",
    hashtags: ["#viagem", "#allinclusive", "#turismo", "#ofertasdeviagem", "#ferias"],
  },
  {
    id: "tpl-travel-feed-pacote",
    name: "Feed Pacote & Roteiro Exclusivo",
    category: "turismo",
    categoryLabel: "Turismo & Viagens",
    archetype: "travel",
    themeId: "cobalt",
    aspectRatio: "1:1",
    badge: "Roteiro Selecionado",
    headline: "Embarque na Viagem dos Seus Sonhos com Condição Especial",
    subheadline:
      "Hospedagem selecionada, passeios guiados e assessoria completa da nossa agência.",
    bullets: [
      "Hotéis e resorts com avaliação máxima",
      "Roteiro planejado dia a dia",
      "Parcelamento facilitado no Pix ou cartão",
    ],
    offerBadge: "Vagas Limitadas",
    offerPrice: "R$ 2.890",
    installments: "por pessoa • taxas inclusas",
    ctaText: "Reservar pelo WhatsApp",
    locationLabel: "Saídas Regionais & Nacionais",
    hashtags: ["#turismo", "#pacotedeviagem", "#agenciadeviagens", "#roteiro"],
  },
  {
    id: "tpl-travel-portrait-cruzeiro",
    name: "Retrato Temporada de Cruzeiros & Praias",
    category: "turismo",
    categoryLabel: "Turismo & Viagens",
    archetype: "promo_offer",
    themeId: "emerald",
    aspectRatio: "4:5",
    badge: "Temporada 2026/2027",
    headline: "Férias Inesquecíveis com Até 35% de Desconto",
    subheadline:
      "Pacotes familiares e casais com seguro viagem e assistência completa inclusa.",
    bullets: [
      "Cabines e suítes com vista panorâmica",
      "Criança grátis em saídas selecionadas",
      "Bloqueio aéreo com tarifa reduzida",
    ],
    offerBadge: "Lote Promocional",
    offerPrice: "R$ 3.490",
    installments: "em até 12x iguais",
    ctaText: "Solicitar Cotação",
    locationLabel: "Costa Brasileira & Internacional",
    hashtags: ["#cruzeiros", "#ferias", "#viagens", "#promocaodeviagem"],
  },
  {
    id: "tpl-retail-story-flash-sale",
    name: "Story Super Oferta Relâmpago",
    category: "varejo",
    categoryLabel: "Ofertas & Varejo",
    archetype: "promo_offer",
    themeId: "terracotta",
    aspectRatio: "9:16",
    badge: "Só Hoje • Estoque Limitado",
    headline: "Super Oferta Exclusiva para Clientes da Região",
    subheadline:
      "Descontos reais em produtos selecionados com entrega expressa ou retirada imediata.",
    bullets: [
      "Qualidade e garantia oficial de fábrica",
      "Entrega rápida na sua cidade",
      "Pagamento via Pix com desconto extra",
    ],
    offerBadge: "Oferta Relâmpago",
    offerPrice: "R$ 199,90",
    installments: "ou 6x sem juros no cartão",
    ctaText: "Comprar pelo WhatsApp",
    hashtags: ["#ofertas", "#promocao", "#comerciolocal", "#desconto"],
  },
  {
    id: "tpl-retail-feed-checklist",
    name: "Feed Checklist de Diferenciais",
    category: "varejo",
    categoryLabel: "Ofertas & Varejo",
    archetype: "bullet_checklist",
    themeId: "obsidian",
    aspectRatio: "1:1",
    badge: "Por Que Escolher Nossa Loja",
    headline: "Qualidade, Agilidade e Atendimento Direto sem Burocracia",
    subheadline:
      "Confira tudo o que preparamos para você economizar tempo e dinheiro na sua compra.",
    bullets: [
      "Catálogo atualizado em tempo real",
      "Atendimento consultivo humano e rápido",
      "Garantia total e troca facilitada",
    ],
    ctaText: "Conferir Catálogo",
    hashtags: ["#qualidade", "#atendimento", "#lojalocal", "#compras"],
  },
  {
    id: "tpl-food-story-combo",
    name: "Story Combo Gastronômico",
    category: "gastronomia",
    categoryLabel: "Gastronomia",
    archetype: "promo_offer",
    themeId: "terracotta",
    aspectRatio: "9:16",
    badge: "Especial da Noite",
    headline: "Sabor Artesanal Quentinho na Sua Casa",
    subheadline:
      "Ingredientes frescos selecionados, preparo na hora e entrega rápida com rastreio.",
    bullets: [
      "Ingredientes selecionados do dia",
      "Embalagem térmica que preserva o sabor",
      "Peça direto sem taxa oculta",
    ],
    offerBadge: "Combo Especial",
    offerPrice: "R$ 64,90",
    installments: "Serve 2 pessoas • Entrega rápida",
    ctaText: "Pedir Agora no Cardápio",
    hashtags: ["#gastronomia", "#delivery", "#jantarespecial", "#sabor"],
  },
  {
    id: "tpl-services-feed-authority",
    name: "Feed Autoridade & Agendamento",
    category: "servicos",
    categoryLabel: "Serviços & Clínicas",
    archetype: "bullet_checklist",
    themeId: "paper",
    aspectRatio: "4:5",
    badge: "Especialistas Certificados",
    headline: "Cuidado Personalizado e Resultados Comprovados",
    subheadline:
      "Agende sua avaliação com nossa equipe e tenha acompanhamento completo em cada etapa.",
    bullets: [
      "Diagnóstico detalhado e plano individual",
      "Ambiente moderno e horários flexíveis",
      "Acompanhamento pós-atendimento dedicado",
    ],
    ctaText: "Agendar Avaliação",
    hashtags: ["#especialistas", "#atendimento", "#saude", "#bemestar"],
  },
  {
    id: "tpl-realestate-feed-opportunity",
    name: "Feed Oportunidade Imobiliária",
    category: "imoveis",
    categoryLabel: "Imóveis & Autos",
    archetype: "promo_offer",
    themeId: "obsidian",
    aspectRatio: "4:5",
    badge: "Oportunidade Exclusiva",
    headline: "Alto Padrão com Localização Privilegiada e Valorização",
    subheadline:
      "Condições especiais de financiamento e assessoria documental completa.",
    bullets: [
      "Localização nobre com infraestrutura completa",
      "Acabamento premium e planta inteligente",
      "Visitas guiadas com horário agendado",
    ],
    offerBadge: "Destaque",
    offerPrice: "R$ 680.000",
    installments: "Entrada facilitada + financiamento",
    ctaText: "Agendar Visita",
    locationLabel: "Centro • Região Nobre",
    hashtags: ["#imoveis", "#investimento", "#altopadrao", "#oportunidade"],
  },
  {
    id: "tpl-deck-executive-16x9",
    name: "Slide 16:9 Apresentação Comercial",
    category: "apresentacao",
    categoryLabel: "Apresentações 16:9",
    archetype: "presentation",
    themeId: "obsidian",
    aspectRatio: "16:9",
    badge: "Apresentação Executiva",
    headline: "Planejamento Estratégico, Metas e Crescimento Comercial",
    subheadline:
      "Resumo executivo de resultados, indicadores operacionais e plano de ação trimestral.",
    bullets: [
      "Expansão de canais de aquisição e recorrência",
      "Automação do funil de atendimento e pós-venda",
      "Aumento de conversão com campanhas direcionadas",
    ],
    ctaText: "Avançar para Próxima Etapa",
    hashtags: ["#estrategia", "#negocios", "#resultados", "#gestao"],
  },
];

export const CANVA_BUILDER_ELEMENTS: CanvaBuilderElementCard[] = [
  {
    id: "el-story-format",
    label: "Formato Story (9:16)",
    kind: "badge",
    description: "Converte instantaneamente o canvas para vertical 9:16 (Stories/Reels).",
    applyPatch: { aspectRatio: "9:16" },
  },
  {
    id: "el-feed-format",
    label: "Formato Feed (1:1)",
    kind: "badge",
    description: "Converte o canvas para quadrado 1:1 clássico de Feed.",
    applyPatch: { aspectRatio: "1:1" },
  },
  {
    id: "el-portrait-format",
    label: "Formato Retrato (4:5)",
    kind: "badge",
    description: "Proporção 4:5 vertical de máxima área útil no Instagram.",
    applyPatch: { aspectRatio: "4:5" },
  },
  {
    id: "el-slide-format",
    label: "Formato Apresentação (16:9)",
    kind: "slide_split",
    description: "Converte para slide widescreen 16:9 com layout executivo em colunas.",
    applyPatch: { aspectRatio: "16:9", archetype: "presentation" },
  },
  {
    id: "el-price-all-inclusive",
    label: "Bloco Preço All Inclusive",
    kind: "price_card",
    description: "Adiciona destaque de tarifa promocional + parcelamento.",
    applyPatch: {
      archetype: "travel",
      offerBadge: "Desconto Exclusivo",
      offerPrice: "R$ 4.990",
      installments: "por pessoa • All Inclusive",
    },
  },
  {
    id: "el-checklist-benefits",
    label: "Seção Checklist de Benefícios",
    kind: "checklist",
    description: "Estrutura a peça com 3 tópicos escaneáveis de alta conversão.",
    applyPatch: {
      archetype: "bullet_checklist",
      bullets: [
        "Condições exclusivas por tempo limitado",
        "Atendimento personalizado do início ao fim",
        "Garantia e suporte rápido pelo WhatsApp",
      ],
    },
  },
];

/**
 * Extrai especificações reais de Post/Story/Apresentação diretamente do prompt do usuário,
 * eliminando qualquer texto estático genérico ("Super Oferta da Semana no Waesy!").
 */
export function extractCreativePostSpecFromPrompt(
  userPrompt: string,
  toolArgs: Record<string, any> = {},
  workingMemory: Record<string, any> = {},
  context: { city?: string; storeName?: string } = {},
): {
  title: string;
  headline: string;
  subheadline: string;
  badge: string;
  offerBadge: string;
  offerPrice?: string;
  installments?: string;
  ctaText: string;
  format: "story" | "portrait" | "landscape" | "feed";
  aspectRatio: CreativeAspectRatio;
  archetype: CreativeArchetype;
  themeId: CreativeThemeId;
  bullets: string[];
  brandName: string;
  locationLabel?: string;
  hashtags: string[];
} {
  const raw = userPrompt.trim();
  const lower = raw.toLowerCase();

  // 1. Detectar proporção / formato ("story", "foramto story", "9:16", "4:5", "16:9", "slide")
  const isStory =
    /\b(story|stories|reels|9:16|vertical)\b/i.test(lower) ||
    /foramto\s+story|formato\s+story/i.test(lower) ||
    toolArgs.format === "story";
  const isPortrait = /\b(4:5|retrato)\b/i.test(lower) || toolArgs.format === "portrait";
  const isLandscape =
    /\b(16:9|slide|apresenta[cç][aã]o|widescreen|banner\s+horizontal)\b/i.test(lower) ||
    toolArgs.format === "landscape";

  const format: "story" | "portrait" | "landscape" | "feed" = isStory
    ? "story"
    : isPortrait
      ? "portrait"
      : isLandscape
        ? "landscape"
        : "feed";

  const aspectRatio: CreativeAspectRatio =
    format === "story"
      ? "9:16"
      : format === "portrait"
        ? "4:5"
        : format === "landscape"
          ? "16:9"
          : "1:1";

  // 2. Detectar nicho / arquétipo
  const isTravel =
    /\b(viagem|viagens|turismo|all\s*-?\s*inclusive|resort|pacote|voo|a[eé]reo|hotel|pousada|cruzeiro|excurs[aã]o|ferias|f[eé]rias|roteiro)\b/i.test(
      lower,
    );
  const isFood =
    /\b(pizza|lanche|hamb[uú]rguer|restaurante|card[aá]pio|combo|almo[cç]o|jantar|gastronomia|delivery)\b/i.test(
      lower,
    );

  // 3. Extrair preço real do prompt (ex: "menos de 5mil", "5 mil", "R$ 4.990", "por 2500")
  let offerPrice: string | undefined = toolArgs.offer_price || toolArgs.offerPrice;
  let installments: string | undefined = toolArgs.installments;

  if (!offerPrice) {
    const milMatch = lower.match(/(?:menos\s+de\s+|a\s+partir\s+de\s+|por\s+)?(\d+(?:[.,]\d+)?)\s*mil\b/i);
    const brlMatch = raw.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)/i);
    if (milMatch) {
      const val = Number(milMatch[1].replace(",", "."));
      if (!Number.isNaN(val) && val > 0) {
        const formatted = (val * 1000).toLocaleString("pt-BR");
        offerPrice = lower.includes("menos de") ? `< R$ ${formatted}` : `R$ ${formatted}`;
      }
    } else if (brlMatch) {
      offerPrice = `R$ ${brlMatch[1]}`;
    }
  }

  if (!installments) {
    if (/por\s+pessoa/i.test(lower)) {
      installments = "por pessoa • condições especiais";
    } else if (/all\s*-?\s*inclusive/i.test(lower)) {
      installments = "All Inclusive • consulte saídas";
    }
  }

  // 4. Extrair marca / loja mencionada ou do contexto
  const brandMatch = raw.match(
    /(?:sobre\s+a|para\s+a|da\s+empresa|marca|ag[eê]ncia)\s+["“]?([A-ZÀ-Ÿ][A-Za-zÀ-ÿ0-9\s&.-]{2,40})["”]?/i,
  );
  const brandName =
    toolArgs.store_name ||
    toolArgs.brandName ||
    brandMatch?.[1]?.trim() ||
    context.storeName ||
    (typeof workingMemory.store_name === "string" ? workingMemory.store_name : "") ||
    (isTravel ? "Excelência Tour" : context.city ? `Negócios ${context.city}` : "Estúdio Waesy");

  // 5. Extrair copy entre aspas ou usar o conteúdo real do usuário
  const quotedMatch = raw.match(/["“]([^"”]{10,220})["”]/);
  const cleanedUserCopy = raw
    .replace(/^(quero\s+saber\s+se\s+podemos\s+|quero\s+|preciso\s+|vamos\s+|pode\s+)?(criar|gerar|fazer|montar)\s+(um\s+|uma\s+)?(post|story|stories|arte|an[uú]ncio|criativo)\s*(sobre|para|de|com)?\s*/i, "")
    .replace(/\b(foramto|formato)\s+(story|stories|feed|retrato|quadrado)\b/gi, "")
    .replace(/[\[\]()]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  let headline = toolArgs.headline ? String(toolArgs.headline).trim() : "";
  let subheadline = toolArgs.copy || toolArgs.body_text ? String(toolArgs.copy || toolArgs.body_text).trim() : "";

  if (!headline || headline === "Super Oferta da Semana no Waesy!") {
    if (isTravel && /all\s*-?\s*inclusive/i.test(lower)) {
      headline = offerPrice
        ? `Super Ofertas All Inclusive ${offerPrice}`
        : "Super Ofertas All Inclusive por Tempo Limitado";
    } else if (isTravel) {
      headline = "Super Ofertas para Garantir Sua Próxima Viagem";
    } else if (quotedMatch) {
      const words = quotedMatch[1].trim().split(/\s+/);
      headline = words.slice(0, 8).join(" ");
    } else if (cleanedUserCopy.length > 12) {
      const words = cleanedUserCopy.split(/\s+/);
      headline = words.slice(0, 8).join(" ");
    } else {
      headline = isFood
        ? "Sabor Especial com Condição Exclusiva Hoje"
        : "Condições Exclusivas por Tempo Limitado";
    }
  }

  if (!subheadline || subheadline.startsWith("Aproveite descontos especiais em produtos e serviços locais")) {
    if (quotedMatch) {
      subheadline = quotedMatch[1].trim();
    } else if (cleanedUserCopy.length > 15) {
      subheadline = cleanedUserCopy.slice(0, 180);
    } else if (isTravel) {
      subheadline =
        "Aproveite e garanta sua viagem com descontos exclusivos por tempo limitado. Pacotes completos com atendimento especializado.";
    } else {
      subheadline =
        "Condições preparadas sob medida com atendimento rápido e garantia completa para você aproveitar.";
    }
  }

  const ctaText =
    toolArgs.cta_label ||
    toolArgs.ctaText ||
    (/confira\s+as\s+ofertas?/i.test(lower)
      ? "Conferir Ofertas"
      : isTravel
        ? "Garantir Minha Viagem"
        : "Falar no WhatsApp");

  const archetype: CreativeArchetype = isLandscape
    ? "presentation"
    : isTravel
      ? "travel"
      : offerPrice
        ? "promo_offer"
        : "headline_lead";

  const themeId: CreativeThemeId =
    /all\s*-?\s*inclusive|luxo|ouro|premium|vip/i.test(lower)
      ? "gold"
      : isTravel
        ? "cobalt"
        : isFood || /oferta|desconto|rel[aâ]mpago/i.test(lower)
          ? "terracotta"
          : "emerald";

  const badge = isStory
    ? "Story Especial • 9:16"
    : isTravel
      ? "Viagens & Experiências"
      : "Destaque Especial";

  const offerBadge = /tempo\s+limitado/i.test(lower)
    ? "Por Tempo Limitado"
    : /all\s*-?\s*inclusive/i.test(lower)
      ? "All Inclusive"
      : "Oferta Exclusiva";

  const bullets = isTravel
    ? [
        /all\s*-?\s*inclusive/i.test(lower)
          ? "Experiência All Inclusive completa selecionada"
          : "Roteiro e hospedagem selecionados",
        offerPrice
          ? `Condição especial ${offerPrice} ${installments || "por pessoa"}`.trim()
          : "Descontos exclusivos por tempo limitado",
        "Assessoria completa antes, durante e pós-viagem",
      ]
    : [
        "Condições especiais por tempo limitado",
        "Atendimento consultivo e suporte imediato",
        "Qualidade garantida e confirmação rápida",
      ];

  const hashtags = isTravel
    ? ["#viagem", "#allinclusive", "#turismo", "#ofertasdeviagem", "#excelenciatour"]
    : ["#ofertas", "#destaque", "#negocioslocais", "#novidades"];

  return {
    title: headline.slice(0, 64),
    headline,
    subheadline,
    badge,
    offerBadge,
    offerPrice,
    installments,
    ctaText,
    format,
    aspectRatio,
    archetype,
    themeId,
    bullets,
    brandName,
    locationLabel: isTravel
      ? context.city
        ? `Saídas de ${context.city} & Região`
        : "Destinos Nacionais & Internacionais"
      : undefined,
    hashtags,
  };
}
