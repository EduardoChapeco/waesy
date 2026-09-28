import { describe, it, expect } from "vitest";
import { submitCourierApplicationSchema, vehicleTypeEnum } from "./courier-verification.functions";
import { z } from "zod";

// Schema de auditoria master espelhado para testes unitários isolados
const auditCourierApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["match_approved", "divergence_flagged", "fraud_rejected", "requires_resubmission"]),
  rejectionReason: z.string().optional(),
  notifyPolice: z.boolean().default(false),
  policeReportProtocol: z.string().optional(),
  internalNotes: z.string().optional(),
});

// Funções de apoio idênticas à lógica interna do serviço
function cleanDigits(val: string): string {
  return (val || "").replace(/\D/g, "");
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || "").trim().toLowerCase();
  const s2 = (str2 || "").trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

function evaluateCrosscheck(params: {
  candidateName: string;
  candidateCpf: string;
  profileName: string;
  profileCpf: string;
}) {
  const divergenceReasons: string[] = [];
  const candidateCpfClean = cleanDigits(params.candidateCpf);
  const profileCpfClean = cleanDigits(params.profileCpf);

  let cpfMatch = true;
  let isDivergent = false;

  if (profileCpfClean && candidateCpfClean !== profileCpfClean) {
    divergenceReasons.push("CPF informado difere do CPF cadastrado no perfil titular.");
    cpfMatch = false;
    isDivergent = true;
  }

  const nameSimilarity = calculateStringSimilarity(params.candidateName, params.profileName);
  if (nameSimilarity < 0.6) {
    divergenceReasons.push(
      `Nome do condutor ('${params.candidateName}') apresenta baixa correspondência com o titular da conta ('${params.profileName}').`
    );
    isDivergent = true;
  }

  return {
    isDivergent,
    cpfMatch,
    nameSimilarity,
    divergenceReasons,
    status: isDivergent ? "divergence_flagged" : "match_approved",
  };
}

describe("Courier Verification, Cross-Check & Fraud Prevention (Ciclo 87)", () => {
  describe("1. Validação de Schemas Zod (Submissão de Candidatura)", () => {
    it("deve rejeitar submissão se os termos de autonomia e não-vínculo não forem aceitos", () => {
      const invalidPayload = {
        full_name: "Carlos Alberto da Silva",
        cpf: "123.456.789-00",
        document_type: "cnh" as const,
        document_number: "12345678900",
        document_front_url: "https://storage.usewaesy.com/cnh-front.jpg",
        selfie_url: "https://storage.usewaesy.com/selfie.jpg",
        liveness_video_url: "https://storage.usewaesy.com/liveness.mp4",
        vehicle_type: "motorcycle" as const,
        terms_accepted: false,
      };

      const result = submitCourierApplicationSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("obrigatório aceitar os Termos");
      }
    });

    it("deve validar payload completo de candidatura com CNH, selfie e prova de vida", () => {
      const validPayload = {
        full_name: "Carlos Alberto da Silva",
        cpf: "123.456.789-00",
        document_type: "cnh" as const,
        document_number: "12345678900",
        document_front_url: "https://storage.usewaesy.com/cnh-front.jpg",
        document_back_url: "https://storage.usewaesy.com/cnh-back.jpg",
        selfie_url: "https://storage.usewaesy.com/selfie.jpg",
        liveness_video_url: "https://storage.usewaesy.com/liveness.mp4",
        vehicle_type: "motorcycle" as const,
        vehicle_plate: "ABC-1234",
        vehicle_model: "Honda CG 160",
        vehicle_color: "Vermelha",
        terms_accepted: true,
      };

      const result = submitCourierApplicationSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vehicle_type).toBe("motorcycle");
        expect(result.data.full_name).toBe("Carlos Alberto da Silva");
      }
    });

    it("deve restringir os tipos de veículos autorizados no ecossistema", () => {
      expect(vehicleTypeEnum.options).toEqual(["motorcycle", "car", "van", "truck", "bicycle"]);
      expect(vehicleTypeEnum.safeParse("airplane").success).toBe(false);
      expect(vehicleTypeEnum.safeParse("motorcycle").success).toBe(true);
    });
  });

  describe("2. Inteligência de Cross-Check & Detecção de Fraude de Identidade", () => {
    it("deve aprovar (match_approved) quando CPF e Nome do condutor batem com o perfil titular", () => {
      const evaluation = evaluateCrosscheck({
        candidateName: "Carlos Alberto da Silva",
        candidateCpf: "123.456.789-00",
        profileName: "Carlos Alberto da Silva",
        profileCpf: "12345678900",
      });

      expect(evaluation.status).toBe("match_approved");
      expect(evaluation.isDivergent).toBe(false);
      expect(evaluation.cpfMatch).toBe(true);
      expect(evaluation.nameSimilarity).toBe(1.0);
      expect(evaluation.divergenceReasons).toHaveLength(0);
    });

    it("deve sinalizar divergência (divergence_flagged) quando o CPF informado difere da conta titular", () => {
      const evaluation = evaluateCrosscheck({
        candidateName: "Carlos Alberto da Silva",
        candidateCpf: "999.888.777-66", // Tentando cadastrar com CPF de outra pessoa
        profileName: "Carlos Alberto da Silva",
        profileCpf: "123.456.789-00",
      });

      expect(evaluation.status).toBe("divergence_flagged");
      expect(evaluation.isDivergent).toBe(true);
      expect(evaluation.cpfMatch).toBe(false);
      expect(evaluation.divergenceReasons[0]).toContain("CPF informado difere do CPF cadastrado");
    });

    it("deve sinalizar divergência quando o nome do condutor for de terceiro (ex: conta emprestada)", () => {
      const evaluation = evaluateCrosscheck({
        candidateName: "Maria Aparecida dos Santos",
        candidateCpf: "123.456.789-00",
        profileName: "João Pedro Oliveira",
        profileCpf: "123.456.789-00",
      });

      expect(evaluation.status).toBe("divergence_flagged");
      expect(evaluation.isDivergent).toBe(true);
      expect(evaluation.nameSimilarity).toBeLessThan(0.6);
      expect(evaluation.divergenceReasons[0]).toContain("baixa correspondência");
    });
  });

  describe("3. Governança Master & Auditoria Forense", () => {
    it("deve validar payload de auditoria com rejeição por fraude e alerta policial", () => {
      const auditPayload = {
        applicationId: "a0000000-0000-0000-0000-000000000001",
        decision: "fraud_rejected" as const,
        rejectionReason: "Uso de CNH de terceiro com selfie clonada.",
        notifyPolice: true,
        policeReportProtocol: "BO-2026-994821",
        internalNotes: "Encaminhado para a Delegacia de Crimes Cibernéticos.",
      };

      const result = auditCourierApplicationSchema.safeParse(auditPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyPolice).toBe(true);
        expect(result.data.policeReportProtocol).toBe("BO-2026-994821");
      }
    });

    it("deve rejeitar auditoria com applicationId inválido (não-UUID)", () => {
      const invalidAuditPayload = {
        applicationId: "not-a-uuid-123",
        decision: "match_approved" as const,
      };

      const result = auditCourierApplicationSchema.safeParse(invalidAuditPayload);
      expect(result.success).toBe(false);
    });
  });
});
