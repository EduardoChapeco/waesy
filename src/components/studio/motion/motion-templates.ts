export type MotionStudioRatio = "9:16" | "1:1" | "16:9";

export type MotionStudioFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "color"
  | "boolean"
  | "select"
  | "asset";

export type MotionStudioFieldGroup = "Setup" | "Copy" | "Timing" | "Look" | "Assets";

export type MotionStudioFieldOption = {
  label: string;
  value: string;
};

export type MotionStudioFieldDefinition = {
  id: string;
  label: string;
  kind: MotionStudioFieldKind;
  group: MotionStudioFieldGroup;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  options?: MotionStudioFieldOption[];
  assetKinds?: string[];
};

export type MotionStudioSequenceKind =
  | "badge"
  | "hook"
  | "statement"
  | "proof"
  | "quote"
  | "feature"
  | "cta";

export type MotionStudioSequence = {
  id: string;
  label: string;
  kind: MotionStudioSequenceKind;
  startFrame: number;
  durationInFrames: number;
  track: number;
  eyebrow?: string;
  headline?: string;
  body?: string;
  accentText?: string;
  ctaLabel?: string;
};

export type MotionStudioGuardrailIssue = {
  level: "error" | "warning";
  label: string;
  message: string;
  fieldId?: string;
};

export type MotionStudioCommandPatch = {
  summary: string;
  changes: string[];
  nextValues: Record<string, unknown>;
};

export type MotionStudioTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  supportedRatios: MotionStudioRatio[];
  fps: number;
  defaultValues: Record<string, unknown>;
  guardrailNotes: string[];
  fieldDefinitions: MotionStudioFieldDefinition[];
  buildPrompt: (values: Record<string, unknown>) => string;
  buildSequences: (values: Record<string, unknown>) => MotionStudioSequence[];
  validate: (values: Record<string, unknown>) => MotionStudioGuardrailIssue[];
};

export const ratioOptions: MotionStudioFieldOption[] = [
  { label: "9:16 (Stories / Reels)", value: "9:16" },
  { label: "1:1 (Quadrado / Feed)", value: "1:1" },
  { label: "16:9 (Horizontal / Display)", value: "16:9" },
];

export const backgroundModeOptions: MotionStudioFieldOption[] = [
  { label: "Gradiente Dinâmico", value: "gradient" },
  { label: "Mídia do Catálogo", value: "asset" },
];

const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const asRatio = (value: unknown, fallback: MotionStudioRatio): MotionStudioRatio => {
  if (value === "9:16" || value === "1:1" || value === "16:9") return value;
  return fallback;
};

const commonSetupFields: MotionStudioFieldDefinition[] = [
  {
    id: "ratio",
    label: "Proporção (Aspect Ratio)",
    kind: "select",
    group: "Setup",
    options: ratioOptions,
    description: "Proporção do canvas para o preview nativo e renderização.",
  },
  {
    id: "backgroundMode",
    label: "Modo de Fundo",
    kind: "select",
    group: "Assets",
    options: backgroundModeOptions,
    description: "Gradiente procedural ou vídeo/imagem de fundo do catálogo.",
  },
  {
    id: "backgroundAssetId",
    label: "Mídia de Fundo",
    kind: "asset",
    group: "Assets",
    assetKinds: ["video", "image"],
    description: "URL ou asset do catálogo para plano de fundo animado.",
  },
];

const validateCopyLength = (
  value: string,
  limit: number,
  label: string,
  fieldId: string,
): MotionStudioGuardrailIssue | null => {
  if (value.trim().length <= limit) return null;
  return {
    level: "warning",
    label,
    fieldId,
    message: `${label} ultrapassou ${limit} caracteres e pode perder legibilidade no vídeo.`,
  };
};

