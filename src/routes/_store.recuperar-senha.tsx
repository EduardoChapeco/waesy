import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { NativeMobileHeader } from "@/components/navigation";
import { resetPasswordForEmail } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/recuperar-senha")({
 head: () => ({ meta: [{ title: "Recuperar senha" }] }),
 component: Page,
});

function Page() {
 const [email, setEmail] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [success, setSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email || isSubmitting) return;

 setIsSubmitting(true);
 try {
 await resetPasswordForEmail({
 data: {
 email,
 redirectTo: `${window.location.origin}/redefinir-senha`,
 },
 });

 setSuccess(true);
 } catch (e: unknown) {
 toast.error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao solicitar recuperação de senha.",
 );
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
    <div className="w-full">
      <NativeMobileHeader
        title="Recuperar Senha"
        fallbackHref="/"
      />
      <div className="mx-auto max-w-md px-4 py-8 md:py-16">
 <div className="text-center mb-8">
 <h1 className="text-3xl font-semibold">Recuperar senha</h1>
 <p className="text-muted-foreground mt-2">
 Digite seu e-mail para receber um link de redefinição de senha.
 </p>
 </div>

 {success ? (
 <div className="bg-primary/10 text-primary p-6 text-center">
 <p className="font-medium mb-4">E-mail enviado!</p>
 <p className="text-sm">
 Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.
 </p>
 <div className="mt-6">
 <Button asChild variant="outline" className="w-full">
 <Link to="/">Voltar ao Início</Link>
 </Button>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label htmlFor="email" className="block text-sm font-medium mb-1">
 E-mail
 </label>
 <Input
 id="email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="seu@email.com"
 />
 </div>

 <Button type="submit" className="w-full" disabled={isSubmitting}>
 {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
 </Button>

 <div className="text-center pt-4">
 <Button asChild variant="link" className="text-muted-foreground">
 <Link to="/">Voltar ao Início</Link>
 </Button>
 </div>
 </form>
 )}
 </div>
 </div>
 );
}
