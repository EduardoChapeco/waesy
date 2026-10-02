/**
 * Dicionário Universal de Nichos e Tradução Semântica (Waesy Omni-Niche)
 *
 * Fornece a metamorfose terminológica completa para que qualquer tela,
 * tabela, modal, toast ou empty state renderize as palavras naturais do segmento
 * comercial da loja (ex: "Prato" em Gastronomia, "Imóvel" em Imobiliária,
 * "Paciente" em Clínicas, "Serviço" em Barbearias).
 *
 * MASTER PROMPT V138: Micro-Copy Metamorphosis & Niche Design Tokenization.
 */

import { getNicheSemantics, NicheSemantics } from "@/lib/niche-semantics";

export type NicheTermKey =
  | "client"
  | "clients"
  | "item"
  | "items"
  | "catalog"
  | "newItem"
  | "editItem"
  | "order"
  | "orders"
  | "stock"
  | "kds"
  | "price"
  | "sku"
  | "categories"
  | "newCategory"
  | "modifiers"
  | "newModifier"
  | "searchPlaceholder"
  | "emptyText"
  // V138: Micro-Copy Metamorphosis & Taxonomy Tokens
  | "createSuccessToast"
  | "updateSuccessToast"
  | "deleteSuccessToast"
  | "deleteConfirmTitle"
  | "deleteConfirmDescription"
  | "emptyStateCatalogTitle"
  | "emptyStateCatalogDescription"
  | "emptyStateOrdersTitle"
  | "emptyStateOrdersDescription"
  | "notificationConfirmedTitle"
  | "notificationConfirmedBody"
  | "themeClass";

export interface NicheDictionaryTerms {
  client: string;
  clients: string;
  item: string;
  items: string;
  catalog: string;
  newItem: string;
  editItem: string;
  order: string;
  orders: string;
  stock: string;
  kds: string;
  price: string;
  sku: string;
  categories: string;
  newCategory: string;
  modifiers: string;
  newModifier: string;
  searchPlaceholder: string;
  emptyText: string;
  // V138 Micro-Copy
  createSuccessToast: string;
  updateSuccessToast: string;
  deleteSuccessToast: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  emptyStateCatalogTitle: string;
  emptyStateCatalogDescription: string;
  emptyStateOrdersTitle: string;
  emptyStateOrdersDescription: string;
  notificationConfirmedTitle: string;
  notificationConfirmedBody: string;
  themeClass: string;
}

