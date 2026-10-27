/**
 * ============================================================================
 * Waesy Platform — SupermarketCatalogGrid.tsx ("O Super" & Apple HIG Parity)
 * ============================================================================
 * Grade de catálogo de supermercado especializada:
 * - Layout anti-jank mobile 2 colunas com aspect-ratio fixo (CLS < 0.01).
 * - Gatilho de leitor de código de barras (Barcode / EAN-13) no cabeçalho de busca.
 * - Régua de corredores e gôndolas com pílulas táteis (h-11 min-h-11).
 * - Steppers de quantidade diretos no card com alvos de toque canônicos de 44px.
 * Ref: unnamed (10).webp, unnamed (11).webp, unnamed (14).webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Barcode,
  Search,
  SlidersHorizontal,
  Store,
  Sparkles,
  ShoppingBag,
  Camera,
  X,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GroceryProductCard } from "@/components/commerce/grocery-product-card";
import type { ProductCardDTO } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SupermarketCatalogGridProps {
  products: ProductCardDTO[];
  departments?: { id: string; label: string; badge?: string }[];
  activeDepartment?: string;
  onSelectDepartment?: (deptId: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedStore?: string;
  availableStores?: string[];
  onSelectStore?: (store: string) => void;
  className?: string;
}

export function SupermarketCatalogGrid({
  products,
  departments = [],
  activeDepartment = "todos",
  onSelectDepartment,
  searchQuery = "",
  onSearchChange,
  selectedStore = "todos",
  availableStores = [],
  onSelectStore,
  className,
}: SupermarketCatalogGridProps) {
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [manualEan, setManualEan] = useState("");

  const handleScanSimulate = (ean: string) => {
    setIsBarcodeScannerOpen(false);
    onSearchChange?.(ean);
    toast.success(`Código de barras escaneado: ${ean}`);
  };

  const handleManualEanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEan.trim()) return;
    handleScanSimulate(manualEan.trim());
    setManualEan("");
  };

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)}>
      {/* ── 1. Barra de Busca com Botão Leitor de Código de Barras ("O Super" Parity) ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nome, marca ou código de barras..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-11 pr-4 h-11 min-h-11 rounded-2xl bg-card border-border/80 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {/* Botão Scanner Barcode / EAN-13 */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsBarcodeScannerOpen(true)}
          className="size-11 min-h-11 min-w-11 rounded-2xl border-border/80 p-0 flex items-center justify-center shrink-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
          title="Escanear Código de Barras"
          aria-label="Escanear Código de Barras"
        >
          <Barcode className="size-5 text-primary" />
        </Button>
      </div>

      {/* ── 2. Régua de Corredores e Departamentos (Scroll Horizontal com Alvo de 44px) ── */}
      {departments.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {departments.map((dept) => {
            const isSelected = dept.id === activeDepartment;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => onSelectDepartment?.(dept.id)}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isSelected
                    ? "bg-foreground text-background shadow-xs scale-102 font-bold"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{dept.label}</span>
                {dept.badge && (
                  <span
                    className={cn(
                      "text-3xs px-1.5 py-0.5 rounded-full font-bold",
                      isSelected ? "bg-background/20 text-background" : "bg-primary/10 text-primary"
                    )}
                  >
                    {dept.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. Seletor de Redes e Supermercados Parceiros ── */}
      {availableStores.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
            Rede:
          </span>
          <button
            type="button"
            onClick={() => onSelectStore?.("todos")}
            className={cn(
              "h-11 min-h-11 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              selectedStore === "todos"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            Todas as Redes
          </button>
          {availableStores.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onSelectStore?.(st)}
              className={cn(
                "h-11 min-h-11 px-3.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                selectedStore === st
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Store className="size-3.5" />
              <span>{st}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 4. Grade de Produtos 2 Colunas no Mobile com Aspect-Ratio Fixo Anti-Jank ── */}
      {products.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-muted/10 rounded-2xl p-6 border border-border/40">
          <ShoppingBag className="size-10 text-muted-foreground/50 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">Nenhum produto encontrado neste corredor</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente buscar por outro termo ou selecione todos os supermercados parceiros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((prod) => (
            <div key={prod.id} className="min-w-0">
              <GroceryProductCard product={prod} viewMode="grid" />
            </div>
          ))}
        </div>
      )}

      {/* ── 5. Modal de Leitor de Código de Barras (Barcode Scanner) ── */}
      <Sheet open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
        <SheetContent
          side="bottom"
          className="w-full max-w-md mx-auto rounded-t-2xl sm:rounded-2xl p-5 bg-card border-border/80 shadow-xl"
        >
          <SheetHeader className="pb-3 border-b border-border/40 text-left">
            <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Barcode className="size-5 text-primary" />
              <span>Scanner de Código de Barras</span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pt-3">
            {/* Visual da Câmera / Mira do Scanner */}
            <div className="relative aspect-video rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center overflow-hidden text-center p-4">
              {/* Linha vermelha de leitura laser */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />

              <div className="relative z-10 space-y-2">
                <Camera className="size-8 text-zinc-400 mx-auto opacity-70" />
                <span className="text-xs font-semibold text-zinc-200 block">
                  Aponte a câmera para o código de barras EAN-13
                </span>
                <span className="text-3xs text-zinc-500">
                  Compatível com produtos cadastrados nos supermercados locais
                </span>
              </div>
            </div>

            {/* Digitação Manual do Código EAN */}
            <form onSubmit={handleManualEanSubmit} className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Ou digite os números do código de barras
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 7891000100103"
                  value={manualEan}
                  onChange={(e) => setManualEan(e.target.value)}
                  className="h-11 min-h-11 rounded-xl bg-background border-border/80 font-mono text-sm focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button
                  type="submit"
                  className="h-11 min-h-11 px-4 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Buscar
                </Button>
              </div>
            </form>

            {/* Exemplos Rápidos de Demonstração */}
            <div className="pt-2 border-t border-border/40">
              <span className="text-2xs text-muted-foreground block mb-2 font-medium">
                Simulações rápidas de leitura:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {["Arroz", "Café", "Azeite", "Leite"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleScanSimulate(item)}
                    className="h-11 min-h-11 px-3 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground border border-border/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Escanear {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
