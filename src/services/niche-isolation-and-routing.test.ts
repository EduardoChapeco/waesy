import { describe, it, expect } from "vitest";
import { getNicheTranslation } from "@/lib/niche-dictionary";
import { getSidebarConfig, getMasterSidebarPillars } from "@/lib/workspace-navigation";
import {
  linkProductRecipeSchema,
  recordSupplyPurchaseSchema,
  deductSuppliesForServiceAppointmentSchema,
} from "@/services/gastronomy-supplies.functions";

describe("Omni-Niche Semantic Isolation & Dynamic Sidebar Engine (V136)", () => {
  describe("1. Dicionário Universal de Nichos (I18n Niche Translation)", () => {
    it("traduz termos perfeitamente para Salão / Barbearia (services)", () => {
      const { t, nicheId } = getNicheTranslation("services");
      expect(nicheId).toBe("services");
      expect(t("client")).toBe("Cliente");
      expect(t("item")).toBe("Serviço");
      expect(t("items")).toBe("Serviços");
      expect(t("catalog")).toBe("Catálogo de Serviços");
      expect(t("order")).toBe("Atendimento / Comanda");
      expect(t("orders")).toBe("Agendamentos & Comandas");
      expect(t("stock")).toBe("Produtos Homecare");
      expect(t("kds")).toBe("Fila de Atendimento");
    });

    it("traduz termos perfeitamente para Imobiliária (real_estate)", () => {
      const { t, nicheId } = getNicheTranslation("real_estate");
      expect(nicheId).toBe("real_estate");
      expect(t("client")).toBe("Inquilino / Comprador");
      expect(t("clients")).toBe("Interessados & Inquilinos");
      expect(t("item")).toBe("Imóvel");
      expect(t("items")).toBe("Imóveis");
      expect(t("catalog")).toBe("Carteira de Imóveis");
      expect(t("order")).toBe("Proposta / Negociação");
      expect(t("orders")).toBe("Propostas & Contratos");
      expect(t("stock")).toBe("Chaves & Unidades");
      expect(t("kds")).toBe("Funil de Vistorias");
    });

    it("traduz termos perfeitamente para Restaurante / Gastronomia (gastronomy)", () => {
      const { t, nicheId } = getNicheTranslation("gastronomy");
      expect(nicheId).toBe("gastronomy");
      expect(t("client")).toBe("Cliente / Mesa");
      expect(t("item")).toBe("Prato / Lanche");
      expect(t("items")).toBe("Pratos & Itens");
      expect(t("catalog")).toBe("Cardápio");
      expect(t("order")).toBe("Comanda / Pedido");
      expect(t("orders")).toBe("Histórico de Pedidos");
      expect(t("stock")).toBe("Insumos & Despensa");
      expect(t("kds")).toBe("Gestor de Pedidos");
    });

    it("traduz termos perfeitamente para Advocacia & Jurídico (legal)", () => {
      const { t, nicheId } = getNicheTranslation("legal");
      expect(nicheId).toBe("legal");
      expect(t("client")).toBe("Cliente / Assistido");
      expect(t("item")).toBe("Serviço Jurídico");
      expect(t("catalog")).toBe("Honorários & Serviços");
      expect(t("order")).toBe("Processo / Pasta");
      expect(t("orders")).toBe("Processos & Prazos");
      expect(t("kds")).toBe("Prazos & Audiências");
    });

    it("traduz termos perfeitamente para Turismo & Viagens (tourism)", () => {
      const { t, nicheId } = getNicheTranslation("tourism");
      expect(nicheId).toBe("tourism");
      expect(t("client")).toBe("Viajante");
      expect(t("item")).toBe("Pacote / Roteiro");
      expect(t("items")).toBe("Pacotes & Roteiros");
      expect(t("catalog")).toBe("Roteiros & Destinos");
      expect(t("order")).toBe("Cotação / Reserva");
      expect(t("stock")).toBe("Vagas & Poltronas");
      expect(t("kds")).toBe("Central de Embarque");
    });
  });

  describe("2. The Semantic Sidebar Engine (Dynamic UI Injection & Pure Isolation)", () => {
    it("isola 100% o painel da Barbearia (esconde imóveis, cozinha KDS e frota de ônibus)", () => {
      const sidebar = getSidebarConfig("services");
      const groupIds = sidebar.map((g) => g.id);

      // Grupos que DEVEM estar presentes
      expect(groupIds).toContain("overview");
      expect(groupIds).toContain("services-agenda");
      expect(groupIds).toContain("services-catalog");
      expect(groupIds).toContain("finance");

      // Módulos que DEVEM DESAPARECER (Zero poluição)
      expect(groupIds).not.toContain("real-estate");
      expect(groupIds).not.toContain("gastro-orders");
      expect(groupIds).not.toContain("gastro-catalog");
      expect(groupIds).not.toContain("tourism-fleet");
      expect(groupIds).not.toContain("legal");

      // Verifica metamorfose nos rótulos internos
      const catalogGroup = sidebar.find((g) => g.id === "services-catalog");
      expect(catalogGroup).toBeDefined();
      const productItem = catalogGroup?.items.find((i) => i.path === "/workspace/catalogo/produtos");
      expect(productItem?.label).toBe("Serviços");
    });

    it("isola 100% o painel da Imobiliária (esconde mesas, KDS e encomendas de moda)", () => {
      const sidebar = getSidebarConfig("real_estate");
      const groupIds = sidebar.map((g) => g.id);

      // Deve conter o grupo de imóveis
      expect(groupIds).toContain("real-estate");

      // Não pode conter módulos de outros nichos
      expect(groupIds).not.toContain("gastro-orders");
      expect(groupIds).not.toContain("gastro-catalog");
      expect(groupIds).not.toContain("services-agenda");
      expect(groupIds).not.toContain("tourism-fleet");

      // Rótulos metamorfoseados para a linguagem imobiliária
      const realEstateGroup = sidebar.find((g) => g.id === "real-estate");
      const imovelItem = realEstateGroup?.items.find((i) => i.path === "/workspace/catalogo/produtos");
      expect(imovelItem?.label).toBe("Imóveis");

      const clientsItem = realEstateGroup?.items.find((i) => i.path === "/workspace/clientes");
      expect(clientsItem?.label).toBe("Interessados & Inquilinos");
    });

    it("isola 100% o painel do Restaurante / Gastronomia (mesas, KDS e cozinha ativos, sem contratos imobiliários)", () => {
      const sidebar = getSidebarConfig("gastronomy");
      const groupIds = sidebar.map((g) => g.id);

      expect(groupIds).toContain("gastro-catalog");
      expect(groupIds).toContain("gastro-orders");

      expect(groupIds).not.toContain("real-estate");
      expect(groupIds).not.toContain("legal");
      expect(groupIds).not.toContain("services-agenda");

      const gastroCatalog = sidebar.find((g) => g.id === "gastro-catalog");
      expect(gastroCatalog?.label).toBe("Cardápio");

      const dishItem = gastroCatalog?.items.find((i) => i.path === "/workspace/catalogo/produtos");
      expect(dishItem?.label).toBe("Pratos & Itens");
    });
  });

  describe("3. Auditoria de Rotas Integradas (The Orphan Route Audit)", () => {
    it("confirma que rotas avançadas auditadas possuem entrada nos menus centrais", () => {
      // No modo master, todos os grupos enriquecidos são inspecionáveis
      const allGroups = getSidebarConfig("retail", { isMasterMode: true });
      const allPaths = allGroups.flatMap((g) => g.items.map((i) => i.path));

      // Rotas antes perdidas agora devidamente catalogadas
      expect(allPaths).toContain("/workspace/automacoes");
      expect(allPaths).toContain("/workspace/marketing/telemetria");
      expect(allPaths).toContain("/workspace/marketing/formularios");
      expect(allPaths).toContain("/workspace/marketing/publicacoes");
      expect(allPaths).toContain("/workspace/marketing/stories");
      expect(allPaths).toContain("/workspace/marketing/briefing");
      expect(allPaths).toContain("/workspace/estoque/movimentos");
      expect(allPaths).toContain("/workspace/relatorios/gastronomia");
      expect(allPaths).toContain("/workspace/simulacao");
      expect(allPaths).toContain("/workspace/licitacoes");
    });

    it("isola os 11 Pilares Mestre (getMasterSidebarPillars) contra vazamento gastronômico em Turismo, Varejo, Serviços e Locação", () => {
      const gastroExclusivePaths = [
        "/workspace/pedidos/gestor",
        "/workspace/pdv/comandas",
        "/workspace/pdv/cozinha",
        "/workspace/pedidos/tempo-preparo",
        "/workspace/reservas",
        "/workspace/relatorios/gastronomia",
        "/workspace/conteudo/receitas",
      ];

      for (const nonFoodNiche of ["tourism", "retail", "services", "rental", "real_estate", "legal"]) {
        const groups = getSidebarConfig(nonFoodNiche);
        const pillars = getMasterSidebarPillars(groups, nonFoodNiche);
        const allPillarPaths = pillars.flatMap((p) => p.items.map((i) => i.path));

        for (const gastroPath of gastroExclusivePaths) {
          expect(allPillarPaths).not.toContain(gastroPath);
        }
      }

      const tourismPillars = getMasterSidebarPillars(getSidebarConfig("tourism"), "tourism");
      const tourismPaths = tourismPillars.flatMap((p) => p.items.map((i) => i.path));
      expect(tourismPaths).not.toContain("/workspace/pedidos/frota");
      expect(tourismPaths).not.toContain("/workspace/pedidos/entregadores");
      expect(tourismPaths).toContain("/workspace/turismo/vouchers");
      expect(tourismPaths).toContain("/workspace/turismo/embarques");
      expect(tourismPillars.find((p) => p.id === "comercial")?.label).toBe("Comercial & Cotação");
      expect(tourismPillars.find((p) => p.id === "catalogo")?.label).toBe("Catálogo & Tarifários");
      expect(tourismPillars.find((p) => p.id === "logistica")?.label).toBe("Operações & Embarques");

      const gastroPillars = getMasterSidebarPillars(getSidebarConfig("gastronomy"), "gastronomy");
      const gastroPaths = gastroPillars.flatMap((p) => p.items.map((i) => i.path));
      expect(gastroPaths).toContain("/workspace/pedidos");
      expect(gastroPaths).toContain("/workspace/pdv/cozinha");
      expect(gastroPaths).toContain("/workspace/pdv/comandas");
    });

    it("valida schemas de Ficha Técnica Recursiva (Sabores/Modificadores, Fator de Conversão e Serviços Compostos)", () => {
      const modifierLink = linkProductRecipeSchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        modifierId: "22222222-2222-4222-8222-222222222222",
        recipeId: "33333333-3333-4333-8333-333333333333",
        modifierOptionLabel: "Sabor: Chilli Mexicano",
        isPrimaryGargalo: true,
        quantity: 1,
      });
      expect(modifierLink.modifierId).toBe("22222222-2222-4222-8222-222222222222");
      expect(modifierLink.isPrimaryGargalo).toBe(true);

      const purchaseWithConversion = recordSupplyPurchaseSchema.parse({
        supplyId: "11111111-1111-4111-8111-111111111111",
        quantity: 2,
        conversionFactor: 12,
        totalCostCents: 14400,
      });
      expect(purchaseWithConversion.conversionFactor).toBe(12);

      const serviceDeduction = deductSuppliesForServiceAppointmentSchema.parse({
        appointmentId: "44444444-4444-4444-8444-444444444444",
        bookingServiceId: "55555555-5555-4555-8555-555555555555",
        serviceTitle: "Mechas & Descoloração",
      });
      expect(serviceDeduction.bookingServiceId).toBe("55555555-5555-4555-8555-555555555555");
    });
  });
});
