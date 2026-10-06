export type TravelDocumentKind =
  | "operator_quote"
  | "reservation_confirmation"
  | "payment_receipt"
  | "contract"
  | "voucher"
  | "operator_contact"
  | "other";

export type ConflictDomain =
  "identity" | "operational" | "financial" | "legal" | "commercial" | "other";
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
  fieldPath?: string;
  evidenceKey?: string | null;
  createdAt?: string | null;
}

export interface TravelDocumentConflict {
  fingerprint: string;
  fieldPath: string;
  domain: ConflictDomain;
  severity: ConflictSeverity;
  status: "open" | "suggested";
  suggestedSourceId: string | null;
  suggestedSourceKind: TravelDocumentKind | null;
  suggestedValue: unknown;
  candidates: ConflictCandidate[];
  precedenceRule: string;
  suggestionReason: string;
}

const SOURCE_PRECEDENCE: Record<ConflictDomain, TravelDocumentKind[]> = {
  financial: [
    "payment_receipt",
    "contract",
    "reservation_confirmation",
    "voucher",
    "operator_quote",
    "other",
  ],
  legal: [
    "contract",
    "reservation_confirmation",
    "payment_receipt",
    "voucher",
    "operator_quote",
    "other",
  ],
  operational: [
    "voucher",
    "reservation_confirmation",
    "contract",
    "payment_receipt",
    "operator_quote",
    "other",
  ],
  commercial: [
    "operator_quote",
    "reservation_confirmation",
    "contract",
    "payment_receipt",
    "voucher",
    "other",
  ],
  identity: [
    "contract",
    "payment_receipt",
    "reservation_confirmation",
    "voucher",
    "operator_quote",
    "other",
  ],
  other: [
    "reservation_confirmation",
    "voucher",
    "contract",
    "payment_receipt",
    "operator_quote",
    "other",
  ],
};

const FIELD_PRECEDENCE: Array<{ pattern: RegExp; kinds: TravelDocumentKind[]; rule: string }> = [
  {
    pattern:
      /(^|\.)(paid|paid_amount|payment|payments|installment|installments|receipt|balance|total|amount|price)/i,
    kinds: ["payment_receipt", "contract", "reservation_confirmation", "voucher"],
    rule: "financial.payment_receipt_first",
  },
  {
    pattern: /(^|\.)(clause|cancel|cancellation|refund|terms|signature|contract)/i,
    kinds: ["contract", "reservation_confirmation", "payment_receipt", "voucher"],
    rule: "legal.contract_first",
  },
  {
    pattern:
      /(^|\.)(locator|general_locator|pnr|ticket|confirmation|flight_number|departure_time|arrival_time)/i,
    kinds: ["voucher", "reservation_confirmation", "contract", "operator_quote"],
    rule: "operational.issued_document_first",
  },
  {
    pattern: /(^|\.)(hotel|room|checkin|checkout|accommodation)/i,
    kinds: ["voucher", "reservation_confirmation", "contract", "operator_quote"],
    rule: "operational.voucher_hotel_first",
  },
  {
    pattern: /(^|\.)(markup|discount|gross_price|operator_net|quote|budget|proposal)/i,
    kinds: ["operator_quote", "contract", "reservation_confirmation", "payment_receipt"],
    rule: "commercial.quote_first",
  },
  {
    pattern: /(^|\.)(cpf|document|passport|full_name|payer|passenger|birth_date)/i,
    kinds: ["contract", "payment_receipt", "reservation_confirmation", "voucher"],
    rule: "identity.contract_first",
  },
];

const CRITICAL_PATTERNS = [
  /(^|\.)(cpf|document|passport|birth_date|full_name|payer|passenger)/i,
  /(^|\.)(total|amount|price|tax|fee|installment|payment|currency|balance)/i,
  /(^|\.)(reservation|voucher|locator|ticket|flight_number|check_in|check_out|travel_start|travel_end)/i,
  /(^|\.)(cancel|refund|penalt|clause|contract|legal)/i,
];

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalize(value: unknown, path = ""): string {
  if (value === null || value === undefined || value === "") return "<empty>";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "<invalid-number>";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    const source = value.trim();
    const date = source.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/);
    if (date) return `${date[3]}-${date[2]}-${date[1]}`;
    const normalized = source
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/cpf|document|passport|phone|whatsapp|telefone|locator|pnr|ticket/i.test(path))
      return normalized.replace(/[^a-z0-9]/g, "");
    const numericSource = normalized.replace(/r\$|brl|\s/g, "");
    if (/^-?\d[\d.,]*$/.test(numericSource)) {
      return numericSource.includes(",")
        ? numericSource.replace(/\./g, "").replace(/,/g, ".")
        : numericSource;
    }
    return normalized.replace(/\s+/g, " ");
  }
  return stableJson(value);
}

