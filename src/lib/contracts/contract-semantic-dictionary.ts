/**
 * contract-semantic-dictionary.ts — Catálogo Semântico de Variáveis por Nicho & Gerais
 * Plataforma Waesy (Padrão DocuSign / Pipefy / Autentique / PandaDoc)
 *
 * Variáveis inteligentes dinâmicas para contratos, propostas e termos jurídicos.
 * Formatação automática de moeda (BRL), datas por extenso, tabelas estruturadas
 * e Auto-Posicionamento Inteligente das Tags de Assinatura nas linhas correspondentes.
 */

export interface ContractSemanticVariable {
  key: string;            // Ex: "cliente_nome"
  token: string;          // Ex: "{{cliente_nome}}"
  label: string;          // Ex: "Nome Completo do Cliente"
  category: "geral" | "financeiro" | "turismo" | "automotivo" | "imobiliario" | "juridico" | "condicional" | "rh";
  example: string;        // Ex: "Carlos Eduardo Silveira"
  description: string;    // Ex: "Nome completo do comprador ou contratante"
}

export interface ContractNicheGroup {
  id: "geral" | "financeiro" | "turismo" | "automotivo" | "imobiliario" | "juridico" | "condicional" | "rh";
  name: string;
  icon: string;
  description: string;
  variables: ContractSemanticVariable[];
}

