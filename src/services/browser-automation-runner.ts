import { assertSafeUrl } from "./onboarding-pipeline.server";
import { getActiveSecretForProvider } from "./secret-vault.functions";
import {
  getBatchActiveKeysForProviders,
  markKeyError,
  recordKeyUsage,
} from "./api-orchestrator.functions";
import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { isHostAllowed, type AgentAction } from "@/lib/web-agent/agent-core";
import {
  executeSteelCdpSession,
  type BrowserInteractiveStep,
} from "@/lib/ai/steel-cdp-client";

export type BrowserRunnerDriver =
  | "vps_playwright_cdp"
  | "steel_cdp_session"
  | "steel_cloud"
  | "firecrawl_fallback";

export interface BrowserFrameEvent {
  url: string;
  title?: string;
  screenshotUrl?: string | null;
  liveViewerUrl?: string;
  sessionId?: string;
  driver: BrowserRunnerDriver;
  stepLabel?: string;
}

export interface BrowserAutomationTaskInput {
  url: string;
  goal: string;
  storeId?: string;
  userId?: string;
  allowedHosts?: string[];
  actions?: AgentAction[];
  interactiveSteps?: BrowserInteractiveStep[];
  existingSessionId?: string;
  keepSessionAlive?: boolean;
  useInteractiveCdp?: boolean;
  captureScreenshot?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  onFrame?: (frame: BrowserFrameEvent) => Promise<void> | void;
}

export interface BrowserAutomationTaskResult {
  status: "completed" | "failed" | "aborted";
  driver: BrowserRunnerDriver;
  requestedUrl: string;
  finalUrl: string;
  title: string;
  textExcerpt: string;
  links: string[];
  interactiveElements?: Array<{ tag: string; selector: string; label: string }>;
  sessionId?: string;
  liveViewerUrl?: string;
  screenshotUrl: string | null;
  stepsExecuted: Array<{
    action: string;
    detail: string;
    outcome: "ok" | "blocked" | "error";
  }>;
  error?: string;
}

