import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import {
  resolveTravelDocumentConflicts,
  type ConflictSource,
  type TravelDocumentKind,
} from "@/lib/travel-document-conflicts";

const AnalyzeInputSchema = z.object({
  ingestionIds: z.array(z.string().uuid()).min(2).max(20),
  tripId: z.string().uuid().optional().nullable(),
  operationKey: z.string().trim().max(160).optional().nullable(),
});

const ListInputSchema = z.object({
  tripId: z.string().uuid().optional().nullable(),
  status: z.enum(["open", "suggested", "resolved", "dismissed", "all"]).default("open"),
});

const ResolveInputSchema = z.object({
  conflictId: z.string().uuid(),
  resolutionType: z.enum(["source", "custom", "dismiss"]),
  sourceIngestionId: z.string().uuid().optional().nullable(),
  resolvedValue: z.any().optional(),
  note: z.string().trim().max(2000).optional().nullable(),
});

const BatchResolveInputSchema = z.object({
  runId: z.string().uuid(),
  resolutions: z
    .array(ResolveInputSchema.omit({ conflictId: true }).extend({ conflictId: z.string().uuid() }))
    .min(1)
    .max(100),
});

export const analyzeTravelDocumentConflicts = createServerFn({ method: "POST" })
  .validator(AnalyzeInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const { ingestionIds, tripId, operationKey } = data;
    const reconciliationKey =
      operationKey || `reconciliation:${ingestionIds.slice().sort().join(":")}`;
    const { data: rows, error } = await supabase
      .from("travel_document_ingestions")
      .select("id, source_kind, extraction, created_at, file_name, content_sha256")
      .eq("store_id", identity.store_id)
      .in("id", ingestionIds);
    if (error) throw new Error(`Não foi possível carregar as fontes documentais: ${error.message}`);
    if (!rows || rows.length !== ingestionIds.length)
      throw new Error("Uma ou mais fontes não pertencem a esta agência.");

    const sources: ConflictSource[] = rows.map((row: any) => ({
      id: row.id,
      kind: row.source_kind as TravelDocumentKind,
      createdAt: row.created_at,
      extraction: row.extraction || {},
    }));
    const conflicts = resolveTravelDocumentConflicts(sources);

    const { data: run, error: runError } = await (
      supabase.from("travel_document_reconciliation_runs") as any
    )
      .upsert(
        {
          store_id: identity.store_id,
          trip_id: tripId || null,
          operation_key: reconciliationKey,
          source_ingestion_ids: ingestionIds,
          resolver_version: "travel-conflicts-v2",
          updated_at: new Date().toISOString(),
          created_by_profile_id: identity.id,
        },
        { onConflict: "store_id,operation_key" },
      )
      .select(
        "id, status, conflict_count, unresolved_critical_count, resolver_version, created_at, updated_at",
      )
      .single();
    if (runError || !run)
      throw new Error(
        `Reconciliação identificada, mas não persistida: ${runError?.message || "run ausente"}`,
      );

    if (conflicts.length) {
      const fingerprints = conflicts.map((conflict) => conflict.fingerprint);
      const { data: previousRows } = await (supabase.from("travel_document_conflicts") as any)
        .select("fingerprint, status")
        .eq("store_id", identity.store_id)
        .in("fingerprint", fingerprints);
      const previousStatus = new Map(
        (previousRows || []).map((row: { fingerprint: string; status: string }) => [
          row.fingerprint,
          row.status,
        ]),
      );
      const payload = conflicts.map((conflict) => ({
        store_id: identity.store_id,
        trip_id: tripId || null,
        operation_key: reconciliationKey,
        reconciliation_run_id: run.id,
        fingerprint: conflict.fingerprint,
        field_path: conflict.fieldPath,
        domain: conflict.domain,
        severity: conflict.severity,
        status: previousStatus.get(conflict.fingerprint) || conflict.status,
        suggested_source_id: conflict.suggestedSourceId,
        suggested_source_kind: conflict.suggestedSourceKind,
        precedence_rule: conflict.precedenceRule,
        suggestion_reason: conflict.suggestionReason,
        resolver_version: "travel-conflicts-v2",
        suggested_value: conflict.suggestedValue ?? null,
        candidates: conflict.candidates,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { error: upsertError } = await (
        supabase.from("travel_document_conflicts") as any
      ).upsert(payload, { onConflict: "store_id,fingerprint" });
      if (upsertError)
        throw new Error(`Conflitos identificados, mas não persistidos: ${upsertError.message}`);
    }

    const { data: refreshedRun, error: refreshError } = await supabase.rpc(
      "refresh_travel_document_reconciliation_run",
      {
        p_run_id: run.id,
        p_store_id: identity.store_id,
      },
    );
    if (refreshError)
      throw new Error(`Reconciliação persistida, mas não consolidada: ${refreshError.message}`);

    if (tripId) {
      await supabase.from("travel_timeline_events").insert({
        store_id: identity.store_id,
        trip_id: tripId,
        event_type: "documents.conflicts_analyzed",
        actor_profile_id: identity.id,
        correlation_id: `document-conflicts:${ingestionIds.slice().sort().join(":")}`,
        payload: {
          ingestion_ids: ingestionIds,
          conflict_count: conflicts.length,
          operation_key: operationKey || null,
        },
      });
    }
    return {
      success: true,
      run: refreshedRun || run,
      analyzedSources: sources.length,
      conflictCount: conflicts.length,
      conflicts: conflicts as any,
    } as any;
  });

export const listTravelDocumentConflicts = createServerFn({ method: "GET" })
  .validator(ListInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    let query = (supabase.from("travel_document_conflicts") as any)
      .select("*")
      .eq("store_id", identity.store_id)
      .order("severity", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.tripId) query = query.eq("trip_id", data.tripId);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: conflicts, error } = await query;
    if (error) throw new Error(`Não foi possível listar divergências: ${error.message}`);
    return conflicts || [];
  });

