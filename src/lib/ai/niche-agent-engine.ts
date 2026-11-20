/**
 * niche-agent-engine.ts — Single Core Engine Multinicho para Agentes IA, Skills,
 * Sondagem Consultiva, Humanização, Detecção de Opt-Out e Cadência Anti-Vácuo.
 *
 * 100% agnóstico de vertical no núcleo; carrega presets especializados por nicho
 * (incluindo o pacote completo `src/lib/presets/turis/`).
 */

import {
  TURIS_AI_SKILLS_PRESETS,
  TURIS_FOLLOWUP_CADENCE_DEFAULTS,
  TURIS_SONDAGEM_4AS_PILLARS,
} from "@/lib/presets/turis";

export type CoreAgentSkillCategory = "triage" | "qualification" | "recovery" | "matchmaker" | "post_sale";

export interface CoreAgentSkill {
  slug: string;
  name: string;
  niche: string;
  category: CoreAgentSkillCategory;
  objective: string;
  systemPrompt: string;
  openingQuestions: string[];
  guardrails: string[];
  recommendedTools: string[];
}

export interface SondagemPillarState {
  key: string;
  label: string;
  hint: string;
  completed: boolean;
  extractedSnippet: string | null;
}

export interface SondagemChecklistResult {
  nicheId: string;
  pillars: SondagemPillarState[];
  completedCount: number;
  totalCount: number;
  completionPct: number;
  nextMissingPillar: SondagemPillarState | null;
}

export interface OptOutDetectionResult {
  isOptOut: boolean;
  matchedPhrase: string | null;
  confidence: "high" | "medium" | "none";
}

export interface FollowUpStepConfig {
  step: number;
  delayHours: number;
  stage: string;
  template: string;
}

const GENERIC_SONDAGEM_PILLARS: Record<
  string,
  ReadonlyArray<{ key: string; label: string; hint: string; patterns: ReadonlyArray<RegExp> }>
> = {
  tourism: TURIS_SONDAGEM_4AS_PILLARS,
  real_estate: [
    { key: "tipo", label: "Tipo e Objetivo", hint: "Compra ou locação, casa/apto/terreno", patterns: [/(comprar|alugar|loca[cç][aã]o|casa|apartamento|apto|terreno|sala comercial)/i] },
    { key: "regiao", label: "Bairro / Região", hint: "Localização de preferência", patterns: [/(centro|bairro|regi[aã]o|perto de|condom[ií]nio)/i] },
    { key: "perfil", label: "Quartos e Perfil", hint: "Quartos, suítes, garagem", patterns: [/(quartos?|su[ií]tes?|vagas?|garagem|pet|varanda)/i] },
    { key: "alvo", label: "Orçamento / Financiamento", hint: "Faixa de valor ou entrada/FGTS", patterns: [/(fgts|financia|entrada|mil|r\$|parcel|valor|or[cç]amento)/i] },
  ],
  gastronomy: [
    { key: "pedido", label: "Itens do Pedido", hint: "Pratos, bebidas ou reserva de mesa", patterns: [/(pizza|lanche|hamb[uú]rguer|mesa|reservar|card[aá]pio|combo|prato|bebida)/i] },
    { key: "modalidade", label: "Entrega ou Retirada", hint: "Delivery (endereço) ou balcão", patterns: [/(entrega|delivery|retirar|retirada|balc[aã]o|rua|bairro|endere[cç]o)/i] },
    { key: "pagamento", label: "Forma de Pagamento", hint: "Pix, cartão ou dinheiro/troco", patterns: [/(pix|cart[aã]o|cr[eé]dito|d[eé]bito|dinheiro|troco)/i] },
  ],
  events: [
    { key: "evento", label: "Evento / Data", hint: "Qual show, curso ou congresso", patterns: [/(ingresso|show|evento|lote|vip|camarote|pista|palestra|curso)/i] },
    { key: "quantidade", label: "Quantidade / Meia", hint: "Quantos ingressos e tipo", patterns: [/(meia|inteira|solid[aá]ri|\b[1-9]\s*(ingressos?|entradas?|pessoas?))/i] },
  ],
  legal: [
    { key: "area", label: "Área Jurídica", hint: "Trabalhista, cível, família, previdenciário, empresarial", patterns: [/(trabalhista|c[ií]vel|fam[ií]lia|div[oó]rcio|invent[aá]rio|aposentadoria|inss|contrato|processo|empresa)/i] },
    { key: "urgencia", label: "Prazo / Audiência", hint: "Existe intimação ou prazo correndo?", patterns: [/(prazo|audi[eê]ncia|intima[cç][aã]o|urgente|processo|notifica[cç][aã]o)/i] },
  ],
  default: [
    { key: "necessidade", label: "Necessidade Principal", hint: "Produto ou serviço buscado", patterns: [/(preciso|quero|procuro|or[cç]amento|pre[cç]o|valor|produto|servi[cç]o)/i] },
    { key: "prazo", label: "Prazo / Agenda", hint: "Quando pretende contratar/receber", patterns: [/(hoje|amanh[aã]|semana|m[eê]s|urgente|prazo|data|quando)/i] },
    { key: "orcamento", label: "Orçamento / Condição", hint: "Faixa de valor ou pagamento preferido", patterns: [/(pix|cart[aã]o|parcel|or[cç]amento|valor|reais|r\$)/i] },
  ],
};