async function uploadBrowserScreenshotBuffer(
  base64OrDataUrl: string,
  tenantScope: string,
): Promise<string | null> {
  try {
    const cleaned = base64OrDataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim();
    if (!cleaned || cleaned.length < 32) return null;
    const buffer = Buffer.from(cleaned, "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > 8 * 1024 * 1024) return null;

    const db = getServerClient();
    const safeTenant = tenantScope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "public";
    const storagePath = `tenants/${safeTenant}/browser-shots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    for (const bucket of ["copilot-uploads", "store-assets"] as const) {
      const { error } = await db.storage.from(bucket).upload(storagePath, buffer, {
        contentType: "image/png",
        upsert: false,
      });
      if (!error) {
        const { data } = db.storage.from(bucket).getPublicUrl(storagePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function runViaVpsPlaywrightEndpoint(
  safeUrl: string,
  input: BrowserAutomationTaskInput,
): Promise<BrowserAutomationTaskResult | null> {
  const endpoint =
    process.env.WAESY_BROWSER_RUNNER_URL?.trim() ||
    process.env.PLAYWRIGHT_CDP_HTTP_ENDPOINT?.trim() ||
    "";
  if (!endpoint) return null;

  const token = process.env.WAESY_BROWSER_RUNNER_TOKEN?.trim();
  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(input.timeoutMs || 22000, 3000), 45000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        url: safeUrl,
        goal: input.goal,
        actions: input.actions || [],
        captureScreenshot: input.captureScreenshot !== false,
        viewport: { width: 1280, height: 800 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json().catch(() => null)) as Record<string, any> | null;
    if (!payload) return null;

    const finalUrl = String(payload.finalUrl || payload.url || safeUrl);
    if (input.allowedHosts?.length && !isHostAllowed(finalUrl, safeUrl, input.allowedHosts)) {
      return {
        status: "failed",
        driver: "vps_playwright_cdp",
        requestedUrl: safeUrl,
        finalUrl,
        title: "Navegação bloqueada por política",
        textExcerpt: "",
        links: [],
        screenshotUrl: null,
        stepsExecuted: [
          {
            action: `navigate:${safeUrl}`,
            detail: `Redirecionamento para host não permitido (${finalUrl}) bloqueado`,
            outcome: "blocked",
          },
        ],
        error: "Host de destino bloqueado pela política de allowlist.",
      };
    }

    let screenshotUrl: string | null =
      typeof payload.screenshotUrl === "string" && payload.screenshotUrl.startsWith("http")
        ? payload.screenshotUrl
        : null;
    if (!screenshotUrl && typeof payload.screenshotBase64 === "string") {
      screenshotUrl = await uploadBrowserScreenshotBuffer(
        payload.screenshotBase64,
        input.storeId || input.userId || "copilot",
      );
    }

    await input.onFrame?.({
      url: finalUrl,
      title: String(payload.title || ""),
      screenshotUrl,
      driver: "vps_playwright_cdp",
      stepLabel: "Navegador VPS Playwright ao vivo",
    });

    return {
      status: "completed",
      driver: "vps_playwright_cdp",
      requestedUrl: safeUrl,
      finalUrl,
      title: String(payload.title || finalUrl),
      textExcerpt: String(payload.text || payload.markdown || "").slice(0, 6000),
      links: Array.isArray(payload.links) ? payload.links.slice(0, 25).map(String) : [],
      screenshotUrl,
      stepsExecuted: [
        {
          action: `vps_playwright_cdp:${finalUrl}`,
          detail: `Página carregada via Playwright VPS (${String(payload.text || "").length} chars)`,
          outcome: "ok",
        },
      ],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}

function toInteractiveSteps(input: BrowserAutomationTaskInput): BrowserInteractiveStep[] {
  if (Array.isArray(input.interactiveSteps) && input.interactiveSteps.length > 0) {
    return input.interactiveSteps;
  }
  const steps: BrowserInteractiveStep[] = [];
  for (const a of input.actions || []) {
    if (a.type === "open") steps.push({ type: "navigate", url: a.url });
    else if (a.type === "click") steps.push({ type: "click", selector: a.selector });
    else if (a.type === "type") {
      steps.push({ type: "type", selector: a.selector, text: a.text, submit: a.submit });
    } else if (a.type === "scroll") {
      steps.push({ type: "scroll", direction: a.direction });
    } else if (a.type === "wait") {
      steps.push({ type: "wait", ms: a.ms });
    } else if (a.type === "screenshot") {
      steps.push({ type: "screenshot" });
    } else if (a.type === "extract") {
      steps.push({ type: "extract" });
    }
  }
  return steps;
}

async function runViaSteelCloud(
  safeUrl: string,
  input: BrowserAutomationTaskInput,
): Promise<BrowserAutomationTaskResult | null> {
  const ownerId = input.userId || input.storeId;
  const [vaultKey, poolMap] = await Promise.all([
    getActiveSecretForProvider("steel", input.userId, input.storeId).catch(() => null),
    getBatchActiveKeysForProviders(["steel"], ownerId, input.storeId).catch(
      () => ({} as Record<string, Array<{ id: string; rawKey: string }>>),
    ),
  ]);

  const candidates: Array<{ rawKey: string; poolKeyId?: string }> = [];
  const seen = new Set<string>();
  const addKey = (rawKey?: string | null, poolKeyId?: string) => {
    const k = typeof rawKey === "string" ? rawKey.trim() : "";
    if (!k || seen.has(k)) return;
    seen.add(k);
    candidates.push({ rawKey: k, poolKeyId });
  };
  addKey(vaultKey);
  for (const k of poolMap?.steel || []) {
    addKey(k?.rawKey, k?.id);
  }
  addKey(process.env.STEEL_API_KEY);

  if (candidates.length === 0) return null;

  const interactiveSteps = toInteractiveSteps(input);
  const shouldTryCdp =
    input.useInteractiveCdp !== false &&
    (interactiveSteps.length > 0 || Boolean(input.existingSessionId) || Boolean(input.keepSessionAlive));

  if (shouldTryCdp) {
    for (const candidate of candidates) {
      try {
        const cdpRes = await executeSteelCdpSession({
          apiKey: candidate.rawKey,
          startUrl: safeUrl,
          steps: interactiveSteps,
          captureScreenshot: input.captureScreenshot !== false,
          keepSessionAlive: input.keepSessionAlive,
          existingSessionId: input.existingSessionId,
          timeoutMs: input.timeoutMs,
          signal: input.signal,
        });
        if (candidate.poolKeyId) {
          recordKeyUsage(candidate.poolKeyId).catch(() => {});
        }
        const finalUrl = cdpRes.snapshot.url || safeUrl;
        if (input.allowedHosts?.length && !isHostAllowed(finalUrl, safeUrl, input.allowedHosts)) {
          return {
            status: "failed",
            driver: "steel_cdp_session",
            requestedUrl: safeUrl,
            finalUrl,
            title: "Navegação bloqueada por política",
            textExcerpt: "",
            links: [],
            screenshotUrl: null,
            sessionId: cdpRes.sessionId,
            liveViewerUrl: cdpRes.liveViewerUrl,
            stepsExecuted: [
              {
                action: `steel_cdp:${finalUrl}`,
                detail: "Redirecionamento fora dos hosts permitidos",
                outcome: "blocked",
              },
            ],
            error: "Host de destino bloqueado pela política de allowlist.",
          };
        }
        const screenshotUrl = cdpRes.snapshot.screenshotBase64
          ? await uploadBrowserScreenshotBuffer(
              cdpRes.snapshot.screenshotBase64,
              input.storeId || input.userId || "copilot",
            )
          : null;

        await input.onFrame?.({
          url: finalUrl,
          title: cdpRes.snapshot.title,
          screenshotUrl,
          liveViewerUrl: cdpRes.liveViewerUrl,
          sessionId: cdpRes.sessionId,
          driver: "steel_cdp_session",
          stepLabel: "Sessão interativa Steel CDP em execução",
        });

        return {
          status: "completed",
          driver: "steel_cdp_session",
          requestedUrl: safeUrl,
          finalUrl,
          title: cdpRes.snapshot.title || finalUrl,
          textExcerpt: cdpRes.snapshot.text.slice(0, 6000),
          links: cdpRes.snapshot.links.slice(0, 25),
          interactiveElements: cdpRes.snapshot.interactiveElements,
          sessionId: cdpRes.sessionId,
          liveViewerUrl: cdpRes.liveViewerUrl,
          screenshotUrl,
          stepsExecuted: cdpRes.stepsExecuted,
        };
      } catch {
        // Degrada silenciosamente para Steel /v1/scrape abaixo caso WebSocket CDP não esteja disponível
      }
    }
  }

  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(input.timeoutMs || 22000, 3000), 45000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    let body: Record<string, any> | null = null;
    for (const candidate of candidates) {
      const scrapeRes = await fetch("https://api.steel.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Steel-Api-Key": candidate.rawKey,
        },
        body: JSON.stringify({
          url: safeUrl,
          format: ["markdown", "readability"],
          screenshot: input.captureScreenshot !== false,
          delay: 1200,
        }),
        signal: controller.signal,
      });

      if (!scrapeRes.ok) {
        if (candidate.poolKeyId) {
          await markKeyError(
            candidate.poolKeyId,
            `Steel HTTP ${scrapeRes.status}`,
            scrapeRes.status,
          ).catch(() => {});
        }
        continue;
      }

      const parsed = (await scrapeRes.json().catch(() => null)) as Record<string, any> | null;
      if (parsed) {
        if (candidate.poolKeyId) {
          recordKeyUsage(candidate.poolKeyId).catch(() => {});
        }
        body = parsed;
        break;
      }
    }

    if (!body) return null;

    const finalUrl = String(body.metadata?.urlSource || body.url || safeUrl);
    const title = String(body.metadata?.title || body.title || finalUrl);
    const markdown = String(body.content?.markdown || body.markdown || body.content?.readability || "");
    const rawLinks: string[] = Array.isArray(body.links)
      ? body.links.map((l: any) => (typeof l === "string" ? l : String(l?.url || ""))).filter(Boolean)
      : [];

    let screenshotUrl: string | null =
      typeof body.screenshot?.url === "string"
        ? body.screenshot.url
        : typeof body.screenshotUrl === "string"
          ? body.screenshotUrl
          : null;

    if (!screenshotUrl && typeof body.screenshot === "string" && body.screenshot.length > 64) {
      if (body.screenshot.startsWith("http")) {
        screenshotUrl = body.screenshot;
      } else {
        screenshotUrl = await uploadBrowserScreenshotBuffer(
          body.screenshot,
          input.storeId || input.userId || "copilot",
        );
      }
    }

    await input.onFrame?.({
      url: finalUrl,
      title,
      screenshotUrl,
      driver: "steel_cloud",
      stepLabel: "Steel Cloud Browser em execução",
    });

    return {
      status: "completed",
      driver: "steel_cloud",
      requestedUrl: safeUrl,
      finalUrl,
      title,
      textExcerpt: markdown.slice(0, 6000),
      links: rawLinks.slice(0, 25),
      screenshotUrl,
      stepsExecuted: [
        {
          action: `steel_cloud:${finalUrl}`,
          detail: `Sessão Steel Cloud concluída (${markdown.length} chars)`,
          outcome: "ok",
        },
      ],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}

export async function executeBrowserAutomationTask(
  input: BrowserAutomationTaskInput,
): Promise<BrowserAutomationTaskResult> {
  if (input.signal?.aborted) {
    return {
      status: "aborted",
      driver: "firecrawl_fallback",
      requestedUrl: input.url,
      finalUrl: input.url,
      title: "Execução cancelada",
      textExcerpt: "",
      links: [],
      screenshotUrl: null,
      stepsExecuted: [{ action: "abort", detail: "Cancelado pelo usuário", outcome: "blocked" }],
      error: "Execução cancelada antes de navegar.",
    };
  }

  let validatedUrl: URL;
  try {
    validatedUrl = assertSafeUrl(input.url);
  } catch (err: any) {
    return {
      status: "failed",
      driver: "firecrawl_fallback",
      requestedUrl: input.url,
      finalUrl: input.url,
      title: "URL bloqueada",
      textExcerpt: "",
      links: [],
      screenshotUrl: null,
      stepsExecuted: [
        {
          action: `ssrf_guard:${input.url}`,
          detail: err?.message || "URL bloqueada pelo escudo SSRF",
          outcome: "blocked",
        },
      ],
      error: err?.message || "URL bloqueada pela proteção SSRF.",
    };
  }

  const safeUrl = validatedUrl.toString();
  if (input.allowedHosts?.length && !isHostAllowed(safeUrl, safeUrl, input.allowedHosts)) {
    return {
      status: "failed",
      driver: "firecrawl_fallback",
      requestedUrl: safeUrl,
      finalUrl: safeUrl,
      title: "Host não autorizado",
      textExcerpt: "",
      links: [],
      screenshotUrl: null,
      stepsExecuted: [
        {
          action: `allowlist:${safeUrl}`,
          detail: "Domínio fora da lista de hosts permitidos",
          outcome: "blocked",
        },
      ],
      error: "Domínio fora da lista de hosts permitidos.",
    };
  }

  const vpsRes = await runViaVpsPlaywrightEndpoint(safeUrl, input);
  if (vpsRes) return vpsRes;

  const steelRes = await runViaSteelCloud(safeUrl, input);
  if (steelRes) return steelRes;

  const fallbackScrape = await scrapeUrl(safeUrl, {
    formats: ["markdown", "html", "links"],
    timeout: Math.min(Math.max(input.timeoutMs || 18000, 4000), 35000),
  });

  if (!fallbackScrape.success) {
    return {
      status: "failed",
      driver: "firecrawl_fallback",
      requestedUrl: safeUrl,
      finalUrl: safeUrl,
      title: "Falha ao carregar página",
      textExcerpt: "",
      links: [],
      screenshotUrl: null,
      stepsExecuted: [
        {
          action: `firecrawl:${safeUrl}`,
          detail: fallbackScrape.error || "Não foi possível obter o conteúdo da URL",
          outcome: "error",
        },
      ],
      error: fallbackScrape.error || "Falha ao carregar página alvo.",
    };
  }

  const title = String(fallbackScrape.metadata?.title || safeUrl);
  const textExcerpt = String(fallbackScrape.markdown || "").slice(0, 6000);
  const links = Array.isArray(fallbackScrape.links) ? fallbackScrape.links.slice(0, 25) : [];

  await input.onFrame?.({
    url: safeUrl,
    title,
    screenshotUrl: null,
    driver: "firecrawl_fallback",
    stepLabel: "Leitura web via Firecrawl/HTTP concluída",
  });

  return {
    status: "completed",
    driver: "firecrawl_fallback",
    requestedUrl: safeUrl,
    finalUrl: safeUrl,
    title,
    textExcerpt,
    links,
    screenshotUrl: null,
    stepsExecuted: [
      {
        action: `firecrawl:${safeUrl}`,
        detail: `Conteúdo extraído via ${fallbackScrape.provider || "http"} (${textExcerpt.length} chars)`,
        outcome: "ok",
      },
    ],
  };
}
