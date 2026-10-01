import fs from 'node:fs';

const p = 'src/routes/workspace.pedidos.index.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'Separação de Gôndola e Conferência de Itens',
  'Separação e Conferência'
);
c = c.replace(
  'Confira cada produto na prateleira antes de fechar a embalagem de entrega',
  'Conferência de itens para entrega'
);
fs.writeFileSync(p, c, 'utf8');
console.log('Cleaned workspace.pedidos.index.tsx');
