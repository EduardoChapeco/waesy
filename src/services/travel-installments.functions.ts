import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import type { TravelBookingInstallment } from '@/types/travel-installments';

export function calculateInstallmentPlan(
  totalAmount: number,
  installmentsCount: number,
  firstDueDate: Date
): Array<{ installment_number: number; amount: number; due_date: string }> {
  if (installmentsCount <= 0) installmentsCount = 1;
  const baseAmount = Math.floor((totalAmount / installmentsCount) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * installmentsCount) * 100) / 100;

  const plan = [];
  for (let i = 1; i <= installmentsCount; i++) {
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    // O primeiro boleto/parcela absorve o arredondamento
    const amount = i === 1 ? baseAmount + remainder : baseAmount;

    plan.push({
      installment_number: i,
      amount,
      due_date: dueDate.toISOString().split('T')[0],
    });
  }
  return plan;
}

export const listBookingInstallments = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      storeId: z.string().uuid().optional().nullable(),
      tripId: z.string().uuid().optional().nullable(),
    }).optional()
  )
  .handler(async ({ data }): Promise<TravelBookingInstallment[]> => {
    const { storeId, tripId } = data || {};
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);

    if (storeId && identity.role !== 'platform_admin' && storeId !== identity.store_id) {
      throw new Error('Acesso não autorizado para listar parcelas de outra agência.');
    }

    const effectiveStoreId = storeId || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error('Identificador da loja não fornecido.');
    }

    const db = getServerClient();

    // 1. Fonte canônica unificada (travel_trip_installment_boletos)
    let canonicalQuery = db
      .from('travel_trip_installment_boletos')
      .select('*')
      .eq('store_id', effectiveStoreId)
      .order('due_date', { ascending: true });
    if (tripId) {
      canonicalQuery = canonicalQuery.eq('trip_id', tripId);
    }
    const { data: canonicalRows, error: canonicalErr } = await canonicalQuery;
    if (canonicalErr) {
      throw new Error(`Erro ao listar boletos canônicos: ${canonicalErr.message}`);
    }

    const tripIds = Array.from(
      new Set((canonicalRows || []).map((r: any) => r.trip_id).filter(Boolean))
    );
    const tripClientNameById = new Map<string, string>();
    if (tripIds.length > 0) {
      const { data: tripsData } = await db
        .from('tourism_trips')
        .select('id, client_name')
        .eq('store_id', effectiveStoreId)
        .in('id', tripIds);
      for (const t of tripsData || []) {
        if (t?.id && t?.client_name) {
          tripClientNameById.set(String(t.id), String(t.client_name));
        }
      }
    }

    const canonicalMapped: TravelBookingInstallment[] = (canonicalRows || []).map((b: any) => ({
      id: b.id,
      store_id: b.store_id,
      trip_id: b.trip_id,
      client_id: null,
      passenger_name: tripClientNameById.get(String(b.trip_id)) || 'Titular da Viagem',
      installment_number: Number(b.installment_number || 1),
      total_installments: Number(b.total_installments || 1),
      amount: Math.round(Number(b.amount_cents || 0)) / 100,
      due_date: String(b.due_date || ''),
      status:
        b.status === 'reconciled'
          ? 'paid'
          : b.status === 'cancelled'
            ? 'canceled'
            : b.status === 'overdue'
              ? 'late'
              : 'pending',
      paid_at: b.status === 'reconciled' ? b.updated_at || null : null,
      payment_method:
        b.payment_channel === 'credit_card'
          ? 'cartao'
          : b.payment_channel === 'boleto_bancario'
            ? 'boleto'
            : 'pix',
      transaction_reference: b.digitable_line || null,
      receipt_url: b.receipt_file_url || null,
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));

    // 2. Fallback read-through para registros históricos legados ainda não migrados
    let legacyQuery = db
      .from('travel_booking_installments')
      .select('*')
      .eq('store_id', effectiveStoreId)
      .order('due_date', { ascending: true });
    if (tripId) {
      legacyQuery = legacyQuery.eq('trip_id', tripId);
    }
    const { data: legacyRows, error: legacyErr } = await legacyQuery;
    if (legacyErr) {
      throw new Error(`Erro ao listar parcelas do carnê: ${legacyErr.message}`);
    }

    const seenIds = new Set(canonicalMapped.map((item) => item.id));
    const merged: TravelBookingInstallment[] = [...canonicalMapped];
    for (const row of (legacyRows as TravelBookingInstallment[]) || []) {
      if (!seenIds.has(row.id)) {
        merged.push(row);
      }
    }
    return merged.sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
  });

export const markInstallmentPaid = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      payment_method: z.enum(['pix', 'boleto', 'cartao', 'transferencia', 'dinheiro']),
      transaction_reference: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const { id, payment_method, transaction_reference } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);

    const db = getServerClient();
    const nowIso = new Date().toISOString();

    // 1. Tenta liquidar primeiro na tabela canônica unificada
    const { data: canonicalBoleto } = await db
      .from('travel_trip_installment_boletos')
      .select('id, store_id')
      .eq('id', id)
      .maybeSingle();

    if (canonicalBoleto) {
      if (canonicalBoleto.store_id !== identity.store_id && identity.role !== 'platform_admin') {
        throw new Error('Acesso não autorizado para esta loja.');
      }
      const { error: updCanErr } = await db
        .from('travel_trip_installment_boletos')
        .update({
          status: 'reconciled',
          payment_channel:
            payment_method === 'cartao'
              ? 'credit_card'
              : payment_method === 'boleto'
                ? 'boleto_bancario'
                : 'agency_pix',
          ...(transaction_reference
            ? { customer_notes: `Ref. Liquidação: ${transaction_reference}` }
            : {}),
          ocr_extracted_date: nowIso.slice(0, 10),
          reconciled_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('store_id', canonicalBoleto.store_id);
      if (updCanErr) throw new Error(`Erro ao baixar boleto canônico: ${updCanErr.message}`);
      return { success: true };
    }

    // 2. Caso seja parcela legada em travel_booking_installments, exige mesmo tenant check
    const { data: installment, error: fetchErr } = await db
      .from('travel_booking_installments')
      .select('id, store_id')
      .eq('id', id)
      .single();

    if (fetchErr || !installment) {
      throw new Error('Parcela não encontrada.');
    }

    if (installment.store_id !== identity.store_id && identity.role !== 'platform_admin') {
      throw new Error('Acesso não autorizado para esta loja.');
    }

    const { error } = await db
      .from('travel_booking_installments')
      .update({
        status: 'paid',
        paid_at: nowIso,
        payment_method,
        transaction_reference: transaction_reference ?? null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('store_id', installment.store_id);

    if (error) throw new Error(`Erro ao baixar parcela: ${error.message}`);
    return { success: true };
  });
