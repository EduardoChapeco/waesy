export const SUPPORTED_ACTIONS = [
  "authenticate",
  "search_hotels",
  "search_flights",
  "search_packages",
  "search_activities",
  "search_tickets",
  "search_transfers",
  "search_vehicles",
  "search_insurance",
  "search_circuits",
  "check_rate",
  "create_booking",
  "confirm_booking",
  "get_booking",
  "search_bookings",
  "cancel_booking",
  "get_hotel_detail",
  "get_county",
  "import_booking",
  "run_periodic_sync",
  "test_connection",
] as const;

export const INFOTRAVEL_CONTRACT_VERSION = "infotravel-v1" as const;

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
  client?: string;
  agency?: string;
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
  if (!input || typeof input !== "object") throw new ConnectorError("INVALID_REQUEST", "Corpo JSON obrigatório.", 400);
  const body = input as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";
  const agencyId = typeof body.agencyId === "string" ? body.agencyId : "";
  if (!SUPPORTED_ACTIONS.includes(action as InfotravelAction)) throw new ConnectorError("UNSUPPORTED_ACTION", `Ação InfoTravel '${action}' não suportada.`, 400);
  if (!UUID_RE.test(agencyId)) throw new ConnectorError("INVALID_AGENCY", "agencyId inválido.", 400);
  const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? (body.params as Record<string, unknown>) : {};
  return { action: action as InfotravelAction, agencyId, params };
}

export function parseCredentialPayload(value: unknown): ProviderCredential {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConnectorError("INVALID_CREDENTIALS", "Credencial InfoTravel inválida.", 502);
  const raw = value as Record<string, unknown>;
  const credential: ProviderCredential = {};
  for (const key of ["base_url", "api_key", "token", "username", "password", "client", "agency", "auth", "api_key_header"] as const) {
    if (typeof raw[key] === "string" && (raw[key] as string).trim()) credential[key] = (raw[key] as string).trim() as never;
    else if (typeof raw[key] === "number") credential[key] = String(raw[key]) as never;
  }
  if (raw.headers && typeof raw.headers === "object" && !Array.isArray(raw.headers)) {
    credential.headers = Object.fromEntries(
      Object.entries(raw.headers as Record<string, unknown>)
        .filter(([, item]) => typeof item === "string")
        .map(([key, item]) => [key, item as string]),
    ) as Record<string, string>;
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

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".corp", ".home", ".lan"];

export function validateProviderCredential(credential: ProviderCredential): void {
  if (!credential.base_url) throw new ConnectorError("PROVIDER_CONTRACT_NOT_CONFIGURED", "Base URL do provider InfoTravel não configurada.", 424);
  let parsed: URL;
  try {
    parsed = new URL(credential.base_url);
  } catch {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Base URL do provider InfoTravel inválida.", 424);
  }
  if (parsed.protocol !== "https:") {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Apenas conexões HTTPS são permitidas para InfoTravel.", 424);
  }
  if (parsed.username || parsed.password) {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Credenciais embutidas na URL da operadora são proibidas.", 424);
  }
  if (parsed.port !== "" && parsed.port !== "443") {
    throw new ConnectorError("INVALID_PROVIDER_URL", "Portas não-padrão são proibidas na URL da operadora.", 424);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new ConnectorError("SSRF_BLOCKED", `Acesso ao host bloqueado (${hostname}).`, 403);
  }
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
    throw new ConnectorError("SSRF_BLOCKED", `Endereços IP literais são proibidos (${hostname}).`, 403);
  }

  const hasDirectToken = Boolean(credential.token || credential.api_key);
  const hasUserPass = Boolean(credential.username && credential.password);
  if (!hasDirectToken && !hasUserPass) {
    throw new ConnectorError("PROVIDER_CREDENTIALS_INCOMPLETE", "Credenciais InfoTravel incompletas.", 424);
  }
}

