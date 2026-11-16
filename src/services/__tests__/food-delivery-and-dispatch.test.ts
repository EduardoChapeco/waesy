import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getChannelInfo } from "@/components/commerce/channel-badge";
import {
  getMasterSidebarPillars,
  resolveWorkspaceNavigation,
} from "@/lib/workspace-navigation";

function readWorkspaceFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("Canais de Delivery BR, Despacho Externo & Separação — Contrato E2E", () => {
  it("resolve identidades visuais para todas as plataformas de delivery brasileiras", () => {
    expect(getChannelInfo("ifood").label).toBe("iFood");
    expect(getChannelInfo("99food").label).toBe("99Food");
    expect(getChannelInfo("tridelivery").label).toBe("TriDelivery");
    expect(getChannelInfo("amoofertas").label).toBe("Amo Ofertas");
    expect(getChannelInfo("amodelivery").label).toBe("Amo Delivery");
    expect(getChannelInfo("aiqfome").label).toBe("aiqfome");
    expect(getChannelInfo("rappi").label).toBe("Rappi");
  });

  it("alinha plataformas de food delivery entre migration SQL, webhooks, hub e gestor KDS", () => {
    const migrationSql = readWorkspaceFile(
      "supabase/migrations/20270515000000_food_delivery_platforms_and_orders_sync.sql",
    );
    const webhooksTs = readWorkspaceFile(
      "src/services/marketplace-webhooks.functions.ts",
    );
    const hubTs = readWorkspaceFile("src/services/marketplace-hub.functions.ts");
    const webhookRouteTs = readWorkspaceFile(
      "src/routes/api.webhooks.marketplaces.ts",
    );
    const kdsTsx = readWorkspaceFile("src/routes/workspace.pedidos.gestor.tsx");

    const foodChannels = [
      "ifood",
      "99food",
      "tridelivery",
      "amoofertas",
      "amodelivery",
      "aiqfome",
      "rappi",
    ];

    for (const ch of foodChannels) {
      expect(migrationSql, `Migration missing "${ch}"`).toContain(`'${ch}'`);
      expect(webhooksTs, `Webhooks missing "${ch}"`).toContain(`"${ch}"`);
      expect(hubTs, `Hub missing "${ch}"`).toContain(`"${ch}"`);
      expect(kdsTsx, `KDS gestor missing "${ch}"`).toContain(`"${ch}"`);
    }

    expect(webhooksTs).toContain("processFoodDeliveryWebhookEvent");
    expect(webhooksTs).toContain('origin_type: "ecommerce"');
    expect(webhooksTs).toContain('shipping_method:');
    expect(webhookRouteTs).toContain("x-tridelivery-signature");
    expect(webhookRouteTs).toContain("x-99food-signature");
    expect(webhookRouteTs).toContain("x-amo-signature");
    expect(webhookRouteTs).toContain("x-aiqfome-signature");
  });

  it("alinha colunas reais de shipping_address, buyer_name, tracking_number e order_items em shipping/wms", () => {
    const shippingTs = readWorkspaceFile("src/services/shipping.functions.ts");
    const wmsTs = readWorkspaceFile("src/services/wms.functions.ts");

    // shipping.functions.ts must read canonical marketplace_external_orders columns
    expect(shippingTs).toContain("ext.buyer_name");
    expect(shippingTs).toContain("ext.tracking_number");
    expect(shippingTs).toContain("ext.shipping_carrier");
    expect(shippingTs).toContain("ext.imported_at");
    expect(shippingTs).toContain("Number(item.qty || item.quantity || 1)");
    expect(shippingTs).toContain('shipping_carrier: data.carrier');
    expect(shippingTs).toContain('dispatched_at: new Date().toISOString()');

    // wms.functions.ts must join real order_items FK columns and backfill items_snapshot
    expect(wmsTs).toContain("product_title");
    expect(wmsTs).toContain("variant_sku");
    expect(wmsTs).toContain("product_variants:variant_id");
    expect(wmsTs).toContain("items_snapshot");
    expect(wmsTs).not.toContain("order_item:order_items(id, title, product_id");
    expect(wmsTs).not.toContain(
      "order_item:order_items(id, product_id, title, metadata",
    );
  });

  it("garante separação e exclusão segura na rota workspace.pedidos.expedicao sem jargões técnicos", () => {
    const expedicaoTsx = readWorkspaceFile(
      "src/routes/workspace.pedidos.expedicao.tsx",
    );

    expect(expedicaoTsx).toContain("deleteExternalMarketplaceOrder");
    expect(expedicaoTsx).toContain("Remover Teste");
    expect(expedicaoTsx).toContain("manifestPreview");
    expect(expedicaoTsx).toContain("Imprimir Romaneio");
    expect(expedicaoTsx).not.toContain("Conferência WMS");
    expect(expedicaoTsx).not.toContain("Ondas de Separação");
    expect(expedicaoTsx).not.toContain("Bipagem de Produtos");
    expect(expedicaoTsx).not.toContain("picking simultâneo");
  });

  it("adapta pilar logística do nicho gastronomia sem módulos de ecommerce/transporte pesado", () => {
    const gastroGroups = resolveWorkspaceNavigation({ niche: "gastronomy" });
    const pillars = getMasterSidebarPillars(gastroGroups, "gastronomy");
    const logisticaPillar = pillars.find((p) => p.id === "logistica");

    expect(logisticaPillar).toBeDefined();
    expect(logisticaPillar?.items.some((i) => i.path === "/workspace/pedidos/frota")).toBe(
      true,
    );
    expect(
      logisticaPillar?.items.some((i) => i.path === "/workspace/logistica/pudo"),
    ).toBe(false);
    expect(
      logisticaPillar?.items.some((i) => i.path === "/workspace/logistica/cte"),
    ).toBe(false);
  });
});
