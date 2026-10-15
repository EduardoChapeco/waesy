import React from "react";
import { Truck, Store, MapPin, CheckCircle2, ShieldCheck, Clock, Building2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ShippingRateOption {
  id: string;
  name?: string;
  service_name?: string;
  price_cents: number;
  estimated_days?: number;
  estimated_time?: string;
  notice?: string;
}

export interface DeliverySelectorProps {
  method: "delivery" | "pickup";
  onMethodChange: (method: "delivery" | "pickup") => void;
  rates?: ShippingRateOption[];
  selectedRateId?: string | null;
  onSelectRate?: (rate: ShippingRateOption) => void;
  isCalculatingRates?: boolean;
  storeAddress?: string | null;
  storeName?: string | null;
  doorDeliverySelected?: boolean;
  onToggleDoorDelivery?: (selected: boolean) => void;
  doorDeliveryFeeCents?: number;
  onOpenPolicySheet?: () => void;
  className?: string;
}

/**
 * DeliverySelector — Seletor Comercial Desmistificado de Entrega e Retirada
 * Extermina terminologias técnicas como "Waesy Link" e apresenta puramente:
 * 1. Retirada no Balcão: Grátis • Endereço da loja
 * 2. Entrega no Endereço: Valor do frete • Prazo estimado • Opção de entrega na porta
 */
export function DeliverySelector({
  method,
  onMethodChange,
  rates = [],
  selectedRateId,
  onSelectRate,
  isCalculatingRates = false,
  storeAddress,
  storeName,
  doorDeliverySelected = false,
  onToggleDoorDelivery,
  doorDeliveryFeeCents = 400,
  onOpenPolicySheet,
  className,
}: DeliverySelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* ── 1. Abas Primárias de Modalidade Comercial ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de recebimento">
        {/* Opção: Entrega no Endereço */}
        <button
          type="button"
          role="radio"
          aria-checked={method === "delivery"}
          onClick={() => onMethodChange("delivery")}
          className={cn(
            "p-4 rounded-lg border text-left flex items-center gap-3 transition-colors motion-reduce:transition-none cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            method === "delivery"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card border-border/80 text-foreground hover:bg-muted/40"
          )}
        >
          <div
            className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              method === "delivery" ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
            )}
          >
            <Truck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">Entrega no Endereço</p>
            <p
              className={cn(
                "text-xs truncate",
                method === "delivery" ? "text-background/80" : "text-muted-foreground"
              )}
            >
              Receba com agilidade onde estiver
            </p>
          </div>
          {method === "delivery" && (
            <CheckCircle2 className="size-5 text-background shrink-0" />
          )}
        </button>

        {/* Opção: Retirada no Balcão */}
        <button
          type="button"
          role="radio"
          aria-checked={method === "pickup"}
          onClick={() => onMethodChange("pickup")}
          className={cn(
            "p-4 rounded-lg border text-left flex items-center gap-3 transition-colors motion-reduce:transition-none cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            method === "pickup"
              ? "bg-foreground text-background border-foreground font-bold shadow-xs"
              : "bg-card border-border/80 text-foreground hover:bg-muted/40"
          )}
        >
          <div
            className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              method === "pickup" ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
            )}
          >
            <Store className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold truncate">Retirada no Balcão</p>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-semibold px-2 py-0",
                  method === "pickup"
                    ? "bg-background/20 text-background border-transparent"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}
              >
                Grátis
              </Badge>
            </div>
            <p
              className={cn(
                "text-xs truncate",
                method === "pickup" ? "text-background/80" : "text-muted-foreground"
              )}
            >
              Retire diretamente na loja parceira
            </p>
          </div>
          {method === "pickup" && (
            <CheckCircle2 className="size-5 text-background shrink-0" />
          )}
        </button>
      </div>

      {/* ── 2. Conteúdo de Retirada no Balcão ── */}
      {method === "pickup" && (
        <div className="p-4 rounded-lg border border-border/80 bg-muted/20 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 text-primary shrink-0 mt-1" />
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Local de Retirada
              </p>
              <p className="text-sm font-semibold text-foreground">
                {storeName || "Loja Parceira"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {storeAddress || "Endereço informado após a confirmação do pedido."}
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Clock className="size-4 shrink-0" />
                <span>Pronto para retirada em até 1 dia útil após confirmação</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Conteúdo de Entrega no Endereço ── */}
      {method === "delivery" && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Lista de Opções de Frete */}
          {isCalculatingRates ? (
            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 flex items-center justify-center gap-2 text-xs text-muted-foreground min-h-14">
              <span>Calculando frete e prazos para o seu endereço...</span>
            </div>
          ) : rates.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground block">
                Escolha o prazo e valor de envio
              </span>
              <div className="grid gap-2">
                {rates.map((rate, idx) => {
                  const rateKey = rate.id || `rate-${idx}`;
                  const isSelected = selectedRateId === rateKey;
                  const displayName = rate.name || rate.service_name || "Entrega Expressa";
                  const displayEstimate =
                    rate.estimated_time ||
                    (rate.estimated_days !== undefined
                      ? rate.estimated_days === 0
                        ? "30 a 50 min"
                        : `${rate.estimated_days} ${rate.estimated_days === 1 ? "dia útil" : "dias úteis"}`
                      : "1 a 2 dias úteis");

                  return (
                    <button
                      key={rateKey}
                      type="button"
                      onClick={() => onSelectRate?.({ ...rate, id: rateKey })}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors motion-reduce:transition-none cursor-pointer min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary font-medium"
                          : "bg-card border-border/80 hover:bg-muted/40"
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30 py-0">
                              Selecionado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 shrink-0" />
                          <span>Previsão estimada: {displayEstimate}</span>
                        </p>
                        {rate.notice && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {rate.notice}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-sm text-foreground ml-3 shrink-0">
                        {rate.price_cents === 0 ? "Grátis" : formatMoney(rate.price_cents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 text-xs text-muted-foreground">
              Informe o CEP do seu endereço para calcular prazos e valores de entrega.
            </div>
          )}

          {/* Opção de Entrega na Porta / Condomínio */}
          {onToggleDoorDelivery && (
            <label
              className={cn(
                "p-4 rounded-lg border transition-colors motion-reduce:transition-none flex items-start gap-3 cursor-pointer select-none focus-within:ring-2 focus-within:ring-primary",
                doorDeliverySelected
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                  : "bg-card border-border/70 hover:border-border"
              )}
            >
              <div className="min-h-11 flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={doorDeliverySelected}
                  onChange={(e) => onToggleDoorDelivery(e.target.checked)}
                  className="size-5 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  aria-label="Entrega na porta de casa ou apartamento"
                />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      Entrega na porta (Condomínio / Apartamento)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary shrink-0">
                    +{formatMoney(doorDeliveryFeeCents)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O entregador sobe até o seu apartamento ou adentra o condomínio para entregar diretamente em mãos.
                </p>
                {onOpenPolicySheet && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenPolicySheet();
                    }}
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <ShieldCheck className="size-3" />
                    <span>Políticas de Entrega Segura</span>
                  </button>
                )}
              </div>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
