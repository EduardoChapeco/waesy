/**
 * Biblioteca Canônica de Semântica e Terminologia Contextual por Nicho (Waesy)
 *
 * Fornece a identidade semântica completa para adaptar títulos, botões de ação,
 * labels, placeholders, tipos de pedidos e termos operacionais de acordo com
 * o segmento comercial ativo da loja.
 */

export interface NicheQuickAction {
 label: string;
 path: string;
 iconName?: string;
}

export interface NicheKpiMetric {
 id: string;
 label: string;
 description: string;
 format: "currency" | "percent" | "number" | "duration";
}

export interface NicheSemantics {
 nicheId: string;
 isFoodBusiness?: boolean;
 name: string;
 itemSingular: string;
 itemPlural: string;
 catalogTitle: string;
 newItemAction: string;
 editItemAction: string;
 categoriesLabel: string;
 newCategoryAction: string;
 modifiersLabel: string;
 newModifierAction: string;
 ordersLabel: string;
 kdsLabel: string;
 customerLabel: string;
 stockLabel: string;
 searchItemPlaceholder: string;
 emptyCatalogText: string;
 priceLabel: string;
 skuLabel: string;
 preparationOrDurationLabel?: string;
 primaryQuickAction?: NicheQuickAction;
 secondaryQuickAction?: NicheQuickAction;
 posServiceModes: Array<{ id: string; label: string; placeholder?: string }>;
 suggestedPresets: Array<{ name: string; type: "single" | "multiple"; desc: string }>;
 kpiMetrics?: NicheKpiMetric[];
 operationalTips?: string[];
 // Identidade de Compartilhamento & QR Code Canônico por Nicho
 shareTitle?: string;
 shareSubtitle?: string;
 qrCardCallout?: string;
 directLinkLabel?: string;
 shareMessageTemplate?: (storeName: string, storeUrl: string) => string;
 qrDownloadFilename?: string;
 // Identidade de Modificadores / Complementos / Opcionais por Nicho
 modifierModalSubtitle?: string;
 modifierNotesPlaceholder?: string;
 modifierEmptyText?: string;
 modifierNotesLabel?: string;
 // Departamentos de Atendimento por Nicho
 departmentLabels?: Record<string, string>;
 // Status de Pedidos / Propostas por Nicho
 orderStatusMap?: Record<
 string,
 {
 label: string;
 variant: "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning";
 }
 >;
}

