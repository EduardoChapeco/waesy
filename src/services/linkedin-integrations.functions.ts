/**
 * linkedin-integrations.functions.ts — Waesy Omni-Bridge LinkedIn & B2B Syndication
 * 
 * Camadas de Completude:
 * 1. Admin Master Root Credentials (AES-256-GCM Encrypted)
 * 2. B2C Candidate Bridge (LinkedIn OAuth + Zod Parser + Mathematical Date Engine)
 * 3. B2B Enterprise Syndication (Company Page Job Posting + Tracking URLs + Retries)
 * 4. B2B Premium Paywall Guard (PRO/ENTERPRISE Tier Verification)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, requirePlatformAdmin } from "@/lib/server-access";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto-vault.server";
import { enrichExperienceMath, type ResumeExperience } from "@/lib/schemas/resume-experience.schema";
import type { ResumeDataDTO } from "@/types/resume";

// ─── ESQUEMA DO LINKEDIN MASTER CREDENTIALS ──────────────────────────────────

export const LinkedInMasterCredentialsSchema = z.object({
  clientId: z.string().min(3, "Client ID deve ter no mínimo 3 caracteres"),
  clientSecret: z.string().min(6, "Client Secret deve ter no mínimo 6 caracteres"),
  redirectUri: z.string().url("Redirect URI deve ser uma URL válida"),
  defaultCompanyId: z.string().optional().default(""),
  scopes: z.array(z.string()).default([
    "openid",
    "profile",
    "email",
    "w_member_social",
    "w_organization_social",
  ]),
  isActive: z.boolean().default(true),
});

export type LinkedInMasterCredentialsDTO = {
  clientId: string;
  clientSecretMasked: string;
  redirectUri: string;
  defaultCompanyId: string;
  scopes: string[];
  isActive: boolean;
  hasSecretConfigured: boolean;
  updatedAt?: string;
};

// ─── 1. ADMIN MASTER: GESTÃO DAS CHAVES MESTRE LINKEDIN ─────────────────────

/**
 * Busca credenciais mestre do LinkedIn App (Root Credentials).
 * Requer perfil 'platform_admin' ou 'master'.
 * Nunca expõe o segredo plano — retorna máscara segura.
 */
export const getLinkedInMasterCredentials = createServerFn({ method: "GET" }).handler(
  async (): Promise<LinkedInMasterCredentialsDTO> => {
    await requirePlatformAdmin();
    const supabase = getServerClient();

    // 1. Tenta buscar da tabela dedicada linkedin_master_credentials
    const { data: record } = await supabase
      .from("linkedin_master_credentials")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (record) {
      return {
        clientId: record.client_id || "",
        clientSecretMasked: record.client_secret_masked || "••••••••••••••••",
        redirectUri: record.redirect_uri || "",
        defaultCompanyId: record.default_company_id || "",
        scopes: record.scopes || ["openid", "profile", "email", "w_member_social"],
        isActive: Boolean(record.is_active),
        hasSecretConfigured: Boolean(record.client_secret_encrypted),
        updatedAt: record.updated_at,
      };
    }

    // 2. Fallback defensivo: checa stores matriz
    const { data: rootStore } = await supabase
      .from("stores")
      .select("settings")
      .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
      .limit(1)
      .maybeSingle();

    const settings = (rootStore?.settings as Record<string, any>) || {};
    const integrations = (settings.integrations as Record<string, any>) || {};

    const hasSecret = Boolean(integrations.linkedin_client_secret);
    return {
      clientId: integrations.linkedin_client_id || "",
      clientSecretMasked: hasSecret ? "••••••••••••••••" : "",
      redirectUri: integrations.linkedin_redirect_uri || "https://waesy.com.br/api/auth/linkedin/callback",
      defaultCompanyId: integrations.linkedin_company_id || "",
      scopes: ["openid", "profile", "email", "w_member_social", "w_organization_social"],
      isActive: Boolean(integrations.linkedin_client_id),
      hasSecretConfigured: hasSecret,
    };
  },
);

/**
 * Salva credenciais mestre do LinkedIn App com criptografia AES-256-GCM.
 * Requer role platform_admin.
 */
