/**
 * ifood-reconciliation.functions.ts — BFF Server Functions para Integração iFood Merchant
 * e Reconciliação Multi-Fatorial de Clientes no Chat Mobile do Waesy.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import { logAuditAction } from "./audit.functions";
import {
  IFoodMerchantCredentialsSchema,
  IFoodOrderDetailsSchema,
  type IFoodOrderDetails,
  type ReconciliationCandidate,
} from "@/lib/ifood-merchant.types";
import {
  rankOrderReconciliations,
  calculateOrderReconciliationScore,
} from "@/lib/reconciliation-engine";

// ==============================================================================
// 1. Central de Integrações: Salvar e Consultar Credenciais iFood
// ==============================================================================

export const saveIFoodMerchantCredentials = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      credentials: IFoodMerchantCredentialsSchema,
      isActive: z.boolean().default(true),
    }),
  )
  .handler(async ({ data: { storeId: targetStoreId, credentials, isActive } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const storeId = targetStoreId || identity.store_id;
    if (!storeId) {
      throw new Error("Store ID não identificado para salvar credencial do iFood.");
    }

    const publicMetadata = {
      merchant_id: credentials.merchantId,
      app_name: credentials.appName || "Waesy Omnichannel Connector",
    };

    const secretPayload = {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    };

    const { data: record, error } = await supabase
      .from("integration_credentials")
      .upsert(
        {
          store_id: storeId,
          provider: "ifood",
          token_payload: publicMetadata,
          public_metadata: publicMetadata,
          secret_payload_encrypted: encryptSecret(JSON.stringify(secretPayload)),
          is_active: isActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id, provider" },
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao salvar credenciais do iFood: ${error.message}`);
    }

    await logAuditAction(
      identity,
      "UPDATED_INTEGRATION_CREDENTIAL",
      "integration_credentials",
      record.id,
      {
        provider: "ifood",
        merchantId: credentials.merchantId,
        isActive,
      },
    );

    return { success: true, recordId: record.id };
  });

export const getIFoodIntegrationStatus = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }))
  .handler(async ({ data: { storeId: targetStoreId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const storeId = targetStoreId || identity.store_id;
    if (!storeId) return { isConnected: false };

    const { data, error } = await supabase
      .from("integration_credentials")
      .select("id, is_active, public_metadata, updated_at")
      .eq("store_id", storeId)
      .eq("provider", "ifood")
      .maybeSingle();

    if (error || !data || !data.is_active) {
      return { isConnected: false };
    }

    const metadata = (data.public_metadata || {}) as Record<string, string>;

    return {
      isConnected: true,
      merchantId: metadata.merchant_id || null,
      appName: metadata.app_name || null,
      updatedAt: data.updated_at,
    };
  });

// ==============================================================================
// 2. Reconciliação Multi-Fatorial: Ingestão de Pedidos e Casamento com Chat
// ==============================================================================

export const ReconcileIFoodOrderSchema = z.object({
  storeId: z.string().uuid().optional(),
  order: IFoodOrderDetailsSchema,
  autoLinkIfHighConfidence: z.boolean().default(true),
});

export const reconcileExternalIFoodOrder = createServerFn({ method: "POST" })
  .validator(ReconcileIFoodOrderSchema)
  .handler(async ({ data: { storeId: targetStoreId, order, autoLinkIfHighConfidence } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const storeId = targetStoreId || identity.store_id;
    if (!storeId) throw new Error("Store ID não identificado.");

    // 1. Obter candidatos de clientes da loja a partir de conversas recentes de chat
    const { data: conversations } = await supabase
      .from("chat_threads")
      .select("id, customer_id, updated_at")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(50);

    const candidates: ReconciliationCandidate[] = [];

    if (conversations && conversations.length > 0) {
      const customerIds = Array.from(
        new Set(conversations.map((c) => c.customer_id).filter(Boolean)),
      ) as string[];

      // 2. Buscar perfis e endereços desses clientes
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, document, resume_data")
        .in("id", customerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // 3. Montar lista de candidatos com mensagens recentes
      for (const conv of conversations) {
        if (!conv.customer_id) continue;
        const profile = profileMap.get(conv.customer_id);
        if (!profile) continue;

        const resumeAddresses = ((profile.resume_data as any)?.addresses || []) as any[];
        const primaryAddr = resumeAddresses.find((a) => a.is_default) || resumeAddresses[0];

        // Buscar últimas mensagens da conversa
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentChatActivity = (messages || []).map((m) => ({
          text: String(m.content || ""),
          createdAt: String(m.created_at || ""),
        }));

        candidates.push({
          customerId: profile.id,
          customerName: profile.full_name || "",
          customerPhone: profile.phone || undefined,
          customerDocument: profile.document || undefined,
          chatConversationId: conv.id,
          address: primaryAddr
            ? {
                street: primaryAddr.street || "",
                number: primaryAddr.number || "",
                neighborhood: primaryAddr.neighborhood,
                city: primaryAddr.city,
                state: primaryAddr.state,
                zipcode: primaryAddr.zipcode,
                coordinates: primaryAddr.coordinates,
              }
            : undefined,
          recentChatActivity,
        });
      }
    }

    // 4. Executar Ranking do Motor de Reconciliação
    const rankedMatches = rankOrderReconciliations(order, candidates);
    const bestMatch = rankedMatches[0] || null;

    let linkStatus: "AUTOMATICALLY_LINKED" | "PENDING_CONFIRMATION" | "LOW_CONFIDENCE" =
      "LOW_CONFIDENCE";

    let linkedChatId: string | null = null;
    let linkedCustomerId: string | null = null;

    if (bestMatch && bestMatch.confidence === "HIGH_CONFIDENCE" && autoLinkIfHighConfidence) {
      linkStatus = "AUTOMATICALLY_LINKED";
      linkedChatId = bestMatch.candidate.chatConversationId || null;
      linkedCustomerId = bestMatch.candidate.customerId;
    } else if (bestMatch && bestMatch.confidence === "PROBABLE_MATCH") {
      linkStatus = "PENDING_CONFIRMATION";
      linkedChatId = bestMatch.candidate.chatConversationId || null;
      linkedCustomerId = bestMatch.candidate.customerId;
    }

    // 5. Se vinculado ao chat, registrar mensagem de sistema na conversa
    if (linkStatus === "AUTOMATICALLY_LINKED" && linkedChatId) {
      try {
        await supabase.from("chat_messages").insert({
          conversation_id: linkedChatId,
          sender_type: "system",
          content: `Pedido iFood N. ${order.displayId || order.id.slice(0, 5)} vinculado automaticamente ao seu atendimento. Status atual: ${order.orderType} · R$ ${(order.total.orderAmount).toFixed(2)}.`,
          metadata: {
            is_external_order: true,
            provider: "ifood",
            external_order_id: order.id,
            confidence_score: bestMatch.score,
            matched_reasons: bestMatch.matchedReasons,
          },
        });
      } catch (err) {
        console.warn("[reconcileExternalIFoodOrder] Aviso ao inserir mensagem no chat:", err);
      }
    }

    return {
      success: true,
      orderId: order.id,
      displayId: order.displayId,
      linkStatus,
      bestMatch: bestMatch
        ? {
            score: bestMatch.score,
            confidence: bestMatch.confidence,
            matchedReasons: bestMatch.matchedReasons,
            customerId: bestMatch.candidate.customerId,
            customerName: bestMatch.candidate.customerName,
            chatConversationId: bestMatch.candidate.chatConversationId,
          }
        : null,
      topMatches: rankedMatches.slice(0, 3).map((m) => ({
        score: m.score,
        confidence: m.confidence,
        matchedReasons: m.matchedReasons,
        customerName: m.candidate.customerName,
        chatConversationId: m.candidate.chatConversationId,
      })),
    };
  });

// ==============================================================================
// 3. Consulta de Pedidos Externos Vinculados no Chat Mobile
// ==============================================================================

export const getChatLinkedExternalOrders = createServerFn({ method: "GET" })
  .validator(
    z.object({
      conversationId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: { conversationId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado.");

    // Buscar mensagens de sistema ou eventos de pedidos externos nessa conversa
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("id, content, metadata, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "system")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !messages) return [];

    const externalOrderMessages = messages.filter(
      (m) => (m.metadata as any)?.is_external_order === true,
    );

    return externalOrderMessages.map((m) => ({
      messageId: m.id,
      content: m.content,
      provider: (m.metadata as any)?.provider || "ifood",
      externalOrderId: (m.metadata as any)?.external_order_id,
      confidenceScore: (m.metadata as any)?.confidence_score,
      matchedReasons: (m.metadata as any)?.matched_reasons || [],
      linkedAt: m.created_at,
    }));
  });
