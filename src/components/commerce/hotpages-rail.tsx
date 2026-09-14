import React from "react";
import { Link } from "@tanstack/react-router";
import type { HotpageDTO } from "@/services/hotpage.functions";

export interface HotpagesRailProps {
  hotpages: HotpageDTO[];
  activeSlug?: string;
  className?: string;
  onSelect?: (slug: string) => void;
  basePath?: string;
  cleanMode?: boolean;
}

const CURATED_HOTPAGE_COVERS: Record<string, string> = {
  shows: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
  musica: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
  teatro: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
  cultura: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=800&q=80",
  artes: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=800&q=80",
  esportes: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
  torneios: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80",
  lazer: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
  networking: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
  negocios: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80",
  feiras: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
  gastronomia: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  turismo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
};

function getCuratedHotpageCover(slug?: string, title?: string, module?: string): string {
  const key = `${slug || ""} ${title || ""} ${module || ""}`.toLowerCase();
  for (const [k, url] of Object.entries(CURATED_HOTPAGE_COVERS)) {
    if (k !== "default" && key.includes(k)) return url;
  }
  return CURATED_HOTPAGE_COVERS.default;
}

export function HotpagesRail({
  hotpages,
  activeSlug,
  className = "",
  onSelect,
  basePath,
}: HotpagesRailProps) {
  if (!hotpages || hotpages.length === 0) return null;

  const resolveTarget = (hp: HotpageDTO): { to: string; params?: Record<string, any>; search?: Record<string, any> } => {
    if (basePath) {
      if (basePath === "/mercado") return { to: "/destaques/$slug", params: { slug: hp.slug } };
      return { to: "/destaques/$slug", params: { slug: hp.slug } };
    }

    switch (hp.module) {
      case "eventos":
      case "events":
        return { to: "/eventos", search: { categoria: hp.slug } };
      case "agenda":
        return { to: "/agenda", search: { categoria: hp.slug } };
      case "turismo":
        return { to: "/turismo", search: { categoria: hp.slug } };
      case "empregos":
        return { to: "/empregos", search: { categoria: hp.slug } };
      case "classificados":
        return { to: "/classificados", search: { categoria: hp.slug } };
      case "noticias":
        return { to: "/noticias", search: { categoria: hp.slug } };
      case "diretorio":
        return { to: "/diretorio", search: { categoria: hp.slug } };
      case "mercado":
      case "home":
      case "marketplace":
      default:
        return { to: "/destaques/$slug", params: { slug: hp.slug } };
    }
  };

  return (
    <section className={`w-full overflow-hidden ${className}`} aria-label="Experiências e Categorias em Destaque">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 scrollbar-hide">
        {hotpages.map((hp) => {
          const showTitle = hp.show_title !== false;
          const showBadge = hp.show_badge !== false && (!!hp.badge_label || !!hp.hero_stat_badge || !!hp.hero_secondary_badge);
          const showOverlay = hp.show_overlay !== false;
          const isActive = activeSlug === hp.slug;
          const customIcon = hp.custom_icon_url || hp.icon_url;
          const fallbackCover = getCuratedHotpageCover(hp.slug, hp.title, hp.module);
          const effectiveCover = hp.cover_image_url || fallbackCover;

          const cardContent = (
            <>
              <img
                src={effectiveCover}
                alt={hp.title}
                className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  if (e.currentTarget.src !== fallbackCover) {
                    e.currentTarget.src = fallbackCover;
                  }
                }}
              />

              {showOverlay && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity" />
              )}

              {(showTitle || showBadge || customIcon) && (
                <div className="relative z-10 p-3.5 space-y-1.5 text-left w-full">
                  {showBadge && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hp.badge_label && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-sans font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                          {hp.badge_label.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim()}
                        </span>
                      )}
                      {hp.hero_stat_badge && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-sans font-bold uppercase tracking-wider bg-primary text-primary-foreground border border-primary/30">
                          {hp.hero_stat_badge}
                        </span>
                      )}
                      {hp.hero_secondary_badge && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-sans font-bold uppercase tracking-wider bg-black/60 text-white/90 border border-white/10">
                          {hp.hero_secondary_badge}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {customIcon && (
                      <div className="size-6 shrink-0 flex items-center justify-center">
                        <img
                          src={customIcon}
                          alt="Icon"
                          className="size-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    {showTitle && hp.title && (
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow-sm line-clamp-2">
                        {hp.title}
                      </h3>
                    )}
                  </div>
                </div>
              )}
            </>
          );

          const baseClass = `group relative flex flex-col justify-end aspect-16/9 w-[260px] sm:w-[320px] shrink-0 rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 cursor-pointer shadow-xs ${
            isActive
              ? "border-foreground ring-2 ring-foreground/20 font-bold"
              : "border-border/40 hover:border-foreground/30"
          }`;

          if (onSelect) {
            return (
              <button
                key={hp.id}
                type="button"
                onClick={() => onSelect(hp.slug)}
                className={baseClass}
              >
                {cardContent}
              </button>
            );
          }

          const target = resolveTarget(hp);

          return (
            <Link
              key={hp.id}
              to={target.to as any}
              params={target.params as any}
              search={target.search as any}
              className={baseClass}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
