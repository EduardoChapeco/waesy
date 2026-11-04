import { createFileRoute, Outlet, redirect, Link, isRedirect, useRouterState } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { getProfile, getUserSession } from "@/services/auth.functions";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin-master")({
  beforeLoad: async () => {
    try {
      const session = await getUserSession();
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
    title: "Centro de Comando",
    items: [
      { to: "/admin-master", label: "Dashboard Executivo", icon: LayoutDashboard, exact: true },
      { to: "/admin-master/crescimento", label: "Metas e Valuation", icon: Target },
      { to: "/admin-master/modulos", label: "Módulos Globais", icon: Layers },
      { to: "/admin-master/algoritmo", label: "Algoritmo & Ranking", icon: Sliders },
      { to: "/admin-master/curadoria", label: "Curadoria Editorial", icon: Eye },
      { to: "/admin-master/onboarding", label: "Onboarding da Rede", icon: Compass },
      { to: "/admin-master/imprensa", label: "Imprensa & Notícias", icon: Newspaper },
    ],
  },
  {
    title: "Vitrines & Páginas CMS",
    items: [
      { to: "/admin-master/home-editor", label: "Páginas & Seções", icon: Layout },
      { to: "/admin-master/vitrines", label: "Vitrines Verticais", icon: Store },
      { to: "/admin-master/banners", label: "Banners & Destaques", icon: ImageIcon },
      { to: "/admin-master/botoes", label: "Categorias & Hotpages", icon: Layers },
      { to: "/admin-master/hubs", label: "Hubs e Cidades", icon: Globe },
      { to: "/admin-master/marca", label: "Identidade e Marca", icon: Palette },
      { to: "/admin-master/portal-completo", label: "Portal Completo", icon: Building2 },
    ],
  },
  {
    title: "Comércio, Rede & Logística",
    items: [
      { to: "/admin-master/lojas", label: "Lojas & Credenciamento", icon: Store },
      { to: "/admin-master/usuarios", label: "Usuários da Rede", icon: Users },
      { to: "/admin-master/logistica", label: "Logística Urbana Waesy Go", icon: Truck },
      { to: "/admin-master/entregadores/auditoria", label: "Auditoria Entregadores", icon: ShieldCheck },
      { to: "/admin-master/carnes", label: "Carnês & Crediário", icon: Receipt },
      { to: "/admin-master/ads-network", label: "Ad-Network Arbitrage", icon: Zap },
      { to: "/admin-master/boost-payments", label: "Boost de Anúncios", icon: Flame },
    ],
  },
  {
    title: "Marketing, Comunidade & Web3",
    items: [
      { to: "/admin-master/pre-cadastro", label: "Pré-Cadastro e Lançamento", icon: Star },
      { to: "/admin-master/convite", label: "Sorteios e Prêmios", icon: Gift },
      { to: "/admin-master/tokens", label: "Tokens & Fidelidade", icon: Coins },
      { to: "/admin-master/mining", label: "Mineração Comunitária", icon: Cpu },
      { to: "/admin-master/simlabs", label: "SimLabs (Laboratório)", icon: FlaskConical },
    ],
  },
  {
    title: "Segurança, Finanças & Compliance",
    items: [
      { to: "/admin-master/auditoria-forense", label: "Ledger Criptográfico (Bacen)", icon: Lock },
      { to: "/admin-master/seguranca", label: "Segurança Forense", icon: ShieldAlert },
      { to: "/admin-master/seguranca/certificados", label: "Certificados MCTU", icon: Fingerprint },
      { to: "/admin-master/seguranca/telemetria", label: "Telemetria Live", icon: Radio },
      { to: "/admin-master/kyc", label: "Verificação KYC", icon: UserCheck },
      { to: "/admin-master/denuncias", label: "Moderação de Denúncias", icon: AlertTriangle },
      { to: "/admin-master/faturas", label: "Faturas e Repasses", icon: DollarSign },
      { to: "/admin-master/logs", label: "Logs de Sistema", icon: Server },
      { to: "/admin-master/termos", label: "Termos e Legal", icon: Scale },
      { to: "/admin-master/integracoes", label: "Integrações e Webhooks", icon: Plug },
    ],
  },
];

