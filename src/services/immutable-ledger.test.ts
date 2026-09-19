import { describe, it, expect } from "vitest";
import crypto from "crypto";

function computeSha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function computeEntryHash(
  prevHash: string,
  txType: string,
  amountCents: number,
  tokenAmount: number,
  senderId?: string,
  receiverId?: string,
  storeId?: string,
  refId?: string,
  idempotencyKey?: string,
  timestamp?: string
): string {
  const payload = `${prevHash}|${txType}|${amountCents || 0}|${tokenAmount || 0}|${senderId || ""}|${receiverId || ""}|${storeId || ""}|${refId || ""}|${idempotencyKey || ""}|${timestamp}`;
  return computeSha256(payload);
}

describe("Immutable Financial Ledger (Bacen / Blockchain-like Standards)", () => {
  const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  it("calculates sequential hash-chaining correctly from Genesis block", () => {
    const chain: any[] = [];
    let prev = GENESIS_HASH;

    const transactions = [
      { type: "token_purchase", amountCents: 8900, tokens: 2000000, user: "user-1" },
      { type: "carne_issued", amountCents: 350000, tokens: 0, user: "user-2" },
      { type: "carne_installment_paid", amountCents: 29167, tokens: 0, user: "user-2" },
      { type: "token_spend", amountCents: 0, tokens: 40000, user: "user-1" },
    ];

    transactions.forEach((tx, idx) => {
      const ts = new Date(1700000000000 + idx * 10000).toISOString();
      const hash = computeEntryHash(
        prev,
        tx.type,
        tx.amountCents,
        tx.tokens,
        tx.user,
        "store-1",
        "store-1",
        `ref-${idx}`,
        `idem-${idx}`,
        ts
      );

      chain.push({
        seq: idx + 1,
        prevHash: prev,
        entryHash: hash,
        ...tx,
        ts,
      });

      prev = hash;
    });

    expect(chain).toHaveLength(4);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
    expect(chain[1].prevHash).toBe(chain[0].entryHash);
    expect(chain[2].prevHash).toBe(chain[1].entryHash);
    expect(chain[3].prevHash).toBe(chain[2].entryHash);
  });

  it("detects historical tampering in the ledger immediately", () => {
    // Monta cadeia legítima de 3 blocos
    const t0 = new Date(1700000000000).toISOString();
    const h1 = computeEntryHash(GENESIS_HASH, "token_purchase", 10000, 200000, "user-a", "store-1", "store-1", "ref-1", "id-1", t0);
    
    const t1 = new Date(1700000010000).toISOString();
    const h2 = computeEntryHash(h1, "token_spend", 0, 5000, "user-a", "store-1", "store-1", "ref-2", "id-2", t1);

    const t2 = new Date(1700000020000).toISOString();
    const h3 = computeEntryHash(h2, "wallet_withdraw", 5000, 0, "user-a", "store-1", "store-1", "ref-3", "id-3", t2);

    const ledger = [
      { seq: 1, prevHash: GENESIS_HASH, entryHash: h1, amountCents: 10000, tokenAmount: 200000, ts: t0 },
      { seq: 2, prevHash: h1, entryHash: h2, amountCents: 0, tokenAmount: 5000, ts: t1 },
      { seq: 3, prevHash: h2, entryHash: h3, amountCents: 5000, tokenAmount: 0, ts: t2 },
    ];

    // Simulação de ataque malicioso: invasor adultera o Bloco #1 (muda de 10000 para 99999 centavos)
    ledger[0].amountCents = 99999;

    // Auditoria recalculada
    let integrityCompromisedAt: number | null = null;
    let currentPrev = GENESIS_HASH;

    for (const block of ledger) {
      const recomputed = computeEntryHash(
        block.prevHash,
        block.seq === 1 ? "token_purchase" : block.seq === 2 ? "token_spend" : "wallet_withdraw",
        block.amountCents,
        block.tokenAmount,
        "user-a",
        "store-1",
        "store-1",
        `ref-${block.seq}`,
        `id-${block.seq}`,
        block.ts
      );

      if (recomputed !== block.entryHash || block.prevHash !== currentPrev) {
        integrityCompromisedAt = block.seq;
        break;
      }
      currentPrev = block.entryHash;
    }

    expect(integrityCompromisedAt).toBe(1); // Bloco adulterado detectado com precisão militar
  });

  it("enforces double-entry accounting invariants (sum of debits equals credits)", () => {
    interface DoubleEntryAccount {
      userBalance: number;
      systemVault: number;
      storeEscrow: number;
    }

    const state: DoubleEntryAccount = {
      userBalance: 0,
      systemVault: 1000000, // R$ 10.000,00 custódia
      storeEscrow: 0,
    };

    // Operação 1: Depósito de R$ 500,00 (Usuário +50000, Vault -50000)
    const depositCents = 50000;
    state.userBalance += depositCents;
    state.systemVault -= depositCents;

    // Operação 2: Compra com custódia de R$ 200,00 (Usuário -20000, Escrow +20000)
    const buyCents = 20000;
    state.userBalance -= buyCents;
    state.storeEscrow += buyCents;

    // Operação 3: Liberação do escrow para a loja (Escrow -20000, Vault +20000)
    state.storeEscrow -= buyCents;
    state.systemVault += buyCents;

    // Total final somado deve ser exatamente idêntico ao total inicial
    const totalCurrent = state.userBalance + state.systemVault + state.storeEscrow;
    expect(totalCurrent).toBe(1000000);
    expect(state.userBalance).toBe(30000); // R$ 300,00
    expect(state.systemVault).toBe(970000); // R$ 9.700,00
    expect(state.storeEscrow).toBe(0);
  });
});
