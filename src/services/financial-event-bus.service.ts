/**
 * src/services/financial-event-bus.service.ts — Barramento Canônico de Eventos Financeiros
 * 
 * Normativa: SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA, AGENTS.md B.8, B.25
 * - Ingestão unificada de eventos financeiros de todos os domínios Waesy:
 *   WALLET, ORDERS, MOBILITY, TICKETS, TOURISM, PERSONAL_FINANCE, REWARDS
 * - Projeção para o extrato bancário unificado da conta civil
 * - Links bidirecionais de navegação para a entidade de origem
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ============================================================
// Tipos & DTOs do Event Bus
// ============================================================

export type FinancialSourceDomain =
  | "WALLET"
  | "ORDERS"
  | "MOBILITY"
  | "TICKETS"
  | "TOURISM"
  | "PERSONAL_FINANCE"
  | "REWARDS";

export interface EmitFinancialEventParams {
  profileId: string;
  sourceDomain: FinancialSourceDomain;
  sourceEntityId: string;
  eventType: string;
  direction: "INCOMING" | "OUTGOING" | "NEUTRAL";
  amountCents: number;
  counterpartyName?: string | null;
  counterpartyProfileId?: string | null;
  description: string;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  referenceUrl?: string | null;
  receiptId?: string | null;
  metadata?: Record<string, any>;
  occurredAt?: string;
}

export interface UnifiedFinancialEventDTO {
  id: string;
  profileId: string;
  sourceDomain: FinancialSourceDomain;
  sourceEntityId: string;
  eventType: string;
  direction: "INCOMING" | "OUTGOING" | "NEUTRAL";
  amountCents: number;
  counterpartyName: string | null;
  counterpartyProfileId: string | null;
  description: string;
  categoryName: string | null;
  categoryIcon: string;
  categoryColor: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  referenceUrl: string | null;
  receiptId: string | null;
  metadata: Record<string, any>;
  occurredAt: string;
  createdAt: string;
}

// ============================================================
// Emitter Interno
// ============================================================

/**
 * Emite um evento financeiro canônico persistido no banco
 */
export async function emitFinancialEvent(params: EmitFinancialEventParams): Promise<{ success: boolean; eventId?: string }> {
  try {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("financial_events")
      .insert({
        profile_id: params.profileId,
        source_domain: params.sourceDomain,
        source_entity_id: params.sourceEntityId,
        event_type: params.eventType,
        direction: params.direction,
        amount_cents: Math.abs(params.amountCents),
        counterparty_name: params.counterpartyName || null,
        counterparty_profile_id: params.counterpartyProfileId || null,
        description: params.description.trim(),
        category_name: params.categoryName || "Geral",
        category_icon: params.categoryIcon || "Receipt",
        category_color: params.categoryColor || "primary",
        status: params.status || "COMPLETED",
        reference_url: params.referenceUrl || null,
        receipt_id: params.receiptId || null,
        metadata: params.metadata || {},
        occurred_at: params.occurredAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[financial-event-bus] Falha ao persistir evento financeiro:", error);
      return { success: false };
    }

    return { success: true, eventId: data?.id };
  } catch (err: any) {
    console.error("[financial-event-bus] Erro crítico no event bus:", err.message);
    return { success: false };
  }
}

// ============================================================
// Server Functions: Feed Unificado de Extrato
// ============================================================

/**
 * Consulta o feed financeiro unificado do usuário autenticado
 * Agrega eventos de Carteira, Pedidos, Corridas Go, Ingressos e Finanças Pessoais
 */
export const listUnifiedFinancialFeed = createServerFn({ method: "GET" })
  .validator(
    z.object({
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2020).max(2100).optional(),
      sourceDomain: z
        .enum([
          "ALL",
          "WALLET",
          "ORDERS",
          "MOBILITY",
          "TICKETS",
          "TOURISM",
          "PERSONAL_FINANCE",
          "REWARDS",
        ])
        .optional(),
      direction: z.enum(["ALL", "INCOMING", "OUTGOING"]).optional(),
      query: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    })
  )
  .handler(async ({ data }): Promise<UnifiedFinancialEventDTO[]> => {
    const identity = await getServerIdentity();
    if (!identity.id) return [];

    const supabase = getServerClient();

    let qb = supabase
      .from("financial_events")
      .select("*")
      .eq("profile_id", identity.id)
      .order("occurred_at", { ascending: false });

    if (data.month && data.year) {
      const startStr = `${data.year}-${String(data.month).padStart(2, "0")}-01T00:00:00Z`;
      const lastDay = new Date(data.year, data.month, 0).getDate();
      const endStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59Z`;
      qb = qb.gte("occurred_at", startStr).lte("occurred_at", endStr);
    }

    if (data.sourceDomain && data.sourceDomain !== "ALL") {
      qb = qb.eq("source_domain", data.sourceDomain);
    }

    if (data.direction && data.direction !== "ALL") {
      qb = qb.eq("direction", data.direction);
    }

    if (data.query && data.query.trim()) {
      qb = qb.ilike("description", `%${data.query.trim()}%`);
    }

    qb = qb.limit(data.limit);

    const { data: rows, error } = await qb;

    if (error) {
      console.error("[financial-event-bus] Erro ao listar extrato unificado:", error);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      profileId: r.profile_id,
      sourceDomain: r.source_domain,
      sourceEntityId: r.source_entity_id,
      eventType: r.event_type,
      direction: r.direction,
      amountCents: Number(r.amount_cents),
      counterpartyName: r.counterparty_name || null,
      counterpartyProfileId: r.counterparty_profile_id || null,
      description: r.description,
      categoryName: r.category_name || "Geral",
      categoryIcon: r.category_icon || "Receipt",
      categoryColor: r.category_color || "primary",
      status: r.status,
      referenceUrl: r.reference_url || null,
      receiptId: r.receipt_id || null,
      metadata: r.metadata || {},
      occurredAt: r.occurred_at,
      createdAt: r.created_at,
    }));
  });
