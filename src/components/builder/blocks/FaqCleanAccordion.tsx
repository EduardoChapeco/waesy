import React, { useState } from "react";
import { FaqBlockData, OmniBlockStyling } from "../types";
import { ChevronDown, HelpCircle } from "lucide-react";

export interface FaqCleanAccordionProps {
  id: string;
  data: FaqBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

export const FaqCleanAccordion: React.FC<FaqCleanAccordionProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const paddingYClasses = {
    none: "py-0",
    sm: "py-8",
    md: "py-16",
    lg: "py-24",
    xl: "py-32",
  }[styling?.paddingY || "md"];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-lg",
    "2xl": "rounded-lg",
    full: "rounded-lg",
  }[styling?.borderRadius || "xl"];

  const customStyle: React.CSSProperties = {
    backgroundColor: styling?.backgroundColor || undefined,
    color: styling?.textColor || undefined,
  };

  const items = data.items ?? [];

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id={id}
      style={customStyle}
      className={`relative w-full ${paddingYClasses} border-b border-border/40 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            <HelpCircle className="size-3.5" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
            {data.title || "Perguntas Frequentes"}
          </h2>
          {data.subtitle && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Acordeão */}
        {items.length === 0 ? (
          <p role="note" className="mx-auto max-w-xl rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma pergunta foi configurada. Adicione respostas verificadas antes de publicar esta seção.
          </p>
        ) : <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.id}
                className={`border border-border/70 ${radiusClass} overflow-hidden bg-card transition-colors ${
                  isOpen ? "border-foreground/30 shadow-xs" : "hover:border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 select-none focus:outline-hidden"
                >
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    {item.question}
                  </span>
                  <div
                    className={`size-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-foreground/10 text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-0 text-sm sm:text-base text-muted-foreground leading-relaxed border-t border-border/30 mt-1">
                    <p className="pt-3">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </div>
    </section>
  );
};
