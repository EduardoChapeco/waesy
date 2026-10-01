import fs from 'node:fs';

const p = 'src/routes/admin-master.simlabs.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'Executar Nova Simulação de Mercado com IA',
  'Nova Simulação de Mercado'
);
fs.writeFileSync(p, c, 'utf8');
console.log('Cleaned admin-master.simlabs.tsx');
