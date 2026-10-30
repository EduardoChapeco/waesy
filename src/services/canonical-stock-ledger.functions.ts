/**
 * canonical-stock-ledger.functions.ts — Motor Canônico de Estoque e Ledger Imutável (G39–G46)
 * 
 * Regras:
 * - E2: Ledger de movimentação imutável: quem, quando, origem, com documento vinculado.
 * - E3: Reserva no checkout; baixa na confirmação; estorno na reversão.
 * - E8: Nenhuma venda acima do disponível. Nenhum movimento sem autor e motivo.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient, SupabaseUnconfiguredError } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';

export const stockMovementTypeSchema = z.enum([
  'purchase',
  'sale',
  'reserve',
  'release',
  'return',
  'exchange_in',
  'exchange_out',
  'adjustment',
  'transfer',
  'damage',
]);

export const recordStockMovementSchema = z.object({
  variantId: z.string().uuid(),
  storeId: z.string().uuid(),
  movementType: stockMovementTypeSchema,
  qty: z.number().int().refine((value) => value !== 0, 'A quantidade deve ser diferente de zero.'),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  note: z.string().optional(),
});

export type RecordStockMovementInput = z.infer<typeof recordStockMovementSchema>;

/**
 * Função interna para registrar movimentação imutável no ledger
 */
export async function _recordStockMovement(
  input: RecordStockMovementInput,
  actorId?: string
) {
  const db = getServerClient();

  if (input.movementType === 'reserve' || input.movementType === 'release') {
    throw new Error('Reservas devem usar exclusivamente o checkout atômico.');
  }

  const { data: movement, error } = await db.rpc('record_stock_movement_atomic', {
    p_variant_id: input.variantId,
    p_store_id: input.storeId,
    p_movement_type: input.movementType,
    p_qty: input.qty,
    p_reference_type: input.referenceType ?? null,
    p_reference_id: input.referenceId ?? null,
    p_note: input.note ?? null,
    p_actor_id: actorId ?? null,
  });

  if (error || !movement) {
    console.error('[stock-ledger] Erro ao gravar ledger:', error);
    throw new Error(error?.message || 'Falha ao registrar movimentação no ledger imutável de estoque.');
  }

  return movement;
}

/**
 * Server Function: Grava movimentação de estoque
 */
export const recordStockMovement = createServerFn({ method: 'POST' })
  .validator((d: unknown) => recordStockMovementSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, ['owner', 'admin', 'manager', 'stock'], data.storeId);
      return await _recordStockMovement(data, identity.id);
    } catch (e) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error('[stock-ledger] Erro em recordStockMovement:', e);
      throw e;
    }
  });

/**
 * Função interna para listar o histórico auditável do ledger
 */
export async function _listStockLedger(variantId: string, storeId: string, limit = 50) {
  const db = getServerClient();

  const { data, error } = await db
    .from('stock_movements')
    .select('*')
    .eq('variant_id', variantId)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[stock-ledger] Erro ao listar ledger:', error);
    throw new Error('Falha ao recuperar histórico de estoque.');
  }

  return data;
}

/**
 * Server Function: Lista histórico do ledger para uma variante
 */
export const listStockLedger = createServerFn({ method: 'GET' })
  .validator((d: { variantId: string; storeId: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller', 'stock'], data.storeId);
      return await _listStockLedger(data.variantId, data.storeId, data.limit);
    } catch (e) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error('[stock-ledger] Erro em listStockLedger:', e);
      throw e;
    }
  });

/**
 * Alias canônico para compatibilidade com o guard de duplicação e R24
 */
export const updateStockLedger = recordStockMovement;
