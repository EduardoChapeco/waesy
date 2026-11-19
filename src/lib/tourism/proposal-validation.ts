export interface ExportableProposalShape {
  title?: string | null;
  destination?: string | null;
  destination_city?: string | null;
  status?: string | null;
  total?: number | null;
  total_price_cents?: number | null;
  pricing?: { total_price_cents?: number | null } | null;
  flights?: unknown[] | null;
  hotels?: unknown[] | null;
  transfers?: unknown[] | null;
  tours?: unknown[] | null;
  itinerary?: unknown[] | null;
  includes?: unknown[] | null;
  options?: unknown[] | null;
  sections?: unknown[] | null;
  web_page?: { blocks?: unknown[] | null } | null;
  summary?: string | null;
}

export interface ProposalExportValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Valida antes de renderizar/capturar PDF se a proposta tem identidade mínima e conteúdo comercial.
 */
export function validateProposalForExport(
  proposal: ExportableProposalShape | null | undefined
): ProposalExportValidationResult {
  if (!proposal) {
    return { ok: false, errors: ["Proposta não carregada para exportação."] };
  }

  const errors: string[] = [];
  const hasIdentity = Boolean(
    proposal.title?.trim() ||
      proposal.destination?.trim() ||
      proposal.destination_city?.trim()
  );
  if (!hasIdentity) {
    errors.push("A proposta precisa ter um título ou destino definido.");
  }

  const hasContent =
    (Array.isArray(proposal.flights) && proposal.flights.length > 0) ||
    (Array.isArray(proposal.hotels) && proposal.hotels.length > 0) ||
    (Array.isArray(proposal.transfers) && proposal.transfers.length > 0) ||
    (Array.isArray(proposal.tours) && proposal.tours.length > 0) ||
    (Array.isArray(proposal.itinerary) && proposal.itinerary.length > 0) ||
    (Array.isArray(proposal.includes) && proposal.includes.length > 0) ||
    (Array.isArray(proposal.options) && proposal.options.length > 0) ||
    (Array.isArray(proposal.sections) && proposal.sections.length > 0) ||
    (Array.isArray(proposal.web_page?.blocks) &&
      proposal.web_page.blocks.length > 0) ||
    Boolean(proposal.summary?.trim());

  if (!hasContent) {
    errors.push(
      "Adicione ao menos um item ou roteiro antes de exportar a proposta."
    );
  }

  const totalCents =
    proposal.pricing?.total_price_cents ??
    proposal.total_price_cents ??
    (typeof proposal.total === "number" ? Math.round(proposal.total * 100) : 0);

  if (proposal.status && proposal.status !== "draft" && totalCents <= 0) {
    errors.push("Propostas publicadas precisam de valor total definido.");
  }

  return { ok: errors.length === 0, errors };
}
