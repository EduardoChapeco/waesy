/**
 * Template 7: Bento Grid Visual (Mosaico Adaptativo 100% Preenchido & Multi-Nicho)
 * Ocupação integral sem espaços vazios (grid-flow-dense), com suporte completo a mídias,
 * especificações técnicas por nicho, precificação por adulto/pessoa e por quarto.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  getTourMetaLine,
  getTransferBadgeLabel,
  getTransferMetaLine,
  getTransferTitle,
  ProposalAdaptiveImage,
  ProposalAgencyLogo,
  ProposalCruiseBlock,
  ProposalDestinationGallerySection,
  ProposalFlightMapBlock,
  ProposalHotelMediaGallery,
  ProposalItineraryMediaGrid,
  ProposalMultiNicheSpecsBlock,
  ProposalPricingBreakdownBlock,
  ProposalTransferListBlock,
} from "./blocks/UI";
import {
  Plane,
  Hotel,
  Check,
  X,
  Compass,
  Car,
  FileText,
  ShieldCheck,
  PhoneCall,
} from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateBentoGrid({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "bento-grid" },
    vm.agency,
  );
  const nc = theme.nicheCopy;
  const customEntries: Array<{ key: string; label: string; value: string }> = Array.isArray(
    raw.custom_field_entries,
  )
    ? raw.custom_field_entries
    : [];
  const hasConditions = Boolean(
    raw.boarding_requirements ||
      raw.cancellation_policy ||
      p.terms ||
      customEntries.length > 0,
  );
  const destinationGallery: string[] = Array.isArray(raw.destination_gallery)
    ? raw.destination_gallery.filter(Boolean)
    : [];

  return (
    <div
      style={theme.cssVars as React.CSSProperties}
      className="flex flex-col w-full p-canvas-root p-body-font pb-12"
    >
      <div className="px-6 sm:px-10 py-8 space-y-8">
        {/* BENTO HERO HEADER (100% FILLED ADAPTIVE MOSAIC) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 break-inside-avoid">
          <div
            className={`${
              p.cover_image_url ? "md:col-span-7" : "md:col-span-12"
            } p-surface-brand rounded-2xl p-6 sm:p-8 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <ProposalAgencyLogo agency={vm.agency} theme={theme} variant="hero" />
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-current/25">
                  {nc.heroKicker} #{p.number}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-3 p-heading-font break-words">
                {p.title || "Proposta Personalizada"}
              </h1>

              {p.notes && (
                <p className="text-sm leading-relaxed whitespace-pre-line break-words opacity-90">
                  {p.notes}
                </p>
              )}
            </div>

            {theme.isSectionVisible("summary") && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-6 border-t border-current/20">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                    Cliente
                  </span>
                  <span className="text-sm font-bold break-words block">
                    {vm.client.name || "Cliente"}
                  </span>
                </div>
                {p.destination && (
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                      {nc.destinationLabel}
                    </span>
                    <span className="text-sm font-bold break-words block">{p.destination}</span>
                  </div>
                )}
                {vm.totalPax > 0 && (
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                      {nc.paxLabel}
                    </span>
                    <span className="text-sm font-bold block">
                      {vm.totalPax} {theme.nicheId === "tourism" ? "pax" : "unid."}
                    </span>
                  </div>
                )}
                {(p.travel_start || p.valid_until) && (
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider opacity-75">
                      {p.travel_start ? nc.startDateLabel : "Validade"}
                    </span>
                    <span className="text-sm font-bold block">
                      {formatDate((p.travel_start || p.valid_until)!)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {p.cover_image_url && (
            <div className="md:col-span-5 rounded-2xl overflow-hidden border p-border-main min-h-64 relative">
              <ProposalAdaptiveImage
                src={p.cover_image_url}
                alt={p.destination || "Imagem Principal"}
                objectPosition={theme.coverCrop.objectPosition}
                scale={theme.coverCrop.scale}
                fit={theme.coverCrop.fit}
                className="w-full h-full min-h-64"
              />
            </div>
          )}
        </div>

        {/* MULTI-NICHE SPECS BENTO */}
        <ProposalMultiNicheSpecsBlock theme={theme} />

        {/* DESTINATION / PROJECT VISUAL GALLERY */}
        <ProposalDestinationGallerySection
          images={destinationGallery}
          title={
            theme.nicheId === "real_estate"
              ? "Galeria de Ambientes & Plantas"
              : theme.nicheId === "automotive"
                ? "Galeria Fotográfica do Veículo"
                : theme.nicheId === "projects"
                  ? "Renders & Pranchas do Projeto"
                  : "Galeria Visual do Destino"
          }
          theme={theme}
        />

        {/* VOOS (TURISMO) */}
        {theme.isSectionVisible("flights") && vm.hasFlights && (
          <section className="break-inside-avoid space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b p-border-main">
              <Plane className="size-4 p-text-brand" />
              <h2 className="text-xl font-bold p-text-ink p-heading-font">{nc.flightsTitle}</h2>
            </div>
            <div
              className={`grid gap-4 ${
                p.flights!.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {p.flights!.map((f, i) => (
                <div
                  key={i}
                  className="p-surface-card border p-border-main rounded-2xl p-5 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider p-text-brand">
                      {f.airline_name || f.airline || "Companhia"}{" "}
                      {f.flight_number ? `· ${f.flight_number}` : ""}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full p-surface-brand-soft border p-border-brand p-text-brand">
                      {(f as any).type === "return" ? "Volta" : "Confirmado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold p-text-ink">
                        {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                      </p>
                      <p className="text-xs font-semibold p-text-muted">
                        {f.departure_time || "--:--"}
                      </p>
                    </div>
                    <div className="flex-1 border-t border-dashed p-border-main text-center pt-1">
                      <span className="text-xs font-semibold p-text-muted">
                        {(f.stops_count ?? f.stops ?? 0) === 0
                          ? "Direto"
                          : `${f.stops_count ?? f.stops} Parada(s)`}
                        {f.baggage_rules ? ` · ${f.baggage_rules}` : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold p-text-ink">
                        {(f.destination_iata || f.destination || "---").slice(0, 3).toUpperCase()}
                      </p>
                      <p className="text-xs font-semibold p-text-muted">
                        {f.arrival_time || "--:--"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ProposalFlightMapBlock
              flights={p.flights as any}
              theme={theme}
              showMap={raw?.web_page?.show_flight_route_map !== false}
              capturedMapUrl={raw?.captured_map_url || raw?.map_image_url || raw?.custom_fields?.captured_map_url}
            />
          </section>
        )}

        {/* HOTÉIS / IMÓVEIS / ESPECIFICAÇÕES PRINCIPAIS (ADAPTIVE BENTO) */}
        {theme.isSectionVisible("hotels") && vm.hasHotels && (
          <section className="break-inside-avoid space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b p-border-main">
              <Hotel className="size-4 p-text-brand" />
              <h2 className="text-xl font-bold p-text-ink p-heading-font">{nc.hotelsTitle}</h2>
            </div>
            <div className="space-y-4">
              {p.hotels!.map((h, i) => {
                const hotelPhotos = Array.isArray(h.images) ? h.images.filter(Boolean) : [];
                return (
                  <div
                    key={i}
                    className="p-surface-card border p-border-main rounded-2xl overflow-hidden"
                  >
                    {hotelPhotos.length > 0 && (
                      <div
                        className={`grid gap-1 p-surface-subtle border-b p-border-subtle ${
                          hotelPhotos.length === 1
                            ? "grid-cols-1 h-56"
                            : hotelPhotos.length === 2
                              ? "grid-cols-2 h-52"
                              : "grid-cols-1 sm:grid-cols-3 h-56"
                        }`}
                      >
                        <ProposalAdaptiveImage
                          src={hotelPhotos[0]}
                          alt={h.name || nc.hotelBadgeLabel}
                          objectPosition={(h as any).object_position}
                          scale={(h as any).image_scale}
                          className={`w-full h-full ${
                            hotelPhotos.length >= 3 ? "col-span-2" : "col-span-1"
                          }`}
                        />
                        {hotelPhotos.length === 2 && (
                          <ProposalAdaptiveImage
                            src={hotelPhotos[1]}
                            alt={`${h.name || nc.hotelBadgeLabel} 2`}
                            className="w-full h-full"
                          />
                        )}
                        {hotelPhotos.length >= 3 && (
                          <div className="col-span-1 flex flex-col gap-1 h-full">
                            {hotelPhotos.slice(1, 3).map((img, idx) => (
                              <ProposalAdaptiveImage
                                key={idx}
                                src={img}
                                alt={`${h.name || nc.hotelBadgeLabel} ${idx + 2}`}
                                className="w-full flex-1 min-h-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                            {nc.hotelBadgeLabel}
                          </span>
                          <h3 className="text-xl font-bold p-text-ink mt-1">{h.name}</h3>
                          {h.city && <p className="text-xs p-text-muted">{h.city}</p>}
                        </div>
                        {h.meal_plan && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold p-surface-brand-soft border p-border-brand p-text-brand">
                            {h.meal_plan}
                          </span>
                        )}
                      </div>
                      {(h as any).description && (
                        <p className="text-sm p-text-muted leading-relaxed mb-3 whitespace-pre-line break-words">
                          {(h as any).description}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t p-border-subtle text-xs">
                        <div>
                          <span className="block font-bold uppercase p-text-faint">
                            {nc.startDateLabel}
                          </span>
                          <span className="font-semibold p-text-ink">
                            {h.checkin ? formatDate(h.checkin) : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-bold uppercase p-text-faint">
                            {nc.endDateLabel}
                          </span>
                          <span className="font-semibold p-text-ink">
                            {h.checkout ? formatDate(h.checkout) : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-bold uppercase p-text-faint">Categoria</span>
                          <span className="font-semibold p-text-ink">
                            {h.rooms?.[0]
                              ? h.rooms.map((r: any) => `${r.qty || 1}x ${r.type}`).join(", ")
                              : (h as any).room_type || "Standard"}
                          </span>
                        </div>
                      </div>
                      <ProposalHotelMediaGallery
                        images={hotelPhotos}
                        media={(h as any).media}
                        title={h.name}
                        objectPosition={(h as any).object_position}
                        scale={(h as any).image_scale}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ROTEIRO DIA A DIA / CRONOGRAMA DE ETAPAS (BENTO FLOW DENSE) */}
        {theme.isSectionVisible("itinerary") && vm.hasItinerary && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b p-border-main">
              <Compass className="size-4 p-text-brand" />
              <h2 className="text-xl font-bold p-text-ink p-heading-font">{nc.itineraryTitle}</h2>
            </div>
            <div
              className={`grid gap-4 grid-flow-dense ${
                p.itinerary!.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {p.itinerary!.map((d, i) => {
                const spanFull = p.itinerary!.length % 2 === 1 && i === 0;
                return (
                  <div
                    key={i}
                    className={`p-surface-card border p-border-main rounded-2xl p-5 flex flex-col justify-between break-inside-avoid ${
                      spanFull ? "md:col-span-2" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider p-surface-brand">
                          {d.day || `${nc.itineraryStepPrefix} ${i + 1}`}
                        </span>
                        {(d.city || (d as any).location) && (
                          <span className="text-xs font-semibold p-text-brand">
                            {d.city || (d as any).location}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold p-text-ink mb-2">{d.title}</h3>
                      {d.description && (
                        <p className="text-sm p-text-muted leading-relaxed whitespace-pre-line break-words">
                          {d.description}
                        </p>
                      )}
                    </div>

                    <ProposalItineraryMediaGrid
                      images={d.images}
                      title={d.title}
                      objectPosition={(d as any).object_position}
                      scale={(d as any).image_scale}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CRUZEIROS MARÍTIMOS */}
        {Array.isArray((raw as any).cruises) && (raw as any).cruises.length > 0 && (
          <section className="break-inside-avoid space-y-4">
            <h3 className="text-xl font-bold p-text-ink pb-2 border-b p-border-main p-heading-font">
              Cruzeiro Marítimo & Itinerário Náutico
            </h3>
            <ProposalCruiseBlock cruises={(raw as any).cruises} theme={theme} />
          </section>
        )}

        {/* TRANSFERS (LINHAS COMPLETAS / FULL-WIDTH) */}
        {theme.isSectionVisible("transfers") && vm.hasTransfers && (
          <section className="break-inside-avoid space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b p-border-main">
              <Car className="size-4 p-text-brand" />
              <h3 className="text-xl font-bold p-text-ink p-heading-font">
                {nc.transfersTitle}
              </h3>
            </div>
            <ProposalTransferListBlock
              transfers={p.transfers}
              formatDateFn={formatDate}
              theme={theme}
            />
          </section>
        )}

        {/* PASSEIOS / ENTREGÁVEIS */}
        {theme.isSectionVisible("tours") && vm.hasTours && (
          <section className="break-inside-avoid space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b p-border-main">
                  <Compass className="size-4 p-text-brand" />
                  <h3 className="text-base font-bold p-text-ink p-heading-font">
                    {nc.toursTitle}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {p.tours!.map((tour, i) => {
                    const tourImg =
                      (tour as any).image_url ||
                      (Array.isArray((tour as any).images) ? (tour as any).images[0] : "");
                    return (
                      <div
                        key={i}
                        className={`p-surface-card border p-border-main rounded-xl overflow-hidden flex flex-col justify-between ${
                          p.tours!.length === 1 ? "sm:col-span-2" : ""
                        }`}
                      >
                        {tourImg && (
                          <div className="h-36 w-full border-b p-border-subtle">
                            <ProposalAdaptiveImage
                              src={tourImg}
                              alt={tour.description || "Serviço"}
                              objectPosition={(tour as any).object_position}
                              scale={(tour as any).image_scale}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-sm font-bold p-text-ink">
                              {tour.description || (tour as any).title || "Serviço"}
                            </p>
                            {getTourMetaLine(tour as Record<string, any>) && (
                              <p className="text-xs p-text-muted mt-1">
                                {getTourMetaLine(tour as Record<string, any>)}
                              </p>
                            )}
                            {tour.notes && (
                              <p className="text-xs p-text-muted mt-2 leading-relaxed">
                                {tour.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
          </section>
        )}

        {/* INCLUSÕES & EXCLUSÕES */}
        {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 break-inside-avoid">
            {vm.hasIncludes && (
              <div className="p-surface-card border p-border-main rounded-2xl p-5">
                <h3 className="text-base font-bold p-text-ink mb-3 flex items-center gap-2 p-heading-font">
                  <Check className="size-4 p-text-brand" /> {nc.includesTitle}
                </h3>
                <ul className="space-y-2 text-xs font-medium p-text-muted">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="p-text-brand font-bold">•</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {vm.hasExcludes && (
              <div className="p-surface-card border p-border-main rounded-2xl p-5">
                <h3 className="text-base font-bold p-text-ink mb-3 flex items-center gap-2 p-heading-font">
                  <X className="size-4 p-text-faint" /> {nc.excludesTitle}
                </h3>
                <ul className="space-y-2 text-xs font-medium p-text-muted">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* INVESTIMENTO + POR ADULTO + POR QUARTO */}
        {theme.isSectionVisible("financial") && (
          <section className="p-surface-subtle border p-border-main rounded-2xl p-6 break-inside-avoid">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b p-border-subtle">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest p-text-brand block mb-1">
                  {nc.financialTitle}
                </span>
                <p className="text-4xl font-bold tracking-tight p-text-ink">
                  {formatCurrency(vm.totals.totalPix, p.currency)}
                </p>
                {vm.totals.descontoPixPercentual > 0 && (
                  <p className="text-xs font-bold p-text-brand mt-1">
                    À vista no PIX ({vm.totals.descontoPixPercentual}% de desconto)
                  </p>
                )}
              </div>

              <div className="text-left md:text-right">
                <span className="block text-xs font-bold uppercase p-text-faint">
                  Parcelamento no Cartão
                </span>
                <span className="text-lg font-bold p-text-ink">
                  {vm.totals.parcelasCartao}x de{" "}
                  {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                </span>
                <span className="block text-xs p-text-muted">
                  Total parcelado: {formatCurrency(vm.totals.total, p.currency)}
                </span>
              </div>
            </div>

            <ProposalPricingBreakdownBlock
              totals={vm.totals}
              theme={theme}
              formatCurrency={formatCurrency}
              currency={p.currency}
            />
          </section>
        )}

        {/* REGRAS & OBSERVAÇÕES */}
        {theme.isSectionVisible("conditions") && hasConditions && (
          <section className="p-surface-card border p-border-main rounded-2xl p-5 break-inside-avoid space-y-3">
            <h3 className="text-sm font-bold p-text-ink flex items-center gap-2">
              <FileText className="size-4 p-text-brand" /> {nc.conditionsTitle}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {raw.boarding_requirements && (
                <div className="p-surface-subtle border p-border-subtle rounded-xl p-4">
                  <span className="font-bold uppercase tracking-wider p-text-ink block mb-1 flex items-center gap-2">
                    <ShieldCheck className="size-3.5 p-text-brand" /> {nc.boardingReqLabel}
                  </span>
                  <p className="p-text-muted whitespace-pre-line">{raw.boarding_requirements}</p>
                </div>
              )}
              {raw.cancellation_policy && (
                <div className="p-surface-subtle border p-border-subtle rounded-xl p-4">
                  <span className="font-bold uppercase tracking-wider p-text-ink block mb-1">
                    Política de Cancelamento / Rescisão
                  </span>
                  <p className="p-text-muted whitespace-pre-line">{raw.cancellation_policy}</p>
                </div>
              )}
            </div>
            {customEntries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="p-surface-subtle p-3 rounded-xl border p-border-subtle"
                  >
                    <div className="text-xs uppercase font-bold p-text-faint">{entry.label}</div>
                    <div className="text-xs font-semibold p-text-ink mt-1 whitespace-pre-line">{entry.value}</div>
                  </div>
                ))}
              </div>
            )}
            {p.terms && (
              <p className="text-xs p-text-muted whitespace-pre-line leading-relaxed pt-2 border-t p-border-subtle">
                {p.terms}
              </p>
            )}
          </section>
        )}
      </div>

      {/* FOOTER */}
      {theme.isSectionVisible("footer") && (
        <div className="mt-auto border-t p-border-main p-surface-card px-6 sm:px-10 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 break-inside-avoid">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full p-surface-brand flex items-center justify-center text-sm font-bold">
              {(p.agent_name || vm.agency.name || "A").charAt(0)}
            </div>
            <div>
              <div className="font-bold p-text-ink text-sm">{p.agent_name || vm.agency.name}</div>
              {(p.agent_whatsapp || vm.agency.whatsapp) && (
                <div className="text-xs p-text-brand font-semibold flex items-center gap-1">
                  <PhoneCall className="size-3" /> {p.agent_whatsapp || vm.agency.whatsapp}
                </div>
              )}
            </div>
          </div>
          <div className="font-mono text-xs p-text-muted">
            #{p.number} {p.public_token ? `· ${p.public_token.slice(0, 12)}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
