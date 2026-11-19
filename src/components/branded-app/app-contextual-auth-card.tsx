/**
 * app-contextual-auth-card.tsx — Autenticação Contextual Escopada no App da Empresa
 * Suporta: (1) Código do Cliente / Token Mágico, (2) E-mail & Senha + OTP Magic Link,
 * (3) Criação de Conta do Cliente diretamente dentro do App sem redirecionar para /entrar global.
 */

import React, { useState } from "react";
import { ArrowRight, Key, LockKey, UserPlus, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBrowserClient } from "@/lib/supabase";
import { syncSessionToCookies } from "@/services/auth.functions";
import { cn } from "@/lib/utils";

export interface AppContextualAuthCardProps {
  storeId: string;
  storeName: string;
  storeWhatsapp?: string | null;
  allowSelfSignup?: boolean;
  tokenInvalid?: boolean;
  initialClientCode?: string | null;
  isUnlockingCode?: boolean;
  onUnlockByCode: (payload: {
    storeId: string;
    clientCodeOrToken: string;
    verificationFactor?: string;
  }) => void;
  onAuthenticatedSession: (profileHint?: { fullName?: string; phone?: string; email?: string }) => Promise<void> | void;
  className?: string;
}

type AuthSubMode = "code" | "signin" | "signup";

