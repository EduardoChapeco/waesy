/**
 * Date/time helpers Commerce.
 * RULE (AGENTS.md): store ISO UTC; display in America/Sao_Paulo.
 */

import { normalizeWorkingHours, type WeeklySchedule, type Weekday, WEEKDAYS_ORDER } from "./business-hours";
import { getHolidayOnDate } from "./data/holidays-calendar-catalog";

const TZ = "America/Sao_Paulo";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
 timeZone: TZ,
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
 timeZone: TZ,
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 hour: "2-digit",
 minute: "2-digit",
});

export function formatDate(iso: string | Date): string {
 return dateFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

export function formatDateTime(iso: string | Date): string {
 return dateTimeFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

/**
 * Retorna tempo relativo como "há 2 horas", "há 3 dias", "há 1 mês".
 * Usa Intl.RelativeTimeFormat para localização em pt-BR.
 * Datas com mais de 30 dias caem para formatDateTime completo.
 */
const relTimeFmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function formatRelativeTime(iso: string | Date): string {
 const date = typeof iso === "string" ? new Date(iso) : iso;
 const diffMs = date.getTime() - Date.now();
 const diffSec = Math.round(diffMs / 1000);
 const diffMin = Math.round(diffSec / 60);
 const diffHour = Math.round(diffMin / 60);
 const diffDay = Math.round(diffHour / 24);
 const diffMonth = Math.round(diffDay / 30);
 const diffYear = Math.round(diffDay / 365);

 if (Math.abs(diffSec) < 60) return relTimeFmt.format(diffSec, "second");
 if (Math.abs(diffMin) < 60) return relTimeFmt.format(diffMin, "minute");
 if (Math.abs(diffHour) < 24) return relTimeFmt.format(diffHour, "hour");
 if (Math.abs(diffDay) < 30) return relTimeFmt.format(diffDay, "day");
 if (Math.abs(diffMonth) < 12) return relTimeFmt.format(diffMonth, "month");
 if (Math.abs(diffYear) < 5) return relTimeFmt.format(diffYear, "year");
 // fallback para data absoluta em datas muito antigas/futuras
 return formatDateTime(date);
}

export type OpenStatusResult = {
 status: "open" | "closed" | "paused" | "unknown";
 text: string;
 nextEvent?: string;
 isOpenNow: boolean;
 holiday?: {
   name: string;
   type: string;
   is_official_holiday: boolean;
 };
};

/**
 * Avalia o status de funcionamento em tempo real (Google Meu Negócio / iFood / Avec standard)
 * Suporta múltiplos turnos/intervalos por dia, viradas de madrugada (overnight), pausas e feriados.
 */
export function getOpenStatus(
 rawHours: any,
 holidayExceptions?: any[] | null | undefined,
 emergencyPauseUntil?: string | null | undefined,
): OpenStatusResult {
 try {
 const now = new Date();
 const spTime = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
 const currentHour = spTime.getHours();
 const currentMinute = spTime.getMinutes();
 const currentTimeMinutes = currentHour * 60 + currentMinute;
 const currentIsoDate = spTime.toISOString().split("T")[0]; // YYYY-MM-DD

 const nationalHoliday = getHolidayOnDate(currentIsoDate);
 const holidayInfo = nationalHoliday
   ? {
       name: nationalHoliday.name,
       type: nationalHoliday.type,
       is_official_holiday: nationalHoliday.is_official_holiday,
     }
   : undefined;

 const withHoliday = (res: { status: "open" | "closed" | "paused" | "unknown"; text: string; isOpenNow: boolean }): OpenStatusResult => ({
   ...res,
   holiday: holidayInfo,
 });

 if (!rawHours) {
   return withHoliday({ status: "unknown", text: "Horários não informados", isOpenNow: false });
 }

 // 1. Pausa de emergência ativa
 if (emergencyPauseUntil) {
   const pauseDate = new Date(emergencyPauseUntil);
   if (pauseDate.getTime() > now.getTime()) {
     const pauseTimeStr = pauseDate.toLocaleTimeString("pt-BR", {
       timeZone: TZ,
       hour: "2-digit",
       minute: "2-digit",
     });
     return withHoliday({
       status: "paused",
       text: `Pausa temporária de pedidos até ${pauseTimeStr}`,
       isOpenNow: false,
     });
   }
 }

 // 2. Exceção de Feriado no dia de hoje
 if (holidayExceptions && holidayExceptions.length > 0) {
 const exception = holidayExceptions.find((e) => e.date === currentIsoDate);
 if (exception) {
 if (!exception.open || !exception.intervals || exception.intervals.length === 0) {
 return withHoliday({
 status: "closed",
 text: `Fechado hoje (${exception.label || "Feriado"})`,
 isOpenNow: false,
 });
 }

 // Verifica intervalos da exceção
 for (const inv of exception.intervals) {
 const [openH, openM] = (inv.from || "08:00").split(":").map(Number);
 const [closeH, closeM] = (inv.to || "18:00").split(":").map(Number);
 const openMins = openH * 60 + openM;
 const closeMins = closeH * 60 + closeM;

 if (currentTimeMinutes >= openMins && currentTimeMinutes <= closeMins) {
 return withHoliday({
 status: "open",
 text: `Aberto até às ${inv.to} (${exception.label || "Feriado"})`,
 isOpenNow: true,
 });
 }
 }
 }
 }

 // 3. Resolução da Grade Semanal Completa
 const schedule: WeeklySchedule = normalizeWorkingHours(rawHours);
 const dayKeys: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
 const currentDayIndex = spTime.getDay(); // 0 = Domingo, 1 = Segunda, etc.
 const currentDayKey = dayKeys[currentDayIndex];
 const todaySchedule = schedule[currentDayKey];

 // Verifica se ontem à noite abriu um turno que ultrapassa a meia-noite (overnight)
 const yesterdayIndex = (currentDayIndex + 6) % 7;
 const yesterdayKey = dayKeys[yesterdayIndex];
 const yesterdaySchedule = schedule[yesterdayKey];

 if (yesterdaySchedule?.open && yesterdaySchedule.intervals) {
 for (const inv of yesterdaySchedule.intervals) {
 const [openH, openM] = inv.from.split(":").map(Number);
 const [closeH, closeM] = inv.to.split(":").map(Number);
 const openMins = openH * 60 + openM;
 const closeMins = closeH * 60 + closeM;

 // Se fechamento for menor que abertura, passou da meia-noite
 if (closeMins < openMins && currentTimeMinutes < closeMins) {
 return withHoliday({
 status: "open",
 text: `Aberto agora • Fecha às ${inv.to} (Madrugada)`,
 isOpenNow: true,
 });
 }
 }
 }

 // Verifica os turnos de hoje
 if (todaySchedule?.open && todaySchedule.intervals && todaySchedule.intervals.length > 0) {
 // 3.1 Está dentro de algum turno hoje?
 for (const inv of todaySchedule.intervals) {
 const [openH, openM] = inv.from.split(":").map(Number);
 const [closeH, closeM] = inv.to.split(":").map(Number);
 const openMins = openH * 60 + openM;
 const closeMins = closeH * 60 + closeM;

 if (closeMins > openMins) {
 if (currentTimeMinutes >= openMins && currentTimeMinutes <= closeMins) {
 const shiftLabel = inv.label ? ` (${inv.label})` : "";
 return withHoliday({
 status: "open",
 text: `Aberto agora • Fecha às ${inv.to}${shiftLabel}`,
 isOpenNow: true,
 });
 }
 } else {
 // Turno passa da meia-noite
 if (currentTimeMinutes >= openMins) {
 return withHoliday({
 status: "open",
 text: `Aberto agora • Fecha às ${inv.to} (Madrugada)`,
 isOpenNow: true,
 });
 }
 }
 }

 // 3.2 Não está aberto agora, mas ainda abrirá hoje em um turno posterior?
 const upcomingShift = todaySchedule.intervals.find((inv) => {
 const [openH, openM] = inv.from.split(":").map(Number);
 return openH * 60 + openM > currentTimeMinutes;
 });

 if (upcomingShift) {
 const shiftLabel = upcomingShift.label ? ` para ${upcomingShift.label}` : "";
 return withHoliday({
 status: "closed",
 text: `Fechado • Abre hoje às ${upcomingShift.from}${shiftLabel}`,
 isOpenNow: false,
 });
 }
 }

 // 3.3 Fechado hoje ou turnos de hoje encerrados. Procura o próximo dia em que abrirá
 for (let offset = 1; offset <= 7; offset++) {
 const nextDayIndex = (currentDayIndex + offset) % 7;
 const nextDayKey = dayKeys[nextDayIndex];
 const nextDaySchedule = schedule[nextDayKey];

 if (nextDaySchedule?.open && nextDaySchedule.intervals && nextDaySchedule.intervals.length > 0) {
 const firstInterval = nextDaySchedule.intervals[0];
 const nextDayName = WEEKDAYS_ORDER.find((w) => w.key === nextDayKey)?.label || "em breve";
 const dayLabel = offset === 1 ? "amanhã" : `na ${nextDayName.toLowerCase()}`;
 return withHoliday({
 status: "closed",
 text: `Fechado • Abre ${dayLabel} às ${firstInterval.from}`,
 isOpenNow: false,
 });
 }
 }

 return withHoliday({ status: "closed", text: "Fechado temporariamente", isOpenNow: false });
 } catch (e) {
 return { status: "unknown", text: "Horários sob consulta", isOpenNow: false };
 }
}

export function formatTimeOnly(iso: string | Date): string {
 if (!iso) return '';
 const d = new Date(iso);
 return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

