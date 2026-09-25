import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Share2,
  ImageOff,
  ShoppingBag,
  BellRing,
  Truck,
  ShieldCheck,
  Check,
  MapPin,
  MessageCircle,
  Plus,
  Minus,
  Loader2,
  ShieldAlert,
  Play,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { PriceDisplay } from "@/components/commerce/price-display";
import { FavoriteButton } from "@/components/common/favorite-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProductDetailDTO, ProductMediaDTO, VariantDTO } from "@/types/catalog";

export interface ProductDetailViewProps {
  product: ProductDetailDTO;
  selectedVariant: VariantDTO | null;
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  attributeKeys: string[];
  activeMedia: ProductMediaDTO | null;
  setActiveMedia: (media: ProductMediaDTO) => void;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  selectedOptions: Record<string, string | string[]>;
  setSelectedOptions: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  currentPriceCents: number;
  allOutOfStock: boolean;
  handleAddToCart: () => Promise<void>;
  isAdding: boolean;
  zipcode: string;
  setZipcode: React.Dispatch<React.SetStateAction<string>>;
  handleCalculateShipping: (e: React.FormEvent) => Promise<void>;
  shippingRates: any[] | null;
  loadingShipping: boolean;
  isFollowingStore: boolean;
  handleToggleFollow: () => Promise<void>;
  isOwner: boolean;
  storeLocation: string;
  storePhone?: string;
  setSizeGuideOpen: (open: boolean) => void;
  setIsReportModalOpen: (open: boolean) => void;
  setIsWaitlistOpen: (open: boolean) => void;
}

