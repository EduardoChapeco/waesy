import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, ...props }: any) => {
    const resolved =
      typeof to === "string" && params?.slug ? to.replace("$slug", String(params.slug)) : to;
    return React.createElement("a", { href: resolved, ...props }, children);
  },
  useLocation: () => ({ pathname: "/sistemas/turis", searchStr: "" }),
}));

import {
  canAccessModule,
  canAccessWorkspaceGroup,
} from "@/lib/multi-brand-engine";
import { getSidebarConfig } from "@/lib/workspace-navigation";
import { isEditorialMarketingRoute } from "@/lib/navigation-registry";
import {
  CANONICAL_VERTICAL_SUBSYSTEMS,
  resolveSubsystemBySlug,
  resolveSubsystemFromHost,
} from "@/lib/vertical-subsystems";
import { buildDefaultVerticalLanding } from "@/lib/vertical-landing-presets";
import { VerticalLandingView } from "@/components/landing/vertical-landing-view";

describe("Isolamento de Sistemas Verticais, Landings Editáveis & Conexão Auth (SPEC-20261116)", () => {
  it("1. Isola módulos reais de Workspace por vertical/nicho sem vazamento nem bloqueio de plano professional/starter", () => {
    const turisStore = {
      id: "st-turis",
      brand_origin: "turis",
      primary_niche_id: "tourism",
      vertical_sku: "waesy_tourism_pro",
      subscription_tier: "professional",
      approval_status: "approved",
      is_active: true,
    };

    expect(canAccessModule(turisStore, "proposals")).toBe(true);
    expect(canAccessModule(turisStore, "quotes")).toBe(true);
    expect(canAccessWorkspaceGroup(turisStore, "overview")).toBe(true);
    expect(canAccessWorkspaceGroup(turisStore, "tourism-commercial")).toBe(true);
    expect(canAccessWorkspaceGroup(turisStore, "tourism-trips")).toBe(true);
    expect(canAccessWorkspaceGroup(turisStore, "settings")).toBe(true);

    const turisSidebar = getSidebarConfig(turisStore);
    const turisGroupIds = turisSidebar.map((g) => g.id);
    expect(turisGroupIds).toContain("tourism-commercial");
    expect(turisGroupIds).toContain("tourism-trips");
    expect(turisGroupIds).not.toContain("gastro-catalog");
    expect(turisGroupIds).not.toContain("automotive-workshop");

    const gastroStore = {
      id: "st-tableway",
      brand_origin: "tableway",
      primary_niche_id: "gastronomy",
      vertical_sku: "waesy_gastro_delivery",
      subscription_tier: "professional",
      approval_status: "approved",
      is_active: true,
    };
    const gastroSidebar = getSidebarConfig(gastroStore);
    const gastroGroupIds = gastroSidebar.map((g) => g.id);
    expect(gastroGroupIds).toContain("gastro-catalog");
    expect(gastroGroupIds).toContain("gastro-orders");
    expect(gastroGroupIds).not.toContain("tourism-commercial");

    const signflowStore = {
      id: "st-signflow",
      brand_origin: "signflow",
      subscription_tier: "professional",
      approval_status: "approved",
      is_active: true,
    };
    const signflowGroupIds = getSidebarConfig(signflowStore).map((g) => g.id);
    expect(signflowGroupIds).toContain("contracts-global");
    expect(signflowGroupIds).not.toContain("gastro-orders");
    expect(signflowGroupIds).not.toContain("tourism-operations");
  });

  it("2. Sincroniza todos os sistemas verticais, domínios dedicados e suprime AppShell em /sistemas/*", () => {
    const requiredSlugs = [
      "pro",
      "explorer",
      "turis",
      "tableway",
      "wowbook",
      "passhub",
      "lexcloud",
      "talentlink",
      "signflow",
      "omnipage",
      "autocenter",
      "imobiliaria",
      "varejo",
      "talk",
      "studio",
      "copilot",
      "marketplace",
      "classificados",
      "noticias",
      "go",
      "places",
    ];
    const catalogIds = new Set(CANONICAL_VERTICAL_SUBSYSTEMS.map((s) => s.id));
    for (const slug of requiredSlugs) {
      expect(catalogIds.has(slug), `Subsistema ausente: ${slug}`).toBe(true);
      expect(resolveSubsystemBySlug(slug)?.id).toBe(slug);
    }

    expect(resolveSubsystemFromHost("turis.waesy.com.br")?.id).toBe("turis");
    expect(resolveSubsystemFromHost("lexcloud.waesy.com.br")?.id).toBe("lexcloud");
    expect(resolveSubsystemFromHost("oficinas.waesy.com.br")?.id).toBe("autocenter");
    expect(isEditorialMarketingRoute("/sistemas", "marketplace_local", "")).toBe(true);
    expect(isEditorialMarketingRoute("/sistemas/turis", "marketplace_local", "")).toBe(true);
  });

  it("3. Renderiza landing nichada com mídia enviada, seções CMS, módulos isolados, planos do nicho e link Auth/Signup", () => {
    const landing = buildDefaultVerticalLanding("turis");
    landing.hero_image_desktop_url = "https://cdn.waesy.com.br/cms/turis-hero.webp";
    landing.sections.push({
      id: "sec-custom-1",
      landing_slug: "turis",
      section_type: "feature_split",
      title: "Mapa de Poltronas ao Vivo",
      subtitle: "Controle completo de ônibus e vans.",
      body: "Aloque passageiros sem conflito de assento.",
      media_desktop_url: "https://cdn.waesy.com.br/cms/turis-bus-seat.webp",
      layout_variant: "split_right",
      items_json: [{ title: "Embarque com QR Code" }],
      sort_order: 20,
      is_active: true,
    });

    const html = renderToStaticMarkup(
      React.createElement(VerticalLandingView, {
        landing,
        subsystem: resolveSubsystemBySlug("turis"),
      }),
    );

    expect(html).toContain("https://cdn.waesy.com.br/cms/turis-hero.webp");
    expect(html).toContain("https://cdn.waesy.com.br/cms/turis-bus-seat.webp");
    expect(html).toContain("Mapa de Poltronas ao Vivo");
    expect(html).toContain("Cotações &amp; Propostas Visuais");
    expect(html).not.toContain("KDS Cozinha &amp; Comandas");
    expect(html).toContain("/painel?vertical=turis&amp;niche=tourism&amp;sku=waesy_tourism_pro&amp;aba=cadastro");
    expect(html).toContain("/painel?vertical=turis&amp;niche=tourism&amp;sku=waesy_tourism_pro&amp;aba=login");
  });

  it("4. Garante SQL migration 20270522000000 com FORCE RLS e mutações BFF protegidas por requirePlatformAdmin", () => {
    const sqlPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20270522000000_vertical_landing_cms_and_niche_plans.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.platform_landing_pages");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.platform_landing_sections");
    expect(sql).toContain("ALTER TABLE public.platform_landing_pages FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.platform_landing_sections FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("public.is_platform_admin()");

    const bffSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/vertical-landings.functions.ts"),
      "utf-8",
    );
    expect(bffSrc).toContain("requirePlatformAdmin()");
  });
});
