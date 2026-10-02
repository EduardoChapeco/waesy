import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface CountdownTimerProps {
 content?: {
 title?: string;
 target_date?: string;
 expired_message?: string;
 };
 title?: string;
 target_date?: string;
 targetDate?: string;
 expired_message?: string;
 expiredMessage?: string;
 design_tokens?: {
 backgroundColor?: string;
 textColor?: string;
 boxColor?: string;
 boxTextColor?: string;
 borderRadius?: string;
 };
 isEditing?: boolean;
}

export function CountdownTimer(props: CountdownTimerProps) {
 const content = props.content || {};

 const title = props.title || content.title || "Oportunidade por Tempo Limitado";
 const targetDateRaw =
 props.target_date ||
 props.targetDate ||
 content.target_date ||
 new Date(Date.now() + 86400000).toISOString();
 const expiredMessage =
 props.expired_message ||
 props.expiredMessage ||
 content.expired_message ||
 "Oferta Expirada";

 const designTokens = props.design_tokens || {};
 const customBg = designTokens.backgroundColor;
 const customText = designTokens.textColor;
 const customBoxColor = designTokens.boxColor;
 const customBoxTextColor = designTokens.boxTextColor;
 const customRadius = designTokens.borderRadius || "rounded-lg";

 const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(
 () => {
 if (!targetDateRaw) return null;
 const target = new Date(targetDateRaw).getTime();
 const now = new Date().getTime();
 const difference = target - now;
 if (difference <= 0) return { d: 0, h: 0, m: 0, s: 0 };
 return {
 d: Math.floor(difference / (1000 * 60 * 60 * 24)),
 h: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
 m: Math.floor((difference % (1000 * 60)) / (1000 * 60)),
 s: Math.floor((difference % (1000 * 60)) / 1000),
 };
 },
 );

 useEffect(() => {
 if (!targetDateRaw) return;
 const target = new Date(targetDateRaw).getTime();

 const interval = setInterval(() => {
 const now = new Date().getTime();
 const difference = target - now;

 if (difference <= 0) {
 clearInterval(interval);
 setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
 } else {
 setTimeLeft({
 d: Math.floor(difference / (1000 * 60 * 60 * 24)),
 h: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
 m: Math.floor((difference % (1000 * 60)) / (1000 * 60)),
 s: Math.floor((difference % (1000 * 60)) / 1000),
 });
 }
 }, 1000);

 return () => clearInterval(interval);
 }, [targetDateRaw]);

 if (!timeLeft) return null;

 const isExpired = timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0;

 // Detecção defensiva de contraste: se o fundo for branco/claro ou indefinido, usar texto escuro
 const isLightBg =
 customBg &&
 (customBg.toLowerCase() === "#ffffff" ||
 customBg.toLowerCase() === "#fff" ||
 customBg.toLowerCase().startsWith("#f"));

 const defaultTextColor = isLightBg ? "#09090b" : "#ffffff";
 const defaultBoxColor = isLightBg ? "#09090b" : "rgba(255, 255, 255, 0.12)";
 const defaultBoxTextColor = isLightBg ? "#ffffff" : "#ffffff";

 return (
 <div
 suppressHydrationWarning
 className="w-full py-8 px-4 flex flex-col items-center justify-center text-center transition-colors rounded-lg"
 style={{
 backgroundColor: customBg || "transparent",
 color: customText || defaultTextColor,
 }}
 >
 {title && (
 <h3
 className="text-base sm:text-lg font-black uppercase tracking-widest mb-4 opacity-95"
 style={{ color: customText || defaultTextColor }}
 >
 {title}
 </h3>
 )}

 {isExpired ? (
 <div className="text-2xl font-black py-2">{expiredMessage}</div>
 ) : (
 <div className="flex items-center gap-3 sm:gap-4">
 <TimeBox
 value={timeLeft.d}
 label="Dias"
 boxColor={customBoxColor || defaultBoxColor}
 boxTextColor={customBoxTextColor || defaultBoxTextColor}
 radiusClass={customRadius}
 textColor={customText || defaultTextColor}
 />
 <span
 className="text-xl sm:text-2xl font-bold opacity-40 -mt-4"
 style={{ color: customText || defaultTextColor }}
 >
 :
 </span>
 <TimeBox
 value={timeLeft.h}
 label="Horas"
 boxColor={customBoxColor || defaultBoxColor}
 boxTextColor={customBoxTextColor || defaultBoxTextColor}
 radiusClass={customRadius}
 textColor={customText || defaultTextColor}
 />
 <span
 className="text-xl sm:text-2xl font-bold opacity-40 -mt-4"
 style={{ color: customText || defaultTextColor }}
 >
 :
 </span>
 <TimeBox
 value={timeLeft.m}
 label="Minutos"
 boxColor={customBoxColor || defaultBoxColor}
 boxTextColor={customBoxTextColor || defaultBoxTextColor}
 radiusClass={customRadius}
 textColor={customText || defaultTextColor}
 />
 <span
 className="text-xl sm:text-2xl font-bold opacity-40 -mt-4"
 style={{ color: customText || defaultTextColor }}
 >
 :
 </span>
 <TimeBox
 value={timeLeft.s}
 label="Segundos"
 boxColor={customBoxColor || defaultBoxColor}
 boxTextColor={customBoxTextColor || defaultBoxTextColor}
 radiusClass={customRadius}
 textColor={customText || defaultTextColor}
 />
 </div>
 )}
 </div>
 );
}

function TimeBox({
 value,
 label,
 boxColor,
 boxTextColor,
 radiusClass,
 textColor,
}: {
 value: number;
 label: string;
 boxColor: string;
 boxTextColor: string;
 radiusClass: string;
 textColor: string;
}) {
 return (
 <div className="flex flex-col items-center">
 <div
 className={cn(
 "w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-3xl font-mono font-black shadow-sm transition-all",
 radiusClass
 )}
 style={{
 backgroundColor: boxColor,
 color: boxTextColor,
 }}
 >
 {value.toString().padStart(2, "0")}
 </div>
 <span
 className="text-[10px] sm:text-xs mt-2 uppercase font-bold tracking-wider opacity-80"
 style={{ color: textColor }}
 >
 {label}
 </span>
 </div>
 );
}

export default CountdownTimer;
