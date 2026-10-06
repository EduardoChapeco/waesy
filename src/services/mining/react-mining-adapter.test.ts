import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { scrapeUrlWithReact } from "./react-mining-adapter";

vi.mock("@/lib/mining/firecrawl-client", () => ({ scrapeUrl: vi.fn() }));

const mockedScrape = vi.mocked(scrapeUrl);

describe("scrapeUrlWithReact", () => {
  beforeEach(() => mockedScrape.mockReset());

  it("aceita conteúdo válido e registra a iteração ReAct", async () => {
    mockedScrape.mockResolvedValue({ success: true, html: "<article>conteúdo</article>", provider: "firecrawl" });
    const result = await scrapeUrlWithReact("https://example.com");
    expect(result.success).toBe(true);
    expect(result.react.quality).toBe("accepted");
    expect(result.react.iterations).toBeGreaterThan(0);
  });

  it("tenta novamente quando o provider não entrega conteúdo", async () => {
    mockedScrape.mockResolvedValue({ success: false, error: "rate limit", provider: "steel" });
    const result = await scrapeUrlWithReact("https://example.com");
    expect(result.success).toBe(false);
    expect(result.react.quality).toBe("rejected");
    expect(mockedScrape).toHaveBeenCalledTimes(3);
  });
});
