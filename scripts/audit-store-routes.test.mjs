import fs from 'fs';
import { parseJsxTags } from './design-lint.mjs';

const files = [
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx'
];

console.log('======================================================================');
console.log('AUDITORIA EMPÍRICA DE TOUCH TARGETS (< 44px) NAS 4 ROTAS DE LOJA');
console.log('======================================================================');

const smallHeightRegex = /\b(?:h|size|min-h)-(?:[1-9]|10|0\.5|1\.5|2\.5|3\.5)\b/;
const h11Regex = /\b(?:h|size|min-h)-(?:11|12|13|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)\b|\bh-full\b|\bmin-h-full\b|\bsize-full\b/;

let totalIssues = 0;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const tags = parseJsxTags(content);
  console.log(`\nArquivo: ${f}`);
  let fileIssues = 0;

  for (const t of tags) {
    const isInteractive =
      t.tagName === 'button' ||
      t.tagName === 'Button' ||
      t.tagName === 'Link' ||
      t.tagName === 'a' ||
      t.tagName === 'ProtectedContactButton' ||
      /\bonClick\s*=/.test(t.tagContent);

    if (!isInteractive) continue;

    const hasSmall = smallHeightRegex.test(t.tagContent);
    const hasH11 = h11Regex.test(t.tagContent);
    const hasSizeSm = /size=["']sm["']/.test(t.tagContent);
    const hasSizeIcon = /size=["']icon["']/.test(t.tagContent);
    const hasSizeIconSm = /size=["']iconSm["']/.test(t.tagContent);

    if (hasSmall) {
      console.log(`  [SUB-44PX CLASS] Linha ${t.line} <${t.tagName}>: ${t.tagContent.replace(/\s+/g, ' ').trim().slice(0, 160)}`);
      fileIssues++;
      totalIssues++;
    } else if (t.tagName === 'Button') {
      if (hasSizeSm && !hasH11) {
        console.log(`  [BUTTON SIZE=SM (36px)] Linha ${t.line} <${t.tagName}>: ${t.tagContent.replace(/\s+/g, ' ').trim().slice(0, 160)}`);
        fileIssues++;
        totalIssues++;
      } else if (hasSizeIconSm && !hasH11) {
        console.log(`  [BUTTON SIZE=ICONSM (32px)] Linha ${t.line} <${t.tagName}>: ${t.tagContent.replace(/\s+/g, ' ').trim().slice(0, 160)}`);
        fileIssues++;
        totalIssues++;
      }
    }
  }

  console.log(`  Subtotal de alvos sub-44px em ${f}: ${fileIssues}`);
}

console.log('----------------------------------------------------------------------');
console.log(`TOTAL GERAL DE POTENCIAIS ALVOS SUB-44PX: ${totalIssues}`);
console.log('======================================================================');
