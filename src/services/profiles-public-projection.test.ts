import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20270121000000_profiles_public_projection.sql"),
  "utf8",
);

describe("profiles — projeção pública", () => {
  it("remove SELECT público da tabela base e expõe somente a view mínima", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles');
    expect(migration).toContain("CREATE POLICY \"profiles_select_own\"");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.profiles_public");
    expect(migration).toContain("GRANT SELECT ON public.profiles_public TO anon, authenticated");
  });

  it("não inclui campos civis, financeiros ou de autorização na projeção", () => {
    const projection = migration.slice(migration.indexOf("SELECT"), migration.indexOf("FROM public.profiles"));
    for (const sensitiveField of ["cpf", "tax_id", "phone", "pix_settings", "pos_pin_code", "resume_data", "role"]) {
      expect(projection).not.toContain(sensitiveField);
    }
  });
});
