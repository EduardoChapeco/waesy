import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { getDefaultCity } from "@/lib/brand.config";

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
    const { storeId = undefined } = data ?? {};
    const supabase = getServerClient();
    let targetStoreId: string | undefined = storeId;

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
    const {
      storeId = undefined,
      hasOwnCouriers = false,
      fixedDeliveryFeeCents = 0,
      freeDeliveryAboveCents = null,
      neighborhoodsRates = [],
      motoboyInstructions = null,
    } = data ?? {};
    const supabase = getServerClient();
    let targetStoreId: string | undefined = storeId;

    if (!targetStoreId) {
      const identity = await getServerIdentity().catch(() => null);
      targetStoreId = (identity?.store_id || identity?.tenant_id) ?? undefined;
    }

    if (!targetStoreId) {
      throw new Error("Identidade de loja não localizada para salvar configurações.");
    }

    const payload = {
      store_id: targetStoreId,
      has_own_couriers: hasOwnCouriers,
      fixed_delivery_fee_cents: fixedDeliveryFeeCents,
      free_delivery_above_cents: freeDeliveryAboveCents || null,
      neighborhoods_rates: neighborhoodsRates,
      motoboy_instructions: motoboyInstructions || null,
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
    const {
      storeId = undefined,
      dealId = null,
      orderId = null,
      classifiedId = null,
      customerName = "",
      customerPhone = "",
      deliveryAddress = "",
      deliveryNeighborhood = null,
      deliveryCity = null,
      deliveryFeeCents = 0,
      orderAmountCents = 0,
      paymentMethod = "pix",
      courierId = null,
      courierName = null,
      courierPhone = null,
      notes = null,
    } = data ?? {};
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    let targetStoreId = storeId || identity?.store_id || identity?.tenant_id;

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
      deal_id: dealId || null,
      order_id: orderId || null,
      classified_id: classifiedId || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: deliveryAddress,
      delivery_neighborhood: deliveryNeighborhood || null,
      delivery_city: getDefaultCity(deliveryCity),
      delivery_fee_cents: deliveryFeeCents,
      order_amount_cents: orderAmountCents,
      payment_method: paymentMethod || "pix",
      token,
      courier_id: courierId || null,
      courier_name: courierName || null,
      courier_phone: courierPhone || null,
      status: "pending",
      notes: notes || null,
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
    const { token } = data ?? {};
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone, address, city, state)
        `)
        .eq("token", token)
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
    const {
      token,
      status,
      proofPhotoUrl = null,
      confirmationPin = null,
      notes = null,
    } = data ?? {};
    const supabase = getServerClient();

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "accepted") {
      updates.accepted_at = new Date().toISOString();
    } else if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
      if (proofPhotoUrl) updates.proof_photo_url = proofPhotoUrl;
    }

    if (notes) updates.notes = notes;

    try {
      const { data: updated, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .update(updates)
        .eq("token", token)
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
    const { dealId } = data ?? {};
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone)
        `)
        .eq("deal_id", dealId)
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
    const { orderId } = data ?? {};
    const supabase = getServerClient();

    try {
      const { data: dispatch, error } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone)
        `)
        .eq("order_id", orderId)
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


// ============================================================
// Cálculo Soberano de Taxa de Entrega (Alimentado pelo PostgreSQL)
// ============================================================

export const CalculateDeliveryFeeSchema = z.object({
  storeId: z.string().uuid(),
  subtotalCents: z.number().int().nonnegative().default(0),
  deliveryMode: z.enum(["pickup", "delivery", "scheduled"]).default("delivery"),
  neighborhood: z.string().optional().nullable(),
  classifiedId: z.string().uuid().optional().nullable(),
});

export const calculateDeliveryFeeReal = createServerFn({ method: "POST" })
  .validator(CalculateDeliveryFeeSchema)
  .handler(async ({ data }) => {
    const {
      storeId,
      subtotalCents = 0,
      deliveryMode = "delivery",
      neighborhood = null,
      classifiedId = null,
    } = data ?? {};
    const supabase = getServerClient();
    try {
      const { data: res, error } = await supabase.rpc("calculate_order_delivery_fee", {
        p_store_id: storeId,
        p_subtotal_cents: subtotalCents,
        p_delivery_mode: deliveryMode === "pickup" ? "pickup" : "delivery",
        p_neighborhood: neighborhood || null,
        p_classified_id: classifiedId || null,
      });

      if (error) {
        console.warn("[company-delivery] RPC calculate_order_delivery_fee warning:", error);
        return {
          feeCents: 0,
          isFree: false,
          label: "A calcular",
          ruleApplied: "fallback",
        };
      }

      return {
        feeCents: Number(res?.fee_cents) || 0,
        isFree: Boolean(res?.is_free),
        label: String(res?.label || "Entrega Local"),
        ruleApplied: String(res?.rule_applied || "calculated"),
        manualQuote: Boolean(res?.manual_quote),
      };
    } catch (e: unknown) {
      logSystemError({ route: "company-delivery.calculateDeliveryFeeReal", error: e });
      return {
        feeCents: 0,
        isFree: false,
        label: "A calcular",
        ruleApplied: "error_fallback",
      };
    }
  });
