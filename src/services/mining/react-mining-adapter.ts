import { scrapeUrl, type FirecrawlResult, type FirecrawlScrapeOptions } from "@/lib/mining/firecrawl-client";
import { runReactLoop } from "@/services/ai-react-loop";

export interface ReactMiningResult extends FirecrawlResult {
  react: {
    iterations: number;
    decisions: string[];
    quality: "accepted" | "rejected";
  };
}

/**
 * ReAct boundary for crawlers: the action is the provider scrape, the
 * observation validates usable content, and the planner can retry/replan.
 * Firecrawl's own Steel fallback remains the provider layer of record.
 */
export async function scrapeUrlWithReact(url: string, options: FirecrawlScrapeOptions = {}): Promise<ReactMiningResult> {
  const decisions: string[] = [];
  let latest: FirecrawlResult | undefined;
  const loop = await runReactLoop<{ url: string }, "scrape", FirecrawlResult, { accepted: boolean }>({
    initialPlan: { url },
    initialState: { accepted: false },
    maxIterations: 3,
    planNext: async ({ steps }) => {
      if (steps.length > 0 && latest?.success && Boolean(latest.html || latest.markdown)) {
        decisions.push("complete");
        return { decision: "complete" as const };
      }
      decisions.push(steps.length === 0 ? "scrape" : "retry");
      return { decision: "continue" as const, action: "scrape" as const };
    },
    act: async () => scrapeUrl(url, options),
    observe: async (result, state) => {
      latest = result;
      const accepted = Boolean(result.success && (result.html || result.markdown));
      return { valid: accepted, state: { accepted }, decision: accepted ? "complete" as const : "retry" as const, reason: accepted ? undefined : result.error || "Conteúdo insuficiente" };
    },
  });
  const result: FirecrawlResult = latest || { success: false, error: loop.reason || "Falha de scraping", provider: "native-fetch" };
  return {
    ...result,
    react: { iterations: loop.steps.length, decisions, quality: loop.status === "completed" ? "accepted" : "rejected" },
  };
}
