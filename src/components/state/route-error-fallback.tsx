import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface RouteErrorFallbackProps {
  error?: unknown;
  reset?: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  secondaryHref?: string;
  secondaryLabel?: string;
  showErrorDetails?: boolean;
  children?: ReactNode;
}

function getSafeErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: unknown }).message ?? "").trim();
    if (msg && msg !== "[object Object]") return msg;
  }
  return null;
}

/**
 * Fallback canônico de erro para `errorComponent` de rotas TanStack Router.
 * Garante piso WCAG 2.2 AA (botões h-11, :focus-visible:ring-2) e evita clones de JSX por rota.
 */
export function RouteErrorFallback({
  error,
  reset,
  title = "Algo não carregou como esperado",
  description = "Não foi possível carregar os dados desta tela no momento.",
  actionLabel = "Tentar novamente",
  icon: Icon = AlertTriangle,
  secondaryHref,
  secondaryLabel,
  showErrorDetails = false,
  children,
}: RouteErrorFallbackProps) {
  const details = getSafeErrorMessage(error);
  const handleRetry = () => {
    if (typeof reset === "function") {
      reset();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      className="mx-auto max-w-xl px-4 py-16 text-center space-y-4"
      role="alert"
      aria-live="polite"
    >
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {showErrorDetails ? description : details || description}
        </p>
      </div>
      {showErrorDetails && details ? (
        <pre className="mt-2 rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground overflow-auto max-h-32 text-left font-mono">
          {details}
        </pre>
      ) : null}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          onClick={handleRetry}
          className="h-11 min-h-11 px-5 rounded-lg font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="size-4 mr-2" aria-hidden="true" />
          {actionLabel}
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 px-5 rounded-lg font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link to={secondaryHref as never}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
