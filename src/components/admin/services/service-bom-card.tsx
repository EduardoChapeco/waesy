import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Calculator, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { listRecipes, listSupplies } from "@/services/gastronomy-supplies.functions";

export interface ServiceMaterialItem {
  id: string;
  productId?: string;
  supplyId?: string;
  recipeId?: string;
  title: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
}

interface ServiceBomCardProps {
  items: ServiceMaterialItem[];
  servicePriceCents: number;
  onChange: (items: ServiceMaterialItem[]) => void;
  onApplyCostCents?: (totalCostCents: number) => void;
}

export function ServiceBomCard({
  items,
  servicePriceCents,
  onChange,
  onApplyCostCents,
}: ServiceBomCardProps) {
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unit, setUnit] = useState<string>("un");

  const { data: storeSupplies = [], isLoading: isLoadingSupplies } = useQuery({
    queryKey: ["store-supplies-active"],
    queryFn: () => listSupplies({}),
  });

  const { data: storeRecipes = [], isLoading: isLoadingRecipes } = useQuery({
    queryKey: ["store-recipes-sub"],
    queryFn: () => listRecipes({ data: { type: "sub_recipe" } } as any),
  });

  if (isLoadingSupplies || isLoadingRecipes) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  const totalCostCents = useMemo(
    () => items.reduce((acc, item) => acc + Math.round(item.quantity * item.unitCostCents), 0),
    [items],
  );

  const maxServicesProducible = useMemo(() => {
    if (items.length === 0 || !Array.isArray(storeSupplies) || storeSupplies.length === 0) {
      return null;
    }
    let minExecutions = Infinity;
    for (const item of items) {
      if (item.supplyId) {
        const sup = (storeSupplies as any[]).find((s: any) => s.id === item.supplyId);
        if (sup) {
          const stock = Number(sup.stock_on_hand || 0);
          const needed = Math.max(0.0001, Number(item.quantity || 1));
          minExecutions = Math.min(minExecutions, Math.floor(stock / needed));
        }
      }
    }
    return minExecutions === Infinity ? null : minExecutions;
  }, [items, storeSupplies]);

  const handleAdd = () => {
    if (!selectedCatalogKey) {
      toast.error("Selecione um insumo ou kit técnico do almoxarifado.");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    if (selectedCatalogKey.startsWith("supply:")) {
      const id = selectedCatalogKey.replace("supply:", "");
      const sup = (storeSupplies as any[]).find((s: any) => s.id === id);
      if (!sup) return;
      const next: ServiceMaterialItem = {
        id: Math.random().toString(36).slice(2, 9),
        supplyId: sup.id,
        title: sup.name,
        quantity: qty,
        unit: sup.unit || unit,
        unitCostCents: Number(sup.cost_cents_per_unit || 0),
      };
      onChange([...items, next]);
    } else if (selectedCatalogKey.startsWith("recipe:")) {
      const id = selectedCatalogKey.replace("recipe:", "");
      const rec = (storeRecipes as any[]).find((r: any) => r.id === id);
      if (!rec) return;
      const next: ServiceMaterialItem = {
        id: Math.random().toString(36).slice(2, 9),
        recipeId: rec.id,
        title: `[Kit/Mistura] ${rec.name}`,
        quantity: qty,
        unit: rec.yield_unit || unit,
        unitCostCents: Number(rec.cost_cents_per_yield_unit || 0),
      };
      onChange([...items, next]);
    }

    setSelectedCatalogKey("");
    setQuantity("1");
  };

  return (
    <div className="p-4 rounded-lg border border-border/80 bg-muted/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Boxes className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Ficha Técnica de Insumos & Kits do Procedimento
            </h4>
            {maxServicesProducible !== null && (
              <Badge variant="outline" className="text-2xs font-mono">
                Capacidade: {maxServicesProducible} atendimentos
              </Badge>
            )}
          </div>
          <p className="text-2xs text-muted-foreground">
            Vincule químicos, descartáveis ou kits compostos que serão baixados automaticamente ao concluir o agendamento.
          </p>
        </div>

        {onApplyCostCents && totalCostCents > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onApplyCostCents(totalCostCents)}
            className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-2xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Calculator className="size-3.5 text-primary" />
            <span>Aplicar Custo ({formatMoney(totalCostCents)})</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-7 space-y-1">
          <Label className="text-2xs font-semibold">Insumo ou Kit do Almoxarifado</Label>
          <Select value={selectedCatalogKey} onValueChange={setSelectedCatalogKey}>
            <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg bg-background">
              <SelectValue placeholder="Escolha insumo químico, peça ou kit..." />
            </SelectTrigger>
            <SelectContent className="rounded-lg max-h-60">
              {(storeSupplies as any[]).map((s: any) => (
                <SelectItem key={`srv-sup-${s.id}`} value={`supply:${s.id}`} className="text-xs">
                  {s.name} ({s.stock_on_hand} {s.unit} • {formatMoney(s.cost_cents_per_unit)}/{s.unit})
                </SelectItem>
              ))}
              {(storeRecipes as any[]).map((r: any) => (
                <SelectItem key={`srv-rec-${r.id}`} value={`recipe:${r.id}`} className="text-xs">
                  [Kit/Mistura] {r.name} ({formatMoney(r.cost_cents_per_yield_unit)}/{r.yield_unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-3 space-y-1">
          <Label className="text-2xs font-semibold">Qtd por Sessão</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-11 min-h-11 text-xs rounded-lg font-mono bg-background"
          />
        </div>

        <div className="sm:col-span-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAdd}
            className="w-full h-11 min-h-11 text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            <span>Incluir</span>
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border border-border/70 bg-card divide-y divide-border/50">
          {items.map((item) => {
            const lineCost = Math.round(item.quantity * item.unitCostCents);
            return (
              <div key={item.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <span className="text-2xs font-mono text-muted-foreground ml-2">
                    {item.quantity} {item.unit} × {formatMoney(item.unitCostCents)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{formatMoney(lineCost)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                    className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="p-3 bg-muted/20 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">
              CMV Insumos: <strong className="text-foreground">{formatMoney(totalCostCents)}</strong>
            </span>
            <span className="text-muted-foreground">
              Margem Líquida:{" "}
              <strong className="text-foreground">
                {formatMoney(Math.max(0, servicePriceCents - totalCostCents))}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