function semanticKey(item: unknown): string | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const record = item as Record<string, unknown>;
  for (const key of [
    "id",
    "locator",
    "general_locator",
    "confirmation",
    "reservation_id",
    "flight_number",
    "document",
    "cpf",
    "name",
    "hotel_name",
  ]) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim())
      return `${key}:${normalize(value, key)}`;
  }
  return null;
}

function flatten(
  value: unknown,
  path = "",
  output: Array<{ path: string; value: unknown; evidenceKey: string | null }> = [],
  evidenceKey: string | null = null,
) {
  if (value === null || value === undefined || typeof value !== "object") {
    if (path) output.push({ path, value, evidenceKey });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = semanticKey(item);
      flatten(item, `${path}[${key || `index:${index}`}]`, output, key || evidenceKey);
    });
    return output;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    flatten(child, path ? `${path}.${key}` : key, output, evidenceKey);
  });
  return output;
}

function domainFor(path: string): ConflictDomain {
  if (/payment|price|amount|tax|fee|total|installment|currency|finance|receipt|balance/i.test(path))
    return "financial";
  if (/contract|clause|cancel|refund|policy|legal|terms|signature/i.test(path)) return "legal";
  if (/quote|budget|proposal|markup|discount|commercial/i.test(path)) return "commercial";
  if (
    /hotel|flight|transfer|voucher|locator|reservation|ticket|check|travel|baggage|seat|service|supplier/i.test(
      path,
    )
  )
    return "operational";
  if (/passenger|payer|customer|client|cpf|document|email|phone|name|identity/i.test(path))
    return "identity";
  return "other";
}

function fieldRuleFor(path: string, domain: ConflictDomain) {
  return (
    FIELD_PRECEDENCE.find((rule) => rule.pattern.test(path)) || {
      kinds: SOURCE_PRECEDENCE[domain],
      rule: `${domain}.domain_precedence`,
    }
  );
}

function severityFor(
  path: string,
  domain: ConflictDomain,
  candidateCount: number,
): ConflictSeverity {
  if (
    CRITICAL_PATTERNS.some((pattern) => pattern.test(path)) &&
    ["identity", "financial", "legal"].includes(domain)
  )
    return "critical";
  if (
    candidateCount > 2 ||
    (domain === "operational" && CRITICAL_PATTERNS.some((pattern) => pattern.test(path)))
  )
    return "high";
  if (/description|notes|address|phone|email/i.test(path)) return "medium";
  return "low";
}

function sourceRank(kinds: TravelDocumentKind[], kind: TravelDocumentKind) {
  const rank = kinds.indexOf(kind);
  return rank === -1 ? kinds.length : rank;
}

function fingerprint(fieldPath: string, candidates: ConflictCandidate[]) {
  return `${fieldPath}:${candidates
    .map((candidate) => `${candidate.sourceId}:${candidate.normalizedValue}`)
    .sort()
    .join("|")}`;
}

export function resolveTravelDocumentConflicts(
  sources: ConflictSource[],
): TravelDocumentConflict[] {
  const byPath = new Map<string, ConflictCandidate[]>();
  sources.forEach((source) => {
    flatten(source.extraction).forEach(({ path, value, evidenceKey }) => {
      const candidate: ConflictCandidate = {
        sourceId: source.id,
        sourceKind: source.kind,
        value,
        normalizedValue: normalize(value, path),
        fieldPath: path,
        evidenceKey,
        createdAt: source.createdAt || null,
      };
      const candidates = byPath.get(path) || [];
      if (
        !candidates.some(
          (item) =>
            item.normalizedValue === candidate.normalizedValue &&
            item.sourceId === candidate.sourceId,
        )
      )
        candidates.push(candidate);
      byPath.set(path, candidates);
    });
  });

  return [...byPath.entries()]
    .filter(
      ([, candidates]) =>
        new Set(candidates.map((candidate) => candidate.normalizedValue)).size > 1,
    )
    .map(([fieldPath, candidates]) => {
      const domain = domainFor(fieldPath);
      const rule = fieldRuleFor(fieldPath, domain);
      const ranked = [...candidates].sort((left, right) => {
        const rankDifference =
          sourceRank(rule.kinds, left.sourceKind) - sourceRank(rule.kinds, right.sourceKind);
        if (rankDifference !== 0) return rankDifference;
        return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
      });
      const suggestion = ranked[0];
      return {
        fingerprint: fingerprint(fieldPath, candidates),
        fieldPath,
        domain,
        severity: severityFor(fieldPath, domain, candidates.length),
        status: "suggested" as const,
        suggestedSourceId: suggestion?.sourceId || null,
        suggestedSourceKind: suggestion?.sourceKind || null,
        suggestedValue: suggestion?.value,
        candidates,
        precedenceRule: rule.rule,
        suggestionReason: `Fonte ${suggestion?.sourceKind || "desconhecida"} selecionada pela regra ${rule.rule}; empate resolvido pela fonte mais recente.`,
      };
    });
}

export function normalizeTravelDocumentValue(value: unknown, fieldPath = "") {
  return normalize(value, fieldPath);
}
