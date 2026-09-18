import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 TrendingUp,
 TrendingDown,
 Package,
 ShoppingBag,
 Truck,
 Users,
 AlertTriangle,
 ArrowUpRight,
 Store,
 Megaphone,
 Calendar,
 Layers,
 ChevronRight,
 DollarSign,
 Ticket,
 Clock,
 CheckCircle2,
 Plane,
 FileSpreadsheet,
 FileText,
 Bus,
 Scale,
 Wrench,
 Building2,
 Briefcase,
 GraduationCap,
 Dog,
 CarFront,
 Flame,
 ChefHat,
 UtensilsCrossed,
 CreditCard,
 QrCode,
 Loader2,
 BarChart3,
} from "lucide-react";
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

export const Route = createFileRoute("/workspace/")({
 head: () => ({ meta: [{ title: "Painel de Controle & Visão Geral | Workspace Waesy" }] }),
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

 const dashboardMetrics = await getDashboardData().catch(() => ({
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
 abandonedCartsCount: 0,
 recentActivities: [],
 activeCashRegister: null,
 setupChecklist: [],
 setupProgressPercentage: 100,
 } as DashboardMetrics));

 return {
 session,
 activeStore,
 memberships,
 dashboardMetrics,
 };
   } catch (err) {
     console.error("[loader:workspace.index] Unhandled loader error:", err);
     return { session: null, activeStore: null, memberships: null, dashboardMetrics: null };
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
 { label: "Grupos & Excursões (ANTT)", path: "/workspace/turismo/grupos", icon: Bus },
 { label: "Frota & Editor 2D", path: "/workspace/turismo/frota", icon: Bus },
 { label: "Central de Cotações", path: "/workspace/turismo/cotacoes", icon: Plane },
 { label: "Lâminas & Propostas (Studio)", path: "/workspace/turismo/propostas", icon: FileSpreadsheet },
 { label: "Contratos & Assinatura Digital", path: "/workspace/turismo/contratos", icon: FileText },
 ];
 case "gastronomy":
 return [
 { label: "KDS • Cozinha & Preparo", path: "/workspace/pdv/cozinha", icon: ChefHat },
 { label: "Reservas & Mapa do Salão", path: "/workspace/reservas", icon: UtensilsCrossed },
 { label: "Salão & Comandas", path: "/workspace/pdv/comandas", icon: UtensilsCrossed },
 { label: "Frente de Caixa (PDV)", path: "/workspace/pdv", icon: CreditCard },
 { label: "Relatórios Gastronomia", path: "/workspace/relatorios/gastronomia", icon: BarChart3 },
 { label: "Gestor de Delivery", path: "/workspace/pedidos/gestor", icon: Store },
 ];
 case "services":
 return [
 { label: "Grade de Agendamentos", path: "/workspace/agenda", icon: Calendar },
 { label: "Catálogo de Serviços", path: "/workspace/agenda/servicos", icon: Layers },
 { label: "Pacotes & Passes", path: "/workspace/pacotes", icon: Ticket },
 { label: "Promoções & Cupons", path: "/workspace/marketing/promocoes", icon: Flame },
 ];
 case "legal":
 return [
 { label: "Processos & Prazos", path: "/workspace/advocacia", icon: Scale },
 { label: "Audiências & Reuniões", path: "/workspace/agenda", icon: Calendar },
 { label: "Honorários & Propostas", path: "/workspace/orcamentos", icon: FileText },
 ];
 case "real_estate":
 return [
 { label: "Catálogo de Imóveis", path: "/workspace/catalogo/produtos", icon: Building2 },
 { label: "Vistorias & Chamados", path: "/workspace/imoveis/manutencoes", icon: Wrench },
 { label: "Propostas & Contratos", path: "/workspace/orcamentos", icon: FileText },
 ];
 case "jobs":
 return [
 { label: "Vagas & Candidaturas", path: "/workspace/empregos/candidatos", icon: Briefcase },
 { label: "Banco de Talentos", path: "/workspace/clientes", icon: Users },
 { label: "Página de Carreiras", path: "/workspace/marketing/vitrine", icon: Megaphone },
 ];
 case "education":
 return [
 { label: "Grade de Aulas & Workshops", path: "/workspace/agenda", icon: Calendar },
 { label: "Catálogo de Cursos", path: "/workspace/agenda/servicos", icon: GraduationCap },
 { label: "Alunos & Matrículas", path: "/workspace/clientes", icon: Users },
 ];
 case "events":
 return [
 { label: "Meus Eventos & Lotes", path: "/workspace/eventos", icon: Ticket },
 { label: "Flyers & Divulgação", path: "/workspace/marketing/banners", icon: Megaphone },
 { label: "Balanço de Ingressos", path: "/workspace/financeiro/pagamentos", icon: DollarSign },
 ];
 case "vehicles":
 return [
 { label: "Estoque de Veículos", path: "/workspace/catalogo/produtos", icon: CarFront },
 { label: "Propostas & Financiamento", path: "/workspace/orcamentos", icon: FileText },
 { label: "Leads & Interessados", path: "/workspace/clientes", icon: Users },
 ];
 case "pet":
 return [
 { label: "Grade de Banho, Tosa e Consultas", path: "/workspace/agenda", icon: Calendar },
 { label: "Procedimentos & Vacinas", path: "/workspace/agenda/servicos", icon: Layers },
 { label: "Rações & Farmácia", path: "/workspace/catalogo/produtos", icon: Package },
 ];
 case "retail":
 default:
 return [
 { label: "Banners da Loja", path: "/workspace/marketing/banners", icon: Megaphone },
 { label: "Promoções & Cupons", path: "/workspace/marketing/promocoes", icon: Flame },
 { label: "Catálogo & Estoque", path: "/workspace/catalogo/produtos", icon: Package },
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
 <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
 {/* ── 1. Top Header com Identificação do Negócio ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/60">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold text-muted-foreground">
 {activeStore?.name || "Meu Espaço"}
 </span>
 <Badge variant="outline" className="text-[10px] bg-muted/40 font-semibold">
 {semantics.name}
 </Badge>
 </div>
 <h1 className="text-xl font-bold tracking-tight text-foreground">
 Visão Geral
 </h1>
 </div>

 {/* Quick Top Actions Contextuais */}
 <div className="flex flex-wrap items-center gap-2">
 {/* Chave de Operação Instantânea "Loja Aberta / Pausada" */}
 <button
 type="button"
 onClick={handleToggleStoreStatus}
 disabled={isTogglingStatus}
 className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
 isOpenNow
 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
 : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
 }`}
 title="Clique para alternar o status operacional da loja"
 >
 {isTogglingStatus ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <span className={`size-2 rounded-full ${isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
 )}
 <span>{isOpenNow ? "Loja Aberta" : "Loja Pausada"}</span>
 </button>

 {/* Botão de Divulgação & QR Code */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsShareModalOpen(true)}
 className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80"
 >
 <QrCode className="size-3.5 text-primary" />
 <span>Divulgar & QR Code</span>
 </Button>

 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
 <Link to="/workspace/lojas">
 Trocar Loja
 </Link>
 </Button>

 {activeStore?.slug && (
 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold gap-1.5 border-border/80">
 <Link to="/diretorio/$id" params={{ id: activeStore.slug }}>
 <Store className="size-3.5 text-primary" />
 <span>Vitrine Pública</span>
 </Link>
 </Button>
 )}

 <Button asChild size="sm" variant="ghost" className="rounded-xl text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10">
 <Link to="/workspace/marketing/vitrine">
 <Layers className="size-3.5" />
 <span>Personalizar Vitrine</span>
 </Link>
 </Button>

 {semantics.primaryQuickAction ? (
 <Button asChild size="sm" className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
 <Link to={semantics.primaryQuickAction.path as any}>
 {semantics.primaryQuickAction.label}
 </Link>
 </Button>
 ) : (
 <Button asChild size="sm" className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
 <Link to="/workspace/pdv">
 Frente de Caixa
 </Link>
 </Button>
 )}
 </div>
 </div>

 {/* ── 2. Destaque de Faturamento Mensal Real ── */}
 <div className="p-6 rounded-2xl bg-foreground text-background flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="space-y-1">
 <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
 Faturamento do Mês
 </span>
 <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
 {formatMoney(dashboardMetrics?.salesMonthCents || 0)}
 </div>
 <div className="flex items-center gap-2 pt-1 text-xs opacity-90">
 {dashboardMetrics?.growthPercentage != null && (
 <span className={`inline-flex items-center gap-1 font-semibold ${
 dashboardMetrics.growthPercentage >= 0 ? "text-emerald-400" : "text-rose-400"
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
 </div>

 <div className="flex items-center gap-2.5">
 <Link
 to="/workspace/financeiro/caixa"
 className="px-4 py-2 rounded-xl bg-background text-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
 >
 Fluxo de Caixa
 </Link>
 <Link
 to={catalogDetails.path as any}
 className="px-4 py-2 rounded-xl bg-background/10 hover:bg-background/20 text-background text-xs font-semibold border border-background/20 transition-colors"
 >
 {semantics.catalogTitle}
 </Link>
 </div>
 </div>

 {/* ── 3. Grid Tático de 4 Métricas Reais ── */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
 <Link
 to={getOrdersDestination() as any}
 className="p-4 rounded-2xl bg-card hover:border-primary/50 transition-all group flex flex-col justify-between"
 >
 <div className="flex items-center justify-between">
 <div className="size-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
 <ShoppingBag className="size-5" />
 </div>
 <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 </div>
 <div className="mt-3">
 <p className="text-xs font-bold text-muted-foreground">{semantics.ordersLabel}</p>
 <p className="text-sm font-black text-foreground mt-0.5">
 {dashboardMetrics?.ordersTodayCount || 0} registro(s) hoje
 </p>
 </div>
 </Link>

 <Link
 to="/workspace/clientes"
 className="p-4 rounded-2xl bg-card hover:border-primary/50 transition-all group flex flex-col justify-between"
 >
 <div className="flex items-center justify-between">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Users className="size-5" />
 </div>
 <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 </div>
 <div className="mt-3">
 <p className="text-xs font-bold text-muted-foreground">{semantics.customerLabel}</p>
 <p className="text-sm font-black text-foreground mt-0.5">
 {dashboardMetrics?.newCustomers30d ?? 0} novos no mês
 </p>
 </div>
 </Link>

 <Link
 to="/workspace/financeiro/caixa"
 className="p-4 rounded-2xl bg-card hover:border-primary/50 transition-all group flex flex-col justify-between"
 >
 <div className="flex items-center justify-between">
 <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <DollarSign className="size-5" />
 </div>
 <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 </div>
 <div className="mt-3">
 <p className="text-xs font-bold text-muted-foreground">Faturamento Hoje</p>
 <p className="text-sm font-black text-foreground mt-0.5 font-mono">
 {formatMoney(dashboardMetrics?.salesTodayCents || 0)}
 </p>
 </div>
 </Link>

 <Link
 to={catalogDetails.path as any}
 className="p-4 rounded-2xl bg-card hover:border-primary/50 transition-all group flex flex-col justify-between"
 >
 <div className="flex items-center justify-between">
 <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
 <Package className="size-5" />
 </div>
 <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 </div>
 <div className="mt-3">
 <p className="text-xs font-bold text-muted-foreground">{semantics.stockLabel || semantics.catalogTitle}</p>
 <p className="text-sm font-black text-foreground mt-0.5">
 {catalogDetails.subtitle}
 </p>
 </div>
 </Link>
 </div>

 {/* ── 3.5. Calendário Editorial & Vendas Sazonais (Inteligência de Varejo) ── */}
 <SeasonalMarketingCalendarWidget
 cityName={activeStore?.city}
 stateCode={activeStore?.state}
 sector={semantics.nicheId}
 />

 {/* ── 4. Matriz Bilateral: Atividades Reais & Vitrine / Canais Contextuais ── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Atividades Recentes do Banco de Dados */}
 <Card className="lg:col-span-2 p-5 border-border bg-card rounded-2xl space-y-4">
 <div className="flex items-center justify-between pb-3">
 <div className="flex items-center gap-2">
 <Clock className="size-4 text-primary" />
 <h3 className="font-bold text-sm text-foreground">Atividades Recentes</h3>
 </div>
 <Link to={getOrdersDestination() as any} className="text-xs text-primary font-bold hover:underline">
 Ver todos os registros
 </Link>
 </div>

 {recentActivities.length === 0 ? (
 <div className="py-8 text-center space-y-1 rounded-2xl bg-muted/20">
 <Clock className="size-6 text-muted-foreground/40 mx-auto mb-1" />
 <p className="text-xs font-semibold text-muted-foreground">Nenhuma atividade recente</p>
 </div>
 ) : (
 <div className="space-y-2.5">
 {recentActivities.map((act: any) => (
 <div
 key={act.id}
 className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 text-xs hover:border-primary/40 transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
 <CheckCircle2 className="size-4" />
 </div>
 <div>
 <p className="font-bold text-foreground">{act.title}</p>
 <p className="text-muted-foreground text-[11px]">{act.subtitle}</p>
 </div>
 </div>
 <div className="text-right">
 <span className="text-[11px] font-mono text-muted-foreground block">{act.timeDisplay}</span>
 {act.totalCents != null && (
 <span className="text-xs font-bold font-mono text-foreground">{formatMoney(act.totalCents)}</span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>

 {/* Vitrine & Ferramentas Contextuais da Empresa */}
 <Card className="p-5 border-border bg-card rounded-2xl space-y-4">
 <div className="flex items-center justify-between pb-3">
 <div className="flex items-center gap-2">
 <Megaphone className="size-4 text-primary" />
 <h3 className="font-bold text-sm text-foreground">Canais & Ferramentas</h3>
 </div>
 <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
 </div>

 <div className="space-y-2 pt-2">
 {channelLinks.map((link, idx) => {
 const Icon = link.icon;
 return (
 <Link
 key={idx}
 to={link.path as any}
 className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 text-xs font-medium transition-colors group"
 >
 <div className="flex items-center gap-2">
 <Icon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>{link.label}</span>
 </div>
 <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
 </Link>
 );
 })}
 </div>
 </Card>
 </div>

 {/* ── 5. Departamentos Corporativos Universais (Visão 360° da Empresa) ── */}
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <span>Departamentos Corporativos</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Acesso direto aos 6 setores operacionais integrados da sua empresa.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
 {/* 1. Vitrine & Marketing */}
 <Link
 to="/workspace/marketing/banners"
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
 <Megaphone className="size-4" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Marketing</p>
 <p className="text-[10px] text-muted-foreground">Banners & Vitrine</p>
 </div>
 </Link>

 {/* 2. Vendas & CRM */}
 <Link
 to={semantics.nicheId === "tourism" ? "/workspace/comercial" : "/workspace/pedidos"}
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-info/10 text-info flex items-center justify-center mb-3">
 <ShoppingBag className="size-4" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
 {semantics.nicheId === "tourism" ? "Comercial" : "Vendas"}
 </p>
 <p className="text-[10px] text-muted-foreground">
 {semantics.nicheId === "tourism" ? "Funil & CRM" : "Pedidos & PDV"}
 </p>
 </div>
 </Link>

 {/* 3. Financeiro & Caixa */}
 <Link
 to="/workspace/financeiro/caixa"
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
 <DollarSign className="size-4" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Financeiro</p>
 <p className="text-[10px] text-muted-foreground">Caixa & Turnos</p>
 </div>
 </Link>

 {/* 4. RH & Pessoas */}
 <Link
 to="/workspace/configuracoes/equipe"
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
 <Users className="size-4" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">RH & Equipe</p>
 <p className="text-[10px] text-muted-foreground">Cargos & Folha</p>
 </div>
 </Link>

 {/* 5. Logística & Estoque */}
 <Link
 to={semantics.nicheId === "tourism" ? "/workspace/turismo/embarques" : "/workspace/estoque"}
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
 {semantics.nicheId === "tourism" ? <Bus className="size-4" /> : <Package className="size-4" />}
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
 {semantics.nicheId === "tourism" ? "Operações" : "Logística"}
 </p>
 <p className="text-[10px] text-muted-foreground">
 {semantics.nicheId === "tourism" ? "Embarques & Frota" : "Estoque & Insumos"}
 </p>
 </div>
 </Link>

 {/* 6. Governança & Config */}
 <Link
 to="/workspace/configuracoes"
 className="p-3.5 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all text-left group flex flex-col justify-between"
 >
 <div className="size-8 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center mb-3">
 <Store className="size-4" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">Governança</p>
 <p className="text-[10px] text-muted-foreground">Loja & Checkout</p>
 </div>
 </Link>
 </div>
 </div>

 {/* ── 5. Diretrizes Operacionais de Alta Eficiência (Específicas por Nicho) ── */}
 {semantics.operationalTips && semantics.operationalTips.length > 0 && (
 <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">
 Boas Práticas Operacionais • {semantics.name}
 </span>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {semantics.operationalTips.map((tip, idx) => (
 <div
 key={idx}
 className="p-3.5 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5"
 >
 <span className="size-5 rounded-lg bg-primary/10 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
 {idx + 1}
 </span>
 <p className="flex-1">{tip}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Modal Canônico de Divulgação da Loja & QR Code */}
 <StoreShareQrModal
 open={isShareModalOpen}
 onOpenChange={setIsShareModalOpen}
 store={activeStore}
 />
 </div>
 );
}

