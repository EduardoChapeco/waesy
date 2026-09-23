import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { DEFAULT_BRAND_NAME } from "@/lib/brand";
import { LocationMasterPill } from "@/components/location/location-master-pill";
import { UtilityCluster } from "@/components/shell/utility-cluster";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { BetaExplanationModal } from "@/components/shell/beta-explanation-modal";

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

/**
 * TopBar Canônica Waesy — Padrão Apple HIG & Silêncio Visual
 * - Desktop: Logo + Localização + Busca Inteligente com ⌘K + Cluster de Utilidades
 * - Mobile: Logo + Localização Ergonômica + Botão de Busca Direto (Touch Target 44px) + Cluster
 * - Zero vazamento de breakpoints: chips mobile redundantes erradicados (a navegação mobile pertence à MobileNav)
 */
export function TopBar({ session, brandSettings }: TopBarProps) {
  const [betaModalOpen, setBetaModalOpen] = React.useState(false);

  const platformDisplayName =
    brandSettings?.platform_name &&
    !["Waesy", "waesy", "WAESY"].includes(brandSettings.platform_name)
      ? brandSettings.platform_name
      : DEFAULT_BRAND_NAME;

  return (
    <header className="sticky top-0 z-30 w-full bg-background select-none border-b border-border/40">
      <div className="px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 h-12 sm:h-14 w-full">
        {/* Lado Esquerdo: Logo + Selo Beta Silencioso + Localização */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-1.5 hover:opacity-90 transition-opacity shrink-0"
            aria-label="Ir para a página inicial"
          >
            {brandSettings?.show_logo !== false && brandSettings?.logo_url ? (
              <img
                src={brandSettings.logo_url}
                alt={platformDisplayName}
                className="h-6 sm:h-7 max-w-[100px] object-contain"
              />
            ) : null}
            {(brandSettings?.show_name !== false || !brandSettings?.logo_url) && (
              <span className="font-display font-black text-lg sm:text-xl tracking-tight text-foreground leading-none">
                {platformDisplayName}
              </span>
            )}
          </Link>

          {/* Badge BETA Silencioso (Padrão Design.md: Monocromático, sem fundo colorido) */}
          <button
            type="button"
            onClick={() => setBetaModalOpen(true)}
            title="Plataforma em Versão Beta — Saiba mais"
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-medium tracking-wider uppercase text-muted-foreground hover:text-foreground border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer shrink-0"
          >
            BETA
          </button>

          {/* Location Master Pill — com largura fluida que não estrangula o nome da cidade */}
          <LocationMasterPill className="max-w-[120px] sm:max-w-[200px]" />
        </div>

        {/* Centro (Desktop >= 1024px): Busca Global Inteligente Silenciosa */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-4">
          <Link
            to="/buscar"
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs font-normal transition-all group border border-border/40 hover:border-border/70"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MagnifyingGlass
                size={15}
                weight="bold"
                className="text-muted-foreground/70 group-hover:text-foreground transition-colors shrink-0"
              />
              <span className="truncate">Buscar lugares, classificados, vagas ou serviços...</span>
            </div>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground/80 bg-background rounded-md border border-border/40 shrink-0">
              ⌘K
            </kbd>
          </Link>
        </div>

        {/* Lado Direito: Ação de Busca Rápida Mobile + UtilityCluster */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {/* Ação de Busca Rápida Mobile (Touch Target 44px ergonômico) */}
          <Link
            to="/buscar"
            className="lg:hidden flex items-center justify-center size-9 sm:size-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Abrir busca"
            title="Buscar"
          >
            <MagnifyingGlass size={18} weight="bold" />
          </Link>

          <UtilityCluster session={session} embedded={true} />
        </div>
      </div>

      <BetaExplanationModal open={betaModalOpen} onOpenChange={setBetaModalOpen} />
    </header>
  );
}
