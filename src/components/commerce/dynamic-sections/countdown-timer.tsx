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

 const containerStyle: React.CSSProperties = {};
  if (customBg) containerStyle.backgroundColor = customBg;
  if (customText) containerStyle.color = customText;

  const titleStyle: React.CSSProperties = {};
  if (customText) titleStyle.color = customText;

  const separatorStyle: React.CSSProperties = {};
  if (customText) separatorStyle.color = customText;

  return (
    <div
      suppressHydrationWarning
      className="w-full py-8 px-4 flex flex-col items-center justify-center text-center transition-colors rounded-lg bg-card text-card-foreground border border-border"
      style={Object.keys(containerStyle).length > 0 ? containerStyle : undefined}
    >
      {title && (
        <h3
          className="text-base sm:text-lg font-black uppercase tracking-widest mb-4 opacity-95 text-foreground"
          style={Object.keys(titleStyle).length > 0 ? titleStyle : undefined}
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
            boxColor={customBoxColor}
            boxTextColor={customBoxTextColor}
            radiusClass={customRadius}
            textColor={customText}
          />
          <span
            className="text-xl sm:text-2xl font-bold opacity-40 -mt-4 text-muted-foreground"
            style={Object.keys(separatorStyle).length > 0 ? separatorStyle : undefined}
          >
            :
          </span>
          <TimeBox
            value={timeLeft.h}
            label="Horas"
            boxColor={customBoxColor}
            boxTextColor={customBoxTextColor}
            radiusClass={customRadius}
            textColor={customText}
          />
          <span
            className="text-xl sm:text-2xl font-bold opacity-40 -mt-4 text-muted-foreground"
            style={Object.keys(separatorStyle).length > 0 ? separatorStyle : undefined}
          >
            :
          </span>
          <TimeBox
            value={timeLeft.m}
            label="Minutos"
            boxColor={customBoxColor}
            boxTextColor={customBoxTextColor}
            radiusClass={customRadius}
            textColor={customText}
          />
          <span
            className="text-xl sm:text-2xl font-bold opacity-40 -mt-4 text-muted-foreground"
            style={Object.keys(separatorStyle).length > 0 ? separatorStyle : undefined}
          >
            :
          </span>
          <TimeBox
            value={timeLeft.s}
            label="Segundos"
            boxColor={customBoxColor}
            boxTextColor={customBoxTextColor}
            radiusClass={customRadius}
            textColor={customText}
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
  boxColor?: string;
  boxTextColor?: string;
  radiusClass: string;
  textColor?: string;
}) {
  const boxStyle: React.CSSProperties = {};
  if (boxColor) boxStyle.backgroundColor = boxColor;
  if (boxTextColor) boxStyle.color = boxTextColor;

  const labelStyle: React.CSSProperties = {};
  if (textColor) labelStyle.color = textColor;

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-3xl font-mono font-black transition-colors duration-200 bg-muted text-foreground border border-border/60",
          radiusClass
        )}
        style={Object.keys(boxStyle).length > 0 ? boxStyle : undefined}
      >
        {value.toString().padStart(2, "0")}
      </div>
      <span
        className="text-2xs sm:text-xs mt-2 uppercase font-bold tracking-wider opacity-80 text-muted-foreground"
        style={Object.keys(labelStyle).length > 0 ? labelStyle : undefined}
      >
        {label}
      </span>
    </div>
  );
}

export default CountdownTimer;
