import { describe, expect, it } from "vitest";
import { hasActiveClassifiedMediaUpload } from "@/lib/classifieds/media-state";

describe("hasActiveClassifiedMediaUpload", () => {
  it("bloqueia enquanto o upload Hero estiver ativo", () => {
    expect(hasActiveClassifiedMediaUpload(true, false)).toBe(true);
  });

  it("bloqueia enquanto o upload Feed estiver ativo", () => {
    expect(hasActiveClassifiedMediaUpload(false, true)).toBe(true);
  });

  it("libera somente quando as duas galerias terminaram", () => {
    expect(hasActiveClassifiedMediaUpload(false, false)).toBe(false);
    expect(hasActiveClassifiedMediaUpload(true, true)).toBe(true);
  });
});
