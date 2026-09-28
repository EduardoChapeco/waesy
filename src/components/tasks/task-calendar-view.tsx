import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon, CheckCircle2, Circle, Star, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkspaceTask } from "./task-types";

interface TaskCalendarViewProps {
 tasks: WorkspaceTask[];
 onSelectTask: (task: WorkspaceTask) => void;
 onAddTaskOnDate?: (dateStr: string) => void;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTH_NAMES = [
 "Janeiro",
 "Fevereiro",
 "Março",
 "Abril",
 "Maio",
 "Junho",
 "Julho",
 "Agosto",
 "Setembro",
 "Outubro",
 "Novembro",
 "Dezembro",
];

export function TaskCalendarView({
 tasks,
 onSelectTask,
 onAddTaskOnDate,
}: TaskCalendarViewProps) {
 const [currentDate, setCurrentDate] = useState(() => new Date());

 const currentYear = currentDate.getFullYear();
 const currentMonth = currentDate.getMonth();

 const handlePrevMonth = () => {
 setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
 };

 const handleNextMonth = () => {
 setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
 };

 const handleToday = () => {
 setCurrentDate(new Date());
 };

 // Construir matriz de dias do mês
 const calendarDays = useMemo(() => {
 const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
 const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
 const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

 const days: Array<{
 date: Date;
 dateStr: string;
 isCurrentMonth: boolean;
 isToday: boolean;
 }> = [];

 const todayStr = new Date().toISOString().split("T")[0];

 // Dias do mês anterior
 for (let i = firstDayIndex - 1; i >= 0; i--) {
 const d = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
 const str = d.toISOString().split("T")[0];
 days.push({
 date: d,
 dateStr: str,
 isCurrentMonth: false,
 isToday: str === todayStr,
 });
 }

 // Dias do mês atual
 for (let i = 1; i <= daysInMonth; i++) {
 const d = new Date(currentYear, currentMonth, i);
 const str = d.toISOString().split("T")[0];
 days.push({
 date: d,
 dateStr: str,
 isCurrentMonth: true,
 isToday: str === todayStr,
 });
 }

 // Dias do próximo mês para completar 35 ou 42 células
 const remainingCells = (7 - (days.length % 7)) % 7;
 for (let i = 1; i <= remainingCells; i++) {
 const d = new Date(currentYear, currentMonth + 1, i);
 const str = d.toISOString().split("T")[0];
 days.push({
 date: d,
 dateStr: str,
 isCurrentMonth: false,
 isToday: str === todayStr,
 });
 }

 return days;
 }, [currentYear, currentMonth]);

 // Indexar tarefas por data (due_date) e identificar recorrentes
 const tasksByDate = useMemo(() => {
 const map = new Map<string, WorkspaceTask[]>();

 for (const task of tasks) {
 if (task.due_date) {
 const dateKey = task.due_date.split("T")[0];
 const list = map.get(dateKey) || [];
 list.push(task);
 map.set(dateKey, list);
 }
 }

 return map;
 }, [tasks]);

 return (
 <div className="flex flex-col h-full bg-card rounded-2xl border border-border/70 overflow-hidden shadow-sm">
 {/* Barra de Controles do Calendário */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1.5">
 <CalendarIcon className="size-5 text-primary" />
 <h2 className="text-base sm:text-lg font-bold text-foreground">
 {MONTH_NAMES[currentMonth]} {currentYear}
 </h2>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={handleToday}
 className="h-8 px-3 text-xs rounded-lg cursor-pointer ml-2"
 >
 Hoje
 </Button>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={handlePrevMonth}
 className="size-8 p-0 rounded-lg cursor-pointer"
 title="Mês anterior"
 >
 <ChevronLeft className="size-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={handleNextMonth}
 className="size-8 p-0 rounded-lg cursor-pointer"
 title="Próximo mês"
 >
 <ChevronRight className="size-4" />
 </Button>
 </div>
 </div>

 {/* Cabeçalho dos Dias da Semana */}
 <div className="grid grid-cols-7 border-b border-border/60 bg-muted/10 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-2.5">
 {DAYS_OF_WEEK.map((d, i) => (
 <div key={d} className={cn(i === 0 || i === 6 ? "text-muted-foreground/70" : "")}>
 {d}
 </div>
 ))}
 </div>

 {/* Grade de Células de Dias */}
 <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-border/50 overflow-y-auto no-scrollbar min-h-[550px]">
 {calendarDays.map((cell) => {
 const dayTasks = tasksByDate.get(cell.dateStr) || [];
 const dayNumber = cell.date.getDate();

 return (
 <div
 key={cell.dateStr}
 className={cn(
 "min-h-[110px] p-2 flex flex-col transition-colors group relative",
 !cell.isCurrentMonth && "bg-muted/10 text-muted-foreground/50 opacity-60",
 cell.isToday && "bg-primary/5",
 "hover:bg-muted/20"
 )}
 >
 {/* Header do Dia */}
 <div className="flex items-center justify-between mb-1.5">
 <span
 className={cn(
 "size-6 flex items-center justify-center rounded-full text-xs font-semibold font-mono",
 cell.isToday
 ? "bg-primary text-primary-foreground font-bold shadow-xs"
 : "text-foreground"
 )}
 >
 {dayNumber}
 </span>

 {onAddTaskOnDate && (
 <button
 type="button"
 onClick={() => onAddTaskOnDate(cell.dateStr)}
 className="size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
 title={`Criar tarefa para ${cell.dateStr}`}
 >
 <Plus className="size-3" />
 </button>
 )}
 </div>

 {/* Lista de Chips de Tarefas do Dia */}
 <div className="flex-1 space-y-1 overflow-hidden">
 {dayTasks.slice(0, 3).map((task) => {
 const isDone = task.status === "done";
 return (
 <div
 key={task.id}
 onClick={() => onSelectTask(task)}
 className={cn(
 "group/chip flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer truncate border shadow-2xs",
 isDone
 ? "bg-muted/40 text-muted-foreground border-border/40 line-through"
 : task.priority === "urgent"
 ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
 : task.priority === "high"
 ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
 : "bg-background text-foreground border-border hover:border-primary/40"
 )}
 title={`${task.title} (${task.priority})`}
 >
 {isDone ? (
 <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
 ) : (
 <Circle className="size-2 text-primary shrink-0 fill-current" />
 )}

 <span className="truncate flex-1">{task.title}</span>

 {task.is_my_day && (
 <Star className="size-2.5 text-amber-500 fill-amber-500 shrink-0" />
 )}
 {task.recurrence && task.recurrence !== "none" && (
 <Repeat className="size-2.5 text-purple-500 shrink-0" />
 )}
 </div>
 );
 })}

 {dayTasks.length > 3 && (
 <div
 onClick={() => onSelectTask(dayTasks[3])}
 className="text-[10px] font-bold text-muted-foreground hover:text-primary px-1 cursor-pointer pt-0.5"
 >
 +{dayTasks.length - 3} mais
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
