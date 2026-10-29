/**
 * security-sentinel.ts — Motor de Telemetria Anti-Invasão (Client-Side)
 *
 * Detecta ferramentas de inspeção (DevTools, Burp Suite, automação) e envia
 * beacons de telemetria ao servidor. NÃO bloqueia o usuário — apenas registra.
 *
 * Todas as funções são não-bloqueantes e não afetam a performance da UX.
 * O fingerprint gerado é usado APENAS para telemetria, nunca para autenticação.
 *
 * CLIENTE APENAS — não importar em server functions.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DeviceFingerprint {
 fp: string; // SHA-256 hex (64 chars)
 canvas: string; // Canvas fingerprint parcial
 platform: string; // navigator.platform
 language: string; // navigator.language
 timezone: string; // Intl timezone
 screen: string; // resolução + profundidade de cor
 cores: number; // navigator.hardwareConcurrency
 touch: boolean; // suporte a toque
 webgl: string; // WebGL renderer string parcial
}

export type SecurityEventType =
 | 'devtools_opened'
 | 'devtools_closed'
 | 'burp_suite_detected'
 | 'suspicious_headers'
 | 'automation_detected'
 | 'rapid_requests'
 | 'uuid_enumeration'
 | 'replay_attempt';

// ─── Geração de Device Fingerprint ───────────────────────────────────────────

/**
 * Gera um fingerprint único do dispositivo usando múltiplas fontes de entropia.
 * Não usa cookies nem localStorage. Puramente calculado a partir do hardware/software.
 * NÃO É USADO PARA AUTENTICAÇÃO. Apenas telemetria forense.
 */
async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
 const nav = window.navigator;
 const scr = window.screen;

 // 1. Canvas fingerprint (diferente por GPU + driver)
 let canvasHash = 'no_canvas';
 try {
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.textBaseline = 'alphabetic';
 ctx.fillStyle = '#f60';
 ctx.fillRect(125, 1, 62, 20);
 ctx.fillStyle = '#069';
 ctx.font = '11pt no-real-font-xyz';
 ctx.fillText('Waesy  Sentinel v1', 2, 15);
 ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
 ctx.fillText('Waesy  Sentinel v1', 4, 17);
 const raw = canvas.toDataURL();
 canvasHash = raw.substring(raw.length - 32); // Últimos 32 chars são únicos
 }
 } catch {
 canvasHash = 'canvas_blocked';
 }

 // 2. WebGL renderer string (identifica GPU)
 let webglRenderer = 'no_webgl';
 try {
 const glCanvas = document.createElement('canvas');
 const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
 if (gl) {
 const ext = gl.getExtension('WEBGL_debug_renderer_info');
 if (ext) {
 const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
 webglRenderer = renderer.substring(0, 40); // Truncar para privacidade parcial
 }
 }
 } catch {
 webglRenderer = 'webgl_blocked';
 }

 // 3. Montar string de material único
 const material = [
 canvasHash,
 nav.platform || 'unknown',
 nav.language || 'unknown',
 Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
 `${scr.width}x${scr.height}x${scr.colorDepth}`,
 String(nav.hardwareConcurrency || 0),
 String('ontouchstart' in window),
 webglRenderer,
 nav.userAgent.substring(0, 60), // Parte do UA
 ].join('|');

 // 4. SHA-256 via Web Crypto API
 let fpHex = 'no_crypto';
 try {
 const msgBuffer = new TextEncoder().encode(material);
 const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
 const hashArray = Array.from(new Uint8Array(hashBuffer));
 fpHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
 } catch {
 // Fallback simples se Web Crypto não disponível
 let hash = 0;
 for (let i = 0; i < material.length; i++) {
 const char = material.charCodeAt(i);
 hash = ((hash << 5) - hash) + char;
 hash = hash & hash;
 }
 fpHex = Math.abs(hash).toString(16).padStart(64, '0');
 }

 return {
 fp: fpHex,
 canvas: canvasHash,
 platform: nav.platform || 'unknown',
 language: nav.language || 'unknown',
 timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
 screen: `${scr.width}x${scr.height}x${scr.colorDepth}`,
 cores: nav.hardwareConcurrency || 0,
 touch: 'ontouchstart' in window,
 webgl: webglRenderer,
 };
}

// Cache do fingerprint para não recalcular em cada checkout
let _cachedFingerprint: DeviceFingerprint | null = null;

export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
 if (_cachedFingerprint) return _cachedFingerprint;
 _cachedFingerprint = await generateDeviceFingerprint();
 return _cachedFingerprint;
}

// ─── Detecção de DevTools ─────────────────────────────────────────────────────

// Técnica 1: Diferença entre dimensões outer e inner da janela
function detectByWindowSize(): boolean {
 const threshold = 160;
 return (
 window.outerWidth - window.innerWidth > threshold ||
 window.outerHeight - window.innerHeight > threshold
 );
}

// Técnica 2: Timing de debugger (DevTools abre uma pausa perceptível)
function detectByDebuggerTiming(): boolean {
 const start = performance.now();
 // eslint-disable-next-line no-debugger
 debugger;
 const elapsed = performance.now() - start;
 return elapsed > 100; // > 100ms indica pause de debugger ativo
}

// Técnica 3: Firebug / extensões de dev antigas
function detectByFirebug(): boolean {
 return !!(
 (window as any).firebug?.version ||
 ((window as any).console && (window as any).console.firebug)
 );
}