const validateRequiredText = (
  value: string,
  label: string,
  fieldId: string,
): MotionStudioGuardrailIssue | null => {
  if (value.trim()) return null;
  return {
    level: "error",
    label,
    fieldId,
    message: `${label} é obrigatório antes de exportar este vídeo.`,
  };
};

const validateBackgroundSelection = (values: Record<string, unknown>) => {
  if (asString(values.backgroundMode, "gradient") !== "asset") return null;
  if (asString(values.backgroundAssetId)) return null;
  return {
    level: "error",
    label: "Mídia de Fundo",
    fieldId: "backgroundAssetId",
    message: "Modo de mídia requer uma foto ou clipe de fundo selecionado.",
  } satisfies MotionStudioGuardrailIssue;
};

const validateDurationRange = (
  values: Record<string, unknown>,
  min: number,
  max: number,
): MotionStudioGuardrailIssue | null => {
  const duration = asNumber(values.durationFrames, min);
  if (duration >= min && duration <= max) return null;
  return {
    level: "error",
    label: "Duração",
    fieldId: "durationFrames",
    message: `A duração precisa permanecer entre ${min} e ${max} frames (${(min / 30).toFixed(1)}s - ${(max / 30).toFixed(1)}s).`,
  };
};

// 1. Launch Burst Sequences
const buildLaunchBurstSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 180), 120, 360);
  const hook = clamp(asNumber(values.hookFrames, 42), 24, duration - 72);
  const cta = clamp(asNumber(values.ctaFrames, 36), 24, duration - hook - 24);
  const remainder = Math.max(duration - hook - cta, 36);
  const statement = Math.round(remainder * 0.58);
  const proof = Math.max(remainder - statement, 18);
  const headline = asString(values.headline);
  const body = asString(values.supportingText);
  const ctaLabel = asString(values.ctaText, "Compre Agora");

  return [
    {
      id: "badge",
      label: "Selo de Destaque",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: asString(values.eyebrow, "Lançamento Oficial"),
      accentText: asString(values.proofText, "Oferta Limitada"),
    },
    {
      id: "hook",
      label: "Gancho Visual (Hook)",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      eyebrow: asString(values.eyebrow, "Imperdível"),
      headline,
      body,
    },
    {
      id: "statement",
      label: "Declaração Central",
      kind: "statement",
      startFrame: hook,
      durationInFrames: statement,
      track: 0,
      headline,
      body,
      accentText: asString(values.proofText, "Qualidade Garantida"),
    },
    {
      id: "proof",
      label: "Ponto de Prova",
      kind: "proof",
      startFrame: hook + statement,
      durationInFrames: proof,
      track: 0,
      headline: asString(values.proofText, "Prova Social"),
      body,
      accentText: "Entrega Expressa",
    },
    {
      id: "cta",
      label: "Chamada para Ação (CTA)",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline,
      body,
      ctaLabel,
    },
  ];
};

// 2. Proof Stack Sequences
const buildProofStackSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 210), 150, 420);
  const hook = clamp(asNumber(values.hookFrames, 36), 24, duration - 96);
  const proof = clamp(asNumber(values.proofFrames, 42), 24, duration - hook - 48);
  const cta = clamp(asNumber(values.ctaFrames, 36), 24, duration - hook - proof - 24);
  const middle = Math.max(duration - hook - proof - cta, 24);
  const featureA = Math.round(middle * 0.5);
  const featureB = Math.max(middle - featureA, 12);
  const bullets = [asString(values.bulletOne), asString(values.bulletTwo), asString(values.bulletThree)]
    .filter(Boolean)
    .join(" • ");

  return [
    {
      id: "badge",
      label: "Selo de Métrica",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: "Validação Real",
      accentText: asString(values.proofMetric, "4.9 ★"),
    },
    {
      id: "hook",
      label: "Gancho (Hook)",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
    },
    {
      id: "feature-a",
      label: "Diferencial 1",
      kind: "feature",
      startFrame: hook,
      durationInFrames: featureA,
      track: 0,
      headline: asString(values.bulletOne, "Primeiro benefício"),
      body: bullets,
    },
    {
      id: "feature-b",
      label: "Diferencial 2",
      kind: "feature",
      startFrame: hook + featureA,
      durationInFrames: featureB,
      track: 0,
      headline: asString(values.bulletTwo, "Segundo benefício"),
      body: asString(values.bulletThree, bullets),
    },
    {
      id: "proof",
      label: "Métrica em Destaque",
      kind: "proof",
      startFrame: hook + featureA + featureB,
      durationInFrames: proof,
      track: 0,
      headline: asString(values.proofMetric, "4.9 ★"),
      body: asString(values.proofLabel, "Avaliado por mais de 500 clientes"),
      accentText: asString(values.supportingText),
    },
    {
      id: "cta",
      label: "Fechamento CTA",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      ctaLabel: asString(values.ctaText, "Ver Catálogo"),
    },
  ];
};

