/**
 * MobileNav — Barra de Navegação Mobile Unificada (Waesy Platform)
 *
 * Design System: Apple HIG / Material Design 3 / The Rule of 5
 * Ref: MASTER PROMPT V31:
 *  - ESTRUTURA FIXA DE 5 TABS (SEM SCROLL HORIZONTAL):
 *    [ Início ] | [ Explorar ] | [ + Criar/Publicar ] | [ Mensagens ] | [ Menu Hub ]
 *  - Touch targets mínimos de 44px (h-12) com feedback tátil (active:scale-95).
 *  - Previsibilidade total: 1 clique = 1 ação óbvia (erradicação do duplo-clique no avatar).
 *  - Super App Hub Pattern: Módulos secundários movidos para o <GlobalMenuHub>.
 *  - Smart Floating Cart: Botão de carrinho flutuante posicionado discretamente acima da nav bar quando há itens.
 *  - Resiliência a teclado virtual e safe areas do iOS/Android (paddingBottom clearance in AppShell pb-24).
 */

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  Flame,
  Compass,
  Users,
  ShoppingBag,
  User,
  Sparkles,
  Store,
  Tag,
  Newspaper,
  Calendar,
  Briefcase,
  Heart,
  Search,
} from "lucide-react";
import { getNavigationMenus } from "@/services/cms.functions";
import { useAccountSwitcherDrawer } from "@/lib/drawer-store";
import { AccountSwitcherDrawer } from "@/components/shell/AccountSwitcherDrawer";
import { GlobalQuickCreateModal, openQuickCreateModal } from "@/components/shell/GlobalQuickCreateModal";
import { WhatsAppUnifiedSearchModal } from "@/components/shell/WhatsAppUnifiedSearchModal";
import { useCartContext } from "@/lib/cart-context";
import { listCustomerOrders } from "@/services/order.functions";
import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ICON_LOOKUP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  messagecircle: MessageCircle,
  chat: MessageCircle,
  message: MessageCircle,
  flame: Flame,
  feed: Flame,
  fire: Flame,
  compass: Compass,
  explorar: Compass,
  explore: Compass,
  users: Users,
  comunidades: Users,
  shoppingbag: ShoppingBag,
  compras: ShoppingBag,
  bag: ShoppingBag,
  user: User,
  perfil: User,
  sparkles: Sparkles,
  destaque: Sparkles,
  store: Store,
  loja: Store,
  tag: Tag,
  oferta: Tag,
  newspaper: Newspaper,
  noticias: Newspaper,
  calendar: Calendar,
  agenda: Calendar,
  briefcase: Briefcase,
  servicos: Briefcase,
  heart: Heart,
  search: Search,
};

export interface MobileNavProps {
  session?: any;
  userRole?: string | null;
}