// Cache em memória de tokens autenticados por URL e usuário (TTL respeitando expire_seconds)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function authenticateOperator(credential: ProviderCredential): Promise<string> {
  validateProviderCredential(credential);

  // Se já possui token fixo/Bearer pré-configurado e não tem usuário/senha, usa o token
  if ((credential.token || credential.api_key) && !(credential.username && credential.password)) {
    return (credential.token || credential.api_key)!;
  }

  const cacheKey = `${credential.base_url}::${credential.client || ""}::${credential.agency || ""}::${credential.username || ""}`;
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now + 300_000) {
    return cached.token;
  }

  const authUrl = new URL("/api/v1/authenticate", credential.base_url).toString();
  const payload = {
    username: credential.username,
    password: credential.password,
    client: credential.client || "CLIENT",
    agency: credential.agency || "2",
  };

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    redirect: "error",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ConnectorError("AUTHENTICATION_FAILED", `Falha de autenticação InfoTravel HTTP ${res.status}: ${text.slice(0, 180)}`, 401);
  }

  const json = await res.json();
  const token = typeof json?.accessToken === "string" ? json.accessToken : typeof json?.token === "string" ? json.token : null;
  if (!token) throw new ConnectorError("AUTHENTICATION_FAILED", "Resposta de autenticação InfoTravel sem accessToken.", 401);

  const expireSeconds = Number(json?.expire_seconds) || 86400;
  tokenCache.set(cacheKey, { token, expiresAt: now + expireSeconds * 1000 });
  return token;
}

export function invalidateCachedToken(credential: ProviderCredential): void {
  const cacheKey = `${credential.base_url}::${credential.client || ""}::${credential.agency || ""}::${credential.username || ""}`;
  tokenCache.delete(cacheKey);
}

/**
 * Constrói a requisição oficial para a API InfoTravel (OpenAPI 3.0.1)
 */
export async function buildOfficialProviderRequest(
  credential: ProviderCredential,
  action: InfotravelAction,
  params: Record<string, unknown>,
): Promise<{ url: string; init: RequestInit }> {
  validateProviderCredential(credential);
  const token = await authenticateOperator(credential);

  let method = "GET";
  let path = "";
  let queryParams: Record<string, unknown> = {};
  let bodyData: unknown = undefined;

  switch (action) {
    case "authenticate":
      method = "POST";
      path = "/api/v1/authenticate";
      bodyData = {
        username: credential.username,
        password: credential.password,
        client: credential.client,
        agency: credential.agency,
        ...params,
      };
      break;

    case "search_hotels":
      method = "GET";
      path = "/api/v1/avail/hotel";
      queryParams = params;
      break;

    case "search_flights":
      method = "GET";
      path = "/api/v1/avail/flight";
      queryParams = params;
      break;

    case "search_packages": {
      const packageType = String(params.packageType || "hotel_flight");
      method = "GET";
      path = `/api/v1/avail/package/${encodeURIComponent(packageType)}`;
      const { packageType: _, ...rest } = params;
      queryParams = rest;
      break;
    }

    case "search_activities":
      method = "GET";
      path = "/api/v1/avail/activity";
      queryParams = params;
      break;

    case "search_tickets":
      method = "GET";
      path = "/api/v1/avail/ticket";
      queryParams = params;
      break;

    case "search_transfers":
      method = "GET";
      path = "/api/v1/avail/transfer";
      queryParams = params;
      break;

    case "search_vehicles":
      method = "GET";
      path = "/api/v1/avail/vehicle";
      queryParams = params;
      break;

    case "search_insurance":
      method = "GET";
      path = "/api/v1/avail/insurance";
      queryParams = params;
      break;

    case "search_circuits":
      method = "GET";
      path = "/api/v1/avail/circuit";
      queryParams = params;
      break;

    case "check_rate":
      method = "POST";
      path = "/api/v1/checkRate";
      bodyData = params.booking ? params : { booking: params };
      break;

    case "create_booking":
      method = "POST";
      path = "/api/v1/booking?waitForProcessing=true";
      bodyData = params.booking ? params : { booking: params };
      break;

    case "confirm_booking": {
      const bId = String(params.bookingId || params.id || "");
      method = "POST";
      path = `/api/v1/booking/${encodeURIComponent(bId)}/confirm`;
      break;
    }

    case "get_booking":
    case "import_booking":
    case "run_periodic_sync": {
      const bId = String(params.bookingId || params.id || "");
      method = "GET";
      path = `/api/v1/booking/${encodeURIComponent(bId)}`;
      queryParams = { syncWithProviders: true };
      break;
    }

    case "search_bookings":
      method = "GET";
      path = "/api/v1/booking/search";
      queryParams = params;
      break;

    case "cancel_booking": {
      const bId = String(params.bookingId || params.id || "");
      const cancelType = String(params.cancelType || "SIMULATION");
      method = "DELETE";
      path = `/api/v1/booking/${encodeURIComponent(bId)}/cancel?cancelType=${encodeURIComponent(cancelType)}`;
      break;
    }

    case "get_hotel_detail": {
      const keyDetail = String(params.keyDetail || "");
      method = "GET";
      path = `/api/v1/utility/hotelDetail/${encodeURIComponent(keyDetail)}`;
      break;
    }

    case "get_county": {
      const countyName = String(params.countyName || "");
      method = "GET";
      path = `/api/v1/utility/county/${encodeURIComponent(countyName)}`;
      break;
    }

    case "test_connection":
      method = "GET";
      path = "/api/v1/company";
      break;

    default:
      method = "POST";
      path = credential.action_paths?.[action] || `/${action}`;
      bodyData = params;
  }

  // Se houver path customizado configurado na credencial, sobrescreve
  if (credential.action_paths?.[action]) {
    path = credential.action_paths[action]!;
  }

  const urlObj = new URL(path, credential.base_url);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) urlObj.searchParams.append(k, String(item));
    } else {
      urlObj.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...credential.headers,
  });

  return {
    url: urlObj.toString(),
    init: {
      method,
      headers,
      body: bodyData !== undefined ? JSON.stringify(bodyData) : undefined,
      redirect: "error",
    },
  };
}

