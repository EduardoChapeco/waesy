import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ValeNewsPortal } from "../vale-news-portal";
import { PrometheeNewsPortalBlock } from "@/components/builder/blocks/PrometheeNewsPortalBlock";
import { getStudioTemplate, materializeStudioTemplate } from "@/lib/builder/studio-catalog";
import { createEmptyOmniPage } from "@/types/omni-builder";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";

describe("ValeNewsPortal & Prométhée Builder Template", () => {
  it("renders the responsive Prométhée light portal with native scroll container, city filter, and breaking carousel", () => {
    const html = renderToStaticMarkup(<ValeNewsPortal />);
    expect(html).toContain("h-dvh");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("light");
    expect(html).toContain("Vale Agora");
    expect(html).toContain("Proposta");
    expect(html).toContain("Criar Posts (PNG)");
    expect(html).toContain("Ler mais");
    expect(html).toContain("BREAKING NEWS");
    expect(html).toContain("ADS");
  });

  it("registers news_promethee_portal and template_editorial_news in the Omni Builder catalog and renders the block", () => {
    const blockDef = getSiteBlockByIdStrict("news_promethee_portal");
    expect(blockDef).toBeDefined();
    expect(blockDef?.name).toContain("Prométhée");

    const studioTpl = getStudioTemplate("template_editorial_news");
    expect(studioTpl).toBeDefined();
    expect(studioTpl?.blocks[0]?.type).toBe("news_promethee_portal");

    const emptyDoc = createEmptyOmniPage("jornal-local", "Jornal Local", "news");
    const materialized = materializeStudioTemplate(emptyDoc, "template_editorial_news");
    expect(materialized.blocks.length).toBeGreaterThanOrEqual(4);
    expect(materialized.blocks[0].type).toBe("news_promethee_portal");

    const blockHtml = renderToStaticMarkup(
      <PrometheeNewsPortalBlock
        id="test-promethee"
        data={blockDef!.defaultProps}
      />,
    );
    expect(blockHtml).toContain("Vale Agora");
    expect(blockHtml).toContain("Ler mais");
  });
});
