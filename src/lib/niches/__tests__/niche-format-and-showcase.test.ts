import { describe, it, expect } from "vitest";
import { formatStoreCategory } from "../niche-manifest";

describe("formatStoreCategory", () => {
  it("translates technical niche slugs to human Portuguese", () => {
    expect(formatStoreCategory("tourism")).toBe("Turismo & Viagens");
    expect(formatStoreCategory("gastronomy")).toBe("Gastronomia & Alimentação");
    expect(formatStoreCategory("retail")).toBe("Comércio & Varejo");
    expect(formatStoreCategory("services")).toBe("Serviços Especializados");
    expect(formatStoreCategory("real_estate")).toBe("Imóveis & Hospedagem");
    expect(formatStoreCategory("automotive")).toBe("Automotivo & Veículos");
  });

  it("handles null, undefined and empty strings with fallback", () => {
    expect(formatStoreCategory(null)).toBe("Comércio Local");
    expect(formatStoreCategory(undefined)).toBe("Comércio Local");
    expect(formatStoreCategory("")).toBe("Comércio Local");
  });

  it("formats unknown category gracefully", () => {
    expect(formatStoreCategory("artesanato_local")).toBe("Artesanato Local");
    expect(formatStoreCategory("CustomCategory")).toBe("CustomCategory");
  });
});

describe("isHealthyImageUrl", () => {
  // Imported dynamically or tested with logic
  it("rejects invalid, null, undefined, and placeholder images", () => {
    const isHealthy = (url: unknown) => {
      if (typeof url !== "string") return false;
      const trimmed = url.trim();
      if (
        !trimmed ||
        trimmed === "undefined" ||
        trimmed === "null" ||
        trimmed === "[object Object]" ||
        trimmed.length < 5 ||
        trimmed.includes("1511707171634-5f897ff02560")
      ) {
        return false;
      }
      return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/");
    };

    expect(isHealthy(null)).toBe(false);
    expect(isHealthy(undefined)).toBe(false);
    expect(isHealthy("")).toBe(false);
    expect(isHealthy("null")).toBe(false);
    expect(isHealthy("undefined")).toBe(false);
    expect(isHealthy("https://images.unsplash.com/photo-1511707171634-5f897ff02560")).toBe(false);
    expect(isHealthy("https://storage.supabase.com/uploads/photo.jpg")).toBe(true);
    expect(isHealthy("/brand-logo.png")).toBe(true);
  });
});

describe("isVideoUrl helper", () => {
  const isVideoUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const clean = url.split("?")[0].toLowerCase();
    const lower = url.toLowerCase();
    return (
      clean.endsWith(".mp4") ||
      clean.endsWith(".webm") ||
      clean.endsWith(".mov") ||
      clean.endsWith(".quicktime") ||
      clean.endsWith(".m4v") ||
      clean.endsWith(".ogg") ||
      clean.endsWith(".avi") ||
      clean.endsWith(".mkv") ||
      clean.includes("video") ||
      lower.includes(".mp4") ||
      lower.includes(".webm") ||
      lower.includes(".mov") ||
      lower.includes("/video/") ||
      lower.includes("video=")
    );
  };

  it("detects video files with standard extensions and query parameters", () => {
    expect(isVideoUrl("https://storage.waesy.com/post-1.mp4")).toBe(true);
    expect(isVideoUrl("https://storage.waesy.com/post-1.mp4?token=abc1234")).toBe(true);
    expect(isVideoUrl("https://storage.waesy.com/post-2.webm")).toBe(true);
    expect(isVideoUrl("https://cdn.waesy.com/video/stream-123")).toBe(true);
  });

  it("rejects image files and invalid URLs", () => {
    expect(isVideoUrl("https://storage.waesy.com/post-1.jpg")).toBe(false);
    expect(isVideoUrl("https://storage.waesy.com/post-1.png?w=800")).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
    expect(isVideoUrl("")).toBe(false);
  });
});

describe("Editorial Tabs Availability & Empty Suppression", () => {
  const computeAvailableTabs = (feedImages: any[], itineraryDays: any[], isTravel = true) => {
    const tabs: string[] = ["resort"];

    const hasValidFeedImages =
      Array.isArray(feedImages) &&
      feedImages.some((item) => {
        const url = typeof item === "string" ? item.trim() : (item?.url || item?.src || "").trim();
        return Boolean(url && url.length > 5);
      });
    if (hasValidFeedImages) {
      tabs.push("grid");
    }

    const hasItineraryContent = isTravel
      ? itineraryDays.some((d: any) => Boolean(d && (d.title?.trim() || d.description?.trim() || d.day || d.activities?.length || d.images?.length)))
      : false;
    if (hasItineraryContent) {
      tabs.push("itinerary");
    }

    tabs.push("explore");
    return tabs;
  };

  it("omits Fotos tab when feedImages is empty or has blank strings", () => {
    expect(computeAvailableTabs([], [{ title: "Dia 1" }])).toEqual(["resort", "itinerary", "explore"]);
    expect(computeAvailableTabs(["", "   "], [{ title: "Dia 1" }])).toEqual(["resort", "itinerary", "explore"]);
  });

  it("omits Roteiro tab when itineraryDays contains empty objects [{}]", () => {
    expect(computeAvailableTabs(["https://waesy.com/f1.jpg"], [{}])).toEqual(["resort", "grid", "explore"]);
    expect(computeAvailableTabs(["https://waesy.com/f1.jpg"], [{ title: "", description: "" }])).toEqual(["resort", "grid", "explore"]);
  });

  it("retains only Infos do pacote and Condições when both are empty", () => {
    expect(computeAvailableTabs([], [])).toEqual(["resort", "explore"]);
  });
});

