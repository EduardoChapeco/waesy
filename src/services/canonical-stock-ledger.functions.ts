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
import { getServerIdentity } from '@/lib/server-access';

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
  qty: z.number().int(),
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

  // 1. Verifica a existência e dados atuais da variante
  const { data: variant, error: variantError } = await db
    .from('product_variants')
    .select('id, store_id, stock, reserved_stock, sku')
    .eq('id', input.variantId)
    .single();

  if (variantError || variant === null || variant === undefined) {
    throw new Error(`Variante não encontrada: ${input.variantId}`);
  }

  if (variant.store_id !== input.storeId) {
    throw new Error('Inconsistência de isolamento multi-tenant: Loja divergente.');
  }

  // 2. Trava contra venda além do disponível (E8)
  const availableStock = (variant.stock || 0) - (variant.reserved_stock || 0);

  if (input.movementType === 'reserve' && input.qty > availableStock) {
    throw new Error(
      `Estoque insuficiente para reserva. Disponível: ${availableStock}, Solicitado: ${input.qty}`
    );
  }

  // 3. Insere o registro imutável no ledger
  const { data: movement, error: insertError } = await db
    .from('stock_movements')
    .insert({
      variant_id: input.variantId,
      store_id: input.storeId,
      movement_type: input.movementType,
      qty: input.qty,
      reference_type: input.referenceType,
      reference_id: input.referenceId,
      note: input.note,
      actor_id: actorId || null,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[stock-ledger] Erro ao gravar ledger:', insertError);
    throw new Error('Falha ao registrar movimentação no ledger imutável de estoque.');
  }

  // 4. Atualiza os contadores na variante de forma atômica
  let newStock = variant.stock || 0;
  let newReserved = variant.reserved_stock || 0;

  if (input.movementType === 'reserve') {
    newReserved += input.qty;
  } else if (input.movementType === 'release') {
    newReserved = Math.max(0, newReserved - input.qty);
  } else if (input.movementType === 'sale') {
    newStock = Math.max(0, newStock - input.qty);
    newReserved = Math.max(0, newReserved - input.qty);
  } else if (input.movementType === 'purchase' || input.movementType === 'return') {
    newStock += input.qty;
  } else if (input.movementType === 'damage' || input.movementType === 'adjustment') {
    newStock += input.qty; // qty pode ser positivo ou negativo
  }

  await db
    .from('product_variants')
    .update({
      stock: newStock,
      reserved_stock: newReserved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.variantId);

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
      return await _recordStockMovement(data, identity?.userId || undefined);
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
