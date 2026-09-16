import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Car,
  Bike,
  Boxes,
  Zap,
  Save,
  Loader2,
  Calculator,
  Gauge,
  DollarSign,
  Coins,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  listLogisticsPriceTables,
  saveLogisticsPriceTable,
} from "@/services/mobility.functions";
import { playCashRegisterSound } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/logistica/tabelas")({
  head: () => ({
    meta: [{ title: "Tabelas de Preço & Tarifas por KM | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const res = await listLogisticsPriceTables();
      return res || [];
    } catch {
      return [];
    }
  },
  component: WorkspaceLogisticsPriceTablesPage,
});

interface PriceTableItem {
  id?: string;
  service_type: any;
  name: string;
  base_fee_cents: number;
  km_rate_cents: number;
  min_fare_cents: number;
  helper_fee_cents: number;
  is_active: boolean;
}

const DEFAULT_TABLES: PriceTableItem[] = [
  {
    service_type: "delivery_express",
    name: "Entrega Expressa (Moto / Flash)",
    base_fee_cents: 500,
    km_rate_cents: 220,
    min_fare_cents: 900,
    helper_fee_cents: 0,
    is_active: true,
  },
  {
    service_type: "ride_car",
    name: "Carro Convencional (Sedan / Hatch)",
    base_fee_cents: 800,
    km_rate_cents: 290,
    min_fare_cents: 1400,
    helper_fee_cents: 0,
    is_active: true,
  },
  {
    service_type: "freight_van",
    name: "Fiorino / Utilitário Médio",
    base_fee_cents: 3500,
    km_rate_cents: 450,
    min_fare_cents: 5500,
    helper_fee_cents: 4000,
    is_active: true,
  },
  {
    service_type: "moving_truck",
    name: "Caminhão Baú (Fretes & Mudanças)",
    base_fee_cents: 9000,
    km_rate_cents: 750,
    min_fare_cents: 14000,
    helper_fee_cents: 8000,
    is_active: true,
  },
];

