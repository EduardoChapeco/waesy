import React, { useState, useMemo, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { resolveActiveCity } from "@/lib/city-helper";
import { getPublicEvents, getPublicEventOrganizers, type EventOrganizerDTO } from "@/services/events.functions";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { listHotpages, type HotpageDTO } from "@/services/hotpage.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";
import { EventsShowcaseMobileView } from "@/components/events/EventsShowcaseMobileView";
import { EventsShowcaseDesktopView } from "@/components/events/EventsShowcaseDesktopView";
import { EventSubvitrineView } from "@/components/events/EventSubvitrineView";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import type { EventFeatureMiniBannerItem } from "@/components/events/EventFeatureMiniBannersRail";

const SearchSchema = z.object({
  categoria: z.string().optional(),
  data: z.string().optional(),
  q: z.string().optional(),
});

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
      const [banners, hotpages, surfaceFeed, realOrganizers, miniBannersPool] = await Promise.all([
        listActiveBanners({ data: { placement: "eventos", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "eventos" } }).catch(() => []),
        getModularSurfaceFeed({ data: { surfaceSlug: "eventos", city: activeCity } }).catch(() => ({
          sections: [],
          allProducts: [],
        })),
        getPublicEventOrganizers({ data: { city: activeCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "events", city: activeCity } }).catch(() => []),
      ]);
      return {
        banners: banners || [],
        hotpages: hotpages || [],
        surfaceFeed: surfaceFeed || { sections: [], allProducts: [] },
        realOrganizers: realOrganizers || [],
        miniBannersPool: miniBannersPool || [],
        activeCity,
      };
    } catch (err) {
      console.warn("[loader:_store.eventos] Loader fallback acionado:", err);
      return {
        banners: [],
        hotpages: [],
        surfaceFeed: { sections: [], allProducts: [] },
        realOrganizers: [],
        miniBannersPool: [],
        activeCity,
      };
    }
  },
  errorComponent: EventosErrorComponent,
  component: EventosPage,
});

function EventosErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
      <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
        <WarningCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Instabilidade ao carregar eventos</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {error?.message || "Não foi possível carregar a programação de eventos e ingressos no momento."}
      </p>
      <Button onClick={reset} className="rounded-xl font-bold h-11 min-h-11 px-6">
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
  const activeCity = loaderData?.activeCity || "São Miguel do Oeste";
  const displayBanners: BannerDTO[] = Array.isArray(rawBanners) ? rawBanners : [];
  const realOrganizers: EventOrganizerDTO[] = Array.isArray(loaderData?.realOrganizers)
    ? loaderData.realOrganizers
    : [];

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams?.categoria || "todos"
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(
    searchParams?.data || "all"
  );
  const [searchQuery, setSearchQuery] = useState(searchParams?.q || "");

  // Sincroniza query string caso venha por navegação direta
  useEffect(() => {
    if (searchParams?.categoria && searchParams.categoria !== selectedCategory) {
      setSelectedCategory(searchParams.categoria);
    }
  }, [searchParams?.categoria]);

  // Consulta BFF de eventos futuros da cidade (Dados 100% reais do Supabase)
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

      // 1. Filtro por Categoria
      if (selectedCategory !== "todos") {
        if (selectedCategory === "gratis") {
          const isFree =
            !(e as any).price_cents ||
            (e as any).price_cents === 0 ||
            !(e as any).price_min_cents ||
            (e as any).price_min_cents === 0 ||
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

  // Contagem real de eventos por categoria
  const eventsCountBySubcategory = useMemo(() => {
    const counts: Record<string, number> = { todos: events?.length || 0 };
    if (!events) return counts;

    events.forEach((e) => {
      const cat = ((e as any).category || (e as any).attributes?.categoria || "").toLowerCase();
      const t = (e.title || "").toLowerCase();

      if (!(e as any).price_cents || (e as any).price_cents === 0 || !(e as any).price_min_cents || (e as any).price_min_cents === 0 || t.includes("gratis")) {
        counts.gratis = (counts.gratis || 0) + 1;
      }
      if (cat === "shows" || t.includes("show") || t.includes("rock") || t.includes("festival")) {
        counts.shows = (counts.shows || 0) + 1;
      }
      if (t.includes("sertanejo") || t.includes("boteco")) {
        counts.sertanejo = (counts.sertanejo || 0) + 1;
      }
      if (t.includes("pagode") || t.includes("samba")) {
        counts.pagode = (counts.pagode || 0) + 1;
      }
      if (cat === "gastronomico" || t.includes("cervej") || t.includes("gastronom")) {
        counts.gastronomico = (counts.gastronomico || 0) + 1;
      }
      if (cat === "teatro" || t.includes("teatro") || t.includes("stand-up")) {
        counts.teatro = (counts.teatro || 0) + 1;
      }
      if (cat === "feiras" || t.includes("feira") || t.includes("bazar")) {
        counts.feiras = (counts.feiras || 0) + 1;
      }
      if (cat === "workshops" || t.includes("workshop") || t.includes("curso")) {
        counts.workshops = (counts.workshops || 0) + 1;
      }
      if (t.includes("infantil") || t.includes("criança")) {
        counts.infantil = (counts.infantil || 0) + 1;
      }
    });

    return counts;
  }, [events]);

  // Separação de "Eventos pra você" e "Eventos em alta"
  const eventsForYou = useMemo(() => {
    return filteredEvents.slice(0, 10);
  }, [filteredEvents]);

  const trendingEvents = useMemo(() => {
    return [...filteredEvents].reverse().slice(0, 8);
  }, [filteredEvents]);

  // Trilhos Temáticos Dinâmicos Baseados Exclusivamente em Dados Reais
  const thematicRails = useMemo(() => {
    if (!filteredEvents || filteredEvents.length === 0) return [];

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const weekendEvents = filteredEvents.filter((e) => {
      const d = new Date(e.event_date);
      const day = d.getDay();
      return day === 0 || day === 5 || day === 6;
    });

    const freeEvents = filteredEvents.filter((e) => {
      const t = (e.title || "").toLowerCase();
      return e.is_free || !(e as any).price_min_cents || !(e as any).price_cents || t.includes("gratis");
    });

    const shows = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "shows" || t.includes("show") || t.includes("festival");
    });

    const gastro = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "gastronomico" || t.includes("gastronom") || t.includes("cervej");
    });

    const teatro = filteredEvents.filter((e) => {
      const cat = ((e as any).category || "").toLowerCase();
      const t = (e.title || "").toLowerCase();
      return cat === "teatro" || t.includes("teatro") || t.includes("stand-up");
    });

    const rails = [];
    if (weekendEvents.length > 0) {
      rails.push({
        id: "weekend-rail",
        title: "Eventos no Fim de Semana",
        categoryKey: "todos",
        items: weekendEvents,
      });
    }
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
        title: "Festivais Gastronômicos & Chopp",
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
    if (freeEvents.length > 0) {
      rails.push({
        id: "free-rail",
        title: "Eventos com Entrada Franca",
        categoryKey: "gratis",
        items: freeEvents,
      });
    }

    return rails;
  }, [filteredEvents]);

  // Extração de configurações da Capa do CMS (Invariante B.20)
  const surfaceSections = loaderData?.surfaceFeed?.sections || [];
  const heroCoverSection = surfaceSections.find((s: any) => s.type === "hero_card" || s.config?.hero_cover);
  const heroCoverConfig = heroCoverSection?.config?.hero_cover || {};

  // Mini-banners reais configurados via CMS ou banners com placement "eventos_mini"
  const configuredMiniBanners: EventFeatureMiniBannerItem[] = useMemo(() => {
    const rawMiniBanners = loaderData?.miniBannersPool || [];
    if (rawMiniBanners.length > 0) {
      return rawMiniBanners.map((b: any) => ({
        id: b.id,
        title: b.title || "Destaque Especial",
        subtitle: b.subtitle || null,
        targetUrl: b.link_url || b.target_url || "/eventos",
        badgeText: b.badge_text || null,
        actionText: b.button_label || "Conferir",
        bgColor: b.bg_color || "#0284c7",
        imageUrl: b.image_url || null,
      }));
    }

    const miniSection = surfaceSections.find(
      (s: any) => s.layout_variant === "feature_mini_banners" || s.type === "banner_trio_bento"
    );
    if (miniSection && Array.isArray((miniSection.config as any)?.banners)) {
      return (miniSection.config as any).banners;
    }

    return [];
  }, [loaderData?.miniBannersPool, surfaceSections]);

  const { isCompact } = useWindowSizeClass();

  return (
    <div className="w-full min-h-screen bg-background">
      {/* ── BIFURCAÇÃO 1: SUBVITRINE QUANDO UMA CATEGORIA ESPECÍFICA FOR SELECIONADA ── */}
      {selectedCategory !== "todos" ? (
        <EventSubvitrineView
          categorySlug={selectedCategory}
          activeCity={activeCity}
          events={filteredEvents}
          onBackToAll={() => setSelectedCategory("todos")}
          producers={realOrganizers}
        />
      ) : isCompact ? (
        /* ── BIFURCAÇÃO 2: EXPERIÊNCIA NATIVA MOBILE (iFood + Sympla) ── */
        <EventsShowcaseMobileView
          activeCity={activeCity}
          coverImageUrl={heroCoverConfig.background_image_url}
          themeColor={heroCoverConfig.theme_color || "#0284c7"}
          calloutTitle={heroCoverConfig.callout_title || "Aqui tem desconto pra quem é Clube!"}
          partnerLogoUrl={heroCoverConfig.partner_logo_url}
          activeCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={eventsCountBySubcategory}
          eventsForYou={eventsForYou}
          trendingEvents={trendingEvents}
          producers={realOrganizers}
          miniBanners={configuredMiniBanners}
          thematicRails={thematicRails}
          allFilteredEvents={filteredEvents}
          selectedDateFilter={selectedDateFilter}
          onSelectDateFilter={setSelectedDateFilter}
          isLoading={isLoading}
          isError={isError}
        />
      ) : (
        /* ── BIFURCAÇÃO 3: EXPERIÊNCIA EXPANDIDA DESKTOP (Widescreen + Carrosséis Instagram) ── */
        <EventsShowcaseDesktopView
          activeCity={activeCity}
          banners={displayBanners}
          activeCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={eventsCountBySubcategory}
          eventsForYou={eventsForYou}
          trendingEvents={trendingEvents}
          producers={realOrganizers}
          miniBanners={configuredMiniBanners}
          thematicRails={thematicRails}
          allFilteredEvents={filteredEvents}
          selectedDateFilter={selectedDateFilter}
          onSelectDateFilter={setSelectedDateFilter}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
