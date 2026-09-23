import React, { useState } from "react";
import { Building2, ShieldCheck, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { claimDirectoryListingFn } from "@/services/directory.functions";

interface ClaimBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  businessName: string;
  onSuccess?: (storeId?: string) => void;
}

export function ClaimBusinessModal({
  isOpen,
  onClose,
  listingId,
  businessName,
  onSuccess,
}: ClaimBusinessModalProps) {
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("Proprietário(a)");
  const [contactPhone, setContactPhone] = useState("");
  const [document, setDocument] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimedStoreId, setClaimedStoreId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Preencha seu nome e telefone/WhatsApp de contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await claimDirectoryListingFn({
        data: {
          listingId,
          contactName: contactName.trim(),
          contactRole: contactRole.trim(),
          contactPhone: contactPhone.trim(),
          document: document.trim() || undefined,
        },
      });

      toast.success(res.message);
      if (res.storeId) {
        setClaimedStoreId(res.storeId);
      }
      onSuccess?.(res.storeId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao reivindicar perfil da empresa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border/50">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Building2 className="w-5 h-5" />
            </span>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Reivindicar Perfil Comercial
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirme que você é o proprietário ou representante legal de{" "}
            <strong className="text-foreground">"{businessName}"</strong> para assumir a gestão, ativar delivery, catálogo e agendamentos.
          </DialogDescription>
        </DialogHeader>

        {claimedStoreId ? (
          <div className="py-6 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Perfil Reivindicado com Sucesso!
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Sua empresa agora está verificada e associada à sua conta no Waesy.
            </p>
            <div className="pt-2">
              <Button asChild className="rounded-xl font-medium w-full">
                <a href={`/workspace`}>
                  Ir para o Painel de Gestão
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Seu Nome Completo *
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="h-10 text-xs rounded-xl bg-background"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Seu Vínculo / Cargo *
                </label>
                <select
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value="Proprietário(a)">Proprietário(a)</option>
                  <option value="Sócio(a)">Sócio(a)</option>
                  <option value="Gerente Geral">Gerente Geral</option>
                  <option value="Advogado(a)">Advogado(a)</option>
                  <option value="Outro Representante">Outro Representante</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  WhatsApp / Celular *
                </label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(49) 99999-0000"
                  className="h-10 text-xs rounded-xl bg-background"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                CNPJ da Empresa ou CPF (Opcional)
              </label>
              <Input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="h-10 text-xs rounded-xl bg-background"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Confirmar Reivindicação
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
