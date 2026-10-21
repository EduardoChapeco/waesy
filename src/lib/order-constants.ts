/**
 * order-constants.ts — Constantes Canônicas do Ciclo de Vida de Pedidos
 *
 * Desacoplamento para evitar dependências circulares entre order.functions.ts e orders.functions.ts.
 */

export const ORDER_STATUS_VALUES = [
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

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
