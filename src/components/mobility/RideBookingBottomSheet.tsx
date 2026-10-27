/**
 * ============================================================================
 * Waesy Platform — RideBookingBottomSheet.tsx (BlaBlaCar & Apple HIG Parity)
 * ============================================================================
 * Bottom sheet interativo com 3 snap points para solicitação de corridas e caronas:
 * 1. Compact: Resumo de ETA e distância a pé do ponto de embarque.
 * 2. Medium: Formulário de endereços, ponto de encontro recomendado e categorias.
 * 3. Expanded: Detalhes completos, seletor de pagamento e CTA de confirmação.
 * Ref: Telas-de-carona-com-mapa-e-coleta.png, 34e05f9ec75d25ee8870aa1..._600.webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Navigation,
  MapPin,
  Clock,
  Car,
  Bike,
  Truck,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  ArrowRight,
  Footprints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SheetSnapPoint = "compact" | "medium" | "expanded";

export interface RideOptionItem {
  id: string;
  name: string;
  category: "moto" | "car" | "comfort" | "delivery" | "freight";
  etaMinutes: number;
  priceCents: number;
  originalPriceCents?: number;
  description?: string;
  seats?: number;
}

export interface RideBookingBottomSheetProps {
  snapPoint?: SheetSnapPoint;
  onSnapPointChange?: (snap: SheetSnapPoint) => void;
  originText?: string;
  destinationText?: string;
  walkingDistanceMeters?: number; // ex: 180m a pé
  walkingMinutes?: number; // ex: 2 min
  options?: RideOptionItem[];
  selectedOptionId?: string | null;
  onSelectOption?: (id: string) => void;
  paymentMethod?: "pix" | "card" | "cash";
  onSelectPaymentMethod?: (method: "pix" | "card" | "cash") => void;
  onConfirmRide?: () => void;
  isConfirming?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const DEFAULT_OPTIONS: RideOptionItem[] = [
  {
    id: "moto-1",
    name: "MotoLink Express",
    category: "moto",
    etaMinutes: 3,
    priceCents: 990,
    originalPriceCents: 1200,
    description: "Rápido e econômico no trânsito urbano",
    seats: 1,
  },
  {
    id: "car-1",
    name: "Waesy Go Econômico",
    category: "car",
    etaMinutes: 5,
    priceCents: 1690,
    description: "Carros 4 portas com ar-condicionado",
    seats: 4,
  },
  {
    id: "comfort-1",
    name: "Waesy Comfort",
    category: "comfort",
    etaMinutes: 7,
    priceCents: 2250,
    description: "Veículos espaçosos e condutores 5 estrelas",
    seats: 4,
  },
];

export function RideBookingBottomSheet({
  snapPoint: controlledSnapPoint,
  onSnapPointChange,
  originText = "Minha Localização Atual",
  destinationText = "",
  walkingDistanceMeters = 180,
  walkingMinutes = 2,
  options = DEFAULT_OPTIONS,
  selectedOptionId,
  onSelectOption,
  paymentMethod = "pix",
  onSelectPaymentMethod,
  onConfirmRide,
  isConfirming = false,
  children,
  className,
}: RideBookingBottomSheetProps) {
  const [internalSnapPoint, setInternalSnapPoint] = useState<SheetSnapPoint>("medium");

  const currentSnap = controlledSnapPoint ?? internalSnapPoint;
  const setSnap = (next: SheetSnapPoint) => {
    setInternalSnapPoint(next);
    onSnapPointChange?.(next);
  };

  const selectedOption = options.find((o) => o.id === selectedOptionId) || options[0];

  const toggleSnap = () => {
    if (currentSnap === "compact") setSnap("medium");
    else if (currentSnap === "medium") setSnap("expanded");
    else setSnap("compact");
  };

  return (
    <div
      className={cn(
        "absolute z-30 bottom-0 left-0 right-0 bg-card/95 backdrop-blur-2xl border-t border-border/80 shadow-2xl transition-all duration-300 rounded-t-3xl overflow-hidden flex flex-col",
        currentSnap === "compact" && "h-36 sm:h-40",
        currentSnap === "medium" && "h-[54vh] sm:h-[480px]",
        currentSnap === "expanded" && "h-[88vh] sm:h-[620px]",
        className
      )}
    >
      {/* ── Handle Bar de Arraste / Toque ── */}
      <button
        type="button"
        onClick={toggleSnap}
        className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Alternar tamanho do painel (atual: ${currentSnap})`}
      >
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
      </button>

      {/* ── Ponto de Coleta e Raio a Pé (BlaBlaCar Parity) ── */}
      <div className="px-4 pb-2">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium min-w-0">
            <Footprints className="size-4 text-primary shrink-0" />
            <span className="truncate">
              Ponto de embarque: <strong>{walkingDistanceMeters}m</strong> ({walkingMinutes} min a pé)
            </span>
          </div>
          <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            Tarifa reduzida
          </span>
        </div>
      </div>

      {/* Conteúdo Conforme o Snap Point */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3.5 no-scrollbar">
        {/* Origem e Destino Resumidos */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-foreground">
            <Navigation className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{originText}</span>
          </div>
          {destinationText ? (
            <div className="flex items-center gap-2.5 text-xs text-foreground border-t border-border/30 pt-2">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="truncate font-bold">{destinationText}</span>
            </div>
          ) : (
            <div className="text-2xs text-muted-foreground border-t border-border/30 pt-1.5">
              Selecione o destino no mapa ou campo de busca
            </div>
          )}
        </div>

        {/* Custom children or Ride Options */}
        {children ? (
          children
        ) : (
          <>
            {/* Lista de Opções de Corrida */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block px-1">
                Veículos Disponíveis
              </span>

              <div className="space-y-2">
                {options.map((opt) => {
                  const isSelected = (selectedOptionId || options[0]?.id) === opt.id;
                  const Icon = opt.category === "moto" ? Bike : opt.category === "freight" ? Truck : Car;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectOption?.(opt.id)}
                      className={cn(
                        "w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "bg-foreground text-background border-foreground shadow-sm scale-101"
                          : "bg-card border-border/60 hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0",
                            isSelected ? "bg-background text-foreground" : "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold">{opt.name}</span>
                            <span
                              className={cn(
                                "text-3xs px-1.5 py-0.5 rounded-full font-semibold",
                                isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {opt.etaMinutes} min
                            </span>
                          </div>
                          {opt.description && (
                            <span
                              className={cn(
                                "text-2xs block truncate max-w-[200px] sm:max-w-xs",
                                isSelected ? "text-background/80" : "text-muted-foreground"
                              )}
                            >
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono">
                          {formatMoney(opt.priceCents)}
                        </div>
                        {opt.originalPriceCents && (
                          <span
                            className={cn(
                              "text-3xs line-through block font-mono",
                              isSelected ? "text-background/60" : "text-muted-foreground"
                            )}
                          >
                            {formatMoney(opt.originalPriceCents)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Pagamento (Snap Medium & Expanded) */}
            {currentSnap !== "compact" && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block px-1">
                  Forma de Pagamento
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod?.("pix")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      paymentMethod === "pix"
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                    )}
                  >
                    <QrCode className="size-4" />
                    <span>Pix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod?.("card")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      paymentMethod === "card"
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                    )}
                  >
                    <CreditCard className="size-4" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod?.("cash")}
                    className={cn(
                      "h-11 min-h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      paymentMethod === "cash"
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground"
                    )}
                  >
                    <Banknote className="size-4" />
                    <span>Dinheiro</span>
                  </button>
                </div>
              </div>
            )}

            {/* CTA Primário de Confirmação de Chamada */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={onConfirmRide}
                disabled={isConfirming}
                className="w-full rounded-2xl h-11 min-h-11 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                <span>{isConfirming ? "Chamando condutor..." : `Confirmar ${selectedOption?.name || "Corrida"}`}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
