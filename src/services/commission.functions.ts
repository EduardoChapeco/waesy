import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

export const listCommissions = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "seller"]);

 let query = supabase
 .from("commissions")
 .select(
 "*, orders(public_token, total_cents), profiles!commissions_employee_id_fkey(full_name)",
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 // Se for apenas seller, restringe às próprias comissões
 if (identity.role === "seller") {
 query = query.eq("employee_id", identity.id);
 }

 const { data: commissions, error } = await query;
 if (error) throw new Error("Erro ao buscar comissões");

 return commissions.map((c) => ({
 id: c.id,
 amountCents: c.amount_cents,
 status: c.status,
 createdAt: c.created_at,
 paidAt: c.paid_at,
 orderToken: c.orders?.public_token,
 orderTotal: c.orders?.total_cents,
 sellerName: c.profiles?.full_name || "Vendedor desconhecido",
 }));
});

export const payCommission = createServerFn({ method: "POST" })
 .validator(
 z.object({
 commissionId: z.string().uuid(),
 }),
 )
 .handler(async ({ data: { commissionId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const { error } = await supabase
 .from("commissions")
 .update({
 status: "paid",
 paid_at: new Date().toISOString(),
 })
 .eq("id", commissionId)
 .eq("store_id", identity.store_id)
 .eq("status", "pending");

 if (error) throw new Error("Erro ao pagar comissão");

  // ── Ledger Criptográfico SHA-256 — Desembolso de Comissão ──
  try {
  await recordLedgerEntryCore({
    transactionType: "commission_payout",
    storeId: identity.store_id,
    referenceEntityType: "commission",
    referenceEntityId: commissionId,
    actorId: identity.id,
    actorRole: identity.role ?? "admin",
    metadata: { commission_id: commissionId, action: "single_payout" },
  });
  } catch (ledgerErr) {
  console.error("[commission.functions] Falha no ledger de comissão:", ledgerErr);
  }

 return { status: "success" };
 });

export const payAllPendingCommissionsForSeller = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sellerId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: { sellerId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    const { data: updated, error } = await supabase
      .from("commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("employee_id", sellerId)
      .eq("store_id", identity.store_id)
      .eq("status", "pending")
      .select("id, amount_cents");

    if (error) throw new Error("Erro ao quitar comissões do vendedor: " + error.message);
    const count = updated?.length || 0;
    const totalSettledCents = (updated || []).reduce((sum, item) => sum + (item.amount_cents || 0), 0);

    // ── Ledger Criptográfico SHA-256 — Lote de Comissões Quitadas ──
    if (totalSettledCents > 0) {
      try {
        await recordLedgerEntryCore({
          transactionType: "commission_payout",
          amountCents: totalSettledCents,
          storeId: identity.store_id,
          receiverId: sellerId,
          actorId: identity.id,
          actorRole: identity.role ?? "admin",
          metadata: { seller_id: sellerId, commission_count: count, action: "bulk_payout" },
        });
      } catch (ledgerErr) {
        console.error("[commission.functions] Falha no ledger em lote:", ledgerErr);
      }
    }

    return {
      status: "success",
      count,
      totalSettledCents,
    };
  });

export const listSellers = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { data: members, error } = await supabase
 .from("workspace_members")
 .select("profile_id, role, profiles(id, full_name, commission_rate)")
 .eq("store_id", identity.store_id)
 .in("role", ["seller", "manager"]);

 const sellers =
 members
 ?.map((m) => ({
 id: m.profile_id,
 role: m.role,
 full_name: (m.profiles as any)?.full_name || "",
 commission_rate: (m.profiles as any)?.commission_rate || 0,
 }))
 .sort((a, b) => a.full_name.localeCompare(b.full_name)) || [];

 if (error) throw new Error("Erro ao buscar equipe de vendas");
 return sellers;
});

export const updateSellerCommissionRate = createServerFn({ method: "POST" })
 .validator(
 z.object({
 sellerId: z.string().uuid(),
 rate: z.number().min(0).max(100),
 }),
 )
 .handler(async ({ data: { sellerId, rate } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 // Ensure the target seller belongs to the same store
 const { data: target, error: checkError } = await supabase
 .from("workspace_members")
 .select("store_id")
 .eq("profile_id", sellerId)
 .eq("store_id", identity.store_id)
 .single();

 if (checkError || target.store_id !== identity.store_id) {
 throw new Error("Vendedor não encontrado ou não pertence a esta loja.");
 }

 const { error } = await supabase
 .from("profiles")
 .update({ commission_rate: rate })
 .eq("id", sellerId);

 if (error) throw new Error("Erro ao atualizar taxa de comissão");
 return { status: "success" };
 });

export const getTripCommissionDetails = createServerFn({ method: "GET" })
  .validator(z.object({ tripId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const supabase = getServerClient();
      const identity = await getServerIdentity();
      const [commRes, suppliersRes] = await Promise.all([
        supabase.from("trip_commissions").select("*").eq("trip_id", data.tripId).maybeSingle(),
        supabase.from("travel_suppliers").select("id, name").eq("store_id", identity.store_id || "").limit(50),
      ]);
      return {
        commission: commRes.data || null,
        suppliers: suppliersRes.data || [],
      };
    } catch {
      return { commission: null, suppliers: [] };
    }
  });

export const saveTripCommission = createServerFn({ method: "POST" })
  .validator(z.object({
    tripId: z.string(),
    payload: z.record(z.any()),
  }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const { data: existing } = await supabase.from("trip_commissions").select("id").eq("trip_id", data.tripId).maybeSingle();
    if (existing) {
      const { data: updated, error } = await supabase.from("trip_commissions").update(data.payload).eq("id", existing.id).select().single();
      if (error) throw error;
      return updated;
    } else {
      const { data: created, error } = await supabase.from("trip_commissions").insert({ ...data.payload, trip_id: data.tripId, store_id: identity.store_id }).select().single();
      if (error) throw error;
      return created;
    }
  });
