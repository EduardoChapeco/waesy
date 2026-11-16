import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AuthStepProgress } from "./auth-step-progress";

export interface AuthBrandSettings {
  platform_name?: string | null;
  logo_url?: string | null;
  login_split_image_url?: string | null;
  login_bg_desktop_url?: string | null;
  login_bg_tablet_url?: string | null;
  login_bg_mobile_url?: string | null;
}

export interface AuthSplitExperienceShellProps {
  brand?: AuthBrandSettings | null;
  brandTitle?: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
  stepAccent?: "primary" | "warning";
  desktopHeadline?: string;
  desktopDescription?: string;
  desktopHighlights?: Array<{ title: string; detail: string }>;
  footerSlot?: ReactNode;
  children: ReactNode;
  mainAriaLabel?: string;
}

export function AuthSplitExperienceShell({
  brand,
  brandTitle,
  subtitle = "Ecossistema Local",
  backHref = "/",
  onBack,
  step,
  totalSteps,
  stepAccent = "primary",
  desktopHeadline = "Sua operação comercial e descoberta local no mesmo lugar.",
  desktopDescription = "Acesse seu workspace, marketplace e agentes autônomos com segurança multi-camada.",
  desktopHighlights = [],
  footerSlot,
  children,
  mainAriaLabel = "Autenticação Waesy",
}: AuthSplitExperienceShellProps) {
  const resolvedName = brandTitle || brand?.platform_name || "Waesy";
  const rightImage =
    brand?.login_split_image_url ||
    brand?.login_bg_desktop_url ||
    brand?.login_bg_tablet_url ||
    "";
  const showProgress = Boolean(step && totalSteps && totalSteps > 1);

  return (
    <div className="min-h-dvh w-full grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground overflow-x-clip">
      {/* Coluna Esquerda: Autenticação Limpa (Desktop) + Fluxo Nativo Fullscreen Passo a Passo (Mobile) */}
      <main
        role="main"
        aria-label={mainAriaLabel}
        className="lg:order-1 min-h-dvh flex flex-col justify-between bg-background pt-safe pb-safe"
      >
        {/* Cabeçalho Único: Compacto Nativo no Mobile / Limpo Editorial no Desktop */}
        <header className="w-full border-b border-border/40 lg:border-b-0 shrink-0">
          <div className="h-14 lg:h-20 px-4 sm:px-8 xl:px-12 flex items-center justify-between gap-3 max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2 min-w-0">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Voltar"
                  className="size-11 min-h-11 min-w-11 rounded-xl border border-border/60 bg-background flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : (
                <Link
                  to={backHref as any}
                  aria-label="Voltar ao início"
                  className="size-11 min-h-11 min-w-11 rounded-xl border border-border/60 bg-background flex items-center justify-center text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                >
                  <ArrowLeft className="size-4" />
                </Link>
              )}

              <Link
                to="/"
                className="inline-flex items-center gap-2 min-h-11 px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0"
              >
                {brand?.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={resolvedName}
                    className="h-7 w-auto max-w-28 object-contain"
                  />
                ) : (
                  <span className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                    {resolvedName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-bold text-foreground truncate">{resolvedName}</span>
              </Link>
            </div>

            {showProgress ? (
              <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
                Passo {step}/{totalSteps}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
                {subtitle}
              </span>
            )}
          </div>

          {showProgress && (
            <div className="px-4 sm:px-8 xl:px-12 pb-3 max-w-2xl mx-auto w-full">
              <AuthStepProgress
                currentStep={step!}
                totalSteps={totalSteps!}
                accent={stepAccent}
              />
            </div>
          )}
        </header>

        {/* Área Central Anti-Jank do Formulário */}
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 xl:px-12 py-6">
          <div className="w-full max-w-md mx-auto">{children}</div>
        </div>

        {/* Rodapé Seguro */}
        <footer className="px-5 sm:px-8 xl:px-12 py-4 border-t border-border/40 lg:border-t-0 shrink-0">
          <div className="w-full max-w-md mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{resolvedName}</span>
            {footerSlot || (
              <Link
                to="/explorer"
                className="min-h-11 inline-flex items-center hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2"
              >
                Explorar Vitrine
              </Link>
            )}
          </div>
        </footer>
      </main>

      {/* Coluna Direita: Imagem / Visual da Marca (Desktop >= 1024px) */}
      <aside
        aria-label="Apresentação visual Waesy"
        className="hidden lg:flex lg:order-2 relative min-h-dvh bg-muted border-l border-border/60 overflow-hidden flex-col justify-between p-10 xl:p-14"
      >
        {rightImage ? (
          <>
            <img
              src={rightImage}
              alt={resolvedName}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-md border border-border/70 px-4 py-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                <span>{resolvedName}</span>
              </span>
            </div>
            <div className="relative z-10 mt-auto rounded-2xl bg-background/92 backdrop-blur-md border border-border/80 p-6 space-y-2 max-w-lg">
              <h2 className="text-xl font-bold tracking-tight text-foreground leading-snug">
                {desktopHeadline}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{desktopDescription}</p>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-background border border-border px-4 py-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                <span>{subtitle}</span>
              </span>
            </div>

            <div className="space-y-6 max-w-lg my-auto">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                  {desktopHeadline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desktopDescription}
                </p>
              </div>

              {desktopHighlights.length > 0 && (
                <div className="space-y-3">
                  {desktopHighlights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-border/70 bg-card p-4 space-y-1"
                    >
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Autenticação unificada entre Waesy Hub, Workspace Pro e apps regionais.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