export const NICHE_SEMANTICS_REGISTRY: Record<string, NicheSemantics> = {
 // 1. GASTRONOMIA, RESTAURANTES & DELIVERY
 gastronomy: {
 nicheId: "gastronomy",
 name: "Gastronomia & Delivery",
 itemSingular: "Prato / Lanche",
 itemPlural: "Pratos & Itens",
 catalogTitle: "Cardápio & Itens",
 newItemAction: "Adicionar ao Cardápio",
 editItemAction: "Editar Item do Cardápio",
 categoriesLabel: "Categorias do Menu",
 newCategoryAction: "Nova Seção do Cardápio",
 modifiersLabel: "Adicionais & Opcionais",
 newModifierAction: "Novo Grupo de Adicionais",
 ordersLabel: "Pedidos & Cozinha",
 kdsLabel: "Gestor de Pedidos (KDS)",
 customerLabel: "Clientes",
 stockLabel: "Controle de Insumos",
 searchItemPlaceholder: "Buscar por prato, lanche, bebida ou código...",
 emptyCatalogText: "Nenhum prato ou item cadastrado no cardápio ainda.",
 priceLabel: "Preço de Venda",
 skuLabel: "Código do Item / PDV",
 preparationOrDurationLabel: "Tempo Estimado de Preparo (minutos)",
 primaryQuickAction: { label: "Gestor de Pedidos (KDS)", path: "/workspace/pedidos/gestor" },
 secondaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 posServiceModes: [
 { id: "counter", label: "Balcão (Takeout)", placeholder: "Nome do Cliente" },
 { id: "table", label: "Mesa (Salão)", placeholder: "Número da Mesa (ex: 04)" },
 { id: "tab", label: "Comanda", placeholder: "Número da Comanda (ex: 12)" },
 { id: "delivery", label: "Delivery", placeholder: "Endereço / Telefone" },
 ],
 suggestedPresets: [
 { name: "Adicionais Pagos (Bacon, Queijo, Molhos)", type: "multiple", desc: "Permite escolher vários extras com valor adicional" },
 { name: "Ponto da Carne (Ao Ponto, Bem Passado)", type: "single", desc: "Escolha obrigatória de 1 opção sem acréscimo" },
 { name: "Bebida Acompanhamento", type: "single", desc: "Oferta de bebida em combo" },
 { name: "Tamanho da Porção (Individual, Médio, Família)", type: "single", desc: "Variação de tamanho da refeição" },
 ],
 kpiMetrics: [
 { id: "ticket_medio_mesa", label: "Ticket Médio por Mesa / Pedido", description: "Valor médio faturado por comanda ou entrega", format: "currency" },
 { id: "tempo_medio_kds", label: "Tempo Médio de Preparo", description: "Duração média entre pedido e expedição pela cozinha", format: "duration" },
 { id: "mesas_ativas", label: "Mesas & Comandas Abertas", description: "Capacidade operacional em atendimento simultâneo no salão", format: "number" },
 { id: "taxa_cancelamento", label: "Índice de Cancelamentos", description: "Percentual de pedidos estornados ou cancelados", format: "percent" },
 ],
 operationalTips: [
 "Monitore a tela do KDS da cozinha para reduzir o tempo de espera dos pratos nos horários de pico.",
 "Utilize comandas digitais vinculadas às mesas para evitar fechamento divergente no caixa.",
 "Cadastre adicionais e opcionais pagos para aumentar o ticket médio dos hambúrgueres e porções.",
 ],
 },

 // 2. VAREJO, MODA & CALÇADOS
 retail: {
 nicheId: "retail",
 name: "Varejo, Moda & Acessórios",
 itemSingular: "Produto",
 itemPlural: "Produtos",
 catalogTitle: "Catálogo & Estoque",
 newItemAction: "Novo Produto",
 editItemAction: "Editar Produto",
 categoriesLabel: "Categorias de Produto",
 newCategoryAction: "Nova Categoria",
 modifiersLabel: "Grades (Cores & Tamanhos)",
 newModifierAction: "Novo Grupo de Grade",
 ordersLabel: "Histórico de Vendas",
 kdsLabel: "Separação & Despacho",
 customerLabel: "Clientes",
 stockLabel: "Estoque & Movimentos",
 searchItemPlaceholder: "Buscar produto por nome, marca, SKU ou código de barras...",
 emptyCatalogText: "Nenhum produto cadastrado no catálogo ainda.",
 priceLabel: "Preço de Venda",
 skuLabel: "SKU / Código de Barras",
 primaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 secondaryQuickAction: { label: "Catálogo & Estoque", path: "/workspace/catalogo/produtos" },
 posServiceModes: [
 { id: "counter", label: "Balcão / Caixa", placeholder: "Nome do Cliente" },
 { id: "fitting", label: "Provador / Reserva", placeholder: "Identificação da Reserva" },
 { id: "delivery", label: "Envio Correios / Motoboy", placeholder: "Endereço de Entrega" },
 ],
 suggestedPresets: [
 { name: "Grade de Tamanhos (P, M, G, GG ou 36 ao 44)", type: "single", desc: "Seleção do tamanho do vestuário/calçado" },
 { name: "Variação de Cores", type: "single", desc: "Opção de cor da peça" },
 { name: "Embalagem para Presente Luxo", type: "single", desc: "Embalagem especial com cartão" },
 ],
 kpiMetrics: [
 { id: "giro_estoque", label: "Giro de Estoque", description: "Velocidade média de escoamento e renovação de peças", format: "number" },
 { id: "ticket_medio_varejo", label: "Ticket Médio por Venda", description: "Valor médio das compras realizadas na loja física e online", format: "currency" },
 { id: "pecas_por_atendimento", label: "Peças por Atendimento (PA)", description: "Média de itens adicionados a cada carrinho concluído", format: "number" },
 { id: "margem_bruta", label: "Margem Bruta Média", description: "Rentabilidade percentual sobre o custo dos produtos", format: "percent" },
 ],
 operationalTips: [
 "Mantenha as grades de cores e tamanhos atualizadas para não permitir venda de itens sem estoque físico.",
 "Ative promoções de 'Leve Mais por Menos' para alavancar o PA (Peças por Atendimento).",
 "Cadastre o código de barras (EAN) para leitura rápida com leitor óptico no PDV.",
 ],
 },

 // 3. TURISMO, AGÊNCIA DE VIAGENS & ROTEIROS
 tourism: {
 nicheId: "tourism",
 name: "Turismo & Viagens",
 itemSingular: "Pacote / Roteiro",
 itemPlural: "Pacotes & Roteiros",
 catalogTitle: "Pacotes & Roteiros",
 newItemAction: "Novo Pacote / Roteiro",
 editItemAction: "Editar Pacote",
 categoriesLabel: "Destinos & Categorias (Nacional, Internacional, Excursões)",
 newCategoryAction: "Nova Categoria de Destino",
 modifiersLabel: "Opcionais & Passeios Adicionais",
 newModifierAction: "Novo Pacote de Opcionais",
 ordersLabel: "Cotações & Propostas",
 kdsLabel: "Emissões & Roteiros",
 customerLabel: "Viajantes / CRM",
 stockLabel: "Vagas & Grupos Abertos",
 searchItemPlaceholder: "Buscar pacote por destino, código ou período...",
 emptyCatalogText: "Nenhum pacote ou roteiro publicado ainda.",
 priceLabel: "Valor por Pessoa / Pacote (R$)",
 skuLabel: "Código do Roteiro / Pacote",
 preparationOrDurationLabel: "Duração da Viagem (dias / noites)",
 primaryQuickAction: { label: "Grupos & Excursões", path: "/workspace/turismo/grupos" },
 secondaryQuickAction: { label: "Central de Cotações", path: "/workspace/turismo/cotacoes" },
 posServiceModes: [
 { id: "quote", label: "Nova Cotação", placeholder: "Nome do Viajante e Destino" },
 { id: "contract", label: "Contrato Digital", placeholder: "Código da Proposta / Token" },
 { id: "group", label: "Grupo / Excursão", placeholder: "Código do Grupo ANTT" },
 ],
 suggestedPresets: [
 { name: "Tipo de Acomodação (Single, Double, Triplo)", type: "single", desc: "Configuração de quarto no hotel" },
 { name: "Ponto de Embarque / Cidade", type: "single", desc: "Local de partida do ônibus ou aeroporto" },
 { name: "Regime de Alimentação (Café da Manhã, Meia Pensão, All-Inclusive)", type: "single", desc: "Plano de refeições incluso no pacote" },
 { name: "Seguro Viagem Internacional Cobertura Ampla", type: "single", desc: "Apólice médica e de bagagem complementar" },
 ],
 kpiMetrics: [
 { id: "taxa_ocupacao", label: "Ocupação Média da Frota", description: "Percentual de poltronas vendidas em relação à capacidade total", format: "percent" },
 { id: "break_even_pax", label: "Passageiros p/ Ponto de Equilíbrio", description: "Quantidade mínima de passageiros para cobrir custos fixos do ônibus/hotel", format: "number" },
 { id: "ticket_medio_pax", label: "Receita Média por Passageiro", description: "Valor médio pago por cliente incluindo opcionais e passeios", format: "currency" },
 { id: "saldo_caixa_viagem", label: "Saldo de Caixa em Viagem", description: "Disponibilidade financeira em trânsito com o guia e motorista", format: "currency" },
 ],
 operationalTips: [
 "Envie o Link Mágico pelo WhatsApp para o passageiro preencher seus documentos e assinar o contrato pelo celular.",
 "Utilize a Central de Embarque no celular para controlar o check-in dos passageiros com 1 toque na porta do veículo.",
 "Cadastre o Layout 2D da frota para garantir que a numeração das poltronas coincida exatamente com o ônibus da viagem.",
 ],
 },

 // 4. SERVIÇOS, BELEZA, ESTÉTICA & BARBEARIA
 services: {
 nicheId: "services",
 name: "Serviços, Beleza & Estética",
 itemSingular: "Procedimento / Serviço",
 itemPlural: "Serviços & Procedimentos",
 catalogTitle: "Catálogo de Serviços",
 newItemAction: "Cadastrar Serviço",
 editItemAction: "Editar Serviço",
 categoriesLabel: "Especialidades / Áreas",
 newCategoryAction: "Nova Especialidade",
 modifiersLabel: "Procedimentos Adicionais & Extras",
 newModifierAction: "Novo Grupo de Opcionais",
 ordersLabel: "Agendamentos & Comandas",
 kdsLabel: "Fila de Atendimento",
 customerLabel: "Clientes / Pacientes",
 stockLabel: "Produtos & Homecare",
 searchItemPlaceholder: "Buscar serviço ou profissional...",
 emptyCatalogText: "Nenhum serviço cadastrado na grade ainda.",
 priceLabel: "Valor do Serviço",
 skuLabel: "Código do Serviço",
 preparationOrDurationLabel: "Duração Média da Sessão (minutos)",
 primaryQuickAction: { label: "Grade de Agendamentos", path: "/workspace/agenda" },
 secondaryQuickAction: { label: "Catálogo de Serviços", path: "/workspace/agenda/servicos" },
 posServiceModes: [
 { id: "chair", label: "Cadeira / Cabine", placeholder: "Nome do Cliente / Profissional" },
 { id: "counter", label: "Recepção / Caixa", placeholder: "Nome do Cliente" },
 { id: "home", label: "Atendimento em Domicílio", placeholder: "Endereço do Cliente" },
 ],
 suggestedPresets: [
 { name: "Tratamento / Hidratação Extra", type: "multiple", desc: "Adicionais durante a realização do procedimento" },
 { name: "Produto Homecare Recomendado", type: "multiple", desc: "Itens para continuidade do cuidado em casa" },
 ],
 kpiMetrics: [
 { id: "taxa_ocupacao_agenda", label: "Ocupação da Grade de Horários", description: "Percentual de horários preenchidos na semana", format: "percent" },
 { id: "ticket_medio_atendimento", label: "Ticket Médio por Cliente", description: "Valor médio gerado por atendimento incluindo serviços e produtos homecare", format: "currency" },
 { id: "recorrencia_retorno", label: "Taxa de Retorno (30 dias)", description: "Percentual de clientes que agendam nova sessão dentro de um mês", format: "percent" },
 { id: "no_show_rate", label: "Índice de Faltas (No-Show)", description: "Percentual de clientes que faltaram sem aviso prévio", format: "percent" },
 ],
 operationalTips: [
 "Envie lembretes automáticos de agendamento por WhatsApp com 24h de antecedência para zerar o no-show.",
 "Incentive os profissionais a registrarem produtos homecare na comanda para elevar o ticket médio.",
 "Mantenha os tempos médios de cada serviço calibrados para evitar atrasos em cadeia na recepção.",
 ],
 },

 // 5. ADVOCACIA & JURÍDICO
 legal: {
 nicheId: "legal",
 name: "Advocacia & Serviços Jurídicos",
 itemSingular: "Área de Atuação / Serviço",
 itemPlural: "Serviços Jurídicos",
 catalogTitle: "Honorários & Serviços",
 newItemAction: "Novo Serviço Jurídico",
 editItemAction: "Editar Serviço",
 categoriesLabel: "Ramos do Direito (Cível, Trabalhista, Tributário)",
 newCategoryAction: "Novo Ramo do Direito",
 modifiersLabel: "Serviços Complementares & Pareceres",
 newModifierAction: "Novo Opcional",
 ordersLabel: "Processos & Prazos",
 kdsLabel: "Fila de Audiências",
 customerLabel: "Clientes / Assistidos",
 stockLabel: "Processos Ativos",
 searchItemPlaceholder: "Buscar por número de processo, cliente ou serviço...",
 emptyCatalogText: "Nenhum serviço ou processo cadastrado ainda.",
 priceLabel: "Valor dos Honorários (R$)",
 skuLabel: "Código Interno / Pasta",
 primaryQuickAction: { label: "Processos & Prazos", path: "/workspace/advocacia" },
 secondaryQuickAction: { label: "Audiências & Reuniões", path: "/workspace/agenda" },
 posServiceModes: [
 { id: "case", label: "Nova Pasta / Processo", placeholder: "Nome do Cliente / Ação" },
 { id: "consultation", label: "Consulta Jurídica", placeholder: "Nome do Interessado" },
 ],
 suggestedPresets: [
 { name: "Parecer Técnico Especializado", type: "single", desc: "Elaboração de documento opinativo complementar" },
 ],
 kpiMetrics: [
 { id: "prazos_fatais_semana", label: "Prazos Fatais na Semana", description: "Contagem de prazos processuais que expiram nos próximos 7 dias", format: "number" },
 { id: "audiencias_mes", label: "Audiências Designadas no Mês", description: "Volume de sessões e audiências judiciais programadas", format: "number" },
 { id: "honorarios_pendentes", label: "Honorários a Faturar / Receber", description: "Total de honorários contratuais ou de sucumbência em aberto", format: "currency" },
 { id: "taxa_exito_judicial", label: "Taxa de Êxito / Procedência", description: "Percentual de decisões favoráveis aos assistidos", format: "percent" },
 ],
 operationalTips: [
 "Vincule cada cliente à sua pasta de processos para captura automática de andamentos e intimações.",
 "Cadastre prazos de contestação e recursos com antecedência mínima de 48h para revisão pelos sócios.",
 "Envie o link de assinatura digital forense para o cliente assinar procurações e contratos de honorários no celular.",
 ],
 },

 // 6. LOCAÇÃO DE EQUIPAMENTOS & ESTRUTURAS
 rental: {
 nicheId: "rental",
 name: "Locação, Estruturas & Eventos",
 itemSingular: "Equipamento / Bem",
 itemPlural: "Bens & Equipamentos",
 catalogTitle: "Inventário de Locação",
 newItemAction: "Cadastrar Equipamento",
 editItemAction: "Editar Equipamento",
 categoriesLabel: "Categorias de Equipamentos",
 newCategoryAction: "Nova Categoria",
 modifiersLabel: "Acessórios & Operadores Técnicos",
 newModifierAction: "Novo Grupo de Opcionais",
 ordersLabel: "Contratos & Locações",
 kdsLabel: "Montagens & Despacho",
 customerLabel: "Clientes / Produtores",
 stockLabel: "Disponibilidade de Frota/Itens",
 searchItemPlaceholder: "Buscar equipamento por nome, número de série ou modelo...",
 emptyCatalogText: "Nenhum equipamento cadastrado no inventário ainda.",
 priceLabel: "Valor da Diária / Período",
 skuLabel: "Número de Patrimônio / Série",
 primaryQuickAction: { label: "Agenda de Locações", path: "/workspace/agenda" },
 secondaryQuickAction: { label: "Inventário de Bens", path: "/workspace/catalogo/produtos" },
 posServiceModes: [
 { id: "pickup", label: "Retirada no Galpão", placeholder: "Nome do Responsável" },
 { id: "assembly", label: "Montagem no Local", placeholder: "Endereço do Evento" },
 { id: "quote", label: "Reserva de Orçamento", placeholder: "Data do Evento" },
 ],
 suggestedPresets: [
 { name: "Operador Técnico / Blaster / Sonoplasta", type: "single", desc: "Inclusão de profissional habilitado para a operação" },
 { name: "Cabos, Suportes & Extensões Extras", type: "multiple", desc: "Acessórios complementares para o setup" },
 { name: "Frete / Deslocamento de Equipe", type: "single", desc: "Taxa de transporte conforme a distância" },
 ],
 kpiMetrics: [
 { id: "taxa_utilizacao_frota", label: "Utilização do Inventário", description: "Percentual de equipamentos em locação ativa", format: "percent" },
 { id: "devolucoes_hoje", label: "Devoluções Previstas Hoje", description: "Contagem de contratos cujo prazo encerra na data", format: "number" },
 { id: "ticket_medio_locacao", label: "Ticket Médio por Contrato", description: "Valor médio faturado por período locado", format: "currency" },
 { id: "manutencao_equipamentos", label: "Equipamentos em Manutenção", description: "Bens temporariamente fora de operação para reparo", format: "number" },
 ],
 operationalTips: [
 "Realize o checklist fotográfico na entrega e na devolução do bem para evitar disputas de avarias.",
 "Agende manutenções preventivas nos períodos de menor demanda para maximizar a disponibilidade.",
 "Envie o contrato digital para assinatura com 48h de antecedência do despacho.",
 ],
 },

 // 7. ASSISTÊNCIA TÉCNICA & REPAROS
 tech_repair: {
 nicheId: "tech_repair",
 name: "Assistência Técnica & Reparos",
 itemSingular: "Serviço / Peça",
 itemPlural: "Peças, Capinhas & Serviços",
 catalogTitle: "Peças & Tabela de Reparo",
 newItemAction: "Novo Reparo ou Acessório",
 editItemAction: "Editar Item",
 categoriesLabel: "Marcas / Modelos de Aparelho",
 newCategoryAction: "Nova Categoria / Marca",
 modifiersLabel: "Garantia Estendida & Acessórios",
 newModifierAction: "Novo Grupo de Opcionais",
 ordersLabel: "Ordens de Serviço (OS)",
 kdsLabel: "Bancada de Reparos (Fila)",
 customerLabel: "Clientes",
 stockLabel: "Estoque de Peças & Telas",
 searchItemPlaceholder: "Buscar reparo, tela, bateria, capinha ou película...",
 emptyCatalogText: "Nenhuma peça ou serviço cadastrado ainda.",
 priceLabel: "Valor da Peça / Mão de Obra",
 skuLabel: "Código da Peça / SKU",
 preparationOrDurationLabel: "Tempo de Execução do Reparo (horas)",
 primaryQuickAction: { label: "Ordens de Serviço (OS)", path: "/workspace/pedidos/gestor" },
 secondaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 posServiceModes: [
 { id: "os", label: "Ordem de Serviço (OS)", placeholder: "Aparelho / IMEI / Senha" },
 { id: "counter", label: "Balcão (Acessórios)", placeholder: "Nome do Cliente" },
 { id: "delivery", label: "Delivery / Motoboy", placeholder: "Endereço de Entrega" },
 ],
 suggestedPresets: [
 { name: "Tipo de Peça (Original Nacional / Premium)", type: "single", desc: "Escolha da procedência da peça" },
 { name: "Película 3D de Proteção Aplicada", type: "single", desc: "Proteção adicional para tela recém trocada" },
 { name: "Garantia Estendida (6 Meses / 1 Ano)", type: "single", desc: "Extensão da cobertura técnica" },
 ],
 kpiMetrics: [
 { id: "os_na_bancada", label: "Aparelhos na Bancada", description: "Volume de ordens de serviço em diagnóstico ou reparo ativo", format: "number" },
 { id: "tempo_medio_reparo", label: "Tempo Médio de Liberação", description: "Duração média entre entrada e entrega do aparelho consertado", format: "duration" },
 { id: "ticket_medio_os", label: "Ticket Médio por Reparo", description: "Valor médio incluindo mão de obra e peças substituídas", format: "currency" },
 { id: "taxa_garantia_retorno", label: "Índice de Retorno em Garantia", description: "Percentual de aparelhos que retornaram com o mesmo defeito", format: "percent" },
 ],
 operationalTips: [
 "Registre fotos em alta resolução do aparelho na entrada (riscos, trincos, IMEI) para proteção jurídica.",
 "Notifique o cliente via WhatsApp assim que o orçamento for aprovado ou o conserto concluído.",
 "Vincule películas e capas protetoras na entrega do aparelho reparado para aumentar o faturamento.",
 ],
 },

 // 8. PET SHOP & CLÍNICA VETERINÁRIA
 pet: {
 nicheId: "pet",
 name: "Pet Shop & Veterinária",
 itemSingular: "Produto / Procedimento",
 itemPlural: "Rações, Medicamentos & Banho",
 catalogTitle: "Produtos & Procedimentos Pet",
 newItemAction: "Novo Item ou Procedimento",
 editItemAction: "Editar Item Pet",
 categoriesLabel: "Sessões Pet (Cães, Gatos, Farmácia)",
 newCategoryAction: "Nova Seção Pet",
 modifiersLabel: "Adicionais de Estética (Hidratação, Tosa)",
 newModifierAction: "Novo Grupo de Adicionais",
 ordersLabel: "Grade de Atendimentos & Vendas",
 kdsLabel: "Fila de Banho e Tosa",
 customerLabel: "Tutores & Pets",
 stockLabel: "Estoque de Rações & Farmácia",
 searchItemPlaceholder: "Buscar ração, antipulgas, brinquedo ou serviço...",
 emptyCatalogText: "Nenhum produto ou serviço cadastrado ainda.",
 priceLabel: "Preço",
 skuLabel: "Código de Barras / SKU",
 preparationOrDurationLabel: "Tempo Médio de Banho/Consulta (min)",
 primaryQuickAction: { label: "Agenda de Banho & Tosa", path: "/workspace/agenda" },
 secondaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 posServiceModes: [
 { id: "bath", label: "Banho & Tosa", placeholder: "Nome do Pet e Tutor" },
 { id: "clinic", label: "Consulta Veterinária", placeholder: "Nome do Paciente Pet" },
 { id: "counter", label: "Balcão da Loja", placeholder: "Nome do Tutor" },
 { id: "delivery", label: "Tele-Entrega de Ração", placeholder: "Endereço de Entrega" },
 ],
 suggestedPresets: [
 { name: "Porte do Animal (Pequeno, Médio, Grande)", type: "single", desc: "Variação de preço por porte físico" },
 { name: "Hidratação de Pelagem com Óleo de Argan", type: "single", desc: "Tratamento estético premium" },
 { name: "Tosa Higiênica e Corte de Unhas", type: "multiple", desc: "Procedimentos complementares inclusos" },
 ],
 kpiMetrics: [
 { id: "banhos_dia", label: "Banhos & Tosas no Dia", description: "Contagem de procedimentos de estética animal agendados", format: "number" },
 { id: "consultas_veterinarias", label: "Consultas Clínicas Agendadas", description: "Volume de atendimentos médicos veterinários programados", format: "number" },
 { id: "ticket_medio_pet", label: "Ticket Médio por Tutor", description: "Valor médio combinado entre serviços estéticos e produtos da loja", format: "currency" },
 { id: "vacinas_a_vencer", label: "Lotes de Vacina a Vencer", description: "Controle de validade de imunizantes e medicamentos", format: "number" },
 ],
 operationalTips: [
 "Cadastre o prontuário de cada pet com peso, alergias e preferências de perfume no banho.",
 "Envie lembretes de reforço vacinal e antipulgas no WhatsApp para gerar receita recorrente.",
 "Organize a fila de secagem e tosa com horários espaçados para evitar estresse nos animais.",
 ],
 },

 // 9. SUPERMERCADO, AÇOUGUE & HORTIFRÚTI
 supermarket: {
 nicheId: "supermarket",
 name: "Supermercado, Açougue & Hortifrúti",
 itemSingular: "Mercadoria",
 itemPlural: "Produtos das Gôndolas",
 catalogTitle: "Gôndolas & Hortifrúti",
 newItemAction: "Cadastrar Mercadoria",
 editItemAction: "Editar Mercadoria",
 categoriesLabel: "Sessões do Mercado",
 newCategoryAction: "Nova Seção / Corredor",
 modifiersLabel: "Cortes de Carne & Embalagem",
 newModifierAction: "Novo Tipo de Corte",
 ordersLabel: "Separação de Compras",
 kdsLabel: "Fila de Separação (Picking)",
 customerLabel: "Clientes",
 stockLabel: "Validades & Reposição",
 searchItemPlaceholder: "Buscar por código EAN, nome do produto ou hortifrúti...",
 emptyCatalogText: "Nenhuma mercadoria cadastrada nas gôndolas ainda.",
 priceLabel: "Preço por Unidade / KG",
 skuLabel: "Código de Barras (EAN-13)",
 primaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 secondaryQuickAction: { label: "Gôndolas & Produtos", path: "/workspace/catalogo/produtos" },
 posServiceModes: [
 { id: "checkout", label: "Caixa Rápido / Frente de Loja", placeholder: "CPF do Cliente" },
 { id: "delivery", label: "Entrega em Domicílio", placeholder: "Endereço do Cliente" },
 { id: "pickup", label: "Retirada na Loja (Drive-thru)", placeholder: "Nome do Comprador" },
 ],
 suggestedPresets: [
 { name: "Tipo de Corte da Carne (Bife Fino, Moída 2x, Pedaço)", type: "single", desc: "Preferência de manipulação no açougue" },
 { name: "Ponto das Frutas (Maduras para Hoje, Verdes para Semana)", type: "single", desc: "Instrução para seleção no hortifrúti" },
 ],
 kpiMetrics: [
 { id: "ruptura_gondola", label: "Índice de Ruptura de Estoque", description: "Percentual de itens esgotados nas prateleiras", format: "percent" },
 { id: "itens_por_cupom", label: "Itens por Cupom Fiscal", description: "Média de produtos adquiridos por compra no caixa", format: "number" },
 { id: "perdas_pereciveis", label: "Perdas em Perecíveis (Hortifrúti/Açougue)", description: "Valor de mercadorias descartadas por maturação ou avaria", format: "currency" },
 { id: "ticket_medio_mercado", label: "Ticket Médio da Compra", description: "Valor médio faturado por cliente no PDV", format: "currency" },
 ],
 operationalTips: [
 "Realize a conferência diária das datas de validade nas seções de laticínios e frios.",
 "Ative promoções de hortifrúti em dias específicos da semana para acelerar o giro de itens frescos.",
 "Utilize a separação de pedidos express no PDV para agilizar as entregas de compras de bairro.",
 ],
 },

 // 10. FARMÁCIA & COSMÉTICOS
 pharmacy: {
 nicheId: "pharmacy",
 name: "Farmácia & Cosméticos",
 itemSingular: "Medicamento / Produto",
 itemPlural: "Medicamentos & Cosméticos",
 catalogTitle: "Medicamentos & OTC",
 newItemAction: "Novo Medicamento",
 editItemAction: "Editar Medicamento",
 categoriesLabel: "Categorias Farmacêuticas (Genéricos, Éticos, Higiene)",
 newCategoryAction: "Nova Categoria",
 modifiersLabel: "Dosagens & Apresentações",
 newModifierAction: "Nova Apresentação",
 ordersLabel: "Balcão & Entregas Express",
 kdsLabel: "Receituários & Balcão",
 customerLabel: "Pacientes / Clientes",
 stockLabel: "Estoque & Lotes de Validade",
 searchItemPlaceholder: "Buscar por princípio ativo, nome comercial ou EAN...",
 emptyCatalogText: "Nenhum medicamento cadastrado ainda.",
 priceLabel: "Preço de Venda (R$)",
 skuLabel: "Código EAN / Registro MS",
 primaryQuickAction: { label: "Frente de Caixa (PDV)", path: "/workspace/pdv" },
 secondaryQuickAction: { label: "Receituários & Balcão", path: "/workspace/pedidos/gestor" },
 posServiceModes: [
 { id: "counter", label: "Balcão / Caixa", placeholder: "Nome do Paciente" },
 { id: "delivery", label: "Tele-Entrega Express", placeholder: "Endereço de Entrega" },
 ],
 suggestedPresets: [
 { name: "Apresentação (Comprimidos, Gotas, Pomada, Xarope)", type: "single", desc: "Forma farmacêutica" },
 ],
 kpiMetrics: [
 { id: "lotes_a_vencer", label: "Medicamentos a Vencer (90 dias)", description: "Contagem de caixas farmacêuticas próximas do vencimento", format: "number" },
 { id: "receituarios_retidos", label: "Receitas Controladas Retidas", description: "Volume de prescrições arquivadas e prontas para envio ao SNGPC", format: "number" },
 { id: "ticket_medio_farmacia", label: "Ticket Médio por Atendimento", description: "Média combinada entre medicamentos e produtos de higiene/beleza", format: "currency" },
 { id: "curva_abc_medicamentos", label: "Concentração Curva A", description: "Percentual de faturamento vindo dos principais medicamentos", format: "percent" },
 ],
 operationalTips: [
 "Digitalize a receita no balcão e confira o CRM do médico antes de liberar medicamentos controlados.",
 "Ofereça alternativas genéricas ou similares de qualidade para aumentar a margem da farmácia.",
 "Mantenha os antibióticos com controle rigoroso de lote e validade no sistema.",
 ],
 },

 // 11. EVENTOS, SHOWS, FESTAS & INGRESSOS
 events: {
 nicheId: "events",
 name: "Eventos, Shows & Ingressos",
 itemSingular: "Ingresso / Lote",
 itemPlural: "Lotes & Ingressos",
 catalogTitle: "Eventos & Lotes",
 newItemAction: "Criar Evento / Lote",
 editItemAction: "Editar Lote",
 categoriesLabel: "Tipos de Evento",
 newCategoryAction: "Nova Categoria de Evento",
 modifiersLabel: "Setores & Experiências (VIP, Camarote, Pista)",
 newModifierAction: "Novo Setor",
 ordersLabel: "Ingressos Vendidos",
 kdsLabel: "Portaria & Validação QR Code",
 customerLabel: "Participantes / Compradores",
 stockLabel: "Capacidade & Lotação",
 searchItemPlaceholder: "Buscar evento, show ou lote...",
 emptyCatalogText: "Nenhum evento publicado ainda.",
 priceLabel: "Valor do Ingresso",
 skuLabel: "Código do Lote",
 primaryQuickAction: { label: "Meus Eventos & Lotes", path: "/workspace/eventos" },
 secondaryQuickAction: { label: "Balanço de Ingressos", path: "/workspace/financeiro/pagamentos" },
 posServiceModes: [
 { id: "boxoffice", label: "Bilheteria Física", placeholder: "Nome do Participante" },
 { id: "promoter", label: "Comissário / Promoter", placeholder: "Nome do Comissário" },
 { id: "door", label: "Portaria / Entrada", placeholder: "Validação de Pulseira" },
 ],
 suggestedPresets: [
 { name: "Setor do Evento (Pista, Camarote Open Bar, Mezanino)", type: "single", desc: "Acesso por área" },
 { name: "Tipo de Ingresso (Inteira, Meia-Entrada, Solidário)", type: "single", desc: "Modalidade de compra do ingresso" },
 { name: "Combo de Bebidas / Fichas Antecipadas", type: "multiple", desc: "Consumação adquirida com desconto" },
 ],
 kpiMetrics: [
 { id: "taxa_lotacao_evento", label: "Ocupação da Lotação Máxima", description: "Percentual de ingressos vendidos em relação ao alvará do espaço", format: "percent" },
 { id: "ingressos_validados_portaria", label: "Check-in de Portaria Realizado", description: "Contagem de participantes que já entraram no evento", format: "number" },
 { id: "consumo_medio_bar", label: "Consumo Médio de Bar", description: "Média de fichas e bebidas consumidas por participante", format: "currency" },
 { id: "receita_lotes", label: "Receita Bruta dos Lotes", description: "Total arrecadado com ingressos antecipados e portaria", format: "currency" },
 ],
 operationalTips: [
 "Utilize o validador de QR Code da portaria offline para garantir entrada rápida mesmo sem sinal 4G.",
 "Programe a virada de lotes com antecedência e divulgue o encerramento nas redes sociais.",
 "Venda fichas de bar antecipadas para evitar filas no caixa durante as atrações principais.",
 ],
 },

 // 12. AUTOMÓVEIS & VEÍCULOS
 vehicles: {
 nicheId: "vehicles",
 name: "Automóveis & Concessionária",
 itemSingular: "Veículo",
 itemPlural: "Estoque de Veículos",
 catalogTitle: "Estoque de Veículos",
 newItemAction: "Cadastrar Veículo",
 editItemAction: "Editar Veículo",
 categoriesLabel: "Categorias (SUVs, Sedans, Hatchs, Motos)",
 newCategoryAction: "Nova Categoria de Veículo",
 modifiersLabel: "Opcionais & Pacotes do Veículo",
 newModifierAction: "Novo Pacote de Opcionais",
 ordersLabel: "Propostas & Financiamentos",
 kdsLabel: "Preparação & Vistoria",
 customerLabel: "Leads & Compradores",
 stockLabel: "Pátio & Disponibilidade",
 searchItemPlaceholder: "Buscar por marca, modelo, ano ou placa...",
 emptyCatalogText: "Nenhum veículo cadastrado no pátio ainda.",
 priceLabel: "Valor do Veículo (Tabela FIPE / Pedida)",
 skuLabel: "Placa / Renavam",
 primaryQuickAction: { label: "Estoque de Veículos", path: "/workspace/catalogo/produtos" },
 secondaryQuickAction: { label: "Propostas & Financiamento", path: "/workspace/orcamentos" },
 posServiceModes: [
 { id: "showroom", label: "Salão de Vendas (Showroom)", placeholder: "Nome do Interessado" },
 { id: "tradein", label: "Avaliação de Troca", placeholder: "Placa do Carro Usado" },
 ],
 suggestedPresets: [
 { name: "Garantia Mecânica Estendida (1 Ano Motor e Câmbio)", type: "single", desc: "Proteção mecânica para seminovos" },
 { name: "Vitrificação de Pintura & Insulfilm", type: "multiple", desc: "Serviços de estética automotiva entregues com o carro" },
 ],
 kpiMetrics: [
 { id: "dias_em_patio", label: "Giro Médio no Pátio", description: "Quantidade média de dias que os veículos levam para ser vendidos", format: "duration" },
 { id: "margem_media_veiculo", label: "Margem Média por Carro", description: "Lucro bruto apurado sobre o custo de aquisição e preparação", format: "currency" },
 { id: "propostas_abertas", label: "Propostas em Análise", description: "Fichas de financiamento ou intenções de compra em andamento", format: "number" },
 { id: "taxa_conversao_testdrive", label: "Conversão de Test-Drive", description: "Percentual de clientes que fecham negócio após testar o carro", format: "percent" },
 ],
 operationalTips: [
 "Cadastre o laudo cautelar e histórico de manutenção para gerar confiança imediata no comprador.",
 "Acompanhe o tempo que cada veículo passa no pátio; carros parados há mais de 60 dias exigem revisão de preço.",
 "Envie propostas de financiamento simuladas com resposta rápida via WhatsApp.",
 ],
 },

 // 13. IMÓVEIS & IMOBILIÁRIA
 real_estate: {
 nicheId: "real_estate",
 name: "Imóveis & Imobiliária",
 itemSingular: "Imóvel",
 itemPlural: "Catálogo de Imóveis",
 catalogTitle: "Catálogo de Imóveis",
 newItemAction: "Cadastrar Imóvel",
 editItemAction: "Editar Imóvel",
 categoriesLabel: "Tipos (Casas, Apartamentos, Terrenos, Salas)",
 newCategoryAction: "Novo Tipo de Imóvel",
 modifiersLabel: "Comodidades (Piscina, Garagem, Mobiliado)",
 newModifierAction: "Novo Grupo de Comodidades",
 ordersLabel: "Propostas & Contratos",
 kdsLabel: "Vistorias & Chaves",
 customerLabel: "Interessados / Inquilinos",
 stockLabel: "Disponibilidade de Chaves",
 searchItemPlaceholder: "Buscar por bairro, condomínio, código do imóvel...",
 emptyCatalogText: "Nenhum imóvel cadastrado no catálogo ainda.",
 priceLabel: "Valor de Venda / Aluguel",
 skuLabel: "Código do Imóvel (Ref)",
 primaryQuickAction: { label: "Catálogo de Imóveis", path: "/workspace/catalogo/produtos" },
 secondaryQuickAction: { label: "Propostas & Contratos", path: "/workspace/orcamentos" },
 posServiceModes: [
 { id: "visit", label: "Agendamento de Visita", placeholder: "Nome do Interessado" },
 { id: "proposal", label: "Proposta Formal", placeholder: "Nome do Comprador" },
 ],
 suggestedPresets: [
 { name: "Opção de Mobília (100% Mobiliado, Semi-Mobiliado, Vazio)", type: "single", desc: "Condição de entrega do imóvel" },
 ],
 kpiMetrics: [
 { id: "imoveis_disponiveis", label: "Imóveis Ativos na Carteira", description: "Contagem de unidades residenciais e comerciais prontas para locação/venda", format: "number" },
 { id: "visitas_semana", label: "Visitas Agendadas na Semana", description: "Volume de visitas presenciais a imóveis acompanhadas por corretores", format: "number" },
 { id: "tempo_vacancia_medio", label: "Tempo Médio de Vacância", description: "Média de dias que um imóvel leva para ser alugado", format: "duration" },
 { id: "taxa_conversao_visitas", label: "Conversão Visita/Contrato", description: "Percentual de propostas formais geradas a partir das visitas", format: "percent" },
 ],
 operationalTips: [
 "Cadastre o tour virtual ou vídeo em alta resolução do imóvel para atrair proponentes qualificados.",
 "Acompanhe o tempo de vacância de cada imóvel; unidades paradas há mais de 45 dias demandam ajuste de aluguel.",
 "Gere o contrato de locação com garantia fiador/seguro fiança integrado com assinatura digital forense.",
 ],
 },

 // 14. EMPREGOS & RECRUTAMENTO
 jobs: {
 nicheId: "jobs",
 name: "Vagas & Recrutamento",
 itemSingular: "Vaga / Oportunidade",
 itemPlural: "Vagas Abertas",
 catalogTitle: "Mural de Vagas",
 newItemAction: "Publicar Nova Vaga",
 editItemAction: "Editar Vaga",
 categoriesLabel: "Áreas de Atuação (Tecnologia, Comercial, Operacional)",
 newCategoryAction: "Nova Área",
 modifiersLabel: "Benefícios Inclusos (VT, VR, Plano de Saúde)",
 newModifierAction: "Novo Benefício",
 ordersLabel: "Candidaturas Recebidas",
 kdsLabel: "Triagem & Entrevistas",
 customerLabel: "Candidatos / Talentos",
 stockLabel: "Vagas Abertas",
 searchItemPlaceholder: "Buscar vaga por cargo ou departamento...",
 emptyCatalogText: "Nenhuma vaga publicada ainda.",
 priceLabel: "Faixa Salarial / Remuneração (R$)",
 skuLabel: "Código da Vaga",
 primaryQuickAction: { label: "Vagas & Candidaturas", path: "/workspace/empregos/candidatos" },
 secondaryQuickAction: { label: "Banco de Talentos", path: "/workspace/clientes" },
 posServiceModes: [
 { id: "interview", label: "Agendar Entrevista", placeholder: "Nome do Candidato" },
 ],
 suggestedPresets: [
 { name: "Modalidade (Presencial, Híbrido, 100% Remoto)", type: "single", desc: "Regime de trabalho da vaga" },
 ],
 kpiMetrics: [
 { id: "candidaturas_recebidas", label: "Candidaturas Recebidas no Mês", description: "Volume de currículos e perfis submetidos para vagas abertas", format: "number" },
 { id: "tempo_medio_fechamento_vaga", label: "Tempo Médio de Fechamento de Vaga", description: "Duração média entre publicação da oportunidade e contratação", format: "duration" },
 { id: "taxa_aprovacao_entrevistas", label: "Taxa de Aprovação em Entrevistas", description: "Percentual de candidatos recomendados para os gestores", format: "percent" },
 { id: "banco_talentos_ativo", label: "Talentos no Banco de Currículos", description: "Profissionais qualificados disponíveis para futuras oportunidades", format: "number" },
 ],
 operationalTips: [
 "Divulgue a página de carreiras da empresa nas redes sociais com link direto para inscrição mobile.",
 "Utilize filtros de triagem por habilidades e pretensão salarial para acelerar a primeira etapa seletiva.",
 "Mantenha os candidatos informados sobre o status do processo seletivo para preservar a marca empregadora.",
 ],
 },

 // 15. EDUCAÇÃO, CURSOS & WORKSHOPS
 education: {
 nicheId: "education",
 name: "Cursos, Turmas & Educação",
 itemSingular: "Curso / Turma",
 itemPlural: "Cursos & Workshops",
 catalogTitle: "Catálogo de Cursos",
 newItemAction: "Cadastrar Curso",
 editItemAction: "Editar Curso",
 categoriesLabel: "Áreas do Conhecimento",
 newCategoryAction: "Nova Área",
 modifiersLabel: "Materiais Didáticos & Certificados",
 newModifierAction: "Novo Grupo de Materiais",
 ordersLabel: "Matrículas & Inscrições",
 kdsLabel: "Gestão de Turmas & Presença",
 customerLabel: "Alunos & Matriculados",
 stockLabel: "Vagas por Turma",
 searchItemPlaceholder: "Buscar curso por nome, instrutor ou área...",
 emptyCatalogText: "Nenhum curso cadastrado ainda.",
 priceLabel: "Mensalidade / Valor da Matrícula",
 skuLabel: "Código da Turma",
 primaryQuickAction: { label: "Grade de Aulas", path: "/workspace/agenda" },
 secondaryQuickAction: { label: "Catálogo de Cursos", path: "/workspace/agenda/servicos" },
 posServiceModes: [
 { id: "enrollment", label: "Secretaria / Matrícula", placeholder: "Nome do Aluno" },
 { id: "scholarship", label: "Bolsa / Desconto Convênio", placeholder: "Instituição Conveniada" },
 ],
 suggestedPresets: [
 { name: "Kit de Apostilas Impressas + Mochila", type: "single", desc: "Material físico de apoio para o aluno" },
 { name: "Mentoria Individual 1-on-1", type: "multiple", desc: "Sessões exclusivas com o professor" },
 ],
 kpiMetrics: [
 { id: "taxa_ocupacao_turmas", label: "Ocupação das Turmas / Vagas", description: "Percentual de matrículas ativas em relação à capacidade das salas", format: "percent" },
 { id: "taxa_inadimplencia_mensalidade", label: "Inadimplência de Mensalidades", description: "Percentual de boletos/mensalidades em atraso no mês corrente", format: "percent" },
 { id: "taxa_retencao_alunos", label: "Retenção de Alunos (Semestral)", description: "Percentual de alunos que renovaram a matrícula para o próximo período", format: "percent" },
 { id: "frequencia_media_aulas", label: "Frequência Média nas Aulas", description: "Presença dos matriculados nas aulas e oficinas práticas", format: "percent" },
 ],
 operationalTips: [
 "Monitore a frequência dos alunos e notifique responsáveis em caso de ausências consecutivas.",
 "Disponibilize materiais didáticos complementares em PDF direto na área do aluno.",
 "Envie boletos com QR Code PIX e desconto de pontualidade para reduzir a inadimplência.",
 ],
 },

 // 16. NOTÍCIAS & REDAÇÃO DE JORNAL
 news: {
 nicheId: "news",
 name: "Notícias & Portal de Mídia",
 itemSingular: "Reportagem",
 itemPlural: "Todas as Matérias",
 catalogTitle: "Redação & Reportagens",
 newItemAction: "Nova Reportagem",
 editItemAction: "Editar Matéria",
 categoriesLabel: "Editorias (Cidade, Polícia, Política, Esporte)",
 newCategoryAction: "Nova Editoria",
 modifiersLabel: "Banners Patrocinados & Encartes",
 newModifierAction: "Novo Formato Publicitário",
 ordersLabel: "Assinaturas & Publicidades",
 kdsLabel: "Fila de Pauta & Revisão",
 customerLabel: "Leitores & Assinantes",
 stockLabel: "Pautas em Produção",
 searchItemPlaceholder: "Buscar matéria por título, autor ou palavra-chave...",
 emptyCatalogText: "Nenhuma matéria publicada na redação ainda.",
 priceLabel: "Valor de Anúncio / Assinatura",
 skuLabel: "Código da Pauta",
 primaryQuickAction: { label: "Nova Reportagem", path: "/workspace/noticias/novo" },
 secondaryQuickAction: { label: "Todas as Matérias", path: "/workspace/noticias" },
 posServiceModes: [
 { id: "classified", label: "Balcão de Classificados", placeholder: "Nome do Anunciante" },
 { id: "subscription", label: "Assinatura Mensal", placeholder: "Nome do Assinante" },
 ],
 suggestedPresets: [
 { name: "Posicionamento do Anúncio (Capa, Topo, Lateral)", type: "single", desc: "Área de exibição do banner" },
 ],
 kpiMetrics: [
 { id: "leitores_unicos_dia", label: "Leitores Únicos no Dia", description: "Audiência qualificada consumindo reportagens nas últimas 24 horas", format: "number" },
 { id: "tempo_medio_leitura", label: "Tempo Médio de Permanência", description: "Duração média que o leitor passa consumindo as matérias", format: "duration" },
 { id: "assinaturas_ativas", label: "Assinantes Digitais Pagantes", description: "Base ativa de leitores do clube de conteúdo exclusivo", format: "number" },
 { id: "ctr_banners_patrocinados", label: "Cliques em Banners Patrocinados", description: "Taxa de conversão publicitária dos anunciantes da cidade", format: "percent" },
 ],
 operationalTips: [
 "Priorize manchetes claras e apuradas com fotos autorais da equipe de reportagem.",
 "Ative o paywall poroso (ex: 3 matérias gratuitas por mês) para estimular novas assinaturas.",
 "Monitore as editorias mais lidas para pautar coberturas especiais e transmissões ao vivo.",
 ],
 },

 // 17. ATACADO, INDÚSTRIA & B2B
 wholesale: {
 nicheId: "wholesale",
 name: "Atacado, Indústria & B2B",
 itemSingular: "Produto / Caixa Master",
 itemPlural: "Produtos & Lotes",
 catalogTitle: "Grade de Produtos & Caixas",
 newItemAction: "Novo Produto / Lote",
 editItemAction: "Editar Produto",
 categoriesLabel: "Linhas de Produção & Categorias",
 newCategoryAction: "Nova Linha",
 modifiersLabel: "Embalagens em Lote (Caixa com 12, Fardo)",
 newModifierAction: "Novo Tipo de Lote",
 ordersLabel: "Faturamento & Pedidos PJ",
 kdsLabel: "Expedição & Paletes",
 customerLabel: "Clientes PJ / Distribuidores",
 stockLabel: "Estoque em Galpão",
 searchItemPlaceholder: "Buscar por SKU, código de barras ou descrição...",
 emptyCatalogText: "Nenhum produto cadastrado no catálogo ainda.",
 priceLabel: "Preço Unitário / Tabela PJ",
 skuLabel: "SKU / Código do Lote",
 primaryQuickAction: { label: "Tabelas de Preço PJ", path: "/workspace/catalogo/tabelas" },
 secondaryQuickAction: { label: "Orçamentos em Lote", path: "/workspace/orcamentos" },
 posServiceModes: [
 { id: "b2b_order", label: "Pedido de Venda PJ", placeholder: "CNPJ / Razão Social" },
 { id: "quote", label: "Cotação em Lote", placeholder: "Nome do Comprador" },
 ],
 suggestedPresets: [
 { name: "Tipo de Embalagem (Caixa com 6, Caixa com 12, Palete)", type: "single", desc: "Volume do lote fornecido" },
 ],
 kpiMetrics: [
 { id: "volume_paletes_expedidos", label: "Paletes Expedidos no Mês", description: "Volume físico de carga despachada para distribuidores e atacado", format: "number" },
 { id: "ticket_medio_b2b", label: "Ticket Médio por Pedido PJ", description: "Valor médio faturado por nota fiscal de venda corporativa", format: "currency" },
 { id: "prazo_medio_entrega_b2b", label: "Prazo Médio de Entrega (Lead Time)", description: "Duração média entre aprovação do pedido e recebimento pelo cliente PJ", format: "duration" },
 { id: "taxa_recompra_clientes_pj", label: "Taxa de Recompra Mensal (B2B)", description: "Percentual de clientes cadastrados que realizaram pedidos no mês", format: "percent" },
 ],
 operationalTips: [
 "Defina tabelas de preço diferenciadas por faixa de volume (caixa fechada vs. palete completo).",
 "Confira a situação cadastral do CNPJ (Sintegra) antes de aprovar faturamento a prazo.",
 "Mantenha o estoque mínimo de segurança no galpão para os SKUs de maior giro industrial.",
 ],
 },
};

