import { createServerFn } from "@tanstack/react-start";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getOnboardingStatus } from "@/services/onboarding.functions";

export interface DashboardActivity {
 id: string;
 type: "order" | "booking" | "payment";
 title: string;
 subtitle: string;
 timeDisplay: string;
 status: string;
 totalCents?: number;
}

export interface DashboardMetrics {
 salesTodayCents: number;
 salesMonthCents: number;
 salesLastMonthCents: number;
 growthPercentage: number | null;
 ordersTodayCount: number;
 ordersMonthCount: number;
 ordersBreakdown: {
 awaitingPayment: number;
 needsSeparation: number;
 shippedOrReady: number;
 completed: number;
 cancelled: number;
 pendingBackorders: number;
 };
 lowStockItems: Array<{
 id: string;
 sku: string;
 productTitle: string;
 stockOnHand: number;
 }>;
 criticalStockCount: number;
 newCustomers30d: number;
 abandonedCartsCount: number;
 recentActivities: DashboardActivity[];
 activeCashRegister: {
 isOpen: boolean;
 openedAt?: string;
 initialBalanceCents?: number;
 currentBalanceCents?: number;
 openedByName?: string;
 } | null;
 setupChecklist: Array<{
 id: string;
 label: string;
 description: string;
 completed: boolean;
 targetRoute: string;
 }>;
 setupProgressPercentage: number;
}

