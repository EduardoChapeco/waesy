import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Layers, ArrowRight, Play, Pause } from 'lucide-react';
import type { BannerDTO } from "@/services/banner.functions";

export interface BannerHeroCarouselProps {
 banners: BannerDTO[];
 className?: string;
 autoPlayIntervalMs?: number;
}

export function BannerHeroCarousel({
 banners,
 className = "",
 autoPlayIntervalMs = 6000,
}: BannerHeroCarouselProps) {
 const [currentIndex, setCurrentIndex] = useState(0);
 const [isPlaying, setIsPlaying] = useState(true);
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

 const activeBanners = banners && banners.length > 0 ? banners : [];

 useEffect(() => {
 if (!isPlaying || activeBanners.length <= 1) return;

 timerRef.current = setInterval(() => {
 setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
 }, autoPlayIntervalMs);

 return () => {
 if (timerRef.current) clearInterval(timerRef.current);
 };
 }, [isPlaying, activeBanners.length, autoPlayIntervalMs]);

 if (activeBanners.length === 0) return null;

 const currentBanner = activeBanners[currentIndex];

 const handleNext = () => {
 setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
 };

 const handlePrev = () => {
 setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
 };

 const renderMedia = (banner: BannerDTO) => {
 if (banner.media_type === "video") {
 return (
 <video
 src={banner.media_url}
 autoPlay
 loop
 muted
 playsInline
 className="size-full object-cover"
 />
 );
 }
 return (
 <img
 src={banner.media_url}
 alt={banner.title}
 className="size-full object-cover"
 loading="eager"
 onError={(e) => {
 (e.currentTarget as HTMLImageElement).style.display = "none";
 }}
 />
 );
 };

 const targetLink = bannerTargetLink(currentBanner) || "/mercado";

 return (
 <div
 className={`relative w-full overflow-hidden rounded-2xl bg-card group select-none ${className}`}
 onMouseEnter={() => setIsPlaying(false)}
 onMouseLeave={() => setIsPlaying(true)}
 >
 {/* ── Responsive Aspect Ratio Container: 16:9 mobile, 21:9 desktop ── */}
 <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden bg-muted">
 {/* Render Actual Image / Video */}
 {renderMedia(currentBanner)}

 {/* Clickable entire card link */}
 <Link
 to={targetLink as any}
 className="absolute inset-0 z-10"
 aria-label={currentBanner.title || "Banner em Destaque"}
 />

 {/* Gradient Overlay & Text (DESATIVADO POR PADRÃO — Apenas se explicitamente ativado no Admin) */}
 {currentBanner.show_overlay === true &&
 (currentBanner.title ||
 currentBanner.subtitle ||
 currentBanner.badge_text ||
 currentBanner.cta_label) && (
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/90 sm:via-black/50 sm:to-transparent flex flex-col justify-end sm:justify-center p-6 sm:p-10 lg:p-12 text-white pointer-events-none z-10">
 <div className="max-w-xl space-y-2 sm:space-y-3 z-10 pointer-events-auto">
 {currentBanner.show_badge === true && currentBanner.badge_text && (
 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white border border-white/30 ">
 <Layers className="size-3 text-amber-300" />
 <span>{currentBanner.badge_text}</span>
 </div>
 )}

 {currentBanner.show_title === true && currentBanner.title && (
 <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight line-clamp-2 text-white drop-">
 {currentBanner.title}
 </h2>
 )}

 {currentBanner.show_description === true && currentBanner.subtitle && (
 <p className="text-xs sm:text-sm text-zinc-200 line-clamp-2 leading-relaxed max-w-lg">
 {currentBanner.subtitle}
 </p>
 )}

 {currentBanner.show_cta === true && (
 <div className="pt-2">
 <Link
 to={targetLink as any}
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-100 hover:scale-105 active:scale-95 transition-all"
 >
 <span>{currentBanner.cta_label || "Conferir"}</span>
 <ArrowRight className="size-4" />
 </Link>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Navigation Arrows (Desktop) */}
 {activeBanners.length > 1 && (
 <>
 <button
 onClick={handlePrev}
 aria-label="Banner anterior"
 className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
 >
 <ChevronLeft className="size-5" />
 </button>
 <button
 onClick={handleNext}
 aria-label="Próximo banner"
 className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
 >
 <ChevronRight className="size-5" />
 </button>
 </>
 )}
 </div>
 </div>
 );
}

function bannerTargetLink(banner: BannerDTO): string {
 if (banner.target_url) return banner.target_url;
 if (banner.target_type === "category" && banner.target_id) {
 return `/mercado?categoria=${banner.target_id}`;
 }
 if (banner.target_type === "product" && banner.target_id) {
 return `/produto/${banner.target_id}`;
 }
 if (banner.target_type === "store" && banner.target_id) {
 return `/perfil-da-loja?store=${banner.target_id}`;
 }
 return "/mercado";
}
