import { z } from "zod";

export const OperatorCodeSchema = z.enum([
  "orinter",
  "cvc",
  "trend",
  "frt",
  "incomum", "schultz", "new_age", "personal", "ancoradouro",
  "visual",
  "azul_viagens",
  "decolar_b2b",
  "generic",
]);

export type OperatorCode = z.infer<typeof OperatorCodeSchema>;

/** Normaliza qualquer slug/nome de operadora Infotravel para um código canônico válido. */
export function normalizeOperatorCode(raw?: string | null): OperatorCode {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "generic";
  if (s.includes("orinter")) return "orinter";
  if (s.includes("frt")) return "frt";
  if (s.includes("incomum")) return "incomum";
  if (s.includes("schultz")) return "schultz";
  if (s.includes("newage") || s.includes("new_age") || s.includes("new age")) return "new_age";
  if (s.includes("personal")) return "personal";
  if (s.includes("ancoradouro")) return "ancoradouro";
  if (s.includes("trend")) return "trend";
  if (s.includes("visual")) return "visual";
  if (s.includes("cvc")) return "cvc";
  if (s.includes("azul")) return "azul_viagens";
  if (s.includes("decolar")) return "decolar_b2b";
  return "generic";
}

/** Converte datas DD/MM/AAAA ou YYYY-MM-DD para ISO YYYY-MM-DD seguro. */
export function normalizeBrDateToIso(raw?: string | null): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

/** Parser RFC-4180 para CSV separado por ponto-e-vírgula (suporta campos entre aspas com ';' e quebra de linha). */
export function parseSemicolonCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ";") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}

