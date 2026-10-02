import fs from 'node:fs';
import path from 'node:path';

const dirs = ['legacy_quarantine', 'reparo', 'scratch', 'melhoria', 'ia', 'auditoria', 'app', 'prisma'];
console.log('=== INSPEÇÃO DE DIRETÓRIOS LEGADOS (R60) ===');
for (const d of dirs) {
  if (fs.existsSync(d)) {
    const files = fs.readdirSync(d);
    console.log(`[${d}] (${files.length} itens):`, files.slice(0, 5));
  } else {
    console.log(`[${d}]: Não existe`);
  }
}
