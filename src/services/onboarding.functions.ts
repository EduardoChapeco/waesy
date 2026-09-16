import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export type OnboardingStepStatus =
 "unconfigured" | "partially_configured" | "completed" | "locked" | "technical_error";

export interface OnboardingStep {
 id: string;
 category: "fundamentos" | "catalogo" | "vendas" | "divulgacao";
 label: string;
 description: string;
 status: OnboardingStepStatus;
 targetRoute: string;
 details?: string;
}

export interface OnboardingOverview {
 steps: OnboardingStep[];
 totalSteps: number;
 completedSteps: number;
 partiallyConfiguredSteps: number;
 progressPercentage: number;
 isStoreReadyToSell: boolean;
 storeCategory?: string;
 storeName?: string;
}

export async function _getOnboardingStatus(): Promise<OnboardingOverview> {
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

 // Safe individual queries to catch technical errors per query without failing everything
 const fetchStore = async () => {
 try {
 const { data, error } = await db
 .from("stores")
 .select(
 "id, name, category, email, phone, cnpj, address, city, state, zip_code, logo_url, policies, seo_title, seo_description, pix_key, settings",
 )
 .eq("id", storeId)
 .single();

 const { data: theme } = await db
 .from("theme_settings")
 .select("logo_url, favicon_url")
 .eq("store_id", storeId)
 .maybeSingle();

 if (error)
 return {
 status: "error" as const,
 error: error instanceof Error ? error.message : String(error),
 };
 return { status: "ok" as const, data: { ...data, theme_settings: theme } };
 } catch (e: unknown) {
 return {
 status: "error" as const,
 error: (e instanceof Error ? e.message : String(e)) || "Erro de banco",
 };
 }
 };

 const fetchCount = async (table: string, filterColumn?: string, filterValue?: unknown) => {
 try {
 let query = db
 .from(table)
 .select("id", { count: "exact", head: true })
 .eq("store_id", storeId);
 if (filterColumn && filterValue !== undefined) {
 query = query.eq(filterColumn, filterValue);
 }
 const { count, error } = await query;
 if (error)
 return {
 status: "error" as const,
 error: error instanceof Error ? error.message : String(error),
 };
 return { status: "ok" as const, count: count ?? 0 };
 } catch (e: unknown) {
 const err = e as Error;
 return { status: "error" as const, error: err?.message || "Erro inesperado" };
 }
 };

 const fetchStockVariants = async () => {
 try {
 const { count, error } = await db
 .from("product_variants")
 .select("id, products!inner(store_id)", { count: "exact", head: true })
 .eq("products.store_id", storeId)
 .gt("stock_on_hand", 0);
 if (error)
 return {
 status: "error" as const,
 error: error instanceof Error ? error.message : String(error),
 };
 return { status: "ok" as const, count: count ?? 0 };
 } catch (e: unknown) {
 const err = e as Error;
 return { status: "error" as const, error: err?.message || "Erro inesperado" };
 }
 };

 const [storeRes, shippingRes, categoriesRes, productsRes, stockRes, ordersRes, couponsRes] =
 await Promise.all([
 fetchStore(),
 fetchCount("shipping_rates"),
 fetchCount("categories"),
 fetchCount("products"),
 fetchStockVariants(),
 fetchCount("orders"),
 fetchCount("coupons"),
 ]);

 const steps: OnboardingStep[] = [];

 // 1. Perfil da Loja
 if (storeRes.status === "error") {
 steps.push({
 id: "profile",
 category: "fundamentos",
 label: "Perfil e Dados da Loja",
 description: "Nome, telefone e e-mail de contato comercial da empresa.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes",
 details: storeRes.error,
 });
 } else {
 const s = storeRes.data;
 const hasName = Boolean(s?.name && s.name !== "Nova Loja");
 const hasContact = Boolean(s?.phone || s?.email || s?.address || s?.cnpj);

 let status: OnboardingStepStatus = "unconfigured";
 if (hasName && hasContact) status = "completed";
 else if (hasName || hasContact) status = "partially_configured";

 steps.push({
 id: "profile",
 category: "fundamentos",
 label: "Perfil e Dados da Loja",
 description: "Nome, telefone e e-mail de contato comercial da empresa.",
 status,
 targetRoute: "/workspace/configuracoes",
 details: status === "completed" ? "Perfil completo" : "Pendente complemento de dados",
 });
 }

 // 2. Logo da Loja
 if (storeRes.status === "error") {
 steps.push({
 id: "logo",
 category: "fundamentos",
 label: "Logotipo da Loja",
 description: "Identidade visual da marca para o cabeçalho e recibos.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes",
 });
 } else {
 const s = storeRes.data;
 const hasLogo = Boolean(
 s?.logo_url ||
 s?.settings?.logoUrl ||
 s?.settings?.logo_url ||
 s?.settings?.faviconUrl ||
 s?.theme_settings?.logo_url ||
 s?.theme_settings?.favicon_url,
 );
 steps.push({
 id: "logo",
 category: "fundamentos",
 label: "Logotipo da Loja",
 description: "Identidade visual da marca para o cabeçalho e recibos.",
 status: hasLogo ? "completed" : "unconfigured",
 targetRoute: "/workspace/configuracoes",
 details: hasLogo ? "Logotipo ou ícone cadastrados" : "Envie a imagem da sua marca",
 });
 }

 // 3. Endereço
 if (storeRes.status === "error") {
 steps.push({
 id: "address",
 category: "fundamentos",
 label: "Endereço Físico ou Sede",
 description: "Endereço de saída dos fretes e atendimento.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes",
 });
 } else {
 const s = storeRes.data;
 const hasStreet = Boolean(s?.address);
 const hasCityState = Boolean(s?.city && s?.state);

 let status: OnboardingStepStatus = "unconfigured";
 if (hasStreet && hasCityState) status = "completed";
 else if (hasStreet || hasCityState) status = "partially_configured";

 steps.push({
 id: "address",
 category: "fundamentos",
 label: "Endereço Físico ou Sede",
 description: "Endereço de saída dos fretes e atendimento.",
 status,
 targetRoute: "/workspace/configuracoes",
 details: status === "completed" ? "Endereço completo" : "Informe o endereço da loja",
 });
 }

 // 4. Pagamentos
 if (storeRes.status === "error") {
 steps.push({
 id: "payment",
 category: "fundamentos",
 label: "Formas de Pagamento",
 description: "Configuração de chave Pix manual e métodos de cobrança.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes",
 });
 } else {
 const isPixEnabled = Boolean(storeRes.data?.pix_key);
 steps.push({
 id: "payment",
 category: "fundamentos",
 label: "Formas de Pagamento",
 description: "Configuração de chave Pix manual e métodos de cobrança.",
 status: isPixEnabled ? "completed" : "unconfigured",
 targetRoute: "/workspace/configuracoes",
 details: isPixEnabled ? "Pix ativado" : "Ative o Pix para receber pagamentos",
 });
 }

 // 5. Frete e Envio
 if (shippingRes.status === "error") {
 steps.push({
 id: "shipping",
 category: "fundamentos",
 label: "Tabelas de Frete e Entrega",
 description: "Opções de envio por região ou retirada presencial.",
 status: "technical_error",
 targetRoute: "/workspace/logistica/tabelas",
 });
 } else {
 const count = shippingRes.count;
 steps.push({
 id: "shipping",
 category: "fundamentos",
 label: "Tabelas de Frete e Entrega",
 description: "Opções de envio por região ou retirada presencial.",
 status: count > 0 ? "completed" : "unconfigured",
 targetRoute: "/workspace/logistica/tabelas",
 details: count > 0 ? `${count} tabela(s) ativa(s)` : "Cadastre uma taxa de entrega",
 });
 }

 // 6. Categorias
 if (categoriesRes.status === "error") {
 steps.push({
 id: "categories",
 category: "catalogo",
 label: "Categorias de Produtos",
 description: "Organização do catálogo por seções e departamentos.",
 status: "technical_error",
 targetRoute: "/workspace/catalogo/categorias",
 });
 } else {
 const count = categoriesRes.count;
 steps.push({
 id: "categories",
 category: "catalogo",
 label: "Categorias de Produtos",
 description: "Organização do catálogo por seções e departamentos.",
 status: count > 0 ? "completed" : "unconfigured",
 targetRoute: "/workspace/catalogo/categorias",
 details: count > 0 ? `${count} categoria(s) cadastrada(s)` : "Crie a primeira categoria",
 });
 }

 // 7. Primeiro Produto
 if (productsRes.status === "error") {
 steps.push({
 id: "first_product",
 category: "catalogo",
 label: "Cadastro do Primeiro Produto",
 description: "Inclusão de produto com título, preço e fotos na vitrine.",
 status: "technical_error",
 targetRoute: "/workspace/catalogo/produtos/novo",
 });
 } else {
 const count = productsRes.count;
 steps.push({
 id: "first_product",
 category: "catalogo",
 label: "Cadastro do Primeiro Produto",
 description: "Inclusão de produto com título, preço e fotos na vitrine.",
 status: count > 0 ? "completed" : "unconfigured",
 targetRoute: "/workspace/catalogo/produtos/novo",
 details: count > 0 ? `${count} produto(s) no catálogo` : "Adicione seu primeiro produto",
 });
 }

 // 8. Estoque
 if (stockRes.status === "error") {
 steps.push({
 id: "stock",
 category: "catalogo",
 label: "Estoque Inicial por Variação",
 description: "Disponibilização de saldo para venda por tamanho/cor.",
 status: "technical_error",
 targetRoute: "/workspace/estoque",
 });
 } else {
 const count = stockRes.count;
 const hasProducts = productsRes.status === "ok" && productsRes.count > 0;
 let status: OnboardingStepStatus = "unconfigured";
 if (count > 0) status = "completed";
 else if (!hasProducts) status = "locked";

 steps.push({
 id: "stock",
 category: "catalogo",
 label: "Estoque Inicial por Variação",
 description: "Disponibilização de saldo para venda por tamanho/cor.",
 status,
 targetRoute: "/workspace/estoque",
 details:
 status === "locked"
 ? "Cadastre um produto antes"
 : status === "completed"
 ? `${count} variação(ões) com saldo`
 : "Adicione estoque",
 });
 }

 // 9. Políticas
 if (storeRes.status === "error") {
 steps.push({
 id: "policies",
 category: "fundamentos",
 label: "Políticas da Loja",
 description: "Termos de trocas, devoluções e privacidade.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes/privacidade-loja",
 });
 } else {
 const p = storeRes.data?.policies as any;
 const hasReturns = Boolean(p?.returns || p?.terms);

 steps.push({
 id: "policies",
 category: "fundamentos",
 label: "Políticas da Loja",
 description: "Termos de trocas, devoluções e privacidade.",
 status: hasReturns ? "completed" : "unconfigured",
 targetRoute: "/workspace/configuracoes/privacidade-loja",
 details: hasReturns ? "Políticas configuradas" : "Defina as regras de troca",
 });
 }

 // 10. SEO
 if (storeRes.status === "error") {
 steps.push({
 id: "seo",
 category: "divulgacao",
 label: "SEO e Indexação no Google",
 description: "Título e descrição para compartilhamento social e buscadores.",
 status: "technical_error",
 targetRoute: "/workspace/configuracoes",
 });
 } else {
 const s = storeRes.data;
 const hasTitle = Boolean(s?.seo_title);
 const hasDesc = Boolean(s?.seo_description);

 let status: OnboardingStepStatus = "unconfigured";
 if (hasTitle && hasDesc) status = "completed";
 else if (hasTitle || hasDesc) status = "partially_configured";

 steps.push({
 id: "seo",
 category: "divulgacao",
 label: "SEO e Indexação no Google",
 description: "Título e descrição para compartilhamento social e buscadores.",
 status,
 targetRoute: "/workspace/configuracoes",
 details: status === "completed" ? "Metadados configurados" : "Configure as tags SEO",
 });
 }

 // 11. Primeiro Pedido
 if (ordersRes.status === "error") {
 steps.push({
 id: "first_order",
 category: "vendas",
 label: "Primeiro Pedido Realizado",
 description: "Primeira venda efetuada no e-commerce ou no PDV.",
 status: "technical_error",
 targetRoute: "/workspace/pedidos",
 });
 } else {
 const count = ordersRes.count;
 const isReadyToSell =
 productsRes.status === "ok" &&
 productsRes.count > 0 &&
 storeRes.status === "ok" &&
 Boolean(storeRes.data?.pix_key);

 let status: OnboardingStepStatus = "unconfigured";
 if (count > 0) status = "completed";
 else if (!isReadyToSell) status = "locked";

 steps.push({
 id: "first_order",
 category: "vendas",
 label: "Primeiro Pedido Realizado",
 description: "Primeira venda efetuada no e-commerce ou no PDV.",
 status,
 targetRoute: "/workspace/pedidos",
 details:
 status === "locked"
 ? "Configure produto e pagamento antes"
 : status === "completed"
 ? `${count} pedido(s) recebido(s)`
 : "Aguardando primeira venda",
 });
 }

 // 12. Primeira Campanha / Cupom
 if (couponsRes.status === "error") {
 steps.push({
 id: "first_campaign",
 category: "divulgacao",
 label: "Cupom de Desconto Inicial",
 description: "Criação de cupom para atrair as primeiras clientes.",
 status: "technical_error",
 targetRoute: "/workspace/marketing/promocoes",
 });
 } else {
 const count = couponsRes.count;
 steps.push({
 id: "first_campaign",
 category: "divulgacao",
 label: "Cupom de Desconto Inicial",
 description: "Criação de cupom para atrair as primeiras clientes.",
 status: count > 0 ? "completed" : "unconfigured",
 targetRoute: "/workspace/marketing/promocoes",
 details: count > 0 ? `${count} cupom(ns) ativo(s)` : "Crie um cupom de boas-vindas",
 });
 }

 const totalSteps = steps.length;
 const completedSteps = steps.filter((s) => s.status === "completed").length;
 const partiallyConfiguredSteps = steps.filter((s) => s.status === "partially_configured").length;
 const progressPercentage = Math.round(
 ((completedSteps + partiallyConfiguredSteps * 0.5) / totalSteps) * 100,
 );

 const hasProduct = steps.find((s) => s.id === "first_product")?.status === "completed";
 const hasPayment = steps.find((s) => s.id === "payment")?.status === "completed";
 const isStoreReadyToSell = Boolean(hasProduct && hasPayment);

 const storeData = storeRes.status === "ok" ? storeRes.data : null;
 const storeCategory = storeData?.category || storeData?.settings?.category || "retail";
 const storeName = storeData?.name || "Sua Loja";

 return {
 steps,
 totalSteps,
 completedSteps,
 partiallyConfiguredSteps,
 progressPercentage,
 isStoreReadyToSell,
 storeCategory,
 storeName,
 };
}

