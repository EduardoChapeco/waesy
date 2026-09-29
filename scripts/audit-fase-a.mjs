import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src');

function getAllFiles(dir, exts = ['.tsx', '.ts', '.jsx', '.js', '.css']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(SRC_DIR);
console.log(`Total source files in src: ${allSrcFiles.length}`);

// Pre-read all file contents into memory
const fileData = allSrcFiles.map(file => ({
  file,
  content: fs.readFileSync(file, 'utf8'),
  isCss: file.endsWith('.css')
}));

let hexMatches = 0;
let rgbMatches = 0;
const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const rgbRegex = /\b(?:rgb|hsl)a?\([^)]+\)/g;

let arbitraryClasses = 0;
const arbitraryRegex = /\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g;

let importantMatches = 0;
const importantRegex = /!important|!\s*[a-zA-Z-]+/g;

let inlineStylesColorOrSpacing = 0;
const inlineStyleRegex = /style\s*=\s*\{\{\s*[^}]*(?:color|background|padding|margin|width|height)[^}]*\}\}/gi;

const fontSizes = new Set();
const fontWeights = new Set();
const radiuses = new Set();
const shadows = new Set();
const zIndexes = new Set();

const textSizeRegex = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[^\]]+\])\b/g;
const fontWeightRegex = /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[[^\]]+\])\b/g;
const roundedRegex = /\brounded(?:-(none|xs|sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))?\b/g;
const shadowRegex = /\bshadow(?:-(none|xs|sm|md|lg|xl|2xl|inner|\[[^\]]+\]))?\b/g;
const zIndexRegex = /\bz-(0|10|20|30|40|50|auto|\[[^\]]+\])\b/g;

let smallTouchTargets = 0;
const smallTargetRegex = /\b(?:h|size)-(1|2|3|4|5|6|7|8|9|10|3\.5|2\.5|1\.5|0\.5)\b/g;

let onClickCount = 0;
let focusVisibleCount = 0;

let literalWhiteBlack = 0;
const literalWhiteBlackRegex = /\b(?:text|bg)-(white|black)\b/g;

let animAbove300ms = 0;
const animAbove300msRegex = /\bduration-(?:[4-9]\d{2}|\d{4,})\b/g;

let genericTransitions = 0;
const genericTransitionRegex = /\btransition-all\b/g;

let dataComponentsCount = 0;
let missingSkeletonCount = 0;
let missingEmptyCount = 0;

for (const { file, content, isCss } of fileData) {
  if (!isCss) {
    const h = content.match(hexRegex);
    if (h) hexMatches += h.length;
    const r = content.match(rgbRegex);
    if (r) rgbMatches += r.length;
  }

  const arb = content.match(arbitraryRegex);
  if (arb) arbitraryClasses += arb.length;

  const imp = content.match(importantRegex);
  if (imp) importantMatches += imp.length;

  const inl = content.match(inlineStyleRegex);
  if (inl) inlineStylesColorOrSpacing += inl.length;

  let m;
  while ((m = textSizeRegex.exec(content)) !== null) fontSizes.add(m[0]);
  while ((m = fontWeightRegex.exec(content)) !== null) fontWeights.add(m[0]);
  while ((m = roundedRegex.exec(content)) !== null) radiuses.add(m[0]);
  while ((m = shadowRegex.exec(content)) !== null) shadows.add(m[0]);
  while ((m = zIndexRegex.exec(content)) !== null) zIndexes.add(m[0]);

  const sm = content.match(smallTargetRegex);
  if (sm && (content.includes('onClick') || content.includes('<button') || content.includes('<Button'))) {
    smallTouchTargets += sm.length;
  }

  const ocl = content.match(/\bonClick\b/g);
  if (ocl) onClickCount += ocl.length;

  const fv = content.match(/\bfocus-visible:/g);
  if (fv) focusVisibleCount += fv.length;

  const lwb = content.match(literalWhiteBlackRegex);
  if (lwb) literalWhiteBlack += lwb.length;

  const a300 = content.match(animAbove300msRegex);
  if (a300) animAbove300ms += a300.length;

  const gt = content.match(genericTransitionRegex);
  if (gt) genericTransitions += gt.length;

  if (file.includes('view') || file.includes('page') || file.includes('list') || file.includes('table')) {
    dataComponentsCount++;
    const hasSkeleton = content.includes('Skeleton') || content.includes('loading') || content.includes('animate-pulse');
    if (!hasSkeleton) missingSkeletonCount++;
    const hasEmpty = content.includes('empty') || content.includes('Empty') || content.includes('Nenhum') || content.includes('não encontrad');
    if (!hasEmpty) missingEmptyCount++;
  }
}

// Check declared CSS variables in styles.css
const stylesCss = fs.readFileSync(path.resolve('src/styles.css'), 'utf8');
const cssVarDeclRegex = /--([a-zA-Z0-9_-]+):/g;
const declaredVars = new Set();
let varMatch;
while ((varMatch = cssVarDeclRegex.exec(stylesCss)) !== null) {
  declaredVars.add(varMatch[1]);
}

// Build one concatenated string of all non-styles.css files
const allOtherContents = fileData
  .filter(f => !f.file.endsWith('styles.css'))
  .map(f => f.content)
  .join('\n');

const deadVars = [];
for (const v of declaredVars) {
  if (!allOtherContents.includes(`--${v}`) && !allOtherContents.includes(`var(--${v})`)) {
    deadVars.push(v);
  }
}

const results = {
  totalFiles: allSrcFiles.length,
  coresHardcoded: hexMatches + rgbMatches,
  classesArbitrarias: arbitraryClasses,
  important: importantMatches,
  inlineStylesColorOrSpacing,
  cardinalidadeFontSizes: Array.from(fontSizes).sort(),
  cardinalidadeFontWeights: Array.from(fontWeights).sort(),
  cardinalidadeRadiuses: Array.from(radiuses).sort(),
  cardinalidadeShadows: Array.from(shadows).sort(),
  cardinalidadeZIndexes: Array.from(zIndexes).sort(),
  smallTouchTargets,
  onClickCount,
  focusVisibleCount,
  literalWhiteBlack,
  animAbove300ms,
  genericTransitions,
  dataComponentsCount,
  missingSkeletonCount,
  missingEmptyCount,
  totalDeclaredVars: declaredVars.size,
  deadVarsCount: deadVars.length,
  deadVars: deadVars
};

fs.writeFileSync(path.resolve('scripts/audit-results.json'), JSON.stringify(results, null, 2));
console.log('AUDIT_COMPLETE_JSON:' + JSON.stringify({
  totalFiles: results.totalFiles,
  coresHardcoded: results.coresHardcoded,
  classesArbitrarias: results.classesArbitrarias,
  important: results.important,
  inlineStylesColorOrSpacing: results.inlineStylesColorOrSpacing,
  numFontSizes: results.cardinalidadeFontSizes.length,
  numFontWeights: results.cardinalidadeFontWeights.length,
  numRadiuses: results.cardinalidadeRadiuses.length,
  numShadows: results.cardinalidadeShadows.length,
  numZIndexes: results.cardinalidadeZIndexes.length,
  smallTouchTargets: results.smallTouchTargets,
  onClickCount: results.onClickCount,
  focusVisibleCount: results.focusVisibleCount,
  literalWhiteBlack: results.literalWhiteBlack,
  animAbove300ms: results.animAbove300ms,
  genericTransitions: results.genericTransitions,
  totalDeclaredVars: results.totalDeclaredVars,
  deadVarsCount: results.deadVarsCount
}));