// 3. Founder / Brand Note Sequences
const buildFounderNoteSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 195), 150, 360);
  const hook = clamp(asNumber(values.hookFrames, 30), 20, duration - 108);
  const quoteFrames = clamp(asNumber(values.quoteFrames, 78), 48, duration - hook - 48);
  const cta = clamp(asNumber(values.ctaFrames, 30), 24, duration - hook - quoteFrames - 18);
  const statement = Math.max(duration - hook - quoteFrames - cta, 18);

  return [
    {
      id: "badge",
      label: "Crédito da Marca",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: asString(values.authorName, "Fundador"),
      accentText: asString(values.authorRole, "Manifesto"),
    },
    {
      id: "hook",
      label: "Gancho (Hook)",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
    },
    {
      id: "quote",
      label: "Citação / Depoimento",
      kind: "quote",
      startFrame: hook,
      durationInFrames: quoteFrames,
      track: 0,
      headline: asString(values.quoteText),
      body: `${asString(values.authorName, "Fundador")} • ${asString(values.authorRole, "Direção de Criação")}`,
    },
    {
      id: "statement",
      label: "Posicionamento",
      kind: "statement",
      startFrame: hook + quoteFrames,
      durationInFrames: statement,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      accentText: asBoolean(values.captionsEnabled, true) ? "Com Legendas" : "Layout Limpo",
    },
    {
      id: "cta",
      label: "CTA Final",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.supportingText),
      ctaLabel: asString(values.ctaText, "Descubra Nossa História"),
    },
  ];
};

// 4. Product Spotlight (E-commerce Promo)
const buildProductSpotlightSequences = (values: Record<string, unknown>): MotionStudioSequence[] => {
  const duration = clamp(asNumber(values.durationFrames, 180), 120, 300);
  const hook = clamp(asNumber(values.hookFrames, 36), 24, duration - 72);
  const cta = clamp(asNumber(values.ctaFrames, 36), 24, duration - hook - 24);
  const remainder = duration - hook - cta;
  const priceReveal = Math.round(remainder * 0.6);
  const benefits = Math.max(remainder - priceReveal, 18);

  return [
    {
      id: "badge",
      label: "Selo Preço Promocional",
      kind: "badge",
      startFrame: 0,
      durationInFrames: duration,
      track: 1,
      eyebrow: asString(values.badgeText, "Super Oferta"),
      accentText: asString(values.priceTag, "R$ 99,90"),
    },
    {
      id: "hook",
      label: "Apresentação do Produto",
      kind: "hook",
      startFrame: 0,
      durationInFrames: hook,
      track: 0,
      headline: asString(values.headline, "Destaque da Semana"),
      body: asString(values.supportingText),
    },
    {
      id: "statement",
      label: "Condição Especial",
      kind: "statement",
      startFrame: hook,
      durationInFrames: priceReveal,
      track: 0,
      headline: asString(values.priceTag, "R$ 99,90"),
      body: asString(values.installmentText, "Em até 6x sem juros no carnê"),
      accentText: asString(values.discountBadge, "25% OFF"),
    },
    {
      id: "proof",
      label: "Pronta Entrega",
      kind: "proof",
      startFrame: hook + priceReveal,
      durationInFrames: benefits,
      track: 0,
      headline: "Estoque Limitado",
      body: asString(values.deliveryText, "Envio rápido para toda a região"),
      accentText: "Garantia Total",
    },
    {
      id: "cta",
      label: "Garantir Pedido",
      kind: "cta",
      startFrame: duration - cta,
      durationInFrames: cta,
      track: 0,
      headline: asString(values.headline),
      body: asString(values.installmentText),
      ctaLabel: asString(values.ctaText, "Comprar no WhatsApp / App"),
    },
  ];
};

