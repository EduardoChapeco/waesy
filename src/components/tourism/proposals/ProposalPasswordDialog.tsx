import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Globe, KeyRound, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import type { ProposalVisibilityMode } from "@/lib/tourism/proposal-security";
import { cn } from "@/lib/utils";

interface ProposalPasswordDialogProps {
  proposal: TravelProposalDTO | null;
  isSaving?: boolean;
  onClose: () => void;
  onSaveSecurity: (params: {
    id: string;
    visibility_mode: ProposalVisibilityMode;
    access_pin?: string | null;
    is_hidden?: boolean;
  }) => Promise<void> | void;
}

export function ProposalPasswordDialog({
  proposal,
  isSaving = false,
  onClose,
  onSaveSecurity,
}: ProposalPasswordDialogProps) {
  const [visibilityMode, setVisibilityMode] = useState<ProposalVisibilityMode>("public");
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (!proposal) return;
    setVisibilityMode(proposal.visibility_mode || (proposal.has_access_pin ? "password" : "public"));
    setPinInput("");
    setShowPin(false);
  }, [proposal]);

  if (!proposal) return null;

  const generateRandomPin = () => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setPinInput(code);
    setVisibilityMode("password");
    setShowPin(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visibilityMode === "password") {
      if (!pinInput.trim() && !proposal.has_access_pin) {
        return;
      }
      await onSaveSecurity({
        id: proposal.id,
        visibility_mode: "password",
        ...(pinInput.trim() ? { access_pin: pinInput.trim() } : {}),
      });
    } else {
      await onSaveSecurity({
        id: proposal.id,
        visibility_mode: visibilityMode,
        access_pin: null,
      });
    }
    onClose();
  };

  const modes: Array<{
    id: ProposalVisibilityMode;
    label: string;
    hint: string;
    icon: React.ElementType;
  }> = [
    {
      id: "public",
      label: "Pública",
      hint: "Qualquer pessoa com o link visualiza a proposta.",
      icon: Globe,
    },
    {
      id: "link_only",
      label: "Somente Link",
      hint: "Sem indexação pública; apenas quem receber o link.",
      icon: ShieldCheck,
    },
    {
      id: "password",
      label: "Só com Senha",
      hint: "Exige PIN digitado pelo cliente antes de abrir os valores.",
      icon: KeyRound,
    },
    {
      id: "private",
      label: "Privada",
      hint: "Bloqueia o acesso externo imediatamente (uso interno).",
      icon: Lock,
    },
  ];

  const pinRequiredMissing =
    visibilityMode === "password" && !pinInput.trim() && !proposal.has_access_pin;

  return (
    <Dialog open={Boolean(proposal)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Privacidade e Senha da Proposta
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words whitespace-normal">
            {proposal.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const active = visibilityMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setVisibilityMode(mode.id)}
                  className={cn(
                    "w-full min-h-11 p-3 rounded-xl border text-left flex items-start gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/70 bg-background hover:bg-muted/40 text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 mt-1",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{mode.label}</span>
                      {active && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground break-words whitespace-normal">
                      {mode.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {visibilityMode === "password" && (
            <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="proposal-pin-input" className="text-xs font-semibold text-foreground">
                  {proposal.has_access_pin ? "Novo PIN de Acesso (opcional para manter atual)" : "Definir PIN de Acesso"}
                </Label>
                <button
                  type="button"
                  onClick={generateRandomPin}
                  className="min-h-11 px-2 text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Gerar 4 dígitos</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id="proposal-pin-input"
                  type={showPin ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  maxLength={32}
                  placeholder={proposal.has_access_pin ? "PIN já configurado (digite para alterar)" : "Ex: 4820"}
                  className="h-11 min-h-11 font-mono tracking-wider"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Ocultar senha" : "Mostrar senha"}
                  className="size-11 min-h-11 min-w-11 shrink-0 p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {pinRequiredMissing && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Informe ou gere um PIN para ativar a proteção por senha.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || pinRequiredMissing}
              className="h-11 min-h-11 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSaving ? "Salvando..." : "Aplicar Acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
