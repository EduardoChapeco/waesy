import { describe, it, expect } from "vitest";
import { resolveCityNewsCover, CITY_EDITORIAL_IMAGE_MAP, CATEGORY_EDITORIAL_IMAGE_MAP, DEFAULT_CANONICAL_NEWS_IMAGE } from "./city-editorial-images";

describe("city-editorial-images resolver", () => {
  it("preserves authentic cover URLs from original sources", () => {
    const validUrl = "https://portaldesaojose.com.br/fotos/noticia-123.jpg";
    const res = resolveCityNewsCover({
      coverUrl: validUrl,
      city: "Chapecó",
      category: "economia",
    });
    expect(res).toBe(validUrl);
  });

  it("resolves city image for São Miguel do Oeste when cover is missing", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: "São Miguel do Oeste",
      state: "SC",
      category: "geral",
    });
    expect(res).toBe(CITY_EDITORIAL_IMAGE_MAP.sao_miguel_do_oeste);
  });

  it("resolves city image for Chapecó when cover is missing", () => {
    const res = resolveCityNewsCover({
      coverUrl: "",
      city: "Chapecó",
      state: "SC",
    });
    expect(res).toBe(CITY_EDITORIAL_IMAGE_MAP.chapeco);
  });

  it("resolves city image for Florianópolis when cover is missing", () => {
    const res = resolveCityNewsCover({
      coverUrl: undefined,
      city: "Florianópolis",
    });
    expect(res).toBe(CITY_EDITORIAL_IMAGE_MAP.florianopolis);
  });

  it("resolves city image from title mention when city is empty", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: null,
      title: "Nova ponte em Balneário Camboriú inicia obras neste sábado",
    });
    expect(res).toBe(CITY_EDITORIAL_IMAGE_MAP.balneario_camboriu);
  });

  it("resolves category image for agro when city is unspecified", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: null,
      category: "agronegócio",
      title: "Safra de grãos atinge recorde no sul do país",
    });
    expect(res).toBe(CATEGORY_EDITORIAL_IMAGE_MAP.agronegocio);
  });

  it("resolves category image for tecnologia", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: null,
      category: "tecnologia",
    });
    expect(res).toBe(CATEGORY_EDITORIAL_IMAGE_MAP.tecnologia);
  });

  it("falls back to default regional image if no city and no category match", () => {
    const res = resolveCityNewsCover({
      coverUrl: null,
      city: "Desconhecida",
      category: "xyz123",
      title: "Sem assunto correspondente",
    });
    expect(res).toBe(DEFAULT_CANONICAL_NEWS_IMAGE);
  });
});
