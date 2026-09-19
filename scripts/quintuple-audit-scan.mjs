#!/usr/bin/env node
/**
 * quintuple-audit-scan.mjs — Varredura Quíntupla Total do Ecossistema Waesy
 *
 * Eixo 1: Tabelas ↔ Services (orphaned tables / services sem tabela)
 * Eixo 2: Services ↔ Telas/Actions (services sem rota consumidora)
 * Eixo 3: Finanças/Tokens ↔ Ledger SHA-256 (fluxos $$ sem registro imutável)
 * Eixo 4: Mutações ↔ Telemetria Forense (createServerFn sem forensic_audit_events)
 * Eixo 5: Chaves de API ↔ Cofre Criptográfico (chaves hardcoded ou base64 exposta)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SERVICES_DIR = path.join(SRC, 'services');
const ROUTES_DIR = path.join(SRC, 'routes');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

function readDir(dir, ext = ['.ts', '.tsx']) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.wrangler'].includes(f))
        results = results.concat(readDir(full, ext));
    } else if (ext.some(e => f.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function readContent(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

// ─── EIXO 1 ───────────────────────────────────────────────────────────────────
console.log('\n[EIXO 1] Tabelas das Migrations vs. Cobertura BFF');
const tablePattern = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?["']?(\w+)["']?\s*\(/gim;
const allTables = new Set();
for (const mf of fs.readdirSync(MIGRATIONS_DIR).map(f => path.join(MIGRATIONS_DIR, f))) {
  const sql = readContent(mf);
  let m;
  while ((m = tablePattern.exec(sql)) !== null) allTables.add(m[1].toLowerCase());
  tablePattern.lastIndex = 0;
}

const serviceFiles = readDir(SERVICES_DIR, ['.ts']).filter(f => f.endsWith('.functions.ts'));
const tableCoverage = {};
for (const t of allTables) tableCoverage[t] = { services: [], hasBFF: false };
for (const sf of serviceFiles) {
  const c = readContent(sf);
  const sname = path.basename(sf);
  for (const t of allTables) {
    if (c.includes(`"${t}"`) || c.includes(`'${t}'`)) {
      tableCoverage[t].services.push(sname);
      tableCoverage[t].hasBFF = true;
    }
  }
}

const orphanedTables = Object.entries(tableCoverage).filter(([, v]) => !v.hasBFF).map(([t]) => t).sort();
console.log(`   Total tabelas: ${allTables.size} | Com BFF: ${allTables.size - orphanedTables.length} | ÓRFÃS: ${orphanedTables.length}`);
orphanedTables.slice(0, 20).forEach(t => console.log(`   ⚠️  ${t}`));
if (orphanedTables.length > 20) console.log(`   ... e mais ${orphanedTables.length - 20}`);

// ─── EIXO 2 ───────────────────────────────────────────────────────────────────
console.log('\n[EIXO 2] Services BFF vs. Consumo por Rotas');
const routeContent = readDir(ROUTES_DIR, ['.tsx', '.ts']).map(f => readContent(f)).join('\n');
const serviceGaps = [];
for (const sf of serviceFiles) {
  const sname = path.basename(sf, '.ts');
  const imported = routeContent.includes(`from "@/services/${sname}"`) || routeContent.includes(`from '@/services/${sname}'`);
  if (!imported) serviceGaps.push(sname);
}
console.log(`   Total services: ${serviceFiles.length} | Com rota: ${serviceFiles.length - serviceGaps.length} | ÓRFÃOS: ${serviceGaps.length}`);
serviceGaps.slice(0, 20).forEach(s => console.log(`   ⚠️  ${s}`));
if (serviceGaps.length > 20) console.log(`   ... e mais ${serviceGaps.length - 20}`);

// ─── EIXO 3 ───────────────────────────────────────────────────────────────────
console.log('\n[EIXO 3] Serviços Financeiros vs. Ledger SHA-256');
const financialServices = [
  'payment.functions.ts', 'checkout.functions.ts', 'order.functions.ts',
  'commission.functions.ts', 'giftcard.functions.ts', 'affiliates.functions.ts',
  'personal-finance.functions.ts', 'client-wallet.functions.ts', 'cash.functions.ts',
  'group-tour-cash.functions.ts', 'financial-obligations.functions.ts',
  'marketplace-hub.functions.ts', 'marketplace-webhooks.functions.ts', 'travel-lifecycle.functions.ts',
];
const ledgerGaps = [];
for (const fsvc of financialServices) {
  const c = readContent(path.join(SERVICES_DIR, fsvc));
  const hasLedger = c.includes('recordLedgerEntryCore') || c.includes('financial_immutable_ledger');
  if (!hasLedger) {
    const muts = (c.match(/amount_cents|price_cents|\.rpc\(/g) || []).length;
    ledgerGaps.push({ service: fsvc, mutations: muts });
  }
}
console.log(`   Auditados: ${financialServices.length} | Com Ledger: ${financialServices.length - ledgerGaps.length} | SEM LEDGER (P0): ${ledgerGaps.length}`);
ledgerGaps.forEach(g => console.log(`   🔴 ${g.service} (${g.mutations} mutations financeiras)`));

// ─── EIXO 4 ───────────────────────────────────────────────────────────────────
console.log('\n[EIXO 4] Services Críticos vs. Telemetria Forense');
const criticalServices = [
  'auth.functions.ts', 'payment.functions.ts', 'checkout.functions.ts',
  'order.functions.ts', 'commission.functions.ts', 'giftcard.functions.ts',
  'affiliates.functions.ts', 'store.functions.ts', 'kyc.functions.ts',
  'security.functions.ts', 'secret-vault.functions.ts', 'api-orchestrator.functions.ts',
  'tokens.functions.ts', 'receivables.functions.ts', 'legal.functions.ts',
  'contracts.functions.ts', 'marketplace-hub.functions.ts', 'marketplace-webhooks.functions.ts',
  'crm.functions.ts', 'mining.functions.ts', 'classifieds.functions.ts',
];
const forensicGaps = [];
for (const fsvc of criticalServices) {
  const c = readContent(path.join(SERVICES_DIR, fsvc));
  const hasForensic = c.includes('forensic_audit_events');
  const muts = (c.match(/\.insert\(|\.update\(|\.delete\(|\.rpc\(/g) || []).length;
  if (!hasForensic && muts > 0) forensicGaps.push({ service: fsvc, mutations: muts });
}
console.log(`   Auditados: ${criticalServices.length} | Com Telemetria: ${criticalServices.length - forensicGaps.length} | SEM TELEMETRIA (P1): ${forensicGaps.length}`);
forensicGaps.forEach(g => console.log(`   🟠 ${g.service} (${g.mutations} mutações)`));

// ─── EIXO 5 ───────────────────────────────────────────────────────────────────
console.log('\n[EIXO 5] Chaves de API vs. Cofre Criptográfico');
const vaultContent = readContent(path.join(SERVICES_DIR, 'secret-vault.functions.ts'));
const hasRealEncryption = vaultContent.includes('aes') || vaultContent.includes('pgp_sym_encrypt') || vaultContent.includes('vault.secrets');
const hasBase64Fake = vaultContent.includes('Buffer.from(') && vaultContent.includes('.toString("base64")');
const base64Issues = [];
for (const file of readDir(SRC, ['.ts', '.tsx'])) {
  if (file.includes('test')) continue;
  const c = readContent(file);
  if (c.includes('Buffer.from(') && c.includes('.toString("base64")') && !c.includes('// KMS') && !c.includes('// AES')) {
    base64Issues.push(path.relative(ROOT, file));
  }
}
console.log(`   Criptografia Real no Vault: ${hasRealEncryption ? '✅ Sim' : '🔴 NÃO — usa base64!'}`);
console.log(`   Base64 como "criptografia": ${hasBase64Fake ? '🔴 SIM (CRÍTICO)' : '✅ Não'}`);
console.log(`   Arquivos com base64 de chaves: ${base64Issues.length}`);
base64Issues.forEach(f => console.log(`   ⚠️  ${f}`));

// ─── Sumário Final ─────────────────────────────────────────────────────────────
const totalP0 = ledgerGaps.length + (hasRealEncryption ? 0 : 1);
const totalP1 = forensicGaps.length + base64Issues.length;
const totalP2 = Math.min(orphanedTables.length, 50) + Math.min(serviceGaps.length, 30);

console.log('\n══════════════════════════════════════════');
console.log('SUMÁRIO EXECUTIVO DA VARREDURA QUÍNTUPLA');
console.log('══════════════════════════════════════════');
console.log(`🔴 P0 CRÍTICO : ${totalP0} gaps (Ledger + Criptografia)`);
console.log(`🟠 P1 ALTA    : ${totalP1} gaps (Telemetria + Base64)`);
console.log(`🟡 P2 MÉDIA   : ${totalP2} gaps (Bilateralidade)`);

// Salvar resultado JSON
const result = {
  generatedAt: new Date().toISOString(),
  eixo1_orphanedTables: orphanedTables,
  eixo2_orphanedServices: serviceGaps,
  eixo3_ledgerGaps: ledgerGaps,
  eixo4_forensicGaps: forensicGaps,
  eixo5_keySecurityIssues: base64Issues,
  summary: { totalTables: allTables.size, totalServices: serviceFiles.length, p0Critical: totalP0, p1High: totalP1, p2Medium: totalP2 }
};
if (!fs.existsSync(path.join(ROOT, 'docs'))) fs.mkdirSync(path.join(ROOT, 'docs'));
fs.writeFileSync(path.join(ROOT, 'docs', 'audit-scan-result.json'), JSON.stringify(result, null, 2));
console.log('\n✅ Resultado salvo em docs/audit-scan-result.json\n');
