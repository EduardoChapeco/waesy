import type { AdPlatform } from "@/types/ad-tech-mcp";

export interface CampaignPlanRequest {
  prompt: string;
  targetPlatform?: AdPlatform;
  dailyBudgetCents?: number;
  durationDays?: number;
}

export interface ResolvedCampaignPlan {
  dailyBudgetCents: number;
  durationDays: number;
  platform: AdPlatform;
  planningAssumptions: string[];
}

export function resolveCampaignPlan(request: CampaignPlanRequest): ResolvedCampaignPlan {
  const prompt = request.prompt.trim();
  let dailyBudgetCents = request.dailyBudgetCents ?? 0;
  if (!dailyBudgetCents) {
    const match = prompt.match(/R\$\s*([0-9]+(?:[.,][0-9]{2})?)/i)
      || prompt.match(/([0-9]+(?:[.,][0-9]{2})?)\s*(?:reais|p\/dia|por dia)/i);
    if (match) dailyBudgetCents = Math.round(Number.parseFloat(match[1].replace(",", ".")) * 100);
  }
  if (!Number.isSafeInteger(dailyBudgetCents) || dailyBudgetCents <= 0) {
    throw new Error("Informe o orçamento diário em reais; a Waesy não presume um valor de investimento.");
  }

  const lower = prompt.toLocaleLowerCase("pt-BR");
  const mentions: Array<[string, AdPlatform]> = [
    ["instagram", "meta_instagram"],
    ["facebook", "meta_facebook"],
    ["google", "google_search"],
    ["omnichannel", "omnichannel_local"],
    ["waesy", "omnichannel_local"],
  ];
  const mentioned = [...new Set(mentions.filter(([term]) => lower.includes(term)).map(([, platform]) => platform))];
  const platform = request.targetPlatform || (mentioned.length === 1 ? mentioned[0] : undefined);
  if (mentioned.length > 1 && !request.targetPlatform) {
    throw new Error("Foi mencionado mais de um canal; escolha apenas um canal para esta proposta.");
  }
  if (!platform) throw new Error("Informe o canal da campanha (Instagram, Facebook, Google ou Waesy local).");

  const durationMatch = prompt.match(/(?:(?:por|durante)\s+)?(\d{1,2})\s+dias?/i);
  const durationDays = request.durationDays ?? (durationMatch ? Number(durationMatch[1]) : 7);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 60) {
    throw new Error("A duração precisa ser informada entre 1 e 60 dias.");
  }
  const totalBudgetCents = dailyBudgetCents * durationDays;
  if (!Number.isSafeInteger(totalBudgetCents) || totalBudgetCents > 2_147_483_647) {
    throw new Error("O orçamento total excede o limite de armazenamento; reduza a verba ou a duração.");
  }

  return {
    dailyBudgetCents,
    durationDays,
    platform,
    planningAssumptions: request.durationDays != null || durationMatch
      ? []
      : ["Duração inicial de 7 dias escolhida apenas como premissa editável; não é recomendação baseada em desempenho."],
  };
}
