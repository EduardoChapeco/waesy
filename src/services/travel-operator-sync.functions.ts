import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireManager, requireStaff } from "@/lib/server-access";
import { normalizeOperatorDocument, OperatorCodeSchema } from "@/lib/travel-operator-sync";

const IntegrationInputSchema = z.object({
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
    const identity = await requireManager();
    const supabase = getServerClient();
    const { data: row, error } = await supabase
      .from("travel_operator_integrations")
      .upsert(
        {
          store_id: identity.store_id,
          supplier_id: data.supplierId || null,
          provider_code: data.providerCode,
          display_name: data.displayName,
          adapter_kind: "document",
          adapter_version: "travel-operator-v1",
          capabilities: data.capabilities,
          config_payload: data.config,
          status: data.status,
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

export const listTravelOperatorSyncRuns = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .default({}),
  )
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    let query = supabase
      .from("travel_operator_sync_runs")
      .select(
        "id, source_ingestion_id, source_kind, operator_code, adapter_version, status, error_message, created_at, completed_at",
      )
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Não foi possível listar sincronizações: ${error.message}`);
    return rows || [];
  });

export const syncTravelDocumentToOperatorCanonical = createServerFn({ method: "POST" })
  .validator(z.object({ ingestionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const { data: ingestion, error: ingestionError } = await supabase
      .from("travel_document_ingestions")
      .select("id, store_id, source_kind, extraction, extraction_status, review_status")
      .eq("id", data.ingestionId)
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