const CORE_GENERIC_SKILLS: CoreAgentSkill[] = [
  {
    slug: "core_sdr_consultivo",
    name: "Core SDR — Atendimento Consultivo Multinicho",
    niche: "all",
    category: "triage",
    objective: "Ouvir o cliente, compreender contexto/anúncio de origem e conduzir qualificação com 1 pergunta aberta por turno.",
    systemPrompt: [
      "Você é o Consultor Comercial da empresa no Waesy Talk.",
      "Ouça mais e fale menos: responda em 2 a 4 linhas diretas, acolhedoras e humanas.",
      "Faça apenas 1 pergunta aberta e objetiva por turno para entender a necessidade real do cliente.",
      "Use o contexto do anúncio/origem quando disponível e respeite imediatamente qualquer pedido de cancelamento/opt-out.",
    ].join("\n"),
    openingQuestions: [
      "Olá! Vi seu interesse — me conta um pouquinho do que você está buscando para eu te ajudar da melhor forma?",
    ],
    guardrails: [
      "Nunca inventar preços ou prazos fora do catálogo/base de conhecimento.",
      "Transferir para humano sempre que o cliente pedir.",
    ],
    recommendedTools: ["check_order_status", "handoff_to_human"],
  },
  {
    slug: "core_followup_antivacuo",
    name: "Core Follow-Up — Recuperação Anti-Vácuo",
    niche: "all",
    category: "recovery",
    objective: "Retomar leads que receberam orçamento/proposta ou silenciaram, com break-up respeitoso.",
    systemPrompt: [
      "Você conduz acompanhamento gentil de propostas e orçamentos em aberto.",
      "Pergunte se a proposta fez sentido ou se precisa ajustar algum detalhe, sempre sem pressão.",
    ].join("\n"),
    openingQuestions: [
      "Oi! Passando só para confirmar se conseguiu ver o que te enviei ou se prefere ajustar alguma condição.",
    ],
    guardrails: ["Encerrar contato ao menor sinal de desinteresse/opt-out."],
    recommendedTools: ["handoff_to_human"],
  },
];

export function listSkillsForNiche(nicheId: string): CoreAgentSkill[] {
  const normalized = String(nicheId || "general").toLowerCase();
  if (normalized === "tourism" || normalized === "turis" || normalized === "travel") {
    return [...TURIS_AI_SKILLS_PRESETS, ...CORE_GENERIC_SKILLS];
  }
  return CORE_GENERIC_SKILLS;
}

