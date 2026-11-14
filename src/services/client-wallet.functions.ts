import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import type { ClientWalletPass, TripMemory } from '@/types/client-wallet';

export const listClientWalletPasses = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional(),
      tripId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ data }): Promise<ClientWalletPass[]> => {
    const db = getServerClient();
    let query = db
      .from('client_wallet_passes')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data?.storeId) {
      query = query.eq('store_id', data.storeId);
    }
    if (data?.clientId) {
      query = query.eq('client_id', data.clientId);
    }
    if (data?.tripId) {
      query = query.eq('trip_id', data.tripId);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao carregar passes da carteira: ${error.message}`);
    return (rows as any[]) || [];
  });

export const createWalletPass = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      client_id: z.string().uuid().optional().nullable(),
      trip_id: z.string().uuid().optional().nullable(),
      pass_type: z.enum(['boarding_pass', 'ticket', 'insurance', 'voucher']),
      title: z.string().min(2),
      subtitle: z.string().optional().nullable(),
      barcode_value: z.string().min(3),
      color: z.string().default('var(--color-slate-900)'),
      expires_at: z.string().optional().nullable(),
      metadata: z.record(z.any()).optional().default({}),
    })
  )
  .handler(async ({ data }): Promise<ClientWalletPass> => {
    const identity = await getServerIdentity();
    const effectiveStoreId = data.store_id || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Identificador da loja não fornecido.");
    }
    assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller']);

    const db = getServerClient();
    const { data: row, error } = await db
      .from('client_wallet_passes')
      .insert({
        store_id: effectiveStoreId,
        client_id: data.client_id,
        trip_id: data.trip_id,
        pass_type: data.pass_type,
        title: data.title,
        subtitle: data.subtitle,
        barcode_value: data.barcode_value,
        color: data.color,
        status: 'active',
        expires_at: data.expires_at,
        metadata: data.metadata,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao emitir passe digital: ${error.message}`);
    return row as any;
  });

export const listTripMemories = createServerFn({ method: 'GET' })
  .validator(z.object({ tripId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TripMemory[]> => {
    const db = getServerClient();
    const { data: rows, error } = await db
      .from('trip_memories')
      .select('*')
      .eq('trip_id', data.tripId)
      .order('taken_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar memórias da viagem: ${error.message}`);
    return (rows as any[]) || [];
  });

export const addTripMemory = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      trip_id: z.string().uuid(),
      uploader_name: z.string().default('Viajante'),
      media_url: z.string().url(),
      media_type: z.enum(['image', 'video']).default('image'),
      caption: z.string().optional().nullable(),
      location_name: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<TripMemory> => {
    const db = getServerClient();
    const { data: row, error } = await db
      .from('trip_memories')
      .insert({
        store_id: data.store_id || null,
        trip_id: data.trip_id,
        uploader_name: data.uploader_name,
        media_url: data.media_url,
        media_type: data.media_type,
        caption: data.caption,
        location_name: data.location_name,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao adicionar memória da viagem: ${error.message}`);
    return row as any;
  });
