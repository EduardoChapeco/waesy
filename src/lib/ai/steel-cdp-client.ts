import { isPublicHttpUrl } from "@/lib/mining/contact-extractor";

export interface BrowserInteractiveStep {
  type: "navigate" | "click" | "type" | "scroll" | "wait" | "extract" | "screenshot";
  url?: string;
  selector?: string;
  text?: string;
  submit?: boolean;
  direction?: "down" | "up" | "top" | "bottom";
  ms?: number;
}

export interface SteelCdpExecutionInput {
  apiKey: string;
  startUrl: string;
  steps?: BrowserInteractiveStep[];
  captureScreenshot?: boolean;
  keepSessionAlive?: boolean;
  existingSessionId?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SteelCdpPageSnapshot {
  url: string;
  title: string;
  text: string;
  links: string[];
  interactiveElements: Array<{ tag: string; selector: string; label: string }>;
  screenshotBase64?: string;
}

export interface SteelCdpExecutionResult {
  sessionId: string;
  liveViewerUrl?: string;
  snapshot: SteelCdpPageSnapshot;
  stepsExecuted: Array<{ action: string; detail: string; outcome: "ok" | "error" | "blocked" }>;
}

interface CdpPendingRequest {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

function resolveWebSocketHttpUrl(wsUrl: string): string {
  if (wsUrl.startsWith("wss://")) return `https://${wsUrl.slice(6)}`;
  if (wsUrl.startsWith("ws://")) return `http://${wsUrl.slice(5)}`;
  return wsUrl;
}

async function openEdgeCompatibleWebSocket(wsUrl: string): Promise<WebSocket> {
  // Cloudflare Workers exige fetch com Upgrade: websocket para conexões de saída;
  // Node / Deno / Browser utilizam new WebSocket(wsUrl).
  if (typeof globalThis.WebSocket === "function") {
    try {
      const ws = new WebSocket(wsUrl);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout na conexão CDP WebSocket")), 8000);
        const cleanup = () => clearTimeout(timer);
        ws.addEventListener("open", () => {
          cleanup();
          resolve();
        });
        ws.addEventListener("error", () => {
          cleanup();
          reject(new Error("Falha ao abrir WebSocket CDP direto"));
        });
      });
      return ws;
    } catch {
      // Fallback abaixo para Cloudflare Workers `Upgrade: websocket`
    }
  }

  const upgradeRes = await fetch(resolveWebSocketHttpUrl(wsUrl), {
    headers: { Upgrade: "websocket" },
  });
  const cfSocket = (upgradeRes as unknown as { webSocket?: WebSocket & { accept?: () => void } }).webSocket;
  if (!cfSocket) {
    throw new Error("Ambiente atual não suportou handshake WebSocket CDP.");
  }
  cfSocket.accept?.();
  return cfSocket;
}