/**
 * Identifica o nicho bruto a partir do texto combinado do segmento, tipo e nome da loja.
 */
function resolveRegistryEntry(segment: string): NicheSemantics {
 // 1. TURISMO, AGÊNCIAS DE VIAGEM, HOTÉIS & ROTEIROS (PT & EN)

 if (
 segment.includes("tourism") ||
 segment.includes("tour") ||
 segment.includes("turis") ||
 segment.includes("viag") ||
 segment.includes("travel") ||
 segment.includes("hotel") ||
 segment.includes("pousad") ||
 segment.includes("guia") ||
 segment.includes("excurs") ||
 segment.includes("passeio") ||
 segment.includes("roteir") ||
 segment.includes("passag") ||
 segment.includes("aereo") ||
 segment.includes("antt") ||
 segment.includes("cruzeir") ||
 segment.includes("resort")
 ) {
 return NICHE_SEMANTICS_REGISTRY.tourism;
 }

 // 2. GASTRONOMIA, RESTAURANTES & DELIVERY
 if (
 segment.includes("gastro") ||
 segment.includes("restauran") ||
 segment.includes("pizz") ||
 segment.includes("burg") ||
 segment.includes("lanch") ||
 segment.includes("bar") ||
 segment.includes("caf") ||
 segment.includes("comida") ||
 segment.includes("alimento") ||
 segment.includes("bebida") ||
 segment.includes("food") ||
 segment.includes("marmit") ||
 segment.includes("doce") ||
 segment.includes("padar")
 ) {
 return NICHE_SEMANTICS_REGISTRY.gastronomy;
 }

 // 3. ADVOCACIA & JURÍDICO
 if (
 segment.includes("advoc") ||
 segment.includes("jurid") ||
 segment.includes("direito") ||
 segment.includes("legal") ||
 segment.includes("law") ||
 segment.includes("oab")
 ) {
 return NICHE_SEMANTICS_REGISTRY.legal;
 }

 // 4. EMPREGOS & RECRUTAMENTO
 if (
 segment.includes("job") ||
 segment.includes("emprego") ||
 segment.includes("vaga") ||
 segment.includes("recrut") ||
 segment.includes("talento") ||
 segment.includes("rh") ||
 segment.includes("estagio")
 ) {
 return NICHE_SEMANTICS_REGISTRY.jobs;
 }

 // 5. FARMÁCIA & SAÚDE
 if (
 segment.includes("farma") ||
 segment.includes("drogari") ||
 segment.includes("medicament") ||
 segment.includes("suplement") ||
 segment.includes("pharmacy") ||
 segment.includes("droga")
 ) {
 return NICHE_SEMANTICS_REGISTRY.pharmacy;
 }

 // 6. ATACADO, INDÚSTRIA & B2B
 if (
 segment.includes("atacado") ||
 segment.includes("distribuidora") ||
 segment.includes("industria") ||
 segment.includes("b2b") ||
 segment.includes("fabrica") ||
 segment.includes("wholesale")
 ) {
 return NICHE_SEMANTICS_REGISTRY.wholesale;
 }

 // 7. SERVIÇOS, BELEZA & ESTÉTICA
 if (
 segment.includes("servi") ||
 segment.includes("belez") ||
 segment.includes("salao") ||
 segment.includes("barbear") ||
 segment.includes("estetic") ||
 segment.includes("manicur") ||
 segment.includes("cabel") ||
 segment.includes("spa") ||
 segment.includes("terapia") ||
 segment.includes("tatto") ||
 segment.includes("beauty") ||
 segment.includes("clinic")
 ) {
 return NICHE_SEMANTICS_REGISTRY.services;
 }

 // 8. LOCAÇÃO DE EQUIPAMENTOS & ESTRUTURAS
 if (
 segment.includes("loca") ||
 segment.includes("alug") ||
 segment.includes("estrutur") ||
 segment.includes("tenda") ||
 segment.includes("equipament") ||
 segment.includes("som") ||
 segment.includes("ilumina") ||
 segment.includes("gerador") ||
 segment.includes("blaster") ||
 segment.includes("rental")
 ) {
 return NICHE_SEMANTICS_REGISTRY.rental;
 }

 // 9. ASSISTÊNCIA TÉCNICA & REPAROS
 if (
 segment.includes("assist") ||
 segment.includes("celular") ||
 segment.includes("repar") ||
 segment.includes("conserto") ||
 segment.includes("eletron") ||
 segment.includes("informat") ||
 segment.includes("tech_repair") ||
 segment.includes("oficin") ||
 segment.includes("mecanic")
 ) {
 return NICHE_SEMANTICS_REGISTRY.tech_repair;
 }

 // 10. PET SHOP & VETERINÁRIA
 if (
 segment.includes("pet") ||
 segment.includes("veterin") ||
 segment.includes("banho") ||
 segment.includes("tosa") ||
 segment.includes("racao") ||
 segment.includes("agro")
 ) {
 return NICHE_SEMANTICS_REGISTRY.pet;
 }

 // 11. SUPERMERCADO, AÇOUGUE & HORTIFRÚTI
 if (
 segment.includes("super") ||
 segment.includes("mercad") ||
 segment.includes("acougue") ||
 segment.includes("horti") ||
 segment.includes("fruti") ||
 segment.includes("sacol") ||
 segment.includes("mercear") ||
 segment.includes("supermarket") ||
 segment.includes("grocery")
 ) {
 return NICHE_SEMANTICS_REGISTRY.supermarket;
 }

 // 12. EVENTOS, SHOWS & INGRESSOS
 if (
 segment.includes("event") ||
 segment.includes("show") ||
 segment.includes("ingress") ||
 segment.includes("festa") ||
 segment.includes("balada") ||
 segment.includes("teatro") ||
 segment.includes("produt") ||
 segment.includes("ticket")
 ) {
 return NICHE_SEMANTICS_REGISTRY.events;
 }

 // 13. AUTOMÓVEIS & VEÍCULOS
 if (
 segment.includes("veicul") ||
 segment.includes("carro") ||
 segment.includes("moto") ||
 segment.includes("automot") ||
 segment.includes("concessionar") ||
 segment.includes("garagem") ||
 segment.includes("vehicle") ||
 segment.includes("auto")
 ) {
 return NICHE_SEMANTICS_REGISTRY.vehicles;
 }

 // 14. IMÓVEIS & IMOBILIÁRIA
 if (
 segment.includes("imove") ||
 segment.includes("imobili") ||
 segment.includes("apartament") ||
 segment.includes("aluguel") ||
 segment.includes("corretor") ||
 segment.includes("real_estate") ||
 segment.includes("realtor")
 ) {
 return NICHE_SEMANTICS_REGISTRY.real_estate;
 }

 // 15. EDUCAÇÃO, CURSOS & WORKSHOPS
 if (
 segment.includes("educa") ||
 segment.includes("curso") ||
 segment.includes("escola") ||
 segment.includes("turma") ||
 segment.includes("treina") ||
 segment.includes("workshop") ||
 segment.includes("education") ||
 segment.includes("escola")
 ) {
 return NICHE_SEMANTICS_REGISTRY.education;
 }

 // 16. NOTÍCIAS & PORTAIS DE MÍDIA
 if (
 segment.includes("notici") ||
 segment.includes("jornal") ||
 segment.includes("redac") ||
 segment.includes("portal") ||
 segment.includes("revist") ||
 segment.includes("news")
 ) {
 return NICHE_SEMANTICS_REGISTRY.news;
 }

 // 17. PADRÃO: VAREJO & COMÉRCIO GERAL (Moda, Calçados, Presentes, etc.)
 return NICHE_SEMANTICS_REGISTRY.retail;
}

