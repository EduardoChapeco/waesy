/**
 * jobs.functions.ts — BFF para o Módulo Master de Vagas & Empregos (100% Real no Supabase)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { executeUnifiedAiCall } from "@/services/api-orchestrator.functions";

export interface JobItemDTO {
 id: string;
 store_id?: string | null;
 author_profile_id?: string | null;
 title: string;
 company_name: string;
 company_logo_url?: string | null;
 category: "clt" | "pj" | "estagio" | "tech" | "comercial" | "operacional" | "saude" | "outros";
 location: string;
 workplace_type: "Presencial" | "Híbrido" | "Remoto";
 contract_type: "CLT" | "PJ" | "Estágio" | "Freelancer" | "Temporário";
 salary_display: string;
 salary_min_cents?: number | null;
 salary_max_cents?: number | null;
 description: string;
 requirements: string[];
 benefits: string[];
 contact_whatsapp?: string | null;
 contact_email?: string | null;
 is_featured: boolean;
 status: "active" | "paused" | "closed" | "draft";
 created_at: string;
 applications_count?: number;
 is_external?: boolean;
 external_url?: string | null;
 external_source?: string | null;
 external_id?: string | null;
 application_mode?: "internal" | "external_link" | "whatsapp" | "email";
}

export const listPublicJobs = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 category: z.string().optional(),
 search: z.string().optional(),
 contract_type: z.string().optional(),
 limit: z.number().int().min(1).max(100).optional(),
			storeId: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const limit = data?.limit ?? 50;

 let query = supabase
 .from("jobs")
 .select("*")
 .eq("status", "active")
 .order("is_featured", { ascending: false })
 .order("created_at", { ascending: false })
 .limit(limit);

		if (data?.storeId) {
			query = query.eq("store_id", data.storeId);
		}

		if (data?.category && data.category !== "todos") {
 query = query.eq("category", data.category);
 }

 if (data?.contract_type && data.contract_type !== "todos") {
 query = query.eq("contract_type", data.contract_type);
 }

 if (data?.search && data.search.trim()) {
 const q = `%${data.search.trim()}%`;
 query = query.or(`title.ilike.${q},company_name.ilike.${q},location.ilike.${q},description.ilike.${q}`);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("Erro ao listar vagas no Supabase:", error);
 return [];
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 store_id: row.store_id,
 author_profile_id: row.author_profile_id,
 title: row.title,
 company_name: row.company_name,
 company_logo_url: row.company_logo_url,
 category: row.category,
 location: row.location,
 workplace_type: row.workplace_type,
 contract_type: row.contract_type,
 salary_display: row.salary_display,
 salary_min_cents: row.salary_min_cents ? Number(row.salary_min_cents) : null,
 salary_max_cents: row.salary_max_cents ? Number(row.salary_max_cents) : null,
 description: row.description,
 requirements: row.requirements || [],
 benefits: row.benefits || [],
 contact_whatsapp: row.contact_whatsapp,
 contact_email: row.contact_email,
 is_featured: row.is_featured ?? false,
 status: row.status,
 created_at: row.created_at,
 is_external: Boolean(row.is_external),
 external_url: row.external_url || null,
 external_source: row.external_source || null,
 external_id: row.external_id || null,
 application_mode: row.application_mode || "internal",
 })) as JobItemDTO[];
 });

export const getPublicJobById = createServerFn({ method: "GET" })
 .validator(z.object({ jobId: z.string().uuid() }))
 .handler(async ({ data: { jobId } }) => {
 const supabase = getServerClient();

 const [jobRes, appsRes] = await Promise.all([
 supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
 supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("job_id", jobId),
 ]);

 if (jobRes.error || !jobRes.data) {
 return null;
 }

 const row = jobRes.data;

 return {
 id: row.id,
 store_id: row.store_id,
 author_profile_id: row.author_profile_id,
 title: row.title,
 company_name: row.company_name,
 company_logo_url: row.company_logo_url,
 category: row.category,
 location: row.location,
 workplace_type: row.workplace_type,
 contract_type: row.contract_type,
 salary_display: row.salary_display,
 salary_min_cents: row.salary_min_cents ? Number(row.salary_min_cents) : null,
 salary_max_cents: row.salary_max_cents ? Number(row.salary_max_cents) : null,
 description: row.description,
 requirements: row.requirements || [],
 benefits: row.benefits || [],
 contact_whatsapp: row.contact_whatsapp,
 contact_email: row.contact_email,
 is_featured: row.is_featured ?? false,
 status: row.status,
 created_at: row.created_at,
 applications_count: appsRes.count ?? 0,
 is_external: Boolean(row.is_external),
 external_url: row.external_url || null,
 external_source: row.external_source || null,
 external_id: row.external_id || null,
 application_mode: row.application_mode || "internal",
 } as JobItemDTO;
 });

export const applyToJob = createServerFn({ method: "POST" })
 .validator(
 z.object({
 jobId: z.string().uuid(),
 candidateName: z.string().min(2, "Informe seu nome completo"),
 candidateEmail: z.string().email("E-mail inválido"),
 candidatePhone: z.string().min(8, "Telefone inválido"),
 resumeUrl: z.string().url("URL de currículo inválida").optional().or(z.literal("")),
 coverLetter: z.string().max(2000).optional(),
 // Inteligência Salarial & Avaliação do Empregador Anterior
 lastSalaryCents: z.number().int().min(0).optional().nullable(),
 salaryExpectationCents: z.number().int().min(0).optional().nullable(),
 previousCompanyName: z.string().optional().nullable(),
 reasonForLeaving: z.string().optional().nullable(),
 previousCompanyRating: z.number().int().min(1).max(5).optional().nullable(),
 previousCompanyFeedback: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 const { data: job } = await supabase
 .from("jobs")
 .select("id, status, title, store_id")
 .eq("id", data.jobId)
 .maybeSingle();

 if (!job || job.status !== "active") {
 throw new Error("Esta vaga não está mais recebendo candidaturas.");
 }

 const { data: created, error } = await supabase
 .from("job_applications")
 .insert({
 job_id: data.jobId,
 candidate_profile_id: identity.customer_id || null,
 candidate_name: data.candidateName.trim(),
 candidate_email: data.candidateEmail.trim().toLowerCase(),
 candidate_phone: data.candidatePhone.trim(),
 resume_url: data.resumeUrl && data.resumeUrl.trim() ? data.resumeUrl.trim() : null,
 cover_letter: data.coverLetter?.trim() || null,
 status: "pending",
 last_salary_cents: data.lastSalaryCents || null,
 salary_expectation_cents: data.salaryExpectationCents || null,
 previous_company_name: data.previousCompanyName?.trim() || null,
 reason_for_leaving: data.reasonForLeaving?.trim() || null,
 previous_company_rating: data.previousCompanyRating || null,
 previous_company_feedback: data.previousCompanyFeedback?.trim() || null,
 })
 .select("id, created_at")
 .single();

 if (error) {
 console.error("Erro ao registrar candidatura no Supabase:", error);
 throw new Error("Não foi possível enviar sua candidatura. Tente novamente.");
 }

 // Conexão Sistêmica: Sincroniza candidatura como Oportunidade no Funil Comercial da Loja
 if (job.store_id) {
   try {
     await supabase
       .from("leads_crm")
       .insert({
         store_id: job.store_id,
         full_name: data.candidateName.trim(),
         email: data.candidateEmail.trim().toLowerCase(),
         phone: data.candidatePhone.trim(),
         title: `Candidatura: ${job.title}`,
         destination: `Vaga: ${job.title}`,
         source: "site",
         lead_source_detail: "Portal de Vagas / Recrutamento",
         status: "new",
         tags: ["Candidato", "RH", job.title],
         notes: `Candidatura recebida via portal. Pretensão: ${data.salaryExpectationCents ? `R$ ${(data.salaryExpectationCents / 100).toFixed(2)}` : "Não informada"}. Experiência prévia: ${data.previousCompanyName || "Não informada"}. Motivo de saída: ${data.reasonForLeaving || "Não informado"}. Currículo: ${data.resumeUrl || "Não informado"}.`,
       });
   } catch (syncErr: any) {
     console.warn("[jobs] Falha não impeditiva ao sincronizar candidato com leads_crm:", syncErr);
   }
 }

 return {
 success: true,
 applicationId: created.id,
 message: "Candidatura enviada com sucesso!",
 };
 });

export const listStoreJobApplications = createServerFn({ method: "GET" })
 .validator(z.object({ jobId: z.string().uuid().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 return [];
 }

 let query = supabase
 .from("job_applications")
 .select("*, jobs!inner(id, title, company_name, author_profile_id, store_id)")
 .order("created_at", { ascending: false });

 if (data?.jobId) {
 query = query.eq("job_id", data.jobId);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("[jobs:listStoreJobApplications] Erro ao buscar candidaturas do lojista:", error);
 throw new Error(`[jobs:listStoreJobApplications] Falha ao consultar job_applications: ${error.message}`);
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 job_id: row.job_id,
 job_title: row.jobs?.title || "Vaga",
 candidate_profile_id: row.candidate_profile_id,
 candidate_name: row.candidate_name,
 candidate_email: row.candidate_email,
 candidate_phone: row.candidate_phone,
 resume_url: row.resume_url,
 cover_letter: row.cover_letter,
 status: row.status,
 rating: row.rating || null,
 internal_notes: row.internal_notes || "",
 interview_at: row.interview_at || null,
 interview_meeting_url: row.interview_meeting_url || "",
 hired_role: row.hired_role || null,
 hired_salary_cents: row.hired_salary_cents ? Number(row.hired_salary_cents) : null,
 last_salary_cents: row.last_salary_cents ? Number(row.last_salary_cents) : null,
 salary_expectation_cents: row.salary_expectation_cents ? Number(row.salary_expectation_cents) : null,
 previous_company_name: row.previous_company_name || null,
 reason_for_leaving: row.reason_for_leaving || null,
 previous_company_rating: row.previous_company_rating || null,
 previous_company_feedback: row.previous_company_feedback || null,
 created_at: row.created_at,
 }));
 });

export const updateJobApplication = createServerFn({ method: "POST" })
 .validator(
 z.object({
 applicationId: z.string().uuid(),
 status: z.enum([
 "pending",
 "reviewed",
 "shortlisted",
 "interview_scheduled",
 "approved",
 "rejected",
 "hired",
 ]),
 rating: z.number().int().min(1).max(5).optional().nullable(),
 internalNotes: z.string().optional().nullable(),
 interviewAt: z.string().optional().nullable(),
 interviewMeetingUrl: z.string().url().optional().or(z.literal("")).nullable(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Não autorizado.");
 }

 const { data: updated, error } = await supabase
 .from("job_applications")
 .update({
 status: data.status,
 rating: data.rating !== undefined ? data.rating : undefined,
 internal_notes: data.internalNotes !== undefined ? data.internalNotes : undefined,
 interview_at: data.interviewAt !== undefined ? data.interviewAt : undefined,
 interview_meeting_url:
 data.interviewMeetingUrl !== undefined ? data.interviewMeetingUrl : undefined,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.applicationId)
 .select("id, status")
 .single();

 if (error) {
 console.error("Erro ao atualizar candidatura:", error);
 throw new Error("Erro ao atualizar candidatura do candidato.");
 }

 return { success: true, application: updated };
 });

export const hireJobCandidate = createServerFn({ method: "POST" })
 .validator(
 z.object({
 applicationId: z.string().uuid(),
 role: z.string().min(2, "Cargo é obrigatório"),
 salaryCents: z.number().int().min(0, "Salário inválido"),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Não autorizado.");
 }

 const { data: app, error } = await supabase
 .from("job_applications")
 .update({
 status: "hired",
 hired_role: data.role,
 hired_salary_cents: data.salaryCents,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.applicationId)
 .select("id, candidate_name, candidate_email")
 .single();

 if (error) {
 console.error("Erro ao contratar candidato:", error);
 throw new Error("Não foi possível concluir a contratação.");
 }

 return {
 success: true,
 message: `Candidato ${app.candidate_name} contratado com sucesso como ${data.role}!`,
 };
 });

export const listMyJobApplications = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 return [];
 }

 const { data: rows, error } = await supabase
 .from("job_applications")
 .select("*, jobs(id, title, company_name, company_logo_url, location, workplace_type, contract_type, salary_display)")
 .eq("candidate_profile_id", identity.customer_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("Erro ao buscar candidaturas do usuário:", error);
 return [];
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 job_id: row.job_id,
 job_title: row.jobs?.title || "Vaga",
 company_name: row.jobs?.company_name || "Empresa",
 company_logo_url: row.jobs?.company_logo_url || null,
 location: row.jobs?.location || "Local",
 workplace_type: row.jobs?.workplace_type || "Presencial",
 contract_type: row.jobs?.contract_type || "CLT",
 salary_display: row.jobs?.salary_display || "A combinar",
 status: row.status,
 interview_at: row.interview_at,
 interview_meeting_url: row.interview_meeting_url,
 created_at: row.created_at,
 }));
});

export const withdrawJobApplication = createServerFn({ method: "POST" })
 .validator(z.object({ applicationId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Não autorizado.");
 }

 const { error } = await supabase
 .from("job_applications")
 .delete()
 .eq("id", data.applicationId)
 .eq("candidate_profile_id", identity.customer_id);

 if (error) {
 throw new Error("Erro ao cancelar candidatura.");
 }

 return { success: true, message: "Candidatura cancelada com sucesso." };
 });

export const createStoreJob = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(3, "Título muito curto"),
 company_name: z.string().min(2, "Nome da empresa obrigatório"),
 company_logo_url: z.string().optional().nullable(),
 category: z.enum(["clt", "pj", "estagio", "tech", "comercial", "operacional", "saude", "outros"]).default("comercial"),
 location: z.string().min(2, "Localização é obrigatória"),
 workplace_type: z.enum(["Presencial", "Híbrido", "Remoto"]).default("Presencial"),
 contract_type: z.enum(["CLT", "PJ", "Estágio", "Freelancer", "Temporário"]).default("CLT"),
 salary_display: z.string().default("A combinar"),
 description: z.string().min(10, "Descrição detalhada obrigatória"),
 requirements: z.array(z.string()).default([]),
 benefits: z.array(z.string()).default([]),
 contact_whatsapp: z.string().optional().nullable(),
 contact_email: z.string().email().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();

 const { data: created, error } = await supabase
 .from("jobs")
 .insert({
 store_id: identity.store_id || null,
 author_profile_id: identity.id || null,
 title: data.title.trim(),
 company_name: data.company_name.trim(),
 company_logo_url: data.company_logo_url || null,
 category: data.category,
 location: data.location.trim(),
 workplace_type: data.workplace_type,
 contract_type: data.contract_type,
 salary_display: data.salary_display.trim(),
 description: data.description.trim(),
 requirements: data.requirements,
 benefits: data.benefits,
 contact_whatsapp: data.contact_whatsapp || null,
 contact_email: data.contact_email || null,
 status: "active",
 is_featured: false,
 })
 .select("id, title")
 .single();

 if (error) {
 console.error("Erro ao publicar vaga:", error);
 throw new Error("Não foi possível publicar a vaga de emprego.");
 }

 return {
 success: true,
 job: created,
 message: "Vaga de emprego publicada com sucesso no ecossistema!",
 };
 });

export const listMyStoreJobs = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 if (!store_id) return [];

 const { data: rows, error } = await supabase
 .from("jobs")
 .select("*, job_applications(id)")
 .eq("store_id", store_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("Erro ao buscar vagas da loja:", error);
 return [];
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 title: row.title,
 company_name: row.company_name,
 category: row.category,
 location: row.location,
 workplace_type: row.workplace_type,
 contract_type: row.contract_type,
 salary_display: row.salary_display,
 status: row.status,
 created_at: row.created_at,
 applications_count: row.job_applications?.length || 0,
 }));
});



export interface EmployerProfileInsightsDTO {
 company_name: string;
 total_reviews: number;
 average_rating: number;
 average_salary_cents: number | null;
 salary_samples_count: number;
 common_exit_reasons: string[];
 recent_feedback: Array<{
 rating: number;
 feedback?: string | null;
 reason_for_leaving?: string | null;
 date: string;
 }>;
}

export const getEmployerProfileInsights = createServerFn({ method: "GET" })
 .validator(z.object({ companyName: z.string().min(2) }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const cleanCompany = data.companyName.trim();

 // 1. Consultar avaliações de ex-funcionários em job_applications
 const { data: jobApps, error: jobErr } = await supabase
 .from("job_applications")
 .select("previous_company_rating, previous_company_feedback, reason_for_leaving, last_salary_cents, created_at")
 .ilike("previous_company_name", `%${cleanCompany}%`)
 .not("previous_company_rating", "is", null);

 if (jobErr) {
 console.error("[jobs] Erro ao buscar insights do empregador:", jobErr);
 }

 // 2. Consultar avaliações em classified_applications
 const { data: classApps } = await supabase
 .from("classified_applications")
 .select("previous_company_rating, previous_company_feedback, reason_for_leaving, last_salary_cents, created_at")
 .ilike("previous_company_name", `%${cleanCompany}%`)
 .not("previous_company_rating", "is", null);

 const allReviews = [...(jobApps || []), ...(classApps || [])];

 if (allReviews.length === 0) {
 return {
 company_name: cleanCompany,
 total_reviews: 0,
 average_rating: 0,
 average_salary_cents: null,
 salary_samples_count: 0,
 common_exit_reasons: [],
 recent_feedback: [],
 } as EmployerProfileInsightsDTO;
 }

 const totalReviews = allReviews.length;
 const avgRating =
 allReviews.reduce((sum, r) => sum + (r.previous_company_rating || 0), 0) / totalReviews;

 const salaryEntries = allReviews.filter((r) => r.last_salary_cents && r.last_salary_cents > 0);
 const avgSalaryCents =
 salaryEntries.length > 0
 ? Math.round(
 salaryEntries.reduce((sum, r) => sum + Number(r.last_salary_cents), 0) /
 salaryEntries.length
 )
 : null;

 const exitReasons = allReviews
 .map((r) => r.reason_for_leaving?.trim())
 .filter((r): r is string => Boolean(r && r.length > 3));

 const feedbackList = allReviews
 .filter((r) => r.previous_company_feedback || r.reason_for_leaving)
 .slice(0, 10)
 .map((r) => ({
 rating: r.previous_company_rating || 5,
 feedback: r.previous_company_feedback || null,
 reason_for_leaving: r.reason_for_leaving || null,
 date: r.created_at,
 }));

  return {
    company_name: cleanCompany,
    total_reviews: totalReviews,
    average_rating: Math.round(avgRating * 10) / 10,
    average_salary_cents: avgSalaryCents,
    salary_samples_count: salaryEntries.length,
    common_exit_reasons: Array.from(new Set(exitReasons)).slice(0, 5),
    recent_feedback: feedbackList,
  } as EmployerProfileInsightsDTO;
});

export const getCompanyDetails = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: company } = await supabase
      .from("stores")
      .select("*")
      .eq("id", data.companyId)
      .maybeSingle();
    return company || null;
  });

// ============================================================
// Mineração & Publicação de Vagas Externas com Links Oficiais
// ============================================================
export const mineAndPublishExternalJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(3),
      company_name: z.string().min(2),
      company_logo_url: z.string().url().optional().nullable(),
      category: z.enum(["clt", "pj", "estagio", "tech", "comercial", "operacional", "saude", "outros"]).default("clt"),
      location: z.string().default("Chapecó, SC"),
      workplace_type: z.enum(["Presencial", "Híbrido", "Remoto"]).default("Presencial"),
      contract_type: z.enum(["CLT", "PJ", "Estágio", "Freelancer", "Temporário"]).default("CLT"),
      salary_display: z.string().default("A combinar"),
      description: z.string().min(10),
      requirements: z.array(z.string()).default([]),
      benefits: z.array(z.string()).default([]),
      contact_whatsapp: z.string().optional().nullable(),
      contact_email: z.string().optional().nullable(),
      external_url: z.string().url(),
      external_source: z.string().default("Portal Regional"),
      external_id: z.string().optional().nullable(),
      application_mode: z.enum(["internal", "external_link", "whatsapp", "email"]).default("external_link"),
      store_id: z.string().uuid().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    // 1. Resolver loja se não fornecida (associa à store raiz se houver)
    let storeId = data.store_id;
    if (!storeId) {
      const { data: rootStore } = await supabase
        .from("stores")
        .select("id")
        .eq("is_platform_root", true)
        .maybeSingle();
      storeId = rootStore?.id || null;
    }

    // 2. Verificar se já existe vaga com este external_url ou external_id
    if (data.external_url) {
      const { data: existing } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("external_url", data.external_url)
        .maybeSingle();

      if (existing) {
        return { success: true, jobId: existing.id, isExisting: true };
      }
    }

    // 3. Inserir a vaga externa
    const { data: inserted, error } = await supabase
      .from("jobs")
      .insert({
        store_id: storeId,
        title: data.title,
        company_name: data.company_name,
        company_logo_url: data.company_logo_url,
        category: data.category,
        location: data.location,
        workplace_type: data.workplace_type,
        contract_type: data.contract_type,
        salary_display: data.salary_display,
        description: data.description,
        requirements: data.requirements,
        benefits: data.benefits,
        contact_whatsapp: data.contact_whatsapp,
        contact_email: data.contact_email,
        is_featured: false,
        status: "active",
        is_external: true,
        external_url: data.external_url,
        external_source: data.external_source,
        external_id: data.external_id,
        application_mode: data.application_mode,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao publicar vaga externa: ${error.message}`);
    }

    return { success: true, jobId: inserted.id, isExisting: false };
  });

export const listExternalJobs = createServerFn({ method: "GET" })
  .validator(
    z.object({
      city: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(30),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    let query = supabase
      .from("jobs")
      .select("*")
      .eq("is_external", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(data?.limit || 30);

    if (data?.city && data.city !== "Todas") {
      query = query.ilike("location", `%${data.city}%`);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Erro ao listar vagas externas:", error);
      return [];
    }

    return (rows || []).map((row: any) => ({
      id: row.id,
      store_id: row.store_id,
      author_profile_id: row.author_profile_id,
      title: row.title,
      company_name: row.company_name,
      company_logo_url: row.company_logo_url,
      category: row.category,
      location: row.location,
      workplace_type: row.workplace_type,
      contract_type: row.contract_type,
      salary_display: row.salary_display,
      salary_min_cents: row.salary_min_cents ? Number(row.salary_min_cents) : null,
      salary_max_cents: row.salary_max_cents ? Number(row.salary_max_cents) : null,
      description: row.description,
      requirements: row.requirements || [],
      benefits: row.benefits || [],
      contact_whatsapp: row.contact_whatsapp,
      contact_email: row.contact_email,
      is_featured: row.is_featured ?? false,
      status: row.status,
      created_at: row.created_at,
      is_external: true,
      external_url: row.external_url || null,
      external_source: row.external_source || null,
      external_id: row.external_id || null,
      application_mode: row.application_mode || "external_link",
    })) as JobItemDTO[];
  });

/**
 * Triagem e Extração de Vagas com IA (Orquestrador Universal)
 * Permite minerar ou estruturar vagas coladas de murais ou links oficiais.
 */
