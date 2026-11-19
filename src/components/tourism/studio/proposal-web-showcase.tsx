import React, { useMemo, useState } from "react";
import {
  Bot,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  ExternalLink,
  FileText,
  Film,
  HelpCircle,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Plane,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TravelFlightItineraryCard, type FlightDirectionSegment } from "@/components/classifieds/travel-flight-itinerary-card";
import { FlightRouteMap } from "@/components/tourism/shared/FlightRouteMap";
import { CruiseItinerarySection } from "@/components/tourism/shared/CruiseItinerarySection";
import {
  ProposalCommercialPanel,
  type CommercialPaymentPreference,
} from "@/components/tourism/shared/ProposalCommercialPanel";
import { TourismProposalAiDrawer } from "@/components/tourism/shared/TourismProposalAiDrawer";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import {
  aspectPresetToCssValue,
  buildDefaultWebPageConfig,
  normalizeCruisesList,
  normalizeEntityMediaList,
  normalizeHotelsList,
  normalizeToursList,
  normalizeTransfersList,
  resolveExternalVideoEmbedSrc,
  resolveHeroSlotAspectPreset,
  resolveTransferDisplayTitle,
  resolveTransferKindBadge,
  type ProposalMediaItem,
  type ProposalWebPageBlock,
  type ProposalWebPageDTO,
} from "@/lib/tourism/proposal-normalization";
import { resolveWebShowcaseTheme } from "@/lib/tourism/proposal-theme-palettes";
import { resolveProposalCommercialOffer } from "@/lib/tourism/proposal-payment-calc";
import { calculateQuoteTotals } from "@/lib/tourism/pricing";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function formatBrDate(raw?: string | null): string {
  if (!raw) return "";
  const match = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return String(raw).trim();
}

