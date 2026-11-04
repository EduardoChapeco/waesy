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
 "Oferta por Tempo Limitado";
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
  const accentColor = designTokens.accentColor;

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

  const rootStyle: React.CSSProperties = {};
  if (customBg) rootStyle.backgroundColor = customBg;
  if (customText) rootStyle.color = customText;

  const accentStyle: React.CSSProperties = {};
  if (accentColor) accentStyle.color = accentColor;

  return (
    <div
      className="relative w-full overflow-hidden py-12 md:py-20 bg-background text-foreground"
      style={Object.keys(rootStyle).length > 0 ? rootStyle : undefined}
    >
      {/* Background Image com Overlay */}
      {bgImageUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={bgImageUrl}
            alt={title}
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-background/80" />
        </div>
      )}

      {/* Gradiente sutil com a cor de destaque */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={
          accentColor
            ? { background: `radial-gradient(ellipse at top, ${accentColor} 0%, transparent 70%)` }
            : undefined
        }
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Lado Esquerdo: Mensagem e Oferta */}
          <div className="space-y-6 lg:col-span-7">
            {badge && (
              <div
                className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1 text-xs font-bold text-warning-strong backdrop-blur-md"
                style={
                  accentColor
                    ? {
                        borderColor: `${accentColor}55`,
                        backgroundColor: `${accentColor}20`,
                        color: accentColor,
                      }
                    : undefined
                }
              >
                <Flame className="size-3.5 animate-pulse motion-reduce:animate-none text-warning-strong" style={accentStyle} />
                <span>{badge}</span>
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                {title}{" "}
                {discountPercentage && (
                  <span
                    className="underline decoration-2 text-warning-strong decoration-warning/60"
                    style={accentColor ? { color: accentColor, textDecorationColor: `${accentColor}80` } : undefined}
                  >
                    {discountPercentage}
                  </span>
                )}
              </h1>
              {subtitle && (
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Cupom 1-Toque */}
            {(couponCode || props.isEditing) && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/90 max-w-md backdrop-blur-sm"
                style={accentColor ? { borderColor: `${accentColor}40` } : undefined}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-2xs uppercase font-bold text-warning-strong" style={accentStyle}>
                    Cupom de Desconto
                  </p>
                  <p className="font-mono text-sm font-bold text-foreground tracking-widest truncate">
                    {couponCode || "SEM CUPOM DEFINIDO"}
                  </p>
                </div>
                {couponCode && (
                  <Button
                    type="button"
                    onClick={handleCopyCoupon}
                    size="sm"
                    className={cn(
                      "h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold gap-2 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                      copied
                        ? "bg-success text-success-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    style={!copied && accentColor ? { backgroundColor: accentColor } : undefined}
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
              className="rounded-lg border border-border bg-card/90 p-6 sm:p-8 backdrop-blur-xl text-center space-y-6"
              style={accentColor ? { borderColor: `${accentColor}40` } : undefined}
            >
              <div className="space-y-1">
                <div
                  className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-warning-strong"
                  style={accentStyle}
                >
                  <Clock className="size-4" />
                  <span>A Oferta Encerra Em:</span>
                </div>
              </div>

              {/* Blocos de Contagem */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: timeLeft.days, label: "Dias" },
                  { value: timeLeft.hours, label: "Horas" },
                  { value: timeLeft.minutes, label: "Min" },
                  { value: timeLeft.seconds, label: "Seg" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted border border-border/60 flex flex-col items-center"
                  >
                    <span
                      className="text-2xl sm:text-3xl font-mono font-black text-foreground"
                      style={accentStyle}
                    >
                      {String(item.value).padStart(2, "0")}
                    </span>
                    <span className="text-2xs font-semibold text-muted-foreground uppercase mt-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className="w-full h-11 min-h-11 rounded-lg text-xs sm:text-sm font-bold gap-2 cursor-pointer transition-transform hover:scale-102 focus-visible:ring-2 focus-visible:ring-ring"
                style={accentColor ? { backgroundColor: accentColor } : undefined}
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
