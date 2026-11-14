/**
 * @fileoverview COMPILADOR UNIVERSAL MULTI-NICHO DE CONTRATOS TABULARES (Markdown GFM + Variaveis)
 *
 * Responsavel por transformar dados estruturados de:
 * - Propostas de Turismo (travel_proposals)
 * - Orcamentos Multi-Nicho (quotes / quote_items)
 * - Pedidos (orders / order_items)
 * - Negocios de Classificados (deals + attributes + deal_events)
 * - Leads do Kanban CRM (leads_crm + custom_fields + pax_list)
 * - Faturas Comerciais (commercial_invoices)
 * em minutas juridicas padronizadas com tabelas Markdown GFM, campos {{custom.*}}
 * e secoes personalizaveis pelo operador.
 */

import { formatMoney } from "@/lib/money";
import { ADVANCED_CONTRACT_TEMPLATES, type ContractTemplateDefinition } from "@/lib/data/advanced-contract-templates";
import { interpolateContractVariables } from "./contract-semantic-dictionary";
import {
  buildStructuredCustomFieldsSummaryRows,
  getNicheContractBlueprint,
  normalizeCustomFieldMap,
} from "@/lib/niches/unified-field-bridge";

export interface ContractCompilerSectionConfig {
  showItemsTable?: boolean;
  showSpecsTable?: boolean;
  showItineraryTable?: boolean;
  showPassengersTable?: boolean;
  showFinancialTable?: boolean;
  showCustomFieldsTable?: boolean;
  includeLegalClauses?: boolean;
}