export const resolveTravelDocumentConflict = createServerFn({ method: "POST" })
  .validator(ResolveInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const { conflictId, resolutionType, sourceIngestionId, resolvedValue, note } = data;
    if (resolutionType === "source" && !sourceIngestionId)
      throw new Error("Escolha a fonte vencedora.");
    if (resolutionType === "custom" && resolvedValue === undefined)
      throw new Error("Informe o valor corrigido.");
    const { data: result, error } = await supabase.rpc(
      "record_travel_document_conflict_resolution",
      {
        p_conflict_id: conflictId,
        p_store_id: identity.store_id,
        p_resolution_type: resolutionType,
        p_source_ingestion_id: sourceIngestionId || null,
        p_resolved_value: resolvedValue === undefined ? null : resolvedValue,
        p_note: note || null,
        p_actor_profile_id: identity.id,
      },
    );
    if (error) throw new Error(`Não foi possível registrar a resolução: ${error.message}`);
    return result;
  });

export const resolveTravelDocumentConflictsBatch = createServerFn({ method: "POST" })
  .validator(BatchResolveInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const results = [];
    for (const resolution of data.resolutions) {
      const result = await supabase.rpc("record_travel_document_conflict_resolution", {
        p_conflict_id: resolution.conflictId,
        p_store_id: identity.store_id,
        p_resolution_type: resolution.resolutionType,
        p_source_ingestion_id: resolution.sourceIngestionId || null,
        p_resolved_value: resolution.resolvedValue === undefined ? null : resolution.resolvedValue,
        p_note: resolution.note || null,
        p_actor_profile_id: identity.id,
      });
      if (result.error)
        throw new Error(
          `Lote interrompido no conflito ${resolution.conflictId}: ${result.error.message}`,
        );
      results.push(result.data);
    }
    const { data: summary, error: refreshError } = await supabase.rpc(
      "refresh_travel_document_reconciliation_run",
      {
        p_run_id: data.runId,
        p_store_id: identity.store_id,
      },
    );
    if (refreshError)
      throw new Error(
        `Resoluções registradas, mas o resumo não foi atualizado: ${refreshError.message}`,
      );
    return { success: true, run: summary, results };
  });

export const getTravelDocumentReconciliation = createServerFn({ method: "GET" })
  .validator(z.object({ runId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const [
      { data: run, error: runError },
      { data: conflicts, error: conflictsError },
      { data: values, error: valuesError },
    ] = await Promise.all([
      (supabase.from("travel_document_reconciliation_runs") as any)
        .select("*")
        .eq("id", data.runId)
        .eq("store_id", identity.store_id)
        .single(),
      (supabase.from("travel_document_conflicts") as any)
        .select("*")
        .eq("reconciliation_run_id", data.runId)
        .eq("store_id", identity.store_id)
        .order("severity", { ascending: false }),
      (supabase.from("travel_document_reconciliation_values") as any)
        .select("*")
        .eq("reconciliation_run_id", data.runId)
        .eq("store_id", identity.store_id)
        .order("field_path"),
    ]);
    if (runError || !run) throw new Error("Reconciliação não encontrada nesta agência.");
    if (conflictsError || valuesError)
      throw new Error("Não foi possível carregar a projeção reconciliada.");
    return { run, conflicts: conflicts || [], values: values || [] };
  });
