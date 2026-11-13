import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import {
  decodeMarketplaceOAuthState,
  exchangeMarketplaceOAuthCode,
} from "@/lib/marketplace-api-client";

import type {} from "@tanstack/react-start";

function safeDecrypt(val: unknown): string {
  if (typeof val !== "string" || !val.trim()) return "";
  try {
    return decryptSecret(val.trim());
  } catch {
    return val.trim();
  }
}

export const Route = createFileRoute("/api/auth/marketplace/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        let returnPath = "/workspace/integracoes/marketplaces";

        try {
          const code = url.searchParams.get("code");
          const stateRaw = url.searchParams.get("state") || "";
          const error = url.searchParams.get("error");
          const errorDescription = url.searchParams.get("error_description");
          const shopIdParam = url.searchParams.get("shop_id") || undefined;

          const decodedState = decodeMarketplaceOAuthState(stateRaw);
          const storeId = decodedState?.storeId || url.searchParams.get("store_id") || null;
          const platform = (
            decodedState?.platform ||
            url.searchParams.get("platform") ||
            "mercadolivre"
          ).toLowerCase();

          if (decodedState?.returnPath && decodedState.returnPath.startsWith("/")) {
            returnPath = decodedState.returnPath;
          }

          if (error) {
            console.warn(`[oauth:callback] Provedor ${platform} retornou erro:`, error, errorDescription);
            const redirectUrl = new URL(returnPath, url.origin);
            redirectUrl.searchParams.set("error", errorDescription || error);
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          if (!code || !storeId) {
            const redirectUrl = new URL(returnPath, url.origin);
            redirectUrl.searchParams.set("error", "Código de autorização ou identificador de loja ausente.");
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const supabase = getServerClient();

          // 1. Busca conector da loja e chaves Master da plataforma (waesy-matriz)
          const [{ data: existingConn }, { data: masterStore }] = await Promise.all([
            supabase
              .from("marketplace_connectors")
              .select("id, external_account_id, account_nickname, refresh_token, settings")
              .eq("store_id", storeId)
              .eq("platform", platform)
              .maybeSingle(),
            supabase
              .from("stores")
              .select("settings")
              .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
              .limit(1)
              .maybeSingle(),
          ]);

          const storeCreds = ((existingConn?.settings as any)?.credentials || {}) as Record<string, any>;
          const masterIntegrations = ((masterStore?.settings as any)?.integrations || {}) as Record<string, any>;

          const clientIdMap: Record<string, string> = {
            mercadolivre:
              safeDecrypt(storeCreds.client_id) ||
              safeDecrypt(masterIntegrations.mercadolivre_app_id) ||
              process.env.MERCADOLIVRE_APP_ID ||
              process.env.MERCADOLIVRE_CLIENT_ID ||
              process.env.VITE_MERCADOLIVRE_CLIENT_ID ||
              "",
            ifood:
              safeDecrypt(storeCreds.client_id) ||
              safeDecrypt(masterIntegrations.ifood_client_id) ||
              process.env.IFOOD_CLIENT_ID ||
              process.env.VITE_IFOOD_CLIENT_ID ||
              "",
            shopee:
              safeDecrypt(storeCreds.partner_id) ||
              safeDecrypt(storeCreds.client_id) ||
              safeDecrypt(masterIntegrations.shopee_partner_id) ||
              process.env.SHOPEE_PARTNER_ID ||
              "",
            bling:
              safeDecrypt(storeCreds.client_id) ||
              process.env.BLING_CLIENT_ID ||
              "",
            magalu:
              safeDecrypt(storeCreds.client_id) ||
              process.env.MAGALU_CLIENT_ID ||
              "",
          };

          const clientSecretMap: Record<string, string> = {
            mercadolivre:
              safeDecrypt(storeCreds.client_secret) ||
              safeDecrypt(masterIntegrations.mercadolivre_client_secret) ||
              process.env.MERCADOLIVRE_CLIENT_SECRET ||
              "",
            ifood:
              safeDecrypt(storeCreds.client_secret) ||
              safeDecrypt(masterIntegrations.ifood_client_secret) ||
              process.env.IFOOD_CLIENT_SECRET ||
              "",
            shopee:
              safeDecrypt(storeCreds.partner_key) ||
              safeDecrypt(storeCreds.client_secret) ||
              safeDecrypt(masterIntegrations.shopee_partner_key) ||
              process.env.SHOPEE_PARTNER_KEY ||
              "",
            bling:
              safeDecrypt(storeCreds.client_secret) ||
              process.env.BLING_CLIENT_SECRET ||
              "",
            magalu:
              safeDecrypt(storeCreds.client_secret) ||
              process.env.MAGALU_CLIENT_SECRET ||
              "",
          };

          const resolvedClientId = (clientIdMap[platform] || "").trim();
          const resolvedClientSecret = (clientSecretMap[platform] || "").trim();

          if (!resolvedClientId || !resolvedClientSecret) {
            console.warn(`[oauth:callback] Credenciais App OAuth para ${platform} ausentes no conector, Admin Master e env.`);
            const redirectUrl = new URL(returnPath, url.origin);
            redirectUrl.searchParams.set(
              "error",
              `Chaves do aplicativo ${platform.toUpperCase()} não configuradas. Configure no Admin Master ou no formulário do canal.`
            );
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const redirectUri = new URL("/api/auth/marketplace/callback", url.origin).toString();

          let tokenResult;
          try {
            tokenResult = await exchangeMarketplaceOAuthCode({
              platform,
              code,
              redirectUri,
              clientId: resolvedClientId,
              clientSecret: resolvedClientSecret,
              shopId: shopIdParam || existingConn?.external_account_id || undefined,
            });
          } catch (exchangeErr: any) {
            console.error(`[oauth:callback] Erro ao trocar código OAuth (${platform}):`, exchangeErr);
            const redirectUrl = new URL(returnPath, url.origin);
            redirectUrl.searchParams.set(
              "error",
              exchangeErr?.message || `Provedor ${platform} rejeitou a autorização OAuth.`
            );
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const encAccessToken = encryptSecret(tokenResult.accessToken);
          const encRefreshToken = tokenResult.refreshToken
            ? encryptSecret(tokenResult.refreshToken)
            : existingConn?.refresh_token || null;

          const updatedCredentials: Record<string, string> = {
            ...storeCreds,
            access_token: encAccessToken,
          };
          if (encRefreshToken) updatedCredentials.refresh_token = encRefreshToken;
          if (platform === "shopee") {
            updatedCredentials.partner_id = resolvedClientId;
            updatedCredentials.partner_key = encryptSecret(resolvedClientSecret);
            if (tokenResult.externalAccountId) updatedCredentials.shop_id = tokenResult.externalAccountId;
          } else {
            updatedCredentials.client_id = resolvedClientId;
            updatedCredentials.client_secret = encryptSecret(resolvedClientSecret);
          }

          const platformLabelMap: Record<string, string> = {
            mercadolivre: "Mercado Livre Brasil",
            ifood: "iFood Delivery",
            shopee: "Shopee Brasil",
            bling: "Bling ERP v3",
            magalu: "Magalu Marketplace",
          };

          const mergedSettings = {
            ...((existingConn?.settings as Record<string, any>) || {}),
            encryption_algorithm: "AES-256-GCM",
            sync_stock: (existingConn?.settings as any)?.sync_stock ?? true,
            sync_orders: true,
            sync_products: true,
            token_expires_at: tokenResult.tokenExpiresAt || undefined,
            credentials: updatedCredentials,
          };

          const { data: savedConnector, error: upsertErr } = await supabase
            .from("marketplace_connectors")
            .upsert(
              {
                store_id: storeId,
                platform: platform as any,
                name: platformLabelMap[platform] || platform.toUpperCase(),
                external_account_id: tokenResult.externalAccountId || existingConn?.external_account_id || null,
                account_nickname: tokenResult.accountNickname || existingConn?.account_nickname || null,
                access_token: encAccessToken,
                refresh_token: encRefreshToken,
                token_expires_at: tokenResult.tokenExpiresAt || null,
                scope: tokenResult.scope || null,
                credentials: updatedCredentials,
                status: "connected",
                settings: mergedSettings,
                last_sync_at: new Date().toISOString(),
                sync_status: "idle",
                error_message: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "store_id,platform" }
            )
            .select("id")
            .maybeSingle();

          if (upsertErr) {
            throw new Error(`Erro ao persistir conector conectado: ${upsertErr.message}`);
          }

          if (savedConnector?.id) {
            await supabase.from("marketplace_sync_logs").insert({
              store_id: storeId,
              connector_id: savedConnector.id,
              platform,
              sync_type: "full",
              direction: "import",
              status: "completed",
              items_processed: 1,
              items_created: 0,
              items_updated: 1,
              items_failed: 0,
              duration_ms: 50,
              errors: [],
              metadata: {
                action: "oauth_connected",
                external_account_id: tokenResult.externalAccountId,
                connected_at: new Date().toISOString(),
              },
            });
          }

          const redirectSuccessUrl = new URL(returnPath, url.origin);
          redirectSuccessUrl.searchParams.set("connected", "true");
          redirectSuccessUrl.searchParams.set("platform", platform);
          return Response.redirect(redirectSuccessUrl.toString(), 302);
        } catch (err: any) {
          console.error("[oauth:callback] Exceção crítica:", err);
          const redirectUrl = new URL(returnPath, url.origin);
          redirectUrl.searchParams.set("error", err?.message || "Falha interna ao concluir autenticação com o marketplace.");
          return Response.redirect(redirectUrl.toString(), 302);
        }
      },
    },
  },
} as never);