export const getOnboardingStatus = createServerFn({ method: "GET" }).handler(async () => {
 const data = await _getOnboardingStatus();
 return data;
});

import { z } from "zod";
import { getSSRClient } from "@/lib/supabase-ssr.server";

function generateSlug(text: string) {
 return text
 .toString()
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9 -]/g, "")
 .replace(/\s+/g, "-")
 .replace(/-+/g, "-")
 .replace(/^-+/, "")
 .replace(/-+$/, "");
}

const ProvisionBusinessSchema = z.object({
 name: z.string().min(2, "Nome muito curto"),
 type: z.string().optional(),
 document: z.string().optional(),
 city: z.string().optional(),
 state: z.string().optional(),
 address: z.string().optional(),
 street: z.string().optional(),
 number: z.string().optional(),
 complement: z.string().optional(),
 neighborhood: z.string().optional(),
 zipCode: z.string().optional(),
 latitude: z.number().optional().nullable(),
 longitude: z.number().optional().nullable(),
 businessModel: z
 .enum(["physical_and_delivery", "delivery_only", "home_office", "service_at_client", "digital_only"])
 .optional(),
 isAddressPublic: z.boolean().optional(),
 serviceRadiusKm: z.number().optional(),
 coverageCities: z.array(z.string()).optional(),
 phone: z.string().optional(),
 email: z.string().optional(),
 logoUrl: z.string().optional(),
 bannerUrl: z.string().optional(),
 workingHours: z.record(z.any()).optional(),
 deliveryZones: z.array(z.any()).optional(),
 complianceDocuments: z.array(z.any()).optional(),
 teamMembers: z
 .array(
 z.object({
 email: z.string().email("E-mail inválido"),
 fullName: z.string().optional(),
 role: z
 .enum(["admin", "manager", "seller", "finance", "content", "support", "stock"])
 .default("seller"),
 })
 )
 .optional(),
});

