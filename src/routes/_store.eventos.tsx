import { Tag as LucideTag, X as LucideX, Calendar as CalendarIcon, ChevronDown as LucideChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CalendarDots,
  CalendarBlank,
  MapPin,
  MagnifyingGlass,
  CaretRight,
  Clock,
  Ticket,
  ForkKnife,
  GraduationCap,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPublicEvents } from "@/services/events.functions";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { listHotpages, type HotpageDTO } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { formatDate } from "@/lib/datetime";

const SearchSchema = z.object({
  categoria: z.string().optional(),
  data: z.string().optional(),
});

const EVENT_SUBCATEGORIES_BUTTONS = [
  { id: "todos", label: "Todos os Eventos", icon: "🎟️" },
  { id: "shows", label: "Shows de Rock & Pop", icon: "🎸" },
  { id: "sertanejo", label: "Sertanejo & Baladas", icon: "🤠" },
  { id: "pagode", label: "Samba & Pagode", icon: "🥁" },
  { id: "gastronomico", label: "Gastronomia & Feiras", icon: "🍔" },
  { id: "teatro", label: "Teatro & Stand-up", icon: "🎭" },
  { id: "feiras", label: "Bazaares & Pets", icon: "🛍️" },
  { id: "workshops", label: "Cursos & Workshops", icon: "🎓" },
  { id: "infantil", label: "Infantil & Família", icon: "🎈" },
  { id: "gratis", label: "Entrada Gratuita", icon: "🏷️" },
];

const EVENT_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todas Categorias", emoji: "🎟️", icon: LucideTag },
  { id: "shows", label: "Shows & Festivais", emoji: "🎸", icon: Ticket },
  { id: "gastronomico", label: "Gastronomia & Feiras", emoji: "🍔", icon: ForkKnife },
  { id: "feiras", label: "Bazaares & Pets", emoji: "🛍️", icon: LucideTag },
  { id: "workshops", label: "Cursos & Workshops", emoji: "🎓", icon: GraduationCap },
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

const FALLBACK_EVENT_COVERS = {
  default: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
};

function getEventCover(event: any) {
  return event.cover_image || event.cover_image_url || event.image_url || FALLBACK_EVENT_COVERS.default;
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
  loader: async () => {
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "eventos" } }).catch(() => []),
        listHotpages({ data: { module: "eventos" } }).catch(() => []),
      ]);
      return {
        banners: banners || [],
        hotpages: hotpages || [],
      };
    } catch (err) {
      console.warn("[loader:_store.eventos] Loader fallback acionado:", err);
      return { banners: [], hotpages: [] };
    }
  },
  component: EventosPage,
});

