/**
 * lead-form-modal.tsx — Modal / Bottom-Sheet para Captura de Leads Vinculada a Anúncios e Viagens
 * Ativação por Clique ou Rolagem (Scroll Trigger 50%)
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LeadFormDTO, getPublicLeadFormBySlug } from "@/services/lead-forms.functions";
import { CivilInquiryConfig } from "@/types/unified-ad-engine";
import { LeadFormRenderer } from "./lead-form-renderer";
import { Loader2 } from "lucide-react";

interface LeadFormModalProps {
  formSlug?: string | null;
  formId?: string | null;
  initialForm?: LeadFormDTO | null;
  civilInquiryConfig?: CivilInquiryConfig | null;
  currentProfile?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
  classifiedId?: string | null;
  classifiedTitle?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerScrollPct?: number | null; // e.g. 50%
  onStartSdrChat?: (payload: { answers: Record<string, any>; name: string; phone: string }) => void;
}

export function LeadFormModal({
  formSlug,
  initialForm,
  civilInquiryConfig,
  currentProfile,
  classifiedId,
  classifiedTitle,
  isOpen,
  onOpenChange,
  triggerScrollPct,
  onStartSdrChat,
}: LeadFormModalProps) {
  const [form, setForm] = useState<LeadFormDTO | null>(initialForm || null);
  const [loading, setLoading] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Inicializa a partir de configuração civil quando habilitado
  useEffect(() => {
    if (civilInquiryConfig?.enabled) {
      const virtualForm: LeadFormDTO = {
        id: "civil-form",
        store_id: "",
        title: civilInquiryConfig.title || "Tenho Interesse neste Anúncio",
        slug: `civil-${classifiedId || "direct"}`,
        headline: civilInquiryConfig.title || "Tenho Interesse",
        subheadline: civilInquiryConfig.subtitle || "Responda algumas perguntas rápidas para receber proposta personalizada.",
        submit_button_text: "Enviar Mensagem",
        after_submit_action: civilInquiryConfig.activate_sdr_ai ? "start_sdr_chat" : "message",
        whatsapp_phone: null,
        success_message: "Seus dados foram enviados diretamente para o vendedor!",
        is_active: true,
        fields: (civilInquiryConfig.questions || []).map((q, idx) => ({
          id: q.id,
          form_id: "civil-form",
          field_key: `civil_q_${idx}_${q.id}`,
          label: q.label,
          field_type: (q.type === "currency" ? "currency" : q.type === "select" ? "select" : q.type === "textarea" ? "textarea" : "text") as any,
          placeholder: q.placeholder || "",
          is_required: q.required ?? true,
          position: idx,
          options: q.options || null,
        })),
      };
      setForm(virtualForm);
    }
  }, [civilInquiryConfig, classifiedId]);

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
      <DialogContent className="max-w-md p-6 sm:p-7 rounded-lg border border-border/60 bg-card overflow-y-auto max-h-[90vh]">
        <DialogHeader className="text-left space-y-2 pb-2 border-b border-border/40">
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
              initialProfile={currentProfile}
              onStartSdrChat={(payload) => {
                onOpenChange(false);
                onStartSdrChat?.(payload);
              }}
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