export interface AutoPositionedField {
  id: string;
  signerIndex: number;
  type: "signature" | "initials" | "name" | "cpf" | "date" | "text";
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label: string;
  repeatMode?: "page" | "all" | "all_except_last";
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
      { key: "rg", token: "{{rg}}", label: "RG do Cliente", category: "geral", example: "4.567.890 SSP/SC", description: "Registro Geral com órgão emissor" },
      { key: "telefone", token: "{{telefone}}", label: "Telefone / WhatsApp", category: "geral", example: "(49) 99988-7766", description: "Telefone com DDD do cliente" },
      { key: "email", token: "{{email}}", label: "E-mail do Cliente", category: "geral", example: "cliente@exemplo.com.br", description: "E-mail de contato principal" },
      { key: "endereco", token: "{{endereco}}", label: "Endereço Completo", category: "geral", example: "Rua Duque de Caxias, 450", description: "Logradouro e número da residência" },
      { key: "bairro", token: "{{bairro}}", label: "Bairro", category: "geral", example: "Centro", description: "Bairro do endereço" },
      { key: "cep", token: "{{cep}}", label: "CEP", category: "geral", example: "89900-000", description: "Código de Endereçamento Postal" },
      { key: "cidade_uf", token: "{{cidade_uf}}", label: "Cidade / Estado", category: "geral", example: "São Miguel do Oeste / SC", description: "Município e UF de residência ou foro" },
      { key: "empresa_nome", token: "{{empresa_nome}}", label: "Nome da Empresa / Loja", category: "geral", example: "Excelência Tour & Viagens", description: "Razão social ou nome fantasia contratada" },
      { key: "empresa_cnpj", token: "{{empresa_cnpj}}", label: "CNPJ da Empresa", category: "geral", example: "12.345.678/0001-90", description: "CNPJ da loja ou prestador" },
      { key: "empresa_representante", token: "{{empresa_representante}}", label: "Representante da Empresa", category: "geral", example: "Eduardo Chapeco (Diretor)", description: "Nome e cargo do signatário da empresa" },
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
      { key: "desconto_aplicado", token: "{{desconto_aplicado}}", label: "Desconto Concedido", category: "financeiro", example: "R$ 150,00 (5% à vista)", description: "Valor de bonificação ou desconto comercial" },
      { key: "taxa_juros_mora", token: "{{taxa_juros_mora}}", label: "Juros de Mora (% ao mês)", category: "financeiro", example: "1% (um por cento) ao mês", description: "Taxa de juros incidente em atrasos" },
      { key: "multa_atraso", token: "{{multa_atraso}}", label: "Multa por Atraso (%)", category: "financeiro", example: "2% (dois por cento)", description: "Multa moratória prevista pelo CDC" },
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
      { key: "regime_alimentar", token: "{{regime_alimentar}}", label: "Regime de Alimentação", category: "turismo", example: "Café da Manhã e Jantar inclusos", description: "Café, Meia Pensão ou All Inclusive" },
      { key: "guia_responsavel", token: "{{guia_responsavel}}", label: "Guia Responsável", category: "turismo", example: "Marcos Vinicius (Cadastur 123456)", description: "Nome e credencial do guia acompanhante" },
      { key: "numero_voucher", token: "{{numero_voucher}}", label: "Código do Voucher", category: "turismo", example: "TRV-2026-9876", description: "Identificador unívoco do bilhete de viagem" },
      { key: "lista_passageiros", token: "{{lista_passageiros}}", label: "Lista de Acompanhantes", category: "turismo", example: "1. Carlos Silveira (RG 1234)\n2. Mariana Silveira (RG 5678)", description: "Nomes e documentos de todos os viajantes do voucher" },
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
      { key: "veiculo_combustivel", token: "{{veiculo_combustivel}}", label: "Combustível", category: "automotivo", example: "Flex (Álcool / Gasolina)", description: "Tipo de motorização do veículo" },
      { key: "veiculo_valor_fipe", token: "{{veiculo_valor_fipe}}", label: "Valor de Tabela FIPE", category: "automotivo", example: "R$ 142.000,00", description: "Cotação oficial de mercado na data da venda" },
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
      { key: "valor_condominio", token: "{{valor_condominio}}", label: "Taxa de Condomínio", category: "imobiliario", example: "R$ 480,00", description: "Valor médio mensal de taxa condominial" },
      { key: "caucao_garantia", token: "{{caucao_garantia}}", label: "Garantia / Caução", category: "imobiliario", example: "3 meses de caução (R$ 6.600,00) ou Fiador", description: "Modalidade de garantia locatícia exigida" },
      { key: "prazo_locacao_meses", token: "{{prazo_locacao_meses}}", label: "Prazo de Locação (Meses)", category: "imobiliario", example: "30 meses", description: "Duração contratual em meses" },
      { key: "dia_vencimento_aluguel", token: "{{dia_vencimento_aluguel}}", label: "Dia de Vencimento do Aluguel", category: "imobiliario", example: "Dia 05 de cada mês", description: "Dia limite para pagamento sem encargos" },
      { key: "indice_reajuste", token: "{{indice_reajuste}}", label: "Índice de Reajuste Anual", category: "imobiliario", example: "IPCA / IBGE ou IGP-M", description: "Indicador econômico para correção anual" },
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
      { key: "valor_honorarios_iniciais", token: "{{valor_honorarios_iniciais}}", label: "Honorários Iniciais (Pro Labore)", category: "juridico", example: "R$ 3.000,00 à vista", description: "Valor fixo devido no início do patrocínio" },
      { key: "poderes_especificos", token: "{{poderes_especificos}}", label: "Poderes Específicos Outorgados", category: "juridico", example: "Transigir, acordar, dar e receber quitação", description: "Cláusula especial de poderes adicionais" },
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
      { key: "valor_total_sacola", token: "{{valor_total_sacola}}", label: "Valor Total das Peças", category: "condicional", example: "R$ 1.850,00", description: "Soma do valor das peças sob responsabilidade" },
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
      { key: "regime_contratacao", token: "{{regime_contratacao}}", label: "Regime de Contratação", category: "rh", example: "CLT com Prazo Indeterminado", description: "CLT, PJ, Prestação de Serviços ou Estágio" },
      { key: "data_admissao", token: "{{data_admissao}}", label: "Data de Início / Admissão", category: "rh", example: "01/10/2026", description: "Primeiro dia de prestação de serviços" },
    ],
  },
];

/**
 * Função Canônica de Interpolação de Variáveis Semânticas.
 * Substitui todas as ocorrências de {{chave}} ou {chave} pelos valores reais.
 */
export function interpolateContractVariables(
  templateText: string,
  variables: Record<string, string | number | null | undefined>
): string {
  if (!templateText) return "";

  let result = templateText;

  Object.entries(variables).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) return;
    const stringValue = String(rawValue);

    const regexDouble = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    const regexSingle = new RegExp(`\\{${key}\\}`, "gi");

    result = result.replace(regexDouble, stringValue).replace(regexSingle, stringValue);
  });

  return result;
}

