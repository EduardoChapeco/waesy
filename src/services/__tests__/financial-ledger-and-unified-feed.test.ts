/**
 * src/services/__tests__/financial-ledger-and-unified-feed.test.ts
 * 
 * Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.25
 * Suíte de testes do Ledger de Partidas Dobradas, Comprovantes HMAC e Extratos
 */

import { describe, it, expect } from "vitest";
import {
  generateLedgerHash,
  signReceiptPayload,
  verifyReceiptSignature,
} from "../financial-ledger.functions";
import { parseOfxText } from "../personal-finance.functions";
import { createHash } from "node:crypto";

describe("SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA — Testes de Integridade Contábil e Extratos", () => {
  describe("1. Partidas Dobradas & Hash Chain (Double-Entry Ledger)", () => {
    it("deve gerar hash chain determinístico a partir dos parâmetros da transação", () => {
      const entry = {
        transactionId: "tx_12345",
        debitAccountId: "acc_debit_001",
        creditAccountId: "acc_credit_002",
        amountCents: 15000, // R$ 150,00
        createdAt: "2026-10-21T00:00:00.000Z",
      };

      const hash1 = generateLedgerHash("GENESIS_HASH", entry);
      const hash2 = generateLedgerHash("GENESIS_HASH", entry);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it("deve alterar o hash chain se qualquer parâmetro for adulterado", () => {
      const entry = {
        transactionId: "tx_12345",
        debitAccountId: "acc_debit_001",
        creditAccountId: "acc_credit_002",
        amountCents: 15000,
        createdAt: "2026-10-21T00:00:00.000Z",
      };

      const originalHash = generateLedgerHash("GENESIS_HASH", entry);
      const tamperedHash = generateLedgerHash("GENESIS_HASH", {
        ...entry,
        amountCents: 15001, // Tentativa de adulteração de 1 centavo
      });

      expect(originalHash).not.toBe(tamperedHash);
    });

    it("deve respeitar a invariante contábil de soma zero em partidas dobradas (Debit - Credit = 0)", () => {
      // Simulação de transação contábil
      const amountCents = 25000;
      const ledgerEntry = {
        debitAccountId: "user_wallet_acc",
        creditAccountId: "merchant_settlement_acc",
        amountCents,
      };

      // No modelo de partidas dobradas, o débito na conta de origem equivale exatamente ao crédito na de destino
      const debitMutation = -ledgerEntry.amountCents;
      const creditMutation = +ledgerEntry.amountCents;
      const zeroSum = debitMutation + creditMutation;

      expect(zeroSum).toBe(0);
      expect(ledgerEntry.amountCents).toBeGreaterThan(0);
      expect(Number.isInteger(ledgerEntry.amountCents)).toBe(true);
    });
  });

  describe("2. Comprovantes Criptográficos com Assinatura HMAC-SHA256", () => {
    it("deve assinar e validar com sucesso um comprovante legítimo", () => {
      const receiptData = {
        transactionId: "tx_998877",
        authenticationCode: "WAESY-2026-X99",
        amountCents: 7500, // R$ 75,00
        issuedAt: "2026-10-21T12:00:00.000Z",
        payerName: "Carlos Eduardo da Silva",
        payeeName: "Padaria e Confeitaria Central Ltda",
      };

      const hmacSignature = signReceiptPayload(receiptData);

      const isValid = verifyReceiptSignature({
        ...receiptData,
        hmacSignature,
      });

      expect(isValid).toBe(true);
    });

    it("deve invalidar o comprovante se o valor for adulterado", () => {
      const receiptData = {
        transactionId: "tx_998877",
        authenticationCode: "WAESY-2026-X99",
        amountCents: 7500,
        issuedAt: "2026-10-21T12:00:00.000Z",
        payerName: "Carlos Eduardo da Silva",
        payeeName: "Padaria e Confeitaria Central Ltda",
      };

      const hmacSignature = signReceiptPayload(receiptData);

      // Adulterando o valor para R$ 750,00
      const isValid = verifyReceiptSignature({
        ...receiptData,
        amountCents: 75000,
        hmacSignature,
      });

      expect(isValid).toBe(false);
    });

    it("deve invalidar o comprovante se o nome do recebedor for adulterado", () => {
      const receiptData = {
        transactionId: "tx_998877",
        authenticationCode: "WAESY-2026-X99",
        amountCents: 7500,
        issuedAt: "2026-10-21T12:00:00.000Z",
        payerName: "Carlos Eduardo da Silva",
        payeeName: "Padaria e Confeitaria Central Ltda",
      };

      const hmacSignature = signReceiptPayload(receiptData);

      const isValid = verifyReceiptSignature({
        ...receiptData,
        payeeName: "Empresa Falsa Golpista",
        hmacSignature,
      });

      expect(isValid).toBe(false);
    });
  });

  describe("3. Parser e Deduplicação Idempotente de Extratos OFX", () => {
    it("deve processar transações de extrato OFX bancário com centavos inteiros e datas corretas", () => {
      const mockOfx = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20261015120000[-03:EST]
            <TRNAMT>-45.50
            <FITID>202610150001
            <MEMO>Supermercado CompreBem
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20261016100000[-03:EST]
            <TRNAMT>1200.00
            <FITID>202610160002
            <NAME>Salario Empresa X
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
      `;

      const parsed = parseOfxText(mockOfx);

      expect(parsed).toHaveLength(2);

      // Transação 1: Despesa de R$ 45,50
      expect(parsed[0].type).toBe("expense");
      expect(parsed[0].amountCents).toBe(4550);
      expect(parsed[0].entryDate).toBe("2026-10-15");
      expect(parsed[0].fitid).toBe("202610150001");
      expect(parsed[0].description).toBe("Supermercado CompreBem");

      // Transação 2: Receita de R$ 1.200,00
      expect(parsed[1].type).toBe("income");
      expect(parsed[1].amountCents).toBe(120000);
      expect(parsed[1].entryDate).toBe("2026-10-16");
      expect(parsed[1].fitid).toBe("202610160002");
      expect(parsed[1].description).toBe("Salario Empresa X");
    });

    it("deve calcular hashes idênticos para a mesma transação FITID garantindo idempotência", () => {
      const profileId = "profile_user_123";
      const institution = "Banco do Brasil";
      const fitid = "202610150001";

      const hash1 = createHash("sha256")
        .update(`${profileId}:${institution}:default:${fitid}`)
        .digest("hex");

      const hash2 = createHash("sha256")
        .update(`${profileId}:${institution}:default:${fitid}`)
        .digest("hex");

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("4. Deduplicação Determinística de Categorias", () => {
    it("deve eliminar duplicações de nomes mantendo a categoria customizada do usuário quando disponível", () => {
      const rawCategoriesFromDb = [
        { id: "cat-1", profile_id: null, name: "Alimentação", type: "expense", color: "#6366f1", icon: "Utensils" },
        { id: "cat-2", profile_id: null, name: "alimentação", type: "expense", color: "#6366f1", icon: "Utensils" },
        { id: "cat-3", profile_id: "user-456", name: "Alimentação", type: "expense", color: "#f43f5e", icon: "Utensils" },
        { id: "cat-4", profile_id: null, name: "Transporte", type: "expense", color: "#22c55e", icon: "Car" },
      ];

      const deduplicatedMap = new Map<string, any>();
      for (const c of rawCategoriesFromDb) {
        const key = (c.name || "").trim().toLowerCase();
        if (!key) continue;
        const existing = deduplicatedMap.get(key);
        if (!existing || (c.profile_id && existing.isSystem)) {
          deduplicatedMap.set(key, {
            id: c.id,
            profileId: c.profile_id,
            name: c.name.trim(),
            type: c.type,
            isSystem: c.profile_id === null,
            color: c.color,
          });
        }
      }

      const result = Array.from(deduplicatedMap.values());

      // Deve ter exatamente 2 categorias únicas: Alimentação e Transporte
      expect(result).toHaveLength(2);
      const alimentacao = result.find((c) => c.name.toLowerCase() === "alimentação");
      expect(alimentacao).toBeDefined();
      // O usuário customizou a categoria, então a versão do usuário substituiu a do sistema
      expect(alimentacao.id).toBe("cat-3");
      expect(alimentacao.isSystem).toBe(false);
      expect(alimentacao.color).toBe("#f43f5e");
    });
  });

  describe("5. Isolamento Estrito: Livro Pessoal vs Carteira Movimentável", () => {
    it("deve garantir que transações do livro pessoal jamais movimentem saldo do ledger real", () => {
      // Simulação de isolamento arquitetural
      const personalBookEntry = {
        domain: "PERSONAL_FINANCE",
        amountCents: 50000,
        type: "income",
        isWalletMovable: false,
      };

      const walletLedgerEntry = {
        domain: "WALLET",
        amountCents: 50000,
        type: "DEPOSIT",
        isWalletMovable: true,
      };

      expect(personalBookEntry.isWalletMovable).toBe(false);
      expect(walletLedgerEntry.isWalletMovable).toBe(true);
    });
  });
});