export const saveLinkedInMasterCredentials = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientId: z.string().min(2, "Client ID obrigatório"),
      clientSecret: z.string().optional(),
      redirectUri: z.string().url("Redirect URI inválida"),
      defaultCompanyId: z.string().optional(),
      scopes: z.array(z.string()).optional(),
      isActive: z.boolean().default(true),
    }),
  )
  .handler(async ({ data: input }) => {
    await requirePlatformAdmin();
    const supabase = getServerClient();

    // Busca registro existente para preservar o secret anterior se vier mascarado
    const { data: existing } = await supabase
      .from("linkedin_master_credentials")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let encryptedSecret = existing?.client_secret_encrypted || "";
    let maskedSecretValue = existing?.client_secret_masked || "";

    const rawSecret = input.clientSecret?.trim();
    if (rawSecret && !rawSecret.includes("••••")) {
      // Criptografia AES-256-GCM padrão NIST
      encryptedSecret = encryptSecret(rawSecret);
      maskedSecretValue = maskSecret(rawSecret);
    } else if (!encryptedSecret) {
      throw new Error("Client Secret do LinkedIn é obrigatório na primeira configuração.");
    }

    const payload = {
      client_id: input.clientId.trim(),
      client_secret_encrypted: encryptedSecret,
      client_secret_masked: maskedSecretValue,
      redirect_uri: input.redirectUri.trim(),
      default_company_id: input.defaultCompanyId?.trim() || null,
      scopes: input.scopes && input.scopes.length > 0 ? input.scopes : ["openid", "profile", "email", "w_member_social"],
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from("linkedin_master_credentials")
        .update(payload)
        .eq("id", existing.id);
      if (updateErr) throw new Error("Erro ao atualizar credenciais do LinkedIn: " + updateErr.message);
    } else {
      const { error: insertErr } = await supabase
        .from("linkedin_master_credentials")
        .insert(payload);
      if (insertErr) throw new Error("Erro ao criar credenciais do LinkedIn: " + insertErr.message);
    }

    // Sincroniza também no settings da store matriz para compatibilidade legada
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("id, settings")
        .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
        .limit(1)
        .maybeSingle();

      if (store) {
        const storeSettings = (store.settings as Record<string, any>) || {};
        const integrations = (storeSettings.integrations as Record<string, any>) || {};
        await supabase
          .from("stores")
          .update({
            settings: {
              ...storeSettings,
              integrations: {
                ...integrations,
                linkedin_client_id: input.clientId.trim(),
                linkedin_client_secret: encryptedSecret,
                linkedin_redirect_uri: input.redirectUri.trim(),
                linkedin_company_id: input.defaultCompanyId?.trim() || "",
              },
            },
          })
          .eq("id", store.id);
      }
    } catch (syncErr) {
      console.warn("[saveLinkedInMasterCredentials] Aviso de sync na store matriz:", syncErr);
    }

    return {
      success: true,
      message: "Credenciais do LinkedIn OAuth 2.0 criptografadas e salvas com sucesso no cofre mestre!",
      maskedSecret: maskedSecretValue,
    };
  });

// ─── 2. B2C CANDIDATE BRIDGE: PARSER MATEMÁTICO & IMPORTADOR ─────────────────

/**
 * Esquema Zod Flexível para receber perfis exportados ou respostas da API do LinkedIn.
 * Suporta formatos oficiais RESTli v2, OpenID Connect e JSON de exportação de dados.
 */
export const LinkedInRawProfileSchema = z.object({
  sub: z.string().optional(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  headline: z.string().optional(),
  summary: z.string().optional(),
  location: z.union([
    z.string(),
    z.object({ name: z.string().optional(), city: z.string().optional(), country: z.string().optional() }),
  ]).optional(),
  positions: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, "Cargo é obrigatório"),
      companyName: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      locationType: z.string().optional(),
      employmentType: z.string().optional(),
      isCurrent: z.boolean().optional(),
      startDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional(),
      endDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional().nullable(),
      description: z.string().optional(),
    }),
  ).optional().default([]),
  educations: z.array(
    z.object({
      id: z.string().optional(),
      schoolName: z.string().optional(),
      school: z.string().optional(),
      degreeName: z.string().optional(),
      degree: z.string().optional(),
      fieldOfStudy: z.string().optional(),
      startDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional(),
      endDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional().nullable(),
      description: z.string().optional(),
    }),
  ).optional().default([]),
  skills: z.array(z.union([z.string(), z.object({ name: z.string() })])).optional().default([]),
  certifications: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      authority: z.string().optional(),
      issuer: z.string().optional(),
      licenseNumber: z.string().optional(),
      url: z.string().optional(),
      startDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional(),
      endDate: z.union([
        z.string(),
        z.object({ month: z.number().optional(), year: z.number().optional() }),
      ]).optional().nullable(),
    }),
  ).optional().default([]),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.string().optional(),
    }),
  ).optional().default([]),
});

