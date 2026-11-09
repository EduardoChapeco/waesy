import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock, RefreshCw, FileText, CheckCircle2, DollarSign, Calendar, Users, Info, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { analyzeLaborCompliance, type LaborComplianceReport, type LaborComplianceItem } from "@/services/hr.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet } from "@/components/workspace/workspace-dashboard-sheet";

export const Route = createFileRoute("/workspace/rh/compliance")({
  head: () => ({ meta: [{ title: "Compliance Trabalhista & Riscos DP | Gestão RH Waesy" }] }),
  component: WorkspaceRHCompliancePage,
});

function WorkspaceRHCompliancePage() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const { data: report, isLoading, isRefetching } = useQuery<LaborComplianceReport>({
    queryKey: ["labor-compliance-analysis"],
    queryFn: () => analyzeLaborCompliance(),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["labor-compliance-analysis"] });
    toast.success("Auditoria trabalhista recalculada com telemetria atualizada.");
  };

  const filteredItems = useMemo(() => {
    if (!report?.items) return [];
    return report.items.filter((item: LaborComplianceItem) => {
      if (filterCategory !== "all" && item.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.employeeName.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchLegal = item.legalReference.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchLegal) return false;
      }
      return true;
    });
  }, [report?.items, filterCategory, searchQuery]);

  const scoreColor = useMemo(() => {
    const s = report?.complianceScore ?? 100;
    if (s >= 80) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
    if (s >= 50) return "text-warning border-warning/20 bg-warning/10";
    return "text-destructive border-destructive/20 bg-destructive/10";
  }, [report?.complianceScore]);

  const CATEGORY_LABELS: Record<string, string> = {
    vacation: "Férias & Prazos",
    aso: "Exames ASO (NR-7)",
    overtime: "Jornada & Ponto",
    cash_advances: "Vales & Caixa Interno",
    documentation: "Dossiê GED",
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 w-full">
      {/* ── 1. Barra Canônica de Operação Silenciosa ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "all", label: "Todos os Riscos", icon: ShieldAlert, count: report?.items?.length || 0 },
          { id: "vacation", label: "Férias", icon: Calendar, count: report?.items?.filter((i) => i.category === "vacation").length || 0 },
          { id: "cash_advances", label: "Vales & Caixa", icon: DollarSign, count: report?.items?.filter((i) => i.category === "cash_advances").length || 0 },
          { id: "overtime", label: "Jornada & Ponto", icon: Clock, count: report?.items?.filter((i) => i.category === "overtime").length || 0 },
        ]}
        activeTab={filterCategory}
        onTabChange={(id) => setFilterCategory(id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por colaborador, artigo ou irregularidade..."
        onMetricsClick={() => setIsDashboardOpen(true)}
        metricsBadge={`Score: ${report?.complianceScore ?? 100}%`}
        primaryAction={{ label: "Re-auditar com IA", onClick: handleRefresh }}
      />

      {/* ── 2. Banner de Governança Interna Zero-Vazamento (AGENTS.md B.24 / B.31) ── */}
      <div className="p-4 rounded-lg border border-border bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Auditoria Restrita ao DP & Diretoria
            </span>
            <Badge variant="outline" className={`text-xs font-bold ${scoreColor}`}>
              Conformidade Geral: {report?.complianceScore ?? 100}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Mapeamento de riscos preventivos CLT, contingências fiscais e alertas de prazos. Dados operacionais confidenciais, não visíveis ao colaborador civil.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/workspace/rh/ponto"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            <span>Ver Espelho de Ponto</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 3. Lista de Apontamentos & Ações Mitigatórias ── */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Calculando conformidade legal e cruzando telemetria de ponto, caixa e admissões...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-border bg-card space-y-2">
          <ShieldCheck className="size-8 mx-auto text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma Irregularidade Detectada</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Todos os colaboradores com registros analisados estão em conformidade com as regras de férias, jornadas de ponto e adiantamentos vinculados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.severity === "high" ? (
                    <Badge variant="destructive" className="text-xs font-bold">
                      Risco Alto
                    </Badge>
                  ) : item.severity === "medium" ? (
                    <Badge variant="outline" className="text-xs font-bold text-warning border-warning/30 bg-warning/10">
                      Risco Moderado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs font-bold">
                      Atenção Preventiva
                    </Badge>
                  )}
                  <span className="text-xs font-bold text-foreground">{item.employeeName}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({CATEGORY_LABELS[item.category] || item.category})
                  </span>
                </div>

                {item.internalRiskEstimateCents > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Exposição Estimada: </span>
                    <span className="font-bold text-foreground font-mono">
                      {formatMoney(item.internalRiskEstimateCents)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-foreground font-medium leading-relaxed">
                {item.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-xs">Amparo Legal:</span>
                  <span className="font-semibold text-foreground">{item.legalReference}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Ação Recomendada pelo DP:</span>
                  <span className="font-semibold text-primary">{item.actionRecommended}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Dashboard Drawer Sob Demanda ── */}
      <WorkspaceDashboardSheet
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Auditoria de DP & Compliance"
        description="Métricas consolidadas de conformidade trabalhista e contingências mapeadas."
        metrics={[
          {
            label: "Score de Conformidade",
            value: `${report?.complianceScore ?? 100}%`,
            subtext: report?.complianceScore && report.complianceScore >= 80 ? "Conforme" : "Atenção",
            trend: { value: report?.complianceScore && report.complianceScore >= 80 ? "Conforme" : "Atenção", direction: report?.complianceScore && report.complianceScore >= 80 ? "up" : "down" },
          },
          {
            label: "Alertas Críticos",
            value: String(report?.criticalAlertsCount ?? 0),
            subtext: "Ação imediata requerida",
            trend: { value: "Ação imediata", direction: (report?.criticalAlertsCount ?? 0) > 0 ? "down" : "neutral" },
          },
          {
            label: "Alertas Moderados",
            value: String(report?.warningsCount ?? 0),
            subtext: "Monitoramento",
            trend: { value: "Estável", direction: "neutral" },
          },
          {
            label: "Exposição Financeira Mapeada",
            value: formatMoney(report?.totalRiskExposureCents ?? 0),
            subtext: "Passivo contingente",
            trend: { value: "Risco mapeado", direction: (report?.totalRiskExposureCents ?? 0) > 0 ? "down" : "neutral" },
          },
        ]}
      />
    </div>
  );
}