import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarSimple, SquaresFour } from "@phosphor-icons/react";
import { StatefulNavIcon } from "@/components/ui/stateful-nav-icon";
import { WorkspaceQuickChatDock } from "./workspace-quick-chat-dock";
import { Package, Tags, Tag, Store, LayoutDashboard, Settings, Calendar, Users, ShoppingBag, UserCircle, Truck, Boxes, Banknote, FileText, LayoutTemplate, Layers, Link2, Image as ImageIcon, ChevronDown, ChevronRight, ClipboardList, ShieldAlert, Megaphone, Flame, Newspaper, Plus, Sliders, BarChart3, DollarSign, Ticket, ArrowRightLeft, ArrowUpRight, User, LogOut, Bell, Check, ChevronsUpDown, Building2, ShieldCheck, UtensilsCrossed, Compass, ExternalLink, Coins, Zap, Scale, Wrench, MapPin, Navigation, Briefcase, Plane, ShoppingCart, Eye, Receipt, AlertTriangle, ArrowDownUp, Search, HelpCircle, LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth.functions";
import { getBrowserClient } from "@/lib/supabase";
import { setTenantContext } from "@/services/identity.functions";
import { setClientContextCookies, getClientActiveTenant } from "@/lib/context-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

import { resolveWorkspaceNavigation, getSidebarConfig, getMasterSidebarPillars, type NavGroup, type NavItem, type MasterPillar } from "@/lib/workspace-navigation";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getNicheTranslation } from "@/lib/niche-dictionary";
import { WorkspaceAccountSwitcher } from "./workspace-account-switcher";
import { WorkspaceAllToolsDialog } from "./workspace-all-tools-dialog";
import { WorkspaceSidebarFlyout } from "./workspace-sidebar-flyout";
import { WorkspaceAccessDenied } from "./workspace-access-denied";
import {
  getBrandVerticalById,
  resolveBrandContextFromHost,
  canAccessModule,
  type SubscriptionTierId,
} from "@/lib/multi-brand-engine";


function getStoreContextualAction(storeData: any) {
  const semantics = getNicheSemantics(storeData);

  switch (semantics.nicheId) {
    case "gastronomy":
      return {
        label: "Cardápio",
        icon: UtensilsCrossed,
        aba: "cardapio",
      };
    case "tourism":
      return {
        label: "Roteiros",
        icon: Compass,
        aba: "turismo",
      };
    case "services":
      return {
        label: "Serviços",
        icon: Layers,
        aba: "servicos",
      };
    case "real_estate":
      return {
        label: "Imóveis",
        icon: Building2,
        aba: "imoveis",
      };
    case "events":
      return {
        label: "Eventos",
        icon: Compass,
        aba: "eventos",
      };
    case "jobs":
      return {
        label: "Carreiras",
        icon: ArrowUpRight,
        aba: "vagas",
      };
    default:
      return {
        label: "Vitrine Pública",
        icon: Store,
        aba: "catalogo",
      };
  }
}

function getStoreHeaderOperationalAction(storeData: any) {
  const semantics = getNicheSemantics(storeData);

  switch (semantics.nicheId) {
    case "tourism":
      return {
        label: "Excursões",
        path: "/workspace/turismo/grupos",
        icon: Users,
      };
    case "services":
      return {
        label: "Agenda",
        path: "/workspace/agenda",
        icon: Calendar,
      };
    case "legal":
      return {
        label: "Processos",
        path: "/workspace/advocacia",
        icon: Scale,
      };
    case "real_estate":
      return {
        label: "Imóveis",
        path: "/workspace/catalogo/produtos",
        icon: Building2,
      };
    case "events":
      return {
        label: "Eventos",
        path: "/workspace/eventos",
        icon: Compass,
      };
    case "jobs":
      return {
        label: "Candidaturas",
        path: "/workspace/empregos/candidatos",
        icon: Briefcase,
      };
    case "gastronomy":
    case "retail":
    case "supermarket":
    case "wholesale":
    default:
      return {
        label: "Frente de Caixa",
        path: "/workspace/pdv",
        icon: Store,
      };
  }
}

