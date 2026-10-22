import { describe, it, expect, vi } from "vitest";
import { resolveStorageMediaUrl } from "./storage-media";

vi.mock("@/lib/supabase", () => ({
  getBrowserClient: () => ({
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: {
            publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}`,
          },
        }),
      }),
    },
  }),
}));

describe("resolveStorageMediaUrl", () => {
  it("returns empty string for null, undefined, or empty string", () => {
    expect(resolveStorageMediaUrl(null)).toBe("");
    expect(resolveStorageMediaUrl(undefined)).toBe("");
    expect(resolveStorageMediaUrl("   ")).toBe("");
  });

  it("leaves https and http URLs untouched", () => {
    expect(resolveStorageMediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(resolveStorageMediaUrl("http://example.com/banner.png")).toBe("http://example.com/banner.png");
  });

  it("leaves blob: and data: URLs untouched", () => {
    expect(resolveStorageMediaUrl("blob:http://localhost/abc")).toBe("blob:http://localhost/abc");
    expect(resolveStorageMediaUrl("data:image/png;base64,123")).toBe("data:image/png;base64,123");
  });

  it("resolves relative path without bucket to defaultBucket", () => {
    const url = resolveStorageMediaUrl("uploads/my-pic.jpg", "post-media");
    expect(url).toBe("https://test.supabase.co/storage/v1/object/public/post-media/uploads/my-pic.jpg");
  });

  it("strips redundant leading slash", () => {
    const url = resolveStorageMediaUrl("/classifieds/event-hero.jpg");
    expect(url).toBe("https://test.supabase.co/storage/v1/object/public/classifieds/event-hero.jpg");
  });

  it("detects and avoids duplicating known bucket name prefix", () => {
    const url = resolveStorageMediaUrl("post-media/classifieds/photo.webp", "post-media");
    expect(url).toBe("https://test.supabase.co/storage/v1/object/public/post-media/classifieds/photo.webp");
    expect(url).not.toContain("post-media/post-media");
  });

  it("correctly identifies custom known bucket from path prefix", () => {
    const url = resolveStorageMediaUrl("banners/2026/promo.jpg");
    expect(url).toBe("https://test.supabase.co/storage/v1/object/public/banners/2026/promo.jpg");
  });
});
