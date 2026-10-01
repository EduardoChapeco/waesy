import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface FieldGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Primitiva Canônica de Grupo de Campos (FieldGroup)
 * Utiliza elemento semântico <fieldset> e <legend> para acessibilidade de leitores de tela
 * e alinhamento pela grade modular de 4px.
 */
export const FieldGroup = forwardRef<HTMLFieldSetElement, FieldGroupProps>(
  ({ className, legend, description, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-border/60 bg-card/30 p-4 sm:p-5 flex flex-col gap-4",
          className
        )}
        {...props}
      >
        {(legend || description) && (
          <div className="mb-1">
            {legend && (
              <legend className="text-sm font-semibold text-foreground px-1 -ml-1">
                {legend}
              </legend>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </fieldset>
    );
  }
);

FieldGroup.displayName = "FieldGroup";
