import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { resetPasswordForEmail } from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";

export const Route = createFileRoute("/_store/recuperar-senha")({
 head: () => ({ meta: [{ title: "Recuperar senha — Waesy" }] }),
 loader: async () => {
 try {
 const brand = await getPublicBrandSettings().catch(() => null);
 return { brand };
 } catch {
 return { brand: null };
 }
 },
 component: Page,
});

function Page() {
 const { brand } = ((Route.useLoaderData?.() as any) || {});
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
 <AuthSplitExperienceShell
 brand={brand}
 backHref="/entrar"
 subtitle="Recuperação Segura"
 desktopHeadline="Recupere o acesso à sua conta em segurança."
 desktopDescription="Enviaremos um link criptografado de validação única diretamente para o seu e-mail cadastrado."
 >
 <div className="space-y-6">
 <div className="space-y-1 text-left">
 <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
 Recuperar senha
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
 Informe seu e-mail cadastrado para receber o link de redefinição.
 </p>
 </div>

 {success ? (
 <div className="rounded-2xl border border-primary/20 bg-primary/10 text-foreground p-6 space-y-4">
 <p className="font-semibold text-sm text-primary">E-mail enviado</p>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Verifique sua caixa de entrada e spam para redefinir sua senha com segurança.
 </p>
 <Button asChild variant="outline" className="w-full h-11 min-h-11 rounded-xl">
 <Link to="/entrar">Voltar ao Login</Link>
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <label htmlFor="email" className="block text-xs font-semibold text-foreground">
 E-mail cadastrado
 </label>
 <Input
 id="email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="seu@email.com"
 className="h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>

 <Button type="submit" className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs" disabled={isSubmitting}>
 {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
 </Button>

 <div className="text-center pt-2">
 <Button asChild variant="link" className="min-h-11 text-muted-foreground">
 <Link to="/entrar">Voltar para o Login</Link>
 </Button>
 </div>
 </form>
 )}
 </div>
 </AuthSplitExperienceShell>
 );
}
