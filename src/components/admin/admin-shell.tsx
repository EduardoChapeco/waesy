import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Package, Boxes, ShoppingCart, Truck, CreditCard, Users, MessagesSquare, FileText, Images, Megaphone, Wallet, BarChart3, Settings, Menu, Store, CheckSquare, Plus, ChevronLeft, Grid, Bell, Calendar, LogOut, UserPlus, Layers, Star, Percent, Zap, LifeBuoy, Paintbrush, Video, Plug, Link2, LayoutTemplate, Palette, ArrowLeftRight, Monitor, Building } from 'lucide-react';
import type { LucideIcon } from "lucide-react";

import { formatMoney } from "@/lib/money";
import { clearAppCache } from "@/lib/cache";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/commerce/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ADMIN_SIDEBAR_NAV, ADMIN_BOTTOM_NAV, getRoute, hasRoleAccess } from "@/lib/routes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { signOut } from "@/services/auth.functions";

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
 LayoutDashboard,
 Package,
 Boxes,
 ShoppingCart,
 Truck,
 CreditCard,
 Users,
 MessagesSquare,
 FileText,
 Images,
 Megaphone,
 Wallet,
 BarChart3,
 Settings,
 Store,
 CheckSquare,
 Plus,
 ChevronLeft,
 Grid,
 Bell,
 Calendar,
 LogOut,
 UserPlus,
 Layers,
 Star,
 Percent,
 Zap,
 LifeBuoy,
 Paintbrush,
 Menu,
 Video,
 Plug,
 Link2,
 LayoutTemplate,
 Palette,
 ArrowLeftRight,
 Monitor,
 Building,
};

function resolveIcon(name: string): LucideIcon {
 return ICON_MAP[name] ?? Settings;
}

// ---------------------------------------------------------------------------
// Contextual Actions mapping
// ---------------------------------------------------------------------------
function getContextualAction(pathname: string) {
 // Subpages / Detail pages -> Return to parent list
 if (
 pathname === "/workspace/catalogo/produtos/novo" ||
 pathname.match(/\/admin\/catalogo\/produtos\/[^/]+$/)
 ) {
 if (pathname !== "/workspace/catalogo/produtos") {
 return { label: "Voltar para Lista", path: "/workspace/catalogo/produtos", icon: "ChevronLeft" };
 }
 }
 if (pathname.startsWith("/admin/caixa/")) {
 return { label: "Voltar para Caixa", path: "/workspace/financeiro/caixa", icon: "ChevronLeft" };
 }
 if (pathname.match(/\/admin\/pedidos\/[^/]+$/) && pathname !== "/workspace/pedidos") {
 return { label: "Voltar para Pedidos", path: "/workspace/pedidos", icon: "ChevronLeft" };
 }
 if (pathname.match(/\/admin\/clientes\/[^/]+$/) && pathname !== "/workspace/clientes") {
 return { label: "Voltar para Clientes", path: "/workspace/clientes", icon: "ChevronLeft" };
 }

 // Base list pages -> Create actions
 if (pathname.startsWith("/workspace/catalogo/produtos")) {
 return { label: "Novo Produto", path: "/workspace/catalogo/produtos/novo", icon: "Plus" };
 }
 if (pathname.startsWith("/workspace/clientes")) {
 return { label: "Cadastrar Cliente", path: "/workspace/clientes", icon: "UserPlus" };
 }
 if (pathname.startsWith("/workspace/financeiro/caixa")) {
 return { label: "Novo Lançamento", path: "/workspace/financeiro/caixa/lancamentos", icon: "Plus" };
 }
 if (pathname.startsWith("/admin/cms/paginas")) {
 return { label: "Nova Página", path: "/workspace/cms/paginas", icon: "Plus" };
 }
 if (pathname.startsWith("/workspace/marketing/promocoes")) {
 return { label: "Novo Cupom", path: "/workspace/marketing/promocoes", icon: "Plus" };
 }
 if (pathname.startsWith("/workspace/pedidos")) {
 return { label: "Venda PDV / Caixa", path: "/workspace/financeiro/caixa", icon: "ShoppingCart" };
 }
 return null;
}

