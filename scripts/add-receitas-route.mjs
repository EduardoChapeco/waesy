import fs from 'fs';
const path = 'src/lib/routes.ts';
let content = fs.readFileSync(path, 'utf-8');

if (!content.includes('path: "/receitas"')) {
  const target = 'path: "/diretorio",';
  const addition = `path: "/receitas",
    label: "Receitas",
    description: "Guia de receitas culinárias e gastronomia local",
    audience: "public",
    roles: ["visitor"],
    phase: 1,
  },
  {
    `;
  content = content.replace(target, addition + target);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Added /receitas to src/lib/routes.ts');
} else {
  console.log('/receitas already in src/lib/routes.ts');
}
