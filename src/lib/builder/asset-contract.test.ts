import { describe, expect, it } from "vitest";
import {
  isAssetPublicationReady,
  matchesStudioUploadAssetLedger,
  STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION,
  type BuilderAssetRef,
  type StudioUploadAssetLedgerRecord,
} from "./asset-contract";

const timestamp = "2026-10-07T20:00:00.000Z";
const storeId = "8b214272-9e58-4e5a-a3c4-082ecf93a7cc";
const assetId = "ae779eea-43df-4ad3-9174-bc8aeb6b5d20";
const filePath = `${storeId}/builder/1728321600000_image.webp`;
const publicUrl = `https://project.supabase.co/storage/v1/object/public/public_media/${filePath}`;

const asset = (overrides: Partial<BuilderAssetRef> = {}): BuilderAssetRef => ({
  asset_id: assetId,
  provider: "upload",
  source_asset_id: filePath,
  source_url: publicUrl,
  license_id: "user-rights-attestation",
  usage_slot: "hero-ambience",
  download_event_status: "not-required",
  byte_size: 8192,
  mime_type: "image/webp",
  width: 1600,
  height: 900,
  provenance_state: "user-provided",
  captured_at: timestamp,
  rights_attested_at: timestamp,
  rights_attestation_version: STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION,
  ...overrides,
});

const ledgerRow = (overrides: Partial<StudioUploadAssetLedgerRecord> = {}): StudioUploadAssetLedgerRecord => ({
  id: assetId,
  store_id: storeId,
  bucket_name: "public_media",
  file_path: filePath,
  public_url: publicUrl,
  mime_type: "image/webp",
  studio_usage_slot: "hero-ambience",
  rights_attested_at: "2026-10-07T20:00:00+00:00",
  rights_attested_by: "2d6ad3c7-9c34-4e59-9c35-b801ea4864bd",
  rights_attestation_version: STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION,
  ...overrides,
});

describe("Studio uploaded asset provenance", () => {
  it("accepts a complete user-rights declaration as publication-ready metadata", () => {
    expect(isAssetPublicationReady(asset())).toBe(true);
  });

  it("matches the AST reference to the exact tenant-scoped public media ledger row", () => {
    expect(matchesStudioUploadAssetLedger(asset(), ledgerRow(), storeId)).toBe(true);
  });

  it.each([
    ["tenant", { store_id: "another-store" }],
    ["asset ID", { id: "another-asset" }],
    ["bucket", { bucket_name: "store-assets" }],
    ["path", { file_path: "another-store/builder/image.webp" }],
    ["slot", { studio_usage_slot: "gallery-1" }],
    ["attestation actor", { rights_attested_by: null }],
    ["attestation version", { rights_attestation_version: "old-version" }],
    ["MIME type", { mime_type: "text/html" }],
  ] as const)("rejects mismatched ledger %s", (_label, override) => {
    expect(matchesStudioUploadAssetLedger(asset(), ledgerRow(override), storeId)).toBe(false);
  });

  it("rejects an altered AST URL, timestamp, or attestation version", () => {
    expect(matchesStudioUploadAssetLedger(asset({ source_url: "https://attacker.test/image.webp" }), ledgerRow(), storeId)).toBe(false);
    expect(matchesStudioUploadAssetLedger(asset({ rights_attested_at: "2026-10-07T20:00:01.000Z" }), ledgerRow(), storeId)).toBe(false);
    expect(matchesStudioUploadAssetLedger(asset({ rights_attestation_version: "unknown" }), ledgerRow(), storeId)).toBe(false);
  });

  it("does not consider incomplete or forged upload metadata publication-ready", () => {
    expect(isAssetPublicationReady(asset({ rights_attested_at: null }))).toBe(false);
    expect(isAssetPublicationReady(asset({ provenance_state: "unknown" }))).toBe(false);
    expect(isAssetPublicationReady(asset({ source_url: "http://project.supabase.co/image.webp" }))).toBe(false);
  });
});
