/**
 * Order domain types Commerce
 *
 * State machine, DTOs and schemas for the order lifecycle.
 * Transitions are validated server-side; client only reads status.
 */

// ---------------------------------------------------------------------------
// Order State Machine
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
 "draft",
 "awaiting_shipping_quote",
 "awaiting_payment",
 "payment_processing",
 "paid",
 "processing",
 "ready_for_pickup",
 "shipped",
 "delivered",
 "completed",
 "cancelled",
 "payment_failed",
 "return_requested",
 "returned",
 "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Valid transitions (enforced server-side; listed here for type safety). */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
 draft: ["awaiting_shipping_quote", "awaiting_payment", "cancelled"],
 awaiting_shipping_quote: ["awaiting_payment", "cancelled"],
 awaiting_payment: ["payment_processing", "cancelled"],
 payment_processing: ["paid", "payment_failed", "cancelled"],
 paid: ["processing", "cancelled", "refunded"],
 processing: ["ready_for_pickup", "shipped", "cancelled"],
 ready_for_pickup: ["delivered", "completed", "cancelled"],
 shipped: ["delivered", "cancelled"],
 delivered: ["completed", "return_requested"],
 completed: ["return_requested"],
 cancelled: ["refunded"],
 payment_failed: ["awaiting_payment", "cancelled"],
 return_requested: ["returned", "cancelled"],
 returned: ["refunded"],
 refunded: [],
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
 draft: "Rascunho",
 awaiting_shipping_quote: "Aguardando cotação de frete",
 awaiting_payment: "Aguardando pagamento",
 payment_processing: "Pagamento em processamento",
 paid: "Pago",
 processing: "Em processamento",
 ready_for_pickup: "Pronto para retirada",
 shipped: "Enviado",
 delivered: "Entregue",
 completed: "Concluído",
 cancelled: "Cancelado",
 payment_failed: "Falha no pagamento",
 return_requested: "Devolução solicitada",
 returned: "Devolvido",
 refunded: "Reembolsado",
};

// ---------------------------------------------------------------------------
// Payment types
// ---------------------------------------------------------------------------

export type PaymentMethod = "pix" | "credit_card" | "manual" | "receipt";
export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "refunded" | "disputed";

// ---------------------------------------------------------------------------
// Cart DTOs
// ---------------------------------------------------------------------------

export interface CartItemDTO {
 id: string;
 item_id?: string;
 variantId: string;
 qty: number;
 selected_variations?: Record<string, string | string[]>;
 selectedOptions?: Record<string, string | string[]>;
 selectedOptionsLabels?: string[];
 price_snapshot?: number;
 /** Server-computed unit price at time of add. */
 priceCents: number;
 /** Server-computed line total (qty × unit price). */
 lineTotalCents: number;
 productTitle: string;
 variantSku: string;
 variantAttributes: Record<string, string>;
 coverUrl?: string | null;
 isOutOfStock?: boolean;
}

export interface CrossSellItemDTO {
 id: string;
 variantId: string;
 title: string;
 priceCents: number;
 compareAtCents: number | null;
 coverUrl: string | null;
 storeId: string;
 storeName?: string;
}

export interface CartDTO {
 id: string;
 storeId?: string;
 storeName?: string;
 storeLogoUrl?: string | null;
 items: CartItemDTO[];
 /** Server-computed totals — never computed on client. */
 subtotalCents: number;
 shippingCents: number;
 discountCents: number;
 totalCents: number;
 itemCount: number;
 couponCode?: string | null;
 shippingMethod?: string | null;
}

// ---------------------------------------------------------------------------
// Order DTOs
// ---------------------------------------------------------------------------

export interface OrderItemDTO {
 id: string;
 productTitle: string;
 variantSku: string;
 variantAttributes: Record<string, string>;
 imageUrl?: string | null;
 qty: number;
 unitPriceCents: number;
 totalCents: number;
}

export interface OrderDTO {
 id: string;
 publicToken: string;
 status: OrderStatus;
 statusLabel: string;
 items: OrderItemDTO[];
 subtotalCents: number;
 shippingCents: number;
 discountCents: number;
 totalCents: number;
 shippingMethod?: string | null;
 shippingAddress?: Record<string, unknown> | null;
 createdAt: string; // ISO UTC
}

// ---------------------------------------------------------------------------
// Cart operations results
// ---------------------------------------------------------------------------

export type CartResult =
 | { status: "ok"; data: CartDTO }
 | { status: "empty" }
 | { status: "unconfigured"; reason: string }
 | { status: "error"; message: string };

export type OrderResult =
 { status: "ok"; data: OrderDTO } | { status: "not_found" } | { status: "error"; message: string };
