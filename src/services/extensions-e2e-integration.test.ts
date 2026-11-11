import { describe, it, expect, vi, beforeEach } from "vitest";
import { EMBEDDED_EXTENSION_BUNDLES } from "@/generated/extensions-bundle.server";
import {
  buildExtensionZip,
  ExtensionForbiddenError,
  adminToggleStoreExtensionAuth,
} from "./extensions-distributor.server";
import {
  authenticateIngest,
  resolveIngestTokenIdentity,
} from "./whatsapp-group-ingest.server";
import {
  normalizeOperatorCode,
  normalizeBrDateToIso,
  parseOperatorCsvToSyncItems,
} from "@/lib/travel-operator-sync";
import {
  parseBrlToCents,
  reconcileOperatorSyncBatch,
} from "./travel-operator-sync.server";
import * as serverAccessMod from "@/lib/server-access";
import * as supabaseMod from "@/lib/supabase";

describe("Extensions End-to-End Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Embedded ZIP Bundles & Manifest Hygiene", () => {
    it("contém todos os pacotes sem vazamento de output CSVs, logs ou .chrome-session", () => {
      for (const key of ["infotravel_extension", "whatsapp_extension", "infotravel_miner"] as const) {
        const entries = EMBEDDED_EXTENSION_BUNDLES[key];
        expect(entries.length).toBeGreaterThan(3);

        for (const entry of entries) {
          expect(entry.path).not.toMatch(/^output\//i);
          expect(entry.path).not.toMatch(/\.log$/i);
          expect(entry.path).not.toMatch(/\.chrome-session/i);
          expect(entry.path).not.toMatch(/^node_modules\//i);
        }
      }
    });

    it("manifest da extensão Infotravel cobre Orinter, Incomum, FRT, Schultz, */*infotravel* e ícones MV3", () => {
      const entries = EMBEDDED_EXTENSION_BUNDLES.infotravel_extension;
      const manifestEntry = entries.find((e) => e.path === "manifest.json");
      expect(manifestEntry).toBeDefined();

      const manifest = JSON.parse(Buffer.from(manifestEntry!.base64, "base64").toString("utf-8"));
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.icons["16"]).toBe("icons/icon16.png");
      expect(manifest.permissions).toContain("scripting");
      expect(manifest.optional_host_permissions).toContain("https://*/*");
      expect(manifest.host_permissions).toEqual(
        expect.arrayContaining([
          "*://*.orinter.com.br/*",
          "*://*.incomumviagens.com.br/*",
          "*://*.frt.com.br/*",
          "*://*.schultz.com.br/*",
          "*://*/*infotravel*",
        ]),
      );

      for (const iconPath of ["icons/icon16.png", "icons/icon48.png", "icons/icon128.png"]) {
        const iconEntry = entries.find((e) => e.path === iconPath);
        expect(iconEntry).toBeDefined();
        const buf = Buffer.from(iconEntry!.base64, "base64");
        expect(buf.readUInt32BE(0)).toBe(0x89504e47); // Assinatura PNG
      }
    });

    it("buildExtensionZip funciona usando bundle embutido com assinatura PKZIP válida", async () => {
      const zip = await buildExtensionZip("infotravel_extension");
      expect(zip.filename).toBe("waesy-sync-infotravel-v2.2.zip");
      expect(zip.buffer.readUInt32LE(0)).toBe(0x04034b50);
    });

    it("ExtensionForbiddenError expõe status HTTP 403", () => {
      const err = new ExtensionForbiddenError("Bloqueado");
      expect(err.status).toBe(403);
      expect(err.name).toBe("ExtensionForbiddenError");
    });
  });

  describe("2. Governança Bilateral (stores.settings + workspace_feature_grants)", () => {
    it("sincroniza workspace_feature_grants quando adminToggleStoreExtensionAuth habilita/desabilita extensão", async () => {
      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue({
        id: "admin-uuid-1",
        isPlatformAdmin: true,
        role: "admin_master",
      } as any);

      const grantUpserts: any[] = [];
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "stores") {
            const storeData = {
              id: "store-parceira-1",
              settings: { authorized_extensions: [] as string[] },
            };
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: storeData, error: null }),
                  maybeSingle: vi.fn().mockResolvedValue({ data: storeData, error: null }),
                }),
              }),
              update: vi.fn((payload: any) => {
                if (payload?.settings) storeData.settings = payload.settings;
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          if (table === "workspace_feature_grants") {
            return {
              upsert: vi.fn((payload: any) => {
                grantUpserts.push(payload);
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const enabledRes = await adminToggleStoreExtensionAuth({
        storeId: "store-parceira-1",
        extensionType: "infotravel_extension",
        authorized: true,
      });
      expect(enabledRes.authorizedExtensions).toContain("infotravel_extension");
      expect(grantUpserts).toHaveLength(1);
      expect(grantUpserts[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            store_id: "store-parceira-1",
            feature_key: "infotravel_sync",
            enabled: true,
          }),
        ]),
      );

      const disabledRes = await adminToggleStoreExtensionAuth({
        storeId: "store-parceira-1",
        extensionType: "infotravel_extension",
        authorized: false,
      });
      expect(disabledRes.authorizedExtensions).not.toContain("infotravel_extension");
      expect(grantUpserts[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            store_id: "store-parceira-1",
            feature_key: "infotravel_sync",
            enabled: false,
          }),
        ]),
      );
    });
  });

  describe("3. Autenticação Escopada por Feature Key", () => {
    it("rejeita infotravel_sync se a loja só tiver whatsapp_group_ingest e resolve whoami com scopes", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "ingest_tokens") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "token-1",
                      store_id: "store-parceira-wa",
                      revoked_at: null,
                      expires_at: "2099-01-01T00:00:00Z",
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "workspace_feature_grants") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn((_col: string, _val: string) => ({
                  eq: vi.fn((_c2: string, val2: any) => {
                    if (val2 === true) {
                      return Promise.resolve({
                        data: [{ feature_key: "whatsapp_group_ingest", enabled: true }],
                        error: null,
                      });
                    }
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: val2 === "whatsapp_group_ingest" ? { enabled: true } : null,
                        error: null,
                      }),
                    };
                  }),
                })),
              }),
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === "stores") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "store-parceira-wa",
                      name: "Agência Só Whats",
                      slug: "agencia-so-whats",
                      city: "Chapecó",
                      settings: { authorized_extensions: ["whatsapp_extension"] },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const req = new Request("https://waesy.com.br/api/v1/ingest/infotravel-reservations", {
        headers: { Authorization: "Bearer wae_1234567890abcdef1234567890abcdef" },
      });

      const forbiddenInfotravel = await authenticateIngest(req, "infotravel_sync");
      expect(forbiddenInfotravel.ok).toBe(false);
      if (!forbiddenInfotravel.ok) expect(forbiddenInfotravel.status).toBe(403);

      const allowedWa = await authenticateIngest(req, "whatsapp_group_ingest");
      expect(allowedWa.ok).toBe(true);

      const identity = await resolveIngestTokenIdentity(req);
      expect(identity.ok).toBe(true);
      if (identity.ok) {
        expect(identity.scopes).toEqual(["whatsapp_group_ingest"]);
        expect(identity.store.name).toBe("Agência Só Whats");
      }
    });
  });

  describe("4. Parser CSV RFC-4180 Canônico & Normalização de Operadoras", () => {
    it("normaliza operadores e datas BR e agrupa múltiplos passageiros da mesma reserva", () => {
      expect(normalizeOperatorCode("FRT Operadora")).toBe("frt");
      expect(normalizeOperatorCode("Schultz Turismo")).toBe("schultz");
      expect(normalizeBrDateToIso("15/08/2027")).toBe("2027-08-15");
      expect(parseBrlToCents("R$ 12.450,90")).toBe(1245090);

      const csv = [
        "\uFEFF\"ID Reserva\";\"Status Reserva\";\"Data Criacao\";\"Check-in\";\"Check-out\";\"Operadora\";\"Contato Titular\";\"Email Contato\";\"Telefone Contato\";\"Nome Passageiro\";\"CPF Passageiro\";\"Data Nascimento\";\"Idade\";\"Tipo (ADT/CHD/INF)\";\"E Titular?\";\"Hotel / Destino\";\"Acomodacao\";\"Localizador\";\"Valor Total Venda (R$)\";\"Taxas Inclusas (R$)\";\"Impostos Inclusos (R$)\";\"Forma de Pagamento\";\"Status Pagamento\";\"Score Confianca\";\"Banco Emissor\";\"Parcelamento\";\"Comissao Agencia (R$)\"",
        "\"13567890\";\"Confirmada\";\"20/10/2026\";\"10/01/2027\";\"17/01/2027\";\"frt\";\"Carlos Silva\";\"carlos@teste.com\";\"(49) 99999-8888\";\"Carlos Silva\";\"12345678901\";\"15/05/1982\";\"44\";\"ADT\";\"SIM\";\"Resort; Cancún\";\"Master\";\"ABC123\";\"10.000,00\";\"500,00\";\"0,00\";\"Boleto Faturado\";\"Aprovado\";\"95\";\"Itaú\";\"10x\";\"1.200,00\"",
        "\"13567890\";\"Confirmada\";\"20/10/2026\";\"10/01/2027\";\"17/01/2027\";\"frt\";\"Carlos Silva\";\"carlos@teste.com\";\"(49) 99999-8888\";\"Ana Silva\";\"98765432100\";\"20/08/1985\";\"41\";\"ADT\";\"NAO\";\"Resort; Cancún\";\"Master\";\"ABC123\";\"10.000,00\";\"500,00\";\"0,00\";\"Boleto Faturado\";\"Aprovado\";\"95\";\"Itaú\";\"10x\";\"1.200,00\"",
      ].join("\n");

      const items = parseOperatorCsvToSyncItems(csv, "orinter");
      expect(items).toHaveLength(1);
      expect(items[0].operatorSlug).toBe("frt");
      expect(items[0].checkIn).toBe("10/01/2027");
      expect(items[0].hotel).toBe("Resort; Cancún");
      expect(items[0].localizador).toBe("ABC123");
      expect(items[0].passageiros).toHaveLength(2);
    });
  });

  describe("5. Reconciliação SQL Real (Colunas Verificadas)", () => {
    it("grava nas colunas reais de customers_crm, tourism_trips, trip_passengers, travel_departures_kanban e financial_sheets", async () => {
      const writes: Record<string, any[]> = {};
      const record = (table: string, row: any) => {
        if (!writes[table]) writes[table] = [];
        writes[table].push(row);
      };

      const makeChain = (table: string) => {
        const chain: any = {
          eq: vi.fn(() => chain),
          or: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn((payload: any) => {
            const rows = Array.isArray(payload) ? payload : [payload];
            rows.forEach((r) => record(table, r));
            const first = { id: `${table}-new-1`, ...rows[0] };
            return {
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: first, error: null }),
                single: vi.fn().mockResolvedValue({ data: first, error: null }),
              })),
              error: null,
            };
          }),
          update: vi.fn((payload: any) => {
            record(table, { _update: payload });
            const uChain: any = {
              eq: vi.fn(() => uChain),
              then: (resolve: any) => resolve({ error: null }),
            };
            return uChain;
          }),
        };
        return chain;
      };

      const mockSupabase: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => makeChain(table)),
          insert: vi.fn((payload: any) => makeChain(table).insert(payload)),
          update: vi.fn((payload: any) => makeChain(table).update(payload)),
        })),
      };
      vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

      const summary = await reconcileOperatorSyncBatch({
        storeId: "store-uuid-1",
        operatorCode: "incomum",
        sourceKind: "browser_extension",
        items: [
          {
            id: "13998877",
            status: "Confirmada",
            criacao: "25/10/2026",
            checkIn: "15/02/2027",
            checkOut: "22/02/2027",
            operatorSlug: "incomum",
            contato: "Mariana Costa",
            email: "mariana@costa.com",
            telefone: "(49) 98888-1122",
            hotel: "Costão do Santinho",
            acomodacao: "Suíte Luxo",
            localizador: "LOC998",
            valorTotal: "8.500,00",
            taxas: "300,00",
            impostos: "0,00",
            comissao: "850,00",
            formaPagto: "Boleto Faturado",
            statusPagto: "Aprovado",
            scoreConfianca: 95,
            bancoEmissor: "Santander",
            parcelamento: "5x",
            passageiros: [
              { nome: "Mariana Costa", cpf: "11122233344", birthDate: "10/03/1990", tipo: "ADT", titular: true },
              { nome: "Lucas Costa", cpf: "", birthDate: "12/06/2018", tipo: "CHD", titular: false },
            ],
          },
        ],
      });

      expect(summary.success).toBe(true);
      expect(summary.reconciledTripsCount).toBe(1);
      expect(summary.reconciledCustomersCount).toBe(1);
      expect(summary.totalPax).toBe(2);
      expect(summary.errors).toHaveLength(0);

      // Verifica nomes exatos das colunas no schema Postgres
      expect(writes.customers_crm[0]).toMatchObject({
        store_id: "store-uuid-1",
        full_name: "Mariana Costa",
        email: "mariana@costa.com",
      });
      expect(writes.tourism_trips[0]).toMatchObject({
        store_id: "store-uuid-1",
        trip_number: "OP-INCOMUM-13998877",
        destination_city: "Costão do Santinho",
        travel_start_date: "2027-02-15",
        travel_end_date: "2027-02-22",
        total_cents: 850000,
        operator_name: "INCOMUM",
      });
      expect(writes.tourism_trips[0]).not.toHaveProperty("total_price_cents");
      expect(writes.trip_passengers[0]).toMatchObject({
        full_name: "Mariana Costa",
        birth_date: "1990-03-10",
        is_lead_passenger: true,
      });
      expect(writes.travel_departures_kanban[0]).toMatchObject({
        stage: "booked",
        passengers_count: 2,
        airline_locator: "LOC998",
      });
      expect(writes.travel_sale_financial_sheets[0]).toMatchObject({
        gross_sale_cents: 850000,
        commission_calculated_cents: 85000,
        agency_revenue_cents: 85000,
        primary_operator: "INCOMUM",
        locator_code: "LOC998",
      });
    });
  });

  describe("6. Zero-Trust Auth & Target FK Integrity", () => {
    it("endpoint /api/v1/ingest/infotravel-quotes rejeita requisição anônima com 401 mesmo com storeId no body", async () => {
      vi.spyOn(serverAccessMod, "getServerIdentity").mockResolvedValue(null as any);
      const { Route } = await import("@/routes/api.v1.ingest.infotravel-quotes");
      const handlers = (Route as any).options?.server?.handlers;
      expect(handlers?.POST).toBeTypeOf("function");

      const req = new Request("https://waesy.com.br/api/v1/ingest/infotravel-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
          destinationCity: "Lisboa",
          totalCents: 100000,
        }),
      });

      const res: Response = await handlers.POST({ request: req });
      expect(res.status).toBe(401);
    });
  });
});
