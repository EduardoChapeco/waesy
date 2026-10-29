import * as React from "react";
import {
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  User,
  ShoppingBag,
  Bike,
  Sparkles,
  Tag,
  Trophy,
  Plane,
  Ticket,
  Users,
  Zap,
  Heart,
  CookingPot,
  ShieldCheck,
  Briefcase,
  Cross,
  Shirt,
  Utensils,
  Wine,
  Newspaper,
  Car,
  Package,
  Truck,
  PlusCircle,
  FileText,
  Compass,
  ShoppingCart,
  X,
  Store,
  Building,
  Home,
  Hotel,
  Hammer,
  Wrench,
  Scissors,
  Smartphone,
  Gift,
  Beef,
  BookOpen,
  Palette,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openQuickCreateModal } from "@/components/shell/GlobalQuickCreateModal";

export interface VitrineLateralMenuItem {
  id?: string;
  slug?: string;
  title: string;
  target_route?: string | null;
  badge_label?: string | null;
  badge_color?: string | null;
  description?: string | null;
  icon_name?: string | null;
  custom_icon_url?: string | null;
  icon_url?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  filter_rules?: {
    section_key?: string;
    section_title?: string;
    card_variant?: "wide" | "squircle" | "full_width";
    badge_color?: string;
    is_full_width?: boolean;
    text_position?: "side" | "bottom";
    [key: string]: any;
  } | null;
}

export interface VitrineLateralMenuSection {
  id: string;
  title: string;
  items: VitrineLateralMenuItem[];
}

export interface VitrineLateralMenuSheetProps {
  open: boolean;
  onClose: () => void;
  greetingTitle?: string;
  greetingSubtitle?: string;
  showViewModeToggle?: boolean;
  defaultViewMode?: "grid" | "list";
  items?: VitrineLateralMenuItem[];
  session?: any;
  userRole?: string | null;
  isAdmin?: boolean;
  onItemClick?: (route: string) => void;
  className?: string;
  showProfileCard?: boolean;
  showAdminLink?: boolean;
  activeCity?: string;
}

const LATERAL_ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Cross,
  Shirt,
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
  Trophy,
  Sparkles,
  Heart,
  CookingPot,
  ShieldCheck,
  ShoppingBag,
  Store,
  SoccerBall: Trophy,
  Building,
  Home,
  Hotel,
  Hammer,
  Wrench,
  Scissors,
  Smartphone,
  Gift,
  Beef,
  BookOpen,
  Palette,
  PartyPopper,
};

