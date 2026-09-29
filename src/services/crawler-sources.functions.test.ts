import { describe, it, expect } from "vitest";
import { crawlerSourceTypeEnum, type CrawlerSourceDTO } from "./crawler-sources.functions";

describe("Omni-Crawler V127: Governança de Fontes Canônicas (crawler_sources)", () => {
  it("deve validar rigorosamente os 8 tipos canônicos de fontes do Omni-Crawler V127", () => {
    const validTypes = [
      "rss",
      "html_sitemap",
      "jobs_portal",
      "real_estate",
      "auctions",
      "tenders",
      "news",
      "ecommerce",
    ];

    for (const t of validTypes) {
      const parsed = crawlerSourceTypeEnum.safeParse(t);
      expect(parsed.success).toBe(true);
    }

    const invalidType = crawlerSourceTypeEnum.safeParse("invalid_source_type");
    expect(invalidType.success).toBe(false);
  });

  it("deve validar estrutura correta de CrawlerSourceDTO", () => {
    const sampleSource: CrawlerSourceDTO = {
      id: "6944739e-0f4b-4b01-99bb-8776871ed1f2",
      name: "G1 Santa Catarina (Regional)",
      url: "https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml",
      type: "rss",
      category: "news_regional",
      region: "SC",
      priority: 9,
      is_active: true,
      status: "idle",
      fetch_interval_minutes: 30,
      last_fetched_at: null,
      last_success_at: null,
      last_error: null,
      error_count: 0,
      items_indexed_count: 0,
      config: { website_url: "https://g1.globo.com/sc/santa-catarina/" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(sampleSource.id).toBeDefined();
    expect(sampleSource.priority).toBeGreaterThanOrEqual(1);
    expect(sampleSource.priority).toBeLessThanOrEqual(10);
    expect(sampleSource.status).toBe("idle");
    expect(sampleSource.is_active).toBe(true);
  });
});