// Técnica 4: Checar se console tem métodos de inspeção ativos
function detectByConsoleProbe(): boolean {
 let devtoolsOpen = false;
 const element = new Image();
 Object.defineProperty(element, 'id', {
 get() {
 devtoolsOpen = true;
 },
 });
 try {
 console.log('%c', element); // Aciona getter somente quando DevTools analisa
 console.clear();
 } catch {
 // Silencioso
 }
 return devtoolsOpen;
}

// Estado atual (evita spam de eventos)
let _devtoolsWasOpen = false;
let _sentinelActive = false;

// ─── Envio de Telemetria ──────────────────────────────────────────────────────

async function sendTelemetryBeacon(eventType: SecurityEventType, details: Record<string, unknown>) {
 try {
 const fp = await getDeviceFingerprint();
 const payload = JSON.stringify({
 eventType,
 fingerprint: fp.fp,
 details: {
 ...details,
 platform: fp.platform,
 timezone: fp.timezone,
 screen: fp.screen,
 timestamp: new Date().toISOString(),
 },
 });

 // Usar sendBeacon para não bloquear a navegação (fire and forget)
 if (navigator.sendBeacon) {
 navigator.sendBeacon('/api/security-telemetry', new Blob([payload], { type: 'application/json' }));
 } else {
 // Fallback assíncrono
 fetch('/api/security-telemetry', {
 method: 'POST',
 body: payload,
 headers: { 'Content-Type': 'application/json' },
 keepalive: true,
 }).catch(() => { /* silencioso */ });
 }
 } catch {
 // Nunca propagar erros de telemetria — não deve afetar o usuário
 }
}

// ─── Monitor Principal ────────────────────────────────────────────────────────

/**
 * Inicia o sentinel de segurança. Deve ser chamado uma vez no app root.
 * Não bloqueia a UI, não causa re-renders, é totalmente passivo.
 */
export function initSecuritySentinel(): () => void {
 if (_sentinelActive || typeof window === 'undefined') return () => {};
 _sentinelActive = true;

 // Checar DevTools a cada 3 segundos (intervalo não agressivo)
 const interval = setInterval(async () => {
 const isOpen =
 detectByWindowSize() ||
 detectByFirebug() ||
 detectByConsoleProbe();

 if (isOpen && !_devtoolsWasOpen) {
 _devtoolsWasOpen = true;
 await sendTelemetryBeacon('devtools_opened', {
 windowDiff: window.outerWidth - window.innerWidth,
 url: window.location.pathname,
 });
 } else if (!isOpen && _devtoolsWasOpen) {
 _devtoolsWasOpen = false;
 // Não reportamos "fechamento" para evitar false positives
 }
 }, 3000);

 // Detectar automação / headless browsers
 const checkAutomation = async () => {
 const isHeadless =
 navigator.webdriver === true ||
 !!(window as any).callPhantom ||
 !!(window as any).__nightmare ||
 !!(window as any).domAutomation ||
 !!(window as any).__selenium_evaluate;

 if (isHeadless) {
 await sendTelemetryBeacon('automation_detected', {
 webdriver: navigator.webdriver,
 url: window.location.pathname,
 });
 }
 };
 checkAutomation();

 // Detectar timing attack de debugger na primeira verificação
 const checkDebugger = async () => {
 if (detectByDebuggerTiming()) {
 await sendTelemetryBeacon('devtools_opened', {
 method: 'debugger_timing',
 url: window.location.pathname,
 });
 }
 };
 // Checar apenas uma vez na inicialização
 setTimeout(checkDebugger, 1000);

 // Retorna função de cleanup
 return () => {
 clearInterval(interval);
 _sentinelActive = false;
 };
}

/**
 * Reporta evento de segurança manualmente (ex: detecção de req. rápidas no cliente)
 */
export async function reportSecurityEvent(eventType: SecurityEventType, details: Record<string, unknown>) {
 await sendTelemetryBeacon(eventType, details);
}

/**
 * Retorna o código único de compliance persistido para o dispositivo local.
 * Formato padrão: DEV-XXXX-XXXX-XXXX
 */
export function getPersistentDeviceCode(): string {
  if (typeof window === "undefined") return "DEV-9E3F-7A1B-4C2D";
  try {
    let id = localStorage.getItem("waesy_device_code");
    if (!id || id.length < 8) {
      const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const rand3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `DEV-${rand1}-${rand2}-${rand3}`;
      localStorage.setItem("waesy_device_code", id);
      document.cookie = `waesy_device_code=${id}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return id;
  } catch {
    return "DEV-9E3F-7A1B-4C2D";
  }
}

/**
 * Formata qualquer fingerprint ou hash em código canônico DEV-XXXX-XXXX-XXXX
 */
export function formatDeviceCode(fingerprint?: string | null): string {
  if (!fingerprint) return getPersistentDeviceCode();
  if (fingerprint.startsWith("DEV-")) return fingerprint;
  const clean = fingerprint.replace(/^fp_/, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const c1 = clean.slice(0, 4) || "WAES";
  const c2 = clean.slice(4, 8) || "8F92";
  const c3 = clean.slice(8, 12) || "4C1A";
  return `DEV-${c1}-${c2}-${c3}`;
}
