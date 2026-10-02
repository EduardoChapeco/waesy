import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContactForm } from "@/services/crm.functions";

interface ContactFormProps {
 storeId?: string;
 content: {
 title?: string;
 subtitle?: string;
 email_recipient: string;
 submit_text?: string;
 show_phone?: boolean;
 };
}

export function ContactForm({ storeId, content }: ContactFormProps) {
 const title = content.title || "Fale Conosco";
 const subtitle = content.subtitle || "Envie sua mensagem e responderemos o mais breve possível.";
 const submitText = content.submit_text || "Enviar Mensagem";
 const showPhone = content.show_phone !== undefined ? content.show_phone : true;

 const [name, setName] = useState("");
 const [email, setEmail] = useState("");
 const [phone, setPhone] = useState("");
 const [message, setMessage] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name || !email || !message) {
 toast.error("Preencha todos os campos obrigatórios.");
 return;
 }

 setIsSubmitting(true);
 try {
 if (!storeId) throw new Error("ID da loja não encontrado.");
 const resolvedStoreId = storeId;

 const res = await submitContactForm({
 data: {
 storeId: resolvedStoreId,
 fullName: name,
 email,
 phone: phone || undefined,
 message,
 },
 });

 setIsSuccess(true);
 toast.success("Mensagem enviada com sucesso!");
 setName("");
 setEmail("");
 setPhone("");
 setMessage("");
 } catch (err: unknown) {
 toast.error(
 (err instanceof Error ? err.message : String(err)) ||
 "Erro ao enviar mensagem. Tente novamente.",
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <section className="w-full max-w-xl mx-auto px-4 py-8">
 <div className=" bg-card p-6 @sm:p-8 space-y-6">
 <div className="text-center space-y-2">
 <h2 className="text-xl @sm:text-2xl font-black text-foreground tracking-tight">
 {title}
 </h2>
 <p className="text-xs @sm:text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
 </div>

 {isSuccess ? (
 <div className="text-center py-6 space-y-3 bg-primary/5 border border-primary/10">
 <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
 ✓
 </span>
 <h3 className="text-sm font-bold text-foreground">Sua mensagem foi enviada!</h3>
 <p className="text-xs text-muted-foreground px-4">
 Agradecemos o contato. Retornaremos em breve no e-mail:{" "}
 <strong className="text-foreground">{content.email_recipient}</strong>
 </p>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsSuccess(false)}
 className="mt-2 text-xs"
 >
 Enviar outra mensagem
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground">Nome Completo *</label>
 <Input
 placeholder="Seu nome"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 disabled={isSubmitting}
 className="h-10 text-sm"
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground">E-mail de Contato *</label>
 <div className="relative">
 <Input
 type="email"
 placeholder="seuemail@exemplo.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 disabled={isSubmitting}
 className="h-10 text-sm pl-9"
 />
 <Mail className="absolute left-3 top-3 size-4 text-muted-foreground/60" />
 </div>
 </div>

 {showPhone && (
 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground">
 Telefone / WhatsApp
 </label>
 <div className="relative">
 <Input
 type="tel"
 placeholder="(00) 00000-0000"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 disabled={isSubmitting}
 className="h-10 text-sm pl-9"
 />
 <Phone className="absolute left-3 top-3 size-4 text-muted-foreground/60" />
 </div>
 </div>
 )}

 <div className="space-y-2">
 <label className="text-xs font-bold text-muted-foreground">Mensagem *</label>
 <div className="relative">
 <Textarea
 placeholder="Escreva sua mensagem aqui..."
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 required
 disabled={isSubmitting}
 rows={4}
 className="text-sm pl-9 pt-3 resize-none"
 />
 <MessageSquare className="absolute left-3 top-3 size-4 text-muted-foreground/60" />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-11 text-sm font-semibold mt-2"
 >
 {isSubmitting ? (
 "Enviando..."
 ) : (
 <>
 <Send className="size-4 mr-2" />
 {submitText}
 </>
 )}
 </Button>
 </form>
 )}
 </div>
 </section>
 );
}
