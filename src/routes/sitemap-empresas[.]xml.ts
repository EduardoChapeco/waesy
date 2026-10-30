import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://waesy.com.br";

export const Route = createFileRoute("/sitemap-empresas.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = getServerClient();
          const url = new URL(request.url);
          const siteOrigin = url.origin && !url.origin.includes("localhost") ? url.origin : BASE_URL;

          const [storesRes, dirRes] = await Promise.all([
            db
              .from("stores")
              .select("slug, id, updated_at")
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(10000),
            db
              .from("directory_listings")
              .select("id, slug, updated_at")
              .order("updated_at", { ascending: false })
              .limit(10000),
          ]);

          const seen = new Set<string>();
          let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
          xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

          if (storesRes.data) {
            for (const s of storesRes.data) {
              const lastMod = s.updated_at
                ? new Date(s.updated_at).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10);

              if (s.slug && !seen.has(s.slug)) {
                seen.add(s.slug);
                xml += `  <url>\n`;
                xml += `    <loc>${siteOrigin}/loja/${encodeURIComponent(s.slug)}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += `    <changefreq>daily</changefreq>\n`;
                xml += `    <priority>0.9</priority>\n`;
                xml += `  </url>\n`;
              }

              const dirKey = s.slug || s.id;
              if (dirKey && !seen.has(`dir_${dirKey}`)) {
                seen.add(`dir_${dirKey}`);
                xml += `  <url>\n`;
                xml += `    <loc>${siteOrigin}/diretorio/${encodeURIComponent(dirKey)}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `    <priority>0.7</priority>\n`;
                xml += `  </url>\n`;
              }
            }
          }

          if (dirRes.data) {
            for (const d of dirRes.data) {
              const lastMod = d.updated_at
                ? new Date(d.updated_at).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10);

              if (d.slug && !seen.has(`place_${d.slug}`)) {
                seen.add(`place_${d.slug}`);
                xml += `  <url>\n`;
                xml += `    <loc>${siteOrigin}/places/${encodeURIComponent(d.slug)}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `    <priority>0.7</priority>\n`;
                xml += `  </url>\n`;
              }
            }
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
          console.error("[sitemap-empresas.xml] Exception:", e);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
