import React, { useId, useMemo, useState } from "react";
import { CalculatorOptionItem, InteractiveCalculatorBlockData, OmniBlockStyling } from "../types";
import { Calculator, CheckCircle2, Loader2, Minus, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitOmniPageLeadFn } from "@/services/builder.functions";

export interface InteractiveQuoteCalculatorProps {
  id: string;
  data: InteractiveCalculatorBlockData;
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

export const InteractiveQuoteCalculator: React.FC<InteractiveQuoteCalculatorProps> = ({
  id,
  data,
  styling,
  className = "",
  storeData,
  pageSlug,
  onLeadSubmit,
}) => {
  const minUnits = Math.max(1, data.minUnits ?? 1);
  const maxUnits = Math.max(minUnits, data.maxUnits ?? 50);
  const defaultUnits = Math.min(maxUnits, Math.max(minUnits, data.defaultUnits ?? 5));

  const [units, setUnits] = useState<number>(defaultUnits);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => {
    return (data.options || []).filter((opt) => opt.isDefault).map((opt) => opt.id);
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const notesId = useId();

  const whatsappDigits = (
    data.whatsappNumber ||
    storeData?.whatsapp ||
    storeData?.phone ||
    ""
  ).replace(/\D/g, "");
  const hasValidWhatsApp = /^\d{10,15}$/.test(whatsappDigits);

  const toggleOption = (optId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optId) ? prev.filter((item) => item !== optId) : [...prev, optId]
    );
  };

  const selectedOptionsList: CalculatorOptionItem[] = useMemo(() => {
    return (data.options || []).filter((opt) => selectedOptionIds.includes(opt.id));
  }, [data.options, selectedOptionIds]);

  const totalCents = useMemo(() => {
    const base = Number(data.basePriceCents || 0);
    const unitPrice = Number(data.unitPriceCents || 0);
    const unitsSubtotal = units * unitPrice;
    const optionsSubtotal = selectedOptionsList.reduce(
      (acc, opt) => acc + Number(opt.priceCents || 0),
      0
    );
    return Math.max(0, base + unitsSubtotal + optionsSubtotal);
  }, [data.basePriceCents, data.unitPriceCents, units, selectedOptionsList]);

