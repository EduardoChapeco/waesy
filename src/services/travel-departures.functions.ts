import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerIdentity, assertStoreAccess } from '@/lib/identity.server';
import { getServerClient } from '@/lib/supabase';
import type { DepartureCardDTO, DepartureStage } from '@/types/travel-departures';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistCategory =
  | 'documentation' | 'health' | 'insurance' | 'financial'
  | 'logistics' | 'communication' | 'airline' | 'hotel' | 'custom';

export type DocumentType =
  | 'contract' | 'airline_ticket' | 'hotel_voucher' | 'insurance_policy'
  | 'passport_copy' | 'visa_stamp' | 'vaccine_card' | 'invoice'
  | 'transfer_voucher' | 'other';

export interface ChecklistItem {
  id: string;
  store_id: string;
  departure_id: string;
  category: ChecklistCategory;
  label: string;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  due_days_before: number | null;
  attachment_url: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BoardingDocument {
  id: string;
  store_id: string;
  departure_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  ocr_extracted_data: Record<string, any>;
  ocr_confidence: number | null;
  passenger_name: string | null;
  passenger_document: string | null;
  valid_until: string | null;
  issuing_country: string | null;
  booking_reference: string | null;
  created_at: string;
}

export interface DepartureWithChecklist extends DepartureCardDTO {
  airline_code?: string | null;
  flight_number?: string | null;
  airline_locator?: string | null;
  checkin_link?: string | null;
  hotel_name?: string | null;
  hotel_checkin_at?: string | null;
  hotel_checkout_at?: string | null;
  hotel_rules?: string | null;
  destination_city?: string | null;
  destination_type?: 'domestic' | 'international' | 'cruise';
  checklist_completed_pct?: number;
  has_urgent_alert?: boolean;
  alert_message?: string | null;
  checklist_items?: ChecklistItem[];
  documents?: BoardingDocument[];
}

// Default checklist templates by destination type
export const DEFAULT_CHECKLIST_TEMPLATES: Record<string, Array<{ label: string; category: ChecklistCategory; due_days_before: number; is_required: boolean }>> = {
  domestic: [
    { label: 'Documento de identidade válido (RG/CNH)', category: 'documentation', due_days_before: 30, is_required: true },
    { label: 'Voucher de hospedagem enviado ao cliente', category: 'hotel', due_days_before: 7, is_required: true },
    { label: 'Voucher de transfer enviado', category: 'logistics', due_days_before: 3, is_required: false },
    { label: 'Check-in aéreo realizado', category: 'airline', due_days_before: 1, is_required: true },
    { label: 'WhatsApp de boas-vindas enviado', category: 'communication', due_days_before: 2, is_required: true },
    { label: 'Seguro viagem contratado', category: 'insurance', due_days_before: 14, is_required: false },
  ],
  international: [
    { label: 'Passaporte válido (mín. 6 meses após retorno)', category: 'documentation', due_days_before: 90, is_required: true },
    { label: 'Visto obtido e válido', category: 'documentation', due_days_before: 60, is_required: true },
    { label: 'Vacinas exigidas no destino aplicadas', category: 'health', due_days_before: 30, is_required: true },
    { label: 'Seguro viagem internacional contratado', category: 'insurance', due_days_before: 30, is_required: true },
    { label: 'Taxa de entrada/imposto pago (se aplicável)', category: 'financial', due_days_before: 7, is_required: false },
    { label: 'Taxa ambiental/turística paga', category: 'financial', due_days_before: 7, is_required: false },
    { label: 'Cartão de embarque emitido', category: 'airline', due_days_before: 2, is_required: true },
    { label: 'Check-in aéreo online realizado', category: 'airline', due_days_before: 1, is_required: true },
    { label: 'Voucher de hotel enviado ao cliente', category: 'hotel', due_days_before: 7, is_required: true },
    { label: 'Regras do hotel comunicadas (cancelamento, check-in)', category: 'hotel', due_days_before: 7, is_required: true },
    { label: 'Transfer de chegada confirmado', category: 'logistics', due_days_before: 3, is_required: true },
    { label: 'Comunicado de embarque enviado por WhatsApp', category: 'communication', due_days_before: 2, is_required: true },
    { label: 'Contrato assinado pelo cliente', category: 'communication', due_days_before: 30, is_required: true },
  ],
  cruise: [
    { label: 'Passaporte válido', category: 'documentation', due_days_before: 90, is_required: true },
    { label: 'Cartão de embarque do cruzeiro emitido', category: 'airline', due_days_before: 7, is_required: true },
    { label: 'Taxa de embarque portuário paga', category: 'financial', due_days_before: 14, is_required: true },
    { label: 'Seguro viagem marítimo contratado', category: 'insurance', due_days_before: 30, is_required: true },
    { label: 'Voucher de transfer porto→navio confirmado', category: 'logistics', due_days_before: 3, is_required: true },
    { label: 'Cartão de crédito internacional ativado', category: 'financial', due_days_before: 14, is_required: false },
    { label: 'Vacinas para destinos de escala aplicadas', category: 'health', due_days_before: 30, is_required: false },
    { label: 'Programa de bordo enviado ao cliente', category: 'communication', due_days_before: 7, is_required: true },
  ],
};

// Airline check-in links
export const AIRLINE_CHECKIN_LINKS: Record<string, string> = {
  LA: 'https://www.latam.com/pt_br/fale-conosco/check-in/',
  G3: 'https://www.gol.com.br/voos/checkin',
  AD: 'https://www.azul.com.br/checkin',
  AA: 'https://www.aa.com/reservation/webCheckInViewReservationsAccess.do',
  UA: 'https://www.united.com/en/us/checkin',
  DL: 'https://www.delta.com/us/en/check-in/overview',
  IB: 'https://www.iberia.com/en/check-in/',
  TP: 'https://www.tapair.com/pt/check-in',
  AF: 'https://wwws.airfrance.com/en/check-in',
  KL: 'https://www.klm.com/travel/pt_pt/fly/check_in/index.htm',
};

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listDepartureCards = createServerFn({ method: 'GET' })
  .validator(z.object({ store_id: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = data?.store_id || identity.store_id;
    if (storeId !== identity.store_id && !(identity.role === "platform_admin")) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    const { data: rows, error } = await db
      .from('travel_departures_kanban')
      .select('*')
      .eq('store_id', storeId)
      .order('departure_date', { ascending: true });

    if (error) throw new Error('Erro ao listar kanban de embarques: ' + error.message);
    return (rows || []) as DepartureWithChecklist[];
  });

export const getDepartureWithChecklist = createServerFn({ method: 'GET' })
  .validator(z.object({ departure_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();

    const [{ data: departure, error: dErr }, { data: checklist, error: cErr }, { data: docs, error: docErr }] =
      await Promise.all([
        db.from('travel_departures_kanban').select('*').eq('id', data.departure_id).single(),
        db.from('boarding_checklist_items').select('*').eq('departure_id', data.departure_id).order('sort_order'),
        db.from('boarding_documents').select('*').eq('departure_id', data.departure_id).order('created_at'),
      ]);

    if (dErr || !departure) throw new Error('Embarque não encontrado.');
    if (cErr) throw new Error('Erro ao carregar checklist: ' + cErr.message);
    if (docErr) throw new Error('Erro ao carregar documentos: ' + docErr.message);

    return {
      departure: departure as DepartureWithChecklist,
      checklist: (checklist || []) as ChecklistItem[],
      documents: (docs || []) as BoardingDocument[],
    };
  });

export const createDepartureCard = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      client_name: z.string().min(2),
      client_phone: z.string().optional().nullable(),
      destination: z.string().min(2),
      departure_date: z.string(),
      return_date: z.string().optional().nullable(),
      passengers_count: z.number().int().min(1).default(1),
      notes: z.string().optional().nullable(),
      airline_code: z.string().max(3).optional().nullable(),
      flight_number: z.string().optional().nullable(),
      airline_locator: z.string().optional().nullable(),
      hotel_name: z.string().optional().nullable(),
      destination_type: z.enum(['domestic', 'international', 'cruise']).default('domestic'),
      apply_default_checklist: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.store_id || identity.store_id;
    assertStoreAccess(identity);

    const db = getServerClient();

    // Generate check-in link if airline known
    const checkinLink = data.airline_code
      ? AIRLINE_CHECKIN_LINKS[data.airline_code.toUpperCase()] || null
      : null;

    // 1. Create departure card
    const { data: row, error } = await db
      .from('travel_departures_kanban')
      .insert({
        store_id: storeId,
        client_name: data.client_name,
        client_phone: data.client_phone || null,
        destination: data.destination,
        departure_date: data.departure_date,
        return_date: data.return_date || null,
        stage: 'booked',
        passengers_count: data.passengers_count || 1,
        notes: data.notes || null,
        airline_code: data.airline_code?.toUpperCase() || null,
        flight_number: data.flight_number || null,
        airline_locator: data.airline_locator?.toUpperCase() || null,
        checkin_link: checkinLink,
        hotel_name: data.hotel_name || null,
        destination_type: data.destination_type || 'domestic',
      })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao criar cartão de embarque: ' + error.message);

    // 2. Apply default checklist if requested
    if (data.apply_default_checklist) {
      const template = DEFAULT_CHECKLIST_TEMPLATES[data.destination_type || 'domestic'] || [];
      if (template.length > 0) {
        const checklistRows = template.map((item, idx) => ({
          store_id: storeId!,
          departure_id: row.id,
          category: item.category,
          label: item.label,
          due_days_before: item.due_days_before,
          is_required: item.is_required,
          sort_order: idx,
          is_completed: false,
        }));
        await db.from('boarding_checklist_items').insert(checklistRows);
      }
    }

    return row as DepartureWithChecklist;
  });

export const updateDepartureStage = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      stage: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const { data: row, error } = await db
      .from('travel_departures_kanban')
      .update({ stage: data.stage, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select('*')
      .single();

    if (error) throw new Error('Erro ao atualizar estágio: ' + error.message);
    return row as DepartureWithChecklist;
  });

export const updateDepartureDetails = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      airline_code: z.string().optional().nullable(),
      flight_number: z.string().optional().nullable(),
      airline_locator: z.string().optional().nullable(),
      hotel_name: z.string().optional().nullable(),
      hotel_checkin_at: z.string().optional().nullable(),
      hotel_checkout_at: z.string().optional().nullable(),
      hotel_rules: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const airlineCode = data.airline_code?.toUpperCase() || null;
    const checkinLink = airlineCode ? AIRLINE_CHECKIN_LINKS[airlineCode] || null : null;

