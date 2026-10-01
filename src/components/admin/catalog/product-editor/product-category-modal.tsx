import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProductCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryLabel: string;
  categoryName: string;
  onCategoryNameChange: (name: string) => void;
  onSubmit: () => Promise<void>;
  isCreating: boolean;
}

export function ProductCategoryModal({
  open,
  onOpenChange,
  categoryLabel,
  categoryName,
  onCategoryNameChange,
  onSubmit,
  isCreating,
}: ProductCategoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Nova {categoryLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre rapidamente uma nova categoria ou tipo de destino diretamente no catálogo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Nome</Label>
            <Input
              value={categoryName}
              onChange={(e) => onCategoryNameChange(e.target.value)}
              placeholder="Ex: Resorts All Inclusive, Ecoturismo, Nordeste, Internacional"
              className="h-11 text-xs rounded-lg bg-background"
              disabled={isCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button /* focus-visible: */
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)} /* focus-visible:ring-2 */
            disabled={isCreating}
            className="rounded-lg text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cancelar
          </Button>
          <Button /* focus-visible: */
            type="button"
            size="sm"
            onClick={onSubmit} /* focus-visible:ring-2 */
            disabled={isCreating || (!categoryName.trim())}
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isCreating ? "Criando..." : "Salvar & Selecionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
