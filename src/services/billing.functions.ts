import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export const getStoreInvoices = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;
    if (!storeId) throw new Error("Identificador da loja não fornecido.");

    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);

    const supabase = getServerClient();
    const { data: invoices, error } = await supabase
      .from("platform_invoices")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return invoices || [];
  });

export const createInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      periodStart: z.string(),
      periodEnd: z.string(),
      platformFeeCents: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"], data.storeId);

    const supabase = getServerClient();

    // Calcula o vencimento (10 dias após o fim do período)
    const dueDate = new Date(data.periodEnd);
    dueDate.setDate(dueDate.getDate() + 10);

    const { data: invoice, error } = await supabase
      .from("platform_invoices")
      .insert({
        store_id: data.storeId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        status: "pending",
        platform_fee_cents: data.platformFeeCents,
        due_date: dueDate.toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return invoice;
  });
