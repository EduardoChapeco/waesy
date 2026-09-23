import fs from 'fs';
const path = 'src/routes/workspace.eventos.index.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add CrudActionsMenu import
if (!content.includes('CrudActionsMenu')) {
  content = content.replace(
    'import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";',
    'import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";\nimport { CrudActionsMenu } from "@/components/ui/crud-actions-menu";'
  );
  console.log('CrudActionsMenu import added to eventos.index');
}

// 2. Replace event card actions
const oldActionsRegex = /\{\/\* Ações Rápidas do Evento \*\/\}[\s\S]*?<div className="p-4 pt-0 flex items-center gap-2 border-t border-border\/40 mt-3 pt-3">[\s\S]*?<\/div>\s*<\/Card>/;

const newActions = `{/* Ações Rápidas do Evento (Apple HIG / Padrão Silencioso) */}
                  <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-border/40 mt-3 pt-3">
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Link to="/workspace/eventos/$id" params={{ id: event.id }}>
                        <Ticket className="size-3.5" />
                        <span>Lotes & Ingressos</span>
                      </Link>
                    </Button>

                    <CrudActionsMenu
                      entityName="Evento"
                      editUrl={\`/workspace/eventos/\${event.id}\`}
                      viewUrl={\`/evento/\${event.id}\`}
                      customActions={[
                        {
                          label: "Portaria & Validador QR Code",
                          icon: QrCode,
                          href: \`/workspace/eventos/\${event.id}/checkin\`,
                        },
                      ]}
                      onDelete={() => {
                        toast.info("Para desativar este evento, altere o status dos lotes para encerrado.");
                      }}
                      deleteConfirmTitle="Encerrar Evento?"
                      deleteConfirmDescription={\`Deseja realmente desativar as vendas de ingressos para "\${event.title}"?\`}
                    />
                  </div>
                </Card>`;

if (oldActionsRegex.test(content)) {
  content = content.replace(oldActionsRegex, newActions);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Successfully refactored event card actions with CrudActionsMenu!');
} else {
  console.log('Regex did not match old event actions');
}
