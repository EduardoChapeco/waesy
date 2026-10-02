import React from "react";
import { DollarSign, Percent, CreditCard, ShieldCheck, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UnifiedListingCommercial, UnifiedNiche } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export interface ListingPricingSectionProps {
  niche: UnifiedNiche;
  isWorkspace: boolean;
  value: Partial<UnifiedListingCommercial>;
  onChange: (patch: Partial<UnifiedListingCommercial>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ListingPricingSection({
  niche,
  isWorkspace,
  value,
  onChange,
  errors = {},
  className,
}: ListingPricingSectionProps) {
  const priceCents = value.price_cents ?? 0;
  const compareAtCents = value.compare_at_cents ?? null;
  const costCents = value.cost_cents ?? null;
  const paymentMethods = value.payment_methods ?? ["pix", "credit_card"];
  const maxInstallments = value.max_installments ?? 1;
  const feeFreeInstallments = value.fee_free_installments ?? 1;
  const pixDiscountPercent = value.pix_discount_percent ?? 0;
  const depositPercent = value.deposit_percent ?? null;
  const balanceDueDays = value.balance_due_days ?? null;

  // Real-time Margin & Markup derivations (F18)
  const marginPercent =
    costCents && priceCents > 0 && priceCents > costCents
      ? Math.round(((priceCents - costCents) / priceCents) * 100)
      : null;

  const markupPercent =
    costCents && costCents > 0 && priceCents > costCents
      ? Math.round(((priceCents - costCents) / costCents) * 100)
      : null;

  const isTourismOrBooking = niche === "tourism" || niche === "services";

  const handleTogglePaymentMethod = (method: string) => {
    const next = paymentMethods.includes(method)
      ? paymentMethods.filter((m: string) => m !== method)
      : [...paymentMethods, method];
    // Ensure at least one method is selected
    if (next.length > 0) {
      onChange({ payment_methods: next });
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Bloco 1: Precificação Principal ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <DollarSign className="size-4 text-primary shrink-0" />
            <span>Valores e Precificação</span>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            Dono Único Comercial
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Preço de Venda */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground flex items-center gap-1">
              <span>Preço de Venda</span>
              <span className="text-destructive font-bold">*</span>
            </Label>
            <CurrencyField
              value={priceCents}
              onChange={(cents) => onChange({ price_cents: cents ?? 0 })}
              className={cn("h-11 rounded-lg text-sm bg-background", errors.price_cents && "border-destructive")}
            />
            {errors.price_cents && (
              <p className="text-xs text-destructive">{errors.price_cents}</p>
            )}
          </div>

          {/* Preço Comparativo (De / Por) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span>Preço Comparativo (De)</span>
              <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <CurrencyField
              value={compareAtCents ?? 0}
              onChange={(cents) => onChange({ compare_at_cents: typeof cents === "number" && cents > 0 ? cents : null })}
              className="h-11 rounded-lg text-sm bg-background"
            />
            <p className="text-xs text-muted-foreground">Exibe preço riscado na vitrine</p>
          </div>

          {/* Preço de Custo (Apenas Workspace - R04: Campo Interno) */}
          {isWorkspace && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <span>Custo de Aquisição</span>
                <span className="text-xs font-semibold text-primary/80">(Interno)</span>
              </Label>
              <CurrencyField
                value={costCents ?? 0}
                onChange={(cents) => onChange({ cost_cents: typeof cents === "number" && cents > 0 ? cents : null })}
                className="h-11 rounded-lg text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground">Nunca exibido ao cliente</p>
            </div>
          )}
        </div>

        {/* Indicador de Margem e Markup em tempo real */}
        {isWorkspace && costCents && costCents > 0 && (
          <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-xs">
              <TrendingUp className="size-4 text-emerald-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">Margem Bruta: </span>
                <strong className={cn(marginPercent && marginPercent > 20 ? "text-emerald-500" : "text-amber-500")}>
                  {marginPercent !== null ? `${marginPercent}%` : "0%"}
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-xs">
              <Percent className="size-4 text-primary shrink-0" />
              <div>
                <span className="text-muted-foreground">Markup Aplicado: </span>
                <strong className="text-foreground">
                  {markupPercent !== null ? `${markupPercent}%` : "0%"}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bloco 2: Formas de Pagamento e Parcelamento (Dono Único) ── */}
      <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <CreditCard className="size-4 text-primary shrink-0" />
          <span>Formas de Pagamento & Parcelamento</span>
        </div>

        {/* Seletor de Métodos */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Meios de Pagamento Aceitos</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "pix", label: "PIX Instantâneo" },
              { id: "credit_card", label: "Cartão de Crédito" },
              { id: "boleto", label: "Boleto Bancário" },
              { id: "cash", label: "Dinheiro / Na Entrega" },
            ].map((method) => {
              const isSelected = paymentMethods.includes(method.id);
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleTogglePaymentMethod(method.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-colors text-left min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span>{method.label}</span>
                  {isSelected && <ShieldCheck className="size-4 text-primary shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Configurações de Parcelamento e PIX */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Parcelas Máximas */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Parcelamento Máximo</Label>
            <Select
              value={String(maxInstallments)}
              onValueChange={(v) => {
                const max = Number(v);
                onChange({
                  max_installments: max,
                  fee_free_installments: Math.min(feeFreeInstallments, max),
                });
              }}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x (À vista)</SelectItem>
                <SelectItem value="3">Até 3x</SelectItem>
                <SelectItem value="6">Até 6x</SelectItem>
                <SelectItem value="10">Até 10x</SelectItem>
                <SelectItem value="12">Até 12x</SelectItem>
                <SelectItem value="18">Até 18x</SelectItem>
                <SelectItem value="24">Até 24x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parcelas Sem Juros */}
          {maxInstallments > 1 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Parcelas Sem Juros</Label>
              <Select
                value={String(feeFreeInstallments)}
                onValueChange={(v) => onChange({ fee_free_installments: Number(v) })}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num === 1 ? "Apenas à vista sem juros" : `Até ${num}x sem juros`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Desconto no PIX */}
          {paymentMethods.includes("pix") && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Desconto no PIX (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={pixDiscountPercent || ""}
                  onChange={(e) => onChange({ pix_discount_percent: Math.min(50, Math.max(0, Number(e.target.value))) })}
                  placeholder="0"
                  className="h-11 rounded-lg text-xs bg-background pr-8"
                />
                <Percent className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bloco 3: Condições de Reserva, Sinal e Saldo (Condicional Turismo/Serviços) ── */}
      {isTourismOrBooking && (
        <div className="bg-card rounded-lg p-4 sm:p-5 border border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span>Condições de Reserva & Sinal</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Específico {niche === "tourism" ? "Turismo" : "Serviços"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Percentual de Sinal para Reserva */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Sinal de Entrada para Garantia (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    onChange({ deposit_percent: val });
                  }}
                  placeholder="Ex: 30"
                  className="h-11 rounded-lg text-xs bg-background pr-8"
                />
                <Percent className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground">Valor pago no ato para segurar o embarque/vaga</p>
            </div>

            {/* Prazo para Quitação do Saldo */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Prazo do Saldo Restante (Dias antes)</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={balanceDueDays ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Number(e.target.value);
                  onChange({ balance_due_days: val });
                }}
                placeholder="Ex: 10 (10 dias antes da viagem)"
                className="h-11 rounded-lg text-xs bg-background"
              />
              <p className="text-xs text-muted-foreground">Antecedência mínima para quitar o saldo final</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
