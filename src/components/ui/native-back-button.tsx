import React from "react";
import { useRouter } from "@tanstack/react-router";
import { CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface NativeBackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Rota de fallback caso o histórico do navegador não tenha páginas anteriores no app.
   * @default "/"
   */
  fallbackHref?: string;
  /**
   * Ação customizada opcional para interceptar ou substituir o voltar nativo.
   */
  onBack?: () => void;
  /**
   * Estilo visual do botão:
   * - "default": sutil, fundo transparente com hover suave (ideal para barras e headers).
   * - "floating": vidro escuro fosco (frosted) com borda suave (ideal para heróis e imagens).
   * - "card": superfície com blur e borda (ideal para layouts sobrepostos claros).
   * - "outline": borda com contorno minimalista.
   */
  variant?: "default" | "floating" | "card" | "outline";
}

/**
 * 🏛️ NativeBackButton — Botão Canônico de Voltar Padrão Apple HIG
 *
 * Regras Invioláveis (The Singularity Protocol):
 * 1. O botão voltar é ESTRITAMENTE o ícone `<` (sem texto redundante).
 * 2. Touch target mínimo de 44x44px (Apple HIG & Nielsen Norman).
 * 3. Micro-afundamento nativo `active:scale-95`.
 * 4. Navegação inteligente com fallback seguro caso o histórico esteja vazio.
 */
export const NativeBackButton = React.forwardRef<HTMLButtonElement, NativeBackButtonProps>(
  (
    {
      className,
      fallbackHref = "/",
      onBack,
      variant = "default",
      type = "button",
      "aria-label": ariaLabel = "Voltar",
      ...props
    },
    ref
  ) => {
    const router = useRouter();

    const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (props.onClick) {
        props.onClick(e);
      }
      if (e.defaultPrevented) return;

      if (onBack) {
        onBack();
        return;
      }

      if (typeof window !== "undefined" && window.history.length > 1) {
        router.history.back();
      } else {
        router.navigate({ to: (fallbackHref as any) || "/" });
      }
    };

    const variantStyles = {
      default:
        "text-foreground/80 hover:text-foreground hover:bg-muted/50 active:bg-muted/80",
      floating:
        "bg-black/50 backdrop-blur-md text-white border border-white/20 shadow-md active:bg-black/70",
      card:
        "bg-card/90 backdrop-blur-md text-foreground border border-border/60 shadow-sm active:bg-muted",
      outline:
        "border border-border/80 text-foreground hover:bg-muted active:bg-muted/80",
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={handleBack}
        className={cn(
          "size-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center select-none active:scale-95 transition-all cursor-pointer",
          variantStyles[variant],
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        <CaretLeft className="size-5 sm:size-5.5 stroke-[2.5]" aria-hidden="true" />
      </button>
    );
  }
);

NativeBackButton.displayName = "NativeBackButton";