export function resolveSkillForInboundContext(params: {
  nicheId: string;
  agentSlug?: string | null;
  intent: string;
  hasSentProposal: boolean;
  isPostSaleCustomer: boolean;
}): CoreAgentSkill {
  const skills = listSkillsForNiche(params.nicheId);
  if (params.agentSlug) {
    const exact = skills.find((s) => s.slug === params.agentSlug);
    if (exact) return exact;
  }

  const isTourism = ["tourism", "turis", "travel"].includes(String(params.nicheId || "").toLowerCase());
  if (isTourism) {
    if (params.isPostSaleCustomer || params.intent === "support_issue") {
      return TURIS_AI_SKILLS_PRESETS.find((s) => s.slug === "turis_pos_venda_anti_ansiedade") || TURIS_AI_SKILLS_PRESETS[0];
    }
    if (params.hasSentProposal) {
      return TURIS_AI_SKILLS_PRESETS.find((s) => s.slug === "turis_recuperacao_curiosidade") || TURIS_AI_SKILLS_PRESETS[0];
    }
    if (params.intent === "quote_request") {
      return TURIS_AI_SKILLS_PRESETS.find((s) => s.slug === "turis_sondagem_4as") || TURIS_AI_SKILLS_PRESETS[0];
    }
    return TURIS_AI_SKILLS_PRESETS[0];
  }

  if (params.hasSentProposal) {
    return CORE_GENERIC_SKILLS[1];
  }
  return CORE_GENERIC_SKILLS[0];
}

/**
 * Detecta explicitamente pedidos de Opt-Out / Desinteresse em continuar recebendo mensagens.
 * Evita falsos positivos em frases normais de qualificação ("não sei a data ainda", "não quero hotel caro").
 */
export function detectWhatsAppOptOut(rawText: string): OptOutDetectionResult {
  const text = String(rawText || "").trim();
  if (!text) return { isOptOut: false, matchedPhrase: null, confidence: "none" };

  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Comandos curtos exatos de saída
  if (/^(sair|stop|parar|cancelar cadastro|descadastrar|remover|bloquear|unsubscribe)[!.\s]*$/i.test(normalized)) {
    return { isOptOut: true, matchedPhrase: normalized, confidence: "high" };
  }

  const highConfidencePatterns: RegExp[] = [
    /\b(nao|n)\s+(quero|desejo|preciso|tenho interesse)\s+(mais\s+)?(receber|mensagen|proposta|contato|oferta|novidade|viajar|fazer viagem)/i,
    /\bpare\s+de\s+(me\s+)?(mandar|enviar|chamar|incomodar|escrever)/i,
    /\bpara\s+de\s+(me\s+)?(mandar|enviar|chamar|incomodar)/i,
    /\b(remova|remover|tire|tirar|exclua|excluir)\s+(meu\s+)?(numero|contato|whatsapp|da\s+lista)/i,
    /\bnao\s+me\s+(mande|envie|chame|procure|incomode)\s+mais\b/i,
    /\b(obrigad[oa]|agradeco)\b.*\b(nao\s+(quero|tenho\s+interesse|vou\s+viajar|preciso\s+mais))\b/i,
    /\bdesisti\s+(da\s+viagem|de\s+viajar|da\s+compra|do\s+orcamento)\b/i,
    /\bnao\s+tenho\s+mais\s+interesse\b/i,
  ];

  for (const pattern of highConfidencePatterns) {
    const m = normalized.match(pattern);
    if (m) {
      return { isOptOut: true, matchedPhrase: m[0], confidence: "high" };
    }
  }

  return { isOptOut: false, matchedPhrase: null, confidence: "none" };
}

/**
 * Avalia os pilares da Sondagem Consultiva (4 As no Turismo ou equivalente do nicho)
 * mesclando o histórico já persistido com o texto novo do cliente.
 */
