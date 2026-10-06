import { z } from "zod";

export const BUILDER_ASSET_PROVIDERS = [
  "unsplash",
  "upload",
  "generated",
  "user",
  "stock",
  "unknown",
] as const;

export const BUILDER_ASSET_PROVENANCE_STATES = [
  "verified",
  "provider-reported",
  "user-provided",
  "system-derived",
  "unknown",
] as const;

export const BuilderAssetCropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
  focalPointX: z.number().min(0).max(1).nullable().optional(),
  focalPointY: z.number().min(0).max(1).nullable().optional(),
  aspectRatio: z.string().min(3).max(16).optional(),
});

export const BuilderAssetRefSchema = z.object({
  asset_id: z.string().min(1),
  provider: z.enum(BUILDER_ASSET_PROVIDERS).default("unknown"),
  source_asset_id: z.string().nullable().optional(),
  source_url: z.string().url().nullable().optional(),
  source_page_url: z.string().url().nullable().optional(),
  creator: z.string().nullable().optional(),
  attribution_text: z.string().nullable().optional(),
  license_url: z.string().url().nullable().optional(),
  byte_size: z.number().int().nonnegative().nullable().optional(),
  mime_type: z.string().max(128).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  provenance_state: z.enum(BUILDER_ASSET_PROVENANCE_STATES).default("unknown"),
  crop: BuilderAssetCropSchema.nullable().optional(),
  derived_from_asset_id: z.string().nullable().optional(),
  captured_at: z.string().datetime().nullable().optional(),
  usage_notes: z.string().max(1000).nullable().optional(),
});

export type BuilderAssetCrop = z.infer<typeof BuilderAssetCropSchema>;
export type BuilderAssetRef = z.infer<typeof BuilderAssetRefSchema>;

/**
 * Conservador por desenho: referências sem origem não são tratadas como prontas
 * para publicação e nenhum dado de autoria/licença é preenchido por inferência.
 */
export function isAssetPublicationReady(asset: BuilderAssetRef): boolean {
  if (asset.provenance_state === "unknown") return false;
  if (asset.provider === "unsplash") {
    return Boolean(asset.source_url && asset.source_page_url && asset.creator && asset.attribution_text);
  }
  if (asset.provider === "stock") {
    return Boolean(asset.source_url && asset.source_page_url && asset.creator && asset.license_url);
  }
  if (asset.provider === "upload" || asset.provider === "user") {
    return asset.provenance_state === "user-provided" || asset.provenance_state === "verified";
  }
  if (asset.provider === "generated") {
    return asset.provenance_state === "system-derived" || asset.provenance_state === "verified";
  }
  return Boolean(asset.source_url && asset.license_url && asset.creator);
}
