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
  Users,
  Info,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpecDisplayItem {
  key?: string;
  label: string;
  value: string;
  icon?: any;
  highlight?: boolean;
}

export interface NicheSpecificationsDisplayProps {
  attributes?: Record<string, any> | null;
  items?: SpecDisplayItem[] | Array<{ label: string; value: string; icon?: any; highlight?: boolean }> | null;
  nicheId?: string | null;
  className?: string;
  title?: string;
}

/**
 * NicheSpecificationsDisplay — Exibição Canônica de Especificações Públicas Comerciais
 * 
 * Regra Arquitetural Absoluta:
 * - Apenas atributos técnicos orientados ao consumidor final (Marca, Modelo, Ano, Quilometragem,
 *   Combustível, Câmbio, Dimensões, Peso, Potência, Garantia, etc.) são permitidos.
 * - Utiliza estritamente ALLOWLIST FECHADA. Proibido expressamente qualquer blacklist,
 *   iteração sobre chaves desconhecidas ou exibição de dados fiscais/internos/custos.
 */
export function NicheSpecificationsDisplay({
  attributes,
  items: preResolvedItems,
  nicheId,
  className,
  title = "Especificações",
}: NicheSpecificationsDisplayProps) {
  // Se já foram fornecidos itens pré-resolvidos pelo resolvedor canônico de nicho:
  if (Array.isArray(preResolvedItems) && preResolvedItems.length > 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">
            {preResolvedItems.length} item(ns)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {preResolvedItems.map((item, idx) => {
            const IconComponent = item.icon || Info;
            return (
              <div
                key={`resolved-${idx}`}
                className={cn(
                  "p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-1 shadow-2xs",
                  item.highlight && "ring-1 ring-primary/20 bg-primary/5"
                )}
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

  if (!attributes || typeof attributes !== "object") return null;

  // ── ALLOWLIST ESTRITA DE ESPECIFICAÇÕES PÚBLICAS ──
  const displayItems: SpecDisplayItem[] = [];

  // 1. Identificação Comercial Básica
  if (attributes.brand || attributes.marca) {
    displayItems.push({
      key: "brand",
      label: "Marca",
      value: String(attributes.brand || attributes.marca),
      icon: Layers,
    });
  }
  if (attributes.model || attributes.modelo) {
    displayItems.push({
      key: "model",
      label: "Modelo",
      value: String(attributes.model || attributes.modelo),
      icon: Info,
    });
  }
  if (attributes.version || attributes.versao) {
    displayItems.push({
      key: "version",
      label: "Versão",
      value: String(attributes.version || attributes.versao),
      icon: Info,
    });
  }
  if (attributes.condition || attributes.condicao) {
    const rawCond = String(attributes.condition || attributes.condicao).toLowerCase();
    const condMap: Record<string, string> = {
      new: "Novo",
      novo: "Novo",
      used: "Usado",
      usado: "Usado",
      seminovo: "Seminovo",
      refurbished: "Recondicionado",
    };
    displayItems.push({
      key: "condition",
      label: "Condição",
      value: condMap[rawCond] || String(attributes.condition || attributes.condicao),
      icon: ShieldCheck,
      highlight: true,
    });
  }

  // 2. Veículos & Automotivo
  if (attributes.year || attributes.ano_fabricacao || attributes.ano_modelo) {
    const yearText = attributes.ano_fabricacao && attributes.ano_modelo
      ? `${attributes.ano_fabricacao}/${attributes.ano_modelo}`
      : String(attributes.year || attributes.ano_modelo || attributes.ano_fabricacao);
    displayItems.push({
      key: "year",
      label: "Ano",
      value: yearText,
      icon: Calendar,
    });
  }
  if (attributes.mileage !== undefined || attributes.quilometragem !== undefined || attributes.km !== undefined) {
    const kmVal = Number(attributes.mileage ?? attributes.quilometragem ?? attributes.km);
    if (!isNaN(kmVal)) {
      displayItems.push({
        key: "mileage",
        label: "Quilometragem",
        value: `${kmVal.toLocaleString("pt-BR")} km`,
        icon: Gauge,
      });
    }
  }
  if (attributes.transmission || attributes.cambio) {
    const rawCambio = String(attributes.transmission || attributes.cambio).toLowerCase();
    const cambioMap: Record<string, string> = {
      automatic: "Automático",
      manual: "Manual",
      cvt: "CVT",
      semi_automatic: "Automatizado",
    };
    displayItems.push({
      key: "transmission",
      label: "Câmbio",
      value: cambioMap[rawCambio] || String(attributes.transmission || attributes.cambio),
      icon: Layers,
    });
  }
  if (attributes.fuel_type || attributes.combustivel || attributes.fuel) {
    const rawFuel = String(attributes.fuel_type || attributes.combustivel || attributes.fuel).toLowerCase();
    const fuelMap: Record<string, string> = {
      flex: "Flex (Álcool/Gasolina)",
      gasolina: "Gasolina",
      etanol: "Etanol",
      diesel: "Diesel",
      hybrid: "Híbrido",
      electric: "Elétrico",
    };
    displayItems.push({
      key: "fuel",
      label: "Combustível",
      value: fuelMap[rawFuel] || String(attributes.fuel_type || attributes.combustivel || attributes.fuel),
      icon: Fuel,
    });
  }
  if (attributes.color || attributes.cor) {
    displayItems.push({
      key: "color",
      label: "Cor",
      value: String(attributes.color || attributes.cor),
      icon: Layers,
    });
  }
  if (attributes.doors || attributes.portas) {
    displayItems.push({
      key: "doors",
      label: "Portas",
      value: `${attributes.doors || attributes.portas} portas`,
      icon: Car,
    });
  }
  if (attributes.license_plate_end || attributes.final_placa) {
    displayItems.push({
      key: "plate_end",
      label: "Final da Placa",
      value: String(attributes.license_plate_end || attributes.final_placa),
      icon: Info,
    });
  }

  // 3. Imóveis & Construção
  if (attributes.usable_area || attributes.area_util || attributes.area_privativa) {
    const area = attributes.usable_area || attributes.area_util || attributes.area_privativa;
    displayItems.push({
      key: "usable_area",
      label: "Área Útil",
      value: `${area} m²`,
      icon: Ruler,
    });
  }
  if (attributes.total_area || attributes.area_total) {
    const totalArea = attributes.total_area || attributes.area_total;
    displayItems.push({
      key: "total_area",
      label: "Área Total",
      value: `${totalArea} m²`,
      icon: Ruler,
    });
  }
  if (attributes.bedrooms || attributes.quartos) {
    displayItems.push({
      key: "bedrooms",
      label: "Quartos",
      value: String(attributes.bedrooms || attributes.quartos),
      icon: HomeIcon,
    });
  }
  if (attributes.suites || attributes.suites_count) {
    displayItems.push({
      key: "suites",
      label: "Suítes",
      value: String(attributes.suites || attributes.suites_count),
      icon: HomeIcon,
    });
  }
  if (attributes.bathrooms || attributes.banheiros) {
    displayItems.push({
      key: "bathrooms",
      label: "Banheiros",
      value: String(attributes.bathrooms || attributes.banheiros),
      icon: HomeIcon,
    });
  }
  if (attributes.parking_spaces || attributes.vagas || attributes.garage_spots) {
    displayItems.push({
      key: "parking",
      label: "Vagas de Garagem",
      value: String(attributes.parking_spaces || attributes.vagas || attributes.garage_spots),
      icon: Car,
    });
  }

  // 4. Serviços Locais & Atendimento
  if (attributes.service_duration || attributes.duracao_estimada || attributes.duracao) {
    const dur = attributes.service_duration || attributes.duracao_estimada || attributes.duracao;
    displayItems.push({
      key: "duration",
      label: "Duração Estimada",
      value: isNaN(Number(dur)) ? String(dur) : `${dur} min`,
      icon: Clock,
    });
  }
  if (attributes.service_modality || attributes.regime_atendimento || attributes.modalidade) {
    const rawMod = String(attributes.service_modality || attributes.regime_atendimento || attributes.modalidade).toLowerCase();
    const modMap: Record<string, string> = {
      presencial: "Presencial no Estabelecimento",
      domicilio: "Atendimento no Local do Cliente",
      remoto: "Online / Remoto",
      both: "Presencial ou Remoto",
    };
    displayItems.push({
      key: "modality",
      label: "Atendimento",
      value: modMap[rawMod] || String(attributes.service_modality || attributes.regime_atendimento),
      icon: Wrench,
    });
  }
  if (attributes.service_warranty || attributes.garantia_servico || attributes.warranty || attributes.garantia) {
    displayItems.push({
      key: "warranty",
      label: "Garantia",
      value: String(attributes.service_warranty || attributes.garantia_servico || attributes.warranty || attributes.garantia),
      icon: ShieldCheck,
    });
  }

  // 5. Gastronomia
  if (attributes.servings || attributes.rendimento || attributes.serve_pessoas) {
    const s = attributes.servings || attributes.rendimento || attributes.serve_pessoas;
    displayItems.push({
      key: "servings",
      label: "Rendimento",
      value: `Serve ${s} pessoa(s)`,
      icon: Users,
    });
  }
  if (attributes.prep_time || attributes.tempo_preparo) {
    displayItems.push({
      key: "prep_time",
      label: "Preparo",
      value: String(attributes.prep_time || attributes.tempo_preparo),
      icon: Clock,
    });
  }

  // 6. Produtos Físicos, Dimensões e Especificações do Fabricante
  if (attributes.weight_kg || attributes.peso_kg || attributes.peso) {
    displayItems.push({
      key: "weight",
      label: "Peso",
      value: `${attributes.weight_kg || attributes.peso_kg || attributes.peso} kg`,
      icon: Scale,
    });
  }
  if (attributes.dimensions || attributes.dimensoes || (attributes.width_cm && attributes.height_cm)) {
    const dims = attributes.dimensions || attributes.dimensoes || `${attributes.height_cm} x ${attributes.width_cm} x ${attributes.length_cm || attributes.depth_cm || 0} cm`;
    displayItems.push({
      key: "dimensions",
      label: "Dimensões",
      value: String(dims),
      icon: Package,
    });
  }
  if (attributes.material || attributes.composicao) {
    displayItems.push({
      key: "material",
      label: "Material",
      value: String(attributes.material || attributes.composicao),
      icon: Layers,
    });
  }
  if (attributes.voltage || attributes.voltagem || attributes.tensao) {
    displayItems.push({
      key: "voltage",
      label: "Voltagem",
      value: String(attributes.voltage || attributes.voltagem || attributes.tensao),
      icon: Zap,
    });
  }
  if (attributes.power || attributes.potencia) {
    displayItems.push({
      key: "power",
      label: "Potência",
      value: String(attributes.power || attributes.potencia),
      icon: Zap,
    });
  }

  if (displayItems.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono">
          {displayItems.length} item(ns)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {displayItems.map((item) => {
          const IconComponent = item.icon || Info;
          return (
            <div
              key={item.key}
              className={cn(
                "p-3 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-1 shadow-2xs",
                item.highlight && "ring-1 ring-primary/20 bg-primary/5"
              )}
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
