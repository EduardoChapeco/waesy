import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";

// ============================================================
// Schemas Zod
// ============================================================

export const NeighborhoodRateSchema = z.object({
  neighborhood: z.string().min(1, "Nome do bairro é obrigatório"),
  fee_cents: z.number().int().nonnegative("Valor em centavos deve ser positivo"),
  active: z.boolean().default(true),
});

export const SaveDeliverySettingsSchema = z.object({
  storeId: z.string().uuid().optional(),
  hasOwnCouriers: z.boolean().default(false),
  fixedDeliveryFeeCents: z.number().int().nonnegative().default(0),
  freeDeliveryAboveCents: z.number().int().nonnegative().nullable().optional(),
  neighborhoodsRates: z.array(NeighborhoodRateSchema).default([]),
  motoboyInstructions: z.string().optional().nullable(),
});

export const CreateDispatchSchema = z.object({
  storeId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  classifiedId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(2, "Nome do cliente é obrigatório"),
  customerPhone: z.string().min(8, "Telefone do cliente é obrigatório"),
  deliveryAddress: z.string().min(5, "Endereço completo é obrigatório"),
  deliveryNeighborhood: z.string().optional().nullable(),
  deliveryCity: z.string().optional().nullable(),
  deliveryFeeCents: z.number().int().nonnegative().default(0),
  orderAmountCents: z.number().int().nonnegative().default(0),
  paymentMethod: z.string().optional().nullable(),
  courierId: z.string().uuid().optional().nullable(),
  courierName: z.string().optional().nullable(),
  courierPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateDispatchStatusSchema = z.object({
  token: z.string().min(5),
  status: z.enum(["accepted", "picked_up", "delivered", "failed", "cancelled"]),
  proofPhotoUrl: z.string().url().optional().nullable(),
  confirmationPin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const GetDispatchByDealSchema = z.object({
  dealId: z.string().uuid(),
});

export const GetDispatchByOrderSchema = z.object({
  orderId: z.string().uuid(),
});

// ============================================================
// Funções de Contrato BFF
// ============================================================

/**
 * Busca configurações de entrega de uma empresa
 */
export const getCompanyDeliverySettings = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let targetStoreId: string | undefined = data?.storeId;

    if (!targetStoreId) {
      const identity = await getServerIdentity().catch(() => null);
      targetStoreId = (identity?.store_id || identity?.tenant_id) ?? undefined;
    }

    if (!targetStoreId) {
      return {
        settings: {
          has_own_couriers: false,
          fixed_delivery_fee_cents: 0,
          free_delivery_above_cents: null,
          neighborhoods_rates: [],
          motoboy_instructions: null,
        },
      };
    }

    try {
      const { data: row } = await (supabase as any)
        .from("company_delivery_settings")
        .select("*")
        .eq("store_id", targetStoreId)
        .maybeSingle();

      return {
        settings: row || {
          has_own_couriers: false,
          fixed_delivery_fee_cents: 0,
          free_delivery_above_cents: null,
          neighborhoods_rates: [],
          motoboy_instructions: null,
        },
      };
    } catch {
      return {
        settings: {
          has_own_couriers: false,
          fixed_delivery_fee_cents: 0,
          free_delivery_above_cents: null,
          neighborhoods_rates: [],
          motoboy_instructions: null,
        },
      };
    }
  });

/**
 * Salva ou atualiza taxas de entrega da empresa
 */
export const saveCompanyDeliverySettings = createServerFn({ method: "POST" })
  .validator(SaveDeliverySettingsSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let targetStoreId: string | undefined = data.storeId;

    if (!targetStoreId) {
      const identity = await getServerIdentity().catch(() => null);
      targetStoreId = (identity?.store_id || identity?.tenant_id) ?? undefined;
    }

    if (!targetStoreId) {
      throw new Error("Identidade de loja não localizada para salvar configurações.");
    }

    const payload = {
      store_id: targetStoreId,
      has_own_couriers: data.hasOwnCouriers,
      fixed_delivery_fee_cents: data.fixedDeliveryFeeCents,
      free_delivery_above_cents: data.freeDeliveryAboveCents || null,
      neighborhoods_rates: data.neighborhoodsRates,
      motoboy_instructions: data.motoboyInstructions || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: saved, error } = await (supabase as any)
        .from("company_delivery_settings")
        .upsert(payload, { onConflict: "store_id" })
        .select()
        .single();

      if (error) throw error;
      return { success: true, settings: saved };
    } catch (err: any) {
      logSystemError({
        route: "company-delivery.saveCompanyDeliverySettings",
        contractName: "saveCompanyDeliverySettings",
        tableName: "company_delivery_settings",
        error: err,
        payload: data,
      });
      throw new Error(err?.message || "Erro ao salvar configurações de entrega.");
    }
  });


