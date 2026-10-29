import { z } from "zod";

/**
 * Schemas e Tipos para Integração com a Merchant API do iFood e
 * Motor de Reconciliação Multi-Fatorial do Waesy.
 */

export const IFoodMerchantCredentialsSchema = z.object({
  merchantId: z.string().min(1, "merchantId é obrigatório"),
  clientId: z.string().min(1, "clientId é obrigatório"),
  clientSecret: z.string().min(1, "clientSecret é obrigatório"),
  appName: z.string().optional(),
});
export type IFoodMerchantCredentials = z.infer<typeof IFoodMerchantCredentialsSchema>;

export const IFoodCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type IFoodCoordinates = z.infer<typeof IFoodCoordinatesSchema>;

export const IFoodAddressSchema = z.object({
  streetName: z.string().default(""),
  streetNumber: z.string().default(""),
  neighborhood: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
  complement: z.string().optional(),
  reference: z.string().optional(),
  coordinates: IFoodCoordinatesSchema.optional(),
});
export type IFoodAddress = z.infer<typeof IFoodAddressSchema>;

export const IFoodOrderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  observations: z.string().optional(),
});
export type IFoodOrderItem = z.infer<typeof IFoodOrderItemSchema>;

export const IFoodOrderDetailsSchema = z.object({
  id: z.string().min(1),
  displayId: z.string().optional(),
  orderType: z.enum(["DELIVERY", "TAKEOUT", "INDOOR"]).default("DELIVERY"),
  createdAt: z.string(),
  orderTiming: z.enum(["INSTANT", "SCHEDULED"]).default("INSTANT"),
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().optional(),
    documentNumber: z.string().optional(),
  }),
  delivery: z.object({
    deliveryAddress: IFoodAddressSchema,
    estimatedDeliveryTime: z.string().optional(),
    deliveryBy: z.enum(["MERCHANT", "IFOOD"]).default("MERCHANT"),
  }),
  items: z.array(IFoodOrderItemSchema).default([]),
  total: z.object({
    subTotal: z.number().nonnegative(),
    deliveryFee: z.number().nonnegative().default(0),
    benefits: z.number().nonnegative().default(0),
    orderAmount: z.number().nonnegative(),
  }),
  extraInfo: z.string().optional(),
});
export type IFoodOrderDetails = z.infer<typeof IFoodOrderDetailsSchema>;

export type ReconciliationConfidence = "HIGH_CONFIDENCE" | "PROBABLE_MATCH" | "LOW_CONFIDENCE";

export interface ReconciliationCandidate {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  chatConversationId?: string;
  address?: {
    street: string;
    number: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  recentChatActivity?: Array<{
    text: string;
    createdAt: string;
  }>;
}

export interface ReconciliationScoreBreakdown {
  geoProximityScore: number;     // Máx: 35
  addressTextScore: number;      // Máx: 25
  customerNameScore: number;     // Máx: 20
  temporalChatScore: number;     // Máx: 15
  notesAndItemsScore: number;    // Máx: 5
}

export interface ReconciliationResult {
  score: number; // 0 a 100
  confidence: ReconciliationConfidence;
  breakdown: ReconciliationScoreBreakdown;
  matchedReasons: string[];
  candidate: ReconciliationCandidate;
}

export interface ExternalOrderReconciliationRecord {
  id: string;
  storeId: string;
  externalOrderId: string;
  externalProvider: "ifood";
  externalDisplayId?: string;
  waesyCustomerId: string | null;
  chatConversationId: string | null;
  confidenceScore: number;
  confidenceLevel: ReconciliationConfidence;
  matchedReasons: string[];
  status: "AUTOMATICALLY_LINKED" | "PENDING_CONFIRMATION" | "MANUALLY_CONFIRMED" | "REJECTED";
  orderSnapshot: IFoodOrderDetails;
  createdAt: string;
  updatedAt: string;
}
