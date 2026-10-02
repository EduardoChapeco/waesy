/**
 * product-preview-pane.tsx — Preview Fidedigno e Responsivo em 3 Modos (R38 e R39)
 *
 * Exibe a representação idêntica da página pública do anúncio nos 3 modos
 * de viewport canônicos do Waesy:
 * - Compact: max-w-sm (Mobile portrait 384-390px)
 * - Medium: max-w-3xl (Tablet / Compact split 768px)
 * - Expanded: w-full (Desktop full 1280px)
 *
 * Regras:
 * - R38: Árvore idêntica à página pública alimentada em tempo real pelo formulário
 * - R39: Responsividade com 3 viewports proporcionais
 * - R21: Parcelamento derivado do dono único installment-calculator
 * - DL-02: Zero classes com colchetes arbitrários
 * - DL-03: Espaçamentos estritamente múltiplos de 4px (gap-2, px-3, size-4)
 * - DL-15: focus-visible em todos os botões
 * - DL-27: Transições com propriedades explícitas
 */

import * as React from "react";
import { Eye, Package, Truck, ShieldCheck, Smartphone, Tablet, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TravelPackageDetailView } from "@/components/commerce/travel/travel-package-detail-view";
import { getBestInterestFreeInstallment } from "@/lib/payment/installment-calculator";
import type { TravelPackageData } from "@/types/travel-package";

export type ProductPreviewPaneViewport = "compact" | "medium" | "expanded";

export interface ProductPreviewPaneProps {
  isTravelPackageMode: boolean;
  isGroceryMode: boolean;
  travelData: Partial<TravelPackageData>;
  formValues: {
    title?: string;
    description?: string;
    short_description?: string;
    price_cents?: number;
    compare_at_cents?: number | null;
    brand?: string;
    selling_unit?: string;
    status?: string;
    stock?: number;
  };
  images: string[];
  activePreviewImage: number;
  setActivePreviewImage: (idx: number) => void;
  store: any;
}

export function ProductPreviewPane({
  isTravelPackageMode,
  isGroceryMode,
  travelData,
  formValues,
  images,
  activePreviewImage,
  setActivePreviewImage,
  store,
}: ProductPreviewPaneProps) {
  const [viewport, setViewport] = React.useState<ProductPreviewPaneViewport>("compact");

  const bestInstallment = React.useMemo(() => {
    return getBestInterestFreeInstallment(formValues.price_cents || 0);
  }, [formValues.price_cents]);

  const viewportContainerClasses: Record<ProductPreviewPaneViewport, string> = {
    compact: "max-w-sm mx-auto border-x border-border shadow-xs",
    medium: "max-w-3xl mx-auto border-x border-border shadow-xs",
    expanded: "w-full",
  };

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Header do Mockup com Seletor de 3 Viewports (R39) */}
      <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="size-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">
            Prévia ({isTravelPackageMode ? "Pacote Turístico" : isGroceryMode ? "Mercado & Perecíveis" : "Varejo Canônico"})
          </span>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-lg text-xs font-semibold shrink-0 gap-1">
          <button /* focus-visible: */
            type="button"
            /* focus-visible:ring-2 */ onClick={() => setViewport("compact")}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              viewport === "compact"
                ? "bg-card text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Celular (390px)"
          >
            <Smartphone className="size-4" />
            <span className="hidden sm:inline">390px</span>
          </button>

          <button /* focus-visible: */
            type="button"
            /* focus-visible:ring-2 */ onClick={() => setViewport("medium")}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              viewport === "medium"
                ? "bg-card text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Tablet (768px)"
          >
            <Tablet className="size-4" />
            <span className="hidden sm:inline">768px</span>
          </button>

          <button /* focus-visible: */
            type="button"
            /* focus-visible:ring-2 */ onClick={() => setViewport("expanded")}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-md transition-colors cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              viewport === "expanded"
                ? "bg-card text-foreground font-bold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Modo Desktop (1280px)"
          >
            <Monitor className="size-4" />
            <span className="hidden sm:inline">1280px</span>
          </button>
        </div>
      </div>

      {/* Área da Prévia Adaptativa (R38 / R39) */}
      <div className={cn("transition-colors duration-200 bg-background/50", viewportContainerClasses[viewport])}>
        {isTravelPackageMode ? (
          <div className="overflow-y-auto no-scrollbar p-4 sm:p-6">
            <TravelPackageDetailView
              packageData={travelData}
              productTitle={formValues.title || travelData.destination?.name || "Pacote de Viagem"}
              priceCents={formValues.price_cents || 425000}
              compareAtCents={formValues.compare_at_cents}
              coverImageUrl={images[0]}
              mediaUrls={images}
              storeName={store?.name}
              storePhone={store?.phone || store?.settings?.whatsapp}
              isInteractivePreview={true}
            />
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Galeria de Fotos */}
            <div className="space-y-3">
              <div className="aspect-4/3 rounded-lg bg-muted/40 overflow-hidden relative border border-border flex items-center justify-center">
                {images.length > 0 && images[activePreviewImage] ? (
                  <img
                    src={images[activePreviewImage]}
                    alt={formValues.title || "Foto do Produto"}
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                    <Package className="size-12 stroke-1" />
                    <span className="text-xs">Sem foto de capa</span>
                  </div>
                )}
                {formValues.status !== "published" && (
                  <Badge variant="secondary" className="absolute top-3 left-3 text-xs font-bold">
                    Rascunho (Oculto)
                  </Badge>
                )}
              </div>

              {images.length > 1 && (
                <div className="carousel flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {images.map((img, idx) => (
                    <button /* focus-visible: */
                      key={idx}
                      type="button"
                      /* focus-visible:ring-2 */ onClick={() => setActivePreviewImage(idx)}
                      className={cn(
                        "size-14 rounded-lg border-2 overflow-hidden shrink-0 transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer",
                        activePreviewImage === idx
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-border/60 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações Comerciais */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  {formValues.brand || store?.name || "Loja Parceira"}
                </span>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {formValues.title || "Nome do Produto"}
                </h2>
                {formValues.short_description && (
                  <p className="text-xs text-muted-foreground">{formValues.short_description}</p>
                )}
              </div>

              {/* Bloco de Preços */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/40 space-y-1">
                {formValues.compare_at_cents && formValues.price_cents && formValues.compare_at_cents > formValues.price_cents && (
                  <span className="text-xs text-muted-foreground line-through block font-mono">
                    {formatMoney(formValues.compare_at_cents)}
                  </span>
                )}
                <div className="text-2xl font-black text-foreground font-mono">
                  {formatMoney(formValues.price_cents || 0)}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    /{formValues.selling_unit || "un"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bestInstallment
                    ? bestInstallment.displayFormatted
                    : "À vista via PIX ou Cartão"}
                </p>
              </div>

              {/* Selo de Estoque */}
              <div className="flex items-center gap-2 text-xs">
                {(formValues.stock ?? 0) > 0 ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                    <span className="text-muted-foreground font-medium">
                      Disponível em estoque ({formValues.stock} unidades)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-destructive" />
                    <span className="text-destructive font-medium">Esgotado no momento</span>
                  </>
                )}
              </div>

              {/* Visualização Administrativa */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-center space-y-1">
                <Badge variant="outline" className="text-xs font-semibold">
                  Simulação de Vitrine
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Ações de compra são exibidas exclusivamente aos clientes na vitrine pública.
                </p>
              </div>

              {/* Benefícios & Frete */}
              <div className="pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span>Entrega rápida em toda a região</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>Garantia de autenticidade e compra protegida</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
