import { Link, useLocation } from "@tanstack/react-router";
import { GLOBAL_DESTINATIONS, type NavigationItem } from "@/lib/navigation-registry";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gift, House, SignIn, Storefront, UserCircle } from "@phosphor-icons/react";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import { cn } from "@/lib/utils";

export interface GlobalRailProps {
  session?: any;
}

export function GlobalRail({ session }: GlobalRailProps) {
  const location = useLocation();
  const isAuthenticated = Boolean(session?.user || session?.id);

  const isCurrentActive = (item: NavigationItem) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to);
  };

  const isAccountActive = location.pathname.startsWith("/conta");
  const isWorkspaceActive = location.pathname.startsWith("/workspace");
  const isInviteActive = location.pathname.startsWith("/convite");

  return (
    <TooltipProvider delayDuration={120}>
      <aside className="hidden md:flex flex-col items-center justify-between w-14 shrink-0 h-dvh sticky top-0 py-3 bg-rail border-r border-sidebar-border z-30 select-none">
        {/* 1. Topo: Logo Waesy */}
        <div className="flex flex-col items-center gap-2">
          <Link
            to="/"
            className="size-11 min-w-11 min-h-11 rounded-xl bg-foreground text-background flex items-center justify-center font-display font-black text-lg tracking-tighter transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Waesy — Início"
          >
            <House size={20} weight={location.pathname === "/" ? "fill" : "regular"} />
          </Link>
        </div>

        {/* 2. Centro: Destinos Globais */}
        <nav className="flex flex-col items-center gap-1 my-auto">
          {GLOBAL_DESTINATIONS.map((item) => {
            const active = isCurrentActive(item);

            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    className={cn(
                      "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                    )}
                    aria-label={item.label}
                  >
                    <StatefulNavIcon icon={item.icon} active={active} size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="font-medium text-xs rounded-lg">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/convite"
                className={cn(
                  "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isInviteActive
                    ? "bg-rail-active text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                )}
                aria-label="Convite"
              >
                <Gift size={20} weight={isInviteActive ? "fill" : "regular"} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="font-medium text-xs rounded-lg">
              Convites
            </TooltipContent>
          </Tooltip>
        </nav>

        {/* 3. Rodapé: Workspace e Conta */}
        <div className="flex flex-col items-center gap-1 pt-2 border-t border-sidebar-border w-full px-1">
          {isAuthenticated ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/workspace"
                    className={cn(
                      "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isWorkspaceActive
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                    )}
                    aria-label="Workspace"
                  >
                    <Storefront size={20} weight={isWorkspaceActive ? "fill" : "regular"} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="font-medium text-xs rounded-lg">
                  Workspace
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/conta"
                    className={cn(
                      "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isAccountActive
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                    )}
                    aria-label="Minha Conta"
                  >
                    <UserCircle size={20} weight={isAccountActive ? "fill" : "regular"} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="font-medium text-xs rounded-lg">
                  Minha Conta
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/entrar"
                  className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Entrar"
                >
                  <SignIn size={20} weight="regular" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="font-medium text-xs rounded-lg">
                Entrar
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