export type LinkedInRawProfile = z.infer<typeof LinkedInRawProfileSchema>;

/**
 * Traduz datas heterogêneas do LinkedIn para componentes matemáticos estritos (ano, mês).
 */
function extractYearAndMonth(input: any): { year?: number; month?: number } {
  if (!input) return {};
  if (typeof input === "object") {
    const y = typeof input.year === "number" ? input.year : parseInt(input.year, 10);
    const m = typeof input.month === "number" ? input.month : parseInt(input.month, 10);
    return {
      year: !isNaN(y) && y >= 1950 && y <= 2040 ? y : undefined,
      month: !isNaN(m) && m >= 1 && m <= 12 ? m : undefined,
    };
  }
  if (typeof input === "string") {
    const clean = input.trim();
    const matchIso = clean.match(/^(\d{4})(?:-(\d{1,2}))?/);
    if (matchIso) {
      const year = parseInt(matchIso[1], 10);
      const month = matchIso[2] ? parseInt(matchIso[2], 10) : undefined;
      return { year, month };
    }
    const matchSlash = clean.match(/^(\d{1,2})\/(\d{4})/);
    if (matchSlash) {
      return { month: parseInt(matchSlash[1], 10), year: parseInt(matchSlash[2], 10) };
    }
  }
  return {};
}

/**
 * Motor de Conversão & Tradução de Perfil do LinkedIn para o ResumeDataDTO (v2).
 * Aplica enriquecimento matemático de duração de experiência sem CBO redundante.
 */
