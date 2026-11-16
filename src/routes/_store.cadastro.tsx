import { createFileRoute, Link, useNavigate, useRouter, redirect } from "@tanstack/react-router";
import { ChevronRight, Eye, EyeOff, ShieldCheck, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { GoogleLogo } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpWithPassword, signInWithOAuth, getUserSession } from "@/services/auth.functions";
import { getPublicBrandSettings } from "@/services/master.functions";
import { ClientRegisterSchema, type RegisterForm } from "@/lib/contracts/auth.schema";
import { LegalTermsSheet } from "@/components/legal/legal-terms-sheet";
import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";
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
 loader: async () => {
 try {
 const brand = await getPublicBrandSettings().catch(() => null);
 return { brand };
 } catch {
 return { brand: null };
 }
 },
 component: RegisterPage,
});

function RegisterPage() {
 const { brand } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const router = useRouter();
 const search = Route.useSearch();
 const returnUrl = search.returnUrl ?? "/";
 const errorParam = search.error;
 const [step, setStep] = useState<1 | 2 | 3>(1);
 const [showPassword, setShowPassword] = useState(false);
 const [isTermsOpen, setIsTermsOpen] = useState(false);
 const [termsSlug, setTermsSlug] = useState("termos");

 // Integração Google Login desativada por padrão
 const isGoogleAuthEnabled = true;

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
 if (typeof window !== "undefined") {
 sessionStorage.setItem("waesy_just_registered", "true");
 }
 await router.invalidate();
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

 const handleNextStep1 = async () => {
 const valid = await form.trigger("email");
 if (valid) setStep(2);
 };

 const handleNextStep2 = async () => {
 const valid = await form.trigger("fullName");
 if (valid) setStep(3);
 };

  return (
    <AuthSplitExperienceShell
      brand={brand}
      step={step}
      totalSteps={3}
      backHref="/"
      onBack={step > 1 ? () => setStep((s) => (s === 3 ? 2 : 1)) : undefined}
      subtitle="Novo Cadastro Waesy"
      desktopHeadline="Crie sua conta em poucos passos."
      desktopDescription="Comece a comprar, anunciar classificados, acompanhar pedidos e abrir seu negócio local em um único ambiente."
      desktopHighlights={[
        { title: "Cadastro Guiado por Etapas", detail: "Fluxo progressivo sem sobrecarga visual no celular ou no computador." },
        { title: "Sessão Única Multi-Apps", detail: "Entre uma vez e navegue entre Hub, Marketplace, Notícias e Waesy Go." },
      ]}
      footerSlot={
        <Link
          to="/entrar"
          search={{ returnUrl }}
          className="min-h-11 inline-flex items-center text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2"
        >
          Já tem conta? Entrar
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Crie seu perfil
            </h1>
            <p className="text-xs text-muted-foreground">
              {step === 1
                ? "Comece informando seu e-mail ou conectando com Google."
                : step === 2
                ? "Informe como você deseja ser identificado na cidade."
                : "Defina sua senha segura e confirme os termos LGPD."}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs shrink-0">
            <Link
              to="/entrar"
              search={{ returnUrl }}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Entrar
            </Link>
            <span className="px-3 py-2 rounded-md bg-background font-bold text-foreground">
              Cadastrar
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                {isGoogleAuthEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuth("google")}
                    className="w-full h-11 min-h-11 rounded-xl font-semibold gap-2 text-sm"
                  >
                    <GoogleLogo className="size-4" weight="bold" />
                    Continuar com Google
                  </Button>
                )}

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-semibold tracking-wider">
                    <span className="bg-background px-2 text-muted-foreground">ou use seu e-mail</span>
                  </div>
                </div>

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
                          className="h-11 rounded-xl border-border bg-card/50 text-base md:text-sm focus-visible:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-semibold" />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={handleNextStep1}
                  className="w-full h-11 min-h-11 rounded-xl font-semibold gap-2 text-sm"
                >
                  <span>Prosseguir</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
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
                          className="h-11 rounded-xl border-border bg-card/50 text-base md:text-sm focus-visible:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-semibold" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0"
                  >
                    <ArrowLeft className="size-4" />
                    <span>Voltar</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextStep2}
                    className="flex-1 h-11 min-h-11 rounded-xl font-semibold gap-2 text-sm"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
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
                            className="h-11 rounded-xl border-border bg-card/50 text-base md:text-sm pr-12 focus-visible:ring-primary/20"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 size-11 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-semibold" />
                    </FormItem>
                  )}
                />

                <FormField /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
                  control={form.control}
                  name="isConsentLgpd"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0"
                  >
                    <ArrowLeft className="size-4" />
                    <span>Voltar</span>
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 min-h-11 rounded-xl font-bold bg-primary text-primary-foreground gap-2 text-sm"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "Criando..." : "Criar Conta"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>

        <LegalTermsSheet
          isOpen={isTermsOpen}
          onOpenChange={setIsTermsOpen}
          initialSlug={termsSlug}
          onAccept={() => form.setValue("isConsentLgpd", true, { shouldValidate: true })}
        />
      </div>
    </AuthSplitExperienceShell>
  );
}
