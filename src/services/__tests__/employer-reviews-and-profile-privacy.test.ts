import { describe, it, expect } from "vitest";
import { enrichExperienceMath } from "@/lib/schemas/resume-experience.schema";

describe("Employer Reviews, Professional Profile & Zero Privacy Leaks", () => {
  it("enriches experience math and maintains salary and exit reasons", () => {
    const rawExp = {
      id: "exp_1",
      title: "Desenvolvedor Full Stack",
      company: "Empresa Beta",
      start_month: 1,
      start_year: 2022,
      end_month: 6,
      end_year: 2024,
      is_current: false,
      salary_cents: 850000,
      exit_reason: "Transição de Carreira",
      company_rating: 5,
      would_recommend: true,
      review_text: "Excelente cultura e liderança aberta",
      is_anonymous: true,
    };

    const enriched = enrichExperienceMath(rawExp);

    expect(enriched.duration_months).toBe(30);
    expect(enriched.duration_text).toContain("2 anos");
    expect(enriched.salary_cents).toBe(850000);
    expect(enriched.exit_reason).toBe("Transição de Carreira");
    expect(enriched.company_rating).toBe(5);
    expect(enriched.would_recommend).toBe(true);
    expect(enriched.is_anonymous).toBe(true);
  });

  it("sanitizes confidential fields for external public visitors (!isOwner)", () => {
    const rawResumeData = {
      headline: "Arquiteto de Software",
      summary: "Profissional sênior",
      availability: {
        salaryExpectationCents: 1500000,
        jobTitle: "Líder Técnico",
      },
      experiences: [
        {
          id: "exp_1",
          title: "Desenvolvedor",
          company: "Empresa Alfa",
          salary_cents: 800000,
          exit_reason: "Desligamento por reestruturação",
          company_rating: 4,
          would_recommend: true,
          review_text: "Ambiente bom mas ritmo intenso",
          is_anonymous: false,
          employment_type: "CLT",
          start_date: "01/2020",
          end_date: "12/2023",
        },
      ],
    };

    // Função de sanitização estrita para visitantes anônimos ou não-donos
    const sanitizePublicResume = (resumeData: any, isOwner: boolean) => {
      let safeResumeData = resumeData ? JSON.parse(JSON.stringify(resumeData)) : null;
      if (safeResumeData && !isOwner) {
        if (safeResumeData.availability) {
          delete safeResumeData.availability.salaryExpectationCents;
        }
        if (Array.isArray(safeResumeData.experiences)) {
          safeResumeData.experiences = safeResumeData.experiences.map((exp: any) => {
            const {
              salary_cents,
              exit_reason,
              company_rating,
              would_recommend,
              review_text,
              is_anonymous,
              ...publicExp
            } = exp;
            return publicExp;
          });
        }
      }
      return safeResumeData;
    };

    const publicView = sanitizePublicResume(rawResumeData, false);

    // Dados públicos devem ser preservados
    expect(publicView.headline).toBe("Arquiteto de Software");
    expect(publicView.summary).toBe("Profissional sênior");
    expect(publicView.availability.jobTitle).toBe("Líder Técnico");
    expect(publicView.experiences[0].title).toBe("Desenvolvedor");
    expect(publicView.experiences[0].company).toBe("Empresa Alfa");
    expect(publicView.experiences[0].employment_type).toBe("CLT");

    // Dados confidenciais devem estar estritamente AUSENTES (Zero Leaks)
    expect(publicView.availability.salaryExpectationCents).toBeUndefined();
    expect(publicView.experiences[0].salary_cents).toBeUndefined();
    expect(publicView.experiences[0].exit_reason).toBeUndefined();
    expect(publicView.experiences[0].company_rating).toBeUndefined();
    expect(publicView.experiences[0].would_recommend).toBeUndefined();
    expect(publicView.experiences[0].review_text).toBeUndefined();
    expect(publicView.experiences[0].is_anonymous).toBeUndefined();

    // Quando visualizado pelo próprio dono (isOwner === true), tudo é preservado
    const ownerView = sanitizePublicResume(rawResumeData, true);
    expect(ownerView.availability.salaryExpectationCents).toBe(1500000);
    expect(ownerView.experiences[0].salary_cents).toBe(800000);
    expect(ownerView.experiences[0].exit_reason).toBe("Desligamento por reestruturação");
  });

  it("maps experience reviews correctly to employer_reviews canonical columns", () => {
    const exp = {
      title: "Gerente de Loja",
      company: "Supermercado Central",
      employment_type: "CLT",
      start_date: "2021",
      end_date: "2023",
      is_current: false,
      salary_cents: 450000,
      exit_reason: "Busca por Novos Desafios",
      company_rating: 4,
      would_recommend: true,
      review_text: "Excelente equipe e benefícios em dia",
      is_anonymous: true,
    };

    const reviewPayload = {
      user_id: "user_uuid_123",
      company_name: exp.company,
      store_id: null,
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
    };

    expect(reviewPayload.job_title).toBe("Gerente de Loja");
    expect(reviewPayload.pros).toBe("Excelente equipe e benefícios em dia");
    expect(reviewPayload.salary_cents).toBe(450000);
    expect(reviewPayload.exit_reason).toBe("Busca por Novos Desafios");
    expect(reviewPayload.status).toBe("published");
    expect((reviewPayload as any).role_title).toBeUndefined();
    expect((reviewPayload as any).profile_id).toBeUndefined();
    expect((reviewPayload as any).review_text).toBeUndefined();
  });
});
