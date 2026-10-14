import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  type?: "meeting" | "task" | "travel" | "deadline";
}

export interface NativeCalendarWidgetProps {
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate?: (date: string) => void;
  events?: CalendarEvent[];
  className?: string;
}

export function NativeCalendarWidget({
  selectedDate,
  onSelectDate,
  events = [],
  className,
}: NativeCalendarWidgetProps) {
  const [currentMonthDate, setCurrentMonthDate] = React.useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Calculate calendar days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Padding days from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, d);
    days.push({
      dayNumber: d,
      dateStr: prevDate.toISOString().slice(0, 10),
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
    });
  }

  // Padding to complete 6 weeks if needed (or 5 weeks)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      dayNumber: i,
      dateStr: nextDate.toISOString().slice(0, 10),
      isCurrentMonth: false,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/70 bg-card p-4 select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Mês anterior"
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Próximo mês"
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Week Day Labels */}
      <div className="grid grid-cols-7 gap-1 py-2 text-center text-2xs font-medium text-muted-foreground">
        {weekDayNames.map((d) => (
          <div key={d} className="h-6 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((item, idx) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;
          const dayEvents = events.filter((e) => e.date === item.dateStr);

          return (
            <button
              key={`${item.dateStr}-${idx}`}
              type="button"
              onClick={() => item.isCurrentMonth && onSelectDate?.(item.dateStr)}
              disabled={!item.isCurrentMonth}
              className={cn(
                "relative h-10 w-full rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !item.isCurrentMonth && "opacity-25 pointer-events-none",
                item.isCurrentMonth && "hover:bg-muted/70",
                isToday && !isSelected && "border border-primary/50 font-semibold text-primary",
                isSelected && "bg-primary text-primary-foreground font-semibold shadow-xs"
              )}
            >
              <span>{item.dayNumber}</span>
              {dayEvents.length > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
