/**
 * proposal-ui-helpers.ts — Formatting, status metadata, visibility badges,
 * and shared UI helpers for Travel Proposals workspace views.
 */

import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import type { ProposalVisibilityMode } from "@/lib/tourism/proposal-security";
import { formatMoney } from "@/lib/money";

export interface ProposalStatusMeta {
  label: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  badgeClassName: string;
}

export interface ProposalVisibilityMeta {
  label: string;
  shortLabel: string;
  description: string;
  toneClassName: string;
}

const STATUS_META_MAP: Record<string, ProposalStatusMeta> = {
  draft: {
    label: "Rascunho",
    badgeVariant: "secondary",
    badgeClassName: "bg-muted text-muted-foreground border-border/60",
  },
  sent: {
    label: "Publicada",
    badgeVariant: "outline",
    badgeClassName: "bg-primary/10 text-primary border-primary/30",
  },
  approved: {
    label: "Aprovada",
    badgeVariant: "outline",
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  rejected: {
    label: "Recusada",
    badgeVariant: "outline",
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  expired: {
    label: "Arquivada",
    badgeVariant: "outline",
    badgeClassName: "bg-muted text-muted-foreground border-border",
  },
};

const VISIBILITY_META_MAP: Record<ProposalVisibilityMode, ProposalVisibilityMeta> = {
  public: {
    label: "Pública",
    shortLabel: "Pública",
    description: "Acessível por link público para o passageiro",
    toneClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  link_only: {
    label: "Somente Link",
    shortLabel: "Link",
    description: "Acessível apenas para quem possui o link direto",
    toneClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  password: {
    label: "Só com Senha",
    shortLabel: "Senha",
    description: "Exige PIN de desbloqueio antes de exibir os dados",
    toneClassName: "bg-warning/10 text-warning-strong border-warning/30",
  },
  private: {
    label: "Privada",
    shortLabel: "Privada",
    description: "Bloqueada externamente; visível somente para a agência",
    toneClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
};

export function getProposalStatusMeta(proposal: TravelProposalDTO): ProposalStatusMeta {
  if (proposal.is_hidden) {
    return {
      label: "Oculta",
      badgeVariant: "outline",
      badgeClassName: "bg-muted text-muted-foreground border-border",
    };
  }
  return STATUS_META_MAP[proposal.status] || STATUS_META_MAP.draft;
}

export function getProposalVisibilityMeta(proposal: TravelProposalDTO): ProposalVisibilityMeta {
  const mode: ProposalVisibilityMode = proposal.visibility_mode || (proposal.has_access_pin ? "password" : "public");
  return VISIBILITY_META_MAP[mode] || VISIBILITY_META_MAP.public;
}

export function formatProposalShortDate(isoOrDate?: string | null): string | null {
  if (!isoOrDate) return null;
  const parsed = Date.parse(isoOrDate);
  if (!Number.isFinite(parsed)) return isoOrDate;
  return new Date(parsed).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatProposalDateRange(start?: string | null, end?: string | null): string {
  const s = formatProposalShortDate(start);
  const e = formatProposalShortDate(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return `Ida ${s}`;
  if (e) return `Retorno ${e}`;
  return "Datas a combinar";
}

export function formatProposalPaxSummary(adults?: number | null, children?: number | null): string {
  const ad = Math.max(0, Number(adults || 0));
  const ch = Math.max(0, Number(children || 0));
  if (ad === 0 && ch === 0) return "Pax a definir";
  const parts: string[] = [];
  if (ad > 0) parts.push(`${ad} ${ad === 1 ? "adulto" : "adultos"}`);
  if (ch > 0) parts.push(`${ch} ${ch === 1 ? "criança" : "crianças"}`);
  return parts.join(", ");
}

export function formatProposalTotalAndRange(proposal: TravelProposalDTO): {
  primaryPrice: string;
  optionsHint: string | null;
} {
  const baseCents = proposal.pricing?.total_price_cents || proposal.pricing?.total_cents || 0;
  const options = Array.isArray(proposal.options) ? proposal.options : [];
  if (options.length <= 1) {
    return {
      primaryPrice: formatMoney(baseCents),
      optionsHint: options.length === 1 ? "1 opção" : null,
    };
  }

  const values = options
    .map((opt) => Number(opt?.pricing?.total_price_cents ?? opt?.pricing?.total_cents ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (values.length === 0) {
    return {
      primaryPrice: formatMoney(baseCents),
      optionsHint: `${options.length} opções`,
    };
  }
  const minCents = Math.min(...values);
  const maxCents = Math.max(...values);
  return {
    primaryPrice: formatMoney(baseCents > 0 ? baseCents : minCents),
    optionsHint:
      minCents !== maxCents
        ? `${options.length} opções (${formatMoney(minCents)} a ${formatMoney(maxCents)})`
        : `${options.length} opções`,
  };
}

export function getProposalValidityLabel(proposal: TravelProposalDTO): {
  label: string;
  isExpired: boolean;
} {
  if (!proposal.valid_until) {
    return { label: "Sem validade", isExpired: false };
  }
  const ts = Date.parse(proposal.valid_until);
  if (!Number.isFinite(ts)) return { label: "Sem validade", isExpired: false };
  const now = Date.now();
  const formatted = new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (ts <= now) {
    return { label: `Expirou ${formatted}`, isExpired: true };
  }
  return { label: `Válida até ${formatted}`, isExpired: false };
}

export function buildWhatsappProposalShareUrl(proposal: TravelProposalDTO, originUrl: string): string {
  const digits = (proposal.client_whatsapp || "").replace(/\D/g, "");
  const cleanPhone = digits ? (digits.startsWith("55") ? digits : `55${digits}`) : "";
  const publicUrl = `${originUrl}/proposta/${proposal.public_token}`;
  const priceText = formatProposalTotalAndRange(proposal).primaryPrice;
  const text = encodeURIComponent(
    `Olá ${proposal.client_name || ""}! Preparamos a proposta "${proposal.title}" (${proposal.destination_city || "seu roteiro"}) — ${priceText}.\n\nAcesse pelo link:\n${publicUrl}`,
  );
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
}
