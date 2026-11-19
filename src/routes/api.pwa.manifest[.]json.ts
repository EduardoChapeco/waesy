import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { TOKEN_HEX } from "@/lib/design-tokens";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/pwa/manifest.json")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const storeId = url.searchParams.get("storeId");
          const slug = url.searchParams.get("slug");
          const rawMode = (url.searchParams.get("mode") || "").trim().toLowerCase();
          const reqHostHeader = (
            request.headers.get("x-forwarded-host") ||
            request.headers.get("host") ||
            url.host ||
            ""
          ).toLowerCase();
          const isWorkspaceSubdomain =
            reqHostHeader.startsWith("painel.") ||
            reqHostHeader.startsWith("painel-") ||
            reqHostHeader.startsWith("erp.") ||
            reqHostHeader.startsWith("pro.") ||
            reqHostHeader.startsWith("studio.");
          const isWorkspaceMode = rawMode === "workspace" || isWorkspaceSubdomain;
          const workspaceScope = isWorkspaceSubdomain ? "/" : "/workspace";
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
              display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
              orientation: "portrait-primary",
              background_color: TOKEN_HEX.white,
              theme_color: TOKEN_HEX.neutral950,
              lang: "pt-BR",
              dir: "ltr",
              categories: ["shopping", "business", "lifestyle", "travel"],
              launch_handler: {
                client_mode: "focus-existing",
              },
              handle_links: "preferred",
              share_target: {
                action: "/conta/classificados/novo",
                method: "GET",
                params: {
                  title: "title",
                  text: "text",
                  url: "url",
                },
              },
              protocol_handlers: [
                {
                  protocol: "web+waesy",
                  url: "/?intent=%s",
                },
              ],
              theme_color_adaptive: [
                {
                  color: TOKEN_HEX.white,
                  media: "(prefers-color-scheme: light)",
                },
                {
                  color: TOKEN_HEX.neutral950,
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

          if (!storeId && !slug && !isWorkspaceMode) {
            const globalManifest = await buildGlobalManifest();
            return new Response(JSON.stringify(globalManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (isWorkspaceMode && !storeId && !slug) {
            const workspaceGenericManifest = {
              $schema: "https://json.schemastore.org/web-manifest-combined.json",
              id: workspaceScope,
              name: "Workspace Pro — Sistema Operacional Empresarial",
              short_name: "Workspace",
              description: "Ambiente operacional isolado para gestão de vendas, atendimento, equipe, caixa e logística.",
              start_url: "/workspace?pwa=workspace",
              scope: workspaceScope,
              display: "standalone",
              display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
              orientation: "any",
              background_color: TOKEN_HEX.neutral950,
              theme_color: TOKEN_HEX.neutral950,
              lang: "pt-BR",
              dir: "ltr",
              categories: ["business", "productivity", "finance"],
              launch_handler: { client_mode: "focus-existing" },
              handle_links: "preferred",
              icons: [
                {
                  src: "/icons/icon-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
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
              ],
              shortcuts: [
                {
                  name: "Painel Operacional",
                  short_name: "Painel",
                  description: "Visão geral da operação da empresa",
                  url: "/workspace?pwa=workspace",
                },
                {
                  name: "Atendimento & Chat",
                  short_name: "Chat",
                  description: "Central de atendimento omnichannel",
                  url: "/workspace/atendimento/chat",
                },
                {
                  name: "Pedidos & Operação",
                  short_name: "Pedidos",
                  description: "Gestão de pedidos e vendas",
                  url: "/workspace/pedidos",
                },
                {
                  name: "Equipe & Acessos",
                  short_name: "Equipe",
                  description: "Colaboradores e permissões",
                  url: "/workspace/configuracoes/equipe",
                },
              ],
            };
            return new Response(JSON.stringify(workspaceGenericManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          // 2. Manifest Específico de Loja / App Padronizado (SSOT: store_pwa_configs + stores)
          let query = db
            .from("stores")
            .select("id, name, slug, description, logo_url, custom_domain, settings");

          if (storeId) {
            query = query.eq("id", storeId);
          } else if (slug) {
            query = query.eq("slug", slug);
          }

          const { data: store, error } = await query.maybeSingle();

          if (error || !store) {
            const globalManifest = await buildGlobalManifest();
            return new Response(JSON.stringify(globalManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          const { data: pwaConfig } = await db
            .from("store_pwa_configs")
            .select("*")
            .eq("store_id", store.id)
            .maybeSingle();

          const settings = (store.settings || {}) as Record<string, any>;
          const versionSuffix = pwaConfig?.cache_version ? `?v=${pwaConfig.cache_version}` : "";
          const baseLogoUrl =
            pwaConfig?.logo_square_url ||
            store.logo_url ||
            settings.avatar_url ||
            settings.logoUrl ||
            settings.logo_url ||
            settings.cover_url ||
            settings.coverUrl ||
            "/icons/icon-512x512.png";

          const icon192Url = pwaConfig?.icon_192_url || baseLogoUrl;
          const icon512Url = pwaConfig?.icon_512_url || baseLogoUrl;
          const maskable512Url = pwaConfig?.maskable_icon_512_url || icon512Url;

          const appName = pwaConfig?.app_name || `${store.name} — App Oficial`;
          const rawShort = pwaConfig?.short_name || store.name;
          const shortName = rawShort.length > 12 ? rawShort.slice(0, 12).trim() : rawShort;
          const primaryColor =
            pwaConfig?.theme_color || settings.primaryColor || settings.primary_color || TOKEN_HEX.neutral950;
          const backgroundColor = pwaConfig?.background_color || TOKEN_HEX.white;
          const appPath = `/app/${store.slug || store.id}`;
          const configuredCustomDomain = String(
            pwaConfig?.custom_domain || store.custom_domain || "",
          )
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/\/.*$/, "");
          const reqHostRaw = (
            request.headers.get("x-waesy-custom-domain-host") ||
            request.headers.get("x-forwarded-host") ||
            request.headers.get("host") ||
            url.host ||
            ""
          )
            .toLowerCase()
            .replace(/:\d+$/, "");
          const isCustomDomainHost = Boolean(
            request.headers.get("x-waesy-custom-domain-store-id") === String(store.id) ||
              (configuredCustomDomain &&
                (reqHostRaw === configuredCustomDomain ||
                  reqHostRaw === `www.${configuredCustomDomain}` ||
                  `www.${reqHostRaw}` === configuredCustomDomain)),
          );
          const appScope = isCustomDomainHost ? "/" : appPath;
          const shortcutBase = isCustomDomainHost ? "" : appPath;
          const configuredStart = isCustomDomainHost
            ? "/?source=pwa"
            : pwaConfig?.start_url && pwaConfig.start_url !== "/"
              ? pwaConfig.start_url
              : `${appPath}?source=pwa`;

          const appendVersion = (imgUrl: string) =>
            imgUrl.startsWith("/") && !imgUrl.includes("?")
              ? imgUrl
              : !versionSuffix || imgUrl.includes("?v=")
                ? imgUrl
                : `${imgUrl}${imgUrl.includes("?") ? "&" : "?"}v=${pwaConfig?.cache_version || 1}`;

          if (isWorkspaceMode) {
            const wsShortBase = (store.name || "Workspace").trim();
            const wsShort = wsShortBase.length > 12 ? wsShortBase.slice(0, 12).trim() : wsShortBase;
            const workspaceStoreManifest = {
              $schema: "https://json.schemastore.org/web-manifest-combined.json",
              id: `/workspace?storeId=${store.id}`,
              name: `${store.name} — Workspace Operacional`,
              short_name: wsShort,
              description: `Sistema operacional isolado da empresa ${store.name}. Gestão de equipe, atendimento, vendas e financeiro.`,
              start_url: `/workspace?pwa=workspace&storeId=${encodeURIComponent(store.id)}`,
              scope: workspaceScope,
              display: "standalone",
              display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
              background_color: backgroundColor,
              theme_color: primaryColor,
              orientation: "any",
              lang: "pt-BR",
              categories: ["business", "productivity", "finance"],
              launch_handler: { client_mode: "focus-existing" },
              handle_links: "preferred",
              icons: [
                {
                  src: appendVersion(icon192Url),
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: appendVersion(icon512Url),
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: appendVersion(maskable512Url),
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
              shortcuts: [
                {
                  name: "Painel da Empresa",
                  short_name: "Painel",
                  description: `Operação central de ${store.name}`,
                  url: `/workspace?pwa=workspace&storeId=${encodeURIComponent(store.id)}`,
                },
                {
                  name: "Atendimento & WhatsApp",
                  short_name: "Chat",
                  description: "Atendimento da equipe",
                  url: "/workspace/atendimento/chat",
                },
                {
                  name: "Frente de Caixa & Pedidos",
                  short_name: "Caixa",
                  description: "Vendas e caixa operacional",
                  url: "/workspace/financeiro/caixa",
                },
                {
                  name: "Equipe & Vínculos",
                  short_name: "Equipe",
                  description: "Colaboradores e permissões",
                  url: "/workspace/configuracoes/equipe",
                },
              ],
            };
            return new Response(JSON.stringify(workspaceStoreManifest, null, 2), {
              headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          const storeManifest = {
            $schema: "https://json.schemastore.org/web-manifest-combined.json",
            id: isCustomDomainHost ? "/" : appPath,
            name: appName,
            short_name: shortName,
            description:
              pwaConfig?.description ||
              store.description ||
              `Aplicativo oficial da ${store.name}. Explore o catálogo, faça pedidos e acompanhe seus serviços.`,
            start_url: configuredStart,
            scope: appScope,
            display: pwaConfig?.display_mode || "standalone",
            display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
            background_color: backgroundColor,
            theme_color: primaryColor,
            orientation: pwaConfig?.orientation === "any" ? "any" : pwaConfig?.orientation === "landscape" ? "landscape-primary" : "portrait-primary",
            lang: "pt-BR",
            categories: ["shopping", "business"],
            launch_handler: {
              client_mode: "focus-existing",
            },
            handle_links: "preferred",
            icons: [
              {
                src: appendVersion(icon192Url),
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
              },
              {
                src: appendVersion(icon512Url),
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
              },
              {
                src: appendVersion(maskable512Url),
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
              },
            ],
            shortcuts: [
              {
                name: "Catálogo & Ofertas",
                short_name: "Catálogo",
                description: "Explorar catálogo completo",
                url: `${shortcutBase || "/"}?tab=catalogo`,
              },
              {
                name: "Minha Área",
                short_name: "Pedidos",
                description: "Acompanhar pedidos, viagens e contratos",
                url: `${shortcutBase || "/"}?tab=conta`,
              },
              {
                name: "Informações & Contato",
                short_name: "Empresa",
                description: "Horários, endereço e atendimento",
                url: `${shortcutBase || "/"}?tab=empresa`,
              },
            ],
          };

          return new Response(JSON.stringify(storeManifest, null, 2), {
            headers: {
              "Content-Type": "application/manifest+json; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
              "Pragma": "no-cache",
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
} as never)
