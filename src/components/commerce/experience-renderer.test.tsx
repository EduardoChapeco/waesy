import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { addBlockToPage, createEmptyOmniPage } from "@/types/omni-builder";
import {
  ExperienceRenderer,
  EXPERIENCE_STRUCTURAL_BLOCK_TYPES,
  getExperienceRendererAliases,
  getExperienceRendererBlockTypes,
} from "./experience-renderer";
import { builderRegistry } from "@/lib/builder/builder-registry";

describe("ExperienceRenderer Omni AST integration", () => {
  it("renders the canonical Omni block through the Experience renderer and applies page theme", () => {
    let page = createEmptyOmniPage("renderer-integration", "Integration page");
    page = addBlockToPage(page, "hero_minimal_split", {
      badgeText: "WAESY STUDIO",
      title: "AST canônico renderizado",
      subtitle: "Mesmo documento; renderer de experiência.",
      primaryCta: { label: "Conhecer", href: "#conhecer" },
      imageUrl: "",
      imageAlt: "",
    });
    page.theme.backgroundColor = "#ffffff";
    page.theme.textColor = "#111111";

    const markup = renderToStaticMarkup(<ExperienceRenderer document={page} />);
    expect(markup).toContain(`data-omni-document-id="${page.page_id}"`);
    expect(markup).toContain("AST canônico renderizado");
    expect(markup).toContain("WAESY STUDIO");
    expect(markup).toContain("background-color:#ffffff");
    expect(markup).toContain('data-node-id=');
  });

  it("mantém o renderer legacy nodes sem exigir documento Omni", () => {
    const markup = renderToStaticMarkup(
      <ExperienceRenderer nodes={[
        {
          id: "legacy-rich-text",
          node_type: "element",
          block_type: "rich_text",
          content: { text: "Conteúdo legado" },
          design_tokens: {},
          layout_rules: {},
          responsive_overrides: {},
          data_bindings: {},
          action_bindings: {},
          sort_order: 0,
          is_hidden: false,
        },
      ]} />,
    );
    expect(markup).toContain("Conteúdo legado");
  });

  it("não deixa manifesto órfão entre registry, inspector e renderer", () => {
    const rendererTypes = new Set(getExperienceRendererBlockTypes());
    const aliases = getExperienceRendererAliases();
    const covered = new Set([
      ...rendererTypes,
      ...EXPERIENCE_STRUCTURAL_BLOCK_TYPES,
      ...Object.keys(aliases),
      ...Object.values(aliases),
    ]);
    const orphaned = Object.keys(builderRegistry).filter((blockType) => !covered.has(blockType));

    expect(orphaned).toEqual([]);
  });
});
