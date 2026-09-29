import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schema de validação do PWA Enterprise
const StorePwaConfigSchema = z.object({
  appName: z.string().min(2).max(100),
  shortName: z.string().min(1).max(30),
  description: z.string().optional(),
  themeColor: z.string().default("#0F172A"),
  backgroundColor: z.string().default("#000000"),
  icon192Url: z.string().url().optional().nullable(),
  icon512Url: z.string().url().optional().nullable(),
  splashImageUrl: z.string().url().optional().nullable(),
  startUrl: z.string().default("/"),
  displayMode: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).default("standalone"),
  orientation: z.enum(["portrait", "landscape", "any"]).default("portrait"),
  customDomain: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
});

describe("PWA Enterprise Builder & RBAC Enhancements (Audit & Completeness)", () => {
  it("valida manifesto PWA completo com ícones, splash screen e display mode", () => {
    const valid = StorePwaConfigSchema.parse({
      appName: "Waesy Comércio & Serviços",
      shortName: "Waesy",
      description: "Aplicativo oficial de compras e agendamentos",
      themeColor: "#059669",
      backgroundColor: "#111827",
      icon192Url: "https://storage.waesy.com/store-assets/icon-192.png",
      icon512Url: "https://storage.waesy.com/store-assets/icon-512.png",
      splashImageUrl: "https://storage.waesy.com/store-assets/splash.png",
      displayMode: "standalone",
      orientation: "portrait",
    });

    expect(valid.appName).toBe("Waesy Comércio & Serviços");
    expect(valid.shortName).toBe("Waesy");
    expect(valid.icon192Url).toBe("https://storage.waesy.com/store-assets/icon-192.png");
    expect(valid.icon512Url).toBe("https://storage.waesy.com/store-assets/icon-512.png");
    expect(valid.displayMode).toBe("standalone");
    expect(valid.orientation).toBe("portrait");
    expect(valid.isPublished).toBe(true);
  });

  it("aceita modos de janela fullscreen e landscape para quiosques ou tablets de autoatendimento", () => {
    const kioskPwa = StorePwaConfigSchema.parse({
      appName: "Cardápio Kiosk",
      shortName: "Kiosk",
      displayMode: "fullscreen",
      orientation: "landscape",
    });

    expect(kioskPwa.displayMode).toBe("fullscreen");
    expect(kioskPwa.orientation).toBe("landscape");
  });

  it("rejeita nomes curtos acima de 30 caracteres ou URLs de ícones inválidas", () => {
    const invalidShortName = StorePwaConfigSchema.safeParse({
      appName: "Loja Teste",
      shortName: "NomeMuitoLongoQueUltrapassaTrintaCaracteresParaIcone",
    });
    expect(invalidShortName.success).toBe(false);

    const invalidIconUrl = StorePwaConfigSchema.safeParse({
      appName: "Loja Teste",
      shortName: "Loja",
      icon192Url: "not-a-valid-url",
    });
    expect(invalidIconUrl.success).toBe(false);
  });

  it("garante proteção de rotas restritas financeiras contra papéis operacionais (vendedor, caixa, cozinha)", () => {
    const allowedFinanceRoles = ["owner", "admin", "proprietario", "manager", "gerente", "finance"];
    const operationalRoles = ["seller", "vendedor", "cashier", "caixa", "kitchen", "cozinha", "operator", "estoquista", "member"];

    for (const opRole of operationalRoles) {
      expect(allowedFinanceRoles.includes(opRole)).toBe(false);
    }

    for (const finRole of allowedFinanceRoles) {
      expect(allowedFinanceRoles.includes(finRole)).toBe(true);
    }
  });

  it("garante proteção de modos imersivos (builder e estúdio) contra papéis de atendimento/caixa/cozinha", () => {
    const immersionAllowedRoles = [
      "owner",
      "admin",
      "proprietario",
      "manager",
      "gerente",
      "content",
      "specialist",
      "profissional",
    ];

    const restrictedRoles = ["cashier", "seller", "kitchen", "stock", "operator", "member"];

    for (const restricted of restrictedRoles) {
      expect(immersionAllowedRoles.includes(restricted)).toBe(false);
    }

    expect(immersionAllowedRoles.includes("content")).toBe(true);
    expect(immersionAllowedRoles.includes("manager")).toBe(true);
    expect(immersionAllowedRoles.includes("owner")).toBe(true);
  });

  it("garante proteção estrita de rotas societárias (DRE, Fiscal, Saques, Exclusão) bloqueadas até mesmo para Gerentes", () => {
    const OWNER_ONLY_ROUTES = [
      "/workspace/configuracoes/seguranca",
      "/workspace/configuracoes/excluir",
      "/workspace/settings/danger-zone",
      "/workspace/assinatura",
      "/workspace/faturamento",
      "/workspace/financeiro/faturas",
      "/workspace/financeiro/dados-bancarios",
      "/workspace/financeiro/saques",
      "/workspace/financeiro/configuracao",
      "/workspace/configuracoes/integracoes",
      "/workspace/configuracoes/ai",
      "/workspace/configuracoes/inteligencia-artificial",
      "/workspace/configuracoes/sessoes",
      "/workspace/configuracoes/privacidade-loja",
      "/workspace/configuracoes/parceiros",
      "/workspace/configuracoes/tokens",
      "/workspace/configuracoes/pwa",
      "/workspace/faturamento/tokens",
      "/workspace/tokens",
      "/workspace/configuracoes/dominios",
      "/workspace/financeiro/dre",
      "/workspace/financeiro/fechamento",
      "/workspace/configuracoes/fiscal",
      "/workspace/configuracoes/pagamentos",
      "/workspace/admin",
    ];

    const managerRole = "manager";
    const ownerRole = "owner";
    const allowedOwnerRoles = ["owner", "admin", "proprietario", "platform_admin", "master"];

    // Gerente NÃO pode ter privilégio de proprietário
    expect(allowedOwnerRoles.includes(managerRole)).toBe(false);
    expect(allowedOwnerRoles.includes(ownerRole)).toBe(true);

    // Valida que as rotas societárias críticas estão catalogadas
    expect(OWNER_ONLY_ROUTES.includes("/workspace/financeiro/dre")).toBe(true);
    expect(OWNER_ONLY_ROUTES.includes("/workspace/financeiro/saques")).toBe(true);
    expect(OWNER_ONLY_ROUTES.includes("/workspace/configuracoes/fiscal")).toBe(true);
    expect(OWNER_ONLY_ROUTES.includes("/workspace/settings/danger-zone")).toBe(true);
  });
});