function AdminMasterLayout() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Filtro instantâneo por busca em tempo real
  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return NAV_SECTIONS;
    return NAV_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.label.toLowerCase().includes(term) ||
          it.to.toLowerCase().includes(term) ||
          sec.title.toLowerCase().includes(term),
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [searchTerm]);

  // Trilha contextual de navegação (Breadcrumb)
  const currentBreadcrumb = useMemo(() => {
    for (const sec of NAV_SECTIONS) {
      for (const item of sec.items) {
        if (item.exact ? pathname === item.to : pathname.startsWith(item.to)) {
          return { sectionTitle: sec.title, itemLabel: item.label };
        }
      }
    }
    return { sectionTitle: "Governança", itemLabel: "Painel Master" };
  }, [pathname]);

  const renderNavLinks = (onItemClick?: () => void) => (
    <>
      {filteredSections.map((section) => (
        <div key={section.title} className="space-y-1">
          <span className="px-3 text-2xs font-mono font-bold tracking-wider uppercase text-muted-foreground/70 block">
            {section.title}
          </span>
          <div className="space-y-1 pt-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: (item as any).exact }}
                  onClick={onItemClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 [&.active]:bg-primary [&.active]:text-primary-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {filteredSections.length === 0 && (
        <div className="p-4 text-center text-xs text-muted-foreground">
          Nenhum módulo encontrado para &quot;{searchTerm}&quot;.
        </div>
      )}
    </>
  );

  return (
    <div className="h-dvh w-screen overflow-hidden bg-background text-foreground flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/40 backdrop-blur-sm flex-col hidden md:flex shrink-0 h-full">
        {/* Header */}
        <div className="h-14 px-4 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Shield className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs tracking-tight block leading-tight truncate">
                Waesy Master
              </span>
              <span className="text-3xs text-muted-foreground font-medium block truncate">
                Administração Global
              </span>
            </div>
          </div>
          <span className="text-3xs font-mono font-bold px-2 py-1 rounded bg-muted text-muted-foreground border border-border/40 shrink-0">
            ROOT
          </span>
        </div>

        {/* Quick Filter Search */}
        <div className="p-3 pb-1 shrink-0 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ferramenta (ex: KYC, Banners)..."
              className="w-full h-8 pl-8 pr-8 rounded-lg bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                title="Limpar busca"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation with Independent Internal Scroll */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar min-h-0">
          {renderNavLinks()}
        </nav>

        {/* Footer Quick Links */}
        <div className="p-3 border-t border-border/40 space-y-1 shrink-0 bg-background/50">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 px-3 text-xs font-medium rounded-lg bg-card border-border/60 cursor-pointer min-h-11 sm:min-h-0"
          >
            <Link to="/workspace">
              <span className="flex items-center gap-2">
                <Store className="size-3.5 text-primary" />
                <span>Ir ao Workspace</span>
              </span>
              <ArrowUpRight className="size-3 text-muted-foreground" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 px-3 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground cursor-pointer min-h-11 sm:min-h-0"
          >
            <Link to="/" target="_blank" rel="noopener noreferrer">
              <span className="flex items-center gap-2">
                <ExternalLink className="size-3.5 text-muted-foreground" />
                <span>Abrir Vitrine Pública</span>
              </span>
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            className="fixed inset-0 bg-foreground/60 backdrop-blur-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-background border-r border-border h-full flex flex-col z-10">
            <div className="h-14 px-4 border-b border-border/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Shield className="size-5" />
                <span>Waesy Master</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-11 min-h-11 min-w-11 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-3 pb-1 shrink-0 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar ferramenta..."
                  className="w-full h-9 pl-8 pr-8 rounded-lg bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar min-h-0">
              {renderNavLinks(() => setIsMobileOpen(false))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border/40 bg-background px-4 md:px-8 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="size-11 min-h-11 min-w-11 p-0 md:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:transition-none" />
              <span>Produção Live</span>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs font-medium gap-2 bg-card hover:bg-muted border-border/60 cursor-pointer min-h-11 sm:min-h-0"
            >
              <Link to="/workspace">
                <Store className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Workspace</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer min-h-11 sm:min-h-0"
            >
              <Link to="/" target="_blank" rel="noopener noreferrer">
                <span>Vitrine</span>
                <ExternalLink className="size-3 ml-1" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Content Container with Independent Internal Scroll */}
        <main className="flex-1 overflow-y-auto no-scrollbar min-h-0 p-4 sm:p-6 lg:p-8 bg-background">
          <div className="w-full max-w-7xl 2xl:max-w-screen-2xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
