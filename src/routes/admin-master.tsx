import { createFileRoute, Outlet, redirect, Link, isRedirect, useRouterState } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { getProfile, getUserSession } from "@/services/auth.functions";
import { SidebarSimple, SquaresFour } from "@phosphor-icons/react";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  DollarSign,
  Store,
  AlertTriangle,
  Users,
  UserCheck,
  Scale,
  Image as ImageIcon,
  Palette,
  Plug,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Menu,
  X,
  Truck,
  Server,
  Eye,
  Coins,
  Sliders,
  Globe,
  Cpu,
  FlaskConical,
  Layout,
  Fingerprint,
  Radio,
  Gift,
  Receipt,
  Flame,
  Building2,
  Newspaper,
  Target,
  Lock,
  Zap,
  Search,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/admin-master")({
  beforeLoad: async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          const { sanitizeBrowserAuthCookies } = await import("@/lib/supabase");
          sanitizeBrowserAuthCookies();
        } catch {}
      }

      let session = await getUserSession().catch(() => null);
      if (!session && typeof window !== "undefined") {
        try {
          const { getBrowserClient, sanitizeBrowserAuthCookies } = await import("@/lib/supabase");
          sanitizeBrowserAuthCookies();
          const client = getBrowserClient();
          const { data: { session: browserSession } } = await client.auth.getSession();
          if (browserSession?.user) {
            sanitizeBrowserAuthCookies();
            session = await getUserSession().catch(() => null);
          }
        } catch {}
      }

      if (!session) {
        throw redirect({ to: "/entrar", search: { returnUrl: "/admin-master" } });
      }
      const role = session?.role || session?.user?.user_metadata?.role || (session?.user as any)?.role;
      const isMasterFlag = session?.user?.user_metadata?.is_admin_master || session?.user?.user_metadata?.is_superadmin;
      const email = session?.email?.toLowerCase() || session?.user?.email?.toLowerCase() || "";
      const MASTER_EMAILS = [
        "contato@usewaesy.com",
        "admin@usewaesy.com",
        "meuwaesy@gmail.com",
        "meuwider@gmail.com",
        "excelenciatour.smo@gmail.com",
        "admin@jah.com",
      ];
      const isMasterEmail = MASTER_EMAILS.includes(email);

      const isAdmin = role === "platform_admin" || role === "master" || role === "admin_master" || isMasterFlag || isMasterEmail;
      if (!isAdmin) {
        throw redirect({ to: "/entrar", search: { returnUrl: "/admin-master" } });
      }
    } catch (e: any) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/entrar", search: { returnUrl: "/admin-master" } });
    }
  },
  errorComponent: ({ error, reset }: { error: any; reset: () => void }) => (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-6 rounded-lg bg-card border border-border space-y-4 ">
        <div className="size-12 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Diagnóstico do Painel Master</h2>
        <p className="text-xs text-muted-foreground">Ocorreu uma instabilidade ao inicializar o módulo administrativo.</p>
        <div className="p-3 rounded-lg bg-muted/60 text-destructive text-left overflow-x-auto scroll-area-carousel text-2xs font-mono border border-border/50">
          {error?.message || String(error)}
        </div>
        <div className="flex gap-2">
          <Button onClick={reset} variant="default" className="flex-1 rounded-lg">
            Tentar Novamente
          </Button>
          <Button asChild variant="outline" className="flex-1 rounded-lg">
            <Link to="/">Início</Link>
          </Button>
        </div>
      </div>
    </div>
  ),
  component: AdminMasterLayout,
});

