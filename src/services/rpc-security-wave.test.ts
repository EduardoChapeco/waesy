import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261007130000_rpc_grants_and_explicit_profile_provisioning.sql"),
  "utf8",
);
const authSource = readFileSync(resolve(process.cwd(), "src/services/auth.functions.ts"), "utf8");

 describe("RPC security and explicit identity provisioning", () => {
  it("removes the auth trigger and handle_new_user instead of redefining it", () => {
    expect(migration).toContain("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users");
    expect(migration).toContain("DROP FUNCTION IF EXISTS public.handle_new_user()");
    expect(migration).toContain("RAISE EXCEPTION 'handle_new_user ainda existe'");
    expect(authSource).not.toContain("trigger `handle_new_user`");
  });

  it("revokes public execution from SECURITY DEFINER functions and preserves server_role", () => {
    expect(migration).toContain("p.prosecdef = true");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("has_function_privilege('anon'");
  });

  it("provisions only a customer profile explicitly after Auth creation", () => {
    expect(authSource).toContain('.from("profiles")');
    expect(authSource).toContain('.upsert(profilePayload, { onConflict: "id" })');
    expect(authSource).toContain('role: "customer" as const');
    expect(authSource).not.toContain('from("organizations").insert');
    expect(authSource).not.toContain('from("workspace_members").upsert');
  });

  it("removes the fake public store name from the new magic-link function", () => {
    expect(migration).toContain("'store_name', v_store.name");
    expect(migration).not.toContain("Agência de Viagens");
  });
});