/**
 * Enriquece o registro de semântica com fallbacks inteligentes e campos canônicos
 * de compartilhamento, QR Code, departamentos de atendimento e status de pedido.
 */
export function enrichNicheSemantics(base: NicheSemantics): NicheSemantics {
 const nicheId = base.nicheId;

 const shareTitle = base.shareTitle || (
 nicheId === "gastronomy" ? "Cardápio Digital & QR Code" :
 nicheId === "tourism" ? "Roteiros & QR Code Oficial" :
 nicheId === "services" ? "Catálogo de Serviços & QR Code" :
 nicheId === "legal" ? "Escritório & QR Code Oficial" :
 nicheId === "real_estate" ? "Catálogo de Imóveis & QR Code" :
 nicheId === "jobs" ? "Mural de Vagas & QR Code" :
 nicheId === "events" ? "Eventos, Ingressos & QR Code" :
 nicheId === "vehicles" ? "Estoque de Veículos & QR Code" :
 nicheId === "education" ? "Cursos, Turmas & QR Code" :
 "Catálogo Digital & QR Code"
 );

 const shareSubtitle = base.shareSubtitle || (
 nicheId === "gastronomy"
 ? "Compartilhe seu link oficial em redes sociais ou imprima o QR Code para mesas e balcão."
 : "Compartilhe seu link oficial em redes sociais ou imprima o QR Code para balcão e atendimento."
 );

 const qrCardCallout = base.qrCardCallout || (
 nicheId === "gastronomy" ? "Escaneie para ver o cardápio e pedir" :
 nicheId === "tourism" ? "Escaneie para ver nossos pacotes e roteiros" :
 nicheId === "services" ? "Escaneie para ver serviços e agendar" :
 nicheId === "legal" ? "Escaneie para consultar serviços jurídicos" :
 nicheId === "real_estate" ? "Escaneie para ver imóveis disponíveis" :
 nicheId === "jobs" ? "Escaneie para ver vagas abertas" :
 nicheId === "events" ? "Escaneie para ver atrações e ingressos" :
 nicheId === "vehicles" ? "Escaneie para ver veículos disponíveis" :
 nicheId === "education" ? "Escaneie para ver cursos e turmas" :
 "Escaneie para ver produtos e novidades"
 );

 const directLinkLabel = base.directLinkLabel || (
 nicheId === "gastronomy" ? "Link Direto do Cardápio" :
 nicheId === "tourism" ? "Link Direto dos Roteiros & Pacotes" :
 nicheId === "services" ? "Link Direto dos Serviços" :
 nicheId === "legal" ? "Link do Escritório" :
 nicheId === "real_estate" ? "Link dos Imóveis" :
 nicheId === "jobs" ? "Link do Mural de Vagas" :
 nicheId === "events" ? "Link dos Ingressos" :
 "Link Direto do Catálogo"
 );

 const qrDownloadFilename = base.qrDownloadFilename || (
 nicheId === "gastronomy" ? "cardapio" :
 nicheId === "tourism" ? "roteiros" :
 nicheId === "services" ? "servicos" :
 nicheId === "events" ? "ingressos" :
 "catalogo"
 );

 const shareMessageTemplate = base.shareMessageTemplate || ((storeName: string, storeUrl: string) => {
 if (nicheId === "gastronomy") {
 return `Olá! Acesse o cardápio oficial de ${storeName} e faça seu pedido direto:\n${storeUrl}`;
 }
 if (nicheId === "tourism") {
 return `Olá! Conheça os roteiros e pacotes exclusivos de ${storeName}:\n${storeUrl}`;
 }
 if (nicheId === "services") {
 return `Olá! Conheça nossos serviços e agende seu horário em ${storeName}:\n${storeUrl}`;
 }
 if (nicheId === "events") {
 return `Olá! Garanta seus ingressos e confira as atrações de ${storeName}:\n${storeUrl}`;
 }
 return `Olá! Conheça nosso catálogo oficial de produtos em ${storeName}:\n${storeUrl}`;
 });

 const departmentLabels = base.departmentLabels || (
 nicheId === "tourism"
 ? {
 geral: "Geral",
 vendas: "Reservas & Cotações",
 suporte: "Suporte ao Viajante",
 financeiro: "Financeiro & Parcelamento",
 logistica: "Embarque & Frota",
 operadora: "Operadoras & Cias Aéreas",
 }
 : nicheId === "gastronomy"
 ? {
 geral: "Geral",
 vendas: "Vendas & Salão",
 suporte: "Suporte & SAC",
 financeiro: "Financeiro & Caixa",
 cozinha_estoque: "Cozinha & Preparo",
 logistica: "Despacho & Motoboy",
 }
 : nicheId === "services"
 ? {
 geral: "Geral",
 vendas: "Recepção & Agendamento",
 suporte: "Atendimento & Dúvidas",
 financeiro: "Financeiro & Pagamentos",
 }
 : {
 geral: "Geral",
 vendas: "Vendas / Comercial",
 suporte: "Suporte / SAC",
 financeiro: "Financeiro / Pix",
 cozinha_estoque: "Estoque & Expedição",
 logistica: "Envio & Rastreio",
 }
 );

 const modifierModalSubtitle = base.modifierModalSubtitle || (
 nicheId === "gastronomy" ? "Personalize adicionais e observações da cozinha" :
 nicheId === "tourism" ? "Personalize opcionais, passeios e preferências do passageiro" :
 nicheId === "services" ? "Personalize complementos e preferências do atendimento" :
 nicheId === "retail" ? "Personalize variações, embalagens e detalhes do item" :
 "Personalize complementos e observações do item"
 );

 const modifierNotesPlaceholder = base.modifierNotesPlaceholder || (
 nicheId === "gastronomy" ? "Ex: Ponto da carne, sem cebola, talheres adicionais..." :
 nicheId === "tourism" ? "Ex: Restrições alimentares no voo, preferências de quarto, assentos..." :
 nicheId === "services" ? "Ex: Preferência de profissional, orientações ou restrições prévias..." :
 nicheId === "retail" ? "Ex: Embalar para presente, cor desejada, instruções de personalização..." :
 "Ex: Instruções especiais, preferências ou detalhes adicionais..."
 );

 const modifierEmptyText = base.modifierEmptyText || (
 nicheId === "gastronomy" ? "Este item não possui adicionais cadastrados." :
 nicheId === "tourism" ? "Este pacote ou roteiro não possui opcionais cadastrados." :
 nicheId === "services" ? "Este serviço não possui complementos cadastrados." :
 nicheId === "retail" ? "Este produto não possui complementos ou variações cadastradas." :
 "Este item não possui opções adicionais cadastradas."
 );

 const modifierNotesLabel = base.modifierNotesLabel || (
 nicheId === "gastronomy" ? "Observações da Cozinha (opcional)" :
 nicheId === "tourism" ? "Observações & Preferências do Viajante" :
 nicheId === "services" ? "Observações do Atendimento" :
 nicheId === "retail" ? "Observações do Pedido" :
 "Observações (opcional)"
 );

 const isFoodBusiness = [
 "restaurante", "pizzaria", "hamburgueria", "cafeteria",
 "confeitaria", "gastronomia", "acougue", "bebidas", "delivery", "food"
 ].includes(nicheId) || nicheId.includes("food") || nicheId.includes("restaurante") || nicheId.includes("gastro");

 return {
 ...base,
 isFoodBusiness,
 shareTitle,
 shareSubtitle,
 qrCardCallout,
 directLinkLabel,
 shareMessageTemplate,
 qrDownloadFilename,
 departmentLabels,
 modifierModalSubtitle,
 modifierNotesPlaceholder,
 modifierEmptyText,
 modifierNotesLabel,
 };
}

/**
 * Normaliza e retorna o mapa semântico refinado para uma determinada loja.
 * Analisa os campos `segment`, `type`, `category`, `niche` e `name` com suporte bilíngue (PT/EN).
 */
export function getNicheSemantics(storeData: any): NicheSemantics {
 const storeName = (storeData?.name || storeData?.stores?.name || "").toLowerCase();
 const explicitSegment = (
 storeData?.segment ||
 storeData?.type ||
 storeData?.category ||
 storeData?.niche ||
 storeData?.stores?.segment ||
 storeData?.stores?.type ||
 storeData?.stores?.category ||
 storeData?.stores?.niche ||
 storeData?.settings?.segment ||
 storeData?.settings?.type ||
 storeData?.settings?.niche ||
 storeData?.stores?.settings?.segment ||
 storeData?.stores?.settings?.type ||
 storeData?.stores?.settings?.niche ||
 ""
 ).toLowerCase();
 const description = (storeData?.description || "").toLowerCase();
 const combined = `${explicitSegment} ${storeName} ${description}`.trim();
 const segment = combined || "retail";

 const rawEntry = resolveRegistryEntry(segment);
 return enrichNicheSemantics(rawEntry);
}

