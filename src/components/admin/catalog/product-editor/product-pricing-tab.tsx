import * as React from "react";
import { Controller } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Box,
  Plus,
  CreditCard,
  Truck,
  Store,
  Utensils,
  Ticket,
  Share2,
  Globe,
  Bot,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";
import { ProductBarcodeLabelModal } from "../product-barcode-label-modal";
import { Barcode } from "lucide-react";
import { getStoreChannelIntegrationsStatus } from "@/services/admin-catalog.functions";

export interface ProductPricingTabProps {
  control: any;
  register: any;
  setValue: any;
  formValues: any;
  nicheCtx: any;
  variantsMatrix: RawVariant[];
  onVariantsMatrixChange: (matrix: RawVariant[]) => void;
  onOpenAddDimension: () => void;
  optionGroups: any[];
  selectedOptionGroupIds: string[];
  onSelectedGroupIdsChange: (ids: string[]) => void;
  onOptionGroupsChange: (groups: any[]) => void;
  wholesaleEnabled?: boolean;
  isTravelPackageMode?: boolean;
  store?: any;
}

export function ProductPricingTab({
  control,
  register,
  setValue,
  formValues,
  nicheCtx,
  variantsMatrix,
  onVariantsMatrixChange,
  onOpenAddDimension,
  optionGroups,
  selectedOptionGroupIds,
  onSelectedGroupIdsChange,
  onOptionGroupsChange,
  wholesaleEnabled = false,
  isTravelPackageMode = false,
  store,
}: ProductPricingTabProps) {
  // Cálculo reativo dos limites da matriz 2D para governança estrita de preço e estoque (DEC-433)
  const matrixStats = React.useMemo(() => {
    if (!variantsMatrix || variantsMatrix.length === 0) return null;
    const basePrice = Number(formValues.price_cents || 0);
    let minP = Infinity;
    let maxP = -Infinity;
    let totalStock = 0;

    for (const v of variantsMatrix) {
      const effectivePrice =
        v.price_override_cents != null && Number(v.price_override_cents) > 0
          ? Number(v.price_override_cents)
          : basePrice;
      if (effectivePrice > 0 && effectivePrice < minP) minP = effectivePrice;
      if (effectivePrice > maxP) maxP = effectivePrice;
      totalStock += Number(v.stock || 0);
    }

    const resolvedMin = minP === Infinity ? basePrice : minP;
    const resolvedMax = maxP === -Infinity ? basePrice : maxP;

    return {
      minPrice: resolvedMin,
      maxPrice: resolvedMax,
      totalStock,
      hasRange: resolvedMin !== resolvedMax && resolvedMin > 0 && resolvedMax > 0,
    };
  }, [variantsMatrix, formValues.price_cents]);

  return (
    <div className="space-y-4">
      {/* Precificação e Margens */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <DollarSign className="size-4 text-primary" />
            <span>Precificação e Margens</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsLabelModalOpen(true)}
            className="h-11 rounded-lg text-xs font-bold gap-2 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Barcode className="size-4 text-primary" />
            <span>Imprimir Etiquetas</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Preço de Venda (R$) *</Label>
            <Controller
              control={control}
              name="price_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                />
              )}
            />
            {matrixStats && variantsMatrix.length > 0 && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
                <div className="text-muted-foreground leading-tight">
                  <span>Menor preço na grade: </span>
                  <strong className="text-foreground font-mono">{formatMoney(matrixStats.minPrice)}</strong>
                  {matrixStats.hasRange && (
                    <span className="text-muted-foreground"> (Varia até {formatMoney(matrixStats.maxPrice)})</span>
                  )}
                </div>
                {formValues.price_cents !== matrixStats.minPrice && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setValue("price_cents", matrixStats.minPrice)}
                    className="h-11 min-h-11 sm:h-8 px-2 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    Sincronizar
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preço De (Comparativo)</Label>
            <Controller
              control={control}
              name="compare_at_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preço de Custo (R$)</Label>
            <Controller
              control={control}
              name="cost_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Status do Produto</Label>
            <Select
              value={formValues.status}
              onValueChange={(val: any) => setValue("status", val)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publicado (Visível)</SelectItem>
                <SelectItem value="draft">Rascunho (Oculto)</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Estoque Inicial</Label>
              {variantsMatrix && variantsMatrix.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  Calculado pela grade ({matrixStats?.totalStock ?? 0} un)
                </span>
              )}
            </div>
            <Input
              type="number"
              {...register("stock", { valueAsNumber: true })}
              disabled={Boolean(variantsMatrix && variantsMatrix.length > 0)}
              value={variantsMatrix && variantsMatrix.length > 0 ? (matrixStats?.totalStock ?? 0) : undefined}
              placeholder={variantsMatrix && variantsMatrix.length > 0 ? "Calculado pela grade" : "10"}
              className={cn(
                "h-11 rounded-lg text-xs bg-background font-mono",
                variantsMatrix && variantsMatrix.length > 0 && "opacity-80 bg-muted/30 cursor-not-allowed"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">{nicheCtx.skuLabel}</Label>
            <Input
              {...register("sku")}
              placeholder={nicheCtx.skuPlaceholder}
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        {/* Toggle de Visibilidade de Estoque */}
        <Controller
          control={control}
          name="show_stock_publicly"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Exibir disponibilidade na vitrine</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Quando ativo, clientes veem o indicador de estoque ou esgotado.
                </p>
              </div>
              <Switch
                id="pricing_show_stock_publicly"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </div>

      {/* Regras Comerciais & Formas de Pagamento */}
      <div className="bg-card rounded-lg p-6 space-y-5 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <CreditCard className="size-4 text-primary" />
          <span>Regras Comerciais & Formas de Pagamento</span>
        </div>

        {/* Modo de Pagamento: Padrão vs Customizado */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">Regras de Pagamento</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setValue("payment_mode", "inherit")}
              className={`h-11 px-4 rounded-lg border text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                (formValues.payment_mode || "inherit") === "inherit"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <Store className="size-4" />
              <span>Padrão da Loja</span>
            </button>
            <button
              type="button"
              onClick={() => setValue("payment_mode", "custom")}
              className={`h-11 px-4 rounded-lg border text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                formValues.payment_mode === "custom"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <CreditCard className="size-4" />
              <span>Personalizar Pagamento</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {(formValues.payment_mode || "inherit") === "inherit"
              ? "Herda as opções globais configuradas no financeiro da loja (Pix, Cartão e Dinheiro)."
              : "Defina quais meios de pagamento e parcelamento são aceitos exclusivamente para este produto."}
          </p>
        </div>

        {formValues.payment_mode === "custom" && (
          <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
            <p className="text-xs font-semibold text-foreground">Métodos Permitidos Neste Produto:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background">
                <span className="text-xs font-medium">Pix Imediato</span>
                <Controller
                  control={control}
                  name="allow_pix"
                  render={({ field }) => (
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background">
                <span className="text-xs font-medium">Cartão de Crédito</span>
                <Controller
                  control={control}
                  name="allow_credit_card"
                  render={({ field }) => (
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background">
                <span className="text-xs font-medium">Dinheiro / No Local</span>
                <Controller
                  control={control}
                  name="allow_cash_on_delivery"
                  render={({ field }) => (
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-medium text-foreground">Parcelamento Máximo Sem Juros</Label>
              <Select
                value={String(formValues.max_installments || "12")}
                onValueChange={(val) => setValue("max_installments", Number(val))}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (Apenas à vista)</SelectItem>
                  <SelectItem value="3">Até 3x</SelectItem>
                  <SelectItem value="6">Até 6x</SelectItem>
                  <SelectItem value="10">Até 10x</SelectItem>
                  <SelectItem value="12">Até 12x</SelectItem>
                  <SelectItem value="18">Até 18x</SelectItem>
                  <SelectItem value="24">Até 24x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Modalidades de Atendimento & Entrega */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground">Modalidades de Atendimento & Entrega</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Entrega / Delivery</span>
                </div>
                <p className="text-xs text-muted-foreground">Envio via motoboy ou frete</p>
              </div>
              <Controller
                control={control}
                name="allow_delivery"
                render={({ field }) => (
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Retirada no Balcão</span>
                </div>
                <p className="text-xs text-muted-foreground">Cliente busca na loja física</p>
              </div>
              <Controller
                control={control}
                name="allow_takeaway"
                render={({ field }) => (
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Utensils className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Consumo no Local</span>
                </div>
                <p className="text-xs text-muted-foreground">Venda presencial em mesa</p>
              </div>
              <Controller
                control={control}
                name="allow_dine_in"
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </div>

        {/* Promoções, Cupons e Validade */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center gap-3">
              <Ticket className="size-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Aceitar Cupons de Desconto</p>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, cupons promocionais da loja podem ser aplicados neste produto.
                </p>
              </div>
            </div>
            <Controller
              control={control}
              name="allow_coupons"
              render={({ field }) => (
                <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Início da Oferta (Opcional)</Label>
              <Input
                type="date"
                {...register("offer_valid_from")}
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Validade da Oferta (Opcional)</Label>
              <Input
                type="date"
                {...register("offer_valid_until")}
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Canais de Divulgação e Onde Vender */}
      <div className="bg-card rounded-lg p-6 space-y-5 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Globe className="size-4 text-primary" />
          <span>Canais de Divulgação e Onde Vender</span>
        </div>

        {/* Onde Aparece (Canal de Visibilidade) */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">Onde Este Produto Fica Visível</Label>
          <Select
            value={formValues.visibility_channel || "marketplace_and_store"}
            onValueChange={(val) => setValue("visibility_channel", val)}
          >
            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketplace_and_store">
                Vitrine da Loja e Busca Pública (Recomendado)
              </SelectItem>
              <SelectItem value="store_only">
                Apenas na Minha Loja (Ocultar da busca geral)
              </SelectItem>
              <SelectItem value="vip_only">
                Apenas Clientes VIP / Exclusivo
              </SelectItem>
              <SelectItem value="direct_link">
                Oculto (Apenas com link direto)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Integração de Canais Externos */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">Divulgação em Canais Externos</Label>
            {isChannelsLoading && (
              <span className="text-2xs text-muted-foreground animate-pulse motion-reduce:animate-none">Verificando conexões...</span>
            )}
            {isChannelsError && (
              <span className="text-2xs text-muted-foreground">Status local ativo</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">Google Shopping</span>
                  <p className="text-xs text-muted-foreground">Aparecer nas buscas e no Google Shopping gratuito.</p>
                </div>
                <Controller
                  control={control}
                  name="channel_google_merchant"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked && channelStatus?.google_merchant?.isConnected === false) {
                          toast.warning("Atenção: A integração do Google Merchant Center não está ativa na sua loja. Conecte a conta para que o feed seja enviado.");
                        }
                      }}
                    />
                  )}
                />
              </div>
              {formValues.channel_google_merchant && channelStatus?.google_merchant?.isConnected === false && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span className="flex-1 text-2xs">
                    Integração Google inativa.{" "}
                    <Link to="/workspace/configuracoes" className="underline font-bold text-foreground hover:text-primary">
                      Conectar conta
                    </Link>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">Instagram & Facebook</span>
                  <p className="text-xs text-muted-foreground">Marcar produtos em posts e stories do Instagram.</p>
                </div>
                <Controller
                  control={control}
                  name="channel_meta_instagram"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked && channelStatus?.meta_instagram?.isConnected === false) {
                          toast.warning("Atenção: A Sacolinha do Instagram/Meta não está vinculada na sua loja.");
                        }
                      }}
                    />
                  )}
                />
              </div>
              {formValues.channel_meta_instagram && channelStatus?.meta_instagram?.isConnected === false && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span className="flex-1 text-2xs">
                    Catálogo Meta desconectado.{" "}
                    <Link to="/workspace/configuracoes" className="underline font-bold text-foreground hover:text-primary">
                      Vincular página
                    </Link>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">Mercado Livre</span>
                  <p className="text-xs text-muted-foreground">Sincronizar anúncio e estoque com o Mercado Livre.</p>
                </div>
                <Controller
                  control={control}
                  name="channel_mercadolivre"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked && channelStatus?.mercadolivre?.isConnected === false) {
                          toast.warning("Atenção: A conta do Mercado Livre não está autorizada nas configurações da loja.");
                        }
                      }}
                    />
                  )}
                />
              </div>
              {formValues.channel_mercadolivre && channelStatus?.mercadolivre?.isConnected === false && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span className="flex-1 text-2xs">
                    Mercado Livre desconectado.{" "}
                    <Link to="/workspace/configuracoes" className="underline font-bold text-foreground hover:text-primary">
                      Autorizar conta
                    </Link>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground">Aplicativos de Entrega</span>
                  <p className="text-xs text-muted-foreground">Integrar cardápio com plataformas de entrega parceiras.</p>
                </div>
                <Controller
                  control={control}
                  name="channel_ifood"
                  render={({ field }) => (
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked && channelStatus?.ifood?.isConnected === false) {
                          toast.warning("Atenção: A integração iFood / Delivery ainda não foi habilitada nas configurações.");
                        }
                      }}
                    />
                  )}
                />
              </div>
              {formValues.channel_ifood && channelStatus?.ifood?.isConnected === false && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span className="flex-1 text-2xs">
                    Conector de delivery inativo.{" "}
                    <Link to="/workspace/configuracoes" className="underline font-bold text-foreground hover:text-primary">
                      Configurar integração
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Busca no Google e Assistentes Inteligentes */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground">Busca no Google e Assistentes Inteligentes</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Título para Mecanismos de Busca (Google)</Label>
              <Input
                {...register("seo_title")}
                placeholder="Ex: Título otimizado para o Google (máx 60 caracteres)"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Descrição para Mecanismos de Busca</Label>
              <Input
                {...register("seo_description")}
                placeholder="Ex: Resumo claro que atrai cliques (máx 160 caracteres)"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <Bot className="size-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Recomendação em Assistentes de Compra Inteligentes</p>
                <p className="text-xs text-muted-foreground">
                  Permite que assistentes virtuais e buscadores indiquem este produto a clientes em busca de itens semelhantes.
                </p>
              </div>
            </div>
            <Controller
              control={control}
              name="webmcp_ai_discoverable"
              render={({ field }) => (
                <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        </div>
      </div>

      {/* Card de Variações & Modificadores (Omitido em Pacotes Turísticos conforme B.37) */}
      {isTravelPackageMode ? (
        <div className="bg-card rounded-lg p-6 border border-border space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Box className="size-4 text-primary" />
            <span>Tarifas e Opções de Saída</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Neste pacote turístico, datas de saída, aeroportos de embarque e categorias de quarto (Single, Duplo, Triplo, Criança) são gerenciados com precisão nas abas <strong>Transporte & Saídas</strong> e <strong>Tarifas & Quartos</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* Card de Variações */}
          <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Box className="size-4 text-primary" />
                <span>{nicheCtx.variationsSectionTitle}</span>
              </div>
              <Button /* focus-visible: */
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAddDimension} /* focus-visible:ring-2 */
                className="h-11 rounded-lg text-xs font-bold gap-2 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-4" />
                <span>{nicheCtx.addVariationBtnText}</span>
              </Button>
            </div>

            {variantsMatrix.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {variantsMatrix.length} variação(ões) configurada(s). Edite estoque individual, código e preços diretamente na grade:
                </p>
                <VariantMatrixGrid
                  variants={variantsMatrix}
                  onChange={onVariantsMatrixChange}
                  basePriceCents={formValues.price_cents || 0}
                  wholesaleEnabled={wholesaleEnabled}
                />
              </div>
            ) : (
              <div className="p-6 text-center rounded-lg border border-dashed border-border space-y-2">
                <p className="text-xs text-muted-foreground">
                  Este {nicheCtx.entityName.toLowerCase()} atualmente é simples (sem variações de tamanho, porção ou atributos).
                </p>
                <Button /* focus-visible: */
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenAddDimension} /* focus-visible:ring-2 */
                  className="rounded-lg text-xs font-bold h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Plus className="size-4 mr-1" /> {nicheCtx.addVariationBtnText}
                </Button>
              </div>
            )}
          </div>

          {/* Card de Adicionais & Modificadores */}
          <ProductModifiersCard
            groups={optionGroups}
            selectedGroupIds={selectedOptionGroupIds}
            onSelectedGroupsChange={onSelectedGroupIdsChange}
            onGroupsListChange={onOptionGroupsChange}
            store={store || formValues}
          />
        </>
      )}

      {/* Modal de Impressão de Etiquetas com Código de Barras */}
      <ProductBarcodeLabelModal
        open={isLabelModalOpen}
        onOpenChange={setIsLabelModalOpen}
        product={{
          title: formValues.title || "Produto",
          brand: formValues.brand,
          price_cents: formValues.price_cents || 0,
          sku: formValues.sku || "",
          stock: formValues.stock || 0,
          variants: variantsMatrix || [],
        }}
      />
    </div>
  );
}
