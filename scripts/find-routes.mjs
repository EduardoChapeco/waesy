import fs from 'fs';
const content = fs.readFileSync('src/lib/routes.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('path: "/noticias"') || l.includes('path: "/turismo"') || l.includes('path: "/classificados"')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
