import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane,
  Building2,
  ShieldCheck,
  Receipt,
  Coffee,
  Car,
  Scale,
  MapPin,
  Phone,
  Globe,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getAirportDetailedProfile } from "@/services/tourism-airports.functions";
import type { AirportRichProfile } from "@/lib/tourism/airport-intelligence";

export const Route = createFileRoute("/_store/aeroporto/$iata")({
  loader: async ({ params }: { params: any }) => {
    try {
      const cleanIata = (params.iata || "").trim().toUpperCase();
      const res = await getAirportDetailedProfile({ data: { iata: cleanIata } });
      return { profile: res.profile, iata: cleanIata };
    } catch (err) {
      console.error("[loader:_store.aeroporto.$iata] Error:", err);
      return { profile: null, iata: params.iata?.toUpperCase() || "" };
    }
  },
  head: ({ loaderData }) => {
    const data = loaderData as { profile: AirportRichProfile | null; iata: string };
    const p = data?.profile;
    const title = p
      ? `Aeroporto ${p.name} (${p.iata_code}) — Terminais, Polícia Federal, Táxis e Serviços | Waesy`
      : `Aeroporto ${data?.iata || "Mundial"} | Waesy`;
    const description = p?.seo_description || "Guia oficial e completo de aeroportos, terminais, taxas e direitos do passageiro no Waesy.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: AirportDetailPage,
});

function AirportDetailPage() {
  const { profile, iata } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<
    "geral" | "orgaos" | "taxas" | "comodidades" | "transporte" | "anac" | "mapa"
  >("geral");

  if (!profile) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <Plane className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Aeroporto {iata} Não Encontrado</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          O código IATA informado não foi localizado na base mundial ou está temporariamente indisponível.
        </p>
        <div className="pt-4">
          <Button asChild variant="outline" className="h-11 min-h-11 px-6">
            <Link to={"/classificados" as any}>Explorar Viagens no Waesy</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isBrazil = profile.country_code === "BR";
  const locationLabel = isBrazil && profile.state_province
    ? `${profile.city}, ${profile.state_province} • Brasil`
    : `${profile.city} • ${profile.country}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Breadcrumb ── */}
      <div className="border-b border-border/50 bg-card/60 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto no-scrollbar">
          <Link to="/" className="hover:text-foreground transition-colors shrink-0">
            Início
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <Link to="/classificados" className="hover:text-foreground transition-colors shrink-0">
            Turismo & Aéreo
          </Link>
          <ChevronRight className="size-3.5 shrink-0" />
          <span className="text-foreground font-semibold truncate shrink-0">
            {profile.city} ({profile.iata_code})
          </span>
        </div>
      </div>

      {/* ── Hero Principal do Aeroporto ── */}
      <section className="relative bg-linear-to-b from-primary/10 via-background to-background border-b border-border/60 py-8 md:py-12">
        <div className="container max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-mono font-black text-sm tracking-wide">
                  <Plane className="size-4" />
                  {profile.iata_code}
                </span>
                {profile.icao_code && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted font-mono font-bold text-xs text-muted-foreground border border-border/60">
                    ICAO: {profile.icao_code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                  <Clock className="size-3.5" />
                  {profile.operating_hours}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-card text-foreground font-medium text-xs border border-border/60">
                  {profile.operator_name}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground break-words text-wrap leading-tight">
                Aeroporto {profile.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  {locationLabel}
                </span>
                {profile.phone_pabx && (
                  <a
                    href={`tel:${profile.phone_pabx.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    <Phone className="size-4 text-primary" />
                    {profile.phone_pabx}
                  </a>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    <Globe className="size-4 text-primary" />
                    Site Oficial Concessionária
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>

            {/* CTAs de Ação Rápida */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <Button asChild className="h-11 min-h-11 px-5 font-semibold shadow-xs">
                <Link to={"/classificados" as any}>
                  Ver Ofertas com Voo ({profile.iata_code})
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Avisos Operacionais (Notices) */}
          {profile.notices && profile.notices.length > 0 && (
            <div className="space-y-2 pt-2">
              {profile.notices.map((n: any) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg p-4 flex items-start gap-3 border text-sm",
                    n.severity === "alert" && "bg-destructive/10 border-destructive/30 text-destructive",
                    n.severity === "warning" && "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
                    n.severity === "info" && "bg-primary/10 border-primary/20 text-foreground",
                  )}
                >
                  <AlertTriangle className="size-5 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <div className="font-bold">{n.title}</div>
                    <p className="text-xs leading-relaxed">{n.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Régua de Abas Canônica (Linha Única Horizontal Contínua B.39) ── */}
      <section className="sticky top-11 sm:top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 py-2">
            {[
              { id: "geral", label: "Visão Geral & Terminais", icon: Building2 },
              { id: "orgaos", label: "Órgãos & Segurança (PF/RF)", icon: ShieldCheck },
              { id: "taxas", label: "Taxas & Trânsito", icon: Receipt },
              { id: "comodidades", label: "Salas VIP & Serviços", icon: Coffee },
              { id: "transporte", label: "Táxis & Acesso", icon: Car },
              { id: "anac", label: "Direitos do Passageiro (ANAC)", icon: Scale },
              { id: "mapa", label: "Mapa & Proximidades", icon: MapPin },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "shrink-0 h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Conteúdo das Abas ── */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* ── ABA 1: VISÃO GERAL & TERMINAIS ── */}
        {activeTab === "geral" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Administração & Concessão</div>
                <div className="text-base font-bold text-foreground">{profile.operator_name}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Responsável pela manutenção de pistas, terminais de passageiros, raio-x e infraestrutura de solo.
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Horário de Funcionamento</div>
                <div className="text-base font-bold text-foreground">{profile.operating_hours}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Voos comerciais regulares, operações de carga e balcões de check-in operacionais.
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Central Telefônica (PABX)</div>
                <div className="text-base font-bold text-foreground">{profile.phone_pabx || "Consulte o balcão"}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Informações sobre voos em tempo real, achados e perdidos e assistência especial.
                </p>
              </div>
            </div>

            {/* Terminais */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Terminais de Passageiros</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.terminals.map((t: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border/70 rounded-lg p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-base">{t.name}</span>
                      <span className="px-3 py-1 rounded-full text-2xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                        {t.focus === "both" ? "Nacional & Internacional" : t.focus === "domestic" ? "Doméstico" : "Internacional"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                    {t.gates_count && (
                      <div className="text-xs font-medium text-foreground flex items-center gap-2 pt-1">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        {t.gates_count} Portões de Embarque com pontes móveis e acesso direto
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 2: ÓRGÃOS PÚBLICOS & SEGURANÇA ── */}
        {activeTab === "orgaos" && (
          <div className="space-y-6">
            <div className="bg-muted/40 border border-border/60 rounded-lg p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
              <Info className="size-5 shrink-0 text-primary mt-1" />
              <div>
                <strong className="text-foreground">Instituições de Controle e Atendimento:</strong> Encontre aqui
                localizações e contatos diretos dos órgãos de fiscalização federal, estadual e auxílio ao passageiro
                dentro do complexo de {profile.city}.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.official_sectors.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-card border border-border/70 rounded-lg p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-sm">{s.name}</span>
                      {s.badge_label && (
                        <span className="px-2 py-1 rounded-full text-2xs font-bold bg-muted text-muted-foreground border border-border/60 shrink-0">
                          {s.badge_label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>

                    <div className="space-y-1 text-xs pt-2 border-t border-border/40">
                      {s.terminal && (
                        <div className="text-muted-foreground">
                          <strong>Localização:</strong> {s.terminal} {s.floor && `• ${s.floor}`}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        <strong>Horário:</strong> {s.operating_hours}
                      </div>
                      {s.email && (
                        <div className="text-muted-foreground">
                          <strong>E-mail:</strong> {s.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {s.phone && (
                    <div className="pt-3">
                      <Button
                        asChild
                        variant="outline"
                        className="w-full h-11 min-h-11 font-semibold text-xs flex items-center justify-center gap-2"
                      >
                        <a href={`tel:${s.phone.replace(/\D/g, "")}`}>
                          <Phone className="size-4 text-primary" />
                          Ligar ({s.phone})
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA 3: TAXAS & TRÂNSITO ── */}
        {activeTab === "taxas" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Taxas Aeroportuárias e Trânsito Internacional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.fees_and_taxes.map((fee: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border/70 rounded-lg p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-sm">{fee.title}</span>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-2xs font-bold uppercase",
                          fee.mandatory
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {fee.mandatory ? "Obrigatória" : "Opcional"}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-primary font-mono">{fee.amount_description}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{fee.explanation}</p>

                    {fee.exemptions && (
                      <div className="text-xs bg-muted/40 p-3 rounded-md border border-border/50 text-muted-foreground">
                        <strong>Isenções:</strong> {fee.exemptions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 4: SALAS VIP & COMODIDADES ── */}
        {activeTab === "comodidades" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Comodidades, Lounges e Serviços Internos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.amenities.map((item: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-sm">{item.name}</span>
                      <span className="px-2 py-1 rounded-full text-2xs font-bold bg-muted text-muted-foreground border border-border/60">
                        {item.category === "vip_lounge"
                          ? "Sala VIP"
                          : item.category === "currency_exchange"
                            ? "Câmbio"
                            : item.category === "lockers"
                              ? "Guarda-Volumes"
                              : item.category === "parking"
                                ? "Estacionamento"
                                : "Serviço"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong>Local:</strong> {item.location}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong>Horário:</strong> {item.operating_hours}
                    </div>
                    {item.details && <p className="text-xs text-muted-foreground pt-1">{item.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 5: TRANSPORTE & ACESSO ── */}
        {activeTab === "transporte" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Táxis Oficiais */}
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="size-5 text-primary" />
                  <span className="font-bold text-foreground text-base">Táxis Credenciados</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {profile.ground_transportation.taxi_official.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Ponto de Embarque:</strong> {profile.ground_transportation.taxi_official.location}
                </p>
                {profile.ground_transportation.taxi_official.estimated_fare_to_downtown && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Tarifa Média ao Centro:</strong>{" "}
                    {profile.ground_transportation.taxi_official.estimated_fare_to_downtown}
                  </p>
                )}
                {profile.ground_transportation.taxi_official.phone && (
                  <Button asChild variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold">
                    <a href={`tel:${profile.ground_transportation.taxi_official.phone.replace(/\D/g, "")}`}>
                      <Phone className="size-4 mr-2 text-primary" />
                      Ligar para Cooperativa ({profile.ground_transportation.taxi_official.phone})
                    </a>
                  </Button>
                )}
              </div>

              {/* Aplicativos (Uber / 99) */}
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Navigation className="size-5 text-emerald-500" />
                  <span className="font-bold text-foreground text-base">Aplicativos de Transporte</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong>Ponto de Encontro Sinalizado:</strong>{" "}
                    {profile.ground_transportation.app_rides.pickup_location}
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <CheckCircle2 className="size-4 text-emerald-500" /> Uber Disponível
                    </span>
                    {profile.ground_transportation.app_rides.ninety_nine_available && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <CheckCircle2 className="size-4 text-emerald-500" /> 99 Disponível
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs text-muted-foreground">
                    Distância até o centro:{" "}
                    <strong>{profile.ground_transportation.distance_to_downtown_km} km</strong> (aprox.{" "}
                    {profile.ground_transportation.estimated_time_to_downtown_min} min de viagem).
                  </div>
                </div>
              </div>
            </div>

            {/* Transporte Público / Trem / Ônibus */}
            {profile.ground_transportation.public_transit && (
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <h3 className="font-bold text-foreground text-sm">Transporte Público, Ônibus e Trens</h3>
                {profile.ground_transportation.public_transit.metro_train && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Trens / Metrô:</strong> {profile.ground_transportation.public_transit.metro_train}
                  </p>
                )}
                {profile.ground_transportation.public_transit.express_shuttle && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Ônibus Executivo:</strong>{" "}
                    {profile.ground_transportation.public_transit.express_shuttle}
                  </p>
                )}
                {profile.ground_transportation.public_transit.bus_lines && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Linhas Urbanas:</strong> {profile.ground_transportation.public_transit.bus_lines}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 6: DIREITOS DO PASSAGEIRO ANAC ── */}
        {activeTab === "anac" && (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="size-5 text-primary" />
                <h2 className="font-bold text-foreground text-base">
                  Resolução 400 da ANAC — Assistência Material Obrigatória
                </h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As empresas aéreas são obrigadas por lei a prestar assistência gradual em casos de atrasos, cancelamentos
                de voo e preterição de embarque (overbooking), independentemente do motivo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs font-bold text-primary uppercase tracking-wide">Atraso a partir de 1 hora</div>
                <div className="text-sm font-semibold text-foreground">Comunicação Gratuita</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.anac_rights_summary.delay_1h}
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs font-bold text-primary uppercase tracking-wide">Atraso a partir de 2 horas</div>
                <div className="text-sm font-semibold text-foreground">Alimentação Assegurada</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.anac_rights_summary.delay_2h}
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-xs font-bold text-primary uppercase tracking-wide">Atraso a partir de 4 horas</div>
                <div className="text-sm font-semibold text-foreground">Hospedagem & Reacomodação</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.anac_rights_summary.delay_4h}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-sm font-bold text-foreground">Cancelamento de Voo & Reacomodação</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.anac_rights_summary.cancellation}
                </p>
              </div>

              <div className="bg-card border border-border/70 rounded-lg p-5 space-y-2">
                <div className="text-sm font-bold text-foreground">Bagagem Extraviada ou Danificada</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {profile.anac_rights_summary.baggage_loss}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border/70 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-foreground text-sm">Central de Reclamações ANAC</div>
                <p className="text-xs text-muted-foreground">Ligação gratuita e atendimento ao consumidor 24 horas.</p>
              </div>
              <Button asChild variant="outline" className="h-11 min-h-11 px-6 font-bold shrink-0">
                <a href="tel:163">
                  <Phone className="size-4 mr-2 text-primary" />
                  Ligar 163 (ANAC)
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* ── ABA 7: MAPA & PROXIMIDADES ── */}
        {activeTab === "mapa" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/70 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-base">Coordenadas Geográficas</h3>
                  <p className="text-xs text-muted-foreground">
                    Latitude: {profile.latitude} • Longitude: {profile.longitude} • Fuso Horário: {profile.timezone}
                  </p>
                </div>
                <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Abrir no Google Maps
                  </a>
                </Button>
              </div>

              {/* Pontos nas Proximidades */}
              {profile.nearby_points && profile.nearby_points.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Pontos de Interesse nas Proximidades
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {profile.nearby_points.map((pt: any) => (
                      <div key={pt.id} className="p-3 bg-muted/40 rounded-lg border border-border/60 text-xs space-y-1">
                        <div className="font-bold text-foreground">{pt.name}</div>
                        <div className="text-muted-foreground">
                          {pt.category === "hotel"
                            ? "Hotel"
                            : pt.category === "hospital"
                              ? "Hospital"
                              : pt.category === "gas_station"
                                ? "Posto de Combustível"
                                : "Locadora"} • {pt.distance_km} km de distância
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
