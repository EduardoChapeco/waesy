import { Tag } from "lucide-react";
import React from "react";
import { Link } from "@tanstack/react-router";
import { ForkKnife, Storefront, Flame, Heartbeat, TShirt, Coffee, Scissors, CalendarDots, AirplaneTilt, Briefcase, CarProfile, House, Compass } from "@phosphor-icons/react";
import type { HotpageDTO } from "@/services/hotpage.functions";
import { DynamicMediaChip } from "@/components/commerce/dynamic-media-chip";

interface MasterHeroCardsProps {
 heroCards?: HotpageDTO[];
 categoryChips?: HotpageDTO[];
 customCategories?: Array<{
 slug?: string;
 label: string;
 to: string;
 icon_url?: string;
 }>;
 hotpages?: HotpageDTO[];
}

// ── 1. Módulos Principais Canônicos do Topo (16:9 Limpos - Estilo iFood) ──
const DEFAULT_HERO_MODULES = [
 {
 slug: "classificados",
 to: "/classificados",
 title: "Classificados & Autos",
 defaultCover: "",
 },
 {
 slug: "mercado",
 to: "/mercado",
 title: "Supermercado & Feira",
 defaultCover: "",
 },
 {
 slug: "gastronomia",
 to: "/gastronomia",
 title: "Gastronomia & Delivery",
 defaultCover: "",
 },
 {
 slug: "empregos",
 to: "/empregos",
 title: "Empregos",
 defaultCover: "",
 },
 {
 slug: "eventos",
 to: "/eventos",
 title: "Eventos",
 defaultCover: "",
 },
 {
 slug: "agenda",
 to: "/agenda",
 title: "Agenda",
 defaultCover: "",
 },
 {
 slug: "turismo",
 to: "/turismo",
 title: "Turismo & Hospedagem",
 defaultCover: "",
 },
 {
 slug: "noticias",
 to: "/noticias",
 title: "Notícias",
 defaultCover: "",
 },
];

// ── 2. Supercategorias de Continuação (Chips que NÃO repetem os módulos do topo) ──
const DEFAULT_CONTINUATION_CHIPS = [
 { slug: "farmacia", to: "/farmacia", label: "Farmácia", emoji: "💊", icon: Heartbeat },
 { slug: "bebidas", to: "/bebidas", label: "Bebidas", emoji: "🍷", icon: Coffee },
 { slug: "acougue", to: "/acougue", label: "Açougue", emoji: "🥩", icon: Flame },
 { slug: "eletronicos", to: "/eletronicos", label: "Eletrônicos", emoji: "📱", icon: Storefront },
 { slug: "moda", to: "/moda", label: "Moda", emoji: "👗", icon: TShirt },
 { slug: "casa", to: "/casa", label: "Casa", emoji: "🛋️", icon: Storefront },
 { slug: "pet", to: "/pet", label: "Pet Shop", emoji: "🐾", icon: Heartbeat },
 { slug: "beleza", to: "/beleza", label: "Beleza", emoji: "✂️", icon: Scissors },
 { slug: "construcao", to: "/construcao", label: "Construção", emoji: "🧱", icon: Storefront },
 { slug: "servicos", to: "/servicos", label: "Serviços", emoji: "🛠️", icon: Briefcase },
 { slug: "imoveis", to: "/imoveis", label: "Imóveis", emoji: "🏡", icon: House },
 { slug: "doacoes", to: "/doacoes", label: "Doações", emoji: "❤️", icon: Heartbeat },
 { slug: "diretorio", to: "/diretorio", label: "Diretório", emoji: "🧭", icon: Compass },
];