// ---------------------------------------------------------------------------
// Active nav group resolver
// ---------------------------------------------------------------------------
function getActiveGroup(pathname: string): string {
 // 1. Exact match in canonical sidebar nav
 for (const group of ADMIN_SIDEBAR_NAV) {
 if (group.items.some((item) => pathname === item.path)) {
 return group.title;
 }
 }
 // 2. Prefix match (excluding root /admin)
 for (const group of ADMIN_SIDEBAR_NAV) {
 if (group.items.some((item) => item.path !== "/workspace" && pathname.startsWith(item.path))) {
 return group.title;
 }
 }
 // 3. Prefix fallbacks for deep screens not directly listed
 if (pathname.startsWith("/workspace/eventos")) {
 return "Eventos & Cultura";
 }
 if (
 pathname.startsWith("/workspace/catalogo") ||
 pathname.startsWith("/workspace/estoque") ||
 pathname.startsWith("/workspace/midias")
 ) {
 return "Produtos & Estoque";
 }
 if (
 pathname.startsWith("/workspace/pedidos") ||
 pathname.startsWith("/workspace/financeiro/pagamentos") ||
 pathname.startsWith("/workspace/financeiro/comprovantes") ||
 pathname.startsWith("/workspace/financeiro/comissoes") ||
 pathname.startsWith("/workspace/match-time")
 ) {
 return "Pedidos & Vendas";
 }
 if (
 pathname.startsWith("/workspace/clientes") ||
 pathname.startsWith("/workspace/atendimento") ||
 pathname.startsWith("/workspace/suporte") ||
 pathname.startsWith("/workspace/avaliacoes")
 ) {
 return "Clientes & Atendimento";
 }
 if (
 pathname.startsWith("/workspace/marketing/vitrine") ||
 pathname.startsWith("/workspace/cms/paginas") ||
 pathname.startsWith("/workspace/marketing/vitrine") ||
 pathname.startsWith("/workspace/marketing/hotpages") ||
 pathname.startsWith("/workspace/marketing/banners")
 ) {
 return "Vitrine & Design";
 }
 if (
 pathname.startsWith("/workspace/marketing/anuncios") ||
 pathname.startsWith("/workspace/marketing/stories") ||
 pathname.startsWith("/workspace/criador")
 ) {
 return "Marketing & Crescimento";
 }
 if (
 pathname.startsWith("/workspace/configuracoes") ||
 pathname.startsWith("/workspace/logistica") ||
 pathname.startsWith("/workspace/configuracoes/integracoes")
 ) {
 return "Ajustes da Loja";
 }
 if (pathname.startsWith("/workspace/financeiro/caixa")) {
 return "Início";
 }
 return "Início";
}

const MODULES = [
 { label: "Visão Geral", path: "/workspace", icon: "LayoutDashboard", group: "Meu Estúdio" },
 {
 label: "Eventos e Cultura",
 path: "/workspace/eventos",
 icon: "Calendar",
 group: "Eventos & Cultura",
 },
 {
 label: "Mercado e Estoque",
 path: "/workspace/catalogo/produtos",
 icon: "Package",
 group: "Mercado & Estoque",
 },
 {
 label: "Vendas e Caixa",
 path: "/workspace/pedidos",
 icon: "ShoppingBag",
 group: "Vendas & Caixa",
 },
 {
 label: "Comunidade",
 path: "/workspace/clientes",
 icon: "Users",
 group: "Comunidade",
 },
 {
 label: "Design",
 path: "/workspace/marketing/vitrine",
 icon: "Store",
 group: "Design & Presença",
 },
 {
 label: "Crescimento",
 path: "/workspace/marketing/promocoes",
 icon: "Megaphone",
 group: "Crescimento",
 },
 {
 label: "Ajustes",
 path: "/workspace/configuracoes",
 icon: "Settings",
 group: "Ajustes do Coletivo",
 },
];

import { TenantSwitcher } from "@/components/admin/tenant-switcher";

