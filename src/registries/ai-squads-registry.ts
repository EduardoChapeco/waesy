/**
 * ai-squads-registry.ts — Dynamic Squad Assembler do Waesy AI OS
 * Compõe equipes dinâmicas de agentes e habilidades sob demanda conforme a intenção do usuário,
 * evitando squads estáticos ou teatro de agentes redundante.
 */

import { getAiSkill, type AiSkillDefinition } from "./ai-skills-registry";

export interface SquadRole {
  roleName: string;
  mission: string;
  assignedSkillSlugs: string[];
}

export interface DynamicAiSquad {
  squadId: string;
  name: string;
  intentPattern: RegExp;
  primaryMission: string;
  roles: SquadRole[];
  suggestedTools: string[];
}

export const CANONICAL_AI_SQUADS: DynamicAiSquad[] = [
  {
    squadId: "squad-travel-tourism",
    name: "Squad de Turismo & Experiências",
    intentPattern: /(viagem|turismo|roteiro|passeio|hotel|hospedagem|atrativo|voo|gastronomia)/i,
    primaryMission: "Planejamento estruturado de roteiro, levantamento de atrativos e estimativa de custos de viagem.",
    roles: [
      {
        roleName: "Curador de Atrativos e Logística",
        mission: "Mapear pontos turísticos, rotas viárias e tempos de deslocamento.",
        assignedSkillSlugs: ["research_and_discovery", "travel_itinerary_planner"],
      },
      {
        roleName: "Analista Orçamentário",
        mission: "Estimar despesas de hospedagem, alimentação e ingressos em planilha consolidada.",
        assignedSkillSlugs: ["spreadsheet_financial_modeling"],
      },
    ],
    suggestedTools: ["query_places_directory", "get_weather_forecast", "generate_spreadsheet_artifact"],
  },

  {
    squadId: "squad-commercial-business",
    name: "Squad de Propostas Comerciais & Vendas",
    intentPattern: /(proposta|orçamento|contrato|prestação de serviço|escopo|precificação|honorários)/i,
    primaryMission: "Elaboração de proposta comercial executiva com marcos de entrega, condições de pagamento e minuta formal.",
    roles: [
      {
        roleName: "Consultor de Negócios e Escopo",
        mission: "Definir etapas de entrega, responsabilidades e cronograma.",
        assignedSkillSlugs: ["commercial_proposal_drafter"],
      },
      {
        roleName: "Modelador de Preço e Parcelamento",
        mission: "Calcular custos, margens e condições de pagamento parceladas.",
        assignedSkillSlugs: ["spreadsheet_financial_modeling", "document_report_generator"],
      },
    ],
    suggestedTools: ["draft_commercial_proposal", "generate_spreadsheet_artifact", "update_working_memory"],
  },

  {
    squadId: "squad-omnibuilder-web",
    name: "Squad de Construção Visual & OmniBuilder",
    intentPattern: /(site|página|biolink|landing page|omnibuilder|layout|design|seção)/i,
    primaryMission: "Modificação, estilização e harmonização de blocos do site sem quebrar a árvore de nós.",
    roles: [
      {
        roleName: "Arquiteto de Componentes",
        mission: "Identificar os nós corretos da árvore de layout e aplicar patches cirúrgicos.",
        assignedSkillSlugs: ["omnibuilder_site_designer"],
      },
      {
        roleName: "Curador de Conteúdo e Identidade",
        mission: "Redigir títulos concisos, chamadas para ação e checar contrastes de cor.",
        assignedSkillSlugs: ["research_and_discovery"],
      },
    ],
    suggestedTools: ["update_working_memory"],
  },

  {
    squadId: "squad-data-analytics",
    name: "Squad de Análise de Dados & Planilhas",
    intentPattern: /(planilha|excel|csv|tabela|métricas|fórmulas|cálculo|relatório de vendas)/i,
    primaryMission: "Compilação de tabelas de dados, cálculos estatísticos e geração de arquivos exportáveis.",
    roles: [
      {
        roleName: "Modelador Estatístico e Tabular",
        mission: "Estruturar colunas, validar tipos de dados e montar matriz de valores.",
        assignedSkillSlugs: ["spreadsheet_financial_modeling"],
      },
      {
        roleName: "Sintetizador Executivo",
        mission: "Gerar relatório textual com destaques e conclusões das métricas levantadas.",
        assignedSkillSlugs: ["document_report_generator"],
      },
    ],
    suggestedTools: ["generate_spreadsheet_artifact", "read_document_content"],
  },
];

export interface AssembledSquadResult {
  squad: DynamicAiSquad;
  activeSkills: AiSkillDefinition[];
  requiredTools: string[];
  executionPlan: string[];
}

/**
 * Monta o squad dinâmico mais adequado à intenção do usuário
 */
export function assembleSquadForIntent(userPrompt: string): AssembledSquadResult {
  const matchedSquad = CANONICAL_AI_SQUADS.find((squad) => squad.intentPattern.test(userPrompt));

  const squad: DynamicAiSquad = matchedSquad || {
    squadId: "squad-general-advisor",
    name: "Squad de Assessoria Local Geral",
    intentPattern: /.*/,
    primaryMission: "Atendimento executivo de propósito geral, busca de dados e esclarecimento de dúvidas locais.",
    roles: [
      {
        roleName: "Assessor Geral",
        mission: "Resolver a consulta do usuário com base no conhecimento oficial da plataforma.",
        assignedSkillSlugs: ["research_and_discovery"],
      },
    ],
    suggestedTools: ["search_catalog_products", "query_places_directory"],
  };

  const skillSlugs = new Set<string>();
  for (const role of squad.roles) {
    for (const slug of role.assignedSkillSlugs) {
      skillSlugs.add(slug);
    }
  }

  const activeSkills: AiSkillDefinition[] = [];
  const requiredTools = new Set<string>(squad.suggestedTools);

  for (const slug of skillSlugs) {
    const skill = getAiSkill(slug);
    if (skill) {
      activeSkills.push(skill);
      for (const tool of skill.defaultTools) {
        requiredTools.add(tool);
      }
    }
  }

  const executionPlan = squad.roles.map((r, i) => `Passo ${i + 1}: [${r.roleName}] — ${r.mission}`);

  return {
    squad,
    activeSkills,
    requiredTools: Array.from(requiredTools),
    executionPlan,
  };
}
