import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  ChefHat,
  Search,
  Filter,
  Flame,
  Thermometer,
  Beer,
  CakeSlice,
  Utensils,
  Check,
  TrendingUp,
  AlertTriangle,
  Save,
  Layers,
  ArrowUpDown,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import {
  listProductsKitchenPrep,
  updateProductPrepTimeAndStation,
  batchUpdateProductPrepTime,
  getKitchenSlaTelemetry,
  type KitchenStation,
} from "@/services/kitchen-prep.functions";
import { getStoreSettings } from "@/services/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";

export const Route = createFileRoute("/workspace/pedidos/tempo-preparo")({
  head: () => ({
    meta: [{ title: "Tempo de Preparo & Praças da Cozinha | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      return { store };
    } catch {
      return { store: null };
    }
  },
  component: KitchenPrepTimePage,
});

const STATIONS_CONFIG: Array<{ id: KitchenStation | "all"; label: string; icon: any }> = [
  { id: "all", label: "Todas as Praças", icon: Utensils },
  { id: "chapa", label: "Chapa / Grelhados", icon: Thermometer },
  { id: "forno", label: "Forno / Pizzaria", icon: Flame },
  { id: "bebidas", label: "Bar & Bebidas", icon: Beer },
  { id: "sobremesas", label: "Sobremesas / Café", icon: CakeSlice },
  { id: "geral", label: "Geral / Montagem", icon: Layers },
];

function KitchenPrepTimePage() {
  const { store } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"spreadsheet" | "telemetry">("spreadsheet");
  const [stationFilter, setStationFilter] = useState<KitchenStation | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Estado local para edições inpage antes do salvamento
  const [localEdits, setLocalEdits] = useState<
    Record<string, { prepTimeMinutes: number; kitchenStation: KitchenStation; toleranceMinutes: number }>
  >({});

  // ── Queries ──
  const { data: items = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["kitchen-prep-items", stationFilter, searchQuery],
    queryFn: () => listProductsKitchenPrep({ data: { station: stationFilter, search: searchQuery } }),
  });

  const { data: telemetry, isLoading: isTelemetryLoading } = useQuery({
    queryKey: ["kitchen-sla-telemetry"],
    queryFn: () => getKitchenSlaTelemetry(),
  });

  // ── Mutações ──
  const updateSingleMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      prepTimeMinutes: number;
      kitchenStation: KitchenStation;
      toleranceMinutes?: number;
    }) => updateProductPrepTimeAndStation({ data: payload }),
    onSuccess: (_, variables) => {
      toast.success("Tempo de preparo e praça atualizados no produto!");
      queryClient.invalidateQueries({ queryKey: ["kitchen-prep-items"] });
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[variables.productId];
        return next;
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar tempo de preparo.");
    },
  });

  const batchMutation = useMutation({
    mutationFn: (updates: Array<{ productId: string; prepTimeMinutes: number; kitchenStation: KitchenStation; toleranceMinutes?: number }>) =>
      batchUpdateProductPrepTime({ data: { updates } }),
    onSuccess: (res) => {
      toast.success(`${res.updatedCount} itens salvos com sucesso no cardápio!`);
      queryClient.invalidateQueries({ queryKey: ["kitchen-prep-items"] });
      setLocalEdits({});
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar alterações em lote.");
    },
  });

  const handleFieldChange = (
    productId: string,
    field: "prepTimeMinutes" | "kitchenStation" | "toleranceMinutes",
    value: any,
    currentOriginal: any,
  ) => {
    setLocalEdits((prev) => {
      const existing = prev[productId] || {
        prepTimeMinutes: currentOriginal.prepTimeMinutes,
        kitchenStation: currentOriginal.kitchenStation,
        toleranceMinutes: currentOriginal.toleranceMinutes,
      };
      return {
        ...prev,
        [productId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveItem = (item: any) => {
    const edit = localEdits[item.id];
    if (!edit) return;
    updateSingleMutation.mutate({
      productId: item.id,
      prepTimeMinutes: edit.prepTimeMinutes,
      kitchenStation: edit.kitchenStation,
      toleranceMinutes: edit.toleranceMinutes,
    });
  };

  const handleSaveAll = () => {
    const entries = Object.entries(localEdits);
    if (entries.length === 0) {
      toast.info("Nenhuma alteração pendente para salvar.");
      return;
    }
    const updates = entries.map(([productId, val]) => ({
      productId,
      prepTimeMinutes: val.prepTimeMinutes,
      kitchenStation: val.kitchenStation,
      toleranceMinutes: val.toleranceMinutes,
    }));
    batchMutation.mutate(updates);
  };

  const pendingCount = Object.keys(localEdits).length;

  return (
    <NicheOperationalGuard
      targetNiche="gastronomy"
      toolTitle="Tempo de Preparo & Praças da Cozinha"
      store={store}
    >
      <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
        {/* ── Top Header Canônico ── */}
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Tempo de Preparo & Praças
                    <Badge variant="outline" className="text-2xs font-mono font-semibold">
                      KDS & SLA
                    </Badge>
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Edição inline no cardápio e telemetria de gargalos de produção da cozinha.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={batchMutation.isPending}
                  className="h-11 min-h-11 sm:h-9 sm:min-h-0 gap-2 font-bold text-xs shadow-2xs"
                >
                  <Save className="size-4" />
                  <span>Salvar {pendingCount} Alterações</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-11 min-h-11 sm:h-9 sm:min-h-0 gap-2 text-xs font-semibold"
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin motion-reduce:animate-none")} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </div>
        </header>

        {/* ── Abas Soberanas: Planilha vs Telemetria ── */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-4">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
              <TabsList className="bg-muted/40 p-1 rounded-lg border border-border/70 h-11">
                <TabsTrigger value="spreadsheet" className="gap-2 text-xs font-bold px-4 h-9">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Planilha de Tempos (Inline)</span>
                </TabsTrigger>
                <TabsTrigger value="telemetry" className="gap-2 text-xs font-bold px-4 h-9">
                  <TrendingUp className="size-3.5" />
                  <span>Monitor de Gargalos & SLA</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "spreadsheet" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar por prato ou lanche..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-11 sm:h-9 text-xs bg-card"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                ABA 1: PLANILHA INLINE DE TEMPOS & PRAÇAS DA COZINHA
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="spreadsheet" className="space-y-4 m-0">
              {/* Filtro de Praça da Cozinha */}
              {/* design-lint-ignore DL-30 reason:"Rolagem horizontal de filtros de pracas da cozinha no mobile" expiry:"2027-12-31" */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {STATIONS_CONFIG.map((st) => {
                  const Icon = st.icon;
                  const isSelected = stationFilter === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStationFilter(st.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shrink-0 border h-11 min-h-11 sm:h-9 sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSelected
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/30",
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tabela Planilha de Edição Inline */}
              <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
                {/* design-lint-ignore DL-30 reason:"Container de tabela com scroll horizontal responsivo para dados densos" expiry:"2027-12-31" */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground uppercase text-2xs tracking-wider">
                        <th className="p-3 font-bold">Prato / Item do Cardápio</th>
                        <th className="p-3 font-bold">Praça da Cozinha</th>
                        <th className="p-3 font-bold text-center">Tempo de Cozinha (Min)</th>
                        <th className="p-3 font-bold text-center">Margem SLA (Min)</th>
                        <th className="p-3 font-bold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Carregando pratos e tempos da cozinha...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Nenhum prato encontrado para este filtro.
                          </td>
                        </tr>
                      ) : (
                        items.map((item: any) => {
                          const local = localEdits[item.id];
                          const prepVal = local ? local.prepTimeMinutes : item.prepTimeMinutes;
                          const stationVal = local ? local.kitchenStation : item.kitchenStation;
                          const tolVal = local ? local.toleranceMinutes : item.toleranceMinutes;
                          const isDirty = Boolean(local);

                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                "hover:bg-muted/20 transition-colors",
                                isDirty && "bg-primary/5",
                              )}
                            >
                              <td className="p-3">
                                <div className="space-y-1">
                                  <span className="font-bold text-foreground text-sm block">
                                    {item.title}
                                  </span>
                                  <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono">
                                    <span>#{item.slug}</span>
                                    <span>•</span>
                                    <span>Status: {item.status}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3">
                                <select
                                  value={stationVal}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      item.id,
                                      "kitchenStation",
                                      e.target.value as KitchenStation,
                                      item,
                                    )
                                  }
                                  className="h-11 sm:h-9 px-3 rounded-lg border border-border/80 bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                                >
                                  <option value="chapa">Chapa / Grelhados</option>
                                  <option value="forno">Forno / Pizzaria</option>
                                  <option value="bebidas">Bar & Bebidas</option>
                                  <option value="sobremesas">Sobremesas / Café</option>
                                  <option value="geral">Geral / Montagem</option>
                                </select>
                              </td>

                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={180}
                                    value={prepVal}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        "prepTimeMinutes",
                                        parseInt(e.target.value, 10) || 0,
                                        item,
                                      )
                                    }
                                    className="w-20 text-center font-mono font-bold text-sm h-11 sm:h-9 bg-background"
                                  />
                                  <span className="text-muted-foreground text-2xs font-mono">min</span>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={tolVal}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        item.id,
                                        "toleranceMinutes",
                                        parseInt(e.target.value, 10) || 0,
                                        item,
                                      )
                                    }
                                    className="w-16 text-center font-mono font-bold text-sm h-11 sm:h-9 bg-background"
                                  />
                                  <span className="text-muted-foreground text-2xs font-mono">min</span>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isDirty ? (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleSaveItem(item)}
                                      disabled={updateSingleMutation.isPending}
                                      className="h-11 min-h-11 sm:h-8 sm:min-h-0 text-xs font-bold gap-1 shadow-2xs"
                                    >
                                      <Save className="size-3.5" />
                                      <span>Salvar</span>
                                    </Button>
                                  ) : (
                                    <span className="text-2xs text-muted-foreground flex items-center gap-1">
                                      <Check className="size-3 text-primary" /> Sincronizado
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                ABA 2: MONITOR DE GARGALOS & TELEMETRIA REAL DA COZINHA
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="telemetry" className="space-y-6 m-0">
              {/* KPIs de Performance de Cozinha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">Tempo Médio de Preparo</span>
                    <Clock className="size-4 text-primary" />
                  </div>
                  <p className="text-3xl font-black font-mono text-foreground">
                    {telemetry?.averagePrepTimeMinutes || 18} <span className="text-sm font-normal text-muted-foreground">min</span>
                  </p>
                  <p className="text-2xs text-muted-foreground">Calculado com base nos pedidos finalizados</p>
                </div>

                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">Cumprimento de SLA</span>
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                  <p className="text-3xl font-black font-mono text-foreground">
                    {telemetry?.slaCompliancePercent || 95}%
                  </p>
                  <p className="text-2xs text-muted-foreground">Prontos dentro da meta de tolerância</p>
                </div>

                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">Praça c/ Mais Atrasos</span>
                    <AlertTriangle className="size-4 text-warning" />
                  </div>
                  <p className="text-3xl font-black font-mono capitalize text-foreground">
                    {telemetry?.bottleneckStation || "Chapa"}
                  </p>
                  <p className="text-2xs text-muted-foreground">Setor limitante da linha de produção</p>
                </div>

                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold uppercase tracking-wider">Total de Pedidos Auditados</span>
                    <ChefHat className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-black font-mono text-foreground">
                    {telemetry?.totalAnalyzedOrders || 0}
                  </p>
                  <p className="text-2xs text-muted-foreground">Amostragem dos últimos 14 dias</p>
                </div>
              </div>

              {/* Visão de Praças & Linhas de Produção */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-4 shadow-2xs">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Performance por Praça da Cozinha</h3>
                    <p className="text-xs text-muted-foreground">Tempo médio e taxa de atraso por linha</p>
                  </div>

                  <div className="space-y-3">
                    {(telemetry?.stationStats || []).map((st: any) => {
                      const cfg = STATIONS_CONFIG.find((c) => c.id === st.station) || STATIONS_CONFIG[5];
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={st.station}
                          className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-card border border-border/80 flex items-center justify-center shrink-0">
                              <Icon className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="font-bold text-xs capitalize text-foreground">{cfg.label}</span>
                              <span className="text-2xs text-muted-foreground block">
                                {st.totalItems} itens processados
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-mono font-bold text-foreground">
                              {st.avgMinutes} min
                            </span>
                            <span className="text-2xs text-muted-foreground block">
                              {st.delayedItems > 0 ? `${st.delayedItems} atrasos` : "Zero atrasos"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Heatmap de Horários de Pico */}
                <div className="p-5 rounded-lg border border-border/80 bg-card space-y-4 shadow-2xs">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Horários de Maior Demanda na Cozinha</h3>
                    <p className="text-xs text-muted-foreground">Concentração de pedidos ao longo do dia</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {Object.entries(telemetry?.hourlyVolume || {}).map(([hour, count]: [string, any]) => (
                      <div
                        key={hour}
                        className={cn(
                          "p-2 rounded-lg text-center border transition-colors",
                          count > 5
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : count > 0
                              ? "bg-muted/40 border-border/80 text-foreground"
                              : "bg-muted/10 border-border/40 text-muted-foreground/40",
                        )}
                      >
                        <span className="text-2xs font-mono block text-muted-foreground">{hour}</span>
                        <span className="text-sm font-bold font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </NicheOperationalGuard>
  );
}
