import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildCustomDomainLookupVariants,
  isTenantCustomDomainCandidate,
  normalizeIncomingHost,
  resolveCustomDomainRewritePath,
} from "@/lib/custom-domain-routing";
import { doesSectionMatchCity } from "@/components/branded-app/app-sections-renderer";
import { summarizeRoomOccupancies } from "@/components/tourism/tourism-multi-room-picker";
import { resolveBrandedAppPortalIdentity } from "@/services/branded-app-portal-actions.functions";

describe("WAVE 1 Verification — Custom Domain Edge/SSR & Zero Marketplace Escapes", () => {
  it("W1-01: src/server.ts resolve domínio próprio de lojista antes do roteamento Waesy Marketplace", () => {
    const serverSrc = fs.readFileSync(path.resolve(process.cwd(), "src/server.ts"), "utf8");
    expect(serverSrc).toContain("resolveCustomDomainAppRequest");
  });

  it("W1-02: manifest.json adapta start_url para '/' em custom domain sem vazar '/app/:slug'", () => {
    const manifestSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/api.pwa.manifest[.]json.ts"),
      "utf8",
    );
    expect(manifestSrc).toContain("isCustomDomainHost");
    expect(manifestSrc).toMatch(/isCustomDomainHost[\s\S]*["'`]\/\?source=pwa["'`]/);
  });

  it("W1-03: BrandedAppShell, AppSectionsRenderer, AppProductDetailDrawer e AppClientPortalTab nunca contêm links escapando para rotas globais de vitrine sem modo escopado", () => {
    const shell = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/branded-app-shell.tsx"),
      "utf8",
    );
    const renderer = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-sections-renderer.tsx"),
      "utf8",
    );
    const productDrawer = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-product-detail-drawer.tsx"),
      "utf8",
    );
    const portalTab = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-client-portal-tab.tsx"),
      "utf8",
    );

    expect(shell).not.toContain('to="/turismo/$id"');
    expect(renderer).not.toContain('to="/turismo/$id"');
    expect(renderer).not.toContain('to="/classificados/$id"');
    expect(productDrawer).not.toContain('to="/produto/$slug"');
    expect(portalTab).not.toContain('to="/entrar"');
  });

  it("W1-04 (Positivo + Negativo): normalização de domínio próprio aceita tenant domains e bloqueia Waesy/SaaS/localhost", () => {
    expect(normalizeIncomingHost("HTTPS://App.ExcelenciaTour.com.br:443/")).toBe(
      "app.excelenciatour.com.br",
    );
    expect(isTenantCustomDomainCandidate("app.excelenciatour.com.br")).toBe(true);
    expect(isTenantCustomDomainCandidate("excelenciatour.com.br")).toBe(true);
    expect(buildCustomDomainLookupVariants("www.excelenciatour.com.br")).toEqual([
      "www.excelenciatour.com.br",
      "excelenciatour.com.br",
    ]);

    // Negativos: nunca capturar Waesy core, subdomínios SaaS nem localhost
    expect(isTenantCustomDomainCandidate("waesy.com.br")).toBe(false);
    expect(isTenantCustomDomainCandidate("loja.waesy.com.br")).toBe(false);
    expect(isTenantCustomDomainCandidate("studio.waesy.com.br")).toBe(false);
    expect(isTenantCustomDomainCandidate("turis.com.br")).toBe(false);
    expect(isTenantCustomDomainCandidate("localhost:3000")).toBe(false);
    expect(isTenantCustomDomainCandidate("127.0.0.1")).toBe(false);
    expect(isTenantCustomDomainCandidate("demo.pages.dev")).toBe(false);

    // Rewrites internos no domínio próprio
    expect(resolveCustomDomainRewritePath("/", "excelencia-tour")).toEqual({
      pathname: "/app/excelencia-tour",
    });
    expect(resolveCustomDomainRewritePath("/minha-area", "excelencia-tour")).toEqual({
      pathname: "/app/excelencia-tour",
      tabQuery: "minha_area",
    });
    expect(resolveCustomDomainRewritePath("/manifest.json", "excelencia-tour")).toEqual({
      pathname: "/api/pwa/manifest.json",
    });
    // Rotas reservadas / protegidas nunca são reescritas para o app público
    expect(resolveCustomDomainRewritePath("/workspace/vendas", "excelencia-tour")).toBeNull();
    expect(resolveCustomDomainRewritePath("/admin-master", "excelencia-tour")).toBeNull();
  });
});

