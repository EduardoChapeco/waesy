/**
 * niche-manifest.ts — Manifesto Canônico de Nichos (Waesy Omni-Niche Engine)
 *
 * Fonte Única da Verdade para parametrização polimórfica das verticais de negócio.
 * Elimina bifurcações ad-hoc (`if (nicho === 'turismo')`) em JSX e componentes.
 * Todas as telas, formulários, tabelas, roteadores e MCP leem este manifesto.
 *
 * Invariantes: M01, M02, M07, M08 | Checks: C21, C26 | Prompts: P29, P30, P31
 */

export type NicheId =
  | "generic"
  | "tourism"
  | "gastronomy"
  | "retail"
  | "services"
  | "real_estate"
  | "healthcare"
  | "automotive"
  | "events"
  | "creator";

export type NicheModuleKey =
  | "catalog"
  | "orders"
  | "kds"
  | "tables"
  | "reservations"
  | "crm"
  | "proposals"
  | "quotes"
  | "boarding"
  | "fleet"
  | "contracts"
  | "financial"
  | "tasks"
  | "support"
  | "inventory"
  | "marketing"
  | "affiliates"
  | "couriers"
  | "simlab";

export interface NicheStageConfig {
  key: string;
  label: string;
  color: string;
  isInitial?: boolean;
  isTerminalWon?: boolean;
  isTerminalLost?: boolean;
  slaMinutes?: number;
}

export interface NicheEntityNomenclature {
  itemSingular: string;
  itemPlural: string;
  orderSingular: string;
  orderPlural: string;
  customerSingular: string;
  customerPlural: string;
  catalogLabel: string;
  newItemLabel: string;
  primaryMetricLabel: string;
  secondaryMetricLabel: string;
}

export interface NicheManifest {
  id: NicheId;
  label: string;
  description: string;
  activeModules: NicheModuleKey[];
  nomenclature: NicheEntityNomenclature;
  defaultStages: {
    crm: NicheStageConfig[];
    orders: NicheStageConfig[];
    reservations?: NicheStageConfig[];
  };
  mandatoryItemFields: string[];
  mandatoryCustomerFields: string[];
  defaultSlaMinutes: {
    orderExecution: number;
    quoteResponse: number;
    supportTicket: number;
  };
  supportedDocuments: Array<"contract" | "voucher" | "quote" | "receipt" | "shipping_label" | "boarding_pass">;
  flags: {
    hasTableManagement: boolean;
    hasFleetTracking: boolean;
    hasPassengerManifest: boolean;
    hasRecipeIngredients: boolean;
    hasRoomAllotment: boolean;
    hasWarrantyTerms: boolean;
    hasDigitalCompanion: boolean;
    hasLiveTracking: boolean;
    requiresDocumentValidation: boolean;
  };
}

