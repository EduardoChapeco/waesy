import { describe, it, expect } from "vitest";
import { getNicheTranslation, NICHE_DICTIONARY_REGISTRY } from "@/lib/niche-dictionary";
import { formatNicheNotification } from "@/services/notifications.functions";

describe("MASTER PROMPT V138: Niche Taxonomy, Micro-Copy Metamorphosis & Design Tokenization", () => {
  describe("1. Dicionário de Micro-Copy e Toasts Contextuais (Fase 1)", () => {
    it("deve fornecer micro-copy e toasts humanizados para Clínicas Médicas (sem jargão de armazém)", () => {
      const { t, terms, themeClass } = getNicheTranslation("clinica");

      expect(terms.client).toBe("Paciente");
      expect(terms.item).toBe("Consulta / Exame");
      expect(terms.catalog).toBe("Grade Clínica & Procedimentos");

      // Toasts contextuais
      expect(terms.createSuccessToast).toBe("Consulta agendada com sucesso!");
      expect(terms.updateSuccessToast).toBe("Prontuário/consulta atualizada com sucesso!");
      expect(terms.deleteSuccessToast).toBe("Horário liberado na agenda clínica.");

      // Confirmação de exclusão
      expect(terms.deleteConfirmTitle).toContain("cancelar esta consulta médica");
      expect(terms.deleteConfirmDescription).toContain("grade do corpo clínico");

      // Empty states
      expect(terms.emptyStateCatalogTitle).toBe("Nenhum procedimento na grade clínica");
      expect(terms.emptyStateOrdersTitle).toBe("Sua agenda clínica está livre hoje");

      // Tema de design
      expect(themeClass).toBe("theme-health");
    });

    it("deve fornecer micro-copy afiada e de alto valor para Imobiliárias", () => {
      const { terms, themeClass } = getNicheTranslation("real_estate");

      expect(terms.client).toBe("Inquilino / Comprador");
      expect(terms.item).toBe("Imóvel");
      expect(terms.catalog).toBe("Carteira de Imóveis");

      // Toasts
      expect(terms.createSuccessToast).toBe("Imóvel cadastrado com sucesso!");
      expect(terms.deleteSuccessToast).toBe("Imóvel arquivado da carteira.");

      // Confirmação
      expect(terms.deleteConfirmTitle).toContain("remover este imóvel da carteira");

      // Empty states
      expect(terms.emptyStateCatalogTitle).toBe("Nenhum imóvel em captação");
      expect(terms.emptyStateOrdersTitle).toBe("Nenhuma proposta comercial ativa");

      // Tema de luxo
      expect(themeClass).toBe("theme-luxury");
    });

    it("deve fornecer micro-copy apetitosa e dinâmica para Gastronomia e Dark Kitchens", () => {
      const { terms, themeClass } = getNicheTranslation("gastronomy");

      expect(terms.client).toBe("Cliente / Mesa");
      expect(terms.item).toBe("Prato / Lanche");
      expect(terms.catalog).toBe("Cardápio");

      // Toasts
      expect(terms.createSuccessToast).toBe("Item adicionado ao cardápio com sucesso!");
      expect(terms.deleteSuccessToast).toBe("Item removido do cardápio.");

      // Empty states
      expect(terms.emptyStateCatalogTitle).toBe("Seu cardápio está vazio");
      expect(terms.emptyStateOrdersTitle).toBe("Nenhum pedido na cozinha");

      // Tema de gastronomia
      expect(themeClass).toBe("theme-gastronomy");
    });

    it("deve fornecer micro-copy magnética para Criadores e Cursos", () => {
      const { terms, themeClass } = getNicheTranslation("creators");

      expect(terms.client).toBe("Aluno / Seguidor");
      expect(terms.item).toBe("Infoproduto");
      expect(terms.catalog).toBe("Vitrine de Cursos");

      // Toasts
      expect(terms.createSuccessToast).toBe("Infoproduto publicado com sucesso!");
      expect(terms.deleteSuccessToast).toBe("Conteúdo removido da vitrine.");

      // Empty states
      expect(terms.emptyStateCatalogTitle).toBe("Nenhum infoproduto publicado");
      expect(terms.emptyStateOrdersTitle).toBe("Nenhuma matrícula recente");

      // Tema creator
      expect(themeClass).toBe("theme-creator");
    });
  });

  describe("2. Arquitetura Camaleônica de Design Tokens (Fase 2)", () => {
    it("deve mapear a classe de tema correta para cada vertente de negócio", () => {
      expect(getNicheTranslation("clinica").themeClass).toBe("theme-health");
      expect(getNicheTranslation("services").themeClass).toBe("theme-health");
      expect(getNicheTranslation("real_estate").themeClass).toBe("theme-luxury");
      expect(getNicheTranslation("vehicles").themeClass).toBe("theme-luxury");
      expect(getNicheTranslation("tourism").themeClass).toBe("theme-luxury");
      expect(getNicheTranslation("legal").themeClass).toBe("theme-luxury");
      expect(getNicheTranslation("creators").themeClass).toBe("theme-creator");
      expect(getNicheTranslation("events").themeClass).toBe("theme-creator");
      expect(getNicheTranslation("gastronomy").themeClass).toBe("theme-gastronomy");
      expect(getNicheTranslation("retail").themeClass).toBe("theme-default");
    });
  });

  describe("3. Reality Check de Notificações, Emails e WhatsApp (Fase 4)", () => {
    it("deve formatar notificação de confirmação médica sem jargão de faturamento ou pedido físico", () => {
      const notif = formatNicheNotification("clinica", "order_confirmed", {
        customerName: "Ana Clara",
        itemName: "Consulta Cardiológica",
      });

      expect(notif.title).toBe("Consulta Confirmada");
      expect(notif.message).toContain("Ana Clara");
      expect(notif.message).toContain("Consulta Cardiológica");
      expect(notif.message).not.toContain("pedido faturado");
      expect(notif.message).not.toContain("separação");
      expect(notif.emailSubject).toContain("agendamento");
      expect(notif.actionUrl).toBe("/conta/agendamentos");
    });

    it("deve formatar notificação de proposta imobiliária com terminologia de alto padrão", () => {
      const notif = formatNicheNotification("real_estate", "order_confirmed", {
        customerName: "Roberto Lima",
        itemName: "Cobertura Vista Mar - Ed. Ocean",
      });

      expect(notif.title).toBe("Proposta Aprovada");
      expect(notif.message).toContain("Roberto Lima");
      expect(notif.message).toContain("imóvel");
      expect(notif.message).toContain("Cobertura Vista Mar");
      expect(notif.emailPreheader).toContain("minuta contratual");
      expect(notif.actionUrl).toBe("/conta/negociacoes");
    });

    it("deve formatar notificação de gastronomia focada em preparo da cozinha", () => {
      const notif = formatNicheNotification("gastronomy", "order_confirmed", {
        code: "9842",
        customerName: "Felipe",
      });

      expect(notif.title).toBe("Pedido em Preparo");
      expect(notif.message).toContain("#9842");
      expect(notif.message).toContain("cozinha");
      expect(notif.whatsappMessage).toContain("preparação");
      expect(notif.actionUrl).toBe("/conta/pedidos");
    });

    it("deve formatar notificação de criador com acesso imediato à área de membros", () => {
      const notif = formatNicheNotification("creators", "order_confirmed", {
        customerName: "Mariana",
        itemName: "Masterclass de Storytelling",
      });

      expect(notif.title).toBe("Acesso Liberado");
      expect(notif.message).toContain("Mariana");
      expect(notif.message).toContain("Masterclass de Storytelling");
      expect(notif.actionLabel).toBe("Acessar Área de Membros");
      expect(notif.actionUrl).toBe("/conta/cursos");
    });
  });
});
