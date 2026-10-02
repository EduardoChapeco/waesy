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
 blue: "bg-linear-to-r from-blue-700 via-indigo-600 to-violet-700 text-white",
 indigo: "bg-linear-to-r from-indigo-800 via-blue-700 to-sky-600 text-white",
 purple: "bg-linear-to-r from-purple-800 via-violet-700 to-fuchsia-700 text-white",
 emerald: "bg-linear-to-r from-emerald-800 via-teal-700 to-cyan-700 text-white",
 amber: "bg-linear-to-r from-amber-700 via-orange-600 to-rose-700 text-white",
 dark: "bg-linear-to-r from-zinc-900 via-zinc-800 to-black text-white",
 none: "bg-card text-foreground",
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
 "relative w-full rounded-lg overflow-hidden min-h-[110px] p-5 sm:p-6 transition-all",
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

 {/* Sobreposição de Cor / Gradiente para Leitura */}
 {isOverlayVisible && (
 <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30 backdrop-blur-[1px]" />
 )}
 </div>
 )}

 {/* ── Conteúdo do Banner Fino ── */}
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 text-white">
 <div className="space-y-2 max-w-2xl">
 {/* Badge Opcional */}
 {isBadgeVisible && effectiveBadge && (
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-md text-white border border-white/20">
 {effectiveBadge}
 </span>
 </div>
 )}

 {/* Título */}
 {isTitleVisible && effectiveTitle && (
 <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-snug text-white drop-shadow-xs">
 {effectiveTitle}
 </h2>
 )}

 {/* Descrição / Subtítulo */}
 {isDescVisible && effectiveSubtitle && (
 <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
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
 className="h-11 px-6 rounded-lg font-bold text-xs bg-white text-zinc-950 hover:bg-white/90 cursor-pointer transition-all active:scale-95"
 >
 <span>{effectiveCtaLabel}</span>
 <ArrowRight className="size-3.5 ml-2" />
 </Button>
 ) : effectiveTargetUrl.startsWith("http") ? (
 <Button
 asChild
 className="h-11 px-6 rounded-lg font-bold text-xs bg-white text-zinc-950 hover:bg-white/90 cursor-pointer transition-all active:scale-95"
 >
 <a href={effectiveTargetUrl} target="_blank" rel="noopener noreferrer">
 <span>{effectiveCtaLabel}</span>
 <ExternalLink className="size-3.5 ml-2" />
 </a>
 </Button>
 ) : (
 <Button
 asChild
 className="h-11 px-6 rounded-lg font-bold text-xs bg-white text-zinc-950 hover:bg-white/90 cursor-pointer transition-all active:scale-95"
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
