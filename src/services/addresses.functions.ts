import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export interface UserAddressDTO {
  id: string;
  user_id?: string;
  label: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  zipcode: string;
  street: string;
  number: string;
  has_no_number?: boolean;
  complement?: string | null;
  reference_point?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  is_apartment?: boolean;
  block_tower?: string | null;
  intercom_code?: string | null;
  address_type?: "residential" | "commercial" | "rural" | "other";
  icon?: "home" | "building" | "briefcase" | "heart" | "map_pin";
  instructions?: string | null;
  formatted_address?: string | null;
  created_at?: string;
}

export const UserAddressInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().default("Principal"),
    recipient_name: z.string().optional().nullable(),
    recipient_phone: z.string().optional().nullable(),
    zipcode: z.string().min(8, "CEP deve conter pelo menos 8 dígitos"),
    street: z.string().min(2, "Logradouro é obrigatório"),
    number: z.string().default(""),
    has_no_number: z.boolean().default(false),
    complement: z.string().optional().nullable(),
    reference_point: z.string().optional().nullable(),
    neighborhood: z.string().min(2, "Bairro é obrigatório"),
    city: z.string().min(2, "Cidade é obrigatória"),
    state: z.string().length(2, "UF deve ter 2 caracteres"),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    is_default: z.boolean().default(false),
    is_apartment: z.boolean().default(false),
    block_tower: z.string().optional().nullable(),
    intercom_code: z.string().optional().nullable(),
    address_type: z.enum(["residential", "commercial", "rural", "other"]).default("residential"),
    icon: z.enum(["home", "building", "briefcase", "heart", "map_pin"]).default("home"),
    instructions: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.has_no_number && (!data.number || data.number.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Número é obrigatório quando não marcado 'Sem número'",
        path: ["number"],
      });
    }
  });

/**
 * Obtém todos os endereços salvos e ativos do usuário autenticado (EARS-01 / EARS-06).
 */
export const getUserAddresses = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserAddressDTO[]> => {
    try {
      const identity = await getServerIdentity();
      if (!identity.id) return [];

      const supabase = getServerClient();
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", identity.id)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[addresses.functions] Falha ao ler user_addresses, consultando perfil:", error.message);
        const { data: profile } = await supabase
          .from("profiles")
          .select("resume_data")
          .eq("id", identity.id)
          .maybeSingle();

        const legacyAddresses: any[] = (profile?.resume_data as any)?.addresses || [];
        return legacyAddresses.map((a: any) => ({
          id: a.id || crypto.randomUUID(),
          label: a.label || "Principal",
          zipcode: a.zipcode || "",
          street: a.street || "",
          number: a.number || "",
          complement: a.complement || null,
          neighborhood: a.neighborhood || "",
          city: a.city || "",
          state: a.state || "",
          is_default: Boolean(a.is_default),
        }));
      }

      return (data || []) as UserAddressDTO[];
    } catch (e) {
      console.error("[addresses.functions] getUserAddresses error:", e);
      return [];
    }
  }
);

/**
 * Salva ou atualiza um endereço com atomicidade e garantia de default único (EARS-01 / EARS-04).
 */
