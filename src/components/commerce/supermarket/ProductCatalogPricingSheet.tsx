import React, { useState } from "react";
import {
  Tag,
  Sparkle,
  Storefront,
  Globe,
  CurrencyCircleDollar,
  Users,
  Check,
  X,
  Plus,
  Percent,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  SupermarketPricingTiers,
  SupermarketPromotionalRule,
  SupermarketFreshFoodSpecs,
} from "@/services/supermarket.functions";

interface ProductCatalogPricingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  currentPriceCents: number;
  initialPricingTiers?: SupermarketPricingTiers;
  initialPromotionalRule?: SupermarketPromotionalRule;
  initialFreshFoodSpecs?: SupermarketFreshFoodSpecs;
  initialSku?: string;
  initialNcm?: string;
  onSavePricing: (payload: {
    productId: string;
    pricingTiers: SupermarketPricingTiers;
    promotionalRule: SupermarketPromotionalRule;
    freshFoodSpecs: SupermarketFreshFoodSpecs;
    sku: string;
    ncm: string;
  }) => Promise<void>;
}

export function ProductCatalogPricingSheet({
  isOpen,
  onClose,
  productId,
  productTitle,
  currentPriceCents,
  initialPricingTiers = {},
  initialPromotionalRule = {},
  initialFreshFoodSpecs = {},
  initialSku = "",
  initialNcm = "",
  onSavePricing,
}: ProductCatalogPricingSheetProps) {
  // 3 Colunas de Preços (Online, Clube, Balcão/Físico)
  const [isOnlineActive, setIsOnlineActive] = useState(Boolean(initialPricingTiers.online_cents));
  const [onlinePrice, setOnlinePrice] = useState(
    initialPricingTiers.online_cents ? (initialPricingTiers.online_cents / 100).toFixed(2) : "",
  );

  const [isClubActive, setIsClubActive] = useState(Boolean(initialPricingTiers.club_cents));
  const [clubPrice, setClubPrice] = useState(
    initialPricingTiers.club_cents ? (initialPricingTiers.club_cents / 100).toFixed(2) : "",
  );

  const [isCounterActive, setIsCounterActive] = useState(Boolean(initialPricingTiers.counter_cents));
  const [counterPrice, setCounterPrice] = useState(
    initialPricingTiers.counter_cents
      ? (initialPricingTiers.counter_cents / 100).toFixed(2)
      : (currentPriceCents / 100).toFixed(2),
  );

  // Regras de Promoção (Leve X Pague Y, Limite CPF, Cashback)
  const [ruleType, setRuleType] = useState<"buy_x_pay_y" | "progressive" | "none">(
    initialPromotionalRule.rule_type === "buy_x_pay_y" || initialPromotionalRule.rule_type === "progressive"
      ? initialPromotionalRule.rule_type
      : "none",
  );
  const [buyQty, setBuyQty] = useState(String(initialPromotionalRule.buy_qty || 3));
  const [payQty, setPayQty] = useState(String(initialPromotionalRule.pay_qty || 2));
  const [maxPerCpf, setMaxPerCpf] = useState(String(initialPromotionalRule.max_per_cpf || 10));
  const [cashbackCents, setCashbackCents] = useState(
    initialPromotionalRule.cashback_cents
      ? (initialPromotionalRule.cashback_cents / 100).toFixed(2)
      : "",
  );
  const [badgeRibbon, setBadgeRibbon] = useState(initialPromotionalRule.badge_ribbon || "clube");

  // Alimentos Fracionados & Açougue
  const [unitType, setUnitType] = useState<"un" | "kg" | "g">(
    initialFreshFoodSpecs.pricing_unit === "kg" || initialFreshFoodSpecs.pricing_unit === "g"
      ? initialFreshFoodSpecs.pricing_unit
      : "un",
  );
  const [allowMaturity, setAllowMaturity] = useState(
    Boolean(initialFreshFoodSpecs.allow_maturity_selection),
  );
  const [temperatureTag, setTemperatureTag] = useState<"gelado" | "fresco" | "congelado" | "none">(
    (initialFreshFoodSpecs.temperature_tag as any) || "none",
  );

  // Dados Fiscais & Estoque
  const [sku, setSku] = useState(initialSku);
  const [ncm, setNcm] = useState(initialNcm);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tiers: SupermarketPricingTiers = {
        online_cents: isOnlineActive && onlinePrice ? Math.round(parseFloat(onlinePrice) * 100) : undefined,
        club_cents: isClubActive && clubPrice ? Math.round(parseFloat(clubPrice) * 100) : undefined,
        counter_cents: isCounterActive && counterPrice ? Math.round(parseFloat(counterPrice) * 100) : undefined,
      };

      const promo: SupermarketPromotionalRule = {
        rule_type: ruleType,
        buy_qty: ruleType === "buy_x_pay_y" ? parseInt(buyQty, 10) : undefined,
        pay_qty: ruleType === "buy_x_pay_y" ? parseInt(payQty, 10) : undefined,
        max_per_cpf: maxPerCpf ? parseInt(maxPerCpf, 10) : undefined,
        cashback_cents: cashbackCents ? Math.round(parseFloat(cashbackCents) * 100) : undefined,
        badge_ribbon: badgeRibbon as any,
        is_active: ruleType !== "none" || Boolean(cashbackCents),
      };

      const fresh: SupermarketFreshFoodSpecs = {
        pricing_unit: unitType,
        allow_maturity_selection: allowMaturity,
        temperature_tag: temperatureTag !== "none" ? temperatureTag : undefined,
      };

      await onSavePricing({
        productId,
        pricingTiers: tiers,
        promotionalRule: promo,
        freshFoodSpecs: fresh,
        sku: sku.trim(),
        ncm: ncm.trim(),
      });

      toast.success("Tabelas de preços e regras de supermercado salvas com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar tabelas de preços.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col bg-background gap-0 max-h-screen"
      >
        <SheetHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between gap-3 shrink-0">
          <div>
            <SheetTitle className="text-base font-bold text-foreground">
              Múltiplos Preços & Regras de Supermercado
            </SheetTitle>
            <p className="text-xs text-muted-foreground truncate max-w-sm">
              {productTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-11 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} weight="bold" />
          </button>
        </SheetHeader>

        {/* ── Formulário Roolável em Seções ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ── 1. Múltiplas Tabelas de Preço em Colunas (Online, Clube, Balcão) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CurrencyCircleDollar size={20} weight="duotone" className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Tabelas de Preço por Canal & Fidelidade
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Coluna 1: Preço Online (App/Web) */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Globe size={16} weight="bold" className="text-blue-500" />
                    Online (App)
                  </span>
                  <input
                    type="checkbox"
                    checked={isOnlineActive}
                    onChange={(e) => setIsOnlineActive(e.target.checked)}
                    className="size-5 rounded border-border text-primary focus:ring-primary"
                    aria-label="Ativar tabela Online"
                  />
                </div>
                {isOnlineActive ? (
                  <div className="space-y-1">
                    <label className="text-3xs text-muted-foreground font-semibold">Valor em R$</label>
                    <input
                      type="number"
                      step="0.01"
                      value={onlinePrice}
                      onChange={(e) => setOnlinePrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-11 min-h-11 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-bold"
                    />
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground italic pt-2">Segue preço base</p>
                )}
              </div>

              {/* Coluna 2: Preço Clube (Fidelidade/CPF) */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkle size={16} weight="fill" className="text-amber-500" />
                    Preço Clube
                  </span>
                  <input
                    type="checkbox"
                    checked={isClubActive}
                    onChange={(e) => setIsClubActive(e.target.checked)}
                    className="size-5 rounded border-border text-primary focus:ring-primary"
                    aria-label="Ativar tabela Clube"
                  />
                </div>
                {isClubActive ? (
                  <div className="space-y-1">
                    <label className="text-3xs text-muted-foreground font-semibold">Valor em R$</label>
                    <input
                      type="number"
                      step="0.01"
                      value={clubPrice}
                      onChange={(e) => setClubPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-11 min-h-11 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-bold"
                    />
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground italic pt-2">Desativado</p>
                )}
              </div>

              {/* Coluna 3: Preço Balcão / Loja Física */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Storefront size={16} weight="bold" className="text-emerald-600" />
                    Loja Física
                  </span>
                  <input
                    type="checkbox"
                    checked={isCounterActive}
                    onChange={(e) => setIsCounterActive(e.target.checked)}
                    className="size-5 rounded border-border text-primary focus:ring-primary"
                    aria-label="Ativar tabela Loja Física"
                  />
                </div>
                {isCounterActive ? (
                  <div className="space-y-1">
                    <label className="text-3xs text-muted-foreground font-semibold">Valor em R$</label>
                    <input
                      type="number"
                      step="0.01"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-11 min-h-11 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-bold"
                    />
                  </div>
                ) : (
                  <p className="text-2xs text-muted-foreground italic pt-2">Mesmo do App</p>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Regras Promocionais (Leve X Pague Y, Limites e Cashback) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag size={20} weight="duotone" className="text-destructive" />
              <h3 className="text-sm font-bold text-foreground">
                Regras Promocionais & Leve X Pague Y
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3 text-xs">
              {/* Tipo de Regra */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Mecânica da Promoção</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "none", label: "Nenhuma" },
                    { id: "buy_x_pay_y", label: "Leve X Pague Y" },
                    { id: "progressive", label: "Desconto %" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRuleType(m.id as any)}
                      className={cn(
                        "h-11 min-h-11 rounded-xl border text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary",
                        ruleType === m.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-border text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parâmetros de Leve X Pague Y */}
              {ruleType === "buy_x_pay_y" ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-2xs text-muted-foreground font-medium">Quantidade que leva (X)</label>
                    <input
                      type="number"
                      value={buyQty}
                      onChange={(e) => setBuyQty(e.target.value)}
                      className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs text-muted-foreground font-medium">Quantidade que paga (Y)</label>
                    <input
                      type="number"
                      value={payQty}
                      onChange={(e) => setPayQty(e.target.value)}
                      className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-bold"
                    />
                  </div>
                </div>
              ) : null}

              {/* Limite por CPF e Cashback */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
                    <Users size={14} weight="bold" /> Limite por CPF
                  </label>
                  <input
                    type="number"
                    value={maxPerCpf}
                    onChange={(e) => setMaxPerCpf(e.target.value)}
                    placeholder="Sem limite"
                    className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
                    <CurrencyCircleDollar size={14} weight="bold" /> Cashback por un. (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackCents}
                    onChange={(e) => setCashbackCents(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Hortifrúti, Carnes & Alimentos Fracionados ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Especificações de Alimentos & Hortifrúti
            </h3>

            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Unidade de Medida</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "un", label: "Unidade (un)" },
                    { id: "kg", label: "Quilo (Kg)" },
                    { id: "g", label: "Gramas (g)" },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUnitType(u.id as any)}
                      className={cn(
                        "h-11 min-h-11 rounded-xl border text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-primary",
                        unitType === u.id
                          ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border/60 hover:border-border text-foreground",
                      )}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="font-semibold text-foreground">
                  Permitir cliente escolher maturidade (Verde / Maduro)?
                </span>
                <input
                  type="checkbox"
                  checked={allowMaturity}
                  onChange={(e) => setAllowMaturity(e.target.checked)}
                  className="size-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* ── 4. Dados Fiscais & SKU ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Dados Contábeis & Fiscais (Espelho de Caixa)
            </h3>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-card border border-border/60 text-xs">
              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground font-semibold">Código SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-12345"
                  className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground font-semibold">NCM / CEST</label>
                <input
                  type="text"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  placeholder="2203.00.00"
                  className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-foreground font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer de Ação ── */}
        <div className="p-4 border-t border-border/40 flex items-center justify-end gap-3 shrink-0 bg-background/95 backdrop-blur-md">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 min-h-11 px-4 rounded-xl font-bold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="h-11 min-h-11 px-6 rounded-xl font-bold gap-2"
          >
            <Check size={16} weight="bold" />
            <span>{isSaving ? "Salvando..." : "Salvar Configurações"}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
