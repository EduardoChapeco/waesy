import { z } from "zod";

export const OperatorCodeSchema = z.enum([
  "orinter",
  "cvc",
  "trend",
  "frt",
  "incomum",
  "visual",
  "azul_viagens",
  "decolar_b2b",
  "generic",
]);

export const CanonicalOperatorDocumentSchema = z.object({
  schema_version: z.literal("travel-operator-v1"),
  source_kind: z.enum([
    "operator_quote",
    "reservation_confirmation",
    "payment_receipt",
    "operator_contact",
    "voucher",
    "contract",
    "other",
  ]),
  operator: z.object({
    code: OperatorCodeSchema,
    name: z.string().min(1),
    reference: z.string().nullable(),
  }),
  reservation: z.object({
    locator: z.string().nullable(),
    status: z.enum(["quoted", "reserved", "paid", "issued", "unknown"]),
    travel_start: z.string().nullable(),
    travel_end: z.string().nullable(),
    destination: z.string().nullable(),
  }),
  passengers: z.array(
    z.object({
      name: z.string().min(1),
      document: z.string().nullable(),
      document_type: z.string().nullable(),
      birth_date: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      is_lead: z.boolean(),
    }),
  ),
  services: z.object({
    flights: z.array(z.record(z.any())),
    hotels: z.array(z.record(z.any())),
    transfers: z.array(z.record(z.any())),
    tours: z.array(z.record(z.any())),
  }),
  financial: z.object({
    gross_cents: z.number().int().nonnegative().nullable(),
    net_cents: z.number().int().nonnegative().nullable(),
    paid_cents: z.number().int().nonnegative().nullable(),
    installment_count: z.number().int().positive().nullable(),
    installment_cents: z.number().int().nonnegative().nullable(),
    payment_method: z.string().nullable(),
  }),
  contacts: z.object({
    commercial_phone: z.string().nullable(),
    emergency_phone: z.string().nullable(),
    support_email: z.string().nullable(),
    reservation_desk: z.string().nullable(),
  }),
  provenance: z.object({
    source_ingestion_id: z.string().uuid(),
    original_operator_name: z.string().nullable(),
    extraction_keys: z.array(z.string()),
  }),
});

export type CanonicalOperatorDocument = z.infer<typeof CanonicalOperatorDocumentSchema>;

const OPERATOR_ALIASES: Array<[OperatorCode, RegExp]> = [
  ["orinter", /orinter/i],
  ["cvc", /cvc/i],
  ["trend", /trend/i],
  ["frt", /\bfrt\b/i],
  ["incomum", /incomum/i],
  ["visual", /visual\s+turismo/i],
  ["azul_viagens", /azul\s+viagens/i],
  ["decolar_b2b", /decolar/i],
];

type OperatorCode = z.infer<typeof OperatorCodeSchema>;
type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function asArray(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord);
}

function operatorCode(name: string): OperatorCode {
  return OPERATOR_ALIASES.find(([, alias]) => alias.test(name))?.[0] || "generic";
}

function statusFor(
  sourceKind: CanonicalOperatorDocument["source_kind"],
): CanonicalOperatorDocument["reservation"]["status"] {
  if (sourceKind === "operator_quote") return "quoted";
  if (sourceKind === "payment_receipt") return "paid";
  if (sourceKind === "voucher") return "issued";
  if (sourceKind === "reservation_confirmation" || sourceKind === "contract") return "reserved";
  return "unknown";
}

export function normalizeOperatorDocument(input: {
  sourceKind: CanonicalOperatorDocument["source_kind"];
  ingestionId: string;
  extraction: unknown;
}): CanonicalOperatorDocument {
  const raw = asRecord(input.extraction);
  const operatorName =
    asString(raw.operator_name) || asString(raw.operator) || "Operadora não identificada";
  const passengers = Array.isArray(raw.passengers)
    ? raw.passengers.map((passenger, index) => {
        const item = asRecord(passenger);
        return {
          name: asString(item.name) || asString(item.full_name) || `Passageiro ${index + 1}`,
          document: asString(item.document) || asString(item.cpf),
          document_type: asString(item.document_type),
          birth_date: asString(item.birth_date),
          phone: asString(item.phone),
          email: asString(item.email),
          is_lead: item.is_lead === true || index === 0,
        };
      })
    : [];
  const primaryName = asString(raw.client_name) || passengers[0]?.name || "Passageiro principal";
  const contacts = asRecord(raw.operator_contacts);

  const normalized = {
    schema_version: "travel-operator-v1" as const,
    source_kind: input.sourceKind,
    operator: {
      code: operatorCode(operatorName),
      name: operatorName,
      reference:
        asString(raw.quote_reference_number) ||
        asString(raw.reservation_number) ||
        asString(raw.general_locator),
    },
    reservation: {
      locator:
        asString(raw.general_locator) ||
        asString(raw.reservation_locator) ||
        asString(raw.quote_reference_number),
      status: statusFor(input.sourceKind),
      travel_start: asString(raw.travel_start) || asString(raw.travel_start_date),
      travel_end: asString(raw.travel_end) || asString(raw.travel_end_date),
      destination: asString(raw.destination) || asString(raw.destination_city),
    },
    passengers:
      passengers.length > 0
        ? passengers
        : [
            {
              name: primaryName,
              document: asString(raw.client_document),
              document_type: null,
              birth_date: null,
              phone: asString(raw.client_whatsapp),
              email: asString(raw.client_email),
              is_lead: true,
            },
          ],
    services: {
      flights: asArray(raw.flights),
      hotels: asArray(raw.hotels),
      transfers: asArray(raw.transfers),
      tours: asArray(raw.tours),
    },
    financial: {
      gross_cents: asNumber(raw.gross_price_cents) || asNumber(raw.total_amount_cents),
      net_cents: asNumber(raw.operator_net_cents),
      paid_cents: asNumber(raw.paid_amount_cents),
      installment_count: asNumber(raw.max_installments) || asNumber(raw.total_installments),
      installment_cents: asNumber(raw.installment_cents),
      payment_method: asString(raw.payment_method),
    },
    contacts: {
      commercial_phone: asString(contacts.commercial_phone),
      emergency_phone: asString(contacts.emergency_phone),
      support_email: asString(contacts.support_email),
      reservation_desk: asString(contacts.reservation_desk),
    },
    provenance: {
      source_ingestion_id: input.ingestionId,
      original_operator_name: asString(raw.operator_name),
      extraction_keys: Object.keys(raw).sort(),
    },
  };

  return CanonicalOperatorDocumentSchema.parse(normalized);
}
