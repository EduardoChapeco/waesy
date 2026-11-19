import React from "react";
import { Car, Ship } from "lucide-react";
import type { ProposalCanvasFormat, CruiseDTO } from "@/services/travel-proposal.functions";
import type { ResolvedProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import type { ProposalRoomBreakdownItem } from "@/lib/tourism/pricing";
import { FlightRouteSvgMap } from "@/components/tourism/shared/FlightRouteSvgMap";
import { CruiseItinerarySection } from "@/components/tourism/shared/CruiseItinerarySection";
import type { FlightSegmentRouteInput } from "@/lib/tourism/flight-route-geometry";
import {
  aspectPresetToCssValue,
  normalizeEntityMediaList,
  resolveTransferDisplayTitle,
  resolveTransferKindBadge,
  type ProposalMediaItem,
} from "@/lib/tourism/proposal-normalization";

export function getTransferTitle(t: Record<string, any>, idx = 0): string {
  return resolveTransferDisplayTitle(t, idx);
}

export function getTransferBadgeLabel(type?: string | null, kind?: string | null): string {
  if (kind) return resolveTransferKindBadge(kind);
  if (type === "shared") return "Regular";
  if (type === "in_out") return "Ida e Volta";
  if (!type || type === "private") return "Privativo";
  return type;
}

export function getTransferMetaLine(
  t: Record<string, any>,
  formatDateFn: (d?: string | null) => string,
): string {
  const parts: string[] = [];
  if (t.route) parts.push(`Rota: ${t.route}`);
  if (t.vehicle) parts.push(`Veículo: ${t.vehicle}`);
  if (t.pickup_time) parts.push(`Embarque: ${t.pickup_time}`);
  if (t.dropoff_time) parts.push(`Chegada: ${t.dropoff_time}`);
  if (t.date) parts.push(`Data: ${formatDateFn(t.date)}`);
  return parts.join(" · ");
}

export function getTourMetaLine(tour: Record<string, any>): string {
  const parts: string[] = [];
  if (tour.date) parts.push(`Programação: ${tour.date}`);
  if (tour.duration) parts.push(`Duração: ${tour.duration}`);
  if (typeof tour.included === "boolean") {
    parts.push(tour.included ? "Incluso no pacote" : "Opcional (não incluso)");
  }
  return parts.join(" · ");
}

export function ProposalAgencyLogo({
  agency,
  theme,
  variant = "hero",
  className = "",
}: {
  agency?: { name?: string | null; logo_url?: string | null } | null;
  theme: ResolvedProposalCanvasTheme;
  variant?: "hero" | "surface";
  className?: string;
}) {
  const cfg = theme.logoConfig;
  const logoUrl = agency?.logo_url || "";
  const agencyName = agency?.name || "Agência";

  const alignClass =
    cfg.position === "center"
      ? "justify-center text-center"
      : cfg.position === "right"
        ? "justify-end text-right"
        : "justify-start text-left";

  const sizeMap: Record<typeof cfg.size, { box: string; imgH: string }> = {
    sm: { box: "h-9 px-3", imgH: "h-7 max-w-32" },
    md: { box: "h-12 px-3", imgH: "h-9 max-w-40" },
    lg: { box: "h-16 px-4", imgH: "h-12 max-w-52" },
    xl: { box: "h-20 px-5", imgH: "h-16 max-w-64" },
  };
  const sz = sizeMap[cfg.size] || sizeMap.md;

  const shapeClass =
    cfg.shape === "circle"
      ? "rounded-full aspect-square overflow-hidden p-0"
      : cfg.shape === "square"
        ? "rounded-xl aspect-square overflow-hidden p-2"
        : cfg.shape === "wide"
          ? "rounded-xl overflow-hidden px-3 py-2"
          : "rounded-xl overflow-hidden";

  const isBadge = cfg.position === "badge" || cfg.shape === "circle" || cfg.shape === "square";
  const badgeClass =
    variant === "hero"
      ? isBadge
        ? "p-surface-card border p-border-main p-text-ink"
        : "p-text-on-dark"
      : isBadge
        ? "p-surface-subtle border p-border-main p-text-ink"
        : "p-text-ink";

  return (
    <div className={`flex items-center ${alignClass} ${className}`}>
      {logoUrl ? (
        <div
          className={`inline-flex items-center justify-center ${shapeClass} ${isBadge ? sz.box : ""} ${badgeClass}`}
        >
          <img
            src={logoUrl}
            alt={agencyName}
            crossOrigin="anonymous"
            className={`${
              cfg.shape === "circle" || cfg.shape === "square"
                ? "w-full h-full object-cover"
                : `${sz.imgH} w-auto object-contain`
            }`}
            style={{
              objectPosition: cfg.objectPosition || "center center",
              transform: cfg.scale && cfg.scale !== 1 ? `scale(${cfg.scale})` : undefined,
            }}
          />
        </div>
      ) : (
        <span
          className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest border ${
            variant === "hero"
              ? "p-surface-brand border-current/20"
              : "p-surface-subtle p-border-main p-text-ink"
          }`}
        >
          {agencyName}
        </span>
      )}
    </div>
  );
}

export function ProposalAdaptiveImage({
  src,
  alt,
  objectPosition = "center center",
  scale = 1,
  fit = "cover",
  className = "",
  imgClassName = "",
}: {
  src: string;
  alt: string;
  objectPosition?: string;
  scale?: number;
  fit?: "cover" | "contain";
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-300 ${imgClassName}`}
        style={{
          objectPosition: objectPosition || "center center",
          transform: scale && scale !== 1 ? `scale(${scale})` : undefined,
        }}
      />
    </div>
  );
}

export function ProposalMultiNicheSpecsBlock({
  theme,
  className = "",
}: {
  theme: ResolvedProposalCanvasTheme;
  className?: string;
}) {
  const entries = theme.nicheSpecEntries || [];
  if (entries.length === 0) return null;

  const colsClass =
    entries.length === 1
      ? "grid-cols-1"
      : entries.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : entries.length === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <section className={`break-inside-avoid space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 pb-2 border-b p-border-main">
        <h3 className="text-lg font-bold p-text-ink p-heading-font">
          {theme.nicheCopy.specsSectionTitle}
        </h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full p-surface-brand-soft border p-border-brand p-text-brand">
          {theme.nicheCopy.label}
        </span>
      </div>
      <div className={`grid ${colsClass} gap-3`}>
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="p-surface-subtle border p-border-subtle rounded-xl p-4 flex flex-col justify-between"
          >
            <span className="text-xs font-bold uppercase tracking-wider p-text-faint mb-1">
              {entry.label}
            </span>
            <span className="text-sm font-bold p-text-ink break-words">
              {entry.value}{entry.unit && !entry.value.includes(entry.unit) ? ` ${entry.unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProposalItineraryMediaGrid({
  images,
  title,
  objectPosition = "center center",
  scale = 1,
  className = "",
}: {
  images?: string[] | null;
  title?: string;
  objectPosition?: string;
  scale?: number;
  className?: string;
}) {
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (validImages.length === 0) return null;

  if (validImages.length === 1) {
    return (
      <div className={`mt-3 rounded-xl overflow-hidden border p-border-subtle h-48 ${className}`}>
        <ProposalAdaptiveImage
          src={validImages[0]}
          alt={title || "Imagem da etapa"}
          objectPosition={objectPosition}
          scale={scale}
          className="w-full h-full"
        />
      </div>
    );
  }

  if (validImages.length === 2) {
    return (
      <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 h-48 ${className}`}>
        {validImages.slice(0, 2).map((img, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden border p-border-subtle h-full">
            <ProposalAdaptiveImage
              src={img}
              alt={`${title || "Etapa"} - ${idx + 1}`}
              objectPosition={objectPosition}
              scale={scale}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {validImages.slice(0, 6).map((img, idx) => (
        <div
          key={idx}
          className={`rounded-xl overflow-hidden border p-border-subtle ${
            validImages.length === 3 && idx === 0 ? "sm:col-span-2 h-56" : "h-44"
          }`}
        >
          <ProposalAdaptiveImage
            src={img}
            alt={`${title || "Etapa"} - ${idx + 1}`}
            objectPosition={objectPosition}
            scale={scale}
            className="w-full h-full"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Galeria dedicada para seções de Hospedagem em todas as lâminas e PDFs.
 * Exibe todas as fotos reais cadastradas no hotel (1 a 6+), respeitando o recorte
 * individual e proporção configurada, omitindo-se limpo se não houver fotos (B.33).
 */
export function ProposalHotelMediaGallery({
  images,
  media,
  title,
  objectPosition,
  scale = 1,
  className = "",
}: {
  images?: string[] | null;
  media?: ProposalMediaItem[] | null;
  title?: string;
  objectPosition?: string;
  scale?: number;
  className?: string;
}) {
  const normalized = normalizeEntityMediaList({
    media,
    images,
    object_position: objectPosition,
    image_scale: scale,
  }).filter((item) => item.type === "image");

  if (normalized.length === 0) return null;

  const displayed = normalized.slice(0, 6);

  return (
    <div
      className={`mt-4 grid gap-3 ${
        displayed.length === 1
          ? "grid-cols-1"
          : displayed.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3"
      } ${className}`}
    >
      {displayed.map((item, idx) => {
        const aspectRatio = aspectPresetToCssValue(item.aspectPreset) || (displayed.length === 1 ? "16 / 9" : "4 / 3");
        return (
          <figure
            key={item.id || idx}
            className={`rounded-lg overflow-hidden border p-border-subtle p-surface-subtle ${
              displayed.length === 4 && idx === 0 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div style={{ aspectRatio }} className="w-full overflow-hidden">
              <ProposalAdaptiveImage
                src={item.url}
                alt={item.caption || `${title || "Hospedagem"} — Foto ${idx + 1}`}
                objectPosition={item.objectPosition || objectPosition}
                scale={item.scale ?? scale}
                fit={item.fit || "cover"}
                className="w-full h-full"
              />
            </div>
            {item.caption && (
              <figcaption className="px-2 py-1 text-xs p-text-muted break-words">
                {item.caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

export function ProposalDestinationGallerySection({
  images,
  title = "Galeria Visual",
  theme,
  className = "",
}: {
  images?: string[] | null;
  title?: string;
  theme: ResolvedProposalCanvasTheme;
  className?: string;
}) {
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (validImages.length === 0) return null;

  return (
    <section className={`break-inside-avoid space-y-4 ${className}`}>
      <h3 className="text-xl font-bold p-text-ink pb-2 border-b p-border-main p-heading-font">
        {title}
      </h3>
      {validImages.length === 1 ? (
        <div className="rounded-2xl overflow-hidden border p-border-main h-64">
          <ProposalAdaptiveImage
            src={validImages[0]}
            alt={title}
            objectPosition={theme.coverCrop.objectPosition}
            className="w-full h-full"
          />
        </div>
      ) : validImages.length === 2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-60">
          {validImages.map((img, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden border p-border-main h-full">
              <ProposalAdaptiveImage src={img} alt={`${title} ${idx + 1}`} className="w-full h-full" />
            </div>
          ))}
        </div>
      ) : validImages.length === 3 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-64">
          <div className="sm:col-span-2 rounded-2xl overflow-hidden border p-border-main h-full">
            <ProposalAdaptiveImage src={validImages[0]} alt={`${title} 1`} className="w-full h-full" />
          </div>
          <div className="sm:col-span-1 flex flex-col gap-3 h-full">
            {validImages.slice(1, 3).map((img, idx) => (
              <div key={idx} className="flex-1 rounded-2xl overflow-hidden border p-border-main min-h-0">
                <ProposalAdaptiveImage src={img} alt={`${title} ${idx + 2}`} className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {validImages.slice(0, 8).map((img, idx) => (
            <div
              key={idx}
              className={`rounded-2xl overflow-hidden border p-border-main ${
                idx === 0 ? "col-span-2 row-span-2 h-64" : "h-32"
              }`}
            >
              <ProposalAdaptiveImage src={img} alt={`${title} ${idx + 1}`} className="w-full h-full" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProposalPricingBreakdownBlock({
  totals,
  theme,
  formatCurrency,
  currency = "BRL",
  className = "",
}: {
  totals: {
    paxTotal: number;
    adultosTotal: number;
    criancasTotal: number;
    valorPorPessoa: number;
    valorPorAdulto: number;
    roomsBreakdown: ProposalRoomBreakdownItem[];
  };
  theme: ResolvedProposalCanvasTheme;
  formatCurrency: (val: number, currency?: string) => string;
  currency?: string;
  className?: string;
}) {
  const showPerPerson =
    theme.pricingDisplay.showPerPerson &&
    totals.valorPorPessoa > 0 &&
    (totals.paxTotal > 1 || Boolean(theme.pricingDisplay.customPricePerPersonCents));

  const rooms = theme.pricingDisplay.showPerRoom ? totals.roomsBreakdown || [] : [];
  if (!showPerPerson && rooms.length === 0) return null;

  const isTourism = theme.nicheId === "tourism";

  return (
    <div className={`mt-5 space-y-4 break-inside-avoid ${className}`}>
      {showPerPerson && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-surface-card border p-border-main rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest p-text-faint">
                {isTourism ? "Valor por Pessoa / Viajante" : "Valor Unitário / Por Participante"}
              </p>
              <p className="text-xs p-text-muted mt-1">
                Base: {totals.adultosTotal} adulto{totals.adultosTotal > 1 ? "s" : ""}
                {totals.criancasTotal > 0
                  ? ` + ${totals.criancasTotal} criança${totals.criancasTotal > 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
            <p className="text-xl font-bold p-text-brand shrink-0">
              {formatCurrency(totals.valorPorPessoa, currency)}
            </p>
          </div>

          {theme.pricingDisplay.showPerAdult &&
            totals.adultosTotal > 0 &&
            Math.abs(totals.valorPorAdulto - totals.valorPorPessoa) >= 1 && (
              <div className="p-surface-card border p-border-main rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest p-text-faint">
                    {isTourism ? "Média por Adulto Pagante" : "Referência por Titular"}
                  </p>
                  <p className="text-xs p-text-muted mt-1">
                    Cálculo proporcional para {totals.adultosTotal} adulto{totals.adultosTotal > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-lg font-bold p-text-ink shrink-0">
                  {formatCurrency(totals.valorPorAdulto, currency)}
                </p>
              </div>
            )}
        </div>
      )}

      {rooms.length > 0 && (
        <div className="p-surface-card border p-border-main rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b p-border-subtle">
            <h4 className="text-xs font-bold uppercase tracking-widest p-text-ink">
              {isTourism ? "Valores por Quarto / Acomodação" : "Detalhamento por Unidade / Lote"}
            </h4>
            <span className="text-xs font-bold px-3 py-1 rounded-full p-surface-brand-soft border p-border-brand p-text-brand">
              {rooms.length} {rooms.length === 1 ? (isTourism ? "Quarto" : "Unidade") : isTourism ? "Quartos" : "Unidades"}
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              rooms.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
            }`}
          >
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-surface-subtle border p-border-subtle rounded-xl p-4 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold p-text-ink">{room.label}</p>
                    <p className="text-xs p-text-muted mt-1">
                      {room.adults} Adulto{room.adults > 1 ? "s" : ""}
                      {room.children > 0
                        ? ` + ${room.children} Criança${room.children > 1 ? "s" : ""}`
                        : ""}
                      {room.boardBasis ? ` · ${room.boardBasis}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold p-text-brand">
                      {formatCurrency(room.totalReais, currency)}
                    </p>
                    {room.adults + room.children > 1 && (
                      <p className="text-xs font-semibold p-text-muted">
                        {formatCurrency(room.perPersonReais, currency)} / pessoa
                      </p>
                    )}
                  </div>
                </div>
                {room.notes && (
                  <p className="text-xs p-text-muted pt-2 border-t p-border-subtle">
                    {room.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentPage({
  children,
  format = "a4-portrait",
  className = "",
}: {
  children: React.ReactNode;
  format?: ProposalCanvasFormat;
  className?: string;
}) {
  let minHeight = "1123px";
  let pageClass = "a4-page";

  if (format === "a4-landscape") {
    minHeight = "794px";
    pageClass = "a4-landscape-page";
  } else if (format === "presentation-169") {
    minHeight = "1080px";
    pageClass = "presentation-page";
  } else if (format === "story-916") {
    minHeight = "1920px";
    pageClass = "pdf-page";
  } else if (format === "letter-portrait") {
    minHeight = "1056px";
    pageClass = "pdf-page";
  }

  const pageStyle: React.CSSProperties = {
    width: "100%",
    minHeight,
    pageBreakAfter: "always",
  };

  return (
    <div
      className={`relative p-canvas-root flex flex-col shrink-0 overflow-hidden box-border ${pageClass} ${className}`}
      style={pageStyle}
    >
      {children}
    </div>
  );
}

/**
 * Bloco CORS-safe de Mapa Geodésico de Rota Aérea para Templates PDF & PNG.
 */
export function ProposalFlightMapBlock({
  flights,
  theme,
  showMap = true,
  capturedMapUrl,
  className = "",
}: {
  flights?: FlightSegmentRouteInput[] | null;
  theme: ResolvedProposalCanvasTheme;
  showMap?: boolean;
  capturedMapUrl?: string | null;
  className?: string;
}) {
  if (!showMap || !Array.isArray(flights) || flights.length === 0) {
    return null;
  }
  return (
    <div className={`break-inside-avoid pt-2 ${className}`}>
      <FlightRouteSvgMap
        segments={flights}
        tone={theme.tone}
        accentColor={theme.brandAccent}
        capturedMapUrl={capturedMapUrl}
      />
    </div>
  );
}

/**
 * Bloco Canônico de Traslados & Receptivo em Formato de Linhas / Lista Completa.
 * Erradica cards comprimidos/espremidos; preserva largura total (Full-Width),
 * exibe detalhes sem truncamento e suporta miniatura de imagem do transfer.
 */
export function ProposalTransferListBlock({
  transfers,
  formatDateFn,
  theme,
  className = "",
}: {
  transfers?: Array<Record<string, any>> | null;
  formatDateFn: (d?: string | null) => string;
  theme?: ResolvedProposalCanvasTheme;
  className?: string;
}) {
  if (!Array.isArray(transfers) || transfers.length === 0) return null;

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {transfers.map((t, idx) => {
        const title = getTransferTitle(t, idx);
        const metaLine = getTransferMetaLine(t, formatDateFn);
        const seq = String(t.sequence_number ?? idx + 1).padStart(2, "0");
        const badgeLabel = getTransferBadgeLabel(t.type, t.kind);
        const hasImg = Boolean(t.image_url);

        return (
          <div
            key={t.id || idx}
            className="w-full p-4 sm:p-5 rounded-2xl border p-border-main p-surface-card break-inside-avoid flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors"
          >
            {/* Lado Esquerdo: Conteúdo textual completo em largura total */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded-md p-surface-brand-soft p-text-brand border p-border-brand shrink-0">
                  {seq}
                </span>
                <span className="p-2 rounded-lg p-surface-subtle p-text-brand shrink-0">
                  <Car className="size-4" />
                </span>
                <h3 className="text-base font-bold p-text-ink break-words leading-tight">
                  {title}
                </h3>
              </div>

              {/* Badges de categoria e modalidade */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-brand-soft border p-border-brand p-text-brand shrink-0">
                  {badgeLabel}
                </span>
                {t.vehicle && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium p-surface-subtle border p-border-subtle p-text-muted shrink-0">
                    Veículo: {t.vehicle}
                  </span>
                )}
                {t.is_private !== undefined && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium p-surface-subtle border p-border-subtle p-text-muted shrink-0">
                    {t.is_private ? "Privativo" : "Regular"}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-semibold p-surface-subtle border p-border-subtle p-text-muted shrink-0">
                  {t.included !== false ? "Incluso no pacote" : "Opcional"}
                </span>
              </div>

              {/* Metadados detalhados em linha */}
              {metaLine && (
                <p className="text-xs p-text-muted leading-relaxed font-medium">
                  {metaLine}
                </p>
              )}

              {/* Ponto de encontro ou bagagem */}
              {(t.meeting_point || t.luggage_notes) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs p-text-faint">
                  {t.meeting_point && <span>Ponto de Encontro: {t.meeting_point}</span>}
                  {t.luggage_notes && <span>Bagagem: {t.luggage_notes}</span>}
                </div>
              )}

              {/* Observações completas sem truncamento */}
              {t.notes && (
                <p className="text-xs p-text-faint whitespace-pre-line leading-relaxed pt-1 border-t p-border-subtle">
                  {t.notes}
                </p>
              )}
            </div>

            {/* Lado Direito: Imagem opcional do veículo / receptivo sem comprimir textos */}
            {hasImg && (
              <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden border p-border-subtle shrink-0">
                <img
                  src={t.image_url}
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
  );
}

/**
 * Bloco de Cruzeiros Marítimos com Rota Náutica Costeira e Itinerário Dia a Dia.
 */
export function ProposalCruiseBlock({
  cruises,
  theme,
  className = "",
}: {
  cruises?: CruiseDTO[] | any[] | null;
  theme: ResolvedProposalCanvasTheme;
  className?: string;
}) {
  if (!Array.isArray(cruises) || cruises.length === 0) return null;

  return (
    <div className={`space-y-6 break-inside-avoid ${className}`}>
      {cruises.map((cruise, idx) => (
        <CruiseItinerarySection
          key={cruise.id || idx}
          cruise={cruise}
          tone={theme.tone}
          accentColor={theme.brandAccent}
        />
      ))}
    </div>
  );
}
