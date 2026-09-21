/**
 * MobileNav — Barra de Navegação Mobile Unificada (Waesy Platform)
 *
 * Design System: Waesy — Anti-AI-Smell, Apple HIG, BigTech Board Compliant
 * Ref: Especificação do usuário & Foto de Referência (Waesy project):
 *  - Linha única flutuante (floating dock com squircle/pill e blur)
 *  - Botão [+] fixo à esquerda, contextual por módulo (classificados, feed, mercado bloqueado)
 *  - Seção central com rolagem horizontal (overflow-x-auto) sem sobrepor os botões fixos
 *  - Botões grandes, escrita grande, tipografia em fonte Inter (font-sans font-medium text-sm)
 *  - Quando há itens no carrinho: botão Carrinho fica FIXO ao lado da foto de perfil
 *  - Quando há pedidos ativos para rastrear: botão Pedidos fica FIXO ao lado da foto de perfil
 *  - Quando vazios: Carrinho e Pedidos permanecem na seção com scroll horizontal
 *  - Atalhos Secundários integrados: Pedidos | Carrinho | Agenda | Ingressos | Salvos | Negociações
 *  - Avatar/Perfil: 1 toque → perfil público | segurar 500ms → editar | 2 toques → central da conta
 *  - Admin Mode: ícone Shield ao lado do avatar (apenas platform_admin) → transforma o nav em admin bar
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  MessageCircle,
  Plus,
  ShoppingBag,
  ShoppingCart,
  CalendarDays,
  Ticket,
  Bookmark,
  Handshake,
  LogIn,
  Wallet,
  Coins,
  MessageSquare,
  Shield,
  ArrowLeft,
  Sliders,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { QuickCreateModal } from "@/components/commerce/quick-create-modal";
import { useCartContext } from "@/lib/cart-context";
import { listCustomerOrders } from "@/services/order.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  session?: any;
  userRole?: string | null;
}

// ── Mapa de nichos para o Admin Mode ─────────────────────────────────────────
const ROUTE_NICHE_MAP: Record<string, { id: string; label: string }> = {
  "/": { id: "home", label: "Início" },
  "/explorar": { id: "home", label: "Explorar" },
  "/mercado": { id: "mercado", label: "Mercado" },
  "/gastronomia": { id: "gastronomia", label: "Gastronomia" },
  "/farmacia": { id: "farmacia", label: "Farmácia" },
  "/bebidas": { id: "bebidas", label: "Bebidas" },
  "/moda": { id: "moda", label: "Moda" },
  "/feed": { id: "feed", label: "Feed" },
  "/noticias": { id: "noticias", label: "Notícias" },
  "/eventos": { id: "eventos", label: "Eventos" },
  "/turismo": { id: "turismo", label: "Turismo" },
  "/classificados": { id: "classificados", label: "Classificados" },
  "/diretorio": { id: "diretorio", label: "Diretório" },
  "/ofertas": { id: "ofertas", label: "Ofertas" },
};

// ── Lógica Contextual do Botão + ─────────────────────────────────────────────
type CreateContext = {
  label: string;
  disabled: boolean;
  disabledReason?: string;
  useQuickCreate?: boolean;
  navigateTo?: string;
};

function resolveCreateContext(pathname: string): CreateContext {
  const path = pathname || "";
  if (path.startsWith("/classificados")) {
    return {
      label: "Publicar anúncio",
      disabled: false,
      navigateTo: "/conta/classificados/novo",
    };
  }
  if (path.startsWith("/empregos")) {
    return {
      label: "Publicar vaga",
      disabled: false,
      navigateTo: "/workspace/empregos/candidatos",
    };
  }
  if (path.startsWith("/turismo")) {
    return {
      label: "Criar pacote",
      disabled: false,
      navigateTo: "/workspace/turismo/viagens",
    };
  }
  if (path.startsWith("/eventos") || path.startsWith("/evento")) {
    return {
      label: "Criar evento",
      disabled: false,
      navigateTo: "/workspace/eventos",
    };
  }
  if (path.startsWith("/agenda")) {
    return {
      label: "Novo agendamento",
      disabled: false,
      navigateTo: "/workspace/agenda",
    };
  }
  if (path.startsWith("/noticias")) {
    return {
      label: "Nova matéria",
      disabled: false,
      navigateTo: "/workspace/noticias/novo",
    };
  }
  if (path.startsWith("/conta/conversas")) {
    return {
      label: "Nova conversa",
      disabled: false,
      navigateTo: "/conta/conversas?nova=1",
    };
  }
  if (
    path.startsWith("/mercado") ||
    path.startsWith("/gastronomia") ||
    path.startsWith("/farmacia") ||
    path.startsWith("/bebidas")
  ) {
    return {
      label: "Só para empresas",
      disabled: true,
      disabledReason:
        "Publicação no Marketplace é exclusiva para lojas cadastradas no Workspace.",
    };
  }
  // Default: feed, mural, home, etc. Abre o QuickCreateModal
  return { label: "Criar & Anunciar", disabled: false, useQuickCreate: true };
}

export function MobileNav({ session, userRole }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const [adminMode, setAdminMode] = useState(false);

  const isFormPage =
    location.pathname.includes("/classificados/novo") ||
    location.pathname.endsWith("/novo") ||
    location.pathname.endsWith("/editar") ||
    location.pathname.includes("/catalogo/produtos/novo") ||
    location.pathname.includes("/marketing/anuncios/novo");

  const { globalCarts, cart } = useCartContext();

  const isAuthenticated = Boolean(session?.user || session?.id);
  const user = session?.user || session;
  const userAvatar = user?.user_metadata?.avatar_url || user?.avatar_url || "";
  const userFullName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Usuário";

  const userInitials =
    userFullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("") || "AW";

  // Total de itens no carrinho (global ou da loja corrente)
  const totalCartItems =
    globalCarts.reduce((acc, c) => acc + (c.itemCount || 0), 0) ||
    (cart?.itemCount ?? 0);
  const hasCartItems = totalCartItems > 0;

  // Estado de pedidos ativos para rastreamento
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrdersCount(0);
      return;
    }
    let isMounted = true;
    listCustomerOrders()
      .then((orders) => {
        if (!isMounted) return;
        const activeStatuses = [
          "awaiting_payment",
          "paid",
          "processing",
          "ready_for_pickup",
          "shipped",
        ];
        const active = (orders || []).filter((o: any) =>
          activeStatuses.includes(o.status)
        );
        setActiveOrdersCount(active.length);
      })
      .catch(() => {
        if (isMounted) setActiveOrdersCount(0);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  const hasActiveOrders = activeOrdersCount > 0;

  const userMeta = user?.user_metadata || {};
  const username =
    userMeta?.username ||
    user?.username ||
    (typeof user?.email === "string" ? user.email.split("@")[0] : null);
  const userId = session?.user?.id || user?.id;
  const publicProfileTarget = username || userId;

  // ── Verificação de Admin ───────────────────────────────────────────────────
  const isAdmin =
    userRole === "platform_admin" ||
    session?.role === "platform_admin" ||
    user?.app_metadata?.role === "platform_admin";

  // Fechar admin mode ao mudar de rota
  useEffect(() => {
    setAdminMode(false);
  }, [pathname]);

  // Niche ativo para exibição contextual no Admin Mode
  const activeNiche = ROUTE_NICHE_MAP[pathname] || { id: "all", label: "Vitrine" };

  // Atalhos Admin
  const adminShortcuts = [
    {
      id: "vitrines",
      label: "Vitrines",
      icon: Sliders,
      to: `/admin-master/vitrines?surface=${activeNiche.id}`,
      color: "text-primary",
      highlight: false,
    },
    {
      id: "banners",
      label: "Banners",
      icon: ImageIcon,
      to: `/admin-master/banners?placement=${activeNiche.id}`,
      color: "text-sky-500",
      highlight: false,
    },
    {
      id: "botoes",
      label: "Botões",
      icon: Layers,
      to: `/admin-master/botoes?module=${activeNiche.id}`,
      color: "text-amber-500",
      highlight: false,
    },
    {
      id: "master",
      label: "Master",
      icon: LayoutDashboard,
      to: "/admin-master",
      color: "text-primary",
      highlight: true,
    },
  ];

  // ── Gestos do Avatar / Botão Perfil (1 toque: público | segurar 500ms: editar | 2 toques: central /conta) ──
  const lastTapTimeRef = useRef<number>(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    didLongPressRef.current = false;
    setIsPressing(true);

    // Temporizador de clique segurado (500ms) → editar perfil
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      setIsPressing(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
      toast.info("Abrindo edição do perfil...", { duration: 1500 });
      navigate({ to: "/conta/perfil" });
    }, 500);
  }, [navigate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimerRef.current && !isPressing) return;
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsPressing(false);
    }
  }, [isPressing]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }

    const now = Date.now();
    const delta = now - lastTapTimeRef.current;

    // 2 cliques rápidos (< 280ms) → central da conta (/conta)
    if (delta < 280 && delta > 0 && singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
      lastTapTimeRef.current = 0;

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([25, 40, 25]);
        } catch {}
      }
      toast.info("Acessando Central da Conta...", { duration: 1200 });
      navigate({ to: "/conta" });
      return;
    }

    // 1 toque → perfil público (/membro/$id)
    lastTapTimeRef.current = now;
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
    }

    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      lastTapTimeRef.current = 0;

      if (publicProfileTarget) {
        navigate({
          to: "/membro/$id",
          params: { id: String(publicProfileTarget) },
        });
      } else {
        navigate({ to: "/conta/perfil" });
      }
    }, 280);
  }, [navigate, publicProfileTarget]);

  const handlePointerCancel = useCallback(() => {
    setIsPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    didLongPressRef.current = false;
  }, []);

  // ── Contexto do botão + ───────────────────────────────────────────────────
  const createCtx = resolveCreateContext(location.pathname);

  // ── Atalhos Secundários Dinâmicos ─────────────────────────────────────────
  // Se o Carrinho estiver com itens, ele sai da lista de scroll e vai para a área fixa à direita.
  // Se houver pedidos ativos, Pedidos sai da lista de scroll e vai para a área fixa à direita.
  const secondaryShortcuts = [
    {
      id: "pedidos",
      to: "/conta/pedidos",
      label: "Pedidos",
      icon: ShoppingBag,
      pinned: hasActiveOrders,
    },
    {
      id: "carrinho",
      to: "/carrinho",
      label: "Carrinho",
      icon: ShoppingCart,
      pinned: hasCartItems,
    },
    {
      id: "feed",
      to: "/feed",
      label: "Feed",
      icon: MessageSquare,
      pinned: false,
    },
    {
      id: "afiliados",
      to: "/afiliados",
      label: "Afiliados",
      icon: Coins,
      pinned: false,
    },
    {
      id: "financas",
      to: "/conta/financas",
      label: "Finanças",
      icon: Wallet,
      pinned: false,
    },
    {
      id: "agenda",
      to: "/conta/agendamentos",
      label: "Agenda",
      icon: CalendarDays,
      pinned: false,
    },
    {
      id: "ingressos",
      to: "/conta/ingressos",
      label: "Ingressos",
      icon: Ticket,
      pinned: false,
    },
    {
      id: "salvos",
      to: "/conta/salvos",
      label: "Salvos",
      icon: Bookmark,
      pinned: false,
    },
    {
      id: "negociacoes",
      to: "/conta/negociacoes",
      label: "Negociações",
      icon: Handshake,
      pinned: false,
    },
  ];

  // Filtra atalhos secundários que aparecem no scroll (os não-fixados)
  const scrollableSecondaryShortcuts = secondaryShortcuts.filter((s) => !s.pinned);

  // ── Active States ──────────────────────────────────────────────────────────
  const isHomeActive = location.pathname === "/";
  const isSearchActive =
    location.pathname.startsWith("/buscar") || location.pathname.startsWith("/diretorio");
  const isMessagesActive =
    location.pathname.startsWith("/conta/conversas") ||
    location.pathname.startsWith("/conta/suporte");
  const isProfileActive =
    location.pathname.startsWith("/conta/perfil") ||
    location.pathname.startsWith("/membro/") ||
    location.pathname === "/conta";
  if (isFormPage) {
    return null;
  }

  return (
    <div
      className="lg:hidden fixed bottom-2.5 inset-x-2.5 z-40 max-w-xl mx-auto select-none"
      style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 6px), 10px)" }}
    >
      <nav
        aria-label={adminMode ? "Navegação Admin Master" : "Navegação principal mobile"}
        className="flex items-center gap-1.5 p-1.5 bg-background border border-border/70 shadow-xs rounded-[24px] transition-all duration-200"
      >
        {/* ── ADMIN MODE BAR ── */}
        {adminMode && (
          <>
            {/* Botão ← Voltar */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setAdminMode(false)}
                aria-label="Voltar à navegação normal"
                className="h-11 w-11 shrink-0 rounded-2xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center border border-border/40 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft className="size-5 stroke-[2]" />
              </button>
            </div>

            {/* Atalhos Admin com scroll horizontal */}
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 px-1">
              {/* Label contextual do nicho atual */}
              <div className="shrink-0 flex items-center gap-1.5 h-11 px-3 rounded-2xl bg-primary/8 border border-primary/20">
                <Shield className="size-3.5 text-primary" />
                <span className="text-[12px] font-semibold text-primary whitespace-nowrap">
                  {activeNiche.label}
                </span>
              </div>

              {adminShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <Link
                    key={shortcut.id}
                    to={shortcut.to as any}
                    aria-label={shortcut.label}
                    className={cn(
                      "h-11 px-3.5 rounded-2xl font-sans font-medium text-[13.5px] flex items-center gap-2 shrink-0 transition-all active:scale-95",
                      shortcut.highlight
                        ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                        : "bg-muted/40 hover:bg-muted/70 text-foreground/85 hover:text-foreground border border-border/30"
                    )}
                  >
                    <Icon className={cn("size-[17px]", !shortcut.highlight && shortcut.color)} />
                    <span className="whitespace-nowrap">{shortcut.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Separador + Ícone shield fixo à direita */}
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-6 w-px bg-border/60 mx-0.5 shrink-0" />
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Shield className="size-4.5 text-primary" />
              </div>
            </div>
          </>
        )}

        {/* ── MODO NORMAL ── */}
        {!adminMode && (
          <>
        {/* ── 1. BOTÃO [+] FIXO À ESQUERDA (Não se move, contextual por módulo) ── */}
        <div className="shrink-0">
          {createCtx.useQuickCreate ? (
            <QuickCreateModal
              isAuthenticated={isAuthenticated}
              session={session}
              asNavButton={true}
            />
          ) : createCtx.disabled ? (
            <button
              type="button"
              onClick={() => toast.info(createCtx.disabledReason)}
              aria-label={createCtx.label}
              title={createCtx.disabledReason}
              className="h-11 w-11 shrink-0 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center border border-border/40 cursor-not-allowed opacity-50"
            >
              <Plus className="size-5.5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (createCtx.navigateTo?.includes("nova=1")) {
                  window.dispatchEvent(new CustomEvent("open-new-chat-dialog"));
                  return;
                }
                if (!isAuthenticated) {
                  toast.info("Acesse sua conta para continuar.");
                  navigate({
                    to: "/entrar",
                    search: { returnUrl: createCtx.navigateTo || location.pathname },
                  });
                  return;
                }
                if (createCtx.navigateTo) {
                  navigate({ to: createCtx.navigateTo as any });
                }
              }}
              aria-label={createCtx.label}
              className="h-11 w-11 shrink-0 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center justify-center border border-border/50 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="size-5.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* ── 2. SEÇÃO COM SCROLL HORIZONTAL NA MESMA LINHA (Não sobrepõe botões fixos) ── */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 px-1">
          {/* A. Início */}
          <Link
            to="/"
            className={cn(
              "h-11 px-3.5 rounded-2xl font-sans font-medium text-[13.5px] flex items-center gap-2 shrink-0 transition-all active:scale-95",
              isHomeActive
                ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                : "bg-muted/40 hover:bg-muted/70 text-foreground/85 hover:text-foreground border border-border/30"
            )}
          >
            <Home className="size-[18px]" strokeWidth={isHomeActive ? 2.25 : 1.75} />
            <span className="whitespace-nowrap">Início</span>
          </Link>

          {/* B. Explorar / Busca */}
          <Link
            to="/buscar"
            className={cn(
              "h-11 px-3.5 rounded-2xl font-sans font-medium text-[13.5px] flex items-center gap-2 shrink-0 transition-all active:scale-95",
              isSearchActive
                ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                : "bg-muted/40 hover:bg-muted/70 text-foreground/85 hover:text-foreground border border-border/30"
            )}
          >
            <Search className="size-[18px]" strokeWidth={isSearchActive ? 2.25 : 1.75} />
            <span className="whitespace-nowrap">Explorar</span>
          </Link>

          {/* C. Mensagens (antigo Atendimento/Chat) */}
          <Link
            to={isAuthenticated ? "/conta/conversas" : "/entrar"}
            className={cn(
              "h-11 px-3.5 rounded-2xl font-sans font-medium text-[13.5px] flex items-center gap-2 shrink-0 transition-all active:scale-95",
              isMessagesActive
                ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                : "bg-muted/40 hover:bg-muted/70 text-foreground/85 hover:text-foreground border border-border/30"
            )}
          >
            <MessageCircle
              className="size-[18px]"
              strokeWidth={isMessagesActive ? 2.25 : 1.75}
            />
            <span className="whitespace-nowrap">Mensagens</span>
          </Link>

          {/* D. Atalhos Secundários com Scroll Horizontal (Quando Logado) */}
          {isAuthenticated &&
            scrollableSecondaryShortcuts.map((s) => {
              const Icon = s.icon;
              const isActive = (location.pathname || "").startsWith(s.to);
              return (
                <Link
                  key={s.id}
                  to={s.to as any}
                  className={cn(
                    "h-11 px-3.5 rounded-2xl font-sans font-medium text-[13.5px] flex items-center gap-2 shrink-0 transition-all active:scale-95",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/25 font-bold"
                      : "bg-muted/40 hover:bg-muted/70 text-foreground/85 hover:text-foreground border border-border/30"
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="whitespace-nowrap">{s.label}</span>
                </Link>
              );
            })}
        </div>

        {/* ── 3. BOTÕES FIXOS À DIREITA (Ao lado da foto de perfil) ── */}
        <div className="flex items-center gap-1 shrink-0 pl-0.5">
          {/* A. Botão Pedidos Fixo (Apenas quando há pedidos ativos para rastrear) */}
          {hasActiveOrders && (
            <Link
              to="/conta/pedidos"
              aria-label={`Pedidos ativos (${activeOrdersCount})`}
              title="Acompanhar e rastrear pedidos ativos"
              className={cn(
                "h-11 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/40 flex items-center gap-1.5 shrink-0 font-sans font-semibold text-[13px] active:scale-95 transition-all relative animate-in fade-in zoom-in-95",
                location.pathname.startsWith("/conta/pedidos") &&
                  "ring-2 ring-amber-500"
              )}
            >
              <div className="relative">
                <ShoppingBag className="size-4.5" />
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 animate-ping" />
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
              </div>
              <span className="whitespace-nowrap font-sans font-medium">Pedidos</span>
              <span className="size-4.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeOrdersCount}
              </span>
            </Link>
          )}

          {/* B. Botão Carrinho Fixo (Apenas quando há itens no carrinho) */}
          {hasCartItems && (
            <Link
              to="/carrinho"
              aria-label={`Carrinho (${totalCartItems} itens)`}
              title="Ver meu carrinho"
              className={cn(
                "h-11 px-3 rounded-2xl bg-primary text-primary-foreground flex items-center gap-1.5 shrink-0 font-sans font-semibold text-[13px] shadow-sm active:scale-95 transition-all relative animate-in fade-in zoom-in-95",
                location.pathname === "/carrinho" && "ring-2 ring-foreground"
              )}
            >
              <ShoppingCart className="size-4.5" />
              <span className="whitespace-nowrap font-sans font-medium">Carrinho</span>
              <span className="size-4.5 rounded-full bg-background text-foreground text-[10px] font-black flex items-center justify-center">
                {totalCartItems > 99 ? "99+" : totalCartItems}
              </span>
            </Link>
          )}

          {/* C. Divisor Vertical Sutil */}
          <div className="h-6 w-px bg-border/60 mx-0.5 shrink-0" />

          {/* D. Foto de Perfil / Botão Entrar (Fixo no extremo direito) */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              {/* Shield Admin Toggle (apenas platform_admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAdminMode(true)}
                  aria-label="Ativar modo Admin Master"
                  title="Admin Master — clique para acessar controles de governança"
                  className="h-11 w-11 shrink-0 rounded-2xl bg-primary/8 hover:bg-primary/15 border border-primary/25 flex items-center justify-center active:scale-95 transition-all cursor-pointer relative"
                >
                  <Shield className="size-4 text-primary" />
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                </button>
              )}

              {/* Avatar / Perfil */}
              <button
                type="button"
                aria-label="Perfil (1 toque: perfil público, segurar: editar perfil, 2 toques: central da conta)"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
                className={cn(
                  "h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative select-none",
                  isProfileActive
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border/80",
                  isPressing ? "scale-90 opacity-75 ring-2 ring-primary" : "active:scale-95"
                )}
              >
                {userAvatar ? (
                  <div className="size-full rounded-2xl overflow-hidden">
                    <img
                      src={userAvatar}
                      alt={userFullName}
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-full rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-sans font-bold text-xs tracking-tight">
                    {userInitials}
                  </div>
                )}
                {/* Distintivo de status visual no canto inferior */}
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[8px] font-black text-foreground flex items-center justify-center border border-background shadow-xs">
                  P
                </span>
              </button>
            </div>
          ) : (
            <Link
              to="/entrar"
              aria-label="Entrar na conta"
              className="h-11 px-3.5 rounded-2xl bg-foreground text-background font-sans font-medium text-[13.5px] flex items-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-xs"
            >
              <LogIn className="size-4.5" />
              <span className="whitespace-nowrap">Entrar</span>
            </Link>
          )}
        </div>
      </>
      )}
      </nav>
    </div>
  );
}