export const saveUserAddress = createServerFn({ method: "POST" })
  .validator(UserAddressInputSchema)
  .handler(async ({ data: input }): Promise<{ success: boolean; address: UserAddressDTO }> => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();

    const effectiveNumber = input.has_no_number || !input.number?.trim() ? "S/N" : input.number.trim();

    // 1. Tenta executar via procedure atômica
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("save_user_address_atomic", {
      p_id: input.id || null,
      p_user_id: identity.id,
      p_label: input.label || "Principal",
      p_recipient_name: input.recipient_name || null,
      p_recipient_phone: input.recipient_phone || null,
      p_zipcode: input.zipcode,
      p_street: input.street,
      p_number: effectiveNumber,
      p_complement: input.complement || null,
      p_reference_point: input.reference_point || null,
      p_neighborhood: input.neighborhood,
      p_city: input.city,
      p_state: input.state,
      p_latitude: input.latitude || null,
      p_longitude: input.longitude || null,
      p_is_default: input.is_default,
      p_is_apartment: input.is_apartment,
      p_block_tower: input.block_tower || null,
      p_intercom_code: input.intercom_code || null,
      p_address_type: input.address_type,
      p_icon: input.icon,
      p_instructions: input.instructions || null,
      p_has_no_number: input.has_no_number || false,
    });

    if (!rpcErr && rpcRes?.success && rpcRes.address) {
      return { success: true, address: rpcRes.address as UserAddressDTO };
    }

    // Fallback relacional seguro caso a procedure ainda não tenha sido aplicada no ambiente
    if (input.is_default) {
      await supabase
        .from("user_addresses")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("user_id", identity.id);
    }

    const payload = {
      user_id: identity.id,
      label: input.label || "Principal",
      recipient_name: input.recipient_name || null,
      recipient_phone: input.recipient_phone || null,
      zipcode: input.zipcode.replace(/\D/g, ""),
      street: input.street,
      number: effectiveNumber,
      has_no_number: input.has_no_number || false,
      complement: input.complement || null,
      reference_point: input.reference_point || null,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state.toUpperCase(),
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      is_default: input.is_default,
      is_apartment: input.is_apartment,
      block_tower: input.block_tower || null,
      intercom_code: input.intercom_code || null,
      address_type: input.address_type,
      icon: input.icon,
      instructions: input.instructions || null,
      formatted_address: `${input.street}, ${effectiveNumber} - ${input.neighborhood}, ${input.city} - ${input.state.toUpperCase()}`,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("user_addresses")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", identity.id)
        .select()
        .single();

      if (error) throw new Error("Erro ao atualizar endereço: " + error.message);

      // Trilha de Auditoria Estruturada (GAP-4.8)
      try {
        await supabase.from("system_audit_logs").insert({
          action: "user_address_updated",
          user_id: identity.id,
          table_name: "user_addresses",
          record_id: data.id,
          payload: { city: input.city, state: input.state, is_default: input.is_default },
        });
      } catch (auditErr) {
        console.warn("[addresses.functions] Falha não impeditiva no audit log:", auditErr);
      }

      return { success: true, address: data as UserAddressDTO };
    } else {
      const { data, error } = await supabase
        .from("user_addresses")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw new Error("Erro ao cadastrar endereço: " + error.message);

      // Trilha de Auditoria Estruturada (GAP-4.8)
      try {
        await supabase.from("system_audit_logs").insert({
          action: "user_address_created",
          user_id: identity.id,
          table_name: "user_addresses",
          record_id: data.id,
          payload: { city: input.city, state: input.state, is_default: input.is_default },
        });
      } catch (auditErr) {
        console.warn("[addresses.functions] Falha não impeditiva no audit log:", auditErr);
      }

      return { success: true, address: data as UserAddressDTO };
    }
  });

/**
 * Remove um endereço do usuário com soft-delete e eleição atômica de novo padrão (EARS-04 / EARS-06).
 */
export const deleteUserAddress = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();

    // 1. Tenta procedure atômica
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("delete_user_address_atomic", {
      p_id: id,
      p_user_id: identity.id,
    });

    if (!rpcErr && rpcRes?.success) {
      return { success: true, new_default_id: rpcRes.new_default_id };
    }

    // Fallback direto
    const { error } = await supabase
      .from("user_addresses")
      .update({ deleted_at: new Date().toISOString(), is_default: false })
      .eq("id", id)
      .eq("user_id", identity.id);

    if (error) throw new Error("Erro ao remover endereço: " + error.message);

    // Trilha de Auditoria Estruturada (GAP-4.8)
    try {
      await supabase.from("system_audit_logs").insert({
        action: "user_address_deleted",
        user_id: identity.id,
        table_name: "user_addresses",
        record_id: id,
        payload: { deleted_at: new Date().toISOString() },
      });
    } catch (auditErr) {
      console.warn("[addresses.functions] Falha não impeditiva no audit log:", auditErr);
    }

    return { success: true };
  });

