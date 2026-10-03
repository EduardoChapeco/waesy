import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Package, ShoppingBag, Truck, Users, AlertTriangle, ArrowUpRight, Store, Megaphone, Calendar, Layers, ChevronRight, DollarSign, Ticket, Clock, CheckCircle2, Plane, FileSpreadsheet, FileText, Bus, Scale, Wrench, Building2, Briefcase, GraduationCap, Dog, CarFront, Flame, ChefHat, BookOpenCheck, Activity, UtensilsCrossed, CreditCard, QrCode, Loader2, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserSession } from "@/services/auth.functions";
import { getDashboardData, type DashboardMetrics } from "@/services/dashboard.functions";
import { toggleStoreOpenStatus } from "@/services/store.functions";
import { StoreShareQrModal } from "@/components/workspace/store-share-qr-modal";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { formatMoney } from "@/lib/money";
import { SeasonalMarketingCalendarWidget } from "@/components/admin/marketing/seasonal-marketing-calendar-widget";
import { PolymorphicDashboardRenderer } from "@/components/workspace/dashboard/PolymorphicDashboardRenderer";
import { getWorkspaceDashboardKpisFn } from "@/services/workspace-dashboard.functions";

export const Route = createFileRoute("/workspace/")({
  head: () => ({ meta: [{ title: "Operação | Workspace Waesy" }] }),
  loader: async () => {
    try {
      let session: any = null;
      try {
        session = await getUserSession();
      } catch {
        session = null;
      }

      const memberships = session?.memberships || [];
      const activeStoreId = session?.store_id || memberships[0]?.store_id || null;
      const activeStore = memberships.find((m: any) => m.store_id === activeStoreId) || memberships[0] || null;

      const [dashboardMetrics, workspaceKpis] = await Promise.all([
        getDashboardData().catch(() => ({
          salesTodayCents: 0,
          salesMonthCents: 0,
          salesLastMonthCents: 0,
          growthPercentage: null,
          ordersTodayCount: 0,
          ordersMonthCount: 0,
          ordersBreakdown: {
            awaitingPayment: 0,
            needsSeparation: 0,
            shippedOrReady: 0,
            completed: 0,
            cancelled: 0,
            pendingBackorders: 0,
          },
          lowStockItems: [],
          criticalStockCount: 0,
          newCustomers30d: 0,
          newLeads30d: 0,
          abandonedCartsCount: 0,
          recentActivities: [],
          activeCashRegister: null,
          setupChecklist: [],
          setupProgressPercentage: 100,
        } as DashboardMetrics)),
        getWorkspaceDashboardKpisFn({ data: { period: "30d" } }).catch(() => null),
      ]);

      return {
        session,
        activeStore,
        memberships,
        dashboardMetrics,
        workspaceKpis,
      };
    } catch (err) {
      console.error("[loader:workspace.index] Unhandled loader error:", err);
      return { session: null, activeStore: null, memberships: null, dashboardMetrics: null, workspaceKpis: null };
    }
  },
  component: WorkspaceDashboardPage,
});

