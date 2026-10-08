import { z } from "zod";
import type { BuilderAssetRef } from "./asset-contract";

const UnsplashIdSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const HttpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:");

const UnsplashPhotoResponseSchema = z.object({
  id: UnsplashIdSchema,
  alt_description: z.string().max(500).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  urls: z.object({
    small: HttpsUrlSchema,
    regular: HttpsUrlSchema,
    thumb: HttpsUrlSchema.optional(),
  }),
  links: z.object({
    html: HttpsUrlSchema,
    download_location: HttpsUrlSchema,
  }),
  user: z.object({
    name: z.string().trim().min(1).max(160),
    username: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
    links: z.object({ html: HttpsUrlSchema }),
  }),
}).passthrough();

const UnsplashSearchResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  results: z.array(UnsplashPhotoResponseSchema).max(30),
}).passthrough();

export interface UnsplashPhotoForStudio {
  id: string;
  description: string | null;
  altText: string;
  color: string | null;
  width: number;
  height: number;
  smallUrl: string;
  imageUrl: string;
  photoPageUrl: string;
  creator: string;
  creatorUsername: string;
  creatorProfileUrl: string;
  downloadLocation: string;
}

export interface UnsplashSearchResult {
  total: number;
  totalPages: number;
  results: UnsplashPhotoForStudio[];
}

export interface UnsplashFetchOptions {
  accessKey: string;
  appName?: string;
  fetchImpl?: typeof fetch;
}

function assertUnsplashImageUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com" || url.username || url.password) {
    throw new Error("A API retornou uma URL de imagem fora da origem oficial esperada.");
  }
  return url.toString();
}

function addReferral(urlValue: string, appName: string): string {
  const url = new URL(urlValue);
  if (url.protocol !== "https:" || url.hostname !== "unsplash.com" || url.username || url.password) {
    throw new Error("A API retornou um link de atribuição fora do domínio Unsplash.");
  }
  url.searchParams.set("utm_source", appName);
  url.searchParams.set("utm_medium", "referral");
  return url.toString();
}

function normalizePhoto(raw: unknown, appName: string): UnsplashPhotoForStudio {
  const photo = UnsplashPhotoResponseSchema.parse(raw);
  const photoPageUrl = addReferral(photo.links.html, appName);
  const creatorProfileUrl = addReferral(photo.user.links.html, appName);
  return {
    id: photo.id,
    description: photo.description ?? null,
    altText: photo.alt_description?.trim() ?? "",
    color: photo.color ?? null,
    width: photo.width,
    height: photo.height,
    smallUrl: assertUnsplashImageUrl(photo.urls.small),
    imageUrl: assertUnsplashImageUrl(photo.urls.regular),
    photoPageUrl,
    creator: photo.user.name,
    creatorUsername: photo.user.username,
    creatorProfileUrl,
    downloadLocation: validateUnsplashDownloadLocation(photo.links.download_location, photo.id),
  };
}

