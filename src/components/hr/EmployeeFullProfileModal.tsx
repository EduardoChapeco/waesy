import * as React from "react";
import { useState, useEffect } from "react";
import {
  User,
  FileText,
  Briefcase,
  DollarSign,
  Clock,
  ShieldCheck,
  Building2,
  Users,
  Award,
  Layers,
  HeartPulse,
  Smartphone,
  Save,
  Trash2,
  Plus,
  ExternalLink,
  Wallet,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import {
  saveEmployeeFullProfile,
  type StoreEmployeeDTO,
  type StoreDepartmentItemDTO,
} from "@/services/hr.functions";

export interface EmployeeFullProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: StoreEmployeeDTO | null;
  departments: StoreDepartmentItemDTO[];
  onSaved: () => void | Promise<void>;
  niche?: string;
}

export function EmployeeFullProfileModal({
  isOpen,
  onClose,
  employee,
  departments,
  onSaved,
  niche = "generic",
}: EmployeeFullProfileModalProps) {
  const [activeTab, setActiveTab] = useState<
    "personal" | "commercial" | "timecard" | "benefits" | "documents" | "niche"
  >("personal");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Dados Pessoais & Contratuais
  const [fullName, setFullName] = useState("");
  const [cpfMasked, setCpfMasked] = useState("");
  const [rg, setRg] = useState("");
  const [pis, setPis] = useState("");
  const [ctps, setCtps] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentType, setEmploymentType] = useState<
    "clt" | "pj" | "internship" | "apprentice" | "temporary" | "freelancer" | "partner"
  >("clt");
  const [status, setStatus] = useState<"active" | "on_leave" | "vacation" | "terminated" | "suspended">("active");
  const [baseSalaryCents, setBaseSalaryCents] = useState(0);
  const [hireDate, setHireDate] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");

  // Dados Bancários & PIX
  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");

  // 2. Comercial & Atendimento
  const [isSeller, setIsSeller] = useState(false);
  const [commissionPct, setCommissionPct] = useState(0);
  const [monthlyGoalCents, setMonthlyGoalCents] = useState(0);

  // 3. Ponto & Jornada
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [pinCode, setPinCode] = useState("");

  // 4. Benefícios
  const [vtEnabled, setVtEnabled] = useState(false);
  const [vtMonthlyCents, setVtMonthlyCents] = useState(0);
  const [vrEnabled, setVrEnabled] = useState(false);
  const [vrDailyCents, setVrDailyCents] = useState(0);
  const [healthPlanEnabled, setHealthPlanEnabled] = useState(false);
  const [healthPlanCents, setHealthPlanCents] = useState(0);

  // 5. Documentos & ASO
  const [asoStatus, setAsoStatus] = useState<"apt" | "apt_with_restrictions" | "inapt">("apt");
  const [asoValidUntil, setAsoValidUntil] = useState("");

  // 6. Nicho Específico
  const [nicheRegistryCode, setNicheRegistryCode] = useState(""); // Creci, CRM, CRO, CNH, OAB

  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name || "");
      setCpfMasked(employee.cpf_masked || "");
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setJobTitle(employee.job_title || "");
      setEmploymentType((employee.employment_type as any) || "clt");
      setStatus((employee.status as any) || "active");
      setBaseSalaryCents(employee.base_salary_cents || 0);
      setHireDate(employee.hire_date || new Date().toISOString().split("T")[0]);

      const meta: Record<string, any> = (employee.metadata as any) || {};
      setRg(meta.rg || "");
      setPis(meta.pis || "");
      setCtps(meta.ctps || "");
      setBirthDate(meta.birth_date || "");
      setAddress(meta.address || "");
      setDepartmentId(meta.departmentId || "");

      // Banco
      const bank = meta.bank_info || {};
      setBankName(bank.bankName || "");
      setAgency(bank.agency || "");
      setAccount(bank.account || "");
      setPixKey(bank.pixKey || "");
      setPixKeyType(bank.pixKeyType || "cpf");

      // Comercial
      const comm = meta.commercial || {};
      setIsSeller(Boolean(comm.isSeller));
      setCommissionPct(Number(comm.commissionPct || 0));
      setMonthlyGoalCents(Number(comm.monthlyGoalCents || 0));

      // Ponto
      setWeeklyHours(Number(employee.work_schedule?.weekly_hours || 44));
      setPinCode(meta.pin_code || "");

      // Benefícios
      const ben = meta.default_benefits || {};
      setVtEnabled(Boolean(ben.vtEnabled));
      setVtMonthlyCents(Number(ben.vtMonthlyCents || 0));
      setVrEnabled(Boolean(ben.vrEnabled));
      setVrDailyCents(Number(ben.vrDailyCents || 0));
      setHealthPlanEnabled(Boolean(ben.healthPlanEnabled));
      setHealthPlanCents(Number(ben.healthPlanCents || 0));

      // ASO
      const asoList = Array.isArray(meta.aso_records) ? meta.aso_records : [];
      if (asoList.length > 0) {
        setAsoStatus(asoList[0].status || "apt");
        setAsoValidUntil(asoList[0].validUntil || "");
      } else {
        setAsoStatus("apt");
        setAsoValidUntil("");
      }

      // Nicho
      const nd = meta.niche_data || {};
      setNicheRegistryCode(nd.registryCode || "");
    } else {
      // Reset para novo cadastro
      setFullName("");
      setCpfMasked("");
      setRg("");
      setPis("");
      setCtps("");
      setBirthDate("");
      setEmail("");
      setPhone("");
      setAddress("");
      setJobTitle("Colaborador");
      setEmploymentType("clt");
      setStatus("active");
      setBaseSalaryCents(0);
      setHireDate(new Date().toISOString().split("T")[0]);
      setDepartmentId("");
      setBankName("");
      setAgency("");
      setAccount("");
      setPixKey("");
      setIsSeller(false);
      setCommissionPct(0);
      setMonthlyGoalCents(0);
      setWeeklyHours(44);
      setPinCode("");
      setVtEnabled(false);
      setVtMonthlyCents(0);
      setVrEnabled(false);
      setVrDailyCents(0);
      setHealthPlanEnabled(false);
      setHealthPlanCents(0);
      setAsoStatus("apt");
      setAsoValidUntil("");
      setNicheRegistryCode("");
    }
  }, [employee, isOpen]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("O nome completo do colaborador é obrigatório.");
      return;
    }
    if (!jobTitle.trim()) {
      toast.error("O cargo do colaborador é obrigatório.");
      return;
    }

    const selectedDept = departments.find((d) => d.id === departmentId);

    setIsSaving(true);
    try {
      await saveEmployeeFullProfile({
        data: {
          id: employee?.id,
          profileId: employee?.profile_id || null,
          fullName: fullName.trim(),
          cpfMasked: cpfMasked.trim() || null,
          rg: rg.trim() || null,
          pis: pis.trim() || null,
          ctps: ctps.trim() || null,
          birthDate: birthDate || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          jobTitle: jobTitle.trim(),
          employmentType,
          status,
          baseSalaryCents,
          hireDate: hireDate || null,
          departmentId: departmentId || null,
          departmentName: selectedDept?.name || null,
          bankInfo: {
            bankName,
            agency,
            account,
            pixKey,
            pixKeyType,
          },
          commercial: {
            isSeller,
            commissionPct,
            monthlyGoalCents,
            assignedCustomerIds: (employee?.metadata as any)?.commercial?.assignedCustomerIds || [],
          },
          workSchedule: {
            weekly_hours: weeklyHours,
            daily_hours: weeklyHours === 44 ? 8.8 : weeklyHours / 5,
          },
          defaultBenefits: {
            vtEnabled,
            vtMonthlyCents,
            vrEnabled,
            vrDailyCents,
            healthPlanEnabled,
            healthPlanCents,
          },
          pinCode: pinCode.trim() || null,
          asoRecords: asoValidUntil
            ? [
                {
                  type: "periodico",
                  examDate: new Date().toISOString().split("T")[0],
                  validUntil: asoValidUntil,
                  status: asoStatus,
                },
              ]
            : (employee?.metadata as any)?.aso_records || [],
          nicheData: {
            registryCode: nicheRegistryCode.trim() || null,
          },
        },
      });

      toast.success(employee ? "Perfil do colaborador atualizado com sucesso!" : "Colaborador admitido com sucesso!");
      onClose();
      await onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar ficha do colaborador.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-overlay-max flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <User className="size-5 text-primary" />
                <span>{employee ? `Ficha 360°: ${fullName || employee.full_name}` : "Admissão de Novo Colaborador"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gestão integrada de dados cadastrais, comerciais, ponto, benefícios e conformidade trabalhista.
              </DialogDescription>
            </div>
            {employee && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-3 py-1",
                  status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-warning/10 text-warning-strong border-warning/30"
                )}
              >
                {status === "active" ? "Colaborador Ativo" : status === "vacation" ? "Em Férias" : "Afastado"}
              </Badge>
            )}
          </div>

          {/* Abas Superiores de Navegação */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto scroll-area-carousel no-scrollbar">
            {[
              { id: "personal", label: "Pessoal & Contrato", icon: Briefcase },
              { id: "commercial", label: "Comercial & Vendas", icon: DollarSign },
              { id: "timecard", label: "Ponto & Jornada", icon: Clock },
              { id: "benefits", label: "Benefícios & Descontos", icon: Wallet },
              { id: "documents", label: "Documentos & ASO", icon: HeartPulse },
              { id: "niche", label: "Regras de Nicho", icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring",
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
        </DialogHeader>

        {/* Conteúdo com Scroll Interno Independente */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* ABA 1: PESSOAL & CONTRATUAL */}
          {activeTab === "personal" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-2xs font-semibold text-muted-foreground">Nome Completo *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome civil ou social do colaborador..."
                    className="h-11 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">CPF *</Label>
                  <Input
                    value={cpfMasked}
                    onChange={(e) => setCpfMasked(e.target.value)}
                    placeholder="000.000.000-00"
                    className="h-11 text-xs rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Cargo / Função *</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Consultor Comercial, Caixa..."
                    className="h-11 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Setor / Departamento</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-11 text-xs rounded-lg">
                      <SelectValue placeholder="Selecione o setor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-xs">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Regime de Contratação</Label>
                  <Select value={employmentType} onValueChange={(val: any) => setEmploymentType(val)}>
                    <SelectTrigger className="h-11 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt" className="text-xs">CLT (Carteira Assinada)</SelectItem>
                      <SelectItem value="pj" className="text-xs">PJ (Pessoa Jurídica / MEI)</SelectItem>
                      <SelectItem value="partner" className="text-xs">Salão Parceiro (Lei 13.352)</SelectItem>
                      <SelectItem value="internship" className="text-xs">Estágio Remunerado</SelectItem>
                      <SelectItem value="apprentice" className="text-xs">Jovem Aprendiz</SelectItem>
                      <SelectItem value="freelancer" className="text-xs">Autônomo / Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Salário Base Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={baseSalaryCents ? baseSalaryCents / 100 : ""}
                    onChange={(e) => setBaseSalaryCents(Math.round(Number(e.target.value || 0) * 100))}
                    placeholder="R$ 0,00"
                    className="h-11 text-xs rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Data de Admissão</Label>
                  <Input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="h-11 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-2xs font-semibold text-muted-foreground">Status do Vínculo</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="h-11 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="text-xs">Ativo</SelectItem>
                      <SelectItem value="vacation" className="text-xs">Em Férias</SelectItem>
                      <SelectItem value="on_leave" className="text-xs">Afastado (INSS / Licença)</SelectItem>
                      <SelectItem value="suspended" className="text-xs">Suspenso</SelectItem>
                      <SelectItem value="terminated" className="text-xs">Desligado / Rescindido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dados de Contato e Documentos Civis */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Documentação Civil & Contato
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Telefone / WhatsApp</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="h-11 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">E-mail Corporativo</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colaborador@empresa.com"
                      className="h-11 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">RG / Órgão Emissor</Label>
                    <Input
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="Ex: 12.345.678-9 SSP/SP"
                      className="h-11 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">PIS / PASEP</Label>
                    <Input
                      value={pis}
                      onChange={(e) => setPis(e.target.value)}
                      placeholder="000.00000.00-0"
                      className="h-11 text-xs rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Bancários & PIX */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Dados Bancários & Chave PIX (Para Pagamento de Salário/Comissões)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Instituição Bancária</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ex: Nubank, Itaú, Banco do Brasil..."
                      className="h-11 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Agência & Conta</Label>
                    <Input
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      placeholder="Ag. 0001 / Conta 123456-7"
                      className="h-11 text-xs rounded-lg font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Chave PIX</Label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="CPF, e-mail ou chave aleatória..."
                      className="h-11 text-xs rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: COMERCIAL & VENDAS */}
          {activeTab === "commercial" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-foreground block">
                      Perfil Comercial Ativo (Vendedor / Closer)
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      Habilita carteira de clientes, cálculo automático de comissões e metas de vendas no CRM.
                    </span>
                  </div>
                  <Switch checked={isSeller} onCheckedChange={setIsSeller} />
                </div>

                {isSeller && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold text-muted-foreground">
                        Percentual de Comissão Padrão (%)
                      </Label>
                      <Input
                        type="number"
                        value={commissionPct || ""}
                        onChange={(e) => setCommissionPct(Number(e.target.value || 0))}
                        placeholder="Ex: 5% sobre o faturamento"
                        className="h-11 text-xs rounded-lg font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-2xs font-semibold text-muted-foreground">
                        Meta Mensal de Faturamento (R$)
                      </Label>
                      <Input
                        type="number"
                        value={monthlyGoalCents ? monthlyGoalCents / 100 : ""}
                        onChange={(e) => setMonthlyGoalCents(Math.round(Number(e.target.value || 0) * 100))}
                        placeholder="R$ 50.000,00"
                        className="h-11 text-xs rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Carteira de Clientes Atribuída */}
              <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                    Carteira de Clientes Atribuída ao Vendedor
                  </span>
                  <Badge variant="outline" className="text-3xs font-mono font-semibold">
                    {(employee?.metadata as any)?.commercial?.assignedCustomerIds?.length || 0} clientes vinculados
                  </Badge>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Os leads e clientes atendidos por este colaborador no CRM e WhatsApp são automaticamente sincronizados com esta carteira.
                </p>
              </div>
            </div>
          )}

          {/* ABA 3: PONTO & JORNADA */}
          {activeTab === "timecard" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Jornada de Trabalho & Ponto Eletrônico (Portaria MTE 671/2021)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold text-muted-foreground">
                      Carga Horária Semanal (Horas)
                    </Label>
                    <Select
                      value={String(weeklyHours)}
                      onValueChange={(val) => setWeeklyHours(Number(val))}
                    >
                      <SelectTrigger className="h-11 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="44" className="text-xs">44h semanais (8h48min/dia - Padrão CLT)</SelectItem>
                        <SelectItem value="40" className="text-xs">40h semanais (8h/dia)</SelectItem>
                        <SelectItem value="30" className="text-xs">30h semanais (6h/dia - Estágio)</SelectItem>
                        <SelectItem value="20" className="text-xs">20h semanais (4h/dia)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold text-muted-foreground">
                      Código PIN para Ponto Eletrônico (4 a 6 dígitos)
                    </Label>
                    <Input
                      type="password"
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="PIN numérico do colaborador..."
                      className="h-11 text-xs rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: BENEFÍCIOS */}
          {activeTab === "benefits" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Pacote de Benefícios & Descontos Contratuais
                </span>

                <div className="space-y-4">
                  {/* Vale Transporte */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs text-foreground block">Vale Transporte (VT)</span>
                      <span className="text-2xs text-muted-foreground">
                        Desconto legal automático travado no teto de 6% do salário base na folha.
                      </span>
                    </div>
                    <Switch checked={vtEnabled} onCheckedChange={setVtEnabled} />
                  </div>

                  {/* Vale Refeição */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs text-foreground block">Vale Refeição / Alimentação (VR/VA)</span>
                      <span className="text-2xs text-muted-foreground">
                        Benefício creditado por dia útil trabalhado no mês.
                      </span>
                    </div>
                    <Switch checked={vrEnabled} onCheckedChange={setVrEnabled} />
                  </div>

                  {/* Plano de Saúde */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                    <div className="space-y-1">
                      <span className="font-semibold text-xs text-foreground block">Plano de Saúde / Odontológico</span>
                      <span className="text-2xs text-muted-foreground">
                        Coparticipação descontada no holerite mensal do colaborador.
                      </span>
                    </div>
                    <Switch checked={healthPlanEnabled} onCheckedChange={setHealthPlanEnabled} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: DOCUMENTOS & ASO */}
          {activeTab === "documents" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-4">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Atestado de Saúde Ocupacional (ASO) & Medicina do Trabalho
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold text-muted-foreground">Parecer Médico (ASO)</Label>
                    <Select value={asoStatus} onValueChange={(val: any) => setAsoStatus(val)}>
                      <SelectTrigger className="h-11 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apt" className="text-xs">Apto para a Função</SelectItem>
                        <SelectItem value="apt_with_restrictions" className="text-xs">Apto com Restrições</SelectItem>
                        <SelectItem value="inapt" className="text-xs">Inapto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-2xs font-semibold text-muted-foreground">Validade do Exame ASO</Label>
                    <Input
                      type="date"
                      value={asoValidUntil}
                      onChange={(e) => setAsoValidUntil(e.target.value)}
                      className="h-11 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: REGRAS DE NICHO */}
          {activeTab === "niche" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                <span className="font-bold text-xs uppercase tracking-wide text-foreground block">
                  Qualificação Especializada por Nicho
                </span>
                <p className="text-2xs text-muted-foreground">
                  Informações regulatórias, conselhos de classe e modalidades contratuais específicas.
                </p>

                <div className="space-y-1 pt-2">
                  <Label className="text-2xs font-semibold text-muted-foreground">
                    Registro Profissional / Conselho de Classe (CRECI, CRM, CRO, CNH, OAB)
                  </Label>
                  <Input
                    value={nicheRegistryCode}
                    onChange={(e) => setNicheRegistryCode(e.target.value)}
                    placeholder="Ex: CRECI 12345-F, CRM/SP 98765, CNH 12345678900..."
                    className="h-11 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onClose}
            className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="h-11 min-h-11 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Save className="size-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Ficha 360°"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