async function _getDashboardData(): Promise<DashboardMetrics> {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, [
 "owner",
 "admin",
 "manager",
 "seller",
 "finance",
 "stock",
 "content",
 "support",
 ]);

 const db = getServerClient();
 const storeId = identity.store_id;

 if (!storeId) {
 return {
 salesTodayCents: 0,
 salesMonthCents: 0,
 salesLastMonthCents: 0,
 growthPercentage: null,
 ordersTodayCount: 0,
 ordersMonthCount: 0,
 ordersBreakdown: {
 awaitingPayment: 0,
 needsSeparation: 0,
 shippedOrReady: 0,
 completed: 0,
 cancelled: 0,
 pendingBackorders: 0,
 },
 lowStockItems: [],
 criticalStockCount: 0,
 newCustomers30d: 0,
 abandonedCartsCount: 0,
 recentActivities: [],
 activeCashRegister: { isOpen: false },
 setupChecklist: [],
 setupProgressPercentage: 100,
 };
 }

 const now = new Date();
 const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
 const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
 const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
 const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
 const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
 const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

 // 1. Fetch Orders metrics with Payments and Items
 const { data: ordersData } = await db
 .from("orders")
 .select(
 "id, status, total_cents, created_at, customer_name, customer_email, payments(status, amount_cents), order_items(product_variants(allow_backorder, stock_on_hand))",
 )
 .eq("store_id", storeId);

 const validOrders = ordersData ?? [];

 let salesTodayCents = 0;
 let salesMonthCents = 0;
 let salesLastMonthCents = 0;
 let ordersTodayCount = 0;
 let ordersMonthCount = 0;

 const ordersBreakdown = {
 awaitingPayment: 0,
 needsSeparation: 0,
 shippedOrReady: 0,
 completed: 0,
 cancelled: 0,
 pendingBackorders: 0,
 };

 for (const order of validOrders) {
 const isToday = order.created_at >= startOfToday;
 const isThisMonth = order.created_at >= startOfMonth;
 const isLastMonth = order.created_at >= startOfLastMonth && order.created_at <= endOfLastMonth;

 const payments = Array.isArray(order.payments)
 ? order.payments
 : order.payments
 ? [order.payments]
 : [];
 const isPaid =
 order.status === "paid" ||
 order.status === "completed" ||
 order.status === "delivered" ||
 order.status === "shipped" ||
 payments.some((p: any) => p.status === "approved" || p.status === "settled");

 if (order.status !== "cancelled" && order.status !== "payment_failed") {
 if (isToday) ordersTodayCount++;
 if (isThisMonth) ordersMonthCount++;
 }

 if (isPaid) {
 const approvedPayment = payments.find(
 (p: any) => p.status === "approved" || p.status === "settled",
 );
 const amountToSum = approvedPayment?.amount_cents ?? order.total_cents ?? 0;

 if (isToday) salesTodayCents += amountToSum;
 if (isThisMonth) salesMonthCents += amountToSum;
 if (isLastMonth) salesLastMonthCents += amountToSum;
 }

 if (order.status === "cancelled" || order.status === "payment_failed") {
 ordersBreakdown.cancelled++;
 } else if (order.status === "completed" || order.status === "delivered") {
 ordersBreakdown.completed++;
 } else if (order.status === "ready_for_pickup" || order.status === "shipped") {
 ordersBreakdown.shippedOrReady++;
 } else if (order.status === "processing" || order.status === "paid" || isPaid) {
 const items = Array.isArray(order.order_items)
 ? order.order_items
 : order.order_items
 ? [order.order_items]
 : [];
 const hasBackorder = items.some((item: any) => {
 const variant = item.product_variants;
 if (!variant) return false;
 const v = Array.isArray(variant) ? variant[0] : variant;
 return v && v.allow_backorder && v.stock_on_hand <= 0;
 });

 if (hasBackorder) {
 ordersBreakdown.pendingBackorders++;
 } else {
 ordersBreakdown.needsSeparation++;
 }
 } else {
 ordersBreakdown.awaitingPayment++;
 }
 }

 let growthPercentage: number | null = null;
 if (salesLastMonthCents > 0) {
 growthPercentage = Math.round(((salesMonthCents - salesLastMonthCents) / salesLastMonthCents) * 100);
 }

 // 2. Recent Activities (Real orders)
 const recentActivities: DashboardActivity[] = validOrders
 .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
 .slice(0, 5)
 .map((o) => {
 const date = new Date(o.created_at);
 const isOderToday = o.created_at >= startOfToday;
 const timeDisplay = isOderToday
 ? `Hoje às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
 : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

 const customerLabel = o.customer_name || o.customer_email || "Cliente da Loja";

 let statusLabel = "Pedido Criado";
 if (o.status === "paid" || o.status === "processing") statusLabel = "Venda Confirmada (Pago)";
 else if (o.status === "shipped") statusLabel = "Em Rota de Entrega";
 else if (o.status === "completed" || o.status === "delivered") statusLabel = "Pedido Concluído";
 else if (o.status === "cancelled") statusLabel = "Pedido Cancelado";

 return {
 id: o.id,
 type: "order",
 title: statusLabel,
 subtitle: `${customerLabel} • Pedido #${o.id.slice(0, 8)}`,
 timeDisplay,
 status: o.status,
 totalCents: o.total_cents,
 };
 });

 // 3. Low stock items
 const { data: variantRows } = await db
 .from("product_variants")
 .select("id, sku, stock_on_hand, products(title)")
 .lte("stock_on_hand", 5)
 .order("stock_on_hand", { ascending: true })
 .limit(5);

 const lowStockItems = ((variantRows ?? []) as any[]).map((v) => ({
 id: v.id,
 sku: v.sku ?? "Sem SKU",
 productTitle: Array.isArray(v.products)
 ? (v.products[0]?.title ?? "Produto")
 : (v.products?.title ?? "Produto"),
 stockOnHand: v.stock_on_hand ?? 0,
 }));

 // 4. New Customers (last 30d)
 const { count: newCustomers30d } = await db
 .from("customers_crm")
 .select("id", { count: "exact", head: true })
 .eq("store_id", storeId)
 .gte("created_at", last30Days);

 // 5. Abandoned Carts (last 7d)
 const { count: abandonedCartsCount } = await db
 .from("carts")
 .select("id", { count: "exact", head: true })
 .gte("updated_at", last7Days);

 // 6. Active Cash Register
 const { data: activeRegister } = await db
 .from("cash_registers")
 .select("id, opened_at, initial_balance_cents, opened_by")
 .eq("store_id", storeId)
 .eq("status", "open")
 .order("opened_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 let activeCashRegister: DashboardMetrics["activeCashRegister"] = null;

 if (activeRegister) {
 const { data: entries } = await db
 .from("cash_register_entries")
 .select("amount_cents")
 .eq("register_id", activeRegister.id);

 const initial = activeRegister.initial_balance_cents ?? 0;
 const entriesTotal = (entries ?? []).reduce((acc, curr) => acc + (curr.amount_cents ?? 0), 0);

 activeCashRegister = {
 isOpen: true,
 openedAt: activeRegister.opened_at,
 initialBalanceCents: initial,
 currentBalanceCents: initial + entriesTotal,
 };
 } else {
 activeCashRegister = { isOpen: false };
 }

 // 7. Setup Checklist
 const onboarding = await getOnboardingStatus();
 const coreIds = ["profile", "logo", "categories", "first_product", "payment", "shipping"];

 const setupChecklist = onboarding.steps
 .filter((s) => coreIds.includes(s.id))
 .map((s) => ({
 id: s.id,
 label: s.label,
 description: s.description,
 completed: s.status === "completed",
 targetRoute: s.targetRoute,
 }));

 const completedCount = setupChecklist.filter((c) => c.completed).length;
 const setupProgressPercentage =
 setupChecklist.length > 0 ? Math.round((completedCount / setupChecklist.length) * 100) : 100;

 return {
 salesTodayCents,
 salesMonthCents,
 salesLastMonthCents,
 growthPercentage,
 ordersTodayCount,
 ordersMonthCount,
 ordersBreakdown,
 lowStockItems,
 criticalStockCount: lowStockItems.length,
 newCustomers30d: newCustomers30d ?? 0,
 abandonedCartsCount: abandonedCartsCount ?? 0,
 recentActivities,
 activeCashRegister,
 setupChecklist,
 setupProgressPercentage,
 };
}

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const data = await _getDashboardData();
 return data;
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[dashboard.functions] getDashboardData error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao carregar dados do painel.");
 }
});
