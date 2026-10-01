import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";

export interface ProductImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  importUrl: string;
  onImportUrlChange: (url: string) => void;
  importTone: "profissional" | "persuasivo" | "tecnico" | "minimalista";
  onImportToneChange: (tone: "profissional" | "persuasivo" | "tecnico" | "minimalista") => void;
  onSubmit: () => Promise<void>;
  isImporting: boolean;
}

export function ProductImportSheet({
  open,
  onOpenChange,
  entityName,
  importUrl,
  onImportUrlChange,
  importTone,
  onImportToneChange,
  onSubmit,
  isImporting,
}: ProductImportSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full max-sm:w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <span>Importar {entityName} por Link</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            Cole o link de uma página da web ou catálogo online para preencher as informações automaticamente com IA.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">Link da Página ou Catálogo Online</Label>
            <Input
              value={importUrl}
              onChange={(e) => onImportUrlChange(e.target.value)}
              placeholder="https://exemplo.com.br/item"
              className="h-11 text-xs rounded-lg"
              disabled={isImporting}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Tom da Descrição</Label>
            <Select
              value={importTone}
              onValueChange={(v: any) => onImportToneChange(v)}
              disabled={isImporting}
            >
              <SelectTrigger className="h-11 text-xs rounded-lg">
                <SelectValue placeholder="Selecione o tom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional & Confiável</SelectItem>
                <SelectItem value="persuasivo">Persuasivo & Comercial</SelectItem>
                <SelectItem value="tecnico">Técnico & Detalhado</SelectItem>
                <SelectItem value="minimalista">Minimalista & Direto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button /* focus-visible: */
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)} /* focus-visible:ring-2 */
            disabled={isImporting}
            className="rounded-lg text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cancelar
          </Button>
          <Button /* focus-visible: */
            type="button"
            onClick={onSubmit} /* focus-visible:ring-2 */
            disabled={isImporting || (!importUrl.trim())}
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 px-6 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isImporting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                <span>Importando...</span>
              </>
            ) : (
              <span>Importar Dados</span>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
