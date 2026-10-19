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
  Briefcase,
  GraduationCap,
  Sparkles,
  Award,
  Smartphone,
  Laptop,
  Check,
  CheckCircle2,
  DollarSign,
  MapPin,
  Utensils,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TeteterisGridView } from "@/components/common/teteterisgrid-view";

export interface SpecDisplayItem {
  key?: string;
  label: string;
  value: string;
  icon?: any;
  highlight?: boolean;
  category?: string;
}

export interface NicheSpecificationsDisplayProps {
  attributes?: Record<string, any> | null;
  items?: SpecDisplayItem[] | Array<{ label: string; value: string; icon?: any; highlight?: boolean; category?: string }> | null;
  nicheId?: string | null;
  className?: string;
  title?: string;
}

/**
 * Mapeador Inteligente de Ícones por Semântica de Rótulo
 */
function resolveSpecIcon(label: string, customIcon?: any) {
  if (customIcon) return customIcon;
  const l = label.toLowerCase();

  if (l.includes("ano") || l.includes("data") || l.includes("fundação") || l.includes("construção")) return Calendar;
  if (l.includes("km") || l.includes("quilometragem") || l.includes("velocidade")) return Gauge;
  if (l.includes("combustível")) return Fuel;
  if (l.includes("câmbio") || l.includes("material") || l.includes("versão") || l.includes("categoria")) return Layers;
  if (l.includes("porta") || l.includes("carroceria") || l.includes("vaga") || l.includes("veículo")) return Car;
  if (l.includes("motor") || l.includes("potência") || l.includes("voltagem") || l.includes("tensão") || l.includes("bateria")) return Zap;
  if (l.includes("placa") || l.includes("blindagem") || l.includes("garantia") || l.includes("seguro")) return ShieldCheck;
  if (l.includes("condição")) return Award;
  if (l.includes("área") || l.includes("tamanho") || l.includes("dimens")) return Ruler;
  if (l.includes("quarto") || l.includes("suíte") || l.includes("banheiro") || l.includes("andar") || l.includes("imóvel")) return HomeIcon;
  if (l.includes("capacidade") || l.includes("hóspede") || l.includes("passageiro") || l.includes("funcionário") || l.includes("rendimento")) return Users;
  if (l.includes("condomínio") || l.includes("iptu") || l.includes("caução") || l.includes("salário") || l.includes("remuneração") || l.includes("faturamento") || l.includes("lucro") || l.includes("taxa")) return DollarSign;
  if (l.includes("duração") || l.includes("horário") || l.includes("preparo") || l.includes("check-in") || l.includes("check-out") || l.includes("tempo")) return Clock;
  if (l.includes("modalidade") || l.includes("atendimento") || l.includes("operador")) return Wrench;
  if (l.includes("cargo") || l.includes("regime") || l.includes("modelo") || l.includes("segmento") || l.includes("negócio")) return Briefcase;
  if (l.includes("escolaridade") || l.includes("experiência") || l.includes("registro") || l.includes("conselho")) return GraduationCap;
  if (l.includes("armazenamento") || l.includes("memória") || l.includes("processador")) return Laptop;
  if (l.includes("console") || l.includes("equipamento") || l.includes("celular")) return Smartphone;
  if (l.includes("peso")) return Scale;
  if (l.includes("destino") || l.includes("região") || l.includes("local")) return MapPin;
  if (l.includes("aliment") || l.includes("refeiç") || l.includes("cardápio")) return Utensils;
  if (l.includes("logística") || l.includes("entrega") || l.includes("envio") || l.includes("traslado")) return Truck;
  if (l.includes("opciona") || l.includes("comodidade") || l.includes("benefício") || l.includes("acessório") || l.includes("procedência")) return CheckCircle2;

  return Info;
}

/**
 * NicheSpecificationsDisplay — Exibição Canônica em Cards Grandes Squircles
 * 
 * Regras Mandatórias:
 * - Destaques Principais (Highlights): Cards grandes squircles com métricas em destaque tipográfico.
 * - Ficha Técnica: Cards squircles compactos e organizados em grade responsiva.
 * - Opcionais/Comodidades: Pills estruturadas com ícones sem quebra visual.
 * - Acessibilidade: Piso tipográfico >= 12px (elimina DL-02 e DL-14).
 * - Espaçamentos na grade canônica de 4px (elimina DL-03).
 */
