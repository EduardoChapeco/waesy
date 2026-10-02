import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar, Flag } from "lucide-react";

interface TimelineHistoryProps {
 node_id: string;
 block_type: string;
 content?: {
 title?: string;
 subtitle?: string;
 events?: Array<{
 year: string;
 title: string;
 description: string;
 image_url?: string;
 }>;
 };
 design_tokens?: any;
}

export function TimelineHistory({ content, design_tokens }: TimelineHistoryProps) {
 const events = content?.events || [];

 return (
 <div
 className={cn("w-full py-16 @md:py-24 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-4xl px-4 @md:px-8">
 {(content?.title || content?.subtitle) && (
 <div className="mb-16 text-center">
 {content?.title && (
 <h2 className="text-3xl @md:text-5xl font-bold tracking-tight mb-4">
 {content.title}
 </h2>
 )}
 {content?.subtitle && (
 <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>
 )}
 </div>
 )}

 {events.length > 0 ? (
 <div className="relative">
 {/* Linha vertical central */}
 <div className="absolute left-4 @md:left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

 <div className="space-y-12 @md:space-y-24">
 {events.map((event, idx) => {
 const isEven = idx % 2 === 0;
 return (
 <div
 key={idx}
 className={cn(
 "relative flex flex-col @md:flex-row items-start @md:items-center gap-8 @md:gap-16",
 isEven ? "@md:flex-row-reverse" : "",
 )}
 >
 {/* Nó Central */}
 <div className="absolute left-4 @md:left-1/2 top-0 @md:top-1/2 w-8 h-8 -ml-4 @md:-ml-4 @md:-mt-4 rounded-full bg-background border border-primary z-10 flex items-center justify-center ">
 <div className="w-2 h-2 rounded-full bg-primary" />
 </div>

 {/* Espaço Vazio para o lado oposto (apenas desktop) */}
 <div className="hidden @md:block @md:w-1/2" />

 {/* Cartão do Evento */}
 <div className="w-full @md:w-1/2 pl-12 @md:pl-0">
 <div
 className={cn(
 "flex flex-col gap-3",
 isEven ? "@md:items-start @md:text-left" : "@md:items-end @md:text-right",
 )}
 >
 <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
 <Calendar className="mr-2 h-3.5 w-3.5" />
 {event.year}
 </span>

 <h3 className="text-2xl font-bold">{event.title}</h3>
 <p className="text-muted-foreground leading-relaxed">{event.description}</p>

 {event.image_url && (
 <div
 className={cn(
 "mt-4 w-full max-w-sm rounded-lg overflow-hidden border ",
 isEven ? "@md:mr-auto" : "@md:ml-auto",
 )}
 >
 <img
 src={event.image_url}
 alt={event.title}
 className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
 />
 </div>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Bandeira Final */}
 <div className="relative mt-12 @md:mt-24 flex justify-start @md:justify-center">
 <div className="w-12 h-12 rounded-full bg-muted z-10 flex items-center justify-center text-muted-foreground ml-2 @md:ml-0">
 <Flag className="h-5 w-5" />
 </div>
 </div>
 </div>
 ) : (
 <div className="p-8 border border-dashed text-center text-muted-foreground bg-muted/50">
 Adicione os marcos históricos pelo inspetor.
 </div>
 )}
 </div>
 </div>
 );
}
