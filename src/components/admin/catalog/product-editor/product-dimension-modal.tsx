import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProductDimensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensionName: string;
  onDimensionNameChange: (name: string) => void;
  dimensionValue: string;
  onDimensionValueChange: (val: string) => void;
  onSubmit: () => void;
}

export function ProductDimensionModal({
  open,
  onOpenChange,
  dimensionName,
  onDimensionNameChange,
  dimensionValue,
  onDimensionValueChange,
  onSubmit,
}: ProductDimensionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Nova Dimensão de Variação
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione um atributo com o seu primeiro valor (Ex: Tamanho com valor P).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Nome da Dimensão</Label>
            <Input
              value={dimensionName}
              onChange={(e) => onDimensionNameChange(e.target.value)}
              placeholder="Ex: Tamanho, Cor, Voltagem, Sabor"
              className="h-11 text-xs rounded-lg bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Primeiro Valor</Label>
            <Input
              value={dimensionValue}
              onChange={(e) => onDimensionValueChange(e.target.value)}
              placeholder="Ex: P, Azul, 220V, Chocolate"
              className="h-11 text-xs rounded-lg bg-background"
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
            className="rounded-lg text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cancelar
          </Button>
          <Button /* focus-visible: */
            type="button"
            size="sm"
            onClick={onSubmit} /* focus-visible:ring-2 */
            disabled={(!dimensionName.trim()) || (!dimensionValue.trim())}
            className="rounded-lg text-xs font-bold bg-primary text-primary-foreground h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Gerar Grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
