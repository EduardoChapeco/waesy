import { z } from "zod";
import type { PermissionAction, PermissionResource } from "./permission-registry";
import { getNicheManifest, NicheId } from "@/lib/niches/niche-manifest";
import { canTransition, getAllowedTransitions, getStatusMeta, StateMachineEntity } from "@/lib/state-machines";
import { publishDomainEvent, DomainEventName } from "@/services/domain-events.functions";
import { calculateBasePriceQuote, CouponRule } from "@/lib/ad-engine/pricing-engine";
import { getNichePackage } from "@/lib/ad-engine/niche-packages";
import { _listStockLedger } from "@/services/canonical-stock-ledger.functions";
import { executeSimLabBatchSimulation } from "@/services/simlab.functions";
import { executeOrchestrateMarketingPost } from "@/services/squad-content.functions";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import { captureAndAnalyzeCompetitorLogic } from "@/services/market-radar.functions";
import {
  executeDiscoverAccessibleAdAccounts,
  executeSyncExternalAdCampaignMetrics,
  executeDiagnoseAdAccountsHealthMcp,
  executeIngestAdConversionEventMcp,
} from "@/services/ads.functions";
import type { WorkspaceVfsFileEntry } from "@/types/chat";
import {
  vfsListFiles,
  vfsPatchFile,
  vfsReadFile,
  vfsWriteFile,
  type WorkspaceVfsMap,
} from "@/lib/ai/workspace-vfs";
import { executeSafeComputeSandbox } from "@/lib/ai/safe-compute-sandbox";

export type McpToolAccessTier = "public" | "store_staff" | "admin_only";

export type McpModuleType =
  | "catalog"
  | "directory"
  | "logistics"
  | "orders"
  | "scheduling"
  | "tourism"
  | "proposals"
  | "contracts"
  | "financial"
  | "hr"
  | "marketing"
  | "fiscal"
  | "integrations"
  | "support"
  | "simulation"
  | "mining"
  | "governance"
  | "crm"
  | "workspace";

export interface McpExecutionContext {
  supabase: any;
  storeId?: string;
  identity?: {
    id?: string | null;
    role?: string;
    store_id?: string | null;
    [key: string]: any;
  } | null;
  authToken?: string;
  signal?: AbortSignal;
  vfsFiles?: WorkspaceVfsMap;
  onVfsMutation?: (file: WorkspaceVfsFileEntry, originalContent: string) => Promise<void> | void;
}

export interface McpToolRegistryEntry<TInput = any, TOutput = any> {
  name: string;
  module: McpModuleType;
  description: string;
  tier: McpToolAccessTier;
  requiredScope: string;
  permission?: {
    action: PermissionAction;
    resource: PermissionResource;
  };
  idempotent: boolean;
  rateLimitBucket: string;
  inputZodSchema: z.ZodType<TInput>;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  handler: (ctx: McpExecutionContext, args: TInput) => Promise<TOutput>;
}

/**
 * Single Source of Truth (SSOT) Registry of all MCP Tools in the Waesy Platform.
 * Tools are registered declaratively here and derived automatically by:
 * - /api/webmcp.json
 * - /api/openapi.json
 * - executeMcpToolCall in mcp-server.functions.ts
 */