// HeaderRightIsland Component
// ---------------------------------------------------------------------------
function HeaderRightIsland({ session }: { session: any }) {
 const [timeStr, setTimeStr] = useState("");
 const [dateStr, setDateStr] = useState("");

 useEffect(() => {
 const update = () => {
 const now = new Date();
 setTimeStr(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
 setDateStr(
 now.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }),
 );
 };
 update();
 const interval = setInterval(update, 60000);
 return () => clearInterval(interval);
 }, []);

 return (
 <div className="flex h-10 items-center gap-3">
 {session?.memberships && session.memberships.length > 0 && (
 <div className="hidden sm:block">
 <TenantSwitcher identity={session} />
 </div>
 )}
 <div className="flex h-full items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground">
 {dateStr && (
 <span className="flex items-center gap-2 text-muted-foreground capitalize">
 <Calendar className="size-3.5 text-primary" />
 {dateStr}
 </span>
 )}
 <span className="h-3 w-px bg-border" />
 {timeStr && <span className="font-bold">{timeStr}</span>}
 <span className="h-3 w-px bg-border" />
 <Button
 variant="ghost"
 size="icon"
 className="size-6 text-muted-foreground hover:text-primary rounded-full"
 aria-label="Notificações"
 >
 <Bell className="size-4" />
 </Button>
 </div>
 </div>
 );
}

