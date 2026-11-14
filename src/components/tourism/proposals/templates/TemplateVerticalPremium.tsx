/**
 * Template 5: Vertical Premium (Mobile & Story 9:16 Editorial)
 * Otimizado para leitura vertical fluida, sem cores pastel artificiais, com malha aérea e hospedagem completas.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  Check,
  X,
  PhoneCall,
  Calendar,
  MapPin,
  Plane,
  Hotel,
  Car,
  Compass,
  Utensils,
  FileText,
} from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateVerticalPremium({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "vertical-premium" },
    vm.agency,
  );
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

  return (
    <div
      style={theme.cssVars as React.CSSProperties}
      className="flex flex-col w-full p-canvas-root p-body-font overflow-x-hidden relative pb-12"
    >
      {/* 1. SEÇÃO HERO / CAPA */}
      <div className="w-full p-surface-card border-b p-border-main relative px-6 sm:px-10 lg:px-14 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Coluna Esquerda */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 w-max p-surface-brand text-xs font-bold uppercase tracking-wider">
              <Calendar className="size-3.5 shrink-0" />
              <span>
                {p.travel_start ? formatDate(p.travel_start) : "Data a definir"}
                {p.travel_end ? ` a ${formatDate(p.travel_end)}` : ""}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold leading-tight p-text-ink p-heading-font">
              {p.title || "Roteiro Exclusivo"}
            </h1>

            {p.destination && (
              <h2 className="text-lg sm:text-2xl leading-snug p-text-brand font-semibold">
                {p.destination}
              </h2>
            )}

            <p className="text-sm sm:text-base leading-relaxed p-text-muted">
              {p.notes ||
                "Um roteiro desenhado sob medida para você aproveitar o melhor da sua viagem."}
            </p>

            {/* Resumo Rápido */}
            {theme.isSectionVisible("summary") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-surface-subtle border p-border-subtle rounded-lg p-3">
                  <div className="text-xs uppercase font-bold p-text-faint">Cliente</div>
                  <div className="text-xs sm:text-sm font-bold p-text-ink truncate mt-1">
                    {raw.client_name || vm.client.name || "—"}
                  </div>
                </div>
                <div className="p-surface-subtle border p-border-subtle rounded-lg p-3">
                  <div className="text-xs uppercase font-bold p-text-faint">Viajantes</div>
                  <div className="text-xs sm:text-sm font-bold p-text-ink mt-1">
                    {vm.totalPax ? `${vm.totalPax} pax` : "—"}
                  </div>
                </div>
                <div className="p-surface-subtle border p-border-subtle rounded-lg p-3">
                  <div className="text-xs uppercase font-bold p-text-faint">Proposta</div>
                  <div className="text-xs sm:text-sm font-mono font-bold p-text-brand mt-1">
                    #{p.number}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            {p.cover_image_url ? (
              <img
                src={p.cover_image_url}
                alt={p.destination || "Destino Principal"}
                crossOrigin="anonymous"
                className="w-full h-72 sm:h-96 object-cover rounded-2xl border p-border-main"
              />
            ) : (
              <div className="w-full h-72 sm:h-96 p-surface-subtle rounded-2xl border p-border-main flex items-center justify-center">
                <Compass className="size-12 p-text-brand opacity-50" />
              </div>
            )}

            {/* Medalhão da Logo */}
            {vm.agency.logo_url && (
              <div className="absolute left-4 top-4 p-surface-card p-3 rounded-xl border p-border-main">
                <img
                  src={vm.agency.logo_url}
                  alt={vm.agency.name}
                  crossOrigin="anonymous"
                  className="h-9 w-auto max-w-32 object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. CORPO VERTICAL */}
      <div className="px-6 sm:px-10 lg:px-14 py-10 space-y-12">
        {/* MALHA AÉREA (Corrigido: antes era omitida no TemplateVerticalPremium) */}
        {theme.isSectionVisible("flights") && vm.hasFlights && (
          <section className="space-y-5 break-inside-avoid">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold p-text-brand mb-1">
                Logística Aérea
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold p-text-ink p-heading-font">
                Voos Selecionados
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {p.flights!.map((f, i) => (
                <div
                  key={i}
                  className="p-surface-card rounded-xl border p-border-main overflow-hidden break-inside-avoid"
                >
                  <div className="p-surface-brand-soft px-5 py-3 flex items-center justify-between border-b p-border-subtle">
                    <div className="flex items-center gap-2">
                      <Plane className="size-4 p-text-brand" />
                      <span className="text-xs font-bold uppercase tracking-wider p-text-brand">
                        {f.airline_name || f.airline || "Companhia Aérea"}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold p-text-ink p-surface-card px-3 py-1 rounded-full border p-border-main">
                      {f.flight_number || "Voo Confirmado"}
                    </span>
                  </div>
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="text-center w-1/3">
                      <div className="text-2xl sm:text-3xl font-bold p-text-ink">
                        {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold p-text-muted mt-1">
                        {f.departure_time || "--:--"}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full border-t border-dashed p-border-main" />
                      <span className="-mt-3 p-surface-subtle px-3 py-1 rounded-full border p-border-main text-xs font-bold p-text-muted">
                        {f.departure_date
                          ? formatDate(f.departure_date)
                          : f.date
                            ? formatDate(f.date)
                            : "Direto"}
                      </span>
                    </div>
                    <div className="text-center w-1/3">
                      <div className="text-2xl sm:text-3xl font-bold p-text-ink">
                        {(f.destination_iata || f.destination || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold p-text-muted mt-1">
                        {f.arrival_time || "--:--"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HOSPEDAGENS */}
        {theme.isSectionVisible("hotels") && vm.hasHotels && (
          <section className="space-y-5 break-inside-avoid">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold p-text-brand mb-1">
                Conforto & Estadia
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold p-text-ink p-heading-font">
                Hospedagens Previstas
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.hotels!.map((h, i) => (
                <div
                  key={i}
                  className="p-surface-card rounded-xl p-5 border p-border-main space-y-4 break-inside-avoid"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold p-text-ink">{h.name}</h3>
                      {h.city && (
                        <div className="text-xs p-text-muted flex items-center gap-1 mt-1">
                          <MapPin className="size-3.5 p-text-brand shrink-0" /> {h.city}
                        </div>
                      )}
                    </div>
                    <span className="p-surface-brand-soft border p-border-brand px-3 py-1 rounded-full text-xs font-bold p-text-brand">
                      {h.meal_plan || "Café da Manhã"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-surface-subtle p-4 rounded-lg border p-border-subtle text-xs">
                    <div>
                      <span className="block uppercase font-bold p-text-faint">Check-in</span>
                      <span className="font-semibold p-text-ink">
                        {h.checkin ? formatDate(h.checkin) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block uppercase font-bold p-text-faint">Check-out</span>
                      <span className="font-semibold p-text-ink">
                        {h.checkout ? formatDate(h.checkout) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CRONOGRAMA DIA A DIA */}
        {theme.isSectionVisible("itinerary") && vm.hasItinerary && (
          <section className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold p-text-brand mb-1">
                Cronograma Completo
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold p-text-ink p-heading-font">
                Programação Dia a Dia
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {p.itinerary!.map((day, idx) => {
                const dayImages = day.images || [];
                const layoutVariant =
                  day.imageLayout ||
                  (dayImages.length === 0 ? "none" : dayImages.length === 1 ? "single" : "stack");

                return (
                  <div
                    key={day.id || idx}
                    className="p-surface-card rounded-xl border p-border-main p-5 sm:p-6 break-inside-avoid"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold p-surface-brand shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold p-text-ink leading-tight">
                          {day.title || `Dia ${idx + 1}`}
                        </h3>
                        {Boolean(day.day || day.city || (day as any).location) && (
                          <div className="text-xs p-text-muted font-semibold uppercase tracking-wide mt-1 flex items-center gap-2">
                            {day.day && <span>{day.day}</span>}
                            {day.day && (day.city || (day as any).location) && <span>·</span>}
                            {(day.city || (day as any).location) && (
                              <span>{day.city || (day as any).location}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`grid ${layoutVariant !== "none" && dayImages.length > 0 ? "grid-cols-1 lg:grid-cols-12 gap-6" : "grid-cols-1"}`}
                    >
                      <div
                        className={
                          layoutVariant !== "none" && dayImages.length > 0
                            ? "lg:col-span-7"
                            : "col-span-1"
                        }
                      >
                        {day.description && (
                          <p className="text-sm sm:text-base leading-relaxed p-text-muted whitespace-pre-wrap">
                            {day.description}
                          </p>
                        )}

                        {Boolean(
                          day.meals?.length ||
                            (day as any).included_meals?.length ||
                            day.overnight,
                        ) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(day.meals || (day as any).included_meals || []).map(
                              (meal: string, mIdx: number) => (
                                <span
                                  key={mIdx}
                                  className="p-surface-subtle border p-border-subtle p-text-ink px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2"
                                >
                                  <Utensils className="size-3 p-text-brand" /> {meal}
                                </span>
                              ),
                            )}
                            {day.overnight && (
                              <span className="p-surface-brand-soft border p-border-brand p-text-brand px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2">
                                <Hotel className="size-3.5 shrink-0" /> Pernoite: {day.overnight}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {layoutVariant !== "none" && dayImages.length > 0 && (
                        <div className="lg:col-span-5 flex flex-col gap-3">
                          {dayImages.slice(0, 2).map((imgUrl, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgUrl}
                              alt={day.title || `Dia ${idx + 1}`}
                              crossOrigin="anonymous"
                              className="w-full h-44 object-cover rounded-lg border p-border-subtle"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TRASLADOS & EXPERIÊNCIAS */}
        {((theme.isSectionVisible("transfers") && vm.hasTransfers) ||
          (theme.isSectionVisible("tours") && vm.hasTours)) && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 break-inside-avoid">
            {theme.isSectionVisible("transfers") && vm.hasTransfers && (
              <div className={vm.hasTours ? "lg:col-span-6" : "lg:col-span-12"}>
                <h2 className="text-2xl font-bold p-text-ink mb-4 p-heading-font">
                  Traslados & Receptivo
                </h2>
                <div className="space-y-3">
                  {p.transfers!.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-surface-card rounded-xl p-5 border p-border-main space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold p-text-ink text-sm">
                          <Car className="size-4 shrink-0 p-text-brand" />
                          <span>{t.description || "Transfer In/Out"}</span>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-subtle border p-border-subtle p-text-muted">
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
                </div>
              </div>
            )}

            {theme.isSectionVisible("tours") && vm.hasTours && (
              <div className={vm.hasTransfers ? "lg:col-span-6" : "lg:col-span-12"}>
                <h2 className="text-2xl font-bold p-text-ink mb-4 p-heading-font">
                  Passeios & Experiências
                </h2>
                <div className="space-y-3">
                  {p.tours!.map((tour, idx) => (
                    <div
                      key={idx}
                      className="p-surface-card rounded-xl p-5 border p-border-main space-y-2"
                    >
                      <div className="flex items-center gap-2 font-bold p-text-ink text-sm">
                        <Compass className="size-4 shrink-0 p-text-brand" />
                        <span>
                          {tour.description || (tour as any).title || "Passeio Turístico"}
                        </span>
                      </div>
                      {tour.date && (
                        <div className="text-xs p-text-muted">Programação: {tour.date}</div>
                      )}
                      {tour.notes && (
                        <p className="text-xs p-text-muted whitespace-pre-wrap">{tour.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* INCLUSÕES & EXCLUSÕES */}
        {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 break-inside-avoid">
            {vm.hasIncludes && (
              <div
                className={`${vm.hasExcludes ? "lg:col-span-6" : "lg:col-span-12"} p-surface-card rounded-xl p-6 border p-border-main`}
              >
                <h2 className="text-xl font-bold p-text-ink mb-4 p-heading-font">
                  O que está incluso
                </h2>
                <ul className="space-y-3">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                      <span className="p-badge-success p-1 rounded-full shrink-0 mt-1">
                        <Check className="size-3.5" />
                      </span>
                      <span className="leading-snug">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vm.hasExcludes && (
              <div
                className={`${vm.hasIncludes ? "lg:col-span-6" : "lg:col-span-12"} p-surface-subtle rounded-xl p-6 border p-border-main`}
              >
                <h2 className="text-xl font-bold p-text-ink mb-4 p-heading-font">
                  Não está incluso
                </h2>
                <ul className="space-y-3">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                      <span className="p-badge-danger p-1 rounded-full shrink-0 mt-1">
                        <X className="size-3.5" />
                      </span>
                      <span className="leading-snug">{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* CONDIÇÕES GERAIS */}
        {theme.isSectionVisible("conditions") && hasConditions && (
          <section className="p-surface-card rounded-xl p-6 border p-border-main space-y-3 break-inside-avoid">
            <div className="flex items-center gap-2">
              <FileText className="size-4 p-text-brand" />
              <h3 className="text-base font-bold p-text-ink">Condições & Observações</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-text-muted">
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
            {p.terms && <p className="text-xs p-text-faint whitespace-pre-line">{p.terms}</p>}
          </section>
        )}

        {/* INVESTIMENTO */}
        {theme.isSectionVisible("financial") && (
          <section className="break-inside-avoid">
            <h2 className="text-2xl sm:text-3xl mb-6 text-center font-bold p-text-ink p-heading-font">
              Investimento
            </h2>
            <div className="flex flex-col lg:flex-row p-surface-card rounded-2xl overflow-hidden border-2 p-border-brand">
              {/* Lado Esquerdo - Destaque */}
              <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center p-surface-brand">
                <div className="text-xs uppercase tracking-widest font-bold opacity-85 mb-2">
                  À vista no PIX
                </div>
                <div className="text-3xl sm:text-5xl font-bold leading-none mb-2">
                  {formatCurrency(vm.totals.totalPix, p.currency)}
                </div>
                <div className="text-xs sm:text-sm opacity-90 font-medium">
                  Total integral: {formatCurrency(vm.totals.total, p.currency)}
                </div>
              </div>

              {/* Lado Direito - Pagamento */}
              <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center p-surface-card space-y-2">
                <div className="text-xs uppercase tracking-widest font-bold p-text-faint">
                  Opções de Parcelamento
                </div>
                <div className="text-xl sm:text-2xl font-bold p-text-ink">
                  Cartão em até {vm.totals.parcelasCartao}x de{" "}
                  {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                </div>
                {p.valid_until && (
                  <p className="text-xs font-semibold p-text-brand pt-1">
                    Proposta válida até {formatDate(p.valid_until)}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* RODAPÉ E CHAMADA FINAL */}
      {theme.isSectionVisible("footer") && (
        <div className="mt-4 mx-6 sm:mx-10 lg:mx-14 rounded-2xl px-6 sm:px-10 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-surface-brand break-inside-avoid">
          <div className="flex items-center gap-4">
            {p.agent_photo_url ? (
              <img
                src={p.agent_photo_url}
                alt={p.agent_name || vm.agency.name}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-cover border-2 border-current/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-current/30 flex items-center justify-center text-lg font-bold">
                {(p.agent_name || vm.agency.name || "A").charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-base sm:text-lg">
                {p.agent_name || vm.agency.name}
              </div>
              <div className="text-xs uppercase tracking-wider opacity-80">
                Consultor Especialista
              </div>
              {(p.agent_whatsapp || vm.agency.whatsapp) && (
                <div className="text-xs font-semibold flex items-center gap-2 mt-1">
                  <PhoneCall className="size-3.5 shrink-0" />{" "}
                  {p.agent_whatsapp || vm.agency.whatsapp}
                </div>
              )}
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-xs uppercase tracking-wider opacity-75">Ref do Documento</div>
            <div className="font-mono text-xs opacity-95">
              #{p.number} {p.public_token ? `· ${p.public_token.slice(0, 12)}` : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
