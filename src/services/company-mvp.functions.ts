import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getSSRClient } from "@/lib/supabase-ssr.server";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { getIdentity } from "./identity.functions";
import { enrichCnpj } from "@/lib/mining/cnpj-enrichment.engine";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || "empresa";
}

// ---------------------------------------------------------------------------
// 1. FAST 1-PAGE COMPANY ONBOARDING
// ---------------------------------------------------------------------------

export const FastRegisterCompanySchema = z.object({
  name: z.string().min(2, "Nome da empresa é obrigatório"),
  category: z.string().default("servicos"),
  phone: z.string().min(8, "Telefone/WhatsApp de atendimento é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().default("SC"),
  address: z.string().optional(),
  bio: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  cnpj: z.string().optional(),
});

export const fastRegisterCompany = createServerFn({ method: "POST" })
  .validator(FastRegisterCompanySchema)
  .handler(async ({ data }) => {
    const db = getServerClient();

    // 0. Resolver identidade da sessão
    let userId: string | null = null;
    try {
      const identity = await getServerIdentity();
      userId = identity?.id || null;
    } catch {
      userId = null;
    }

    if (!userId) {
      try {
        const ssr = getSSRClient();
        const { data: authData } = await ssr.auth.getUser();
        userId = authData?.user?.id || null;
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      throw new Error("Sessão não autenticada. Acesse sua conta antes de cadastrar sua empresa.");
    }

    // 0.0 Auto-enriquecimento nativo via motor CNPJ (se informado)
    let enrichedData: any = null;
    if (data.cnpj) {
      try {
        enrichedData = await enrichCnpj(data.cnpj);
      } catch (e: any) {
        console.warn("[fastRegisterCompany] Aviso de enriquecimento CNPJ:", e?.message);
      }
    }

    // 0.1 Garantir profile
    const { data: existingProfile } = await db
      .from("profiles")
      .select("id, role")
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
    const resolvedName = enrichedData?.nome_fantasia || enrichedData?.razao_social || data.name;
    const orgSlug = generateSlug(resolvedName) + "-" + Math.floor(1000 + Math.random() * 9000);
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: resolvedName, slug: orgSlug })
      .select("id")
      .single();

    if (orgError) {
      throw new Error("Erro ao criar organização: " + orgError.message);
    }

    // 2. Settings estruturado
    const settings = {
      category: data.category,
      segment: data.category,
      niche: data.category,
      bio: data.bio || (enrichedData?.cnae_principal?.descricao ? `Atividade: ${enrichedData.cnae_principal.descricao}` : ""),
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
      website: data.website || null,
      instagram: data.instagram || null,
      is_address_public: true,
      coverage_cities: [data.city],
      working_hours: null,
      created_via: "mvp_fast_onboarding",
      cnae: enrichedData?.cnae_principal?.codigo || null,
      socios: enrichedData?.socios || [],
    };

    // 3. Criar Loja
    const storePayload = {
      organization_id: org.id,
      name: resolvedName,
      slug: orgSlug,
      city: enrichedData?.endereco?.municipio || data.city,
      state: enrichedData?.endereco?.uf || data.state || "SC",
      address: data.address || (enrichedData?.endereco?.logradouro ? `${enrichedData.endereco.logradouro}, ${enrichedData.endereco.numero || 'S/N'}` : data.city),
      phone: enrichedData?.telefones?.[0] || data.phone,
      cnpj: enrichedData?.cnpj || data.cnpj || null,
      logo_url: data.logoUrl || null,
      settings,
    };

    const { data: store, error: storeError } = await db
      .from("stores")
      .insert(storePayload)
      .select("id, name, slug, logo_url, city, phone")
      .single();

    if (storeError) {
      throw new Error("Erro ao criar loja da empresa: " + storeError.message);
    }

    // 4. Vincular Usuário como Owner
    try {
      await db.from("workspace_members").upsert(
        {
          profile_id: userId,
          store_id: store.id,
          role: "owner",
        },
        { onConflict: "profile_id,store_id" }
      );
    } catch (e: any) {
      console.warn("[fastRegisterCompany] Aviso workspace_members:", e?.message);
    }

    // 5. Cadastrar no Guia / Diretório Oficial (Single Source of Truth)
    try {
      await db.from("directory_listings").insert({
        store_id: store.id,
        category: data.category,
        address: storePayload.address,
        city: storePayload.city,
        state: storePayload.state,
        business_name: resolvedName,
        cnpj: storePayload.cnpj,
        data_quality_score: enrichedData?.dataQualityScore || 50,
        is_crawled: false,
        status: "active",
      });
    } catch (e: any) {
      console.warn("[fastRegisterCompany] Aviso directory_listings:", e?.message);
    }

    // 6. Atualizar store_id no profile
    try {
      await db.from("profiles").update({ store_id: store.id }).eq("id", userId);
    } catch (e: any) {
      console.warn("[fastRegisterCompany] Aviso profile update store_id:", e?.message);
    }

    // 7. Definir Cookies de Tenant
    try {
      const isProd = process.env.NODE_ENV === "production";
      const cookieOpts = {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        sameSite: "lax" as const,
        secure: isProd,
      };
      setCookie("waesy_store_id", store.id, cookieOpts);
    } catch (e: any) {
      console.warn("[fastRegisterCompany] Aviso ao setar cookie:", e?.message);
    }

    return {
      success: true,
      store,
      storeId: store.id,
    };
  });

