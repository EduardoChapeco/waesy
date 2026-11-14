import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BannerDTO } from "@/services/banner.functions";
import { cn } from "@/lib/utils";

export interface SlimActionBannerProps {
 banner?: BannerDTO | null;
 // Overrides opcionais para uso direto / estático
 title?: string;
 subtitle?: string;
 badgeText?: string;
 mediaUrl?: string;
 mediaType?: "image" | "video" | "gif";
 ctaLabel?: string;
 targetUrl?: string;
 onCtaClick?: () => void;
 gradientStyle?: "blue" | "indigo" | "purple" | "emerald" | "amber" | "dark" | "none";
 showTitle?: boolean;
 showDescription?: boolean;
 showBadge?: boolean;
 showCta?: boolean;
 showOverlay?: boolean;
 className?: string;
}

const GRADIENT_CLASSES: Record<string, string> = {
  blue: "bg-primary text-primary-foreground",
  indigo: "bg-slate-900 text-slate-50",
  purple: "bg-zinc-900 text-zinc-50",
  emerald: "bg-emerald-900 text-emerald-50",
  amber: "bg-warning text-warning-foreground",
  dark: "bg-neutral-950 text-neutral-50",
  none: "bg-card border border-border text-foreground",
};

export function SlimActionBanner({
 banner,
 title,
 subtitle,
 badgeText,
 mediaUrl,
 mediaType,
 ctaLabel,
 targetUrl,
 onCtaClick,
 gradientStyle = "blue",
 showTitle,
 showDescription,
 showBadge,
 showCta,
 showOverlay,
 className = "",
}: SlimActionBannerProps) {
 // Resolução de propriedades mesclando BannerDTO com overrides
 const effectiveTitle = title ?? banner?.title ?? "";
 const effectiveSubtitle = subtitle ?? banner?.subtitle ?? "";
 const effectiveBadge = badgeText ?? banner?.badge_text ?? "";
 const effectiveMediaUrl = mediaUrl ?? banner?.media_url ?? "";
 const effectiveMediaType = mediaType ?? banner?.media_type ?? "image";
 const effectiveCtaLabel = ctaLabel ?? banner?.cta_label ?? "Conferir";
 const effectiveTargetUrl = targetUrl ?? banner?.target_url ?? "";
 const effectiveGradient = (banner as any)?.gradient_style ?? gradientStyle;

 const isTitleVisible = showTitle ?? (banner?.show_title !== undefined ? banner.show_title : Boolean(effectiveTitle));
 const isDescVisible = showDescription ?? (banner?.show_description !== undefined ? banner.show_description : Boolean(effectiveSubtitle));
 const isBadgeVisible = showBadge ?? (banner?.show_badge !== undefined ? banner.show_badge : Boolean(effectiveBadge));
 const isCtaVisible = showCta ?? (banner?.show_cta !== undefined ? banner.show_cta : Boolean(effectiveCtaLabel));
 const isOverlayVisible = showOverlay ?? (banner?.show_overlay !== undefined ? banner.show_overlay : true);

 const hasMedia = Boolean(effectiveMediaUrl);
 const bgClass = GRADIENT_CLASSES[effectiveGradient] || GRADIENT_CLASSES.blue;

 return (
 <div
 className={cn(
 "relative w-full rounded-lg overflow-hidden min-h-28 p-5 sm:p-6 transition-colors duration-200",
 !hasMedia && bgClass,
 className,
 )}
 >
 {/* ── Mídia de Fundo (Se houver Imagem / Vídeo / GIF) ── */}
 {hasMedia && (
 <div className="absolute inset-0 z-0 overflow-hidden bg-muted">
 {effectiveMediaType === "video" ? (
 <video
 src={effectiveMediaUrl}
 autoPlay
 loop
 muted
 playsInline
 className="size-full object-cover"
 />
 ) : (
 <img
 src={effectiveMediaUrl}
 alt={effectiveTitle || "Banner Promocional"}
 className="size-full object-cover"
 />
 )}

 {/* Sobreposição de Cor para Leitura */}
 {isOverlayVisible && (
 <div className="absolute inset-0 bg-neutral-950/75" />
 )}
 </div>
 )}

 {/* ── Conteúdo do Banner Fino ── */}
 <div className={cn(
 "relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5",
 hasMedia || effectiveGradient !== "none" ? "text-neutral-50" : "text-foreground",
 )}>
 <div className="space-y-2 max-w-2xl">
 {/* Badge Opcional */}
 {isBadgeVisible && effectiveBadge && (
 <div className="flex items-center gap-2">
 <span className="text-2xs font-mono font-black uppercase tracking-wider bg-card px-3 py-1 rounded-full text-foreground border border-border">
 {effectiveBadge}
 </span>
 </div>
 )}

 {/* Título */}
 {isTitleVisible && effectiveTitle && (
 <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug">
 {effectiveTitle}
 </h2>
 )}

 {/* Descrição / Subtítulo */}
 {isDescVisible && effectiveSubtitle && (
 <p className={cn(
 "text-xs sm:text-sm font-medium leading-relaxed",
 hasMedia || effectiveGradient !== "none" ? "text-neutral-200" : "text-muted-foreground",
 )}>
 {effectiveSubtitle}
 </p>
 )}
 </div>

 {/* ── Botão de Ação (CTA) ── */}
 {isCtaVisible && effectiveCtaLabel && (
 <div className="flex items-center gap-3 shrink-0">
 {onCtaClick ? (
 <Button
 onClick={onCtaClick}
 className="h-11 px-6 rounded-lg font-bold text-xs bg-card text-foreground border border-border hover:bg-muted cursor-pointer transition-transform duration-200 active:scale-95"
 >
 <span>{effectiveCtaLabel}</span>
 <ArrowRight className="size-3.5 ml-2" />
 </Button>
 ) : effectiveTargetUrl.startsWith("http") ? (
 <Button
 asChild
 className="h-11 px-6 rounded-lg font-bold text-xs bg-card text-foreground border border-border hover:bg-muted cursor-pointer transition-transform duration-200 active:scale-95"
 >
 <a href={effectiveTargetUrl} target="_blank" rel="noopener noreferrer">
 <span>{effectiveCtaLabel}</span>
 <ExternalLink className="size-3.5 ml-2" />
 </a>
 </Button>
 ) : (
 <Button
 asChild
 className="h-11 px-6 rounded-lg font-bold text-xs bg-card text-zinc-950 hover:bg-card/90 cursor-pointer transition-transform duration-200 active:scale-95"
 >
 <Link to={effectiveTargetUrl as any || "/mercado"}>
 <span>{effectiveCtaLabel}</span>
 <ArrowRight className="size-3.5 ml-2" />
 </Link>
 </Button>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