export function VitrineLateralMenuSheet({
  open,
  onClose,
  greetingTitle = "Aproveite o Waesy!",
  greetingSubtitle,
  showViewModeToggle = true,
  defaultViewMode = "grid",
  items = [],
  session,
  userRole,
  isAdmin = false,
  onItemClick,
  className,
  showProfileCard = true,
  showAdminLink = true,
}: VitrineLateralMenuSheetProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">(defaultViewMode);

  // Fecha com tecla ESC
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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

  const handleNavigate = (route?: string | null) => {
    const finalRoute = route || "/";
    onClose();
    if (onItemClick) {
      onItemClick(finalRoute);
    } else if (typeof window !== "undefined") {
      window.location.href = finalRoute;
    }
  };

  const handleSwitchContext = (type: "civil" | "creator" | "courier" | "store") => {
    onClose();
    if (typeof window !== "undefined") {
      window.document.cookie = `waesy_active_context=${type}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (type === "civil") window.location.href = "/conta";
    else if (type === "courier") window.location.href = "/conta/entregador";
    else if (type === "creator") window.location.href = "/conta/criadores";
    else if (type === "store") window.location.href = "/workspace";
  };

  // Agrupa itens em seções semânticas compatíveis com iFood
  const sections = React.useMemo(() => {
    const activeItems = items.filter((item) => item.is_active !== false);
    const map = new Map<string, VitrineLateralMenuSection>();

    for (const item of activeItems) {
      const sectionTitle =
        item.filter_rules?.section_title ||
        (item.filter_rules?.section_key === "categorias"
          ? "Categorias"
          : item.filter_rules?.section_key === "explorar"
            ? "Destaques para Explorar"
            : item.filter_rules?.section_key === "destaques_waesy"
              ? "Destaques do Waesy"
              : item.filter_rules?.section_key === "selecao_restaurantes"
                ? "Seleção em Restaurantes"
                : item.filter_rules?.is_full_width || item.slug === "drawer-classificados"
                  ? "Classificados & Negócios"
                  : "Módulos & Serviços");

      const sectionKey = item.filter_rules?.section_key || sectionTitle.toLowerCase().replace(/\s+/g, "_");

      if (!map.has(sectionKey)) {
        map.set(sectionKey, {
          id: sectionKey,
          title: sectionTitle,
          items: [],
        });
      }
      map.get(sectionKey)!.items.push(item);
    }

    return Array.from(map.values());
  }, [items]);

  return (
    <>
      {/* ── Overlay / Backdrop de Fechamento com Blur Suave ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar menu lateral"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose();
        }}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/50 backdrop-blur-xs transition-opacity duration-300 md:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ── Sidebar Sheet Lateral (Estilo iFood & Threads Parity) ── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={greetingTitle}
        className={cn(
          "fixed inset-y-0 left-0 lateral-sheet-width z-50 bg-background text-foreground border-r border-border/50 lateral-sheet-transition select-none flex flex-col shadow-2xl",
          open ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        {/* ── Topo do Menu: Saudação + Alternador Grade/Lista + Botão Fechar ── */}
        <header className="px-4 pt-safe-modal pb-3 border-b border-border/40 flex items-center justify-between gap-2 shrink-0 bg-background/95 backdrop-blur-xs">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold font-display text-foreground tracking-tight truncate leading-tight">
              {greetingTitle}
            </h2>
            {greetingSubtitle ? (
              <p className="text-xs text-muted-foreground truncate">{greetingSubtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botão Criar (Ação Rápida SuperApp) */}
            <button
              type="button"
              onClick={() => {
                onClose();
                openQuickCreateModal();
              }}
              aria-label="Criar"
              className="h-11 min-h-11 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <PlusCircle className="size-4" />
              <span>Criar</span>
            </button>

            {/* Alternador de Visualização Grade / Lista (iFood Parity) */}
            {showViewModeToggle && (
              <div
                className="flex items-center bg-muted/60 p-1 rounded-full border border-border/50"
                role="group"
                aria-label="Modo de visualização"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  aria-label="Visualização em grade"
                  className={cn(
                    "size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    viewMode === "grid"
                      ? "bg-background text-primary shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  aria-label="Visualização em lista"
                  className={cn(
                    "size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    viewMode === "list"
                      ? "bg-background text-primary shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ListIcon className="size-4" />
                </button>
              </div>
            )}

            {/* Botão Fechar Rápido */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* ── Corpo com Rolagem Suave e Safe Area Inferior ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-safe pb-8">
          {/* Card de Identidade e Perfil Rápido */}
          {showProfileCard && (
            <div>
              {isAuthenticated ? (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="size-10 min-w-10 min-h-10 rounded-xl bg-muted flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-border/50">
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
                      <h4 className="font-bold text-xs text-foreground truncate">
                        {userFullName}
                      </h4>
                      <p className="text-2xs text-muted-foreground truncate">
                        {username ? `@${username}` : user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Switcher Contextual de Papéis */}
                  <div className="triple-pill-grid gap-2 pt-2 border-t border-border/40 text-2xs font-medium">
                    <button
                      type="button"
                      onClick={() => handleSwitchContext("civil")}
                      className="h-11 min-h-11 px-2 rounded-lg border border-border/50 bg-background hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <User className="size-4 text-muted-foreground" />
                      <span className="truncate">Civil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchContext("store")}
                      className="h-11 min-h-11 px-2 rounded-lg border border-border/50 bg-background hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <ShoppingBag className="size-4 text-muted-foreground" />
                      <span className="truncate">Empresas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchContext("courier")}
                      className="h-11 min-h-11 px-2 rounded-lg border border-border/50 bg-background hover:bg-muted/60 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <Bike className="size-4 text-muted-foreground" />
                      <span className="truncate">Waesy Go</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">
                      Acesse sua Conta
                    </span>
                    <span className="text-2xs text-muted-foreground block truncate">
                      Pedidos, caronas e compras locais
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/entrar")}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Renderização das Seções Temáticas ── */}
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-foreground tracking-tight">
                  {section.title}
                </h3>
              </div>

              {viewMode === "grid" ? (
                /* ── MODO GRADE: Trifurcação entre Cards Amplos 2 Colunas, Squircles 4 Colunas e Banners Full-Width ── */
                <div className="space-y-2">
                  {/* Itens Amplos (2 Colunas - ex: Restaurantes, Mercados, Farmácias) */}
                  {(() => {
                    const wideItems = section.items.filter(
                      (it) =>
                        it.filter_rules?.card_variant === "wide" &&
                        !it.filter_rules?.is_full_width,
                    );
                    if (wideItems.length === 0) return null;
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {wideItems.map((item) => {
                          const IconComp =
                            (item.icon_name && LATERAL_ICON_MAP[item.icon_name]) || LayoutGrid;
                          const customIcon = item.custom_icon_url || item.icon_url;

                          return (
                            <button
                              key={item.slug || item.id || item.title}
                              type="button"
                              onClick={() => handleNavigate(item.target_route)}
                              className="group relative flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 active-press transition-colors duration-200 border border-border/40 text-left min-h-14 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
                            >
                              <div className="size-10 min-h-10 min-w-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40 bg-background overflow-hidden">
                                {customIcon ? (
                                  <img
                                    src={customIcon}
                                    alt={item.title}
                                    className="size-7 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  <IconComp className="size-5 text-foreground" />
                                )}
                              </div>
                              <span className="text-xs font-semibold text-foreground truncate leading-tight">
                                {item.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Itens Squircle (4 Colunas - ex: Corridas, Bolão, Viagens, Promoções, Clube) */}
                  {(() => {
                    const squircleItems = section.items.filter(
                      (it) =>
                        (it.filter_rules?.card_variant === "squircle" ||
                          (!it.filter_rules?.card_variant && !it.filter_rules?.is_full_width)) &&
                        it.filter_rules?.card_variant !== "wide" &&
                        !it.filter_rules?.is_full_width &&
                        it.slug !== "drawer-classificados",
                    );
                    if (squircleItems.length === 0) return null;
                    return (
                      <div className="squircle-grid gap-2">
                        {squircleItems.map((item) => {
                          const IconComp =
                            (item.icon_name && LATERAL_ICON_MAP[item.icon_name]) || LayoutGrid;
                          const customIcon = item.custom_icon_url || item.icon_url;
                          const badge = item.badge_label || (item.filter_rules as any)?.badge_label;

                          return (
                            <button
                              key={item.slug || item.id || item.title}
                              type="button"
                              onClick={() => handleNavigate(item.target_route)}
                              className="group relative flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/30 hover:bg-muted/60 active:scale-95 transition-transform duration-200 border border-border/40 text-center min-h-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
                            >
                              {/* Ícone Squircle com Badge no canto superior esquerdo (ex: "Novo" como no iFood) */}
                              <div className="relative size-10 min-h-10 min-w-10 rounded-xl flex items-center justify-center mb-1 shrink-0 bg-background border border-border/40">
                                {badge ? (
                                  <span className="absolute -top-1.5 -left-1.5 px-2 py-1 rounded-full text-3xs font-black tracking-wider uppercase bg-destructive text-destructive-foreground shadow-xs z-10 leading-none">
                                    {badge}
                                  </span>
                                ) : null}
                                {customIcon ? (
                                  <img
                                    src={customIcon}
                                    alt={item.title}
                                    className="size-6 object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  <IconComp className="size-5 text-foreground" />
                                )}
                              </div>
                              <span className="text-2xs font-semibold text-foreground truncate w-full px-1 leading-tight">
                                {item.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Itens de Largura Completa (Banners/Classificados) */}
                  {(() => {
                    const fullWidthItems = section.items.filter(
                      (it) =>
                        it.filter_rules?.card_variant === "full_width" ||
                        it.filter_rules?.is_full_width ||
                        it.slug === "drawer-classificados",
                    );
                    if (fullWidthItems.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        {fullWidthItems.map((item) => {
                          const IconComp =
                            (item.icon_name && LATERAL_ICON_MAP[item.icon_name]) || LayoutGrid;
                          const customIcon = item.custom_icon_url || item.icon_url;

                          return (
                            <button
                              key={item.slug || item.id || item.title}
                              type="button"
                              onClick={() => handleNavigate(item.target_route || "/classificados")}
                              className="w-full h-14 min-h-14 px-4 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/40 active-press transition-colors duration-200 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-10 min-h-10 min-w-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40 bg-background overflow-hidden">
                                  {customIcon ? (
                                    <img
                                      src={customIcon}
                                      alt={item.title}
                                      className="size-6 object-contain"
                                    />
                                  ) : (
                                    <IconComp className="size-5 text-primary" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-foreground tracking-tight leading-snug truncate">
                                    {item.title}
                                  </h4>
                                  <span className="text-2xs text-muted-foreground truncate block">
                                    {item.description || "Veículos, Imóveis e Serviços"}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ── MODO LISTA: Formato Linhas Suaves com Ícone e Chevron ── */
                <div className="rounded-2xl border border-border/50 bg-muted/15 divide-y divide-border/40 overflow-hidden shadow-2xs">
                  {section.items.map((item) => {
                    const IconComp =
                      (item.icon_name && LATERAL_ICON_MAP[item.icon_name]) || LayoutGrid;
                    const customIcon = item.custom_icon_url || item.icon_url;
                    const badge = item.badge_label || (item.filter_rules as any)?.badge_label;

                    return (
                      <button
                        key={item.slug || item.id || item.title}
                        type="button"
                        onClick={() => handleNavigate(item.target_route)}
                        className="w-full h-12 min-h-12 px-3 flex items-center justify-between hover:bg-muted/40 active:bg-muted/60 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-8 min-h-8 min-w-8 rounded-lg flex items-center justify-center shrink-0 border border-border/40 bg-background overflow-hidden">
                            {customIcon ? (
                              <img
                                src={customIcon}
                                alt={item.title}
                                className="size-5 object-contain"
                              />
                            ) : (
                              <IconComp className="size-4 text-foreground" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {item.title}
                          </span>
                          {badge ? (
                            <span className="px-2 py-1 rounded-full text-3xs font-black tracking-wider uppercase bg-destructive text-destructive-foreground shadow-xs shrink-0 leading-none">
                              {badge}
                            </span>
                          ) : null}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Atalho para o Admin Master (apenas para Admin) */}
          {isAdmin && showAdminLink && (
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => handleNavigate("/admin-master/botoes?tab=drawer_module")}
                className="w-full h-11 min-h-11 px-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-bold text-primary flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <span>Editar Menu no Admin Master</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