export const NICHE_DICTIONARY_REGISTRY: Record<string, NicheDictionaryTerms> = {
  // 1. Gastronomia / Restaurantes / Bares / Dark Kitchens
  gastronomy: {
    client: "Cliente / Mesa",
    clients: "Clientes",
    item: "Prato / Lanche",
    items: "Pratos & Itens",
    catalog: "Cardápio",
    newItem: "Novo Item no Cardápio",
    editItem: "Editar Item",
    order: "Comanda / Pedido",
    orders: "Pedidos da Cozinha",
    stock: "Insumos & Despensa",
    kds: "Gestor de Pedidos (KDS)",
    price: "Preço de Venda",
    sku: "Código do Item",
    categories: "Seções do Cardápio",
    newCategory: "Nova Seção",
    modifiers: "Adicionais & Opcionais",
    newModifier: "Novo Adicional",
    searchPlaceholder: "Buscar prato, bebida ou lanche...",
    emptyText: "Nenhum prato ou item no cardápio.",
    themeClass: "theme-gastronomy",
    createSuccessToast: "Item adicionado ao cardápio com sucesso!",
    updateSuccessToast: "Item do cardápio atualizado!",
    deleteSuccessToast: "Item removido do cardápio.",
    deleteConfirmTitle: "Deseja remover este item do cardápio?",
    deleteConfirmDescription: "O prato ou bebida deixará de estar disponível para pedidos e no delivery.",
    emptyStateCatalogTitle: "Seu cardápio está vazio",
    emptyStateCatalogDescription: "Adicione seus pratos, porções e bebidas para começar a receber comandas.",
    emptyStateOrdersTitle: "Nenhum pedido na cozinha",
    emptyStateOrdersDescription: "Os pedidos realizados pelos clientes entrarão diretamente no monitor KDS.",
    notificationConfirmedTitle: "Pedido em Preparo",
    notificationConfirmedBody: "Seu pedido foi confirmado e está sendo preparado pela cozinha.",
  },

  // 2. Serviços / Barbearia / Salão / Estética
  services: {
    client: "Cliente",
    clients: "Clientes",
    item: "Serviço",
    items: "Serviços",
    catalog: "Catálogo de Serviços",
    newItem: "Cadastrar Serviço",
    editItem: "Editar Serviço",
    order: "Atendimento / Comanda",
    orders: "Agendamentos & Comandas",
    stock: "Produtos Homecare",
    kds: "Fila de Atendimento",
    price: "Valor do Serviço",
    sku: "Código do Serviço",
    categories: "Especialidades",
    newCategory: "Nova Especialidade",
    modifiers: "Procedimentos Extras",
    newModifier: "Novo Extra",
    searchPlaceholder: "Buscar serviço ou profissional...",
    emptyText: "Nenhum serviço cadastrado na grade.",
    themeClass: "theme-health",
    createSuccessToast: "Serviço cadastrado com sucesso!",
    updateSuccessToast: "Serviço atualizado com sucesso!",
    deleteSuccessToast: "Serviço removido da grade.",
    deleteConfirmTitle: "Deseja remover este serviço?",
    deleteConfirmDescription: "O procedimento não poderá mais ser agendado por clientes.",
    emptyStateCatalogTitle: "Sua grade de serviços está vazia",
    emptyStateCatalogDescription: "Cadastre os serviços e procedimentos para abrir a agenda aos seus clientes.",
    emptyStateOrdersTitle: "Sua agenda está livre",
    emptyStateOrdersDescription: "Os atendimentos agendados para hoje aparecerão aqui em tempo real.",
    notificationConfirmedTitle: "Horário Confirmado",
    notificationConfirmedBody: "Seu horário foi confirmado na agenda do profissional.",
  },

  // 3. Clínicas Médicas / Saúde / Odontologia (MASTER PROMPT V138)
  clinica: {
    client: "Paciente",
    clients: "Pacientes",
    item: "Consulta / Exame",
    items: "Procedimentos & Consultas",
    catalog: "Grade Clínica & Procedimentos",
    newItem: "Nova Consulta / Especialidade",
    editItem: "Editar Procedimento",
    order: "Consulta / Atendimento",
    orders: "Consultas & Prontuários",
    stock: "Materiais Médicos & Insumos",
    kds: "Triagem & Chamada de Consultório",
    price: "Valor da Consulta",
    sku: "Código TUSS / Procedimento",
    categories: "Especialidades Médicas",
    newCategory: "Nova Especialidade",
    modifiers: "Exames Complementares",
    newModifier: "Novo Exame",
    searchPlaceholder: "Buscar paciente, médico ou procedimento...",
    emptyText: "Nenhum paciente ou procedimento agendado.",
    themeClass: "theme-health",
    createSuccessToast: "Consulta agendada com sucesso!",
    updateSuccessToast: "Prontuário/consulta atualizada com sucesso!",
    deleteSuccessToast: "Horário liberado na agenda clínica.",
    deleteConfirmTitle: "Deseja cancelar esta consulta médica?",
    deleteConfirmDescription: "Esta ação liberará o horário na grade do corpo clínico.",
    emptyStateCatalogTitle: "Nenhum procedimento na grade clínica",
    emptyStateCatalogDescription: "Cadastre especialidades médicas e exames para disponibilizar horários.",
    emptyStateOrdersTitle: "Sua agenda clínica está livre hoje",
    emptyStateOrdersDescription: "Os pacientes agendados para triagem e consulta aparecerão aqui.",
    notificationConfirmedTitle: "Consulta Médica Confirmada",
    notificationConfirmedBody: "Sua consulta foi agendada e confirmada no corpo clínico.",
  },

  // 4. Imóveis / Imobiliária / Corretagem (MASTER PROMPT V138)
  real_estate: {
    client: "Inquilino / Comprador",
    clients: "Interessados & Inquilinos",
    item: "Imóvel",
    items: "Imóveis",
    catalog: "Carteira de Imóveis",
    newItem: "Cadastrar Imóvel",
    editItem: "Editar Imóvel",
    order: "Proposta / Negociação",
    orders: "Propostas & Contratos",
    stock: "Chaves & Unidades",
    kds: "Funil de Vistorias",
    price: "Valor de Venda / Aluguel",
    sku: "Código do Imóvel (Ref)",
    categories: "Tipos de Imóvel",
    newCategory: "Novo Tipo",
    modifiers: "Comodidades & Lazer",
    newModifier: "Nova Comodidade",
    searchPlaceholder: "Buscar por bairro, condomínio ou ref...",
    emptyText: "Nenhum imóvel cadastrado na carteira.",
    themeClass: "theme-luxury",
    createSuccessToast: "Imóvel cadastrado com sucesso!",
    updateSuccessToast: "Ficha do imóvel atualizada com sucesso!",
    deleteSuccessToast: "Imóvel arquivado da carteira.",
    deleteConfirmTitle: "Deseja remover este imóvel da carteira?",
    deleteConfirmDescription: "O imóvel sairá imediatamente da vitrine pública e portais imobiliários.",
    emptyStateCatalogTitle: "Nenhum imóvel em captação",
    emptyStateCatalogDescription: "Cadastre seus primeiros imóveis à venda ou locação para começar a receber propostas.",
    emptyStateOrdersTitle: "Nenhuma proposta comercial ativa",
    emptyStateOrdersDescription: "As propostas de compra, locação e vistorias aparecerão neste funil.",
    notificationConfirmedTitle: "Proposta Comercial Recebida",
    notificationConfirmedBody: "Uma nova proposta de negociação foi registrada para o imóvel.",
  },

  // 5. Turismo / Agência de Viagens / Receptivo
  tourism: {
    client: "Viajante",
    clients: "Viajantes / CRM",
    item: "Pacote / Roteiro",
    items: "Pacotes & Roteiros",
    catalog: "Roteiros & Destinos",
    newItem: "Novo Pacote",
    editItem: "Editar Pacote",
    order: "Cotação / Reserva",
    orders: "Cotações & Propostas",
    stock: "Vagas & Poltronas",
    kds: "Central de Embarque",
    price: "Valor por Pessoa",
    sku: "Código do Roteiro",
    categories: "Categorias de Destino",
    newCategory: "Nova Categoria",
    modifiers: "Opcionais & Passeios",
    newModifier: "Novo Passeio",
    searchPlaceholder: "Buscar pacote por destino ou data...",
    emptyText: "Nenhum pacote publicado ainda.",
    themeClass: "theme-luxury",
    createSuccessToast: "Roteiro de viagem publicado com sucesso!",
    updateSuccessToast: "Roteiro atualizado com sucesso!",
    deleteSuccessToast: "Roteiro arquivado da temporada.",
    deleteConfirmTitle: "Deseja arquivar este roteiro de viagem?",
    deleteConfirmDescription: "As novas cotações e reservas serão pausadas para esta saída.",
    emptyStateCatalogTitle: "Nenhum roteiro publicado",
    emptyStateCatalogDescription: "Cadastre pacotes, destinos e datas de saída para receber passageiros.",
    emptyStateOrdersTitle: "Nenhuma cotação de viagem aberta",
    emptyStateOrdersDescription: "As solicitações de viagens e propostas contratuais aparecerão aqui.",
    notificationConfirmedTitle: "Voucher de Viagem Emitido",
    notificationConfirmedBody: "Sua reserva e voucher de embarque foram confirmados com sucesso.",
  },

  // 6. Criadores / Cursos / Infoprodutos (MASTER PROMPT V138)
  creators: {
    client: "Aluno / Seguidor",
    clients: "Comunidade & Alunos",
    item: "Infoproduto",
    items: "Infoprodutos & Cursos",
    catalog: "Vitrine de Cursos",
    newItem: "Publicar Infoproduto",
    editItem: "Editar Infoproduto",
    order: "Matrícula / Inscrição",
    orders: "Vendas & Matrículas",
    stock: "Vagas Disponíveis",
    kds: "Comunidade ao Vivo",
    price: "Valor da Inscrição",
    sku: "Código da Turma",
    categories: "Formatos & Trilhas",
    newCategory: "Nova Trilha",
    modifiers: "Módulos & Bônus",
    newModifier: "Novo Bônus",
    searchPlaceholder: "Buscar curso, aula ou mentoria...",
    emptyText: "Nenhum infoproduto publicado.",
    themeClass: "theme-creator",
    createSuccessToast: "Infoproduto publicado com sucesso!",
    updateSuccessToast: "Oferta atualizada com sucesso!",
    deleteSuccessToast: "Conteúdo removido da vitrine.",
    deleteConfirmTitle: "Deseja despublicar este conteúdo?",
    deleteConfirmDescription: "Os membros da comunidade e alunos não terão mais acesso à compra.",
    emptyStateCatalogTitle: "Nenhum infoproduto publicado",
    emptyStateCatalogDescription: "Crie seu primeiro curso, mentoria ou material exclusivo para começar a vender.",
    emptyStateOrdersTitle: "Nenhuma matrícula recente",
    emptyStateOrdersDescription: "As novas assinaturas e vendas de infoprodutos aparecerão aqui.",
    notificationConfirmedTitle: "Acesso Liberado",
    notificationConfirmedBody: "Seu acesso ao conteúdo e comunidade foi liberado com sucesso!",
  },

  // 7. Jurídico / Advocacia
  legal: {
    client: "Cliente / Assistido",
    clients: "Clientes & Assistidos",
    item: "Serviço Jurídico",
    items: "Serviços Jurídicos",
    catalog: "Honorários & Serviços",
    newItem: "Novo Serviço Jurídico",
    editItem: "Editar Serviço",
    order: "Processo / Pasta",
    orders: "Processos & Prazos",
    stock: "Processos Ativos",
    kds: "Prazos & Audiências",
    price: "Valor dos Honorários",
    sku: "Código da Pasta",
    categories: "Ramos do Direito",
    newCategory: "Novo Ramo",
    modifiers: "Pareceres & Recursos",
    newModifier: "Novo Opcional",
    searchPlaceholder: "Buscar por processo ou cliente...",
    emptyText: "Nenhum processo ou serviço cadastrado.",
    themeClass: "theme-luxury",
    createSuccessToast: "Serviço jurídico cadastrado!",
    updateSuccessToast: "Pasta jurídica atualizada!",
    deleteSuccessToast: "Serviço arquivado.",
    deleteConfirmTitle: "Deseja arquivar este processo ou serviço?",
    deleteConfirmDescription: "Os registros históricos continuarão preservados para auditoria.",
    emptyStateCatalogTitle: "Nenhum serviço jurídico registrado",
    emptyStateCatalogDescription: "Cadastre os tipos de consultoria e honorários do escritório.",
    emptyStateOrdersTitle: "Nenhum processo em andamento",
    emptyStateOrdersDescription: "Os contratos assinados e pastas de clientes aparecerão aqui.",
    notificationConfirmedTitle: "Contrato Jurídico Ativo",
    notificationConfirmedBody: "Seu contrato de prestação de serviços jurídicos foi homologado.",
  },

  // 8. Veículos & Concessionárias
  vehicles: {
    client: "Comprador",
    clients: "Compradores & Leads",
    item: "Veículo",
    items: "Estoque de Veículos",
    catalog: "Pátio de Veículos",
    newItem: "Cadastrar Veículo",
    editItem: "Editar Veículo",
    order: "Proposta de Compra",
    orders: "Propostas & Vendas",
    stock: "Veículos no Pátio",
    kds: "Preparação & Vistoria",
    price: "Preço do Veículo",
    sku: "Placa / Chassi",
    categories: "Categorias de Carros",
    newCategory: "Nova Categoria",
    modifiers: "Garantia & Opcionais",
    newModifier: "Novo Opcional",
    searchPlaceholder: "Buscar por marca, modelo ou placa...",
    emptyText: "Nenhum veículo no pátio.",
    themeClass: "theme-luxury",
    createSuccessToast: "Veículo cadastrado no pátio com sucesso!",
    updateSuccessToast: "Ficha do veículo atualizada!",
    deleteSuccessToast: "Veículo baixado do pátio.",
    deleteConfirmTitle: "Deseja remover este veículo do pátio?",
    deleteConfirmDescription: "O anúncio será encerrado e a placa será desvinculada do estoque.",
    emptyStateCatalogTitle: "Nenhum veículo no pátio",
    emptyStateCatalogDescription: "Adicione novos carros e motos ao estoque para começar a receber propostas.",
    emptyStateOrdersTitle: "Nenhuma proposta de compra ativa",
    emptyStateOrdersDescription: "As ofertas de compra e intenções de financiamento aparecerão aqui.",
    notificationConfirmedTitle: "Proposta de Compra Aprovada",
    notificationConfirmedBody: "Sua proposta para o veículo foi aceita pela concessionária.",
  },

  // 9. Vagas & Recrutamento (RH)
  jobs: {
    client: "Candidato / Talento",
    clients: "Banco de Talentos",
    item: "Vaga",
    items: "Vagas Abertas",
    catalog: "Mural de Vagas",
    newItem: "Publicar Vaga",
    editItem: "Editar Vaga",
    order: "Candidatura",
    orders: "Candidaturas Recebidas",
    stock: "Vagas Abertas",
    kds: "Triagem & Entrevistas",
    price: "Faixa Salarial",
    sku: "Código da Vaga",
    categories: "Áreas de Atuação",
    newCategory: "Nova Área",
    modifiers: "Benefícios Inclusos",
    newModifier: "Novo Benefício",
    searchPlaceholder: "Buscar vaga ou cargo...",
    emptyText: "Nenhuma vaga publicada.",
    themeClass: "theme-default",
    createSuccessToast: "Vaga publicada com sucesso!",
    updateSuccessToast: "Vaga atualizada com sucesso!",
    deleteSuccessToast: "Processo seletivo encerrado.",
    deleteConfirmTitle: "Deseja encerrar esta vaga?",
    deleteConfirmDescription: "Novas candidaturas serão bloqueadas.",
    emptyStateCatalogTitle: "Nenhuma vaga aberta",
    emptyStateCatalogDescription: "Publique oportunidades para atrair talentos da região.",
    emptyStateOrdersTitle: "Nenhuma candidatura recebida",
    emptyStateOrdersDescription: "Os currículos e candidaturas de profissionais aparecerão aqui.",
    notificationConfirmedTitle: "Candidatura Recebida",
    notificationConfirmedBody: "Sua candidatura foi registrada e está em triagem pelo recrutador.",
  },

  // 10. Eventos & Ingressos
  events: {
    client: "Participante",
    clients: "Participantes",
    item: "Ingresso / Lote",
    items: "Ingressos & Lotes",
    catalog: "Lotes & Ingressos",
    newItem: "Novo Lote",
    editItem: "Editar Lote",
    order: "Ingresso Emitido",
    orders: "Ingressos & Vendas",
    stock: "Ingressos Disponíveis",
    kds: "Controle de Portaria",
    price: "Valor do Ingresso",
    sku: "Código do Lote",
    categories: "Setores & Áreas",
    newCategory: "Novo Setor",
    modifiers: "Consumação & Extras",
    newModifier: "Novo Extra",
    searchPlaceholder: "Buscar ingresso ou participante...",
    emptyText: "Nenhum ingresso emitido.",
    themeClass: "theme-creator",
    createSuccessToast: "Lote de ingressos aberto!",
    updateSuccessToast: "Lote de ingressos atualizado!",
    deleteSuccessToast: "Lote encerrado.",
    deleteConfirmTitle: "Deseja encerrar as vendas deste lote?",
    deleteConfirmDescription: "Novos ingressos não poderão mais ser emitidos neste valor.",
    emptyStateCatalogTitle: "Nenhum lote de ingresso ativo",
    emptyStateCatalogDescription: "Cadastre os setores e lotes do evento para abrir a bilheteria.",
    emptyStateOrdersTitle: "Nenhum ingresso vendido ainda",
    emptyStateOrdersDescription: "Os ingressos emitidos aparecerão em tempo real.",
    notificationConfirmedTitle: "Ingresso Emitido com Sucesso",
    notificationConfirmedBody: "Seu ingresso digital com QR Code está disponível para validação na portaria.",
  },

  // 11. Assistência Técnica / Reparos
  tech_repair: {
    client: "Cliente",
    clients: "Clientes",
    item: "Reparo / Peça",
    items: "Peças & Serviços",
    catalog: "Tabela de Reparos",
    newItem: "Novo Reparo",
    editItem: "Editar Reparo",
    order: "Ordem de Serviço (OS)",
    orders: "Ordens de Serviço (OS)",
    stock: "Estoque de Peças",
    kds: "Bancada de Reparos",
    price: "Valor da Peça / Serviço",
    sku: "Código da Peça",
    categories: "Marcas & Modelos",
    newCategory: "Novo Modelo",
    modifiers: "Garantia & Acessórios",
    newModifier: "Nova Garantia",
    searchPlaceholder: "Buscar aparelho ou OS...",
    emptyText: "Nenhuma ordem de serviço ativa.",
    themeClass: "theme-default",
    createSuccessToast: "Ordem de serviço aberta!",
    updateSuccessToast: "Ordem de serviço atualizada!",
    deleteSuccessToast: "Ordem de serviço cancelada.",
    deleteConfirmTitle: "Deseja cancelar esta ordem de serviço?",
    deleteConfirmDescription: "O aparelho será liberado sem reparo.",
    emptyStateCatalogTitle: "Nenhum reparo cadastrado",
    emptyStateCatalogDescription: "Cadastre os serviços de bancada e peças.",
    emptyStateOrdersTitle: "Bancada livre",
    emptyStateOrdersDescription: "Nenhum aparelho em reparo no momento.",
    notificationConfirmedTitle: "Reparo Concluído",
    notificationConfirmedBody: "Seu aparelho foi consertado e está pronto para retirada na assistência.",
  },

  // 12. Varejo / Comércio Geral (Padrão)
  retail: {
    client: "Cliente",
    clients: "Clientes",
    item: "Produto",
    items: "Produtos",
    catalog: "Catálogo de Produtos",
    newItem: "Novo Produto",
    editItem: "Editar Produto",
    order: "Venda / Pedido",
    orders: "Histórico de Vendas",
    stock: "Estoque Físico",
    kds: "Separação & Despacho",
    price: "Preço de Venda",
    sku: "SKU / Código de Barras",
    categories: "Categorias de Produtos",
    newCategory: "Nova Categoria",
    modifiers: "Grades & Variações",
    newModifier: "Nova Grade",
    searchPlaceholder: "Buscar produto por nome ou código...",
    emptyText: "Nenhum produto cadastrado.",
    themeClass: "theme-default",
    createSuccessToast: "Produto cadastrado com sucesso!",
    updateSuccessToast: "Produto atualizado com sucesso!",
    deleteSuccessToast: "Produto excluído com sucesso.",
    deleteConfirmTitle: "Deseja excluir este produto?",
    deleteConfirmDescription: "O produto será removido do catálogo e estoque da loja.",
    emptyStateCatalogTitle: "Nenhum produto cadastrado",
    emptyStateCatalogDescription: "Adicione produtos ao seu catálogo para começar a vender online e no balcão.",
    emptyStateOrdersTitle: "Nenhum pedido recebido",
    emptyStateOrdersDescription: "Quando seus clientes realizarem compras, os pedidos aparecerão aqui.",
    notificationConfirmedTitle: "Pedido Confirmado",
    notificationConfirmedBody: "Seu pedido foi confirmado com sucesso e está sendo processado.",
  },
};

/**
 * Tradutor Puro de Nicho.
 * Retorna a palavra certa de acordo com o nicheId.
 */
export function getNicheTranslation(nicheIdOrStoreData: string | any): {
  nicheId: string;
  semantics: NicheSemantics;
  t: (key: NicheTermKey, fallback?: string) => string;
  terms: NicheDictionaryTerms;
  themeClass: string;
} {
  let nicheId = "retail";
  let semantics: NicheSemantics;

  if (typeof nicheIdOrStoreData === "string") {
    nicheId = nicheIdOrStoreData;
    semantics = getNicheSemantics({ segment: nicheId });
  } else if (nicheIdOrStoreData) {
    semantics = getNicheSemantics(nicheIdOrStoreData);
    nicheId = semantics.nicheId || "retail";
  } else {
    semantics = getNicheSemantics({});
  }

  const terms =
    NICHE_DICTIONARY_REGISTRY[nicheId] ||
    NICHE_DICTIONARY_REGISTRY.retail;

  const t = (key: NicheTermKey, fallback?: string): string => {
    return terms[key] || fallback || terms.item;
  };

  return {
    nicheId,
    semantics,
    t,
    terms,
    themeClass: terms.themeClass || "theme-default",
  };
}