export default function WorkspaceDashboardPage() {
  const { activeStore, dashboardMetrics } = ((Route.useLoaderData?.() as any) || {});
  const semantics = getNicheSemantics(activeStore);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(() => {
    const pauseUntil = activeStore?.settings?.emergency_pause_until;
    if (!pauseUntil) return true;
    return new Date(pauseUntil).getTime() <= Date.now();
  });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const handleToggleStoreStatus = async () => {
    if (isTogglingStatus) return;
    const nextState = !isOpenNow;
    setIsTogglingStatus(true);
    try {
      await toggleStoreOpenStatus({
        data: {
          isOpen: nextState,
          pauseMinutes: nextState ? undefined : 60,
        },
      });
      setIsOpenNow(nextState);
      toast.success(
        nextState
          ? "Loja reaberta! Recebimento de pedidos ativo."
          : "Loja pausada por 60 min! Novos pedidos bloqueados temporariamente."
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status operacional da loja.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const criticalStockCount = dashboardMetrics?.criticalStockCount || 0;
  const recentActivities = dashboardMetrics?.recentActivities || [];

  // Mapeia os atalhos de canais e vitrine de forma estritamente contextual por nicho
  const getContextualChannelLinks = () => {
    switch (semantics.nicheId) {
      case "tourism":
        return [
          { label: "Excursões", path: "/workspace/turismo/grupos", icon: Bus },
          { label: "Frota", path: "/workspace/turismo/frota", icon: Bus },
          { label: "Cotações", path: "/workspace/turismo/cotacoes", icon: Plane },
          { label: "Propostas", path: "/workspace/turismo/propostas", icon: FileSpreadsheet },
          { label: "Contratos", path: "/workspace/turismo/contratos", icon: FileText },
        ];
      case "gastronomy":
        return [
          { label: "Cozinha", path: "/workspace/pdv/cozinha", icon: ChefHat },
          { label: "Reservas", path: "/workspace/reservas", icon: UtensilsCrossed },
          { label: "Comandas", path: "/workspace/pdv/comandas", icon: UtensilsCrossed },
          { label: "Caixa", path: "/workspace/pdv", icon: CreditCard },
          { label: "Relatórios", path: "/workspace/relatorios/gastronomia", icon: BarChart3 },
          { label: "Delivery", path: "/workspace/pedidos/gestor", icon: Store },
        ];
      case "services":
        return [
          { label: "Agenda", path: "/workspace/agenda", icon: Calendar },
          { label: "Serviços", path: "/workspace/agenda/servicos", icon: Layers },
          { label: "Pacotes", path: "/workspace/pacotes", icon: Ticket },
          { label: "Promoções", path: "/workspace/marketing/promocoes", icon: Flame },
        ];
      case "legal":
        return [
          { label: "Processos", path: "/workspace/advocacia", icon: Scale },
          { label: "Audiências", path: "/workspace/agenda", icon: Calendar },
          { label: "Honorários", path: "/workspace/orcamentos", icon: FileText },
        ];
      case "real_estate":
        return [
          { label: "Imóveis", path: "/workspace/catalogo/produtos", icon: Building2 },
          { label: "Vistorias", path: "/workspace/imoveis/manutencoes", icon: Wrench },
          { label: "Propostas", path: "/workspace/orcamentos", icon: FileText },
        ];
      case "jobs":
        return [
          { label: "Candidaturas", path: "/workspace/empregos/candidatos", icon: Briefcase },
          { label: "Talentos", path: "/workspace/clientes", icon: Users },
          { label: "Carreiras", path: "/workspace/marketing/vitrine", icon: Megaphone },
        ];
      case "education":
        return [
          { label: "Aulas", path: "/workspace/agenda", icon: Calendar },
          { label: "Cursos", path: "/workspace/agenda/servicos", icon: GraduationCap },
          { label: "Alunos", path: "/workspace/clientes", icon: Users },
        ];
      case "events":
        return [
          { label: "Eventos", path: "/workspace/eventos", icon: Ticket },
          { label: "Divulgação", path: "/workspace/marketing/banners", icon: Megaphone },
          { label: "Ingressos", path: "/workspace/financeiro/pagamentos", icon: DollarSign },
        ];
      case "vehicles":
        return [
          { label: "Veículos", path: "/workspace/catalogo/produtos", icon: CarFront },
          { label: "Propostas", path: "/workspace/orcamentos", icon: FileText },
          { label: "Leads", path: "/workspace/clientes", icon: Users },
        ];
      case "pet":
        return [
          { label: "Agenda", path: "/workspace/agenda", icon: Calendar },
          { label: "Procedimentos", path: "/workspace/agenda/servicos", icon: Layers },
          { label: "Produtos", path: "/workspace/catalogo/produtos", icon: Package },
        ];
      case "retail":
      default:
        return [
          { label: "Banners", path: "/workspace/marketing/banners", icon: Megaphone },
          { label: "Promoções", path: "/workspace/marketing/promocoes", icon: Flame },
          { label: "Catálogo", path: "/workspace/catalogo/produtos", icon: Package },
        ];
    }
  };

  const channelLinks = getContextualChannelLinks();

  const getOrdersDestination = () => {
    if (semantics.nicheId === "gastronomy") return "/workspace/pedidos/gestor";
    if (semantics.nicheId === "tourism") return "/workspace/turismo/cotacoes";
    if (semantics.nicheId === "legal") return "/workspace/advocacia";
    if (semantics.nicheId === "jobs") return "/workspace/empregos/candidatos";
    return "/workspace/pedidos";
  };

  const getCatalogCardDetails = () => {
    if (semantics.nicheId === "gastronomy") {
      return {
        path: "/workspace/catalogo/produtos",
        subtitle: "Cardápio Ativo",
      };
    }
    if (semantics.nicheId === "tourism") {
      return {
        path: "/workspace/turismo/propostas",
        subtitle: "Disponibilidade Ativa",
      };
    }
    if (semantics.nicheId === "services") {
      return {
        path: "/workspace/agenda/servicos",
        subtitle: "Grade Disponível",
      };
    }
    if (semantics.nicheId === "legal") {
      return {
        path: "/workspace/advocacia",
        subtitle: "Prazos em Dia",
      };
    }
    if (semantics.nicheId === "jobs") {
      return {
        path: "/workspace/empregos/candidatos",
        subtitle: "Vagas Publicadas",
      };
    }
    return {
      path: "/workspace/catalogo/produtos",
      subtitle: criticalStockCount === 0 ? "Estoque Regular" : `${criticalStockCount} item(ns) com baixo estoque`,
    };
  };

  const catalogDetails = getCatalogCardDetails();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-4 md:px-0 space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* ── 1. Top Header com Identificação do Negócio ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-4 p-4 sm:p-5 rounded-lg bg-card border border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground/80">
              {activeStore?.name || "Meu Espaço"}
            </span>
            <Badge variant="outline" className="text-xs py-0 px-2 bg-muted/40 font-semibold border-border/40">
              {semantics.name}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Visão Geral
          </h1>
        </div>

        {/* Quick Top Actions Contextuais */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar">
          {/* Chave de Operação Instantânea "Loja Aberta / Pausada" */}
          <button
            type="button"
            onClick={handleToggleStoreStatus}
            disabled={isTogglingStatus}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer min-h-11 sm:min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isOpenNow
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
            }`}
            title="Status Operacional"
          >
            {isTogglingStatus ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <span className={`size-2 rounded-full ${isOpenNow ? "bg-emerald-500" : "bg-rose-500"}`} />
            )}
            <span>{isOpenNow ? "Loja Aberta" : "Loja Pausada"}</span>
          </button>

          {/* Botão de Divulgação & QR Code */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            className="rounded-lg text-xs font-semibold gap-2 cursor-pointer border-border/40 hover:bg-muted/50 min-h-11 sm:min-h-9"
          >
            <QrCode className="size-3.5 text-primary" />
            <span>Divulgar</span>
          </Button>

          <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-semibold border-border/40 hover:bg-muted/50 min-h-11 sm:min-h-9">
            <Link to="/workspace/lojas">
              Trocar Loja
            </Link>
          </Button>

          {activeStore?.slug && (
            <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-semibold gap-2 border-border/40 hover:bg-muted/50 min-h-11 sm:min-h-9">
              <Link to="/diretorio/$id" params={{ id: activeStore.slug }}>
                <Store className="size-3.5 text-primary" />
                <span>Vitrine Pública</span>
              </Link>
            </Button>
          )}

          <Button asChild size="sm" variant="ghost" className="rounded-lg text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-11 sm:min-h-9">
            <Link to="/workspace/marketing/vitrine">
              <Layers className="size-3.5" />
              <span>Vitrine</span>
            </Link>
          </Button>

          {/* Ação Primária Única da Tela */}
          {semantics.primaryQuickAction ? (
            <Button asChild size="sm" className="rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-none min-h-11 sm:min-h-9 px-4">
              <Link to={semantics.primaryQuickAction.path as any}>
                {semantics.primaryQuickAction.label}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-none min-h-11 sm:min-h-9 px-4">
              <Link to="/workspace/pdv">
                PDV
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Bento Grid Operacional de Alta Performance (12 Colunas) ── */}
      <div className="grid grid-cols-12 gap-4 sm:gap-4 lg:gap-5 items-stretch">
        {/* Herói de Faturamento do Mês (7/8 cols no Desktop, 12 cols no Mobile) */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 p-5 sm:p-6 rounded-lg bg-card border border-border/40 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/75">
                Faturamento do Mês
              </span>
              {dashboardMetrics?.growthPercentage != null && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  dashboardMetrics.growthPercentage >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}>
                  {dashboardMetrics.growthPercentage >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {dashboardMetrics.growthPercentage >= 0 ? `+${dashboardMetrics.growthPercentage}%` : `${dashboardMetrics.growthPercentage}%`} vs mês anterior
                </span>
              )}
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono tracking-tight text-foreground">
              {formatMoney(dashboardMetrics?.salesMonthCents || 0)}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border/30">
            <Link
              to="/workspace/financeiro/caixa"
              className="inline-flex items-center justify-center min-h-11 sm:min-h-9 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-xs font-semibold transition-colors"
            >
              Fluxo de Caixa
            </Link>
            <Link
              to={catalogDetails.path as any}
              className="inline-flex items-center justify-center min-h-11 sm:min-h-9 px-4 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold transition-colors"
            >
              {semantics.catalogTitle}
            </Link>
          </div>
        </div>

        {/* 4 Métricas Táticas Integradas (5/4 cols no Desktop, 12 cols no Mobile) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 h-full">
          {/* Card 1: Pedidos */}
          <Link
            to={getOrdersDestination() as any}
            className="p-4 rounded-lg bg-card border border-border/40 hover:border-border/80 transition-colors flex flex-col justify-between min-h-24 group"
          >
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag className="size-4" />
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground/75 truncate">{semantics.ordersLabel}</p>
              <p className="text-sm font-bold tracking-tight text-foreground mt-1 font-mono">
                {dashboardMetrics?.ordersTodayCount || 0} hoje
              </p>
            </div>
          </Link>

          {/* Card 2: Clientes */}
          <Link
            to="/workspace/clientes"
            className="p-4 rounded-lg bg-card border border-border/40 hover:border-border/80 transition-colors flex flex-col justify-between min-h-24 group"
          >
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="size-4" />
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground/75 truncate">{semantics.customerLabel}</p>
              <p className="text-sm font-bold tracking-tight text-foreground mt-1 font-mono">
                +{dashboardMetrics?.newCustomers30d ?? 0} no mês
              </p>
            </div>
          </Link>

          {/* Card 3: Vendas Hoje */}
          <Link
            to="/workspace/financeiro/caixa"
            className="p-4 rounded-lg bg-card border border-border/40 hover:border-border/80 transition-colors flex flex-col justify-between min-h-24 group"
          >
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="size-4" />
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground/75 truncate">Vendas Hoje</p>
              <p className="text-sm font-bold tracking-tight text-foreground mt-1 font-mono truncate">
                {formatMoney(dashboardMetrics?.salesTodayCents || 0)}
              </p>
            </div>
          </Link>

          {/* Card 4: Catálogo / Estoque */}
          <Link
            to={catalogDetails.path as any}
            className="p-4 rounded-lg bg-card border border-border/40 hover:border-border/80 transition-colors flex flex-col justify-between min-h-24 group"
          >
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Package className="size-4" />
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground/75 truncate">{semantics.stockLabel || semantics.catalogTitle}</p>
              <p className="text-sm font-bold tracking-tight text-foreground mt-1 truncate">
                {catalogDetails.subtitle}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. Calendário Sazonal & Inteligência Comercial ── */}
      <SeasonalMarketingCalendarWidget
        cityName={activeStore?.city}
        stateCode={activeStore?.state}
        sector={semantics.nicheId}
      />

      {/* ── 4. Matriz Bilateral: Atividades Reais & Vitrine / Canais Contextuais ── */}
      <div className="grid grid-cols-12 gap-4 sm:gap-4 lg:gap-5 items-stretch">
        {/* Atividades Recentes do Banco de Dados (8 cols no Desktop, 12 cols no Mobile) */}
        <Card className="col-span-12 lg:col-span-8 p-5 border border-border/40 bg-card rounded-lg flex flex-col justify-between h-full space-y-4 shadow-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Atividades</h3>
              </div>
              <Link to={getOrdersDestination() as any} className="text-xs text-primary font-semibold hover:underline">
                Ver todos os registros
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-8 text-center space-y-1 rounded-lg bg-muted/20">
                <Clock className="size-6 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs font-semibold text-muted-foreground/75">Nenhuma atividade recente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 text-xs hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{act.title}</p>
                        <p className="text-muted-foreground/75 text-xs">{act.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-muted-foreground/75 block">{act.timeDisplay}</span>
                      {act.totalCents != null && (
                        <span className="text-xs font-bold font-mono text-foreground">{formatMoney(act.totalCents)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Vitrine & Ferramentas Contextuais da Empresa (4 cols no Desktop, 12 cols no Mobile) */}
        <Card className="col-span-12 lg:col-span-4 p-5 border border-border/40 bg-card rounded-lg flex flex-col justify-between h-full space-y-4 shadow-none">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Canais</h3>
              </div>
              <Badge variant="secondary" className="text-xs">Ativo</Badge>
            </div>

            <div className="space-y-2 pt-1">
              {channelLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={idx}
                    to={link.path as any}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 text-xs font-medium transition-colors group min-h-11 sm:min-h-9"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="size-4 text-muted-foreground/80 group-hover:text-foreground transition-colors" />
                      <span className="text-foreground">{link.label}</span>
                    </div>
                    <ArrowUpRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ── 5. Departamentos Corporativos Universais (Visão 360° da Empresa) ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/40 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span>Departamentos</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3 pt-1">
          {/* 1. Vitrine & Marketing */}
          <Link
            to="/workspace/marketing/banners"
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Megaphone className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">Marketing</p>
              <p className="text-xs text-muted-foreground/75">Vitrine</p>
            </div>
          </Link>

          {/* 2. Vendas & CRM */}
          <Link
            to={semantics.nicheId === "tourism" ? "/workspace/comercial" : "/workspace/pedidos"}
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-info/10 text-info flex items-center justify-center mb-3">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                {semantics.nicheId === "tourism" ? "Comercial" : "Vendas"}
              </p>
              <p className="text-xs text-muted-foreground/75">
                {semantics.nicheId === "tourism" ? "Funil & CRM" : "Pedidos & PDV"}
              </p>
            </div>
          </Link>

          {/* 3. Financeiro & Caixa */}
          <Link
            to="/workspace/financeiro/caixa"
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <DollarSign className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">Financeiro</p>
              <p className="text-xs text-muted-foreground/75">Caixa</p>
            </div>
          </Link>

          {/* 4. RH & Pessoas */}
          <Link
            to="/workspace/configuracoes/equipe"
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Users className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">Equipe</p>
              <p className="text-xs text-muted-foreground/75">Folha</p>
            </div>
          </Link>

          {/* 5. Logística & Estoque */}
          <Link
            to={semantics.nicheId === "tourism" ? "/workspace/turismo/embarques" : "/workspace/estoque"}
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
              {semantics.nicheId === "tourism" ? <Bus className="size-4" /> : <Package className="size-4" />}
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                {semantics.nicheId === "tourism" ? "Operações" : "Logística"}
              </p>
              <p className="text-xs text-muted-foreground/75">
                {semantics.nicheId === "tourism" ? "Embarques" : "Estoque"}
              </p>
            </div>
          </Link>

          {/* 6. Governança & Config */}
          <Link
            to="/workspace/configuracoes"
            className="p-4 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left group flex flex-col justify-between min-h-24"
          >
            <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-3">
              <Store className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">Governança</p>
              <p className="text-xs text-muted-foreground/75">Geral</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Modal Canônico de Divulgação da Loja & QR Code */}
      <StoreShareQrModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        store={activeStore}
      />
    </div>
  );
}
