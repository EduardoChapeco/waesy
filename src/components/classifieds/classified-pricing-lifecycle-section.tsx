import { Coins, Clock, RefreshCw, Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyField } from "@/components/ui/currency-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  ClassifiedNicheType,
  ClassifiedPriceDisclaimer,
  ClassifiedPricingType,
  ClassifiedValidityDays,
} from "@/types/classified-editor";

export interface ClassifiedPricingLifecycleSectionProps {
  nicheId: ClassifiedNicheType;
  pricingType: ClassifiedPricingType;
  priceCents?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  negotiable: boolean;
  validityDays: ClassifiedValidityDays;
  offerLimit: string;
  stockLimit: string;
  priceDisclaimer: ClassifiedPriceDisclaimer;
  customDisclaimer: string;
  onPricingTypeChange: (value: ClassifiedPricingType) => void;
  onPriceCentsChange: (value: number | undefined) => void;
  onPriceMinCentsChange: (value: number | undefined) => void;
  onPriceMaxCentsChange: (value: number | undefined) => void;
  onNegotiableChange: (value: boolean) => void;
  onValidityDaysChange: (value: ClassifiedValidityDays) => void;
  onOfferLimitChange: (value: string) => void;
  onStockLimitChange: (value: string) => void;
  onPriceDisclaimerChange: (value: ClassifiedPriceDisclaimer) => void;
  onCustomDisclaimerChange: (value: string) => void;
}

