import fs from 'node:fs';

// 1. Clean src/components/tourism/new-travel-proposal-sheet.tsx
const p1 = 'src/components/tourism/new-travel-proposal-sheet.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
const target1 = `Preencha os campos abaixo para digitar manualmente ou clique em "+ Criar Cliente Rápido".`;
if (c1.includes(target1)) {
  c1 = c1.replace(
    /<div className="p-4 text-center text-xs text-muted-foreground space-y-1">[\s\S]*?Preencha os campos abaixo para digitar manualmente ou clique em "\+ Criar Cliente Rápido"\.[\s\S]*?<\/div>/,
    `<div className="p-4 text-center text-xs text-muted-foreground">\n\t\t\t\t\t\t\t<p>Nenhum cliente com "{customerSearch}".</p>\n\t\t\t\t\t\t</div>`
  );
  fs.writeFileSync(p1, c1, 'utf8');
  console.log('Cleaned new-travel-proposal-sheet.tsx');
} else {
  console.log('Target 1 not found');
}

// 2. Clean src/routes/workspace.orcamentos.novo.tsx
const p2 = 'src/routes/workspace.orcamentos.novo.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
const target2 = `Preencha os campos abaixo manualmente para novo cliente.`;
if (c2.includes(target2)) {
  c2 = c2.replace(
    /Nenhum cliente cadastrado encontrado com "\{clientSearch\}"\. Preencha os campos abaixo manualmente para novo cliente\./,
    `Nenhum cliente com "{clientSearch}".`
  );
  fs.writeFileSync(p2, c2, 'utf8');
  console.log('Cleaned workspace.orcamentos.novo.tsx');
} else {
  console.log('Target 2 not found');
}
