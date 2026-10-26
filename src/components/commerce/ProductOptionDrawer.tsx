import * as React from "react";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Check,
  Package,
} from "lucide-react";
import {
  ProductOptionsCustomizer,
  type OptionGroup,
} from "@/components/commerce/product-options-customizer";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export interface CustomizableProduct {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  optionGroups?: OptionGroup[];
}

export interface ProductOptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: CustomizableProduct | null;
  onConfirmAdd: (customizedItem: {
    product: CustomizableProduct;
    quantity: number;
    selectedOptions: Record<string, string[]>;
    specialInstructions: string;
    totalCents: number;
  }) => void;
}

export function ProductOptionDrawer({
  isOpen,
  onClose,
  product,
  onConfirmAdd,
}: ProductOptionDrawerProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Reiniciar estado quando abrir com novo produto
  React.useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedOptions({});
      setSpecialInstructions("");
    }
  }, [isOpen, product?.id]);

  if (!product) return null;

  const optionGroups = product.optionGroups || [];

  const handleOptionChange = (groupId: string, valueIds: string[]) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupId]: valueIds,
    }));
  };

  // Cálculo de adicionais de preço dos opcionais
  const modifierTotalCents = useMemo(() => {
    let extra = 0;
    optionGroups.forEach((group) => {
      const selected = selectedOptions[group.id] || [];
      group.values.forEach((val) => {
        if (selected.includes(val.id) && val.priceModifierCents) {
          extra += val.priceModifierCents;
        }
      });
    });
    return extra;
  }, [optionGroups, selectedOptions]);

  const unitTotalCents = product.priceCents + modifierTotalCents;
  const grandTotalCents = unitTotalCents * quantity;

  // Validação de grupos obrigatórios
  const isValidationPassing = useMemo(() => {
    return optionGroups.every((group) => {
      if (!group.isRequired) return true;
      const selected = selectedOptions[group.id] || [];
      if (group.minSelections) {
        return selected.length >= group.minSelections;
      }
      return selected.length > 0;
    });
  }, [optionGroups, selectedOptions]);

  const handleAdd = () => {
    if (!isValidationPassing) {
      toast.error("Por favor, selecione todas as opções obrigatórias marcadas com *.");
      return;
    }

    onConfirmAdd({
      product,
      quantity,
      selectedOptions,
      specialInstructions: specialInstructions.trim(),
      totalCents: grandTotalCents,
    });
    toast.success(`${quantity}x ${product.title} adicionado à sacola!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-11/12 sm:max-w-lg max-h-screen p-0 overflow-hidden rounded-lg border border-border/60 bg-card text-foreground shadow-2xl z-50 flex flex-col pt-5 pt-safe">
        <DialogHeader className="p-4 sm:p-5 pb-2 border-b border-border/40 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words">
                {product.title}
              </DialogTitle>
              {product.description && (
                <DialogDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {product.description}
                </DialogDescription>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-muted-foreground block">A partir de</span>
              <span className="text-sm sm:text-base font-black font-mono text-primary">
                {formatMoney(product.priceCents)}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Área Rolável de Opcionais e Instruções ────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-5 no-scrollbar pb-28">
          {product.imageUrl && (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted/40 border border-border/40">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Seletor Canônico de Opcionais */}
          {optionGroups.length > 0 && (
            <ProductOptionsCustomizer
              optionGroups={optionGroups}
              selectedOptions={selectedOptions}
              onChange={handleOptionChange}
            />
          )}

          {/* Observações do Pedido */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label htmlFor="instructions" className="text-xs font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              Alguma observação especial?
            </Label>
            <Input
              id="instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne ao ponto, molho à parte..."
              maxLength={140}
              className="text-xs h-11 rounded-lg bg-muted/30 border-border/60"
            />
            <p className="text-2xs text-muted-foreground text-right">
              {specialInstructions.length}/140 caracteres
            </p>
          </div>
        </div>

        {/* ─── Rodapé Fixo de Ação Primária (z-30 / Piso 44px) ───────────── */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-card/95 backdrop-blur-md border-t border-border/40 flex items-center justify-between gap-3 z-30 pb-3 pb-safe">
          {/* Contador de Quantidade 44px */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40 shrink-0">
            <button
              type="button"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors cursor-pointer select-none"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Diminuir quantidade"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-bold font-mono text-sm text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition-colors cursor-pointer select-none"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              aria-label="Aumentar quantidade"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Botão de Adicionar à Sacola */}
          <Button
            type="button"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-1 h-11 min-h-11 px-4 rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer select-none"
            onClick={handleAdd}
            disabled={!isValidationPassing}
          >
            <ShoppingBag className="size-4 shrink-0" />
            <span className="truncate">Adicionar</span>
            <span className="font-mono ml-auto shrink-0">{formatMoney(grandTotalCents)}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
