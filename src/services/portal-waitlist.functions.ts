import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";

export const JoinPortalWaitlistSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  contactEmail: z.string().email("E-mail inválido").optional().nullable(),
  contactPhone: z.string().min(8, "Telefone é obrigatório"),
  primaryNiche: z.string().min(2, "Nicho principal é obrigatório"),
  interestedModules: z.array(z.string()).default([]),
  currentMonthlyOrders: z.number().int().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

/**
 * Inscrição na Lista VIP de Migração em 1 Clique para o Workspace Pro
 */
export const joinPortalWaitlist = createServerFn({ method: "POST" })
  .validator(JoinPortalWaitlistSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const record = {
      store_id: data.storeId || identity?.store_id || identity?.tenant_id || null,
      user_id: identity?.user_id || null,
      company_name: data.companyName,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactPhone,
      primary_niche: data.primaryNiche,
      interested_modules: data.interestedModules,
      current_monthly_orders: data.currentMonthlyOrders,
      notes: data.notes || null,
      status: "waiting",
      created_at: new Date().toISOString(),
    };

    try {
      const { data: inserted, error } = await (supabase as any)
        .from("portal_pro_waitlist")
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return { success: true, waitlistEntry: inserted || record };
    } catch (err: any) {
      logSystemError({
        route: "portal-waitlist.joinPortalWaitlist",
        contractName: "joinPortalWaitlist",
        tableName: "portal_pro_waitlist",
        error: err,
        payload: data,
      });
      throw new Error(err?.message || "Erro ao registrar inscrição na Lista VIP.");
    }
  });


/**
 * Lista empresas inscritas na Lista VIP (Curadoria Admin Master)
 */
export const listPortalWaitlist = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.isPlatformAdmin) {
      throw new Error("Acesso restrito a administradores da plataforma.");
    }

    const supabase = getServerClient();

    try {
      let query = (supabase as any)
        .from("portal_pro_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (data?.status) {
        query = query.eq("status", data.status);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      return { items: rows || [] };
    } catch {
      return { items: [] };
    }
  });
