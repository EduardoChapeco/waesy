import { Link } from "@tanstack/react-router";
import { Star, MapPin, Clock, Store, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoreCardDTO } from "@/services/marketplace.functions";

export interface StoreCardProps extends StoreCardDTO {
  className?: string;
}

export function StoreCard({
  id,
  name,
  slug,
  avatar_url,
  banner_url,
  category = "Comércio",
  rating = 4.9,
  review_count = 128,
  distance_km = 1.2,
  is_open = true,
  delivery_time_min = "30-45",
  className,
}: StoreCardProps) {
  return (
    <Link
      to="/diretorio/$id"
      params={{ id }}
      className={cn(
        "group relative flex flex-col justify-between w-full rounded-lg bg-card border border-border/60 hover:border-primary/50 transition-colors duration-200 content-auto-card overflow-hidden select-none block shadow-2xs",
        className,
      )}
    >
      {/* ── Banner de Destaque Ampliado ─────────────────────── */}
      <div className="relative h-36 sm:h-44 w-full bg-linear-to-r from-muted to-muted/80 overflow-hidden">
        {banner_url ? (
          <img
            src={banner_url}
            alt={`Capa da loja ${name}`}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
          />
        ) : (
          <div className="size-full bg-linear-to-br from-primary/20 via-primary/5 to-muted flex items-center justify-center">
            <Store className="size-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
              is_open
                ? "bg-emerald-600/95 text-white"
                : "bg-black/60 text-white/80 border border-white/20"
            }`}
          >
            {is_open ? "● Aberto Agora" : "Fechado"}
          </span>
        </div>
      </div>

      {/* ── Store Info & Large Avatar ───────────────────────── */}
      <div className="p-5 pt-0 relative space-y-3">
        {/* Floating Avatar 64px - 72px */}
        <div className="size-16 sm:size-18 rounded-lg bg-background overflow-hidden -mt-8 sm:-mt-9 relative z-10 flex items-center justify-center border border-border/60">
          {avatar_url ? (
            <img src={avatar_url} alt={name} className="size-full object-cover" />
          ) : (
            <Store className="size-8 text-primary" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {name}
            </h3>
            <ShieldCheck className="size-4 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{category}</p>
        </div>

        {/* Badges de Distância, Avaliação e Tempo */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3">
          <div className="flex items-center gap-1 font-bold text-foreground">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-muted-foreground font-normal">({review_count})</span>
          </div>

          <div className="flex items-center gap-1">
            <MapPin className="size-3 text-muted-foreground" />
            <span>{distance_km.toFixed(1)} km</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            <Clock className="size-3 text-muted-foreground" />
            <span>{delivery_time_min}</span>
          </div>
        </div>

        {/* Botão Padronizado de Ação (Touch Target >= 44px) */}
        <div className="pt-2 border-t border-border/40">
          <div className="w-full h-11 min-h-11 rounded-lg font-bold text-xs bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center gap-2 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Ver Empresa</span>
            <ArrowRight className="size-4 shrink-0 group-hover:translate-x-1 transition-transform duration-200 motion-reduce:transition-none" />
          </div>
        </div>
      </div>
    </Link>
  );
}
