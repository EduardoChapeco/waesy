/**
 * GlobalMenuHub — Hub de Navegação e Módulos do Ecossistema (Waesy Platform)
 *
 * Design System: Apple HIG / Super App Hub Pattern / WhatsApp Minimalist List
 * - Substitui barras inferiores sobrecarregadas por uma tela limpa e organizada.
 * - Touch targets >= 44px (h-12 / min-h-12) com active:scale-[0.98].
 * - Agrupamento canônico de módulos: Minha Atividade, Serviços Regionais, Negócios e Conta.
 */

import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, ShoppingCart, MessageCircle, Tag, Bookmark, Handshake, Compass, Briefcase, CalendarDays, Ticket, MapPin, Coins, Gift, Store, LayoutDashboard, Shield, Settings, LogOut, ChevronRight, User, Bike, Star, Award } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth.functions";
import { toast } from "sonner";

export interface GlobalMenuHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: any;
  userRole?: string | null;
  activeOrdersCount?: number;
  totalCartItems?: number;
}

export function GlobalMenuHub({
  open,
  onOpenChange,
  session,
  userRole,
  activeOrdersCount = 0,
  totalCartItems = 0,
}: GlobalMenuHubProps) {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(session?.user || session?.id);
  const user = session?.user || session;

  const userAvatar = user?.user_metadata?.avatar_url || user?.avatar_url || "";
  const userFullName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Usuário";

  const userEmail = user?.email || "";
  const username =
    user?.user_metadata?.username ||
    user?.username ||
    (typeof userEmail === "string" ? userEmail.split("@")[0] : null);

  const publicProfileTarget = username || user?.id;

  const userInitials =
    userFullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("") || "AW";

  const isAdmin =
    userRole === "platform_admin" ||
    session?.role === "platform_admin" ||
    user?.app_metadata?.role === "platform_admin";

  const handleNavigate = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    navigate({ to: to as any, params: params as any });
  };

  const handleSwitchContext = (type: "civil" | "creator" | "courier" | "store", storeId?: string) => {
    onOpenChange(false);
    if (typeof window !== "undefined") {
      window.document.cookie = `waesy_active_context=${type}; path=/; max-age=31536000; SameSite=Lax`;
      if (type === "store" && storeId) {
        window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
      } else if (type !== "store") {
        window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      }
      if (type !== "creator") {
        window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
      }
    }
    if (type === "civil") {
      window.location.href = "/conta";
    } else if (type === "courier") {
      window.location.href = "/conta/entregador";
    } else if (type === "creator") {
      window.location.href = "/conta/criadores";
    } else if (type === "store") {
      window.location.href = "/workspace";
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Sessão encerrada com sucesso.");
      onOpenChange(false);
      window.location.href = "/";
    } catch {
      toast.error("Erro ao encerrar sessão.");
    }
  };

  const activityItems = [
    {
      label: "Pedidos",
      icon: ShoppingBag,
      onClick: () => handleNavigate("/conta/pedidos"),
      badge: activeOrdersCount > 0 ? `${activeOrdersCount}` : null,
    },
    {
      label: "Sacola",
      icon: ShoppingCart,
      onClick: () => handleNavigate("/carrinho"),
      badge: totalCartItems > 0 ? `${totalCartItems}` : null,
    },
    {
      label: "Waesy Go (Condutor)",
      icon: Bike,
      onClick: () => handleSwitchContext("courier"),
    },
    {
      label: "Conversas",
      icon: MessageCircle,
      onClick: () => handleNavigate(isAuthenticated ? "/conta/conversas" : "/entrar"),
    },
    {
      label: "Classificados",
      icon: Tag,
      onClick: () => handleNavigate(isAuthenticated ? "/conta/classificados" : "/entrar"),
    },
    {
      label: "Salvos",
      icon: Bookmark,
      onClick: () => handleNavigate(isAuthenticated ? "/conta/salvos" : "/entrar"),
    },
    {
      label: "Negociações",
      icon: Handshake,
      onClick: () => handleNavigate(isAuthenticated ? "/conta/negociacoes" : "/entrar"),
    },
  ];

  const ecosystemItems = [
    { label: "Turismo", icon: Compass, onClick: () => handleNavigate("/turismo") },
    { label: "Empregos", icon: Briefcase, onClick: () => handleNavigate("/empregos") },
    { label: "Agenda", icon: CalendarDays, onClick: () => handleNavigate("/agenda") },
    { label: "Eventos", icon: Ticket, onClick: () => handleNavigate("/eventos") },
    { label: "Places", icon: MapPin, onClick: () => handleNavigate("/diretorio") },
    { label: "Afiliados", icon: Coins, onClick: () => handleNavigate("/afiliados") },
    { label: "Doações", icon: Gift, onClick: () => handleNavigate("/doacoes") },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] sm:max-h-[85vh] p-0 flex flex-col rounded-t-[24px] border-t border-border bg-background overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        <SheetHeader className="px-4 pb-3 border-b border-border/50 text-left flex flex-row items-center justify-between">
          <SheetTitle className="text-sm font-bold text-foreground tracking-tight">
            Menu
          </SheetTitle>
        </SheetHeader>

        {/* Silent WhatsApp List Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
          {/* ── 1. IDENTIDADE DO USUÁRIO ── */}
          {isAuthenticated ? (
            <div className="rounded-lg border border-border/70 bg-card p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-lg bg-muted text-foreground flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-border/50">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userFullName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate leading-tight">
                    {userFullName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {username ? `@${username}` : userEmail}
                  </p>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">
                      <Shield className="size-3" />
                      Admin Master
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleNavigate(
                      publicProfileTarget ? "/membro/$id" : "/conta/perfil",
                      publicProfileTarget ? { id: String(publicProfileTarget) } : undefined
                    )
                  }
                  className="h-9 rounded-lg text-xs font-semibold gap-2 justify-center border-border/70"
                >
                  <User className="size-3.5 text-muted-foreground" />
                  <span>Perfil</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate("/conta/perfil")}
                  className="h-9 rounded-lg text-xs font-semibold gap-2 justify-center border-border/70"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Ajustes</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-card p-4 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-foreground">
                Sua Conta Waesy
              </span>
              <Button
                onClick={() => handleNavigate("/entrar")}
                className="h-9 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
              >
                Entrar
              </Button>
            </div>
          )}

          {/* ── 2. ATIVIDADE (Silent WhatsApp List) ── */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Atividade
            </span>
            <div className="rounded-lg border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              {activityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="w-full h-11 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <Badge className="bg-primary text-primary-foreground text-xs font-bold h-5 px-2">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground/50" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. SERVIÇOS (Silent WhatsApp List) ── */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Ecossistema
            </span>
            <div className="rounded-lg border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              {ecosystemItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="w-full h-11 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. OPERAÇÃO (Silent WhatsApp List) ── */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Operação
            </span>
            <div className="rounded-lg border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => handleSwitchContext("store")}
                className="w-full h-11 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutDashboard className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Workspace
                  </span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleNavigate("/criar-negocio")}
                className="w-full h-11 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Store className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Nova Loja
                  </span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin-master")}
                  className="w-full h-11 px-4 flex items-center justify-between bg-primary/5 hover:bg-primary/10 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className="size-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-primary">
                      Admin Master
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-primary shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* ── 5. CONTA (Silent WhatsApp List) ── */}
          <div className="space-y-1 pt-1">
            <div className="rounded-lg border border-border/70 bg-card divide-y divide-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => handleNavigate(isAuthenticated ? "/conta" : "/entrar")}
                className="w-full h-11 px-4 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Conta
                  </span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full h-11 px-4 flex items-center justify-between hover:bg-destructive/10 transition-colors text-left cursor-pointer text-destructive"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <LogOut className="size-4 shrink-0" />
                    <span className="text-sm font-medium">Sair</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="text-center pt-2 pb-6">
            <span className="text-[11px] text-muted-foreground">
              Waesy Platform • Versão 2.4 (Mobile-First Native)
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
