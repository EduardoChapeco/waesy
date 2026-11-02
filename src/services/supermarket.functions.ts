/**
 * Supermarket, Butchery, Bakery & Food Retail Server Functions (BFF boundary)
 * 
 * Provides specialized domain logic for grocery, convenience, butchery and bakeries:
 * - Delivery & Pickup time slots with capacity limit
 * - Multiple pricing tiers (Online, Club, In-Store counter)
 * - Complex promotional engines (Buy X Pay Y, Progressive, CPF limits, Cashback)
 * - Fresh food specifications (weight/Kg vs units, ripeness, butchery cuts)
 * - Club K / Loyalty dashboard (Economizômetro, Cashback ledger, active coupons)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export interface SupermarketPricingTiers {
  online_cents?: number;
  club_cents?: number;
  counter_cents?: number;
  wholesale_min_qty?: number;
  wholesale_cents?: number;
}

export interface SupermarketPromotionalRule {
  rule_type?: "buy_x_pay_y" | "progressive" | "order_bump" | "none";
  buy_qty?: number;
  pay_qty?: number;
  max_per_cpf?: number;
  min_age_restriction?: number;
  cashback_cents?: number;
  discount_percent?: number;
  badge_ribbon?: "clube" | "oferta" | "progressivo" | "mais_por_menos" | "compre_e_ganhe" | "none";
  ends_at?: string;
  is_active?: boolean;
}

export interface SupermarketFreshFoodSpecs {
  pricing_unit?: "un" | "kg" | "g" | "l" | "ml";
  allow_maturity_selection?: boolean;
  prep_options?: string[];
  estimated_weight_kg?: number;
  temperature_tag?: "gelado" | "fresco" | "congelado" | "ambiente" | "none";
}

export interface DeliveryWindowDTO {
  id: string;
  dateLabel: string;
  timeWindow: string;
  feeCents: number;
  isFree: boolean;
  isAvailable: boolean;
  mode: "delivery" | "pickup";
}

export interface SupermarketClubMemberDTO {
  storeId: string;
  storeName: string;
  isMember: boolean;
  userName?: string;
  memberTier?: string;
  totalSavedCents: number;
  cashbackBalanceCents: number;
  activeCouponsCount: number;
  cardAvailable: boolean;
  storeCardName?: string;
}

export interface SupermarketClubStatementEntryDTO {
  id: string;
  amountCents: number;
  transactionType: "credit" | "debit" | string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface SupermarketProductCardDTO {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  sku?: string;
  brand?: string;
  unit: string;
  priceCents: number;
  compareAtCents?: number;
  clubPriceCents?: number;
  onlineExclusivePriceCents?: number;
  pricingTiers?: SupermarketPricingTiers;
  promotionalRule?: SupermarketPromotionalRule;
  freshFoodSpecs?: SupermarketFreshFoodSpecs;
  badges?: string[];
  inStock: boolean;
  storeId: string;
  storeName: string;
}

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

/**
 * Consulta as janelas de entrega e retirada da loja ativa
 */
export const getSupermarketDeliveryWindows = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const supabase = await getAnonServerClient();
      
      // Consultar janelas persistidas se a tabela existir
      const { data: dbWindows, error } = await supabase
        .from("store_delivery_windows" as any)
        .select("*")
        .eq("is_active", true)
        .order("start_time", { ascending: true })
        .limit(20);

      if (!error && Array.isArray(dbWindows) && dbWindows.length > 0) {
        return dbWindows.map((w: any) => ({
          id: w.id,
          dateLabel: w.day_of_week || "Hoje",
          timeWindow: `${w.start_time} às ${w.end_time}`,
          feeCents: w.fee_cents || 0,
          isFree: (w.fee_cents || 0) === 0,
          isAvailable: (w.current_orders_count || 0) < (w.max_orders_capacity || 50),
          mode: (w.mode as "delivery" | "pickup") || "delivery",
        })) as DeliveryWindowDTO[];
      }

      // Janelas canônicas dinâmicas caso ainda não haja configuração específica
      const now = new Date();
      const currentHour = now.getHours();

      const defaultWindows: DeliveryWindowDTO[] = [
        {
          id: "w-today-morning",
          dateLabel: "Hoje",
          timeWindow: "09:00 às 12:00",
          feeCents: 1500,
          isFree: false,
          isAvailable: currentHour < 10,
          mode: "delivery",
        },
        {
          id: "w-today-afternoon",
          dateLabel: "Hoje",
          timeWindow: "14:00 às 18:00",
          feeCents: 1500,
          isFree: false,
          isAvailable: currentHour < 15,
          mode: "delivery",
        },
        {
          id: "w-today-night",
          dateLabel: "Hoje",
          timeWindow: "18:00 às 21:00",
          feeCents: 1800,
          isFree: false,
          isAvailable: currentHour < 19,
          mode: "delivery",
        },
        {
          id: "w-today-pickup-1",
          dateLabel: "Hoje",
          timeWindow: "A partir de 1 hora após confirmação",
          feeCents: 0,
          isFree: true,
          isAvailable: true,
          mode: "pickup",
        },
        {
          id: "w-tomorrow-morning",
          dateLabel: "Amanhã",
          timeWindow: "09:00 às 12:00",
          feeCents: 1200,
          isFree: false,
          isAvailable: true,
          mode: "delivery",
        },
      ];

      return defaultWindows;
    } catch (err: any) {
      logSystemError({ operation: "getSupermarketDeliveryWindows", error: err });
      return [];
    }
  });

