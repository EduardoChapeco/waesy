import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { z } from "zod";

export interface StoreLoyaltyProgram {
 id: string;
 store_id: string;
 name: string;
 target_stamps: number;
 welcome_stamps: number;
 reward_description: string;
 mechanic_type: "per_order" | "per_spent_amount";
 min_spent_cents: number;
 card_bg_color: string;
 card_text_color: string;
 stamp_icon: string;
 banner_url?: string;
 logo_url?: string;
 proximity_alerts_enabled: boolean;
 status: "active" | "draft" | "paused";
 created_at: string;
 updated_at: string;
}

export interface CustomerLoyaltyCard {
 id: string;
 store_id: string;
 program_id: string;
 customer_name?: string;
 customer_phone: string;
 card_token: string;
 current_stamps: number;
 total_stamps_earned: number;
 total_rewards_redeemed: number;
 last_stamped_at?: string;
 created_at: string;
}

// 1. Obter Programa de Fidelidade da Loja
export const getStoreLoyaltyProgram = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();
 const { data, error } = await db
 .from("store_loyalty_programs")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (error) {
 console.error("[getStoreLoyaltyProgram] Erro:", error);
 throw new Error("Falha ao carregar programa de fidelidade.");
 }

 return data as StoreLoyaltyProgram | null;
});

// 2. Salvar / Atualizar Programa de Fidelidade
export const saveStoreLoyaltyProgram = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().optional(),
 name: z.string().min(2, "Nome do cartão é obrigatório"),
 target_stamps: z.number().int().min(3).max(30).default(10),
 welcome_stamps: z.number().int().min(0).max(10).default(0),
 reward_description: z.string().min(2, "Descrição da recompensa é obrigatória"),
 mechanic_type: z.enum(["per_order", "per_spent_amount"]).default("per_order"),
 min_spent_cents: z.number().int().min(0).default(0),
 card_bg_color: z.string().default(TOKEN_HEX.neutral900),
 card_text_color: z.string().default(TOKEN_HEX.white),
 stamp_icon: z.string().default("star"),
 banner_url: z.string().optional(),
 logo_url: z.string().optional(),
 proximity_alerts_enabled: z.boolean().default(false),
 status: z.enum(["active", "draft", "paused"]).default("active"),
 }),
 )
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 if (input.id) {
 const { data, error } = await db
 .from("store_loyalty_programs")
 .update({
 name: input.name,
 target_stamps: input.target_stamps,
 welcome_stamps: input.welcome_stamps,
 reward_description: input.reward_description,
 mechanic_type: input.mechanic_type,
 min_spent_cents: input.min_spent_cents,
 card_bg_color: input.card_bg_color,
 card_text_color: input.card_text_color,
 stamp_icon: input.stamp_icon,
 banner_url: input.banner_url || null,
 logo_url: input.logo_url || null,
 proximity_alerts_enabled: input.proximity_alerts_enabled,
 status: input.status,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 console.error("[saveStoreLoyaltyProgram] Erro no update:", error);
 throw new Error("Falha ao atualizar programa de fidelidade.");
 }

 return data as StoreLoyaltyProgram;
 } else {
 const { data, error } = await db
 .from("store_loyalty_programs")
 .insert({
 store_id: identity.store_id,
 name: input.name,
 target_stamps: input.target_stamps,
 welcome_stamps: input.welcome_stamps,
 reward_description: input.reward_description,
 mechanic_type: input.mechanic_type,
 min_spent_cents: input.min_spent_cents,
 card_bg_color: input.card_bg_color,
 card_text_color: input.card_text_color,
 stamp_icon: input.stamp_icon,
 banner_url: input.banner_url || null,
 logo_url: input.logo_url || null,
 proximity_alerts_enabled: input.proximity_alerts_enabled,
 status: input.status,
 })
 .select()
 .single();

 if (error) {
 console.error("[saveStoreLoyaltyProgram] Erro no insert:", error);
 throw new Error("Falha ao criar programa de fidelidade.");
 }

 return data as StoreLoyaltyProgram;
 }
 });

// 3. Listar Clientes & Cartões de Fidelidade da Loja
export const listStoreLoyaltyCustomers = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();
 const { data, error } = await db
 .from("customer_loyalty_cards")
 .select("*, store_loyalty_programs!inner(name, target_stamps, reward_description)")
 .eq("store_id", identity.store_id)
 .order("last_stamped_at", { ascending: false, nullsFirst: false })
 .limit(100);

 if (error) {
 console.error("[listStoreLoyaltyCustomers] Erro:", error);
 throw new Error("Falha ao carregar cartões de fidelidade.");
 }

 return (data || []) as CustomerLoyaltyCard[];
});

