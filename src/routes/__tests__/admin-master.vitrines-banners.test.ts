import { describe, it, expect } from "vitest";
import { LAYOUT_OPTIONS } from "../admin-master.vitrines";
import { PLACEMENT_OPTIONS } from "../admin-master.banners";
import type { SurfaceLayoutVariant, SurfaceSectionDTO } from "@/services/surface-cms.functions";

describe("Admin Master Vitrines & Banners CMS (Onda 11 - DEC-170)", () => {
  it("deve conter a opção de layout 'rail_feature_card' no seletor de vitrines (iFood-Style)", () => {
    const featureCardOption = LAYOUT_OPTIONS.find((opt) => opt.id === "rail_feature_card");
    expect(featureCardOption).toBeDefined();
    expect(featureCardOption?.label).toContain("iFood-Style");
  });

  it("deve conter a opção de layout 'rail_lead_banner' no seletor de vitrines", () => {
    const leadBannerOption = LAYOUT_OPTIONS.find((opt) => opt.id === "rail_lead_banner");
    expect(leadBannerOption).toBeDefined();
    expect(leadBannerOption?.label).toContain("Banner Líder");
  });

  it("deve conter todas as opções de vitrine essenciais em PLACEMENT_OPTIONS de banners", () => {
    const ids = PLACEMENT_OPTIONS.map((p) => p.id);
    expect(ids).toContain("all");
    expect(ids).toContain("home");
    expect(ids).toContain("home_middle");
    expect(ids).toContain("gastronomia");
    expect(ids).toContain("mercado");
    expect(ids).toContain("eventos");
    expect(ids).toContain("turismo");
    expect(ids).toContain("imoveis");
    expect(ids).toContain("empregos");
    expect(ids).toContain("classificados");
  });

  it("deve suportar tipagem e resolução de seção com layout rail_feature_card", () => {
    const section: SurfaceSectionDTO = {
      id: "sec-123",
      surface_id: "surf-456",
      type: "product_rail",
      title: "Top Mais Pedidos",
      subtitle: "Os produtos favoritos da região",
      badge_tag: "Destaque",
      data_source: "top_sellers",
      ranking_strategy: "popularity",
      layout_variant: "rail_feature_card",
      item_limit: 12,
      sort_order: 1,
      is_active: true,
      config: {
        lead_card: {
          title: "Top Mais Pedidos",
          subtitle: "Seleção especial",
          badge: "#1 Top",
          gradient: "from-orange-500 to-red-600",
          action_url: "/marketplace?sort=top_sellers",
        },
      },
      items: [
        { id: "item-1", title: "Pizza Calabresa", price_cents: 4500 },
      ],
    };

    expect(section.layout_variant).toBe("rail_feature_card");
    expect(section.config?.lead_card?.badge).toBe("#1 Top");
    expect(section.items?.length).toBe(1);
  });

  it("deve derivar feature lead card honesto mesmo sem config explícito", () => {
    function resolveRailLeadCard(section: { layout_variant: SurfaceLayoutVariant; title: string; subtitle?: string | null; badge_tag?: string | null; config?: any }) {
      const isFeatureRail =
        section.layout_variant === "rail_feature_card" ||
        section.layout_variant === "rail_lead_banner" ||
        Boolean(section.config?.lead_card);

      if (!isFeatureRail) return null;

      const lead = section.config?.lead_card;
      return {
        title: lead?.title || section.title,
        subtitle: lead?.subtitle || section.subtitle || undefined,
        badge: lead?.badge || section.badge_tag || "Destaque",
        actionUrl: lead?.action_url || lead?.href || "/marketplace",
        gradient: lead?.gradient || "from-primary/90 via-primary to-accent",
      };
    }

    const res = resolveRailLeadCard({
      layout_variant: "rail_feature_card",
      title: "Super Promoções",
      subtitle: "Até 50% de desconto",
      badge_tag: "Economia",
    });

    expect(res).not.toBeNull();
    expect(res?.title).toBe("Super Promoções");
    expect(res?.badge).toBe("Economia");
    expect(res?.actionUrl).toBe("/marketplace");
  });
});
