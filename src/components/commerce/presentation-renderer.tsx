import * as React from "react";
import { formatMoney } from "@/lib/money";
import { Surface } from "@/components/ui/surface";

export type PresetID = "polaroid" | "lambe" | "ticket";
export type AspectRatio = "1:1" | "9:16";

export interface EntityData {
 title: string;
 description?: string | null;
 price_cents: number;
 image_url?: string | null;
 category?: string;
}

export interface PresentationRendererProps {
 entity: EntityData;
 preset: PresetID;
 aspectRatio: AspectRatio;
 colorScheme: "default" | "primary" | "yellow" | "charcoal";
}

export function PresentationRenderer({
 entity,
 preset,
 aspectRatio,
 colorScheme,
}: PresentationRendererProps) {
 const containerClasses =
 aspectRatio === "9:16"
 ? "aspect-[9/16] w-full max-w-[360px]"
 : "aspect-square w-full max-w-md";

 // Base colors mapping
 const colors = {
 default: "bg-background text-foreground",
 primary: "bg-primary text-primary-foreground",
 yellow: "bg-secondary text-foreground",
 charcoal: "bg-charcoal text-primary-foreground",
 };

 const bgClass = colors[colorScheme];

 if (preset === "polaroid") {
 return (
 <div
 className={`${containerClasses} p-8 flex items-center justify-center bg-muted/20 overflow-hidden relative`}
 >
 <Surface
 variant="default"
 elevation="sm"
 className={`w-full max-w-[85%] flex flex-col gap-4 p-4 pb-12 rotate-2 ${bgClass}`}
 >
 <div className="aspect-square w-full bg-muted overflow-hidden">
 {entity.image_url ? (
 <img
 src={entity.image_url}
 alt={entity.title}
 className="w-full h-full object-cover grayscale-[20%] contrast-125"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center font-display opacity-30 text-4xl">
 NO IMG
 </div>
 )}
 </div>
 <div className="text-center font-sans">
 <h3 className="font-bold text-lg leading-tight uppercase tracking-wider">
 {entity.title}
 </h3>
 <p className="font-display font-black text-2xl mt-1">
 {formatMoney(entity.price_cents)}
 </p>
 </div>
 </Surface>
 </div>
 );
 }

 if (preset === "lambe") {
 return (
 <div
 className={`${containerClasses} p-6 flex items-center justify-center bg-muted/20 overflow-hidden relative`}
 >
 <Surface
 variant="lambe"
 elevation="none"
 className={`w-full h-full flex flex-col justify-between p-6 border-8 border-border ${bgClass}`}
 >
 <div className="text-center mt-4">
 {entity.category && (
 <span className="font-mono text-xs uppercase tracking-widest border-y border-current py-1 px-4 mb-4 inline-block">
 {entity.category}
 </span>
 )}
 <h2 className="font-display font-black text-4xl uppercase leading-[0.9] tracking-tighter mt-4 break-words">
 {entity.title}
 </h2>
 </div>

 {entity.image_url && (
 <div className="flex-1 my-6 min-h-0 border border-current overflow-hidden relative mix-blend-luminosity opacity-90">
 <img
 src={entity.image_url}
 alt={entity.title}
 className="w-full h-full object-cover"
 />
 </div>
 )}

 <div className="text-center border-t-8 border-current pt-4">
 <p className="font-mono text-sm uppercase tracking-widest mb-1">Apenas</p>
 <p className="font-display font-black text-6xl tracking-tighter leading-none">
 {formatMoney(entity.price_cents)}
 </p>
 </div>
 </Surface>
 </div>
 );
 }

 // Default: Ticket
 return (
 <div
 className={`${containerClasses} p-8 flex items-center justify-center bg-muted/20 overflow-hidden relative`}
 >
 <Surface
 variant="ticket"
 padding="lg"
 elevation="none"
 className={`w-full max-w-[90%] flex flex-col ${bgClass}`}
 >
 <div className="text-center mb-6">
 <p className="font-mono text-xs uppercase tracking-widest opacity-70 mb-2">WAESY TICKET</p>
 <h2 className="font-black text-2xl uppercase font-display leading-tight">
 {entity.title}
 </h2>
 </div>
 <div className="border-y border-dashed border-current py-6 my-4 flex-1 flex flex-col justify-center text-center">
 {entity.description ? (
 <p className="font-mono text-sm leading-relaxed opacity-80">
 {entity.description.substring(0, 100)}...
 </p>
 ) : (
 <div className="h-16 w-full bg-current opacity-10 repeating-linear-gradient" />
 )}
 </div>
 <div className="text-center pt-2 flex justify-between items-end">
 <span className="font-mono text-xs uppercase tracking-widest">Valor</span>
 <span className="font-display font-black text-3xl">
 {formatMoney(entity.price_cents)}
 </span>
 </div>
 </Surface>
 </div>
 );
}
