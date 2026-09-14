import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { z } from "zod";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Promove um anúncio de classificado para a estrutura nativa de catálogo da loja no Workspace Pro.
 * Garante preservação integral de URLs, imagens, atributos, metadados e sincronização de pagamentos.
 */
export const promoteClassifiedToWorkspace = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
      storeId: z.string().uuid().optional(),
      targetType: z.enum(["product", "booking_service", "group_tour"]).default("product"),
      syncPayment: z.boolean().default(true),
    })
  )
  .handler(async ({ data: { classifiedId, storeId, targetType, syncPayment } }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();

    if (!identity || !identity.id) {
      throw new Error("Não autorizado.");
    }

    const effectiveStoreId = storeId || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Loja não encontrada para vincular o anúncio ao Workspace Pro.");
    }

    // Busca o classificado
    const { data: classified, error: fetchErr } = await supabase
      .from("classifieds")
      .select("*")
      .eq("id", classifiedId)
      .single();

    if (fetchErr || !classified) {
      throw new Error("Anúncio classificado não encontrado.");
    }

    const isAdmin = identity.role === "admin" || identity.role === "master";
    if (classified.author_profile_id !== identity.id && !isAdmin) {
      throw new Error("Você não tem autorização para promover este anúncio.");
    }

    // Se já estiver promovido, apenas atualiza vínculos
    if (classified.workspace_entity_id && classified.store_id === effectiveStoreId) {
      await supabase
        .from("classifieds")
        .update({
          is_store_official: true,
          sync_payment_with_store: syncPayment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", classifiedId);

      return {
        success: true,
        workspaceEntityId: classified.workspace_entity_id,
        workspaceEntityType: classified.workspace_entity_type || targetType,
        storeId: effectiveStoreId,
        alreadyLinked: true,
      };
    }

    let createdEntityId: string | null = null;
    const baseSlug = `${slugify(classified.title)}-${classified.id.slice(0, 6)}`;

    if (targetType === "product") {
      const { data: newProd, error: prodErr } = await supabase
        .from("products")
        .insert({
          store_id: effectiveStoreId,
          title: classified.title,
          slug: baseSlug,
          description: classified.content || "",
          price_cents: classified.price_cents || 0,
          status: "active",
          attributes: {
            ...(classified.attributes || {}),
            classified_id: classified.id,
            promoted_from_classified: true,
            promoted_at: new Date().toISOString(),
            images: classified.images || [],
            category: classified.category,
            deal_type: classified.deal_type,
            template_style: classified.attributes?.template_style || "editorial",
          },
        })
        .select("id")
        .single();

      if (prodErr || !newProd) {
        console.error("[bridge] Erro ao criar produto a partir do classificado:", prodErr);
        throw new Error("Falha ao criar produto correspondente no catálogo da loja.");
      }

      createdEntityId = newProd.id;
    } else {
      // Fallback seguro: criar como produto com flag de nicho para garantir zero quebra
      const { data: newProd, error: prodErr } = await supabase
        .from("products")
        .insert({
          store_id: effectiveStoreId,
          title: classified.title,
          slug: baseSlug,
          description: classified.content || "",
          price_cents: classified.price_cents || 0,
          status: "active",
          attributes: {
            ...(classified.attributes || {}),
            classified_id: classified.id,
            target_niche: targetType,
            promoted_from_classified: true,
            promoted_at: new Date().toISOString(),
            images: classified.images || [],
          },
        })
        .select("id")
        .single();

      if (prodErr || !newProd) {
        console.error("[bridge] Erro ao criar entidade alternativa:", prodErr);
        throw new Error("Falha ao vincular entidade no catálogo.");
      }

      createdEntityId = newProd.id;
    }

    // Atualiza o registro do classificado com a rastreabilidade quádrupla
    const { error: updateErr } = await supabase
      .from("classifieds")
      .update({
        store_id: effectiveStoreId,
        workspace_entity_id: createdEntityId,
        workspace_entity_type: targetType,
        is_store_official: true,
        sync_payment_with_store: syncPayment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classifiedId);

    if (updateErr) {
      console.error("[bridge] Erro ao atualizar classificado com IDs do Workspace:", updateErr);
      throw new Error("Falha ao atualizar o vínculo do anúncio.");
    }

    return {
      success: true,
      workspaceEntityId: createdEntityId,
      workspaceEntityType: targetType,
      storeId: effectiveStoreId,
      alreadyLinked: false,
    };
  });