export function MasterHeroCards({
 heroCards,
 categoryChips,
 customCategories,
 hotpages = [],
}: MasterHeroCardsProps) {
 // ── 1. Resolução Dinâmica dos Cards Herói do Topo (100% LIMPOS) ──
 const activeHeroCards = React.useMemo(() => {
 // Se foram passados heroCards explícitos do loader
 const sourceCards =
 heroCards && heroCards.length > 0
 ? heroCards
 : hotpages.filter(
 (h) =>
 h.template_type === "hero_module" ||
 (h.module === "home" &&
 h.template_type !== "category_hub" &&
 h.template_type !== "editorial_card")
 );

 if (sourceCards.length > 0) {
 return sourceCards
 .map((hp) => {
 const cleanSlug = hp.slug.replace(/^home-/, "");
 const defaultMatch = DEFAULT_HERO_MODULES.find(
 (d) => d.slug === hp.slug || d.slug === cleanSlug || hp.slug.includes(d.slug)
 );

 return {
 id: hp.id,
 slug: hp.slug,
 to: (hp.target_route && hp.target_route !== "null" && hp.target_route.startsWith("/")) ? hp.target_route : (defaultMatch?.to || `/${cleanSlug}`),
 title: hp.title,
 coverUrl:
 hp.cover_image_url ||
 hp.bg_media_url ||
 defaultMatch?.defaultCover ||
 "",
 iconUrl: hp.custom_icon_url || hp.icon_url || undefined,
 badgeLabel: hp.badge_label || undefined,
 heroStatBadge: hp.hero_stat_badge || undefined,
 heroSecondaryBadge: hp.hero_secondary_badge || undefined,
 // Por padrão, os cards do topo são 100% limpos de texto/badges
 showTitle: hp.show_title === true,
 showBadge: hp.show_badge === true,
 showOverlay: hp.show_overlay === true,
 isVideo: hp.bg_media_type === "video" && Boolean(hp.bg_media_url),
 videoUrl: hp.bg_media_url,
 sort_order: hp.sort_order ?? 0,
 };
 })
 .sort((a, b) => a.sort_order - b.sort_order);
 }

 // Fallback padrão canônico se não houver dados no banco
 return DEFAULT_HERO_MODULES.map((card, idx) => ({
 id: `default-${card.slug}`,
 slug: card.slug,
 to: card.to,
 title: card.title,
 coverUrl: card.defaultCover,
 iconUrl: undefined,
 badgeLabel: undefined,
 heroStatBadge: undefined,
 heroSecondaryBadge: undefined,
 showTitle: false,
 showBadge: false,
 showOverlay: false,
 isVideo: false,
 videoUrl: undefined,
 sort_order: idx,
 }));
 }, [heroCards, hotpages]);

 // ── 2. Resolução Dinâmica dos Botões / Chips de Supercategorias (Continuação) ──
 const activeChipButtons = React.useMemo(() => {
 const sourceChips =
 categoryChips && categoryChips.length > 0
 ? categoryChips
 : hotpages.filter((h) => h.template_type === "category_hub");

 if (sourceChips.length > 0) {
 return sourceChips
 .map((hp) => {
 const cleanSlug = hp.slug.replace(/^chip-/, "");
 const defaultMatch = DEFAULT_CONTINUATION_CHIPS.find(
 (d) => d.slug === hp.slug || d.slug === cleanSlug || hp.slug.includes(d.slug)
 );

 return {
 id: hp.id,
 slug: hp.slug,
 label: hp.title,
 to: (hp.target_route && hp.target_route !== "null" && hp.target_route.startsWith("/")) ? hp.target_route : (defaultMatch?.to || `/${cleanSlug}`),
 icon: defaultMatch?.icon || Compass,
 icon_url: hp.custom_icon_url || hp.icon_url || undefined,
 emoji: (hp as any).emoji || defaultMatch?.emoji || undefined,
 badge: hp.badge_label || undefined,
 bg_media_type: hp.bg_media_type || "none",
 bg_media_url: hp.bg_media_url || undefined,
 bg_color: hp.bg_color || undefined,
 bg_overlay_opacity: hp.bg_overlay_opacity ?? 35,
 bg_texture: hp.bg_texture || "none",
 sort_order: hp.sort_order ?? 0,
 };
 })
 .sort((a, b) => a.sort_order - b.sort_order);
 }

 // Fallback padrão se banco não tiver chips cadastrados
 return DEFAULT_CONTINUATION_CHIPS.map((item, idx) => {
 const customMatch = customCategories?.find((c) => c.slug === item.slug);
 return {
 id: `default-chip-${item.slug}`,
 slug: item.slug,
 label: item.label,
 to: item.to,
 icon: item.icon,
 icon_url: customMatch?.icon_url,
 emoji: item.emoji,
 badge: undefined,
 bg_media_type: "none" as const,
 bg_media_url: undefined,
 bg_color: undefined,
 bg_overlay_opacity: 35,
 bg_texture: "none" as const,
 sort_order: idx,
 };
 });
 }, [categoryChips, hotpages, customCategories]);

  const hasValidHeroCards = activeHeroCards.some((c) => Boolean(c.coverUrl || (c.isVideo && c.videoUrl)));

  return (
    <div className="w-full space-y-4">
      {/* ── 1. Carrossel Horizontal de Cards de Destaque (Apenas se houver capas cadastradas) ── */}
      {hasValidHeroCards && (
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory focus:outline-none"
          tabIndex={0}
          aria-label="Destaques Principais"
        >
          {activeHeroCards
            .filter((c) => Boolean(c.coverUrl || (c.isVideo && c.videoUrl)))
            .map((card) => {
              const hasBadges =
                card.showBadge &&
                (card.badgeLabel || card.heroStatBadge || card.heroSecondaryBadge);

 return (
 <Link
 key={card.id || card.slug}
 to={card.to as any}
 className="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-card shrink-0 snap-start w-[320px] sm:w-[420px] md:w-[500px] lg:w-[540px] h-[190px] sm:h-[240px] md:h-[280px] lg:h-[300px] transition-all duration-300 active:scale-[0.99] select-none block border border-border/60 hover:border-primary/60 shadow-md hover:shadow-xl"
 >
 {card.isVideo && card.videoUrl ? (
 <video
 src={card.videoUrl}
 autoPlay
 loop
 muted
 playsInline
 className="absolute inset-0 size-full object-cover group-hover:scale-103 transition-transform duration-500"
 />
 ) : card.coverUrl ? (
 <img
 src={card.coverUrl}
 alt={card.title}
 className="absolute inset-0 size-full object-cover group-hover:scale-103 transition-transform duration-500"
 loading="eager"
 />
 ) : (
 <div className="absolute inset-0 size-full bg-gradient-to-br from-primary/15 via-muted/50 to-muted flex items-center justify-center">
 <Compass size={36} className="text-primary/30" />
 </div>
 )}

 {/* Degradê de Contraste Escuro (Apenas se explicitamente habilitado) */}
 {card.showOverlay && (
 <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity" />
 )}

 {/* Badges Flutuantes (Apenas se explicitamente habilitado) */}
 {hasBadges && (
 <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
 <div className="flex items-center gap-1 flex-wrap">
 {card.badgeLabel && (
 <span className="inline-block px-1.5 py-0.2 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-white/30 backdrop-blur-md text-white border border-white/20 shadow-xs">
 {card.badgeLabel}
 </span>
 )}
 </div>
 </div>
 )}

                    {/* Título e Ícone (Apenas se explicitamente habilitado) */}
                    {card.showTitle && card.title && (
                      <div className="relative z-10 p-2 text-left w-full bg-linear-to-t from-black/80 via-black/20 to-transparent">
                        <h3 className="text-[11px] sm:text-xs font-bold text-white leading-tight drop-shadow-sm truncate">
                          {card.title}
                        </h3>
                      </div>
                    )}
                  </Link>
                );
              })}
          </div>
        )}

        {/* ── 2. Botões / Chips de Supercategorias (Continuação - Ícones PNG Transparentes / Emojis / Rotas) ── */}
        <div
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 w-full px-0.5 focus:outline-none"
          tabIndex={0}
          aria-label="Supercategorias Rápidas"
        >
 {activeChipButtons.map((item) => (
 <DynamicMediaChip
 key={item.id || item.slug}
 slug={item.slug}
 label={item.label}
 to={item.to}
 icon={item.icon}
 icon_url={item.icon_url}
 emoji={item.emoji}
 badge={item.badge}
 bg_media_type={item.bg_media_type}
 bg_media_url={item.bg_media_url}
 bg_color={item.bg_color}
 bg_overlay_opacity={item.bg_overlay_opacity}
 bg_texture={item.bg_texture}
 size="md"
 />
 ))}
 </div>
 </div>
 );
}
