import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
 Package,
 Tags,
 Tag,
 Store,
 LayoutDashboard,
 Settings,
 Calendar,
 Users,
 ShoppingBag,
 UserCircle,
 Truck,
 Boxes,
 Banknote,
 FileText,
 LayoutTemplate,
 Layers,
 Link2,
 Image as ImageIcon,
 ChevronDown,
 ChevronRight,
 ClipboardList,
 ShieldAlert,
 Megaphone,
 Flame,
 Newspaper,
 Plus,
 Sliders,
 BarChart3,
 DollarSign,
 Ticket,
 ArrowRightLeft,
 ArrowUpRight,
 User,
 LogOut,
 Bell,
 Check,
 ChevronsUpDown,
 Building2,
 ShieldCheck,
 UtensilsCrossed,
 Compass,
 ExternalLink,
 Coins,
 Zap,
 MessageSquare,
 Scale,
 Wrench,
 MapPin,
 Navigation,
 Briefcase,
 Plane,
 ShoppingCart,
 Eye,
 Receipt,
 AlertTriangle,
 ArrowDownUp,
 Search,
 HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth.functions";
import { setTenantContext } from "@/services/identity.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

import {
 resolveWorkspaceNavigation,
 type NavGroup,
 type NavItem,
} from "@/lib/workspace-navigation";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { WorkspaceAccountSwitcher } from "./workspace-account-switcher";
import { WorkspaceAllToolsDialog } from "./workspace-all-tools-dialog";
import { WorkspaceSidebarFlyout } from "./workspace-sidebar-flyout";
import { WorkspaceAccessDenied } from "./workspace-access-denied";


function getStoreContextualAction(storeData: any) {
 const semantics = getNicheSemantics(storeData);

 switch (semantics.nicheId) {
 case "gastronomy":
 return {
 label: "Ver Cardápio Online",
 icon: UtensilsCrossed,
 aba: "cardapio",
 };
 case "tourism":
 return {
 label: "Ver Espaço & Roteiros",
 icon: Compass,
 aba: "turismo",
 };
 case "services":
 return {
 label: "Ver Catálogo de Serviços",
 icon: Layers,
 aba: "servicos",
 };
 case "real_estate":
 return {
 label: "Ver Catálogo de Imóveis",
 icon: Building2,
 aba: "imoveis",
 };
 case "events":
 return {
 label: "Ver Eventos & Ingressos",
 icon: Compass,
 aba: "eventos",
 };
 case "jobs":
 return {
 label: "Ver Mural de Carreiras",
 icon: ArrowUpRight,
 aba: "vagas",
 };
 default:
 return {
 label: "Ver Loja Online",
 icon: ShoppingBag,
 aba: "catalogo",
 };
 }
}

function getStoreHeaderOperationalAction(storeData: any) {
 const semantics = getNicheSemantics(storeData);

 switch (semantics.nicheId) {
 case "tourism":
 return {
 label: "Grupos & Excursões",
 path: "/workspace/turismo/grupos",
 icon: Users,
 };
 case "services":
 return {
 label: "Grade de Agendamentos",
 path: "/workspace/agenda",
 icon: Calendar,
 };
 case "legal":
 return {
 label: "Processos & Prazos",
 path: "/workspace/advocacia",
 icon: Scale,
 };
 case "real_estate":
 return {
 label: "Catálogo de Imóveis",
 path: "/workspace/catalogo/produtos",
 icon: Building2,
 };
 case "events":
 return {
 label: "Meus Eventos & Lotes",
 path: "/workspace/eventos",
 icon: Compass,
 };
 case "jobs":
 return {
 label: "Vagas & Candidaturas",
 path: "/workspace/empregos/candidatos",
 icon: Briefcase,
 };
 case "gastronomy":
 case "retail":
 case "supermarket":
 case "wholesale":
 default:
 return {
 label: "Frente de Caixa (PDV)",
 path: "/workspace/pdv",
 icon: Store,
 };
 }
}

