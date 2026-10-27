import { describe, it, expect } from "vitest";
import {
  validatePaxDocumentMutationPermission,
  auditPaxFlightReadiness,
  type PaxAnamnesisDTO,
} from "../pax-anamnesis-and-accessibility";

describe("Pax Anamnesis, Accessibility PCD & Document Shielding", () => {
  it("permite edição por cliente comum apenas quando o documento estiver em rascunho ou pendente", () => {
    const draftCheck = validatePaxDocumentMutationPermission({
      currentStatus: "draft",
      isStaffOrAgent: false,
    });
    expect(draftCheck.allowed).toBe(true);

    const pendingCheck = validatePaxDocumentMutationPermission({
      currentStatus: "pending_ocr_validation",
      isStaffOrAgent: false,
    });
    expect(pendingCheck.allowed).toBe(true);
  });

  it("bloqueia edição por cliente comum quando documentos estiverem homologados ou blindados (locked_immutable)", () => {
    const homologatedCheck = validatePaxDocumentMutationPermission({
      currentStatus: "agent_homologated",
      isStaffOrAgent: false,
    });
    expect(homologatedCheck.allowed).toBe(false);
    expect(homologatedCheck.reason).toContain("Documentos já homologados e travados");

    const lockedCheck = validatePaxDocumentMutationPermission({
      currentStatus: "locked_immutable",
      isStaffOrAgent: false,
    });
    expect(lockedCheck.allowed).toBe(false);
  });

  it("permite que agente ou staff reabra e edite mesmo se estiver locked_immutable", () => {
    const staffCheck = validatePaxDocumentMutationPermission({
      currentStatus: "locked_immutable",
      isStaffOrAgent: true,
    });
    expect(staffCheck.allowed).toBe(true);
  });

  it("gera alertas operacionais de acessibilidade PNAE (Resolução ANAC 280/2013)", () => {
    const paxSample: PaxAnamnesisDTO = {
      paxId: "11111111-1111-1111-1111-111111111111",
      tripId: "22222222-2222-2222-2222-222222222222",
      fullName: "Maria Helena Santos",
      documentType: "cpf",
      documentNumber: "12345678900",
      birthDate: "1960-05-15",
      nationality: "BRA",
      pcdAssistanceCodes: ["WCHR"],
      requiresCompanion: false,
      medicalClearanceRequired: false,
      dietaryRestrictions: ["gluten_free"],
      emergencyContact: {
        name: "João Santos",
        phone: "49999887766",
        relationship: "Filho",
      },
      documentStatus: "draft",
      updatedAt: new Date().toISOString(),
    };

    const readiness = auditPaxFlightReadiness(paxSample);
    expect(readiness.isReadyForIssuance).toBe(true);
    expect(readiness.warnings.length).toBeGreaterThan(0);
    expect(readiness.warnings[0]).toContain("Notificar Cia aérea");
  });

  it("bloqueia emissão caso MEDIF seja obrigatório e não tenha sido homologado pelo agente", () => {
    const paxWithMedif: PaxAnamnesisDTO = {
      paxId: "33333333-3333-3333-3333-333333333333",
      tripId: "44444444-4444-4444-4444-444444444444",
      fullName: "Fernando Garcia",
      documentType: "cpf",
      documentNumber: "98765432100",
      birthDate: "1985-11-20",
      nationality: "BRA",
      pcdAssistanceCodes: ["MEDIF", "WCHC"],
      requiresCompanion: true,
      medicalClearanceRequired: true,
      dietaryRestrictions: ["standard"],
      emergencyContact: {
        name: "Carla Garcia",
        phone: "49988776655",
        relationship: "Esposa",
      },
      documentStatus: "draft", // Não homologado ainda
      updatedAt: new Date().toISOString(),
    };

    const readiness = auditPaxFlightReadiness(paxWithMedif);
    expect(readiness.isReadyForIssuance).toBe(false);
    expect(readiness.blockers.length).toBe(1);
    expect(readiness.blockers[0]).toContain("Formulário MEDIF pendente de homologação");
  });
});