export const extractJobWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rawInput: z.string().min(15, "Texto da vaga ou link deve ter ao menos 15 caracteres"),
      sourceUrl: z.string().url().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const input = data.rawInput.trim();
    let textToAnalyze = input;

    // Se for URL e não foi passado texto amplo, tenta extrair conteúdo textual
    if (input.startsWith("http://") || input.startsWith("https://")) {
      try {
        const res = await fetch(input, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const html = await res.text();
          textToAnalyze = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .slice(0, 6000);
        } else {
          // Fallback para Jina Reader Proxy caso haja bloqueio anti-bot no portal de vagas
          const jinaRes = await fetch(`https://r.jina.ai/${input}`, {
            headers: { Accept: "text/plain", "X-Return-Format": "text" },
            signal: AbortSignal.timeout(10000),
          }).catch(() => null);
          if (jinaRes?.ok) {
            const jinaText = await jinaRes.text().catch(() => "");
            if (jinaText && jinaText.length > 80) {
              textToAnalyze = jinaText.slice(0, 6000);
            }
          }
        }
      } catch (err: any) {
        console.warn("[extractJobWithAI] Falha no fetch direto da URL da vaga:", err.message);
      }
    }

    const systemInstruction = `Você é o Especialista em Triagem e Estruturação de Vagas de Emprego da Waesy Platform.
Sua missão é extrair com rigor cirúrgico os dados reais da vaga a partir do texto fornecido.
Proibido inventar dados. Se algum dado não constar, retorne null ou valor padrão estrito.
Retorne EXCLUSIVAMENTE um JSON estrito no formato:
{
  "title": "<Título da vaga>",
  "company_name": "<Nome da empresa contratante ou 'Confidencial'>",
  "category": "<uma das opções: 'clt', 'pj', 'estagio', 'tech', 'comercial', 'operacional', 'saude', 'outros'>",
  "location": "<Cidade, Estado ou 'Remoto'>",
  "workplace_type": "<'Presencial' | 'Híbrido' | 'Remoto'>",
  "contract_type": "<'CLT' | 'PJ' | 'Estágio' | 'Freelancer' | 'Temporário'>",
  "salary_display": "<Salário formatado ou 'A combinar'>",
  "salary_min_cents": <número inteiro em centavos ou null>,
  "salary_max_cents": <número inteiro em centavos ou null>,
  "description": "<Descrição objetiva das atividades>",
  "requirements": ["<requisito 1>", "<requisito 2>"],
  "benefits": ["<benefício 1>", "<benefício 2>"],
  "contact_whatsapp": "<telefone/whatsapp ou null>",
  "contact_email": "<email para currículos ou null>",
  "application_mode": "<'external_link' | 'whatsapp' | 'email' | 'internal'>"
}`;

    const aiRes = await executeUnifiedAiCall({
      systemInstruction,
      prompt: `Texto da vaga:\n${textToAnalyze.slice(0, 5000)}`,
      temperature: 0.1,
      expectJson: true,
    });

    const parsed = aiRes.parsedJson as any;
    if (!parsed?.title) {
      throw new Error("Não foi possível identificar o título ou dados mínimos da vaga.");
    }

    const validCategories = ["clt", "pj", "estagio", "tech", "comercial", "operacional", "saude", "outros"];
    const validWorkplace = ["Presencial", "Híbrido", "Remoto"];
    const validContract = ["CLT", "PJ", "Estágio", "Freelancer", "Temporário"];
    const validModes = ["internal", "external_link", "whatsapp", "email"];

    return {
      success: true,
      jobDraft: {
        title: String(parsed.title || "").trim(),
        company_name: String(parsed.company_name || "Empresa Confidencial").trim(),
        category: (validCategories.includes(parsed.category) ? parsed.category : "clt") as any,
        location: String(parsed.location || "Chapecó, SC").trim(),
        workplace_type: (validWorkplace.includes(parsed.workplace_type) ? parsed.workplace_type : "Presencial") as any,
        contract_type: (validContract.includes(parsed.contract_type) ? parsed.contract_type : "CLT") as any,
        salary_display: String(parsed.salary_display || "A combinar").trim(),
        salary_min_cents: parsed.salary_min_cents ? Math.round(Number(parsed.salary_min_cents)) : null,
        salary_max_cents: parsed.salary_max_cents ? Math.round(Number(parsed.salary_max_cents)) : null,
        description: String(parsed.description || "").trim(),
        requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [],
        benefits: Array.isArray(parsed.benefits) ? parsed.benefits.map(String) : [],
        contact_whatsapp: parsed.contact_whatsapp ? String(parsed.contact_whatsapp) : null,
        contact_email: parsed.contact_email ? String(parsed.contact_email) : null,
        application_mode: (validModes.includes(parsed.application_mode) ? parsed.application_mode : "external_link") as any,
        external_url: data.sourceUrl || (input.startsWith("http") ? input : null),
      },
    };
  });


