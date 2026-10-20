import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HotpageDTO } from "@/services/hotpage.functions";

export interface HotpagesRailProps {
  hotpages: HotpageDTO[];
  activeSlug?: string;
  className?: string;
  onSelect?: (slug: string) => void;
  basePath?: string;
  cleanMode?: boolean;
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
          const isActive = activeSlug === hp.slug;
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
                <HotpageCardContent hp={hp} cleanMode={cleanMode} />
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
              <HotpageCardContent hp={hp} cleanMode={cleanMode} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

interface HotpageCardContentProps {
  hp: HotpageDTO;
  cleanMode: boolean;
}

function HotpageCardContent({ hp, cleanMode }: HotpageCardContentProps) {
  const [imageError, setImageError] = useState(false);
  const showTitle = !cleanMode && hp.show_title === true && Boolean(hp.title);
  const hasCover = Boolean(hp.cover_image_url && hp.cover_image_url !== "/brand-logo.png" && !imageError);

  return (
    <>
      <div className="relative aspect-banner-cinema w-full overflow-hidden rounded-lg bg-card border border-border/50">
        {hasCover ? (
          <img
            src={hp.cover_image_url!}
            alt={hp.title || "Destaque"}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Honest Typographic Editorial Layout (Anti-Fake B.8/B.33) */
          <div className="size-full flex flex-col justify-between p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs font-medium px-2 py-1 rounded-full uppercase tracking-wider">
                {hp.module || "Destaque"}
              </Badge>
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <span className="text-sm sm:text-base font-bold text-foreground leading-tight break-words text-wrap">
              {hp.title || "Explorar"}
            </span>
          </div>
        )}
      </div>

      {showTitle && (
        <span className="mt-1 px-1 text-xs font-semibold text-foreground line-clamp-1 text-left w-full">
          {hp.title}
        </span>
      )}
    </>
  );
}
