import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

/**
 * Auditoria determinística de contraste WCAG 2.2 AA dos tokens semânticos de src/styles.css (DL-16 / DL-17).
 */

function linToSrgbClamp(c) {
  return Math.min(1, Math.max(0, c));
}

export function oklchToLinear(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    linToSrgbClamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linToSrgbClamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linToSrgbClamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function srgbToLin(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function parseColor(value) {
  const v = value.trim();
  let m;
  if ((m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/))) return oklchToLinear(+m[1], +m[2], +m[3]);
  if ((m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [srgbToLin(((n >> 16) & 255) / 255), srgbToLin(((n >> 8) & 255) / 255), srgbToLin((n & 255) / 255)];
  }
  return null;
}

export function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function parseBlock(body) {
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].replace(/\/\*.*?\*\//g, '').trim();
  return vars;
}

function resolve(name, vars, globals, depth = 0) {
  let v = vars[name] ?? globals[name];
  if (v == null || depth > 8) return null;
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolve(ref[1], vars, globals, depth + 1);
  return parseColor(v);
}

export const PAIRS = [
  ['--foreground', '--background', 4.5],
  ['--card-foreground', '--card', 4.5],
  ['--popover-foreground', '--popover', 4.5],
  ['--primary-foreground', '--primary', 4.5],
  ['--secondary-foreground', '--secondary', 4.5],
  ['--accent-foreground', '--accent', 4.5],
  ['--muted-foreground', '--background', 4.5],
  ['--muted-foreground', '--card', 4.5],
  ['--muted-foreground', '--muted', 4.5],
  ['--destructive-foreground', '--destructive', 4.5],
  ['--success-foreground', '--success', 4.5],
  ['--warning-foreground', '--warning', 4.5],
  ['--info-foreground', '--info', 4.5],
  ['--warning-strong', '--background', 4.5],
  ['--warning-strong', '--card', 4.5],
  ['--primary', '--background', 3],
  ['--border-strong', '--background', 1.5],
];

export function auditContrast(css) {
  const light = parseBlock((css.match(/^:root \{([\s\S]*?)^\}/m) || [])[1] || '');
  const dark = parseBlock((css.match(/^\.dark,\s*\[data-theme="dark"\] \{([\s\S]*?)^\}/m) || [])[1] || '');
  const globals = parseBlock(css);
  const rows = [];
  for (const [mode, vars] of [['light', light], ['dark', dark]]) {
    const scope = mode === 'dark' ? { ...light, ...dark } : light;
    for (const [fg, bg, min] of PAIRS) {
      const a = resolve(fg, scope, globals);
      const b = resolve(bg, scope, globals);
      if (!a || !b) { rows.push({ mode, fg, bg, min, ratio: null, pass: false, reason: 'token não resolvido' }); continue; }
      const ratio = contrast(a, b);
      rows.push({ mode, fg, bg, min, ratio, pass: ratio >= min });
    }
  }
  return rows;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const css = fs.readFileSync(path.resolve('src/styles.css'), 'utf8');
  const rows = auditContrast(css);
  console.log('| Modo | Texto/Controle | Fundo | Mínimo | Razão | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const r of rows) console.log(`| ${r.mode} | ${r.fg} | ${r.bg} | ${r.min}:1 | ${r.ratio ? r.ratio.toFixed(2) + ':1' : '-'} | ${r.pass ? 'Aprovado' : 'REPROVADO'} |`);
  const failed = rows.filter((r) => !r.pass);
  if (failed.length) { console.error(`\nDL-16/17: ${failed.length} par(es) reprovado(s).`); process.exit(1); }
  console.log('\nDL-16/17: todos os pares aprovados.');
}
