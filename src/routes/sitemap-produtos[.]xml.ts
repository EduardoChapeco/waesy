import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://waesy.com.br";

export const Route = createFileRoute("/sitemap-produtos.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = getServerClient();
          const url = new URL(request.url);
          const siteOrigin = url.origin && !url.origin.includes("localhost") ? url.origin : BASE_URL;

          const { data: products, error } = await db
            .from("products")
            .select("slug, updated_at")
            .in("status", ["published", "active"])
            .order("updated_at", { ascending: false })
            .limit(50000);

          if (error) {
            console.error("[sitemap-produtos.xml] error:", error);
            return new Response("Error generating sitemap", { status: 500 });
          }

          let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
          xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

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
              "Cache-Control": "public, max-age=43200",
              "X-Robots-Tag": "noindex",
            },
          });
        } catch (e: unknown) {
          console.error("[sitemap-produtos.xml] Exception:", e);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
