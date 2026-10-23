import { describe, expect, it } from "vitest";
import { mapGmapsCsvToPlaces, normalizeBaseUrl, parseCsv } from "./gmaps-scraper-client";

const HEADER = "title,category,address,website,phone,review_count,review_rating,latitude,longitude,cid,complete_address,emails,open_hours";

describe("parseCsv", () => {
  it("trata aspas, vírgulas e quebras de linha em células", () => {
    const rows = parseCsv('a,b\n"x, y","linha1\nlinha2"\n');
    expect(rows).toEqual([["a", "b"], ["x, y", "linha1\nlinha2"]]);
  });
});

describe("mapGmapsCsvToPlaces", () => {
  it("mapeia campos presentes", () => {
    const csv = `${HEADER}\nPizzaria Bella,Pizzaria,"Rua A, 10",https://bella.com.br,(49) 3322-1100,120,4.6,-27.1,-52.6,123,"{""borough"":""Centro"",""city"":""Chapecó"",""state"":""SC""}",contato@bella.com.br,"{""monday"":[""18:00-23:00""]}"`;
    const [place] = mapGmapsCsvToPlaces(csv, "Fallback");
    expect(place.businessName).toBe("Pizzaria Bella");
    expect(place.city).toBe("Chapecó");
    expect(place.neighborhood).toBe("Centro");
    expect(place.contactEmail).toBe("contato@bella.com.br");
    expect(place.contactWhatsapp).toBe("4933221100");
    expect(place.rating).toBe(4.6);
    expect(place.reviewsCount).toBe(120);
    expect(place.workingHours).toEqual({ monday: "18:00-23:00" });
    expect(place.source).toBe("google_maps_scraper");
  });

  it("descarta linhas sem nome ou coordenadas e não inventa dados", () => {
    const csv = `${HEADER}\n,Pizzaria,,,,,,-27.1,-52.6,,,,\nSem Coord,Pizzaria,,,,,,,,,,,`;
    expect(mapGmapsCsvToPlaces(csv, "Chapecó")).toEqual([]);
  });

  it("usa cidade de fallback e omite opcionais ausentes", () => {
    const csv = `${HEADER}\nLoja X,Loja,,,,,,-27.1,-52.6,,,,`;
    const [place] = mapGmapsCsvToPlaces(csv, "Chapecó", "SC");
    expect(place.city).toBe("Chapecó");
    expect(place.state).toBe("SC");
    expect(place.rating).toBeUndefined();
    expect(place.contactEmail).toBeUndefined();
    expect(place.websiteUrl).toBeUndefined();
  });
});

describe("normalizeBaseUrl", () => {
  it("remove barra final e rejeita protocolos inválidos", () => {
    expect(normalizeBaseUrl("https://maps.exemplo.com/")).toBe("https://maps.exemplo.com");
    expect(() => normalizeBaseUrl("ftp://x.com")).toThrow();
  });
});