export const provisionBusiness = createServerFn({ method: "POST" })
 .validator(ProvisionBusinessSchema)
 .handler(async ({ data }) => {
 const db = getServerClient(); // Bypass RLS para provisionamento

 // 0. Resolver identidade segura da sessão
 let userId: string | null = null;
 try {
 const identity = await getServerIdentity();
 userId = identity?.id || null;
 } catch {
 userId = null;
 }

 if (!userId) {
 try {
 const ssrClient = getSSRClient();
 const { data: authData } = await ssrClient.auth.getUser();
 userId = authData?.user?.id || null;
 } catch {
 userId = null;
 }
 }

 if (!userId) {
 throw new Error("Sessão não autenticada. Faça login para cadastrar sua empresa.");
 }

 // 0.1 Garantir existência de profile no banco com role 'owner'
 const { data: existingProfile } = await db
 .from("profiles")
 .select("id, full_name")
 .eq("id", userId)
 .maybeSingle();

 if (!existingProfile) {
 await db.from("profiles").insert({
 id: userId,
 role: "owner",
 });
 } else {
 await db.from("profiles").update({ role: "owner" }).eq("id", userId);
 }

 // 1. Criar Organização
 const orgSlug = generateSlug(data.name) + "-" + Math.floor(1000 + Math.random() * 9000);
 const { data: org, error: orgError } = await db
 .from("organizations")
 .insert({ name: data.name, slug: orgSlug })
 .select("id")
 .single();
 if (orgError) throw new Error("Erro ao criar organização: " + orgError.message);

 // 2. Montar objeto settings estruturado e persistido com type, segment, logoUrl e configurações
 const settings: Record<string, any> = {
 type: data.type || "gastronomy",
 segment: data.type || "gastronomy",
 niche: data.type || "gastronomy",
 logoUrl: data.logoUrl || null,
 bannerUrl: data.bannerUrl || null,
 business_model: data.businessModel || "physical_and_delivery",
 is_address_public: data.isAddressPublic ?? true,
 service_radius_km: data.serviceRadiusKm ?? 15,
 coverage_cities: data.coverageCities || (data.city ? [data.city] : []),
 street: data.street || null,
 number: data.number || null,
 complement: data.complement || null,
 neighborhood: data.neighborhood || null,
 zip_code: data.zipCode || null,
 latitude: data.latitude || null,
 longitude: data.longitude || null,
 working_hours: data.workingHours || null,
 delivery_zones: data.deliveryZones || [],
 compliance_documents: data.complianceDocuments || [],
 token_wallet: {
 balance: 50_000,
 lifetime_purchased: 50_000,
 lifetime_consumed: 0,
 estimated_time_saved_hours: 24.0,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 },
 };

 // 3. Criar Loja com colunas canônicas seguras
 const storePayload: Record<string, any> = {
 organization_id: org.id,
 name: data.name,
 slug: orgSlug,
 cnpj: data.document || null,
 city: data.city || null,
 state: data.state || null,
 address: data.address || (data.street ? `${data.street}, ${data.number || "S/N"}` : null),
 phone: data.phone || null,
 email: data.email || null,
 logo_url: data.logoUrl || null,
 settings,
 };

 const { data: store, error: storeError } = await db
 .from("stores")
 .insert(storePayload)
 .select("id")
 .single();
 if (storeError) throw new Error("Erro ao criar loja: " + storeError.message);

 // 4. Vincular Usuário como Owner no workspace_members e store_members
 try {
 await db.from("workspace_members").upsert(
 {
 profile_id: userId,
 store_id: store.id,
 role: "owner",
 },
 { onConflict: "profile_id,store_id" }
 );
 } catch (memberError: any) {
 console.warn("[onboarding] Aviso ao vincular workspace_members:", memberError?.message);
 }

 // 4.1 Atualizar o role do profile para owner
 try {
 await db
 .from("profiles")
 .update({
 role: "owner",
 })
 .eq("id", userId);
 } catch {
 // Silencioso
 }

 // 4.2 Setar cookie do tenant ativo no servidor
 try {
 setCookie("waesy_active_tenant", store.id, {
 path: "/",
 maxAge: 60 * 60 * 24 * 365,
 httpOnly: false,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax",
 });
 } catch {
 // Silencioso
 }

 // 4.0.1 SILENT BACKGROUND TRIGGER: Gravar log inicial no ledger de tokens
 try {
 await db.from("audit_logs").insert({
 store_id: store.id,
 user_id: userId,
 action: "token_bonus_welcome",
 entity_type: "token_transaction",
 entity_id: store.id,
 payload_snapshot: {
 tokens_credited: 50_000,
 reason: "Bônus de Boas-Vindas Waesy (Novo Negócio)",
 balance_after: 50_000,
 },
 });
 } catch {
 // Ignora erro não impeditivo de log
 }

 // 4.0 SILENT BACKGROUND TRIGGER: Provisionar categorias iniciais do nicho
 try {
 const niche = (data.type || "gastronomy").toLowerCase();
 let defaultCategories: string[] = ["Destaques", "Mais Vendidos", "Novidades"];

 if (niche.includes("turis") || niche.includes("viage") || niche.includes("tour") || niche.includes("passeio")) {
 defaultCategories = ["Pacotes Nacionais", "Viagens Internacionais", "Cruzeiros Marítimos", "Ecoturismo & Passeios", "Passagens Aéreas", "Assessoria de Vistos"];
 } else if (niche.includes("gastro") || niche.includes("lanche") || niche.includes("restaurante") || niche.includes("marmita") || niche.includes("doce")) {
 defaultCategories = ["Burgers & Lanches", "Porções & Entradas", "Bebidas & Sucos", "Sobremesas"];
 } else if (niche.includes("mercado") || niche.includes("hortifruti")) {
 defaultCategories = ["Hortifrúti & Orgânicos", "Padaria & Frios", "Bebidas", "Mercearia"];
 } else if (niche.includes("moda") || niche.includes("vestuario") || niche.includes("boutique")) {
 defaultCategories = ["Novidades da Semana", "Feminino", "Masculino", "Calçados & Acessórios"];
 } else if (niche.includes("pet")) {
 defaultCategories = ["Rações & Alimentos", "Petiscos & Bifinhos", "Brinquedos & Acessórios", "Higiene & Farmácia"];
 } else if (niche.includes("farmacia") || niche.includes("saude")) {
 defaultCategories = ["Medicamentos & OTC", "Higiene Pessoal", "Dermocosméticos", "Suplementos & Vitaminas"];
 } else if (niche.includes("eletronico") || niche.includes("tech")) {
 defaultCategories = ["Smartphones & Acessórios", "Informática & Áudio", "Cabos & Carregadores", "Gamer"];
 } else if (niche.includes("beleza") || niche.includes("salao") || niche.includes("barber") || niche.includes("estetica")) {
 defaultCategories = ["Cabelo & Barba", "Estética Facial", "Tratamentos Corporais", "Pacotes & Sessões"];
 } else if (niche.includes("legal") || niche.includes("advoca") || niche.includes("jurid")) {
 defaultCategories = ["Consultoria & Pareceres", "Direito Civil & Família", "Trabalhista & Previdenciário", "Contratos Comerciais"];
 } else if (niche.includes("imove") || niche.includes("imobili")) {
 defaultCategories = ["Imóveis para Venda", "Locação Residencial", "Salas Comerciais", "Terrenos & Lançamentos"];
 } else if (niche.includes("evento") || niche.includes("ingresso") || niche.includes("locacao")) {
 defaultCategories = ["Ingressos & Lotes", "Área VIP & Mesas", "Locação de Estruturas", "Equipamentos de Som & Luz"];
 } else if (niche.includes("educa") || niche.includes("curso") || niche.includes("escola")) {
 defaultCategories = ["Cursos Presenciais", "Workshops & Imersões", "Aulas Particulares", "Materiais Didáticos"];
 }

 const categoriesPayload = defaultCategories.map((catName, idx) => ({
 store_id: store.id,
 name: catName,
 slug: generateSlug(catName) + "-" + Math.floor(100 + Math.random() * 900),
 position: idx,
 is_active: true,
 }));

 await db.from("categories").insert(categoriesPayload);
 } catch (catErr) {
 console.warn("[onboarding] Falha silenciosa ao criar categorias iniciais:", catErr);
 }

 // 4.1 Definir o cookie do novo tenant ativo imediatamente
 try {
 setCookie("waesy_active_tenant", store.id, {
 path: "/",
 maxAge: 60 * 60 * 24 * 365,
 httpOnly: false,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax",
 });
 } catch {
 // Ignora se cabeçalhos já enviados
 }

 // 5. Vincular theme_settings se logo ou banner presentes
 if (data.logoUrl || data.bannerUrl) {
 try {
 await db.from("theme_settings").upsert({
 store_id: store.id,
 logo_url: data.logoUrl || null,
 banner_url: data.bannerUrl || null,
 });
 } catch {
 // Ignora caso theme_settings não exista estruturalmente
 }
 }

 // 6. Convidar e Vincular Membros Iniciais da Equipe (se informados)
 if (data.teamMembers && data.teamMembers.length > 0) {
 for (const member of data.teamMembers) {
 const cleanEmail = member.email.trim().toLowerCase();
 if (!cleanEmail) continue;

 try {
 // A. Verifica se o usuário já possui conta Auth no Supabase
 const { data: existingUsers } = await db
 .schema("auth")
 .from("users")
 .select("id, email")
 .eq("email", cleanEmail)
 .limit(1);

 let targetUserId = existingUsers?.[0]?.id;

 // B. Se não existir, provisiona o usuário inicial no Auth
 if (!targetUserId) {
 const { data: newAuth, error: createError } = await db.auth.admin.createUser({
 email: cleanEmail,
 password: `Waesy#${Math.floor(100000 + Math.random() * 900000)}!`,
 email_confirm: true,
 user_metadata: {
 full_name: member.fullName || cleanEmail.split("@")[0],
 invited_by: userId,
 store_id: store.id,
 },
 });

 if (!createError && newAuth?.user) {
 targetUserId = newAuth.user.id;
 await db.from("profiles").upsert({
 id: targetUserId,
 full_name: member.fullName || cleanEmail.split("@")[0],
 role: "staff",
 });
 }
 }

 // C. Vincula à loja em workspace_members
 if (targetUserId) {
 await db.from("workspace_members").upsert({
 profile_id: targetUserId,
 store_id: store.id,
 role: member.role || "seller",
 });
 }
 } catch (memberErr) {
 console.warn("[onboarding] Falha ao vincular membro:", cleanEmail, memberErr);
 }
 }
 }

 return {
 status: "success" as const,
 storeId: store.id,
 storeName: data.name,
 storeSlug: orgSlug,
 };
 });
