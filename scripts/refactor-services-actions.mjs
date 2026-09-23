import fs from 'fs';
const path = 'src/routes/workspace.agenda.servicos.index.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add CrudActionsMenu import
if (!content.includes('CrudActionsMenu')) {
  content = content.replace(
    'import { EmptyState } from "@/components/state/states";',
    'import { EmptyState } from "@/components/state/states";\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
  );
  console.log('CrudActionsMenu import added to servicos.index');
}

// 2. Replace actions cell content
const oldActionsRegex = /<TableCell className="text-right">[\s\S]*?<div className="flex items-center justify-end gap-1">[\s\S]*?<\/div>\s*<\/TableCell>/;

const newActions = `<TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <CrudActionsMenu
                        entityName="Serviço"
                        onEdit={() => handleOpenEdit(service)}
                        onArchive={() => deleteMutation.mutate(service.id)}
                        archiveLabel="Arquivar Serviço"
                        onDelete={() => deleteMutation.mutate(service.id)}
                        deleteConfirmTitle="Arquivar Serviço?"
                        deleteConfirmDescription={\`Deseja realmente arquivar o serviço "\${service.title}"? Ele deixará de ser exibido para agendamentos.\`}
                      />
                    </div>
                  </TableCell>`;

if (oldActionsRegex.test(content)) {
  content = content.replace(oldActionsRegex, newActions);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Successfully refactored services table actions with CrudActionsMenu!');
} else {
  console.log('Regex did not match old actions cell');
}
