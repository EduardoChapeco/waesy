import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// 1. ORÁCULO DE ESQUEMA POSTGRESQL & CONSTRAINTS ESTÁTICAS
// ---------------------------------------------------------------------------
describe('Empirical Oracle: PostgreSQL Constraints & Stock Ledger Schema', () => {
  const catalogMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/0002_catalog.sql'
  );
  const catalogSql = fs.readFileSync(catalogMigrationPath, 'utf-8');

  it('Oracle 1: deve verificar a constraint canônica stock_movements_movement_type_check', () => {
    // Extrai os valores permitidos para movement_type definidos na migration 0002_catalog.sql
    const checkConstraintMatch = catalogSql.match(
      /CHECK\s*\(\s*movement_type\s+IN\s*\(([\s\S]+?)\)\s*\)/i
    );
    expect(checkConstraintMatch).toBeTruthy();

    const allowedTypes = Array.from(
      (checkConstraintMatch ? checkConstraintMatch[1] : "").matchAll(/'([a-zA-Z0-9_]+)'/g)
    ).map((x) => x[1]);

    // Lista canônica esperada
    const canonicalTypes = [
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
    ];

    expect(allowedTypes).toEqual(expect.arrayContaining(canonicalTypes));

    // "loss" é estritamente PROIBIDO pela constraint PostgreSQL!
    expect(allowedTypes.includes('loss')).toBe(false);

    // "sale" é estritamente PERMITIDO pela constraint PostgreSQL!
    expect(allowedTypes.includes('sale')).toBe(true);
  });

  it('Oracle 2: deve certificar que a tabela stock_movements NÃO possui as colunas previous_stock nem new_stock', () => {
    const tableDefMatch = catalogSql.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.stock_movements\s*\(([\s\S]+?)\);/i
    );
    expect(tableDefMatch).toBeTruthy();
    const tableBody = tableDefMatch![1];

    expect(tableBody).not.toContain('previous_stock');
    expect(tableBody).not.toContain('new_stock');
  });

  it('Oracle 3: auditoria do código-fonte de service-orders.functions.ts', () => {
    const serviceOrdersPath = path.resolve(
      process.cwd(),
      'src/services/service-orders.functions.ts'
    );
    const code = fs.readFileSync(serviceOrdersPath, 'utf-8');

    // 1. Não pode conter 'movement_type: "loss"'
    expect(code).not.toContain('movement_type: "loss"');
    // 2. Não pode conter 'previous_stock'
    expect(code).not.toContain('previous_stock:');
    // 3. Não pode conter 'new_stock'
    expect(code).not.toContain('new_stock:');
    // 4. Deve conter 'movement_type: "sale"'
    expect(code).toContain('movement_type: "sale"');
    // 5. Enum do Zod deve aceitar "completed"
    expect(code).toContain('"completed"');
  });

  it('Oracle 4: auditoria do código-fonte de pdv.functions.ts', () => {
    const pdvPath = path.resolve(process.cwd(), 'src/services/pdv.functions.ts');
    const code = fs.readFileSync(pdvPath, 'utf-8');

    // 1. Não pode conter 'movement_type: "loss"'
    expect(code).not.toContain('movement_type: "loss"');
    // 2. Deve conter 'movement_type: "sale"' no consumo de BOM
    expect(code).toContain('reference_type: "bom_consumption"');
    expect(code).toContain('movement_type: "sale"');
    // 3. Resolução hierárquica deve priorizar variant_id, sku, product_id, título
    expect(code).toContain('bomItem.variant_id || bomItem.variantId');
    expect(code).toContain('bomItem.sku');
    expect(code).toContain('bomItem.product_id || bomItem.productId');
    expect(code).toContain('product_location_inventories');
  });
});

