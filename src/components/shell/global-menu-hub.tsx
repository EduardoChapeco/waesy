/**
 * GlobalMenuHub — Hub de Navegação e Módulos do Ecossistema (Waesy Platform)
 *
 * Design System: Apple HIG / Super App Hub Pattern / WhatsApp Minimalist List
 * - Substitui barras inferiores sobrecarregadas por uma tela limpa e organizada.
 * - Touch targets >= 44px (h-12 / min-h-[48px]) com active:scale-[0.98].
 * - Agrupamento canônico de módulos: Minha Atividade, Serviços Regionais, Negócios e Conta.
 */

import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
  Tag,
  Bookmark,
  Handshake,
  Compass,
  Briefcase,
  CalendarDays,
  Ticket,
  MapPin,
  Coins,
  Gift,
  Store,
  LayoutDashboard,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] max-h-[92dvh] sm:max-h-[85vh] p-0 flex flex-col rounded-t-[28px] border-t border-border bg-background overflow-hidden"
      >
        {/* Puxador tátil do sheet (Apple HIG Grab Handle) */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2.5 shrink-0" />

        <SheetHeader className="px-5 pb-3 border-b border-border/50 text-left flex flex-row items-center justify-between">
          <SheetTitle className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Menu Principal</span>
            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20">
              Waesy Hub
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Conteúdo com Scroll Nativo Suave */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar">
          {/* ── 1. CARTÃO DE IDENTIDADE DO USUÁRIO ── */}
          {isAuthenticated ? (
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-13 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border border-border/50">
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Sparkles className="size-3" />
                      Membro Waesy
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Shield className="size-3" />
                        Admin Master
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleNavigate(
                      publicProfileTarget ? "/membro/$id" : "/conta/perfil",
                      publicProfileTarget ? { id: String(publicProfileTarget) } : undefined
                    )
                  }
                  className="h-10 rounded-xl text-xs font-semibold gap-1.5 justify-center border-border/70 hover:bg-muted"
                >
                  <User className="size-3.5 text-muted-foreground" />
                  <span>Ver Perfil</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate("/conta/perfil")}
                  className="h-10 rounded-xl text-xs font-semibold gap-1.5 justify-center border-border/70 hover:bg-muted"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Editar Dados</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card p-4 text-center space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Acesse sua conta no Waesy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Acompanhe seus pedidos, converse com lojistas e publique anúncios.
                </p>
              </div>
              <Button
                onClick={() => handleNavigate("/entrar")}
                className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
              >
                Entrar ou Criar Conta
              </Button>
            </div>
          )}

          {/* ── 2. SEÇÃO: MINHA ATIVIDADE E COMPRAS ── */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Minha Atividade
            </span>
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/40 overflow-hidden">
              {/* Meus Pedidos */}
              <button
                type="button"
                onClick={() => handleNavigate("/conta/pedidos")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Meus Pedidos
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Rastrear entregas e histórico de compras
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeOrdersCount > 0 && (
                    <Badge className="bg-amber-500 text-white text-[11px] font-black h-5 px-2">
                      {activeOrdersCount} ativo{activeOrdersCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>

              {/* Carrinho / Sacola */}
              <button
                type="button"
                onClick={() => handleNavigate("/carrinho")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShoppingCart className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Carrinho de Compras
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Itens salvos para finalização de pedido
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {totalCartItems > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[11px] font-black h-5 px-2">
                      {totalCartItems}
                    </Badge>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>

              {/* Mensagens & Conversas */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(isAuthenticated ? "/conta/conversas" : "/entrar")
                }
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <MessageCircle className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Mensagens & Conversas
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Atendimento direto com lojistas e suporte
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Meus Anúncios / Classificados */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(isAuthenticated ? "/conta/classificados" : "/entrar")
                }
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Tag className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Meus Anúncios & Desapegos
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Gerenciar classificados publicados
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Itens Salvos */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(isAuthenticated ? "/conta/salvos" : "/entrar")
                }
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Bookmark className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Itens Salvos & Favoritos
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Produtos e locais marcados
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Negociações & Propostas */}
              <button
                type="button"
                onClick={() =>
                  handleNavigate(isAuthenticated ? "/conta/negociacoes" : "/entrar")
                }
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Handshake className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Negociações & Ofertas
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Propostas de compra e desapegos
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          {/* ── 3. SEÇÃO: SERVIÇOS & ECOSSISTEMA REGIONAL ── */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Serviços Regionais
            </span>
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/40 overflow-hidden">
              {/* Turismo & Roteiros */}
              <button
                type="button"
                onClick={() => handleNavigate("/turismo")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Compass className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Turismo & Roteiros
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Pacotes, passagens e turismo regional
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Empregos & Oportunidades */}
              <button
                type="button"
                onClick={() => handleNavigate("/empregos")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Briefcase className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Empregos & Oportunidades
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Vagas abertas e candidaturas locais
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Agenda de Atendimentos */}
              <button
                type="button"
                onClick={() => handleNavigate("/agenda")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <CalendarDays className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Agenda de Atendimentos
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Agendamentos de beleza, saúde e serviços
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Ingressos & Shows Circuito 2027 */}
              <button
                type="button"
                onClick={() => handleNavigate("/eventos")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    <Ticket className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Eventos & Shows
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Ingressos digitais e atrações confirmadas
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Diretório Comercial */}
              <button
                type="button"
                onClick={() => handleNavigate("/diretorio")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Diretório Comercial
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Guia de empresas, telefones e comércios locais
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Central de Afiliados */}
              <button
                type="button"
                onClick={() => handleNavigate("/afiliados")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Coins className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Central de Afiliados
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Ganhe comissões indicando negócios locais
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Doações & Comunidade */}
              <button
                type="button"
                onClick={() => handleNavigate("/doacoes")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Gift className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Doações & Comunidade
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Desapego solidário e causas comunitárias
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          {/* ── 4. SEÇÃO: NEGÓCIOS & GOVERNANÇA ── */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Negócios & Operação
            </span>
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/40 overflow-hidden">
              {/* Cadastrar Minha Loja */}
              <button
                type="button"
                onClick={() => handleNavigate("/criar-negocio")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Store className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Cadastrar Minha Loja
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Crie sua vitrine digital e venda no Waesy
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Workspace da Loja */}
              <button
                type="button"
                onClick={() => handleNavigate("/workspace")}
                className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Workspace da Empresa
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      Painel de controle para gestores e lojistas
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {/* Admin Master (apenas platform_admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin-master")}
                  className="w-full min-h-[50px] px-3.5 py-3 flex items-center justify-between bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Shield className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-primary block">
                        Painel Admin Master
                      </span>
                      <span className="text-xs text-muted-foreground block truncate">
                        Governança total da plataforma Waesy
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-primary shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* ── 5. SEÇÃO: PREFERÊNCIAS & CONTA ── */}
          <div className="space-y-1.5 pt-1">
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => handleNavigate(isAuthenticated ? "/conta" : "/entrar")}
                className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/50 active:scale-[0.98] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="size-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    Configurações da Conta
                  </span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between hover:bg-destructive/10 active:scale-[0.98] transition-all text-left cursor-pointer text-destructive"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <LogOut className="size-4" />
                    <span className="text-xs font-semibold">Sair da Conta</span>
                  </div>
                  <span className="text-[11px] text-destructive/70">Encerrar sessão</span>
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
