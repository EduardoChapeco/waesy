import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { getServerClient } from '@/lib/supabase';
import type { TravelVisaDTO, VisaStatus } from '@/types/travel-visas';

const visaStatusEnum = z.enum([
  'coleta_documentos',
  'formulario_preenchido',
  'entrevista_agendada',
  'agendamento_consular',
  'analise_consular',
  'em_analise_consular',
  'aprovado',
  'recusado',
  'negado',
  'entregue',
]);

export const ListTravelVisasSchema = z.object({
  store_id: z.string().uuid().optional(),
  status: z.string().optional(),
}).optional();

export const CreateTravelVisaSchema = z.object({
  store_id: z.string().uuid().optional(),
  client_name: z.string().min(2),
  client_passport: z.string().nullable().optional(),
  country: z.string().min(2),
  visa_category: z.string().optional().default('Turismo / Negócios'),
  interview_date: z.string().nullable().optional(),
  expected_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateTravelVisaStatusSchema = z.object({
  id: z.string().uuid(),
  status: visaStatusEnum,
  notes: z.string().optional(),
});

export const listTravelVisas = createServerFn({ method: 'GET' })
  .validator(ListTravelVisasSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    let q = db
      .from('travel_visas')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (data?.status && data.status !== 'all') {
      q = q.eq('status', data.status);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error('Erro ao listar processos de visto: ' + error.message);
    return (rows || []) as TravelVisaDTO[];
  });

export const createTravelVisa = createServerFn({ method: 'POST' })
  .validator(CreateTravelVisaSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const defaultDocs = [
      { id: 'd-1', title: 'Passaporte Original (Validade mínima 6 meses)', status: 'pendente' },
      { id: 'd-2', title: 'Foto 5x5 ou 5x7 padrão consular com fundo branco', status: 'pendente' },
      { id: 'd-3', title: 'Comprovante de Vínculo e Renda (IR / Extratos)', status: 'pendente' },
      { id: 'd-4', title: 'Comprovante de Reserva / Carta Convite', status: 'pendente' },
    ];

    const db = getServerClient();
    const { data: row, error } = await db
      .from('travel_visas')
      .insert({
        store_id: storeId,
        client_name: data.client_name,
        client_passport: data.client_passport || null,
        country: data.country,
        visa_category: data.visa_category || 'Turismo / Negócios',
        status: 'coleta_documentos',
        interview_date: data.interview_date || null,
        expected_date: data.expected_date || null,
        documents: defaultDocs,
        notes: data.notes || null,
      })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao criar processo de visto: ' + error.message);
    return row as TravelVisaDTO;
  });

export const updateTravelVisaStatus = createServerFn({ method: 'POST' })
  .validator(UpdateTravelVisaStatusSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const patch: any = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.notes !== undefined) patch.notes = data.notes;

    const { data: row, error } = await db
      .from('travel_visas')
      .update(patch)
      .eq('id', data.id)
      .eq('store_id', storeId)
      .select('*')
      .single();

    if (error) throw new Error('Erro ao atualizar status: ' + error.message);
    return row as TravelVisaDTO;
  });

export const deleteTravelVisa = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('travel_visas')
      .delete()
      .eq('id', data.id)
      .eq('store_id', storeId);

    if (error) throw new Error('Erro ao remover processo: ' + error.message);
    return { success: true };
  });
