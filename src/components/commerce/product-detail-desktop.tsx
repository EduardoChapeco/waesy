import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ImageOff,
  ShoppingBag,
  ChevronRight,
  Truck,
  ShieldCheck,
  Check,
  MapPin,
  MessageCircle,
  Play,
  Package,
  Minus,
  Plus,
  Loader2,
  ShieldAlert,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { PriceDisplay } from "@/components/commerce/price-display";
import { FavoriteButton } from "@/components/common/favorite-button";
import { ProductQuickOrderDialog } from "./product-quick-order-dialog";
import { cn } from "@/lib/utils";
import type { ProductMediaDTO, VariantDTO } from "@/types/catalog";
import type { ProductDetailViewProps } from "./product-detail-mobile";

export function ProductDetailDesktop({
  product,
  selectedVariant,
  selectedAttributes,
  setSelectedAttributes,
  attributeKeys,
  activeMedia,
  setActiveMedia,
  quantity,
  setQuantity,
  selectedOptions,
  setSelectedOptions,
  currentPriceCents,
  allOutOfStock,
  handleAddToCart,
  isAdding,
  zipcode,
  setZipcode,
  handleCalculateShipping,
  shippingRates,
  loadingShipping,
  isFollowingStore,
  handleToggleFollow,
  isOwner,
  storeLocation,
  storePhone,
  setSizeGuideOpen,
  setIsReportModalOpen,
  setIsWaitlistOpen,
}: ProductDetailViewProps) {
  const isBackorder = selectedVariant && selectedVariant.availableQty <= 0 && selectedVariant.allowBackorder;
  const isOutOfStock = Boolean(allOutOfStock) || Boolean(selectedVariant && selectedVariant.availableQty <= 0 && !selectedVariant.allowBackorder);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);

  const mediaList = product.media || [];

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-4 pb-16 space-y-6">
      {/* ── BREADCRUMBS DESKTOP ── */}
      <nav
        aria-label="Navegação estrutural"
        className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium py-2"
      >
        <Link to="/" className="hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <Link to="/mercado" className="hover:text-foreground">
          Catálogo
        </Link>
        {product.categories && product.categories.length > 0 && (
          <>
            <ChevronRight className="size-3 shrink-0" aria-hidden />
            <Link
              to="/mercado"
              search={{ categoria: product.categories[0].slug }}
              className="hover:text-foreground truncate max-w-xs"
            >
              {product.categories[0].name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="text-foreground font-semibold truncate max-w-sm">{product.title}</span>
      </nav>

      {/* ── GRID PRINCIPAL SPLIT 12 COLUNAS ── */}
      <div className="grid grid-cols-12 gap-10 items-start">
        {/* ══ COLUNA ESQUERDA (7 Colunas): Mídia & Descrição ══ */}
        <div className="col-span-7 space-y-6">
          {/* Mídia & Galeria */}
          <div className="w-full flex gap-3 items-start">
            {/* Strip vertical de miniaturas */}
            {mediaList.length > 1 && (
              <div className="flex flex-col gap-2 w-16 shrink-0 max-h-[500px] overflow-y-auto no-scrollbar pr-0.5">
                {mediaList.map((m: ProductMediaDTO) => {
                  const isVideo = m.mediaType === "video";
                  const active = activeMedia?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMedia(m)}
                      className={cn(
                        "relative aspect-square w-14 shrink-0 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer",
                        active
                          ? "border-primary ring-2 ring-primary/20 scale-[1.03]"
                          : "border-border/60 hover:border-primary/50 bg-secondary"
                      )}
                    >
                      {isVideo ? (
                        <div className="relative size-full bg-black/20 flex items-center justify-center">
                          <Play className="size-4 text-white fill-white relative z-10" />
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={m.alt ?? ""}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Viewport Principal de Imagem */}
            <div className="flex-1 w-full relative">
              <div className="relative w-full aspect-[4/3] md:aspect-square overflow-hidden bg-secondary rounded-2xl border border-border/50">
                {activeMedia ? (
                  activeMedia.mediaType === "video" ? (
                    <video
                      src={activeMedia.url}
                      controls
                      autoPlay
                      className="absolute size-full object-contain"
                    />
                  ) : (
                    <img
                      src={activeMedia.url}
                      alt={activeMedia.alt ?? product.title}
                      loading="eager"
                      className="size-full object-cover"
                    />
                  )
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <ImageOff className="size-16 stroke-1" aria-hidden />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Descrição Completa Desktop */}
          {product.description && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <h2 className="text-sm font-bold text-foreground">Descrição do Produto</h2>
              <div className="rounded-2xl border border-border/50 bg-card p-5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Selos de Confiança Desktop */}
          <div className="p-4 rounded-2xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                Pagamento Seguro
              </span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                Proteção Waesy
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1 hover:text-destructive transition-colors text-[11px] cursor-pointer"
            >
              <ShieldAlert className="size-3.5 text-destructive" />
              Reportar oferta
            </button>
          </div>
        </div>

        {/* ══ COLUNA DIREITA (5 Colunas): Card Sticky de Conversão ══ */}
        <div className="col-span-5 space-y-6">
          <div className="sticky top-20 rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
            {/* Bloco de Título & Preço */}
            <div className="space-y-2 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between gap-2">
                {product.categories?.[0] && (
                  <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 bg-primary/10">
                    {product.categories[0].name}
                  </Badge>
                )}
                <FavoriteButton
                  itemId={product.id}
                  itemType="product"
                  className="size-8 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                />
              </div>

              <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-snug">
                {product.title}
              </h1>

              <div className="pt-2">
                <PriceDisplay
                  priceCents={currentPriceCents || product.priceCents || 0}
                  compareAtCents={selectedVariant?.compareAtPriceCents ?? product.compareAtCents}
                  className="text-3xl font-extrabold text-foreground font-mono"
                />
              </div>
            </div>

            {/* Variantes & Atributos */}
            {attributeKeys.length > 0 && (
              <div className="space-y-4">
                {attributeKeys.map((key) => {
                  const uniqueValues = Array.from(
                    new Set(
                      product.variants
                        .map((v: VariantDTO) => v.attributes?.[key])
                        .filter(Boolean)
                    )
                  );

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground capitalize">
                          {key}: <strong className="text-primary font-normal">{selectedAttributes[key] || "Selecione"}</strong>
                        </span>
                        {key.toLowerCase() === "tamanho" && (
                          <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Guia de Tamanhos
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {uniqueValues.map((val) => {
                          const isSelected = selectedAttributes[key] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setSelectedAttributes((prev) => ({ ...prev, [key]: val }));
                              }}
                              className={cn(
                                "h-9 min-w-10 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                  : "border-border/70 bg-card text-foreground hover:bg-muted/30"
                              )}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Opções Customizáveis */}
            {product.optionGroups && product.optionGroups.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/50">
                {product.optionGroups.map((og: any) => {
                  const isMultiple = og.selectionType === "multiple";
                  const selection = selectedOptions[og.id] || (isMultiple ? [] : "");

                  const handleToggle = (valId: string) => {
                    setSelectedOptions((prev) => {
                      const current = prev[og.id];
                      if (isMultiple) {
                        const currentArr = Array.isArray(current) ? current : [];
                        if (currentArr.includes(valId)) {
                          return { ...prev, [og.id]: currentArr.filter((id) => id !== valId) };
                        } else {
                          if (og.maxSelections > 0 && currentArr.length >= og.maxSelections) return prev;
                          return { ...prev, [og.id]: [...currentArr, valId] };
                        }
                      } else {
                        if (current === valId && !og.isRequired) return { ...prev, [og.id]: "" };
                        return { ...prev, [og.id]: valId };
                      }
                    });
                  };

                  return (
                    <div key={og.id} className="space-y-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-foreground">{og.displayName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {isMultiple ? `Até ${og.maxSelections} opções` : "Escolha 1"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {og.values.map((val: any) => {
                          const isSelected = isMultiple
                            ? Array.isArray(selection) && selection.includes(val.id)
                            : selection === val.id;

                          return (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() => handleToggle(val.id)}
                              className={cn(
                                "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                                  : "border-border/60 bg-card hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={cn(
                                    "flex items-center justify-center border size-4 shrink-0 transition-all",
                                    isMultiple ? "rounded-md" : "rounded-full",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/40 bg-background"
                                  )}
                                >
                                  {isSelected && (
                                    isMultiple ? <Check className="size-2.5 stroke-[3]" /> : <span className="size-1.5 bg-primary-foreground rounded-full" />
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-foreground truncate">{val.label}</span>
                              </div>
                              <span className="text-xs font-bold text-foreground font-mono shrink-0">
                                {val.priceModifierCents > 0 ? `+ ${formatMoney(val.priceModifierCents)}` : "Incluso"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ação de Compra Desktop */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              {isOutOfStock ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full font-bold text-xs uppercase rounded-xl h-12 bg-muted text-foreground border border-border/80 hover:bg-muted/80 gap-2 cursor-pointer"
                  onClick={() => setIsWaitlistOpen(true)}
                >
                  <BellRing className="size-4 text-primary" />
                  <span>Avise-me quando chegar</span>
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Seletor de Quantidade */}
                  <div className="flex items-center rounded-xl border border-border/70 bg-secondary/50 h-12 px-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="size-9 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
                      aria-label="Diminuir"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-foreground font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="size-9 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
                      aria-label="Aumentar"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Botões Duplos com Física Anti-Esmagamento (Apple HIG) */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="font-bold text-xs uppercase rounded-xl h-12 transition-all cursor-pointer gap-2 border-border/80 hover:bg-muted text-foreground"
                      onClick={handleAddToCart}
                      disabled={Boolean(isAdding)}
                    >
                      <ShoppingBag className="size-4 text-muted-foreground" />
                      <span className="truncate">{isAdding ? "Adicionando..." : "Carrinho"}</span>
                    </Button>
                    <Button
                      size="lg"
                      className="font-bold text-xs uppercase rounded-xl h-12 transition-all cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      onClick={() => setIsQuickOrderOpen(true)}
                    >
                      <MessageCircle className="size-4" />
                      <span className="truncate">Pedir Agora</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Simulação de Frete Desktop */}
            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span>Calcular Frete & Prazo</span>
                </div>
                {storeLocation && (
                  <span className="text-[10px] text-muted-foreground font-mono">{storeLocation}</span>
                )}
              </div>
              <form onSubmit={handleCalculateShipping} className="flex gap-2">
                <Input
                  placeholder="Digite seu CEP"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-muted/30"
                />
                <Button type="submit" size="sm" className="h-10 font-bold px-4 rounded-xl shrink-0 cursor-pointer" disabled={loadingShipping}>
                  {loadingShipping ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
                </Button>
              </form>

              {shippingRates !== null && (
                <div className="space-y-1.5 pt-1">
                  {shippingRates.length > 0 ? (
                    shippingRates.map((rate, idx) => (
                      <div key={rate.id || idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-border/50 bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground">{rate.service_name || rate.name || rate.provider}</p>
                          <p className="text-[10px] text-muted-foreground">Prazo: {rate.estimated_days} dias úteis</p>
                        </div>
                        <span className="font-bold text-foreground font-mono">
                          {rate.price_cents === 0 ? <span className="text-emerald-600">Grátis</span> : formatMoney(rate.price_cents)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Frete sob cotação direta com a loja.</p>
                  )}
                </div>
              )}
            </div>

            {/* Card Sobre a Loja Desktop */}
            <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center font-black text-sm text-primary shrink-0 border border-primary/20">
                  {(product as any).store?.name?.slice(0, 2).toUpperCase() || "LJ"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs text-foreground truncate">
                      {(product as any).store?.name || product.brand || "Loja Parceira"}
                    </h3>
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 py-0 px-1.5 rounded">
                      Oficial
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {(product as any).store?.city ? `${(product as any).store.city} - ${(product as any).store.state || "SC"}` : "Loja Verificada Waesy"}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant={isFollowingStore ? "secondary" : "outline"}
                className="text-xs font-bold rounded-xl h-9 shrink-0 cursor-pointer"
                onClick={handleToggleFollow}
              >
                {isFollowingStore ? "Seguindo" : "+ Seguir"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Diálogo Canônico de Compra Expressa via WhatsApp (Anti-Ghost Orders) */}
      <ProductQuickOrderDialog
        open={isQuickOrderOpen}
        onOpenChange={setIsQuickOrderOpen}
        product={{
          id: product.id,
          title: product.title,
          priceCents: currentPriceCents || product.priceCents || 0,
          image: activeMedia?.url || product.media?.[0]?.url,
          storeId: product.store_id || (product as any)?.store?.id,
          storeName: (product as any)?.store?.name,
          storeSlug: (product as any)?.store?.slug,
          storePhone: storePhone,
        }}
        selectedVariant={selectedVariant}
        quantity={quantity}
      />
    </div>
  );
}