export function AppContextualAuthCard({
  storeId,
  storeName,
  storeWhatsapp,
  tokenInvalid = false,
  initialClientCode = "",
  isUnlockingCode = false,
  onUnlockByCode,
  onAuthenticatedSession,
  className,
}: AppContextualAuthCardProps) {
  const [mode, setMode] = useState<AuthSubMode>(initialClientCode ? "code" : "signin");
  const [codeInput, setCodeInput] = useState(initialClientCode || "");
  const [verificationInput, setVerificationInput] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const isDirectTokenEntry = codeInput.trim().startsWith("wca_") || codeInput.trim().length >= 28;
  const cleanWa = String(storeWhatsapp || "").replace(/\D/g, "");

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) {
      toast.error("Informe o Código do Cliente ou cole seu Token Mágico.");
      return;
    }
    if (!isDirectTokenEntry && verificationInput.trim().length < 4) {
      toast.error("Informe os 4 últimos dígitos do WhatsApp, CPF ou e-mail cadastrado.");
      return;
    }
    onUnlockByCode({
      storeId,
      clientCodeOrToken: codeInput.trim(),
      verificationFactor: verificationInput.trim() || undefined,
    });
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setIsBusy(true);
    try {
      const client = getBrowserClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (data.session?.access_token && data.session?.refresh_token) {
        await syncSessionToCookies({
          data: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
      }
      toast.success(`Bem-vindo ao App de ${storeName}!`);
      await onAuthenticatedSession({ email: email.trim().toLowerCase() });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendOtpLink = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe seu e-mail para receber o link de acesso rápido.");
      return;
    }
    setIsBusy(true);
    try {
      const client = getBrowserClient();
      const redirectTarget =
        typeof window !== "undefined" ? window.location.href : undefined;
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTarget,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Link de acesso enviado para o seu e-mail!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar link por e-mail.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignUpInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2 || !email.trim().includes("@") || password.length < 6) {
      toast.error("Preencha nome completo, e-mail válido e senha com pelo menos 6 caracteres.");
      return;
    }
    setIsBusy(true);
    try {
      const client = getBrowserClient();
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            origin_store_id: storeId,
          },
          emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      if (error) throw error;
      if (data.session?.access_token && data.session?.refresh_token) {
        await syncSessionToCookies({
          data: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
        toast.success(`Conta criada no App de ${storeName}!`);
        await onAuthenticatedSession({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase(),
        });
      } else {
        setOtpSent(true);
        toast.success("Cadastro iniciado! Confirme seu e-mail para liberar sua Área.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 max-w-lg mx-auto", className)}>
      <div className="text-center space-y-2">
        <div className="size-12 rounded-2xl bg-muted border border-border mx-auto flex items-center justify-center">
          <LockKey className="size-6 text-primary" weight="duotone" />
        </div>
        <h2 className="text-base font-extrabold text-foreground">
          Minha Área · {storeName}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Acesse seus pedidos, viagens, propostas, ingressos, contratos e atendimento sem sair do App.
        </p>
        {tokenInvalid && (
          <p className="text-xs font-medium text-destructive">
            O link utilizado expirou ou foi substituído. Entre novamente ou valide seu código abaixo.
          </p>
        )}
      </div>

      {/* Seletor 3 modos contextuais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-xl border border-border bg-muted/40">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={cn(
            "h-11 min-h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === "signin" ? "bg-card text-foreground border border-border" : "text-muted-foreground",
          )}
        >
          <EnvelopeSimple className="size-3.5 shrink-0" />
          <span>Entrar</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("code")}
          className={cn(
            "h-11 min-h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === "code" ? "bg-card text-foreground border border-border" : "text-muted-foreground",
          )}
        >
          <Key className="size-3.5 shrink-0" />
          <span>Código</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={cn(
            "h-11 min-h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            mode === "signup" ? "bg-card text-foreground border border-border" : "text-muted-foreground",
          )}
        >
          <UserPlus className="size-3.5 shrink-0" />
          <span>Cadastrar</span>
        </button>
      </div>

      {mode === "code" && (
        <form onSubmit={handleCodeSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="client-code-input" className="text-xs font-semibold text-foreground">
              Código do Cliente ou Token Mágico
            </Label>
            <Input
              id="client-code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Ex: CLI-DAAF"
              className="h-11 min-h-11 rounded-xl text-base sm:text-sm font-mono uppercase"
              autoComplete="off"
            />
          </div>

          {!isDirectTokenEntry && (
            <div className="space-y-1">
              <Label htmlFor="client-verification-input" className="text-xs font-semibold text-foreground">
                Confirmação (4 últimos dígitos do WhatsApp, CPF ou e-mail)
              </Label>
              <Input
                id="client-verification-input"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                placeholder="Ex: 1265 ou cliente@email.com"
                className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
                autoComplete="off"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isUnlockingCode}
            className="w-full h-11 min-h-11 px-6 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            <span>{isUnlockingCode ? "Validando acesso..." : "Acessar com Código"}</span>
            <ArrowRight className="size-4" />
          </Button>
        </form>
      )}

      {mode === "signin" && (
        <form onSubmit={handlePasswordSignIn} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="app-login-email" className="text-xs font-semibold text-foreground">
              E-mail cadastrado
            </Label>
            <Input
              id="app-login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-login-password" className="text-xs font-semibold text-foreground">
              Senha
            </Label>
            <Input
              id="app-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
            />
          </div>

          {otpSent && (
            <p className="text-xs font-semibold text-primary">
              Link de acesso único enviado para seu e-mail!
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isBusy}
              className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <span>{isBusy ? "Entrando..." : "Entrar no App"}</span>
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={handleSendOtpLink}
              className="w-full h-11 min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Receber link rápido por e-mail
            </Button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={handleSignUpInApp} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="app-signup-name" className="text-xs font-semibold text-foreground">
              Nome Completo
            </Label>
            <Input
              id="app-signup-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="app-signup-phone" className="text-xs font-semibold text-foreground">
                WhatsApp
              </Label>
              <Input
                id="app-signup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="app-signup-email" className="text-xs font-semibold text-foreground">
                E-mail
              </Label>
              <Input
                id="app-signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="app-signup-password" className="text-xs font-semibold text-foreground">
              Criar Senha
            </Label>
            <Input
              id="app-signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="h-11 min-h-11 rounded-xl text-base sm:text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={isBusy}
            className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>{isBusy ? "Criando conta..." : `Criar Acesso em ${storeName}`}</span>
          </Button>
        </form>
      )}

      {cleanWa && (
        <div className="pt-3 border-t border-border/60 flex justify-center">
          <a
            href={`https://wa.me/${cleanWa.startsWith("55") ? cleanWa : `55${cleanWa}`}?text=${encodeURIComponent(
              `Olá! Preciso de acesso à Minha Área no App de ${storeName}.`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2"
          >
            <WhatsappLogo className="size-4 text-emerald-600" weight="fill" />
            <span>Solicitar código no WhatsApp da loja</span>
          </a>
        </div>
      )}
    </div>
  );
}