export const NICHE_MANIFEST_REGISTRY: Record<NicheId, NicheManifest> = {
  // ── 1. NÚCLEO GENÉRICO / COMÉRCIO MULTI-SEGMENTO ──
  generic: {
    id: "generic",
    label: "Comércio & Serviços Gerais",
    description: "Operação canônica multi-segmento com catálogo unificado, vendas diretas e gestão de carteira.",
    activeModules: ["catalog", "orders", "crm", "financial", "tasks", "support", "inventory", "marketing"],
    nomenclature: {
      itemSingular: "Produto / Serviço",
      itemPlural: "Produtos & Serviços",
      orderSingular: "Pedido",
      orderPlural: "Pedidos",
      customerSingular: "Cliente",
      customerPlural: "Clientes",
      catalogLabel: "Catálogo de Itens",
      newItemLabel: "Adicionar Item",
      primaryMetricLabel: "Faturamento Bruto",
      secondaryMetricLabel: "Ticket Médio",
    },
    defaultStages: {
      crm: [
        { key: "new_lead", label: "Novo Contato", color: "#94a3b8", isInitial: true },
        { key: "qualifying", label: "Em Qualificação", color: "#38bdf8" },
        { key: "proposal_sent", label: "Proposta Enviada", color: "#f59e0b" },
        { key: "won", label: "Venda Realizada", color: "#10b981", isTerminalWon: true },
        { key: "lost", label: "Arquivado", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "pending", label: "Pendente", color: "#f59e0b", isInitial: true },
        { key: "confirmed", label: "Confirmado", color: "#38bdf8" },
        { key: "delivered", label: "Entregue", color: "#10b981", isTerminalWon: true },
        { key: "cancelled", label: "Cancelado", color: "#ef4444", isTerminalLost: true },
      ],
    },
    mandatoryItemFields: ["name", "price"],
    mandatoryCustomerFields: ["full_name", "phone"],
    defaultSlaMinutes: {
      orderExecution: 1440,
      quoteResponse: 240,
      supportTicket: 120,
    },
    supportedDocuments: ["receipt", "shipping_label"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: true,
      requiresDocumentValidation: false,
    },
  },

  // ── 2. TURISMO, VIAGENS & EXPERIÊNCIAS ──
  tourism: {
    id: "tourism",
    label: "Turismo & Viagens",
    description: "Operação completa de agências e operadoras: roteiros, cotador avançado, propostas ricas, embarques, frota e vouchers.",
    activeModules: ["catalog", "crm", "proposals", "quotes", "boarding", "fleet", "contracts", "financial", "tasks", "support", "marketing"],
    nomenclature: {
      itemSingular: "Pacote / Destino",
      itemPlural: "Pacotes & Destinos",
      orderSingular: "Reserva de Viagem",
      orderPlural: "Reservas",
      customerSingular: "Viajante",
      customerPlural: "Viajantes & Passageiros",
      catalogLabel: "Catálogo de Destinos & Pacotes",
      newItemLabel: "Novo Pacote / Roteiro",
      primaryMetricLabel: "Volume Transacionado",
      secondaryMetricLabel: "Média por Passageiro",
    },
    defaultStages: {
      crm: [
        { key: "inbox", label: "Primeiro Contato", color: "#94a3b8", isInitial: true },
        { key: "briefing", label: "Levantamento de Perfil", color: "#38bdf8" },
        { key: "cotacao", label: "Cotação em Andamento", color: "#818cf8" },
        { key: "proposta_enviada", label: "Proposta Enviada", color: "#f59e0b" },
        { key: "negociacao", label: "Em Ajuste / Fechamento", color: "#ec4899" },
        { key: "ganho", label: "Viagem Confirmada", color: "#10b981", isTerminalWon: true },
        { key: "perdido", label: "Desistência / Recusado", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "solicitada", label: "Solicitada", color: "#f59e0b", isInitial: true },
        { key: "confirmada", label: "Confirmada", color: "#38bdf8" },
        { key: "emitida", label: "Vouchers Emitidos", color: "#818cf8" },
        { key: "embarcada", label: "Em Viagem", color: "#10b981" },
        { key: "concluida", label: "Retornou / Concluída", color: "#059669", isTerminalWon: true },
        { key: "cancelada", label: "Cancelada", color: "#ef4444", isTerminalLost: true },
      ],
      reservations: [
        { key: "pendente", label: "Reserva Prévia", color: "#f59e0b", isInitial: true },
        { key: "paga", label: "Pagamento Confirmado", color: "#10b981" },
        { key: "voucher_gerado", label: "Voucher Disponível", color: "#06b6d4" },
      ],
    },
    mandatoryItemFields: ["name", "price", "duration_days", "destination_city"],
    mandatoryCustomerFields: ["full_name", "phone", "cpf_cnpj", "birth_date"],
    defaultSlaMinutes: {
      orderExecution: 2880,
      quoteResponse: 180,
      supportTicket: 60,
    },
    supportedDocuments: ["contract", "voucher", "quote", "receipt", "boarding_pass"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: true,
      hasPassengerManifest: true,
      hasRecipeIngredients: false,
      hasRoomAllotment: true,
      hasWarrantyTerms: false,
      hasDigitalCompanion: true,
      hasLiveTracking: true,
      requiresDocumentValidation: true,
    },
  },

  // ── 3. GASTRONOMIA, RESTAURANTES & DELIVERY ──
  gastronomy: {
    id: "gastronomy",
    label: "Gastronomia & Restaurantes",
    description: "Operação culinária de salão, balcão e delivery com KDS de cozinha, mesas, comanda e insumos.",
    activeModules: ["catalog", "orders", "kds", "tables", "financial", "inventory", "support", "couriers"],
    nomenclature: {
      itemSingular: "Prato / Lanche",
      itemPlural: "Pratos & Bebidas",
      orderSingular: "Comanda / Pedido",
      orderPlural: "Pedidos & Comandas",
      customerSingular: "Cliente / Mesa",
      customerPlural: "Clientes",
      catalogLabel: "Cardápio do Restaurante",
      newItemLabel: "Adicionar ao Cardápio",
      primaryMetricLabel: "Faturamento do Dia",
      secondaryMetricLabel: "Tempo Médio de Preparo",
    },
    defaultStages: {
      crm: [
        { key: "new_lead", label: "Novo Contato", color: "#94a3b8", isInitial: true },
        { key: "active_customer", label: "Cliente Frequente", color: "#10b981", isTerminalWon: true },
      ],
      orders: [
        { key: "recebido", label: "Recebido", color: "#f59e0b", isInitial: true },
        { key: "em_preparo", label: "Na Cozinha (KDS)", color: "#38bdf8" },
        { key: "pronto", label: "Pronto para Retirada / Despacho", color: "#818cf8" },
        { key: "saiu_entrega", label: "Com o Entregador", color: "#a855f7" },
        { key: "entregue", label: "Entregue / Concluído", color: "#10b981", isTerminalWon: true },
        { key: "cancelado", label: "Cancelado", color: "#ef4444", isTerminalLost: true },
      ],
    },
    mandatoryItemFields: ["name", "price", "category"],
    mandatoryCustomerFields: ["full_name", "phone"],
    defaultSlaMinutes: {
      orderExecution: 45,
      quoteResponse: 30,
      supportTicket: 15,
    },
    supportedDocuments: ["receipt"],
    flags: {
      hasTableManagement: true,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: true,
      hasRoomAllotment: false,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: true,
      requiresDocumentValidation: false,
    },
  },

  // ── 4. VAREJO & COMÉRCIO LOCAL ──
  retail: {
    id: "retail",
    label: "Varejo & Lojas",
    description: "Controle de estoque grade/tamanho/cor, PDV de balcão, expedição e entregas urbanas.",
    activeModules: ["catalog", "orders", "inventory", "financial", "crm", "marketing", "couriers"],
    nomenclature: {
      itemSingular: "Produto",
      itemPlural: "Produtos",
      orderSingular: "Pedido de Venda",
      orderPlural: "Vendas",
      customerSingular: "Comprador",
      customerPlural: "Clientes",
      catalogLabel: "Estoque & Catálogo",
      newItemLabel: "Cadastrar Produto",
      primaryMetricLabel: "Vendas Totais",
      secondaryMetricLabel: "Margem Média",
    },
    defaultStages: {
      crm: [
        { key: "lead", label: "Interessado", color: "#94a3b8", isInitial: true },
        { key: "negotiating", label: "Orçamento Aberto", color: "#f59e0b" },
        { key: "customer", label: "Cliente Ativo", color: "#10b981", isTerminalWon: true },
      ],
      orders: [
        { key: "pendente", label: "Aguardando Pagamento", color: "#f59e0b", isInitial: true },
        { key: "pago", label: "Aprovado", color: "#38bdf8" },
        { key: "separacao", label: "Em Separação", color: "#818cf8" },
        { key: "enviado", label: "Em Rota de Entrega", color: "#a855f7" },
        { key: "entregue", label: "Entregue", color: "#10b981", isTerminalWon: true },
        { key: "cancelado", label: "Cancelado", color: "#ef4444", isTerminalLost: true },
      ],
    },
    mandatoryItemFields: ["name", "price", "sku", "stock_quantity"],
    mandatoryCustomerFields: ["full_name", "phone"],
    defaultSlaMinutes: {
      orderExecution: 240,
      quoteResponse: 120,
      supportTicket: 120,
    },
    supportedDocuments: ["receipt", "shipping_label"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: true,
      hasDigitalCompanion: false,
      hasLiveTracking: true,
      requiresDocumentValidation: false,
    },
  },

  // ── 5. SERVIÇOS PROFISSIONAIS & CONSULTORIA ──
  services: {
    id: "services",
    label: "Serviços & Consultoria",
    description: "Prestação de serviços, orçamentos, contratos de honorários, agendamento de horas e SLA de execução.",
    activeModules: ["catalog", "crm", "proposals", "contracts", "financial", "tasks", "support"],
    nomenclature: {
      itemSingular: "Serviço / Pacote",
      itemPlural: "Serviços Oferecidos",
      orderSingular: "Contrato / OS",
      orderPlural: "Ordens de Serviço",
      customerSingular: "Cliente / Contratante",
      customerPlural: "Clientes Corporativos",
      catalogLabel: "Portfólio de Serviços",
      newItemLabel: "Novo Serviço",
      primaryMetricLabel: "Receita Recorrente (MRR)",
      secondaryMetricLabel: "Horas Alocadas",
    },
    defaultStages: {
      crm: [
        { key: "lead", label: "Prospecção", color: "#94a3b8", isInitial: true },
        { key: "discovery", label: "Diagnóstico", color: "#38bdf8" },
        { key: "proposal", label: "Proposta Comercial", color: "#f59e0b" },
        { key: "contract", label: "Minuta Contratual", color: "#ec4899" },
        { key: "active", label: "Contrato Assinado", color: "#10b981", isTerminalWon: true },
        { key: "lost", label: "Declinado", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "aberta", label: "Aberta", color: "#f59e0b", isInitial: true },
        { key: "em_execucao", label: "Em Execução", color: "#38bdf8" },
        { key: "homologacao", label: "Em Aprovação", color: "#818cf8" },
        { key: "concluida", label: "Entregue e Faturada", color: "#10b981", isTerminalWon: true },
        { key: "cancelada", label: "Cancelada", color: "#ef4444", isTerminalLost: true },
      ],
    },
    mandatoryItemFields: ["name", "price", "duration_hours"],
    mandatoryCustomerFields: ["full_name", "email", "phone", "cpf_cnpj"],
    defaultSlaMinutes: {
      orderExecution: 14400,
      quoteResponse: 480,
      supportTicket: 120,
    },
    supportedDocuments: ["contract", "quote", "receipt"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: true,
      hasDigitalCompanion: false,
      hasLiveTracking: false,
      requiresDocumentValidation: true,
    },
  },

  // ── 6. IMOBILIÁRIA & LOCAÇÕES ──
  real_estate: {
    id: "real_estate",
    label: "Imóveis & Locação",
    description: "Gestão imobiliária, captações, visitas agendadas, vistorias e contratos de locação ou venda.",
    activeModules: ["catalog", "crm", "contracts", "financial", "tasks", "support"],
    nomenclature: {
      itemSingular: "Imóvel",
      itemPlural: "Imóveis & Terrenos",
      orderSingular: "Contrato de Locação/Venda",
      orderPlural: "Negócios Fechados",
      customerSingular: "Proponente / Locatário",
      customerPlural: "Inquilinos & Proprietários",
      catalogLabel: "Carteira de Imóveis",
      newItemLabel: "Cadastrar Imóvel",
      primaryMetricLabel: "VGV Transacionado",
      secondaryMetricLabel: "Taxa de Ocupação",
    },
    defaultStages: {
      crm: [
        { key: "lead", label: "Lead Interessado", color: "#94a3b8", isInitial: true },
        { key: "visit_scheduled", label: "Visita Agendada", color: "#38bdf8" },
        { key: "proposal_received", label: "Proposta em Análise", color: "#f59e0b" },
        { key: "credit_check", label: "Análise Cadastral", color: "#818cf8" },
        { key: "contract_signed", label: "Chaves Entregues", color: "#10b981", isTerminalWon: true },
        { key: "cancelled", label: "Visita Sem Interesse", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "reserva", label: "Reserva de Imóvel", color: "#f59e0b", isInitial: true },
        { key: "vistoria", label: "Vistoria Realizada", color: "#38bdf8" },
        { key: "vigente", label: "Locação Vigente", color: "#10b981", isTerminalWon: true },
        { key: "encerrado", label: "Contrato Rescindido", color: "#64748b" },
      ],
    },
    mandatoryItemFields: ["name", "price", "property_type", "city", "bedrooms"],
    mandatoryCustomerFields: ["full_name", "cpf_cnpj", "phone", "email"],
    defaultSlaMinutes: {
      orderExecution: 28800,
      quoteResponse: 240,
      supportTicket: 120,
    },
    supportedDocuments: ["contract", "receipt"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: true,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: false,
      requiresDocumentValidation: true,
    },
  },

  // ── 7. SAÚDE, CLÍNICAS & BEM-ESTAR ──
  healthcare: {
    id: "healthcare",
    label: "Saúde & Estética",
    description: "Atendimento clínico, agendamento de consultas, prontuários simplificados e consentimento LGPD.",
    activeModules: ["catalog", "crm", "financial", "tasks", "support"],
    nomenclature: {
      itemSingular: "Procedimento / Consulta",
      itemPlural: "Procedimentos Médicos",
      orderSingular: "Consulta / Atendimento",
      orderPlural: "Atendimentos",
      customerSingular: "Paciente",
      customerPlural: "Pacientes",
      catalogLabel: "Serviços & Procedimentos",
      newItemLabel: "Novo Procedimento",
      primaryMetricLabel: "Consultas Realizadas",
      secondaryMetricLabel: "Taxa de Retorno",
    },
    defaultStages: {
      crm: [
        { key: "triage", label: "Triagem", color: "#94a3b8", isInitial: true },
        { key: "scheduled", label: "Agendado", color: "#38bdf8" },
        { key: "attended", label: "Atendido", color: "#10b981", isTerminalWon: true },
        { key: "no_show", label: "Não Compareceu", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "agendada", label: "Agendada", color: "#38bdf8", isInitial: true },
        { key: "em_atendimento", label: "Em Consulta", color: "#f59e0b" },
        { key: "concluida", label: "Finalizada", color: "#10b981", isTerminalWon: true },
      ],
    },
    mandatoryItemFields: ["name", "price", "duration_minutes"],
    mandatoryCustomerFields: ["full_name", "phone", "cpf_cnpj", "birth_date"],
    defaultSlaMinutes: {
      orderExecution: 120,
      quoteResponse: 60,
      supportTicket: 30,
    },
    supportedDocuments: ["receipt"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: false,
      requiresDocumentValidation: true,
    },
  },

  // ── 8. AUTOMOTIVO, OFICINAS & PEÇAS ──
  automotive: {
    id: "automotive",
    label: "Automotivo & Mecânica",
    description: "Check-in veicular por placa/chassi, ordens de serviço, mão de obra + peças e termos de garantia.",
    activeModules: ["catalog", "orders", "inventory", "financial", "crm", "tasks", "support"],
    nomenclature: {
      itemSingular: "Serviço / Peça",
      itemPlural: "Peças & Serviços",
      orderSingular: "Ordem de Serviço (OS)",
      orderPlural: "Ordens de Serviço",
      customerSingular: "Proprietário / Condutor",
      customerPlural: "Clientes",
      catalogLabel: "Tabela de Serviços & Peças",
      newItemLabel: "Adicionar Peça / Mão de Obra",
      primaryMetricLabel: "Faturamento de Oficina",
      secondaryMetricLabel: "Ticket Médio por OS",
    },
    defaultStages: {
      crm: [
        { key: "orcamento", label: "Orçamento Solicitado", color: "#94a3b8", isInitial: true },
        { key: "aprovado", label: "OS Aprovada", color: "#10b981", isTerminalWon: true },
        { key: "recusado", label: "Não Aprovado", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "checkin", label: "Veículo na Oficina", color: "#f59e0b", isInitial: true },
        { key: "diagnostico", label: "Diagnóstico / Desmontagem", color: "#38bdf8" },
        { key: "execucao", label: "Serviço em Andamento", color: "#818cf8" },
        { key: "testes", label: "Teste de Rodagem", color: "#a855f7" },
        { key: "pronto", label: "Pronto para Retirada", color: "#10b981", isTerminalWon: true },
        { key: "entregue", label: "Entregue e Faturado", color: "#059669" },
      ],
    },
    mandatoryItemFields: ["name", "price"],
    mandatoryCustomerFields: ["full_name", "phone"],
    defaultSlaMinutes: {
      orderExecution: 2880,
      quoteResponse: 120,
      supportTicket: 120,
    },
    supportedDocuments: ["receipt", "quote"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: true,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: true,
      hasDigitalCompanion: false,
      hasLiveTracking: true,
      requiresDocumentValidation: false,
    },
  },

  // ── 9. EVENTOS, CASAMENTOS & FESTAS ──
  events: {
    id: "events",
    label: "Eventos & Cerimonial",
    description: "Planejamento de eventos, fornecedores, checklist com timeline regressiva e controle de convidados.",
    activeModules: ["catalog", "crm", "proposals", "contracts", "financial", "tasks", "support"],
    nomenclature: {
      itemSingular: "Pacote / Espaço",
      itemPlural: "Serviços de Evento",
      orderSingular: "Contrato de Evento",
      orderPlural: "Eventos Agendados",
      customerSingular: "Contratante / Noivos",
      customerPlural: "Clientes",
      catalogLabel: "Cardápio de Serviços de Evento",
      newItemLabel: "Novo Pacote de Evento",
      primaryMetricLabel: "Contratos Fechados",
      secondaryMetricLabel: "Custo Médio por Convidado",
    },
    defaultStages: {
      crm: [
        { key: "lead", label: "Novo Contato", color: "#94a3b8", isInitial: true },
        { key: "briefing", label: "Reunião de Alinhamento", color: "#38bdf8" },
        { key: "proposal", label: "Proposta Enviada", color: "#f59e0b" },
        { key: "contract", label: "Contrato Fechado", color: "#10b981", isTerminalWon: true },
        { key: "lost", label: "Data Não Fechada", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "planejamento", label: "Em Planejamento", color: "#f59e0b", isInitial: true },
        { key: "producao", label: "Produção / Montagem", color: "#38bdf8" },
        { key: "executando", label: "Evento Acontecendo", color: "#10b981" },
        { key: "pos_evento", label: "Desmontagem / Concluído", color: "#059669", isTerminalWon: true },
      ],
    },
    mandatoryItemFields: ["name", "price"],
    mandatoryCustomerFields: ["full_name", "phone", "email"],
    defaultSlaMinutes: {
      orderExecution: 14400,
      quoteResponse: 240,
      supportTicket: 120,
    },
    supportedDocuments: ["contract", "quote", "receipt"],
    flags: {
      hasTableManagement: true,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: false,
      requiresDocumentValidation: true,
    },
  },

  // ── 10. CRIADORES, INFLUENCERS & MÍDIA LOCAL ──
  creator: {
    id: "creator",
    label: "Criadores & Mídia Local",
    description: "Publicidade nativa, campanhas patrocinadas, mídia kit, link bio e monetização por afiliação.",
    activeModules: ["catalog", "crm", "contracts", "financial", "marketing", "affiliates", "support"],
    nomenclature: {
      itemSingular: "Formato / Publi",
      itemPlural: "Formatos Publicitários",
      orderSingular: "Campanha Patrocinada",
      orderPlural: "Campanhas Ativas",
      customerSingular: "Anunciante / Marca",
      customerPlural: "Marcas Parceiras",
      catalogLabel: "Mídia Kit & Formatos",
      newItemLabel: "Adicionar Formato",
      primaryMetricLabel: "Receita de Publicidade",
      secondaryMetricLabel: "Alcance Estimado",
    },
    defaultStages: {
      crm: [
        { key: "inbound", label: "Marca Interessada", color: "#94a3b8", isInitial: true },
        { key: "mediakit", label: "Mídia Kit Enviado", color: "#38bdf8" },
        { key: "negotiation", label: "Alinhamento de Roteiro", color: "#f59e0b" },
        { key: "approved", label: "Campanha Aprovada", color: "#10b981", isTerminalWon: true },
        { key: "declined", label: "Não Fechado", color: "#ef4444", isTerminalLost: true },
      ],
      orders: [
        { key: "gravacao", label: "Em Gravação", color: "#f59e0b", isInitial: true },
        { key: "aprovacao_marca", label: "Aprovação do Conteúdo", color: "#38bdf8" },
        { key: "publicado", label: "Publicado no Ar", color: "#10b981" },
        { key: "relatorio_entregue", label: "Relatório & Concluído", color: "#059669", isTerminalWon: true },
      ],
    },
    mandatoryItemFields: ["name", "price"],
    mandatoryCustomerFields: ["full_name", "email"],
    defaultSlaMinutes: {
      orderExecution: 4320,
      quoteResponse: 120,
      supportTicket: 120,
    },
    supportedDocuments: ["contract", "receipt"],
    flags: {
      hasTableManagement: false,
      hasFleetTracking: false,
      hasPassengerManifest: false,
      hasRecipeIngredients: false,
      hasRoomAllotment: false,
      hasWarrantyTerms: false,
      hasDigitalCompanion: false,
      hasLiveTracking: false,
      requiresDocumentValidation: false,
    },
  },
};

