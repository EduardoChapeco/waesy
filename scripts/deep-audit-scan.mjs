import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('src');
console.log('Total source files:', files.length);

const mockFindings = [];
const fallbackArrayFindings = [];
const unsplashFindings = [];
const urlUploadFindings = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('unsplash.com') || l.includes('pexels.com') || l.includes('images.unsplash')) {
      unsplashFindings.push({ file: f, line: idx + 1, snippet: l.trim().slice(0, 100) });
    }
    if (l.match(/const\s+(?:MOCK_|mock|FALLBACK_|fallback)[A-Z0-9_]*\s*=/i) || l.match(/\[\s*\{\s*id:\s*["'](?:mock|fake|demo|test)/i)) {
      mockFindings.push({ file: f, line: idx + 1, snippet: l.trim().slice(0, 100) });
    }
    if (l.match(/\.catch\(\(\)\s*=>\s*\[/i) || l.match(/\|\|\s*\[\s*\{\s*id:/i)) {
      fallbackArrayFindings.push({ file: f, line: idx + 1, snippet: l.trim().slice(0, 100) });
    }
    if (l.match(/placeholder.*http/i) || l.match(/Input.*placeholder=.*https?:\/\//i) || l.match(/URL da imagem/i)) {
      urlUploadFindings.push({ file: f, line: idx + 1, snippet: l.trim().slice(0, 100) });
    }
  });
});

console.log('--- 1. UNSPASH / STOCK MOCK FINDINGS (' + unsplashFindings.length + ') ---');
unsplashFindings.slice(0, 20).forEach(f => console.log(f.file + ':' + f.line + ' -> ' + f.snippet));

console.log('\n--- 2. MOCK CONSTANTS / FAKE DATA FINDINGS (' + mockFindings.length + ') ---');
mockFindings.slice(0, 20).forEach(f => console.log(f.file + ':' + f.line + ' -> ' + f.snippet));

console.log('\n--- 3. FALLBACK SYNTHETIC ARRAYS IN .catch() (' + fallbackArrayFindings.length + ') ---');
fallbackArrayFindings.slice(0, 20).forEach(f => console.log(f.file + ':' + f.line + ' -> ' + f.snippet));

console.log('\n--- 4. URL INPUT INSTEAD OF BUCKET UPLOAD (' + urlUploadFindings.length + ') ---');
urlUploadFindings.slice(0, 20).forEach(f => console.log(f.file + ':' + f.line + ' -> ' + f.snippet));