export const MOTION_STUDIO_TEMPLATES: MotionStudioTemplateDefinition[] = [
  {
    id: "launch-burst",
    label: "Launch Burst",
    description: "Corte de alta energia: gancho incisivo, prova social e CTA imediato para lançamentos.",
    accentColor: "#F97316",
    supportedRatios: ["9:16", "1:1", "16:9"],
    fps: 30,
    defaultValues: {
      ratio: "9:16",
      durationFrames: 180,
      hookFrames: 42,
      ctaFrames: 36,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      logoAssetId: "",
      showLogo: true,
      eyebrow: "Exclusivo Waesy",
      headline: "A novidade que você esperava chegou.",
      supportingText: "Design refinado, conforto absoluto e condições exclusivas de lançamento.",
      proofText: "Alta Demanda • Poucas Peças",
      ctaText: "Pedir Agora",
      accentColor: "#F97316",
    },
    guardrailNotes: [
      "Mantenha o gancho abaixo de 48 frames para evitar rejeição no feed.",
      "Prefira uma frase curta e impactante na chamada principal.",
      "Ative o modo mídia quando possuir uma boa foto ou clipe do produto.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Título Principal", kind: "textarea", group: "Copy", required: true },
      { id: "supportingText", label: "Texto de Apoio", kind: "textarea", group: "Copy", required: true },
      { id: "proofText", label: "Texto de Prova / Alerta", kind: "text", group: "Copy" },
      { id: "ctaText", label: "Texto do Botão CTA", kind: "text", group: "Copy", required: true },
      { id: "showLogo", label: "Exibir Logo da Loja", kind: "boolean", group: "Assets" },
      { id: "durationFrames", label: "Duração Total (Frames)", kind: "number", group: "Timing", min: 120, max: 360, step: 6 },
      { id: "hookFrames", label: "Duração do Gancho (Frames)", kind: "number", group: "Timing", min: 24, max: 84, step: 6 },
      { id: "ctaFrames", label: "Duração do CTA (Frames)", kind: "number", group: "Timing", min: 24, max: 72, step: 6 },
      { id: "accentColor", label: "Cor de Destaque", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Launch Burst | ${asString(values.headline)} | ${asString(values.supportingText)} | ${asString(values.proofText)}`,
    buildSequences: buildLaunchBurstSequences,
    validate: (values) => {
      const issues = [
        validateRequiredText(asString(values.headline), "Título Principal", "headline"),
        validateRequiredText(asString(values.supportingText), "Texto de Apoio", "supportingText"),
        validateRequiredText(asString(values.ctaText), "Texto do Botão", "ctaText"),
        validateBackgroundSelection(values),
        validateDurationRange(values, 120, 360),
        validateCopyLength(asString(values.headline), 72, "Título Principal", "headline"),
        validateCopyLength(asString(values.supportingText), 180, "Texto de Apoio", "supportingText"),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];
      return issues;
    },
  },
  {
    id: "product-spotlight",
    label: "Vitrine de Oferta",
    description: "Foco comercial com preço destacado, condições de parcelamento e chamada direta de compra.",
    accentColor: "#10B981",
    supportedRatios: ["9:16", "1:1", "16:9"],
    fps: 30,
    defaultValues: {
      ratio: "9:16",
      durationFrames: 180,
      hookFrames: 36,
      ctaFrames: 36,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      badgeText: "Super Oferta",
      priceTag: "R$ 149,90",
      discountBadge: "30% OFF",
      headline: "Coleção Verão 2026",
      supportingText: "Peças selecionadas com corte impecável e durabilidade garantida.",
      installmentText: "Em até 6x no Cartão ou Carnê Digital",
      deliveryText: "Entrega grátis na sua cidade",
      ctaText: "Comprar Agora",
      accentColor: "#10B981",
    },
    guardrailNotes: [
      "Valores com centavos e desconto convertem até 40% mais rápido.",
      "Destaque opções de parcelamento no texto secundário.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Nome do Produto / Oferta", kind: "textarea", group: "Copy", required: true },
      { id: "priceTag", label: "Preço em Destaque", kind: "text", group: "Copy", required: true },
      { id: "discountBadge", label: "Etiqueta de Desconto", kind: "text", group: "Copy" },
      { id: "installmentText", label: "Condição de Pagamento", kind: "text", group: "Copy" },
      { id: "supportingText", label: "Descrição Resumida", kind: "textarea", group: "Copy", required: true },
      { id: "ctaText", label: "Ação de Compra", kind: "text", group: "Copy", required: true },
      { id: "durationFrames", label: "Duração (Frames)", kind: "number", group: "Timing", min: 120, max: 300, step: 6 },
      { id: "accentColor", label: "Cor de Destaque", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Vitrine | ${asString(values.headline)} | ${asString(values.priceTag)} | ${asString(values.installmentText)}`,
    buildSequences: buildProductSpotlightSequences,
    validate: (values) => {
      return [
        validateRequiredText(asString(values.headline), "Nome do Produto", "headline"),
        validateRequiredText(asString(values.priceTag), "Preço", "priceTag"),
        validateRequiredText(asString(values.ctaText), "Texto de Ação", "ctaText"),
        validateBackgroundSelection(values),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];
    },
  },
  {
    id: "proof-stack",
    label: "Proof Stack (Métricas e Avaliação)",
    description: "Apresenta métricas sólidas, diferenciais em tópicos e validação social antes do fechamento.",
    accentColor: "#0EA5E9",
    supportedRatios: ["1:1", "16:9", "9:16"],
    fps: 30,
    defaultValues: {
      ratio: "1:1",
      durationFrames: 210,
      hookFrames: 36,
      proofFrames: 42,
      ctaFrames: 36,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      headline: "Mais de 1.200 clientes recomendam.",
      supportingText: "Confira por que somos a loja mais bem avaliada de São Miguel do Oeste.",
      proofMetric: "4.9 ★",
      proofLabel: "Satisfação máxima verificada",
      bulletOne: "Atendimento humanizado e sem robôs",
      bulletTwo: "Garantia incondicional de 30 dias",
      bulletThree: "Envio no mesmo dia para compras até às 14h",
      ctaText: "Ver Depoimentos & Loja",
      accentColor: "#0EA5E9",
    },
    guardrailNotes: [
      "Métricas numéricas curtas geram impacto visual instantâneo.",
      "Mantenha cada tópico em uma única linha sucinta.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Título de Impacto", kind: "textarea", group: "Copy", required: true },
      { id: "supportingText", label: "Texto Explicativo", kind: "textarea", group: "Copy", required: true },
      { id: "proofMetric", label: "Métrica (ex: 4.9 ★)", kind: "text", group: "Copy", required: true },
      { id: "proofLabel", label: "Descrição da Métrica", kind: "text", group: "Copy", required: true },
      { id: "bulletOne", label: "Diferencial 1", kind: "text", group: "Copy", required: true },
      { id: "bulletTwo", label: "Diferencial 2", kind: "text", group: "Copy" },
      { id: "bulletThree", label: "Diferencial 3", kind: "text", group: "Copy" },
      { id: "ctaText", label: "Botão CTA", kind: "text", group: "Copy", required: true },
      { id: "durationFrames", label: "Duração Total (Frames)", kind: "number", group: "Timing", min: 150, max: 420, step: 6 },
      { id: "accentColor", label: "Cor de Destaque", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Proof Stack | ${asString(values.headline)} | ${asString(values.proofMetric)} ${asString(values.proofLabel)}`,
    buildSequences: buildProofStackSequences,
    validate: (values) => {
      return [
        validateRequiredText(asString(values.headline), "Título", "headline"),
        validateRequiredText(asString(values.supportingText), "Texto Explicativo", "supportingText"),
        validateRequiredText(asString(values.proofMetric), "Métrica", "proofMetric"),
        validateRequiredText(asString(values.bulletOne), "Diferencial 1", "bulletOne"),
        validateRequiredText(asString(values.ctaText), "Texto do Botão", "ctaText"),
        validateBackgroundSelection(values),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];
    },
  },
  {
    id: "founder-note",
    label: "Manifesto e Depoimento",
    description: "Citação inspiradora, história de marca e propósito para gerar conexão emocional com o cliente.",
    accentColor: "#A855F7",
    supportedRatios: ["9:16", "16:9", "1:1"],
    fps: 30,
    defaultValues: {
      ratio: "9:16",
      durationFrames: 195,
      hookFrames: 30,
      quoteFrames: 78,
      ctaFrames: 30,
      backgroundMode: "gradient",
      backgroundAssetId: "",
      headline: "Feito à mão para quem valoriza a essência.",
      supportingText: "Não vendemos apenas produtos; entregamos uma experiência única em cada detalhe.",
      quoteText: "Quando você compra de quem produz com paixão, você apoia sonhos reais.",
      authorName: "Equipe Criativa",
      authorRole: "Fundadores Waesy",
      ctaText: "Descubra Nossa História",
      captionsEnabled: true,
      accentColor: "#A855F7",
    },
    guardrailNotes: [
      "Mantenha citações com no máximo 120 caracteres para conforto na leitura.",
      "Reserve tempo suficiente para que o cliente assimile a mensagem.",
    ],
    fieldDefinitions: [
      ...commonSetupFields,
      { id: "headline", label: "Título do Manifesto", kind: "textarea", group: "Copy", required: true },
      { id: "quoteText", label: "Frase de Impacto / Citação", kind: "textarea", group: "Copy", required: true },
      { id: "authorName", label: "Nome do Autor / Loja", kind: "text", group: "Copy", required: true },
      { id: "authorRole", label: "Papel / Cargo", kind: "text", group: "Copy" },
      { id: "supportingText", label: "Texto Complementar", kind: "textarea", group: "Copy", required: true },
      { id: "ctaText", label: "Botão CTA", kind: "text", group: "Copy", required: true },
      { id: "captionsEnabled", label: "Faixa de Legenda Ativa", kind: "boolean", group: "Look" },
      { id: "durationFrames", label: "Duração (Frames)", kind: "number", group: "Timing", min: 150, max: 360, step: 6 },
      { id: "accentColor", label: "Cor de Destaque", kind: "color", group: "Look" },
    ],
    buildPrompt: (values) =>
      `Founder Note | ${asString(values.headline)} | ${asString(values.quoteText)} | ${asString(values.authorName)}`,
    buildSequences: buildFounderNoteSequences,
    validate: (values) => {
      return [
        validateRequiredText(asString(values.headline), "Título", "headline"),
        validateRequiredText(asString(values.quoteText), "Citação", "quoteText"),
        validateRequiredText(asString(values.authorName), "Autor", "authorName"),
        validateRequiredText(asString(values.ctaText), "Texto do Botão", "ctaText"),
        validateBackgroundSelection(values),
      ].filter(Boolean) as MotionStudioGuardrailIssue[];
    },
  },
];

export const MOTION_STUDIO_RATIO_DIMENSIONS: Record<MotionStudioRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export const getMotionStudioTemplate = (templateId: string) =>
  MOTION_STUDIO_TEMPLATES.find((template) => template.id === templateId) || MOTION_STUDIO_TEMPLATES[0];

export const createMotionStudioValues = (templateId: string) => {
  const template = getMotionStudioTemplate(templateId);
  return JSON.parse(JSON.stringify(template.defaultValues)) as Record<string, unknown>;
};

export const getMotionStudioPlayerConfig = (templateId: string, values: Record<string, unknown>) => {
  const template = getMotionStudioTemplate(templateId);
  const ratio = asRatio(values.ratio, template.supportedRatios[0]);
  const dimensions = MOTION_STUDIO_RATIO_DIMENSIONS[ratio];
  const durationInFrames = clamp(asNumber(values.durationFrames, 180), 90, 600);

  return {
    ratio,
    width: dimensions.width,
    height: dimensions.height,
    fps: template.fps,
    durationInFrames,
  };
};

export const draftMotionStudioCommandPatch = (
  templateId: string,
  values: Record<string, unknown>,
  command: string,
): MotionStudioCommandPatch | null => {
  const normalized = command.trim().toLowerCase();
  if (!normalized) return null;

  const nextValues = { ...values };
  const changes: string[] = [];

  const applyDurationDelta = (delta: number) => {
    const current = asNumber(nextValues.durationFrames, 180);
    nextValues.durationFrames = clamp(current + delta, 90, 600);
    changes.push(delta > 0 ? `Estendeu duração em ${delta} frames.` : `Encurtou duração em ${Math.abs(delta)} frames.`);
  };

  if (normalized.includes("faster") || normalized.includes("mais rapido") || normalized.includes("mais rapida")) {
    applyDurationDelta(-24);
  }

  if (normalized.includes("slower") || normalized.includes("mais lento") || normalized.includes("mais longa")) {
    applyDurationDelta(24);
  }

  const ratioMatch = normalized.match(/\b(9:16|1:1|16:9)\b/);
  if (ratioMatch) {
    nextValues.ratio = ratioMatch[1];
    changes.push(`Alterou proporção para ${ratioMatch[1]}.`);
  }

  const headlineMatch = command.match(/headline\s*:\s*(.+)$/i) || command.match(/titulo\s*:\s*(.+)$/i);
  if (headlineMatch?.[1]) {
    nextValues.headline = headlineMatch[1].trim();
    changes.push("Atualizou título principal.");
  }

  const ctaMatch = command.match(/cta\s*:\s*(.+)$/i) || command.match(/botao\s*:\s*(.+)$/i);
  if (ctaMatch?.[1]) {
    nextValues.ctaText = ctaMatch[1].trim();
    changes.push("Atualizou texto do botão CTA.");
  }

  const accentMap: Record<string, string> = {
    laranja: "#F97316",
    orange: "#F97316",
    verde: "#10B981",
    emerald: "#10B981",
    azul: "#0EA5E9",
    sky: "#0EA5E9",
    roxo: "#A855F7",
    violet: "#8B5CF6",
    vermelho: "#EF4444",
    rose: "#F43F5E",
    dourado: "#F59E0B",
    amber: "#F59E0B",
  };

  const accentKey = Object.keys(accentMap).find((key) => normalized.includes(key));
  if (accentKey) {
    nextValues.accentColor = accentMap[accentKey];
    changes.push(`Alterou cor de destaque para ${accentKey}.`);
  }

  if (changes.length === 0) return null;

  return {
    summary: "Patch aplicado com sucesso via barra de comando inteligente.",
    changes,
    nextValues,
  };
};
