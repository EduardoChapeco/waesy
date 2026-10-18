import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";

import type {} from "@tanstack/react-start";

/**
 * Rota Oficial de Callback OAuth 2.0 One-Click para Meta Ads (Facebook/Instagram) e Google Ads
 * - Suporta troca automática por Long-Lived Token (Meta 60 dias) e Offline Refresh Token (Google Ads).
 * - Executa descoberta imediata de Contas de Anúncio (`me/adaccounts` e `customers:listAccessibleCustomers`)
 *   e Pixels (`adspixels`), persistindo os tokens criptografados com AES-256-GCM em `store_ad_accounts`.
 */
export const Route = createFileRoute("/api/auth/ads/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state") || "";
        const oauthError = url.searchParams.get("error");
        const oauthErrorDesc = url.searchParams.get("error_description");

        let storeId: string | null = null;
        let platform: "meta_ads" | "google_ads" = "meta_ads";
        let returnTo = "/workspace/marketing/anuncios";

        if (stateRaw) {
          try {
            const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
            if (decoded.storeId) storeId = String(decoded.storeId);
            if (decoded.platform === "google_ads" || decoded.platform === "meta_ads") {
              platform = decoded.platform;
            }
            if (typeof decoded.returnTo === "string" && decoded.returnTo.startsWith("/")) {
              returnTo = decoded.returnTo;
            }
          } catch {
            if (stateRaw.includes(":")) {
              const [sId, plat] = stateRaw.split(":");
              storeId = sId || null;
              if (plat === "google_ads" || plat === "meta_ads") platform = plat;
            }
          }
        }

        const buildRedirect = (params: Record<string, string>) => {
          const target = new URL(returnTo, url.origin);
          for (const [k, v] of Object.entries(params)) {
            target.searchParams.set(k, v);
          }
          return Response.redirect(target.toString(), 302);
        };

        if (oauthError) {
          return buildRedirect({
            ads_oauth_error: oauthErrorDesc || oauthError,
            platform,
          });
        }

        if (!code || !storeId) {
          return buildRedirect({
            ads_oauth_error: "Código de autorização OAuth ou identificação da loja ausente.",
            platform,
          });
        }

        try {
          const supabase = getServerClient();
          const redirectUri = new URL("/api/auth/ads/callback", url.origin).toString();

          // Carrega configurações globais da plataforma caso não estejam nas variáveis de ambiente
          const { data: masterStore } = await supabase
            .from("stores")
            .select("settings")
            .limit(1)
            .maybeSingle();

          const globalAdNet = ((masterStore?.settings as any)?.global_ad_network as Record<string, any>) || {};

          if (platform === "meta_ads") {
            const metaClientId =
              process.env.META_APP_ID ||
              process.env.VITE_META_APP_ID ||
              globalAdNet.meta_app_id ||
              "";
            const metaClientSecret =
              process.env.META_APP_SECRET ||
              globalAdNet.meta_app_secret
                ? (globalAdNet.meta_app_secret?.includes(":")
                    ? decryptSecret(globalAdNet.meta_app_secret)
                    : globalAdNet.meta_app_secret || process.env.META_APP_SECRET || "")
                : "";

            if (!metaClientId || !metaClientSecret) {
              return buildRedirect({
                ads_oauth_error: "App ID / App Secret da Meta não configurados no servidor.",
                platform: "meta_ads",
              });
            }

            // 1. Troca code por short-lived access_token
            const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
            tokenUrl.searchParams.set("client_id", metaClientId);
            tokenUrl.searchParams.set("redirect_uri", redirectUri);
            tokenUrl.searchParams.set("client_secret", metaClientSecret);
            tokenUrl.searchParams.set("code", code);

            const tokenRes = await fetch(tokenUrl.toString());
            const tokenJson = await tokenRes.json().catch(() => ({}));
            if (!tokenRes.ok || !tokenJson?.access_token) {
              return buildRedirect({
                ads_oauth_error: tokenJson?.error?.message || "Falha ao trocar código OAuth na Meta.",
                platform: "meta_ads",
              });
            }

            let accessToken = String(tokenJson.access_token);
            let expiresInSec = Number(tokenJson.expires_in) || 5184000;

            // 2. Troca por Long-Lived Token (60 dias)
            try {
              const longUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
              longUrl.searchParams.set("grant_type", "fb_exchange_token");
              longUrl.searchParams.set("client_id", metaClientId);
              longUrl.searchParams.set("client_secret", metaClientSecret);
              longUrl.searchParams.set("fb_exchange_token", accessToken);
              const longRes = await fetch(longUrl.toString());
              const longJson = await longRes.json().catch(() => ({}));
              if (longRes.ok && longJson?.access_token) {
                accessToken = String(longJson.access_token);
                expiresInSec = Number(longJson.expires_in) || 5184000;
              }
            } catch {
              // Mantém token inicial se exchange falhar
            }

            // 3. Descoberta automática de Contas de Anúncio (me/adaccounts), Pixels e Contas Instagram
            const discoveredAccounts: Array<{ id: string; accountId: string; name: string; currency: string; status: number }> = [];
            let primaryAccountId = "";
            let primaryAccountName = "Meta Business Ads";
            let primaryPixelId: string | null = null;
            const discoveredPixels: Array<{ id: string; name: string }> = [];
            const discoveredInstagramAccounts: Array<{ pageId: string; pageName: string; igId: string; igUsername?: string }> = [];

            try {
              const adAccRes = await fetch(
                `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,account_id,name,currency,account_status&limit=25&access_token=${encodeURIComponent(accessToken)}`
              );
              const adAccJson = await adAccRes.json().catch(() => ({}));
              const list = Array.isArray(adAccJson?.data) ? adAccJson.data : [];
              for (const item of list) {
                const cleanId = String(item.account_id || item.id || "").replace(/^act_/, "");
                if (!cleanId) continue;
                discoveredAccounts.push({
                  id: `act_${cleanId}`,
                  accountId: cleanId,
                  name: String(item.name || `Conta ${cleanId}`),
                  currency: String(item.currency || "BRL"),
                  status: Number(item.account_status || 1),
                });
              }

              if (discoveredAccounts.length > 0) {
                const activeAcc = discoveredAccounts.find((a) => a.status === 1) || discoveredAccounts[0];
                primaryAccountId = `act_${activeAcc.accountId}`;
                primaryAccountName = activeAcc.name;

                // Busca Pixels da conta principal
                const pixRes = await fetch(
                  `https://graph.facebook.com/v20.0/act_${activeAcc.accountId}/adspixels?fields=id,name&limit=10&access_token=${encodeURIComponent(accessToken)}`
                );
                const pixJson = await pixRes.json().catch(() => ({}));
                if (Array.isArray(pixJson?.data)) {
                  for (const px of pixJson.data) {
                    if (px?.id) {
                      discoveredPixels.push({ id: String(px.id), name: String(px.name || `Pixel ${px.id}`) });
                    }
                  }
                  if (discoveredPixels.length > 0) {
                    primaryPixelId = discoveredPixels[0].id;
                  }
                }
              }

              // Busca Páginas e Contas do Instagram Business vinculadas
              const pagesRes = await fetch(
                `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=25&access_token=${encodeURIComponent(accessToken)}`
              );
              const pagesJson = await pagesRes.json().catch(() => ({}));
              if (Array.isArray(pagesJson?.data)) {
                for (const pg of pagesJson.data) {
                  if (pg?.instagram_business_account?.id) {
                    discoveredInstagramAccounts.push({
                      pageId: String(pg.id),
                      pageName: String(pg.name || "Página"),
                      igId: String(pg.instagram_business_account.id),
                      igUsername: pg.instagram_business_account.username,
                    });
                  }
                }
              }
            } catch (discErr) {
              console.warn("[ads-oauth:meta] Aviso na descoberta automática de contas:", discErr);
            }

            if (!primaryAccountId) {
              primaryAccountId = "act_pending_selection";
            }

            const nowIso = new Date().toISOString();
            const expiresAtIso = new Date(Date.now() + expiresInSec * 1000).toISOString();
            const encryptedToken = encryptSecret(accessToken);

            const { data: existing } = await supabase
              .from("store_ad_accounts")
              .select("id")
              .eq("store_id", storeId)
              .eq("platform", "meta_ads")
              .maybeSingle();

            const metadataPayload = {
              oauth_connected_via: "one_click_oauth",
              discovered_accounts: discoveredAccounts,
              discovered_pixels: discoveredPixels,
              discovered_instagram_accounts: discoveredInstagramAccounts,
              scopes_granted: [
                "ads_management",
                "ads_read",
                "business_management",
                "pages_read_engagement",
                "instagram_basic",
                "instagram_content_publish",
              ],
              connected_at: nowIso,
            };

            if (existing?.id) {
              await supabase
                .from("store_ad_accounts")
                .update({
                  account_id: primaryAccountId,
                  account_name: primaryAccountName,
                  oauth_access_token: encryptedToken,
                  token_expires_at: expiresAtIso,
                  pixel_id: primaryPixelId,
                  status: "connected",
                  last_api_sync_at: nowIso,
                  metadata: metadataPayload,
                  updated_at: nowIso,
                })
                .eq("id", existing.id);
            } else {
              await supabase.from("store_ad_accounts").insert({
                store_id: storeId,
                platform: "meta_ads",
                account_id: primaryAccountId,
                account_name: primaryAccountName,
                oauth_access_token: encryptedToken,
                token_expires_at: expiresAtIso,
                pixel_id: primaryPixelId,
                status: "connected",
                last_api_sync_at: nowIso,
                metadata: metadataPayload,
              });
            }

            return buildRedirect({
              ads_oauth: "connected",
              platform: "meta_ads",
              accounts_found: String(discoveredAccounts.length),
            });
          }

          // ── FLUXO GOOGLE ADS OAUTH 2.0 + MCP listAccessibleCustomers ──
          const googleClientId =
            process.env.GOOGLE_ADS_CLIENT_ID ||
            process.env.GOOGLE_CLIENT_ID ||
            globalAdNet.google_client_id ||
            "";
          const googleClientSecret =
            process.env.GOOGLE_ADS_CLIENT_SECRET ||
            process.env.GOOGLE_CLIENT_SECRET ||
            (globalAdNet.google_client_secret?.includes(":")
              ? decryptSecret(globalAdNet.google_client_secret)
              : globalAdNet.google_client_secret || "");

          if (!googleClientId || !googleClientSecret) {
            return buildRedirect({
              ads_oauth_error: "Client ID / Client Secret do Google Ads não configurados no servidor.",
              platform: "google_ads",
            });
          }

          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              client_id: googleClientId,
              client_secret: googleClientSecret,
              redirect_uri: redirectUri,
              grant_type: "authorization_code",
            }).toString(),
          });

          const tokenJson = await tokenRes.json().catch(() => ({}));
          if (!tokenRes.ok || !tokenJson?.access_token) {
            return buildRedirect({
              ads_oauth_error: tokenJson?.error_description || tokenJson?.error || "Falha ao trocar código OAuth no Google Ads.",
              platform: "google_ads",
            });
          }

          const accessToken = String(tokenJson.access_token);
          const refreshToken = tokenJson.refresh_token ? String(tokenJson.refresh_token) : null;
          const expiresInSec = Number(tokenJson.expires_in) || 3600;

          // Descoberta oficial Google Ads MCP: customers:listAccessibleCustomers
          const devToken =
            process.env.GOOGLE_ADS_DEVELOPER_TOKEN ||
            globalAdNet.google_developer_token ||
            "";
          const discoveredCustomers: Array<{ customerId: string; resourceName: string; descriptiveName: string }> = [];

          if (devToken) {
            try {
              const listRes = await fetch(
                "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "developer-token": devToken,
                  },
                }
              );
              const listJson = await listRes.json().catch(() => ({}));
              const resourceNames: string[] = Array.isArray(listJson?.resourceNames)
                ? listJson.resourceNames
                : [];

              for (const rName of resourceNames) {
                const cid = String(rName).replace(/^customers\//, "").replace(/\D/g, "");
                if (!cid) continue;
                discoveredCustomers.push({
                  customerId: cid,
                  resourceName: rName,
                  descriptiveName: `Google Ads (${cid.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")})`,
                });
              }
            } catch (gErr) {
              console.warn("[ads-oauth:google] Aviso ao listar accessible customers:", gErr);
            }
          }

          const primaryCustomerId =
            discoveredCustomers[0]?.customerId || "pending_customer_selection";
          const primaryCustomerName =
            discoveredCustomers[0]?.descriptiveName || "Google Ads Account";

          const nowIso = new Date().toISOString();
          const expiresAtIso = new Date(Date.now() + expiresInSec * 1000).toISOString();
          const encryptedAccess = encryptSecret(accessToken);
          const encryptedRefresh = refreshToken ? encryptSecret(refreshToken) : null;

          const { data: existing } = await supabase
            .from("store_ad_accounts")
            .select("id, oauth_refresh_token")
            .eq("store_id", storeId)
            .eq("platform", "google_ads")
            .maybeSingle();

          const metadataPayload = {
            oauth_connected_via: "one_click_oauth",
            discovered_customers: discoveredCustomers,
            scopes_granted: ["https://www.googleapis.com/auth/adwords"],
            connected_at: nowIso,
          };

          if (existing?.id) {
            await supabase
              .from("store_ad_accounts")
              .update({
                account_id: primaryCustomerId,
                account_name: primaryCustomerName,
                oauth_access_token: encryptedAccess,
                oauth_refresh_token: encryptedRefresh || existing.oauth_refresh_token || null,
                token_expires_at: expiresAtIso,
                status: "connected",
                last_api_sync_at: nowIso,
                metadata: metadataPayload,
                updated_at: nowIso,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("store_ad_accounts").insert({
              store_id: storeId,
              platform: "google_ads",
              account_id: primaryCustomerId,
              account_name: primaryCustomerName,
              oauth_access_token: encryptedAccess,
              oauth_refresh_token: encryptedRefresh,
              token_expires_at: expiresAtIso,
              status: "connected",
              last_api_sync_at: nowIso,
              metadata: metadataPayload,
            });
          }

          return buildRedirect({
            ads_oauth: "connected",
            platform: "google_ads",
            accounts_found: String(discoveredCustomers.length),
          });
        } catch (err: any) {
          console.error("[api.auth.ads.callback] Erro fatal OAuth Ads:", err);
          return buildRedirect({
            ads_oauth_error: err?.message || "Erro interno ao finalizar OAuth de anúncios.",
            platform,
          });
        }
      },
    },
  },
} as never);
