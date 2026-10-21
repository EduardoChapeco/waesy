import { describe, it, expect } from "vitest";
import { translateLinkedInToWaesyResume, LinkedInRawProfileSchema } from "../linkedin-integrations.functions";
import type { ResumeDataDTO } from "@/types/resume";

describe("LinkedIn Omni-Bridge & Resume Data Synchronization", () => {
  it("translates comprehensive LinkedIn profile including experiences, educations, certifications, and languages", () => {
    const rawProfile = {
      sub: "urn:li:person:waesy_test_user_456",
      name: "Mariana Alencar",
      headline: "Engenheira de Software & Líder Técnica",
      summary: "Profissional com 8 anos de experiência em sistemas distribuídos e alta escalabilidade.",
      location: { city: "São Miguel do Oeste", country: "Brasil" },
      positions: [
        {
          title: "Tech Lead",
          companyName: "Waesy Soluções",
          location: "São Miguel do Oeste, SC",
          employmentType: "Full-time",
          isCurrent: true,
          startDate: { month: 2, year: 2022 },
          endDate: null,
          description: "Liderança de arquitetura de alta performance e resiliência transacional.",
        },
      ],
      educations: [
        {
          schoolName: "Universidade do Oeste de Santa Catarina",
          degreeName: "Bacharelado",
          fieldOfStudy: "Sistemas de Informação",
          startDate: { year: 2014 },
          endDate: { year: 2018 },
        },
      ],
      certifications: [
        {
          name: "Kubernetes Certified Administrator (CKA)",
          authority: "Linux Foundation",
          startDate: { month: 5, year: 2023 },
          licenseNumber: "CKA-123456",
          url: "https://www.cncf.io/certification/cka/",
        },
      ],
      languages: [
        { name: "Português", proficiency: "Nativo" },
        { name: "Inglês", proficiency: "Avançado" },
      ],
      skills: ["TypeScript", "Go", "PostgreSQL", "Docker", "Kubernetes"],
    };

    const validated = LinkedInRawProfileSchema.parse(rawProfile);
    const resume = translateLinkedInToWaesyResume(validated);

    // 1. Headline e Resumo
    expect(resume.headline).toBe("Engenheira de Software & Líder Técnica");
    expect(resume.summary).toContain("8 anos de experiência");

    // 2. Experiências com cálculo de tempo
    expect(resume.experiences).toHaveLength(1);
    expect(resume.experiences?.[0].title).toBe("Tech Lead");
    expect(resume.experiences?.[0].company).toBe("Waesy Soluções");
    expect(resume.experiences?.[0].is_current).toBe(true);

    // 3. Formação
    expect(resume.educations).toHaveLength(1);
    expect(resume.educations?.[0].school).toBe("Universidade do Oeste de Santa Catarina");

    // 4. Certificações
    expect(resume.certifications).toHaveLength(1);
    expect(resume.certifications?.[0].name).toBe("Kubernetes Certified Administrator (CKA)");
    expect(resume.certifications?.[0].issuer).toBe("Linux Foundation");
    expect(resume.certifications?.[0].credential_id).toBe("CKA-123456");

    // 5. Idiomas
    expect(resume.languages).toHaveLength(2);
    expect(resume.languages?.[0].name).toBe("Português");
    expect(resume.languages?.[0].proficiency).toBe("native");
    expect(resume.languages?.[1].name).toBe("Inglês");
    expect(resume.languages?.[1].proficiency).toBe("advanced");

    // 6. Skills
    expect(resume.skills).toContain("TypeScript");
    expect(resume.skills).toContain("Kubernetes");
  });

  it("ensures defensive resolution of camelCase and snake_case profile fields", () => {
    // Simula perfil retornado pelo BFF getProfile() (camelCase)
    const bffProfile = {
      id: "usr_123",
      fullName: "Carlos Eduardo Santos",
      avatarUrl: "https://waesy.com.br/avatars/carlos.jpg",
      phone: "49999998888",
      resume_data: {
        headline: "Engenheiro Civil",
        summary: "Especialista em obras prediais.",
        licenses: [
          {
            id: "lic_1",
            council: "CREA",
            register_number: "123456-D",
            uf: "SC",
            specialty: "Engenharia de Estruturas",
          },
        ],
      },
    };

    // Resolução defensiva utilizada no MeuCurriculoPage e JobApplySheet
    const resolvedName = (bffProfile as any).fullName || (bffProfile as any).full_name || "";
    const resolvedAvatar = (bffProfile as any).avatarUrl || (bffProfile as any).avatar_url || "";
    const resolvedOccupation = (bffProfile as any).occupation || bffProfile.resume_data?.headline || "";

    expect(resolvedName).toBe("Carlos Eduardo Santos");
    expect(resolvedAvatar).toBe("https://waesy.com.br/avatars/carlos.jpg");
    expect(resolvedOccupation).toBe("Engenheiro Civil");
    expect(bffProfile.resume_data.licenses?.[0].council).toBe("CREA");
  });
});
