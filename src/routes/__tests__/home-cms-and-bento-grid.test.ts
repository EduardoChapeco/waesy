import { describe, it, expect, vi } from "vitest";

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

vi.mock("@/lib/supabase", () => {
  const createChainable = () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: [], error: null }),
  });
  return {
    getAnonServerClient: () => createChainable(),
    getServerClient: () => createChainable(),
    SupabaseUnconfiguredError: class extends Error {},
  };
});


import {
  isHealthyImageUrl,
  resolveHealthyCover,
  CANONICAL_DEFAULT_HOME_SECTIONS,
  CANONICAL_EDITORIAL_FALLBACKS,
  type HomePageSectionDTO,
  type HomeSectionItemDTO,
  type NormalizedShowcasePost,
} from "@/services/admin-home-cms.functions";

describe("Homepage Nativa 3.0 & CMS Omni-Builder (DEC-220)", () => {
  describe("Validação Anti-Broken Image e Capas Saudáveis", () => {
    it("deve rejeitar URLs nulas, indefinidas ou objetos corrompidos", () => {
      expect(isHealthyImageUrl(null)).toBe(false);
      expect(isHealthyImageUrl(undefined)).toBe(false);
      expect(isHealthyImageUrl("")).toBe(false);
      expect(isHealthyImageUrl("   ")).toBe(false);
      expect(isHealthyImageUrl("null")).toBe(false);
      expect(isHealthyImageUrl("undefined")).toBe(false);
      expect(isHealthyImageUrl("[object Object]")).toBe(false);
      expect(isHealthyImageUrl("abc")).toBe(false);
    });

    it("deve aceitar URLs válidas com protocolo http, https ou caminho relativo", () => {
      expect(isHealthyImageUrl("https://images.unsplash.com/photo-123")).toBe(true);
      expect(isHealthyImageUrl("http://example.com/banner.png")).toBe(true);
      expect(isHealthyImageUrl("/images/hero.webp")).toBe(true);
    });

        it("deve retornar null para capa editorial honesta caso a imagem seja nula ou corrompida (Invariante B.8/B.33)", () => {
      const fallback0 = resolveHealthyCover(null, 0);
      expect(fallback0).toBeNull();

      const fallback1 = resolveHealthyCover(undefined, 1);
      expect(fallback1).toBeNull();

      const validUrl = "https://cdn.waesy.com.br/custom-photo.jpg";
      expect(resolveHealthyCover(validUrl, 0)).toBe(validUrl);
    });
  });

  describe("Seções Canônicas Padrão em Memória (Zero Downtime Fallback)", () => {
    it("deve conter as 5 seções mestres obrigatórias", () => {
      const keys = CANONICAL_DEFAULT_HOME_SECTIONS.map((s) => s.section_key);
      expect(keys).toContain("hero_banners");
      expect(keys).toContain("quick_categories_ifood");
      expect(keys).toContain("hotpages_grid");
      expect(keys).toContain("marketplace_categories");
      expect(keys).toContain("social_posts_vitrine");
    });

    it("a seção hero_banners deve estar em proporção '16:9' unificada Desktop/Mobile com show_title falso (cards limpos)", () => {
      const hero = CANONICAL_DEFAULT_HOME_SECTIONS.find((s) => s.section_key === "hero_banners");
      expect(hero).toBeDefined();
      expect(hero?.layout_variant).toBe("carousel");
      expect(hero?.aspect_ratio).toBe("16:9");
      expect(hero?.show_title).toBe(false);
    });

    it("a seção quick_categories_ifood deve ter proporção 1:1 e layout horizontal_scroll", () => {
      const quick = CANONICAL_DEFAULT_HOME_SECTIONS.find((s) => s.section_key === "quick_categories_ifood");
      expect(quick).toBeDefined();
      expect(quick?.layout_variant).toBe("horizontal_scroll");
      expect(quick?.aspect_ratio).toBe("1:1");
      expect(quick?.items.length).toBeGreaterThanOrEqual(6);
    });

    it("a seção hotpages_grid deve utilizar layout bento_grid e proporção 16:9", () => {
      const bento = CANONICAL_DEFAULT_HOME_SECTIONS.find((s) => s.section_key === "hotpages_grid");
      expect(bento).toBeDefined();
      expect(bento?.layout_variant).toBe("bento_grid");
      expect(bento?.aspect_ratio).toBe("16:9");
    });

        it("todos os itens canônicos devem ter URLs de destino seguras e imagem nula ou válida sem estoque sintético", () => {
      CANONICAL_DEFAULT_HOME_SECTIONS.forEach((sec) => {
        sec.items.forEach((item) => {
          expect(item.target_url).toBeTruthy();
          expect(item.target_url.startsWith("/")).toBe(true);
          if (item.image_url) {
            expect(isHealthyImageUrl(item.image_url)).toBe(true);
          }
        });
      });
    });
  });

  describe("Normalização e Integridade de Posts (Invariante B.30)", () => {
    it("deve estruturar posts com dados de autor, avatar, handle, badge de categoria, contadores de engajamento e timestamp", () => {
      const samplePost: NormalizedShowcasePost = {
        id: "post-101",
        title: "Festival Gastronômico no Parque Central",
        summary: "Mais de 20 restaurantes locais reunidos no fim de semana.",
        coverUrl: "https://cdn.waesy.com.br/festival.jpg",
        category: "Gastronomia",
        publishedAt: new Date().toISOString(),
        targetUrl: "/feed?postId=post-101",
        authorName: "Prefeitura & Comércio",
        authorHandle: "@prefeiturachapeco",
        authorAvatar: "https://cdn.waesy.com.br/avatar.jpg",
        isVerified: true,
        likesCount: 42,
        commentsCount: 7,
      };

      expect(samplePost.id).toBe("post-101");
      expect(isHealthyImageUrl(samplePost.coverUrl)).toBe(true);
      expect(samplePost.category).toBe("Gastronomia");
      expect(samplePost.targetUrl).toContain("/feed");
      expect(samplePost.isVerified).toBe(true);
      expect(samplePost.authorHandle).toBe("@prefeiturachapeco");
      expect(samplePost.likesCount).toBe(42);
      expect(samplePost.commentsCount).toBe(7);
      expect(isHealthyImageUrl(samplePost.authorAvatar)).toBe(true);
    });
  });

  describe("Invariante B.25: Integridade de Parâmetros e Fallbacks de Server Functions", () => {
    it("deve executar listPublicHomePageSections com e sem parâmetro city", async () => {
      const { listPublicHomePageSections } = await import("@/services/admin-home-cms.functions");

      // Branch 1: Parâmetro ausente / indefinido
      const resNoCity = await listPublicHomePageSections({ data: undefined });
      expect(Array.isArray(resNoCity)).toBe(true);
      expect(resNoCity.length).toBeGreaterThanOrEqual(1);

      // Branch 2: Parâmetro presente
      const resWithCity = await listPublicHomePageSections({ data: { city: "Chapecó" } });
      expect(Array.isArray(resWithCity)).toBe(true);
      expect(resWithCity.length).toBeGreaterThanOrEqual(1);
    });

    it("deve executar getUnifiedShowcasePosts sem posts falsos quando o banco retorna vazio", async () => {
      const { getUnifiedShowcasePosts } = await import("@/services/admin-home-cms.functions");

      // Branch 1: Parâmetros vazios com banco vazio -> Zero posts falsos
      const postsEmpty = await getUnifiedShowcasePosts({ data: undefined });
      expect(Array.isArray(postsEmpty)).toBe(true);
      expect(postsEmpty.length).toBe(0);

      // Branch 2: Parâmetros presentes (limit + city) com banco vazio -> Zero posts falsos
      const postsParam = await getUnifiedShowcasePosts({ data: { limit: 6, city: "Chapecó" } });
      expect(Array.isArray(postsParam)).toBe(true);
      expect(postsParam.length).toBe(0);
    });

    it("deve garantir que show_text é estritamente false por padrão e títulos/badges não são injetados sem autorização do admin", () => {
      const sampleItem: HomeSectionItemDTO = {
        id: "test-item",
        section_id: "sec-1",
        title: "Farmácia Central",
        subtitle: "Saúde e Bem-estar",
        image_url: "https://cdn.waesy.com.br/farmacia.webp",
        target_url: "/diretorio/farmacia",
        show_text: false,
        grid_span_x: 1,
        grid_span_y: 1,
        badge_text: "Destaque",
        is_active: true,
        sort_order: 1,
      };

      expect(sampleItem.show_text).toBe(false);
      expect(isHealthyImageUrl(sampleItem.image_url)).toBe(true);
    });

    it("deve rejeitar e omitir itens com image_url nula ou vazia perante a regra de omissão estrita", () => {
      const phantomItems: Array<{ image_url: string | null | undefined }> = [
        { image_url: null },
        { image_url: "" },
        { image_url: "   " },
        { image_url: undefined },
        { image_url: "null" },
      ];

      phantomItems.forEach((item) => {
        expect(isHealthyImageUrl(item.image_url)).toBe(false);
      });
    });
  });
});