    const updatePayload: Record<string, any> = {
      airline_code: airlineCode,
      flight_number: data.flight_number || null,
      airline_locator: data.airline_locator?.toUpperCase() || null,
      checkin_link: checkinLink,
      hotel_name: data.hotel_name || null,
      hotel_checkin_at: data.hotel_checkin_at || null,
      hotel_checkout_at: data.hotel_checkout_at || null,
      hotel_rules: data.hotel_rules || null,
      updated_at: new Date().toISOString(),
    };

    if (data.notes !== undefined) {
      updatePayload.notes = data.notes || null;
    }

    const { data: row, error } = await db
      .from('travel_departures_kanban')
      .update(updatePayload)
      .eq('id', data.id)
      .select('*')
      .single();

    if (error) throw new Error('Erro ao atualizar detalhes: ' + error.message);
    return row as DepartureWithChecklist;
  });

export const toggleChecklistItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      item_id: z.string().uuid(),
      departure_id: z.string().uuid().optional(),
      is_completed: z.boolean(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();

    // 1. Toggle item
    const { data: item, error } = await db
      .from('boarding_checklist_items')
      .update({
        is_completed: data.is_completed,
        completed_at: data.is_completed ? new Date().toISOString() : null,
        completed_by_id: data.is_completed ? identity.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.item_id)
      .select()
      .single();

    if (error) throw new Error('Erro ao atualizar checklist: ' + error.message);

    const targetDepartureId = data.departure_id || item?.departure_id;

    // 2. Recalculate completion percentage
    if (targetDepartureId) {
      const { data: allItems, error: listErr } = await db
        .from('boarding_checklist_items')
        .select('is_completed, is_required')
        .eq('departure_id', targetDepartureId);

      if (!listErr && allItems) {
        const required = allItems.filter(i => i.is_required);
        const completed = required.filter(i => i.is_completed);
        const pct = required.length > 0 ? Math.round((completed.length / required.length) * 100) : 100;

        await db
          .from('travel_departures_kanban')
          .update({ checklist_completed_pct: pct, updated_at: new Date().toISOString() })
          .eq('id', targetDepartureId);
      }
    }

    return item as ChecklistItem;
  });

