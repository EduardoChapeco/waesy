import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Cross-Module CRM, Contracts & Silent Design Integrations (Big Tech Council Audit)", () => {
  it("1. Deve conter queries de travel_proposals e contracts no getCustomer360", () => {
    const crmFuncsPath = path.resolve(__dirname, "crm.functions.ts");
    const content = fs.readFileSync(crmFuncsPath, "utf8");

    // Verifica integração de propostas comerciais
    expect(content).toContain('// 6e. Busca Propostas Comerciais Digitais (travel_proposals)');
    expect(content).toContain('.from("travel_proposals")');
    expect(content).toContain('proposals: customerProposals');

    // Verifica integração de contratos digitais
    expect(content).toContain('// 6f. Busca Contratos Digitais (contracts)');
    expect(content).toContain('.from("contracts")');
    expect(content).toContain('contracts: customerContracts');

    // Verifica inclusão na timeline unificada
    expect(content).toContain('type: "proposal"');
    expect(content).toContain('type: "contract"');
  });

  it("2. Deve renderizar blocos de propostas e contratos na Ficha 360 do Cliente", () => {
    const clientRoutePath = path.resolve(__dirname, "../routes/workspace.clientes.$id.tsx");
    const content = fs.readFileSync(clientRoutePath, "utf8");

    // Aba de Viagens e Propostas atualizada
    expect(content).toContain("Viagens & Propostas");
    expect(content).toContain("Propostas Comerciais Digitais");
    expect(content).toContain("Contratos Digitais Emitidos");

    // Suporte aos novos tipos de evento na timeline
    expect(content).toContain('event.type === "proposal"');
    expect(content).toContain('event.type === "contract"');
  });

  it("3. Deve conter bifurcação perfeita (Mobile WhatsApp List vs Desktop Table) em NDAs", () => {
    const ndaRoutePath = path.resolve(__dirname, "../routes/workspace.captacao.ndas.tsx");
    const content = fs.readFileSync(ndaRoutePath, "utf8");

    // Mobile WhatsApp List
    expect(content).toContain("BIFURCAÇÃO MOBILE: WhatsApp List Edge-to-Edge");
    expect(content).toContain("block sm:hidden divide-y divide-border/40");
    expect(content).toContain("min-h-[44px]");

    // Desktop Corporate Table
    expect(content).toContain("BIFURCAÇÃO DESKTOP: Tabela Corporativa Densa");
    expect(content).toContain("hidden sm:block overflow-x-auto");
  });

  it("4. Deve conter rotas financeiras expandidas e acessíveis na barra lateral", () => {
    const navPath = path.resolve(__dirname, "../lib/workspace-navigation.ts");
    const content = fs.readFileSync(navPath, "utf8");

    expect(content).toContain('/workspace/financeiro/caixa/lancamentos');
    expect(content).toContain('/workspace/financeiro/comprovantes');
  });

  it("5. Deve auditar e impor títulos atômicos silenciosos e purga de botões âmbar", () => {
    const telemetriaPath = path.resolve(__dirname, "../routes/workspace.marketing.telemetria.tsx");
    const telemetriaContent = fs.readFileSync(telemetriaPath, "utf8");
    expect(telemetriaContent).toContain(">Telemetria</h1>");
    expect(telemetriaContent).not.toContain("Central de Conversões");

    const tokensPath = path.resolve(__dirname, "../routes/workspace.tokens.tsx");
    const tokensContent = fs.readFileSync(tokensPath, "utf8");
    expect(tokensContent).toContain(">Tokens</h1>");
    expect(tokensContent).not.toContain("Tokens de Aceleração");

    const candidaturasPath = path.resolve(__dirname, "../routes/_store.conta.candidaturas.tsx");
    const candidaturasContent = fs.readFileSync(candidaturasPath, "utf8");
    expect(candidaturasContent).not.toContain("bg-amber-600 hover:bg-amber-700");
    expect(candidaturasContent).toContain("min-h-[44px]");
  });
});
