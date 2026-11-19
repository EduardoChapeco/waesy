import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { getNicheSemantics } from "@/lib/niches/niche-semantics";
import { isManagerialRole } from "@/lib/rbac-permissions";
import {
  computeStatisticalGoalForecast,
  type DailySaleObservation,
  type HistoricalMonthPoint,
  type OpenPipelineDealInput,
  type StatisticalForecastResult,
} from "@/lib/goals/statistical-forecast";
import { executeAiCoreGateway } from "@/services/ai-core-gateway.functions";

export interface ChannelGoalProgressDTO {
  channel: string;
  channel_label: string;
  target_cents: number;
  realized_cents: number;
  agency_revenue_cents?: number;
  percent_achieved: number;
  order_count: number;
}

export interface AgentGoalBreakdownDTO {
  profile_id: string | null;
  agent_name: string;
  sales_count: number;
  gross_realized_cents: number;
  agency_revenue_cents: number;
  gross_goal_cents: number;
  percent_achieved: number;
}

export interface RevenueGoalsAndForecastDTO {
  niche_id: string;
  is_tourism: boolean;
  can_edit_goals: boolean;
  is_personal_scope: boolean;
  competence_month: string;
  month_label: string;
  days_in_month: number;
  elapsed_days: number;
  remaining_days: number;
  monthly_goal_cents: number;
  agency_revenue_goal_cents: number;
  realized_cents: number;
  realized_agency_revenue_cents: number;
  realized_net_profit_cents: number;
  percent_achieved: number;
  projected_closing_cents: number;
  projected_percent: number;
  daily_run_rate_cents: number;
  required_daily_run_rate_cents: number;
  orders_count: number;
  orders_goal: number;
  average_ticket_cents: number;
  average_ticket_goal_cents: number;
  status: "on_track" | "ahead" | "behind" | "achieved";
  channels: ChannelGoalProgressDTO[];
  agents_breakdown: AgentGoalBreakdownDTO[];
  statistical: StatisticalForecastResult;
}

const CHANNEL_LABELS: Record<string, string> = {
  balcao_pos: "Balcão / PDV",
  vitrine_online: "Loja Virtual / Link",
  ifood: "iFood",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  whatsapp: "WhatsApp",
  outros: "Outros Canais",
};

