import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Universal Accessibility & WCAG 2.2 AA Compliance Audit", () => {
  const rootDir = path.resolve(__dirname, "..");
  const stylesPath = path.join(rootDir, "styles.css");
  const rootRoutePath = path.join(rootDir, "routes", "__root.tsx");
  const a11yDocPath = path.resolve(rootDir, "..", "docs", "ACCESSIBILITY.md");
  const a11ySkillPath = path.resolve(rootDir, "..", ".agents", "skills", "accessibility", "SKILL.md");

  it("1. Deve conter regras de Foco Visível e Foco Não Encoberto (WCAG 2.4.7 e 2.4.11) no styles.css", () => {
    const css = fs.readFileSync(stylesPath, "utf8");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("scroll-margin-top: 80px");
    expect(css).toContain("scroll-margin-bottom: 60px");
  });

  it("2. Deve conter suporte obrigatório a prefers-reduced-motion (WCAG 2.3.3) no styles.css", () => {
    const css = fs.readFileSync(stylesPath, "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms");
    expect(css).toContain("transition-duration: 0.01ms");
  });

  it("3. Deve conter classes utilitárias para leitores de tela e Skip Link (.sr-only, .visually-hidden, .skip-link)", () => {
    const css = fs.readFileSync(stylesPath, "utf8");
    expect(css).toContain(".visually-hidden");
    expect(css).toContain(".sr-only");
    expect(css).toContain(".skip-link");
  });

  it("4. Deve declarar lang='pt-BR' e renderizar Skip Link acessível no topo do DOM em __root.tsx", () => {
    const rootCode = fs.readFileSync(rootRoutePath, "utf8");
    expect(rootCode).toContain('<html lang="pt-BR">');
    expect(rootCode).toContain('href="#main-content"');
    expect(rootCode).toContain("Pular para o conteúdo principal");
  });

  it("5. Deve conter a Single Source of Truth em docs/ACCESSIBILITY.md e skill canônica WCAG 2.2", () => {
    expect(fs.existsSync(a11yDocPath)).toBe(true);
    expect(fs.existsSync(a11ySkillPath)).toBe(true);

    const skillContent = fs.readFileSync(a11ySkillPath, "utf8");
    expect(skillContent).toContain("name: accessibility");
    expect(skillContent).toContain("WCAG 2.2");
    expect(skillContent).toContain("Perceivable");
    expect(skillContent).toContain("Operable");
    expect(skillContent).toContain("Understandable");
    expect(skillContent).toContain("Robust");
  });
});
