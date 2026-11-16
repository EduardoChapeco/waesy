import fs from "node:fs";
import path from "node:path";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ArtifactCreativePost } from "@/components/chat/artifacts/ArtifactCreativePost";
import { IFoodRecentStoresRail } from "@/components/commerce/ifood/IFoodRecentStoresRail";

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8").replace(/\r\n/g, "\n");
}

describe("Produção — Regressão Forense de Logs, RPCs, Schema Drift e Rotas (2026-11-15)", () => {
  it("corrige close_cash_register RPC e schema de cash_registers/cash_register_entries", () => {
    const migration = readRepoFile("supabase/migrations/20270519000000_fix_close_cash_register_rpc.sql");
    expect(migration).toContain("WHERE cash_register_id = p_register_id");
    expect(migration).toContain("expected_closing_balance_cents = v_expected_cents");
    expect(migration).toContain("actual_closing_balance_cents = p_counted_cents");
    expect(migration).not.toContain("WHERE register_id = p_register_id");
    expect(migration).not.toContain("expected_balance_cents = v_expected_cents");
    expect(migration).not.toContain("final_balance_cents = p_counted_cents");

    const dashboardTs = readRepoFile("src/services/dashboard.functions.ts");
    expect(dashboardTs).toContain('.eq("cash_register_id", activeRegister.id)');
    expect(dashboardTs).not.toContain('.eq("register_id", activeRegister.id)');

    const cashTs = readRepoFile("src/services/cash.functions.ts");
    expect(cashTs).toContain("expected_closing_balance_cents");
    expect(cashTs).toContain("actual_closing_balance_cents");
  });

  it("elimina colunas inexistentes em order_items, orders e events nos BFFs de pedidos/ingressos/cozinha/chat", () => {
    const orderTs = readRepoFile("src/services/order.functions.ts");
    expect(orderTs).not.toMatch(/order_items\s*\([^)]*\bmetadata\b/);

    const ticketsTs = readRepoFile("src/services/event-tickets.functions.ts");
    expect(ticketsTs).not.toContain("banner_image_url");
    expect(ticketsTs).toContain("banner_url");
    expect(ticketsTs).toContain('.eq("customer_id", user.id)');
    expect(ticketsTs).not.toContain('.eq("user_id", user.id)');
    expect(ticketsTs).not.toMatch(/order_items\([^)]*\bmetadata\b/);
    expect(ticketsTs).not.toMatch(/order_items\([^)]*\bquantity\b/);
    expect(ticketsTs).toContain("item.selected_options || item.variant_attributes");
    expect(ticketsTs).toContain("item.qty || 1");

    const kitchenTs = readRepoFile("src/services/kitchen-prep.functions.ts");
    expect(kitchenTs).toContain("items:order_items(id, product_title, qty, unit_price_cents, total_cents)");
    expect(kitchenTs).not.toContain("items:order_items(id, title, quantity, price_cents)");

    const chatTs = readRepoFile("src/services/chat.functions.ts");
    expect(chatTs).not.toContain("total_amount_cents, payment_method, created_at, items:order_items(product_name, quantity, price_cents)");
    expect(chatTs).toContain("order:orders(id, status, total_cents, shipping_method, created_at, payments(method, status), items:order_items(id, product_title, qty, unit_price_cents, total_cents))");
    expect(chatTs).toContain("total_amount_cents: rawOrder.total_cents ?? 0");
  });

  it("impede filtro uuid com slug não-UUID em directory_listings e stores", () => {
    const dirTs = readRepoFile("src/services/directory.functions.ts");
    expect(dirTs).not.toContain('query = query.eq("id", listingId);');
    expect(dirTs).not.toContain('query = query.eq("id", data.id);');

    const catalogTs = readRepoFile("src/services/catalog.functions.ts");
    expect(catalogTs).not.toContain("slug.eq.${storeIdToUse},id.eq.${storeIdToUse}");

    const placesTs = readRepoFile("src/services/places-detail.functions.ts");
    expect(placesTs).not.toContain(".or(`id.eq.${cleanSlug},business_name.ilike.%${cleanSlug}%`)");
    expect(placesTs).toContain("isUuid\n        ? storeQuery.or(`slug.eq.${cleanSlug},id.eq.${cleanSlug}`)");
  });

  it("elimina 406 (.single before fallback) e tabelas inexistentes no sitemap e supermercado", () => {
    const eventsTs = readRepoFile("src/services/events.functions.ts");
    const getEventSection = eventsTs.slice(eventsTs.indexOf("async function _getEventWithLots"));
    expect(getEventSection.slice(0, 450)).toContain(".maybeSingle()");

    const supermarketTs = readRepoFile("src/services/supermarket.functions.ts");
    expect(supermarketTs).not.toContain('"store_delivery_windows"');

    const sitemapTs = readRepoFile("src/routes/sitemap[.]xml.ts");
    expect(sitemapTs).not.toContain('"travel_destinations"');
    expect(sitemapTs).not.toContain('"travel_hotels"');
    expect(sitemapTs).not.toContain('"mined_recipes"');
    expect(sitemapTs).not.toContain('"links_in_bio"');
    expect(sitemapTs).not.toContain('"store_raffles"');
    expect(sitemapTs).toContain('"destinations"');
    expect(sitemapTs).toContain('"global_hotels"');
    expect(sitemapTs).toContain('"mined_raw_extractions"');
    expect(sitemapTs).toContain('"link_in_bio"');
    expect(sitemapTs).toContain('"raffles"');

    const rlsTestTs = readRepoFile("src/services/__tests__/cross-tenant-rls-isolation.test.ts");
    expect(rlsTestTs).toContain("if (!isPoolConnected || !addressBId) return;");
  });

  it("renderiza ArtifactCreativePost com bullets/hashtags nulos sem lançar TypeError e aponta IFoodRecentStoresRail para rota válida", () => {
    const html = renderToStaticMarkup(
      React.createElement(ArtifactCreativePost, {
        title: "Criativo Teste",
        bullets: null as any,
        hashtags: null as any,
      }),
    );
    expect(html).toContain("Criativo Teste");

    const railTsx = readRepoFile("src/components/commerce/ifood/IFoodRecentStoresRail.tsx");
    expect(railTsx).not.toContain('viewMoreTo = "/lojas"');
    expect(railTsx).toContain('viewMoreTo = "/diretorio"');
    expect(typeof IFoodRecentStoresRail).toBe("function");
  });

  it("evita surface_id sintético não-UUID e ambiguidade FK directory_listings->stores", () => {
    const surfaceTs = readRepoFile("src/services/surface-cms.functions.ts");
    expect(surfaceTs).toContain("if (!surface || !isSurfaceUuid)");
    expect(surfaceTs).toContain("if (!canonicalSurf?.id) return { success: true };");

    const sitemapEmpresasTs = readRepoFile("src/routes/sitemap-empresas[.]xml.ts");
    expect(sitemapEmpresasTs).toContain("stores:stores!directory_listings_store_id_fkey(slug)");
    expect(sitemapEmpresasTs).not.toContain('select("id, store_id, stores(slug), updated_at")');

    const socialTs = readRepoFile("src/services/social.functions.ts");
    expect(socialTs).toContain("stores:stores!directory_listings_store_id_fkey(name, settings)");
    expect(socialTs).not.toContain('select("id, category, contact_phone, store_id, stores(name, settings)")');
  });
});