function EventosPage() {
  const loaderData = Route.useLoaderData?.() as any;
  const searchParams = Route.useSearch?.() as any;
  const router = useRouter();

  const rawBanners = loaderData?.banners;
  const rawHotpages = loaderData?.hotpages;

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
    queryKey: ["public-events-marketplace"],
    queryFn: async () => {
      try {
        const res = await getPublicEvents({
          data: {
            limit: 150,
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
        title: "Grandes Shows & Festivais",
        categoryKey: "shows",
        items: shows,
      });
    }

    if (gastro.length > 0) {
      rails.push({
        id: "gastro-rail",
        title: "Festivais Gastronômicos & Noite",
        categoryKey: "gastronomico",
        items: gastro,
      });
    }

    if (teatro.length > 0) {
      rails.push({
        id: "teatro-rail",
        title: "Teatro, Stand-up & Cultura",
        categoryKey: "teatro",
        items: teatro,
      });
    }

    if (workshops.length > 0) {
      rails.push({
        id: "workshops-rail",
        title: "Cursos, Workshops & Negócios",
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
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-7 pb-24">
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

      {/* ── 3. Subcategorias de Eventos ── */}
      <section aria-label="Subcategorias de Eventos" className="space-y-2">
        {selectedCategory !== "todos" && (
          <div className="flex justify-end pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory("todos")}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Limpar filtro de categoria
            </button>
          </div>
        )}

        {/* Trilho de Botões Ergonômicos com Contadores */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
          {EVENT_SUBCATEGORIES_BUTTONS.map((sub) => {
            const isSelected = selectedCategory === sub.id;
            const count = eventsCountBySubcategory[sub.id] || 0;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected && sub.id !== "todos" ? "todos" : sub.id)}
                className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer select-none snap-start whitespace-nowrap ${
                  isSelected
                    ? "bg-foreground text-background font-bold shadow-sm scale-102"
                    : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-foreground/20"
                }`}
              >
                <span>{sub.icon}</span>
                <span>{sub.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-background/20 text-background font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4. Filtro de Data & Calendário Canônico (Apple / Airbnb HIG) ── */}
      <section aria-label="Programação por Data" className="space-y-2 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
          {/* Popover com Calendário Interativo */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer select-none shrink-0 snap-start whitespace-nowrap ${
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
                <LucideChevronDown className="size-3 opacity-60 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border border-border shadow-xs bg-card" align="start">
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
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 snap-start whitespace-nowrap ${
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
              className="h-9 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LucideX className="size-3.5" />
              <span>Limpar</span>
            </button>
          )}

          {/* Badge sutil com total de eventos filtrados */}
          <span className="text-[11px] font-mono text-muted-foreground ml-auto pr-1">
            {filteredEvents.length} {filteredEvents.length === 1 ? "evento" : "eventos"}
          </span>
        </div>
      </section>

      {/* ── 5. DiscoveryControlBar (Busca em Tempo Real & Modos de Visualização) ── */}
      <DiscoveryControlBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar show, festival, teatro, local, artista..."
        categories={EVENT_CATEGORIES}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── 6. Estados de Carregamento, Erro e Vazio ── */}
      {isLoading && (
        <div className="flex justify-center py-24">
          <CircleNotch size={32} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="py-12 px-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-2">
          <WarningCircle size={32} className="text-destructive mx-auto" />
          <p className="font-semibold text-foreground text-sm">Erro ao carregar o Marketplace de Eventos</p>
        </div>
      )}

      {!isLoading && !isError && filteredEvents.length === 0 && (
        <div className="py-20 text-center space-y-3 bg-muted/20 rounded-2xl p-8 border border-border/40">
          <CalendarBlank size={36} className="text-muted-foreground/50 mx-auto" />
          <h2 className="text-sm font-semibold text-foreground">
            Nenhum evento agendado para {activeDateLabel}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente selecionar outro dia no calendário acima ou limpar os filtros de busca.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDateFilter("all");
                setSelectedCategory("todos");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold"
            >
              Ver Todos os Eventos
            </Button>
          </div>
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
                  className="min-w-[290px] sm:min-w-[320px] max-w-[340px] rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between shrink-0 group select-none block shadow-xs"
                >
                  <div className="space-y-3 block">
                    <div className="aspect-16/10 relative overflow-hidden bg-muted">
                      <img
                        src={getEventCover(event)}
                        alt={event.title}
                        className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_EVENT_COVERS.default;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/20">
                          {formatDate(event.event_date)}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                          {event.title}
                        </h3>
                      </div>
                    </div>

                    <div className="px-4 space-y-1.5 text-xs">
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin size={13} weight="bold" className="shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                        {event.description || "Evento oficial da comunidade."}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                    <span className="text-xs font-bold text-primary">
                      {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Entrada Gratuita"}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
              className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div className="space-y-3">
                <div className="aspect-16/10 relative overflow-hidden bg-muted">
                  <img
                    src={getEventCover(event)}
                    alt={event.title}
                    className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_EVENT_COVERS.default;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/20">
                      {formatDate(event.event_date)}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                <div className="px-4 space-y-1 text-xs">
                  {event.location && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin size={13} weight="bold" className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                    {event.description || "Evento oficial da comunidade."}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-3 flex items-center justify-between border-t border-border/40 mt-3">
                <span className="text-xs font-bold text-primary">
                  {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Entrada Gratuita"}
                </span>
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Detalhes <CaretRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* MODO 3: LISTA CRONOLÓGICA ELEGANTE */}
      {!isLoading && !isError && filteredEvents.length > 0 && viewMode === "list" && (
        <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to="/evento/$id"
              params={{ id: event.id }}
              className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="size-16 sm:size-20 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                  <img
                    src={getEventCover(event)}
                    alt={event.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_EVENT_COVERS.default;
                    }}
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase">
                      {formatDate(event.event_date)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <MapPin size={12} weight="bold" className="shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {(event as any).price_cents ? `R$ ${((event as any).price_cents / 100).toFixed(2)}` : "Gratuito"}
                </span>
                <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold gap-1">
                  Ingressos <CaretRight size={12} weight="bold" />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
