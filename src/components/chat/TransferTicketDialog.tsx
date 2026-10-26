import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, Loader2, ShieldAlert } from "lucide-react";
import { transferChatThread } from "@/services/chat.functions";
import { toast } from "sonner";

export interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  currentDepartment?: string;
  departmentLabels?: Record<string, string>;
  onTransferSuccess?: (newDept: string, notes: string) => void;
}

const DEFAULT_DEPARTMENTS: Record<string, string> = {
  vendas: "Vendas / Comercial",
  suporte: "Suporte / SAC",
  financeiro: "Financeiro / Pix",
  cozinha_estoque: "Cozinha / Estoque",
  logistica: "Logística / Motoboy",
  geral: "Triagem Geral",
};

export function TransferTicketDialog({
  open,
  onOpenChange,
  threadId,
  currentDepartment = "geral",
  departmentLabels = DEFAULT_DEPARTMENTS,
  onTransferSuccess,
}: TransferTicketDialogProps) {
  const [targetDept, setTargetDept] = useState("suporte");
  const [contextNotes, setContextNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  React.useEffect(() => {
    if (open) {
      setContextNotes("");
      const initial = currentDepartment === "vendas" ? "suporte" : "vendas";
      setTargetDept(initial);
    }
  }, [open, currentDepartment]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextNotes.trim() || contextNotes.trim().length < 5) {
      toast.error("Informe uma nota de contexto obrigatória (mínimo 5 caracteres) para a próxima equipe.");
      return;
    }

    setIsTransferring(true);
    try {
      await transferChatThread({
        data: {
          threadId,
          toDepartment: targetDept,
          contextNotes: contextNotes.trim(),
        },
      });

      const deptName = departmentLabels[targetDept] || targetDept;
      toast.success(`Conversa transferida com sucesso para o setor ${deptName}!`);
      onOpenChange(false);
      if (onTransferSuccess) {
        onTransferSuccess(targetDept, contextNotes.trim());
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao transferir conversa.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-lg p-6 bg-card border border-border/80">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ArrowRightLeft className="size-5" />
            <DialogTitle className="text-base font-bold text-foreground">
              Transferir Conversa / Ticket
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Encaminhe o atendimento para outra fila ou operador com nota de contexto obrigatória.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="target-dept" className="text-xs font-semibold">
              Departamento / Fila de Destino
            </Label>
            <Select value={targetDept} onValueChange={setTargetDept}>
              <SelectTrigger id="target-dept" className="h-11 min-h-11 rounded-lg text-xs">
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {Object.entries(departmentLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label} {key === currentDepartment ? "(Atual)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transfer-notes" className="text-xs font-semibold">
                Nota de Contexto Obrigatória
              </Label>
              <span className="text-3xs font-mono text-muted-foreground">
                {contextNotes.length} caracteres
              </span>
            </div>
            <Textarea
              id="transfer-notes"
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="Ex.: Cliente solicitou segunda via do boleto; já confirmamos CPF mas precisa de aprovação do financeiro."
              rows={3}
              required
              className="text-xs rounded-lg resize-none p-3 bg-muted/20"
            />
            <div className="flex items-center gap-2 text-2xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="size-3.5 shrink-0" />
              <span>Esta nota será registrada como nota interna (whisper) e ficará visível apenas para os atendentes.</span>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isTransferring || contextNotes.trim().length < 5}
              className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 cursor-pointer shadow-xs"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Transferindo...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="size-4" />
                  <span>Confirmar Transferência</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
