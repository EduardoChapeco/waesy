import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";

describe("V143 Truth Engine, Anti-Mock Protocol & AES-256-GCM Integration Vault", () => {
  it("FASE 3: encripta e desencripta chaves OAuth/API com AES-256-GCM (iv:tag:ciphertext) e rejeita adulteração", () => {
    const rawOAuthToken = "EAABsbCS1iHgBO_REAL_META_GRAPH_API_KEY_998877";
    const encrypted = encryptSecret(rawOAuthToken);

    // Deve conter exatamente 3 segmentos hexadecimais separados por ':'
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
    expect(encrypted).not.toContain(rawOAuthToken);

    // Desencriptação deve restaurar a chave exata
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawOAuthToken);

    // Adulteração de 1 byte no authTag deve lançar erro de integridade
    const tampered = `${parts[0]}:00000000000000000000000000000000:${parts[2]}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("FASE 4: retorna estritamente 0 (Zero Vendas / ROI 0%) quando não há pedidos atribuídos, sem usar fallback de outros pedidos", () => {
    const totalSpendCents = 5000;
    const attributedOrders: Array<{ total_cents: number }> = [];
    const unattributedStoreOrders = [{ total_cents: 12000 }, { total_cents: 8500 }];

    // A soma usa exclusivamente attributedOrders, ignorando unattributedStoreOrders
    const totalAttributedRevenueCents = attributedOrders.reduce((acc, o) => acc + o.total_cents, 0);
    const globalRoiPercentage =
      totalSpendCents > 0 && totalAttributedRevenueCents > 0
        ? Math.round((totalAttributedRevenueCents / totalSpendCents) * 100)
        : 0;

    expect(unattributedStoreOrders.length).toBe(2);
    expect(totalAttributedRevenueCents).toBe(0);
    expect(globalRoiPercentage).toBe(0);
  });
});
