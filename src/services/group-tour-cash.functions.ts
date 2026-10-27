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
 const { data: created, error } = await db
 .from("group_tour_cash_ledger")
 .insert({
 store_id: data.store_id,
 tour_id: data.tour_id,
 entry_type: data.entry_type,
 category: data.category,
 description: data.description.trim(),
 amount_cents: data.amount_cents,
 payment_method: data.payment_method,
 receipt_url: data.receipt_url || null,
 registered_by_profile_id: identity.id,
 occurred_at: data.occurred_at || new Date().toISOString(),
 })
 .select()
 .single();

 if (error) throw error;

 // ── Conciliação Transacional com o Caixa Central da Loja ──
 if (data.sync_with_central_cash) {
   try {
     const { data: openRegister } = await db
       .from("cash_registers")
       .select("id")
       .eq("store_id", data.store_id)
       .eq("status", "open")
       .order("opened_at", { ascending: false })
       .limit(1)
       .maybeSingle();

     if (openRegister?.id) {
       // Se foi saída da excursão com sync (ex: adiantamento de float retirado do caixa geral), gera sangria no caixa central
       // Se foi devolução de sobra (inflow na excursão), gera reforço no caixa central
       const centralEntryType = data.entry_type === "inflow" ? "cash_in" : "cash_out";
       await db.from("cash_register_entries").insert({
         cash_register_id: openRegister.id,
         amount_cents: data.amount_cents,
         entry_type: centralEntryType,
         notes: `[Conciliação Excursão] ${data.description.trim()} · Ref: #${data.tour_id.slice(0, 8)}`,
       });
     }
   } catch (syncErr) {
     console.warn("[group-tour-cash] Falha silenciosa ao sincronizar com caixa central:", syncErr);
   }
 }

 return created;
 });

export const deleteTourCashEntry = createServerFn({ method: "POST" })
 .validator(z.object({ store_id: z.string().uuid(), entry_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);
 if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
 throw new Error("Acesso não autorizado para esta organização.");
 }

 const db = getServerClient();
 const { error } = await db
 .from("group_tour_cash_ledger")
 .delete()
 .eq("id", data.entry_id)
 .eq("store_id", data.store_id);

 if (error) throw error;
 return { success: true };
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
