import React, { useState } from "react";
import { LeadQuizBlockData, OmniBlockStyling } from "../types";
import { Check, ChevronRight, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitOmniPageLeadFn } from "@/services/builder.functions";

export interface InteractiveLeadQuizFlowProps {
  id: string;
  data: LeadQuizBlockData;
  styling?: OmniBlockStyling;
  className?: string;
  storeData?: any;
  pageSlug?: string;
  onLeadSubmit?: (payload: {
    name: string;
    phone?: string;
    email?: string;
    message?: string;
    destination?: string;
    metadata?: Record<string, any>;
  }) => Promise<unknown>;
}

export const InteractiveLeadQuizFlow: React.FC<InteractiveLeadQuizFlowProps> = ({
  id,
  data,
  styling,
  className = "",
  storeData,
  pageSlug,
  onLeadSubmit,
}) => {
  const steps = data.steps || [];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId: string; optionLabel: string; question: string }>>({});
  
  // Lead form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const whatsappDigits = (
    data.whatsappNumber ||
    storeData?.whatsapp ||
    storeData?.phone ||
    ""
  ).replace(/\D/g, "");
  const hasValidWhatsApp = /^\d{10,15}$/.test(whatsappDigits);

  const paddingYClasses = {
    none: "py-0",
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[styling?.paddingY || "md"];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-lg",
    full: "rounded-full",
  }[styling?.borderRadius || "lg"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const totalSteps = steps.length;
  const isFinalLeadForm = currentStepIndex >= totalSteps;
  const currentStep = steps[currentStepIndex];

  const handleSelectOption = (optionId: string, optionLabel: string) => {
    if (!currentStep) return;
    setAnswers((prev) => ({
      ...prev,
      [currentStep.id]: {
        optionId,
        optionLabel,
        question: currentStep.question,
      },
    }));
  };

  const handleNextStep = () => {
    if (!currentStep) return;
    if (!answers[currentStep.id]) {
      toast.error("Por favor, selecione uma opção para continuar.");
      return;
    }
    setCurrentStepIndex((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.error("Por favor, informe ao menos um telefone ou e-mail de contato.");
      return;
    }

    setIsSubmitting(true);
    try {
      const summaryText = Object.values(answers)
        .map((a) => `• ${a.question}: ${a.optionLabel}`)
        .join("\n");
      const fullMessage = `${summaryText}${notes ? `\n• Observações: ${notes}` : ""}`;

      if (onLeadSubmit) {
        await onLeadSubmit({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          message: fullMessage,
          metadata: {
            quizAnswers: answers,
            formTitle: data.formTitle || "Diagnóstico",
          },
        });
      } else {
        await submitOmniPageLeadFn({
          data: {
            storeId: storeData?.id || null,
            storeSlug: storeData?.slug || null,
            pageSlug: pageSlug || null,
            blockId: id,
            blockType: "interactive_lead_quiz_flow",
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            message: fullMessage,
            metadata: {
              quizAnswers: answers,
              formTitle: data.formTitle || "Diagnóstico",
            },
          },
        });
      }

      if (hasValidWhatsApp) {
        const text = encodeURIComponent(
          `*${data.title || "Diagnóstico & Proposta"}*\n*Nome:* ${name}\n*Contato:* ${phone || email}\n\n*Respostas do Quiz:*\n${summaryText}${
            notes ? `\n*Observações:* ${notes}` : ""
          }`
        );
        const openedWindow = window.open(`https://wa.me/${whatsappDigits}?text=${text}`, "_blank");
        if (openedWindow) {
          openedWindow.opener = null;
        }
      }

      setIsSubmitted(true);
      toast.success(
        hasValidWhatsApp
          ? "Diagnóstico registrado no CRM e WhatsApp aberto!"
          : (data.successMessage || "Diagnóstico enviado com sucesso! Retornaremos em breve.")
      );
    } catch {
      toast.error("Não foi possível enviar seu diagnóstico agora. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setCurrentStepIndex(0);
    setAnswers({});
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setIsSubmitted(false);
  };

  return (
    <section
      id={id}
      style={customStyle}
      aria-label={data.title || "Quiz Interativo de Diagnóstico"}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`p-6 sm:p-10 bg-card border border-border/70 ${radiusClass}`}>
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-2xs font-bold uppercase tracking-wider mb-3">
              <span>Diagnóstico Especializado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2">
              {data.title || "Descubra a Solução Sob Medida"}
            </h2>
            {data.subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Empty state check */}
          {steps.length === 0 ? (
            <div className="text-center py-10 px-6 border border-dashed border-border/80 rounded-lg bg-muted/20 text-muted-foreground text-sm font-medium">
              Nenhuma etapa de diagnóstico configurada. Adicione perguntas e opções no painel do quiz.
            </div>
          ) : isSubmitted ? (
            /* Success confirmation */
            <div className="text-center py-10 flex flex-col items-center">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {hasValidWhatsApp ? "Diagnóstico Salvo & WhatsApp Aberto" : "Diagnóstico Enviado com Sucesso"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                {hasValidWhatsApp
                  ? "Suas respostas foram registradas diretamente no CRM da loja e a mensagem personalizada foi gerada no seu WhatsApp."
                  : (data.successMessage || "Recebemos suas respostas. Nossa equipe analisará seu perfil e retornará em breve.")}
              </p>
              <Button
                variant="outline"
                className="h-11 min-h-11 px-6 font-semibold"
                onClick={resetQuiz}
              >
                Refazer Diagnóstico
              </Button>
            </div>
          ) : !isFinalLeadForm && currentStep ? (
            /* Quiz Step Options */
            <div className="space-y-6">
              {/* Progress Tracker */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                  <span>Etapa {currentStepIndex + 1} de {totalSteps}</span>
                  <span>{Math.round(((currentStepIndex + 1) / (totalSteps + 1)) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-transform duration-300 motion-reduce:transition-none"
                    style={{ width: `${((currentStepIndex + 1) / (totalSteps + 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="py-2">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                  {currentStep.question}
                </h3>
                {currentStep.subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {currentStep.subtitle}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentStep.options.map((option) => {
                  const isSelected = answers[currentStep.id]?.optionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id, option.label)}
                      className={`w-full min-h-11 p-4 rounded-lg border text-left flex items-center justify-between transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                          : "border-border/70 bg-card hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{option.label}</span>
                          {option.tag && (
                            <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-3xs font-bold uppercase">
                              {option.tag}
                            </span>
                          )}
                        </div>
                        {option.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {option.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`size-6 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 bg-background"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 min-h-11 text-xs font-semibold"
                  disabled={currentStepIndex === 0}
                  onClick={handlePrevStep}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="h-11 min-h-11 px-6 font-semibold"
                  disabled={!answers[currentStep.id]}
                  onClick={handleNextStep}
                >
                  Continuar
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            /* Final Lead Capture Form */
            <form onSubmit={handleSubmitLead} className="space-y-4">
              {/* Progress Tracker Final */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                  <span>Etapa Final: Conclusão</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full" />
                </div>
              </div>

              <div className="text-left mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                  {data.formTitle || "Receba sua Proposta Personalizada"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {data.formSubtitle || "Informe seus dados para enviarmos a recomendação detalhada."}
                </p>
              </div>

              <div>
                <label htmlFor={`${id}-lead-name`} className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Nome Completo *
                </label>
                <Input
                  id={`${id}-lead-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11 min-h-11 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`${id}-lead-phone`} className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    WhatsApp / Telefone
                  </label>
                  <Input
                    id={`${id}-lead-phone`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    type="tel"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-lead-email`} className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    E-mail
                  </label>
                  <Input
                    id={`${id}-lead-email`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    type="email"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${id}-lead-notes`} className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Observações Adicionais (Opcional)
                </label>
                <Textarea
                  id={`${id}-lead-notes`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes que gostaria de destacar..."
                  rows={3}
                  className="rounded-lg resize-none"
                />
              </div>

              {!hasValidWhatsApp && !onLeadSubmit && (
                <p className="text-2xs text-muted-foreground text-center">
                  Destino de WhatsApp ou integração de leads não configurada
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border/40 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 min-h-11 text-xs font-semibold"
                  onClick={handlePrevStep}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (!hasValidWhatsApp && !onLeadSubmit)}
                  className="h-11 min-h-11 px-6 font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors motion-reduce:transition-none"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {data.submitButtonText || "Concluir e Receber Diagnóstico"}
                  </span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
