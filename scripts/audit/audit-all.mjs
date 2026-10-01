import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== WAESY SYSTEM AUDIT: ALL (P06 HARNESS) ===\n');

// 1. Run Checks
console.log('[1/4] Running C01-C43 checks...');
execSync('node scripts/audit/run-checks.mjs', { stdio: 'inherit' });

// 2. Generate Routes Inventory
console.log('\n[2/4] Generating routes, shells and niche matrix...');
execSync('node scripts/audit/generate-routes-inventory.mjs', { stdio: 'inherit' });

// 3. Generate Measurable Baseline
console.log('\n[3/4] Generating system measurable baseline...');
execSync('node scripts/audit/generate-baseline.mjs', { stdio: 'inherit' });

// 4. Consolidate and build HTML + JSON Report
console.log('\n[4/4] Building HTML + JSON consolidated audit report...');

const checksRaw = JSON.parse(fs.readFileSync('.audit/checks-raw.json', 'utf8'));
const baseline = JSON.parse(fs.readFileSync('.audit/BASELINE.json', 'utf8'));
const routesData = JSON.parse(fs.readFileSync('.audit/ROUTES.json', 'utf8'));

const consolidatedReport = {
  timestamp: new Date().toISOString(),
  system: {
    totalFiles: baseline.metrics.totalSourceFiles,
    linesOfCode: baseline.metrics.totalLinesOfCode,
    sizeMB: (baseline.metrics.totalSizeBytes / (1024 * 1024)).toFixed(2),
    routes: routesData.totalRoutes,
    components: baseline.metrics.componentsCount,
    services: baseline.metrics.servicesCount
  },
  checksSummary: {
    total: 43,
    conforming: Object.values(checksRaw).filter(c => c.count === 0).length,
    open: Object.values(checksRaw).filter(c => c.count > 0).length
  },
  checks: checksRaw,
  shells: routesData.shellDistribution,
  niches: routesData.nicheDistribution
};

fs.writeFileSync('.audit/audit-report.json', JSON.stringify(consolidatedReport, null, 2));

// Generate HTML Report
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Waesy Platform Audit Report (P06)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090a0f; color: #f1f5f9; padding: 2rem; margin: 0; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1, h2 { font-weight: 700; letter-spacing: -0.02em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #131722; border: 1px solid #1e293b; border-radius: 12px; padding: 1.25rem; }
    .metric { font-size: 2rem; font-weight: 800; font-family: monospace; }
    .text-emerald { color: #10b981; }
    .text-amber { color: #f59e0b; }
    .text-rose { color: #f43f5e; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; background: #131722; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #1e293b; font-size: 0.875rem; }
    th { background: #1e293b; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-red { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
  </style>
</head>
<body>
  <div class="container">
    <h1>Waesy Platform Forensic Audit Report</h1>
    <p style="color: #94a3b8;">Gerado em ${new Date().toLocaleString('pt-BR')} · Harness de Auditoria P06</p>

    <div class="grid">
      <div class="card">
        <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Total de Rotas</div>
        <div class="metric text-emerald">${consolidatedReport.system.routes}</div>
      </div>
      <div class="card">
        <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Linhas de Código</div>
        <div class="metric">${Number(consolidatedReport.system.linesOfCode).toLocaleString()}</div>
      </div>
      <div class="card">
        <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Checks Conformes</div>
        <div class="metric text-emerald">${consolidatedReport.checksSummary.conforming} / 43</div>
      </div>
      <div class="card">
        <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">Checks com Violações</div>
        <div class="metric text-rose">${consolidatedReport.checksSummary.open} / 43</div>
      </div>
    </div>

    <h2>Placar dos Checks C01 a C43</h2>
    <table>
      <thead>
        <tr>
          <th>Check</th>
          <th>Violações</th>
          <th>Status</th>
          <th>Amostra de Evidência</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(checksRaw).map(([code, data]) => `
          <tr>
            <td><strong>${code}</strong></td>
            <td><code>${data.count}</code></td>
            <td>
              ${data.count === 0 
                ? '<span class="badge badge-green">CONFORME</span>' 
                : '<span class="badge badge-red">ABERTO</span>'}
            </td>
            <td style="font-family: monospace; font-size: 0.8rem; color: #94a3b8;">
              ${data.violations[0] || 'Nenhuma violação'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

fs.writeFileSync('.audit/audit-report.html', html);
console.log('Generated .audit/audit-report.json and .audit/audit-report.html successfully.\n');

// CI Check verification
if (process.argv.includes('--ci')) {
  // Fatal check fail condition in CI
  if (checksRaw['C27'].count > 0 || checksRaw['C42'].count > 0) {
    console.error('FATAL AUDIT FAILURE: Dead routes or unversioned DB migrations detected.');
    process.exit(1);
  }
}

console.log('AUDIT HARNESS COMPLETED WITH EXIT CODE 0.');