const NAV_SECTIONS = [
  {
    title: "Comando",
    items: [
      { to: "/admin-master", label: "Visão Geral", icon: LayoutDashboard, exact: true },
      { to: "/admin-master/crescimento", label: "Metas", icon: Target },
      { to: "/admin-master/modulos", label: "Módulos", icon: Layers },
      { to: "/admin-master/algoritmo", label: "Algoritmo", icon: Sliders },
      { to: "/admin-master/curadoria", label: "Curadoria", icon: Eye },
      { to: "/admin-master/onboarding", label: "Ativação", icon: Compass },
      { to: "/admin-master/imprensa", label: "Imprensa", icon: Newspaper },
    ],
  },
  {
    title: "Vitrines",
    items: [
      { to: "/admin-master/home-editor", label: "Páginas", icon: Layout },
      { to: "/admin-master/vitrines", label: "Vitrines", icon: Store },
      { to: "/admin-master/banners", label: "Banners", icon: ImageIcon },
      { to: "/admin-master/botoes", label: "Atalhos", icon: Layers },
      { to: "/admin-master/hubs", label: "Cidades", icon: Globe },
      { to: "/admin-master/marca", label: "Marca", icon: Palette },
      { to: "/admin-master/portal-completo", label: "Portal", icon: Building2 },
    ],
  },
  {
    title: "Operações",
    items: [
      { to: "/admin-master/lojas", label: "Lojas", icon: Store },
      { to: "/admin-master/usuarios", label: "Usuários", icon: Users },
      { to: "/admin-master/logistica", label: "Logística", icon: Truck },
      { to: "/admin-master/entregadores/auditoria", label: "Entregadores", icon: ShieldCheck },
      { to: "/admin-master/carnes", label: "Crediário", icon: Receipt },
      { to: "/admin-master/ads-network", label: "Anúncios", icon: Zap },
      { to: "/admin-master/boost-payments", label: "Impulsionar", icon: Flame },
    ],
  },
  {
    title: "Crescimento",
    items: [
      { to: "/admin-master/pre-cadastro", label: "Pré-Cadastro", icon: Star },
      { to: "/admin-master/convite", label: "Sorteios", icon: Gift },
      { to: "/admin-master/tokens", label: "Tokens", icon: Coins },
      { to: "/admin-master/mining", label: "Recompensas", icon: Cpu },
      { to: "/admin-master/simlabs", label: "Simulações", icon: FlaskConical },
    ],
  },
  {
    title: "Governança",
    items: [
      { to: "/admin-master/auditoria-forense", label: "Ledger", icon: Lock },
      { to: "/admin-master/seguranca", label: "Segurança", icon: ShieldAlert },
      { to: "/admin-master/seguranca/certificados", label: "Certificados", icon: Fingerprint },
      { to: "/admin-master/seguranca/telemetria", label: "Telemetria", icon: Radio },
      { to: "/admin-master/kyc", label: "Identidade", icon: UserCheck },
      { to: "/admin-master/denuncias", label: "Denúncias", icon: AlertTriangle },
      { to: "/admin-master/faturas", label: "Faturas", icon: DollarSign },
      { to: "/admin-master/logs", label: "Registros", icon: Server },
      { to: "/admin-master/termos", label: "Termos", icon: Scale },
      { to: "/admin-master/integracoes", label: "Integrações", icon: Plug },
    ],
  },
];

const SECTION_ICONS: Record<string, any> = {
  Comando: LayoutDashboard,
  Vitrines: Store,
  Operações: Truck,
  Crescimento: Gift,
  Governança: ShieldCheck,
};

function AdminMasterLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSubSidebarOpen, setIsSubSidebarOpen] = useState(false);

  const currentBreadcrumb = useMemo(() => {
    for (const sec of NAV_SECTIONS) {
      for (const item of sec.items) {
        if (item.exact ? pathname === item.to : pathname.startsWith(item.to)) {
          return { sectionTitle: sec.title, itemLabel: item.label };
        }
      }
    }
    return { sectionTitle: "Comando", itemLabel: "Visão Geral" };
  }, [pathname]);

  const [selectedSectionTitle, setSelectedSectionTitle] = useState(
    currentBreadcrumb.sectionTitle
  );

  useEffect(() => {
    setSelectedSectionTitle(currentBreadcrumb.sectionTitle);
  }, [currentBreadcrumb.sectionTitle]);

  const activeSection = useMemo(
    () =>
      NAV_SECTIONS.find((sec) => sec.title === selectedSectionTitle) ||
      NAV_SECTIONS[0],
    [selectedSectionTitle]
  );

  const visibleSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [activeSection];
    return NAV_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.label.toLowerCase().includes(term) ||
          it.to.toLowerCase().includes(term) ||
          sec.title.toLowerCase().includes(term),
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [searchTerm, activeSection]);

  const renderNavLinks = (
    sectionsToRender: typeof NAV_SECTIONS,
    onItemClick?: () => void
  ) => (
    <>
      {sectionsToRender.map((section) => (
        <div key={section.title} className="space-y-1">
          {sectionsToRender.length > 1 && (
            <span className="px-3 text-xs font-medium text-muted-foreground block">
              {section.title}
            </span>
          )}
          <div className="space-y-1 pt-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isItemActive = (item as any).exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: (item as any).exact }}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 px-3 min-h-11 py-2 rounded-xl text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isItemActive
                      ? "bg-sidebar-active text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-active/60 font-medium"
                  )}
                >
                  <StatefulNavIcon
                    icon={Icon}
                    active={isItemActive}
                    size={18}
                    className="size-4 shrink-0"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {sectionsToRender.length === 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground">
          Nenhum item encontrado.
        </div>
      )}
    </>
  );

  return (
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground flex">
      {/* Desktop Dual-Rail Navigation (>= 840px): Slim Rail + Collapsible Slim Sidebar */}
      <aside className="hidden waesy-expanded-flex flex-row shrink-0 h-dvh select-none z-30 border-r border-sidebar-border">
        {/* Trilho Primário Somente Ícones com Tooltip */}
        <TooltipProvider delayDuration={120}>
          <div className="w-14 bg-rail border-r border-sidebar-border flex flex-col items-center justify-between py-2 shrink-0 h-dvh">
            <div className="h-11 flex items-center justify-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsSubSidebarOpen((prev) => !prev)}
                    aria-label={isSubSidebarOpen ? "Recolher menu" : "Expandir menu"}
                    className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SidebarSimple
                      size={20}
                      weight={isSubSidebarOpen ? "fill" : "regular"}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {isSubSidebarOpen ? "Recolher menu" : "Expandir menu"}
                </TooltipContent>
              </Tooltip>
            </div>

            <nav
              aria-label="Seções do painel"
              className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-1 py-2"
            >
              {NAV_SECTIONS.map((sec) => {
                const SecIcon = SECTION_ICONS[sec.title] || LayoutDashboard;
                const isSelected = activeSection.title === sec.title;
                return (
                  <Tooltip key={sec.title}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setIsSubSidebarOpen((prev) => !prev);
                          } else {
                            setSelectedSectionTitle(sec.title);
                            setSearchTerm("");
                            if (!isSubSidebarOpen) setIsSubSidebarOpen(true);
                          }
                        }}
                        aria-label={sec.title}
                        aria-current={isSelected ? "page" : undefined}
                        className={cn(
                          "size-11 min-w-11 min-h-11 rounded-xl relative flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "bg-rail-active text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                        )}
                      >
                        <StatefulNavIcon icon={SecIcon} active={isSelected} size={20} className="size-5 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {sec.title}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>

            <div className="w-full pt-2 border-t border-sidebar-border flex flex-col items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/workspace"
                    aria-label="Workspace"
                    className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <StatefulNavIcon icon={Store} active={false} size={20} className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Workspace
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Vitrine"
                    className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <StatefulNavIcon icon={Globe} active={false} size={20} className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Vitrine
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Submenu Colapsável (Padrão recolhido; abre ao clicar na coluna 1) */}
        {isSubSidebarOpen && (
          <div className="w-56 bg-sidebar flex flex-col h-dvh shrink-0 overflow-hidden">
            <div className="h-14 px-3 border-b border-sidebar-border flex items-center gap-3 shrink-0">
              <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                <StatefulNavIcon icon={Shield} active={true} size={16} className="size-4" />
              </div>
              <span className="font-semibold text-sm tracking-tight truncate">
                Waesy Master
              </span>
            </div>

            <div className="p-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-11 min-h-11 pl-9 pr-11 rounded-xl bg-background/60 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Limpar busca"
                    className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar min-h-0">
              {renderNavLinks(visibleSections)}
            </nav>
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Drawer (< 840px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 waesy-compact-medium-only flex">
          <div
            role="button"
            tabIndex={0}
            aria-label="Fechar menu"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            className="fixed inset-0 bg-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-xs bg-sidebar border-r border-sidebar-border h-full flex flex-col z-10">
            <div className="h-14 px-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <StatefulNavIcon icon={Shield} active={true} size={18} className="size-4" />
                <span>Waesy Master</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar menu"
                className="size-11 min-h-11 min-w-11 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-11 min-h-11 pl-9 pr-8 rounded-xl bg-background text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar min-h-0">
              {renderNavLinks(
                searchTerm.trim() ? visibleSections : NAV_SECTIONS,
                () => setIsMobileOpen(false)
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border/40 bg-background px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Abrir menu"
              className="size-11 min-h-11 min-w-11 p-0 waesy-compact-medium-only cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline truncate">
                {currentBreadcrumb.sectionTitle}
              </span>
              <span className="text-xs text-muted-foreground/60 hidden sm:inline">/</span>
              <span className="text-xs font-bold text-foreground truncate max-w-48 sm:max-w-none">
                {currentBreadcrumb.itemLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-11 min-h-11 rounded-lg text-xs font-medium gap-2 bg-card hover:bg-muted border-border/60 cursor-pointer"
            >
              <Link to="/workspace">
                <Store className="size-4 text-primary" />
                <span className="hidden sm:inline">Workspace</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-11 min-h-11 rounded-lg text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Link to="/" target="_blank" rel="noopener noreferrer">
                <span>Vitrine</span>
                <ExternalLink className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Content Container with Independent Internal Scroll */}
        <main className="flex-1 overflow-y-auto no-scrollbar min-h-0 p-4 sm:p-6 bg-background">
          <div className="w-full max-w-7xl 2xl:max-w-screen-2xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