export const deleteChecklistItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      item_id: z.string().uuid(),
      departure_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('boarding_checklist_items')
      .delete()
      .eq('id', data.item_id);

    if (error) throw new Error('Erro ao excluir item: ' + error.message);
    return { success: true };
  });

export const addChecklistItem = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      departure_id: z.string().uuid(),
      label: z.string().min(2),
      category: z.enum(['documentation', 'health', 'insurance', 'financial', 'logistics', 'communication', 'airline', 'hotel', 'custom']),
      due_days_before: z.number().int().optional().nullable(),
      is_required: z.boolean().default(false),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = data.store_id || identity.store_id;

    const db = getServerClient();
    const { data: row, error } = await db
      .from('boarding_checklist_items')
      .insert({
        store_id: storeId,
        departure_id: data.departure_id,
        label: data.label,
        category: data.category,
        due_days_before: data.due_days_before || null,
        is_required: data.is_required,
        sort_order: 999,
      })
      .select()
      .single();

    if (error) throw new Error('Erro ao adicionar item: ' + error.message);
    return row as ChecklistItem;
  });

export const uploadBoardingDocument = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      departure_id: z.string().uuid(),
      document_type: z.enum(['contract', 'airline_ticket', 'hotel_voucher', 'insurance_policy', 'passport_copy', 'visa_stamp', 'vaccine_card', 'invoice', 'transfer_voucher', 'other']),
      file_url: z.string().url(),
      file_name: z.string().optional().nullable(),
      file_size_bytes: z.number().int().optional().nullable(),
      mime_type: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = data.store_id || identity.store_id;

    const db = getServerClient();
    const { data: row, error } = await db
      .from('boarding_documents')
      .insert({
        store_id: storeId,
        departure_id: data.departure_id,
        document_type: data.document_type,
        file_url: data.file_url,
        file_name: data.file_name || null,
        file_size_bytes: data.file_size_bytes || null,
        mime_type: data.mime_type || null,
        uploaded_by_id: identity.id,
        ocr_status: data.mime_type?.includes('pdf') || data.mime_type?.includes('image')
          ? 'pending'
          : 'not_applicable',
      })
      .select()
      .single();

    if (error) throw new Error('Erro ao registrar documento: ' + error.message);
    return row as BoardingDocument;
  });

