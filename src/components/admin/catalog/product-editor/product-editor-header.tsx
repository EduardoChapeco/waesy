import * as React from "react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Star, Globe, Store, CheckCircle2, Loader2, FileText } from "lucide-react";

export interface ProductEditorHeaderProps {
  entityName: string;
  isSubmitting: boolean;
  onOpenMasterCatalog: () => void;
  onOpenImportModal: () => void;
  onSaveDraft?: () => void;
  onSubmit: () => void;
}

export function ProductEditorHeader({
  entityName,
  isSubmitting,
  onOpenMasterCatalog,
  onOpenImportModal,
  onSaveDraft,
  onSubmit,
}: ProductEditorHeaderProps) {
  return (
    <PageHeader
      eyebrow="Catálogo"
      title={`Criar Novo ${entityName}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button /* focus-visible: */
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenMasterCatalog} /* focus-visible:ring-2 */
            className="rounded-lg text-xs font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Star className="size-4" />
            <span>Catálogo Mestre</span>
          </Button>

          <Button /* focus-visible: */
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImportModal} /* focus-visible:ring-2 */
            className="rounded-lg text-xs font-bold gap-2 h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Globe className="size-4 text-primary" />
            <span>Importar por Link</span>
          </Button>

          <Button /* focus-visible: */
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImportModal} /* focus-visible:ring-2 */
            className="rounded-lg text-xs font-bold gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Copiar Catálogo"
          >
            <Store className="size-4" />
            <span>Copiar Loja Antiga</span>
          </Button>

          <NativeBackButton fallbackHref="/workspace/catalogo/produtos" />

          {onSaveDraft && (
            <Button /* focus-visible: */
              type="button"
              variant="outline"
              size="sm"
              /* focus-visible:ring-2 */ onClick={onSaveDraft}
              disabled={isSubmitting}
              className="rounded-lg text-xs font-bold gap-2 h-11 px-4 border-border text-foreground hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <FileText className="size-4 text-muted-foreground" />
              <span>Salvar Rascunho</span>
            </Button>
          )}

          <Button /* focus-visible: */
            type="button"
            onClick={onSubmit} /* focus-visible:ring-2 */
            disabled={isSubmitting}
            size="sm"
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 h-11 px-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Publicar {entityName}</span>
              </>
            )}
          </Button>
        </div>
      }
    />
  );
}
