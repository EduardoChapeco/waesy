import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

export const Route = createFileRoute("/api/pwa/manifest.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const storeId = url.searchParams.get("storeId");
          const slug = url.searchParams.get("slug");
          const db = getServerClient();

          // 1. Manifest Canônico Global / Super App Waesy
          const buildGlobalManifest = async () => {
            const { data: brandRow } = await db
              .from("platform_brand_settings")
              .select("*")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();

            const platformName = brandRow?.platform_name || "Waesy";
            const iconUrl = brandRow?.favicon_url || brandRow?.logo_url;

            return {
              $schema: "https://json.schemastore.org/web-manifest-combined.json",
              id: "/",
              name: `${platformName} — Comércio Local, Serviços, Turismo e Comunidade`,
              short_name: platformName,
              description:
                brandRow?.seo_description ||
                "Explore mercado, gastronomia, turismo, eventos, classificados e serviços locais com rapidez e praticidade.",
              start_url: "/",
              scope: "/",
              display: "standalone",
              orientation: "portrait-primary",
              background_color: "#ffffff",
              theme_color: "#09090b",
              lang: "pt-BR",
              dir: "ltr",
              categories: ["shopping", "business", "lifestyle", "travel"],
              theme_color_adaptive: [
                {
                  color: "#ffffff",
                  media: "(prefers-color-scheme: light)",
                },
                {
                  color: "#09090b",
                  media: "(prefers-color-scheme: dark)",
                },
              ],
              icons: [
                {
                  src: "/favicon.ico",
                  sizes: "64x64 32x32 24x24 16x16",
                  type: "image/x-icon",
                },
                ...(iconUrl
                  ? [
                      {
                        src: iconUrl,
                        sizes: "192x192 512x512",
                        type: "image/png",
                        purpose: "any",
                      },
                    ]
                  : []),
                {
                  src: "/icons/icon-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/icons/icon-maskable-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "maskable",
                },
                {
                  src: "/icons/icon-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "/icons/icon-maskable-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
                {
                  src: "/favicon.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                },
              ],
              shortcuts: [
                {
                  name: "Mercado & Lojas",
                  short_name: "Mercado",
                  description: "Explorar vitrines locais e produtos",
                  url: "/mercado",
                  icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
                },
                {
                  name: "Buscar no Waesy",
                  short_name: "Buscar",
                  description: "Pesquisar produtos, serviços e lugares",
                  url: "/buscar",
                  icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
                },
                {
                  name: "Turismo & Roteiros",
                  short_name: "Turismo",
                  description: "Descobrir destinos e experiências",
                  url: "/turismo",
                  icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
                },
                {
                  name: "Minha Conta",
                  short_name: "Conta",
                  description: "Acessar pedidos, perfil e agendamentos",
                  url: "/conta",
                  icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
                },
              ],
            };
          };

          if (!storeId && !slug) {
            const globalManifest = await buildGlobalManifest();
            return new Response(JSON.stringify(globalManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "public, max-age=600, s-maxage=3600",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          // 2. Manifest Específico de Loja / Tenant White-Label
          let query = db.from("stores").select("id, name, slug, description, settings");

          if (storeId) {
            query = query.eq("id", storeId);
          } else if (slug) {
            query = query.eq("slug", slug);
          }

          const { data: store, error } = await query.single();

          if (error || !store) {
            const globalManifest = await buildGlobalManifest();
            return new Response(JSON.stringify(globalManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "public, max-age=300",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          const settings = (store.settings || {}) as Record<string, any>;
          const logoUrl =
            settings.logoUrl ||
            settings.logo_url ||
            settings.cover_url ||
            settings.coverUrl ||
            "/icons/icon-512x512.png";

          const primaryColor = settings.primaryColor || settings.primary_color || "#09090b";
          const shortName = store.name.length > 12 ? store.name.slice(0, 12).trim() : store.name;
          const storeStartUrl = `/perfil-da-loja?storeId=${store.id}&source=pwa`;

          const storeManifest = {
            $schema: "https://json.schemastore.org/web-manifest-combined.json",
            id: storeStartUrl,
            name: `${store.name} — Loja Oficial`,
            short_name: shortName,
            description:
              store.description ||
              `Aplicativo oficial da ${store.name}. Faça pedidos, veja o catálogo e fale conosco direto pelo celular.`,
            start_url: storeStartUrl,
            scope: `/`,
            display: "standalone",
            background_color: "#ffffff",
            theme_color: primaryColor,
            orientation: "portrait-primary",
            lang: "pt-BR",
            categories: ["shopping", "business"],
            icons: [
              {
                src: logoUrl,
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: logoUrl,
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
              },
              {
                src: logoUrl,
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: logoUrl,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
              {
                src: "/icons/icon-maskable-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
              },
            ],
            shortcuts: [
              {
                name: "Catálogo & Cardápio",
                short_name: "Catálogo",
                description: "Ver todos os produtos e promoções",
                url: `${storeStartUrl}&tab=catalogo`,
              },
              {
                name: "Fale Conosco",
                short_name: "WhatsApp",
                description: "Atendimento direto",
                url: `${storeStartUrl}&tab=contato`,
              },
            ],
          };

          return new Response(JSON.stringify(storeManifest, null, 2), {
            headers: {
              "Content-Type": "application/manifest+json; charset=utf-8",
              "Cache-Control": "public, max-age=600, s-maxage=3600",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err: any) {
          console.error("[api.pwa.manifest] Error generating manifest:", err);
          return new Response(JSON.stringify({ error: "Erro ao gerar manifesto PWA" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
