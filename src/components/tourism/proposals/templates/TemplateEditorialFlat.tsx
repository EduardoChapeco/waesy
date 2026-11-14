/**
 * Template 1: Editorial Flat Premium (Clean Apple)
 * Layout Split na capa, superfícies neutras sólidas, contraste WCAG AA/AAA garantido.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  Plane,
  Hotel,
  Compass,
  Check,
  X,
  PhoneCall,
  Car,
  MapPin,
  Utensils,
  FileText,
} from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateEditorialFlat({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "editorial-flat" },
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
      className="flex flex-col w-full p-canvas-root p-body-font"
    >
      {/* CAPA SPLIT SCREEN */}
      <div className="w-full min-h-108 grid grid-cols-1 sm:grid-cols-2 break-inside-avoid border-b p-border-main">
        {/* Esquerda: Sólido com Cor Primária e Contraste Automático */}
        <div className="flex flex-col justify-between px-10 sm:px-12 py-12 p-surface-brand">
          {vm.agency.logo_url ? (
            <img
              src={vm.agency.logo_url}
              alt={vm.agency.name}
              crossOrigin="anonymous"
              className="h-11 w-auto max-w-44 object-contain mb-8"
            />
          ) : (
            <div className="text-xl font-bold tracking-tight mb-8">{vm.agency.name}</div>
          )}

          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest border border-current/25">
              Proposta #{p.number}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight p-heading-font">
              {p.title || "Proposta Exclusiva de Viagem"}
            </h1>
            <p className="text-sm opacity-90 max-w-md leading-relaxed">
              {p.notes ||
                `Um roteiro desenhado sob medida para você aproveitar o melhor de ${p.destination || "seu destino"}.`}
            </p>
          </div>
        </div>

        {/* Direita: Imagem de capa */}
        <div className="relative min-h-72 sm:min-h-full p-surface-subtle">
          {p.cover_image_url ? (
            <img
              src={p.cover_image_url}
              alt={p.destination || "Destino"}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full p-surface-subtle flex items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <Compass className="size-10 p-text-brand mx-auto opacity-60" />
                <div className="text-sm font-semibold p-text-muted">
                  {p.destination || "Roteiro Personalizado"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CORPO DA PROPOSTA */}
      <div className="px-8 sm:px-12 py-10 space-y-12">
        {/* Resumo Executivo */}
        {theme.isSectionVisible("summary") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 break-inside-avoid">
            <div className="p-surface-subtle border p-border-main p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase p-text-faint font-bold tracking-widest mb-2">
                  Preparado especialmente para
                </div>
                <div className="text-xl font-bold p-text-ink">
                  {vm.client.name || "Cliente a confirmar"}
                </div>
                {vm.client.email && (
                  <div className="text-xs p-text-muted mt-1">{vm.client.email}</div>
                )}
              </div>
              {p.valid_until && (
                <div className="mt-4 pt-3 border-t p-border-subtle flex items-center justify-between text-xs">
                  <span className="p-text-faint uppercase font-bold">Validade da Cotação</span>
                  <span className="font-bold p-text-brand">{formatDate(p.valid_until)}</span>
                </div>
              )}
            </div>

            <div className="p-surface-subtle border p-border-main p-6 rounded-xl grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase p-text-faint font-bold tracking-widest mb-1">
                  Destino
                </div>
                <div className="font-bold p-text-ink text-sm">{p.destination || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                  Viajantes
                </div>
                <div className="text-sm font-bold p-text-ink">
                  {vm.totalPax ? `${vm.totalPax} pax` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase p-text-faint font-bold tracking-widest mb-1">
                  Saída
                </div>
                <div className="font-semibold p-text-ink text-sm">
                  {p.travel_start ? formatDate(p.travel_start) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase p-text-faint font-bold tracking-widest mb-1">
                  Retorno
                </div>
                <div className="font-semibold p-text-ink text-sm">
                  {p.travel_end ? formatDate(p.travel_end) : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VOOS */}
        {theme.isSectionVisible("flights") && vm.hasFlights && (
          <section className="break-inside-avoid space-y-5">
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Malha Aérea
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {p.flights!.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border p-border-main p-surface-card break-inside-avoid"
                >
                  <div className="px-5 py-3 flex items-center justify-between p-surface-brand-soft border-b p-border-subtle">
                    <div className="flex items-center gap-2">
                      <Plane className="size-4 p-text-brand" />
                      <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                        {f.airline_name || f.airline || "Companhia Aérea"}
                      </span>
                    </div>
                    <span className="p-surface-card px-3 py-1 rounded-full text-xs font-mono font-bold p-text-ink border p-border-main">
                      {f.flight_number || "Voo Confirmado"}
                    </span>
                  </div>
                  <div className="p-6 flex items-center justify-between gap-4">
                    <div className="w-1/3 text-center">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight p-text-ink">
                        {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold p-text-muted mt-2">
                        {f.departure_time || "--:--"}
                      </div>
                      {(f.departure_date || f.date) && (
                        <div className="text-xs p-text-faint mt-1">
                          {formatDate(f.departure_date || f.date!)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col items-center relative px-4">
                      <div className="w-full border-t border-dashed p-border-main" />
                      <div className="-mt-3 p-surface-subtle px-3 py-1 rounded-full border p-border-main text-xs font-semibold p-text-muted uppercase tracking-wider">
                        {(f.stops_count ?? f.stops ?? 0) === 0
                          ? "Voo Direto"
                          : `${f.stops_count ?? f.stops} Parada${(f.stops_count ?? f.stops ?? 1) > 1 ? "s" : ""}`}
                      </div>
                      {f.baggage_rules && (
                        <div className="text-xs p-text-faint mt-2">{f.baggage_rules}</div>
                      )}
                    </div>
                    <div className="w-1/3 text-center">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight p-text-ink">
                        {(f.destination_iata || f.destination || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold p-text-muted mt-2">
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
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Hospedagem & Alojamento
            </h2>
            <div className="grid grid-cols-1 gap-5">
              {p.hotels!.map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border p-border-main p-surface-card break-inside-avoid"
                >
                  <div className="p-surface-brand-soft px-5 py-3 flex items-center justify-between border-b p-border-subtle">
                    <div className="flex items-center gap-2">
                      <Hotel className="size-4 p-text-brand" />
                      <span className="text-xs font-bold uppercase tracking-widest p-text-brand">
                        Hospedagem Selecionada
                      </span>
                    </div>
                    <span className="p-surface-card px-3 py-1 rounded-full text-xs font-semibold p-text-ink border p-border-main">
                      {h.meal_plan || "Café da Manhã"}
                    </span>
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold p-text-ink">{h.name}</h3>
                      {h.city && <div className="text-sm p-text-muted mt-1">{h.city}</div>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-surface-subtle p-4 rounded-lg border p-border-subtle">
                      <div>
                        <div className="text-xs uppercase p-text-faint font-bold mb-1">
                          Check-in
                        </div>
                        <div className="font-semibold p-text-ink text-sm">
                          {h.checkin ? formatDate(h.checkin) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase p-text-faint font-bold mb-1">
                          Check-out
                        </div>
                        <div className="font-semibold p-text-ink text-sm">
                          {h.checkout ? formatDate(h.checkout) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase p-text-faint font-bold mb-1">
                          Quartos
                        </div>
                        <div className="font-semibold p-text-ink text-sm">
                          {h.rooms?.[0]
                            ? h.rooms.map((r: any) => `${r.qty || 1}x ${r.type}`).join(", ")
                            : (h as any).room_type || "Standard"}
                        </div>
                      </div>
                    </div>
                    {h.images?.[0] && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-44">
                        {h.images.slice(0, 2).map((imgUrl: string, imgIdx: number) => (
                          <div
                            key={imgIdx}
                            className="rounded-lg overflow-hidden border p-border-subtle"
                          >
                            <img
                              src={imgUrl}
                              alt={h.name}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
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
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Roteiro Dia a Dia
            </h2>
            <div className="space-y-4">
              {p.itinerary!.map((d, i) => (
                <div
                  key={i}
                  className="p-surface-card border p-border-main rounded-xl p-5 sm:p-6 break-inside-avoid space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-brand">
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
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Traslados & Receptivo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.transfers!.map((t, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border p-border-main p-surface-subtle space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold p-text-ink text-sm">
                      <Car className="size-4 p-text-brand shrink-0" />
                      <span>{t.description || "Transfer In/Out"}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider p-surface-card border p-border-main p-text-muted">
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
                  {t.notes && <p className="text-xs p-text-faint leading-relaxed">{t.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PASSEIOS */}
        {theme.isSectionVisible("tours") && vm.hasTours && (
          <section className="break-inside-avoid space-y-5">
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Passeios & Experiências
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.tours!.map((tour, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border p-border-main p-surface-subtle space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold p-text-ink text-sm">
                    <Compass className="size-4 p-text-brand shrink-0" />
                    <span>{tour.description || (tour as any).title || "Passeio Turístico"}</span>
                  </div>
                  {tour.date && (
                    <div className="text-xs p-text-muted">Programação / Duração: {tour.date}</div>
                  )}
                  {tour.notes && (
                    <p className="text-xs p-text-muted leading-relaxed whitespace-pre-wrap">
                      {tour.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MAPA */}
        {p.map_image_url && (
          <section className="break-inside-avoid space-y-4">
            <h2 className="text-2xl font-bold p-text-ink pb-3 border-b p-border-main p-heading-font">
              Mapa da Rota
            </h2>
            <div className="w-full rounded-xl overflow-hidden border p-border-main p-surface-subtle flex justify-center p-4">
              <img
                src={p.map_image_url}
                alt="Mapa da rota"
                crossOrigin="anonymous"
                className="max-w-full max-h-72 object-contain rounded-lg"
              />
            </div>
          </section>
        )}

        {/* INCLUSÕES & EXCLUSÕES */}
        {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 break-inside-avoid">
            {vm.hasIncludes && (
              <div className="p-6 rounded-xl border p-border-main p-surface-card">
                <h2 className="text-lg font-bold p-text-ink mb-4 pb-2 border-b p-border-subtle p-heading-font">
                  O que inclui
                </h2>
                <ul className="space-y-3">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                      <Check className="size-4 p-text-brand mt-1 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {vm.hasExcludes && (
              <div className="p-6 rounded-xl border p-border-main p-surface-card">
                <h2 className="text-lg font-bold p-text-ink mb-4 pb-2 border-b p-border-subtle p-heading-font">
                  Não inclui
                </h2>
                <ul className="space-y-3">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm p-text-muted">
                      <X className="size-4 p-text-faint mt-1 shrink-0" />
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
          <section className="p-6 rounded-xl border p-border-main p-surface-subtle space-y-4 break-inside-avoid">
            <div className="flex items-center gap-2">
              <FileText className="size-4 p-text-brand" />
              <h3 className="text-base font-bold p-text-ink">
                Condições Comerciais & Informações Importantes
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-text-muted">
              {raw.boarding_requirements && (
                <div className="p-surface-card p-4 rounded-lg border p-border-subtle space-y-1">
                  <div className="font-bold uppercase tracking-wider p-text-ink">
                    Requisitos de Embarque
                  </div>
                  <p className="whitespace-pre-line">{raw.boarding_requirements}</p>
                </div>
              )}
              {raw.cancellation_policy && (
                <div className="p-surface-card p-4 rounded-lg border p-border-subtle space-y-1">
                  <div className="font-bold uppercase tracking-wider p-text-ink">
                    Política de Cancelamento e Reembolso
                  </div>
                  <p className="whitespace-pre-line">{raw.cancellation_policy}</p>
                </div>
              )}
            </div>
            {customEntries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {customEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="p-surface-card p-3 rounded-lg border p-border-subtle"
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
          <section className="pt-6 border-t p-border-main break-inside-avoid">
            <h2 className="text-2xl sm:text-3xl font-bold p-text-ink mb-6 text-center p-heading-font">
              Investimento
            </h2>
            <div className="flex flex-col sm:flex-row gap-8 items-center justify-between p-8 sm:p-10 p-surface-subtle rounded-2xl border p-border-main">
              <div className="space-y-2 text-center sm:text-left">
                <div className="text-xs uppercase tracking-widest font-bold p-text-faint">
                  Total à Vista (PIX)
                </div>
                <div className="text-4xl sm:text-5xl font-bold p-text-ink tracking-tight">
                  {formatCurrency(vm.totals.totalPix, p.currency)}
                </div>
                {vm.totals.descontoPixPercentual > 0 && (
                  <div className="inline-block p-badge-success px-3 py-1 rounded-full text-xs font-bold">
                    Com desconto de {vm.totals.descontoPixPercentual}%
                  </div>
                )}
              </div>
              <div className="text-center sm:text-right space-y-2">
                <div className="text-xs uppercase tracking-widest font-bold p-text-faint">
                  Cartão de Crédito
                </div>
                <div className="text-xl sm:text-2xl font-bold p-text-ink">
                  {vm.totals.parcelasCartao}x de{" "}
                  {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                </div>
                <div className="text-xs p-text-muted">
                  Total parcelado: {formatCurrency(vm.totals.total, p.currency)}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* FOOTER */}
      {theme.isSectionVisible("footer") && (
        <div className="mt-auto border-t p-border-main p-surface-card px-8 sm:px-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 break-inside-avoid">
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
              <div className="font-bold p-text-ink text-base">
                {p.agent_name || vm.agency.name}
              </div>
              <div className="text-xs uppercase tracking-wider p-text-faint">Consultor Oficial</div>
              {(p.agent_whatsapp || vm.agency.whatsapp) && (
                <div className="text-xs p-text-brand font-semibold flex items-center gap-1 mt-1">
                  <PhoneCall className="size-3" /> {p.agent_whatsapp || vm.agency.whatsapp}
                </div>
              )}
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-xs uppercase tracking-widest p-text-faint mb-1">
              Documento Ref
            </div>
            <div className="font-mono text-xs p-text-muted">
              #{p.number} {p.public_token ? `· ${p.public_token.slice(0, 12)}` : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