describe("WAVE 2 Verification — Studio Unificado, Preview Iframe, Omni-Builder Híbrido & Segmentação por Cidade", () => {
  it("W2-01: workspace.configuracoes.pwa.tsx unifica em BrandedAppWorkspaceEditor sem formulário legado concorrente ou CSS var em input color", () => {
    const pwaRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.configuracoes.pwa.tsx"),
      "utf8",
    );
    const studioEditor = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/branded-app-workspace-editor.tsx"),
      "utf8",
    );

    expect(pwaRoute).toContain("BrandedAppWorkspaceEditor");
    expect(pwaRoute).not.toContain("var(--color-slate-900)");
    expect(pwaRoute).not.toContain("saveStorePwaConfig");
    expect(pwaRoute).not.toContain('setAppName("Meu Negócio")');

    expect(studioEditor).toContain("BrandedAppDeviceStage");
    expect(studioEditor).toContain("BrandedAppIdentityDomainPanel");
    expect(studioEditor).toContain("BrandedAppTelemetryPanel");
    expect(studioEditor).not.toContain("Sparkles");
  });

  it("W2-02: Palco de preview iframe e rota /app/preview/$slug validam origem e sincronizam via postMessage", () => {
    const previewRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/app.preview.$slug.tsx"),
      "utf8",
    );
    const stageComp = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/branded-app-device-stage.tsx"),
      "utf8",
    );

    expect(previewRoute).toContain('createFileRoute("/app/preview/$slug")');
    expect(previewRoute).toContain("event.origin !== window.location.origin");
    expect(previewRoute).toContain("WAESY_APP_PREVIEW_READY");
    expect(previewRoute).toContain("WAESY_APP_PREVIEW_STATE");

    expect(stageComp).toContain("<iframe");
    expect(stageComp).toContain("WAESY_APP_PREVIEW_READY");
    expect(stageComp).toContain("WAESY_APP_PREVIEW_STATE");
    expect(stageComp).toContain("generateQrCodeDataUri");
  });

  it("W2-03: Tipos/BFF/Renderer integram Omni-Builder híbrido, mural de vagas, avaliações verificadas e CTA de domínio", () => {
    const bffSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/branded-app.functions.ts"),
      "utf8",
    );
    const rendererSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-sections-renderer.tsx"),
      "utf8",
    );

    expect(bffSrc).toContain("omni_block");
    expect(bffSrc).toContain("omni_document");
    expect(bffSrc).toContain("jobs_board");
    expect(bffSrc).toContain("reviews_showcase");
    expect(bffSrc).toContain("loadStoreOmniDocuments");
    expect(bffSrc).toContain("allow_customer_self_signup");
    expect(bffSrc).toContain("city_targeting_enabled");

    expect(rendererSrc).toContain("OmniPageRenderer");
    expect(rendererSrc).toContain("omni_document");
    expect(rendererSrc).toContain("omni_block");
    expect(rendererSrc).toContain("jobs_board");
    expect(rendererSrc).toContain("reviews_showcase");
  });

  it("W2-04 (Positivo + Negativo): segmentação por cidade (city_filter) filtra seções corretamente", () => {
    expect(doesSectionMatchCity("Chapecó, Xanxerê", "Chapecó")).toBe(true);
    expect(doesSectionMatchCity("Chapecó, Xanxerê", "  xanxerê ")).toBe(true);
    expect(doesSectionMatchCity(null, "Florianópolis")).toBe(true);
    expect(doesSectionMatchCity("Chapecó", null)).toBe(true);
    // Negativo: visitante de outra cidade não vê seção segmentada
    expect(doesSectionMatchCity("Chapecó, Xanxerê", "Florianópolis")).toBe(false);
  });
});

