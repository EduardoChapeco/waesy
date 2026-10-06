import { createFileRoute } from "@tanstack/react-router";

import type {} from "@tanstack/react-start";
const BASE_URL = "https://waesy.pages.dev";

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
    return c;
  });
}

export const Route = createFileRoute("/sitemap-news.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getServerClient } = await import("@/lib/supabase");
          const db = getServerClient();

          // Google Notícias exige artigos dos últimos 2 dias com título e idioma
          const { data: articles } = await db
            .from("news_articles")
            .select("slug, title, published_at, created_at, category")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100);

          const itemsXml = (articles || [])
            .map((art) => {
              const pubDate = art.published_at || art.created_at || new Date().toISOString();
              return `  <url>
    <loc>${BASE_URL}/noticias/${escapeXml(art.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Waesy News</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(art.title)}</news:title>
    </news:news>
  </url>`;
            })
            .join("\n");

          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${itemsXml}
</urlset>`;

          return new Response(xml, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=1800",
            },
          });
        } catch (err) {
          console.error("[sitemap-news.xml] Error generating Google News sitemap:", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
} as never)
