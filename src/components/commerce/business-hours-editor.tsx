import React, { useState } from "react";
import { Clock, Plus, Trash2, Copy, Layers, CheckCircle2, Calendar, AlertCircle, PauseCircle, PlayCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { type WeeklySchedule, type Weekday, type TimeInterval, type HolidayException, WEEKDAYS_ORDER, SCHEDULE_PRESETS, normalizeWorkingHours } from "@/lib/business-hours";
import { getOpenStatus } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface BusinessHoursEditorProps {
 value?: any;
 onChange: (schedule: WeeklySchedule) => void;
 holidayExceptions?: HolidayException[];
 onHolidayExceptionsChange?: (exceptions: HolidayException[]) => void;
 emergencyPauseUntil?: string | null;
 onEmergencyPauseChange?: (until: string | null) => void;
 className?: string;
 showPresets?: boolean;
 showStatusPreview?: boolean;
 showHolidays?: boolean;
 showEmergencyPause?: boolean;
}

export function BusinessHoursEditor({
 value,
 onChange,
 holidayExceptions = [],
 onHolidayExceptionsChange,
 emergencyPauseUntil = null,
 onEmergencyPauseChange,
 className,
 showPresets = true,
 showStatusPreview = true,
 showHolidays = true,
 showEmergencyPause = true,
}: BusinessHoursEditorProps) {
 const schedule: WeeklySchedule = normalizeWorkingHours(value);
 const openStatus = getOpenStatus(schedule, holidayExceptions, emergencyPauseUntil);

 const [isHolidaysExpanded, setIsHolidaysExpanded] = useState(false);
 const [newHolidayDate, setNewHolidayDate] = useState("");
 const [newHolidayLabel, setNewHolidayLabel] = useState("");
 const [newHolidayOpen, setNewHolidayOpen] = useState(false);

 const updateDay = (day: Weekday, updater: (prev: typeof schedule[Weekday]) => typeof schedule[Weekday]) => {
 const currentDay = schedule[day] || { open: false, intervals: [] };
 const updatedDay = updater(currentDay);
 onChange({
 ...schedule,
 [day]: updatedDay,
 });
 };

 const handleToggleDay = (day: Weekday, checked: boolean) => {
 updateDay(day, (prev) => {
 if (checked) {
 const intervals = prev.intervals && prev.intervals.length > 0
 ? prev.intervals
 : [{ from: "08:00", to: "18:00", label: "Horário Principal" }];
 return { open: true, intervals };
 }
 return { open: false, intervals: [] };
 });
 };

 const handleSetDay24h = (day: Weekday) => {
 updateDay(day, () => ({
 open: true,
 intervals: [{ from: "00:00", to: "23:59", label: "24 Horas" }],
 }));
 toast.success("Horário 24 Horas aplicado.");
 };

 const handleSetDayCommercial = (day: Weekday) => {
 updateDay(day, () => ({
 open: true,
 intervals: [
 { from: "08:00", to: "12:00", label: "Manhã" },
 { from: "13:30", to: "18:00", label: "Tarde" },
 ],
 }));
 toast.success("Turnos comerciais aplicados.");
 };

 const handleSetDayGastronomy = (day: Weekday) => {
 updateDay(day, () => ({
 open: true,
 intervals: [
 { from: "11:30", to: "14:30", label: "Almoço" },
 { from: "18:30", to: "23:30", label: "Jantar" },
 ],
 }));
 toast.success("Turnos de almoço e jantar aplicados.");
 };

 const handleAddInterval = (day: Weekday) => {
 updateDay(day, (prev) => {
 const intervals = [...(prev.intervals || [])];
 if (intervals.length === 1) {
 intervals.push({ from: "18:30", to: "23:00", label: "Jantar / Noite" });
 } else {
 intervals.push({ from: "14:00", to: "18:00", label: "Turno Extra" });
 }
 return { open: true, intervals };
 });
 toast.success("Novo turno adicionado para o dia.");
 };

 const handleRemoveInterval = (day: Weekday, index: number) => {
 updateDay(day, (prev) => {
 const intervals = (prev.intervals || []).filter((_, i) => i !== index);
 return {
 open: intervals.length > 0,
 intervals,
 };
 });
 };

 const handleUpdateInterval = (
 day: Weekday,
 index: number,
 field: keyof TimeInterval,
 val: string
 ) => {
 updateDay(day, (prev) => {
 const intervals = [...(prev.intervals || [])];
 if (intervals[index]) {
 intervals[index] = {
 ...intervals[index],
 [field]: val,
 };
 }
 return { ...prev, intervals };
 });
 };

 const handleCopyDayToWeekdays = (sourceDay: Weekday) => {
 const source = schedule[sourceDay];
 if (!source) return;
 const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];
 const newSchedule = { ...schedule };
 for (const d of weekdays) {
 newSchedule[d] = JSON.parse(JSON.stringify(source));
 }
 onChange(newSchedule);
 toast.success(`Horários de ${WEEKDAYS_ORDER.find((w) => w.key === sourceDay)?.label} replicados para Segunda a Sexta!`);
 };

 const handleCopyDayToAll = (sourceDay: Weekday) => {
 const source = schedule[sourceDay];
 if (!source) return;
 const newSchedule = { ...schedule };
 for (const { key } of WEEKDAYS_ORDER) {
 newSchedule[key] = JSON.parse(JSON.stringify(source));
 }
 onChange(newSchedule);
 toast.success(`Horários de ${WEEKDAYS_ORDER.find((w) => w.key === sourceDay)?.label} replicados para TODOS os 7 dias!`);
 };

 const handleApplyPreset = (presetKey: keyof typeof SCHEDULE_PRESETS) => {
 const preset = SCHEDULE_PRESETS[presetKey];
 if (!preset) return;
 onChange(JSON.parse(JSON.stringify(preset.schedule)));
 toast.success(`Modelo "${preset.label}" carregado!`);
 };

 const handleAddHolidayException = () => {
 if (!newHolidayDate || !newHolidayLabel.trim()) {
 toast.error("Informe a data e o nome do feriado/evento especial.");
 return;
 }
 const newException: HolidayException = {
 id: `hol-${Date.now()}`,
 date: newHolidayDate,
 label: newHolidayLabel.trim(),
 open: newHolidayOpen,
 intervals: newHolidayOpen ? [{ from: "10:00", to: "16:00", label: "Horário Especial" }] : [],
 };
 if (onHolidayExceptionsChange) {
 onHolidayExceptionsChange([...holidayExceptions, newException]);
 }
 setNewHolidayDate("");
 setNewHolidayLabel("");
 setNewHolidayOpen(false);
 toast.success("Exceção de feriado adicionada com sucesso!");
 };

 const handleRemoveHolidayException = (id: string) => {
 if (onHolidayExceptionsChange) {
 onHolidayExceptionsChange(holidayExceptions.filter((h) => h.id !== id));
 toast.success("Exceção removida.");
 }
 };

 const handleEmergencyPause = (minutes: number | "today" | null) => {
 if (!onEmergencyPauseChange) return;
 if (minutes === null) {
 onEmergencyPauseChange(null);
 toast.success("Atendimento retomado com sucesso!");
 return;
 }
 const now = new Date();
 if (minutes === "today") {
 now.setHours(23, 59, 59, 999);
 onEmergencyPauseChange(now.toISOString());
 toast.success("Atendimento pausado até o final de hoje.");
 } else {
 const pauseUntil = new Date(now.getTime() + minutes * 60 * 1000);
 onEmergencyPauseChange(pauseUntil.toISOString());
 toast.success(`Atendimento pausado temporariamente por ${minutes} minutos.`);
 }
 };

 return (
 <div className={cn("space-y-5", className)}>
 {/* ── 1. Top Bar com Presets Rápidos ── */}
 {showPresets && (
 <div className="space-y-2 p-4 rounded-2xl bg-muted/30 border border-border/50">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Zap className="size-3.5 text-amber-500" />
 Modelos de Horário Prontos (Clique para Carregar)
 </span>
 </div>

 <div className="flex flex-wrap gap-2 pt-1">
 {Object.entries(SCHEDULE_PRESETS).map(([key, preset]) => (
 <button
 key={key}
 type="button"
 onClick={() => handleApplyPreset(key as any)}
 className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-background hover:bg-muted text-foreground border border-border hover:border-primary/50 transition-all cursor-pointer text-left flex items-center gap-1.5 shadow-2xs"
 title={preset.description}
 >
 <span>{preset.label}</span>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* ── 2. Status em Tempo Real & Pausa de Emergência ── */}
 {(showStatusPreview || showEmergencyPause) && (
 <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3 shadow-2xs">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2 text-xs">
 <span className="text-muted-foreground font-semibold">Status Agora:</span>
 <Badge
 variant="outline"
 className={cn(
 "text-xs font-bold font-mono px-3 py-1 rounded-xl",
 openStatus.isOpenNow
 ? "bg-success/10 text-success border-success/30"
 : openStatus.status === "paused"
 ? "bg-warning/10 text-warning border-warning/30"
 : "bg-muted text-muted-foreground border-border"
 )}
 >
 <span
 className={cn(
 "size-2 rounded-full mr-1.5 inline-block",
 openStatus.isOpenNow
 ? "bg-success animate-pulse"
 : openStatus.status === "paused"
 ? "bg-warning animate-ping"
 : "bg-muted-foreground"
 )}
 />
 {openStatus.text}
 </Badge>
 </div>

 {/* Ações Rápidas de Pausa Temporária (iFood / Avec Style) */}
 {showEmergencyPause && onEmergencyPauseChange && (
 <div className="flex items-center gap-1.5">
 {emergencyPauseUntil ? (
 <Button
 type="button"
 size="sm"
 onClick={() => handleEmergencyPause(null)}
 className="h-9 rounded-xl text-xs font-bold bg-success hover:bg-success/90 text-success-foreground gap-1.5 shadow-xs"
 >
 <PlayCircle className="size-3.5" />
 <span>Retomar Loja Agora</span>
 </Button>
 ) : (
 <div className="flex items-center gap-1">
 <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">Pausa Rápida:</span>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleEmergencyPause(30)}
 className="h-8 px-2.5 rounded-lg text-[11px] font-semibold"
 >
 30 min
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleEmergencyPause(60)}
 className="h-8 px-2.5 rounded-lg text-[11px] font-semibold"
 >
 1h
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleEmergencyPause("today")}
 className="h-8 px-2.5 rounded-lg text-[11px] font-semibold text-warning hover:text-warning/90"
 >
 Hoje
 </Button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── 3. Grade dos 7 Dias da Semana ── */}
 <div className="space-y-3">
 {WEEKDAYS_ORDER.map(({ key, label }) => {
 const day = schedule[key] || { open: false, intervals: [] };
 const isOpen = day.open;
 const intervals = day.intervals || [];

 return (
 <div
 key={key}
 className={cn(
 "p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3",
 isOpen
 ? "bg-background border-border/80 shadow-2xs"
 : "bg-muted/15 border-border/30 opacity-75"
 )}
 >
 {/* Cabeçalho do Dia */}
 <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <Switch
 checked={isOpen}
 onCheckedChange={(checked) => handleToggleDay(key, checked)}
 />
 <div>
 <span className="text-xs font-bold text-foreground">{label}</span>
 <span className="text-[10px] text-muted-foreground block">
 {isOpen
 ? `${intervals.length} turno(s) configurado(s)`
 : "Fechado o dia todo"}
 </span>
 </div>
 </div>

 {isOpen && (
 <div className="flex flex-wrap items-center gap-1.5">
 {/* Atalhos Rápidos de Turno em 1 Clique */}
 <button
 type="button"
 onClick={() => handleSetDay24h(key)}
 className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
 title="Definir 24h para este dia"
 >
 24h
 </button>
 <button
 type="button"
 onClick={() => handleSetDayCommercial(key)}
 className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
 title="Definir 08:00-12:00 e 13:30-18:00"
 >
 Comercial
 </button>
 <button
 type="button"
 onClick={() => handleSetDayGastronomy(key)}
 className="px-2 py-1 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
 title="Definir Almoço e Jantar"
 >
 Almoço + Jantar
 </button>

 <span className="text-border">|</span>

 {/* Botões de Replicação */}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleCopyDayToWeekdays(key)}
 className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg"
 title="Copiar Seg-Sex"
 >
 <Copy className="size-3 mr-1" />
 <span className="hidden sm:inline">Copiar Seg-Sex</span>
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleCopyDayToAll(key)}
 className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg"
 title="Copiar Todos"
 >
 <Copy className="size-3 mr-1" />
 <span className="hidden sm:inline">Copiar Todos</span>
 </Button>
 </div>
 )}
 </div>

 {/* Lista de Turnos / Intervalos do Dia */}
 {isOpen && (
 <div className="space-y-2 pt-1 border-t border-border/40">
 {intervals.map((inv, idx) => (
 <div
 key={idx}
 className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/40 text-xs"
 >
 <div className="flex items-center gap-1.5 shrink-0">
 <span className="text-[11px] font-bold text-muted-foreground">Das</span>
 <Input
 type="time"
 value={inv.from}
 onChange={(e) =>
 handleUpdateInterval(key, idx, "from", e.target.value)
 }
 className="h-8 w-24 rounded-lg font-mono font-bold text-xs bg-background"
 />
 <span className="text-[11px] font-bold text-muted-foreground">às</span>
 <Input
 type="time"
 value={inv.to}
 onChange={(e) =>
 handleUpdateInterval(key, idx, "to", e.target.value)
 }
 className="h-8 w-24 rounded-lg font-mono font-bold text-xs bg-background"
 />
 </div>

 {/* Rótulo Opcional do Turno (ex: Almoço, Jantar, Manhã) */}
 <div className="flex-1 min-w-[120px]">
 <Input
 type="text"
 placeholder="Rótulo (ex: Almoço, Jantar, Madrugada)"
 value={inv.label || ""}
 onChange={(e) =>
 handleUpdateInterval(key, idx, "label", e.target.value)
 }
 className="h-8 rounded-lg text-xs bg-background"
 />
 </div>

 {/* Ação de Exclusão do Turno */}
 {intervals.length > 1 && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveInterval(key, idx)}
 className="size-8 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
 title="Remover este turno"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>
 ))}

 {/* Botão para Adicionar Mais Turnos (ex: Almoço + Jantar) */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleAddInterval(key)}
 className="h-8 px-3 text-xs font-semibold rounded-xl gap-1.5 border-dashed border-border/80 hover:border-primary/50 text-foreground w-full sm:w-auto"
 >
 <Plus className="size-3.5 text-primary" />
 <span>Adicionar mais um turno / intervalo (ex: Jantar)</span>
 </Button>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* ── 4. Exceções de Feriados & Datas Especiais (Google Meu Negócio / Avec Style) ── */}
 {showHolidays && onHolidayExceptionsChange && (
 <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
 <div
 className="flex items-center justify-between cursor-pointer select-none"
 onClick={() => setIsHolidaysExpanded(!isHolidaysExpanded)}
 >
 <div className="flex items-center gap-2">
 <Calendar className="size-4 text-primary" />
 <div>
 <h4 className="text-xs font-bold text-foreground">
 Feriados e Datas Especiais
 </h4>
 <p className="text-[11px] text-muted-foreground">
 {holidayExceptions.length > 0
 ? `${holidayExceptions.length} data(s) especial(is) cadastrada(s)`
 : "Defina se sua loja abre ou fecha em feriados municipais e nacionais."}
 </p>
 </div>
 </div>
 <Button variant="ghost" size="icon" className="size-8 rounded-lg">
 {isHolidaysExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
 </Button>
 </div>

 {isHolidaysExpanded && (
 <div className="space-y-4 pt-2 border-t border-border/40">
 {/* Formulário de Adicionar Feriado */}
 <div className="p-3 rounded-xl bg-background border border-border/60 space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
 <div className="sm:col-span-4 space-y-1">
 <Label className="text-[11px] font-bold text-foreground">Data *</Label>
 <Input
 type="date"
 value={newHolidayDate}
 onChange={(e) => setNewHolidayDate(e.target.value)}
 className="h-8 rounded-lg text-xs bg-muted/30 font-mono"
 />
 </div>
 <div className="sm:col-span-5 space-y-1">
 <Label className="text-[11px] font-bold text-foreground">Nome da Data / Feriado *</Label>
 <Input
 placeholder="Ex: Natal, Ano Novo, Aniversário da Cidade"
 value={newHolidayLabel}
 onChange={(e) => setNewHolidayLabel(e.target.value)}
 className="h-8 rounded-lg text-xs bg-muted/30"
 />
 </div>
 <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-2 pt-1">
 <div className="flex items-center gap-1.5">
 <Switch
 id="holiday_open"
 checked={newHolidayOpen}
 onCheckedChange={setNewHolidayOpen}
 />
 <Label htmlFor="holiday_open" className="text-[10px] font-semibold">
 {newHolidayOpen ? "Aberto" : "Fechado"}
 </Label>
 </div>
 <Button
 type="button"
 size="sm"
 onClick={handleAddHolidayException}
 className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1 shadow-xs"
 >
 <Plus className="size-3" />
 <span>Salvar</span>
 </Button>
 </div>
 </div>
 </div>

 {/* Lista de Feriados Cadastrados */}
 {holidayExceptions.length > 0 && (
 <div className="space-y-2">
 {holidayExceptions.map((hol) => (
 <div
 key={hol.id}
 className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 text-xs"
 >
 <div className="flex items-center gap-2">
 <Badge
 variant="outline"
 className={cn(
 "text-[10px] font-bold font-mono px-2 py-0.5",
 hol.open
 ? "bg-success/10 text-success border-success/30"
 : "bg-destructive/10 text-destructive border-destructive/30"
 )}
 >
 {hol.open ? "Aberto Especial" : "Fechado"}
 </Badge>
 <span className="font-mono font-bold text-foreground">
 {hol.date.split("-").reverse().join("/")}
 </span>
 <span className="text-muted-foreground">—</span>
 <span className="font-medium text-foreground">{hol.label}</span>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveHolidayException(hol.id)}
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg"
 >
 <Trash2 className="size-3" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 );
}
