/**
 * strategic-frameworks.ts — Biblioteca Canônica de Frameworks Estratégicos
 * de Elite da Plataforma Waesy.
 */

export interface FrameworkDefinition {
  id: string;
  name: string;
  category: "marketing" | "business" | "product" | "brand";
  description: string;
  steps: string[];
  promptGuideline: string;
}

export const STRATEGIC_FRAMEWORKS: Record<string, FrameworkDefinition> = {
  aida: {
    id: "aida",
    name: "AIDA (Atenção, Interesse, Desejo, Ação)",
    category: "marketing",
    description: "Estruturação de Landing Pages, Anúncios Patrocinados e Campanhas de Conversão Direta.",
    steps: [
      "Atenção: Gancho imediato nos primeiros 3 segundos",
      "Interesse: Diferencial exclusivo e mecanismo único da oferta",
      "Desejo: Prova social palpável e benefícios emocionais",
      "Ação: Chamada para ação única e sem atrito",
    ],
    promptGuideline:
      "Construa a comunicação em 4 blocos rigorosos: Gancho magnético -> Proposta de valor -> Prova/Desejo -> Botão único de ação direta.",
  },
  pas: {
    id: "pas",
    name: "PAS (Problema, Agitação, Solução)",
    category: "marketing",
    description: "Copywriting de alta persuasão para postagens sociais e mensagens de WhatsApp.",
    steps: [
      "Problema: Identificação exata da dor que o cliente vive hoje",
      "Agitação: Consequências de adiar a resolução e custo da inação",
      "Solução: Apresentação da oferta como o resgate direto e simples",
    ],
    promptGuideline:
      "Identifique a frustração do cliente, mostre o impacto negativo de continuar sem resolver e apresente a loja como a solução imediata.",
  },
  storybrand: {
    id: "storybrand",
    name: "StoryBrand 7-Part Framework (Donald Miller)",
    category: "brand",
    description: "Construção de posicionamento onde o cliente é o herói e a empresa é o guia de confiança.",
    steps: [
      "1. Um Personagem (O Cliente)",
      "2. Tem um Problema (Externo, Interno e Filosófico)",
      "3. Encontra um Guia (Nossa Empresa com Empatia e Autoridade)",
      "4. Que lhe dá um Plano Simples (Passo a passo claro)",
      "5. E o convida à Ação (Direta e sem enrolação)",
      "6. Resultando em Sucesso (Transformação positiva)",
      "7. E evitando o Fracasso (O que o cliente deixa de perder)",
    ],
    promptGuideline:
      "Posicione sempre o cliente como protagonista. A loja age como o mentor experiente que fornece o mapa e a ferramenta para o sucesso.",
  },
  swot: {
    id: "swot",
    name: "Matriz SWOT (Forças, Fraquezas, Oportunidades, Ameaças)",
    category: "business",
    description: "Diagnóstico 360 graus de posicionamento interno e ambiente externo de mercado.",
    steps: [
      "Forças (Strengths): Vantagens competitivas internas inegociáveis",
      "Fraquezas (Weaknesses): Vulnerabilidades operacionais e limitações",
      "Oportunidades (Opportunities): Tendências e brechas deixadas pela concorrência",
      "Ameaças (Threats): Fatores econômicos, climáticos e movimentos de concorrentes",
    ],
    promptGuideline:
      "Analise com honestidade cirúrgica. Diferencie fatores sob controle da empresa (Forças/Fraquezas) de fatores externos de mercado (Oportunidades/Ameaças).",
  },
  blue_ocean: {
    id: "blue_ocean",
    name: "Estratégia do Oceano Azul (Matriz de 4 Ações)",
    category: "business",
    description: "Inovação de valor para escapar da guerra predatória de preços.",
    steps: [
      "Eliminar: Fatores que o setor dá como certos, mas que geram custo inútil",
      "Reduzir: Elementos que podem ser simplificados abaixo do padrão comum",
      "Elevar: Atributos que devem ser entregues muito acima da média",
      "Criar: Elementos inéditos que o mercado local ainda não oferece",
    ],
    promptGuideline:
      "Quebre o trade-off entre custo e diferenciação. Foque no que a empresa pode eliminar para baratear e no que pode criar para encantar.",
  },
  porter_5_forces: {
    id: "porter_5_forces",
    name: "As 5 Forças Competitivas de Porter",
    category: "business",
    description: "Mapeamento da atratividade e pressão competitiva do nicho comercial.",
    steps: [
      "Rivalidade entre Concorrentes: Intensidade da disputa no polo local",
      "Poder de Barganha dos Clientes: Sensibilidade a preço e opções de troca",
      "Poder dos Fornecedores: Dependência de distribuição e matéria-prima",
      "Ameaça de Novos Entrantes: Barreiras de entrada na cidade ou região",
      "Ameaça de Produtos Substitutos: Alternativas que resolvem a mesma necessidade",
    ],
    promptGuideline:
      "Avalie a pressão em cada uma das 5 forças e identifique como a loja protege suas margens e retém sua clientela fiel.",
  },
  aarrr: {
    id: "aarrr",
    name: "Métricas Pirata AARRR (Dave McClure)",
    category: "product",
    description: "Funil de crescimento para comércio digital e serviços.",
    steps: [
      "Aquisição (Acquisition): Como os clientes descobrem a vitrine",
      "Ativação (Activation): O primeiro contato positivo e compra teste",
      "Retenção (Retention): Recorrência e recompra regular",
      "Receita (Revenue): Ticket médio e valor da vida útil (LTV)",
      "Recomendação (Referral): Clientes que trazem outros clientes",
    ],
    promptGuideline:
      "Otimize cada etapa da jornada: atração de tráfego -> primeiro pedido sem atrito -> fidelização com clube -> expansão orgânica boca a boca.",
  },
  jtbd: {
    id: "jtbd",
    name: "Jobs to Be Done (Clayton Christensen)",
    category: "product",
    description: "Compreensão da real motivação de contratação de um produto ou serviço.",
    steps: [
      "Trabalho Funcional: A tarefa prática que o cliente precisa concluir",
      "Trabalho Emocional: Como o cliente quer se sentir durante e após o consumo",
      "Trabalho Social: Como o cliente deseja ser percebido pelos seus pares",
    ],
    promptGuideline:
      "As pessoas não compram brocas de 1/4 de polegada; compram buracos de 1/4 de polegada na parede. Descreva a transformação final contratada.",
  },
};

/**
 * Retorna instrução de prompt estruturada para o framework solicitado.
 */
export function getFrameworkPromptInstruction(frameworkId: keyof typeof STRATEGIC_FRAMEWORKS): string {
  const fw = STRATEGIC_FRAMEWORKS[frameworkId];
  if (!fw) return "";

  return `
[FRAMEWORK ESTRATÉGICO APLICADO: ${fw.name}]
Objetivo: ${fw.description}
Etapas Lógicas:
${fw.steps.map((s) => `- ${s}`).join("\n")}
Diretriz de Execução:
${fw.promptGuideline}
`;
}
