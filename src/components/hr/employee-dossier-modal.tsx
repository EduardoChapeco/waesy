import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Activity,
  FolderOpen,
  DollarSign,
  MonitorCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { upsertEmployeeDossier } from "@/services/hr.functions";
import { formatMoney } from "@/lib/money";

export interface MedicalExamRecord {
  id?: string;
  type: "admissional" | "periodico" | "demissional" | "retorno_ao_trabalho" | "mudanca_funcao";
  examDate: string;
  validUntil: string;
  clinicName?: string;
  doctorCrm?: string;
  status: "apt" | "inapt" | "apt_with_restrictions";
  documentUrl?: string;
}

export interface EmployeeDocumentRecord {
  id?: string;
  category: "rg_cpf" | "ctps" | "residence" | "contract" | "medical_leave" | "aso" | "other";
  title: string;
  fileUrl: string;
  uploadedAt?: string;
  notes?: string;
}

export interface DefaultBenefitsRecord {
  vtEnabled: boolean;
  vtMonthlyCents: number;
  vrEnabled: boolean;
  vrDailyCents: number;
  healthPlanEnabled: boolean;
  healthPlanCents: number;
  otherDiscountsCents: number;
}

export interface PosPermissionsRecord {
  canOpenDrawer: boolean;
  canVoidItemWithoutPin: boolean;
  canGiveDiscountWithoutPin: boolean;
  maxDiscountPct: number;
  canRefund: boolean;
  canSangriaSuprimento: boolean;
}

export interface EmployeeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    full_name: string;
    job_title: string;
    employment_type: string;
    base_salary_cents: number;
    metadata?: Record<string, any>;
  } | null;
  onSaved?: () => void;
}

