import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  ConnectorError,
  buildOfficialProviderRequest,
  decryptSecretPayload,
  invalidateCachedToken,
  normalizeProviderPayload,
  parseConnectorRequest,
  parseCredentialPayload,
  parseProviderResponse,
  type InfotravelAction,
  type ProviderCredential,
} from "../_shared/infotravel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new ConnectorError("FUNCTION_MISCONFIGURED", `${name} não configurada.`, 500);
  return value;
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ConnectorError("UNAUTHENTICATED", "Authorization Bearer obrigatório.", 401);
  return match[1];
}

async function getAuthorizedClient(request: Request) {
  const url = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const token = bearerToken(request);
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new ConnectorError("UNAUTHENTICATED", "Sessão inválida ou expirada.", 401);
  return {
    user: data.user,
    db: createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function assertAgencyAccess(db: ReturnType<typeof createClient>, userId: string, agencyId: string): Promise<void> {
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profileError) throw new ConnectorError("AUTHORIZATION_LOOKUP_FAILED", "Não foi possível verificar a identidade da agência.", 500);
  if (["master", "platform_admin"].includes(profile?.role || "")) return;
  const { data: membership, error } = await db
    .from("workspace_members")
    .select("role")
    .or(`profile_id.eq.${userId},user_id.eq.${userId}`)
    .eq("store_id", agencyId)
    .maybeSingle();
  if (error) throw new ConnectorError("AUTHORIZATION_LOOKUP_FAILED", "Não foi possível verificar o vínculo da agência.", 500);
  if (!membership || membership.role === "customer") throw new ConnectorError("FORBIDDEN_TENANT", "Usuário sem acesso à agência solicitada.", 403);
}

async function loadCredential(
  db: ReturnType<typeof createClient>,
  agencyId: string,
  operatorSlug?: string,
): Promise<ProviderCredential> {
  const candidateProviders = operatorSlug ? [`infotravel_${operatorSlug}`, "infotravel"] : ["infotravel"];

  const { data, error } = await db
    .from("integration_credentials")
    .select("*")
    .eq("store_id", agencyId)
    .in("provider", candidateProviders)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ConnectorError("CREDENTIAL_LOOKUP_FAILED", "Falha ao consultar a credencial InfoTravel.", 500);

  // Se não encontrar em integration_credentials, busca em travel_operator_integrations
  if (!data) {
    const { data: opData } = await db
      .from("travel_operator_integrations")
      .select("base_url, username, vault_secret_id, config_payload, provider_code")
      .eq("store_id", agencyId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!opData) {
      throw new ConnectorError("CREDENTIALS_NOT_CONFIGURED", "Credenciais InfoTravel não configuradas para esta agência.", 424);
    }

    let secretObj: Record<string, string> = {};
    if (typeof opData.vault_secret_id === "string" && opData.vault_secret_id.trim()) {
      const masterKey = requiredEnv("VAULT_MASTER_KEY");
      try {
        const decrypted = await decryptSecretPayload(opData.vault_secret_id, masterKey);
        secretObj = JSON.parse(decrypted);
      } catch {
        secretObj = {};
      }
    }
    const cfg = opData.config_payload && typeof opData.config_payload === "object" ? opData.config_payload : {};
    return parseCredentialPayload({
      ...cfg,
      ...secretObj,
      ...(opData.base_url ? { base_url: opData.base_url } : {}),
      ...(opData.username ? { username: opData.username } : {}),
    });
  }

  let payload: unknown = null;
  if (typeof data.secret_payload_encrypted === "string" && data.secret_payload_encrypted.trim()) {
    const masterKey = requiredEnv("VAULT_MASTER_KEY");
    const decrypted = await decryptSecretPayload(data.secret_payload_encrypted, masterKey);
    try {
      payload = JSON.parse(decrypted);
    } catch {
      throw new ConnectorError("INVALID_CREDENTIALS", "Payload InfoTravel não é JSON válido.", 500);
    }
  } else if (data.token_payload && typeof data.token_payload === "object") {
    payload = data.token_payload;
  } else if (data.credentials && typeof data.credentials === "object") {
    payload = data.credentials;
  }
  return parseCredentialPayload(payload);
}

async function invokeProvider(
  credential: ProviderCredential,
  action: InfotravelAction,
  params: Record<string, unknown>,
): Promise<unknown> {
  const executeCall = async () => {
    const { url, init } = await buildOfficialProviderRequest(credential, action, params);
    const controller = new AbortController();
    const timeoutSeconds = Number(params.supplierTimeoutSeconds) || 30;
    const timer = setTimeout(() => controller.abort(), Math.min(60_000, timeoutSeconds * 1000));
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return { response, parsed: await parseProviderResponse(response) };
    } catch (error) {
      if (error instanceof ConnectorError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ConnectorError("PROVIDER_TIMEOUT", "Provider InfoTravel excedeu o tempo limite.", 504);
      }
      throw new ConnectorError("PROVIDER_UNAVAILABLE", "Não foi possível alcançar o provider InfoTravel.", 502);
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const result = await executeCall();
    return result.parsed;
  } catch (err) {
    // Se for 401 de autenticação, invalida token em cache e tenta mais 1 vez (single-flight)
    if (err instanceof ConnectorError && err.status === 401) {
      invalidateCachedToken(credential);
      const retryResult = await executeCall();
      return retryResult.parsed;
    }
    throw err;
  }
}

async function recordEvent(
  db: ReturnType<typeof createClient>,
  input: { agencyId: string; action: string; actorId: string },
  outcome: "success" | "error",
  startedAt: number,
  errorCode?: string,
): Promise<void> {
  // Redação de log: garante que dados sensíveis de passageiros/cartão nunca sejam persistidos
  await db.from("integration_connector_events").insert({
    store_id: input.agencyId,
    provider: "infotravel",
    action: input.action,
    actor_id: input.actorId,
    outcome,
    error_code: errorCode || null,
    duration_ms: Date.now() - startedAt,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error_code: "METHOD_NOT_ALLOWED", error: "Use POST." }, 405);
  const startedAt = Date.now();
  let auditContext: { db: ReturnType<typeof createClient>; agencyId: string; action: string; actorId: string } | null = null;
  try {
    const auth = await getAuthorizedClient(request);
    const input = parseConnectorRequest(await request.json());
    auditContext = { db: auth.db, agencyId: input.agencyId, action: input.action, actorId: auth.user.id };
    await assertAgencyAccess(auth.db, auth.user.id, input.agencyId);

    const operatorSlug = typeof input.params?.operatorSlug === "string" ? input.params.operatorSlug : undefined;
    const credential = await loadCredential(auth.db, input.agencyId, operatorSlug);
    const providerData = await invokeProvider(credential, input.action, input.params);

    const raw = providerData && typeof providerData === "object" && !Array.isArray(providerData)
      ? (providerData as Record<string, unknown>)
      : { data: providerData };

    const normalized = normalizeProviderPayload(input.action, raw);
    await recordEvent(auth.db, auditContext, "success", startedAt);
    return json({ ...raw, contract_version: normalized.contract_version, normalized });
  } catch (error) {
    if (error instanceof ConnectorError) {
      if (auditContext) await recordEvent(auditContext.db, auditContext, "error", startedAt, error.code).catch(() => undefined);
      return json({ error_code: error.code, error: error.message }, error.status);
    }
    console.error("[infotravel-connector] unexpected failure", error instanceof Error ? error.message : "unknown");
    return json({ error_code: "CONNECTOR_UNAVAILABLE", error: "Falha inesperada no conector InfoTravel." }, 502);
  }
});
