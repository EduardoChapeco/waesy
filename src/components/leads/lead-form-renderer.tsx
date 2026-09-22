/**
 * lead-form-renderer.tsx — Renderizador Universal de Formulários de Captura e Registro Rápido
 * Design System Clean / Apple HIG | 100% Bilateral | Zero Mocks
 */

import React, { useState, useEffect } from "react";
import { LeadFormDTO, LeadFormFieldDTO, submitPublicLeadForm } from "@/services/lead-forms.functions";
import { formatPhone } from "@/lib/document-validator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, ArrowRight, MessageSquare, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface LeadFormRendererProps {
  form: LeadFormDTO;
  fields?: LeadFormFieldDTO[];
  classifiedId?: string | null;
  onSuccess?: (res: any) => void;
  isStandalone?: boolean;
}

export function LeadFormRenderer({
  form,
  fields = form.fields || [],
  classifiedId,
  onSuccess,
  isStandalone = false,
}: LeadFormRendererProps) {
  // Estados de identificação básica
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Respostas dinâmicas mapeadas por field_key
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    afterSubmitAction: string;
    whatsappUrl?: string | null;
    redirectUrl?: string | null;
    successMessage: string;
    isNewRegisteredUser: boolean;
  } | null>(null);

  // Inicializa respostas padrão
  useEffect(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.field_type === "checkbox") {
        initial[f.field_key] = false;
      } else if (f.field_type === "select" && f.options && f.options.length > 0) {
        // não força seleção inicial
      }
    });
    setAnswers((prev) => ({ ...initial, ...prev }));
  }, [fields]);

  const handleFieldChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    setPhone(formatted);
    if (errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const formatCurrencyInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Informe seu nome completo";
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = "Informe um WhatsApp válido com DDD";
    }

    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "E-mail inválido";
    }

    // Valida campos dinâmicos obrigatórios
    fields.forEach((field) => {
      if (field.is_required) {
        const val = answers[field.field_key];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.field_key] = `${field.label} é obrigatório`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Por favor, preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      // Coleta UTMs da URL
      let utmSource: string | null = null;
      let utmMedium: string | null = null;
      let utmCampaign: string | null = null;
      let utmContent: string | null = null;

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        utmSource = urlParams.get("utm_source");
        utmMedium = urlParams.get("utm_medium");
        utmCampaign = urlParams.get("utm_campaign");
        utmContent = urlParams.get("utm_content");
      }

      const res = await submitPublicLeadForm({
        data: {
          formSlug: form.slug,
          classifiedId: classifiedId || null,
          contactName: name.trim(),
          contactPhone: phone.trim(),
          contactEmail: email.trim() || null,
          answers,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          deviceType: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
        },
      });

      setSubmissionResult(res);
      toast.success("Solicitação enviada com sucesso!");
      onSuccess?.(res);

      // Se for ação de WhatsApp, abre automaticamente em nova aba após breve delay
      if (res.afterSubmitAction === "whatsapp_redirect" && res.whatsappUrl) {
        setTimeout(() => {
          window.open(res.whatsappUrl!, "_blank", "noopener,noreferrer");
        }, 800);
      } else if (res.afterSubmitAction === "external_redirect" && res.redirectUrl) {
        setTimeout(() => {
          window.location.href = res.redirectUrl!;
        }, 1200);
      }
    } catch (err: any) {
      console.error("[LeadFormRenderer] Erro ao submeter formulário:", err);
      toast.error(err.message || "Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── TELA DE SUCESSO PÓS-ENVIO ───────────────────────────────────────────────
  if (submissionResult) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-card rounded-2xl border border-border/60 shadow-sm animate-in fade-in-50 duration-300">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
          <Check className="w-7 h-7 stroke-[2.5]" />
        </div>

        <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
          Solicitação Recebida!
        </h3>

        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          {submissionResult.successMessage}
        </p>

        {submissionResult.afterSubmitAction === "whatsapp_redirect" && submissionResult.whatsappUrl && (
          <div className="w-full max-w-sm flex flex-col gap-3">
            <Button
              asChild
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-base gap-2 shadow-sm"
            >
              <a
                href={submissionResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                Continuar no WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Caso não tenha aberto automaticamente, clique no botão acima para falar com a equipe.
            </p>
          </div>
        )}

        {submissionResult.isNewRegisteredUser && (
          <div className="mt-6 pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Perfil rápido vinculado com segurança no ecossistema Waesy.</span>
          </div>
        )}
      </div>
    );
  }

  // ─── FORMULÁRIO DE ENTRADA (DESIGN CLEAN) ──────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dados de Contato e Registro Rápido */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="lead-name" className="text-xs font-medium text-foreground">
            Seu Nome <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-name"
            type="text"
            placeholder="Como podemos te chamar?"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }
            }}
            className={`h-11 rounded-xl text-sm ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="lead-phone" className="text-xs font-medium text-foreground">
            WhatsApp / Celular <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-phone"
            type="tel"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={handlePhoneChange}
            className={`h-11 rounded-xl text-sm ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="lead-email" className="text-xs font-medium text-foreground">
            E-mail <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="lead-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }
            }}
            className={`h-11 rounded-xl text-sm ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Campos Dinâmicos Customizados */}
      {fields.length > 0 && (
        <div className="pt-2 border-t border-border/50 space-y-3.5">
          {fields.map((field) => {
            const hasError = !!errors[field.field_key];

            return (
              <div key={field.id || field.field_key}>
                <Label htmlFor={`field-${field.field_key}`} className="text-xs font-medium text-foreground">
                  {field.label} {field.is_required && <span className="text-destructive">*</span>}
                </Label>

                {field.field_type === "textarea" ? (
                  <Textarea
                    id={`field-${field.field_key}`}
                    placeholder={field.placeholder || ""}
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    className={`rounded-xl text-sm resize-none min-h-[80px] ${hasError ? "border-destructive" : ""}`}
                  />
                ) : field.field_type === "select" ? (
                  <select
                    id={`field-${field.field_key}`}
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    className={`w-full h-11 px-3 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${hasError ? "border-destructive" : "border-input"}`}
                  >
                    <option value="">{field.placeholder || "Selecione uma opção..."}</option>
                    {(field.options || []).map((opt, idx) => (
                      <option key={idx} value={typeof opt === "string" ? opt : opt.value}>
                        {typeof opt === "string" ? opt : opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.field_type === "currency" ? (
                  <Input
                    id={`field-${field.field_key}`}
                    type="text"
                    placeholder={field.placeholder || "R$ 0,00"}
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, formatCurrencyInput(e.target.value))}
                    className={`h-11 rounded-xl text-sm ${hasError ? "border-destructive" : ""}`}
                  />
                ) : field.field_type === "date" ? (
                  <Input
                    id={`field-${field.field_key}`}
                    type="date"
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    className={`h-11 rounded-xl text-sm ${hasError ? "border-destructive" : ""}`}
                  />
                ) : field.field_type === "number" ? (
                  <Input
                    id={`field-${field.field_key}`}
                    type="number"
                    placeholder={field.placeholder || ""}
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    className={`h-11 rounded-xl text-sm ${hasError ? "border-destructive" : ""}`}
                  />
                ) : (
                  <Input
                    id={`field-${field.field_key}`}
                    type="text"
                    placeholder={field.placeholder || ""}
                    value={answers[field.field_key] || ""}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    className={`h-11 rounded-xl text-sm ${hasError ? "border-destructive" : ""}`}
                  />
                )}

                {field.helper_text && !hasError && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{field.helper_text}</p>
                )}

                {hasError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors[field.field_key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botão de Envio Principal (Thumb Zone) */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-base gap-2 shadow-sm transition-all active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <span>{form.submit_button_text || "Enviar Solicitação"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/80" />
        <span>Seus dados estão protegidos de acordo com a LGPD.</span>
      </div>
    </form>
  );
}
