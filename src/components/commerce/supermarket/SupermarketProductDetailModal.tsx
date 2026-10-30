import React, { useState } from "react";
import {
  X,
  ShareNetwork,
  Heart,
  PencilSimple,
  Info,
  CurrencyCircleDollar,
  Users,
  Lightning,
  IdentificationCard,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupermarketClubRibbonBadge } from "./SupermarketClubRibbonBadge";
import type { SupermarketProductCardDTO } from "@/services/supermarket.functions";

interface SupermarketProductDetailModalProps {
  product: SupermarketProductCardDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (params: {
    product: SupermarketProductCardDTO;
    quantity: number;
    unitMode: "un" | "kg";
    ripeness?: "menos_maduro" | "maduro" | "mais_maduro";
    prepOption?: string;
    instructions?: string;
  }) => void;
  isMember?: boolean;
}

export function SupermarketProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isMember = false,
}: SupermarketProductDetailModalProps) {
  if (!product) return null;

  const [quantity, setQuantity] = useState(1);
  const [unitMode, setUnitMode] = useState<"un" | "kg">(
    product.freshFoodSpecs?.pricing_unit === "kg" ? "kg" : "un",
  );
  const [ripeness, setRipeness] = useState<"menos_maduro" | "maduro" | "mais_maduro">("maduro");
  const [selectedPrep, setSelectedPrep] = useState<string>(
    product.freshFoodSpecs?.prep_options?.[0] || "",
  );
  const [instructions, setInstructions] = useState("");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Preço efetivo
  const effectivePriceCents =
    isMember && product.clubPriceCents && product.clubPriceCents > 0
      ? product.clubPriceCents
      : product.onlineExclusivePriceCents && product.onlineExclusivePriceCents > 0
        ? product.onlineExclusivePriceCents
        : product.priceCents;

  const hasDiscount = Boolean(product.compareAtCents && product.compareAtCents > effectivePriceCents);
  const formattedPrice = (effectivePriceCents / 100).toFixed(2).replace(".", ",");
  const formattedTotal = ((effectivePriceCents * quantity) / 100).toFixed(2).replace(".", ",");

  const isFreshFood =
    product.freshFoodSpecs?.allow_maturity_selection ||
    product.freshFoodSpecs?.pricing_unit === "kg" ||
    Boolean(product.freshFoodSpecs?.prep_options?.length);

  const handleConfirmAdd = () => {
    onAddToCart({
      product,
      quantity,
      unitMode,
      ripeness: product.freshFoodSpecs?.allow_maturity_selection ? ripeness : undefined,
      prepOption: selectedPrep || undefined,
      instructions: instructions.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 rounded-3xl overflow-hidden gap-0 max-h-[92vh] flex flex-col">
        {/* ── Top Bar Flutuante com Fechar, Favorito e Compartilhar ── */}
        <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0 bg-background z-20">
          <button
            type="button"
            onClick={onClose}
            className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-muted/80 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar modal"
          >
            <X size={20} weight="bold" />
          </button>

          <DialogTitle className="text-sm font-bold text-foreground truncate max-w-64 px-2">
            {product.title}
          </DialogTitle>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-muted/80 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Favoritar produto"
            >
              <Heart size={20} weight={isFavorite ? "fill" : "regular"} className={isFavorite ? "text-destructive" : ""} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.title, url: window.location.href });
                }
              }}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-muted/80 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Compartilhar produto"
            >
              <ShareNetwork size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* ── Área de Conteúdo Roolável ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Foto Principal com Badges Flutuantes */}
          <div className="relative w-full aspect-square max-h-72 rounded-2xl bg-muted/30 overflow-hidden flex items-center justify-center border border-border/40">
            {/* Badges no canto esquerdo (Patrocinado, Destaque, Gelado) */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {product.badges?.map((b, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-2xs font-bold rounded-lg bg-background/90 text-foreground border border-border/60 shadow-sm capitalize"
                >
                  {b}
                </span>
              ))}
              {product.freshFoodSpecs?.temperature_tag && product.freshFoodSpecs.temperature_tag !== "none" ? (
                <span className="px-2.5 py-1 text-2xs font-bold rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 capitalize">
                  {product.freshFoodSpecs.temperature_tag}
                </span>
              ) : null}
            </div>

            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-contain p-4"
              />
            ) : null}
          </div>

          {/* Fitas do Clube / Ofertas */}
          <SupermarketClubRibbonBadge
            rule={product.promotionalRule}
            freshFoodSpecs={product.freshFoodSpecs}
            badges={product.badges}
            clubPriceCents={product.clubPriceCents}
            isMember={isMember}
          />

          {/* Informações Básicas: Nome e SKU */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
              {product.title}
            </h2>
            {product.sku ? (
              <p className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">
                SKU: {product.sku}
              </p>
            ) : null}
          </div>

          {/* Alternador de Unidade vs Peso (Kg) para Hortifrúti e Carnes */}
          {product.freshFoodSpecs?.pricing_unit === "kg" ? (
            <div className="space-y-2">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Unidade ou peso
              </span>
              <div className="grid grid-cols-2 p-1 rounded-xl bg-muted gap-1 max-w-xs">
                <button
                  type="button"
                  onClick={() => setUnitMode("un")}
                  className={cn(
                    "h-11 min-h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    unitMode === "un" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Unidade
                </button>
                <button
                  type="button"
                  onClick={() => setUnitMode("kg")}
                  className={cn(
                    "h-11 min-h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    unitMode === "kg" ? "bg-emerald-600 text-white font-extrabold shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Peso (Kg)
                </button>
              </div>
            </div>
          ) : null}

          {/* Seletor de Maturidade (Hortifrúti) */}
          {product.freshFoodSpecs?.allow_maturity_selection ? (
            <div className="space-y-2">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Escolha a maturidade desejada:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "menos_maduro", label: "Menos maduro" },
                  { id: "maduro", label: "Maduro" },
                  { id: "mais_maduro", label: "Mais maduro" },
                ].map((item) => {
                  const isSelected = ripeness === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRipeness(item.id as any)}
                      className={cn(
                        "h-11 min-h-11 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-bold"
                          : "border-border/60 hover:border-border text-foreground",
                      )}
                    >
                      <span className={cn("size-2.5 rounded-full", isSelected ? "bg-emerald-600" : "border border-muted-foreground")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Seletor de Cortes (Açougue & Carnes) */}
          {product.freshFoodSpecs?.prep_options?.length ? (
            <div className="space-y-2">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Opção de corte / preparo:
              </span>
              <div className="flex flex-wrap gap-2">
                {product.freshFoodSpecs.prep_options.map((opt) => {
                  const isSelected = selectedPrep === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedPrep(opt)}
                      className={cn(
                        "h-11 min-h-11 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 hover:border-border text-foreground",
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Preço e Destaque Promocional */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">
                R$ {formattedPrice}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                / {unitMode === "kg" ? "Kg" : product.unit}
              </span>
              {hasDiscount ? (
                <span className="text-xs line-through text-muted-foreground ml-auto">
                  R$ {(product.compareAtCents! / 100).toFixed(2).replace(".", ",")}
                </span>
              ) : null}
            </div>

            {/* Helper Text Explicativo da Promoção */}
            {product.promotionalRule?.rule_type === "buy_x_pay_y" && product.promotionalRule.buy_qty && product.promotionalRule.pay_qty ? (
              <p className="text-xs font-bold text-destructive">
                Adicione {product.promotionalRule.buy_qty} itens ao carrinho e pague {product.promotionalRule.pay_qty} unidades.
              </p>
            ) : null}

            {isMember && product.clubPriceCents ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                <IdentificationCard size={15} weight="fill" />
                Preço exclusivo para membros do Clube
              </span>
            ) : null}
          </div>

          {/* Campo de Instruções Especiais ao Separador */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsEditingInstructions(!isEditingInstructions)}
              className="w-full h-11 min-h-11 px-3.5 rounded-xl border border-border/60 hover:border-border text-xs font-semibold text-foreground flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-2">
                <PencilSimple size={16} weight="bold" className="text-muted-foreground" />
                <span>{instructions ? "Alterar instrução do separador" : "Adicionar instrução ao separador"}</span>
              </div>
              <span className="text-muted-foreground text-2xs">Opcional</span>
            </button>

            {isEditingInstructions ? (
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex: Por favor escolher mais verdes para durar na semana..."
                rows={2}
                className="w-full p-3 rounded-xl border border-border text-xs bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
              />
            ) : null}
          </div>

          {/* Cards de Avisos e Regras Fiscais/Políticas */}
          <div className="space-y-2 text-2xs">
            {product.promotionalRule?.max_per_cpf ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 text-muted-foreground">
                <Users size={16} weight="bold" className="shrink-0 text-foreground" />
                <span>Esta oferta possui limite máximo de {product.promotionalRule.max_per_cpf} unidades por CPF.</span>
              </div>
            ) : null}

            {product.promotionalRule?.cashback_cents ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-600/10 text-emerald-800 dark:text-emerald-300">
                <CurrencyCircleDollar size={18} weight="fill" className="shrink-0 text-emerald-600" />
                <span>
                  Cashback de R$ {(product.promotionalRule.cashback_cents / 100).toFixed(2).replace(".", ",")} devolvido diretamente à sua carteira.
                </span>
              </div>
            ) : null}

            {/* Aviso Obrigatório de Pesagem do Varejo Alimentar */}
            {isFreshFood ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <Info size={16} weight="bold" className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  O peso final e o valor exato poderão sofrer pequenas variações durante o processo de pesagem na loja física.
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Footer Sticky com Stepper de Quantidade e CTA (Piso 44px) ── */}
        <div className="p-4 border-t border-border/40 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          {/* Stepper de Quantidade */}
          <div className="flex items-center border border-border/60 rounded-xl h-11 min-h-11 px-1 bg-muted/30">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Diminuir quantidade"
            >
              <Minus size={16} weight="bold" />
            </button>
            <span className="w-10 text-center font-bold text-sm text-foreground">
              {quantity} {unitMode === "kg" ? "kg" : "un"}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="size-11 min-w-11 min-h-11 flex items-center justify-center text-foreground hover:bg-muted/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Aumentar quantidade"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>

          {/* Botão Adicionar ao Carrinho */}
          <Button
            type="button"
            onClick={handleConfirmAdd}
            className="flex-1 h-11 min-h-11 rounded-xl font-bold gap-2 text-sm focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Adicionar ao carrinho</span>
            <span className="text-2xs opacity-90 font-medium">
              (R$ {formattedTotal})
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
