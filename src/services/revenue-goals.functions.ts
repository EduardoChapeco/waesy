import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

export interface ChannelGoalProgressDTO {
  channel: string;
  channel_label: string;
  target_cents: number;
  realized_cents: number;
  percent_achieved: number;
  order_count: number;
}

export interface RevenueGoalsAndForecastDTO {
  month_label: string;
  days_in_month: number;
  elapsed_days: number;
  remaining_days: number;
  monthly_goal_cents: number;
  realized_cents: number;
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
    z.object({
      storeId: z.string().uuid().optional(),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
    }).optional()
  )
  .handler(async ({ data }): Promise<RevenueGoalsAndForecastDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const now = new Date();
    const targetYear = data?.year || now.getFullYear();
    const targetMonth = data?.month ? data.month - 1 : now.getMonth();

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    const isCurrentMonth =
      now.getFullYear() === targetYear && now.getMonth() === targetMonth;
    const currentDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;
    const elapsedDays = Math.max(1, currentDay);
    const remainingDays = Math.max(0, totalDaysInMonth - currentDay);

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthLabel = `${monthNames[targetMonth]} de ${targetYear}`;

    // Buscar configurações de metas da loja
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .single();

    if (storeError) {
      logSystemError("Falha ao buscar metas da loja", { storeId: targetStoreId, error: storeError });
    }

    const settingsGoals = (store?.settings as any)?.revenue_goals || {};
    const monthlyGoalCents = Number(settingsGoals.monthly_goal_cents) || 5000000; // Padrão: R$ 50.000,00
    const ordersGoal = Number(settingsGoals.orders_goal) || 300;
    const averageTicketGoalCents = Number(settingsGoals.average_ticket_goal_cents) || 16500;
    const configuredChannelGoals: Record<string, number> = settingsGoals.channel_goals || {};

    // Buscar faturamento real dos pedidos no mês
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_cents, channel, status, created_at")
      .eq("store_id", targetStoreId)
      .neq("status", "cancelled")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString());

    if (ordersError) {
      logSystemError("Falha ao buscar pedidos para cálculo de forecast", { storeId: targetStoreId, error: ordersError });
    }

    const validOrders = orders || [];
    let realizedCents = 0;
    const channelSales: Record<string, { cents: number; count: number }> = {};

    validOrders.forEach((ord) => {
      const cents = Number(ord.total_cents) || 0;
      realizedCents += cents;

      const rawChannel = ord.channel || "balcao_pos";
      const chKey = Object.keys(CHANNEL_LABELS).includes(rawChannel) ? rawChannel : "outros";
      if (!channelSales[chKey]) {
        channelSales[chKey] = { cents: 0, count: 0 };
      }
      channelSales[chKey].cents += cents;
      channelSales[chKey].count += 1;
    });

    const ordersCount = validOrders.length;
    const averageTicketCents = ordersCount > 0 ? Math.round(realizedCents / ordersCount) : 0;

    // Métricas preditivas de forecast
    const dailyRunRateCents = Math.round(realizedCents / elapsedDays);
    const projectedClosingCents = dailyRunRateCents * totalDaysInMonth;
    const percentAchieved = monthlyGoalCents > 0 ? Math.round((realizedCents / monthlyGoalCents) * 100) : 0;
    const projectedPercent = monthlyGoalCents > 0 ? Math.round((projectedClosingCents / monthlyGoalCents) * 100) : 0;

    const remainingCentsToTarget = Math.max(0, monthlyGoalCents - realizedCents);
    const requiredDailyRunRateCents = remainingDays > 0 ? Math.round(remainingCentsToTarget / remainingDays) : 0;

    let status: "on_track" | "ahead" | "behind" | "achieved" = "on_track";
    if (percentAchieved >= 100) {
      status = "achieved";
    } else if (projectedPercent >= 105) {
      status = "ahead";
    } else if (projectedPercent < 90) {
      status = "behind";
    } else {
      status = "on_track";
    }

    // Canais e metas segmentadas
    const channelsList: ChannelGoalProgressDTO[] = Object.keys(CHANNEL_LABELS).map((channelKey) => {
      const sales = channelSales[channelKey] || { cents: 0, count: 0 };
      const targetCents = configuredChannelGoals[channelKey] || 0;
      const chPercent = targetCents > 0 ? Math.round((sales.cents / targetCents) * 100) : 0;

      return {
        channel: channelKey,
        channel_label: CHANNEL_LABELS[channelKey],
        target_cents: targetCents,
        realized_cents: sales.cents,
        percent_achieved: chPercent,
        order_count: sales.count,
      };
    });

    return {
      month_label: monthLabel,
      days_in_month: totalDaysInMonth,
      elapsed_days: elapsedDays,
      remaining_days: remainingDays,
      monthly_goal_cents: monthlyGoalCents,
      realized_cents: realizedCents,
      percent_achieved: percentAchieved,
      projected_closing_cents: projectedClosingCents,
      projected_percent: projectedPercent,
      daily_run_rate_cents: dailyRunRateCents,
      required_daily_run_rate_cents: requiredDailyRunRateCents,
      orders_count: ordersCount,
      orders_goal: ordersGoal,
      average_ticket_cents: averageTicketCents,
      average_ticket_goal_cents: averageTicketGoalCents,
      status,
      channels: channelsList,
    };
  });

export const saveRevenueGoals = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      monthlyGoalCents: z.number().int().min(0),
      ordersGoal: z.number().int().min(0),
      averageTicketGoalCents: z.number().int().min(0),
      channelGoals: z.record(z.string(), z.number().int().min(0)).optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: store, error: fetchError } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .single();

    if (fetchError || !store) {
      throw new Error("Não foi possível carregar as configurações da loja.");
    }

    const currentSettings = (store.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      revenue_goals: {
        monthly_goal_cents: data.monthlyGoalCents,
        orders_goal: data.ordersGoal,
        average_ticket_goal_cents: data.averageTicketGoalCents,
        channel_goals: data.channelGoals || {},
        updated_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from("stores")
      .update({ settings: updatedSettings })
      .eq("id", targetStoreId);

    if (updateError) {
      logSystemError("Falha ao salvar metas comerciais", { storeId: targetStoreId, error: updateError });
      throw new Error("Erro ao salvar metas comerciais no banco de dados.");
    }

    return { success: true };
  });
