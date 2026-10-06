import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireFinance, requireManager, requireOwner } from "@/lib/server-access";

export const TravelCommissionScopeSchema = z.enum([
  "global",
  "store",
  "collaborator",
  "group",
  "excursion",
]);
export type TravelCommissionScope = z.infer<typeof TravelCommissionScopeSchema>;

const RuleInputSchema = z.object({
  id: z.string().uuid().optional(),
  scope: TravelCommissionScopeSchema,
  beneficiaryProfileId: z.string().uuid().optional().nullable(),
  groupTourId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(3),
  basis: z.enum(["gross", "net", "margin"]).default("gross"),
  ratePercent: z.number().min(0).max(100).default(0),
  fixedAmountCents: z.number().int().min(0).default(0),
  priority: z.number().int().min(0).max(10000).default(100),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  conditions: z.record(z.any()).default({}),
});

export const listTravelCommissionRules = createServerFn({ method: "GET" })
  .handler(async () => {
    const identity = await requireManager();
    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("travel_commission_rules")
      .select("*")
      .or(`store_id.eq.${identity.store_id},store_id.is.null`)
      .order("scope", { ascending: true })
      .order("priority", { ascending: true });
    if (error) throw new Error(`Erro ao listar regras de comissão: ${error.message}`);
    return data || [];
  });

export const saveTravelCommissionRule = createServerFn({ method: "POST" })
  .validator(RuleInputSchema)
  .handler(async ({ data }) => {
    const identity = data.scope === "global" ? await requireOwner() : await requireManager();
    if (data.scope === "global" && data.beneficiaryProfileId) {
      throw new Error("Regra global não pode ter beneficiário específico.");
    }
    if (["group", "excursion"].includes(data.scope) && !data.groupTourId) {
      throw new Error("Regra de grupo/excursão exige o grupo ou excursão.");
    }
    if (data.scope === "collaborator" && !data.beneficiaryProfileId) {
      throw new Error("Regra de colaborador exige o beneficiário.");
    }

    const supabase = getServerClient();
    const payload = {
      store_id: data.scope === "global" ? null : identity.store_id,
      scope: data.scope,
      beneficiary_profile_id: data.beneficiaryProfileId || null,
      group_tour_id: data.groupTourId || null,
      name: data.name,
      basis: data.basis,
      rate_percent: data.ratePercent,
      fixed_amount_cents: data.fixedAmountCents,
      priority: data.priority,
      valid_from: data.validFrom || new Date().toISOString(),
      valid_until: data.validUntil || null,
      is_active: data.isActive,
      conditions: data.conditions,
      created_by_profile_id: identity.id,
      updated_at: new Date().toISOString(),
    };

    const query = data.id
      ? supabase.from("travel_commission_rules").update(payload).eq("id", data.id)
      : supabase.from("travel_commission_rules").insert(payload);
    const { data: saved, error } = await query.select().single();
    if (error) throw new Error(`Erro ao salvar regra de comissão: ${error.message}`);

    await supabase.from("travel_commission_audit").insert({
      store_id: identity.store_id,
      actor_profile_id: identity.id,
      action: data.id ? "rule_updated" : "rule_created",
      after_snapshot: saved,
      correlation_id: `rule:${saved.id}`,
    });
    return saved;
  });

export const calculateTravelSaleCommissions = createServerFn({ method: "POST" })
  .validator(z.object({
    saleId: z.string().uuid(),
    beneficiaryProfileId: z.string().uuid().optional().nullable(),
    groupTourId: z.string().uuid().optional().nullable(),
    idempotencyKey: z.string().min(8).optional(),
  }))
  .handler(async ({ data }) => {
    const identity = await requireManager();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("calculate_travel_sale_commissions", {
      p_sale_id: data.saleId,
      p_beneficiary_profile_id: data.beneficiaryProfileId || null,
      p_group_tour_id: data.groupTourId || null,
      p_idempotency_key: data.idempotencyKey || `commission:${identity.store_id}:${data.saleId}`,
    });
    if (error) throw new Error(`Erro ao calcular comissão: ${error.message}`);
    return result;
  });

export const listTravelCommissionAllocations = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().optional(), limit: z.number().int().min(1).max(200).default(100) }).default({}))
  .handler(async ({ data }) => {
    const identity = await requireManager();
    const supabase = getServerClient();
    let query = supabase
      .from("travel_commission_allocations")
      .select("*, travel_commission_rules(name, scope), travel_sales(proposal_id, trip_id, total_cents)")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao listar comissões: ${error.message}`);
    return rows || [];
  });

export const settleTravelCommission = createServerFn({ method: "POST" })
  .validator(z.object({ allocationId: z.string().uuid(), reason: z.string().trim().min(5) }))
  .handler(async ({ data }) => {
    const identity = await requireFinance();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("settle_travel_commission", {
      p_allocation_id: data.allocationId,
      p_idempotency_key: `commission-payout:${identity.store_id}:${data.allocationId}`,
      p_reason: data.reason,
    });
    if (error) throw new Error(`Erro ao liquidar comissão: ${error.message}`);
    return result;
  });

export const listTravelCommissionAudit = createServerFn({ method: "GET" })
  .validator(z.object({ allocationId: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).default(100) }).default({}))
  .handler(async ({ data }) => {
    const identity = await requireManager();
    const supabase = getServerClient();
    let query = supabase
      .from("travel_commission_audit")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.allocationId) query = query.eq("allocation_id", data.allocationId);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao consultar auditoria de comissão: ${error.message}`);
    return rows || [];
  });
