import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Building2,
  Clock,
  Wallet,
  ShieldCheck,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  DollarSign,
  HeartPulse,
  ExternalLink,
  Edit3,
  RefreshCw,
  Plus,
  ArrowRight,
  BadgeAlert,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/commerce/page-header";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  getStoreHRDashboardMetrics,
  listStoreEmployees,
  listStoreDepartments,
  type StoreEmployeeDTO,
  type StoreDepartmentItemDTO,
  type HRDashboardMetricsDTO,
} from "@/services/hr.functions";
import { getStoreSettings } from "@/services/store.functions";
import { EmployeeFullProfileModal } from "@/components/hr/EmployeeFullProfileModal";
import { DepartmentManagerPanel } from "@/components/hr/DepartmentManagerPanel";
import { HrSubmoduleNavigation } from "@/components/hr/HrSubmoduleNavigation";

export const Route = createFileRoute("/workspace/rh/")({
  head: () => ({
    meta: [
      { title: "Gente & Gestão (RH/DP) | Workspace Waesy" },
      { name: "description", content: "Sistema integrado de Recursos Humanos, Departamento Pessoal, Ponto Eletrônico e Setores." },
    ],
  }),
  loader: async () => {
    try {
      const [metrics, employees, departments, storeRes] = await Promise.all([
        getStoreHRDashboardMetrics().catch(() => null),
        listStoreEmployees().catch(() => []),
        listStoreDepartments().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);

      return {
        metrics,
        employees: Array.isArray(employees) ? employees : [],
        departments: Array.isArray(departments) ? departments : [],
        store: (storeRes as any)?.store || storeRes || null,
      };
    } catch (err) {
      console.error("[loader:workspace.rh] Unhandled error:", err);
      return { metrics: null, employees: [], departments: [], store: null };
    }
  },
  component: WorkspaceRHHubPage,
});

function WorkspaceRHHubPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();

  const [activeTab, setActiveTab] = useState<"overview" | "colaboradores" | "setores">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRegime, setFilterRegime] = useState<string>("all");

  // Modal de Edição/Admissão de Colaborador
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<StoreEmployeeDTO | null>(null);

  // Queries Reativas
  const { data: metrics = loaderData.metrics as HRDashboardMetricsDTO | null, refetch: refetchMetrics } = useQuery<HRDashboardMetricsDTO | null>({
    queryKey: ["hr-dashboard-metrics"],
    queryFn: () => getStoreHRDashboardMetrics(),
    initialData: loaderData.metrics as HRDashboardMetricsDTO | null,
  });

  const { data: employees = loaderData.employees as StoreEmployeeDTO[], refetch: refetchEmployees } = useQuery<StoreEmployeeDTO[]>({
    queryKey: ["hr-store-employees"],
    queryFn: () => listStoreEmployees(),
    initialData: loaderData.employees as StoreEmployeeDTO[],
  });

  const { data: departments = loaderData.departments as StoreDepartmentItemDTO[], refetch: refetchDepartments } = useQuery<StoreDepartmentItemDTO[]>({
    queryKey: ["hr-store-departments"],
    queryFn: () => listStoreDepartments(),
    initialData: loaderData.departments as StoreDepartmentItemDTO[],
  });

  const handleRefreshAll = async () => {
    await Promise.all([refetchMetrics(), refetchEmployees(), refetchDepartments()]);
  };

  const handleOpenAdmit = () => {
    setSelectedEmployee(null);
    setIsProfileModalOpen(true);
  };

  const handleOpenEdit = (emp: StoreEmployeeDTO) => {
    setSelectedEmployee(emp);
    setIsProfileModalOpen(true);
  };

  // Filtragem de Colaboradores
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: StoreEmployeeDTO) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = emp.full_name?.toLowerCase().includes(query);
        const matchCpf = emp.cpf_masked?.includes(query);
        const matchCargo = emp.job_title?.toLowerCase().includes(query);
        if (!matchName && !matchCpf && !matchCargo) return false;
      }

      if (filterDepartment !== "all") {
        const meta = (emp.metadata || {}) as Record<string, any>;
        const dId = meta.departmentId;
        const dName = meta.departmentName || meta.department;
        if (dId !== filterDepartment && dName !== filterDepartment) return false;
      }

      if (filterStatus !== "all" && (emp.status || "active") !== filterStatus) {
        return false;
      }

      if (filterRegime !== "all" && emp.employment_type !== filterRegime) {
        return false;
      }

      return true;
    });
  }, [employees, searchTerm, filterDepartment, filterStatus, filterRegime]);

  const activeEmployeesCount = metrics?.activeCount ?? employees.filter((e: StoreEmployeeDTO) => (e.status || "active") === "active").length;
  const totalPayrollCents = metrics?.totalPayrollBaseCents ?? employees.reduce((acc: number, e: StoreEmployeeDTO) => acc + (e.base_salary_cents || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── NAVEGAÇÃO DE SUBMÓDULOS DE RH / DP ── */}
      <HrSubmoduleNavigation
        activeModule="hub"
        totalEmployees={activeEmployeesCount}
        openIssuesCount={(metrics?.alerts?.expiringAsoCount || 0) + (metrics?.alerts?.pendingCertificatesCount || 0)}
      />

      {/* ── HEADER DA SUÍTE DE RH & DP ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-6 rounded-2xl border border-border/70 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Gente & Gestão (RH / DP)
              </h1>
              <Badge variant="secondary" className="text-3xs font-semibold px-2 py-1">
                Módulo Corporativo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Gestão integrada de colaboradores, setores da empresa, ponto eletrônico, folha e conformidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefreshAll}
            className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/70 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            title="Atualizar dados de RH"
          >
            <RefreshCw className="size-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenAdmit}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>Admitir Colaborador</span>
          </Button>
        </div>
      </div>

      {/* ── CARDS DE MÉTRICAS EXECUTIVAS 360° ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Headcount */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wide">Colaboradores</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              {activeEmployeesCount}
            </span>
            <span className="text-2xs text-muted-foreground font-semibold">ativos na empresa</span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground pt-1 border-t border-border/40">
            <span>{employees.length} no quadro geral</span>
            <span>·</span>
            <span>{departments.length} setores</span>
          </div>
        </div>

        {/* Card 2: Ponto Eletrônico de Hoje */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wide">Ponto de Hoje</span>
            <Clock className="size-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              {metrics?.todayClock?.clockedIn || 0}
            </span>
            <span className="text-2xs text-emerald-600 font-semibold">presentes agora</span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-muted-foreground pt-1 border-t border-border/40">
            <span>{metrics?.todayClock?.atLunch || 0} almoçando</span>
            <span>·</span>
            <span>{metrics?.todayClock?.absent || 0} ausentes</span>
          </div>
        </div>

        {/* Card 3: Custo de Folha Base */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wide">Folha Mensal Base</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
              {formatMoney(totalPayrollCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1 border-t border-border/40">
            <span>Salários contratuais</span>
            <Link
              to="/workspace/rh/folha"
              className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Ver Holerites</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Alertas Regulatórios & Compliance */}
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wide">Compliance & ASOs</span>
            <HeartPulse className="size-4 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              {(metrics?.alerts?.expiringAsoCount || 0) + (metrics?.alerts?.pendingCertificatesCount || 0)}
            </span>
            <span className="text-2xs text-muted-foreground font-semibold">pendências ativas</span>
          </div>
          <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1 border-t border-border/40">
            <span>{metrics?.alerts?.expiringAsoCount || 0} ASOs vencendo</span>
            <Link
              to="/workspace/rh/compliance"
              className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Auditoria</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── BARRA DE NAVEGAÇÃO DE ABAS & ATALHOS DE SUBMÓDULOS ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar">
          {[
            { id: "overview", label: "Visão Geral", icon: Layers },
            { id: "colaboradores", label: `Colaboradores (${employees.length})`, icon: Users },
            { id: "setores", label: `Setores & Departamentos (${departments.length})`, icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Atalhos Rápidos para Submódulos Profundos */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/workspace/rh/ponto"
            className="h-11 min-h-11 px-3 rounded-lg border border-border/70 text-xs font-semibold flex items-center gap-2 hover:bg-muted transition-colors text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Clock className="size-3.5 text-primary" />
            <span>Ponto Eletrônico</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          <Link
            to="/workspace/rh/folha"
            className="h-11 min-h-11 px-3 rounded-lg border border-border/70 text-xs font-semibold flex items-center gap-2 hover:bg-muted transition-colors text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wallet className="size-3.5 text-primary" />
            <span>Folha & Holerites</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>

          <Link
            to="/workspace/configuracoes/equipe"
            className="h-11 min-h-11 px-3 rounded-lg border border-border/70 text-xs font-semibold flex items-center gap-2 hover:bg-muted transition-colors text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Permissões & Acessos</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* ── CONTEÚDO DAS ABAS ── */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 & 2: Distribuição por Setor & Atalhos */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">
                      Distribuição do Quadro por Setor
                    </h3>
                    <p className="text-2xs text-muted-foreground">
                      Alocação de colaboradores ativos nos departamentos horizontais da empresa.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("setores")}
                    className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs font-semibold gap-1"
                  >
                    <span>Gerenciar Setores</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {departments.map((dept: StoreDepartmentItemDTO) => (
                    <div
                      key={dept.id}
                      className="p-4 rounded-xl border border-border/50 bg-muted/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Briefcase className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-foreground block truncate">
                            {dept.name}
                          </span>
                          <span className="text-3xs text-muted-foreground font-mono">
                            {dept.slug}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono font-bold">
                        {dept.employee_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Central de Ações Rápidas do RH */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  to="/workspace/rh/ponto"
                  className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Clock className="size-4" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">Espelho de Ponto</h4>
                    <p className="text-2xs text-muted-foreground">Batidas, ajustes e justificativas MTE 671</p>
                  </div>
                </Link>

                <Link
                  to="/workspace/rh/folha"
                  className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Wallet className="size-4" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">Folha & Holerites</h4>
                    <p className="text-2xs text-muted-foreground">Emissão de recibos e fechamento contábil</p>
                  </div>
                </Link>

                <Link
                  to="/workspace/configuracoes/equipe"
                  className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                      <ShieldCheck className="size-4" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">Papéis & Acessos</h4>
                    <p className="text-2xs text-muted-foreground">Permissões de administradores e operadores</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Coluna 3: Alertas de Saúde Ocupacional & Ponto */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-border/70 bg-card space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wide">
                  <BadgeAlert className="size-4 text-warning" />
                  <span>Alertas Regulatórios</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                    <span className="font-semibold text-xs text-foreground block">
                      ASO & Medicina do Trabalho
                    </span>
                    <p className="text-2xs text-muted-foreground">
                      {metrics?.alerts?.expiringAsoCount
                        ? `${metrics.alerts.expiringAsoCount} colaborador(es) com exame periódico a vencer em menos de 30 dias.`
                        : "Todos os exames periódicos e admissionais estão em dia."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/40 bg-muted/10 space-y-1">
                    <span className="font-semibold text-xs text-foreground block">
                      Atestados Médicos Pendentes
                    </span>
                    <p className="text-2xs text-muted-foreground">
                      {metrics?.alerts?.pendingCertificatesCount
                        ? `${metrics.alerts.pendingCertificatesCount} atestado(s) aguardando homologação do DP.`
                        : "Nenhum atestado médico pendente de validação."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: COLABORADORES */}
      {activeTab === "colaboradores" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca de Colaboradores */}
          <div className="p-4 rounded-xl border border-border/70 bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 relative min-w-0">
              <Search className="size-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF ou cargo..."
                className="h-11 pl-9 text-xs rounded-lg w-full"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="h-11 text-xs rounded-lg min-w-36">
                  <SelectValue placeholder="Setor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Setores</SelectItem>
                  {departments.map((d: StoreDepartmentItemDTO) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 text-xs rounded-lg min-w-32">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
                  <SelectItem value="active" className="text-xs">Ativos</SelectItem>
                  <SelectItem value="vacation" className="text-xs">Em Férias</SelectItem>
                  <SelectItem value="on_leave" className="text-xs">Afastados</SelectItem>
                  <SelectItem value="terminated" className="text-xs">Desligados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRegime} onValueChange={setFilterRegime}>
                <SelectTrigger className="h-11 text-xs rounded-lg min-w-32">
                  <SelectValue placeholder="Regime..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os Regimes</SelectItem>
                  <SelectItem value="clt" className="text-xs">CLT</SelectItem>
                  <SelectItem value="pj" className="text-xs">PJ / MEI</SelectItem>
                  <SelectItem value="partner" className="text-xs">Salão Parceiro</SelectItem>
                  <SelectItem value="internship" className="text-xs">Estágio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Colaboradores */}
          {filteredEmployees.length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
              <div className="overflow-x-auto scroll-area-carousel no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-3xs font-bold">
                    <tr>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Cargo & Setor</th>
                      <th className="py-3 px-4">Regime</th>
                      <th className="py-3 px-4">Salário Base</th>
                      <th className="py-3 px-4">Admissão</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredEmployees.map((emp: StoreEmployeeDTO) => {
                      const meta = (emp.metadata || {}) as Record<string, any>;
                      const deptName =
                        meta.departmentName ||
                        departments.find((d: StoreDepartmentItemDTO) => d.id === meta.departmentId)?.name ||
                        "Geral";

                      return (
                        <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className="font-bold text-xs text-foreground block">
                                {emp.full_name}
                              </span>
                              <span className="text-3xs text-muted-foreground font-mono">
                                {emp.cpf_masked || emp.email || "Sem documento"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className="font-semibold text-xs text-foreground block">
                                {emp.job_title}
                              </span>
                              <span className="text-3xs text-muted-foreground">
                                {deptName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-3xs font-mono uppercase font-semibold">
                              {emp.employment_type}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 font-mono font-semibold text-foreground">
                            {formatMoney(emp.base_salary_cents || 0)}
                          </td>

                          <td className="py-3 px-4 text-muted-foreground font-mono">
                            {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("pt-BR") : "—"}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              className={cn(
                                "text-3xs font-bold border-transparent px-2 py-1",
                                (emp.status || "active") === "active"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                  : emp.status === "vacation"
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-warning/10 text-warning-strong"
                              )}
                            >
                              {(emp.status || "active") === "active" ? "Ativo" : emp.status === "vacation" ? "Férias" : "Afastado"}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(emp)}
                              className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-3 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            >
                              <Edit3 className="size-3.5 text-primary" />
                              <span>Ficha 360°</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
              <Users className="size-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                Nenhum colaborador encontrado com os filtros selecionados.
              </p>
              <p className="text-2xs text-muted-foreground">
                Tente ajustar os termos de busca ou clique em &quot;Admitir Colaborador&quot; para cadastrar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: SETORES & DEPARTAMENTOS */}
      {activeTab === "setores" && (
        <DepartmentManagerPanel
          departments={departments}
          onRefresh={() => {
            void refetchDepartments();
          }}
          storeId={loaderData.store?.id}
        />
      )}

      {/* Modal Ficha 360° do Colaborador */}
      <EmployeeFullProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        employee={selectedEmployee}
        departments={departments}
        onSaved={handleRefreshAll}
      />
    </div>
  );
}
