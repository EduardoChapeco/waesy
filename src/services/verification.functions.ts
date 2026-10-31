import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";

async function requirePlatformAdmin() {
  const identity = await getServerIdentity();
  if (!identity.id) {
    throw new Error("Não autenticado. Por favor, faça login.");
  }

  if (identity.role === "platform_admin" || identity.role === "master") {
    return identity;
  }

  const db = getServerClient();
  const { data: p } = await db
    .from("profiles")
    .select("role")
    .eq("id", identity.id)
    .maybeSingle();

  if (p?.role === "platform_admin" || p?.role === "master") {
    return { ...identity, role: "platform_admin" };
  }

  throw new Error("Acesso restrito. Somente o Admin Master tem autoridade para verificar entidades ou alterar selos.");
}

const ToggleUserVerificationSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  isVerified: z.boolean(),
  badgeUrl: z.string().nullable().optional(),
});

export const adminToggleUserVerification = createServerFn({ method: "POST" })
  .validator((data: unknown) => ToggleUserVerificationSchema.parse(data))
  .handler(async ({ data }) => {
    const { userId, isVerified, badgeUrl } = data;
    await requirePlatformAdmin();
    const db = getServerClient();

    const updatePayload: Record<string, any> = {
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };

    if (badgeUrl !== undefined) {
      updatePayload.verified_badge_url = badgeUrl;
    }

    const { data: updated, error } = await db
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id, full_name, username, is_verified, verified_badge_url")
      .single();

    if (error) {
      throw new Error(`Falha ao alterar status de verificação: ${error.message}`);
    }

    return {
      success: true,
      user: updated,
    };
  });

const ToggleStoreVerificationSchema = z.object({
  storeId: z.string().uuid("ID do estabelecimento inválido"),
  isVerified: z.boolean(),
  badgeUrl: z.string().nullable().optional(),
});

export const adminToggleStoreVerification = createServerFn({ method: "POST" })
  .validator((data: unknown) => ToggleStoreVerificationSchema.parse(data))
  .handler(async ({ data }) => {
    const { storeId, isVerified, badgeUrl } = data;
    await requirePlatformAdmin();
    const db = getServerClient();

    const updatePayload: Record<string, any> = {
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };

    if (badgeUrl !== undefined) {
      updatePayload.verified_badge_url = badgeUrl;
    }

    const { data: updated, error } = await db
      .from("stores")
      .update(updatePayload)
      .eq("id", storeId)
      .select("id, name, is_verified, verified_badge_url")
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar verificação da empresa: ${error.message}`);
    }

    return {
      success: true,
      store: updated,
    };
  });

const RegisterVerificationBadgeSchema = z.object({
  name: z.string().min(2, "Nome do selo é obrigatório"),
  badgeUrl: z.string().url("URL do selo inválida"),
  badgeType: z.enum(["official", "store", "creator", "partner"]).default("official"),
});

export const adminRegisterVerificationBadge = createServerFn({ method: "POST" })
  .validator((data: unknown) => RegisterVerificationBadgeSchema.parse(data))
  .handler(async ({ data }) => {
    const { name, badgeUrl, badgeType } = data;
    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    const { data: badge, error } = await db
      .from("platform_verification_badges")
      .insert({
        name,
        badge_url: badgeUrl,
        badge_type: badgeType,
        uploaded_by: admin.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao registrar selo oficial: ${error.message}`);
    }

    return {
      success: true,
      badge,
    };
  });