export const getRevenueGoalsAndForecast = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
        agentProfileId: z.string().uuid().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }): Promise<RevenueGoalsAndForecastDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, undefined, data?.storeId);

    const targetStoreId = identity.store_id;
    const canManageGoals = isManagerialRole(identity.role);
    const isPersonalScope = !canManageGoals;
    const scopedAgentId = isPersonalScope
      ? identity.id
      : data?.agentProfileId || undefined;

    const now = new Date();
    const targetYear = data?.year || now.getFullYear();
    const targetMonthNum = data?.month || now.getMonth() + 1;
    const targetMonthIdx = targetMonthNum - 1;
    const competenceMonth = `${targetYear}-${String(targetMonthNum).padStart(2, "0")}`;

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const monthLabel = `${monthNames[targetMonthIdx]} de ${targetYear}`;

    const { data: store } = await supabase
      .from("stores")
      .select("id, segment, primary_niche_id, vertical_sku, settings")
      .eq("id", targetStoreId)
      .single();

    const semantics = getNicheSemantics(store || {});
    const isTourism = semantics.nicheId === "tourism";
    const settingsGoals = (store?.settings as any)?.revenue_goals || {};

    // Metas salvas na tabela histórica `agency_goal_targets` (com fallback limpo ao JSON legado)
    const { data: targetRows } = await supabase
      .from("agency_goal_targets")
      .select("*")
      .eq("store_id", targetStoreId)
      .eq("competence_month", competenceMonth);

    const agencyGoalRow = (targetRows || []).find((t: any) => t.target_scope === "agency");
    const personalGoalRow = scopedAgentId
      ? (targetRows || []).find(
          (t: any) => t.target_scope === "agent" && t.agent_profile_id === scopedAgentId,
        )
      : null;

    const monthlyGoalCents = isPersonalScope
      ? Number(personalGoalRow?.gross_goal_cents || 0)
      : Number(agencyGoalRow?.gross_goal_cents ?? settingsGoals.monthly_goal_cents ?? (isTourism ? 10000000 : 5000000));

    const agencyRevenueGoalCents = isPersonalScope
      ? Number(personalGoalRow?.agency_revenue_goal_cents || Math.round(monthlyGoalCents * 0.1))
      : Number(agencyGoalRow?.agency_revenue_goal_cents || Math.round(monthlyGoalCents * 0.1));

    const ordersGoal = isPersonalScope
      ? Number(personalGoalRow?.sales_count_goal || 10)
      : Number(agencyGoalRow?.sales_count_goal ?? settingsGoals.orders_goal ?? (isTourism ? 25 : 300));

    const averageTicketGoalCents = isPersonalScope
      ? Number(personalGoalRow?.avg_ticket_goal_cents || (isTourism ? 800000 : 16500))
      : Number(agencyGoalRow?.avg_ticket_goal_cents ?? settingsGoals.average_ticket_goal_cents ?? (isTourism ? 800000 : 16500));

    const configuredChannelGoals: Record<string, number> = {
      ...(settingsGoals.channel_goals || {}),
    };
    for (const row of targetRows || []) {
      if (row.target_scope === "channel" && row.channel_key) {
        configuredChannelGoals[row.channel_key] = Number(row.gross_goal_cents || 0);
      }
    }

    // Buscar histórico dos últimos 12 meses para sazonalidade empírica
    const histStartDate = new Date(Date.UTC(targetYear - 1, targetMonthIdx, 1)).toISOString().slice(0, 10);
    const monthEndStr = new Date(Date.UTC(targetYear, targetMonthIdx + 1, 0, 23, 59, 59, 999)).toISOString();

    const dailyObservations: DailySaleObservation[] = [];
    const historicalMonthsMap = new Map<string, HistoricalMonthPoint>();
    const openPipelineDeals: OpenPipelineDealInput[] = [];
    const channelsList: ChannelGoalProgressDTO[] = [];
    const agentsBreakdown: AgentGoalBreakdownDTO[] = [];

    if (isTourism) {
      let sheetsQuery = supabase
        .from("travel_sale_financial_sheets")
        .select("id, sale_date, competence_month, gross_sale_cents, agency_revenue_cents, net_result_cents, primary_operator, seller_profile_id, seller_name, booking_status")
        .eq("store_id", targetStoreId)
        .neq("booking_status", "cancelada")
        .gte("sale_date", histStartDate);

      if (scopedAgentId) {
        sheetsQuery = sheetsQuery.eq("seller_profile_id", scopedAgentId);
      }

      let leadsQuery = supabase
        .from("leads_crm")
        .select("id, full_name, destination, status, pipeline_stage, estimated_value_cents, assigned_to, created_at")
        .eq("store_id", targetStoreId)
        .not("status", "in", "(won,lost,cancelled)");

      if (scopedAgentId) {
        leadsQuery = leadsQuery.eq("assigned_to", scopedAgentId);
      }

      let propsQuery = supabase
        .from("travel_proposals")
        .select("id, title, customer_name, status, pricing, seller_profile_id, created_at")
        .eq("store_id", targetStoreId)
        .in("status", ["sent", "viewed", "negotiation"]);

      if (scopedAgentId) {
        propsQuery = propsQuery.eq("seller_profile_id", scopedAgentId);
      }

      const [{ data: sheets }, { data: leads }, { data: proposals }] = await Promise.all([
        sheetsQuery,
        leadsQuery,
        propsQuery,
      ]);

      const operatorTotals = new Map<string, { gross: number; rev: number; count: number }>();
      const agentTotals = new Map<string, AgentGoalBreakdownDTO>();

      for (const s of sheets || []) {
        const comp = String(s.competence_month || String(s.sale_date || "").slice(0, 7));
        const gross = Number(s.gross_sale_cents || 0);
        const rev = Number(s.agency_revenue_cents || 0);
        const netProfit = Number(s.net_result_cents || 0);

        const histPt = historicalMonthsMap.get(comp) || {
          competenceMonth: comp,
          grossCents: 0,
          agencyRevenueCents: 0,
          salesCount: 0,
        };
        histPt.grossCents += gross;
        histPt.agencyRevenueCents += rev;
        histPt.salesCount += 1;
        historicalMonthsMap.set(comp, histPt);

        if (comp === competenceMonth) {
          dailyObservations.push({
            date: String(s.sale_date || "").slice(0, 10),
            grossCents: gross,
            agencyRevenueCents: rev,
            netProfitCents: netProfit,
            count: 1,
          });

          const opKey = String(s.primary_operator || "Outras");
          const curOp = operatorTotals.get(opKey) || { gross: 0, rev: 0, count: 0 };
          curOp.gross += gross;
          curOp.rev += rev;
          curOp.count += 1;
          operatorTotals.set(opKey, curOp);

          if (!isPersonalScope) {
            const agKey = s.seller_profile_id || `name:${s.seller_name || "Consultor"}`;
            const targetRow = (targetRows || []).find(
              (t: any) => t.target_scope === "agent" && t.agent_profile_id === s.seller_profile_id,
            );
            const agGoal = Number(targetRow?.gross_goal_cents || 0);
            const curAg = agentTotals.get(agKey) || {
              profile_id: s.seller_profile_id || null,
              agent_name: s.seller_name || "Consultor",
              sales_count: 0,
              gross_realized_cents: 0,
              agency_revenue_cents: 0,
              gross_goal_cents: agGoal,
              percent_achieved: 0,
            };
            curAg.sales_count += 1;
            curAg.gross_realized_cents += gross;
            curAg.agency_revenue_cents += rev;
            agentTotals.set(agKey, curAg);
          }
        }
      }

      for (const [opKey, st] of operatorTotals.entries()) {
        const tCents = configuredChannelGoals[opKey] || 0;
        channelsList.push({
          channel: opKey,
          channel_label: opKey,
          target_cents: tCents,
          realized_cents: st.gross,
          agency_revenue_cents: st.rev,
          percent_achieved: tCents > 0 ? Math.round((st.gross / tCents) * 100) : 0,
          order_count: st.count,
        });
      }

      for (const ag of agentTotals.values()) {
        agentsBreakdown.push({
          ...ag,
          percent_achieved:
            ag.gross_goal_cents > 0
              ? Math.round((ag.gross_realized_cents / ag.gross_goal_cents) * 100)
              : 0,
        });
      }
      agentsBreakdown.sort((a, b) => b.gross_realized_cents - a.gross_realized_cents);

      const seenLeadTitles = new Set<string>();
      for (const p of proposals || []) {
        const pricing = (p.pricing as any) || {};
        const val = Number(pricing.total_cents || pricing.grand_total_cents || 0);
        if (val > 0) {
          openPipelineDeals.push({
            id: p.id,
            title: p.title || p.customer_name || "Proposta",
            stage: p.status || "proposal",
            valueCents: val,
            sellerProfileId: p.seller_profile_id || null,
          });
          if (p.customer_name) seenLeadTitles.add(String(p.customer_name).toLowerCase());
        }
      }
      for (const l of leads || []) {
        if (l.full_name && seenLeadTitles.has(String(l.full_name).toLowerCase())) continue;
        const val = Number(l.estimated_value_cents || 0);
        if (val > 0) {
          openPipelineDeals.push({
            id: l.id,
            title: `${l.full_name || "Lead"}${l.destination ? ` • ${l.destination}` : ""}`,
            stage: l.pipeline_stage || l.status || "qualified",
            valueCents: val,
            sellerProfileId: l.assigned_to || null,
          });
        }
      }
    } else {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total_cents, channel_origin, origin_channel, status, created_at")
        .eq("store_id", targetStoreId)
        .neq("status", "cancelled")
        .gte("created_at", `${histStartDate}T00:00:00Z`)
        .lte("created_at", monthEndStr);

      if (ordersError) {
        logSystemError({
          errorMessage: "Falha ao buscar pedidos para cálculo de forecast",
          error: ordersError,
          payload: { storeId: targetStoreId },
        });
      }

      const channelSales: Record<string, { cents: number; count: number }> = {};
      for (const ord of orders || []) {
        const cents = Number(ord.total_cents) || 0;
        const dateStr = String(ord.created_at || "").slice(0, 10);
        const comp = dateStr.slice(0, 7);

        const histPt = historicalMonthsMap.get(comp) || {
          competenceMonth: comp,
          grossCents: 0,
          agencyRevenueCents: 0,
          salesCount: 0,
        };
        histPt.grossCents += cents;
        histPt.agencyRevenueCents += cents;
        histPt.salesCount += 1;
        historicalMonthsMap.set(comp, histPt);

        if (comp === competenceMonth) {
          dailyObservations.push({
            date: dateStr,
            grossCents: cents,
            agencyRevenueCents: cents,
            netProfitCents: cents,
            count: 1,
          });

          const rawChannel = ord.channel_origin || ord.origin_channel || "balcao_pos";
          const chKey = Object.keys(CHANNEL_LABELS).includes(rawChannel) ? rawChannel : "outros";
          if (!channelSales[chKey]) channelSales[chKey] = { cents: 0, count: 0 };
          channelSales[chKey].cents += cents;
          channelSales[chKey].count += 1;
        }
      }

      for (const channelKey of Object.keys(CHANNEL_LABELS)) {
        const sales = channelSales[channelKey] || { cents: 0, count: 0 };
        const targetCents = configuredChannelGoals[channelKey] || 0;
        channelsList.push({
          channel: channelKey,
          channel_label: CHANNEL_LABELS[channelKey],
          target_cents: targetCents,
          realized_cents: sales.cents,
          percent_achieved: targetCents > 0 ? Math.round((sales.cents / targetCents) * 100) : 0,
          order_count: sales.count,
        });
      }
    }

    const statistical = computeStatisticalGoalForecast({
      targetYear,
      targetMonth: targetMonthNum,
      nowDate: now,
      dailyObservations,
      historicalMonths: [...historicalMonthsMap.values()],
      openPipelineDeals,
      monthlyGrossGoalCents: monthlyGoalCents,
      monthlyAgencyRevenueGoalCents: agencyRevenueGoalCents,
    });

    const percentAchieved =
      monthlyGoalCents > 0 ? Math.round((statistical.realizedGrossCents / monthlyGoalCents) * 100) : 0;
    const projectedPercent =
      monthlyGoalCents > 0 ? Math.round((statistical.p50GrossCents / monthlyGoalCents) * 100) : 0;

    let status: "on_track" | "ahead" | "behind" | "achieved" = "on_track";
    if (percentAchieved >= 100 && monthlyGoalCents > 0) status = "achieved";
    else if (projectedPercent >= 105) status = "ahead";
    else if (projectedPercent < 90 && monthlyGoalCents > 0) status = "behind";

    return {
      niche_id: semantics.nicheId,
      is_tourism: isTourism,
      can_edit_goals: canManageGoals,
      is_personal_scope: isPersonalScope,
      competence_month: competenceMonth,
      month_label: monthLabel,
      days_in_month: statistical.daysInMonth,
      elapsed_days: statistical.elapsedDays,
      remaining_days: statistical.remainingDays,
      monthly_goal_cents: monthlyGoalCents,
      agency_revenue_goal_cents: agencyRevenueGoalCents,
      realized_cents: statistical.realizedGrossCents,
      realized_agency_revenue_cents: isPersonalScope ? 0 : statistical.realizedAgencyRevenueCents,
      realized_net_profit_cents: isPersonalScope ? 0 : statistical.realizedNetProfitCents,
      percent_achieved: percentAchieved,
      projected_closing_cents: statistical.p50GrossCents,
      projected_percent: projectedPercent,
      daily_run_rate_cents: statistical.ewmaDailyVelocityGrossCents,
      required_daily_run_rate_cents: statistical.requiredDailyGrossCents,
      orders_count: statistical.realizedSalesCount,
      orders_goal: ordersGoal,
      average_ticket_cents: statistical.averageTicketCents,
      average_ticket_goal_cents: averageTicketGoalCents,
      status,
      channels: channelsList,
      agents_breakdown: agentsBreakdown,
      statistical,
    };
  });

