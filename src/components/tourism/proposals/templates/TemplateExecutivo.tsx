/**
 * Template 2: Proposta Executiva B2B
 * Estilo corporativo analítico, tabular, foco em clareza de dados e contraste WCAG AA/AAA.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
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
  FileText,
} from "lucide-react";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateExecutivo({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "executivo-b2b" },
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
      className="flex flex-col w-full p-canvas-root p-body-font px-10 sm:px-14 py-12"
    >
      {/* HEADER DA CAPA */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b p-border-main break-inside-avoid">
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
          <div className="text-2xl font-bold tracking-tight p-text-ink">{vm.agency.name}</div>
        )}
        <div className="text-right">
          <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
            Cotação Corporativa
          </div>
          <div className="text-2xl font-mono font-bold p-text-brand">#{p.number}</div>
        </div>
      </div>

      {/* JANELA CENTRAL (Capa) */}
      <div className="w-full h-56 rounded-xl overflow-hidden relative mb-8 flex items-center justify-center break-inside-avoid border p-border-main p-surface-brand">
        {p.cover_image_url && (
          <>
            <img
              src={p.cover_image_url}
              alt={p.title || "Proposta"}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 p-surface-hero-overlay" />
          </>
        )}
        <div className="relative z-10 text-center px-8 space-y-2">
          <h1
            className={`text-3xl sm:text-4xl font-bold tracking-tight p-heading-font ${p.cover_image_url ? "p-text-on-dark" : ""}`}
          >
            {p.title || "Proposta de Viagem"}
          </h1>
          {p.destination && (
            <p className={`text-sm font-medium ${p.cover_image_url ? "p-text-on-dark-muted" : "opacity-90"}`}>
              {p.destination}
            </p>
          )}
        </div>
      </div>

      {/* DADOS DO CLIENTE */}
      {theme.isSectionVisible("summary") && (
        <div className="border p-border-main p-surface-subtle rounded-xl p-6 mb-10 break-inside-avoid">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                Aos cuidados de
              </div>
              <div className="font-bold p-text-ink text-sm">
                {raw.client_name || vm.client.name || "Cliente"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                Destino
              </div>
              <div className="font-bold p-text-ink text-sm">{p.destination || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                Período
              </div>
              <div className="font-semibold p-text-ink text-sm">
                {p.travel_start ? formatDate(p.travel_start) : "—"} a{" "}
                {p.travel_end ? formatDate(p.travel_end) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                Passageiros
              </div>
              <div className="font-bold p-text-ink text-sm">
                {vm.totalPax ? `${vm.totalPax} pax` : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORPO DE SERVIÇOS */}
      <div className="space-y-10">
        {theme.isSectionVisible("flights") && vm.hasFlights && (
          <section className="break-inside-avoid space-y-4">
            <h2 className="text-lg font-bold p-text-ink flex items-center gap-2 pb-2 border-b p-border-main p-heading-font">
              <Plane className="size-4 p-text-brand" /> Malha Aérea
            </h2>
            <div className="space-y-3">
              {p.flights!.map((f, i) => (
                <div
                  key={i}
                  className="border p-border-main p-surface-card rounded-xl p-5 break-inside-avoid"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs uppercase font-bold tracking-wider p-text-brand">
                      {f.airline_name || f.airline || "Cia Aérea"}
                    </span>
                    <span className="text-xs font-mono font-bold p-text-ink p-surface-subtle px-3 py-1 rounded border p-border-subtle">
                      {f.flight_number || "Voo Confirmado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold p-text-ink">
                        {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-xs font-semibold p-text-muted mt-1">
                        {f.departure_time || "--:--"}
                      </div>
                    </div>
                    <div className="flex-1 px-6 flex flex-col items-center">
                      <div className="w-full h-px border-t border-dashed p-border-main mb-2" />
                      <div className="text-xs p-text-faint uppercase font-bold tracking-widest">
                        {(f.stops_count ?? f.stops ?? 0) === 0
                          ? "Direto"
                          : `${f.stops_count ?? f.stops} paradas`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold p-text-ink">
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

        {theme.isSectionVisible("hotels") && vm.hasHotels && (
          <section className="break-inside-avoid space-y-4">
            <h2 className="text-lg font-bold p-text-ink flex items-center gap-2 pb-2 border-b p-border-main p-heading-font">
              <Hotel className="size-4 p-text-brand" /> Hospedagem Corporativa
            </h2>
            <div className="space-y-4">
              {p.hotels!.map((h, i) => (
                <div
                  key={i}
                  className="border p-border-main p-surface-card rounded-xl p-5 break-inside-avoid flex flex-col sm:flex-row gap-5"
                >
                  {h.images?.[0] && (
                    <div className="w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden border p-border-subtle">
                      <img
                        src={h.images[0]}
                        alt={h.name}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <div className="text-lg font-bold p-text-ink">{h.name}</div>
                        {h.city && <div className="text-xs p-text-muted">{h.city}</div>}
                      </div>
                      <div className="p-surface-brand-soft px-3 py-1 rounded-full text-xs font-bold p-text-brand border p-border-brand">
                        {h.meal_plan || "Café da Manhã"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t p-border-subtle">
                      <div>
                        <div className="text-xs uppercase font-bold p-text-faint">Check-in</div>
                        <div className="text-sm font-semibold p-text-ink">
                          {h.checkin ? formatDate(h.checkin) : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-bold p-text-faint">Check-out</div>
                        <div className="text-sm font-semibold p-text-ink">
                          {h.checkout ? formatDate(h.checkout) : "—"}
                        </div>
                      </div>
                      {h.rooms?.[0] && (
                        <div>
                          <div className="text-xs uppercase font-bold p-text-faint">Acomodação</div>
                          <div className="text-sm font-semibold p-text-ink">
                            {h.rooms.map((r: any) => `${r.qty || 1}x ${r.type}`).join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {theme.isSectionVisible("itinerary") && vm.hasItinerary && (
          <section className="break-inside-avoid space-y-4">
            <h2 className="text-lg font-bold p-text-ink flex items-center gap-2 pb-2 border-b p-border-main p-heading-font">
              <Compass className="size-4 p-text-brand" /> Cronograma de Atividades
            </h2>
            <div className="space-y-3">
              {p.itinerary!.map((d, i) => (
                <div
                  key={i}
                  className="border p-border-main rounded-xl p-5 p-surface-subtle break-inside-avoid space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded p-surface-brand text-xs font-bold font-mono">
                      {d.day || `Dia ${i + 1}`}
                    </span>
                    <h3 className="font-bold p-text-ink text-base">{d.title}</h3>
                  </div>
                  {Boolean(
                    (d as any).city ||
                      (d as any).location ||
                      ((d as any).meals && (d as any).meals.length > 0) ||
                      ((d as any).included_meals && (d as any).included_meals.length > 0),
                  ) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {Boolean((d as any).city || (d as any).location) && (
                        <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-card border p-border-subtle px-2 py-1 rounded font-medium">
                          <MapPin className="size-3 p-text-brand" />
                          {(d as any).city || (d as any).location}
                        </span>
                      )}
                      {Boolean(
                        ((d as any).meals && (d as any).meals.length > 0) ||
                          ((d as any).included_meals && (d as any).included_meals.length > 0),
                      ) && (
                        <span className="inline-flex items-center gap-1 text-xs p-text-muted p-surface-card border p-border-subtle px-2 py-1 rounded font-medium">
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
                    <p className="p-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                      {d.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {((theme.isSectionVisible("transfers") && vm.hasTransfers) ||
          (theme.isSectionVisible("tours") && vm.hasTours)) && (
          <section className="break-inside-avoid space-y-4">
            <h2 className="text-lg font-bold p-text-ink pb-2 border-b p-border-main p-heading-font">
              Logística Terrestre & Serviços
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {theme.isSectionVisible("transfers") &&
                p.transfers!.map((t, i) => (
                  <div
                    key={`tr-${i}`}
                    className="border p-border-main p-surface-card rounded-xl p-4 flex items-start gap-3 break-inside-avoid"
                  >
                    <div className="w-9 h-9 rounded-lg p-surface-brand-soft flex items-center justify-center shrink-0">
                      <Car className="size-4 p-text-brand" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold p-text-ink text-sm">{t.description}</div>
                      <div className="text-xs p-text-muted">
                        {t.type === "private" ? "Privativo" : "Regular"}
                        {t.vehicle ? ` · ${t.vehicle}` : ""}
                        {t.date ? ` · ${formatDate(t.date)}` : ""}
                      </div>
                      {t.notes && <div className="text-xs p-text-faint">{t.notes}</div>}
                    </div>
                  </div>
                ))}
              {theme.isSectionVisible("tours") &&
                p.tours!.map((t, i) => (
                  <div
                    key={`to-${i}`}
                    className="border p-border-main p-surface-card rounded-xl p-4 flex items-start gap-3 break-inside-avoid"
                  >
                    <div className="w-9 h-9 rounded-lg p-surface-brand-soft flex items-center justify-center shrink-0">
                      <Compass className="size-4 p-text-brand" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold p-text-ink text-sm">{t.description}</div>
                      {t.date && <div className="text-xs p-text-muted">{t.date}</div>}
                      {t.notes && <div className="text-xs p-text-faint">{t.notes}</div>}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* INCLUSÕES & EXCLUSÕES */}
        {theme.isSectionVisible("includes") && (vm.hasIncludes || vm.hasExcludes) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 break-inside-avoid">
            {vm.hasIncludes && (
              <div className="border p-border-main p-surface-card rounded-xl p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider p-text-ink mb-3 flex items-center gap-2">
                  <Check className="size-4 p-text-brand" /> Serviços Inclusos
                </h3>
                <ul className="space-y-2 text-xs p-text-muted">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-3.5 p-text-brand shrink-0 mt-1" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {vm.hasExcludes && (
              <div className="border p-border-main p-surface-card rounded-xl p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider p-text-ink mb-3 flex items-center gap-2">
                  <X className="size-4 p-text-faint" /> Não Inclusos
                </h3>
                <ul className="space-y-2 text-xs p-text-muted">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="size-3.5 p-text-faint shrink-0 mt-1" />
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* CONDIÇÕES GERAIS */}
        {theme.isSectionVisible("conditions") && hasConditions && (
          <section className="border p-border-main p-surface-subtle rounded-xl p-5 space-y-3 break-inside-avoid">
            <div className="flex items-center gap-2">
              <FileText className="size-4 p-text-brand" />
              <h3 className="text-sm font-bold uppercase tracking-wider p-text-ink">
                Condições & Requisitos
              </h3>
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
            {customEntries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {customEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="p-surface-card p-3 rounded border p-border-subtle"
                  >
                    <div className="text-xs uppercase font-bold p-text-faint">{entry.label}</div>
                    <div className="text-xs font-semibold p-text-ink">{entry.value}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* FINANCEIRO */}
        {theme.isSectionVisible("financial") && (
          <section className="mt-10 break-inside-avoid">
            <div className="p-surface-subtle rounded-2xl p-8 border-2 p-border-brand">
              <div className="flex items-center justify-between border-b p-border-main pb-4 mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wider p-text-ink p-heading-font">
                  Investimento Total
                </h2>
                {p.valid_until && (
                  <span className="text-xs font-semibold p-text-brand">
                    Válida até {formatDate(p.valid_until)}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                <div className="space-y-1">
                  <div className="text-xs uppercase font-bold tracking-widest p-text-faint">
                    Valor Total da Proposta
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold p-text-ink tracking-tight font-mono">
                    {formatCurrency(vm.totals.total, p.currency)}
                  </div>
                </div>

                <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-surface-card border p-border-main rounded-xl p-4 min-w-48">
                    <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                      Cartão de Crédito
                    </div>
                    <div className="text-base font-bold p-text-ink">
                      {vm.totals.parcelasCartao}x de{" "}
                      {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                    </div>
                  </div>

                  <div className="p-surface-brand-soft rounded-xl p-4 border p-border-brand min-w-48">
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <span className="text-xs uppercase font-bold tracking-widest p-text-brand">
                        À vista (PIX)
                      </span>
                      {vm.totals.descontoPixPercentual > 0 && (
                        <span className="p-badge-success px-2 py-1 rounded text-xs font-bold">
                          -{vm.totals.descontoPixPercentual}%
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold p-text-brand font-mono">
                      {formatCurrency(vm.totals.totalPix, p.currency)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {p.terms && (
              <div className="mt-4 text-xs p-text-faint leading-relaxed whitespace-pre-line">
                {p.terms}
              </div>
            )}
          </section>
        )}
      </div>

      {/* RODAPÉ DO DOCUMENTO */}
      {theme.isSectionVisible("footer") && (
        <div className="mt-12 pt-8 border-t p-border-main flex flex-col sm:flex-row justify-between items-center gap-4 break-inside-avoid">
          <div className="flex items-center gap-4">
            {p.agent_photo_url ? (
              <img
                src={p.agent_photo_url}
                alt={p.agent_name || vm.agency.name}
                crossOrigin="anonymous"
                className="w-11 h-11 rounded-full object-cover border p-border-main"
              />
            ) : (
              <div className="w-11 h-11 rounded-full p-surface-brand flex items-center justify-center font-bold text-sm">
                {(p.agent_name || vm.agency.name || "A").charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold p-text-ink text-sm">{p.agent_name || vm.agency.name}</div>
              <div className="text-xs p-text-faint">Consultor Oficial</div>
              {(p.agent_whatsapp || vm.agency.whatsapp) && (
                <div className="text-xs p-text-brand font-semibold flex items-center gap-1 mt-1">
                  <PhoneCall className="size-3" /> {p.agent_whatsapp || vm.agency.whatsapp}
                </div>
              )}
            </div>
          </div>
          {vm.agency.logo_url && (
            <img
              src={vm.agency.logo_url}
              crossOrigin="anonymous"
              alt={vm.agency.name}
              className="h-8 w-auto max-w-32 object-contain opacity-80"
              width={128}
              height={32}
            />
          )}
        </div>
      )}
    </div>
  );
}
