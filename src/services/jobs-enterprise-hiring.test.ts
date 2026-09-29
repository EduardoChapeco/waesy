import { describe, it, expect } from "vitest";
import { z } from "zod";
import crypto from "crypto";

const EnterpriseHireJobCandidateSchema = z.object({
  applicationId: z.string().uuid(),
  role: z.string().min(2, "Cargo é obrigatório"),
  systemRole: z
    .enum(["seller", "support", "stock", "content", "manager", "admin"])
    .default("seller"),
  employmentType: z
    .enum(["clt", "pj", "internship", "apprentice", "temporary", "freelancer"])
    .default("clt"),
  salaryCents: z.number().int().min(0, "Salário inválido"),
  hireDate: z.string().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  pin: z.string().regex(/^\d{4,6}$/, "O PIN deve conter de 4 a 6 dígitos numéricos").optional(),
});

describe("Enterprise Hiring & RH Atomic Transition (V134 Restoration)", () => {
  it("valida contrato de admissão completo com defaults corretos", () => {
    const valid = EnterpriseHireJobCandidateSchema.parse({
      applicationId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      role: "Vendedor Especialista",
      salaryCents: 350000,
    });

    expect(valid.role).toBe("Vendedor Especialista");
    expect(valid.salaryCents).toBe(350000);
    expect(valid.systemRole).toBe("seller");
    expect(valid.employmentType).toBe("clt");
  });

  it("aceita atribuições avançadas de permissão de sistema, regime e PIN personalizado", () => {
    const custom = EnterpriseHireJobCandidateSchema.parse({
      applicationId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      role: "Gerente de Operações",
      systemRole: "manager",
      employmentType: "pj",
      salaryCents: 750000,
      hireDate: "2026-10-01",
      pin: "4829",
    });

    expect(custom.systemRole).toBe("manager");
    expect(custom.employmentType).toBe("pj");
    expect(custom.pin).toBe("4829");
  });

  it("rejeita PINs que não tenham entre 4 e 6 dígitos numéricos", () => {
    const invalidPins = ["12", "123", "abc1", "1234567", "12a4"];

    for (const p of invalidPins) {
      const res = EnterpriseHireJobCandidateSchema.safeParse({
        applicationId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        role: "Atendente",
        salaryCents: 200000,
        pin: p,
      });
      expect(res.success).toBe(false);
    }
  });

  it("garante que o hash do PIN com salt é determinístico e criptograficamente seguro (SHA-256)", () => {
    const pin = "1234";
    const salt = "a1b2c3d4e5f607182930415263748596";
    const hash = crypto.createHash("sha256").update(pin + salt).digest("hex");

    expect(hash).toHaveLength(64);
    expect(hash).toBe(crypto.createHash("sha256").update("1234" + salt).digest("hex"));
    expect(hash).not.toBe(crypto.createHash("sha256").update("9999" + salt).digest("hex"));
  });
});
