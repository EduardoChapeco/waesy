import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { EmptyState } from "@/components/state/states";
import {
  listEmployeesBalance,
  registerFinancialEvent,
  getEmployeeFinancialStatement,
  listStoreEmployees,
  upsertStoreEmployee,
  closePayrollAndPostToPayables,
  batchUpdateDepartmentBenefits,
  type StoreEmployeeDTO,
} from "@/services/hr.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  calculatePayroll,
  calculateTerminationSeverance,
  calculateVacationPay,
  type PayrollCalculationResult,
} from "@/lib/payroll-calculator";
import { OfficialPayslipModal, type OfficialPayslipData } from "@/components/hr/official-payslip-modal";
import { EmployeeDossierModal } from "@/components/hr/employee-dossier-modal";
import { PayrollKanbanBoard, type KanbanPayrollItem, type KanbanPayrollStage } from "@/components/hr/payroll-kanban-board";
import { MedicalCertificateModal } from "@/components/hr/medical-certificate-modal";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  Loader2,
  Plus,
  Calculator,
  Printer,
  AlertCircle,
  Building2,
  ShieldCheck,
  UserPlus,
  Edit3,
  SlidersHorizontal,
  Layers,
  Calendar,
  FolderLock,
  Kanban,
  Stethoscope,
} from "lucide-react";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/funcionarios")({
  head: () => ({ meta: [{ title: "Folha de Pagamento & RH | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [balances, employees, storeRes] = await Promise.all([
        listEmployeesBalance().catch(() => []),
        listStoreEmployees().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return {
        balances: Array.isArray(balances) ? balances : [],
        employees: Array.isArray(employees) ? employees : [],
        store: (storeRes as any)?.store || storeRes || null,
      };
    } catch (err) {
      console.error("[loader:workspace.financeiro.funcionarios] Unhandled loader error:", err);
      return { balances: [], employees: [], store: null };
    }
  },
  component: HrFinancePage,
});

interface EditablePayrollRow {
  employeeId: string;
  name: string;
  role: string;
  employmentType: "clt" | "pj" | "internship" | "apprentice" | "temporary" | "freelancer";
  baseSalaryCents: number;
  daysWorked: number;
  hoursOvertime50: number;
  hoursOvertime100: number;
  absentDays: number;
  bonusCents: number;
  advancesCents: number;
  transportVoucherCostCents: number;
  mealVoucherCopayCents: number;
  healthPlanCopayCents: number;
  otherDeductionsCents: number;
  dependentsCount: number;
}

