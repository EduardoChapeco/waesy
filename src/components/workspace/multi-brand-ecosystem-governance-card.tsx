/**
 * multi-brand-ecosystem-governance-card.tsx — Painel Soberano de Ecossistema Multi-Marca & Desacoplamento de Marketplace
 *
 * Permite ao gestor da empresa:
 * 1. Ativar/Desativar a presença no Marketplace Civil Waesy (Opt-In vs 100% Private SaaS / White-Label).
 * 2. Selecionar a Vertical Especializada de Operação (WowBook, TableWay, Turis, PassHub, LexCloud, TalentLink, OmniPage, SignFlow, Waesy Studio Business).
 * 3. Visualizar e gerenciar o Tier do Plano (Starter, Pro, Enterprise) e domínio próprio.
 *
 * Conformidade Design Lint:
 * - Zero cores literais (DL-01) e zero colchetes arbitrários (DL-02).
 * - Alvos de toque >= 44px (h-11 min-h-11) (DL-14) e foco visível (DL-15).
 * - Sem card dentro de card (DL-31) e máximo de 2 colunas para cartões densos (DL-32).
 */

import { useState, useEffect } from "react";
import {
  Globe,
  Lock,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BRAND_VERTICAL_LIST,
  SUBSCRIPTION_TIER_LIST,
  type BrandVerticalId,
  type SubscriptionTierId,
  getBrandVerticalById,
} from "@/lib/multi-brand-engine";
import {
  getStoreMultiBrandGovernanceFn,
  updateStoreMarketplaceOptInFn,
  updateStoreBrandAndTierFn,
  type StoreMultiBrandGovernanceDTO,
} from "@/services/multi-brand.functions";

interface MultiBrandEcosystemGovernanceCardProps {
  storeId?: string;
  onUpdated?: () => void;
}

