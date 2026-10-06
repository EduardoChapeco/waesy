import React from "react";
import { Tag, Newspaper, Gift, Target, Rss } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { type ContextConfig } from "@/lib/navigation-registry";
import { PublishSheet } from "@/components/commerce/publish-sheet";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import {
  House,
  CalendarDots,
  Briefcase,
  Compass,
  Scissors,
  BookmarkSimple,
  ChatCircleDots,
  Package,
  Ticket,
  ArrowSquareOut,
  Gear,
  UserCircle,
  Storefront,
  CaretDown,
  CaretRight,
  ForkKnife,
  ShoppingBag,
  Heartbeat,
  BeerBottle,
  Flame,
  TShirt,
  Bone,
  Laptop,
  Armchair,
  Hammer,
  Buildings,
} from "@phosphor-icons/react";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface ContextSidebarProps {
  config: ContextConfig;
  session?: any;
}

// ── 1. Módulos Principais Comunitários (Rótulos Diretos, Sem Títulos Compostos) ──
const MAIN_EXPLORER_ITEMS = [
  { to: "/", label: "Início", icon: House, exact: true },
  { to: "/marketplace", label: "Marketplace", icon: Storefront, exact: true, isMarketplace: true },
  { to: "/diretorio", label: "Places", isPlacesBadge: true, icon: Compass, exact: true },
  { to: "/classificados", label: "Classificados", icon: Tag, exact: true, isLucide: true },
  { to: "/copilot", label: "Copilot", icon: ChatCircleDots, exact: true },
  { to: "/feed", label: "Feed", icon: Rss, exact: true, isLucide: true },
  { to: "/noticias", label: "Notícias", icon: Newspaper, exact: true, isLucide: true },
  { to: "/empregos", label: "Empregos", icon: Briefcase, exact: true },
  { to: "/eventos", label: "Eventos", icon: Ticket, exact: true },
  { to: "/agenda", label: "Agenda", icon: CalendarDots, exact: true },
  { to: "/afiliados", label: "Afiliados", icon: Target, exact: true, isLucide: true },
];

// ── 2. Sub-Marketplaces Verticais / Subnichos (14 Vitrines Canônicas) ──
const SUB_MARKETPLACES = [
  { to: "/gastronomia", label: "Comida", icon: ForkKnife },
  { to: "/mercado", label: "Mercado", icon: ShoppingBag },
  { to: "/farmacia", label: "Farmácia", icon: Heartbeat },
  { to: "/bebidas", label: "Bebidas", icon: BeerBottle },
  { to: "/acougue", label: "Carnes", icon: Flame },
  { to: "/moda", label: "Moda", icon: TShirt },
  { to: "/pet", label: "Pet", icon: Bone },
  { to: "/eletronicos", label: "Tech", icon: Laptop },
  { to: "/casa", label: "Casa", icon: Armchair },
  { to: "/construcao", label: "Construção", icon: Hammer },
  { to: "/servicos", label: "Serviços", icon: Briefcase },
  { to: "/imoveis", label: "Imóveis", icon: Buildings },
  { to: "/beleza", label: "Beleza", icon: Scissors },
  { to: "/ofertas", label: "Ofertas", icon: Flame },
];

// ── 3. Painel Pessoal & Social (Rótulos de 1 Palavra) ──
const USER_NAV_ITEMS = [
  { to: "/conta", label: "Conta", icon: UserCircle, exact: true },
  { to: "/conta/conversas", label: "Conversas", icon: ChatCircleDots, exact: true },
  { to: "/conta/salvos", label: "Salvos", icon: BookmarkSimple, exact: true },
  { to: "/convite", label: "Convites", icon: Gift, exact: true },
  { to: "/conta/pedidos", label: "Pedidos", icon: Package, exact: true },
  { to: "/conta/ingressos", label: "Ingressos", icon: Ticket, exact: true },
  { to: "/conta/agendamentos", label: "Agenda", icon: Scissors, exact: true },
  { to: "/conta/perfil", label: "Perfil", icon: UserCircle, exact: true },
  { to: "/conta/seguranca", label: "Ajustes", icon: Gear, exact: true },
];

