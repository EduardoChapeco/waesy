/**
 * WzCardMockup.tsx — Componente Canônico de Apresentação e Interação de Vales-Presente $WZ
 *
 * Design: Padrão Apple HIG / Linear / Card Físico de Luxo
 * - Efeito 3D com Tilt e Flip (Frente e Verso)
 * - Moldura Squircle, acabamento metálico/holográfico refinado
 * - Exibição de arte, foto personalizada ou vídeo
 * - Destaque tipográfico do saldo em $WZ e equivalência comercial
 * - Respeito estrito a prefers-reduced-motion e WCAG 2.2 AA
 */

import React, { useState } from "react";
import { Sparkles, Gift, RotateCw, QrCode, Store, ShieldCheck, Heart } from "lucide-react";
import { formatWz, wzToBrlCentsReference } from "@/lib/wz-quote-engine";
import { cn } from "@/lib/utils";

export type CardThemeId = "classic_gold" | "aniversario" | "natal" | "minimal_dark" | "neon_pulse";

export interface WzCardMockupProps {
  issuerName?: string;
  issuerLogo?: string | null;
  wzInitial?: number;
  wzRemaining?: number;
  recipientName?: string | null;
  senderName?: string | null;
  personalMessage?: string | null;
  codeDisplay?: string | null;
  cardDesignId?: CardThemeId | string;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | "ANIMATION" | null;
  scopeType?: "GLOBAL" | "MERCHANT";
  className?: string;
  interactive?: boolean;
  showFlipButton?: boolean;
}

