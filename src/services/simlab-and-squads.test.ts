import { describe, it, expect } from "vitest";
import { renderSlideHTML5 } from "./squad-content.functions";
import { MCP_TOOLS_MANIFEST } from "./mcp-server.functions";

describe("Contratos seguros de marketing, SimLab e MCP", () => {
  it("renderiza slides HTML com as dimensões esperadas e preserva conteúdo textual", () => {
    const html = renderSlideHTML5({
      headline: "Uma oferta para conhecer",
      body: "Confira os detalhes e avalie se ela atende às suas necessidades.",
      slideIndex: 1,
      totalSlides: 5,
      companyName: "Waesy",
      template: "bold-color",
      cta: "Saiba mais",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("width: 1080px;");
    expect(html).toContain("height: 1080px;");
    expect(html).toContain("Uma oferta para conhecer");
    expect(html).toContain("Slide 1 de 5");
  });

  it("escapa texto do usuário e impede injeção de HTML nos slides", () => {
    const html = renderSlideHTML5({
      headline: "<script>alert(1)</script>",
      body: "Texto & informação",
      slideIndex: 1,
      totalSlides: 1,
      companyName: "<img src=x>",
      template: "clean-white",
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Texto &amp; informação");
    expect(html).toContain("&lt;img src=x&gt;");
  });

  it("expõe um manifesto MCP com esquemas estruturados e descrições suficientes", () => {
    const toolNames = MCP_TOOLS_MANIFEST.map((tool) => tool.name);
    expect(toolNames).toContain("simlab_run_survey");
    expect(toolNames).toContain("generate_marketing_post");
    expect(toolNames).toContain("analyze_competitor_dna");
    expect(toolNames).toContain("query_master_catalog");
    for (const tool of MCP_TOOLS_MANIFEST) {
      expect(tool.description.length).toBeGreaterThan(15);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });
});
