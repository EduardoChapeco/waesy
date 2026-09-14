/**
 * Auth server functions Commerce
 *
 * Handles login, signup, oauth, logout, and session retrieval using the SSR client.
 * Never stores credentials in the client; delegates all auth to Supabase.
 * Profiles are created strictly by the DB trigger `handle_new_user` on auth.users insert.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { getSSRClient, getServerIdentity } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { mergeGuestCart } from "./cart.functions";
import { safeHandler } from "@/lib/server-fn-wrapper";
import { LoginSchema, RegisterSchema, ResetPasswordSchema } from "@/lib/contracts/auth.schema";
import { Provider } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { readCookieFromRequest } from "@/lib/http-cookies";
import { normalizeInternalReturnPath } from "@/lib/return-path";
import {
 checkRateLimit,
 recordFailedAttempt,
 resetAttempts,
 formatRetryAfter,
} from "@/lib/rate-limiter";
import { recordAuthAuditEvent } from "@/lib/session-audit.server";
import { validateCpfMod11, cleanDocument } from "@/lib/document-validator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from the incoming request.
 * Cloudflare sets CF-Connecting-IP; falls back to X-Forwarded-For or "unknown".
 */
function getClientIp(req: Request): string {
 return (
 req.headers.get("cf-connecting-ip") ??
 req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
 "unknown"
 );
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schemas are now imported from @/lib/contracts/auth.schema
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export const getUserSession = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity();

 // Se a identidade não tem user, não há sessão ativa.
 const effectiveUserId = identity.id;
 if (!effectiveUserId) {
 return null;
 }

 const adminDb = getServerClient();

 // Busca o usuário do Supabase Auth apenas se necessário para dados de metadata
 // (identity.server.ts já chamou getSSRClient().auth.getUser() internamente)
 const supabase = await getSSRClient();
 let user: any = null;
 try {
 const authRes = await supabase.auth.getUser();
 user = authRes.data?.user || null;
 } catch {
 user = null;
 }

 // 1. Busca perfil real no banco
 let profile: any = null;
 try {
 const { data: p } = await adminDb
 .from("profiles")
 .select("id, full_name, username, avatar_url, role, phone, cpf")
 .eq("id", effectiveUserId)
 .maybeSingle();
 profile = p;
 } catch {
 profile = null;
 }

 const effectiveEmail = user?.email || "";
 const effectiveFullName =
 profile?.full_name ||
 user?.user_metadata?.full_name ||
 user?.email?.split("@")[0] ||
 "Membro Waesy";

 return {
 id: effectiveUserId,
 user: {
 id: effectiveUserId,
 email: effectiveEmail,
 user_metadata: {
 ...(user?.user_metadata || {}),
 full_name: effectiveFullName,
 avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || null,
 username: profile?.username || "admin",
 },
 },
 email: effectiveEmail,
 role: profile?.role || identity.role || "customer",
 store_id: identity.store_id,
 memberships: identity.memberships,
 };
 } catch (e) {
 logSystemError({ route: "auth.functions.getUserSession", error: e });
 console.error("[auth] Erro em getUserSession:", e);
 return null;
 }
});

/**
 * Verifica se um identificador (email, @username, CPF, telefone) existe na plataforma.
 * Usado na Etapa 1 do login para feedback imediato sem expor senhas.
 */
export const checkIdentifierExists = createServerFn({ method: "POST" })
 .validator(z.object({ identifier: z.string().min(1) }))
 .handler(async ({ data: { identifier } }) => {
 try {
 const db = getServerClient();
 const raw = identifier.trim();

 if (raw.includes("@")) {
 // Formato de e-mail: o e-mail reside em auth.users gerenciado pelo Supabase Auth.
 // Retorna exists: true para prosseguir diretamente para a etapa de senha.
 const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
 return { exists: isEmailValid };
 }

 // CPF / telefone / @username → busca em profiles
 const cleanDigits = raw.replace(/\D/g, "");
 const cleanUser = raw.startsWith("@") ? raw.slice(1) : raw;

 let q = db.from("profiles").select("id");
 if (cleanDigits.length >= 10) {
 q = q.or(
 `cpf.eq.${cleanDigits},phone.eq.${cleanDigits},username.eq.${cleanUser}`,
 );
 } else {
 q = q.or(`username.eq.${cleanUser},phone.eq.${cleanUser}`);
 }

 const { data } = await q.limit(1).maybeSingle();
 return { exists: !!data?.id };
 } catch (e) {
 logSystemError({ route: "auth.functions.checkIdentifierExists", error: e, payload: { identifier } });
 // Em caso de erro, permite prosseguir (falha silenciosa — não bloqueia usuário)
 return { exists: true };
 }
 });

