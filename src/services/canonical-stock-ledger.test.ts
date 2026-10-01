import { describe, it, expect, vi } from 'vitest';
import { recordStockMovementSchema } from './canonical-stock-ledger.functions';

describe('Canonical Stock Ledger Service (G39–G46)', () => {
  it('E2: deve validar schemas de movimentação do ledger com Zod', () => {
    const validMovement = {
      variantId: '11111111-1111-4111-8111-111111111111',
      storeId: '22222222-2222-4222-8222-222222222222',
      movementType: 'reserve',
      qty: 2,
      referenceType: 'order',
      referenceId: '33333333-3333-4333-8333-333333333333',
      note: 'Reserva para pedido 1042',
    };

    const parsed = recordStockMovementSchema.safeParse(validMovement);
    expect(parsed.success).toBe(true);
  });

  it('E8: deve rejeitar tipo de movimento inválido fora do catálogo canônico', () => {
    const invalidMovement = {
      variantId: '11111111-1111-4111-8111-111111111111',
      storeId: '22222222-2222-4222-8222-222222222222',
      movementType: 'unauthorized_magic_credit', // Proibido!
      qty: 10,
    };

    const parsed = recordStockMovementSchema.safeParse(invalidMovement);
    expect(parsed.success).toBe(false);
  });

  it('E2: deve exigir identificador de loja e variante em formato UUID válido', () => {
    const malformed = {
      variantId: 'invalid-id-string',
      storeId: 'invalid-store-string',
      movementType: 'purchase',
      qty: 5,
    };

    const parsed = recordStockMovementSchema.safeParse(malformed);
    expect(parsed.success).toBe(false);
  });
});
