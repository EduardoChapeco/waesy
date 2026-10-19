export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface TimeInterval {
 from: string; // "HH:MM"
 to: string; // "HH:MM"
 label?: string; // ex: "Almoço", "Jantar", "Manhã", "Tarde"
}

export interface DaySchedule {
 open: boolean;
 intervals: TimeInterval[];
}

export type WeeklySchedule = Record<Weekday, DaySchedule>;

export interface HolidayException {
 id: string;
 date: string; // "YYYY-MM-DD"
 label: string; // ex: "Natal", "Ano Novo", "Feriado Municipal"
 open: boolean;
 intervals?: TimeInterval[];
}

export interface WorkingHoursConfig {
 schedule: WeeklySchedule;
 holiday_exceptions?: HolidayException[];
 emergency_pause_until?: string | null; // ISO Date string or null
 emergency_pause_reason?: string | null;
}

export const WEEKDAYS_ORDER: { key: Weekday; label: string; shortLabel: string }[] = [
 { key: "mon", label: "Segunda-feira", shortLabel: "Seg" },
 { key: "tue", label: "Terça-feira", shortLabel: "Ter" },
 { key: "wed", label: "Quarta-feira", shortLabel: "Qua" },
 { key: "thu", label: "Quinta-feira", shortLabel: "Qui" },
 { key: "fri", label: "Sexta-feira", shortLabel: "Sex" },
 { key: "sat", label: "Sábado", shortLabel: "Sáb" },
 { key: "sun", label: "Domingo", shortLabel: "Dom" },
];

/** Presets Inteligentes de Nicho (Google Meu Negócio / iFood / Avec / Belasis) */
export const SCHEDULE_PRESETS = {
 commercial: {
 id: "commercial",
 label: "Padrão Comercial",
 description: "Seg a Sex (08:00–12:00 e 13:30–18:00), Sáb (08:00–12:00)",
 schedule: {
 mon: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }, { from: "13:30", to: "18:00", label: "Tarde" }] },
 tue: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }, { from: "13:30", to: "18:00", label: "Tarde" }] },
 wed: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }, { from: "13:30", to: "18:00", label: "Tarde" }] },
 thu: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }, { from: "13:30", to: "18:00", label: "Tarde" }] },
 fri: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }, { from: "13:30", to: "18:00", label: "Tarde" }] },
 sat: { open: true, intervals: [{ from: "08:00", to: "12:00", label: "Manhã" }] },
 sun: { open: false, intervals: [] },
 } as WeeklySchedule,
 },
 gastronomy: {
 id: "gastronomy",
 label: "Restaurante / Gastronomia",
 description: "Ter a Dom com 2 turnos: Almoço (11:30–14:30) e Jantar (18:30–23:30)",
 schedule: {
 mon: { open: false, intervals: [] },
 tue: { open: true, intervals: [{ from: "11:30", to: "14:30", label: "Almoço" }, { from: "18:30", to: "23:30", label: "Jantar" }] },
 wed: { open: true, intervals: [{ from: "11:30", to: "14:30", label: "Almoço" }, { from: "18:30", to: "23:30", label: "Jantar" }] },
 thu: { open: true, intervals: [{ from: "11:30", to: "14:30", label: "Almoço" }, { from: "18:30", to: "23:30", label: "Jantar" }] },
 fri: { open: true, intervals: [{ from: "11:30", to: "14:30", label: "Almoço" }, { from: "18:30", to: "23:59", label: "Jantar" }] },
 sat: { open: true, intervals: [{ from: "11:30", to: "15:00", label: "Almoço" }, { from: "18:30", to: "23:59", label: "Jantar" }] },
 sun: { open: true, intervals: [{ from: "11:30", to: "15:00", label: "Almoço" }, { from: "18:30", to: "23:00", label: "Jantar" }] },
 } as WeeklySchedule,
 },
 beauty: {
 id: "beauty",
 label: "Salão / Estética / Clínica (Avec)",
 description: "Ter a Sáb (08:30–12:00 e 13:30–19:00), Seg e Dom fechados",
 schedule: {
 mon: { open: false, intervals: [] },
 tue: { open: true, intervals: [{ from: "08:30", to: "12:00", label: "Manhã" }, { from: "13:30", to: "19:00", label: "Tarde" }] },
 wed: { open: true, intervals: [{ from: "08:30", to: "12:00", label: "Manhã" }, { from: "13:30", to: "19:00", label: "Tarde" }] },
 thu: { open: true, intervals: [{ from: "08:30", to: "12:00", label: "Manhã" }, { from: "13:30", to: "19:00", label: "Tarde" }] },
 fri: { open: true, intervals: [{ from: "08:30", to: "12:00", label: "Manhã" }, { from: "13:30", to: "19:00", label: "Tarde" }] },
 sat: { open: true, intervals: [{ from: "08:30", to: "18:00", label: "Contínuo" }] },
 sun: { open: false, intervals: [] },
 } as WeeklySchedule,
 },
 continuous_weekdays: {
 id: "continuous_weekdays",
 label: "Segunda a Sexta Contínuo",
 description: "Seg a Sex (08:00 às 18:00 sem intervalo)",
 schedule: {
 mon: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
 tue: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
 wed: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
 thu: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
 fri: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
 sat: { open: false, intervals: [] },
 sun: { open: false, intervals: [] },
 } as WeeklySchedule,
 },
 fulltime_24h: {
 id: "fulltime_24h",
 label: "24 Horas (Ininterrupto)",
 description: "Aberto 24 horas todos os dias da semana",
 schedule: {
 mon: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 tue: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 wed: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 thu: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 fri: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 sat: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 sun: { open: true, intervals: [{ from: "00:00", to: "23:59" }] },
 } as WeeklySchedule,
 },
};

