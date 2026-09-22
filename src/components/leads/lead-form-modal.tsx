/**
 * lead-form-modal.tsx — Modal / Bottom-Sheet para Captura de Leads Vinculada a Anúncios e Viagens
 * Ativação por Clique ou Rolagem (Scroll Trigger 50%)
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LeadFormDTO, getPublicLeadFormBySlug } from "@/services/lead-forms.functions";
import { LeadFormRenderer } from "./lead-form-renderer";
import { Loader2 } from "lucide-react";

interface LeadFormModalProps {
  formSlug?: string | null;
  formId?: string | null;
  initialForm?: LeadFormDTO | null;
  classifiedId?: string | null;
  classifiedTitle?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerScrollPct?: number | null; // e.g. 50%
}

export function LeadFormModal({
  formSlug,
  initialForm,
  classifiedId,
  classifiedTitle,
  isOpen,
  onOpenChange,
  triggerScrollPct,
}: LeadFormModalProps) {
  const [form, setForm] = useState<LeadFormDTO | null>(initialForm || null);
  const [loading, setLoading] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Busca o formulário se apenas o slug tiver sido fornecido
  useEffect(() => {
    if (isOpen && formSlug && !form) {
      setLoading(true);
      getPublicLeadFormBySlug({ data: { slug: formSlug } })
        .then((res) => {
          if (res) setForm(res);
        })
        .catch((err) => {
          console.error("[LeadFormModal] Erro ao carregar form:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, formSlug, form]);

  // Listener para gatilho de rolagem (Scroll Trigger) se configurado
  useEffect(() => {
    if (!triggerScrollPct || hasAutoOpened || isOpen) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const currentPct = (scrollTop / docHeight) * 100;
      if (currentPct >= triggerScrollPct) {
        setHasAutoOpened(true);
        onOpenChange(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [triggerScrollPct, hasAutoOpened, isOpen, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 sm:p-7 rounded-2xl border border-border/60 bg-card overflow-y-auto max-h-[90vh]">
        <DialogHeader className="text-left space-y-1.5 pb-2 border-b border-border/40">
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            {form?.headline || form?.title || "Falar com o Anunciante"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {form?.subheadline ||
              (classifiedTitle
                ? `Referente a: ${classifiedTitle}`
                : "Preencha seus dados para receber atendimento imediato.")}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Carregando formulário...</p>
            </div>
          ) : form ? (
            <LeadFormRenderer
              form={form}
              classifiedId={classifiedId}
              onSuccess={() => {
                // Mantém aberto para o usuário ver o botão de WhatsApp ou fechar quando quiser
              }}
            />
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Formulário indisponível no momento.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
