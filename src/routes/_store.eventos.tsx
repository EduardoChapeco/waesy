import { resolveActiveCity } from "@/lib/city-helper";
import { Tag as LucideTag, X as LucideX, Calendar as CalendarIcon, ChevronDown as LucideChevronDown, Ticket as LucideTicket, Music as LucideMusic, Flame as LucideFlame, PartyPopper as LucidePartyPopper, Utensils as LucideUtensils, Theater as LucideTheater, ShoppingBag as LucideShoppingBag, GraduationCap as LucideGraduationCap, Smile as LucideSmile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CalendarDots, CalendarBlank, MapPin, MagnifyingGlass, CaretRight, Clock, Ticket, ForkKnife, GraduationCap, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPublicEvents } from "@/services/events.functions";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { listHotpages, type HotpageDTO } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { DiscoveryControlBar, type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { formatDate } from "@/lib/datetime";

const SearchSchema = z.object({
  categoria: z.string().optional(),
  data: z.string().optional(),
});

const BASE_EVENT_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos os Eventos", icon: LucideTicket },
  { id: "shows", label: "Shows de Rock e Pop", icon: LucideMusic },
  { id: "sertanejo", label: "Sertanejo e Baladas", icon: LucideFlame },
  { id: "pagode", label: "Samba e Pagode", icon: LucidePartyPopper },
  { id: "gastronomico", label: "Gastronomia e Feiras", icon: LucideUtensils },
  { id: "teatro", label: "Teatro e Stand-up", icon: LucideTheater },
  { id: "feiras", label: "Feiras e Bazaares", icon: LucideShoppingBag },
  { id: "workshops", label: "Cursos e Workshops", icon: LucideGraduationCap },
  { id: "infantil", label: "Infantil e Família", icon: LucideSmile },
  { id: "gratis", label: "Entrada Gratuita", icon: LucideTag },
];

const PRESET_DATE_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoje" },
  { id: "tomorrow", label: "Amanhã" },
  { id: "weekend", label: "Fim de Semana" },
  { id: "next7", label: "7 Dias" },
  { id: "month", label: "Este Mês" },
  { id: "next3months", label: "Próx. 3 Meses" },
  { id: "next6months", label: "Próx. 6 Meses" },
];

const WEEKDAY_NAMES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_NAMES = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const FALLBACK_EVENT_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%2318181b'/%3E%3Ccircle cx='400' cy='250' r='90' fill='%2327272a'/%3E%3Cpath d='M360 210h80v80H360z' fill='none' stroke='%2352525b' stroke-width='4'/%3E%3Ctext x='400' y='340' font-family='sans-serif' font-size='18' font-weight='600' fill='%23a1a1aa' text-anchor='middle'%3EWaesy Eventos%3C/text%3E%3C/svg%3E";

function getEventCover(event: any) {
  return event.cover_image || event.cover_image_url || event.image_url || FALLBACK_EVENT_COVER;
}

export const Route = createFileRoute("/_store/eventos")({
  validateSearch: (search: Record<string, unknown>) => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Marketplace de Eventos, Shows e Ingressos | Waesy" },
      {
        name: "description",
        content:
          "Descubra os principais shows, festivais gastronômicos, feiras, teatros e garanta seus ingressos na cidade.",
      },
    ],
  }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "eventos", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "eventos" } }).catch(() => []),
      ]);
      return {
        banners: banners || [],
        hotpages: hotpages || [],
        activeCity,
      };
    } catch (err) {
      console.warn("[loader:_store.eventos] Loader fallback acionado:", err);
      return { banners: [], hotpages: [] };
    }
  },
  errorComponent: EventosErrorComponent,
  component: EventosPage,
});

function EventosErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <WarningCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar eventos</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar a programação de eventos e ingressos no momento."}
      </p>
      <Button onClick={reset} className="rounded-lg font-bold">
        Tentar Novamente
      </Button>
    </div>
  );
}

function EventosPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const searchParams = Route.useSearch?.() as any;
  const router = useRouter();

  const rawBanners = loaderData?.banners;
  const rawHotpages = loaderData?.hotpages;
  const activeCity = loaderData?.activeCity || "";

  const displayBanners: BannerDTO[] = Array.isArray(rawBanners) ? rawBanners : [];
  const displayHotpages: HotpageDTO[] = Array.isArray(rawHotpages) ? rawHotpages : [];

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams?.categoria || "todos"
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(
    searchParams?.data || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // Sincroniza query string caso venha por navegação direta
  useEffect(() => {
    if (searchParams?.categoria && searchParams.categoria !== selectedCategory) {
      setSelectedCategory(searchParams.categoria);
    }
  }, [searchParams?.categoria]);

  const {
    data: events,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-events-marketplace", activeCity],
    queryFn: async () => {
      try {
        const res = await getPublicEvents({
          data: {
            limit: 150,
            city: activeCity || undefined,
          },
        });
        return res || [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Próximos 60 dias para o seletor horizontal
  const nextDays = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 0; i < 60; i++) {
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
        monthName: MONTH_NAMES[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        isToday: i === 0,
        isTomorrow: i === 1,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isFirstOfMonth: d.getDate() === 1 || i === 0,
      });
    }
    return days;
  }, []);

  // Meses distintos para navegação rápida
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: Array<{ key: string; label: string; year: number; monthIndex: number }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        months.push({
          key,
          label: i === 0 ? "Este Mês" : `${MONTH_NAMES[d.getMonth()]}/${d.getFullYear()}`,
          year: d.getFullYear(),
          monthIndex: d.getMonth(),
        });
      }
    }
    return months;
  }, []);

  // Filtro Universal Avançado de Eventos (Categoria, Data, Busca)
  const filteredEvents = useMemo(() => {
    if (!events || events.length === 0) return [];

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const next7Days = new Date(now);
    next7Days.setDate(now.getDate() + 7);

    return events.filter((e) => {
      const eventDate = new Date(e.event_date);
      const eventIso = e.event_date ? e.event_date.split("T")[0] : "";
      const cat = ((e as any).category || (e as any).attributes?.categoria || "").toLowerCase();
      const titleLower = (e.title || "").toLowerCase();
      const descLower = (e.description || "").toLowerCase();
      const locLower = (e.location || "").toLowerCase();

      // 1. Filtro por Categoria / Subcategoria
      if (selectedCategory !== "todos") {
        if (selectedCategory === "gratis") {
          const isFree =
            !(e as any).price_cents ||
            (e as any).price_cents === 0 ||
            titleLower.includes("gratis") ||
            titleLower.includes("gratuito") ||
            descLower.includes("entrada franca") ||
            descLower.includes("gratuita");
          if (!isFree) return false;
        } else if (selectedCategory === "shows") {
          const isShow =
            cat === "shows" ||
            titleLower.includes("show") ||
            titleLower.includes("festival") ||
            titleLower.includes("banda") ||
            titleLower.includes("rock") ||
            descLower.includes("música ao vivo") ||
            descLower.includes("show");
          if (!isShow) return false;
        } else if (selectedCategory === "sertanejo") {
          const isSertanejo =
            titleLower.includes("sertanejo") ||
            titleLower.includes("modão") ||
            titleLower.includes("boteco") ||
            titleLower.includes("violada") ||
            descLower.includes("sertanejo");
          if (!isSertanejo) return false;
        } else if (selectedCategory === "pagode") {
          const isPagode =
            titleLower.includes("pagode") ||
            titleLower.includes("samba") ||
            titleLower.includes("roda de samba") ||
            descLower.includes("pagode") ||
            descLower.includes("samba");
          if (!isPagode) return false;
        } else if (selectedCategory === "gastronomico") {
          const isGastro =
            cat === "gastronomico" ||
            titleLower.includes("gastronom") ||
            titleLower.includes("cervej") ||
            titleLower.includes("churrasco") ||
            titleLower.includes("burger") ||
            titleLower.includes("pizza") ||
            descLower.includes("food truck") ||
            descLower.includes("open food");
          if (!isGastro) return false;
        } else if (selectedCategory === "teatro") {
          const isTeatro =
            cat === "teatro" ||
            titleLower.includes("teatro") ||
            titleLower.includes("stand-up") ||
            titleLower.includes("comédia") ||
            titleLower.includes("espetáculo") ||
            descLower.includes("peça");
          if (!isTeatro) return false;
        } else if (selectedCategory === "feiras") {
          const isFeira =
            cat === "feiras" ||
            titleLower.includes("feira") ||
            titleLower.includes("bazar") ||
            titleLower.includes("pet") ||
            titleLower.includes("adoção") ||
            descLower.includes("artesanato");
          if (!isFeira) return false;
        } else if (selectedCategory === "workshops") {
          const isWorkshop =
            cat === "workshops" ||
            titleLower.includes("workshop") ||
            titleLower.includes("curso") ||
            titleLower.includes("palestra") ||
            titleLower.includes("masterclass") ||
            descLower.includes("treinamento");
          if (!isWorkshop) return false;
        } else if (selectedCategory === "infantil") {
          const isInfantil =
            titleLower.includes("infantil") ||
            titleLower.includes("criança") ||
            titleLower.includes("família") ||
            titleLower.includes("circo") ||
            descLower.includes("kids");
          if (!isInfantil) return false;
        } else {
          // Comparação genérica por categoria
          if (cat !== selectedCategory) return false;
        }
      }

      // 2. Filtro de Data
      if (selectedDateFilter === "today") {
        if (eventIso !== todayIso) return false;
      } else if (selectedDateFilter === "tomorrow") {
        if (eventIso !== tomorrowIso) return false;
      } else if (selectedDateFilter === "weekend") {
        const dayOfWeek = eventDate.getDay();
        const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!((dayOfWeek === 0 || dayOfWeek === 6) && diffDays >= 0 && diffDays <= 7)) {
          return false;
        }
      } else if (selectedDateFilter === "next7") {
        if (eventDate < now || eventDate > next7Days) return false;
      } else if (selectedDateFilter === "month") {
        if (eventDate.getMonth() !== now.getMonth() || eventDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (selectedDateFilter === "next3months") {
        const next3 = new Date(now);
        next3.setMonth(now.getMonth() + 3);
        if (eventDate < now || eventDate > next3) return false;
      } else if (selectedDateFilter === "next6months") {
        const next6 = new Date(now);
        next6.setMonth(now.getMonth() + 6);
        if (eventDate < now || eventDate > next6) return false;
      } else if (selectedDateFilter !== "all") {
        if (selectedDateFilter.length === 7) {
          const [filterYear, filterMonth] = selectedDateFilter.split("-").map(Number);
          if (eventDate.getFullYear() !== filterYear || eventDate.getMonth() + 1 !== filterMonth) {
            return false;
          }
        } else {
          if (eventIso !== selectedDateFilter) return false;
        }
      }

      // 3. Filtro de Busca por Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = titleLower.includes(q);
        const matchesDesc = descLower.includes(q);
        const matchesLoc = locLower.includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc) return false;
      }

      return true;
    });
  }, [events, selectedCategory, selectedDateFilter, searchQuery]);

  // Contagem de eventos por dia para os badges no calendário
  const eventsCountByDateKey = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!events) return counts;
    events.forEach((e) => {
      if (e.event_date) {
        const key = e.event_date.split("T")[0];
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [events]);

  // Contagem de eventos por subcategoria para os badges nos botões
  const eventsCountBySubcategory = useMemo(() => {
    const counts: Record<string, number> = { todos: events?.length || 0 };
    if (!events) return counts;

    events.forEach((e) => {
      const cat = ((e as any).category || (e as any).attributes?.categoria || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      const d = (e.description || "").toLowerCase();

      if (!(e as any).price_cents || (e as any).price_cents === 0 || t.includes("gratis")) {
        counts.gratis = (counts.gratis || 0) + 1;
      }
      if (cat === "shows" || t.includes("show") || t.includes("rock") || t.includes("festival")) {
        counts.shows = (counts.shows || 0) + 1;
      }
      if (t.includes("sertanejo") || t.includes("boteco") || d.includes("sertanejo")) {
        counts.sertanejo = (counts.sertanejo || 0) + 1;
      }
      if (t.includes("pagode") || t.includes("samba") || d.includes("pagode")) {
        counts.pagode = (counts.pagode || 0) + 1;
      }
      if (cat === "gastronomico" || t.includes("cervej") || t.includes("gastronom")) {
        counts.gastronomico = (counts.gastronomico || 0) + 1;
      }
      if (cat === "teatro" || t.includes("teatro") || t.includes("stand-up")) {
        counts.teatro = (counts.teatro || 0) + 1;
      }
      if (cat === "feiras" || t.includes("feira") || t.includes("bazar") || t.includes("pet")) {
        counts.feiras = (counts.feiras || 0) + 1;
      }
      if (cat === "workshops" || t.includes("workshop") || t.includes("curso")) {
        counts.workshops = (counts.workshops || 0) + 1;
      }
      if (t.includes("infantil") || t.includes("criança") || d.includes("kids")) {
        counts.infantil = (counts.infantil || 0) + 1;
      }
    });

    return counts;
  }, [events]);

  const eventCategories: FilterChipOption[] = useMemo(() => {
    return BASE_EVENT_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      count: eventsCountBySubcategory[cat.id] || 0,
    }));
  }, [eventsCountBySubcategory]);

  // Trilhos Temáticos Dinâmicos para o Modo Feed
  const feedThematicRails = useMemo(() => {
    if (!filteredEvents || filteredEvents.length === 0) return [];

    const shows = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "shows" || t.includes("show") || t.includes("festival") || t.includes("música");
    });

    const gastro = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "gastronomico" || t.includes("gastronom") || t.includes("cervej") || t.includes("festa");
    });

    const teatro = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "teatro" || t.includes("teatro") || t.includes("stand-up") || t.includes("comédia");
    });

    const workshops = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "workshops" || t.includes("workshop") || t.includes("curso") || t.includes("palestra");
    });

    const gratis = filteredEvents.filter((e) => {
      const t = (e.title || "").toLowerCase();
      return !(e as any).price_cents || (e as any).price_cents === 0 || t.includes("gratis");
    });

    const rails = [];

    if (shows.length > 0) {
      rails.push({
        id: "shows-rail",
        title: "Grandes Shows e Festivais",
        categoryKey: "shows",
        items: shows,
      });
    }

    if (gastro.length > 0) {
      rails.push({
        id: "gastro-rail",
        title: "Festivais Gastronômicos e Noite",
        categoryKey: "gastronomico",
        items: gastro,
      });
    }

    if (teatro.length > 0) {
      rails.push({
        id: "teatro-rail",
        title: "Teatro, Stand-up e Cultura",
        categoryKey: "teatro",
        items: teatro,
      });
    }

    if (workshops.length > 0) {
      rails.push({
        id: "workshops-rail",
        title: "Cursos, Workshops e Negócios",
        categoryKey: "workshops",
        items: workshops,
      });
    }

    if (gratis.length > 0) {
      rails.push({
        id: "gratis-rail",
        title: "Eventos com Entrada Gratuita",
        categoryKey: "gratis",
        items: gratis,
      });
    }

    // Se nenhum nicho específico matchou ou sobraram outros eventos
    if (rails.length === 0 || filteredEvents.length > 0) {
      rails.push({
        id: "todos-rail",
        title: "Programação Completa da Cidade",
        categoryKey: "todos",
        items: filteredEvents,
      });
    }

    return rails;
  }, [filteredEvents]);

  const activeDateLabel = useMemo(() => {
    if (selectedDateFilter === "all") return "Todos os Dias";
    if (selectedDateFilter === "today") return "Hoje";
    if (selectedDateFilter === "tomorrow") return "Amanhã";
    if (selectedDateFilter === "weekend") return "Este Fim de Semana";
    if (selectedDateFilter === "next7") return "Próximos 7 Dias";
    if (selectedDateFilter === "month") return "Este Mês";
    if (selectedDateFilter === "next3months") return "Próximos 3 Meses";
    if (selectedDateFilter === "next6months") return "Próximos 6 Meses";
    if (selectedDateFilter.length === 7) {
      const month = availableMonths.find((m) => m.key === selectedDateFilter);
      return month ? month.label : selectedDateFilter;
    }
    const foundDay = nextDays.find((d) => d.dateKey === selectedDateFilter);
    if (foundDay) {
      return `${foundDay.weekday}, ${foundDay.dayNumber} de ${foundDay.monthName}`;
    }
    return selectedDateFilter;
  }, [selectedDateFilter, nextDays, availableMonths]);

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      <NativeMobileHeader
        title="Eventos"
        centerTitle
        backTo="/"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar shows, festivais, eventos..."
      />
      <div className="px-4 sm:px-5 space-y-6 pt-2 sm:pt-4">
      {/* ── 1. Top Universal Banner Hero Carousel (Canônico & Editável no Admin) ── */}
      {displayBanners.length > 0 && (
        <section aria-label="Destaques & Banners de Eventos">
          <BannerHeroCarousel banners={displayBanners} className="w-full" />
        </section>
      )}

      {/* ── 2. Seção de Cards Panorâmicos de Hotpages de Eventos ── */}
      {displayHotpages.length > 0 && (
        <section aria-label="Hotpages e Destaques Temáticos">
          <HotpagesRail
            hotpages={displayHotpages}
            activeSlug={selectedCategory}
            onSelect={(slug) => setSelectedCategory(slug === selectedCategory ? "todos" : slug)}
          />
        </section>
      )}

      {/* ── 3. Barra de Controle de Descoberta & Categorias Unificadas ── */}
      <DiscoveryControlBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar show, festival, teatro, local, artista..."
        categories={eventCategories}
        activeCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat === selectedCategory && cat !== "todos" ? "todos" : cat)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 4. Filtro de Data & Calendário Canônico ── */}
      <section aria-label="Programação por Data" className="space-y-2">
        <div role="tablist" aria-label="Filtro de Data" className="flex items-center gap-2 overflow-x-auto tab-list no-scrollbar pb-1 snap-x snap-mandatory">
          {/* Popover com Calendário Interativo */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none shrink-0 snap-start whitespace-nowrap ${
                  selectedDateFilter !== "all" && selectedDateFilter.includes("-")
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "bg-card border-border/80 text-foreground hover:bg-muted/60"
                }`}
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>
                  {selectedDateFilter !== "all" && selectedDateFilter.includes("-")
                    ? activeDateLabel
                    : "Escolher Data"}
                </span>
                <LucideChevronDown className="size-3 opacity-60 ml-1" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg border border-border shadow-xs bg-card" align="start">
              <Calendar
                mode="single"
                selected={selectedDateFilter.includes("-") && selectedDateFilter.length === 10 ? new Date(selectedDateFilter + "T12:00:00") : undefined}
                onSelect={(d) => {
                  if (d) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    setSelectedDateFilter(`${y}-${m}-${day}`);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Quick Filter Pills */}
          {[
            { id: "all", label: "Todos os Dias" },
            { id: "today", label: "Hoje" },
            { id: "tomorrow", label: "Amanhã" },
            { id: "weekend", label: "Fim de Semana" },
            { id: "month", label: "Este Mês" },
          ].map((pill) => {
            const isSelected = selectedDateFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedDateFilter(pill.id)}
                className={`h-11 px-3.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0 snap-start whitespace-nowrap ${
                  isSelected
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            );
          })}

          {/* Botão de Limpar Data quando selecionada */}
          {selectedDateFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter("all")}
              className="h-11 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <LucideX className="size-3.5" />
              <span>Limpar</span>
            </button>
          )}

          {/* Contador de eventos */}
          <span className="text-xs font-mono text-muted-foreground ml-auto pr-1">
            {filteredEvents.length} {filteredEvents.length === 1 ? "evento" : "eventos"}
          </span>
        </div>
      </section>

      {/* ── 5. Estados de Carregamento, Erro e Vazio ── */}
      {isLoading && (
        <div className="flex justify-center py-24">
          <CircleNotch size={32} className="animate-spin motion-reduce:animate-none text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="py-12 px-6 rounded-lg border border-destructive/20 bg-destructive/5 text-center space-y-2">
          <WarningCircle size={32} className="text-destructive mx-auto" />
          <p className="font-semibold text-foreground text-sm">Erro ao carregar o Marketplace de Eventos</p>
        </div>
      )}

      {!isLoading && !isError && filteredEvents.length === 0 && (
        <div className="py-20 text-center space-y-3 bg-card rounded-lg p-8 border border-border/50">
          <CalendarBlank size={36} className="text-muted-foreground/40 mx-auto" />
          <h2 className="text-sm font-semibold text-foreground">
            Nenhum evento encontrado
          </h2>
          {(selectedDateFilter !== "all" || selectedCategory !== "todos" || searchQuery.trim()) && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDateFilter("all");
                  setSelectedCategory("todos");
                  setSearchQuery("");
                }}
                className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer focus-visible:ring-2"
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Renderização dos Modos de Visualização ── */}

      {/* MODO 1: FEED DE TRILHOS TEMÁTICOS & MOTOR PROCEDURAL INFINITE FEED */}
      {!isLoading && !isError && filteredEvents.length > 0 && viewMode === "feed" && (
        <div className="space-y-12">
          {feedThematicRails.map(({ id, title, categoryKey, items }) => (
            <HorizontalRail
              key={id}
              title={title}
              actionLabel="Ver todos no grid"
              onAction={() => {
                setSelectedCategory(categoryKey);
                setViewMode("grid");
              }}
            >
              {items.map((event) => (
                <Link
                  key={event.id}
                  to="/evento/$id"
                  params={{ id: event.id }}
                  className="w-72 sm:w-80 rounded-lg bg-card border border-border/60 overflow-hidden hover:border-foreground/30 transition-colors duration-200 flex flex-col justify-between shrink-0 group select-none block shadow-xs"
                >
                  <div className="space-y-3 block">
                    <div className="aspect-16/10 relative overflow-hidden bg-muted">
                      <img
                        src={getEventCover(event)}
                        alt={event.title}
                        className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_EVENT_COVER;
                        }}
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="bg-foreground text-background text-xs font-mono font-bold px-3 py-1 rounded-lg border border-border/40">
                          {formatDate(event.event_date)}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 bg-background/80 backdrop-blur-md px-3 py-1 rounded-md">
                          {event.title}
                        </h3>
                      </div>
                    </div>

                    <div className="px-4 space-y-2 text-xs">
                      {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={13} weight="bold" className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                        {event.description || "Evento oficial da comunidade."}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                    <span className="text-xs font-bold text-primary">
                      {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Entrada Gratuita"}
                    </span>
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Ver ingressos <CaretRight size={12} weight="bold" />
                    </span>
                  </div>
                </Link>
              ))}
            </HorizontalRail>
          ))}

          {/* Motor de Descoberta Infinita Procedural no Rodapé do Feed */}
          <div className="pt-6 border-t border-border/40">
            <ProceduralInfiniteFeed
              city="São Miguel do Oeste"
              pageSize={4}
            />
          </div>
        </div>
      )}

      {/* MODO 2: GRID COMPACTO MODERNO (16/10) */}
      {!isLoading && !isError && filteredEvents.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to="/evento/$id"
              params={{ id: event.id }}
              className="rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors duration-200 flex flex-col justify-between group shadow-xs"
            >
              <div className="space-y-3">
                <div className="aspect-16/10 relative overflow-hidden bg-muted">
                  <img
                    src={getEventCover(event)}
                    alt={event.title}
                    className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_EVENT_COVER;
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-foreground text-background text-xs font-mono font-bold px-3 py-1 rounded-lg border border-border/40">
                      {formatDate(event.event_date)}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 bg-background/80 backdrop-blur-md px-3 py-1 rounded-md">
                      {event.title}
                    </h3>
                  </div>
                </div>

                <div className="px-4 space-y-1 text-xs">
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={13} weight="bold" className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                    {event.description || "Evento oficial da comunidade."}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                <span className="text-xs font-bold text-primary">
                  {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Entrada Gratuita"}
                </span>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Detalhes <CaretRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* MODO 3: LISTA EXPANDIDA (V118 Full-Height Left Edge-to-Edge Image) */}
      {!isLoading && !isError && filteredEvents.length > 0 && viewMode === "list" && (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to="/evento/$id"
              params={{ id: event.id }}
              className="group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-colors duration-200 min-h-36 pl-32 sm:pl-44 pr-4 py-4 flex items-center justify-between gap-3 cursor-pointer w-full"
            >
              <div className="absolute inset-y-0 left-0 w-32 sm:w-44 rounded-l-lg overflow-hidden bg-muted">
                <img
                  src={getEventCover(event)}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_EVENT_COVER;
                  }}
                />
              </div>

              <div className="space-y-1 min-w-0 flex-1 pl-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary uppercase">
                    {formatDate(event.event_date)}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    <MapPin size={12} weight="bold" className="shrink-0 text-primary" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0 pl-1">
                <span className="text-xs sm:text-sm font-bold text-primary font-mono">
                  {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Gratuito"}
                </span>
                <div className="h-11 px-4 rounded-lg text-xs font-semibold gap-1 inline-flex items-center justify-center border border-border bg-card text-foreground group-hover:bg-muted/80 transition-colors select-none">
                  <span>Ingressos</span>
                  <CaretRight size={12} weight="bold" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
