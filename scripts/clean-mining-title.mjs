import fs from 'node:fs';

const p = 'src/routes/admin-master.mining.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'title="Transformar edital em pauta jornalística com 1 clique"',
  'title="Gerar Pauta"'
);
c = c.replace(
  'text-[11px] font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all',
  'text-xs font-semibold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors'
);
fs.writeFileSync(p, c, 'utf8');
console.log('Cleaned admin-master.mining.tsx');
