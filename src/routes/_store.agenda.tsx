import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDots,
  CalendarBlank,
  Clock,
  MapPin,
  Ticket,
  CreditCard,
  Scissors,
  CheckCircle,
  CaretRight,
  Sparkle,
  CircleNotch,
  WarningCircle,
  CurrencyDollar,
  QrCode,
  ArrowRight,
  Plus,
  Tag,
  Storefront,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { getUserSession } from "@/services/auth.functions";
import { listCustomerAppointments } from "@/services/booking.functions";
import { listCustomerOrders } from "@/services/order.functions";
import { listClientCarnes } from "@/services/receivables.functions";
import { getPublicEvents } from "@/services/events.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { X, Calendar as CalendarIcon, ChevronDown } from "lucide-react";

const WEEKDAY_NAMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const AGENDA_FILTER_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Toda a Agenda", emoji: "📅" },
  { id: "eventos", label: "Eventos & Shows", emoji: "🎟️" },
  { id: "servicos", label: "Meus Serviços", emoji: "✂️" },
  { id: "ingressos", label: "Meus Ingressos", emoji: "🎫" },
  { id: "carnes", label: "Contas & Carnês", emoji: "💳" },
];

export const Route = createFileRoute("/_store/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda Cultural & Calendário | Waesy" },
      {
        name: "description",
        content:
          "Descubra eventos, shows, programação cultural e acompanhe seus agendamentos em um calendário unificado.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [session, banners] = await Promise.all([
        getUserSession().catch(() => null),
        listActiveBanners({ data: { placement: "agenda" } }).catch(() => []),
      ]);
      return { session, banners: banners || [] };
    } catch {
      return { session: null, banners: [] };
    }
  },
  component: AgendaPadronizadaPage,
});

