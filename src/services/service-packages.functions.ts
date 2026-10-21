/**
 * BFF Server Functions para Pacotes de Serviços, Passes de Aulas e Multi-Agenda
 * Conectado às tabelas service_packages, customer_service_passes, service_pass_ledger, booking_appointments, orders
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { resolveTenantStoreId } from "@/lib/server-access";

// --- SCHEMAS ---

export const ServicePackageSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  title: z.string().min(2, "Título é obrigatório"),
  description: z.string().nullable().optional(),
  total_credits: z.number().int().min(1, "Deve ter pelo menos 1 crédito/sessão"),
  price_cents: z.number().int().min(0, "Preço inválido"),
  validity_days: z.number().int().min(1).default(30),
  is_recurring: z.boolean().default(false),
  recurrence_interval: z.enum(["weekly", "biweekly", "monthly"]).default("monthly"),
  max_reschedules_per_credit: z.number().int().default(2),
  is_active: z.boolean().default(true),
});

export const BookWithPassSchema = z.object({
  pass_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  resource_id: z.string().uuid().optional(),
  guest_name: z.string().optional(),
  guest_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const AdjustPassCreditsSchema = z.object({
  pass_id: z.string().uuid(),
  credits_delta: z.number().int().refine((val) => val !== 0, "O delta deve ser diferente de zero"),
  reason: z.string().min(3, "Justificativa obrigatória para auditoria"),
});

export const MarkAppointmentNoShowSchema = z.object({
  appointment_id: z.string().uuid(),
  penalty_applied: z.boolean().default(true),
  reason: z.string().optional(),
});

// --- HELPER DTO TYPES ---

export interface CustomerPassEnrichedDTO {
  id: string;
  store_id: string;
  customer_id: string;
  package_id: string | null;
  order_id: string | null;
  total_credits: number;
  remaining_credits: number;
  reserved_credits: number;
  completed_credits: number;
  available_credits: number;
  expires_at: string;
  status: "active" | "exhausted" | "expired" | "paused";
  auto_renew: boolean;
  package_snapshot: {
    title: string;
    description: string | null;
    service_id?: string;
    service_title?: string;
    duration_minutes?: number;
    price_cents: number;
    validity_days: number;
    total_credits: number;
  } | null;
  unit_price_cents: number | null;
  notes: string | null;
  created_at: string;
  service_packages?: {
    id: string;
    title: string;
    description: string | null;
    validity_days: number;
    booking_services?: {
      id: string;
      title: string;
      duration_minutes: number;
    } | null;
  } | null;
  stores?: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
  } | null;
  customer_profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  upcoming_appointments: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    session_number: number | null;
    check_in_at: string | null;
    notes: string | null;
  }>;
  service_pass_ledger: Array<{
    id: string;
    movement_type: string;
    credits_delta: number;
    balance_after: number;
    reason: string | null;
    created_at: string;
  }>;
}

// --- SERVER FUNCTIONS ---

/**
 * Lista pacotes públicos de serviços/aulas disponíveis em uma loja.
 */
export const listPublicStorePackages = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    try {
      const supabase = getServerClient();
      let storeId = data?.store_id;

      if (!storeId) {
        const resolved = await resolveTenantStoreId().catch(() => null);
        storeId = resolved || undefined;
      }

      let query = supabase
        .from("service_packages")
        .select(
          `
          id,
          title,
          description,
          total_credits,
          price_cents,
          validity_days,
          is_recurring,
          recurrence_interval,
          is_active,
          booking_services (
            id,
            title,
            duration_minutes,
            price_cents
          ),
          stores (
            id,
            name,
            slug,
            avatar_url
          )
        `,
        )
        .eq("is_active", true)
        .order("price_cents", { ascending: true });

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      return rows || [];
    } catch (e: any) {
      console.error("[service-packages] listPublicStorePackages error:", e);
      return [];
    }
  });

/**
 * Retorna todos os passes e pacotes do cliente logado com conciliação estrita de créditos (EARS-03 / B.25).
 */