export function ContextSidebar({ config, session }: ContextSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname || "/";
  const isAuthenticated = Boolean(session?.user);
  const hasStore = Boolean(session?.user?.store_id || session?.user?.user_metadata?.store_id);

  const { isCompact, isExpanded } = useWindowSizeClass();

  const isInsideMarketplace = React.useMemo(() => {
    if (currentPath === "/marketplace") return true;
    return SUB_MARKETPLACES.some((sub) => currentPath.startsWith(sub.to));
  }, [currentPath]);

  const [isMarketplacesOpen, setIsMarketplacesOpen] = React.useState(isInsideMarketplace);

  if (isCompact) {
    return null;
  }

  const isCurrentActive = (item: { to: string; exact?: boolean }) => {
    if (item.exact) {
      return currentPath === item.to && (!item.to.includes("?") ? !location.searchStr : true);
    }
    if (item.to.includes("?")) {
      const [base, query] = item.to.split("?");
      return currentPath === base && (location.searchStr || "").includes(query);
    }
    return currentPath === item.to || (item.to !== "/" && currentPath.startsWith(item.to + "/"));
  };

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 h-full py-3 bg-background justify-between select-none overflow-y-auto no-scrollbar z-20 border-r border-border/40 transition duration-200 motion-reduce:transition-none",
        isExpanded ? "w-56 px-3" : "w-16 px-2"
      )}
    >
      <div className="space-y-4">
        {/* ── 1. MÓDULOS PRINCIPAIS (Compact Navigation Rail no Medium, Expandido no Expanded) ── */}
        <div className="space-y-1">
          <span
            className={cn(
              "px-3 text-xs font-mono font-bold tracking-wider uppercase text-muted-foreground/70",
              isExpanded ? "block" : "hidden"
            )}
          >
            Explorar
          </span>
          <nav className="flex flex-col space-y-1 pt-1">
            {MAIN_EXPLORER_ITEMS.map((item) => {
              const Icon = item.icon as any;
              const active = isCurrentActive(item);
              const isPlacesBadge = (item as any).isPlacesBadge;
              const isMarketplace = (item as any).isMarketplace;

              if (isMarketplace) {
                return (
                  <div key={item.to} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center h-11 min-h-11 rounded-lg text-xs transition-colors group",
                        isExpanded ? "justify-between px-3" : "justify-center px-0",
                        active || isInsideMarketplace
                          ? "bg-primary/10 text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                      )}
                    >
                      <Link
                        to="/marketplace"
                        title="Marketplace"
                        aria-label="Marketplace"
                        className={cn(
                          "flex items-center gap-3 min-w-0 flex-1 h-full cursor-pointer",
                          isExpanded ? "justify-start" : "justify-center"
                        )}
                      >
                        <Storefront
                          size={isExpanded ? 16 : 18}
                          weight={active || isInsideMarketplace ? "fill" : "regular"}
                          className={cn(
                            "shrink-0 transition-colors",
                            active || isInsideMarketplace
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className={cn("truncate", isExpanded ? "block" : "hidden")}>Marketplace</span>
                      </Link>

                      {isExpanded && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMarketplacesOpen((prev) => !prev);
                          }}
                          title={isMarketplacesOpen ? "Recolher subnichos" : "Expandir subnichos"}
                          aria-label={isMarketplacesOpen ? "Recolher subnichos" : "Expandir subnichos"}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-mono font-bold bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span>14</span>
                          {isMarketplacesOpen ? <CaretDown size={11} /> : <CaretRight size={11} />}
                        </button>
                      )}
                    </div>

                    {/* Sub-Marketplaces Colapsáveis em Lista Vertical */}
                    {isExpanded && isMarketplacesOpen && (
                      <div className="flex flex-col space-y-1 p-1 rounded-lg bg-muted/40 border border-border/40 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
                        {SUB_MARKETPLACES.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = currentPath.startsWith(sub.to);

                          return (
                            <Link
                              key={sub.to}
                              to={sub.to as any}
                              className={cn(
                                "flex items-center gap-2 h-11 min-h-11 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isSubActive
                                  ? "bg-foreground text-background font-bold shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              )}
                            >
                              <SubIcon size={16} weight={isSubActive ? "fill" : "regular"} className="shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(
                    "flex items-center h-11 min-h-11 rounded-lg text-xs transition-colors cursor-pointer group",
                    isExpanded ? "justify-between px-3" : "justify-center px-0",
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                  )}
                >
                  <div className={cn("flex items-center gap-3 min-w-0", isExpanded ? "justify-start" : "justify-center")}>
                    {(item as any).isLucide ? (
                      <Icon
                        className={cn(
                          "shrink-0 transition-colors",
                          isExpanded ? "size-4" : "size-5",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                    ) : (
                      <Icon
                        size={isExpanded ? 16 : 18}
                        weight={active ? "fill" : "regular"}
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                    )}
                    <div className={cn("truncate", isExpanded ? "block" : "hidden")}>
                      {isPlacesBadge ? (
                        <PlacesHighlightBadge subtle={!active} className="text-xs" />
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── 2. PAINEL PESSOAL & REDE SOCIAL ── */}
        {isAuthenticated && (
          <div className="space-y-1 pt-1 border-t border-border/40">
            <span
              className={cn(
                "px-3 text-xs font-mono font-bold tracking-wider uppercase text-muted-foreground/70",
                isExpanded ? "block" : "hidden"
              )}
            >
              Pessoal
            </span>

            {hasStore && (
              <div className="pt-1 pb-1">
                <Link
                  to="/workspace"
                  title="Workspace"
                  aria-label="Workspace"
                  className={cn(
                    "flex items-center h-11 min-h-11 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs transition-colors group cursor-pointer",
                    isExpanded ? "justify-between px-3" : "justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Storefront size={16} weight="fill" />
                    <span className={isExpanded ? "inline" : "hidden"}>Workspace</span>
                  </div>
                  <ArrowSquareOut
                    size={13}
                    className={cn(
                      "text-primary/70 group-hover:translate-x-0.5 transition-transform",
                      isExpanded ? "block" : "hidden"
                    )}
                  />
                </Link>
              </div>
            )}

            <nav className="flex flex-col space-y-1 pt-1">
              {USER_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isCurrentActive(item);

                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                      "flex items-center h-11 min-h-11 rounded-lg text-xs transition-colors cursor-pointer group",
                      isExpanded ? "justify-start px-3 gap-3" : "justify-center px-0",
                      active
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                    )}
                  >
                    <Icon
                      size={isExpanded ? 16 : 18}
                      weight={active ? "fill" : "regular"}
                      className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className={cn("truncate", isExpanded ? "inline" : "hidden")}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* ── 3. BOTÃO DE CRIAR & PUBLICAR ── */}
      <div className={cn("pt-2", isExpanded ? "block" : "hidden")}>
        <PublishSheet />
      </div>
    </aside>
  );
}
