import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { UniversalBlockInspector } from "./universal-block-inspector";
import { ClassicBlockAdapter } from "./ClassicBlockAdapter";
import { OmniPageRenderer } from "./OmniPageRenderer";
import type { OmniBlockInstance, OmniPageDocument } from "./types";

// Mock do framer-motion para evitar issues em ambiente node
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    section: ({ children, className, style, ...props }: any) => (
      <section className={className} style={style} {...props}>
        {children}
      </section>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock do cart context
vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    cart: null,
    refreshCart: vi.fn(),
    setIsCartOpen: vi.fn(),
  }),
}));

describe("Omni Builder & Vitrines — Paridade Arquitetural WYSIWYG", () => {
  it("renderiza UniversalBlockInspector contextual baseado nas capacidades do bloco", () => {
    const mockBlock: OmniBlockInstance = {
      id: "block-test-1",
      type: "vitrine_buttons_dock",
      config: {
        title: "Atalhos Rápidos",
        subtitle: "Serviços da cidade",
        badge: "Destaque",
        ctaLabel: "Ver Todos",
        ctaLink: "/todos",
      },
      styling: {
        paddingY: "md",
        backgroundColor: "card",
        borderRadius: "2xl",
      },
      capabilities: {
        text: true,
        background: true,
        media: true,
        animation: true,
        layout: true,
        responsive: true,
        dataBinding: true,
        interactions: true,
        visibility: true,
        collectionManager: true,
        substates: true,
      },
    };

    const handleUpdateConfig = vi.fn();
    const handleUpdateStyling = vi.fn();
    const handleUpdateDataBinding = vi.fn();
    const handleUpdateSubstate = vi.fn();

    const html = renderToStaticMarkup(
      <UniversalBlockInspector
        selectedBlock={mockBlock}
        onUpdateConfig={handleUpdateConfig}
        onUpdateStyling={handleUpdateStyling}
        onUpdateDataBinding={handleUpdateDataBinding}
        onUpdateSubstate={handleUpdateSubstate}
      />
    );

    // Deve renderizar as abas contextuais correspondentes às capacidades
    expect(html).toContain("Conteúdo");
    expect(html).toContain("Layout");
    expect(html).toContain("Aparência");
    expect(html).toContain("Dados");
    expect(html).toContain("Comportamento");
  });

  it("ClassicBlockAdapter repassa activeSubstate e onUpdateInlineText aos componentes de vitrine", () => {
    const DummyComponent: React.FC<any> = (props) => (
      <div data-testid="dummy-component">
        <span data-testid="substate">{props.activeSubstate || "default"}</span>
        <span data-testid="inline-text-ready">{typeof props.onUpdateInlineText === "function" ? "yes" : "no"}</span>
      </div>
    );

    const onInlineEdit = vi.fn();

    const html = renderToStaticMarkup(
      <ClassicBlockAdapter
        id="classic-1"
        component={DummyComponent}
        data={{ title: "Título Inicial" }}
        activeSubstate="drawer_open"
        onUpdateInlineText={onInlineEdit}
      />
    );

    expect(html).toContain("drawer_open");
    expect(html).toContain("yes");
  });

  it("OmniPageRenderer renderiza múltiplos blocos sincronizados com liveData sem exceptions", () => {
    const mockDocument: OmniPageDocument = {
      id: "doc-sample-1",
      slug: "home",
      title: "Início",
      document_type: "storefront",
      blocks: [
        {
          id: "b1",
          type: "vitrine_buttons_dock",
          config: {
            title: "Viva o Melhor da Cidade",
            subtitle: "Conectando moradores, turistas e comércios",
            items: [
              {
                id: "item-1",
                label: "Gastronomia",
                href: "/gastronomia",
                iconName: "ForkKnife",
              },
            ],
          },
          styling: {
            paddingY: "lg",
          },
        },
      ],
      settings: {
        is_platform_surface: true,
      },
    };

    const html = renderToStaticMarkup(
      <OmniPageRenderer
        document={mockDocument}
        products={[{ id: "p1", title: "Pizza Artesanal", price_cents: 4500 }]}
        stores={[{ id: "s1", name: "Pizzaria Waesy", slug: "pizzaria-waesy" }]}
      />
    );

    expect(html).toBeDefined();
    expect(html).toContain("Gastronomia");
  });
});
