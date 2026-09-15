/**
 * pncp-extractor.ts — Extrator Oficial de Editais e Compras Públicas (PNCP / Portal Municipal)
 * 
 * Portado e aprimorado do motor persona-nexus/radar-pncp.
 * Acessa a API pública do Portal Nacional de Contratações Públicas (PNCP) para minerar
 * licitações, pregões, dispensas e obras da Prefeitura de Chapecó e de Santa Catarina.
 */

import type { MechanicalExtractionResult } from "./mechanical-extractor";

export interface PncpSearchOptions {
  query?: string;
  uf?: string;
  municipio?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export interface PncpItemDTO {
  id: string;
  numeroEdital: string;
  numeroProcesso: string;
  orgaoNome: string;
  orgaoCnpj: string;
  objeto: string;
  modalidade: string;
  valorEstimado?: number;
  dataPublicacao?: string;
  dataEncerramento?: string;
  urlEdital?: string;
  urlPortal: string;
}

export async function fetchPncpContracts(options: PncpSearchOptions = {}): Promise<PncpItemDTO[]> {
  const query = options.query || "Chapecó";
  const uf = options.uf || "SC";
  const limit = options.limit || 15;

  const params = new URLSearchParams({
    q: query,
    pagina: "1",
    tamanhoPagina: String(Math.min(limit, 30)),
  });

  if (uf) params.set("uf", uf);
  if (options.dataInicio) params.set("dataInicial", options.dataInicio.replace(/-/g, ""));
  if (options.dataFim) params.set("dataFinal", options.dataFim.replace(/-/g, ""));

  const pncpUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params.toString()}`;

  try {
    const res = await fetch(pncpUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WaesyIntelligence/1.0 (+https://waesy.com.br)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : [];

    return items.map((item: any) => ({
      id: item.numeroControlePNCP || item.id || crypto.randomUUID(),
      numeroEdital: item.numeroEdital || "N/A",
      numeroProcesso: item.numeroProcesso || "N/A",
      orgaoNome: item.orgaoEntidade?.razaoSocial || item.nomeOrgao || "Órgão Público Municipal",
      orgaoCnpj: item.orgaoEntidade?.cnpj || "",
      objeto: item.objetoCompra || item.objeto || query,
      modalidade: item.modalidadeNome || "Licitação Pública",
      valorEstimado: item.valorTotalEstimado ? parseFloat(item.valorTotalEstimado) : undefined,
      dataPublicacao: item.dataPublicacaoPncp || item.dataAberturaProposta,
      dataEncerramento: item.dataEncerramentoProposta,
      urlEdital: item.linkSistemaOrigem || null,
      urlPortal: `https://pncp.gov.br/app/editais/${item.numeroControlePNCP || ""}`,
    }));
  } catch (err) {
    console.warn("[pncp-extractor] Falha ao consultar PNCP:", err);
    return [];
  }
}

/**
 * Converte um edital do PNCP para o formato MechanicalExtractionResult unificado
 */
export function convertPncpToExtractionResult(item: PncpItemDTO, city = "Chapecó", state = "SC"): MechanicalExtractionResult {
  const valorFormatado = item.valorEstimado
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valorEstimado)
    : "Não informado";

  const dataAberturaStr = item.dataPublicacao ? new Date(item.dataPublicacao).toLocaleDateString("pt-BR") : "A definir";
  const dataEncerramentoStr = item.dataEncerramento ? new Date(item.dataEncerramento).toLocaleDateString("pt-BR") : "A definir";

  const title = `Edital ${item.numeroEdital}: ${item.objeto.slice(0, 100)}`;
  const lead = `Publicação oficial de ${item.modalidade.toLowerCase()} pelo órgão ${item.orgaoNome}. Valor estimado: ${valorFormatado}.`;

  const bodyMarkdown = [
    `## Resumo do Processo Licitatório`,
    `- **Órgão Responsável:** ${item.orgaoNome}`,
    `- **CNPJ:** ${item.orgaoCnpj || "Consulte edital"}`,
    `- **Modalidade:** ${item.modalidade}`,
    `- **Processo Administrativo:** ${item.numeroProcesso}`,
    `- **Valor Total Estimado:** ${valorFormatado}`,
    `- **Data de Publicação:** ${dataAberturaStr}`,
    `- **Encerramento / Abertura de Propostas:** ${dataEncerramentoStr}`,
    ``,
    `### Objeto da Contratação`,
    item.objeto,
    ``,
    `### Acesso ao Edital Completo`,
    `A documentação técnica oficial, termo de referência e anexos podem ser consultados diretamente no [Portal Nacional de Contratações Públicas](${item.urlPortal}).`,
  ].join("\n");

  const bodyText = bodyMarkdown.replace(/[*#\[\]]/g, "");
  const words = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    title,
    lead,
    bodyMarkdown,
    bodyText,
    author: item.orgaoNome,
    publishedAt: item.dataPublicacao || new Date().toISOString(),
    galleryImages: [],
    wordCount: words,
    paragraphCount: 4,
    method: "json_ld",
    contentType: "portal_municipal",
    municipalData: {
      editalNumber: item.numeroEdital,
      organName: item.orgaoNome,
      modality: item.modalidade,
      estimatedValue: item.valorEstimado,
      closingDate: item.dataEncerramento,
    },
  };
}