// ---------------------------------------------------------------------------
// AdminShell
// ---------------------------------------------------------------------------
export function AdminShell({
 children,
 session,
 logoUrl,
}: {
 children: ReactNode;
 session: any;
 logoUrl?: string;
}) {
 const [collapsed, setCollapsed] = useState(true);
 const router = useRouter();
 const queryClient = useQueryClient();
 const pathname = router.state.location.pathname;

 const handleLogout = async () => {
 try {
 const res = await signOut();

 // LIMPEZA ATÔMICA DE CACHES (Evita vazamento de PII multi-tenant)
 clearAppCache(router, queryClient);

 toast.success("Sessão encerrada.");
 window.location.href = "/";
 } catch (e: unknown) {
 toast.error(
 (e instanceof Error ? e.message : String(e)) || "Erro inesperado ao encerrar sessão.",
 );
 }
 };

 const getInitials = (email: string) => {
 const name = email.split("@")[0] || "U";
 return name.slice(0, 2).toUpperCase();
 };

 const activeGroup = getActiveGroup(pathname);

 // Switch viewMode based on route
 const [viewMode, setViewMode] = useState<"modules" | "subpages">(() => {
 return pathname === "/workspace" || pathname === "/workspace" || pathname === "/workspace/onboarding"
 ? "modules"
 : "subpages";
 });

 useEffect(() => {
 if (pathname === "/workspace" || pathname === "/workspace" || pathname === "/workspace/onboarding") {
 setViewMode("modules");
 } else {
 setViewMode("subpages");
 }
 }, [pathname]);

 const contextualAction = getContextualAction(pathname);
 const ActionIcon = contextualAction ? resolveIcon(contextualAction.icon) : null;

 // Filter sidebar groups based on user's role
 const filteredNav = ADMIN_SIDEBAR_NAV.map((group) => {
 const allowedItems = group.items.filter((item) => {
 const route = getRoute(item.path);
 return route ? hasRoleAccess(session?.role, route.roles) : false;
 });
 return { ...group, items: allowedItems };
 }).filter((group) => group.items.length > 0);

 const activeGroupNav = filteredNav.find((g) => g.title === activeGroup);

 // Filter Top-Level Modules based on role
 const filteredModules = MODULES.filter((mod) => {
 const route = getRoute(mod.path);
 return route ? hasRoleAccess(session?.role, route.roles) : false;
 });

 return (
 <div data-shell="admin" className="min-h-[100dvh] bg-background text-foreground">
 {/* Desktop sidebar - Vertical Island Pill Layout */}
 <aside
 onMouseEnter={() => setCollapsed(false)}
 onMouseLeave={() => setCollapsed(true)}
 className={cn(
 "fixed left-0 top-0 bottom-0 z-40 hidden flex-col bg-card shadow-op-md transition-all duration-300 md:flex pb-safe",
 collapsed ? "w-[68px]" : "w-64",
 )}
 >
 {/* Top: Brand/Logo & Action Button */}
 <div className="flex flex-col items-center gap-4 border-b border-sidebar-border p-3">
 {/* Dynamic Circular Action Button */}
 {contextualAction ? (
 <Link
 to={contextualAction.path}
 className={cn(
 "flex h-11 items-center gap-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all ",
 collapsed ? "w-11 justify-center" : "w-full px-4",
 )}
 title={contextualAction.label}
 >
 {ActionIcon && <ActionIcon className="size-5 shrink-0" />}
 {!collapsed && (
 <span className="text-xs font-bold truncate">{contextualAction.label}</span>
 )}
 </Link>
 ) : (
 <div
 className={cn(
 "flex items-center",
 collapsed ? "h-11 justify-center" : "h-11 w-full px-2",
 )}
 >
 {collapsed ? (
 <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
 <Store className="size-5 text-primary" />
 </div>
 ) : (
 <Link to="/workspace" className="flex items-center">
 <Logo className="h-6" src={logoUrl} />
 </Link>
 )}
 </div>
 )}
 {viewMode === "subpages" && (
 <Button
 variant="secondary"
 size="sm"
 className="w-full text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border-transparent"
 asChild
 >
 <Link to="/workspace" onClick={() => setViewMode("modules")}>
 {collapsed ? <Grid className="size-4" /> : "← Voltar aos Módulos"}
 </Link>
 </Button>
 )}
 </div>

 {/* Scrollable menu content */}
 <ScrollArea className="flex-1 px-3 py-4">
 {viewMode === "subpages" && activeGroupNav ? (
 <div className="space-y-4">
 {!collapsed && (
 <p className="eyebrow px-3 pb-1 text-primary font-bold tracking-wider">
 {activeGroupNav.title}
 </p>
 )}
 <ul className="space-y-1">
 {activeGroupNav.items.map((item) => {
 const Icon = resolveIcon(item.icon);
 return (
 <li key={item.path}>
 <Link
 to={item.path}
 activeOptions={{ exact: item.path === "/workspace" }}
 className={cn(
 "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
 collapsed && "justify-center",
 )}
 activeProps={{
 className: "bg-sidebar-accent text-sidebar-foreground",
 }}
 title={collapsed ? item.label : undefined}
 >
 <Icon className="size-5 shrink-0" aria-hidden />
 {!collapsed && (
 <span className="flex-1 truncate text-xs">{item.label}</span>
 )}
 </Link>
 </li>
 );
 })}
 </ul>
 </div>
 ) : (
 // Top level modules view
 <div className="space-y-4">
 {!collapsed && (
 <p className="eyebrow px-3 pb-1 text-muted-foreground font-bold tracking-wider">
 Módulos
 </p>
 )}
 <ul className="space-y-1">
 {filteredModules.map((mod) => {
 const Icon = resolveIcon(mod.icon);
 const isCurrent = activeGroup === mod.group;
 return (
 <li key={mod.path}>
 <Link
 to={mod.path}
 className={cn(
 "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
 isCurrent && "bg-sidebar-accent/50 text-sidebar-foreground",
 collapsed && "justify-center",
 )}
 title={collapsed ? mod.label : undefined}
 onClick={() => {
 setViewMode("subpages");
 }}
 >
 <Icon className="size-5 shrink-0" aria-hidden />
 {!collapsed && <span className="flex-1 truncate text-xs">{mod.label}</span>}
 </Link>
 </li>
 );
 })}
 </ul>
 </div>
 )}
 </ScrollArea>

 {/* Bottom actions: Storefront */}
 <div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
 <Button
 variant="ghost"
 size="sm"
 asChild
 className="w-full text-xs hover:bg-sidebar-accent"
 >
 <Link to="/">{collapsed ? <Store className="size-4" /> : "Ver loja pública"}</Link>
 </Button>

 {/* User profile & Logout footer */}
 <div className="mt-2 pt-2 border-t border-sidebar-border/60 flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 overflow-hidden">
 <Avatar className="size-8 ">
 <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
 {getInitials(session?.email || "Admin")}
 </AvatarFallback>
 </Avatar>
 {!collapsed && (
 <div className="flex flex-col min-w-0 text-left">
 <span
 className="font-semibold text-xs text-foreground truncate max-w-[120px]"
 title={session?.email}
 >
 {session?.email || "Colaborador"}
 </span>
 <span className="text-[9px] text-muted-foreground capitalize">
 {session?.role || "Acesso"}
 </span>
 </div>
 )}
 </div>
 {!collapsed && (
 <Button
 variant="ghost"
 size="icon"
 className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
 onClick={handleLogout}
 type="button"
 title="Sair do painel"
 >
 <LogOut className="size-4" />
 </Button>
 )}
 </div>
 </div>
 </aside>

 {/* Main column */}
 <div
 className={cn(
 "flex min-h-[100dvh] flex-col transition-all duration-300",
 collapsed ? "md:pl-20" : "md:pl-72",
 )}
 >
 {/* Topbar */}
 <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background border-b border-border px-4 pt-safe md:px-6">
 {/* Mobile menu */}
 <Sheet>
 <SheetTrigger asChild>
 <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
 <Menu className="size-5" aria-hidden />
 </Button>
 </SheetTrigger>
 <SheetContent side="left" className="w-72 bg-sidebar p-0">
 <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-4">
 <SheetTitle className="sr-only">Menu do painel</SheetTitle>
 <Logo className="h-6" src={logoUrl} />
 </SheetHeader>
 <ScrollArea className="h-[calc(100dvh-4rem)] px-3 py-4">
 <div className="space-y-6">
 {viewMode === "subpages" && activeGroupNav ? (
 <div className="space-y-4">
 <div className="px-3 pb-2 border-b border-sidebar-border/40 flex items-center justify-between">
 <span className="eyebrow text-primary font-bold tracking-wider text-xs">
 {activeGroupNav.title}
 </span>
 <Button
 variant="ghost"
 size="sm"
 className="h-8 px-2 text-nav font-semibold text-primary"
 asChild
 >
 <Link to="/workspace" onClick={() => setViewMode("modules")}>
 ← Módulos
 </Link>
 </Button>
 </div>
 <ul className="space-y-1">
 {activeGroupNav.items.map((item) => {
 const Icon = resolveIcon(item.icon);
 return (
 <li key={item.path}>
 <Link
 to={item.path}
 activeOptions={{ exact: item.path === "/workspace" }}
 className="flex min-h-11 items-center gap-3 px-3 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
 activeProps={{
 className: "bg-sidebar-accent text-sidebar-foreground",
 }}
 >
 <Icon className="size-5 shrink-0" aria-hidden />
 <span className="flex-1 truncate text-xs">{item.label}</span>
 </Link>
 </li>
 );
 })}
 </ul>
 </div>
 ) : (
 <div>
 <p className="eyebrow px-3 pb-2 text-muted-foreground font-bold tracking-wider text-xs">
 Módulos
 </p>
 <ul className="space-y-1">
 {filteredModules.map((mod) => {
 const Icon = resolveIcon(mod.icon);
 const isCurrent = activeGroup === mod.group;
 return (
 <li key={mod.path}>
 <Link
 to={mod.path}
 className={cn(
 "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
 isCurrent && "bg-sidebar-accent/50 text-sidebar-foreground",
 )}
 onClick={() => {
 setViewMode("subpages");
 }}
 >
 <Icon className="size-5 shrink-0" />
 <span className="text-xs">{mod.label}</span>
 </Link>
 </li>
 );
 })}
 </ul>
 </div>
 )}
 </div>
 </ScrollArea>
 </SheetContent>
 </Sheet>
 <Link to="/workspace" className="flex items-center md:hidden">
 <Logo className="h-6" />
 </Link>
 <span className="hidden text-sm font-semibold tracking-tight text-foreground/80 sm:inline-block">
 {activeGroup !== "Geral" ? `Painel > ${activeGroup}` : "Centro de Comando"}
 </span>

 {/* Premium Right Island showing Date/Time/Notifications */}
 <div className="ml-auto">
 <HeaderRightIsland session={session} />
 </div>
 </header>

 <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
 <div className="mx-auto max-w-screen-xl">{children}</div>
 </main>
 </div>

 {/* Mobile bottom nav — driven by ADMIN_BOTTOM_NAV from routes.ts */}
 <nav
 aria-label="Navegação do painel"
 className="fixed inset-x-0 bottom-0 z-30 bg-background border-t border-border pb-safe md:hidden"
 >
 <ul className="flex items-stretch justify-around">
 {ADMIN_BOTTOM_NAV.filter((item) => {
 const route = getRoute(item.path);
 return route ? hasRoleAccess(session?.role, route.roles) : false;
 }).map(({ path, label, icon }) => {
 const Icon = resolveIcon(icon);
 return (
 <li key={path} className="flex-1">
 <Link
 to={path}
 activeOptions={{ exact: path === "/workspace" }}
 className="flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-nav font-medium text-muted-foreground"
 activeProps={{ className: "text-primary" }}
 >
 <Icon className="size-5" aria-hidden />
 {label}
 </Link>
 </li>
 );
 })}
 </ul>
 </nav>
 </div>
 );
}