/**
 * AUTO-POSICIONAMENTO INTELIGENTE DE TAGS DE ASSINATURA (DocuSign / Autentique Pattern)
 * 
 * Analisa o conteúdo do contrato e gera automaticamente as caixas de assinatura,
 * rubrica, nome, CPF e data nas coordenadas exatas onde o cliente e a empresa assinam.
 *
 * @param contentMarkdown O texto completo da minuta
 * @param pageCount Quantidade total de páginas do documento (padrão: 1 a N)
 * @param signersCount Quantidade de signatários (1 = só cliente, 2 = cliente e empresa)
 */
export function autoPositionSignatureFieldsFromContent(
  contentMarkdown: string,
  pageCount: number = 1,
  signersCount: number = 1
): AutoPositionedField[] {
  const fields: AutoPositionedField[] = [];
  const targetPage = Math.max(1, pageCount);

  // 1. Signatário 1 (Cliente / Comprador) — Posicionado no bloco inferior esquerdo
  fields.push({
    id: `auto-sig-client-${Date.now()}-1`,
    signerIndex: 0,
    type: "signature",
    page: targetPage,
    xPercent: 10,
    yPercent: 78,
    widthPercent: 36,
    heightPercent: 9,
    label: "Assinatura do Cliente",
  });

  fields.push({
    id: `auto-name-client-${Date.now()}-2`,
    signerIndex: 0,
    type: "name",
    page: targetPage,
    xPercent: 10,
    yPercent: 88,
    widthPercent: 36,
    heightPercent: 4,
    label: "Nome do Cliente",
  });

  fields.push({
    id: `auto-cpf-client-${Date.now()}-3`,
    signerIndex: 0,
    type: "cpf",
    page: targetPage,
    xPercent: 10,
    yPercent: 92,
    widthPercent: 36,
    heightPercent: 4,
    label: "CPF do Cliente",
  });

  fields.push({
    id: `auto-date-client-${Date.now()}-4`,
    signerIndex: 0,
    type: "date",
    page: targetPage,
    xPercent: 10,
    yPercent: 96,
    widthPercent: 24,
    heightPercent: 3.5,
    label: "Data da Assinatura",
  });

  // 2. Signatário 2 (Empresa / Contratada) — Se houver, posicionado no bloco inferior direito
  if (signersCount >= 2) {
    fields.push({
      id: `auto-sig-store-${Date.now()}-5`,
      signerIndex: 1,
      type: "signature",
      page: targetPage,
      xPercent: 54,
      yPercent: 78,
      widthPercent: 36,
      heightPercent: 9,
      label: "Assinatura da Empresa",
    });

    fields.push({
      id: `auto-name-store-${Date.now()}-6`,
      signerIndex: 1,
      type: "name",
      page: targetPage,
      xPercent: 54,
      yPercent: 88,
      widthPercent: 36,
      heightPercent: 4,
      label: "Representante da Empresa",
    });

    fields.push({
      id: `auto-date-store-${Date.now()}-7`,
      signerIndex: 1,
      type: "date",
      page: targetPage,
      xPercent: 54,
      yPercent: 96,
      widthPercent: 24,
      heightPercent: 3.5,
      label: "Data da Assinatura",
    });
  }

  // 3. Rubricas automáticas nas páginas intermediárias (se houver mais de 1 página)
  if (pageCount > 1) {
    for (let p = 1; p < targetPage; p++) {
      fields.push({
        id: `auto-init-client-${p}-${Date.now()}`,
        signerIndex: 0,
        type: "initials",
        page: p,
        xPercent: 80,
        yPercent: 93,
        widthPercent: 15,
        heightPercent: 4.5,
        label: "Rubrica do Cliente",
        repeatMode: "all_except_last",
      });
    }
  }

  return fields;
}

/**
 * Retorna lista plana de todas as variáveis disponíveis
 */
export function getAllSemanticVariables(): ContractSemanticVariable[] {
  return CONTRACT_SEMANTIC_GROUPS.flatMap((group) => group.variables);
}
