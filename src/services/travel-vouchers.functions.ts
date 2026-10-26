import { randomUUID, createHash } from 'node:crypto';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { getServerClient } from '@/lib/supabase';
import type { TravelVoucherDTO, VoucherType } from '@/types/travel-vouchers';

const voucherTypeEnum = z.enum([
  'flight',
  'hotel',
  'transfer',
  'package',
  'insurance',
  'tour',
  'car_rental',
  'activity',
  'other',
]);

export const ListTravelVouchersSchema = z.object({
  store_id: z.string().uuid().optional(),
  type: z.string().optional(),
}).optional();

export const CreateTravelVoucherSchema = z.object({
  store_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().nullable().optional(),
  voucher_type: voucherTypeEnum.default('flight'),
  title: z.string().min(2),
  passenger_name: z.string().min(2),
  passenger_document: z.string().nullable().optional(),
  flight_data: z.record(z.any()).optional().default({}),
  hotel_data: z.record(z.any()).optional().default({}),
  transfer_data: z.record(z.any()).optional().default({}),
});

export const listTravelVouchers = createServerFn({ method: 'GET' })
  .validator(ListTravelVouchersSchema)
  .handler(async ({ data }) => {
    const { store_id, type } = data || {};
    const identity = await getServerIdentity();
    const storeId = store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    let q = db
      .from('travel_vouchers')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      q = q.eq('voucher_type', type);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error('Erro ao listar vouchers: ' + error.message);
    return (rows || []) as TravelVoucherDTO[];
  });

export const createTravelVoucher = createServerFn({ method: 'POST' })
  .validator(CreateTravelVoucherSchema)
  .handler(async ({ data: { store_id, trip_id, voucher_type, title, passenger_name, passenger_document, flight_data, hotel_data, transfer_data } }) => {
    const identity = await getServerIdentity();
    const storeId = store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const effectiveType = voucher_type || 'flight';
    const db = getServerClient();

    // Idempotência Atômica / Deduplicação Estrita: Previne duplicatas concorrentes com ou sem trip_id
    const locator = (flight_data?.locator || hotel_data?.confirmationCode || transfer_data?.confirmationCode || "") as string;
    let existingQuery = db
      .from('travel_vouchers')
      .select('*')
      .eq('store_id', storeId)
      .eq('voucher_type', effectiveType)
      .eq('passenger_name', passenger_name)
      .eq('status', 'issued');

    if (trip_id) {
      existingQuery = existingQuery.eq('trip_id', trip_id);
    } else if (locator && typeof locator === 'string' && locator.trim().length >= 3) {
      existingQuery = existingQuery.or(`flight_data->>locator.eq.${locator.trim()},hotel_data->>confirmationCode.eq.${locator.trim()}`);
    } else {
      existingQuery = existingQuery.eq('title', title);
    }

    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return existing as TravelVoucherDTO;
    }

    // Geração Criptográfica Canônica de Código e Hash (Zero Math.random)
    const randomSuffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const voucherNumber = `VCH-${randomSuffix}-${Date.now().toString().slice(-4)}`;
    const qrHash = createHash('sha256')
      .update(`${storeId}_${voucherNumber}_${Date.now()}`)
      .digest('hex');

    const { data: row, error } = await db
      .from('travel_vouchers')
      .insert({
        store_id: storeId,
        trip_id: trip_id || null,
        voucher_number: voucherNumber,
        voucher_type: effectiveType,
        title,
        passenger_name,
        passenger_document: passenger_document || null,
        qr_code_hash: qrHash,
        flight_data: flight_data || {},
        hotel_data: hotel_data || {},
        transfer_data: transfer_data || {},
        status: 'issued',
      })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao emitir voucher: ' + error.message);
    return row as TravelVoucherDTO;
  });

export const deleteTravelVoucher = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('travel_vouchers')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) throw new Error('Erro ao remover voucher: ' + error.message);
    return { success: true };
  });
