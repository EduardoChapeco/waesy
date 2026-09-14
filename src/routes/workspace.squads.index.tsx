import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Bot,
  Briefcase,
  Play,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Award,
  BookOpen,
  FileCheck,
  RefreshCw,
  Sliders,
  ExternalLink,
  X,
  AlertCircle,
} from "lucide-react";
import {
  listStoreSquadsFn,
  triggerSquadRunFn,
  approveSquadRunFn,
  SquadWithDetails,
} from "@/services/squads-runtime.functions";
import { getStoreSettings } from "@/services/store.functions";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workspace/squads/")({
  head: () => ({ meta: [{ title: "Squads Agênticos Especializados | Waesy" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    const storeId = store?.id || "";
    let initialSquads: SquadWithDetails[] = [];
    if (storeId) {
      try {
        initialSquads = await listStoreSquadsFn({ data: { storeId } });
      } catch (e) {
        console.error("Erro ao carregar squads no SSR loader:", e);
      }
    }
    return { store, initialSquads };
    } catch (err) {
      console.error("[loader:workspace.squads.index] Unhandled loader error:", err);
      return { store: null, initialSquads: null };
    }
  },
  component: SquadsWorkspacePage,
});

export function SquadsWorkspacePage() {
  const { store, initialSquads } = (Route.useLoaderData() as any) || {};
  const storeId = store?.id || "";

  const [loading, setLoading] = useState(false);
  const [squads, setSquads] = useState<SquadWithDetails[]>(initialSquads || []);
  const [selectedAgent, setSelectedAgent] = useState<SquadWithDetails["agents"][0] | null>(null);
  const [selectedRunArtifacts, setSelectedRunArtifacts] = useState<{ squadName: string; run: any } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // ── ATUALIZAR SQUADS VIA BFF ─────────────────────────────────────────────
  async function loadData() {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await listStoreSquadsFn({ data: { storeId } });
      setSquads(data);
    } catch (err) {
      console.error("Erro ao atualizar squads:", err);
      setFeedback({
        type: "error",
        message: "Não foi possível carregar os squads no banco de dados.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── DISPARAR CORRIDA DO SQUAD ───────────────────────────────────────────
  async function handleTriggerRun(squadId: string) {
    setActionLoading(`trigger-${squadId}`);
    try {
      await triggerSquadRunFn({
        data: {
          storeId,
          squadId,
          options: {
            triggerSource: "manual",
            inputPayload: { goal: "Execução manual supervisionada de rotina do squad" },
          },
        },
      });
      setFeedback({
        type: "success",
        message: "Nova rotina iniciada! Entregáveis gerados e aguardando sua revisão executiva.",
      });
      await loadData();
    } catch (err) {
      console.error("Erro ao disparar squad:", err);
      setFeedback({
        type: "error",
        message: "Falha ao disparar a rotina do squad.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  // ── APROVAR CORRIDA (HUMAN-IN-THE-LOOP) ──────────────────────────────────
  async function handleApproveRun(runId: string) {
    setActionLoading(`approve-${runId}`);
    try {
      await approveSquadRunFn({ data: { storeId, runId } });
      setFeedback({
        type: "success",
        message: "Entrega aprovada com sucesso! As diretrizes foram consolidadas no sistema.",
      });
      await loadData();
    } catch (err) {
      console.error("Erro ao aprovar entrega:", err);
      setFeedback({
        type: "error",
        message: "Falha ao aprovar entrega do squad.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  const totalAgents = useMemo(() => squads.reduce((acc, s) => acc + (s.agents?.length || 0), 0), [squads]);
  const pendingApprovals = useMemo(() => squads.filter((s) => s.latest_run?.status === "needs_approval").length, [squads]);
  const completedRuns = useMemo(() => squads.filter((s) => s.latest_run?.status === "approved" || s.latest_run?.status === "completed").length, [squads]);

  const filteredSquads = useMemo(() => {
    return squads.filter((squad) => {
      if (activeTab !== "all") {
        const dep = (squad.template.department || "").toLowerCase();
        const badge = (squad.template.badge_label || "").toLowerCase();
        if (activeTab === "marketing" && !dep.includes("market") && !badge.includes("market") && !dep.includes("growth")) return false;
        if (activeTab === "commercial" && !dep.includes("comercial") && !badge.includes("comercial") && !dep.includes("vendas")) return false;
        if (activeTab === "operations" && !dep.includes("opera") && !badge.includes("opera") && !dep.includes("turismo")) return false;
        if (activeTab === "bi" && !dep.includes("estrat") && !badge.includes("intelig") && !dep.includes("bi")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSquad = squad.custom_name.toLowerCase().includes(q) || squad.template.description.toLowerCase().includes(q);
        const matchAgent = squad.agents.some((a) => a.name.toLowerCase().includes(q) || a.role_label.toLowerCase().includes(q));
        if (!matchSquad && !matchAgent) return false;
      }
      return true;
    });
  }, [squads, activeTab, searchQuery]);

  const dashboardMetrics: MetricCardItem[] = useMemo(() => [
    {
      title: "Departamentos Agênticos",
      value: squads.length,
      description: "Escritórios virtuais ativos",
      icon: Briefcase,
      color: "blue",
    },
    {
      title: "Especialistas Alocados",
      value: totalAgents,
      description: "Agentes autônomos supervisionados",
      icon: Users,
      color: "purple",
    },
    {
      title: "Aprovações Pendentes",
      value: pendingApprovals,
      description: "Entregáveis aguardando revisão humana",
      icon: Clock,
      color: "amber",
    },
    {
      title: "Rotinas Concluídas",
      value: completedRuns,
      description: "Execuções aprovadas e publicadas",
      icon: CheckCircle2,
      color: "emerald",
    },
  ], [squads.length, totalAgents, pendingApprovals, completedRuns]);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── TOOLBAR CANÔNICA (SILENCIOSA & ALTA DENSIDADE) ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: "Todos os Squads", icon: Briefcase, count: squads.length },
          { id: "marketing", label: "Marketing", icon: Award },
          { id: "commercial", label: "Comercial", icon: ShieldCheck },
          { id: "operations", label: "Operações", icon: Sliders },
          { id: "bi", label: "Estratégia & BI", icon: Bot },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por squad, especialidade ou nome do agente..."
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={totalAgents > 0 ? `${totalAgents} Especialistas` : undefined}
        primaryAction={{
          label: "Atualizar Squads",
          icon: RefreshCw,
          onClick: () => loadData(),
        }}
      />

      <WorkspaceDashboardSheet
        title="Telemetria dos Squads Agênticos"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={dashboardMetrics}
      />

      {/* ── ALERTA DE FEEDBACK ── */}
      {feedback && (
        <div className="p-4 rounded-xl flex items-center justify-between border bg-card/60 text-foreground border-border/80">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="text-xs h-7"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* ── GRADE DOS ESCRITÓRIOS VIRTUAIS ── */}
      <div>
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Conectando aos escritórios virtuais dos squads...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {squads.map((squad) => {
              const hasPendingApproval = squad.latest_run?.status === "needs_approval";

              return (
                <div
                  key={squad.id}
                  className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6"
                >
                  {/* Topo do Card do Squad */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 text-[11px]">
                            {squad.template.badge_label}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            Cadência {squad.cadence}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground mt-2">
                          {squad.custom_name}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {squad.template.description}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Operacional
                      </span>
                    </div>

                    {/* Meta Operacional */}
                    {squad.operational_goal && (
                      <div className="mt-4 p-3 rounded-xl bg-muted/20 border border-border/30 text-xs text-foreground">
                        <strong className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">
                          Objetivo Atual do Squad:
                        </strong>
                        {squad.operational_goal}
                      </div>
                    )}

                    {/* Lista dos Especialistas do Squad */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Membros do Time ({squad.agents.length} Especialistas)
                        </h3>
                        <span className="text-[11px] text-muted-foreground">Clique para ver currículo</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {squad.agents.map((agent) => (
                          <div
                            key={agent.agent_id}
                            onClick={() => setSelectedAgent(agent)}
                            className="p-3 rounded-xl bg-muted/10 border border-border/40 hover:bg-muted/30 hover:border-border transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <div className="truncate pr-2">
                              <span className="text-xs font-semibold text-foreground block truncate group-hover:text-primary transition-colors">
                                {agent.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {agent.role_label}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card: Status de Execução & Human-in-the-Loop */}
                  <div className="pt-5 border-t border-border/30 space-y-4">
                    {/* Alerta de Aprovação Pendente */}
                    {hasPendingApproval && squad.latest_run && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              Entrega Aguardando Sua Aprovação
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              Diagnóstico concluído ({squad.latest_run.output_artifacts?.pending_approval_items?.length || 1} item pendente).
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedRunArtifacts({ squadName: squad.custom_name, run: squad.latest_run })}
                            className="h-11 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-medium border border-amber-500/30 bg-background hover:bg-muted/40 transition-colors shrink-0 min-h-[44px]"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                            Inspecionar Parecer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApproveRun(squad.latest_run!.id)}
                            disabled={actionLoading === `approve-${squad.latest_run.id}`}
                            className="h-11 px-4 inline-flex items-center gap-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs shrink-0 min-h-[44px]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {actionLoading === `approve-${squad.latest_run.id}`
                              ? "Aprovando..."
                              : "Aprovar em 1 Clique"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {squad.latest_run?.completed_at
                              ? `Última entrega: ${new Date(squad.latest_run.completed_at).toLocaleDateString("pt-BR")}`
                              : "Nenhuma entrega pendente"}
                          </span>
                        </div>
                        {squad.latest_run?.output_artifacts?.executive_summary && (
                          <button
                            type="button"
                            onClick={() => setSelectedRunArtifacts({ squadName: squad.custom_name, run: squad.latest_run })}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Ver Parecer Completo
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerRun(squad.id)}
                        disabled={actionLoading === `trigger-${squad.id}`}
                        className="h-11 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity min-h-[44px]"
                      >
                        <Play
                          className={`w-3.5 h-3.5 ${
                            actionLoading === `trigger-${squad.id}` ? "animate-spin" : ""
                          }`}
                        />
                        {actionLoading === `trigger-${squad.id}`
                          ? "Executando..."
                          : "Executar Rotina Agora"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SHEET CANÔNICA DO CURRÍCULO DO ESPECIALISTA (APPLE HIG) ── */}
      <Sheet open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] bg-card p-6 overflow-y-auto flex flex-col justify-between space-y-6">
          {selectedAgent && (
            <div>
              <SheetHeader className="border-b border-border/40 pb-4 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block">
                  Perfil do Especialista
                </span>
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                  {selectedAgent.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedAgent.role_label} • {selectedAgent.seniority}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-4 text-xs">
                {/* Resumo Profissional */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Resumo de Carreira & Expertise
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed p-3.5 rounded-xl bg-muted/20 border border-border/40">
                    {selectedAgent.career_summary}
                  </p>
                </div>

                {/* Formação Acadêmica */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    Formação Acadêmica
                  </h4>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {selectedAgent.curriculum.academic_background.map((item, idx) => (
                      <li
                        key={idx}
                        className="p-2.5 rounded-lg bg-muted/10 border border-border/40 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Certificações Executivas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-primary" />
                    Certificações Executivas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.curriculum.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Entregáveis Produzidos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-primary" />
                    Entregáveis Produzidos por Este Agente
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {selectedAgent.deliverables.map((deliv, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>{deliv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metadados Técnicos de IA */}
                <div className="p-3.5 rounded-xl bg-muted/10 border border-border/30 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Modelo de IA Alocado:</span>
                    <strong className="text-foreground font-mono">{selectedAgent.default_model}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Modo Operacional:</span>
                    <strong className="text-foreground">Human-in-the-Loop Supervisionado</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedAgent(null)}
              className="w-full rounded-xl text-xs font-bold"
            >
              Fechar Currículo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* ── SHEET CANÔNICA DE INSPEÇÃO DE ENTREGÁVEIS & PARECER EXECUTIVO ── */}
      <Sheet open={!!selectedRunArtifacts} onOpenChange={(open) => !open && setSelectedRunArtifacts(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] bg-card p-6 overflow-y-auto flex flex-col justify-between space-y-6">
          {selectedRunArtifacts && selectedRunArtifacts.run && (
            <div>
              <SheetHeader className="border-b border-border/40 pb-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block">
                    Parecer Executivo de Rotina
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                    selectedRunArtifacts.run.status === "needs_approval"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  }`}>
                    {selectedRunArtifacts.run.status === "needs_approval" ? "Aguardando Revisão" : "Aprovado"}
                  </span>
                </div>
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
                  {selectedRunArtifacts.squadName}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Iniciado em {new Date(selectedRunArtifacts.run.started_at).toLocaleString("pt-BR")}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-4 text-xs">
                {/* Parecer Executivo */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Diagnóstico Estruturado
                  </h4>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-foreground leading-relaxed">
                    {selectedRunArtifacts.run.output_artifacts?.executive_summary || "Diagnóstico concluído com sucesso."}
                  </div>
                </div>

                {/* Itens Pendentes de Aprovação / Diretrizes */}
                {selectedRunArtifacts.run.output_artifacts?.pending_approval_items?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Entregáveis Produzidos ({selectedRunArtifacts.run.output_artifacts.pending_approval_items.length})
                    </h4>
                    <div className="space-y-2.5">
                      {selectedRunArtifacts.run.output_artifacts.pending_approval_items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-muted/10 border border-border/40 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs">{item.title}</span>
                            {item.confidence_score && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                {item.confidence_score}% Confiança
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                          {item.assigned_agent && (
                            <span className="text-[10px] text-muted-foreground block">
                              Responsável: <strong className="text-foreground">{item.assigned_agent}</strong>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs Monitorados */}
                {selectedRunArtifacts.run.output_artifacts?.kpis_monitored?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Indicadores Auditados
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRunArtifacts.run.output_artifacts.kpis_monitored.map((kpi: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted/30 border border-border/40 text-foreground"
                        >
                          {kpi}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadados Técnicos de Execução */}
                <div className="p-3.5 rounded-xl bg-muted/10 border border-border/30 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Tokens Processados:</span>
                    <strong className="text-foreground font-mono">{selectedRunArtifacts.run.total_tokens_consumed || 1250}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Origem do Disparo:</span>
                    <strong className="text-foreground capitalize">{selectedRunArtifacts.run.trigger_source || "Manual"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="pt-4 border-t border-border/40 flex flex-col sm:flex-row gap-2">
            {selectedRunArtifacts?.run?.status === "needs_approval" && (
              <Button
                type="button"
                onClick={async () => {
                  await handleApproveRun(selectedRunArtifacts.run.id);
                  setSelectedRunArtifacts(null);
                }}
                disabled={actionLoading === `approve-${selectedRunArtifacts.run.id}`}
                className="w-full sm:flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {actionLoading === `approve-${selectedRunArtifacts.run.id}` ? "Aprovando..." : "Aprovar Diretriz"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRunArtifacts(null)}
              className="w-full sm:w-auto rounded-xl text-xs font-bold"
            >
              Fechar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
