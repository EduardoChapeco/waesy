import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Primitiva Canônica de Campo (Field)
 * Conecta rótulo, controle, texto de apoio e mensagem de erro com acessibilidade total (WCAG 2.2 AA).
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(
  (
    {
      className,
      label,
      htmlFor,
      required = false,
      hint,
      error,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2 w-full", disabled && "opacity-60", className)}
        {...props}
      >
        {label && (
          <label
            htmlFor={htmlFor}
            className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1 select-none"
          >
            <span>{label}</span>
            {required && <span className="text-destructive font-bold" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="w-full">{children}</div>

        {hint && false === hasError && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}

        {hasError && (
          <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

Field.displayName = "Field";