// ---------------------------------------------------------------------------
// 2. MINI GESTÃO: LEADS, PEDIDOS E NEGOCIAÇÕES DA EMPRESA
// ---------------------------------------------------------------------------

export const listCompanyLeadsAndOrders = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) return { leads: [], currentStore: null };

    // Buscar loja do usuário garantindo isolamento estrito
    let targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId) {
      assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
    } else {
      const validMembership = identity.memberships?.find((m) => STAFF_ROLES.includes(m.role as any));
      if (validMembership) {
        targetStoreId = validMembership.store_id;
      }
    }

    if (!targetStoreId) {
      return { leads: [], currentStore: null };
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, phone, city, address, settings")
      .eq("id", targetStoreId)
      .maybeSingle();

    // Buscar classificados pertencentes EXCLUSIVAMENTE a esta loja (Zero Context Bleeding)
    const { data: storeClassifieds } = await supabase
      .from("classifieds")
      .select("id")
      .eq("store_id", targetStoreId);

    const classifiedIds = (storeClassifieds || []).map((c) => c.id);

    if (classifiedIds.length === 0) {
      return { leads: [], currentStore: store };
    }

    // STRICT IDENTITY WALL: Apenas deals vinculados aos anúncios da loja. NUNCA misturar com vendas civis da pessoa física (seller_id = identity.id).
    let query = supabase
      .from("deals")
      .select("*, classifieds(id, title, price_cents, images, category)")
      .in("classified_id", classifiedIds)
      .order("created_at", { ascending: false })
      .limit(data?.limit || 50);

    if (data?.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }

    const { data: deals, error } = await query;
    if (error) {
      console.warn("[company-mvp] Erro ao buscar deals:", error);
      return { leads: [], currentStore: store };
    }

    // Buscar dados dos compradores
    const buyerIds = Array.from(new Set((deals || []).map((d) => d.buyer_id).filter(Boolean)));
    let buyerProfiles: Record<string, any> = {};

    if (buyerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .in("id", buyerIds);

      (profiles || []).forEach((p) => {
        buyerProfiles[p.id] = p;
      });
    }

    const formattedLeads = (deals || []).map((d) => ({
      ...d,
      buyer: buyerProfiles[d.buyer_id] || {
        id: d.buyer_id,
        full_name: "Cliente Interessado",
        phone: null,
        avatar_url: null,
      },
    }));

    return {
      leads: formattedLeads,
      currentStore: store,
    };
  });

export const UpdateCompanyLeadStatusSchema = z.object({
  dealId: z.string().uuid(),
  status: z.enum(["pending", "negotiating", "accepted", "rejected", "completed", "cancelled"]),
  notes: z.string().optional(),
});

export const updateCompanyLeadStatus = createServerFn({ method: "POST" })
  .validator(UpdateCompanyLeadStatusSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: deal, error } = await supabase
      .from("deals")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.dealId)
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao atualizar status: " + error.message);
    }

    return { success: true, deal };
  });

// ---------------------------------------------------------------------------
// 3. RECIBO & COMPROVANTE TIMBRADO
// ---------------------------------------------------------------------------

