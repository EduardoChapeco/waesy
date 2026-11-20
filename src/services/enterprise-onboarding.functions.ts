/**
 * src/services/enterprise-onboarding.functions.ts
 *
 * BFF Server Functions para Onboarding Corporativo Autônomo e Desacoplado.
 * Permite cadastrar organização, negócio e titular como proprietário (owner)
 * com governança Zero-Trust, validação legal estrita (CPF, Maioridade, CNPJ)
 * sem necessidade prévia de conta de consumidor civil.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest, getResponseHeaders, setCookie } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, getSSRClient, clearIdentityCache } from "@/lib/server-access";
import { resolveUniqueStoreSlug } from "@/lib/slug-utils";
import {
  cleanDocument,
  validateCpfMod11,
  validateCnpjMod11,
  validateBirthDate,
} from "@/lib/document-validator";
import { resolveCanonicalCookieDomain } from "@/lib/auth-cookie-sanitizer";
import { resolveSubsystemBySlug, resolveSubsystemFromHost } from "@/lib/vertical-subsystems";

export const registerEnterpriseOnboardingSchema = z.object({
  // Dados do Titular / Responsável Legal
  fullName: z
    .string()
    .min(3, "Nome completo deve ter pelo menos 3 caracteres")
    .max(120, "Nome completo muito longo"),
  cpf: z.string().min(11, "CPF deve ter no mínimo 11 dígitos"),
  birthDate: z.string().min(8, "Data de nascimento é obrigatória"),
  phone: z.string().min(10, "Telefone com DDD é obrigatório"),
  email: z.string().email("E-mail corporativo válido é obrigatório"),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),

  // Dados do Negócio / Empresa
  tradeName: z
    .string()
    .min(2, "Nome fantasia deve ter no mínimo 2 caracteres")
    .max(100, "Nome fantasia muito longo"),
  corporateName: z.string().max(140).optional().or(z.literal("")),
  cnpj: z.string().optional().or(z.literal("")),
  niche: z.string().min(2, "Selecione o segmento de atuação do seu negócio"),
  vertical: z.string().max(60).optional().or(z.literal("")),
  brandOrigin: z.string().max(60).optional().or(z.literal("")),
  verticalSku: z.string().max(60).optional().or(z.literal("")),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado (UF) é obrigatório").max(2),
  address: z.string().max(200).optional().or(z.literal("")),
});

export type RegisterEnterpriseOnboardingInput = z.infer<
  typeof registerEnterpriseOnboardingSchema
>;

export const registerEnterpriseOnboardingFn = createServerFn({ method: "POST" })
  .validator(registerEnterpriseOnboardingSchema)
  .handler(async ({ data }) => {
    let resHeaders: Headers | undefined;
    let cookieDomain: string | undefined;
    try {
      const core: any = await import("@tanstack/start-server-core");
      if (typeof core?.getResponseHeaders === "function") {
        resHeaders = core.getResponseHeaders() as unknown as Headers;
      }
      const reqHost = core?.getRequestHeader?.("host") || "";
      cookieDomain = resolveCanonicalCookieDomain(reqHost);
    } catch {
      resHeaders = undefined;
      cookieDomain = undefined;
    }

    const adminDb = getServerClient();
    const isProd = process.env.NODE_ENV === "production";

    // 1. Validação Legal do Titular
    const cleanCpf = cleanDocument(data.cpf);
    if (!cleanCpf || !validateCpfMod11(cleanCpf)) {
      throw new Error("CPF do responsável legal inválido. Verifique os dígitos informados.");
    }

    const birthCheck = validateBirthDate(data.birthDate, { minAge: 18 });
    if (!birthCheck.isValid) {
      throw new Error(
        birthCheck.error || "O responsável legal deve ser maior de 18 anos para registrar a empresa."
      );
    }

    const cleanCnpj = cleanDocument(data.cnpj);
    if (cleanCnpj && cleanCnpj.length > 0) {
      if (!validateCnpjMod11(cleanCnpj)) {
        throw new Error("CNPJ inválido. Verifique o número informado.");
      }
    }

    const cleanPhone = cleanDocument(data.phone);

    // 2. Identificação ou Criação do Titular (Zero-Trust Auth)
    let identity: any = null;
    try {
      identity = await getServerIdentity();
    } catch {
      identity = null;
    }

    let userId = identity?.id || null;
    let newSessionTokens: { access_token: string; refresh_token: string } | null = null;

    if (!userId) {
      // Usuário não autenticado: cadastra ou autentica titular diretamente
      const cleanEmail = data.email.trim().toLowerCase();
      if (!data.password || data.password.length < 6) {
        throw new Error("Defina uma senha de acesso de no mínimo 6 caracteres para sua empresa.");
      }

      // Checa se e-mail já existe no Auth
      const { data: userLookup } = await adminDb.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } }));
      const existingAuthUser = (userLookup?.users || []).find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (existingAuthUser) {
        // Tenta autenticar com a senha informada
        const supabase = await getSSRClient(resHeaders);
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: data.password,
        });

        if (signInErr || !signInData.user) {
          throw new Error(
            "Este e-mail corporativo já possui conta no Waesy. Digite sua senha correta para prosseguir com o credenciamento da empresa."
          );
        }
        userId = signInData.user.id;
        if (signInData.session) {
          newSessionTokens = {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          };
        }
      } else {
        // Cria usuário corporativo diretamente
        const { data: created, error: createErr } = await adminDb.auth.admin.createUser({
          email: cleanEmail,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            full_name: data.fullName.trim(),
            cpf: cleanCpf,
            role: "owner",
          },
        });

        if (createErr || !created.user) {
          throw new Error("Falha ao registrar credencial corporativa: " + (createErr?.message || "Erro desconhecido."));
        }
        userId = created.user.id;

        // Autentica via SSR client para persistir cookies de sessão do novo usuário
        const supabase = await getSSRClient(resHeaders);
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: data.password,
        });
        if (signInData?.session) {
          newSessionTokens = {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          };
        }
      }
    }

    if (!userId) {
      throw new Error("Não foi possível resolver a identidade do responsável legal.");
    }

    // 3. Garantir Perfil do Titular Atualizado no Postgres (profiles)
    await adminDb.from("profiles").upsert(
      {
        id: userId,
        full_name: data.fullName.trim(),
        cpf: cleanCpf,
        phone: cleanPhone || null,
        birth_date: data.birthDate,
        role: "owner",
      },
      { onConflict: "id" }
    );

    // 4. Resolver slug único para a nova loja
    const storeSlug = await resolveUniqueStoreSlug(adminDb, data.tradeName);

    // 5. Criar Organização
    const { data: org, error: orgError } = await adminDb
      .from("organizations")
      .insert({
        name: data.corporateName?.trim() || data.tradeName.trim(),
        slug: storeSlug,
        cnpj: cleanCnpj || null,
        status: "active",
      })
      .select("id")
      .single();

    if (orgError || !org) {
      console.error("[registerEnterpriseOnboardingFn] Erro ao criar organização:", orgError);
      throw new Error("Não foi possível registrar a organização: " + (orgError?.message || ""));
    }

    // 6. Montar Settings e Criar Loja com isolamento estrito de plano/vertical
    const resolvedSub =
      resolveSubsystemBySlug(data.vertical) || resolveSubsystemBySlug(data.niche);
    const resolvedBrandOrigin =
      data.brandOrigin?.trim() ||
      resolvedSub?.brandVerticalId ||
      resolvedSub?.id ||
      (data.niche === "talk" ? "talk" : data.niche === "copilot" ? "waesy_copilot" : "waesy");
    const resolvedVerticalSku =
      data.verticalSku?.trim() ||
      resolvedSub?.defaultVerticalSku ||
      (data.niche === "pro" ? "waesy_bundle_pro" : undefined);
    const resolvedPrimaryNiche =
      resolvedSub?.primaryNicheId || data.niche;
    const isAllInOnePro =
      resolvedVerticalSku === "waesy_bundle_pro" ||
      resolvedBrandOrigin === "waesy_studio" ||
      resolvedBrandOrigin === "pro" ||
      data.vertical === "pro" ||
      data.niche === "pro";
    const resolvedTier = isAllInOnePro ? "pro" : "starter";

    const settings = {
      type: data.niche,
      segment: resolvedPrimaryNiche,
      category: data.niche,
      niche: data.niche,
      primary_niche_id: resolvedPrimaryNiche,
      brand_origin: resolvedBrandOrigin,
      vertical_sku: resolvedVerticalSku,
      subscription_tier: resolvedTier,
      trade_name: data.tradeName.trim(),
      corporate_name: data.corporateName?.trim() || data.tradeName.trim(),
      created_by: userId,
      created_via: "enterprise_onboarding_autonomous",
    };

    const storePayload = {
      organization_id: org.id,
      name: data.tradeName.trim(),
      slug: storeSlug,
      cnpj: cleanCnpj || null,
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      address: data.address?.trim() || null,
      phone: cleanPhone || null,
      email: data.email.trim(),
      brand_origin: resolvedBrandOrigin,
      settings,
      context_profile_id: userId,
      is_active: true,
      approval_status: "approved",
    };

    const { data: store, error: storeError } = await adminDb
      .from("stores")
      .insert(storePayload)
      .select("id, name, slug")
      .single();

    if (storeError || !store) {
      console.error("[registerEnterpriseOnboardingFn] Erro ao criar loja. Rollback:", storeError);
      await adminDb.from("organizations").delete().eq("id", org.id);
      throw new Error("Não foi possível criar o espaço de trabalho da loja: " + (storeError?.message || ""));
    }

    // 7. Vincular Titular como Owner em workspace_members com Rollback Atômico
    const { error: memberError } = await adminDb.from("workspace_members").upsert(
      {
        profile_id: userId,
        user_id: userId,
        store_id: store.id,
        role: "owner",
        is_active: true,
      },
      { onConflict: "profile_id,store_id" }
    );

    if (memberError) {
      console.error("[registerEnterpriseOnboardingFn] Rollback membership:", memberError);
      await adminDb.from("stores").delete().eq("id", store.id);
      await adminDb.from("organizations").delete().eq("id", org.id);
      throw new Error("Falha ao registrar permissões de proprietário do espaço: " + memberError.message);
    }

    // 8. Escrever Cookies de Contexto e Ativação Imediata do Workspace
    const writeCookieHeader = (name: string, value: string, maxAge: number) => {
      try {
        setCookie(name, value, {
          path: "/",
          maxAge,
          httpOnly: false,
          secure: isProd,
          sameSite: "lax",
          ...(cookieDomain ? { domain: cookieDomain } : {}),
        });
      } catch {
        try {
          resHeaders?.append(
            "Set-Cookie",
            `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${cookieDomain ? `; Domain=${cookieDomain}` : ""}${isProd ? "; Secure" : ""}`
          );
        } catch {
          // Fallback silencioso
        }
      }
    };

    const maxAgeMonth = 60 * 60 * 24 * 30;
    writeCookieHeader("waesy_active_context", "store", maxAgeMonth);
    writeCookieHeader("waesy_active_tenant", store.id, maxAgeMonth);
    writeCookieHeader("waesy_store_id", store.id, maxAgeMonth);
    writeCookieHeader("waesy_active_creator", "", 0);

    try {
      await clearIdentityCache();
    } catch {
      // Ignorado
    }

    return {
      success: true,
      store_id: store.id,
      storeName: store.name,
      slug: store.slug,
      redirectUrl: "/workspace",
      session: newSessionTokens,
    };
  });
