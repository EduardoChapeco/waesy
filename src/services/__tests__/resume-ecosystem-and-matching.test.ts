import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start para execução direta e limpa em testes
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

// Mock do supabase e auth
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockSupabase,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({
    id: "profile-test-123",
    profileId: "profile-test-123",
    email: "candidato@waesy.com",
    role: "civil",
  }),
}));

import {
  listUserResumes,
  saveUserResume,
  duplicateUserResume,
  applyToJobWithSnapshot,
  matchResumeWithJobs,
} from "../resumes.functions";

describe("Resume Ecosystem & Job Matching Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Listagem e Resiliência de Múltiplos Currículos", () => {
    it("deve sintetizar currículo padrão a partir de profiles.resume_data quando tabela resumes estiver vazia", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "resumes") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "profile-test-123",
                full_name: "Mariana Souza",
                bio: "Especialista em Logística",
                resume_data: {
                  headline: "Coordenadora de Logística",
                  skills: ["Gestão de Frotas", "Roteirização", "ERP"],
                  experiences: [
                    { title: "Analista de Logística", company: "Expresso Oeste" },
                  ],
                },
              },
            }),
          };
        }
        return {};
      });

      const resumes = await listUserResumes();
      expect(resumes).toHaveLength(1);
      expect(resumes[0].title).toBe("Currículo Geral");
      expect(resumes[0].is_default).toBe(true);
      expect(resumes[0].data.headline).toBe("Coordenadora de Logística");
      expect(resumes[0].data.skills).toContain("Gestão de Frotas");
    });
  });

  describe("2. Salvamento e Sincronização Bidirecional", () => {
    it("deve persistir currículo e sincronizar com profiles quando for o default", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "resume-novo-1", title: "Currículo de Tecnologia", slug: "curriculo-de-tecnologia" },
            error: null,
          }),
        }),
      });

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(null),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "resumes") {
          return {
            insert: mockInsert,
            update: vi.fn().mockReturnThis(),
          };
        }
        if (table === "profiles") {
          return {
            update: mockProfileUpdate,
          };
        }
        return {};
      });

      const res = await saveUserResume({
        data: {
          title: "Currículo de Tecnologia",
          isDefault: true,
          templateId: "ats_friendly",
          accentColor: "#0f172a",
          fontFamily: "sans",
          spacingDensity: "normal",
          showPhoto: false,
          data: {
            headline: "Desenvolvedor Full Stack",
            skills: ["React", "TypeScript", "Node.js"],
          },
        },
      });

      expect(res.success).toBe(true);
      expect(res.title).toBe("Currículo de Tecnologia");
      expect(mockProfileUpdate).toHaveBeenCalled();
    });
  });

  describe("3. Duplicação de Currículo para Nicho/Vaga", () => {
    it("deve clonar dados do currículo existente com novo título e slug único", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "resumes") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "res-orig-1",
                data: { skills: ["Vendas B2B", "Negociação"] },
                template_id: "modern",
              },
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "res-cloned-2",
                    title: "Currículo Comercial - Vaga X",
                    slug: "curriculo-comercial-vaga-x-a1b2",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await duplicateUserResume({
        data: {
          sourceResumeId: "res-orig-1",
          newTitle: "Currículo Comercial - Vaga X",
        },
      });

      expect(res.success).toBe(true);
      expect(res.duplicatedResume.id).toBe("res-cloned-2");
    });
  });

  describe("4. Candidatura Rápida em 1 Clique com Snapshot Imutável", () => {
    it("deve calcular matching explicável e criar snapshot imutável em job_applications", async () => {
      const mockJob = {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Desenvolvedor Front-end React",
        company_name: "Tech Soluções",
        requirements: ["React", "TypeScript", "Tailwind CSS", "GraphQL"],
        location: "São Miguel do Oeste, SC",
        status: "active",
      };

      const mockInsertApplication = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "app-created-999" },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "jobs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
          };
        }
        if (table === "job_applications") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }), // sem candidatura anterior
            insert: mockInsertApplication,
          };
        }
        return {};
      });

      const res = await applyToJobWithSnapshot({
        data: {
          jobId: "11111111-1111-1111-1111-111111111111",
          candidateName: "Lucas Dev",
          candidateEmail: "lucas@waesy.com",
          candidatePhone: "(49) 98888-7777",
          coverLetter: "Olá, tenho interesse na vaga.",
          salaryExpectationCents: 600000,
          resumeSnapshotData: {
            skills: ["React", "TypeScript", "Tailwind CSS", "Git"],
            headline: "Front-end Specialist",
            experiences: [{ title: "Dev Pleno", company: "Startup Sul" }],
          },
        },
      });

      expect(res.success).toBe(true);
      expect(res.applicationId).toBe("app-created-999");
      // 3 de 4 requirements atendidos (React, TypeScript, Tailwind) -> 75%
      expect(res.matchPercentage).toBe(75);
      expect(res.matchedSkills).toContain("react");
      expect(res.matchedSkills).toContain("typescript");
      expect(res.missingSkills).toContain("graphql");

      // Verifica se o snapshot foi passado para a inserção
      const insertCall = mockInsertApplication.mock.calls[0][0];
      expect(insertCall.resume_snapshot).toBeDefined();
      expect(insertCall.resume_snapshot.candidate_name).toBe("Lucas Dev");
      expect(insertCall.status).toBe("pending");
    });

    it("deve rejeitar candidatura duplicada para a mesma vaga com mensagem clara", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "jobs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "11111111-1111-1111-1111-111111111111", status: "active" },
            }),
          };
        }
        if (table === "job_applications") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "app-antiga-1", status: "pending", created_at: "2026-10-15T10:00:00Z" },
            }),
          };
        }
        return {};
      });

      await expect(
        applyToJobWithSnapshot({
          data: {
            jobId: "11111111-1111-1111-1111-111111111111",
            candidateName: "Lucas Dev",
            candidateEmail: "lucas@waesy.com",
            candidatePhone: "(49) 98888-7777",
            resumeSnapshotData: { skills: ["React"] },
          },
        })
      ).rejects.toThrow(/Você já enviou uma candidatura para esta vaga/);
    });
  });

  describe("5. Motor de Matching de Vagas Explicável", () => {
    it("deve ranquear vagas pelo percentual de compatibilidade e sinalizar competências faltantes", async () => {
      const mockJobs = [
        {
          id: "job-1",
          title: "Vendedor Interno",
          company_name: "Loja Central",
          location: "São Miguel do Oeste, SC",
          workplace_type: "Presencial",
          requirements: ["Atendimento ao Cliente", "Vendas", "Negociação"],
        },
        {
          id: "job-2",
          title: "Programador React",
          company_name: "Software House",
          location: "Remoto",
          workplace_type: "Remoto",
          requirements: ["React", "TypeScript", "Node.js"],
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "jobs") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
          };
        }
        if (table === "job_applications") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [] }),
          };
        }
        return {};
      });

      const results = await matchResumeWithJobs({
        data: {
          skills: ["React", "TypeScript", "Tailwind CSS"],
          headline: "Desenvolvedor React",
          currentCity: "São Miguel do Oeste",
          limit: 5,
        },
      });

      expect(results).toHaveLength(2);
      // job-2 deve ter maior match (React, TypeScript + Remoto + headline matching)
      expect(results[0].job_id).toBe("job-2");
      expect(results[0].match_percentage).toBeGreaterThan(results[1].match_percentage);
      expect(results[0].matched_skills).toContain("react");
      expect(results[0].missing_skills).toContain("node.js");
    });
  });
});
