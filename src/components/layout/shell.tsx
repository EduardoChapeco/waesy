import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  bottomBar?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Primitiva Canônica de Shell Adaptativo (Shell)
 * Bifurca de forma limpa entre Compact (<600px) e Expanded (>=840px),
 * eliminando encadeamento de scroll aninhado e garantindo estrutura de superfície única.
 */
export const Shell = forwardRef<HTMLDivElement, ShellProps>(
  (
    {
      className,
      sidebar,
      header,
      bottomBar,
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    const isBoxed = Boolean(fullWidth) === false;

    return (
      <div
        ref={ref}
        className={cn(
          "min-h-dvh w-full flex flex-col bg-background text-foreground antialiased",
          className
        )}
        {...props}
      >
        {header}

        <div className="flex-1 flex w-full min-h-0">
          {sidebar && (
            <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/60 bg-card/40">
              {sidebar}
            </aside>
          )}

          <main
            className={cn(
              "flex-1 min-w-0 flex flex-col",
              isBoxed && "max-w-7xl mx-auto w-full"
            )}
          >
            {children}
          </main>
        </div>

        {bottomBar}
      </div>
    );
  }
);

Shell.displayName = "Shell";
