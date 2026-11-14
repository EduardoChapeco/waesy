/**
 * Template 3: Dark Luxo Editorial (Obsidian & Champagne Gold)
 * Contraste WCAG AA/AAA verificado sobre canvas escuro ou customizado.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  Plane,
  Hotel,
  Car,
  Compass,
  Check,
  X,
  PhoneCall,
  MapPin,
  Utensils,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateDarkPremium({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "dark-premium" },
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
      className="flex flex-col w-full p-canvas-root p-body-font pb-16"
    >
      {/* CAPA CINEMATOGRÁFICA */}
      <div className="relative w-full min-h-112 break-inside-avoid overflow-hidden border-b p-border-main">
        {p.cover_image_url ? (
          <img
            src={p.cover_image_url}
            alt={p.title || "Capa da proposta"}
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full p-surface-subtle" />
        )}
        <div className="absolute inset-0 p-surface-hero-overlay" />

        <div className="relative z-10 flex flex-col justify-between min-h-112 p-8 sm:p-12 p-text-on-dark">
          {/* TOPO: LOGO E REFERÊNCIA */}
          <div className="flex justify-between items-start gap-4">
            {vm.agency.logo_url ? (
              <img
                src={vm.agency.logo_url}
                crossOrigin="anonymous"
                alt={vm.agency.name}
                className="h-11 w-auto max-w-44 object-contain"
                width={176}
                height={44}
              />
            ) : (
              <div className="text-xl font-bold tracking-widest uppercase p-text-on-dark">
                {vm.agency.name}
              </div>
            )}
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-widest p-text-on-dark-muted">
                Proposta Oficial
              </div>
              <div className="text-lg font-mono font-bold p-text-brand">#{p.number}</div>
            </div>
          </div>

          {/* TÍTULO CENTRALIZADO NA CAPA */}
          <div className="my-auto py-10 text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-widest p-surface-brand-soft border p-border-brand">
              Experiência Exclusiva
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight p-text-on-dark p-heading-font">
              {p.title || "Proposta Exclusiva"}
            </h1>
            <p className="text-base sm:text-lg font-medium p-text-on-dark-muted">
              {p.destination || "Roteiro Personalizado"}
            </p>
          </div>
        </div>
      </div>

      {/* RESUMO EXECUTIVO FLUTUANTE */}
      {theme.isSectionVisible("summary") && (
        <div className="px-8 sm:px-12 -mt-8 relative z-20 break-inside-avoid">
          <div className="p-surface-card rounded-xl p-6 sm:p-8 border p-border-main grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                Cliente
              </div>
              <div className="font-bold p-text-ink text-sm sm:text-base">
                {raw.client_name || vm.client.name || "—"}
              </div>
            </div>
            <div className="space-y-1 sm:border-l p-border-subtle sm:pl-4">
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                Período
              </div>
              <div className="font-semibold p-text-ink text-sm">
                {p.travel_start ? formatDate(p.travel_start) : "—"}
                {p.travel_end ? ` a ${formatDate(p.travel_end)}` : ""}
              </div>
            </div>
            <div className="space-y-1 sm:border-l p-border-subtle sm:pl-4">
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                Viajantes
              </div>
              <div className="text-sm sm:text-base font-bold p-text-ink">
                {vm.totalPax ? `${vm.totalPax} pax` : "—"}
              </div>
            </div>
            <div className="space-y-1 sm:border-l p-border-subtle sm:pl-4">
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                Validade
              </div>
              <div className="font-bold p-text-brand text-sm sm:text-base">
                {p.valid_until ? formatDate(p.valid_until) : "Consulte"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORPO DE CONTEÚDO */}
      <div className="pt-10 px-8 sm:px-12 space-y-12">
        {/* VOOS */}
        {theme.isSectionVisible("flights") && vm.hasFlights && (
          <section className="break-inside-avoid space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b p-border-main">
              <Plane className="size-5 p-text-brand shrink-0" />
              <h2 className="text-2xl font-bold p-text-ink p-heading-font">
                Transporte Aéreo
              </h2>
            </div>
            <div className="space-y-4">
              {p.flights!.map((f, i) => (
                <div
                  key={i}
                  className="border p-border-main rounded-xl overflow-hidden p-surface-card break-inside-avoid"
                >
                  <div className="p-surface-brand-soft px-6 py-3 flex justify-between items-center border-b p-border-subtle">
                    <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                      {f.airline_name || f.airline || "Companhia Aérea"}
                    </span>
                    <span className="text-xs font-mono font-bold p-text-ink p-surface-card px-3 py-1 rounded-full border p-border-main">
                      {f.flight_number || "Voo Confirmado"}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="w-full sm:w-1/3 text-center">
                      <div className="text-3xl sm:text-4xl font-bold p-text-ink tracking-tight">
                        {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold p-text-muted mt-1">
                        {f.departure_time || "--:--"}
                      </div>
                    </div>
                    <div className="flex-1 w-full px-4 relative flex flex-col items-center justify-center">
                      <div className="w-full border-t border-dashed p-border-main" />
                      <div className="-mt-3 p-surface-subtle border p-border-main px-4 py-1 rounded-full text-xs font-bold p-text-muted uppercase tracking-widest">
                        {f.departure_date
                          ? formatDate(f.departure_date)
                          : f.date
                            ? formatDate(f.date)
                            : "Direto"}
                      </div>
                      {f.baggage_rules && (
                        <div className="text-xs p-text-faint mt-2">{f.baggage_rules}</div>
                      )}
                    </div>
                    <div className="w-full sm:w-1/3 text-center">
                      <div className="text-3xl sm:text-4xl font-bold p-text-ink tracking-tight">
                        {(f.destination_iata || f.destination || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold p-text-muted mt-1">
                        {f.arrival_time || "--:--"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HOTÉIS */}
        {theme.isSectionVisible("hotels") && vm.hasHotels && (
          <section className="break-inside-avoid space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b p-border-main">
              <Hotel className="size-5 p-text-brand shrink-0" />
              <h2 className="text-2xl font-bold p-text-ink p-heading-font">
                Hospedagem Selecionada
              </h2>
            </div>
            <div className="space-y-5">
              {p.hotels!.map((h, i) => (
                <div
                  key={i}
                  className="border p-border-main rounded-xl overflow-hidden p-surface-card break-inside-avoid"
                >
                  <div className="p-surface-brand-soft px-6 py-3 flex justify-between items-center border-b p-border-subtle">
                    <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                      Hotel & Resort
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider p-text-ink p-surface-card px-3 py-1 rounded-full border p-border-main">
                      {h.meal_plan || "Café da Manhã"}
                    </span>
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold p-text-ink">{h.name}</h3>
                      {h.city && (
                        <div className="text-sm p-text-muted mt-1 flex items-center gap-2">
                          <MapPin className="size-3.5 p-text-brand shrink-0" />
                          <span>{h.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-surface-subtle p-4 rounded-lg border p-border-subtle">
                      <div>
                        <div className="text-xs uppercase font-bold tracking-wider p-text-faint">
                          Check-in
                        </div>
                        <div className="font-semibold p-text-ink text-sm mt-1">
                          {h.checkin ? formatDate(h.checkin) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-bold tracking-wider p-text-faint">
                          Check-out
                        </div>
                        <div className="font-semibold p-text-ink text-sm mt-1">
                          {h.checkout ? formatDate(h.checkout) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-bold tracking-wider p-text-faint">
                          Acomodação
                        </div>
                        <div className="font-semibold p-text-ink text-sm mt-1">
                          {h.rooms?.[0]
                            ? h.rooms.map((r: any) => `${r.qty || 1}x ${r.type}`).join(", ")
                            : (h as any).room_type || "Standard"}
                        </div>
                      </div>
                    </div>

                    {h.images?.[0] && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-48">
                        <div className="sm:col-span-2 rounded-lg overflow-hidden border p-border-subtle">
                          <img
                            src={h.images[0]}
                            alt={h.name}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {h.images[1] && (
                          <div className="rounded-lg overflow-hidden border p-border-subtle">
                            <img
                              src={h.images[1]}
                              alt={h.name}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ROTEIRO DIA A DIA */}
        {theme.isSectionVisible("itinerary") && vm.hasItinerary && (
          <section className="break-inside-avoid space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b p-border-main">
              <Compass className="size-5 p-text-brand shrink-0" />
              <h2 className="text-2xl font-bold p-text-ink p-heading-font">
                Roteiro Dia a Dia
              </h2>
            </div>
            <div className="space-y-4">
              {p.itinerary!.map((d, i) => (
                <div
                  key={i}
                  className="p-surface-card border p-border-main rounded-xl p-5 sm:p-6 break-inside-avoid space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider font-bold p-surface-brand">
                      {d.day || `Dia ${i + 1}`}
                    </span>
                    <h4 className="text-lg font-bold p-text-ink">{d.title}</h4>
                  </div>
                  {Boolean(
                    (d as any).city ||
                      (d as any).location ||
                      ((d as any).meals && (d as any).meals.length > 0) ||
                      ((d as any).included_meals && (d as any).included_meals.length > 0),
                  ) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {Boolean((d as any).city || (d as any).location) && (
                        <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-subtle border p-border-subtle px-3 py-1 rounded-full font-medium">
                          <MapPin className="size-3 p-text-brand" />
                          {(d as any).city || (d as any).location}
                        </span>
                      )}
                      {Boolean(
                        ((d as any).meals && (d as any).meals.length > 0) ||
                          ((d as any).included_meals && (d as any).included_meals.length > 0),
                      ) && (
                        <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-subtle border p-border-subtle px-3 py-1 rounded-full font-medium">
                          <Utensils className="size-3 p-text-brand" />
                          {Array.isArray((d as any).meals)
                            ? (d as any).meals.join(", ")
                            : Array.isArray((d as any).included_meals)
                              ? (d as any).included_meals.join(", ")
                              : (d as any).meals || (d as any).included_meals}
                        </span>
                      )}
                    </div>
                  )}
                  {d.description && (
                    <p className="p-text-muted leading-relaxed text-sm whitespace-pre-wrap">
                      {d.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TRASLADOS */}
        {theme.isSectionVisible("transfers") && vm.hasTransfers && (
          <section className="break-inside-avoid space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b p-border-main">
              <Car className="size-5 p-text-brand shrink-0" />
              <h2 className="text-2xl font-bold p-text-ink p-heading-font">
                Traslados & Receptivo
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.transfers!.map((t, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border p-border-main p-surface-card space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold p-text-ink text-sm">
                      {t.description || "Transfer In/Out"}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-brand-soft border p-border-brand">
                      {t.type === "shared" ? "Regular" : "Privativo"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs p-text-muted">
                    {t.vehicle && (
                      <span>
                        Veículo: <strong className="p-text-ink">{t.vehicle}</strong>
                      </span>
                    )}
                    {t.date && <span>Data: {formatDate(t.date)}</span>}
                  </div>
                  {t.notes && <p className="text-xs p-text-faint">{t.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PASSEIOS */}
        {theme.isSectionVisible("tours") && vm.hasTours && (
          <section className="break-inside-avoid space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b p-border-main">
              <Compass className="size-5 p-text-brand shrink-0" />
              <h2 className="text-2xl font-bold p-text-ink p-heading-font">
                Passeios & Experiências
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.tours!.map((tour, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border p-border-main p-surface-card space-y-2"
                >
                  <span className="font-bold p-text-ink text-sm block">
                    {tour.description || (tour as any).title || "Passeio"}
                  </span>
                  {tour.date && <div className="text-xs p-text-muted">Programação: {tour.date}</div>}
                  {tour.notes && (
                    <p className="text-xs p-text-muted whitespace-pre-wrap">{tour.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INCLUSÕES & EXCLUSÕES */}
        {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 break-inside-avoid">
            {vm.hasIncludes && (
              <div className="p-6 rounded-xl border p-border-main p-surface-card">
                <h3 className="font-bold p-text-ink text-base mb-4 flex items-center gap-2">
                  <span className="p-badge-success p-1 rounded-full">
                    <Check className="size-3.5" />
                  </span>
                  <span>O que está incluso</span>
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm p-text-muted">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="size-4 p-text-brand shrink-0 mt-1" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {vm.hasExcludes && (
              <div className="p-6 rounded-xl border p-border-main p-surface-card">
                <h3 className="font-bold p-text-ink text-base mb-4 flex items-center gap-2">
                  <span className="p-badge-danger p-1 rounded-full">
                    <X className="size-3.5" />
                  </span>
                  <span>Não incluso</span>
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm p-text-muted">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <X className="size-4 p-text-faint shrink-0 mt-1" />
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* CONDIÇÕES GERAIS E REQUISITOS */}
        {theme.isSectionVisible("conditions") && hasConditions && (
          <section className="p-6 rounded-xl border p-border-main p-surface-card space-y-4 break-inside-avoid">
            <div className="flex items-center gap-2">
              <FileText className="size-4 p-text-brand" />
              <h3 className="text-base font-bold p-text-ink">
                Condições Comerciais & Informações Importantes
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-text-muted">
              {raw.boarding_requirements && (
                <div className="p-surface-subtle p-4 rounded-lg border p-border-subtle space-y-1">
                  <div className="font-bold uppercase tracking-wider p-text-ink">
                    Requisitos de Embarque
                  </div>
                  <p className="whitespace-pre-line">{raw.boarding_requirements}</p>
                </div>
              )}
              {raw.cancellation_policy && (
                <div className="p-surface-subtle p-4 rounded-lg border p-border-subtle space-y-1">
                  <div className="font-bold uppercase tracking-wider p-text-ink">
                    Política de Cancelamento e Reembolso
                  </div>
                  <p className="whitespace-pre-line">{raw.cancellation_policy}</p>
                </div>
              )}
            </div>
            {customEntries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {customEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="p-surface-subtle p-3 rounded-lg border p-border-subtle"
                  >
                    <div className="text-xs uppercase font-bold p-text-faint">{entry.label}</div>
                    <div className="text-xs font-semibold p-text-ink mt-1">{entry.value}</div>
                  </div>
                ))}
              </div>
            )}
            {p.terms && (
              <p className="text-xs p-text-faint leading-relaxed whitespace-pre-line border-t p-border-subtle pt-3">
                {p.terms}
              </p>
            )}
          </section>
        )}

        {/* FINANCEIRO */}
        {theme.isSectionVisible("financial") && (
          <section className="break-inside-avoid">
            <div className="p-surface-card rounded-2xl p-8 sm:p-10 border-2 p-border-brand space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest p-surface-brand-soft">
                  <ShieldCheck className="size-3.5" /> Proposta Garantida
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold p-text-ink p-heading-font">
                  Resumo do Investimento
                </h2>
                <div className="text-xs uppercase font-bold tracking-widest p-text-faint pt-2">
                  Total do Pacote
                </div>
                <div className="text-4xl sm:text-5xl font-bold p-text-ink tracking-tight">
                  {formatCurrency(vm.totals.total, p.currency)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="p-surface-subtle border p-border-main p-6 rounded-xl text-center space-y-2">
                  <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                    Parcelamento no Cartão
                  </div>
                  <div className="text-xl font-bold p-text-ink">
                    {vm.totals.parcelasCartao}x de{" "}
                    {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                  </div>
                  <div className="text-xs p-text-muted">Consulte condições de entrada</div>
                </div>

                <div className="p-surface-brand-soft rounded-xl p-6 border p-border-brand text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-widest p-text-brand">
                      À vista no PIX
                    </span>
                    {vm.totals.descontoPixPercentual > 0 && (
                      <span className="p-badge-success text-xs font-bold px-2 py-1 rounded-full">
                        -{vm.totals.descontoPixPercentual}%
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold p-text-brand">
                    {formatCurrency(vm.totals.totalPix, p.currency)}
                  </div>
                  <div className="text-xs p-text-muted">Liquidação imediata com desconto</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* FOOTER */}
      {theme.isSectionVisible("footer") && (
        <div className="mt-14 pt-8 border-t p-border-main px-8 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4 break-inside-avoid">
          <div className="flex items-center gap-4">
            {p.agent_photo_url ? (
              <img
                src={p.agent_photo_url}
                alt={p.agent_name || vm.agency.name}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-cover border p-border-main"
              />
            ) : (
              <div className="w-12 h-12 rounded-full p-surface-brand flex items-center justify-center font-bold text-base">
                {(p.agent_name || vm.agency.name || "A").charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold p-text-ink text-base">
                {p.agent_name || vm.agency.name}
              </div>
              <div className="text-xs uppercase tracking-wider p-text-faint">
                Consultor Especialista
              </div>
              {(p.agent_whatsapp || vm.agency.whatsapp) && (
                <div className="text-xs font-semibold p-text-brand flex items-center gap-1 mt-1">
                  <PhoneCall className="size-3" /> {p.agent_whatsapp || vm.agency.whatsapp}
                </div>
              )}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs uppercase tracking-widest p-text-faint">Ref. Proposta</div>
            <div className="font-mono text-xs p-text-muted">
              #{p.number} {p.public_token ? `· ${p.public_token.slice(0, 10)}` : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
