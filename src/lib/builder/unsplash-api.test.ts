import { describe, expect, it } from "vitest";
import { isAssetPublicationReady } from "./asset-contract";
import {
  createUnsplashAssetRef,
  matchesUnsplashSelectionLedger,
  searchUnsplashForStudio,
  trackUnsplashPhotoSelection,
  validateUnsplashDownloadLocation,
} from "./unsplash-api";

const PHOTO_ID = "photo_123";
const PHOTO_PAGE = "https://unsplash.com/photos/photo_123";
const IMAGE_URL = "https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200&q=80";
const DOWNLOAD_URL = `https://api.unsplash.com/photos/${PHOTO_ID}/download?ixid=test`;

function responseForPhoto() {
  return {
    id: PHOTO_ID,
    alt_description: "Interior acolhedor com luz natural",
    description: "Luz de fim de tarde em um espaço neutro",
    width: 2400,
    height: 1600,
    urls: {
      small: "https://images.unsplash.com/photo-123?auto=format&fit=crop&w=400&q=80",
      regular: IMAGE_URL,
    },
    links: { html: PHOTO_PAGE, download_location: DOWNLOAD_URL },
    user: {
      name: "Pessoa Fotógrafa",
      username: "foto_real",
      links: { html: "https://unsplash.com/@foto_real" },
    },
  };
}

function makeFetch(status = 200, json: unknown = { total: 1, total_pages: 1, results: [responseForPhoto()] }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    const url = new URL(String(input));
    const body = url.pathname === `/photos/${PHOTO_ID}` ? responseForPhoto() : json;
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  return { calls, fetchImpl };
}

describe("Unsplash Studio integration helpers", () => {
  it("normaliza apenas resultados oficiais, aplica attribution UTM e mantém hotlink images.unsplash.com", async () => {
    const { calls, fetchImpl } = makeFetch();
    const result = await searchUnsplashForStudio({ query: "luz natural", perPage: 12 }, { accessKey: "test-key", appName: "waesy", fetchImpl });
    const apiUrl = new URL(calls[0].url);
    expect(apiUrl.origin).toBe("https://api.unsplash.com");
    expect(apiUrl.pathname).toBe("/search/photos");
    expect(apiUrl.searchParams.get("query")).toBe("luz natural");
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Client-ID test-key" });
    expect(result.results[0].imageUrl).toBe(IMAGE_URL);
    expect(new URL(result.results[0].photoPageUrl).searchParams.get("utm_source")).toBe("waesy");
    expect(result.results[0].creator).toBe("Pessoa Fotógrafa");
  });

  it("rejeita URL de imagem de origem externa mesmo quando a resposta API é válida", async () => {
    const payload = { total: 1, total_pages: 1, results: [{ ...responseForPhoto(), urls: { ...responseForPhoto().urls, regular: "https://evil.example/foto.jpg" } }] };
    const { fetchImpl } = makeFetch(200, payload);
    await expect(searchUnsplashForStudio({ query: "imagem" }, { accessKey: "test-key", fetchImpl })).rejects.toThrow("origem oficial");
  });

  it("limita o tracking à URL do evento oficial correspondente à mesma foto", () => {
    expect(validateUnsplashDownloadLocation(DOWNLOAD_URL, PHOTO_ID)).toContain(`/photos/${PHOTO_ID}/download`);
    expect(() => validateUnsplashDownloadLocation(`https://api.unsplash.com/photos/other/download`, PHOTO_ID)).toThrow();
    expect(() => validateUnsplashDownloadLocation(`https://evil.example/photos/${PHOTO_ID}/download`, PHOTO_ID)).toThrow();
    expect(() => validateUnsplashDownloadLocation(`${DOWNLOAD_URL}&client_id=secret`, PHOTO_ID)).toThrow();
  });

  it("envia o evento de tracking com método GET e Client-ID sem repassar segredo ao cliente", async () => {
    const { calls, fetchImpl } = makeFetch();
    await trackUnsplashPhotoSelection({ photoId: PHOTO_ID, downloadLocation: DOWNLOAD_URL }, { accessKey: "server-only-test-key", fetchImpl });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain(`/photos/${PHOTO_ID}`);
    expect(calls[1].url).toContain(`/photos/${PHOTO_ID}/download`);
    expect(calls[1].init?.method).toBe("GET");
    expect(calls[1].init?.headers).toMatchObject({ Authorization: "Client-ID server-only-test-key" });
  });

  it("produz assetRef completo que só fica pronto para publicação após tracking", async () => {
    const { fetchImpl } = makeFetch();
    const result = await searchUnsplashForStudio({ query: "luz natural" }, { accessKey: "test-key", fetchImpl });
    const tracked = createUnsplashAssetRef(result.results[0], { usageSlot: "hero-ambience", downloadEventStatus: "tracked" });
    const untracked = createUnsplashAssetRef(result.results[0], { usageSlot: "hero-ambience", downloadEventStatus: "failed" });
    expect(isAssetPublicationReady(tracked)).toBe(true);
    expect(isAssetPublicationReady(untracked)).toBe(false);
    const record = {
      photo_id: result.results[0].id,
      usage_slot: "hero-ambience",
      image_url: result.results[0].imageUrl,
      photo_page_url: result.results[0].photoPageUrl,
      creator_name: result.results[0].creator,
      creator_profile_url: result.results[0].creatorProfileUrl,
      license_id: "unsplash-license",
      license_url: "https://unsplash.com/license",
    };
    expect(matchesUnsplashSelectionLedger(tracked, record)).toBe(true);
    expect(matchesUnsplashSelectionLedger({ ...tracked, creator: "Autoria forjada" }, record)).toBe(false);
    expect(matchesUnsplashSelectionLedger({ ...tracked, source_url: "https://images.unsplash.com/outro-photo" }, record)).toBe(false);
  });

  it("converte resposta HTTP rate-limited em erro previsível", async () => {
    const { fetchImpl } = makeFetch(429, {});
    await expect(searchUnsplashForStudio({ query: "luz natural" }, { accessKey: "test-key", fetchImpl })).rejects.toThrow("Limite de buscas");
  });
});
