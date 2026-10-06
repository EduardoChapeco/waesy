/**
 * integration-registry.ts — Registro Canônico de Integrações Externas (R55)
 *
 * Single Source of Truth para todas as integrações de marketplaces, ERPs,
 * gateways de pagamento, operadoras logísticas e canais de mensageria.
 */

import { z } from "zod";

export const IntegrationStatusSchema = z.enum([
  "unconfigured",
  "testing",
  "active",
  "error",
  "disabled",
]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationCategorySchema = z.enum([
  "payment",
  "shipping",
  "notification",
  "analytics",
  "marketing",
  "storage",
  "maps",
  "marketplace",
  "erp",
  "messaging",
  "fiscal",
]);
export type IntegrationCategory = z.infer<typeof IntegrationCategorySchema>;

export const IntegrationDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: IntegrationCategorySchema,
  status: IntegrationStatusSchema,
  description: z.string(),
  capabilities: z.array(z.string()),
  authType: z.enum(["oauth2", "api_key", "bearer_token", "webhook_hmac"]).default("api_key"),
  syncDirection: z.enum(["inbound", "outbound", "bidirectional"]).default("bidirectional"),
  officialApiVersion: z.string().optional(),
});
export type IntegrationDefinition = z.infer<typeof IntegrationDefinitionSchema>;

/**
 * Integration Registry
 * Single source of truth for all external integrations in Waesy.
 */
export const IntegrationRegistry: Record<string, IntegrationDefinition> = {
  // ─── Pagamentos ──────────────────────────────────────────────────────────
  "payment.mercadopago": {
    id: "payment.mercadopago",
    name: "Mercado Pago",
    category: "payment",
    status: "active",
    description: "Gateway de pagamentos via Mercado Pago (PIX e Cartão com split).",
    capabilities: ["pix", "credit_card", "split_rules", "refund"],
    authType: "bearer_token",
    syncDirection: "bidirectional",
    officialApiVersion: "v1",
  },
  "payment.asaas": {
    id: "payment.asaas",
    name: "Asaas",
    category: "payment",
    status: "active",
    description: "Gateway bancário e emissão de boletos, PIX dinâmico e split de recebíveis.",
    capabilities: ["pix", "boleto", "credit_card", "subaccounts", "split"],
    authType: "api_key",
    syncDirection: "bidirectional",
    officialApiVersion: "v3",
  },

  // ─── Logística & Frete ───────────────────────────────────────────────────
  "shipping.melhorenvio": {
    id: "shipping.melhorenvio",
    name: "Melhor Envio",
    category: "shipping",
    status: "active",
    description: "Cotação de fretes multicarrier e geração de etiquetas de postagem.",
    capabilities: ["quote", "label_generation", "tracking"],
    authType: "bearer_token",
    syncDirection: "bidirectional",
    officialApiVersion: "v2",
  },
  "shipping.motolink": {
    id: "shipping.motolink",
    name: "MotoLink Entrega Local",
    category: "shipping",
    status: "active",
    description: "Rede proprietária de entregadores parceiros para entregas rápidas na cidade.",
    capabilities: ["realtime_tracking", "dispatch", "surge_pricing", "proof_of_delivery"],
    authType: "api_key",
    syncDirection: "bidirectional",
    officialApiVersion: "v1",
  },

  // ─── Marketplaces & Canais Externos ─────────────────────────────────────
  "marketplace.mercadolivre": {
    id: "marketplace.mercadolivre",
    name: "Mercado Livre",
    category: "marketplace",
    status: "active",
    description: "Sincronização bidirecional de catálogo, perguntas no SAC e estoque.",
    capabilities: ["product_sync", "stock_sync", "order_ingestion", "question_answering"],
    authType: "oauth2",
    syncDirection: "bidirectional",
    officialApiVersion: "v1",
  },
  "marketplace.ifood": {
    id: "marketplace.ifood",
    name: "iFood OpenDelivery",
    category: "marketplace",
    status: "active",
    description: "Integração oficial de pedidos gastronômicos, cardápio e status de entrega.",
    capabilities: ["menu_sync", "order_polling", "order_acceptance", "status_dispatch"],
    authType: "oauth2",
    syncDirection: "bidirectional",
    officialApiVersion: "v1.0",
  },

  // ─── ERP & Fiscal ────────────────────────────────────────────────────────
  "erp.bling": {
    id: "erp.bling",
    name: "Bling ERP",
    category: "erp",
    status: "active",
    description: "Sincronização de pedidos, estoque físico e faturamento com emissão de NF-e.",
    capabilities: ["stock_sync", "order_export", "invoice_ingestion", "nfe_danfe"],
    authType: "oauth2",
    syncDirection: "bidirectional",
    officialApiVersion: "v3",
  },

  // ─── Mensageria & Notificações ───────────────────────────────────────────
  "messaging.whatsapp": {
    id: "messaging.whatsapp",
    name: "WhatsApp Cloud API",
    category: "messaging",
    status: "testing",
    description: "Canal oficial da Meta em validação; não habilitar operação produtiva antes do webhook HMAC, outbox e teste end-to-end.",
    capabilities: ["connection_test", "chat_inbound_preview"],
    authType: "bearer_token",
    syncDirection: "bidirectional",
    officialApiVersion: "v20.0",
  },

  // ─── Marketing & Tráfego ─────────────────────────────────────────────────
  "marketing.meta_ads": {
    id: "marketing.meta_ads",
    name: "Meta Ads & Conversions API",
    category: "marketing",
    status: "active",
    description: "Disparo de campanhas locais e envio de conversões via CAPI.",
    capabilities: ["campaign_management", "pixel_tracking", "conversions_api"],
    authType: "oauth2",
    syncDirection: "outbound",
    officialApiVersion: "v20.0",
  },
  "marketing.google_ads": {
    id: "marketing.google_ads",
    name: "Google Ads REST API",
    category: "marketing",
    status: "active",
    description: "Campanhas locais de busca e Performance Max para catálogo local.",
    capabilities: ["campaign_dispatch", "offline_conversions"],
    authType: "oauth2",
    syncDirection: "outbound",
    officialApiVersion: "v17",
  },
  "analytics.meta_pixel": {
    id: "analytics.meta_pixel",
    name: "Meta Pixel",
    category: "analytics",
    status: "active",
    description: "Rastreamento de eventos para Facebook e Instagram.",
    capabilities: ["page_view", "add_to_cart", "purchase"],
    authType: "api_key",
    syncDirection: "outbound",
    officialApiVersion: "v20.0",
  },
};

export function getIntegrationById(id: string): IntegrationDefinition | undefined {
  return IntegrationRegistry[id];
}

export function getIntegrationsByCategory(category: IntegrationCategory): IntegrationDefinition[] {
  return Object.values(IntegrationRegistry).filter((i) => i.category === category);
}

export function listAllIntegrations(): IntegrationDefinition[] {
  return Object.values(IntegrationRegistry);
}
