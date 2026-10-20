import { describe, it, expect } from "vitest";
import { resolveCityNewsCover } from "./city-editorial-images";

describe("city-editorial-images resolver (Zero Synthetic Fallbacks - Invariante B.33)", () => {
  it("preserves authentic cover URLs from original sources", () => {
    const validUrl = "https://portaldesaojose.com.br/fotos/noticia-123.jpg";
    const res = resolveCityNewsCover({
      coverUrl: validUrl,
      city: "Chapecó",
      category: "economia",
    });
    expect(res).toBe(validUrl);
  });

  it("returns null when cover is missing to allow honest typographic card layout", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: "São Miguel do Oeste",
      state: "SC",
      category: "geral",
    });
    expect(res).toBeNull();
  });

  it("returns null for empty coverUrl string", () => {
    const res = resolveCityNewsCover({
      coverUrl: "",
      city: "Chapecó",
      state: "SC",
    });
    expect(res).toBeNull();
  });

  it("sanitizes synthetic Unsplash stock images to null (Anti-Stock Photo Policy)", () => {
    const res = resolveCityNewsCover({
      coverUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      city: "São Miguel do Oeste",
      title: "Nova ponte em Balneário Camboriú inicia obras neste sábado",
    });
    expect(res).toBeNull();
  });

  it("returns null when params is empty or undefined", () => {
    expect(resolveCityNewsCover(null)).toBeNull();
    expect(resolveCityNewsCover(undefined)).toBeNull();
  });
});
