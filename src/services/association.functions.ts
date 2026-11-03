import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Schemas Zod Estritos (Rule B.25)
// ---------------------------------------------------------------------------

export const ListEntityMembersInputSchema = z.object({
  entityStoreId: z.string().uuid(),
  status: z.enum(["all", "pending", "approved", "rejected", "suspended"]).optional(),
});

export const ListStoreAssociationsInputSchema = z.object({
  storeId: z.string().uuid(),
});

export const RequestAssociationMembershipInputSchema = z.object({
  entityStoreId: z.string().uuid(),
  memberStoreId: z.string().uuid(),
  discountPercent: z.number().min(0).max(100).optional(),
  entityDefaultDiscountAccepted: z.boolean().optional(),
  customBenefitDescription: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateAssociationMembershipStatusInputSchema = z.object({
  membershipId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  discountPercent: z.number().min(0).max(100).optional(),
  customBenefitDescription: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const CalculateInterMemberDiscountInputSchema = z.object({
  sellerStoreId: z.string().uuid(),
  buyerStoreId: z.string().uuid(),
});

export const RecordAssociationTransactionInputSchema = z.object({
  entityStoreId: z.string().uuid(),
  sellerStoreId: z.string().uuid(),
  buyerStoreId: z.string().uuid().nullable().optional(),
  buyerDocument: z.string().max(30).nullable().optional(),
  buyerName: z.string().max(200).nullable().optional(),
  orderId: z.string().uuid().nullable().optional(),
  transactionType: z.enum(["direct", "indirect_offline"]).default("direct"),
  grossAmountCents: z.number().int().min(0),
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).nullable().optional(),
  transactionDate: z.string().optional(),
});

export const GetEntityMetricsInputSchema = z.object({
  entityStoreId: z.string().uuid(),
  months: z.number().int().min(1).max(24).optional().default(6),
});

// ---------------------------------------------------------------------------
// 1. Listar Empresas Associadas da Entidade / Organização
// ---------------------------------------------------------------------------
export const listEntityMembers = createServerFn({ method: "GET" })
  .validator(ListEntityMembersInputSchema)
  .handler(async ({ data: { entityStoreId, status } }) => {
    const supabase = getServerClient();

    let query = supabase
      .from("store_association_memberships")
      .select(`
        id,
        entity_store_id,
        member_store_id,
        status,
        discount_percent,
        entity_default_discount_accepted,
        custom_benefit_description,
        requested_by,
        notes,
        joined_at,
        created_at,
        stores:member_store_id (
          id,
          name,
          slug,
          logo_url,
          banner_url,
          city,
          state,
          settings,
          is_active
        )
      `)
      .eq("entity_store_id", entityStoreId);

    if (status && status !== "all") {
      query = query.eq("status", status);
    } else if (!status) {
      query = query.eq("status", "approved");
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[association.functions] listEntityMembers error:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      membershipId: row.id,
      entityStoreId: row.entity_store_id,
      memberStoreId: row.member_store_id,
      status: row.status,
      discountPercent: Number(row.discount_percent || 0),
      entityDefaultDiscountAccepted: Boolean(row.entity_default_discount_accepted),
      customBenefitDescription: row.custom_benefit_description || "",
      requestedBy: row.requested_by,
      notes: row.notes,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      store: row.stores ? {
        id: row.stores.id,
        name: row.stores.name,
        slug: row.stores.slug,
        logoUrl: row.stores.logo_url || row.stores.settings?.logoUrl || row.stores.settings?.logo_url || null,
        city: row.stores.city || row.stores.settings?.city || "",
        state: row.stores.state || row.stores.settings?.state || "SC",
        segment: row.stores.settings?.segment || row.stores.settings?.niche || "comercio",
        isActive: Boolean(row.stores.is_active),
      } : null,
    }));
  });

// ---------------------------------------------------------------------------
// 2. Listar Associações que a Empresa Participa
// ---------------------------------------------------------------------------
export const listStoreAssociations = createServerFn({ method: "GET" })
  .validator(ListStoreAssociationsInputSchema)
  .handler(async ({ data: { storeId } }) => {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("store_association_memberships")
      .select(`
        id,
        entity_store_id,
        member_store_id,
        status,
        discount_percent,
        entity_default_discount_accepted,
        custom_benefit_description,
        joined_at,
        created_at,
        entity:entity_store_id (
          id,
          name,
          slug,
          logo_url,
          city,
          state,
          settings
        )
      `)
      .eq("member_store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[association.functions] listStoreAssociations error:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      membershipId: row.id,
      entityStoreId: row.entity_store_id,
      memberStoreId: row.member_store_id,
      status: row.status,
      discountPercent: Number(row.discount_percent || 0),
      customBenefitDescription: row.custom_benefit_description || "",
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      entity: row.entity ? {
        id: row.entity.id,
        name: row.entity.name,
        slug: row.entity.slug,
        logoUrl: row.entity.logo_url || row.entity.settings?.logoUrl || null,
        city: row.entity.city || row.entity.settings?.city || "",
        state: row.entity.state || row.entity.settings?.state || "SC",
      } : null,
    }));
  });

