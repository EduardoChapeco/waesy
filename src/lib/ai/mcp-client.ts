/**
 * mcp-client.ts — Cliente MCP Outbound (JSON-RPC 2.0 / Streamable HTTP / SSE) com Guardas SSRF
 * Permite que usuários conectem servidores MCP externos ao Waesy Copilot com proteção contra
 * redirecionamentos internos, metadados cloud, IPs privados e payloads malformados.
 */

export type ExternalMcpTransport = "http_json_rpc" | "sse" | "streamable_http";
export type ExternalMcpAuthType = "none" | "bearer" | "api_key_header" | "basic";

export interface ExternalMcpToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface ExternalMcpConnectionConfig {
  endpointUrl: string;
  transport?: ExternalMcpTransport;
  authType?: ExternalMcpAuthType;
  authHeaderName?: string | null;
  secret?: string | null;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_DISCOVERY_PAGES = 5;
const MAX_DISCOVERED_TOOLS = 100;
const MCP_PROTOCOL_VERSION = "2025-03-26";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "169.254.169.254",
  "100.100.100.200",
]);

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) return false;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (nums.some((n) => n < 0 || n > 255)) return true;

  const [a, b] = nums;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
  if (a >= 224) return true; // Multicast & reserved
  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true; // Link-local fe80::/10
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true; // ULA fc00::/7
  }
  if (normalized.startsWith("ff")) {
    return true; // Multicast
  }
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped && isPrivateOrReservedIpv4(v4Mapped[1])) {
    return true;
  }
  // Decimal/hex ipv4-mapped ::ffff:7f00:1
  if (normalized.startsWith("::ffff:")) return true;
  return false;
}

export function isUnsafeIpAddress(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "").trim();
  if (isPrivateOrReservedIpv4(clean)) return true;
  if (isPrivateOrReservedIpv6(clean)) return true;
  return false;
}

/**
 * Valida sintaxe e bloqueia alvos SSRF óbvios (HTTP não-TLS, credenciais em URL,
 * IPs privados/loopback/metadados e domínios internos).
 */
export function assertSafeExternalMcpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("URL de servidor MCP inválida.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Por segurança, servidores MCP externos devem utilizar HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Não inclua usuário ou senha na URL; use o cofre de credenciais.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) {
    throw new Error("Hostname do servidor MCP ausente.");
  }

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    host.endsWith(".localdomain")
  ) {
    throw new Error(`Destino MCP bloqueado por política anti-SSRF (${host}).`);
  }

  if (isUnsafeIpAddress(host)) {
    throw new Error(`Endereço IP privado ou reservado bloqueado (${host}).`);
  }

  // Rejeita hex/octal/integer IPs como https://2130706433
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    throw new Error("Endereços numéricos ofuscados não são permitidos.");
  }

  return parsed;
}

/**
 * Resolve DNS em ambiente Node para impedir DNS rebinding/A-record apontando para IP interno.
 */
async function assertDnsResolvesPublicly(hostname: string): Promise<void> {
  if (typeof process === "undefined" || !process.versions?.node) return;
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (isUnsafeIpAddress(rec.address)) {
        throw new Error(`Hostname resolve para endereço interno bloqueado (${rec.address}).`);
      }
    }
  } catch (err: any) {
    if (err?.message?.includes("endereço interno bloqueado")) {
      throw err;
    }
    // Se DNS falhar em ambiente mockado/offline, o fetch seguinte reportará erro de rede honesto
  }
}

export function buildExternalMcpHeaders(
  config: Pick<ExternalMcpConnectionConfig, "authType" | "authHeaderName" | "secret">,
  sessionId?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const secret = config.secret?.trim();
  const authType = config.authType || "none";

  if (secret && authType === "bearer") {
    headers["Authorization"] = secret.toLowerCase().startsWith("bearer ")
      ? secret
      : `Bearer ${secret}`;
  } else if (secret && authType === "api_key_header") {
    const safeHeaderName = (config.authHeaderName || "x-api-key")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64) || "x-api-key";
    headers[safeHeaderName] = secret;
  } else if (secret && authType === "basic") {
    if (secret.includes(":")) {
      const encoded =
        typeof Buffer !== "undefined"
          ? Buffer.from(secret, "utf8").toString("base64")
          : btoa(secret);
      headers["Authorization"] = `Basic ${encoded}`;
    } else {
      headers["Authorization"] = secret.toLowerCase().startsWith("basic ")
        ? secret
        : `Basic ${secret}`;
    }
  }

  return headers;
}

export interface JsonRpcResponseFrame {
  jsonrpc?: string;
  id?: string | number | null;
  result?: any;
  error?: { code?: number; message?: string; data?: any };
}

/**
 * Decodifica resposta `application/json` ou `text/event-stream` (SSE) de servidores MCP.
 */
export function parseMcpJsonRpcPayload(
  contentType: string,
  bodyText: string,
  expectedId?: string | number
): JsonRpcResponseFrame {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return {};
  }

  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes("text/event-stream") || trimmed.startsWith("event:") || trimmed.startsWith("data:")) {
    const frames: JsonRpcResponseFrame[] = [];
    const lines = trimmed.split(/\r?\n/);
    let currentDataLines: string[] = [];

    const flush = () => {
      if (currentDataLines.length === 0) return;
      const joined = currentDataLines.join("\n").trim();
      currentDataLines = [];
      if (!joined || joined === "[DONE]") return;
      try {
        const parsed = JSON.parse(joined);
        if (Array.isArray(parsed)) {
          frames.push(...parsed);
        } else if (parsed && typeof parsed === "object") {
          frames.push(parsed);
        }
      } catch {
        // Ignora evento SSE não-JSON (keep-alive ou log)
      }
    };

    for (const line of lines) {
      if (line.trim() === "") {
        flush();
      } else if (line.startsWith("data:")) {
        currentDataLines.push(line.slice(5).trimStart());
      }
    }
    flush();

    if (frames.length === 0) {
      throw new Error("Stream SSE do servidor MCP não retornou resposta JSON-RPC válida.");
    }

    if (expectedId !== undefined) {
      const exact = frames.find((f) => f.id === expectedId);
      if (exact) return exact;
    }
    return frames[frames.length - 1];
  }

  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) {
    if (expectedId !== undefined) {
      const exact = parsed.find((f) => f?.id === expectedId);
      if (exact) return exact;
    }
    return parsed[parsed.length - 1] || {};
  }

  return parsed;
}

