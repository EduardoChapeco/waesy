import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { calculateAnacRights } from './travel-reaccommodation.functions';

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export type TourismIncidentType =
  | 'flight_change'
  | 'flight_cancellation'
  | 'overbooking'
  | 'connection_lost'
  | 'schedule_change'
  | 'hotel_issue'
  | 'transfer_delay'
  | 'visa_issue'
  | 'other';

export type TourismIncidentStatus =
  | 'open'
  | 'in_analysis'
  | 'awaiting_airline'
  | 'awaiting_client'
  | 'resolved'
  | 'closed';

export type TourismIncidentPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TourismEventType =
  | 'opened'
  | 'status_change'
  | 'airline_contact'
  | 'client_contact'
  | 'anac_rights_sent'
  | 'rebooking_offer'
  | 'client_accepted'
  | 'client_rejected'
  | 'protocol_received'
  | 'refund_initiated'
  | 'resolved'
  | 'note';

export interface TourismIncidentItem {
  id: string;
  store_id: string;
  opened_by_profile_id: string | null;
  incident_type: TourismIncidentType;
  priority: TourismIncidentPriority;
  status: TourismIncidentStatus;
  passenger_name: string | null;
  passenger_contact: string | null;
  booking_reference: string | null;
  trip_id: string | null;
  flight_change_case_id: string | null;
  airline_protocol_number: string | null;
  airline_code: string | null;
  origin_flight_number: string | null;
  anac_rights_summary: Record<string, any>;
  description: string | null;
  internal_notes: string | null;
  resolution_type: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  events?: TourismIncidentEvent[];
}

