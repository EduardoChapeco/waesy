export const SUPPORTED_ACTIONS = [
  "search_hotels",
  "search_flights",
  "search_transfers",
  "search_activities",
  "import_booking",
  "create_booking",
  "run_periodic_sync",
  "test_connection",
] as const;

export type InfotravelAction = (typeof SUPPORTED_ACTIONS)[number];

export type ConnectorRequest = {
  action: InfotravelAction;
  agencyId: string;
  params: Record<string, unknown>;
};

export type ProviderCredential = {
  base_url?: string;
  api_key?: string;
  token?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  action_paths?: Partial<Record<InfotravelAction, string>>;
  auth?: "bearer" | "api_key" | "basic" | "body";
  api_key_header?: string;
};

export class ConnectorError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseConnectorRequest(input: unknown): ConnectorRequest {
  if (!input || typeof input !== "object") {
    throw new ConnectorError("INVALID_REQUEST", "Corpo JSON obrigatório.", 400);
  }
  const body = input as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";
  const agencyId = typeof body.agencyId === "string" ? body.agencyId : "";
  if (!SUPPORTED_ACTIONS.includes(action as InfotravelAction)) {
    throw new ConnectorError("UNSUPPORTED_ACTION", "Ação InfoTravel não suportada.", 400);
  }
  if (!UUID_RE.test(agencyId)) {
    throw new ConnectorError("INVALID_AGENCY", "agencyId inválido.", 400);
  }
  const params = body.params && typeof body.params === "object" && !Array.isArray(body.params)
    ? body.params as Record<string, unknown>
    : {};
  return { action: action as InfotravelAction, agencyId, params };
}

export function parseCredentialPayload(value: unknown): ProviderCredential {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConnectorError("INVALID_CREDENTIALS", "Credencial InfoTravel inválida.", 502);
  }
  const raw = value as Record<string, unknown>;
  const credential: ProviderCredential = {};
  for (const key of ["base_url", "api_key", "token", "username", "password", "auth", "api_key_header"] as const) {
    if (typeof raw[key] === "string" && raw[key].trim()) credential[key] = raw[key].trim() as never;
  }
  if (raw.headers && typeof raw.headers === "object" && !Array.isArray(raw.headers)) {
    credential.headers = Object.fromEntries(
      Object.entries(raw.headers as Record<string, unknown>)
        .filter(([, item]) => typeof item === "string")
        .map(([key, item]) => [key, item as string]),
    );
  }
  if (raw.action_paths && typeof raw.action_paths === "object" && !Array.isArray(raw.action_paths)) {
    credential.action_paths = Object.fromEntries(
      Object.entries(raw.action_paths as Record<string, unknown>)
        .filter(([key, item]) => SUPPORTED_ACTIONS.includes(key as InfotravelAction) && typeof item === "string")
        .map(([key, item]) => [key, item as string]),
    ) as ProviderCredential["action_paths"];
  }
  if (!credential.action_paths) credential.action_paths = {};
  for (const action of SUPPORTED_ACTIONS) {
    const flatPath = raw[`${action}_path`];
    if (typeof flatPath === "string" && flatPath.trim()) credential.action_paths[action] = flatPath.trim();
  }
  return credential;
}

export function validateProviderCredential(credential: ProviderCredential): void {
  if (!credential.base_url) {
    throw new ConnectorError("PROVIDER_CONTRACT_NOT_CONFIGURED", "Base URL do provider InfoTravel não configurada.", 424);
  }
  let parsed: URL;
  try {
    parsed = new URL(credential.base_url);
  } catch {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Base URL do provider InfoTravel inválida.", 424);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Base URL do provider deve usar HTTPS ou HTTP.", 424);
  }
  if (!credential.api_key && !credential.token && !(credential.username && credential.password)) {
    throw new ConnectorError("PROVIDER_CREDENTIALS_INCOMPLETE", "Credenciais InfoTravel incompletas.", 424);
  }
}

function pathForAction(credential: ProviderCredential, action: InfotravelAction): string {
  const configured = credential.action_paths?.[action];
  if (configured) return configured;
  return `/${action}`;
}