export const MCP_TOOL_REGISTRY: Record<string, McpToolRegistryEntry> = {
  // ─── 1. CATÁLOGO & PRODUTOS ───────────────────────────────────────────────
  search_catalog_products: {
    name: "search_catalog_products",
    module: "catalog",
    description: "Busca produtos, estoques e preços públicos atualizados no marketplace local Waesy.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().min(1, "Termo de busca obrigatório"),
      storeId: z.string().uuid().optional(),
      maxPrice: z.number().positive().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca ou código EAN" },
        storeId: { type: "string", description: "UUID opcional da loja" },
        maxPrice: { type: "number", description: "Preço máximo em reais (BRL)" },
        limit: { type: "number", description: "Limite de resultados (máx 50)" },
      },
      required: ["query"],
    },
    handler: async (ctx, args) => {
      const queryStr = String(args.query || "").trim();
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
      let query = ctx.supabase
        .from("products")
        .select("id, title, slug, price_cents, store_id, media:product_media(url, sort_order)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (args.storeId) {
        query = query.eq("store_id", args.storeId);
      }
      if (args.maxPrice) {
        query = query.lte("price_cents", Math.round(args.maxPrice * 100));
      }
      if (queryStr) {
        query = query.ilike("title", `%${queryStr}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        total: data?.length || 0,
        results: (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          priceBrl: (p.price_cents || 0) / 100,
          storeId: p.store_id,
          thumbnailUrl: p.media?.[0]?.url || null,
        })),
      };
    },
  },

  query_master_catalog: {
    name: "query_master_catalog",
    module: "catalog",
    description: "Consulta o catálogo mestre global por nome de produto ou código de barras EAN-13.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nome do produto ou código de barras EAN" },
        limit: { type: "number", description: "Quantidade máxima de resultados (padrão: 10, máx: 50)" },
      },
      required: ["query"],
    },
    handler: async (ctx, args) => {
      const q = String(args.query || "").trim();
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);

      const { data, error } = await ctx.supabase
        .from("master_products")
        .select("id, ean, name, brand, category, suggested_price_cents, ncm")
        .or(`name.ilike.%${q}%,ean.eq.${q}`)
        .limit(limit);

      if (error) throw new Error(error.message);

      return {
        total: data?.length || 0,
        count: data?.length || 0,
        items: (data || []).map((item: any) => ({
          id: item.id,
          ean: item.ean,
          name: item.name,
          brand: item.brand,
          category: item.category,
          suggestedPriceBrl: item.suggested_price_cents ? item.suggested_price_cents / 100 : null,
          ncm: item.ncm,
        })),
      };
    },
  },

  catalog_get_product_details: {
    name: "catalog_get_product_details",
    module: "catalog",
    description: "Recupera detalhes cadastrais completos, atributos técnicos, variantes e estoque de um produto específico.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      productId: z.string().min(1, "UUID ou slug do produto obrigatório"),
      storeId: z.string().uuid().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "UUID ou slug único do produto" },
        storeId: { type: "string", description: "UUID da loja (opcional)" },
      },
      required: ["productId"],
    },
    handler: async (ctx, args) => {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(args.productId);
      let query = ctx.supabase
        .from("products")
        .select("id, title, slug, description, price_cents, compare_at_cents, status, store_id, media:product_media(url, sort_order), variants:product_variants(stock_on_hand, allow_backorder)")
        .limit(1);

      if (isUuid) {
        query = query.eq("id", args.productId);
      } else {
        query = query.eq("slug", args.productId);
      }
      if (args.storeId) {
        query = query.eq("store_id", args.storeId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Produto "${args.productId}" não encontrado.`);

      const variants = Array.isArray((data as any).variants) ? (data as any).variants : [];
      const stockQuantity = variants.reduce((sum: number, v: any) => sum + (Number(v.stock_on_hand) || 0), 0);

      return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        priceBrl: (data.price_cents || 0) / 100,
        compareAtPriceBrl: data.compare_at_cents ? data.compare_at_cents / 100 : null,
        stockQuantity,
        status: data.status,
        storeId: data.store_id,
        images: (data.media || []).map((m: any) => m.url),
      };
    },
  },

  catalog_list_categories: {
    name: "catalog_list_categories",
    module: "catalog",
    description: "Lista as categorias de produtos cadastradas na loja autorizada ou no catálogo geral.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "categories" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      storeId: z.string().uuid().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja (opcional para filtro local)" },
      },
      required: [],
    },
    handler: async (ctx, args) => {
      let query = ctx.supabase
        .from("categories")
        .select("id, name, slug, icon_url, custom_icon_url, icon_name, sort_order, parent_id")
        .order("sort_order", { ascending: true });

      if (args.storeId) {
        query = query.eq("store_id", args.storeId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        count: data?.length || 0,
        categories: (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon_url || c.custom_icon_url || c.icon_name || null,
          parentId: c.parent_id,
        })),
      };
    },
  },

  update_product_stock: {
    name: "update_product_stock",
    module: "catalog",
    description: "Atualiza o estoque disponível de um produto pertencente exclusivamente à loja autorizada.",
    tier: "store_staff",
    requiredScope: "store:catalog:write",
    permission: { action: "update", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid("UUID de loja obrigatório"),
      productId: z.string().uuid("UUID do produto obrigatório"),
      stockQuantity: z.number().int().min(0, "Estoque deve ser não-negativo"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        productId: { type: "string", description: "UUID do produto" },
        stockQuantity: { type: "integer", description: "Nova quantidade física em estoque (não-negativo)" },
      },
      required: ["storeId", "productId", "stockQuantity"],
    },
    handler: async (ctx, args) => {
      const nowIso = new Date().toISOString();
      const { data: product } = await ctx.supabase
        .from("products")
        .select("id, title")
        .eq("id", args.productId)
        .eq("store_id", args.storeId)
        .maybeSingle();

      if (!product) {
        throw new Error(`Produto não encontrado ou não pertence à loja ${args.storeId}.`);
      }

      const { data: variant } = await ctx.supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", args.productId)
        .limit(1)
        .maybeSingle();

      if (variant) {
        const { error: varErr } = await ctx.supabase
          .from("product_variants")
          .update({ stock_on_hand: args.stockQuantity, updated_at: nowIso })
          .eq("id", variant.id);
        if (varErr) throw new Error(varErr.message);
      } else {
        const { error: insErr } = await ctx.supabase
          .from("product_variants")
          .insert({ product_id: args.productId, stock_on_hand: args.stockQuantity });
        if (insErr) throw new Error(insErr.message);
      }

      return {
        success: true,
        productId: product.id,
        title: product.title,
        newStockQuantity: args.stockQuantity,
        updatedAt: nowIso,
      };
    },
  },

  // ─── 2. DIRETÓRIO COMERCIAL ───────────────────────────────────────────────
  get_store_directory_info: {
    name: "get_store_directory_info",
    module: "directory",
    description: "Retorna informações institucionais, reputação e canais oficiais de atendimento de uma empresa no Diretório.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "settings" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      slugOrId: z.string().min(1, "Slug ou ID obrigatório"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        slugOrId: { type: "string", description: "Slug ou UUID da empresa" },
      },
      required: ["slugOrId"],
    },
    handler: async (ctx, args) => {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(args.slugOrId);
      const query = ctx.supabase
        .from("stores")
        .select("id, name, slug, description, logo_url, phone, address, city, state, google_rating, verified_badge_url, settings")
        .limit(1);

      if (isUuid) {
        query.eq("id", args.slugOrId);
      } else {
        query.eq("slug", args.slugOrId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Empresa com slug/ID "${args.slugOrId}" não encontrada no diretório.`);

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        logoUrl: data.logo_url,
        phone: data.phone,
        whatsapp: data.phone || (data.settings as any)?.whatsapp || null,
        city: data.city,
        state: data.state,
        rating: data.google_rating || 5.0,
        isVerified: Boolean(data.verified_badge_url),
      };
    },
  },

  directory_list_featured_stores: {
    name: "directory_list_featured_stores",
    module: "directory",
    description: "Lista empresas em destaque no Diretório comercial por cidade ou nicho de atuação.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "settings" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      city: z.string().optional(),
      state: z.string().length(2).optional(),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(30).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Nome da cidade brasileira" },
        state: { type: "string", description: "Sigla UF de 2 letras (ex: SC, SP)" },
        category: { type: "string", description: "Categoria de negócio ou nicho" },
        limit: { type: "number", description: "Limite de resultados (máx 30)" },
      },
      required: [],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 30);
      let query = ctx.supabase
        .from("stores")
        .select("id, name, slug, description, logo_url, city, state, google_rating, verified_badge_url")
        .eq("is_active", true)
        .order("google_rating", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (args.city) query = query.ilike("city", `%${args.city}%`);
      if (args.state) query = query.eq("state", args.state.toUpperCase());

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        count: data?.length || 0,
        stores: (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          logoUrl: s.logo_url,
          city: s.city,
          state: s.state,
          rating: s.google_rating || 5.0,
          isVerified: Boolean(s.verified_badge_url),
        })),
      };
    },
  },

  // ─── 3. LOGÍSTICA & FRETE & WMS ───────────────────────────────────────────
  check_delivery_coverage: {
    name: "check_delivery_coverage",
    module: "logistics",
    description: "Valida se um CEP brasileiro é atendido pela malha de entrega e estima prazos e tarifas base.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      cep: z.string().min(8).max(9),
      storeId: z.string().uuid().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        cep: { type: "string", description: "CEP de entrega no formato 8 dígitos" },
        storeId: { type: "string", description: "UUID opcional da loja emissora" },
      },
      required: ["cep"],
    },
    handler: async (ctx, args) => {
      const cleanCep = String(args.cep).replace(/\D/g, "");
      if (cleanCep.length !== 8) {
        throw new Error(`CEP inválido: ${args.cep}. Formato esperado: 8 dígitos numéricos.`);
      }

      const isExpressEligible = ["0", "1", "2", "8", "9"].includes(cleanCep[0]);
      return {
        cep: cleanCep,
        eligible: true,
        options: [
          {
            modal: "MotoLink Express (Local)",
            available: isExpressEligible,
            estimatedHours: isExpressEligible ? 2 : null,
            baseCostBrl: isExpressEligible ? 12.9 : null,
          },
          {
            modal: "PAC / Transportadora Padrão",
            available: true,
            estimatedBusinessDays: 4,
            baseCostBrl: 22.5,
          },
          {
            modal: "Sedex Express",
            available: true,
            estimatedBusinessDays: 1,
            baseCostBrl: 38.9,
          },
        ],
      };
    },
  },

  wms_list_pending_orders: {
    name: "wms_list_pending_orders",
    module: "logistics",
    description: "Consulta pedidos pagos ou em processamento da loja autorizada prontos para expedição e picking WMS.",
    tier: "store_staff",
    requiredScope: "store:orders:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        limit: { type: "integer", description: "Limite de pedidos a retornar (máx 50)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      const { data, error } = await ctx.supabase
        .from("orders")
        .select("id, status, total_cents, created_at, customer_snapshot, shipping_address, payments(status, method)")
        .eq("store_id", args.storeId)
        .in("status", ["paid", "preparing", "confirmed"])
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        pendingCount: data?.length || 0,
        orders: (data || []).map((o: any) => {
          const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
          const snap = (o.customer_snapshot || {}) as Record<string, any>;
          return {
            orderId: o.id,
            status: o.status,
            paymentStatus: payment?.status || o.status,
            totalBrl: (o.total_cents || 0) / 100,
            customerName: snap.full_name || snap.name || "Cliente",
            deliveryAddress: o.shipping_address || null,
            createdAt: o.created_at,
          };
        }),
      };
    },
  },

  logistics_track_shipment: {
    name: "logistics_track_shipment",
    module: "logistics",
    description: "Consulta o rastreamento em tempo real de uma entrega ou despacho por código de rastreio ou UUID do pedido.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      trackingCodeOrOrderId: z.string().min(1, "Código de rastreio ou UUID obrigatório"),
      storeId: z.string().uuid().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        trackingCodeOrOrderId: { type: "string", description: "Código de rastreamento ou UUID do pedido" },
        storeId: { type: "string", description: "UUID da loja (opcional)" },
      },
      required: ["trackingCodeOrOrderId"],
    },
    handler: async (ctx, args) => {
      const val = args.trackingCodeOrOrderId.trim();
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(val);

      let query = ctx.supabase
        .from("deliveries")
        .select("id, order_id, tracking_code, status, carrier_name, estimated_delivery_at, updated_at, events:delivery_events(id, description, status, created_at)")
        .limit(1);

      if (isUuid) {
        query = query.or(`id.eq.${val},order_id.eq.${val}`);
      } else {
        query = query.eq("tracking_code", val);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return {
          found: false,
          message: `Nenhum envio localizado para o identificador "${val}".`,
        };
      }

      return {
        found: true,
        deliveryId: data.id,
        orderId: data.order_id,
        trackingCode: data.tracking_code,
        carrierName: data.carrier_name || "MotoLink",
        status: data.status,
        estimatedDeliveryAt: data.estimated_delivery_at,
        lastUpdate: data.updated_at,
        events: (data.events || []).map((e: any) => ({
          status: e.status,
          description: e.description,
          timestamp: e.created_at,
        })),
      };
    },
  },

  // ─── 4. PEDIDOS & CHECKOUT ────────────────────────────────────────────────
  orders_get_order_details: {
    name: "orders_get_order_details",
    module: "orders",
    description: "Recupera os dados completos de um pedido: itens, valores, cliente, forma de pagamento e status atual.",
    tier: "store_staff",
    requiredScope: "store:orders:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      orderId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        orderId: { type: "string", description: "UUID do pedido a consultar" },
      },
      required: ["storeId", "orderId"],
    },
    handler: async (ctx, args) => {
      const { data, error } = await ctx.supabase
        .from("orders")
        .select("id, status, total_cents, subtotal_cents, shipping_cents, discount_cents, customer_snapshot, shipping_address, created_at, payments(status, method), items:order_items(id, item_id, product_title, qty, unit_price_cents, total_cents)")
        .eq("id", args.orderId)
        .eq("store_id", args.storeId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Pedido "${args.orderId}" não encontrado na loja ${args.storeId}.`);

      const payment = Array.isArray((data as any).payments) ? (data as any).payments[0] : (data as any).payments;
      const snap = ((data as any).customer_snapshot || {}) as Record<string, any>;

      return {
        orderId: data.id,
        status: data.status,
        paymentStatus: payment?.status || data.status,
        paymentMethod: payment?.method || null,
        totals: {
          subtotalBrl: (data.subtotal_cents || 0) / 100,
          shippingBrl: (data.shipping_cents || 0) / 100,
          discountBrl: (data.discount_cents || 0) / 100,
          totalBrl: (data.total_cents || 0) / 100,
        },
        customer: {
          name: snap.full_name || snap.name || null,
          email: snap.email || null,
          phone: snap.phone || null,
        },
        deliveryAddress: data.shipping_address,
        createdAt: data.created_at,
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          productId: it.item_id,
          title: it.product_title,
          quantity: it.qty,
          unitPriceBrl: (it.unit_price_cents || 0) / 100,
          totalPriceBrl: (it.total_cents || 0) / 100,
        })),
      };
    },
  },

  orders_update_order_status: {
    name: "orders_update_order_status",
    module: "orders",
    description: "Atualiza o status operacional de um pedido (ex: preparing, ready_for_pickup, dispatched, completed, cancelled).",
    tier: "store_staff",
    requiredScope: "store:orders:write",
    permission: { action: "update", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      orderId: z.string().uuid(),
      newStatus: z.enum(["confirmed", "preparing", "ready_for_pickup", "dispatched", "completed", "cancelled"]),
      note: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        orderId: { type: "string", description: "UUID do pedido" },
        newStatus: {
          type: "string",
          enum: ["confirmed", "preparing", "ready_for_pickup", "dispatched", "completed", "cancelled"],
          description: "Novo status operacional do pedido",
        },
        note: { type: "string", description: "Observação opcional para registro no histórico" },
      },
      required: ["storeId", "orderId", "newStatus"],
    },
    handler: async (ctx, args) => {
      const { data, error } = await ctx.supabase
        .from("orders")
        .update({
          status: args.newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.orderId)
        .eq("store_id", args.storeId)
        .select("id, status, updated_at")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Pedido "${args.orderId}" não pertence à loja ${args.storeId}.`);

      return {
        success: true,
        orderId: data.id,
        previousStatus: undefined,
        currentStatus: data.status,
        updatedAt: data.updated_at,
        note: args.note || null,
      };
    },
  },

  // ─── 5. AGENDAMENTO & SERVIÇOS ───────────────────────────────────────────
  scheduling_list_available_slots: {
    name: "scheduling_list_available_slots",
    module: "scheduling",
    description: "Consulta horários disponíveis para agendamento de serviços em um determinado dia ou profissional.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      serviceId: z.string().uuid().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data deve ser YYYY-MM-DD"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja ou prestador" },
        serviceId: { type: "string", description: "UUID do serviço desejado (opcional)" },
        date: { type: "string", description: "Data no formato AAAA-MM-DD" },
      },
      required: ["storeId", "date"],
    },
    handler: async (ctx, args) => {
      const { data: storeSchedule } = await ctx.supabase
        .from("service_schedules")
        .select("*")
        .eq("store_id", args.storeId)
        .maybeSingle();

      const standardSlots = [
        "08:00", "09:00", "10:00", "11:00", "13:30", "14:30", "15:30", "16:30", "17:30"
      ];

      return {
        storeId: args.storeId,
        date: args.date,
        availableSlots: standardSlots,
        timezone: "America/Sao_Paulo",
        durationMinutes: storeSchedule?.default_duration_minutes || 60,
      };
    },
  },

  // ─── 6. TURISMO & VIAGENS ─────────────────────────────────────────────────
  tourism_get_trip_manifest: {
    name: "tourism_get_trip_manifest",
    module: "tourism",
    description: "Retorna o manifesto oficial de uma viagem turística: passageiros cadastrados, localizadores, vouchers e rota.",
    tier: "store_staff",
    requiredScope: "store:tourism:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      tripId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da agência ou loja emissora" },
        tripId: { type: "string", description: "UUID da viagem turística" },
      },
      required: ["storeId", "tripId"],
    },
    handler: async (ctx, args) => {
      const { data: trip, error: tripErr } = await ctx.supabase
        .from("tourism_trips")
        .select("id, title, destination_city, travel_start_date, travel_end_date, status, adults_count, children_count, passengers:tourism_passengers(id, full_name, document_number, birth_date, seat_number), locators:tourism_locators(id, provider_name, locator_code)")
        .eq("id", args.tripId)
        .eq("store_id", args.storeId)
        .maybeSingle();

      if (tripErr) throw new Error(tripErr.message);
      if (!trip) throw new Error(`Viagem "${args.tripId}" não encontrada na agência ${args.storeId}.`);

      return {
        tripId: trip.id,
        title: trip.title,
        destination: trip.destination_city,
        departureDate: trip.travel_start_date,
        returnDate: trip.travel_end_date,
        status: trip.status,
        passengerCount: trip.passengers?.length || 0,
        maxCapacity: Number((trip as any).adults_count || 0) + Number((trip as any).children_count || 0),
        passengers: (trip.passengers || []).map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          documentNumberMasked: p.document_number ? `***${p.document_number.slice(-4)}` : null,
          seatNumber: p.seat_number,
        })),
        locators: (trip.locators || []).map((l: any) => ({
          provider: l.provider_name,
          code: l.locator_code,
        })),
      };
    },
  },

  tourism_list_proposals: {
    name: "tourism_list_proposals",
    module: "tourism",
    description: "Lista propostas e roteiros de viagens emitidos para clientes com status de aprovação e valores.",
    tier: "store_staff",
    requiredScope: "store:tourism:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      limit: z.number().int().min(1).max(30).default(15),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da agência emissora" },
        limit: { type: "number", description: "Limite de propostas a retornar (máx 30)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 30);
      const { data, error } = await ctx.supabase
        .from("tourism_proposals")
        .select("id, client_name, destination, total_cents, status, created_at, expiration_date")
        .eq("store_id", args.storeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        count: data?.length || 0,
        proposals: (data || []).map((p: any) => ({
          id: p.id,
          clientName: p.client_name,
          destination: p.destination,
          totalBrl: (p.total_cents || 0) / 100,
          status: p.status,
          expirationDate: p.expiration_date,
          createdAt: p.created_at,
        })),
      };
    },
  },

  tourism_convert_proposal_to_trip: {
    name: "tourism_convert_proposal_to_trip",
    module: "tourism",
    description: "Converte uma proposta aprovada em viagem confirmada, gerando vouchers, contrato digital e cartão no Kanban de Embarques.",
    tier: "store_staff",
    requiredScope: "store:tourism:write",
    permission: { action: "create", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      proposalId: z.string().min(1, "ID ou token da proposta obrigatório"),
      leadPassengerName: z.string().optional(),
      leadPassengerDocument: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da agência" },
        proposalId: { type: "string", description: "UUID ou public_token da proposta a ser convertida" },
        leadPassengerName: { type: "string", description: "Nome completo do passageiro principal (opcional)" },
        leadPassengerDocument: { type: "string", description: "CPF ou passaporte do passageiro principal (opcional)" },
      },
      required: ["storeId", "proposalId"],
    },
    handler: async (_ctx, args) => {
      const { convertProposalToTrip } = await import("@/services/travel-lifecycle.functions");
      const res = await convertProposalToTrip({
        data: {
          proposalId: args.proposalId,
          storeId: args.storeId,
          leadPassenger: args.leadPassengerName ? {
            name: args.leadPassengerName,
            document: args.leadPassengerDocument,
          } : undefined,
        },
      });
      return res;
    },
  },

  tourism_list_departures_kanban: {
    name: "tourism_list_departures_kanban",
    module: "tourism",
    description: "Lista cartões do Kanban de Embarques operacionais da agência, organizados por estágio e data de saída.",
    tier: "store_staff",
    requiredScope: "store:tourism:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      stage: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da agência" },
        stage: { type: "string", description: "Filtro opcional por estágio (booked, docs_pending, vouchers_ready, checkin_open, in_transit, completed)" },
        limit: { type: "integer", description: "Limite de cartões a retornar (máx 50)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      let query = ctx.supabase
        .from("travel_departures_kanban")
        .select("id, client_name, client_phone, destination, departure_date, return_date, stage, passengers_count, flight_number, hotel_name, destination_type")
        .eq("store_id", args.storeId)
        .order("departure_date", { ascending: true })
        .limit(limit);

      if (args.stage) {
        query = query.eq("stage", args.stage);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        count: data?.length || 0,
        departures: (data || []).map((d: any) => ({
          departureId: d.id,
          clientName: d.client_name,
          clientPhone: d.client_phone,
          destination: d.destination,
          departureDate: d.departure_date,
          returnDate: d.return_date,
          stage: d.stage,
          passengersCount: d.passengers_count,
          flightNumber: d.flight_number,
          hotelName: d.hotel_name,
          destinationType: d.destination_type,
        })),
      };
    },
  },

  // ─── 7. PROPOSTAS COMERCIAIS & ORÇAMENTOS ─────────────────────────────────
  proposals_list_store_proposals: {
    name: "proposals_list_store_proposals",
    module: "proposals",
    description: "Lista propostas comerciais e orçamentos ativos emitidos pela loja com status de aceitação.",
    tier: "store_staff",
    requiredScope: "store:proposals:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja emissora" },
        status: {
          type: "string",
          enum: ["draft", "sent", "viewed", "accepted", "rejected", "expired"],
          description: "Filtro opcional por status da proposta",
        },
        limit: { type: "integer", description: "Limite de propostas (máx 50)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      let query = ctx.supabase
        .from("commercial_proposals")
        .select("id, title, client_name, client_email, total_cents, status, valid_until, created_at")
        .eq("store_id", args.storeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (args.status) {
        query = query.eq("status", args.status);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        count: data?.length || 0,
        proposals: (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          clientName: p.client_name,
          clientEmail: p.client_email,
          totalBrl: (p.total_cents || 0) / 100,
          status: p.status,
          validUntil: p.valid_until,
          createdAt: p.created_at,
        })),
      };
    },
  },

  // ─── 8. CONTRATOS DIGITAIS ───────────────────────────────────────────────
  contracts_get_contract_status: {
    name: "contracts_get_contract_status",
    module: "contracts",
    description: "Verifica a integridade e o status de assinatura de um contrato digital (pendente, assinado, cancelado).",
    tier: "store_staff",
    requiredScope: "store:contracts:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      contractIdOrToken: z.string().min(1),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja emissora" },
        contractIdOrToken: { type: "string", description: "UUID do contrato ou token público de assinatura" },
      },
      required: ["storeId", "contractIdOrToken"],
    },
    handler: async (ctx, args) => {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(args.contractIdOrToken);
      let query = ctx.supabase
        .from("digital_contracts")
        .select("id, title, status, signer_name, signer_document, signed_at, public_token, created_at")
        .eq("store_id", args.storeId)
        .limit(1);

      if (isUuid) {
        query = query.or(`id.eq.${args.contractIdOrToken},public_token.eq.${args.contractIdOrToken}`);
      } else {
        query = query.eq("public_token", args.contractIdOrToken);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Contrato "${args.contractIdOrToken}" não localizado.`);

      return {
        id: data.id,
        title: data.title,
        status: data.status,
        isSigned: Boolean(data.signed_at),
        signerName: data.signer_name,
        signerDocumentMasked: data.signer_document ? `***${data.signer_document.slice(-4)}` : null,
        signedAt: data.signed_at,
        publicToken: data.public_token,
      };
    },
  },

  // ─── 9. FINANCEIRO & CAIXA ───────────────────────────────────────────────
  pos_get_cash_status: {
    name: "pos_get_cash_status",
    module: "financial",
    description: "Retorna o status atual do caixa da loja, saldo em dinheiro e último operador com turno aberto.",
    tier: "store_staff",
    requiredScope: "store:pos:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const { data: openRegister, error: regErr } = await ctx.supabase
        .from("cash_registers")
        .select("*")
        .eq("store_id", args.storeId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .maybeSingle();

      if (regErr) throw new Error(regErr.message);

      return {
        isOpen: Boolean(openRegister),
        registerId: openRegister?.id || null,
        operatorId: openRegister?.operator_id || null,
        openedAt: openRegister?.opened_at || null,
        openingAmountBrl: openRegister ? (openRegister.opening_amount_cents || 0) / 100 : 0,
        currentCashBrl: openRegister ? (openRegister.current_cash_cents || 0) / 100 : 0,
      };
    },
  },

  financial_get_cash_flow_summary: {
    name: "financial_get_cash_flow_summary",
    module: "financial",
    description: "Retorna o consolidado financeiro da loja: receitas brutas, saldo disponível para repasse e total de vendas por método.",
    tier: "store_staff",
    requiredScope: "store:finance:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      days: z.number().int().min(1).max(90).default(30),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        days: { type: "integer", description: "Período em dias corridos (máx 90, padrão 30)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const sinceDate = new Date(Date.now() - (args.days || 30) * 86400000).toISOString();

      const { data: orders, error } = await ctx.supabase
        .from("orders")
        .select("total_cents, status, payments(status, method)")
        .eq("store_id", args.storeId)
        .in("status", ["paid", "completed", "shipped", "delivered"])
        .gte("created_at", sinceDate);

      if (error) throw new Error(error.message);

      let grossRevenueCents = 0;
      const byMethod: Record<string, number> = {};

      for (const ord of orders || []) {
        grossRevenueCents += ord.total_cents || 0;
        const firstPayment = Array.isArray((ord as any).payments) ? (ord as any).payments[0] : (ord as any).payments;
        const method = firstPayment?.method || "outros";
        byMethod[method] = (byMethod[method] || 0) + ((ord.total_cents || 0) / 100);
      }

      return {
        storeId: args.storeId,
        periodDays: args.days || 30,
        paidOrdersCount: orders?.length || 0,
        grossRevenueBrl: grossRevenueCents / 100,
        revenueByMethodBrl: byMethod,
      };
    },
  },

  // ─── 10. RH & EQUIPE ──────────────────────────────────────────────────────
  hr_list_team_members: {
    name: "hr_list_team_members",
    module: "hr",
    description: "Lista os membros ativos da equipe de trabalho da loja e seus respectivos papéis de acesso no sistema.",
    tier: "store_staff",
    requiredScope: "store:staff:read",
    permission: { action: "read", resource: "staff" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const { data, error } = await ctx.supabase
        .from("workspace_members")
        .select("id, role, created_at, profile:profiles(id, full_name, avatar_url)")
        .eq("store_id", args.storeId);

      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        memberCount: data?.length || 0,
        members: (data || []).map((m: any) => ({
          memberId: m.id,
          role: m.role,
          name: m.profile?.full_name || "Membro",
          email: m.profile?.email,
          avatarUrl: m.profile?.avatar_url,
          joinedAt: m.created_at,
        })),
      };
    },
  },

  // ─── 11. MARKETING & IA SIMULADA ──────────────────────────────────────────
  simlab_run_survey: {
    name: "simlab_run_survey",
    module: "simulation",
    description: "Executa a exploração qualitativa persistida do SimLab; não estima vendas nem usa amostra representativa.",
    tier: "store_staff",
    requiredScope: "store:analytics:read",
    permission: { action: "read", resource: "reports" },
    idempotent: false,
    rateLimitBucket: "webmcp_batch_dispatch",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      experimentId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        experimentId: { type: "string", description: "UUID do experimento SimLab" },
        storeId: { type: "string", description: "UUID da loja (validado contra sessão)" },
      },
      required: ["experimentId", "storeId"],
    },
    handler: async (ctx, args) => {
      return executeSimLabBatchSimulation({ experimentId: args.experimentId, storeId: args.storeId });
    },
  },

  generate_marketing_post: {
    name: "generate_marketing_post",
    module: "marketing",
    description: "Gera e salva um rascunho de marketing com IA; exige revisão humana e não inclui score de validação SimLab.",
    tier: "store_staff",
    requiredScope: "store:marketing:write",
    permission: { action: "create", resource: "content" },
    idempotent: false,
    rateLimitBucket: "webmcp_batch_dispatch",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      companyName: z.string().min(1),
      theme: z.string().min(1),
      targetSin: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        companyName: { type: "string", description: "Nome da marca ou empresa" },
        theme: { type: "string", description: "Tema ou promoção central do post" },
        targetSin: { type: "string", description: "Lente criativa opcional; não é método preditivo" },
      },
      required: ["storeId", "companyName", "theme"],
    },
    handler: async (ctx, args) => {
      return executeOrchestrateMarketingPost({
        storeId: args.storeId,
        companyName: args.companyName,
        theme: args.theme,
        targetSin: args.targetSin,
      });
    },
  },

  generate_ad_campaign_proposal: {
    name: "generate_ad_campaign_proposal",
    module: "marketing",
    description: "Processa comandos em linguagem natural e gera uma proposta de campanha de tráfego pago (Meta Ads, Google, Local).",
    tier: "store_staff",
    requiredScope: "store:marketing:write",
    permission: { action: "create", resource: "content" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      naturalLanguagePrompt: z.string().min(1),
      targetPlatform: z.enum(["meta_ads", "google_ads", "omnichannel_local"]).optional(),
      dailyBudgetCents: z.number().int().positive().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja emissora" },
        naturalLanguagePrompt: { type: "string", description: "Comando de voz ou texto do usuário" },
        targetPlatform: {
          type: "string",
          enum: ["meta_ads", "google_ads", "omnichannel_local"],
          description: "Canal de mídia pretendido",
        },
        dailyBudgetCents: { type: "number", description: "Orçamento diário em centavos BRL (opcional)" },
      },
      required: ["storeId", "naturalLanguagePrompt"],
    },
    handler: async (ctx, args) => {
      const aiResult = await executeUnifiedAiCall({
        systemPrompt: `Converta o pedido em um rascunho de proposta de campanha em português. Não publique nem altere contas de anúncios. Não invente segmentação, alcance, impressões, CPM, conversões, ROI ou benchmark. Se orçamento, localização, histórico ou objetivo estiver ausente, retorne-o em unknowns. Retorne JSON: {"campaign_name":"...","objective":"...","audience_hypotheses":["..."],"channel_approach":"...","creative_angles":["..."],"measurement_plan":["..."],"unknowns":["..."],"requires_human_review":true}`,
        userPrompt: JSON.stringify({
          request: args.naturalLanguagePrompt,
          channel: args.targetPlatform || null,
          daily_budget_brl: args.dailyBudgetCents == null ? null : args.dailyBudgetCents / 100,
        }),
        responseFormat: "json_object",
        temperature: 0.3,
        feature: "mcp_campaign_proposal_draft",
        storeId: args.storeId,
      });
      let parsed: any = aiResult.parsedJson;
      if (!parsed && aiResult.content) {
        try { parsed = JSON.parse(aiResult.content); } catch { throw new Error("A IA retornou proposta inválida; nenhuma estimativa de fallback foi criada."); }
      }
      const proposal = z.object({
        campaign_name: z.string().trim().min(1).max(160),
        objective: z.string().trim().min(1).max(1000),
        audience_hypotheses: z.array(z.string().trim().min(1).max(300)).max(10),
        channel_approach: z.string().trim().min(1).max(1500),
        creative_angles: z.array(z.string().trim().min(1).max(300)).max(10),
        measurement_plan: z.array(z.string().trim().min(1).max(300)).max(10),
        unknowns: z.array(z.string().trim().min(1).max(300)).max(20),
        requires_human_review: z.literal(true),
      }).strict().parse(parsed);
      return {
        record_kind: "llm_generated_campaign_proposal_draft",
        proposal,
        provenance: { provider: aiResult.provider, model: aiResult.model, generated_at: new Date().toISOString() },
        performance_estimates: null,
      };
    },
  },

  analyze_competitor_dna: {
    name: "analyze_competitor_dna",
    module: "marketing",
    description: "Captura a página de um concorrente já cadastrado e gera um rascunho qualitativo com fonte e proveniência; não calcula score de posicionamento ou desempenho.",
    tier: "store_staff",
    requiredScope: "store:analytics:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      competitorId: z.string().uuid(),
      sourceUrl: z.string().url().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        competitorId: { type: "string", description: "UUID de um concorrente já cadastrado neste workspace" },
        sourceUrl: { type: "string", description: "URL HTTPS pública opcional para a captura desta análise" },
      },
      required: ["storeId", "competitorId"],
    },
    handler: async (ctx, args) => {
      const snapshot = await captureAndAnalyzeCompetitorLogic({
        competitorId: args.competitorId,
        storeId: ctx.storeId || args.storeId,
        sourceUrl: args.sourceUrl,
      });
      return {
        record_kind: "competitor_ai_draft",
        competitorId: snapshot.competitor_id,
        sourceUrl: snapshot.source_url,
        analysisStatus: snapshot.analysis_status,
        extractedDna: snapshot.extracted_dna,
        marketingHooks: snapshot.marketing_hooks,
        pricingSignals: snapshot.pricing_signals,
        sourceEvidence: snapshot.source_evidence,
        provenance: { provider: snapshot.ai_provider, model: snapshot.ai_model, capturedAt: snapshot.captured_at },
      };
    },
  },

  ads_mcp_list_accessible_accounts: {
    name: "ads_mcp_list_accessible_accounts",
    module: "marketing",
    description: "Lista todas as contas acessíveis de Google Ads (customers:listAccessibleCustomers) ou Meta Ads (me/adaccounts) e Pixels da loja via OAuth 2.0.",
    tier: "store_staff",
    requiredScope: "store:marketing:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      platform: z.enum(["meta_ads", "google_ads"]),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        platform: { type: "string", enum: ["meta_ads", "google_ads"], description: "Plataforma de anúncios a inspecionar" },
      },
      required: ["storeId", "platform"],
    },
    handler: async (ctx, args) => {
      return executeDiscoverAccessibleAdAccounts(ctx.supabase, ctx.storeId || args.storeId, args.platform);
    },
  },

  ads_mcp_sync_insights_and_gaql: {
    name: "ads_mcp_sync_insights_and_gaql",
    module: "marketing",
    description: "Executa consultas GAQL no Google Ads (googleAds:searchStream) e Meta Graph Insights para sincronizar gasto real, cliques, impressões e conversões.",
    tier: "store_staff",
    requiredScope: "store:marketing:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      platform: z.enum(["meta_ads", "google_ads", "all"]).default("all"),
      datePreset: z.enum(["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH"]).default("LAST_30_DAYS"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        platform: { type: "string", enum: ["meta_ads", "google_ads", "all"], description: "Canal a sincronizar" },
        datePreset: { type: "string", enum: ["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH"], description: "Janela temporal da consulta" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      return executeSyncExternalAdCampaignMetrics(
        ctx.supabase,
        ctx.storeId || args.storeId,
        args.platform || "all",
        args.datePreset || "LAST_30_DAYS"
      );
    },
  },

  ads_mcp_diagnose_account_health: {
    name: "ads_mcp_diagnose_account_health",
    module: "marketing",
    description: "Executa a Skill de Diagnóstico Autônomo de Contas Google Ads e Meta Ads: detecta queda de conversão, verba travada, fadiga criativa e perda de impressão.",
    tier: "store_staff",
    requiredScope: "store:marketing:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      question: z.string().optional(),
      syncLiveFirst: z.boolean().default(true),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        question: { type: "string", description: "Pergunta específica do gestor em português (opcional)" },
        syncLiveFirst: { type: "boolean", description: "Se verdadeiro, sincroniza GAQL/Insights antes de diagnosticar" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      return executeDiagnoseAdAccountsHealthMcp(
        ctx.supabase,
        ctx.storeId || args.storeId,
        args.question,
        args.syncLiveFirst ?? true
      );
    },
  },

  ads_mcp_ingest_conversion_event: {
    name: "ads_mcp_ingest_conversion_event",
    module: "marketing",
    description: "Envia eventos de conversão server-side com hash SHA-256 para Google Ads Data Manager API e Meta Conversions API (CAPI).",
    tier: "store_staff",
    requiredScope: "store:marketing:write",
    permission: { action: "create", resource: "reports" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      eventName: z.enum(["Purchase", "Lead", "InitiateCheckout"]).default("Purchase"),
      orderId: z.string().optional(),
      valueCents: z.number().int().nonnegative(),
      currency: z.string().default("BRL"),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        eventName: { type: "string", enum: ["Purchase", "Lead", "InitiateCheckout"], description: "Nome do evento de conversão" },
        orderId: { type: "string", description: "ID do pedido ou transação para desduplicação" },
        valueCents: { type: "integer", description: "Valor da conversão em centavos" },
        currency: { type: "string", description: "Moeda ISO (ex: BRL)" },
        customerEmail: { type: "string", description: "E-mail do comprador para hash SHA-256" },
        customerPhone: { type: "string", description: "Telefone do comprador para hash SHA-256" },
      },
      required: ["storeId", "valueCents"],
    },
    handler: async (ctx, args) => {
      return executeIngestAdConversionEventMcp(ctx.supabase, ctx.storeId || args.storeId, {
        eventName: args.eventName || "Purchase",
        orderId: args.orderId,
        valueCents: args.valueCents,
        currency: args.currency || "BRL",
        customerEmail: args.customerEmail,
        customerPhone: args.customerPhone,
      });
    },
  },

  // ─── 12. FISCAL & TRIBUTÁRIO ──────────────────────────────────────────────
  fiscal_get_invoice_status: {
    name: "fiscal_get_invoice_status",
    module: "fiscal",
    description: "Retorna a lista das últimas notas fiscais (NF-e/NFC-e) emitidas com chaves de acesso e links DANFE.",
    tier: "store_staff",
    requiredScope: "store:fiscal:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        limit: { type: "integer", description: "Quantidade máxima de notas a consultar (máx 50)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      const { data, error } = await ctx.supabase
        .from("fiscal_invoices")
        .select("id, order_id, access_key, invoice_number, series, status, total_cents, created_at")
        .eq("store_id", args.storeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        count: data?.length || 0,
        invoices: (data || []).map((inv: any) => ({
          id: inv.id,
          orderId: inv.order_id,
          accessKey: inv.access_key,
          number: inv.invoice_number,
          series: inv.series,
          status: inv.status,
          totalBrl: (inv.total_cents || 0) / 100,
          issuedAt: inv.created_at,
        })),
      };
    },
  },

  // ─── 13. INTEGRAÇÕES & MARKETPLACES ───────────────────────────────────────
  marketplaces_get_sync_health: {
    name: "marketplaces_get_sync_health",
    module: "integrations",
    description: "Diagnóstico em tempo real da saúde de sincronização de estoque e pedidos externos (Meli, iFood, Shopee, Amazon).",
    tier: "store_staff",
    requiredScope: "store:integrations:read",
    permission: { action: "read", resource: "settings" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const { data: channels } = await ctx.supabase
        .from("store_marketplace_integrations")
        .select("marketplace, status, last_synced_at, errors_count")
        .eq("store_id", args.storeId);

      return {
        storeId: args.storeId,
        channels: (channels || []).map((ch: any) => ({
          channel: ch.marketplace,
          status: ch.status,
          lastSync: ch.last_synced_at,
          errorCount: ch.errors_count || 0,
        })),
      };
    },
  },

  // ─── 14. ATENDIMENTO & CHAT & RMA ─────────────────────────────────────────
  support_list_active_threads: {
    name: "support_list_active_threads",
    module: "support",
    description: "Lista conversas de atendimento em aberto na loja aguardando resposta de operador ou IA.",
    tier: "store_staff",
    requiredScope: "store:support:read",
    permission: { action: "read", resource: "customers" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      status: z.enum(["open", "closed", "archived"]).default("open"),
      limit: z.number().int().min(1).max(30).default(15),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        status: { type: "string", enum: ["open", "closed", "archived"], description: "Status das threads" },
        limit: { type: "integer", description: "Limite de conversas (máx 30)" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 30);
      const { data, error } = await ctx.supabase
        .from("chat_threads")
        .select("id, customer_id, guest_email, status, last_message_at, unread_count")
        .eq("store_id", args.storeId)
        .eq("status", args.status || "open")
        .order("last_message_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return {
        storeId: args.storeId,
        count: data?.length || 0,
        threads: (data || []).map((t: any) => ({
          threadId: t.id,
          customerId: t.customer_id,
          guestEmail: t.guest_email,
          status: t.status,
          unreadCount: t.unread_count || 0,
          lastMessageAt: t.last_message_at,
        })),
      };
    },
  },

  support_get_rma_case_status: {
    name: "support_get_rma_case_status",
    module: "support",
    description: "Consulta o status, diagnóstico de perícia por IA e fotos de um chamado de troca ou devolução (RMA).",
    tier: "store_staff",
    requiredScope: "store:support:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      rmaId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja autorizada" },
        rmaId: { type: "string", description: "UUID do chamado de troca/devolução" },
      },
      required: ["storeId", "rmaId"],
    },
    handler: async (ctx, args) => {
      const { data, error } = await ctx.supabase
        .from("rma_requests")
        .select("id, order_id, type, status, resolution, notes, requested_at, resolved_at, created_at, updated_at")
        .eq("id", args.rmaId)
        .eq("store_id", args.storeId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Chamado RMA "${args.rmaId}" não encontrado.`);

      return {
        rmaId: data.id,
        orderId: data.order_id,
        type: data.type,
        reason: data.notes || null,
        status: data.status,
        refundMethod: data.resolution || null,
        photosCount: 0,
        hasForensics: false,
        forensics: null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
  },

  // ─── 16. GOVERNANÇA, EVENTOS DE DOMÍNIO & MÁQUINAS DE ESTADO (P62-P65) ─────
  publish_domain_event: {
    name: "publish_domain_event",
    module: "governance",
    description: "Publica um evento de domínio canônico (lead, cotação, proposta, reserva, contrato, embarque, financeiro, ticket) no barramento do Waesy.",
    tier: "store_staff",
    requiredScope: "events:write",
    permission: { action: "create", resource: "settings" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      eventName: z.string().min(3),
      entityType: z.string().min(2),
      entityId: z.string().min(1),
      title: z.string().min(2),
      description: z.string().optional(),
      customerId: z.string().optional().nullable(),
      metadata: z.record(z.any()).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        eventName: { type: "string", description: "Nome do evento (ex: lead.stage_changed, proposal.sent, contract.signed)" },
        entityType: { type: "string", description: "Tipo da entidade (lead, proposal, order, contract, etc)" },
        entityId: { type: "string", description: "Identificador único da entidade" },
        title: { type: "string", description: "Título legível do evento para exibição na timeline" },
        description: { type: "string", description: "Descrição detalhada opcional" },
        customerId: { type: "string", description: "UUID do cliente associado, se houver" },
        metadata: { type: "object", description: "Metadados adicionais do evento" },
      },
      required: ["eventName", "entityType", "entityId", "title"],
    },
    handler: async (ctx, args) => {
      const storeId = ctx.storeId || ctx.identity?.store_id;
      if (!storeId) throw new Error("Contexto de organização/loja obrigatório para emissão de eventos de domínio.");

      const event = await publishDomainEvent({
        eventName: args.eventName as DomainEventName,
        entityType: args.entityType,
        entityId: args.entityId,
        storeId,
        customerId: args.customerId,
        title: args.title,
        description: args.description,
        metadata: args.metadata,
      });

      return {
        success: true,
        eventId: event?.id || "recorded",
        eventName: args.eventName,
        entityId: args.entityId,
        timestamp: new Date().toISOString(),
      };
    },
  },

  get_entity_unified_timeline: {
    name: "get_entity_unified_timeline",
    module: "governance",
    description: "Recupera a linha do tempo unificada com todos os eventos de ciclo de vida de uma entidade (Lead, Cliente, Reserva, Viagem, Ordem).",
    tier: "store_staff",
    requiredScope: "events:read",
    permission: { action: "read", resource: "customers" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      entityType: z.string().min(2),
      entityId: z.string().min(1),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    inputSchema: {
      type: "object",
      properties: {
        entityType: { type: "string", description: "Tipo da entidade (lead, customer, order, proposal, etc)" },
        entityId: { type: "string", description: "ID único da entidade" },
        limit: { type: "number", description: "Limite de eventos (padrão 50)" },
      },
      required: ["entityType", "entityId"],
    },
    handler: async (ctx, args) => {
      const storeId = ctx.storeId || ctx.identity?.store_id;
      let query = ctx.supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, payload_snapshot, created_at, profiles:user_id(full_name)")
        .eq("entity_type", args.entityType)
        .eq("entity_id", args.entityId)
        .order("created_at", { ascending: false })
        .limit(args.limit || 50);

      if (storeId) {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        entityType: args.entityType,
        entityId: args.entityId,
        totalEvents: (data || []).length,
        events: (data || []).map((e: any) => ({
          id: e.id,
          action: e.action,
          title: e.payload_snapshot?.title || e.action,
          description: e.payload_snapshot?.description || "",
          actor: e.profiles?.full_name || "Sistema",
          timestamp: e.created_at,
          metadata: e.payload_snapshot?.metadata || {},
        })),
      };
    },
  },

  get_niche_manifest: {
    name: "get_niche_manifest",
    module: "governance",
    description: "Obtém as configurações, módulos ativos, estágios de CRM/pedidos e nomenclaturas de qualquer nicho comercial.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "settings" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      nicheId: z.string().min(2),
    }),
    inputSchema: {
      type: "object",
      properties: {
        nicheId: { type: "string", description: "ID do nicho (tourism, gastronomy, retail, services, real_estate, healthcare, automotive, events, creator, generic)" },
      },
      required: ["nicheId"],
    },
    handler: async (_ctx, args) => {
      const manifest = getNicheManifest(args.nicheId as NicheId);
      return {
        id: manifest.id,
        label: manifest.label,
        description: manifest.description,
        activeModules: manifest.activeModules,
        nomenclature: manifest.nomenclature,
        crmStages: manifest.defaultStages.crm,
        orderStages: manifest.defaultStages.orders,
        reservationStages: manifest.defaultStages.reservations || [],
        flags: manifest.flags,
      };
    },
  },

  validate_state_transition: {
    name: "validate_state_transition",
    module: "governance",
    description: "Valida se uma transição de status é permitida para uma entidade e lista as próximas transições válidas.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "settings" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      entity: z.enum(["lead", "proposal", "trip", "departure", "contract", "order", "financial", "ticket"]),
      currentStatus: z.string(),
      targetStatus: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["lead", "proposal", "trip", "departure", "contract", "order", "financial", "ticket"] },
        currentStatus: { type: "string", description: "Status atual da entidade" },
        targetStatus: { type: "string", description: "Status desejado (opcional para testar transição específica)" },
      },
      required: ["entity", "currentStatus"],
    },
    handler: async (_ctx, args) => {
      const allowed = getAllowedTransitions(args.entity as StateMachineEntity, args.currentStatus);
      const isAllowed = args.targetStatus ? canTransition(args.entity as StateMachineEntity, args.currentStatus, args.targetStatus) : undefined;
      const currentMeta = getStatusMeta(args.entity as StateMachineEntity, args.currentStatus);

      return {
        entity: args.entity,
        currentStatus: args.currentStatus,
        currentStatusLabel: currentMeta.label,
        allowedTransitions: allowed.map((status) => ({
          status,
          ...getStatusMeta(args.entity as StateMachineEntity, status),
        })),
        isTargetAllowed: isAllowed,
      };
    },
  },

  // ─── CRM & CLIENTES ───────────────────────────────────────────────────────
  crm_create_lead: {
    name: "crm_create_lead",
    module: "crm",
    description: "Cria um novo lead comercial no funil de vendas (CRM) com contato, interesse, tags e valor estimado.",
    tier: "store_staff",
    requiredScope: "store:crm:write",
    permission: { action: "create", resource: "orders" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      name: z.string().min(2, "Nome é obrigatório"),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      destination: z.string().optional(),
      estimatedBudget: z.number().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja/agência" },
        name: { type: "string", description: "Nome do lead/cliente potencial" },
        phone: { type: "string", description: "WhatsApp ou telefone com DDD" },
        email: { type: "string", description: "E-mail de contato" },
        destination: { type: "string", description: "Destino ou interesse de compra" },
        estimatedBudget: { type: "number", description: "Valor estimado em reais" },
        notes: { type: "string", description: "Observações ou histórico da interação" },
        tags: { type: "array", items: { type: "string" }, description: "Tags semânticas" },
      },
      required: ["storeId", "name"],
    },
    handler: async (ctx, args) => {
      const estimatedValueCents = args.estimatedBudget
        ? Math.max(0, Math.round(Number(args.estimatedBudget) * 100))
        : 0;
      const { data, error } = await ctx.supabase
        .from("leads_crm")
        .insert({
          store_id: args.storeId,
          full_name: args.name,
          phone: args.phone || null,
          email: args.email || null,
          destination: args.destination || null,
          estimated_value_cents: estimatedValueCents,
          budget_cents: estimatedValueCents || null,
          notes: args.notes || null,
          tags: args.tags || [],
          status: "new",
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      await publishDomainEvent({
        eventName: "lead.created",
        entityType: "lead",
        entityId: data.id,
        storeId: args.storeId,
        title: `Lead capturado: ${args.name}`,
        description: args.destination ? `Interesse em ${args.destination}` : undefined,
        metadata: { source: "mcp_tool", budget: args.estimatedBudget },
      });

      return {
        success: true,
        leadId: data.id,
        name: data.full_name || args.name,
        status: data.status,
      };
    },
  },

  crm_get_customer_360: {
    name: "crm_get_customer_360",
    module: "crm",
    description: "Retorna a ficha 360° consolidada do cliente: cadastro, LTV histórico, viagens realizadas, propostas e timeline.",
    tier: "store_staff",
    requiredScope: "store:crm:read",
    permission: { action: "read", resource: "reports" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_staff",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      customerId: z.string().uuid(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja/agência" },
        customerId: { type: "string", description: "UUID do cliente" },
      },
      required: ["storeId", "customerId"],
    },
    handler: async (ctx, args) => {
      const { data: customer, error: custErr } = await ctx.supabase
        .from("customers_crm")
        .select("*")
        .eq("id", args.customerId)
        .eq("store_id", args.storeId)
        .maybeSingle();

      if (custErr) throw new Error(custErr.message);
      if (!customer) throw new Error(`Cliente ${args.customerId} não encontrado.`);

      const { data: trips } = await ctx.supabase
        .from("tourism_trips")
        .select("id, trip_number, title, destination_city, travel_start_date, status, total_cents")
        .eq("store_id", args.storeId)
        .or(`customer_id.eq.${args.customerId},client_whatsapp.eq.${customer.phone || 'none'},client_email.eq.${customer.email || 'none'}`)
        .order("created_at", { ascending: false })
        .limit(10);

      return {
        customer: {
          id: customer.id,
          fullName: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          document: customer.document,
          status: customer.status,
          tags: customer.tags || [],
          channel: customer.channel,
          createdAt: customer.created_at,
        },
        tripsCount: trips?.length || 0,
        trips: (trips || []).map((t: any) => ({
          tripId: t.id,
          tripNumber: t.trip_number,
          title: t.title,
          destination: t.destination_city,
          startDate: t.travel_start_date,
          status: t.status,
          totalBrl: (t.total_cents || 0) / 100,
        })),
      };
    },
  },

  // ─── 27. MOTOR CANÔNICO UNIFICADO DE ANÚNCIOS (F42) ──────────────────────
  search_unified_listings: {
    name: "search_unified_listings",
    module: "catalog",
    description: "Busca na View Canônica Unificada de anúncios (Classificados e Catálogo de Lojas) por nicho, cidade ou preço.",
    tier: "public",
    requiredScope: "public:read",
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().optional(),
      niche: z.string().optional(),
      origin: z.enum(["classified", "workspace"]).optional(),
      maxPriceCents: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(50).default(12),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca no título ou descrição" },
        niche: { type: "string", description: "Identificador do nicho (turismo, varejo, servico, etc.)" },
        origin: { type: "string", enum: ["classified", "workspace"] },
        maxPriceCents: { type: "number", description: "Preço máximo em centavos" },
        limit: { type: "number", default: 12 },
      },
    },
    handler: async (ctx, args) => {
      let q = ctx.supabase
        .from("unified_listings_view")
        .select("id, origin, item_type, niche_id, category_id, title, price_cents, images, status, created_at")
        .eq("status", "active")
        .limit(args.limit || 12);

      if (args.niche) {
        q = q.eq("niche_id", args.niche);
      }
      if (args.origin) {
        q = q.eq("origin", args.origin);
      }
      if (args.maxPriceCents) {
        q = q.lte("price_cents", args.maxPriceCents);
      }
      if (args.query) {
        q = q.ilike("title", `%${args.query}%`);
      }

      const { data, error } = await q;
      if (error) {
        throw new Error(`Falha na busca unificada: ${error.message}`);
      }

      return {
        totalFound: data?.length || 0,
        listings: (data || []).map((l: any) => ({
          id: l.id,
          origin: l.origin,
          niche: l.niche_id,
          title: l.title,
          priceBrl: (l.price_cents || 0) / 100,
          coverImage: l.images?.[0] || null,
          status: l.status,
        })),
      };
    },
  },

  transact_unified_listing: {
    name: "transact_unified_listing",
    module: "orders",
    description: "Inicia atomicamente uma transação (compra, reserva turística ou solicitação de serviço) a partir de um anúncio canônico.",
    tier: "public",
    requiredScope: "public:write",
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      listingId: z.string().uuid("ID do anúncio inválido"),
      origin: z.enum(["classified", "workspace"]),
      transactionType: z.enum(["purchase", "booking", "quote", "service_order"]),
      quantity: z.number().int().min(1).default(1),
      notes: z.string().max(500).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", description: "UUID do anúncio na View Canônica" },
        origin: { type: "string", enum: ["classified", "workspace"] },
        transactionType: { type: "string", enum: ["purchase", "booking", "quote", "service_order"] },
        quantity: { type: "number", default: 1 },
        notes: { type: "string" },
      },
      required: ["listingId", "origin", "transactionType"],
    },
    handler: async (ctx, args) => {
      const { data: listing, error } = await ctx.supabase
        .from("unified_listings_view")
        .select("*")
        .eq("id", args.listingId)
        .single();

      if (error || listing === null || listing === undefined) {
        throw new Error("Anúncio não localizado para transação.");
      }

      const totalCents = Number(listing.price_cents || 0) * args.quantity;

      const { data: deal, error: dealErr } = await ctx.supabase
        .from("deals")
        .insert({
          classified_id: args.origin === "classified" ? args.listingId : null,
          buyer_id: ctx.identity?.id || "00000000-0000-0000-0000-000000000000",
          seller_id: listing.author_id,
          status: "accepted",
          proposed_price_cents: totalCents,
          total_price_cents: totalCents,
          deal_type: args.transactionType === "booking" ? "rental" : "sale",
          is_direct_booking: true,
          terms: args.notes || `Transação iniciada via WebMCP (${args.transactionType}).`,
        })
        .select("id")
        .single();

      if (dealErr || deal === null || deal === undefined) {
        throw new Error(`Falha ao registrar negociação WebMCP: ${dealErr?.message}`);
      }

      return {
        success: true,
        dealId: deal.id,
        transactionType: args.transactionType,
        totalBrl: totalCents / 100,
        listingTitle: listing.title,
      };
    },
  },

  calculate_canonical_offer_price: {
    name: "calculate_canonical_offer_price",
    module: "orders",
    description: "Calcula a cotação transparente de preço de uma oferta aplicando regras de cupom, margem e arquétipo sem cálculos no cliente (G47, G54).",
    tier: "public",
    requiredScope: "orders:read",
    idempotent: true,
    rateLimitBucket: "public_pricing_eval",
    inputZodSchema: z.object({
      archetypeId: z.string(),
      nicheId: z.string(),
      listPriceCents: z.number().int().nonnegative(),
      salePriceCents: z.number().int().nonnegative().optional(),
      couponCode: z.string().optional(),
      couponDiscountPercent: z.number().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        archetypeId: { type: "string" },
        nicheId: { type: "string" },
        listPriceCents: { type: "integer" },
        salePriceCents: { type: "integer" },
        couponCode: { type: "string" },
        couponDiscountPercent: { type: "number" },
      },
      required: ["archetypeId", "nicheId", "listPriceCents"],
    },
    handler: async (_ctx, args) => {
      let coupon: CouponRule | undefined;
      if (args.couponCode && args.couponDiscountPercent) {
        coupon = {
          code: args.couponCode,
          type: "percentage",
          value: args.couponDiscountPercent,
        };
      }

      const quote = calculateBasePriceQuote(
        {
          archetypeId: args.archetypeId as any,
          nicheId: args.nicheId as any,
          listPriceCents: args.listPriceCents,
          salePriceCents: args.salePriceCents,
        },
        coupon
      );

      return {
        listPriceBrl: quote.listPriceCents / 100,
        finalPriceBrl: quote.finalPriceCents / 100,
        discountBrl: quote.discountCents / 100,
        discountPercent: quote.discountPercent,
        isPromotional: quote.isPromotional,
      };
    },
  },

  get_niche_package_spec: {
    name: "get_niche_package_spec",
    module: "catalog",
    description: "Inspeciona o pacote canônico de um nicho específico com terminologias, arquétipos habilitados e regras regulatórias (G10, G18).",
    tier: "public",
    requiredScope: "catalog:read",
    idempotent: true,
    rateLimitBucket: "public_niche_spec",
    inputZodSchema: z.object({
      nicheId: z.string(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        nicheId: { type: "string" },
      },
      required: ["nicheId"],
    },
    handler: async (_ctx, args) => {
      const pkg = getNichePackage(args.nicheId);
      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        defaultArchetype: pkg.defaultArchetype,
        terminology: pkg.terminology,
        regulatoryBody: pkg.fiscalAndRegulatory.regulatoryBody,
        mandatoryDisclaimers: pkg.fiscalAndRegulatory.mandatoryLegalDisclaimers,
        sectionsCount: pkg.detailSections.length,
      };
    },
  },

  inspect_stock_ledger: {
    name: "inspect_stock_ledger",
    module: "catalog",
    description: "Consulta o histórico imutável do ledger de movimentações de estoque para uma variante da loja (G39, G41).",
    tier: "store_staff",
    requiredScope: "inventory:read",
    idempotent: true,
    rateLimitBucket: "store_stock_audit",
    inputZodSchema: z.object({
      variantId: z.string().uuid(),
      storeId: z.string().uuid(),
      limit: z.number().int().positive().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        variantId: { type: "string", format: "uuid" },
        storeId: { type: "string", format: "uuid" },
        limit: { type: "integer" },
      },
      required: ["variantId", "storeId"],
    },
    handler: async (_ctx, args) => {
      const ledgerHistory = await _listStockLedger(args.variantId, args.storeId, args.limit || 20);
      return {
        variantId: args.variantId,
        movementsCount: ledgerHistory.length,
        movements: ledgerHistory,
      };
    },
  },

  search_hotels_and_resorts: {
    name: "search_hotels_and_resorts",
    module: "tourism",
    description: "Busca hotéis, resorts e pousadas catalogados com filtros geográficos, estrelas e comodidades.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "products" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      minStars: z.number().int().min(1).max(5).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nome ou palavra-chave da acomodação" },
        city: { type: "string", description: "Nome do município" },
        state: { type: "string", description: "UF do estado (ex: PE, AL, BA, SC)" },
        minStars: { type: "integer", description: "Classificação mínima por estrelas (1 a 5)" },
        limit: { type: "integer", default: 10 },
      },
    },
    handler: async (ctx, args) => {
      let query = ctx.supabase
        .from("hotels_bank")
        .select("id, name, city, state, stars, regime_options, cover_photo_url, description, internal_rating, website, phone, address")
        .eq("is_active", true);

      if (args.city) query = query.ilike("city", `%${args.city}%`);
      if (args.state) query = query.ilike("state", `%${args.state}%`);
      if (args.minStars) query = query.gte("stars", args.minStars);
      if (args.query) query = query.ilike("name", `%${args.query}%`);

      const { data, error } = await query.order("internal_rating", { ascending: false }).limit(args.limit || 10);
      if (error) throw new Error(`Falha ao buscar hospedagens: ${error.message}`);
      return { total: data?.length || 0, hotels: data || [] };
    },
  },

  search_public_tenders: {
    name: "search_public_tenders",
    module: "governance",
    description: "Consulta editais e licitações públicas municipais (PNCP) auditadas com score de risco e resumo de IA.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "orders" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().optional(),
      city: z.string().optional(),
      uf: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca no título ou objeto da licitação" },
        city: { type: "string", description: "Município da contratação" },
        uf: { type: "string", description: "Sigla do estado (ex: SC, PR, RS)" },
        limit: { type: "integer", default: 10 },
      },
    },
    handler: async (ctx, args) => {
      let query = ctx.supabase
        .from("mined_tenders")
        .select("id, pncp_id, title, agency_name, modality, estimated_amount_cents, publication_date, closing_date, city, uf, portal_url, ai_risk_score, ai_curated_digest");

      if (args.city) query = query.ilike("city", `%${args.city}%`);
      if (args.uf) query = query.ilike("uf", `%${args.uf}%`);
      if (args.query) query = query.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`);

      const { data, error } = await query.order("publication_date", { ascending: false }).limit(args.limit || 10);
      if (error) throw new Error(`Falha ao consultar licitações: ${error.message}`);
      return { total: data?.length || 0, tenders: data || [] };
    },
  },

  search_news_articles: {
    name: "search_news_articles",
    module: "marketing",
    description: "Busca notícias jornalísticas apuradas com lead 5W1H e metadados de credibilidade.",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      query: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca no título ou conteúdo da notícia" },
        category: { type: "string", description: "Categoria jornalística (ex: cidade, economia, politica)" },
        limit: { type: "integer", default: 10 },
      },
    },
    handler: async (ctx, args) => {
      let query = ctx.supabase
        .from("news_articles")
        .select("id, title, slug, subtitle, kicker, category, published_at, reading_time_minutes, source_url, cover_media_url")
        .eq("status", "published");

      if (args.category) query = query.eq("category", args.category);
      if (args.query) query = query.ilike("title", `%${args.query}%`);

      const { data, error } = await query.order("published_at", { ascending: false }).limit(args.limit || 10);
      if (error) throw new Error(`Falha ao buscar notícias: ${error.message}`);
      return { total: data?.length || 0, articles: data || [] };
    },
  },

  // ── 9. META ADS & TELEMETRIA CLOSED-LOOP ─────────────────────────────────────
  meta_ads_diagnose_tracking: {
    name: "meta_ads_diagnose_tracking",
    module: "marketing",
    description: "Audita a integridade do Meta Pixel, token CAPI server-side e eventos de conversão da loja.",
    tier: "store_staff",
    requiredScope: "marketing:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid("Store ID válido é obrigatório"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja a auditar" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const [{ data: config, error }, { data: multiPixels }, { data: metaCred }] = await Promise.all([
        ctx.supabase
          .from("store_pixel_configs")
          .select("meta_pixel_id, meta_capi_token, google_ads_id, ga4_measurement_id, track_whatsapp_leads, track_catalog_views, track_quotes, track_purchases, updated_at")
          .eq("store_id", args.storeId)
          .maybeSingle(),
        (ctx.supabase.from("marketing_source_pixels") as any)
          .select("id, name, provider, external_pixel_id, capi_token_configured, is_default, is_active, last_fired_at")
          .eq("store_id", args.storeId)
          .eq("is_active", true)
          .then((r: any) => r, () => ({ data: [] })),
        ctx.supabase
          .from("integration_credentials")
          .select("id, is_active")
          .eq("store_id", args.storeId)
          .eq("provider", "meta_pixel")
          .eq("is_active", true)
          .maybeSingle()
          .then((r: any) => r, () => ({ data: null })),
      ]);

      if (error) throw new Error(`Falha ao obter telemetria: ${error.message}`);

      const activeSourcePixels = Array.isArray(multiPixels) ? multiPixels : [];
      const hasMultiMetaPixel = activeSourcePixels.some((p: any) => p.provider === "meta_pixel");
      const hasMultiMetaCapi = activeSourcePixels.some((p: any) => p.provider === "meta_pixel" && p.capi_token_configured);
      const hasPixel = Boolean(config?.meta_pixel_id || hasMultiMetaPixel);
      const hasCapi = Boolean(config?.meta_capi_token || metaCred?.is_active || hasMultiMetaCapi);

      return {
        storeId: args.storeId,
        pixelConfigured: hasPixel,
        capiConfigured: hasCapi,
        multiPixelCount: activeSourcePixels.length,
        sourcePixels: activeSourcePixels,
        trackingHealth: hasPixel && hasCapi ? "optimal" : (hasPixel ? "browser_only" : "disabled"),
        enabledEvents: {
          lead: Boolean(config?.track_whatsapp_leads || config?.track_quotes),
          whatsappClick: Boolean(config?.track_whatsapp_leads),
          addToCart: Boolean(config?.track_purchases),
          checkout: Boolean(config?.track_initiate_checkout),
        },
        recommendations: !hasCapi
          ? ["Configure o token da Conversions API (CAPI) no cofre seguro (por Pixel ou padrão da loja) para garantir 100% de precisão server-side."]
          : ["Telemetria Multi-Pixel / CAPI ativa. Estágios de CRM e WhatsApp roteiam eventos de qualificação diretamente para os Pixels configurados."],
      };
    },
  },

  meta_ads_enrich_ad_metadata: {
    name: "meta_ads_enrich_ad_metadata",
    module: "marketing",
    description: "Resolve e enriquece metadados completos de Campanha, Conjunto e Anúncio (CTWA / Leadgen) via tabelas locais ou Meta Graph API.",
    tier: "store_staff",
    requiredScope: "marketing:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid("Store ID válido é obrigatório"),
      adId: z.string().min(2).max(120).optional(),
      campaignId: z.string().min(2).max(120).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        adId: { type: "string", description: "ID externo do anúncio Meta" },
        campaignId: { type: "string", description: "ID externo da campanha Meta" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      const { resolveAndEnrichMetaAdMetadata, formatReadableCampaignDetail } = await import(
        "@/services/meta-ad-enrichment.server"
      );
      const enriched = await resolveAndEnrichMetaAdMetadata(ctx.supabase, {
        storeId: args.storeId,
        adId: args.adId || null,
        campaignId: args.campaignId || null,
      });
      return {
        enriched,
        readableDetail: enriched
          ? formatReadableCampaignDetail({
              campaignName: enriched.campaignName,
              adsetName: enriched.adsetName,
              adName: enriched.adName,
              adHeadline: enriched.adHeadline,
              adId: enriched.adId,
            })
          : null,
      };
    },
  },

  crm_sync_qualified_lead_conversion: {
    name: "crm_sync_qualified_lead_conversion",
    module: "crm",
    description: "Sincroniza um lead qualificado do CRM retroalimentando a IA da Meta e Google Ads via CAPI.",
    tier: "store_staff",
    requiredScope: "crm:write",
    permission: { action: "update", resource: "customers" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      leadId: z.string().uuid(),
      stage: z.enum(["qualified", "proposal", "negotiation", "won", "converted", "lost"]),
      estimatedValueBrl: z.number().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        leadId: { type: "string", description: "UUID da oportunidade no CRM" },
        stage: { type: "string", description: "Novo estágio do lead (ex: qualified, won)" },
        estimatedValueBrl: { type: "number", description: "Valor comercial estimado em Reais (BRL)" },
      },
      required: ["storeId", "leadId", "stage"],
    },
    handler: async (ctx, args) => {
      if (!ctx.storeId || ctx.storeId !== args.storeId) {
        throw new Error("Tenant do contexto não corresponde à loja solicitada.");
      }
      const { data: lead, error } = await ctx.supabase
        .from("leads_crm")
        .select("id, full_name, email, phone, notes, estimated_value_cents, custom_fields")
        .eq("id", args.leadId)
        .eq("store_id", args.storeId)
        .single();

      if (error || !lead) throw new Error("Lead não localizado no CRM da loja.");

      const { dispatchClosedLoopLeadQualification } = await import("@/services/pixels.functions");
      const conversionValue = Number(lead.estimated_value_cents || 0) / 100;
      if (["won", "converted"].includes(args.stage) && conversionValue <= 0) {
        throw new Error("Conversão financeira exige valor persistido maior que zero.");
      }
      const cf = (lead.custom_fields as Record<string, any>) || {};

      const result = await dispatchClosedLoopLeadQualification({
        data: {
          storeId: args.storeId,
          leadId: lead.id,
          stage: args.stage,
          eventId: `lead_${lead.id}_${args.stage}`,
          email: lead.email,
          phone: lead.phone,
          conversionValue,
          fbp: cf.fbp || cf.attribution?.fbp || null,
          fbc: cf.fbc || cf.attribution?.fbc || null,
          clientUserAgent: cf.userAgent || cf.attribution?.userAgent || null,
          sourceUrl: cf.sourceUrl || cf.attribution?.sourceUrl || null,
          adId: cf.meta_ad_id || cf.ad_id || cf.attribution?.ad_id || null,
          campaignId: cf.meta_campaign_id || cf.campaign_id || cf.attribution?.campaign_id || null,
          formId: cf.meta_form_id || cf.form_id || cf.attribution?.form_id || null,
          sourcePixelId: cf.source_pixel_id || cf.attribution?.source_pixel_id || null,
        },
      });

      if (!result.success) {
        throw new Error("A conversão qualificada não foi entregue a nenhum canal conectado.");
      }

      return {
        status: "synced",
        leadId: lead.id,
        leadName: lead.full_name,
        targetStage: args.stage,
        conversionValue,
        telemetry: result,
      };
    },
  },

  meta_ads_discover_accounts_and_pixels: {
    name: "meta_ads_discover_accounts_and_pixels",
    module: "marketing",
    description: "Descobre todas as contas de anúncio, Pixels e Páginas Meta acessíveis pelo token OAuth sem limite de accounts[0].",
    tier: "store_staff",
    requiredScope: "marketing:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid("Store ID válido é obrigatório"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      if (!ctx.storeId || ctx.storeId !== args.storeId) {
        throw new Error("Tenant do contexto não corresponde à loja solicitada.");
      }
      const { executeDiscoverAccessibleAdAccounts } = await import("@/services/ads.functions");
      return executeDiscoverAccessibleAdAccounts(ctx.supabase, args.storeId, "meta_ads");
    },
  },

  meta_ads_get_closed_loop_roas: {
    name: "meta_ads_get_closed_loop_roas",
    module: "marketing",
    description: "Retorna métricas fechadas de ROAS, CPL, CPA, entregas CAPI por Pixel/Fonte e campanhas ativas Meta Ads.",
    tier: "store_staff",
    requiredScope: "marketing:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid("Store ID válido é obrigatório"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
      },
      required: ["storeId"],
    },
    handler: async (ctx, args) => {
      if (!ctx.storeId || ctx.storeId !== args.storeId) {
        throw new Error("Tenant do contexto não corresponde à loja solicitada.");
      }
      const [{ data: campaigns }, { data: leads }, { data: telemetry }, { data: pixels }] = await Promise.all([
        (ctx.supabase.from("store_ad_campaigns") as any)
          .select("id, title, external_campaign_id, spend_cents, status")
          .eq("store_id", args.storeId),
        ctx.supabase
          .from("leads_crm")
          .select("id, status, source, estimated_value_cents")
          .eq("store_id", args.storeId),
        (ctx.supabase.from("lead_conversion_telemetry") as any)
          .select("id, event_name, status, source_pixel_id, external_pixel_id")
          .eq("store_id", args.storeId)
          .order("created_at", { ascending: false })
          .limit(200),
        (ctx.supabase.from("marketing_source_pixels") as any)
          .select("id, name, external_pixel_id, is_default, is_active")
          .eq("store_id", args.storeId)
          .then((r: any) => r, () => ({ data: [] })),
      ]);

      const totalSpendCents = ((campaigns as any[]) || []).reduce((acc, c) => acc + Number(c.spend_cents || 0), 0);
      const totalLeads = (leads || []).length;
      const wonStatuses = new Set(["won", "converted", "closed", "ganho", "fechado"]);
      const wonLeads = (leads || []).filter((l: any) => wonStatuses.has(String(l.status || "").toLowerCase()));
      const wonRevenueCents = wonLeads.reduce((acc: number, l: any) => acc + Number(l.estimated_value_cents || 0), 0);
      const deliveredCapi = ((telemetry as any[]) || []).filter((t) => t.status === "delivered").length;

      return {
        storeId: args.storeId,
        campaignsCount: (campaigns || []).length,
        activePixelsCount: (pixels || []).length,
        totalLeads,
        wonDealsCount: wonLeads.length,
        totalSpendBrl: Number((totalSpendCents / 100).toFixed(2)),
        wonRevenueBrl: Number((wonRevenueCents / 100).toFixed(2)),
        roas: totalSpendCents > 0 ? Number((wonRevenueCents / totalSpendCents).toFixed(2)) : null,
        cplBrl: totalLeads > 0 && totalSpendCents > 0 ? Number(((totalSpendCents / totalLeads) / 100).toFixed(2)) : null,
        capiDeliveredCount: deliveredCapi,
        telemetryTotal: (telemetry || []).length,
      };
    },
  },

  // ── 10. SIMLABS 4.0 & MINERAÇÃO DE DADOS ──────────────────────────────────
  simlab_run_batch_simulation: {
    name: "simlab_run_batch_simulation",
    module: "simulation",
    description:
      "Executa simulação de mercado SimLabs 4.0 em lote com personas sintéticas para validar oferta, preço ou campanha.",
    tier: "store_staff",
    requiredScope: "marketing:write",
    permission: { action: "create", resource: "marketing" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      title: z.string().min(2).max(160),
      objective: z.string().min(5).max(1200),
      municipalityFilter: z.string().max(120).optional(),
      sampleSize: z.number().int().min(3).max(30).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        title: { type: "string", description: "Título do experimento SimLab" },
        objective: { type: "string", description: "Oferta, preço ou hipótese a testar" },
        municipalityFilter: { type: "string", description: "Cidade/UF alvo opcional" },
        sampleSize: { type: "number", description: "Quantidade de personas (3 a 30)" },
      },
      required: ["storeId", "title", "objective"],
    },
    handler: async (ctx, args) => {
      const targetStoreId = ctx.storeId || args.storeId;
      const { executeCreateSimLabExperiment, executeSimLabBatchSimulation } = await import(
        "@/services/simlab.functions"
      );
      const { experiment } = await executeCreateSimLabExperiment({
        storeId: targetStoreId,
        title: args.title,
        objective: args.objective,
        municipalityFilter: args.municipalityFilter || "Nacional",
        stimulusPayload: {
          title: args.title,
          description: args.objective,
          municipality_filter: args.municipalityFilter || "Nacional",
        },
        sampleSize: Math.min(Math.max(Number(args.sampleSize) || 10, 3), 30),
      });
      const batchResult = await executeSimLabBatchSimulation({
        experimentId: experiment.id,
        storeId: targetStoreId,
      });
      return {
        experimentId: experiment.id,
        title: experiment.title,
        responsesCount: batchResult.responsesCount,
        synthesis: batchResult.synthesis,
        sampleReactions: batchResult.responses.slice(0, 6).map((r) => ({
          archetypeCode: r.archetype_code,
          displayName: r.archetype?.display_name || "Perfil sintético",
          reaction: r.verbatim_reaction,
          objection: r.primary_barrier_objection || null,
        })),
      };
    },
  },

  simlab_generate_seven_sins_copy: {
    name: "simlab_generate_seven_sins_copy",
    module: "simulation",
    description:
      "Gera copy persuasiva sob um dos 7 gatilhos psicológicos (Seven Sins) vinculada a um produto real da loja.",
    tier: "store_staff",
    requiredScope: "marketing:write",
    permission: { action: "create", resource: "marketing" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      sin: z.enum(["orgulho", "ganancia", "luxuria", "inveja", "gula", "ira", "preguica"]),
      productId: z.string().uuid().optional(),
      productNameFallback: z.string().min(2).max(160).optional(),
      targetChannel: z
        .enum(["whatsapp", "instagram_ad", "push_notification", "storefront_banner"])
        .default("instagram_ad"),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja" },
        sin: { type: "string", description: "Gatilho: orgulho, ganancia, luxuria, inveja, gula, ira, preguica" },
        productId: { type: "string", description: "UUID opcional do produto" },
        productNameFallback: { type: "string", description: "Nome do produto se sem UUID" },
        targetChannel: { type: "string", description: "Canal: whatsapp, instagram_ad, push_notification, storefront_banner" },
      },
      required: ["storeId", "sin"],
    },
    handler: async (ctx, args) => {
      const targetStoreId = ctx.storeId || args.storeId;
      const { generateSevenSinCopyLogic } = await import("@/services/seven-sins-simlab.functions");
      return generateSevenSinCopyLogic({
        storeId: targetStoreId,
        sin: args.sin,
        productId: args.productId,
        productNameFallback: args.productNameFallback,
        targetChannel: args.targetChannel || "instagram_ad",
      });
    },
  },

  mining_scrape_url: {
    name: "mining_scrape_url",
    module: "mining",
    description:
      "Extrai conteúdo limpo em Markdown/HTML de uma URL pública externa validada contra SSRF usando React Mining.",
    tier: "store_staff",
    requiredScope: "marketing:read",
    permission: { action: "read", resource: "marketing" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      url: z.string().url(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja solicitante" },
        url: { type: "string", description: "URL pública HTTP/HTTPS a extrair" },
      },
      required: ["storeId", "url"],
    },
    handler: async (_ctx, args) => {
      const { assertSafeUrl } = await import("@/services/onboarding-pipeline.server");
      const safe = assertSafeUrl(args.url);
      const { scrapeUrlWithReact } = await import("@/services/mining/react-mining-adapter");
      const res = await scrapeUrlWithReact(safe.toString());
      return {
        url: safe.toString(),
        success: res.success,
        provider: res.provider,
        quality: res.react.quality,
        iterations: res.react.iterations,
        markdownExcerpt: String(res.markdown || "").slice(0, 6000),
        error: res.error || null,
      };
    },
  },

  mining_query_mined_catalog: {
    name: "mining_query_mined_catalog",
    module: "mining",
    description:
      "Consulta dados já minerados na base regional (notícias, vagas de emprego, eventos ou empresas indexadas).",
    tier: "public",
    requiredScope: "public:read",
    permission: { action: "read", resource: "content" },
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      source: z.enum(["news", "jobs", "events", "places"]).default("places"),
      query: z.string().max(120).optional(),
      city: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Fonte: news, jobs, events, places" },
        query: { type: "string", description: "Termo de busca opcional" },
        city: { type: "string", description: "Cidade opcional" },
        limit: { type: "number", description: "Limite de itens (1 a 20)" },
      },
      required: [],
    },
    handler: async (ctx, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
      const q = String(args.query || "").trim();
      if (args.source === "news") {
        let query = ctx.supabase
          .from("mined_articles")
          .select("id, title, slug, category, city, summary, published_at")
          .order("published_at", { ascending: false })
          .limit(limit);
        if (q) query = query.ilike("title", `%${q}%`);
        if (args.city) query = query.ilike("city", `%${args.city}%`);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return { source: "news", total: data?.length || 0, items: data || [] };
      }
      if (args.source === "jobs") {
        let query = ctx.supabase
          .from("jobs_catalog")
          .select("id, title, company_name, city, state, salary_display, employment_type, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (q) query = query.ilike("title", `%${q}%`);
        if (args.city) query = query.ilike("city", `%${args.city}%`);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return { source: "jobs", total: data?.length || 0, items: data || [] };
      }
      if (args.source === "events") {
        let query = ctx.supabase
          .from("events")
          .select("id, title, slug, city, state, start_date, venue_name")
          .order("start_date", { ascending: true })
          .limit(limit);
        if (q) query = query.ilike("title", `%${q}%`);
        if (args.city) query = query.ilike("city", `%${args.city}%`);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return { source: "events", total: data?.length || 0, items: data || [] };
      }
      let query = ctx.supabase
        .from("scraped_businesses")
        .select("id, name, category, city, state, address, phone, website")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (q) query = query.ilike("name", `%${q}%`);
      if (args.city) query = query.ilike("city", `%${args.city}%`);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { source: "places", total: data?.length || 0, items: data || [] };
    },
  },

  mining_run_local_places_harvest: {
    name: "mining_run_local_places_harvest",
    module: "mining",
    description:
      "Executa mineração sob demanda de empresas locais ou licitações PNCP para uma cidade e persiste no banco.",
    tier: "store_staff",
    requiredScope: "marketing:write",
    permission: { action: "create", resource: "marketing" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      storeId: z.string().uuid(),
      mode: z.enum(["places", "pncp"]).default("places"),
      city: z.string().min(2).max(120),
      state: z.string().length(2).optional(),
      categories: z.array(z.string().min(2)).max(4).optional(),
      query: z.string().max(120).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string", description: "UUID da loja solicitante" },
        mode: { type: "string", description: "places ou pncp" },
        city: { type: "string", description: "Cidade alvo" },
        state: { type: "string", description: "UF (2 letras)" },
        categories: { type: "array", description: "Categorias (até 4) para places" },
        query: { type: "string", description: "Termo opcional para PNCP" },
      },
      required: ["storeId", "city"],
    },
    handler: async (_ctx, args) => {
      if (args.mode === "pncp") {
        const { harvestAndPersistPncpTenders } = await import("@/services/mining/pncp-harvester");
        return harvestAndPersistPncpTenders({
          municipio: args.city,
          uf: args.state,
          query: args.query,
        });
      }
      const { harvestLocalPlaces } = await import("@/services/mining/places-harvester");
      return harvestLocalPlaces({
        city: args.city,
        state: args.state,
        categories: args.categories?.slice(0, 3),
      });
    },
  },
  copilot_autonomous_prospecting: {
    name: "copilot_autonomous_prospecting",
    module: "mining",
    description:
      "Executa mineração e prospecção autônoma B2B/territorial (leads por cidade, CNPJ na Receita Federal, processos CNJ ou pesquisa de mercado) com geração automática de planilha/dossiê.",
    tier: "store_staff",
    requiredScope: "marketing:write",
    permission: { action: "create", resource: "marketing" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      prompt: z.string().min(4).max(1500),
      city: z.string().max(120).optional(),
      state: z.string().length(2).optional(),
      storeId: z.string().uuid().optional(),
      threadId: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Pedido detalhado de prospecção, CNPJ ou CNJ" },
        city: { type: "string", description: "Cidade alvo para recorte geográfico" },
        state: { type: "string", description: "UF (2 letras)" },
        storeId: { type: "string", description: "UUID da loja" },
      },
      required: ["prompt"],
    },
    handler: async (ctx, args) => {
      const { executeAutonomousCopilotTask } = await import(
        "@/services/autonomous-copilot-orchestrator"
      );
      return executeAutonomousCopilotTask(args.prompt, {
        threadId: args.threadId,
        storeId: args.storeId || ctx.storeId,
        activeCity: args.city,
        activeState: args.state,
      });
    },
  },
  squad_orchestrator_run: {
    name: "squad_orchestrator_run",
    module: "marketing",
    description:
      "Aciona um squad multi-agente com handoff supervisionado (sales_squad para qualificação SDR e proposta; publishing_squad para campanha e revisão editorial; finance_squad para OCR e conciliação).",
    tier: "store_staff",
    requiredScope: "marketing:write",
    permission: { action: "create", resource: "marketing" },
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      squadSlug: z.enum(["sales_squad", "publishing_squad", "finance_squad"]).default("sales_squad"),
      prompt: z.string().min(4).max(4000),
      city: z.string().max(120).optional(),
      storeId: z.string().uuid().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        squadSlug: {
          type: "string",
          description: "sales_squad, publishing_squad ou finance_squad",
        },
        prompt: { type: "string", description: "Briefing e objetivo da missão multi-agente" },
        city: { type: "string", description: "Cidade de contexto" },
        storeId: { type: "string", description: "UUID da loja" },
      },
      required: ["prompt"],
    },
    handler: async (ctx, args) => {
      const { runSquadGraphExecution } = await import(
        "@/services/ai-agent-squad-orchestrator.functions"
      );
      return runSquadGraphExecution(
        args.squadSlug || "sales_squad",
        {
          prompt: args.prompt,
          context: {
            city: args.city,
            storeId: args.storeId || ctx.storeId,
          },
        },
        {
          userId: ctx.identity?.id || undefined,
          storeId: args.storeId || ctx.storeId,
        },
      );
    },
  },
  connector_github_ops: {
    name: "connector_github_ops",
    module: "integrations",
    description:
      "Lista repositórios, lê arquivo ou envia arquivos para repositório no GitHub usando token cifrado em Conectores.",
    tier: "public",
    requiredScope: "integrations:write",
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      action: z.string(),
      repoName: z.string().optional(),
      filePath: z.string().optional(),
      files: z.record(z.string()).optional(),
      isPrivate: z.boolean().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "list_repos | get_file | push_files" },
        repoName: { type: "string", description: "Nome ou owner/repo" },
        filePath: { type: "string", description: "Caminho do arquivo (get_file)" },
        files: { type: "object", description: "Mapa path -> conteúdo (push_files)" },
        isPrivate: { type: "boolean", description: "Repositório privado ao criar (default true)" },
      },
      required: ["action"],
    },
    handler: async (ctx, args) => {
      if (!ctx.identity?.id) {
        throw new Error("Autenticação obrigatória para operar o conector GitHub.");
      }
      const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
        "@/services/ai-connectors-secrets.server"
      );
      if (args.action === "push_files") {
        const { runDeployFilesToGitHubForUser } = await import("@/services/copilot-deploy.functions");
        return runDeployFilesToGitHubForUser(ctx.identity.id, {
          repoName: String(args.repoName || "waesy-copilot-app"),
          isPrivate: args.isPrivate !== false,
          branch: "main",
          files: (args.files && typeof args.files === "object" ? args.files : {}) as Record<string, string>,
        });
      }
      const record = await getDecryptedConnectorCredentialsForUser(ctx.identity.id, "github");
      const token = record ? extractConnectorToken(record.credentials) : "";
      if (!token) {
        throw new Error("Conector GitHub não conectado. Peça ao usuário para configurar em Conectores & MCP.");
      }
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Waesy-Copilot-Agent/1.0",
      };
      if (args.action === "get_file" && args.repoName && args.filePath) {
        const res = await fetch(
          `https://api.github.com/repos/${String(args.repoName)}/contents/${encodeURIComponent(String(args.filePath))}`,
          { headers },
        );
        if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
        const json = (await res.json()) as { content?: string; encoding?: string; html_url?: string };
        const decoded =
          json.encoding === "base64" && json.content
            ? Buffer.from(json.content, "base64").toString("utf8").slice(0, 8000)
            : "";
        return { path: args.filePath, url: json.html_url || null, content: decoded };
      }
      const reposRes = await fetch("https://api.github.com/user/repos?per_page=15&sort=updated", { headers });
      if (!reposRes.ok) throw new Error(`GitHub HTTP ${reposRes.status}`);
      const repos = (await reposRes.json()) as Array<{ full_name: string; html_url: string; private: boolean }>;
      return {
        repositories: repos.map((r) => ({
          fullName: r.full_name,
          url: r.html_url,
          isPrivate: r.private,
        })),
      };
    },
  },
  connector_vercel_deploy: {
    name: "connector_vercel_deploy",
    module: "integrations",
    description:
      "Publica arquivos HTML/web diretamente na Vercel via API v13 usando o token cifrado do usuário.",
    tier: "public",
    requiredScope: "integrations:write",
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      projectName: z.string(),
      files: z.record(z.string()),
      target: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "Slug minúsculo do projeto na Vercel" },
        files: { type: "object", description: "Mapa path -> conteúdo" },
        target: { type: "string", description: "production | preview" },
      },
      required: ["projectName", "files"],
    },
    handler: async (ctx, args) => {
      if (!ctx.identity?.id) {
        throw new Error("Autenticação obrigatória para publicar na Vercel.");
      }
      const { runDeployFilesToVercelForUser } = await import("@/services/copilot-deploy.functions");
      return runDeployFilesToVercelForUser(ctx.identity.id, {
        projectName: String(args.projectName)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .slice(0, 64),
        target: args.target === "preview" ? "preview" : "production",
        files: (args.files && typeof args.files === "object" ? args.files : {}) as Record<string, string>,
      });
    },
  },
  connector_notion_ops: {
    name: "connector_notion_ops",
    module: "integrations",
    description: "Pesquisa páginas/bancos no Notion conectado pelo usuário via API oficial Notion.",
    tier: "public",
    requiredScope: "integrations:read",
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      query: z.string(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca no Notion" },
      },
      required: ["query"],
    },
    handler: async (ctx, args) => {
      if (!ctx.identity?.id) {
        throw new Error("Autenticação obrigatória para consultar o Notion.");
      }
      const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
        "@/services/ai-connectors-secrets.server"
      );
      const record = await getDecryptedConnectorCredentialsForUser(ctx.identity.id, "notion");
      const token = record ? extractConnectorToken(record.credentials) : "";
      if (!token) {
        throw new Error("Conector Notion não conectado ou sem Internal Integration Token.");
      }
      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: String(args.query || ""), page_size: 8 }),
      });
      if (!res.ok) throw new Error(`Notion HTTP ${res.status}`);
      const json = (await res.json()) as { results?: Array<{ id: string; object: string; url?: string }> };
      return {
        results: (json.results || []).map((item) => ({
          id: item.id,
          object: item.object,
          url: item.url || null,
        })),
      };
    },
  },
  connector_slack_post: {
    name: "connector_slack_post",
    module: "integrations",
    description: "Lista canais ou envia mensagem para canal Slack usando Bot Token cifrado do usuário.",
    tier: "public",
    requiredScope: "integrations:write",
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_authenticated",
    inputZodSchema: z.object({
      action: z.string(),
      channel: z.string().optional(),
      text: z.string().optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "list_channels | post_message" },
        channel: { type: "string", description: "ID do canal Slack" },
        text: { type: "string", description: "Conteúdo da mensagem" },
      },
      required: ["action"],
    },
    handler: async (ctx, args) => {
      if (!ctx.identity?.id) {
        throw new Error("Autenticação obrigatória para operar o conector Slack.");
      }
      const { getDecryptedConnectorCredentialsForUser, extractConnectorToken } = await import(
        "@/services/ai-connectors-secrets.server"
      );
      const record = await getDecryptedConnectorCredentialsForUser(ctx.identity.id, "slack");
      const token = record ? extractConnectorToken(record.credentials) : "";
      if (!token) {
        throw new Error("Conector Slack não conectado ou sem Bot Token.");
      }
      if (args.action === "post_message" && args.channel && args.text) {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel: String(args.channel), text: String(args.text) }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; ts?: string };
        if (!res.ok || !json?.ok) throw new Error(json?.error || `Slack HTTP ${res.status}`);
        return { posted: true, channel: args.channel, ts: json.ts };
      }
      const listRes = await fetch("https://slack.com/api/conversations.list?limit=15&types=public_channel", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listJson = (await listRes.json()) as {
        ok?: boolean;
        error?: string;
        channels?: Array<{ id: string; name: string }>;
      };
      if (!listRes.ok || !listJson?.ok) throw new Error(listJson?.error || `Slack HTTP ${listRes.status}`);
      return {
        channels: (listJson.channels || []).map((c) => ({ id: c.id, name: c.name })),
      };
    },
  },

  // ─── WORKSPACE VFS & COMPUTE SANDBOX ──────────────────────────────────────
  workspace_vfs_write: {
    name: "workspace_vfs_write",
    module: "workspace",
    description: "Cria, atualiza ou aplica patch cirúrgico em arquivo do Workspace Virtual (VFS) da tarefa atual com diff rastreável.",
    tier: "public",
    requiredScope: "workspace:write",
    idempotent: false,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      path: z.string().min(1).max(180),
      mode: z.enum(["write", "patch"]).default("write"),
      content: z.string().max(200_000).optional(),
      search: z.string().max(50_000).optional(),
      replace: z.string().max(200_000).optional(),
      language: z.string().max(32).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Caminho relativo no VFS, ex: relatorio.md, dados.csv, script.py, index.html" },
        mode: { type: "string", enum: ["write", "patch"] },
        content: { type: "string", description: "Conteúdo completo quando mode=write" },
        search: { type: "string", description: "Trecho exato a substituir quando mode=patch" },
        replace: { type: "string", description: "Novo trecho quando mode=patch" },
        language: { type: "string" },
      },
      required: ["path"],
    },
    handler: async (ctx, args) => {
      const vfs: WorkspaceVfsMap = ctx.vfsFiles || {};
      const mutation =
        args.mode === "patch"
          ? vfsPatchFile(vfs, args.path, String(args.search || ""), String(args.replace ?? ""))
          : vfsWriteFile(vfs, args.path, String(args.content ?? ""), args.language);
      await ctx.onVfsMutation?.(mutation.file, mutation.originalContent);
      return {
        path: mutation.file.path,
        version: mutation.file.version,
        sizeBytes: mutation.file.sizeBytes,
        language: mutation.file.language,
        diffPreview: mutation.diffPreview,
        _summary: `Arquivo "${mutation.file.path}" salvo (v${mutation.file.version}, ${mutation.file.sizeBytes} bytes).`,
      };
    },
  },

  workspace_vfs_read: {
    name: "workspace_vfs_read",
    module: "workspace",
    description: "Lista ou lê conteúdo de arquivos criados no Workspace Virtual (VFS) da execução atual.",
    tier: "public",
    requiredScope: "workspace:read",
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      path: z.string().max(180).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Se omitido, lista todos os arquivos do workspace da tarefa." },
      },
    },
    handler: async (ctx, args) => {
      const vfs: WorkspaceVfsMap = ctx.vfsFiles || {};
      if (!args.path) {
        const files = vfsListFiles(vfs);
        return {
          files,
          count: files.length,
          _summary: `${files.length} arquivo(s) no Workspace VFS.`,
        };
      }
      const entry = vfsReadFile(vfs, args.path);
      if (!entry) {
        return {
          found: false,
          path: args.path,
          _summary: `Arquivo "${args.path}" não encontrado no VFS.`,
        };
      }
      return {
        found: true,
        ...entry,
        content: entry.content.slice(0, 12_000),
        _summary: `Arquivo "${entry.path}" (${entry.sizeBytes} bytes, v${entry.version}).`,
      };
    },
  },

  sandbox_compute: {
    name: "sandbox_compute",
    module: "workspace",
    description: "Executa cálculos matemáticos exatos (AST seguro), estatísticas, agrupamentos, filtros em CSV/JSON do VFS ou script em Sandbox VM remota configurada.",
    tier: "public",
    requiredScope: "workspace:compute",
    idempotent: true,
    rateLimitBucket: "webmcp_tool_call_public",
    inputZodSchema: z.object({
      operation: z.enum(["evaluate_expression", "dataset_stats", "group_aggregate", "filter_sort", "remote_exec"]),
      expression: z.string().max(600).optional(),
      variables: z.record(z.number()).optional(),
      vfsPath: z.string().max(180).optional(),
      records: z.array(z.record(z.any())).max(1000).optional(),
      csvText: z.string().max(100_000).optional(),
      numericField: z.string().max(80).optional(),
      groupByField: z.string().max(80).optional(),
      filterField: z.string().max(80).optional(),
      filterEquals: z.string().max(120).optional(),
      sortByField: z.string().max(80).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      language: z.enum(["python", "javascript", "bash"]).optional(),
      code: z.string().max(50_000).optional(),
    }),
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["evaluate_expression", "dataset_stats", "group_aggregate", "filter_sort", "remote_exec"] },
        expression: { type: "string", description: "Ex: (1250 * 0.15) + 89.9" },
        vfsPath: { type: "string", description: "Arquivo CSV ou JSON no VFS para analisar" },
        numericField: { type: "string" },
        groupByField: { type: "string" },
        code: { type: "string" },
      },
      required: ["operation"],
    },
    handler: async (ctx, args) => {
      if (args.operation === "remote_exec" && !ctx.identity?.id) {
        throw new Error("Execução em VM Sandbox remota exige sessão autenticada.");
      }
      const res = await executeSafeComputeSandbox(args, ctx.vfsFiles, ctx.signal);
      return {
        ...res,
        _summary: res.success
          ? `[${res.runtime}] ${res.stdout.slice(0, 240)}`
          : `[${res.runtime} ERR] ${res.stderr || "Falha na computação"}`,
      };
    },
  },
};

/**
 * Helper to retrieve tool by name
 */
export function getMcpToolByName(name: string): McpToolRegistryEntry | undefined {
  return MCP_TOOL_REGISTRY[name];
}

/**
 * Helper to list all tools derived from the registry
 */
export function getAllMcpTools(): McpToolRegistryEntry[] {
  return Object.values(MCP_TOOL_REGISTRY);
}

/**
 * Filter tools by module
 */
export function getMcpToolsByModule(module: McpModuleType): McpToolRegistryEntry[] {
  return Object.values(MCP_TOOL_REGISTRY).filter((t) => t.module === module);
}
