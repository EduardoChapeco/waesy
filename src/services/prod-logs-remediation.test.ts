import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { invalidateMicroCache } from "@/lib/cache/micro-cache";

const mockMaybeSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEq = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.unmock("@/lib/tenant.server");

vi.mock("@/lib/supabase", () => ({
  getAnonServerClient: () => ({ from: mockFrom }),
  getServerClient: () => ({ from: mockFrom }),
}));

vi.mock("@tanstack/start-server-core", () => ({
  getRequestHeader: () => "",
  getCookie: () => null,
}));

describe("Production Logs Forensic Remediation (2026-11-18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateMicroCache("platform_root_store");
  });

  describe("resolveTenantStoreId preview & reserved host guard", () => {
    it("skips stores slug query on Cloudflare Pages preview hosts (*.pages.dev)", async () => {
      const { resolveTenantStoreId } = await import("@/lib/tenant.server");
      const res1 = await resolveTenantStoreId({ host: "0741e2ce.usewaesy.pages.dev", rawCookie: "" });
      const res2 = await resolveTenantStoreId({ host: "5204cb08.usewaesy.pages.dev:443", rawCookie: "" });
      const res3 = await resolveTenantStoreId({ host: "localhost:3000", rawCookie: "" });
      const res4 = await resolveTenantStoreId({ host: "127.0.0.1:8788", rawCookie: "" });
      const res5 = await resolveTenantStoreId({ host: "www.waesy.com.br", rawCookie: "" });

      expect(res1).toBeNull();
      expect(res2).toBeNull();
      expect(res3).toBeNull();
      expect(res4).toBeNull();
      expect(res5).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("resolves tenant store_id for genuine custom subdomains", async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "store-uuid-123" }, error: null });
      const { resolveTenantStoreId } = await import("@/lib/tenant.server");
      const res = await resolveTenantStoreId({ host: "excelencia-tour.waesy.com.br", rawCookie: "" });

      expect(res).toBe("store-uuid-123");
      expect(mockFrom).toHaveBeenCalledWith("stores");
      expect(mockEq).toHaveBeenCalledWith("slug", "excelencia-tour");
    });
  });

  describe("resolvePlatformRootStore micro-cache deduplication", () => {
    it("deduplicates concurrent root-store lookups into a single DB query", async () => {
      const fakeStore = { id: "root-store-1", slug: "waesy-matriz", is_platform_root: true };
      const maybeSingle = vi.fn().mockResolvedValue({ data: fakeStore, error: null });
      const fakeDb = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => ({ maybeSingle })),
            })),
          })),
        })),
      };

      const { resolvePlatformRootStore } = await import("@/services/master.functions");
      const [a, b, c] = await Promise.all([
        resolvePlatformRootStore(fakeDb),
        resolvePlatformRootStore(fakeDb),
        resolvePlatformRootStore(fakeDb),
      ]);

      expect(a).toEqual(fakeStore);
      expect(b).toEqual(fakeStore);
      expect(c).toEqual(fakeStore);
      expect(fakeDb.from).toHaveBeenCalledTimes(1);
    });
  });

  describe("PostgREST 400 & 409 regression contracts", () => {
    it("contains zero ghost profiles.email selects in remediated BFF services", () => {
      const files = [
        "src/services/b2b-partners.functions.ts",
        "src/services/corporate-travel.functions.ts",
        "src/services/courier-verification.functions.ts",
        "src/services/events.functions.ts",
        "src/services/hr.functions.ts",
        "src/services/kyc.functions.ts",
        "src/registries/mcp-tool-registry.ts",
        "src/services/whatsapp-leads.functions.ts",
        "src/services/jobs.functions.ts",
        "src/services/lead-forms.functions.ts",
      ];

      for (const rel of files) {
        const src = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
        expect(src, `${rel} must not join profiles(...email...)`).not.toMatch(/profiles\([^)]*\bemail\b/i);
        expect(src, `${rel} must not select email directly from profiles`).not.toMatch(
          /\.from\(["']profiles["']\)\s*\.\s*select\([^)]*\bemail\b/i,
        );
      }
    });

    it("prevents writing customers_crm.id into chat_threads.customer_id and quotes.customer_id", () => {
      const chatSrc = fs.readFileSync(path.resolve(process.cwd(), "src/services/chat.functions.ts"), "utf8");
      expect(chatSrc).not.toContain("resolvedCustomerId && !thread.customer_id ? { customer_id: resolvedCustomerId }");
      expect(chatSrc).toContain("crm_customer_id: resolvedCustomerId");

      const proposalSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/services/travel-proposal.functions.ts"),
        "utf8",
      );
      expect(proposalSrc).toContain("quoteProfileCustomerId");

      const waIdentitySrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/services/whatsapp-contact-identity.functions.ts"),
        "utf8",
      );
      expect(waIdentitySrc).not.toContain("if (data.customerId) threadSync.customer_id = data.customerId;");
      expect(waIdentitySrc).toContain("matchedProfile?.id");
    });

    it("normalizes sync_mode before writing whatsapp_history_sync_jobs", () => {
      const waSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/services/whatsapp-channel-instances.functions.ts"),
        "utf8",
      );
      expect(waSrc).toContain("function normalizeWhatsAppSyncMode(");
      expect(waSrc).toContain("normalizeWhatsAppSyncMode((instance as any).sync_mode)");
    });

    it("ships additive SQL migration for production indexes, digest search_path and cron throttle", () => {
      const sqlPath = path.resolve(
        process.cwd(),
        "supabase/migrations/20270523000000_prod_logs_indexes_rpc_perf_and_schema_resilience.sql",
      );
      const sql = fs.readFileSync(sqlPath, "utf8");
      expect(sql).toContain("idx_chat_messages_thread_created_desc");
      expect(sql).toContain("idx_classified_analytics_events_dedup");
      expect(sql).toContain("SET search_path = public, extensions, pg_temp");
      expect(sql).toContain("ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ");
      expect(sql).toContain("dispatch_whatsapp_sync_cron");
    });

    it("uses canonical workspace_members in notifyStoreStaff and valid variable references in travel modals", () => {
      const notifySrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/lib/notifications/store-staff-notify.ts"),
        "utf8",
      );
      expect(notifySrc).toContain('.from("workspace_members")');
      expect(notifySrc).not.toContain('.from("store_members")');

      const dossierSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/classifieds/travel-booking-dossier-modal.tsx"),
        "utf8",
      );
      expect(dossierSrc).toContain("(adultsCount !== 2 || childrenCount > 0)");
      expect(dossierSrc).not.toContain("(adults !== 2 || children > 0)");

      const smartModalSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/tourism/booking/SmartTravelBookingModal.tsx"),
        "utf8",
      );
      expect(smartModalSrc).toContain("maxInstallments?: number;");
      expect(smartModalSrc).not.toContain("(tour as any)?.max_installments");
    });
  });
});
