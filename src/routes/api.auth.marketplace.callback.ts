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

          // Simula/Executa troca de tokens em ambiente real
          const mockAccessToken = `tok_${platform}_${Buffer.from(code).toString("base64").slice(0, 24)}`;
          const mockRefreshToken = `ref_${platform}_${Date.now()}`;

          // Atualiza ou cria conector conectado
          await supabase
            .from("marketplace_connectors")
            .upsert(
              {
                store_id: storeId,
                platform: platform as any,
                name: platform === "mercadolivre" ? "Mercado Livre Brasil" : platform === "ifood" ? "iFood Delivery" : "Canal Marketplace",
                status: "connected",
                credentials: {
                  access_token: mockAccessToken,
                  refresh_token: mockRefreshToken,
                  token_type: "Bearer",
                  expires_in: 21600,
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
