import { createFileRoute, useNavigate, useRouter, redirect, isRedirect, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Store,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { GoogleLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithOAuth,
  getUserSession,
  checkIdentifierExists,
} from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { getPublicVerticalLandingFn } from "@/services/vertical-landings.functions";
import { LegalTermsSheet } from "@/components/legal/legal-terms-sheet";
import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";
import { resolveBrandContextFromHost, getBrandVerticalById, type BrandVerticalId } from "@/lib/multi-brand-engine";
import { getClientGeoTelemetry } from "@/lib/geo-analytics";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      {
        title: "Painel de Negócios & Workspace — Waesy",
      },
      {
        name: "description",
        content: "Acesso direto para lojistas e empreendedores gerenciarem seus negócios na plataforma Waesy.",
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    returnUrl?: string;
    email?: string;
    aba?: "login" | "cadastro";
    vertical?: string;
    niche?: string;
    sku?: string;
    billing?: string;
  } => {
    return {
      returnUrl: typeof search.returnUrl === "string" ? search.returnUrl : undefined,
      email: typeof search.email === "string" ? search.email : undefined,
      aba: search.aba === "cadastro" ? "cadastro" : "login",
      vertical: typeof search.vertical === "string" ? search.vertical : undefined,
      niche: typeof search.niche === "string" ? search.niche : undefined,
      sku: typeof search.sku === "string" ? search.sku : undefined,
      billing: typeof search.billing === "string" ? search.billing : undefined,
    };
  },
  loader: async (ctx: any) => {
    const search = ctx?.search || ctx?.deps;
    try {
      const session = await getUserSession();
      if (session?.id) {
        const hasStore =
          (session?.memberships && session.memberships.length > 0) ||
          Boolean(session?.store_id) ||
          session?.role === "store_owner" ||
          session?.role === "owner" ||
          session?.role === "admin" ||
          session?.role === "manager" ||
          session?.role === "seller" ||
          session?.role === "cashier" ||
          session?.role === "finance" ||
          session?.role === "content" ||
          session?.role === "stock" ||
          session?.role === "support" ||
          session?.role === "collaborator" ||
          session?.role === "platform_admin" ||
          session?.role === "admin_master" ||
          session?.role === "master" ||
          session?.role === "superadmin" ||
          Boolean(session?.isMaster || session?.isPlatformAdmin);

        const customReturn = search?.returnUrl;
        if (
          customReturn &&
          customReturn.startsWith("/") &&
          !customReturn.startsWith("/painel") &&
          !customReturn.startsWith("/entrar")
        ) {
          throw redirect({ to: customReturn as any });
        }

        if (hasStore) {
          throw redirect({ to: "/workspace" });
        } else {
          throw redirect({ to: "/onboarding/empresa" });
        }
      }
    } catch (e: unknown) {
      if (isRedirect(e)) throw e;
    }

    try {
      const [brand, verticalLanding] = await Promise.all([
        getPublicBrandSettings(),
        getPublicVerticalLandingFn({
          data: search?.vertical ? { slug: search.vertical } : undefined,
        }).catch(() => null),
      ]);
      return { brand, verticalLanding };
    } catch {
      return { brand: null, verticalLanding: null };
    }
  },
  component: PainelAuthPage,
});

type TabMode = "login" | "cadastro";

