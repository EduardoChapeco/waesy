import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

export const Route = createFileRoute("/api/auth/marketplace/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state") || "";
          const error = url.searchParams.get("error");
          const errorDescription = url.searchParams.get("error_description");

          // Decodifica state: formato esperado "storeId:platform" ou base64
          let storeId: string | null = null;
          let platform: string = "mercadolivre";

          if (state.includes(":")) {
            const parts = state.split(":");
            storeId = parts[0];
            platform = parts[1] || "mercadolivre";
          } else if (state.startsWith("{")) {
            try {
              const parsed = JSON.parse(state);
              storeId = parsed.storeId;
              platform = parsed.platform || "mercadolivre";
            } catch {
              // fallback
            }
          }

          if (error) {
            console.warn(`[oauth:callback] Provedor ${platform} retornou erro:`, error, errorDescription);
            const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
            redirectUrl.searchParams.set("error", errorDescription || error);
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          if (!code || !storeId) {
            const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
            redirectUrl.searchParams.set("error", "Código de autorização ou identificador de loja ausente.");
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const supabase = getServerClient();

          // 1. Busca credenciais da aplicação configuradas no ambiente ou no banco
          const envClientId =
            platform === "mercadolivre"
              ? process.env.MERCADOLIVRE_CLIENT_ID || process.env.VITE_MERCADOLIVRE_CLIENT_ID
              : platform === "ifood"
              ? process.env.IFOOD_CLIENT_ID || process.env.VITE_IFOOD_CLIENT_ID
              : null;

          const envClientSecret =
            platform === "mercadolivre"
              ? process.env.MERCADOLIVRE_CLIENT_SECRET
              : platform === "ifood"
              ? process.env.IFOOD_CLIENT_SECRET
              : null;

          let realAccessToken: string | null = null;
          let realRefreshToken: string | null = null;
          let expiresIn = 21600;

          // Se houver credenciais reais, efetua a troca HTTP real com o provedor
          if (envClientId && envClientSecret) {
            try {
              const redirectUri = new URL("/api/auth/marketplace/callback", url.origin).toString();
              let tokenEndpoint = "";
              let tokenBody: Record<string, string> = {};

              if (platform === "mercadolivre") {
                tokenEndpoint = "https://api.mercadolibre.com/oauth/token";
                tokenBody = {
                  grant_type: "authorization_code",
                  client_id: envClientId,
                  client_secret: envClientSecret,
                  code: code,
                  redirect_uri: redirectUri,
                };
              } else if (platform === "ifood") {
                tokenEndpoint = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";
                tokenBody = {
                  grantType: "authorization_code",
                  clientId: envClientId,
                  clientSecret: envClientSecret,
                  authorizationCode: code,
                  authorizationCodeVerifier: "",
                };
              }

              if (tokenEndpoint) {
                const tokenRes = await fetch(tokenEndpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams(tokenBody).toString(),
                });

                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json();
                  realAccessToken = tokenData.access_token || tokenData.accessToken;
                  realRefreshToken = tokenData.refresh_token || tokenData.refreshToken || null;
                  expiresIn = tokenData.expires_in || 21600;
                } else {
                  const errJson = await tokenRes.text();
                  console.error(`[oauth:callback] Provedor ${platform} rejeitou troca de token:`, errJson);
                  const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
                  redirectUrl.searchParams.set("error", `Provedor ${platform} rejeitou autorização: ${tokenRes.status}`);
                  redirectUrl.searchParams.set("platform", platform);
                  return Response.redirect(redirectUrl.toString(), 302);
                }
              }
            } catch (exchangeErr: any) {
              console.error(`[oauth:callback] Erro de rede ao trocar token com ${platform}:`, exchangeErr);
              const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
              redirectUrl.searchParams.set("error", `Erro de conexão com o provedor ${platform}.`);
              redirectUrl.searchParams.set("platform", platform);
              return Response.redirect(redirectUrl.toString(), 302);
            }
          } else {
            // Sem credenciais no servidor — Política Zero Mocks: rejeita conexão simulada
            console.warn(`[oauth:callback] Credenciais de API para ${platform} não configuradas no servidor.`);
            const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
            redirectUrl.searchParams.set(
              "error",
              `Credenciais do aplicativo ${platform.toUpperCase()} não configuradas no servidor (MERCADOLIVRE_CLIENT_ID / SECRET). Cadastre as chaves nas variáveis de ambiente.`
            );
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          if (!realAccessToken) {
            const redirectUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
            redirectUrl.searchParams.set("error", "Não foi possível obter o token de acesso oficial.");
            redirectUrl.searchParams.set("platform", platform);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          // Atualiza conector conectado com credenciais reais
          await supabase
            .from("marketplace_connectors")
            .upsert(
              {
                store_id: storeId,
                platform: platform as any,
                name: platform === "mercadolivre" ? "Mercado Livre Brasil" : platform === "ifood" ? "iFood Delivery" : "Canal Marketplace",
                status: "connected",
                credentials: {
                  access_token: realAccessToken,
                  refresh_token: realRefreshToken,
                  token_type: "Bearer",
                  expires_in: expiresIn,
                  obtained_at: new Date().toISOString(),
                },
                last_sync_at: new Date().toISOString(),
                sync_status: "idle",
                error_message: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "store_id, platform" }
            );

          // Registra log de conexão
          const { data: connector } = await supabase
            .from("marketplace_connectors")
            .select("id")
            .eq("store_id", storeId)
            .eq("platform", platform)
            .maybeSingle();

          if (connector) {
            await supabase.from("marketplace_sync_logs").insert({
              store_id: storeId,
              connector_id: connector.id,
              platform: platform,
              sync_type: "oauth",
              direction: "inbound",
              status: "completed",
              items_processed: 0,
              items_created: 0,
              items_updated: 1,
              items_failed: 0,
              duration_ms: 50,
              errors: [],
              metadata: {
                action: "oauth_connected",
                connected_at: new Date().toISOString(),
              },
            });
          }

          const redirectSuccessUrl = new URL("/workspace/integracoes/marketplaces", url.origin);
          redirectSuccessUrl.searchParams.set("connected", "true");
          redirectSuccessUrl.searchParams.set("platform", platform);
          return Response.redirect(redirectSuccessUrl.toString(), 302);
        } catch (err: any) {
          console.error("[oauth:callback] Exceção crítica:", err);
          const redirectUrl = new URL("/workspace/integracoes/marketplaces", request.url);
          redirectUrl.searchParams.set("error", "Falha interna ao concluir autenticação com o marketplace.");
          return Response.redirect(redirectUrl.toString(), 302);
        }
      },
    },
  },
});
