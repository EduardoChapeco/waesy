import React, { useState } from "react";
import {
  Check,
  ArrowRight,
  Layers,
  Calendar,
  Scissors,
  Truck,
  Receipt,
  Database,
  BarChart3,
  Users,
  ShoppingCart,
  ShieldCheck,
  Smartphone,
  Laptop,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSafeBuilderHref } from "@/lib/builder/safe-href";
import { getSectionStyle } from "../utils";
import type { SoftwareFeatureShowcaseBlockData, OmniBlockStyling } from "@/types/omni-builder";

export interface SoftwareFeatureShowcaseProps {
  id?: string;
  data: SoftwareFeatureShowcaseBlockData;
  styling?: OmniBlockStyling;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Scissors,
  Truck,
  Receipt,
  Database,
  BarChart3,
  Users,
  ShoppingCart,
  ShieldCheck,
  Smartphone,
  Laptop,
  Flame,
  Sparkles: Layers,
};

export const SoftwareFeatureShowcase: React.FC<SoftwareFeatureShowcaseProps> = ({
  id,
  data,
  styling,
  className = "",
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(() => data.tabs[0]?.id || "");
  const sectionStyle = getSectionStyle(styling);

  const activeTab = data.tabs.find((t) => t.id === activeTabId) || data.tabs[0];

  if (!activeTab) return null;

  const ActiveIcon = (activeTab.tabIconName && ICON_MAP[activeTab.tabIconName]) || Layers;
  const ctaHref = activeTab.ctaHref ? getSafeBuilderHref(activeTab.ctaHref) ?? "#" : "#";

  return (
    <section
      id={id}
      style={sectionStyle.style}
      className={`w-full bg-background text-foreground border-b border-border/40 ${sectionStyle.className} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho Editorial da Seção */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
          {data.badgeText && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border/80 text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-4">
              <Layers className="size-3.5 text-primary" />
              <span>{data.badgeText}</span>
            </div>
          )}

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4 [text-wrap:balance]">
            {data.title}
          </h2>

          {data.subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Trilho de Abas Interativas (Padrão Apple / Linear / Belasis) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto scroll-area-carousel pb-4 mb-8 sm:mb-12 no-scrollbar">
          <div
            role="tablist"
            aria-label="Módulos e Recursos do Sistema"
            className="inline-flex items-center gap-2 p-2 rounded-2xl bg-muted/50 border border-border/60 shrink-0"
          >
            {data.tabs.map((tab) => {
              const TabIcon = (tab.tabIconName && ICON_MAP[tab.tabIconName]) || Laptop;
              const isActive = tab.id === activeTab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`h-11 min-h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <TabIcon className={`size-4 ${isActive ? "text-primary" : "opacity-70"}`} />
                  <span>{tab.tabLabel}</span>
                  {tab.badge && (
                    <span className="text-2xs uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel do Módulo Ativo */}
        <div
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          {/* Lado Esquerdo: Descrição, Benefícios e Ação */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
              <ActiveIcon className="size-4" />
              <span>{activeTab.tabLabel}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              {activeTab.title}
            </h3>

            <p className="text-base text-muted-foreground leading-relaxed mb-6">
              {activeTab.description}
            </p>

            {/* Checklist de Recursos e Benefícios */}
            {activeTab.benefits && activeTab.benefits.length > 0 && (
              <ul className="space-y-3 w-full mb-8">
                {activeTab.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                    <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1 border border-primary/20">
                      <Check className="size-3.5 stroke-2" />
                    </span>
                    <span className="leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Ação Primária do Módulo */}
            {activeTab.ctaLabel && (
              <div className="w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="h-11 min-h-11 px-6 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <a href={ctaHref} className="flex items-center gap-2">
                    <span>{activeTab.ctaLabel}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Lado Direito: Mockup Visual de Alta Fidelidade do Software */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              {/* Barra de Janela Estilo App Nativo Desktop */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-muted-foreground/30" />
                  <span className="size-3 rounded-full bg-muted-foreground/30" />
                  <span className="size-3 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="text-xs font-medium text-muted-foreground truncate max-w-50">
                  {activeTab.tabLabel} — Waesy Vertical OS
                </div>
                <div className="size-3" />
              </div>

              {/* Corpo do Mockup / Preview */}
              <div className="p-6 sm:p-8 bg-muted/10">
                {activeTab.previewImageUrl ? (
                  <img
                    src={activeTab.previewImageUrl}
                    alt={activeTab.previewImageAlt || activeTab.title}
                    className="w-full aspect-16/10 object-cover rounded-xl border border-border/60 shadow-xs"
                  />
                ) : (
                  <div className="w-full aspect-16/10 rounded-xl border border-border/60 bg-background/80 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <ActiveIcon className="size-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{activeTab.tabLabel}</div>
                          <div className="text-xs text-muted-foreground">Módulo Ativo e Sincronizado</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xs font-bold border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Operando 100%
                      </span>
                    </div>

                    {/* Simulação de Grade de Métricas do Módulo */}
                    <div className="grid grid-cols-2 gap-3 my-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-2xs text-muted-foreground uppercase font-semibold">Eficiência</div>
                        <div className="text-lg font-black text-foreground">
                          {activeTab.statNumber || "+42%"}
                        </div>
                        <div className="text-2xs text-muted-foreground mt-1">
                          {activeTab.statLabel || "No fluxo diário"}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-2xs text-muted-foreground uppercase font-semibold">Segurança</div>
                        <div className="text-lg font-black text-foreground">100% Zero-Trust</div>
                        <div className="text-2xs text-muted-foreground mt-1">Auditado e em nuvem</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-2xs text-muted-foreground pt-2 border-t border-border/40">
                      <span>Waesy Core Engine</span>
                      <span>Latência &lt; 20ms</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stat Flutuante Inferior */}
              {activeTab.statNumber && (
                <div className="px-6 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {activeTab.statLabel || "Resultado médio comprovado por clientes"}
                  </span>
                  <span className="text-sm font-black text-foreground">{activeTab.statNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
