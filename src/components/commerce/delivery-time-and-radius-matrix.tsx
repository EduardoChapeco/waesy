import React, { useState } from "react";
import { Clock, Plus, Minus, Trash2, MapPin, Layers, Bike, Store, ChevronRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

const PRESETS = [
 { label: "Padrão (15 min)", time: 15 },
 { label: "Rápido / Lanches (10 min)", time: 10 },
 { label: "Pizzas e Forno (25 min)", time: 25 },
 { label: "Pico de Jantar (35 min)", time: 35 },
 { label: "Alta Demanda / Chuva (45 min)", time: 45 },
];

interface DeliveryTimeAndRadiusMatrixProps {
 value: DeliveryLogisticsConfig;
 onChange: (value: DeliveryLogisticsConfig) => void;
 storeName?: string;
 storeCategory?: string;
 storeLogoUrl?: string;
 storeBannerUrl?: string;
}

export function DeliveryTimeAndRadiusMatrix({
 value,
 onChange,
 storeName = "Minha Cozinha & Loja",
 storeCategory = "Gastronomia & Delivery",
 storeLogoUrl,
 storeBannerUrl,
}: DeliveryTimeAndRadiusMatrixProps) {
 const [activeTab, setActiveTab] = useState<"operacao" | "preparo">("operacao");
 const [newRadius, setNewRadius] = useState("");
 const [newTransitTime, setNewTransitTime] = useState("");
 const [newFee, setNewFee] = useState("");

 const currentPrepTime = value.basePrepTimeMin || 15;
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
 <div className="flex items-center justify-between border-b border-border/60 pb-3">
 <div className="flex items-center gap-6">
 <button
 type="button"
 onClick={() => setActiveTab("operacao")}
 className={cn(
 "text-xs font-bold transition-all relative pb-3 cursor-pointer",
 activeTab === "operacao"
 ? "text-primary border-b-2 border-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Operação atual e Raio
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("preparo")}
 className={cn(
 "text-xs font-bold transition-all relative pb-3 flex items-center gap-1.5 cursor-pointer",
 activeTab === "preparo"
 ? "text-primary border-b-2 border-primary"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <span>Meu tempo de preparo</span>
 <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-none px-1.5 py-0">
 {currentPrepTime} min
 </Badge>
 </button>
 </div>

 <div className="text-[11px] text-muted-foreground font-medium hidden sm:block">
 Canal de venda: <strong className="text-foreground">App e Web Waesy</strong>
 </div>
 </div>

 {/* ── CONTEÚDO: ABA OPERAÇÃO ATUAL ── */}
 {activeTab === "operacao" && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Lado Esquerdo: Truthful Preview da Loja & Mapa Conceitual */}
 <div className="lg:col-span-6 space-y-4">
 <div className="space-y-1.5">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <MapPin className="size-4 text-primary" />
 <span>Raio de Atendimento e Visualização</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Como os clientes visualizam seu tempo de entrega e taxa no aplicativo da sua cidade.
 </p>
 </div>

 {/* Truthful Preview Card — Estilo iFood */}
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all">
 {/* Banner */}
 <div className="relative h-28 sm:h-32 w-full bg-muted overflow-hidden">
 {storeBannerUrl ? (
 <img src={storeBannerUrl} alt={storeName} className="size-full object-cover" />
 ) : (
 <div className="size-full bg-gradient-to-r from-zinc-800 to-zinc-900 flex items-center justify-center text-muted-foreground/40">
 <Store className="size-8" />
 </div>
 )}
 {/* Logo Sobreposto */}
 <div className="absolute -bottom-4 left-4 size-16 rounded-2xl bg-card border-2 border-background overflow-hidden shadow-md flex items-center justify-center">
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
 <p className="text-[11px] text-muted-foreground">{storeCategory}</p>
 </div>
 <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-none font-bold">
 Aberta Agora
 </Badge>
 </div>

 {/* Métricas de Tempo e Entrega */}
 <div className="flex items-center gap-3 pt-2 text-xs border-t border-border/50">
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
 <div className="text-muted-foreground text-[11px]">
 Preparo: <strong>{currentPrepTime} min</strong>
 </div>
 </div>
 </div>
 </div>

 {/* Aviso da Equação de Entrega */}
 <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs space-y-1">
 <div className="flex items-center gap-1.5 font-bold text-foreground">
 <Zap className="size-3.5 text-amber-500" />
 <span>Cálculo Inteligente de Entrega</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 O tempo total exibido para o cliente é a soma automática do <strong>Tempo de Preparo da sua Cozinha ({currentPrepTime} min)</strong> + <strong>Tempo de Deslocamento do Motoboy por Raio</strong>.
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
 <div className="rounded-2xl border border-border/60 overflow-hidden bg-card divide-y divide-border/50">
 <div className="grid grid-cols-12 bg-muted/50 p-3 text-[11px] font-bold text-muted-foreground">
 <span className="col-span-3">Raio (km)</span>
 <span className="col-span-4">Tempo Total (Preparo+Viagem)</span>
 <span className="col-span-3 text-right">Taxa (R$)</span>
 <span className="col-span-2 text-center">Ações</span>
 </div>

 <div className="divide-y divide-border/40 max-h-72 overflow-y-auto scrollbar-none">
 {tiers.map((tier) => {
 const totalTimeForTier = currentPrepTime + tier.transitTimeMin;
 return (
 <div key={tier.id} className="grid grid-cols-12 p-3 text-xs items-center hover:bg-muted/20 transition-colors">
 <span className="col-span-3 font-semibold text-foreground">
 Até {tier.radiusKm} km
 </span>
 <span className="col-span-4 text-muted-foreground flex items-center gap-1.5">
 <Clock className="size-3 text-primary" />
 <strong className="text-foreground">{totalTimeForTier} min</strong>
 <span className="text-[10px] opacity-70">({tier.transitTimeMin}m rota)</span>
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
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Adicionar Nova Faixa de Raio
 </span>
 <div className="grid grid-cols-12 gap-2">
 <Input
 type="number"
 step="0.1"
 placeholder="Km (ex: 5.0)"
 value={newRadius}
 onChange={(e) => setNewRadius(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-xl"
 />
 <Input
 type="number"
 placeholder="Minutos rota"
 value={newTransitTime}
 onChange={(e) => setNewTransitTime(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-xl"
 />
 <Input
 placeholder="R$ 8,90"
 value={newFee}
 onChange={(e) => setNewFee(e.target.value)}
 className="col-span-4 h-8 text-xs rounded-xl"
 />
 </div>
 <Button
 type="button"
 size="sm"
 onClick={handleAddTier}
 disabled={!newRadius || !newTransitTime}
 className="w-full h-8 rounded-xl text-xs font-bold gap-1 bg-foreground text-background hover:bg-foreground/90 mt-1"
 >
 <Plus className="size-3" />
 <span>Incluir Faixa de Raio</span>
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ── CONTEÚDO: ABA MEU TEMPO DE PREPARO ── */}
 {activeTab === "preparo" && (
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Lado Esquerdo: Controle Manual e Presets */}
 <div className="lg:col-span-6 space-y-5">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Tempo de Preparo da Cozinha</h3>
 <p className="text-xs text-muted-foreground">
 Informe o tempo médio que sua equipe leva para confeccionar e embalar um pedido.
 </p>
 </div>

 {/* Bloco de Ajuste Rápido (+ / -) */}
 <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label className="text-xs font-bold text-foreground">Tempo de preparo ativo</Label>
 <p className="text-[11px] text-muted-foreground">Ajuste instantâneo para a operação de hoje</p>
 </div>

 <div className="flex items-center gap-3">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handlePrepTimeChange(-5)}
 className="size-9 rounded-xl border-border"
 >
 <Minus className="size-4" />
 </Button>

 <div className="flex items-baseline gap-1 px-3 py-1 bg-muted rounded-xl min-w-[70px] justify-center">
 <span className="font-mono text-xl font-black text-foreground">{currentPrepTime}</span>
 <span className="text-xs text-muted-foreground font-semibold">min</span>
 </div>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handlePrepTimeChange(5)}
 className="size-9 rounded-xl border-border"
 >
 <Plus className="size-4" />
 </Button>
 </div>
 </div>

 {/* Chave de Tempo Manual */}
 <div className="flex items-center justify-between pt-3 border-t border-border/50">
 <div className="space-y-0.5">
 <span className="text-xs font-bold text-foreground">Modo Tempo Manual Fixo</span>
 <p className="text-[10px] text-muted-foreground">Sobrescreve estimativas automáticas por IA</p>
 </div>
 <Switch
 checked={value.manualPrepTimeEnabled ?? true}
 onCheckedChange={handleToggleManual}
 />
 </div>
 </div>

 {/* Pré-configurações Rápidas (Estilo iFood) */}
 <div className="space-y-2.5">
 <Label className="text-xs font-bold text-foreground">Pré-configurações Rápidas de Operação</Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {PRESETS.map((p) => {
 const isSelected = currentPrepTime === p.time;
 return (
 <button
 key={p.label}
 type="button"
 onClick={() => handleApplyPreset(p)}
 className={cn(
 "flex items-center justify-between p-3 rounded-2xl border text-xs text-left transition-all cursor-pointer",
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

 {/* Lado Direito: Grade Visual Semanal de Tempo de Preparo (Heatmap) */}
 <div className="lg:col-span-6 space-y-4">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Grade Semanal de Turnos (GMT-03)</h3>
 <p className="text-xs text-muted-foreground">
 Mapeamento visual da operação nos 7 dias da semana
 </p>
 </div>

 {/* Heatmap Visual da Semana */}
 <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
 <div className="grid grid-cols-8 gap-1.5 text-center text-[10px] font-bold text-muted-foreground border-b border-border/40 pb-2">
 <span>Hora</span>
 <span>Seg</span>
 <span>Ter</span>
 <span>Qua</span>
 <span>Qui</span>
 <span>Sex</span>
 <span>Sáb</span>
 <span className="text-primary font-black">Dom</span>
 </div>

 <div className="space-y-1.5 text-xs max-h-64 overflow-y-auto scrollbar-none pr-1">
 {[
 { hour: "11:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Almoço" },
 { hour: "12:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Pico Almoço" },
 { hour: "13:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Almoço" },
 { hour: "18:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Jantar" },
 { hour: "19:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Pico Jantar" },
 { hour: "20:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Pico Jantar" },
 { hour: "21:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Jantar" },
 { hour: "22:00", activeDays: [1, 2, 3, 4, 5, 6, 7], label: "Encerramento" },
 ].map((row) => (
 <div key={row.hour} className="grid grid-cols-8 gap-1.5 items-center text-center">
 <span className="font-mono text-[10px] text-muted-foreground">{row.hour}</span>
 {[1, 2, 3, 4, 5, 6, 7].map((day) => (
 <div
 key={day}
 className="h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400"
 title={`${row.hour} - ${row.label}: ${currentPrepTime} min`}
 >
 {currentPrepTime}m
 </div>
 ))}
 </div>
 ))}
 </div>

 <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
 <div className="flex items-center gap-1.5">
 <div className="size-2.5 rounded-xs bg-emerald-500/30 border border-emerald-500/60" />
 <span>Turno ativo com preparo calibrado</span>
 </div>
 <span className="font-bold text-foreground">Status: Operação Normal</span>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