export const getMyCustomerPasses = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerPassEnrichedDTO[]> => {
  try {
    const identity = await getServerIdentity();
    if (!identity?.id) return [];

    const supabase = getServerClient();
    const { data: rawPasses, error } = await supabase
      .from("customer_service_passes")
      .select(
        `
        id,
        store_id,
        customer_id,
        package_id,
        order_id,
        total_credits,
        remaining_credits,
        expires_at,
        status,
        auto_renew,
        package_snapshot,
        unit_price_cents,
        notes,
        created_at,
        service_packages (
          id,
          title,
          description,
          validity_days,
          booking_services (
            id,
            title,
            duration_minutes
          )
        ),
        stores (
          id,
          name,
          slug,
          avatar_url
        ),
        service_pass_ledger (
          id,
          movement_type,
          credits_delta,
          balance_after,
          reason,
          created_at
        ),
        booking_appointments (
          id,
          scheduled_at,
          status,
          session_number,
          notes,
          check_in_at
        )
      `,
      )
      .eq("customer_id", identity.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!rawPasses) return [];

    const now = new Date();

    return rawPasses.map((p: any) => {
      const appointments = (p.booking_appointments || []) as Array<any>;
      
      // Sessões futuras ativas reservam créditos:
      const activeReservations = appointments.filter((app) => 
        (app.status === "confirmed" || app.status === "pending") &&
        !app.check_in_at &&
        new Date(app.scheduled_at) >= now
      );

      // Sessões concluídas ou com check-in:
      const completedSessions = appointments.filter((app) =>
        app.status === "completed" || !!app.check_in_at
      );

      const reservedCredits = activeReservations.length;
      const completedCredits = completedSessions.length;
      const availableCredits = Math.max(0, p.remaining_credits);

      // Ordenar agendamentos futuros cronologicamente
      const upcoming = activeReservations.sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );

      return {
        id: p.id,
        store_id: p.store_id,
        customer_id: p.customer_id,
        package_id: p.package_id,
        order_id: p.order_id,
        total_credits: p.total_credits,
        remaining_credits: p.remaining_credits,
        reserved_credits: reservedCredits,
        completed_credits: completedCredits,
        available_credits: availableCredits,
        expires_at: p.expires_at,
        status: p.status,
        auto_renew: p.auto_renew,
        package_snapshot: p.package_snapshot || null,
        unit_price_cents: p.unit_price_cents || null,
        notes: p.notes || null,
        created_at: p.created_at,
        service_packages: p.service_packages,
        stores: p.stores,
        upcoming_appointments: upcoming,
        service_pass_ledger: (p.service_pass_ledger || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      };
    });
  } catch (e: any) {
    console.error("[service-packages] getMyCustomerPasses error:", e);
    return [];
  }
});

/**
 * Workspace: Lista todos os pacotes configurados na loja.
 */
export const listWorkspacePackages = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const storeId = identity.store_id || (await resolveTenantStoreId());
  if (!storeId) throw new Error("Loja não selecionada.");

  const supabase = getServerClient();
  const { data: packages, error } = await supabase
    .from("service_packages")
    .select(
      `
      *,
      booking_services (
        id,
        title,
        duration_minutes,
        price_cents
      )
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return packages || [];
});

/**
 * Workspace: Lista passes ativos e histórico de clientes da loja (EARS-06).
 */
export const listWorkspaceCustomerPasses = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
  const storeId = identity.store_id || (await resolveTenantStoreId());
  if (!storeId) throw new Error("Loja não selecionada.");

  const supabase = getServerClient();
  const { data: passes, error } = await supabase
    .from("customer_service_passes")
    .select(
      `
      id,
      store_id,
      customer_id,
      package_id,
      order_id,
      total_credits,
      remaining_credits,
      expires_at,
      status,
      auto_renew,
      package_snapshot,
      unit_price_cents,
      notes,
      created_at,
      service_packages (
        id,
        title,
        description,
        booking_services (
          id,
          title
        )
      ),
      profiles:customer_id (
        id,
        full_name,
        avatar_url,
        phone
      ),
      booking_appointments (
        id,
        scheduled_at,
        status,
        session_number,
        check_in_at
      )
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar passes de clientes: ${error.message}`);
  return passes || [];
});

/**
 * Workspace: Extrato auditável unificado de movimentos de ledger da loja (EARS-03 / EARS-06).
 */
export const listWorkspacePassLedger = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);
  const storeId = identity.store_id || (await resolveTenantStoreId());
  if (!storeId) throw new Error("Loja não selecionada.");

  const supabase = getServerClient();
  const { data: ledger, error } = await supabase
    .from("service_pass_ledger")
    .select(
      `
      id,
      pass_id,
      appointment_id,
      movement_type,
      credits_delta,
      balance_after,
      reason,
      created_at,
      customer_service_passes!inner (
        id,
        store_id,
        customer_id,
        total_credits,
        package_snapshot,
        service_packages (
          title
        ),
        profiles:customer_id (
          full_name,
          phone
        )
      )
    `,
    )
    .eq("customer_service_passes.store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Erro ao listar extrato de pacotes: ${error.message}`);
  return ledger || [];
});