export async function parseProviderResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text.slice(0, 2000) };
  }
  if (!response.ok) {
    throw new ConnectorError("PROVIDER_ERROR", `Provider InfoTravel respondeu HTTP ${response.status}: ${text.slice(0, 200)}`, response.status >= 500 ? 502 : response.status === 401 ? 401 : 424);
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload) && (payload as Record<string, unknown>).error) {
    throw new ConnectorError("PROVIDER_ERROR", "Provider InfoTravel retornou erro de negócio.", 424);
  }
  return payload;
}

function objectPayload(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function firstArray(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) if (Array.isArray(source[key])) return source[key] as unknown[];
  return [];
}

function stringOrNull(...values: unknown[]): string | null {
  const found = values.find((value) => typeof value === "string" && value.trim());
  return typeof found === "string" ? found.trim() : null;
}

function stableId(prefix: string, value: unknown, fallback: string): string {
  const source = String(value || fallback);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

function mapHotelV1(item: unknown): Record<string, unknown> {
  const raw = objectPayload(item);
  const id = stringOrNull(raw.external_id, raw.externalCode, raw.id, raw.hotelId, raw.hotel?.id) || stableId("hotel", raw.name || raw.hotel?.name, JSON.stringify(raw));
  const hotelObj = objectPayload(raw.hotel);
  return {
    ...raw,
    external_id: id,
    name: stringOrNull(raw.name, raw.hotelName, hotelObj.name) || "Hotel",
    city: stringOrNull(raw.city, raw.cityName, hotelObj.address?.city),
    checkin: stringOrNull(raw.checkin, raw.checkIn),
    checkout: stringOrNull(raw.checkout, raw.checkOut),
    price: Number(raw.lowestFare?.fares?.[0]?.priceSale ?? raw.price ?? raw.totalPrice ?? 0),
  };
}

function mapFlightV1(item: unknown): Record<string, unknown> {
  const raw = objectPayload(item);
  const id = stringOrNull(raw.external_id, raw.externalId, raw.id, raw.code, raw.flightNumber) || stableId("flight", raw.date || raw.departure, JSON.stringify(raw));
  return {
    ...raw,
    external_id: id,
    origin: stringOrNull(raw.origin),
    destination: stringOrNull(raw.destination),
    date: stringOrNull(raw.date, raw.departure),
    flight_number: stringOrNull(raw.number, raw.flight_number, raw.flightNumber),
    price: Number(raw.fares?.[0]?.priceSale ?? raw.price ?? raw.totalPrice ?? 0),
  };
}

export function normalizeBookingPayload(raw: unknown): Record<string, unknown> {
  const source = objectPayload(raw);
  const bookingObj = source.booking && typeof source.booking === "object" ? objectPayload(source.booking) : source;
  const client = objectPayload(bookingObj.client);
  const bookingId = stringOrNull(bookingObj.id, bookingObj.bookingId, bookingObj.booking_id, bookingObj.externalId);
  if (!bookingId) throw new ConnectorError("PROVIDER_SCHEMA_MISMATCH", "Payload InfoTravel sem identificador de reserva.", 424);

  const flights = firstArray(bookingObj, ["bookingFlights", "flights"]).map(mapFlightV1);
  const hotels = firstArray(bookingObj, ["bookingHotels", "hotels"]).map(mapHotelV1);
  const transfers = firstArray(bookingObj, ["bookingTransfers", "transfers"]);
  const tours = firstArray(bookingObj, ["bookingTours", "bookingActivities", "activities", "tours"]);

  const locators: string[] = [];
  if (Array.isArray(bookingObj.bookingHotels)) {
    for (const h of bookingObj.bookingHotels as any[]) {
      if (Array.isArray(h.locators)) for (const l of h.locators) if (l.code) locators.push(String(l.code));
    }
  }
  if (Array.isArray(bookingObj.bookingFlights)) {
    for (const f of bookingObj.bookingFlights as any[]) {
      if (Array.isArray(f.locators)) for (const l of f.locators) if (l.code) locators.push(String(l.code));
    }
  }

  return {
    contract_version: INFOTRAVEL_CONTRACT_VERSION,
    booking_id: bookingId,
    locator: locators[0] || stringOrNull(bookingObj.externalId, bookingObj.id) || bookingId,
    locators,
    destination: stringOrNull(bookingObj.destination, hotels[0]?.city),
    client_name: stringOrNull(client.name, bookingObj.contact?.name) || "Cliente",
    client_cpf: stringOrNull(client.documents?.[0]?.number, client.document),
    client_email: stringOrNull(client.email, bookingObj.contact?.email),
    client_phone: stringOrNull(client.telephones?.[0]?.number, bookingObj.contact?.telephone),
    total_sale: Number(bookingObj.bookingAmount?.amount ?? bookingObj.paidAmount?.amount ?? bookingObj.totalAmount ?? 0),
    status: stringOrNull(bookingObj.status) || "confirmed",
    url_voucher: stringOrNull(bookingObj.urlVoucher),
    passengers: firstArray(bookingObj, ["names", "passengers", "travelers"]),
    flights,
    hotels,
    transfers,
    tours,
  };
}

export function normalizeProviderPayload(action: InfotravelAction, raw: unknown): Record<string, unknown> {
  const source = objectPayload(raw);
  if (action === "import_booking" || action === "run_periodic_sync" || action === "get_booking" || action === "create_booking" || action === "confirm_booking") {
    return normalizeBookingPayload(raw);
  }
  if (action === "test_connection") {
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, status: "ok", provider: "infotravel" };
  }
  if (action === "search_hotels") {
    const list = firstArray(source, ["hotelAvail", "offers", "hotels", "data"]).map(mapHotelV1);
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, offers: list, hotels: list };
  }
  if (action === "search_flights") {
    const list = firstArray(source, ["flightAvail", "offers", "flights", "data"]).map(mapFlightV1);
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, offers: list, flights: list };
  }
  if (action === "search_packages") {
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, packages: firstArray(source, ["packageAvails", "packageAvail", "packages", "data"]) };
  }
  if (action === "search_vehicles") {
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, vehicles: firstArray(source, ["vehicleAvails", "cars", "vehicles", "data"]) };
  }
  if (action === "search_transfers") {
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, offers: firstArray(source, ["transferAvail", "transfers", "offers", "data"]) };
  }
  if (action === "search_activities" || action === "search_tickets") {
    return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, offers: firstArray(source, ["tourAvail", "ticketAvail", "activities", "tours", "data"]) };
  }
  return { contract_version: INFOTRAVEL_CONTRACT_VERSION, action, ...source };
}

export async function decryptSecretPayload(payload: string, masterKey: string): Promise<string> {
  if (!masterKey || masterKey.length < 32) throw new ConnectorError("VAULT_NOT_CONFIGURED", "VAULT_MASTER_KEY ausente ou inválida.", 500);
  if (!payload.includes(":")) {
    try {
      return atob(payload);
    } catch {
      throw new ConnectorError("INVALID_SECRET_PAYLOAD", "Payload de segredo inválido.", 500);
    }
  }
  const [ivHex, tagHex, cipherHex] = payload.split(":");
  if (!ivHex || !tagHex || !cipherHex) throw new ConnectorError("INVALID_SECRET_PAYLOAD", "Payload AES-GCM inválido.", 500);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(masterKey));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const tag = new Uint8Array(tagHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const cipher = new Uint8Array(cipherHex.match(/.{2}/g)!.map((part) => parseInt(part, 16)));
  const combined = new Uint8Array(cipher.length + tag.length);
  combined.set(cipher);
  combined.set(tag, cipher.length);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
    return new TextDecoder().decode(plain);
  } catch {
    throw new ConnectorError("SECRET_DECRYPTION_FAILED", "Não foi possível descriptografar a credencial InfoTravel.", 500);
  }
}
