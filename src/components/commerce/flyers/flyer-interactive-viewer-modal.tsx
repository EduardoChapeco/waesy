import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Clock,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  Tag,
  Check,
  Flame,
  AlertCircle,
  Eye,
  Store,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { useCartContext } from "@/lib/cart-context";
import { addToCart } from "@/services/cart.functions";
import { recordFlyerInteraction, type PromotionalFlyerDTO, type FlyerHotspotDTO } from "@/services/store-flyers.functions";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface FlyerInteractiveViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flyers: PromotionalFlyerDTO[];
  initialFlyerIndex?: number;
  storeName?: string;
  storeSlug?: string;
}

export function FlyerInteractiveViewerModal({
  open,
  onOpenChange,
  flyers,
  initialFlyerIndex = 0,
  storeName,
  storeSlug,
}: FlyerInteractiveViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialFlyerIndex);
  const [activeHotspot, setActiveHotspot] = useState<FlyerHotspotDTO | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const { setCartData, setIsCartOpen } = useCartContext();

  // Atualiza o índice quando o prop mudar
  useEffect(() => {
    if (initialFlyerIndex >= 0 && initialFlyerIndex < flyers.length) {
      setCurrentIndex(initialFlyerIndex);
      setActiveHotspot(null);
    }
  }, [initialFlyerIndex, flyers.length]);

  const currentFlyer = flyers[currentIndex];

  // Registrar visualização quando trocar de encarte
  useEffect(() => {
    if (open && currentFlyer?.id) {
      recordFlyerInteraction({ data: { flyerId: currentFlyer.id, type: "view" } }).catch(() => {});
    }
  }, [open, currentFlyer?.id]);

  // Teclas de navegação (Setas e Esc)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, flyers.length]);

  if (!currentFlyer) return null;

  const isRetro = currentFlyer.theme === "retro_mercado";
  const hotspots: FlyerHotspotDTO[] = Array.isArray(currentFlyer.hotspots) ? currentFlyer.hotspots : [];

  const handlePrev = () => {
    setActiveHotspot(null);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : flyers.length - 1));
  };

  const handleNext = () => {
    setActiveHotspot(null);
    setCurrentIndex((prev) => (prev < flyers.length - 1 ? prev + 1 : 0));
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = currentFlyer.title || `Encarte de Ofertas - ${storeName || "Supermercado"}`;
    const text = `Confira o encarte de ofertas: "${title}" no Waesy!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // Usuário cancelou
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link do encarte copiado para a área de transferência!");
      } catch {
        toast.error("Não foi possível copiar o link.");
      }
    }
  };

  const handleDownload = () => {
    if (!currentFlyer.image_url) return;
    const a = document.createElement("a");
    a.href = currentFlyer.image_url;
    a.download = `encarte-${currentFlyer.title?.toLowerCase().replace(/\s+/g, "-") || "ofertas"}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download do encarte iniciado!");
  };

  const handleAddToCart = async (hotspot: FlyerHotspotDTO) => {
    if (!hotspot.product_id) {
      toast.info("Produto disponível apenas para consulta no encarte.");
      return;
    }

    setIsAddingToCart(true);
    try {
      // Registra clique no produto do encarte
      recordFlyerInteraction({
        data: { flyerId: currentFlyer.id, type: "click" },
      }).catch(() => {});

      const res = await addToCart({
        data: {
          productId: hotspot.product_id,
          quantity: 1,
        },
      });

      if (res && res.status === "success" && res.cart) {
        setCartData(res.cart);
        toast.success(`${hotspot.title || "Produto"} adicionado à sacola!`);
        setIsCartOpen(true);
      } else if (res && res.status === "error") {
        toast.error((res as any).message || "Não foi possível adicionar o produto.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível adicionar o produto.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-4xl p-0 border-0 overflow-hidden shadow-2xl bg-black/95 text-white sm:rounded-3xl flex flex-col h-[92vh] sm:h-[88vh]",
          isRetro && "ring-4 ring-amber-400/80"
        )}
      >
        <DialogTitle className="sr-only">
          {currentFlyer.title || "Visualizador Interativo de Encarte de Ofertas"}
        </DialogTitle>

        {/* ─── Top Bar: Navegação, Identificação & Ações ──────────────── */}
        <div
          className={cn(
            "flex items-center justify-between px-4 sm:px-6 py-3 border-b z-20 shrink-0",
            isRetro
              ? "bg-amber-400 text-red-950 border-amber-500 font-sans"
              : "bg-background/80 backdrop-blur-md text-foreground border-border/40"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isRetro ? (
              <span className="px-2 py-0.5 rounded bg-red-600 text-amber-100 text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                {currentFlyer.badge_text || "OFERTAÇO"}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {currentFlyer.badge_text || "Encarte da Semana"}
              </span>
            )}

            <div className="min-w-0">
              <h2
                className={cn(
                  "text-xs sm:text-sm font-black truncate",
                  isRetro ? "text-red-950 uppercase tracking-tight" : "text-foreground font-bold"
                )}
              >
                {currentFlyer.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground sm:text-[11px]">
                {storeName && <span>{storeName}</span>}
                {currentFlyer.time_left_display && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      isRetro ? "text-red-800" : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <Clock className="size-3" />
                    {currentFlyer.time_left_display}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Paginação de Encartes */}
            {flyers.length > 1 && (
              <div className="flex items-center mr-2 text-xs font-bold opacity-80">
                <span>{currentIndex + 1}</span>
                <span className="mx-0.5">/</span>
                <span>{flyers.length}</span>
              </div>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              title="Baixar Encarte em Alta Resolução"
              className={cn(
                "size-8 rounded-full cursor-pointer",
                isRetro ? "hover:bg-amber-300 text-red-950" : "hover:bg-accent text-foreground"
              )}
            >
              <Download className="size-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              title="Compartilhar Encarte"
              className={cn(
                "size-8 rounded-full cursor-pointer",
                isRetro ? "hover:bg-amber-300 text-red-950" : "hover:bg-accent text-foreground"
              )}
            >
              <Share2 className="size-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={cn(
                "size-8 rounded-full cursor-pointer ml-1",
                isRetro ? "hover:bg-red-600 hover:text-white text-red-950" : "hover:bg-accent text-foreground"
              )}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ─── Palco Central da Imagem com Hotspots Interativos ────────── */}
        <div className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden select-none">
          {/* Navegação Anterior / Próximo Lateral */}
          {flyers.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Encarte anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 size-10 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/80 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="size-6" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Próximo encarte"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 size-10 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center hover:bg-black/80 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Container do Encarte (Preserva Proporção e Alinha Pins) */}
          <div className="relative max-h-full max-w-full flex items-center justify-center p-2 sm:p-4">
            <div className="relative inline-block overflow-hidden shadow-2xl rounded-xl">
              <img
                src={currentFlyer.image_url}
                alt={currentFlyer.title}
                className="max-h-[75vh] sm:max-h-[78vh] w-auto object-contain rounded-xl select-none"
              />

              {/* Botões Redondos Interativos (Hotspots de Destaque) */}
              {hotspots.map((spot, idx) => {
                const isActive = activeHotspot?.id === spot.id;
                return (
                  <button
                    key={spot.id || idx}
                    type="button"
                    style={{
                      left: `${spot.x_percent}%`,
                      top: `${spot.y_percent}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHotspot(isActive ? null : spot);
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none transition-transform cursor-pointer",
                      isActive ? "scale-125 z-30" : "hover:scale-115"
                    )}
                    aria-label={`Ver oferta de ${spot.title || "produto"}`}
                  >
                    {/* Anel Pulsante Estilo Radar */}
                    <span
                      className={cn(
                        "absolute -inset-2 rounded-full animate-ping opacity-75",
                        isRetro ? "bg-red-500" : "bg-primary"
                      )}
                    />

                    {/* Botão Redondo com Ícone ou Preço */}
                    <div
                      className={cn(
                        "relative flex items-center justify-center size-8 sm:size-9 rounded-full shadow-lg font-black text-xs border-2 transition-all",
                        isRetro
                          ? "bg-red-600 text-amber-300 border-amber-300 shadow-red-950/80 hover:bg-red-700"
                          : "bg-white text-zinc-900 border-primary shadow-black/40 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white"
                      )}
                    >
                      {spot.price_cents ? (
                        <span className="text-[10px] leading-tight font-black">
                          R$
                        </span>
                      ) : (
                        <ShoppingBag className="size-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Mini-Card Flutuante do Produto Selecionado (Bottom-Right) ─── */}
          {activeHotspot && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-84 z-40 bg-background/95 backdrop-blur-xl p-4 rounded-2xl border border-border/80 shadow-2xl text-foreground animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/40">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Tag className="size-3.5 text-primary" />
                  <span>Oferta Vinculada</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveHotspot(null)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="mt-3 flex gap-3 items-center">
                {activeHotspot.image_url ? (
                  <img
                    src={activeHotspot.image_url}
                    alt={activeHotspot.title || "Produto"}
                    className="size-14 rounded-xl object-cover border border-border/50 shrink-0 bg-muted"
                  />
                ) : (
                  <div className="size-14 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                    <ShoppingBag className="size-6 text-muted-foreground/60" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight">
                    {activeHotspot.title || "Produto em Oferta"}
                  </h4>
                  {activeHotspot.price_cents !== undefined && (
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {formatMoney(activeHotspot.price_cents)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação Direta (Thumb Zone / 3 Toques) */}
              <div className="mt-3.5 grid grid-cols-1 gap-2">
                {activeHotspot.product_id && (
                  <Button
                    onClick={() => handleAddToCart(activeHotspot)}
                    disabled={isAddingToCart}
                    className="w-full h-10 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ShoppingBag className="size-4" />
                    <span>Adicionar à Sacola</span>
                  </Button>
                )}

                {activeHotspot.product_slug && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-8 rounded-xl font-semibold text-xs gap-1.5 cursor-pointer border-border/60"
                  >
                    <Link
                      to="/produto/$slug"
                      params={{ slug: activeHotspot.product_slug }}
                      onClick={() => onOpenChange(false)}
                    >
                      <span>Ver Página Completa do Produto</span>
                      <ExternalLink className="size-3 opacity-70" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer: Dica de Toque & Gaveta de Todos os Produtos ──── */}
        <div className="px-4 py-2.5 bg-black/80 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {hotspots.length > 0
                ? `Toque nos botões redondos no encarte (${hotspots.length} ofertas marcadas)`
                : "Encarte promocional da loja"}
            </span>
          </div>

          {hotspots.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProductDrawer(!showProductDrawer)}
              className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>{showProductDrawer ? "Ocultar lista" : `Ver todas as ofertas (${hotspots.length})`}</span>
            </button>
          )}
        </div>

        {/* Gaveta Inferior com Lista de Todas as Ofertas Marcadas */}
        {showProductDrawer && hotspots.length > 0 && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-4 max-h-48 overflow-y-auto space-y-2 animate-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {hotspots.map((spot, idx) => (
                <div
                  key={spot.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{spot.title || "Produto"}</p>
                    {spot.price_cents !== undefined && (
                      <p className="text-xs font-semibold text-emerald-400">{formatMoney(spot.price_cents)}</p>
                    )}
                  </div>
                  {spot.product_id && (
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(spot)}
                      className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      + Sacola
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