/**
 * Consulta dados consolidados do membro do Clube (Economizômetro, Cashback, Cupons)
 */
export const getSupermarketClubMemberData = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string }) => d)
  .handler(async ({ data }): Promise<SupermarketClubMemberDTO> => {
    try {
      const supabase = await getServerClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return {
          storeId: data.storeId || "",
          storeName: "Supermercado Parceiro",
          isMember: false,
          totalSavedCents: 0,
          cashbackBalanceCents: 0,
          activeCouponsCount: 0,
          cardAvailable: false,
        };
      }

      // Buscar perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, id")
        .eq("id", user.id)
        .maybeSingle();

      // Buscar vínculo com o clube
      let membershipQuery = supabase
        .from("store_memberships" as any)
        .select("*")
        .eq("user_id", user.id);
      if (data.storeId) membershipQuery = membershipQuery.eq("store_id", data.storeId);
      const { data: membership } = await membershipQuery.maybeSingle();

      // Buscar saldo de cashback
      const { data: cashbackRows } = await supabase
        .from("store_cashback_ledger" as any)
        .select("amount_cents, transaction_type")
        .eq("user_id", user.id);

      const netCashback = Array.isArray(cashbackRows)
        ? cashbackRows.reduce((acc: number, r: any) => {
            return r.transaction_type === "credit" ? acc + r.amount_cents : acc - r.amount_cents;
          }, 0)
        : 0;

      // Buscar cupons ativos
      const { data: coupons } = await supabase
        .from("coupons" as any)
        .select("id")
        .eq("is_active", true)
        .limit(10);

      return {
        storeId: data.storeId || "",
        storeName: "Supermercado Parceiro",
        isMember: Boolean(membership?.id),
        userName: profile?.full_name?.split(" ")[0] || "Cliente",
        memberTier: (membership as any)?.tier || "Clube Ouro",
        totalSavedCents: (membership as any)?.total_saved_cents || 0,
        cashbackBalanceCents: Math.max(0, netCashback),
        activeCouponsCount: coupons?.length || 0,
        cardAvailable: Boolean(membership?.id),
        storeCardName: membership?.id ? "Cartão da Loja" : undefined,
      };
    } catch (err: any) {
      logSystemError({ operation: "getSupermarketClubMemberData", error: err });
      return {
        storeId: data.storeId || "",
        storeName: "Supermercado Parceiro",
        isMember: false,
        totalSavedCents: 0,
        cashbackBalanceCents: 0,
        activeCouponsCount: 0,
        cardAvailable: false,
      };
    }
  });

/**
 * Consulta o extrato persistido do cashback do membro autenticado.
 * A UI nunca calcula ou inventa lançamentos: o ledger é a fonte de verdade.
 */
export const getSupermarketClubStatement = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string }) => d)
  .handler(async ({ data }): Promise<SupermarketClubStatementEntryDTO[]> => {
    const supabase = await getServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];

    let query = supabase
      .from("store_cashback_ledger" as any)
      .select("id, amount_cents, transaction_type, description, reference_type, reference_id, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data.storeId) query = query.eq("store_id", data.storeId);

    const { data: rows, error } = await query;
    if (error) {
      logSystemError({ operation: "getSupermarketClubStatement", error });
      throw new Error("Não foi possível carregar o extrato do clube.");
    }

    return (rows || []).map((row: any) => ({
      id: row.id,
      amountCents: Number(row.amount_cents || 0),
      transactionType: row.transaction_type || "credit",
      description: row.description || null,
      referenceType: row.reference_type || null,
      referenceId: row.reference_id || null,
      createdAt: row.created_at,
    }));
  });

/**
 * Consulta catálogo formatado de produtos com regras de mercado
 */