export const signInWithPassword = createServerFn({ method: "POST" })
 .validator(LoginSchema)
 .handler(async ({ data: { email, identifier, password, redirectTo, deviceFingerprint } }) => {
 let request: Request | null = null;
 try {
 request = getRequest();
 } catch {
 request = null;
 }
 const ip = request ? getClientIp(request) : "unknown";
 let matchedProfileId: string | null = null;

 try {
 // --- Rate limit check (before touching Supabase) ---
 const rateCheck = checkRateLimit(ip, "auth_login");
 if (!rateCheck.allowed) {
 // Registra evento suspeito de rate limit
 void recordAuthAuditEvent({
 profileId: null,
 eventType: "suspicious_activity",
 request,
 deviceFingerprint,
 metadata: { reason: "rate_limited", ip },
 }).catch(() => {});

 return {
 status: "rate_limited" as const,
 message: `Muitas tentativas de login. Tente novamente em ${formatRetryAfter(rateCheck.retryAfterSec!)}.`,
 retryAfterSec: rateCheck.retryAfterSec,
 };
 }

 const rawIdentifier = (identifier || email || "").trim();
 if (!rawIdentifier) {
 throw new Error("Informe seu e-mail, telefone, CPF ou @usuário.");
 }

 let targetEmail = rawIdentifier;

 // Resolução inteligente se não for um e-mail direto (CPF, Telefone ou @Username)
 if (!targetEmail.includes("@")) {
 const adminDb = getServerClient();
 const cleanUser = targetEmail.startsWith("@") ? targetEmail.slice(1) : targetEmail;
 const cleanDigits = targetEmail.replace(/\D/g, "");

 let profileQuery = adminDb.from("profiles").select("id");
 if (cleanDigits.length >= 10) {
 profileQuery = profileQuery.or(
 `cpf.eq.${cleanDigits},tax_id.eq.${cleanDigits},phone.eq.${cleanDigits},username.eq.${cleanUser}`,
 );
 } else {
 profileQuery = profileQuery.or(`username.eq.${cleanUser},phone.eq.${cleanUser}`);
 }

 const { data: matchedProfile } = await profileQuery.limit(1).maybeSingle();
 if (matchedProfile?.id) {
 matchedProfileId = matchedProfile.id;
 const { data: authUser } = await adminDb.auth.admin.getUserById(matchedProfile.id);
 if (authUser?.user?.email) {
 targetEmail = authUser.user.email;
 }
 }
 }

 // Extract guest session manually before async context drops
 const guestSessionToken = request ? readCookieFromRequest(request, "waesy_guest_session") : null;

 // Use global getResponseHeaders implicitly to ensure Set-Cookie is persisted on the RPC response
 const supabase = await getSSRClient();
 const { data, error } = await supabase.auth.signInWithPassword({
 email: targetEmail,
 password,
 });

 if (error) {
 // Record the failed attempt for rate limiting
 recordFailedAttempt(ip, "auth_login");

 // Grava auditoria forense de falha de login em background
 void recordAuthAuditEvent({
 profileId: matchedProfileId || null,
 eventType: "login_failed",
 request,
 deviceFingerprint,
 metadata: { identifier: rawIdentifier, errorMsg: error.message },
 }).catch(() => {});

 if (error.status === 429) {
 return { status: "error" as const, message: "Muitas tentativas de login. Aguarde alguns minutos." };
 }
 if (error.message.includes("Email not confirmed")) {
 return { status: "error" as const, message: "E-mail não confirmado. Verifique sua caixa de entrada." };
 }
 return { status: "error" as const, message: "Identificador ou senha incorretos." };
 }

 // Successful login: clear the failed attempts counter
 resetAttempts(ip, "auth_login");

 // Grava auditoria forense de sucesso de login de forma assíncrona (não bloqueia resposta HTTP)
 if (data.user) {
 void recordAuthAuditEvent({
 profileId: data.user.id,
 eventType: "login_success",
 request,
 deviceFingerprint,
 metadata: { email: targetEmail, identifier: rawIdentifier },
 }).catch((err) => console.warn("[auth] Auditoria de login falhou em background:", err));

 void (async () => {
 try {
 const { mergeGuestCartLogic } = await import("./cart-helpers");
 await mergeGuestCartLogic(
 data.user.id,
 data.session?.access_token,
 guestSessionToken,
 );
 } catch (err) {
 console.error("Falha ao mesclar carrinho durante login (ignorado):", err);
 }
 })();
 }

 // Return success immediately to let client perform fast redirect
 return { status: "success" as const };
 } catch (e: unknown) {
 logSystemError({ route: "auth.functions.signInWithPassword", error: e, payload: { email, identifier } });
 const message = e instanceof Error ? e.message : "Erro desconhecido";
 return { status: "error" as const, message: message.replace(/^Error:\s*/, "") };
 }
 });

