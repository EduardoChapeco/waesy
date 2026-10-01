import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { NativeBackButton } from "@/components/ui/native-back-button";

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  sticky?: boolean;
}

/**
 * Primitiva Canônica de Barra de Ferramentas / Cabeçalho (Toolbar)
 * Padroniza a navegação superior e ações contextuais com suporte nativo a safe-area e mobile touch targets.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (
    {
      className,
      title,
      subtitle,
      badge,
      backHref,
      onBack,
      actions,
      filters,
      sticky = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full bg-background/95 backdrop-blur-sm border-b border-border/60 py-3 px-4 sm:px-6 transition-colors",
          sticky && "sticky top-0 z-30",
          className
        )}
        {...props}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {(backHref || onBack) && (
              <NativeBackButton
                to={backHref}
                onClick={onBack} /* focus-visible:ring-2 */
                className="shrink-0 focus-visible:ring-2"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {title && (
                  <h1 className="text-base sm:text-xl font-semibold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {(filters || actions) && (
            <div className="flex items-center gap-2 flex-wrap sm:shrink-0 justify-between sm:justify-end">
              {filters && <div className="flex items-center gap-2">{filters}</div>}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Toolbar.displayName = "Toolbar";