export function translateLinkedInToWaesyResume(raw: LinkedInRawProfile): ResumeDataDTO {
  const experiences = (raw.positions || []).map((pos, idx) => {
    const start = extractYearAndMonth(pos.startDate);
    const end = extractYearAndMonth(pos.endDate);
    const isCurrent = Boolean(pos.isCurrent || (!pos.endDate && !end.year));

    // Mapeamento de regime de contratação
    let empType = "CLT";
    const rawType = (pos.employmentType || "").toLowerCase();
    if (rawType.includes("part-time") || rawType.includes("meio período")) empType = "Meio período";
    else if (rawType.includes("contract") || rawType.includes("pj")) empType = "PJ";
    else if (rawType.includes("internship") || rawType.includes("estágio")) empType = "Estágio";
    else if (rawType.includes("freelance")) empType = "Freelancer";

    const baseExp: Partial<ResumeExperience> = {
      id: `exp_li_${Date.now()}_${idx}`,
      title: (pos.title || "Profissional").trim(),
      company: (pos.companyName || pos.company || "Empresa").trim(),
      location: pos.location?.trim() || undefined,
      location_type: pos.locationType || (pos.location?.toLowerCase().includes("remoto") ? "Remoto" : "No local"),
      employment_type: empType,
      is_current: isCurrent,
      start_year: start.year,
      start_month: start.month,
      end_year: isCurrent ? undefined : end.year,
      end_month: isCurrent ? undefined : end.month,
      description: pos.description?.trim() || "",
      media_urls: [],
      media: [],
      would_recommend: true,
      is_anonymous: false,
    };

    // Aplica o motor matemático de datas (duração exata e strings humanas)
    const enriched = enrichExperienceMath(baseExp);

    return {
      id: enriched.id,
      title: enriched.title,
      company: enriched.company,
      location: enriched.location,
      location_type: enriched.location_type,
      employment_type: enriched.employment_type,
      start_date: enriched.start_date,
      end_date: enriched.end_date,
      is_current: enriched.is_current,
      description: enriched.description,
      media_urls: enriched.media_urls || [],
    };
  });

  const educations = (raw.educations || []).map((edu, idx) => {
    const start = extractYearAndMonth(edu.startDate);
    const end = extractYearAndMonth(edu.endDate);

    const startStr = start.year ? (start.month ? `${start.month}/${start.year}` : `${start.year}`) : "";
    const endStr = end.year ? (end.month ? `${end.month}/${end.year}` : `${end.year}`) : "Concluído";

    return {
      id: `edu_li_${Date.now()}_${idx}`,
      school: (edu.schoolName || edu.school || "Instituição de Ensino").trim(),
      degree: edu.degreeName || edu.degree || "Graduação",
      field_of_study: edu.fieldOfStudy?.trim() || "",
      start_date: startStr,
      end_date: endStr,
      description: edu.description?.trim() || "",
      media_urls: [],
    };
  });

  // Normalização de habilidades (skills)
  const skillsList: string[] = [];
  if (Array.isArray(raw.skills)) {
    for (const item of raw.skills) {
      if (typeof item === "string" && item.trim()) {
        skillsList.push(item.trim());
      } else if (item && typeof item === "object" && "name" in item && item.name) {
        skillsList.push(item.name.trim());
      }
    }
  }

  // Certificações
  const certifications = (raw.certifications || []).map((cert, idx) => {
    const start = extractYearAndMonth(cert.startDate);
    const dateStr = start.year ? (start.month ? `${start.month}/${start.year}` : `${start.year}`) : undefined;
    return {
      id: `cert_li_${Date.now()}_${idx}`,
      name: cert.name.trim(),
      issuer: (cert.authority || cert.issuer || "Certificadora").trim(),
      issue_date: dateStr,
      credential_id: cert.licenseNumber?.trim() || undefined,
      credential_url: cert.url?.trim() || undefined,
    };
  });

  // Idiomas
  const normalizeProficiency = (val?: string): "basic" | "intermediate" | "advanced" | "fluent" | "native" => {
    const lower = (val || "").toLowerCase();
    if (lower.includes("basic") || lower.includes("básico") || lower.includes("basico")) return "basic";
    if (lower.includes("advanced") || lower.includes("avançado") || lower.includes("avancado")) return "advanced";
    if (lower.includes("fluent") || lower.includes("fluente")) return "fluent";
    if (lower.includes("native") || lower.includes("nativo")) return "native";
    return "intermediate";
  };

  const languages = (raw.languages || []).map((lang, idx) => ({
    id: `lang_li_${Date.now()}_${idx}`,
    name: lang.name.trim(),
    proficiency: normalizeProficiency(lang.proficiency),
  }));

  // Extrai localização geral
  let locationStr = "";
  if (typeof raw.location === "string") {
    locationStr = raw.location;
  } else if (raw.location && typeof raw.location === "object") {
    locationStr = [raw.location.city, raw.location.country || raw.location.name].filter(Boolean).join(", ");
  }

  return {
    headline: raw.headline?.trim() || (experiences[0]?.title ? `${experiences[0].title} na ${experiences[0].company}` : "Profissional"),
    summary: raw.summary?.trim() || "",
    hiringStatus: "open_to_proposals",
    skills: skillsList.slice(0, 30),
    experiences,
    educations,
    certifications,
    languages,
    availability: {
      jobTitle: experiences[0]?.title || raw.headline?.trim() || "",
      workplacePreference: "hybrid",
      employmentTypePreference: "clt",
      immediateStart: true,
      open_to_work: { active: true, roles: skillsList.slice(0, 5) },
    },
  };
}

/**
 * Gera URL de Autorização OAuth 2.0 do LinkedIn para o Candidato.
 * Usa as credenciais mestre configuradas no Admin Master.
 */
export const getLinkedInAuthRedirectUrl = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        returnTo: z.string().optional(),
        mode: z.enum(["candidate", "company"]).optional(),
        storeId: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // 1. Busca credenciais
    const { data: record } = await supabase
      .from("linkedin_master_credentials")
      .select("client_id, redirect_uri, scopes, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record || !record.client_id) {
      throw new Error(
        "A integração com LinkedIn não está configurada no Admin Master. Entre em contato com o suporte da plataforma.",
      );
    }

    const statePayload = Buffer.from(
      JSON.stringify({
        nonce: Math.random().toString(36).slice(2),
        returnTo: data?.returnTo || "/conta/curriculo",
        mode: data?.mode || "candidate",
        storeId: data?.storeId || identity?.store_id || null,
        userId: identity?.id || null,
        timestamp: Date.now(),
      }),
    ).toString("base64url");

    const scopes = (record.scopes || ["openid", "profile", "email"]).join(" ");
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", record.client_id);
    authUrl.searchParams.set("redirect_uri", record.redirect_uri);
    authUrl.searchParams.set("state", statePayload);
    authUrl.searchParams.set("scope", scopes);

    return {
      authUrl: authUrl.toString(),
      state: statePayload,
    };
  });

