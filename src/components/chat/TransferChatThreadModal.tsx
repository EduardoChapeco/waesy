import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assignChatThread } from "@/services/chat.functions";
import { toast } from "sonner";
import { UserCheck, ArrowRightLeft, Loader2, Building2 } from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

interface TransferChatThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  currentDepartment: string;
  currentAgentId?: string | null;
  departmentLabels: Record<string, string>;
  teamMembers?: TeamMember[];
  onSuccess: (newDept: string, newAgentId?: string | null) => void;
}

export function TransferChatThreadModal({
  isOpen,
  onClose,
  threadId,
  currentDepartment,
  currentAgentId,
  departmentLabels,
  teamMembers = [],
  onSuccess,
}: TransferChatThreadModalProps) {
  const [department, setDepartment] = useState(currentDepartment || "geral");
  const [assignedAgentId, setAssignedAgentId] = useState<string>(currentAgentId || "unassigned");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [internalNotes, setInternalNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!threadId) return;

    try {
      setIsTransferring(true);
      const agentId = assignedAgentId === "unassigned" ? null : assignedAgentId;

      await assignChatThread({
        data: {
          threadId,
          department,
          assigned_to_profile_id: agentId,
          priority,
          internal_notes: internalNotes.trim() || undefined,
        },
      });

      toast.success("Conversa transferida com sucesso.");
      onSuccess(department, agentId);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao transferir conversa.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowRightLeft className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Transferir Atendimento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Reatribua a conversa para outro departamento ou atendente com nota de contexto.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selecionar Departamento */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Building2 className="size-3.5 text-primary" />
              <span>Departamento de Destino</span>
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(departmentLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selecionar Atendente */}
          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="size-3.5 text-primary" />
                <span>Atendente Responsável</span>
              </Label>
              <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                <SelectTrigger className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary">
                  <SelectValue placeholder="Qualquer atendente da fila" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="unassigned" className="text-xs">
                    Fila Geral (Não atribuído a ninguém)
                  </SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-xs">
                      {member.full_name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Prioridade */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Prioridade do Atendimento
            </Label>
            <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
              <SelectTrigger className="h-11 rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="low" className="text-xs">Baixa</SelectItem>
                <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                <SelectItem value="high" className="text-xs">Alta</SelectItem>
                <SelectItem value="urgent" className="text-xs">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nota Interna de Transição */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Nota Interna de Transição (Privada)
            </Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Ex: Cliente quer tirar dúvidas sobre lote de ingressos ou faturamento Pix..."
              rows={3}
              className="rounded-xl text-xs focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
            <span className="text-xs text-muted-foreground block">
              Essa nota será visível apenas para os atendentes da equipe.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isTransferring}
            className="h-11 rounded-xl text-xs font-semibold px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleTransfer}
            disabled={isTransferring}
            className="h-11 rounded-xl text-xs font-semibold px-5 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isTransferring && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
            <span>Confirmar Transferência</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
