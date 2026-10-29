import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { PUBLIC_ROUTES } from "@/lib/routes";

const BASE_URL = "https://waesy.com.br";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const section = url.searchParams.get("section");
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const PAGE_SIZE = 10000;

        // Static indexable routes
        const staticPaths = [
          ...PUBLIC_ROUTES.filter(
            (r) => !r.dynamic && !r.path.startsWith("/checkout") && r.path !== "/carrinho",
          ).map((r) => r.path),
          "/about",
          "/sobre",
          "/contact",
          "/privacy",
          "/developers",
          "/docs",
          "/llms.txt",
          "/concursos",
          "/comunidades",
          "/places",
          "/receitas",
        ];

        const dynamicPaths: string[] = [];

        try {
          const { getServerClient } = await import("@/lib/supabase");
          const db = getServerClient();

          // 1. Fetch active pages (Omni-Builder)
          const { data: pages } = await db.from("pages").select("slug").eq("status", "published").limit(1000);
          if (pages) {
            pages.forEach((p) => dynamicPaths.push(`/paginas/${p.slug}`));
          }

          // 2. Fetch active products
          const { data: products } = await db
            .from("products")
            .select("slug")
            .in("status", ["published", "active"])
            .limit(5000);
          if (products) {
            products.forEach((p) => dynamicPaths.push(`/produto/${p.slug}`));
          }

          // 3. Fetch active classifieds
          const { data: classifieds } = await db
            .from("classifieds")
            .select("id")
            .eq("status", "active")
            .limit(5000);
          if (classifieds) {
            classifieds.forEach((c) => dynamicPaths.push(`/classificados/${c.id}`));
          }

          // 4. Fetch active tourism experiences, destinations & hotels
          const [tourismRes, destRes, hotelsRes] = await Promise.all([
            db.from("tourism_experiences").select("id").eq("status", "published").limit(1000),
            db.from("travel_destinations").select("slug").limit(500),
            db.from("travel_hotels").select("slug").limit(500),
          ]);
          if (tourismRes.data) {
            tourismRes.data.forEach((t) => dynamicPaths.push(`/turismo/${t.id}`));
          }
          if (destRes.data) {
            destRes.data.forEach((d: any) => dynamicPaths.push(`/turismo/destinos/${d.slug}`));
          }
          if (hotelsRes.data) {
            hotelsRes.data.forEach((h: any) => dynamicPaths.push(`/turismo/hoteis/${h.slug}`));
          }

          // 5. Fetch active jobs
          const { data: jobs } = await db
            .from("jobs")
            .select("id")
            .eq("status", "published")
            .limit(2000);
          if (jobs) {
            jobs.forEach((j) => dynamicPaths.push(`/empregos/${j.id}`));
          }

          // 6. Fetch news articles (com paginação se solicitado ou lote principal)
          const fromIdx = (page - 1) * PAGE_SIZE;
          const toIdx = fromIdx + PAGE_SIZE - 1;
          const { data: news } = await db
            .from("news_articles")
            .select("slug")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .range(fromIdx, toIdx);
          if (news) {
            news.forEach((n) => dynamicPaths.push(`/noticias/${n.slug}`));
          }

          // 7. Fetch active stores/companies for Directory & Storefronts
          const { data: stores } = await db
            .from("stores")
            .select("slug, id")
            .eq("is_active", true)
            .limit(3000);
          if (stores) {
            stores.forEach((s) => {
              dynamicPaths.push(`/diretorio/${s.slug || s.id}`);
              if (s.slug) dynamicPaths.push(`/loja/${s.slug}`);
            });
          }

          // 8. Fetch directory listings, events, recipes, communities, lead forms, biolinks, raffles e Omni-Builder documents
          const [dirRes, eventsRes, recipesRes, omniRes, formsRes, bioRes, commRes, rafflesRes] = await Promise.all([
            db.from("directory_listings").select("id, slug").limit(2000),
            db.from("events").select("id").eq("status", "published").limit(1000),
            db.from("mined_recipes").select("id").limit(1000),
            db.from("experience_documents").select("slug").eq("status", "published").limit(1000),
            db.from("lead_forms").select("slug").eq("status", "active").limit(1000),
            db.from("links_in_bio").select("slug").limit(1000),
            db.from("communities").select("slug").limit(1000),
            db.from("store_raffles").select("id").limit(500),
          ]);
          if (dirRes.data) {
            dirRes.data.forEach((d: any) => {
              dynamicPaths.push(`/diretorio/${d.id}`);
              if (d.slug) dynamicPaths.push(`/places/${d.slug}`);
            });
          }
          if (eventsRes.data) {
            eventsRes.data.forEach((ev: any) => dynamicPaths.push(`/evento/${ev.id}`));
          }
          if (recipesRes.data) {
            recipesRes.data.forEach((rec: any) => dynamicPaths.push(`/receitas/${rec.id}`));
          }
          if (omniRes.data) {
            omniRes.data.forEach((doc: any) => {
              if (doc.slug) dynamicPaths.push(`/paginas/${doc.slug}`);
            });
          }
          if (formsRes.data) {
            formsRes.data.forEach((f: any) => {
              if (f.slug) dynamicPaths.push(`/f/${f.slug}`);
            });
          }
          if (bioRes.data) {
            bioRes.data.forEach((b: any) => {
              if (b.slug) dynamicPaths.push(`/bio/${b.slug}`);
            });
          }
          if (commRes.data) {
            commRes.data.forEach((c: any) => {
              if (c.slug) dynamicPaths.push(`/c/${c.slug}`);
            });
          }
          if (rafflesRes.data) {
            rafflesRes.data.forEach((rf: any) => {
              if (rf.id) dynamicPaths.push(`/concurso/${rf.id}`);
            });
          }
        } catch (e) {
          console.error("Error generating dynamic sitemap paths:", e);
        }

        const allPaths = [...staticPaths, ...dynamicPaths];

        const urls = allPaths
          .map(
            (p) =>
              `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`,
          )
          .join("\n");

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
} as never)
