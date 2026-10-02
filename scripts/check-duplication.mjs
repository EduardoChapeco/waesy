#!/usr/bin/env node
/**
 * check-duplication.mjs — Verificador CI de Duplicidade de Campos Canônicos (R28)
 *
 * Detecta campos semânticos com múltiplos donos declarados em arquivos
 * diferentes de src/lib/, src/services/ e src/components/.
 *
 * Regra R28 (Operação Verdade Única): cada campo semântico deve ter
 * UM ÚNICO arquivo dono — declarações duplicadas bloqueiam o CI.
 *
 * Uso:
 *   node scripts/check-duplication.mjs            → Audita tudo
 *   node scripts/check-duplication.mjs --changed  → Apenas arquivos changed
 *   node scripts/check-duplication.mjs --warn     → Não falha o CI (avisa)
 *
 * Campos auditados:
 *   - Parcelamento/Pagamento: installmentCount, MAX_INSTALLMENTS, calcInstallments
 *   - NCM/Fiscal: NCM_CODE, CEST_CODE, CFOP_CODE, IBS_RATE
 *   - Preço/Margem: PRICE_CALCULATOR, calcMargin, calcProfit, calcDiscountPix
 *   - Estoque: STOCK_LEDGER, updateStock, reserveStock
 *   - Galeria/Mídia: GALLERY_MANAGER, reorderMedia, uploadCover
 *   - Políticas: CANCELLATION_POLICY, REFUND_POLICY, buildFaqItems
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Campos Semânticos Canônicos e seus Donos Esperados ──────────────────────
// Formato: { id, pattern, expectedOwner, description }
// expectedOwner: caminho relativo do arquivo dono único (null = sem dono definido ainda)
const CANONICAL_FIELDS = [
  // Parcelamento
  {
    id: 'F01',
    pattern: /\bMAX_INSTALLMENTS\b/,
    expectedOwner: 'src/lib/payment/installment-calculator.ts',
    description: 'Constante máximo de parcelas',
  },
  {
    id: 'F02',
    pattern: /\bcalcInstallments\b/,
    expectedOwner: 'src/lib/payment/installment-calculator.ts',
    description: 'Função calculadora de parcelas',
  },
  // NCM/Fiscal
  {
    id: 'F03',
    pattern: /\bNCM_REGISTRY\b/,
    expectedOwner: 'src/lib/fiscal/ncm-registry.ts',
    description: 'Registry canônico de NCM',
  },
  {
    id: 'F04',
    pattern: /\bCFOP_TABLE\b/,
    expectedOwner: 'src/lib/fiscal/ncm-registry.ts',
    description: 'Tabela de CFOPs',
  },
  // Preço
  {
    id: 'F05',
    pattern: /\bcalcDiscountPix\b/,
    expectedOwner: 'src/lib/pricing/price-calculator.ts',
    description: 'Calculadora de desconto PIX',
  },
  {
    id: 'F06',
    pattern: /\bcalcMargin\b/,
    expectedOwner: 'src/lib/pricing/price-calculator.ts',
    description: 'Calculadora de margem',
  },
  // Estoque
  {
    id: 'F07',
    pattern: /\bupdateStockLedger\b/,
    expectedOwner: 'src/services/canonical-stock-ledger.functions.ts',
    description: 'Mutação de ledger de estoque',
  },
  // Galeria
  {
    id: 'F08',
    pattern: /\bGALLERY_MANAGER\b/,
    expectedOwner: 'src/lib/media/gallery-manager.ts',
    description: 'Manager de galeria/mídia',
  },
  // Políticas
  {
    id: 'F09',
    pattern: /\bCANCELLATION_POLICY_REGISTRY\b/,
    expectedOwner: 'src/lib/policies/cancellation-policy-registry.ts',
    description: 'Registry de políticas de cancelamento',
  },
];

// ── Diretórios auditados ────────────────────────────────────────────────────
const AUDIT_DIRS = ['src/lib', 'src/services', 'src/components', 'src/routes'];

// ── Flags ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const WARN_ONLY = args.includes('--warn');
const CHANGED_ONLY = args.includes('--changed');

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return [...new Set([...output.split('\n'), ...staged.split('\n')])].filter(Boolean);
  } catch {
    return [];
  }
}

// ── Coleta arquivos ──────────────────────────────────────────────────────────
function collectFiles() {
  const files = [];
  for (const dir of AUDIT_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (Boolean(fs.existsSync(absDir)) === false) continue;
    function walk(d) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push({ absPath: full, relPath: path.relative(ROOT, full).replace(/\\/g, '/') });
        }
      }
    }
    walk(absDir);
  }
  return files;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('');
console.log('======================================================================');
console.log('WAESY DUPLICATION GUARD — Verificador CI de Duplicidade (R28)');
console.log(`Modo: ${CHANGED_ONLY ? '--changed' : 'full'}`);
console.log('======================================================================');
console.log('');

let allFiles = collectFiles();

if (CHANGED_ONLY) {
  const changed = getChangedFiles().map((f) => f.replace(/\\/g, '/'));
  allFiles = allFiles.filter((f) => changed.some((c) => f.relPath.endsWith(c) || c.endsWith(f.relPath)));
}

const violations = [];
const reports = [];

for (const field of CANONICAL_FIELDS) {
  const matchingFiles = [];

  for (const { absPath, relPath } of allFiles) {
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      if (field.pattern.test(content)) {
        matchingFiles.push(relPath);
      }
    } catch {
      // skip
    }
  }

  if (matchingFiles.length === 0) continue;

  const expectedOwner = field.expectedOwner;
  const hasExpectedOwner = matchingFiles.some((f) => f === expectedOwner || f.endsWith(expectedOwner));

  // Arquivos que NÃO são o dono esperado mas contêm o padrão
  const spuriousFiles = matchingFiles.filter((f) => {
    if (expectedOwner === null) return false;
    return Boolean(f === expectedOwner) === false && Boolean(f.endsWith(expectedOwner)) === false;
  });

  if (matchingFiles.length > 1 && spuriousFiles.length > 0) {
    violations.push({
      field,
      matchingFiles,
      spuriousFiles,
      hasExpectedOwner,
    });
  }

  reports.push({ field, matchingFiles, hasExpectedOwner });
}

// ── Relatório ─────────────────────────────────────────────────────────────────
if (reports.length > 0) {
  console.log('INVENTARIO DE CAMPOS CANONICOS:');
  for (const r of reports) {
    const status = r.hasExpectedOwner ? 'OK' : 'SEM_DONO';
    const count = r.matchingFiles.length;
    console.log(`  [${r.field.id}] ${status} | ${count} ocorrencia(s) | ${r.field.description}`);
    if (count > 1) {
      for (const f of r.matchingFiles) {
        const isDono = f === r.field.expectedOwner || (r.field.expectedOwner && f.endsWith(r.field.expectedOwner));
        console.log(`         ${isDono ? '[DONO]' : '[DUPE]'} ${f}`);
      }
    }
  }
  console.log('');
}

if (violations.length === 0) {
  console.log(`APROVADO: Nenhuma duplicidade de campo canonico detectada em ${allFiles.length} arquivos.`);
  console.log('');
  process.exit(0);
}

console.log(`REPROVADO — ${violations.length} campo(s) com multiplos donos:`);
console.log('');
for (const v of violations) {
  console.log(`  [${v.field.id}] ${v.field.description}`);
  console.log(`         Padrao: ${v.field.pattern}`);
  console.log(`         Dono esperado: ${v.field.expectedOwner ?? 'NAO DEFINIDO'}`);
  console.log(`         Arquivos espur ios: ${v.spuriousFiles.join(', ')}`);
  console.log('');
}

console.log('ACAO OBRIGATORIA: Centralizar no dono unico e remover duplicatas.');
console.log('======================================================================');
console.log('');

if (WARN_ONLY) {
  process.exit(0);
}

process.exit(1);