  const formattedTotal = useMemo(() => {
    return (totalCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, [totalCents]);

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

  const handleIncrement = () => {
    setUnits((prev) => Math.min(maxUnits, prev + 1));
  };

  const handleDecrement = () => {
    setUnits((prev) => Math.max(minUnits, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const summaryPayload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        message: notes.trim() || undefined,
        destination: data.title || "Calculadora de Cotação",
        metadata: {
          units,
          unitLabel: units > 1 ? data.unitPluralLabel || "Itens" : data.unitLabel || "Item",
          selectedOptions: selectedOptionsList.map((o) => ({
            id: o.id,
            label: o.label,
            priceCents: o.priceCents,
          })),
          totalCents,
          totalFormatted: formattedTotal,
        },
      };

      if (onLeadSubmit) {
        await onLeadSubmit(summaryPayload);
      } else {
        await submitOmniPageLeadFn({
          data: {
            storeId: storeData?.id || null,
            storeSlug: storeData?.slug || null,
            pageSlug: pageSlug || null,
            blockId: id,
            blockType: "interactive_quote_calculator",
            name: summaryPayload.name,
            phone: summaryPayload.phone || null,
            email: summaryPayload.email || null,
            message: summaryPayload.message || null,
            destination: summaryPayload.destination,
            metadata: summaryPayload.metadata,
          },
        });
      }

      if (hasValidWhatsApp) {
        const optionsText = selectedOptionsList.length > 0
          ? `\n*Opcionais:* ${selectedOptionsList.map((o) => o.label).join(", ")}`
          : "";
        const text = encodeURIComponent(
          `Olá! Solicito cotação calculada no site:\n*Nome:* ${name}\n*Contato:* ${phone || email}\n*Quantidade:* ${units} ${units > 1 ? data.unitPluralLabel || "Itens" : data.unitLabel || "Item"}${optionsText}\n*Estimativa:* ${formattedTotal}\n*Observações:* ${notes || "Sem observações adicionais."}`
        );
        const openedWindow = window.open(`https://wa.me/${whatsappDigits}?text=${text}`, "_blank");
        if (openedWindow) {
          openedWindow.opener = null;
        }
      }

      setIsSubmitted(true);
      toast.success(
        hasValidWhatsApp
          ? "Cotação registrada e WhatsApp aberto para confirmação!"
          : data.successMessage || "Cotação enviada com sucesso! Entraremos em contato."
      );
    } catch {
      toast.error("Não foi possível enviar sua cotação agora. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id={id}
      style={customStyle}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`p-6 sm:p-10 bg-card border border-border/70 ${radiusClass}`}>
          {/* Cabeçalho */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Calculator className="w-4 h-4" />
              <span>Simulador em Tempo Real</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2">
              {data.title || "Calculadora de Cotação"}
            </h2>
            {data.subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controles de Parâmetros e Opções */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Seletor de Quantidade */}
              <div className="p-5 rounded-lg border border-border/60 bg-muted/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      {data.unitPluralLabel || "Quantidade"}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Ajuste a quantidade desejada para o cálculo
                    </p>
                  </div>
                  <span className="text-base font-extrabold text-foreground px-3 py-1 rounded-lg bg-background border border-border/70">
                    {units} {units > 1 ? data.unitPluralLabel || "Itens" : data.unitLabel || "Item"}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={units <= minUnits}
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-lg touch-manipulation"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 px-2">
                    <input
                      type="range"
                      min={minUnits}
                      max={maxUnits}
                      value={units}
                      onChange={(e) => setUnits(Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                      aria-label="Controle de quantidade"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={units >= maxUnits}
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-lg touch-manipulation"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Opcionais / Adicionais */}
              {Array.isArray(data.options) && data.options.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-foreground">
                    Serviços & Comodidades Inclusas
                  </span>
                  <div className="flex flex-col gap-2">
                    {data.options.map((opt) => {
                      const isSelected = selectedOptionIds.includes(opt.id);
                      const optPriceFormatted = (Number(opt.priceCents || 0) / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      });

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(opt.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 min-h-11 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border/60 bg-card hover:bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40 bg-background"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {opt.label}
                              </p>
                              {opt.description && (
                                <p className="text-xs text-muted-foreground leading-normal">
                                  {opt.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-foreground shrink-0">
                            +{optPriceFormatted}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Painel do Total & Formulário de Envio */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="p-6 rounded-lg border border-primary/20 bg-primary/5 flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estimativa da Cotação
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    {formattedTotal}
                  </span>
                </div>
                {data.disclaimer && (
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    {data.disclaimer}
                  </p>
                )}
              </div>

              {isSubmitted ? (
                <div className="p-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Cotação Registrada com Sucesso!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {hasValidWhatsApp
                      ? "Seus dados foram enviados e a conversa no WhatsApp foi iniciada."
                      : "Nossa equipe entrará em contato pelos dados informados em breve."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubmitted(false)}
                    className="mt-2 h-11 min-h-11 px-4 text-xs font-semibold"
                  >
                    Fazer Nova Simulação
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor={nameId} className="block text-xs font-semibold text-foreground mb-1">
                      Seu Nome Completo *
                    </label>
                    <Input
                      id={nameId}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="h-11 min-h-11 bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={phoneId} className="block text-xs font-semibold text-foreground mb-1">
                        WhatsApp / Celular
                      </label>
                      <Input
                        id={phoneId}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-8888"
                        className="h-11 min-h-11 bg-background"
                      />
                    </div>
                    <div>
                      <label htmlFor={emailId} className="block text-xs font-semibold text-foreground mb-1">
                        E-mail
                      </label>
                      <Input
                        id={emailId}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="h-11 min-h-11 bg-background"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={notesId} className="block text-xs font-semibold text-foreground mb-1">
                      Observações / Detalhes (Opcional)
                    </label>
                    <Textarea
                      id={notesId}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma necessidade específica?"
                      rows={2}
                      className="bg-background resize-none"
                    />
                  </div>

                  {!hasValidWhatsApp && !onLeadSubmit && (
                    <p className="text-2xs text-muted-foreground text-center">
                      Destino de WhatsApp não configurado
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || (!hasValidWhatsApp && !onLeadSubmit)}
                    className="w-full h-11 min-h-11 font-bold text-sm flex items-center justify-center gap-2 mt-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                        <span>Enviando Cotação...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{data.submitButtonText || "Solicitar Proposta Oficial"}</span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
