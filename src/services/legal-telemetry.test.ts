import { describe, it, expect } from "vitest";
import { CANONICAL_LEGAL_POLICIES, type LegalPolicyType } from "@/types/legal-consent";
import { savePoliciesSchema } from "@/services/store.functions";
import crypto from "node:crypto";

describe("Governança de Consentimento LGPD & Telemetria Forense Militar", () => {
  it("1. Deve conter as 5 políticas canônicas normativas com base legal e versão", () => {
    const requiredPolicies: LegalPolicyType[] = [
      "privacy_policy",
      "quotation_policy",
      "sensitive_data_policy",
      "cancellation_policy",
      "terms_of_service",
    ];

    for (const pKey of requiredPolicies) {
      const descriptor = CANONICAL_LEGAL_POLICIES[pKey];
      expect(descriptor).toBeDefined();
      expect(descriptor.title).toBeTruthy();
      expect(descriptor.legalBasis).toBeTruthy();
      expect(descriptor.defaultVersion).toBe("v1.0");
      expect(descriptor.defaultContent.length).toBeGreaterThan(20);
    }
  });

  it("2. Deve gerar hash SHA-256 e código de certidão militar probatório inviolável", () => {
    const rawIp = "187.55.210.42";
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    const policyType = "privacy_policy";
    const version = "v1.0";
    const content = CANONICAL_LEGAL_POLICIES.privacy_policy.defaultContent;
    const acceptedAt = new Date().toISOString();
    const certificateCode = `WAESY-LGPD-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const hashSource = `${rawIp}|${userAgent}|${policyType}|${version}|${content}|${acceptedAt}|${certificateCode}`;
    const sha256Hash = crypto.createHash("sha256").update(hashSource).digest("hex");

    expect(sha256Hash).toHaveLength(64);
    expect(certificateCode.startsWith("WAESY-LGPD-")).toBe(true);
    const certParts = certificateCode.split("-");
    expect(certParts).toHaveLength(4);
    expect(certParts[2]).toHaveLength(8);
  });

  it("3. savePoliciesSchema deve validar políticas comerciais, dados sensíveis e cancelamento", () => {
    const samplePayload = {
      privacy_policy: "Texto de privacidade customizado da agência",
      return_policy: "Regras de devolução",
      terms: "Termos gerais",
      quotation_policy: "Validade de tarifa aérea até 23h59",
      sensitive_data_policy: "Consentimento específico para vacina febre amarela e vistos",
      cancellation_policy: "Multa de 20% após 7 dias",
      custom_policies: {
        normas_bagagem: "Franquia máxima de 23kg por passageiro",
      },
    };

    const parsed = savePoliciesSchema.safeParse(samplePayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.quotation_policy).toContain("23h59");
      expect(parsed.data.sensitive_data_policy).toContain("febre amarela");
      expect(parsed.data.cancellation_policy).toContain("Multa de 20%");
    }
  });

  it("4. savePoliciesSchema deve aceitar objeto vazio ou com campos parciais com fallbacks padrão", () => {
    const minimalPayload = {};
    const parsed = savePoliciesSchema.safeParse(minimalPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.privacy_policy).toBe("");
      expect(parsed.data.quotation_policy).toBe("");
      expect(parsed.data.custom_policies).toEqual({});
    }
  });
});
