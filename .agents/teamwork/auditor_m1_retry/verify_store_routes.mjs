import fs from 'fs';
import { parseJsxTags, lintSource } from '../../../scripts/design-lint.mjs';

const routes = [
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx'
];

console.log('Forensic Independent Verification of Store Routes:');

let totalInteractive = 0;
let sub44Violations = 0;

for (const route of routes) {
  const content = fs.readFileSync(route, 'utf-8');
  const tags = parseJsxTags(content);
  let routeInteractive = 0;
  let routeSub44 = 0;

  for (const tag of tags) {
    const isNativeButton = tag.tagName.toLowerCase() === 'button';
    const isDsButton = tag.tagName === 'Button' || tag.tagName.endsWith('Button');
    const isLink = tag.tagName === 'a' || tag.tagName === 'Link' || tag.tagName === 'NavLink';
    const hasOnClick = /\bonClick\s*=/.test(tag.tagContent);

    if (isNativeButton || isDsButton || isLink || hasOnClick) {
      routeInteractive++;
      totalInteractive++;

      // Check sub-44px classes:
      // h-1 to h-10, size-1 to size-10, min-h-1 to min-h-10
      const sub44Match = tag.tagContent.match(/\b(?:h|size|min-h)-(?:[1-9]|10|0\.5|1\.5|2\.5|3\.5)\b/);
      if (sub44Match) {
        console.log(`[VIOLATION] ${route}:${tag.line} <${tag.tagName}> matches ${sub44Match[0]}`);
        console.log(`            Content: ${tag.tagContent.replace(/\s+/g, ' ').slice(0, 100)}`);
        routeSub44++;
        sub44Violations++;
      }
    }
  }

  // Also run lintSource directly on the file
  const lintViolations = lintSource(content, route);
  const dl14InRoute = lintViolations.filter(v => v.id === 'DL-14');

  console.log(`Route: ${route}`);
  console.log(`  Interactive elements found: ${routeInteractive}`);
  console.log(`  Sub-44px targets found: ${routeSub44}`);
  console.log(`  DL-14 violations from lintSource: ${dl14InRoute.length}`);
}

console.log('\n--- TOTALS ---');
console.log(`Total interactive elements: ${totalInteractive}`);
console.log(`Total sub-44px violations: ${sub44Violations}`);
