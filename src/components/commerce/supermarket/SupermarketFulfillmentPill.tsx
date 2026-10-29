import React, { useState } from "react";
import {
  Truck,
  Storefront,
  CaretDown,
  CaretRight,
  Clock,
  CheckCircle,
  MapPin,
  X,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeliveryWindowDTO } from "@/services/supermarket.functions";

interface SupermarketFulfillmentPillProps {
  mode: "delivery" | "pickup";
  selectedWindow?: DeliveryWindowDTO | null;
  windows: DeliveryWindowDTO[];
  onSelectFulfillment: (mode: "delivery" | "pickup", window: DeliveryWindowDTO) => void;
  addressSummary?: string;
  storeAddressSummary?: string;
  className?: string;
}

export function SupermarketFulfillmentPill({
  mode,
  selectedWindow,
  windows,
  onSelectFulfillment,
  addressSummary = "Receber no meu endereço",
  storeAddressSummary = "Retirar na loja física",
  className,
}: SupermarketFulfillmentPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"delivery" | "pickup">(mode);

  const activeWindow = selectedWindow || windows.find((w) => w.mode === mode && w.isAvailable) || windows[0];

  const filteredWindows = windows.filter((w) => w.mode === activeTab);

  const handleChoose = (win: DeliveryWindowDTO) => {
    onSelectFulfillment(activeTab, win);
    setIsOpen(false);
  };

  return (
    <>
      {/* ── Botão Pílula Compacto na Vitrine (Piso 44px) ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full h-11 min-h-11 px-3.5 rounded-2xl bg-card border border-border/70 hover:border-border transition-colors flex items-center justify-between gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none",
          className,
        )}
        aria-label={`Modalidade de entrega: ${mode === "delivery" ? "Entrega" : "Retirada"}. Clique para alterar horário`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {mode === "delivery" ? (
              <Truck size={18} weight="bold" />
            ) : (
              <Storefront size={18} weight="bold" />
            )}
          </div>

          <div className="flex items-center gap-1.5 min-w-0 text-xs">
            <span className="font-bold text-foreground">
              {mode === "delivery" ? "Entrega" : "Retirada"}
            </span>
            <CaretDown size={12} weight="bold" className="text-muted-foreground" />
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground truncate">
              {activeWindow ? `${activeWindow.dateLabel} • ${activeWindow.timeWindow}` : "Horários disponíveis"}
            </span>
            {activeWindow && !activeWindow.isFree ? (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-foreground shrink-0">
                  R$ {(activeWindow.feeCents / 100).toFixed(2).replace(".", ",")}
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  Grátis
                </span>
              </>
            )}
          </div>
        </div>

        <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
      </button>

      {/* ── Modal / Sheet de Seleção de Modalidade e Janela ── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl gap-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              Como deseja receber sua compra?
            </DialogTitle>
          </DialogHeader>

          {/* Segmented Control: Entrega vs Retirada */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-muted gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("delivery")}
              className={cn(
                "h-11 min-h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "delivery"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Truck size={16} weight="bold" />
              Receber em Casa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pickup")}
              className={cn(
                "h-11 min-h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "pickup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Storefront size={16} weight="bold" />
              Retirar na Loja
            </button>
          </div>

          {/* Localização Atual */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
            <MapPin size={18} weight="duotone" className="text-primary shrink-0" />
            <span className="text-muted-foreground truncate">
              {activeTab === "delivery" ? addressSummary : storeAddressSummary}
            </span>
          </div>

          {/* Lista de Janelas de Horários Disponíveis */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
              Selecione o melhor horário:
            </span>

            {filteredWindows.length > 0 ? (
              filteredWindows.map((win) => {
                const isSelected = activeWindow?.id === win.id;
                return (
                  <button
                    key={win.id}
                    type="button"
                    disabled={!win.isAvailable}
                    onClick={() => handleChoose(win)}
                    className={cn(
                      "w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 min-h-11",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 hover:border-border text-foreground",
                      !win.isAvailable && "opacity-50 cursor-not-allowed bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Clock size={16} weight={isSelected ? "fill" : "regular"} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-tight">
                          {win.dateLabel} • {win.timeWindow}
                        </span>
                        {!win.isAvailable ? (
                          <span className="text-3xs text-destructive font-medium">Horário esgotado</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-bold", win.isFree ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                        {win.isFree ? "Grátis" : `R$ ${(win.feeCents / 100).toFixed(2).replace(".", ",")}`}
                      </span>
                      {isSelected ? <CheckCircle size={16} weight="fill" className="text-primary" /> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Nenhum horário disponível para esta modalidade no momento.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
