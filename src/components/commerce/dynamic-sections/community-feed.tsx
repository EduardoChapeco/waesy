import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Surface } from "@/components/ui/surface";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import { formatDate } from "@/lib/datetime";

export function CommunityFeed({ content, resolvedClassifieds, isEditing }: any) {
 const items = resolvedClassifieds || [];

 if (items.length === 0) {
 if (isEditing) {
 return (
 <div className="p-12 text-center border-0/50 bg-card/50">
 <Newspaper className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
 <h3 className="text-lg font-medium">Zine Comunitário</h3>
 <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
 Selecione a fonte "Classificados da Comunidade" no inspetor.
 </p>
 </div>
 );
 }
 return null;
 }

 const layout = content?.layout || "masonry";

 const categoryColors: Record<string, string> = {
 job: "bg-primary text-primary dark:bg-primary/30 dark:text-primary",
 sale: "bg-success text-success dark:bg-success/30 dark:text-success",
 trade: "bg-accent text-accent dark:bg-accent/30 dark:text-accent",
 service: "bg-warning text-warning dark:bg-warning/30 dark:text-warning",
 };

 const categoryLabels: Record<string, string> = {
 job: "Vaga",
 sale: "Venda",
 trade: "Troca",
 service: "Serviço",
 };

 return (
 <div className="w-full space-y-8">
 {content?.title && (
 <div className="flex flex-col items-center text-center">
 <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mix-blend-difference">
 {content.title}
 </h2>
 </div>
 )}

 <div
 className={cn(
 "columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6",
 layout === "grid" &&
 "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 space-y-0 columns-none",
 )}
 >
 {items.map((item: any, i: number) => {
 // Slight random rotation for that messy Zine/Lambe-lambe feel
 const rotation = i % 2 === 0 ? "rotate-1" : "";

 return (
 <Surface
 key={item.id}
 variant="default"
 elevation="sm"
 padding="md"
 className={cn(
 "break-inside-avoid relative transition-transform duration-300 hover:z-10 hover:scale-[1.02]",
 layout === "masonry" ? rotation : "",
 )}
 >
 <div className="flex items-start justify-between mb-4">
 <Badge
 className={cn(
 "font-bold text-xs shadow-none",
 categoryColors[item.category] || "bg-secondary text-secondary-foreground",
 )}
 >
 {categoryLabels[item.category] || item.category}
 </Badge>
 {item.price_cents > 0 && (
 <span className="font-black text-lg bg-primary text-primary-foreground px-2 py-1 rounded-lg transform rotate-3">
 {formatMoney(item.price_cents)}
 </span>
 )}
 </div>

 <h3 className="text-xl font-black leading-tight mb-3 uppercase tracking-tight">
 {item.title}
 </h3>

 <p className="text-sm text-foreground/80 leading-relaxed mb-6 whitespace-pre-wrap font-medium">
 {item.content}
 </p>

 <div className="flex items-center gap-3 pt-4 border-t border-black/10 dark:border-white/10 mt-auto">
 <Avatar className="h-8 w-8 border border-foreground">
 <AvatarImage src={item.avatar_url || ""} />
 <AvatarFallback className="font-bold bg-muted text-foreground">
 {item.author?.substring(0, 2).toUpperCase()}
 </AvatarFallback>
 </Avatar>
 <div className="flex flex-col">
 <span className="text-xs font-bold">{item.author}</span>
 <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
 {formatDate(item.created_at)}
 </span>
 </div>
 </div>
 </Surface>
 );
 })}
 </div>
 </div>
 );
}
