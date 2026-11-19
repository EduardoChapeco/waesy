import React, { useEffect, useMemo, useState } from "react";
import { Plus, Minus, ShoppingBag, Lightning, Tag } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductQuickOrderDialog } from "@/components/commerce/product-quick-order-dialog";
import { ProductAiSdrChat } from "@/components/commerce/product-ai-sdr-chat";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { formatMoney } from "@/lib/money";
import type { BrandedAppRuntimeBundleDTO } from "@/types/branded-app";
import { cn } from "@/lib/utils";

export interface AppProductDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  store: BrandedAppRuntimeBundleDTO["store"];
  onRequestModifiers?: (product: any) => void;
}

export function AppProductDetailDrawer({
  open,
  onOpenChange,
  product,
  store,
  onRequestModifiers,
}: AppProductDetailDrawerProps) {
  const { setCartData, setIsCartOpen } = useCartContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product],
  );
  const mediaUrls = useMemo(() => {
    const rawList = Array.isArray(product?.mediaUrls) ? product.mediaUrls.filter(Boolean) : [];
    const fallback = product?.coverUrl || product?.image_url || null;
    if (rawList.length > 0) return rawList;
    return fallback ? [fallback] : [];
  }, [product]);
  const optionGroups = useMemo(
    () => (Array.isArray(product?.optionGroups) ? product.optionGroups : []),
    [product],
  );
  const modifierGroups = useMemo(
    () => (Array.isArray(product?.modifierGroups) ? product.modifierGroups : []),
    [product],
  );

  useEffect(() => {
    setQuantity(1);
    setSelectedValues({});
    setActiveImageIdx(0);
    setSelectedVariantId(variants[0]?.id ? String(variants[0].id) : null);
  }, [product?.id, open, variants]);

  if (!product) return null;

  const activeVariant =
    variants.find((v: any) => String(v.id) === String(selectedVariantId)) || variants[0] || null;
  const basePrice = Number(
    activeVariant?.price_override_cents ?? product.priceCents ?? product.price_cents ?? 0,
  );
  const compareAt = Number(product.compareAtCents ?? product.compare_at_cents ?? 0);
  const imageUrl = mediaUrls[activeImageIdx] || mediaUrls[0] || null;

  const extraOptionCents = optionGroups.reduce((sum: number, g: any) => {
    const valId = selectedValues[g.id];
    const match = (g.option_values || []).find((ov: any) => ov.id === valId);
    return sum + Number(match?.price_modifier_cents || 0);
  }, 0);

  const unitPriceCents = basePrice + extraOptionCents;
  const totalPriceCents = unitPriceCents * quantity;

  const handleAddToCart = async () => {
    if (modifierGroups.length > 0 && onRequestModifiers) {
      onOpenChange(false);
      onRequestModifiers(product);
      return;
    }

    for (const g of optionGroups) {
      if (g.is_required && !selectedValues[g.id]) {
        toast.error(`Selecione uma opção em "${g.display_name || "Opções"}".`);
        return;
      }
    }

    setIsAdding(true);
    try {
      const res = await addToCart({
        data: {
          productId: product.id,
          variantId: activeVariant?.id ? String(activeVariant.id) : undefined,
          quantity,
          options: Object.keys(selectedValues).length > 0 ? selectedValues : undefined,
        },
      });
      if ((res as any)?.status === "error") {
        toast.error((res as any)?.message || "Não foi possível adicionar o item.");
        return;
      }
      if ((res as any)?.cart) {
        setCartData((res as any).cart);
        onOpenChange(false);
        setIsCartOpen(true);
        toast.success("Adicionado à sacola!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar item.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col justify-between bg-card border-l border-border z-50"
        >
          <div className="p-5 pb-3 border-b border-border flex items-start justify-between gap-3">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-base font-extrabold text-foreground leading-snug">
                {product.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {store.name}
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {imageUrl && (
              <div className="space-y-2">
                <div className="aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted border border-border">
                  <img src={imageUrl} alt={product.title} className="size-full object-cover" />
                </div>
                {mediaUrls.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                    {mediaUrls.map((url: string, idx: number) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        aria-label={`Ver imagem ${idx + 1} de ${product.title}`}
                        className={cn(
                          "size-14 min-h-11 min-w-11 rounded-xl overflow-hidden border shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeImageIdx === idx ? "border-primary ring-2 ring-primary/30" : "border-border opacity-75 hover:opacity-100",
                        )}
                      >
                        <img src={url} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-black font-mono text-primary">
                  {formatMoney(unitPriceCents)}
                </span>
                {compareAt > unitPriceCents && (
                  <span className="text-sm font-mono line-through text-muted-foreground">
                    {formatMoney(compareAt)}
                  </span>
                )}
                {compareAt > unitPriceCents && (
                  <Badge variant="secondary" className="gap-1">
                    <Tag className="size-3" />
                    <span>Oferta no App</span>
                  </Badge>
                )}
              </div>

              {product.description && (
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
                  {product.description}
                </p>
              )}
            </div>

            {variants.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold text-foreground block">Escolha a variação</span>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v: any) => {
                    const attrLabel = v.attributes && typeof v.attributes === "object"
                      ? Object.values(v.attributes).filter(Boolean).join(" · ")
                      : "";
                    const label = attrLabel || v.sku || "Padrão";
                    const selected = activeVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(String(v.id))}
                        className={cn(
                          "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {optionGroups.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-border/60">
                {optionGroups.map((group: any) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {group.display_name || "Escolha uma opção"}
                      </span>
                      {group.is_required && <Badge variant="outline">Obrigatório</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(group.option_values || [])
                        .filter((ov: any) => ov.is_active !== false)
                        .map((ov: any) => {
                          const selected = selectedValues[group.id] === ov.id;
                          return (
                            <button
                              key={ov.id}
                              type="button"
                              onClick={() =>
                                setSelectedValues((prev) => ({ ...prev, [group.id]: ov.id }))
                              }
                              className={cn(
                                "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                selected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:bg-muted",
                              )}
                            >
                              <span>{ov.label}</span>
                              {Number(ov.price_modifier_cents || 0) > 0 && (
                                <span className="ml-2 font-mono">
                                  +{formatMoney(Number(ov.price_modifier_cents))}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-xs font-bold text-foreground">Quantidade</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                  className="size-11 min-h-11 min-w-11 p-0 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center font-mono text-sm font-bold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                  className="size-11 min-h-11 min-w-11 p-0 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {product.attributes && typeof product.attributes === "object" && Object.keys(product.attributes).length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <span className="text-xs font-bold text-foreground block">Ficha &amp; Características</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.attributes)
                    .filter(([k, v]) => v != null && String(v).trim() !== "" && !String(k).startsWith("_") && k !== "cover_url")
                    .slice(0, 8)
                    .map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-border bg-muted/30 p-2">
                        <span className="text-muted-foreground block capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="font-semibold text-foreground break-words">
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {store.ai_sales_agent_enabled !== false && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Dúvidas sobre este item?</span>
                <ProductAiSdrChat
                  productId={product.id}
                  storeId={store.id}
                  storeName={store.name}
                  itemTitle={product.title}
                  niche={store.primary_niche_id || undefined}
                  triggerVariant="button"
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card space-y-2 safe-area-bottom">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickOrderOpen(true)}
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Lightning className="size-4" weight="fill" />
                <span>Pedir Express</span>
              </Button>

              <Button
                type="button"
                disabled={isAdding}
                onClick={handleAddToCart}
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ShoppingBag className="size-4" weight="fill" />
                <span>
                  {isAdding
                    ? "Adicionando..."
                    : `Adicionar · ${formatMoney(totalPriceCents)}`}
                </span>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Continuar no aplicativo
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ProductQuickOrderDialog
        open={quickOrderOpen}
        onOpenChange={setQuickOrderOpen}
        product={{
          id: product.id,
          title: product.title,
          priceCents: unitPriceCents,
          image: imageUrl,
          storeId: store.id,
          storeName: store.name,
          storeSlug: store.slug,
          storePhone: store.whatsapp || store.phone,
        }}
        selectedVariant={
          activeVariant
            ? {
                id: String(activeVariant.id),
                effectivePriceCents: unitPriceCents,
                attributes: activeVariant.attributes || undefined,
              }
            : null
        }
        quantity={quantity}
      />
    </>
  );
}