function HrFinancePage() {
  const loaderData = (Route.useLoaderData() as { balances: any[]; employees: StoreEmployeeDTO[]; store: any }) || {
    balances: [],
    employees: [],
    store: null,
  };
  const { balances: staffBalances, employees: storeEmployees, store } = loaderData;
  const router = useRouter();

  // Aba ativa: Folha Mensal, Dossiês de Colaboradores ou Simulador CLT
  const [activeTab, setActiveTab] = useState<"folha" | "colaboradores" | "simulador">("folha");

  // Competência selecionada (ex: 2026-11)
  const currentMonthPeriod = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthPeriod);

  // Modo de visualização da Folha: "spreadsheet" vs "kanban" vs "cards"
  const [payrollViewMode, setPayrollViewMode] = useState<"spreadsheet" | "kanban" | "cards">("spreadsheet");

  // Modal de Atestado Médico
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");

  // Estado da Grade Editável da Competência
  const [payrollGrid, setPayrollGrid] = useState<Record<string, EditablePayrollRow>>(() => {
    const initial: Record<string, EditablePayrollRow> = {};
    storeEmployees.forEach((emp) => {
      const balanceObj = staffBalances.find((b) => b.id === emp.id || b.id === emp.profile_id);
      const advancesFromBalance = balanceObj?.balanceCents && balanceObj.balanceCents < 0
        ? Math.abs(balanceObj.balanceCents)
        : 0;

      initial[emp.id] = {
        employeeId: emp.id,
        name: emp.full_name,
        role: emp.job_title,
        employmentType: emp.employment_type || "clt",
        baseSalaryCents: emp.base_salary_cents || 0,
        daysWorked: 30,
        hoursOvertime50: 0,
        hoursOvertime100: 0,
        absentDays: 0,
        bonusCents: 0,
        advancesCents: advancesFromBalance,
        transportVoucherCostCents: emp.metadata?.transportVoucherCostCents || 0,
        mealVoucherCopayCents: emp.metadata?.mealVoucherCopayCents || 0,
        healthPlanCopayCents: emp.metadata?.healthPlanCopayCents || 0,
        otherDeductionsCents: 0,
        dependentsCount: emp.metadata?.dependentsCount || 0,
      };
    });
    return initial;
  });

  // Atualizador cirúrgico de célula da planilha
  const updateGridField = (empId: string, field: keyof EditablePayrollRow, value: any) => {
    setPayrollGrid((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      },
    }));
  };

  // Motor Contábil em Tempo Real (Cálculo reativo de cada linha da Folha)
  const calculatedPayrollResults = useMemo(() => {
    const map: Record<string, PayrollCalculationResult> = {};
    Object.values(payrollGrid).forEach((row) => {
      map[row.employeeId] = calculatePayroll({
        baseSalaryCents: row.baseSalaryCents,
        employmentType: row.employmentType,
        hoursOvertime50: row.hoursOvertime50,
        hoursOvertime100: row.hoursOvertime100,
        absentDays: row.absentDays,
        bonusCents: row.bonusCents,
        advancesCents: row.advancesCents,
        transportVoucherCostCents: row.transportVoucherCostCents,
        mealVoucherCopayCents: row.mealVoucherCopayCents,
        healthPlanCopayCents: row.healthPlanCopayCents,
        otherDeductionsCents: row.otherDeductionsCents,
        dependentsCount: row.dependentsCount,
      });
    });
    return map;
  }, [payrollGrid]);

  // Estágio no Kanban por Colaborador
  const [employeeStages, setEmployeeStages] = useState<Record<string, KanbanPayrollStage>>(() => {
    const map: Record<string, KanbanPayrollStage> = {};
    storeEmployees.forEach((emp) => {
      map[emp.id] = "apuracao";
    });
    return map;
  });

  const handleAdvanceStage = (empId: string, next: KanbanPayrollStage) => {
    setEmployeeStages((prev) => ({
      ...prev,
      [empId]: next,
    }));
    toast.success("Etapa da folha atualizada!");
  };

  // Itens para o Kanban
  const kanbanItems = useMemo<KanbanPayrollItem[]>(() => {
    return Object.values(payrollGrid).map((row) => {
      const calc = calculatedPayrollResults[row.employeeId];
      return {
        employeeId: row.employeeId,
        name: row.name,
        role: row.role,
        employmentType: row.employmentType,
        baseSalaryCents: row.baseSalaryCents,
        netSalaryCents: calc?.netSalaryCents ?? 0,
        stage: employeeStages[row.employeeId] || "apuracao",
        hasPayslip: true,
      };
    });
  }, [payrollGrid, calculatedPayrollResults, employeeStages]);

  // KPIs da Folha Consolidada
  const kpis = useMemo(() => {
    let totalToPayCents = 0;
    let totalGrossCents = 0;
    let totalEncargosCents = 0;
    let totalAdvancesCents = 0;

    Object.values(calculatedPayrollResults).forEach((res) => {
      totalToPayCents += res.netSalaryCents;
      totalGrossCents += res.grossSalaryCents;
      totalEncargosCents += res.inssDiscountCents + res.fgtsProvisionCents;
      totalAdvancesCents += res.advancesDiscountCents;
    });

    return {
      totalToPayCents,
      totalGrossCents,
      totalEncargosCents,
      totalAdvancesCents,
      staffCount: storeEmployees.length,
    };
  }, [calculatedPayrollResults, storeEmployees]);

  // Modal de Holerite Oficial
  const [selectedPayslipData, setSelectedPayslipData] = useState<OfficialPayslipData | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const handleOpenOfficialPayslip = (empId: string) => {
    const row = payrollGrid[empId];
    const calc = calculatedPayrollResults[empId];
    const emp = storeEmployees.find((e) => e.id === empId);
    if (!row || !calc) return;

    const payslip: OfficialPayslipData = {
      companyName: store?.name || "Empresa Cadastrada",
      companyCnpj: store?.cnpj || undefined,
      companyAddress: store?.city ? `${store.city} / ${store.state || "SC"}` : undefined,
      employeeName: row.name,
      employeeCpfMasked: emp?.cpf_masked || undefined,
      employeeRole: row.role,
      employeeCbo: emp?.metadata?.cboCode || undefined,
      employeeDepartment: emp?.metadata?.departmentName || "Operações",
      employeeHireDate: emp?.hire_date || undefined,
      referencePeriod: selectedPeriod,
      paymentDate: new Date().toLocaleDateString("pt-BR"),
      baseSalaryCents: calc.baseSalaryCents,
      grossSalaryCents: calc.grossSalaryCents,
      netSalaryCents: calc.netSalaryCents,
      inssDiscountCents: calc.inssDiscountCents,
      irrfDiscountCents: calc.irrfDiscountCents,
      fgtsProvisionCents: calc.fgtsProvisionCents,
      salaryBreakdown: calc.salaryBreakdown,
      bases: calc.bases,
      status: "issued",
    };

    setSelectedPayslipData(payslip);
    setIsPayslipOpen(true);
  };

  // Fechar Competência e Lançar no Financeiro (Bilateralidade Reta)
  const [isClosingPayroll, setIsClosingPayroll] = useState(false);
  const handleClosePayroll = async () => {
    if (storeEmployees.length === 0) {
      toast.info("Nenhum colaborador na empresa para processar a folha.");
      return;
    }

    setIsClosingPayroll(true);
    try {
      const payslipsPayload = Object.values(payrollGrid).map((row) => {
        const calc = calculatedPayrollResults[row.employeeId];
        return {
          employeeId: row.employeeId,
          grossSalaryCents: calc.grossSalaryCents,
          netSalaryCents: calc.netSalaryCents,
          inssDiscountCents: calc.inssDiscountCents,
          irrfDiscountCents: calc.irrfDiscountCents,
          fgtsProvisionCents: calc.fgtsProvisionCents,
          transportVoucherDiscountCents: calc.transportVoucherDiscountCents,
          mealVoucherDiscountCents: calc.mealVoucherDiscountCents,
          otherDiscountsCents: calc.otherDiscountsCents,
          bonusAdditionsCents: calc.bonusAdditionsCents,
          overtimePayCents: calc.totalOvertimeCents,
          salaryBreakdown: calc.salaryBreakdown,
        };
      });

      await closePayrollAndPostToPayables({
        data: {
          referencePeriod: selectedPeriod,
          paymentDate: new Date().toISOString().split("T")[0],
          payslips: payslipsPayload,
        },
      });

      playCashRegisterSound();
      toast.success(
        `Competência ${selectedPeriod} fechada com sucesso! Lançamento de ${formatMoney(
          kpis.totalToPayCents,
        )} criado em Contas a Pagar do Financeiro.`,
      );
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao fechar competência de folha.");
    } finally {
      setIsClosingPayroll(false);
    }
  };

  // Modal / Gaveta de Cadastro e Edição de Colaborador
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    fullName: "",
    jobTitle: "",
    employmentType: "clt" as any,
    baseSalaryReais: "",
    cpfMasked: "",
    email: "",
    phone: "",
    hireDate: "",
    departmentName: "",
    cboCode: "",
    pisPasep: "",
    dependentsCount: 0,
    transportVoucherCostReais: "",
    mealVoucherCopayReais: "",
    healthPlanCopayReais: "",
    asoValidUntil: "",
  });
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Dossiê Digital, ASO & Benefícios em Lote
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<StoreEmployeeDTO | null>(null);
  const [isBatchBenefitsOpen, setIsBatchBenefitsOpen] = useState(false);
  const [batchDeptForm, setBatchDeptForm] = useState({
    departmentName: "Operações",
    transportVoucherCostReais: "",
    mealVoucherCopayReais: "",
    healthPlanCopayReais: "",
    baseSalaryIncreasePercent: "",
  });
  const [isSavingBatchDept, setIsSavingBatchDept] = useState(false);

  const handleBatchDeptSubmit = async () => {
    setIsSavingBatchDept(true);
    try {
      const vtCents = batchDeptForm.transportVoucherCostReais
        ? Math.round(parseFloat(batchDeptForm.transportVoucherCostReais.replace(",", ".")) * 100)
        : undefined;
      const vrCents = batchDeptForm.mealVoucherCopayReais
        ? Math.round(parseFloat(batchDeptForm.mealVoucherCopayReais.replace(",", ".")) * 100)
        : undefined;
      const healthCents = batchDeptForm.healthPlanCopayReais
        ? Math.round(parseFloat(batchDeptForm.healthPlanCopayReais.replace(",", ".")) * 100)
        : undefined;
      const percent = batchDeptForm.baseSalaryIncreasePercent
        ? parseFloat(batchDeptForm.baseSalaryIncreasePercent.replace(",", "."))
        : undefined;

      const res = await batchUpdateDepartmentBenefits({
        data: {
          departmentName: batchDeptForm.departmentName,
          benefits: {
            vtEnabled: vtCents !== undefined && vtCents > 0,
            vtMonthlyCents: vtCents,
            vrEnabled: vrCents !== undefined && vrCents > 0,
            vrDailyCents: vrCents,
            healthPlanEnabled: healthCents !== undefined && healthCents > 0,
            healthPlanCents: healthCents,
          },
          salaryAdjustmentPercent: percent,
        },
      });

      toast.success(`Benefícios atualizados para ${res.updatedCount} colaboradores do setor ${batchDeptForm.departmentName}!`);
      setIsBatchBenefitsOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar benefícios do setor.");
    } finally {
      setIsSavingBatchDept(false);
    }
  };

  const getAsoStatusBadge = (asoValidUntil?: string) => {
    if (!asoValidUntil) {
      return (
        <Badge variant="outline" className="text-3xs font-semibold text-rose-600 border-rose-500/30 bg-rose-500/10">
          ASO Pendente
        </Badge>
      );
    }
    const today = new Date();
    const validDate = new Date(asoValidUntil);
    const diffDays = Math.ceil((validDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <Badge variant="outline" className="text-3xs font-bold text-rose-600 border-rose-500/40 bg-rose-500/10">
          ASO Vencido
        </Badge>
      );
    }
    if (diffDays <= 30) {
      return (
        <Badge variant="outline" className="text-3xs font-bold text-warning-strong border-warning/40 bg-warning/10">
          ASO Vence em {diffDays}d
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-3xs font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
        ASO Válido ({diffDays}d)
      </Badge>
    );
  };

  const handleOpenNewEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeFormData({
      fullName: "",
      jobTitle: "",
      employmentType: "clt",
      baseSalaryReais: "",
      cpfMasked: "",
      email: "",
      phone: "",
      hireDate: new Date().toISOString().split("T")[0],
      departmentName: "Operações",
      cboCode: "",
      pisPasep: "",
      dependentsCount: 0,
      transportVoucherCostReais: "",
      mealVoucherCopayReais: "",
      healthPlanCopayReais: "",
      asoValidUntil: "",
    });
    setIsEmployeeDrawerOpen(true);
  };

  const handleOpenEditEmployee = (emp: StoreEmployeeDTO) => {
    setEditingEmployeeId(emp.id);
    setEmployeeFormData({
      fullName: emp.full_name,
      jobTitle: emp.job_title,
      employmentType: emp.employment_type,
      baseSalaryReais: (emp.base_salary_cents / 100).toFixed(2),
      cpfMasked: emp.cpf_masked || "",
      email: emp.email || "",
      phone: emp.phone || "",
      hireDate: emp.hire_date || "",
      departmentName: emp.metadata?.departmentName || "Operações",
      cboCode: emp.metadata?.cboCode || "",
      pisPasep: emp.metadata?.pisPasep || "",
      dependentsCount: emp.metadata?.dependentsCount || 0,
      transportVoucherCostReais: emp.metadata?.transportVoucherCostCents
        ? (emp.metadata.transportVoucherCostCents / 100).toFixed(2)
        : "",
      mealVoucherCopayReais: emp.metadata?.mealVoucherCopayCents
        ? (emp.metadata.mealVoucherCopayCents / 100).toFixed(2)
        : "",
      healthPlanCopayReais: emp.metadata?.healthPlanCopayCents
        ? (emp.metadata.healthPlanCopayCents / 100).toFixed(2)
        : "",
      asoValidUntil: emp.metadata?.asoValidUntil || "",
    });
    setIsEmployeeDrawerOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!employeeFormData.fullName.trim()) {
      toast.error("Insira o nome completo do colaborador.");
      return;
    }
    if (!employeeFormData.jobTitle.trim()) {
      toast.error("Insira o cargo / função do colaborador.");
      return;
    }

    const salaryCents = Math.round(parseFloat(employeeFormData.baseSalaryReais.replace(",", ".")) * 100) || 0;
    const vtCents = Math.round(parseFloat(employeeFormData.transportVoucherCostReais.replace(",", ".")) * 100) || 0;
    const vrCents = Math.round(parseFloat(employeeFormData.mealVoucherCopayReais.replace(",", ".")) * 100) || 0;
    const healthCents = Math.round(parseFloat(employeeFormData.healthPlanCopayReais.replace(",", ".")) * 100) || 0;

    setIsSavingEmployee(true);
    try {
      await upsertStoreEmployee({
        data: {
          id: editingEmployeeId || undefined,
          fullName: employeeFormData.fullName,
          jobTitle: employeeFormData.jobTitle,
          employmentType: employeeFormData.employmentType,
          baseSalaryCents: salaryCents,
          cpfMasked: employeeFormData.cpfMasked || undefined,
          email: employeeFormData.email || undefined,
          phone: employeeFormData.phone || undefined,
          hireDate: employeeFormData.hireDate || undefined,
          status: "active",
          metadata: {
            departmentName: employeeFormData.departmentName,
            cboCode: employeeFormData.cboCode,
            pisPasep: employeeFormData.pisPasep,
            dependentsCount: employeeFormData.dependentsCount,
            transportVoucherCostCents: vtCents,
            mealVoucherCopayCents: vrCents,
            healthPlanCopayCents: healthCents,
            asoValidUntil: employeeFormData.asoValidUntil,
          },
        },
      });

      toast.success(editingEmployeeId ? "Ficha do colaborador atualizada!" : "Novo colaborador cadastrado com sucesso!");
      setIsEmployeeDrawerOpen(false);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar colaborador.");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Modal de Lançamento Manual (Vales/Bônus individuais)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [manualFormData, setManualFormData] = useState({
    amount: "",
    type: "advance" as "advance" | "adjustment" | "commission" | "salary",
    description: "",
  });
  const [loadingManual, setLoadingManual] = useState(false);

  // Gaveta de Extrato Detalhado do Colaborador
  const [statementEmpId, setStatementEmpId] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const handleOpenStatement = async (employeeId: string) => {
    setStatementEmpId(employeeId);
    setLoadingStatement(true);
    try {
      const res = await getEmployeeFinancialStatement({ data: { employeeId } });
      setStatementData(res);
    } catch {
      toast.error("Erro ao carregar extrato do colaborador.");
      setStatementEmpId(null);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleOpenManualModal = (emp: any) => {
    setSelectedEmp(emp);
    setManualFormData({ amount: "", type: "advance", description: "" });
    setModalOpen(true);
  };

  const handleSubmitManual = async () => {
    const amountCents = Math.round(parseFloat(manualFormData.amount.replace(",", ".")) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Insira um valor válido maior que zero.");
      return;
    }
    if (manualFormData.description.length < 3) {
      toast.error("Insira uma descrição válida com pelo menos 3 caracteres.");
      return;
    }

    setLoadingManual(true);
    try {
      await registerFinancialEvent({
        data: {
          employeeId: selectedEmp.id || selectedEmp.profile_id,
          amountCents,
          type: manualFormData.type,
          description: manualFormData.description,
        },
      });

      if (manualFormData.type === "adjustment" || manualFormData.type === "commission" || manualFormData.type === "salary") {
        playCashRegisterSound();
        toast.success(`Crédito de ${formatMoney(amountCents)} lançado com sucesso!`);
      } else {
        playWarningAlert();
        toast.info(`Vale/Adiantamento de ${formatMoney(amountCents)} registrado com sucesso!`);
      }

      setModalOpen(false);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao registrar evento financeiro");
    } finally {
      setLoadingManual(false);
    }
  };

  // Simulador CLT (Rescisão & Férias)
  const [simEmployeeId, setSimEmployeeId] = useState<string>(storeEmployees[0]?.id || "");
  const [simType, setSimType] = useState<"rescisao" | "ferias">("rescisao");
  const [rescisaoForm, setRescisaoForm] = useState({
    terminationDate: new Date().toISOString().split("T")[0],
    terminationReason: "unjustified_dismissal" as any,
    noticeType: "indemnified" as any,
    fgtsBalanceReais: "5000.00",
  });
  const [feriasForm, setFeriasForm] = useState({
    vacationDays: 30,
    sellPecuniaryAllowanceDays: 0,
    advanceThirteenth: false,
  });

  const selectedSimEmployee = storeEmployees.find((e) => e.id === simEmployeeId) || storeEmployees[0];

  const severanceResult = useMemo(() => {
    if (!selectedSimEmployee) return null;
    const fgtsCents = Math.round(parseFloat(rescisaoForm.fgtsBalanceReais.replace(",", ".")) * 100) || 0;
    return calculateTerminationSeverance({
      baseSalaryCents: selectedSimEmployee.base_salary_cents,
      hireDate: selectedSimEmployee.hire_date,
      terminationDate: rescisaoForm.terminationDate,
      terminationReason: rescisaoForm.terminationReason,
      noticeType: rescisaoForm.noticeType,
      fgtsBalanceCents: fgtsCents,
    });
  }, [selectedSimEmployee, rescisaoForm]);

  const vacationResult = useMemo(() => {
    if (!selectedSimEmployee) return null;
    return calculateVacationPay({
      baseSalaryCents: selectedSimEmployee.base_salary_cents,
      vacationDays: feriasForm.vacationDays,
      sellPecuniaryAllowanceDays: feriasForm.sellPecuniaryAllowanceDays,
      advanceThirteenth: feriasForm.advanceThirteenth,
    });
  }, [selectedSimEmployee, feriasForm]);

  // Exportar CSV
  const handleExportCsv = () => {
    const rows = Object.values(payrollGrid).map((row) => {
      const calc = calculatedPayrollResults[row.employeeId];
      return [
        row.employeeId,
        `"${row.name}"`,
        row.role,
        row.employmentType.toUpperCase(),
        (row.baseSalaryCents / 100).toFixed(2),
        row.hoursOvertime50,
        (calc.overtime50Cents / 100).toFixed(2),
        (calc.inssDiscountCents / 100).toFixed(2),
        (calc.irrfDiscountCents / 100).toFixed(2),
        (calc.fgtsProvisionCents / 100).toFixed(2),
        (calc.netSalaryCents / 100).toFixed(2),
      ].join(";");
    });

    const headers = [
      "ID",
      "Colaborador",
      "Cargo",
      "Regime",
      "Salario_Base",
      "Horas_50",
      "HE_50_Reais",
      "INSS_Reais",
      "IRRF_Reais",
      "FGTS_8_Reais",
      "Liquido_Reais",
    ];
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `folha_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Folha contábil exportada em CSV com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
        eyebrow="RH & Departamento Pessoal"
        title="Folha de Pagamento"
        description="Gestão contábil oficial CLT e PJ, apuração progressiva de INSS/IRRF 2026, emissão de holerites em PDF, espelhos de ponto e integração automática com Contas a Pagar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleOpenNewEmployee}
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer"
            >
              <UserPlus className="size-3.5 text-primary" />
              <span>+ Novo Colaborador</span>
            </Button>

            <Button
              type="button"
              onClick={() => setIsMedicalModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Stethoscope className="size-3.5 text-primary" />
              <span>+ Atestado Médico</span>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer border-border"
            >
              <Link to="/workspace/rh/ponto">
                <Clock className="size-3.5 text-primary" />
                <span>Ponto Eletrônico</span>
              </Link>
            </Button>

            <Button
              type="button"
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>

            <Button
              type="button"
              onClick={handleClosePayroll}
              disabled={isClosingPayroll}
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer bg-primary text-primary-foreground shadow-2xs"
            >
              {isClosingPayroll ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Fechando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-3.5" />
                  <span>Fechar Competência & Lançar no Financeiro</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* ── BARRA DE SELEÇÃO DE COMPETÊNCIA & ABAS SOBERANAS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-3 rounded-lg border border-border">
        {/* Seletor de Competência */}
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Competência:</span>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-9 w-40 rounded-lg text-xs font-mono font-bold bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="2026-11">11/2026 (Novembro)</SelectItem>
              <SelectItem value="2026-10">10/2026 (Outubro)</SelectItem>
              <SelectItem value="2026-09">09/2026 (Setembro)</SelectItem>
              <SelectItem value="2026-08">08/2026 (Agosto)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 overflow-x-auto scroll-area">
          <button
            type="button"
            onClick={() => setActiveTab("folha")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "folha"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Folha Mensal & Edição Rápida
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("colaboradores")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "colaboradores"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Dossiês & Fichas ({storeEmployees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulador")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "simulador"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            Simulador CLT (Rescisão & Férias)
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DA ABA 1: FOLHA MENSAL & EDIÇÃO RÁPIDA ── */}
      {activeTab === "folha" && (
        <div className="space-y-6">
          {/* KPIS CONSOLIDADOS DE FOLHA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Wallet className="size-3.5 text-primary" />
                Total Líquido a Pagar
              </span>
              <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(kpis.totalToPayCents)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Valor líquido transferido aos colaboradores
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="size-3.5 text-foreground" />
                Total Bruto de Proventos
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatMoney(kpis.totalGrossCents)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Salários base + Horas extras + Bônus
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-blue-600" />
                Total Encargos (INSS + FGTS)
              </span>
              <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatMoney(kpis.totalEncargosCents)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Guias previdenciárias e depósito FGTS 8%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ArrowDownRight className="size-3.5 text-rose-600" />
                Vales & Adiantamentos (-)
              </span>
              <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
                -{formatMoney(kpis.totalAdvancesCents)}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Descontos de adiantamentos salariais
              </p>
            </div>
          </div>

          {/* BARRA DE CONTROLE & ALTERNADOR DE MODO PLANILHA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador ou cargo..."
                className="pl-10 h-10 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold">Modo de Visualização:</span>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setPayrollViewMode("spreadsheet")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    payrollViewMode === "spreadsheet"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="size-3.5" />
                    <span>Planilha Contábil</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollViewMode("kanban")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    payrollViewMode === "kanban"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <span className="flex items-center gap-2">
                    <Kanban className="size-3.5" />
                    <span>Kanban</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollViewMode("cards")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    payrollViewMode === "cards"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="size-3.5" />
                    <span>Cartões</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* VISÃO PLANILHA CONTÁBIL (EDIÇÃO RÁPIDA IN-PAGE ESTILO IFOOD/EXCEL) */}
          {payrollViewMode === "spreadsheet" ? (
            <div className="rounded-lg border border-border overflow-hidden bg-card shadow-2xs">
              <div className="overflow-x-auto scroll-area">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-3">Colaborador</th>
                      <th className="p-3 w-24">Regime</th>
                      <th className="p-3 w-32">Salário Base (R$)</th>
                      <th className="p-3 w-20 text-center">Dias</th>
                      <th className="p-3 w-24 text-center">HE 50% (h)</th>
                      <th className="p-3 w-24 text-center">HE 100% (h)</th>
                      <th className="p-3 w-20 text-center">Faltas (d)</th>
                      <th className="p-3 w-28 text-right">Vales (-)</th>
                      <th className="p-3 w-28 text-right">Bônus (+)</th>
                      <th className="p-3 w-24 text-right">INSS (auto)</th>
                      <th className="p-3 w-24 text-right">IRRF (auto)</th>
                      <th className="p-3 w-24 text-right">FGTS 8%</th>
                      <th className="p-3 w-32 text-right">Líquido a Pagar</th>
                      <th className="p-3 w-28 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.values(payrollGrid)
                      .filter((row) => {
                        if (!searchTerm) return true;
                        return (
                          row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.role.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                      })
                      .map((row) => {
                        const calc = calculatedPayrollResults[row.employeeId];
                        return (
                          <tr key={row.employeeId} className="hover:bg-muted/20 transition-colors">
                            {/* Colaborador */}
                            <td className="p-3">
                              <p className="font-bold text-foreground">{row.name}</p>
                              <span className="text-xs text-muted-foreground">{row.role}</span>
                            </td>

                            {/* Regime */}
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs font-bold uppercase">
                                {row.employmentType}
                              </Badge>
                            </td>

                            {/* Salário Base (Editável Inline) */}
                            <td className="p-3">
                              <Input
                                type="number"
                                step="10"
                                value={(row.baseSalaryCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const valCents = Math.round(parseFloat(e.target.value || "0") * 100);
                                  updateGridField(row.employeeId, "baseSalaryCents", valCents);
                                }}
                                className="h-8 w-28 text-xs font-mono font-bold bg-background text-right"
                              />
                            </td>

                            {/* Dias Trabalhados */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="31"
                                value={row.daysWorked}
                                onChange={(e) => updateGridField(row.employeeId, "daysWorked", Number(e.target.value))}
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
                              />
                            </td>

                            {/* HE 50% */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={row.hoursOvertime50}
                                onChange={(e) =>
                                  updateGridField(row.employeeId, "hoursOvertime50", Number(e.target.value))
                                }
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
                              />
                            </td>

                            {/* HE 100% */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={row.hoursOvertime100}
                                onChange={(e) =>
                                  updateGridField(row.employeeId, "hoursOvertime100", Number(e.target.value))
                                }
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
                              />
                            </td>

                            {/* Faltas */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={row.absentDays}
                                onChange={(e) => updateGridField(row.employeeId, "absentDays", Number(e.target.value))}
                                className="h-8 w-14 text-xs font-mono text-center mx-auto bg-background text-rose-600"
                              />
                            </td>

                            {/* Vales (-) */}
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                step="10"
                                value={(row.advancesCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const valCents = Math.round(parseFloat(e.target.value || "0") * 100);
                                  updateGridField(row.employeeId, "advancesCents", valCents);
                                }}
                                className="h-8 w-24 text-xs font-mono text-right ml-auto bg-background text-rose-600"
                              />
                            </td>

                            {/* Bônus (+) */}
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                step="10"
                                value={(row.bonusCents / 100).toFixed(2)}
                                onChange={(e) => {
                                  const valCents = Math.round(parseFloat(e.target.value || "0") * 100);
                                  updateGridField(row.employeeId, "bonusCents", valCents);
                                }}
                                className="h-8 w-24 text-xs font-mono text-right ml-auto bg-background text-emerald-600"
                              />
                            </td>

                            {/* INSS (auto) */}
                            <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                              {calc.inssDiscountCents > 0 ? `-${formatMoney(calc.inssDiscountCents)}` : "—"}
                            </td>

                            {/* IRRF (auto) */}
                            <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                              {calc.irrfDiscountCents > 0 ? `-${formatMoney(calc.irrfDiscountCents)}` : "—"}
                            </td>

                            {/* FGTS 8% (informativo) */}
                            <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">
                              {calc.fgtsProvisionCents > 0 ? formatMoney(calc.fgtsProvisionCents) : "—"}
                            </td>

                            {/* Líquido Final a Pagar */}
                            <td className="p-3 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatMoney(calc.netSalaryCents)}
                            </td>

                            {/* Ações */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenOfficialPayslip(row.employeeId)}
                                  className="h-9 min-h-11 sm:min-h-0 px-2 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                                  title="Visualizar e Imprimir Holerite Oficial"
                                >
                                  <FileText className="size-3 text-primary" />
                                  <span>Holerite</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : payrollViewMode === "kanban" ? (
            <PayrollKanbanBoard
              items={kanbanItems}
              calculations={calculatedPayrollResults}
              onAdvanceStage={handleAdvanceStage}
              onOpenPayslip={handleOpenOfficialPayslip}
            />
          ) : (
            /* VISÃO CARTÕES & EXTRATO DETALHADO */
            <div className="grid grid-cols-1 gap-3">
              {Object.values(payrollGrid).map((row) => {
                const calc = calculatedPayrollResults[row.employeeId];
                return (
                  <div
                    key={row.employeeId}
                    className="bg-card rounded-lg border border-border p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0 border border-primary/20">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{row.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-bold capitalize">
                            {row.role}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-mono uppercase">
                            {row.employmentType}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Base: {formatMoney(row.baseSalaryCents)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border/40">
                      <div className="text-left md:text-right">
                        <p className="text-xs uppercase font-bold text-muted-foreground">Líquido a Pagar</p>
                        <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(calc.netSalaryCents)}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          INSS: {formatMoney(calc.inssDiscountCents)} | FGTS: {formatMoney(calc.fgtsProvisionCents)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatement(row.employeeId)}
                          className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Clock className="size-3.5" />
                          <span>Extrato</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const emp = storeEmployees.find((e) => e.id === row.employeeId);
                            if (emp) setSelectedDossierEmployee(emp);
                          }}
                          className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <FolderLock className="size-3.5 text-primary" />
                          <span>Prontuário</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOfficialPayslip(row.employeeId)}
                          className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-1 text-primary cursor-pointer border-primary/30"
                        >
                          <FileText className="size-3.5" />
                          <span>Holerite</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenManualModal(row)}
                          className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer shadow-2xs"
                        >
                          <Plus className="size-3.5" />
                          <span>Lançar Vale / Bônus</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 2: DOSSIÊS & CADASTRO DE COLABORADORES ── */}
      {activeTab === "colaboradores" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Equipe Cadastrada & Fichas de DP ({storeEmployees.length})
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBatchBenefitsOpen(true)}
                size="sm"
                className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer border-primary/30 text-primary"
              >
                <Building2 className="size-3.5" />
                <span>Atribuir Benefício ao Setor</span>
              </Button>
              <Button
                type="button"
                onClick={handleOpenNewEmployee}
                size="sm"
                className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer bg-primary text-primary-foreground"
              >
                <UserPlus className="size-3.5" />
                <span>Admitir Novo Colaborador</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeEmployees.map((emp) => (
              <div
                key={emp.id}
                className="bg-card rounded-lg border border-border p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{emp.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold uppercase">
                    {emp.employment_type}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border/60 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Salário Base:</span>
                    <span className="font-bold text-foreground">{formatMoney(emp.base_salary_cents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Admissão:</span>
                    <span className="text-foreground">{emp.hire_date || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Setor:</span>
                    <span className="text-foreground">{emp.metadata?.departmentName || "Operações"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-sans">Exame Médico ASO:</span>
                    {getAsoStatusBadge(emp.metadata?.asoValidUntil)}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDossierEmployee(emp)}
                    className="h-9 min-h-11 sm:min-h-0 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer text-primary border-primary/30"
                  >
                    <FolderLock className="size-3" />
                    <span>Prontuário & ASO</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditEmployee(emp)}
                    className="h-9 min-h-11 sm:min-h-0 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                  >
                    <Edit3 className="size-3" />
                    <span>Editar Ficha</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 3: SIMULADOR CLT (RESCISÃO & FÉRIAS) ── */}
      {activeTab === "simulador" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calculator className="size-5 text-primary" />
                  <span>Simulador Contábil CLT (Legislação MTE 2026)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Calcule rescisões trabalhistas (Lei 12.506/11) ou recibos de férias com abono pecuniário e 1/3 constitucional.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSimType("rescisao")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    simType === "rescisao"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Rescisão Trabalhista
                </button>
                <button
                  type="button"
                  onClick={() => setSimType("ferias")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    simType === "ferias"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Férias & Abono
                </button>
              </div>
            </div>

            {/* Seleção do Colaborador para Simulação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Colaborador da Simulação</Label>
                <Select value={simEmployeeId} onValueChange={setSimEmployeeId}>
                  <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                    <SelectValue placeholder="Selecione o colaborador..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {storeEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name} ({e.job_title} - {formatMoney(e.base_salary_cents)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSimEmployee && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs font-mono space-y-1">
                  <span className="font-sans font-bold text-muted-foreground uppercase">Dados Contratuais:</span>
                  <p className="text-foreground">
                    Salário Base: {formatMoney(selectedSimEmployee.base_salary_cents)} | Admissão:{" "}
                    {selectedSimEmployee.hire_date}
                  </p>
                </div>
              )}
            </div>

            {/* SELEÇÃO: RESCISÃO */}
            {simType === "rescisao" && severanceResult && (
              <div className="space-y-6 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Data de Demissão / Rescisão</Label>
                    <Input
                      type="date"
                      value={rescisaoForm.terminationDate}
                      onChange={(e) => setRescisaoForm((p) => ({ ...p, terminationDate: e.target.value }))}
                      className="h-10 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Motivo do Desligamento</Label>
                    <Select
                      value={rescisaoForm.terminationReason}
                      onValueChange={(v: any) => setRescisaoForm((p) => ({ ...p, terminationReason: v }))}
                    >
                      <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="unjustified_dismissal">Demissão sem Justa Causa (Empregador)</SelectItem>
                        <SelectItem value="justified_dismissal">Demissão com Justa Causa</SelectItem>
                        <SelectItem value="employee_resignation">Pedido de Demissão (Colaborador)</SelectItem>
                        <SelectItem value="mutual_agreement">Acordo Mútuo (Art. 484-A CLT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Saldo FGTS para Multa (R$)</Label>
                    <Input
                      type="number"
                      step="100"
                      value={rescisaoForm.fgtsBalanceReais}
                      onChange={(e) => setRescisaoForm((p) => ({ ...p, fgtsBalanceReais: e.target.value }))}
                      className="h-10 rounded-lg text-xs font-mono bg-background"
                    />
                  </div>
                </div>

                {/* Demonstrativo Rescisório */}
                <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h4 className="font-bold text-sm text-foreground">
                      Demonstrativo de Verbas Rescisórias (TRCT)
                    </h4>
                    <Badge variant="outline" className="text-xs font-bold">
                      Aviso Prévio Lei 12.506/11: {severanceResult.noticeDays} dias
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Saldo de Salário:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.workedDaysPayCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Aviso Prévio Indenizado:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.noticePeriodPayCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">13º Salário Proporcional:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.thirteenthProportionalCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Férias Proporcionais:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.vacationProportionalCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">1/3 Const. de Férias:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.vacationConstitutionalThirdCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Multa Rescisória FGTS:</span>
                      <p className="font-bold text-foreground">{formatMoney(severanceResult.fgtsPenaltyCents)}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-primary">Total Bruto da Rescisão</span>
                    <span className="text-xl font-mono font-bold text-primary">
                      {formatMoney(severanceResult.totalSeveranceGrossCents)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SELEÇÃO: FÉRIAS */}
            {simType === "ferias" && vacationResult && (
              <div className="space-y-6 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Dias de Férias Gozadas</Label>
                    <Select
                      value={String(feriasForm.vacationDays)}
                      onValueChange={(v) => setFeriasForm((p) => ({ ...p, vacationDays: Number(v) }))}
                    >
                      <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="30">30 dias integrais</SelectItem>
                        <SelectItem value="20">20 dias (com venda de 10 dias)</SelectItem>
                        <SelectItem value="15">15 dias fracionados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Venda de Férias (Abono Pecuniário)</Label>
                    <Select
                      value={String(feriasForm.sellPecuniaryAllowanceDays)}
                      onValueChange={(v) => setFeriasForm((p) => ({ ...p, sellPecuniaryAllowanceDays: Number(v) }))}
                    >
                      <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="0">Sem abono (0 dias)</SelectItem>
                        <SelectItem value="10">Vender 10 dias (Abono Máximo CLT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Adiantar 1ª Parcela do 13º Salário</Label>
                    <Select
                      value={feriasForm.advanceThirteenth ? "yes" : "no"}
                      onValueChange={(v) => setFeriasForm((p) => ({ ...p, advanceThirteenth: v === "yes" }))}
                    >
                      <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="no">Não adiantar 13º</SelectItem>
                        <SelectItem value="yes">Sim, adiantar 50% do 13º</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recibo de Férias */}
                <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
                  <h4 className="font-bold text-sm text-foreground pb-2 border-b border-border/80">
                    Recibo de Férias com 1/3 Constitucional
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Férias Gozadas:</span>
                      <p className="font-bold text-foreground">{formatMoney(vacationResult.vacationPayCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">1/3 Constitucional:</span>
                      <p className="font-bold text-foreground">{formatMoney(vacationResult.constitutionalThirdCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">Abono Pecuniário (10d):</span>
                      <p className="font-bold text-foreground">{formatMoney(vacationResult.pecuniaryAllowancePayCents)}</p>
                    </div>
                    <div className="p-2 rounded bg-card border border-border">
                      <span className="font-sans text-muted-foreground">1/3 s/ Abono:</span>
                      <p className="font-bold text-foreground">{formatMoney(vacationResult.pecuniaryThirdCents)}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-primary">Total Bruto de Férias a Pagar</span>
                    <span className="text-xl font-mono font-bold text-primary">
                      {formatMoney(vacationResult.totalVacationGrossCents)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE HOLERITE OFICIAL (PDF & PRINT) ── */}
      <OfficialPayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        data={selectedPayslipData}
      />

      {/* ── GAVETA DE CADASTRO / EDIÇÃO DE COLABORADOR (DOSSIÊ RH/DP) ── */}
      <SheetPage
        open={isEmployeeDrawerOpen}
        onOpenChange={setIsEmployeeDrawerOpen}
        title={editingEmployeeId ? "Editar Ficha do Colaborador" : "Admitir Novo Colaborador (Ficha DP)"}
        description="Configure salário base, regime contratual, encargos, benefícios e exames ocupacionais."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEmployeeDrawerOpen(false)}
              disabled={isSavingEmployee}
              className="rounded-lg text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEmployee}
              disabled={isSavingEmployee}
              className="rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-2xs"
            >
              {isSavingEmployee ? "Salvando..." : "Salvar Ficha do Colaborador"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Nome Completo *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={employeeFormData.fullName}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, fullName: e.target.value }))}
                className="h-10 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Cargo / Função *</Label>
              <Input
                placeholder="Ex: Vendedor Sênior, Caixa, Gerente..."
                value={employeeFormData.jobTitle}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, jobTitle: e.target.value }))}
                className="h-10 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Regime Contratual</Label>
              <Select
                value={employeeFormData.employmentType}
                onValueChange={(v: any) => setEmployeeFormData((p) => ({ ...p, employmentType: v }))}
              >
                <SelectTrigger className="h-10 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="clt">CLT (Carteira Assinada)</SelectItem>
                  <SelectItem value="pj">PJ (Prestador de Serviço)</SelectItem>
                  <SelectItem value="internship">Estágio</SelectItem>
                  <SelectItem value="apprentice">Jovem Aprendiz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Salário Base Mensal (R$) *</Label>
              <Input
                type="number"
                step="10"
                placeholder="Ex: 2500.00"
                value={employeeFormData.baseSalaryReais}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, baseSalaryReais: e.target.value }))}
                className="h-10 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Data de Admissão</Label>
              <Input
                type="date"
                value={employeeFormData.hireDate}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, hireDate: e.target.value }))}
                className="h-10 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={employeeFormData.cpfMasked}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, cpfMasked: e.target.value }))}
                className="h-10 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">PIS / PASEP</Label>
              <Input
                placeholder="Ex: 120.34567.89-0"
                value={employeeFormData.pisPasep}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, pisPasep: e.target.value }))}
                className="h-10 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">CBO (Classificação Ocupação)</Label>
              <Input
                placeholder="Ex: 5211-10"
                value={employeeFormData.cboCode}
                onChange={(e) => setEmployeeFormData((p) => ({ ...p, cboCode: e.target.value }))}
                className="h-10 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Benefícios Padrão & Encargos (Descontos Automáticos na Folha)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Custo Vale Transporte (R$)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="Ex: 180.00 (limite 6% CLT)"
                  value={employeeFormData.transportVoucherCostReais}
                  onChange={(e) => setEmployeeFormData((p) => ({ ...p, transportVoucherCostReais: e.target.value }))}
                  className="h-10 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Copart. Vale Refeição/Alimentação (R$)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="Ex: 50.00"
                  value={employeeFormData.mealVoucherCopayReais}
                  onChange={(e) => setEmployeeFormData((p) => ({ ...p, mealVoucherCopayReais: e.target.value }))}
                  className="h-10 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Copart. Plano de Saúde (R$)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="Ex: 120.00"
                  value={employeeFormData.healthPlanCopayReais}
                  onChange={(e) => setEmployeeFormData((p) => ({ ...p, healthPlanCopayReais: e.target.value }))}
                  className="h-10 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Qtd. Dependentes para IRRF</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={employeeFormData.dependentsCount}
                  onChange={(e) => setEmployeeFormData((p) => ({ ...p, dependentsCount: Number(e.target.value) }))}
                  className="h-10 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Validade do Exame Médico (ASO)</Label>
                <Input
                  type="date"
                  value={employeeFormData.asoValidUntil}
                  onChange={(e) => setEmployeeFormData((p) => ({ ...p, asoValidUntil: e.target.value }))}
                  className="h-10 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetPage>

      {/* ── GAVETA DE EXTRATO DETALHADO DO COLABORADOR ── */}
      <SheetPage
        open={!!statementEmpId}
        onOpenChange={(open) => !open && setStatementEmpId(null)}
        title="Extrato Financeiro do Colaborador"
        size="lg"
      >
        {loadingStatement ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-primary" />
            <span className="text-xs font-mono">Carregando extrato completo...</span>
          </div>
        ) : statementData ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border border-border/60">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 border border-primary/20">
                {statementData.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">{statementData.employee.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-bold capitalize">
                    {statementData.employee.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{statementData.employee.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Créditos (+)</span>
                <div className="text-sm font-mono font-bold text-emerald-600">
                  +{formatMoney(statementData.summary.totalCreditsCents)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Vales / Débitos (-)</span>
                <div className="text-sm font-mono font-bold text-rose-600">
                  -{formatMoney(statementData.summary.totalDebitsCents)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Saldo Líquido</span>
                <div
                  className={`text-sm font-mono font-bold ${
                    statementData.summary.netBalanceCents > 0
                      ? "text-emerald-600"
                      : statementData.summary.netBalanceCents < 0
                      ? "text-rose-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatMoney(statementData.summary.netBalanceCents)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Histórico de Lançamentos ({statementData.records?.length || 0})
              </h5>

              <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                      <TableHead className="text-xs font-bold">Tipo</TableHead>
                      <TableHead className="text-xs font-bold">Descrição</TableHead>
                      <TableHead className="text-right text-xs font-bold font-mono">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statementData.records || []).map((r: any) => (
                      <TableRow key={r.id} className="border-border/40 text-xs">
                        <TableCell className="font-mono text-muted-foreground text-xs">
                          {formatDateTime(r.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${
                              r.amount_cents > 0
                                ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                                : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                            }`}
                          >
                            {r.type === "advance"
                              ? "Vale / Adiantamento"
                              : r.type === "commission"
                              ? "Comissão"
                              : r.type === "salary"
                              ? "Salário Base"
                              : "Ajuste / Bônus"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{r.description}</TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            r.amount_cents > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {r.amount_cents > 0 ? "+" : "-"}
                          {formatMoney(Math.abs(r.amount_cents))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(statementData.records || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                          Nenhum lançamento registrado para este colaborador.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </SheetPage>

      {/* ── MODAL DE NOVO LANÇAMENTO (VALE OU BÔNUS) ── */}
      <SheetPage
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Lançamento de Folha"
        description={`Registrando lançamento para ${selectedEmp?.name || "colaborador"}`}
        size="default"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={loadingManual}
              className="rounded-lg text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitManual}
              disabled={loadingManual}
              className="rounded-lg text-xs font-bold bg-primary text-primary-foreground"
            >
              {loadingManual ? "Registrando..." : "Confirmar Lançamento"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">Tipo de Lançamento</Label>
            <Select
              value={manualFormData.type}
              onValueChange={(v: any) => setManualFormData((prev) => ({ ...prev, type: v }))}
            >
              <SelectTrigger className="h-10 rounded-lg text-xs">
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="advance">
                  <div className="flex items-center text-rose-600 font-medium text-xs">
                    <ArrowDownRight className="w-4 h-4 mr-2" /> Vale / Adiantamento (Débito da Folha)
                  </div>
                </SelectItem>
                <SelectItem value="adjustment">
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Bônus / Gratificação (Crédito na Folha)
                  </div>
                </SelectItem>
                <SelectItem value="commission">
                  <div className="flex items-center text-primary font-medium text-xs">
                    <ArrowUpRight className="w-4 h-4 mr-2" /> Comissão Avulsa (Crédito)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 150.00"
              value={manualFormData.amount}
              onChange={(e) => setManualFormData((prev) => ({ ...prev, amount: e.target.value }))}
              className="h-10 rounded-lg font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold">Descrição</Label>
            <Input
              placeholder="Ex: Adiantamento para transporte, bônus meta..."
              value={manualFormData.description}
              onChange={(e) => setManualFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="h-10 rounded-lg text-xs"
            />
          </div>
        </div>
      </SheetPage>

      {/* ── MODAL: PRONTUÁRIO DIGITAL, ASO & PERMISSÕES DO COLABORADOR ── */}
      <EmployeeDossierModal
        isOpen={!!selectedDossierEmployee}
        onClose={() => setSelectedDossierEmployee(null)}
        employee={selectedDossierEmployee}
        onSaved={() => router.invalidate()}
      />

      {/* ── MODAL: ATESTADO MÉDICO & JUSTIFICATIVA DE ABONO ── */}
      <MedicalCertificateModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        employees={storeEmployees}
        onSuccess={() => router.invalidate()}
      />

      {/* ── DIALOG: ATRIBUIR BENEFÍCIOS AO SETOR (EM LOTE) ── */}
      <Dialog open={isBatchBenefitsOpen} onOpenChange={setIsBatchBenefitsOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>Atribuir Benefícios ao Setor</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize os benefícios fixos (VT, VR, Plano) ou aplique reajuste salarial em lote para todos os colaboradores do departamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Departamento / Setor</Label>
              <Select
                value={batchDeptForm.departmentName}
                onValueChange={(v) => setBatchDeptForm((prev) => ({ ...prev, departmentName: v }))}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="Operações">Operações</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Vendas">Vendas / Comercial</SelectItem>
                  <SelectItem value="Cozinha">Cozinha / Salão</SelectItem>
                  <SelectItem value="Logística">Logística / Entrega</SelectItem>
                  <SelectItem value="Atendimento">Atendimento & SAC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Vale Transporte (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 220.00"
                  value={batchDeptForm.transportVoucherCostReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, transportVoucherCostReais: e.target.value }))}
                  className="h-11 rounded-lg font-mono text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Vale Refeição (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 550.00"
                  value={batchDeptForm.mealVoucherCopayReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, mealVoucherCopayReais: e.target.value }))}
                  className="h-11 rounded-lg font-mono text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Plano de Saúde (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 120.00"
                  value={batchDeptForm.healthPlanCopayReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, healthPlanCopayReais: e.target.value }))}
                  className="h-11 rounded-lg font-mono text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">Reajuste Salarial (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5.5"
                  value={batchDeptForm.baseSalaryIncreasePercent}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, baseSalaryIncreasePercent: e.target.value }))}
                  className="h-11 rounded-lg font-mono text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBatchBenefitsOpen(false)}
              disabled={isSavingBatchDept}
              className="rounded-lg text-xs font-bold h-11 min-h-11 sm:h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleBatchDeptSubmit}
              disabled={isSavingBatchDept}
              className="rounded-lg text-xs font-bold h-11 min-h-11 sm:h-9 bg-primary text-primary-foreground shadow-2xs"
            >
              {isSavingBatchDept ? "Aplicando..." : "Aplicar ao Setor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
