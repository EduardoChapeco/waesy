import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertExtensionDownloadAuthorized,
  buildExtensionZip,
} from "./extensions-distributor.server";
import * as serverAccessMod from "@/lib/server-access";
import * as supabaseMod from "@/lib/supabase";

describe("extensions-distributor.server", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("assertExtensionDownloadAuthorized", () => {
    it("concede permissão para Admin Master", async () => {
      vi.spyOn(serverAccessMod, "requireStaff").mockResolvedValue({
        id: "user-1",
        store_id: "store-generic",
        role: "admin_master",
      } as any);

      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue({
        id: "user-1",
        isPlatformAdmin: true,
        role: "admin_master",
      } as any);

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "store-generic", name: "Outra Loja", slug: "outra-loja" },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const auth = await assertExtensionDownloadAuthorized();
      expect(auth.authorized).toBe(true);
      expect(auth.isAdminMaster).toBe(true);
    });

    it("concede permissão para membro da agência Excelência Tour SMO", async () => {
      vi.spyOn(serverAccessMod, "requireStaff").mockResolvedValue({
        id: "staff-eduardo",
        store_id: "store-excelencia",
        role: "owner",
      } as any);

      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue({
        id: "staff-eduardo",
        isPlatformAdmin: false,
        role: "owner",
      } as any);

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "store-excelencia",
                  name: "Excelência Tour",
                  slug: "excelencia-tour-smo",
                  city: "São Miguel do Oeste",
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const auth = await assertExtensionDownloadAuthorized();
      expect(auth.authorized).toBe(true);
      expect(auth.isExcelenciaTour).toBe(true);
    });

    it("rejeita com erro descritivo quando usuário não é Admin nem Excelência Tour", async () => {
      vi.spyOn(serverAccessMod, "requireStaff").mockResolvedValue({
        id: "staff-outro",
        store_id: "store-alheia",
        role: "agent",
      } as any);

      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue({
        id: "staff-outro",
        isPlatformAdmin: false,
        role: "agent",
      } as any);

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "store-alheia",
                  name: "Pizzaria Bela Vista",
                  slug: "pizzaria-bela-vista",
                  city: "Chapecó",
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      await expect(assertExtensionDownloadAuthorized("whatsapp_extension")).rejects.toThrow(
        /solicite a autorização de uso na Vitrine Waesy Store/
      );
    });

    it("concede permissão para loja de terceiro autorizada via store.settings.authorized_extensions", async () => {
      vi.spyOn(serverAccessMod, "requireStaff").mockResolvedValue({
        id: "staff-terceiro",
        store_id: "store-parceira",
        role: "agent",
      } as any);

      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue({
        id: "staff-terceiro",
        isPlatformAdmin: false,
        role: "agent",
      } as any);

      const mockSupabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "store-parceira",
                  name: "Agência Viagem Feliz",
                  slug: "agencia-viagem-feliz",
                  city: "Florianópolis",
                  settings: {
                    authorized_extensions: ["whatsapp_extension"],
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const auth = await assertExtensionDownloadAuthorized("whatsapp_extension");
      expect(auth.authorized).toBe(true);
      expect(auth.isWhitelistedStore).toBe(true);
      expect(auth.storeName).toBe("Agência Viagem Feliz");
    });
  });

  describe("buildExtensionZip", () => {
    it("empacota a extensão Infotravel em arquivo ZIP válido", async () => {
      const pkg = await buildExtensionZip("infotravel_extension");
      expect(pkg.filename).toContain("infotravel");
      expect(pkg.contentType).toBe("application/zip");
      expect(pkg.buffer.length).toBeGreaterThan(500);
      expect(pkg.buffer.readUInt32LE(0)).toBe(0x04034b50); // Assinatura PKZIP
    });

    it("empacota a extensão do WhatsApp Web em arquivo ZIP válido", async () => {
      const pkg = await buildExtensionZip("whatsapp_extension");
      expect(pkg.filename).toContain("whatsapp");
      expect(pkg.contentType).toBe("application/zip");
      expect(pkg.buffer.length).toBeGreaterThan(500);
      expect(pkg.buffer.readUInt32LE(0)).toBe(0x04034b50); // Assinatura PKZIP
    });

    it("empacota o minerador e scripts em arquivo ZIP válido", async () => {
      const pkg = await buildExtensionZip("infotravel_miner");
      expect(pkg.filename).toContain("miner");
      expect(pkg.contentType).toBe("application/zip");
      expect(pkg.buffer.length).toBeGreaterThan(500);
      expect(pkg.buffer.readUInt32LE(0)).toBe(0x04034b50); // Assinatura PKZIP
    });
  });
});
