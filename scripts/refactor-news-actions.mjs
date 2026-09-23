import fs from 'fs';
const path = 'src/routes/workspace.noticias.index.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add CrudActionsMenu import
if (!content.includes('CrudActionsMenu')) {
  content = content.replace(
    'import { EmptyState } from "@/components/state/states";',
    'import { EmptyState } from "@/components/state/states";\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
  );
  console.log('CrudActionsMenu import added to workspace.noticias');
}

// 2. Replace the scattered buttons with CrudActionsMenu
const oldButtonsRegex = /<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">[\s\S]*?<Button\s+variant="ghost"\s+size="icon"\s+onClick=\{\(\) => handleDelete\(art\.id\)\}[\s\S]*?<\/Button>\s*<\/div>/;

const newButtons = `<div className="shrink-0 self-end sm:self-center">
                    <CrudActionsMenu
                      entityName="Matéria"
                      viewUrl={\`/noticias/\${art.slug}\`}
                      customActions={[
                        {
                          label: "Gerar Carrossel (Studio)",
                          icon: Sparkles,
                          onClick: () => handleGenerateCarouselFromArticle(art),
                        },
                      ]}
                      onDelete={() => handleDelete(art.id)}
                      deleteConfirmTitle="Excluir Notícia?"
                      deleteConfirmDescription={\`Deseja realmente excluir "\${art.title}"? Esta ação removerá a publicação do portal.\`}
                    />
                  </div>`;

if (oldButtonsRegex.test(content)) {
  content = content.replace(oldButtonsRegex, newButtons);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Successfully replaced scattered buttons with CrudActionsMenu in workspace.noticias.index.tsx!');
} else {
  console.log('Regex did not match old scattered buttons');
}
