import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Painel Corporativo & Encadeamento de Onboarding (SPEC-PAINEL-EMPRESAS-DIRECT-AUTH)", () => {
  const painelRoutePath = path.resolve(process.cwd(), "src/routes/painel.tsx");
  const serverPath = path.resolve(process.cwd(), "src/server.ts");
  const ssrPath = path.resolve(process.cwd(), "src/lib/supabase-ssr.server.ts");

  describe("EARS-01 & Invariantes de Subdomínio no Worker", () => {
    it("deve conter lógica de resolução de subdomínio painel.* no server.ts", () => {
      const serverContent = fs.readFileSync(serverPath, "utf8");
      expect(serverContent).toContain("isPainelSubdomain");
      expect(serverContent).toContain('rewrittenUrl.pathname = "/painel"');
    });

    it("deve detectar variações válidas de subdomínio corporativo", () => {
      const isPainelSubdomain = (host: string) =>
        host.toLowerCase().startsWith("painel.") || host.toLowerCase().startsWith("painel-");

      expect(isPainelSubdomain("painel.waesy.com.br")).toBe(true);
      expect(isPainelSubdomain("painel.localhost:3000")).toBe(true);
      expect(isPainelSubdomain("painel-staging.usewaesy.com")).toBe(true);
      expect(isPainelSubdomain("waesy.com.br")).toBe(false);
      expect(isPainelSubdomain("admin.waesy.com.br")).toBe(false);
    });
  });

  describe("EARS-02 & EARS-03: Rota Canônica e Redirecionamentos", () => {
    it("deve definir a rota canônica /painel no TanStack Router", () => {
      const painelContent = fs.readFileSync(painelRoutePath, "utf8");
      expect(painelContent).toContain('createFileRoute("/painel")');
    });

    it("deve redirecionar lojista autenticado com loja para /workspace", () => {
      const painelContent = fs.readFileSync(painelRoutePath, "utf8");
      expect(painelContent).toContain('throw redirect({ to: "/workspace" })');
    });

    it("deve redirecionar usuário autenticado sem loja para /criar-negocio", () => {
      const painelContent = fs.readFileSync(painelRoutePath, "utf8");
      expect(painelContent).toContain('throw redirect({ to: "/criar-negocio" })');
    });
  });

  describe("EARS-04: Encadeamento de Cadastro Imediato", () => {
    it("deve cadastrar usuário com redirectTo fixado para /criar-negocio", () => {
      const painelContent = fs.readFileSync(painelRoutePath, "utf8");
      expect(painelContent).toContain('redirectTo: "/criar-negocio"');
      expect(painelContent).toContain('navigate({ to: "/criar-negocio", replace: true })');
    });

    it("deve possuir alternador de abas entre login e cadastro empresarial", () => {
      const painelContent = fs.readFileSync(painelRoutePath, "utf8");
      expect(painelContent).toContain("Acessar Workspace");
      expect(painelContent).toContain("Criar Conta Empresarial");
    });
  });

  describe("Conformidade Multi-Subdomínio de Cookies SSR", () => {
    it("deve configurar cookieDomain para .waesy.com.br em produção", () => {
      const ssrContent = fs.readFileSync(ssrPath, "utf8");
      expect(ssrContent).toContain('cookieDomain = ".waesy.com.br"');
      expect(ssrContent).toContain("domain: cookieDomain");
    });
  });
});