/** Seleciona o preset mais adequado com base no segmento de negócio */
export function getPresetForSegment(segment?: string): WeeklySchedule {
 if (!segment) return SCHEDULE_PRESETS.commercial.schedule;
 const s = segment.toLowerCase();
 if (s.includes("gastro") || s.includes("restauran") || s.includes("lanchon") || s.includes("bar") || s.includes("pizza") || s.includes("hamburg") || s.includes("bebida") || s.includes("acougue")) {
 return SCHEDULE_PRESETS.gastronomy.schedule;
 }
 if (s.includes("belez") || s.includes("estet") || s.includes("salao") || s.includes("barbearia") || s.includes("saud") || s.includes("clinica")) {
 return SCHEDULE_PRESETS.beauty.schedule;
 }
 if (s.includes("farmacia") || s.includes("conveniencia") || s.includes("hotel")) {
 return SCHEDULE_PRESETS.fulltime_24h.schedule;
 }
 return SCHEDULE_PRESETS.commercial.schedule;
}

/** Normaliza qualquer estrutura de horários (legada ou nova) para WeeklySchedule válida */
export function normalizeWorkingHours(raw: any): WeeklySchedule {
 if (!raw || typeof raw !== "object") {
 return SCHEDULE_PRESETS.commercial.schedule;
 }

 // Se já for uma WeeklySchedule
 if (raw.mon || raw.tue || raw.wed) {
 const result: Partial<WeeklySchedule> = {};
 for (const { key } of WEEKDAYS_ORDER) {
 const day = raw[key];
 if (day && typeof day === "object") {
 const intervals = Array.isArray(day.intervals)
 ? day.intervals.map((inv: any) => ({
 from: typeof inv.from === "string" ? inv.from : "08:00",
 to: typeof inv.to === "string" ? inv.to : "18:00",
 label: inv.label || undefined,
 }))
 : [];
 result[key] = {
 open: Boolean(day.open && intervals.length > 0),
 intervals: intervals.length > 0 ? intervals : [{ from: "08:00", to: "18:00" }],
 };
 } else {
 result[key] = { open: false, intervals: [] };
 }
 }
 return result as WeeklySchedule;
 }

 // Se for array de extendedHours (formato legado: [{ day: "Segunda-feira", open: true, openTime: "08:00", closeTime: "18:00" }])
 if (Array.isArray(raw)) {
 const dayNameToKey: Record<string, Weekday> = {
 "Segunda-feira": "mon",
 "Terça-feira": "tue",
 "Quarta-feira": "wed",
 "Quinta-feira": "thu",
 "Sexta-feira": "fri",
 "Sábado": "sat",
 "Domingo": "sun",
 };
 const result: WeeklySchedule = { ...SCHEDULE_PRESETS.commercial.schedule };
 for (const item of raw) {
 const key = dayNameToKey[item.day];
 if (key) {
 result[key] = {
 open: Boolean(item.open),
 intervals: item.openTime && item.closeTime ? [{ from: item.openTime, to: item.closeTime }] : [],
 };
 }
 }
 return result;
 }

 return SCHEDULE_PRESETS.commercial.schedule;
}

