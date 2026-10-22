/**
 * gmaps-scraper.functions.ts — BFF da integração Google Maps Scraper (VPS/Docker).
 * Config guardada em stores.settings.integrations.gmaps_scraper da store raiz
 * (token criptografado AES-256-GCM). Todas as funções exigem platform admin.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requirePlatformAdmin } from "@/lib/server-access";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto-vault.server";
import {
  createGmapsJob,
  downloadGmapsJobCsv,
  getGmapsJobStatus,
  mapGmapsCsvToPlaces,
  normalizeBaseUrl,
  pingGmapsScraper,
  type GmapsJobStatus,
  type GmapsScraperConfig,
} from "@/lib/mining/gmaps-scraper-client";
import { harvestAndPersistPlaces } from "./mining/places-harvester";

export interface GmapsScraperSettingsDTO {
  baseUrl: string;
  tokenMasked: string;
  hasToken: boolean;
  depth: number;
  extractEmail: boolean;
  isActive: boolean;
  updatedAt?: string;
}

interface StoredGmapsConfig {
  base_url?: string;
  token_encrypted?: string;
  token_masked?: string;
  depth?: number;
  extract_email?: boolean;
  is_active?: boolean;
  updated_at?: string;
}

async function loadRootStore() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("stores")
    .select("id, settings")
    .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
    .limit(1)
    .maybeSingle();
  return data as { id: string; settings: Record<string, any> | null } | null;
}

function readStored(settings: Record<string, any> | null | undefined): StoredGmapsConfig {
  return ((settings?.integrations as Record<string, any> | undefined)?.gmaps_scraper as StoredGmapsConfig) || {};
}

/** SERVER ONLY: devolve config ativa descriptografada (nunca enviar ao cliente). */
export async function resolveActiveGmapsConfig(): Promise<GmapsScraperConfig | null> {
  const root = await loadRootStore();
  const stored = readStored(root?.settings);
  if (!stored.is_active || !stored.base_url) return null;
  let token: string | undefined;
  if (stored.token_encrypted) {
    try {
      token = decryptSecret(stored.token_encrypted);
    } catch {
      return null;
    }
  }
  return {
    baseUrl: stored.base_url,
    token,
    depth: stored.depth ?? 3,
    extractEmail: stored.extract_email ?? true,
  };
}

export const getGmapsScraperSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<GmapsScraperSettingsDTO> => {
    await requirePlatformAdmin();
    const stored = readStored((await loadRootStore())?.settings);
    return {
      baseUrl: stored.base_url || "",
      tokenMasked: stored.token_masked || "",
      hasToken: Boolean(stored.token_encrypted),
      depth: stored.depth ?? 3,
      extractEmail: stored.extract_email ?? true,
      isActive: Boolean(stored.is_active),
      updatedAt: stored.updated_at,
    };
  },
);

export const saveGmapsScraperSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      baseUrl: z.string().url("URL inválida"),
      token: z.string().optional(),
      depth: z.number().int().min(1).max(20).default(3),
      extractEmail: z.boolean().default(true),
      isActive: z.boolean().default(true),
    }),
  )
  .handler(async ({ data: input }) => {
    await requirePlatformAdmin();
    const supabase = getServerClient();
    const root = await loadRootStore();
    if (!root) throw new Error("Store raiz da plataforma não encontrada.");

    const previous = readStored(root.settings);
    const rawToken = input.token?.trim();
    const keepsPrevious = !rawToken || rawToken === previous.token_masked;

    const next: StoredGmapsConfig = {
      base_url: normalizeBaseUrl(input.baseUrl),
      token_encrypted: keepsPrevious ? previous.token_encrypted : encryptSecret(rawToken as string),
      token_masked: keepsPrevious ? previous.token_masked : maskSecret(rawToken as string),
      depth: input.depth,
      extract_email: input.extractEmail,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    };

    const settings = root.settings || {};
    const { error } = await supabase
      .from("stores")
      .update({
        settings: {
          ...settings,
          integrations: { ...((settings.integrations as Record<string, any>) || {}), gmaps_scraper: next },
        },
      })
      .eq("id", root.id);
    if (error) throw new Error("Erro ao salvar integração: " + error.message);
    return { status: "success" as const };
  });

export const testGmapsScraperConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({ baseUrl: z.string().url().optional(), token: z.string().optional() }).default({}),
  )
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const root = await loadRootStore();
    const stored = readStored(root?.settings);
    const baseUrl = data.baseUrl || stored.base_url;
    if (!baseUrl) return { ok: false, latencyMs: 0, error: "Informe a URL do scraper." };

    let token = data.token?.trim();
    if (!token || token === stored.token_masked) {
      token = stored.token_encrypted ? decryptSecret(stored.token_encrypted) : undefined;
    }
    return pingGmapsScraper({ baseUrl, token, depth: 1, extractEmail: false });
  });

const JobInputSchema = z.object({
  query: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  state: z.string().max(2).optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export const startGmapsScrapeJob = createServerFn({ method: "POST" })
  .validator(JobInputSchema)
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const config = await resolveActiveGmapsConfig();
    if (!config) throw new Error("Integração Google Maps Scraper inativa ou sem URL configurada.");
    const jobId = await createGmapsJob(config, data);
    return { jobId };
  });

export const collectGmapsScrapeJob = createServerFn({ method: "POST" })
  .validator(JobInputSchema.extend({ jobId: z.string().min(4).max(80) }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const config = await resolveActiveGmapsConfig();
    if (!config) throw new Error("Integração Google Maps Scraper inativa.");

    const status: GmapsJobStatus = await getGmapsJobStatus(config, data.jobId);
    if (status === "failed") return { status, found: 0, inserted: 0, updated: 0 };
    if (status !== "ok") return { status, found: 0, inserted: 0, updated: 0 };

    const csv = await downloadGmapsJobCsv(config, data.jobId);
    const places = mapGmapsCsvToPlaces(csv, data.city, (data.state || "").toUpperCase());
    if (places.length === 0) return { status, found: 0, inserted: 0, updated: 0 };

    const result = await harvestAndPersistPlaces({
      query: data.query,
      city: data.city,
      state: data.state,
      prefetchedPlaces: places,
    });
    return {
      status,
      found: result.totalFound,
      inserted: result.totalInserted,
      updated: result.totalUpdated,
      error: result.error,
    };
  });
