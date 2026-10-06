import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/sitemap-products.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = getServerClient();
          const url = new URL(request.url);
          const siteOrigin = url.origin;

          // Busca todos os produtos publicados de todas as lojas para indexação global
          const { data: products, error } = await db
            .from("products")
            .select(
              "slug, updated_at, store_id, stores!inner(slug)"
            )
            .in("status", ["published", "active"])
            .order("updated_at", { ascending: false })
            .limit(50000); // Limite padrão Google Sitemap

          if (error) {
            console.error("[sitemap-products.xml] error:", error);
            return new Response("Error generating sitemap", { status: 500 });
          }

          let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
          xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
          xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

          for (const product of products || []) {
            const lastMod = product.updated_at
              ? new Date(product.updated_at).toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10);

            xml += `  <url>\n`;
            xml += `    <loc>${siteOrigin}/produto/${encodeURIComponent(product.slug)}</loc>\n`;
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
            xml += `    <changefreq>daily</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;
          }

          xml += `</urlset>`;

          return new Response(xml, {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=43200", // 12h de cache
              "X-Robots-Tag": "noindex", // Sitemaps não devem ser indexados, apenas lidos
            },
          });
        } catch (e: unknown) {
          console.error("[sitemap-products.xml] Exception:", e);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
} as never)
