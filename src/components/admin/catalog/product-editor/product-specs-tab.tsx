import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Car, Home as HomeIcon, Wrench, Package } from "lucide-react";

export interface NicheAttributesData {
  // Veículo
  brand?: string;
  model?: string;
  year?: string;
  mileage?: number | string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  doors?: string;
  license_plate_end?: string;

  // Imóvel
  usable_area?: number | string;
  total_area?: number | string;
  bedrooms?: number | string;
  suites?: number | string;
  bathrooms?: number | string;
  parking_spaces?: number | string;

  // Serviço
  service_duration?: number | string;
  service_modality?: string;
  service_warranty?: string;

  // Geral / Físico
  weight_kg?: number | string;
  dimensions?: string;
  material?: string;
}

export interface ProductSpecsTabProps {
  attributes: NicheAttributesData;
  onChange: (attrs: NicheAttributesData) => void;
  nicheContext?: any;
}

/**
 * ProductSpecsTab — Ficha Técnica e Especificações Canônicas do Produto/Serviço no Workspace
 * Layout Amplo, Sem Esmagamento | Inputs h-11 | Zero Títulos Compostos
 */
export function ProductSpecsTab({
  attributes,
  onChange,
}: ProductSpecsTabProps) {
  const updateField = (key: keyof NicheAttributesData, value: any) => {
    onChange({
      ...attributes,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Dimensões e Embalagem (Físico Geral) */}
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Package className="size-4 text-primary shrink-0" />
          <span>Dimensões</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Peso (kg)</Label>
            <Input
              type="number"
              step="0.01"
              value={attributes.weight_kg ?? ""}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              placeholder="Ex: 0.85"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Dimensões (A x L x P)</Label>
            <Input
              value={attributes.dimensions ?? ""}
              onChange={(e) => updateField("dimensions", e.target.value)}
              placeholder="Ex: 20 x 15 x 10 cm"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Material / Composição</Label>
            <Input
              value={attributes.material ?? ""}
              onChange={(e) => updateField("material", e.target.value)}
              placeholder="Ex: Algodão 100% ou Aço Inox"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* 2. Especificações de Veículos (Se aplicável) */}
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Car className="size-4 text-primary shrink-0" />
          <span>Veículo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Marca</Label>
            <Input
              value={attributes.brand ?? ""}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="Ex: Toyota, Honda, Volkswagen"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Modelo</Label>
            <Input
              value={attributes.model ?? ""}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Ex: Corolla XEi 2.0"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Ano (Fab/Mod)</Label>
            <Input
              value={attributes.year ?? ""}
              onChange={(e) => updateField("year", e.target.value)}
              placeholder="Ex: 2022/2023"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Quilometragem (km)</Label>
            <Input
              type="number"
              value={attributes.mileage ?? ""}
              onChange={(e) => updateField("mileage", e.target.value)}
              placeholder="Ex: 45000"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Câmbio</Label>
            <Select
              value={attributes.transmission || "none"}
              onValueChange={(v) => updateField("transmission", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o câmbio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="automatic">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cvt">CVT</SelectItem>
                <SelectItem value="semi_automatic">Automatizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Combustível</Label>
            <Select
              value={attributes.fuel_type || "none"}
              onValueChange={(v) => updateField("fuel_type", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o combustível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="flex">Flex (Álcool/Gasolina)</SelectItem>
                <SelectItem value="gasolina">Gasolina</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
                <SelectItem value="electric">Elétrico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Cor Externa</Label>
            <Input
              value={attributes.color ?? ""}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="Ex: Prata Metálico, Preto"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Portas</Label>
            <Input
              type="number"
              value={attributes.doors ?? ""}
              onChange={(e) => updateField("doors", e.target.value)}
              placeholder="Ex: 4"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Final da Placa</Label>
            <Input
              maxLength={1}
              value={attributes.license_plate_end ?? ""}
              onChange={(e) => updateField("license_plate_end", e.target.value)}
              placeholder="Ex: 8"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Especificações de Imóveis (Se aplicável) */}
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <HomeIcon className="size-4 text-primary shrink-0" />
          <span>Imóvel</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Área Útil (m²)</Label>
            <Input
              type="number"
              value={attributes.usable_area ?? ""}
              onChange={(e) => updateField("usable_area", e.target.value)}
              placeholder="Ex: 85"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Área Total (m²)</Label>
            <Input
              type="number"
              value={attributes.total_area ?? ""}
              onChange={(e) => updateField("total_area", e.target.value)}
              placeholder="Ex: 120"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Quartos</Label>
            <Input
              type="number"
              value={attributes.bedrooms ?? ""}
              onChange={(e) => updateField("bedrooms", e.target.value)}
              placeholder="Ex: 3"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Suítes</Label>
            <Input
              type="number"
              value={attributes.suites ?? ""}
              onChange={(e) => updateField("suites", e.target.value)}
              placeholder="Ex: 1"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Banheiros</Label>
            <Input
              type="number"
              value={attributes.bathrooms ?? ""}
              onChange={(e) => updateField("bathrooms", e.target.value)}
              placeholder="Ex: 2"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Vagas de Garagem</Label>
            <Input
              type="number"
              value={attributes.parking_spaces ?? ""}
              onChange={(e) => updateField("parking_spaces", e.target.value)}
              placeholder="Ex: 2"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. Especificações de Serviços (Se aplicável) */}
      <div className="bg-card rounded-lg p-5 sm:p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Wrench className="size-4 text-primary shrink-0" />
          <span>Serviço</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Duração Estimada (min)</Label>
            <Input
              type="number"
              value={attributes.service_duration ?? ""}
              onChange={(e) => updateField("service_duration", e.target.value)}
              placeholder="Ex: 60"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Regime de Atendimento</Label>
            <Select
              value={attributes.service_modality || "none"}
              onValueChange={(v) => updateField("service_modality", v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o local" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                <SelectItem value="presencial">Presencial no Estabelecimento</SelectItem>
                <SelectItem value="domicilio">Atendimento no Local do Cliente</SelectItem>
                <SelectItem value="remoto">Online / Remoto</SelectItem>
                <SelectItem value="both">Presencial ou Remoto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Garantia do Serviço</Label>
            <Input
              value={attributes.service_warranty ?? ""}
              onChange={(e) => updateField("service_warranty", e.target.value)}
              placeholder="Ex: 90 dias com emissão de nota"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
