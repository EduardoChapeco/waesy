import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql"),
  "utf8",
);
const lifecycle = fs.readFileSync(
  path.join(root, "src/services/travel-lifecycle.functions.ts"),
  "utf8",
);
const pipeline = fs.readFileSync(
  path.join(root, "src/services/travel-canonical-pipeline.functions.ts"),
  "utf8",
);

function applyHandlerSource() {
  const start = lifecycle.indexOf("export const applyParsedVoucherToTrip");
  const end = lifecycle.indexOf("/**\n * 10. Listagem", start);
  return lifecycle.slice(start, end);
}

describe("Turismo R6 — aplicação atômica de voucher", () => {
  it("usa RPC SECURITY DEFINER com membership, lock e operação idempotente", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.apply_operator_voucher_atomic");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("workspace_members");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("travel_voucher_apply_operations");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.apply_operator_voucher_atomic");
  });

  it("não aceita tenant do body nem cai na primeira loja", () => {
    const handler = applyHandlerSource();
    expect(handler).toContain("await requireStaff()");
    expect(handler).toContain("data.storeId !== identity.store_id");
    expect(handler).toContain("p_store_id: identity.store_id");
    expect(handler).not.toContain("from(\"stores\").select(\"id\").limit(1)");
    expect(handler).not.toContain("Math.random");
  });

  it("mantém o ingestion e a timeline dentro da mesma operação canônica", () => {
    expect(pipeline).toContain("idempotencyKey: `ocr-trip:");
    expect(lifecycle).toContain("p_ingestion_id: data.ingestionId");
    expect(migration).toContain("extraction_status = 'applied'");
    expect(migration).toContain("ocr.applied_to_trip");
    expect(migration).toContain("partial-success exception handler");
  });

  it("preserva a barreira contra aplicação de cotações e conflitos críticos", () => {
    expect(migration).toContain("v_ingestion.source_kind = 'operator_quote'");
    expect(migration).toContain("severity = 'critical'");
    expect(migration).toContain("status IN ('open', 'suggested')");
  });
});
