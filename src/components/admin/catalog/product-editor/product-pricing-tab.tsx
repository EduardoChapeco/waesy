import * as React from "react";
import { Controller } from "react-hook-form";
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
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";

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
}: ProductPricingTabProps) {
  return (
    <div className="space-y-4">
      {/* Precificação e Margens */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <DollarSign className="size-4 text-primary" />
          <span>Precificação e Margens</span>
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
            <Label className="text-xs font-medium text-foreground">Estoque Inicial</Label>
            <Input
              type="number"
              {...register("stock", { valueAsNumber: true })}
              placeholder="10"
              className="h-11 rounded-lg text-xs bg-background font-mono"
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
        <div className="space-y-3">
          <Label className="text-xs font-medium text-foreground">Formas de Pagamento Aceitas</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue("payment_mode", "inherit")}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                (formValues.payment_mode || "inherit") === "inherit"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Store className="size-4 text-primary" />
                <span>Usar Padrão da Loja</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Herda as configurações de Pix, cartão e boleto globais configuradas no Workspace.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setValue("payment_mode", "custom")}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                formValues.payment_mode === "custom"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:bg-muted/40 text-muted-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <CreditCard className="size-4 text-primary" />
                <span>Personalizar para Este Item</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Restringir ou liberar métodos específicos apenas para este anúncio/oferta.
              </p>
            </button>
          </div>
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

        {/* Modalidades de Logística / Consumo */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground">Modalidades de Atendimento & Entrega</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                <span className="text-xs font-medium">Entrega / Delivery</span>
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
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <span className="text-xs font-medium">Retirada no Balcão</span>
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
              <div className="flex items-center gap-2">
                <Utensils className="size-4 text-primary" />
                <span className="text-xs font-medium">Consumo no Local</span>
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
                <p className="text-xs font-medium text-foreground">Permitir Cupons de Desconto</p>
                <p className="text-xs text-muted-foreground">
                  Desmarque para proteger itens com margem reduzida de cupons promocionais da loja.
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

      {/* Canais de Venda, Visibilidade & SEO / WebMCP */}
      <div className="bg-card rounded-lg p-6 space-y-5 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Share2 className="size-4 text-primary" />
          <span>Canais de Venda, Visibilidade & Descoberta IA</span>
        </div>

        {/* Onde Aparece (Canal de Visibilidade) */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">Onde Este Anúncio Aparece</Label>
          <Select
            value={formValues.visibility_channel || "marketplace_and_store"}
            onValueChange={(val) => setValue("visibility_channel", val)}
          >
            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="marketplace_and_store">
                Marketplace Público & Vitrine da Loja (Visibilidade Máxima)
              </SelectItem>
              <SelectItem value="store_only">
                Apenas Vitrine Própria da Loja (Não listar no Marketplace geral)
              </SelectItem>
              <SelectItem value="vip_only">
                Apenas Clientes Recorrentes / VIP (Pós-venda e retenção)
              </SelectItem>
              <SelectItem value="direct_link">
                Privado / Apenas Link Direto (Orçamentos sob demanda)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Integração de Canais Externos */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground">Sincronização em Canais de Venda</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground">Google Merchant Center</span>
                <p className="text-xs text-muted-foreground">Exporta para o Google Shopping e Free Listings.</p>
              </div>
              <Controller
                control={control}
                name="channel_google_merchant"
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground">Sacolinha Instagram / Meta</span>
                <p className="text-xs text-muted-foreground">Catálogo para marcação em posts e stories.</p>
              </div>
              <Controller
                control={control}
                name="channel_meta_instagram"
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground">Mercado Livre</span>
                <p className="text-xs text-muted-foreground">Sincronização de anúncios e estoque.</p>
              </div>
              <Controller
                control={control}
                name="channel_mercadolivre"
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground">iFood / Aiqfome</span>
                <p className="text-xs text-muted-foreground">Cardápio digital integrado para gastronomia.</p>
              </div>
              <Controller
                control={control}
                name="channel_ifood"
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </div>

        {/* SEO & Descoberta por IA (WebMCP) */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground">SEO & Descoberta por IA (WebMCP)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Título SEO Personalizado</Label>
              <Input
                {...register("seo_title")}
                placeholder="Ex: Título otimizado para o Google (máx 60 caracteres)"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Meta Descrição</Label>
              <Input
                {...register("seo_description")}
                placeholder="Ex: Resumo persuasivo para resultados de busca (máx 160 caracteres)"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <Bot className="size-4 text-primary" />
              <div>
                <p className="text-xs font-medium text-foreground">Indexar no Protocolo WebMCP (Agentes de IA)</p>
                <p className="text-xs text-muted-foreground">
                  Permite que assistentes e compradores autônomos descubram, comparem e recomendem este item.
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
          />
        </>
      )}
    </div>
  );
}
