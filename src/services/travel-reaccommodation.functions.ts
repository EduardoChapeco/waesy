import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { analyzeFlightDifferences } from '@/lib/tourism/flight-connections';
import type {
  TravelFlightChangeCase,
  ChangeReason,
  AnacRightsSummary,
} from '@/types/travel-reaccommodation';

export function calculateAnacRights(reason: ChangeReason, delayHours: number = 0): AnacRightsSummary {
  const isDelayOrCancelled = reason === 'flight_cancelled' || reason === 'delay_over_4h' || delayHours >= 4;
  return {
    material_assistance: {
      communication: delayHours >= 1 || isDelayOrCancelled,
      food_voucher: delayHours >= 2 || isDelayOrCancelled,
      lodging_and_transfer: delayHours >= 4 || isDelayOrCancelled,
    },
    reaccommodation_options: {
      airline_own_flights: true,
      competitor_flights: isDelayOrCancelled || reason === 'overbooking',
      full_refund_eligible: isDelayOrCancelled || reason === 'schedule_change',
    },
  };
}

export const listFlightChangeCases = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      tripId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ data }): Promise<TravelFlightChangeCase[]> => {
    const identity = await getServerIdentity();
    const effectiveStoreId = data?.storeId || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Identificador da loja não fornecido.");
    }

    const db = getServerClient();
    let query = db
      .from('travel_flight_change_cases')
      .select(`
        *,
        alternatives:travel_flight_alternatives(*)
      `)
      .eq('store_id', effectiveStoreId)
      .order('created_at', { ascending: false });

    if (data?.tripId) {
      query = query.eq('trip_id', data.tripId);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao carregar casos de reacomodação: ${error.message}`);
    return (rows as any[]) || [];
  });

export const createFlightChangeCase = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      trip_id: z.string().uuid().optional().nullable(),
      original_itinerary_id: z.string().uuid().optional().nullable(),
      change_reason: z.enum([
        'schedule_change',
        'flight_cancelled',
        'delay_over_4h',
        'connection_lost',
        'overbooking',
      ]),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      passenger_notes: z.string().optional().nullable(),
      internal_notes: z.string().optional().nullable(),
      delay_hours: z.number().default(0),
    })
  )
  .handler(async ({ data }): Promise<TravelFlightChangeCase> => {
    const identity = await getServerIdentity();
    const effectiveStoreId = data.store_id || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Identificador da loja não fornecido.");
    }
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);

    const db = getServerClient();
    const rights = calculateAnacRights(data.change_reason as ChangeReason, data.delay_hours);

    const { data: row, error } = await db
      .from('travel_flight_change_cases')
      .insert({
        store_id: effectiveStoreId,
        trip_id: data.trip_id,
        original_itinerary_id: data.original_itinerary_id,
        change_reason: data.change_reason,
        priority: data.priority,
        workflow_status: 'pending_analysis',
        passenger_notes: data.passenger_notes,
        internal_notes: data.internal_notes,
        anac_rights_summary: rights as any,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao abrir caso de reacomodação: ${error.message}`);
    return row as any;
  });

export const updateChangeCaseWorkflow = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      workflow_status: z.enum([
        'pending_analysis',
        'alternatives_sent',
        'client_accepted',
        'client_rejected',
        'rebooking_confirmed',
        'refund_requested',
        'closed',
      ]),
      internal_notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Autenticação obrigatória.");
    }

    const db = getServerClient();

    // Valida se o caso pertence à loja gerenciada ou ao viajante titular em caso de aceite/recusa
    const { data: flightCase, error: fetchErr } = await db
      .from('travel_flight_change_cases')
      .select('id, store_id, trip_id')
      .eq('id', data.id)
      .single();

    if (fetchErr || !flightCase) {
      throw new Error("Caso de reacomodação não encontrado.");
    }

    const isStaff =
      identity.role === "platform_admin" ||
      (identity.role !== "customer" &&
        ['owner', 'admin', 'manager', 'seller'].includes(String(identity.role || '')) &&
        flightCase.store_id === identity.store_id);

    if (!isStaff) {
      const isClientDecision =
        data.workflow_status === 'client_accepted' || data.workflow_status === 'client_rejected';
      if (!isClientDecision || !flightCase.trip_id) {
        throw new Error("Acesso não autorizado para atualizar caso de reacomodação.");
      }
      const { data: tripRow } = await db
        .from('tourism_trips')
        .select('id, customer_id, client_email')
        .eq('id', flightCase.trip_id)
        .maybeSingle();
      if (!tripRow) {
        throw new Error("Acesso não autorizado para esta loja.");
      }
      const userEmail = String(identity.email || '').trim().toLowerCase();
      const ownsTrip =
        tripRow.customer_id === identity.id ||
        (Boolean(userEmail) && String(tripRow.client_email || '').trim().toLowerCase() === userEmail);
      if (!ownsTrip) {
        throw new Error("Acesso não autorizado para esta loja.");
      }
    }

    const { error } = await db
      .from('travel_flight_change_cases')
      .update({
        workflow_status: data.workflow_status,
        internal_notes: data.internal_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) throw new Error(`Erro ao atualizar caso: ${error.message}`);
    return { success: true };
  });

