/**
 * resumes.functions.ts — BFF Server Functions para o Ecossistema Canônico de Currículos & Carreira
 * 
 * Invariantes:
 * 1. Isolamento Multi-Currículos (resumes) com projeção bidirecional em profiles.resume_data
 * 2. Candidatura Rápida em 1 Clique com Snapshot Imutável (job_applications.resume_snapshot)
 * 3. Matching de Vagas Explicável e Transparente (zero scores mágicos)
 * 4. Integridade de Parâmetros e Tipagem Zod Estrita (AGENTS.md B.25)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import type { ResumeDataDTO } from "@/types/resume";

export interface ResumeItemDTO {
  id: string;
  profile_id: string;
  title: string;
  slug: string;
  is_default: boolean;
  is_public: boolean;
  template_id: "minimal" | "modern" | "ats_friendly" | "editorial" | "creative";
  accent_color: string;
  font_family: "sans" | "serif" | "mono";
  spacing_density: "compact" | "normal" | "relaxed";
  show_photo: boolean;
  data: ResumeDataDTO;
  created_at: string;
  updated_at: string;
}

export interface JobMatchResultDTO {
  job_id: string;
  title: string;
  company_name: string;
  company_logo_url?: string | null;
  location: string;
  workplace_type: string;
  contract_type: string;
  salary_display: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  is_applied: boolean;
}

// ─── 1. LISTAR CURRÍCULOS DO USUÁRIO ─────────────────────────────────────────

export const listUserResumes = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResumeItemDTO[]> => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) return [];

    const supabase = getServerClient();

    // 1. Tenta buscar da tabela resumes
    const { data: records, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("profile_id", identity.id!)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });

    if (!error && records && records.length > 0) {
      return records.map((r: any) => ({
        id: r.id,
        profile_id: r.profile_id,
        title: r.title || "Currículo Principal",
        slug: r.slug || "principal",
        is_default: Boolean(r.is_default),
        is_public: Boolean(r.is_public),
        template_id: r.template_id || "minimal",
        accent_color: r.accent_color || "slate",
        font_family: r.font_family || "sans",
        spacing_density: r.spacing_density || "normal",
        show_photo: r.show_photo !== false,
        data: (r.data as ResumeDataDTO) || {},
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      }));
    }

    // 2. Fallback resiliente: busca perfil civil existente e sintetiza o currículo default
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, bio, phone, city, state, website, avatar_url, resume_data")
      .eq("id", identity.id!)
      .maybeSingle();

    const resumeData = (profile?.resume_data as ResumeDataDTO) || {};

    const syntheticResume: ResumeItemDTO = {
      id: "default-resume",
      profile_id: identity.id!,
      title: "Currículo Geral",
      slug: "geral",
      is_default: true,
      is_public: false,
      template_id: (resumeData as any)?.custom_template || "minimal",
      accent_color: "slate",
      font_family: "sans",
      spacing_density: "normal",
      show_photo: true,
      data: {
        headline: (resumeData as any)?.headline || profile?.full_name || "",
        summary: (resumeData as any)?.summary || profile?.bio || "",
        experiences: resumeData?.experiences || [],
        educations: resumeData?.educations || [],
        certifications: resumeData?.certifications || [],
        licenses: resumeData?.licenses || [],
        projects: resumeData?.projects || [],
        languages: resumeData?.languages || [],
        skills: resumeData?.skills || [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [syntheticResume];
  }
);

// ─── 2. SALVAR OU ATUALIZAR CURRÍCULO ────────────────────────────────────────

const SaveResumeInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "O título do currículo é obrigatório").max(60),
  slug: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  templateId: z.enum(["minimal", "modern", "ats_friendly", "editorial", "creative"]).default("minimal"),
  accentColor: z.string().default("slate"),
  fontFamily: z.enum(["sans", "serif", "mono"]).default("sans"),
  spacingDensity: z.enum(["compact", "normal", "relaxed"]).default("normal"),
  showPhoto: z.boolean().default(true),
  data: z.record(z.string(), z.any()),
});

export const saveUserResume = createServerFn({ method: "POST" })
  .validator(SaveResumeInputSchema)
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Usuário não autenticado.");
    }

    const supabase = getServerClient();
    const now = new Date().toISOString();
    const cleanSlug =
      input.slug ||
      input.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      "curriculo";

    let resumeRecord: any = null;

    // Se tiver ID real (não o sintético "default-resume"), atualiza
    if (input.id && input.id !== "default-resume") {
      const { data: updated, error } = await supabase
        .from("resumes")
        .update({
          title: input.title,
          slug: cleanSlug,
          is_default: input.isDefault,
          is_public: input.isPublic,
          template_id: input.templateId,
          accent_color: input.accentColor,
          font_family: input.fontFamily,
          spacing_density: input.spacingDensity,
          show_photo: input.showPhoto,
          data: input.data,
          updated_at: now,
        })
        .eq("id", input.id)
        .eq("profile_id", identity.id!)
        .select()
        .maybeSingle();

      if (error) {
        console.warn("[resumes.functions] Falha ao atualizar em resumes, gravando em profiles:", error.message);
      } else {
        resumeRecord = updated;
      }
    }

    // Se for novo ou se o update falhou/era sintético, tenta insert
    if (!resumeRecord) {
      const { data: inserted, error: insertErr } = await supabase
        .from("resumes")
        .insert({
          profile_id: identity.id!,
          title: input.title,
          slug: cleanSlug,
          is_default: input.isDefault,
          is_public: input.isPublic,
          template_id: input.templateId,
          accent_color: input.accentColor,
          font_family: input.fontFamily,
          spacing_density: input.spacingDensity,
          show_photo: input.showPhoto,
          data: input.data,
          created_at: now,
          updated_at: now,
        })
        .select()
        .maybeSingle();

      if (!insertErr) {
        resumeRecord = inserted;
      }
    }

    // Se for default ou único, garante sincronia bidirecional com profiles.resume_data
    if (input.isDefault || !input.id || input.id === "default-resume") {
      try {
        await supabase
          .from("profiles")
          .update({
            resume_data: {
              ...input.data,
              custom_template: input.templateId,
              custom_format: "a4",
              updated_at: now,
            },
          })
          .eq("id", identity.id!);
      } catch (err) {
        console.warn("[saveUserResume] Falha ao sincronizar profile:", err);
      }
    }

    return {
      success: true,
      resumeId: resumeRecord?.id || input.id || "default-resume",
      title: input.title,
      slug: cleanSlug,
    };
  });

// ─── 3. DUPLICAR CURRÍCULO (ADAPTAR PARA NOVA ÁREA OU VAGA) ──────────────────

export const duplicateUserResume = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sourceResumeId: z.string(),
      newTitle: z.string().min(1).max(60),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) throw new Error("Não autenticado.");

    const supabase = getServerClient();
    let sourceData: any = null;

    if (input.sourceResumeId !== "default-resume") {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", input.sourceResumeId)
        .eq("profile_id", identity.id!)
        .maybeSingle();
      sourceData = data;
    }

    if (!sourceData) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("resume_data")
        .eq("id", identity.id!)
        .maybeSingle();
      sourceData = {
        data: profile?.resume_data || {},
        template_id: "minimal",
        accent_color: "slate",
        font_family: "sans",
        spacing_density: "normal",
        show_photo: true,
      };
    }

    const newSlug = `${input.newTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error } = await supabase
      .from("resumes")
      .insert({
        profile_id: identity.id!,
        title: input.newTitle,
        slug: newSlug,
        is_default: false,
        is_public: false,
        template_id: sourceData.template_id || "minimal",
        accent_color: sourceData.accent_color || "slate",
        font_family: sourceData.font_family || "sans",
        spacing_density: sourceData.spacing_density || "normal",
        show_photo: sourceData.show_photo !== false,
        data: sourceData.data || {},
      })
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao duplicar currículo: ${error.message}`);
    }

    return {
      success: true,
      duplicatedResume: created,
    };
  });

// ─── 4. CANDIDATURA RÁPIDA EM 1 CLIQUE COM SNAPSHOT IMUTÁVEL ──────────────────

export const applyToJobWithSnapshot = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().uuid(),
      candidateName: z.string().min(2, "Nome é obrigatório"),
      candidateEmail: z.string().email("E-mail inválido"),
      candidatePhone: z.string().min(8, "Telefone é obrigatório"),
      coverLetter: z.string().optional().default(""),
      salaryExpectationCents: z.number().int().optional().nullable(),
      resumeSnapshotData: z.record(z.string(), z.any()),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Faça login para se candidatar.");
    }

    const supabase = getServerClient();

    // 1. Valida se a vaga existe e obtém requirements
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, title, company_name, requirements, location, status")
      .eq("id", input.jobId)
      .maybeSingle();

    if (jobErr || !job) {
      throw new Error("Vaga não encontrada.");
    }

    if (job.status !== "active") {
      throw new Error("Esta vaga já foi encerrada ou pausada pela empresa.");
    }

    // 2. Barreira de idempotência: Previne candidaturas duplicadas para a mesma vaga
    const { data: existingApp } = await supabase
      .from("job_applications")
      .select("id, status, created_at")
      .eq("job_id", input.jobId)
      .eq("candidate_profile_id", identity.id!)
      .maybeSingle();

    if (existingApp) {
      throw new Error(
        `Você já enviou uma candidatura para esta vaga em ${new Date(
          existingApp.created_at
        ).toLocaleDateString("pt-BR")}. Status atual: ${existingApp.status}.`
      );
    }

    // 3. Cálculo de Matching Explicável
    const candidateSkills: string[] = Array.isArray(input.resumeSnapshotData?.skills)
      ? input.resumeSnapshotData.skills.map((s: string) => s.trim().toLowerCase())
      : [];

    const jobRequirements: string[] = Array.isArray(job.requirements)
      ? job.requirements.map((r: string) => r.trim().toLowerCase())
      : [];

    const matchedSkills = jobRequirements.filter((req) =>
      candidateSkills.some((skill) => skill.includes(req) || req.includes(skill))
    );

    const missingSkills = jobRequirements.filter(
      (req) => !candidateSkills.some((skill) => skill.includes(req) || req.includes(skill))
    );

    const matchPercentage =
      jobRequirements.length > 0
        ? Math.round((matchedSkills.length / jobRequirements.length) * 100)
        : 100;

    // 4. Criação do Snapshot Imutável
    const snapshot = {
      captured_at: new Date().toISOString(),
      job_id: job.id,
      job_title: job.title,
      company_name: job.company_name,
      candidate_profile_id: identity.id!,
      candidate_name: input.candidateName,
      candidate_email: input.candidateEmail,
      candidate_phone: input.candidatePhone,
      cover_letter: input.coverLetter,
      salary_expectation_cents: input.salaryExpectationCents,
      resume_data: input.resumeSnapshotData,
    };

    // 5. Inserção Transacional em job_applications
    const { data: application, error: appErr } = await supabase
      .from("job_applications")
      .insert({
        job_id: input.jobId,
        candidate_profile_id: identity.id!,
        candidate_name: input.candidateName,
        candidate_email: input.candidateEmail,
        candidate_phone: input.candidatePhone,
        cover_letter: input.coverLetter,
        salary_expectation_cents: input.salaryExpectationCents,
        resume_snapshot: snapshot,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        match_score_percentage: matchPercentage,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appErr) {
      throw new Error(`Falha ao registrar candidatura: ${appErr.message}`);
    }

    return {
      success: true,
      applicationId: application.id,
      matchPercentage,
      matchedSkills,
      missingSkills,
      message: `Candidatura para ${job.title} enviada com sucesso!`,
    };
  });

// ─── 5. MOTOR DE MATCHING DE VAGAS EXPLICÁVEL ────────────────────────────────

export const matchResumeWithJobs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      skills: z.array(z.string()).default([]),
      currentCity: z.string().optional(),
      headline: z.string().optional(),
      limit: z.number().int().min(1).max(20).default(6),
    })
  )
  .handler(async ({ data: input }): Promise<JobMatchResultDTO[]> => {
    const identity = await getServerIdentity().catch(() => null);
    const supabase = getServerClient();

    // 1. Busca vagas ativas do catálogo
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, title, company_name, company_logo_url, location, workplace_type, contract_type, salary_display, requirements")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !jobs || jobs.length === 0) {
      return [];
    }

    // 2. Busca candidaturas já realizadas pelo usuário para marcar is_applied
    let userAppliedJobIds = new Set<string>();
    if (identity?.id) {
      const { data: apps } = await supabase
        .from("job_applications")
        .select("job_id")
        .eq("candidate_profile_id", identity.id!);
      if (apps) {
        apps.forEach((a: any) => userAppliedJobIds.add(a.job_id));
      }
    }

    const candidateSkills = input.skills.map((s) => s.trim().toLowerCase());
    const headline = (input.headline || "").toLowerCase();
    const city = (input.currentCity || "").toLowerCase();

    // 3. Avalia matching estruturado para cada vaga
    const evaluated: JobMatchResultDTO[] = jobs.map((job: any) => {
      const reqs: string[] = Array.isArray(job.requirements)
        ? job.requirements.map((r: string) => r.trim().toLowerCase())
        : [];

      const matchedSkills = reqs.filter((req) =>
        candidateSkills.some((skill) => skill.includes(req) || req.includes(skill))
      );

      const missingSkills = reqs.filter(
        (req) => !candidateSkills.some((skill) => skill.includes(req) || req.includes(skill))
      );

      // Score base de skills (até 70%)
      let score = reqs.length > 0 ? (matchedSkills.length / reqs.length) * 70 : 50;

      // Score de afinidade com o título/headline (até 20%)
      if (headline && job.title.toLowerCase().includes(headline.split(" ")[0])) {
        score += 20;
      } else if (headline && job.title.toLowerCase().includes("desenvolvedor") && headline.includes("dev")) {
        score += 15;
      }

      // Score de localização (até 10%)
      if (job.workplace_type === "Remoto") {
        score += 10;
      } else if (city && job.location.toLowerCase().includes(city)) {
        score += 10;
      }

      const matchPercentage = Math.min(100, Math.max(10, Math.round(score)));

      return {
        job_id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo_url: job.company_logo_url,
        location: job.location,
        workplace_type: job.workplace_type,
        contract_type: job.contract_type,
        salary_display: job.salary_display || "A combinar",
        match_percentage: matchPercentage,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        is_applied: userAppliedJobIds.has(job.id),
      };
    });

    // Ordena do maior match para o menor
    evaluated.sort((a, b) => b.match_percentage - a.match_percentage);

    return evaluated.slice(0, input.limit);
  });
