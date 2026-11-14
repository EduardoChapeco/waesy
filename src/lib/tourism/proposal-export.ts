/**
 * proposal-export.ts — Client-safe utilities to format and export Travel Proposals
 * into CSV spreadsheets, JSON backups, and sanitized filenames for PDF/PNG generation.
 */

import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { formatMoney } from "@/lib/money";

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Sanitizes a proposal title into a clean download filename. */
export function sanitizeProposalFilename(title: string | null | undefined, ext: string): string {
  const base = (title || "proposta")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  const safeExt = ext.replace(/^\./, "");
  return `${base || "proposta"}.${safeExt}`;
}

/** Builds a UTF-8 BOM CSV spreadsheet of proposals optimized for PT-BR Excel/Sheets. */
export function buildProposalsCsv(proposals: TravelProposalDTO[], originUrl = ""): string {
  const headers = [
    "ID",
    "Titulo",
    "Destino",
    "Cliente",
    "WhatsApp",
    "Embarque",
    "Retorno",
    "Adultos",
    "Criancas",
    "Valor Total",
    "Status",
    "Visibilidade",
    "Oculta",
    "Visualizacoes",
    "Validade",
    "Link Publico",
    "Criado em",
  ];

  const rows = proposals.map((p) => {
    const publicLink = originUrl ? `${originUrl}/proposta/${p.public_token}` : `/proposta/${p.public_token}`;
    return [
      p.id,
      p.title,
      p.destination_city || "",
      p.client_name || "",
      p.client_whatsapp || "",
      p.travel_start_date || "",
      p.travel_end_date || "",
      p.adults_count ?? 0,
      p.children_count ?? 0,
      formatMoney(p.pricing?.total_price_cents || 0),
      p.status,
      p.visibility_mode || "public",
      p.is_hidden ? "Sim" : "Nao",
      p.views_count ?? 0,
      p.valid_until || "",
      publicLink,
      p.created_at || "",
    ].map(escapeCsvCell);
  });

  return "\uFEFF" + [headers.map(escapeCsvCell).join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
}

/** Triggers browser download of text-based file content (CSV / JSON). */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