export const deleteBoardingDocument = createServerFn({ method: 'POST' })
  .validator(z.object({ document_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('boarding_documents')
      .delete()
      .eq('id', data.document_id);

    if (error) throw new Error('Erro ao excluir documento: ' + error.message);
    return { success: true };
  });

export const updateDocumentOcrData = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      document_id: z.string().uuid(),
      ocr_extracted_data: z.record(z.any()),
      ocr_confidence: z.number().min(0).max(1).optional(),
      passenger_name: z.string().optional().nullable(),
      passenger_document: z.string().optional().nullable(),
      valid_until: z.string().optional().nullable(),
      issuing_country: z.string().optional().nullable(),
      booking_reference: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const { data: row, error } = await db
      .from('boarding_documents')
      .update({
        ocr_status: 'completed',
        ocr_extracted_data: data.ocr_extracted_data,
        ocr_confidence: data.ocr_confidence || null,
        passenger_name: data.passenger_name || null,
        passenger_document: data.passenger_document || null,
        valid_until: data.valid_until || null,
        issuing_country: data.issuing_country || null,
        booking_reference: data.booking_reference || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.document_id)
      .select()
      .single();

    if (error) throw new Error('Erro ao salvar dados do OCR: ' + error.message);
    return row as BoardingDocument;
  });

export const deleteDepartureCard = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db.from('travel_departures_kanban').delete().eq('id', data.id);
    if (error) throw new Error('Erro ao remover cartão: ' + error.message);
    return { success: true };
  });
