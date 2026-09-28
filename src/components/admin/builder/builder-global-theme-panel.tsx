import * as React from "react";
import { Palette, Type, Square, Layers, Check, RotateCcw, Sun, Moon, Brush } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/admin/builder/ColorPicker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface GlobalThemeConfig {
 primaryColor: string;
 backgroundColor: string;
 textColor: string;
 headingFont: string;
 bodyFont: string;
 borderRadius: string; // 'sm' | 'md' | 'xl' | '2xl' | 'full'
 surfaceStyle: string; // 'clean' | 'flat' | 'zine'
}

export interface BuilderGlobalThemePanelProps {
 theme: GlobalThemeConfig;
 onChangeTheme: (patch: Partial<GlobalThemeConfig>) => void;
 onClose: () => void;
}

const PALETTE_PRESETS = [
 { name: "Black & White (Apple/Stripe)", primary: "#09090b", bg: "#ffffff", text: "#09090b" },
 { name: "Ocean Blue (Turismo & Praia)", primary: "#0284c7", bg: "#ffffff", text: "#0f172a" },
 { name: "Emerald Forest (Ecoturismo)", primary: "#059669", bg: "#ffffff", text: "#064e3b" },
 { name: "Sunset Gold (Gastronomia & Luxo)", primary: "#d97706", bg: "#ffffff", text: "#451a03" },
 { name: "Dark Modern (Cyber / Tech)", primary: "#38bdf8", bg: "#09090b", text: "#f8fafc" },
];

const FONT_PRESETS = [
 { id: "Inter, sans-serif", label: "Inter (Moderna e Neutra)" },
 { id: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans (Fintech/SaaS)" },
 { id: "Outfit, sans-serif", label: "Outfit (Geométrica e Elegante)" },
 { id: "'Playfair Display', serif", label: "Playfair Display (Editorial e Luxo)" },
 { id: "Montserrat, sans-serif", label: "Montserrat (Impacto e Títulos)" },
];

const RADIUS_OPTIONS = [
 { id: "sm", label: "Sutil (8px)" },
 { id: "xl", label: "Elegante (12px)" },
 { id: "2xl", label: "Moderno (16px)" },
 { id: "full", label: "Pill / Curvo" },
];

export function BuilderGlobalThemePanel({
 theme,
 onChangeTheme,
 onClose,
}: BuilderGlobalThemePanelProps) {
 return (
 <aside className="w-80 bg-card border-r border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs animate-in slide-in-from-left duration-200">
 {/* Header */}
 <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Palette className="size-4" />
 </div>
 <div>
 <h3 className="text-xs font-bold text-foreground">Tema e Estilo Global</h3>
 <p className="text-[10px] text-muted-foreground">Identidade visual de todo o site</p>
 </div>
 </div>

 <button
 type="button"
 onClick={() => {
 onChangeTheme({
 primaryColor: "#09090b",
 backgroundColor: "#ffffff",
 textColor: "#09090b",
 headingFont: "Inter, sans-serif",
 bodyFont: "Inter, sans-serif",
 borderRadius: "xl",
 surfaceStyle: "clean",
 });
 toast.info("Tema restaurado para o padrão limpo.");
 }}
 className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer"
 title="Restaurar padrão"
 >
 <RotateCcw className="size-3.5" />
 </button>
 </div>

 <ScrollArea className="flex-1 p-4 space-y-5 text-xs">
 {/* Presets Rápidos de Paleta */}
 <div className="space-y-2">
 <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
 <Layers className="size-3.5 text-amber-500" />
 Paletas Consagradas da Indústria
 </Label>

 <div className="space-y-1.5">
 {PALETTE_PRESETS.map((preset) => {
 const isSelected =
 theme.primaryColor === preset.primary && theme.backgroundColor === preset.bg;

 return (
 <div
 key={preset.name}
 onClick={() => {
 onChangeTheme({
 primaryColor: preset.primary,
 backgroundColor: preset.bg,
 textColor: preset.text,
 });
 toast.success(`Paleta "${preset.name}" aplicada!`);
 }}
 className={cn(
 "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
 isSelected
 ? "bg-primary/5 border-primary shadow-2xs font-bold"
 : "bg-card border-border/70 hover:border-border hover:bg-muted/30"
 )}
 >
 <span className="text-[11px] text-foreground truncate mr-2">
 {preset.name}
 </span>

 <div className="flex items-center gap-1 shrink-0">
 <span
 className="size-4 rounded-full border border-black/10 shadow-2xs"
 style={{ backgroundColor: preset.primary }}
 />
 <span
 className="size-4 rounded-full border border-black/10 shadow-2xs"
 style={{ backgroundColor: preset.bg }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <hr className="border-border/60 my-4" />

 {/* Customização de Cores */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground block">
 Cores Personalizadas
 </Label>

 <div className="space-y-1.5">
 <Label className="text-[11px] text-muted-foreground">Cor de Destaque Primária</Label>
 <ColorPicker
 value={theme.primaryColor}
 onChange={(c) => onChangeTheme({ primaryColor: c })}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] text-muted-foreground">Cor de Fundo da Vitrine</Label>
 <ColorPicker
 value={theme.backgroundColor}
 onChange={(c) => onChangeTheme({ backgroundColor: c })}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] text-muted-foreground">Cor dos Textos Principais</Label>
 <ColorPicker
 value={theme.textColor}
 onChange={(c) => onChangeTheme({ textColor: c })}
 />
 </div>
 </div>

 <hr className="border-border/60 my-4" />

 {/* Tipografia */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Type className="size-3.5 text-primary" />
 Tipografia e Fontes
 </Label>

 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Família de Títulos</Label>
 <select
 value={theme.headingFont}
 onChange={(e) => onChangeTheme({ headingFont: e.target.value })}
 className="w-full h-9 rounded-xl bg-background border border-border px-3 text-xs"
 >
 {FONT_PRESETS.map((f) => (
 <option key={f.id} value={f.id}>
 {f.label}
 </option>
 ))}
 </select>
 </div>
 </div>

 <hr className="border-border/60 my-4" />

 {/* Geometria e Bordas */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Square className="size-3.5 text-primary" />
 Cantos e Geometria
 </Label>

 <div className="grid grid-cols-2 gap-2">
 {RADIUS_OPTIONS.map((opt) => {
 const isSelected = theme.borderRadius === opt.id;
 return (
 <button
 key={opt.id}
 type="button"
 onClick={() => onChangeTheme({ borderRadius: opt.id })}
 className={cn(
 "py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
 isSelected
 ? "bg-primary text-primary-foreground font-bold shadow-2xs border-primary"
 : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
 )}
 >
 {opt.label}
 </button>
 );
 })}
 </div>
 </div>
 </ScrollArea>
 </aside>
 );
}