export function ProductDetailMobile({
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
  const navigate = useNavigate();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Confira este produto no Waesy: ${product.title}`,
          url,
        });
      } catch {
        // usuário cancelou
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const isBackorder = selectedVariant && selectedVariant.availableQty <= 0 && selectedVariant.allowBackorder;
  const isOutOfStock = Boolean(allOutOfStock) || Boolean(selectedVariant && selectedVariant.availableQty <= 0 && !selectedVariant.allowBackorder);

  const mediaList = product.media || [];
  const currentMediaIndex = mediaList.findIndex((m: any) => m.id === activeMedia?.id);

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-28 select-none">
      {/* ── 1. HERO EDGE-TO-EDGE NO TOPO (Sem Header, toca nos limites do display) ── */}
      <div className="relative w-full aspect-square bg-muted/20 overflow-hidden">
        {activeMedia ? (
          activeMedia.mediaType === "video" ? (
            <video
              src={activeMedia.url}
              controls
              playsInline
              autoPlay
              className="size-full object-contain bg-black"
            />
          ) : (
            <img
              src={activeMedia.url}
              alt={activeMedia.alt || product.title}
              className="size-full object-cover"
            />
          )
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-[1.5]" />
            <span className="text-xs">Sem foto do produto</span>
          </div>
        )}

        {/* Contador de Fotos */}
        {mediaList.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-medium pointer-events-none">
            {(currentMediaIndex >= 0 ? currentMediaIndex : 0) + 1} / {mediaList.length}
          </div>
        )}

        {/* ── BOTÃO CIRCULAR VOLTAR (Nativo iOS/Android - Canto Superior Esquerdo) ── */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate({ to: "/mercado" });
            }
          }}
          className="absolute top-3 left-3 size-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center z-20 shadow-md active:scale-95 transition-transform cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* ── AÇÕES FLUTUANTES (Canto Superior Direito) ── */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          <button
            type="button"
            onClick={handleShare}
            className="size-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
            aria-label="Compartilhar"
          >
            <Share2 className="size-4" />
          </button>

          <div className="size-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
            <FavoriteButton
              itemId={product.id}
              itemType="product"
              className="size-8 text-white hover:text-white"
            />
          </div>
        </div>
      </div>

      {/* Miniaturas horizontais caso haja mais de 1 foto */}
      {mediaList.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 bg-card border-b border-border/40">
          {mediaList.map((m: ProductMediaDTO) => {
            const active = activeMedia?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMedia(m)}
                className={cn(
                  "relative aspect-square size-12 rounded-xl overflow-hidden border shrink-0 transition-all cursor-pointer",
                  active
                    ? "border-primary ring-2 ring-primary/20 scale-105"
                    : "border-border/60 bg-muted/20"
                )}
              >
                <img src={m.url} alt="" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. CONTEÚDO PRINCIPAL (Padrão WhatsApp / Mobile App Native List) ── */}
      <div className="px-4 pt-4 space-y-5">
        {/* Preço & Identificação */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {product.categories?.[0] && (
              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/10">
                {product.categories[0].name}
              </Badge>
            )}
            {isBackorder ? (
              <Badge variant="outline" className="text-[10px] font-semibold text-amber-600 border-amber-500/30 bg-amber-500/10">
                Sob Encomenda
              </Badge>
            ) : isOutOfStock ? (
              <Badge variant="destructive" className="text-[10px] font-semibold">
                Esgotado
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Check className="size-3" /> Em Estoque
              </span>
            )}
          </div>

          {/* Preço em Destaque */}
          <div className="pt-1">
            <PriceDisplay
              priceCents={currentPriceCents || product.priceCents || 0}
              compareAtCents={selectedVariant?.compareAtPriceCents ?? product.compareAtCents}
              className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono"
            />
          </div>

          {/* Título do Produto */}
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-snug pt-0.5">
            {product.title}
          </h1>

          {/* Localização da Loja */}
          {storeLocation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{storeLocation}</span>
            </div>
          )}
        </div>

        {/* ── 3. SELEÇÃO DE VARIANTES & ATRIBUTOS ── */}
        {attributeKeys.length > 0 && (
          <div className="space-y-4 pt-1 border-t border-border/40">
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground capitalize">
                      {key}: <strong className="text-primary font-normal">{selectedAttributes[key] || "Selecione"}</strong>
                    </span>
                    {key.toLowerCase() === "tamanho" && (
                      <button
                        type="button"
                        onClick={() => setSizeGuideOpen(true)}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
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
                            "h-9 min-w-10 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center",
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

        {/* ── 4. OPÇÕES CUSTOMIZÁVEIS (Adicionais, Sabores, etc.) ── */}
        {product.optionGroups && product.optionGroups.length > 0 && (
          <div className="space-y-4 pt-1 border-t border-border/40">
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
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-foreground">{og.displayName}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
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
                            "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-[0.99] cursor-pointer",
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

        {/* ── 5. CARD DA LOJA PARCEIRA ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
              {(product as any).store?.name?.slice(0, 2).toUpperCase() || "LJ"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {(product as any).store?.name || product.brand || "Loja Oficial Waesy"}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3 shrink-0" />
                <span>Loja Oficial Verificada</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant={isFollowingStore ? "secondary" : "outline"}
            size="sm"
            onClick={handleToggleFollow}
            className="h-9 px-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer active:scale-95"
          >
            {isFollowingStore ? "Seguindo" : "+ Seguir"}
          </Button>
        </div>

        {/* ── 6. SIMULAÇÃO DE FRETE RÁPIDA ── */}
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Truck className="size-4 text-primary" />
            <span>Consultar Frete & Prazo</span>
          </div>
          <form onSubmit={handleCalculateShipping} className="flex gap-2">
            <Input
              placeholder="Digite seu CEP"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              className="h-10 text-xs rounded-xl bg-muted/30"
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 font-bold px-4 rounded-xl shrink-0 cursor-pointer"
              disabled={loadingShipping}
            >
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

        {/* ── 7. DESCRIÇÃO DO PRODUTO ── */}
        {product.description && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Descrição do Produto
            </h2>
            <div className="rounded-2xl border border-border/50 bg-card p-3.5 space-y-2 text-xs text-foreground/90 leading-relaxed">
              <p className={isDescExpanded ? "whitespace-pre-line" : "whitespace-pre-line line-clamp-4"}>
                {product.description}
              </p>
              {product.description.length > 200 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer block pt-1"
                >
                  {isDescExpanded ? "Ver menos" : "Ler descrição completa"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 8. SELOS DE CONFIANÇA ── */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-start gap-2.5 text-muted-foreground">
          <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] leading-snug space-y-0.5">
            <span className="font-semibold text-foreground block">Compra Segura Waesy</span>
            <span>Seu pagamento fica protegido até a confirmação de entrega do produto.</span>
          </div>
        </div>
      </div>

      {/* ── 9. STICKY BOTTOM ACTION BAR (Native-First: Nielsen Norman & Apple HIG) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] mobile-nav-hide-on-keyboard">
        {/* Seletor de Quantidade Mobile */}
        <div className="flex items-center rounded-xl bg-secondary/80 border border-border/60 h-11 px-1 shrink-0">
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="size-8 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
            aria-label="Diminuir"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-7 text-center font-bold text-xs text-foreground font-mono">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((prev) => prev + 1)}
            className="size-8 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
            aria-label="Aumentar"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Botão de Compra com Preço Total Multiplicado */}
        {isOutOfStock ? (
          <Button
            size="lg"
            className="flex-1 rounded-xl font-bold text-xs h-11 px-3 bg-muted text-foreground border border-border/80 flex items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => setIsWaitlistOpen(true)}
          >
            <BellRing className="size-3.5 text-primary shrink-0" />
            <span>Avise-me quando chegar</span>
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 rounded-xl font-bold text-xs h-11 px-4 bg-primary text-primary-foreground flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm"
            onClick={handleAddToCart}
            disabled={Boolean(isAdding)}
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="size-4" />
              <span>{isAdding ? "Adicionando..." : isBackorder ? "Encomendar" : "Adicionar"}</span>
            </span>
            <span className="font-mono font-black text-xs">
              {formatMoney((currentPriceCents || 0) * (quantity || 1))}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
