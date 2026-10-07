import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "src/services/storage.functions.ts"), "utf8");
const universal = source.slice(source.indexOf("export const uploadMediaUniversal"), source.indexOf("export const uploadBrandAsset"));

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

  it("re-emite download curto somente para namespace da loja ou usuário", () => {
    expect(source).toContain("getSignedMediaDownloadUrl");
    expect(source).toContain("createSignedUrl(data.path, data.expiresInSeconds)");
    expect(source).toContain("data.path.startsWith(`${namespace}/`)");
    expect(source).toContain("Acesso negado ao objeto de mídia.");
    expect(source).toContain("expiresInSeconds: z.number().int().min(60).max(3600)");
  });
});