/** Formata um resumo compacto dos horários (ex: "Seg a Sex: 08:00-18:00 • Sáb: 08:00-12:00") */
export function formatWeeklyScheduleSummary(schedule: WeeklySchedule): string {
 const openDays = WEEKDAYS_ORDER.filter(({ key }) => schedule[key]?.open && schedule[key]?.intervals?.length > 0);
 if (openDays.length === 0) return "Fechado temporariamente";
 if (openDays.length === 7) {
 const is24h = openDays.every(({ key }) => {
 const inv = schedule[key]?.intervals?.[0];
 return inv?.from === "00:00" && inv?.to === "23:59";
 });
 if (is24h) return "Aberto 24 Horas todos os dias";
 }

 const parts: string[] = [];
 // Agrupa dias úteis se tiverem o mesmo horário
 const monToFriSame = ["tue", "wed", "thu", "fri"].every((d) => {
 const mon = schedule.mon;
 const cur = schedule[d as Weekday];
 return mon.open === cur.open && JSON.stringify(mon.intervals) === JSON.stringify(cur.intervals);
 });

 if (monToFriSame && schedule.mon.open) {
 const invStr = schedule.mon.intervals.map((i) => `${i.from} às ${i.to}`).join(", ");
 parts.push(`Seg a Sex: ${invStr}`);
 } else {
 for (const { key, shortLabel } of WEEKDAYS_ORDER.slice(0, 5)) {
 if (schedule[key]?.open) {
 const invStr = schedule[key].intervals.map((i) => `${i.from}-${i.to}`).join(", ");
 parts.push(`${shortLabel}: ${invStr}`);
 }
 }
 }

 if (schedule.sat?.open) {
 const satStr = schedule.sat.intervals.map((i) => `${i.from} às ${i.to}`).join(", ");
 parts.push(`Sáb: ${satStr}`);
 }
 if (schedule.sun?.open) {
 const sunStr = schedule.sun.intervals.map((i) => `${i.from} às ${i.to}`).join(", ");
 parts.push(`Dom: ${sunStr}`);
 }
  return parts.join(" • ") || "Horários sob consulta";
}

export interface StoreDepartmentSchedule {
  id: string;
  name: string;
  hours: string;
  responseTime: string;
  daysDescription: string;
  isOpenNow: boolean;
  is24h?: boolean;
  phone?: string | null;
}

/**
 * Resolve os horários de atendimento e tempo de resposta de cada setor da empresa.
 * Se configurado em store.settings, consome a configuração persistida.
 * Se não houver, infere setores canônicos inteligentes com base na vertical e horários da loja.
 */
export function resolveStoreDepartmentSchedules(store: any): StoreDepartmentSchedule[] {
  const settings = store?.settings || {};
  const explicit = settings.department_schedules || settings.departments;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map((dept: any, index: number) => ({
      id: dept.id || `dept-${index}`,
      name: dept.name || dept.label || "Atendimento",
      hours: dept.hours || "08:00 às 18:00",
      responseTime: dept.responseTime || dept.response_time || "Até 30 min",
      daysDescription: dept.daysDescription || dept.days || "Segunda a Sexta",
      isOpenNow: typeof dept.isOpenNow === "boolean" ? dept.isOpenNow : true,
      is24h: Boolean(dept.is24h || (typeof dept.hours === "string" && dept.hours.toLowerCase().includes("24h"))),
      phone: dept.phone || store?.phone || store?.contact_phone || null,
    }));
  }

  const rawHours =
    settings.working_hours ||
    settings.business_hours_extended ||
    store?.business_hours ||
    store?.working_hours ||
    null;
  const weekly = normalizeWorkingHours(rawHours);
  const monInv = weekly.mon?.intervals?.[0];
  const generalHoursStr = monInv ? `${monInv.from} às ${monInv.to}` : "08:00 às 18:00";
  const satOpen = weekly.sat?.open;
  const is24hGeneral = Boolean(weekly.mon?.open && monInv?.from === "00:00" && monInv?.to === "23:59");

  const category = (store?.category || "").toLowerCase();
  const isFoodOrHospitality =
    category.includes("gastro") ||
    category.includes("restauran") ||
    category.includes("hotel") ||
    category.includes("pousada") ||
    category.includes("farmacia");

  return [
    {
      id: "vendas",
      name: "Vendas & Orçamentos",
      hours: is24hGeneral ? "24 Horas" : generalHoursStr,
      responseTime: "Geralmente responde em 10 min",
      daysDescription: satOpen ? "Segunda a Sábado" : "Segunda a Sexta",
      isOpenNow: true,
      is24h: is24hGeneral,
      phone: store?.phone || store?.contact_phone || null,
    },
    {
      id: "suporte",
      name: "Suporte & Pós-Venda",
      hours: isFoodOrHospitality ? (is24hGeneral ? "Plantão 24h" : generalHoursStr) : "08:00 às 18:00",
      responseTime: "Em até 30 min",
      daysDescription: "Segunda a Sexta",
      isOpenNow: true,
      is24h: false,
      phone: store?.phone || store?.contact_phone || null,
    },
    {
      id: "financeiro",
      name: "Financeiro & Pix",
      hours: "09:00 às 17:00",
      responseTime: "Em até 1 hora",
      daysDescription: "Dias Úteis",
      isOpenNow: true,
      is24h: false,
      phone: store?.phone || store?.contact_phone || null,
    },
  ];
}

