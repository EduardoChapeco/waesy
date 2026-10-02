import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  divided?: boolean;
}

/**
 * Primitiva Canônica de Seção (Section)
 * Agrupamento semântico com tipografia proporcional, espaçamento 4px e cabeçalho desacoplado.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      className,
      title,
      description,
      actions,
      divided = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          "w-full py-4 sm:py-6",
          divided && "border-b border-border/60 last:border-b-0",
          className
        )}
        {...props}
      >
        {(title || actions || description) && (
          <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && (
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-2 sm:mt-0 flex items-center gap-2">
                {actions}
              </div>
            )}
          </header>
        )}
        <div className="w-full">{children}</div>
      </section>
    );
  }
);

Section.displayName = "Section";
