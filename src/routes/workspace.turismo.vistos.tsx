import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Plus, Search, CheckCircle2, Clock, AlertCircle, FileCheck, Calendar, User, Trash2, FileSpreadsheet, ShieldCheck, Percent, Compass } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { getStoreSettings } from "@/services/store.functions";
import { listTravelVisas, updateTravelVisaStatus, deleteTravelVisa } from "@/services/travel-visas.functions";
import {
  evaluateUsVisaDs160ConsularTies,
  parseAndValidatePassportMrz,
  type VisaDs160EvaluationResult,
} from "@/services/travel-ecosystem-engines.functions";
import { VISA_STATUS_LABELS, type VisaStatus, type TravelVisaDTO } from "@/types/travel-visas";
import { NewVisaWizard } from "@/components/tourism/visas/new-visa-wizard";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { playCashRegisterSound, playMessageChime } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/turismo/vistos")({
  head: () => ({ meta: [{ title: "Vistos Consulares | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      return { store };
    } catch (err) {
      console.error("[loader:workspace.turismo.vistos] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: WorkspaceVisasPage,
});

function WorkspaceVisasPage() {
  const { store } = ((Route.useLoaderData?.() as any) || {});
  const storeId = store?.id || "";

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [consularStudioOpen, setConsularStudioOpen] = useState(false);

  // Estados da Pré-Análise Consular DS-160 (INA 214b) & Scanner MRZ
  const [dsApplicantName, setDsApplicantName] = useState("Passageiro Titular");
  const [dsEmploymentType, setDsEmploymentType] = useState<
    "clt" | "empresario" | "servidor_publico" | "autonomo" | "estudante" | "desempregado"
  >("empresario");
  const [dsMonthsInJob, setDsMonthsInJob] = useState(48);
  const [dsMonthlyIncomeCents, setDsMonthlyIncomeCents] = useState(1450000);
  const [dsEvaluation, setDsEvaluation] = useState<VisaDs160EvaluationResult>(() =>
    evaluateUsVisaDs160ConsularTies({
      applicantName: "Passageiro Titular",
      destinationCountry: "Estados Unidos",
      visaType: "B1/B2 Turismo e Negócios",
      occupationType: "empresario",
      employmentTenureMonths: 48,
      monthlyIncomeCents: 1450000,
      hasIncomeTaxReturn: true,
      hasPropertyInBrazil: true,
      hasDependentsInBrazil: true,
      hasRelativesInDestination: false,
      relativesLegalStatus: "none",
      previousInternationalTrips: ["Europa Schengen", "Argentina"],
      previousVisaRefusal: false,
      tripSponsorType: "self",
      estimatedTripCostCents: 1800000,
      plannedStayDays: 12,
    }),
  );

  const [mrzLine1, setMrzLine1] = useState("P<BRASILVA<<CARLOS<EDUARDO<<<<<<<<<<<<<<<<<<");
  const [mrzLine2, setMrzLine2] = useState("FP849201<4BRA8804158M3108206<<<<<<<<<<<<<<02");
  const [tripReturnDate, setTripReturnDate] = useState("2026-12-15");
  const [mrzResult, setMrzResult] = useState(() =>
    parseAndValidatePassportMrz(
      "P<BRASILVA<<CARLOS<EDUARDO<<<<<<<<<<<<<<<<<<",
      "FP849201<4BRA8804158M3108206<<<<<<<<<<<<<<02",
      "2026-12-15",
    ),
  );

  const handleRunConsularEvaluation = () => {
    const evalRes = evaluateUsVisaDs160ConsularTies({
      applicantName: dsApplicantName,
      destinationCountry: "Estados Unidos",
      visaType: "B1/B2 Turismo e Negócios",
      occupationType: dsEmploymentType,
      employmentTenureMonths: dsMonthsInJob,
      monthlyIncomeCents: dsMonthlyIncomeCents,
      hasIncomeTaxReturn: true,
      hasPropertyInBrazil: true,
      hasDependentsInBrazil: true,
      hasRelativesInDestination: false,
      relativesLegalStatus: "none",
      previousInternationalTrips: ["América do Sul"],
      previousVisaRefusal: false,
      tripSponsorType: "self",
      estimatedTripCostCents: 1800000,
      plannedStayDays: 10,
    });
    setDsEvaluation(evalRes);
    const mrzRes = parseAndValidatePassportMrz(mrzLine1, mrzLine2, tripReturnDate);
    setMrzResult(mrzRes);
    toast.success("Auditoria DS-160 (INA 214b) e validação MRZ 6 meses concluídas!");
  };

  const { data: visas = [], refetch, isLoading } = useQuery({
    queryKey: ["travel-visas", storeId, selectedStatus],
    queryFn: () => listTravelVisas({ data: { store_id: storeId, status: selectedStatus } }),
    enabled: !!storeId,
  });

  // KPIs Analíticos
  const kpis = useMemo(() => {
    const total = visas.length;
    const inProgress = visas.filter((v) =>
      [
        "coleta_documentos",
        "formulario_preenchido",
        "agendamento_consular",
        "analise_consular",
        "em_analise_consular",
      ].includes(v.status),
    ).length;

    const interviews = visas.filter((v) => v.status === "entrevista_agendada" || !!v.interview_date)
      .length;

    const approved = visas.filter((v) => v.status === "aprovado" || v.status === "entregue").length;
    const rejected = visas.filter((v) => v.status === "recusado" || v.status === "negado").length;
    const decided = approved + rejected;
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 100;

    return {
      total,
      inProgress,
      interviews,
      approved,
      approvalRate,
    };
  }, [visas]);

  const filtered = useMemo(() => {
    return visas.filter((v) => {
      const q = search.toLowerCase();
      const matchesQuery =
        v.client_name.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q) ||
        (v.client_passport && v.client_passport.toLowerCase().includes(q));

      let matchesTab = true;
      if (selectedStatus === "in_progress") {
        matchesTab = [
          "coleta_documentos",
          "formulario_preenchido",
          "agendamento_consular",
          "analise_consular",
          "em_analise_consular",
        ].includes(v.status);
      } else if (selectedStatus === "interview") {
        matchesTab = v.status === "entrevista_agendada" || !!v.interview_date;
      } else if (selectedStatus === "approved") {
        matchesTab = v.status === "aprovado" || v.status === "entregue";
      } else if (selectedStatus !== "all") {
        matchesTab = v.status === selectedStatus;
      }

      return matchesQuery && matchesTab;
    });
  }, [visas, search, selectedStatus]);

  const handleStatusChange = async (id: string, newStatus: VisaStatus) => {
    try {
      await updateTravelVisaStatus({ data: { id, status: newStatus } });
      if (newStatus === "aprovado" || newStatus === "entregue") {
        playCashRegisterSound();
        toast.success("Visto aprovado e registrado com sucesso!");
      } else {
        playMessageChime();
        toast.success("Status consular atualizado!");
      }
      refetch();
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err?.message);
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    try {
      await deleteTravelVisa({ data: { id } });
      toast.success(`Processo consular ${name ? "de " + name + " " : ""}removido!`);
      refetch();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err?.message);
    }
  };

  // Exportar Relatório Consular CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum processo para exportar.");
      return;
    }

    const headers = [
      "Passageiro / Titular",
      "Passaporte",
      "País de Destino",
      "Categoria do Visto",
      "Status Consular",
      "Data da Entrevista",
      "Previsão de Conclusão",
      "Observações",
    ];

    const rows = filtered.map((v) => [
      `"${v.client_name}"`,
      `"${v.client_passport || ""}"`,
      `"${v.country}"`,
      `"${v.visa_category}"`,
      `"${VISA_STATUS_LABELS[v.status]?.label || v.status}"`,
      v.interview_date ? `"${new Date(v.interview_date).toLocaleDateString("pt-BR")}"` : '""',
      v.expected_date ? `"${new Date(v.expected_date).toLocaleDateString("pt-BR")}"` : '""',
      `"${(v.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio-vistos-consulares-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Relatório de processos consulares exportado com sucesso!");
  };

  return (
    <NicheOperationalGuard
      targetNiche="tourism"
      toolTitle="Vistos Consulares"
      toolDescription="Acompanhamento de processos consulares (EUA B1/B2, Canadá, ETIAS Europa), formulários e agendamentos de entrevista."
      store={store}
    >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        {/* ── HEADER DA PÁGINA ── */}
        <PageHeader
          eyebrow="Turismo & Assessoria Consular"
          title="Vistos Consulares"
          description="Acompanhamento de processos de vistos (EUA, Canadá, ETIAS Europa), formulários DS-160 e agendamentos de entrevista no CASV/Consulado."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setConsularStudioOpen((prev) => !prev)}
                variant="outline"
                size="sm"
                className="font-bold text-xs gap-2 h-11 min-h-11 px-4 rounded-lg cursor-pointer focus-visible:ring-2"
              >
                <ShieldCheck className="size-4 text-primary" />
                <span>{consularStudioOpen ? "Ocultar Pré-Análise DS-160 & MRZ" : "Pré-Análise DS-160 & Scanner MRZ"}</span>
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="font-bold text-xs gap-2 h-11 min-h-11 px-4 rounded-lg cursor-pointer focus-visible:ring-2"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <span>Exportar Relatório (CSV)</span>
              </Button>
              <Button
                type="button"
                onClick={() => setWizardOpen(true)}
                size="sm"
                className="rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-2 h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2"
              >
                <Plus className="size-4" />
                <span>Novo Processo</span>
              </Button>
            </div>
          }
        />

        {/* ── ESTÚDIO DE PRÉ-ANÁLISE CONSULAR DS-160 (INA 214b) & VALIDADOR MRZ (ICAO 9303) ── */}
        {consularStudioOpen && (
          <div className="rounded-lg bg-card border border-border p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs font-bold">
                  Motor Consular Federal • INA Section 214(b) & ICAO Doc 9303
                </Badge>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Auditoria de Vínculos DS-160 (Visto Americano B1/B2) & Validador MRZ de Passaporte
                </h2>
              </div>
              <Button
                type="button"
                onClick={handleRunConsularEvaluation}
                className="h-11 min-h-11 px-5 rounded-lg font-bold text-xs focus-visible:ring-2"
              >
                Executar Simulação Consular & Checksum MRZ
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Matriz de Vínculos DS-160 */}
              <div className="rounded-lg bg-muted/20 border border-border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">1. Matriz de Vínculos Socioeconômicos (DS-160)</h3>
                  <Badge variant={dsEvaluation.consularTiesScore >= 75 ? "default" : "outline"} className="text-xs font-bold">
                    Score: {dsEvaluation.consularTiesScore}/100 ({dsEvaluation.readinessTier})
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Nome do Solicitante</label>
                    <Input
                      value={dsApplicantName}
                      onChange={(e) => setDsApplicantName(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Vínculo Profissional</label>
                    <select
                      value={dsEmploymentType}
                      onChange={(e) => setDsEmploymentType(e.target.value as any)}
                      className="w-full h-11 min-h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold focus-visible:ring-2"
                    >
                      <option value="empresario">Empresário / Sócio (CNPJ)</option>
                      <option value="servidor_publico">Servidor Público Concursado</option>
                      <option value="clt">Empregado CLT</option>
                      <option value="autonomo">Autônomo / Profissional Liberal</option>
                      <option value="estudante">Estudante</option>
                      <option value="desempregado">Sem Vínculo Formal</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Tempo na Ocupação (meses)</label>
                    <Input
                      type="number"
                      value={dsMonthsInJob}
                      onChange={(e) => setDsMonthsInJob(Number(e.target.value) || 0)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Renda Mensal (R$)</label>
                    <Input
                      type="number"
                      value={Math.round(dsMonthlyIncomeCents / 100)}
                      onChange={(e) => setDsMonthlyIncomeCents((Number(e.target.value) || 0) * 100)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-foreground">Fatores Positivos Verificados:</p>
                  <ul className="space-y-1">
                    {dsEvaluation.strengths.map((s: string, idx: number) => (
                      <li key={idx} className="text-xs text-muted-foreground break-words leading-relaxed">
                        • {s}
                      </li>
                    ))}
                  </ul>
                  {dsEvaluation.redFlags.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-amber-600 pt-2">Alertas de Atenção Consular (INA 214b):</p>
                      <ul className="space-y-1">
                        {dsEvaluation.redFlags.map((f: string, idx: number) => (
                          <li key={idx} className="text-xs text-amber-700 dark:text-amber-300 break-words leading-relaxed">
                            • {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Coluna 2: Scanner MRZ ICAO 9303 e Regra dos 6 Meses */}
              <div className="rounded-lg bg-muted/20 border border-border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">2. Validador MRZ (ICAO 9303) & Regra de 6 Meses</h3>
                  <Badge variant={mrzResult.meetsSixMonthValidityRule && mrzResult.isValidMrz ? "default" : "outline"} className="text-xs font-bold">
                    {mrzResult.meetsSixMonthValidityRule ? "Apto para Embarque" : "Alerta de Validade"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Linha 1 MRZ (44 caracteres)</label>
                  <Input
                    value={mrzLine1}
                    onChange={(e) => setMrzLine1(e.target.value)}
                    className="h-11 min-h-11 rounded-lg font-mono text-xs"
                  />
                  <label className="text-xs font-semibold text-muted-foreground">Linha 2 MRZ (44 caracteres)</label>
                  <Input
                    value={mrzLine2}
                    onChange={(e) => setMrzLine2(e.target.value)}
                    className="h-11 min-h-11 rounded-lg font-mono text-xs"
                  />
                  <label className="text-xs font-semibold text-muted-foreground">Data de Retorno da Viagem</label>
                  <Input
                    type="date"
                    value={tripReturnDate}
                    onChange={(e) => setTripReturnDate(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />
                </div>

                <div className="rounded-lg bg-card border border-border p-3 space-y-2 text-xs">
                  <p className="font-bold text-foreground">
                    Titular Extraído: {mrzResult.holderFirstName} {mrzResult.holderLastName} • Passaporte: {mrzResult.passportNumber}
                  </p>
                  <p className="text-muted-foreground">
                    Validade: {mrzResult.expiryDateIso} ({mrzResult.daysUntilExpiryFromReturn} dias após o retorno)
                  </p>
                  <p className="text-amber-600 font-semibold break-words">
                    • {mrzResult.validationMessagePt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 4 KPIS NO PARADIGMA CLEAN ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="size-3.5 text-amber-600" />
              Processos em Andamento
            </span>
            <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
              {kpis.inProgress}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Coleta de docs e formulários
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="size-3.5 text-purple-600" />
              Entrevistas Agendadas
            </span>
            <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
              {kpis.interviews}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              CASV / Consulado confirmados
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Vistos Aprovados
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {kpis.approved}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Emitidos ou já entregues
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Percent className="size-3.5 text-primary" />
              Taxa de Aprovação
            </span>
            <div className="text-2xl font-mono font-bold text-foreground">
              {kpis.approvalRate}%
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Eficiência da assessoria da agência
            </p>
          </div>
        </div>

        {/* ── BARRA DE BUSCA E TABS ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border/70 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por passageiro, país ou nº do passaporte..."
              className="pl-9 h-10 rounded-lg bg-background border-border/80 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Todos", count: kpis.total },
              { id: "in_progress", label: "Em Andamento", count: kpis.inProgress },
              { id: "interview", label: "Entrevistas", count: kpis.interviews },
              { id: "approved", label: "Aprovados", count: kpis.approved },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={selectedStatus === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(tab.id)}
                className="h-9 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </div>
        </div>

        {/* ── GRID DE PROCESSOS CONSULARES ── */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Carregando processos consulares...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-4 rounded-lg bg-card border border-border/70 shadow-2xs">
            <div className="size-12 rounded-lg bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
              <Globe className="size-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-foreground">Nenhum processo consular encontrado</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inicie o acompanhamento de vistos ou renovação de passaportes para os passageiros da sua agência.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setWizardOpen(true)}
              size="sm"
              className="rounded-lg font-bold bg-primary text-primary-foreground text-xs shadow-2xs cursor-pointer"
            >
              Novo Processo Consular
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => {
              const statusMeta =
                VISA_STATUS_LABELS[v.status] || VISA_STATUS_LABELS.coleta_documentos;
              return (
                <div
                  key={v.id}
                  className="p-5 rounded-lg bg-card border border-border/70 hover:border-primary/40 transition-colors shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">
                          {v.client_name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                          <Compass className="size-3 text-primary" />
                          <span>{v.country}</span>
                          <span>•</span>
                          <span className="font-normal">{v.visa_category}</span>
                        </p>
                      </div>
                      {v.client_passport && (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs uppercase tracking-wider bg-background"
                        >
                          {v.client_passport}
                        </Badge>
                      )}
                    </div>

                    {/* Dropdown de Mudança de Status */}
                    <div className="pt-1">
                      <select
                        value={v.status}
                        onChange={(e) => handleStatusChange(v.id, e.target.value as VisaStatus)}
                        className={
                          "w-full h-8 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer " +
                          statusMeta.color
                        }
                      >
                        {Object.entries(VISA_STATUS_LABELS).map(([k, meta]) => (
                          <option key={k} value={k}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Entrevista agendada */}
                    {v.interview_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <Calendar className="size-3.5 text-purple-600 shrink-0" />
                        <span>
                          Entrevista:{" "}
                          <strong className="text-foreground">
                            {new Date(v.interview_date).toLocaleDateString("pt-BR")}
                          </strong>
                        </span>
                      </div>
                    )}

                    {v.notes && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic bg-muted/20 p-2 rounded-lg">
                        "{v.notes}"
                      </p>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="text-xs font-mono">
                      {v.documents?.length || 4} itens no checklist
                    </span>
                    <CrudActionsMenu
                      entityName="Processo Consular"
                      onDelete={() => handleDelete(v.id, v.client_name)}
                      deleteConfirmTitle={`Remover processo de ${v.client_name}?`}
                      deleteConfirmDescription="Esta ação removerá permanentemente o registro do processo consular e seu checklist associado."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {wizardOpen && (
          <NewVisaWizard
            isOpen={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onCreated={refetch}
            storeId={storeId}
          />
        )}
      </div>
    </NicheOperationalGuard>
  );
}
