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
                  <div className="flex items-center gap-2">
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

              {/* Seletor de Perfis e Contextos (TetrisGrid 2x2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Alternar Identidade
                  </span>
                  <Badge variant="outline" className="text-2xs font-medium px-2 py-1">
                    Multi-Tenant
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Perfil Civil */}
                  <button
                    type="button"
                    onClick={() => handleSwitchContext("civil")}
                    className={cn(
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                      "h-14 min-h-14 px-3 rounded-xl border flex items-center gap-2 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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

              {/* Serviços Pessoais — Arquitetura TetrisGrid / Grade Modular */}
              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Serviços Pessoais
                </span>

                {/* Bloco 1: Destaques Hero 2x1 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/financas")}
                    className="h-20 min-h-11 p-3 rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col justify-between text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Wallet className="size-4" />
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-foreground leading-tight">Carteira & Saldo</span>
                      <span className="text-2xs text-muted-foreground block truncate">Pix e Pagamentos</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/pedidos")}
                    className="h-20 min-h-11 p-3 rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col justify-between text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <ShoppingBag className="size-4" />
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-foreground leading-tight">Pedidos & Compras</span>
                      <span className="text-2xs text-muted-foreground block truncate">Rastrear entrega</span>
                    </div>
                  </button>
                </div>

                {/* Bloco 2: Benefícios & Comunicação 2x1 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/creditos")}
                    className="h-16 min-h-11 px-3 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                      <Tag className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block text-foreground leading-tight truncate">Clube & Cupons</span>
                      <span className="text-2xs text-muted-foreground block truncate">Descontos ativos</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/conversas")}
                    className="h-16 min-h-11 px-3 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                      <MessageSquare className="size-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block text-foreground leading-tight truncate">Mensagens</span>
                      <span className="text-2xs text-muted-foreground block truncate">Avisos e chats</span>
                    </div>
                  </button>
                </div>

                {/* Bloco 3: Mosaico Tetris (Grid 2 a 3 Colunas Responsivo) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Salvos / Favoritos */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/salvos")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Bookmark className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Favoritos</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Itens salvos</span>
                  </button>

                  {/* Endereços */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/enderecos")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <MapPin className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Endereços</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Locais salvos</span>
                  </button>

                  {/* Meus Anúncios */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/classificados")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Store className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Anúncios</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Classificados</span>
                  </button>

                  {/* Ingressos */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/ingressos")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Ticket className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Ingressos</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Shows & eventos</span>
                  </button>

                  {/* Viagens */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/viagens")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plane className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Viagens</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Pacotes</span>
                  </button>

                  {/* Agendamentos */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/agendamentos")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Calendar className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Agendas</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Serviços</span>
                  </button>

                  {/* Waesy Go */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/mobilidade")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Car className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Waesy Go</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Caronas</span>
                  </button>

                  {/* Currículo */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/curriculo")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <FileText className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Currículo</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Carreiras</span>
                  </button>

                  {/* Tokens WZ */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/tokens")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Coins className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Tokens WZ</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Cashback</span>
                  </button>

                  {/* Carnês */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/carnes")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <CreditCard className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Carnês</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Faturas</span>
                  </button>

                  {/* Gift Cards */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/gift-cards")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Gift className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Gift Cards</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Presentes</span>
                  </button>

                  {/* Negociações */}
                  <button
                    type="button"
                    onClick={() => handleNavigate("/conta/negociacoes")}
                    className="h-20 min-h-11 p-2 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors flex flex-col justify-center items-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Handshake className="size-5 text-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground block truncate w-full">Trocas</span>
                    <span className="text-2xs text-muted-foreground block truncate w-full">Propostas</span>
                  </button>
                </div>

                {/* Bloco 4: Governança & Ajuda */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Governança & Ajuda
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/seguranca")}
                      className="h-11 min-h-11 px-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">Segurança & Senha</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/verificacao")}
                      className="h-11 min-h-11 px-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BadgeCheck className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">Verificação Civil</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate("/conta/suporte")}
                      className="h-11 min-h-11 px-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors flex items-center justify-between group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <HelpCircle className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate">Central de Ajuda</span>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                    </button>
                  </div>
                </div>
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