export function NicheSpecificationsDisplay({
  attributes,
  items: preResolvedItems,
  nicheId,
  className,
  title = "Especificações",
}: NicheSpecificationsDisplayProps) {
  // ── 1. Resolução dos Itens a Exibir ──
  const resolvedList: SpecDisplayItem[] = [];

  if (Array.isArray(preResolvedItems) && preResolvedItems.length > 0) {
    for (const item of preResolvedItems) {
      resolvedList.push({
        label: item.label,
        value: item.value,
        icon: resolveSpecIcon(item.label, item.icon),
        highlight: item.highlight,
        category: item.category,
      });
    }
  } else if (attributes && typeof attributes === "object") {
    // Fallback de extração direta de attributes caso items não venham pré-resolvidos
    if (attributes.brand || attributes.marca) {
      resolvedList.push({ label: "Marca", value: String(attributes.brand || attributes.marca) });
    }
    if (attributes.model || attributes.modelo) {
      resolvedList.push({ label: "Modelo", value: String(attributes.model || attributes.modelo) });
    }
    if (attributes.condition || attributes.condicao) {
      const rawCond = String(attributes.condition || attributes.condicao).toLowerCase();
      const condMap: Record<string, string> = {
        new: "Novo",
        novo: "Novo",
        used: "Usado",
        usado: "Usado",
        seminovo: "Seminovo",
        refurbished: "Revisado",
      };
      resolvedList.push({ label: "Condição", value: condMap[rawCond] || String(attributes.condition || attributes.condicao), highlight: true });
    }
    if (attributes.year || attributes.ano_fabricacao || attributes.ano_modelo) {
      const yr = attributes.ano_fabricacao && attributes.ano_modelo
        ? `${attributes.ano_fabricacao}/${attributes.ano_modelo}`
        : String(attributes.year || attributes.ano_modelo || attributes.ano_fabricacao);
      resolvedList.push({ label: "Ano", value: yr, highlight: true });
    }
    if (attributes.mileage !== undefined || attributes.quilometragem !== undefined || attributes.km !== undefined) {
      const km = Number(attributes.mileage ?? attributes.quilometragem ?? attributes.km);
      if (!isNaN(km)) resolvedList.push({ label: "Quilometragem", value: `${km.toLocaleString("pt-BR")} km`, highlight: true });
    }
    if (attributes.transmission || attributes.cambio) {
      const raw = String(attributes.transmission || attributes.cambio).toLowerCase();
      const cMap: Record<string, string> = { automatic: "Automático", manual: "Manual", cvt: "CVT" };
      resolvedList.push({ label: "Câmbio", value: cMap[raw] || String(attributes.transmission || attributes.cambio), highlight: true });
    }
    if (attributes.fuel_type || attributes.combustivel || attributes.fuel) {
      const raw = String(attributes.fuel_type || attributes.combustivel || attributes.fuel).toLowerCase();
      const fMap: Record<string, string> = { flex: "Flex", gasolina: "Gasolina", etanol: "Etanol", diesel: "Diesel", electric: "Elétrico" };
      resolvedList.push({ label: "Combustível", value: fMap[raw] || String(attributes.fuel_type || attributes.combustivel || attributes.fuel), highlight: true });
    }
    if (attributes.doors || attributes.portas) {
      resolvedList.push({ label: "Portas", value: `${attributes.doors || attributes.portas} Portas` });
    }
    if (attributes.motor || attributes.potencia) {
      resolvedList.push({ label: "Motorização", value: String(attributes.motor || attributes.potencia) });
    }
    if (attributes.usable_area || attributes.area_util || attributes.area_sqm) {
      const a = attributes.usable_area || attributes.area_util || attributes.area_sqm;
      resolvedList.push({ label: "Área Útil", value: `${a} m²`, highlight: true });
    }
    if (attributes.bedrooms || attributes.quartos) {
      resolvedList.push({ label: "Quartos", value: String(attributes.bedrooms || attributes.quartos), highlight: true });
    }
    if (attributes.suites) {
      resolvedList.push({ label: "Suítes", value: String(attributes.suites), highlight: true });
    }
    if (attributes.parking_spaces || attributes.vagas) {
      resolvedList.push({ label: "Vagas", value: String(attributes.parking_spaces || attributes.vagas), highlight: true });
    }
    if (attributes.condo_cents || attributes.condominio) {
      const c = attributes.condo_cents ? `R$ ${(attributes.condo_cents / 100).toFixed(2).replace(".", ",")}` : String(attributes.condominio);
      resolvedList.push({ label: "Condomínio", value: c });
    }
    if (attributes.storage) {
      resolvedList.push({ label: "Armazenamento", value: String(attributes.storage), highlight: true });
    }
    if (attributes.battery_health) {
      resolvedList.push({ label: "Saúde da Bateria", value: `${attributes.battery_health}%`, highlight: true });
    }
    if (attributes.voltage || attributes.voltagem) {
      resolvedList.push({ label: "Voltagem", value: String(attributes.voltage || attributes.voltagem) });
    }
  }

  if (resolvedList.length === 0) return null;

  // ── 2. Separação Semântica: Highlights vs. Pills vs. Ficha Técnica ──
  const isPillItem = (item: SpecDisplayItem) => {
    const l = item.label.toLowerCase();
    const isTagCategory =
      l.includes("opciona") ||
      l.includes("comodidade") ||
      l.includes("benefício") ||
      l.includes("acessório") ||
      l.includes("procedência");
    return isTagCategory && item.value.includes(",");
  };

  const pillItems: SpecDisplayItem[] = [];
  const nonPillItems: SpecDisplayItem[] = [];

  for (const item of resolvedList) {
    if (isPillItem(item)) {
      pillItems.push(item);
    } else {
      nonPillItems.push(item);
    }
  }

  // Identificar destaques principais (highlight === true)
  const explicitHighlights = nonPillItems.filter((i) => i.highlight);
  const remainingSpecs = nonPillItems.filter((i) => !i.highlight);

  // Se houver de 2 a 4 highlights explícitos, usamos eles no bloco de topo.
  // Se não houver nenhum highlight explícito, promovemos os primeiros 4 itens se houver pelo menos 4.
  let topHighlights: SpecDisplayItem[] = [];
  let detailedSpecs: SpecDisplayItem[] = [];

  if (explicitHighlights.length >= 2) {
    topHighlights = explicitHighlights;
    detailedSpecs = remainingSpecs;
  } else if (nonPillItems.length >= 4) {
    topHighlights = nonPillItems.slice(0, 4);
    detailedSpecs = nonPillItems.slice(4);
  } else {
    topHighlights = nonPillItems;
    detailedSpecs = [];
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── CABEÇALHO DA SEÇÃO COM CONTAGEM OFICIAL ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground font-mono font-medium">
          {resolvedList.length} especificação(ões)
        </span>
      </div>

      {/* ── 1. CARDS GRANDES SQUIRCLES: DESTAQUES PRINCIPAIS (TETETERISGRID AUTO-PACKING) ── */}
      {topHighlights.length > 0 && (
        <TeteterisGridView
          items={topHighlights.map((item, idx) => ({
            id: `highlight-${idx}`,
            preferredSpan: topHighlights.length === 3 && idx === 2 ? "4:1" : "auto",
            content: item,
          }))}
          maxCols={4}
          renderCard={(item) => {
            const IconComp = item.icon || resolveSpecIcon(item.label);
            const val = String(item.value || "");
            const isNumericOrShort = /^[0-9.,\sR$kmbL%/+-]+$/i.test(val) || val.length <= 6;
            const valLength = val.length;
            const textSizeClass = valLength > 22
              ? "text-xs sm:text-sm font-semibold"
              : valLength > 12
              ? "text-sm sm:text-base font-bold"
              : "text-base sm:text-lg lg:text-xl font-extrabold";
            const fontFamClass = isNumericOrShort ? "font-mono" : "font-sans";

            return (
              <>
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <IconComp className="size-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-bold uppercase tracking-wider leading-tight break-normal text-wrap">
                    {item.label}
                  </span>
                </div>
                <p className={cn(
                  textSizeClass,
                  fontFamClass,
                  "text-foreground tracking-tight leading-snug break-normal text-wrap hyphens-none pt-1"
                )}>
                  {item.value}
                </p>
              </>
            );
          }}
        />
      )}

      {/* ── 2. GRID TÉCNICO ESTRUTURADO: DETALHES SECUNDÁRIOS ── */}
      {detailedSpecs.length > 0 && (
        <div className="space-y-3 pt-1">
          {topHighlights.length > 0 && (
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ficha Técnica Detalhada
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                {detailedSpecs.length} item(ns)
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {detailedSpecs.map((item, idx) => {
              const IconComp = item.icon || resolveSpecIcon(item.label);
              const isNum = /^[0-9.,\sR$kmbL%/+-]+$/i.test(item.value);
              return (
                <div
                  key={`spec-${idx}`}
                  className="p-4 rounded-lg bg-card border border-border/50 hover:border-border transition-colors flex items-center justify-between gap-3 shadow-2xs min-w-0"
                >
                  <div className="flex items-center gap-2 text-muted-foreground min-w-0 flex-1">
                    <IconComp className="size-4 text-primary/80 shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground leading-tight break-normal text-wrap">
                      {item.label}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs sm:text-sm font-bold text-foreground leading-tight break-normal text-wrap hyphens-none text-right max-w-[55%]",
                    isNum ? "font-mono" : "font-sans"
                  )}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. SQUIRCLE PILLS: OPCIONAIS, COMODIDADES & BENEFÍCIOS ── */}
      {pillItems.length > 0 && (
        <div className="space-y-3 pt-1">
          {pillItems.map((pItem, pIdx) => {
            const pills = pItem.value.split(",").map((s) => s.trim()).filter(Boolean);
            return (
              <div
                key={`pills-${pIdx}`}
                className="rounded-lg border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {pItem.label}
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">
                    {pills.length} item(ns)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pills.map((pill, tagIdx) => (
                    <span
                      key={`pill-tag-${tagIdx}`}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-foreground border border-border/50"
                    >
                      <Check className="size-3 text-primary shrink-0" />
                      <span>{pill}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
