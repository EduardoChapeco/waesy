import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

import type {} from "@tanstack/react-start";
function escapeCsv(field: any): string {
  if (field === null || field === undefined) return "";
  const str = String(field).trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const Route = createFileRoute("/api/feed/meta.csv")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = getServerClient();
          const url = new URL(request.url);
          const storeId = url.searchParams.get("store") || url.searchParams.get("storeId");

          let query = db
            .from("products")
            .select(
              `
              id, slug, title, short_description, description, manufacturer, price_cents, compare_at_cents, status,
              product_variants(id, sku, price_cents, price_override_cents, stock_on_hand),
              product_media(url, sort_order)
            `
            )
            .in("status", ["published", "active"]);

          let resolvedStoreId: string | null = null;
          if (storeId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
            if (isUuid) {
              resolvedStoreId = storeId;
            } else {
              const { data: st } = await db.from("stores").select("id").eq("slug", storeId).maybeSingle();
              resolvedStoreId = st?.id || null;
            }
          }

          if (resolvedStoreId) {
            query = query.eq("store_id", resolvedStoreId);
          }

          const { data: products, error } = await query.limit(500);

          if (error) {
            return new Response("Erro ao carregar catálogo", { status: 500 });
          }

          // Header CSV canônico exigido pelo Facebook / Meta Commerce Manager
          const headers = [
            "id",
            "title",
            "description",
            "availability",
            "condition",
            "price",
            "link",
            "image_link",
            "brand",
            "item_group_id",
          ];

          const rows: string[] = [headers.join(",")];

          for (const p of products || []) {
            const variants = p.product_variants || [];
            const medias = (p.product_media || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
            const thumb = medias[0]?.url || "";

            if (variants.length === 0) {
              variants.push({
                id: p.id,
                sku: p.slug,
                price_cents: p.price_cents,
                price_override_cents: null,
                stock_on_hand: 0,
              });
            }

            for (const v of variants) {
              const effectivePrice = (v.price_override_cents ?? v.price_cents ?? p.price_cents) / 100;
              const link = `${url.origin}/produto/${p.slug}?v=${v.sku || v.id}&utm_source=meta_catalog&utm_medium=dpa`;
              const availability = (v.stock_on_hand || 0) > 0 ? "in stock" : "out of stock";

              rows.push(
                [
                  escapeCsv(v.sku || v.id),
                  escapeCsv(p.title),
                  escapeCsv(p.short_description || p.description || p.title),
                  escapeCsv(availability),
                  "new",
                  escapeCsv(`${effectivePrice.toFixed(2)} BRL`),
                  escapeCsv(link),
                  escapeCsv(thumb),
                  escapeCsv(p.manufacturer || "Waesy"),
                  escapeCsv(p.id),
                ].join(",")
              );
            }
          }

          return new Response(rows.join("\n"), {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": 'inline; filename="meta-catalog.csv"',
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch (err) {
          console.error("[api.feed.meta.csv] Error:", err);
          return new Response("Internal Error", { status: 500 });
        }
      },
    },
  },
} as never)