async function sendMcpJsonRpc(
  url: URL,
  config: ExternalMcpConnectionConfig,
  payload: Record<string, unknown>,
  sessionId?: string | null
): Promise<{ frame: JsonRpcResponseFrame; sessionId: string | null }> {
  const timeoutMs = Math.max(2000, Math.min(30_000, config.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: buildExternalMcpHeaders(config, sessionId),
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error("Redirecionamentos HTTP são bloqueados na conexão MCP externa por segurança SSRF.");
    }

    const nextSessionId = response.headers.get("mcp-session-id") || sessionId || null;
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`Servidor MCP retornou HTTP ${response.status}: ${rawText.slice(0, 200)}`);
    }

    const contentType = response.headers.get("content-type") || "application/json";
    const expectedId = payload.id as string | number | undefined;
    const frame = parseMcpJsonRpcPayload(contentType, rawText, expectedId);

    if (frame.error) {
      throw new Error(frame.error.message || `Erro JSON-RPC MCP (${frame.error.code ?? "desconhecido"})`);
    }

    return { frame, sessionId: nextSessionId };
  } finally {
    clearTimeout(timer);
  }
}

async function negotiateSessionIfSupported(
  url: URL,
  config: ExternalMcpConnectionConfig
): Promise<string | null> {
  let sessionId: string | null = null;
  try {
    const initRes = await sendMcpJsonRpc(url, config, {
      jsonrpc: "2.0",
      id: "init-1",
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "waesy-copilot", version: "1.0.0" },
      },
    });
    sessionId = initRes.sessionId;

    // Envia notificação best-effort conforme especificação MCP
    await fetch(url.toString(), {
      method: "POST",
      headers: buildExternalMcpHeaders(config, sessionId),
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      redirect: "manual",
    }).catch(() => null);
  } catch {
    // Alguns endpoints stateless respondem diretamente a tools/list e tools/call
  }
  return sessionId;
}

/**
 * Executa handshake e `tools/list` paginado em um servidor MCP externo.
 */
export async function discoverExternalMcpTools(
  config: ExternalMcpConnectionConfig
): Promise<ExternalMcpToolDescriptor[]> {
  const url = assertSafeExternalMcpUrl(config.endpointUrl);
  await assertDnsResolvesPublicly(url.hostname);

  const sessionId = await negotiateSessionIfSupported(url, config);
  const discovered: ExternalMcpToolDescriptor[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_DISCOVERY_PAGES; page++) {
    const rpcId = `tools-list-${page + 1}`;
    const { frame } = await sendMcpJsonRpc(
      url,
      config,
      {
        jsonrpc: "2.0",
        id: rpcId,
        method: "tools/list",
        params: cursor ? { cursor } : {},
      },
      sessionId
    );

    const toolsRaw = Array.isArray(frame.result?.tools) ? frame.result.tools : [];
    for (const item of toolsRaw) {
      if (!item || typeof item.name !== "string") continue;
      discovered.push({
        name: item.name.trim(),
        description: String(item.description || `Ferramenta MCP externa: ${item.name}`).slice(0, 400),
        inputSchema:
          item.inputSchema && typeof item.inputSchema === "object"
            ? item.inputSchema
            : { type: "object", properties: {} },
      });
      if (discovered.length >= MAX_DISCOVERED_TOOLS) break;
    }

    cursor = typeof frame.result?.nextCursor === "string" ? frame.result.nextCursor : undefined;
    if (!cursor || discovered.length >= MAX_DISCOVERED_TOOLS) break;
  }

  return discovered;
}

/**
 * Invoca uma ferramenta em servidor MCP externo via `tools/call`.
 */
export async function invokeExternalMcpTool(
  config: ExternalMcpConnectionConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<{
  status: "success" | "error";
  textSummary: string;
  rawResult: any;
}> {
  const url = assertSafeExternalMcpUrl(config.endpointUrl);
  await assertDnsResolvesPublicly(url.hostname);

  const sessionId = await negotiateSessionIfSupported(url, config);
  const { frame } = await sendMcpJsonRpc(
    url,
    config,
    {
      jsonrpc: "2.0",
      id: `call-${Date.now()}`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args || {},
      },
    },
    sessionId
  );

  const result = frame.result || {};
  const contentBlocks = Array.isArray(result.content) ? result.content : [];
  const textParts = contentBlocks
    .map((block: any) => {
      if (block?.type === "text" && typeof block.text === "string") return block.text;
      if (block?.data !== undefined) return JSON.stringify(block.data);
      return JSON.stringify(block);
    })
    .filter(Boolean);

  const textSummary =
    textParts.join("\n").trim() ||
    (result.structuredContent ? JSON.stringify(result.structuredContent) : JSON.stringify(result));

  return {
    status: result.isError ? "error" : "success",
    textSummary: textSummary.slice(0, 12_000),
    rawResult: result,
  };
}
