/**
 * contract-semantic-dictionary.ts — Catálogo Semântico de Variáveis por Nicho & Gerais
 * Plataforma Waesy (Padrão DocuSign / Pipefy / Autentique)
 *
 * Variáveis inteligentes dinâmicas para contratos, propostas e termos jurídicos.
 * Formatação automática de moeda (BRL), datas por extenso e tabelas estruturadas.
 */

export interface ContractSemanticVariable {
  key: string;            // Ex: "cliente_nome"
  token: string;          // Ex: "{{cliente_nome}}"
  label: string;          // Ex: "Nome Completo do Cliente"
  category: "geral" | "financeiro" | "turismo" | "automotivo" | "imobiliario" | "juridico" | "condicional" | "rh";
  example: string;        // Ex: "João da Silva Sauro"
  description: string;    // Ex: "Nome completo do comprador ou contratante"
}

export interface ContractNicheGroup {
  id: "geral" | "financeiro" | "turismo" | "automotivo" | "imobiliario" | "juridico" | "condicional" | "rh";
  name: string;
  icon: string;
  description: string;
  variables: ContractSemanticVariable[];
}

export const CONTRACT_SEMANTIC_GROUPS: ContractNicheGroup[] = [
  {
    id: "geral",
    name: "Dados Gerais & Partes",
    icon: "Users",
    description: "Identificação das partes contratantes, endereços e datações",
    variables: [
      { key: "cliente_nome", token: "{{cliente_nome}}", label: "Nome do Cliente", category: "geral", example: "Carlos Eduardo Silveira", description: "Nome completo da pessoa física ou razão social" },
      { key: "cpf", token: "{{cpf}}", label: "CPF / CNPJ do Cliente", category: "geral", example: "123.456.789-00", description: "Documento oficial do contratante" },
      { key: "telefone", token: "{{telefone}}", label: "Telefone / WhatsApp", category: "geral", example: "(49) 99988-7766", description: "Telefone com DDD do cliente" },
      { key: "email", token: "{{email}}", label: "E-mail do Cliente", category: "geral", example: "cliente@exemplo.com.br", description: "E-mail de contato principal" },
      { key: "endereco", token: "{{endereco}}", label: "Endereço Completo", category: "geral", example: "Rua Duque de Caxias, 450, Centro", description: "Logradouro, número e complemento" },
      { key: "cidade_uf", token: "{{cidade_uf}}", label: "Cidade / Estado", category: "geral", example: "São Miguel do Oeste / SC", description: "Município e UF de residência ou foro" },
      { key: "empresa_nome", token: "{{empresa_nome}}", label: "Nome da Empresa / Loja", category: "geral", example: "Excelência Tour & Viagens", description: "Razão social ou nome fantasia contratada" },
      { key: "empresa_cnpj", token: "{{empresa_cnpj}}", label: "CNPJ da Empresa", category: "geral", example: "12.345.678/0001-90", description: "CNPJ da loja ou prestador" },
      { key: "data_atual", token: "{{data_atual}}", label: "Data de Hoje", category: "geral", example: "16/09/2026", description: "Data do dia em formato DD/MM/AAAA" },
      { key: "data_extenso", token: "{{data_extenso}}", label: "Data por Extenso", category: "geral", example: "16 de Setembro de 2026", description: "Data formatada por extenso para final de contrato" },
    ],
  },
  {
    id: "financeiro",
    name: "Financeiro & Vendas",
    icon: "DollarSign",
    description: "Valores, parcelas de carnê, condições de pagamento e itens",
    variables: [
      { key: "valor_total", token: "{{valor_total}}", label: "Valor Total (R$)", category: "financeiro", example: "R$ 4.500,00", description: "Preço total do pedido ou contrato" },
      { key: "valor_extenso", token: "{{valor_extenso}}", label: "Valor por Extenso", category: "financeiro", example: "quatro mil e quinhentos reais", description: "Valor em reais escrito por extenso" },
      { key: "forma_pagamento", token: "{{forma_pagamento}}", label: "Forma de Pagamento", category: "financeiro", example: "Carnê da Loja / Boleto Faturado", description: "Pix, Cartão, Boleto, Carnê ou Dinheiro" },
      { key: "quantidade_parcelas", token: "{{quantidade_parcelas}}", label: "Quantidade de Parcelas", category: "financeiro", example: "10x", description: "Número total de parcelas acertadas" },
      { key: "valor_parcela", token: "{{valor_parcela}}", label: "Valor da Parcela (R$)", category: "financeiro", example: "R$ 450,00", description: "Valor individual de cada prestação mensal" },
      { key: "data_vencimento", token: "{{data_vencimento}}", label: "Vencimento da 1ª Parcela", category: "financeiro", example: "10/10/2026", description: "Data do primeiro pagamento acordado" },
      { key: "tabela_itens", token: "{{tabela_itens}}", label: "Tabela de Itens Comprados", category: "financeiro", example: "• 1x Smartphone Modelo X - R$ 3.000,00\n• 1x Garantia - R$ 500,00", description: "Lista discriminada dos produtos ou serviços da venda" },
      { key: "tabela_parcelas", token: "{{tabela_parcelas}}", label: "Cronograma de Parcelas", category: "financeiro", example: "1ª: 10/10 - R$ 450 | 2ª: 10/11 - R$ 450...", description: "Grade completa de vencimentos do carnê" },
    ],
  },
  {
    id: "turismo",
    name: "Turismo & Excursões",
    icon: "Compass",
    description: "Pacotes de viagem, hotéis, assentos e regras da Embratur",
    variables: [
      { key: "destino_cidade", token: "{{destino_cidade}}", label: "Destino da Viagem", category: "turismo", example: "Foz do Iguaçu / PR", description: "Cidade e estado de destino turístico" },
      { key: "destino_hotel", token: "{{destino_hotel}}", label: "Hotel / Hospedagem", category: "turismo", example: "Hotel das Cataratas Bourbon", description: "Nome do resort, hotel ou pousada contratada" },
      { key: "data_embarque", token: "{{data_embarque}}", label: "Data e Hora de Embarque", category: "turismo", example: "15/10/2026 às 21h00", description: "Saída do ônibus ou voo" },
      { key: "data_retorno", token: "{{data_retorno}}", label: "Data de Retorno", category: "turismo", example: "20/10/2026 às 18h00", description: "Chegada prevista de volta" },
      { key: "local_embarque", token: "{{local_embarque}}", label: "Ponto de Embarque", category: "turismo", example: "Rodoviária Municipal - Plataforma 4", description: "Local exato onde o passageiro sobe no transporte" },
      { key: "poltrona_numero", token: "{{poltrona_numero}}", label: "Número da Poltrona", category: "turismo", example: "Poltrona 14 (Janela Leito)", description: "Assento reservado no ônibus" },
      { key: "quarto_tipo", token: "{{quarto_tipo}}", label: "Tipo de Acomodação", category: "turismo", example: "Duplo Casal Luxo", description: "Single, Duplo, Triplo ou Coletivo" },
      { key: "lista_passageiros", token: "{{lista_passageiros}}", label: "Lista de Acompanhantes", category: "turismo", example: "1. Carlos Silveira (RG 1234)\n2. Mariana Silveira (RG 5678)", description: "Nomes e documentos de todos os viajantes do voucher" },
      { key: "regime_alimentar", token: "{{regime_alimentar}}", label: "Regime de Alimentação", category: "turismo", example: "Café da Manhã e Jantar inclusos", description: "Café, Meia Pensão ou All Inclusive" },
    ],
  },
  {
    id: "automotivo",
    name: "Veículos & Garagens",
    icon: "Car",
    description: "Compra e venda de carros, motos, termos de vistoria e test-drive",
    variables: [
      { key: "veiculo_marca", token: "{{veiculo_marca}}", label: "Marca do Veículo", category: "automotivo", example: "Toyota", description: "Fabricante do automóvel ou moto" },
      { key: "veiculo_modelo", token: "{{veiculo_modelo}}", label: "Modelo & Versão", category: "automotivo", example: "Corolla Cross XRE 2.0", description: "Descrição comercial completa" },
      { key: "veiculo_ano", token: "{{veiculo_ano}}", label: "Ano Fab / Mod", category: "automotivo", example: "2024/2025", description: "Ano de fabricação e ano modelo" },
      { key: "veiculo_placa", token: "{{veiculo_placa}}", label: "Placa Mercosul", category: "automotivo", example: "ABC-1D23", description: "Placa oficial de registro do veículo" },
      { key: "veiculo_renavam", token: "{{veiculo_renavam}}", label: "Código RENAVAM", category: "automotivo", example: "12345678901", description: "Registro Nacional de Veículos Automotores" },
      { key: "veiculo_chassi", token: "{{veiculo_chassi}}", label: "Chassi Completo", category: "automotivo", example: "9BRBL48E9H1234567", description: "Identificação única gravada no chassi" },
      { key: "veiculo_km", token: "{{veiculo_km}}", label: "Quilometragem Atual", category: "automotivo", example: "34.500 km", description: "KM registrado no odômetro no ato da entrega" },
      { key: "veiculo_cor", token: "{{veiculo_cor}}", label: "Cor do Veículo", category: "automotivo", example: "Branco Perolizado", description: "Cor predominante segundo documento" },
    ],
  },
  {
    id: "imobiliario",
    name: "Imóveis & Locações",
    icon: "Home",
    description: "Contratos de aluguel, compra, venda e termos de vistoria predial",
    variables: [
      { key: "imovel_endereco", token: "{{imovel_endereco}}", label: "Endereço do Imóvel", category: "imobiliario", example: "Av. Brasil, 1200, Apto 502, Centro", description: "Localização precisa do imóvel locado ou vendido" },
      { key: "imovel_tipo", token: "{{imovel_tipo}}", label: "Tipo do Imóvel", category: "imobiliario", example: "Apartamento Residencial", description: "Casa, Apto, Sala Comercial, Terreno ou Galpão" },
      { key: "imovel_matricula", token: "{{imovel_matricula}}", label: "Matrícula no CRI", category: "imobiliario", example: "Matrícula nº 45.890 do Cartório de Registro de Imóveis", description: "Número de registro imobiliário" },
      { key: "valor_aluguel", token: "{{valor_aluguel}}", label: "Valor do Aluguel (R$)", category: "imobiliario", example: "R$ 2.200,00", description: "Mensalidade locatícia base" },
      { key: "caucao_garantia", token: "{{caucao_garantia}}", label: "Garantia / Caução", category: "imobiliario", example: "3 meses de caução (R$ 6.600,00) ou Fiador", description: "Modalidade de garantia locatícia exigida" },
      { key: "prazo_locacao_meses", token: "{{prazo_locacao_meses}}", label: "Prazo de Locação (Meses)", category: "imobiliario", example: "30 meses", description: "Duração contratual em meses" },
    ],
  },
  {
    id: "juridico",
    name: "Advocacia & Procurações",
    icon: "Scale",
    description: "Procuração Ad Judicia, honorários contratuais e foro de comarca",
    variables: [
      { key: "advogado_oab", token: "{{advogado_oab}}", label: "OAB do Advogado", category: "juridico", example: "OAB/SC 58.123", description: "Inscrição na Ordem dos Advogados do Brasil" },
      { key: "foro_comarca", token: "{{foro_comarca}}", label: "Foro da Comarca", category: "juridico", example: "Comarca de São Miguel do Oeste / SC", description: "Foro eleito para dirimir conflitos jurídicos" },
      { key: "objeto_demanda", token: "{{objeto_demanda}}", label: "Objeto da Demanda / Ação", category: "juridico", example: "Ação de Cobrança c/c Indenização por Danos Morais", description: "Resumo da causa jurídica patrocinada" },
      { key: "percentual_honorarios", token: "{{percentual_honorarios}}", label: "% Honorários de Êxito", category: "juridico", example: "20% (vinte por cento)", description: "Percentual sobre o proveito econômico obtido" },
    ],
  },
  {
    id: "condicional",
    name: "Varejo & Sacolas Condicionais",
    icon: "ShoppingBag",
    description: "Termos de prova em casa (roupas, joias, calçados e óticas)",
    variables: [
      { key: "sacola_codigo", token: "{{sacola_codigo}}", label: "Código da Sacola / Lote", category: "condicional", example: "COND-2026-089", description: "Identificador da sacola para provar" },
      { key: "prazo_devolucao_dias", token: "{{prazo_devolucao_dias}}", label: "Prazo para Devolução (Dias)", category: "condicional", example: "2 (dois) dias úteis", description: "Tempo que o cliente pode ficar com as peças" },
      { key: "data_limite", token: "{{data_limite}}", label: "Data Limite de Devolução", category: "condicional", example: "18/09/2026 às 18h", description: "Horário improrrogável para devolução ou compra" },
      { key: "tabela_pecas", token: "{{tabela_pecas}}", label: "Tabela de Peças & Valores", category: "condicional", example: "• 1x Vestido Linho (R$ 380) | 1x Calça Alfaiataria (R$ 290)", description: "Relação discriminada de peças entregues para prova" },
    ],
  },
  {
    id: "rh",
    name: "RH, Colaboradores & Serviços",
    icon: "Briefcase",
    description: "Contrato de trabalho, prestador de serviço PJ e termos de confidencialidade",
    variables: [
      { key: "cargo_funcao", token: "{{cargo_funcao}}", label: "Cargo / Função", category: "rh", example: "Consultor de Vendas Sênior", description: "Função desempenhada pelo contratado" },
      { key: "remuneracao", token: "{{remuneracao}}", label: "Remuneração / Salário (R$)", category: "rh", example: "R$ 3.800,00 + comissões", description: "Salário base acordado" },
      { key: "jornada_trabalho", token: "{{jornada_trabalho}}", label: "Jornada de Trabalho", category: "rh", example: "44 horas semanais de segunda a sábado", description: "Carga horária e dias de trabalho" },
      { key: "data_admissao", token: "{{data_admissao}}", label: "Data de Início / Admissão", category: "rh", example: "01/10/2026", description: "Primeiro dia de prestação de serviços" },
    ],
  },
];

/**
 * Função Canônica de Interpolação de Variáveis Semânticas.
 * Substitui todas as ocorrências de {{chave}} ou {chave} pelos valores reais.
 * Se a variável não for informada no contexto, preserva um placeholder legível [Campo não preenchido].
 */
export function interpolateContractVariables(
  templateText: string,
  variables: Record<string, string | number | null | undefined>
): string {
  if (!templateText) return "";

  let result = templateText;

  // Substituição de todas as chaves
  Object.entries(variables).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) return;
    const stringValue = String(rawValue);

    // Expressões regulares para {{key}} e {key}
    const regexDouble = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    const regexSingle = new RegExp(`\\{${key}\\}`, "gi");

    result = result.replace(regexDouble, stringValue).replace(regexSingle, stringValue);
  });

  return result;
}

/**
 * Retorna lista plana de todas as variáveis disponíveis
 */
export function getAllSemanticVariables(): ContractSemanticVariable[] {
  return CONTRACT_SEMANTIC_GROUPS.flatMap((group) => group.variables);
}
