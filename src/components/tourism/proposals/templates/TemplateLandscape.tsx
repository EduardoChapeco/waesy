/**
 * Template 4: Apresentação Guiada (Paisagem / Slides)
 * Focado em visualização em lâminas (16:9, A4 Paisagem ou formatos adaptativos), com contraste WCAG AA/AAA.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import type { ProposalCanvasFormat } from "@/services/travel-proposal.functions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  Plane,
  Hotel,
  Compass,
  Check,
  X,
  MapPin,
  Calendar,
  FileText,
  PhoneCall,
  Car,
  Utensils,
} from "lucide-react";
import { DocumentPage } from "./blocks/UI";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateLandscape({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "landscape-presentation" },
    vm.agency,
  );
  const format: ProposalCanvasFormat =
    (p.canvas_format as ProposalCanvasFormat) || "a4-landscape";
  const isWideFormat = format === "a4-landscape" || format === "presentation-169";

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

  // Agrupamento de dias do roteiro para caber em lâminas individuais
  const itineraryDays = p.itinerary || [];
  const daysPerSlide = format === "presentation-169" ? 3 : 2;
  const itinerarySlides: any[][] = [];
  for (let i = 0; i < itineraryDays.length; i += daysPerSlide) {
    itinerarySlides.push(itineraryDays.slice(i, i + daysPerSlide));
  }

  // Agrupamento de hotéis (2 por lâmina)
  const hotelsList = p.hotels || [];
  const hotelsPerSlide = 2;
  const hotelSlides: any[][] = [];
  for (let i = 0; i < hotelsList.length; i += hotelsPerSlide) {
    hotelSlides.push(hotelsList.slice(i, i + hotelsPerSlide));
  }

  // Agrupamento de voos (4 por lâmina)
  const flightsList = p.flights || [];
  const flightsPerSlide = 4;
  const flightSlides: any[][] = [];
  for (let i = 0; i < flightsList.length; i += flightsPerSlide) {
    flightSlides.push(flightsList.slice(i, i + flightsPerSlide));
  }

  return (
    <div
      style={theme.cssVars as React.CSSProperties}
      className="flex flex-col p-canvas-root p-body-font select-text divide-y p-border-main"
    >
      {/* ─── SLIDE 1: CAPA ─── */}
      <DocumentPage format={format} className="relative flex-col justify-between p-10 sm:p-14">
        {p.cover_image_url ? (
          <>
            <img
              src={p.cover_image_url}
              alt={p.title || "Capa"}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 p-surface-hero-overlay" />
          </>
        ) : (
          <div className="absolute inset-0 p-surface-subtle" />
        )}

        {/* Logo / Nome da Agência no Topo */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          {vm.agency.logo_url ? (
            <img
              src={vm.agency.logo_url}
              crossOrigin="anonymous"
              alt={vm.agency.name}
              className="h-12 w-auto max-w-44 object-contain"
              width={176}
              height={48}
            />
          ) : (
            <div
              className={`text-2xl font-bold uppercase tracking-tight ${p.cover_image_url ? "p-text-on-dark" : "p-text-ink"}`}
            >
              {vm.agency.name}
            </div>
          )}
          <div
            className={`text-right ${p.cover_image_url ? "p-text-on-dark-muted" : "p-text-muted"}`}
          >
            <div className="text-xs font-bold uppercase tracking-widest">Lâmina Executiva</div>
            <div className="text-base font-mono font-bold p-text-brand">#{p.number}</div>
          </div>
        </div>

        {/* Informações da Capa */}
        <div className="relative z-10 max-w-4xl space-y-5 my-auto py-12">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest p-surface-brand-soft border p-border-brand">
            <Compass className="size-3.5 p-text-brand" />
            <span>Apresentação Exclusiva · Proposta #{p.number}</span>
          </div>

          <h1
            className={`text-4xl sm:text-6xl font-bold tracking-tight leading-tight p-heading-font ${p.cover_image_url ? "p-text-on-dark" : "p-text-ink"}`}
          >
            {p.title || p.destination || "Seu Próximo Destino"}
          </h1>

          {p.destination && p.title && (
            <p
              className={`text-xl font-medium ${p.cover_image_url ? "p-text-on-dark-muted" : "p-text-muted"}`}
            >
              {p.destination}
            </p>
          )}

          {theme.isSectionVisible("summary") && (
            <div
              className={`flex flex-wrap items-center gap-6 text-sm sm:text-base pt-4 font-medium ${p.cover_image_url ? "p-text-on-dark-muted" : "p-text-muted"}`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="size-4 p-text-brand" />
                {p.travel_start ? formatDate(p.travel_start) : "Data a definir"}
                {p.travel_end ? ` — ${formatDate(p.travel_end)}` : ""}
              </span>
              <span>·</span>
              <span>
                Cliente:{" "}
                <strong className={p.cover_image_url ? "p-text-on-dark" : "p-text-ink"}>
                  {vm.client?.name || "—"}
                </strong>
              </span>
              <span>·</span>
              <span>
                Viajantes:{" "}
                <strong className={p.cover_image_url ? "p-text-on-dark" : "p-text-ink"}>
                  {vm.totalPax} pax
                </strong>
              </span>
            </div>
          )}
        </div>

        <div
          className={`relative z-10 flex justify-between items-center text-xs border-t pt-4 p-border-subtle ${p.cover_image_url ? "p-text-on-dark-muted" : "p-text-faint"}`}
        >
          <span>{vm.agency.name}</span>
          <span>{p.valid_until ? `Válida até ${formatDate(p.valid_until)}` : `Ref #${p.number}`}</span>
        </div>
      </DocumentPage>

      {/* ─── SLIDES 2+: ROTEIRO DIA-A-DIA ─── */}
      {theme.isSectionVisible("itinerary") &&
        vm.hasItinerary &&
        itinerarySlides.map((slideDays, slideIdx) => (
          <DocumentPage
            key={`itin-${slideIdx}`}
            format={format}
            className="p-10 sm:p-12 justify-between"
          >
            <div>
              {/* Header do Slide */}
              <div className="flex justify-between items-center border-b p-border-main pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Compass className="size-6 p-text-brand" />
                  <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                    Cronograma da Viagem
                  </h2>
                </div>
                <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                  Roteiro · Lâmina {slideIdx + 1} de {itinerarySlides.length}
                </span>
              </div>

              {/* Grid de Dias */}
              <div
                className={`grid ${format === "presentation-169" ? "grid-cols-1 sm:grid-cols-3" : isWideFormat ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-6`}
              >
                {slideDays.map((d: any, idx: number) => {
                  const absoluteDayNumber = slideIdx * daysPerSlide + idx + 1;
                  return (
                    <div
                      key={idx}
                      className="p-surface-card border p-border-main rounded-xl p-6 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase p-surface-brand shrink-0">
                          {d.day || `Dia ${absoluteDayNumber}`}
                        </span>
                        <h4 className="font-bold text-lg p-text-ink truncate">{d.title}</h4>
                      </div>
                      {Boolean(
                        d.city ||
                          d.location ||
                          (d.meals && d.meals.length > 0) ||
                          (d.included_meals && d.included_meals.length > 0),
                      ) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {Boolean(d.city || d.location) && (
                            <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-subtle border p-border-subtle px-3 py-1 rounded-full font-medium">
                              <MapPin className="size-3 p-text-brand" />
                              {d.city || d.location}
                            </span>
                          )}
                          {Boolean(
                            (d.meals && d.meals.length > 0) ||
                              (d.included_meals && d.included_meals.length > 0),
                          ) && (
                            <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-subtle border p-border-subtle px-3 py-1 rounded-full font-medium">
                              <Utensils className="size-3 p-text-brand" />
                              {Array.isArray(d.meals)
                                ? d.meals.join(", ")
                                : Array.isArray(d.included_meals)
                                  ? d.included_meals.join(", ")
                                  : d.meals || d.included_meals}
                            </span>
                          )}
                        </div>
                      )}
                      {d.description && (
                        <p className="p-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                          {d.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer do Slide */}
            <div className="flex justify-between items-center text-xs p-text-faint border-t p-border-subtle pt-4 mt-8">
              <span>{vm.agency.name} · Planejamento Comercial</span>
              <span>Proposta #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDES: HOSPEDAGEM ─── */}
      {theme.isSectionVisible("hotels") &&
        vm.hasHotels &&
        hotelSlides.map((slideHotels, slideIdx) => (
          <DocumentPage
            key={`hotel-${slideIdx}`}
            format={format}
            className="p-10 sm:p-12 justify-between"
          >
            <div>
              <div className="flex justify-between items-center border-b p-border-main pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Hotel className="size-6 p-text-brand" />
                  <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                    Hospedagem Selecionada
                  </h2>
                </div>
                <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                  Hospedagem · Lâmina {slideIdx + 1} de {hotelSlides.length}
                </span>
              </div>

              <div className={`grid ${isWideFormat ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-6`}>
                {slideHotels.map((h, i) => (
                  <div
                    key={i}
                    className="p-surface-card border p-border-main rounded-xl p-6 flex flex-col sm:flex-row gap-6"
                  >
                    {h.images?.[0] && (
                      <div className="w-full sm:w-40 h-40 shrink-0 rounded-lg overflow-hidden border p-border-subtle p-surface-subtle">
                        <img
                          src={h.images[0]}
                          alt={h.name}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-bold p-text-ink mb-1">{h.name}</h4>
                        {h.city && (
                          <div className="text-xs font-bold p-text-brand uppercase tracking-wider mb-3">
                            {h.city}
                          </div>
                        )}
                        <div className="text-xs p-text-muted space-y-2">
                          <div>
                            <strong className="p-text-ink">Período:</strong>{" "}
                            {h.checkin ? formatDate(h.checkin) : "—"} a{" "}
                            {h.checkout ? formatDate(h.checkout) : "—"}
                          </div>
                          <div>
                            <strong className="p-text-ink">Acomodação:</strong>{" "}
                            {h.rooms?.[0]
                              ? h.rooms.map((r: any) => `${r.qty || 1}x ${r.type}`).join(", ")
                              : "Standard"}
                          </div>
                        </div>
                      </div>
                      <div className="p-surface-brand-soft px-3 py-1 rounded-lg border p-border-brand text-xs font-bold p-text-brand self-start">
                        Regime: {h.meal_plan || "Café da Manhã"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs p-text-faint border-t p-border-subtle pt-4 mt-8">
              <span>Hospedagem</span>
              <span>Cotação #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDES: VOO ─── */}
      {theme.isSectionVisible("flights") &&
        vm.hasFlights &&
        flightSlides.map((slideFlights, slideIdx) => (
          <DocumentPage
            key={`flight-${slideIdx}`}
            format={format}
            className="p-10 sm:p-12 justify-between"
          >
            <div>
              <div className="flex justify-between items-center border-b p-border-main pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Plane className="size-6 p-text-brand" />
                  <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                    Logística Aérea
                  </h2>
                </div>
                <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                  Voos · Lâmina {slideIdx + 1} de {flightSlides.length}
                </span>
              </div>

              <div className={`grid ${isWideFormat ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-6`}>
                {slideFlights.map((f, i) => (
                  <div
                    key={i}
                    className="p-surface-card border p-border-main rounded-xl p-6"
                  >
                    <div className="flex justify-between items-center border-b p-border-subtle pb-3 mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                        {f.airline_name || f.airline || "Companhia Aérea"}
                      </span>
                      <span className="text-xs font-mono font-bold p-surface-subtle p-text-ink px-3 py-1 rounded border p-border-main">
                        {f.flight_number || "Voo Confirmado"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-center py-2">
                      <div>
                        <div className="text-3xl sm:text-4xl font-bold p-text-ink tracking-tight">
                          {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                        </div>
                        <div className="text-xs font-bold p-text-muted mt-1">
                          {f.departure_time || "--:--"}
                        </div>
                      </div>

                      <div className="flex-1 px-6 relative flex flex-col items-center">
                        <div className="w-full border-t border-dashed p-border-main" />
                        <span className="-mt-3 p-surface-subtle px-3 py-1 rounded-full border p-border-main text-xs font-bold uppercase p-text-muted">
                          {(f.stops_count ?? f.stops ?? 0) === 0
                            ? "Direto"
                            : `${f.stops_count ?? f.stops} Parada${(f.stops_count ?? f.stops ?? 1) > 1 ? "s" : ""}`}
                        </span>
                        <span className="text-xs p-text-faint font-semibold mt-2">
                          {f.departure_date
                            ? formatDate(f.departure_date)
                            : f.date
                              ? formatDate(f.date)
                              : ""}
                        </span>
                      </div>

                      <div>
                        <div className="text-3xl sm:text-4xl font-bold p-text-ink tracking-tight">
                          {(f.destination_iata || f.destination || "---").slice(0, 3).toUpperCase()}
                        </div>
                        <div className="text-xs font-bold p-text-muted mt-1">
                          {f.arrival_time || "--:--"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs p-text-faint border-t p-border-subtle pt-4 mt-8">
              <span>Voos</span>
              <span>Cotação #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDE: TRASLADOS & PASSEIOS ─── */}
      {((theme.isSectionVisible("transfers") && vm.hasTransfers) ||
        (theme.isSectionVisible("tours") && vm.hasTours)) && (
        <DocumentPage format={format} className="p-10 sm:p-12 justify-between">
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b p-border-main pb-4">
              <div className="flex items-center gap-3">
                <Car className="size-6 p-text-brand" />
                <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                  Serviços Terrestres & Experiências
                </h2>
              </div>
              <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                Receptivo & Passeios
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {theme.isSectionVisible("transfers") &&
                p.transfers?.map((t, idx) => (
                  <div
                    key={`tr-${idx}`}
                    className="p-surface-card border p-border-main rounded-xl p-5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="p-text-ink font-bold text-base">
                        {t.description || "Transfer"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-brand-soft border p-border-brand">
                        {t.type === "shared" ? "Regular" : "Privativo"}
                      </span>
                    </div>
                    <div className="text-xs p-text-muted">
                      {t.vehicle && (
                        <span>
                          Veículo: <strong className="p-text-ink">{t.vehicle}</strong>{" "}
                        </span>
                      )}
                      {t.date && <span>· Data: {formatDate(t.date)}</span>}
                    </div>
                    {t.notes && <p className="text-xs p-text-faint">{t.notes}</p>}
                  </div>
                ))}

              {theme.isSectionVisible("tours") &&
                p.tours?.map((tour, idx) => (
                  <div
                    key={`to-${idx}`}
                    className="p-surface-card border p-border-main rounded-xl p-5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="p-text-ink font-bold text-base">
                        {tour.description || (tour as any).title || "Passeio"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-subtle border p-border-subtle p-text-muted">
                        Experiência
                      </span>
                    </div>
                    {tour.date && (
                      <div className="text-xs p-text-muted">Duração / Data: {tour.date}</div>
                    )}
                    {tour.notes && (
                      <p className="text-xs p-text-faint whitespace-pre-wrap">{tour.notes}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs p-text-faint border-t p-border-subtle pt-4 mt-8">
            <span>Serviços e Receptivo</span>
            <span>Cotação #{p.number}</span>
          </div>
        </DocumentPage>
      )}

      {/* ─── SLIDE: INCLUSÕES / EXCLUSÕES & CONDIÇÕES ─── */}
      {((theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes)) ||
        (theme.isSectionVisible("conditions") && hasConditions)) && (
        <DocumentPage format={format} className="p-10 sm:p-12 justify-between">
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b p-border-main pb-4">
              <div className="flex items-center gap-3">
                <FileText className="size-6 p-text-brand" />
                <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                  Inclusões & Condições Gerais
                </h2>
              </div>
              <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                Escopo do Pacote
              </span>
            </div>

            {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="p-surface-card border p-border-main rounded-xl p-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest p-text-brand flex items-center gap-2 border-b p-border-subtle pb-2">
                    <Check className="size-4" /> Serviços Inclusos
                  </h4>
                  <ul className="space-y-3">
                    {p.includes?.map((inc, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                        <Check className="size-4 p-text-brand mt-1 shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                    {(!p.includes || p.includes.length === 0) && (
                      <li className="text-xs p-text-faint">Conforme roteiro descritivo.</li>
                    )}
                  </ul>
                </div>

                <div className="p-surface-card border p-border-main rounded-xl p-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest p-text-faint flex items-center gap-2 border-b p-border-subtle pb-2">
                    <X className="size-4" /> Não Inclusos no Pacote
                  </h4>
                  <ul className="space-y-3">
                    {p.excludes?.map((exc, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                        <X className="size-4 p-text-faint mt-1 shrink-0" />
                        <span>{exc}</span>
                      </li>
                    ))}
                    {(!p.excludes || p.excludes.length === 0) && (
                      <li className="text-xs p-text-faint">Despesas extras de caráter pessoal.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {theme.isSectionVisible("conditions") && hasConditions && (
              <div className="p-surface-subtle border p-border-main rounded-xl p-5 space-y-3 text-xs p-text-muted">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {raw.boarding_requirements && (
                    <div>
                      <strong className="p-text-ink block mb-1">Requisitos de Embarque:</strong>
                      <span className="whitespace-pre-line">{raw.boarding_requirements}</span>
                    </div>
                  )}
                  {raw.cancellation_policy && (
                    <div>
                      <strong className="p-text-ink block mb-1">Política de Cancelamento:</strong>
                      <span className="whitespace-pre-line">{raw.cancellation_policy}</span>
                    </div>
                  )}
                </div>
                {p.terms && <p className="p-text-faint whitespace-pre-line">{p.terms}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-xs p-text-faint border-t p-border-subtle pt-4 mt-8">
            <span>Consulte nossa equipe para personalizações adicionais</span>
            <span>Cotação #{p.number}</span>
          </div>
        </DocumentPage>
      )}

      {/* ─── SLIDE: INVESTIMENTO E ASSINATURA ─── */}
      {theme.isSectionVisible("financial") && (
        <DocumentPage format={format} className="p-10 sm:p-12 justify-between">
          <div>
            <div className="flex justify-between items-center border-b p-border-main pb-4 mb-8">
              <div className="flex items-center gap-3">
                <Compass className="size-6 p-text-brand" />
                <h2 className="text-2xl font-bold tracking-tight p-text-ink p-heading-font">
                  Investimento e Condições
                </h2>
              </div>
              <span className="text-xs font-bold p-text-faint uppercase tracking-widest">
                Resumo Financeiro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-8 items-center">
              {/* Valor Esquerda */}
              <div className="sm:col-span-2 space-y-2 p-surface-card border p-border-main rounded-2xl p-6">
                <span className="text-xs uppercase font-bold tracking-widest p-text-faint block">
                  Valor Total da Viagem
                </span>
                <div className="text-4xl sm:text-5xl font-bold tracking-tight p-text-brand">
                  {formatCurrency(vm.totals.total, p.currency)}
                </div>
                {p.valid_until && (
                  <span className="text-xs font-semibold p-text-muted block pt-2">
                    Tarifa válida até {formatDate(p.valid_until)}
                  </span>
                )}
              </div>

              {/* Condições de Pagamento Direita */}
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-surface-card border p-border-main rounded-2xl p-6">
                  <span className="text-xs uppercase font-bold tracking-widest p-text-faint block mb-2">
                    Cartão de Crédito
                  </span>
                  <div className="text-2xl font-bold p-text-ink leading-none">
                    {vm.totals.parcelasCartao}x de
                  </div>
                  <div className="text-xl font-bold p-text-muted mt-1">
                    {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                  </div>
                </div>

                <div className="p-surface-brand-soft rounded-2xl p-6 border-2 p-border-brand">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs uppercase font-bold tracking-widest p-text-brand">
                      PIX (À vista)
                    </span>
                    {vm.totals.descontoPixPercentual > 0 && (
                      <span className="p-badge-success text-xs font-bold px-2 py-1 rounded-full">
                        -{vm.totals.descontoPixPercentual}%
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold p-text-brand leading-none">
                    {formatCurrency(vm.totals.totalPix, p.currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer com Assinatura / Consultor */}
          {theme.isSectionVisible("footer") && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t p-border-main pt-6 mt-8">
              <div className="flex items-center gap-4">
                {p.agent_photo_url ? (
                  <img
                    src={p.agent_photo_url}
                    alt={p.agent_name || vm.agency.name}
                    crossOrigin="anonymous"
                    className="w-12 h-12 rounded-full object-cover border p-border-main"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full p-surface-brand flex items-center justify-center text-base font-bold">
                    {(p.agent_name || vm.agency.name || "A").charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                    Consultor Comercial
                  </div>
                  <div className="font-bold p-text-ink text-base leading-snug">
                    {p.agent_name || vm.agency.name}
                  </div>
                  {(p.agent_whatsapp || vm.agency.whatsapp) && (
                    <div className="text-xs p-text-brand font-bold flex items-center gap-2 mt-1">
                      <PhoneCall className="size-3.5" /> {p.agent_whatsapp || vm.agency.whatsapp}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="text-xs uppercase font-bold tracking-widest p-text-faint block mb-1">
                  Token Autenticador
                </span>
                <span className="font-mono text-xs p-text-muted">
                  #{p.number} {p.public_token ? `· ${p.public_token.slice(0, 14)}` : ""}
                </span>
              </div>
            </div>
          )}
        </DocumentPage>
      )}
    </div>
  );
}
