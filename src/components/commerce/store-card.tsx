import { Link } from "@tanstack/react-router";
import { Star, MapPin, Clock, Store, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreCardDTO } from "@/services/marketplace.functions";
import { formatStoreCategory } from "@/lib/niches/niche-manifest";

export interface StoreCardProps extends StoreCardDTO {
  className?: string;
}

export function StoreCard({
  id,
  name,
  slug,
  avatar_url,
  banner_url,
  category = "Comércio Local",
  is_verified = false,
  rating,
  review_count,
  distance_km,
  is_open = true,
  delivery_time_min,
  className,
}: StoreCardProps) {
  const displayCategory = formatStoreCategory(category);
  const hasRating =
    typeof rating === "number" &&
    rating > 0 &&
    typeof review_count === "number" &&
    review_count > 0;
  const hasDistance = typeof distance_km === "number" && distance_km > 0;
  const hasDelivery = typeof delivery_time_min === "string" && delivery_time_min.trim().length > 0;

  return (
    <Link
      to="/diretorio/$id"
      params={{ id }}
      className={cn(
        "group relative flex flex-col justify-between w-full rounded-lg bg-card border border-border hover:border-foreground/40 transition-colors duration-200 content-auto-card overflow-hidden select-none block",
        className,
      )}
    >
      {/* ── Banner de Destaque Superior ─────────────────────── */}
      <div className="relative h-36 w-full bg-muted overflow-hidden shrink-0">
        {banner_url ? (
          <img
            src={banner_url}
            alt={`Capa da empresa ${name}`}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div className="size-full bg-muted flex items-center justify-center">
            <Store className="size-10 text-muted-foreground" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider border border-border ${
              is_open
                ? "bg-card text-success"
                : "bg-card text-muted-foreground"
            }`}
          >
            {is_open ? "Aberto" : "Fechado"}
          </span>
        </div>
      </div>

      {/* ── Informações da Empresa & Avatar ─────────────────── */}
      <div className="p-4 pt-0 relative flex-1 flex flex-col justify-between space-y-2">
        {/* Floating Avatar */}
        <div className="size-16 rounded-lg bg-background overflow-hidden -mt-8 relative z-10 flex items-center justify-center border border-border shrink-0">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={name}
              className="size-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Store className="size-8 text-primary" />
          )}
        </div>

        {/* Título & Categoria com Altura Padronizada */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 h-12">
            <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug break-words text-wrap flex items-center">
              <span>{name}</span>
            </h3>
            {is_verified && (
              <ShieldCheck className="size-4 text-primary fill-primary/20 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{displayCategory}</p>
        </div>

        {/* Métricas Autênticas (Zero Fakes — Invariante B.33) */}
        <div className="h-6 flex items-center justify-between text-xs text-muted-foreground pt-1">
          {hasRating ? (
            <div className="flex items-center gap-1 font-bold text-foreground">
              <Star className="size-3.5 fill-warning text-warning-strong" />
              <span>{rating!.toFixed(1)}</span>
              <span className="text-muted-foreground font-normal">({review_count})</span>
            </div>
          ) : is_verified ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
              <ShieldCheck className="size-3.5" />
              <span>Verificada</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs font-mono">
              Comércio Local
            </span>
          )}

          <div className="flex items-center gap-2">
            {hasDistance && (
              <div className="flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                <span>{distance_km!.toFixed(1)} km</span>
              </div>
            )}

            {hasDelivery && (
              <div className="flex items-center gap-1 font-mono text-xs">
                <Clock className="size-3 text-muted-foreground" />
                <span>{delivery_time_min}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão Canônico de Ação (Piso 44px — Invariante B.22) */}
        <div className="pt-2 border-t border-border mt-auto shrink-0">
          <div className="w-full h-11 min-h-11 rounded-lg font-bold text-xs bg-muted border border-border group-hover:bg-primary group-hover:text-primary-foreground text-foreground flex items-center justify-center gap-2 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Ver Empresa</span>
            <ArrowRight className="size-4 shrink-0 group-hover:translate-x-1 transition-transform duration-200 motion-reduce:transition-none" />
          </div>
        </div>
      </div>
    </Link>
  );
}
