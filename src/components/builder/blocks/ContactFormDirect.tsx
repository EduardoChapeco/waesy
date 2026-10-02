import React, { useState } from "react";
import { ContactFormBlockData, OmniBlockStyling } from "../types";
import { Send, CheckCircle2, MessageSquare, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface ContactFormDirectProps {
  id: string;
  data: ContactFormBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

export const ContactFormDirect: React.FC<ContactFormDirectProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
    full: "rounded-lg",
  }[styling?.borderRadius || "xl"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.error("Por favor, informe ao menos um telefone ou e-mail de contato.");
      return;
    }

    setIsSending(true);

    // Se houver número de WhatsApp configurado, redirecionar com mensagem estruturada
    if (data.whatsappNumber) {
      const cleanPhone = data.whatsappNumber.replace(/\D/g, "");
      const text = encodeURIComponent(
        `Olá! Mensagem enviada pelo site:\n*Nome:* ${name}\n*Contato:* ${phone || email}\n*Mensagem:* ${message || "Tenho interesse nos serviços."}`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
    }

    setTimeout(() => {
      setIsSending(false);
      setIsSubmitted(true);
      toast.success(data.successMessage || "Mensagem enviada com sucesso!");
    }, 600);
  };

  return (
    <section
      id={id}
      style={customStyle}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`p-8 sm:p-12 bg-card border border-border/70 ${radiusClass} shadow-sm`}>
          {/* Cabeçalho */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-2">
              {data.title || "Entre em Contato"}
            </h2>
            {data.subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {data.subtitle}
              </p>
            )}
          </div>

          {isSubmitted ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Mensagem Recebida!</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {data.successMessage || "Agradecemos o contato. Responderemos o mais breve possível."}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setName("");
                  setPhone("");
                  setEmail("");
                  setMessage("");
                }}
              >
                Enviar Outra Mensagem
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                  Nome Completo *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome ou razão social"
                  required
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.showPhoneField !== false && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                      Telefone / WhatsApp *
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="h-11 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 rounded-lg"
                  />
                </div>
              </div>

              {data.showMessageField !== false && (
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                    Mensagem ou Dúvida
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Como podemos te ajudar?"
                    rows={4}
                    className="rounded-lg resize-none"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isSending}
                size="lg"
                className="w-full h-12 text-base font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95 shadow-sm mt-2"
              >
                <span className="flex items-center justify-center gap-2">
                  <Send className="size-4" />
                  {isSending ? "Enviando..." : data.submitButtonText || "Enviar Mensagem"}
                </span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