export const createFlightAlternative = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      changeCaseId: z.string().uuid(),
      itineraryId: z.string().uuid().optional().nullable(),
      source: z.enum(['manual', 'operator', 'ai']).default('manual'),
      differenceSummary: z.string().max(1000).optional().nullable(),
      costDifference: z.number().default(0),
      isSelected: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const { changeCaseId, itineraryId, source, differenceSummary, costDifference, isSelected } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);
    const db = getServerClient();

    const { data: flightCase, error: caseErr } = await db
      .from('travel_flight_change_cases')
      .select('id, store_id, original_itinerary_id')
      .eq('id', changeCaseId)
      .maybeSingle();

    if (caseErr || !flightCase) {
      throw new Error('Caso de reacomodação não encontrado.');
    }
    if (flightCase.store_id !== identity.store_id && identity.role !== 'platform_admin') {
      throw new Error('Acesso não autorizado para esta loja.');
    }

    let computedSummary = differenceSummary ?? null;
    if (!computedSummary && flightCase.original_itinerary_id && itineraryId) {
      const [origRes, altRes] = await Promise.all([
        db
          .from('travel_flight_segments')
          .select('*')
          .eq('itinerary_id', flightCase.original_itinerary_id)
          .eq('store_id', flightCase.store_id),
        db
          .from('travel_flight_segments')
          .select('*')
          .eq('itinerary_id', itineraryId)
          .eq('store_id', flightCase.store_id),
      ]);
      if (origRes.data?.length && altRes.data?.length) {
        const diff = analyzeFlightDifferences(origRes.data as any[], altRes.data as any[]);
        computedSummary = diff.deterministic_summary;
      }
    }

    const { data: created, error: insErr } = await db
      .from('travel_flight_alternatives')
      .insert({
        store_id: flightCase.store_id,
        change_case_id: changeCaseId,
        itinerary_id: itineraryId ?? null,
        source,
        is_selected: isSelected,
        difference_summary: computedSummary,
        cost_difference: costDifference,
      })
      .select()
      .single();

    if (insErr) {
      throw new Error(`Erro ao adicionar alternativa de voo: ${insErr.message}`);
    }
    return created;
  });

export const selectFlightAlternative = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      alternativeId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const { alternativeId } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);
    const db = getServerClient();

    const { data: alt, error: altErr } = await db
      .from('travel_flight_alternatives')
      .select('id, store_id, change_case_id')
      .eq('id', alternativeId)
      .maybeSingle();

    if (altErr || !alt) {
      throw new Error('Alternativa de voo não encontrada.');
    }
    if (alt.store_id !== identity.store_id && identity.role !== 'platform_admin') {
      throw new Error('Acesso não autorizado para esta loja.');
    }

    const { error: resetErr } = await db
      .from('travel_flight_alternatives')
      .update({ is_selected: false, updated_at: new Date().toISOString() })
      .eq('change_case_id', alt.change_case_id)
      .eq('store_id', alt.store_id);
    if (resetErr) {
      throw new Error(`Erro ao desmarcar alternativas anteriores: ${resetErr.message}`);
    }

    const { data: updated, error: selErr } = await db
      .from('travel_flight_alternatives')
      .update({ is_selected: true, updated_at: new Date().toISOString() })
      .eq('id', alt.id)
      .eq('store_id', alt.store_id)
      .select()
      .single();
    if (selErr) {
      throw new Error(`Erro ao selecionar alternativa de voo: ${selErr.message}`);
    }

    return updated;
  });

export const resolveChangeCaseWithItinerary = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      caseId: z.string().uuid(),
      confirmedItineraryId: z.string().uuid().optional().nullable(),
      notes: z.string().max(1000).optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const { caseId, confirmedItineraryId, notes } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);
    const db = getServerClient();

    const { data: flightCase, error: caseErr } = await db
      .from('travel_flight_change_cases')
      .select('id, store_id, original_itinerary_id')
      .eq('id', caseId)
      .maybeSingle();

    if (caseErr || !flightCase) {
      throw new Error('Caso de reacomodação não encontrado.');
    }
    if (flightCase.store_id !== identity.store_id && identity.role !== 'platform_admin') {
      throw new Error('Acesso não autorizado para esta loja.');
    }

    if (confirmedItineraryId) {
      if (flightCase.original_itinerary_id && flightCase.original_itinerary_id !== confirmedItineraryId) {
        const { error: archErr } = await db
          .from('travel_flight_itineraries')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', flightCase.original_itinerary_id)
          .eq('store_id', flightCase.store_id);
        if (archErr) {
          throw new Error(`Erro ao arquivar itinerário original: ${archErr.message}`);
        }
      }

      const { error: actErr } = await db
        .from('travel_flight_itineraries')
        .update({ status: 'active', itinerary_type: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', confirmedItineraryId)
        .eq('store_id', flightCase.store_id);
      if (actErr) {
        throw new Error(`Erro ao ativar itinerário confirmado: ${actErr.message}`);
      }
    }

    const patch: Record<string, any> = {
      workflow_status: 'rebooking_confirmed',
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined && notes !== null) {
      patch.internal_notes = notes;
    }

    const { error: resolveErr } = await db
      .from('travel_flight_change_cases')
      .update(patch)
      .eq('id', caseId)
      .eq('store_id', flightCase.store_id);

    if (resolveErr) {
      throw new Error(`Erro ao resolver caso de reacomodação: ${resolveErr.message}`);
    }

    return { success: true, caseId, confirmedItineraryId: confirmedItineraryId ?? null };
  });