function WorkspaceLogisticsPriceTablesPage() {
  const loadedTables = Route.useLoaderData();
  const router = useRouter();

  const [tables, setTables] = useState<PriceTableItem[]>(() => {
    if (loadedTables && loadedTables.length > 0) {
      return loadedTables;
    }
    return DEFAULT_TABLES;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Simulador de Frete
  const [simKm, setSimKm] = useState<number>(8);
  const [simIncludeHelper, setSimIncludeHelper] = useState<boolean>(false);

  useEffect(() => {
    if (loadedTables && loadedTables.length > 0) {
      setTables(loadedTables);
    }
  }, [loadedTables]);

  const handleUpdate = (serviceType: string, field: keyof PriceTableItem, value: any) => {
    setTables((prev) =>
      prev.map((t) => (t.service_type === serviceType ? { ...t, [field]: value } : t)),
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const table of tables) {
        await saveLogisticsPriceTable({
          data: {
            id: table.id,
            name: table.name,
            service_type: table.service_type,
            base_fee_cents: table.base_fee_cents || 0,
            km_rate_cents: table.km_rate_cents || 0,
            min_fare_cents: table.min_fare_cents || 0,
            helper_fee_cents: table.helper_fee_cents || 0,
            is_active: table.is_active ?? true,
          },
        });
      }
      playCashRegisterSound();
      toast.success("Tabelas de frete e tarifas por KM salvas com sucesso no banco!");
      await router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar tabelas de preço.");
    } finally {
      setIsSaving(false);
    }
  };

  // KPIs calculados
  const kpis = useMemo(() => {
    const activeTables = tables.filter((t) => t.is_active);
    const count = activeTables.length;
    if (count === 0) {
      return {
        activeCount: 0,
        avgBaseFee: 0,
        avgKmRate: 0,
        avgMinFare: 0,
      };
    }

    const sumBase = activeTables.reduce((acc, t) => acc + (t.base_fee_cents || 0), 0);
    const sumKm = activeTables.reduce((acc, t) => acc + (t.km_rate_cents || 0), 0);
    const sumMin = activeTables.reduce((acc, t) => acc + (t.min_fare_cents || 0), 0);

    return {
      activeCount: count,
      avgBaseFee: Math.round(sumBase / count),
      avgKmRate: Math.round(sumKm / count),
      avgMinFare: Math.round(sumMin / count),
    };
  }, [tables]);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── HEADER DA PÁGINA ── */}
      <PageHeader
        eyebrow="Logística & Mobilidade"
        title="Tabelas de Preço & Tarifas por KM"
        description="Configure as taxas de partida, valor quilométrico e piso mínimo para cálculo automático de fretes e entregadores."
        actions={
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            size="sm"
            className="font-bold text-xs bg-primary text-primary-foreground gap-2 rounded-xl h-10 px-4 cursor-pointer shadow-2xs"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isSaving ? "Salvando no Banco..." : "Salvar Alterações"}</span>
          </Button>
        }
      />

      {/* ── 4 KPIS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="size-3.5 text-primary" />
            Modais Ativos
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.activeCount} <span className="text-xs font-normal text-muted-foreground">de {tables.length}</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Habilitados para cálculo
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="size-3.5 text-emerald-600" />
            Tarifa Base Média
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(kpis.avgBaseFee)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Taxa de saída média
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="size-3.5 text-blue-600" />
            Valor Médio por KM
          </span>
          <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {formatMoney(kpis.avgKmRate)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Por quilômetro rodado
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-foreground" />
            Piso Mínimo Médio
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.avgMinFare)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Corrida mínima garantida
          </p>
        </div>
      </div>

      {/* ── SIMULADOR DINÂMICO COMPARATIVO DE ROTAS ── */}
      <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calculator className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Simulador Comparativo de Frete</h3>
              <p className="text-xs text-muted-foreground">Teste na hora como o cliente ou entregador verá o valor cobrado.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sim-km" className="text-xs font-bold text-muted-foreground">Distância:</Label>
              <Input
                id="sim-km"
                type="number"
                min={1}
                max={500}
                value={simKm}
                onChange={(e) => setSimKm(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-9 font-mono font-bold text-xs rounded-xl text-center"
              />
              <span className="text-xs font-mono text-muted-foreground">km</span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
              <input
                type="checkbox"
                checked={simIncludeHelper}
                onChange={(e) => setSimIncludeHelper(e.target.checked)}
                className="rounded border-border text-primary size-4"
              />
              <span>Com Ajudante</span>
            </label>
          </div>
        </div>

        {/* Resultados da simulação por modal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tables.map((table) => {
            const calculatedLinear =
              table.base_fee_cents +
              (table.km_rate_cents * simKm) +
              (simIncludeHelper ? table.helper_fee_cents : 0);
            const finalFee = Math.max(table.min_fare_cents, calculatedLinear);
            const appliedMinFare = table.min_fare_cents > calculatedLinear;

            return (
              <div
                key={`sim-${table.service_type}`}
                className={`p-3.5 rounded-xl border transition-all ${
                  table.is_active
                    ? "bg-background border-border/80"
                    : "bg-muted/10 border-border/40 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-1.5">
                  <span className="font-bold truncate text-foreground">{table.name.split("(")[0]}</span>
                  {table.is_active ? (
                    <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                </div>

                <div className="text-lg font-mono font-bold text-foreground">
                  {formatMoney(finalFee)}
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                  <span>{simKm} km {simIncludeHelper && "+ Ajudante"}</span>
                  {appliedMinFare && (
                    <span className="text-amber-600 font-bold">(Piso Mínimo)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GRID DE CONFIGURAÇÃO DOS MODAIS E TARIFAS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tables.map((table: PriceTableItem) => (
          <div
            key={table.service_type}
            className="rounded-2xl bg-card p-6 border border-border/70 space-y-5 shadow-2xs transition-all"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {table.service_type === "moving_truck" ? (
                    <Boxes className="size-5" />
                  ) : table.service_type === "freight_van" ? (
                    <Truck className="size-5" />
                  ) : table.service_type === "ride_car" ? (
                    <Car className="size-5" />
                  ) : (
                    <Zap className="size-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">{table.name}</h3>
                  <Badge variant="outline" className="text-[9px] uppercase font-mono mt-0.5">
                    {table.service_type}
                  </Badge>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none bg-muted/30 px-2.5 py-1 rounded-xl border border-border/60">
                <input
                  type="checkbox"
                  checked={table.is_active}
                  onChange={(e) => handleUpdate(table.service_type, "is_active", e.target.checked)}
                  className="rounded border-border text-primary size-4 cursor-pointer"
                />
                <span className={table.is_active ? "text-foreground font-bold" : "text-muted-foreground"}>
                  {table.is_active ? "Ativo" : "Inativo"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Tarifa de Saída (Base)</Label>
                <CurrencyField
                  value={table.base_fee_cents}
                  onChange={(cents) => handleUpdate(table.service_type, "base_fee_cents", cents || 0)}
                  placeholder="0,00"
                  className="h-10 text-sm font-mono rounded-xl bg-background border-border/80"
                />
                <p className="text-[10px] text-muted-foreground">Valor fixo de partida</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Valor por KM Rodado</Label>
                <CurrencyField
                  value={table.km_rate_cents}
                  onChange={(cents) => handleUpdate(table.service_type, "km_rate_cents", cents || 0)}
                  placeholder="0,00"
                  className="h-10 text-sm font-mono rounded-xl bg-background border-border/80"
                />
                <p className="text-[10px] text-muted-foreground">Adicional por KM linear</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Corrida Mínima</Label>
                <CurrencyField
                  value={table.min_fare_cents}
                  onChange={(cents) => handleUpdate(table.service_type, "min_fare_cents", cents || 0)}
                  placeholder="0,00"
                  className="h-10 text-sm font-mono rounded-xl bg-background border-border/80"
                />
                <p className="text-[10px] text-muted-foreground">Piso mínimo cobrado</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">Taxa de Ajudante / Carga</Label>
                <CurrencyField
                  value={table.helper_fee_cents}
                  onChange={(cents) => handleUpdate(table.service_type, "helper_fee_cents", cents || 0)}
                  placeholder="0,00"
                  className="h-10 text-sm font-mono rounded-xl bg-background border-border/80"
                />
                <p className="text-[10px] text-muted-foreground">Mão de obra extra</p>
              </div>
            </div>

            {/* Estimativa de Referência (5 km) */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground font-medium">Estimativa para 5 km:</span>
                <p className="font-bold text-foreground font-mono">
                  {formatMoney(
                    Math.max(
                      table.min_fare_cents,
                      table.base_fee_cents + (table.km_rate_cents * 5),
                    )
                  )}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                Cálculo em tempo real
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