function PainelAuthPage() {
  const { brand, verticalLanding } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();

  const [activeTab, setActiveTab] = useState<TabMode>(search.aba === "cadastro" ? "cadastro" : "login");

  // Form states - Login
  const [loginIdentifier, setLoginIdentifier] = useState(search.email || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Form states - Cadastro
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  // Social login
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // Legal sheet
  const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);

  // Input refs
  const loginInputRef = useRef<HTMLInputElement>(null);
  const registerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "login") {
      setTimeout(() => loginInputRef.current?.focus(), 150);
    } else {
      setTimeout(() => registerInputRef.current?.focus(), 150);
    }
  }, [activeTab]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginIdentifier.trim();
    if (!cleanId) {
      toast.error("Informe seu e-mail, telefone ou @usuário.");
      return;
    }
    if (!loginPassword) {
      toast.error("Informe sua senha de acesso.");
      return;
    }

    setIsLoginLoading(true);
    try {
      const clientLocation = getClientGeoTelemetry();
      const res = await signInWithPassword({
        data: {
          identifier: cleanId,
          password: loginPassword,
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
          } catch (clientErr) {
            console.warn("[painel] Falha ao sincronizar sessão no cliente:", clientErr);
          }
        }

        toast.success("Acesso autorizado ao painel.");
        await router.invalidate();

        // Verifica se tem loja para encaminhar adequadamente
        const userSession = await getUserSession().catch(() => null);
        const resolvedStoreId =
          (res as any).store_id ||
          userSession?.store_id ||
          userSession?.memberships?.[0]?.store_id ||
          null;
        if (resolvedStoreId && typeof window !== "undefined") {
          try {
            const { setClientContextCookies } = await import("@/lib/context-auth");
            setClientContextCookies({ context: "store", storeId: resolvedStoreId });
          } catch {}
        }
        const hasStore =
          Boolean((res as any).hasStore) ||
          Boolean(resolvedStoreId) ||
          (userSession?.memberships && userSession.memberships.length > 0) ||
          Boolean(userSession?.store_id) ||
          userSession?.role === "store_owner" ||
          userSession?.role === "owner" ||
          userSession?.role === "admin" ||
          userSession?.role === "manager" ||
          userSession?.role === "seller" ||
          userSession?.role === "cashier" ||
          userSession?.role === "finance" ||
          userSession?.role === "content" ||
          userSession?.role === "stock" ||
          userSession?.role === "support" ||
          userSession?.role === "collaborator" ||
          userSession?.role === "platform_admin";

        if (hasStore) {
          const customReturn =
            search.returnUrl &&
            search.returnUrl.startsWith("/") &&
            !search.returnUrl.startsWith("/painel") &&
            !search.returnUrl.startsWith("/entrar")
              ? search.returnUrl
              : "/workspace";
          navigate({ to: customReturn as any, replace: true });
        } else if (search.vertical || search.niche || search.sku) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(
              "waesy_pending_vertical_onboarding",
              JSON.stringify({
                vertical: search.vertical || verticalLanding?.slug || "waesy",
                niche: search.niche || verticalLanding?.niche_id,
                sku: search.sku || verticalLanding?.vertical_sku,
              }),
            );
          }
          navigate({
            to: "/onboarding/empresa",
            search: {
              vertical: search.vertical || verticalLanding?.slug,
              segment: search.niche || verticalLanding?.niche_id,
              sku: search.sku || verticalLanding?.vertical_sku,
            } as any,
            replace: true,
          });
        } else {
          navigate({ to: "/onboarding/empresa", replace: true });
        }
        return;
      }

      if (res.status === "rate_limited" || res.status === "error") {
        toast.error(res.message);
      }
    } catch (err: any) {
      const rawMsg = err?.message || err?.error?.message || (typeof err === "string" ? err : "");
      const cleanMsg = rawMsg.replace(/^Error:\s*/, "").replace(/^\[auth\]\s*/, "");
      toast.error(cleanMsg || "Credenciais incorretas.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = registerName.trim();
    const cleanEmail = registerEmail.trim().toLowerCase();
    const cleanPhone = registerPhone.replace(/\D/g, "");

    if (!cleanName) {
      toast.error("Informe o nome completo do responsável.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Informe um e-mail corporativo válido.");
      return;
    }
    if (registerPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (!acceptTerms) {
      toast.error("É necessário concordar com os Termos de Uso e Política de Privacidade.");
      return;
    }

    setIsRegisterLoading(true);
    try {
      // Pré-validação de duplicidade
      const existsCheck = await checkIdentifierExists({ data: { identifier: cleanEmail } });
      if (existsCheck.exists) {
        toast.error("Este e-mail já possui uma conta. Faça login para acessar seu painel.");
        setActiveTab("login");
        setLoginIdentifier(cleanEmail);
        setIsRegisterLoading(false);
        return;
      }

      const clientLocation = getClientGeoTelemetry();
      const result = await signUpWithPassword({
        data: {
          email: cleanEmail,
          password: registerPassword,
          fullName: cleanName,
          phone: cleanPhone || undefined,
          redirectTo: "/onboarding/empresa",
          isConsentLgpd: true,
          clientLocation,
        },
      });

      if (!result.success) {
        toast.error(result.message || "Não foi possível criar a conta empresarial.");
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
          console.warn("[painel] Falha ao sincronizar sessão pós-cadastro no cliente:", clientErr);
        }
      }

      toast.success("Conta criada com sucesso! Iniciando abertura do seu negócio.");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("waesy_just_registered", "true");
        if (search.vertical || search.niche || search.sku || verticalLanding?.slug) {
          sessionStorage.setItem(
            "waesy_pending_vertical_onboarding",
            JSON.stringify({
              vertical: search.vertical || verticalLanding?.slug || "waesy",
              niche: search.niche || verticalLanding?.niche_id,
              sku: search.sku || verticalLanding?.vertical_sku,
            }),
          );
        }
      }
      await router.invalidate();
      if (search.vertical || search.niche || search.sku) {
        navigate({
          to: "/onboarding/empresa",
          search: {
            vertical: search.vertical || verticalLanding?.slug,
            segment: search.niche || verticalLanding?.niche_id,
            sku: search.sku || verticalLanding?.vertical_sku,
          } as any,
          replace: true,
        });
      } else {
        navigate({ to: "/onboarding/empresa", replace: true });
      }
    } catch (err: any) {
      const rawMsg = err?.message || err?.error?.message || (typeof err === "string" ? err : "");
      const cleanMsg = rawMsg.replace(/^Error:\s*/, "").replace(/^\[auth\]\s*/, "");
      toast.error(cleanMsg || "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsOAuthLoading(true);
    try {
      const result = await signInWithOAuth({
        data: {
          provider: "google",
          redirectTo: "/workspace",
        },
      });

      if (result.status === "success" && result.url) {
        window.location.href = result.url;
      } else {
        toast.error((result as any)?.message || "Não foi possível autenticar com o Google.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao conectar com Google.");
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const hostBrand = (() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryBrand = params.get("brand") as BrandVerticalId | null;
      if (queryBrand) return getBrandVerticalById(queryBrand);
      return resolveBrandContextFromHost(window.location.host);
    }
    return getBrandVerticalById("waesy_studio");
  })();
  const brandName =
    hostBrand.id !== "waesy" && hostBrand.id !== "waesy_studio"
      ? hostBrand.brandName
      : brand?.platform_name || brand?.company_name || brand?.site_name || hostBrand.shortName || "Waesy";

  const isSpecificVertical = Boolean(
    verticalLanding && verticalLanding.slug && verticalLanding.slug !== "waesy",
  );
  const verticalHighlights =
    isSpecificVertical && Array.isArray(verticalLanding.isolated_modules) && verticalLanding.isolated_modules.length > 0
      ? verticalLanding.isolated_modules.slice(0, 3).map((m: any) => ({
          title: m.title,
          detail: m.description,
        }))
      : [
          { title: "Vitrines e Delivery Integrado", detail: "Receba pedidos no WhatsApp e organize despachos locais." },
          { title: "Finanças e Caixa", detail: "Conciliação Pix, fluxo de caixa, contas a receber e comissões." },
          { title: "Controle de Acessos", detail: "Permissões por função da equipe com auditoria completa." },
        ];
  const resolvedBrandName = isSpecificVertical ? verticalLanding.display_name : `${brandName} Pro`;
  const resolvedBackHref = isSpecificVertical ? `/sistemas/${verticalLanding.slug}` : "/painel";
  const resolvedSplitImage =
    verticalLanding?.login_split_image_url ||
    verticalLanding?.hero_image_desktop_url ||
    brand?.login_split_image_url ||
    brand?.login_bg_desktop_url;

  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  return (
    <>
      <AuthSplitExperienceShell
        brand={{
          ...(brand || {}),
          platform_name: isSpecificVertical ? verticalLanding.display_name : brandName,
          logo_url: verticalLanding?.logo_url || brand?.logo_url,
          login_split_image_url: resolvedSplitImage || null,
        }}
        brandTitle={resolvedBrandName}
        subtitle={isSpecificVertical ? verticalLanding.tagline : hostBrand.tagline}
        backHref={resolvedBackHref}
        onBack={activeTab === "cadastro" && registerStep === 2 ? () => setRegisterStep(1) : undefined}
        step={activeTab === "cadastro" ? registerStep : undefined}
        totalSteps={activeTab === "cadastro" ? 2 : undefined}
        desktopHeadline={
          isSpecificVertical
            ? verticalLanding.hero_title
            : "A infraestrutura completa para o seu negócio local."
        }
        desktopDescription={
          isSpecificVertical
            ? verticalLanding.hero_subtitle
            : "Gerencie catálogo, delivery, pedidos, PDV, finanças, CRM e equipe em tempo real com controle total."
        }
        desktopHighlights={verticalHighlights}
        mainAriaLabel="Formulário de Entrada Corporativa"
        footerSlot={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTermsSheetOpen(true)}
              className="min-h-11 px-1 hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer"
            >
              Termos de Uso
            </button>
          </div>
        }
      >
        <div className="space-y-6 w-full">
          {/* Alternador de Abas Canônico */}
          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-muted/40 border border-border w-full">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "login"
                  ? "bg-background text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="size-4 shrink-0" />
              <span>Acessar Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("cadastro");
                setRegisterStep(1);
              }}
              className={`flex-1 h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "cadastro"
                  ? "bg-background text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="size-4 shrink-0" />
              <span>Criar Conta Empresarial</span>
            </button>
          </div>

          {activeTab === "login" ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar no Painel</h1>
                <p className="text-sm text-muted-foreground">
                  Acesse com seu e-mail corporativo ou credenciais de operador.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    E-mail, Telefone ou @usuário
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-id"
                      ref={loginInputRef}
                      type="text"
                      autoComplete="username"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="empresa@exemplo.com.br"
                      className="pl-10 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                      disabled={isLoginLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="login-password"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Senha de Acesso
                    </Label>
                    <Link
                      to="/recuperar-senha"
                      className="min-h-11 inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-12 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                      disabled={isLoginLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? "Ocultar senha" : "Exibir senha"}
                      className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoginLoading || isOAuthLoading}
                  className="w-full h-11 min-h-11 rounded-xl text-sm font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isLoginLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Workspace</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-border w-full" />
                <span className="bg-background px-3 text-xs text-muted-foreground uppercase font-semibold">
                  ou
                </span>
                <div className="border-t border-border w-full" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isOAuthLoading || isLoginLoading}
                className="w-full h-11 min-h-11 rounded-xl text-sm font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isOAuthLoading ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <GoogleLogo className="size-4" weight="bold" />
                )}
                <span>Acessar com Google</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar Conta Empresarial</h1>
                <p className="text-sm text-muted-foreground">
                  {registerStep === 1
                    ? "Informe os dados do gestor ou titular da empresa."
                    : "Crie sua senha de acesso e aceite os termos para configurar sua loja."}
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {registerStep === 1 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nome Completo do Gestor
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-name"
                          ref={registerInputRef}
                          type="text"
                          autoComplete="name"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="pl-10 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                          disabled={isRegisterLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail Corporativo
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="contato@empresa.com"
                          className="pl-10 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                          disabled={isRegisterLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Telefone / WhatsApp
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          autoComplete="tel"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          placeholder="(49) 99999-9999"
                          className="pl-10 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                          disabled={isRegisterLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => {
                        if (!registerName.trim() || !registerEmail.trim().includes("@")) {
                          toast.error("Informe o nome do responsável e um e-mail corporativo válido.");
                          return;
                        }
                        setRegisterStep(2);
                      }}
                      className="w-full h-11 min-h-11 rounded-xl text-sm font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>Prosseguir</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Criar Senha de Segurança (mínimo 6)
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-password"
                          type={showRegisterPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-12 h-11 min-h-11 text-base md:text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                          disabled={isRegisterLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          aria-label={showRegisterPassword ? "Ocultar senha" : "Exibir senha"}
                          className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl cursor-pointer"
                        >
                          {showRegisterPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-1">
                      <input
                        type="checkbox"
                        id="terms-check"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="size-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer"
                      />
                      <label htmlFor="terms-check" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        Declaro ciência e concordância com os{" "}
                        <button
                          type="button"
                          onClick={() => setIsTermsSheetOpen(true)}
                          className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                        >
                          Termos de Adesão Comercial e LGPD
                        </button>
                        .
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRegisterStep(1)}
                        className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0"
                      >
                        Voltar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isRegisterLoading || !acceptTerms}
                        className="flex-1 h-11 min-h-11 rounded-xl text-sm font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isRegisterLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                            <span>Criando conta...</span>
                          </>
                        ) : (
                          <>
                            <span>Criar Conta e Abrir Negócio</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </AuthSplitExperienceShell>

      <LegalTermsSheet
        isOpen={isTermsSheetOpen}
        onOpenChange={setIsTermsSheetOpen}
        initialSlug="termos"
        onAccept={() => {
          setAcceptTerms(true);
          setIsTermsSheetOpen(false);
        }}
      />
    </>
  );
}
