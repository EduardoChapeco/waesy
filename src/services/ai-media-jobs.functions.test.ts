import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const service = fs.readFileSync(path.resolve(process.cwd(), "src/services/ai-media-jobs.functions.ts"), "utf8");
const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20261007000001_ai_media_jobs_quota_lifecycle.sql"), "utf8");

describe("AI media jobs — W9.3", () => {
  it("cria job de imagem com idempotency key tenant-scoped", () => {
    expect(service).toContain("stableIdempotencyKey");
    expect(service).toContain('eq("store_id", identity.store_id)');
    expect(service).toContain('eq("idempotency_key", idempotencyKey)');
    expect(service).toContain('task: "imagem"');
    expect(service).toContain("idempotent: true");
  });

  it("expõe somente o job do usuário e loja atuais", () => {
    expect(service).toContain('eq("user_id", identity.id)');
    expect(service).toContain('eq("store_id", identity.store_id)');
    expect(service).toContain("progress_percent");
    expect(service).toContain("provider_job_id");
  });

  it("migration implementa claim com SKIP LOCKED, cancelamento e retry limitado", () => {
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("attempt_count < max_attempts");
    expect(migration).toContain("request_cancel_ai_async_job");
    expect(migration).toContain("retry_ai_async_job");
    expect(migration).toContain("status = 'queued'");
  });

  it("cobra somente na finalização bem-sucedida e evita cobrança duplicada", () => {
    expect(migration).toContain("ai_job_charges");
    expect(migration).toContain("ON CONFLICT (job_id) DO NOTHING");
    expect(migration).toContain("consume_store_tokens_scoped");
    expect(migration).toContain("IF p_success THEN");
    expect(migration).toContain("quota_charged");
  });

  it("não expõe RPCs de worker ao público", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.claim_ai_async_job");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toMatch(/GRANT EXECUTE ON FUNCTION[^;]+ TO PUBLIC/i);
  });
});
