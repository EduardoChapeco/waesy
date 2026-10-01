import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Largura máxima do conteúdo:
   * - 'default': max-w-7xl centrado (padrão de dashboards e workspaces)
   * - 'compact': max-w-3xl centrado (focado para formulários e fluxos de decisão)
   * - 'fluid': 100% de largura (mapas, kanban, editores)
   * - 'reading': max-w-2xl centrado (termos, artigos, documentação)
   */
  width?: "default" | "compact" | "fluid" | "reading";
  /**
   * Se true, ocupa a altura total da viewport dinâmica (100dvh)
   */
  fullHeight?: boolean;
  /**
   * Padding horizontal padronizado na grade modular (px-4 sm:px-6 lg:px-8)
   */
  padded?: boolean;
}

const widthMap = {
  default: "max-w-7xl mx-auto",
  compact: "max-w-3xl mx-auto",
  fluid: "w-full",
  reading: "max-w-2xl mx-auto",
};

/**
 * Primitiva Canônica de Página (Page)
 * Obedece às regras de DESIGN.md: fundo limpo neutro, zero gradientes decorativos,
 * altura dinâmica min-h-dvh e conformidade com safe areas.
 */
export const Page = forwardRef<HTMLDivElement, PageProps>(
  (
    {
      className,
      width = "default",
      fullHeight = false,
      padded = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full bg-background text-foreground antialiased",
          fullHeight ? "min-h-dvh flex flex-col" : "min-h-screen",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "w-full flex-1",
            widthMap[width],
            padded && "px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

Page.displayName = "Page";
