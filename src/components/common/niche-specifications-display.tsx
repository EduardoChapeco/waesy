import React from "react";
import {
  Car,
  Home as HomeIcon,
  Wrench,
  Clock,
  Gauge,
  Fuel,
  Layers,
  Scale,
  Ruler,
  Package,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Users,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chaves estritamente privadas e internas que NUNCA devem ser exibidas ao público.
 */
const PRIVATE_INTERNAL_KEYS = new Set([
  "cost_cents",
  "cost",
  "margin",
  "markup",
  "commission",
  "comissao",
  "supplier",
  "supplier_id",
  "fornecedor",
  "ncm",
  "cest",
  "cfop",
  "icms",
  "aliquota",
  "origem_fiscal",
  "internal_notes",
  "observacoes_internas",
  "lead_form",
  "form_id",
  "inquiry_config",
  "feed_media",
  "feed_images",
  "template_style",
  "display_mode",
  "raw_answers",
  "travel_bullets",
  "payment_rules",
  "payment_methods",
  "accepts_pix",
  "accepts_card",
  "accepts_boleto",
  "accepts_cash",
  "accepts_carne",
  "accepts_trade",
  "accepts_financing",
  "pix_discount_percent",
  "max_installments",
  "card_interest_free",
  "boleto_due_days",
]);

interface SpecItem {
  key: string;
  label: string;
  value: string;
  icon?: any;
}

export interface NicheSpecificationsDisplayProps {
  attributes?: Record<string, any> | null;
  nicheId?: string | null;
  className?: string;
  title?: string;
}

/**
 * NicheSpecificationsDisplay — Exibição Canônica de Especificações em Cards Sutis & Minimalistas
 * Padrão Apple HIG / Linear | Zero Emojis | Tipografia Refinada com Unidades em Mono
 */
export function NicheSpecificationsDisplay({
  attributes,
  nicheId,
  className,
  title = "Especificações",
}: NicheSpecificationsDisplayProps) {
  if (!attributes || typeof attributes !== "object") return null;

  const items: SpecItem[] = [];

  // 1. Veículos
  if (attributes.brand || attributes.marca) {
    items.push({
      key: "brand",
      label: "Marca",
      value: String(attributes.brand || attributes.marca),
      icon: Car,
    });
  }
  if (attributes.model || attributes.modelo) {
    items.push({
      key: "model",
      label: "Modelo",
      value: String(attributes.model || attributes.modelo),
      icon: Car,
    });
  }
  if (attributes.year || attributes.ano_fabricacao || attributes.ano_modelo) {
    const yearText = attributes.ano_fabricacao && attributes.ano_modelo
      ? `${attributes.ano_fabricacao}/${attributes.ano_modelo}`
      : String(attributes.year || attributes.ano_modelo || attributes.ano_fabricacao);
    items.push({
      key: "year",
      label: "Ano",
      value: yearText,
      icon: Calendar,
    });
  }
  if (attributes.mileage !== undefined || attributes.quilometragem !== undefined || attributes.km !== undefined) {
    const kmVal = Number(attributes.mileage ?? attributes.quilometragem ?? attributes.km);
    if (!isNaN(kmVal)) {
      items.push({
        key: "mileage",
        label: "Quilometragem",
        value: `${kmVal.toLocaleString("pt-BR")} km`,
        icon: Gauge,
      });
    }
  }
  if (attributes.transmission || attributes.cambio) {
    const rawCambio = String(attributes.transmission || attributes.cambio);
    const cambioMap: Record<string, string> = {
      automatic: "Automático",
      manual: "Manual",
      cvt: "CVT",
      semi_automatic: "Automatizado",
    };
    items.push({
      key: "transmission",
      label: "Câmbio",
      value: cambioMap[rawCambio.toLowerCase()] || rawCambio,
      icon: Layers,
    });
  }
  if (attributes.fuel_type || attributes.combustivel) {
    const rawFuel = String(attributes.fuel_type || attributes.combustivel);
    const fuelMap: Record<string, string> = {
      flex: "Flex (Álcool/Gasolina)",
      gasolina: "Gasolina",
      etanol: "Etanol",
      diesel: "Diesel",
      hybrid: "Híbrido",
      electric: "Elétrico",
    };
    items.push({
      key: "fuel",
      label: "Combustível",
      value: fuelMap[rawFuel.toLowerCase()] || rawFuel,
      icon: Fuel,
    });
  }
  if (attributes.color || attributes.cor) {
    items.push({
      key: "color",
      label: "Cor",
      value: String(attributes.color || attributes.cor),
      icon: Layers,
    });
  }
  if (attributes.doors || attributes.portas) {
    items.push({
      key: "doors",
      label: "Portas",
      value: `${attributes.doors || attributes.portas} portas`,
      icon: Car,
    });
  }
  if (attributes.license_plate_end || attributes.final_placa) {
    items.push({
      key: "plate_end",
      label: "Final da Placa",
      value: String(attributes.license_plate_end || attributes.final_placa),
      icon: Info,
    });
  }

  // 2. Imóveis
  if (attributes.usable_area || attributes.area_util || attributes.area_privativa) {
    const area = attributes.usable_area || attributes.area_util || attributes.area_privativa;
    items.push({
      key: "usable_area",
      label: "Área Útil",
      value: `${area} m²`,
      icon: Ruler,
    });
  }
  if (attributes.total_area || attributes.area_total) {
    const totalArea = attributes.total_area || attributes.area_total;
    items.push({
      key: "total_area",
      label: "Área Total",
      value: `${totalArea} m²`,
      icon: Ruler,
    });
  }
  if (attributes.bedrooms || attributes.quartos) {
    items.push({
      key: "bedrooms",
      label: "Quartos",
      value: String(attributes.bedrooms || attributes.quartos),
      icon: HomeIcon,
    });
  }
  if (attributes.suites || attributes.suites_count) {
    items.push({
      key: "suites",
      label: "Suítes",
      value: String(attributes.suites || attributes.suites_count),
      icon: HomeIcon,
    });
  }
  if (attributes.bathrooms || attributes.banheiros) {
    items.push({
      key: "bathrooms",
      label: "Banheiros",
      value: String(attributes.bathrooms || attributes.banheiros),
      icon: HomeIcon,
    });
  }
  if (attributes.parking_spaces || attributes.vagas) {
    items.push({
      key: "parking",
      label: "Vagas de Garagem",
      value: String(attributes.parking_spaces || attributes.vagas),
      icon: Car,
    });
  }

  // 3. Serviços
  if (attributes.service_duration || attributes.duracao_estimada) {
    const dur = attributes.service_duration || attributes.duracao_estimada;
    items.push({
      key: "duration",
      label: "Duração Estimada",
      value: isNaN(Number(dur)) ? String(dur) : `${dur} min`,
      icon: Clock,
    });
  }
  if (attributes.service_modality || attributes.regime_atendimento) {
    const rawMod = String(attributes.service_modality || attributes.regime_atendimento);
    const modMap: Record<string, string> = {
      presencial: "Presencial no Estabelecimento",
      domicilio: "Atendimento no Local do Cliente",
      remoto: "Online / Remoto",
      both: "Presencial ou Remoto",
    };
    items.push({
      key: "modality",
      label: "Atendimento",
      value: modMap[rawMod.toLowerCase()] || rawMod,
      icon: Wrench,
    });
  }
  if (attributes.service_warranty || attributes.garantia_servico) {
    items.push({
      key: "warranty",
      label: "Garantia",
      value: String(attributes.service_warranty || attributes.garantia_servico),
      icon: ShieldCheck,
    });
  }

  // 4. Gastronomia
  if (attributes.servings || attributes.rendimento || attributes.serve_pessoas) {
    const s = attributes.servings || attributes.rendimento || attributes.serve_pessoas;
    items.push({
      key: "servings",
      label: "Rendimento",
      value: `Serve ${s} pessoa(s)`,
      icon: Users,
    });
  }
  if (attributes.prep_time || attributes.tempo_preparo) {
    items.push({
      key: "prep_time",
      label: "Preparo",
      value: String(attributes.prep_time || attributes.tempo_preparo),
      icon: Clock,
    });
  }

  // 5. Dimensões & Físicos (Produtos do Workspace e Varejo)
  if (attributes.weight_kg || attributes.peso_kg) {
    items.push({
      key: "weight",
      label: "Peso",
      value: `${attributes.weight_kg || attributes.peso_kg} kg`,
      icon: Scale,
    });
  }
  if (attributes.dimensions || (attributes.width_cm && attributes.height_cm)) {
    const dims = attributes.dimensions || `${attributes.height_cm} x ${attributes.width_cm} x ${attributes.depth_cm || 0} cm`;
    items.push({
      key: "dimensions",
      label: "Dimensões",
      value: String(dims),
      icon: Package,
    });
  }
  if (attributes.material) {
    items.push({
      key: "material",
      label: "Material",
      value: String(attributes.material),
      icon: Layers,
    });
  }

  // 6. Chaves Dinâmicas Não Específicas (Filtro Anti-Vazamento de Dados Internos)
  const registeredKeys = new Set(items.map((i) => i.key));
  Object.entries(attributes).forEach(([k, v]) => {
    if (
      !PRIVATE_INTERNAL_KEYS.has(k.toLowerCase()) &&
      !registeredKeys.has(k) &&
      typeof v !== "object" &&
      v !== null &&
      v !== undefined &&
      String(v).trim().length > 0 &&
      !k.startsWith("_") &&
      !k.startsWith("admin_")
    ) {
      // Normalização de label (ex: "ano_fabricacao" -> "Ano Fabricação")
      const formattedLabel = k
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

      items.push({
        key: k,
        label: formattedLabel,
        value: typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v),
        icon: Info,
      });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {items.length} item(ns)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {items.map((item) => {
          const IconComponent = item.icon || Info;
          return (
            <div
              key={item.key}
              className="p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-1 shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <IconComponent className="size-3.5 text-primary shrink-0" />
                <span className="text-[11px] font-medium truncate">{item.label}</span>
              </div>
              <p className="text-xs font-semibold text-foreground font-mono truncate pt-0.5">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
