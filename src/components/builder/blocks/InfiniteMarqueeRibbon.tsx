import React from "react";
import { InfiniteMarqueeBlockData, OmniBlockStyling } from "../types";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { isSafeBuilderHref } from "@/lib/builder/safe-href";

export interface InfiniteMarqueeRibbonProps {
  id: string;
  data: InfiniteMarqueeBlockData;
  styling?: OmniBlockStyling;
  className?: string;
  isEditing?: boolean;
}

export const InfiniteMarqueeRibbon: React.FC<InfiniteMarqueeRibbonProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const items = data.items || [];
  const direction = data.direction || "left";
  const speedSeconds = Math.max(5, Math.min(120, data.speedSeconds || 25));
  const pauseOnHover = data.pauseOnHover !== false;

  const paddingYClasses = {
    none: "py-0",
    sm: "py-3",
    md: "py-5",
    lg: "py-8",
    xl: "py-12",
  }[styling?.paddingY || "sm"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  if (items.length === 0) {
    return (
      <section
        id={id}
        style={customStyle}
        className={`w-full ${paddingYClasses} border-y border-border/40 bg-muted/10 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Nenhum item configurado no letreiro dinâmico. Adicione frases ou destaques no painel de blocos.
          </p>
        </div>
      </section>
    );
  }

  const animDirectionClass = direction === "right" ? "reverse" : "normal";

  return (
    <section
      id={id}
      style={customStyle}
      aria-label={data.title || "Destaques em letreiro contínuo"}
      className={`relative w-full overflow-hidden ${paddingYClasses} border-y border-border/40 bg-card/60 backdrop-blur-xs ${className}`}
    >
      {data.title && (
        <div className="max-w-7xl mx-auto px-4 mb-3 text-center sm:text-left">
          <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            {data.title}
          </span>
        </div>
      )}

      {/* Inline styles for the marquee keyframes without requiring external CSS config */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee-track {
              from { transform: translateX(0%); }
              to { transform: translateX(-50%); }
            }
          `,
        }}
      />

      <div
        className={`group flex w-max min-w-full select-none items-center ${
          pauseOnHover ? "hover:[&>div]:[animation-play-state:paused]" : ""
        }`}
      >
        <div
          className="flex shrink-0 items-center gap-6 pr-6 motion-reduce:animate-none"
          style={{
            animation: `marquee-track ${speedSeconds}s linear infinite ${animDirectionClass}`,
          }}
        >
          {/* Double array sequence to guarantee seamless wrap */}
          {[...items, ...items].map((item, idx) => {
            const hasLink = item.linkHref && isSafeBuilderHref(item.linkHref);
            const content = (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center gap-3 px-4 py-2 rounded-full border border-border/60 bg-background/80 text-foreground text-xs font-semibold shadow-2xs whitespace-nowrap transition-colors hover:border-foreground/30"
              >
                {item.badgeText && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-3xs font-bold uppercase tracking-wider">
                    {item.badgeText}
                  </span>
                )}
                <span>{item.text}</span>
                {hasLink ? (
                  <ArrowUpRight className="size-3 text-muted-foreground" />
                ) : (
                  <Sparkles className="size-3 text-muted-foreground/60" />
                )}
              </div>
            );

            if (hasLink) {
              return (
                <a
                  key={`${item.id}-${idx}`}
                  href={item.linkHref}
                  target={item.linkHref?.startsWith("http") ? "_blank" : undefined}
                  rel={item.linkHref?.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full min-h-11 items-center"
                >
                  {content}
                </a>
              );
            }

            return <React.Fragment key={`${item.id}-${idx}`}>{content}</React.Fragment>;
          })}
        </div>
      </div>
    </section>
  );
};