/** Converte CSV (suporta layout canônico de 23-27 colunas e legados de 21/22 colunas) em itens de reserva. */
export function parseOperatorCsvToSyncItems(
  text: string,
  defaultOperatorCode = "",
): Array<Record<string, any>> {
  const rows = parseSemicolonCsvRows(text);
  if (rows.length <= 1) return [];

  const headerRow = rows[0].map((h) => h.toLowerCase());
  const dataRows = rows.slice(1);

  const colIdx = (patterns: string[], fallback: number): number => {
    const found = headerRow.findIndex((h) => patterns.some((p) => h.includes(p)));
    return found >= 0 ? found : fallback;
  };

  const idxId = colIdx(["id reserva", "reserva"], 0);
  const idxStatus = colIdx(["status reserva", "status"], 1);
  const idxCriacao = colIdx(["criacao", "criação"], 2);
  const idxContato = colIdx(["contato"], 3);
  const idxEmail = colIdx(["email"], 4);
  const idxTelefone = colIdx(["telefone"], 5);
  const idxPaxNome = colIdx(["nome passageiro", "nome completo"], 6);
  const idxPaxCpf = colIdx(["cpf passageiro", "cpf"], 7);
  const idxPaxNasc = colIdx(["nascimento"], 8);
  const idxPaxTipo = colIdx(["tipo ("], 10);
  const idxPaxTitular = colIdx(["titular?"], 11);
  const idxHotel = colIdx(["hotel / destino", "destino / hotel", "destino"], 12);
  const idxAcomodacao = colIdx(["acomodacao", "acomodação", "quarto"], -1);
  const idxLocalizador = colIdx(["localizador", "locator"], -1);
  const idxTotal = colIdx(["valor total"], -1);
  const idxTaxas = colIdx(["taxas"], -1);
  const idxImpostos = colIdx(["impostos"], -1);
  const idxFormaPagto = colIdx(["forma pagamento", "forma de pagamento"], -1);
  const idxStatusPagto = colIdx(["status pagamento"], -1);
  const idxScore = colIdx(["score confianca", "score confiança"], -1);
  const idxBanco = colIdx(["banco emissor"], -1);
  const idxParcelamento = colIdx(["parcelamento"], -1);
  const idxComissao = colIdx(["comissao", "comissão"], -1);
  const idxOperadora = colIdx(["operadora"], -1);
  const idxCheckIn = colIdx(["check-in", "checkin", "embarque"], -1);
  const idxCheckOut = colIdx(["check-out", "checkout", "retorno"], -1);

  const reservationsMap = new Map<string, any>();

  for (const cols of dataRows) {
    const id = cols[idxId];
    if (!id) continue;

    if (!reservationsMap.has(id)) {
      const rawOp = idxOperadora >= 0 ? cols[idxOperadora] || "" : "";
      const opSlug = rawOp
        ? normalizeOperatorCode(rawOp)
        : defaultOperatorCode
          ? normalizeOperatorCode(defaultOperatorCode)
          : "";

      reservationsMap.set(id, {
        id,
        operatorSlug: opSlug,
        status: cols[idxStatus] || "Confirmada",
        criacao: cols[idxCriacao] || "",
        checkIn: idxCheckIn >= 0 ? cols[idxCheckIn] || "" : "",
        checkOut: idxCheckOut >= 0 ? cols[idxCheckOut] || "" : "",
        contato: cols[idxContato] || "",
        email: cols[idxEmail] || "",
        telefone: cols[idxTelefone] || "",
        hotel: cols[idxHotel] || "",
        acomodacao: idxAcomodacao >= 0 ? cols[idxAcomodacao] || "Standard" : "Standard",
        localizador: idxLocalizador >= 0 ? cols[idxLocalizador] || "" : "",
        valorTotal: idxTotal >= 0 ? cols[idxTotal] || "0,00" : "0,00",
        taxas: idxTaxas >= 0 ? cols[idxTaxas] || "0,00" : "0,00",
        impostos: idxImpostos >= 0 ? cols[idxImpostos] || "0,00" : "0,00",
        formaPagto: idxFormaPagto >= 0 ? cols[idxFormaPagto] || "Faturado" : "Faturado",
        statusPagto: idxStatusPagto >= 0 ? cols[idxStatusPagto] || "Aprovado" : "Aprovado",
        scoreConfianca: idxScore >= 0 ? Number(cols[idxScore]) || 80 : 80,
        bancoEmissor: idxBanco >= 0 ? cols[idxBanco] || "" : "",
        parcelamento: idxParcelamento >= 0 ? cols[idxParcelamento] || "1x" : "1x",
        comissao: idxComissao >= 0 ? cols[idxComissao] || "0,00" : "0,00",
        passageiros: [],
      });
    }

    const current = reservationsMap.get(id);
    const paxName = cols[idxPaxNome];
    if (paxName) {
      current.passageiros.push({
        nome: paxName,
        cpf: cols[idxPaxCpf] || "",
        birthDate: cols[idxPaxNasc] || "",
        tipo: cols[idxPaxTipo] || "ADT",
        titular: (cols[idxPaxTitular] || "").toLowerCase() === "sim" || current.passageiros.length === 0,
      });
    }
  }

  return Array.from(reservationsMap.values());
}

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
      passenger_type: z.enum(["ADT", "CHD", "INF"]).default("ADT").optional(),
      age: z.number().int().nonnegative().nullable().optional(),
      room_category: z.string().nullable().optional(),
      companion_lead_cpf: z.string().nullable().optional(),
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
    payment_details: z
      .object({
        method_type: z
          .enum(["boleto", "cartao_credito", "pix", "faturado", "misto", "outro"])
          .default("outro"),
        boleto_status: z
          .enum(["aprovado", "negado", "liquidado", "pendente"])
          .nullable()
          .optional(),
        credit_confidence_score: z.number().int().min(0).max(100).nullable().optional(),
        operator_credit_approved_cents: z.number().int().nonnegative().nullable().optional(),
        bank_name: z.string().nullable().optional(),
        barcode_digits: z.string().nullable().optional(),
      })
      .optional(),
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
