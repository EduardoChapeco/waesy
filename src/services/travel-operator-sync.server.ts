import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import {
  normalizeBrDateToIso,
  normalizeOperatorCode,
  OperatorCodeSchema,
} from "@/lib/travel-operator-sync";

export const OperatorSyncItemSchema = z.object({
  id: z.string().min(1),
  operatorSlug: z.string().optional(),
  status: z.string().default("Confirmada"),
  criacao: z.string().optional().default(""),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  valorTotal: z.string().optional().default("0,00"),
  taxas: z.string().optional().default("0,00"),
  impostos: z.string().optional().default("0,00"),
  comissao: z.string().optional().default("0,00"),
  contato: z.string().optional().default(""),
  email: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  hotel: z.string().optional().default(""),
  destino: z.string().optional().default(""),
  localizador: z.string().optional().default(""),
  acomodacao: z.string().optional().default(""),
  formaPagto: z.string().optional().default(""),
  statusPagto: z.string().optional().default("Aprovado"),
  scoreConfianca: z.number().optional().default(75),
  bancoEmissor: z.string().optional().default(""),
  parcelamento: z.string().optional().default("1x"),
  passageiros: z
    .array(
      z.object({
        nome: z.string().min(1),
        tipo: z.string().optional().default("ADT"),
        birthDate: z.string().optional().default(""),
        nasc: z.string().optional().default(""),
        cpf: z.string().optional().default(""),
        titular: z.boolean().optional().default(false),
      }),
    )
    .default([]),
});

export const IngestOperatorSyncBatchInputSchema = z.object({
  operatorCode: OperatorCodeSchema.optional().default("generic"),
  sourceKind: z.enum(["browser_extension", "local_miner", "csv_import"]).optional().default("browser_extension"),
  items: z.array(OperatorSyncItemSchema).min(1).max(200),
});

export type OperatorSyncItem = z.infer<typeof OperatorSyncItemSchema>;

export function parseBrlToCents(raw: string | number | undefined | null): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const val = Number.parseFloat(normalized);
  return Number.isFinite(val) ? Math.max(0, Math.round(val * 100)) : 0;
}

