import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => React.createElement("a", { href: to, ...props }, children),
  useLocation: () => ({ pathname: "/", searchStr: "" }),
}));

import { AuthSplitExperienceShell } from "@/components/auth/auth-split-shell";
import { AuthStepProgress } from "@/components/auth/auth-step-progress";
import { isEditorialMarketingRoute } from "@/lib/navigation-registry";
import { resolveSubsystemFromHost } from "@/lib/vertical-subsystems";

describe("Landing Comercial, Preservação /explorer & Auth Split Desktop / Mobile Nativo", () => {
  it("1. Preserva experiência da vitrine comunitária em /explorer e redireciona /home para /explorer", () => {
    const explorerRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_store.explorer.tsx"),
      "utf-8",
    );
    const homeRoute = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/home.tsx"),
      "utf-8",
    );

    expect(explorerRoute).toContain('createFileRoute("/_store/explorer")');
    expect(explorerRoute).toContain("CommunityMarketplaceExperience");
    expect(explorerRoute).toContain("loadCommunityHomeData");
    expect(homeRoute).toContain('to: "/explorer"');
    expect(resolveSubsystemFromHost("explorer.waesy.com.br")?.targetPath).toBe("/explorer");
  });

  it("2. Suprime AppShell (TopBar/Sidebar/BottomNav) em landing pages e páginas públicas institucionais", () => {
    // Modo landing_vendas na raiz (/) -> sem shell de aplicativo
    expect(isEditorialMarketingRoute("/", "landing_vendas", "")).toBe(true);
    expect(isEditorialMarketingRoute("/", undefined, "")).toBe(true);
    // Quando ?vitrine=1 ou marketplace_local -> restaura shell de descoberta
    expect(isEditorialMarketingRoute("/", "landing_vendas", "?vitrine=1")).toBe(false);
    expect(isEditorialMarketingRoute("/", "marketplace_local", "")).toBe(false);

    // Landing pages e institucionais -> sem shell de loja
    for (const p of ["/portal-completo", "/sobre", "/about", "/contato", "/termos", "/privacidade", "/developers"]) {
      expect(isEditorialMarketingRoute(p, "landing_vendas", "")).toBe(true);
    }

    // Apps operacionais públicos -> mantêm AppShell normalmente
    for (const appRoute of ["/explorer", "/marketplace", "/classificados", "/noticias", "/diretorio", "/conta"]) {
      expect(isEditorialMarketingRoute(appRoute, "landing_vendas", "")).toBe(false);
    }

    const appShellSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/shell/app-shell.tsx"),
      "utf-8",
    );
    expect(appShellSrc).toContain("isEditorialMarketingRoute");
    expect(appShellSrc).toContain("PublicLandingHeader");
    expect(appShellSrc).toContain("/redefinir-senha");
  });

  it("3. Renderiza AuthSplitExperienceShell com Formulário à ESQUERDA e Imagem/Marca à DIREITA no Desktop + Passo a Passo no Mobile", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AuthSplitExperienceShell,
        {
          brand: {
            platform_name: "Waesy",
            login_split_image_url: "https://cdn.waesy.com.br/login-hero.jpg",
          },
          step: 1,
          totalSteps: 3,
        },
        React.createElement("form", { "data-testid": "login-form" }, "Entrar"),
      ),
    );

    const formIndex = html.indexOf('data-testid="login-form"');
    const asideIndex = html.indexOf("<aside");
    expect(formIndex).toBeGreaterThan(-1);
    expect(asideIndex).toBeGreaterThan(formIndex);
    expect(html).toContain("lg:order-1");
    expect(html).toContain("lg:order-2");
    expect(html).toContain("https://cdn.waesy.com.br/login-hero.jpg");
    expect(html).toContain("Passo 1/3");
    expect(html).toContain('role="progressbar"');
  });

  it("4. Propaga AuthSplitExperienceShell em todas as rotas de Auth sem exceção", () => {
    const authRoutes = [
      "src/routes/_store.entrar.tsx",
      "src/routes/_store.cadastro.tsx",
      "src/routes/painel.tsx",
      "src/routes/_store.recuperar-senha.tsx",
      "src/routes/_store.redefinir-senha.tsx",
    ];
    for (const relPath of authRoutes) {
      const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
      expect(content, `${relPath} deve adotar AuthSplitExperienceShell`).toContain("AuthSplitExperienceShell");
    }

    // Barra linear sem classes arbitrarias nem width-[...]
    const progressHtml = renderToStaticMarkup(
      React.createElement(AuthStepProgress, { currentStep: 2, totalSteps: 3 }),
    );
    expect(progressHtml).toContain('aria-valuenow="2"');
    expect(progressHtml).not.toMatch(/-\[/);
  });

  it("5. Audita limites de modularidade em todos os novos componentes e rota", () => {
    const budgetChecks = [
      { file: "src/lib/community-home-loader.ts", max: 250 },
      { file: "src/lib/community-home-items.ts", max: 250 },
      { file: "src/components/home/CommunityMarketplaceExperience.tsx", max: 250 },
      { file: "src/components/shell/public-landing-header.tsx", max: 250 },
      { file: "src/components/auth/auth-split-shell.tsx", max: 250 },
      { file: "src/components/auth/auth-step-progress.tsx", max: 250 },
      { file: "src/routes/_store.explorer.tsx", max: 300 },
    ];
    for (const item of budgetChecks) {
      const lines = fs.readFileSync(path.resolve(process.cwd(), item.file), "utf-8").split("\n").length;
      expect(lines, `${item.file} excedeu ${item.max} linhas (${lines})`).toBeLessThanOrEqual(item.max);
    }
  });
});
