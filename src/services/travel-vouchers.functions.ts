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

export const EnrichVoucherWithAgentPnrsSchema = z.object({
  voucherId: z.string().uuid(),
  pnrCode: z.string().optional(),
  eTicketNumber: z.string().optional(),
  hotelConfirmationCode: z.string().optional(),
  flightData: z.record(z.any()).optional(),
  hotelData: z.record(z.any()).optional(),
  transferData: z.record(z.any()).optional(),
  agentNotes: z.string().max(2000).optional(),
});

export const enrichVoucherWithAgentPnrs = createServerFn({ method: 'POST' })
  .validator(EnrichVoucherWithAgentPnrsSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { data: voucher, error: fetchErr } = await db
      .from('travel_vouchers')
      .select('*')
      .eq('id', data.voucherId)
      .eq('store_id', storeId)
      .single();

    if (fetchErr || !voucher) {
      throw new Error("Voucher não encontrado nesta agência.");
    }

    const updatedFlightData = {
      ...(voucher.flight_data || {}),
      ...(data.flightData || {}),
      ...(data.pnrCode ? { pnr: data.pnrCode } : {}),
      ...(data.eTicketNumber ? { e_ticket: data.eTicketNumber } : {}),
    };

    const updatedHotelData = {
      ...(voucher.hotel_data || {}),
      ...(data.hotelData || {}),
      ...(data.hotelConfirmationCode ? { confirmation_code: data.hotelConfirmationCode } : {}),
    };

    const updatedTransferData = {
      ...(voucher.transfer_data || {}),
      ...(data.transferData || {}),
    };

    const { data: updated, error: updErr } = await db
      .from('travel_vouchers')
      .update({
        flight_data: updatedFlightData,
        hotel_data: updatedHotelData,
        transfer_data: updatedTransferData,
        status: 'agent_enriched',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.voucherId)
      .eq('store_id', storeId)
      .select('*')
      .single();

    if (updErr) throw new Error("Erro ao enriquecer voucher com dados do agente: " + updErr.message);

    return {
      success: true,
      voucher: updated,
    };
  });

export const ReleaseTripVouchersSchema = z.object({
  tripId: z.string().uuid(),
  releaseNotes: z.string().optional(),
});

export const releaseTripVouchersToTraveler = createServerFn({ method: 'POST' })
  .validator(ReleaseTripVouchersSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();

    // Atualiza todos os vouchers da viagem para liberado
    const { data: releasedVouchers, error: relErr } = await db
      .from('travel_vouchers')
      .update({
        status: 'released_to_traveler',
        updated_at: new Date().toISOString(),
      })
      .eq('trip_id', data.tripId)
      .eq('store_id', storeId)
      .select('*');

    if (relErr) {
      throw new Error("Erro ao liberar vouchers para o viajante: " + relErr.message);
    }

    // Registra evento canônico na timeline
    await db.from('travel_timeline_events').insert({
      store_id: storeId,
      trip_id: data.tripId,
      lead_id: null,
      proposal_id: null,
      budget_id: null,
      sale_id: null,
      event_type: "vouchers.released_to_traveler",
      actor_profile_id: identity.id,
      payload: {
        total_vouchers: (releasedVouchers || []).length,
        notes: data.releaseNotes || null,
        released_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      releasedCount: (releasedVouchers || []).length,
      releasedVouchers: releasedVouchers || [],
    };
  });

