import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface HeatmapSlot {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  hour: number; // 8 a 19
  count: number;
}

export interface AgendaHeatmapProps {
  slots?: HeatmapSlot[];
  appointments?: any[];
  onSlotClick?: (dateStr: string) => void;
}

const DAYS = [
  { label: "Seg", key: 1 },
  { label: "Ter", key: 2 },
  { label: "Qua", key: 3 },
  { label: "Qui", key: 4 },
  { label: "Sex", key: 5 },
  { label: "Sáb", key: 6 },
  { label: "Dom", key: 0 },
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function AgendaHeatmap({ slots = [], appointments, onSlotClick }: AgendaHeatmapProps) {
  // Converte appointments em slots agregados caso slots não venha preenchido
  const resolvedSlots = useMemo(() => {
    if (slots && slots.length > 0) return slots;
    if (!appointments || appointments.length === 0) return [];

    const map = new Map<string, number>();
    appointments.forEach((apt) => {
      const rawDate = apt.scheduled_at || apt.starts_at || apt.date || apt.created_at;
      if (!rawDate) return;
      try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const dayOfWeek = d.getDay();
        const hour = d.getHours();
        const key = `${dayOfWeek}-${hour}`;
        map.set(key, (map.get(key) || 0) + 1);
      } catch {
        // Ignora datas com parse inválido
      }
    });

    const result: HeatmapSlot[] = [];
    map.forEach((count, key) => {
      const [dayOfWeekStr, hourStr] = key.split("-");
      result.push({
        dayOfWeek: Number(dayOfWeekStr),
        hour: Number(hourStr),
        count,
      });
    });
    return result;
  }, [slots, appointments]);

  const maxCount = useMemo(() => {
    let max = 1;
    resolvedSlots.forEach((s) => {
      if (s.count > max) max = s.count;
    });
    return max;
  }, [resolvedSlots]);

  const slotMap = useMemo(() => {
    const map = new Map<string, number>();
    resolvedSlots.forEach((s) => {
      map.set(`${s.dayOfWeek}-${s.hour}`, s.count);
    });
    return map;
  }, [resolvedSlots]);

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted/20 text-muted-foreground border-border/40 hover:border-primary/40";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "bg-primary/10 text-primary border-primary/20 hover:border-primary";
    if (ratio < 0.5) return "bg-primary/25 text-primary border-primary/30 font-semibold hover:border-primary";
    if (ratio < 0.75) return "bg-primary/50 text-primary-foreground border-primary/50 font-bold hover:border-primary";
    return "bg-primary text-primary-foreground border-primary font-bold shadow-sm hover:ring-2 hover:ring-primary";
  };

  const handleCellClick = (dayOfWeek: number, hour: number) => {
    if (!onSlotClick) return;
    // Calcula a data da semana corrente para o dayOfWeek clicado
    const today = new Date();
    const currentDay = today.getDay();
    const diff = dayOfWeek - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    targetDate.setHours(hour, 0, 0, 0);
    onSlotClick(targetDate.toISOString());
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Mapa de Calor da Agenda Semanal</h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Menos ocupado</span>
          <div className="flex gap-1 items-center">
            <span className="size-2.5 rounded-sm bg-muted/30 border border-border" />
            <span className="size-2.5 rounded-sm bg-primary/25" />
            <span className="size-2.5 rounded-sm bg-primary/60" />
            <span className="size-2.5 rounded-sm bg-primary" />
          </div>
          <span>Mais ocupado</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[480px]">
          {/* Header Dias */}
          <div className="grid grid-cols-8 gap-1.5 mb-1.5 text-center text-xs font-semibold text-muted-foreground">
            <div className="text-left pl-2">Hora</div>
            {DAYS.map((d) => (
              <div key={d.key}>{d.label}</div>
            ))}
          </div>

          {/* Linhas de Horário */}
          <div className="space-y-1.5">
            {HOURS.map((h) => (
              <div key={h} className="grid grid-cols-8 gap-1.5 items-center">
                <div className="text-xs font-medium text-muted-foreground pl-2">{h}:00</div>
                {DAYS.map((d) => {
                  const count = slotMap.get(`${d.key}-${h}`) || 0;
                  return (
                    <TooltipProvider key={`${d.key}-${h}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleCellClick(d.key, h)}
                            className={`h-11 min-h-11 w-full rounded-lg border flex items-center justify-center text-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getIntensityClass(
                              count,
                            )}`}
                          >
                            {count > 0 ? count : "-"}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">
                            {d.label} às {h}:00 — {count} {count === 1 ? "agendamento" : "agendamentos"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
