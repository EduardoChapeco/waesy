import fs from 'fs';
import path from 'path';

const files = [
  'src/routes/_store.diretorio.index.tsx',
  'src/routes/_store.empregos.index.tsx',
  'src/routes/_store.eventos.tsx',
  'src/routes/_store.noticias.index.tsx'
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  console.log(`=== ${f} ===`);
  // Let's check native buttons or onClick elements in this file
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('<button') || line.includes('onClick')) {
      console.log(`L${idx+1}: ${line.trim()}`);
    }
  });
}
