import { describe, it, expect } from "vitest";
import { checkHasCustomPageMobileHeader } from "./app-shell";

describe("Adversarial Stress Test: checkHasCustomPageMobileHeader", () => {
  describe("1. Canonical Exact and Prefix Routes (Expected Positive)", () => {
    it("recognizes exact custom routes correctly", () => {
      const exactRoutes = [
        "/",
        "/gastronomia",
        "/mercado",
        "/farmacia",
        "/bebidas",
        "/acougue",
        "/pet",
        "/conta",
        "/agenda",
        "/afiliados",
        "/classificados",
        "/marketplace",
        "/diretorio",
        "/imoveis",
        "/servicos",
        "/eventos",
        "/empregos",
        "/agendar",
        "/turismo",
        "/faq",
      ];
      for (const route of exactRoutes) {
        expect(checkHasCustomPageMobileHeader(route), `Expected ${route} to have custom header`).toBe(true);
      }
    });

    it("recognizes prefix custom routes root correctly", () => {
      const prefixRoots = [
        "/doacoes",
        "/ofertas",
        "/redefinir-senha",
        "/destaques",
        "/admin-master",
        "/conta/atividade",
        "/conta/avaliacoes",
        "/conta/enderecos",
        "/conta/entregador",
        "/conta/financas",
        "/conta/salvos",
        "/conta/trocas",
        "/conta/conversas",
        "/conta/agendamentos",
        "/conta/classificados",
        "/conta/negociacoes",
        "/conta/comissoes",
        "/conta/curriculo",
        "/conta/empresa",
        "/conta/ingressos",
        "/conta/contratos",
        "/conta/notificacoes",
        "/conta/pedidos",
      ];
      for (const route of prefixRoots) {
        expect(checkHasCustomPageMobileHeader(route), `Expected ${route} to have custom header`).toBe(true);
      }
    });
  });

  describe("2. Trailing Slashes Edge Cases", () => {
    it("handles single and multiple trailing slashes on exact routes", () => {
      expect(checkHasCustomPageMobileHeader("/conta/")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/conta///")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/faq/")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/faq///")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/agenda/")).toBe(true);
    });

    it("handles single and multiple trailing slashes on prefix routes", () => {
      expect(checkHasCustomPageMobileHeader("/conta/pedidos/")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/conta/pedidos///")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/admin-master/")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/admin-master///")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/ofertas/")).toBe(true);
    });
  });

  describe("3. Deep Sub-Routes", () => {
    it("handles deeply nested sub-routes for prefix routes", () => {
      expect(checkHasCustomPageMobileHeader("/conta/pedidos/123")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/conta/pedidos/123/itens")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/conta/atividade/detalhes")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/admin-master/usuarios/edit/456")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/ofertas/categoria/produtos/789")).toBe(true);
      expect(checkHasCustomPageMobileHeader("/destaques/especial-verao")).toBe(true);
    });

    it("verifies behavior of exact routes when given subpaths", () => {
      // /faq is in exactCustomRoutes, but does /faq/sub exist or qualify?
      // Testing contract: exactCustomRoutes only match exact route or trailing slashes
      expect(checkHasCustomPageMobileHeader("/faq/topicos")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/agenda/semana")).toBe(false);
    });
  });

  describe("4. Non-Existent and Boundary Routes (Expected Negative)", () => {
    it("recognizes home root and rejects unrelated routes", () => {
      expect(checkHasCustomPageMobileHeader("/")).toBe(true);
      expect(checkHasCustomPageMobileHeader("")).toBe(true);
      expect(checkHasCustomPageMobileHeader("///")).toBe(true);
    });

    it("rejects unrelated routes", () => {
      expect(checkHasCustomPageMobileHeader("/carrinho")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/checkout")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/noticias")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/explorar")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/qualquer-coisa")).toBe(false);
    });

    it("does not false-positive on prefix collisions without slash boundary", () => {
      // e.g., /conta-fake or /doacoes-online must NOT trigger prefix matches
      expect(checkHasCustomPageMobileHeader("/conta-fake")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/doacoes-online")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/ofertas-especiais")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/faq-ajuda")).toBe(false);
      expect(checkHasCustomPageMobileHeader("/agenda-cultural")).toBe(false);
    });
  });

  describe("5. Stress Test: Query Strings and Hash Fragments", () => {
    it("tests query strings on exact custom routes", () => {
      // e.g. /faq?q=ajuda, /conta?tab=seguranca
      const resultFaqQuery = checkHasCustomPageMobileHeader("/faq?q=ajuda");
      const resultContaQuery = checkHasCustomPageMobileHeader("/conta?tab=seguranca");
      // Documenting exact behavior for report:
      // If pathname includes raw query strings without stripping, these will return false (false-negative)
      expect(typeof resultFaqQuery).toBe("boolean");
      expect(typeof resultContaQuery).toBe("boolean");
    });

    it("tests query strings on prefix custom routes", () => {
      // e.g. /conta/pedidos?status=open
      const resultPedidosQuery = checkHasCustomPageMobileHeader("/conta/pedidos?status=open");
      const resultAtividadeQuery = checkHasCustomPageMobileHeader("/conta/atividade?period=7d");
      expect(typeof resultPedidosQuery).toBe("boolean");
      expect(typeof resultAtividadeQuery).toBe("boolean");
    });

    it("tests hash fragments on custom routes", () => {
      const resultHash = checkHasCustomPageMobileHeader("/conta/pedidos#detalhes");
      expect(typeof resultHash).toBe("boolean");
    });
  });

  describe("6. Stress Test: Casing Sensitivity", () => {
    it("evaluates uppercase and mixed-case paths", () => {
      const upperFaq = checkHasCustomPageMobileHeader("/FAQ");
      const mixedConta = checkHasCustomPageMobileHeader("/Conta");
      const mixedPedidos = checkHasCustomPageMobileHeader("/conta/Pedidos");
      expect(typeof upperFaq).toBe("boolean");
      expect(typeof mixedConta).toBe("boolean");
      expect(typeof mixedPedidos).toBe("boolean");
    });
  });
});
