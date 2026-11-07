import * as React from "react";
import {
  Box,
  ShoppingBag,
  ThermometerSnowflake,
  Cylinder,
  Layers,
  Smartphone,
  Truck,
  Bike,
  Car,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type PackagingFormatId =
  | "box"
  | "envelope"
  | "thermal_bag"
  | "roll"
  | "pallet"
  | "digital";

export type ThermalControlMode = "ambient" | "chilled" | "frozen" | "hot";

export interface ProductLogisticsMetadata {
  packaging_type?: PackagingFormatId;
  packaging_preset_id?: string;
  fragile?: boolean;
  stackable?: boolean;
  thermal_control?: ThermalControlMode;
  aisle_location?: string;
  picking_notes?: string;
}

export interface PackagingPreset {
  id: string;
  format: PackagingFormatId;
  label: string;
  subtitle: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  suggested_weight_kg: number;
}

export const PACKAGING_FORMATS: Array<{
  id: PackagingFormatId;
  label: string;
  subtitle: string;
  apiFormat: "box" | "envelope" | "roll";
  melhorEnvioFormatCode: 1 | 2 | 3;
}> = [
  {
    id: "box",
    label: "Caixa de Papelão",
    subtitle: "Padrão Correios e Transportadoras",
    apiFormat: "box",
    melhorEnvioFormatCode: 1,
  },
  {
    id: "envelope",
    label: "Sacola / Envelope",
    subtitle: "Moda, Camisas, Livros e Leves",
    apiFormat: "envelope",
    melhorEnvioFormatCode: 3,
  },
  {
    id: "thermal_bag",
    label: "Sacola Delivery",
    subtitle: "Gastronomia, Mercado e Farmácia",
    apiFormat: "box",
    melhorEnvioFormatCode: 1,
  },
  {
    id: "roll",
    label: "Cilindro / Tubo",
    subtitle: "Tecidos, Pôsteres, Banners e Varas",
    apiFormat: "roll",
    melhorEnvioFormatCode: 2,
  },
  {
    id: "pallet",
    label: "Caixa Master / Fardo",
    subtitle: "Atacado, Móveis e Grandes Volumes",
    apiFormat: "box",
    melhorEnvioFormatCode: 1,
  },
  {
    id: "digital",
    label: "Digital / Sem Frete",
    subtitle: "Serviços, Cursos, Vouchers e Ingressos",
    apiFormat: "envelope",
    melhorEnvioFormatCode: 3,
  },
];

export const PACKAGING_PRESETS: PackagingPreset[] = [
  // Caixas
  {
    id: "box_p",
    format: "box",
    label: "Caixa P (Acessórios / Celular)",
    subtitle: "16 × 11 × 6 cm",
    length_cm: 16,
    width_cm: 11,
    height_cm: 6,
    suggested_weight_kg: 0.3,
  },
  {
    id: "box_m",
    format: "box",
    label: "Caixa M (Calçados / Varejo)",
    subtitle: "27 × 18 × 9 cm",
    length_cm: 27,
    width_cm: 18,
    height_cm: 9,
    suggested_weight_kg: 0.6,
  },
  {
    id: "box_g",
    format: "box",
    label: "Caixa G (Volume Duplo)",
    subtitle: "36 × 27 × 18 cm",
    length_cm: 36,
    width_cm: 27,
    height_cm: 18,
    suggested_weight_kg: 1.5,
  },
  // Sacolas / Envelopes
  {
    id: "poly_p",
    format: "envelope",
    label: "Envelope Segurança P",
    subtitle: "26 × 20 × 4 cm",
    length_cm: 26,
    width_cm: 20,
    height_cm: 4,
    suggested_weight_kg: 0.25,
  },
  {
    id: "poly_m",
    format: "envelope",
    label: "Sacola Moda M (Camisas / Malhas)",
    subtitle: "32 × 25 × 5 cm",
    length_cm: 32,
    width_cm: 25,
    height_cm: 5,
    suggested_weight_kg: 0.35,
  },
  {
    id: "poly_g",
    format: "envelope",
    label: "Sacola Moda G (Casacos / Jeans)",
    subtitle: "40 × 30 × 8 cm",
    length_cm: 40,
    width_cm: 30,
    height_cm: 8,
    suggested_weight_kg: 0.8,
  },
  // Delivery / Térmica
  {
    id: "bag_kraft",
    format: "thermal_bag",
    label: "Sacola Kraft Delivery",
    subtitle: "24 × 15 × 28 cm",
    length_cm: 24,
    width_cm: 15,
    height_cm: 28,
    suggested_weight_kg: 0.5,
  },
  {
    id: "bag_market",
    format: "thermal_bag",
    label: "Ecobag / Sacola Mercado",
    subtitle: "35 × 22 × 32 cm",
    length_cm: 35,
    width_cm: 22,
    height_cm: 32,
    suggested_weight_kg: 2.5,
  },
  // Cilindro / Rolo
  {
    id: "roll_p",
    format: "roll",
    label: "Tubo Postal P",
    subtitle: "50 × 8 × 8 cm",
    length_cm: 50,
    width_cm: 8,
    height_cm: 8,
    suggested_weight_kg: 0.4,
  },
  {
    id: "roll_g",
    format: "roll",
    label: "Tubo Postal G",
    subtitle: "90 × 10 × 10 cm",
    length_cm: 90,
    width_cm: 10,
    height_cm: 10,
    suggested_weight_kg: 0.9,
  },
  // Caixa Master / Fardo
  {
    id: "master_fardo",
    format: "pallet",
    label: "Fardo Atacado 12 un",
    subtitle: "40 × 30 × 25 cm",
    length_cm: 40,
    width_cm: 30,
    height_cm: 25,
    suggested_weight_kg: 6.0,
  },
  {
    id: "master_box",
    format: "pallet",
    label: "Caixa Master B2B",
    subtitle: "60 × 40 × 40 cm",
    length_cm: 60,
    width_cm: 40,
    height_cm: 40,
    suggested_weight_kg: 14.0,
  },
];

export interface CalculatedLogisticsMetrics {
  realWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  volumeCm3: number;
  volumeLiters: number;
  sumDimensionsCm: number;
  maxSideCm: number;
  fitsMotoLinkBag: boolean;
  recommendedLocalVehicle: "motorcycle" | "car" | "van";
  recommendedLocalVehicleLabel: string;
  correiosEligible: boolean;
  correiosWarning: string | null;
  apiPackageFormat: "box" | "envelope" | "roll";
  melhorEnvioFormatCode: 1 | 2 | 3;
}

export function calculateLogisticsMetrics(params: {
  weightKg?: number | string | null;
  lengthCm?: number | string | null;
  widthCm?: number | string | null;
  heightCm?: number | string | null;
  packagingType?: PackagingFormatId | string | null;
}): CalculatedLogisticsMetrics {
  const realWeightKg = Math.max(0, Number(params.weightKg) || 0);
  const lengthCm = Math.max(0, Number(params.lengthCm) || 0);
  const widthCm = Math.max(0, Number(params.widthCm) || 0);
  const heightCm = Math.max(0, Number(params.heightCm) || 0);
  const formatId = (params.packagingType || "box") as PackagingFormatId;

  const volumeCm3 = lengthCm * widthCm * heightCm;
  const volumeLiters = Number((volumeCm3 / 1000).toFixed(2));
  // Padrão IATA / Correios / Melhor Envio: (C x L x A) / 6000
  const volumetricWeightKg = Number((volumeCm3 / 6000).toFixed(3));
  const chargeableWeightKg = Number(Math.max(realWeightKg, volumetricWeightKg).toFixed(3));
  const sumDimensionsCm = lengthCm + widthCm + heightCm;
  const maxSideCm = Math.max(lengthCm, widthCm, heightCm);

  // Bag MotoLink 45L comporta até 40x35x30cm (maxSide <= 45cm, volume <= 42L) e até 12kg
  const fitsMotoLinkBag =
    formatId !== "pallet" &&
    realWeightKg <= 12 &&
    maxSideCm <= 45 &&
    volumeLiters <= 42;

  let recommendedLocalVehicle: "motorcycle" | "car" | "van" = "motorcycle";
  let recommendedLocalVehicleLabel = "MotoLink Express (Bag 45L)";
  if (!fitsMotoLinkBag) {
    if (realWeightKg <= 60 && maxSideCm <= 100 && volumeLiters <= 250) {
      recommendedLocalVehicle = "car";
      recommendedLocalVehicleLabel = "Carro Utilitário Local (Porta-Malas)";
    } else {
      recommendedLocalVehicle = "van";
      recommendedLocalVehicleLabel = "Fiorino / Van de Carga";
    }
  }

  // Regras Correios / Melhor Envio: Soma <= 200cm, Lado máx <= 100cm, Peso <= 30kg
  // Mínimos: C >= 15cm, L >= 10cm, A >= 1cm (ou envelope C >= 16, L >= 11)
  let correiosEligible = true;
  let correiosWarning: string | null = null;

  if (formatId === "digital") {
    correiosEligible = false;
  } else if (realWeightKg > 30) {
    correiosEligible = false;
    correiosWarning = "Acima de 30 kg: requer Transportadora / Frete Fracionado.";
  } else if (sumDimensionsCm > 200 || maxSideCm > 100) {
    correiosEligible = false;
    correiosWarning = "Dimensões excedem o limite postal (soma > 200 cm ou lado > 100 cm).";
  } else if (lengthCm > 0 && widthCm > 0 && heightCm > 0 && (lengthCm < 15 || widthCm < 10 || heightCm < 1)) {
    correiosWarning = "Abaixo do mínimo postal (15×10×1 cm): as APIs aplicarão a dimensão mínima automaticamente.";
  }

  const fmtMeta = PACKAGING_FORMATS.find((f) => f.id === formatId) || PACKAGING_FORMATS[0]!;

  return {
    realWeightKg,
    volumetricWeightKg,
    chargeableWeightKg,
    volumeCm3,
    volumeLiters,
    sumDimensionsCm,
    maxSideCm,
    fitsMotoLinkBag,
    recommendedLocalVehicle,
    recommendedLocalVehicleLabel,
    correiosEligible,
    correiosWarning,
    apiPackageFormat: fmtMeta.apiFormat,
    melhorEnvioFormatCode: fmtMeta.melhorEnvioFormatCode,
  };
}

function PackagingVisualSvg({ format }: { format: PackagingFormatId }) {
  if (format === "box" || format === "pallet") {
    return (
      <svg viewBox="0 0 64 64" className="size-10 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M32 8L56 20V44L32 56L8 44V20L32 8Z" className="fill-primary/10" />
        <path d="M8 20L32 32L56 20" />
        <path d="M32 32V56" />
        <path d="M20 14L44 26" strokeDasharray="3 2" />
      </svg>
    );
  }
  if (format === "envelope") {
    return (
      <svg viewBox="0 0 64 64" className="size-10 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="12" y="10" width="40" height="44" rx="4" className="fill-primary/10" />
        <path d="M12 18L32 30L52 18" />
        <path d="M22 44H42" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (format === "thermal_bag") {
    return (
      <svg viewBox="0 0 64 64" className="size-10 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 22H48L52 52H12L16 22Z" className="fill-primary/10" />
        <path d="M24 22V16C24 12.6863 26.6863 10 30 10H34C37.3137 10 40 12.6863 40 16V22" />
        <path d="M22 36H42" />
      </svg>
    );
  }
  if (format === "roll") {
    return (
      <svg viewBox="0 0 64 64" className="size-10 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="20" cy="32" rx="6" ry="12" className="fill-primary/15" />
        <path d="M20 20H46C49.3137 20 52 25.3726 52 32C52 38.6274 49.3137 44 46 44H20" className="fill-primary/5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="size-10 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="18" y="10" width="28" height="44" rx="4" className="fill-primary/10" />
      <circle cx="32" cy="46" r="2" fill="currentColor" />
    </svg>
  );
}

export interface ProductPackagingSelectorProps {
  weightKg: number | string;
  widthCm: number | string;
  heightCm: number | string;
  lengthCm: number | string;
  preparationTimeDays: number | string;
  preparationTimeMinutes?: number | string;
  isPhysical?: boolean;
  logistics: ProductLogisticsMetadata;
  nicheCtx?: any;
  onChangeDimensions: (patch: {
    weight_kg?: number;
    width_cm?: number;
    height_cm?: number;
    length_cm?: number;
    preparation_time_days?: number;
    preparation_time_minutes?: number;
    is_physical?: boolean;
  }) => void;
  onChangeLogistics: (next: ProductLogisticsMetadata) => void;
}

export function ProductPackagingSelector({
  weightKg,
  widthCm,
  heightCm,
  lengthCm,
  preparationTimeDays,
  preparationTimeMinutes,
  isPhysical = true,
  logistics,
  nicheCtx,
  onChangeDimensions,
  onChangeLogistics,
}: ProductPackagingSelectorProps) {
  const defaultFormat: PackagingFormatId = !isPhysical
    ? "digital"
    : nicheCtx?.isFoodBusiness || nicheCtx?.isSupermarketBusiness
      ? "thermal_bag"
      : "box";

  const activeFormat: PackagingFormatId = logistics.packaging_type || defaultFormat;

  const presetsForFormat = React.useMemo(
    () => PACKAGING_PRESETS.filter((p) => p.format === activeFormat),
    [activeFormat]
  );

  const metrics = React.useMemo(
    () =>
      calculateLogisticsMetrics({
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        packagingType: activeFormat,
      }),
    [weightKg, lengthCm, widthCm, heightCm, activeFormat]
  );

  const handleSelectFormat = (format: PackagingFormatId) => {
    const isNowPhysical = format !== "digital";
    const firstPreset = PACKAGING_PRESETS.find((p) => p.format === format);

    onChangeLogistics({
      ...logistics,
      packaging_type: format,
      packaging_preset_id: firstPreset?.id || "custom",
    });

    if (!isNowPhysical) {
      onChangeDimensions({ is_physical: false });
    } else if (firstPreset && (!Number(lengthCm) || !Number(widthCm) || !Number(heightCm))) {
      onChangeDimensions({
        is_physical: true,
        length_cm: firstPreset.length_cm,
        width_cm: firstPreset.width_cm,
        height_cm: firstPreset.height_cm,
        weight_kg: Number(weightKg) || firstPreset.suggested_weight_kg,
      });
    } else {
      onChangeDimensions({ is_physical: true });
    }
  };

  const handleSelectPreset = (preset: PackagingPreset) => {
    onChangeLogistics({
      ...logistics,
      packaging_type: preset.format,
      packaging_preset_id: preset.id,
    });
    onChangeDimensions({
      is_physical: true,
      length_cm: preset.length_cm,
      width_cm: preset.width_cm,
      height_cm: preset.height_cm,
      weight_kg: preset.suggested_weight_kg,
    });
  };

  return (
    <div className="bg-card rounded-lg p-6 space-y-6 border border-border">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <Truck className="size-4 text-primary shrink-0" />
          <span>Embalagem, Cubagem & Separação WMS</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-mono">
            API Formato: {metrics.apiPackageFormat.toUpperCase()}
          </Badge>
          {activeFormat !== "digital" && (
            <Badge variant="secondary" className="text-xs font-mono">
              Peso Tarifado: {metrics.chargeableWeightKg} kg
            </Badge>
          )}
        </div>
      </div>

      {/* 1. Seletor Visual de Tipo de Embalagem */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-foreground">
          1. Formato Visual da Embalagem (Alinhado com Correios, Melhor Envio e MotoLink)
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PACKAGING_FORMATS.map((fmt) => {
            const isSelected = activeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleSelectFormat(fmt.id)}
                className={`min-h-11 p-3 rounded-lg border text-left flex items-center gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <PackagingVisualSvg format={fmt.id} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{fmt.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{fmt.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeFormat !== "digital" && (
        <>
          {/* 2. Presets Rápidos Visuais */}
          {presetsForFormat.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                2. Tamanhos Padronizados Rápidos (Clique para aplicar medidas)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presetsForFormat.map((preset) => {
                  const isMatch =
                    Number(lengthCm) === preset.length_cm &&
                    Number(widthCm) === preset.width_cm &&
                    Number(heightCm) === preset.height_cm;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`min-h-11 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isMatch
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="text-xs font-bold text-foreground truncate">{preset.label}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {preset.subtitle} · ~{preset.suggested_weight_kg} kg
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Medidas Exatas Sincronizadas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Peso Real (kg)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={weightKg ?? ""}
                onChange={(e) => onChangeDimensions({ weight_kg: parseFloat(e.target.value) || 0 })}
                placeholder="0.50"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Comprimento (cm)</Label>
              <Input
                type="number"
                min="1"
                value={lengthCm ?? ""}
                onChange={(e) => onChangeDimensions({ length_cm: parseFloat(e.target.value) || 0 })}
                placeholder="20"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Largura (cm)</Label>
              <Input
                type="number"
                min="1"
                value={widthCm ?? ""}
                onChange={(e) => onChangeDimensions({ width_cm: parseFloat(e.target.value) || 0 })}
                placeholder="15"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Altura (cm)</Label>
              <Input
                type="number"
                min="1"
                value={heightCm ?? ""}
                onChange={(e) => onChangeDimensions({ height_cm: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-xs font-medium text-foreground">
                {nicheCtx?.isFoodBusiness ? "Preparo (min)" : "Prazo Envio (dias)"}
              </Label>
              {nicheCtx?.isFoodBusiness && preparationTimeMinutes !== undefined ? (
                <Input
                  type="number"
                  min="0"
                  value={preparationTimeMinutes ?? ""}
                  onChange={(e) =>
                    onChangeDimensions({ preparation_time_minutes: parseInt(e.target.value, 10) || 0 })
                  }
                  placeholder="25"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              ) : (
                <Input
                  type="number"
                  min="0"
                  value={preparationTimeDays ?? ""}
                  onChange={(e) =>
                    onChangeDimensions({ preparation_time_days: parseInt(e.target.value, 10) || 0 })
                  }
                  placeholder="1"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              )}
            </div>
          </div>

          {/* 4. Painel de Telemetria de Cubagem & Compatibilidade de Modais */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Volume & Cubagem IATA</span>
                <span className="font-mono font-bold text-foreground">
                  {metrics.volumeLiters} L · Cubado: {metrics.volumetricWeightKg} kg
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Modal de Entrega Local</span>
                <span className="font-bold text-foreground flex items-center gap-2 mt-1">
                  {metrics.fitsMotoLinkBag ? (
                    <Bike className="size-3.5 text-primary shrink-0" />
                  ) : (
                    <Car className="size-3.5 text-primary shrink-0" />
                  )}
                  {metrics.recommendedLocalVehicleLabel}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Correios / Melhor Envio</span>
                <span className="font-bold text-foreground flex items-center gap-2 mt-1">
                  {metrics.correiosEligible ? (
                    <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                  )}
                  {metrics.correiosEligible
                    ? `Apto (Soma ${metrics.sumDimensionsCm}/200 cm)`
                    : "Requer Transportadora"}
                </span>
              </div>
            </div>

            {metrics.correiosWarning && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border">
                <AlertTriangle className="size-3.5 text-primary shrink-0" />
                <span>{metrics.correiosWarning}</span>
              </div>
            )}
          </div>

          {/* 5. Diretrizes para o Módulo de Separação WMS & Expedição */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary shrink-0" />
                Diretrizes do Módulo de Separação (WMS Picking & Packing)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Corredor / Prateleira (WMS Bin)
                </Label>
                <Input
                  value={logistics.aisle_location || ""}
                  onChange={(e) =>
                    onChangeLogistics({ ...logistics, aisle_location: e.target.value })
                  }
                  placeholder="Ex: Corredor A · Prateleira 03"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <ThermometerSnowflake className="size-3.5 text-muted-foreground" />
                  Regime Térmico na Expedição
                </Label>
                <Select
                  value={logistics.thermal_control || "ambient"}
                  onValueChange={(v) =>
                    onChangeLogistics({
                      ...logistics,
                      thermal_control: v as ThermalControlMode,
                    })
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambient">Temperatura Ambiente (Seco)</SelectItem>
                    <SelectItem value="chilled">Resfriado (0°C a 7°C)</SelectItem>
                    <SelectItem value="frozen">Congelado (-18°C)</SelectItem>
                    <SelectItem value="hot">Estufa / Térmico Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-3.5 text-muted-foreground" />
                  Cuidados de Manuseio
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeLogistics({ ...logistics, fragile: !logistics.fragile })
                    }
                    className={`flex-1 h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      logistics.fragile
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {logistics.fragile ? "Frágil (Ativo)" : "Item Frágil"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeLogistics({
                        ...logistics,
                        stackable: logistics.stackable === false ? true : false,
                      })
                    }
                    className={`flex-1 h-11 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      logistics.stackable !== false
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {logistics.stackable !== false ? "Empilhável" : "Não Empilhar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                Instruções Visuais para o Separador / Embalador (Exibidas no WMS e na Etiqueta)
              </Label>
              <Input
                value={logistics.picking_notes || ""}
                onChange={(e) =>
                  onChangeLogistics({ ...logistics, picking_notes: e.target.value })
                }
                placeholder="Ex: Envolver em plástico bolha, dobrar com papel seda ou conferir lacre de segurança..."
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
