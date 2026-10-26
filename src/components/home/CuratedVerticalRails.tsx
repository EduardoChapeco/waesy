import React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CuratedVerticalItem {
  id: string;
  title: string;
  badge?: string;
  imageUrl?: string | null;
  targetUrl: string;
  colorClass?: string;
}

export interface CuratedVerticalRailsProps {
  title?: string;
  subtitle?: string;
  items?: CuratedVerticalItem[];
  className?: string;
}

const DEFAULT_CURATED_ITEMS: CuratedVerticalItem[] = [
  {
    id: "gourmet",
    title: "Gourmet & Alta Gastronomia",
    badge: "SELEÇÃO",
    targetUrl: "/gastronomia",
    colorClass: "bg-red-500/5 border-red-500/20",
  },
  {
    id: "clubes",
    title: "Clubes de Vantagens",
    badge: "EXCLUSIVO",
    targetUrl: "/ofertas",
    colorClass: "bg-purple-500/5 border-purple-500/20",
  },
  {
    id: "mercados",
    title: "Supermercados Express",
    badge: "15 MIN",
    targetUrl: "/mercado",
    colorClass: "bg-emerald-500/5 border-emerald-500/20",
  },
  {
    id: "viagens",
    title: "Turismo & Roteiros da Região",
    badge: "PASSEIOS",
    targetUrl: "/turismo",
    colorClass: "bg-blue-500/5 border-blue-500/20",
  },
];

export function CuratedVerticalRails({
  title = "Destaques Curados da Cidade",
  subtitle = "Experiências e serviços recomendados para você",
  items = DEFAULT_CURATED_ITEMS,
  className,
}: CuratedVerticalRailsProps) {
  const displayItems = items && items.length > 0 ? items : DEFAULT_CURATED_ITEMS;

  return (
    <div className={cn("w-full space-y-2 my-2", className)}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {displayItems.map((it) => (
          <Link
            key={it.id}
            to={it.targetUrl as any}
            className={cn(
              "p-3 rounded-2xl border bg-card hover:bg-muted/30 active:scale-[0.98] transition-transform duration-200 flex flex-col justify-between gap-3 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-24",
              it.colorClass || "border-border/70"
            )}
          >
            <div>
              {it.badge && (
                <span className="text-xs font-extrabold px-2 py-1 rounded-md bg-background/80 text-foreground border border-border/40 inline-block mb-1">
                  {it.badge}
                </span>
              )}
              <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                {it.title}
              </h4>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs font-semibold text-muted-foreground">
              <span>Explorar</span>
              <ChevronRight className="size-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