export function WorkspaceShell({ children, session }: { children: ReactNode; session?: any }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

 // Estado do Modal de Confirmação de Alternância de Contexto
 const [showPersonalSwitchModal, setShowPersonalSwitchModal] = useState(false);
 const [targetPersonalPath, setTargetPersonalPath] = useState<string>("/conta");

 const [isSwitching, setIsSwitching] = useState(false);
  const isPlatformAdmin = Boolean(
    session?.user?.role === "platform_admin" ||
    session?.role === "platform_admin" ||
    session?.role === "master" ||
    session?.user?.role === "master" ||
    session?.user?.user_metadata?.role === "platform_admin"
  );

  const memberships = (session?.memberships as any[]) || [];
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const queryStoreId = searchParams.get("storeId");
  const clientTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
  const isQueryValid = queryStoreId && (isPlatformAdmin || memberships.some((m) => m.store_id === queryStoreId));
  const isClientValid = clientTenant && (isPlatformAdmin || memberships.some((m) => m.store_id === clientTenant));

  const activeStoreId =
    (isQueryValid ? queryStoreId : null) ||
    (isClientValid ? clientTenant : null) ||
    session?.store_id ||
    memberships[0]?.store_id;
  const activeStore = memberships.find((m) => m.store_id === activeStoreId) || memberships[0];

  const effectiveUserRole = isPlatformAdmin
    ? "owner"
    : (activeStore?.role || session?.role || "collaborator").toLowerCase();

  const rawStoreEntity = activeStore?.store || activeStore;
  const activeBrandVertical = (() => {
    const explicitBrand = rawStoreEntity?.brand_origin || rawStoreEntity?.settings?.brand_origin;
    if (explicitBrand) return getBrandVerticalById(explicitBrand);
    if (typeof window !== "undefined") {
      const hostResolved = resolveBrandContextFromHost(window.location.host);
      if (hostResolved.id !== "waesy") return hostResolved;
    }
    return getBrandVerticalById("waesy");
  })();
  const activeStoreTier: SubscriptionTierId =
    (rawStoreEntity?.subscription_tier || rawStoreEntity?.settings?.subscription_tier || "pro") as SubscriptionTierId;
  const activeEnabledModules: string[] = Array.isArray(rawStoreEntity?.enabled_modules)
    ? rawStoreEntity.enabled_modules
    : Array.isArray(rawStoreEntity?.settings?.enabled_modules)
      ? rawStoreEntity.settings.enabled_modules
      : [];

  const rawSidebarModules = getSidebarConfig(activeStore, {
    isMasterMode: false,
    userRole: effectiveUserRole,
  });
  const activeModules = rawSidebarModules
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isPlatformAdmin) return true;
        if (activeStoreTier === "starter" && activeEnabledModules.length > 0) {
          return canAccessModule(rawStoreEntity, group.id);
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
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
      "/workspace/configuracoes/planos",
      "/workspace/configuracoes/ai",
      "/workspace/configuracoes/inteligencia-artificial",
      "/workspace/configuracoes/sessoes",
      "/workspace/configuracoes/privacidade-loja",
      "/workspace/configuracoes/parceiros",
      "/workspace/configuracoes/tokens",
      "/workspace/configuracoes/pwa",
      "/workspace/faturamento/tokens",
      "/workspace/tokens",
      "/workspace/configuracoes/dominios",
      "/workspace/financeiro/dre",
      "/workspace/financeiro/fechamento",
      "/workspace/configuracoes/fiscal",
      "/workspace/configuracoes/pagamentos",
      "/workspace/admin",
    ];

    if (OWNER_ONLY_ROUTES.some((r) => currentPath === r || currentPath.startsWith(r + "/"))) {
      return false;
    }

    // 3. Rotas restritas de Gestão de Equipe, Cargos e Folha (bloqueadas para vendedores, caixas, expedição)
    const TEAM_MANAGEMENT_ROUTES = [
      "/workspace/configuracoes/equipe",
      "/workspace/rh/ponto",
      "/workspace/rh/folha",
      "/workspace/rh/rescisao",
      "/workspace/empregos/candidatos",
      "/workspace/financeiro/funcionarios",
    ];
    if (TEAM_MANAGEMENT_ROUTES.some((r) => currentPath === r || currentPath.startsWith(r + "/"))) {
      const allowedRoles = ["owner", "admin", "proprietario", "manager", "gerente", "rh", "recruiter"];
      if (!allowedRoles.includes(effectiveUserRole)) {
        return false;
      }
    }

    // 4. Rotas restritas Financeiras e de Repasse (bloqueadas para vendedores, atendentes e operadores gerais)
    const FINANCE_RESTRICTED_ROUTES = [
      "/workspace/financeiro/caixa/turnos",
      "/workspace/financeiro/contas-pagar",
      "/workspace/financeiro/comissoes",
      "/workspace/financeiro/afiliados",
      "/workspace/financeiro/recebiveis",
      "/workspace/financeiro/relatorios-canal",
      "/workspace/financeiro/faturas",
      "/workspace/financeiro/funcionarios",
      "/workspace/financeiro/comprovantes",
      "/workspace/financeiro/caixa/lancamentos",
      "/workspace/financeiro/pagamentos",
      "/workspace/relatorios",
      "/workspace/relatorios/metas",
      "/workspace/relatorios/gastronomia",
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

  const [syncedProfile, setSyncedProfile] = useState<{
    avatarUrl?: string | null;
    fullName?: string | null;
  }>({});
  const [headerAvatarFailed, setHeaderAvatarFailed] = useState(false);
  const [railAvatarFailed, setRailAvatarFailed] = useState(false);

  const rawAvatarUrl =
    session?.avatar_url ||
    session?.avatarUrl ||
    session?.profile?.avatar_url ||
    session?.user?.avatar_url ||
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    syncedProfile.avatarUrl ||
    null;

  useEffect(() => {
    setHeaderAvatarFailed(false);
    setRailAvatarFailed(false);
  }, [rawAvatarUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const { getBrowserClient } = await import("@/lib/supabase");
        const supabase = getBrowserClient();
        const userId = session?.id || session?.userId || session?.user?.id;
        let resolvedAvatar: string | null = null;
        let resolvedName: string | null = null;

        if (userId) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("avatar_url, full_name")
            .eq("id", userId)
            .maybeSingle();
          if (profileRow?.avatar_url) resolvedAvatar = profileRow.avatar_url;
          if (profileRow?.full_name) resolvedName = profileRow.full_name;
        }

        if (!resolvedAvatar) {
          const { data: authData } = await supabase.auth.getUser();
          const u = authData?.user;
          if (u) {
            const idData = u.identities?.[0]?.identity_data as Record<string, any> | undefined;
            resolvedAvatar =
              u.user_metadata?.avatar_url ||
              u.user_metadata?.picture ||
              idData?.avatar_url ||
              idData?.picture ||
              null;
            if (!resolvedName) {
              resolvedName = u.user_metadata?.full_name || null;
            }
          }
        }

        if (!cancelled && (resolvedAvatar || resolvedName)) {
          setSyncedProfile({ avatarUrl: resolvedAvatar, fullName: resolvedName });
        }
      } catch {
        // Silencioso em caso de offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.userId, session?.user?.id]);

  const userDisplayName =
    session?.fullName ||
    session?.profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    syncedProfile.fullName ||
    session?.user?.email?.split("@")[0] ||
    session?.email?.split("@")[0] ||
    "Usuário";

  const userInitial = userDisplayName.charAt(0).toUpperCase();

  const masterPillars = useMemo(
    () => getMasterSidebarPillars(activeModules, activeStore),
    [activeModules, activeStore]
  );

  const matchedRoutePillarId = useMemo(() => {
    if (currentPath === "/workspace" || currentPath === "/workspace/") {
      return "overview";
    }
    let bestPillarId = "overview";
    let bestMatchLength = 0;
    for (const pillar of masterPillars) {
      for (const item of pillar.items) {
        if (item.path === "/workspace") continue;
        if (currentPath === item.path || currentPath.startsWith(item.path + "/")) {
          if (item.path.length > bestMatchLength) {
            bestMatchLength = item.path.length;
            bestPillarId = pillar.id;
          }
        }
      }
    }
    return bestPillarId;
  }, [currentPath, masterPillars]);

  const [selectedPillarId, setSelectedPillarId] = useState<string>(matchedRoutePillarId);
  const [isSubSidebarOpen, setIsSubSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPillarId(matchedRoutePillarId);
    if (
      currentPath.startsWith("/workspace/estudio") ||
      currentPath.startsWith("/workspace/builder")
    ) {
      setIsSubSidebarOpen(false);
    }
  }, [matchedRoutePillarId, currentPath]);

  const activeMasterPillar: MasterPillar | undefined =
    masterPillars.find((p) => p.id === selectedPillarId) ||
    masterPillars.find((p) => p.id === matchedRoutePillarId) ||
    masterPillars[0];

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
      if (typeof window !== "undefined") {
        await getBrowserClient().auth.signOut().catch(() => {});
        setClientContextCookies({ context: "civil" });
      }
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
      setClientContextCookies({ context: "store", storeId });
      const res = await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
      const storeName = res?.storeName || "Espaço";
      toast.success(`Espaço de trabalho alterado para ${storeName}`);
      window.location.href = `/workspace?storeId=${encodeURIComponent(storeId)}`;
    } catch {
      toast.error("Erro ao alternar loja.");
      setIsSwitching(false);
    }
  };

  const confirmSwitchToPersonal = async () => {
    setShowPersonalSwitchModal(false);
    setClientContextCookies({ context: "civil" });
    await setTenantContext({ data: { store_id: null } }).catch(() => null);
    toast.success(`Alternando para o perfil de ${userDisplayName}...`);
    window.location.href = targetPersonalPath || "/conta";
  };

  const requestSwitchToPersonal = (destination = "/conta") => {
    setTargetPersonalPath(destination);
    setShowPersonalSwitchModal(true);
  };

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col space-y-1 select-none">

 {/* Lista de Grupos de Navegação com Flyout Flutuante / Accordion */}
 {activeModules.length === 0 ? (
 <div className="rounded-lg border border-border/60 px-3 py-4 text-xs text-muted-foreground">
 Nenhum módulo disponível.
 </div>
 ) : activeModules.map((group, idx) => {
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
 <div key={group.id} className="space-y-1">
 {isNewSection && sectionLabel && (
 <div className="pt-3 pb-1 px-3 flex items-center gap-2 select-none">
 <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground/60 uppercase truncate">
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
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans relative">
      {/* ── 1. SIDEBAR DUPLA CANÔNICA (COLUNA 1 SETORES + COLUNA 2 SUBMÓDULOS) ── */}
      <aside className="hidden waesy-expanded-flex flex-row shrink-0 sticky top-0 h-dvh select-none z-30 overflow-hidden">
        {/* 1A. COLUNA 1 — TRILHO FINO DE SETORES (SOMENTE ÍCONES OUTLINE / FILL ATIVO - 56px) */}
        <TooltipProvider delayDuration={120}>
          <div className="w-14 bg-rail border-r border-sidebar-border flex flex-col items-center justify-between py-3 shrink-0 h-dvh">
            {/* Topo do Trilho Fino: Alternar Coluna 2 */}
            <div className="h-11 flex items-center justify-center shrink-0 mb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsSubSidebarOpen((prev) => !prev)}
                    aria-label={isSubSidebarOpen ? "Recolher submenu" : "Expandir submenu"}
                    className={cn(
                      "size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSubSidebarOpen
                        ? "bg-rail-active text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                    )}
                  >
                    <SidebarSimple
                      weight={isSubSidebarOpen ? "fill" : "regular"}
                      size={20}
                      className="size-5 shrink-0"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {isSubSidebarOpen ? "Recolher menu" : "Expandir menu"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Lista Central de Setores (Somente Ícones — Sólido quando ativo, Outline quando inativo) */}
            <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-1 py-1 px-1">
              {masterPillars.map((pillar) => {
                const PillarIcon = pillar.icon;
                const isSelected = activeMasterPillar?.id === pillar.id;
                const isRouteInPillar = matchedRoutePillarId === pillar.id;

                return (
                  <Tooltip key={pillar.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setIsSubSidebarOpen((prev) => !prev);
                            return;
                          }
                          setSelectedPillarId(pillar.id);
                          if (!isSubSidebarOpen) {
                            setIsSubSidebarOpen(true);
                          }
                          if (!isRouteInPillar && pillar.defaultPath) {
                            navigate({ to: pillar.defaultPath as never });
                          }
                        }}
                        aria-label={pillar.label}
                        aria-current={isSelected ? "page" : undefined}
                        className={cn(
                          "size-11 min-w-11 min-h-11 rounded-xl relative flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "bg-rail-active text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-rail-hover"
                        )}
                      >
                        <StatefulNavIcon
                          icon={PillarIcon}
                          active={isSelected}
                          size={20}
                          className="size-5 shrink-0"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {pillar.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Rodapé do Trilho Fino: Ferramentas Rápidas e Conta Pessoal */}
            <div className="w-full pt-2 border-t border-sidebar-border flex flex-col items-center gap-1 px-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsAllToolsOpen(true)}
                    aria-label="Ferramentas"
                    className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <SquaresFour weight="regular" size={20} className="size-5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Ferramentas (Ctrl+K)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => requestSwitchToPersonal("/conta")}
                    aria-label={userDisplayName}
                    className="size-11 min-w-11 min-h-11 rounded-xl flex items-center justify-center hover:bg-rail-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {rawAvatarUrl && !railAvatarFailed ? (
                      <img
                        src={rawAvatarUrl}
                        alt={userDisplayName}
                        onError={() => setRailAvatarFailed(true)}
                        className="size-7 rounded-full object-cover bg-muted"
                      />
                    ) : (
                      <span className="size-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                        {userInitial}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {userDisplayName}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* 1B. COLUNA 2 — SIDEBAR SECUNDÁRIA CONTEXTUAL (EXPANDE SOB DEMANDA - 224px) */}
        {isSubSidebarOpen && (
          <div className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col justify-between h-dvh shrink-0 overflow-hidden">
            {/* Topo da Sidebar Secundária (h-14): Alternar Loja */}
            <div className="h-14 px-3 flex items-center shrink-0">
              <WorkspaceAccountSwitcher
                memberships={memberships}
                activeStoreId={activeStoreId}
                activeStore={activeStore}
                userDisplayName={userDisplayName}
                userEmail={session?.email}
                userAvatarUrl={rawAvatarUrl}
                isSwitching={isSwitching}
                onSwitchStore={handleSwitchStore}
                onSwitchToPersonal={confirmSwitchToPersonal}
              />
            </div>

            {/* Submódulos do Setor Ativo */}
            <ScrollArea className="flex-1 px-2 py-2 overflow-x-hidden">
              <div className="space-y-3">
                {activeMasterPillar && (
                  <div className="space-y-3">
                    <div className="px-3 pt-1">
                      <span className="text-xs font-semibold text-foreground truncate block">
                        {activeMasterPillar.label}
                      </span>
                    </div>
                    {activeMasterPillar.groups.map((group) => (
                      <div key={group.id} className="space-y-1">
                        {activeMasterPillar.groups.length > 1 && (
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {group.label}
                            </span>
                          </div>
                        )}
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isItemActive =
                              item.path === "/workspace"
                                ? currentPath === "/workspace" || currentPath === "/workspace/"
                                : currentPath === item.path ||
                                  currentPath.startsWith(item.path + "/");

                            return (
                              <Link
                                key={item.path}
                                to={item.path as never}
                                className={cn(
                                  "flex items-center justify-between gap-2 px-3 min-h-11 py-2 rounded-xl text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  isItemActive
                                    ? "bg-sidebar-active text-foreground font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-rail-hover font-medium"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <StatefulNavIcon
                                    icon={ItemIcon}
                                    active={isItemActive}
                                    size={18}
                                    className={cn(
                                      "size-4.5 shrink-0",
                                      isItemActive ? "text-foreground" : "text-muted-foreground"
                                    )}
                                  />
                                  <span className="truncate">{item.label}</span>
                                </div>
                                {item.badge && (
                                  <span className="px-2 py-1 text-3xs font-mono font-semibold rounded-md bg-sidebar-active text-foreground shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Rodapé da Sidebar Secundária */}
            <div className="p-2 space-y-1 border-t border-sidebar-border shrink-0">
              <button
                type="button"
                onClick={() => setIsAllToolsOpen(true)}
                className="w-full flex items-center justify-between px-3 min-h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-rail-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3 truncate">
                  <SquaresFour weight="regular" size={18} className="size-4.5 shrink-0" />
                  <span className="truncate">Ferramentas</span>
                </div>
                <kbd className="text-3xs font-mono px-2 py-1 rounded bg-sidebar-active text-muted-foreground">
                  ⌘K
                </kbd>
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <Link
                  to="/termos"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 min-h-11 rounded-xl hover:bg-rail-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <HelpCircle className="size-3.5" />
                  <span>Ajuda</span>
                </Link>

                <button
                  type="button"
                  onClick={() => requestSwitchToPersonal("/")}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground px-3 min-h-11 rounded-xl hover:bg-rail-hover font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Ir para vitrine pública"
                >
                  <span>Vitrine</span>
                  <ArrowUpRight className="size-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── 2. ÁREA PRINCIPAL + COLUNA 3 (DOCK DE ATENDIMENTO & COPILOT) ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-14 bg-background border-b border-border/40 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile & Tablet Sheet Trigger */}
            <div className="waesy-compact-medium-only shrink-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11 min-w-11 min-h-11 rounded-xl border-border/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Sliders className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4">
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="pb-2 border-b border-border/40 shrink-0">
                      <WorkspaceAccountSwitcher
                        memberships={memberships}
                        activeStoreId={activeStoreId}
                        activeStore={activeStore}
                        userDisplayName={userDisplayName}
                        userEmail={session?.email}
                        userAvatarUrl={rawAvatarUrl}
                        isSwitching={isSwitching}
                        onSwitchStore={handleSwitchStore}
                        onSwitchToPersonal={confirmSwitchToPersonal}
                      />
                    </div>
                    <ScrollArea className="flex-1 pr-2">
                      <div
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <NavLinks isMobile={true} />
                      </div>
                    </ScrollArea>
                    <div className="pt-3 border-t border-border/40 shrink-0 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsAllToolsOpen(true);
                        }}
                        className="w-full min-h-11 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex items-center gap-2">
                          <LayoutGrid className="size-4 text-primary" />
                          <span>Todas as Ferramentas</span>
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">Ctrl+K</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          requestSwitchToPersonal("/conta");
                        }}
                        className="w-full min-h-11 px-3 py-2 rounded-xl bg-sidebar-active hover:bg-rail-hover text-foreground flex items-center gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="size-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {rawAvatarUrl && !railAvatarFailed ? (
                            <img
                              src={rawAvatarUrl}
                              alt={userDisplayName}
                              className="size-full object-cover"
                              onError={() => setRailAvatarFailed(true)}
                            />
                          ) : (
                            <span>{userInitial}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{userDisplayName}</p>
                          <p className="text-xs text-muted-foreground truncate">Conta Pessoal</p>
                        </div>
                        <ArrowUpRight className="size-3.5 text-muted-foreground shrink-0" />
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Quando a Coluna 2 está recolhida no Desktop, exibe o Account Switcher limpo no Header */}
            {!isSubSidebarOpen && (
              <div className="hidden waesy-expanded-flex items-center gap-2 min-w-0">
                <div className="w-56">
                  <WorkspaceAccountSwitcher
                    memberships={memberships}
                    activeStoreId={activeStoreId}
                    activeStore={activeStore}
                    userDisplayName={userDisplayName}
                    userEmail={session?.email}
                    userAvatarUrl={rawAvatarUrl}
                    isSwitching={isSwitching}
                    onSwitchStore={handleSwitchStore}
                    onSwitchToPersonal={confirmSwitchToPersonal}
                  />
                </div>
              </div>
            )}

            {/* Identificação rápida da loja (< 840px) */}
            <div className="waesy-compact-medium-only flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-foreground truncate max-w-36 sm:max-w-56">
                {activeStore?.name || "Workspace"}
              </span>
            </div>
          </div>

          {/* Ações do Header do Workspace */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão Contextual da Loja Pública */}
            {(() => {
              const storeData = activeStore?.store || activeStore;
              const storeSlug = storeData?.slug || storeData?.store_slug || activeStoreId;
              const contextualAction = getStoreContextualAction(storeData);
              const ActionIcon = contextualAction.icon;

              return (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 hidden waesy-expanded-flex text-muted-foreground hover:text-foreground hover:bg-rail-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link
                    to="/perfil-da-loja"
                    search={{ slug: storeSlug, aba: contextualAction.aba }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ActionIcon className="size-3.5 text-muted-foreground" />
                    <span>{contextualAction.label}</span>
                    <ExternalLink className="size-3 text-muted-foreground ml-1" />
                  </Link>
                </Button>
              );
            })()}

            {/* Ação Operacional Primária Contextual por Nicho */}
            {(() => {
              const storeData = activeStore?.store || activeStore;
              const opAction = getStoreHeaderOperationalAction(storeData);
              const OpIcon = opAction.icon;

              return (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 hidden waesy-expanded-flex text-muted-foreground hover:text-foreground hover:bg-rail-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link to={opAction.path as never}>
                    <OpIcon className="size-3.5 text-muted-foreground" />
                    <span>{opAction.label}</span>
                  </Link>
                </Button>
              );
            })()}

            {/* Menu do Operador (Canto Superior Direito com Foto Sincronizada - Regra B.27) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-3 h-11 min-h-11 rounded-xl bg-card hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-xs font-bold text-foreground max-w-44 truncate hidden waesy-expanded-flex">
                    {userDisplayName}
                  </span>
                  {rawAvatarUrl && !headerAvatarFailed ? (
                    <img
                      src={rawAvatarUrl}
                      alt={userDisplayName}
                      onError={() => setHeaderAvatarFailed(true)}
                      className="size-8 rounded-full object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <span className="size-8 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0">
                      {userInitial}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border border-border/60 bg-card">
                <DropdownMenuLabel className="font-normal px-2 py-2 flex items-center gap-3">
                  {rawAvatarUrl && !headerAvatarFailed ? (
                    <img
                      src={rawAvatarUrl}
                      alt={userDisplayName}
                      onError={() => setHeaderAvatarFailed(true)}
                      className="size-10 rounded-full object-cover shrink-0 bg-muted"
                    />
                  ) : (
                    <span className="size-10 rounded-full bg-foreground text-background text-sm font-bold flex items-center justify-center shrink-0">
                      {userInitial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{userDisplayName}</p>
                    <p className="text-2xs font-mono text-muted-foreground truncate">
                      {session?.email || session?.user?.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 rounded-md text-2xs font-bold bg-muted text-foreground truncate max-w-full">
                      {activeStore?.name || "Loja"}
                    </span>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-border/50" />

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs min-h-11">
                  <Link to="/workspace/configuracoes">
                    <Settings className="size-3.5 mr-2 text-muted-foreground" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs min-h-11">
                  <Link to="/workspace/lojas">
                    <Building2 className="size-3.5 mr-2 text-muted-foreground" />
                    <span>Trocar Loja</span>
                  </Link>
                </DropdownMenuItem>

                {isPlatformAdmin && (
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold text-primary min-h-11">
                    <Link to="/admin-master">
                      <ShieldCheck className="size-3.5 mr-2 text-primary" />
                      <span>Painel Admin Master</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-border/50" />

                <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
                  onClick={() => requestSwitchToPersonal("/conta")}
                  className="rounded-xl cursor-pointer text-xs font-semibold text-foreground flex items-center justify-between min-h-11"
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="size-3.5 text-muted-foreground" />
                    <span>Conta Pessoal</span>
                  </div>
                  <ArrowUpRight className="size-3 text-muted-foreground" />
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border/50" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-xl cursor-pointer text-xs text-destructive focus:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-11"
                >
                  <LogOut className="size-3.5 mr-2" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="workspace-main-content"
          className="main-container-query flex-1 w-full min-h-0 overflow-y-auto no-scrollbar flex flex-col bg-background"
        >
          <div
            className={cn(
              "w-full mx-auto flex-1 flex flex-col min-h-0",
              currentPath.startsWith("/workspace/estudio") || currentPath === "/workspace/atendimento/chat" || currentPath.startsWith("/workspace/atendimento/chat/") || currentPath.startsWith("/workspace/copilot") || currentPath.startsWith("/workspace/whatsapp") || currentPath.startsWith("/workspace/suporte")
                ? "max-w-none p-0 h-full overflow-hidden"
                : "max-w-none waesy-workspace-main-pad"
            )}
          >
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

        {/* ── BARRA DE NAVEGAÇÃO INFERIOR NATIVA DO WORKSPACE (< 840px) ── */}
        {(() => {
          const storeData = activeStore?.store || activeStore;
          const opAction = getStoreHeaderOperationalAction(storeData);
          const OpIcon = opAction.icon;
          const isOverview = currentPath === "/workspace" || currentPath === "/workspace/";
          const isOpActive = currentPath.startsWith(opAction.path);
          const isCatalogActive = currentPath.startsWith("/workspace/catalogo") || currentPath.startsWith("/workspace/agenda/servicos");
          const isFinanceActive = currentPath.startsWith("/workspace/financeiro");

          return (
            <nav
              aria-label="Navegação operacional móvel"
              className="waesy-compact-medium-only fixed inset-x-4 waesy-bottom-float-pos z-30 max-w-lg mx-auto waesy-bottom-nav-grid items-center p-2 bg-background border border-border rounded-lg select-none"
            >
              <Link
                to="/workspace"
                className={cn(
                  "h-11 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isOverview ? "text-foreground font-semibold bg-sidebar-active" : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <StatefulNavIcon icon={LayoutDashboard} active={isOverview} size={18} className="size-4 shrink-0" />
                <span className="truncate">Painel</span>
              </Link>

              <Link
                to={opAction.path as any}
                className={cn(
                  "h-11 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isOpActive ? "text-foreground font-semibold bg-sidebar-active" : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <StatefulNavIcon icon={OpIcon} active={isOpActive} size={18} className="size-4 shrink-0" />
                <span className="truncate">{opAction.label}</span>
              </Link>

              <Link
                to="/workspace/catalogo/produtos"
                className={cn(
                  "h-11 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isCatalogActive ? "text-foreground font-semibold bg-sidebar-active" : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <StatefulNavIcon icon={Package} active={isCatalogActive} size={18} className="size-4 shrink-0" />
                <span className="truncate">Catálogo</span>
              </Link>

              <Link
                to="/workspace/financeiro/caixa"
                className={cn(
                  "h-11 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 text-xs transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isFinanceActive ? "text-foreground font-semibold bg-sidebar-active" : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                <StatefulNavIcon icon={DollarSign} active={isFinanceActive} size={18} className="size-4 shrink-0" />
                <span className="truncate">Caixa</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="h-11 min-h-11 rounded-lg flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sliders className="size-4" />
                <span className="truncate">Menu</span>
              </button>
            </nav>
          );
        })()}

        {/* Coluna 3: Dock Flutuante de Atendimento Rápido & Copilot */}
        <WorkspaceQuickChatDock activeStoreId={activeStoreId} />
      </div>

  {/* ── 3. MODAL DE CONFIRMAÇÃO DE ALTERNÂNCIA DE CONTEXTO ── */}
 <Dialog open={showPersonalSwitchModal} onOpenChange={setShowPersonalSwitchModal}>
 <DialogContent className="sm:max-w-md p-0 overflow-hidden sm:rounded-2xl bg-background border border-border/40">
 <DialogHeader className="p-6 pb-4 bg-card border-b border-border/40">
 <div className="size-10 rounded-xl bg-muted text-foreground flex items-center justify-center mb-2">
 <ArrowRightLeft className="size-5" />
 </div>
 <DialogTitle className="text-lg font-black tracking-tight text-foreground">
 Alternar para conta pessoal?
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 O painel da loja ficará fechado.
 </DialogDescription>
 </DialogHeader>

 <div className="p-6 space-y-4 text-xs">
 <div className="rounded-2xl bg-card p-4 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground">Atual:</span>
 <span className="font-bold text-foreground">{activeStore?.name || "Loja"}</span>
 </div>
 <div className="h-px bg-border/40" />
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground">Destino:</span>
 <span className="font-bold text-foreground">{userDisplayName}</span>
 </div>
 </div>
 </div>

 <DialogFooter className="p-4 bg-card border-t border-border/40 flex flex-col sm:flex-row gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setShowPersonalSwitchModal(false)}
 className="w-full sm:w-auto h-11 min-h-11 rounded-lg text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={confirmSwitchToPersonal}
 className="w-full sm:w-auto h-11 min-h-11 rounded-lg text-xs font-bold gap-2"
 >
 <Check className="size-3.5" />
 <span>Alternar</span>
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
