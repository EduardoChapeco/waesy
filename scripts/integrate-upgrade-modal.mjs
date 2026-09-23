import fs from 'fs';
const path = 'src/routes/workspace.noticias.index.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add AiCurationUpgradeModal import
if (!content.includes('AiCurationUpgradeModal')) {
  content = content.replace(
    'import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";',
    'import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";\nimport { AiCurationUpgradeModal } from "@/components/commerce/ai-curation-upgrade-modal";'
  );
  console.log('AiCurationUpgradeModal import added');
}

// 2. Add isUpgradeModalOpen state
if (!content.includes('isUpgradeModalOpen')) {
  content = content.replace(
    'const [isBatchProcessing, setIsBatchProcessing] = useState(false);',
    'const [isBatchProcessing, setIsBatchProcessing] = useState(false);\n  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);'
  );
  console.log('isUpgradeModalOpen state added');
}

// 3. Add BYOK button in batch actions bar
const batchBarAnchor = '<div className="flex items-center gap-2">';
const byokTriggerButton = `<div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Configurar Chave de IA própria (BYOK) ou Plano"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Curadoria IA (BYOK)</span>
                  </Button>`;

if (content.includes(batchBarAnchor) && !content.includes('Curadoria IA (BYOK)')) {
  content = content.replace(batchBarAnchor, byokTriggerButton);
  console.log('BYOK trigger button added to batch bar');
}

// 4. Render AiCurationUpgradeModal before closing main container
const closingAnchor = '</div>\n  );\n}';
const modalCode = `
      {/* Modal de Desbloqueio de Curadoria IA & BYOK */}
      <AiCurationUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}`;

if (!content.includes('<AiCurationUpgradeModal')) {
  content = content.replace(/\s*<\/div>\s*\);\s*\}\s*$/, modalCode);
  console.log('AiCurationUpgradeModal dialog rendered');
}

fs.writeFileSync(path, content, 'utf-8');
console.log('Successfully integrated AiCurationUpgradeModal into workspace.noticias.index.tsx!');