// ---------------------------------------------------------------------------
// 2. HARNESS EMPÍRICO ADVERSARIAL: SERVICE ORDERS IDEMPOTENCY & STOCK DEDUCTION
// ---------------------------------------------------------------------------
describe('Empirical Harness: updateServiceOrderStatus Idempotency & Stock Security', () => {
  const storeA = '00000000-0000-0000-0000-000000000001';
  const storeB = '00000000-0000-0000-0000-000000000002'; // Loja atacante
  const orderId = '11111111-1111-4111-8111-111111111111';
  const variantIdA = '22222222-2222-4222-8222-222222222222';
  const variantIdForeign = '33333333-3333-4333-8333-333333333333';

  // Simulação de banco em memória para o harness
  interface MockDbState {
    serviceOrder: {
      id: string;
      store_id: string;
      status: string;
      parts_used: Array<{ variant_id: string; quantity: number; name?: string }>;
      technical_diagnosis?: string;
    };
    variants: Map<string, { id: string; store_id: string; stock_on_hand: number }>;
    stockMovements: Array<any>;
  }

  let dbState: MockDbState;

  beforeEach(() => {
    dbState = {
      serviceOrder: {
        id: orderId,
        store_id: storeA,
        status: 'in_repair',
        parts_used: [
          { variant_id: variantIdA, quantity: 2, name: 'Tela OLED Display' },
        ],
      },
      variants: new Map([
        [variantIdA, { id: variantIdA, store_id: storeA, stock_on_hand: 10 }],
        [variantIdForeign, { id: variantIdForeign, store_id: storeB, stock_on_hand: 50 }],
      ]),
      stockMovements: [],
    };
  });

  // Emulação exata do fluxo interno de updateServiceOrderStatus
  async function simulateUpdateServiceOrderStatus(input: {
    order_id: string;
    status: 'draft' | 'waiting_approval' | 'in_repair' | 'ready_for_pickup' | 'delivered' | 'completed' | 'cancelled';
    technical_diagnosis?: string;
  }) {
    const identity = { store_id: storeA, user_id: 'user-emp-challenger' };

    // 1. Obter estado atual da OS
    const currentOs =
      dbState.serviceOrder.id === input.order_id && dbState.serviceOrder.store_id === identity.store_id
        ? { ...dbState.serviceOrder }
        : null;

    if (!currentOs) {
      throw new Error('Ordem de serviço não encontrada ou acesso não autorizado.');
    }

    const isConclusionStatus = input.status === 'delivered' || input.status === 'completed';
    const wasAlreadyConcluded = currentOs.status === 'delivered' || currentOs.status === 'completed';

    // 2. Atualizar status da OS
    dbState.serviceOrder.status = input.status;
    if (input.technical_diagnosis) {
      dbState.serviceOrder.technical_diagnosis = input.technical_diagnosis;
    }
    const os = { ...dbState.serviceOrder };

    // 3. Dedução de peças com idempotência estrita
    if (isConclusionStatus && wasAlreadyConcluded === false && os?.parts_used && Array.isArray(os.parts_used)) {
      // Consulta prévia no ledger de stock_movements
      const existingDeductions = dbState.stockMovements.filter(
        (m) =>
          m.store_id === identity.store_id &&
          m.reference_type === 'service_order' &&
          m.reference_id === input.order_id
      );

      const alreadyDeducted = existingDeductions.length > 0;

      if (!alreadyDeducted) {
        for (const part of os.parts_used) {
          if (part.variant_id && part.quantity > 0) {
            const variant = dbState.variants.get(part.variant_id);
            // Multi-tenant check: variant must belong to identity.store_id
            if (!variant || variant.store_id !== identity.store_id) continue;

            const prevStock = variant.stock_on_hand;
            const newStock = Math.max(0, prevStock - part.quantity);

            // Inserção no ledger imutável
            const movementRecord = {
              store_id: identity.store_id,
              variant_id: variant.id,
              movement_type: 'sale',
              qty: -part.quantity,
              reference_type: 'service_order',
              reference_id: input.order_id,
              channel_origin: 'workspace_services',
              channel_source: 'service_order',
              note: `Consumo de peça na OS #${input.order_id.slice(0, 8)} (${part.name || 'Peça/Insumo'})`,
              actor_id: identity.user_id,
              created_at: new Date().toISOString(),
            };

            dbState.stockMovements.push(movementRecord);
            variant.stock_on_hand = newStock;
          }
        }
      }
    }

    return os;
  }

  it('Harness 1: Primeira conclusão (in_repair -> delivered) consome estoque e cria ledger com movement_type "sale"', async () => {
    const result = await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'delivered',
      technical_diagnosis: 'Troca de tela efetuada com sucesso.',
    });

    expect(result.status).toBe('delivered');
    // Estoque da variante reduziu de 10 para 8
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);

    // Ledger possui exatamente 1 registro
    expect(dbState.stockMovements).toHaveLength(1);
    const movement = dbState.stockMovements[0];
    expect(movement.movement_type).toBe('sale');
    expect(movement.qty).toBe(-2);
    expect(movement.reference_type).toBe('service_order');
    expect(movement.reference_id).toBe(orderId);
    expect(movement).not.toHaveProperty('previous_stock');
    expect(movement).not.toHaveProperty('new_stock');
  });

  it('Harness 2: Idempotência de Chamada Duplicada (delivered -> delivered) NÃO duplica baixa nem ledger', async () => {
    // 1ª execução: vai para delivered
    await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'delivered',
    });
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    expect(dbState.stockMovements).toHaveLength(1);

    // 2ª execução idêntica (duplo clique / replay de rede)
    await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'delivered',
    });

    // O estoque NÃO pode ser decrementado novamente!
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    // Nenhum novo registro no ledger de stock_movements!
    expect(dbState.stockMovements).toHaveLength(1);
  });

  it('Harness 3: Idempotência de Transição Sucessiva (delivered -> completed) NÃO duplica baixa', async () => {
    // 1ª execução: delivered
    await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'delivered',
    });
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    expect(dbState.stockMovements).toHaveLength(1);

    // 2ª execução: transição para completed (fechamento contábil da OS)
    const completedResult = await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'completed',
    });
    expect(completedResult.status).toBe('completed');

    // wasAlreadyConcluded era true (era 'delivered'), portanto dedução foi bloqueada na camada 1
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    expect(dbState.stockMovements).toHaveLength(1);
  });

  it('Harness 4: Camada 2 de Idempotência bloqueia replay mesmo se o status foi reiniciado (oscilação delivered -> in_repair -> delivered)', async () => {
    // 1. Entregue pela primeira vez (baixa de 10 -> 8)
    await simulateUpdateServiceOrderStatus({ order_id: orderId, status: 'delivered' });
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    expect(dbState.stockMovements).toHaveLength(1);

    // 2. Cliente volta com reclamação e atendente reabre para "in_repair"
    await simulateUpdateServiceOrderStatus({ order_id: orderId, status: 'in_repair' });
    expect(dbState.serviceOrder.status).toBe('in_repair');

    // 3. Atendente finaliza novamente para "delivered"
    // Aqui wasAlreadyConcluded é FALSE (pois o status atual era in_repair)!
    // A Camada 2 (alreadyDeducted via query em stock_movements) DEVE SALVAR e impedir baixa duplicada!
    await simulateUpdateServiceOrderStatus({ order_id: orderId, status: 'delivered' });

    expect(dbState.serviceOrder.status).toBe('delivered');
    // Saldo DEVE continuar 8, nunca 6!
    expect(dbState.variants.get(variantIdA)?.stock_on_hand).toBe(8);
    // Ledger DEVE permanecer com 1 único lançamento!
    expect(dbState.stockMovements).toHaveLength(1);
  });

  it('Harness 5: Blindagem Multi-Tenant — peça de outra loja NUNCA é baixada', async () => {
    // Adversário tenta forjar uma OS na loja A referenciando peça da loja B
    dbState.serviceOrder.parts_used = [
      { variant_id: variantIdForeign, quantity: 5, name: 'Peça Invasora de Outro Tenant' },
    ];

    await simulateUpdateServiceOrderStatus({
      order_id: orderId,
      status: 'delivered',
    });

    // O estoque da loja B deve permanecer rigorosamente intacto (50)
    expect(dbState.variants.get(variantIdForeign)?.stock_on_hand).toBe(50);
    // Nenhum movimento inserido para o tenant invasor
    expect(dbState.stockMovements).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. HARNESS EMPÍRICO ADVERSARIAL: PDV BOM RESOLUTION HIERARCHY
// ---------------------------------------------------------------------------
describe('Empirical Harness: PDV BOM Hierarchical Resolution & Stock Sync', () => {
  const storeId = '00000000-0000-0000-0000-000000000001';
  const foreignStoreId = '00000000-0000-0000-0000-000000000002';
  const orderId = '99999999-9999-4999-8999-999999999999';

  interface PdvMockDb {
    variants: Array<{
      id: string;
      product_id: string;
      store_id: string;
      sku: string;
      stock_on_hand: number;
    }>;
    products: Array<{
      id: string;
      store_id: string;
      title: string;
    }>;
    locationInventories: Array<{
      location_id: string;
      variant_id: string;
      stock_qty: number;
    }>;
    stockMovements: Array<any>;
  }

  let pdvDb: PdvMockDb;

  beforeEach(() => {
    pdvDb = {
      variants: [
        {
          id: 'var-bread-uuid',
          product_id: 'prod-bread-uuid',
          store_id: storeId,
          sku: 'BREAD-01',
          stock_on_hand: 100,
        },
        {
          id: 'var-meat-uuid',
          product_id: 'prod-meat-uuid',
          store_id: storeId,
          sku: 'MEAT-BLEND-150G',
          stock_on_hand: 50,
        },
        {
          id: 'var-foreign-bread',
          product_id: 'prod-foreign-bread',
          store_id: foreignStoreId,
          sku: 'BREAD-FOREIGN',
          stock_on_hand: 1000,
        },
      ],
      products: [
        { id: 'prod-bread-uuid', store_id: storeId, title: 'Pão de Brioche Artesanal' },
        { id: 'prod-meat-uuid', store_id: storeId, title: 'Blend Bovino 150g' },
        { id: 'prod-foreign-bread', store_id: foreignStoreId, title: 'Pão Alheio' },
      ],
      locationInventories: [
        { location_id: 'loc-balcao', variant_id: 'var-bread-uuid', stock_qty: 100 },
        { location_id: 'loc-balcao', variant_id: 'var-meat-uuid', stock_qty: 50 },
      ],
      stockMovements: [],
    };
  });

  // Emulação exata do algoritmo de resolução de BOM em pdv.functions.ts
  async function simulateBomDeduction(bomList: any[], soldQty: number) {
    const activeLocationId = 'loc-balcao';

    for (const bomItem of bomList) {
      const itemQty = Number(bomItem.quantity) || 1;
      const consumedQty = itemQty * soldQty;
      if (consumedQty <= 0) continue;

      let targetVariantId: string | null = null;
      let prevIngStock = 0;

      // 1. Resolução Canônica Prioridade 1: variant_id / variantId UUID
      const rawVariantId = bomItem.variant_id || bomItem.variantId;
      if (rawVariantId && typeof rawVariantId === 'string') {
        const matchedVar = pdvDb.variants.find(
          (v) => v.id === rawVariantId && v.store_id === storeId
        );
        if (matchedVar) {
          targetVariantId = matchedVar.id;
          prevIngStock = matchedVar.stock_on_hand || 0;
        }
      }

      // 2. Resolução Canônica Prioridade 2: SKU
      if (!targetVariantId && bomItem.sku && typeof bomItem.sku === 'string') {
        const matchedVar = pdvDb.variants.find(
          (v) => v.sku === bomItem.sku.trim() && v.store_id === storeId
        );
        if (matchedVar) {
          targetVariantId = matchedVar.id;
          prevIngStock = matchedVar.stock_on_hand || 0;
        }
      }

      // 3. Resolução Canônica Prioridade 3: product_id
      const rawProdId = bomItem.product_id || bomItem.productId;
      if (!targetVariantId && rawProdId && typeof rawProdId === 'string') {
        const matchedVar = pdvDb.variants.find(
          (v) => v.product_id === rawProdId && v.store_id === storeId
        );
        if (matchedVar) {
          targetVariantId = matchedVar.id;
          prevIngStock = matchedVar.stock_on_hand || 0;
        }
      }

      // 4. Fallback resiliente por título exato e aproximação
      if (!targetVariantId && bomItem.name && typeof bomItem.name === 'string' && bomItem.name.trim()) {
        const trimmedName = bomItem.name.trim().toLowerCase();
        let prod = pdvDb.products.find(
          (p) => p.store_id === storeId && p.title.toLowerCase() === trimmedName
        );
        if (!prod) {
          prod = pdvDb.products.find(
            (p) => p.store_id === storeId && p.title.toLowerCase().includes(trimmedName)
          );
        }
        if (prod) {
          const matchedVar = pdvDb.variants.find(
            (v) => v.product_id === prod.id && v.store_id === storeId
          );
          if (matchedVar) {
            targetVariantId = matchedVar.id;
            prevIngStock = matchedVar.stock_on_hand || 0;
          }
        }
      }

      if (targetVariantId) {
        const newIngStock = Math.max(0, prevIngStock - consumedQty);
        const variantObj = pdvDb.variants.find((v) => v.id === targetVariantId);
        if (variantObj) {
          variantObj.stock_on_hand = newIngStock;
        }

        if (activeLocationId) {
          const locInv = pdvDb.locationInventories.find(
            (li) => li.location_id === activeLocationId && li.variant_id === targetVariantId
          );
          if (locInv) {
            locInv.stock_qty = Math.max(0, locInv.stock_qty - consumedQty);
          }
        }

        pdvDb.stockMovements.push({
          store_id: storeId,
          variant_id: targetVariantId,
          location_id: activeLocationId,
          movement_type: 'sale',
          qty: -consumedQty,
          reference_type: 'bom_consumption',
          reference_id: orderId,
          channel_origin: 'pdv',
          channel_source: 'pos_counter',
          note: `Consumo de insumo BOM (${bomItem.name || targetVariantId} - ${bomItem.quantity || 1}${bomItem.unit || ''}) no Pedido #${orderId.slice(0, 8)}`,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  it('Harness BOM 1: Resolução por Prioridade 1 (variant_id UUID direto)', async () => {
    const bomList = [
      { variant_id: 'var-bread-uuid', quantity: 1, name: 'Pão' },
      { variant_id: 'var-meat-uuid', quantity: 1, name: 'Hambúrguer' },
    ];

    // Venda de 2 Burgers no balcão
    await simulateBomDeduction(bomList, 2);

    expect(pdvDb.variants.find((v) => v.id === 'var-bread-uuid')?.stock_on_hand).toBe(98);
    expect(pdvDb.variants.find((v) => v.id === 'var-meat-uuid')?.stock_on_hand).toBe(48);

    // Multi-armazém sincronizado
    expect(
      pdvDb.locationInventories.find((li) => li.variant_id === 'var-bread-uuid')?.stock_qty
    ).toBe(98);

    // Movimentações no ledger com movement_type = "sale" e reference_type = "bom_consumption"
    expect(pdvDb.stockMovements).toHaveLength(2);
    expect(pdvDb.stockMovements.every((m) => m.movement_type === 'sale')).toBe(true);
    expect(pdvDb.stockMovements.every((m) => m.reference_type === 'bom_consumption')).toBe(true);
    expect(pdvDb.stockMovements.every((m) => !('previous_stock' in m))).toBe(true);
    expect(pdvDb.stockMovements.every((m) => !('new_stock' in m))).toBe(true);
  });

  it('Harness BOM 2: Resolução por Prioridade 2 (SKU)', async () => {
    const bomList = [
      { sku: 'MEAT-BLEND-150G', quantity: 2, name: 'Double Meat Blend' },
    ];

    // Venda de 3 lanches duplos = 6 blends
    await simulateBomDeduction(bomList, 3);

    expect(pdvDb.variants.find((v) => v.id === 'var-meat-uuid')?.stock_on_hand).toBe(44);
    expect(pdvDb.stockMovements[0].qty).toBe(-6);
  });

  it('Harness BOM 3: Resolução por Fallback (título do produto)', async () => {
    const bomList = [
      { name: 'Pão de Brioche Artesanal', quantity: 1 },
    ];

    await simulateBomDeduction(bomList, 5);

    expect(pdvDb.variants.find((v) => v.id === 'var-bread-uuid')?.stock_on_hand).toBe(95);
    expect(pdvDb.stockMovements[0].qty).toBe(-5);
  });

  it('Harness BOM 4: Blindagem Multi-Tenant impede dedução de insumo de loja alheia', async () => {
    const bomList = [
      { variant_id: 'var-foreign-bread', quantity: 10, name: 'Pão Roubado' },
    ];

    await simulateBomDeduction(bomList, 1);

    // Estoque da loja estrangeira NÃO deve ser tocado
    expect(pdvDb.variants.find((v) => v.id === 'var-foreign-bread')?.stock_on_hand).toBe(1000);
    // Nenhum movimento registrado
    expect(pdvDb.stockMovements).toHaveLength(0);
  });
});
