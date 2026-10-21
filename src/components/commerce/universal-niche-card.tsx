import React from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Star,
  ShieldCheck,
  ArrowRight,
  Calendar,
  Users,
  Gauge,
  Sliders,
  Maximize,
  Clock,
  Utensils,
  Truck,
  CreditCard,
  Tag,
} from "lucide-react";
import { Bed, WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import { trackClassifiedWhatsAppClick } from "@/services/classifieds.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface FeaturePill {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: string;
}

export interface UniversalNicheCardProps {
  item: any;
  /**
   * Sobrescrita manual da URL de destino (padrão: "/classificados/$id" ou "/turismo/$id" se item for de turismo).
   */
  targetUrl?: string;
  /**
   * Forçar um nicho específico ("travel" | "vehicles" | "real_estate" | "services" | "food" | "retail" | "events" etc.)
   */
  forcedNiche?: string;
  /**
   * Rótulo customizado para o botão primário (ex: "Reserve agora", "Ver Roteiro", "Ver Imóvel", "Comprar").
   */
  actionLabel?: string;
  /**
   * Callback customizado ao clicar no CTA (se omitido, navega via TanStack Router Link).
   */
  onActionClick?: (item: any) => void;
  className?: string;
}

function getClassifiedCover(item: any): string | null {
  if (!item) return null;
  const imgs = item.images || item.media_urls || item.photos;
  if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
  if (typeof item.cover_image === "string" && item.cover_image) return item.cover_image;
  if (typeof item.image === "string" && item.image) return item.image;
  return null;
}

/**
 * Resolve as 2 pílulas canônicas de destaque da coluna dupla
 * com base no nicho ativo, garantindo isolamento semântico estrito (B.37).
 */
