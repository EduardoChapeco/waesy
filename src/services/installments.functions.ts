import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const getCustomerInstallments = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity.id) {
 throw new Error("Não autorizado");
 }

 // Find the plans for this customer
 const { data: plans, error: plansError } = await supabase
 .from("installment_plans")
 .select("*, orders(public_token)")
 .eq("customer_id", identity.id)
 .order("created_at", { ascending: false });

 if (plansError) throw new Error("Erro ao buscar carnês");

 // Load the installments for these plans
 const planIds = plans?.map((p) => p.id) || [];

 let allInstallments: any[] = [];
 if (planIds.length > 0) {
 const { data: installments } = await supabase
 .from("installments")
 .select("*")
 .in("plan_id", planIds)
 .order("due_date", { ascending: true });

 if (installments) {
 allInstallments = installments;
 }
 }

 return plans.map((p: any) => ({
 id: p.id,
 orderToken: p.orders?.public_token,
 totalCents: p.total_cents,
 status: p.status,
 createdAt: p.created_at,
 installments: allInstallments
 .filter((i) => i.plan_id === p.id)
 .map((i: any) => ({
 id: i.id,
 amountCents: i.amount_cents,
 dueDate: i.due_date,
 paidAt: i.paid_at,
 status: i.status,
 })),
 }));
});

export const getInstallmentPlans = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 // Get all installments pending or late for the store
 const { data: installments, error } = await supabase
 .from("installments")
 .select(
 "*, installment_plans!inner(store_id, customer_id, orders(public_token)), profiles:installment_plans(profiles!installment_plans_customer_id_fkey(full_name))",
 )
 .eq("installment_plans.store_id", identity.store_id)
 .order("due_date", { ascending: true });

 if (error) throw new Error("Erro ao buscar faturas");

 return installments.map((i: any) => ({
 id: i.id,
 planId: i.plan_id,
 amountCents: i.amount_cents,
 dueDate: i.due_date,
 paidAt: i.paid_at,
 status: i.status,
 customerName: i.installment_plans?.profiles?.full_name || "Cliente Desconhecido",
 orderToken: i.installment_plans?.orders?.public_token,
 }));
});

export const payInstallment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 installmentId: z.string().uuid(),
 }),
 )
 .handler(async ({ data: input }) => {
 const { installmentId } = input;
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "finance"]);

 const { data: installment, error: fetchError } = await supabase
 .from("installments")
 .select("status, plan_id, installment_plans!inner(store_id)")
 .eq("id", installmentId)
 .single();

 if (fetchError || !installment) throw new Error("Fatura não encontrada");

 // Verify store
 if ((installment.installment_plans as any).store_id !== identity.store_id) {
 throw new Error("Não autorizado para esta loja");
 }

 if (installment.status === "paid") throw new Error("Fatura já está paga");

 const { data: result, error: conciliationError } = await supabase.rpc(
 "settle_installment_atomic",
 {
 p_installment_id: installmentId,
 p_settled_by: identity.id,
 p_payment_method: "manual",
 },
 );

 if (conciliationError) throw new Error(`Erro ao conciliar a parcela: ${conciliationError.message}`);

 return { status: "success", result };
 });
