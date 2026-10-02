#!/usr/bin/env node
/**
 * check-route-size.mjs — Verificador CI de Composição de Página (R20)
 *
 * Regras canônicas (Operação Verdade Única, Gate Bloco 3):
 * - NENHUM arquivo em src/routes/ pode ter mais de 300 linhas.
 * - NENHUM arquivo em src/components/ pode ter mais de 250 linhas.
 * - Exceções exigem registro canônico neste script com data, motivo e prazo.
 *
 * Uso:
 *   node scripts/check-route-size.mjs            → Audita tudo
 *   node scripts/check-route-size.mjs --changed  → Apenas arquivos git changed
 *   node scripts/check-route-size.mjs --warn     → Não falha o CI (apenas avisa)
 *
 * Integração CI:
 *   Adicionar em package.json scripts: "check:size": "node scripts/check-route-size.mjs"
 *   Executar após typecheck e antes do build.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Configuração de Limites ──────────────────────────────────────────────────
const LIMITS = {
  'src/routes': 300,
  'src/components': 250,
};

// ── Exceções Canônicas ───────────────────────────────────────────────────────
// Formato: { file, maxLines, expires, reason }
// PROIBIDO adicionar exceção sem data de expiração (máximo 30 dias).
const EXCEPTIONS = [
  // Exemplo (remover quando decomposição concluída):
  // {
  //   file: 'src/routes/_store.conta.classificados.novo.tsx',
  //   maxLines: 9300,
  //   expires: '2026-11-01',
  //   reason: 'R20: maior monólito do sistema — decomposição em andamento (R21-target)',
  // },
];

// ── Flags ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CHANGED_ONLY = args.includes('--changed');
const WARN_ONLY = args.includes('--warn');

// ── Helpers ──────────────────────────────────────────────────────────────────
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return [...new Set([...output.split('\n'), ...staged.split('\n')])].filter(Boolean);
  } catch {
    return [];
  }
}

function getExceptionLimit(relPath) {
  const today = new Date().toISOString().slice(0, 10);
  const exc = EXCEPTIONS.find((e) => relPath.endsWith(e.file.replace(/\\/g, '/')));
  if (!exc) return null;
  if (exc.expires && today > exc.expires) {
    console.error(`\nEXCECAO EXPIRADA: ${exc.file} (expirou em ${exc.expires}). Remova ou renove a excecao.`);
    return null; // Força reprovação após expiração
  }
  return exc.maxLines;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('');
console.log('======================================================================');
console.log('WAESY ROUTE SIZE GUARD — Verificador CI de Composicao de Pagina (R20)');
console.log(`Modo: ${CHANGED_ONLY ? '--changed' : 'full'} | Limites: routes=${LIMITS['src/routes']}L, components=${LIMITS['src/components']}L`);
console.log('======================================================================');
console.log('');

const violations = [];
const warnings = [];

// Coletar arquivos a inspecionar
let filesToInspect = [];

for (const [dir, maxLines] of Object.entries(LIMITS)) {
  const absDir = path.join(ROOT, dir);
  if (Boolean(fs.existsSync(absDir)) === false) continue;

  const allFiles = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        allFiles.push({ absPath: full, relPath: path.relative(ROOT, full).replace(/\\/g, '/'), maxLines });
      }
    }
  }
  walk(absDir);

  if (CHANGED_ONLY) {
    const changed = getChangedFiles().map((f) => f.replace(/\\/g, '/'));
    filesToInspect.push(...allFiles.filter((f) => changed.some((c) => f.relPath.endsWith(c) || c.endsWith(f.relPath))));
  } else {
    filesToInspect.push(...allFiles);
  }
}

// Deduplica
filesToInspect = [...new Map(filesToInspect.map((f) => [f.relPath, f])).values()];

let inspected = 0;
for (const { absPath, relPath, maxLines } of filesToInspect) {
  const lines = countLines(absPath);
  const effectiveLimit = getExceptionLimit(relPath) ?? maxLines;
  inspected++;

  if (lines > effectiveLimit) {
    const category = lines > effectiveLimit * 3 ? 'CRITICO' : lines > effectiveLimit * 2 ? 'ALTO' : 'MEDIO';
    violations.push({ relPath, lines, limit: effectiveLimit, category });
  } else if (lines > effectiveLimit * 0.8) {
    warnings.push({ relPath, lines, limit: effectiveLimit });
  }
}

// ── Relatório ─────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.log(`AVISOS — ${warnings.length} arquivos proximos do limite (>80%):`);
  for (const w of warnings.sort((a, b) => b.lines - a.lines)) {
    console.log(`  ${String(w.lines).padStart(5)} / ${w.limit}L  ${w.relPath}`);
  }
  console.log('');
}

if (violations.length === 0) {
  console.log(`APROVADO: ${inspected} arquivos inspecionados. Nenhum monolito detectado.`);
  console.log('');
  process.exit(0);
}

console.log(`REPROVADO — ${violations.length} monolitos detectados em ${inspected} arquivos inspecionados:`);
console.log('');

// Ordenar por linhas (pior primeiro)
violations.sort((a, b) => b.lines - a.lines);
for (const v of violations) {
  const excess = v.lines - v.limit;
  console.log(`  [${v.category}] ${String(v.lines).padStart(5)}L (+${excess}) / limite ${v.limit}L`);
  console.log(`           ${v.relPath}`);
  console.log(`           Reducao necessaria: ${v.lines} -> <${v.limit} linhas (${Math.round((1 - v.limit / v.lines) * 100)}% de reducao)`);
  console.log('');
}

console.log('----------------------------------------------------------------------');
console.log(`Total: ${violations.length} violacoes | CRITICO: ${violations.filter((v) => v.category === 'CRITICO').length} | ALTO: ${violations.filter((v) => v.category === 'ALTO').length} | MEDIO: ${violations.filter((v) => v.category === 'MEDIO').length}`);
console.log('');
console.log('ACAO OBRIGATORIA: Decompor os monolitos antes do merge.');
console.log('Excecoes temporarias devem ser registradas em EXCEPTIONS[] deste script.');
console.log('======================================================================');
console.log('');

if (WARN_ONLY) {
  process.exit(0);
}

process.exit(1);
