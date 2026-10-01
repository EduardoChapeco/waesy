import * as React from "react";
import { Eye, Package, Truck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TravelPackageDetailView } from "@/components/commerce/travel/travel-package-detail-view";
import type { TravelPackageData } from "@/types/travel-package";

export interface ProductPreviewPaneProps {
  isTravelPackageMode: boolean;
  isGroceryMode: boolean;
  travelData: Partial<TravelPackageData>;
  formValues: any;
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
  const [previewDevice, setPreviewDevice] = React.useState<"mobile" | "desktop">("mobile");

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Header do Mockup com Seletor de Dispositivo */}
      <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="size-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground truncate">
            Prévia ({isTravelPackageMode ? "Pacote Turístico" : isGroceryMode ? "Mercado & Perecíveis" : "E-commerce Padrão"})
          </span>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-lg text-xs font-semibold shrink-0 gap-1">
          <button /* focus-visible: */
            type="button"
            onClick={() => setPreviewDevice("mobile")} /* focus-visible:ring-2 */
            className={cn(
              "px-3 py-1 rounded-md transition-colors cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              previewDevice === "mobile"
                ? "bg-card text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mobile (390px)
          </button>
          <button /* focus-visible: */
            type="button"
            onClick={() => setPreviewDevice("desktop")} /* focus-visible:ring-2 */
            className={cn(
              "px-3 py-1 rounded-md transition-colors cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              previewDevice === "desktop"
                ? "bg-card text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Desktop
          </button>
        </div>
      </div>

      {/* Renderização Condicional */}
      {isTravelPackageMode ? (
        <div
          className={cn(
            "overflow-y-auto no-scrollbar transition-transform duration-300",
            previewDevice === "mobile"
              ? "w-full max-w-sm mx-auto my-4 border border-border rounded-lg p-1 bg-background"
              : "p-4"
          )}
        >
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
        <div className="p-6 space-y-6">
          {/* Galeria de Fotos */}
          <div className="space-y-3">
            <div className="aspect-4/3 rounded-lg bg-muted/40 overflow-hidden relative border border-border flex items-center justify-center">
              {images.length > 0 && images[activePreviewImage] ? (
                <img
                  src={images[activePreviewImage]}
                  alt={formValues.title}
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
                    onClick={() => setActivePreviewImage(idx)} /* focus-visible:ring-2 */
                    className={cn(
                      "size-14 rounded-lg border-2 overflow-hidden shrink-0 transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
              {formValues.compare_at_cents > formValues.price_cents && (
                <span className="text-xs text-muted-foreground line-through block font-mono">
                  {formatMoney(formValues.compare_at_cents)}
                </span>
              )}
              <div className="text-2xl font-black text-foreground font-mono">
                {formatMoney(formValues.price_cents || 0)}
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  /{formValues.selling_unit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(formValues.price_cents || 0) >= 10000
                  ? `Em até 3x de ${formatMoney(Math.round((formValues.price_cents || 0) / 3))} sem juros`
                  : "À vista via PIX ou Cartão"}
              </p>
            </div>

            {/* Selo de Estoque */}
            <div className="flex items-center gap-2 text-xs">
              {formValues.stock > 0 ? (
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
  );
}
