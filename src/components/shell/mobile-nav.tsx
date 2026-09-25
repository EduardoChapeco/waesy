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
 *  - Resiliência a teclado virtual e safe areas do iOS/Android.
 */

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Search,
  Plus,
  MessageCircle,
  Menu,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { QuickCreateModal } from "@/components/commerce/quick-create-modal";
import { GlobalMenuHub } from "@/components/shell/global-menu-hub";
import { useCartContext } from "@/lib/cart-context";
import { listCustomerOrders } from "@/services/order.functions";
import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  session?: any;
  userRole?: string | null;
}

export function MobileNav({ session, userRole }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname || "";

  // Estado do Hub Global (FASE 3)
  const [isMenuHubOpen, setIsMenuHubOpen] = useState(false);

  // Páginas onde a barra deve ser suprimida (formulários densos)
  const isFormPage =
    pathname.includes("/classificados/novo") ||
    pathname.endsWith("/novo") ||
    pathname.endsWith("/editar") ||
    pathname.includes("/catalogo/produtos/novo") ||
    pathname.includes("/marketing/anuncios/novo");

  const { globalCarts, cart, setIsCartOpen } = useCartContext();

  const isAuthenticated = Boolean(session?.user || session?.id);

  // Total de itens no carrinho (global ou da loja corrente)
  const totalCartItems =
    globalCarts.reduce((acc, c) => acc + (c.itemCount || 0), 0) ||
    (cart?.itemCount ?? 0);
  const hasCartItems = totalCartItems > 0;

  // Subtotal do carrinho para exibição no floating button
  const cartSubtotal =
    globalCarts.reduce((acc, c) => acc + (c.subtotalCents || 0), 0) ||
    (cart?.subtotalCents ?? 0);

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

  // ── Active States das 5 Tabs ───────────────────────────────────────────────
  const isHomeActive = pathname === "/" || pathname === "/home" || pathname === "/feed";
  const isSearchActive =
    pathname.startsWith("/buscar") ||
    pathname.startsWith("/explorar") ||
    pathname.startsWith("/mercado") ||
    pathname.startsWith("/turismo") ||
    pathname.startsWith("/diretorio");
  const isMessagesActive =
    pathname.startsWith("/conta/conversas") || pathname.startsWith("/conta/suporte");

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

  if (isFormPage || isKeyboardVisible) {
    return null;
  }

  return (
    <>
      {/* ── 1. SMART FLOATING CART BUTTON (Discreto acima da TabBar) ── */}
      {hasCartItems && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          aria-label={`Ver carrinho com ${totalCartItems} itens`}
          className="md:hidden fixed inset-x-3.5 z-40 max-w-sm mx-auto h-12 rounded-2xl bg-primary text-primary-foreground px-4 flex items-center justify-between shadow-lg border border-primary/20 active:scale-[0.98] transition-all cursor-pointer animate-in slide-in-from-bottom-2 fade-in duration-200 mobile-nav-hide-on-keyboard"
          style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 72px), 76px)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="size-6 rounded-full bg-primary-foreground text-primary text-xs font-black flex items-center justify-center shrink-0">
              {totalCartItems > 99 ? "99+" : totalCartItems}
            </span>
            <span className="text-xs sm:text-sm font-bold truncate">
              Ver Sacola / Carrinho
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-xs sm:text-sm font-black">
            {cartSubtotal > 0 && <span>{formatCents(cartSubtotal)}</span>}
            <ArrowRight className="size-4" />
          </div>
        </button>
      )}

      {/* ── 2. BOTTOM NAVIGATION BAR CANÔNICA (A REGRA DOS 5 - APPLE HIG) ── */}
      <div
        className="md:hidden fixed inset-x-2.5 z-40 max-w-lg mx-auto select-none mobile-nav-hide-on-keyboard"
        style={{ bottom: "max(calc(env(safe-area-inset-bottom) + 6px), 10px)" }}
      >
        <nav
          aria-label="Navegação principal móvel"
          className="grid grid-cols-5 items-center p-1.5 bg-background/95 backdrop-blur-md border border-border/80 rounded-[24px] shadow-sm transition-all duration-200"
        >
          {/* TAB 1: INÍCIO */}
          <Link
            to="/"
            aria-label="Início"
            className={cn(
              "h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer touch-manipulation",
              isHomeActive
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="size-5" strokeWidth={isHomeActive ? 2.5 : 2} />
            <span className="text-[10px] tracking-tight leading-none">Início</span>
          </Link>

          {/* TAB 2: EXPLORAR / BUSCA */}
          <Link
            to="/explorar"
            aria-label="Explorar"
            className={cn(
              "h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer touch-manipulation",
              isSearchActive
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="size-5" strokeWidth={isSearchActive ? 2.5 : 2} />
            <span className="text-[10px] tracking-tight leading-none">Explorar</span>
          </Link>

          {/* TAB 3: BOTÃO CENTRAL [+] DE CRIAÇÃO RÁPIDA (FAB CONTEXTUAL) */}
          <div className="flex items-center justify-center">
            <QuickCreateModal
              isAuthenticated={isAuthenticated}
              session={session}
              asNavButton={true}
            />
          </div>

          {/* TAB 4: MENSAGENS / ATENDIMENTO */}
          <Link
            to={isAuthenticated ? "/conta/conversas" : "/entrar"}
            aria-label="Mensagens"
            className={cn(
              "h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer touch-manipulation relative",
              isMessagesActive
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageCircle className="size-5" strokeWidth={isMessagesActive ? 2.5 : 2} />
            <span className="text-[10px] tracking-tight leading-none">Mensagens</span>
          </Link>

          {/* TAB 5: MENU HUB GLOBAL (SUPER APP PATTERN) */}
          <button
            type="button"
            onClick={() => setIsMenuHubOpen(true)}
            aria-label="Menu principal"
            className={cn(
              "h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer touch-manipulation relative",
              isMenuHubOpen
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Menu className="size-5" strokeWidth={isMenuHubOpen ? 2.5 : 2} />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 animate-ping" />
              )}
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">Menu</span>
          </button>
        </nav>
      </div>

      {/* ── 3. MODAL / BOTTOM SHEET DO MENU HUB GLOBAL ── */}
      <GlobalMenuHub
        open={isMenuHubOpen}
        onOpenChange={setIsMenuHubOpen}
        session={session}
        userRole={userRole}
        activeOrdersCount={activeOrdersCount}
        totalCartItems={totalCartItems}
      />
    </>
  );
}
