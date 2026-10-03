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
  Sparkle, 
  Scissors 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MasterSquircleHeroProps {
  className?: string;
}

const QUICK_PILLS = [
  { id: "delivery", label: "Restaurantes", icon: CookingPot, to: "/marketplace", params: { category: "gastronomia" } },
  { id: "mercado", label: "Mercados", icon: ShoppingCart, to: "/marketplace", params: { category: "mercado" } },
  { id: "bebidas", label: "Bebidas", icon: Wine, to: "/marketplace", params: { category: "bebidas" } },
  { id: "farmacia", label: "Farmácia", icon: FirstAid, to: "/diretorio", params: { category: "farmacia" } },
  { id: "pet", label: "Pet Shop", icon: Dog, to: "/marketplace", params: { category: "pet" } },
  { id: "ofertas", label: "Ofertas", icon: Tag, to: "/classificados", params: {} },
  { id: "beleza", label: "Beleza", icon: Scissors, to: "/diretorio", params: { category: "beleza" } },
  { id: "destaques", label: "Destaques", icon: Sparkle, to: "/places", params: {} },
];

export function MasterSquircleHero({ className }: MasterSquircleHeroProps) {
  return (
    <section aria-label="Destaques Principais" className={cn("w-full space-y-3", className)}>
      {/* ── 1. Hero Squircle Master Banners (2 Cards Principais) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Gastronomia & Delivery */}
        <Link
          to="/marketplace"
          search={{ category: "gastronomia" } as never}
          className="group relative flex flex-col justify-between overflow-hidden squircle-media border border-border/70 bg-card p-5 sm:p-6 transition-all duration-300 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-40 sm:min-h-48"
        >
          <div className="relative z-10 max-w-xs space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <CookingPot className="size-3.5" />
              <span>Delivery & Gastronomia</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors">
              Peça dos Melhores Restaurantes
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              Lanches, pizzas, pratos executivos e bebidas com entrega rápida na sua região.
            </p>
          </div>

          <div className="relative z-10 pt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              <span>Ver opções</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="text-xs text-muted-foreground font-mono">Pronta-entrega</span>
          </div>

          {/* Efeito sutil de brilho sem gradiente decorativo de alta saturação */}
          <div className="absolute right-0 bottom-0 size-32 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
        </Link>

        {/* Card 2: Mercado & Essenciais */}
        <Link
          to="/marketplace"
          search={{ category: "mercado" } as never}
          className="group relative flex flex-col justify-between overflow-hidden squircle-media border border-border/70 bg-card p-5 sm:p-6 transition-all duration-300 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-40 sm:min-h-48"
        >
          <div className="relative z-10 max-w-xs space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShoppingCart className="size-3.5" />
              <span>Mercado & Essenciais</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors">
              Compras para o Seu Dia a Dia
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              Supermercados, hortifrúti, bebidas, higiene e padarias locais com entrega agendada.
            </p>
          </div>

          <div className="relative z-10 pt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              <span>Buscar lojas</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="text-xs text-muted-foreground font-mono">Comércio local</span>
          </div>

          {/* Efeito sutil de brilho sem gradiente decorativo de alta saturação */}
          <div className="absolute right-0 bottom-0 size-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        </Link>
      </div>

      {/* ── 2. Carrossel de Pills Squircle (Acesso Rápido) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full px-0.5 focus:outline-none">
        {QUICK_PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <Link
              key={pill.id}
              to={pill.to as never}
              search={pill.params as never}
              className="h-11 px-3.5 squircle-soft border border-border/70 bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-bold shrink-0 flex items-center gap-2 transition-all select-none active:scale-95 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
