import React, { useState } from "react";
import { Link2, ExternalLink, Store, Tag, Compass, Briefcase, Plane, Calendar, Newspaper, ShoppingBag, Flame, Car, MapPin, Utensils, ChevronDown, Ticket, MessageSquare, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface DestinationPreset {
 label: string;
 url: string;
 category: "Vitrine & Comércio" | "Conteúdo & Cidade" | "Serviços & Negócios";
 icon: any;
 badge?: string;
}

export const SYSTEM_DESTINATIONS: DestinationPreset[] = [
 { label: "Mercado e Hortifrúti", url: "/mercado", category: "Vitrine & Comércio", icon: Store, badge: "Essencial" },
 { label: "Gastronomia e Delivery", url: "/gastronomia", category: "Vitrine & Comércio", icon: Utensils, badge: "Comida" },
 { label: "Ofertas Relâmpago", url: "/ofertas", category: "Vitrine & Comércio", icon: Flame, badge: "Descontos" },
 { label: "Busca / Catálogo Geral", url: "/buscar", category: "Vitrine & Comércio", icon: ShoppingBag },
 
 { label: "Feed Social", url: "/feed", category: "Conteúdo & Cidade", icon: MessageSquare, badge: "Comunidade" },
 { label: "Notícias Locais", url: "/noticias", category: "Conteúdo & Cidade", icon: Newspaper, badge: "Jornalismo" },
 { label: "Eventos e Shows", url: "/eventos", category: "Conteúdo & Cidade", icon: Ticket, badge: "Ingressos" },
 { label: "Agenda da Cidade", url: "/agenda", category: "Conteúdo & Cidade", icon: Calendar, badge: "Datas" },
 { label: "Turismo e Passeios", url: "/turismo", category: "Conteúdo & Cidade", icon: Plane, badge: "Lazer" },
 { label: "Mapa da Cidade", url: "/mapa", category: "Conteúdo & Cidade", icon: MapPin },
 { label: "Mobilidade Urbana", url: "/mobilidade", category: "Conteúdo & Cidade", icon: Car },

 { label: "Classificados", url: "/classificados", category: "Serviços & Negócios", icon: Tag },
 { label: "Places (Lista Telefônica)", url: "/diretorio", category: "Serviços & Negócios", icon: Compass },
 { label: "Empregos", url: "/empregos", category: "Serviços & Negócios", icon: Briefcase, badge: "Vagas" },
 { label: "Afiliados", url: "/afiliados", category: "Serviços & Negócios", icon: Target, badge: "Recompensas" },
];

export interface DestinationPickerProps {
 value: string;
 onChange: (url: string) => void;
 targetType?: "product" | "category" | "hotpage" | "store" | "external_url";
 onTargetTypeChange?: (type: any) => void;
 className?: string;
 label?: string;
 helperText?: string;
}

export function DestinationPicker({
 value,
 onChange,
 targetType,
 onTargetTypeChange,
 className,
 label = "Destino do Link / Botão",
 helperText = "Selecione uma página pronta do sistema ou digite um link personalizado.",
}: DestinationPickerProps) {
 const [customMode, setCustomMode] = useState<boolean>(
 !SYSTEM_DESTINATIONS.some((d) => d.url === value) && Boolean(value)
 );

 const currentPreset = SYSTEM_DESTINATIONS.find((d) => d.url === value);

 const handleSelectPreset = (selectedUrl: string) => {
 if (selectedUrl === "custom") {
 setCustomMode(true);
 return;
 }
 setCustomMode(false);
 onChange(selectedUrl);
 if (onTargetTypeChange) {
 onTargetTypeChange("hotpage");
 }
 };

 return (
 <div className={cn("space-y-2", className)}>
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Link2 className="size-3.5 text-primary" />
 <span>{label}</span>
 </Label>
 <button
 type="button"
 onClick={() => setCustomMode(!customMode)}
 className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
 >
 {customMode ? "Escolher Página Pronta" : "Digitar Link Customizado"}
 </button>
 </div>

 {!customMode ? (
 <Select
 value={currentPreset ? currentPreset.url : "custom"}
 onValueChange={handleSelectPreset}
 >
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue placeholder="Selecione a página de destino..." />
 </SelectTrigger>
 <SelectContent className="max-h-72">
 <SelectGroup>
 <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground">
 Vitrines e Comércio
 </SelectLabel>
 {SYSTEM_DESTINATIONS.filter((d) => d.category === "Vitrine & Comércio").map((dest) => {
 const Icon = dest.icon;
 return (
 <SelectItem key={dest.url} value={dest.url} className="text-xs py-2">
 <div className="flex items-center justify-between w-full gap-2">
 <div className="flex items-center gap-2">
 <Icon className="size-3.5 text-muted-foreground" />
 <span className="font-semibold">{dest.label}</span>
 </div>
 <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
 {dest.url}
 </Badge>
 </div>
 </SelectItem>
 );
 })}
 </SelectGroup>

 <SelectGroup>
 <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground">
 Conteúdo e Cidade
 </SelectLabel>
 {SYSTEM_DESTINATIONS.filter((d) => d.category === "Conteúdo & Cidade").map((dest) => {
 const Icon = dest.icon;
 return (
 <SelectItem key={dest.url} value={dest.url} className="text-xs py-2">
 <div className="flex items-center justify-between w-full gap-2">
 <div className="flex items-center gap-2">
 <Icon className="size-3.5 text-muted-foreground" />
 <span className="font-semibold">{dest.label}</span>
 </div>
 <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
 {dest.url}
 </Badge>
 </div>
 </SelectItem>
 );
 })}
 </SelectGroup>

 <SelectGroup>
 <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground">
 Serviços e Negócios
 </SelectLabel>
 {SYSTEM_DESTINATIONS.filter((d) => d.category === "Serviços & Negócios").map((dest) => {
 const Icon = dest.icon;
 return (
 <SelectItem key={dest.url} value={dest.url} className="text-xs py-2">
 <div className="flex items-center justify-between w-full gap-2">
 <div className="flex items-center gap-2">
 <Icon className="size-3.5 text-muted-foreground" />
 <span className="font-semibold">{dest.label}</span>
 </div>
 <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
 {dest.url}
 </Badge>
 </div>
 </SelectItem>
 );
 })}
 </SelectGroup>

 <SelectItem value="custom" className="text-xs py-2 font-bold text-primary">
 <div className="flex items-center gap-2">
 <ExternalLink className="size-3.5" />
 <span>Digitar link personalizado / externo...</span>
 </div>
 </SelectItem>
 </SelectContent>
 </Select>
 ) : (
 <div className="space-y-1.5">
 <Input
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder="Ex: /produto/slug-item ou https://wa.me/..."
 className="h-11 rounded-xl text-xs font-mono bg-background"
 />
 </div>
 )}

 {helperText && (
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 {helperText}
 </p>
 )}
 </div>
 );
}
