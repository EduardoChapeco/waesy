import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminUpdateUserGovernanceFn } from "@/services/vertical-subsystems.functions";

const USER_MODULE_CATALOG = [
  { key: "marketplace", label: "Waesy Marketplace" },
  { key: "classifieds", label: "Classificados & Anúncios" },
  { key: "news", label: "Portal de Notícias" },
  { key: "mobility", label: "Waesy Go (Mobilidade)" },
  { key: "copilot", label: "Assessor Copilot IA" },
  { key: "module_omnichannel_whatsapp", label: "Chat & CRM WhatsApp" },
  { key: "module_financial_erp", label: "Financeiro & ERP" },
  { key: "module_tourism_studio", label: "Turis & Propostas" },
  { key: "module_food_delivery", label: "Gastronomia & KDS" },
];

interface UserGovernanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  onSaved: () => void;
}

export function UserGovernanceModal({
  open,
  onOpenChange,
  user,
  onSaved,
}: UserGovernanceModalProps) {
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending" | "rejected" | "suspended">("approved");
  const [userPlanTier, setUserPlanTier] = useState<"free" | "starter" | "professional" | "enterprise" | "WAESY_MAX">("free");
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setApprovalStatus((user.approval_status || "approved") as any);
    setUserPlanTier((user.user_plan_tier || "free") as any);
    setDisabledModules(Array.isArray(user.disabled_modules) ? user.disabled_modules : []);
    setEnabledModules(Array.isArray(user.enabled_modules) ? user.enabled_modules : []);
    setNotes(user.approval_notes || "");
  }, [user]);

  const handleToggleModule = (moduleKey: string, allow: boolean) => {
    if (allow) {
      setDisabledModules((prev) => prev.filter((m) => m !== moduleKey));
      setEnabledModules((prev) => (prev.includes(moduleKey) ? prev : [...prev, moduleKey]));
    } else {
      setEnabledModules((prev) => prev.filter((m) => m !== moduleKey));
      setDisabledModules((prev) => (prev.includes(moduleKey) ? prev : [...prev, moduleKey]));
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await adminUpdateUserGovernanceFn({
        data: {
          userId: user.id,
          approvalStatus,
          userPlanTier,
          enabledModules,
          disabledModules,
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Governança, plano e módulos do usuário salvos.");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar governança do usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="size-5 text-primary" />
            <span>Plano, Aprovação &amp; Módulos do Usuário</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Controle manual exclusivo do Admin Master para {user?.full_name || user?.email || "Usuário"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Status de Aprovação</Label>
              <Select value={approvalStatus} onValueChange={(v) => setApprovalStatus(v as any)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved" className="text-xs">Aprovado (Ativo)</SelectItem>
                  <SelectItem value="pending" className="text-xs">Pendente / Em Análise</SelectItem>
                  <SelectItem value="suspended" className="text-xs">Suspenso / Oculto</SelectItem>
                  <SelectItem value="rejected" className="text-xs">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Plano Individual (Manual Master)</Label>
              <Select value={userPlanTier} onValueChange={(v) => setUserPlanTier(v as any)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free" className="text-xs">Gratuito (Free)</SelectItem>
                  <SelectItem value="starter" className="text-xs">Starter</SelectItem>
                  <SelectItem value="professional" className="text-xs">Pro</SelectItem>
                  <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  <SelectItem value="WAESY_MAX" className="text-xs">Waesy Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Visibilidade e Acesso a Módulos</span>
            </Label>
            <div className="rounded-lg border border-border divide-y divide-border/50">
              {USER_MODULE_CATALOG.map((mod) => {
                const isAllowed = !disabledModules.includes(mod.key);
                return (
                  <div key={mod.key} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{mod.label}</p>
                      <p className="text-2xs font-mono text-muted-foreground">{mod.key}</p>
                    </div>
                    <Switch
                      checked={isAllowed}
                      onCheckedChange={(checked) => handleToggleModule(mod.key, checked)}
                      aria-label={`Alternar módulo ${mod.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Notas de Auditoria (Master)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Justificativa para alteração de plano ou suspensão..."
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 min-h-11 px-4 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 min-h-11 px-5 text-xs font-semibold gap-2"
          >
            {isSaving && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />}
            <span>Salvar Governança</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
