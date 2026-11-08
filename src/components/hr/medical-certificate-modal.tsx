import React, { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ShieldCheck, Stethoscope, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { registerMedicalCertificate, type StoreEmployeeDTO } from "@/services/hr.functions";

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: StoreEmployeeDTO[];
  onSuccess?: () => void;
  preselectedEmployeeId?: string;
}

export function MedicalCertificateModal({
  isOpen,
  onClose,
  employees,
  onSuccess,
  preselectedEmployeeId,
}: MedicalCertificateModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState(preselectedEmployeeId || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [daysCount, setDaysCount] = useState("1");
  const [cidCode, setCidCode] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorCrm, setDoctorCrm] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const empId = selectedEmpId || preselectedEmployeeId;
    if (!empId) {
      toast.error("Selecione o colaborador.");
      return;
    }
    const days = parseInt(daysCount, 10);
    if (isNaN(days) || days < 1) {
      toast.error("Informe a quantidade de dias do atestado.");
      return;
    }
    if (!description.trim()) {
      toast.error("Informe a justificativa ou descrição do atestado.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerMedicalCertificate({
        data: {
          employeeId: empId,
          startDate,
          endDate,
          daysCount: days,
          cidCode: cidCode.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
          doctorCrm: doctorCrm.trim() || undefined,
          clinicName: clinicName.trim() || undefined,
          description: description.trim(),
        },
      });

      toast.success(
        `Atestado de ${days} dia(s) registrado com sucesso! Faltas no período foram abonadas pelo RH.`,
      );
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao registrar atestado médico.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-lg border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Stethoscope className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Lançar Atestado Médico / Abono
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registro oficial de afastamento médico com abono de faltas e proteção do DSR.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção do Colaborador */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Colaborador</Label>
            <Select
              value={selectedEmpId || preselectedEmployeeId || ""}
              onValueChange={setSelectedEmpId}
              disabled={Boolean(preselectedEmployeeId)}
            >
              <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-background">
                <SelectValue placeholder="Selecione o colaborador..." />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    {emp.full_name} ({emp.job_title})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período e Dias */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-mono bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Término</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-mono bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Dias Afastado</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={daysCount}
                onChange={(e) => setDaysCount(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-mono bg-background"
              />
            </div>
          </div>

          {/* Dados Clínicos & Legais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">CID-10 (Opcional)</Label>
              <Input
                placeholder="Ex: J06.9, M54.5"
                value={cidCode}
                onChange={(e) => setCidCode(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs font-mono bg-background uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">CRM do Médico</Label>
              <Input
                placeholder="Ex: 12345/SC"
                value={doctorCrm}
                onChange={(e) => setDoctorCrm(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Nome do Médico</Label>
              <Input
                placeholder="Ex: Dr. Roberto Silva"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>

          {/* Clínica / Hospital e Justificativa */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Clínica / Hospital Emissor</Label>
            <Input
              placeholder="Ex: Hospital Regional do Oeste / UPA 24h"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Motivo / Observações do RH</Label>
            <Textarea
              placeholder="Ex: Colaborador apresentou atestado com dispensa médica para repouso e tratamento de síndrome gripal."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg text-xs bg-background resize-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
            <p>
              Em conformidade com a CLT (Art. 473) e Portaria MTE, os primeiros 15 dias de afastamento
              médico comprovado são remunerados integralmente pelo empregador sem desconto de DSR.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 min-h-11 rounded-lg text-xs px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-3.5" />
                <span>Salvar Atestado & Abonar</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
