/**
 * Template 6: Catálogo de Grupo & Pacotes
 * Focado em venda estruturada de pacotes e grupos rodoviários/aéreos com ficha completa.
 */
import type React from "react";
import { type Proposal } from "@/services/proposals";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { buildBaseViewModel } from "@/lib/adapters";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";
import {
  Users,
  MapPin,
  Calendar,
  Bus,
  CheckCircle2,
  Building2,
  Plane,
  Compass,
  PhoneCall,
  FileText,
  X,
} from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateGroupCatalog({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const raw = p as unknown as Record<string, any>;
  const theme = resolveProposalCanvasTheme(
    { ...raw, template: raw.template || "group-catalog" },
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
      className="flex flex-col w-full p-canvas-root p-body-font pb-14"
    >
      {/* CAPA - ESTILO BANNER DE CATÁLOGO */}
      <div className="relative w-full min-h-96 break-inside-avoid overflow-hidden border-b p-border-main">
        {p.cover_image_url ? (
          <img
            src={p.cover_image_url}
            alt={p.title || "Capa"}
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full p-surface-subtle" />
        )}
        <div className="absolute inset-0 p-surface-hero-overlay" />

        <div className="relative z-10 flex flex-col justify-between min-h-96 p-8 sm:p-12 p-text-on-dark">
          <div className="flex items-center justify-between gap-4">
            {vm.agency.logo_url ? (
              <img
                src={vm.agency.logo_url}
                crossOrigin="anonymous"
                alt={vm.agency.name}
                className="h-10 w-auto max-w-40 object-contain"
                width={160}
                height={40}
              />
            ) : (
              <div className="text-xl font-bold tracking-tight p-text-on-dark uppercase">
                {vm.agency.name}
              </div>
            )}
            <div className="text-right text-xs font-mono uppercase tracking-widest p-text-on-dark-muted">
              Cotação #{p.number}
            </div>
          </div>

          <div className="max-w-2xl space-y-4 pt-12">
            {raw.package_type === "group" || raw.is_group ? (
              <div className="inline-flex items-center gap-2 p-surface-brand px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                <Users className="size-3.5" /> Excursão / Pacote em Grupo
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 p-surface-brand px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                <Plane className="size-3.5" /> Pacote Completo
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight p-text-on-dark p-heading-font">
              {p.title || "Proposta de Viagem"}
            </h1>

            <div className="flex flex-wrap items-center gap-4 font-semibold text-sm sm:text-base p-text-on-dark-muted">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 p-text-brand" /> {p.destination || "Destino"}
              </div>
              <span>·</span>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 p-text-brand" />{" "}
                {p.travel_start ? formatDate(p.travel_start) : "A definir"}
                {p.travel_end ? ` a ${formatDate(p.travel_end)}` : ""}
              </div>
              {vm.totalPax > 0 && (
                <>
                  <span>·</span>
                  <span>{vm.totalPax} pax</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 sm:px-12 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA - DESCRIÇÃO, LOGÍSTICA E ROTEIRO (Ocupa 2 colunas) */}
        <div className="lg:col-span-2 space-y-8">
          {theme.isSectionVisible("summary") && (
            <div className="p-surface-card rounded-xl p-6 sm:p-8 border p-border-main break-inside-avoid space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-border-subtle pb-3">
                <h2 className="text-xl font-bold p-text-ink uppercase tracking-tight p-heading-font">
                  Sobre a Viagem
                </h2>
                {vm.client.name && (
                  <span className="text-xs font-semibold p-text-muted">
                    Passageiro(a): <strong className="p-text-ink">{vm.client.name}</strong>
                  </span>
                )}
              </div>
              <p className="p-text-muted leading-relaxed text-sm sm:text-base whitespace-pre-line">
                {p.notes ||
                  p.description ||
                  raw.subtitle ||
                  `Um roteiro cuidadosamente planejado para você aproveitar o melhor de ${p.destination || "seu destino"} com total conforto, segurança e assistência.`}
              </p>
            </div>
          )}

          {/* MALHA AÉREA & TRANSPORTE RODOVIÁRIO */}
          {((theme.isSectionVisible("flights") && vm.hasFlights) ||
            (theme.isSectionVisible("transfers") && vm.hasTransfers)) && (
            <div className="p-surface-card rounded-xl p-6 sm:p-8 border p-border-main break-inside-avoid space-y-5">
              <h2 className="text-xl font-bold p-text-ink uppercase tracking-tight p-heading-font">
                Transporte & Embarques
              </h2>

              {theme.isSectionVisible("flights") && vm.hasFlights && (
                <div className="space-y-3">
                  {p.flights!.map((f, idx) => (
                    <div
                      key={`fl-${idx}`}
                      className="p-surface-subtle border p-border-subtle rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Plane className="size-4 p-text-brand shrink-0" />
                        <div>
                          <div className="font-bold p-text-ink text-sm">
                            {(f.origin_iata || f.origin || "---").slice(0, 3).toUpperCase()} →{" "}
                            {(f.destination_iata || f.destination || "---")
                              .slice(0, 3)
                              .toUpperCase()}
                          </div>
                          <div className="text-xs p-text-muted">
                            {f.airline_name || f.airline}{" "}
                            {f.flight_number ? `· ${f.flight_number}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold p-text-ink">
                        {f.departure_date
                          ? formatDate(f.departure_date)
                          : f.date
                            ? formatDate(f.date)
                            : ""}{" "}
                        {f.departure_time ? `(${f.departure_time} - ${f.arrival_time || ""})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {theme.isSectionVisible("transfers") && vm.hasTransfers && (
                <div className="space-y-3">
                  {p.transfers!.map((t, idx) => (
                    <div
                      key={`tr-${idx}`}
                      className="p-surface-subtle border p-border-subtle rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold p-text-ink text-sm">
                          <Bus className="size-4 p-text-brand shrink-0" />
                          <span>{t.description || "Transporte Rodoviário / Transfer"}</span>
                        </div>
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded p-surface-brand-soft p-text-brand">
                          {t.vehicle || (t.type === "shared" ? "Regular" : "Privativo")}
                        </span>
                      </div>
                      {t.notes && <p className="text-xs p-text-muted">{t.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HOSPEDAGEM */}
          {theme.isSectionVisible("hotels") && vm.hasHotels && (
            <div className="p-surface-card rounded-xl p-6 sm:p-8 border p-border-main break-inside-avoid space-y-4">
              <h2 className="text-xl font-bold p-text-ink uppercase tracking-tight p-heading-font">
                Hospedagem
              </h2>
              <div className="space-y-4">
                {p.hotels!.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-surface-subtle border p-border-subtle rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-bold p-text-ink text-base flex items-center gap-2">
                        <Building2 className="size-4 p-text-brand shrink-0" />
                        <span>{h.name}</span>
                      </div>
                      {h.city && <div className="text-xs p-text-muted">{h.city}</div>}
                      <div className="text-xs p-text-muted pt-1">
                        Check-in: <strong className="p-text-ink">{formatDate(h.checkin)}</strong> ·
                        Check-out: <strong className="p-text-ink">{formatDate(h.checkout)}</strong>
                      </div>
                    </div>
                    <div className="self-start p-surface-brand-soft border p-border-brand px-3 py-1 rounded-full text-xs font-bold p-text-brand">
                      {h.meal_plan || "Café da Manhã"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROGRAMAÇÃO DIA A DIA */}
          {theme.isSectionVisible("itinerary") && vm.hasItinerary && (
            <div className="p-surface-card rounded-xl p-6 sm:p-8 border p-border-main break-inside-avoid">
              <h2 className="text-xl font-bold p-text-ink uppercase tracking-tight mb-6 p-heading-font">
                Programação do Roteiro
              </h2>
              <div className="space-y-6">
                {p.itinerary!.map((d, i) => (
                  <div key={i} className="flex gap-4 break-inside-avoid">
                    <div className="w-10 shrink-0 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs p-surface-brand">
                        {i + 1}
                      </div>
                      {i !== p.itinerary!.length - 1 && (
                        <div className="w-1 p-surface-subtle flex-1 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="text-base font-bold p-text-ink">{d.title}</h4>
                        {Boolean(d.city || (d as any).location) && (
                          <span className="px-2 py-1 rounded p-surface-subtle border p-border-subtle text-xs font-semibold p-text-muted">
                            {d.city || (d as any).location}
                          </span>
                        )}
                      </div>
                      {d.description && (
                        <p className="p-text-muted text-sm leading-relaxed whitespace-pre-line">
                          {d.description}
                        </p>
                      )}
                      {Array.isArray(d.meals || (d as any).included_meals) &&
                        (d.meals || (d as any).included_meals).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(d.meals || (d as any).included_meals).map(
                              (meal: string, mIdx: number) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-1 rounded p-surface-brand-soft text-xs font-semibold p-text-brand"
                                >
                                  {meal}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONDIÇÕES GERAIS */}
          {theme.isSectionVisible("conditions") && hasConditions && (
            <div className="p-surface-card rounded-xl p-6 border p-border-main space-y-3 break-inside-avoid">
              <div className="flex items-center gap-2">
                <FileText className="size-4 p-text-brand" />
                <h3 className="text-base font-bold p-text-ink">
                  Condições & Informações de Embarque
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
              {p.terms && <p className="text-xs p-text-faint whitespace-pre-line">{p.terms}</p>}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - PAINEL DE INVESTIMENTO E INCLUSÕES */}
        <div className="space-y-6">
          {theme.isSectionVisible("financial") && (
            <div className="p-surface-card border-2 p-border-brand rounded-2xl p-6 break-inside-avoid">
              <div className="text-center mb-6 border-b p-border-subtle pb-6">
                <div className="text-xs uppercase font-bold tracking-widest p-text-faint mb-1">
                  Investimento em até {vm.totals.parcelasCartao}x
                </div>
                <div className="text-4xl font-bold tracking-tight p-text-ink">
                  {formatCurrency(vm.totals.valorParcelaCartao, p.currency)}
                </div>
                <div className="text-xs font-semibold p-text-muted mt-1">
                  Valor por parcela no cartão
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="p-text-muted font-semibold">À vista no PIX</span>
                  <span className="font-bold p-text-brand">
                    {formatCurrency(vm.totals.totalPix, p.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="p-text-muted font-semibold">Valor Total do Pacote</span>
                  <span className="font-bold p-text-ink">
                    {formatCurrency(vm.totals.total, p.currency)}
                  </span>
                </div>
                {p.valid_until && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t p-border-subtle">
                    <span className="p-text-faint">Validade</span>
                    <span className="font-semibold p-text-ink">{formatDate(p.valid_until)}</span>
                  </div>
                )}
              </div>

              <div className="w-full py-4 rounded-xl text-center p-surface-brand font-bold uppercase tracking-widest text-sm">
                {raw.package_type === "group" ? "Garantir Vaga" : "Proposta Oficial"}
              </div>
              {Boolean(raw.package_type === "group" && raw.remaining_spots) && (
                <div className="text-center text-xs p-text-muted font-bold mt-3">
                  {raw.remaining_spots} vagas disponíveis
                </div>
              )}
            </div>
          )}

          {theme.isSectionVisible("includes") && (
            <div className="p-surface-card rounded-2xl p-6 border p-border-main break-inside-avoid space-y-4">
              <h3 className="font-bold p-text-ink uppercase tracking-tight text-base p-heading-font">
                O Pacote Inclui
              </h3>
              <ul className="space-y-3">
                {vm.hasTransfers && (
                  <li className="flex items-start gap-3 text-xs sm:text-sm font-medium p-text-muted">
                    <Bus className="size-4 p-text-brand shrink-0 mt-1" />
                    <span>
                      {p.transfers?.[0]?.description ||
                        p.transfers?.[0]?.vehicle ||
                        "Transporte / Receptivo"}
                    </span>
                  </li>
                )}
                {vm.hasFlights && (
                  <li className="flex items-start gap-3 text-xs sm:text-sm font-medium p-text-muted">
                    <Plane className="size-4 p-text-brand shrink-0 mt-1" />
                    <span>Passagens Aéreas Conforme Malha</span>
                  </li>
                )}
                {vm.hasHotels && (
                  <li className="flex items-start gap-3 text-xs sm:text-sm font-medium p-text-muted">
                    <Building2 className="size-4 p-text-brand shrink-0 mt-1" />
                    <span>
                      Hospedagem ({p.hotels?.[0]?.meal_plan || "Conforme selecionado"})
                    </span>
                  </li>
                )}
                {p.includes?.map((inc, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-xs sm:text-sm font-medium p-text-muted"
                  >
                    <CheckCircle2 className="size-4 p-text-brand shrink-0 mt-1" />
                    <span>{inc}</span>
                  </li>
                ))}
                {theme.isSectionVisible("tours") &&
                  p.tours?.map((tour: any, tIdx: number) => (
                    <li
                      key={`tour-${tIdx}`}
                      className="flex items-start gap-3 text-xs sm:text-sm font-medium p-text-muted"
                    >
                      <Compass className="size-4 p-text-brand shrink-0 mt-1" />
                      <span>
                        {tour.description || tour.name || tour.title}
                        {tour.date ? ` (${tour.date})` : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              {vm.hasExcludes && (
                <div className="pt-4 border-t p-border-subtle space-y-2">
                  <h4 className="font-bold p-text-faint uppercase tracking-wider text-xs">
                    Não Inclui
                  </h4>
                  <ul className="space-y-2">
                    {p.excludes?.map((exc, eIdx) => (
                      <li key={eIdx} className="text-xs p-text-muted flex items-start gap-2">
                        <X className="size-3.5 p-text-faint shrink-0 mt-1" />
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ASSINATURA DO CONSULTOR NA COLUNA LATERAL */}
          {theme.isSectionVisible("footer") && (
            <div className="p-surface-subtle rounded-2xl p-5 border p-border-main flex items-center gap-4 break-inside-avoid">
              <div className="w-10 h-10 rounded-full p-surface-brand flex items-center justify-center font-bold text-sm shrink-0">
                {(p.agent_name || vm.agency.name || "A").charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-bold p-text-ink text-sm truncate">
                  {p.agent_name || vm.agency.name}
                </div>
                <div className="text-xs p-text-faint">Atendimento & Reservas</div>
                {(p.agent_whatsapp || vm.agency.whatsapp) && (
                  <div className="text-xs font-semibold p-text-brand flex items-center gap-1 mt-1">
                    <PhoneCall className="size-3" /> {p.agent_whatsapp || vm.agency.whatsapp}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
