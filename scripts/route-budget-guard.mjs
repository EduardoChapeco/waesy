#!/usr/bin/env node
/**
 * scripts/route-budget-guard.mjs — Guardião de Orçamento de Rotas e Bundles (Plano 5 — S16)
 *
 * Inspeciona os chunks gerados pelo build em dist/assets e dist/_worker.js.
 * Calcula tamanhos reais (cru e gzip) e valida contra os tetos de Core Web Vitals.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const WORKER_FILE = path.join(DIST_DIR, '_worker.js');

// Tetos Canônicos de Orçamento (em bytes)
const BUDGETS = {
  entryRouter: {
    maxRaw: 2.2 * 1024 * 1024,   // 2.2 MB
    maxGzip: 450 * 1024,         // 450 kB
    desc: 'Entry Chunk Roteador Crítico',
  },
  globalCss: {
    maxRaw: 750 * 1024,          // 750 kB
    maxGzip: 120 * 1024,         // 120 kB
    desc: 'Folha de Estilos Canônica',
  },
  routeChunk: {
    maxRaw: 400 * 1024,          // 400 kB
    maxGzip: 95 * 1024,          // 95 kB
    desc: 'Chunk de Rota Específica',
  },
  vendorIsolated: {
    maxRaw: 1.3 * 1024 * 1024,   // 1.3 MB
    maxGzip: 350 * 1024,         // 350 kB
    desc: 'Vendor Isolado de Grande Porte',
  },
  workerBundle: {
    maxRaw: 25.0 * 1024 * 1024,  // 25.0 MB (Cloudflare Pages Worker limit)
    desc: 'Cloudflare Pages SSR Worker',
  },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getGzipSize(filePath) {
  const content = fs.readFileSync(filePath);
  return zlib.gzipSync(content).length;
}

function runAudit() {
  console.log('='.repeat(70));
  console.log('WAESY ROUTE & ASSET BUDGET GUARD (Plano 5 — S16)');
  console.log('='.repeat(70));

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`ERRO: Diretório "${ASSETS_DIR}" não encontrado. Execute "npm run build" antes.`);
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_DIR);
  const rows = [];
  let violationsCount = 0;

  // 1. Inspeciona Worker
  if (fs.existsSync(WORKER_FILE)) {
    const workerRaw = fs.statSync(WORKER_FILE).size;
    const workerPass = workerRaw <= BUDGETS.workerBundle.maxRaw;
    if (!workerPass) violationsCount++;
    rows.push({
      name: '_worker.js',
      type: 'Worker SSR',
      raw: workerRaw,
      gzip: 0,
      limit: formatSize(BUDGETS.workerBundle.maxRaw),
      status: workerPass ? 'PASS' : 'FAIL',
    });
  }

  // 2. Inspeciona Assets do Cliente
  for (const file of files) {
    const filePath = path.join(ASSETS_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const rawSize = stat.size;
    let gzipSize = 0;
    try {
      gzipSize = getGzipSize(filePath);
    } catch {
      gzipSize = rawSize;
    }

    let type = 'Asset Geral';
    let budget = null;

    if (file.startsWith('router-') && file.endsWith('.js')) {
      type = 'Entry Router';
      budget = BUDGETS.entryRouter;
    } else if (file.startsWith('styles-') && file.endsWith('.css')) {
      type = 'Global CSS';
      budget = BUDGETS.globalCss;
    } else if (file.startsWith('vendor-') || file.includes('maplibre') || file.includes('jspdf') || file.includes('html2canvas')) {
      type = 'Vendor Isolado';
      budget = BUDGETS.vendorIsolated;
    } else if (file.startsWith('_store') || file.startsWith('workspace') || file.startsWith('admin-master') || file.startsWith('c.')) {
      type = 'Rota';
      budget = BUDGETS.routeChunk;
    }

    let status = 'PASS';
    let limitStr = '-';

    if (budget) {
      limitStr = `${formatSize(budget.maxGzip || budget.maxRaw)} (gzip)`;
      const rawExceeded = budget.maxRaw && rawSize > budget.maxRaw;
      const gzipExceeded = budget.maxGzip && gzipSize > budget.maxGzip;

      if (rawExceeded || gzipExceeded) {
        status = 'FAIL';
        violationsCount++;
      }
    }

    // Apenas relata arquivos relevantes (> 20 kB) ou que violam
    if (rawSize >= 25 * 1024 || status === 'FAIL') {
      rows.push({
        name: file.length > 36 ? file.substring(0, 33) + '...' : file,
        type,
        raw: rawSize,
        gzip: gzipSize,
        limit: limitStr,
        status,
      });
    }
  }

  // Ordena por tamanho gzip desc
  rows.sort((a, b) => b.gzip - a.gzip);

  // Imprime tabela
  console.log('\n| Chunk / Arquivo | Tipo | Cru | Gzip | Limite Gzip | Status |');
  console.log('| :--- | :--- | :---: | :---: | :---: | :---: |');
  for (const r of rows) {
    const rawFmt = formatSize(r.raw);
    const gzipFmt = r.gzip > 0 ? formatSize(r.gzip) : '-';
    console.log(`| ${r.name.padEnd(35)} | ${r.type.padEnd(14)} | ${rawFmt.padStart(8)} | ${gzipFmt.padStart(8)} | ${r.limit.padStart(12)} | ${r.status.padStart(6)} |`);
  }

  console.log('\n' + '-'.repeat(70));
  if (violationsCount === 0) {
    console.log(`APROVADO: 100% dos chunks de rota e workers estão dentro do orçamento de escala!`);
    console.log('='.repeat(70));
    process.exit(0);
  } else {
    console.error(`REPROVADO: ${violationsCount} chunk(s) excederam o orçamento máximo tolerado.`);
    console.log('='.repeat(70));
    process.exit(1);
  }
}

runAudit();
