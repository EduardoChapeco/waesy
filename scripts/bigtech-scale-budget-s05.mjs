import fs from 'fs';
import path from 'path';

const root = process.cwd();
const assetsDir = path.join(root, 'dist', 'assets');

let chunks = [];
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  for (const f of files) {
    const stat = fs.statSync(path.join(assetsDir, f));
    chunks.push({
      file: f,
      sizeBytes: stat.size,
      sizeKb: Math.round(stat.size / 1024 * 10) / 10
    });
  }
}

// Classificar chunks por vertical ou domínio
const breakdown = {
  vendor_react: 0,
  vendor_ui: 0,
  store_consumer: 0,
  workspace_merchant: 0,
  admin_master: 0,
  ad_engine_catalog: 0,
  other: 0
};

let totalClientAssetsBytes = 0;
for (const c of chunks) {
  totalClientAssetsBytes += c.sizeBytes;
  const f = c.file.toLowerCase();
  if (f.includes('react') || f.includes('tanstack') || f.includes('vendor')) {
    breakdown.vendor_react += c.sizeBytes;
  } else if (f.includes('radix') || f.includes('icon') || f.includes('lucide')) {
    breakdown.vendor_ui += c.sizeBytes;
  } else if (f.includes('store') || f.includes('classificados') || f.includes('vitrine') || f.includes('checkout')) {
    breakdown.store_consumer += c.sizeBytes;
  } else if (f.includes('workspace')) {
    breakdown.workspace_merchant += c.sizeBytes;
  } else if (f.includes('admin')) {
    breakdown.admin_master += c.sizeBytes;
  } else if (f.includes('ad-engine') || f.includes('editor') || f.includes('preview')) {
    breakdown.ad_engine_catalog += c.sizeBytes;
  } else {
    breakdown.other += c.sizeBytes;
  }
}

const workerPath = path.join(root, 'dist', '_worker.js');
const workerSizeBytes = fs.existsSync(workerPath) ? fs.statSync(workerPath).size : 0;
const workerSizeMb = Math.round(workerSizeBytes / (1024 * 1024) * 100) / 100;

const scaleBudget = {
  measuredAt: new Date().toISOString(),
  worker: {
    sizeBytes: workerSizeBytes,
    sizeMb: workerSizeMb,
    budgetMb: 25.0,
    status: workerSizeMb <= 25.0 ? 'WITHIN_BUDGET' : 'EXCEEDED'
  },
  clientAssets: {
    totalFiles: chunks.length,
    totalBytes: totalClientAssetsBytes,
    totalMb: Math.round(totalClientAssetsBytes / (1024 * 1024) * 100) / 100,
    largestChunks: chunks.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10)
  },
  verticalBreakdownKb: {
    vendor_react: Math.round(breakdown.vendor_react / 1024),
    vendor_ui: Math.round(breakdown.vendor_ui / 1024),
    store_consumer: Math.round(breakdown.store_consumer / 1024),
    workspace_merchant: Math.round(breakdown.workspace_merchant / 1024),
    admin_master: Math.round(breakdown.admin_master / 1024),
    ad_engine_catalog: Math.round(breakdown.ad_engine_catalog / 1024),
    other: Math.round(breakdown.other / 1024)
  },
  requestBudgetPerScreen: {
    store_home: { maxRequests: 8, maxRowsRead: 50, targetMs: 120 },
    store_listing_detail: { maxRequests: 5, maxRowsRead: 30, targetMs: 90 },
    store_checkout: { maxRequests: 4, maxRowsRead: 20, targetMs: 150 },
    workspace_dashboard: { maxRequests: 6, maxRowsRead: 100, targetMs: 180 },
    workspace_catalog_editor: { maxRequests: 7, maxRowsRead: 80, targetMs: 200 }
  }
};

console.log(JSON.stringify(scaleBudget, null, 2));
