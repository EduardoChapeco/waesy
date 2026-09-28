import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Clock, Globe, Users, Lock, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface StatusPreset {
 emoji: string;
 label: string;
}

export const STATUS_PRESETS: StatusPreset[] = [
 { emoji: "🍕", label: "Almoçando" },
 { emoji: "☕", label: "Café" },
 { emoji: "💼", label: "Trabalhando" },
 { emoji: "🏖️", label: "Viajando" },
 { emoji: "⚡", label: "Livre" },
 { emoji: "🚫", label: "Ocupado" },
 { emoji: "🎮", label: "Jogando" },
 { emoji: "📚", label: "Estudando" },
 { emoji: "🎧", label: "Ouvindo música" },
 { emoji: "🏃", label: "Treinando" },
];

export function MomentsStatusPicker({
 open,
 onOpenChange,
 currentStatus,
 onSave,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 currentStatus?: { emoji: string; text?: string; audience?: string } | null;
 onSave?: (status: { emoji: string; text: string; durationHours: number; audience: string }) => void;
}) {
 const [selectedEmoji, setSelectedEmoji] = useState(currentStatus?.emoji || "⚡");
 const [customText, setCustomText] = useState(currentStatus?.text || "");
 const [durationHours, setDurationHours] = useState(8);
 const [audience, setAudience] = useState<"public" | "close_friends" | "private">(
 (currentStatus?.audience as any) || "public"
 );

 const handleSelectPreset = (preset: StatusPreset) => {
 setSelectedEmoji(preset.emoji);
 if (!customText) setCustomText(preset.label);
 };

 const handleSave = () => {
 if (onSave) {
 onSave({
 emoji: selectedEmoji,
 text: customText || "Disponível",
 durationHours,
 audience,
 });
 }
 toast.success("Status de Momento atualizado!");
 onOpenChange(false);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5 space-y-6">
 <DialogHeader className="text-left space-y-1">
 <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
 <Layers className="size-5 text-primary" />
 <span>Definir Momento e Status</span>
 </DialogTitle>
 <p className="text-xs text-muted-foreground">
 Compartilhe o que você está fazendo no mapa e no seu perfil comunitário.
 </p>
 </DialogHeader>

 {/* ── Prévia do Status / Emoji ── */}
 <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/40">
 <div className="size-14 rounded-2xl bg-background flex items-center justify-center text-3xl shadow-xs border border-border/60">
 {selectedEmoji}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-foreground truncate">
 {customText || "O que está acontecendo?"}
 </p>
 <p className="text-xs text-muted-foreground">
 Expira em {durationHours}h • {audience === "public" ? "Público" : audience === "close_friends" ? "Amigos Próximos" : "Privado"}
 </p>
 </div>
 </div>

 {/* ── Seletor de Emojis / Presets Populares ── */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Escolha um Humor ou Atividade
 </Label>
 <div className="grid grid-cols-5 gap-2">
 {STATUS_PRESETS.map((preset) => (
 <button
 key={preset.emoji}
 type="button"
 onClick={() => handleSelectPreset(preset)}
 className={cn(
 "h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-lg cursor-pointer border",
 selectedEmoji === preset.emoji
 ? "border-primary bg-primary/10 scale-105 shadow-xs"
 : "border-border/40 bg-card hover:bg-muted/40"
 )}
 >
 <span>{preset.emoji}</span>
 </button>
 ))}
 </div>
 </div>

 {/* ── Mensagem Customizada ── */}
 <div className="space-y-1.5">
 <Label htmlFor="statusText" className="text-xs font-semibold">
 Nota de Status (Opcional)
 </Label>
 <Input
 id="statusText"
 value={customText}
 onChange={(e) => setCustomText(e.target.value)}
 placeholder="Ex: No escritório até às 18h..."
 className="rounded-xl h-10 text-xs"
 />
 </div>

 {/* ── Duração do Status ── */}
 <div className="space-y-2">
 <Label className="text-xs font-semibold flex items-center gap-1.5">
 <Clock className="size-3.5 text-muted-foreground" />
 <span>Duração do Status</span>
 </Label>
 <div className="grid grid-cols-3 gap-2">
 {[2, 8, 24].map((hours) => (
 <Button
 key={hours}
 type="button"
 size="sm"
 variant={durationHours === hours ? "default" : "outline"}
 className="rounded-xl text-xs font-bold h-9"
 onClick={() => setDurationHours(hours)}
 >
 {hours} Horas
 </Button>
 ))}
 </div>
 </div>

 {/* ── Quem Pode Ver (Audiência) ── */}
 <div className="space-y-2">
 <Label className="text-xs font-semibold">Quem pode ver seu momento?</Label>
 <div className="grid grid-cols-3 gap-2">
 <button
 type="button"
 onClick={() => setAudience("public")}
 className={cn(
 "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
 audience === "public" ? "border-primary bg-primary/10 text-primary font-bold" : "border-border/40 text-muted-foreground"
 )}
 >
 <Globe className="size-4 mx-auto mb-1" />
 <span className="text-[11px]">Público</span>
 </button>

 <button
 type="button"
 onClick={() => setAudience("close_friends")}
 className={cn(
 "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
 audience === "close_friends" ? "border-primary bg-primary/10 text-primary font-bold" : "border-border/40 text-muted-foreground"
 )}
 >
 <Users className="size-4 mx-auto mb-1" />
 <span className="text-[11px]">Amigos</span>
 </button>

 <button
 type="button"
 onClick={() => setAudience("private")}
 className={cn(
 "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
 audience === "private" ? "border-primary bg-primary/10 text-primary font-bold" : "border-border/40 text-muted-foreground"
 )}
 >
 <Lock className="size-4 mx-auto mb-1" />
 <span className="text-[11px]">Invisível</span>
 </button>
 </div>
 </div>

 {/* ── Botão Salvar ── */}
 <div className="pt-2">
 <Button
 onClick={handleSave}
 className="w-full h-11 rounded-2xl font-bold text-sm bg-primary text-primary-foreground shadow-xs cursor-pointer"
 >
 Atualizar Momento
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
