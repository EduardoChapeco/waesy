/**
 * ============================================================================
 * Waesy Platform — AccountSwitcherDrawer.tsx (Apple HIG & Multi-Tenant Switcher)
 * ============================================================================
 * Drawer nativo mobile para alternância instantânea de contextos e perfis:
 * - Identidade Civil (Consumidor, Caronas, Pedidos)
 * - Empresas e Lojas (Workspace Comercial, Catálogo, Vendas)
 * - Waesy Go (Motorista e Entregador, Ganhos, Telemetria)
 * - Criadores e Afiliados (Comissões, Campanhas)
 * Acionado pela 5ª aba da barra móvel ou pela pílula de perfil.
 * Ref: Prints hero-tela-lat-esq.jpg, unnamed (4).webp, unnamed (2).webp
 * ============================================================================
 */

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  User,
  Store,
  Bike,
  Sparkles,
  ShoppingBag,
  Wallet,
  MapPin,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  CheckCircle,
  Tag,
  MessageSquare,
  Bookmark,
  Ticket,
  Plane,
  Calendar,
  Car,
  FileText,
  Coins,
  CreditCard,
  Gift,
  Handshake,
  BadgeCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountSwitcherDrawer } from "@/lib/drawer-store";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { setClientContextCookies, getClientActiveContext } from "@/lib/context-auth";
import { signOut } from "@/services/auth.functions";

export interface AccountSwitcherDrawerProps {
  session?: any;
  userRole?: string | null;
}

export function AccountSwitcherDrawer({ session, userRole }: AccountSwitcherDrawerProps) {
  const { isOpen, setOpen } = useAccountSwitcherDrawer();
  const navigate = useNavigate();

  const isAuthenticated = Boolean(session?.user || session?.id);
  const user = session?.user || session;
  const userFullName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Cidadão";
  const userAvatar =
    session?.avatarUrl || session?.avatar_url || user?.avatar_url || "";
  const username =
    user?.user_metadata?.username ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : null);

  // Determina o contexto ativo atual via cookie canônico
  const currentContext = getClientActiveContext();

  const handleSwitchContext = (type: "civil" | "store" | "courier" | "creator") => {
    setOpen(false);
    if (type === "civil") {
      setClientContextCookies({ context: "civil" });
      navigate({ to: "/conta" });
    } else if (type === "store") {
      navigate({ to: "/workspace" as any });
    } else if (type === "courier") {
      setClientContextCookies({ context: "courier" });
      navigate({ to: "/conta/entregador" as any });
    } else if (type === "creator") {
      setClientContextCookies({ context: "creator" });
      navigate({ to: "/afiliados" as any });
    }
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate({ to: path as any });
  };

  const handleLogout = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch {
      // Ignora erro de rede em logout
    }
    if (typeof window !== "undefined") {
      setClientContextCookies({ context: "civil" });
      window.location.href = "/entrar";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Top Header */}
        <SheetHeader className="px-5 py-3.5 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base font-bold text-foreground tracking-tight">
            Minha Conta e Perfis
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-12 pb-safe">
          {isAuthenticated ? (
            <>
              {/* Identidade do Usuário (Clean & Borderless) */}
              <div className="flex items-center gap-3.5 px-1 py-1">
                <div className="size-14 min-w-14 min-h-14 rounded-full bg-muted flex items-center justify-center font-bold text-base shrink-0 overflow-hidden ring-1 ring-border/40">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userFullName}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{userFullName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-base text-foreground break-words leading-tight">
                      {userFullName}
                    </h3>
                    <VerifiedBadge
                      isVerified={user?.is_verified}
                      badgeUrl={user?.verified_badge_url}
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {username ? `@${username}` : user?.email}
                  </p>
                </div>
              </div>

              {/* Seletor de Perfis e Contextos (Apple Segmented Style) */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Alternar Identidade
                </span>

                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/40">
                  {/* Perfil Civil */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("civil")}
                    className={cn(
                      "h-12 min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "civil"
                        ? "bg-background text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <User className={cn("size-4 shrink-0", currentContext === "civil" ? "text-primary" : "")} />
                    <span className="text-xs font-semibold truncate">Conta Civil</span>
                  </button>

                  {/* Perfil Empresas */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("store")}
                    className={cn(
                      "h-12 min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "store"
                        ? "bg-background text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Store className={cn("size-4 shrink-0", currentContext === "store" ? "text-primary" : "")} />
                    <span className="text-xs font-semibold truncate">Empresas</span>
                  </button>

                  {/* Perfil Waesy Go */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("courier")}
                    className={cn(
                      "h-12 min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "courier"
                        ? "bg-background text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Bike className={cn("size-4 shrink-0", currentContext === "courier" ? "text-primary" : "")} />
                    <span className="text-xs font-semibold truncate">Waesy Go</span>
                  </button>

                  {/* Perfil Criador */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("creator")}
                    className={cn(
                      "h-12 min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "creator"
                        ? "bg-background text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Sparkles className={cn("size-4 shrink-0", currentContext === "creator" ? "text-primary" : "")} />
                    <span className="text-xs font-semibold truncate">Criadores</span>
                  </button>
                </div>
              </div>

              {/* Serviços Pessoais — Apple Inset Grouped Architecture */}
              <div className="space-y-4 pt-1">
                {/* Grupo 1: Transacional & Atividades */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Transações &amp; Finanças
                  </span>
                  <div className="rounded-2xl bg-muted/30 divide-y divide-border/25 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/financas")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Wallet className="size-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Carteira &amp; Saldo</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/pedidos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <ShoppingBag className="size-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Pedidos &amp; Compras</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/creditos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Tag className="size-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Clube &amp; Cupons</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/conversas")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <MessageSquare className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Mensagens</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Grupo 2: Minha Conta & Coleções */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Serviços Pessoais
                  </span>
                  <div className="rounded-2xl bg-muted/30 divide-y divide-border/25 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/salvos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Bookmark className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Favoritos</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/enderecos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <MapPin className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Endereços</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/classificados")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Store className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Anúncios</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/ingressos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Ticket className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Ingressos</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/viagens")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Plane className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Viagens</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/agendamentos")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Calendar className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Agendas</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/mobilidade")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Car className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Waesy Go</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/curriculo")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <FileText className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Currículo</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/tokens")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Coins className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Tokens WZ</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/carnes")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <CreditCard className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Carnês</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/gift-cards")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Gift className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Gift Cards</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/negociacoes")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <Handshake className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Trocas</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Grupo 3: Governança & Ajuda */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Governança &amp; Suporte
                  </span>
                  <div className="rounded-2xl bg-muted/30 divide-y divide-border/25 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/seguranca")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <ShieldCheck className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Segurança &amp; Senha</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/verificacao")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <BadgeCheck className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Verificação Civil</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/suporte")}
                      className="w-full min-h-12 px-3.5 py-3 flex items-center justify-between text-left hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-background/80 flex items-center justify-center shrink-0 text-foreground">
                          <HelpCircle className="size-4 text-foreground" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Central de Ajuda</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Desconectar */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full h-11 min-h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 flex items-center justify-center gap-2 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Sair da Conta</span>
                </Button>
              </div>
            </>
          ) : (
            /* Estado Deslogado */
            <div className="space-y-4 text-center py-6">
              <div className="size-16 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <User className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Identifique-se no Waesy</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Acesse sua conta para ver seus pedidos, carteira digital, caronas e preferências.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <Button
                  onClick={() => handleNavigate("/entrar")}
                  className="w-full h-11 min-h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                >
                  Entrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleNavigate("/cadastro")}
                  className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs"
                >
                  Criar uma Conta
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
