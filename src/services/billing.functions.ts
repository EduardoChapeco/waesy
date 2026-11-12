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

export function buildPlatformInvoiceInsertRow(data: {
  storeId: string;
  periodStart: string;
  periodEnd: string;
  platformFeeCents: number;
  description?: string;
  notes?: string | null;
}) {
  const dueDate = new Date(data.periodEnd);
  dueDate.setDate(dueDate.getDate() + 10);

  return {
    store_id: data.storeId,
    description:
      data.description?.trim() ||
      `Fatura da Plataforma (${data.periodStart} a ${data.periodEnd})`,
    amount_cents: data.platformFeeCents,
    status: "pending" as const,
    due_date: dueDate.toISOString(),
    notes: data.notes ?? null,
  };
}

export const createInvoice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      periodStart: z.string(),
      periodEnd: z.string(),
      platformFeeCents: z.number().int().min(0),
      description: z.string().max(240).optional(),
      notes: z.string().max(1000).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"], data.storeId);

    const supabase = getServerClient();
    const row = buildPlatformInvoiceInsertRow(data);

    const { data: invoice, error } = await supabase
      .from("platform_invoices")
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return invoice;
  });
