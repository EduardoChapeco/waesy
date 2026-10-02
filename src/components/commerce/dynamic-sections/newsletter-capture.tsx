import * as React from "react";
import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface NewsletterCaptureProps {
 title?: string;
 subtitle?: string;
 placeholder?: string;
 buttonLabel?: string;
 onSubscribe?: (contact: string) => void;
}

export function NewsletterCaptureSection({
 title = "Fique por Dentro dos Lançamentos",
 subtitle = "Receba novidades exclusivas, cupons de desconto e acesso antecipado às coleções.",
 placeholder = "Digite seu melhor e-mail ou WhatsApp",
 buttonLabel = "Cadastrar",
 onSubscribe,
}: NewsletterCaptureProps) {
 const [contact, setContact] = useState("");
 const [submitted, setSubmitted] = useState(false);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!contact) return;
 onSubscribe?.(contact);
 setSubmitted(true);
 };

 return (
 <section className="py-12 bg-muted/30 w-full">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
 <div className="space-y-2">
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
 {subtitle}
 </p>
 </div>

 {submitted ? (
 <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
 <CheckCircle2 className="size-4" />
 <span>Obrigado! Seu contato foi cadastrado com sucesso.</span>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
 <div className="relative flex-1">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 required
 value={contact}
 onChange={(e) => setContact(e.target.value)}
 placeholder={placeholder}
 className="h-11 pl-9 rounded-lg bg-background border-border/80 text-xs"
 />
 </div>
 <Button
 type="submit"
 className="h-11 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer px-6 shrink-0"
 >
 <span>{buttonLabel}</span>
 <ArrowRight className="size-3.5 ml-2" />
 </Button>
 </form>
 )}
 </div>
 </section>
 );
}
