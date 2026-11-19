/**
 * Money helpers Commerce.
 * RULE (AGENTS.md): money is always integer cents + currency BRL, never float.
 * This module only FORMATS server-provided values. It performs no commercial
 * calculation (price/discount/shipping/tax) — that happens server-side only.
 */

export type CurrencyCode = "BRL";

export interface Money {
 /** Integer amount in the currency's minor unit (centavos for BRL). */
 amountCents: number;
 currency: CurrencyCode;
}

const FORMATTERS: Record<CurrencyCode, Intl.NumberFormat> = {
 BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
};

/** Format integer cents as a localized currency string (e.g. "R$ 199,90"). */
export function formatMoney(amountCents: number | null | undefined, currency: CurrencyCode = "BRL"): string {
 const cents = typeof amountCents === "number" && !isNaN(amountCents) ? Math.round(amountCents) : 0;
 return FORMATTERS[currency].format(cents / 100);
}

export function formatMoneyObject(money: Money): string {
 return formatMoney(money.amountCents, money.currency);
}

export function parseMoney(formatted: string, currency: CurrencyCode = "BRL"): number {
 const numericString = formatted.replace(/[^0-9-]/g, "");
 return numericString ? parseInt(numericString, 10) : 0;
}

/** Formata centavos em string decimal pt-BR (ex: 80000 -> "800,00", 1250 -> "12,50"). */
export function formatCentsToBRL(cents: number | null | undefined): string {
 if (cents === null || cents === undefined || isNaN(cents)) return "";
 return (cents / 100).toLocaleString("pt-BR", {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 });
}

/** Converte qualquer string digitada ou formatada para centavos inteiros (ex: "800,00" -> 80000, "8,00" -> 800). */
export function parseBRLToCents(val: string | null | undefined): number {
 if (!val) return 0;
 const digits = val.replace(/\D/g, "");
 return digits ? parseInt(digits, 10) : 0;
}

/**
 * Converte entrada humana de salário mensal em R$ (ex: "3500", "3.500", "3500,50", "R$ 3.500,00")
 * para centavos inteiros sem nunca sofrer truncamento/divisão por 100 em reedições.
 */
export function parseSalaryInputToCents(val: string | number | null | undefined): number | undefined {
 if (val === null || val === undefined) return undefined;
 if (typeof val === "number") {
  return Number.isFinite(val) && val > 0 ? Math.round(val) : undefined;
 }
 const raw = String(val).replace(/R\$/gi, "").trim();
 if (!raw) return undefined;
 let normalized = raw.replace(/\s+/g, "");
 if (normalized.includes(",")) {
  normalized = normalized.replace(/\./g, "").replace(",", ".");
 } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
  normalized = normalized.replace(/\./g, "");
 }
 const parsed = Number(normalized);
 if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
 return Math.round(parsed * 100);
}

/** Aplica máscara progressiva de centavos enquanto o usuário digita (ex: "800" -> "8,00", "80000" -> "800,00"). */
export function maskCurrencyBRL(val: string | number | null | undefined): string {
 if (val === null || val === undefined || val === "") return "";
 const digits = typeof val === "number" ? Math.round(val).toString() : val.replace(/\D/g, "");
 if (!digits) return "";
 const cents = parseInt(digits, 10);
 if (isNaN(cents) || cents === 0) return "0,00";
 return formatCentsToBRL(cents);
}

export function parseReaisToCents(raw: string, emptyAsZero = false): number | null {
 const trimmed = (raw || "").trim();
 const cleaned = trimmed.replace(/[^\d.,]/g, "");
 if (!cleaned) return emptyAsZero ? 0 : null;
 let normalized = cleaned;
 if (cleaned.includes(",")) {
 normalized = cleaned.replace(/\./g, "").replace(",", ".");
 } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
 normalized = cleaned.replace(/\./g, "");
 }
 const num = Number.parseFloat(normalized);
 if (!Number.isFinite(num) || num < 0) return null;
 return Math.round(num * 100);
}
