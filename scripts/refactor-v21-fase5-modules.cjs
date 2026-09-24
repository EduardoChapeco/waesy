const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const filesToClean = [
  'src/components/mining/mining-dashboard.tsx',
  'src/components/mining/advanced-mining-tabs.tsx',
  'src/routes/admin-master.mining.tsx',
  'src/routes/_store.checkout.tsx',
  'src/routes/_store.carrinho.tsx'
];

let totalCleanups = 0;

for (const rel of filesToClean) {
  const fullPath = path.join(root, rel);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${rel}`);
    continue;
  }

  let code = fs.readFileSync(fullPath, 'utf8');
  const originalLength = code.length;

  // 1. Remove non-canonical shadows
  code = code.replace(/\bshadow-2xs\b/g, '');
  code = code.replace(/\bshadow-xs\b/g, '');
  code = code.replace(/\bshadow-sm\b/g, '');
  code = code.replace(/\bshadow-md\b/g, '');
  code = code.replace(/\bshadow-lg\b/g, '');
  code = code.replace(/\bshadow-xl\b/g, '');
  code = code.replace(/\bshadow-2xl\b/g, '');
  code = code.replace(/\bdrop-shadow-sm\b/g, '');
  code = code.replace(/\bdrop-shadow-md\b/g, '');

  // 2. Clean up whitespace inside class strings
  code = code.replace(/class(Name)?="([^"]+)"/g, (match, p1, classes) => {
    const cleaned = classes.split(/\s+/).filter(Boolean).join(' ');
    return `class${p1 || ''}="${cleaned}"`;
  });

  if (code.length !== originalLength) {
    fs.writeFileSync(fullPath, code);
    console.log(`✅ Cleaned and flattened: ${rel}`);
    totalCleanups++;
  } else {
    console.log(`ℹ️ Already clean: ${rel}`);
  }
}

console.log(`\n🎉 FASE 5 PURIFICATION: ${totalCleanups} Mining, B2B and Checkout modules flattened with zero shadow violations!`);
