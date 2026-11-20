export {
  TURIS_AI_SKILLS_PRESETS,
  TURIS_SONDAGEM_4AS_PILLARS,
  type TurisAiSkillPreset,
} from "./turis-ai-skills";

export const TURIS_PROSPECTING_DEFAULT_TEMPLATE =
  "Olá {{nome}}! Tudo bem? Somos da {{agencia}}, uma agência de viagens completa (com matriz física e app próprio). Estamos selecionando viajantes que pretendem tirar uma viagem do papel nos próximos 2 anos — seja em grupos terrestres, excursões nacionais/internacionais ou aéreo sob medida. Você é uma dessas pessoas?\n\nSe quiser espiar nossas oportunidades no nosso app oficial: {{app_link}}\n(Se preferir não receber novidades, basta responder SAIR.)";

export const TURIS_FOLLOWUP_CADENCE_DEFAULTS = [
  {
    step: 1,
    delayHours: 2,
    stage: "proposal_sent",
    template: "Oi {{nome}}! Conseguiu abrir a proposta que te enviei? Se quiser ajustar datas, hotel ou parcelamento, me avisa que adapto rapidinho para você.",
  },
  {
    step: 2,
    delayHours: 24,
    stage: "proposal_sent",
    template: "Oi {{nome}}, tudo bem? Passando só para saber se aquela opção de viagem fez sentido para o que você imaginava ou se prefere ver outro destino/estilo.",
  },
  {
    step: 3,
    delayHours: 72,
    stage: "no_reply_breakup",
    template: "Oi {{nome}}! Como imagino que sua semana esteja corrida, vou encerrar seu atendimento por aqui para não ser inoportuno. Quando decidir planejar sua próxima viagem, é só me mandar um oi que retomo na hora!",
  },
] as const;
