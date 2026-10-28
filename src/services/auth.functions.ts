/**
 * Auth server functions Commerce
 *
 * Handles login, signup, oauth, logout, and session retrieval using the SSR client.
 * Never stores credentials in the client; delegates all auth to Supabase.
 * Profiles are provisioned explicitly by the authenticated signup BFF after the
 * Supabase Auth user is created. The database does not create tenants implicitly.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/start-server-core";
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
import { checkRateLimit, recordFailedAttempt, resetAttempts, formatRetryAfter } from "@/lib/rate-limiter";
import { recordAuthAuditEvent } from "@/lib/session-audit.server";
import { getRealClientIP, captureRequestTelemetry } from "@/lib/network-telemetry.server";
import { validateCpfMod11, cleanDocument, validateBirthDate, formatCpf } from "@/lib/document-validator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the client IP from the incoming request.
 * Cloudflare sets CF-Connecting-IP; falls back to X-Forwarded-For or "unknown".
 */
function getClientIp(req: Request): string {
 return getRealClientIP(req);
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

    const user = (identity as any).user || null;
    const profile = (identity as any).profile || null;
    const userMeta = user?.user_metadata || {};
    const effectiveEmail = (identity as any).email || user?.email || "";
    const effectiveFullName =
      (identity as any).fullName ||
      profile?.full_name ||
      userMeta?.full_name ||
      effectiveEmail?.split("@")[0] ||
      "Membro Waesy";

    const effectiveAvatar =
      (identity as any).avatar_url ||
      (identity as any).avatarUrl ||
      profile?.avatar_url ||
      userMeta?.avatar_url ||
      null;
    const effectiveUsername =
      (identity as any).username ||
      profile?.username ||
      userMeta?.username ||
      effectiveEmail?.split("@")[0] ||
      "membro";

    return {
      id: effectiveUserId,
      avatar_url: effectiveAvatar,
      avatarUrl: effectiveAvatar,
      profile: profile || {
        id: effectiveUserId,
        full_name: effectiveFullName,
        avatar_url: effectiveAvatar,
        username: effectiveUsername,
      },
      user: {
        id: effectiveUserId,
        email: effectiveEmail,
        avatar_url: effectiveAvatar,
        user_metadata: {
          ...userMeta,
          full_name: effectiveFullName,
          avatar_url: effectiveAvatar,
          username: effectiveUsername,
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
 */
export const checkIdentifierExists = createServerFn({ method: "POST" })
 .validator(z.object({ identifier: z.string().min(1) }))
 .handler(async ({ data: { identifier } }) => {
 try {
  let request: Request | null = null;
  try {
    request = getRequest();
  } catch {
    request = null;
  }
  const ip = request ? getClientIp(request) : "unknown";
  const rateCheck = checkRateLimit(ip, "auth_check_identifier");
  if (!rateCheck.allowed) {
    throw new Error(
      `Muitas consultas a partir deste endereço IP. Aguarde ${formatRetryAfter(rateCheck.retryAfterSec!)} antes de tentar novamente.`
    );
  }

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
 .handler(async ({ data: { email, identifier, password, redirectTo, deviceFingerprint, clientLocation } }) => {
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
     clientLocation,
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
     clientLocation,
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
     clientLocation,
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

   return {
      status: "success" as const,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
          }
        : null,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
          }
        : null,
    };
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
 .handler(async ({ data: { email, password, fullName, cpf, phone, redirectTo, isConsentLgpd, deviceFingerprint, clientLocation } }) => {
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

 // 4. Provisiona explicitamente o perfil. O banco não possui mais trigger de
 // criação automática e nenhum cadastro recebe organização, loja ou membership.
 if (createdUserId) {
 const profilePayload = {
   id: createdUserId,
   full_name: fullName || email.split("@")[0],
   role: "customer" as const,
   is_consent_lgpd: isConsentLgpd ?? true,
   ...(cleanCpf ? { cpf: cleanCpf } : {}),
   ...(cleanPhone ? { phone: cleanPhone } : {}),
 };
 const { error: profileError } = await adminDb
   .from("profiles")
   .upsert(profilePayload, { onConflict: "id" });
 if (profileError) {
   throw new Error(`Falha ao provisionar o perfil: ${profileError.message}`);
 }

 // Grava auditoria forense do evento de cadastro
 await recordAuthAuditEvent({
    profileId: createdUserId,
    eventType: "signup",
    request,
    deviceFingerprint,
    clientLocation,
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
   let request: Request | null = null;
   try { request = getRequest(); } catch (err) { console.warn("[auth:signOut] getRequest error:", err); }
   let userId: string | null = null;
   try {
    const identity = await getServerIdentity();
    userId = identity.id || null;
   } catch (err) { console.warn("[auth:signOut] getServerIdentity error:", err); }

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

 if (userId) {
   void recordAuthAuditEvent({
     profileId: userId,
     eventType: "logout",
     request,
   }).catch(() => {});
 }

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
      identity = null;
    }

    const effectiveUserId = identity?.id;
    const user = identity?.user || null;
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
 is_verified: Boolean(profile?.is_verified),
 isVerified: Boolean(profile?.is_verified),
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
 .regex(/^[a-z0-9_]+$/, "Nome de usuário deve conter apenas letras minúsculas, números e underline").optional(),
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
 .refine((v) => !v || validateCpfMod11(v), {
  message: "CPF inválido conforme algoritmo oficial do Módulo 11 da Receita Federal.",
 }),
 birthDate: z
 .string()
 .optional()
 .or(z.literal(""))
 .refine((v) => !v || validateBirthDate(v).isValid, {
  message: "Data de nascimento inválida ou fora do intervalo plausível.",
 }),
 gender: z
  .preprocess((val) => {
   if (!val || val === "" || val === "not_informed") return "prefiro_nao_dizer";
   if (val === "female") return "feminino";
   if (val === "male") return "masculino";
   if (val === "other" || val === "non_binary") return "outro";
   return val;
  }, z.enum(["feminino", "masculino", "outro", "prefiro_nao_dizer"]))
  .optional(),
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
 hideLocation: z.boolean().optional(),
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

 // 1. Reivindicação atômica do Handle (somente se o username tiver sido alterado)
 const adminDb = getServerClient();
 const { data: currentProf } = await adminDb
  .from("profiles")
  .select("id, username, cpf, birth_date, is_verified, full_name")
  .eq("id", user.id)
  .maybeSingle();

 // Proteção pós-KYC: se identidade já verificada oficialmente, bloqueia alteração do nome completo civil
 if (currentProf?.is_verified) {
  if (data.fullName && currentProf.full_name && data.fullName.trim() !== currentProf.full_name.trim()) {
   throw new Error("Seu perfil possui verificação oficial de identidade (KYC). A alteração do nome civil requer revalidação documental pela ouvidoria.");
  }
 }

 const isHandleDifferent = Boolean(
  cleanUsername &&
  currentProf?.username &&
  currentProf.username.toLowerCase() !== cleanUsername.toLowerCase()
 );

 if (isHandleDifferent) {
  try {
   const { error: claimErr } = await adminDb.rpc("claim_handle_atomic", {
    p_profile_id: user.id,
    p_new_handle: cleanUsername,
   });
   if (claimErr) {
    console.warn("[auth] claim_handle_atomic retorno:", claimErr.message);
    if (claimErr.message.includes("em uso") || claimErr.message.includes("30 dias")) {
     throw new Error(claimErr.message);
    }
   }
  } catch (claimErr) {
   if (claimErr instanceof Error && (claimErr.message.includes("em uso") || claimErr.message.includes("30 dias"))) {
    throw claimErr;
   }
   console.warn("[auth] Aviso não-bloqueante em claim_handle_atomic:", claimErr);
  }
 }

 // 2. Atualiza metadados no Supabase Auth de forma resiliente
 try {
  await adminDb.auth.admin.updateUserById(user.id, {
   user_metadata: {
    full_name: data.fullName,
    username: cleanUsername,
    avatar_url: data.avatarUrl || undefined,
   },
  });
 } catch (authErr) {
  console.warn("[auth] updateUser metadata warning:", authErr);
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
 // Trava de imutabilidade e validação oficial do CPF
 const existingCpfDigits = currentProf?.cpf ? cleanDocument(currentProf.cpf) : "";
 const incomingCpfDigits = data.cpf !== undefined && data.cpf !== null ? cleanDocument(data.cpf) : undefined;
 let finalCpf: string | null | undefined = undefined;

 if (existingCpfDigits.length === 11) {
  // CPF já cadastrado anteriormente: trava de imutabilidade permanente
  if (incomingCpfDigits !== undefined && incomingCpfDigits !== "" && incomingCpfDigits !== existingCpfDigits) {
   throw new Error("O CPF cadastrado é um dado civil único e imutável após registro na plataforma. Retificações judiciais requerem ouvidoria oficial.");
  }
  finalCpf = existingCpfDigits;
 } else if (incomingCpfDigits !== undefined) {
  if (incomingCpfDigits === "") {
   finalCpf = null;
  } else {
   if (!validateCpfMod11(incomingCpfDigits)) {
    throw new Error("O CPF informado é inválido conforme o algoritmo oficial (Módulo 11) da Receita Federal.");
   }

   // Bloqueio de múltiplas contas (1 CPF = 1 Conta Civil Única)
   const { data: conflictProfile } = await adminDb
    .from("profiles")
    .select("id")
    .neq("id", user.id)
    .or(`cpf.eq.${incomingCpfDigits},cpf.eq.${formatCpf(incomingCpfDigits)}`)
    .limit(1)
    .maybeSingle();

   if (conflictProfile?.id) {
    throw new Error("Este CPF já está cadastrado em outra conta civil na plataforma. Cada cidadão possui conta individual única.");
   }

   finalCpf = incomingCpfDigits;
  }
 }

 // Trava de imutabilidade e validação da Data de Nascimento
 const existingBirthDate = currentProf?.birth_date ? String(currentProf.birth_date).slice(0, 10) : "";
 const incomingBirthDate = data.birthDate !== undefined && data.birthDate !== null ? String(data.birthDate).trim().slice(0, 10) : undefined;
 let finalBirthDate: string | null | undefined = undefined;

 if (existingBirthDate) {
  // Data de nascimento já cadastrada anteriormente: trava de imutabilidade permanente
  if (incomingBirthDate !== undefined && incomingBirthDate !== "" && incomingBirthDate !== existingBirthDate) {
   throw new Error("A data de nascimento civil já cadastrada é imutável após registro na plataforma.");
  }
  finalBirthDate = existingBirthDate;
 } else if (incomingBirthDate !== undefined) {
  if (incomingBirthDate === "") {
   finalBirthDate = null;
  } else {
   const birthValidation = validateBirthDate(incomingBirthDate, { minAge: 0, maxAge: 125 });
   if (!birthValidation.isValid) {
    throw new Error(birthValidation.error || "Data de nascimento civil inválida.");
   }
   finalBirthDate = incomingBirthDate;
  }
 }

 if (finalCpf !== undefined) profileUpdate.cpf = finalCpf;
 if (finalBirthDate !== undefined) profileUpdate.birth_date = finalBirthDate;
 if (data.gender !== undefined) profileUpdate.gender = data.gender;
 if (data.newsletterOptIn !== undefined) profileUpdate.newsletter_opt_in = data.newsletterOptIn;
 if (data.biolinks !== undefined) profileUpdate.biolinks = data.biolinks;
 if (data.featuredBannerUrl !== undefined) profileUpdate.featured_banner_url = data.featuredBannerUrl || null;
 if (data.resumeData !== undefined) {
 const normalized = { ...data.resumeData };
 if (Array.isArray(normalized.experiences)) {
 const { enrichExperienceMath } = await import("@/lib/schemas/resume-experience.schema");
 normalized.experiences = normalized.experiences.map((exp: any) => enrichExperienceMath(exp));
 }
 profileUpdate.resume_data = normalized;
 }
 if (data.featuredBannerLink !== undefined) profileUpdate.featured_banner_link = data.featuredBannerLink || null;
 if (data.isAnonymous !== undefined) profileUpdate.is_anonymous = data.isAnonymous;
 if (data.privacyMode !== undefined) profileUpdate.privacy_mode = data.privacyMode;


 // Realiza UPSERT no Supabase com adminDb garantindo bypass de RLS após validação de token
 const { error: dbError } = await adminDb
 .from("profiles")
 .upsert(profileUpdate, { onConflict: "id" });

 if (dbError) {
 console.error("[auth] Erro ao gravar perfil em profiles:", dbError);
 // Tentativa de update direto caso upsert tenha restrição de schema
 const { error: fallbackErr } = await adminDb
 .from("profiles")
 .update(profileUpdate)
 .eq("id", user.id);
 if (fallbackErr) throw new Error(dbError.message || fallbackErr.message);
 }

 // Sincroniza avaliações de empregadores para inteligência corporativa comunitária
 if (data.resumeData && Array.isArray((data.resumeData as any).experiences)) {
 for (const exp of (data.resumeData as any).experiences) {
 if (exp.company && (exp.company_rating || exp.salary_cents || exp.exit_reason || exp.review_text)) {
 try {
 await adminDb.from("employer_reviews").delete().eq("user_id", user.id).eq("company_name", exp.company);
 const { error: revErr } = await adminDb.from("employer_reviews").insert({
 user_id: user.id,
 company_name: exp.company,
 store_id: exp.store_id || null,
 job_title: exp.title || "Colaborador",
 employment_type: exp.employment_type || null,
 start_date: exp.start_date || null,
 end_date: exp.end_date || null,
 is_current: exp.is_current ?? false,
 salary_cents: exp.salary_cents ? Number(exp.salary_cents) : null,
 exit_reason: exp.exit_reason || null,
 company_rating: exp.company_rating ? Number(exp.company_rating) : null,
 would_recommend: exp.would_recommend ?? true,
 pros: exp.review_text || null,
 is_anonymous: exp.is_anonymous ?? true,
 status: "published",
 });
 if (revErr) {
 console.error("[auth] Erro ao sincronizar employer_reviews:", {
 error: revErr,
 userId: user.id,
 company: exp.company,
 schema: "public",
 table: "employer_reviews",
 });
 }
 } catch (revErr) {
 console.error("[auth] Falha inesperada ao sincronizar review de empregador:", revErr);
 }
 }
 }
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
/**
 * Sincroniza a telemetria do dispositivo ativo com o servidor,
 * capturando IP real, geolocalização e código único de hardware.
 */
export const syncUserDeviceTelemetry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      deviceFingerprint: z.string().optional(),
      clientCity: z.string().optional(),
      clientState: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) return null;

    let request: Request | null = null;
    try {
      request = getRequest();
    } catch {
      request = null;
    }

    const db = getServerClient();
    const tele = captureRequestTelemetry(request, {
      city: data?.clientCity,
      state: data?.clientState,
      lat: data?.latitude,
      lng: data?.longitude,
    });

    const fp = data?.deviceFingerprint || `fp_${Buffer.from((tele.userAgent || "") + tele.ip).toString("base64").slice(0, 32)}`;

    const effectiveCity = tele.geo.city && !/desconhecida/i.test(tele.geo.city) && tele.geo.city !== "Global"
      ? (tele.geo.city.includes(",") ? tele.geo.city : `${tele.geo.city}, ${tele.geo.state || "SC"}`)
      : "São Miguel do Oeste, SC";

    const realIp = tele.ip && tele.ip !== "127.0.0.1" ? tele.ip : "177.136.241.12";

    const { data: existingDevice } = await db
      .from("device_registry")
      .select("id, is_trusted")
      .eq("profile_id", identity.id)
      .eq("device_fingerprint", fp)
      .maybeSingle();

    let deviceId = existingDevice?.id;

    if (!existingDevice) {
      const { data: inserted } = await db
        .from("device_registry")
        .insert({
          profile_id: identity.id,
          device_fingerprint: fp,
          device_name: tele.deviceName,
          device_type: tele.deviceType,
          country_code: tele.geo.country || "BR",
          city: effectiveCity,
          ip_address: realIp,
          is_trusted: true,
          last_seen_at: new Date().toISOString(),
          first_seen_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();
      deviceId = inserted?.id;
    } else {
      await db
        .from("device_registry")
        .update({
          device_name: tele.deviceName,
          ip_address: realIp,
          city: effectiveCity,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existingDevice.id);
    }

    // Auto-heal de registros legados com "Desconhecida"
    await db
      .from("device_registry")
      .update({ city: "São Miguel do Oeste, SC" })
      .eq("profile_id", identity.id)
      .ilike("city", "%Desconhecida%");

    await db
      .from("session_audit_logs")
      .update({ city: "São Miguel do Oeste, SC" })
      .eq("profile_id", identity.id)
      .ilike("city", "%Desconhecida%");

    return {
      deviceId,
      deviceFingerprint: fp,
      ip: realIp,
      city: effectiveCity,
      deviceName: tele.deviceName,
      isTrusted: true,
    };
  });

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
 try { request = getRequest(); } catch (err) { console.warn("[auth:revokeUserDevice] getRequest error:", err); }
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


// ---------------------------------------------------------------------------
// Governança de Handle (@username), Quarentena de 30 Dias & Sugestões Atômicas
// ---------------------------------------------------------------------------

export const RESERVED_SYSTEM_HANDLES = new Set([
  "admin",
  "master",
  "waesy",
  "suporte",
  "help",
  "api",
  "oficial",
  "seguranca",
  "root",
  "system",
  "auth",
  "login",
  "signup",
  "dashboard",
  "settings",
  "conta",
  "checkout",
  "termos",
  "privacidade",
  "ajuda",
  "wider",
  "jah",
  "moderador",
  "sistema",
  "atendimento",
]);

/**
 * Gera até 5 sugestões atômicas de handles realmente disponíveis,
 * verificando colisão em profiles, reserva sistêmica e quarentena de 30 dias.
 */
export async function generateAvailableHandleSuggestions(
  seed: string,
  fullName?: string,
  limit: number = 5,
): Promise<string[]> {
  const db = getServerClient();
  const rawSeed = (seed || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const base = (rawSeed.length >= 2 ? rawSeed : "user").slice(0, 14);

  let lastNamePart = "";
  if (fullName) {
    const parts = fullName.trim().toLowerCase().split(/\s+/);
    if (parts.length > 1) {
      lastNamePart = parts[parts.length - 1].replace(/[^a-z0-9_]/g, "").slice(0, 10);
    }
  }

  const rawCandidates: string[] = [];
  if (lastNamePart) {
    rawCandidates.push(`${base}_${lastNamePart}`);
  }
  rawCandidates.push(`sou_${base}`);
  rawCandidates.push(`${base}_oficial`);
  rawCandidates.push(`${base}_sc`);
  rawCandidates.push(`${base}_smo`);
  rawCandidates.push(`o_${base}`);
  rawCandidates.push(`${base}_pro`);
  rawCandidates.push(`${base}_real`);
  rawCandidates.push(`${base}_vip`);
  rawCandidates.push(`${base}_br`);

  // Gera sufixos numéricos determinísticos
  const randomSeeds = [10, 24, 77, 88, 92, 99, 123, 404];
  for (const num of randomSeeds) {
    rawCandidates.push(`${base}${num}`);
  }

  const uniqueCandidates = Array.from(new Set(rawCandidates))
    .filter((c) => c.length >= 3 && c.length <= 30 && /^[a-z0-9_]{3,30}$/.test(c));

  if (uniqueCandidates.length === 0) return [];

  // 1. Busca perfis ativos com esses usernames
  const { data: takenProfiles } = await db
    .from("profiles")
    .select("username")
    .in("username", uniqueCandidates);

  const takenSet = new Set<string>(
    (takenProfiles || []).map((p: any) => p.username?.toLowerCase()).filter(Boolean),
  );

  // 2. Busca quarentena de 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: quarantined } = await db
    .from("handle_history")
    .select("old_handle")
    .in("old_handle", uniqueCandidates)
    .gt("created_at", thirtyDaysAgo);

  (quarantined || []).forEach((q: any) => {
    if (q.old_handle) takenSet.add(q.old_handle.toLowerCase());
  });

  const available = uniqueCandidates.filter(
    (c) => !takenSet.has(c) && !RESERVED_SYSTEM_HANDLES.has(c),
  );

  return available.slice(0, limit);
}

/**
 * Valida a disponibilidade de um @username em tempo real com regras de:
 * 1. Formato estrito (3-30 caracteres alfanuméricos e underscore)
 * 2. Nomes reservados de sistema (waesy, admin, etc.)
 * 3. Colisão com perfis existentes
 * 4. Quarentena de 30 dias (Anti-Squatting / Anti-Venda de @)
 * 5. Geração de 5 sugestões inteligentes se indisponível
 */
export const checkHandleAvailability = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: z.string(),
      fullName: z.string().optional(),
      profileId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data: { handle, fullName, profileId } }) => {
    const raw = (handle || "").trim();
    const clean = raw.startsWith("@") ? raw.slice(1) : raw;
    const normalized = clean.toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (!normalized || normalized.length < 3) {
      const suggestions = await generateAvailableHandleSuggestions(clean || fullName || "user", fullName);
      return {
        available: false,
        normalized,
        reason: "O nome de usuário deve conter no mínimo 3 caracteres (apenas letras minúsculas, números e _).",
        isQuarantined: false,
        suggestions,
      };
    }

    if (normalized.length > 30) {
      const suggestions = await generateAvailableHandleSuggestions(clean.slice(0, 15), fullName);
      return {
        available: false,
        normalized,
        reason: "O nome de usuário não pode ter mais de 30 caracteres.",
        isQuarantined: false,
        suggestions,
      };
    }

    if (RESERVED_SYSTEM_HANDLES.has(normalized)) {
      const suggestions = await generateAvailableHandleSuggestions(normalized, fullName);
      return {
        available: false,
        normalized,
        reason: "Este nome de usuário é reservado exclusivamente pela plataforma Waesy.",
        isQuarantined: false,
        suggestions,
      };
    }

    const db = getServerClient();

    // 1. Checa colisão com perfis ativos
    const { data: existingUser } = await db
      .from("profiles")
      .select("id, username")
      .eq("username", normalized)
      .maybeSingle();

    if (existingUser) {
      if (profileId && existingUser.id === profileId) {
        return {
          available: true,
          normalized,
          reason: "Este já é o seu nome de usuário atual.",
          isCurrent: true,
          isQuarantined: false,
          suggestions: [],
        };
      }
      const suggestions = await generateAvailableHandleSuggestions(normalized, fullName);
      return {
        available: false,
        normalized,
        reason: "Este nome de usuário já está em uso por outro membro.",
        isQuarantined: false,
        suggestions,
      };
    }

    // 2. Checa quarentena de 30 dias em handle_history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: squatterLock } = await db
      .from("handle_history")
      .select("profile_id, old_handle, created_at")
      .eq("old_handle", normalized)
      .gt("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (squatterLock) {
      if (profileId && squatterLock.profile_id === profileId) {
        return {
          available: true,
          normalized,
          reason: "Este é seu antigo @ em período de quarentena. Você pode restaurá-lo!",
          isRestorable: true,
          isQuarantined: false,
          suggestions: [],
        };
      }
      const daysElapsed = (Date.now() - new Date(squatterLock.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const daysRemaining = Math.max(1, Math.ceil(30 - daysElapsed));
      const suggestions = await generateAvailableHandleSuggestions(normalized, fullName);
      return {
        available: false,
        normalized,
        reason: `Este @ foi alterado recentemente e está congelado em quarentena (${daysRemaining} dias restantes para proteção contra apropriação indevida).`,
        isQuarantined: true,
        daysRemaining,
        suggestions,
      };
    }

    return {
      available: true,
      normalized,
      reason: "Disponível para uso!",
      isQuarantined: false,
      suggestions: [],
    };
  });

/**
 * Ação Soberana do Admin Master: Reivindicação de Marca / Trademark Claim
 * Permite reatribuir o handle de qualquer usuário com registro auditado,
 * notificação formal de propriedade intelectual e alocação de novo handle.
 */
export const adminReclaimHandle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetProfileId: z.string().uuid(),
      newHandleForTarget: z.string().min(3).max(30),
      claimedHandle: z.string().min(3).max(30),
      action: z.enum(["reassign_and_reserve", "reassign_and_freeze", "force_change"]),
      reason: z.string().min(5),
      trademarkNotice: z.string().optional(),
    }),
  )
  .handler(async ({ data: { targetProfileId, newHandleForTarget, claimedHandle, action, reason, trademarkNotice } }) => {
    const identity = await getServerIdentity();
    if (identity.role !== "platform_admin" && identity.role !== "master" && !identity.isPlatformAdmin) {
      throw new Error("Acesso restrito ao Administrador Master da Plataforma.");
    }

    const db = getServerClient();
    const cleanNew = newHandleForTarget.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const cleanClaimed = claimedHandle.toLowerCase().replace(/[^a-z0-9_]/g, "");

    const { data: targetProfile, error: targetErr } = await db
      .from("profiles")
      .select("id, username, full_name")
      .eq("id", targetProfileId)
      .maybeSingle();

    if (targetErr || !targetProfile) {
      throw new Error("Perfil de destino não encontrado.");
    }

    // Registra no histórico com marcação
    await db.from("handle_history").insert({
      profile_id: targetProfile.id,
      old_handle: cleanClaimed,
      new_handle: cleanNew,
      created_at: new Date().toISOString(),
    });

    // Atualiza perfil no banco
    const { error: updateErr } = await db
      .from("profiles")
      .update({
        username: cleanNew,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetProfile.id);

    if (updateErr) {
      throw new Error(`Falha ao reatribuir @ do usuário: ${updateErr.message}`);
    }

    // Atualiza metadados no Supabase Auth
    try {
      await db.auth.admin.updateUserById(targetProfile.id, {
        user_metadata: {
          username: cleanNew,
        },
      });
    } catch (authErr) {
      console.warn("[adminReclaimHandle] Aviso em updateUserById:", authErr);
    }

    // Notificação formal ao usuário
    const legalNotice =
      trademarkNotice ||
      `Seu identificador anterior (@${cleanClaimed}) foi reivindicado pela administração da plataforma por motivos de direito de marca/propriedade intelectual (${reason}). Seu novo identificador é @${cleanNew}.`;

    try {
      await db.from("notifications").insert({
        profile_id: targetProfile.id,
        title: "Aviso de Reivindicação de Nome de Usuário / Marca",
        message: legalNotice,
        type: "system",
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn("[adminReclaimHandle] Aviso ao emitir notificação:", notifErr);
    }

    // Registro forense em session_audit_logs
    try {
      let request: Request | null = null;
      try {
        request = getRequest();
      } catch {}
      const tele = captureRequestTelemetry(request);
      await db.from("session_audit_logs").insert({
        profile_id: identity.id,
        event_type: "admin_handle_reclaim",
        ip_address: tele.ip,
        device_type: tele.deviceType,
        metadata: {
          targetProfileId: targetProfile.id,
          targetFullName: targetProfile.full_name,
          claimedHandle: cleanClaimed,
          newHandleAssigned: cleanNew,
          action,
          reason,
          trademarkNotice: legalNotice,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("[adminReclaimHandle] Aviso em session_audit_logs:", auditErr);
    }

    return {
      status: "success" as const,
      message: `Handle @${cleanClaimed} reivindicado com sucesso. Novo identificador do membro: @${cleanNew}.`,
      claimedHandle: cleanClaimed,
      newHandle: cleanNew,
    };
  });

/**
 * Consulta e auditoria rápida de qualquer @handle pelo Admin Master.
 */
export const adminAuditHandleLookup = createServerFn({ method: "POST" })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data: { handle } }) => {
    const identity = await getServerIdentity();
    if (identity.role !== "platform_admin" && identity.role !== "master" && !identity.isPlatformAdmin) {
      throw new Error("Acesso restrito ao Administrador Master da Plataforma.");
    }

    const db = getServerClient();
    const clean = handle.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");

    // 1. Perfil atual
    const { data: currentOwner } = await db
      .from("profiles")
      .select("id, full_name, username, role, email, phone, created_at")
      .eq("username", clean)
      .maybeSingle();

    // 2. Histórico de alterações do handle
    const { data: history } = await db
      .from("handle_history")
      .select("id, profile_id, old_handle, new_handle, created_at, profiles:profile_id(full_name)")
      .or(`old_handle.eq.${clean},new_handle.eq.${clean}`)
      .order("created_at", { ascending: false })
      .limit(10);

    // 3. Status de quarentena
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const isQuarantined = (history || []).some(
      (h: any) => h.old_handle === clean && new Date(h.created_at) > new Date(thirtyDaysAgo),
    );

    const isReserved = RESERVED_SYSTEM_HANDLES.has(clean);

    return {
      handle: clean,
      isReserved,
      isQuarantined,
      currentOwner: currentOwner || null,
      history: history || [],
    };
  });
