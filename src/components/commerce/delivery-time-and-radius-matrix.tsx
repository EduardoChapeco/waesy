import React, { useState } from "react";
import { Clock, Plus, Minus, Trash2, MapPin, Layers, Bike, Store, ChevronRight, ShieldCheck, Zap, Truck, Building2, AlertCircle, UtensilsCrossed, Package, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CurrencyField } from "@/components/ui/currency-field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface DeliveryRadiusTier {
  id: string;
  radiusKm: number;
  transitTimeMin: number;
  feeCents: number;
}

export interface DeliveryLogisticsConfig {
  manualPrepTimeEnabled: boolean;
  basePrepTimeMin: number;
  activePresetLabel?: string;
  radiusTiers: DeliveryRadiusTier[];
  minOrderCents: number;
  freeDeliveryThresholdCents?: number | null;
  motolinkEnabled?: boolean;
  ownDeliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  carrierEnabled?: boolean;
  condoClimbFeeCents?: number | null;
  dispatchDays?: number;
  dispatchPresetLabel?: string;
}

const DEFAULT_TIERS: DeliveryRadiusTier[] = [
  { id: "tier-1", radiusKm: 0.5, transitTimeMin: 10, feeCents: 499 },
  { id: "tier-2", radiusKm: 1.0, transitTimeMin: 12, feeCents: 499 },
  { id: "tier-3", radiusKm: 1.5, transitTimeMin: 14, feeCents: 599 },
  { id: "tier-4", radiusKm: 2.0, transitTimeMin: 15, feeCents: 699 },
  { id: "tier-5", radiusKm: 3.0, transitTimeMin: 18, feeCents: 799 },
  { id: "tier-6", radiusKm: 4.5, transitTimeMin: 22, feeCents: 1099 },
  { id: "tier-7", radiusKm: 6.0, transitTimeMin: 28, feeCents: 1399 },
];

const GASTRO_PRESETS = [
  { label: "Padrão (15 min)", time: 15 },
  { label: "Rápido / Lanches (10 min)", time: 10 },
  { label: "Pratos Elaborados (25 min)", time: 25 },
  { label: "Pico de Horário (35 min)", time: 35 },
  { label: "Alta Demanda / Chuva (45 min)", time: 45 },
];

const RETAIL_DISPATCH_PRESETS = [
  { label: "Envio Imediato (Mesmo dia útil)", days: 0, text: "Pedidos aprovados até às 14h são despachados no mesmo dia." },
  { label: "1 dia útil (Postagem em até 24h)", days: 1, text: "Separação e postagem nos Correios ou transportadora em até 1 dia útil." },
  { label: "2 a 3 dias úteis", days: 2, text: "Tempo hábil para separação no estoque e emissão de nota fiscal." },
  { label: "Sob Encomenda (Produção artesanal)", days: 5, text: "Produto artesanal ou personalizado com prazo de confecção." },
];

interface DeliveryTimeAndRadiusMatrixProps {
  value: DeliveryLogisticsConfig;
  onChange: (value: DeliveryLogisticsConfig) => void;
  storeName?: string;
  storeCategory?: string;
  storeLogoUrl?: string;
  storeBannerUrl?: string;
  isGastronomy?: boolean;
  neighborhoodsSlot?: React.ReactNode;
}

