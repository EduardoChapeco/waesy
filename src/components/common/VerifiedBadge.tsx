import React from "react";
import { cn } from "@/lib/utils";

export interface VerifiedBadgeProps {
  /**
   * Status de verificação ativado exclusivamente pelo Admin Master.
   * Se for false ou indefinido, o componente renderiza estritamente NULL.
   */
  isVerified?: boolean | null;
  /**
   * URL do selo personalizado carregado pelo Admin Master (PNG, WebP, SVG).
   */
  badgeUrl?: string | null;
  /**
   * Tamanho do selo: sm (14px), md (16px - padrão), lg (20px).
   */
  size?: "sm" | "md" | "lg";
  /**
   * Título acessível para tooltip e leitor de tela.
   */
  title?: string;
  className?: string;
}

const sizeClasses = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * Selo de Verificação Soberano Waesy
 * Regra Pétrea: Proibido selos ou checkmarks automáticos/arbitrários.
 * Somente o Admin Master tem o poder de autenticar um usuário, loja ou anúncio.
 */
export function VerifiedBadge({
  isVerified,
  badgeUrl,
  size = "md",
  title = "Verificado pelo Admin Master",
  className,
}: VerifiedBadgeProps) {
  if (!isVerified) {
    return null;
  }

  const dimensionClass = sizeClasses[size] || sizeClasses.md;

  if (badgeUrl) {
    return (
      <span
        title={title}
        aria-label={title}
        className={cn("inline-flex items-center justify-center shrink-0 align-middle select-none", className)}
      >
        <img
          src={badgeUrl}
          alt={title}
          className={cn(dimensionClass, "object-contain")}
          loading="lazy"
          onError={(e) => {
            // Em caso de falha no carregamento do arquivo customizado, esconde a tag de imagem
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      </span>
    );
  }

  // Selo canônico de roseta soberana com checagem interna (padrão oficial soberano, não o CheckCircle genérico)
  return (
    <span
      title={title}
      aria-label={title}
      className={cn("inline-flex items-center justify-center shrink-0 align-middle select-none", className)}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn(dimensionClass, "text-sky-500 fill-sky-500")}
        aria-hidden="true"
      >
        {/* Roseta de 8 pontas geométrica suave (estilo verificado oficial soberano) */}
        <path d="M10.29 2.21a2.4 2.4 0 0 1 3.42 0l.94.94a2.4 2.4 0 0 0 1.7.7h1.33a2.4 2.4 0 0 1 2.4 2.4v1.33a2.4 2.4 0 0 0 .7 1.7l.94.94a2.4 2.4 0 0 1 0 3.42l-.94.94a2.4 2.4 0 0 0-.7 1.7v1.33a2.4 2.4 0 0 1-2.4 2.4h-1.33a2.4 2.4 0 0 0-1.7.7l-.94.94a2.4 2.4 0 0 1-3.42 0l-.94-.94a2.4 2.4 0 0 0-1.7-.7H8.33a2.4 2.4 0 0 1-2.4-2.4v-1.33a2.4 2.4 0 0 0-.7-1.7l-.94-.94a2.4 2.4 0 0 1 0-3.42l.94-.94a2.4 2.4 0 0 0 .7-1.7V6.25a2.4 2.4 0 0 1 2.4-2.4h1.33a2.4 2.4 0 0 0 1.7-.7l.94-.94Z" />
        <path
          d="m9.5 12 1.75 1.75 3.5-3.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
