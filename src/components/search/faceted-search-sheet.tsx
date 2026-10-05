"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, Layers, RotateCcw, Check, ArrowDownUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import type { FacetedSearchFacets } from "@/services/faceted-search.functions";

interface FacetedSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  facets: FacetedSearchFacets | null;
  selectedCategories: string[];
  selectedNiches: string[];
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  selectedSort: string;
  totalResultsCount: number;
  onApplyFilters: (filters: {
    categories: string[];
    niches: string[];
    minPrice?: number;
    maxPrice?: number;
    sort: string;
  }) => void;
  onResetFilters: () => void;
}

export function FacetedSearchSheet({
  isOpen,
  onClose,
  facets,
  selectedCategories,
  selectedNiches,
  selectedMinPrice,
  selectedMaxPrice,
  selectedSort,
  totalResultsCount,
  onApplyFilters,
  onResetFilters,
}: FacetedSearchSheetProps) {
  const [categories, setCategories] = useState<string[]>(selectedCategories);
  const [niches, setNiches] = useState<string[]>(selectedNiches);
  const [minPrice, setMinPrice] = useState<string>(
    selectedMinPrice !== undefined ? (selectedMinPrice / 100).toString() : "",
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    selectedMaxPrice !== undefined ? (selectedMaxPrice / 100).toString() : "",
  );
  const [sort, setSort] = useState<string>(selectedSort);

  // Sincronizar quando abrir
  useEffect(() => {
    if (isOpen) {
      setCategories(selectedCategories);
      setNiches(selectedNiches);
      setMinPrice(selectedMinPrice !== undefined ? (selectedMinPrice / 100).toString() : "");
      setMaxPrice(selectedMaxPrice !== undefined ? (selectedMaxPrice / 100).toString() : "");
      setSort(selectedSort);
    }
  }, [isOpen, selectedCategories, selectedNiches, selectedMinPrice, selectedMaxPrice, selectedSort]);

  const toggleCategory = (slug: string) => {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const toggleNiche = (nicheId: string) => {
    setNiches((prev) =>
      prev.includes(nicheId) ? prev.filter((n) => n !== nicheId) : [...prev, nicheId],
    );
  };

  const handleApply = () => {
    const minCents = minPrice ? Math.round(parseFloat(minPrice.replace(",", ".")) * 100) : undefined;
    const maxCents = maxPrice ? Math.round(parseFloat(maxPrice.replace(",", ".")) * 100) : undefined;

    onApplyFilters({
      categories,
      niches,
      minPrice: isNaN(minCents as number) ? undefined : minCents,
      maxPrice: isNaN(maxCents as number) ? undefined : maxCents,
      sort,
    });
    onClose();
  };

  const handleReset = () => {
    setCategories([]);
    setNiches([]);
    setMinPrice("");
    setMaxPrice("");
    setSort("relevance_telemetry");
    onResetFilters();
    onClose();
  };

  const SORT_OPTIONS = [
    { id: "relevance_telemetry", label: "Relevância & Afinidade", isDefault: true },
    { id: "newest", label: "Mais Recentes" },
    { id: "price_asc", label: "Menor Preço" },
    { id: "price_desc", label: "Maior Preço" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        A Bifurcação Perfeita: 
        - Mobile (<640px): side="bottom" (Bottom Sheet com drag bar)
        - Desktop (>=640px): side="right" (Slide-over panel 420px)
      */}
      <SheetContent
        side="bottom"
        className="sm:hidden p-0 max-h-[90dvh] flex flex-col rounded-t-lg border-t border-border bg-background"
      >
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-1 shrink-0" />
        <SheetHeader className="px-5 py-3 border-b border-border/40 shrink-0 text-left">
          <SheetTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Filtros Avançados
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3 mr-1" /> Limpar
            </Button>
          </SheetTitle>
        </SheetHeader>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
          {/* Ordenação */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowDownUp className="size-3.5" /> Ordenar Por
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSort(opt.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="size-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faixa de Preço (R$)
              </Label>
              {facets?.price_range && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatMoney(facets.price_range.min_cents)} - {formatMoney(facets.price_range.max_cents)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Mínimo</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="min-h-11 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Máximo</span>
                <Input
                  type="number"
                  placeholder="Sem limite"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="min-h-11 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Nichos / Verticais */}
          {facets?.niches && facets.niches.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="size-3 text-primary" /> Nichos de Negócio
              </Label>
              <div className="flex flex-wrap gap-2">
                {facets.niches.map((niche) => {
                  const isSelected = niches.includes(niche.id);
                  return (
                    <button
                      key={niche.id}
                      type="button"
                      onClick={() => toggleNiche(niche.id)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{niche.label}</span>
                      <Badge
                        variant={isSelected ? "secondary" : "outline"}
                        className="text-[10px] px-1 py-0 h-4 rounded-md"
                      >
                        {niche.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorias */}
          {facets?.categories && facets.categories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categorias
              </Label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
                {facets.categories.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="text-[10px] opacity-70">({cat.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Zona do Polegar Fixa (Apple HIG) */}
        <div className="p-4 border-t border-border/50 bg-background/95 backdrop-blur-sm shrink-0">
          <Button
            onClick={handleApply}
            className="w-full min-h-11 rounded-lg text-sm font-bold shadow-xs cursor-pointer"
          >
            Aplicar Filtros {totalResultsCount > 0 ? `(${totalResultsCount} itens)` : ""}
          </Button>
        </div>
      </SheetContent>

      {/* Desktop Sheet (Slide-over Direito) */}
      <SheetContent
        side="right"
        className="hidden sm:flex sm:flex-col sm:w-[420px] p-0 border-l border-border bg-background"
      >
        <SheetHeader className="p-6 border-b border-border/40 shrink-0 text-left">
          <SheetTitle className="text-lg font-bold flex items-center justify-between">
            <span className="flex items-center gap-3">
              <SlidersHorizontal className="size-5 text-primary" />
              Filtros Avançados
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3 mr-1" /> Limpar
            </Button>
          </SheetTitle>
        </SheetHeader>

        {/* Conteúdo Desktop com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ordenação */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowDownUp className="size-3.5" /> Ordenar Resultados
            </Label>
            <div className="space-y-2">
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSort(opt.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faixa de Preço (R$)
              </Label>
              {facets?.price_range && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatMoney(facets.price_range.min_cents)} - {formatMoney(facets.price_range.max_cents)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Mínimo</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="rounded-lg text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Máximo</span>
                <Input
                  type="number"
                  placeholder="Sem limite"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Nichos / Verticais */}
          {facets?.niches && facets.niches.length > 0 && (
            <div className="space-y-3 border-t border-border/40 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="size-3 text-primary" /> Nichos de Negócio
              </Label>
              <div className="flex flex-wrap gap-2">
                {facets.niches.map((niche) => {
                  const isSelected = niches.includes(niche.id);
                  return (
                    <button
                      key={niche.id}
                      type="button"
                      onClick={() => toggleNiche(niche.id)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{niche.label}</span>
                      <Badge
                        variant={isSelected ? "secondary" : "outline"}
                        className="text-[10px] px-1 py-0 h-4 rounded-md"
                      >
                        {niche.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorias */}
          {facets?.categories && facets.categories.length > 0 && (
            <div className="space-y-3 border-t border-border/40 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categorias
              </Label>
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto no-scrollbar p-1">
                {facets.categories.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className="text-[10px] opacity-70">({cat.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Desktop */}
        <div className="p-6 border-t border-border/40 bg-muted/20 shrink-0 flex gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-lg flex-1 text-xs">
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            className="rounded-lg flex-1 text-xs font-bold shadow-xs cursor-pointer"
          >
            Aplicar Filtros {totalResultsCount > 0 ? `(${totalResultsCount})` : ""}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
