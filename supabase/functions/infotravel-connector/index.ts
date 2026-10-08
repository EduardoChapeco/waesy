import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  ConnectorError,
  buildProviderRequest,
  decryptSecretPayload,
  normalizeProviderPayload,
  parseConnectorRequest,
  parseCredentialPayload,
  parseProviderResponse,
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
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new ConnectorError("UNAUTHENTICATED", "Sessão inválida ou expirada.", 401);
  return { user: data.user, db: createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

async function assertAgencyAccess(db: ReturnType<typeof createClient>, userId: string, agencyId: string): Promise<void> {
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profileError) throw new ConnectorError("AUTHORIZATION_LOOKUP_FAILED", "Não foi possível verificar a identidade da agência.", 500);
  if (["master", "platform_admin"].includes(profile?.role || "")) return;
  const { data: membership, error } = await db
    .from("workspace_members")
    .select("role")
    .eq("profile_id", userId)
    .eq("store_id", agencyId)
    .maybeSingle();
  if (error) throw new ConnectorError("AUTHORIZATION_LOOKUP_FAILED", "Não foi possível verificar o vínculo da agência.", 500);
  if (!membership || membership.role === "customer") throw new ConnectorError("FORBIDDEN_TENANT", "Usuário sem acesso à agência solicitada.", 403);
}

async function loadCredential(db: ReturnType<typeof createClient>, agencyId: string): Promise<ProviderCredential> {
  const { data, error } = await db
    .from("integration_credentials")
    .select("*")
    .eq("store_id", agencyId)
    .eq("provider", "infotravel")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ConnectorError("CREDENTIAL_LOOKUP_FAILED", "Falha ao consultar a credencial InfoTravel.", 500);
  if (!data) throw new ConnectorError("CREDENTIALS_NOT_CONFIGURED", "Credenciais InfoTravel não configuradas para esta agência.", 424);

  let payload: unknown = null;
  if (typeof data.secret_payload_encrypted === "string" && data.secret_payload_encrypted.trim()) {
    const masterKey = requiredEnv("VAULT_MASTER_KEY");
    const decrypted = await decryptSecretPayload(data.secret_payload_encrypted, masterKey);
    try { payload = JSON.parse(decrypted); } catch { throw new ConnectorError("INVALID_CREDENTIALS", "Payload InfoTravel não é JSON válido.", 500); }
  } else if (data.token_payload && typeof data.token_payload === "object") {
    payload = data.token_payload;
  } else if (data.credentials && typeof data.credentials === "object") {
    payload = data.credentials;
  }
  return parseCredentialPayload(payload);
}

async function invokeProvider(credential: ProviderCredential, action: Parameters<typeof buildProviderRequest>[1], params: Record<string, unknown>): Promise<unknown> {
  const { url, init } = buildProviderRequest(credential, action, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await parseProviderResponse(response);
  } catch (error) {
    if (error instanceof ConnectorError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new ConnectorError("PROVIDER_TIMEOUT", "Provider InfoTravel excedeu o tempo limite.", 504);
    throw new ConnectorError("PROVIDER_UNAVAILABLE", "Não foi possível alcançar o provider InfoTravel.", 502);
  } finally {
    clearTimeout(timer);
  }
}

async function recordEvent(
  db: ReturnType<typeof createClient>,
  input: { agencyId: string; action: string; actorId: string },
  outcome: "success" | "error",
  startedAt: number,
  errorCode?: string,
): Promise<void> {
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
    const credential = await loadCredential(auth.db, input.agencyId);
    const providerData = await invokeProvider(credential, input.action, input.params);
    const raw = providerData && typeof providerData === "object" && !Array.isArray(providerData)
      ? providerData as Record<string, unknown>
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
