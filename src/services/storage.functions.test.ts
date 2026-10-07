import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/storage.functions.ts"), "utf8");
const universal = source.slice(source.indexOf("export const uploadMediaUniversal"), source.indexOf("export const uploadBrandAsset"));
const studioMigration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20270114020000_studio_upload_asset_rights_ledger.sql"), "utf8");

describe("Storage de mídia — W9.2", () => {
  it("valida MIME e limite de bytes antes de persistir", () => {
    expect(universal).toContain("assertAllowedBffBucket(bucket)");
    expect(universal).toContain("validateMimeType(fileType)");
    expect(universal).toContain("decodeInlineUpload(base64Data)");
    expect(source).toContain("MAX_INLINE_UPLOAD_BYTES");
  });

  it("usa namespace da loja/usuário e não aceita overwrite", () => {
    expect(universal).toContain("const tenantNamespace = identity.store_id || identity.id");
    expect(universal).toContain("const uniqueName = `${tenantNamespace}/${folder}/${cleanName}`");
    expect(universal).toContain("upsert: false");
    expect(universal).toContain("assertSafeFolder(folder)");
  });

  it("retorna hash, dimensões e URL assinada com expiração", () => {
    expect(universal).toContain('createHash("sha256").update(buffer).digest("hex")');
    expect(universal).toContain("inspectImageDimensions(buffer, normalizedType)");
    expect(universal).toContain("createSignedUrl(uniqueName, 60 * 60)");
    expect(universal).toContain("sha256,");
    expect(universal).toContain("expiresInSeconds: 60 * 60");
  });

  it("não deriva extensão confiável do nome fornecido pelo usuário", () => {
    expect(universal).toContain("const ext = extensionForMime(normalizedType)");
    expect(universal).not.toContain('fileName.split(".").pop()?.toLowerCase()');
  });

  it("exige attestation explícita e usa URL durável somente no caminho Studio isolado", () => {
    expect(universal).toContain("rightsAttested: z.literal(true)");
    expect(universal).toContain("studioAsset ? await requireAdmin() : await getServerIdentity()");
    expect(universal).toContain('bucket !== "public_media" || folder !== "builder"');
    expect(universal).toContain('getPublicUrl(uniqueName)');
    expect(universal).toContain('.from("media_assets")');
    expect(universal).toContain("rights_attested_by: identity.id");
    expect(universal).toContain("source_url: url");
    expect(universal).toContain("if (studioUploadPath && storageClient)");
    expect(universal).toContain('storageClient.from("media_assets").delete().eq("id", studioLedgerId)');
  });

  it("confere assinatura dos formatos raster permitidos no upload Studio", () => {
    expect(universal).toContain('"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"');
    expect(universal).toContain("O conteúdo do arquivo não corresponde ao tipo de imagem declarado.");
    expect(universal).toContain("SVG não é aceito sem sanitização.");
  });

  it("corrige RLS de media_assets por usuário/loja sem repetir a policy LIMIT 1", () => {
    expect(studioMigration).toContain("ALTER TABLE public.media_assets");
    expect(studioMigration).toContain("p.id = auth.uid()");
    expect(studioMigration).toContain("p.store_id = media_assets.store_id");
    expect(studioMigration).toContain("studio_usage_slot IS NOT NULL");
    expect(studioMigration).toContain("FOR INSERT TO anon, authenticated WITH CHECK (false)");
    expect(studioMigration).not.toMatch(/SELECT\s+id\s+FROM\s+public\.stores\s+LIMIT\s+1/i);
  });

  it("re-emite download curto somente para namespace da loja ou usuário", () => {
    expect(source).toContain("getSignedMediaDownloadUrl");
    expect(source).toContain("createSignedUrl(data.path, data.expiresInSeconds)");
    expect(source).toContain("data.path.startsWith(`${namespace}/`)");
    expect(source).toContain("Acesso negado ao objeto de mídia.");
    expect(source).toContain("expiresInSeconds: z.number().int().min(60).max(3600)");
  });
});
