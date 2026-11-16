import type { FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { formatMoney } from "@/lib/money";
import type { RaffleDTO } from "@/services/invite.functions";
import {
  Tag,
  Newspaper,
  Briefcase,
  CalendarDots,
  MapPin,
  Storefront,
  Ticket,
  Target,
  Rss,
  Globe,
  CookingPot,
  Airplane,
  Trophy,
} from "@phosphor-icons/react";

export const COMMUNITY_DISCOVERY_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Todos os Anúncios", icon: Globe },
  { id: "places", label: "Lugares e Negócios", icon: MapPin },
  { id: "marketplace", label: "Marketplace de Empresas", icon: Storefront },
  { id: "classificados", label: "Classificados", icon: Tag },
  { id: "receitas", label: "Receitas", icon: CookingPot },
  { id: "turismo", label: "Turismo e Roteiros", icon: Airplane },
  { id: "feed", label: "Feed", icon: Rss },
  { id: "noticias", label: "Notícias", icon: Newspaper },
  { id: "empregos", label: "Empregos", icon: Briefcase },
  { id: "eventos", label: "Eventos", icon: Ticket },
  { id: "agenda", label: "Agenda", icon: CalendarDots },
  { id: "afiliados", label: "Afiliados", icon: Target },
  { id: "concursos", label: "Concursos de Sorte", icon: Trophy },
];

export type UnifiedHomeItem = {
  id: string;
  pillar:
    | "places"
    | "marketplace"
    | "classifieds"
    | "feed"
    | "noticias"
    | "empregos"
    | "eventos"
    | "agenda"
    | "afiliados"
    | "concursos";
  badge: string;
  title: string;
  image?: string | null;
  to: string;
  priceOrDate?: string;
  location?: string;
  phone?: string;
};

export function buildUnifiedCommunityItems(params: {
  activeCategory: string;
  filteredMarketplaceProducts: any[];
  filteredPlaces: any[];
  filteredClassifieds: any[];
  filteredFeed: any[];
  filteredNews: any[];
  filteredJobs: any[];
  filteredEvents: any[];
  filteredConcursos: RaffleDTO[];
}): UnifiedHomeItem[] {
  const { activeCategory } = params;
  const list: UnifiedHomeItem[] = [];
  const allow = (key: string) => activeCategory === "todos" || activeCategory === key;

  if (allow("marketplace")) {
    params.filteredMarketplaceProducts.forEach((item) => {
      list.push({
        id: `mkt-${item.id}`,
        pillar: "marketplace",
        badge: item.store_name || "Marketplace",
        title: item.title,
        image: item.cover_image || null,
        to: `/produto/${item.slug || item.id}`,
        priceOrDate: item.price_cents ? formatMoney(item.price_cents) : undefined,
        location: item.store_name || "Empresa Verificada",
      });
    });
  }
  if (allow("places")) {
    params.filteredPlaces.forEach((item) => {
      list.push({
        id: `place-${item.id}`,
        pillar: "places",
        badge: item.category || "Empresa",
        title: item.business_name,
        image: item.banner_url || item.avatar_url || null,
        to: `/diretorio/${item.id}`,
        priceOrDate: item.rating ? `${Number(item.rating).toFixed(1)}` : undefined,
        location: item.address || "Localidade da região",
        phone: item.contact_whatsapp || item.contact_phone,
      });
    });
  }
  if (allow("classificados")) {
    params.filteredClassifieds.forEach((item) => {
      list.push({
        id: `class-${item.id}`,
        pillar: "classifieds",
        badge: item.deal_type || item.category || "Classificado",
        title: item.title,
        image: item.images?.[0] || item.photos?.[0] || item.image_url || item.media?.[0] || item.cover_image || null,
        to: `/classificados/${item.id}`,
        priceOrDate: item.price_cents ? formatMoney(item.price_cents) : "Sob Consulta",
        location: item.location_name || item.location_text || "Na região",
        phone: item.contact_whatsapp || item.whatsapp,
      });
    });
  }
  if (allow("feed")) {
    params.filteredFeed.forEach((post) => {
      list.push({
        id: `feed-${post.id}`,
        pillar: "feed",
        badge: "Publicação",
        title: post.content_text ? post.content_text.slice(0, 90) : "Publicação da comunidade",
        image: post.media_urls?.[0] || null,
        to: `/publicacao/${post.id}`,
        priceOrDate: post.profiles?.full_name || "Membro local",
        location: post.location_name || "Na cidade",
      });
    });
  }
  if (allow("noticias")) {
    params.filteredNews.forEach((news) => {
      list.push({
        id: `news-${news.id}`,
        pillar: "noticias",
        badge: news.category || "Notícia",
        title: news.title,
        image: news.cover_image || null,
        to: `/noticias/${news.slug || news.id}`,
        priceOrDate: news.read_time_minutes ? `${news.read_time_minutes} min` : undefined,
        location: "Notícia local",
      });
    });
  }
  if (allow("empregos")) {
    params.filteredJobs.forEach((job) => {
      list.push({
        id: `job-${job.id}`,
        pillar: "empregos",
        badge: job.contract_type || "Vaga",
        title: job.title,
        image: job.cover_image_url || job.company_logo_url || null,
        to: `/empregos/${job.id}`,
        priceOrDate: job.salary_display || "A combinar",
        location: job.location || job.company_name || "Na região",
      });
    });
  }
  if (allow("eventos")) {
    params.filteredEvents.forEach((ev) => {
      list.push({
        id: `event-${ev.id}`,
        pillar: "eventos",
        badge: ev.category || "Evento",
        title: ev.title,
        image: ev.cover_image || ev.image_url || ev.banner_url || null,
        to: `/evento/${ev.id}`,
        priceOrDate: ev.date_display || (ev.is_free ? "Gratuito" : "Ingressos"),
        location: ev.location || "Na região",
      });
    });
  }
  if (allow("agenda")) {
    params.filteredEvents.forEach((ev) => {
      list.push({
        id: `agenda-${ev.id}`,
        pillar: "agenda",
        badge: "Agenda",
        title: ev.title,
        image: ev.cover_image || ev.image_url || ev.banner_url || null,
        to: "/agenda",
        priceOrDate: ev.date_display || "Programação confirmada",
        location: ev.location || "Na cidade",
      });
    });
  }
  if (allow("afiliados")) {
    list.push({
      id: "module-afiliados",
      pillar: "afiliados",
      badge: "Afiliados",
      title: "Programa de Afiliados Waesy",
      image: null,
      to: "/afiliados",
      priceOrDate: "Comissões & Tokens",
      location: "Indique empresas e receba recompensas",
    });
  }
  if (allow("concursos")) {
    params.filteredConcursos.forEach((conc) => {
      list.push({
        id: `conc-${conc.id}`,
        pillar: "concursos",
        badge: conc.storeName || "Concurso",
        title: conc.title,
        image: null,
        to: `/concursos?concursoId=${conc.id}`,
        priceOrDate: conc.status === "completed" ? "Apurado" : "Gratuito",
        location: "Comunidade Local",
      });
    });
  }
  return list;
}
