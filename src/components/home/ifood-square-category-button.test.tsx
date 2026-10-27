import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock @tanstack/react-router para permitir renderização de <Link>
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className, ...props }: any) => (
    <a href={typeof to === "string" ? to : "/"} className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn(), state: { location: { pathname: "/" } } }),
}));

import { IFoodSquareCategoryButton } from "./IFoodSquareCategoryButton";

describe("IFoodSquareCategoryButton — Fallback Vetorial & Apple HIG", () => {
  it("renderiza imagem quando imageUrl saudável é informada", () => {
    const html = renderToStaticMarkup(
      <IFoodSquareCategoryButton
        id="btn-1"
        title="Restaurantes"
        imageUrl="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500"
        showText={true}
      />
    );

    expect(html).toContain("img");
    expect(html).toContain("Restaurantes");
    expect(html).toContain("min-h-11");
  });

  it("aciona fallback vetorial semântico quando imageUrl está ausente mas há título", () => {
    const html = renderToStaticMarkup(
      <IFoodSquareCategoryButton
        id="btn-2"
        title="Gastronomia Local"
        targetUrl="/gastronomia"
      />
    );

    // Não deve omitir o botão; deve renderizar container com ícone vetorial e título
    expect(html).not.toBe("");
    expect(html).toContain("Gastronomia Local");
    expect(html).toContain("min-h-11");
    expect(html).toContain("svg"); // Ícone Utensils do Lucide
  });

  it("renderiza badge promocional no canto do squircle", () => {
    const html = renderToStaticMarkup(
      <IFoodSquareCategoryButton
        id="btn-3"
        title="Lojas de Conveniência"
        badgeText="Novo"
      />
    );

    expect(html).toContain("Novo");
    expect(html).toContain("Lojas de Conveniência");
  });

  it("omite estritamente o botão quando não há nem imagem nem título/badge", () => {
    const html = renderToStaticMarkup(
      <IFoodSquareCategoryButton
        id="btn-empty"
        imageUrl={null}
        title={null}
      />
    );

    expect(html).toBe("");
  });
});
