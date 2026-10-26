/**
 * ============================================================================
 * Waesy Platform — SuperAppModuleDrawer (Apple HIG & Bilateral CMS)
 * ============================================================================
 * Drawer nativo mobile do SuperApp com alternância Grade Squircle vs Lista,
 * upload de PNG sem fundo, background customizável, botão Classificados full-width
 * e sincronização bilateral via listDrawerModules() do Admin Master.
 * Ref: Prints Screenshot_2026-08-15-12-37-46-468 / 54-337 / 00-853
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid,
  List,
  ChevronRight,
  User,
  Shield,
  ShoppingCart,
  ShoppingBag,
  Cross,
  Shirt,
  Utensils,
  Wine,
  Plane,
  Ticket,
  Newspaper,
  Car,
  Package,
  Users,
  Truck,
  PlusCircle,
  Tag,
  Briefcase,
  Zap,
  FileText,
  Compass,
  Bike,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listDrawerModules, CANONICAL_DRAWER_MODULES, type HotpageDTO } from "@/services/hotpage.functions";

export interface SuperAppModuleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: any;
  userRole?: string | null;
  activeCity?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  Cross,
  Shirt,
  Utensils,
  Wine,
  Plane,
  Ticket,
  Newspaper,
  Car,
  Package,
  Users,
  Truck,
  PlusCircle,
  Tag,
  LayoutGrid,
  Briefcase,
  Zap,
  FileText,
  Compass,
  Bike,
};

export function SuperAppModuleDrawer({
  open,
  onOpenChange,
  session,
  userRole,
  activeCity,
}: SuperAppModuleDrawerProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modules, setModules] = useState<HotpageDTO[]>(CANONICAL_DRAWER_MODULES as any);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = Boolean(session?.user || session?.id);
  const user = session?.user || session;
  const userFullName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Usuário";
  const userAvatar =
    session?.avatarUrl || session?.avatar_url || user?.avatar_url || "";
  const username =
    user?.user_metadata?.username ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : null);

  const isAdmin =
    userRole === "platform_admin" ||
    session?.role === "platform_admin" ||
    user?.app_metadata?.role === "platform_admin";

  // Carrega módulos do Admin Master de forma bilateral
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setIsLoading(true);

    listDrawerModules({ data: { city: activeCity } } as any)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setModules(data);
        }
      })
      .catch(() => {
        if (isMounted) setModules(CANONICAL_DRAWER_MODULES as any);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, activeCity]);

  const handleNavigate = (route: string) => {
    onOpenChange(false);
    navigate({ to: route as any });
  };

  const handleSwitchContext = (type: "civil" | "creator" | "courier" | "store") => {
    onOpenChange(false);
    if (typeof window !== "undefined") {
      window.document.cookie = `waesy_active_context=${type}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (type === "civil") window.location.href = "/conta";
    else if (type === "courier") window.location.href = "/conta/entregador";
    else if (type === "creator") window.location.href = "/conta/criadores";
    else if (type === "store") window.location.href = "/workspace";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-overlay-max max-h-overlay-max p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header */}
        <SheetHeader className="px-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Aproveite o Waesy
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              SuperApp integrado de comércio, serviços e comunidade
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Visualização em Grade"
              className={cn(
                "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="Visualização em Lista"
              className={cn(
                "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12 pb-safe">
          {/* Identidade e Switcher de Perfis */}
          {isAuthenticated ? (
            <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-11 min-w-11 min-h-11 rounded-xl bg-muted flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-border/50">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userFullName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{userFullName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {userFullName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {username ? `@${username}` : user?.email}
                  </p>
                </div>
                {isAdmin && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold shrink-0">
                    Admin
                  </Badge>
                )}
              </div>

              {/* Botões de Perfil e Subpainéis */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSwitchContext("civil")}
                  className="h-11 min-h-11 px-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <User className="size-4 text-muted-foreground" />
                  <span className="truncate">Civil</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchContext("store")}
                  className="h-11 min-h-11 px-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ShoppingBag className="size-4 text-muted-foreground" />
                  <span className="truncate">Empresas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchContext("courier")}
                  className="h-11 min-h-11 px-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Bike className="size-4 text-muted-foreground" />
                  <span className="truncate">Waesy Go</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card p-4 flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Acesse sua Conta Waesy
                </span>
                <span className="text-xs text-muted-foreground">
                  Desbloqueie pedidos, caronas e compras locais
                </span>
              </div>
              <Button
                onClick={() => handleNavigate("/entrar")}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Entrar
              </Button>
            </div>
          )}

          {/* Módulos do SuperApp */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Módulos & Serviços
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin-master/botoes?tab=drawer_module")}
                  className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 h-11 min-h-11 flex items-center"
                >
                  Editar no CMS
                </button>
              )}
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-4 gap-2">
                {modules.map((item) => {
                  const isFullWidth = Boolean(
                    item.filter_rules?.is_full_width ||
                      item.slug === "drawer-classificados"
                  );
                  const IconComponent =
                    (item.icon_name && ICON_MAP[item.icon_name]) || LayoutGrid;
                  const customIcon = item.custom_icon_url || item.icon_url;

                  if (isFullWidth) {
                    return (
                      <button
                        key={item.slug || item.id}
                        type="button"
                        onClick={() => handleNavigate(item.target_route || "/classificados")}
                        className="col-span-4 h-14 min-h-14 px-4 rounded-2xl border border-border/70 bg-card hover:bg-muted/30 active:scale-[0.98] transition-transform duration-200 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center shrink-0 border border-border/40 bg-indigo-500/10">
                            {customIcon ? (
                              <img
                                src={customIcon}
                                alt={item.title}
                                className="size-6 object-contain"
                              />
                            ) : (
                              <IconComponent className="size-5 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-foreground tracking-tight leading-snug">
                              {item.title}
                            </h5>
                            <span className="text-xs text-muted-foreground">
                              Veículos, Imóveis, Eletrônicos e Desapegos
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.slug || item.id}
                      type="button"
                      onClick={() => handleNavigate(item.target_route || "/")}
                      className="flex flex-col items-center justify-start p-2 rounded-2xl border border-border/50 bg-card hover:bg-muted/30 active:scale-[0.96] transition-transform duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs min-h-20"
                    >
                      <div className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center mb-1 border border-border/40 shrink-0 bg-muted/40">
                        {customIcon ? (
                          <img
                            src={customIcon}
                            alt={item.title}
                            className="size-6 object-contain"
                          />
                        ) : (
                          <IconComponent className="size-5 text-foreground" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-tight line-clamp-2 px-1">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Modo Lista (WhatsApp / HIG Minimalist List) */
              <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/40 overflow-hidden shadow-xs">
                {modules.map((item) => {
                  const IconComponent =
                    (item.icon_name && ICON_MAP[item.icon_name]) || LayoutGrid;
                  const customIcon = item.custom_icon_url || item.icon_url;

                  return (
                    <button
                      key={item.slug || item.id}
                      type="button"
                      onClick={() => handleNavigate(item.target_route || "/")}
                      className="w-full h-12 min-h-12 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center shrink-0 border border-border/40 bg-muted/40">
                          {customIcon ? (
                            <img
                              src={customIcon}
                              alt={item.title}
                              className="size-5 object-contain"
                            />
                          ) : (
                            <IconComponent className="size-5 text-foreground" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