export async function reconcileOperatorSyncBatch(input: {
  storeId: string;
  createdByProfileId?: string | null;
  operatorCode?: string | null;
  sourceKind?: "browser_extension" | "local_miner" | "csv_import";
  items: OperatorSyncItem[];
}) {
  const supabase = getServerClient();
  const defaultOpCode = normalizeOperatorCode(input.operatorCode);

  let processedCount = 0;
  let totalPaxCount = 0;
  let reconciledTripsCount = 0;
  let reconciledCustomersCount = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  for (const item of input.items) {
    const itemOpCode = item.operatorSlug
      ? normalizeOperatorCode(item.operatorSlug)
      : defaultOpCode;
    const idempotencyKey = `operator-batch:${input.storeId}:${itemOpCode}:${item.id}`;

    try {
      const { data: existing } = await supabase
        .from("travel_operator_sync_runs")
        .select("id")
        .eq("store_id", input.storeId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      const normalizedPayload = {
        schema_version: "travel-operator-v1",
        operator: { code: itemOpCode },
        reservation: item,
        ingested_at: new Date().toISOString(),
      };

      if (!existing) {
        const { error: runInsertErr } = await supabase.from("travel_operator_sync_runs").insert({
          store_id: input.storeId,
          operator_code: itemOpCode,
          source_kind: input.sourceKind || "browser_extension",
          adapter_version: "travel-operator-v1",
          idempotency_key: idempotencyKey,
          status: "ready",
          normalized_payload: normalizedPayload,
          created_by_profile_id: input.createdByProfileId || null,
          completed_at: new Date().toISOString(),
        });
        if (runInsertErr) {
          errors.push({ id: item.id, reason: runInsertErr.message });
          continue;
        }
        processedCount++;
      }

      // 1. Reconciliação de Cliente (customers_crm) usando colunas reais (document, email, phone)
      const titularPax =
        (item.passageiros || []).find((p) => p.titular) || item.passageiros?.[0];
      const customerName = (
        item.contato ||
        titularPax?.nome ||
        `Cliente Reserva #${item.id}`
      ).trim();
      const customerEmail = (item.email || "").trim() || null;
      const customerPhone = (item.telefone || "").trim() || null;
      const customerDocument = (titularPax?.cpf || "").replace(/\D/g, "") || null;

      let customerId: string | null = null;
      if (customerDocument || customerEmail || customerPhone) {
        const filters: string[] = [];
        if (customerDocument) filters.push(`document.eq.${customerDocument}`);
        if (customerEmail) filters.push(`email.eq.${customerEmail}`);
        if (customerPhone) filters.push(`phone.eq.${customerPhone}`);

        const { data: foundCustomer } = await supabase
          .from("customers_crm")
          .select("id")
          .eq("store_id", input.storeId)
          .or(filters.join(","))
          .limit(1)
          .maybeSingle();

        if (foundCustomer?.id) {
          customerId = foundCustomer.id;
        }
      }

      if (!customerId && customerName) {
        const { data: newCust } = await supabase
          .from("customers_crm")
          .insert({
            store_id: input.storeId,
            name: customerName,
            full_name: customerName,
            email: customerEmail,
            phone: customerPhone,
            document: customerDocument,
            channel: "operator_sync",
            status: "active",
            notes: `Importado via sincronização ${itemOpCode.toUpperCase()} (Reserva #${item.id})`,
          })
          .select("id")
          .maybeSingle();
        if (newCust?.id) {
          customerId = newCust.id;
          reconciledCustomersCount++;
        }
      }

      const totalCents = parseBrlToCents(item.valorTotal);
      const taxesCents = parseBrlToCents(item.taxas) + parseBrlToCents(item.impostos);
      const commissionCents = parseBrlToCents(item.comissao);
      const netSaleCents = Math.max(0, totalCents - taxesCents);
      const destinationLabel = (item.destino || item.hotel || itemOpCode.toUpperCase()).trim();
      const tripNumber = `OP-${itemOpCode.toUpperCase()}-${item.id}`;
      const tripTitle = item.hotel
        ? `${item.hotel} (#${item.id})`
        : `Reserva ${itemOpCode.toUpperCase()} #${item.id}`;

      const departureIso =
        normalizeBrDateToIso(item.checkIn) ||
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const returnIso =
        normalizeBrDateToIso(item.checkOut) ||
        new Date(Date.parse(departureIso) + 5 * 86400000).toISOString().slice(0, 10);
      const saleDateIso =
        normalizeBrDateToIso(item.criacao) || new Date().toISOString().slice(0, 10);

      // 2. Viagem (tourism_trips) — verificação por trip_number ou título #id
      const { data: existingTrip } = await supabase
        .from("tourism_trips")
        .select("id")
        .eq("store_id", input.storeId)
        .or(`trip_number.eq.${tripNumber},title.ilike.%#${item.id}%`)
        .limit(1)
        .maybeSingle();

      let tripId = existingTrip?.id || null;
      const isCancelled = (item.status || "").toLowerCase().includes("cancel");

      if (!tripId) {
        const adultsCount = Math.max(
          1,
          (item.passageiros || []).filter((p) => (p.tipo || "ADT").toUpperCase() === "ADT").length ||
            1,
        );
        const childrenCount = (item.passageiros || []).filter(
          (p) => (p.tipo || "").toUpperCase() !== "ADT",
        ).length;

        const { data: createdTrip, error: tripErr } = await supabase
          .from("tourism_trips")
          .insert({
            store_id: input.storeId,
            created_by_profile_id: input.createdByProfileId || null,
            customer_id: customerId,
            trip_number: tripNumber,
            title: tripTitle,
            destination_city: destinationLabel,
            travel_start_date: departureIso,
            travel_end_date: returnIso,
            adults_count: adultsCount,
            children_count: childrenCount,
            currency: "BRL",
            total_cents: totalCents,
            status: isCancelled ? "cancelled" : "confirmed",
            client_name: customerName,
            client_whatsapp: customerPhone || "Não informado",
            client_email: customerEmail,
            client_document: customerDocument,
            operator_name: itemOpCode.toUpperCase(),
            payment_method: item.formaPagto || null,
            notes: `Reserva ${itemOpCode.toUpperCase()} #${item.id} | Acomodação: ${item.acomodacao || "Padrão"} | Pagto: ${item.formaPagto || "N/A"} (${item.parcelamento || "1x"}) | Score: ${item.scoreConfianca}`,
          })
          .select("id")
          .maybeSingle();

        if (tripErr) {
          errors.push({ id: item.id, reason: `tourism_trips: ${tripErr.message}` });
        } else if (createdTrip?.id) {
          tripId = createdTrip.id;
          reconciledTripsCount++;

          // 3. Passageiros (trip_passengers)
          if (item.passageiros && item.passageiros.length > 0) {
            const paxRows = item.passageiros.map((pax, idx) => {
              const birthIso = normalizeBrDateToIso(pax.birthDate || pax.nasc);
              const cleanCpf = (pax.cpf || "").replace(/\D/g, "") || null;
              return {
                store_id: input.storeId,
                trip_id: tripId,
                full_name: pax.nome,
                document: cleanCpf,
                document_type: cleanCpf ? "cpf" : null,
                birth_date: birthIso,
                is_lead_passenger: Boolean(pax.titular || idx === 0),
                notes: `Tipo: ${(pax.tipo || "ADT").toUpperCase()}`,
              };
            });
            const { error: paxErr } = await supabase.from("trip_passengers").insert(paxRows);
            if (paxErr) {
              errors.push({ id: item.id, reason: `trip_passengers: ${paxErr.message}` });
            }
          }

          // 4. Kanban de Embarques (travel_departures_kanban)
          const { error: kanbanErr } = await supabase.from("travel_departures_kanban").insert({
            store_id: input.storeId,
            trip_id: tripId,
            client_name: customerName,
            client_phone: customerPhone,
            destination: destinationLabel,
            departure_date: `${departureIso}T09:00:00Z`,
            return_date: `${returnIso}T18:00:00Z`,
            stage: "booked",
            passengers_count: Math.max(1, (item.passageiros || []).length),
            airline_locator: item.localizador || item.id,
            hotel_name: item.hotel || null,
            notes: `Importado de ${itemOpCode.toUpperCase()} #${item.id}`,
          });
          if (kanbanErr) {
            errors.push({ id: item.id, reason: `travel_departures_kanban: ${kanbanErr.message}` });
          }

          // 5. Ficha Financeira da Venda (travel_sale_financial_sheets)
          if (totalCents > 0) {
            const { error: sheetErr } = await supabase
              .from("travel_sale_financial_sheets")
              .insert({
                store_id: input.storeId,
                internal_code: tripNumber,
                client_name: customerName,
                client_document: customerDocument,
                primary_operator: itemOpCode.toUpperCase(),
                locator_code: item.localizador || item.id,
                destination: destinationLabel,
                sale_date: saleDateIso,
                departure_date: departureIso,
                return_date: returnIso,
                booking_status: isCancelled ? "cancelada" : "confirmada",
                gross_sale_cents: totalCents,
                non_commissionable_cents: taxesCents,
                net_sale_cents: netSaleCents,
                commission_calculated_cents: commissionCents,
                commission_final_cents: commissionCents,
                agency_revenue_cents: commissionCents,
                expected_receipt_cents: commissionCents,
                receivable_status:
                  (item.statusPagto || "").toLowerCase().includes("liquidado")
                    ? "recebido"
                    : "a_receber",
                general_notes: `Sync ${itemOpCode.toUpperCase()} #${item.id} | Pagto: ${item.formaPagto || "N/A"} (${item.parcelamento || "1x"}) | Banco: ${item.bancoEmissor || "Operadora"}`,
              });
            if (sheetErr) {
              errors.push({
                id: item.id,
                reason: `travel_sale_financial_sheets: ${sheetErr.message}`,
              });
            }
          }
        }
      }

      totalPaxCount += Math.max(1, (item.passageiros || []).length);
    } catch (err: any) {
      errors.push({ id: item.id, reason: err?.message || "Erro inesperado na reconciliação" });
    }
  }

  await supabase
    .from("travel_operator_integrations")
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", input.storeId)
    .eq("provider_code", defaultOpCode);

  return {
    success: errors.length === 0 || processedCount > 0 || reconciledTripsCount > 0,
    operatorCode: defaultOpCode,
    totalReceived: input.items.length,
    newProcessed: processedCount,
    reconciledTripsCount,
    reconciledCustomersCount,
    totalPax: totalPaxCount,
    errors,
    timestamp: new Date().toISOString(),
  };
}
