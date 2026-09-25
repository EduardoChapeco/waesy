import React from "react";
import { useRouter } from "@tanstack/react-router";
import { CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface NativeMobileHeaderProps {
  /**
   * Título principal exibido no cabeçalho.
   * Pode ser uma string simples ou um componente React (com badge, status, etc.).
   */
  title?: React.ReactNode;

  /**
   * Subtítulo contextual discreto exibido abaixo do título (ex: "Publicado há 2h" ou nome da loja).
   */
  subtitle?: React.ReactNode;

  /**
   * Determina se o botão de voltar padrão deve ser renderizado.
   * @default true
   */
  showBack?: boolean;

  /**
   * Ação customizada ao clicar no botão voltar.
   * Se omitido, utiliza a lógica inteligente do router (history.back ou fallbackHref).
   */
  onBack?: () => void;

  /**
   * Rota de fallback caso o histórico do navegador esteja vazio (ex: acesso via link direto).
   * @default "/"
   */
  fallbackHref?: string;

  /**
   * Slot de substituição ou complemento no lado esquerdo (junto ou no lugar do botão voltar).
   */
  leftSlot?: React.ReactNode;

  /**
   * Ações contextuais no lado direito (botões de compartilhar, editar, salvar, menu de opções).
   */
  rightActions?: React.ReactNode;

  /**
   * Badge numérico ou de status exibido ao lado do título (ex: contagem de itens ou status de pedido).
   */
  badge?: React.ReactNode;

  /**
   * Slot inferior integrado ao cabeçalho (ex: barra de busca, segmented tabs ou chips de filtro).
   */
  bottomSlot?: React.ReactNode;

  /**
   * Define se o cabeçalho possui fundo translúcido/transparente (ex: sobreposto a fotos de capa/banners).
   * @default false
   */
  transparent?: boolean;

  /**
   * Exibe a borda inferior sutil de 1px (Padrão Apple HIG).
   * @default true
   */
  bordered?: boolean;

  /**
   * Centraliza o título no mobile (Padrão iOS Navigation Bar).
   * @default false
   */
  centerTitle?: boolean;

  /**
   * Restringe a renderização do cabeçalho exclusivamente ao mobile (md:hidden).
   * @default false
   */
  mobileOnly?: boolean;

  /**
   * Classes adicionais no container raiz.
   */
  className?: string;
}

/**
 * 🏛️ NativeMobileHeader — Motor de Cabeçalho Canônico Waesy
 *
 * Características:
 * - Anti-Jank: Altura matemática fixa (h-12 sm:h-14) com zero Cumulative Layout Shift (CLS: 0.00).
 * - Erradicação do 1px Gap: Safe-area nativa pt-[env(safe-area-inset-top,0px)] com fundo estendido.
 * - Navegação Inteligente: Verifica window.history.length > 1 antes de executar back(), com fallback seguro.
 * - Touch Target Ergonômico: Botão de voltar com alvo mínimo de 44x44px (Apple HIG & Nielsen Norman).
 * - Slots Dinâmicos: Suporta rightActions, leftSlot, bottomSlot, badge e subtitle sem duplicar código.
 */
export function NativeMobileHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  fallbackHref = "/",
  leftSlot,
  rightActions,
  badge,
  bottomSlot,
  transparent = false,
  bordered = true,
  centerTitle = false,
  mobileOnly = false,
  className,
}: NativeMobileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
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

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full select-none transition-colors",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-md",
        bordered && !transparent ? "border-b border-border/40" : "",
        mobileOnly ? "block md:hidden" : "",
        "pt-[env(safe-area-inset-top,0px)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-12 sm:h-14 w-full min-w-0">
        {/* ── Lado Esquerdo: Botão Voltar + LeftSlot ── */}
        <div className="flex items-center gap-1 shrink-0 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="size-11 min-h-[44px] min-w-[44px] -ml-2 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-95 transition-all cursor-pointer"
              aria-label="Voltar"
            >
              <CaretLeft className="size-5 sm:size-5.5 stroke-[2.5]" />
            </button>
          )}

          {leftSlot}
        </div>

        {/* ── Centro: Título + Badge + Subtítulo ── */}
        <div
          className={cn(
            "flex-1 min-w-0 px-1.5",
            centerTitle ? "text-center flex flex-col items-center justify-center" : "flex flex-col justify-center"
          )}
        >
          <div className={cn("flex items-center gap-2 min-w-0", centerTitle ? "justify-center" : "justify-start")}>
            {typeof title === "string" ? (
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate leading-tight">
                {title}
              </h1>
            ) : (
              title
            )}

            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {subtitle && (
            <div className="text-[11px] sm:text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        {/* ── Lado Direito: Ações Contextuais (Slots) ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 justify-end">
          {rightActions}
        </div>
      </div>

      {/* ── Slot Inferior (Tabs, Busca, Chips de Filtro) ── */}
      {bottomSlot && (
        <div className="px-3 sm:px-4 pb-2.5 pt-0.5 w-full border-t border-border/20">
          {bottomSlot}
        </div>
      )}
    </header>
  );
}
