import * as React from "react";
import { Check, Palette, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface BiolinkThemeConfig {
  themeKey: string;
  buttonStyle?: "rounded" | "pill" | "outline" | "glass";
  backgroundType?: "gradient" | "solid" | "pattern";
}

export interface BiolinkThemeDefinition {
  key: string;
  label: string;
  description: string;
  previewBg: string;
  cardStyle: string;
  buttonClass: string;
  badgeText?: string;
}

export const BIOLINK_THEMES: BiolinkThemeDefinition[] = [
  {
    key: "clean",
    label: "Clean Minimal",
    description: "Branco papel refinado com contraste suave e foco na legibilidade.",
    previewBg: "bg-background border-border",
    cardStyle: "bg-card border-border text-foreground",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    badgeText: "Recomendado",
  },
  {
    key: "dark",
    label: "Dark Minimal",
    description: "Preto profundo com estética moderna, minimalista e sofisticada.",
    previewBg: "bg-muted border-border",
    cardStyle: "bg-muted border-border text-foreground",
    buttonClass: "bg-foreground text-background hover:bg-foreground/90 font-semibold",
    badgeText: "Popular",
  },
  {
    key: "glass",
    label: "Indigo Glass",
    description: "Vidro fosco translúcido com gradiente noturno índigo e púrpura.",
    previewBg: "bg-primary/20 border-primary/30",
    cardStyle: "bg-card/40 backdrop-blur-md border-border text-foreground",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    key: "sunset",
    label: "Sunset Glow",
    description: "Vibração calorosa inspirada no pôr-do-sol, com energia e destaque.",
    previewBg: "bg-amber-500/20 border-rose-500/30",
    cardStyle: "bg-card/40 backdrop-blur-md border-border text-foreground",
    buttonClass: "bg-background text-foreground hover:bg-background/90 font-bold",
  },
  {
    key: "emerald",
    label: "Emerald Prestige",
    description: "Tons de esmeralda e floresta tropical para marcas orgânicas e premium.",
    previewBg: "bg-emerald-500/20 border-emerald-600/30",
    cardStyle: "bg-card/60 border-border text-foreground",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
  },
  {
    key: "cyber",
    label: "Cyber Violet",
    description: "Visual futurista com gradientes elétricos e alto impacto de conversão.",
    previewBg: "bg-purple-500/20 border-indigo-600/30",
    cardStyle: "bg-card/40 border-border text-foreground",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
  },
  {
    key: "zine",
    label: "Editorial Zine",
    description: "Estética brutalista editorial com bordas marcadas e sombra sólida.",
    previewBg: "bg-secondary border-border",
    cardStyle: "bg-card border-2 border-border text-foreground",
    buttonClass: "bg-foreground text-background hover:bg-foreground/90 border border-border font-bold",
  },
  {
    key: "tourism",
    label: "Boutique Sky",
    description: "Visual leve, arejado e elegante para agências, viagens e serviços.",
    previewBg: "bg-sky-500/20 border-blue-600/30",
    cardStyle: "bg-card/95 border-border text-foreground",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90 font-bold",
  },
];

const BUTTON_STYLES = [
  { id: "rounded", label: "Arredondado Suave", desc: "Bordas arredondadas clean", classSample: "rounded-lg" },
  { id: "pill", label: "Cápsula (Pill)", desc: "Totalmente arredondado", classSample: "rounded-full" },
  { id: "outline", label: "Minimal Outline", desc: "Borda fina com fundo transparente", classSample: "rounded-lg border border-border bg-transparent" },
  { id: "glass", label: "Vidro Translúcido", desc: "Efeito glass com desfoque de fundo", classSample: "rounded-lg bg-card/40 backdrop-blur-md border border-border" },
];

interface BiolinkThemesSelectorProps {
  value: BiolinkThemeConfig;
  onChange: (config: BiolinkThemeConfig) => void;
}

export function BiolinkThemesSelector({ value, onChange }: BiolinkThemesSelectorProps) {
  const currentKey = value?.themeKey || "clean";
  const currentButtonStyle = value?.buttonStyle || "rounded";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
        <div>
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <span>Tema Visual do Link da Bio</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Escolha a atmosfera visual aplicada automaticamente na página pública dos seus links.
          </p>
        </div>
        <Badge variant="outline" className="text-xs w-fit font-mono">
          Tema Atual: {BIOLINK_THEMES.find((t) => t.key === currentKey)?.label || currentKey}
        </Badge>
      </div>

      {/* Grid de Temas Visuais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {BIOLINK_THEMES.map((theme) => {
          const isSelected = currentKey === theme.key;

          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onChange({ ...value, themeKey: theme.key })}
              className={cn(
                "group relative rounded-xl border text-left p-4 transition-colors cursor-pointer overflow-hidden flex flex-col justify-between h-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-muted/40"
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
            >
              {/* Miniatura do Canvas */}
              <div
                className={cn(
                  "w-full h-20 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden border border-border/40 transition-transform group-hover:scale-105",
                  theme.previewBg
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="size-4 rounded-full bg-card/60 backdrop-blur-xs border border-border" />
                  {theme.badgeText && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-background/80 text-foreground backdrop-blur-xs">
                      {theme.badgeText}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-16 rounded bg-foreground/20" />
                  <div className="h-3 w-full rounded-sm bg-foreground/30 flex items-center px-1">
                    <div className="h-1 w-8 rounded bg-background/80" />
                  </div>
                </div>
              </div>

              {/* Informações do Tema */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">{theme.label}</span>
                  {isSelected && (
                    <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-3" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {theme.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Seletor de Formato de Botões */}
      <div className="pt-4 border-t border-border space-y-4">
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Layers className="size-3.5 text-muted-foreground" />
            <span>Formato dos Botões de Ação</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            Personalize a geometria e o acabamento dos botões exibidos aos visitantes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {BUTTON_STYLES.map((style) => {
            const isStyleSelected = currentButtonStyle === style.id;

            return (
              <button
                key={style.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    buttonStyle: style.id as BiolinkThemeConfig["buttonStyle"],
                  })
                }
                className={cn(
                  "p-3 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between min-h-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isStyleSelected
                    ? "border-primary bg-primary/5 font-semibold text-primary"
                    : "border-border hover:bg-muted/30 text-foreground"
                )}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold block">{style.label}</span>
                  <span className="text-xs text-muted-foreground block line-clamp-1">
                    {style.desc}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-center">
                  <div
                    className={cn(
                      "w-full h-8 text-xs font-bold flex items-center justify-center border transition-colors",
                      style.classSample,
                      isStyleSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    Exemplo
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