describe("WAVE 3 Verification — Cotador CVC/Decolar Multi-Modal (InfoTravel + Wooba)", () => {
  it("W3-01: publicTourismAutoServiceSearchFn suporta múltiplos quartos/idades, cabine e canais Wooba/InfoTravel sem tarifas falsas", () => {
    const infotravelSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/infotravel.ts"),
      "utf8",
    );
    expect(infotravelSrc).toContain("searchWoobaFlights");
    expect(infotravelSrc).toContain("searchWoobaBusRoutes");
    expect(infotravelSrc).toContain("searchWoobaCars");
    expect(infotravelSrc).toContain("occupancies: normalizedRooms");
    expect(infotravelSrc).toContain("cabinClass");
    expect(infotravelSrc).toContain("woobaLiveActive");
    expect(infotravelSrc).toContain('"cruises"');
    expect(infotravelSrc).toContain('"insurance"');
    expect(infotravelSrc).toContain('"bus"');
  });

  it("W3-02: TourismDynamicSearchPanel integra AirportCombobox, swap, somente ida/ida-volta, cabine e multi-quartos sem Sparkle ou text-3xs", () => {
    const panelSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/tourism-dynamic-search-panel.tsx"),
      "utf8",
    );
    const quoteModalSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/travel-quote-modal.tsx"),
      "utf8",
    );

    expect(panelSrc).toContain("AirportCombobox");
    expect(panelSrc).toContain("TourismMultiRoomPicker");
    expect(panelSrc).toContain("cabinClass");
    expect(panelSrc).toContain("tripMode");
    expect(panelSrc).toContain("buildPrefillPayload");
    expect(panelSrc).not.toContain("Sparkle");
    expect(panelSrc).not.toContain("text-3xs");
    expect(quoteModalSrc).toContain("prefill");
    expect(quoteModalSrc).not.toContain("text-2xs");
  });

  it("W3-03: summarizeRoomOccupancies resume corretamente adultos, crianças e múltiplos quartos", () => {
    expect(summarizeRoomOccupancies([{ adults: 2, childrenAges: [] }])).toBe(
      "2 adultos · 1 quarto",
    );
    expect(
      summarizeRoomOccupancies([
        { adults: 2, childrenAges: [4, 9] },
        { adults: 1, childrenAges: [] },
      ]),
    ).toBe("3 adultos, 2 crianças · 2 quartos");
  });
});