export const signInWithOAuth = createServerFn({ method: "POST" })
 .validator(
 z.object({
 provider: z.enum(["google", "github", "apple", "azure"]),
 redirectTo: z.string().optional(),
 }),
 )
 .handler(async ({ data: { provider, redirectTo } }) => {
 try {
 const supabase = await getSSRClient();
 const siteUrl = getEnvVar("VITE_SITE_URL") || "https://waesy.pages.dev";
 const safeNext = normalizeInternalReturnPath(redirectTo, "/");
 const safeRedirectTo = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(safeNext)}`;

 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: provider as Provider,
 options: {
 redirectTo: safeRedirectTo,
 },
 });

 if (error) {
 throw new Error(error.message);
 }

 return { status: "success" as const, url: data.url };
 } catch (e: unknown) {
 logSystemError({ route: "auth.functions.signInWithOAuth", error: e, payload: { provider } });
 const message = e instanceof Error ? e.message : "Erro desconhecido";
 return { status: "error" as const, message: `Erro ao inicializar OAuth: ${message}` };
 }
 });

export const signUpWithPassword = createServerFn({ method: "POST" })
 .validator(RegisterSchema)
 .handler(async ({ data: { email, password, fullName, cpf, phone, redirectTo, isConsentLgpd, deviceFingerprint } }) => {
 let request: Request | null = null;
 try {
 request = getRequest();
 } catch {
 request = null;
 }
 const ip = request ? getClientIp(request) : "unknown";

 try {
 // --- Rate limit check (Anti-Bot / Anti-DDoS) ---
 const rateCheck = checkRateLimit(ip, "auth_signup");
 if (!rateCheck.allowed) {
 throw new Error(
 `Muitas tentativas de cadastro recentes a partir deste endereço IP. Aguarde ${formatRetryAfter(rateCheck.retryAfterSec!)} antes de tentar novamente.`
 );
 }

 // --- Validação KYC: CPF Único e Válido ---
 const cleanCpf = cleanDocument(cpf);
 const cleanPhone = cleanDocument(phone);
 const adminDb = getServerClient();

 if (cleanCpf) {
 if (!validateCpfMod11(cleanCpf)) {
 throw new Error("CPF inválido. Verifique o número informado.");
 }

 // Verifica unicidade do CPF na plataforma (1 conta pessoal por CPF)
 const { data: existingCpf } = await adminDb
 .from("profiles")
 .select("id")
 .eq("cpf", cleanCpf)
 .maybeSingle();

 if (existingCpf) {
 throw new Error(
 "Este CPF já possui uma conta cadastrada. Faça login na sua conta existente ou recupere sua senha."
 );
 }
 }

 if (cleanPhone && cleanPhone.length >= 10) {
 const { data: existingPhone } = await adminDb
 .from("profiles")
 .select("id")
 .eq("phone", cleanPhone)
 .maybeSingle();

 if (existingPhone) {
 throw new Error(
 "Este número de telefone já está vinculado a outra conta."
 );
 }
 }

 // Extract guest session manually before async context drops
 const guestSessionToken = request ? readCookieFromRequest(request, "waesy_guest_session") : null;

 const supabase = await getSSRClient();

 // 1. Verifica se o e-mail já existe
 const { data: existingUserList } = await adminDb.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } }));
 const userAlreadyExists = existingUserList?.users?.some(
 (u) => u.email?.toLowerCase() === email.toLowerCase(),
 );

 if (userAlreadyExists) {
 throw new Error("Este e-mail já possui uma conta cadastrada. Faça login ou recupere sua senha.");
 }

 // 2. Cria o usuário com auto-confirmação via Admin API (evita falha por rate limit de SMTP)
 let createdUserId: string | null = null;
 const { data: adminCreated, error: adminCreateErr } = await adminDb.auth.admin.createUser({
 email,
 password,
 email_confirm: true,
 user_metadata: {
 full_name: fullName,
 is_consent_lgpd: isConsentLgpd,
 cpf: cleanCpf || undefined,
 phone: cleanPhone || undefined,
 },
 });

 if (adminCreateErr) {
 console.error("[auth] admin.createUser error:", adminCreateErr);
 // Fallback para signUp padrão se admin falhar
 const { data: standardData, error: standardErr } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 full_name: fullName,
 is_consent_lgpd: isConsentLgpd,
 cpf: cleanCpf || undefined,
 phone: cleanPhone || undefined,
 },
 },
 });

 if (standardErr) {
 throw new Error(standardErr.message || "Erro ao criar conta no provedor de autenticação.");
 }
 createdUserId = standardData?.user?.id || null;
 } else {
 createdUserId = adminCreated?.user?.id || null;
 }

 // 3. Autentica imediatamente na sessão SSR para emitir cookies de acesso
 const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
 email,
 password,
 });

 if (signInErr) {
 console.warn("[auth] Auto-login pós-cadastro retornou aviso:", signInErr.message);
 }

 // 4. Garante dados complementares no profile
 if (createdUserId) {
 try {
 const updatePayload: Record<string, any> = {
 is_consent_lgpd: isConsentLgpd ?? true,
 };
 if (cleanCpf) updatePayload.cpf = cleanCpf;
 if (cleanPhone) updatePayload.phone = cleanPhone;
 if (fullName) updatePayload.full_name = fullName;

 await adminDb
 .from("profiles")
 .update(updatePayload)
 .eq("id", createdUserId);

 // Sincronizar o workspace master caso seja o primeiro usuário (platform_admin)
 const { data: p } = await adminDb.from("profiles").select("role").eq("id", createdUserId).single();
 if (p?.role === "platform_admin") {
 // Localiza ou cria org
 let orgId: string;
 const { data: orgs } = await adminDb.from("organizations").select("id").eq("slug", "waesy-org").limit(1);
 if (orgs && orgs.length > 0) {
 orgId = orgs[0].id;
 } else {
 const { data: newOrg } = await adminDb.from("organizations").insert({ name: "Waesy Global", slug: "waesy-org" }).select("id").single();
 orgId = newOrg!.id;
 }

 // Localiza ou cria store
 let storeId: string;
 const { data: stores } = await adminDb.from("stores").select("id").eq("slug", "waesy").limit(1);
 if (stores && stores.length > 0) {
 storeId = stores[0].id;
 } else {
 const { data: newStore } = await adminDb.from("stores").insert({ organization_id: orgId, name: "Waesy", slug: "waesy", settings: {}, is_platform_root: true, is_active: true }).select("id").single();
 storeId = newStore!.id;
 }

 // Associa workspace_members
 await adminDb.from("workspace_members").upsert({ profile_id: createdUserId, store_id: storeId, role: "owner" }, { onConflict: "profile_id,store_id" });
 }

 } catch (upErr) {
 console.warn("[auth] Falha ao atualizar dados complementares do profile ou sync de workspace:", upErr);
 }

 // Grava auditoria forense do evento de cadastro
 await recordAuthAuditEvent({
 profileId: createdUserId,
 eventType: "signup",
 request,
 deviceFingerprint,
 metadata: { email, fullName, hasCpf: !!cleanCpf },
 });
 }

 // 5. Mescla carrinho de convidado
 if (signInData?.session?.access_token && createdUserId) {
 try {
 await mergeGuestCart({
 data: {
 customerId: createdUserId,
 accessToken: signInData.session.access_token,
 guestSessionToken,
 },
 });
 } catch (err) {
 console.error("[auth] mergeGuestCart failed during signup (non-fatal):", err);
 }
 }

 return {
 success: true,
 sessionActive: !!signInData?.session,
 };
 } catch (e: unknown) {
 const message = e instanceof Error ? e.message : "Erro desconhecido";
 console.error("[auth] Erro no signUp:", e);
 return {
 success: false,
 message: message.replace(/^Error:\s*/, "").replace(/^Erro no cadastro:\s*/, ""),
 sessionActive: false,
 };
 }
 });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
 try {
 const supabase = await getSSRClient();
 const { error } = await supabase.auth.signOut();

 if (error) {
 throw new Error(error.message);
 }

 // Clear guest session manually using H3-compatible util
 setResponseHeader(
 "Set-Cookie",
 `waesy_guest_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
 getEnvVar("VITE_SITE_URL")?.includes("localhost") ? "" : "; Secure"
 }`,
 );

 return { status: "success" as const };
 } catch (e: unknown) {
 const message = e instanceof Error ? e.message : "Erro desconhecido";
 return { status: "error" as const, message: `Erro ao realizar logout: ${message}` };
 }
});

export const updatePassword = createServerFn({ method: "POST" })
 .validator(ResetPasswordSchema)
 .handler(async ({ data: { password } }) => {
 try {
 const supabase = await getSSRClient();
 const { error } = await supabase.auth.updateUser({
 password,
 });

 if (error) {
 throw new Error(error.message);
 }

 return { status: "success" as const };
 } catch (e: unknown) {
 const message = e instanceof Error ? e.message : "Erro desconhecido";
 throw new Error(`Erro ao atualizar senha: ${message}`);
 }
 });

export const resetPasswordForEmail = createServerFn({ method: "POST" })
 .validator(z.object({ email: z.string().email(), redirectTo: z.string() }))
 .handler(async ({ data: { email, redirectTo } }) => {
 try {
 const request = getRequest();
 const ip = getClientIp(request);

 const rateCheckIp = checkRateLimit(ip, "auth_password_reset");
 if (!rateCheckIp.allowed) {
 throw new Error(
 `Muitas solicitações a partir deste endereço IP. Aguarde ${formatRetryAfter(rateCheckIp.retryAfterSec!)} antes de solicitar novamente.`
 );
 }

 const rateCheckEmail = checkRateLimit(email.toLowerCase().trim(), "auth_password_reset");
 if (!rateCheckEmail.allowed) {
 throw new Error(
 `Muitas solicitações para esta conta. Aguarde ${formatRetryAfter(rateCheckEmail.retryAfterSec!)} antes de solicitar novamente.`
 );
 }

 const supabase = await getSSRClient();
 const { error } = await supabase.auth.resetPasswordForEmail(email, {
 redirectTo,
 });

 if (error) {
 if (error.status === 429) {
 throw new Error(
 "Limite de envio de e-mails atingido. Aguarde 60 minutos antes de solicitar novamente.",
 );
 }
 throw new Error(error.message);
 }
 return { status: "success" as const };
 } catch (e: any) {
 throw new Error(e.message || "Erro ao solicitar redefinição.");
 }
 });

export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
 try {
 let identity: any = null;
 try {
 identity = await getServerIdentity();
 } catch {
 // Não simular usuário em produção. Se falhar, retornar nulo e deixar o front tratar.
 identity = null;
 }

 let user: any = null;
 try {
 const supabase = await getSSRClient();
 const authRes = await supabase.auth.getUser();
 user = authRes?.data?.user || null;
 } catch {
 user = null;
 }

 const effectiveUserId = user?.id || identity?.id;
 // Sem ID real, não há perfil para retornar
 if (!effectiveUserId) return null;

 let profile: any = null;
 try {
 const adminDb = getServerClient();
 const { data: p } = await adminDb
 .from("profiles")
 .select("*")
 .eq("id", effectiveUserId)
 .maybeSingle();
 profile = p;
 } catch (err) {
 console.warn(`[auth] getProfile error for ${effectiveUserId}:`, err);
 }

 let memberships: any[] = [];
 try {
 const adminDb = getServerClient();
 const { data: wsRows, error: wsErr } = await adminDb
 .from("workspace_members")
 .select("store_id, role, stores(id, name, slug, is_active, settings, logo_url)")
 .eq("profile_id", effectiveUserId);

 if (wsErr) {
 console.warn("[auth] Erro ao carregar workspace_members no getProfile:", wsErr.message);
 }

 const seenStoreIds = new Set<string>();

 for (const m of (wsRows || []) as any[]) {
 if (!m.store_id || seenStoreIds.has(m.store_id) || !m.stores) continue;
 seenStoreIds.add(m.store_id);

 const storeObj = (Array.isArray(m.stores) ? m.stores[0] : m.stores) as any;
 if (!storeObj) continue;
 const storeSettings = (storeObj.settings as Record<string, any>) || {};
 memberships.push({
 store_id: m.store_id,
 role: m.role || "owner",
 name: storeObj.name || "Loja",
 slug: storeObj.slug || "",
 logo_url: storeObj.logo_url || storeSettings.logoUrl || storeSettings.logo_url || null,
 status: storeObj.is_active !== false ? "active" : "inactive",
 });
 }
 } catch (e) {
 console.warn("[auth] Erro ao carregar memberships no getProfile:", e);
 }

 const email = user?.email || user?.user_metadata?.email || profile?.email || "";
 const fullName = profile?.full_name || user?.user_metadata?.full_name || "Usuário";

 // Sem email real, perfil incompleto
 if (!email && !profile?.full_name) return null;

 return {
 id: effectiveUserId,
 email,
 fullName,
 phone: profile?.phone || user?.user_metadata?.phone || "",
 role: profile?.role || identity?.role || "platform_admin",
 memberships,
 // Enriched profile fields
 username: profile?.username || "admin",
 avatarUrl: profile?.avatar_url ?? null,
 coverUrl: profile?.cover_url ?? null,
 bio: profile?.bio ?? null,
 occupation: profile?.occupation ?? null,
 city: profile?.city ?? null,
 state: profile?.state ?? null,
 instagram: profile?.instagram ?? null,
 website: profile?.website ?? null,
 cpf: profile?.cpf ?? null,
 birthDate: profile?.birth_date ?? null,
 gender: profile?.gender ?? null,
 newsletterOptIn: profile?.newsletter_opt_in ?? false,
 featuredBannerUrl: profile?.featured_banner_url ?? null,
 featuredBannerLink: profile?.featured_banner_link ?? null,
 biolinks: Array.isArray(profile?.biolinks) ? profile.biolinks : [],
 resume_data: profile?.resume_data ?? {},
 };
 } catch (e) {
 console.error("[auth] Erro fatal em getProfile:", e);
 // Não retornar dados hardcoded em produção — retornar null e deixar o front tratar
 return null;
 }
});

// ---------------------------------------------------------------------------
// CPF validation helper (Módulo 11)
// ---------------------------------------------------------------------------
function isValidCpf(cpf: string): boolean {
 const digits = cpf.replace(/\D/g, "");
 if (digits.length !== 11) return false;
 if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit
 const calcDigit = (d: string, factor: number) =>
 d
 .split("")
 .slice(0, factor - 1)
 .reduce((acc, n, i) => acc + Number(n) * (factor - i), 0) % 11;
 const r1 = calcDigit(digits, 10);
 const r2 = calcDigit(digits, 11);
 const d1 = r1 < 2 ? 0 : 11 - r1;
 const d2 = r2 < 2 ? 0 : 11 - r2;
 return Number(digits[9]) === d1 && Number(digits[10]) === d2;
}

// ---------------------------------------------------------------------------
// _updateProfile(enriched)
// ---------------------------------------------------------------------------

const UpdateProfileSchema = z.object({
 fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
 username: z
 .string()
 .min(3, "Nome de usuário deve ter pelo menos 3 caracteres")
 .max(30, "Nome de usuário deve ter no máximo 30 caracteres")
 .regex(/^[a-z0-9_]+$/, "Nome de usuário deve conter apenas letras minúsculas, números e underline"),
 phone: z.string().max(20).optional().or(z.literal("")),
 avatarUrl: z.string().optional().or(z.literal("")),
 coverUrl: z.string().optional().or(z.literal("")),
 bio: z.string().max(500).optional().or(z.literal("")),
 occupation: z.string().max(100).optional().or(z.literal("")),
 city: z.string().max(100).optional().or(z.literal("")),
 state: z.string().max(20).optional().or(z.literal("")),
 instagram: z.string().max(100).optional().or(z.literal("")),
 website: z.string().max(200).optional().or(z.literal("")),
 cpf: z
 .string()
 .optional()
 .or(z.literal(""))
 .refine((v) => !v || isValidCpf(v), { message: "CPF inválido" }),
 birthDate: z.string().optional().or(z.literal("")), // ISO date string
 gender: z.enum(["feminino", "masculino", "outro", "prefiro_nao_dizer"]).optional(),
 newsletterOptIn: z.boolean().optional(),
 biolinks: z.array(z.object({
 id: z.string(),
 label: z.string(),
 title: z.string().optional(),
 url: z.string(),
 icon: z.string().optional(),
 isHighlight: z.boolean().optional(),
 imageUrl: z.string().optional().or(z.literal("")),
 style: z.string().optional(),
 })).optional(),
 resumeData: z.record(z.any()).optional(),
 featuredBannerUrl: z.string().optional().or(z.literal("")),
 featuredBannerLink: z.string().optional().or(z.literal("")),
 isAnonymous: z.boolean().optional(),
 privacyMode: z.enum(["public", "unlisted", "private"]).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function _updateProfile(data: UpdateProfileInput) {
 const supabase = await getSSRClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) throw new Error("Não autorizado");

 // Update Supabase Auth metadata
 const { error: authError } = await supabase.auth.updateUser({
 data: { full_name: data.fullName },
 });
 if (authError) throw new Error(authError.message);

 // Build profile update payload — only include defined fields
 const cleanUsername = data.username
 ? data.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "")
 : user.email ? user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") : `user_${user.id.slice(0, 6)}`;

 // 1. Reivindicação atômica do Handle para evitar squatting e registrar histórico
 try {
 const { error: claimErr } = await getServerClient().rpc('claim_handle_atomic', {
 p_profile_id: user.id,
 p_new_handle: cleanUsername
 });
 if (claimErr) throw new Error(claimErr.message);
 } catch (claimErr) {
 console.error("[auth] Erro ao reivindicar handle:", claimErr);
 throw new Error(claimErr instanceof Error ? claimErr.message : "Erro ao reservar username.");
 }

 // 2. Atualiza metadados no Supabase Auth para refletir na sessão de imediato
 try {
 await supabase.auth.updateUser({
 data: {
 full_name: data.fullName,
 username: cleanUsername,
 avatar_url: data.avatarUrl || undefined,
 },
 });
 } catch (authErr) {
 console.warn("[auth] updateUser auth metadata warning:", authErr);
 }

 // 3. Prepara payload com ID para UPSERT atômico (garante persistência mesmo que a linha não existisse)
 const profileUpdate: Record<string, unknown> = {
 id: user.id,
 full_name: data.fullName,
 username: cleanUsername,
 updated_at: new Date().toISOString(),
 };

 if (data.phone !== undefined) profileUpdate.phone = data.phone || null;
 if (data.avatarUrl !== undefined) profileUpdate.avatar_url = data.avatarUrl || null;
 if (data.coverUrl !== undefined) profileUpdate.cover_url = data.coverUrl || null;
 if (data.bio !== undefined) profileUpdate.bio = data.bio || null;
 if (data.occupation !== undefined) profileUpdate.occupation = data.occupation || null;
 if (data.city !== undefined) profileUpdate.city = data.city || null;
 if (data.state !== undefined) profileUpdate.state = data.state || null;
 if (data.instagram !== undefined) profileUpdate.instagram = data.instagram || null;
 if (data.website !== undefined) profileUpdate.website = data.website || null;
 if (data.cpf !== undefined) profileUpdate.cpf = data.cpf || null;
 if (data.birthDate !== undefined) profileUpdate.birth_date = data.birthDate || null;
 if (data.gender !== undefined) profileUpdate.gender = data.gender;
 if (data.newsletterOptIn !== undefined) profileUpdate.newsletter_opt_in = data.newsletterOptIn;
 if (data.biolinks !== undefined) profileUpdate.biolinks = data.biolinks;
 if (data.resumeData !== undefined) profileUpdate.resume_data = data.resumeData;
 if (data.featuredBannerUrl !== undefined) profileUpdate.featured_banner_url = data.featuredBannerUrl || null;
 if (data.featuredBannerLink !== undefined) profileUpdate.featured_banner_link = data.featuredBannerLink || null;
 if (data.isAnonymous !== undefined) profileUpdate.is_anonymous = data.isAnonymous;
 if (data.privacyMode !== undefined) profileUpdate.privacy_mode = data.privacyMode;

 // Realiza UPSERT no Supabase com onConflict id
 const { error: dbError } = await supabase
 .from("profiles")
 .upsert(profileUpdate, { onConflict: "id" });

 if (dbError) {
 console.error("[auth] Erro ao gravar perfil em profiles:", dbError);
 // Tentativa de update direto caso upsert tenha restrição de schema
 const { error: fallbackErr } = await supabase
 .from("profiles")
 .update(profileUpdate)
 .eq("id", user.id);
 if (fallbackErr) throw new Error(dbError.message || fallbackErr.message);
 }

 return { status: "success" as const };
}

export const updateProfile = createServerFn({ method: "POST" })
 .validator(UpdateProfileSchema)
 .handler(async ({ data }) => _updateProfile(data));

// ---------------------------------------------------------------------------
// requestAccountDeletion — LGPD Art. 18 right to erasure
// ---------------------------------------------------------------------------

export const requestAccountDeletion = createServerFn({ method: "POST" }).handler(async () => {
 const supabase = await getSSRClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) throw new Error("Não autorizado");

 const db = getServerClient(); // service-role needed to delete auth user

 // 1. Anonymize personal data in profiles (keep row for FK integrity with orders)
 const { error: anonError } = await db
 .from("profiles")
 .update({
 full_name: "Usuário Excluído",
 phone: null,
 avatar_url: null,
 cpf: null,
 birth_date: null,
 gender: null,
 newsletter_opt_in: false,
 deletion_requested_at: new Date().toISOString(),
 deleted_at: new Date().toISOString(),
 })
 .eq("id", user.id);

 if (anonError) throw new Error("Falha ao anonimizar dados: " + anonError.message);

 // 2. Write audit log
 await db.from("account_deletion_log").insert({
 profile_id: user.id,
 requested_at: new Date().toISOString(),
 completed_at: new Date().toISOString(),
 reason: "Solicitado pelo próprio usuário via /conta/perfil",
 created_by: user.id,
 });

 // 3. Delete from Supabase Auth (hard delete — invalidates all sessions)
 const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
 if (deleteError) throw new Error("Falha ao remover conta: " + deleteError.message);

 return { status: "deleted" as const };
});

// ---------------------------------------------------------------------------
// Painel de Segurança & Auditoria de Sessões Avançada
// ---------------------------------------------------------------------------

/**
 * Retorna os últimos eventos de login e segurança do usuário autenticado.
 */
export const getUserSecurityAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autorizado");

 const db = getServerClient();
 const { data, error } = await db
 .from("session_audit_logs")
 .select("id, event_type, ip_address, country_code, city, device_type, is_datacenter, threat_score, risk_score, risk_flags, metadata, created_at")
 .eq("profile_id", identity.id)
 .order("created_at", { ascending: false })
 .limit(30);

 if (error) {
 console.error("[auth] Erro ao buscar session_audit_logs:", error);
 return [];
 }

 return data || [];
});

/**
 * Retorna os dispositivos registrados e conhecidos do usuário autenticado.
 */
export const getUserRegisteredDevices = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autorizado");

 const db = getServerClient();
 const { data, error } = await db
 .from("device_registry")
 .select("id, device_fingerprint, device_name, device_type, country_code, city, ip_address, is_trusted, last_seen_at, first_seen_at")
 .eq("profile_id", identity.id)
 .order("last_seen_at", { ascending: false });

 if (error) {
 console.error("[auth] Erro ao buscar device_registry:", error);
 return [];
 }

 return data || [];
});

/**
 * Revoga / desconecta um dispositivo registrado.
 */
export const revokeUserDevice = createServerFn({ method: "POST" })
 .validator(z.object({ deviceId: z.string().uuid() }))
 .handler(async ({ data: { deviceId } }) => {
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autorizado");

 const db = getServerClient();
 const { error } = await db
 .from("device_registry")
 .delete()
 .eq("id", deviceId)
 .eq("profile_id", identity.id);

 if (error) throw new Error("Falha ao revogar dispositivo: " + error.message);

 // Registra evento de revogação
 let request: Request | null = null;
 try { request = getRequest(); } catch {}
 await recordAuthAuditEvent({
 profileId: identity.id,
 eventType: "session_revoked",
 request,
 metadata: { revokedDeviceId: deviceId },
 });

 return { status: "success" as const };
 });

/**
 * Marca um dispositivo como confiável pelo usuário.
 */
export const trustUserDevice = createServerFn({ method: "POST" })
 .validator(z.object({ deviceId: z.string().uuid() }))
 .handler(async ({ data: { deviceId } }) => {
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autorizado");

 const db = getServerClient();
 const { error } = await db
 .from("device_registry")
 .update({ is_trusted: true })
 .eq("id", deviceId)
 .eq("profile_id", identity.id);

 if (error) throw new Error("Falha ao confiar no dispositivo: " + error.message);

 return { status: "success" as const };
 });

/**
 * Visão Geral de Segurança para o Admin Master (Platform Admin).
 * Retorna estatísticas de risco, logins recentes globais e eventos suspeitos.
 */
export const getAdminSecurityOverview = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (identity.role !== "platform_admin" && identity.role !== "master") {
 throw new Error("Acesso restrito ao Administrador Master da Plataforma.");
 }

 const db = getServerClient();

 // 1. Últimos 50 eventos de autenticação globais
 const { data: recentEvents } = await db
 .from("session_audit_logs")
 .select(`
 id, event_type, ip_address, country_code, city, device_type,
 is_datacenter, threat_score, risk_score, risk_flags, metadata, created_at,
 profiles:profile_id (id, full_name, username)
 `)
 .order("created_at", { ascending: false })
 .limit(50);

 // 2. Eventos de alto risco (risk_score >= 40)
 const { data: highRiskEvents } = await db
 .from("session_audit_logs")
 .select(`
 id, event_type, ip_address, country_code, city, device_type,
 is_datacenter, threat_score, risk_score, risk_flags, metadata, created_at,
 profiles:profile_id (id, full_name, username)
 `)
 .gte("risk_score", 40)
 .order("created_at", { ascending: false })
 .limit(20);

 // 3. Contagem de falhas de login recentes
 const { count: failedLoginsCount } = await db
 .from("session_audit_logs")
 .select("id", { count: "exact", head: true })
 .eq("event_type", "login_failed");

 // 4. Contagem de logins com sucesso
 const { count: successLoginsCount } = await db
 .from("session_audit_logs")
 .select("id", { count: "exact", head: true })
 .eq("event_type", "login_success");

 return {
 recentEvents: recentEvents || [],
 highRiskEvents: highRiskEvents || [],
 stats: {
 totalFailed: failedLoginsCount || 0,
 totalSuccess: successLoginsCount || 0,
 highRiskCount: highRiskEvents?.length || 0,
 },
 };
});