/**
 * Resolução Canônica do Manifesto de Nicho com fallback determinístico para "generic".
 */
export function getNicheManifest(nicheId?: string | null): NicheManifest {
  if (!nicheId) return NICHE_MANIFEST_REGISTRY.generic;

  const normalized = nicheId.toLowerCase().trim();

  // Mapeamentos de aliases e termos de CNAE comuns
  if (normalized === "turismo" || normalized.includes("viag") || normalized.includes("turis") || normalized.includes("hotel")) {
    return NICHE_MANIFEST_REGISTRY.tourism;
  }
  if (normalized === "gastronomia" || normalized.includes("restauran") || normalized.includes("pizz") || normalized.includes("bar") || normalized.includes("lanche")) {
    return NICHE_MANIFEST_REGISTRY.gastronomy;
  }
  if (normalized === "varejo" || normalized.includes("loja") || normalized.includes("moda") || normalized.includes("calcado")) {
    return NICHE_MANIFEST_REGISTRY.retail;
  }
  if (normalized === "servicos" || normalized.includes("consult") || normalized.includes("advoc") || normalized.includes("agenc")) {
    return NICHE_MANIFEST_REGISTRY.services;
  }
  if (normalized === "imobiliaria" || normalized.includes("imove") || normalized.includes("locac")) {
    return NICHE_MANIFEST_REGISTRY.real_estate;
  }
  if (normalized === "saude" || normalized.includes("clinic") || normalized.includes("medic") || normalized.includes("dent")) {
    return NICHE_MANIFEST_REGISTRY.healthcare;
  }
  if (normalized === "oficina" || normalized.includes("auto") || normalized.includes("mecanic") || normalized.includes("peça")) {
    return NICHE_MANIFEST_REGISTRY.automotive;
  }
  if (normalized === "evento" || normalized.includes("casament") || normalized.includes("festa") || normalized.includes("show")) {
    return NICHE_MANIFEST_REGISTRY.events;
  }
  if (normalized === "criador" || normalized.includes("influenc") || normalized.includes("creator") || normalized.includes("midia")) {
    return NICHE_MANIFEST_REGISTRY.creator;
  }

  return (NICHE_MANIFEST_REGISTRY as Record<string, NicheManifest>)[normalized] || NICHE_MANIFEST_REGISTRY.generic;
}

/**
 * Verifica se determinado módulo está ativo para o nicho configurado da organização.
 */
export function isModuleActiveForNiche(moduleKey: NicheModuleKey, nicheId?: string | null): boolean {
  const manifest = getNicheManifest(nicheId);
  return manifest.activeModules.includes(moduleKey);
}

/**
 * Retorna a nomenclatura polimórfica para um determinado nicho.
 */
export function getNicheNomenclature(nicheId?: string | null): NicheEntityNomenclature {
  return getNicheManifest(nicheId).nomenclature;
}

/**
 * Retorna os estágios canônicos de CRM ou Pedidos de acordo com o nicho.
 */
export function getNicheStages(type: "crm" | "orders" | "reservations", nicheId?: string | null): NicheStageConfig[] {
  const manifest = getNicheManifest(nicheId);
  if (type === "reservations") {
    return manifest.defaultStages.reservations || manifest.defaultStages.orders;
  }
  return manifest.defaultStages[type] || [];
}
