import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  assertStoreAccess: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  getRequest: vi.fn(() => ({ headers: new Headers() })),
  getCookie: vi.fn(() => undefined),
  setCookie: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: any } = {};
    const builder: any = {
      validator: (schema: any) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: any) => unknown) => {
        const invoke = (args: any) => {
          const parsedData = state.schema ? state.schema.parse(args?.data) : args?.data;
          return handler({ data: parsedData });
        };
        (invoke as any).schema = state.schema;
        return invoke;
      },
    };
    return builder;
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: mocks.getRequest,
  getCookie: mocks.getCookie,
  setCookie: mocks.setCookie,
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  assertStoreAccess: mocks.assertStoreAccess,
}));

import {
  buildDefaultWebPageConfig,
  type ProposalWebPageDTO,
} from "@/lib/tourism/proposal-normalization";
import {
  upsertProposalWebPage,
  approveTravelProposal,
  UpsertProposalWebPageSchema,
} from "@/services/travel-proposal.functions";

describe("Proposal Web Sticky Showcase, Chat IA Drawer & Gateway Online E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Normalization & Default WebPageConfig", () => {
    it("deve inicializar configuração web com card sticky, consultor IA, aviso de simulação e pacotes relacionados ativados por padrão", () => {
      const proposalMock: any = {
        id: "prop-e2e-1",
        title: "Férias em Maragogi & Alagoas",
        destination_city: "Maragogi",
        hotels: [],
        transfers: [],
        tours: [],
        flights: [],
      };

      const config = buildDefaultWebPageConfig(proposalMock);

      expect(config.sticky_card_enabled).toBe(true);
      expect(config.ai_advisor_enabled).toBe(true);
      expect(config.whatsapp_button_enabled).toBe(true);
      expect(config.show_simulation_disclaimer).toBe(true);
      expect(config.show_related_packages).toBe(true);
      expect(config.allow_online_gateway_payment).toBe(false);

      const blockTypes = config.blocks.map((b) => b.type);
      expect(blockTypes).toContain("simulation_disclaimer");
      expect(blockTypes).toContain("related_packages");
    });
  });

  describe("2. Upsert Proposal Web Page Schema & Validation", () => {
    it("deve validar payload completo com sticky card, consultor IA, gateway URL e avisos legais", () => {
      const validPayload = {
        proposalId: "prop-e2e-1",
        slug: "ferias-maragogi-2026",
        headline: "Maragogi dos Sonhos",
        subheadline: "Roteiro exclusivo beira-mar",
        theme_preset: "editorial",
        accent_color: "#059669",
        hero_layout: "gallery_mosaic_3",
        hero_media: [],
        blocks: [],
        show_option_tabs: true,
        cta_label: "Reservar Pacote",
        is_published: true,
        sticky_card_enabled: true,
        ai_advisor_enabled: true,
        ai_advisor_prompt: "Destaque que todos os passeios em Maragogi são com guia credenciado.",
        whatsapp_button_enabled: true,
        whatsapp_phone: "5549999123456",
        allow_online_gateway_payment: true,
        payment_gateway_url: "https://pagamento.exemplo.com.br/checkout/12345",
        show_simulation_disclaimer: true,
        simulation_disclaimer_text: "Valores sujeitos a alteração cambial e disponibilidade.",
        show_related_packages: true,
        related_packages_title: "Destinos Similares no Nordeste",
        promo_banner_url: "https://imagens.exemplo.com.br/banner-promo.jpg",
        promo_banner_link: "https://agencia.com.br/campanha",
      };

      const parsed = UpsertProposalWebPageSchema.parse(validPayload);

      expect(parsed.sticky_card_enabled).toBe(true);
      expect(parsed.ai_advisor_enabled).toBe(true);
      expect(parsed.ai_advisor_prompt).toBe("Destaque que todos os passeios em Maragogi são com guia credenciado.");
      expect(parsed.whatsapp_phone).toBe("5549999123456");
      expect(parsed.allow_online_gateway_payment).toBe(true);
      expect(parsed.payment_gateway_url).toBe("https://pagamento.exemplo.com.br/checkout/12345");
      expect(parsed.show_simulation_disclaimer).toBe(true);
      expect(parsed.show_related_packages).toBe(true);
      expect(parsed.related_packages_title).toBe("Destinos Similares no Nordeste");
      expect(parsed.promo_banner_url).toBe("https://imagens.exemplo.com.br/banner-promo.jpg");
    });
  });

  describe("3. Approve Travel Proposal Schema with Gateway Online", () => {
    it("deve aceitar 'gateway_online' como preferência de pagamento válida no schema de aprovação", () => {
      const approvalPayload = {
        token: "tok-public-123456",
        snapshotHash: "hash-sha256-abcdef",
        acceptedByName: "Carlos Silva",
        acceptedByEmail: "carlos@exemplo.com",
        passengers: [
          { name: "Carlos Silva", document: "123.456.789-00", isLead: true },
          { name: "Mariana Silva", document: "987.654.321-11", isLead: false },
        ],
        paymentPreference: "gateway_online" as const,
        paymentInstallments: null,
      };

      const schema = (approveTravelProposal as any).schema;
      const parsed = schema.parse(approvalPayload);

      expect(parsed.paymentPreference).toBe("gateway_online");
      expect(parsed.passengers).toHaveLength(2);
      expect(parsed.passengers[0].name).toBe("Carlos Silva");
    });
  });

  describe("4. Upsert Server Function Execution", () => {
    it("deve persistir e retornar colunas estendidas de sticky card, AI drawer e gateway online", async () => {
      mocks.requireStaff.mockResolvedValueOnce({
        id: "user-agent-1",
        account_type: "store",
        store_id: "store-agency-1",
      });

      const mockDbRow = {
        id: "web-page-row-1",
        proposal_id: "prop-e2e-1",
        store_id: "store-agency-1",
        slug: "maragogi-reserva",
        headline: "Maragogi Completo",
        subheadline: "5 dias com aéreo e resort",
        theme_preset: "editorial",
        accent_color: null,
        hero_layout: "split",
        hero_media: [],
        blocks: [],
        show_option_tabs: true,
        cta_label: "Reservar",
        is_published: true,
        seo_title: null,
        seo_description: null,
        countdown_config: {},
        availability_config: {},
        payment_display_config: {},
        trust_badges_config: {},
        show_flight_route_map: true,
        sticky_card_enabled: true,
        ai_advisor_enabled: true,
        ai_advisor_prompt: "Consultor focado em famílias com crianças.",
        whatsapp_button_enabled: true,
        whatsapp_phone: "554999998877",
        allow_online_gateway_payment: true,
        payment_gateway_url: "https://gateway.exemplo.com/pay/9988",
        show_simulation_disclaimer: true,
        simulation_disclaimer_text: "Cotação preliminar sujeita à confirmação.",
        show_related_packages: true,
        related_packages_title: "Outros Destinos Recomendados",
        promo_banner_url: "https://agencia.com/banner.png",
        promo_banner_link: "https://agencia.com/promo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "travel_proposals") {
            const queryObj: any = {
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "prop-e2e-1", store_id: "store-agency-1" },
                error: null,
              }),
            };
            return {
              select: vi.fn().mockReturnValue(queryObj),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "travel_proposal_web_pages" || table === "proposal_web_pages") {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockDbRow,
                    error: null,
                  }),
                }),
              }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      };

      mocks.getServerClient.mockReturnValueOnce(mockSupabase);

      const result = await upsertProposalWebPage({
        data: {
          proposalId: "prop-e2e-1",
          slug: "maragogi-reserva",
          headline: "Maragogi Completo",
          subheadline: "5 dias com aéreo e resort",
          theme_preset: "editorial",
          accent_color: null,
          hero_layout: "split",
          hero_media: [],
          blocks: [],
          show_option_tabs: true,
          cta_label: "Reservar",
          is_published: true,
          sticky_card_enabled: true,
          ai_advisor_enabled: true,
          ai_advisor_prompt: "Consultor focado em famílias com crianças.",
          whatsapp_button_enabled: true,
          whatsapp_phone: "554999998877",
          allow_online_gateway_payment: true,
          payment_gateway_url: "https://gateway.exemplo.com/pay/9988",
          show_simulation_disclaimer: true,
          simulation_disclaimer_text: "Cotação preliminar sujeita à confirmação.",
          show_related_packages: true,
          related_packages_title: "Outros Destinos Recomendados",
          promo_banner_url: "https://agencia.com/banner.png",
          promo_banner_link: "https://agencia.com/promo",
        },
      });

      expect(result.success).toBe(true);
      expect(result.webPage.sticky_card_enabled).toBe(true);
      expect(result.webPage.ai_advisor_enabled).toBe(true);
      expect(result.webPage.ai_advisor_prompt).toBe("Consultor focado em famílias com crianças.");
      expect(result.webPage.allow_online_gateway_payment).toBe(true);
      expect(result.webPage.payment_gateway_url).toBe("https://gateway.exemplo.com/pay/9988");
      expect(result.webPage.show_simulation_disclaimer).toBe(true);
      expect(result.webPage.show_related_packages).toBe(true);
      expect(result.webPage.related_packages_title).toBe("Outros Destinos Recomendados");
      expect(result.webPage.promo_banner_url).toBe("https://agencia.com/banner.png");
    });
  });

  describe("4. Proposal Web Showcase Contract: Sticky Sidebar Parity with Classifieds", () => {
    it("deve conter classes canônicas de sticky sidebar e estrutura desvinculada do hero", async () => {
      const fs = await import("node:fs");
      const showcaseCode = fs.readFileSync(
        "src/components/tourism/studio/proposal-web-showcase.tsx",
        "utf-8",
      );

      // Card sticky deve estar presente no aside desktop
      expect(showcaseCode).toContain("lg:sticky lg:top-4");
      expect(showcaseCode).toContain("lg:col-span-5 xl:col-span-4 self-start");

      // No mobile, o card comercial deve aparecer no topo do roteiro
      expect(showcaseCode).toContain("lg:hidden");

      // Hero dividido deve separar textos à esquerda e foto à direita sem card comercial
      expect(showcaseCode).toContain("Layout Dividido Editorial");
      expect(showcaseCode).toContain("MediaItemViewer");

      // Suporte a opções em pacotes relacionados
      expect(showcaseCode).toContain("hasMultipleOpts");
    });
  });
});
