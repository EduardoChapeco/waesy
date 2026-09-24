const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const routesDir = path.join(root, 'src/routes');
const filesToClean = [
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.evento.$id.tsx',
  'src/routes/_store.imoveis.tsx',
  'src/routes/_store.receitas.index.tsx',
  'src/routes/_store.explorar.tsx',
  'src/routes/_store.destaques.$slug.tsx',
  'src/routes/_store.proposta.$token.tsx',
  'src/routes/_store.membro.$id.tsx'
];

let totalPurified = 0;

for (const rel of filesToClean) {
  const fullPath = path.join(root, rel);
  if (!fs.existsSync(fullPath)) continue;

  let code = fs.readFileSync(fullPath, 'utf8');
  const originalLength = code.length;

  // 1. Remove backdrop-blur from badges, spans and cards (keeping it only for fixed headers/modals if needed)
  code = code.replace(/<Badge([^>]*?)\bbackdrop-blur-[a-z0-9]+([^>]*?)>/g, '<Badge$1$2>');
  code = code.replace(/<span([^>]*?)\bbackdrop-blur-[a-z0-9]+([^>]*?)>/g, '<span$1$2>');
  
  // 2. Remove non-canonical shadows
  code = code.replace(/\bshadow-2xs\b/g, '');
  code = code.replace(/\bshadow-xs\b/g, '');
  code = code.replace(/\bshadow-sm\b/g, '');
  code = code.replace(/\bshadow-md\b/g, '');
  code = code.replace(/\bshadow-lg\b/g, '');
  code = code.replace(/\bdrop-shadow-sm\b/g, '');
  code = code.replace(/\bdrop-shadow-xs\b/g, '');

  // 3. Clean up double spaces in class names
  code = code.replace(/class(Name)?="([^"]+)"/g, (match, p1, classes) => {
    const cleaned = classes.split(/\s+/).filter(Boolean).join(' ');
    return `class${p1 || ''}="${cleaned}"`;
  });

  if (code.length !== originalLength) {
    fs.writeFileSync(fullPath, code);
    console.log(`✅ Purified FASE 3 in: ${rel}`);
    totalPurified++;
  } else {
    console.log(`ℹ️ Already clean: ${rel}`);
  }
}

console.log(`\n🎉 FASE 3 PURIFICATION COMPLETE: ${totalPurified} routes purified under Apple HIG standards!`);
