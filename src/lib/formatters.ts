/**
 * Standard Formatters for Tourism and E-commerce.
 * Integrates with BRL currency and pt-BR date standards.
 */

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "BRL"
): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num)) return "R$ 0,00";
  const validCurrency = currency && currency.length === 3 ? currency.toUpperCase() : "BRL";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: validCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

export const formatBRL = formatCurrency;

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return String(date);
  }
}

export function maskCpf(value: string): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function maskPhone(value: string): string {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) {
    return digits.replace(/(\d{2})(\d+)/, "($1) $2");
  }
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
      .replace(/-$/, "")
      .trim();
  }
  return digits
    .replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
    .replace(/-$/, "")
    .trim();
}

export function normalizeGenderValue(
  g?: string
): "feminino" | "masculino" | "outro" | "prefiro_nao_dizer" {
  if (!g || g === "not_informed") return "prefiro_nao_dizer";
  if (g === "female" || g === "feminino") return "feminino";
  if (g === "male" || g === "masculino") return "masculino";
  if (g === "other" || g === "non_binary" || g === "outro") return "outro";
  return "prefiro_nao_dizer";
}
