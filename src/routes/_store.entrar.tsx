import { createFileRoute, Link, useNavigate, useRouter, redirect, isRedirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, UserPlus, LogIn, Lock, Mail, User, Layers, FileCheck, Check, Download, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import {
 signInWithPassword,
 signUpWithPassword,
 signInWithOAuth,
 getUserSession,
 resetPasswordForEmail,
 checkIdentifierExists,
} from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { LegalTermsSheet } from "@/components/legal/legal-terms-sheet";

function getClientGeoTelemetry() {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("waesy_master_location");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.city === "string" && parsed.city !== "Global") {
      return {
        city: parsed.city,
        state: parsed.state,
        lat: parsed.lat,
        lng: parsed.lng,
        source: parsed.source || "gps",
      };
    }
  } catch {}
  return undefined;
}

export const Route = createFileRoute("/_store/entrar")({
 head: () => ({
 meta: [{ title: "Acessar Conta — Waesy" }],
 }),
 validateSearch: (search: Record<string, unknown>): { returnUrl?: string; error?: string } => {
 return {
 returnUrl: typeof search.returnUrl === "string" ? search.returnUrl : undefined,
 error: typeof search.error === "string" ? search.error : undefined,
 };
 },
  loader: async ({ search }: any) => {
    try {
      const session = await getUserSession();
      if (session?.id) {
        const returnUrl = search?.returnUrl;
        const role = session?.role || session?.user?.user_metadata?.role;
        const email = session?.email?.toLowerCase() || session?.user?.email?.toLowerCase() || "";
        const MASTER_EMAILS = [
          "contato@usewaesy.com",
          "admin@usewaesy.com",
          "meuwaesy@gmail.com",
          "meuwider@gmail.com",
          "excelenciatour.smo@gmail.com",
          "admin@jah.com",
        ];
        const isMaster =
          role === "platform_admin" ||
          role === "master" ||
          role === "admin_master" ||
          session?.user?.user_metadata?.is_admin_master ||
          session?.user?.user_metadata?.is_superadmin ||
          MASTER_EMAILS.includes(email);

        if (returnUrl && returnUrl.startsWith("/")) {
          if (returnUrl.startsWith("/admin-master")) {
            if (isMaster) {
              throw redirect({ to: "/admin-master" });
            }
          } else if (!returnUrl.startsWith("/entrar")) {
            throw redirect({ to: returnUrl as any });
          }
        }
        throw redirect({ to: isMaster ? "/admin-master" : "/workspace" });
      }
    } catch (e: any) {
      if (isRedirect(e)) {
        throw e;
      }
    }
 try {
 const brand = await getPublicBrandSettings();
 return { brand };
 } catch {
 return { brand: null };
 }
 },
 component: StepByStepAuthPage,
});

type AuthView = "login-step1" | "login-step2" | "register-step1" | "register-step2" | "register-step3" | "forgot-password" | "portal-step1" | "portal-step2" | "portal-step3";