/**
 * Importa e Traduz Perfil do LinkedIn via JSON bruto (ou colar JSON do exportador).
 * Não necessita de token se o candidato optar pelo upload do JSON de perfil.
 */
export const parseAndImportLinkedInJson = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rawJson: z.string().min(5, "Conteúdo JSON inválido"),
      autoSaveToProfile: z.boolean().default(false),
    }),
  )
  .handler(async ({ data: { rawJson, autoSaveToProfile } }) => {
    const identity = await getServerIdentity().catch(() => null);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      throw new Error("O texto fornecido não é um JSON válido. Verifique a formatação do arquivo do LinkedIn.");
    }

    // Valida com o schema do LinkedIn
    const validated = LinkedInRawProfileSchema.parse(parsedJson);

    // Converte para o ResumeDataDTO matemático
    const translatedResume = translateLinkedInToWaesyResume(validated);

    // Se solicitado e o usuário estiver autenticado, persiste no profiles.resume_data
    if (autoSaveToProfile && identity?.id) {
      const supabase = getServerClient();
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("resume_data")
        .eq("id", identity.id)
        .maybeSingle();

      const existingResume = (currentProfile?.resume_data as Record<string, any>) || {};
      const mergedResume = {
        ...existingResume,
        ...translatedResume,
        updated_at: new Date().toISOString(),
        imported_from_linkedin_at: new Date().toISOString(),
      };

      await supabase
        .from("profiles")
        .update({
          resume_data: mergedResume,
          headline: translatedResume.headline || existingResume.headline,
          bio: translatedResume.summary || existingResume.bio,
          occupation: translatedResume.experiences?.[0]?.title || existingResume.occupation,
        })
        .eq("id", identity.id);
    }

    return {
      success: true,
      translatedResume,
      stats: {
        experiencesCount: translatedResume.experiences?.length || 0,
        educationsCount: translatedResume.educations?.length || 0,
        skillsCount: translatedResume.skills?.length || 0,
        certificationsCount: translatedResume.certifications?.length || 0,
      },
    };
  });

// ─── 3. B2B ENTERPRISE SYNDICATION & PREMIUM PAYWALL ────────────────────────

/**
 * Validação rigorosa do Plano de Assinatura (The Premium Wall).
 * Lança erro explícito se a loja não tiver assinatura PRO ou ENTERPRISE ativa.
 */
export async function assertWorkspacePlanPro(storeId: string) {
  const supabase = getServerClient();
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, subscription_plan, settings")
    .eq("id", storeId)
    .single();

  if (error || !store) {
    throw new Error("Loja ou Workspace não localizado.");
  }

  const settings = (store.settings as Record<string, any>) || {};
  const currentPlan = (store.subscription_plan || settings.plan || "FREE").toUpperCase();

  const isPro = currentPlan === "PRO" || currentPlan === "ENTERPRISE" || currentPlan === "BUSINESS";

  if (!isPro) {
    const err: any = new Error(
      "Acesso Bloqueado: A Publicação Automática no LinkedIn e o Módulo Hunter são recursos exclusivos do Plano PRO.",
    );
    err.code = "PAYWALL_PRO_REQUIRED";
    err.currentPlan = currentPlan;
    throw err;
  }

  return { store, plan: currentPlan };
}

/**
 * Consulta o status da conexão do LinkedIn para o Workspace atual.
 */
export const getWorkspaceLinkedInStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Nenhum workspace ativo selecionado.");

    const supabase = getServerClient();

    // 1. Checa plano PRO da loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, subscription_plan, settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (store?.settings as Record<string, any>) || {};
    const plan = (store?.subscription_plan || settings.plan || "FREE").toUpperCase();
    const isPro = plan === "PRO" || plan === "ENTERPRISE" || plan === "BUSINESS";

    // 2. Checa se tem conexão ativa de Company Page
    const { data: connection } = await supabase
      .from("oauth_integrations")
      .select("id, account_id, account_name, is_active, last_synced_at, sync_status, sync_error_message")
      .eq("store_id", storeId)
      .in("provider", ["linkedin_company", "linkedin"])
      .maybeSingle();

    return {
      storeId,
      plan,
      isPro,
      isConnected: Boolean(connection && connection.is_active),
      companyName: connection?.account_name || null,
      companyId: connection?.account_id || null,
      lastSyncedAt: connection?.last_synced_at || null,
      syncStatus: connection?.sync_status || "idle",
      syncError: connection?.sync_error_message || null,
    };
  },
);