export function WorkspaceShell({ children, session }: { children: ReactNode; session?: any }) {
 const navigate = useNavigate();
 const routerState = useRouterState();
 const currentPath = routerState.location.pathname;

 const [isMasterAllVerticals, setIsMasterAllVerticals] = useState(false);
 const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);

 // Estado do Modal de Confirmação de Alternância de Contexto
 const [showPersonalSwitchModal, setShowPersonalSwitchModal] = useState(false);
 const [targetPersonalPath, setTargetPersonalPath] = useState<string>("/conta");

 const [isSwitching, setIsSwitching] = useState(false);
 const memberships = (session?.memberships as any[]) || [];
 const activeStoreId = session?.store_id;
 const activeStore = memberships.find((m) => m.store_id === activeStoreId) || memberships[0];

 const isPlatformAdmin =
 session?.user?.role === "platform_admin" ||
 session?.role === "platform_admin" ||
 session?.user?.user_metadata?.role === "platform_admin";

  const effectiveUserRole = isPlatformAdmin
    ? "owner"
    : (activeStore?.role || session?.role || "collaborator").toLowerCase();

  const activeModules = resolveWorkspaceNavigation(activeStore, {
    isMasterMode: isPlatformAdmin && isMasterAllVerticals,
    userRole: effectiveUserRole,
  });
  const currentSemantics = getNicheSemantics(activeStore);

  // Governança Granular de RBAC: Verificação de Permissão de Acesso à Rota Ativa
  const isAuthorized = (() => {
    if (isPlatformAdmin) return true;

    // 1. Proprietário(a) e Administrador(a) Legal possuem autoridade total
    if (
      effectiveUserRole === "owner" ||
      effectiveUserRole === "admin" ||
      effectiveUserRole === "proprietario"
    ) {
      return true;
    }

    // 2. Rotas estritas de Proprietário (bloqueadas para Gerentes e demais colaboradores)
    const OWNER_ONLY_ROUTES = [
      "/workspace/configuracoes/seguranca",
      "/workspace/configuracoes/excluir",
      "/workspace/settings/danger-zone",
      "/workspace/assinatura",
      "/workspace/faturamento",
      "/workspace/financeiro/faturas",
      "/workspace/financeiro/dados-bancarios",
      "/workspace/financeiro/saques",
      "/workspace/financeiro/configuracao",
      "/workspace/configuracoes/integracoes",
      "/workspace/configuracoes/ai",
      "/workspace/configuracoes/inteligencia-artificial",
      "/workspace/configuracoes/sessoes",
      "/workspace/configuracoes/privacidade-loja",
      "/workspace/configuracoes/parceiros",
      "/workspace/configuracoes/tokens",
      "/workspace/faturamento/tokens",
    ];

    if (OWNER_ONLY_ROUTES.some((r) => currentPath === r || currentPath.startsWith(r + "/"))) {
      return false;
    }

    // 3. Rotas restritas de Gestão de Equipe, Cargos e Folha (bloqueadas para vendedores, caixas, expedição)
    const TEAM_MANAGEMENT_ROUTES = [
      "/workspace/configuracoes/equipe",
    ];
    if (TEAM_MANAGEMENT_ROUTES.some((r) => currentPath === r || currentPath.startsWith(r + "/"))) {
      const allowedRoles = ["owner", "admin", "proprietario", "manager", "gerente", "rh", "recruiter"];
      if (!allowedRoles.includes(effectiveUserRole)) {
        return false;
      }
    }

    // 4. Rotas restritas Financeiras e de Repasse (bloqueadas para vendedores, atendentes e operadores gerais)
    const FINANCE_RESTRICTED_ROUTES = [
      "/workspace/financeiro/contas-pagar",
      "/workspace/financeiro/comissoes",
      "/workspace/financeiro/afiliados",
      "/workspace/financeiro/recebiveis",
      "/workspace/financeiro/relatorios-canal",
      "/workspace/financeiro/faturas",
      "/workspace/financeiro/funcionarios",
    ];
    if (FINANCE_RESTRICTED_ROUTES.some((r) => currentPath === r || currentPath.startsWith(r + "/"))) {
      const allowedFinanceRoles = ["owner", "admin", "proprietario", "manager", "gerente", "finance"];
      if (!allowedFinanceRoles.includes(effectiveUserRole)) {
        return false;
      }
    }

    // 5. Gerente Operacional: acesso aos módulos do dia a dia (exceto rotas críticas de proprietário)
    if (effectiveUserRole === "manager" || effectiveUserRole === "gerente") {
      return true;
    }

    // 6. Rotas universais e de onboarding geral do Workspace
    if (
      currentPath === "/workspace" ||
      currentPath === "/workspace/" ||
      currentPath.startsWith("/workspace/onboarding")
    ) {
      return true;
    }

    // 7. Demais colaboradores: valida se a rota pertence aos módulos autorizados para o cargo
    return activeModules.some((group) =>
      group.items.some(
        (item) => currentPath === item.path || currentPath.startsWith(item.path + "/")
      )
    );
  })();

 const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
 const initial: Record<string, boolean> = { overview: true };
 for (const group of activeModules) {
 if (group.items.some((item) => currentPath.startsWith(item.path))) {
 initial[group.id] = true;
 }
 }
 return initial;
 });

 const userDisplayName =
 session?.user?.user_metadata?.full_name ||
 session?.user?.email?.split("@")[0] ||
 session?.email?.split("@")[0] ||
 "Usuário";

 const userInitial = userDisplayName.charAt(0).toUpperCase();

 const toggleGroup = (groupId: string) => {
 setExpandedGroups((prev) => ({
 ...prev,
 [groupId]: !prev[groupId],
 }));
 };

 // Atalho global Cmd+K ou Ctrl+K para abrir Todas as Ferramentas
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
 e.preventDefault();
 setIsAllToolsOpen((prev) => !prev);
 }
 };
 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, []);

 const handleLogout = async () => {
 try {
 await signOut();
 window.location.href = "/";
 } catch (e) {
 console.error(e);
 }
 };

 const handleSwitchStore = async (storeId: string) => {
 if (storeId === activeStoreId || isSwitching) return;
 setIsSwitching(true);
 try {
 if (typeof window !== "undefined") {
 window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
 }
 const res = await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
 const storeName = res?.storeName || "Espaço";
 toast.success(`Espaço de trabalho alterado para ${storeName}`);
 window.location.href = "/workspace";
 } catch {
 toast.error("Erro ao alternar loja.");
 setIsSwitching(false);
 }
 };

 const confirmSwitchToPersonal = () => {
 setShowPersonalSwitchModal(false);
 toast.info(`Alternando para o perfil de ${userDisplayName}...`);
 navigate({ to: targetPersonalPath as any });
 };

 const requestSwitchToPersonal = (destination = "/conta") => {
 setTargetPersonalPath(destination);
 setShowPersonalSwitchModal(true);
 };

 const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
 <div className="flex flex-col space-y-1 select-none">
 {/* ── Módulo VIP: Painel Global Master para Platform Admin ── */}
 {isPlatformAdmin && (
 <div className="mb-2 pb-2 border-b border-border/40 space-y-1.5">
 <Link
 to="/admin-master"
 className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all font-bold text-xs group"
 >
 <div className="flex items-center gap-2">
 <ShieldAlert className="size-4 text-primary shrink-0" />
 <span className="truncate">Painel Global Master</span>
 </div>
 <ArrowUpRight className="size-3.5 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
 </Link>

 <button
 type="button"
 onClick={() => setIsMasterAllVerticals((prev) => !prev)}
 className={cn(
 "w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer",
 isMasterAllVerticals
 ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
 : "bg-muted/40 text-muted-foreground border-border/40 hover:text-foreground"
 )}
 >
 <span>{isMasterAllVerticals ? "Modo Master: Todas as Verticais" : "Filtrar por Nicho da Loja"}</span>
 <span className="size-2 rounded-full" style={{ backgroundColor: isMasterAllVerticals ? "var(--color-amber-500, #f59e0b)" : "currentColor" }} />
 </button>
 </div>
 )}

 {/* Lista de Grupos de Navegação com Flyout Flutuante / Accordion */}
 {activeModules.map((group, idx) => {
 const prevGroup = idx > 0 ? activeModules[idx - 1] : undefined;
 const isNewSection = prevGroup && group.section && group.section !== prevGroup.section;

 const sectionLabel =
 group.section === "master"
 ? "Principal"
 : group.section === "niche"
 ? (currentSemantics?.name ? `Operação · ${currentSemantics.name}` : "Operação do Segmento")
 : group.section === "corporate"
 ? "Gestão Corporativa"
 : undefined;

 const isGroupActive = group.items.some((item) =>
 item.path === "/workspace"
 ? currentPath === "/workspace"
 : currentPath.startsWith(item.path),
 );
 const isExpanded = expandedGroups[group.id] ?? isGroupActive;

 return (
 <div key={group.id} className="space-y-0.5">
 {isNewSection && sectionLabel && (
 <div className="pt-2.5 pb-1 px-2.5 flex items-center gap-2 select-none">
 <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground/60 uppercase truncate">
 {sectionLabel}
 </span>
 <div className="h-px bg-border/40 flex-1 shrink-0" />
 </div>
 )}
 <WorkspaceSidebarFlyout
 group={group}
 currentPath={currentPath}
 isExpanded={isExpanded}
 onToggleExpand={() => toggleGroup(group.id)}
 isMobile={isMobile}
 />
 </div>
 );
 })}
 </div>
 );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans relative">
      {/* ── 1. BARRA LATERAL CANÔNICA DO WORKSPACE (PADRÃO META STUDIO - FIXA) ── */}
      <aside className="hidden lg:flex flex-col w-[268px] shrink-0 sticky top-0 h-screen bg-background border-r border-border/60 justify-between select-none z-30 overflow-hidden">
        {/* Topo da Sidebar com altura exata h-14 (56px) alinhada continuamente à linha do Header */}
        <div className="h-14 border-b border-border/60 px-3 flex items-center shrink-0">
          <WorkspaceAccountSwitcher
            memberships={memberships}
            activeStoreId={activeStoreId}
            activeStore={activeStore}
            userDisplayName={userDisplayName}
            userEmail={session?.email}
            isSwitching={isSwitching}
            onSwitchStore={handleSwitchStore}
          />
        </div>

        {/* Lista de Navegação com Scroll Suave */}
        <ScrollArea className="flex-1 px-3 py-3 pr-2 overflow-x-hidden">
          <NavLinks isMobile={false} />
        </ScrollArea>

 {/* ── Ações Canônicas de Rodapé da Sidebar (Padrão Meta Business Suite) ── */}
 <div className="p-3 space-y-1 border-t border-border/60 shrink-0">
 {/* 1. Botão "Todas as ferramentas" */}
 <button
 type="button"
 onClick={() => setIsAllToolsOpen(true)}
 className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
 >
 <Sliders className="size-4 text-primary shrink-0" />
 <span className="truncate">Todas as ferramentas</span>
 </button>

 {/* 2. Pesquisar */}
 <button
 type="button"
 onClick={() => setIsAllToolsOpen(true)}
 className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
 >
 <Search className="size-4 shrink-0 text-muted-foreground" />
 <span className="truncate">Pesquisar</span>
 </button>

 {/* 3. Configurações da Loja */}
 <Link
 to="/workspace/configuracoes"
 className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
 >
 <Settings className="size-4 shrink-0 text-muted-foreground" />
 <span className="truncate">Configurações</span>
 </Link>

 {/* 4. Central de Ajuda & Retorno ao Super App */}
 <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
 <Link
 to="/termos"
 className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors"
 >
 <HelpCircle className="size-3.5" />
 <span>Ajuda</span>
 </Link>

 <Link
 to="/conta"
 className="flex items-center gap-1 text-primary hover:underline px-2 py-1 font-bold"
 title="Voltar ao marketplace"
 >
 <span>Super App</span>
 <ArrowUpRight className="size-3" />
 </Link>
 </div>
 </div>
 </aside>

      {/* ── 2. ÁREA PRINCIPAL COM HEADER OPERACIONAL DEDICADO ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 bg-background/95 backdrop-blur-md border-b border-border/60 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sheet Trigger */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="size-11 min-w-[44px] min-h-[44px] rounded-lg">
                <Sliders className="size-4" />
              </Button>
            </SheetTrigger>
 <SheetContent side="left" className="w-[290px] p-4">
 <div className="space-y-4">
 <div className="font-bold text-sm text-foreground">Menu Operacional</div>
 <ScrollArea className="h-[calc(100dvh-100px)] pr-2">
 <NavLinks isMobile={true} />
 </ScrollArea>
 </div>
 </SheetContent>
 </Sheet>
 </div>
 </div>

 {/* Ações do Header do Workspace */}
 <div className="flex items-center gap-2">
 {/* Botão Contextual da Loja Pública (Cardápio / Loja Online) */}
 {(() => {
 const storeData = activeStore?.store || activeStore;
 const storeSlug = storeData?.slug || storeData?.store_slug || activeStoreId;
 const contextualAction = getStoreContextualAction(storeData);
 const ActionIcon = contextualAction.icon;

 return (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-8 rounded-xl text-xs font-bold gap-1.5 hidden md:inline-flex border-border bg-card hover:bg-muted"
 >
 <Link
 to="/perfil-da-loja"
 search={{ slug: storeSlug, aba: contextualAction.aba }}
 target="_blank"
 rel="noopener noreferrer"
 >
 <ActionIcon className="size-3.5 text-primary" />
 <span>{contextualAction.label}</span>
 <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
 </Link>
 </Button>
 );
 })()}

 {/* Botão Painel Global Master para Platform Admin */}
 {isPlatformAdmin && (
 <Button
 asChild
 size="sm"
 className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-amber-500 via-primary to-indigo-600 text-white hover:opacity-95 shadow-xs cursor-pointer"
 >
 <Link to="/admin-master">
 <ShieldAlert className="size-3.5" />
 <span>Painel Global Master</span>
 </Link>
 </Button>
 )}

 {/* Ação Operacional Primária Contextual por Nicho */}
 {(() => {
 const storeData = activeStore?.store || activeStore;
 const opAction = getStoreHeaderOperationalAction(storeData);
 const OpIcon = opAction.icon;

 return (
 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-8 rounded-xl text-xs font-bold gap-1.5 hidden sm:inline-flex border-border bg-card hover:bg-muted"
 >
 <Link to={opAction.path as never}>
 <OpIcon className="size-3.5 text-primary" />
 <span>{opAction.label}</span>
 </Link>
 </Button>
 );
 })()}

 {/* Menu do Operador com Troca de Contexto Protegida */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 type="button"
 className="flex items-center gap-2 p-1 pl-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/80 transition-all cursor-pointer"
 >
 <span className="text-xs font-bold text-foreground max-w-[120px] truncate hidden md:inline-block">
 {userDisplayName}
 </span>
 <Avatar className="size-7 rounded-lg">
 <AvatarImage src="" alt={userDisplayName} />
 <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
 {userInitial}
 </AvatarFallback>
 </Avatar>
 </button>
 </DropdownMenuTrigger>

 <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 border border-border">
 <DropdownMenuLabel className="font-normal px-2 py-1.5">
 <p className="text-xs font-bold text-foreground truncate">{userDisplayName}</p>
 <p className="text-[10px] font-mono text-muted-foreground truncate">{session?.email}</p>
 <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
 Operando: {activeStore?.name || "Loja"}
 </span>
 </DropdownMenuLabel>

 <DropdownMenuSeparator className="bg-border" />

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs">
 <Link to="/workspace/configuracoes">
 <Settings className="size-3.5 mr-2 text-muted-foreground" />
 <span>Configurações da Loja</span>
 </Link>
 </DropdownMenuItem>

 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs">
 <Link to="/workspace/lojas">
 <Building2 className="size-3.5 mr-2 text-muted-foreground" />
 <span>Trocar de Unidade / Loja</span>
 </Link>
 </DropdownMenuItem>

 <DropdownMenuSeparator className="bg-border" />

 {/* Retorno direto ao perfil pessoal — sem modal */}
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold text-foreground flex items-center justify-between">
 <Link to="/conta">
 <div className="flex items-center gap-2">
 <UserCircle className="size-3.5 text-primary" />
 <span>Minha Conta Pessoal</span>
 </div>
 <ArrowUpRight className="size-3 text-muted-foreground" />
 </Link>
 </DropdownMenuItem>

 {(() => {
 const storeData = activeStore?.store || activeStore;
 const storeSlug = storeData?.slug || storeData?.store_slug || activeStoreId;
 const contextualAction = getStoreContextualAction(storeData);
 const ActionIcon = contextualAction.icon;

 return (
 <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold text-foreground flex items-center justify-between">
 <Link
 to="/perfil-da-loja"
 search={{ slug: storeSlug, aba: contextualAction.aba }}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center justify-between w-full"
 >
 <div className="flex items-center gap-2">
 <ActionIcon className="size-3.5 text-primary" />
 <span>{contextualAction.label}</span>
 </div>
 <ExternalLink className="size-3 text-muted-foreground" />
 </Link>
 </DropdownMenuItem>
 );
 })()}

 <DropdownMenuSeparator className="bg-border" />

 <DropdownMenuItem
 onClick={handleLogout}
 className="rounded-xl cursor-pointer text-xs text-destructive focus:text-destructive"
 >
 <LogOut className="size-3.5 mr-2" />
 <span>Encerrar Sessão</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </header>

        <main id="workspace-main-content" className="flex-1 w-full overflow-y-auto no-scrollbar">
          <div className="w-full max-w-7xl mx-auto px-[1px] sm:px-6 lg:px-8 py-2 sm:py-6 pb-24">
            {isAuthorized ? (
              children
            ) : (
              <WorkspaceAccessDenied
                role={effectiveUserRole}
                path={currentPath}
                storeName={activeStore?.name}
              />
            )}
          </div>
        </main>
 </div>

 {/* ── 3. MODAL DE CONFIRMAÇÃO DE ALTERNÂNCIA DE CONTEXTO (PROTEÇÃO RIGOROSA) ── */}
 <Dialog open={showPersonalSwitchModal} onOpenChange={setShowPersonalSwitchModal}>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden sm:rounded-2xl bg-background border border-border">
 <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border/40">
 <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 border border-primary/20">
 <ArrowRightLeft className="size-5" />
 </div>
 <DialogTitle className="text-lg font-black tracking-tight text-foreground">
 Alternar para Perfil Pessoal?
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Você está prestes a sair do ambiente operacional da loja.
 </DialogDescription>
 </DialogHeader>

 <div className="p-6 space-y-4 text-xs">
 {/* Box informativo de transição de identidade */}
 <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
 <div className="flex items-center justify-between text-[11px]">
 <span className="text-muted-foreground">Ambiente Atual:</span>
 <span className="font-bold text-foreground">Loja {activeStore?.name || "Matriz"}</span>
 </div>
 <div className="h-px bg-border/60" />
 <div className="flex items-center justify-between text-[11px]">
 <span className="text-muted-foreground">Destino:</span>
 <span className="font-bold text-primary">Perfil Pessoal ({userDisplayName})</span>
 </div>
 </div>

 <p className="text-muted-foreground leading-relaxed">
 Deseja confirmar a alternância de identidade para o perfil pessoal de <strong>{userDisplayName}</strong>?
 </p>
 </div>

 <DialogFooter className="p-4 bg-muted/10 border-t border-border/40 flex flex-col sm:flex-row gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setShowPersonalSwitchModal(false)}
 className="w-full sm:w-auto rounded-xl text-xs font-bold"
 >
 Permanecer no Painel
 </Button>
 <Button
 type="button"
 onClick={confirmSwitchToPersonal}
 className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5"
 >
 <Check className="size-3.5" />
 <span>Sim, alternar para {userDisplayName}</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── 4. HUB GLOBAL "TODAS AS FERRAMENTAS" (PADRÃO META STUDIO - IMAGEM 1) ── */}
 <WorkspaceAllToolsDialog
 open={isAllToolsOpen}
 onOpenChange={setIsAllToolsOpen}
 activeStore={activeStore}
 />
 </div>
 );
}
