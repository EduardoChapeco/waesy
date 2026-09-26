import { createFileRoute, Link, useNavigate, useRouter, redirect } from "@tanstack/react-router";
import { ChevronRight, Eye, EyeOff, ShieldCheck, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpWithPassword, signInWithOAuth, getUserSession } from "@/services/auth.functions";
import { ClientRegisterSchema, type RegisterForm } from "@/lib/contracts/auth.schema";
import { LegalTermsSheet } from "@/components/legal/legal-terms-sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/cadastro")({
 head: () => ({
 meta: [{ title: "Criar Conta — Waesy" }],
 }),
 validateSearch: (search: Record<string, unknown>): { returnUrl?: string; error?: string } => {
 return {
 returnUrl: typeof search.returnUrl === "string" ? search.returnUrl : undefined,
 error: typeof search.error === "string" ? search.error : undefined,
 };
 },
 component: RegisterPage,
});

function RegisterPage() {
 const navigate = useNavigate();
 const router = useRouter();
 const search = Route.useSearch();
 const returnUrl = search.returnUrl ?? "/";
 const errorParam = search.error;
 const [showPassword, setShowPassword] = useState(false);
 const [isTermsOpen, setIsTermsOpen] = useState(false);
 const [termsSlug, setTermsSlug] = useState("termos");

 // Integração Google Login desativada por padrão
 const isGoogleAuthEnabled = false;

 useEffect(() => {
 if (errorParam === "auth-callback-failed") {
 toast.error("Ocorreu um erro ao concluir o cadastro social. Tente novamente.");
 } else if (errorParam) {
 toast.error(errorParam);
 }
 }, [errorParam]);

 const form = useForm<RegisterForm>({
 resolver: zodResolver(ClientRegisterSchema),
 defaultValues: { fullName: "", email: "", password: "", isConsentLgpd: false as true },
 });

 const onSubmit = async (data: RegisterForm) => {
 try {
 const result = await signUpWithPassword({
 data: {
 email: data.email,
 password: data.password,
 fullName: data.fullName,
 redirectTo: returnUrl,
 isConsentLgpd: data.isConsentLgpd,
 },
 });

 if (!result.success) {
 toast.error(result.message || "Erro ao cadastrar.");
 return;
 }

 toast.success("Conta criada com sucesso! Bem-vindo(a) à Waesy!");
 if (typeof window !== "undefined") {
 sessionStorage.setItem("waesy_just_registered", "true");
 }
 await new Promise((r) => setTimeout(r, 100));
 await getUserSession().catch(() => null);
 window.location.href = returnUrl || "/";
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao cadastrar.");
 }
 };

 const handleOAuth = async (provider: "google" | "github") => {
 try {
 const result = await signInWithOAuth({ data: { provider, redirectTo: returnUrl } });
 if (result.status === "success" && result.url) {
 window.location.href = result.url;
 } else {
 toast.error(result.message || "Erro ao inicializar cadastro social.");
 }
 } catch (e) {
 toast.error("Ocorreu um erro com o cadastro social.");
 }
 };

 return (
 <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
 {/* ── Left Side: Minimal Brand Screen (Desktop) ────────── */}
 <div className="relative hidden lg:flex lg:w-[45%] bg-zinc-950 text-white flex-col justify-between p-12 overflow-hidden">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(120,50,255,0.10),transparent_60%)]" />
 <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

 <div className="relative z-10 flex flex-col h-full justify-between">
 <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
 <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-lg text-sm font-black">Waesy</span>
 </Link>
 <div className="max-w-md">
 <h2 className="text-3xl font-bold tracking-tight leading-tight">
 O Sistema Operacional do seu Negócio.
 </h2>
 </div>
 </div>
 </div>

 {/* ── Right Side: Clean Register Form ────────── */}
 <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
 <div className="w-full max-w-md space-y-8">
 {/* Mobile Back / Breadcrumb */}
 <div className="flex items-center justify-between">
 <Link
 to="/"
 className="size-10 rounded-xl bg-card border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all"
 aria-label="Voltar para o início"
 >
 <ArrowLeft className="size-4" />
 </Link>
 <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-xs">
 <Link
 to="/entrar"
 search={{ returnUrl }}
 className="px-3 py-1 rounded-lg text-muted-foreground hover:text-foreground font-medium transition-colors"
 >
 Entrar
 </Link>
 <span className="px-3 py-1 rounded-lg bg-background font-bold text-foreground ">
 Cadastrar
 </span>
 </div>
 </div>

 {/* Header Title */}
 <div className="space-y-1">
 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
 Crie seu perfil
 </h1>
 </div>

 {/* Form */}
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
 <FormField
 control={form.control}
 name="fullName"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Nome Completo
 </FormLabel>
 <FormControl>
 <Input
 placeholder="Seu nome"
 autoComplete="name"
 className="h-11 rounded-xl border-border bg-card/50 text-sm focus-visible:ring-primary/20"
 {...field}
 />
 </FormControl>
 <FormMessage className="text-xs font-semibold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="email"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 E-mail
 </FormLabel>
 <FormControl>
 <Input
 type="email"
 placeholder="seu.email@exemplo.com"
 autoComplete="email"
 className="h-11 rounded-xl border-border bg-card/50 text-sm focus-visible:ring-primary/20"
 {...field}
 />
 </FormControl>
 <FormMessage className="text-xs font-semibold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="password"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Senha (mínimo 6 caracteres)
 </FormLabel>
 <FormControl>
 <div className="relative">
 <Input
 type={showPassword ? "text" : "password"}
 placeholder="••••••••"
 autoComplete="new-password"
 className="h-11 rounded-xl border-border bg-card/50 text-sm pr-10 focus-visible:ring-primary/20"
 {...field}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
 aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
 >
 {showPassword ? (
 <EyeOff className="size-4" />
 ) : (
 <Eye className="size-4" />
 )}
 </button>
 </div>
 </FormControl>
 <FormMessage className="text-xs font-semibold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="isConsentLgpd"
 render={({ field }) => (
 <FormItem className="flex items-center gap-3 space-y-0 pt-2">
 <FormControl>
 <Checkbox
 checked={field.value}
 onCheckedChange={field.onChange}
 />
 </FormControl>
 <div className="leading-none">
 <FormLabel className="text-xs text-muted-foreground font-normal leading-normal cursor-pointer select-none">
 Concordo com os{" "}
 <button
 type="button"
 onClick={() => {
 setTermsSlug("termos");
 setIsTermsOpen(true);
 }}
 className="text-foreground font-semibold hover:underline cursor-pointer"
 >
 Termos de Uso
 </button>{" "}
 e{" "}
 <button
 type="button"
 onClick={() => {
 setTermsSlug("privacidade");
 setIsTermsOpen(true);
 }}
 className="text-foreground font-semibold hover:underline cursor-pointer"
 >
 Política de Privacidade (LGPD)
 </button>
 .
 </FormLabel>
 <FormMessage className="text-xs font-semibold mt-1" />
 </div>
 </FormItem>
 )}
 />

 <Button
 type="submit"
 size="lg"
 className="w-full h-11 min-h-[44px] rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm mt-2"
 disabled={form.formState.isSubmitting}
 >
 {form.formState.isSubmitting ? "Criando..." : "Criar Conta"}
 </Button>
 </form>
 </Form>

 {/* Footer Call to Action */}
 <div className="text-center text-xs text-muted-foreground pt-4 ">
 Já possui uma conta?{" "}
 <Link
 to="/entrar"
 search={{ returnUrl }}
 className="text-primary font-bold hover:underline"
 >
 Fazer login
 </Link>
 </div>
 </div>
 </div>

 {/* Sheet de Termos Oficiais & LGPD */}
 <LegalTermsSheet
 isOpen={isTermsOpen}
 onOpenChange={setIsTermsOpen}
 initialSlug={termsSlug}
 onAccept={() => form.setValue("isConsentLgpd", true, { shouldValidate: true })}
 />
 </div>
 );
}
