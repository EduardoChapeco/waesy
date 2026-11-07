import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
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
  Stethoscope,
  Kanban,
  Table as TableIcon,
} from "lucide-react";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/rh/folha")({
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
      console.error("[loader:workspace.rh.folha] Unhandled loader error:", err);
      return { balances: [], employees: [], store: null };
    }
  },
  component: HrPayrollPage,
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

function HrPayrollPage() {
  const loaderData = (Route.useLoaderData() as { balances: any[]; employees: StoreEmployeeDTO[]; store: any }) || {
    balances: [],
    employees: [],
    store: null,
  };
  const { balances: staffBalances, employees: storeEmployees, store } = loaderData;
  const router = useRouter();

  // Aba ativa: Folha Mensal, Dossiês de Colaboradores ou Simulador CLT
  const [activeTab, setActiveTab] = useState<"folha" | "colaboradores" | "simulador" | "atestados">("folha");

  // Competência selecionada (ex: 2026-11)
  const currentMonthPeriod = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthPeriod);

  // Modo de visualização da Folha: "spreadsheet" vs "kanban" vs "cards"
  const [payrollViewMode, setPayrollViewMode] = useState<"spreadsheet" | "kanban" | "cards">("spreadsheet");

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

  // Modal de Atestado Médico
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);

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
            ...(vtCents !== undefined ? { vtEnabled: true, vtMonthlyCents: vtCents } : {}),
            ...(vrCents !== undefined ? { vrEnabled: true, vrDailyCents: vrCents } : {}),
            ...(healthCents !== undefined ? { healthPlanEnabled: true, healthPlanCents: healthCents } : {}),
          },
          salaryAdjustmentPercent: percent,
        },
      });

      toast.success(
        `Regras de benefícios e salário atualizadas para ${res?.updatedCount || 0} colaboradores do setor ${batchDeptForm.departmentName}!`,
      );
      setIsBatchBenefitsOpen(false);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao atualizar setor em lote.");
    } finally {
      setIsSavingBatchDept(false);
    }
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
      employmentType: emp.employment_type || "clt",
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
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao registrar evento financeiro.");
    } finally {
      setLoadingManual(false);
    }
  };

  // Simulador de Férias e Rescisão
  const [simType, setSimType] = useState<"rescisao" | "ferias">("rescisao");
  const [simEmployeeId, setSimEmployeeId] = useState<string>("");
  const [simReason, setSimReason] = useState<"unjustified_dismissal" | "employee_resignation" | "justified_dismissal" | "mutual_agreement">("unjustified_dismissal");
  const [simNoticeType, setSimNoticeType] = useState<"indemnified" | "worked" | "dispensed">("indemnified");
  const [simVacationDays, setSimVacationDays] = useState("30");
  const [simSellVacation, setSimSellVacation] = useState(false);
  const [simAdvance13th, setSimAdvance13th] = useState(false);

  const selectedSimEmployee = useMemo(() => {
    return storeEmployees.find((e) => e.id === simEmployeeId) || storeEmployees[0] || null;
  }, [storeEmployees, simEmployeeId]);

  const simResult = useMemo(() => {
    if (!selectedSimEmployee) return null;
    const baseCents = selectedSimEmployee.base_salary_cents || 250000;
    const hireDate = selectedSimEmployee.hire_date || "2024-01-01";
    const today = new Date().toISOString().split("T")[0];

    if (simType === "rescisao") {
      return calculateTerminationSeverance({
        baseSalaryCents: baseCents,
        hireDate,
        terminationDate: today,
        terminationReason: simReason,
        noticeType: simNoticeType,
        fgtsBalanceCents: Math.round(baseCents * 0.08 * 12),
      });
    } else {
      return calculateVacationPay({
        baseSalaryCents: baseCents,
        vacationDays: parseInt(simVacationDays, 10) || 30,
        sellPecuniaryAllowanceDays: simSellVacation ? 10 : 0,
        advanceThirteenth: simAdvance13th,
      });
    }
  }, [selectedSimEmployee, simType, simReason, simNoticeType, simVacationDays, simSellVacation, simAdvance13th]);

  // Exportação CSV
  const handleExportCsv = () => {
    if (storeEmployees.length === 0) {
      toast.info("Nenhum registro para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Nome",
      "Cargo",
      "Regime",
      "Salário Base",
      "HE 50% (h)",
      "HE 100% (h)",
      "Faltas (d)",
      "Vales",
      "Bônus",
      "INSS",
      "IRRF",
      "FGTS 8%",
      "Líquido a Pagar",
    ];

    const rows = Object.values(payrollGrid).map((r) => {
      const calc = calculatedPayrollResults[r.employeeId];
      return [
        r.employeeId,
        `"${r.name}"`,
        `"${r.role}"`,
        r.employmentType,
        (r.baseSalaryCents / 100).toFixed(2),
        r.hoursOvertime50,
        r.hoursOvertime100,
        r.absentDays,
        (r.advancesCents / 100).toFixed(2),
        (r.bonusCents / 100).toFixed(2),
        ((calc?.inssDiscountCents || 0) / 100).toFixed(2),
        ((calc?.irrfDiscountCents || 0) / 100).toFixed(2),
        ((calc?.fgtsProvisionCents || 0) / 100).toFixed(2),
        ((calc?.netSalaryCents || 0) / 100).toFixed(2),
      ].join(";");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `folha_contabil_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ── CABEÇALHO SOBERANO RH & DP ── */}
      <PageHeader
        title="Folha de Pagamento Contábil CLT/PJ"
        description="Gestão contábil de vencimentos, horas extras, encargos INSS/IRRF, holerites em PDF e integração com a tesouraria."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleOpenNewEmployee}
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Link to="/workspace/rh/ponto">
                <Clock className="size-3.5 text-primary" />
                <span>Ponto & Banco de Horas</span>
              </Link>
            </Button>

            <Button
              type="button"
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>

            <Button
              type="button"
              onClick={handleClosePayroll}
              disabled={isClosingPayroll}
              size="sm"
              className="h-11 min-h-11 sm:h-9 rounded-lg font-bold text-xs gap-2 cursor-pointer bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
            <SelectTrigger className="h-11 min-h-11 sm:h-9 w-44 rounded-lg text-xs font-mono font-bold bg-background">
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
            Folha Mensal & Edição
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
            Dossiês & Benefícios ({storeEmployees.length})
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
            Playbook Rescisão & Férias
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DA ABA 1: FOLHA MENSAL & EDIÇÃO RÁPIDA ── */}
      {activeTab === "folha" && (
        <div className="space-y-6">
          {/* KPIS CONSOLIDADOS DE FOLHA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
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

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
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

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
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

            <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
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

          {/* BARRA DE CONTROLE & ALTERNADOR DE MODO (PLANILHA VS KANBAN VS CARDS) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador ou cargo..."
                className="pl-10 h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold">Visualização:</span>
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
                    <TableIcon className="size-3.5" />
                    <span>Planilha</span>
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

          {/* VISÃO 1: KANBAN DE FECHAMENTO DE FOLHA */}
          {payrollViewMode === "kanban" && (
            <PayrollKanbanBoard
              items={kanbanItems}
              calculations={calculatedPayrollResults}
              onAdvanceStage={handleAdvanceStage}
              onOpenPayslip={handleOpenOfficialPayslip}
            />
          )}

          {/* VISÃO 2: PLANILHA CONTÁBIL (EDIÇÃO RÁPIDA IN-PAGE ESTILO IFOOD/EXCEL) */}
          {payrollViewMode === "spreadsheet" && (
            <div className="rounded-lg border border-border overflow-hidden bg-card">
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
                                value={row.hoursOvertime50}
                                onChange={(e) => updateGridField(row.employeeId, "hoursOvertime50", Number(e.target.value))}
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
                              />
                            </td>

                            {/* HE 100% */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={row.hoursOvertime100}
                                onChange={(e) => updateGridField(row.employeeId, "hoursOvertime100", Number(e.target.value))}
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
                              />
                            </td>

                            {/* Faltas Injustificadas */}
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={row.absentDays}
                                onChange={(e) => updateGridField(row.employeeId, "absentDays", Number(e.target.value))}
                                className="h-8 w-16 text-xs font-mono text-center mx-auto bg-background"
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
                                className="h-8 w-24 text-xs font-mono text-rose-600 dark:text-rose-400 font-bold bg-background text-right ml-auto"
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
                                className="h-8 w-24 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-background text-right ml-auto"
                              />
                            </td>

                            {/* INSS (Auto) */}
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {formatMoney(calc?.inssDiscountCents || 0)}
                            </td>

                            {/* IRRF (Auto) */}
                            <td className="p-3 text-right font-mono font-bold text-foreground">
                              {formatMoney(calc?.irrfDiscountCents || 0)}
                            </td>

                            {/* FGTS Provisão 8% */}
                            <td className="p-3 text-right font-mono text-muted-foreground">
                              {formatMoney(calc?.fgtsProvisionCents || 0)}
                            </td>

                            {/* Salário Líquido Final */}
                            <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {formatMoney(calc?.netSalaryCents || 0)}
                            </td>

                            {/* Ações */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenOfficialPayslip(row.employeeId)}
                                  className="h-11 min-h-11 sm:h-9 text-xs font-bold gap-1 px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                  title="Emitir Holerite Oficial"
                                >
                                  <FileText className="size-3.5 text-primary" />
                                  <span className="hidden sm:inline">Holerite</span>
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
          )}

          {/* VISÃO 3: CARTÕES DE COLABORADOR */}
          {payrollViewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div
                      key={row.employeeId}
                      className="p-4 rounded-lg bg-card border border-border space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{row.name}</h3>
                          <p className="text-xs text-muted-foreground">{row.role}</p>
                        </div>
                        <Badge variant="outline" className="text-xs uppercase font-bold">
                          {row.employmentType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div>
                          <span className="text-muted-foreground block text-xs">Salário Base</span>
                          <span className="font-bold text-foreground">{formatMoney(row.baseSalaryCents)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-xs">Líquido a Pagar</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(calc?.netSalaryCents || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">INSS + IRRF</span>
                          <span className="text-foreground">
                            {formatMoney((calc?.inssDiscountCents || 0) + (calc?.irrfDiscountCents || 0))}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-xs">Vales & Descontos</span>
                          <span className="text-rose-600 dark:text-rose-400">
                            -{formatMoney(calc?.advancesDiscountCents || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOfficialPayslip(row.employeeId)}
                          className="flex-1 h-11 min-h-11 sm:h-9 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <FileText className="size-3.5 text-primary" />
                          <span>Emitir Holerite</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatement(row.employeeId)}
                          className="h-11 min-h-11 sm:h-9 text-xs font-bold gap-1 px-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <Clock className="size-3.5" />
                          <span>Extrato</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 2: DOSSIÊS DE COLABORADORES & BENEFÍCIOS EM LOTE ── */}
      {activeTab === "colaboradores" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Dossiês Digitais & Benefícios por Setor</h2>
              <p className="text-xs text-muted-foreground">
                Cadastros completos com ASO, CBO, dependentes e aplicação de benefícios em lote por departamento.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBatchBenefitsOpen(true)}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Layers className="size-3.5 text-primary" />
                <span>Aplicar Regras por Setor</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenNewEmployee}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-3.5" />
                <span>Cadastrar Colaborador</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeEmployees.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-lg bg-card border border-border space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{emp.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                    <Badge variant="outline" className="text-xs mt-1 font-mono">
                      {emp.metadata?.departmentName || "Operações"}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase font-bold">
                    {emp.employment_type || "clt"}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Salário Base:</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(emp.base_salary_cents || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Admissão:</span>
                    <span className="font-mono">{emp.hire_date || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dependentes IRRF:</span>
                    <span className="font-mono">{emp.metadata?.dependentsCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ASO Válido até:</span>
                    <span className="font-mono">{emp.metadata?.asoValidUntil || "Conforme periódicos"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditEmployee(emp)}
                    className="flex-1 h-11 min-h-11 sm:h-9 text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Edit3 className="size-3.5" />
                    <span>Editar Ficha</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDossierEmployee(emp)}
                    className="flex-1 h-11 min-h-11 sm:h-9 text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <FolderLock className="size-3.5 text-primary" />
                    <span>Prontuário & ASO</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTEÚDO DA ABA 3: SIMULADOR CLT & PLAYBOOK RESCISÃO/FÉRIAS ── */}
      {activeTab === "simulador" && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-card border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Simulador Trabalhista CLT</h2>
              <p className="text-xs text-muted-foreground">
                Simule rescisões contratuais completas e recibos de férias com abono pecuniário conforme legislação vigente.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setSimType("rescisao")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  simType === "rescisao" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                Rescisão Trabalhista
              </button>
              <button
                type="button"
                onClick={() => setSimType("ferias")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  simType === "ferias" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                Cálculo de Férias
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel de Parâmetros da Simulação */}
            <div className="lg:col-span-1 p-4 rounded-lg bg-card border border-border space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-primary" />
                Parâmetros do Cálculo
              </h3>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Colaborador</Label>
                <Select value={simEmployeeId || storeEmployees[0]?.id || ""} onValueChange={setSimEmployeeId}>
                  <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                    <SelectValue placeholder="Selecione o colaborador..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {storeEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">
                        {e.full_name} ({formatMoney(e.base_salary_cents)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {simType === "rescisao" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Motivo do Desligamento</Label>
                    <Select value={simReason} onValueChange={(val: any) => setSimReason(val)}>
                      <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="unjustified_dismissal">Dispensa Sem Justa Causa (Multa 40%)</SelectItem>
                        <SelectItem value="employee_resignation">Pedido de Demissão pelo Colaborador</SelectItem>
                        <SelectItem value="justified_dismissal">Dispensa Com Justa Causa</SelectItem>
                        <SelectItem value="mutual_agreement">Acordo Mútuo (Art. 484-A - Multa 20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Aviso Prévio</Label>
                    <Select value={simNoticeType} onValueChange={(val: any) => setSimNoticeType(val)}>
                      <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="indemnified">Indenizado pelo Empregador (Lei 12.506)</SelectItem>
                        <SelectItem value="worked">Trabalhado</SelectItem>
                        <SelectItem value="dispensed">Dispensado / Não Aplicável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Dias de Gozo</Label>
                    <Select value={simVacationDays} onValueChange={setSimVacationDays}>
                      <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="30">30 dias corridos</SelectItem>
                        <SelectItem value="20">20 dias corridos</SelectItem>
                        <SelectItem value="15">15 dias corridos</SelectItem>
                        <SelectItem value="10">10 dias corridos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Abono Pecuniário</Label>
                      <p className="text-xs text-muted-foreground">Venda de 1/3 (10 dias) das férias</p>
                    </div>
                    <Input
                      type="checkbox"
                      checked={simSellVacation}
                      onChange={(e) => setSimSellVacation(e.target.checked)}
                      className="size-4 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Adiantar 1ª Parcela 13º</Label>
                      <p className="text-xs text-muted-foreground">50% do salário adiantado</p>
                    </div>
                    <Input
                      type="checkbox"
                      checked={simAdvance13th}
                      onChange={(e) => setSimAdvance13th(e.target.checked)}
                      className="size-4 rounded"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Resultado do Cálculo */}
            <div className="lg:col-span-2 p-6 rounded-lg bg-card border border-border space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {simType === "rescisao" ? "Demonstrativo de Verbas Rescisórias (TRCT)" : "Recibo de Férias & 1/3 Constitucional"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Base: {selectedSimEmployee?.full_name} • Salário {formatMoney(selectedSimEmployee?.base_salary_cents || 250000)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground uppercase font-bold block">Valor Bruto</span>
                  <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(simType === "rescisao" ? (simResult as any)?.totalSeveranceGrossCents || 0 : (simResult as any)?.totalVacationGrossCents || 0)}
                  </span>
                </div>
              </div>

              {simResult && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-2">
                    <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Proventos / Direitos:</p>
                    <div className="divide-y divide-border/60 rounded-lg border border-border overflow-hidden">
                      {simType === "rescisao" ? (
                        <>
                          <div className="p-3 flex justify-between bg-muted/20">
                            <span>Saldo de Salário</span>
                            <span className="font-bold">{formatMoney((simResult as any)?.workedDaysPayCents || 0)}</span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span>Aviso Prévio ({(simResult as any)?.noticeDays || 0} dias)</span>
                            <span className="font-bold">{formatMoney((simResult as any)?.noticePeriodPayCents || 0)}</span>
                          </div>
                          <div className="p-3 flex justify-between bg-muted/20">
                            <span>13º Salário Proporcional</span>
                            <span className="font-bold">{formatMoney((simResult as any)?.thirteenthProportionalCents || 0)}</span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span>Férias Proporcionais + 1/3</span>
                            <span className="font-bold">
                              {formatMoney(((simResult as any)?.vacationProportionalCents || 0) + ((simResult as any)?.vacationConstitutionalThirdCents || 0))}
                            </span>
                          </div>
                          <div className="p-3 flex justify-between bg-muted/20">
                            <span>Multa Rescisória FGTS</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney((simResult as any)?.fgtsPenaltyCents || 0)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 flex justify-between bg-muted/20">
                            <span>Remuneração de Férias ({simVacationDays} dias)</span>
                            <span className="font-bold">{formatMoney((simResult as any)?.vacationPayCents || 0)}</span>
                          </div>
                          <div className="p-3 flex justify-between">
                            <span>1/3 Constitucional sobre Férias</span>
                            <span className="font-bold">{formatMoney((simResult as any)?.constitutionalThirdCents || 0)}</span>
                          </div>
                          {(simResult as any)?.pecuniaryAllowancePayCents > 0 && (
                            <div className="p-3 flex justify-between bg-muted/20">
                              <span>Abono Pecuniário (10 dias vendidos) + 1/3</span>
                              <span className="font-bold">
                                {formatMoney(((simResult as any)?.pecuniaryAllowancePayCents || 0) + ((simResult as any)?.pecuniaryThirdCents || 0))}
                              </span>
                            </div>
                          )}
                          {(simResult as any)?.advanceThirteenthCents > 0 && (
                            <div className="p-3 flex justify-between">
                              <span>Adiantamento 1ª Parcela 13º (50%)</span>
                              <span className="font-bold">{formatMoney((simResult as any)?.advanceThirteenthCents || 0)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAIS E GAVETAS DO SISTEMA ── */}
      <OfficialPayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        data={selectedPayslipData}
      />

      <EmployeeDossierModal
        isOpen={Boolean(selectedDossierEmployee)}
        onClose={() => setSelectedDossierEmployee(null)}
        employee={selectedDossierEmployee}
        onSaved={() => router.invalidate()}
      />

      <MedicalCertificateModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        employees={storeEmployees}
        onSuccess={() => router.invalidate()}
      />

      {/* Modal / Gaveta de Benefícios em Lote por Departamento */}
      <Dialog open={isBatchBenefitsOpen} onOpenChange={setIsBatchBenefitsOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Benefícios & Descontos por Setor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure vale transporte, vale refeição, plano de saúde e reajustes para todos os colaboradores do setor simultaneamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Setor / Departamento</Label>
              <Select
                value={batchDeptForm.departmentName}
                onValueChange={(val) => setBatchDeptForm((prev) => ({ ...prev, departmentName: val }))}
              >
                <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="Operações">Operações</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Vendas & Comercial">Vendas & Comercial</SelectItem>
                  <SelectItem value="Logística & Expedição">Logística & Expedição</SelectItem>
                  <SelectItem value="Atendimento">Atendimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Vale Transporte (R$/mês)</Label>
                <Input
                  placeholder="Ex: 220,00"
                  value={batchDeptForm.transportVoucherCostReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, transportVoucherCostReais: e.target.value }))}
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Vale Refeição (R$/dia)</Label>
                <Input
                  placeholder="Ex: 35,00"
                  value={batchDeptForm.mealVoucherCopayReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, mealVoucherCopayReais: e.target.value }))}
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Plano de Saúde (R$/mês)</Label>
                <Input
                  placeholder="Ex: 150,00"
                  value={batchDeptForm.healthPlanCopayReais}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, healthPlanCopayReais: e.target.value }))}
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Reajuste Salarial (%)</Label>
                <Input
                  placeholder="Ex: 5.5"
                  value={batchDeptForm.baseSalaryIncreasePercent}
                  onChange={(e) => setBatchDeptForm((prev) => ({ ...prev, baseSalaryIncreasePercent: e.target.value }))}
                  className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchBenefitsOpen(false)}
              disabled={isSavingBatchDept}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBatchDeptSubmit}
              disabled={isSavingBatchDept}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {isSavingBatchDept ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-3.5" />
                  <span>Aplicar a Todos do Setor</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gaveta de Cadastro e Edição de Colaborador */}
      <SheetPage
        open={isEmployeeDrawerOpen}
        onOpenChange={setIsEmployeeDrawerOpen}
        title={editingEmployeeId ? "Editar Colaborador" : "Novo Colaborador"}
        description="Ficha cadastral, regime de contratação CLT/PJ, cargo, salário base e encargos."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEmployeeDrawerOpen(false)}
              disabled={isSavingEmployee}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEmployee}
              disabled={isSavingEmployee}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {isSavingEmployee ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-3.5" />
                  <span>Salvar Colaborador</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Nome Completo *</Label>
            <Input
              value={employeeFormData.fullName}
              onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Ex: João da Silva Santos"
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Cargo / Função *</Label>
              <Input
                value={employeeFormData.jobTitle}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Ex: Vendedor Líder"
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Regime</Label>
              <Select
                value={employeeFormData.employmentType}
                onValueChange={(val) => setEmployeeFormData((prev) => ({ ...prev, employmentType: val }))}
              >
                <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="clt">CLT (Mensalista)</SelectItem>
                  <SelectItem value="pj">PJ (Prestador)</SelectItem>
                  <SelectItem value="internship">Estágio</SelectItem>
                  <SelectItem value="apprentice">Jovem Aprendiz</SelectItem>
                  <SelectItem value="temporary">Temporário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Salário Base (R$) *</Label>
              <Input
                placeholder="Ex: 3200,00"
                value={employeeFormData.baseSalaryReais}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, baseSalaryReais: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono font-bold bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Setor / Departamento</Label>
              <Input
                placeholder="Ex: Operações"
                value={employeeFormData.departmentName}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, departmentName: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">CPF Mascarado</Label>
              <Input
                placeholder="Ex: 000.***.***-00"
                value={employeeFormData.cpfMasked}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, cpfMasked: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Data Admissão</Label>
              <Input
                type="date"
                value={employeeFormData.hireDate}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, hireDate: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">CBO (Classificação)</Label>
              <Input
                placeholder="Ex: 5211-10"
                value={employeeFormData.cboCode}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, cboCode: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Dependentes (IRRF)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={employeeFormData.dependentsCount}
                onChange={(e) => setEmployeeFormData((prev) => ({ ...prev, dependentsCount: Number(e.target.value) }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono bg-background"
              />
            </div>
          </div>
        </div>
      </SheetPage>

      {/* Modal de Lançamento Manual (Vales/Bônus individuais) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              Lançamento Avulso de Vale / Bônus
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Colaborador: <span className="font-bold text-foreground">{selectedEmp?.name || "Colaborador"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Tipo de Lançamento</Label>
              <Select
                value={manualFormData.type}
                onValueChange={(val: any) => setManualFormData((prev) => ({ ...prev, type: val }))}
              >
                <SelectTrigger className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="advance">Vale / Adiantamento Salarial (- Débito)</SelectItem>
                  <SelectItem value="adjustment">Bônus / Gratificação (+ Crédito)</SelectItem>
                  <SelectItem value="commission">Comissão Avulsa (+ Crédito)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Valor (R$)</Label>
              <Input
                placeholder="Ex: 350,00"
                value={manualFormData.amount}
                onChange={(e) => setManualFormData((prev) => ({ ...prev, amount: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-mono font-bold bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Descrição / Motivo</Label>
              <Input
                placeholder="Ex: Adiantamento solicitado para despesas médicas"
                value={manualFormData.description}
                onChange={(e) => setManualFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="h-11 min-h-11 sm:h-9 rounded-lg text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={loadingManual}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitManual}
              disabled={loadingManual}
              className="h-11 min-h-11 sm:h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {loadingManual ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Confirmar Lançamento</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gaveta de Extrato Detalhado do Colaborador */}
      <SheetPage
        open={Boolean(statementEmpId)}
        onOpenChange={(open) => {
          if (!open) {
            setStatementEmpId(null);
            setStatementData(null);
          }
        }}
        title="Extrato de Conta Corrente do Colaborador"
        description="Histórico auditável de todos os vales, bônus, salários e comissões registrados."
      >
        {loadingStatement ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-primary" />
            <span className="text-xs">Carregando extrato...</span>
          </div>
        ) : statementData ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{statementData.employee?.name}</p>
                <p className="text-xs text-muted-foreground">{statementData.employee?.role}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Saldo Atual</span>
                <span
                  className={`text-base font-mono font-bold ${
                    statementData.summary?.netBalanceCents < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatMoney(statementData.summary?.netBalanceCents || 0)}
                </span>
              </div>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {statementData.records?.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nenhum lançamento financeiro registrado.
                </div>
              ) : (
                statementData.records?.map((rec: any) => (
                  <div key={rec.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{rec.description}</p>
                      <span className="text-muted-foreground">{formatDateTime(rec.created_at)}</span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        rec.amount_cents < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {rec.amount_cents < 0 ? "-" : "+"}
                      {formatMoney(Math.abs(rec.amount_cents))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </SheetPage>
    </div>
  );
}

export default HrPayrollPage;