function StepByStepAuthPage() {
 const { brand } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const router = useRouter();
 const search = Route.useSearch();
 // Se returnUrl for /workspace ou /admin-master, mantém; caso contrário vai para home (/)
 const rawReturn = search.returnUrl;
 const returnUrl = rawReturn?.startsWith("/workspace") || rawReturn?.startsWith("/admin-master")
 ? rawReturn
 : rawReturn?.startsWith("/") && !rawReturn.startsWith("/entrar")
 ? rawReturn
 : "/";

 // Estado da etapa ativa
 const [view, setView] = useState<AuthView>("login-step1");

 // Estado do Portal Comercial
 const [portalSlug, setPortalSlug] = useState(""); // @empresa
 const portalSlugRef = useRef<HTMLInputElement>(null);

 // Dados do formulário
 const [identifier, setIdentifier] = useState("");
 const [password, setPassword] = useState("");
 const [fullName, setFullName] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [isOAuthLoading, setIsOAuthLoading] = useState(false);

 // Esqueci a Senha
 const [forgotEmail, setForgotEmail] = useState("");
 const [isSendingReset, setIsSendingReset] = useState(false);
 const [forgotSentSuccess, setForgotSentSuccess] = useState(false);

 // Sheet de Termos Legais
 const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);
 const [hasScrolledTermsToBottom, setHasScrolledTermsToBottom] = useState(false);
 const [termsScrollProgress, setTermsScrollProgress] = useState(0);
 const termsScrollRef = useRef<HTMLDivElement>(null);

 // PWA Prompt
 const [showPwaBanner, setShowPwaBanner] = useState(true);

 // Input refs para auto-focus fluido
 const identifierInputRef = useRef<HTMLInputElement>(null);
 const passwordInputRef = useRef<HTMLInputElement>(null);
 const nameInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (view === "login-step1" || view === "register-step1") {
 setTimeout(() => identifierInputRef.current?.focus(), 150);
 } else if (view === "login-step2" || view === "register-step3") {
 setTimeout(() => passwordInputRef.current?.focus(), 150);
 } else if (view === "register-step2") {
 setTimeout(() => nameInputRef.current?.focus(), 150);
 } else if (view === "portal-step1") {
 setTimeout(() => portalSlugRef.current?.focus(), 150);
 } else if (view === "portal-step2") {
 setTimeout(() => identifierInputRef.current?.focus(), 150);
 } else if (view === "portal-step3") {
 setTimeout(() => passwordInputRef.current?.focus(), 150);
 }
 }, [view]);

 // ── Handlers do Portal Comercial ──────────────────────────────────────────
 const handlePortalSlugSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const slug = portalSlug.trim().replace(/^@/, "").toLowerCase();
 if (!slug) {
 toast.error("Digite o @ da empresa (ex: @minhaloja).");
 return;
 }
 setPortalSlug(slug);
 setView("portal-step2");
 };

 const handlePortalIdentifierSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const cleanId = identifier.trim();
 if (!cleanId) {
 toast.error("Digite seu e-mail, telefone ou @usuário.");
 return;
 }
 setIsLoading(true);
 try {
 const result = await checkIdentifierExists({ data: { identifier: cleanId } });
 if (!result.exists) {
 toast.error("Conta não encontrada nesta plataforma.");
 return;
 }
 setView("portal-step3");
 } catch {
 setView("portal-step3");
 } finally {
 setIsLoading(false);
 }
 };

 const handlePortalLoginSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!password) {
 toast.error("Digite sua senha.");
 return;
 }
 setIsLoading(true);
 const cleanId = identifier.trim();
 try {
 const clientLocation = getClientGeoTelemetry();
    const res = await signInWithPassword({
      data: { identifier: cleanId, password, clientLocation },
    });

 if (res.status === "success") {
 toast.success(`Bem-vindo(a) ao Portal @${portalSlug}!`);
 // Portal sempre vai para /workspace
 window.location.replace("/workspace");
 return;
 } else if (res.status === "rate_limited" || res.status === "error") {
 toast.error(res.message);
 }
 } catch (err: any) {
 const rawMsg = err?.message || err?.error?.message || (typeof err === "string" ? err : "");
 const cleanMsg = rawMsg.replace(/^Error:\s*/, "").replace(/^\[auth\]\s*/, "");
 toast.error(cleanMsg || "Credenciais incorretas.");
 } finally {
 setIsLoading(false);
 }
 };

 // Avançar da Etapa 1 para a Etapa 2 de Login (com verificação de existência)
 const handleProceedLoginStep1 = async (e: React.FormEvent) => {
 e.preventDefault();
 const cleanId = identifier.trim();
 if (!cleanId) {
 toast.error("Digite seu e-mail, telefone ou @usuário.");
 return;
 }

 setIsLoading(true);
 try {
 const result = await checkIdentifierExists({ data: { identifier: cleanId } });
 if (!result.exists) {
 toast.error("Conta não encontrada. Verifique seu e-mail ou cadastre-se.");
 return;
 }
 setView("login-step2");
 } catch {
 // Em caso de erro no BFF, avança mesmo assim
 setView("login-step2");
 } finally {
 setIsLoading(false);
 }
 };

 // Login Efetivo na Etapa 2
 const handleLoginSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!password) {
 toast.error("Digite sua senha de acesso.");
 return;
 }

 setIsLoading(true);
 const cleanId = identifier.trim();

 try {
 // Sempre chama o BFF para resolver @username/CPF, rate-limiting, cookies SSR e mesclar carrinho
 const clientLocation = getClientGeoTelemetry();
      const res = await signInWithPassword({
        data: {
          identifier: cleanId,
          password,
          clientLocation,
        },
      });

 if (res.status === "success") {
 toast.success("Bem-vindo(a) de volta!");
 // Redireciona para home (/) por padrão, ou returnUrl se especificado
 const destination = returnUrl && returnUrl !== "/entrar" ? returnUrl : "/";
 window.location.replace(destination);
 return;
 } else if (res.status === "rate_limited" || res.status === "error") {
 toast.error(res.message);
 }
 } catch (err: any) {
 const rawMsg = err?.message || err?.error?.message || (typeof err === "string" ? err : "");
 const cleanMsg = rawMsg.replace(/^Error:\s*/, "").replace(/^\[auth\]\s*/, "");
 toast.error(cleanMsg || "Identificador ou senha incorretos.");
 } finally {
 setIsLoading(false);
 }
 };

 // Fluxo de Cadastro: Avançar Etapa 1 -> Etapa 2
 const handleProceedRegisterStep1 = (e: React.FormEvent) => {
 e.preventDefault();
 if (!identifier.trim()) {
 toast.error("Digite seu e-mail para começar.");
 return;
 }
 setView("register-step2");
 };

 // Fluxo de Cadastro: Avançar Etapa 2 -> Etapa 3
 const handleProceedRegisterStep2 = (e: React.FormEvent) => {
 e.preventDefault();
 if (!fullName.trim()) {
 toast.error("Informe como deseja ser chamado(a).");
 return;
 }
 setView("register-step3");
 };

 // Fluxo de Cadastro: Concluir Cadastro
 const handleRegisterSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (password.length < 6) {
 toast.error("A senha deve ter no mínimo 6 caracteres.");
 return;
 }

 setIsLoading(true);
 try {
 const cleanEmail = identifier.includes("@")
 ? identifier.trim().toLowerCase()
 : `${identifier.replace(/\D/g, "") || "usuario"}@usewaesy.com`;

 const clientLocation = getClientGeoTelemetry();
      const result = await signUpWithPassword({
        data: {
          email: cleanEmail,
          password,
          fullName: fullName.trim() || identifier.split("@")[0] || "Membro Waesy",
          redirectTo: returnUrl,
          isConsentLgpd: true,
          clientLocation,
        },
      });

 if (!result.success) {
 toast.error(result.message || "Não foi possível concluir seu cadastro.");
 return;
 }

 toast.success("Conta criada com sucesso! Bem-vindo(a) ao Waesy!");
 await getUserSession().catch(() => null);
 window.location.href = returnUrl || "/";
 } catch (err: any) {
 const rawMsg = err?.message || err?.error?.message || (typeof err === "string" ? err : "");
 const cleanMsg = rawMsg.replace(/^Error:\s*/, "").replace(/^\[auth\]\s*/, "");
 toast.error(cleanMsg || "Não foi possível concluir seu cadastro. Verifique os dados e tente novamente.");
 } finally {
 setIsLoading(false);
 }
 };

 // Login Social via Google OAuth
 const handleGoogleAuth = async () => {
 setIsOAuthLoading(true);
 try {
 const result = await signInWithOAuth({
 data: {
 provider: "google",
 redirectTo: returnUrl,
 },
 });

 if (result.status === "success" && result.url) {
 window.location.href = result.url;
 } else {
 toast.error((result as any)?.message || "Não foi possível conectar com o Google no momento.");
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro ao conectar com Google.");
 } finally {
 setIsOAuthLoading(false);
 }
 };

 // Enviar Recuperação de Senha
 const handleSendResetPassword = async (e: React.FormEvent) => {
 e.preventDefault();
 const targetEmail = (forgotEmail || identifier).trim();
 if (!targetEmail) {
 toast.error("Informe seu e-mail cadastrado.");
 return;
 }

 setIsSendingReset(true);
 try {
 await resetPasswordForEmail({
 data: {
 email: targetEmail,
 redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/redefinir-senha`,
 },
 });
 setForgotSentSuccess(true);
 toast.success("Instruções de redefinição enviadas para seu e-mail!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao solicitar recuperação.");
 } finally {
 setIsSendingReset(false);
 }
 };

 // Monitora o scroll dos Termos até o final (100%)
 const handleTermsScroll = () => {
 if (!termsScrollRef.current) return;
 const { scrollTop, scrollHeight, clientHeight } = termsScrollRef.current;
 const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100));
 setTermsScrollProgress(progress);

 if (scrollTop + clientHeight >= scrollHeight - 20) {
 setHasScrolledTermsToBottom(true);
 }
 };

 const desktopBg = brand?.login_bg_desktop_url || brand?.login_split_image_url || "";
 const tabletBg = brand?.login_bg_tablet_url || desktopBg || "";
 const mobileBg = brand?.login_bg_mobile_url || tabletBg || "";
 const hasCustomBg = Boolean(desktopBg || tabletBg || mobileBg);

 const isRegisterMode = view.startsWith("register");
 const isForgotMode = view === "forgot-password";
 const isPortalMode = view.startsWith("portal");

 return (
 <main
 role="main"
 aria-label="Autenticação Waesy"
 className="min-h-screen w-full relative select-none flex flex-col justify-between p-4 sm:p-6 md:p-8 bg-background text-foreground overflow-x-hidden"
 >
 {/* ── 1. Background com Mídia Responsiva (Apenas se cadastrado no Master) ── */}
 {hasCustomBg ? (
 <picture className="fixed inset-0 size-full pointer-events-none z-0">
 {desktopBg && <source media="(min-width: 1024px)" srcSet={desktopBg} />}
 {tabletBg && <source media="(min-width: 768px)" srcSet={tabletBg} />}
 <img
 src={mobileBg || tabletBg || desktopBg}
 alt="Fundo"
 className="size-full object-cover opacity-25 filter blur-xs"
 />
 </picture>
 ) : (
 <div className="fixed inset-0 size-full pointer-events-none z-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
 )}

 {/* Overlay com Blur Suave */}
 <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-1 pointer-events-none" />

 {/* ── 2. Top Header Minimalista ── */}
 <header className="relative z-10 flex items-center justify-between w-full max-w-5xl mx-auto">
 <Link
 to="/"
 className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-card/80 backdrop-blur-xl border border-border/40 text-foreground hover:border-border transition-colors min-h-[44px]"
 >
 <span className="bg-primary text-primary-foreground font-black text-xs px-2 py-0.5 rounded-lg tracking-wider uppercase">
 {brand?.platform_name && brand.platform_name !== "Waesy" ? brand.platform_name : "Waesy"}
 </span>
 </Link>

 <Link
 to="/"
 aria-label="Voltar ao início"
 className="size-11 rounded-xl bg-card/80 backdrop-blur-xl border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all"
 >
 <ArrowLeft className="size-5" />
 </Link>
 </header>

 {/* ── 3. Card Centralizado: Experiência em Etapas (Step-by-Step) ── */}
 <div className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
 <div className="bg-card/95 dark:bg-card/90 backdrop-blur-2xl border border-border/60 rounded-2xl p-6 sm:p-8 shadow-xs text-foreground animate-in fade-in zoom-in-95 duration-300">
 
 {/* Logo / Glifo Superior */}
 <div className="flex justify-center mb-4">
 {brand?.logo_url ? (
 <img src={brand.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
 ) : (
 <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">{brand?.platform_name?.charAt(0) || "W"}</div>
 )}
 </div>

 {/* Título & Subtítulo Dinâmicos */}
 <div className="text-center space-y-1 mb-6">
 <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
 {isForgotMode
 ? "Recuperar Acesso"
 : isRegisterMode
 ? "Criar Conta"
 : isPortalMode
 ? "Portal Comercial"
 : "Entrar"}
 </h1>
 <p className="text-xs text-muted-foreground">
 {isForgotMode
 ? "Digite seu e-mail para receber as instruções"
 : isRegisterMode
 ? "Cadastre-se para continuar"
 : isPortalMode
 ? view === "portal-step1"
 ? "Digite o @ da sua empresa ou loja"
 : view === "portal-step2"
 ? `Acessando o portal @${portalSlug}`
 : `Confirme sua senha`
 : "Acesse sua conta para continuar"}
 </p>

 {/* Indicador Minimalista de Progresso em Etapas */}
 {!isForgotMode && (
 <div className="flex items-center justify-center gap-1.5 pt-3">
 {isRegisterMode ? (
 <>
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "register-step1" ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "register-step2" ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "register-step3" ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
 </>
 ) : isPortalMode ? (
 <>
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "portal-step1" ? "w-6 bg-amber-500" : "w-2 bg-muted"}`} />
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "portal-step2" ? "w-6 bg-amber-500" : "w-2 bg-muted"}`} />
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "portal-step3" ? "w-6 bg-amber-500" : "w-2 bg-muted"}`} />
 </>
 ) : (
 <>
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "login-step1" ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
 <div className={`h-1.5 rounded-full transition-all duration-300 ${view === "login-step2" ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
 </>
 )}
 </div>
 )}
 </div>

 {/* ── FLUXO DE LOGIN: ETAPA 1 (E-MAIL / IDENTIFICADOR) ── */}
 {view === "login-step1" && (
 <form onSubmit={handleProceedLoginStep1} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">Qual é seu e-mail?</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 name="username"
 autoComplete="username email"
 type="text"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seu@email.com"
 className="pl-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Prosseguir</span>
 <ArrowRight className="size-3.5" />
 </Button>

 <div className="pt-3 text-center">
 <button
 type="button"
 onClick={() => setView("register-step1")}
 className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
 >
 Não tem uma conta? <strong className="text-primary font-bold">Cadastrar-se</strong>
 </button>
 </div>

 {/* Divisor Limpo */}
 <div className="relative my-2">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/40" />
 </div>
 <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
 <span className="bg-card px-2 text-muted-foreground">ou</span>
 </div>
 </div>

 {/* Botão Direto para o Workspace */}
 <Button
 type="button"
 variant="outline"
 onClick={() => { setIdentifier(""); setPassword(""); setPortalSlug(""); setView("portal-step1"); }}
 className="w-full h-11 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
 >
 Entrar no Workspace
 </Button>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 1 (@EMPRESA) ── */}
 {view === "portal-step1" && (
 <form onSubmit={handlePortalSlugSubmit} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">@ da empresa</label>
 <div className="relative mt-1">
 <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">@</span>
 <Input
 ref={portalSlugRef}
 name="store-slug"
 autoComplete="off"
 type="text"
 required
 value={portalSlug}
 onChange={(e) => setPortalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
 placeholder="minhaloja"
 className="pl-8 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 rounded-xl font-bold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 Continuar
 </Button>

 <div className="pt-2 text-center">
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
 >
 <ArrowLeft className="size-3" />
 Voltar para conta pessoal
 </button>
 </div>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 2 (IDENTIFICADOR DO USUÁRIO) ── */}
 {view === "portal-step2" && (
 <form onSubmit={handlePortalIdentifierSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Identificador da empresa */}
 <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <span className="font-bold text-foreground">@{portalSlug}</span>
 <button
 type="button"
 onClick={() => setView("portal-step1")}
 className="text-xs text-primary font-semibold hover:underline cursor-pointer"
 >
 Alterar
 </button>
 </div>

 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">E-mail ou usuário</label>
 <div className="relative mt-1">
 <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 name="username"
 autoComplete="username email"
 type="text"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seu@email.com ou @usuario"
 className="pl-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 rounded-xl font-bold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 {isLoading ? "Verificando..." : "Continuar"}
 </Button>

 <div className="pt-2 text-center">
 <button type="button" onClick={() => setView("portal-step1")}
 className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer">
 <ArrowLeft className="size-3" /> Voltar
 </button>
 </div>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 3 (SENHA) ── */}
 {view === "portal-step3" && (
 <form onSubmit={handlePortalLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Resumo */}
 <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <span className="font-bold text-foreground">@{portalSlug}</span>
 <span className="truncate text-muted-foreground font-medium">{identifier}</span>
 </div>

 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">Senha</label>
 <div className="relative mt-1">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 name="password"
 autoComplete="current-password"
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="pl-10 pr-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
 tabIndex={-1}
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 rounded-xl font-bold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 {isLoading ? "Acessando..." : "Entrar no Workspace"}
 </Button>

 <div className="pt-2 text-center">
 <button type="button" onClick={() => setView("portal-step2")}
 className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer">
 <ArrowLeft className="size-3" /> Voltar
 </button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE LOGIN: ETAPA 2 (DIGITE SUA SENHA) ── */}
 {view === "login-step2" && (
 <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Badge de E-mail Escolhido com Ação de Voltar */}
 <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <div className="flex items-center gap-2 min-w-0">
 <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
 <Check className="size-3" />
 </div>
 <span className="font-semibold text-foreground truncate">{identifier}</span>
 </div>
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="text-[11px] text-primary hover:underline font-bold shrink-0 ml-2 cursor-pointer"
 >
 Alterar
 </button>
 </div>

 <div className="space-y-1.5 text-left">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-foreground">Digite sua senha</label>
 <button
 type="button"
 onClick={() => {
 setForgotEmail(identifier);
 setView("forgot-password");
 }}
 className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
 >
 Esqueceu a senha?
 </button>
 </div>
 <div className="relative mt-1">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 name="password"
 autoComplete="current-password"
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Sua senha secreta"
 className="pl-10 pr-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
 tabIndex={-1}
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("login-step1")}
 className="h-11 px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-3.5" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isLoading}
 className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isLoading ? "Entrando..." : "Entrar na Conta"}</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 1 (E-MAIL) ── */}
 {view === "register-step1" && (
 <form onSubmit={handleProceedRegisterStep1} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">Qual é o seu melhor e-mail?</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 type="email"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seuemail@exemplo.com"
 className="pl-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Prosseguir</span>
 <ArrowRight className="size-3.5" />
 </Button>

 <div className="relative my-4">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/60" />
 </div>
 <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
 <span className="bg-card px-2 text-muted-foreground">Ou crie com</span>
 </div>
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={handleGoogleAuth}
 disabled={isOAuthLoading}
 className="w-full h-11 rounded-xl font-semibold text-xs gap-2.5 cursor-pointer border-border/70 hover:bg-muted/50 bg-background/50"
 >
 <svg className="size-4" viewBox="0 0 24 24">
 <path
 fill="#4285F4"
 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
 />
 <path
 fill="#34A853"
 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
 />
 <path
 fill="#FBBC05"
 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
 />
 <path
 fill="#EA4335"
 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
 />
 </svg>
 <span>Cadastrar com Google</span>
 </Button>

 <div className="pt-3 text-center">
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
 >
 Já tem conta? <strong className="text-primary font-bold">Fazer Login</strong>
 </button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 2 (NOME COMPLETO) ── */}
 {view === "register-step2" && (
 <form onSubmit={handleProceedRegisterStep2} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">Como devemos te chamar?</label>
 <div className="relative mt-1">
 <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={nameInputRef}
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="Seu nome completo"
 className="pl-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("register-step1")}
 className="h-11 px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-3.5" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Continuar</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 3 (SENHA + TERMOS) ── */}
 {view === "register-step3" && (
 <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">Crie uma senha de acesso (min. 6)</label>
 <div className="relative mt-1">
 <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Crie sua senha segura"
 className="pl-10 pr-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
 tabIndex={-1}
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 {/* Box de Aceite dos Termos */}
 <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-left text-xs space-y-1.5">
 <div className="flex items-start gap-2">
 <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
 <div className="space-y-1">
 <p className="text-[11px] text-muted-foreground leading-snug">
 Ao criar sua conta, você concorda com nossos{" "}
 <button
 type="button"
 onClick={() => setIsTermsSheetOpen(true)}
 className="text-primary font-bold underline hover:opacity-80 inline"
 >
 Termos de Uso e Política LGPD
 </button>.
 </p>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("register-step2")}
 className="h-11 px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-3.5" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isLoading}
 className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isLoading ? "Criando Conta..." : "Finalizar Cadastro"}</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE RECUPERAÇÃO DE SENHA ── */}
 {view === "forgot-password" && (
 <div className="space-y-4 animate-in fade-in duration-200">
 {forgotSentSuccess ? (
 <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
 <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
 <Check className="size-5" />
 </div>
 <h3 className="text-sm font-bold text-foreground">E-mail Enviado!</h3>
 <p className="text-xs text-muted-foreground">
 Verifique sua caixa de entrada para redefinir sua senha de acesso.
 </p>
 <Button
 type="button"
 onClick={() => {
 setForgotSentSuccess(false);
 setView("login-step1");
 }}
 className="w-full h-10 rounded-xl text-xs font-bold mt-2"
 >
 Voltar para o Login
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSendResetPassword} className="space-y-4">
 <div className="space-y-1.5 text-left">
 <label className="text-xs font-bold text-foreground">E-mail cadastrado</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 type="email"
 required
 value={forgotEmail}
 onChange={(e) => setForgotEmail(e.target.value)}
 placeholder="seu@email.com"
 className="pl-10 h-11 rounded-xl text-base sm:text-xs bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("login-step1")}
 className="h-11 px-4 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-3.5" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isSendingReset}
 className="flex-1 h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isSendingReset ? "Enviando..." : "Enviar Instruções"}</span>
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </form>
 )}
 </div>
 )}
 </div>
 </div>

 {/* ── 4. Card Flutuante PWA / App no Canto Inferior Direito (como no Print 3) ── */}
 {showPwaBanner && (
 <aside
 aria-label="Sugestão de Instalação do App"
 className="fixed bottom-4 right-4 z-40 max-w-xs w-full bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl p-3.5 animate-in slide-in-from-bottom-4 duration-300 hidden sm:block"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Download className="size-4" />
 </div>
 <div className="min-w-0">
 <h4 className="text-xs font-bold text-foreground">Instalar Waesy App</h4>
 <p className="text-[10px] text-muted-foreground truncate">Rápido, offline e notificações</p>
 </div>
 </div>
 <button
 onClick={() => setShowPwaBanner(false)}
 className="text-muted-foreground hover:text-foreground size-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
 title="Fechar"
 aria-label="Fechar"
 >
 <X className="size-4" />
 </button>
 </div>
 <Button
 onClick={() => {
 toast.info("PWA pronto para instalação pelo navegador.");
 setShowPwaBanner(false);
 }}
 className="w-full h-10 rounded-xl text-xs font-bold mt-2.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
 >
 Instalar Agora
 </Button>
 </aside>
 )}

 {/* ── 5. Sheet de Termos de Uso & LGPD com Documentação Legal Oficial Completa ── */}
 <LegalTermsSheet
 isOpen={isTermsSheetOpen}
 onOpenChange={setIsTermsSheetOpen}
 initialSlug="termos"
 />
 </main>
 );
}

