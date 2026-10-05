import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { executeAiCoreGateway, AITaskType } from "./ai-core-gateway.functions";

// ============================================================
// Schemas e Tipos do Contrato Canônico de Skill (ia/03-skills.md)
// ============================================================

export interface SkillItemDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  trigger_explicit: string;
  when_not_to_use?: string;
  category: string;
  niche?: string;
  icon: string;
  estimated_cost_usd: number;
  is_enabled: boolean;
  priority: number;
}

export interface SkillResolutionResult {
  primarySkill: SkillItemDTO | null;
  pipelineChain: SkillItemDTO[];
  confidenceScore: number;
  selectionReason: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
}

// 10 Skills Canônicas Pré-Configuradas no Sistema
export const CANONICAL_SKILLS_DEFINITIONS: Record<string, {
  task: AITaskType;
  systemPrompt: string;
  numberedProcedure: string[];
  hardRules: string[];
  definitionOfDone: string;
}> = {
  commercial_proposal: {
    task: "geracao_texto",
    systemPrompt: "Você é um consultor comercial executivo. Redija propostas comerciais elegantes, claras, com escopo detalhado, cronograma de marcos e valores transparentes. Siga tom profissional e direto.",
    numberedProcedure: [
      "1. Analise o contexto e a necessidade do cliente.",
      "2. Defina o objetivo do projeto e os entregáveis principais.",
      "3. Estruture o cronograma estimado por etapas.",
      "4. Formate a tabela de investimentos e condições de pagamento.",
      "5. Inclua cláusula de validade da proposta e próximos passos."
    ],
    hardRules: [
      "Nunca prometa prazos irrealistas sem ressalvas.",
      "Sempre expresse valores monetários em formato BRL (R$) ou moeda indicada.",
      "Não invente custos adicionais que não constem nas entradas."
    ],
    definitionOfDone: "Proposta pronta para envio com cabeçalho, escopo, cronograma, investimento e aceite."
  },
  receipt_organizer: {
    task: "extracao",
    systemPrompt: "Você é um auditor financeiro. Extraia com precisão máxima todos os campos fiscais do documento: data de emissão, beneficiário/emissor, CNPJ/CPF, valor total, categoria de despesa e código de autenticação.",
    numberedProcedure: [
      "1. Identifique o tipo de comprovante (PIX, Cupom Fiscal, Boleto, Fatura).",
      "2. Extraia o valor numérico exato e a data de liquidação.",
      "3. Capture os dados do emissor e recebedor.",
      "4. Valide a coerência dos dados e categorize a despesa."
    ],
    hardRules: [
      "Retorne dados estruturados em JSON estrito.",
      "Se algum campo estiver ilegível, marque explicitamente como 'não_identificado' em vez de inventar.",
      "Não arredonde centavos."
    ],
    definitionOfDone: "JSON válido com todos os metadados fiscais extraídos e categorizados."
  },
  lead_qualifier_sdr: {
    task: "classificacao",
    systemPrompt: "Você é um SDR experiente em qualificação rápida BANT (Budget, Authority, Need, Timeline). Avalie o lead com nota de 1 a 100 e classifique entre Quente, Morno ou Frio.",
    numberedProcedure: [
      "1. Leia a mensagem do lead e extraia o problema principal.",
      "2. Avalie urgência temporal e poder de decisão.",
      "3. Calcule o score BANT de 0 a 100.",
      "4. Recomende a ação imediata para o vendedor humano."
    ],
    hardRules: [
      "Sempre justifique a pontuação com base em evidências do texto.",
      "Leads com intenção de cancelamento ou suporte não devem ser pontuados como vendas."
    ],
    definitionOfDone: "Score calculado, categoria definida e sugestão de mensagem de abordagem gerada."
  },
  contract_reviewer: {
    task: "resumo",
    systemPrompt: "Você é um consultor jurídico empresarial. Analise contratos identificando cláusulas desproporcionais, multas rescisórias abusivas, foro de eleição desvantajoso e ambiguidades de prazo.",
    numberedProcedure: [
      "1. Mapeie as partes e o objeto contratual.",
      "2. Faça uma varredura nas cláusulas de rescisão, penalidades e garantias.",
      "3. Sinalize pontos de risco alto, médio e baixo com sugestão de redação substitutiva."
    ],
    hardRules: [
      "Aponte sempre o número ou título da cláusula em questão.",
      "Deixe explícito que o resumo não substitui parecer de advogado com OAB ativa."
    ],
    definitionOfDone: "Matriz de riscos com nível de severidade e redação sugerida para cada ponto crítico."
  },
  tourism_itinerary_builder: {
    task: "geracao_texto",
    systemPrompt: "Você é um especialista em planejamento de viagens e turismo. Monte itinerários diários equilibrados, considerando deslocamentos, horários de funcionamento, gastronomia local e perfil do viajante.",
    numberedProcedure: [
      "1. Divida a viagem em blocos diários (Manhã, Tarde, Noite).",
      "2. Agrupe atrações por proximidade geográfica para minimizar trânsito.",
      "3. Inclua recomendações gastronômicas e dicas locais práticas."
    ],
    hardRules: [
      "Não sobrecarregue o dia com mais de 3 passeios principais.",
      "Sempre inclua sugestão de transporte entre os pontos."
    ],
    definitionOfDone: "Roteiro dia a dia completo com mapa mental de deslocamentos e recomendações."
  },
  real_estate_appraiser: {
    task: "geracao_texto",
    systemPrompt: "Você é um copywriter do mercado imobiliário de alto padrão. Crie anúncios envolventes para imóveis, ressaltando ventilação, incidência solar, acabamentos nobres e conveniência do bairro.",
    numberedProcedure: [
      "1. Destaque os 3 maiores diferenciais do imóvel no título.",
      "2. Crie uma introdução que faça o cliente se visualizar vivendo no espaço.",
      "3. Liste especificações técnicas (área útil, vagas, suítes, condomínio).",
      "4. Finalize com chamada de ação para agendamento de visita presencial."
    ],
    hardRules: [
      "Nunca omita a metragem fornecida.",
      "Evite clichês vazios como 'imóvel dos sonhos' sem contextualizar o benefício real."
    ],
    definitionOfDone: "Texto descritivo refinado, com título atraente e chamada para ação para corretores."
  },
  ad_copywriter: {
    task: "geracao_texto",
    systemPrompt: "Você é um copywriter de tráfego pago focado em alta taxa de clique (CTR) e conversão (ROAS). Escreva variações de anúncios com ganchos emocionais fortes, quebra de objeções e ofertas irresistíveis.",
    numberedProcedure: [
      "1. Formule 3 opções de ganchos iniciais (Hooks).",
      "2. Desenvolva o corpo do anúncio com a proposta única de valor.",
      "3. Finalize com chamada de ação (CTA) clara e imperativa."
    ],
    hardRules: [
      "Respeite os limites de caracteres do formato especificado.",
      "Não use promessas milagrosas que violem as políticas de publicidade das redes."
    ],
    definitionOfDone: "Conjunto de 3 variações de copy prontas para teste A/B em campanhas."
  },
  support_auto_responder: {
    task: "chat",
    systemPrompt: "Você é a atendente virtual de suporte da loja. Responda de forma empática, prestativa e resolutiva. Se o caso exigir verificação manual de estorno ou logística complexa, prepare o transbordo para humano.",
    numberedProcedure: [
      "1. Reconheça a dúvida ou sentimento do cliente com acolhimento.",
      "2. Forneça a instrução clara sobre rastreio, prazo ou processo de troca.",
      "3. Verifique se a dúvida foi resolvida ou se necessita intervenção humana."
    ],
    hardRules: [
      "Nunca trate o cliente de forma mecânica ou ríspida.",
      "Não prometa reembolsos ou cancelamentos de pedidos já despachados sem autorização."
    ],
    definitionOfDone: "Resposta completa com solução da dúvida ou resumo para transbordo humano."
  },
  accessibility_checker: {
    task: "codigo",
    systemPrompt: "Você é um auditor de acessibilidade web especialista nas diretrizes WCAG 2.1 nível AA. Inspecione trechos de código HTML/JSX e aponte contrastes insuficientes, falta de aria-labels e falhas de foco.",
    numberedProcedure: [
      "1. Mapeie elementos interativos (botões, links, inputs).",
      "2. Verifique se possuem rótulo descritivo e estados acessíveis.",
      "3. Aponte a linha da desconformidade e forneça o código corrigido."
    ],
    hardRules: [
      "Priorize conformidade WCAG AA com foco em leitores de tela.",
      "Forneça a solução pronta em código JSX/HTML."
    ],
    definitionOfDone: "Relatório de conformidade com código antes/depois e justificativa técnica."
  },
  inventory_forecaster: {
    task: "classificacao",
    systemPrompt: "Você é um analista de operações e suprimentos de varejo. Com base nos dados de giro e estoque restante, estime os dias de cobertura e classifique o status entre Crítico, Saudável ou Excesso.",
    numberedProcedure: [
      "1. Calcule a velocidade de venda média diária.",
      "2. Projete a data prevista de ruptura de estoque.",
      "3. Sugira a quantidade ideal para reabastecimento considerando o prazo do fornecedor."
    ],
    hardRules: [
      "Sempre mostre os números que embasam o cálculo.",
      "Alerta imediato se o estoque durar menos que o prazo de entrega do fornecedor."
    ],
    definitionOfDone: "Diagnóstico de cobertura com recomendação objetiva de compra e data limite."
  }
};