export function resolveNicheFeaturePills(item: any, nicheId: string): [FeaturePill, FeaturePill] {
  const attrs = item.attributes || {};

  switch (nicheId) {
    case "travel":
    case "turismo": {
      // 1. Datas / Duração
      const duration = item.duration_days || attrs.duration_days;
      const dates = attrs.travel_dates || attrs.dates_label || attrs.departure_date;
      const pill1: FeaturePill = {
        icon: Calendar,
        label: "Datas",
        value: dates ? String(dates) : duration ? `${duration} dias` : "Datas flexíveis",
      };

      // 2. Grupo / Vagas / Acomodação
      const groupSize = item.group_size || attrs.group_size || attrs.max_guests;
      const meal = attrs.meal_plan;
      const pill2: FeaturePill = {
        icon: Users,
        label: "Grupo",
        value: groupSize ? `Até ${groupSize} pessoas` : meal ? String(meal) : "Quarto Duplo",
      };
      return [pill1, pill2];
    }

    case "events":
    case "eventos": {
      // 1. Data e Horário
      const eventDate = attrs.event_date || attrs.starts_at || item.starts_at;
      const eventTime = attrs.event_time || attrs.start_time;
      const pill1: FeaturePill = {
        icon: Calendar,
        label: "Data & Hora",
        value: eventDate ? `${eventDate}${eventTime ? ` • ${eventTime}` : ""}` : "Em breve",
      };

      // 2. Classificação ou Lote
      const ageRating = attrs.age_rating || attrs.rating_classification;
      const lotName = attrs.lot_name || "Lote Oficial";
      const pill2: FeaturePill = {
        icon: ShieldCheck,
        label: "Acesso",
        value: ageRating ? `Classif. ${ageRating}` : String(lotName),
      };
      return [pill1, pill2];
    }

    case "vehicles":
    case "veiculos": {
      // 1. Quilometragem
      const km = item.mileage_km ?? attrs.mileage_km ?? attrs.km;
      const pill1: FeaturePill = {
        icon: Gauge,
        label: "Quilometragem",
        value: km !== undefined && km !== null ? `${Number(km).toLocaleString("pt-BR")} km` : "Não informada",
      };

      // 2. Câmbio / Combustível
      const transmission = attrs.transmission || item.transmission;
      const fuel = attrs.fuel_type || item.fuel_type;
      const pill2: FeaturePill = {
        icon: Sliders,
        label: "Câmbio / Motor",
        value: transmission ? `${transmission}${fuel ? ` • ${fuel}` : ""}` : (fuel ? String(fuel) : "Manual"),
      };
      return [pill1, pill2];
    }

    case "real_estate":
    case "imoveis": {
      // 1. Área
      const area = item.area_sqm ?? attrs.area_sqm;
      const pill1: FeaturePill = {
        icon: Maximize,
        label: "Área Privativa",
        value: area ? `${area} m²` : "Consulte área",
      };

      // 2. Quartos / Vagas
      const bedrooms = item.bedrooms ?? attrs.bedrooms;
      const parking = item.parking_spaces ?? attrs.parking_spaces;
      let comp = "";
      if (bedrooms) comp += `${bedrooms} qtos`;
      if (parking) comp += `${comp ? " • " : ""}${parking} vagas`;
      const pill2: FeaturePill = {
        icon: Bed,
        label: "Composição",
        value: comp || (item.deal_type === "temporada" ? "Diária temporada" : "Fino acabamento"),
      };
      return [pill1, pill2];
    }

    case "services":
    case "servicos": {
      // 1. Horário de Atendimento
      const hours = attrs.business_hours || attrs.hours_label || "Seg a Sex • 8h-18h";
      const pill1: FeaturePill = {
        icon: Clock,
        label: "Atendimento",
        value: String(hours),
      };

      // 2. Garantia / Orçamento
      const warranty = attrs.warranty || "Orçamento Gratuito";
      const pill2: FeaturePill = {
        icon: ShieldCheck,
        label: "Garantia",
        value: String(warranty),
      };
      return [pill1, pill2];
    }

    case "food":
    case "gastronomia":
    case "mercado":
    case "convenience": {
      // 1. Tempo de Preparo / Entrega
      const prepTime = attrs.food_prep_time_minutes || attrs.prep_time || "30-45";
      const pill1: FeaturePill = {
        icon: Clock,
        label: "Preparo",
        value: `${prepTime} min`,
      };

      // 2. Porção ou Volume
      const portion = attrs.portion_size || attrs.serves || attrs.volume || "Serve 2 pessoas";
      const pill2: FeaturePill = {
        icon: Utensils,
        label: "Porção",
        value: String(portion),
      };
      return [pill1, pill2];
    }

    default: {
      // Varejo / Produtos em Geral
      // 1. Pagamento / Parcelamento
      const maxInstallments = attrs.max_installments || item.max_installments;
      const pill1: FeaturePill = {
        icon: CreditCard,
        label: "Condição",
        value: Number(maxInstallments) > 1 ? `Até ${maxInstallments}x` : "À vista no Pix",
      };

      // 2. Logística / Envio
      const deliveryMode = item.delivery_mode || attrs.delivery_mode;
      const pill2: FeaturePill = {
        icon: Truck,
        label: "Logística",
        value: deliveryMode === "shipping" ? "Envio Nacional" : deliveryMode === "local_delivery" ? "Entrega Rápida" : "Pronta Entrega",
      };
      return [pill1, pill2];
    }
  }
}

/**
 * UniversalNicheCard — Card de Vitrine de Alta Conversão Padrão Apple HIG
 * Inspirado na anatomia de cards modernos de turismo e generalizado para os 15 nichos.
 *
 * Características Visuais:
 * - Contêiner com cantos canônicos (`rounded-lg`).
 * - Foto de topo com aspect-ratio canônico (aspect-video) e floating pill de destaque ("7 dias", "1º Lote", "2024").
 * - Eyebrow geográfico com ícone de localização.
 * - Título em alto contraste sem corte arbitrário precoce.
 * - Prova social honesta (Regra B.33: estrelas reais se houver, ou badge verificado).
 * - **Hero Feature**: Bloco de Coluna Dupla com ícones circulares e metadados chave do nicho.
 * - Rodapé Comercial: Bloco de preço "A partir de" + CTA primário proeminente ($\ge 44$px / `h-11 min-h-11`).
 */
