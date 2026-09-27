import { z } from "zod";

/**
 * ── RESUME EXPERIENCE & MEDIA SCHEMAS (Apple HIG & LinkedIn Architecture) ──
 * Motor matemático de datas, mídias estruturadas e telemetria de carreiras.
 */

export const ExperienceMediaItemSchema = z.object({
  id: z.string().default(() => `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
  url: z.string().url("URL de mídia inválida"),
  title: z.string().optional(),
  type: z.enum(["image", "pdf", "document", "link"]).default("image"),
  description: z.string().optional(),
});

export type ExperienceMediaItem = z.infer<typeof ExperienceMediaItemSchema>;

export const ResumeExperienceSchema = z.object({
  id: z.string().default(() => `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
  title: z.string().min(2, "Cargo deve ter no mínimo 2 caracteres"),
  company: z.string().min(2, "Empresa deve ter no mínimo 2 caracteres"),
  profession_id: z.string().optional(),
  store_id: z.string().optional(),
  store_logo: z.string().optional(),
  employment_type: z.string().default("CLT"),
  location: z.string().optional(),
  location_type: z.string().default("No local"),
  is_current: z.boolean().default(false),

  // Componentes de Data Estruturada
  start_month: z.number().int().min(1).max(12).optional(),
  start_year: z.number().int().min(1960).max(2035).optional(),
  start_date: z.string().optional(),

  end_month: z.number().int().min(1).max(12).optional(),
  end_year: z.number().int().min(1960).max(2035).optional(),
  end_date: z.string().optional(),

  // Motor Matemático: Tempo de permanência exato
  duration_months: z.number().int().min(0).default(0),
  duration_text: z.string().optional(),

  description: z.string().optional(),
  media_urls: z.array(z.string()).default([]),
  media: z.array(ExperienceMediaItemSchema).default([]),

  // Benchmark Salarial e Avaliação de Cultura (Comunitário)
  salary_cents: z.number().int().min(0).optional(),
  exit_reason: z.string().optional(),
  company_rating: z.number().min(0).max(5).optional(),
  would_recommend: z.boolean().default(true),
  review_text: z.string().optional(),
  is_anonymous: z.boolean().default(false),
});

export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;

/**
 * ── MOTOR MATEMÁTICO DE DATAS ──
 * Calcula a permanência exata em meses a partir de ano/mês inicial e final.
 */
export function calculateExperienceDurationMonths(
  startYear?: number | null,
  startMonth?: number | null,
  endYear?: number | null,
  endMonth?: number | null,
  isCurrent?: boolean
): number {
  if (!startYear) return 0;
  const sMonth = startMonth && startMonth >= 1 && startMonth <= 12 ? startMonth : 1;
  const startTotal = startYear * 12 + (sMonth - 1);

  let endTotal: number;
  if (isCurrent || !endYear) {
    const now = new Date();
    endTotal = now.getFullYear() * 12 + now.getMonth();
  } else {
    const eMonth = endMonth && endMonth >= 1 && endMonth <= 12 ? endMonth : 12;
    endTotal = endYear * 12 + (eMonth - 1);
  }

  const diff = endTotal - startTotal + 1; // contagem inclusiva de meses
  return Math.max(diff, 1);
}

/**
 * Formata duração em meses para string humana ("2 anos e 3 meses").
 */
export function formatExperienceDurationMonths(totalMonths?: number | null): string {
  if (!totalMonths || totalMonths <= 0) return "";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  }

  return parts.join(" e ") || "menos de 1 mês";
}

const MONTH_NAMES_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

/**
 * Normaliza e enriquece uma experiência calculando a duração matemática e datas legíveis.
 */
export function enrichExperienceMath(exp: Partial<ResumeExperience>): ResumeExperience {
  const isCurrent = exp.is_current ?? (!exp.end_year && !exp.end_date);
  
  // Extrai ano e mês inicial
  let startYear = exp.start_year;
  let startMonth = exp.start_month;
  if ((!startYear || !startMonth) && exp.start_date) {
    const parsed = parseDateString(exp.start_date);
    if (!startYear && parsed.year) startYear = parsed.year;
    if (!startMonth && parsed.month) startMonth = parsed.month;
  }

  // Extrai ano e mês final
  let endYear = exp.end_year;
  let endMonth = exp.end_month;
  if (!isCurrent && (!endYear || !endMonth) && exp.end_date) {
    const parsed = parseDateString(exp.end_date);
    if (!endYear && parsed.year) endYear = parsed.year;
    if (!endMonth && parsed.month) endMonth = parsed.month;
  }

  const durationMonths = calculateExperienceDurationMonths(
    startYear,
    startMonth,
    endYear,
    endMonth,
    isCurrent
  );

  const durationText = formatExperienceDurationMonths(durationMonths);

  // Formata strings para renderização
  const startDateStr = startYear
    ? startMonth
      ? `${MONTH_NAMES_SHORT[startMonth - 1]} de ${startYear}`
      : `${startYear}`
    : exp.start_date || "";

  const endDateStr = isCurrent
    ? "Atual"
    : endYear
    ? endMonth
      ? `${MONTH_NAMES_SHORT[endMonth - 1]} de ${endYear}`
      : `${endYear}`
    : exp.end_date || "Atual";

  // Sincroniza media_urls e media
  const mediaList = Array.isArray(exp.media) ? [...exp.media] : [];
  if (Array.isArray(exp.media_urls)) {
    for (const url of exp.media_urls) {
      if (url && !mediaList.some(m => m.url === url)) {
        mediaList.push({
          id: `med_${Math.random().toString(36).slice(2, 9)}`,
          url,
          type: url.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
        });
      }
    }
  }

  return {
    id: exp.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: exp.title || "Cargo",
    company: exp.company || "Empresa",
    profession_id: exp.profession_id,
    store_id: exp.store_id,
    store_logo: exp.store_logo,
    employment_type: exp.employment_type || "CLT",
    location: exp.location,
    location_type: exp.location_type || "No local",
    is_current: isCurrent,
    start_month: startMonth,
    start_year: startYear,
    start_date: startDateStr,
    end_month: isCurrent ? undefined : endMonth,
    end_year: isCurrent ? undefined : endYear,
    end_date: endDateStr,
    duration_months: durationMonths,
    duration_text: durationText,
    description: exp.description,
    media_urls: mediaList.map(m => m.url),
    media: mediaList,
    salary_cents: exp.salary_cents,
    exit_reason: exp.exit_reason,
    company_rating: exp.company_rating,
    would_recommend: exp.would_recommend ?? true,
    review_text: exp.review_text,
    is_anonymous: exp.is_anonymous ?? false,
  };
}

function parseDateString(str: string): { year?: number; month?: number } {
  if (!str) return {};
  const clean = str.trim();
  const iso = clean.match(/^(\d{4})-(\d{1,2})/);
  if (iso) return { year: parseInt(iso[1], 10), month: parseInt(iso[2], 10) };
  
  const slash = clean.match(/^(\d{1,2})\/(\d{4})/);
  if (slash) return { month: parseInt(slash[1], 10), year: parseInt(slash[2], 10) };

  const yearOnly = clean.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearOnly ? parseInt(yearOnly[1], 10) : undefined;

  const monthIdx = MONTH_NAMES_SHORT.findIndex(
    m => clean.toLowerCase().includes(m.toLowerCase())
  );
  const month = monthIdx !== -1 ? monthIdx + 1 : undefined;

  return { year, month };
}
