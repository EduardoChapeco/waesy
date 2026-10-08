import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";

/**
 * Valida se o usuário autenticado é Platform Admin (Master)
 */
async function requirePlatformAdmin() {
 const identity = await getServerIdentity();
 if (!identity.id) {
 throw new Error("Não autenticado. Por favor, faça login.");
 }

 if (identity.role === "platform_admin" || identity.role === "master") {
 return identity;
 }

 const db = getServerClient();
 const { data: p } = await db
 .from("profiles")
 .select("role")
 .eq("id", identity.id)
 .maybeSingle();

 if (p?.role === "platform_admin" || p?.role === "master") {
 return { ...identity, role: "platform_admin" };
 }

 const { data: userData } = await db.auth.admin.getUserById(identity.id).catch(() => ({ data: { user: null } }));
 const email = userData?.user?.email?.toLowerCase();
 const MASTER_EMAILS = [
 "contato@usewaesy.com",
 "admin@usewaesy.com",
 "meuwaesy@gmail.com",
 "meuwider@gmail.com",
 "excelenciatour.smo@gmail.com",
 "admin@jah.com",
 ];

 if (email && MASTER_EMAILS.includes(email)) {
 const { error: promotionError } = await db.from("profiles").update({ role: "platform_admin" }).eq("id", identity.id);
 if (promotionError) {
 console.error("[legal] Falha ao persistir promoção para platform_admin:", promotionError);
 throw new Error("Não foi possível confirmar a autorização administrativa.");
 }
 return { ...identity, role: "platform_admin" };
 }

 throw new Error("Acesso negado. Apenas administradores globais master podem realizar esta ação.");
}

// ============================================================
// 1. REGISTRO FORENSE DE CONSENTIMENTO & ACEITE (LGPD / COOKIES)
// ============================================================

export const recordConsentLog = createServerFn({ method: "POST" })
 .validator(
 z.object({
 term_type: z.string().default("cookie_policy"),
 version: z.string().default("2.0"),
 session_id: z.string().optional(),
 metadata: z.record(z.any()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const mod = await import("@/lib/legal-consent.server");
 return mod.recordConsentLogServer(data);
 });

// ============================================================
// 2. CONSULTA PÚBLICA DE DOCUMENTOS LEGAIS POR SLUG
// ============================================================

export const getLegalDocumentBySlug = createServerFn({ method: "GET" })
 .validator(
 z.object({
 slug: z.string(),
 }),
 )
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { data: doc, error } = await db
 .from("legal_documents")
 .select("*")
 .eq("slug", data.slug)
 .eq("is_published", true)
 .maybeSingle();

 if (error) {
 console.error("[LegalFunctions] Erro ao buscar documento legal:", error);
 }

 return doc || null;
 });

/**
 * Retorna todos os documentos legais publicados para uso em drawers de consentimento, onboarding e rodapé
 */
export const getLegalBundle = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();

 const { data: docs, error } = await db
 .from("legal_documents")
 .select("id, slug, title, category, version, summary, content_markdown, updated_at")
 .eq("is_published", true)
 .order("slug");

 if (error) {
 console.error("[LegalFunctions] Erro ao buscar pacote legal:", error);
 return [];
 }

 return docs || [];
});

// ============================================================
// 3. ADMIN: LISTAGEM DE DOCUMENTOS LEGAIS DA PLATAFORMA
// ============================================================

export const listLegalDocuments = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const { data, error } = await db
 .from("legal_documents")
 .select("*")
 .order("created_at", { ascending: true });

 if (error) {
 throw new Error(error.message || "Erro ao listar documentos legais.");
 }

 return data || [];
});

// ============================================================
// 4. ADMIN: ATUALIZAR DOCUMENTO LEGAL
// ============================================================

export const updateLegalDocument = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(3),
 summary: z.string().optional(),
 content_markdown: z.string().min(10),
 version: z.string().min(1),
 is_published: z.boolean().default(true),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await requirePlatformAdmin();
 const db = getServerClient();

 const { data: updated, error } = await db
 .from("legal_documents")
 .update({
 title: data.title,
 summary: data.summary,
 content_markdown: data.content_markdown,
 version: data.version,
 is_published: data.is_published,
 updated_by: identity.id,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.id)
 .select()
 .single();

 if (error) {
 throw new Error(error.message || "Erro ao atualizar documento legal.");
 }

 return updated;
 });

// ============================================================
// 5. ADMIN: LISTAGEM DE LOGS FORENSES DE ACEITE (AUDITORIA LGPD)
// ============================================================

export const listConsentLogs = createServerFn({ method: "GET" })
 .validator(
 z.object({
 term_type: z.string().optional(),
 search: z.string().optional(),
 limit: z.number().default(50),
 offset: z.number().default(0),
 }),
 )
 .handler(async ({ data }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 let query = db
 .from("legal_terms_acceptances")
 .select(
 `
 id,
 user_id,
 term_type,
 version,
 ip_address,
 ip_address_hash,
 user_agent,
 session_id,
 signature_hash,
 metadata,
 accepted_at,
 profiles (
 id,
 name,
 email
 )
 `,
 { count: "exact" },
 )
 .order("accepted_at", { ascending: false })
 .range(data.offset, data.offset + data.limit - 1);

 if (data.term_type && data.term_type !== "all") {
 query = query.eq("term_type", data.term_type);
 }

 if (data.search && data.search.trim()) {
 const s = `%${data.search.trim()}%`;
 query = query.or(`ip_address.ilike.${s},user_agent.ilike.${s},signature_hash.ilike.${s}`);
 }

 const { data: logs, count, error } = await query;

 if (error) {
 throw new Error(error.message || "Erro ao buscar logs de consentimento.");
 }

 return {
 logs: logs || [],
 total: count || 0,
 };
 });

// ============================================================
// 6. ADMIN: MÉTRICAS & ESTATÍSTICAS DE CONSENTIMENTO LGPD
// ============================================================

export const getConsentStats = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const [totalRes, cookiesRes, privacyRes, termsRes, authRes] = await Promise.all([
 db.from("legal_terms_acceptances").select("id", { count: "exact", head: true }),
 db.from("legal_terms_acceptances").select("id", { count: "exact", head: true }).eq("term_type", "cookie_policy"),
 db.from("legal_terms_acceptances").select("id", { count: "exact", head: true }).eq("term_type", "privacy_policy"),
 db.from("legal_terms_acceptances").select("id", { count: "exact", head: true }).eq("term_type", "terms_of_service"),
 db.from("legal_terms_acceptances").select("id", { count: "exact", head: true }).not("user_id", "is", null),
 ]);

 return {
 totalAcceptances: totalRes.count || 0,
 cookieAcceptances: cookiesRes.count || 0,
 privacyAcceptances: privacyRes.count || 0,
 termsAcceptances: termsRes.count || 0,
 authenticatedAcceptances: authRes.count || 0,
 };
});