export const saveRevenueGoals = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      competenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      monthlyGoalCents: z.number().int().min(0),
      agencyRevenueGoalCents: z.number().int().min(0).optional(),
      ordersGoal: z.number().int().min(0),
      averageTicketGoalCents: z.number().int().min(0),
      channelGoals: z.record(z.string(), z.number().int().min(0)).optional(),
      agentGoals: z
        .array(
          z.object({
            agentProfileId: z.string().uuid(),
            grossGoalCents: z.number().int().min(0),
            agencyRevenueGoalCents: z.number().int().min(0).optional(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "gerente", "diretor"], data.storeId);

    const targetStoreId = identity.store_id;
    const now = new Date();
    const competenceMonth =
      data.competenceMonth ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Gravar meta global na tabela histórica `agency_goal_targets`
    await supabase
      .from("agency_goal_targets")
      .delete()
      .eq("store_id", targetStoreId)
      .eq("competence_month", competenceMonth)
      .eq("target_scope", "agency");

    const { error: insertAgencyErr } = await supabase.from("agency_goal_targets").insert({
      store_id: targetStoreId,
      competence_month: competenceMonth,
      target_scope: "agency",
      gross_goal_cents: data.monthlyGoalCents,
      agency_revenue_goal_cents:
        data.agencyRevenueGoalCents ?? Math.round(data.monthlyGoalCents * 0.1),
      sales_count_goal: data.ordersGoal,
      avg_ticket_goal_cents: data.averageTicketGoalCents,
      created_by: identity.id,
      updated_at: now.toISOString(),
    });

    if (insertAgencyErr) {
      throw new Error(`Erro ao salvar meta mensal: ${insertAgencyErr.message}`);
    }

    // 2. Gravar metas individuais por consultor quando fornecidas
    if (Array.isArray(data.agentGoals) && data.agentGoals.length > 0) {
      for (const ag of data.agentGoals) {
        await supabase
          .from("agency_goal_targets")
          .delete()
          .eq("store_id", targetStoreId)
          .eq("competence_month", competenceMonth)
          .eq("target_scope", "agent")
          .eq("agent_profile_id", ag.agentProfileId);

        await supabase.from("agency_goal_targets").insert({
          store_id: targetStoreId,
          competence_month: competenceMonth,
          target_scope: "agent",
          agent_profile_id: ag.agentProfileId,
          gross_goal_cents: ag.grossGoalCents,
          agency_revenue_goal_cents:
            ag.agencyRevenueGoalCents ?? Math.round(ag.grossGoalCents * 0.1),
          created_by: identity.id,
          updated_at: now.toISOString(),
        });
      }
    }

    // 3. Espelho compatível em stores.settings.revenue_goals
    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .maybeSingle();

    const currentSettings = (store?.settings as Record<string, any>) || {};
    await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          revenue_goals: {
            monthly_goal_cents: data.monthlyGoalCents,
            agency_revenue_goal_cents: data.agencyRevenueGoalCents ?? Math.round(data.monthlyGoalCents * 0.1),
            orders_goal: data.ordersGoal,
            average_ticket_goal_cents: data.averageTicketGoalCents,
            channel_goals: data.channelGoals || {},
            updated_at: now.toISOString(),
          },
        },
      })
      .eq("id", targetStoreId);

    return { success: true };
  });

