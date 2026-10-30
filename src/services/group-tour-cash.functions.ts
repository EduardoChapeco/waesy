import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export interface TourCashEntryItem {
 id: string;
 tour_id: string;
 store_id: string;
 entry_type: "inflow" | "outflow";
 category: string;
 description: string;
 amount_cents: number;
 payment_method: "cash" | "pix" | "corporate_card" | "other";
 receipt_url?: string | null;
 occurred_at: string;
 created_at: string;
  central_cash_register_entry_id?: string | null;
  reversal_of_id?: string | null;
  reversal_reason?: string | null;
  reversed_at?: string | null;
}

export const CreateCashEntrySchema = z.object({
 store_id: z.string().uuid(),
 tour_id: z.string().uuid(),
 entry_type: z.enum(["inflow", "outflow"]),
 category: z.string().min(2),
 description: z.string().min(2, "Descrição obrigatória"),
 amount_cents: z.number().int().positive("Valor deve ser maior que zero"),
 payment_method: z.enum(["cash", "pix", "corporate_card", "other"]).default("cash"),
 receipt_url: z.string().optional().nullable(),
 occurred_at: z.string().optional(),
 sync_with_central_cash: z.boolean().optional().default(false),
  idempotency_key: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listTourCashEntries = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid(), tour_id: z.string().uuid() }))
 .handler(async ({ data }): Promise<TourCashEntryItem[]> => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: entries, error } = await db
 .from("group_tour_cash_ledger")
 .select("*")
 .eq("tour_id", data.tour_id)
 .eq("store_id", data.store_id)
 .order("occurred_at", { ascending: false });

 if (error) throw error;
 return entries || [];
 });

export const createTourCashEntry = createServerFn({ method: "POST" })
 .validator(CreateCashEntrySchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);
 if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
 throw new Error("Acesso não autorizado para esta organização.");
 }

 const db = getServerClient();
 const { data: result, error } = await db.rpc("record_group_tour_cash_entry", {
   p_store_id: data.store_id,
   p_tour_id: data.tour_id,
   p_entry_type: data.entry_type,
   p_category: data.category,
   p_description: data.description.trim(),
   p_amount_cents: data.amount_cents,
   p_payment_method: data.payment_method,
   p_receipt_url: data.receipt_url || null,
   p_occurred_at: data.occurred_at || null,
   p_sync_with_central_cash: data.sync_with_central_cash,
   p_idempotency_key: data.idempotency_key,
   p_actor_id: identity.id,
   p_actor_role: identity.role || "authenticated_user",
 });

 if (error) throw new Error(`Não foi possível registrar o caixa da excursão: ${error.message}`);
 const entry = (result as { entry?: TourCashEntryItem } | null)?.entry;
 if (!entry) throw new Error("O caixa não retornou o lançamento persistido.");
 return entry;
 });

export const deleteTourCashEntry = createServerFn({ method: "POST" })
 .validator(z.object({ store_id: z.string().uuid(), entry_id: z.string().uuid(), reason: z.string().optional(), idempotency_key: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);
 if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
 throw new Error("Acesso não autorizado para esta organização.");
 }

 const db = getServerClient();
 const { data: result, error } = await db.rpc("reverse_group_tour_cash_entry", {
   p_store_id: data.store_id,
   p_entry_id: data.entry_id,
   p_reason: data.reason || "Estorno solicitado pelo operador",
   p_idempotency_key: data.idempotency_key,
   p_actor_id: identity.id,
   p_actor_role: identity.role || "authenticated_user",
 });

 if (error) throw new Error(`Não foi possível estornar o lançamento: ${error.message}`);
 return result as { success: boolean; replayed?: boolean; entry?: TourCashEntryItem };
 });

export const getTourCashSummary = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid(), tour_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);
 if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
 throw new Error("Acesso não autorizado para esta organização.");
 }

 const db = getServerClient();
 const { data: entries, error } = await db
 .from("group_tour_cash_ledger")
 .select("entry_type, category, amount_cents")
 .eq("tour_id", data.tour_id)
 .eq("store_id", data.store_id);

 if (error) throw error;

 let totalInflowsCents = 0;
 let totalOutflowsCents = 0;
 const categoryTotals: Record<string, number> = {};

 (entries || []).forEach((e) => {
 if (e.entry_type === "inflow") {
 totalInflowsCents += e.amount_cents;
 } else {
 totalOutflowsCents += e.amount_cents;
 categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount_cents;
 }
 });

 const currentBalanceCents = totalInflowsCents - totalOutflowsCents;

 // ── Cálculo de DRE e Lucratividade Real da Excursão ──
 const { data: tour } = await db
   .from("tourism_experiences")
   .select("price_cents, base_price_cents, seats")
   .eq("id", data.tour_id)
   .maybeSingle();

 const pricePerSeat = Number(tour?.price_cents || tour?.base_price_cents || 0);
 const seatsList = Array.isArray(tour?.seats) ? tour.seats : [];
 const occupiedSeatsCount = seatsList.filter((s: any) => s.status === "reserved" || s.is_occupied).length;
 const totalRevenueCents = pricePerSeat * occupiedSeatsCount;

 const totalOperatingCostsCents = totalOutflowsCents;
 const grossProfitCents = totalRevenueCents - totalOperatingCostsCents;
 const marginPercentage = totalRevenueCents > 0
   ? Math.round((grossProfitCents / totalRevenueCents) * 100)
   : 0;

 return {
 totalInflowsCents,
 totalOutflowsCents,
 currentBalanceCents,
 categoryTotals,
 profitability: {
   totalRevenueCents,
   totalOperatingCostsCents,
   grossProfitCents,
   marginPercentage,
   occupiedSeatsCount,
   pricePerSeat,
 },
 };
 });