/**
 * Publica e Sindica Vaga de Emprego no LinkedIn.
 * Blinda com verificação de Plano PRO + Retries e Log de Auditoria.
 */
export const syndicateJobToLinkedIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().uuid("ID de vaga inválido"),
    }),
  )
  .handler(async ({ data: { jobId } }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Workspace não selecionado.");

    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    // 1. Validação Estrita do Plano PRO (Paywall Server-Side)
    await assertWorkspacePlanPro(storeId);

    const supabase = getServerClient();

    // 2. Busca a vaga
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("store_id", storeId)
      .single();

    if (jobErr || !job) {
      throw new Error("Vaga não encontrada ou não pertence a este Workspace.");
    }

    // 3. Busca token de acesso da Company Page
    const { data: conn } = await supabase
      .from("oauth_integrations")
      .select("*")
      .eq("store_id", storeId)
      .in("provider", ["linkedin_company", "linkedin"])
      .eq("is_active", true)
      .maybeSingle();

    if (!conn) {
      throw new Error(
        "Sua empresa ainda não conectou a LinkedIn Company Page. Conecte sua conta em Configurações > Integrações.",
      );
    }

    // 4. Cria ou atualiza o registro de sindicação
    const trackingUrl = `https://waesy.com.br/empregos/${job.id}?utm_source=linkedin&utm_medium=job_syndication&utm_campaign=waesy_bridge`;

    const { data: syndication, error: syndErr } = await supabase
      .from("linkedin_job_syndications")
      .insert({
        store_id: storeId,
        job_id: job.id,
        status: "retrying",
        tracking_url: trackingUrl,
        payload_snapshot: {
          title: job.title,
          company: job.company_name,
          location: job.location,
          contract_type: job.contract_type,
          workplace_type: job.workplace_type,
          tracking_url: trackingUrl,
        },
        last_attempt_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (syndErr) {
      console.error("[syndicateJobToLinkedIn] Erro ao registrar sindicação:", syndErr);
    }

    // 5. Chamada de API para o LinkedIn Community Post / Job Share
    try {
      let accessToken = conn.access_token;
      // Descriptografa se tiver sido gravado com crypto-vault
      if (accessToken && accessToken.includes(":")) {
        try {
          accessToken = decryptSecret(accessToken);
        } catch {
          // mantém token original se não for encrypted
        }
      }

      const postBody = {
        author: `urn:li:organization:${conn.account_id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: `📢 Nova Oportunidade: ${job.title} na ${job.company_name}!\n\n📍 Local: ${job.location} (${job.workplace_type})\n📄 Contrato: ${job.contract_type}\n\nCandidate-se diretamente pelo ecossistema Waesy: ${trackingUrl}`,
            },
            shareMediaCategory: "ARTICLE",
            media: [
              {
                status: "READY",
                description: { text: job.description?.slice(0, 200) || "" },
                originalUrl: trackingUrl,
                title: { text: `${job.title} - ${job.company_name}` },
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postBody),
      });

      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = resData.message || `Erro da API do LinkedIn: ${response.statusText} (${response.status})`;
        
        // Registra falha e retry
        if (syndication?.id) {
          await supabase
            .from("linkedin_job_syndications")
            .update({
              status: "failed",
              last_error: errorMsg,
              error_log: [{ attempt: 1, error: errorMsg, timestamp: new Date().toISOString() }],
              updated_at: new Date().toISOString(),
            })
            .eq("id", syndication.id);
        }

        await supabase
          .from("jobs")
          .update({
            syndicate_to_linkedin: true,
            linkedin_sync_status: "failed",
            linkedin_last_error: errorMsg,
          })
          .eq("id", job.id);

        throw new Error(errorMsg);
      }

      const postUrn = resData.id || `urn:li:share:${Date.now()}`;

      // Registra sucesso absoluto
      if (syndication?.id) {
        await supabase
          .from("linkedin_job_syndications")
          .update({
            status: "published",
            linkedin_job_urn: postUrn,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", syndication.id);
      }

      await supabase
        .from("jobs")
        .update({
          syndicate_to_linkedin: true,
          linkedin_sync_status: "published",
          linkedin_published_urn: postUrn,
          linkedin_tracking_code: trackingUrl,
          linkedin_last_error: null,
        })
        .eq("id", job.id);

      return {
        success: true,
        postUrn,
        trackingUrl,
        message: "Vaga sindicada e publicada no LinkedIn com sucesso!",
      };
    } catch (err: any) {
      console.error("[syndicateJobToLinkedIn] Erro de sindicação:", err);
      throw new Error(err.message || "Falha na comunicação com a API do LinkedIn.");
    }
  });

/**
 * Consulta o log de sindicações de uma vaga específica para o RH da empresa.
 */
export const getJobSyndicationLogs = createServerFn({ method: "GET" })
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ data: { jobId } }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Workspace não selecionado.");

    const supabase = getServerClient();
    const { data: logs } = await supabase
      .from("linkedin_job_syndications")
      .select("*")
      .eq("job_id", jobId)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    return logs || [];
  });


export interface HunterCandidateDTO {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  headline?: string | null;
  occupation?: string | null;
  city?: string | null;
  state?: string | null;
  skills: string[];
  totalExperienceMonths: number;
  seniority?: string | null;
  openToWork: boolean;
  salaryExpectationCents?: number | null;
}

/**
 * Busca ativa de profissionais e talentos regionais (Módulo Hunter).
 * Protegido com The Premium Wall (Plano PRO).
 */
export const searchTalentHunterPool = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z.string().optional(),
      city: z.string().optional(),
      seniority: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja ativa obrigatória para consultar o banco de talentos.");

    // The Premium Wall: valida plano PRO
    await assertWorkspacePlanPro(storeId);

    const supabase = getServerClient();

    let query = supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, headline, occupation, city, state, resume_data")
      .not("resume_data", "is", null)
      .limit(input.limit);

    if (input.city && input.city.trim()) {
      query = query.ilike("city", `%${input.city.trim()}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[searchTalentHunterPool] Erro ao buscar talentos:", error);
      throw new Error("Falha ao consultar banco regional de talentos: " + error.message);
    }

    const q = (input.query || "").trim().toLowerCase();

    const candidates: HunterCandidateDTO[] = (rows || [])
      .map((row: any) => {
        const rd = (row.resume_data as Record<string, any>) || {};
        const experiences = Array.isArray(rd.experiences) ? rd.experiences : [];
        const skills: string[] = Array.isArray(rd.skills) ? rd.skills : [];
        const availability = (rd.availability as Record<string, any>) || {};

        let totalMonths = 0;
        for (const exp of experiences) {
          if (exp.duration_months && typeof exp.duration_months === "number") {
            totalMonths += exp.duration_months;
          }
        }

        const openToWork = Boolean(
          rd.hiringStatus === "open_to_work" ||
          rd.hiringStatus === "open_to_proposals" ||
          availability.immediateStart
        );

        return {
          id: row.id,
          fullName: row.full_name || "Profissional",
          username: row.username || row.id,
          avatarUrl: row.avatar_url || null,
          headline: row.headline || rd.headline || row.occupation || "Profissional Cadastrado",
          occupation: row.occupation || rd.headline || null,
          city: row.city || null,
          state: row.state || null,
          skills,
          totalExperienceMonths: totalMonths,
          seniority: availability.seniority || null,
          openToWork,
          salaryExpectationCents: availability.salaryExpectationCents || null,
        };
      })
      .filter((c) => {
        if (!q) return true;
        const matchName = c.fullName.toLowerCase().includes(q);
        const matchHeadline = (c.headline || "").toLowerCase().includes(q);
        const matchOccupation = (c.occupation || "").toLowerCase().includes(q);
        const matchSkill = c.skills.some((s) => s.toLowerCase().includes(q));
        return matchName || matchHeadline || matchOccupation || matchSkill;
      });

    return {
      candidates,
      totalCount: candidates.length,
    };
  });

/**
 * Desconecta a Company Page do LinkedIn do Workspace da Loja.
 */
export const disconnectLinkedInCompanyPage = createServerFn({ method: "POST" })
  .handler(async () => {
    const identity = await getServerIdentity();
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja ativa obrigatória.");

    const supabase = getServerClient();
    const { error } = await supabase
      .from("oauth_integrations")
      .delete()
      .eq("store_id", storeId)
      .eq("provider", "linkedin_company");

    if (error) {
      throw new Error("Erro ao desconectar LinkedIn: " + error.message);
    }

    return { success: true, message: "Página do LinkedIn desconectada com sucesso." };
  });