// ============================================================
// Funções Server-Side de Gestão & Catálogo
// ============================================================

export const listSkillsCatalog = createServerFn({ method: "GET" })
  .validator(
    z.object({
      category: z.string().optional(),
      niche: z.string().optional(),
      search: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data: filter }): Promise<SkillItemDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    let query = supabase
      .from("ai_skills")
      .select("id, slug, name, description, trigger_explicit, when_not_to_use, category, niche, icon, estimated_cost_usd, is_active")
      .eq("is_active", true);

    if (filter?.category && filter.category !== "todas") {
      query = query.eq("category", filter.category);
    }
    if (filter?.niche && filter.niche !== "todos") {
      query = query.eq("niche", filter.niche);
    }
    if (filter?.search && filter.search.trim().length > 0) {
      query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%,trigger_explicit.ilike.%${filter.search}%`);
    }

    const { data: skills, error } = await query.order("name", { ascending: true });

    if (error || skills === null || skills === undefined) {
      console.error("[ai-skills] Erro ao listar skills:", error);
      return [];
    }

    // Busca configurações de ativação do workspace/usuário
    let workspaceSettingsMap = new Map<string, boolean>();
    if (identity?.store_id) {
      const { data: storeSettings } = await supabase
        .from("workspace_skill_settings")
        .select("skill_id, is_enabled")
        .eq("store_id", identity.store_id);

      if (storeSettings) {
        for (const s of storeSettings) {
          workspaceSettingsMap.set(s.skill_id, s.is_enabled);
        }
      }
    }

    return skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      trigger_explicit: s.trigger_explicit,
      when_not_to_use: s.when_not_to_use || undefined,
      category: s.category,
      niche: s.niche || undefined,
      icon: s.icon || "Zap",
      estimated_cost_usd: Number(s.estimated_cost_usd || 0.0005),
      is_enabled: workspaceSettingsMap.has(s.id) ? workspaceSettingsMap.get(s.id)! : true,
      priority: 1,
    }));
  });

export const toggleSkillActivation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      skillId: z.string().uuid(),
      enabled: z.boolean(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.store_id) throw new Error("Workspace não selecionado");
    const supabase = getServerClient();

    const { error } = await supabase
      .from("workspace_skill_settings")
      .upsert({
        store_id: identity.store_id,
        skill_id: input.skillId,
        is_enabled: input.enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: "store_id, skill_id" });

    if (error) {
      console.error("[ai-skills] Erro ao alternar skill:", error);
      throw new Error("Falha ao salvar configuração da skill");
    }

    return { success: true, enabled: input.enabled };
  });

// ============================================================
// Roteador de Intenção e Resolução de Skills (Fase C)
// ============================================================

export function resolveSkillIntentLogic(
  userPrompt: string,
  catalog: SkillItemDTO[],
  contextNiche?: string,
): SkillResolutionResult {
  const promptLower = userPrompt.toLowerCase();

  // Mapeamento de intenções por palavras-chave determinísticas
  const scoredCandidates: Array<{ skill: SkillItemDTO; score: number; reason: string }> = [];

  for (const skill of catalog) {
    if (skill.is_enabled === false) continue; // Skill desativada não pode ser selecionada

    let score = 0;
    const matchedTerms: string[] = [];

    // Checa nicho
    if (contextNiche && skill.niche === contextNiche) {
      score += 25;
    }

    // Checa gatilho explícito
    const triggerWords = (skill.trigger_explicit || "").toLowerCase().split(/\s+/);
    for (const w of triggerWords) {
      if (w.length > 3 && promptLower.includes(w)) {
        score += 15;
        matchedTerms.push(w);
      }
    }

    // Casos específicos conhecidos
    if (skill.slug === "commercial_proposal" && (promptLower.includes("proposta") || promptLower.includes("orçamento") || promptLower.includes("investimento"))) {
      score += 50;
      matchedTerms.push("proposta");
    } else if (skill.slug === "receipt_organizer" && (promptLower.includes("comprovante") || promptLower.includes("recibo") || promptLower.includes("nota fiscal") || promptLower.includes("cupom fiscal") || promptLower.includes("fiscais"))) {
      score += 50;
      matchedTerms.push("comprovante");
    } else if (skill.slug === "lead_qualifier_sdr" && (promptLower.includes("lead") || promptLower.includes("bant") || promptLower.includes("prospect"))) {
      score += 50;
      matchedTerms.push("lead");
    } else if (skill.slug === "contract_reviewer" && (promptLower.includes("contrato") || promptLower.includes("cláusula") || promptLower.includes("risco") || promptLower.includes("rescisória") || promptLower.includes("rescisão") || promptLower.includes("minuta"))) {
      score += 50;
      matchedTerms.push("contrato");
    } else if (skill.slug === "tourism_itinerary_builder" && (promptLower.includes("roteiro") || promptLower.includes("viagem") || promptLower.includes("hotel") || promptLower.includes("passeio") || promptLower.includes("turismo") || promptLower.includes("cachoeiras"))) {
      score += 50;
      matchedTerms.push("turismo");
    } else if (skill.slug === "real_estate_appraiser" && (promptLower.includes("imóvel") || promptLower.includes("apartamento") || promptLower.includes("aluguel") || promptLower.includes("terreno") || promptLower.includes("condomínio") || promptLower.includes("suítes"))) {
      score += 50;
      matchedTerms.push("imóvel");
    } else if (skill.slug === "ad_copywriter" && (promptLower.includes("anúncio") || promptLower.includes("copy") || promptLower.includes("campanha") || promptLower.includes("tráfego") || promptLower.includes("cta"))) {
      score += 50;
      matchedTerms.push("anúncio");
    } else if (skill.slug === "support_auto_responder" && (promptLower.includes("dúvida") || promptLower.includes("suporte") || promptLower.includes("ajuda") || promptLower.includes("atrasou") || promptLower.includes("troca") || promptLower.includes("devolução"))) {
      score += 50;
      matchedTerms.push("suporte");
    } else if (skill.slug === "accessibility_checker" && (promptLower.includes("acessibilidade") || promptLower.includes("wcag") || promptLower.includes("contraste") || promptLower.includes("aria-label"))) {
      score += 50;
      matchedTerms.push("acessibilidade");
    } else if (skill.slug === "inventory_forecaster" && (promptLower.includes("estoque") || promptLower.includes("reposição") || promptLower.includes("giro") || promptLower.includes("cobertura"))) {
      score += 50;
      matchedTerms.push("estoque");
    }

    if (score > 20) {
      scoredCandidates.push({
        skill,
        score,
        reason: `Gatilhos identificados no pedido: [${matchedTerms.slice(0, 3).join(", ")}]`,
      });
    }
  }

  scoredCandidates.sort((a, b) => b.score - a.score);

  if (scoredCandidates.length === 0 || scoredCandidates[0].score < 30) {
    return {
      primarySkill: null,
      pipelineChain: [],
      confidenceScore: 0.1,
      selectionReason: "Nenhuma skill declarada atingiu limiar mínimo de confiança.",
      requiresClarification: true,
      clarificationPrompt: "Poderia esclarecer se você precisa de uma proposta comercial, revisão de contrato, análise de estoque ou criação de roteiro?",
    };
  }

  const winner = scoredCandidates[0];
  const chain: SkillItemDTO[] = [winner.skill];

  return {
    primarySkill: winner.skill,
    pipelineChain: chain,
    confidenceScore: Math.min(1.0, Number((winner.score / 100).toFixed(2))),
    selectionReason: winner.reason,
    requiresClarification: false,
  };
}

export const resolveSkillIntent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userPrompt: z.string().min(1),
      contextNiche: z.string().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<SkillResolutionResult> => {
    const catalog = await listSkillsCatalog({ data: {} });
    return resolveSkillIntentLogic(input.userPrompt, catalog, input.contextNiche);
  });

// ============================================================
// Execução de Skill via Porta Única (Zero Provedor Direto)
// ============================================================

export const executeSkill = createServerFn({ method: "POST" })
  .validator(
    z.object({
      skillSlug: z.string(),
      userPrompt: z.string().min(1),
      inputs: z.record(z.any()).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const definition = CANONICAL_SKILLS_DEFINITIONS[input.skillSlug];
    if (definition === null || definition === undefined) {
      throw new Error(`Definição da skill '${input.skillSlug}' não encontrada no catálogo canônico.`);
    }

    const { data: skillRow } = await supabase
      .from("ai_skills")
      .select("id, is_active")
      .eq("slug", input.skillSlug)
      .maybeSingle();

    if (skillRow === null || skillRow === undefined || skillRow.is_active === false) {
      throw new Error("A skill solicitada não existe ou está globalmente inativa.");
    }

    // Regra Dura: Verificar se está desativada no workspace
    if (identity?.store_id) {
      const { data: storeSetting } = await supabase
        .from("workspace_skill_settings")
        .select("is_enabled")
        .eq("store_id", identity.store_id)
        .eq("skill_id", skillRow.id)
        .maybeSingle();

      if (storeSetting && storeSetting.is_enabled === false) {
        throw new Error("Esta skill está desativada nas configurações do seu workspace. Ative-a antes de executar.");
      }
    }

    const promptWithProcedure = `
[PROCEDIMENTO OBRIGATÓRIO DA SKILL]
${definition.numberedProcedure.join("\n")}

[REGRAS DURAS]
${definition.hardRules.join("\n")}

[CRITÉRIO DE PRONTO]
${definition.definitionOfDone}

[PEDIDO DO USUÁRIO / ENTRADAS]
${input.userPrompt}
${input.inputs ? `\nDados complementares:\n${JSON.stringify(input.inputs, null, 2)}` : ""}
`.trim();

    // Execução mandatoriamente pela Porta Única (Prompt 02)
    const gatewayRes = await executeAiCoreGateway({
      task: definition.task,
      prompt: promptWithProcedure,
      systemPrompt: definition.systemPrompt,
      module: `ai-skill:${input.skillSlug}`,
      authContext: {
        userId: identity?.id || undefined,
        storeId: identity?.store_id || undefined,
        userRole: identity?.role,
      },
    });

    if (gatewayRes.success === false) {
      throw new Error(gatewayRes.error?.message || "Erro durante a execução da skill no gateway de IA.");
    }

    // Gravação da Execução na Tabela ai_skill_runs (Prompt 03 - Fase A/E)
    void supabase
      .from("ai_skill_runs")
      .insert({
        skill_id: skillRow.id,
        user_id: identity?.id || null,
        store_id: identity?.store_id || null,
        trigger_context: input.userPrompt.slice(0, 500),
        selection_reason: `Invocação explícita da skill ${input.skillSlug}`,
        inputs: { prompt: input.userPrompt, ...(input.inputs || {}) },
        outputs: { text: gatewayRes.result.text, parsedJson: gatewayRes.result.parsedJson },
        tokens_used: gatewayRes.metadata.usage.totalTokens,
        cost_usd: gatewayRes.metadata.costUsd,
        latency_ms: gatewayRes.metadata.latencyMs,
        accepted: true,
      })
      .then(({ error }) => {
        if (error) console.error("[ai-skills] Erro ao registrar run da skill:", error);
      });

    return {
      success: true,
      skillSlug: input.skillSlug,
      resultText: gatewayRes.result.text,
      parsedJson: gatewayRes.result.parsedJson,
      tokensUsed: gatewayRes.metadata.usage.totalTokens,
      costUsd: gatewayRes.metadata.costUsd,
      latencyMs: gatewayRes.metadata.latencyMs,
      provider: gatewayRes.metadata.provider,
      model: gatewayRes.metadata.model,
    };
  });