export function EmployeeDossierModal({ isOpen, onClose, employee, onSaved }: EmployeeDossierModalProps) {
  const [activeTab, setActiveTab] = useState<"aso" | "documents" | "benefits" | "pos">("aso");
  const [isSaving, setIsSaving] = useState(false);

  const initialMeta = employee?.metadata || {};
  const [medicalExams, setMedicalExams] = useState<MedicalExamRecord[]>(initialMeta.medical_exams || []);
  const [documents, setDocuments] = useState<EmployeeDocumentRecord[]>(initialMeta.documents || []);
  const [benefits, setBenefits] = useState<DefaultBenefitsRecord>(
    initialMeta.default_benefits || {
      vtEnabled: false,
      vtMonthlyCents: 0,
      vrEnabled: false,
      vrDailyCents: 0,
      healthPlanEnabled: false,
      healthPlanCents: 0,
      otherDiscountsCents: 0,
    }
  );
  const [posPerms, setPosPerms] = useState<PosPermissionsRecord>(
    initialMeta.pos_permissions || {
      canOpenDrawer: true,
      canVoidItemWithoutPin: false,
      canGiveDiscountWithoutPin: false,
      maxDiscountPct: 5,
      canRefund: false,
      canSangriaSuprimento: false,
    }
  );

  // Formulário inline para novo ASO
  const [newExam, setNewExam] = useState<MedicalExamRecord>({
    type: "periodico",
    examDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    clinicName: "",
    doctorCrm: "",
    status: "apt",
    documentUrl: "",
  });

  // Formulário inline para novo documento
  const [newDoc, setNewDoc] = useState<EmployeeDocumentRecord>({
    category: "rg_cpf",
    title: "",
    fileUrl: "",
    notes: "",
  });

  // Atualizar estados locais quando o colaborador mudar
  React.useEffect(() => {
    if (employee) {
      const meta = employee.metadata || {};
      setMedicalExams(meta.medical_exams || []);
      setDocuments(meta.documents || []);
      setBenefits(
        meta.default_benefits || {
          vtEnabled: false,
          vtMonthlyCents: 0,
          vrEnabled: false,
          vrDailyCents: 0,
          healthPlanEnabled: false,
          healthPlanCents: 0,
          otherDiscountsCents: 0,
        }
      );
      setPosPerms(
        meta.pos_permissions || {
          canOpenDrawer: true,
          canVoidItemWithoutPin: false,
          canGiveDiscountWithoutPin: false,
          maxDiscountPct: 5,
          canRefund: false,
          canSangriaSuprimento: false,
        }
      );
    }
  }, [employee]);

  const handleAddExam = () => {
    if (!newExam.examDate || !newExam.validUntil) {
      toast.error("Informe a data do exame e a data de validade.");
      return;
    }
    setMedicalExams((prev) => [...prev, { ...newExam, id: crypto.randomUUID() }]);
    setNewExam({
      type: "periodico",
      examDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      clinicName: "",
      doctorCrm: "",
      status: "apt",
      documentUrl: "",
    });
    toast.success("Exame ASO adicionado.");
  };

  const handleRemoveExam = (index: number) => {
    setMedicalExams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDoc = () => {
    if (!newDoc.title.trim()) {
      toast.error("Informe o título do documento.");
      return;
    }
    setDocuments((prev) => [
      ...prev,
      {
        ...newDoc,
        id: crypto.randomUUID(),
        uploadedAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewDoc({
      category: "rg_cpf",
      title: "",
      fileUrl: "",
      notes: "",
    });
    toast.success("Documento adicionado ao prontuário.");
  };

  const handleRemoveDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (!employee?.id) return;
    setIsSaving(true);
    try {
      await upsertEmployeeDossier({
        data: {
          employeeId: employee.id,
          medicalExams,
          documents,
          defaultBenefits: benefits,
          posPermissions: posPerms,
        },
      });
      toast.success("Prontuário atualizado com sucesso!");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar prontuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAsoHealthStatus = (validUntil: string) => {
    if (!validUntil) return { label: "Sem Validade", color: "text-muted-foreground bg-muted" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = validUntil.split("-").map(Number);
    const expiry = new Date(y, m - 1, d);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Vencido há ${Math.abs(diffDays)}d`,
        color: "bg-destructive/10 text-destructive border-destructive/30",
        isAlert: true,
      };
    }
    if (diffDays <= 30) {
      return {
        label: `Expira em ${diffDays}d`,
        color: "bg-warning/10 text-warning-strong border-warning/30",
        isAlert: true,
      };
    }
    return {
      label: `Válido (${diffDays}d)`,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      isAlert: false,
    };
  };

  if (!employee) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col p-0 gap-0 bg-card border-l border-border overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FolderOpen className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base font-bold text-foreground">
                  {employee.full_name}
                </SheetTitle>
                <Badge variant="outline" className="text-xs uppercase font-semibold">
                  {employee.employment_type}
                </Badge>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                {employee.job_title} • Salário Base: {formatMoney(employee.base_salary_cents)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto sm:h-11 min-h-11 gap-1 p-1">
              <TabsTrigger value="aso" className="text-xs font-semibold gap-2 focus-visible:ring-2">
                <Activity className="size-3.5" />
                <span>ASO</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold gap-2 focus-visible:ring-2">
                <FileText className="size-3.5" />
                <span>Pastas</span>
              </TabsTrigger>
              <TabsTrigger value="benefits" className="text-xs font-semibold gap-2 focus-visible:ring-2">
                <DollarSign className="size-3.5" />
                <span>Benefícios</span>
              </TabsTrigger>
              <TabsTrigger value="pos" className="text-xs font-semibold gap-2 focus-visible:ring-2">
                <MonitorCheck className="size-3.5" />
                <span>PDV / Caixa</span>
              </TabsTrigger>
            </TabsList>

            {/* ── ABA 1: EXAMES OCUPACIONAIS (ASO) ── */}
            <TabsContent value="aso" className="space-y-6 mt-0">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Exames e Validades Ocupacionais
                </h3>

                {medicalExams.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg bg-muted/10 space-y-2">
                    <AlertTriangle className="size-6 text-warning-strong mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum exame ASO cadastrado. Cadastre o exame admissional ou periódico abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {medicalExams.map((exam, idx) => {
                      const health = getAsoHealthStatus(exam.validUntil);
                      return (
                        <div
                          key={exam.id || idx}
                          className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground capitalize">
                                ASO {exam.type.replace(/_/g, " ")}
                              </span>
                              <Badge variant="outline" className={`text-xs ${health.color}`}>
                                {health.label}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {exam.status === "apt" ? "Apto" : exam.status === "inapt" ? "Inapto" : "Com Restrições"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Realizado em: {exam.examDate} • Vencimento: {exam.validUntil}
                              {exam.clinicName ? ` • Clínica: ${exam.clinicName}` : ""}
                              {exam.doctorCrm ? ` (CRM: ${exam.doctorCrm})` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExam(idx)}
                            className="size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formulário para Inserir ASO */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                <span className="text-xs font-bold text-foreground block">
                  Registrar Novo Exame Ocupacional (ASO)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Exame</Label>
                    <Select
                      value={newExam.type}
                      onValueChange={(v: any) => setNewExam((prev) => ({ ...prev, type: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admissional">Admissional</SelectItem>
                        <SelectItem value="periodico">Periódico</SelectItem>
                        <SelectItem value="demissional">Demissional</SelectItem>
                        <SelectItem value="retorno_ao_trabalho">Retorno ao Trabalho</SelectItem>
                        <SelectItem value="mudanca_funcao">Mudança de Função</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Resultado / Aptidão</Label>
                    <Select
                      value={newExam.status}
                      onValueChange={(v: any) => setNewExam((prev) => ({ ...prev, status: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apt">Apto</SelectItem>
                        <SelectItem value="apt_with_restrictions">Apto com Restrições</SelectItem>
                        <SelectItem value="inapt">Inapto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data de Realização</Label>
                    <Input
                      type="date"
                      value={newExam.examDate}
                      onChange={(e) => setNewExam((prev) => ({ ...prev, examDate: e.target.value }))}
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data de Validade (Vencimento)</Label>
                    <Input
                      type="date"
                      value={newExam.validUntil}
                      onChange={(e) => setNewExam((prev) => ({ ...prev, validUntil: e.target.value }))}
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Clínica / Laboratório (Opcional)</Label>
                    <Input
                      value={newExam.clinicName}
                      onChange={(e) => setNewExam((prev) => ({ ...prev, clinicName: e.target.value }))}
                      placeholder="Ex: Medicina do Trabalho Chapecó"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">CRM do Médico (Opcional)</Label>
                    <Input
                      value={newExam.doctorCrm}
                      onChange={(e) => setNewExam((prev) => ({ ...prev, doctorCrm: e.target.value }))}
                      placeholder="Ex: CRM-SC 12345"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddExam}
                  className="w-full h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Adicionar Exame ao Prontuário</span>
                </Button>
              </div>
            </TabsContent>

            {/* ── ABA 2: DOCUMENTOS & PASTAS ── */}
            <TabsContent value="documents" className="space-y-6 mt-0">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pastas de Documentos e Ficha Funcional
                </h3>

                {documents.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-lg bg-muted/10 space-y-2">
                    <FileText className="size-6 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum documento anexado. Cadastre RG/CPF, CTPS, Contrato ou Atestados abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{doc.title}</span>
                            <Badge variant="outline" className="text-xs uppercase">
                              {doc.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploadedAt ? `Adicionado em: ${doc.uploadedAt} ` : ""}
                            {doc.notes ? `• ${doc.notes}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="size-11 min-h-11 flex items-center justify-center text-primary hover:underline rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(idx)}
                            className="size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulário Novo Documento */}
              <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
                <span className="text-xs font-bold text-foreground block">
                  Anexar Novo Documento ao Prontuário
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={newDoc.category}
                      onValueChange={(v: any) => setNewDoc((prev) => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rg_cpf">RG / CPF / Documento</SelectItem>
                        <SelectItem value="ctps">CTPS / Carteira de Trabalho</SelectItem>
                        <SelectItem value="contract">Contrato de Trabalho</SelectItem>
                        <SelectItem value="residence">Comprovante de Residência</SelectItem>
                        <SelectItem value="medical_leave">Atestado Médico</SelectItem>
                        <SelectItem value="aso">Comprovante ASO</SelectItem>
                        <SelectItem value="other">Outros Documentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Título / Descrição</Label>
                    <Input
                      value={newDoc.title}
                      onChange={(e) => setNewDoc((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Cópia RG e CPF assinado"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">URL do Arquivo / Nuvem</Label>
                    <Input
                      value={newDoc.fileUrl}
                      onChange={(e) => setNewDoc((prev) => ({ ...prev, fileUrl: e.target.value }))}
                      placeholder="https://exemplo.com/documento.pdf"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddDoc}
                  className="w-full h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Anexar Documento</span>
                </Button>
              </div>
            </TabsContent>

            {/* ── ABA 3: BENEFÍCIOS FIXOS ── */}
            <TabsContent value="benefits" className="space-y-6 mt-0">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Configuração de Benefícios Recorrentes (Folha de Pagamento)
                </span>

                {/* Vale Transporte */}
                <div className="p-4 rounded-lg border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Vale Transporte (VT)</span>
                    <p className="text-xs text-muted-foreground">
                      Dedução legal de até 6% do salário base para cobertura do transporte diário.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={benefits.vtEnabled}
                      onCheckedChange={(c) => setBenefits((p) => ({ ...p, vtEnabled: c }))}
                    />
                    {benefits.vtEnabled && (
                      <Input
                        type="number"
                        placeholder="R$ / mês"
                        value={benefits.vtMonthlyCents ? benefits.vtMonthlyCents / 100 : ""}
                        onChange={(e) =>
                          setBenefits((p) => ({
                            ...p,
                            vtMonthlyCents: Math.round((parseFloat(e.target.value) || 0) * 100),
                          }))
                        }
                        className="h-11 w-32 rounded-lg text-xs font-mono"
                      />
                    )}
                  </div>
                </div>

                {/* Vale Refeição / Alimentação */}
                <div className="p-4 rounded-lg border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Vale Refeição / Alimentação (VR/VA)</span>
                    <p className="text-xs text-muted-foreground">
                      Auxílio alimentação fornecido pela empresa com coparticipação legal.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={benefits.vrEnabled}
                      onCheckedChange={(c) => setBenefits((p) => ({ ...p, vrEnabled: c }))}
                    />
                    {benefits.vrEnabled && (
                      <Input
                        type="number"
                        placeholder="R$ / dia"
                        value={benefits.vrDailyCents ? benefits.vrDailyCents / 100 : ""}
                        onChange={(e) =>
                          setBenefits((p) => ({
                            ...p,
                            vrDailyCents: Math.round((parseFloat(e.target.value) || 0) * 100),
                          }))
                        }
                        className="h-11 w-32 rounded-lg text-xs font-mono"
                      />
                    )}
                  </div>
                </div>

                {/* Plano de Saúde */}
                <div className="p-4 rounded-lg border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Plano de Saúde / Odontológico</span>
                    <p className="text-xs text-muted-foreground">
                      Coparticipação mensal descontada em folha conforme contrato do convênio.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={benefits.healthPlanEnabled}
                      onCheckedChange={(c) => setBenefits((p) => ({ ...p, healthPlanEnabled: c }))}
                    />
                    {benefits.healthPlanEnabled && (
                      <Input
                        type="number"
                        placeholder="R$ / mês"
                        value={benefits.healthPlanCents ? benefits.healthPlanCents / 100 : ""}
                        onChange={(e) =>
                          setBenefits((p) => ({
                            ...p,
                            healthPlanCents: Math.round((parseFloat(e.target.value) || 0) * 100),
                          }))
                        }
                        className="h-11 w-32 rounded-lg text-xs font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── ABA 4: PERMISSÕES DE CAIXA & PDV ── */}
            <TabsContent value="pos" className="space-y-6 mt-0">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Controles Operacionais de Caixa e Venda no PDV
                </span>

                <div className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Abertura de Terminal Próprio</span>
                    <p className="text-xs text-muted-foreground">
                      Permite que o colaborador abra e encerre seu próprio turno de caixa.
                    </p>
                  </div>
                  <Switch
                    checked={posPerms.canOpenDrawer}
                    onCheckedChange={(c) => setPosPerms((p) => ({ ...p, canOpenDrawer: c }))}
                  />
                </div>

                <div className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Cancelamento de Itens Sem PIN</span>
                    <p className="text-xs text-muted-foreground">
                      Se desativado, qualquer cancelamento de item no carrinho exigirá PIN de gerente.
                    </p>
                  </div>
                  <Switch
                    checked={posPerms.canVoidItemWithoutPin}
                    onCheckedChange={(c) => setPosPerms((p) => ({ ...p, canVoidItemWithoutPin: c }))}
                  />
                </div>

                <div className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Desconto Livre no Balcão</span>
                    <p className="text-xs text-muted-foreground">
                      Permite aplicar descontos sem supervisão até o teto máximo percentual.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={posPerms.canGiveDiscountWithoutPin}
                      onCheckedChange={(c) => setPosPerms((p) => ({ ...p, canGiveDiscountWithoutPin: c }))}
                    />
                    {posPerms.canGiveDiscountWithoutPin && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={posPerms.maxDiscountPct}
                          onChange={(e) =>
                            setPosPerms((p) => ({ ...p, maxDiscountPct: parseInt(e.target.value, 10) || 5 }))
                          }
                          className="h-11 w-20 rounded-lg text-xs font-mono"
                        />
                        <span className="text-xs text-muted-foreground font-bold">%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground block">Lançamento de Sangria e Suprimento</span>
                    <p className="text-xs text-muted-foreground">
                      Permite registrar entradas ou saídas manuais de dinheiro na gaveta.
                    </p>
                  </div>
                  <Switch
                    checked={posPerms.canSangriaSuprimento}
                    onCheckedChange={(c) => setPosPerms((p) => ({ ...p, canSangriaSuprimento: c }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="p-6 border-t border-border bg-muted/20 flex flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-lg text-xs font-bold cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
            <span>Salvar Prontuário Digital</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
