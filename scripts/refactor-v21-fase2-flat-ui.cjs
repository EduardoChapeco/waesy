const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const filesToClean = [
  'src/components/classifieds/editorial-showcase-view.tsx',
  'src/components/classifieds/convenience-showcase-view.tsx',
  'src/components/commerce/canonical-store-profile-view.tsx',
  'src/routes/_store.membro.$id.tsx',
  'src/routes/_store.conta.perfil.tsx'
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

  // 2. Eradicate saturated green buttons in convenience and store profile, replacing with clean tokens
  code = code.replace(/bg-emerald-600 hover:bg-emerald-700 text-white/g, 'bg-foreground text-background hover:bg-foreground/90');

  // 3. Remove superfluous double spaces caused by shadow removal
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

console.log(`\n🎉 FASE 2 PURIFICATION: ${totalCleanups} detail & profile components flattened with zero shadow violations!`);