export async function searchUnsplashForStudio(
  input: { query: string; page?: number; perPage?: number; orientation?: "landscape" | "portrait" | "squarish" },
  options: UnsplashFetchOptions,
): Promise<UnsplashSearchResult> {
  const query = input.query.trim();
  if (query.length < 2 || query.length > 100) throw new Error("A busca precisa ter entre 2 e 100 caracteres.");
  const page = Math.min(20, Math.max(1, Math.trunc(input.page ?? 1)));
  const perPage = Math.min(20, Math.max(1, Math.trunc(input.perPage ?? 12)));
  const appName = (options.appName ?? "waesy").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "waesy";
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("content_filter", "high");
  if (input.orientation) url.searchParams.set("orientation", input.orientation);

  const response = await (options.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: { Authorization: `Client-ID ${options.accessKey}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 429) throw new Error("Limite de buscas da Unsplash atingido. Aguarde antes de tentar novamente.");
  if (!response.ok) throw new Error(`Busca Unsplash indisponível (HTTP ${response.status}).`);

  const parsed = UnsplashSearchResponseSchema.parse(await response.json());
  return {
    total: parsed.total,
    totalPages: Math.min(parsed.total_pages, 20),
    results: parsed.results.map((photo) => normalizePhoto(photo, appName)),
  };
}

export async function getUnsplashPhotoForStudio(
  photoId: string,
  options: UnsplashFetchOptions,
): Promise<UnsplashPhotoForStudio> {
  const id = UnsplashIdSchema.parse(photoId);
  const appName = (options.appName ?? "waesy").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "waesy";
  const url = new URL(`https://api.unsplash.com/photos/${encodeURIComponent(id)}`);
  const response = await (options.fetchImpl ?? fetch)(url, {
    method: "GET",
    headers: { Authorization: `Client-ID ${options.accessKey}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 429) throw new Error("Limite Unsplash atingido ao validar a foto. Tente novamente.");
  if (!response.ok) throw new Error(`Validação da foto Unsplash indisponível (HTTP ${response.status}).`);
  return normalizePhoto(await response.json(), appName);
}

export function validateUnsplashDownloadLocation(downloadLocation: string, photoId: string): string {
  const id = UnsplashIdSchema.parse(photoId);
  const url = new URL(downloadLocation);
  const expectedPath = `/photos/${id}/download`;
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.unsplash.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== expectedPath ||
    url.hash !== ""
  ) {
    throw new Error("Endpoint de tracking não corresponde à foto Unsplash selecionada.");
  }
  for (const key of url.searchParams.keys()) {
    if (/token|secret|client_id|authorization|redirect/i.test(key)) {
      throw new Error("Parâmetro de autenticação não é aceito no link de tracking.");
    }
  }
  return url.toString();
}

export async function trackUnsplashPhotoSelection(
  input: { photoId: string; downloadLocation: string },
  options: UnsplashFetchOptions,
): Promise<UnsplashPhotoForStudio> {
  const clientLocation = new URL(validateUnsplashDownloadLocation(input.downloadLocation, input.photoId));
  const photo = await getUnsplashPhotoForStudio(input.photoId, options);
  const authoritativeLocation = new URL(photo.downloadLocation);
  if (clientLocation.origin !== authoritativeLocation.origin || clientLocation.pathname !== authoritativeLocation.pathname) {
    throw new Error("A URL de tracking não corresponde à metadata oficial da foto selecionada.");
  }
  const response = await (options.fetchImpl ?? fetch)(photo.downloadLocation, {
    method: "GET",
    headers: { Authorization: `Client-ID ${options.accessKey}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 429) throw new Error("O evento de seleção Unsplash foi limitado. Tente usar a imagem novamente.");
  if (!response.ok) throw new Error(`Não foi possível registrar a seleção da foto Unsplash (HTTP ${response.status}).`);
  return photo;
}

export interface UnsplashSelectionLedgerRecord {
  photo_id: string;
  usage_slot: string;
  image_url: string;
  photo_page_url: string;
  creator_name: string;
  creator_profile_url: string;
  license_id: string;
  license_url: string;
}

function sameHttpsResource(candidate: string | null | undefined, authoritative: string, expectedHost: string): boolean {
  if (!candidate) return false;
  try {
    const provided = new URL(candidate);
    const verified = new URL(authoritative);
    return provided.protocol === "https:" && provided.hostname === expectedHost && !provided.username && !provided.password &&
      verified.protocol === "https:" && verified.hostname === expectedHost && provided.pathname === verified.pathname;
  } catch {
    return false;
  }
}

/** A publicação só aceita provenance Unsplash previamente gravada pelo endpoint servidor. */
export function matchesUnsplashSelectionLedger(
  asset: BuilderAssetRef,
  record: UnsplashSelectionLedgerRecord,
): boolean {
  return asset.provider === "unsplash" && asset.provenance_state === "provider-reported" &&
    asset.download_event_status === "tracked" && asset.source_asset_id === record.photo_id &&
    asset.usage_slot === record.usage_slot && asset.asset_id === `unsplash:${record.photo_id}:${record.usage_slot}` &&
    asset.creator === record.creator_name && asset.license_id === record.license_id &&
    asset.license_url === record.license_url &&
    sameHttpsResource(asset.source_url, record.image_url, "images.unsplash.com") &&
    sameHttpsResource(asset.source_page_url, record.photo_page_url, "unsplash.com") &&
    sameHttpsResource(asset.creator_profile_url, record.creator_profile_url, "unsplash.com");
}

export function createUnsplashAssetRef(
  photo: UnsplashPhotoForStudio,
  options: { usageSlot: string; downloadEventStatus: "tracked" | "failed"; selectedAt?: string },
): BuilderAssetRef {
  return {
    asset_id: `unsplash:${photo.id}:${options.usageSlot}`,
    provider: "unsplash",
    source_asset_id: photo.id,
    source_url: photo.imageUrl,
    source_page_url: photo.photoPageUrl,
    creator: photo.creator,
    creator_profile_url: photo.creatorProfileUrl,
    attribution_text: `Foto por ${photo.creator} no Unsplash`,
    license_url: "https://unsplash.com/license",
    license_id: "unsplash-license",
    provenance_state: "provider-reported",
    usage_slot: options.usageSlot,
    alt_text: photo.altText,
    width: photo.width,
    height: photo.height,
    mime_type: "image/jpeg",
    captured_at: options.selectedAt ?? new Date().toISOString(),
    download_event_status: options.downloadEventStatus,
    usage_notes: "Imagem selecionada manualmente no editor Waesy; attribution/links usam referral UTM. Metadados do provedor não equivalem a parecer jurídico.",
  };
}

export const UNSPLASH_LICENSE_URL = "https://unsplash.com/license";
