import React from "react";
import { Tag, Newspaper, Gift, Target, Rss } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { type ContextConfig } from "@/lib/navigation-registry";
import { PublishSheet } from "@/components/commerce/publish-sheet";
import { PlacesHighlightBadge } from "@/components/shell/places-highlight-badge";
import { House, CalendarDots, Briefcase, Compass, Scissors, BookmarkSimple, ChatCircleDots, Package, Ticket, ArrowSquareOut, Gear, UserCircle, Storefront } from "@phosphor-icons/react";

export interface ContextSidebarProps {
  config: ContextConfig;
  session?: any;
}

// ── 1. Módulos Principais Comunitários (Rótulos Diretos, Sem Títulos Compostos) ──
const MAIN_EXPLORER_ITEMS = [
  { to: "/", label: "Início", icon: House, exact: true },
  { to: "/diretorio", label: "Places", isPlacesBadge: true, icon: Compass, exact: true },
  { to: "/classificados", label: "Classificados", icon: Tag, exact: true, isLucide: true },
  { to: "/feed", label: "Feed", icon: Rss, exact: true, isLucide: true },
  { to: "/noticias", label: "Notícias", icon: Newspaper, exact: true, isLucide: true },
  { to: "/empregos", label: "Empregos", icon: Briefcase, exact: true },
  { to: "/eventos", label: "Eventos", icon: Ticket, exact: true },
  { to: "/agenda", label: "Agenda", icon: CalendarDots, exact: true },
  { to: "/afiliados", label: "Afiliados", icon: Target, exact: true, isLucide: true },
];

// ── 2. Painel Pessoal & Social (Rótulos de 1 Palavra) ──
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
    <aside className="hidden md:flex flex-col w-16 lg:w-56 shrink-0 h-full py-3 px-1.5 lg:px-2.5 bg-background justify-between select-none overflow-y-auto no-scrollbar z-20 border-r border-border/40 transition-[width] duration-200">
      <div className="space-y-4">
        {/* ── 1. MÓDULOS PRINCIPAIS (Compact Icon Rail no Tablet/Foldable md, Expandido no Desktop lg) ── */}
        <div className="space-y-0.5">
          <span className="hidden lg:block px-2.5 text-[10px] font-mono font-bold tracking-wider uppercase text-muted-foreground/70">
            Explorar
          </span>
          <nav className="flex flex-col space-y-0.5 pt-0.5 lg:pt-1">
            {MAIN_EXPLORER_ITEMS.map((item) => {
              const Icon = item.icon as any;
              const active = isCurrentActive(item);
              const isPlacesBadge = (item as any).isPlacesBadge;

              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center justify-center lg:justify-between h-10 lg:h-8.5 px-0 lg:px-2.5 rounded-xl text-xs transition-all cursor-pointer group ${
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                  }`}
                >
                  <div className="flex items-center justify-center lg:justify-start gap-2.5 min-w-0">
                    {(item as any).isLucide ? (
                      <Icon
                        className={`size-4.5 lg:size-4 shrink-0 transition-colors ${
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    ) : (
                      <Icon
                        size={18}
                        weight={active ? "fill" : "regular"}
                        className={`shrink-0 transition-colors lg:size-4 ${
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    )}
                    <div className="hidden lg:block truncate">
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
          <div className="space-y-0.5 pt-1 border-t border-border/40">
            <span className="hidden lg:block px-2.5 text-[10px] font-mono font-bold tracking-wider uppercase text-muted-foreground/70">
              Pessoal
            </span>

            {hasStore && (
              <div className="pt-1 pb-0.5">
                <Link
                  to="/workspace"
                  title="Workspace"
                  aria-label="Workspace"
                  className="flex items-center justify-center lg:justify-between h-10 lg:h-8.5 px-0 lg:px-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Storefront size={16} weight="fill" />
                    <span className="hidden lg:inline">Workspace</span>
                  </div>
                  <ArrowSquareOut size={13} className="hidden lg:block text-primary/70 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}

            <nav className="flex flex-col space-y-0.5 pt-0.5">
              {USER_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isCurrentActive(item);

                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    title={item.label}
                    aria-label={item.label}
                    className={`flex items-center justify-center lg:justify-start gap-2.5 h-10 lg:h-8.5 px-0 lg:px-2.5 rounded-xl text-xs transition-all cursor-pointer group ${
                      active
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                    }`}
                  >
                    <Icon
                      size={18}
                      weight={active ? "fill" : "regular"}
                      className={`shrink-0 transition-colors lg:size-4 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                    />
                    <span className="hidden lg:inline truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* ── 3. BOTÃO DE CRIAR & PUBLICAR ── */}
      <div className="pt-2 hidden lg:block">
        <PublishSheet />
      </div>
    </aside>
  );
}
