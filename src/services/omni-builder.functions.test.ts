import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const serviceFile = fs.readFileSync(
  path.resolve(process.cwd(), "src/services/omni-builder.functions.ts"),
  "utf8",
);
const migrationFile = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261007000000_builder_versioned_omni_snapshots.sql",
  ),
  "utf8",
);

function functionBody(name: string): string {
  const start = serviceFile.indexOf(`export const ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = serviceFile.indexOf("export const ", start + 1);
  return serviceFile.slice(start, next < 0 ? undefined : next);
}

describe("Omni Builder — persistência versionada W8.2/W8.3", () => {
  it("save chama a RPC canônica com tenant e ator derivados da sessão", () => {
    const body = functionBody("saveOmniPageDocument");
    expect(body).toContain('db.rpc("persist_omni_document_snapshot"');
    expect(body).toContain("p_store_id: identity.store_id");
    expect(body).toContain("p_actor_id: identity.id");
    expect(body).toContain("p_publish: false");
    expect(body).toContain("!result?.version_id");
  });

  it("publish exige versão publicada confirmada e não faz update best-effort", () => {
    const body = functionBody("publishOmniPageDocument");
    expect(body).toContain('db.rpc("persist_omni_document_snapshot"');
    expect(body).toContain("p_publish: true");
    expect(body).toContain('result.version_status !== "published"');
    expect(body).toContain("version_id: result.version_id");
    expect(body).not.toContain('.from("experience_documents")');
  });

  it("get reidrata primeiro a versão draft persistida e mantém fallback legado explícito", () => {
    const body = functionBody("getOmniPageDocument");
    expect(body).toContain('.from("experience_versions")');
    expect(body).toContain('.eq("status", "draft")');
    expect(body).toContain(".eq(\"store_id\", identity.store_id)");
    expect(body).toContain("draftVersion?.document_snapshot");
    expect(body).toContain("settings.omni_page_draft ?? settings.omni_page");
  });

  it("migration implementa lock, ownership, idempotência, arquivamento e snapshot", () => {
    expect(migrationFile).toContain("ADD COLUMN IF NOT EXISTS document_snapshot JSONB");
    expect(migrationFile).toContain("CREATE OR REPLACE FUNCTION public.persist_omni_document_snapshot");
    expect(migrationFile).toContain("FOR UPDATE");
    expect(migrationFile).toContain("v_latest_draft.document_snapshot = p_snapshot");
    expect(migrationFile).toContain("SET status = 'archived'");
    expect(migrationFile).toContain("jsonb_set(v_settings, '{omni_page_draft}'");
    expect(migrationFile).toContain("'{omni_page_published}'");
    expect(migrationFile).toContain("REVOKE ALL ON FUNCTION");
    expect(migrationFile).toContain("GRANT EXECUTE ON FUNCTION");
  });

  it("migration não concede execução pública da RPC", () => {
    expect(migrationFile).not.toMatch(/GRANT EXECUTE ON FUNCTION[^;]+ TO PUBLIC/i);
    expect(migrationFile).toContain("TO service_role");
  });
});