// ---------------------------------------------------------------------------
// 3. Solicitar Filiação à Associação / Entidade
// ---------------------------------------------------------------------------
export const requestAssociationMembership = createServerFn({ method: "POST" })
  .validator(RequestAssociationMembershipInputSchema)
  .handler(async ({ data: { entityStoreId, memberStoreId, discountPercent, entityDefaultDiscountAccepted, customBenefitDescription, notes } }) => {
    const supabase = getServerClient();

    const discount = discountPercent != null ? discountPercent : 5.00;
    const defaultAccepted = entityDefaultDiscountAccepted ?? true;

    const { data, error } = await supabase
      .from("store_association_memberships")
      .upsert({
        entity_store_id: entityStoreId,
        member_store_id: memberStoreId,
        status: "pending",
        discount_percent: discount,
        entity_default_discount_accepted: defaultAccepted,
        custom_benefit_description: customBenefitDescription || null,
        notes: notes || null,
        requested_by: "member",
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity_store_id,member_store_id" })
      .select("id, status, discount_percent")
      .single();

    if (error) {
      console.error("[association.functions] requestAssociationMembership error:", error.message);
      throw new Error("Erro ao solicitar afiliação: " + error.message);
    }

    return { success: true, membership: data };
  });

// ---------------------------------------------------------------------------
// 4. Aceitar / Atualizar Filiação da Empresa (Pela Associação)
// ---------------------------------------------------------------------------
export const updateAssociationMembershipStatus = createServerFn({ method: "POST" })
  .validator(UpdateAssociationMembershipStatusInputSchema)
  .handler(async ({ data: { membershipId, status, discountPercent, customBenefitDescription, notes } }) => {
    const supabase = getServerClient();

    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "approved") {
      updatePayload.joined_at = new Date().toISOString();
    }
    if (discountPercent != null) {
      updatePayload.discount_percent = discountPercent;
    }
    if (customBenefitDescription !== undefined) {
      updatePayload.custom_benefit_description = customBenefitDescription;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const { data, error } = await supabase
      .from("store_association_memberships")
      .update(updatePayload)
      .eq("id", membershipId)
      .select("id, status, discount_percent, joined_at")
      .single();

    if (error) {
      console.error("[association.functions] updateAssociationMembershipStatus error:", error.message);
      throw new Error("Erro ao atualizar status da associação: " + error.message);
    }

    return { success: true, membership: data };
  });

// ---------------------------------------------------------------------------
// 5. Motor de Cálculo de Desconto Inter-Associados (Maior Desconto Prevalece)
// ---------------------------------------------------------------------------
export const calculateInterMemberDiscount = createServerFn({ method: "GET" })
  .validator(CalculateInterMemberDiscountInputSchema)
  .handler(async ({ data: { sellerStoreId, buyerStoreId } }) => {
    if (sellerStoreId === buyerStoreId) {
      return {
        hasInterMemberDiscount: false,
        maxDiscountPercent: 0,
        appliedEntityId: null,
        appliedEntityName: null,
        matchingAssociations: [],
      };
    }

    const supabase = getServerClient();

    // 1. Busca associações aprovadas da vendedora
    const { data: sellerAssocs, error: sellerErr } = await supabase
      .from("store_association_memberships")
      .select("entity_store_id, discount_percent, custom_benefit_description")
      .eq("member_store_id", sellerStoreId)
      .eq("status", "approved");

    if (sellerErr || !sellerAssocs || sellerAssocs.length === 0) {
      return {
        hasInterMemberDiscount: false,
        maxDiscountPercent: 0,
        appliedEntityId: null,
        appliedEntityName: null,
        matchingAssociations: [],
      };
    }

    // 2. Busca associações aprovadas da compradora
    const { data: buyerAssocs, error: buyerErr } = await supabase
      .from("store_association_memberships")
      .select("entity_store_id")
      .eq("member_store_id", buyerStoreId)
      .eq("status", "approved");

    if (buyerErr || !buyerAssocs || buyerAssocs.length === 0) {
      return {
        hasInterMemberDiscount: false,
        maxDiscountPercent: 0,
        appliedEntityId: null,
        appliedEntityName: null,
        matchingAssociations: [],
      };
    }

    const buyerEntityIds = new Set(buyerAssocs.map((b) => b.entity_store_id));

    // 3. Intersecção: entidades em comum
    const shared = sellerAssocs.filter((s) => buyerEntityIds.has(s.entity_store_id));

    if (shared.length === 0) {
      return {
        hasInterMemberDiscount: false,
        maxDiscountPercent: 0,
        appliedEntityId: null,
        appliedEntityName: null,
        matchingAssociations: [],
      };
    }

    // 4. Busca os nomes das entidades em comum
    const sharedEntityIds = shared.map((s) => s.entity_store_id);
    const { data: entityStores } = await supabase
      .from("stores")
      .select("id, name, slug")
      .in("id", sharedEntityIds);

    const entityNameMap = new Map<string, string>(
      (entityStores || []).map((e: any) => [e.id as string, (e.name as string) || "Associação Parceira"]),
    );

    // 5. REGRA DO MAIOR DESCONTO: MAX(discount_percent)
    let maxDiscount = 0;
    let bestEntityId: string | null = null;
    let bestEntityName: string | null = null;

    const matching = shared.map((item) => {
      const discount = Number(item.discount_percent || 0);
      const entityName = entityNameMap.get(item.entity_store_id) || "Associação Parceira";
      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestEntityId = item.entity_store_id;
        bestEntityName = entityName;
      }
      return {
        entityId: item.entity_store_id,
        entityName,
        discountPercent: discount,
        benefitDescription: item.custom_benefit_description || "",
      };
    });

    return {
      hasInterMemberDiscount: maxDiscount > 0,
      maxDiscountPercent: maxDiscount,
      appliedEntityId: bestEntityId,
      appliedEntityName: bestEntityName,
      matchingAssociations: matching,
    };
  });

// ---------------------------------------------------------------------------
// 6. Registrar Transação / Negócio Gerado (Direto ou Indireto/Offline)
// ---------------------------------------------------------------------------
export const recordAssociationTransaction = createServerFn({ method: "POST" })
  .validator(RecordAssociationTransactionInputSchema)
  .handler(async ({ data: {
    entityStoreId,
    sellerStoreId,
    buyerStoreId,
    buyerDocument,
    buyerName,
    orderId,
    transactionType,
    grossAmountCents,
    discountPercent,
    notes,
    transactionDate,
  } }) => {
    const supabase = getServerClient();

    const discountPct = discountPercent != null ? discountPercent : 0;
    const discountAmountCents = Math.round((grossAmountCents * discountPct) / 100);
    const netAmountCents = Math.max(0, grossAmountCents - discountAmountCents);

    const { data, error } = await supabase
      .from("association_b2b_transactions")
      .insert({
        entity_store_id: entityStoreId,
        seller_store_id: sellerStoreId,
        buyer_store_id: buyerStoreId || null,
        buyer_document: buyerDocument || null,
        buyer_name: buyerName || null,
        order_id: orderId || null,
        transaction_type: transactionType,
        gross_amount_cents: grossAmountCents,
        discount_percent: discountPct,
        discount_amount_cents: discountAmountCents,
        net_amount_cents: netAmountCents,
        notes: notes || null,
        transaction_date: transactionDate || new Date().toISOString(),
      })
      .select("id, gross_amount_cents, discount_amount_cents, net_amount_cents, transaction_type")
      .single();

    if (error) {
      console.error("[association.functions] recordAssociationTransaction error:", error.message);
      throw new Error("Erro ao registrar transação B2B: " + error.message);
    }

    return { success: true, transaction: data };
  });

// ---------------------------------------------------------------------------
// 7. Obter Métricas da Associação (GMV Gerado, Descontos, Transações e Membros)
// ---------------------------------------------------------------------------
export const getEntityMetrics = createServerFn({ method: "GET" })
  .validator(GetEntityMetricsInputSchema)
  .handler(async ({ data: { entityStoreId, months } }) => {
    const supabase = getServerClient();

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [txRes, membersRes] = await Promise.all([
      supabase
        .from("association_b2b_transactions")
        .select(`
          id,
          gross_amount_cents,
          discount_amount_cents,
          net_amount_cents,
          transaction_type,
          transaction_date,
          seller:seller_store_id (name, slug),
          buyer:buyer_store_id (name, slug)
        `)
        .eq("entity_store_id", entityStoreId)
        .gte("transaction_date", startDate.toISOString())
        .order("transaction_date", { ascending: false }),

      supabase
        .from("store_association_memberships")
        .select("id, status")
        .eq("entity_store_id", entityStoreId),
    ]);

    const transactions = txRes.data || [];
    const members = membersRes.data || [];

    const activeMembersCount = members.filter((m) => m.status === "approved").length;
    const pendingMembersCount = members.filter((m) => m.status === "pending").length;

    let totalGrossCents = 0;
    let totalDiscountCents = 0;
    let totalNetCents = 0;
    let directCount = 0;
    let offlineCount = 0;

    for (const t of transactions) {
      totalGrossCents += Number(t.gross_amount_cents || 0);
      totalDiscountCents += Number(t.discount_amount_cents || 0);
      totalNetCents += Number(t.net_amount_cents || 0);
      if (t.transaction_type === "direct") directCount++;
      else offlineCount++;
    }

    return {
      entityStoreId,
      monthsAnalyzed: months,
      activeMembersCount,
      pendingMembersCount,
      totalTransactionsCount: transactions.length,
      directCount,
      offlineCount,
      totalGrossCents,
      totalDiscountCents,
      totalNetCents,
      recentTransactions: transactions.slice(0, 15).map((t: any) => ({
        id: t.id,
        grossCents: Number(t.gross_amount_cents || 0),
        discountCents: Number(t.discount_amount_cents || 0),
        netCents: Number(t.net_amount_cents || 0),
        type: t.transaction_type,
        date: t.transaction_date,
        sellerName: t.seller?.name || "Empresa Vendedora",
        buyerName: t.buyer?.name || "Comprador Parceiro",
      })),
    };
  });
