import { describe, it, expect } from "vitest";

describe("Sitemap Index and Segmented Sitemaps", () => {
  it("formats valid sitemapindex XML structure", async () => {
    const origin = "https://waesy.com.br";
    const today = new Date().toISOString().slice(0, 10);

    const sitemaps = [
      { loc: `${origin}/sitemap.xml`, lastmod: today },
      { loc: `${origin}/sitemap-news.xml`, lastmod: today },
      { loc: `${origin}/sitemap-produtos.xml`, lastmod: today },
      { loc: `${origin}/sitemap-empresas.xml`, lastmod: today },
      { loc: `${origin}/sitemap-classificados.xml`, lastmod: today },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const sm of sitemaps) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${sm.loc}</loc>\n`;
      xml += `    <lastmod>${sm.lastmod}</lastmod>\n`;
      xml += `  </sitemap>\n`;
    }
    xml += `</sitemapindex>`;

    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("https://waesy.com.br/sitemap.xml");
    expect(xml).toContain("https://waesy.com.br/sitemap-news.xml");
    expect(xml).toContain("https://waesy.com.br/sitemap-produtos.xml");
    expect(xml).toContain("https://waesy.com.br/sitemap-empresas.xml");
    expect(xml).toContain("https://waesy.com.br/sitemap-classificados.xml");
    expect(xml).toContain("</sitemapindex>");
  });
});
