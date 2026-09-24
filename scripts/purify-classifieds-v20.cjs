const fs = require('fs');
const path = require('path');

// 1. Purify universal-classified-showcase.tsx
const showcasePath = path.resolve(__dirname, '../src/components/classifieds/universal-classified-showcase.tsx');
let sc = fs.readFileSync(showcasePath, 'utf8');

sc = sc.replace(/ shadow-2xs/g, '');
sc = sc.replace(/ shadow-xs/g, '');
sc = sc.replace(/ shadow-md/g, '');
sc = sc.replace(/ backdrop-blur-sm/g, '');
sc = sc.replace(/ backdrop-blur-md/g, '');
sc = sc.replace(/bg-black\/60/g, 'bg-black/75');
sc = sc.replace(/bg-black\/40/g, 'bg-black/70');
sc = sc.replace(/bg-background\/90/g, 'bg-background/95 border border-border/40 text-foreground');

fs.writeFileSync(showcasePath, sc, 'utf8');
console.log('✅ Purified universal-classified-showcase.tsx');

// 2. Purify _store.classificados.index.tsx
const classIndexPath = path.resolve(__dirname, '../src/routes/_store.classificados.index.tsx');
let ci = fs.readFileSync(classIndexPath, 'utf8');

ci = ci.replace(/ shadow-2xs/g, '');
ci = ci.replace(/ shadow-xs/g, '');
ci = ci.replace(/ hover:shadow-xs/g, '');
ci = ci.replace(/ backdrop-blur-sm/g, '');
ci = ci.replace(/ backdrop-blur-none/g, '');

// Clean WhatsApp button styling in Mode 3
ci = ci.replace(
  'className="h-8 px-2.5 rounded-xl text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"',
  'className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/50 text-foreground hover:bg-muted/50 cursor-pointer"'
);

fs.writeFileSync(classIndexPath, ci, 'utf8');
console.log('✅ Purified _store.classificados.index.tsx');