export function DeliveryTimeAndRadiusMatrix({
  value,
  onChange,
  storeName = "Minha Cozinha & Loja",
  storeCategory = "Gastronomia & Delivery",
  storeLogoUrl,
  storeBannerUrl,
  isGastronomy,
  neighborhoodsSlot,
}: DeliveryTimeAndRadiusMatrixProps) {
  const isGastro = isGastronomy ?? (
    storeCategory?.toLowerCase().includes("gastro") ||
    storeCategory?.toLowerCase().includes("restaur") ||
    storeCategory?.toLowerCase().includes("food") ||
    storeCategory?.toLowerCase().includes("lanche") ||
    storeCategory?.toLowerCase().includes("pizz") ||
    storeCategory?.toLowerCase().includes("bar") ||
    storeCategory?.toLowerCase().includes("cozinha")
  );

  const [activeTab, setActiveTab] = useState<"operacao" | "preparo" | "modalidades">("operacao");
  const [newRadius, setNewRadius] = useState("");
  const [newTransitTime, setNewTransitTime] = useState("");
  const [newFee, setNewFee] = useState("");

  const currentPrepTime = value.basePrepTimeMin || 15;
  const dispatchDays = value.dispatchDays ?? 1;
  const tiers = value.radiusTiers && value.radiusTiers.length > 0 ? value.radiusTiers : DEFAULT_TIERS;

  const handlePrepTimeChange = (delta: number) => {
    const nextTime = Math.max(5, Math.min(120, currentPrepTime + delta));
    onChange({
      ...value,
      basePrepTimeMin: nextTime,
      activePresetLabel: undefined,
    });
  };

  const handleApplyPreset = (preset: { label: string; time: number }) => {
    onChange({
      ...value,
      basePrepTimeMin: preset.time,
      activePresetLabel: preset.label,
    });
  };

  const handleDispatchDaysChange = (delta: number) => {
    const nextDays = Math.max(0, Math.min(30, dispatchDays + delta));
    const preset = RETAIL_DISPATCH_PRESETS.find((p) => p.days === nextDays);
    onChange({
      ...value,
      dispatchDays: nextDays,
      dispatchPresetLabel: preset ? preset.label : `${nextDays} dias úteis`,
    });
  };

  const handleApplyDispatchPreset = (preset: { label: string; days: number }) => {
    onChange({
      ...value,
      dispatchDays: preset.days,
      dispatchPresetLabel: preset.label,
    });
  };

  const handleToggleManual = (enabled: boolean) => {
    onChange({
      ...value,
      manualPrepTimeEnabled: enabled,
    });
  };

  const handleAddTier = () => {
    const rKm = parseFloat(newRadius);
    const tMin = parseInt(newTransitTime, 10);
    const fReais = parseFloat(newFee.replace(",", "."));

    if (isNaN(rKm) || rKm <= 0) return;
    if (isNaN(tMin) || tMin <= 0) return;
    const fCents = isNaN(fReais) ? 0 : Math.round(fReais * 100);

    const newTier: DeliveryRadiusTier = {
      id: `tier-${Date.now()}`,
      radiusKm: rKm,
      transitTimeMin: tMin,
      feeCents: fCents,
    };

    const nextTiers = [...tiers, newTier].sort((a, b) => a.radiusKm - b.radiusKm);
    onChange({
      ...value,
      radiusTiers: nextTiers,
    });

    setNewRadius("");
    setNewTransitTime("");
    setNewFee("");
  };

  const handleRemoveTier = (id: string) => {
    const nextTiers = tiers.filter((t) => t.id !== id);
    onChange({
      ...value,
      radiusTiers: nextTiers,
    });
  };

  // Faixa de tempo mínima e máxima da loja
  const minTotalTime = tiers.length > 0 ? currentPrepTime + tiers[0].transitTimeMin : currentPrepTime + 10;
  const maxTotalTime = tiers.length > 0 ? currentPrepTime + tiers[tiers.length - 1].transitTimeMin : currentPrepTime + 30;

  return (
    <div className="space-y-6">
      {/* ── Sub-Aba Superior Estilo iFood Merchant ── */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-3 gap-2">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("operacao")}
            className={cn(
              "text-xs font-bold transition-colors duration-200 relative pb-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm min-h-11 flex items-center",
              activeTab === "operacao"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isGastro ? "Operação atual e Raio" : "Regiões e Raio de Entrega"}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preparo")}
            className={cn(
              "text-xs font-bold transition-colors duration-200 relative pb-3 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm min-h-11",
              activeTab === "preparo"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isGastro ? (
              <>
                <span>Tempo de Cozinha</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-none px-2 py-0">
                  {currentPrepTime} min
                </Badge>
              </>
            ) : (
              <>
                <span>Prazo de Expedição</span>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-none px-2 py-0">
                  {dispatchDays === 0 ? "Mesmo dia" : `${dispatchDays}d`}
                </Badge>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("modalidades")}
            className={cn(
              "text-xs font-bold transition-colors duration-200 relative pb-3 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm min-h-11",
              activeTab === "modalidades"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{isGastro ? "Modalidades e Taxas" : "Modalidades de Frete & Envio"}</span>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-none px-2 py-0">
              4 canais
            </Badge>
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-medium hidden sm:block">
          Canal de venda: <strong className="text-foreground">App e Web Waesy</strong>
        </div>
      </div>

 {/* ── CONTEÚDO: ABA OPERAÇÃO ATUAL ── */}
 {activeTab === "operacao" && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Lado Esquerdo: Truthful Preview da Loja & Mapa Conceitual */}
 <div className="lg:col-span-6 space-y-4">
 <div className="space-y-2">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <MapPin className="size-4 text-primary" />
 <span>Raio de Atendimento e Visualização</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Como os clientes visualizam seu tempo de entrega e taxa no aplicativo da sua cidade.
 </p>
 </div>

 {/* Truthful Preview Card — Estilo iFood */}
 <div className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-colors duration-200">
 {/* Banner */}
 <div className="relative h-28 sm:h-32 w-full bg-muted overflow-hidden">
 {storeBannerUrl ? (
 <img src={storeBannerUrl} alt={storeName} className="size-full object-cover" />
 ) : (
 <div className="size-full bg-muted flex items-center justify-center text-muted-foreground/40">
 <Store className="size-8" />
 </div>
 )}
 {/* Logo Sobreposto */}
 <div className="absolute -bottom-4 left-4 size-16 rounded-lg bg-card border-2 border-background overflow-hidden  flex items-center justify-center">
 {storeLogoUrl ? (
 <img src={storeLogoUrl} alt={storeName} className="size-full object-cover" />
 ) : (
 <span className="font-black text-lg text-primary">{storeName.slice(0, 2).toUpperCase()}</span>
 )}
 </div>
 </div>

 {/* Informações da Loja */}
 <div className="pt-6 px-4 pb-4 space-y-2">
 <div className="flex items-start justify-between gap-2">
 <div>
 <h4 className="font-bold text-sm text-foreground">{storeName}</h4>
 <p className="text-xs text-muted-foreground">{storeCategory}</p>
 </div>
 <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-none font-bold">
 Aberta Agora
 </Badge>
 </div>

 {/* Métricas de Tempo e Entrega */}
 <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-border/50">
 {isGastro ? (
 <>
 <div className="flex items-center gap-1 text-foreground font-semibold">
 <Clock className="size-3.5 text-primary" />
 <span>{minTotalTime}-{maxTotalTime} min</span>
 </div>
 <span className="text-muted-foreground">•</span>
 <div className="flex items-center gap-1 text-foreground font-semibold">
 <Bike className="size-3.5 text-muted-foreground" />
 <span>A partir de {formatMoney(tiers[0]?.feeCents || 0)}</span>
 </div>
 <span className="text-muted-foreground">•</span>
 <div className="text-muted-foreground text-xs">
 Preparo: <strong>{currentPrepTime} min</strong>
 </div>
 </>
 ) : (
 <>
 <div className="flex items-center gap-1 text-foreground font-semibold">
 <Package className="size-3.5 text-primary" />
 <span>Expedição: {dispatchDays === 0 ? "Mesmo dia útil" : `${dispatchDays} dia(s) úteis`}</span>
 </div>
 <span className="text-muted-foreground">•</span>
 <div className="flex items-center gap-1 text-foreground font-semibold">
 <Truck className="size-3.5 text-muted-foreground" />
 <span>Frete local a partir de {formatMoney(tiers[0]?.feeCents || 0)}</span>
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* Aviso da Equação de Entrega */}
 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
 <div className="flex items-center gap-2 font-bold text-foreground">
 <Zap className="size-3.5 text-primary" />
 <span>{isGastro ? "Cálculo Inteligente de Entrega" : "Prazo Total de Frete"}</span>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {isGastro
 ? `O tempo total exibido para o cliente é a soma automática do Tempo de Preparo da sua Cozinha (${currentPrepTime} min) + Tempo de Deslocamento do Motoboy por Raio.`
 : `O prazo final para o comprador soma o Prazo de Expedição do Estoque (${dispatchDays === 0 ? "mesmo dia útil" : `${dispatchDays} dia(s) úteis`}) ao tempo estimado de transporte.`}
 </p>
 </div>
 </div>

 {/* Lado Direito: Tabela de Faixas de Raio (Km, Tempo, Taxa) */}
 <div className="lg:col-span-6 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-foreground">Tempo e Taxa por Raio</h3>
 <p className="text-xs text-muted-foreground">Configuração por distância em quilômetros</p>
 </div>
 </div>

 {/* Tabela de Tiers */}
 <div className="rounded-lg border border-border/60 overflow-hidden bg-card divide-y divide-border/50">
 <div className="grid grid-cols-1 md:grid-cols-12 bg-muted/50 p-3 text-xs font-bold text-muted-foreground">
 <span className="col-span-3">Raio (km)</span>
 <span className="col-span-4">Tempo Total (Preparo+Viagem)</span>
 <span className="col-span-3 text-right">Taxa (R$)</span>
 <span className="col-span-2 text-center">Ações</span>
 </div>

 <div className="divide-y divide-border/40 max-h-72 overflow-y-auto scrollbar-none">
 {tiers.map((tier) => {
 const totalTimeForTier = currentPrepTime + tier.transitTimeMin;
 return (
 <div key={tier.id} className="grid grid-cols-1 md:grid-cols-12 p-3 text-xs items-center hover:bg-muted/20 transition-colors">
 <span className="col-span-3 font-semibold text-foreground">
 Até {tier.radiusKm} km
 </span>
 <span className="col-span-4 text-muted-foreground flex items-center gap-2">
 <Clock className="size-3 text-primary" />
 <strong className="text-foreground">{totalTimeForTier} min</strong>
 <span className="text-xs opacity-70">({tier.transitTimeMin}m rota)</span>
 </span>
 <span className="col-span-3 text-right font-mono font-bold text-foreground">
 {formatMoney(tier.feeCents)}
 </span>
 <div className="col-span-2 text-center">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveTier(tier.id)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Linha para Adicionar Nova Faixa */}
 <div className="p-3 bg-muted/20 border-t border-border/60 space-y-2">
 <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Adicionar Nova Faixa de Raio
 </span>
 <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
 <Input
 type="number"
 step="0.1"
 placeholder="Km (ex: 5.0)"
 value={newRadius}
 onChange={(e) => setNewRadius(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-lg"
 />
 <Input
 type="number"
 placeholder="Minutos rota"
 value={newTransitTime}
 onChange={(e) => setNewTransitTime(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="R$ 8,90"
 value={newFee}
 onChange={(e) => setNewFee(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-lg"
 />
 </div>
 <Button
 type="button"
 size="sm"
 onClick={handleAddTier}
 disabled={!newRadius || !newTransitTime}
 className="w-full h-8 rounded-lg text-xs font-bold gap-1 bg-foreground text-background hover:bg-foreground/90 mt-1 min-h-11 sm:min-h-0"
 >
 <Plus className="size-3" />
 <span>Incluir Faixa de Raio</span>
 </Button>
 </div>
 </div>
 </div>
 {neighborhoodsSlot && (
 <div className="col-span-12 mt-4 pt-4 border-t border-border/60">
 {neighborhoodsSlot}
 </div>
 )}
 </div>
 )}

 {/* ── CONTEÚDO: ABA TEMPO DE PREPARO / EXPEDIÇÃO ── */}
 {activeTab === "preparo" && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {isGastro ? (
 <>
 {/* Gastronomia: Controle de Cozinha e Presets */}
 <div className="lg:col-span-6 space-y-5">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <UtensilsCrossed className="size-4 text-primary" />
 <span>Tempo de Preparo da Cozinha</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Informe o tempo médio que sua equipe leva para confeccionar e embalar um pedido.
 </p>
 </div>

 {/* Bloco de Ajuste Rápido (+ / -) */}
 <div className="p-5 rounded-lg border border-border/70 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Tempo de preparo ativo</Label>
 <p className="text-xs text-muted-foreground">Ajuste instantâneo para a operação de hoje</p>
 </div>

 <div className="flex items-center gap-3">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handlePrepTimeChange(-5)}
 className="size-11 min-h-11 min-w-11 rounded-lg border-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 title="Diminuir 5 minutos"
 >
 <Minus className="size-4" />
 </Button>

 <div className="flex items-baseline gap-1 px-4 py-2 bg-muted rounded-lg min-w-20 justify-center">
 <span className="font-mono text-xl font-black text-foreground">{currentPrepTime}</span>
 <span className="text-xs text-muted-foreground font-semibold">min</span>
 </div>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handlePrepTimeChange(5)}
 className="size-11 min-h-11 min-w-11 rounded-lg border-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 title="Aumentar 5 minutos"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 </div>

 {/* Chave de Tempo Manual */}
 <div className="flex items-center justify-between pt-3 border-t border-border/50">
 <div className="space-y-1">
 <span className="text-xs font-bold text-foreground">Modo Tempo Manual Fixo</span>
 <p className="text-xs text-muted-foreground">Sobrescreve estimativas automáticas por IA</p>
 </div>
 <Switch
 checked={value.manualPrepTimeEnabled ?? true}
 onCheckedChange={handleToggleManual}
 />
 </div>
 </div>

 {/* Pré-configurações Rápidas (Estilo iFood) */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground">Pré-configurações Rápidas de Operação</Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {GASTRO_PRESETS.map((p) => {
 const isSelected = currentPrepTime === p.time;
 return (
 <button
 key={p.label}
 type="button"
 onClick={() => handleApplyPreset(p)}
 className={cn(
 "flex items-center justify-between p-4 rounded-lg border text-xs text-left transition-colors duration-200 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
 isSelected
 ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
 : "border-border/60 bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
 )}
 >
 <span>{p.label}</span>
 <Clock className="size-3.5 shrink-0 opacity-70" />
 </button>
 );
 })}
 </div>
 </div>
 </div>

 {/* Lado Direito: Impacto Real na Vitrine & Previsão */}
 <div className="lg:col-span-6 space-y-4">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Clock className="size-4 text-primary" />
 <span>Impacto na Vitrine & Estimativa</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Como a velocidade da cozinha é refletida para os clientes no catálogo e aplicativo
 </p>
 </div>

 <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border/50 pb-3">
 <span className="text-xs text-muted-foreground">Previsão total informada ao cliente</span>
 <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-none font-bold">
 {minTotalTime} a {maxTotalTime} min
 </Badge>
 </div>

 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
 <span className="text-muted-foreground">Cozinha (Preparo)</span>
 <p className="font-mono font-bold text-foreground text-sm">{currentPrepTime} min</p>
 </div>
 <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
 <span className="text-muted-foreground">Rota Média (Motoboy)</span>
 <p className="font-mono font-bold text-foreground text-sm">10 a 25 min</p>
 </div>
 </div>

 <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
 <div className="flex items-center gap-2 font-bold text-primary">
 <UtensilsCrossed className="size-3.5" />
 <span>Sincronizado com Monitor de Pedidos (KDS)</span>
 </div>
 <p className="text-muted-foreground leading-relaxed">
 Seus cozinheiros e equipe de embalagem trabalham com base neste tempo médio calibrado.
 </p>
 </div>

 <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-xs space-y-1">
 <div className="flex items-center gap-2 font-bold text-warning-strong">
 <Zap className="size-3.5" />
 <span>Proteção em Dias de Chuva & Alta Demanda</span>
 </div>
 <p className="text-muted-foreground leading-relaxed">
 Em horários de pico ou chuva, selecione o preset de 35 ou 45 min para evitar queixas de atraso no aplicativo.
 </p>
 </div>
 </div>
 </div>
 </>
 ) : (
 <>
 {/* Varejo & Outros Nichos: Prazo de Expedição de Pedidos */}
 <div className="lg:col-span-6 space-y-5">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Package className="size-4 text-primary" />
 <span>Prazo de Separação & Despacho</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Defina o tempo médio que sua equipe leva para separar do estoque, embalar e postar o pedido.
 </p>
 </div>

 {/* Bloco de Ajuste de Dias */}
 <div className="p-5 rounded-lg border border-border/70 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">Prazo de Postagem / Expedição</Label>
 <p className="text-xs text-muted-foreground">Dias úteis para envio após aprovação</p>
 </div>

 <div className="flex items-center gap-3">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleDispatchDaysChange(-1)}
 className="size-11 min-h-11 min-w-11 rounded-lg border-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 title="Diminuir prazo"
 >
 <Minus className="size-4" />
 </Button>

 <div className="flex items-baseline gap-1 px-4 py-2 bg-muted rounded-lg min-w-24 justify-center">
 <span className="font-mono text-xl font-black text-foreground">
 {dispatchDays === 0 ? "0" : dispatchDays}
 </span>
 <span className="text-xs text-muted-foreground font-semibold">
 {dispatchDays === 0 ? "dias (hoje)" : dispatchDays === 1 ? "dia útil" : "dias úteis"}
 </span>
 </div>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleDispatchDaysChange(1)}
 className="size-11 min-h-11 min-w-11 rounded-lg border-border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 title="Aumentar prazo"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 </div>

 <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
 {dispatchDays === 0 ? (
 <span className="text-emerald-600 font-semibold flex items-center gap-2">
 <CheckCircle2 className="size-3.5" />
 Envio Imediato: Pedidos aprovados até 14h são postados no mesmo dia útil.
 </span>
 ) : (
 <span>
 Seus pedidos serão despachados em até <strong>{dispatchDays} {dispatchDays === 1 ? "dia útil" : "dias úteis"}</strong> nos Correios, Transportadora ou Motoboy.
 </span>
 )}
 </div>
 </div>

 {/* Opções Predefinidas de Expedição */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground">Padrões Comuns de Expedição no Varejo</Label>
 <div className="space-y-2">
 {RETAIL_DISPATCH_PRESETS.map((p) => {
 const isSelected = dispatchDays === p.days;
 return (
 <button
 key={p.label}
 type="button"
 onClick={() => handleApplyDispatchPreset(p)}
 className={cn(
 "w-full flex items-center justify-between p-4 rounded-lg border text-xs text-left transition-colors duration-200 cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
 isSelected
 ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
 : "border-border/60 bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
 )}
 >
 <div className="space-y-1">
 <span className="font-semibold text-foreground">{p.label}</span>
 <p className="text-xs text-muted-foreground">{p.text}</p>
 </div>
 {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 {/* Lado Direito: Comunicação de Prazo na Vitrine de Varejo */}
 <div className="lg:col-span-6 space-y-4">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Truck className="size-4 text-primary" />
 <span>Cálculo de Entrega no Catálogo & Checkout</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Como o cliente calcula e visualiza o prazo na página do produto
 </p>
 </div>

 <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
 <div className="flex items-center justify-between border-b border-border/50 pb-3">
 <span className="text-xs text-muted-foreground">Promessa exibida ao comprador</span>
 <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-none font-bold">
 {dispatchDays === 0 ? "Despacho no mesmo dia" : `Envio em até ${dispatchDays} dias úteis`}
 </Badge>
 </div>

 <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-2">
 <div className="flex items-center justify-between text-foreground">
 <span>Prazo de Expedição (Loja):</span>
 <strong className="font-mono">{dispatchDays === 0 ? "0 dias (hoje)" : `${dispatchDays} dia(s) úteis`}</strong>
 </div>
 <div className="flex items-center justify-between text-foreground">
 <span>Prazo de Envio (Correios / Transportadora):</span>
 <strong className="font-mono">+ Prazo por CEP</strong>
 </div>
 <div className="pt-2 border-t border-border/40 flex items-center justify-between font-bold text-foreground">
 <span>Prazo Total Informado no Checkout:</span>
 <span className="text-primary font-mono">{dispatchDays}d + Prazo do Frete</span>
 </div>
 </div>

 <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
 <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
 <ShieldCheck className="size-3.5" />
 <span>Agilidade que Aumenta Conversão</span>
 </div>
 <p className="text-muted-foreground leading-relaxed">
 Lojas que despacham em até 24 horas convertem até 38% mais pedidos no marketplace e recebem notas máximas dos compradores.
 </p>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 )}

 {/* ── CONTEÚDO: ABA MODALIDADES E TAXAS ── */}
 {activeTab === "modalidades" && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
 <div className="lg:col-span-7 space-y-5">
 <div>
 <h3 className="text-sm font-bold text-foreground">
 {isGastro ? "Modalidades de Atendimento da Loja" : "Canais de Envio & Entrega"}
 </h3>
 <p className="text-xs text-muted-foreground">
 {isGastro
 ? "Ative simultaneamente as formas de entrega e retirada disponíveis no ecossistema Waesy."
 : "Selecione as opções de frete locais, transportadoras e retirada presencial para seus clientes."}
 </p>
 </div>

 <div className="space-y-3">
 {/* MotoLink / Entrega Expressa */}
 <div className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
 <Bike className="size-5" />
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">
 {isGastro ? "MotoLink (Frota da Cidade sob Demanda)" : "Entrega Expressa Local (Motoboy sob Demanda)"}
 </span>
 <p className="text-xs text-muted-foreground mt-1">
 {isGastro
 ? "Entregadores autônomos da plataforma alocados automaticamente por algoritmo dinâmico de proximidade e telemetria GPS."
 : "Entregadores parceiros Waesy Go chamados sob demanda para despachos urgentes no mesmo dia na sua cidade."}
 </p>
 </div>
 </div>
 <Switch
 checked={value.motolinkEnabled !== false}
 onCheckedChange={(checked) => onChange({ ...value, motolinkEnabled: checked })}
 />
 </div>

 {/* Entregadores Próprios */}
 <div className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
 <Store className="size-5" />
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">
 {isGastro ? "Entregadores Próprios da Loja" : "Frota Própria da Empresa"}
 </span>
 <p className="text-xs text-muted-foreground mt-1">
 Entregas realizadas por sua própria equipe, aplicando o raio em km e as taxas por bairro cadastradas.
 </p>
 </div>
 </div>
 <Switch
 checked={value.ownDeliveryEnabled !== false}
 onCheckedChange={(checked) => onChange({ ...value, ownDeliveryEnabled: checked })}
 />
 </div>

 {/* Retirada Balcão */}
 <div className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
 <Store className="size-5" />
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">
 {isGastro ? "Retirada no Balcão (Takeout)" : "Retirada na Loja Física (Clique & Retire)"}
 </span>
 <p className="text-xs text-muted-foreground mt-1">
 Permite ao cliente comprar online e retirar presencialmente no seu endereço comercial com taxa zero de frete.
 </p>
 </div>
 </div>
 <Switch
 checked={value.pickupEnabled !== false}
 onCheckedChange={(checked) => onChange({ ...value, pickupEnabled: checked })}
 />
 </div>

 {/* Transportadora */}
 <div className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
 <div className="flex items-start gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
 <Truck className="size-5" />
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">
 {isGastro ? "Transportadora e Frete Terceirizado" : "Transportadora & Envio Rodoviário (Cargas e Volumes)"}
 </span>
 <p className="text-xs text-muted-foreground mt-1">
 Envio rodoviário, Correios ou cotação FOB para pacotes de médio e grande porte e envios intermunicipais.
 </p>
 </div>
 </div>
 <Switch
 checked={Boolean(value.carrierEnabled)}
 onCheckedChange={(checked) => onChange({ ...value, carrierEnabled: checked })}
 />
 </div>
 </div>
 </div>

 <div className="lg:col-span-5 space-y-5">
 <div>
 <h3 className="text-sm font-bold text-foreground">Regras Comerciais de Frete</h3>
 <p className="text-xs text-muted-foreground">
 Valores mínimos e políticas de segurança na entrega.
 </p>
 </div>

 <div className="space-y-4 p-5 rounded-xl border border-border bg-card">
 {/* Frete Grátis e Pedido Mínimo */}
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Truck className="size-4 text-primary" />
 <span>Frete Grátis a Partir de (R$)</span>
 </Label>
 <CurrencyField
 value={value.freeDeliveryThresholdCents || null}
 onChange={(cents) => onChange({ ...value, freeDeliveryThresholdCents: cents ?? null })}
 placeholder="Ex: R$ 199,00 (Opcional)"
 allowZero={true}
 className="h-11 rounded-lg"
 />
 <p className="text-xs text-muted-foreground">
 Pedidos com valor de produtos acima deste montante recebem frete isento subsidiado pela loja.
 </p>
 </div>

 <div className="space-y-2 pt-2 border-t border-border/50">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary" />
 <span>Valor Mínimo do Pedido (R$)</span>
 </Label>
 <CurrencyField
 value={value.minOrderCents || null}
 onChange={(cents) => onChange({ ...value, minOrderCents: cents ?? 0 })}
 placeholder="R$ 0,00"
 allowZero={true}
 className="h-11 rounded-lg"
 />
 <p className="text-xs text-muted-foreground">
 Carrinho mínimo exigido para o cliente concluir a compra na vitrine.
 </p>
 </div>

 {isGastro && (
 <div className="space-y-2 pt-2 border-t border-border/50">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Building2 className="size-4 text-primary" />
 <span>Taxa de Subida em Apartamento / Condomínio</span>
 </Label>
 <CurrencyField
 value={value.condoClimbFeeCents || null}
 onChange={(cents) => onChange({ ...value, condoClimbFeeCents: cents ?? null })}
 placeholder="R$ 0,00 (Opcional)"
 allowZero={true}
 className="h-11 rounded-lg"
 />
 <p className="text-xs text-muted-foreground">
 Repassado ao motoboy quando o cliente solicita entrega na porta de edifício ou condomínio fechado.
 </p>
 </div>
 )}

 <div className="pt-3 border-t border-border/60 space-y-2">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <ShieldCheck className="size-4 text-emerald-600" />
 Regra de Retorno & Segurança
 </span>
 <p className="text-xs text-muted-foreground">
 Em caso de destinatário ausente ou endereço incorreto, o entregador retorna a mercadoria à sua sede com taxa defensiva garantida.
 </p>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
