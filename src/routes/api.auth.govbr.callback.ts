import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { signContractWithGovBr } from "@/services/contracts.functions";

export const Route = createFileRoute("/api/auth/govbr/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state") || ""; // signingToken
          const error = url.searchParams.get("error");
          const errorDescription = url.searchParams.get("error_description");

          if (!state) {
            return Response.redirect(`${url.origin}/?error=invalid_signing_session`, 302);
          }

          if (error) {
            console.warn("[govbr:oauth:callback] Retornou erro:", error, errorDescription);
            return Response.redirect(
              `${url.origin}/assinar/${state}?error=${encodeURIComponent(errorDescription || error)}`,
              302,
            );
          }

          if (!code) {
            return Response.redirect(
              `${url.origin}/assinar/${state}?error=missing_authorization_code`,
              302,
            );
          }

          const supabase = getServerClient();

          // 1. Busca o envelope e a loja emissora
          const { data: envelope, error: envErr } = await supabase
            .from("signature_envelopes")
            .select(`
              id, signing_token, signer_name, signer_cpf,
              contract_version:contract_version_id (
                contract:contract_id (id, store_id)
              )
            `)
            .eq("signing_token", state)
            .maybeSingle();

          if (envErr || !envelope) {
            return Response.redirect(`${url.origin}/assinar/${state}?error=envelope_not_found`, 302);
          }

          const storeId = (envelope.contract_version as any)?.contract?.store_id;

          // 2. Busca credenciais ativas do govbr_signature
          let credential: { token_payload: any; is_active: boolean } | null = null;
          if (storeId) {
            const { data: storeCred } = await supabase
              .from("integration_credentials")
              .select("token_payload, is_active")
              .eq("store_id", storeId)
              .eq("provider", "govbr_signature")
              .eq("is_active", true)
              .maybeSingle();

            if (storeCred) credential = storeCred;
          }

          if (!credential) {
            const { data: masterCred } = await supabase
              .from("integration_credentials")
              .select("token_payload, is_active")
              .is("store_id", null)
              .eq("provider", "govbr_signature")
              .eq("is_active", true)
              .maybeSingle();

            if (masterCred) credential = masterCred;
          }

          if (!credential || !credential.token_payload) {
            return Response.redirect(
              `${url.origin}/assinar/${state}?error=govbr_integration_inactive`,
              302,
            );
          }

          const payload = credential.token_payload as Record<string, string>;
          const clientId = payload.client_id || payload.clientId;
          const clientSecret = payload.client_secret || payload.clientSecret;
          const env = (payload.environment || "production").toLowerCase().trim();
          const ssoBase =
            env === "staging"
              ? "https://sso.staging.acesso.gov.br"
              : "https://sso.acesso.gov.br";

          const redirectUri =
            payload.redirect_uri ||
            payload.redirectUri ||
            `${url.origin}/api/auth/govbr/callback`;

          // 3. Troca do Authorization Code por Access Token
          let accessToken = "";
          let idToken = "";
          let govBrCpf = envelope.signer_cpf || "";
          let govBrName = envelope.signer_name || "";
          let govBrLevel: "prata" | "ouro" = "prata";

          try {
            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const tokenRes = await fetch(`${ssoBase}/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
              }),
            });

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              accessToken = tokenData.access_token || "";
              idToken = tokenData.id_token || "";

              // Consulta dados cadastrais do cidadão
              if (accessToken) {
                const userRes = await fetch(`${ssoBase}/userinfo`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  if (userData.sub) govBrCpf = userData.sub;
                  if (userData.name) govBrName = userData.name;
                }

                // Consulta confiabilidade
                const confRes = await fetch(
                  `https://${env === "staging" ? "api.staging.acesso.gov.br" : "api.acesso.gov.br"}/confiabilidades/v3/contas/${govBrCpf}/niveis`,
                  { headers: { Authorization: `Bearer ${accessToken}` } },
                ).catch(() => null);

                if (confRes && confRes.ok) {
                  const confData = await confRes.json();
                  const niveis = Array.isArray(confData) ? confData.map((n: any) => n.id) : [];
                  if (niveis.includes("ouro") || niveis.includes("OURO")) {
                    govBrLevel = "ouro";
                  } else {
                    govBrLevel = "prata";
                  }
                }
              }
            }
          } catch (fetchErr) {
            console.warn("[govbr:token:exchange] Falha ao comunicar com Gov.br SSO:", fetchErr);
          }

          // 4. Executa a selagem do envelope com chancela Gov.br
          await signContractWithGovBr({
            data: {
              signingToken: state,
              govBrLevel,
              cpf: govBrCpf,
              name: govBrName,
            },
          });

          // 5. Redireciona de volta para a tela de assinatura com flag de sucesso
          return Response.redirect(`${url.origin}/assinar/${state}?signed=true`, 302);
        } catch (err: any) {
          console.error("[govbr:callback:error] Erro não tratado:", err);
          return Response.redirect(
            `${new URL(request.url).origin}/?error=govbr_callback_failed`,
            302,
          );
        }
      },
    },
  },
});
