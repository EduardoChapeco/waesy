import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { getServerClient } from '@/lib/supabase';
import type { TravelSupplierDTO, SupplierKind } from '@/types/travel-suppliers';

const supplierKindEnum = z.enum([
  'operator',
  'consolidator',
  'hotel_chain',
  'hotel',
  'receptive',
  'transfer',
  'insurance',
  'car_rental',
  'airline',
  'visa',
  'other',
]);

export const ListTravelSuppliersSchema = z.object({
  store_id: z.string().uuid().optional(),
  kind: z.string().optional(),
}).optional();

export const CreateTravelSupplierSchema = z.object({
  store_id: z.string().uuid().optional(),
  name: z.string().min(2),
  legal_name: z.string().nullable().optional(),
  kind: supplierKindEnum.default('operator'),
  document: z.string().nullable().optional(),
  commission_rate: z.number().min(0).max(100).default(0),
  notes: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().default('Brasil'),
});

export const UpdateTravelSupplierSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().min(2).optional(),
    legal_name: z.string().nullable().optional(),
    kind: supplierKindEnum.optional(),
    document: z.string().nullable().optional(),
    commission_rate: z.number().min(0).max(100).optional(),
    notes: z.string().nullable().optional(),
    email: z.string().nullable().optional().or(z.literal('')),
    phone: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().optional(),
  }),
});

export const listTravelSuppliers = createServerFn({ method: 'GET' })
  .validator(ListTravelSuppliersSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    let q = db
      .from('travel_suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (data?.kind && data.kind !== 'all') {
      q = q.eq('kind', data.kind);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error('Erro ao listar fornecedores: ' + error.message);
    return (rows || []) as TravelSupplierDTO[];
  });

export const createTravelSupplier = createServerFn({ method: 'POST' })
  .validator(CreateTravelSupplierSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.store_id || identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { data: row, error } = await db
      .from('travel_suppliers')
      .insert({
        store_id: storeId,
        name: data.name,
        legal_name: data.legal_name || null,
        kind: data.kind || 'operator',
        document: data.document || null,
        commission_rate: data.commission_rate || 0,
        notes: data.notes || null,
        email: data.email || null,
        phone: data.phone || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || 'Brasil',
      })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao cadastrar fornecedor: ' + error.message);
    return row as TravelSupplierDTO;
  });

export const updateTravelSupplier = createServerFn({ method: 'POST' })
  .validator(UpdateTravelSupplierSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { data: row, error } = await db
      .from('travel_suppliers')
      .update({
        ...data.patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .eq('store_id', storeId)
      .select('*')
      .single();

    if (error) throw new Error('Erro ao atualizar fornecedor: ' + error.message);
    return row as TravelSupplierDTO;
  });

export const deleteTravelSupplier = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não selecionada.");
    assertStoreAccess(identity);

    const db = getServerClient();
    const { error } = await db
      .from('travel_suppliers')
      .delete()
      .eq('id', data.id)
      .eq('store_id', storeId);

    if (error) throw new Error('Erro ao remover fornecedor: ' + error.message);
    return { success: true };
  });

export const searchTravelSuppliers = createServerFn({ method: 'GET' })
  .validator(z.object({ search: z.string(), kind: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      const storeId = identity.store_id;
      if (!storeId) return [];
      const db = getServerClient();

      let q = db
        .from('travel_suppliers')
        .select('id, name, kind, city, country, rating, phone, email, commission_rate')
        .eq('store_id', storeId)
        .ilike('name', `%${data.search}%`)
        .order('name')
        .limit(10);

      if (data.kind && data.kind !== 'all') {
        q = q.eq('kind', data.kind);
      }

      const { data: rows, error } = await q;
      if (error) return [];
      return rows || [];
    } catch {
      return [];
    }
  });
