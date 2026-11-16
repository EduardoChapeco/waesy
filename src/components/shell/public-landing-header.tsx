import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { WaesyHubLauncher } from "@/components/shell/waesy-hub-launcher";

export interface PublicLandingHeaderProps {
  brandName?: string;
  logoUrl?: string | null;
  showLogo?: boolean;
  showName?: boolean;
  session?: any;
}

const LANDING_NAV_LINKS = [
  { to: "/", label: "Início" },
  { to: "/sistemas", label: "Sistemas Verticais" },
  { to: "/explorer", label: "Explorar Cidade" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/portal-completo", label: "Waesy Pro" },
] as const;

export function PublicLandingHeader({
  brandName = "Waesy",
  logoUrl = null,
  showLogo = true,
  showName = true,
  session,
}: PublicLandingHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = Boolean(session?.user || session?.id);
  const hasStore = Boolean(session?.memberships?.length || session?.store_id);

  return (
    <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-md border-b border-border/60 pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-11 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            {showLogo && logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-8 w-auto max-w-28 object-contain" />
            ) : (
              <span className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-semibold text-base shrink-0">
                {brandName.charAt(0).toUpperCase()}
              </span>
            )}
            {(showName || !logoUrl) && (
              <span className="text-base font-bold tracking-tight text-foreground truncate">
                {brandName}
              </span>
            )}
          </Link>

          <nav aria-label="Navegação Principal" className="hidden lg:flex items-center gap-1 ml-2">
            {LANDING_NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="h-11 min-h-11 px-3 rounded-lg inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <WaesyHubLauncher compact={false} />

          <div className="hidden sm:flex items-center gap-2">
            <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
              <Link to={isAuthenticated ? (hasStore ? "/workspace" : "/conta") : "/entrar"}>
                <span>{isAuthenticated ? (hasStore ? "Workspace" : "Minha Conta") : "Entrar"}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menu"
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border bg-background flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-5 pt-safe pb-safe flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-sm font-bold text-foreground">{brandName}</span>
                    <Compass className="size-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {LANDING_NAV_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="h-11 min-h-11 px-3 rounded-lg flex items-center justify-between text-sm font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span>{item.label}</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-border/60">
                  <Button asChild variant="outline" className="w-full h-11 min-h-11 text-xs font-semibold">
                    <Link
                      to={isAuthenticated ? (hasStore ? "/workspace" : "/conta") : "/entrar"}
                      onClick={() => setMobileOpen(false)}
                    >
                      {isAuthenticated ? (hasStore ? "Ir ao Workspace" : "Minha Conta") : "Entrar na Conta"}
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
