import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireManager, requireStaff } from "@/lib/server-access";
import { normalizeOperatorDocument, OperatorCodeSchema } from "@/lib/travel-operator-sync";

export const IntegrationInputSchema = z.object({
  providerCode: OperatorCodeSchema,
  displayName: z.string().trim().min(2).max(120),
  supplierId: z.string().uuid().optional().nullable(),
  capabilities: z.record(z.boolean()).default({}),
  config: z.record(z.string()).default({}),
  status: z.enum(["active", "paused", "error"]).default("active"),
});

export const listTravelOperatorIntegrations = createServerFn({ method: "GET" }).handler(
  async () => {
    const identity = await requireManager();
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("travel_operator_integrations")
      .select(
        "id, provider_code, display_name, supplier_id, adapter_kind, adapter_version, capabilities, status, last_sync_at, updated_at",
      )
      .eq("store_id", identity.store_id)
      .order("display_name");
    if (error) throw new Error(`Não foi possível listar operadoras: ${error.message}`);
    return data || [];
  },
);

export const saveTravelOperatorIntegration = createServerFn({ method: "POST" })
  .validator(IntegrationInputSchema)
  .handler(async ({ data }) => {
    const {
      providerCode,
      displayName,
      supplierId = null,
      capabilities = {},
      config = {},
      status = "active",
    } = data ?? {};
    const identity = await requireManager();
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("travel_operator_integrations")
      .upsert(
        {
          store_id: identity.store_id,
          supplier_id: supplierId || null,
          provider_code: providerCode,
          display_name: displayName,
          adapter_kind: "document",
          adapter_version: "travel-operator-v1",
          capabilities: capabilities,
          config_payload: config,
          status: status,
          created_by_profile_id: identity.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,provider_code" },
      )
      .select(
        "id, provider_code, display_name, supplier_id, adapter_kind, adapter_version, capabilities, status, last_sync_at, updated_at",
      )
      .single();
    if (error) throw new Error(`Não foi possível salvar a operadora: ${error.message}`);
    return row;
  });

export const ListTravelOperatorSyncRunsSchema = z
  .object({
    status: z.string().optional(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({});

export const listTravelOperatorSyncRuns = createServerFn({ method: "GET" })
  .validator(ListTravelOperatorSyncRunsSchema)
  .handler(async ({ data }) => {
    const { status = undefined, limit = 100 } = data ?? {};
    const identity = await requireStaff();
    const supabase = getServerClient();
    let query = supabase
      .from("travel_operator_sync_runs")
      .select(
        "id, source_ingestion_id, source_kind, operator_code, adapter_version, status, error_message, created_at, completed_at",
      )
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Não foi possível listar sincronizações: ${error.message}`);
    return rows || [];
  });

export const SyncTravelDocumentSchema = z.object({ ingestionId: z.string().uuid() });

export const syncTravelDocumentToOperatorCanonical = createServerFn({ method: "POST" })
  .validator(SyncTravelDocumentSchema)
  .handler(async ({ data }) => {
    const { ingestionId } = data ?? {};
    const identity = await requireStaff();
    const supabase = getServerClient();
    const { data: ingestion, error: ingestionError } = await supabase
      .from("travel_document_ingestions")
      .select("id, store_id, source_kind, extraction, extraction_status, review_status")
      .eq("id", ingestionId)
      .eq("store_id", identity.store_id)
      .single();
    if (ingestionError || !ingestion) throw new Error("Ingestão não encontrada nesta agência.");

    const canonical = normalizeOperatorDocument({
      sourceKind: ingestion.source_kind,
      ingestionId: ingestion.id,
      extraction: ingestion.extraction,
    });
    const idempotencyKey = `operator-sync:${identity.store_id}:${ingestion.id}`;
    const { data: existing } = await supabase
      .from("travel_operator_sync_runs")
      .select("id, status, operator_code, normalized_payload")
      .eq("store_id", identity.store_id)
      .eq("source_ingestion_id", ingestion.id)
      .maybeSingle();
    if (existing) return { success: true, replayed: true, run: existing };

    const { data: integration } = await supabase
      .from("travel_operator_integrations")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("provider_code", canonical.operator.code)
      .maybeSingle();

    const requiresReview =
      ingestion.extraction_status !== "approved" && ingestion.extraction_status !== "applied";
    const runStatus = requiresReview ? "review_required" : "ready";
    const { data: run, error: runError } = await supabase
      .from("travel_operator_sync_runs")
      .insert({
        store_id: identity.store_id,
        integration_id: integration?.id || null,
        source_ingestion_id: ingestion.id,
        source_kind: ingestion.source_kind,
        operator_code: canonical.operator.code,
        adapter_version: canonical.schema_version,
        idempotency_key: idempotencyKey,
        status: runStatus,
        normalized_payload: canonical,
        created_by_profile_id: identity.id,
        completed_at: new Date().toISOString(),
      })
      .select("id, status, operator_code, normalized_payload, created_at, completed_at")
      .single();
    if (runError || !run)
      throw new Error(
        `Não foi possível registrar a sincronização: ${runError?.message || "run ausente"}`,
      );

    const { error: ingestionUpdateError } = await supabase
      .from("travel_document_ingestions")
      .update({
        operator_code: canonical.operator.code,
        normalized_payload: canonical,
        canonical_status: runStatus,
        sync_run_id: run.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ingestion.id)
      .eq("store_id", identity.store_id);
    if (ingestionUpdateError)
      throw new Error(
        `Sincronização criada, mas ingestão não atualizada: ${ingestionUpdateError.message}`,
      );

    await supabase.from("travel_timeline_events").insert({
      store_id: identity.store_id,
      lead_id: null,
      proposal_id: null,
      budget_id: null,
      sale_id: null,
      trip_id: null,
      event_type: "operator.document_synchronized",
      actor_profile_id: identity.id,
      correlation_id: idempotencyKey,
      payload: {
        run_id: run.id,
        ingestion_id: ingestion.id,
        operator_code: canonical.operator.code,
        status: runStatus,
      },
    });

    return { success: true, replayed: false, run };
  });

export const IngestOperatorSyncBatchSchema = z.object({
  operatorCode: OperatorCodeSchema,
  items: z.array(
    z.object({
      id: z.string().min(1),
      status: z.string().default("Confirmada"),
      criacao: z.string().optional().default(""),
      valorTotal: z.string().optional().default("0,00"),
      taxas: z.string().optional().default("0,00"),
      impostos: z.string().optional().default("0,00"),
      comissao: z.string().optional().default("0,00"),
      contato: z.string().optional().default(""),
      email: z.string().optional().default(""),
      telefone: z.string().optional().default(""),
      hotel: z.string().optional().default(""),
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
            cpf: z.string().optional().default(""),
            titular: z.boolean().optional().default(false),
          }),
        )
        .default([]),
    }),
  ),
});

export const ingestOperatorSyncBatch = createServerFn({ method: "POST" })
  .validator(IngestOperatorSyncBatchSchema)
  .handler(async ({ data }) => {
    const { operatorCode, items = [] } = data ?? {};
    const identity = await requireStaff();
    const supabase = getServerClient();

    let processedCount = 0;
    let totalPaxCount = 0;
    let reconciledTripsCount = 0;
    let reconciledCustomersCount = 0;

    const parseBrlToCents = (raw: string | undefined): number => {
      if (!raw) return 0;
      const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const val = Number.parseFloat(cleaned);
      return Number.isFinite(val) ? Math.round(val * 100) : 0;
    };

    for (const item of items) {
      const idempotencyKey = `operator-batch:${identity.store_id}:${operatorCode}:${item.id}`;

      // Verifica se já foi sincronizado
      const { data: existing } = await supabase
        .from("travel_operator_sync_runs")
        .select("id")
        .eq("store_id", identity.store_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      const normalizedPayload = {
        schema_version: "travel-operator-v1",
        operator: { code: operatorCode },
        reservation: item,
        ingested_at: new Date().toISOString(),
      };

      if (!existing) {
        await supabase.from("travel_operator_sync_runs").insert({
          store_id: identity.store_id,
          operator_code: operatorCode,
          source_kind: "browser_extension",
          adapter_version: "travel-operator-v1",
          idempotency_key: idempotencyKey,
          status: "ready",
          normalized_payload: normalizedPayload,
          created_by_profile_id: identity.id,
          completed_at: new Date().toISOString(),
        });
        processedCount++;
      }

      // Reconciliação Canônica End-to-End: Cliente -> Viagem -> Passageiros -> Embarque -> Ficha Financeira
      const titularPax = (item.passageiros || []).find((p) => p.titular) || item.passageiros?.[0];
      const customerName = (item.contato || titularPax?.nome || `Cliente Reserva #${item.id}`).trim();
      const customerEmail = (item.email || "").trim() || null;
      const customerPhone = (item.telefone || "").trim() || null;
      const customerCpf = (titularPax?.cpf || "").replace(/\D/g, "") || null;

      let customerId: string | null = null;
      if (customerCpf || customerEmail || customerPhone) {
        const filters: string[] = [];
        if (customerCpf) filters.push(`cpf_cnpj.eq.${customerCpf}`);
        if (customerEmail) filters.push(`email.eq.${customerEmail}`);
        if (customerPhone) filters.push(`phone.eq.${customerPhone}`);

        const { data: foundCustomer } = await supabase
          .from("customers_crm")
          .select("id")
          .eq("store_id", identity.store_id)
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
            store_id: identity.store_id,
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            cpf_cnpj: customerCpf,
            notes: `Importado via sincronização ${operatorCode.toUpperCase()} (Reserva #${item.id})`,
          })
          .select("id")
          .maybeSingle();
        if (newCust?.id) {
          customerId = newCust.id;
          reconciledCustomersCount++;
        }
      }

      const totalCents = parseBrlToCents(item.valorTotal);
      const commissionCents = parseBrlToCents(item.comissao);
      const netCostCents = Math.max(0, totalCents - commissionCents);
      const tripTitle = item.hotel
        ? `${item.hotel} (#${item.id})`
        : `Reserva ${operatorCode.toUpperCase()} #${item.id}`;

      // Verifica se já existe viagem reconciliada para esta reserva
      const { data: existingTrip } = await supabase
        .from("tourism_trips")
        .select("id")
        .eq("store_id", identity.store_id)
        .ilike("title", `%#${item.id}%`)
        .limit(1)
        .maybeSingle();

      let tripId = existingTrip?.id || null;
      const departureIso = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const returnIso = new Date(Date.now() + 19 * 86400000).toISOString().slice(0, 10);

      if (!tripId) {
        const { data: createdTrip } = await supabase
          .from("tourism_trips")
          .insert({
            store_id: identity.store_id,
            title: tripTitle,
            destination: item.hotel || operatorCode.toUpperCase(),
            departure_date: departureIso,
            return_date: returnIso,
            status: item.status?.toLowerCase().includes("cancel") ? "cancelled" : "confirmed",
            total_price_cents: totalCents,
            notes: `Reserva ${operatorCode.toUpperCase()} #${item.id} | Acomodação: ${item.acomodacao || "Padrão"} | Pagto: ${item.formaPagto || "N/A"} (${item.parcelamento || "1x"})`,
          })
          .select("id")
          .maybeSingle();

        if (createdTrip?.id) {
          tripId = createdTrip.id;
          reconciledTripsCount++;

          // Insere passageiros na viagem
          if (item.passageiros && item.passageiros.length > 0) {
            const paxRows = item.passageiros.map((pax) => ({
              store_id: identity.store_id,
              trip_id: tripId,
              full_name: pax.nome,
              document_number: pax.cpf || null,
              birth_date: pax.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(pax.birthDate) ? pax.birthDate : null,
              passenger_type: pax.tipo?.toUpperCase() === "CHD" ? "child" : pax.tipo?.toUpperCase() === "INF" ? "infant" : "adult",
              boarding_status: "pending",
            }));
            await supabase.from("trip_passengers").insert(paxRows);
          }

          // Garante card no Kanban de Embarques D-X
          await supabase.from("travel_departures_kanban").insert({
            store_id: identity.store_id,
            trip_id: tripId,
            customer_id: customerId,
            passenger_name: customerName,
            destination: item.hotel || operatorCode.toUpperCase(),
            departure_date: departureIso,
            return_date: returnIso,
            stage: "d_30_docs",
            pnr_locator: item.id,
            voucher_emitted: item.statusPagto?.toLowerCase().includes("aprovado") ?? false,
          });

          // Garante Ficha Financeira da Reserva (Gross / Net / Markup / Comissão)
          if (totalCents > 0) {
            await supabase.from("travel_sale_financial_sheets").insert({
              store_id: identity.store_id,
              trip_id: tripId,
              customer_id: customerId,
              description: tripTitle,
              gross_sale_cents: totalCents,
              supplier_net_cost_cents: netCostCents,
              agency_commission_cents: commissionCents,
              status: item.statusPagto?.toLowerCase().includes("aprovado") ? "settled" : "open",
              currency: "BRL",
            });
          }
        }
      }

      totalPaxCount += (item.passageiros || []).length;
    }

    // Atualiza last_sync_at da operadora
    await supabase
      .from("travel_operator_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", identity.store_id)
      .eq("provider_code", operatorCode);

    return {
      success: true,
      operatorCode,
      totalReceived: items.length,
      newProcessed: processedCount,
      reconciledTripsCount,
      reconciledCustomersCount,
      totalPax: totalPaxCount,
      timestamp: new Date().toISOString(),
    };
  });