/**
 * Cria um despacho de entrega gerando o token do Magic Link para o entregador
 */
export const createDeliveryDispatch = createServerFn({ method: "POST" })
  .validator(CreateDispatchSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let targetStoreId = data.storeId || identity?.store_id || identity?.tenant_id;

    if (!targetStoreId) {
      throw new Error("Identidade de loja não localizada para despachar entrega.");
    }
    if (identity && targetStoreId !== identity.store_id && targetStoreId !== identity.tenant_id && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    // Gerar token opaco e PIN de 4 dígitos
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const token = `disp_${Date.now().toString(36)}_${randomSuffix}`;
    const confirmationPin = Math.floor(1000 + Math.random() * 9000).toString();

    const dispatchRecord = {
      store_id: targetStoreId,
      deal_id: data.dealId || null,
      order_id: data.orderId || null,
      classified_id: data.classifiedId || null,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      delivery_address: data.deliveryAddress,
      delivery_neighborhood: data.deliveryNeighborhood || null,
      delivery_city: data.deliveryCity || "Chapecó",
      delivery_fee_cents: data.deliveryFeeCents,
      order_amount_cents: data.orderAmountCents,
      payment_method: data.paymentMethod || "pix",
      token,
      courier_id: data.courierId || null,
      courier_name: data.courierName || null,
      courier_phone: data.courierPhone || null,
      status: "pending",
      notes: data.notes || null,
      confirmation_pin: confirmationPin,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: created, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .insert(dispatchRecord)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        dispatch: created || dispatchRecord,
        magicLinkUrl: `/entrega/${token}`,
        confirmationPin,
      };
    } catch {
      return {
        success: true,
        dispatch: dispatchRecord,
        magicLinkUrl: `/entrega/${token}`,
        confirmationPin,
        fallback: true,
      };
    }
  });

/**
 * Consulta pública de despacho via Token do Magic Link (para o celular do motoboy)
 */
export const getDispatchByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(5) }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone, address, city, state)
        `)
        .eq("token", data.token)
        .maybeSingle();

      if (error || !dispatch) {
        return { dispatch: null };
      }

      return { dispatch };
    } catch {
      return { dispatch: null };
    }
  });

/**
 * Atualiza status da entrega via Magic Link pelo entregador
 */
export const updateDispatchStatusByToken = createServerFn({ method: "POST" })
  .validator(UpdateDispatchStatusSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const updates: Record<string, any> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.status === "accepted") {
      updates.accepted_at = new Date().toISOString();
    } else if (data.status === "delivered") {
      updates.delivered_at = new Date().toISOString();
      if (data.proofPhotoUrl) updates.proof_photo_url = data.proofPhotoUrl;
    }

    if (data.notes) updates.notes = data.notes;

    try {
      const { data: updated, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .update(updates)
        .eq("token", data.token)
        .select()
        .single();

      if (error) throw error;
      return { success: true, dispatch: updated };
    } catch (err: any) {
      logSystemError({
        route: "company-delivery.updateDeliveryCourierStatus",
        contractName: "updateDeliveryCourierStatus",
        tableName: "classified_delivery_dispatches",
        error: err,
        payload: data,
      });
      throw new Error(err?.message || "Erro ao atualizar status do despacho.");
    }
  });


/**
 * Consulta o despacho ativo de entrega vinculado a um Deal
 */
export const getDispatchByDealId = createServerFn({ method: "GET" })
  .validator(GetDispatchByDealSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone)
        `)
        .eq("deal_id", data.dealId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !dispatch) {
        return { dispatch: null };
      }

      return { dispatch };
    } catch {
      return { dispatch: null };
    }
  });

/**
 * Consulta o despacho ativo de entrega vinculado a um Pedido de E-commerce
 */
export const getDispatchByOrderId = createServerFn({ method: "GET" })
  .validator(GetDispatchByOrderSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone)
        `)
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !dispatch) {
        return { dispatch: null };
      }

      return { dispatch };
    } catch {
      return { dispatch: null };
    }
  });
