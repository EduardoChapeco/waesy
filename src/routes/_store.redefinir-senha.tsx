import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updatePassword, getUserSession } from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";

export const Route = createFileRoute("/_store/redefinir-senha")({
 head: () => ({
 meta: [
 { title: "Redefinir Senha de Acesso" },
 { name: "description", content: "Crie uma nova senha segura para sua conta na plataforma Waesy." },
 ],
 }),
 loader: async () => {
 try {
 const [session, brand] = await Promise.all([
 getUserSession().catch(() => null),
 getPublicBrandSettings().catch(() => null),
 ]);
 const hasActiveSession = Boolean(session?.user?.id);
 return { hasActiveSession, brand };
 } catch {
 return { hasActiveSession: false, brand: null };
 }
 },
 component: ResetPasswordPage,
});

function ResetPasswordPage() {
 const { hasActiveSession, brand } = ((Route.useLoaderData?.() as any) || {});
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
 <AuthSplitExperienceShell
 brand={brand}
 backHref="/entrar"
 subtitle="Segurança da Conta"
 desktopHeadline="Defina sua nova credencial de acesso."
 desktopDescription="Use uma senha forte para proteger suas operações no Workspace e nas compras da cidade."
 >
 <div className="space-y-6">
 {success ? (
 <div className="text-left space-y-4 py-2">
 <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
 <CheckCircle2 className="size-6" />
 </div>
 <div className="space-y-1">
 <h1 className="text-2xl font-bold text-foreground">Senha Atualizada</h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
 Sua credencial de acesso foi alterada com sucesso.
 </p>
 </div>
 <Button
 asChild
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs"
 >
 <Link to="/entrar">Ir para o Login</Link>
 </Button>
 </div>
 ) : !hasActiveSession ? (
 <div className="text-left space-y-4 py-2">
 <div className="size-12 rounded-xl bg-warning/10 text-warning-strong flex items-center justify-center">
 <ShieldAlert className="size-6" />
 </div>
 <div className="space-y-1">
 <h1 className="text-2xl font-bold text-foreground">Link Expirado ou Inválido</h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
 Solicite um novo link de redefinição para o seu e-mail.
 </p>
 </div>

 <div className="pt-2 space-y-2">
 <Button
 asChild
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs"
 >
 <Link to="/recuperar-senha">Solicitar Novo Link</Link>
 </Button>
 <Button
 asChild
 variant="outline"
 className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold"
 >
 <Link to="/entrar">Voltar ao Login</Link>
 </Button>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-1 text-left mb-2">
 <h1 className="text-2xl font-semibold text-foreground tracking-tight">Criar Nova Senha</h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
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
 className="h-11 rounded-xl bg-muted/30 text-base md:text-sm"
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
 className="h-11 rounded-xl bg-muted/30 text-base md:text-sm"
 required
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs mt-2"
 >
 {isLoading ? "Salvando..." : "Salvar Nova Senha"}
 </Button>
 </form>
 )}
 </div>
 </AuthSplitExperienceShell>
 );
}
