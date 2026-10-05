import * as React from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
import { formatDate } from "@/lib/datetime";

export function EventRail({ content, resolvedEvents, isEditing }: any) {
 const events = resolvedEvents || [];

 if (events.length === 0) {
 if (isEditing) {
 return (
 <div className="p-12 text-center border-0/50 bg-card/50">
 <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
 <h3 className="text-lg font-medium">Próximos Eventos</h3>
 <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
 Selecione uma fonte de dados no inspetor (Próximos Eventos) para visualizar.
 </p>
 </div>
 );
 }
 return null;
 }

 const layout = content?.layout || "carousel";

 return (
 <div className="w-full space-y-6">
 {(content?.title || content?.subtitle) && (
 <div className="flex flex-col items-center text-center space-y-2 mb-8">
 {content.title && (
 <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
 {content.title}
 </h2>
 )}
 {content.subtitle && <p className="text-muted-foreground max-w-xl">{content.subtitle}</p>}
 </div>
 )}

 <div
 className={cn(
 "grid gap-6",
 layout === "grid"
 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
 : "grid-cols-1 md:grid-cols-3 flex-nowrap overflow-x-auto no-scrollbar pb-4 snap-x",
 )}
 >
 {events.map((evt: any) => (
 <Surface
 key={evt.id}
 variant="ticket"
 elevation="md"
 padding="none"
 className={cn(
 "group flex flex-col h-full overflow-hidden transition-all duration-300 hover:scale-[1.02]",
 layout === "carousel" && "min-w-[300px] snap-center shrink-0",
 )}
 >
 {/* Event Cover Image */}
 <div className="relative aspect-[4/3] bg-muted overflow-hidden">
 {evt.cover_image ? (
 <img
 src={evt.cover_image}
 alt={evt.title}
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-muted/50">
 <Calendar className="h-10 w-10 text-muted-foreground/30" />
 </div>
 )}
 {/* Date Badge overlay */}
 <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm px-3 py-2 rounded-lg text-center leading-tight">
 <span className="block text-xs font-bold text-muted-foreground uppercase">
 {formatDate(evt.event_date)}
 </span>
 <span className="block text-xl font-black">
 {new Date(evt.event_date).getDate()}
 </span>
 </div>
 </div>

 {/* Event Details */}
 <div className="p-5 flex flex-col flex-grow">
 <h3 className="font-bold text-xl leading-tight mb-2 line-clamp-2">{evt.title}</h3>

 <div className="space-y-2 mb-4">
 <div className="flex items-center text-sm text-muted-foreground">
 <Calendar className="h-3.5 w-3.5 mr-2 shrink-0" />
 <span className="truncate">{formatDate(evt.event_date)}</span>
 </div>
 {evt.location && (
 <div className="flex items-center text-sm text-muted-foreground">
 <MapPin className="h-3.5 w-3.5 mr-2 shrink-0" />
 <span className="truncate">{evt.location}</span>
 </div>
 )}
 </div>

 <div className="mt-auto pt-4 border-t border-dashed flex items-center justify-between">
 <div>
 <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
 A partir de
 </p>
 <p className="font-black text-lg">
 {evt.price_cents !== null && evt.price_cents !== undefined
 ? formatMoney(evt.price_cents)
 : "Gratuito"}
 </p>
 </div>
 <Button asChild variant="default" size="sm" className="font-bold h-11 min-h-11 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
 <Link to="/evento/$id" params={{ id: evt.id }}>
 Ingressos
 </Link>
 </Button>
 </div>
 </div>
 </Surface>
 ))}
 </div>
 </div>
 );
}
