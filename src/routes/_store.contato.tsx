import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicBrandSettings } from "@/services/master.functions";
import { MessageSquare, Mail, Phone, Clock, MapPin, Send, CheckCircle2, Layers, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { submitContactMessage } from "@/services/contact.functions";

export const Route = createFileRoute("/_store/contato")({
 head: () => ({ meta: [{ title: "Fale Conosco & Suporte | Waesy" }] }),
 loader: async () => {
 try {
 const brand = await getPublicBrandSettings();
 return { brand };
 } catch {
 return {
 brand: {
 platform_name: "Waesy",
 support_email: "suporte@usewaesy.com",
 support_whatsapp: null,
 support_hours: "Segunda a Sexta, das 08h às 18h",
 address: null,
 city: "Brasil",
 state: "",
 },
 };
 }
 },
 component: ContatoPage,
});

function ContatoPage() {
 const { brand } = ((Route.useLoaderData?.() as any) || {});

 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [phone, setPhone] = useState("");
 const [subject, setSubject] = useState("");
 const [message, setMessage] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSent, setIsSent] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !email.trim() || !message.trim()) {
 toast.error("Por favor, preencha todos os campos obrigatórios.");
 return;
 }

 setIsSubmitting(true);
 try {
 const res = await submitContactMessage({
 data: {
 name,
 email,
 phone,
 subject,
 message,
 },
 });
 setIsSent(true);
 toast.success(res.message);
 } catch (err: any) {
 toast.error(err.message || "Erro ao enviar mensagem. Tente novamente ou utilize nosso WhatsApp.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const cleanWhatsapp = brand?.support_whatsapp?.replace(/\D/g, "");

 return (
 <div className="mx-auto max-w-5xl px-0 sm:px-4 md:px-0 py-6 md:py-14 space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
 {/* Topo Institucional */}
 <div className="text-center max-w-2xl mx-auto space-y-2">
 <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
 Atendimento & Ouvidoria
 </span>
 <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
 Como podemos ajudar você?
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
 Entre em contato direto com a equipe oficial do {brand?.platform_name || "Waesy"}. Estamos à disposição para dúvidas, suporte a lojistas, parcerias e sugestões.
 </p>
 </div>

 {/* Grid de Canais de Contato Reais */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* WhatsApp */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between space-y-4 shadow-xs">
 <div className="space-y-2">
 <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <MessageSquare className="size-5" />
 </div>
 <h3 className="font-bold text-sm text-foreground">WhatsApp Oficial</h3>
 <p className="text-xs text-muted-foreground">
 {brand?.support_whatsapp || "Atendimento via chat direto"}
 </p>
 </div>
 {cleanWhatsapp ? (
 <Button asChild size="sm" className="w-full min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
 <a
 href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
 `Olá! Gostaria de falar com o suporte da plataforma ${brand?.platform_name || "Waesy"}.`
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 Iniciar Conversa
 </a>
 </Button>
 ) : (
 <Button size="sm" variant="outline" disabled className="w-full rounded-xl text-xs">
 Canal em Configuração
 </Button>
 )}
 </div>

 {/* E-mail */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between space-y-4 shadow-xs">
 <div className="space-y-2">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Mail className="size-5" />
 </div>
 <h3 className="font-bold text-sm text-foreground">E-mail de Suporte</h3>
 <p className="text-xs text-muted-foreground truncate font-mono">
 {brand?.support_email || "contato@usewaesy.com"}
 </p>
 </div>
 <Button asChild variant="outline" size="sm" className="w-full rounded-xl font-bold text-xs cursor-pointer bg-background">
 <a href={`mailto:${brand?.support_email || "contato@usewaesy.com"}`}>
 Enviar E-mail
 </a>
 </Button>
 </div>

 {/* Horário */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between space-y-4 shadow-xs">
 <div className="space-y-2">
 <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
 <Clock className="size-5" />
 </div>
 <h3 className="font-bold text-sm text-foreground">Horário de Operação</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {brand?.support_hours || "Segunda a Sexta, das 08h às 18h"}
 </p>
 </div>
 <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-2">
 <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
 <span>Plantão Digital 24/7</span>
 </div>
 </div>

 {/* Sede / Localização */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 flex flex-col justify-between space-y-4 shadow-xs">
 <div className="space-y-2">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <MapPin className="size-5" />
 </div>
 <h3 className="font-bold text-sm text-foreground">Sede Regional</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {[brand?.address, brand?.city, brand?.state].filter(Boolean).join(", ") || "Santa Catarina, Brasil"}
 </p>
 </div>
 <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
 <ShieldCheck className="size-3.5 text-primary" />
 <span>Ecossistema Verificado</span>
 </div>
 </div>
 </div>

 {/* Formulário Interativo de Mensagem */}
 <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/70 shadow-xs max-w-3xl mx-auto space-y-6">
 <div className="space-y-1">
 <h2 className="text-lg sm:text-xl font-bold text-foreground">Envie uma Mensagem</h2>
 <p className="text-xs text-muted-foreground">
 Preencha o formulário abaixo e nossa equipe retornará no seu e-mail ou WhatsApp cadastrado.
 </p>
 </div>

 {isSent ? (
 <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 text-center space-y-3">
 <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
 <CheckCircle2 className="size-6" />
 </div>
 <h3 className="font-bold text-foreground text-sm">Mensagem Recebida com Sucesso!</h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 Agradecemos seu contato. Nosso time de atendimento entrará em contato com você pelo e-mail <strong>{email}</strong>.
 </p>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setIsSent(false);
 setName("");
 setEmail("");
 setPhone("");
 setSubject("");
 setMessage("");
 }}
 className="rounded-xl font-bold text-xs"
 >
 Enviar Outra Mensagem
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Seu Nome Completo *</label>
 <Input
 required
 placeholder="Ex: João da Silva"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="rounded-xl h-10 bg-muted/20 text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Seu E-mail *</label>
 <Input
 required
 type="email"
 placeholder="Ex: joao@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="rounded-xl h-10 bg-muted/20 text-xs"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">WhatsApp / Telefone</label>
 <Input
 placeholder="Ex: (49) 99999-9999"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="rounded-xl h-10 bg-muted/20 text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Assunto *</label>
 <Input
 required
 placeholder="Ex: Dúvida sobre minha loja / Pedido"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 className="rounded-xl h-10 bg-muted/20 text-xs"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Mensagem *</label>
 <Textarea
 required
 rows={4}
 placeholder="Descreva detalhadamente o que você precisa..."
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className="rounded-2xl bg-muted/20 text-xs resize-none"
 />
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full sm:w-auto h-10 px-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 <Send className="size-3.5" />
 <span>{isSubmitting ? "Enviando..." : "Enviar Mensagem"}</span>
 </Button>
 </form>
 )}
 </div>
 </div>
 );
}
