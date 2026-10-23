/**
 * pax-anamnesis-card.tsx — Card de Acessibilidade PCD, Anamnese e Blindagem de Documentos
 * NORMAS: AGENTS.md (B.1 a B.41), Apple HIG, WCAG 2.2 AA
 */

import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  HeartHandshake,
  Utensils,
  AlertCircle,
  FileCheck,
  Edit3,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  type PaxAnamnesisDTO,
  type IataPcdAssistanceCode,
  type DietaryRestrictionCode,
  validatePaxDocumentMutationPermission,
  auditPaxFlightReadiness,
} from "@/lib/travel/pax-anamnesis-and-accessibility";
import { updatePaxAccessibilityAndAnamnesis } from "@/services/travel-pax-anamnesis.functions";

interface PaxAnamnesisCardProps {
  anamnesis: PaxAnamnesisDTO;
  isStaffOrAgent?: boolean;
  onUpdateSuccess?: () => void;
}

export function PaxAnamnesisCard({
  anamnesis,
  isStaffOrAgent = false,
  onUpdateSuccess,
}: PaxAnamnesisCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: anamnesis.fullName,
    documentType: anamnesis.documentType,
    documentNumber: anamnesis.documentNumber,
    birthDate: anamnesis.birthDate,
    nationality: anamnesis.nationality,
    allergiesNotes: anamnesis.allergiesNotes || "",
    emergencyName: anamnesis.emergencyContact?.name || "",
    emergencyPhone: anamnesis.emergencyContact?.phone || "",
    emergencyRelationship: anamnesis.emergencyContact?.relationship || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const permission = validatePaxDocumentMutationPermission({
    currentStatus: anamnesis.documentStatus,
    isStaffOrAgent,
  });

  const flightReadiness = auditPaxFlightReadiness(anamnesis);

  const isLocked =
    anamnesis.documentStatus === "agent_homologated" ||
    anamnesis.documentStatus === "locked_immutable";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.allowed) {
      toast.error(permission.reason || "Documento blindado para edição.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePaxAccessibilityAndAnamnesis({
        data: {
          paxId: anamnesis.paxId,
          tripId: anamnesis.tripId,
          fullName: formData.fullName,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          birthDate: formData.birthDate,
          nationality: formData.nationality,
          pcdAssistanceCodes: anamnesis.pcdAssistanceCodes,
          requiresCompanion: anamnesis.requiresCompanion,
          medicalClearanceRequired: anamnesis.medicalClearanceRequired,
          dietaryRestrictions: anamnesis.dietaryRestrictions,
          allergiesNotes: formData.allergiesNotes || null,
          emergencyContact: {
            name: formData.emergencyName,
            phone: formData.emergencyPhone,
            relationship: formData.emergencyRelationship,
          },
        },
      });

      toast.success("Dados de acessibilidade e documentos atualizados com sucesso.");
      setIsModalOpen(false);
      onUpdateSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar dados.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 rounded-lg border border-border bg-card space-y-4 shadow-sm">
      {/* Header do Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <HeartHandshake className="size-5 text-primary shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-foreground">Acessibilidade PCD & Anamnese</h2>
            <p className="text-xs text-muted-foreground">Assistência especial PNAE e conformidade IATA</p>
          </div>
        </div>

        {/* Badge de Status do Documento */}
        {isLocked ? (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs flex items-center gap-1.5 py-1 px-2.5">
            <Lock className="size-3.5 shrink-0" />
            <span>Documentos Blindados & Homologados</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs flex items-center gap-1.5 py-1 px-2.5">
            <FileCheck className="size-3.5 shrink-0" />
            <span>Em Validação Documental</span>
          </Badge>
        )}
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Assistência IATA PCD */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
          <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
            <HeartHandshake className="size-3.5 text-primary shrink-0" />
            Códigos de Assistência PNAE (IATA)
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {anamnesis.pcdAssistanceCodes.map((code) => (
              <Badge key={code} variant="outline" className="text-xs font-mono font-bold bg-background">
                {code}
              </Badge>
            ))}
            {anamnesis.requiresCompanion && (
              <Badge variant="secondary" className="text-xs">
                Acompanhante Obrigatório
              </Badge>
            )}
            {anamnesis.medicalClearanceRequired && (
              <Badge variant="destructive" className="text-xs">
                Laudo MEDIF Requerido
              </Badge>
            )}
          </div>
        </div>

        {/* Restrições Alimentares */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
          <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
            <Utensils className="size-3.5 text-primary shrink-0" />
            Regime Alimentar & Alergias
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {anamnesis.dietaryRestrictions.map((diet) => (
              <Badge key={diet} variant="outline" className="text-xs capitalize bg-background">
                {diet.replace("_", " ")}
              </Badge>
            ))}
          </div>
          {anamnesis.allergiesNotes && (
            <p className="text-xs text-muted-foreground break-words pt-1">
              Nota: {anamnesis.allergiesNotes}
            </p>
          )}
        </div>
      </div>

      {/* Alertas de Voo / Prontidão */}
      {flightReadiness.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>Atenção Operacional da Companhia Aérea</span>
          </div>
          {flightReadiness.warnings.map((w, idx) => (
            <p key={idx} className="leading-relaxed break-words">{w}</p>
          ))}
        </div>
      )}

      {flightReadiness.blockers.length > 0 && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>Pendências para Liberação de Embarque</span>
          </div>
          {flightReadiness.blockers.map((b, idx) => (
            <p key={idx} className="leading-relaxed break-words">{b}</p>
          ))}
        </div>
      )}

      {/* Ações / Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          {isLocked ? (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              Dados imutáveis validados por agente credenciado
            </span>
          ) : (
            <span>Edição permitida até a homologação final da emissão</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {anamnesis.appleWalletPassUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold focus-visible:ring-2"
            >
              <a href={anamnesis.appleWalletPassUrl} target="_blank" rel="noopener noreferrer">
                <Wallet className="size-4 mr-1.5" />
                Apple Wallet
              </a>
            </Button>
          )}

          <Button
            variant={permission.allowed ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (permission.allowed) {
                setIsModalOpen(true);
              } else {
                toast.info("Para alterar dados em passaporte ou RG blindado, entre em contato com o suporte da agência.");
              }
            }}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:ring-2 cursor-pointer"
          >
            <Edit3 className="size-4 mr-1.5" />
            {permission.allowed ? "Editar Ficha & PCD" : "Solicitar Alteração"}
          </Button>
        </div>
      </div>

      {/* Diálogo de Edição de Anamnese */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-lg p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold">Atualizar Anamnese & Documentos</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha os dados oficiais de identificação do passageiro conforme o documento de viagem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome Completo</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Número do Documento</Label>
                <Input
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas de Alergias ou Dieta Restritiva</Label>
              <Input
                value={formData.allergiesNotes}
                onChange={(e) => setFormData({ ...formData, allergiesNotes: e.target.value })}
                placeholder="Ex: alergia a frutos do mar, intolerância a glúten"
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <span className="text-xs font-semibold text-foreground">Contato de Emergência</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Nome"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg col-span-1"
                />
                <Input
                  placeholder="Telefone"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg col-span-1"
                />
                <Input
                  placeholder="Parentesco"
                  value={formData.emergencyRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg col-span-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold"
              >
                {isSubmitting ? "Gravando..." : "Salvar Dados"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
