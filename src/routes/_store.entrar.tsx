import { createFileRoute, Link, useNavigate, useRouter, redirect, isRedirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Shield, ShieldAlert, ShieldCheck, Eye, EyeOff, UserPlus, LogIn, Lock, Mail, User, Layers, FileCheck, Check, Download, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { signInWithPassword, signUpWithPassword, signInWithOAuth, getUserSession, resetPasswordForEmail, checkIdentifierExists } from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { LegalTermsSheet } from "@/components/legal/legal-terms-sheet";
import { normalizeInternalReturnPath } from "@/lib/return-path";
import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";
import { GoogleLogo } from "@phosphor-icons/react";

function formatAuthSearchError(code?: string): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "auth-callback-failed") {
    return "Não foi possível concluir a autenticação. Tente entrar novamente.";
  }
  if (normalized === "link-invalido" || normalized === "otp_expired") {
    return "O link de acesso expirou ou já foi utilizado. Solicite um novo.";
  }
  if (normalized === "access_denied") {
    return "Autorização cancelada. Escolha outra forma de acesso para continuar.";
  }
  return "Não foi possível validar sua sessão. Verifique os dados e tente novamente.";
}

import { getClientGeoTelemetry } from "@/lib/geo-analytics";

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
        const returnUrl = normalizeInternalReturnPath(search?.returnUrl, "");
        const role = String(session?.role || session?.user?.app_metadata?.role || "").toLowerCase();
        const isMaster = Boolean(
          session?.isMaster ||
          session?.isPlatformAdmin ||
          session?.user?.app_metadata?.is_master ||
          role === "platform_admin" ||
          role === "master" ||
          role === "admin_master" ||
          role === "superadmin"
        );

        if (returnUrl && returnUrl !== "/entrar") {
          if (returnUrl.startsWith("/admin-master")) {
            if (isMaster) {
              throw redirect({ to: "/admin-master" });
            }
          } else {
            throw redirect({ to: returnUrl as any });
          }
        }
        const hostSubId =
          typeof window !== "undefined"
            ? (await import("@/lib/vertical-subsystems")).resolveSubsystemFromHost(window.location.host)?.id
            : undefined;
        const isDedicatedPortal = Boolean(hostSubId && hostSubId !== "waesy" && hostSubId !== "explorer");
        const onboardingTarget = isDedicatedPortal ? `/onboarding/empresa?vertical=${hostSubId}` : "/";
        const membershipsCount = Array.isArray((session as any)?.memberships)
          ? (session as any).memberships.length
          : session?.store_id
            ? 1
            : 0;

        if (membershipsCount > 1) {
          throw redirect({ to: "/auth/portal-selector" });
        }
        if (membershipsCount === 1) {
          throw redirect({ to: "/workspace" });
        }
        if (isMaster) {
          throw redirect({ to: isDedicatedPortal ? "/workspace" : "/admin-master" });
        }
        throw redirect({ to: onboardingTarget as any });
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
 // Se returnUrl for válida e interna, mantém; caso contrário vai para home (/)
 const safeReturn = normalizeInternalReturnPath(search.returnUrl, "/");
 const returnUrl = safeReturn && safeReturn !== "/entrar" ? safeReturn : "/";
 const authErrorMessage = formatAuthSearchError(search.error);

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

 // PWA Prompt (exibido somente quando o navegador emite beforeinstallprompt)
 const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
 const [showPwaBanner, setShowPwaBanner] = useState(false);

 useEffect(() => {
   if (typeof window === "undefined") return;
   const isStandalone =
     window.matchMedia?.("(display-mode: standalone)")?.matches ||
     Boolean((window.navigator as any)?.standalone);
   if (isStandalone) return;

   const handleBeforeInstallPrompt = (e: Event) => {
     e.preventDefault();
     setDeferredInstallPrompt(e);
     setShowPwaBanner(true);
   };

   const handleAppInstalled = () => {
     setDeferredInstallPrompt(null);
     setShowPwaBanner(false);
   };

   window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
   window.addEventListener("appinstalled", handleAppInstalled);
   return () => {
     window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
     window.removeEventListener("appinstalled", handleAppInstalled);
   };
 }, []);

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
 if ((res as any).session?.access_token && (res as any).session?.refresh_token) {
 try {
 const { getBrowserClient, sanitizeBrowserAuthCookies } = await import("@/lib/supabase");
 sanitizeBrowserAuthCookies();
 await getBrowserClient().auth.setSession({
 access_token: (res as any).session.access_token,
 refresh_token: (res as any).session.refresh_token,
 });
 sanitizeBrowserAuthCookies();
 try {
   void (JSON.stringify({
     access_token: (res as any).session.access_token,
     refresh_token: (res as any).session.refresh_token,
     user: (res as any).user,
     store_id: (res as any).store_id,
     savedAt: Date.now(),
   }));
 } catch {}
 const targetStoreId = (res as any).store_id || null;
 if (targetStoreId) {
   const { setClientContextCookies } = await import("@/lib/context-auth");
   setClientContextCookies({ context: "store", storeId: targetStoreId });
 }
 } catch (clientErr) {
 console.warn("[auth] Falha ao sincronizar sessão no cliente:", clientErr);
 }
 }
 toast.success("Acesso autorizado.");
 await router.invalidate();
 navigate({ to: "/workspace", replace: true });
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
 if ((res as any).session?.access_token && (res as any).session?.refresh_token) {
 try {
 const { getBrowserClient, sanitizeBrowserAuthCookies } = await import("@/lib/supabase");
 sanitizeBrowserAuthCookies();
 await getBrowserClient().auth.setSession({
 access_token: (res as any).session.access_token,
 refresh_token: (res as any).session.refresh_token,
 });
 sanitizeBrowserAuthCookies();
 try {
   void (JSON.stringify({
     access_token: (res as any).session.access_token,
     refresh_token: (res as any).session.refresh_token,
     user: (res as any).user,
     store_id: (res as any).store_id,
     savedAt: Date.now(),
   }));
 } catch {}
 const targetStoreId = (res as any).store_id || null;
 if (targetStoreId) {
   const { setClientContextCookies } = await import("@/lib/context-auth");
   setClientContextCookies({ context: "store", storeId: targetStoreId });
 }
 } catch (clientErr) {
 console.warn("[auth] Falha ao sincronizar sessão no cliente:", clientErr);
 }
 }
 toast.success("Sessão iniciada.");
 const hasStore = Boolean((res as any).store_id || (res as any).hasStore);
 const isMaster = Boolean(
   (res as any).isMaster ||
   (res as any).role === "platform_admin" ||
   (res as any).role === "master"
 );
 const hostSub =
   typeof window !== "undefined"
     ? (await import("@/lib/vertical-subsystems")).resolveSubsystemFromHost(window.location.host)
     : null;
 const isDedicatedPortal = Boolean(
   hostSub &&
   (hostSub.category === "vertical_workspace" || hostSub.category === "saas_brand"),
 );
 const fallbackDest = hasStore
   ? "/workspace"
   : isMaster
     ? isDedicatedPortal
       ? "/workspace"
       : "/admin-master"
     : isDedicatedPortal
       ? `/onboarding/empresa?vertical=${hostSub!.id}`
       : "/";
 const destination = returnUrl && returnUrl !== "/entrar" && returnUrl !== "/" ? returnUrl : fallbackDest;
 await router.invalidate();
 navigate({ to: destination as any, replace: true });
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

 if ((result as any).session?.access_token && (result as any).session?.refresh_token) {
 try {
 const { getBrowserClient, sanitizeBrowserAuthCookies } = await import("@/lib/supabase");
 sanitizeBrowserAuthCookies();
 await getBrowserClient().auth.setSession({
 access_token: (result as any).session.access_token,
 refresh_token: (result as any).session.refresh_token,
 });
 sanitizeBrowserAuthCookies();
 } catch (clientErr) {
 console.warn("[auth] Falha ao sincronizar sessão pós-cadastro no cliente:", clientErr);
 }
 }

 toast.success("Conta criada com sucesso.");
 await router.invalidate();
 navigate({ to: (returnUrl || "/") as any, replace: true });
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
 origin: typeof window !== "undefined" ? window.location.origin : undefined,
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

 const isRegisterMode = view.startsWith("register");
 const isForgotMode = view === "forgot-password";
 const isPortalMode = view.startsWith("portal");

 const currentStep = isForgotMode
 ? undefined
 : isRegisterMode
 ? view === "register-step1"
 ? 1
 : view === "register-step2"
 ? 2
 : 3
 : isPortalMode
 ? view === "portal-step1"
 ? 1
 : view === "portal-step2"
 ? 2
 : 3
 : view === "login-step1"
 ? 1
 : 2;
 const totalSteps = isForgotMode ? undefined : isRegisterMode || isPortalMode ? 3 : 2;
 const stepAccent = isPortalMode ? ("warning" as const) : ("primary" as const);

 const handleHeaderBack =
 view === "login-step2"
 ? () => setView("login-step1")
 : view === "register-step2"
 ? () => setView("register-step1")
 : view === "register-step3"
 ? () => setView("register-step2")
 : view === "portal-step2"
 ? () => setView("portal-step1")
 : view === "portal-step3"
 ? () => setView("portal-step2")
 : view === "forgot-password"
 ? () => setView("login-step1")
 : undefined;

 return (
 <>
 <AuthSplitExperienceShell
 brand={brand}
 step={currentStep}
 totalSteps={totalSteps}
 stepAccent={stepAccent}
 onBack={handleHeaderBack}
 backHref="/"
 subtitle="Acesso Unificado Waesy"
 desktopHeadline="Conecte sua conta ao ecossistema Waesy."
 desktopDescription="Entre para acompanhar compras, classificados, entregas, reservas ou administrar sua empresa no Workspace Pro."
 desktopHighlights={[
 { title: "Login Único entre Apps", detail: "Mesma sessão segura entre Hub Waesy, Marketplace, Classificados, Waesy Go e Pro." },
 { title: "Entrada por Etapas", detail: "Validação progressiva de identificador e senha com proteção anti-fraude." },
 ]}
 >
 <div className="space-y-6">
 {/* Cabeçalho do Formulário */}
 <div className="space-y-1 text-left">
 <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
 {isForgotMode
 ? "Recuperar Acesso"
 : isRegisterMode
 ? "Criar Conta"
 : isPortalMode
 ? "Portal Comercial"
 : "Entrar"}
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground">
 {isForgotMode
 ? "Digite seu e-mail para receber as instruções"
 : isRegisterMode
 ? "Cadastre-se passo a passo para continuar"
 : isPortalMode
 ? view === "portal-step1"
 ? "Digite o @ da sua empresa ou loja"
 : view === "portal-step2"
 ? `Acessando o portal @${portalSlug}`
 : "Confirme sua senha"
 : "Acesse sua conta para continuar"}
 </p>
 </div>

 {authErrorMessage && (
 <div
 role="alert"
 className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
 >
 <ShieldAlert className="size-4 shrink-0 mt-1" />
 <span className="leading-snug">{authErrorMessage}</span>
 </div>
 )}

 {/* ── FLUXO DE LOGIN: ETAPA 1 (E-MAIL / IDENTIFICADOR) ── */}
 {view === "login-step1" && (
 <form onSubmit={handleProceedLoginStep1} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">Qual é seu e-mail?</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 name="username"
 autoComplete="username email"
 type="text"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seu@email.com"
 className="pl-10 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Prosseguir</span>
 <ArrowRight className="size-4" />
 </Button>

 <div className="pt-2 text-center">
 <button
 type="button"
 onClick={() => setView("register-step1")}
 className="min-h-11 px-3 rounded-xl inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Não tem uma conta? <strong className="ml-1 text-primary font-semibold">Cadastrar-se</strong>
 </button>
 </div>

 {/* Divisor Limpo */}
 <div className="relative my-2">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/40" />
 </div>
 <div className="relative flex justify-center text-xs uppercase font-semibold tracking-wider">
 <span className="bg-background px-2 text-muted-foreground">ou</span>
 </div>
 </div>

 {/* Botão Direto para o Workspace */}
 <Button
 type="button"
 variant="outline"
 onClick={() => { setIdentifier(""); setPassword(""); setPortalSlug(""); setView("portal-step1"); }}
 className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
 >
 Entrar no Workspace
 </Button>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 1 (@EMPRESA) ── */}
 {view === "portal-step1" && (
 <form onSubmit={handlePortalSlugSubmit} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">@ da empresa</label>
 <div className="relative mt-1">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">@</span>
 <Input
 ref={portalSlugRef}
 name="store-slug"
 autoComplete="off"
 type="text"
 required
 value={portalSlug}
 onChange={(e) => setPortalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
 placeholder="minhaloja"
 className="pl-8 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 Continuar
 </Button>

 <div className="pt-2 text-center">
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="min-h-11 px-3 rounded-xl inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <ArrowLeft className="size-4" />
 Voltar para conta pessoal
 </button>
 </div>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 2 (IDENTIFICADOR DO USUÁRIO) ── */}
 {view === "portal-step2" && (
 <form onSubmit={handlePortalIdentifierSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Identificador da empresa */}
 <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <span className="font-semibold text-foreground">@{portalSlug}</span>
 <button
 type="button"
 onClick={() => setView("portal-step1")}
 className="min-h-11 px-2 rounded-lg text-xs text-primary font-semibold hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Alterar
 </button>
 </div>

 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">E-mail ou usuário</label>
 <div className="relative mt-1">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 name="username"
 autoComplete="username email"
 type="text"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seu@email.com ou @usuario"
 className="pl-10 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 {isLoading ? "Verificando..." : "Continuar"}
 </Button>

 <div className="pt-2 text-center">
 <button type="button" onClick={() => setView("portal-step1")}
 className="min-h-11 px-3 rounded-xl inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
 <ArrowLeft className="size-4" /> Voltar
 </button>
 </div>
 </form>
 )}

 {/* ── PORTAL COMERCIAL: STEP 3 (SENHA) ── */}
 {view === "portal-step3" && (
 <form onSubmit={handlePortalLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Resumo */}
 <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <span className="font-semibold text-foreground">@{portalSlug}</span>
 <span className="truncate text-muted-foreground font-medium">{identifier}</span>
 </div>

 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">Senha</label>
 <div className="relative mt-1">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 name="password"
 autoComplete="current-password"
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 className="pl-10 pr-12 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 {isLoading ? "Acessando..." : "Entrar no Workspace"}
 </Button>

 <div className="pt-2 text-center">
 <button type="button" onClick={() => setView("portal-step2")}
 className="min-h-11 px-3 rounded-xl inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
 <ArrowLeft className="size-4" /> Voltar
 </button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE LOGIN: ETAPA 2 (DIGITE SUA SENHA) ── */}
 {view === "login-step2" && (
 <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
 {/* Badge de E-mail Escolhido com Ação de Voltar */}
 <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <div className="flex items-center gap-2 min-w-0">
 <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
 <Check className="size-3" />
 </div>
 <span className="font-semibold text-foreground truncate">{identifier}</span>
 </div>
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="min-h-11 px-2 rounded-lg text-xs text-primary hover:underline font-semibold shrink-0 ml-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Alterar
 </button>
 </div>

 <div className="space-y-2 text-left">
 <div className="flex items-center justify-between">
 <label className="text-xs font-semibold text-foreground">Digite sua senha</label>
 <button
 type="button"
 onClick={() => {
 setForgotEmail(identifier);
 setView("forgot-password");
 }}
 className="min-h-11 px-2 rounded-lg text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Esqueceu a senha?
 </button>
 </div>
 <div className="relative mt-1">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 name="password"
 autoComplete="current-password"
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Sua senha secreta"
 className="pl-10 pr-12 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
 className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-4" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isLoading}
 className="flex-1 h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isLoading ? "Entrando..." : "Entrar na Conta"}</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 1 (E-MAIL) ── */}
 {view === "register-step1" && (
 <form onSubmit={handleProceedRegisterStep1} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">Qual é o seu melhor e-mail?</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={identifierInputRef}
 type="email"
 required
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="seuemail@exemplo.com"
 className="pl-10 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <Button
 type="submit"
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Prosseguir</span>
 <ArrowRight className="size-4" />
 </Button>

 <div className="relative my-4">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-border/60" />
 </div>
 <div className="relative flex justify-center text-xs uppercase font-semibold tracking-wider">
 <span className="bg-background px-2 text-muted-foreground">Ou crie com</span>
 </div>
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={handleGoogleAuth}
 disabled={isOAuthLoading}
 className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs gap-3 cursor-pointer border-border/70 hover:bg-muted/50 bg-background/50"
 >
 <GoogleLogo size={18} weight="bold" className="shrink-0" />
 <span>Cadastrar com Google</span>
 </Button>

 <div className="pt-2 text-center">
 <button
 type="button"
 onClick={() => setView("login-step1")}
 className="min-h-11 px-3 rounded-xl inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Já tem conta? <strong className="ml-1 text-primary font-semibold">Fazer Login</strong>
 </button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 2 (NOME COMPLETO) ── */}
 {view === "register-step2" && (
 <form onSubmit={handleProceedRegisterStep2} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">Como devemos te chamar?</label>
 <div className="relative mt-1">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={nameInputRef}
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="Seu nome completo"
 className="pl-10 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("register-step1")}
 className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-4" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 className="flex-1 h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>Continuar</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE CADASTRO: ETAPA 3 (SENHA + TERMOS) ── */}
 {view === "register-step3" && (
 <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in duration-200">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">Crie uma senha de acesso (min. 6)</label>
 <div className="relative mt-1">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={passwordInputRef}
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Crie sua senha segura"
 className="pl-10 pr-12 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 <button
 type="button"
 aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
 </button>
 </div>
 </div>

 {/* Box de Aceite dos Termos */}
 <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-left text-xs space-y-1">
 <div className="flex items-start gap-2">
 <ShieldCheck className="size-4 text-primary shrink-0 mt-1" />
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground leading-snug">
 Ao criar sua conta, você concorda com nossos termos legais.
 </p>
 <button
 type="button"
 onClick={() => setIsTermsSheetOpen(true)}
 className="min-h-11 px-1 rounded-lg text-primary font-semibold underline hover:opacity-80 inline-flex items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 Ler Termos de Uso e Política LGPD
 </button>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("register-step2")}
 className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-4" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isLoading}
 className="flex-1 h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isLoading ? "Criando Conta..." : "Finalizar Cadastro"}</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </form>
 )}

 {/* ── FLUXO DE RECUPERAÇÃO DE SENHA ── */}
 {view === "forgot-password" && (
 <div className="space-y-4 animate-in fade-in duration-200">
 {forgotSentSuccess ? (
 <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
 <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
 <Check className="size-5" />
 </div>
 <h3 className="text-sm font-semibold text-foreground">E-mail enviado</h3>
 <p className="text-xs text-muted-foreground">
 Verifique sua caixa de entrada para redefinir sua senha de acesso.
 </p>
 <Button
 type="button"
 onClick={() => {
 setForgotSentSuccess(false);
 setView("login-step1");
 }}
 className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold mt-2 focus-visible:ring-2 focus-visible:ring-primary"
 >
 Voltar para o Login
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSendResetPassword} className="space-y-4">
 <div className="space-y-2 text-left">
 <label className="text-xs font-semibold text-foreground">E-mail cadastrado</label>
 <div className="relative mt-1">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 type="email"
 required
 value={forgotEmail}
 onChange={(e) => setForgotEmail(e.target.value)}
 placeholder="seu@email.com"
 className="pl-10 h-11 rounded-xl text-base md:text-sm bg-muted/30 border-border/70 focus:border-primary"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => setView("login-step1")}
 className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-4" />
 <span>Voltar</span>
 </Button>

 <Button
 type="submit"
 disabled={isSendingReset}
 className="flex-1 h-11 min-h-11 rounded-xl font-semibold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90"
 >
 <span>{isSendingReset ? "Enviando..." : "Enviar Instruções"}</span>
 <ArrowRight className="size-4" />
 </Button>
 </div>
 </form>
 )}
 </div>
 )}
  </div>
 </AuthSplitExperienceShell>

 {/* ── 4. Card Flutuante PWA / App (somente quando navegador emite beforeinstallprompt) ── */}
 {showPwaBanner && deferredInstallPrompt && (
 <aside
 aria-label="Instalar aplicativo Waesy"
 className="fixed bottom-4 right-4 z-40 max-w-xs w-full bg-card border border-border shadow-overlay rounded-2xl p-4 hidden sm:block"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-xl bg-muted text-primary flex items-center justify-center shrink-0">
 <Download className="size-4" />
 </div>
 <div className="min-w-0">
 <h4 className="text-xs font-semibold text-foreground">Instalar Waesy App</h4>
 <p className="text-xs text-muted-foreground line-clamp-2 text-anti-truncate">Acesso direto na tela inicial</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setShowPwaBanner(false)}
 className="text-muted-foreground hover:text-foreground size-11 min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 title="Fechar"
 aria-label="Fechar"
 >
 <X className="size-4" />
 </button>
 </div>
 <Button
 type="button"
 onClick={async () => {
 try {
 await deferredInstallPrompt.prompt();
 const choice = await deferredInstallPrompt.userChoice;
 if (choice?.outcome === "accepted") {
 toast.success("Aplicativo instalado.");
 }
 } finally {
 setDeferredInstallPrompt(null);
 setShowPwaBanner(false);
 }
 }}
 className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold mt-3 bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
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
 </>
 );
}