export function MobileNav({ session, userRole }: MobileNavProps) {
  const location = useLocation();
  const pathname = location.pathname || "";

  const { isOpen: isAccountSwitcherOpen, toggle: toggleAccountSwitcher } = useAccountSwitcherDrawer();

  // Páginas onde a barra deve ser suprimida (formulários densos)
  const isFormPage =
    pathname.includes("/classificados/novo") ||
    pathname.endsWith("/novo") ||
    pathname.endsWith("/editar") ||
    pathname.includes("/catalogo/produtos/novo") ||
    pathname.includes("/marketing/anuncios/novo");

  const { globalCarts, cart, setIsCartOpen } = useCartContext();

  const isAuthenticated = Boolean(session?.user || session?.id);
  const user = session?.user || session;
  const userAvatar =
    session?.avatarUrl ||
    session?.avatar_url ||
    user?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    "";
  const userInitials = (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "U"
  ).slice(0, 1).toUpperCase();

  // Total de itens no carrinho (global ou da loja corrente)
  const totalCartItems =
    globalCarts.reduce((acc, c) => acc + (c.itemCount || 0), 0) ||
    (cart?.itemCount ?? 0);
  const hasCartItems = totalCartItems > 0;

  // Subtotal do carrinho para exibição no floating button
  const cartSubtotal =
    globalCarts.reduce((acc, c) => acc + (c.subtotalCents || 0), 0) ||
    (cart?.subtotalCents ?? 0);

  const activeCartStoreLogo =
    (cart as any)?.storeLogoUrl ||
    (globalCarts[0] as any)?.storeLogoUrl ||
    null;

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
  }, [isAuthenticated, pathname]);

  // ── Active States das 5 Tabs Canônicas (Padrão SuperApp WeChat) ──────────
  const isChatActive =
    pathname.startsWith("/conta/conversas") || pathname.startsWith("/chat");
  const isFeedActive =
    pathname.startsWith("/feed") || pathname.startsWith("/mural");
  const isExploreActive =
    pathname.startsWith("/explorar");
  const isCommunitiesActive =
    pathname.startsWith("/comunidades") || pathname.startsWith("/c/");
  const isPurchasesActive =
    pathname.startsWith("/conta/pedidos") ||
    pathname.startsWith("/carrinho") ||
    pathname.startsWith("/checkout");
  const isProfileActive =
    isAccountSwitcherOpen ||
    pathname.startsWith("/conta/perfil") ||
    pathname.startsWith("/conta/financas");

  const purchasesBadgeCount = totalCartItems > 0 ? totalCartItems : activeOrdersCount;

  // ── Sincronização Dinâmica com CMS (/admin-master/cms & navigation_menus handle: bottom_nav) ──
  // empty: fallback para as 5 tabs fixas quando vazio
  const { data: navMenus, isLoading: isNavMenusLoading } = useQuery({
    queryKey: ["navigation-menus", "bottom_nav"],
    queryFn: () => getNavigationMenus().catch(() => []),
    staleTime: 60000,
  });

  const bottomNavMenu = (navMenus || []).find((m: any) => m.handle === "bottom_nav");
  const nowMs = Date.now();
  const cmsItems: any[] = (bottomNavMenu?.items || []).filter((item: any) => {
    if (!item || item.is_active === false || !item.url) return false;
    if (item.starts_at && new Date(item.starts_at).getTime() > nowMs) return false;
    if (item.ends_at && new Date(item.ends_at).getTime() < nowMs) return false;
    return true;
  });

  // ── Scroll-Aware Auto-Hide / Reveal ──────────────────────────────────────
  const [isNavHiddenByScroll, setIsNavHiddenByScroll] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const deltaY = currentY - lastScrollYRef.current;

      if (currentY <= 64 || deltaY < -6) {
        setIsNavHiddenByScroll(false);
      } else if (deltaY > 10 && currentY > 64) {
        setIsNavHiddenByScroll(true);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsNavHiddenByScroll(false);
  }, [pathname]);

  // ── Long-Press (500ms) para abrir GlobalQuickCreateModal ─────────────────
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      openQuickCreateModal(pathname);
    }, 500);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    clearLongPressTimer();
    openQuickCreateModal(pathname);
  };

  // ── Keyboard Resilience (Esconde nav quando teclado virtual abre) ─────────
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox")
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== "INPUT" &&
            active.tagName !== "TEXTAREA" &&
            !active.isContentEditable)
        ) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    const vv = window.visualViewport;
    const handleViewportResize = () => {
      if (vv) {
        const isShrunk = vv.height < window.innerHeight * 0.82;
        setIsKeyboardVisible(isShrunk);
      }
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    if (vv) {
      vv.addEventListener("resize", handleViewportResize);
    }

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      if (vv) {
        vv.removeEventListener("resize", handleViewportResize);
      }
    };
  }, []);

  return (
    <>
      {!isFormPage && !isKeyboardVisible && (
        /* ── BOTTOM NAVIGATION DOCK (PADRÃO SUPERAPP WECHAT 5 TABS + AUTO-HIDE) ── */
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
          onPointerCancel={clearLongPressTimer}
          onContextMenu={handleContextMenu}
          className={cn(
            "md:hidden fixed bottom-0 inset-x-0 z-30 pb-safe select-none mobile-nav-hide-on-keyboard bg-background border-t border-border/80 transition-transform duration-300",
            isNavHiddenByScroll
              ? "translate-y-full opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100 pointer-events-auto",
          )}
        >
          <div className="max-w-lg mx-auto">
            {/* ── 1. BARRA FLUTUANTE DE SACOLA (Acima das 5 Tabs quando há itens) ── */}
            {hasCartItems && (
              <div className="px-4 py-2 border-b border-border/60 bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-10 rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center shrink-0">
                    {activeCartStoreLogo ? (
                      <img src={activeCartStoreLogo} alt="" className="size-full object-cover" />
                    ) : (
                      <ShoppingBag className="size-5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-2xs text-muted-foreground font-medium leading-tight">
                      Total sem a entrega
                    </span>
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="text-sm font-black text-foreground">
                        {formatCents(cartSubtotal)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        / {totalCartItems} {totalCartItems === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label={`Ver sacola com ${totalCartItems} itens`}
                  className="h-11 min-h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-extrabold flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ver sacola
                </button>
              </div>
            )}

            {/* ── 2. NAVEGAÇÃO MOBILE (CONECTADA AO CMS OU 5 TABS CANÔNICAS DE FALLBACK) ── */}
            <nav
              aria-label="Navegação principal móvel"
              className="flex items-stretch justify-around px-1 py-1 bg-background"
            >
              {cmsItems.length > 0 ? (
                cmsItems.map((item: any, idx: number) => {
                  const isProfileItem =
                    item.action === "profile" ||
                    item.url === "/conta/perfil" ||
                    item.url === "/perfil" ||
                    item.url === "/conta";
                  const isPurchasesItem =
                    item.url === "/conta/pedidos" ||
                    item.url === "/compras" ||
                    item.url === "/carrinho";
                  const isItemActive =
                    item.url === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.url);
                  const iconKey = (item.icon || "").toLowerCase().replace(/[^a-z]/g, "");
                  const ResolvedIcon = ICON_LOOKUP[iconKey] || Compass;

                  if (isProfileItem) {
                    return (
                      <button
                        key={item.id || item.url || idx}
                        type="button"
                        onClick={toggleAccountSwitcher}
                        aria-label={item.label || "Perfil"}
                        className={cn(
                          "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isProfileActive || isItemActive
                            ? "text-foreground font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="relative flex items-center justify-center">
                          {isAuthenticated ? (
                            userAvatar ? (
                              <div
                                className={cn(
                                  "size-6 rounded-full overflow-hidden transition-colors duration-200 flex items-center justify-center bg-muted",
                                  isProfileActive || isItemActive
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : "ring-1 ring-border/60 hover:ring-foreground/40"
                                )}
                              >
                                <img
                                  src={userAvatar}
                                  alt={item.label || "Perfil"}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "size-6 rounded-full bg-muted text-foreground text-3xs font-bold flex items-center justify-center transition-colors duration-200",
                                  isProfileActive || isItemActive
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : "ring-1 ring-border/60"
                                )}
                              >
                                {userInitials}
                              </div>
                            )
                          ) : (
                            <User className="size-5" strokeWidth={isProfileActive || isItemActive ? 2.5 : 1.75} />
                          )}
                        </div>
                        <span className="text-2xs font-semibold tracking-tight leading-none">
                          {item.label || "Perfil"}
                        </span>
                      </button>
                    );
                  }

                  const badgeVal = isPurchasesItem
                    ? purchasesBadgeCount
                    : item.badge_text || item.badge;
                  const customIconUrl =
                    typeof item.image_url === "string" &&
                    (item.image_url.startsWith("http") || item.image_url.startsWith("/"))
                      ? item.image_url.trim()
                      : typeof item.icon === "string" &&
                          (item.icon.startsWith("http") || item.icon.startsWith("/"))
                        ? item.icon.trim()
                        : null;
                  const resolvedUrl =
                    isPurchasesItem && !isAuthenticated ? "/entrar" : item.url;

                  return (
                    <Link
                      key={item.id || item.url || idx}
                      to={resolvedUrl}
                      target={item.open_in_new_tab ? "_blank" : undefined}
                      rel={item.open_in_new_tab ? "noopener noreferrer" : undefined}
                      aria-label={item.label}
                      style={{
                        ...(item.bg_color ? { backgroundColor: item.bg_color } : {}),
                        ...(item.text_color ? { color: item.text_color } : {}),
                      }}
                      className={cn(
                        "h-12 min-h-11 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isItemActive
                          ? "text-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="relative flex items-center justify-center">
                        {customIconUrl ? (
                          <img
                            src={customIconUrl}
                            alt=""
                            className="size-5 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <ResolvedIcon className="size-5" strokeWidth={isItemActive ? 2.5 : 1.75} />
                        )}
                        {Boolean(badgeVal && String(badgeVal) !== "0") && (
                          <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-3xs font-black flex items-center justify-center">
                            {badgeVal}
                          </span>
                        )}
                      </div>
                      <span className="text-2xs font-semibold tracking-tight leading-none">
                        {item.label}
                      </span>
                    </Link>
                  );
                })
              ) : (
                /* Fallback Canônico: 5 Tabs Fixas */
                <>
                  {/* TAB 1: CHAT */}
                  <Link
                    to="/conta/conversas"
                    aria-label="Chat"
                    className={cn(
                      "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isChatActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MessageCircle className="size-5" strokeWidth={isChatActive ? 2.5 : 1.75} />
                    <span className="text-2xs font-semibold tracking-tight leading-none">Chat</span>
                  </Link>

                  {/* TAB 2: FEED */}
                  <Link
                    to="/feed"
                    aria-label="Feed"
                    className={cn(
                      "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isFeedActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Flame className="size-5" strokeWidth={isFeedActive ? 2.5 : 1.75} />
                    <span className="text-2xs font-semibold tracking-tight leading-none">Feed</span>
                  </Link>

                  {/* TAB 3: EXPLORAR */}
                  <Link
                    to="/explorar"
                    aria-label="Explorar"
                    className={cn(
                      "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isExploreActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Compass className="size-5" strokeWidth={isExploreActive ? 2.5 : 1.75} />
                    <span className="text-2xs font-semibold tracking-tight leading-none">Explorar</span>
                  </Link>

                  {/* TAB 4: COMPRAS */}
                  <Link
                    to={isAuthenticated ? "/conta/pedidos" : "/entrar"}
                    aria-label="Compras"
                    className={cn(
                      "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isPurchasesActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <ShoppingBag className="size-5" strokeWidth={isPurchasesActive ? 2.5 : 1.75} />
                      {purchasesBadgeCount > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-3xs font-black flex items-center justify-center">
                          {purchasesBadgeCount}
                        </span>
                      )}
                    </div>
                    <span className="text-2xs font-semibold tracking-tight leading-none">Compras</span>
                  </Link>

                  {/* TAB 5: PERFIL */}
                  <button
                    type="button"
                    onClick={toggleAccountSwitcher}
                    aria-label="Perfil"
                    className={cn(
                      "h-12 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer touch-manipulation relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isProfileActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="relative flex items-center justify-center">
                      {isAuthenticated ? (
                        userAvatar ? (
                          <div
                            className={cn(
                              "size-6 rounded-full overflow-hidden transition-colors duration-200 flex items-center justify-center bg-muted",
                              isProfileActive
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : "ring-1 ring-border/60 hover:ring-foreground/40"
                            )}
                          >
                            <img
                              src={userAvatar}
                              alt="Perfil"
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "size-6 rounded-full bg-muted text-foreground text-3xs font-bold flex items-center justify-center transition-colors duration-200",
                              isProfileActive
                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : "ring-1 ring-border/60"
                            )}
                          >
                            {userInitials}
                          </div>
                        )
                      ) : (
                        <User className="size-5" strokeWidth={isProfileActive ? 2.5 : 1.75} />
                      )}
                    </div>
                    <span className="text-2xs font-semibold tracking-tight leading-none">Perfil</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* ── 3. MODAIS GLOBAIS DO SUPERAPP (CONTA, CRIAÇÃO RÁPIDA E BUSCA WHATSAPP) ── */}
      <AccountSwitcherDrawer
        session={session}
        userRole={userRole}
      />
      <GlobalQuickCreateModal />
      <WhatsAppUnifiedSearchModal />
    </>
  );
}
