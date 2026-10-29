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
  } catch {
    // Silently ignore telemetry read errors
  }
  return undefined;
}

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
  validateSearch: (search: Record<string, unknown>): { returnUrl?: string; aba?: "login" | "cadastro" } => {
    return {
      returnUrl: typeof search.returnUrl === "string" ? search.returnUrl : undefined,
      aba: search.aba === "cadastro" ? "cadastro" : "login",
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
          session?.role === "platform_admin";

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
          throw redirect({ to: "/criar-negocio" });
        }
      }
    } catch (e: unknown) {
      if (isRedirect(e)) throw e;
    }

    try {
      const brand = await getPublicBrandSettings();
      return { brand };
    } catch {
      return { brand: null };
    }
  },
  component: PainelAuthPage,
});

type TabMode = "login" | "cadastro";

function PainelAuthPage() {
  const { brand } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();

  const [activeTab, setActiveTab] = useState<TabMode>(search.aba === "cadastro" ? "cadastro" : "login");

  // Form states - Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
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
            const { getBrowserClient } = await import("@/lib/supabase");
            await getBrowserClient().auth.setSession({
              access_token: (res as any).session.access_token,
              refresh_token: (res as any).session.refresh_token,
            });
          } catch (clientErr) {
            console.warn("[painel] Falha ao sincronizar sessão no cliente:", clientErr);
          }
        }

        toast.success("Acesso autorizado ao painel.");
        await router.invalidate();

        // Verifica se tem loja para encaminhar adequadamente
        const userSession = await getUserSession().catch(() => null);
        const hasStore =
          (userSession?.memberships && userSession.memberships.length > 0) ||
          Boolean(userSession?.store_id) ||
          userSession?.role === "store_owner" ||
          userSession?.role === "owner" ||
          userSession?.role === "admin" ||
          userSession?.role === "platform_admin";

        if (hasStore) {
          navigate({ to: "/workspace", replace: true });
        } else {
          navigate({ to: "/criar-negocio", replace: true });
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
          redirectTo: "/criar-negocio",
          isConsentLgpd: true,
          clientLocation,
        },
      });

      if (!result.success) {
        toast.error(result.message || "Não foi possível criar a conta empresarial.");
        return;
      }

      toast.success("Conta criada com sucesso! Iniciando abertura do seu negócio.");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("waesy_just_registered", "true");
      }
      await router.invalidate();
      navigate({ to: "/criar-negocio", replace: true });
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

  const brandName = brand?.company_name || brand?.site_name || "Waesy";

  return (
    <div className="min-h-dvh w-full flex flex-col lg:flex-row bg-background text-foreground">
      {/* ── Painel Editorial Lateral (Desktop >= 1024px) ── */}
      <section
        aria-label="Apresentação Corporativa"
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between border-r border-border bg-muted/20 p-12 relative overflow-hidden"
      >
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Building2 className="size-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">{brandName} Business</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Painel Operacional</p>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              A infraestrutura completa para o seu negócio local.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
              Gerencie catálogo, delivery, pedidos, serviços e equipe em tempo real com controle total da sua operação.
            </p>
          </div>

          <div className="pt-6 space-y-3 max-w-md">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                <Store className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Vitrines e Delivery Integrado</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Receba pedidos diretamente no seu WhatsApp e organize despachos sem intermediários abusivos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Gestão Financeira & Caixa</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Controle faturamento, contas a receber, comissões de equipe e relatórios fiscais em um único lugar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Segurança & Governança Zero-Trust</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Permissões por perfil de colaborador (vendedor, gerente, financeiro) com rastreio de auditoria.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>{brandName} Ecossistema Local</span>
          <Link
            to="/"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1 py-1"
          >
            Acessar vitrine pública
          </Link>
        </div>
      </section>

      {/* ── Painel de Ações e Formulários (Mobile & Desktop) ── */}
      <main
        role="main"
        aria-label="Formulário de Entrada Corporativa"
        className="flex-1 flex flex-col justify-between p-6 sm:p-8 md:p-12 lg:p-16 max-w-2xl mx-auto w-full"
      >
        {/* Top Header Mobile */}
        <div className="flex items-center justify-between w-full lg:hidden pb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">{brandName} Business</span>
              <p className="text-xs text-muted-foreground">Painel Operacional</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-2"
          >
            Vitrine
          </Link>
        </div>

        <div className="my-auto py-8 space-y-6 w-full">
          {/* Alternador de Abas Canônico */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-muted/40 border border-border w-full">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 h-11 min-h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === "login"
                    ? "bg-background text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="size-4" />
                <span>Acessar Workspace</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cadastro")}
                className={`flex-1 h-11 min-h-11 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === "cadastro"
                    ? "bg-background text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Store className="size-4" />
                <span>Criar Conta Empresarial</span>
              </button>
            </div>
          </div>

          {/* ── ABA 1: LOGIN ── */}
          {activeTab === "login" ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Entrar no Painel</h2>
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
                      className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
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
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1 px-1"
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
                      className="pl-10 pr-12 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isLoginLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? "Ocultar senha" : "Exibir senha"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoginLoading || isOAuthLoading}
                  className="w-full h-11 min-h-11 text-sm font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
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
                className="w-full h-11 min-h-11 text-sm font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
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
            /* ── ABA 2: CADASTRO COM ENCADINHAMENTO IMEDIATO ── */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Criar Conta Empresarial</h2>
                  <Badge variant="secondary" className="text-xs font-semibold">Passo 1 de 2</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cadastre seus dados de administrador. Na sequência, você configurará sua loja imediatamente.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome Completo do Gestor / Titular
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
                      className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isRegisterLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
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
                        className="pl-10 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={isRegisterLoading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Criar Senha de Segurança (mínimo 6 caracteres)
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
                      className="pl-10 pr-12 h-11 min-h-11 text-sm bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={isRegisterLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      aria-label={showRegisterPassword ? "Ocultar senha" : "Exibir senha"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer"
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

                <Button
                  type="submit"
                  disabled={isRegisterLoading || !acceptTerms}
                  className="w-full h-11 min-h-11 text-sm font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isRegisterLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Criando conta e iniciando loja...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Conta & Abrir Meu Negócio</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Onboarding sem espera</span>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Ao clicar em criar conta, seu perfil é ativado e a tela de configuração de endereço, catálogo e horário comercial é aberta de forma imediata.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} {brandName}. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsTermsSheetOpen(true)}
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-1"
            >
              Termos de Uso
            </button>
            <Link
              to="/entrar"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-1"
            >
              Acesso Cidadão
            </Link>
          </div>
        </footer>
      </main>

      {/* Drawer com Termos Oficiais */}
      <LegalTermsSheet
        isOpen={isTermsSheetOpen}
        onOpenChange={setIsTermsSheetOpen}
        initialSlug="termos"
        onAccept={() => {
          setAcceptTerms(true);
          setIsTermsSheetOpen(false);
        }}
      />
    </div>
  );
}
