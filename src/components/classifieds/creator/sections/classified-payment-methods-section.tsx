import {
  CreditCard,
  QrCode,
  BadgePercent,
  Banknote,
  Receipt,
  FileSpreadsheet,
  BookOpenCheck,
  RefreshCw,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ClassifiedCancellationPolicy = "flexible" | "moderate" | "strict" | "negotiable";

export interface ClassifiedPaymentMethodsSectionProps {
  priceCents?: number;
  acceptsPix: boolean;
  onAcceptsPixChange: (value: boolean) => void;
  pixDiscountPercent: number;
  onPixDiscountPercentChange: (value: number) => void;
  acceptsCard: boolean;
  onAcceptsCardChange: (value: boolean) => void;
  maxInstallments: number;
  onMaxInstallmentsChange: (value: number) => void;
  cardInterestFree: boolean;
  onCardInterestFreeChange: (value: boolean) => void;
  paymentLink: string;
  onPaymentLinkChange: (value: string) => void;
  acceptsCash: boolean;
  onAcceptsCashChange: (value: boolean) => void;
  acceptsBoleto: boolean;
  onAcceptsBoletoChange: (value: boolean) => void;
  boletoDueDays: number;
  onBoletoDueDaysChange: (value: number) => void;
  acceptsBoletoInstallments: boolean;
  onAcceptsBoletoInstallmentsChange: (value: boolean) => void;
  maxBoletoInstallments: number;
  onMaxBoletoInstallmentsChange: (value: number) => void;
  boletoMinDownPaymentCents?: number;
  onBoletoMinDownPaymentCentsChange: (value: number | undefined) => void;
  boletoNotes: string;
  onBoletoNotesChange: (value: string) => void;
  acceptsCarne: boolean;
  onAcceptsCarneChange: (value: boolean) => void;
  maxCarneInstallments: number;
  onMaxCarneInstallmentsChange: (value: number) => void;
  carneGraceDays: number;
  onCarneGraceDaysChange: (value: number) => void;
  carneMinDownPaymentCents?: number;
  onCarneMinDownPaymentCentsChange: (value: number | undefined) => void;
  acceptsTrade: boolean;
  onAcceptsTradeChange: (value: boolean) => void;
  tradeNotes: string;
  onTradeNotesChange: (value: string) => void;
  acceptsFinancing: boolean;
  onAcceptsFinancingChange: (value: boolean) => void;
  financingNotes: string;
  onFinancingNotesChange: (value: string) => void;
  cancellationPolicy: ClassifiedCancellationPolicy;
  onCancellationPolicyChange: (value: ClassifiedCancellationPolicy) => void;
}

export function ClassifiedPaymentMethodsSection({
  priceCents,
  acceptsPix,
  onAcceptsPixChange,
  pixDiscountPercent,
  onPixDiscountPercentChange,
  acceptsCard,
  onAcceptsCardChange,
  maxInstallments,
  onMaxInstallmentsChange,
  cardInterestFree,
  onCardInterestFreeChange,
  paymentLink,
  onPaymentLinkChange,
  acceptsCash,
  onAcceptsCashChange,
  acceptsBoleto,
  onAcceptsBoletoChange,
  boletoDueDays,
  onBoletoDueDaysChange,
  acceptsBoletoInstallments,
  onAcceptsBoletoInstallmentsChange,
  maxBoletoInstallments,
  onMaxBoletoInstallmentsChange,
  boletoMinDownPaymentCents,
  onBoletoMinDownPaymentCentsChange,
  boletoNotes,
  onBoletoNotesChange,
  acceptsCarne,
  onAcceptsCarneChange,
  maxCarneInstallments,
  onMaxCarneInstallmentsChange,
  carneGraceDays,
  onCarneGraceDaysChange,
  carneMinDownPaymentCents,
  onCarneMinDownPaymentCentsChange,
  acceptsTrade,
  onAcceptsTradeChange,
  tradeNotes,
  onTradeNotesChange,
  acceptsFinancing,
  onAcceptsFinancingChange,
  financingNotes,
  onFinancingNotesChange,
  cancellationPolicy,
  onCancellationPolicyChange,
}: ClassifiedPaymentMethodsSectionProps) {
  return (
    <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
          <CreditCard className="size-4 text-primary shrink-0" />
          <span>Formas de Pagamento</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Ative as opções aceitas</span>
      </div>

      <div className="space-y-3">
        {/* 1. Pix */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsPix ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsPix ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <QrCode className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Pix (Pagamento Instantâneo)</h4>
                <p className="text-xs text-muted-foreground">
                  {pixDiscountPercent > 0
                    ? `${pixDiscountPercent}% de desconto à vista imediato`
                    : "Pagamento à vista com confirmação em segundos"}
                </p>
              </div>
            </div>
            <Switch checked={acceptsPix} onCheckedChange={onAcceptsPixChange} aria-label="Aceitar Pix" />
          </div>

          {acceptsPix && (
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <BadgePercent className="size-4 text-emerald-600" />
                  <span>Desconto no Pix à Vista</span>
                </Label>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-1 rounded-md">
                  {pixDiscountPercent}% OFF
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={pixDiscountPercent}
                onChange={(e) => onPixDiscountPercentChange(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full h-2 rounded-full accent-emerald-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Desconto no Pix"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>0% (Sem desconto)</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
              </div>
              {pixDiscountPercent > 0 && priceCents && priceCents > 0 && (
                <div className="pt-1 flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">
                    Economia: {formatMoney(Math.round(priceCents * (pixDiscountPercent / 100)))}
                  </span>
                  <span className="font-bold text-emerald-600">
                    Sai por: {formatMoney(Math.round(priceCents * (1 - pixDiscountPercent / 100)))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Cartão de Crédito (1x = À Vista, 2x+ = Parcelamento) */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsCard ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsCard ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Cartão de Crédito / Débito</h4>
                <p className="text-xs text-muted-foreground">
                  {maxInstallments === 1
                    ? "Cobrança única à vista"
                    : `À vista ou parcelado em até ${maxInstallments}x ${cardInterestFree ? "sem juros" : ""}`}
                </p>
              </div>
            </div>
            <Switch checked={acceptsCard} onCheckedChange={onAcceptsCardChange} aria-label="Aceitar Cartão" />
          </div>

          {acceptsCard && (
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-semibold flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <span>Parcelamento Máximo</span>
                </Label>
                <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2 py-1 rounded-md">
                  {maxInstallments === 1 ? "À vista" : `Até ${maxInstallments}x`}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                step={1}
                value={maxInstallments}
                onChange={(e) => onMaxInstallmentsChange(Number(e.target.value) || 1)}
                className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Parcelas no Cartão"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>À vista (1x)</span>
                <span>2x</span>
                <span>6x</span>
                <span>12x</span>
                <span>18x</span>
                <span>24x</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                {maxInstallments > 1 ? (
                  <div className="flex items-center gap-2">
                    <Switch checked={cardInterestFree} onCheckedChange={onCardInterestFreeChange} id="card-interest-free" />
                    <Label
                      htmlFor="card-interest-free"
                      className="text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Sem juros para o comprador
                    </Label>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Somente à vista (sem parcelas)</span>
                )}

                {priceCents && priceCents > 0 && maxInstallments > 1 && (
                  <span className="text-xs text-muted-foreground font-mono font-medium">
                    {maxInstallments}x de <strong>{formatMoney(Math.round(priceCents / maxInstallments))}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Link de Pagamento Seguro / Checkout Externo */}
        <div className="pt-2 border-t border-border/40 space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Link de Pagamento Online (Opcional)</span>
            <span className="text-xs text-muted-foreground font-mono">Mercado Pago, Asaas, InfinitePay, etc.</span>
          </Label>
          <Input
            placeholder="https://mpago.la/... ou link da sua maquininha"
            value={paymentLink}
            onChange={(e) => onPaymentLinkChange(e.target.value)}
            className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Se preenchido, os clientes poderão clicar e pagar com cartão diretamente no seu anúncio.
          </p>
        </div>

        {/* 3. Dinheiro em Espécie (Presencial) */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-2",
            acceptsCash ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsCash ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <Banknote className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Dinheiro em Espécie (Presencial)</h4>
                <p className="text-xs text-muted-foreground">
                  Pagamento no ato da entrega pelo motoboy ou na retirada no balcão
                </p>
              </div>
            </div>
            <Switch checked={acceptsCash} onCheckedChange={onAcceptsCashChange} aria-label="Aceitar Dinheiro" />
          </div>
        </div>

        {/* 4. Boleto Bancário à Vista */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsBoleto ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsBoleto ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <Receipt className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Bancário à Vista</h4>
                <p className="text-xs text-muted-foreground">
                  {acceptsBoleto
                    ? `Compensação com vencimento em ${boletoDueDays} dias úteis`
                    : "Emissão de boleto para pagamento em bancos ou lotéricas"}
                </p>
              </div>
            </div>
            <Switch checked={acceptsBoleto} onCheckedChange={onAcceptsBoletoChange} aria-label="Aceitar Boleto" />
          </div>

          {acceptsBoleto && (
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Prazo de Vencimento</Label>
                <span className="text-xs font-mono font-bold text-primary">{boletoDueDays} dias úteis</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[1, 2, 3, 5, 7].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={boletoDueDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => onBoletoDueDaysChange(days)}
                    className="h-11 min-h-11 text-xs font-semibold rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Boleto Parcelado */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsBoletoInstallments
              ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
              : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsBoletoInstallments ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Parcelado</h4>
                <p className="text-xs text-muted-foreground">
                  {acceptsBoletoInstallments
                    ? `Parcelamento em até ${maxBoletoInstallments}x direto`
                    : "Parcelamento via boletos mensais emitidos pela loja"}
                </p>
              </div>
            </div>
            <Switch
              checked={acceptsBoletoInstallments}
              onCheckedChange={onAcceptsBoletoInstallmentsChange}
              aria-label="Aceitar Boleto Parcelado"
            />
          </div>

          {acceptsBoletoInstallments && (
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-semibold">Número de Boletos</Label>
                <span className="text-xs font-black text-primary font-mono">Até {maxBoletoInstallments}x</span>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={maxBoletoInstallments}
                onChange={(e) => onMaxBoletoInstallmentsChange(Number(e.target.value) || 2)}
                className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Número de Boletos"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                  <CurrencyField
                    value={boletoMinDownPaymentCents}
                    onChange={onBoletoMinDownPaymentCentsChange}
                    placeholder="0,00"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Requisitos</Label>
                  <Input
                    value={boletoNotes}
                    onChange={(e) => onBoletoNotesChange(e.target.value)}
                    placeholder="Ex: Análise cadastral"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Carnê Digital Waesy */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsCarne ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsCarne ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <BookOpenCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Carnê Digital Waesy</h4>
                <p className="text-xs text-muted-foreground">
                  {acceptsCarne
                    ? `Parcelamento em até ${maxCarneInstallments}x direto no app`
                    : "Emissão de crediário digital com gestão pela plataforma"}
                </p>
              </div>
            </div>
            <Switch checked={acceptsCarne} onCheckedChange={onAcceptsCarneChange} aria-label="Aceitar Carnê Digital" />
          </div>

          {acceptsCarne && (
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-semibold">Parcelas no Carnê</Label>
                <span className="text-xs font-black text-primary font-mono">Até {maxCarneInstallments}x</span>
              </div>
              <input
                type="range"
                min={2}
                max={36}
                step={1}
                value={maxCarneInstallments}
                onChange={(e) => onMaxCarneInstallmentsChange(Number(e.target.value) || 2)}
                className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Parcelas no Carnê"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">1º Vencimento</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                    {[30, 45, 60].map((days) => (
                      <Button
                        key={days}
                        type="button"
                        variant={carneGraceDays === days ? "default" : "outline"}
                        size="sm"
                        onClick={() => onCarneGraceDaysChange(days)}
                        className="h-11 min-h-11 text-xs font-semibold rounded-lg"
                      >
                        {days}d
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                  <CurrencyField
                    value={carneMinDownPaymentCents}
                    onChange={onCarneMinDownPaymentCentsChange}
                    placeholder="0,00"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Aceita Troca / Permuta */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsTrade ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsTrade ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <RefreshCw className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Aceita Troca / Permuta</h4>
                <p className="text-xs text-muted-foreground">
                  Aceita propostas de troca por outros itens, veículos ou produtos
                </p>
              </div>
            </div>
            <Switch checked={acceptsTrade} onCheckedChange={onAcceptsTradeChange} aria-label="Aceitar Troca" />
          </div>

          {acceptsTrade && (
            <div className="pt-2 border-t border-border/40 space-y-1">
              <Label className="text-xs font-semibold text-foreground">O que você aceita na troca?</Label>
              <Input
                value={tradeNotes}
                onChange={(e) => onTradeNotesChange(e.target.value)}
                placeholder="Ex: Veículo, moto, eletrônicos ou itens sob avaliação"
                className="h-11 min-h-11 text-xs"
              />
            </div>
          )}
        </div>

        {/* 8. Financiamento Bancário */}
        <div
          className={cn(
            "p-4 sm:p-4 rounded-lg border transition-colors space-y-3",
            acceptsFinancing
              ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
              : "border-border/60 bg-muted/20 opacity-80",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  acceptsFinancing ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                <Landmark className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground">Financiamento Bancário</h4>
                <p className="text-xs text-muted-foreground">
                  Intermediação com bancos parceiros ou carta de consórcio contemplada
                </p>
              </div>
            </div>
            <Switch checked={acceptsFinancing} onCheckedChange={onAcceptsFinancingChange} aria-label="Aceitar Financiamento" />
          </div>

          {acceptsFinancing && (
            <div className="pt-2 border-t border-border/40 space-y-1">
              <Label className="text-xs font-semibold text-foreground">Bancos ou cartas aceitas</Label>
              <Input
                value={financingNotes}
                onChange={(e) => onFinancingNotesChange(e.target.value)}
                placeholder="Ex: Financiamento bancário ou consórcio contemplado"
                className="h-11 min-h-11 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cancelamento */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <Label className="text-xs text-foreground font-semibold">Política de Cancelamento</Label>
        <Select value={cancellationPolicy} onValueChange={(v) => onCancellationPolicyChange(v as ClassifiedCancellationPolicy)}>
          <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flexible">Flexível (até 24h antes)</SelectItem>
            <SelectItem value="moderate">Moderado (50% de reembolso)</SelectItem>
            <SelectItem value="strict">Rígido (não reembolsável)</SelectItem>
            <SelectItem value="negotiable">A combinar</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
