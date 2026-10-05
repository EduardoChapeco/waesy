const fs = require('fs');
const path = require('path');

const targetFiles = [
  "admin-master.marca.tsx",
  "api.auth.marketplace.callback.ts",
  "workspace.builder.$documentId.editor.tsx",
  "workspace.captacao.index.tsx",
  "workspace.cms.paginas.index.tsx",
  "workspace.configuracoes.sessoes.tsx",
  "workspace.financeiro.faturas.tsx",
  "workspace.marketing.formularios.tsx",
  "_store.checkout.tsx",
  "_store.conta.classificados.novo.tsx",
  "_store.explorar.tsx",
  "_store.index.tsx",
  "_store.membro.$id.tsx",
  "_store.places.$placeSlug.tsx"
];

for (const f of targetFiles) {
  const filePath = path.join('src/routes', f);
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  console.log(`\n=== ${f} ===`);
  lines.forEach((l, idx) => {
    if (/\bmock\b/i.test(l)) {
      console.log(`  Line ${idx + 1}: ${l.trim()}`);
    }
  });
}
