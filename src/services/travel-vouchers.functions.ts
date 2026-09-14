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
    const identity = await getServerIdentity();
    const storeId = data?.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    let q = db
      .from('travel_vouchers')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (data?.type && data.type !== 'all') {
      q = q.eq('voucher_type', data.type);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error('Erro ao listar vouchers: ' + error.message);
    return (rows || []) as TravelVoucherDTO[];
  });

export const createTravelVoucher = createServerFn({ method: 'POST' })
  .validator(CreateTravelVoucherSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const voucherNumber = 'VCH-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Date.now().toString().slice(-4);
    const qrHash = 'WIDER_VOUCHER_' + voucherNumber + '_' + Date.now();

    const db = getServerClient();
    const { data: row, error } = await db
      .from('travel_vouchers')
      .insert({
        store_id: storeId,
        trip_id: data.trip_id || null,
        voucher_number: voucherNumber,
        voucher_type: data.voucher_type || 'flight',
        title: data.title,
        passenger_name: data.passenger_name,
        passenger_document: data.passenger_document || null,
        qr_code_hash: qrHash,
        flight_data: data.flight_data || {},
        hotel_data: data.hotel_data || {},
        transfer_data: data.transfer_data || {},
        status: 'issued',
      })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao emitir voucher: ' + error.message);
    return row as TravelVoucherDTO;
  });

export const deleteTravelVoucher = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('travel_vouchers')
      .delete()
      .eq('id', data.id)
      .eq('store_id', storeId);

    if (error) throw new Error('Erro ao remover voucher: ' + error.message);
    return { success: true };
  });
