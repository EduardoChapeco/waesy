import { Tag, Rss } from "lucide-react";
import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { DEFAULT_BRAND_NAME } from "@/lib/brand";
import { LocationMasterPill } from "@/components/location/location-master-pill";
import { UtilityCluster } from "@/components/shell/utility-cluster";
import { 
  House, 
  Newspaper, 
  Flame, 
  Storefront, 
  Compass, 
  Scissors, 
  AirplaneTilt, 
  Briefcase, 
  CalendarDots, 
  Gift, 
  Target, 
  MapPin, 
  ForkKnife,
  Ticket,
  MagnifyingGlass 
} from "@phosphor-icons/react";

import { BetaExplanationModal } from "@/components/shell/beta-explanation-modal";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";

export interface MobileQuickChip {
  to: string;
  label: string;
  icon: React.ElementType;
  isPlacesBadge?: boolean;
}

export const MOBILE_QUICK_CHIPS: MobileQuickChip[] = [
  { to: "/", label: "Início", icon: House },
  { to: "/diretorio", label: "Places", isPlacesBadge: true, icon: Compass },
  { to: "/classificados", label: "Classificados", icon: Tag },
  { to: "/feed", label: "Feed", icon: Rss },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/empregos", label: "Empregos", icon: Briefcase },
  { to: "/eventos", label: "Eventos", icon: Ticket },
  { to: "/agenda", label: "Agenda", icon: CalendarDots },
  { to: "/afiliados", label: "Afiliados", icon: Target },
  { to: "/concursos", label: "Sorteios", icon: Gift },
];

export interface TopBarProps {
  session?: any;
  brandSettings?: {
    logo_url?: string | null;
    favicon_url?: string | null;
    show_logo?: boolean;
    show_name?: boolean;
    platform_name?: string;
  } | null;
}

export function TopBar({ session, brandSettings }: TopBarProps) {
  const location = useLocation();
  const [betaModalOpen, setBetaModalOpen] = React.useState(false);
  const isDetailPage =
    (location.pathname.startsWith("/agendar/") && location.pathname !== "/agendar") ||
    (location.pathname.startsWith("/classificados/") && !location.pathname.includes("/novo")) ||
    location.pathname.startsWith("/produto/") ||
    location.pathname.startsWith("/evento/") ||
    (location.pathname.startsWith("/hospedagem/") && location.pathname !== "/hospedagem") ||
    (location.pathname.startsWith("/turismo/") && location.pathname !== "/turismo");

  const isUtilityOrCleanPage =
    location.pathname.startsWith("/carrinho") ||
    location.pathname.startsWith("/checkout") ||
    location.pathname.startsWith("/conta") ||
    location.pathname.startsWith("/buscar") ||
    location.pathname.startsWith("/feed") ||
    location.pathname.startsWith("/notificacoes") ||
    location.pathname.startsWith("/membro");

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-md select-none border-b border-border/40">
      {/* ── Camada 1: Topo Principal Compacto ── */}
      <div className="px-3 sm:px-5 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4 min-h-[48px] w-full">
        {/* Lado Esquerdo: Logo + Localização */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
          >
            {brandSettings?.show_logo !== false && brandSettings?.logo_url ? (
              <img
                src={brandSettings.logo_url}
                alt={brandSettings.platform_name && !["Waesy", "Waesy", "waesy"].includes(brandSettings.platform_name) ? brandSettings.platform_name : DEFAULT_BRAND_NAME}
                className="h-7 max-w-[100px] object-contain"
              />
            ) : null}
            {(brandSettings?.show_name !== false || !brandSettings?.logo_url) && (
              <span className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground leading-none">
                {brandSettings?.platform_name && !["Waesy", "Waesy", "waesy"].includes(brandSettings.platform_name) ? brandSettings.platform_name : DEFAULT_BRAND_NAME}
              </span>
            )}
          </Link>

          {/* Badge BETA com Modal */}
          <button
            type="button"
            onClick={() => setBetaModalOpen(true)}
            title="Plataforma em Versão Beta — Clique para saber mais"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold tracking-wider uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 transition-all cursor-pointer select-none active:scale-95 shrink-0"
          >
            BETA
          </button>

          {/* Location Pill — compacto no mobile */}
          <LocationMasterPill className="max-w-[80px] sm:max-w-[170px]" />
        </div>

        {/* Centro (Desktop): Busca Global Inteligente */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-4">
          <Link
            to="/buscar"
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all group border border-border/40 hover:border-border"
          >
            <div className="flex items-center gap-2.5">
              <MagnifyingGlass
                size={16}
                className="text-muted-foreground group-hover:text-foreground transition-colors"
              />
              <span>Buscar classificados, vagas, eventos, empresas e publicações...</span>
            </div>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground bg-background rounded-md border border-border/40">
              ⌘K
            </kbd>
          </Link>
        </div>

        {/* Lado Direito: UtilityCluster */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <UtilityCluster session={session} embedded={true} />
        </div>
      </div>

      {/* ── Camada 2: Chips de Navegação Rápida (Mobile/Tablet) — Exclusivo da Home (/) para eliminar poluição em páginas internas ── */}
      {location.pathname === "/" && (
        <div className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar bg-background/80 backdrop-blur-sm border-t border-border/30">
          {MOBILE_QUICK_CHIPS.map((chip) => {
            const isSelected =
              chip.to === "/"
                ? location.pathname === "/"
                : (location.pathname || "").startsWith(chip.to.split("?")[0]) &&
                  (chip.to.includes("?")
                    ? (location.searchStr || "").includes(chip.to.split("?")[1])
                    : true);
            const Icon = chip.icon;

            return (
              <Link
                key={chip.label}
                to={chip.to as any}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans shrink-0 transition-all ${
                  isSelected
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-muted/30"
                }`}
              >
                <Icon size={14} weight={isSelected ? "fill" : "bold"} />
                {chip.isPlacesBadge ? (
                  <PlacesHighlightBadge subtle={!isSelected} className="text-xs" />
                ) : (
                  <span className="whitespace-nowrap">{chip.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <BetaExplanationModal open={betaModalOpen} onOpenChange={setBetaModalOpen} />
    </header>
  );
}
