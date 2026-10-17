/**
 * PolymorphicDashboardRenderer.tsx — Motor de Metamorfose Estrutural do Dashboard
 * 
 * Substitui a "Miopia Estrutural" por layouts hiper-especializados por vertical sem mocks:
 * 1. Agendamento & Clínicas (Services / Barbearias / Clínicas / Saúde)
 * 2. Alto Valor & Imobiliária (Real Estate / Veículos)
 * 3. Comércio & Gastronomia (Retail / Gastro / Alimentação)
 * 4. Turismo & Viagens (Agências de Viagens / Operadoras / Roteiros)
 * 5. Eventos & Festivais (Produtoras / Bilheteria / Subpainéis PDV)
 */

import React from "react";
import { Link } from "@tanstack/react-router";
import { 
  Calendar, Clock, Users, CheckCircle2, AlertTriangle, ArrowUpRight, 
  TrendingUp, TrendingDown, DollarSign, FileText, Building2, ShoppingBag, 
  ChefHat, Package, Flame, QrCode, Phone, MessageSquare, ChevronRight,
  Boxes, UserCheck, Stethoscope, Car, Plane, Ticket, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/services/dashboard.functions";
import type { NicheSemantics } from "@/lib/niche-semantics";

export interface PolymorphicDashboardProps {
  nicheId: string;
  semantics: NicheSemantics;
  metrics: DashboardMetrics;
  store: any;
  isOpenNow: boolean;
  onToggleStoreStatus: () => void;
  isTogglingStatus: boolean;
  onOpenShareModal: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LAYOUT DE AGENDAMENTO: CLÍNICAS, SALÕES & BARBEARIAS (Services / Health)
// ─────────────────────────────────────────────────────────────────────────────
function AppointmentServicesDashboard({
  semantics,
  metrics,
  store,
  isOpenNow,
  onToggleStoreStatus,
  isTogglingStatus,
  onOpenShareModal,
}: PolymorphicDashboardProps) {
  const occupancyRate = metrics?.nicheMetrics?.occupancyRatePercentage ?? 0;
  const todayCount = metrics?.nicheMetrics?.todayAppointmentsCount ?? (metrics?.ordersTodayCount || 0);
  const noShows = metrics?.nicheMetrics?.noShowsTodayCount ?? 0;
  const recentActivities = metrics?.recentActivities || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Topo: Timeline e Status do Dia ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calendar className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Timeline de Atendimentos</h2>
              <p className="text-xs text-muted-foreground">Grade de especialistas e agendamentos</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold gap-2 border-border/80">
            <Link to="/workspace/agenda">
              <span>Abrir Agenda Completa</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </Link>
          </Button>
        </div>

        {todayCount === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border/60 text-muted-foreground text-xs">
            Nenhum atendimento agendado para o dia de hoje.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            <div className="p-3 rounded-lg border text-xs bg-card border-border/60 text-foreground space-y-1">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span>Confirmados</span>
                <span className="size-1.5 rounded-full bg-primary" />
              </div>
              <div className="font-bold text-xs">{todayCount} cliente(s)</div>
              <div className="text-xs text-muted-foreground">No dia</div>
            </div>
          </div>
        )}
      </div>

      {/* ── KPIs Estruturais de Agenda (Bento Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Taxa de Ocupação</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {occupancyRate > 0 ? `${occupancyRate}%` : "--"}
          </div>
          <div className="text-xs text-muted-foreground">Grade do dia</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Atendimentos Hoje</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {todayCount}
          </div>
          <div className="text-xs text-muted-foreground">Confirmados</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faltas (No-Shows)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {noShows}
          </div>
          <div className="text-xs text-muted-foreground">Ausências registradas</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faturamento Mês</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.salesMonthCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {metrics?.growthPercentage ? `+${metrics.growthPercentage}% vs mês ant.` : "Em dia"}
          </div>
        </div>
      </div>

      {/* ── Seção Inferior: Atividades Recentes ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Atividades Recentes
          </h3>
          <Link to="/workspace/agenda/recursos" className="text-xs font-semibold text-primary hover:underline">
            Ver Equipe & Escalas
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma atividade recente registrada.</p>
        ) : (
          <div className="divide-y divide-border/40 border-y border-border/40 -mx-4 sm:mx-0 sm:border-0 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
            {recentActivities.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="px-4 py-3 sm:p-3 sm:rounded-lg sm:border sm:border-border/60 bg-card flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-xs text-foreground truncate block">{item.title || item.action}</span>
                  <span className="text-xs text-muted-foreground truncate block">{item.description || item.entity_type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LAYOUT DE ALTO VALOR: IMOBILIÁRIAS & CONCESSIONÁRIAS (Real Estate / Autos)
// ─────────────────────────────────────────────────────────────────────────────
function HighValueLeadsDashboard({
  semantics,
  metrics,
  store,
  isOpenNow,
  onToggleStoreStatus,
  isTogglingStatus,
  onOpenShareModal,
}: PolymorphicDashboardProps) {
  const vgvCents = metrics?.nicheMetrics?.vgvActiveCents ?? (metrics?.salesMonthCents || 0);
  const activeProposals = metrics?.nicheMetrics?.activeProposalsCount ?? (metrics?.ordersTodayCount || 0);
  const stagnantCount = metrics?.nicheMetrics?.stagnantPropertiesCount ?? 0;
  const isVehicle = semantics.nicheId === "automotive" || semantics.nicheId === "vehicles";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Banner: VGV da Carteira & Ação ── */}
      <div className="p-4 sm:p-6 rounded-lg bg-foreground text-background flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
            {isVehicle ? "Valor Geral do Estoque de Veículos" : "Valor Geral de Vendas (VGV da Carteira)"}
          </span>
          <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
            {formatMoney(vgvCents)}
          </div>
          <div className="text-xs opacity-90 flex items-center gap-2 pt-1">
            {isVehicle ? <Car className="size-3.5" /> : <Building2 className="size-3.5" />}
            <span>{isVehicle ? "Veículos em exposição ativa" : "Imóveis e unidades sob gestão"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-10 px-4 rounded-lg text-xs font-bold bg-background text-foreground hover:bg-muted cursor-pointer shadow-xs">
            <Link to="/workspace/orcamentos/novo">
              <span>Nova Proposta Comercial</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-10 px-4 rounded-lg text-xs font-bold border-background/30 text-background hover:bg-background/10">
            <Link to="/workspace/catalogo/produtos/novo">
              <span>{isVehicle ? "Cadastrar Veículo" : "Cadastrar Imóvel"}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── KPIs Estruturais de Alto Valor ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Propostas em Análise</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {activeProposals}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            Em fase de negociação
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Leads Recebidos (30d)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.newLeads30d || 0}
          </div>
          <div className="text-xs text-muted-foreground">Interessados no catálogo</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Unidades sem Visita</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {stagnantCount}
          </div>
          <div className="text-xs text-muted-foreground">Necessitam impulsionamento</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Contratos Fechados (Mês)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.ordersMonthCount || 0}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>Fechamentos</span>
          </div>
        </div>
      </div>

      {/* ── Atalhos de Gestão de Negociações ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pipeline de Propostas Comerciais
          </h3>
          <p className="text-xs text-foreground mt-1">Acompanhe minutas, vistorias e contratos em andamento</p>
        </div>
        <Button asChild size="sm" variant="outline" className="h-9 px-4 text-xs font-semibold">
          <Link to="/workspace/orcamentos">
            <span>Ver Todas as Negociações</span>
            <ArrowUpRight className="size-3.5 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LAYOUT DE TURISMO & VIAGENS (Agências, Cotações & Comissões)
// ─────────────────────────────────────────────────────────────────────────────
function TourismAgencyDashboard({
  semantics,
  metrics,
  store,
}: PolymorphicDashboardProps) {
  const salesMonth = metrics?.salesMonthCents || 0;
  const salesToday = metrics?.salesTodayCents || 0;
  const bookingsCount = metrics?.ordersMonthCount || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 rounded-lg bg-card border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Plane className="size-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agência de Viagens & Turismo
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(salesMonth)}
          </div>
          <p className="text-xs text-muted-foreground">Faturamento de pacotes e cotações no mês</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-10 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground">
            <Link to="/workspace/turismo/cotacoes">
              <span>Kanban de Cotações</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-10 px-4 rounded-lg text-xs font-bold border-border/80">
            <Link to="/workspace/turismo/comissoes">
              <span>Planilha de Comissões</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Vendas Hoje</span>
          <div className="text-2xl font-bold font-mono text-foreground">{formatMoney(salesToday)}</div>
          <span className="text-xs text-muted-foreground">Emissões e fechamentos</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Reservas no Mês</span>
          <div className="text-2xl font-bold font-mono text-foreground">{bookingsCount}</div>
          <span className="text-xs text-muted-foreground">Contratos processados</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Cotações Hoje</span>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics?.ordersTodayCount || 0}</div>
          <span className="text-xs text-muted-foreground">Novos orçamentos</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Passageiros (30d)</span>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics?.newCustomers30d || 0}</div>
          <span className="text-xs text-muted-foreground">Novos viajantes</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LAYOUT DE EVENTOS & FESTIVAIS (Produtora, Ingressos & Subpainéis)
// ─────────────────────────────────────────────────────────────────────────────
function EventsMasterDashboard({
  semantics,
  metrics,
  store,
}: PolymorphicDashboardProps) {
  const salesMonth = metrics?.salesMonthCents || 0;
  const salesToday = metrics?.salesTodayCents || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 rounded-lg bg-card border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Ticket className="size-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cockpit da Produtora de Eventos
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(salesMonth)}
          </div>
          <p className="text-xs text-muted-foreground">Bilheteria e concessões consolidadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-10 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground">
            <Link to="/workspace/eventos">
              <span>Gestão de Eventos</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Vendas Hoje</span>
          <div className="text-2xl font-bold font-mono text-foreground">{formatMoney(salesToday)}</div>
          <span className="text-xs text-muted-foreground">Bilheteria e PDV</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Ingressos no Mês</span>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics?.ordersMonthCount || 0}</div>
          <span className="text-xs text-muted-foreground">Assinados WCTS-1</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Participantes</span>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics?.newCustomers30d || 0}</div>
          <span className="text-xs text-muted-foreground">Cadastros únicos</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Subpainéis</span>
          <div className="text-2xl font-bold font-mono text-foreground">{metrics?.ordersBreakdown?.completed || 0}</div>
          <span className="text-xs text-muted-foreground">Pontos de venda</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LAYOUT DE PRODUTO & OPERAÇÃO: RESTAURANTES & VAREJO (Gastro / Retail)
// ─────────────────────────────────────────────────────────────────────────────
function CommerceGastroDashboard({
  semantics,
  metrics,
  store,
  isOpenNow,
  onToggleStoreStatus,
  isTogglingStatus,
  onOpenShareModal,
}: PolymorphicDashboardProps) {
  const isGastro = semantics.nicheId === "gastronomy";
  const criticalStock = metrics?.criticalStockCount || 0;
  const awaitingOrders = metrics?.ordersBreakdown?.needsSeparation || 0;
  const averageTicket = metrics?.salesTodayCents && metrics?.ordersTodayCount
    ? Math.round(metrics.salesTodayCents / metrics.ordersTodayCount)
    : (metrics?.salesMonthCents && metrics?.ordersMonthCount ? Math.round(metrics.salesMonthCents / metrics.ordersMonthCount) : 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Topo: Pedidos em Andamento & KDS Live ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              {isGastro ? <ChefHat className="size-4" /> : <ShoppingBag className="size-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isGastro ? "Gestor de Cozinha (KDS Live)" : "Separação & Expedição de Pedidos"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isGastro ? "Fila de comandas em preparação" : "Despacho e entregas do dia"}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="h-8 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground">
            <Link to={isGastro ? "/workspace/pedidos/gestor" : "/workspace/pedidos"}>
              <span>{isGastro ? "Abrir Tela KDS" : "Ver Fila de Envios"}</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* Resumo de Pedidos em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider block">Aguardando</span>
            <span className="text-xl font-bold font-mono mt-1 block">{awaitingOrders}</span>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
            <span className="text-xs font-bold uppercase tracking-wider block">Em Rota</span>
            <span className="text-xl font-bold font-mono mt-1 block">{metrics?.ordersBreakdown?.shippedOrReady || 0}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider block">Finalizados</span>
            <span className="text-xl font-bold font-mono mt-1 block">{metrics?.ordersBreakdown?.completed || 0}</span>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border/60 text-foreground">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Ticket Médio</span>
            <span className="text-xl font-bold font-mono mt-1 block">{formatMoney(averageTicket)}</span>
          </div>
        </div>
      </div>

      {/* ── KPIs Estruturais de Varejo / Comércio ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Vendas Hoje</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.salesTodayCents || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics?.ordersTodayCount || 0} pedido(s) faturados
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faturamento Mês</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.salesMonthCents || 0)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            {metrics?.growthPercentage ? `+${metrics.growthPercentage}% vs mês ant.` : "Em dia"}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Estoque Crítico</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {criticalStock}
          </div>
          <div className="text-xs text-muted-foreground">
            {criticalStock > 0 ? "Itens abaixo do mínimo" : "Estoque regularizado"}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Caixa Aberto</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.activeCashRegister?.isOpen ? "Ativo" : "Fechado"}
          </div>
          <div className="text-xs text-muted-foreground">
            {metrics?.activeCashRegister?.currentBalanceCents
              ? formatMoney(metrics.activeCashRegister.currentBalanceCents)
              : "Sem turno aberto"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RENDERIZADOR POLIMÓRFICO PRINCIPAL (SWITCH COMPONENT)
// ─────────────────────────────────────────────────────────────────────────────
export function PolymorphicDashboardRenderer(props: PolymorphicDashboardProps) {
  const { nicheId } = props;

  // 1. Turismo & Viagens
  if (nicheId === "tourism" || nicheId === "turismo" || nicheId === "travel") {
    return <TourismAgencyDashboard {...props} />;
  }

  // 2. Eventos & Festivais
  if (nicheId === "events" || nicheId === "eventos") {
    return <EventsMasterDashboard {...props} />;
  }

  // 3. Agendamento & Clínicas
  if (
    nicheId === "services" || 
    nicheId === "clinica" || 
    nicheId === "barbearia" || 
    nicheId === "salao" || 
    nicheId === "estetica" ||
    nicheId === "health"
  ) {
    return <AppointmentServicesDashboard {...props} />;
  }

  // 4. Alto Valor & Imobiliárias
  if (
    nicheId === "real_estate" || 
    nicheId === "vehicles" || 
    nicheId === "automotive" ||
    nicheId === "imoveis" || 
    nicheId === "concessionaria"
  ) {
    return <HighValueLeadsDashboard {...props} />;
  }

  // 5. Comércio & Gastronomia (Padrão de Produto)
  return <CommerceGastroDashboard {...props} />;
}
