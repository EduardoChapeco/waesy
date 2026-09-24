const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. Clean _store.buscar.tsx
const buscarPath = path.join(root, 'src/routes/_store.buscar.tsx');
let buscar = fs.readFileSync(buscarPath, 'utf8');
buscar = buscar.replace(/\bshadow-2xs\b/g, '');
buscar = buscar.replace(/\bshadow-xs\b/g, '');
buscar = buscar.replace(/\bshadow-sm\b/g, '');
buscar = buscar.replace(/class(Name)?="([^"]+)"/g, (match, p1, classes) => {
  const cleaned = classes.split(/\s+/).filter(Boolean).join(' ');
  return `class${p1 || ''}="${cleaned}"`;
});
fs.writeFileSync(buscarPath, buscar);
console.log('✅ Cleaned _store.buscar.tsx');

// 2. Clean _store.conta.classificados.novo.tsx
const novoPath = path.join(root, 'src/routes/_store.conta.classificados.novo.tsx');
let novo = fs.readFileSync(novoPath, 'utf8');

// Strip all shadows
novo = novo.replace(/\bshadow-2xs\b/g, '');
novo = novo.replace(/\bshadow-xs\b/g, '');
novo = novo.replace(/\bshadow-sm\b/g, '');
novo = novo.replace(/\bshadow-md\b/g, '');
novo = novo.replace(/\bshadow-lg\b/g, '');

// Clean saturated payment method icons to clean neutral tokens
novo = novo.replace(/bg-emerald-600 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-blue-600 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-slate-700 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-amber-600 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-orange-600 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-purple-600 text-white/g, 'bg-foreground text-background');
novo = novo.replace(/bg-teal-600 text-white/g, 'bg-foreground text-background');

// Clean up whitespace inside class strings
novo = novo.replace(/class(Name)?="([^"]+)"/g, (match, p1, classes) => {
  const cleaned = classes.split(/\s+/).filter(Boolean).join(' ');
  return `class${p1 || ''}="${cleaned}"`;
});
fs.writeFileSync(novoPath, novo);
console.log('✅ Cleaned _store.conta.classificados.novo.tsx');

console.log('🎉 FASE 4 PURIFICATION: Search and Create forms flattened and purified!');