/**
 * Workspace: Ajuste manual de saldo de créditos com justificativa auditada (EARS-03 / EARS-06).
 */
export const adjustCustomerPassCredits = createServerFn({ method: "POST" })
  .validator(AdjustPassCreditsSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const storeId = identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Loja não selecionada.");

    const supabase = getServerClient();

    // Validar se o passe pertence à loja
    const { data: pass, error: passErr } = await supabase
      .from("customer_service_passes")
      .select("id, store_id, remaining_credits")
      .eq("id", input.pass_id)
      .single();

    if (passErr || !pass || pass.store_id !== storeId) {
      throw new Error("Passe não encontrado ou não pertence a esta unidade.");
    }

    const { data: result, error } = await supabase.rpc("adjust_service_pass_credits", {
      p_pass_id: input.pass_id,
      p_credits_delta: input.credits_delta,
      p_reason: input.reason.trim(),
    });

    if (error) {
      throw new Error(`Falha no ajuste de créditos: ${error.message}`);
    }

    return result;
  });

/**
 * Workspace: Registrar no-show com penalidade de crédito ou cortesia (EARS-05).
 */
export const markAppointmentNoShow = createServerFn({ method: "POST" })
  .validator(MarkAppointmentNoShowSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const storeId = identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Loja não selecionada.");

    const supabase = getServerClient();

    // Validar agendamento
    const { data: appt, error: apptErr } = await supabase
      .from("booking_appointments")
      .select("id, store_id, pass_id")
      .eq("id", input.appointment_id)
      .single();

    if (apptErr || !appt || appt.store_id !== storeId) {
      throw new Error("Agendamento não encontrado nesta loja.");
    }

    const { data: result, error } = await supabase.rpc("mark_appointment_no_show", {
      p_appointment_id: input.appointment_id,
      p_penalty_applied: input.penalty_applied,
      p_reason: input.reason || "Não comparecimento do cliente (No-show)",
    });

    if (error) {
      throw new Error(`Falha ao registrar no-show: ${error.message}`);
    }

    return result;
  });

/**
 * Workspace: Salva (cria ou atualiza) um pacote de serviços.
 */
export const saveServicePackage = createServerFn({ method: "POST" })
  .validator(ServicePackageSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const storeId = identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Loja não selecionada.");

    const supabase = getServerClient();
    const payload = {
      store_id: storeId,
      service_id: input.service_id,
      title: input.title.trim(),
      description: input.description || null,
      total_credits: input.total_credits,
      price_cents: input.price_cents,
      validity_days: input.validity_days,
      is_recurring: input.is_recurring,
      recurrence_interval: input.recurrence_interval,
      max_reschedules_per_credit: input.max_reschedules_per_credit,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data: updated, error } = await supabase
        .from("service_packages")
        .update(payload)
        .eq("id", input.id)
        .eq("store_id", storeId)
        .select()
        .single();

      if (error) throw new Error(`Erro ao atualizar pacote: ${error.message}`);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("service_packages")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(`Erro ao criar pacote: ${error.message}`);
      return created;
    }
  });

/**
 * Workspace: Deleta um pacote de serviços.
 */
export const deleteServicePackage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const storeId = identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Loja não selecionada.");

    const supabase = getServerClient();
    const { error } = await supabase
      .from("service_packages")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId);

    if (error) throw new Error(`Erro ao remover pacote: ${error.message}`);
    return { success: true };
  });

/**
 * Agendamento Atômico utilizando Crédito de Passe (EARS-04).
 */
export const bookAppointmentWithPass = createServerFn({ method: "POST" })
  .validator(BookWithPassSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Você precisa estar autenticado para utilizar seus passes de aulas.");
    }

    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("redeem_service_pass_credit", {
      p_pass_id: input.pass_id,
      p_customer_id: identity.id,
      p_scheduled_at: input.scheduled_at,
      p_resource_id: input.resource_id || null,
      p_guest_name: input.guest_name || (identity as any).name || (identity as any).email || null,
      p_guest_phone: input.guest_phone || null,
      p_notes: input.notes || null,
    });

    if (error) {
      throw new Error(`Falha ao agendar sessão: ${error.message}`);
    }

    return result;
  });

/**
 * Cancelamento e Reembolso do Crédito para o Passe do Cliente (EARS-05).
 */
export const cancelAppointmentAndRefundPass = createServerFn({ method: "POST" })
  .validator(z.object({ appointment_id: z.string().uuid(), reason: z.string().optional() }))
  .handler(async ({ data: { appointment_id, reason } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Acesso negado.");
    }

    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("refund_service_pass_credit", {
      p_appointment_id: appointment_id,
      p_user_id: identity.id,
      p_reason: reason || "Cancelamento tempestivo solicitado pelo cliente",
    });

    if (error) {
      throw new Error(`Erro ao cancelar agendamento: ${error.message}`);
    }

    return result;
  });

