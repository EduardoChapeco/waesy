import { getNicheSemantics } from "./niche-semantics";

export interface NicheCatalogContext {
 entityName: string;
 entityNamePlural: string;
 nameLabel: string;
 namePlaceholder: string;
 categoryLabel: string;
 shortDescLabel: string;
 shortDescPlaceholder: string;
 descLabel: string;
 descPlaceholder: string;
 brandLabel: string;
 brandPlaceholder: string;
 skuLabel: string;
 skuPlaceholder: string;
 priceLabel: string;
 variationsSectionTitle: string;
 addVariationBtnText: string;
 addDimensionDialogTitle: string;
 addDimensionDialogDesc: string;
 dimensionNameLabel: string;
 dimensionNamePlaceholder: string;
 dimensionValueLabel: string;
 dimensionValuePlaceholder: string;
 suggestedDimensionChips: Array<{ name: string; firstValue: string }>;
 isFoodBusiness: boolean;
 isServiceBusiness: boolean;
 isVehicleBusiness: boolean;
 isRealEstateBusiness: boolean;
 isTourismBusiness?: boolean;
 isSupermarketBusiness?: boolean;
}

export function getNicheCatalogContext(storeOrSegment?: any): NicheCatalogContext {
 const semantics = typeof storeOrSegment === "object"
 ? getNicheSemantics(storeOrSegment)
 : getNicheSemantics({ segment: storeOrSegment });

 switch (semantics.nicheId) {
 // 1. TURISMO, AGÊNCIAS DE VIAGENS & ROTEIROS
 case "tourism":
 return {
 entityName: "Pacote / Roteiro",
 entityNamePlural: "Pacotes & Roteiros de Viagem",
 nameLabel: "Título do Pacote / Destino *",
 namePlaceholder: "Ex: Natal Luz em Gramado com Aéreo e Hospedagem, Excursão Beto Carrero 3 Dias",
 categoryLabel: "Destino / Tipo de Viagem (Nacional, Internacional, Cruzeiros, Excursões)",
 shortDescLabel: "Destaques do Roteiro / Inclusões Rápidas",
 shortDescPlaceholder: "Ex: Inclui aéreo saindo de Chapecó, 4 diárias com café da manhã, transfer e ingressos",
 descLabel: "Itinerário Completo & Informações de Embarque",
 descPlaceholder: "Detalhamento dia a dia, horários de voo/ônibus, política de bagagem, hotelaria e documentação...",
 brandLabel: "Operadora / Cia Aérea / Frota",
 brandPlaceholder: "Ex: CVC, Azul Viagens, Frota Própria ANTT, MSC Cruzeiros",
 skuLabel: "Código do Pacote / Roteiro",
 skuPlaceholder: "Ex: TOUR-GRA-2026",
 priceLabel: "Valor por Pessoa / Pacote (R$)",
 variationsSectionTitle: "Variações de Embarque, Quarto e Acomodação",
 addVariationBtnText: "Adicionar Opção de Quarto / Embarque",
 addDimensionDialogTitle: "Nova Opção de Viagem",
 addDimensionDialogDesc: "Ex: Tipo de Quarto (Single, Double, Triplo), Ponto de Embarque ou Regime (Com Café, All-Inclusive).",
 dimensionNameLabel: "Tipo de Variação (Quarto, Embarque, Regime)",
 dimensionNamePlaceholder: "Ex: Tipo de Quarto, Ponto de Embarque, Regime de Refeições",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Quarto Duplo (Double), Saída Chapecó, Café da Manhã Incluso",
 suggestedDimensionChips: [
 { name: "Tipo de Quarto", firstValue: "Quarto Duplo" },
 { name: "Ponto de Embarque", firstValue: "São Miguel do Oeste / Chapecó" },
 { name: "Regime de Alimentação", firstValue: "Café da Manhã" },
 { name: "Temporada", firstValue: "Alta Temporada" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 isTourismBusiness: true,
 };

 // 2. GASTRONOMIA & DELIVERY
 case "gastronomy":
 return {
 entityName: "Item do Cardápio",
 entityNamePlural: "Itens do Cardápio",
 nameLabel: "Nome do Prato / Item *",
 namePlaceholder: "Ex: Pizza Margherita Especial, Burger Artesanal Duplo, Açaí 500ml",
 categoryLabel: "Sessão do Cardápio",
 shortDescLabel: "Ingredientes Principais / Resumo",
 shortDescPlaceholder: "Ex: Pão brioche selado, 2x smash 90g, cheddar cremoso e bacon crocante",
 descLabel: "Descrição do Prato / Detalhes de Preparo",
 descPlaceholder: "Descreva os ingredientes, ponto sugerido, harmonização e informações de alérgenos...",
 brandLabel: "Cozinha / Linha (Opcional)",
 brandPlaceholder: "Ex: Artesanal, Especial da Casa, Linha Fit",
 skuLabel: "Código do Item no PDV",
 skuPlaceholder: "Ex: PIZ-01, BURG-12",
 priceLabel: "Preço do Prato / Item (R$)",
 variationsSectionTitle: "Tamanhos & Porções (Broto, Média, Grande)",
 addVariationBtnText: "Adicionar Tamanho / Porção",
 addDimensionDialogTitle: "Novo Tamanho ou Variação de Prato",
 addDimensionDialogDesc: "Ex: Tamanho (Broto, Média, Grande), Ponto da Carne (Ao ponto, Bem passado) ou Massa.",
 dimensionNameLabel: "Tipo de Variação (Tamanho, Ponto, Massa)",
 dimensionNamePlaceholder: "Ex: Tamanho, Ponto da Carne, Tipo de Borda",
 dimensionValueLabel: "Primeira Opção (Ex: Grande, Ao Ponto)",
 dimensionValuePlaceholder: "Ex: Grande, Ao Ponto, Massa Pan",
 suggestedDimensionChips: [
 { name: "Tamanho", firstValue: "Grande" },
 { name: "Ponto da Carne", firstValue: "Ao Ponto" },
 { name: "Tipo de Massa", firstValue: "Tradicional" },
 { name: "Porção", firstValue: "Individual" },
 ],
 isFoodBusiness: true,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 3. SERVIÇOS, BELEZA, ESTÉTICA & BARBEARIA
 case "services":
 return {
 entityName: "Procedimento / Serviço",
 entityNamePlural: "Serviços & Procedimentos",
 nameLabel: "Nome do Procedimento / Serviço *",
 namePlaceholder: "Ex: Corte Degradê Masculino com Barba, Limpeza de Pele Profunda, Massagem Relaxante",
 categoryLabel: "Especialidade / Categoria",
 shortDescLabel: "Resumo do Atendimento",
 shortDescPlaceholder: "Ex: Atendimento completo com toalha quente, hidratação facial e finalização com pomada",
 descLabel: "Descrição do Procedimento & Benefícios",
 descPlaceholder: "Detalhamento dos passos, produtos utilizados, contraindicações e cuidados pós-sessão...",
 brandLabel: "Linha de Produtos / Profissional",
 brandPlaceholder: "Ex: Linha Premium, L'Oréal, Wella",
 skuLabel: "Código do Procedimento",
 skuPlaceholder: "Ex: SRV-CORTE-01",
 priceLabel: "Valor da Sessão / Serviço (R$)",
 variationsSectionTitle: "Opções de Duração ou Nível do Profissional",
 addVariationBtnText: "Adicionar Variação de Atendimento",
 addDimensionDialogTitle: "Nova Variação de Serviço",
 addDimensionDialogDesc: "Ex: Duração (30 min, 60 min), Nível (Profissional Sênior, Master) ou Pacote.",
 dimensionNameLabel: "Propriedade (Duração, Profissional)",
 dimensionNamePlaceholder: "Ex: Duração, Profissional, Tipo de Cuidado",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: 60 minutos, Profissional Master",
 suggestedDimensionChips: [
 { name: "Duração", firstValue: "60 Minutos" },
 { name: "Profissional", firstValue: "Master" },
 { name: "Tipo de Atendimento", firstValue: "Individual" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: true,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 4. VEÍCULOS & CONCESSIONÁRIA
 case "vehicles":
 return {
 entityName: "Veículo",
 entityNamePlural: "Estoque de Veículos",
 nameLabel: "Título do Veículo (Marca, Modelo, Ano) *",
 namePlaceholder: "Ex: Honda Civic Touring 1.5 Turbo Automático 2022",
 categoryLabel: "Categoria de Veículo",
 shortDescLabel: "Destaques Rápidos (KM, Câmbio, Laudo)",
 shortDescPlaceholder: "Ex: 45.000 km, Único Dono, Laudo Cautelar 100% Aprovado, Teto Solar",
 descLabel: "Ficha Técnica Completa & Opcionais",
 descPlaceholder: "Liste todos os opcionais (bancos em couro, multimídia, sensor de ré, IPVA pago)...",
 brandLabel: "Marca / Montadora",
 brandPlaceholder: "Ex: Honda, Toyota, BMW, Chevrolet",
 skuLabel: "Placa / Chassi Final",
 skuPlaceholder: "Ex: PLACA-9G81",
 priceLabel: "Valor de Venda (R$)",
 variationsSectionTitle: "Versões ou Configurações do Veículo",
 addVariationBtnText: "Adicionar Versão / Cor",
 addDimensionDialogTitle: "Nova Versão ou Cor de Veículo",
 addDimensionDialogDesc: "Ex: Versão (Sport, Touring), Câmbio (Manual, Automático) ou Cor.",
 dimensionNameLabel: "Propriedade (Versão, Câmbio, Cor)",
 dimensionNamePlaceholder: "Ex: Versão, Cor, Câmbio",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Touring Turbo, Prata Lunar",
 suggestedDimensionChips: [
 { name: "Versão", firstValue: "Touring" },
 { name: "Cor", firstValue: "Preto Ninja" },
 { name: "Câmbio", firstValue: "Automático" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: true,
 isRealEstateBusiness: false,
 };

 // 5. IMOBILIÁRIA & IMÓVEIS
 case "real_estate":
 return {
 entityName: "Imóvel",
 entityNamePlural: "Catálogo de Imóveis",
 nameLabel: "Título do Imóvel *",
 namePlaceholder: "Ex: Apartamento 3 Suítes Alto Padrão Centro com Sacada Gourmet",
 categoryLabel: "Tipo de Imóvel (Apto, Casa, Terreno)",
 shortDescLabel: "Resumo dos Cômodos & Metragem",
 shortDescPlaceholder: "Ex: 180m² privativos, 3 suítes, 2 vagas de garagem e vista livre",
 descLabel: "Descrição do Imóvel & Condomínio",
 descPlaceholder: "Detalhes de acabamento, infraestrutura de lazer do prédio, mobília inclusa e localização...",
 brandLabel: "Construtora / Empreendimento",
 brandPlaceholder: "Ex: Empreendimento Grand Tower",
 skuLabel: "Código de Referência do Imóvel",
 skuPlaceholder: "Ex: AP-CENTRO-301",
 priceLabel: "Valor do Imóvel (R$)",
 variationsSectionTitle: "Tipologias & Andares",
 addVariationBtnText: "Adicionar Tipologia",
 addDimensionDialogTitle: "Nova Tipologia de Imóvel",
 addDimensionDialogDesc: "Ex: Andar (Baixo, Alto), Posição Solar (Norte, Leste) ou Vagas.",
 dimensionNameLabel: "Tipo de Variação (Andar, Sol, Vagas)",
 dimensionNamePlaceholder: "Ex: Andar, Posição Solar, Vagas",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Andar Alto, Sol da Manhã",
 suggestedDimensionChips: [
 { name: "Andar", firstValue: "Andar Alto" },
 { name: "Posição Solar", firstValue: "Sol da Manhã" },
 { name: "Vagas", firstValue: "2 Vagas Cobertas" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: true,
 };

 // 6. EVENTOS, SHOWS & INGRESSOS
 case "events":
 return {
 entityName: "Ingresso / Lote",
 entityNamePlural: "Lotes & Ingressos",
 nameLabel: "Título do Evento / Show *",
 namePlaceholder: "Ex: Festival de Verão 2026 - Show Nacional com Alok",
 categoryLabel: "Tipo de Evento (Show, Festival, Teatro, Congresso)",
 shortDescLabel: "Data, Horário e Local",
 shortDescPlaceholder: "Ex: 15 de Outubro às 22h no Pavilhão Principal - Classificação 18 anos",
 descLabel: "Informações Gerais, Atrações e Regras",
 descPlaceholder: "Grade de artistas, política de meia-entrada, itens proibidos e acessibilidade...",
 brandLabel: "Produtora / Realização",
 brandPlaceholder: "Ex: Opus Entretenimento, Live Talentos",
 skuLabel: "Código do Evento",
 skuPlaceholder: "Ex: SHOW-2026-01",
 priceLabel: "Valor do Ingresso (R$)",
 variationsSectionTitle: "Setores & Lotes de Ingresso",
 addVariationBtnText: "Adicionar Setor / Lote",
 addDimensionDialogTitle: "Novo Setor ou Lote",
 addDimensionDialogDesc: "Ex: Setor (Pista, Camarote Open Bar, VIP) ou Tipo (Inteira, Meia-Entrada).",
 dimensionNameLabel: "Propriedade (Setor, Tipo de Ingresso)",
 dimensionNamePlaceholder: "Ex: Setor, Tipo de Ingresso, Lote",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Camarote Open Bar, Inteira",
 suggestedDimensionChips: [
 { name: "Setor", firstValue: "Pista Premium" },
 { name: "Modalidade", firstValue: "Inteira" },
 { name: "Lote", firstValue: "1º Lote Promocional" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 7. EDUCAÇÃO, CURSOS & WORKSHOPS
 case "education":
 return {
 entityName: "Curso / Turma",
 entityNamePlural: "Cursos & Workshops",
 nameLabel: "Nome do Curso / Formação *",
 namePlaceholder: "Ex: Formação em Inteligência Artificial Aplicada aos Negócios, Curso Prático de Oratória",
 categoryLabel: "Área do Conhecimento",
 shortDescLabel: "Carga Horária & Certificação",
 shortDescPlaceholder: "Ex: 40h de aulas práticas com certificado emitido e mentoria semanal",
 descLabel: "Ementa Completa, Metodologia e Pré-requisitos",
 descPlaceholder: "Módulos do curso, biografia do instrutor, material didático incluso e suporte...",
 brandLabel: "Escola / Instrutor",
 brandPlaceholder: "Ex: Instituto de Educação Avançada",
 skuLabel: "Código da Turma",
 skuPlaceholder: "Ex: CRS-IA-2026",
 priceLabel: "Mensalidade / Valor da Matrícula (R$)",
 variationsSectionTitle: "Turnos, Turmas e Modalidades",
 addVariationBtnText: "Adicionar Opção de Turma",
 addDimensionDialogTitle: "Nova Opção de Turma",
 addDimensionDialogDesc: "Ex: Turno (Noturno, Matutino, Sábados) ou Modalidade (Presencial, Online Ao Vivo).",
 dimensionNameLabel: "Tipo de Variação",
 dimensionNamePlaceholder: "Ex: Turno, Modalidade, Material Incluso",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Noturno (19h às 22h), 100% Presencial",
 suggestedDimensionChips: [
 { name: "Turno", firstValue: "Noturno" },
 { name: "Modalidade", firstValue: "Presencial" },
 { name: "Plano", firstValue: "Acesso Completo + Mentoria" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 8. LOCAÇÃO DE EQUIPAMENTOS & ESTRUTURAS
 case "rental":
 return {
 entityName: "Equipamento / Bem",
 entityNamePlural: "Equipamentos & Bens",
 nameLabel: "Nome do Equipamento / Estrutura *",
 namePlaceholder: "Ex: Caixa Ativa JBL EON 715 1300W, Tenda Piramidal 10x10m",
 categoryLabel: "Categoria de Equipamento",
 shortDescLabel: "Resumo Técnico / Itens Inclusos",
 shortDescPlaceholder: "Ex: Acompanha tripé reforçado e cabos balanceados XLR 10m",
 descLabel: "Ficha Técnica, Dimensões e Restrições",
 descPlaceholder: "Voltagem, potência, tempo estimado de montagem, peso e requisitos de transporte...",
 brandLabel: "Marca / Fabricante",
 brandPlaceholder: "Ex: JBL, QSC, Behringer, Estruturas Sul",
 skuLabel: "Código do Patrimônio",
 skuPlaceholder: "Ex: PAT-SOM-01",
 priceLabel: "Valor da Diária de Locação (R$)",
 variationsSectionTitle: "Variações do Equipamento (Voltagem, Kit)",
 addVariationBtnText: "Adicionar Variação de Equipamento",
 addDimensionDialogTitle: "Nova Variação de Equipamento",
 addDimensionDialogDesc: "Ex: Voltagem (110V, 220V, Bivolt) ou Kit (Com Tripé, Sem Tripé).",
 dimensionNameLabel: "Propriedade do Equipamento",
 dimensionNamePlaceholder: "Ex: Voltagem, Kit / Configuração",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: 220V, Kit Completo",
 suggestedDimensionChips: [
 { name: "Voltagem", firstValue: "220V" },
 { name: "Kit", firstValue: "Com Pedestal e Cabos" },
 { name: "Tamanho", firstValue: "10x10 Metros" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 9. PET SHOP & VETERINÁRIA
 case "pet":
 return {
 entityName: "Produto Pet",
 entityNamePlural: "Produtos Pet & Rações",
 nameLabel: "Nome do Produto / Ração *",
 namePlaceholder: "Ex: Ração Super Premium Cães Adultos Frango 15kg, Antipulgas Simparic",
 categoryLabel: "Categoria Pet",
 shortDescLabel: "Indicação & Benefícios Principais",
 shortDescPlaceholder: "Ex: Para cães de porte médio a grande, sem corantes e rica em ômega 3 e 6",
 descLabel: "Composição, Níveis de Garantia e Modo de Uso",
 descPlaceholder: "Guia de alimentação diária, tabela de ingredientes, peso e orientações de conservação...",
 brandLabel: "Marca / Laboratório",
 brandPlaceholder: "Ex: Premier, Royal Canin, Zoetis, Bravecto",
 skuLabel: "Código EAN / SKU",
 skuPlaceholder: "Ex: 7891234567890",
 priceLabel: "Preço de Venda (R$)",
 variationsSectionTitle: "Variações de Embalagem (Peso, Sabor, Porte)",
 addVariationBtnText: "Adicionar Pacote / Variação",
 addDimensionDialogTitle: "Nova Variação de Embalagem",
 addDimensionDialogDesc: "Ex: Peso do Pacote (1kg, 3kg, 15kg), Sabor ou Porte do Animal.",
 dimensionNameLabel: "Tipo de Variação (Peso, Sabor, Porte)",
 dimensionNamePlaceholder: "Ex: Peso da Embalagem, Sabor, Porte",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: 15kg, Frango & Arroz, Porte Grande",
 suggestedDimensionChips: [
 { name: "Peso da Embalagem", firstValue: "15kg" },
 { name: "Sabor", firstValue: "Frango & Arroz" },
 { name: "Porte", firstValue: "Médio / Grande" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 10. SUPERMERCADO & HORTIFRÚTI
 case "supermarket":
 return {
 entityName: "Item de Mercado",
 entityNamePlural: "Itens de Mercado & Hortifrúti",
 nameLabel: "Nome do Produto / Alimento *",
 namePlaceholder: "Ex: Filé Mignon Bovino Resfriado Peça a Vácuo, Maçã Gala Selecionada",
 categoryLabel: "Sessão do Mercado (Açougue, Hortifrúti, Mercearia)",
 shortDescLabel: "Resumo do Produto / Origem",
 shortDescPlaceholder: "Ex: Corte nobre macio e limpo, ideal para grelhados e assados",
 descLabel: "Informações Nutricionais e Conservação",
 descPlaceholder: "Tabela de valor energético, conservação e detalhes do produtor...",
 brandLabel: "Marca / Produtor",
 brandPlaceholder: "Ex: Friboi, Seara, Nestlé, Produtor Local",
 skuLabel: "Código EAN / Barras",
 skuPlaceholder: "Ex: 7891234567890",
 priceLabel: "Preço de Venda (R$)",
 variationsSectionTitle: "Variações de Corte ou Embalagem",
 addVariationBtnText: "Adicionar Variação de Embalagem",
 addDimensionDialogTitle: "Nova Variação de Corte / Peso",
 addDimensionDialogDesc: "Ex: Tipo de Corte (Em Bifes, Peça Inteira, Moído) ou Embalagem (500g, 1kg).",
 dimensionNameLabel: "Tipo de Variação (Corte, Peso)",
 dimensionNamePlaceholder: "Ex: Tipo de Corte, Peso da Embalagem",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Em Bifes Finos, 1kg",
 suggestedDimensionChips: [
 { name: "Tipo de Corte", firstValue: "Em Bifes" },
 { name: "Peso da Embalagem", firstValue: "1kg" },
 { name: "Maturação", firstValue: "Tradicional" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 isSupermarketBusiness: true,
 };

 // 11. ELETRÔNICOS & ASSISTÊNCIA TÉCNICA
 case "tech_repair":
 return {
 entityName: "Aparelho / Peça",
 entityNamePlural: "Aparelhos, Peças & Acessórios",
 nameLabel: "Nome do Aparelho / Acessório *",
 namePlaceholder: "Ex: iPhone 15 Pro Max 256GB Titânio Natural, Película 3D de Vidro",
 categoryLabel: "Categoria de Eletrônicos",
 shortDescLabel: "Especificações Rápidas",
 shortDescPlaceholder: "Ex: 256GB, Tela OLED 6.7', Acompanha cabo USB-C, 1 ano de garantia",
 descLabel: "Ficha Técnica, Compatibilidade e Garantia",
 descPlaceholder: "Processador, memória RAM, portas de conexão, itens inclusos na caixa e termos de garantia...",
 brandLabel: "Marca / Fabricante",
 brandPlaceholder: "Ex: Apple, Samsung, Xiaomi, Motorola, Dell",
 skuLabel: "Código SKU / Part Number",
 skuPlaceholder: "Ex: IPH-15PM-256",
 priceLabel: "Preço de Venda (R$)",
 variationsSectionTitle: "Variações (Armazenamento, Voltagem, Cor)",
 addVariationBtnText: "Adicionar Variação Técnica",
 addDimensionDialogTitle: "Nova Variação Técnica",
 addDimensionDialogDesc: "Ex: Capacidade (128GB, 256GB, 512GB), Voltagem (110V, 220V, Bivolt) ou Cor.",
 dimensionNameLabel: "Propriedade Técnica",
 dimensionNamePlaceholder: "Ex: Capacidade, Voltagem, Cor",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: 256GB, Bivolt, Grafite",
 suggestedDimensionChips: [
 { name: "Capacidade", firstValue: "256GB" },
 { name: "Voltagem", firstValue: "Bivolt" },
 { name: "Cor", firstValue: "Grafite" },
 { name: "Condição", firstValue: "Novo Lacrado" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 12. ADVOCACIA & JURÍDICO
 case "legal":
 return {
 entityName: "Serviço Jurídico / Parecer",
 entityNamePlural: "Serviços Jurídicos & Pareceres",
 nameLabel: "Nome do Serviço / Parecer Jurídico *",
 namePlaceholder: "Ex: Assessoria Jurídica Mensal Empresarial, Parecer Trabalhista Especializado",
 categoryLabel: "Área do Direito (Cível, Trabalhista, Tributário, Família)",
 shortDescLabel: "Escopo Resumido / Entregáveis",
 shortDescPlaceholder: "Ex: Análise de contratos, representação em audiências e consultoria preventiva contínua",
 descLabel: "Descrição do Escopo & Prazos Estimados",
 descPlaceholder: "Detalhamento das peças inclusas, reuniões de alinhamento e regras de honorários...",
 brandLabel: "Área / Sócio Responsável",
 brandPlaceholder: "Ex: Direito Empresarial, Dr. Silva",
 skuLabel: "Código do Procedimento",
 skuPlaceholder: "Ex: JUR-CONS-01",
 priceLabel: "Honorários Estimados / Mensalidade (R$)",
 variationsSectionTitle: "Modalidades de Atendimento / Complexidade",
 addVariationBtnText: "Adicionar Modalidade",
 addDimensionDialogTitle: "Nova Modalidade de Atendimento",
 addDimensionDialogDesc: "Ex: Modalidade (Mensal, Por Demanda), Complexidade ou Volume de Contratos.",
 dimensionNameLabel: "Tipo de Variação",
 dimensionNamePlaceholder: "Ex: Modalidade, Complexidade",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Mensal Recorrente, Média Complexidade",
 suggestedDimensionChips: [
 { name: "Modalidade", firstValue: "Mensal" },
 { name: "Complexidade", firstValue: "Padrão" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: true,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 13. EMPREGOS & RECRUTAMENTO
 case "jobs":
 return {
 entityName: "Vaga / Oportunidade",
 entityNamePlural: "Vagas & Oportunidades",
 nameLabel: "Título do Cargo / Vaga *",
 namePlaceholder: "Ex: Desenvolvedor Full Stack Sênior (Remoto), Analista Financeiro Pleno",
 categoryLabel: "Área de Atuação (Tecnologia, Finanças, Vendas, Operações)",
 shortDescLabel: "Resumo da Posição / Modelo de Trabalho",
 shortDescPlaceholder: "Ex: Modelo Híbrido, CLT ou PJ com benefícios completos e plano de carreira",
 descLabel: "Requisitos, Responsabilidades e Benefícios",
 descPlaceholder: "Principais atribuições do dia a dia, stack tecnológica, soft skills e benefícios...",
 brandLabel: "Empresa Contratante / Cliente",
 brandPlaceholder: "Ex: Tech Corp, Confidencial",
 skuLabel: "Código da Vaga",
 skuPlaceholder: "Ex: VAGA-DEV-2026",
 priceLabel: "Faixa Salarial / Remuneração (R$)",
 variationsSectionTitle: "Senioridade e Modalidade de Contratação",
 addVariationBtnText: "Adicionar Variação de Vaga",
 addDimensionDialogTitle: "Nova Variação de Vaga",
 addDimensionDialogDesc: "Ex: Senioridade (Júnior, Pleno, Sênior) ou Contrato (CLT, PJ).",
 dimensionNameLabel: "Tipo de Variação",
 dimensionNamePlaceholder: "Ex: Senioridade, Regime de Contratação",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Sênior, CLT",
 suggestedDimensionChips: [
 { name: "Senioridade", firstValue: "Sênior" },
 { name: "Regime de Contrato", firstValue: "CLT" },
 { name: "Modelo", firstValue: "Remoto" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 14. FARMÁCIA, DROGARIA & COSMÉTICOS
 case "pharmacy":
 return {
 entityName: "Medicamento / Cosmético",
 entityNamePlural: "Medicamentos & Cosméticos",
 nameLabel: "Nome do Medicamento / Produto *",
 namePlaceholder: "Ex: Dipirona Monoidratada 500mg 20 Comprimidos, Protetor Solar Facial FPS 70",
 categoryLabel: "Categoria da Farmácia (Medicamentos, Dermocosméticos, Higiene, Suplementos)",
 shortDescLabel: "Princípio Ativo & Dosagem",
 shortDescPlaceholder: "Ex: 500mg por comprimido - Uso adulto e pediátrico acima de 15 anos",
 descLabel: "Bula Resumida, Modo de Uso e Contraindicações",
 descPlaceholder: "Indicações terapêuticas, posologia recomendada e advertências importantes...",
 brandLabel: "Laboratório / Fabricante",
 brandPlaceholder: "Ex: EMS, Medley, Eurofarma, La Roche-Posay",
 skuLabel: "Registro MS / EAN",
 skuPlaceholder: "Ex: 7891234567890",
 priceLabel: "Preço de Venda (R$)",
 variationsSectionTitle: "Variações de Apresentação (Dosagem, Quantidade)",
 addVariationBtnText: "Adicionar Apresentação",
 addDimensionDialogTitle: "Nova Apresentação Farmacêutica",
 addDimensionDialogDesc: "Ex: Dosagem (500mg, 1g) ou Quantidade de Comprimidos (10, 20, 30 cps).",
 dimensionNameLabel: "Propriedade (Dosagem, Conteúdo)",
 dimensionNamePlaceholder: "Ex: Dosagem, Quantidade de Comprimidos, Volume",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: 500mg, 20 Comprimidos",
 suggestedDimensionChips: [
 { name: "Dosagem", firstValue: "500mg" },
 { name: "Quantidade", firstValue: "20 Comprimidos" },
 { name: "Volume", firstValue: "200ml" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 15. JORNALISMO & NOTÍCIAS
 case "news":
 return {
 entityName: "Reportagem / Espaço Publicitário",
 entityNamePlural: "Matérias & Espaços Publicitários",
 nameLabel: "Título da Matéria / Espaço Publicitário *",
 namePlaceholder: "Ex: Banner Topo Página Principal 728x90, Reportagem Patrocinada Especial",
 categoryLabel: "Editoria / Seção do Portal",
 shortDescLabel: "Resumo / Chamada (Linha Fina)",
 shortDescPlaceholder: "Ex: Destaque de capa com link direto e relatório de visualizações",
 descLabel: "Conteúdo da Matéria / Especificações de Mídia",
 descPlaceholder: "Texto completo da reportagem, links de referência, formatos aceitos...",
 brandLabel: "Autor / Patrocinador",
 brandPlaceholder: "Ex: Redação Central, Anunciante Local",
 skuLabel: "Código da Publicação",
 skuPlaceholder: "Ex: NOT-2026-01",
 priceLabel: "Valor de Anúncio / Veiculação (R$)",
 variationsSectionTitle: "Formatos & Períodos de Veiculação",
 addVariationBtnText: "Adicionar Formato / Período",
 addDimensionDialogTitle: "Novo Formato de Mídia",
 addDimensionDialogDesc: "Ex: Formato (Banner Topo, Super Leaderboard) ou Duração (7 dias, 30 dias).",
 dimensionNameLabel: "Tipo de Variação",
 dimensionNamePlaceholder: "Ex: Formato, Duração de Veiculação",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Banner Topo, 30 Dias",
 suggestedDimensionChips: [
 { name: "Formato", firstValue: "Banner Topo" },
 { name: "Duração", firstValue: "30 Dias" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 16. ATACADO, DISTRIBUIDORA & B2B
 case "wholesale":
 return {
 entityName: "Grade B2B / Caixa Master",
 entityNamePlural: "Grades B2B & Caixas Master",
 nameLabel: "Nome do Produto / Grade Atacado *",
 namePlaceholder: "Ex: Caixa Master Óleo de Soja 20x900ml, Fardo Farinha de Trigo 10x1kg",
 categoryLabel: "Linha de Distribuição / Atacado",
 shortDescLabel: "Embalagem Mínima & Quantidade por Caixa",
 shortDescPlaceholder: "Ex: Embalagem com 20 unidades de 900ml, paletização padrão 60 caixas",
 descLabel: "Ficha Técnica, NCM, ST e Dados Tributários",
 descPlaceholder: "Código NCM, CEST, alíquotas aplicáveis e peso bruto...",
 brandLabel: "Fabricante / Linha",
 brandPlaceholder: "Ex: Bunge, Cargill, Moinho Sul",
 skuLabel: "Código EAN da Caixa / DUN-14",
 skuPlaceholder: "Ex: 17891234567897",
 priceLabel: "Preço por Caixa / Fardo (R$)",
 variationsSectionTitle: "Variações de Fardo, Caixa e Palete",
 addVariationBtnText: "Adicionar Embalagem Atacado",
 addDimensionDialogTitle: "Nova Embalagem de Atacado",
 addDimensionDialogDesc: "Ex: Tipo de Embalagem (Caixa com 12, Caixa com 24) ou Palete Fechado.",
 dimensionNameLabel: "Tipo de Variação (Caixa, Palete)",
 dimensionNamePlaceholder: "Ex: Tipo de Embalagem, Quantidade Mínima",
 dimensionValueLabel: "Primeira Opção",
 dimensionValuePlaceholder: "Ex: Caixa com 24 un, Palete com 40 cx",
 suggestedDimensionChips: [
 { name: "Embalagem", firstValue: "Caixa com 24 un" },
 { name: "Paletização", firstValue: "Palete Padrão" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };

 // 17. PADRÃO: VAREJO & MODA (Roupas, Calçados, Comércio Geral)
 case "retail":
 default:
 return {
 entityName: "Produto",
 entityNamePlural: "Produtos",
 nameLabel: "Nome do Produto *",
 namePlaceholder: "Ex: Camiseta Básica Algodão Egípcio, Calça Jeans Slim",
 categoryLabel: "Categoria do Produto",
 shortDescLabel: "Resumo do Produto",
 shortDescPlaceholder: "Ex: 100% algodão egípcio com toque macio e caimento impecável",
 descLabel: "Descrição Completa & Tabela de Medidas",
 descPlaceholder: "Composição do tecido, guia de tamanhos, instruções de lavagem e diferenciais...",
 brandLabel: "Marca / Fabricante",
 brandPlaceholder: "Ex: Nike, Zara, Autoral",
 skuLabel: "Código SKU",
 skuPlaceholder: "Ex: CAM-ALG-001",
 priceLabel: "Preço de Venda (R$)",
 variationsSectionTitle: "Grade de Variações (Tamanho, Cor, Tecido)",
 addVariationBtnText: "Adicionar Variação de Grade",
 addDimensionDialogTitle: "Nova Dimensão de Grade",
 addDimensionDialogDesc: "Ex: Tamanho (P, M, G, GG), Cor (Preto, Branco) ou Numeração (36 ao 44).",
 dimensionNameLabel: "Nome da Dimensão (Tamanho, Cor, Numeração)",
 dimensionNamePlaceholder: "Ex: Tamanho, Cor, Numeração",
 dimensionValueLabel: "Primeira Opção / Valor",
 dimensionValuePlaceholder: "Ex: M, Azul Marinho, 38",
 suggestedDimensionChips: [
 { name: "Tamanho", firstValue: "M" },
 { name: "Cor", firstValue: "Preto" },
 { name: "Numeração", firstValue: "38" },
 { name: "Tecido", firstValue: "Algodão" },
 ],
 isFoodBusiness: false,
 isServiceBusiness: false,
 isVehicleBusiness: false,
 isRealEstateBusiness: false,
 };
 }
}
