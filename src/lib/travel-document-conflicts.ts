export type TravelDocumentKind =
  | "operator_quote"
  | "reservation_confirmation"
  | "payment_receipt"
  | "contract"
  | "voucher"
  | "operator_contact"
  | "other";

export type ConflictDomain = "identity" | "operational" | "financial" | "legal" | "commercial" | "other";
export type ConflictSeverity = "low" | "medium" | "high" | "critical";

export interface ConflictSource {
  id: string;
  kind: TravelDocumentKind;
  createdAt?: string | null;
  extraction: unknown;
}

export interface ConflictCandidate {
  sourceId: string;
  sourceKind: TravelDocumentKind;
  value: unknown;
  normalizedValue: string;
  createdAt?: string | null;
}

export interface TravelDocumentConflict {
  fingerprint: string;
  fieldPath: string;
  domain: ConflictDomain;
  severity: ConflictSeverity;
  status: "open" | "suggested";
  suggestedSourceId: string | null;
  suggestedValue: unknown;
  candidates: ConflictCandidate[];
}

const SOURCE_PRECEDENCE: Record<ConflictDomain, TravelDocumentKind[]> = {
  financial: ["payment_receipt", "contract", "reservation_confirmation", "voucher", "operator_quote", "other"],
  legal: ["contract", "reservation_confirmation", "payment_receipt", "voucher", "operator_quote", "other"],
  operational: ["voucher", "reservation_confirmation", "contract", "payment_receipt", "operator_quote", "other"],
  commercial: ["operator_quote", "reservation_confirmation", "contract", "payment_receipt", "voucher", "other"],
  identity: ["contract", "payment_receipt", "reservation_confirmation", "voucher", "operator_quote", "other"],
  other: ["reservation_confirmation", "voucher", "contract", "payment_receipt", "operator_quote", "other"],
};

const CRITICAL_PATTERNS = [
  /(^|\.)(cpf|document|passport|birth_date|full_name|payer|passenger)/i,
  /(^|\.)(total|amount|price|tax|fee|installment|payment|currency|balance)/i,
  /(^|\.)(reservation|voucher|locator|ticket|flight_number|check_in|check_out|travel_start|travel_end)/i,
  /(^|\.)(cancel|refund|penalt|clause|contract|legal)/i,
  /(^|\.)(baggage|bagagem|seat|assento)/i,
];

function normalize(value: unknown): string {
  if (value === null || value === undefined || value === "") return "<empty>";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "<invalid-number>";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    const normalized = value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const numericSource = normalized.replace(/r\$|brl|\s/g, "");
    const numeric = numericSource.includes(",")
      ? numericSource.replace(/\./g, "").replace(/,/g, ".")
      : numericSource;
    return numeric || "<empty>";
  }
  return JSON.stringify(value, Object.keys(value as object).sort());
}

function flatten(value: unknown, path = "", output: Array<{ path: string; value: unknown }> = []) {
  if (value === null || value === undefined || typeof value !== "object") {
    if (path) output.push({ path, value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${path}[${index}]`, output));
    return output;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    flatten(child, path ? `${path}.${key}` : key, output);
  });
  return output;
}

function domainFor(path: string): ConflictDomain {
  if (/payment|price|amount|tax|fee|total|installment|currency|finance|receipt|balance/i.test(path)) return "financial";
  if (/contract|clause|cancel|refund|policy|legal|terms|signature/i.test(path)) return "legal";
  if (/quote|budget|proposal|markup|discount|commercial/i.test(path)) return "commercial";
  if (/hotel|flight|transfer|voucher|locator|ticket|check|travel|baggage|seat|service|supplier/i.test(path)) return "operational";
  if (/passenger|payer|customer|client|cpf|document|email|phone|name|identity/i.test(path)) return "identity";
  return "other";
}

function severityFor(path: string, candidateCount: number): ConflictSeverity {
  if (candidateCount > 2) return "critical";
  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(path))) return "critical";
  if (/description|notes|address|phone|email/i.test(path)) return "medium";
  return "low";
}

function sourceRank(domain: ConflictDomain, kind: TravelDocumentKind) {
  const rank = SOURCE_PRECEDENCE[domain].indexOf(kind);
  return rank === -1 ? SOURCE_PRECEDENCE[domain].length : rank;
}

function fingerprint(fieldPath: string, candidates: ConflictCandidate[]) {
  return `${fieldPath}:${candidates.map((candidate) => `${candidate.sourceId}:${candidate.normalizedValue}`).sort().join("|")}`;
}

export function resolveTravelDocumentConflicts(sources: ConflictSource[]): TravelDocumentConflict[] {
  const byPath = new Map<string, ConflictCandidate[]>();
  sources.forEach((source) => {
    flatten(source.extraction).forEach(({ path, value }) => {
      const candidate: ConflictCandidate = {
        sourceId: source.id,
        sourceKind: source.kind,
        value,
        normalizedValue: normalize(value),
        createdAt: source.createdAt || null,
      };
      const candidates = byPath.get(path) || [];
      if (!candidates.some((item) => item.normalizedValue === candidate.normalizedValue && item.sourceId === candidate.sourceId)) candidates.push(candidate);
      byPath.set(path, candidates);
    });
  });

  return [...byPath.entries()]
    .filter(([, candidates]) => new Set(candidates.map((candidate) => candidate.normalizedValue)).size > 1)
    .map(([fieldPath, candidates]) => {
      const domain = domainFor(fieldPath);
      const ranked = [...candidates].sort((left, right) => {
        const rankDifference = sourceRank(domain, left.sourceKind) - sourceRank(domain, right.sourceKind);
        if (rankDifference !== 0) return rankDifference;
        return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
      });
      const suggestion = ranked[0];
      return {
        fingerprint: fingerprint(fieldPath, candidates),
        fieldPath,
        domain,
        severity: severityFor(fieldPath, candidates.length),
        status: "suggested" as const,
        suggestedSourceId: suggestion?.sourceId || null,
        suggestedValue: suggestion?.value,
        candidates,
      };
    });
}

export function normalizeTravelDocumentValue(value: unknown) {
  return normalize(value);
}
