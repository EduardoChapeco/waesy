import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface DayHours {
 day: string;
 open: boolean;
 openTime: string;
 closeTime: string;
}

interface HolidayException {
 id: string;
 label: string;
 date: string;
 open: boolean;
 openTime: string;
 closeTime: string;
}

interface StoreHoursData {
 is_open: boolean;
 status_text: string;
 hours: DayHours[];
 holiday_exceptions: HolidayException[];
}

interface StoreHoursProps {
 // Flat content fields (spread by ExperienceRenderer from node.content)
 title?: string;
 show_status_badge?: boolean;
 design_tokens?: {
 backgroundColor?: string;
 textColor?: string;
 className?: string;
 };
 // Canonical: storeData injected by ExperienceRenderer
 storeData?: StoreHoursData;
 // Legacy compat
 transient_data?: {
 store_hours?: StoreHoursData;
 };
}

export function StoreHours({
 title,
 show_status_badge,
 design_tokens,
 storeData,
 transient_data,
}: StoreHoursProps) {
 const storeHours = storeData ?? transient_data?.store_hours;
 const resolvedTitle = title ?? "Horários de Funcionamento";
 const showBadge = show_status_badge !== false;

 if (!storeHours) {
 return (
 <div className="w-full py-10 px-4 text-center text-muted-foreground text-sm">
 <Clock className="mx-auto mb-2 h-8 w-8 opacity-30" />
 Horários não configurados
 </div>
 );
 }

 const dayMap: Record<string, string> = {
 "Segunda-feira": "Seg",
 "Terça-feira": "Ter",
 "Quarta-feira": "Qua",
 "Quinta-feira": "Qui",
 "Sexta-feira": "Sex",
 Sábado: "Sáb",
 Domingo: "Dom",
 };

 return (
 <div
 className={cn("w-full py-10 overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 <div className="mx-auto max-w-xl px-4 @md:px-6">
 <div className="flex items-center justify-between mb-6 gap-4">
 <div className="flex items-center gap-2">
 <Clock className="h-5 w-5 text-primary" />
 <h2 className="text-xl font-semibold">{resolvedTitle}</h2>
 </div>
 {showBadge && (
 <span
 className={cn(
 "shrink-0 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
 storeHours.is_open
 ? "bg-success/15 text-success"
 : "bg-destructive/15 text-destructive",
 )}
 >
 <span
 className={cn(
 "size-2 rounded-full",
 storeHours.is_open ? "bg-success" : "bg-destructive",
 )}
 />
 {storeHours.status_text}
 </span>
 )}
 </div>

 <div className="divide-y divide-border rounded-lg overflow-hidden">
 {storeHours.hours.map((day) => (
 <div
 key={day.day}
 className={cn(
 "flex items-center justify-between px-4 py-3 text-sm",
 !day.open && "opacity-50",
 )}
 >
 <span className="font-medium w-10 shrink-0 text-muted-foreground">
 {dayMap[day.day] ?? day.day.slice(0, 3)}
 </span>
 <span className="flex-1 font-medium">{day.day}</span>
 <span
 className={cn("font-mono", day.open ? "text-foreground" : "text-muted-foreground")}
 >
 {day.open ? `${day.openTime} – ${day.closeTime}` : "Fechado"}
 </span>
 </div>
 ))}
 </div>

 {storeHours.holiday_exceptions && storeHours.holiday_exceptions.length > 0 && (
 <div className="mt-4">
 <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
 Exceções e Feriados
 </p>
 <div className="space-y-2">
 {storeHours.holiday_exceptions.map((ex) => (
 <div
 key={ex.id}
 className="flex items-center justify-between text-sm px-4 py-2 bg-muted/50"
 >
 <span className="font-medium">{ex.label}</span>
 <span className="text-muted-foreground font-mono text-xs">
 {ex.open ? `${ex.openTime} – ${ex.closeTime}` : "Fechado"}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