/**
 * Define um endereço existente como predefinido (EARS-04).
 */
export const setDefaultUserAddress = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();

    // 1. Tenta procedure atômica
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("set_default_user_address_atomic", {
      p_id: id,
      p_user_id: identity.id,
    });

    if (!rpcErr && rpcRes?.success) {
      return { success: true, default_id: rpcRes.default_id };
    }

    // Fallback relacional
    await supabase
      .from("user_addresses")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", identity.id)
      .is("deleted_at", null);

    const { error } = await supabase
      .from("user_addresses")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", identity.id)
      .is("deleted_at", null);

    if (error) throw new Error("Erro ao definir endereço predefinido: " + error.message);

    return { success: true, default_id: id };
  });

/**
 * Atualização rápida de indicações para o entregador / condomínio (EARS-06 / Paridade Mercado Livre).
 */
export const updateAddressInstructions = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      instructions: z.string().optional().nullable(),
      reference_point: z.string().optional().nullable(),
      intercom_code: z.string().optional().nullable(),
      block_tower: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();

    const { id, instructions, reference_point, intercom_code, block_tower } = input;

    // 1. Tenta procedure atômica
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("update_address_instructions_atomic", {
      p_id: id,
      p_user_id: identity.id,
      p_instructions: instructions || null,
      p_reference_point: reference_point || null,
      p_intercom_code: intercom_code || null,
      p_block_tower: block_tower || null,
    });

    if (!rpcErr && rpcRes?.success && rpcRes.address) {
      return { success: true, address: rpcRes.address as UserAddressDTO };
    }

    // Fallback relacional
    const { data, error } = await supabase
      .from("user_addresses")
      .update({
        instructions: instructions || null,
        reference_point: reference_point || null,
        intercom_code: intercom_code || null,
        block_tower: block_tower || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", identity.id)
      .select()
      .single();

    if (error) throw new Error("Erro ao salvar indicações do endereço: " + error.message);

    return { success: true, address: data as UserAddressDTO };
  });

/**
 * Validação de Mismatch de GPS entre a localização atual do dispositivo e o endereço de entrega (EARS-05).
 * Usa fórmula esférica de Haversine para cálculo de raio geodésico em quilômetros.
 */
export const validateDeliveryLocationGPS = createServerFn({ method: "POST" })
  .validator(
    z.object({
      deviceLat: z.number(),
      deviceLng: z.number(),
      deliveryLat: z.number().optional().nullable(),
      deliveryLng: z.number().optional().nullable(),
      deliveryCity: z.string().optional(),
      deliveryState: z.string().optional(),
      maxAllowedThresholdKm: z.number().default(35),
    })
  )
  .handler(async ({ data: input }) => {
    let targetLat = input.deliveryLat;
    let targetLng = input.deliveryLng;

    if (!targetLat || !targetLng) {
      if (input.deliveryCity?.toLowerCase().includes("chapeco") || input.deliveryCity?.toLowerCase().includes("chapecó")) {
        targetLat = -27.1004;
        targetLng = -52.6152;
      }
    }

    if (!targetLat || !targetLng) {
      return {
        isMismatch: false,
        distanceKm: 0,
        message: "Coordenadas de entrega não disponíveis para comparação geográfica.",
      };
    }

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(targetLat - input.deviceLat);
    const dLon = toRad(targetLng - input.deviceLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(input.deviceLat)) * Math.cos(toRad(targetLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.round(R * c * 10) / 10;

    const isMismatch = distanceKm > input.maxAllowedThresholdKm;

    return {
      isMismatch,
      distanceKm,
      message: isMismatch
        ? `A sua localização atual difere do endereço de entrega selecionado (~${distanceKm} km de distância). Confirma este pedido?`
        : "Localização validada com sucesso.",
    };
  });
