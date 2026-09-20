const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/routes/_store.index.tsx');
const destPath = path.resolve('src/routes/_store.explorar.tsx');

const content = fs.readFileSync(srcPath, 'utf8');
const updated = content
  .replace('createFileRoute("/_store/")', 'createFileRoute("/_store/explorar")')
  .replace(
    'title: "Waesy — Comunidade, Negócios e Serviços Locais"',
    'title: "Waesy — Explorar Vitrine Comunitária & Negócios Locais"'
  );

fs.writeFileSync(destPath, updated, 'utf8');
console.log('Successfully created src/routes/_store.explorar.tsx! File size:', fs.statSync(destPath).size);
