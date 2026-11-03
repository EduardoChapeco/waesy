import React from "react";
import { BentoBlockData, OmniBlockStyling } from "../types";
import { getSectionStyle } from "../utils";
import { ShieldCheck, Zap, Globe, Layers, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BentoAsymmetricGridProps {
  id?: string;
  data: BentoBlockData;
  styling?: OmniBlockStyling;
  isEditing?: boolean;
  className?: string;
}

const BENTO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Globe,
  ShieldCheck,
  Layers,
  ArrowUpRight,
};

export const BentoAsymmetricGrid: React.FC<BentoAsymmetricGridProps> = ({
  id,
  data,
  styling,
  isEditing = false,
  className = "",
}) => {
  const sectionStyle = getSectionStyle(styling);
  const cells = Array.isArray(data?.cells) ? data.cells : [];

  if (cells.length === 0) {
    if (!isEditing) return null;
    return (
      <section
        id={id}
        style={sectionStyle.style}
        className={`w-full bg-muted/20 border-b border-border/40 py-8 ${sectionStyle.className} ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma célula configurada nesta Grade Bento. Adicione cards na aba Conteúdo do inspetor.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      style={sectionStyle.style}
      className={`w-full bg-muted/20 border-b border-border/40 ${sectionStyle.className} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(data.sectionTitle || data.sectionSubtitle) && (
          <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
            {data.sectionTitle && (
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4 [text-wrap:balance]">
                {data.sectionTitle}
              </h2>
            )}
            {data.sectionSubtitle && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {data.sectionSubtitle}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 grid-flow-dense">
          {cells.map((cell, idx) => {
            const span = cell.colSpan === 3 ? "md:col-span-3" : cell.colSpan === 2 ? "md:col-span-2" : "md:col-span-1";
            const CellIcon = (cell.iconName && BENTO_ICONS[cell.iconName]) || Layers;

            return (
              <div
                key={cell.id || `bento-cell-${idx}`}
                className={`${span} bg-card border border-border/80 rounded-lg p-6 sm:p-8 flex flex-col justify-between gap-6 hover:border-primary/40 transition-colors`}
              >
                <div className="space-y-3">
                  {cell.tag ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                      <CellIcon className="size-3.5" />
                      <span>{cell.tag}</span>
                    </div>
                  ) : cell.iconName ? (
                    <div className="size-11 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-center">
                      <CellIcon className="size-5 text-foreground" />
                    </div>
                  ) : null}

                  {cell.statNumber && (
                    <div>
                      {cell.statLabel && (
                        <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground block mb-1">
                          {cell.statLabel}
                        </span>
                      )}
                      <div className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
                        {cell.statNumber}
                      </div>
                    </div>
                  )}

                  {cell.title && (
                    <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {cell.title}
                    </h3>
                  )}

                  {cell.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {cell.description}
                    </p>
                  )}
                </div>

                {Array.isArray(cell.chips) && cell.chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {cell.chips.map((chip, cIdx) => (
                      <Badge key={`${cell.id}-chip-${cIdx}`} variant="outline" className="px-3 py-1 font-medium text-xs">
                        {chip}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
