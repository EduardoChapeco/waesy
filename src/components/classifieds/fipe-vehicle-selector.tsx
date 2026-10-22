import React, { useState, useEffect, useMemo } from "react";
import { Search, Car, Check, RefreshCw, BadgePercent, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CANONICAL_VEHICLE_BRANDS } from "@/lib/classifieds/canonical-taxonomy";
import {
  searchFipeCachedVehicles,
  cacheFipeVehicle,
  type FipeVehicleQuoteDTO,
} from "@/services/fipe.functions";
import { formatMoney } from "@/lib/money";

export interface FipeVehicleSelectorProps {
  currentBrand: string;
  currentModel: string;
  currentYearModel: string;
  currentFuel: string;
  currentPriceCents?: number;
  initialFipeCode?: string;
  initialFipePriceCents?: number;
  onSelectVehicle: (data: {
    brand: string;
    model: string;
    yearModel: string;
    fuel: string;
    fipeCode?: string;
    fipePriceCents?: number;
    referenceMonth?: string;
    fipeDeltaPercent?: number;
  }) => void;
  className?: string;
}

export function FipeVehicleSelector({
  currentBrand,
  currentModel,
  currentYearModel,
  currentFuel,
  currentPriceCents = 0,
  initialFipeCode = "",
  initialFipePriceCents = 0,
  onSelectVehicle,
  className,
}: FipeVehicleSelectorProps) {
  const [fipeSearchQuery, setFipeSearchQuery] = useState("");
  const [fipeResults, setFipeResults] = useState<FipeVehicleQuoteDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFipe, setSelectedFipe] = useState<FipeVehicleQuoteDTO | null>(null);
  const [manualFipePriceCents, setManualFipePriceCents] = useState<number>(initialFipePriceCents);
  const [manualFipeCode, setManualFipeCode] = useState<string>(initialFipeCode);
  const [isFipeModalOpen, setIsFipeModalOpen] = useState(false);

  // Modelos populares da marca ativa
  const popularModels = useMemo(() => {
    if (!currentBrand) return [];
    const found = CANONICAL_VEHICLE_BRANDS.find(
      (b) => b.brand.toLowerCase() === currentBrand.trim().toLowerCase()
    );
    return found ? found.popularModels : [];
  }, [currentBrand]);

  // Busca na base FIPE com debounce
  useEffect(() => {
    if (!fipeSearchQuery || fipeSearchQuery.trim().length < 2) {
      setFipeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFipeCachedVehicles({
          data: { query: fipeSearchQuery.trim(), limit: 12 },
        });
        setFipeResults(results);
      } catch (err) {
        console.warn("[FipeVehicleSelector] Falha ao consultar FIPE:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [fipeSearchQuery]);

  // Cálculo da variação percentual
  const activeFipePrice = selectedFipe ? selectedFipe.priceCents : manualFipePriceCents;
  const deltaPercent = useMemo(() => {
    if (!activeFipePrice || activeFipePrice <= 0 || !currentPriceCents || currentPriceCents <= 0) {
      return null;
    }
    const diff = currentPriceCents - activeFipePrice;
    return Number(((diff / activeFipePrice) * 100).toFixed(1));
  }, [activeFipePrice, currentPriceCents]);

  const handleSelectFipeEntry = (item: FipeVehicleQuoteDTO) => {
    setSelectedFipe(item);
    setManualFipePriceCents(item.priceCents);
    setManualFipeCode(item.fipeCode);
    setIsFipeModalOpen(false);

    let calculatedDelta: number | undefined = undefined;
    if (currentPriceCents > 0 && item.priceCents > 0) {
      calculatedDelta = Number((((currentPriceCents - item.priceCents) / item.priceCents) * 100).toFixed(1));
    }

    onSelectVehicle({
      brand: item.brand,
      model: item.model,
      yearModel: String(item.modelYear),
      fuel: item.fuelType || currentFuel,
      fipeCode: item.fipeCode,
      fipePriceCents: item.priceCents,
      referenceMonth: item.referenceMonth,
      fipeDeltaPercent: calculatedDelta,
    });
  };

  const handleApplyManualFipe = async () => {
    if (!manualFipePriceCents || manualFipePriceCents <= 0) return;

    let calculatedDelta: number | undefined = undefined;
    if (currentPriceCents > 0) {
      calculatedDelta = Number((((currentPriceCents - manualFipePriceCents) / manualFipePriceCents) * 100).toFixed(1));
    }

    const currentYearNum = parseInt(currentYearModel, 10) || new Date().getFullYear();

    // Cache no banco se preenchido
    if (manualFipeCode && currentBrand && currentModel) {
      try {
        await cacheFipeVehicle({
          data: {
            fipeCode: manualFipeCode,
            brand: currentBrand,
            model: currentModel,
            modelYear: currentYearNum,
            fuelType: currentFuel || "Flex",
            priceCents: manualFipePriceCents,
          },
        });
      } catch (e) {
        console.warn("[FipeVehicleSelector] Aviso ao sincronizar cache FIPE:", e);
      }
    }

    onSelectVehicle({
      brand: currentBrand,
      model: currentModel,
      yearModel: currentYearModel,
      fuel: currentFuel,
      fipeCode: manualFipeCode,
      fipePriceCents: manualFipePriceCents,
      fipeDeltaPercent: calculatedDelta,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Sugestões de Modelos Populares para clique rápido no mobile */}
      {popularModels.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Modelos frequentes da {currentBrand}</span>
            <span className="text-xs opacity-75">Toque para selecionar</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {popularModels.map((m) => {
              const isSelected = currentModel.toLowerCase() === m.toLowerCase();
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onSelectVehicle({
                      brand: currentBrand,
                      model: m,
                      yearModel: currentYearModel,
                      fuel: currentFuel,
                      fipePriceCents: activeFipePrice,
                      fipeCode: manualFipeCode,
                    });
                  }}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-border/70 text-foreground hover:bg-muted"
                  )}
                >
                  {isSelected && <Check className="size-3.5" />}
                  <span>{m}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Squircle de Integração Tabela FIPE */}
      <div className="rounded-lg border border-border/70 bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BadgePercent className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Referência Oficial Tabela FIPE</h4>
              <p className="text-xs text-muted-foreground">
                Destaque a transparência de preço do seu veículo para compradores
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-lg text-xs font-semibold px-4 border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            onClick={() => setIsFipeModalOpen(!isFipeModalOpen)}
          >
            <Search className="size-4 mr-2" />
            <span>{isFipeModalOpen ? "Fechar Consulta" : "Buscar na FIPE"}</span>
          </Button>
        </div>

        {/* Painel de busca na base FIPE */}
        {isFipeModalOpen && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={fipeSearchQuery}
                onChange={(e) => setFipeSearchQuery(e.target.value)}
                placeholder="Ex: Corolla XEi, Civic EXL, Gol 1.0..."
                className="h-11 min-h-11 pl-10 rounded-lg text-xs bg-background border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin motion-reduce:animate-none text-muted-foreground" />
              )}
            </div>

            {fipeResults.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fipeResults.map((item) => (
                  <button
                    key={`${item.fipeCode}-${item.modelYear}`}
                    type="button"
                    onClick={() => handleSelectFipeEntry(item)}
                    className="w-full text-left p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {item.brand} {item.model}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Ano {item.modelYear}</span>
                        <span>•</span>
                        <span>{item.fuelType}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{item.fipeCode}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground">
                        {formatMoney(item.priceCents)}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.referenceMonth}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {fipeSearchQuery.length >= 2 && !isSearching && fipeResults.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum veículo com essa descrição encontrado no cache local.
              </div>
            )}
          </div>
        )}

        {/* Dados da cotação FIPE ativa & comparativo de preço */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Valor de Referência FIPE (R$)</Label>
            <div className="relative">
              <Input
                type="number"
                step="100"
                value={manualFipePriceCents > 0 ? (manualFipePriceCents / 100).toFixed(0) : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualFipePriceCents(Math.round(val * 100));
                }}
                onBlur={handleApplyManualFipe}
                placeholder="Ex: 85000"
                className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Código FIPE (Opcional)</Label>
            <Input
              value={manualFipeCode}
              onChange={(e) => setManualFipeCode(e.target.value)}
              onBlur={handleApplyManualFipe}
              placeholder="Ex: 002134-2"
              className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Feedback visual de Variação contra a FIPE */}
        {activeFipePrice > 0 && currentPriceCents > 0 && deltaPercent !== null && (
          <div
            className={cn(
              "rounded-lg p-3 border flex items-center justify-between gap-3 text-xs transition-colors",
              deltaPercent < 0
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                : deltaPercent === 0
                ? "bg-primary/10 border-primary/25 text-primary"
                : "bg-muted/40 border-border text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              {deltaPercent < 0 ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span className="font-semibold">
                {deltaPercent < 0
                  ? `${Math.abs(deltaPercent)}% abaixo da Tabela FIPE (Excelente Oportunidade)`
                  : deltaPercent === 0
                  ? "Preço exatamente alinhado com a Tabela FIPE"
                  : `${deltaPercent}% acima da Tabela FIPE`}
              </span>
            </div>
            <span className="font-mono font-bold shrink-0">{formatMoney(activeFipePrice)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
