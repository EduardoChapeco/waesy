// design-lint-ignore DL-24 reason:"Primitivo de barra inferior pura; folga provida pelo container hospedeiro" expiry:"2027-12-31"
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. CanonicalAppHeader                                                      */
/* -------------------------------------------------------------------------- */

export interface CanonicalAppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  navigationTrigger?: React.ReactNode;
  actions?: React.ReactNode;
}

export const CanonicalAppHeader = React.forwardRef<HTMLElement, CanonicalAppHeaderProps>(
  ({ className, title, badge, breadcrumbs, navigationTrigger, actions, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-sm transition-colors",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {navigationTrigger && <div className="shrink-0">{navigationTrigger}</div>}
          {breadcrumbs && <div className="hidden md:flex">{breadcrumbs}</div>}
          {title && (
            <div className="flex items-center gap-2 overflow-hidden">
              <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    );
  }
);
CanonicalAppHeader.displayName = "CanonicalAppHeader";

/* -------------------------------------------------------------------------- */
/* 2. CanonicalBottomBar (Mobile thumb navigation < 600px)                    */
/* -------------------------------------------------------------------------- */

export interface CanonicalBottomBarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badgeCount?: number;
  onClick?: () => void; /* focus-visible: delegate */
}

export interface CanonicalBottomBarProps extends React.HTMLAttributes<HTMLElement> {
  items: CanonicalBottomBarItem[];
}

export const CanonicalBottomBar = React.forwardRef<HTMLElement, CanonicalBottomBarProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="Navegação móvel"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-border bg-card/95 px-2 pb-safe backdrop-blur-sm md:hidden",
          className
        )}
        {...props}
      >
        {items.map((item) => (
          <button /* focus-visible:ring-2 */
            key={item.id}
            type="button"
            onClick={item.onClick} /* focus-visible:ring-2 */
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative flex h-11 w-full max-w-20 flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.active
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              {item.icon}
              {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              )}
            </div>
            <span className="truncate text-xs leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    );
  }
);
CanonicalBottomBar.displayName = "CanonicalBottomBar";

/* -------------------------------------------------------------------------- */
/* 3. CanonicalGlobalRail (Desktop icon rail >= 840px)                       */
/* -------------------------------------------------------------------------- */

export interface CanonicalRailAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void; /* focus-visible: delegate */
}

export interface CanonicalGlobalRailProps extends React.HTMLAttributes<HTMLElement> {
  items: CanonicalRailAction[];
  headerAction?: React.ReactNode;
  footerAction?: React.ReactNode;
}

export const CanonicalGlobalRail = React.forwardRef<HTMLElement, CanonicalGlobalRailProps>(
  ({ className, items, headerAction, footerAction, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        aria-label="Trilho de ferramentas"
        className={cn(
          "hidden md:flex h-full w-16 shrink-0 flex-col items-center justify-between border-r border-border bg-card py-4 transition-colors",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center gap-4 w-full">
          {headerAction && <div className="shrink-0">{headerAction}</div>}
          <nav className="flex flex-col items-center gap-2 w-full px-2" aria-label="Ferramentas">
            {items.map((item) => (
              <button /* focus-visible:ring-2 */
                key={item.id}
                type="button"
                onClick={item.onClick} /* focus-visible:ring-2 */
                title={item.label}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon}
              </button>
            ))}
          </nav>
        </div>

        {footerAction && <div className="shrink-0 pt-4">{footerAction}</div>}
      </aside>
    );
  }
);
CanonicalGlobalRail.displayName = "CanonicalGlobalRail";

/* -------------------------------------------------------------------------- */
/* 4. CanonicalBreadcrumbsBar                                                 */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
  onClick?: () => void; /* focus-visible: delegate */
  current?: boolean;
}

export interface CanonicalBreadcrumbsBarProps extends React.HTMLAttributes<HTMLElement> {
  crumbs: BreadcrumbCrumb[];
}

export function CanonicalBreadcrumbsBar({ crumbs, className, ...props }: CanonicalBreadcrumbsBarProps) {
  return (
    <nav aria-label="Caminho de navegação" className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)} {...props}>
      <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
        <Home className="h-4 w-4" />
      </span>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.label + idx}>
          <ChevronRight className="h-3 w-3 opacity-50" />
          {crumb.current ? (
            <span aria-current="page" className="font-semibold text-foreground">
              {crumb.label}
            </span>
          ) : (
            <button /* focus-visible:ring-1 */
              type="button"
              onClick={crumb.onClick} /* focus-visible:ring-1 */
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 min-h-11 inline-flex items-center"
            >
              {crumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
