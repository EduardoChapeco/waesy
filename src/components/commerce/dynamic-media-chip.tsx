/**
 * dynamic-media-chip.tsx — Componente Canônico de Botão/Chip com Mídia & Textura
 */

import React from "react";
import { Link } from "@tanstack/react-router";
import { SquaresFour } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";

export type MediaChipTexture = "none" | "noise" | "dots" | "grid" | "mesh" | "glass";

export interface DynamicMediaChipProps {
 id?: string;
 slug?: string;
 label: string;
 to?: string;
 href?: string;
 search?: Record<string, any>;
 onClick?: () => void;
 icon?: React.ElementType;
 icon_url?: string | null;
 emoji?: string | null;
 badge?: string | null;
 count?: number | null;
 isActive?: boolean;

 // Propriedades Visuais de Mídia e Textura
 bg_media_type?: "none" | "image" | "video" | "gif" | null;
 bg_media_url?: string | null;
 mediaUrl?: string | null;
 bg_color?: string | null;
 bg_overlay_opacity?: number | null; // 0 to 100
 bg_texture?: MediaChipTexture | null;
 texture?: MediaChipTexture | null;

 size?: "sm" | "md" | "lg";
 className?: string;
 ariaLabel?: string;
}

export function DynamicMediaChip({
 id,
 slug,
 label,
 to: toProp,
 href,
 search,
 onClick,
 icon: IconComponent = SquaresFour,
 icon_url,
 emoji,
 badge,
 count,
 isActive = false,
 bg_media_type: mediaTypeProp = "none",
 bg_media_url: mediaUrlProp,
 mediaUrl,
 bg_color,
 bg_overlay_opacity = 35,
 bg_texture: textureProp = "none",
 texture,
 size = "md",
 className = "",
 ariaLabel,
}: DynamicMediaChipProps) {
 const to = toProp || href;
 const resolvedMediaUrl = mediaUrlProp || mediaUrl;
 const bg_media_type = (mediaTypeProp && mediaTypeProp !== "none") ? mediaTypeProp : (resolvedMediaUrl ? "image" : "none");
 const bg_media_url = resolvedMediaUrl;
 const bg_texture = textureProp !== "none" ? textureProp : (texture || "none");
 const hasMedia = Boolean(bg_media_type && bg_media_type !== "none" && bg_media_url);
 const isVideo = bg_media_type === "video" && Boolean(bg_media_url);
 const overlayOpacity = Math.max(0, Math.min(100, bg_overlay_opacity ?? 35)) / 100;

 const getTextureStyle = () => {
 switch (bg_texture) {
 case "noise":
 return "bg-[radial-gradient(#00000015_1px,transparent_1px)] [background-size:8px_8px]";
 case "dots":
 return "bg-[radial-gradient(#ffffff25_1px,transparent_1px)] [background-size:6px_6px]";
 case "grid":
 return "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:10px_10px]";
 case "mesh":
 return "bg-gradient-to-tr from-primary/20 via-purple-500/10 to-amber-500/20";
 case "glass":
 return "backdrop-blur-md bg-background/60";
 default:
 return "";
 }
 };

 const heightClasses = {
 sm: "h-10 px-3.5 text-xs rounded-xl",
 md: "h-12 sm:h-14 px-4 sm:px-5 text-xs sm:text-sm rounded-2xl",
 lg: "h-16 px-6 text-sm sm:text-base rounded-2xl",
 }[size];

 const iconSizes = {
 sm: "size-5",
 md: "size-6 sm:size-8",
 lg: "size-8 sm:size-9",
 }[size];

 const content = (
 <div
 className={`relative overflow-hidden inline-flex items-center gap-2 sm:gap-3 border transition-all select-none group cursor-pointer shrink-0 max-w-full active:scale-[0.98] ${heightClasses} ${
 isActive
 ? "border-foreground ring-2 ring-foreground/10 font-bold"
 : "border-border hover:border-foreground/30 hover:bg-muted/60"
 } ${!hasMedia && !bg_color ? (isActive ? "bg-foreground text-background" : "bg-card text-foreground") : ""} ${className}`}
 style={{
 backgroundColor: bg_color && !hasMedia ? bg_color : undefined,
 }}
 >
 {/* 1. Mídia de Background (Vídeo MP4 / GIF / Imagem) */}
 {hasMedia && (
 <div className="absolute inset-0 size-full overflow-hidden pointer-events-none z-0">
 {isVideo ? (
 <video
 src={bg_media_url!}
 autoPlay
 loop
 muted
 playsInline
 className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
 />
 ) : (
 <img
 src={bg_media_url!}
 alt=""
 className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
 loading="lazy"
 />
 )}

 {/* Overlay de contraste configurável */}
 <div
 className="absolute inset-0 bg-black transition-opacity duration-300 group-hover:opacity-40"
 style={{ opacity: overlayOpacity }}
 />

 {/* Textura sobreposta */}
 {bg_texture && bg_texture !== "none" && (
 <div className={`absolute inset-0 pointer-events-none ${getTextureStyle()}`} />
 )}
 </div>
 )}

 {/* 2. Conteúdo em Primeiro Plano (Ícone + Label + Badges) */}
 <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
 {/* Ícone / Emoji / PNG */}
 <div
 className={`relative ${iconSizes} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${
 hasMedia
 ? "text-white drop-shadow-sm"
 : isActive
 ? "text-background"
 : "text-foreground"
 }`}
 >
 {icon_url ? (
 <img
 src={icon_url}
 alt={label}
 className="size-full object-contain drop-shadow-sm"
 loading="lazy"
 onError={(e) => {
 (e.currentTarget as HTMLElement).style.display = "none";
 }}
 />
 ) : emoji ? (
 <span className="text-lg sm:text-2xl leading-none">{emoji}</span>
 ) : (
 <IconComponent
 size={size === "sm" ? 18 : 22}
 weight={isActive ? "fill" : "bold"}
 />
 )}
 </div>

 {/* Label de Texto com Contraste Automático */}
 <span
 className={`font-bold truncate tracking-tight transition-colors min-w-0 ${
 hasMedia
 ? "text-white drop-shadow-sm group-hover:text-amber-200"
 : isActive
 ? "text-background"
 : "text-foreground"
 }`}
 >
 {label}
 </span>

 {/* Contador Opcional */}
 {typeof count === "number" && (
 <span
 className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
 hasMedia
 ? "bg-black/40 text-white border border-white/20"
 : isActive
 ? "bg-background/20 text-background"
 : "bg-muted text-muted-foreground"
 }`}
 >
 {count}
 </span>
 )}

 {/* Badge Opcional */}
 {badge && (
 <Badge
 variant="outline"
 className={`text-[9px] uppercase font-mono px-1.5 py-0 h-4 shrink-0 max-w-[110px] truncate ${
 hasMedia
 ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
 : isActive
 ? "bg-background/20 text-background border-background/40"
 : "bg-primary/10 text-primary border-primary/20"
 }`}
 >
 {badge}
 </Badge>
 )}
 </div>
 </div>
 );

 if (to) {
 return (
 <Link
 to={to as any}
 search={search as any}
 className="focus:outline-none shrink-0"
 aria-label={ariaLabel || label}
 >
 {content}
 </Link>
 );
 }

 return (
 <button
 type="button"
 onClick={onClick}
 className="focus:outline-none shrink-0"
 aria-label={ariaLabel || label}
 >
 {content}
 </button>
 );
}