export const getSupermarketProducts = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string; category?: string; limit?: number }) => d)
  .handler(async ({ data }): Promise<SupermarketProductCardDTO[]> => {
    try {
      const supabase = await getAnonServerClient();
      let query = supabase
        .from("products")
        .select(`
          id,
          title,
          slug,
          price_cents,
          compare_at_cents,
          status,
          attributes,
          store_id,
          stores (id, name, logo_url),
          product_media (url, sort_order)
        `)
        .eq("status", "published")
        .limit(data.limit || 30);

      if (data.storeId) {
        query = query.eq("store_id", data.storeId);
      }

      const { data: rows, error } = await query;
      if (error || !Array.isArray(rows)) return [];

      return rows.map((r: any) => {
        const attrs = r.attributes || {};
        const media = Array.isArray(r.product_media)
          ? [...r.product_media].sort((a, b) => a.sort_order - b.sort_order)
          : [];
        const imageUrl = media[0]?.url || attrs.imageUrl || null;

        const pricingTiers: SupermarketPricingTiers = attrs.pricing_tiers || {};
        const promotionalRule: SupermarketPromotionalRule = attrs.promotional_rules || {};
        const freshFoodSpecs: SupermarketFreshFoodSpecs = attrs.fresh_food_specs || {};

        return {
          id: r.id,
          title: r.title,
          slug: r.slug || r.id,
          imageUrl,
          sku: attrs.sku || r.id.slice(0, 8),
          brand: attrs.brand || "",
          unit: freshFoodSpecs.pricing_unit || "un",
          priceCents: r.price_cents || 0,
          compareAtCents: r.compare_at_cents || undefined,
          clubPriceCents: pricingTiers.club_cents,
          onlineExclusivePriceCents: pricingTiers.online_cents,
          pricingTiers,
          promotionalRule,
          freshFoodSpecs,
          badges: attrs.badges || [],
          inStock: true,
          storeId: r.store_id || "",
          storeName: r.stores?.name || "Supermercado",
        };
      });
    } catch (err: any) {
      logSystemError({ operation: "getSupermarketProducts", error: err });
      return [];
    }
  });

/**
 * Motor de Cálculo Puro de Promoção de Supermercado
 * Calcula abatimento de "Leve X Pague Y", desconto progressivo, cashback e meta de frete grátis
 */
export function calculateSupermarketPromotion(params: {
  itemQty: number;
  unitPriceCents: number;
  rule?: SupermarketPromotionalRule;
  freeShippingThresholdCents?: number;
  currentSubtotalCents?: number;
}) {
  const { itemQty, unitPriceCents, rule, freeShippingThresholdCents = 15000, currentSubtotalCents = 0 } = params;

  let totalCents = itemQty * unitPriceCents;
  let discountCents = 0;
  let explanation = "";
  let cashbackEarnedCents = 0;

  if (rule && rule.is_active !== false) {
    // 1. Mecânica "Leve X, Pague Y" (ex: Leve 3 Pague 2, Leve 10 Pague 9)
    if (rule.rule_type === "buy_x_pay_y" && rule.buy_qty && rule.pay_qty && rule.buy_qty > rule.pay_qty) {
      const allowedQty = rule.max_per_cpf ? Math.min(itemQty, rule.max_per_cpf) : itemQty;
      const completeBundles = Math.floor(allowedQty / rule.buy_qty);
      const freeUnitsPerBundle = rule.buy_qty - rule.pay_qty;
      const totalFreeUnits = completeBundles * freeUnitsPerBundle;

      discountCents = totalFreeUnits * unitPriceCents;
      totalCents -= discountCents;

      explanation = `Leve ${rule.buy_qty}, Pague ${rule.pay_qty}: ${totalFreeUnits} unidade(s) grátis`;
    }

    // 2. Desconto Progressivo (%)
    else if (rule.rule_type === "progressive" && rule.discount_percent) {
      discountCents = Math.round(totalCents * (rule.discount_percent / 100));
      totalCents -= discountCents;
      explanation = `${rule.discount_percent}% de desconto progressivo aplicado`;
    }

    // 3. Cashback
    if (rule.cashback_cents) {
      const cashbackLimit = rule.max_per_cpf ? Math.min(itemQty, rule.max_per_cpf) : itemQty;
      cashbackEarnedCents = cashbackLimit * rule.cashback_cents;
    }
  }

  // Meta de Frete Grátis
  const effectiveSubtotal = currentSubtotalCents + totalCents;
  const isFreeShipping = effectiveSubtotal >= freeShippingThresholdCents;
  const freeShippingRemainingCents = Math.max(0, freeShippingThresholdCents - effectiveSubtotal);
  const freeShippingProgressPercent = Math.min(100, Math.round((effectiveSubtotal / freeShippingThresholdCents) * 100));

  return {
    itemQty,
    originalTotalCents: itemQty * unitPriceCents,
    discountCents,
    finalTotalCents: totalCents,
    explanation,
    cashbackEarnedCents,
    isFreeShipping,
    freeShippingRemainingCents,
    freeShippingProgressPercent,
  };
}
