import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Compass,
  MapPin,
  CalendarDots,
  Users,
  WhatsappLogo,
  ShieldCheck,
  Printer,
  ShareNetwork,
  QrCode,
  Ticket,
  CheckCircle,
  Clock,
  Info,
  Airplane,
  Buildings,
  FileText,
  Sparkle,
  ArrowUpRight,
  Storefront,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { listCustomerTrips, type TourismBookingDTO } from "@/services/tourism.functions";
import { listCustomerAgencyTrips, listCustomerTravelDossierFn } from "@/services/travel-lifecycle.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

export const Route = createFileRoute("/_store/conta/viagens")({
  head: () => ({
    meta: [
      { title: "Minhas Viagens | Waesy" },
      {
        name: "description",
        content: "Consulte suas viagens, vouchers de embarque, propostas, cotações e contratos de qualquer agência.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [trips, agencyTrips, dossier] = await Promise.all([
        listCustomerTrips().catch(() => []),
        listCustomerAgencyTrips().catch(() => []),
        listCustomerTravelDossierFn().catch(() => ({ proposals: [], quotes: [], contracts: [] })),
      ]);
      return {
        trips: trips || [],
        agencyTrips: agencyTrips || [],
        proposals: dossier?.proposals || [],
        quotes: dossier?.quotes || [],
        contracts: dossier?.contracts || [],
      };
    } catch (err) {
      console.error("[loader:_store.conta.viagens] Unhandled error:", err);
      return { trips: [], agencyTrips: [], proposals: [], quotes: [], contracts: [] };
    }
  },
  component: CustomerTripsPage,
});

type ActiveTravelSection = "all" | "trips" | "proposals" | "contracts" | "experiences";

