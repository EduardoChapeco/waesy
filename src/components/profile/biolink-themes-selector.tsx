import * as React from "react";
import { Check, Zap, Palette, Layers, Eye } from "lucide-react";
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
  previewGradient: string;
  textColor: string;
  cardStyle: string;
  buttonClass: string;
  badgeText?: string;
}

export const BIOLINK_THEMES: BiolinkThemeDefinition[] = [
  {
    key: "clean",
    label: "Clean Minimal",
    description: "Branco papel refinado com contraste suave e foco na legibilidade.",
    previewGradient: "linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%)",
    textColor: "#18181b",
    cardStyle: "bg-white border-zinc-200 text-zinc-900 shadow-xs",
    buttonClass: "bg-zinc-900 text-white hover:bg-zinc-800",
    badgeText: "Recomendado",
  },
  {
    key: "dark",
    label: "Dark Minimal",
    description: "Preto profundo com estética moderna, minimalista e sofisticada.",
    previewGradient: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    textColor: "#ffffff",
    cardStyle: "bg-zinc-900 border-zinc-800 text-white shadow-xs",
    buttonClass: "bg-white text-zinc-900 hover:bg-zinc-100 font-semibold",
    badgeText: "Popular",
  },
  {
    key: "glass",
    label: "Indigo Glass",
    description: "Vidro fosco translúcido com gradiente noturno índigo e púrpura.",
    previewGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)",
    textColor: "#ffffff",
    cardStyle: "bg-white/10 backdrop-blur-md border-white/20 text-white",
    buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
  },
  {
    key: "sunset",
    label: "Sunset Glow",
    description: "Vibração calorosa inspirada no pôr-do-sol, com energia e destaque.",
    previewGradient: "linear-gradient(135deg, #f97316 0%, #e11d48 50%, #581c87 100%)",
    textColor: "#ffffff",
    cardStyle: "bg-white/15 backdrop-blur-md border-white/25 text-white",
    buttonClass: "bg-white text-rose-950 hover:bg-white/90 font-bold shadow-md",
  },
  {
    key: "emerald",
    label: "Emerald Prestige",
    description: "Tons de esmeralda e floresta tropical para marcas orgânicas e premium.",
    previewGradient: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)",
    textColor: "#ffffff",
    cardStyle: "bg-emerald-950/60 border-emerald-800/50 text-emerald-50",
    buttonClass: "bg-emerald-500 text-white hover:bg-emerald-600 font-semibold",
  },
  {
    key: "cyber",
    label: "Cyber Violet",
    description: "Visual futurista com gradientes elétricos e alto impacto de conversão.",
    previewGradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #09090b 100%)",
    textColor: "#ffffff",
    cardStyle: "bg-purple-950/40 border-purple-800/40 text-purple-100",
    buttonClass: "bg-purple-600 text-white hover:bg-purple-500 font-semibold shadow-lg shadow-purple-600/20",
  },
  {
    key: "zine",
    label: "Editorial Zine",
    description: "Estética brutalista editorial com bordas marcadas e sombra sólida.",
    previewGradient: "linear-gradient(135deg, #f4efe6 0%, #e7decb 100%)",
    textColor: "#000000",
    cardStyle: "bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
    buttonClass: "bg-black text-white hover:bg-zinc-800 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold",
  },
  {
    key: "tourism",
    label: "Boutique Sky",
    description: "Visual leve, arejado e elegante para agências, viagens e serviços.",
    previewGradient: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%)",
    textColor: "#0369a1",
    cardStyle: "bg-white/95 border-sky-200 text-slate-800 shadow-xs",
    buttonClass: "bg-sky-600 text-white hover:bg-sky-700 font-bold shadow-xs",
  },
];

const BUTTON_STYLES = [
  { id: "rounded", label: "Arredondado Suave", desc: "Bordas rounded-lg clean", classSample: "rounded-lg" },
  { id: "pill", label: "Cápsula (Pill)", desc: "Totalmente arredondado rounded-full", classSample: "rounded-full" },
  { id: "outline", label: "Minimal Outline", desc: "Borda fina com fundo transparente", classSample: "rounded-lg border border-current bg-transparent" },
  { id: "glass", label: "Vidro Translúcido", desc: "Efeito glass com desfoque de fundo", classSample: "rounded-lg bg-white/10 backdrop-blur-md border border-white/20" },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div>
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <span>Tema Visual do Link da Bio</span>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Escolha a atmosfera visual aplicada automaticamente na página pública dos seus links.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] w-fit font-mono">
          Tema Atual: {BIOLINK_THEMES.find((t) => t.key === currentKey)?.label || currentKey}
        </Badge>
      </div>

      {/* Grid de Temas Visuais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {BIOLINK_THEMES.map((theme) => {
          const isSelected = currentKey === theme.key;

          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onChange({ ...value, themeKey: theme.key })}
              className={cn(
                "group relative rounded-lg border text-left p-4 transition-all cursor-pointer overflow-hidden flex flex-col justify-between h-44 shadow-2xs",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-muted/40 shadow-xs"
                  : "border-border/60 hover:border-border hover:bg-muted/20"
              )}
            >
              {/* Miniatura do Canvas */}
              <div
                className="w-full h-20 rounded-lg p-3 flex flex-col justify-between relative overflow-hidden border border-black/10 transition-transform group-hover:scale-[1.02]"
                style={{ background: theme.previewGradient }}
              >
                <div className="flex items-center justify-between">
                  <div className="size-4 rounded-full bg-white/40 backdrop-blur-xs border border-white/30" />
                  {theme.badgeText && (
                    <span className="text-[8px] font-bold px-2 py-1 rounded-full bg-black/40 text-white backdrop-blur-xs">
                      {theme.badgeText}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-16 rounded bg-black/20" />
                  <div className="h-3 w-full rounded-sm bg-black/25 flex items-center px-1">
                    <div className="h-1 w-8 rounded-xs bg-white/80" />
                  </div>
                </div>
              </div>

              {/* Informações do Tema */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">{theme.label}</span>
                  {isSelected && (
                    <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                  {theme.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Seletor de Formato de Botões */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Layers className="size-3.5 text-muted-foreground" />
            <span>Formato dos Botões de Ação</span>
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Personalize a geometria e o acabamento dos botões exibidos aos visitantes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between",
                  isStyleSelected
                    ? "border-primary bg-primary/5 shadow-2xs font-semibold text-primary"
                    : "border-border/60 hover:bg-muted/30 text-foreground"
                )}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold block">{style.label}</span>
                  <span className="text-[10px] text-muted-foreground block line-clamp-1">
                    {style.desc}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-center">
                  <div
                    className={cn(
                      "w-full h-7 text-[10px] font-bold flex items-center justify-center border transition-all",
                      style.classSample,
                      isStyleSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/80"
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
