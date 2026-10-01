import React, { useState } from "react";
import { Layers, Plus, Trash2, Calendar, MapPin, Users, Box, Tag, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyField } from "@/components/ui/currency-field";
import type { UnifiedNiche } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export interface UnifiedVariantItem {
  id: string;
  title: string;
  sku?: string;
  price_override_cents?: number | null;
  stock_quantity: number;
  attributes: Record<string, string>;
}

export interface UnifiedDepartureItem {
  id: string;
  date_start: string;
  date_end?: string;
  boarding_location: string;
  room_type: "individual" | "duplo" | "triplo" | "quadruplo";
  available_spots: number;
  price_cents: number;
}

export interface ListingVariantsSectionProps {
  niche: UnifiedNiche;
  basePriceCents: number;
  variants: UnifiedVariantItem[];
  onChangeVariants: (variants: UnifiedVariantItem[]) => void;
  departures?: UnifiedDepartureItem[];
  onChangeDepartures?: (departures: UnifiedDepartureItem[]) => void;
  className?: string;
}

export function ListingVariantsSection({
  niche,
  basePriceCents,
  variants,
  onChangeVariants,
  departures = [],
  onChangeDepartures,
  className,
}: ListingVariantsSectionProps) {
  const isTourism = niche === "tourism";

  // State for product variant attribute builder
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  // Tourism Departure addition
  const handleAddDeparture = () => {
    if (!onChangeDepartures) return;
    const newDep: UnifiedDepartureItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date_start: "",
      date_end: "",
      boarding_location: "Embarque Central",
      room_type: "duplo",
      available_spots: 20,
      price_cents: basePriceCents,
    };
    onChangeDepartures([...departures, newDep]);
  };

  const handleUpdateDeparture = (index: number, patch: Partial<UnifiedDepartureItem>) => {
    if (!onChangeDepartures) return;
    const updated = departures.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onChangeDepartures(updated);
  };

  const handleRemoveDeparture = (index: number) => {
    if (!onChangeDepartures) return;
    onChangeDepartures(departures.filter((_, i) => i !== index));
  };

  // Product Variant addition
  const handleAddVariant = () => {
    const newVariant: UnifiedVariantItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: `Variação ${variants.length + 1}`,
      sku: "",
      price_override_cents: null,
      stock_quantity: 10,
      attributes: {},
    };
    onChangeVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, patch: Partial<UnifiedVariantItem>) => {
    const updated = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChangeVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    onChangeVariants(variants.filter((_, i) => i !== index));
  };

  if (isTourism) {
    return (
      <div className={cn("bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>Datas de Saída & Acomodações de Viagem</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDeparture}
            className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Adicionar Saída</span>
          </Button>
        </div>

        {departures.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
            <Calendar className="size-8 text-muted-foreground mx-auto" />
            <p className="text-xs font-semibold text-foreground">Nenhuma saída ou pacote cadastrado</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Adicione datas e pontos de embarque para que os viajantes reservem suas vagas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {departures.map((dep, idx) => (
              <div
                key={dep.id}
                className="p-4 rounded-xl border border-border/60 bg-background/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end"
              >
                <div className="space-y-1">
                  <Label className="text-2xs font-medium text-foreground">Data de Início</Label>
                  <Input
                    type="date"
                    value={dep.date_start}
                    onChange={(e) => handleUpdateDeparture(idx, { date_start: e.target.value })}
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-medium text-foreground">Ponto de Embarque</Label>
                  <Input
                    value={dep.boarding_location}
                    onChange={(e) => handleUpdateDeparture(idx, { boarding_location: e.target.value })}
                    placeholder="Ex: Rodoviária / Aeroporto"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-medium text-foreground">Vagas / Lugares</Label>
                  <Input
                    type="number"
                    min={1}
                    value={dep.available_spots}
                    onChange={(e) => handleUpdateDeparture(idx, { available_spots: Number(e.target.value) })}
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-2xs font-medium text-foreground">Preço por Pessoa</Label>
                    <CurrencyField
                      value={dep.price_cents}
                      onChange={(cents) => handleUpdateDeparture(idx, { price_cents: cents })}
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDeparture(idx)}
                    className="size-10 rounded-xl text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                    title="Remover saída"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Retail & Other physical/service variations
  return (
    <div className={cn("bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Layers className="size-4 text-primary shrink-0" />
          <span>Grade & Variações (Tamanho, Cor, Especificação)</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddVariant}
          className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Nova Variação</span>
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
          <Box className="size-8 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">Produto sem variações (Item Único)</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Se este item tiver cores, tamanhos ou voltagens diferentes com estoques próprios, adicione variações acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div
              key={v.id}
              className="p-4 rounded-xl border border-border/60 bg-background/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end"
            >
              <div className="space-y-1">
                <Label className="text-2xs font-medium text-foreground">Nome da Variação</Label>
                <Input
                  value={v.title}
                  onChange={(e) => handleUpdateVariant(idx, { title: e.target.value })}
                  placeholder="Ex: Azul / Tamanho G"
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-medium text-foreground">Código SKU</Label>
                <Input
                  value={v.sku || ""}
                  onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value })}
                  placeholder="Ex: PROD-AZ-G"
                  className="h-10 rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-medium text-foreground">Estoque</Label>
                <Input
                  type="number"
                  min={0}
                  value={v.stock_quantity}
                  onChange={(e) => handleUpdateVariant(idx, { stock_quantity: Number(e.target.value) })}
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-2xs font-medium text-foreground">Preço (Se diferente)</Label>
                  <CurrencyField
                    value={v.price_override_cents ?? basePriceCents}
                    onChange={(cents) => handleUpdateVariant(idx, { price_override_cents: cents })}
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVariant(idx)}
                  className="size-10 rounded-xl text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                  title="Remover variação"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
