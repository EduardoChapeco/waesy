import * as React from "react";
import { useState, useEffect } from "react";
import { Flame, Clock, Copy, Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface FlashSaleHeroProps {
 title?: string;
 subtitle?: string;
 badge?: string;
 discountBadge?: string;
 discountPercentage?: string;
 couponCode?: string;
 endDate?: string;
 targetDate?: string;
 targetLink?: string;
 buttonLink?: string;
 buttonText?: string;
 bgImageUrl?: string;
 imageUrl?: string;
 design_tokens?: {
 backgroundColor?: string;
 textColor?: string;
 accentColor?: string;
 borderRadius?: string;
 };
 isEditing?: boolean;
 content?: Record<string, any>;
}

export const FlashSaleHero: React.FC<FlashSaleHeroProps> = (props) => {
 const content = props.content || {};

 const title = props.title || content.title || "Queima de Estoque Relâmpago";
 const subtitle =
 props.subtitle ||
 content.subtitle ||
 "Descontos de até 50% OFF em itens selecionados por tempo limitado. Aproveite antes que acabe!";
 const badge =
 props.badge ||
 props.discountBadge ||
 content.badge ||
 content.discountBadge ||
 "🔥 Oferta por Tempo Limitado";
 const discountPercentage =
 props.discountPercentage ||
 props.discountBadge ||
 content.discountPercentage ||
 content.discountBadge ||
 "50% OFF";
 const couponCode =
 props.couponCode !== undefined
 ? props.couponCode
 : content.couponCode !== undefined
 ? content.couponCode
 : "RELAMPAGO50";
 const endDate =
 props.endDate ||
 props.targetDate ||
 content.endDate ||
 content.targetDate ||
 new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();
 const targetLink =
 props.targetLink ||
 props.buttonLink ||
 content.targetLink ||
 content.buttonLink ||
 "#produtos";
 const buttonText =
 props.buttonText ||
 content.buttonText ||
 "Garantir Ofertas com Desconto";
 const bgImageUrl =
 props.bgImageUrl ||
 props.imageUrl ||
 content.bgImageUrl ||
 content.imageUrl ||
 "";

 const designTokens = props.design_tokens || {};
 const customBg = designTokens.backgroundColor;
 const customText = designTokens.textColor;
 const accentColor = designTokens.accentColor || "#f59e0b"; // Padrão âmbar

 const [copied, setCopied] = useState(false);
 const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

 useEffect(() => {
 const calculateTime = () => {
 const target = new Date(endDate).getTime();
 const now = new Date().getTime();
 const diff = Math.max(0, target - now);

 setTimeLeft({
 days: Math.floor(diff / (1000 * 60 * 60 * 24)),
 hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
 minutes: Math.floor((diff / 1000 / 60) % 60),
 seconds: Math.floor((diff / 1000) % 60),
 });
 };

 calculateTime();
 const interval = setInterval(calculateTime, 1000);
 return () => clearInterval(interval);
 }, [endDate]);

 const handleCopyCoupon = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (!couponCode) return;
 navigator.clipboard.writeText(couponCode);
 setCopied(true);
 toast.success(`Cupom "${couponCode}" copiado com sucesso!`);
 setTimeout(() => setCopied(false), 2500);
 };

 return (
 <div
 className="relative w-full overflow-hidden py-12 md:py-20"
 style={{
 backgroundColor: customBg || "#09090b",
 color: customText || "#ffffff",
 }}
 >
 {/* Background Image com Overlay Escuro */}
 {bgImageUrl && (
 <div className="absolute inset-0 z-0 pointer-events-none">
 <img
 src={bgImageUrl}
 alt={title}
 className="h-full w-full object-cover opacity-25"
 />
 <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/60" />
 </div>
 )}

 {/* Gradiente sutil com a cor de destaque */}
 <div
 className="absolute inset-0 pointer-events-none opacity-20"
 style={{
 background: `radial-gradient(ellipse at top, ${accentColor} 0%, transparent 70%)`,
 }}
 />

 <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
 {/* Lado Esquerdo: Mensagem e Oferta */}
 <div className="space-y-6 lg:col-span-7">
 {badge && (
 <div
 className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-bold backdrop-blur-md"
 style={{
 borderColor: `${accentColor}55`,
 backgroundColor: `${accentColor}20`,
 color: accentColor,
 }}
 >
 <Flame className="size-3.5 animate-pulse" style={{ color: accentColor }} />
 <span>{badge}</span>
 </div>
 )}

 <div className="space-y-2">
 <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
 {title}{" "}
 {discountPercentage && (
 <span
 className="underline decoration-2"
 style={{
 color: accentColor,
 textDecorationColor: `${accentColor}80`,
 }}
 >
 {discountPercentage}
 </span>
 )}
 </h1>
 {subtitle && (
 <p className="text-sm sm:text-base text-zinc-300 max-w-lg leading-relaxed">
 {subtitle}
 </p>
 )}
 </div>

 {/* Cupom 1-Toque (exibido se preenchido ou se em modo de edição) */}
 {(couponCode || props.isEditing) && (
 <div
 className="flex items-center gap-3 p-3 rounded-lg border max-w-md backdrop-blur-sm"
 style={{
 backgroundColor: "rgba(24, 24, 27, 0.85)",
 borderColor: `${accentColor}40`,
 }}
 >
 <div className="space-y-1 min-w-0 flex-1">
 <p className="text-[10px] uppercase font-bold" style={{ color: accentColor }}>
 Cupom de Desconto
 </p>
 <p className="font-mono text-sm font-bold text-white tracking-widest truncate">
 {couponCode || "SEM CUPOM DEFINIDO"}
 </p>
 </div>
 {couponCode && (
 <Button
 type="button"
 onClick={handleCopyCoupon}
 size="sm"
 className={cn(
 "h-8 px-3 rounded-lg text-xs font-bold gap-2 transition-all cursor-pointer",
 copied
 ? "bg-emerald-500 text-white"
 : "text-zinc-950 font-bold hover:brightness-110"
 )}
 style={
 !copied
 ? {
 backgroundColor: accentColor,
 }
 : undefined
 }
 >
 {copied ? (
 <>
 <Check className="size-3.5" />
 <span>Copiado</span>
 </>
 ) : (
 <>
 <Copy className="size-3.5" />
 <span>Copiar Cupom</span>
 </>
 )}
 </Button>
 )}
 </div>
 )}
 </div>

 {/* Lado Direito: Temporizador Regressivo & CTA */}
 <div className="lg:col-span-5">
 <div
 className="rounded-lg border p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6"
 style={{
 backgroundColor: "rgba(24, 24, 27, 0.88)",
 borderColor: `${accentColor}40`,
 }}
 >
 <div className="space-y-1">
 <div
 className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
 style={{ color: accentColor }}
 >
 <Clock className="size-4" />
 <span>A Oferta Encerra Em:</span>
 </div>
 </div>

 {/* Blocos de Contagem */}
 <div className="grid grid-cols-4 gap-2">
 {[
 { value: timeLeft.days, label: "Dias" },
 { value: timeLeft.hours, label: "Horas" },
 { value: timeLeft.minutes, label: "Min" },
 { value: timeLeft.seconds, label: "Seg" },
 ].map((item, idx) => (
 <div
 key={idx}
 className="p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex flex-col items-center"
 >
 <span
 className="text-2xl sm:text-3xl font-mono font-black"
 style={{ color: accentColor }}
 >
 {String(item.value).padStart(2, "0")}
 </span>
 <span className="text-[10px] font-semibold text-zinc-400 uppercase mt-1">
 {item.label}
 </span>
 </div>
 ))}
 </div>

 <Button
 asChild
 className="w-full h-11 rounded-lg text-xs sm:text-sm font-bold gap-2 text-zinc-950 shadow-lg cursor-pointer transition-transform hover:scale-102"
 style={{
 background: `linear-gradient(135deg, ${accentColor}, #f97316)`,
 }}
 >
 <a
 href={props.isEditing ? "#" : targetLink}
 onClick={(e) => {
 if (props.isEditing) {
 e.preventDefault();
 }
 }}
 >
 <Zap className="size-4 fill-current" />
 <span>{buttonText}</span>
 <ArrowRight className="size-4" />
 </a>
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default FlashSaleHero;