function AgendaPadronizadaPage() {
  const { session, banners = [] } = ((Route.useLoaderData?.() as any) || {});
  const isAuthenticated = Boolean(session?.user || session?.id);

  const [selectedFilter, setSelectedFilter] = useState("todos");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // 1. Busca Eventos Públicos da Comunidade (Disponível para todos os visitantes)
  const { data: publicEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["agenda-public-events"],
    queryFn: async () => {
      try {
        const res = await getPublicEvents({ data: { limit: 60 } });
        return res || [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // 2. Busca Serviços Agendados do Usuário (se autenticado)
  const { data: appointments = [], isLoading: isLoadingAppts } = useQuery({
    queryKey: ["personal-agenda-appointments"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const res = await listCustomerAppointments({ data: { status: "all" } }).catch(() => []);
      return res || [];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // 3. Busca Ingressos Comprados (se autenticado)
  const { data: ticketOrders = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["personal-agenda-tickets"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const orders = (await listCustomerOrders().catch(() => [])) || [];
      return orders.filter((order: any) =>
        order.order_items?.some(
          (i: any) =>
            i.item_type === "ticket" ||
            i.item_type === "event" ||
            i.product_title?.toLowerCase().includes("ingresso")
        )
      );
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // 4. Busca Carnês (se autenticado)
  const { data: carnesData, isLoading: isLoadingCarnes } = useQuery({
    queryKey: ["personal-agenda-carnes"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const res = await listClientCarnes().catch(() => null);
      return res;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // Próximos 14 dias para o slider horizontal de calendário
  const nextDays = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      days.push({
        dateKey,
        dayNumber: d.getDate(),
        weekday: WEEKDAY_NAMES[d.getDay()],
        monthName: MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase(),
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return days;
  }, []);

  // Consolidação Canônica de Todos os Cards com Imagem Obrigatória
  const unifiedItems = useMemo(() => {
    const items: Array<{
      id: string;
      category: "eventos" | "servicos" | "ingressos" | "carnes";
      badge: string;
      title: string;
      subtitle?: string;
      date: string;
      dateDisplay: string;
      image: string | null;
      priceOrStatus: string;
      location?: string;
      to: string;
      actionLabel: string;
    }> = [];

    // A. Eventos Públicos da Cidade
    publicEvents.forEach((ev: any) => {
      const cover = ev.cover_image || ev.image_url || ev.banner_url || null;
      const rawDate = ev.event_date || ev.date || "";
      const datePart = rawDate.split("T")[0] || "";

      let priceLabel = "Ingressos";
      if (ev.is_free) {
        priceLabel = "Gratuito";
      } else if (ev.price_cents) {
        priceLabel = formatMoney(ev.price_cents);
      } else if (ev.price_min_cents && ev.price_min_cents > 0) {
        priceLabel = `A partir de ${formatMoney(ev.price_min_cents)}`;
      }

      items.push({
        id: `ev-${ev.id}`,
        category: "eventos",
        badge: ev.is_external
          ? ev.external_source
            ? `Oficial ${ev.external_source}`
            : "Evento Externo"
          : ev.category || "Evento",
        title: ev.title,
        subtitle: ev.description || "Evento na cidade",
        date: datePart,
        dateDisplay: ev.date_display || (datePart ? formatDate(datePart) : "Data confirmada"),
        image: cover,
        priceOrStatus: priceLabel,
        location: ev.venue || ev.location || (ev.city ? `${ev.city} - SC` : "Na região"),
        to: `/evento/${ev.id}`,
        actionLabel: ev.is_external || ev.is_external_ticket ? "Ver Detalhes" : "Ver Ingressos",
      });
    });

    // B. Serviços Agendados do Usuário
    appointments.forEach((apt: any) => {
      const rawDate = apt.appointment_date || apt.start_time || apt.created_at || "";
      const datePart = rawDate.split("T")[0] || "";

      items.push({
        id: `apt-${apt.id}`,
        category: "servicos",
        badge: "Serviço Agendado",
        title: apt.service_name || "Serviço Agendado",
        subtitle: apt.store_name || "Estabelecimento Parceiro",
        date: datePart,
        dateDisplay: datePart ? formatDate(datePart) : "Horário agendado",
        image: apt.store_avatar_url || apt.service_image_url || null,
        priceOrStatus: apt.price_cents ? formatMoney(apt.price_cents) : "Confirmado",
        location: apt.address || apt.city || "No local",
        to: "/conta/agendamentos",
        actionLabel: "Ver Agendamento",
      });
    });

    // C. Ingressos de Eventos Comprados
    ticketOrders.forEach((order: any) => {
      const firstTicket = order.order_items?.find(
        (i: any) =>
          i.item_type === "ticket" ||
          i.item_type === "event" ||
          i.product_title?.toLowerCase().includes("ingresso")
      );
      const rawDate = order.created_at || "";
      const datePart = rawDate.split("T")[0] || "";

      items.push({
        id: `ticket-${order.id}`,
        category: "ingressos",
        badge: "Ingresso Confirmado",
        title: firstTicket?.product_title || "Ingresso de Evento",
        subtitle: `Pedido #${order.order_number || order.id?.slice(0, 8)}`,
        date: datePart,
        dateDisplay: datePart ? formatDate(datePart) : "Disponível",
        image: firstTicket?.image_url || null,
        priceOrStatus: order.payment_status === "paid" ? "Pago & Emitido" : "Pendente",
        location: order.store?.name || "Local do Evento",
        to: "/conta/ingressos",
        actionLabel: "Acessar QR Code",
      });
    });

    // D. Parcelas de Carnê
    if (carnesData?.carnes) {
      carnesData.carnes.forEach((carne: any) => {
        carne.installments?.forEach((inst: any) => {
          if (inst.status !== "paid") {
            const rawDate = inst.due_date || "";
            const datePart = rawDate.split("T")[0] || "";

            items.push({
              id: `inst-${inst.id}`,
              category: "carnes",
              badge: "Carnê da Loja",
              title: `Parcela ${inst.installment_number}/${carne.total_installments}`,
              subtitle: carne.store_name || "Loja Parceira",
              date: datePart,
              dateDisplay: datePart ? `Vencimento: ${formatDate(datePart)}` : "A vencer",
              image: carne.store_logo_url || null,
              priceOrStatus: formatMoney(inst.final_amount_cents || inst.amount_cents || 0),
              location: carne.store_name,
              to: "/conta/carnes",
              actionLabel: "Pagar Parcela",
            });
          }
        });
      });
    }

    return items;
  }, [publicEvents, appointments, ticketOrders, carnesData]);

  // Filtragem por Busca, Categoria e Data
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return unifiedItems.filter((item) => {
      // Filtro de Categoria
      if (selectedFilter !== "todos" && item.category !== selectedFilter) {
        return false;
      }

      // Filtro de Data do Calendário
      if (selectedDate !== "all" && item.date !== selectedDate) {
        return false;
      }

      // Busca por Texto
      if (term) {
        const matchesTitle = item.title.toLowerCase().includes(term);
        const matchesSub = (item.subtitle || "").toLowerCase().includes(term);
        const matchesLoc = (item.location || "").toLowerCase().includes(term);
        if (!matchesTitle && !matchesSub && !matchesLoc) return false;
      }

      return true;
    });
  }, [unifiedItems, selectedFilter, selectedDate, search]);

  const isLoading = isLoadingEvents || (isAuthenticated && (isLoadingAppts || isLoadingTickets || isLoadingCarnes));

  // Agrupamento por Categoria para o Modo Feed
  const groupedFeed = useMemo(() => {
    const groups: Array<{ key: string; label: string; badge: string; items: typeof filteredItems }> = [];

    const eventos = filteredItems.filter((i) => i.category === "eventos");
    if (eventos.length > 0) {
      groups.push({
        key: "eventos",
        label: "Shows & Eventos na Cidade",
        badge: `${eventos.length} atrações`,
        items: eventos,
      });
    }

    const servicos = filteredItems.filter((i) => i.category === "servicos");
    if (servicos.length > 0) {
      groups.push({
        key: "servicos",
        label: "Seus Serviços Agendados",
        badge: `${servicos.length} horários`,
        items: servicos,
      });
    }

    const ingressos = filteredItems.filter((i) => i.category === "ingressos");
    if (ingressos.length > 0) {
      groups.push({
        key: "ingressos",
        label: "Seus Ingressos Comprados",
        badge: `${ingressos.length} ingressos`,
        items: ingressos,
      });
    }

    const carnes = filteredItems.filter((i) => i.category === "carnes");
    if (carnes.length > 0) {
      groups.push({
        key: "carnes",
        label: "Parcelas de Carnês a Vencer",
        badge: `${carnes.length} parcelas`,
        items: carnes,
      });
    }

    return groups;
  }, [filteredItems]);

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-24 py-4">
      {/* ── 1. Banners de Destaque da Agenda (se cadastrados) ── */}
      {banners && banners.length > 0 && (
        <section aria-label="Destaques da Agenda">
          <BannerHeroCarousel banners={banners} />
        </section>
      )}

      {/* ── 2. Header Apple HIG ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Agenda & Calendário
            </h1>
            
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shows, programação cultural da cidade, agendamentos e ingressos organizados por data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90">
              <Link to="/entrar" search={{ returnUrl: "/agenda" }}>
                <span>Entrar na Conta</span>
                <ArrowRight size={13} className="ml-1.5" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90">
              <Link to="/servicos">
                <Plus size={14} weight="bold" className="mr-1.5" />
                <span>Agendar Serviço</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── 3. Seletor de Datas Consolidado (Estilo Airbnb / Sympla — Zero Poluição) ── */}
      <section aria-label="Filtro por Data" className="py-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Calendário Consolidado */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-10 px-4 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-xs",
                  selectedDate !== "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/80 text-foreground hover:bg-muted/50"
                )}
              >
                <CalendarIcon className="size-4" />
                <span>
                  {selectedDate === "all"
                    ? "Selecionar Data"
                    : formatDate(selectedDate)}
                </span>
                <ChevronDown className="size-3.5 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 rounded-2xl bg-card border-border/60 shadow-xl" align="start">
              <Calendar
                mode="single"
                selected={selectedDate !== "all" ? new Date(selectedDate + "T12:00:00") : undefined}
                onSelect={(d) => {
                  if (d) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    setSelectedDate(`${year}-${month}-${day}`);
                  }
                }}
                className="rounded-xl"
              />
              {selectedDate !== "all" && (
                <div className="pt-2 border-t border-border/40 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedDate("all")}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Limpar data
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Atalhos Rápidos Inteligentes em Pílulas Flat */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {/* Todos */}
            <button
              type="button"
              onClick={() => setSelectedDate("all")}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                selectedDate === "all"
                  ? "bg-foreground text-background font-bold shadow-2xs"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              Todos os dias
            </button>

            {/* Hoje */}
            {nextDays[0] && (
              <button
                type="button"
                onClick={() => setSelectedDate(nextDays[0].dateKey)}
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  selectedDate === nextDays[0].dateKey
                    ? "bg-foreground text-background font-bold shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>Hoje</span>
                {unifiedItems.some((i) => i.date === nextDays[0].dateKey) && (
                  <span className={cn("size-1.5 rounded-full", selectedDate === nextDays[0].dateKey ? "bg-background" : "bg-primary")} />
                )}
              </button>
            )}

            {/* Amanhã */}
            {nextDays[1] && (
              <button
                type="button"
                onClick={() => setSelectedDate(nextDays[1].dateKey)}
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  selectedDate === nextDays[1].dateKey
                    ? "bg-foreground text-background font-bold shadow-2xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <span>Amanhã</span>
                {unifiedItems.some((i) => i.date === nextDays[1].dateKey) && (
                  <span className={cn("size-1.5 rounded-full", selectedDate === nextDays[1].dateKey ? "bg-background" : "bg-primary")} />
                )}
              </button>
            )}

            {/* Fim de Semana */}
            {nextDays.find((d) => d.weekday === "SÁB" || d.weekday === "DOM") && (() => {
              const weekendDay = nextDays.find((d) => d.weekday === "SÁB") || nextDays.find((d) => d.weekday === "DOM");
              if (!weekendDay) return null;
              return (
                <button
                  type="button"
                  onClick={() => setSelectedDate(weekendDay.dateKey)}
                  className={cn(
                    "h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                    selectedDate === weekendDay.dateKey
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <span>Fim de Semana</span>
                  {unifiedItems.some((i) => i.date === weekendDay.dateKey) && (
                    <span className={cn("size-1.5 rounded-full", selectedDate === weekendDay.dateKey ? "bg-background" : "bg-primary")} />
                  )}
                </button>
              );
            })()}

            {/* Botão de Limpar Data se estiver filtrado */}
            {selectedDate !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedDate("all")}
                className="h-9 size-9 rounded-xl text-muted-foreground hover:text-foreground bg-muted/30 flex items-center justify-center cursor-pointer transition-colors"
                title="Limpar data selecionada"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. DiscoveryControlBar com os 3 Modos Canônicos (Feed, Grid, List) ── */}
      <DiscoveryControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar na agenda, shows, serviços, horários..."
        categories={AGENDA_FILTER_CHIPS}
        activeCategory={selectedFilter}
        onSelectCategory={setSelectedFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 5. Estados de Carregamento e Vazio ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <CircleNotch size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-10 rounded-2xl border border-border/60 bg-card text-center space-y-3">
          <CalendarBlank size={36} className="text-muted-foreground/50 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma programação encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente selecionar outro dia no calendário ou limpar os filtros de busca.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate("all");
                setSelectedFilter("todos");
                setSearch("");
              }}
              className="rounded-xl text-xs font-bold"
            >
              Ver Toda a Programação
            </Button>
          </div>
        </div>
      ) : (
        /* ── 6. Renderização dos 3 Modos Canônicos de Visualização ── */
        <div>
          {/* ── MODO 1: FEED (Carrosséis Horizontais Padronizados) ── */}
          {viewMode === "feed" && (
            <div className="space-y-10">
              {groupedFeed.map((group) => (
                <section key={group.key} aria-label={group.label} className="space-y-3">
                  <HorizontalRail
                    title={group.label}
                    badge={group.badge}
                    actionLabel="Ver em grade"
                    onAction={() => {
                      setSelectedFilter(group.key);
                      setViewMode("grid");
                    }}
                  >
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="min-w-[280px] sm:min-w-[310px] max-w-[320px] shrink-0 group flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 shadow-2xs hover:shadow-xs transition-all select-none"
                      >
                        <Link to={item.to as any} className="block">
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="size-full bg-muted/50 flex items-center justify-center">
                                {item.category === "servicos" ? (
                                  <Scissors size={28} className="text-muted-foreground/30" />
                                ) : item.category === "carnes" ? (
                                  <CreditCard size={28} className="text-muted-foreground/30" />
                                ) : (
                                  <CalendarDots size={28} className="text-muted-foreground/30" />
                                )}
                              </div>
                            )}
                            <div className="absolute top-2.5 left-2.5">
                              <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-[10px] font-bold">
                                {item.badge}
                              </Badge>
                            </div>
                            <div className="absolute bottom-2.5 right-2.5">
                              <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                                {item.dateDisplay}
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 space-y-1">
                            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {item.title}
                            </h3>
                            {item.location && (
                              <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                <MapPin size={12} className="shrink-0 text-primary" />
                                <span>{item.location}</span>
                              </p>
                            )}
                          </div>
                        </Link>

                        <div className="p-3.5 pt-0 flex items-center justify-between border-t border-border/30 mt-2">
                          <span className="text-xs font-bold text-primary font-mono">
                            {item.priceOrStatus}
                          </span>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs font-semibold gap-1">
                            <Link to={item.to as any}>
                              <span>{item.actionLabel}</span>
                              <CaretRight size={12} weight="bold" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </HorizontalRail>
                </section>
              ))}
            </div>
          )}

          {/* ── MODO 2: GRADE (Cards Homogêneos em 3-4 Colunas) ── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <Link to={item.to as any} className="flex-1 flex flex-col cursor-pointer">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-muted/50 flex items-center justify-center">
                          <CalendarDots size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-border/40">
                          {item.badge}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                          {item.dateDisplay}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {item.location && (
                        <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} className="shrink-0 text-primary" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3.5 pt-0 flex items-center justify-between border-t border-border/30">
                    <span className="text-xs font-bold text-primary font-mono">
                      {item.priceOrStatus}
                    </span>
                    <Button asChild size="sm" className="h-8 px-3 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90">
                      <Link to={item.to as any}>
                        <span>{item.actionLabel}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MODO 3: LISTA COMPACTA (Split com Imagem à Esquerda) ── */}
          {viewMode === "list" && (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row items-stretch justify-between rounded-2xl border border-border/60 bg-card hover:border-foreground/30 hover:shadow-xs transition-all overflow-hidden p-0 w-full"
                >
                  <Link
                    to={item.to as any}
                    className="relative w-full sm:w-56 md:w-64 h-40 sm:h-auto min-h-[130px] overflow-hidden bg-muted/40 shrink-0 cursor-pointer"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full bg-muted/50 flex items-center justify-center">
                        <CalendarDots size={28} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border border-border/40">
                        {item.badge}
                      </Badge>
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2">
                    <Link to={item.to as any} className="space-y-1 block cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-primary uppercase">
                          {item.dateDisplay}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                    </Link>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin size={12} className="shrink-0 text-primary" />
                        <span className="truncate">{item.location || "Na região"}</span>
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-primary font-mono">
                          {item.priceOrStatus}
                        </span>
                        <Button asChild size="sm" className="h-8 px-3 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90">
                          <Link to={item.to as any}>
                            <span>{item.actionLabel}</span>
                            <ArrowRight size={13} className="ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