function MediaItemViewer({
  item,
  altFallback,
  onOpenLightbox,
  defaultAspect = "4 / 3",
  forcedAspect,
  compactCard = false,
}: {
  item: ProposalMediaItem;
  altFallback: string;
  onOpenLightbox?: () => void;
  defaultAspect?: string;
  forcedAspect?: string;
  compactCard?: boolean;
}) {
  const aspectRatio =
    forcedAspect ||
    aspectPresetToCssValue(item.aspectPreset) ||
    (item.aspectPreset === "auto" || item.aspectPreset === "free" ? undefined : defaultAspect);
  const embedSrc = item.type === "video" ? resolveExternalVideoEmbedSrc(item.url) : null;
  const focalPos = item.objectPosition || "50% 50%";
  const focalScale = item.image_scale ?? item.scale;
  const posterUrl = item.video_poster_url || item.posterUrl;

  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-muted/20", compactCard && "h-full flex flex-col")}>
      <div
        className={cn("relative group w-full overflow-hidden bg-muted", compactCard && "flex-1")}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {item.type === "video" ? (
          embedSrc ? (
            <iframe
              src={embedSrc}
              title={item.caption || altFallback}
              className="size-full border-0 min-h-48"
              allowFullScreen
            />
          ) : (
            <video
              src={item.url}
              controls
              preload="metadata"
              poster={posterUrl}
              className="size-full object-cover"
              style={{
                objectPosition: focalPos,
                transform: focalScale && focalScale !== 1 ? `scale(${focalScale})` : undefined,
              }}
            />
          )
        ) : (
          <img
            src={item.url}
            alt={item.caption || altFallback}
            loading="lazy"
            className={cn(
              "size-full transition-transform duration-300 motion-reduce:transition-none",
              item.fit === "contain" ? "object-contain" : "object-cover",
            )}
            style={{
              objectPosition: focalPos,
              transform: focalScale && focalScale !== 1 ? `scale(${focalScale})` : undefined,
            }}
          />
        )}

        {item.type === "video" && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <Badge variant="secondary" className="text-xs font-bold gap-1">
              <Film className="size-3" />
              <span>Vídeo</span>
            </Badge>
          </div>
        )}

        {item.type === "image" && onOpenLightbox && (
          <button
            type="button"
            onClick={onOpenLightbox}
            aria-label={`Ampliar ${item.caption || altFallback}`}
            className="absolute inset-0 bg-foreground/0 hover:bg-foreground/15 transition-colors flex items-end justify-end p-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="h-11 min-h-11 px-3 rounded-lg bg-background/90 border border-border text-foreground text-xs font-semibold inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
              <Maximize2 className="size-3.5" />
              <span>Ampliar</span>
            </span>
          </button>
        )}
      </div>

      {item.caption && (
        <figcaption className="px-3 py-2 bg-card border-t border-border text-xs text-muted-foreground leading-relaxed break-words">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}

export interface ProposalWebShowcaseProps {
  proposal: TravelProposalDTO;
  webPage?: ProposalWebPageDTO | null;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onAcceptClick?: (preference?: CommercialPaymentPreference | null, installments?: number) => void;
  onSelectPayment?: (preference: CommercialPaymentPreference, installments: number) => void;
  onAskAdvisorClick?: () => void;
  whatsappHref?: string | null;
  compactPreview?: boolean;
  supplementarySlot?: React.ReactNode;
}

/**
 * Vitrine Web Editorial dedicada para Propostas de Viagem.
 * Renderiza blocos ordenáveis e editáveis via ProposalWebPageBuilder: Hero rico com
 * carrossel/vídeo, Hospedagens com galerias individuais e lightbox abaixo das infos,
 * Malha Aérea, Traslados nomeados, Passeios com fotos, Roteiro cronológico, Inclusões,
 * Investimento detalhado e Condições Gerais — zero ruído de classificados ou dados fake.
 */
export function ProposalWebShowcase({
  proposal,
  webPage: webPageProp,
  ctaLabel,
  ctaDisabled = false,
  onAcceptClick,
  onSelectPayment,
  onAskAdvisorClick,
  whatsappHref,
  compactPreview = false,
  supplementarySlot,
}: ProposalWebShowcaseProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState<{ items: ProposalMediaItem[]; index: number; title: string } | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const webConfig = useMemo<ProposalWebPageDTO>(() => {
    const base = buildDefaultWebPageConfig(proposal);
    const incoming = webPageProp || proposal.web_page;
    if (!incoming) return base;
    return {
      ...base,
      ...incoming,
      hero_media:
        Array.isArray(incoming.hero_media) && incoming.hero_media.length > 0
          ? incoming.hero_media
          : base.hero_media,
      blocks:
        Array.isArray(incoming.blocks) && incoming.blocks.length > 0
          ? [...incoming.blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          : base.blocks,
    };
  }, [proposal, webPageProp]);

  const hotels = useMemo(() => normalizeHotelsList(proposal.hotels || []), [proposal.hotels]);
  const transfers = useMemo(() => normalizeTransfersList(proposal.transfers || []), [proposal.transfers]);
  const cruises = useMemo(() => normalizeCruisesList((proposal as any).cruises || []), [proposal]);
  const tours = useMemo(() => normalizeToursList(proposal.tours || []), [proposal.tours]);
  const flights = useMemo(() => (Array.isArray(proposal.flights) ? proposal.flights : []), [proposal.flights]);
  const itinerary = useMemo(() => (Array.isArray(proposal.itinerary) ? proposal.itinerary : []), [proposal.itinerary]);

  const heroMedia = useMemo(() => {
    const combined = normalizeEntityMediaList({
      media: webConfig.hero_media,
      featured_image_url: proposal.cover_image_url,
      images:
        typeof proposal.custom_fields?.destination_gallery_urls === "string"
          ? String(proposal.custom_fields.destination_gallery_urls).split(/[\n,|]+/)
          : [],
    });
    if (combined.length > 0) return combined;
    // Se não houver capa definida, usa fotos reais dos hotéis/passeios se disponíveis (sem estoque fake)
    const fallbackReal = [
      ...hotels.flatMap((h) => normalizeEntityMediaList({ media: h.media, images: h.images, image_url: h.image_url })),
      ...tours.flatMap((t) => normalizeEntityMediaList({ media: t.media, images: t.images, image_url: t.image_url })),
    ];
    return normalizeEntityMediaList({ media: fallbackReal }).slice(0, 8);
  }, [webConfig.hero_media, proposal.cover_image_url, proposal.custom_fields?.destination_gallery_urls, hotels, tours]);

  const quoteTotals = useMemo(
    () =>
      calculateQuoteTotals({
        pax_adults: proposal.adults_count,
        pax_children: proposal.children_count,
        rooms: proposal.rooms,
        pricing: proposal.pricing,
        custom_fields: proposal.custom_fields,
      } as any),
    [proposal],
  );

  const mappedFlightSegments: FlightDirectionSegment[] = useMemo(
    () =>
      flights.map((seg, idx) => {
        const direction: "ida" | "volta" | "trecho" =
          seg.type === "return" || String(seg.leg || "").toLowerCase().includes("volt")
            ? "volta"
            : seg.type === "outbound" || String(seg.leg || "").toLowerCase().includes("id") || idx === 0
              ? "ida"
              : "volta";
        const conns = Array.isArray((seg as any).connection_airports)
          ? (seg as any).connection_airports
          : undefined;
        return {
          direction,
          label: direction === "ida" ? "Voo de Ida" : "Voo de Volta",
          date_text: formatBrDate(seg.departure_date),
          airline: seg.airline_name || seg.airline || seg.airline_code || undefined,
          flight_number: seg.flight_number || undefined,
          cabin_class: seg.cabin_class || undefined,
          departure_iata: (seg.origin_iata || seg.origin || "---").slice(0, 3).toUpperCase(),
          departure_city: seg.origin_city || seg.origin || undefined,
          departure_time: seg.departure_time || undefined,
          arrival_iata: (seg.destination_iata || seg.destination || "---").slice(0, 3).toUpperCase(),
          arrival_city: seg.destination_city || seg.destination || undefined,
          arrival_time: seg.arrival_time || undefined,
          stops_count: seg.stops_count ?? seg.stops ?? (conns?.length || 0),
          connection_airports: conns,
          legs: Array.isArray((seg as any).legs) ? (seg as any).legs : undefined,
        };
      }),
    [flights],
  );

  const effectiveCta = ctaLabel || webConfig.cta_label || "Aprovar Proposta";
  const totalCents =
    Number(proposal.pricing?.total_price_cents ?? (proposal.pricing as any)?.total_cents ?? 0) ||
    Math.round(quoteTotals.total * 100);
  const currency = "BRL" as const;
  const paxSummary = `${proposal.adults_count || 1} Adulto(s)${proposal.children_count > 0 ? ` + ${proposal.children_count} Criança(s)` : ""}`;
  const dateRangeText =
    proposal.travel_start_date && proposal.travel_end_date
      ? `${formatBrDate(proposal.travel_start_date)} até ${formatBrDate(proposal.travel_end_date)}`
      : proposal.travel_start_date
        ? formatBrDate(proposal.travel_start_date)
        : "";

  const webTheme = useMemo(
    () => resolveWebShowcaseTheme(webConfig.theme_preset, webConfig.accent_color),
    [webConfig.theme_preset, webConfig.accent_color],
  );
  const isDarkTheme = webTheme.isDark;

  const commercialOffer = useMemo(
    () =>
      resolveProposalCommercialOffer({
        totalCents,
        discountCents: Number(proposal.pricing?.discount_cents || 0),
        pricingInstallments: proposal.pricing?.installments_options,
        validUntil: proposal.valid_until,
        countdownConfig: webConfig.countdown_config,
        availabilityConfig: webConfig.availability_config,
        paymentDisplayConfig: webConfig.payment_display_config,
        trustBadgesConfig: webConfig.trust_badges_config,
      }),
    [totalCents, proposal.pricing, proposal.valid_until, webConfig],
  );

  const isStickyCardEnabled = webConfig.sticky_card_enabled !== false && !compactPreview;

  const handleOpenAiDrawer = () => {
    if (onAskAdvisorClick) {
      onAskAdvisorClick();
    } else {
      setIsAiDrawerOpen(true);
    }
  };

  const commercialNode = (
    <ProposalCommercialPanel
      offer={commercialOffer}
      countdownConfig={webConfig.countdown_config}
      validUntil={proposal.valid_until}
      paxSummary={paxSummary}
      perPersonCents={
        quoteTotals.valorPorPessoa > 0 ? Math.round(quoteTotals.valorPorPessoa * 100) : 0
      }
      hotelsCount={hotels.length}
      flightsCount={flights.length}
      transfersCount={transfers.length}
      toursCount={tours.length}
      paymentTerms={proposal.pricing?.payment_terms}
      ctaLabel={effectiveCta}
      ctaDisabled={ctaDisabled}
      onSelectPayment={onSelectPayment}
      onAcceptClick={onAcceptClick}
      onAskAdvisorClick={handleOpenAiDrawer}
      whatsappHref={whatsappHref}
      isDarkTheme={isDarkTheme}
    />
  );

  const openHeroLightbox = (clickedItem: ProposalMediaItem) => {
    const imgs = heroMedia.filter((m) => m.type === "image");
    setLightboxMedia({
      items: imgs,
      index: Math.max(0, imgs.findIndex((m) => m.url === clickedItem.url)),
      title: proposal.title,
    });
  };

  const renderHeroMediaGallery = () => {
    if (heroMedia.length === 0) return null;
    const heroLay = webConfig.hero_layout || "split";

    if (heroLay === "gallery_mosaic_3" && heroMedia.length >= 2) {
      const m0 = heroMedia[0];
      const m1 = heroMedia[1];
      const m2 = heroMedia[2];
      return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className={m2 ? "md:col-span-8" : "md:col-span-7"}>
            <MediaItemViewer
              item={m0}
              altFallback={proposal.title}
              forcedAspect={aspectPresetToCssValue(m0.aspectPreset) || "16 / 9"}
              onOpenLightbox={m0.type === "image" ? () => openHeroLightbox(m0) : undefined}
            />
          </div>
          <div className={cn("grid grid-cols-1 gap-3", m2 ? "md:col-span-4" : "md:col-span-5")}>
            <MediaItemViewer
              item={m1}
              altFallback={`${proposal.title} 2`}
              forcedAspect={aspectPresetToCssValue(m1.aspectPreset) || "4 / 3"}
              onOpenLightbox={m1.type === "image" ? () => openHeroLightbox(m1) : undefined}
            />
            {m2 && (
              <MediaItemViewer
                item={m2}
                altFallback={`${proposal.title} 3`}
                forcedAspect={aspectPresetToCssValue(m2.aspectPreset) || "4 / 3"}
                onOpenLightbox={m2.type === "image" ? () => openHeroLightbox(m2) : undefined}
              />
            )}
          </div>
        </div>
      );
    }

    if (heroLay === "gallery_bento_4" && heroMedia.length >= 2) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 grid-flow-dense gap-3">
          {heroMedia.slice(0, 6).map((item, idx) => {
            const slotHint = resolveHeroSlotAspectPreset("gallery_bento_4", idx);
            const aspectStr =
              aspectPresetToCssValue(
                item.aspectPreset && item.aspectPreset !== "auto" && item.aspectPreset !== "free"
                  ? item.aspectPreset
                  : slotHint.preset,
              ) || "1 / 1";
            return (
              <div
                key={item.id || idx}
                className={idx === 0 ? "col-span-2 row-span-2" : "col-span-1"}
              >
                <MediaItemViewer
                  item={item}
                  altFallback={`${proposal.title} ${idx + 1}`}
                  forcedAspect={aspectStr}
                  compactCard={true}
                  onOpenLightbox={item.type === "image" ? () => openHeroLightbox(item) : undefined}
                />
              </div>
            );
          })}
        </div>
      );
    }

    const activeHeroItem = heroMedia[heroIdx] || heroMedia[0];
    const defaultAspect = heroLay === "immersive" ? "21 / 9" : "16 / 9";
    return (
      <div className="space-y-3">
        <MediaItemViewer
          item={activeHeroItem}
          altFallback={proposal.title}
          defaultAspect={defaultAspect}
          onOpenLightbox={
            activeHeroItem.type === "image" ? () => openHeroLightbox(activeHeroItem) : undefined
          }
        />
        {heroMedia.length > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHeroIdx((prev) => (prev - 1 + heroMedia.length) % heroMedia.length)}
              aria-label="Mídia anterior"
              className="h-11 min-h-11 px-3 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-4" />
              <span>Anterior</span>
            </Button>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {heroIdx + 1} / {heroMedia.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHeroIdx((prev) => (prev + 1) % heroMedia.length)}
              aria-label="Próxima mídia"
              className="h-11 min-h-11 px-3 gap-1 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Próxima</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
        {heroMedia.length > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {heroMedia.map((m, idx) => (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => setHeroIdx(idx)}
                aria-label={`Ver mídia ${idx + 1}`}
                className={cn(
                  "h-14 rounded-lg overflow-hidden border transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  idx === heroIdx ? "border-primary ring-2 ring-primary/40 opacity-100" : "border-border opacity-75 hover:opacity-100",
                )}
              >
                {m.type === "video" ? (
                  <div className="size-full bg-muted flex items-center justify-center text-foreground">
                    <Film className="size-4" />
                  </div>
                ) : (
                  <img src={m.url} alt="" className="size-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBlock = (block: ProposalWebPageBlock) => {
    if (!block.visible) return null;

    switch (block.type) {
      case "hero": {
        const heroLay = webConfig.hero_layout || "split";
        const isStackedHero =
          heroLay === "immersive" ||
          heroLay === "minimal" ||
          heroLay === "gallery" ||
          heroLay === "gallery_mosaic_3" ||
          heroLay === "gallery_bento_4";

        return (
          <section
            key={block.id}
            style={{ fontFamily: webTheme.bodyFont }}
            className={cn(
              "rounded-2xl border border-border overflow-hidden",
              isDarkTheme ? "bg-foreground text-background" : "bg-card text-foreground",
            )}
          >
            <div className="p-4 sm:p-8 space-y-6">
              {heroLay === "immersive" && heroMedia.length > 0 && renderHeroMediaGallery()}

              {/* Layout Dividido Editorial (Apple / Magazine: Texto à Esquerda, Foto à Direita) */}
              {heroLay === "split" && heroMedia.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {proposal.agency_logo_url && (
                          <img
                            src={proposal.agency_logo_url}
                            alt={proposal.agency_name || "Agência"}
                            className="h-10 w-auto max-w-36 object-contain rounded-lg bg-background p-1 border border-border"
                          />
                        )}
                        <div>
                          <p
                            className={cn(
                              "text-xs font-bold uppercase tracking-wider flex items-center gap-2",
                              isDarkTheme ? "text-background/90" : "text-primary",
                            )}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" aria-hidden="true">
                              <circle cx="4" cy="4" r="4" fill={webTheme.accentReadable} />
                            </svg>
                            <span>{proposal.agency_name || "Consultoria de Viagens"}</span>
                          </p>
                          {proposal.destination_city && (
                            <p
                              className={cn(
                                "text-xs flex items-center gap-1",
                                isDarkTheme ? "text-background/80" : "text-muted-foreground",
                              )}
                            >
                              <MapPin className="size-3.5 shrink-0" />
                              <span>{proposal.destination_city}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {dateRangeText && (
                          <Badge variant="outline" className="text-xs font-semibold gap-1 px-3 py-1">
                            <Calendar className="size-3.5" />
                            <span>{dateRangeText}</span>
                          </Badge>
                        )}
                        {paxSummary && (
                          <Badge variant="outline" className="text-xs font-semibold gap-1 px-3 py-1">
                            <Users className="size-3.5" />
                            <span>{paxSummary}</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h1
                        style={{ fontFamily: webTheme.headingFont }}
                        className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight break-words"
                      >
                        {webConfig.headline || proposal.title}
                      </h1>
                      {(webConfig.subheadline || proposal.subtitle) && (
                        <p
                          className={cn(
                            "text-sm sm:text-base leading-relaxed",
                            isDarkTheme ? "text-background/80" : "text-muted-foreground",
                          )}
                        >
                          {webConfig.subheadline || proposal.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-2">
                    <MediaItemViewer
                      item={heroMedia[0]}
                      altFallback={proposal.title}
                      defaultAspect="4 / 3"
                      onOpenLightbox={
                        heroMedia[0].type === "image" ? () => openHeroLightbox(heroMedia[0]) : undefined
                      }
                    />
                    {heroMedia.length > 1 && (
                      /* design-lint-ignore DL-30 reason:"Trilho horizontal de miniaturas da capa da proposta" expiry:"2027-12-31" */
                      <div className="flex gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pt-1">
                        {heroMedia.slice(1, 5).map((m, mIdx) => (
                          <button
                            key={m.id || mIdx}
                            type="button"
                            onClick={() => openHeroLightbox(m)}
                            aria-label={`Ver foto ${mIdx + 2}`}
                            className="size-14 rounded-lg overflow-hidden border border-border shrink-0 hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img src={m.url} alt="" className="size-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Demais Disposições da Capa (Mosaico 3, Bento 4, Imersivo, Galeria ou Minimal) */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {proposal.agency_logo_url && (
                        <img
                          src={proposal.agency_logo_url}
                          alt={proposal.agency_name || "Agência"}
                          className="h-10 w-auto max-w-36 object-contain rounded-lg bg-background p-1 border border-border"
                        />
                      )}
                      <div>
                        <p
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider flex items-center gap-2",
                            isDarkTheme ? "text-background/90" : "text-primary",
                          )}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" fill={webTheme.accentReadable} />
                          </svg>
                          <span>{proposal.agency_name || "Consultoria de Viagens"}</span>
                        </p>
                        {proposal.destination_city && (
                          <p
                            className={cn(
                              "text-xs flex items-center gap-1",
                              isDarkTheme ? "text-background/80" : "text-muted-foreground",
                            )}
                          >
                            <MapPin className="size-3.5 shrink-0" />
                            <span>{proposal.destination_city}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {dateRangeText && (
                        <Badge variant="outline" className="text-xs font-semibold gap-1 px-3 py-1">
                          <Calendar className="size-3.5" />
                          <span>{dateRangeText}</span>
                        </Badge>
                      )}
                      {paxSummary && (
                        <Badge variant="outline" className="text-xs font-semibold gap-1 px-3 py-1">
                          <Users className="size-3.5" />
                          <span>{paxSummary}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1
                      style={{ fontFamily: webTheme.headingFont }}
                      className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight break-words"
                    >
                      {webConfig.headline || proposal.title}
                    </h1>
                    {(webConfig.subheadline || proposal.subtitle) && (
                      <p
                        className={cn(
                          "text-sm sm:text-base leading-relaxed",
                          isDarkTheme ? "text-background/80" : "text-muted-foreground",
                        )}
                      >
                        {webConfig.subheadline || proposal.subtitle}
                      </p>
                    )}
                  </div>

                  {heroLay !== "immersive" && heroLay !== "minimal" && renderHeroMediaGallery()}
                  {heroLay === "minimal" && heroMedia[0] && (
                    <MediaItemViewer
                      item={heroMedia[0]}
                      altFallback={proposal.title}
                      defaultAspect="4 / 3"
                      onOpenLightbox={
                        heroMedia[0].type === "image" ? () => openHeroLightbox(heroMedia[0]) : undefined
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </section>
        );
      }

      case "summary": {
        return (
          <section key={block.id} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5 text-primary" /> Destino
              </span>
              <p className="text-sm font-bold text-foreground break-words">{proposal.destination_city || "A definir"}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3.5 text-primary" /> Período
              </span>
              <p className="text-sm font-bold text-foreground">{dateRangeText || "Datas flexíveis"}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Users className="size-3.5 text-primary" /> Passageiros
              </span>
              <p className="text-sm font-bold text-foreground">{paxSummary}</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card space-y-1">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3.5 text-primary" /> Hospedagens
              </span>
              <p className="text-sm font-bold text-foreground">{hotels.length} selecionada(s)</p>
            </div>
          </section>
        );
      }

      case "hotels": {
        if (hotels.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                <span>{block.title || "Hospedagens"}</span>
              </h2>
              <Badge variant="outline" className="text-xs font-semibold">
                {hotels.length} unidade(s)
              </Badge>
            </div>

            <div className="space-y-4">
              {hotels.map((hotel, hIdx) => {
                const hotelMedia = normalizeEntityMediaList({
                  media: hotel.media,
                  featured_image_url: hotel.featured_image_url,
                  image_url: hotel.image_url,
                  images: hotel.images,
                  video_url: hotel.video_url,
                  object_position: hotel.object_position,
                  image_scale: hotel.image_scale,
                });
                const hotelPhotosOnly = hotelMedia.filter((m) => m.type === "image");

                return (
                  <article
                    key={hotel.id || hIdx}
                    className="rounded-2xl border border-border bg-card p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">{hotel.hotel_name}</h3>
                        {(hotel.destination || hotel.address) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3.5 shrink-0" />
                            <span>{hotel.address || hotel.destination}</span>
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs font-bold">
                        {hotel.board_basis || "Café da Manhã"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                      <div>
                        <span className="text-muted-foreground block">Check-in</span>
                        <span className="font-bold text-foreground">
                          {formatBrDate(hotel.checkin_date || hotel.check_in) || "A confirmar"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Check-out</span>
                        <span className="font-bold text-foreground">
                          {formatBrDate(hotel.checkout_date || hotel.check_out) || "A confirmar"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Acomodação</span>
                        <span className="font-bold text-foreground">
                          {hotel.room_type || "Apartamento Standard"}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hotel.amenities.map((am: string, aIdx: number) => (
                          <Badge key={aIdx} variant="outline" className="text-xs">
                            {am}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Galeria de Mídias ABAIXO das informações do hotel */}
                    {hotelMedia.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <span className="text-xs font-bold text-muted-foreground block">
                          Galeria de Fotos e Vídeos ({hotelMedia.length})
                        </span>
                        <div
                          className={cn(
                            "grid gap-3",
                            hotelMedia.length === 1
                              ? "grid-cols-1"
                              : hotelMedia.length === 2
                                ? "grid-cols-1 sm:grid-cols-2"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                          )}
                        >
                          {hotelMedia.map((mediaItem, mIdx) => (
                            <MediaItemViewer
                              key={mediaItem.id || mIdx}
                              item={mediaItem}
                              altFallback={`${hotel.hotel_name} ${mIdx + 1}`}
                              defaultAspect="4 / 3"
                              onOpenLightbox={
                                mediaItem.type === "image"
                                  ? () =>
                                      setLightboxMedia({
                                        items: hotelPhotosOnly,
                                        index: Math.max(
                                          0,
                                          hotelPhotosOnly.findIndex((x) => x.url === mediaItem.url),
                                        ),
                                        title: hotel.hotel_name,
                                      })
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      }

      case "flights": {
        if (mappedFlightSegments.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Plane className="size-5 text-primary" />
                <span>{block.title || "Malha Aérea"}</span>
              </h2>
            </div>
            <TravelFlightItineraryCard
              flightDetails={{ segments: mappedFlightSegments }}
              originCity={flights[0]?.origin_city || flights[0]?.origin || undefined}
              destinationCity={proposal.destination_city || undefined}
              departureDateText={formatBrDate(proposal.travel_start_date)}
              returnDateText={formatBrDate(proposal.travel_end_date)}
              showRouteMap={webConfig.show_flight_route_map !== false}
              routeMapTone={webTheme.isDark ? "dark" : "light"}
              routeMapAccentColor={webTheme.accentReadable}
            />
          </section>
        );
      }

      case "flight_route_map": {
        if (mappedFlightSegments.length === 0 || webConfig.show_flight_route_map === false) return null;
        return (
          <section key={block.id} className="space-y-3">
            {block.title && (
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                <MapPin className="size-5 text-primary" />
                <span>{block.title}</span>
              </h2>
            )}
            <FlightRouteMap
              segments={mappedFlightSegments}
              tone={webTheme.isDark ? "dark" : "light"}
              accentColor={webTheme.accentReadable}
            />
          </section>
        );
      }

      case "cruises": {
        if (cruises.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Ship className="size-5 text-primary" />
                <span>{block.title || "Cruzeiro Marítimo & Itinerário Náutico"}</span>
              </h2>
            </div>
            <div className="space-y-6">
              {cruises.map((cr, cIdx) => (
                <CruiseItinerarySection
                  key={cr.id || cIdx}
                  cruise={cr as any}
                  tone={webTheme.isDark ? "dark" : "light"}
                  accentColor={webTheme.accentReadable}
                />
              ))}
            </div>
          </section>
        );
      }

      case "transfers": {
        if (transfers.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Car className="size-5 text-primary" />
                <span>{block.title || "Traslados e Receptivo"}</span>
              </h2>
              <Badge variant="outline" className="text-xs font-semibold">
                {transfers.length} {transfers.length === 1 ? "Trecho" : "Trechos"}
              </Badge>
            </div>
            <div className="w-full flex flex-col gap-4">
              {transfers.map((tr, tIdx) => {
                const seqNum = String(tr.sequence_number ?? tIdx + 1).padStart(2, "0");
                const title = resolveTransferDisplayTitle(tr, tIdx);
                const hasImg = Boolean(tr.image_url);

                return (
                  <div
                    key={tr.id || tIdx}
                    className="w-full p-4 sm:p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors"
                  >
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold shrink-0">
                          {seqNum}
                        </span>
                        <span className="p-2 rounded-lg bg-muted text-primary shrink-0">
                          <Car className="size-4" />
                        </span>
                        <h3 className="text-base font-bold text-foreground leading-snug break-words">
                          {title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-semibold shrink-0">
                          {resolveTransferKindBadge(tr.kind || tr.type)}
                        </Badge>
                        {tr.vehicle && (
                          <span className="px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium shrink-0">
                            Veículo: {tr.vehicle}
                          </span>
                        )}
                        {tr.is_private !== undefined && (
                          <span className="px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium shrink-0">
                            {tr.is_private ? "Privativo" : "Regular"}
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-semibold shrink-0">
                          {tr.included !== false ? "Incluso no pacote" : "Opcional"}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        {tr.date && <span>Data: {formatBrDate(tr.date)}</span>}
                        {tr.pickup_time && <span>Embarque: {tr.pickup_time}</span>}
                        {tr.meeting_point && <span>Ponto de Encontro: {tr.meeting_point}</span>}
                        {tr.luggage_notes && <span>Bagagem: {tr.luggage_notes}</span>}
                      </div>

                      {tr.notes && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pt-1 border-t border-border/60">
                          {tr.notes}
                        </p>
                      )}
                    </div>

                    {hasImg && (
                      <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden border border-border shrink-0">
                        <img
                          src={tr.image_url}
                          alt={title}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      case "tours": {
        if (tours.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                <span>{block.title || "Passeios e Experiências"}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tours.map((tour, tIdx) => {
                const tourMedia = normalizeEntityMediaList({
                  media: tour.media,
                  image_url: tour.image_url,
                  images: tour.images,
                  video_url: tour.video_url,
                });
                const tourPhotos = tourMedia.filter((m) => m.type === "image");

                return (
                  <article
                    key={tour.id || tIdx}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-foreground">{tour.title}</h3>
                      <Badge variant={tour.included === false ? "outline" : "secondary"} className="text-xs shrink-0">
                        {tour.included === false ? "Opcional" : "Incluso"}
                      </Badge>
                    </div>
                    {(tour.date || tour.duration) && (
                      <p className="text-xs text-muted-foreground">
                        {[tour.date ? formatBrDate(tour.date) : null, tour.duration].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {tour.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line break-words">
                        {tour.description}
                      </p>
                    )}
                    {tourMedia.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {tourMedia.map((m, mIdx) => (
                          <MediaItemViewer
                            key={m.id || mIdx}
                            item={m}
                            altFallback={`${tour.title} ${mIdx + 1}`}
                            defaultAspect="4 / 3"
                            onOpenLightbox={
                              m.type === "image"
                                ? () =>
                                    setLightboxMedia({
                                      items: tourPhotos,
                                      index: Math.max(0, tourPhotos.findIndex((x) => x.url === m.url)),
                                      title: tour.title,
                                    })
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      }

      case "itinerary": {
        if (itinerary.length === 0) return null;
        return (
          <section key={block.id} className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span>{block.title || "Roteiro Dia a Dia"}</span>
              </h2>
              <Badge variant="outline" className="text-xs font-semibold">
                {itinerary.length} dia(s)
              </Badge>
            </div>

            <div className="space-y-4">
              {itinerary.map((day, dIdx) => {
                const dayMedia = normalizeEntityMediaList({
                  media: day.media,
                  image_url: day.image_url,
                  images: day.images,
                  video_url: day.video_url,
                  object_position: day.object_position,
                  image_scale: day.image_scale,
                });
                const dayPhotos = dayMedia.filter((m) => m.type === "image");

                return (
                  <article
                    key={day.id || dIdx}
                    className="rounded-xl border border-border bg-card p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="text-xs font-bold">
                          Dia {day.day_number || dIdx + 1}
                        </Badge>
                        {day.date && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatBrDate(day.date)}
                          </span>
                        )}
                        <h3 className="text-base font-bold text-foreground">{day.title}</h3>
                      </div>
                      {day.location && (
                        <Badge variant="outline" className="text-xs">
                          {day.location}
                        </Badge>
                      )}
                    </div>

                    {day.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                        {day.description}
                      </p>
                    )}

                    {Array.isArray(day.included_meals) && day.included_meals.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {day.included_meals.map((meal, mIdx) => (
                          <Badge key={mIdx} variant="secondary" className="text-xs">
                            {meal}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {dayMedia.length > 0 && (
                      <div
                        className={cn(
                          "grid gap-3 pt-2",
                          dayMedia.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
                        )}
                      >
                        {dayMedia.map((m, mIdx) => (
                          <MediaItemViewer
                            key={m.id || mIdx}
                            item={m}
                            altFallback={`${day.title} ${mIdx + 1}`}
                            defaultAspect="16 / 9"
                            onOpenLightbox={
                              m.type === "image"
                                ? () =>
                                    setLightboxMedia({
                                      items: dayPhotos,
                                      index: Math.max(0, dayPhotos.findIndex((x) => x.url === m.url)),
                                      title: day.title,
                                    })
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      }

      case "includes": {
        const inc = Array.isArray(proposal.includes) ? proposal.includes.filter(Boolean) : [];
        const exc = Array.isArray(proposal.excludes) ? proposal.excludes.filter(Boolean) : [];
        if (inc.length === 0 && exc.length === 0) return null;
        return (
          <section key={block.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inc.length > 0 && (
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <h2 className="text-base font-bold text-foreground">O que está incluso</h2>
                <ul className="space-y-2">
                  {inc.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground">
                      <Check className="size-4 text-primary shrink-0 mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {exc.length > 0 && (
              <div className="p-5 rounded-xl border border-border bg-card space-y-3">
                <h2 className="text-base font-bold text-foreground">Não inclui</h2>
                <ul className="space-y-2">
                  {exc.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                      <X className="size-4 shrink-0 mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      }

      case "pricing": {
        if (!Array.isArray(quoteTotals.roomsBreakdown) || quoteTotals.roomsBreakdown.length === 0) return null;
        return (
          <section key={block.id} className="p-5 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <span>{block.title || "Detalhamento de Valores"}</span>
              </h2>
              <span className="text-lg font-bold font-mono text-foreground">
                {formatMoney(totalCents, currency)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quoteTotals.roomsBreakdown.map((rm) => (
                <div key={rm.id} className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{rm.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {rm.adults} Adulto(s){rm.children > 0 ? ` + ${rm.children} Criança(s)` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold font-mono text-foreground">
                    {formatMoney(Math.round(rm.totalReais * 100), currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      }

      case "conditions": {
        const boarding = String(proposal.custom_fields?.boarding_requirements || proposal.boarding_requirements || "").trim();
        const cancel = String(proposal.custom_fields?.cancellation_policy || proposal.cancellation_policy || "").trim();
        if (!boarding && !cancel) return null;
        return (
          <section key={block.id} className="p-5 rounded-xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <span>{block.title || "Condições Gerais"}</span>
            </h2>
            {boarding && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Documentação e Embarque</h3>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line break-words">{boarding}</p>
              </div>
            )}
            {cancel && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase text-muted-foreground">Política de Cancelamento</h3>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line break-words">{cancel}</p>
              </div>
            )}
          </section>
        );
      }

      case "faq": {
        const faqList = (block.faqItems || []).filter((fq) => fq.question?.trim() && fq.answer?.trim());
        if (faqList.length === 0) return null;
        return (
          <section key={block.id} className="p-5 rounded-xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-5 text-primary" />
              <span>{block.title || "Dúvidas Frequentes"}</span>
            </h2>
            <div className="divide-y divide-border">
              {faqList.map((fq, idx) => (
                <div key={fq.id || idx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <h3 className="text-sm font-bold text-foreground break-words">{fq.question}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                    {fq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      }

      case "urgency_banner": {
        if (!block.title && !block.body && !block.subtitle) return null;
        return (
          <section key={block.id} className="p-4 rounded-xl border border-warning/40 bg-warning/10 flex items-start gap-3">
            <Clock className="size-5 text-warning-strong shrink-0 mt-1" />
            <div className="space-y-1">
              {block.title && <h2 className="text-sm font-bold text-foreground break-words">{block.title}</h2>}
              {block.subtitle && <p className="text-xs text-muted-foreground">{block.subtitle}</p>}
              {block.body && (
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                  {block.body}
                </p>
              )}
            </div>
          </section>
        );
      }

      case "gallery":
      case "video":
      case "custom_text": {
        const customMedia = normalizeEntityMediaList({ media: block.media });
        const customPhotos = customMedia.filter((m) => m.type === "image");
        if (!block.title && !block.body && customMedia.length === 0) return null;

        return (
          <section key={block.id} className="p-5 rounded-xl border border-border bg-card space-y-4">
            {block.title && (
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>{block.title}</span>
                </h2>
                {block.subtitle && (
                  <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                )}
              </div>
            )}
            {block.body && (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                {block.body}
              </p>
            )}
            {customMedia.length > 0 && (
              <div
                className={cn(
                  "grid gap-3",
                  customMedia.length === 1
                    ? "grid-cols-1"
                    : customMedia.length === 2
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {customMedia.map((item, idx) => (
                  <MediaItemViewer
                    key={item.id || idx}
                    item={item}
                    altFallback={block.title || `Mídia ${idx + 1}`}
                    defaultAspect={item.type === "video" ? "16 / 9" : "4 / 3"}
                    onOpenLightbox={
                      item.type === "image"
                        ? () =>
                            setLightboxMedia({
                              items: customPhotos,
                              index: Math.max(0, customPhotos.findIndex((x) => x.url === item.url)),
                              title: block.title || "Galeria",
                            })
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        );
      }

      case "simulation_disclaimer": {
        if (webConfig.show_simulation_disclaimer === false) return null;
        const disclaimerText =
          webConfig.simulation_disclaimer_text ||
          "Esta proposta constitui uma cotação e simulação preliminar. Valores, disponibilidades e tarifas aéreas ou hoteleiras estão sujeitos a confirmação final pela agência e operadoras no ato da emissão formal.";
        return (
          <section key={block.id} className="p-4 sm:p-5 rounded-2xl border border-warning/40 bg-warning/5 space-y-2">
            <div className="flex items-start gap-3">
              <ShieldAlert className="size-5 text-warning-strong shrink-0 mt-1" />
              <div className="space-y-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {block.title || "Aviso Legal de Simulação Orçamentária"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                  {disclaimerText}
                </p>
              </div>
            </div>
          </section>
        );
      }

      case "related_packages": {
        if (webConfig.show_related_packages === false) return null;
        const title = webConfig.related_packages_title || block.title || "Você Também Pode Gostar";
        const hasMultipleOpts = Array.isArray(proposal.options) && proposal.options.length > 1;

        return (
          <section key={block.id} className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                <span>{title}</span>
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Explore outros roteiros e experiências selecionadas com consultoria personalizada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasMultipleOpts ? (
                proposal.options.slice(0, 4).map((opt, oIdx) => {
                  const optPrice = opt.pricing?.total_price_cents || 0;
                  const optHotel = opt.hotel_name || opt.hotels?.[0]?.hotel_name || "Hospedagem Selecionada";
                  return (
                    <div key={opt.id || oIdx} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">{opt.badge || `Opção ${oIdx + 1}`}</Badge>
                          {optPrice > 0 && <span className="text-xs font-bold font-mono text-primary">{formatMoney(optPrice)}</span>}
                        </div>
                        <h3 className="text-sm font-bold text-foreground">{opt.name || `Roteiro Alternativo ${oIdx + 1}`}</h3>
                        <p className="text-xs text-muted-foreground">{optHotel}</p>
                      </div>
                      {whatsappHref && (
                        <Button asChild variant="outline" size="sm" className="h-11 min-h-11 w-full rounded-lg font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="size-4 text-emerald-600" />
                            <span>Consultar no WhatsApp</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs font-semibold">Destinos em Alta</Badge>
                      <h3 className="text-sm font-bold text-foreground">Resorts & Praias do Nordeste</h3>
                      <p className="text-xs text-muted-foreground">Pacotes completos com aéreo saindo da sua região.</p>
                    </div>
                    {whatsappHref && (
                      <Button asChild variant="outline" size="sm" className="h-11 min-h-11 w-full rounded-lg font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-4 text-emerald-600" />
                          <span>Consultar no WhatsApp</span>
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs font-semibold">Cruzeiros & Navegação</Badge>
                      <h3 className="text-sm font-bold text-foreground">Temporada Brasileira & Internacional</h3>
                      <p className="text-xs text-muted-foreground">Cabines com pensão completa e entretenimento a bordo.</p>
                    </div>
                    {whatsappHref && (
                      <Button asChild variant="outline" size="sm" className="h-11 min-h-11 w-full rounded-lg font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-4 text-emerald-600" />
                          <span>Ver Disponibilidade</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        );
      }

      case "promo_banner": {
        if (!webConfig.promo_banner_url) return null;
        return (
          <section key={block.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <a
              href={webConfig.promo_banner_link || "#"}
              target={webConfig.promo_banner_link ? "_blank" : undefined}
              rel="noreferrer"
              className="block group relative overflow-hidden"
            >
              <img
                src={webConfig.promo_banner_url}
                alt="Banner promocional da agência"
                className="w-full h-auto max-h-72 object-cover group-hover:opacity-95 transition-opacity duration-300"
              />
            </a>
          </section>
        );
      }

      case "cta": {
        if (!onAcceptClick) return null;
        return (
          <section key={block.id} className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-foreground">{block.title || "Pronto para reservar?"}</h2>
              {block.subtitle && <p className="text-xs text-muted-foreground">{block.subtitle}</p>}
            </div>
            <Button
              type="button"
              disabled={ctaDisabled}
              onClick={() => onAcceptClick?.()}
              className="h-11 min-h-11 px-6 rounded-xl text-sm font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="size-4" />
              <span>{block.ctaLabel || effectiveCta}</span>
            </Button>
          </section>
        );
      }

      default:
        return null;
    }
  };

  const heroBlock = webConfig.blocks.find((b) => b.type === "hero");
  const heroLay = webConfig.hero_layout || "split";
  const isStackedHero =
    heroLay === "immersive" ||
    heroLay === "minimal" ||
    heroLay === "gallery" ||
    heroLay === "gallery_mosaic_3" ||
    heroLay === "gallery_bento_4";

  const nonHeroBlocks = webConfig.blocks.filter((b) => b.type !== "hero" && b.type !== "cta");
  const ctaBlocks = webConfig.blocks.filter((b) => b.type === "cta");
  const blocksBeforeCta = webConfig.blocks.filter((b) => b.type !== "cta");

  return (
    <div className="space-y-6 pb-24 sm:pb-8 relative">
      {/* Capa / Hero Full-Width (Conforme padrão canônico ClassifiedDetailDesktop) */}
      {heroBlock && renderBlock(heroBlock)}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        {/* Coluna Esquerda: Conteúdo Editorial e Seções do Roteiro */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
          {/* No Mobile (< lg), o Card Comercial aparece no topo do roteiro logo após a capa */}
          <div className="lg:hidden">
            {commercialNode}
          </div>
          {nonHeroBlocks.map((block) => renderBlock(block))}
          {supplementarySlot}
          {ctaBlocks.map((block) => renderBlock(block))}
        </div>

        {/* Coluna Direita: Card Comercial Fixo / Sticky que Acompanha o Scroll no Desktop */}
        <aside
          className={cn(
            "hidden lg:block lg:col-span-5 xl:col-span-4 self-start space-y-4",
            isStickyCardEnabled && "lg:sticky lg:top-4 sm:lg:top-6",
          )}
        >
          {commercialNode}
        </aside>
      </div>

      {/* Barra Fixa no Rodapé Mobile (Piso 44px, WCAG 2.2 AA) */}
      {!compactPreview && (
        <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe bg-card/95 backdrop-blur border-t border-border p-3 flex items-center justify-between lg:hidden">
          <div className="space-y-1 min-w-0 pr-2">
            <p className="text-xs font-medium text-muted-foreground truncate">Total do Pacote</p>
            <p className="text-base font-bold text-foreground leading-tight">
              {formatMoney(commercialOffer.totalCents, currency)}
            </p>
            {commercialOffer.installmentTable.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {commercialOffer.installmentTable[commercialOffer.installmentTable.length - 1].count}x de{" "}
                {formatMoney(
                  commercialOffer.installmentTable[commercialOffer.installmentTable.length - 1].installmentCents,
                  currency,
                )}
                {commercialOffer.interestFree ? " sem juros" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {webConfig.ai_advisor_enabled !== false && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleOpenAiDrawer}
                aria-label="Falar com Consultor IA"
                className="size-11 min-h-11 min-w-11 rounded-xl border-warning/40 text-warning-strong bg-warning/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bot className="size-5" />
              </Button>
            )}
            <Button
              type="button"
              onClick={() => onAcceptClick?.()}
              disabled={ctaDisabled}
              className="h-11 min-h-11 px-4 sm:px-5 rounded-xl font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="size-4" />
              <span>{effectiveCta}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Botão Flutuante de Consultor IA no Desktop */}
      {webConfig.ai_advisor_enabled !== false && !compactPreview && (
        <button
          type="button"
          onClick={handleOpenAiDrawer}
          className="fixed bottom-6 right-6 z-30 hidden lg:flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-transform duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Falar com Consultor de Viagens IA"
        >
          <Bot className="size-5 text-primary-foreground" />
          <span className="text-xs font-bold tracking-wide">Dúvidas sobre o Roteiro? Fale com a IA</span>
        </button>
      )}

      {/* Drawer de Atendimento Consultor IA */}
      {webConfig.ai_advisor_enabled !== false && (
        <TourismProposalAiDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          proposal={proposal}
          customPrompt={webConfig.ai_advisor_prompt}
          agencyPhone={webConfig.whatsapp_phone || proposal.agency_whatsapp || proposal.client_whatsapp}
        />
      )}

      <Dialog open={Boolean(lightboxMedia)} onOpenChange={(o) => !o && setLightboxMedia(null)}>
        <DialogContent className="sm:max-w-4xl p-4 sm:p-6 bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold break-words">
              {lightboxMedia?.title} ({(lightboxMedia?.index ?? 0) + 1}/{lightboxMedia?.items.length ?? 0})
            </DialogTitle>
          </DialogHeader>
          {lightboxMedia && lightboxMedia.items[lightboxMedia.index] && (
            <div className="space-y-3">
              <div className="w-full overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={lightboxMedia.items[lightboxMedia.index].url}
                  alt={lightboxMedia.items[lightboxMedia.index].caption || lightboxMedia.title}
                  className="w-full max-h-96 object-contain mx-auto"
                />
              </div>
              {lightboxMedia.items[lightboxMedia.index].caption && (
                <p className="text-xs text-muted-foreground text-center">
                  {lightboxMedia.items[lightboxMedia.index].caption}
                </p>
              )}
              {lightboxMedia.items.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLightboxMedia((prev) =>
                        prev
                          ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length }
                          : null,
                      )
                    }
                    className="h-11 min-h-11 px-4 gap-1"
                  >
                    <ChevronLeft className="size-4" />
                    <span>Anterior</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLightboxMedia((prev) =>
                        prev
                          ? { ...prev, index: (prev.index + 1) % prev.items.length }
                          : null,
                      )
                    }
                    className="h-11 min-h-11 px-4 gap-1"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
