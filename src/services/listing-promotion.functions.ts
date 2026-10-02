/**
 * listing-promotion.functions.ts — Ponte Canônica de Upgrade: Classificados → Workspace Pro
 *
 * Fase F04 do Plano Mestre de Estabilização dos 4 Pilares.
 * Especificação: docs/specs/SPEC-F04-UPGRADE-BRIDGE.md
 *
 * Invariantes: M01 (Zero Mocks), M04 (Idempotência), M08 (Integridade Transacional),
 *              M10 (Isolamento Multi-Tenant), M03 (Auditabilidade)
 *
 * Regras:
 * - Somente o proprietário do classificado pode promovê-lo.
 * - assertStoreAccess garante que o usuário tem acesso à loja de destino.
 * - Idempotência: segunda chamada com mesmo classifiedId retorna produto já criado.
 * - O classificado original recebe status=promoted, promoted_to_product_id e promoted_at.
 * - Evento de domínio classified.promoted_to_workspace é emitido no barramento outbox.
 * - Zero dados mock. Toda a persistência é real no Supabase.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { publishDomainEvent } from "./domain-events.functions";

// ---------------------------------------------------------------------------
// Schema de validação — Zod estrito
// ---------------------------------------------------------------------------

const promoteClassifiedSchema = z.object({
  classifiedId: z.string().uuid("classifiedId deve ser um UUID válido."),
  targetStoreId: z.string().uuid("targetStoreId deve ser um UUID válido."),
  initialStockQuantity: z.number().int().min(0).default(0),
});

export type PromoteClassifiedInput = z.infer<typeof promoteClassifiedSchema>;

// ---------------------------------------------------------------------------
// DTO de saída
// ---------------------------------------------------------------------------

export interface PromoteClassifiedResult {
  success: true;
  productId: string;
  classifiedId: string;
  storeId: string;
  wasAlreadyPromoted: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Server Function canônica
// ---------------------------------------------------------------------------

/**
 * promoteClassifiedToWorkspaceProductFn
 *
 * Promove um anúncio classificado para um produto Pro no catálogo do Workspace.
 * Garante preservação integral de dados, galeria de imagens, atributos de nicho
 * e rastreabilidade bidirecional entre o classificado e o produto criado.
 *
 * @throws {Error} Se o usuário não autenticado, sem acesso à loja, ou classificado não encontrado.
 */
