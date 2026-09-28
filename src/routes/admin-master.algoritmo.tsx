import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sliders, Layers, Save, Loader2, MapPin, Clock, Heart, TrendingUp, Award, Coins, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { getAlgorithmParameters, updateAlgorithmParameters, type AlgorithmParameters } from "@/services/algorithm.functions";

export const Route = createFileRoute("/admin-master/algoritmo")({
 head: () => ({ meta: [{ title: "Motor Algorítmico | Admin Master Waesy" }] }),
 loader: async () => {
 try {
 const params = await getAlgorithmParameters();
 return { params };
 } catch (e) {
 console.error("[admin-master.algoritmo] loader error:", e);
 return {
 params: {
 id: "00000000-0000-0000-0000-000000000001",
 name: "Algoritmo Oficial Waesy Pulse v1",
 weight_geo: 0.25,
 weight_open_status: 0.20,
 weight_user_affinity: 0.20,
 weight_freshness: 0.15,
 weight_store_quality: 0.10,
 weight_token_boost: 0.10,
 max_radius_km: 15,
 decay_half_life_days: 7,
 updated_at: new Date().toISOString(),
 },
 };
 }
 },
 component: AdminAlgorithmSettingsPage,
});

export default function AdminAlgorithmSettingsPage() {
 const { params: initialParams } = ((Route.useLoaderData?.() as any) || {});
 const [params, setParams] = useState(initialParams);
 const [isSaving, setIsSaving] = useState(false);

 // Normalização e soma percentual
 const totalWeightPercent = Math.round(
 (params.weight_geo +
 params.weight_open_status +
 params.weight_user_affinity +
 params.weight_freshness +
 params.weight_store_quality +
 params.weight_token_boost) *
 100
 );

 const handleSliderChange = (key: keyof AlgorithmParameters, valuePercent: number) => {
 setParams((prev: any) => ({
 ...prev,
 [key]: Number((valuePercent / 100).toFixed(2)),
 }));
 };

 const applyPreset = (preset: "default" | "rain_hyperlocal" | "new_growth") => {
 if (preset === "default") {
 setParams((prev: any) => ({
 ...prev,
 weight_geo: 0.25,
 weight_open_status: 0.20,
 weight_user_affinity: 0.20,
 weight_freshness: 0.15,
 weight_store_quality: 0.10,
 weight_token_boost: 0.10,
 }));
 toast.info("Preset Padrão Equilíbrio Urbano aplicado.");
 } else if (preset === "rain_hyperlocal") {
 setParams((prev: any) => ({
 ...prev,
 weight_geo: 0.45,
 weight_open_status: 0.30,
 weight_user_affinity: 0.10,
 weight_freshness: 0.05,
 weight_store_quality: 0.05,
 weight_token_boost: 0.05,
 }));
 toast.info("Preset Modo Chuva / Hiperlocal aplicado.");
 } else if (preset === "new_growth") {
 setParams((prev: any) => ({
 ...prev,
 weight_geo: 0.15,
 weight_open_status: 0.15,
 weight_user_affinity: 0.15,
 weight_freshness: 0.35,
 weight_store_quality: 0.10,
 weight_token_boost: 0.10,
 }));
 toast.info("Preset Aceleração de Novos Negócios aplicado.");
 }
 };

 const handleSave = async () => {
 try {
 setIsSaving(true);
 const res = await updateAlgorithmParameters({
 data: {
 weight_geo: params.weight_geo,
 weight_open_status: params.weight_open_status,
 weight_user_affinity: params.weight_user_affinity,
 weight_freshness: params.weight_freshness,
 weight_store_quality: params.weight_store_quality,
 weight_token_boost: params.weight_token_boost,
 max_radius_km: params.max_radius_km,
 decay_half_life_days: params.decay_half_life_days,
 },
 });
 toast.success(res.message);
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar pesos do algoritmo.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 {/* Header Silencioso */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-foreground">
 Algoritmo e Recomendações
 </h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 Controle central dos pesos do algoritmo de ranking (Waesy Pulse). Ajustes entram em vigor imediatamente na vitrine pública.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={handleSave}
 disabled={isSaving}
 size="sm"
 className="rounded-xl text-xs font-semibold gap-1.5 h-9"
 >
 {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
 <span>Salvar Pesos em Produção</span>
 </Button>
 </div>
 </div>

 {/* Presets Rápidos */}
 <div className="p-4 rounded-2xl border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
 <div className="space-y-0.5">
 <span className="font-semibold text-foreground">Presets Estratégicos de Calibragem</span>
 <p className="text-muted-foreground text-[11px]">
 Carregue configurações prontas para diferentes cenários operacionais da cidade.
 </p>
 </div>

 <div className="flex flex-wrap gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => applyPreset("default")}
 className="text-xs h-8 rounded-xl"
 >
 Equilíbrio Padrão
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => applyPreset("rain_hyperlocal")}
 className="text-xs h-8 rounded-xl"
 >
 Modo Chuva / Hiperlocal
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => applyPreset("new_growth")}
 className="text-xs h-8 rounded-xl"
 >
 Aceleração de Novos Negócios
 </Button>
 </div>
 </div>

 {/* Barra de Distribuição Percentual */}
 <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground">Distribuição Total dos Pesos</span>
 <Badge
 variant={totalWeightPercent === 100 ? "default" : "secondary"}
 className="text-xs font-mono font-bold"
 >
 {totalWeightPercent}% / 100%
 </Badge>
 </div>

 {/* Barra Segmentada */}
 <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-muted/40 p-0.5 gap-0.5">
 <div style={{ width: `${params.weight_geo * 100}%` }} className="bg-info rounded-full transition-all" title="Geo" />
 <div style={{ width: `${params.weight_open_status * 100}%` }} className="bg-emerald-500 rounded-full transition-all" title="Aberto Agora" />
 <div style={{ width: `${params.weight_user_affinity * 100}%` }} className="bg-primary rounded-full transition-all" title="Afinidade" />
 <div style={{ width: `${params.weight_freshness * 100}%` }} className="bg-amber-500 rounded-full transition-all" title="Recência" />
 <div style={{ width: `${params.weight_store_quality * 100}%` }} className="bg-primary rounded-full transition-all" title="Qualidade" />
 <div style={{ width: `${params.weight_token_boost * 100}%` }} className="bg-rose-500 rounded-full transition-all" title="Tokens" />
 </div>
 </div>

 {/* Sliders dos 6 Sinais do Algoritmo */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Sinal 1: Geolocalização */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-info/10 text-info flex items-center justify-center">
 <MapPin className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Proximidade Física / Geolocalização</h2>
 <span className="text-[11px] text-muted-foreground">Prioriza lojas no mesmo bairro e raio próximo</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_geo * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_geo * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_geo", val)}
 />
 </Card>

 {/* Sinal 2: Aberto Agora */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <Clock className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Status Aberto Agora</h2>
 <span className="text-[11px] text-muted-foreground">Multiplicador de relevância para atendimento ativo</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_open_status * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_open_status * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_open_status", val)}
 />
 </Card>

 {/* Sinal 3: Afinidade Comportamental */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Heart className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Afinidade por Nicho / Categoria</h2>
 <span className="text-[11px] text-muted-foreground">Histórico individual de cliques e buscas do usuário</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_user_affinity * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_user_affinity * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_user_affinity", val)}
 />
 </Card>

 {/* Sinal 4: Recência do Item */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
 <TrendingUp className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Recência / Novidades no Radar</h2>
 <span className="text-[11px] text-muted-foreground">Impulso orgânico para anúncios criados recentemente</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_freshness * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_freshness * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_freshness", val)}
 />
 </Card>

 {/* Sinal 5: Qualidade & Avaliações */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Award className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Qualidade da Loja e Selo Curado</h2>
 <span className="text-[11px] text-muted-foreground">Pontuação baseada em avaliações e verificação KYC</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_store_quality * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_store_quality * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_store_quality", val)}
 />
 </Card>

 {/* Sinal 6: Impulso de Tokens no Radar */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
 <Coins className="size-4" />
 </div>
 <div>
 <h2 className="text-xs font-bold text-foreground">Impulso de Micro-Tokens no Radar</h2>
 <span className="text-[11px] text-muted-foreground">Lance em leilão atômico por visualizações de alta intenção</span>
 </div>
 </div>
 <span className="font-mono text-xs font-bold text-foreground">
 {Math.round(params.weight_token_boost * 100)}%
 </span>
 </div>
 <Slider
 value={[Math.round(params.weight_token_boost * 100)]}
 min={0}
 max={100}
 step={5}
 onValueChange={([val]) => handleSliderChange("weight_token_boost", val)}
 />
 </Card>
 </div>

 {/* Parâmetros Espaciais Globais */}
 <Card className="p-5 rounded-2xl border-border/60 bg-card space-y-4">
 <div>
 <h2 className="text-sm font-bold text-foreground">Parâmetros Espaciais e Meia-Vida</h2>
 <p className="text-xs text-muted-foreground">
 Definições de raio de cobertura e velocidade de decaimento da novidade dos anúncios.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Raio Máximo Padrão de Descoberta (km)</Label>
 <Input
 type="number"
 min="1"
 max="100"
 value={params.max_radius_km}
 onChange={(e) =>
 setParams((prev: any) => ({ ...prev, max_radius_km: Number(e.target.value || "15") }))
 }
 className="h-9 font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Meia-Vida da Recência (dias)</Label>
 <Input
 type="number"
 min="1"
 max="30"
 value={params.decay_half_life_days}
 onChange={(e) =>
 setParams((prev: any) => ({ ...prev, decay_half_life_days: Number(e.target.value || "7") }))
 }
 className="h-9 font-mono"
 />
 </div>
 </div>
 </Card>
 </div>
 );
}
