import React from "react";
import { Link } from "@tanstack/react-router";
import { 
  ArrowRight, 
  CookingPot, 
  ShoppingCart, 
  Wine, 
  FirstAid, 
  Dog, 
  Tag, 
  BookmarkSimple, 
  Scissors,
  Car,
  Briefcase
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { HotpageDTO } from "@/services/hotpage.functions";

interface MasterSquircleHeroProps {
  className?: string;
  cards?: HotpageDTO[];
}

const ICON_MAP: Record<string, any> = {
  ShoppingCart,
  CookingPot,
  Car,
  Briefcase,
  Wine,
  FirstAid,
  Dog,
  Tag,
  BookmarkSimple,
  Scissors,
};

const DEFAULT_HERO_CARDS = [
  {
    id: "hero-mercado",
    slug: "mercado",
    title: "Compras do Dia a Dia",
    description: "Supermercados, hortifrúti, padarias e mantimentos com entrega local.",
    badge_label: "Mercado",
    icon_name: "ShoppingCart",
    target_route: "/mercado",
    accent_class: "bg-primary/10 text-primary border-primary/20",
    bg_gradient: "bg-primary/5 group-hover:bg-primary/10",
    action_label: "Comprar",
    tag_label: "Essenciais",
  },
  {
    id: "hero-restaurantes",
    slug: "restaurantes",
    title: "Delivery & Pratos",
    description: "Pizzas, pratos executivos, lanches rápidos e gastronomia regional.",
    badge_label: "Restaurantes",
    icon_name: "CookingPot",
    target_route: "/gastronomia",
    accent_class: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    bg_gradient: "bg-rose-500/5 group-hover:bg-rose-500/10",
    action_label: "Pedir agora",
    tag_label: "Pronta-entrega",
  },
  {
    id: "hero-mobilidade",
    slug: "mobilidade",
    title: "Corridas & MotoLink",
    description: "Deslocamento urbano, transportes locais e entregas expressas seguras.",
    badge_label: "Mobilidade",
    icon_name: "Car",
    target_route: "/mobilidade",
    accent_class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    bg_gradient: "bg-amber-500/5 group-hover:bg-amber-500/10",
    action_label: "Solicitar",
    tag_label: "Urbano",
  },
  {
    id: "hero-servicos",
    slug: "servicos",
    title: "Especialistas Locais",
    description: "Assistência técnica, reparos, estética, saúde e consultoria.",
    badge_label: "Serviços",
    icon_name: "Briefcase",
    target_route: "/servicos",
    accent_class: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    bg_gradient: "bg-sky-500/5 group-hover:bg-sky-500/10",
    action_label: "Contratar",
    tag_label: "Profissionais",
  },
];

const QUICK_PILLS = [
  { id: "delivery", label: "Restaurantes", icon: CookingPot, to: "/marketplace", params: { category: "gastronomia" } },
  { id: "mercado", label: "Mercados", icon: ShoppingCart, to: "/marketplace", params: { category: "mercado" } },
  { id: "bebidas", label: "Bebidas", icon: Wine, to: "/marketplace", params: { category: "bebidas" } },
  { id: "farmacia", label: "Farmácia", icon: FirstAid, to: "/diretorio", params: { category: "farmacia" } },
  { id: "pet", label: "Pet Shop", icon: Dog, to: "/marketplace", params: { category: "pet" } },
  { id: "ofertas", label: "Ofertas", icon: Tag, to: "/classificados", params: {} },
  { id: "beleza", label: "Beleza", icon: Scissors, to: "/diretorio", params: { category: "beleza" } },
  { id: "destaques", label: "Destaques", icon: BookmarkSimple, to: "/places", params: {} },
];

export function MasterSquircleHero({ className, cards }: MasterSquircleHeroProps) {
  // Mescla cards customizados do CMS (hotpages template_type: 'hero_squircle') com defaults
  const displayCards = React.useMemo(() => {
    return DEFAULT_HERO_CARDS.map((def, idx) => {
      const custom = cards?.find(
        (c) => c.slug === def.slug || c.sort_order === idx || c.id === def.id
      );
      if (!custom) return def;

      return {
        ...def,
        title: custom.title || def.title,
        description: custom.description || def.description,
        badge_label: custom.badge_label || def.badge_label,
        icon_name: custom.icon_name || def.icon_name,
        target_route: custom.target_route || def.target_route,
        cover_image_url: custom.cover_image_url || null,
        bg_color: custom.bg_color || null,
        text_color: custom.text_color || null,
        is_active: custom.is_active !== false,
      };
    }).filter((c) => (c as any).is_active !== false);
  }, [cards]);

  return (
    <section aria-label="Destaques Principais" className={cn("w-full space-y-3", className)}>
      {/* ── 1. Hero Squircle Master Banners (4 Cards Principais com Suporte CMS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {displayCards.map((card) => {
          const Icon = ICON_MAP[card.icon_name] || BookmarkSimple;
          const cover = (card as any).cover_image_url;

          return (
            <Link
              key={card.id}
              to={card.target_route as any}
              className="group relative flex flex-col justify-between overflow-hidden squircle-media border border-border/70 bg-card p-5 transition-colors duration-200 motion-reduce:transition-none hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-40"
              style={(card as any).bg_color ? { backgroundColor: (card as any).bg_color } : undefined}
            >
              {cover && (
                <img
                  src={cover}
                  alt={card.title}
                  className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none opacity-25"
                  loading="lazy"
                />
              )}

              <div className="relative z-10 space-y-2">
                <span className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  card.accent_class
                )}>
                  <Icon className="size-4" />
                  <span>{card.badge_label}</span>
                </span>
                <h2 
                  className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors"
                  style={(card as any).text_color ? { color: (card as any).text_color } : undefined}
                >
                  {card.title}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {card.description}
                </p>
              </div>

              <div className="relative z-10 pt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  <span>{card.action_label}</span>
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-2xs text-muted-foreground font-mono">{card.tag_label}</span>
              </div>
              <div className={cn("absolute right-0 bottom-0 size-28 rounded-full blur-2xl pointer-events-none transition-colors", card.bg_gradient)} />
            </Link>
          );
        })}
      </div>

      {/* ── 2. Carrossel de Pills Squircle (Acesso Rápido) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full px-1 focus:outline-none carousel">
        {QUICK_PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <Link
              key={pill.id}
              to={pill.to as never}
              search={pill.params as never}
              className="h-11 px-4 squircle-soft border border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-bold shrink-0 flex items-center gap-2 transition-colors select-none motion-reduce:transition-none active:scale-95 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Icon className="size-4 shrink-0 text-foreground" />
              <span className="whitespace-nowrap">{pill.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
