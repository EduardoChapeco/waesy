import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const mockInsert = vi.fn().mockReturnValue({
  then: (cb: (res: { error: null }) => void) => {
    cb({ error: null });
    return Promise.resolve({ error: null });
  },
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
  getAnonServerClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

import { logSystemError } from "@/lib/logger";
import { handleCronWorker } from "@/routes/api.cron.mining-worker";
import { handleCronWhatsAppSync } from "@/routes/api.cron.whatsapp-sync";
import {
  clampInstallments,
  MAX_SUPPORTED_INSTALLMENTS,
  buildInstallmentOptionsFromPolicy,
  normalizeSupplierPaymentPolicy,
} from "@/lib/tourism/payment-policy";

describe("Operação Saneamento Total — Resiliência, Zero Consumo Ocioso & Paridade de Builders", () => {
  beforeEach(() => {
    mockInsert.mockClear();
  });

  describe("EARS-RES-02: Proteção de Disco/WAL no Logger (Capping + Barreira Anti-Cascata)", () => {
    it("bloqueia escrita recursiva em system_error_logs quando o erro é de indisponibilidade de banco/disco", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logSystemError({
        route: "/entrar",
        errorMessage: 'could not write to file "pg_wal/xlogtemp": No space left on device',
      });
      logSystemError({
        route: "/entrar",
        errorMessage: "connect ECONNREFUSED 127.0.0.1:5432",
      });
      logSystemError({
        route: "/rest/v1",
        errorMessage: "Could not query the database for the schema cache (PGRST002)",
      });
      expect(mockInsert).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("trunca payloads JSON gigantes (>2KB) e mensagens longas (>1KB) antes de gravar", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const hugePayload = { dump: "X".repeat(12_000) };
      const hugeMessage = "ERR_".repeat(600);

      logSystemError({
        route: "/workspace/turismo",
        errorMessage: hugeMessage,
        payload: hugePayload,
        pageUrl: "https://waesy.com.br/" + "a".repeat(800),
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.error_message.length).toBeLessThanOrEqual(1024);
      expect(inserted.page_url.length).toBeLessThanOrEqual(500);
      expect(inserted.payload).toMatchObject({ _truncated: true });
      expect(JSON.stringify(inserted.payload).length).toBeLessThan(2048);
      spy.mockRestore();
    });
  });

  describe("EARS-RES-01: Zero Consumo Ocioso em Workers de Cron", () => {
    it("handleCronWorker ignora disparos autônomos de pg_cron sem flag manualTrigger", async () => {
      const req = new Request("http://localhost/api/cron/mining-worker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer waesy_omni_cron_key_v2026",
        },
        body: JSON.stringify({ jobType: "rss-fetcher", source: "pg_cron" }),
      });
      const res = await handleCronWorker(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.skipped).toBe(true);
      expect(json.reason).toBe("autonomous_mining_disabled_ears_res_01");
    });

    it("handleCronWhatsAppSync ignora disparos autônomos sem opt-in ou disparo manual", async () => {
      const prev = process.env.WAESY_CRON_TOKEN;
      process.env.WAESY_CRON_TOKEN = "test-worker-token-saneamento";
      try {
        const req = new Request("http://localhost/api/cron/whatsapp-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-worker-token-saneamento",
          },
          body: JSON.stringify({ mode: "sync", source: "pg_cron_pg_net" }),
        });
        const res = await handleCronWhatsAppSync(req);
        expect(res.status).toBe(200);
        const json = (await res.json()) as any;
        expect(json.skipped).toBe(true);
        expect(json.reason).toBe("autonomous_whatsapp_cron_disabled_ears_res_01");
      } finally {
        if (prev === undefined) delete process.env.WAESY_CRON_TOKEN;
        else process.env.WAESY_CRON_TOKEN = prev;
      }
    });
  });

  describe("EARS-UNI-01: Paridade Contínua de Parcelamento 1x–36x sem Saltos (13x, 16x, 25x, 36x)", () => {
    it("suporta todos os valores contínuos de 1 a 36 inclusive 13x, 16x, 25x e 36x", () => {
      expect(MAX_SUPPORTED_INSTALLMENTS).toBe(36);
      for (const n of [1, 2, 10, 12, 13, 14, 15, 16, 18, 24, 25, 30, 36]) {
        expect(clampInstallments(n, 12)).toBe(n);
      }
      expect(clampInstallments(50, 12)).toBe(36);
      expect(clampInstallments(0, 12)).toBe(12);
    });

    it("gera opções de pagamento de 16x cartão e 16x boleto sem truncar para 12x ou 24x", () => {
      const policy = normalizeSupplierPaymentPolicy({
        max_card_installments: 16,
        max_boleto_installments: 16,
        pix_discount_pct: 5,
        allowed_payment_methods: ["pix", "credit_card", "boleto"],
      });
      const opts = buildInstallmentOptionsFromPolicy(160_000, policy);
      const card = opts.find((o) => o.method === "credit_card");
      const boleto = opts.find((o) => o.method === "boleto");
      expect(card?.installments_count).toBe(16);
      expect(card?.installment_value_cents).toBe(10_000);
      expect(boleto?.installments_count).toBe(16);
    });

    it("comprova que travel-package-form, classified-payment-methods e flyer não truncam mais em 24x", () => {
      const pkgForm = fs.readFileSync(
        path.resolve("src/components/commerce/travel/travel-package-form.tsx"),
        "utf8",
      );
      expect(pkgForm).not.toContain("Math.min(24, paymentConditions.installments_max");
      expect(pkgForm).not.toContain("Math.min(24, paymentConditions.boleto_installments");

      const classifiedPay = fs.readFileSync(
        path.resolve("src/components/classifieds/creator/sections/classified-payment-methods-section.tsx"),
        "utf8",
      );
      expect(classifiedPay).toContain("MAX_SUPPORTED_INSTALLMENTS");
      expect(classifiedPay).not.toContain("max={24}");

      const flyerModal = fs.readFileSync(
        path.resolve("src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx"),
        "utf8",
      );
      expect(flyerModal).toContain("MAX_SUPPORTED_INSTALLMENTS");
      expect(flyerModal).toContain("Parcelas Personalizadas");
    });

    it("comprova remoção dos duplicados legados StudioFrame.tsx e StudioUnsplashPicker.tsx", () => {
      expect(fs.existsSync(path.resolve("src/components/tourism/studio/StudioFrame.tsx"))).toBe(false);
      expect(fs.existsSync(path.resolve("src/components/tourism/studio/StudioUnsplashPicker.tsx"))).toBe(false);
      expect(fs.existsSync(path.resolve("src/components/tourism/studio/studio-frame.tsx"))).toBe(true);
    });
  });

  describe("FASE 7: Governança SQL Anti-Bloat & Script Hard Reset", () => {
    it("migração 20270617000000 existe e contém unschedule + purge_transient_bloat + trigger de capping", () => {
      const sql = fs.readFileSync(
        path.resolve("supabase/migrations/20270617000000_anti_bloat_ttl_governance_and_disable_idle_crons.sql"),
        "utf8",
      );
      expect(sql).toContain("cron.unschedule");
      expect(sql).toContain("purge_transient_bloat");
      expect(sql).toContain("trg_cap_system_error_log_row");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.purge_transient_bloat");
    });

    it("script de hard reset trava estritamente no projeto jfuebqmltksyznovhlwa e bloqueia mirhhypunfwbxnmpcnjs", () => {
      const script = fs.readFileSync(
        path.resolve("scripts/ops/phase5-controlled-hard-reset.mjs"),
        "utf8",
      );
      expect(script).toContain('ALLOWED_PROJECT_REF = "jfuebqmltksyznovhlwa"');
      expect(script).toContain('FORBIDDEN_PROJECT_REF = "mirhhypunfwbxnmpcnjs"');
      expect(script).toContain("--confirm-hard-reset");
    });
  });
});
