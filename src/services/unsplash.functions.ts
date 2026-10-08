import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import {
  searchUnsplashForStudio,
  trackUnsplashPhotoSelection,
} from "@/lib/builder/unsplash-api";

const SearchInputSchema = z.object({
  query: z.string().trim().min(2).max(100),
  page: z.number().int().min(1).max(20).optional(),
  perPage: z.number().int().min(1).max(20).optional(),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
}).strict();

const SelectionInputSchema = z.object({
  photoId: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  downloadLocation: z.string().url().max(2048),
  usageSlot: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

const searchLimits = new Map<string, { start: number; count: number }>();
function assertSearchLimit(key: string) {
  const now = Date.now();
  const current = searchLimits.get(key);
  if (!current || now - current.start >= 60_000) {
    searchLimits.set(key, { start: now, count: 1 });
    return;
  }
  if (current.count >= 20) throw new Error("Limite temporário de busca atingido (20 por minuto). Aguarde e tente novamente.");
  current.count += 1;
  if (searchLimits.size > 500) {
    for (const [entryKey, entry] of searchLimits) {
      if (now - entry.start >= 60_000) searchLimits.delete(entryKey);
      if (searchLimits.size <= 400) break;
    }
  }
}

function getUnsplashAccessKey(): string {
  const key = typeof process !== "undefined" ? process.env.UNSPLASH_ACCESS_KEY?.trim() : "";
  if (!key) throw new Error("Busca Unsplash desativada: configure UNSPLASH_ACCESS_KEY como secret privado do servidor.");
  return key;
}

function getUnsplashAppName(): string {
  const raw = typeof process !== "undefined" ? process.env.UNSPLASH_APP_NAME?.trim() : "";
  return raw || "waesy";
}

export const getUnsplashStudioStatus = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await requireAdmin();
  if (!identity.store_id) throw new Error("Loja ativa não identificada.");
  const configured = Boolean(typeof process !== "undefined" && process.env.UNSPLASH_ACCESS_KEY?.trim());
  return {
    configured,
    provider: "unsplash" as const,
    attributionRequired: true as const,
    hotlinkingRequired: true as const,
    humanSelectionRequired: true as const,
  };
});

export const searchUnsplashStudioPhotos = createServerFn({ method: "GET" })
  .validator(SearchInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireAdmin();
    if (!identity.store_id) throw new Error("Loja ativa não identificada.");
    assertSearchLimit(`${identity.store_id}:${identity.id}`);
    const accessKey = getUnsplashAccessKey();
    try {
      return await searchUnsplashForStudio(data, {
        accessKey,
        appName: getUnsplashAppName(),
      });
    } catch (error) {
      console.error("[waesy-unsplash] search failed:", error instanceof Error ? error.message : "unknown error");
      throw new Error(error instanceof Error ? error.message : "Busca Unsplash indisponível.");
    }
  });

export const trackUnsplashStudioSelection = createServerFn({ method: "POST" })
  .validator(SelectionInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireAdmin();
    if (!identity.store_id) throw new Error("Loja ativa não identificada.");
    const accessKey = getUnsplashAccessKey();
    try {
      const photo = await trackUnsplashPhotoSelection(data, { accessKey, appName: getUnsplashAppName() });
      const { error } = await getServerClient().from("unsplash_studio_selections").upsert({
        store_id: identity.store_id,
        photo_id: photo.id,
        usage_slot: data.usageSlot,
        image_url: photo.imageUrl,
        photo_page_url: photo.photoPageUrl,
        creator_name: photo.creator,
        creator_profile_url: photo.creatorProfileUrl,
        license_id: "unsplash-license",
        license_url: "https://unsplash.com/license",
        selected_by: identity.id,
        tracked_at: new Date().toISOString(),
      }, { onConflict: "store_id,photo_id,usage_slot" });
      if (error) throw new Error(`Evento Unsplash rastreado, mas não foi possível persistir a proveniência: ${error.message}`);
      return { status: "tracked" as const, photoId: photo.id };
    } catch (error) {
      console.error("[waesy-unsplash] selection tracking failed:", error instanceof Error ? error.message : "unknown error");
      throw new Error(error instanceof Error ? error.message : "Não foi possível registrar a seleção Unsplash.");
    }
  });