export interface CompiledContractItemRow {
  title: string;
  sku?: string;
  unit?: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

export interface CompiledContractPassengerRow {
  name: string;
  document?: string;
  birthDate?: string;
  role?: string;
  boardingPoint?: string;
}

export interface CompiledContractItineraryRow {
  day: number | string;
  title: string;
  description?: string;
  meals?: string;
}

export interface CompiledContractInstallmentRow {
  installmentNumber: number | string;
  dueDate: string;
  amountCents: number;
  method?: string;
  status?: string;
}

export interface CompiledContractInput {
  title: string;
  nicheHint?: unknown;
  templateId?: string | null;
  sectionConfig?: ContractCompilerSectionConfig;
  issuer?: {
    name?: string | null;
    document?: string | null;
    address?: string | null;
    cityState?: string | null;
    phone?: string | null;
    email?: string | null;
    representative?: string | null;
  };
  customer: {
    name: string;
    document?: string | null;
    rg?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    cityState?: string | null;
  };
  items?: CompiledContractItemRow[];
  specs?: Array<{ label: string; value: string }>;
  itinerary?: CompiledContractItineraryRow[];
  passengers?: CompiledContractPassengerRow[];
  installments?: CompiledContractInstallmentRow[];
  customFields?: Record<string, unknown> | null;
  summaryText?: string | null;
  totalValueCents: number;
  discountCents?: number;
  paymentConditions?: string | null;
  paymentMethod?: string | null;
  validUntil?: string | null;
  travelStartDate?: string | null;
  travelEndDate?: string | null;
  destination?: string | null;
  hotelName?: string | null;
  boardingPoint?: string | null;
  customVariables?: Record<string, string | number | null | undefined>;
  extraClauses?: Array<{
    number?: number;
    section?: string;
    title?: string;
    clause_text?: string;
    content?: string;
    is_mandatory?: boolean;
  }>;
}

export interface CompiledContractOutput {
  contentMarkdown: string;
  summaryText: string;
  templateIdUsed: string;
  templateTitle: string;
  nicheId: string;
  clauses: Array<{ number: number; section: string; clause_text: string; is_mandatory: boolean }>;
  variablesApplied: Record<string, string>;
  tables: {
    itemsTable: string;
    specsTable: string;
    itineraryTable: string;
    passengersTable: string;
    installmentsTable: string;
    customFieldsTable: string;
  };
}

function sanitizeTableCell(val: unknown): string {
  if (val === undefined || val === null) return "—";
  const raw = String(val)
    .replace(/\|/g, "/")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw || "—";
}

/**
 * Constroi uma tabela Markdown GFM segura com alinhamento e escape de pipes.
 */
export function buildGfmMarkdownTable(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  alignments?: Array<"left" | "center" | "right">,
): string {
  if (!Array.isArray(headers) || headers.length === 0 || !Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  const sepCells = headers.map((_, idx) => {
    const align = alignments?.[idx] || "left";
    if (align === "center") return ":---:";
    if (align === "right") return "---:";
    return ":---";
  });

  const headerLine = `| ${headers.map((h) => sanitizeTableCell(h)).join(" | ")} |`;
  const sepLine = `| ${sepCells.join(" | ")} |`;
  const bodyLines = rows.map(
    (row) => `| ${headers.map((_, idx) => sanitizeTableCell(row[idx])).join(" | ")} |`,
  );

  return [headerLine, sepLine, ...bodyLines].join("\n");
}

function formatDatePtBr(val?: string | null): string {
  if (!val) return "";
  const trimmed = String(val).trim();
  if (!trimmed) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat("pt-BR").format(parsed);
}

function resolveTemplate(
  templateId: string | null | undefined,
  defaultTemplateId: string,
): ContractTemplateDefinition {
  if (templateId) {
    const explicit = ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === templateId);
    if (explicit) return explicit;
  }
  const byBlueprint = ADVANCED_CONTRACT_TEMPLATES.find((t) => t.id === defaultTemplateId);
  if (byBlueprint) return byBlueprint;
  return ADVANCED_CONTRACT_TEMPLATES[0];
}

export function compileContractDocument(input: CompiledContractInput): CompiledContractOutput {
  const blueprint = getNicheContractBlueprint(input.nicheHint);
  const template = resolveTemplate(input.templateId, blueprint.defaultTemplateId);

  const sectionConfig: Required<ContractCompilerSectionConfig> = {
    showItemsTable: input.sectionConfig?.showItemsTable ?? true,
    showSpecsTable: input.sectionConfig?.showSpecsTable ?? true,
    showItineraryTable: input.sectionConfig?.showItineraryTable ?? true,
    showPassengersTable: input.sectionConfig?.showPassengersTable ?? true,
    showFinancialTable: input.sectionConfig?.showFinancialTable ?? true,
    showCustomFieldsTable: input.sectionConfig?.showCustomFieldsTable ?? true,
    includeLegalClauses: input.sectionConfig?.includeLegalClauses ?? true,
  };

  const normalizedCustom = normalizeCustomFieldMap(input.customFields || {});
  const customSummaryRows = buildStructuredCustomFieldsSummaryRows(normalizedCustom);

  const totalMoneyStr = formatMoney(Number(input.totalValueCents || 0));
  const discountCents = Math.max(0, Number(input.discountCents || 0));
  const dataAtual = new Intl.DateTimeFormat("pt-BR").format(new Date());
  const dataExtenso = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

  // 1. Tabela de Partes
  const partiesTable = buildGfmMarkdownTable(
    ["Parte", "Identificacao", "Documento", "Contato", "Endereco / Cidade"],
    [
      [
        "CONTRATADA",
        input.issuer?.name || "Empresa Contratada",
        input.issuer?.document || "Nao informado",
        [input.issuer?.phone, input.issuer?.email].filter(Boolean).join(" / ") || "Nao informado",
        [input.issuer?.address, input.issuer?.cityState].filter(Boolean).join(" - ") || "Nao informado",
      ],
      [
        "CONTRATANTE",
        input.customer.name || "Cliente",
        input.customer.document || input.customer.rg || "Identificado na assinatura",
        [input.customer.phone, input.customer.email].filter(Boolean).join(" / ") || "Nao informado",
        [input.customer.address, input.customer.cityState].filter(Boolean).join(" - ") || "Nao informado",
      ],
    ],
  );

  // 2. Tabela de Itens / Servicos
  const items = Array.isArray(input.items) ? input.items : [];
  const itemsTable = buildGfmMarkdownTable(
    ["Item / Servico", "Qtd", "Unidade", "Valor Unitario", "Total"],
    items.map((it) => [
      it.sku ? `${it.title} (${it.sku})` : it.title,
      it.quantity || 1,
      it.unit || "un",
      formatMoney(Number(it.unitPriceCents || 0)),
      formatMoney(Number(it.totalPriceCents || (it.unitPriceCents || 0) * (it.quantity || 1))),
    ]),
    ["left", "center", "center", "right", "right"],
  );

  // 3. Tabela de Especificacoes Tecnicas do Nicho
  const specs = Array.isArray(input.specs) ? input.specs.filter((s) => s?.label && s?.value) : [];
  const specsTable = buildGfmMarkdownTable(
    ["Especificacao / Atributo", "Detalhe Contratado"],
    specs.map((s) => [s.label, s.value]),
  );

  // 4. Tabela de Roteiro / Cronograma
  const itinerary = Array.isArray(input.itinerary) ? input.itinerary : [];
  const itineraryTable = buildGfmMarkdownTable(
    ["Dia / Etapa", "Programacao / Entrega", "Detalhes", "Regime / Observacao"],
    itinerary.map((day, idx) => [
      `Dia ${day.day || idx + 1}`,
      day.title || `Etapa ${idx + 1}`,
      day.description || "Conforme programacao oficial",
      day.meals || "—",
    ]),
    ["center", "left", "left", "left"],
  );

  // 5. Tabela de Passageiros / Participantes
  const passengers = Array.isArray(input.passengers) ? input.passengers.filter((p) => p?.name) : [];
  const passengersTable = buildGfmMarkdownTable(
    ["#", "Nome Completo", "Documento (CPF/RG/Passaporte)", "Nascimento", "Embarque / Perfil"],
    passengers.map((p, idx) => [
      idx + 1,
      p.name,
      p.document || "Pendente",
      formatDatePtBr(p.birthDate) || "—",
      [p.role, p.boardingPoint].filter(Boolean).join(" • ") || "Passageiro",
    ]),
    ["center", "left", "left", "center", "left"],
  );

  // 6. Tabela Financeira / Parcelas
  const installments = Array.isArray(input.installments) ? input.installments : [];
  const installmentsTable =
    installments.length > 0
      ? buildGfmMarkdownTable(
          ["Parcela", "Vencimento", "Modalidade", "Valor", "Situacao"],
          installments.map((inst, idx) => [
            inst.installmentNumber || idx + 1,
            formatDatePtBr(inst.dueDate) || inst.dueDate || "A definir",
            inst.method || input.paymentMethod || "Conforme combinado",
            formatMoney(Number(inst.amountCents || 0)),
            inst.status || "Programada",
          ]),
          ["center", "center", "left", "right", "center"],
        )
      : buildGfmMarkdownTable(
          ["Resumo Financeiro", "Valor / Condicao"],
          [
            ["Valor Total do Contrato", totalMoneyStr],
            ...(discountCents > 0 ? [["Desconto Concedido", formatMoney(discountCents)]] : []),
            ["Condicoes de Pagamento", input.paymentConditions || "Conforme acordo comercial"],
            ...(input.paymentMethod ? [["Meio de Pagamento", input.paymentMethod]] : []),
            ...(input.validUntil ? [["Validade / Vigencia", formatDatePtBr(input.validUntil) || input.validUntil]] : []),
          ],
          ["left", "right"],
        );

  // 7. Tabela de Campos Personalizados (Formularios, Quiz, Onboarding)
  const customFieldsTable = buildGfmMarkdownTable(
    ["Campo Informado", "Valor / Resposta"],
    customSummaryRows.map((row) => [row.label, row.value]),
  );

  // Dicionario unificado de variaveis semanticas + {{custom.*}}
  const itemsPlainSummary =
    items.length > 0
      ? items
          .map(
            (it) =>
              `${it.quantity || 1}x ${it.title} (${formatMoney(Number(it.totalPriceCents || it.unitPriceCents || 0))})`,
          )
          .join("; ")
      : input.summaryText || input.title;

  const variablesApplied: Record<string, string> = {
    cliente_nome: input.customer.name || "Cliente",
    contratante_nome: input.customer.name || "Cliente",
    cpf: input.customer.document || "",
    rg: input.customer.rg || "",
    contratante_documento: input.customer.document || input.customer.rg || "",
    cliente_documento: input.customer.document || input.customer.rg || "",
    telefone: input.customer.phone || "",
    email: input.customer.email || "",
    endereco: input.customer.address || "",
    contratante_endereco: input.customer.address || "",
    cidade_uf: input.customer.cityState || input.issuer?.cityState || "",
    foro_cidade: input.issuer?.cityState || input.customer.cityState || "Comarca da Contratada",
    empresa_nome: input.issuer?.name || "Empresa Contratada",
    contratado_nome: input.issuer?.name || "Empresa Contratada",
    agencia_nome: input.issuer?.name || "Agencia",
    empresa_cnpj: input.issuer?.document || "",
    contratado_documento: input.issuer?.document || "",
    agencia_documento: input.issuer?.document || "",
    contratado_endereco: input.issuer?.address || "",
    empresa_representante: input.issuer?.representative || input.issuer?.name || "",
    vendedor_nome: input.issuer?.name || "",
    locador_nome: input.issuer?.name || "",
    locatario_nome: input.customer.name || "",
    comprador_nome: input.customer.name || "",
    data_atual: dataAtual,
    data_extenso: dataExtenso,
    valor_total: totalMoneyStr,
    valor_total_pacote: totalMoneyStr,
    valor_extenso: totalMoneyStr,
    forma_pagamento: input.paymentConditions || input.paymentMethod || "Conforme condicoes contratadas",
    quantidade_parcelas: installments.length > 0 ? `${installments.length}x` : "1x",
    valor_parcela:
      installments.length > 0
        ? formatMoney(Number(installments[0]?.amountCents || 0))
        : totalMoneyStr,
    data_vencimento: installments[0]?.dueDate ? formatDatePtBr(installments[0].dueDate) : dataAtual,
    desconto_aplicado: formatMoney(discountCents),
    descricao_servicos: itemsPlainSummary,
    objeto_contrato: itemsPlainSummary,
    destino_cidade: input.destination || "",
    destino_roteiro:
      [input.destination, input.hotelName].filter(Boolean).join(" — ") || itemsPlainSummary,
    destino_hotel: input.hotelName || "",
    data_embarque: formatDatePtBr(input.travelStartDate) || "",
    data_retorno: formatDatePtBr(input.travelEndDate) || "",
    local_embarque: input.boardingPoint || "",
    lista_passageiros: passengers
      .map((p, i) => `${i + 1}. ${p.name}${p.document ? ` (${p.document})` : ""}`)
      .join("\n"),
    tabela_itens: itemsTable,
    tabela_parcelas: installmentsTable,
    tabela_especificacoes: specsTable,
    tabela_passageiros: passengersTable,
    tabela_roteiro: itineraryTable,
    campos_personalizados_tabela: customFieldsTable,
  };

  // Mapeia todas as chaves dinamicas para {{chave}} e {{custom.chave}} + aliases comuns de nicho
  for (const [k, rawVal] of Object.entries(normalizedCustom)) {
    if (rawVal === undefined || rawVal === null || typeof rawVal === "object") continue;
    const strVal = String(rawVal).trim();
    if (!strVal) continue;
    variablesApplied[`custom.${k}`] = strVal;
    if (!(k in variablesApplied)) {
      variablesApplied[k] = strVal;
    }
  }
  const aliasPairs: Array<[string, string[]]> = [
    ["veiculo_placa", ["placa", "plate"]],
    ["veiculo_chassi", ["chassi", "vin"]],
    ["veiculo_marca", ["marca", "brand", "montadora"]],
    ["veiculo_modelo", ["modelo", "model", "marca_modelo"]],
    ["veiculo_ano", ["ano", "year", "ano_modelo", "ano_fabricacao"]],
    ["veiculo_cor", ["cor", "color"]],
    ["veiculo_renavam", ["renavam"]],
    ["veiculo_tipo", ["tipo_veiculo", "tipo", "categoria"]],
    ["quilometragem_atual", ["quilometragem", "km", "veiculo_km", "odometro"]],
    ["imovel_endereco", ["endereco_imovel", "imovel", "endereco"]],
    ["imovel_matricula", ["matricula", "matricula_cri"]],
    ["aluguel_mensal", ["aluguel_valor", "valor_aluguel", "mensalidade"]],
    ["aluguel_valor", ["valor_aluguel", "mensalidade", "aluguel_mensal"]],
    ["prazo_meses", ["prazo_locacao_meses", "prazo", "duracao_meses"]],
  ];
  for (const [targetKey, candidateKeys] of aliasPairs) {
    if (!variablesApplied[targetKey]) {
      for (const ck of candidateKeys) {
        if (variablesApplied[ck]) {
          variablesApplied[targetKey] = variablesApplied[ck];
          break;
        }
      }
    }
  }

  // Compostos semanticos para 100% de compatibilidade com os templates juridicos (ADVANCED_CONTRACT_TEMPLATES)
  const specSummaryStr = specs.map((s) => `${s.label}: ${s.value}`).join("; ");
  const vehicleBrandModel = [variablesApplied.veiculo_marca, variablesApplied.veiculo_modelo]
    .filter(Boolean)
    .join(" ")
    .trim();
  const compositeDefaults: Array<[string, string]> = [
    ["veiculo_marca_modelo", vehicleBrandModel || itemsPlainSummary],
    [
      "veiculo_dados",
      [
        vehicleBrandModel || items[0]?.title,
        variablesApplied.veiculo_ano ? `Ano ${variablesApplied.veiculo_ano}` : "",
        variablesApplied.veiculo_cor,
        variablesApplied.veiculo_placa ? `Placa ${variablesApplied.veiculo_placa}` : "",
        variablesApplied.veiculo_chassi ? `Chassi ${variablesApplied.veiculo_chassi}` : "",
        variablesApplied.veiculo_renavam ? `RENAVAM ${variablesApplied.veiculo_renavam}` : "",
      ]
        .filter(Boolean)
        .join(" · ") || itemsPlainSummary,
    ],
    [
      "veiculo_modelo_placa",
      [vehicleBrandModel || items[0]?.title || input.title, variablesApplied.veiculo_placa ? `Placa ${variablesApplied.veiculo_placa}` : ""]
        .filter(Boolean)
        .join(" — "),
    ],
    ["veiculo_tipo", items[0]?.title || "Veículo Automotor"],
    ["quilometragem_atual", "Conforme vistoria e hodômetro na entrega"],
    ["preco_veiculo", totalMoneyStr],
    ["imovel_endereco", input.destination || input.customer.address || "Endereço cadastrado no anúncio"],
    ["imovel_descricao", specSummaryStr || itemsPlainSummary],
    ["aluguel_mensal", totalMoneyStr],
    ["modalidade_garantia", variablesApplied.caucao_garantia || "Conforme modalidade ajustada entre as partes"],
    ["prazo_meses", "12"],
    ["prazo_vigencia", variablesApplied.prazo_meses ? `${variablesApplied.prazo_meses} meses` : "Conforme vigência estipulada"],
    ["prazo_execucao", formatDatePtBr(input.travelEndDate) || "Conforme cronograma combinado"],
    ["produtos_descricao", itemsPlainSummary],
    ["servicos_especializados", itemsPlainSummary],
    ["area_assessoria", variablesApplied.procedimento || specSummaryStr || input.title],
    ["honorarios_mensais", totalMoneyStr],
    ["remuneracao_mensal", totalMoneyStr],
    ["valor_projeto", totalMoneyStr],
    ["cache_total", totalMoneyStr],
    ["valor_fretamento", totalMoneyStr],
    ["valor_venda_pretendido", totalMoneyStr],
    ["valor_equivalencia", totalMoneyStr],
    ["comissao_percentual", "Conforme tabela vigente acordada"],
    ["corretor_creci", "CRECI informado pelo intermediador"],
    ["prazo_exclusividade", "90"],
    ["prazo_exclusividade_dias", "90"],
    ["antt_registro", "ANTT ativa conforme cadastro do transportador"],
    [
      "itinerario_detalhes",
      itinerary.length > 0
        ? itinerary.map((d) => `Dia ${d.day}: ${d.title}`).join(" | ")
        : input.destination || itemsPlainSummary,
    ],
    ["locatario_cnh", input.customer.document || "Apresentada no ato da retirada"],
    ["franquia_seguro", "Conforme apólice da locadora"],
    ["entregaveis", itemsPlainSummary],
    ["sla_uptime", "99,5%"],
    ["projeto_nome", input.title],
    ["creator_redes", input.customer.email || input.customer.name],
    ["modalidade_frete", "CIF / A combinar entre as partes"],
    ["objeto_primeiro", items[0]?.title || itemsPlainSummary],
    ["objeto_segundo", items[1]?.title || "Contrapartida acordada"],
    ["success_fee", "Conforme acordo entre as partes"],
  ];
  for (const [k, fallbackVal] of compositeDefaults) {
    if (!variablesApplied[k] && fallbackVal) {
      variablesApplied[k] = fallbackVal;
    }
  }

  if (input.customVariables) {
    for (const [k, v] of Object.entries(input.customVariables)) {
      if (v !== undefined && v !== null) {
        variablesApplied[k] = String(v);
      }
    }
  }

  const sections: string[] = [];
  sections.push(`# ${input.title}`);
  sections.push(`## 1. IDENTIFICACAO DAS PARTES\n\n${partiesTable}`);

  if (sectionConfig.showItemsTable && itemsTable) {
    sections.push(`## 2. OBJETO & ITENS CONTRATADOS\n\n${itemsTable}`);
  } else if (input.summaryText) {
    sections.push(`## 2. OBJETO DO CONTRATO\n\n${input.summaryText}`);
  }

  if (sectionConfig.showSpecsTable && specsTable) {
    sections.push(`## 3. ${blueprint.specsSectionTitle.toUpperCase()}\n\n${specsTable}`);
  }

  if (sectionConfig.showItineraryTable && itineraryTable) {
    sections.push(`## 4. PROGRAMACAO & ROTEIRO DETALHADO\n\n${itineraryTable}`);
  }

  if (sectionConfig.showPassengersTable && passengersTable) {
    sections.push(`## 5. RELACAO DE PASSAGEIROS & PARTICIPANTES\n\n${passengersTable}`);
  }

  if (sectionConfig.showFinancialTable && installmentsTable) {
    sections.push(
      `## 6. CONDICOES FINANCEIRAS & PAGAMENTO\n\n${installmentsTable}\n\n**Valor Total:** ${totalMoneyStr} | **Condicao:** ${input.paymentConditions || "Conforme acordado"}`,
    );
  }

  if (sectionConfig.showCustomFieldsTable && customFieldsTable) {
    sections.push(
      `## 7. DADOS COMPLEMENTARES & CAMPOS PERSONALIZADOS\n\n${customFieldsTable}`,
    );
  }

  const resolvedClauses: Array<{
    number: number;
    section: string;
    clause_text: string;
    is_mandatory: boolean;
  }> = [];

  if (sectionConfig.includeLegalClauses) {
    const sourceClauses =
      Array.isArray(input.extraClauses) && input.extraClauses.length > 0
        ? input.extraClauses
        : [...template.clauses].sort((a, b) => a.order - b.order);

    const clausesMdParts: string[] = [];
    sourceClauses.forEach((c: any, idx: number) => {
      const num = Number(c.number || c.order || idx + 1);
      const rawTitle = String(c.section || c.title || `CLAUSULA ${num}`);
      const interpolatedBody = interpolateContractVariables(
        String(c.clause_text || c.content || ""),
        variablesApplied,
      );
      resolvedClauses.push({
        number: num,
        section: rawTitle,
        clause_text: interpolatedBody,
        is_mandatory: c.is_mandatory ?? true,
      });
      clausesMdParts.push(`### ${rawTitle}\n\n${interpolatedBody}`);
    });

    if (clausesMdParts.length > 0) {
      sections.push(`## CLAUSULAS E DISPOSICOES GERAIS\n\n${clausesMdParts.join("\n\n")}`);
    }
  }

  sections.push(
    `---\n\nEmitido em ${dataExtenso}. Instrumento valido como titulo executivo extrajudicial (Art. 784, III do CPC) e assinatura eletronica conforme MP 2.200-2/2001 e Lei Federal 14.063/2020.`,
  );

  const rawCompiled = sections.join("\n\n");
  const contentMarkdown = interpolateContractVariables(rawCompiled, variablesApplied);

  // Resumo executivo tabular compacto para campos package_summary e pre-visualizacoes
  const summaryParts = [
    itemsTable || input.summaryText || "",
    specsTable,
    passengersTable,
  ].filter(Boolean);
  const summaryText = summaryParts.join("\n\n") || `Contrato: ${input.title} (${totalMoneyStr})`;

  return {
    contentMarkdown,
    summaryText,
    templateIdUsed: template.id,
    templateTitle: template.title,
    nicheId: blueprint.nicheId,
    clauses: resolvedClauses,
    variablesApplied,
    tables: {
      itemsTable,
      specsTable,
      itineraryTable,
      passengersTable,
      installmentsTable,
      customFieldsTable,
    },
  };
}