class LightweightCdpSession {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, CdpPendingRequest>();
  private cdpSessionId: string | undefined;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener("message", (event: MessageEvent) => {
      try {
        const raw = typeof event.data === "string" ? event.data : String(event.data || "");
        const msg = JSON.parse(raw) as { id?: number; result?: any; error?: { message?: string } };
        if (typeof msg.id === "number") {
          const entry = this.pending.get(msg.id);
          if (entry) {
            clearTimeout(entry.timer);
            this.pending.delete(msg.id);
            if (msg.error) {
              entry.reject(new Error(msg.error.message || "Erro CDP"));
            } else {
              entry.resolve(msg.result);
            }
          }
        }
      } catch {
        /* ignora eventos CDP assíncronos fora de id */
      }
    });
    this.ws.addEventListener("close", () => {
      for (const [, req] of this.pending) {
        clearTimeout(req.timer);
        req.reject(new Error("Sessão CDP encerrada."));
      }
      this.pending.clear();
    });
  }

  public send(method: string, params: Record<string, any> = {}, useAttachedSession = true): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout no comando CDP ${method}`));
      }, 9000);
      this.pending.set(id, { resolve, reject, timer });
      const payload: Record<string, any> = { id, method, params };
      if (useAttachedSession && this.cdpSessionId) {
        payload.sessionId = this.cdpSessionId;
      }
      this.ws.send(JSON.stringify(payload));
    });
  }

  public async attachFirstPageTarget(): Promise<void> {
    const targetsRes = await this.send("Target.getTargets", {}, false);
    const targetInfos = Array.isArray(targetsRes?.targetInfos) ? targetsRes.targetInfos : [];
    const pageTarget =
      targetInfos.find((t: any) => t.type === "page") || targetInfos[0];
    if (!pageTarget?.targetId) {
      throw new Error("Nenhum target 'page' disponível na sessão Steel.");
    }
    const attached = await this.send(
      "Target.attachToTarget",
      { targetId: pageTarget.targetId, flatten: true },
      false,
    );
    this.cdpSessionId = attached?.sessionId;
    await this.send("Page.enable", {});
    await this.send("Runtime.enable", {});
  }

  public async evaluate<T = any>(expression: string): Promise<T> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res?.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.text ||
          res.exceptionDetails.exception?.description ||
          "Erro ao avaliar expressão DOM",
      );
    }
    return res?.result?.value as T;
  }

  public close(): void {
    try {
      this.ws.close();
    } catch {
      /* noop */
    }
  }
}

async function capturePageSnapshot(
  cdp: LightweightCdpSession,
  captureScreenshot: boolean,
): Promise<SteelCdpPageSnapshot> {
  const dom = await cdp.evaluate<{
    url: string;
    title: string;
    text: string;
    links: string[];
    interactiveElements: Array<{ tag: string; selector: string; label: string }>;
  }>(`(() => {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .filter(h => /^https?:\\/\\//i.test(h))
      .slice(0, 25);
    const interactive = [];
    const candidates = document.querySelectorAll('button, a[href], input, textarea, select');
    let count = 0;
    for (const el of candidates) {
      if (count >= 20) break;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) continue;
      const idSel = el.id ? '#' + CSS.escape(el.id) : '';
      const nameSel = el.getAttribute('name') ? el.tagName.toLowerCase() + '[name="' + el.getAttribute('name').replace(/"/g, '\\"') + '"]' : '';
      const selector = idSel || nameSel || (el.tagName.toLowerCase() + ':nth-of-type(' + (Array.from(el.parentNode ? el.parentNode.children : [el]).filter(c => c.tagName === el.tagName).indexOf(el) + 1) + ')');
      const label = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('value') || '').trim().slice(0, 60);
      interactive.push({ tag: el.tagName.toLowerCase(), selector, label });
      count++;
    }
    return {
      url: location.href,
      title: document.title || location.href,
      text: (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').trim().slice(0, 6000),
      links,
      interactiveElements: interactive,
    };
  })()`);

  let screenshotBase64: string | undefined;
  if (captureScreenshot) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" }).catch(() => null);
    if (typeof shot?.data === "string" && shot.data.length >= 32) {
      screenshotBase64 = shot.data;
    }
  }

  return {
    url: dom?.url || "",
    title: dom?.title || "",
    text: dom?.text || "",
    links: Array.isArray(dom?.links) ? dom.links : [],
    interactiveElements: Array.isArray(dom?.interactiveElements) ? dom.interactiveElements : [],
    screenshotBase64,
  };
}

/**
 * Executa automacao interativa real (navigate/click/type/scroll/extract/screenshot)
 * em uma sessao Steel Cloud Browser via Chrome DevTools Protocol (WebSocket).
 */
export async function executeSteelCdpSession(
  input: SteelCdpExecutionInput,
): Promise<SteelCdpExecutionResult> {
  if (!isPublicHttpUrl(input.startUrl)) {
    throw new Error("URL bloqueada pela proteção SSRF antes da sessão Steel.");
  }

  const headers = {
    "Content-Type": "application/json",
    "Steel-Api-Key": input.apiKey,
  };

  let sessionId = input.existingSessionId || "";
  let websocketUrl = "";
  let liveViewerUrl: string | undefined;

  if (sessionId) {
    const getRes = await fetch(`https://api.steel.dev/v1/sessions/${encodeURIComponent(sessionId)}`, {
      headers,
      signal: input.signal,
    });
    if (getRes.ok) {
      const existing = (await getRes.json().catch(() => null)) as Record<string, any> | null;
      if (existing?.id && existing?.websocketUrl) {
        websocketUrl = String(existing.websocketUrl);
        liveViewerUrl = existing.sessionViewerUrl ? String(existing.sessionViewerUrl) : undefined;
      } else {
        sessionId = "";
      }
    } else {
      sessionId = "";
    }
  }

  if (!sessionId) {
    const createRes = await fetch("https://api.steel.dev/v1/sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        blockAds: true,
        dimensions: { width: 1280, height: 800 },
        sessionTimeout: Math.min(Math.max((input.timeoutMs || 25000) * 4, 60000), 300000),
      }),
      signal: input.signal,
    });
    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      throw new Error(`Steel Session HTTP ${createRes.status}: ${errText.slice(0, 160)}`);
    }
    const session = (await createRes.json()) as Record<string, any>;
    sessionId = String(session.id || "");
    websocketUrl = String(session.websocketUrl || "");
    liveViewerUrl = session.sessionViewerUrl ? String(session.sessionViewerUrl) : undefined;
  }

  if (!sessionId || !websocketUrl) {
    throw new Error("Steel Session criada sem websocketUrl CDP válido.");
  }

  const wsTarget = websocketUrl.includes("apiKey=")
    ? websocketUrl
    : `${websocketUrl}${websocketUrl.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(input.apiKey)}`;

  const ws = await openEdgeCompatibleWebSocket(wsTarget);
  const cdp = new LightweightCdpSession(ws);
  const stepsExecuted: SteelCdpExecutionResult["stepsExecuted"] = [];

  try {
    await cdp.attachFirstPageTarget();

    // Navegacao inicial segura
    await cdp.send("Page.navigate", { url: input.startUrl });
    await new Promise((r) => setTimeout(r, 1400));
    stepsExecuted.push({
      action: `navigate:${input.startUrl}`,
      detail: "Página inicial carregada na sessão Steel CDP",
      outcome: "ok",
    });

    for (const step of (input.steps || []).slice(0, 8)) {
      if (input.signal?.aborted) break;

      if (step.type === "navigate" && step.url) {
        if (!isPublicHttpUrl(step.url)) {
          stepsExecuted.push({
            action: `navigate:${step.url}`,
            detail: "Navegação bloqueada pela política SSRF",
            outcome: "blocked",
          });
          continue;
        }
        await cdp.send("Page.navigate", { url: step.url });
        await new Promise((r) => setTimeout(r, 1200));
        stepsExecuted.push({
          action: `navigate:${step.url}`,
          detail: "Navegou para URL solicitada",
          outcome: "ok",
        });
      } else if (step.type === "click" && step.selector) {
        const clicked = await cdp.evaluate<{ ok: boolean; reason?: string }>(`(() => {
          const sel = ${JSON.stringify(step.selector)};
          let el = null;
          try { el = document.querySelector(sel); } catch {}
          if (!el) {
            const norm = sel.toLowerCase();
            el = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"]'))
              .find(node => (node.innerText || node.getAttribute('aria-label') || '').toLowerCase().includes(norm)) || null;
          }
          if (!el) return { ok: false, reason: 'Elemento não encontrado' };
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          const rect = el.getBoundingClientRect();
          el.click();
          return { ok: true, x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
        })()`);
        await new Promise((r) => setTimeout(r, 700));
        stepsExecuted.push({
          action: `click:${step.selector}`,
          detail: clicked?.ok ? "Clique executado com sucesso" : (clicked?.reason || "Elemento ausente"),
          outcome: clicked?.ok ? "ok" : "error",
        });
      } else if (step.type === "type" && step.selector && step.text !== undefined) {
        const focused = await cdp.evaluate<{ ok: boolean; reason?: string }>(`(() => {
          const sel = ${JSON.stringify(step.selector)};
          let el = null;
          try { el = document.querySelector(sel); } catch {}
          if (!el) {
            const norm = sel.toLowerCase();
            el = Array.from(document.querySelectorAll('input, textarea'))
              .find(node => ((node.getAttribute('placeholder') || '') + ' ' + (node.getAttribute('name') || '') + ' ' + (node.getAttribute('aria-label') || '')).toLowerCase().includes(norm)) || null;
          }
          if (!el) return { ok: false, reason: 'Campo de entrada não encontrado' };
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.focus();
          if ('value' in el) el.value = '';
          return { ok: true };
        })()`);
        if (focused?.ok) {
          await cdp.send("Input.insertText", { text: step.text });
          if (step.submit) {
            await cdp.send("Input.dispatchKeyEvent", {
              type: "rawKeyDown",
              key: "Enter",
              code: "Enter",
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13,
            });
            await cdp.send("Input.dispatchKeyEvent", {
              type: "keyUp",
              key: "Enter",
              code: "Enter",
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13,
            });
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
        stepsExecuted.push({
          action: `type:${step.selector}`,
          detail: focused?.ok ? "Texto inserido no campo" : (focused?.reason || "Campo não encontrado"),
          outcome: focused?.ok ? "ok" : "error",
        });
      } else if (step.type === "scroll") {
        const dir = step.direction || "down";
        await cdp.evaluate(`(() => {
          if (${JSON.stringify(dir)} === 'top') window.scrollTo(0, 0);
          else if (${JSON.stringify(dir)} === 'bottom') window.scrollTo(0, document.body.scrollHeight);
          else if (${JSON.stringify(dir)} === 'up') window.scrollBy(0, -Math.round(window.innerHeight * 0.8));
          else window.scrollBy(0, Math.round(window.innerHeight * 0.8));
        })()`);
        await new Promise((r) => setTimeout(r, 350));
        stepsExecuted.push({
          action: `scroll:${dir}`,
          detail: `Rolagem ${dir} executada`,
          outcome: "ok",
        });
      } else if (step.type === "wait") {
        const ms = Math.min(Math.max(step.ms || 1000, 100), 4000);
        await new Promise((r) => setTimeout(r, ms));
        stepsExecuted.push({
          action: `wait:${ms}ms`,
          detail: `Aguardou ${ms}ms`,
          outcome: "ok",
        });
      }
    }

    const snapshot = await capturePageSnapshot(cdp, input.captureScreenshot !== false);
    return {
      sessionId,
      liveViewerUrl,
      snapshot,
      stepsExecuted,
    };
  } finally {
    cdp.close();
    if (!input.keepSessionAlive && sessionId) {
      await fetch(`https://api.steel.dev/v1/sessions/${encodeURIComponent(sessionId)}/release`, {
        method: "POST",
        headers,
      }).catch(() => {});
    }
  }
}