export const getCompanyReceiptData = createServerFn({ method: "GET" })
  .validator(z.object({ dealId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: deal, error } = await supabase
      .from("deals")
      .select("*, classifieds(*)")
      .eq("id", data.dealId)
      .single();

    if (error || !deal) {
      throw new Error("Negociação não encontrada");
    }

    // Buscar comprador
    const { data: buyer } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("id", deal.buyer_id)
      .maybeSingle();

    // Buscar loja
    let store = null;
    if (deal.classifieds?.store_id) {
      const { data: st } = await supabase
        .from("stores")
        .select("id, name, cnpj, phone, address, city, state, logo_url")
        .eq("id", deal.classifieds.store_id)
        .maybeSingle();
      store = st;
    }

    if (!store && identity.store_id) {
      const { data: st } = await supabase
        .from("stores")
        .select("id, name, cnpj, phone, address, city, state, logo_url")
        .eq("id", identity.store_id)
        .maybeSingle();
      store = st;
    }

    const receiptSerial = `REC-${deal.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;

    return {
      deal,
      buyer: buyer || { full_name: "Cliente", phone: "" },
      store: store || {
        name: "Empresa Parceira Waesy",
        cnpj: "",
        phone: "",
        address: "",
        city: "",
        logo_url: null,
      },
      serial: receiptSerial,
      issueDate: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });

// ---------------------------------------------------------------------------
// 4. CATÁLOGO DIGITAL DA EMPRESA (CLASSIFICADOS COM STORE_ID)
// ---------------------------------------------------------------------------

export const listCompanyCatalogClassifieds = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        limit: z.number().int().optional().default(50),
      })
      .optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) return { classifieds: [], stats: { active: 0, paused: 0, resolved: 0 } };

    let targetStoreId = data?.storeId || identity.store_id;

    if (targetStoreId) {
      assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
    } else {
      const validMembership = identity.memberships?.find((m) => STAFF_ROLES.includes(m.role as any));
      if (validMembership) {
        targetStoreId = validMembership.store_id;
      }
    }

    if (!targetStoreId) {
      return { classifieds: [], stats: { active: 0, paused: 0, resolved: 0 } };
    }

    // STRICT IDENTITY WALL: Empresa NUNCA vê itens civis de author_profile_id. Somente produtos da loja.
    const { data: classifieds, error } = await supabase
      .from("classifieds")
      .select("*")
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false })
      .limit(data?.limit || 50);

    if (error) {
      console.warn("[company-mvp] Erro ao listar catálogo:", error);
      return { classifieds: [], stats: { active: 0, paused: 0, resolved: 0 } };
    }

    const stats = {
      active: (classifieds || []).filter((c) => c.status === "active").length,
      paused: (classifieds || []).filter((c) => c.status === "expired" || c.status === "paused").length,
      resolved: (classifieds || []).filter((c) => c.status === "resolved").length,
    };

    return {
      classifieds: classifieds || [],
      stats,
    };
  });

export const ToggleCompanyClassifiedStatusSchema = z.object({
  classifiedId: z.string().uuid(),
  newStatus: z.enum(["active", "resolved", "expired"]),
});

export const toggleCompanyClassifiedStatus = createServerFn({ method: "POST" })
  .validator(ToggleCompanyClassifiedStatusSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const { data: classified, error } = await supabase
      .from("classifieds")
      .update({ status: data.newStatus, updated_at: new Date().toISOString() })
      .eq("id", data.classifiedId)
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao atualizar status: " + error.message);
    }

    return { success: true, classified };
  });

// ---------------------------------------------------------------------------
// 4.1 REGISTRO INSTANTÂNEO DE LEAD DE CLASSIFICADOS (INTEGRAÇÃO TABELA DEALS)
// ---------------------------------------------------------------------------

export const RegisterClassifiedLeadSchema = z.object({
  classifiedId: z.string().uuid(),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  message: z.string().optional(),
  proposedPriceCents: z.number().int().min(0).optional(),
});

export const registerClassifiedLead = createServerFn({ method: "POST" })
  .validator(RegisterClassifiedLeadSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 1. Obter o anúncio
    const { data: classified, error: cErr } = await supabase
      .from("classifieds")
      .select("id, title, price_cents, author_profile_id, store_id")
      .eq("id", data.classifiedId)
      .maybeSingle();

    if (cErr || !classified) {
      throw new Error("Anúncio não encontrado para registrar o lead.");
    }

    // 2. Obter ou resolver identidade do comprador
    let buyerId: string | null = null;
    try {
      const identity = await getIdentity();
      if (identity?.id && identity.id !== classified.author_profile_id) {
        buyerId = identity.id;
      }
    } catch {
      buyerId = null;
    }

    // Se não autenticado ou mesmo autor, buscar perfil por telefone ou fallback
    if (!buyerId && data.buyerPhone) {
      const cleanPhone = data.buyerPhone.replace(/\D/g, "");
      if (cleanPhone.length >= 8) {
        const { data: existingLead } = await supabase
          .from("profiles")
          .select("id")
          .ilike("phone", `%${cleanPhone.slice(-8)}%`)
          .limit(1)
          .maybeSingle();
        if (existingLead) {
          buyerId = existingLead.id;
        }
      }
    }

    if (!buyerId) {
      // Fallback seguro: obter profile existente do sistema para satisfazer a FK NOT NULL
      const { data: fallbackProf } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .maybeSingle();
      buyerId = fallbackProf?.id || classified.author_profile_id;
    }

    // 3. Inserir negócio (deal) no banco de dados
    const price = data.proposedPriceCents ?? (classified.price_cents || 0);
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .insert({
        classified_id: classified.id,
        buyer_id: buyerId,
        seller_id: classified.author_profile_id,
        proposed_price_cents: price,
        status: "negotiating",
        deal_type: "sale",
        terms: data.message || `Lead WhatsApp/Reserva rápida: ${data.buyerName || "Visitante"} (${data.buyerPhone || "Sem telefone"})`,
      })
      .select()
      .single();

    if (dealErr) {
      console.warn("[company-mvp] Erro ao registrar lead deal:", dealErr);
      throw new Error("Erro ao gravar lead da negociação: " + dealErr.message);
    }

    // 4. Registrar histórico em deal_events
    try {
      await supabase.from("deal_events").insert({
        deal_id: deal.id,
        sender_id: buyerId,
        event_type: "proposal",
        payload: {
          buyer_name: data.buyerName,
          buyer_phone: data.buyerPhone,
          message: data.message,
          source: "whatsapp_click",
          classified_title: classified.title,
        },
      });
    } catch (e: any) {
      console.warn("[company-mvp] Aviso ao registrar deal_event:", e?.message);
    }

    // 5. Inserir notificação para o lojista/anunciante
    try {
      const destinationUrl = classified.store_id
        ? `/workspace/comercial?dealId=${deal.id}`
        : `/_store/conta/negociacoes`;

      await supabase.from("notifications").insert({
        user_id: classified.author_profile_id,
        type: "new_lead",
        title: "Novo Lead Recebido!",
        message: `${data.buyerName || "Cliente"} demonstrou interesse em "${classified.title}".`,
        link_url: destinationUrl,
        author_name: data.buyerName || "Cliente Interessado",
      });
    } catch (nErr: any) {
      console.warn("[company-mvp] Aviso ao criar notification:", nErr?.message);
    }

    return {
      success: true,
      dealId: deal.id,
      deal,
    };
  });

// ---------------------------------------------------------------------------
// 5. LISTA DE ESPERA / BETA DO WORKSPACE PRO
// ---------------------------------------------------------------------------

export const RegisterWorkspaceProWaitlistSchema = z.object({
  modulesOfInterest: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

export const registerWorkspaceProWaitlist = createServerFn({ method: "POST" })
  .validator(RegisterWorkspaceProWaitlistSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Você precisa estar conectado para entrar na lista.");

    let storeId = identity.store_id;
    let companyName = identity.name || "Minha Empresa";
    let whatsapp = "";

    if (storeId) {
      const { data: st } = await supabase
        .from("stores")
        .select("id, name, phone")
        .eq("id", storeId)
        .maybeSingle();
      if (st) {
        companyName = st.name;
        whatsapp = st.phone || "";
      }
    }

    const { data: record, error } = await supabase
      .from("workspace_pro_waitlist")
      .insert({
        store_id: storeId,
        profile_id: identity.id,
        company_name: companyName,
        whatsapp,
        modules_of_interest: data.modulesOfInterest,
        notes: data.notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao registrar interesse: " + error.message);
    }

    return { success: true, record };
  });

// ---------------------------------------------------------------------------
// 7. GESTÃO DE CANDIDATURAS & VAGAS DE EMPREGO DA EMPRESA
// ---------------------------------------------------------------------------

export const ListCompanyJobApplicationsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const listCompanyJobApplications = createServerFn({ method: "GET" })
  .validator(ListCompanyJobApplicationsSchema.optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) return { applications: [], total: 0 };

    let storeId = identity.store_id;
    if (!storeId) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("store_id")
        .eq("profile_id", identity.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      storeId = member?.store_id || null;
    }

    if (!storeId) return { applications: [], total: 0 };

    // Buscar vagas/anúncios de emprego da empresa em classifieds
    const { data: storeJobs } = await supabase
      .from("classifieds")
      .select("id, title, category, status")
      .eq("store_id", storeId)
      .in("category", ["job", "vaga", "job_offer"]);

    const jobIds = (storeJobs || []).map((j) => j.id);

    if (jobIds.length === 0) {
      // Verificar se há leads do tipo candidatura em leads_crm
      const { data: crmLeads } = await supabase
        .from("leads_crm")
        .select("*")
        .eq("store_id", storeId)
        .eq("lead_source_detail", "Classificados / Vagas")
        .order("created_at", { ascending: false });

      if (crmLeads && crmLeads.length > 0) {
        const mapped = crmLeads.map((l) => ({
          id: l.id,
          classified_id: null,
          job_title: l.title?.replace("Candidatura: ", "") || "Vaga da Empresa",
          candidate_name: l.full_name,
          candidate_email: l.email,
          candidate_phone: l.phone,
          status: l.status === "new" ? "submitted" : l.status,
          cover_letter: l.notes,
          resume_url: null,
          applied_at: l.created_at,
        }));
        return { applications: mapped, total: mapped.length };
      }
      return { applications: [], total: 0 };
    }

    // Buscar candidaturas vinculadas a essas vagas
    let query = supabase
      .from("classified_applications")
      .select("*")
      .in("classified_id", jobIds)
      .order("applied_at", { ascending: false })
      .limit(data?.limit || 50);

    if (data?.status) {
      query = query.eq("status", data.status);
    }

    const { data: apps, error } = await query;

    if (error) {
      console.warn("[listCompanyJobApplications] Erro ao buscar candidaturas:", error.message);
      return { applications: [], total: 0 };
    }

    const jobsMap = new Map((storeJobs || []).map((j) => [j.id, j.title]));

    const enriched = (apps || []).map((app) => ({
      id: app.id,
      classified_id: app.classified_id,
      job_title: jobsMap.get(app.classified_id) || "Vaga de Emprego",
      candidate_name: app.name || (app as any).candidate_name || "Candidato",
      candidate_email: app.email || (app as any).candidate_email || null,
      candidate_phone: app.phone || (app as any).candidate_phone || null,
      education_level: (app as any).education_level || null,
      experience_years: (app as any).experience_years || null,
      candidate_role: (app as any).candidate_role || null,
      cover_letter: app.cover_letter || (app as any).cover_note || null,
      resume_url: app.resume_url || null,
      status: app.status || "submitted",
      feedback_notes: app.feedback_notes || null,
      applied_at: app.applied_at || (app as any).created_at || new Date().toISOString(),
    }));

    return { applications: enriched, total: enriched.length };
  });

export const UpdateCompanyJobApplicationStatusSchema = z.object({
  applicationId: z.string().uuid("ID da candidatura inválido"),
  status: z.enum(["submitted", "reviewing", "shortlisted", "rejected", "hired", "pending"]),
  feedbackNotes: z.string().optional(),
});

export const updateCompanyJobApplicationStatus = createServerFn({ method: "POST" })
  .validator(UpdateCompanyJobApplicationStatusSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    const updatePayload: any = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.feedbackNotes !== undefined) {
      updatePayload.feedback_notes = data.feedbackNotes;
    }

    const { data: updated, error } = await supabase
      .from("classified_applications")
      .update(updatePayload)
      .eq("id", data.applicationId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error("Erro ao atualizar status do candidato: " + error.message);
    }

    return { success: true, application: updated };
  });

// ---------------------------------------------------------------------------
// 8. PERSONALIZAÇÃO DE FORMULÁRIO / PERGUNTAS PELO LOJISTA
// ---------------------------------------------------------------------------

export const CompanyCustomFormFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2, "O rótulo da pergunta é obrigatório"),
  type: z.enum(["text", "textarea", "select", "checkbox"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const UpdateCompanyCustomFormSettingsSchema = z.object({
  fields: z.array(CompanyCustomFormFieldSchema),
});

export const getCompanyCustomFormSettings = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();

    let targetStoreId = data?.storeId || identity?.store_id;
    if (!targetStoreId && identity?.id) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("store_id")
        .eq("profile_id", identity.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetStoreId = member?.store_id || null;
    }

    if (!targetStoreId) return { fields: [] };

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", targetStoreId)
      .maybeSingle();

    const fields = store?.settings?.custom_inquiry_fields || [];
    return { fields };
  });

export const updateCompanyCustomFormSettings = createServerFn({ method: "POST" })
  .validator(UpdateCompanyCustomFormSettingsSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Acesso não autorizado.");

    let storeId = identity.store_id;
    if (!storeId) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("store_id")
        .eq("profile_id", identity.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      storeId = member?.store_id || null;
    }

    if (!storeId) throw new Error("Nenhuma empresa vinculada ao perfil.");

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .single();

    const currentSettings = store?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      custom_inquiry_fields: data.fields,
    };

    const { error } = await supabase
      .from("stores")
      .update({ settings: updatedSettings })
      .eq("id", storeId);

    if (error) {
      throw new Error("Erro ao salvar formulário personalizado: " + error.message);
    }

    return { success: true, fields: data.fields };
  });

