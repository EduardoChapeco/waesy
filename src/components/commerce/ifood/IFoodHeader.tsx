import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { List, CaretDown, Bell, Diamond, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useSuperAppDrawer } from "@/lib/drawer-store";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { cn } from "@/lib/utils";

export interface IFoodHeaderProps {
  userName?: string | null;
  activeAddress?: string | null;
  unreadNotificationsCount?: number;
  hasClubBenefit?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  onAddressClick?: () => void;
  onNotificationsClick?: () => void;
  onClubClick?: () => void;
  className?: string;
}

export type VitrineAppHeaderProps = IFoodHeaderProps;

export function IFoodHeader({
  userName,
  activeAddress,
  unreadNotificationsCount = 0,
  hasClubBenefit = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar lojas, produtos, vagas ou serviços...",
  showSearch = false,
  onAddressClick,
  onNotificationsClick,
  onClubClick,
  className,
}: IFoodHeaderProps) {
  const navigate = useNavigate();
  const { open: openSuperApp } = useSuperAppDrawer();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const displayName = userName?.trim() ? userName.trim().split(" ")[0] : "Visitante";

  const resolvedAddress = (() => {
    if (activeAddress) return activeAddress;
    const stored = getStoredLocation();
    if (stored && stored.city && stored.city.toLowerCase() !== "global") {
      return `${stored.city}${stored.state ? ` · ${stored.state}` : ""}`;
    }
    return "Escolher localização";
  })();

  return (
    <header
      className={cn(
        "w-full bg-background/95 backdrop-blur-md py-2 px-3 sm:px-4 flex flex-col gap-2 sticky top-0 z-30 border-b border-border/40 md:hidden pt-safe",
        className,
      )}
      data-testid="ifood-canonical-header"
    >
      {/* ── LINHA SUPERIOR: Menu + Endereço/Saudação + Ações do Usuário ── */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* LADO ESQUERDO: Botão Hambúrguer SuperApp + Endereço */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={openSuperApp}
            aria-label="Abrir menu de módulos"
            className="size-11 min-w-11 min-h-11 rounded-lg bg-transparent hover:bg-muted/50 active:scale-95 transition-transform flex items-center justify-center text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <List size={24} weight="bold" />
          </button>

          <div className="flex flex-col min-w-0">
            <span className="text-2xs text-muted-foreground font-medium leading-tight truncate">
              {greeting}, {displayName}
            </span>
            <button
              type="button"
              onClick={onAddressClick || (() => navigate({ to: "/conta/enderecos" }))}
              aria-label="Alterar endereço ou cidade"
              className="flex items-center gap-1 text-xs font-bold text-foreground hover:text-primary transition-colors text-left leading-tight truncate cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
            >
              <span className="truncate max-w-44 sm:max-w-64">
                {resolvedAddress}
              </span>
              <CaretDown size={14} weight="bold" className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </div>

        {/* LADO DIREITO: Clube Fidelidade + Sino de Notificações */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClubClick || (() => navigate({ to: "/conta/creditos" }))}
            aria-label="Clube de Benefícios e Cupons"
            className="size-11 min-w-11 min-h-11 rounded-lg bg-transparent hover:bg-muted/40 text-purple-600 dark:text-purple-400 transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 relative"
          >
            <Diamond size={22} weight="fill" className="text-purple-600 dark:text-purple-400" />
            {hasClubBenefit && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </button>

          <button
            type="button"
            onClick={onNotificationsClick || (() => navigate({ to: "/conta/notificacoes" }))}
            aria-label="Notificações"
            className="size-11 min-w-11 min-h-11 rounded-lg hover:bg-muted/50 text-foreground transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 relative"
          >
            <Bell size={22} weight="bold" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-3xs font-black flex items-center justify-center leading-none">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── SEGUNDA LINHA: Campo de Busca Integrado (44px Piso Apple HIG) ── */}
      {(showSearch || onSearchChange) && (
        <div className="w-full pt-1 pb-1">
          <div className="relative flex items-center w-full">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="search"
              inputMode="search"
              value={searchValue || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-11 min-h-11 pl-10 pr-10 rounded-xl bg-muted/60 hover:bg-muted/80 focus:bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs transition-colors"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-0 size-11 min-h-11 min-w-11 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export const VitrineAppHeader = IFoodHeader;
