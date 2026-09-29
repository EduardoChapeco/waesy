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
  created_at?: string;
}

export const UserAddressInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().default("Principal"),
  recipient_name: z.string().optional().nullable(),
  recipient_phone: z.string().optional().nullable(),
  zipcode: z.string().min(8),
  street: z.string().min(2),
  number: z.string().min(1),
  complement: z.string().optional().nullable(),
  reference_point: z.string().optional().nullable(),
  neighborhood: z.string().min(2),
  city: z.string().min(2),
  state: z.string().length(2),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  is_default: z.boolean().default(false),
  is_apartment: z.boolean().default(false),
  block_tower: z.string().optional().nullable(),
  intercom_code: z.string().optional().nullable(),
});

/**
 * Obtém todos os endereços salvos do usuário autenticado.
 * Consulta prioritariamente a tabela relacional `user_addresses`.
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
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[addresses.functions] Falha ao ler user_addresses, consultando perfil:", error.message);
        // Fallback defensivo para profiles.resume_data
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
 * Salva ou atualiza um endereço do usuário com geolocalização e especificações de condomínio.
 */
export const saveUserAddress = createServerFn({ method: "POST" })
  .validator(UserAddressInputSchema)
  .handler(async ({ data: input }): Promise<{ success: boolean; address: UserAddressDTO }> => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();

    // Se marcado como padrão, desmarca os anteriores
    if (input.is_default) {
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", identity.id);
    }

    const payload = {
      user_id: identity.id,
      label: input.label || "Principal",
      recipient_name: input.recipient_name || null,
      recipient_phone: input.recipient_phone || null,
      zipcode: input.zipcode.replace(/\D/g, ""),
      street: input.street,
      number: input.number,
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
      return { success: true, address: data as UserAddressDTO };
    } else {
      const { data, error } = await supabase
        .from("user_addresses")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw new Error("Erro ao cadastrar endereço: " + error.message);
      return { success: true, address: data as UserAddressDTO };
    }
  });

/**
 * Remove um endereço do usuário com isolamento estrito.
 */
export const deleteUserAddress = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Acesso não autorizado.");

    const supabase = getServerClient();
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", identity.id);

    if (error) throw new Error("Erro ao remover endereço: " + error.message);
    return { success: true };
  });

/**
 * Validação de Mismatch de GPS entre a localização atual do dispositivo e o endereço de entrega.
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
      maxAllowedThresholdKm: z.number().default(35), // Alerta quando a distância for superior a 35km
    })
  )
  .handler(async ({ data: input }) => {
    // Se não tiver coordenadas do endereço, tenta usar coordenadas padrão da cidade
    let targetLat = input.deliveryLat;
    let targetLng = input.deliveryLng;

    // Coordenadas aproximadas de referência para Chapecó / SC
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

    // Fórmula de Haversine
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Raio da Terra em km

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