// 4. Carimbar Cartão do Cliente (Adicionar Selos no PDV / Balcão)
export const stampCustomerCard = createServerFn({ method: "POST" })
 .validator(
 z.object({
 phone: z.string().min(8, "Telefone é obrigatório"),
 customer_name: z.string().optional(),
 stamps_to_add: z.number().int().min(1).max(10).default(1),
 }),
 )
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 // 1. Obter o programa ativo da loja
 const { data: program } = await db
 .from("store_loyalty_programs")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (!program) {
 throw new Error("A loja não possui um programa de fidelidade ativo no momento.");
 }

 // 2. Normalizar telefone
 const cleanPhone = input.phone.replace(/\D/g, "");

 // 3. Buscar ou criar o cartão do cliente
 let { data: card } = await db
 .from("customer_loyalty_cards")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("customer_phone", cleanPhone)
 .maybeSingle();

 if (!card) {
 const generatedToken = `CARD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
 const initialStamps = (program.welcome_stamps || 0) + input.stamps_to_add;

 const { data: newCard, error: createErr } = await db
 .from("customer_loyalty_cards")
 .insert({
 store_id: identity.store_id,
 program_id: program.id,
 customer_name: input.customer_name || null,
 customer_phone: cleanPhone,
 card_token: generatedToken,
 current_stamps: initialStamps,
 total_stamps_earned: initialStamps,
 last_stamped_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (createErr) {
 console.error("[stampCustomerCard] Erro ao criar cartão:", createErr);
 throw new Error("Falha ao registrar cartão de fidelidade.");
 }

 return newCard as CustomerLoyaltyCard;
 } else {
 const updatedCurrent = card.current_stamps + input.stamps_to_add;
 const updatedTotal = card.total_stamps_earned + input.stamps_to_add;

 const { data: updatedCard, error: updateErr } = await db
 .from("customer_loyalty_cards")
 .update({
 current_stamps: updatedCurrent,
 total_stamps_earned: updatedTotal,
 customer_name: input.customer_name || card.customer_name,
 last_stamped_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", card.id)
 .select()
 .single();

 if (updateErr) {
 console.error("[stampCustomerCard] Erro no update:", updateErr);
 throw new Error("Falha ao carimbar cartão.");
 }

 return updatedCard as CustomerLoyaltyCard;
 }
 });

// 5. Resgatar Recompensa
export const redeemLoyaltyReward = createServerFn({ method: "POST" })
 .validator(
 z.object({
 card_id: z.string().uuid(),
 }),
 )
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 if (!identity.store_id) {
 throw new Error("Nenhuma loja ativa selecionada.");
 }

 const db = getServerClient();

 const { data: card } = await db
 .from("customer_loyalty_cards")
 .select("*, store_loyalty_programs!inner(target_stamps, reward_description)")
 .eq("id", input.card_id)
 .eq("store_id", identity.store_id)
 .single();

 if (!card) {
 throw new Error("Cartão não encontrado.");
 }

 const target = card.store_loyalty_programs.target_stamps;
 if (card.current_stamps < target) {
 throw new Error(`Selos insuficientes. O cliente possui ${card.current_stamps}/${target} selos.`);
 }

 const remainingStamps = card.current_stamps - target;

 const { data: updated, error } = await db
 .from("customer_loyalty_cards")
 .update({
 current_stamps: remainingStamps,
 total_rewards_redeemed: card.total_rewards_redeemed + 1,
 updated_at: new Date().toISOString(),
 })
 .eq("id", card.id)
 .select()
 .single();

 if (error) {
 console.error("[redeemLoyaltyReward] Erro:", error);
 throw new Error("Falha ao resgatar recompensa.");
 }

 return {
 success: true,
 reward: card.store_loyalty_programs.reward_description,
 remaining_stamps: remainingStamps,
 };
 });

// 6. Visualização Pública do Cartão de Fidelidade (Apple / Google Wallet Web Pass)
export const getPublicLoyaltyCard = createServerFn({ method: "GET" })
 .validator(
 z.object({
 token: z.string(),
 }),
 )
 .handler(async ({ data: input }) => {
 const db = getServerClient();

 const { data, error } = await db
 .from("customer_loyalty_cards")
 .select("*, store_loyalty_programs(*), stores(name, logo_url, slug)")
 .eq("card_token", input.token)
 .single();

 if (error || !data) {
 throw new Error("Cartão de fidelidade não encontrado ou expirado.");
 }

 return data;
 });