export const generateGoalsAiInsightsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const goalsData = await getRevenueGoalsAndForecast({ data });
    const stat = goalsData.statistical;

    // Fallback determinístico baseado exclusivamente nos dados reais calculados
    const gapGrossCents = Math.max(0, goalsData.monthly_goal_cents - stat.realizedGrossCents);
    const deterministicRecommendations: string[] = [];
    if (gapGrossCents > 0 && stat.remainingDays > 0) {
      deterministicRecommendations.push(
        `Necessário ritmo médio de R$ ${(stat.requiredBusinessDailyGrossCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} por peso de dia útil para fechar a meta de R$ ${(goalsData.monthly_goal_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      );
    } else if (gapGrossCents === 0 && goalsData.monthly_goal_cents > 0) {
      deterministicRecommendations.push(
        "Meta atingida. Priorize vendas com pagamento à vista/PIX ou operadoras de menor retenção de Over para maximizar o lucro líquido.",
      );
    }
    if (stat.pipeline.topHighImpactDeals.length > 0) {
      const top = stat.pipeline.topHighImpactDeals[0];
      deterministicRecommendations.push(
        `Maior alavanca aberta no funil: ${top.title} (R$ ${(top.valueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, prob. ${top.winProbabilityPct}%).`,
      );
    }
    if (stat.momGrowthGrossPct < 0) {
      deterministicRecommendations.push(
        `Retração de ${Math.abs(stat.momGrowthGrossPct)}% vs mês anterior; reative cotações paradas em proposta enviada nos últimos 10 dias.`,
      );
    }

    const aiPromptPayload = {
      roleScope: goalsData.is_personal_scope ? "consultor_individual" : "gestao_agencia",
      competenceMonth: goalsData.competence_month,
      realizedGrossBRL: Number((stat.realizedGrossCents / 100).toFixed(2)),
      goalGrossBRL: Number((goalsData.monthly_goal_cents / 100).toFixed(2)),
      takeRatePct: stat.takeRatePct,
      p10GrossBRL: Number((stat.p10GrossCents / 100).toFixed(2)),
      p50GrossBRL: Number((stat.p50GrossCents / 100).toFixed(2)),
      p90GrossBRL: Number((stat.p90GrossCents / 100).toFixed(2)),
      goalHitProbabilityPct: stat.goalHitProbabilityPct,
      momGrowthGrossPct: stat.momGrowthGrossPct,
      seasonalityFactor: stat.seasonalityFactor,
      topPipelineDeals: stat.pipeline.topHighImpactDeals.slice(0, 3),
    };

    try {
      const identity = await getServerIdentity();
      const aiRes = await executeAiCoreGateway({
        task: "resumo",
        mode: "sync",
        systemPrompt:
          "Você é um analista estatístico de finanças e vendas de agências de viagens. Nunca invente números; use apenas o JSON estatístico fornecido. Responda em JSON puro: {\"headline\": string, \"recommendations\": string[], \"riskLevel\": \"low\"|\"medium\"|\"high\"}.",
        prompt: JSON.stringify(aiPromptPayload),
        constraints: { maxTokens: 450, temperature: 0.2, responseFormat: "json_object" },
        authContext: { userId: identity.id || undefined, storeId: identity.store_id || undefined },
      });

      const rawText = (aiRes as any)?.result?.text || (aiRes as any)?.text || "";
      if (aiRes.success && (rawText || (aiRes as any)?.result?.parsedJson)) {
        const parsed = (aiRes as any)?.result?.parsedJson || (rawText ? JSON.parse(rawText) : null);
        if (parsed && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
          return {
            source: "ai_gateway" as const,
            provider: aiRes.metadata?.provider || "gateway",
            headline: String(parsed.headline || "Diagnóstico Estatístico e IA"),
            riskLevel: (["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium") as "low" | "medium" | "high",
            recommendations: parsed.recommendations.map(String).slice(0, 4),
          };
        }
      }
    } catch {
      // Fallback determinístico quando sem chave BYOK configurada
    }

    return {
      source: "statistical_engine" as const,
      provider: "ewma_p10_p50_p90",
      headline: `Probabilidade estatística de meta: ${stat.goalHitProbabilityPct}% (Mediana P50: R$ ${(stat.p50GrossCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      riskLevel: (stat.goalHitProbabilityPct >= 75 ? "low" : stat.goalHitProbabilityPct >= 45 ? "medium" : "high") as "low" | "medium" | "high",
      recommendations:
        deterministicRecommendations.length > 0
          ? deterministicRecommendations
          : ["Continue registrando suas vendas e avançando propostas em aberto para calibrar a série histórica."],
    };
  });
