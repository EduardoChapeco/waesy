/**
 * PolymorphicDashboardRenderer.tsx — Motor de Metamorfose Estrutural do Dashboard (V137)
 * 
 * Substitui a "Miopia Estrutural" por layouts hiper-especializados por vertical:
 * 1. Agendamento & Clínicas (Services / Barbearias / Clínicas): Timeline Apple Calendar, Ocupação, No-Shows e Especialistas.
 * 2. Alto Valor & Imobiliária (Real Estate / Veículos): VGV da Carteira, Funil Kanban de Negociações, Imóveis Estagnados.
 * 3. Comércio & Gastronomia (Retail / Gastro / Dark Kitchen): KDS Live, Separação/Expedição, Ticket Médio e Estoque Crítico.
 */

import React from "react";
import { Link } from "@tanstack/react-router";
import { 
  Calendar, Clock, Users, CheckCircle2, AlertTriangle, ArrowUpRight, 
  TrendingUp, TrendingDown, DollarSign, FileText, Building2, ShoppingBag, 
  ChefHat, Package, Flame, QrCode, Phone, MessageSquare, ChevronRight,
  Boxes, Sparkles, UserCheck, Stethoscope, Car
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
  // Horas canônicas do dia útil (Timeline estilo Apple Calendar)
  const timelineHours = [
    { hour: "08:00", status: "past", client: "Consulta Concluída", specialist: "Dr. André", service: "Avaliação Geral" },
    { hour: "09:30", status: "past", client: "Marcos Silveira", specialist: "Dra. Camila", service: "Retorno Clínico" },
    { hour: "11:00", status: "current", client: "Ana Beatriz Rocha", specialist: "Dr. André", service: "Procedimento Especial" },
    { hour: "14:00", status: "upcoming", client: "Lucas Fontes", specialist: "Dra. Camila", service: "Atendimento Inicial" },
    { hour: "15:30", status: "upcoming", client: "Patrícia Lima", specialist: "Dr. André", service: "Sessão Terapêutica" },
    { hour: "17:00", status: "free", client: "Horário Disponível", specialist: "Livre", service: "Encaixe Aberto" },
  ];

  const occupancyRate = metrics?.nicheMetrics?.occupancyRatePercentage ?? 84;
  const todayCount = metrics?.nicheMetrics?.todayAppointmentsCount ?? Math.max(6, metrics?.ordersTodayCount || 0);
  const noShows = metrics?.nicheMetrics?.noShowsTodayCount ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Topo: Timeline Horizontal Apple Calendar ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calendar className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Timeline de Atendimentos de Hoje</h2>
              <p className="text-[11px] text-muted-foreground">Grade dinâmica em tempo real para especialistas</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold gap-2 border-border/80">
            <Link to="/workspace/agenda">
              <span>Abrir Agenda Completa</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground" />
            </Link>
          </Button>
        </div>

        {/* Trilho de Horários com Scroll Suave */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {timelineHours.map((slot, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-lg border text-xs transition-all select-none space-y-1",
                slot.status === "current"
                  ? "bg-primary/10 border-primary text-primary shadow-2xs font-semibold"
                  : slot.status === "past"
                  ? "bg-muted/40 border-border/40 text-muted-foreground opacity-70"
                  : slot.status === "free"
                  ? "bg-emerald-500/5 border-dashed border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-card border-border/60 text-foreground"
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span>{slot.hour}</span>
                {slot.status === "current" && (
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                )}
                {slot.status === "free" && (
                  <span className="text-[9px] font-bold uppercase tracking-wider">Vago</span>
                )}
              </div>
              <div className="font-bold text-xs truncate" title={slot.client}>
                {slot.client}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {slot.service} • {slot.specialist}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs Estruturais de Agenda (Bento Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Taxa de Ocupação da Grade */}
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Taxa de Ocupação</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {occupancyRate}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="size-3" />
            <span>Grade quase cheia</span>
          </div>
        </div>

        {/* Atendimentos Hoje */}
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Atendimentos Hoje</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {todayCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Confirmados na recepção
          </div>
        </div>

        {/* No-Shows / Faltas */}
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faltas (No-Shows)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {noShows}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Zero ausências registradas
          </div>
        </div>

        {/* Faturamento de Procedimentos */}
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faturamento Mês</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.salesMonthCents || 0)}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {metrics?.growthPercentage ? `+${metrics.growthPercentage}% vs mês ant.` : "Em dia"}
          </div>
        </div>
      </div>

      {/* ── Seção Inferior Bifurcada: Lista Mobile vs Tabela Desktop ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Próximos Pacientes / Clientes
          </h3>
          <Link to="/workspace/agenda/recursos" className="text-xs font-semibold text-primary hover:underline">
            Ver Equipe & Escalas
          </Link>
        </div>

        {/* WhatsApp List Style Edge-to-Edge no Mobile */}
        <div className="divide-y divide-border/40 border-y border-border/40 -mx-4 sm:mx-0 sm:border-0 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
          {[
            { name: "Ana Beatriz Rocha", time: "11:00", phone: "(49) 99812-4433", service: "Procedimento Especial", priceCents: 18000 },
            { name: "Lucas Fontes", time: "14:00", phone: "(49) 99104-5522", service: "Atendimento Inicial", priceCents: 12000 },
            { name: "Patrícia Lima", time: "15:30", phone: "(49) 98831-2299", service: "Sessão Terapêutica", priceCents: 22000 },
          ].map((item, i) => (
            <div key={i} className="px-4 py-3 sm:p-3 sm:rounded-lg sm:border sm:border-border/60 bg-card flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground truncate">{item.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 px-2 h-4 font-mono font-bold">
                    {item.time}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {item.service} • {formatMoney(item.priceCents)}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-lg text-xs gap-2 shrink-0 border-border/80">
                <a href={`https://wa.me/55${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Phone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </Button>
            </div>
          ))}
        </div>
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
  const vgvCents = metrics?.nicheMetrics?.vgvActiveCents ?? 1485000000;
  const activeProposals = metrics?.nicheMetrics?.activeProposalsCount ?? Math.max(4, metrics?.ordersTodayCount || 0);
  const stagnantCount = metrics?.nicheMetrics?.stagnantPropertiesCount ?? 2;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Banner de Alto Impacto: VGV da Carteira & Funil ── */}
      <div className="p-4 sm:p-6 rounded-lg bg-foreground text-background flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
            Valor Geral de Vendas (VGV da Carteira)
          </span>
          <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
            {formatMoney(vgvCents)}
          </div>
          <div className="text-xs opacity-90 flex items-center gap-2 pt-1">
            <Building2 className="size-3.5" />
            <span>Imóveis e unidades ativas sob gestão</span>
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
              <span>Cadastrar Imóvel</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Funil Kanban de Propostas & Vistorias (Bento Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Propostas em Análise</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {activeProposals}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            Em fase de diligência
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Vistorias Agendadas</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            7
          </div>
          <div className="text-[11px] text-muted-foreground">
            Para os próximos 5 dias
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Unidades Estagnadas</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {stagnantCount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Mais de 60 dias sem visita
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Contratos Assinados (Mês)</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.ordersMonthCount || 3}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>Escrituras em dia</span>
          </div>
        </div>
      </div>

      {/* ── Painel de Propostas Recentes (Kanban Simplificado) ── */}
      <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Propostas de Compra & Locação Recentes
          </h3>
          <Link to="/workspace/orcamentos" className="text-xs font-semibold text-primary hover:underline">
            Ver Todas as Negociações
          </Link>
        </div>

        <div className="divide-y divide-border/40 border-y border-border/40 -mx-4 sm:mx-0 sm:border-0 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
          {[
            { title: "Apto 3 Quartos - Jardins", lead: "Roberto Vasconcelos", valueCents: 125000000, status: "Minuta Enviada", badge: "Venda" },
            { title: "Casa Condomínio Fechado", lead: "Dra. Helena Martins", valueCents: 240000000, status: "Análise de Crédito", badge: "Venda" },
            { title: "Sala Comercial Centro", lead: "Inova Softwares Ltda", valueCents: 450000, status: "Vistoria Realizada", badge: "Locação" },
          ].map((item, idx) => (
            <div key={idx} className="px-4 py-3 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 bg-card flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground truncate">{item.title}</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-2 h-4 font-bold border-border/80">
                    {item.badge}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {item.lead} • {formatMoney(item.valueCents)}
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LAYOUT DE PRODUTO & OPERAÇÃO: RESTAURANTES & VAREJO (Gastro / Retail)
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
  const awaitingOrders = metrics?.ordersBreakdown?.needsSeparation ?? 3;
  const averageTicket = metrics?.salesTodayCents && metrics?.ordersTodayCount
    ? Math.round(metrics.salesTodayCents / metrics.ordersTodayCount)
    : 4850;

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
              <p className="text-[11px] text-muted-foreground">
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
            <span className="text-[10px] font-bold uppercase tracking-wider block">Aguardando Cozinha</span>
            <span className="text-xl font-bold font-mono mt-1 block">{awaitingOrders}</span>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Em Preparo / Rota</span>
            <span className="text-xl font-bold font-mono mt-1 block">{metrics?.ordersBreakdown?.shippedOrReady || 2}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Finalizados Hoje</span>
            <span className="text-xl font-bold font-mono mt-1 block">{metrics?.ordersBreakdown?.completed || 14}</span>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border/60 text-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Ticket Médio</span>
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
          <div className="text-[11px] text-muted-foreground">
            {metrics?.ordersTodayCount || 0} pedido(s) faturados
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Faturamento Mês</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.salesMonthCents || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {metrics?.growthPercentage ? `+${metrics.growthPercentage}% vs mês ant.` : "Em dia"}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Estoque Crítico</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {criticalStock}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {criticalStock > 0 ? "Itens abaixo do mínimo" : "Estoque regularizado"}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border/60 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Caixa Aberto</span>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.activeCashRegister?.isOpen ? "Ativo" : "Fechado"}
          </div>
          <div className="text-[11px] text-muted-foreground">
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
// 4. RENDERIZADOR POLIMÓRFICO PRINCIPAL (SWITCH COMPONENT - V137)
// ─────────────────────────────────────────────────────────────────────────────
export function PolymorphicDashboardRenderer(props: PolymorphicDashboardProps) {
  const { nicheId } = props;

  // 1. Agendamento & Clínicas
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

  // 2. Alto Valor & Imobiliárias
  if (
    nicheId === "real_estate" || 
    nicheId === "vehicles" || 
    nicheId === "imoveis" || 
    nicheId === "concessionaria"
  ) {
    return <HighValueLeadsDashboard {...props} />;
  }

  // 3. Comércio & Gastronomia (Padrão de Produto)
  return <CommerceGastroDashboard {...props} />;
}
