import React from 'react';
import { Layers, ArrowRight, CheckCircle2, Star } from 'lucide-react';

export interface StudioSlideData {
 id: string;
 index: number;
 badge?: string;
 title: string;
 subtitle?: string;
 body?: string;
 ctaText?: string;
 imageUrl?: string;
 backgroundColor?: string;
 accentColor?: string;
 theme?: 'dark' | 'light' | 'gradient';
}

interface SlideRendererProps {
 slide: StudioSlideData;
 aspectRatio?: '1:1' | '9:16' | '16:9' | '4:5';
 className?: string;
 brandName?: string;
 brandHandle?: string;
}

export function SlideRenderer({
 slide,
 aspectRatio = '1:1',
 className = '',
 brandName = 'Waesy Store',
 brandHandle = '@waesystore',
}: SlideRendererProps) {
 const aspectClass =
 aspectRatio === '9:16'
 ? 'aspect-[9/16]'
 : aspectRatio === '16:9'
 ? 'aspect-[16/9]'
 : aspectRatio === '4:5'
 ? 'aspect-[4/5]'
 : 'aspect-square';

 const isDark = slide.theme !== 'light';
 const bgColor = slide.backgroundColor || (isDark ? '#090d16' : '#ffffff');
 const accent = slide.accentColor || '#38bdf8';

 return (
 <div
 style={{ backgroundColor: bgColor }}
 className={`w-full ${aspectClass} rounded-lg p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl border border-white/10 ${
 isDark ? 'text-white' : 'text-slate-900'
 } ${className}`}
 >
 {/* Background ambient glow */}
 <div
 style={{
 background: `radial-gradient(circle at 80% 20%, ${accent}25 0%, transparent 60%)`,
 }}
 className="absolute inset-0 pointer-events-none"
 />

 {/* Header: Brand & Slide Index */}
 <div className="relative z-10 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div
 style={{ backgroundColor: accent }}
 className="w-2.5 h-2.5 rounded-full"
 />
 <span className="text-xs font-bold uppercase tracking-wider opacity-80">
 {brandName}
 </span>
 </div>

 {slide.badge && (
 <span
 style={{ borderColor: `${accent}40`, backgroundColor: `${accent}15`, color: accent }}
 className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border flex items-center gap-1"
 >
 <Layers className="w-3 h-3" />
 {slide.badge}
 </span>
 )}
 </div>

 {/* Middle: Content */}
 <div className="relative z-10 space-y-4 my-auto">
 <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
 {slide.title}
 </h2>
 {slide.subtitle && (
 <p
 style={{ color: accent }}
 className="text-sm sm:text-base font-semibold"
 >
 {slide.subtitle}
 </p>
 )}
 {slide.body && (
 <p className="text-xs sm:text-sm leading-relaxed opacity-80 max-w-lg">
 {slide.body}
 </p>
 )}
 {slide.imageUrl && (
 <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg max-h-48 mt-2">
 <img
 src={slide.imageUrl}
 alt="Slide visual"
 className="w-full h-full object-cover"
 />
 </div>
 )}
 </div>

 {/* Footer: Handle & CTA */}
 <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10">
 <span className="text-[11px] font-medium opacity-60">
 {brandHandle}
 </span>
 {slide.ctaText ? (
 <div
 style={{ backgroundColor: accent }}
 className="px-4 py-2 rounded-lg text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg"
 >
 {slide.ctaText}
 <ArrowRight className="w-3.5 h-3.5" />
 </div>
 ) : (
 <span className="text-[10px] font-mono opacity-50">
 Página {slide.index}
 </span>
 )}
 </div>
 </div>
 );
}