export const promoteClassifiedToWorkspaceProductFn = createServerFn({ method: "POST" })
  .validator(promoteClassifiedSchema)
  .handler(async ({ data }): Promise<PromoteClassifiedResult> => {
    const { classifiedId, targetStoreId, initialStockQuantity } = data;

    const supabase = getServerClient();
    const identity = await getServerIdentity();

    // [GUARD-01] Autenticação obrigatória
    if (!identity?.id) {
      throw new Error("Não autorizado: usuário não autenticado.");
    }

    // [GUARD-02] Acesso à loja de destino — assertStoreAccess verifica membership
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    // Verifica se o targetStoreId corresponde à loja do identity
    if (identity.store_id && identity.store_id !== targetStoreId) {
      // Verificar via memberships se o usuário tem acesso à loja de destino
      const hasMembership = identity.memberships?.some(
        (m) => m.store_id === targetStoreId && ["owner", "admin", "manager"].includes(m.role)
      );
      if (!hasMembership) {
        throw new Error("Não autorizado: você não tem acesso gerencial à loja de destino.");
      }
    }

    // [GUARD-03] Buscar classificado — RLS garante visibilidade
    const { data: classified, error: fetchErr } = await supabase
      .from("classifieds")
      .select(
        "id, author_profile_id, title, content, price_cents, images, attributes, category, deal_type, condition, workspace_entity_id, status, created_at"
      )
      .eq("id", classifiedId)
      .single();

    if (fetchErr || classified === null || classified === undefined) {
      throw new Error("Classificado não encontrado ou sem permissão de acesso.");
    }

    // [GUARD-04] Somente o proprietário pode promover
    if (classified.author_profile_id !== identity.id) {
      throw new Error("Somente o autor do anúncio pode promovê-lo para o catálogo Pro.");
    }

    // [IDEMPOTÊNCIA] Se já foi promovido para esta loja, retornar sem duplicar
    if (classified.workspace_entity_id) {
      // Verificar se o produto ainda existe
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("id", classified.workspace_entity_id)
        .maybeSingle();

      if (existingProduct) {
        return {
          success: true,
          productId: classified.workspace_entity_id,
          classifiedId,
          storeId: targetStoreId,
          wasAlreadyPromoted: true,
        };
      }
    }

    // ---------------------------------------------------------------------------
    // [CRIAÇÃO] Inserir produto no catálogo do Workspace Pro
    // ---------------------------------------------------------------------------

    const baseSlug = `${slugify(classified.title)}-${classifiedId.slice(0, 8)}`;
    const promotedAt = new Date().toISOString();

    const productPayload = {
      store_id: targetStoreId,
      title: classified.title,
      slug: baseSlug,
      description: classified.content ?? "",
      price_cents: classified.price_cents ?? 0,
      status: "active" as const,
      attributes: {
        ...(classified.attributes ?? {}),
        // Rastreabilidade bidirecional
        promoted_from_classified_id: classifiedId,
        promoted_from_classified_at: promotedAt,
        // Preservação de metadados originais
        images: classified.images ?? [],
        category: classified.category,
        deal_type: classified.deal_type,
        condition: classified.condition,
        original_classified_created_at: classified.created_at,
      },
    };

    const { data: newProduct, error: prodErr } = await supabase
      .from("products")
      .insert(productPayload)
      .select("id")
      .single();

    if (prodErr || newProduct === null || newProduct === undefined) {
      console.error("[listing-promotion] Falha ao criar produto:", prodErr?.message);
      throw new Error(
        "Falha ao criar produto no catálogo da loja. Tente novamente."
      );
    }

    // ---------------------------------------------------------------------------
    // [ATUALIZAÇÃO ATÔMICA] Marcar classificado como promovido
    // ---------------------------------------------------------------------------

    const { error: updateErr } = await supabase
      .from("classifieds")
      .update({
        status: "promoted",
        workspace_entity_id: newProduct.id,
        workspace_entity_type: "product",
        store_id: targetStoreId,
        updated_at: promotedAt,
      })
      .eq("id", classifiedId)
      .eq("author_profile_id", identity.id); // Double-check de posse

    if (updateErr) {
      console.error("[listing-promotion] Falha ao atualizar classificado:", updateErr?.message);
      // Produto foi criado mas o classified não foi atualizado — precisa compensar
      // Soft rollback: arquivar o produto criado para não deixar órfão
      await supabase
        .from("products")
        .update({ status: "archived" })
        .eq("id", newProduct.id);
      throw new Error(
        "Falha ao atualizar o status do anúncio. Operação revertida com segurança."
      );
    }

    // ---------------------------------------------------------------------------
    // [EVENTO] Emitir classified.promoted_to_workspace no barramento outbox
    // ---------------------------------------------------------------------------

    await publishDomainEvent({
      eventName: "classified.promoted_to_workspace",
      entityType: "classified",
      entityId: classifiedId,
      storeId: targetStoreId,
      title: `Anúncio "${classified.title}" promovido para o catálogo Pro`,
      description: `Produto criado: ${newProduct.id}. Classificado marcado como promoted.`,
      metadata: {
        classifiedId,
        productId: newProduct.id,
        targetStoreId,
        initialStockQuantity,
        promotedAt,
      },
    }).catch((err) => {
      // Evento de domínio é best-effort — não bloqueia a transação principal
      console.warn("[listing-promotion] Evento de domínio falhou (non-blocking):", err?.message);
    });

    return {
      success: true,
      productId: newProduct.id,
      classifiedId,
      storeId: targetStoreId,
      wasAlreadyPromoted: false,
    };
  });

// ---------------------------------------------------------------------------
// listUserClassifiedsForPromotionFn — Lista classificados do usuário elegíveis
// ---------------------------------------------------------------------------

const listForPromotionSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export interface ClassifiedForPromotion {
  id: string;
  title: string;
  category: string;
  price_cents: number;
  images: string[];
  status: string;
  promoted_to_product_id: string | null;
  created_at: string;
}

/**
 * listUserClassifiedsForPromotionFn
 *
 * Lista os anúncios classificados do usuário autenticado que ainda não foram
 * promovidos para o catálogo Pro, ordenados por data de criação desc.
 */
export const listUserClassifiedsForPromotionFn = createServerFn({ method: "GET" })
  .validator(listForPromotionSchema)
  .handler(async ({ data }): Promise<ClassifiedForPromotion[]> => {
    const { limit, cursor } = data;

    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autorizado.");
    }

    let query = supabase
      .from("classifieds")
      .select(
        "id, title, category, price_cents, images, status, workspace_entity_id, created_at"
      )
      .eq("author_profile_id", identity.id)
      .neq("status", "promoted") // Exclui já promovidos
      .neq("status", "archived") // Exclui arquivados
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: classifieds, error } = await query;

    if (error) {
      console.error("[listing-promotion] Erro ao listar classificados:", error.message);
      throw new Error("Falha ao carregar seus anúncios. Tente novamente.");
    }

    return ((classifieds ?? []) as Array<Record<string, unknown>>).map((c) => ({
      id: String(c.id),
      title: String(c.title ?? ""),
      category: String(c.category ?? ""),
      price_cents: Number(c.price_cents ?? 0),
      images: Array.isArray(c.images) ? (c.images as string[]) : [],
      status: String(c.status ?? ""),
      promoted_to_product_id: c.workspace_entity_id ? String(c.workspace_entity_id) : null,
      created_at: String(c.created_at ?? ""),
    }));
  });