describe("WAVE 4 Verification — Portal Contextual 9 Dimensões, Chat Isolado, Chamados, Reviews Verificadas & Vagas no App", () => {
  it("W4-01 (Positivo + Negativo Cross-Tenant): resolveBrandedAppPortalIdentity valida Magic Token por loja e falha fechado em outra empresa", async () => {
    const storeA = "11111111-1111-4111-8111-111111111111";
    const storeB = "22222222-2222-4222-8222-222222222222";
    const secretToken = "wca_abcdef1234567890abcdef1234567890";

    const createMockDb = () => ({
      from: (table: string) => {
        const filters: Record<string, any> = {};
        const chain: any = {
          select: () => chain,
          eq: (col: string, val: any) => {
            filters[col] = val;
            return chain;
          },
          is: () => chain,
          maybeSingle: async () => {
            if (
              table === "store_app_client_tokens" &&
              filters.store_id === storeA &&
              filters.magic_token === secretToken
            ) {
              return {
                data: {
                  id: "tok-a",
                  store_id: storeA,
                  customer_id: "33333333-3333-4333-8333-333333333333",
                  crm_customer_id: null,
                  lead_id: null,
                  thread_id: "44444444-4444-4444-8444-444444444444",
                  customer_name: "Ana Viajante",
                  customer_phone: "+5549991112233",
                  customer_phone_digits: "5549991112233",
                  customer_email: "ana@cliente.com",
                  client_code: "CLI-3333",
                  magic_token: secretToken,
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
        return chain;
      },
    });

    const db = createMockDb();
    const okIdentity = await resolveBrandedAppPortalIdentity(db, storeA, secretToken);
    expect(okIdentity.authenticated).toBe(true);
    expect(okIdentity.customerName).toBe("Ana Viajante");
    expect(okIdentity.threadId).toBe("44444444-4444-4444-8444-444444444444");

    // Negativo: o mesmo token usado em storeB DEVE falhar fechado (tokenInvalid = true)
    const crossTenantIdentity = await resolveBrandedAppPortalIdentity(db, storeB, secretToken);
    expect(crossTenantIdentity.authenticated).toBe(false);
    expect(crossTenantIdentity.tokenInvalid).toBe(true);
    expect(crossTenantIdentity.userId).toBeNull();
  });

  it("W4-02: BFF de Portal implementa Chat Escopado, Chamados, Verificação Transacional de Avaliação e Escopo de Vagas por store_id", () => {
    const portalActionsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/branded-app-portal-actions.functions.ts"),
      "utf8",
    );
    const portalTabSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-client-portal-tab.tsx"),
      "utf8",
    );
    const companyTabSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-company-info-tab.tsx"),
      "utf8",
    );

    expect(portalActionsSrc).toContain("getScopedAppChatMessagesFn");
    expect(portalActionsSrc).toContain("sendScopedAppChatMessageFn");
    expect(portalActionsSrc).toContain("listClientAppTicketsFn");
    expect(portalActionsSrc).toContain("createClientAppTicketFn");
    expect(portalActionsSrc).toContain("submitBrandedAppStoreReviewFn");
    expect(portalActionsSrc).toContain("hasVerifiedTransaction");
    expect(portalActionsSrc).toContain("verified_purchase: true");
    expect(portalActionsSrc).toContain("applyToBrandedAppJobFn");
    expect(portalActionsSrc).toContain('.eq("store_id", data.storeId)');

    expect(portalTabSrc).toContain("AppClientPortalChatView");
    expect(portalTabSrc).toContain("AppClientPortalTicketsView");
    expect(portalTabSrc).toContain('"chat"');
    expect(portalTabSrc).toContain('"support_tickets"');

    expect(companyTabSrc).toContain("submitBrandedAppStoreReviewFn");
    expect(companyTabSrc).toContain("applyToBrandedAppJobFn");
  });
});

describe("WAVE 5 Verification — Service Worker Incremental Sem Perda de Dados & Kit QR de Instalação", () => {
  it("W5-01: public/sw.js particiona cache de runtime por tenant (waesy-app-runtime-<slug>) e preserva IndexedDB/localStorage/auth", () => {
    const swSrc = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf8");

    expect(swSrc).toContain('CACHE_NAME = "waesy-v6-app-realtime"');
    expect(swSrc).toContain('TENANT_RUNTIME_CACHE_PREFIX = "waesy-app-runtime-"');
    expect(swSrc).toContain("extractTenantNamespace");
    expect(swSrc).toContain("getTenantRuntimeCacheName");
    expect(swSrc).toContain("PURGE_APP_CACHE");
    expect(swSrc).toContain("WAESY_SW_CACHE_SYNCED");
    expect(swSrc).toContain("self.skipWaiting()");
    expect(swSrc).toContain("self.clients.claim()");
    // Garantia negativa: SW jamais limpa localStorage, sessionStorage ou indexedDB
    expect(swSrc).not.toContain("indexedDB.deleteDatabase");
    expect(swSrc).not.toContain("localStorage.clear");
  });

  it("W5-02: AppInstallDrawer inclui QR Code real e cópia de link sem contadores falsos", () => {
    const drawerSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/app-install-drawer.tsx"),
      "utf8",
    );
    expect(drawerSrc).toContain("generateQrCodeDataUri");
    expect(drawerSrc).toContain("recordPwaInstallation");
  });
});

describe("WAVE 6 Verification — Atribuição Multi-Pixel, Meta CAPI, UTM/CLID, IP Real, GeoIP & GPS Consensual", () => {
  it("W6-01: BrandedAppShell monta StoreAnalyticsInjector com ViewContent dinâmico e sem injetar em preview", () => {
    const shellSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/branded-app/branded-app-shell.tsx"),
      "utf8",
    );
    const injectorSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/analytics/StoreAnalyticsInjector.tsx"),
      "utf8",
    );

    expect(shellSrc).toContain("<StoreAnalyticsInjector");
    expect(shellSrc).toContain("!isPreview");
    expect(shellSrc).toContain('inspectedProduct || inspectedEntity ? "product" : "home"');
    expect(injectorSrc).toContain("recordStorefrontAttributionVisit");
    expect(injectorSrc).toContain("gpsLatitude");
    expect(injectorSrc).toContain("gpsLongitude");
  });

  it("W6-02: pixels.functions.ts, omnichannel-attribution.server.ts e tourism.functions.ts persistem IP real, GeoIP e GPS em ad_attribution_touchpoints", () => {
    const pixelsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/pixels.functions.ts"),
      "utf8",
    );
    const attrSrvSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/omnichannel-attribution.server.ts"),
      "utf8",
    );
    const tourismFnSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/tourism.functions.ts"),
      "utf8",
    );
    const migrationSrc = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "supabase/migrations/20270606000000_branded_app_omni_chat_reviews_and_domains.sql",
      ),
      "utf8",
    );

    expect(pixelsSrc).toContain("captureRequestTelemetry");
    expect(pixelsSrc).toContain("ipAddress");
    expect(pixelsSrc).toContain("geoCity");
    expect(pixelsSrc).toContain("gpsLatitude");

    expect(attrSrvSrc).toContain("ip_address: input.ipAddress");
    expect(attrSrvSrc).toContain("geo_city: input.geoCity");
    expect(attrSrvSrc).toContain("gps_latitude: input.gpsLatitude");

    expect(tourismFnSrc).toContain("dispatchServerSidePixelConversion");
    expect(tourismFnSrc).toContain("recordAttributionTouchpoint");

    expect(migrationSrc).toContain("ADD COLUMN IF NOT EXISTS ip_address TEXT");
    expect(migrationSrc).toContain("ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION");
  });

  describe("WAVE 7 Verification — PWA Radical Tenant Isolation & Zero Marketplace Bleed", () => {
    it("W7-01: CartSheet isola carrinho por storeId e appSlug, navegando com parâmetros escopados e bloqueando escape para /mercado", () => {
      const cartSheetSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/commerce/cart-sheet.tsx"),
        "utf8",
      );

      expect(cartSheetSrc).toContain("export interface CartSheetProps");
      expect(cartSheetSrc).toContain("storeId?: string");
      expect(cartSheetSrc).toContain("appSlug?: string");
      expect(cartSheetSrc).toContain("search: { store: storeId, app: appSlug }");
      expect(cartSheetSrc).toContain("!storeId && globalCarts.length > 1");
      expect(cartSheetSrc).toContain("appSlug ? \"Ver Catálogo\" : \"Explorar Mercado\"");
    });

    it("W7-02: AppShell ativa isStandalonePage para /checkout e /pedido quando parâmetros app ou store estão presentes", () => {
      const appShellSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/shell/app-shell.tsx"),
        "utf8",
      );

      expect(appShellSrc).toContain("isAppScopedOrderFlow");
      expect(appShellSrc).toContain('location.pathname.startsWith("/checkout") || location.pathname.startsWith("/pedido/")');
      expect(appShellSrc).toContain("isAppScopedOrderFlow;");
    });

    it("W7-03: _store.checkout.tsx suprime seletor multi-loja quando appSlug está definido e isola empty-state", () => {
      const checkoutSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/routes/_store.checkout.tsx"),
        "utf8",
      );

      expect(checkoutSrc).toContain("globalCarts && globalCarts.length > 1 && !appSlug && (");
      expect(checkoutSrc).toContain('to={appSlug ? "/app/$slug" : "/"}');
      expect(checkoutSrc).toContain('appSlug ? "Voltar ao Aplicativo" : "Explorar Produtos"');
      expect(checkoutSrc).toContain("search: appSlug ? { app: appSlug } : undefined");
    });

    it("W7-04: getMyStoresList em store.functions.ts e identity.server.ts bloqueiam vazamento de lojas de terceiros", () => {
      const storeFnSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/services/store.functions.ts"),
        "utf8",
      );
      const identityServerSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/lib/identity.server.ts"),
        "utf8",
      );

      expect(storeFnSrc).not.toContain('query = query.order("created_at", { ascending: false }).limit(50);');
      expect(storeFnSrc).toContain('query = query.eq("is_platform_root", true).limit(1);');
      expect(identityServerSrc).toContain('eq("is_platform_root", true)');
      expect(identityServerSrc).not.toContain('.order("created_at", { ascending: false })\n            .limit(1)');
    });

    it("W7-05: BrandedAppShell passa storeId e appSlug para CartSheet", () => {
      const shellSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/branded-app/branded-app-shell.tsx"),
        "utf8",
      );

      expect(shellSrc).toContain("<CartSheet");
      expect(shellSrc).toContain("storeId={store.id}");
      expect(shellSrc).toContain("appSlug={(appConfig as any)?.slug || store.slug}");
    });

    it("W7-06: Confirmação de pedido (/pedido/$publicToken/confirmacao) redireciona para o app próprio sem vazar para /mercado", () => {
      const confirmSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/routes/_store.pedido.$publicToken.confirmacao.tsx"),
        "utf8",
      );

      expect(confirmSrc).toContain("app: typeof search?.app === \"string\" ? search.app : undefined");
      expect(confirmSrc).toContain("targetAppSlug ? (");
      expect(confirmSrc).toContain('to="/app/$slug" params={{ slug: targetAppSlug }}');
      expect(confirmSrc).toContain("Voltar ao Aplicativo");
    });

    it("W7-07: Seletor de portais pós-login direciona exclusivamente para lojas autorizadas ou matriz institucional", () => {
      const portalSelectorSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src/routes/auth.portal-selector.tsx"),
        "utf8",
      );

      expect(portalSelectorSrc).toContain("getMyStoresList");
      expect(portalSelectorSrc).toContain("handleSelectStore");
      expect(portalSelectorSrc).toContain("handleSelectCivil");
      expect(portalSelectorSrc).toContain('/onboarding/empresa');
    });
  });
});
