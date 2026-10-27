/**
 * gmaps-scraper-client.ts — Cliente HTTP puro para o scraper self-hosted
 * (gosom/google-maps-scraper em modo `-web`, usado pelo google-maps-scraper-kit).
 *
 * API consumida:
 *  - POST /api/v1/jobs            -> cria job
 *  - GET  /api/v1/jobs            -> lista jobs (usado como health check)
 *  - GET  /api/v1/jobs/{id}       -> status
 *  - GET  /api/v1/jobs/{id}/download -> CSV
 */

import { normalizePlaceCategory } from "@/services/mining/places-harvester";
import type { HarvestedPlace } from "@/services/mining/places-harvester";

export interface GmapsScraperConfig {
  baseUrl: string;
  token?: string;
  depth: number;
  extractEmail: boolean;
}

export interface GmapsJobRequest {
  query: string;
  city: string;
  state?: string;
  lat?: number;
  lon?: number;
  radiusMeters?: number;
}

export type GmapsJobStatus = "pending" | "working" | "ok" | "failed" | "unknown";

export function normalizeBaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("A URL do scraper deve usar http ou https.");
  }
  return url.origin + url.pathname.replace(/\/+$/, "");
}

function authHeaders(config: GmapsScraperConfig): Record<string, string> {
  return config.token ? { Authorization: `Bearer ${config.token}` } : {};
}

async function request(config: GmapsScraperConfig, path: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${normalizeBaseUrl(config.baseUrl)}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeaders(config), ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function pingGmapsScraper(config: GmapsScraperConfig): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const res = await request(config, "/api/v1/jobs", { method: "GET" }, 8000);
    if (!res.ok) return { ok: false, latencyMs: Date.now() - started, error: `HTTP ${res.status}` };
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createGmapsJob(config: GmapsScraperConfig, job: GmapsJobRequest): Promise<string> {
  const keyword = `${job.query} em ${job.city}${job.state ? `, ${job.state}` : ""}`;
  const body: Record<string, unknown> = {
    name: `waesy-${Date.now()}`,
    keywords: [keyword],
    lang: "pt-BR",
    depth: config.depth,
    email: config.extractEmail,
    max_time: 600,
    zoom: 15,
  };
  if (typeof job.lat === "number" && typeof job.lon === "number") {
    body.lat = String(job.lat);
    body.lon = String(job.lon);
    body.radius = job.radiusMeters ?? 5000;
  }
  const res = await request(config, "/api/v1/jobs", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Scraper recusou o job (HTTP ${res.status}).`);
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("Scraper não retornou o id do job.");
  return json.id;
}

export async function getGmapsJobStatus(config: GmapsScraperConfig, jobId: string): Promise<GmapsJobStatus> {
  const res = await request(config, `/api/v1/jobs/${encodeURIComponent(jobId)}`);
  if (!res.ok) throw new Error(`Falha ao consultar job (HTTP ${res.status}).`);
  const json = (await res.json()) as { Status?: string; status?: string };
  const raw = String(json.Status ?? json.status ?? "").toLowerCase();
  if (raw === "ok" || raw === "done" || raw === "completed") return "ok";
  if (raw === "failed" || raw === "error") return "failed";
  if (raw === "pending") return "pending";
  if (raw === "working" || raw === "running") return "working";
  return "unknown";
}

export async function downloadGmapsJobCsv(config: GmapsScraperConfig, jobId: string): Promise<string> {
  const res = await request(config, `/api/v1/jobs/${encodeURIComponent(jobId)}/download`, {}, 30000);
  if (!res.ok) throw new Error(`Falha ao baixar resultados (HTTP ${res.status}).`);
  return res.text();
}

/** Parser CSV RFC-4180 (aspas, vírgulas e quebras de linha em células). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function parseOpenHours(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string[] | string>;
    const out: Record<string, string> = {};
    for (const [day, value] of Object.entries(parsed)) {
      out[day] = Array.isArray(value) ? value.join(", ") : String(value);
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Converte CSV do scraper em `HarvestedPlace`. Linhas sem nome ou coordenadas são descartadas (sem dados sintéticos). */
export function mapGmapsCsvToPlaces(csv: string, fallbackCity: string, fallbackState = ""): HarvestedPlace[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const get = (row: string[], name: string) => {
    const i = idx(name);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };

  const places: HarvestedPlace[] = [];
  for (const row of rows.slice(1)) {
    const name = get(row, "title");
    const lat = toNumber(get(row, "latitude"));
    const lon = toNumber(get(row, "longitude"));
    if (!name || lat === undefined || lon === undefined) continue;

    let city = fallbackCity;
    let state = fallbackState;
    let neighborhood: string | undefined;
    const completeAddress = get(row, "complete_address");
    if (completeAddress) {
      try {
        const addr = JSON.parse(completeAddress) as Record<string, string>;
        city = addr.city || city;
        state = addr.state || state;
        neighborhood = addr.borough || undefined;
      } catch {
        /* campo opcional malformado: mantém fallback */
      }
    }

    const phoneRaw = get(row, "phone");
    const phoneDigits = digitsOnly(phoneRaw);
    const website = get(row, "website");
    const email = get(row, "emails").split(/[,;\s]+/).find((e) => e.includes("@"));

    places.push({
      businessName: name,
      category: normalizePlaceCategory(get(row, "category")),
      address: get(row, "address"),
      neighborhood,
      city,
      state,
      latitude: lat,
      longitude: lon,
      contactPhone: phoneRaw || undefined,
      contactWhatsapp: phoneDigits.length >= 10 ? phoneDigits : undefined,
      websiteUrl: website || undefined,
      rating: toNumber(get(row, "review_rating")),
      reviewsCount: toNumber(get(row, "review_count")),
      workingHours: parseOpenHours(get(row, "open_hours")),
      contactEmail: email,
      externalId: get(row, "cid") || get(row, "data_id") || undefined,
      source: "google_maps_scraper",
    });
  }
  return places;
}