export function evaluateSondagemChecklist(params: {
  nicheId: string;
  transcriptText: string;
  existingChecklist?: Record<string, { completed?: boolean; snippet?: string | null }> | null;
}): SondagemChecklistResult {
  const nicheKey = ["tourism", "turis", "travel"].includes(String(params.nicheId || "").toLowerCase())
    ? "tourism"
    : GENERIC_SONDAGEM_PILLARS[params.nicheId]
      ? params.nicheId
      : "default";

  const definitions = GENERIC_SONDAGEM_PILLARS[nicheKey] || GENERIC_SONDAGEM_PILLARS.default;
  const text = String(params.transcriptText || "");
  const existing = params.existingChecklist || {};

  const pillars: SondagemPillarState[] = definitions.map((def) => {
    const prev = existing[def.key];
    let matchedSnippet: string | null = prev?.snippet ?? null;
    let completed = Boolean(prev?.completed);

    if (!completed && text) {
      for (const rx of def.patterns) {
        const match = text.match(rx);
        if (match) {
          completed = true;
          const idx = match.index ?? 0;
          matchedSnippet = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + 60)).trim();
          break;
        }
      }
    }

    return {
      key: def.key,
      label: def.label,
      hint: def.hint,
      completed,
      extractedSnippet: matchedSnippet,
    };
  });

  const completedCount = pillars.filter((p) => p.completed).length;
  const totalCount = pillars.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextMissingPillar = pillars.find((p) => !p.completed) || null;

  return {
    nicheId: nicheKey,
    pillars,
    completedCount,
    totalCount,
    completionPct,
    nextMissingPillar,
  };
}

/**
 * Fragmenta uma resposta longa de IA em 1 a 3 mensagens humanas e naturais para WhatsApp
 * (evitando "paredes de texto" robóticas).
 */
export function splitReplyIntoHumanChunks(rawText: string, maxChunkChars = 320, maxChunks = 3): string[] {
  const clean = String(rawText || "").trim();
  if (!clean) return [];
  if (clean.length <= maxChunkChars) return [clean];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  for (const para of paragraphs) {
    if (!buffer) {
      buffer = para;
      continue;
    }
    if ((buffer.length + para.length + 2) <= maxChunkChars) {
      buffer = `${buffer}\n\n${para}`;
    } else {
      chunks.push(buffer);
      buffer = para;
    }
  }
  if (buffer) chunks.push(buffer);

  // Se ainda houver apenas 1 bloco gigante sem quebras de parágrafo, divide por frase
  if (chunks.length === 1 && chunks[0].length > maxChunkChars) {
    const sentences = chunks[0].match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [chunks[0]];
    const sentenceChunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if (!current) {
        current = trimmed;
      } else if ((current.length + trimmed.length + 1) <= maxChunkChars) {
        current = `${current} ${trimmed}`;
      } else {
        sentenceChunks.push(current);
        current = trimmed;
      }
    }
    if (current) sentenceChunks.push(current);
    return sentenceChunks.slice(0, maxChunks);
  }

  if (chunks.length > maxChunks) {
    const head = chunks.slice(0, maxChunks - 1);
    const tail = chunks.slice(maxChunks - 1).join("\n\n");
    return [...head, tail];
  }

  return chunks;
}

/**
 * Calcula tempo humano realista de digitação em ms (entre 1200ms e 4500ms).
 */
export function computeHumanTypingDelayMs(chunkText: string): number {
  const len = String(chunkText || "").trim().length;
  return Math.min(4500, Math.max(1200, Math.round(len * 24)));
}

export function getDefaultFollowUpCadenceForNiche(nicheId: string): FollowUpStepConfig[] {
  if (["tourism", "turis", "travel"].includes(String(nicheId || "").toLowerCase())) {
    return TURIS_FOLLOWUP_CADENCE_DEFAULTS.map((c) => ({ ...c }));
  }
  return [
    {
      step: 1,
      delayHours: 2,
      stage: "proposal_sent",
      template: "Oi {{nome}}! Conseguiu dar uma olhada no que te enviei? Se precisar ajustar algum detalhe, estou por aqui.",
    },
    {
      step: 2,
      delayHours: 24,
      stage: "proposal_sent",
      template: "Oi {{nome}}, tudo bem? Só passando para saber se faz sentido avançarmos ou se ficou alguma dúvida.",
    },
    {
      step: 3,
      delayHours: 72,
      stage: "no_reply_breakup",
      template: "Oi {{nome}}! Vou encerrar o acompanhamento por aqui para não incomodar. Quando precisar, é só me chamar!",
    },
  ];
}