function CustomerTripsPage() {
  const {
    trips = [],
    agencyTrips = [],
    proposals = [],
    quotes = [],
    contracts = [],
  } = ((Route.useLoaderData?.() as any) || {});
  const [selectedBooking, setSelectedBooking] = useState<TourismBookingDTO | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTravelSection>("all");

  const handleOpenVoucher = (booking: TourismBookingDTO) => {
    setSelectedBooking(booking);
    setIsVoucherOpen(true);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = (code: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`Voucher Waesy Turismo: ${code}`);
      toast.success("Código do voucher copiado!");
    }
  };

  const totalBookingsCount = (trips?.length || 0) + (agencyTrips?.length || 0);
  const totalProposalsAndQuotesCount = (proposals?.length || 0) + (quotes?.length || 0);
  const totalContractsCount = contracts?.length || 0;
  const hasAnyItem =
    totalBookingsCount > 0 || totalProposalsAndQuotesCount > 0 || totalContractsCount > 0;

  const confirmedCount =
    (trips?.filter((t: any) => t.status === "confirmed").length || 0) +
    (agencyTrips?.filter((t: any) => t.status === "confirmed").length || 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-32 px-0 sm:px-4 md:px-0">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Minhas Viagens"
        fallbackHref="/conta"
        mobileOnly
        rightAction={
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/turismo">Explorar</Link>
          </Button>
        }
      />

      {/* ── 1. Clean Minimalist Header (Desktop >=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Minhas Viagens
          </h1>
          {hasAnyItem && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-lg">
              {totalBookingsCount + totalProposalsAndQuotesCount}
            </Badge>
          )}
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Link to="/turismo">
            <Compass size={16} weight="bold" className="mr-2" />
            Explorar Destinos
          </Link>
        </Button>
      </div>

      {/* ── 2. Summary KPI Cards (Multi-Agência) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
            <Ticket size={16} weight="bold" className="text-primary shrink-0" />
            <span className="truncate">Reservas Ativas</span>
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{totalBookingsCount}</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
            <CheckCircle size={16} weight="bold" className="text-primary shrink-0" />
            <span className="truncate">Confirmadas</span>
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{confirmedCount}</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
            <Sparkle size={16} weight="bold" className="text-primary shrink-0" />
            <span className="truncate">Propostas & Cotações</span>
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{totalProposalsAndQuotesCount}</p>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
            <FileText size={16} weight="bold" className="text-primary shrink-0" />
            <span className="truncate">Contratos</span>
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{totalContractsCount}</p>
        </div>
      </div>

      {/* ── 2B. Régua de Abas Horizontal Contínua (Invariante B.39) ── */}
      {hasAnyItem && (
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 border-b border-border/50 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeTab === "all"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
            }`}
          >
            Visão Completa
          </button>
          {agencyTrips.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("trips")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === "trips"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
              }`}
            >
              Pacotes e Embarque ({agencyTrips.length})
            </button>
          )}
          {totalProposalsAndQuotesCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("proposals")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === "proposals"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
              }`}
            >
              Propostas e Cotações ({totalProposalsAndQuotesCount})
            </button>
          )}
          {totalContractsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("contracts")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === "contracts"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
              }`}
            >
              Contratos ({totalContractsCount})
            </button>
          )}
          {trips.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("experiences")}
              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === "experiences"
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground border border-border/60 hover:text-foreground"
              }`}
            >
              Passeios ({trips.length})
            </button>
          )}
        </div>
      )}

      {/* ── 3. Pacotes & Viagens Multi-Agência com Vouchers Oficiais ── */}
      {(activeTab === "all" || activeTab === "trips") && agencyTrips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Airplane size={18} weight="bold" className="text-primary" />
              <span>Pacotes e Roteiros Emitidos</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {agencyTrips.length} viagem(ns) vinculada(s)
            </span>
          </div>

          <div className="space-y-3">
            {agencyTrips.map((agencyTrip: any) => {
              const mainVoucher = agencyTrip.tourism_vouchers?.[0];
              const voucherUrl = mainVoucher ? `/voucher/${mainVoucher.public_token}` : null;
              const hasFlights = Array.isArray(agencyTrip.flights) && agencyTrip.flights.length > 0;
              const hasHotels = Array.isArray(agencyTrip.hotels) && agencyTrip.hotels.length > 0;
              const confirmationItems = Array.isArray(agencyTrip.trip_confirmation_items)
                ? agencyTrip.trip_confirmation_items
                : [];
              const cleanAgencyWhatsapp = String(agencyTrip.agency_whatsapp || "").replace(/\D/g, "");

              return (
                <div
                  key={agencyTrip.id}
                  className="p-4 sm:p-6 rounded-lg bg-card border border-border/70 flex flex-col md:flex-row gap-4 sm:gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all"
                >
                  <div className="space-y-3 flex-1 min-w-0 w-full">
                    {/* Linha de Badges: Agência Emissora + Número + Status + Voucher */}
                    <div className="flex flex-wrap items-center gap-2">
                      {agencyTrip.agency_name && (
                        <Badge variant="secondary" className="text-xs font-bold gap-1 px-2 py-1 rounded-lg">
                          <Storefront size={12} weight="bold" className="text-primary shrink-0" />
                          <span className="truncate max-w-48">{agencyTrip.agency_name}</span>
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/60">
                        {agencyTrip.trip_number}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                      >
                        ● {agencyTrip.status === "confirmed" ? "Confirmada" : agencyTrip.status === "completed" ? "Concluída" : "Em Emissão"}
                      </Badge>
                      {mainVoucher && (
                        <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                          Voucher {mainVoucher.voucher_code}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-base font-bold text-foreground break-words">
                        {agencyTrip.destination_city || agencyTrip.title}
                      </h3>
                      {agencyTrip.total_cents > 0 && (
                        <span className="text-sm font-black text-foreground shrink-0">
                          {formatMoney(agencyTrip.total_cents)}
                        </span>
                      )}
                    </div>

                    {/* Resumo de Serviços (Voos, Hospedagem, Datas e Passageiros) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      {hasFlights && (
                        <div className="flex items-center gap-2 font-medium min-w-0">
                          <Airplane size={14} className="text-primary shrink-0" />
                          <span className="truncate">
                            {agencyTrip.flights[0].origin || agencyTrip.flights[0].origin_iata} ➔{" "}
                            {agencyTrip.flights[0].destination || agencyTrip.flights[0].destination_iata} (
                            {agencyTrip.flights[0].airline || agencyTrip.flights[0].airline_name || "Voo"})
                          </span>
                        </div>
                      )}
                      {hasHotels && (
                        <div className="flex items-center gap-2 font-medium min-w-0">
                          <Buildings size={14} className="text-primary shrink-0" />
                          <span className="truncate">
                            {agencyTrip.hotels[0].name || agencyTrip.hotels[0].hotel_name} (
                            {agencyTrip.hotels[0].city || agencyTrip.hotels[0].destination || "Hospedagem"})
                          </span>
                        </div>
                      )}
                      {(agencyTrip.travel_start_date || agencyTrip.travel_end_date) && (
                        <div className="flex items-center gap-2">
                          <CalendarDots size={14} className="text-muted-foreground shrink-0" />
                          <span>
                            {agencyTrip.travel_start_date || "—"} até {agencyTrip.travel_end_date || "—"}
                          </span>
                        </div>
                      )}
                      {agencyTrip.adults_count > 0 && (
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-muted-foreground shrink-0" />
                          <span>
                            {agencyTrip.adults_count} Adulto(s)
                            {agencyTrip.children_count > 0 ? ` + ${agencyTrip.children_count} Criança(s)` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Localizadores Oficiais PNR / Hotel */}
                    {confirmationItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {confirmationItems.map((item: any) => (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs"
                          >
                            <span className="font-semibold text-muted-foreground">{item.provider_name}:</span>
                            <span className="font-mono font-bold text-foreground">{item.locator_code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                    <Button
                      asChild
                      className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Link to="/viajante/viagem/$id" params={{ id: String(agencyTrip.id) }}>
                        <Compass size={16} weight="bold" />
                        <span>Portal da Viagem & Boletos</span>
                      </Link>
                    </Button>
                    {voucherUrl ? (
                      <Button
                        asChild
                        variant="outline"
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <a href={voucherUrl} target="_blank" rel="noopener noreferrer">
                          <QrCode size={16} weight="bold" />
                          <span>Voucher de Embarque</span>
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        data-action-intent="disabled-with-reason"
                        data-action-reason="Voucher em processamento pela agência."
                        title="Voucher em processamento pela agência."
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11"
                      >
                        <Clock size={16} className="text-muted-foreground" />
                        <span>Voucher em Emissão</span>
                      </Button>
                    )}
                    {cleanAgencyWhatsapp && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          trackAndOpenWhatsApp({
                            phone: cleanAgencyWhatsapp,
                            storeId: agencyTrip.store_id || null,
                            entityType: "tourism",
                            entityId: agencyTrip.id,
                            entityTitle: agencyTrip.destination_city || agencyTrip.title,
                            niche: "turismo",
                            customMessage: `Olá! Estou falando sobre minha viagem *${agencyTrip.trip_number}* (${agencyTrip.destination_city || agencyTrip.title}).`,
                          })
                        }
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <WhatsappLogo size={16} weight="bold" className="text-primary" />
                        <span>Falar com Agência</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3B. Propostas Interativas & Cotações em Andamento (Multi-Agência) ── */}
      {(activeTab === "all" || activeTab === "proposals") && totalProposalsAndQuotesCount > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkle size={18} weight="bold" className="text-primary" />
              <span>Propostas e Cotações de Viagem</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {totalProposalsAndQuotesCount} atendimento(s)
            </span>
          </div>

          <div className="space-y-3">
            {proposals.map((prop: any) => {
              const totalCents =
                Number(prop.pricing?.total_price_cents || prop.pricing?.total_cents || 0);
              const isAccepted = prop.acceptance_status === "accepted" || prop.status === "approved";

              return (
                <div
                  key={prop.id}
                  className="p-4 sm:p-6 rounded-lg bg-card border border-border/70 flex flex-col md:flex-row gap-4 sm:gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all"
                >
                  <div className="space-y-2 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      {prop.agency_name && (
                        <Badge variant="secondary" className="text-xs font-bold gap-1 px-2 py-1 rounded-lg">
                          <Storefront size={12} weight="bold" className="text-primary shrink-0" />
                          <span className="truncate max-w-48">{prop.agency_name}</span>
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={
                          isAccepted
                            ? "text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                            : "text-xs font-bold bg-muted text-foreground"
                        }
                      >
                        ● {isAccepted ? "Proposta Aceita" : "Aguardando Seu Aceite"}
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-base font-bold text-foreground break-words">
                        {prop.title || prop.destination_city || "Proposta Personalizada"}
                      </h3>
                      {totalCents > 0 && (
                        <span className="text-sm font-black text-foreground shrink-0">
                          {formatMoney(totalCents)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {prop.destination_city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span>{prop.destination_city}</span>
                        </span>
                      )}
                      {(prop.travel_start_date || prop.travel_end_date) && (
                        <span className="flex items-center gap-1">
                          <CalendarDots size={14} className="shrink-0" />
                          <span>
                            {prop.travel_start_date || "—"} até {prop.travel_end_date || "—"}
                          </span>
                        </span>
                      )}
                      {prop.adults_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users size={14} className="shrink-0" />
                          <span>
                            {prop.adults_count} Adulto(s)
                            {prop.children_count > 0 ? ` + ${prop.children_count} Criança(s)` : ""}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                    {prop.public_token && (
                      <Button
                        asChild
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Link to="/proposta/$token" params={{ token: String(prop.public_token) }}>
                          <span>Abrir Proposta Interativa</span>
                          <ArrowUpRight size={16} weight="bold" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {quotes.map((q: any) => (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold bg-muted/50">
                      Cotação #{String(q.id).slice(0, 6).toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-bold">
                      ●{" "}
                      {q.status === "quoted"
                        ? "Cotação Pronta"
                        : q.status === "won"
                          ? "Fechada"
                          : "Em Elaboração pela Agência"}
                    </Badge>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground break-words">
                    {q.origin_city} ➔ {q.destination_city}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {(q.departure_date || q.return_date) && (
                      <span className="flex items-center gap-1">
                        <CalendarDots size={14} />
                        <span>
                          {q.departure_date || "—"} até {q.return_date || "—"}
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      <span>
                        {q.adults_count || 1} Adulto(s)
                        {q.children_count > 0 ? ` + ${q.children_count} Criança(s)` : ""}
                      </span>
                    </span>
                    {q.quote_amount_cents > 0 && (
                      <span className="font-bold text-foreground">
                        {formatMoney(q.quote_amount_cents)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3C. Contratos Jurídicos & Assinatura Digital (Multi-Agência) ── */}
      {(activeTab === "all" || activeTab === "contracts") && totalContractsCount > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText size={18} weight="bold" className="text-primary" />
              <span>Contratos de Viagem</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {totalContractsCount} documento(s)
            </span>
          </div>

          <div className="space-y-3">
            {contracts.map((contract: any) => {
              const isSigned = contract.status === "signed" || Boolean(contract.signed_at);
              return (
                <div
                  key={contract.id}
                  className="p-4 sm:p-6 rounded-lg bg-card border border-border/70 flex flex-col md:flex-row gap-4 sm:gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all"
                >
                  <div className="space-y-2 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      {contract.agency_name && (
                        <Badge variant="secondary" className="text-xs font-bold gap-1 px-2 py-1 rounded-lg">
                          <Storefront size={12} weight="bold" className="text-primary shrink-0" />
                          <span className="truncate max-w-48">{contract.agency_name}</span>
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={
                          isSigned
                            ? "text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                            : "text-xs font-bold bg-muted text-foreground"
                        }
                      >
                        ● {isSigned ? "Assinado Digitalmente" : "Aguardando Assinatura"}
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-base font-bold text-foreground break-words">
                        {contract.contract_title || `Contrato — ${contract.destination}`}
                      </h3>
                      {contract.total_value_cents > 0 && (
                        <span className="text-sm font-black text-foreground shrink-0">
                          {formatMoney(contract.total_value_cents)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground break-words">
                      Destino: <strong className="text-foreground">{contract.destination}</strong>
                      {contract.payment_conditions ? ` • ${contract.payment_conditions}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                    {contract.public_token && (
                      <Button
                        asChild
                        variant={isSigned ? "outline" : "default"}
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Link to="/viajante/$token" params={{ token: String(contract.public_token) }}>
                          <FileText size={16} weight="bold" />
                          <span>{isSigned ? "Ver Contrato Assinado" : "Assinar Contrato"}</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Lista de Passeios do Marketplace ── */}
      {!hasAnyItem ? (
        <div className="text-center py-12 sm:py-16 px-4 rounded-lg bg-card space-y-4 border border-border/70">
          <div className="size-16 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Compass size={32} weight="bold" className="text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Nenhuma viagem reservada ainda</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Suas reservas, vouchers de embarque, propostas e contratos de qualquer agência credenciada aparecem automaticamente aqui.
            </p>
          </div>
          <Button asChild className="rounded-lg font-bold text-xs h-11 min-h-11 px-6 bg-foreground text-background">
            <Link to="/turismo">
              <Compass size={16} weight="bold" className="mr-2" />
              <span>Explorar Roteiros</span>
            </Link>
          </Button>
        </div>
      ) : (activeTab === "all" || activeTab === "experiences") && trips.length > 0 ? (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Compass size={18} weight="bold" className="text-primary" />
            <span>Passeios e Experiências</span>
          </h2>
          <div className="space-y-3">
            {trips.map((booking: any) => {
              const exp = booking.experience;
              const formattedDate = booking.desired_date
                ? new Date(booking.desired_date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Data a combinar";

              const cleanWhatsapp = exp?.contact_whatsapp?.replace(/\D/g, "") || "";

              return (
                <div
                  key={booking.id}
                  className="p-4 sm:p-6 rounded-lg bg-card flex flex-col md:flex-row gap-4 sm:gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all border border-border/70"
                >
                  <div className="flex gap-4 items-start min-w-0 flex-1">
                    {exp?.image_url ? (
                      <img
                        src={exp.image_url}
                        alt={exp.title}
                        className="size-16 sm:size-24 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-16 sm:size-24 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Compass size={24} className="text-muted-foreground" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {exp?.provider_name && (
                          <Badge variant="secondary" className="text-xs font-bold px-2 py-1 rounded-lg">
                            {exp.provider_name}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/60">
                          {booking.voucher_code}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs font-bold border-border/80"
                        >
                          {booking.status === "confirmed" ? "● Confirmado" : "● Em Análise"}
                        </Badge>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-foreground break-words">
                        {exp?.title || "Experiência Turística"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <CalendarDots size={14} weight="bold" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} weight="bold" />
                          <span>{booking.guests_count} participante(s)</span>
                        </span>
                        {booking.total_price_cents > 0 && (
                          <span className="font-bold text-foreground">
                            {formatMoney(booking.total_price_cents)}
                          </span>
                        )}
                      </div>

                      {exp?.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin size={12} weight="bold" className="shrink-0" />
                          <span className="truncate">{exp.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                    <Button
                      onClick={() => handleOpenVoucher(booking)}
                      className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <QrCode size={16} weight="bold" />
                      <span>Voucher Digital</span>
                    </Button>

                    {cleanWhatsapp && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          trackAndOpenWhatsApp({
                            phone: cleanWhatsapp,
                            storeId: (exp as any)?.store_id || null,
                            entityType: "tourism",
                            entityId: exp?.id || null,
                            entityTitle: exp?.title || "Experiência Turística",
                            niche: "turismo",
                            customMessage: `Olá! Tenho uma reserva confirmada com o voucher *${booking.voucher_code}* para *${exp?.title}*. Queria confirmar os detalhes.`,
                          })
                        }
                        className="flex-1 md:flex-initial rounded-lg font-bold text-xs gap-2 h-11 min-h-11 border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <WhatsappLogo size={16} weight="bold" className="text-foreground" />
                        <span>Falar com Guia</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Modal Canônico de Voucher Digital ── */}
      <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
        <DialogContent className="sm:max-w-lg sm:rounded-lg p-5 sm:p-8 bg-card border-border">
          {selectedBooking && (
            <div className="space-y-6">
              {/* Header do Voucher */}
              <div className="text-center pb-2 space-y-2">
                <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 bg-muted">
                  Voucher Digital
                </Badge>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  {selectedBooking.experience?.title || "Experiência Turística"}
                </h2>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>CÓDIGO:</span>
                  <span className="font-bold text-foreground text-sm bg-muted px-2 py-1 rounded-md border border-border/60">
                    {selectedBooking.voucher_code}
                  </span>
                </div>
              </div>

              {/* QR Code de Validação de Embarque */}
              <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border border-border/40">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(selectedBooking.voucher_code)}`}
                  alt={`QR Code ${selectedBooking.voucher_code}`}
                  className="size-36 object-contain"
                  loading="lazy"
                />
                <span className="text-xs font-mono font-bold text-foreground mt-2 uppercase tracking-wider">
                  Apresente ao Guia / Embarque
                </span>
              </div>

              {/* Detalhes do Roteiro */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Data do Passeio
                  </span>
                  <p className="font-bold text-foreground">
                    {selectedBooking.desired_date
                      ? new Date(selectedBooking.desired_date).toLocaleDateString("pt-BR")
                      : "A combinar"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Passageiros
                  </span>
                  <p className="font-bold text-foreground">{selectedBooking.guests_count} pessoa(s)</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 space-y-1 col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ponto de Encontro / Local
                  </span>
                  <p className="font-bold text-foreground">
                    {selectedBooking.meeting_point || selectedBooking.experience?.location || "Consulte o anfitrião"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 space-y-1 col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Titular da Reserva
                  </span>
                  <p className="font-bold text-foreground">
                    {selectedBooking.customer_name} ({selectedBooking.customer_phone})
                  </p>
                </div>
              </div>

              {/* Informações de Embarque & Validação */}
              <div className="p-4 rounded-lg bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Info size={16} weight="bold" className="text-primary" />
                  <span>Instruções de Embarque</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Apresente este voucher digital no smartphone ou impresso no momento da chegada ao ponto de encontro junto com um documento oficial com foto.
                </p>
              </div>

              {/* Ações do Voucher */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex-1 rounded-lg font-bold text-xs gap-2 h-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Printer size={16} weight="bold" />
                  <span>Imprimir Voucher</span>
                </Button>

                <Button
                  onClick={() => handleShare(selectedBooking.voucher_code)}
                  className="flex-1 rounded-lg font-bold text-xs gap-2 h-11 min-h-11 bg-foreground text-background focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ShareNetwork size={16} weight="bold" />
                  <span>Copiar Código</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