export interface TourismIncidentEvent {
  id: string;
  incident_id: string;
  created_by_profile_id: string | null;
  event_type: TourismEventType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Determinar se o tipo de incidente é de voo (para calcular direitos ANAC)
function isFlightIncident(type: TourismIncidentType): boolean {
  return ['flight_change', 'flight_cancellation', 'overbooking', 'connection_lost', 'schedule_change'].includes(type);
}

// Mapear tipo de incidente para tipo de mudança ANAC
function mapIncidentTypeToAnacReason(type: TourismIncidentType): string {
  switch (type) {
    case 'flight_cancellation': return 'flight_cancelled';
    case 'overbooking': return 'overbooking';
    case 'connection_lost': return 'connection_lost';
    case 'schedule_change': return 'schedule_change';
    default: return 'schedule_change';
  }
}

export const INCIDENT_TYPE_LABELS: Record<TourismIncidentType, string> = {
  flight_change: 'Alteração de Voo',
  flight_cancellation: 'Cancelamento de Voo',
  overbooking: 'Preterição (Overbooking)',
  connection_lost: 'Perda de Conexão',
  schedule_change: 'Alteração de Malha Programada',
  hotel_issue: 'Problema de Hotel',
  transfer_delay: 'Atraso em Transfer',
  visa_issue: 'Problema com Visto',
  other: 'Outro Incidente',
};

export const INCIDENT_STATUS_LABELS: Record<TourismIncidentStatus, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'bg-warning/10 text-warning-strong border-warning/30 ' },
  in_analysis: { label: 'Em Análise', className: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-400' },
  awaiting_airline: { label: 'Aguardando CIA', className: 'bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400' },
  awaiting_client: { label: 'Aguardando Cliente', className: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400' },
  resolved: { label: 'Resolvido', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' },
  closed: { label: 'Encerrado', className: 'bg-muted text-muted-foreground border-border' },
};

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const CreateIncidentSchema = z.object({
  store_id: z.string().uuid(),
  incident_type: z.enum([
    'flight_change', 'flight_cancellation', 'overbooking', 'connection_lost',
    'schedule_change', 'hotel_issue', 'transfer_delay', 'visa_issue', 'other',
  ]),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  passenger_name: z.string().min(1).optional().nullable(),
  passenger_contact: z.string().optional().nullable(),
  booking_reference: z.string().optional().nullable(),
  trip_id: z.string().uuid().optional().nullable(),
  flight_change_case_id: z.string().uuid().optional().nullable(),
  airline_protocol_number: z.string().optional().nullable(),
  airline_code: z.string().optional().nullable(),
  origin_flight_number: z.string().optional().nullable(),
  description: z.string().min(3, 'Descreva o incidente'),
  internal_notes: z.string().optional().nullable(),
  delay_hours: z.number().default(0), // para cálculo de direitos ANAC
});

const AddEventSchema = z.object({
  incident_id: z.string().uuid(),
  event_type: z.enum([
    'opened', 'status_change', 'airline_contact', 'client_contact',
    'anac_rights_sent', 'rebooking_offer', 'client_accepted', 'client_rejected',
    'protocol_received', 'refund_initiated', 'resolved', 'note',
  ]),
  description: z.string().min(2, 'Descrição do evento obrigatória'),
  metadata: z.record(z.any()).optional().default({}),
});

const UpdateStatusSchema = z.object({
  incident_id: z.string().uuid(),
  status: z.enum(['open', 'in_analysis', 'awaiting_airline', 'awaiting_client', 'resolved', 'closed']),
  resolution_type: z.enum(['rebooking', 'refund', 'voucher', 'upgrade', 'no_action', 'other']).optional().nullable(),
  note: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listTourismIncidents = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      store_id: z.string().uuid(),
      status: z.string().optional(),
      incident_type: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<TourismIncidentItem[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    let query = db
      .from('tourism_incident_tickets')
      .select('*')
      .eq('store_id', data.store_id)
      .order('created_at', { ascending: false });

    if (data.status && data.status !== 'all') {
      query = query.eq('status', data.status);
    }
    if (data.incident_type && data.incident_type !== 'all') {
      query = query.eq('incident_type', data.incident_type);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao listar incidentes: ${error.message}`);
    return (rows || []) as TourismIncidentItem[];
  });

export const getIncidentDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ incident_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();

    const { data: incident, error: iErr } = await db
      .from('tourism_incident_tickets')
      .select('*')
      .eq('id', data.incident_id)
      .single();

    if (iErr || !incident) throw new Error('Incidente não encontrado.');
    if (incident.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error('Acesso não autorizado a este incidente.');
    }

    const { data: events, error: eErr } = await db
      .from('tourism_incident_events')
      .select('*')
      .eq('incident_id', data.incident_id)
      .order('created_at', { ascending: true });

    if (eErr) throw new Error(`Erro ao carregar eventos: ${eErr.message}`);

    return {
      incident: incident as TourismIncidentItem,
      events: (events || []) as TourismIncidentEvent[],
    };
  });

export const createTourismIncident = createServerFn({ method: 'POST' })
  .validator(CreateIncidentSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();

    // Calcular direitos ANAC se for incidente de voo
    let anacRights: Record<string, any> = {};
    if (isFlightIncident(data.incident_type)) {
      const anacReason = mapIncidentTypeToAnacReason(data.incident_type) as any;
      anacRights = calculateAnacRights(anacReason, data.delay_hours || 0) as any;
    }

    // 1. Criar o ticket
    const { data: incident, error: iErr } = await db
      .from('tourism_incident_tickets')
      .insert({
        store_id: data.store_id,
        opened_by_profile_id: identity.id,
        incident_type: data.incident_type,
        priority: data.priority,
        status: 'open',
        passenger_name: data.passenger_name || null,
        passenger_contact: data.passenger_contact || null,
        booking_reference: data.booking_reference || null,
        trip_id: data.trip_id || null,
        flight_change_case_id: data.flight_change_case_id || null,
        airline_protocol_number: data.airline_protocol_number || null,
        airline_code: data.airline_code || null,
        origin_flight_number: data.origin_flight_number || null,
        anac_rights_summary: anacRights,
        description: data.description,
        internal_notes: data.internal_notes || null,
      })
      .select()
      .single();

    if (iErr) throw new Error(`Erro ao abrir incidente: ${iErr.message}`);

    // 2. Inserir evento inicial na timeline
    await db.from('tourism_incident_events').insert({
      incident_id: incident.id,
      created_by_profile_id: identity.id,
      event_type: 'opened',
      description: data.description,
      metadata: {
        incident_type: data.incident_type,
        priority: data.priority,
        passenger_name: data.passenger_name,
        booking_reference: data.booking_reference,
        anac_rights_calculated: isFlightIncident(data.incident_type),
      },
    });

    return incident as TourismIncidentItem;
  });

export const addIncidentEvent = createServerFn({ method: 'POST' })
  .validator(AddEventSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();

    const { data: incident, error: iErr } = await db
      .from('tourism_incident_tickets')
      .select('store_id')
      .eq('id', data.incident_id)
      .single();

    if (iErr || !incident) throw new Error('Incidente não encontrado.');
    if (incident.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error('Acesso não autorizado a este incidente.');
    }

    const { data: event, error } = await db
      .from('tourism_incident_events')
      .insert({
        incident_id: data.incident_id,
        created_by_profile_id: identity.id,
        event_type: data.event_type,
        description: data.description,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao registrar evento: ${error.message}`);

    // Atualizar updated_at do ticket pai
    await db
      .from('tourism_incident_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.incident_id);

    return event as TourismIncidentEvent;
  });

export const updateIncidentStatus = createServerFn({ method: 'POST' })
  .validator(UpdateStatusSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();

    const { data: existing, error: fetchErr } = await db
      .from('tourism_incident_tickets')
      .select('store_id')
      .eq('id', data.incident_id)
      .single();

    if (fetchErr || !existing) throw new Error('Incidente não encontrado.');
    if (existing.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error('Acesso não autorizado a este incidente.');
    }

    const updatePayload: Record<string, any> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.resolution_type) {
      updatePayload.resolution_type = data.resolution_type;
    }

    if (data.status === 'resolved' || data.status === 'closed') {
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { data: updated, error } = await db
      .from('tourism_incident_tickets')
      .update(updatePayload)
      .eq('id', data.incident_id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);

    // Registrar evento de mudança de status na timeline
    const statusLabels: Record<string, string> = {
      open: 'Aberto',
      in_analysis: 'Em Análise',
      awaiting_airline: 'Aguardando CIA Aérea',
      awaiting_client: 'Aguardando Cliente',
      resolved: 'Resolvido',
      closed: 'Encerrado',
    };

    await db.from('tourism_incident_events').insert({
      incident_id: data.incident_id,
      created_by_profile_id: identity.id,
      event_type: data.status === 'resolved' ? 'resolved' : 'status_change',
      description: data.note || `Status atualizado para: ${statusLabels[data.status] || data.status}`,
      metadata: {
        new_status: data.status,
        resolution_type: data.resolution_type || null,
      },
    });

    return updated as TourismIncidentItem;
  });