export function buildProviderRequest(
  credential: ProviderCredential,
  action: InfotravelAction,
  params: Record<string, unknown>,
): { url: string; init: RequestInit } {
  validateProviderCredential(credential);
  const url = new URL(pathForAction(credential, action), credential.base_url).toString();
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json",
    ...credential.headers,
  });
  const auth = credential.auth || (credential.token ? "bearer" : credential.username ? "basic" : "api_key");
  const body: Record<string, unknown> = { ...params };
  if (auth === "bearer" && credential.token) headers.set("authorization", `Bearer ${credential.token}`);
  if (auth === "api_key" && credential.api_key) headers.set(credential.api_key_header || "x-api-key", credential.api_key);
  if (auth === "basic" && credential.username && credential.password) {
    headers.set("authorization", `Basic ${btoa(`${credential.username}:${credential.password}`)}`);
  }
  if (auth === "body") {
    if (credential.api_key) body.api_key = credential.api_key;
    if (credential.token) body.token = credential.token;
    if (credential.username) body.username = credential.username;
    if (credential.password) body.password = credential.password;
  }
  return { url, init: { method: action === "test_connection" ? "GET" : "POST", headers, body: action === "test_connection" ? undefined : JSON.stringify(body) } };
}

export async function parseProviderResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text.slice(0, 2000) }; }
  if (!response.ok) {
    throw new ConnectorError("PROVIDER_ERROR", `Provider InfoTravel respondeu HTTP ${response.status}.`, response.status >= 500 ? 502 : 424);
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload) && (payload as Record<string, unknown>).error) {
    throw new ConnectorError("PROVIDER_ERROR", "Provider InfoTravel retornou erro de negócio.", 424);
  }
  return payload;
}

export function normalizeBookingPayload(raw: unknown): Record<string, unknown> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const client = source.client && typeof source.client === "object" ? source.client as Record<string, unknown> : {};
  const bookingId = String(source.bookingId || source.booking_id || source.id || source.code || "");
  const locator = String(source.locator || source.pnr || source.code || bookingId);
  return {
    booking_id: bookingId,
    locator,
    destination: source.destination || source.city || null,
    client_name: client.name || source.client_name || null,
    client_cpf: client.document || source.client_cpf || null,
    client_email: client.email || source.client_email || null,
    client_phone: client.phone || source.client_phone || null,
    total_sale: Number(source.totalAmount ?? source.total_amount ?? source.totalPrice ?? 0),
    status: source.status || "confirmed",
    travel_start: source.travel_start || source.startDate || null,
    travel_end: source.travel_end || source.endDate || null,
    passengers: Array.isArray(source.passengers) ? source.passengers : [],
    flights: Array.isArray(source.bookingFlights) ? source.bookingFlights : Array.isArray(source.flights) ? source.flights : [],
    hotels: Array.isArray(source.bookingHotels) ? source.bookingHotels : Array.isArray(source.hotels) ? source.hotels : [],
  };
}

export async function decryptSecretPayload(payload: string, masterKey: string): Promise<string> {
  if (!masterKey || masterKey.length < 32) throw new ConnectorError("VAULT_NOT_CONFIGURED", "VAULT_MASTER_KEY ausente ou inválida.", 500);
  if (!payload.includes(":")) {
    try { return atob(payload); } catch { throw new ConnectorError("INVALID_SECRET_PAYLOAD", "Payload de segredo inválido.", 500); }
  }
  const [ivHex, tagHex, cipherHex] = payload.split(":");
  if (!ivHex || !tagHex || !cipherHex) throw new ConnectorError("INVALID_SECRET_PAYLOAD", "Payload AES-GCM inválido.", 500);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(masterKey));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const tag = new Uint8Array(tagHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const cipher = new Uint8Array(cipherHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const combined = new Uint8Array(cipher.length + tag.length);
  combined.set(cipher); combined.set(tag, cipher.length);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
    return new TextDecoder().decode(plain);
  } catch {
    throw new ConnectorError("SECRET_DECRYPTION_FAILED", "Não foi possível descriptografar a credencial InfoTravel.", 500);
  }
}
