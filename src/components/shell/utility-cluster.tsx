import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Search, ShoppingBag, Bell, LogOut, User, Store, Check, Plus, LayoutDashboard, Settings, Package, Tag, Bookmark, Edit3, ArrowUpRight, ShieldAlert, Shield, MessageSquare, Ticket, Calendar, Award, ChevronRight, HelpCircle, Lock, RefreshCw, Layers, Bike, DollarSign, TrendingUp, Building2, Sparkles, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/services/auth.functions";
import { setTenantContext } from "@/services/identity.functions";
import { useCartContext } from "@/lib/cart-context";
import { useQuery } from "@tanstack/react-query";
import { getMyCreatorProfilesList } from "@/services/affiliates.functions";
import { GlobalMenuHub } from "@/components/shell/global-menu-hub";
import { toast } from "sonner";

export interface UtilityClusterProps {
  session?: any;
  embedded?: boolean;
}

export function UtilityCluster({ session, embedded = false }: UtilityClusterProps) {
  const router = useRouter();
  const { setIsCartOpen, globalCarts } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const handleSwitchCourier = () => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=courier; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
    }
    toast.success("Modo Condutor (Waesy Go) ativado");
    window.location.href = "/conta/entregador";
  };

  const handleOpenWorkspace = async (targetStoreId?: string) => {
    const storeId = targetStoreId || activeStoreId || memberships[0]?.store_id;
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=store; path=/; max-age=31536000; SameSite=Lax";
      if (storeId) {
        window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
      }
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
    }
    if (storeId) {
      await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
    }
    toast.success("Acessando Workspace...");
    window.location.href = "/workspace";
  };

  const memberships = (session?.memberships as any[]) || [];
  const activeStoreId = session?.store_id;
  const totalItemCount = globalCarts.reduce((acc, c) => acc + c.itemCount, 0);

  // ── Identity extraction: SEMPRE identidade pessoal do usuário
  const userMeta = session?.user?.user_metadata || {};
  const userName =
    userMeta?.full_name ||
    session?.user?.email?.split("@")[0] ||
    session?.email?.split("@")[0] ||
    "Membro Waesy";
  const userHandle =
    userMeta?.username ||
    session?.user?.email?.split("@")[0] ||
    session?.email?.split("@")[0] ||
    "membro";
  const userAvatar = userMeta?.avatar_url || session?.user?.avatar_url || session?.avatar_url || session?.profile?.avatar_url || "";
  const userInitial = userName.charAt(0).toUpperCase();
  const isPlatformAdmin =
    session?.role === "platform_admin" ||
    session?.role === "master" ||
    session?.role === "admin" ||
    session?.user?.role === "platform_admin" ||
    userMeta?.role === "platform_admin" ||
    userMeta?.role === "master" ||
    userMeta?.role === "admin";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    router.navigate({
      to: "/buscar",
      search: { q: searchQuery.trim() },
    });
  };

  const { data: creatorProfiles = [] } = useQuery({
    queryKey: ["my-creator-profiles-list"],
    queryFn: () => getMyCreatorProfilesList(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  const rawContext = typeof window !== "undefined"
    ? (document.cookie.match(/waesy_active_context=([^;]+)/)?.[1] as any) || "civil"
    : "civil";
  const rawCreator = typeof window !== "undefined"
    ? document.cookie.match(/waesy_active_creator=([^;]+)/)?.[1] || null
    : null;
  const rawTenant = typeof window !== "undefined"
    ? document.cookie.match(/waesy_active_tenant=([^;]+)/)?.[1] || null
    : null;

  // Sanitização anti-fantasma (Auto-heal B7)
  let activeContext: "civil" | "store" | "creator" = rawContext;
  let activeCreatorId: string | null = null;

  if (activeContext === "creator") {
    if (creatorProfiles.length === 0) {
      activeContext = "civil";
      if (typeof window !== "undefined") {
        window.document.cookie = "waesy_active_context=civil; path=/; max-age=31536000; SameSite=Lax";
        window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
      }
    } else {
      const decodedRaw = rawCreator ? decodeURIComponent(rawCreator) : "";
      const matched = creatorProfiles.find((cp: any) => cp.handle === decodedRaw || cp.id === decodedRaw);
      if (matched?.handle) {
        activeCreatorId = matched.handle;
        if (decodedRaw === matched.id && typeof window !== "undefined") {
          window.document.cookie = `waesy_active_creator=${encodeURIComponent(matched.handle)}; path=/; max-age=31536000; SameSite=Lax`;
        }
      } else {
        activeCreatorId = creatorProfiles[0]?.handle || userHandle;
      }
    }
  }

  const activeStoreName = memberships.find((m: any) => m.store_id === (activeStoreId || rawTenant))?.name || "Minha Empresa";

  const handleSwitchCreator = (persona: any) => {
    const handleClean = persona.handle || persona.stage_name || "criador";
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=creator; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = `waesy_active_creator=${encodeURIComponent(handleClean)}; path=/; max-age=31536000; SameSite=Lax`;
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_store_id=; path=/; max-age=0; SameSite=Lax";
    }
    toast.success(`Contexto ativo: @${handleClean}`);
    setIsAccountOpen(false);
    window.location.href = "/conta/criadores";
  };

  const handleSwitchCivil = () => {
    if (typeof window !== "undefined") {
      window.document.cookie = "waesy_active_context=civil; path=/; max-age=31536000; SameSite=Lax";
      window.document.cookie = "waesy_active_tenant=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
      window.document.cookie = "waesy_store_id=; path=/; max-age=0; SameSite=Lax";
    }
    toast.success(`Contexto ativo: ${userName} (Conta Civil)`);
    setIsAccountOpen(false);
    window.location.href = "/conta";
  };

  const handleSwitchStore = async (storeId: string) => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      if (typeof window !== "undefined") {
        window.document.cookie = "waesy_active_context=store; path=/; max-age=31536000; SameSite=Lax";
        window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
        window.document.cookie = "waesy_active_creator=; path=/; max-age=0; SameSite=Lax";
      }
      await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
      toast.success("Acessando painel da empresa...");
      setIsAccountOpen(false);
      window.location.href = "/workspace";
    } catch {
      toast.error("Erro ao alternar loja.");
      setIsSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          const { getBrowserClient } = await import("@/lib/supabase");
          await getBrowserClient().auth.signOut().catch(() => {});
        } catch {}
      }
      await signOut();
      toast.success("Sessão encerrada.");
      window.location.href = "/";
    } catch {
      toast.error("Erro ao sair.");
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-1 sm:gap-2 shrink-0 ${
          embedded ? "" : "h-11 px-2 rounded-lg bg-card"
        }`}
      >
        {/* 1. Conversas / Chat Direto (Desktop >= 768px) */}
        {session && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex size-11 min-h-11 min-w-11 rounded-lg relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Conversas"
          >
            <Link to="/conta/conversas">
              <MessageSquare className="size-5" />
            </Link>
          </Button>
        )}

        {/* 2. Sacola de Compras (Desktop >= 768px) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCartOpen(true)}
          className="hidden md:inline-flex size-11 min-h-11 min-w-11 rounded-lg relative text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Sacola de Compras"
        >
          <ShoppingBag className="size-5" />
          {totalItemCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center animate-scale-in">
              {totalItemCount}
            </span>
          )}
        </Button>

        {/* 3. Notificações */}
        <NotificationsPopover session={session} />

        {/* 4. Alternador de Tema Dark/Light (Desktop >= 768px) */}
        <ThemeToggle className="hidden md:inline-flex size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />

        <div className="hidden md:block h-4 w-px bg-border/60 mx-1" />

        {/* 6. Perfil / Auth Trigger (Drawer Tátil Universal) */}
        {session ? (
          <div className="inline-flex">
            <button
              type="button"
              onClick={() => setIsAccountOpen(true)}
              className="size-11 min-h-11 min-w-11 shrink-0 rounded-full overflow-hidden border border-border/60 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:scale-105 active:scale-95 cursor-pointer bg-muted flex items-center justify-center p-0"
              aria-label="Abrir Menu de Perfil e Conta"
            >
              {userAvatar && !avatarError ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="size-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="size-full flex items-center justify-center bg-primary text-primary-foreground text-sm font-black">
                  {userInitial}
                </div>
              )}
            </button>

            {/* Sheet / Drawer Tátil Lateral */}
            <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}>
              <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border/50">
                {/* Header — Identidade Pessoal do Usuário */}
                <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20 flex items-center gap-3 shrink-0">
                  <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border/60">
                    {userAvatar && !avatarError ? (
                      <img src={userAvatar} alt={userName} className="size-full object-cover" />
                    ) : (
                      <span className="text-base font-black text-primary">{userInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-base font-bold text-foreground truncate leading-tight">
                      {userName}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground truncate font-mono">
                      @{userHandle}
                    </SheetDescription>
                    {isPlatformAdmin && (
                      <span className="inline-block mt-1 px-2 py-1 rounded text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        ADMIN MASTER
                      </span>
                    )}
                  </div>
                </div>

                {/* Pill de Contexto Ativo */}
                <div className="p-3 border-b border-border/40 bg-card shrink-0">
                  <div className="p-2 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 px-1 min-w-0">
                      {activeContext === "creator" ? (
                        <Award className="size-4 text-amber-500 shrink-0" />
                      ) : activeContext === "store" ? (
                        <Store className="size-4 text-primary shrink-0" />
                      ) : (
                        <User className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-semibold truncate text-foreground">
                        {activeContext === "creator"
                          ? `Criador: @${activeCreatorId || "ativo"}`
                          : activeContext === "store"
                          ? `Empresa: ${activeStoreName}`
                          : "Conta Civil Pessoal"}
                      </span>
                    </div>
                    {activeContext !== "civil" && (
                      <button
                        type="button"
                        onClick={handleSwitchCivil}
                        className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Voltar ao Civil
                      </button>
                    )}
                  </div>
                </div>

                {/* Conteúdo Contextual do Drawer com Alvo de Toque Canônico de 44px */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {/* ── CONTEXTO 1: MODO CRIADOR ATIVO ── */}
                  {activeContext === "creator" && (
                    <>
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        <span>Painel do Criador (@{activeCreatorId || "ativo"})</span>
                      </div>

                      <Link
                        to="/conta/criadores"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Award className="size-4 text-amber-500" />
                          <span>Minha Vitrine & Personas</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/afiliados"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Tag className="size-4 text-muted-foreground" />
                          <span>Links de Afiliado & Vitrines</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/financas"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <DollarSign className="size-4 text-muted-foreground" />
                          <span>Comissões & Repasses</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/metricas"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUp className="size-4 text-muted-foreground" />
                          <span>Métricas & Audiência</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/mural"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="size-4 text-muted-foreground" />
                          <span>Mural de Campanhas</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/seguranca"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="size-4 text-muted-foreground" />
                          <span>Segurança da Conta</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/suporte"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="size-4 text-muted-foreground" />
                          <span>Suporte ao Criador</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <div className="pt-4 mt-3 border-t border-border/40">
                        <button
                          type="button"
                          onClick={handleSwitchCivil}
                          className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted text-foreground transition-colors text-xs font-bold cursor-pointer border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ArrowRightLeft className="size-4 text-primary" />
                          <span>Voltar para Minha Conta Pessoal ({userName})</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── CONTEXTO 2: MODO EMPRESA ATIVO ── */}
                  {activeContext === "store" && (
                    <>
                      <div className="text-xs font-bold text-primary uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
                        <Building2 className="size-3.5" />
                        <span>Gestão: {activeStoreName}</span>
                      </div>

                      <Link
                        to="/workspace"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <LayoutDashboard className="size-4" />
                          <span>Acessar Painel Workspace</span>
                        </div>
                        <ArrowUpRight className="size-4" />
                      </Link>

                      <Link
                        to="/workspace/catalogo/produtos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="size-4 text-muted-foreground" />
                          <span>Catálogo & Produtos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/workspace/pedidos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="size-4 text-muted-foreground" />
                          <span>Pedidos Recebidos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/workspace/financeiro/caixa"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <DollarSign className="size-4 text-muted-foreground" />
                          <span>Financeiro & Caixa</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/perfil-da-loja"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Store className="size-4 text-muted-foreground" />
                          <span>Perfil Público no Marketplace</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/suporte"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="size-4 text-muted-foreground" />
                          <span>Suporte Corporativo</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <div className="pt-4 mt-3 border-t border-border/40">
                        <button
                          type="button"
                          onClick={handleSwitchCivil}
                          className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted text-foreground transition-colors text-xs font-bold cursor-pointer border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ArrowRightLeft className="size-4 text-primary" />
                          <span>Voltar para Minha Conta Pessoal ({userName})</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── CONTEXTO 3: CONTA CIVIL PESSOAL (ROOT TRANSACIONAL PADRÃO) ── */}
                  {activeContext === "civil" && (
                    <>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                        Minha Conta Pessoal
                      </div>

                      <Link
                        to="/conta"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <User className="size-4 text-muted-foreground" />
                          <span>Painel Geral</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/perfil"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Edit3 className="size-4 text-muted-foreground" />
                          <span>Perfil & Identidade</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/pedidos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="size-4 text-muted-foreground" />
                          <span>Meus Pedidos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/ingressos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Ticket className="size-4 text-muted-foreground" />
                          <span>Ingressos & Eventos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/agendamentos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="size-4 text-muted-foreground" />
                          <span>Agendamentos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/trocas"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <RefreshCw className="size-4 text-muted-foreground" />
                          <span>Trocas & Negociações</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/classificados"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="size-4 text-muted-foreground" />
                          <span>Meus Anúncios</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/salvos"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Bookmark className="size-4 text-muted-foreground" />
                          <span>Salvos & Favoritos</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/seguranca"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="size-4 text-muted-foreground" />
                          <span>Segurança & Acesso</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      <Link
                        to="/conta/suporte"
                        onClick={() => setIsAccountOpen(false)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between hover:bg-muted/60 transition-colors text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="size-4 text-muted-foreground" />
                          <span>Suporte & Ajuda</span>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60" />
                      </Link>

                      {/* Seção Gestão & Negócios */}
                      <div className="pt-3 border-t border-border/40 mt-2">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                          Gestão & Outros Perfis
                        </div>

                        {isPlatformAdmin && (
                          <Link
                            to="/admin-master"
                            onClick={() => setIsAccountOpen(false)}
                            className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors text-xs font-bold mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="flex items-center gap-3">
                              <ShieldAlert className="size-4" />
                              <span>Painel Global Master</span>
                            </div>
                            <ArrowUpRight className="size-4" />
                          </Link>
                        )}

                        {creatorProfiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSwitchCreator(creatorProfiles[0])}
                            className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors text-xs font-bold mb-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="flex items-center gap-3">
                              <Award className="size-4 text-amber-500" />
                              <span>Alternar para @{creatorProfiles[0].handle} (Criador)</span>
                            </div>
                            <ArrowUpRight className="size-4" />
                          </button>
                        )}

                        {memberships.length > 0 || isPlatformAdmin ? (
                          <Link
                            to="/workspace"
                            onClick={() => setIsAccountOpen(false)}
                            className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between bg-foreground text-background hover:bg-foreground/90 transition-colors text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="flex items-center gap-3">
                              <LayoutDashboard className="size-4" />
                              <span>Acessar Workspace</span>
                            </div>
                            <ArrowUpRight className="size-4" />
                          </Link>
                        ) : (
                          <Link
                            to="/criar-negocio"
                            onClick={() => setIsAccountOpen(false)}
                            className="w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <div className="flex items-center gap-3">
                              <Plus className="size-4" />
                              <span>Criar Minha Empresa</span>
                            </div>
                            <ArrowUpRight className="size-4" />
                          </Link>
                        )}

                        {memberships.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {memberships.slice(0, 3).map((m: any) => {
                              const isCurrent = m.store_id === activeStoreId;
                              return (
                                <button
                                  key={m.store_id}
                                  type="button"
                                  disabled={isSwitching}
                                  onClick={() => handleSwitchStore(m.store_id)}
                                  className={cn(
                                    "w-full h-11 min-h-11 px-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    isCurrent
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "hover:bg-muted/60 text-foreground font-medium"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Store className="size-4 text-primary shrink-0" />
                                    <span className="truncate">{m.name || "Minha Loja"}</span>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-xs font-bold text-primary px-2 py-1 rounded bg-primary/20 shrink-0">
                                      Ativa
                                    </span>
                                  ) : (
                                    <ArrowUpRight className="size-3.5 text-muted-foreground/70 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Fixo: Sair */}
                <div className="p-3 border-t border-border/50 bg-muted/10 shrink-0">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full h-11 min-h-11 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <LogOut className="size-4" />
                    <span>Encerrar Sessão</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <Button
            asChild
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer active:scale-95 shrink-0"
          >
            <Link to="/entrar">Entrar</Link>
          </Button>
        )}
      </div>

      {/* Modal de Busca Rápida */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg sm:rounded-lg p-4 sm:top-[20%] sm:translate-y-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Buscar no Waesy</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar posts, produtos, classificados, eventos ou membros..."
              className="h-12 pl-10 pr-4 text-sm bg-muted/30 rounded-lg border-border focus-visible:ring-primary"
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
