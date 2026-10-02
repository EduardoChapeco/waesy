import fs from 'node:fs';
import path from 'node:path';

const SRC_LIB = path.resolve('src/lib');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function moveWithReexport(domainSubdir, files) {
  const targetDir = path.join(SRC_LIB, domainSubdir);
  ensureDir(targetDir);

  for (const file of files) {
    const srcPath = path.join(SRC_LIB, file.src);
    const destPath = path.join(targetDir, file.dest);

    if (fs.existsSync(srcPath)) {
      // 1. Move content to new domain module
      const originalContent = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, originalContent, 'utf8');

      // 2. Replace root file with canonical re-export bridge
      const reexportContent = `/**
 * @deprecated Canônico: O domínio foi desacoplado de src/lib puro na Fase S07.
 * Utilize o módulo canônico correspondente: "@/lib/${domainSubdir}/${file.dest.replace('.ts', '')}"
 */
export * from "./${domainSubdir}/${file.dest.replace('.ts', '')}";
`;
      fs.writeFileSync(srcPath, reexportContent, 'utf8');
      console.log(`[S07] Migrated: ${file.src} -> ${domainSubdir}/${file.dest} (Re-export bridge preserved)`);
    } else {
      console.warn(`[S07] File not found: ${srcPath}`);
    }
  }
}

// 1. Turismo
moveWithReexport('tourism', [
  { src: 'airports-data.ts', dest: 'airports-data.ts' },
  { src: 'destinations-catalog.ts', dest: 'destinations-catalog.ts' },
  { src: 'hotel-presets.ts', dest: 'hotel-presets.ts' },
  { src: 'tourism-templates.ts', dest: 'tourism-templates.ts' },
]);

// 2. SimLab
moveWithReexport('simlab', [
  { src: 'simlab-calibrated-personas.ts', dest: 'calibrated-personas.ts' },
]);

// 3. Niches
moveWithReexport('niches', [
  { src: 'catalog-niche-context.ts', dest: 'catalog-niche-context.ts' },
  { src: 'niche-dictionary.ts', dest: 'niche-dictionary.ts' },
  { src: 'niche-helpers.ts', dest: 'niche-helpers.ts' },
  { src: 'niche-manifest.ts', dest: 'niche-manifest.ts' },
  { src: 'niche-presets.ts', dest: 'niche-presets.ts' },
  { src: 'niche-semantics.ts', dest: 'niche-semantics.ts' },
]);

// 4. Builder
moveWithReexport('builder', [
  { src: 'builder-registry.ts', dest: 'builder-registry.ts' },
  { src: 'builder-types.ts', dest: 'builder-types.ts' },
  { src: 'home-templates-library.ts', dest: 'home-templates-library.ts' },
  { src: 'section-templates.ts', dest: 'section-templates.ts' },
  { src: 'presentation-presets.ts', dest: 'presentation-presets.ts' },
  { src: 'studio-machine-constants.ts', dest: 'studio-machine-constants.ts' },
]);

// 5. AI
moveWithReexport('ai', [
  { src: 'prompt-shield.ts', dest: 'prompt-shield.ts' },
  { src: 'prd-decomposer.ts', dest: 'prd-decomposer.ts' },
  { src: 'ears-validator.ts', dest: 'ears-validator.ts' },
  { src: 'strategic-frameworks.ts', dest: 'strategic-frameworks.ts' },
  { src: 'product-manager.ts', dest: 'product-manager.ts' },
  { src: 'ux-research.ts', dest: 'ux-research.ts' },
]);

// Create index.ts files for newly organized domain modules
function createIndexIfMissing(domainSubdir, exportsList) {
  const indexPath = path.join(SRC_LIB, domainSubdir, 'index.ts');
  const content = `/**
 * @fileoverview Canônico do domínio ${domainSubdir} (Waesy BigTech Architecture S07).
 */
` + exportsList.map(e => `export * from "./${e}";`).join('\n') + '\n';
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`[S07] Created index: ${domainSubdir}/index.ts`);
}

createIndexIfMissing('niches', [
  'catalog-niche-context',
  'niche-dictionary',
  'niche-helpers',
  'niche-manifest',
  'niche-presets',
  'niche-semantics',
]);

createIndexIfMissing('builder', [
  'builder-registry',
  'builder-types',
  'home-templates-library',
  'section-templates',
  'presentation-presets',
  'studio-machine-constants',
]);

createIndexIfMissing('ai', [
  'openrouter',
  'prompt-shield',
  'prd-decomposer',
  'ears-validator',
  'strategic-frameworks',
  'product-manager',
  'ux-research',
]);

console.log('[S07] S07 Domain decoupling complete.');
