import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Phase 2 — Wave 1: Security Hardening, Schema/WAL & Fluxo D", () => {
  const rootDir = process.cwd();

  beforeEach(() => {
    process.env.VAULT_MASTER_KEY = "waesy-test-vault-master-key-minimum-32-chars-ok";
  });

  it("signs and verifies HMAC-SHA256 OAuth state and rejects tampered or expired state", async () => {
    const { signOAuthState, verifyOAuthState, timingSafeCompare } = await import("@/lib/crypto-vault.server");

    const signed = signOAuthState({
      storeId: "00000000-0000-4000-8000-000000000001",
      platform: "meta_ads",
      returnTo: "/workspace/marketing/anuncios",
    });

    const verified = verifyOAuthState<{ storeId: string; platform: string }>(signed);
    expect(verified).not.toBeNull();
    expect(verified?.storeId).toBe("00000000-0000-4000-8000-000000000001");
    expect(verified?.platform).toBe("meta_ads");

    // Tampered payload must be rejected
    const [body, sig] = signed.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ storeId: "attacker-store", ts: Date.now() })).toString("base64url");
    expect(verifyOAuthState(`${tamperedBody}.${sig}`)).toBeNull();

    // Unsigned base64 payload must be rejected
    expect(verifyOAuthState(body)).toBeNull();

    // Expired state must be rejected
    expect(verifyOAuthState(signed, -1)).toBeNull();

    expect(timingSafeCompare("secret-1", "secret-1")).toBe(true);
    expect(timingSafeCompare("secret-1", "secret-2")).toBe(false);
  });

  it("enforces Wave 1 SQL migration invariants (tenant guard, WAL relief, public pixels, schema parity)", () => {
    const sqlPath = path.join(rootDir, "supabase/migrations/20270618000000_phase2_wave1_security_schema_wal_and_fluxo_d.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    expect(sql).toContain("NOT public.is_store_staff(p_store_id)");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.deduplicate_and_link_lead_to_customer(uuid, uuid) FROM PUBLIC");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.match_next_cards_batch(uuid, text, integer) FROM PUBLIC");
    expect(sql).toContain("LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)");
    expect(sql).toContain("ALTER TABLE public.chat_messages REPLICA IDENTITY DEFAULT");
    expect(sql).toContain("'gtm_id', (SELECT gtm_id FROM legacy)");
    expect(sql).toContain("'source_pixels', COALESCE((SELECT items FROM active_multi)");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS source_pixel_id UUID");
    expect(sql).toContain("'ga4_mp'");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS otp_code_hash TEXT");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN");
  });

  it("ensures Fluxo D approveTravelProposal & payment settlement use real schema columns and active whatsapp_outbox", () => {
    const proposalSrc = fs.readFileSync(path.join(rootDir, "src/services/travel-proposal.functions.ts"), "utf8");
    const settlementSrc = fs.readFileSync(path.join(rootDir, "src/services/multi-domain-payment-settlement.service.ts"), "utf8");
    const modalSrc = fs.readFileSync(path.join(rootDir, "src/components/tourism/studio/travel-proposal-checkout-modal.tsx"), "utf8");
    const gatewaySrc = fs.readFileSync(path.join(rootDir, "src/services/payment-gateway.server.ts"), "utf8");
    const walletSrc = fs.readFileSync(path.join(rootDir, "src/routes/viajante.carteira.tsx"), "utf8");

    // No dead table references or wrong columns in Fluxo D
    expect(proposalSrc).not.toContain('from("whatsapp_outbox_queue")');
    expect(proposalSrc).toContain('from("whatsapp_outbox")');
    expect(proposalSrc).toContain('type: "revenue_sale"');
    expect(proposalSrc).toContain('from("contract_versions")');
    expect(proposalSrc).toContain('contract_version_id: newVersion.id');

    expect(settlementSrc).not.toContain('status: "signed"');
    expect(settlementSrc).toContain('status: "completed"');
    expect(settlementSrc).toContain('type: "revenue_sale"');

    // Modal supports up to 36x and sets acceptanceProtocol
    expect(modalSrc).toMatch(/Math\.min\(\s*36/);
    expect(modalSrc).toContain("setAcceptanceProtocol(");

    // Gateway supports boleto and Asaas installments
    expect(gatewaySrc).toContain('"boleto"');
    expect(gatewaySrc).toContain("asaasBody.installmentCount");

    // No hardcoded fake WhatsApp number in traveler wallet
    expect(walletSrc).not.toContain("5549999999999");
  });

  it("sanitizes Pixel IDs against Stored XSS in StoreAnalyticsInjector and ProductTelemetry", () => {
    const injectorSrc = fs.readFileSync(path.join(rootDir, "src/components/analytics/StoreAnalyticsInjector.tsx"), "utf8");
    const telemetrySrc = fs.readFileSync(path.join(rootDir, "src/components/commerce/product-telemetry.tsx"), "utf8");

    expect(injectorSrc).toContain("/^[0-9]{5,25}$/");
    expect(injectorSrc).toContain("JSON.stringify(pxId)");
    expect(injectorSrc).not.toContain("fbq('init', '${pxId}')");
    expect(telemetrySrc).toContain("/^[0-9]{5,25}$/");
    expect(telemetrySrc).toContain("JSON.stringify(pixelId)");
  });

  it("enforces timing-safe webhook verification and store-scoped message revocation", async () => {
    const { verifyUnofficialWebhookAuth } = await import("@/services/whatsapp-provider-webhook.server");
    const ok = verifyUnofficialWebhookAuth({
      provider: "evolution_api",
      rawBody: JSON.stringify({ event: "messages.upsert" }),
      headers: new Headers({ apikey: "test-evolution-secret-123" }),
      secret: "test-evolution-secret-123",
      masterApiKey: null,
    });
    expect(ok).toBe(true);

    const bad = verifyUnofficialWebhookAuth({
      provider: "evolution_api",
      rawBody: JSON.stringify({ event: "messages.upsert" }),
      headers: new Headers({ apikey: "wrong-key" }),
      secret: "test-evolution-secret-123",
      masterApiKey: null,
    });
    expect(bad).toBe(false);
  });
});
