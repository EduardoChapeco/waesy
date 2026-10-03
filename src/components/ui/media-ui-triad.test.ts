import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Milestone M1 Challenger — Media UI Triad & Unsplash Purge Verification", () => {
  describe("1. Adversarial URL Ingestion & Protocol Validation", () => {
    // Regex logic replicated from media-uploader.tsx and image-upload.tsx
    const isValidHttpUrl = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return false;
      return /^https?:\/\//i.test(trimmed);
    };

    it("rejects malicious javascript: pseudo-protocols", () => {
      expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
      expect(isValidHttpUrl("javascript://alert(1)")).toBe(false);
      expect(isValidHttpUrl("JAVASCRIPT:void(0)")).toBe(false);
    });

    it("rejects non-HTTP protocols (ftp, file, mailto, data)", () => {
      expect(isValidHttpUrl("ftp://files.example.com/photo.png")).toBe(false);
      expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
      expect(isValidHttpUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe(false);
      expect(isValidHttpUrl("mailto:user@example.com")).toBe(false);
    });

    it("rejects empty, blank and whitespace-only strings", () => {
      expect(isValidHttpUrl("")).toBe(false);
      expect(isValidHttpUrl("   ")).toBe(false);
      expect(isValidHttpUrl("\n\t")).toBe(false);
    });

    it("accepts valid secure HTTPS and HTTP image URLs", () => {
      expect(isValidHttpUrl("https://storage.waesy.com/post-media/photo.webp")).toBe(true);
      expect(isValidHttpUrl("http://cdn.example.org/image.png?v=123")).toBe(true);
      expect(isValidHttpUrl("HTTPS://IMAGES.EXAMPLE.COM/PHOTO.JPG")).toBe(true);
    });
  });

  describe("2. Unsplash & Mock Purge Invariants in Source Files", () => {
    const rootDir = process.cwd();

    it("ensures proposals.ts contains NO leaked Unsplash Client-ID token", () => {
      const proposalsPath = path.resolve(rootDir, "src/services/proposals.ts");
      const content = fs.readFileSync(proposalsPath, "utf8");
      expect(content).not.toContain("vK-9626D2bE9m4eE40eK47nU89X9Q_v88jX2o4wU07E");
      expect(content).not.toContain("api.unsplash.com");
      expect(content).not.toContain("searchUnsplash");
    });

    it("ensures proposal-storage.ts contains NO saveUnsplashImageToStorage function", () => {
      const storagePath = path.resolve(rootDir, "src/services/proposal-storage.ts");
      const content = fs.readFileSync(storagePath, "utf8");
      expect(content).not.toContain("saveUnsplashImageToStorage");
    });

    it("ensures MediaUploader.tsx contains NO placehold.co mock fallbacks", () => {
      const mediaUploaderPath = path.resolve(rootDir, "src/components/admin/builder/MediaUploader.tsx");
      const content = fs.readFileSync(mediaUploaderPath, "utf8");
      expect(content).not.toContain("placehold.co");
    });

    it("ensures media-uploader.tsx and image-upload.tsx contain Media Triad features (URL + Ctrl+V + Upload)", () => {
      const mediaUploader = fs.readFileSync(path.resolve(rootDir, "src/components/ui/media-uploader.tsx"), "utf8");
      const imageUpload = fs.readFileSync(path.resolve(rootDir, "src/components/ui/image-upload.tsx"), "utf8");

      // Verifies onPaste listener
      expect(mediaUploader).toContain("onPaste={handlePaste}");
      expect(imageUpload).toContain("onPaste={handlePaste}");

      // Verifies extractMediaFromClipboard import
      expect(mediaUploader).toContain("extractMediaFromClipboard");
      expect(imageUpload).toContain("extractMediaFromClipboard");

      // Verifies external URL drawer
      expect(mediaUploader).toContain("showExternalUrlOption");
      expect(imageUpload).toContain("showExternalUrlOption");

      // Verifies 44px mobile touch targets
      expect(mediaUploader).toContain("min-h-11");
      expect(imageUpload).toContain("min-h-11");
    });
  });

  describe("3. Design Lint Verification of Touched Components", () => {
    it("verifies media-uploader.tsx and image-upload.tsx pass design-lint with 0 P0 and 0 P1", async () => {
      const { lintSource } = await import(path.resolve(process.cwd(), "scripts/design-lint.mjs") as string);
      
      const mediaUploaderContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/ui/media-uploader.tsx"),
        "utf8"
      );
      const mediaUploaderViolations = lintSource(mediaUploaderContent, "src/components/ui/media-uploader.tsx")
        .filter((v: any) => v.severity === "P0" || v.severity === "P1");
      expect(mediaUploaderViolations).toEqual([]);

      const imageUploadContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/ui/image-upload.tsx"),
        "utf8"
      );
      const imageUploadViolations = lintSource(imageUploadContent, "src/components/ui/image-upload.tsx")
        .filter((v: any) => v.severity === "P0" || v.severity === "P1");
      expect(imageUploadViolations).toEqual([]);

      const studioPickerContent = fs.readFileSync(
        path.resolve(process.cwd(), "src/components/tourism/studio/StudioUnsplashPicker.tsx"),
        "utf8"
      );
      const studioPickerViolations = lintSource(studioPickerContent, "src/components/tourism/studio/StudioUnsplashPicker.tsx")
        .filter((v: any) => v.severity === "P0" || v.severity === "P1");
      expect(studioPickerViolations).toEqual([]);
    });
  });
});
