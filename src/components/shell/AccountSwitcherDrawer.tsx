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
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAccountSwitcherDrawer } from "@/lib/drawer-store";

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

  // Determina o contexto ativo atual via cookie ou metadata
  const currentContext =
    (typeof window !== "undefined" &&
      window.document.cookie
        .split("; ")
        .find((row) => row.startsWith("waesy_active_context="))
        ?.split("=")[1]) ||
    "civil";

  const handleSwitchContext = (type: "civil" | "store" | "courier" | "creator") => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.document.cookie = `waesy_active_context=${type}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (type === "civil") navigate({ to: "/conta" });
    else if (type === "store") navigate({ to: "/workspace" as any });
    else if (type === "courier") navigate({ to: "/conta/entregador" as any });
    else if (type === "creator") navigate({ to: "/afiliados" as any });
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate({ to: path as any });
  };

  const handleLogout = async () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=; path=/; max-age=0";
      window.location.href = "/entrar";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header */}
        <SheetHeader className="px-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Minha Conta e Perfis
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Alterne de contexto ou gerencie seus serviços
            </p>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-12 pb-safe">
          {isAuthenticated ? (
            <>
              {/* Card de Identidade do Usuário */}
              <div className="rounded-2xl border border-border/70 bg-card p-4 flex items-center gap-3 shadow-xs">
                <div className="size-12 min-w-12 min-h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-border/50">
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {userFullName}
                    </h3>
                    <CheckCircle className="size-4 text-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {username ? `@${username}` : user?.email}
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold capitalize shrink-0">
                  {currentContext === "store"
                    ? "Empresa"
                    : currentContext === "courier"
                    ? "Waesy Go"
                    : currentContext === "creator"
                    ? "Criador"
                    : "Civil"}
                </Badge>
              </div>

              {/* Seletor de Perfis e Contextos */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Alternar Identidade
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Perfil Civil */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("civil")}
                    className={cn(
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "civil"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="size-9 rounded-lg bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
                      <User className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">Conta Civil</span>
                      <span className="text-2xs text-muted-foreground truncate block">Pessoal e Compras</span>
                    </div>
                  </button>

                  {/* Perfil Empresas */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("store")}
                    className={cn(
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "store"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="size-9 rounded-lg bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
                      <Store className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">Empresas</span>
                      <span className="text-2xs text-muted-foreground truncate block">Vendas e Gestão</span>
                    </div>
                  </button>

                  {/* Perfil Waesy Go */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("courier")}
                    className={cn(
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "courier"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="size-9 rounded-lg bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
                      <Bike className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">Waesy Go</span>
                      <span className="text-2xs text-muted-foreground truncate block">Motorista e Entregas</span>
                    </div>
                  </button>

                  {/* Perfil Criador */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("creator")}
                    className={cn(
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      currentContext === "creator"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <div className="size-9 rounded-lg bg-background/80 border border-border/40 flex items-center justify-center shrink-0">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">Criadores</span>
                      <span className="text-2xs text-muted-foreground truncate block">Afiliados e Mídias</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Atalhos Rápidos da Conta */}
              <div className="space-y-1 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Serviços Pessoais
                </span>

                <button
                  type="button"
                  onClick={() => handleNavigate("/conta/financas")}
                  className="w-full h-12 min-h-12 px-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <Wallet className="size-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">Carteira e Finanças</span>
                      <span className="text-2xs text-muted-foreground block">Saldo, Pix e Pagamentos</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate("/conta/pedidos")}
                  className="w-full h-12 min-h-12 px-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <ShoppingBag className="size-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">Minhas Compras</span>
                      <span className="text-2xs text-muted-foreground block">Pedidos e Rastreamento</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate("/conta/enderecos")}
                  className="w-full h-12 min-h-12 px-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <MapPin className="size-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">Endereços Salvos</span>
                      <span className="text-2xs text-muted-foreground block">Locais de Entrega</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate("/conta/seguranca")}
                  className="w-full h-12 min-h-12 px-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">Segurança e Senha</span>
                      <span className="text-2xs text-muted-foreground block">Autenticação e Dispositivos</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate("/conta/suporte")}
                  className="w-full h-12 min-h-12 px-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                      <HelpCircle className="size-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block text-foreground">Central de Ajuda</span>
                      <span className="text-2xs text-muted-foreground block">FAQ e Atendimento</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>

              {/* Botão de Desconectar */}
              <div className="pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full h-11 min-h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center justify-center gap-2 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
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
