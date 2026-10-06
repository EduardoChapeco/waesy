import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/auth/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const stateRaw = url.searchParams.get("state") || "";
          const error = url.searchParams.get("error");
          const errorDesc = url.searchParams.get("error_description");

          let returnTo = "/conta/curriculo";
          let storeId: string | null = null;
          let userId: string | null = null;
          let mode: "candidate" | "company" = "candidate";

          // Decodifica state seguro
          if (stateRaw) {
            try {
              const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
              if (decoded.returnTo) returnTo = decoded.returnTo;
              if (decoded.storeId) storeId = decoded.storeId;
              if (decoded.userId) userId = decoded.userId;
              if (decoded.mode) mode = decoded.mode;
            } catch {
              // fallback
            }
          }

          if (error) {
            console.warn("[linkedin:callback] Erro no OAuth do LinkedIn:", error, errorDesc);
            const redirectUrl = new URL(returnTo, url.origin);
            redirectUrl.searchParams.set("linkedin_error", errorDesc || error);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          if (!code) {
            const redirectUrl = new URL(returnTo, url.origin);
            redirectUrl.searchParams.set("linkedin_error", "Código de autorização ausente.");
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const supabase = getServerClient();

          // 1. Busca credenciais do cofre master
          const { data: creds } = await supabase
            .from("linkedin_master_credentials")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!creds || !creds.client_id || !creds.client_secret_encrypted) {
            const redirectUrl = new URL(returnTo, url.origin);
            redirectUrl.searchParams.set("linkedin_error", "Integração do LinkedIn não configurada no cofre mestre.");
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const clientSecret = decryptSecret(creds.client_secret_encrypted);

          // 2. Troca o código pelo access_token na API do LinkedIn
          const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: creds.redirect_uri,
            client_id: creds.client_id,
            client_secret: clientSecret,
          });

          const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenParams.toString(),
          });

          if (!tokenRes.ok) {
            const errData = await tokenRes.json().catch(() => ({}));
            const msg = errData.error_description || `Falha na troca de token (${tokenRes.status})`;
            const redirectUrl = new URL(returnTo, url.origin);
            redirectUrl.searchParams.set("linkedin_error", msg);
            return Response.redirect(redirectUrl.toString(), 302);
          }

          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;
          const expiresIn = tokenData.expires_in || 5184000; // 60 dias padrão
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

          // 3. Busca dados do perfil via OpenID Connect userinfo
          const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          let userInfo: any = {};
          if (userinfoRes.ok) {
            userInfo = await userinfoRes.json();
          }

          // Se for modo Company Page (sindicação B2B para o workspace da empresa)
          if (mode === "company" && storeId) {
            await supabase.from("oauth_integrations").upsert(
              {
                store_id: storeId,
                provider: "linkedin_company",
                account_id: creds.default_company_id || userInfo.sub || "company",
                account_name: userInfo.name || "LinkedIn Company Page",
                access_token: accessToken,
                token_type: "Bearer",
                expires_at: expiresAt,
                scopes: creds.scopes || ["openid", "profile", "email", "w_organization_social"],
                metadata: userInfo,
                is_active: true,
                sync_status: "idle",
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "store_id,provider" },
            );

            const redirectUrl = new URL(returnTo, url.origin);
            redirectUrl.searchParams.set("linkedin_connected", "company");
            return Response.redirect(redirectUrl.toString(), 302);
          }

          // Modo candidato: persiste no perfil do usuário no Supabase
          if (userId) {
            try {
              const { data: currentProfile } = await supabase
                .from("profiles")
                .select("id, headline, bio, avatar_url, resume_data")
                .eq("id", userId)
                .maybeSingle();

              if (currentProfile) {
                const currentResume = (currentProfile.resume_data as Record<string, any>) || {};
                const updatedResume = {
                  ...currentResume,
                  headline: currentResume.headline || (userInfo.name ? `Profissional • ${userInfo.name}` : undefined),
                  summary: currentResume.summary || currentProfile.bio || undefined,
                  linkedin_sub: userInfo.sub,
                  linkedin_connected_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                await supabase
                  .from("profiles")
                  .update({
                    headline: currentProfile.headline || (userInfo.name ? `Profissional verificado via LinkedIn` : undefined),
                    avatar_url: currentProfile.avatar_url || userInfo.picture || undefined,
                    resume_data: updatedResume,
                  })
                  .eq("id", userId);
              }
            } catch (pErr) {
              console.warn("[linkedin:callback] Erro não impeditivo ao salvar perfil do candidato:", pErr);
            }
          }

          // Redireciona de volta com flags de sucesso
          const redirectUrl = new URL(returnTo, url.origin);
          redirectUrl.searchParams.set("linkedin_connected", "success");
          if (userInfo.name) redirectUrl.searchParams.set("linkedin_name", userInfo.name);
          if (userInfo.email) redirectUrl.searchParams.set("linkedin_email", userInfo.email);

          return Response.redirect(redirectUrl.toString(), 302);
        } catch (err: any) {
          console.error("[linkedin:callback] Erro interno:", err);
          return Response.redirect("/conta/curriculo?linkedin_error=server_error", 302);
        }
      },
    },
  },
} as never)
