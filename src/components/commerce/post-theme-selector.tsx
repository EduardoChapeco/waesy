/**
 * Seletor de Temas de Apresentação (PostThemeSelector — derivado do Waesy)
 */

import { PRESENTATION_THEMES, type PresentationTheme } from "@/lib/presentation-presets";
import { cn } from "@/lib/utils";
import { Layers, Check } from 'lucide-react';

interface PostThemeSelectorProps {
 selectedThemeId: string;
 onSelectTheme: (themeId: string) => void;
}

export function PostThemeSelector({ selectedThemeId, onSelectTheme }: PostThemeSelectorProps) {
 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Layers className="size-3.5 text-primary" />
 Estilo Visual / Tema do Post
 </label>
 <span className="text-[11px] text-muted-foreground">
 {PRESENTATION_THEMES.length} estilos disponíveis
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {PRESENTATION_THEMES.map((theme) => {
 const isSelected = selectedThemeId === theme.id;
 return (
 <button
 key={theme.id}
 type="button"
 onClick={() => onSelectTheme(theme.id)}
 className={cn(
 "p-3 rounded-lg border text-left flex flex-col justify-between transition-all duration-150 relative overflow-hidden",
 isSelected
 ? "border-primary ring-1 ring-primary/40 bg-card "
 : "border-border/70 bg-card hover:bg-muted/40 hover:border-border",
 )}
 >
 <div className="flex items-center justify-between w-full mb-2">
 <div className="flex items-center gap-2">
 <div
 className="size-3 rounded-full border border-black/10"
 style={{ backgroundColor: theme.colors.primary }}
 />
 <div
 className="size-3 rounded-full border border-black/10"
 style={{ backgroundColor: theme.colors.accent }}
 />
 </div>
 {isSelected && (
 <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
 <Check className="size-2.5 stroke-[3]" />
 </div>
 )}
 </div>

 <div>
 <p className="text-xs font-bold text-foreground leading-tight truncate">
 {theme.name}
 </p>
 <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
 {theme.description}
 </p>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 );
}
