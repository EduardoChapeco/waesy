import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

const mockDb: any = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
  getAnonServerClient: () => mockDb,
}));

const mockGetServerIdentity = vi.fn();
vi.mock("@/lib/server-access", () => ({
  getSSRClient: async () => mockDb,
  getServerIdentity: (...args: any[]) => mockGetServerIdentity(...args),
  assertStoreAccess: vi.fn(),
  MANAGER_ROLES: ["owner", "admin", "manager"],
}));

import {
  resolveBrandedAppTemplateForNiche,
  buildDefaultTabsForTemplate,
  buildDefaultSectionsForTemplate,
  provisionDefaultBrandedAppForStore,
  getPublicBrandedAppBySlugFn,
  saveBrandedAppConfigAndSectionsFn,
  getClientStorePortalSummaryFn,
  generateCustomerAppMagicAccessFn,
  revokeCustomerAppMagicAccessFn,
  unlockClientStorePortalByCodeFn,
} from "./branded-app.functions";
import {
  buildBrandedAppBaseUrl,
  buildBrandedClientPortalUrl,
  normalizeClientAccessCode,
} from "@/lib/branded-app-links";
import { OMNI_APP_BLUEPRINTS } from "./omni-apps-blueprint.functions";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";

describe("Branded App, Catálogo Padronizado, Omni Blueprints & PWA Sync E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolve corretamente os modelos padronizados por nicho sem confundir turismo, delivery e eventos", () => {
    expect(resolveBrandedAppTemplateForNiche("turismo")).toBe("tourism_cvc");
    expect(resolveBrandedAppTemplateForNiche("agencia_viagens")).toBe("tourism_cvc");
    expect(resolveBrandedAppTemplateForNiche("gastronomia")).toBe("delivery_ifood");
    expect(resolveBrandedAppTemplateForNiche("supermercado_delivery")).toBe("delivery_ifood");
    expect(resolveBrandedAppTemplateForNiche("eventos")).toBe("events_sympla");
    expect(resolveBrandedAppTemplateForNiche("salao_beleza")).toBe("services_agenda");
    expect(resolveBrandedAppTemplateForNiche("comercio_varejo")).toBe("ecommerce_retail");
    expect(resolveBrandedAppTemplateForNiche("outros")).toBe("standard_catalog");
  });

  it("gera abas e seções padronizadas com cotação API, botão corporativo, minha área e scroll infinito no turismo", () => {
    const storeId = "11111111-1111-4111-8111-111111111111";
    const tabs = buildDefaultTabsForTemplate("tourism_cvc", {
      enableApiQuoter: true,
      enableCorporateTravel: true,
      enableClientPortal: true,
    });
    const tabKinds = tabs.map((t) => t.kind);
    expect(tabKinds).toContain("home");
    expect(tabKinds).toContain("catalog");
    expect(tabKinds).toContain("quoter");
    expect(tabKinds).toContain("corporate");
    expect(tabKinds).toContain("client_portal");
    expect(tabKinds).toContain("about");

    const tabsDisabled = buildDefaultTabsForTemplate("tourism_cvc", {
      enableApiQuoter: false,
      enableCorporateTravel: false,
    });
    expect(tabsDisabled.find((t) => t.kind === "quoter")?.enabled).toBe(false);
    expect(tabsDisabled.find((t) => t.kind === "corporate")).toBeUndefined();

    const sections = buildDefaultSectionsForTemplate(storeId, "tourism_cvc", {
      enableApiQuoter: true,
      enableCorporateTravel: true,
    });
    const types = sections.map((s) => s.section_type);
    expect(types).toContain("tourism_cvc_dock");
    expect(types).toContain("travel_api_quoter");
    expect(types).toContain("corporate_travel_cta");
    expect(types).toContain("infinite_feed");
  });

  it("provisionDefaultBrandedAppForStore persiste configuração padrão e seções quando a loja nasce", async () => {
    const insertedTables: string[] = [];
    const chain = (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: null }),
        insert: async () => {
          insertedTables.push(table);
          return { error: null };
        },
        upsert: async () => {
          insertedTables.push(table);
          return { error: null };
        },
      };
      return q;
    };
    mockDb.from.mockImplementation((table: string) => chain(table));

    const result = await provisionDefaultBrandedAppForStore({
      storeId: "22222222-2222-4222-8222-222222222222",
      storeName: "Agência Horizonte",
      storeSlug: "agencia-horizonte",
      nicheOrCategory: "turismo",
      isAppEnabled: true,
    });

    expect(result.templateId).toBe("tourism_cvc");
    expect(insertedTables).toContain("store_pwa_configs");
    expect(insertedTables).toContain("store_page_sections");
  });

  it("getClientStorePortalSummaryFn retorna estado vazio honesto sem dados fictícios quando não autenticado", async () => {
    mockDb.from.mockImplementation(() => {
      const q: any = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: null }),
      };
      return q;
    });
    mockGetServerIdentity.mockResolvedValueOnce(null);
    // Força getSSRClient.auth.getUser retornar null
    mockDb.auth = { getUser: async () => ({ data: { user: null } }) };

    const res = await getClientStorePortalSummaryFn({
      data: { storeId: "33333333-3333-4333-8333-333333333333" },
    });

    expect(res.authenticated).toBe(false);
    expect(res.orders).toEqual([]);
    expect(res.appointments).toEqual([]);
    expect(res.trips).toEqual([]);
    expect(res.tickets).toEqual([]);
    expect(res.contracts).toEqual([]);
    expect(res.receivables).toEqual([]);
  });

  it("todos os blocos de todos os blueprints do Omni Builder (incluindo tourism) existem no registry", () => {
    const apps = Object.values(OMNI_APP_BLUEPRINTS);
    expect(apps.some((a) => a.id === "tourism")).toBe(true);

    for (const app of apps) {
      for (const page of app.pages) {
        for (const block of page.initialBlocks) {
          const resolved = getSiteBlockByIdStrict(block.type);
          expect(resolved, `Bloco '${block.type}' do blueprint '${app.id}' não resolveu`).toBeDefined();
        }
      }
    }
  });

  it("SW v6 e cabeçalhos PWA proíbem cache stale em manifestos e rotas dinâmicas /app/*", () => {
    const swContent = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");
    const headersContent = fs.readFileSync(path.resolve(process.cwd(), "public/_headers"), "utf8");

    expect(swContent).toContain('CACHE_NAME = "waesy-v6-app-realtime"');
    expect(swContent).toContain("PURGE_APP_CACHE");
    expect(swContent).toContain("self.skipWaiting()");
    expect(swContent).toContain("self.clients.claim()");

    expect(headersContent).toContain("/api/pwa/manifest.json");
    expect(headersContent).toContain("/app/*");
    expect(headersContent).toContain("no-store");
  });

  it("elimina mocks hardcoded residuais (ord-101, bill-01, ct-001, apt-001) e login fake no Portal do Cliente", () => {
    const filesToCheck = [
      "src/routes/c.$storeSlug.tsx",
      "src/components/commerce/dynamic-sections/portal-appointments-widget.tsx",
      "src/components/commerce/dynamic-sections/portal-carnes-bills-widget.tsx",
      "src/components/commerce/dynamic-sections/portal-contracts-widget.tsx",
      "src/components/commerce/dynamic-sections/portal-orders-rentals-widget.tsx",
    ];
    for (const rel of filesToCheck) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
      expect(content).not.toContain("ord-101");
      expect(content).not.toContain("bill-01");
      expect(content).not.toContain("ct-001");
      expect(content).not.toContain("apt-001");
      expect(content).not.toContain("WIDER EXPERIENCIAS DIGITAIS");
    }
  });

  it("gera seção featured_services (source: services) automaticamente no modelo Serviços & Agenda", () => {
    const storeId = "44444444-4444-4444-8444-444444444444";
    const sections = buildDefaultSectionsForTemplate(storeId, "services_agenda");
    const serviceSection = sections.find((s) => s.section_type === "featured_services");
    expect(serviceSection).toBeDefined();
    expect(serviceSection?.source_type).toBe("services");
  });

  it("herda Brand Kit na criação do App e sincroniza bidirecionalmente ao salvar com syncBrandKit=true", async () => {
    const storeId = "55555555-5555-4555-8555-555555555555";
    const updatedTables: Record<string, any> = {};
    let pwaLookupCount = 0;

    const createChain = (table: string) => {
      let lastUpdate: any = null;
      const q: any = {
        select: () => q,
        eq: () => q,
        not: () => q,
        in: () => q,
        or: () => q,
        is: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table === "brand_dna_profiles") {
            return {
              data: {
                id: "dna-1",
                archetype: "Sofisticado",
                color_palette: { primary: "#1e40af", background: "#f8fafc" },
                logos: { main_url: "https://cdn.waesy.test/logo.png", icon_url: "https://cdn.waesy.test/icon.png" },
                typography: { heading: "Outfit", body: "Inter" },
              },
            };
          }
          if (table === "brand_kits") {
            return {
              data: {
                id: "bk-1",
                colors: { primary: "#111111" },
                logos: {},
              },
            };
          }
          if (table === "store_pwa_configs") {
            pwaLookupCount += 1;
            return { data: pwaLookupCount === 1 ? null : { cache_version: 2 } };
          }
          return { data: null };
        },
        single: async () => {
          if (table === "stores") {
            return { data: { id: storeId, slug: "clinica-viva", settings: {} } };
          }
          return { data: { id: "pwa-1", store_id: storeId, cache_version: 3 } };
        },
        upsert: (payload: any) => {
          updatedTables[table] = payload;
          return q;
        },
        update: (payload: any) => {
          lastUpdate = payload;
          updatedTables[table] = payload;
          return q;
        },
        insert: (payload: any) => {
          if (!Array.isArray(payload)) {
            updatedTables[table] = payload;
          } else {
            updatedTables[`${table}:insert`] = payload;
          }
          return q;
        },
        delete: () => q,
        then: (resolve: any) => resolve({ data: lastUpdate, error: null }),
      };
      return q;
    };

    mockDb.from.mockImplementation((table: string) => createChain(table));
    mockGetServerIdentity.mockResolvedValue({ user_id: "user-1", store_id: storeId, role: "owner" });

    // 1. Provisionamento herda cores/logo do Brand DNA
    await provisionDefaultBrandedAppForStore({
      storeId,
      storeName: "Clínica Viva",
      storeSlug: "clinica-viva",
      nicheOrCategory: "saude",
      isAppEnabled: true,
    });
    expect(updatedTables.store_pwa_configs.theme_color).toBe("#1e40af");
    expect(updatedTables.store_pwa_configs.logo_square_url).toBe("https://cdn.waesy.test/icon.png");

    // 2. Salvamento com syncBrandKit espelha alterações de volta ao Brand Kit / Brand DNA e loja
    const saveRes = await saveBrandedAppConfigAndSectionsFn({
      data: {
        storeId,
        appName: "Clínica Viva App",
        shortName: "Viva",
        templateId: "services_agenda",
        isAppEnabled: true,
        isPublished: true,
        publishToMarketplace: false,
        themeColor: "#0f766e",
        backgroundColor: "#ffffff",
        logoSquareUrl: "https://cdn.waesy.test/new-logo.png",
        entryAnimation: "pulse",
        displayMode: "standalone",
        orientation: "portrait",
        navigationTabs: [],
        nicheFeatures: {},
        settings: {},
        syncBrandKit: true,
      },
    });

    expect(saveRes.cacheVersion).toBe(3);
    expect(updatedTables.stores.waesy_marketplace_enabled).toBe(false);
    expect(updatedTables.brand_kits.colors.primary).toBe("#0f766e");
    expect(updatedTables.brand_dna_profiles.color_palette.primary).toBe("#0f766e");
    expect(updatedTables.brand_dna_profiles.logos.icon_url).toBe("https://cdn.waesy.test/new-logo.png");
  });

  it("getPublicBrandedAppBySlugFn carrega Brand Kit, Base de Conhecimento, Serviços, Lotes de Eventos e Portfólio por store_id", async () => {
    const storeId = "66666666-6666-4666-8666-666666666666";
    const eqStoreCalls: Array<{ table: string; col: string; val: any }> = [];

    const createBundleChain = (table: string) => {
      const q: any = {
        select: () => q,
        eq: (col: string, val: any) => {
          if (col === "store_id") eqStoreCalls.push({ table, col, val });
          return q;
        },
        in: () => q,
        or: () => q,
        is: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (table === "stores") {
            return {
              data: {
                id: storeId,
                name: "Agência Sol",
                slug: "agencia-sol",
                ai_knowledge_base: "Atendimento VIP 24h com embarque garantido.",
                ai_sales_agent_enabled: true,
                payment_instructions: "PIX ou até 10x sem juros",
                pix_key: "pix@agenciasol.test",
                settings: { primary_niche_id: "turismo" },
              },
            };
          }
          if (table === "brand_dna_profiles") {
            return {
              data: {
                archetype: "Explorador",
                typography: { heading: "Outfit", body: "Plus Jakarta Sans" },
                color_palette: { primary: "#0369a1" },
              },
            };
          }
          return { data: null };
        },
        then: (resolve: any) => {
          const tableRows: Record<string, any[]> = {
            booking_services: [{ id: "svc-1", title: "Consultoria Personalizada", duration_minutes: 45, price_cents: 15000 }],
            booking_resources: [{ id: "res-1", name: "Consultora Ana" }],
            classifieds: [{ id: "cls-1", title: "Van Executiva 15 Lugares", price_cents: 0, deal_type: "aluguel" }],
            events: [{ id: "ev-1", title: "Feira de Roteiros", cover_image: "https://cdn.waesy.test/ev.jpg", price_min_cents: 5000 }],
            ticket_lots: [{ id: "lot-1", event_id: "ev-1", name: "1º Lote", price_cents: 5000, available_qty: 20 }],
            tourism_experiences: [{ id: "tur-1", title: "Bariloche Inverno", destination: "Bariloche", price_cents: 459000 }],
          };
          return resolve({ data: tableRows[table] || [], error: null });
        },
      };
      return q;
    };

    mockDb.from.mockImplementation((table: string) => createBundleChain(table));

    const bundle = await getPublicBrandedAppBySlugFn({ data: { slug: "agencia-sol" } });

    expect(bundle).not.toBeNull();
    expect(bundle?.brandKit?.archetype).toBe("Explorador");
    expect(bundle?.brandKit?.headingFont).toBe("Outfit");
    expect(bundle?.store.ai_knowledge_base).toBeNull();
    expect(bundle?.store.has_pix_key).toBe(true);
    expect(bundle?.services).toHaveLength(1);
    expect(bundle?.bookingResources).toHaveLength(1);
    expect(bundle?.classifieds).toHaveLength(1);
    expect(bundle?.events[0]?.ticket_lots).toHaveLength(1);
    expect(bundle?.tourismItems).toHaveLength(1);
    expect(eqStoreCalls.some((c) => c.table === "booking_services" && c.val === storeId)).toBe(true);
    expect(eqStoreCalls.some((c) => c.table === "classifieds" && c.val === storeId)).toBe(true);
  });

  it("garante escopo multi-tenant na cotação de turismo e agendamento real no App", () => {
    const travelModalContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/travel-quote-modal.tsx"),
      "utf8",
    );
    const serviceBookingContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-service-booking-sheet.tsx"),
      "utf8",
    );
    expect(travelModalContent).not.toContain("00000000-0000-0000-0000-000000000000");
    expect(travelModalContent).toContain("storeId");
    expect(serviceBookingContent).toContain("createAppointment");
    expect(serviceBookingContent).toContain("client-store-portal");
  });

  it("migration 20270525 inclui source_type='classifieds' no CHECK e cria o bucket 'store-assets'", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20270525000000_branded_app_catalog_and_pwa_sync.sql"),
      "utf8",
    );
    expect(sql).toContain("'classifieds'");
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS store_page_sections_source_type_check");
    expect(sql).toContain("INSERT INTO storage.buckets");
    expect(sql).toContain("'store-assets'");
  });

  it("queries BFF e manifesto PWA usam somente colunas SQL existentes e expõem opt-in de Marketplace", () => {
    const bff = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/branded-app.functions.ts"),
      "utf8",
    );
    const manifest = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/api.pwa.manifest[.]json.ts"),
      "utf8",
    );
    const catalogFn = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/catalog.functions.ts"),
      "utf8",
    );
    const mvpFn = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/company-mvp.functions.ts"),
      "utf8",
    );

    expect(bff).not.toContain("logo_url, avatar_url, banner_url");
    expect(bff).not.toContain("select(\"id, name, slug, image_url\")");
    expect(bff).not.toContain("client_id.eq");
    expect(bff).not.toContain("select(\"full_name, email\")");
    expect(manifest).not.toContain("logo_url, avatar_url");
    expect(catalogFn).toContain("waesy_marketplace_enabled");
    expect(catalogFn).not.toContain("logo_url, avatar_url, banner_url");
    expect(mvpFn).toContain("corporateAppUrl");
  });

  it("buildBrandedClientPortalUrl desacopla Waesy Pro de /conta?loja= e ignora custom_domain pending_dns", () => {
    expect(normalizeClientAccessCode("#daaf")).toBe("CLI-DAAF");
    expect(
      buildBrandedAppBaseUrl({
        slug: "excelencia-tour",
        customDomain: "app.excelenciatour.com.br",
        customDomainStatus: "pending_dns",
      }),
    ).toBe("https://waesy.com.br/app/excelencia-tour");

    const activeCustomUrl = buildBrandedClientPortalUrl({
      slug: "excelencia-tour",
      customDomain: "app.excelenciatour.com.br",
      customDomainStatus: "active",
      magicToken: "wca_1234567890abcdef1234567890abcdef",
      clientCode: "CLI-DAAF",
    });
    expect(activeCustomUrl).toBe(
      "https://app.excelenciatour.com.br/app/excelencia-tour?tab=minha_area&token=wca_1234567890abcdef1234567890abcdef",
    );
    expect(activeCustomUrl).not.toContain("/conta");
  });

  it("generateCustomerAppMagicAccessFn gera código único e Magic Link escopado no App Oficial (/app/:slug)", async () => {
    const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const customerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbdaaf";
    mockGetServerIdentity.mockResolvedValueOnce({
      id: "99999999-9999-4999-8999-999999999999",
      store_id: storeId,
      role: "owner",
    });

    const insertedPayloads: any[] = [];
    mockDb.from.mockImplementation((table: string) => {
      const state: Record<string, any> = {};
      const q: any = {
        select: () => q,
        eq: (col: string, val: any) => {
          state[col] = val;
          return q;
        },
        is: () => q,
        gt: () => q,
        or: () => q,
        order: () => q,
        limit: () => q,
        update: () => q,
        insert: (payload: any) => {
          insertedPayloads.push({ table, payload });
          return q;
        },
        single: async () => {
          const last = insertedPayloads[insertedPayloads.length - 1]?.payload;
          return {
            data: {
              client_code: last?.client_code || "CLI-DAAF",
              magic_token: last?.magic_token || "wca_mock",
              expires_at: last?.expires_at || new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          };
        },
        maybeSingle: async () => {
          if (table === "stores") {
            return {
              data: {
                id: storeId,
                slug: "excelencia-tour",
                custom_domain: null,
                settings: {},
              },
              error: null,
            };
          }
          if (table === "store_app_client_tokens" && state.client_code) {
            return {
              data: {
                id: "other-token-id",
                customer_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                crm_customer_id: null,
                lead_id: null,
                customer_phone_digits: "5549999990000",
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return q;
    });

    const res = await generateCustomerAppMagicAccessFn({
      data: {
        storeId,
        customerId,
        customerName: "Gabriella",
        customerPhone: "+55 49 99157-1265",
        clientCode: "CLI-DAAF",
        regenerate: false,
      },
    });

    expect(res.success).toBe(true);
    expect(res.client_code.startsWith("CLI-DAAF-")).toBe(true);
    expect(res.magic_token?.startsWith("wca_")).toBe(true);
    expect(res.portal_url).toContain("/app/excelencia-tour?tab=minha_area&token=wca_");
    expect(res.portal_url).not.toContain("/conta");
  });

  it("unlockClientStorePortalByCodeFn exige segundo fator para código curto e bloqueia cross-tenant", async () => {
    const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const updatedCounts: number[] = [];

    mockDb.from.mockImplementation((table: string) => {
      let queryStoreFilter: string | null = null;
      const q: any = {
        select: () => q,
        eq: (col: string, val: any) => {
          if (col === "store_id") queryStoreFilter = val;
          return q;
        },
        is: () => q,
        gt: () => q,
        update: (payload: any) => {
          updatedCounts.push(Number(payload.access_count || 0));
          return q;
        },
        limit: async () => {
          if (table !== "store_app_client_tokens" || queryStoreFilter !== storeId) {
            return { data: [], error: null };
          }
          return {
            data: [
              {
                id: "tok-1",
                store_id: storeId,
                customer_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbdaaf",
                crm_customer_id: null,
                customer_name: "Gabriella",
                customer_phone_digits: "5549991571265",
                customer_document: "12345678900",
                customer_email: "gabi@teste.com",
                client_code: "CLI-DAAF",
                magic_token: "wca_valid_secret_token_9876543210",
                access_count: 2,
              },
            ],
            error: null,
          };
        },
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return q;
    });

    // 1. Segundo fator errado -> deve falhar (bloqueia enumeração de CLI-XXXX)
    await expect(
      unlockClientStorePortalByCodeFn({
        data: {
          storeId,
          clientCodeOrToken: "CLI-DAAF",
          verificationFactor: "9999",
        },
      }),
    ).rejects.toThrow(/inválido|expirado/i);

    // 2. Cross-tenant -> storeId diferente não pode desbloquear o código
    await expect(
      unlockClientStorePortalByCodeFn({
        data: {
          storeId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          clientCodeOrToken: "CLI-DAAF",
          verificationFactor: "1265",
        },
      }),
    ).rejects.toThrow(/inválido|expirado/i);

    // 3. Código + 4 últimos dígitos corretos na loja dona -> libera e incrementa access_count
    const unlocked = await unlockClientStorePortalByCodeFn({
      data: {
        storeId,
        clientCodeOrToken: "#cli-daaf",
        verificationFactor: "1265",
      },
    });
    expect(unlocked.success).toBe(true);
    expect(unlocked.magicToken).toBe("wca_valid_secret_token_9876543210");
    expect(unlocked.clientCode).toBe("CLI-DAAF");
    expect(updatedCounts).toEqual([3]);
  });

  it("getClientStorePortalSummaryFn autentica via Magic Token escopado e falha fechado se token for de outra loja", async () => {
    const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const foreignStoreId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const customerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbdaaf";

    mockDb.auth = { getUser: async () => ({ data: { user: null } }) };
    mockDb.from.mockImplementation((table: string) => {
      const filters: Record<string, any> = {};
      const inFilters: Record<string, any[]> = {};
      const q: any = {
        select: () => q,
        eq: (col: string, val: any) => {
          filters[col] = val;
          return q;
        },
        in: (col: string, vals: any[]) => {
          inFilters[col] = vals;
          return q;
        },
        is: () => q,
        or: () => q,
        order: () => q,
        limit: async () => {
          if (table === "orders" && filters.store_id === storeId) {
            const allOrders = [
              {
                id: "ord-gabi-1",
                customer_id: null,
                order_number: "W-101",
                public_token: "pub-ord-1",
                status: "confirmed",
                total_cents: 45000,
                shipping_method: "digital",
                customer_snapshot: { phone: "+5549991571265" },
                created_at: "2026-11-16T10:00:00Z",
                order_items: [{ id: "oi-1", product_title: "Passeio Termas", item_type: "service" }],
              },
              {
                id: "ord-outro-cliente",
                customer_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                order_number: "W-999",
                public_token: "pub-ord-999",
                status: "paid",
                total_cents: 99900,
                customer_snapshot: { phone: "+5511988887777" },
                created_at: "2026-11-16T09:00:00Z",
                order_items: [],
              },
            ];
            const filtered = Array.isArray(inFilters.customer_id)
              ? allOrders.filter((o) => o.customer_id && inFilters.customer_id.includes(o.customer_id))
              : allOrders;
            return { data: filtered, error: null };
          }
          if (table === "travel_proposals" && filters.store_id === storeId) {
            return {
              data: [
                {
                  id: "prop-gabi-1",
                  title: "Roteiro Serra Gaúcha VIP",
                  destination_city: "Gramado",
                  public_token: "prop-tok-123",
                  pricing: { total_price_cents: 280000 },
                  status: "sent",
                  created_at: "2026-11-16T11:00:00Z",
                },
              ],
              error: null,
            };
          }
          if (table === "booking_appointments" && filters.store_id === storeId) {
            return {
              data: [
                {
                  id: "apt-gabi-1",
                  scheduled_at: "2026-11-20T14:00:00Z",
                  status: "confirmed",
                  notes: "Atendimento VIP",
                  booking_services: { title: "Consultoria de Roteiro", price_cents: 15000 },
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        },
        maybeSingle: async () => {
          if (
            table === "store_app_client_tokens" &&
            filters.store_id === storeId &&
            filters.magic_token === "wca_valid_secret_token_9876543210"
          ) {
            return {
              data: {
                id: "tok-1",
                store_id: storeId,
                customer_id: null,
                crm_customer_id: customerId,
                lead_id: null,
                thread_id: null,
                customer_name: "Gabriella",
                customer_phone: "+5549991571265",
                customer_phone_digits: "5549991571265",
                customer_document: null,
                customer_email: null,
                client_code: "CLI-DAAF",
                magic_token: "wca_valid_secret_token_9876543210",
                is_active: true,
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                revoked_at: null,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return q;
    });

    const validRes = await getClientStorePortalSummaryFn({
      data: { storeId, accessToken: "wca_valid_secret_token_9876543210" },
    });
    expect(validRes.authenticated).toBe(true);
    expect(validRes.authMode).toBe("magic_link");
    expect(validRes.clientCode).toBe("CLI-DAAF");
    expect(validRes.orders.map((o) => o.id)).toEqual(["ord-gabi-1"]);
    expect(validRes.orders[0].items?.length).toBe(1);
    expect(validRes.proposals?.map((p) => p.public_token)).toEqual(["prop-tok-123"]);
    expect(validRes.appointments.map((a) => a.id)).toEqual(["apt-gabi-1"]);

    const crossTenantRes = await getClientStorePortalSummaryFn({
      data: { storeId: foreignStoreId, accessToken: "wca_valid_secret_token_9876543210" },
    });
    expect(crossTenantRes.authenticated).toBe(false);
    expect(crossTenantRes.tokenInvalid).toBe(true);
    expect(crossTenantRes.orders).toEqual([]);
  });

  it("revokeCustomerAppMagicAccessFn revoga tokens ativos por loja e clientes/cobranças usam App Oficial", async () => {
    const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    mockGetServerIdentity.mockResolvedValueOnce({
      id: "99999999-9999-4999-8999-999999999999",
      store_id: storeId,
      role: "owner",
    });

    const updates: any[] = [];
    mockDb.from.mockImplementation((table: string) => {
      const q: any = {
        update: (payload: any) => {
          updates.push({ table, payload });
          return q;
        },
        eq: () => q,
        is: () => q,
        or: async () => ({ error: null }),
      };
      return q;
    });

    const revoked = await revokeCustomerAppMagicAccessFn({
      data: { storeId, customerPhone: "+5549991571265" },
    });
    expect(revoked.success).toBe(true);
    expect(updates[0].table).toBe("store_app_client_tokens");
    expect(updates[0].payload.is_active).toBe(false);
    expect(typeof updates[0].payload.revoked_at).toBe("string");

    const recSrc = fs.readFileSync(path.resolve(process.cwd(), "src/services/receivables.functions.ts"), "utf8");
    expect(recSrc).toContain("issueOrReuseCustomerAppTokenInternal");
    expect(recSrc).toContain("resolveScopedClientPortalToken");

    const bffSrc = fs.readFileSync(path.resolve(process.cwd(), "src/services/branded-app.functions.ts"), "utf8");
    expect(bffSrc).not.toContain("verification_code, signed_at, created_at");
    expect(bffSrc).toContain('String(insErr.code || "") === "23503"');

    const orderCardSrc = fs.readFileSync(path.resolve(process.cwd(), "src/components/chat/order-message-card.tsx"), "utf8");
    expect(orderCardSrc).toContain('/workspace/pedidos');

    const cStoreSrc = fs.readFileSync(path.resolve(process.cwd(), "src/routes/c.$storeSlug.tsx"), "utf8");
    expect(cStoreSrc).toContain("initialAccessToken={urlPortalParams.token}");
  });

  it("elimina redirecionamentos /conta?loja= do Atendimento C360 e links /conta/* dentro de AppClientPortalTab", async () => {
    const filesShouldNotContainGenericConta = [
      "src/services/chat.functions.ts",
      "src/components/chat/customer-360-sidebar.tsx",
      "src/components/branded-app/app-client-portal-tab.tsx",
    ];
    for (const rel of filesShouldNotContainGenericConta) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
      expect(content).not.toContain("/conta?loja=");
      expect(content).not.toContain("https://waesy.com.br/conta");
    }
    const portalTab = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-client-portal-tab.tsx"),
      "utf8",
    );
    expect(portalTab).not.toContain('to="/conta"');
    expect(portalTab).not.toContain('to="/conta/');
    expect(portalTab).toContain("inspectedOrder");
    expect(portalTab).toContain("inspectedTrip");
    expect(portalTab).toContain("ticketQrState");

    const [portalMod, shellMod, c360DocsMod, sidebarMod] = await Promise.all([
      import("@/components/branded-app/app-client-portal-tab"),
      import("@/components/branded-app/branded-app-shell"),
      import("@/components/chat/c360/C360ProfileAndDocsView"),
      import("@/components/chat/customer-360-sidebar"),
    ]);
    expect(typeof portalMod.AppClientPortalTab).toBe("function");
    expect(typeof shellMod.BrandedAppShell).toBe("function");
    expect(typeof c360DocsMod.C360ProfileAndDocsView).toBe("function");
    expect(typeof sidebarMod.Customer360Sidebar).toBe("function");
  }, 60000);
});