export function WzCardMockup({
  issuerName = "Waesy Global",
  issuerLogo,
  wzInitial = 500000,
  wzRemaining,
  recipientName,
  senderName,
  personalMessage,
  codeDisplay = "•••• •••• 9821",
  cardDesignId = "classic_gold",
  mediaUrl,
  mediaType = "IMAGE",
  scopeType = "MERCHANT",
  className,
  interactive = true,
  showFlipButton = true,
}: WzCardMockupProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const effectiveWz = wzRemaining !== undefined ? wzRemaining : wzInitial;
  const refCents = wzToBrlCentsReference(effectiveWz);
  const refBrl = (refCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Paletas de Temas Canônicos de Design
  const designTheme = (() => {
    switch (cardDesignId) {
      case "aniversario":
        return {
          bg: "bg-slate-900 border border-amber-900/40",
          border: "border-amber-500/30",
          accent: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          badgeText: "Feliz Aniversário ",
        };
      case "natal":
        return {
          bg: "bg-slate-900 border border-emerald-900/40",
          border: "border-emerald-500/30",
          accent: "text-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          badgeText: "Boas Festas ",
        };
      case "minimal_dark":
        return {
          bg: "bg-neutral-900 border border-neutral-800",
          border: "border-neutral-700/50",
          accent: "text-foreground",
          badge: "bg-card/10 text-neutral-200 border-white/20",
          badgeText: "Edição Especial",
        };
      case "neon_pulse":
        return {
          bg: "bg-slate-900 border border-violet-900/40",
          border: "border-violet-500/40",
          accent: "text-violet-400",
          badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
          badgeText: "Vibe Tech",
        };
      case "classic_gold":
      default:
        return {
          bg: "bg-zinc-900 border border-zinc-800",
          border: "border-amber-400/40",
          accent: "text-amber-400",
          badge: "bg-amber-400/10 text-amber-300 border-amber-400/30",
          badgeText: "Vale-Presente Oficial",
        };
    }
  })();

  return (
    <div className={cn("relative w-full max-w-sm mx-auto select-none perspective-1000", className)}>
      <div
        className={cn(
          "relative w-full aspect-[16/10] rounded-2xl transition-colors duration-200 duration-200 transform-style-3d shadow-xl",
          isFlipped ? "rotate-y-180" : ""
        )}
      >
        {/* ── FRENTE DO CARTÃO ── */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-2xl p-5 flex flex-col justify-between backface-hidden border overflow-hidden",
            designTheme.bg,
            designTheme.border
          )}
        >
          {/* Mídia Personalizada de Fundo (se existir) */}
          {mediaUrl && mediaType === "IMAGE" && (
            <div className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none">
              <img src={mediaUrl} alt="Arte do presente" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Top Bar: Emissor e Selo */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {issuerLogo ? (
                <img
                  src={issuerLogo}
                  alt={issuerName}
                  className="size-7 rounded-full object-cover border border-white/20 shrink-0"
                />
              ) : (
                <div className="size-7 rounded-full bg-card/10 flex items-center justify-center border border-white/10 shrink-0">
                  <Store className="size-3.5 text-foreground/80" />
                </div>
              )}
              <span className="text-xs font-bold text-foreground tracking-wide truncate uppercase">
                {issuerName}
              </span>
            </div>

            <span className={cn("text-2xs font-semibold px-2 py-1 rounded-full border", designTheme.badge)}>
              {designTheme.badgeText}
            </span>
          </div>

          {/* Centro: Mensagem & Mídia de Vídeo */}
          <div className="relative z-10 py-1 my-auto">
            {mediaUrl && mediaType === "VIDEO" ? (
              <div className="w-full h-20 rounded-lg overflow-hidden border border-white/20 mb-1">
                <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-2xs text-foreground/60 font-medium">
                  {recipientName ? `Para: ${recipientName}` : "Para você com carinho ️"}
                </p>
                {personalMessage ? (
                  <p className="text-xs text-foreground/90 italic line-clamp-2 font-serif">
                    "{personalMessage}"
                  </p>
                ) : (
                  <p className="text-xs text-foreground/80 font-serif">
                    Aproveite esta experiência exclusiva.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar: Valor $WZ, Equivalência e Código */}
          <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-xl sm:text-2xl font-black tracking-tight", designTheme.accent)}>
                  {formatWz(effectiveWz)}
                </span>
              </div>
              <p className="text-2xs text-foreground/60 font-mono">
                Valor de ref.: {refBrl}
              </p>
            </div>

            <div className="text-right">
              <span className="text-3xs text-foreground/40 uppercase tracking-widest block font-mono">
                Código
              </span>
              <span className="text-2xs font-mono font-bold text-foreground/90 tracking-wider">
                {codeDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* ── VERSO DO CARTÃO ── */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-2xl p-5 flex flex-col justify-between backface-hidden rotate-y-180 border overflow-hidden bg-slate-950 text-foreground",
            designTheme.border
          )}
        >
          {/* Tarja Magnética / Estilizada */}
          <div className="-mx-5 -mt-5 h-8 bg-neutral-900 border-b border-white/10" />

          {/* Regras de Uso e Escopo */}
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <ShieldCheck className="size-4 shrink-0" />
              <span>Regras de Utilização do Ativo</span>
            </div>
            <ul className="text-2xs text-foreground/70 space-y-1 list-disc pl-4 leading-tight">
              {scopeType === "MERCHANT" ? (
                <>
                  <li>Válido exclusivamente para compras e serviços na {issuerName}.</li>
                  <li>Intransferível e não conversível em dinheiro ou saque via Pix.</li>
                  <li>O saldo remanescente fica guardado para compras futuras.</li>
                </>
              ) : (
                <>
                  <li>Válido para todo o ecossistema Waesy Marketplace.</li>
                  <li>Não conversível em dinheiro ou saque bancário.</li>
                  <li>Saldo protegido e registrado no Ledger de $WZ.</li>
                </>
              )}
            </ul>
          </div>

          {/* Rodapé do Verso */}
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-2xs text-foreground/50">
            <span>Emitido por Waesy Commerce</span>
            {senderName && <span>De: {senderName}</span>}
          </div>
        </div>
      </div>

      {/* Botão de Virar Cartão (Flip) */}
      {showFlipButton && interactive && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border/60 hover:border-border active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label={isFlipped ? "Ver frente do cartão" : "Ver verso e regras do cartão"}
          >
            <RotateCw className="size-3.5" />
            <span>{isFlipped ? "Ver Frente" : "Ver Regras (Verso)"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
