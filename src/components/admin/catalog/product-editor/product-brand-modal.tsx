import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProductBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandLabel?: string;
  brandName: string;
  onBrandNameChange: (name: string) => void;
  onSubmit: () => Promise<void>;
  isCreating: boolean;
  placeholder?: string;
  description?: string;
  nicheId?: string;
}

export function ProductBrandModal({
  open,
  onOpenChange,
  brandLabel,
  brandName,
  onBrandNameChange,
  onSubmit,
  isCreating,
  placeholder,
  description,
  nicheId,
}: ProductBrandModalProps) {
  const resolvedLabel = brandLabel || "Marca / Fabricante";
  const resolvedPlaceholder =
    placeholder ||
    (nicheId === "tourism"
      ? "Ex: CVC, Azul Viagens, MSC Cruzeiros"
      : nicheId === "gastronomy"
      ? "Ex: Artesanal, Especial da Casa, Linha Fit"
      : nicheId === "vehicles"
      ? "Ex: Toyota, Honda, BMW, Chevrolet"
      : nicheId === "pharmacy"
      ? "Ex: EMS, Medley, Eurofarma, La Roche-Posay"
      : nicheId === "real_estate"
      ? "Ex: Construtora Moura Dubeux, Empreendimento Grand Tower"
      : nicheId === "pet"
      ? "Ex: Premier Pet, Royal Canin, Zoetis, Bravecto"
      : "Ex: Nike, Zara, Apple, Samsung");

  const resolvedDescription =
    description ||
    `Cadastre rapidamente uma nova marca ou fabricante para vincular ao produto.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            Cadastrar {resolvedLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {resolvedDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Nome</Label>
            <Input
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder={resolvedPlaceholder}
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
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 text-xs rounded-lg"
            onClick={onSubmit}
            disabled={isCreating || !brandName.trim()}
          >
            {isCreating ? "Salvando..." : "Salvar & Selecionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