/**
 * Workspace / Staff: Check-in de presença na sessão/aula (EARS-04).
 */
export const checkInAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ appointment_id: z.string().uuid() }))
  .handler(async ({ data: { appointment_id } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
    const storeId = identity.store_id || (await resolveTenantStoreId());
    if (!storeId) throw new Error("Loja não encontrada.");

    const supabase = getServerClient();
    const { data: updated, error } = await supabase
      .from("booking_appointments")
      .update({
        check_in_at: new Date().toISOString(),
        check_in_by: identity.id,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment_id)
      .eq("store_id", storeId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao registrar presença: ${error.message}`);
    return updated;
  });

/**
 * Compra Direta de Pacote de Aulas/Serviços com emissão imediata do Pedido e Passe com Snapshot Imutável (EARS-01 / EARS-02).
 */
export const buyServicePackageDirect = createServerFn({ method: "POST" })
  .validator(
    z.object({
      package_id: z.string().uuid(),
      payment_method: z.enum(["pix", "credit_card", "manual"]),
      customer_name: z.string().min(2),
      customer_phone: z.string().min(8),
    }),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Você precisa estar conectado com sua conta para adquirir pacotes.");
    }

    const supabase = getServerClient();

    // 1. Busca dados do pacote e serviço
    const { data: pkg, error: pkgErr } = await supabase
      .from("service_packages")
      .select(`
        *,
        booking_services (
          id,
          title,
          duration_minutes
        ),
        stores (
          id,
          name
        )
      `)
      .eq("id", input.package_id)
      .eq("is_active", true)
      .single();

    if (pkgErr || !pkg) throw new Error("Pacote não encontrado ou inativo.");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);

    // 2. Snapshot imutável contratado (EARS-02)
    const packageSnapshot = {
      title: pkg.title,
      description: pkg.description,
      service_id: pkg.service_id,
      service_title: pkg.booking_services?.title || "Serviço",
      duration_minutes: pkg.booking_services?.duration_minutes || 60,
      price_cents: pkg.price_cents,
      validity_days: pkg.validity_days,
      total_credits: pkg.total_credits,
      purchased_at: new Date().toISOString(),
      payment_method: input.payment_method,
    };

    const unitPriceCents = Math.round(pkg.price_cents / pkg.total_credits);

    // 3. Criar Pedido Comercial rastreável (orders)
    let orderId: string | null = null;
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert({
        store_id: pkg.store_id,
        customer_id: identity.id,
        status: "paid",
        payment_method: input.payment_method,
        total_cents: pkg.price_cents,
        delivery_type: "in_store",
        delivery_address: {
          recipient_name: input.customer_name,
          phone: input.customer_phone,
          notes: `Pacote de Serviços: ${pkg.title}`,
        },
      })
      .select("id")
      .single();

    if (!orderErr && orderData) {
      orderId = orderData.id;
    }

    // 4. Emite o Passe do Cliente amarrado ao Pedido e ao Snapshot Imutável
    const { data: pass, error: passErr } = await supabase
      .from("customer_service_passes")
      .insert({
        store_id: pkg.store_id,
        customer_id: identity.id,
        package_id: pkg.id,
        order_id: orderId,
        total_credits: pkg.total_credits,
        remaining_credits: pkg.total_credits,
        expires_at: expiresAt.toISOString(),
        status: "active",
        auto_renew: pkg.is_recurring,
        package_snapshot: packageSnapshot,
        unit_price_cents: unitPriceCents,
        notes: `Adquirido via ${input.payment_method.toUpperCase()}`,
      })
      .select()
      .single();

    if (passErr || !pass) throw new Error(`Falha ao emitir passe: ${passErr?.message}`);

    // 5. Registra concessão no Ledger imutável (EARS-03)
    await supabase.from("service_pass_ledger").insert({
      pass_id: pass.id,
      movement_type: "credit_grant",
      credits_delta: pkg.total_credits,
      balance_after: pkg.total_credits,
      reason: `Compra do pacote "${pkg.title}" via ${input.payment_method.toUpperCase()} (Pedido #${orderId?.substring(0, 8) || "N/A"})`,
    });

    return {
      success: true,
      pass_id: pass.id,
      order_id: orderId,
      package_title: pkg.title,
      total_credits: pkg.total_credits,
      unit_price_cents: unitPriceCents,
      expires_at: expiresAt.toISOString(),
    };
  });
