import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updatePassword, getUserSession } from "@/services/auth.functions";
import { Lock, CheckCircle2, ShieldCheck, ShieldAlert, ArrowRight, Mail } from "lucide-react";
import { NativeMobileHeader } from "@/components/navigation";

export const Route = createFileRoute("/_store/redefinir-senha")({
 head: () => ({
 meta: [
 { title: "Redefinir Senha de Acesso" },
 { name: "description", content: "Crie uma nova senha segura para sua conta na plataforma Waesy." },
 ],
 }),
 loader: async () => {
 try {
 const session = await getUserSession();
 const hasActiveSession = Boolean(session?.user?.id);
 return { hasActiveSession };
 } catch {
 return { hasActiveSession: false };
 }
 },
 component: ResetPasswordPage,
});

function ResetPasswordPage() {
 const { hasActiveSession } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (password.length < 6) {
 toast.error("A nova senha deve ter no mínimo 6 caracteres.");
 return;
 }
 if (password !== confirmPassword) {
 toast.error("As senhas digitadas não conferem.");
 return;
 }

 setIsLoading(true);
 try {
 await updatePassword({
 data: {
 password,
 },
 });

 setSuccess(true);
 toast.success("Sua senha foi redefinida com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Não foi possível atualizar sua senha. O link pode ter expirado.");
 } finally {
 setIsLoading(false);
 }
 };

 return (
    <div className="w-full">
      <NativeMobileHeader
        title="Redefinir Senha"
        fallbackHref="/entrar"
      />
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 md:py-12">
 <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-6 sm:p-8 shadow-xs">
 {success ? (
 <div className="text-center space-y-4 py-2">
 <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
 <CheckCircle2 className="size-6" />
 </div>
 <div className="space-y-1">
 <h2 className="text-lg font-bold text-foreground">Senha Atualizada</h2>
 <p className="text-xs text-muted-foreground">
 Sua credencial de acesso foi alterada com sucesso.
 </p>
 </div>
 <Button
 asChild
 className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90"
 >
 <Link to="/entrar">Ir para o Login</Link>
 </Button>
 </div>
 ) : !hasActiveSession ? (
 <div className="text-center space-y-4 py-2">
 <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
 <ShieldAlert className="size-6" />
 </div>
 <div className="space-y-1">
 <h2 className="text-lg font-bold text-foreground">Link Expirado ou Inválido</h2>
 <p className="text-xs text-muted-foreground">
 Solicite um novo link de redefinição para o seu e-mail.
 </p>
 </div>

 <div className="pt-2 space-y-2">
 <Button
 asChild
 className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90"
 >
 <Link to="/recuperar-senha">Solicitar Novo Link</Link>
 </Button>
 <Button
 asChild
 variant="ghost"
 className="w-full h-10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
 >
 <Link to="/entrar">Voltar ao Login</Link>
 </Button>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-1 text-center mb-2">
 <h1 className="text-xl font-bold text-foreground tracking-tight">Criar Nova Senha</h1>
 <p className="text-xs text-muted-foreground">
 Digite sua nova senha de acesso.
 </p>
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Nova Senha</label>
 <Input
 type="password"
 placeholder="Mínimo 6 caracteres"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="h-11 rounded-xl bg-muted/30 text-xs"
 required
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Confirmar Senha</label>
 <Input
 type="password"
 placeholder="Repita a nova senha"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className="h-11 rounded-xl bg-muted/30 text-xs"
 required
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-opacity mt-2"
 >
 {isLoading ? "Salvando..." : "Salvar Nova Senha"}
 </Button>
 </form>
 )}
 </div>
 </div>
 </div>
 );
}