export function UniversalNicheCard({
  item,
  targetUrl,
  forcedNiche,
  actionLabel,
  onActionClick,
  className,
}: UniversalNicheCardProps) {
  if (!item) return null;

  const itemNiche = resolveClassifiedNiche(item);
  const activeNicheId = forcedNiche || itemNiche.id || item.niche_id || "retail";
  const img = getClassifiedCover(item);
  const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

  // Resolve as 2 pílulas canônicas para este nicho
  const [pill1, pill2] = resolveNicheFeaturePills(item, activeNicheId);

  // Link de destino inteligente
  const resolvedLink =
    targetUrl ||
    (activeNicheId === "travel" || activeNicheId === "turismo"
      ? (item.classified_id ? `/classificados/${item.classified_id}` : `/turismo/${item.id}`)
      : `/classificados/${item.id}`);

  // Floating pill do topo da imagem
  const floatingBadgeText =
    item.duration_days
      ? `${item.duration_days} dias`
      : item.attributes?.duration_days
      ? `${item.attributes.duration_days} dias`
      : item.model_year
      ? `${item.model_year}`
      : item.attributes?.model_year
      ? `${item.attributes.model_year}`
      : item.deal_type === "temporada"
      ? "Temporada"
      : item.deal_type === "aluguel"
      ? "Aluguel"
      : item.is_boosted || item.attributes?.is_boosted
      ? "Destaque"
      : itemNiche.shortLabel || "Destaque";

  // Preço e sufixo comercial
  const priceCents = item.price_cents || item.pricing?.price_cents || 0;
  const isTemporada = item.deal_type === "temporada";
  const isAluguel = item.deal_type === "aluguel";
  const priceSuffix =
    activeNicheId === "travel" || activeNicheId === "turismo"
      ? "/pessoa"
      : itemNiche.priceSuffix || (isAluguel ? "/mês" : isTemporada ? "/diária" : "");

  // Rótulo da Ação Primária
  const defaultActionText =
    activeNicheId === "travel" || activeNicheId === "turismo"
      ? "Reserve agora"
      : activeNicheId === "events" || activeNicheId === "eventos"
      ? "Ingressos"
      : activeNicheId === "real_estate" || activeNicheId === "imoveis"
      ? "Ver Imóvel"
      : activeNicheId === "vehicles" || activeNicheId === "veiculos"
      ? "Ver Veículo"
      : "Ver Detalhes";

  const resolvedActionLabel = actionLabel || defaultActionText;

  // Localização
  const locationText =
    item.location_name ||
    item.destination_city ||
    item.location_text ||
    item.city ||
    "Regional";

  // Avaliações / Prova Social (Regra B.33: Sem estrelas falsas)
  const rating = Number(item.rating || item.avg_rating || 0);
  const reviewsCount = Number(item.reviews_count || item.total_reviews || 0);
  const hasRealReviews = reviewsCount > 0 && rating > 0;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!targetPhone) return;
    trackClassifiedWhatsAppClick({ data: { adId: item.id } }).catch(() => {});
    trackAndOpenWhatsApp(
      targetPhone,
      `Olá! Vi o anúncio "${item.title}" no Waesy e gostaria de mais informações.`,
      {
        classifiedId: item.id,
        classifiedTitle: item.title,
      }
    );
  };

  const handlePrimaryClick = (e: React.MouseEvent) => {
    if (onActionClick) {
      e.preventDefault();
      onActionClick(item);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border/60 bg-card p-4 sm:p-5 hover:border-foreground/30 transition-colors duration-300 motion-reduce:transition-none h-full",
        className
      )}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Foto de Topo com Aspect Ratio Amplo e Bordas Arredondadas (16:10 / 4:3) */}
        <div className="relative aspect-16/10 sm:aspect-4/3 w-full overflow-hidden rounded-lg bg-muted/30 shrink-0">
          <Link
            to={resolvedLink as any}
            className="block size-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ver detalhes de ${item.title}`}
          >
            {img ? (
              <div className="relative size-full overflow-hidden">
                <img
                  src={img}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover blur-lg opacity-30 scale-110 pointer-events-none select-none"
                />
                <img
                  src={img}
                  alt={item.title}
                  className="relative size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none ease-out"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="size-full bg-muted/40 flex items-center justify-center">
                <Tag className="size-8 text-muted-foreground/30" />
              </div>
            )}
          </Link>

          {/* Badge Discreto de Vidro no Canto Superior Direito (Apenas quando houver dado real relevante) */}
          {floatingBadgeText && floatingBadgeText !== "Destaque" && (
            <div className="absolute top-3 right-3 pointer-events-none z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-background/85 backdrop-blur-md text-foreground border border-border/40 font-medium text-xs">
                {floatingBadgeText}
              </span>
            </div>
          )}
        </div>

        {/* Corpo Textual Amplo e Limpo (Zero pills artificiais) */}
        <div className="pt-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Linha Geográfica / Eyebrow Textual Sutil */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium truncate">
              <MapPin className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>

            {/* Título Principal Amplo e Legível */}
            <Link
              to={resolvedLink as any}
              className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md mt-2"
            >
              <h3 className="font-bold text-lg sm:text-xl text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
            </Link>

            {/* Linha de Prova Social Honesta (B.33) — Renderizada Apenas com Dados Reais */}
            {hasRealReviews && (
              <div className="mt-2 flex items-center gap-2 text-xs text-foreground font-medium">
                <Star className="size-4 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-bold font-mono">{rating.toFixed(1)}</span>
                <span className="text-muted-foreground font-normal">
                  ({reviewsCount} {reviewsCount === 1 ? "avaliação" : "avaliações"})
                </span>
              </div>
            )}
          </div>

          {/* ESPECIFICAÇÕES CANÔNICAS: Texto Puro com Ícone Circular (SEM CAIXAS/PILLS) */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/40">
            {/* Atributo 1 */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center text-foreground shrink-0">
                <pill1.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground leading-none block truncate">
                  {pill1.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight block truncate mt-1">
                  {pill1.value}
                </span>
              </div>
            </div>

            {/* Atributo 2 */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center text-foreground shrink-0">
                <pill2.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground leading-none block truncate">
                  {pill2.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight block truncate mt-1">
                  {pill2.value}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Comercial: Preço à esquerda + CTA Primário Proeminente à direita */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3 mt-4">
        {/* Bloco de Preço */}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground font-medium leading-none mb-1">
            A partir de
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
              {priceCents > 0 ? formatMoney(priceCents) : "Consulte"}
            </span>
            {priceSuffix && (
              <span className="text-xs text-muted-foreground font-normal">
                {priceSuffix}
              </span>
            )}
          </div>
        </div>

        {/* Bloco de Ações (WhatsApp Opcional + CTA Primário h-11) */}
        <div className="flex items-center gap-2 shrink-0">
          {targetPhone && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleWhatsApp}
              className="size-11 min-h-11 min-w-11 rounded-lg border-border/60 text-foreground hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              title="Conversar no WhatsApp"
            >
              <WhatsappLogo size={18} weight="fill" />
            </Button>
          )}

          <Button
            asChild
            onClick={handlePrimaryClick}
            className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-2 shrink-0"
          >
            <Link to={resolvedLink as any}>
              <span>{resolvedActionLabel}</span>
              <ArrowRight className="size-4 ml-1 inline" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
