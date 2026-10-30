import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://waesy.com.br";

export const Route = createFileRoute("/sitemap-index.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const origin = url.origin && !url.origin.includes("localhost") ? url.origin : BASE_URL;
        const today = new Date().toISOString().slice(0, 10);

        const sitemaps = [
          { loc: `${origin}/sitemap.xml`, lastmod: today },
          { loc: `${origin}/sitemap-news.xml`, lastmod: today },
          { loc: `${origin}/sitemap-produtos.xml`, lastmod: today },
          { loc: `${origin}/sitemap-empresas.xml`, lastmod: today },
          { loc: `${origin}/sitemap-classificados.xml`, lastmod: today },
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        for (const sm of sitemaps) {
          xml += `  <sitemap>\n`;
          xml += `    <loc>${sm.loc}</loc>\n`;
          xml += `    <lastmod>${sm.lastmod}</lastmod>\n`;
          xml += `  </sitemap>\n`;
        }

        xml += `</sitemapindex>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=43200", // 12 horas
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
