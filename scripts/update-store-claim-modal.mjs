import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/components/commerce/canonical-store-profile-view.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('File size:', content.length);

// 1. Add ClaimBusinessModal import if not present
if (!content.includes('ClaimBusinessModal')) {
  content = content.replace(
    'import { toast } from "sonner";',
    'import { ClaimBusinessModal } from "@/components/commerce/claim-business-modal";\nimport { toast } from "sonner";'
  );
  console.log('ClaimBusinessModal import added');
}

// 2. Add isClaimModalOpen state
if (!content.includes('isClaimModalOpen')) {
  content = content.replace(
    'const [isSocialStudioOpen, setIsSocialStudioOpen] = useState(false);',
    'const [isSocialStudioOpen, setIsSocialStudioOpen] = useState(false);\n  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);'
  );
  console.log('isClaimModalOpen state added');
}

// 3. Update the claim banner and add ClaimBusinessModal dialog
const oldBannerRegex = /\{!\s*isOwner\s*&&\s*Boolean\(store\?\.is_ghost\s*\|\|\s*settings\?\.is_ghost\)\s*&&[\s\S]*?<\/div>\s*\)\}/;

const newBanner = `{!isOwner && Boolean(
        store?.is_ghost ||
        settings?.is_ghost ||
        store?.is_crawled ||
        (source === "directory" && !store?.is_verified)
      ) && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>Você é proprietário(a) desta empresa?</span>
                <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {store?.is_verified ? "Perfil Verificado" : "Aguardando Reivindicação"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Reivindique o perfil oficial gratuitamente para gerenciar cardápio, produtos, pedidos e horários.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-9 sm:h-10 px-4 rounded-xl font-medium text-xs sm:text-sm shrink-0 w-full sm:w-auto cursor-pointer border-amber-500/40 hover:bg-amber-500/15 text-foreground"
            onClick={() => setIsClaimModalOpen(true)}
          >
            Reivindicar Negócio
          </Button>
        </div>
      )}

      {/* Modal de Reivindicação de Negócio */}
      <ClaimBusinessModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        listingId={store?.id || ""}
        businessName={store?.business_name || store?.name || "Esta Empresa"}
        onSuccess={() => {
          setIsClaimModalOpen(false);
          toast.success("Solicitação enviada com sucesso! Atualizando...");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />`;

if (oldBannerRegex.test(content)) {
  content = content.replace(oldBannerRegex, newBanner);
  console.log('Banner replaced with modal trigger');
} else {
  console.log('Regex did not match old banner!');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('File successfully updated!');
