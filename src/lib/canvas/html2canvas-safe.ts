import type { Options as Html2CanvasOptions } from "html2canvas";
import { sanitizeElementImagesForCanvas } from "@/lib/canvas/cors-safe-image";

const UNSUPPORTED_COLOR_FN_RE = /\b(oklch|oklab|color-mix|lch|lab)\s*\(/i;

const COLOR_STYLE_PROPERTIES = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "columnRuleColor",
  "caretColor",
  "fill",
  "stroke",
] as const;

const COMPOSITE_COLOR_PROPERTIES = [
  "backgroundImage",
  "boxShadow",
  "textShadow",
] as const;

export interface SafeHtml2CanvasOptions {
  scale?: number;
  width?: number;
  height?: number;
  backgroundColor?: string | null;
  imageTimeout?: number;
  windowWidth?: number;
  windowHeight?: number;
  onclone?: (clonedDoc: Document, clonedElement: HTMLElement) => void;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function linearSrgbChannelToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  const srgb =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return clampByte(srgb * 255);
}

function parseAlphaToken(token?: string): number {
  if (!token) return 1;
  const trimmed = token.trim();
  if (trimmed.endsWith("%")) {
    const val = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(val) ? Math.max(0, Math.min(1, val / 100)) : 1;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 1;
}

function parseLightnessToken(token: string): number {
  const trimmed = token.trim();
  if (trimmed.endsWith("%")) {
    const val = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(val) ? Math.max(0, Math.min(1, val / 100)) : 0.5;
  }
  const val = Number.parseFloat(trimmed);
  if (!Number.isFinite(val)) return 0.5;
  return val > 1 ? Math.max(0, Math.min(1, val / 100)) : Math.max(0, Math.min(1, val));
}

function parseAngleDegrees(token: string): number {
  const trimmed = token.trim().toLowerCase();
  if (trimmed === "none") return 0;
  if (trimmed.endsWith("deg")) return Number.parseFloat(trimmed) || 0;
  if (trimmed.endsWith("rad")) return ((Number.parseFloat(trimmed) || 0) * 180) / Math.PI;
  if (trimmed.endsWith("grad")) return (Number.parseFloat(trimmed) || 0) * 0.9;
  if (trimmed.endsWith("turn")) return (Number.parseFloat(trimmed) || 0) * 360;
  return Number.parseFloat(trimmed) || 0;
}

/**
 * Converte cor OKLab (L, a, b, alpha) para sRGB (`rgb(...)` ou `rgba(...)`).
 */
export function oklabValuesToRgbString(
  L: number,
  a: number,
  b: number,
  alpha = 1
): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const r = linearSrgbChannelToSrgb(rLin);
  const g = linearSrgbChannelToSrgb(gLin);
  const bl = linearSrgbChannelToSrgb(bLin);

  if (alpha < 0.999) {
    return `rgba(${r}, ${g}, ${bl}, ${Number(alpha.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Converte string `oklch(...)` ou `oklab(...)` em matemática pura para `rgb(...)`/`rgba(...)`,
 * garantindo compatibilidade tanto em navegadores quanto em runtimes headless / Vitest.
 */
function convertOklchOrOklabExpression(fnName: string, inner: string): string | null {
  const [coordsPart, alphaPart] = inner.split("/");
  const parts = coordsPart.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const alpha = parseAlphaToken(alphaPart);
  const L = parseLightnessToken(parts[0]);

  if (fnName === "oklch") {
    const rawC = parts[1].trim();
    const C = rawC.endsWith("%")
      ? (Number.parseFloat(rawC.slice(0, -1)) || 0) * 0.004
      : Number.parseFloat(rawC) || 0;
    const hRad = (parseAngleDegrees(parts[2]) * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    return oklabValuesToRgbString(L, a, b, alpha);
  }

  if (fnName === "oklab") {
    const parseAb = (tok: string) => {
      const t = tok.trim();
      if (t.endsWith("%")) return ((Number.parseFloat(t.slice(0, -1)) || 0) / 100) * 0.4;
      return Number.parseFloat(t) || 0;
    };
    const a = parseAb(parts[1]);
    const b = parseAb(parts[2]);
    return oklabValuesToRgbString(L, a, b, alpha);
  }

  return null;
}

function parseRgbChannels(rgbStr: string): [number, number, number, number] | null {
  const m = rgbStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (m) {
    return [
      Number.parseFloat(m[1]),
      Number.parseFloat(m[2]),
      Number.parseFloat(m[3]),
      m[4] !== undefined ? Number.parseFloat(m[4]) : 1,
    ];
  }
  const hex = rgbStr.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return [
        Number.parseInt(raw[0] + raw[0], 16),
        Number.parseInt(raw[1] + raw[1], 16),
        Number.parseInt(raw[2] + raw[2], 16),
        1,
      ];
    }
    if (raw.length >= 6) {
      return [
        Number.parseInt(raw.slice(0, 2), 16),
        Number.parseInt(raw.slice(2, 4), 16),
        Number.parseInt(raw.slice(4, 6), 16),
        raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : 1,
      ];
    }
  }
  return null;
}

function resolveSimpleColorMix(inner: string, fallback: string): string {
  // Ex.: `in oklab, rgb(15, 23, 42) 15%, transparent`
  const cleaned = inner.replace(/^in\s+[a-z0-9-]+(?:\s+[a-z0-9-]+\s+hue)?\s*,/i, "").trim();
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      segments.push(cleaned.slice(start, i).trim());
      start = i + 1;
    }
  }
  segments.push(cleaned.slice(start).trim());
  if (segments.length < 2) return fallback;

  const parseSegment = (seg: string) => {
    const pctMatch = seg.match(/\s+([\d.]+)%\s*$/);
    const weight = pctMatch ? Number.parseFloat(pctMatch[1]) / 100 : undefined;
    const colorToken = (pctMatch ? seg.slice(0, pctMatch.index) : seg).trim();
    const resolved = normalizeCssColorsForHtml2Canvas(colorToken, fallback);
    if (resolved === "transparent") return { rgba: [0, 0, 0, 0] as [number, number, number, number], weight };
    if (resolved === "white") return { rgba: [255, 255, 255, 1] as [number, number, number, number], weight };
    if (resolved === "black") return { rgba: [0, 0, 0, 1] as [number, number, number, number], weight };
    return { rgba: parseRgbChannels(resolved), weight };
  };

  const first = parseSegment(segments[0]);
  const second = parseSegment(segments[1]);
  if (!first.rgba && !second.rgba) return fallback;
  const c1 = first.rgba ?? [0, 0, 0, 0];
  const c2 = second.rgba ?? [0, 0, 0, 0];

  let w1 = first.weight ?? (second.weight !== undefined ? 1 - second.weight : 0.5);
  let w2 = second.weight ?? 1 - w1;
  const total = w1 + w2;
  if (total <= 0) return fallback;
  const alphaMultiplier = Math.min(1, total);
  w1 /= total;
  w2 /= total;

  const aOut = (c1[3] * w1 + c2[3] * w2) * alphaMultiplier;
  if (aOut <= 0.001) return "rgba(0, 0, 0, 0)";
  const r = clampByte((c1[0] * c1[3] * w1 + c2[0] * c2[3] * w2) / (c1[3] * w1 + c2[3] * w2 || 1));
  const g = clampByte((c1[1] * c1[3] * w1 + c2[1] * c2[3] * w2) / (c1[3] * w1 + c2[3] * w2 || 1));
  const b = clampByte((c1[2] * c1[3] * w1 + c2[2] * c2[3] * w2) / (c1[3] * w1 + c2[3] * w2 || 1));

  return aOut < 0.999 ? `rgba(${r}, ${g}, ${b}, ${Number(aOut.toFixed(3))})` : `rgb(${r}, ${g}, ${b})`;
}

let cachedCanvasCtx: CanvasRenderingContext2D | null | undefined;
function tryResolveColorViaBrowserCanvas(colorExpr: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    if (cachedCanvasCtx === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cachedCanvasCtx = canvas.getContext("2d");
    }
    const ctx = cachedCanvasCtx;
    if (!ctx) return null;
    const sentinel = "rgb(1, 2, 3)";
    ctx.fillStyle = sentinel;
    ctx.fillStyle = colorExpr;
    const out = String(ctx.fillStyle || "").trim();
    if (!out || (out === sentinel && !colorExpr.includes("1, 2, 3"))) return null;
    if (UNSUPPORTED_COLOR_FN_RE.test(out)) return null;
    return out;
  } catch {
    return null;
  }
}

export function hasUnsupportedCssColorFunction(value: string | null | undefined): boolean {
  if (!value) return false;
  return UNSUPPORTED_COLOR_FN_RE.test(value);
}

/**
 * Normaliza qualquer string CSS substituindo `oklch(...)`, `oklab(...)`,
 * `color-mix(...)`, `lab(...)` e `lch(...)` por `rgb(...)`/`rgba(...)` compatíveis com `html2canvas`.
 */
export function normalizeCssColorsForHtml2Canvas(
  input: string,
  fallbackColor = "rgb(15, 23, 42)"
): string {
  if (!input || !UNSUPPORTED_COLOR_FN_RE.test(input)) return input;

  let result = "";
  let i = 0;

  while (i < input.length) {
    const rest = input.slice(i);
    const match = rest.match(/^(oklch|oklab|color-mix|lch|lab)\s*\(/i);
    if (!match) {
      result += input[i];
      i++;
      continue;
    }

    const fnName = match[1].toLowerCase();
    const openIdx = i + match[0].length - 1;
    let depth = 1;
    let j = openIdx + 1;
    while (j < input.length && depth > 0) {
      if (input[j] === "(") depth++;
      else if (input[j] === ")") depth--;
      j++;
    }

    if (depth !== 0) {
      result += input.slice(i);
      break;
    }

    const fullCall = input.slice(i, j);
    const inner = input.slice(openIdx + 1, j - 1);

    let resolved: string | null = null;
    if (fnName === "color-mix") {
      // Para color-mix, primeiro tenta normalizar tokens internos recursivamente e resolver via browser ou mix matemático
      const innerNormalized = normalizeCssColorsForHtml2Canvas(inner, fallbackColor);
      resolved =
        tryResolveColorViaBrowserCanvas(`color-mix(${innerNormalized})`) ||
        resolveSimpleColorMix(innerNormalized, fallbackColor);
    } else if (fnName === "oklch" || fnName === "oklab") {
      resolved =
        tryResolveColorViaBrowserCanvas(fullCall) ||
        convertOklchOrOklabExpression(fnName, inner);
    } else {
      resolved = tryResolveColorViaBrowserCanvas(fullCall);
    }

    result += resolved || fallbackColor;
    i = j;
  }

  return result;
}

/**
 * Copia cores computadas já normalizadas em `rgb(...)` do DOM vivo para o clone
 * e sanitiza tags `<style>` dentro do documento clonado para impedir crash do `html2canvas`
 * com CSS Tailwind CSS v4 (`oklch`/`oklab`/`color-mix`).
 */
export function sanitizeCloneStylesForHtml2Canvas(
  clonedDoc: Document,
  clonedElement: HTMLElement,
  liveElement?: HTMLElement
): void {
  // 1. Sanitizar declarações inline em `<style>` no documento clonado
  const styleTags = clonedDoc.querySelectorAll("style");
  styleTags.forEach((styleTag) => {
    const css = styleTag.textContent || "";
    if (UNSUPPORTED_COLOR_FN_RE.test(css)) {
      styleTag.textContent = normalizeCssColorsForHtml2Canvas(css, "rgb(15, 23, 42)");
    }
  });

  // 2. Mapear elementos ao vivo -> elementos clonados para congelar cores computadas em RGB
  const liveNodes = liveElement
    ? [liveElement, ...Array.from(liveElement.querySelectorAll<HTMLElement>("*"))]
    : [];
  const cloneNodes = [
    clonedElement,
    ...Array.from(clonedElement.querySelectorAll<HTMLElement>("*")),
  ];

  const liveView = liveElement?.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
  const cloneView = clonedDoc.defaultView || liveView;

  const normalizeContainer = (node: HTMLElement, referenceNode?: HTMLElement) => {
    const view = referenceNode && liveView ? liveView : cloneView;
    if (!view) return;
    const computed = view.getComputedStyle(referenceNode || node);

    for (const prop of COLOR_STYLE_PROPERTIES) {
      const value = computed[prop];
      if (!value) continue;
      if (UNSUPPORTED_COLOR_FN_RE.test(value)) {
        const normalized = normalizeCssColorsForHtml2Canvas(
          value,
          prop === "backgroundColor" ? "transparent" : "rgb(15, 23, 42)"
        );
        node.style[prop] = normalized;
      } else if (prop === "color" || prop === "backgroundColor") {
        // Congela cores computadas principais para resistir a links CSS externos não parseáveis no clone
        if (value !== "rgba(0, 0, 0, 0)" || prop === "color") {
          node.style[prop] = value;
        }
      }
    }

    for (const prop of COMPOSITE_COLOR_PROPERTIES) {
      const value = computed[prop];
      if (value && UNSUPPORTED_COLOR_FN_RE.test(value)) {
        node.style[prop] = normalizeCssColorsForHtml2Canvas(value, "rgb(15, 23, 42)");
      }
    }
  };

  // Root / body também podem carregar `--background` / `color` em `oklch` no Tailwind v4
  if (clonedDoc.documentElement) {
    normalizeContainer(clonedDoc.documentElement, liveElement?.ownerDocument?.documentElement);
  }
  if (clonedDoc.body) {
    normalizeContainer(clonedDoc.body, liveElement?.ownerDocument?.body);
  }

  for (let idx = 0; idx < cloneNodes.length; idx++) {
    const cloneNode = cloneNodes[idx];
    const matchingLiveNode =
      liveNodes.length === cloneNodes.length ? liveNodes[idx] : undefined;
    normalizeContainer(cloneNode, matchingLiveNode);
  }
}

/**
 * Monta opções canônicas e seguras para `html2canvas` sem tainted canvas
 * (`allowTaint: false`) e com sanitização automática de cores Tailwind v4.
 */
export function buildSafeHtml2CanvasConfig(
  liveElement: HTMLElement,
  options: SafeHtml2CanvasOptions = {}
): Partial<Html2CanvasOptions> {
  const userOnClone = options.onclone;
  return {
    scale:
      options.scale ??
      Math.max(
        2,
        Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2)
      ),
    ...(options.width ? { width: options.width } : {}),
    ...(options.height ? { height: options.height } : {}),
    ...(options.windowWidth ? { windowWidth: options.windowWidth } : {}),
    ...(options.windowHeight ? { windowHeight: options.windowHeight } : {}),
    useCORS: true,
    allowTaint: false,
    backgroundColor:
      options.backgroundColor === undefined ? "#ffffff" : options.backgroundColor,
    logging: false,
    imageTimeout: options.imageTimeout ?? 15000,
    onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
      sanitizeCloneStylesForHtml2Canvas(clonedDoc, clonedEl, liveElement);
      if (userOnClone) {
        userOnClone(clonedDoc, clonedEl);
      }
    },
  };
}

/**
 * Captura um elemento DOM para `<canvas>` com conversão prévia CORS de mídias
 * e neutralização completa de cores `oklch` / `oklab` / `color-mix`.
 */
export async function renderElementToCanvasSafe(
  element: HTMLElement,
  options: SafeHtml2CanvasOptions = {}
): Promise<HTMLCanvasElement> {
  await sanitizeElementImagesForCanvas(element);

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const html2canvas = (await import("html2canvas")).default;
  const config = buildSafeHtml2CanvasConfig(element, options);
  return html2canvas(element, config);
}

/**
 * Dispara o download de um `<canvas>` como arquivo PNG em alta resolução.
 */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename = "arte-waesy.png"
): string {
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}
