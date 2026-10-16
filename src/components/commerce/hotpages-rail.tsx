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
  shows: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
  musica: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  teatro: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80",
  cultura: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80",
  artes: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  esportes: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
  torneios: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
  lazer: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  networking: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
  negocios: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  feiras: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
  gastronomia: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  turismo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
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
  cleanMode = true,
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
    <section className={`w-full ${className}`} aria-label="Experiências e Categorias em Destaque">
      <div className="-mx-2 px-2 sm:mx-0 sm:px-0 flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
        {hotpages.map((hp) => {
          const showTitle = !cleanMode && hp.show_title === true && Boolean(hp.title);
          const isActive = activeSlug === hp.slug;
          const fallbackCover = getCuratedHotpageCover(hp.slug, hp.title, hp.module);
          const effectiveCover =
            hp.cover_image_url && hp.cover_image_url !== "/brand-logo.png"
              ? hp.cover_image_url
              : fallbackCover;

          const cardContent = (
            <>
              <div className="relative aspect-banner-cinema w-full overflow-hidden rounded-lg bg-muted/40">
                <img
                  src={effectiveCover}
                  alt={hp.title || "Destaque"}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.src !== fallbackCover) {
                      e.currentTarget.src = fallbackCover;
                    }
                  }}
                />
              </div>

              {showTitle && (
                <span className="mt-1 px-1 text-xs font-semibold text-foreground line-clamp-1 text-left w-full">
                  {hp.title}
                </span>
              )}
            </>
          );

          const baseClass = `snap-start group relative flex flex-col w-60 sm:w-76 shrink-0 rounded-lg transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isActive ? "ring-2 ring-primary font-bold" : ""
          }`;

          if (onSelect) {
            return (
              <button
                key={hp.id}
                type="button"
                onClick={() => onSelect(hp.slug)}
                className={baseClass}
                aria-label={hp.title || "Categoria"}
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
              aria-label={hp.title || "Categoria"}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