export function ClassifiedPricingLifecycleSection({
  nicheId,
  pricingType,
  priceCents,
  priceMinCents,
  priceMaxCents,
  negotiable,
  validityDays,
  offerLimit,
  stockLimit,
  priceDisclaimer,
  customDisclaimer,
  onPricingTypeChange,
  onPriceCentsChange,
  onPriceMinCentsChange,
  onPriceMaxCentsChange,
  onNegotiableChange,
  onValidityDaysChange,
  onOfferLimitChange,
  onStockLimitChange,
  onPriceDisclaimerChange,
  onCustomDisclaimerChange,
}: ClassifiedPricingLifecycleSectionProps) {
  return (
    <div className="space-y-3 pt-1 border-t border-border/40">
      <div className="space-y-2">
        <Label className="text-xs text-foreground font-semibold">
          Modalidade de Preço
        </Label>
        <Select value={pricingType} onValueChange={(value) => onPricingTypeChange(value as ClassifiedPricingType)}>
          <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Preço Fixo Definido (R$)</SelectItem>
            <SelectItem value="starting_at">A partir de... (Preço Inicial)</SelectItem>
            <SelectItem value="price_range">Faixa de Preço (Mínimo e Máximo)</SelectItem>
            <SelectItem value="on_quote">Sob Orçamento / Cotação Personalizada</SelectItem>
            <SelectItem value="exchange_only">Troca / Permuta Direta (Sem valor)</SelectItem>
            <SelectItem value="free">Gratuito / Doação Solidária (R$ 0)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {pricingType === "fixed" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">
              {nicheId === "servico"
                ? "Valor Base (R$) *"
                : nicheId === "vaga"
                ? "Salário Proposto (R$) *"
                : "Valor (R$) *"}
            </Label>
            <CurrencyField
              value={priceCents}
              onChange={onPriceCentsChange}
              placeholder="0,00"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <div
              className="flex items-center gap-2 h-11 px-3 rounded-lg bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
              onClick={() => onNegotiableChange(!negotiable)}
            >
              <Checkbox
                id="neg-check"
                checked={negotiable}
                onCheckedChange={(checked) => onNegotiableChange(!!checked)}
              />
              <Label
                htmlFor="neg-check"
                className="text-xs text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium select-none"
              >
                Aceita Propostas / Negociável
              </Label>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">Validade do Anúncio (Obrigatório)</span>
          </div>
          <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border/50">
            {([30, 60, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onValidityDaysChange(days)}
                className={`px-3 py-2 text-xs text-muted-foreground/75 font-bold rounded-md min-h-11 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  validityDays === days
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground">
              Limite de Pedidos / Oferta (Opcional)
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 5 pedidos"
              value={offerLimit}
              onChange={(event) => onOfferLimitChange(event.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground">
              Estoque Físico Disponível (Opcional)
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 10 unidades"
              value={stockLimit}
              onChange={(event) => onStockLimitChange(event.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      </div>
      {pricingType === "starting_at" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">A partir de (R$) *</Label>
            <CurrencyField
              value={priceMinCents}
              onChange={(value) => {
                onPriceMinCentsChange(value);
                if (value && !priceCents) onPriceCentsChange(value);
              }}
              placeholder="0,00"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <div
              className="flex items-center gap-2 h-11 px-3 rounded-lg bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
              onClick={() => onNegotiableChange(!negotiable)}
            >
              <Checkbox
                id="neg-check-start"
                checked={negotiable}
                onCheckedChange={(checked) => onNegotiableChange(!!checked)}
              />
              <Label
                htmlFor="neg-check-start"
                className="text-xs text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium select-none"
              >
                Sujeito a orçamento final
              </Label>
            </div>
          </div>
        </div>
      )}
      {pricingType === "price_range" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Preço Mínimo (R$) *</Label>
            <CurrencyField
              value={priceMinCents}
              onChange={(value) => {
                onPriceMinCentsChange(value);
                if (value && !priceCents) onPriceCentsChange(value);
              }}
              placeholder="0,00"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Preço Máximo (R$) *</Label>
            <CurrencyField
              value={priceMaxCents}
              onChange={onPriceMaxCentsChange}
              placeholder="0,00"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      )}
      {pricingType === "on_quote" && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
          <p className="font-semibold flex items-center gap-2">
            <Coins className="size-4 shrink-0" />
            <span>Preço sob Orçamento / Cotação</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
            O anúncio exibirá "Sob Consulta" na vitrine pública e convidará os clientes a solicitarem cotação personalizada via WhatsApp.
          </p>
        </div>
      )}
      {pricingType === "exchange_only" && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
          <p className="font-semibold flex items-center gap-2">
            <RefreshCw className="size-4 shrink-0" />
            <span>Permuta / Troca Direta</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
            O anúncio será classificado como troca direta. Especifique na seção de pagamento o que você aceita em contrapartida.
          </p>
        </div>
      )}
      {pricingType === "free" && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
          <p className="font-semibold flex items-center gap-2">
            <Tag className="size-4 shrink-0" />
            <span>Gratuito / Doação Solidária (R$ 0)</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
            Este item ou serviço será oferecido gratuitamente para a comunidade local.
          </p>
        </div>
      )}
      <div className="space-y-2 pt-1">
        <Label className="text-xs text-foreground font-medium">
          Aviso sobre Valores / Flutuação
        </Label>
        <Select value={priceDisclaimer} onValueChange={(value) => onPriceDisclaimerChange(value as ClassifiedPriceDisclaimer)}>
          <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum aviso adicional</SelectItem>
            <SelectItem value="demonstrative">Preço ilustrativo / demonstrativo (sob consulta)</SelectItem>
            <SelectItem value="subject_to_availability">Sujeito à disponibilidade e estoque sem aviso prévio</SelectItem>
            <SelectItem value="seasonal">Tarifa sazonal válida para baixa temporada / dias úteis</SelectItem>
            <SelectItem value="exchange_rate">Sujeito a flutuação cambial e taxas governamentais</SelectItem>
            <SelectItem value="custom">Aviso personalizado por extenso</SelectItem>
          </SelectContent>
        </Select>
        {priceDisclaimer === "custom" && (
          <Input
            value={customDisclaimer}
            onChange={(event) => onCustomDisclaimerChange(event.target.value)}
            placeholder="Escreva o aviso que aparecerá na vitrine pública..."
            className="h-11 min-h-11 rounded-lg text-xs bg-background mt-2"
          />
        )}
      </div>
    </div>
  );
}
