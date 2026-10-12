import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20270123000000_atomic_civil_token_debit.sql"),
  "utf8",
);
const service = readFileSync(resolve(process.cwd(), "src/services/token-quota.functions.ts"), "utf8");
const identityCore = readFileSync(resolve(process.cwd(), "src/lib/identity-core.ts"), "utf8");

describe("contratos locais de quota e isolamento", () => {
  it("usa lock por quota, ledger único e RPC idempotente", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("UNIQUE (user_id, idempotency_key)");
    expect(migration).toContain("consume_user_civil_tokens_atomic");
    expect(migration).toContain("ON CONFLICT (user_id, quota_date) DO NOTHING");
  });

  it("não permite débito client-controlled sem chave determinística", () => {
    expect(service).toContain("idempotencyKey: z.string().trim().min(8).max(200)");
    expect(service).toContain('.rpc("consume_user_civil_tokens_atomic"');
    expect(service).toContain("Operação de tokens desconhecida");
  });

  it("não mantém o bypass de role sem membership verificável", () => {
    expect(identityCore).not.toContain("if (!targetMembership && !targetStoreId");
  });
});
