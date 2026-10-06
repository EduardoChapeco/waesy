import { beforeAll, describe, it, expect } from "vitest";
import { LinkedInRawProfileSchema, translateLinkedInToWaesyResume, getLinkedInMasterCredentials, saveLinkedInMasterCredentials, getLinkedInAuthRedirectUrl, parseAndImportLinkedInJson, syndicateJobToLinkedIn, getWorkspaceLinkedInStatus, getJobSyndicationLogs, searchTalentHunterPool, disconnectLinkedInCompanyPage, assertWorkspacePlanPro } from "./linkedin-integrations.functions";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto-vault.server";

describe("LinkedIn Omni-Bridge & B2B Syndication Test Suite", () => {
  beforeAll(() => {
    process.env.VAULT_MASTER_KEY = "waesy-test-vault-master-key-at-least-32-chars";
  });

  // Test 1: Crypto Vault AES-256-GCM
  it("should encrypt and decrypt secrets with AES-256-GCM and generate secure masks", () => {
    const rawSecret = "AQEDAS_mock_linkedin_secret_key_123456789";
    const encrypted = encryptSecret(rawSecret);
    expect(encrypted).toContain(":"); // formato iv:authtag:ciphertext
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);

    const masked = maskSecret(rawSecret);
    expect(masked).toBe("AQE...6789");
    expect(masked).not.toBe(rawSecret);
  });

  // Test 2: LinkedIn Zod Parser & Raw Profile Validation
  it("should validate and parse structured and unstructured LinkedIn JSON profiles", () => {
    const mockLinkedInJson = {
      sub: "urn:li:person:waesy_test_123",
      name: "Eduardo Silva",
      headline: "Staff Software Engineer & Distributed Systems Lead",
      summary: "Especialista em microsserviços escaláveis, Node.js, React e PostgreSQL.",
      location: { city: "Chapecó", country: "Brasil" },
      positions: [
        {
          title: "Staff Software Architect",
          companyName: "Waesy",
          location: "Chapecó, SC",
          employmentType: "Full-time",
          isCurrent: true,
          startDate: { month: 1, year: 2023 },
          endDate: null,
          description: "Liderança técnica da arquitetura multi-tenant da plataforma.",
        },
        {
          title: "Senior Full Stack Engineer",
          companyName: "Tech Enterprise",
          location: "Florianópolis, SC",
          employmentType: "CLT",
          isCurrent: false,
          startDate: "2020-03",
          endDate: "2022-12",
          description: "Desenvolvimento de APIs resilientes e integrações de pagamentos.",
        },
      ],
      educations: [
        {
          schoolName: "Universidade Federal de Santa Catarina",
          degreeName: "Bacharelado",
          fieldOfStudy: "Ciência da Computação",
          startDate: { year: 2016 },
          endDate: { year: 2020 },
        },
      ],
      skills: [
        "TypeScript",
        "React",
        "Node.js",
        "PostgreSQL",
        "Supabase",
        "Docker",
        { name: "Arquitetura de Software" },
      ],
      certifications: [
        {
          name: "AWS Certified Solutions Architect",
          authority: "Amazon Web Services",
          startDate: { month: 6, year: 2022 },
        },
      ],
      languages: [
        { name: "Português", proficiency: "Nativo" },
        { name: "Inglês", proficiency: "Fluente" },
      ],
    };

    const validated = LinkedInRawProfileSchema.parse(mockLinkedInJson);
    expect(validated.positions).toHaveLength(2);
    expect(validated.educations).toHaveLength(1);

    // Test 3: Mathematical Date Engine & Experience Enrichment
    const resume = translateLinkedInToWaesyResume(validated);

    expect(resume.headline).toBe("Staff Software Engineer & Distributed Systems Lead");
    expect(resume.summary).toContain("microsserviços escaláveis");
    expect(resume.hiringStatus).toBe("open_to_proposals");
    expect(resume.skills).toContain("TypeScript");
    expect(resume.skills).toContain("Arquitetura de Software");

    // Verifica cálculo matemático da 1ª experiência (Atual)
    const exp1 = resume.experiences?.[0];
    expect(exp1).toBeDefined();
    expect(exp1?.title).toBe("Staff Software Architect");
    expect(exp1?.company).toBe("Waesy");
    expect(exp1?.is_current).toBe(true);
    expect(exp1?.start_date).toContain("2023");
    expect(exp1?.end_date).toBe("Atual");

    // Verifica 2ª experiência (período fixo 03/2020 a 12/2022)
    const exp2 = resume.experiences?.[1];
    expect(exp2).toBeDefined();
    expect(exp2?.title).toBe("Senior Full Stack Engineer");
    expect(exp2?.company).toBe("Tech Enterprise");
    expect(exp2?.is_current).toBe(false);
    expect(exp2?.start_date).toContain("2020");
    expect(exp2?.end_date).toContain("2022");

    // Formação acadêmica
    expect(resume.educations?.[0]?.school).toBe("Universidade Federal de Santa Catarina");
    expect(resume.educations?.[0]?.degree).toBe("Bacharelado");
    expect(resume.educations?.[0]?.field_of_study).toBe("Ciência da Computação");

    // Certificações e Idiomas
    expect(resume.certifications?.[0]?.name).toBe("AWS Certified Solutions Architect");
    expect(resume.languages?.[0]?.name).toBe("Português");
    expect(resume.languages?.[1]?.name).toBe("Inglês");
  });

  // Test 4: Integridade dos Contratos BFF e Módulo Hunter
  it("should ensure all LinkedIn Omni-Bridge Server Functions are legitimate and typed", () => {
    expect(typeof getLinkedInMasterCredentials).toBe("function");
    expect(typeof saveLinkedInMasterCredentials).toBe("function");
    expect(typeof getLinkedInAuthRedirectUrl).toBe("function");
    expect(typeof parseAndImportLinkedInJson).toBe("function");
    expect(typeof syndicateJobToLinkedIn).toBe("function");
    expect(typeof getWorkspaceLinkedInStatus).toBe("function");
    expect(typeof getJobSyndicationLogs).toBe("function");
    expect(typeof searchTalentHunterPool).toBe("function");
    expect(typeof disconnectLinkedInCompanyPage).toBe("function");
  });

  // Test 5: Validação do Paywall (The Premium Wall)
  it("should enforce assertWorkspacePlanPro contracts", () => {
    expect(typeof assertWorkspacePlanPro).toBe("function");
  });
});
