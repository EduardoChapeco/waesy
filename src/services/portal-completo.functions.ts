import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { logSystemError } from "@/lib/logger";

export const getPortalCompletoContent = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    try {
      const { data, error } = await supabase
        .from("portal_completo_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (data && !error) {
        return data;
      }
    } catch (e) {
      console.warn("[portal-completo] Fallback acionado:", e);
    }

    return {
      id: "default",
      hero_title: "Evolua sua Gestão com o Waesy Pro",
      hero_subtitle: "Módulos avançados de PDV, Estoque, Logística, Turismo e Relatórios desenhados para o seu crescimento.",
      video_url: null,
      feature_modules: [
        {
          id: "pdv",
          title: "PDV e Comandas Ágeis",
          desc: "Operação de balcão, mesas, pedidos rápidos e integração fiscal.",
          icon: "Receipt",
        },
        {
          id: "estoque",
          title: "Controle de Estoque e Grade",
          desc: "Gestão de variações, estoque mínimo, alertas automáticos e insumos.",
          icon: "Package",
        },
        {
          id: "logistica",
          title: "Logística e Frota MotoLink",
          desc: "Roteirização inteligente, despacho em tempo real e tracking de entregadores.",
          icon: "Truck",
        },
        {
          id: "turismo",
          title: "Operação Turística Completa",
          desc: "Kanban de embarque, gestão de passageiros, quartos e emissão de vouchers.",
          icon: "Plane",
        },
        {
          id: "financeiro",
          title: "Gestão Financeira e Split",
          desc: "Contas a pagar/receber, conciliação Pix e split de pagamentos automático.",
          icon: "Wallet",
        },
        {
          id: "equipe",
          title: "Gestão de Equipe e Permissões",
          desc: "RBAC granular por colaborador, pontos de atendimento e auditoria de ações.",
          icon: "Users",
        },
      ],
    };
  });

export const UpdatePortalCompletoContentSchema = z.object({
  hero_title: z.string().min(5),
  hero_subtitle: z.string().min(10),
  video_url: z.string().nullable().optional(),
  feature_modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      desc: z.string(),
      icon: z.string().optional(),
    })
  ).optional(),
});

export const updatePortalCompletoContent = createServerFn({ method: "POST" })
  .validator(UpdatePortalCompletoContentSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id || !["admin", "master", "system_admin"].includes(identity.role || "")) {
      throw new Error("Acesso negado. Apenas administradores podem atualizar esta página.");
    }

    const { data: updated, error } = await supabase
      .from("portal_completo_settings")
      .upsert({
        id: "default",
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        video_url: data.video_url || null,
        feature_modules: data.feature_modules || [],
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao salvar configurações do portal: " + error.message);
    }

    return { success: true, settings: updated };
  });

export const listWorkspaceWaitlist = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id || !["admin", "master", "system_admin"].includes(identity.role || "")) {
      throw new Error("Acesso negado.");
    }

    const { data, error } = await supabase
      .from("workspace_pro_waitlist")
      .select("*, stores(id, name, logo_url, phone, city)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[portal-completo] Erro ao listar waitlist:", error);
      return [];
    }

    return data || [];
  });

export const MigrateCompanyToFullWorkspaceSchema = z.object({
  waitlistId: z.string().uuid(),
  storeId: z.string().uuid(),
});

export const migrateCompanyToFullWorkspace = createServerFn({ method: "POST" })
  .validator(MigrateCompanyToFullWorkspaceSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id || !["admin", "master", "system_admin"].includes(identity.role || "")) {
      throw new Error("Acesso negado.");
    }

    // 1. Marcar status da waitlist como migrated
    await supabase
      .from("workspace_pro_waitlist")
      .update({ status: "migrated", updated_at: new Date().toISOString() })
      .eq("id", data.waitlistId);

    // 2. Atualizar store settings com flag pro_modules_enabled
    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", data.storeId)
      .single();

    const currentSettings = store?.settings || {};
    await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          pro_modules_enabled: true,
          migrated_at: new Date().toISOString(),
        },
      })
      .eq("id", data.storeId);

    return { success: true };
  });

export const RegisterWorkspaceProWaitlistSchema = z.object({
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  contactEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  contactWhatsapp: z.string().min(8, "WhatsApp é obrigatório"),
  niche: z.string().default("servicos"),
  notes: z.string().optional(),
});

export const registerWorkspaceProWaitlist = createServerFn({ method: "POST" })
  .validator(RegisterWorkspaceProWaitlistSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const record = {
      store_id: identity?.store_id || identity?.tenant_id || null,
      user_id: identity?.id || null,
      company_name: data.companyName,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactWhatsapp,
      primary_niche: data.niche,
      interested_modules: [],
      current_monthly_orders: 0,
      notes: data.notes || null,
      status: "waiting",
      created_at: new Date().toISOString(),
    };

    try {
      const { data: inserted, error } = await (supabase as any)
        .from("workspace_pro_waitlist")
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return { success: true, waitlistEntry: inserted || record };
    } catch (err: any) {
      logSystemError({
        route: "portal-completo.joinWorkspaceProWaitlist",
        contractName: "joinWorkspaceProWaitlist",
        tableName: "workspace_pro_waitlist",
        error: err,
        payload: data,
      });
      throw new Error(err?.message || "Erro ao registrar interesse no Workspace Pro.");
    }
  });


