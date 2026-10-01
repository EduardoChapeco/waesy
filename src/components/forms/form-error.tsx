import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface FormErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string | null;
}

/**
 * Primitiva Canônica de Erro de Formulário (FormError)
 * Banner semântico acessível com role="alert" para leitores de tela
 * e conformidade com WCAG 1.4.1 (ícone + texto, nunca cor isolada).
 */
export const FormError = forwardRef<HTMLDivElement, FormErrorProps>(
  ({ className, message, children, ...props }, ref) => {
    const content = message || children;
    if (!content) return null;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive",
          className
        )}
        {...props}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-1" />
        <div className="flex-1 font-medium">{content}</div>
      </div>
    );
  }
);

FormError.displayName = "FormError";