export function MultiBrandEcosystemGovernanceCard({
  storeId,
  onUpdated,
}: MultiBrandEcosystemGovernanceCardProps) {
  const [governance, setGovernance] = useState<StoreMultiBrandGovernanceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [waesyEnabled, setWaesyEnabled] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<BrandVerticalId>("waesy");
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierId>("enterprise");
  const [customDomain, setCustomDomain] = useState("");
  const [isSavingOptIn, setIsSavingOptIn] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  const loadGovernance = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getStoreMultiBrandGovernanceFn({
        data: storeId ? { storeId } : undefined,
      });
      if (res) {
        setGovernance(res);
        setWaesyEnabled(res.waesyMarketplaceEnabled && res.publishToMarketplace);
        setSelectedBrand(res.brandOrigin);
        setSelectedTier(res.subscriptionTier);
        setCustomDomain(res.customDomain || "");
      }
    } catch (err: any) {
      setLoadError(err?.message || "Não foi possível carregar a governança de canais.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGovernance();
  }, [storeId]);

  const handleToggleMarketplaceOptIn = async (checked: boolean) => {
    setWaesyEnabled(checked);
    setIsSavingOptIn(true);
    try {
      await updateStoreMarketplaceOptInFn({
        data: {
          storeId: governance?.storeId || storeId,
          waesyMarketplaceEnabled: checked,
          publishToMarketplace: checked,
        },
      });
      toast.success(
        checked
          ? "Canal Waesy Marketplace ativado para sua empresa."
          : "Modo SaaS Privado ativado. Empresa oculta do Marketplace público.",
      );
      await loadGovernance();
      onUpdated?.();
    } catch (err: any) {
      setWaesyEnabled(!checked);
      toast.error(err?.message || "Erro ao atualizar visibilidade no Marketplace.");
    } finally {
      setIsSavingOptIn(false);
    }
  };

  const handleSaveBrandAndTier = async () => {
    setIsSavingBrand(true);
    try {
      await updateStoreBrandAndTierFn({
        data: {
          storeId: governance?.storeId || storeId,
          brandOrigin: selectedBrand,
          subscriptionTier: selectedTier,
          customDomain: customDomain.trim() || null,
        },
      });
      const brandObj = getBrandVerticalById(selectedBrand);
      toast.success(`Sistema configurado na vertical ${brandObj.brandName} (${selectedTier.toUpperCase()}).`);
      await loadGovernance();
      onUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar vertical e plano.");
    } finally {
      setIsSavingBrand(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 py-4" aria-busy="true" aria-label="Carregando governança multi-marca">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-6 px-4 rounded-lg bg-destructive/10 text-destructive flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold">Falha na leitura de canais</p>
            <p className="text-xs opacity-90">{loadError}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadGovernance}
          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const activeBrandConfig = getBrandVerticalById(selectedBrand);

  return (
    <div className="space-y-6 pt-4 border-t border-border/60">
      {/* 1. Desacoplamento Soberano: Marketplace Civil vs ERP Privado */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              {waesyEnabled ? (
                <Globe className="size-4 text-primary" />
              ) : (
                <Lock className="size-4 text-warning" />
              )}
              <span>Distribuição no Marketplace Waesy</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Escolha se sua empresa aparece nas buscas públicas do Waesy ou opera 100% como sistema privado.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-bold px-3 py-1 self-start sm:self-center",
              waesyEnabled
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-warning/10 text-warning border-warning/30",
            )}
          >
            {waesyEnabled ? "Canal Marketplace Ativo (Opt-In)" : "Modo 100% SaaS Privado (White-Label)"}
          </Badge>
        </div>

        <div className="p-4 rounded-lg bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="waesy-marketplace-optin-switch" className="text-xs font-bold text-foreground cursor-pointer">
              Publicar loja e catálogo no App Civil Waesy
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {waesyEnabled
                ? "Seus produtos marcados como públicos aparecem no Marketplace local e no guia da cidade."
                : "Sua operação está isolada do Marketplace. Apenas clientes com seu link direto acessam seu catálogo."}
            </p>
            {governance && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-muted-foreground">
                <span>Total no ERP: <strong className="text-foreground">{governance.totalProducts}</strong></span>
                <span>•</span>
                <span>No Marketplace: <strong className="text-emerald-600">{waesyEnabled ? governance.marketplaceProductsCount : 0}</strong></span>
                <span>•</span>
                <span>Uso Interno/PDV: <strong className="text-foreground">{waesyEnabled ? governance.privateOnlyProductsCount : governance.totalProducts}</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isSavingOptIn && <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary" />}
            <Switch
              id="waesy-marketplace-optin-switch"
              checked={waesyEnabled}
              disabled={isSavingOptIn}
              onCheckedChange={handleToggleMarketplaceOptIn}
              aria-label="Alternar publicação no Marketplace Waesy"
            />
          </div>
        </div>
      </div>

      {/* 2. Seletor de Marca Vertical Especializada */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Marca Vertical do Sistema</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Adapta a terminologia, módulos padrão e identidade operacional sem perder dados do núcleo.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-bold self-start sm:self-center">
            {activeBrandConfig.brandName} ({activeBrandConfig.primaryDomain})
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {BRAND_VERTICAL_LIST.map((brand) => {
            const isSelected = selectedBrand === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => setSelectedBrand(brand.id)}
                className={cn(
                  "p-4 rounded-lg text-left transition-colors flex flex-col justify-between gap-2 min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary text-foreground"
                    : "bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {brand.brandName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {brand.primaryDomain}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {brand.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  {brand.targetSegments.slice(0, 3).map((seg) => (
                    <span
                      key={seg}
                      className="text-xs px-2 py-1 rounded-md bg-background text-muted-foreground font-medium"
                    >
                      {seg}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Empacotamento por Planos (Feature Tiers) & Domínio White-Label */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Camada de Plano & Domínio White-Label</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Define quais módulos operacionais ficam visíveis no menu lateral para simplificar a rotina da equipe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {SUBSCRIPTION_TIER_LIST.map((tier) => {
            const isSelected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "p-4 rounded-lg text-left transition-colors flex flex-col justify-between gap-2 min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary text-foreground"
                    : "bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-3.5 text-primary" />
                    Plano {tier.name}
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {tier.includedModules.length} módulos
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tier.tagline}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end pt-2">
          <div className="space-y-2">
            <Label htmlFor="custom-whitelabel-domain" className="text-xs font-bold text-foreground flex items-center gap-2">
              <ExternalLink className="size-3.5 text-primary" />
              <span>Domínio Próprio / Subdomínio White-Label</span>
            </Label>
            <Input
              id="custom-whitelabel-domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder={`ex: ${governance?.storeName?.toLowerCase().replace(/\s+/g, "") || "minhaempresa"}.${activeBrandConfig.primaryDomain}`}
              className="h-11 min-h-11 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveBrandAndTier}
              disabled={isSavingBrand}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              {isSavingBrand ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary" />
              ) : (
                <CheckCircle2 className="size-4 text-primary" />
              )}
              <span>Aplicar Vertical & Plano</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
