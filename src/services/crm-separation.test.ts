import { describe, it, expect } from "vitest";
import { createCustomerSchema, updateCustomerSchema, createCustomerDocumentSchema, listCustomersInputSchema } from "@/services/crm.functions";

describe("Separação Arquitetural: Carteira de Clientes 360° vs. Funil Comercial (CRM Kanban)", () => {
 it("valida o schema de criação de cliente individual (B2C) com CPF e dados cadastrais", () => {
 const validB2C = {
 kind: "individual" as const,
 fullName: "Mariana Silva Ramos",
 document: "123.456.789-00",
 rg: "4.888.777 SSP/SC",
 email: "mariana.ramos@exemplo.com",
 phone: "(49) 99999-8888",
 channel: "whatsapp",
 city: "São Miguel do Oeste",
 state: "SC",
 status: "active" as const,
 creditLimitCents: 50000,
 tags: ["VIP", "Passageiro Frequente"],
 };

 const parsed = createCustomerSchema.safeParse(validB2C);
 expect(parsed.success).toBe(true);
 if (parsed.success) {
 expect(parsed.data.kind).toBe("individual");
 expect(parsed.data.fullName).toBe("Mariana Silva Ramos");
 expect(parsed.data.tags).toContain("VIP");
 }
 });

 it("valida o schema de criação de cliente corporativo (B2B) com CNPJ e Razão Social", () => {
 const validB2B = {
 kind: "company" as const,
 fullName: "Tech Solutions Brasil",
 legalName: "Tech Solutions Serviços de Tecnologia LTDA",
 document: "12.345.678/0001-90",
 email: "contato@techsolutions.com.br",
 phone: "(49) 3622-1122",
 channel: "direct",
 city: "Chapecó",
 state: "SC",
 status: "active" as const,
 creditLimitCents: 200000,
 tags: ["Corporativo", "Faturamento Mensal"],
 };

 const parsed = createCustomerSchema.safeParse(validB2B);
 expect(parsed.success).toBe(true);
 if (parsed.success) {
 expect(parsed.data.kind).toBe("company");
 expect(parsed.data.legalName).toBe("Tech Solutions Serviços de Tecnologia LTDA");
 }
 });

 it("valida os 9 tipos canônicos de documentos de clientes com suporte a validade (Passaporte, CNH, Vistos)", () => {
 const dummyCustomerId = "d21869c6-6545-4a52-a383-10098ef180ec";
 const docTypes = [
 "passport",
 "cnh",
 "rg",
 "cpf",
 "visa",
 "vaccination_card",
 "contract",
 "proof_of_residence",
 "other",
 ] as const;

 for (const type of docTypes) {
 const parsed = createCustomerDocumentSchema.safeParse({
 customerId: dummyCustomerId,
 docType: type,
 docNumber: "DOC123456",
 issuedAt: "2024-01-10",
 expiresAt: "2034-01-10",
 notes: "Documento oficial verificado",
 });
 expect(parsed.success).toBe(true);
 }
 });

 it("valida o schema de filtros da Carteira de Clientes", () => {
 const filter = {
 query: "Mariana",
 status: "active" as const,
 kind: "individual" as const,
 channel: "whatsapp",
 city: "São Miguel do Oeste",
 };

 const parsed = listCustomersInputSchema.safeParse(filter);
 expect(parsed.success).toBe(true);
 });
});
