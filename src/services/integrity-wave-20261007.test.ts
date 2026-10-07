import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("Onda de integridade Storage/pagamentos/vitrine — invariantes antifake", () => {
  it("não cria buckets em runtime nos caminhos de produção auditados", () => {
    const storage = read("src/services/storage.functions.ts");
    const payments = read("src/services/payment.functions.ts");
    expect(storage).not.toContain("storage.createBucket");
    expect(payments).not.toContain("storage.createBucket");
    expect(storage).not.toContain("Auto-healing");
    expect(payments).not.toContain("Auto-healing");
  });

  it("não fabrica referência de provider para confirmação manual", () => {
    const payments = read("src/services/payment.functions.ts");
    expect(payments).not.toContain("manual_ref_");
    expect(payments).toContain("provider_ref: null");
  });

  it("rejeita resposta do gateway sem ID e sem status reconhecido", () => {
    const gateway = read("src/services/payment-gateway.server.ts");
    expect(gateway).toContain("Gateway retornou resposta sem identificador de pagamento.");
    expect(gateway).toContain("Gateway retornou status de pagamento não reconhecido.");
    expect(gateway).toContain("const providerRef =");
  });

  it("não devolve configuração comercial quando o checkout não resolve uma loja", () => {
    const checkout = read("src/services/checkout.functions.ts");
    expect(checkout).toContain("configuração comercial indisponível");
    expect(checkout).not.toContain("const defaultConfig");
    expect(checkout).not.toContain('niche: "general"');
  });

  it("não injeta cidade, estado, horário ou contrato comercial fictício na vitrine", () => {
    const view = read("src/components/commerce/canonical-store-profile-view.tsx");
    expect(view).not.toContain("São Miguel do Oeste");
    expect(view).not.toContain('"Seg a Sex: 08:00 - 18:00"');
    expect(view).not.toContain('j.contract_type || "CLT"');
    expect(view).not.toContain("recommendRate ?? 100");
  });

  it("não fabrica identidade, endereço ou métricas do diretório", () => {
    const directory = read("src/services/directory.functions.ts");
    expect(directory).not.toContain("Negócio Local");
    expect(directory).not.toContain("Loja Oficial Waesy");
    expect(directory).not.toContain("Atendimento Especializado");
    expect(directory).not.toContain("Seg a Sex: 08:00 - 18:00");
    expect(directory).not.toContain("rating: 5.0");
    expect(directory).not.toContain("reviews_count: 12");
  });

  it("não simula lead turístico quando a persistência real falha", () => {
    const tourism = read("src/components/commerce/dynamic-sections/tourism-quote-hero.tsx");
    expect(tourism).not.toContain("São Miguel do Oeste / SC");
    expect(tourism).toContain("destinationPresets = []");
    expect(tourism).not.toContain(".catch(() => null)");
    expect(tourism).not.toContain("Cliente ||");
  });
});
