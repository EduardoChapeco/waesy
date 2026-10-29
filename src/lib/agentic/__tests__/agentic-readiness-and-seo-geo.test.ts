import { describe, expect, it } from "vitest";
import {
  buildAgentApiHeaders,
  buildCompanyPublicLegalFicha,
  buildCompanySeoGeoJsonLd,
  buildStructuredApiErrorResponse,
  evaluateAgenticReadiness,
  extractCleanMarkdownFromHtml,
  formatCnpjMask,
  isProtectedPath,
  prefersMarkdownNegotiation,
  renderAgentFriendly404Markdown,
  renderCanonicalRouteMarkdown,
  sanitizePublicPayload,
} from "../agentic-readiness-engine";
import { generateOmniPageSeo } from "../../builder/omni-page-seo";
import {
  buildJobSeoHead,
  buildTourismSeoHead,
  buildBookingServiceSeoHead,
  buildLeadFormSeoHead,
  buildBiolinkSeoHead,
  buildCommunitySeoHead,
  buildRaffleSeoHead,
} from "../../seo/universal-seo-head";

describe("Waesy Agentic Readiness (20-Check Ora / Is-Agentic Model), SEO, GEO & Zero-Trust Firewall", () => {
  it("evaluates all 20 Ora / is-agentic.com checks to 100/100 when fully configured", () => {
    const report = evaluateAgenticReadiness({
      url: "https://waesy.com.br/",
      title: "Waesy Local Marketplace — Comércio, Serviços, Notícias e Agentes IA",
      description:
        "Waesy Local Marketplace: ecossistema operacional integrado de comércio local, empresas verificadas com CNPJ, notícias e protocolo WebMCP.",
      h1: "Waesy Local Marketplace — Comércio, Serviços, Notícias e Ecossistema de Agentes IA",
      bodyTextLength: 3500,
      hasCanonical: true,
      hasHtmlLang: true,
      hasOgImage: true,
      hasOgType: true,
      hasJsonLd: true,
      hasJsonLdDescription: true,
      hasOrgAddress: true,
      hasOrgContactPoint: true,
      hasMarkdownNegotiation: true,
      hasVaryAccept: true,
      hasAgentFriendly404: true,
      hasJsonErrorResponses: true,
      hasPublicApi: true,
      hasDeveloperDocs: true,
      hasApiLinkedFromHome: true,
      hasWhenToUseGuidance: true,
      hasCliTool: true,
      hasTrustAnchors: true,
      hasRateLimitHeaders: true,
      restSchemaCoveragePct: 100,
      hasPredictableDevUrls: true,
      hasMcpServerHandshake: true,
      functionCallingCompatibilityPct: 100,
      hasVersioningAndDeprecationPolicy: true,
      hasGeoMeta: true,
      hasBacklinkGraph: true,
    });

    expect(report.overallScore).toBe(100);
    expect(report.grade).toBe("A+");
    expect(report.checks.length).toBeGreaterThanOrEqual(20);
    for (const check of report.checks) {
      expect(check.status).toBe("passed");
      expect(check.scorePct).toBe(100);
    }
  });

  it("reproduces partial/failed checks when H1, Markdown negotiation, or MCP handshake are missing", () => {
    const baselineReport = evaluateAgenticReadiness({
      url: "https://waesy.com.br/",
      title: "Waesy — Vitrine da Cidade",
      description: "Encontre classificados e empresas.",
      h1: "",
      bodyTextLength: 3217,
      hasCanonical: false,
      hasHtmlLang: true,
      hasOgImage: false,
      hasOgType: true,
      hasJsonLd: true,
      hasJsonLdDescription: false,
      hasOrgAddress: false,
      hasOrgContactPoint: false,
      hasMarkdownNegotiation: false,
      hasVaryAccept: false,
      hasAgentFriendly404: false,
      hasJsonErrorResponses: false,
      hasPublicApi: false,
      hasDeveloperDocs: false,
      hasApiLinkedFromHome: false,
      hasWhenToUseGuidance: false,
      hasCliTool: false,
      hasTrustAnchors: false,
      hasRateLimitHeaders: false,
      restSchemaCoveragePct: 22,
      hasPredictableDevUrls: false,
      hasMcpServerHandshake: false,
      functionCallingCompatibilityPct: 50,
      hasVersioningAndDeprecationPolicy: false,
    });

    expect(baselineReport.overallScore).toBeLessThan(60);
    const check1 = baselineReport.checks.find((c) => c.number === 1);
    const check4 = baselineReport.checks.find((c) => c.number === 4);
    const check15 = baselineReport.checks.find((c) => c.number === 15);
    expect(check1?.status).toBe("partial");
    expect(check4?.status).toBe("failed");
    expect(check15?.status).toBe("partial");
  });

  it("handles Markdown content negotiation (Check #4) and Agent-friendly 404s (Check #2)", () => {
    const mdReq = new Request("https://waesy.com.br/", {
      headers: { Accept: "text/markdown, text/html;q=0.8" },
    });
    const htmlReq = new Request("https://waesy.com.br/", {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });

    expect(prefersMarkdownNegotiation(mdReq)).toBe(true);
    expect(prefersMarkdownNegotiation(htmlReq)).toBe(false);

    const homeMd = renderCanonicalRouteMarkdown("/");
    expect(homeMd).toContain("Waesy");
    expect(homeMd).toContain("https://waesy.com.br/llms.txt");
    expect(homeMd).toContain("https://waesy.com.br/developers");
    expect(homeMd.length).toBeGreaterThan(500);

    const notFoundMd = renderAgentFriendly404Markdown("/__ora-404-probe-s0me2o2v");
    expect(notFoundMd.length).toBeGreaterThan(100);
    expect(notFoundMd).toContain("404");
    expect(notFoundMd).toContain("https://waesy.com.br/docs");
    expect(notFoundMd).toContain("https://waesy.com.br/sitemap.xml");
    expect(notFoundMd).toContain("https://waesy.com.br/llms.txt");
  });

  it("returns structured JSON error responses (Check #3) and RateLimit/Versioning headers (Checks #12, #20)", async () => {
    const errRes = buildStructuredApiErrorResponse({
      status: 404,
      code: "API_ENDPOINT_NOT_FOUND",
      message: "Endpoint not found",
      hint: "See /api/openapi.json for valid operations.",
      path: "/api/nonexistent",
    });

    expect(errRes.status).toBe(404);
    expect(errRes.headers.get("Content-Type")).toContain("application/json");
    expect(errRes.headers.get("RateLimit-Limit")).toBeTruthy();
    expect(errRes.headers.get("RateLimit-Remaining")).toBeTruthy();
    expect(errRes.headers.get("RateLimit-Reset")).toBeTruthy();
    expect(errRes.headers.get("X-API-Version")).toBeTruthy();
    expect(errRes.headers.get("Deprecation")).toBe("false");

    const body = await errRes.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("API_ENDPOINT_NOT_FOUND");
    expect(body.error.hint).toContain("/api/openapi.json");
    expect(body.error.docs_url).toBe("https://waesy.com.br/developers");
  });

  it("enforces Zero-Trust path protection and strips sensitive backend fields", () => {
    expect(isProtectedPath("/workspace/pos")).toBe(true);
    expect(isProtectedPath("/admin-master/users")).toBe(true);
    expect(isProtectedPath("/conta/pedidos")).toBe(true);
    expect(isProtectedPath("/checkout/sucesso")).toBe(true);
    expect(isProtectedPath("/api/internal/cron")).toBe(true);

    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/noticias")).toBe(false);
    expect(isProtectedPath("/loja/mercado-central")).toBe(false);
    expect(isProtectedPath("/developers")).toBe(false);

    const dirtyPayload = {
      id: "store-1",
      name: "Supermercado Modelo",
      cnpj: "12345678000195",
      cost_cents: 4500,
      supplier_cost_cents: 4100,
      service_role_key: "secret-key",
      password_hash: "hash123",
      stripe_secret_key: "sk_live_123",
    };

    const sanitized = sanitizePublicPayload(dirtyPayload);
    expect(sanitized.name).toBe("Supermercado Modelo");
    expect(sanitized.cnpj).toBe("12345678000195");
    expect(sanitized.cost_cents).toBeUndefined();
    expect(sanitized.supplier_cost_cents).toBeUndefined();
    expect(sanitized.service_role_key).toBeUndefined();
    expect(sanitized.password_hash).toBeUndefined();
    expect(sanitized.stripe_secret_key).toBeUndefined();
  });

  it("builds verified Company Public Legal Ficha (Cartão CNPJ), JSON-LD LocalBusiness, and Omni-Builder backlinks", () => {
    expect(formatCnpjMask("12345678000195")).toBe("12.345.678/0001-95");

    const sampleStore = {
      id: "store-123",
      slug: "excelencia-tour",
      name: "Excelência Tour",
      corporate_name: "EXCELENCIA TOUR VIAGENS E TURISMO LTDA",
      cnpj: "12345678000195",
      city: "São Miguel do Oeste",
      state: "SC",
      address: "Rua Central, 500",
      postal_code: "89900-000",
      latitude: -26.724,
      longitude: -53.518,
      phone: "4936210000",
      website: "https://excelenciatour.com.br",
      instagram: "@excelenciatour",
      cost_cents: 9999,
    };

    const ficha = buildCompanyPublicLegalFicha(sampleStore);
    expect(ficha.cnpjFormatted).toBe("12.345.678/0001-95");
    expect(ficha.corporateName).toBe("EXCELENCIA TOUR VIAGENS E TURISMO LTDA");
    expect(ficha.tradeName).toBe("Excelência Tour");
    expect(ficha.address.city).toBe("São Miguel do Oeste");
    expect(ficha.backlinks.sameAs).toContain("https://waesy.com.br/loja/excelencia-tour");
    expect(ficha.backlinks.sameAs).toContain("https://excelenciatour.com.br");
    expect(ficha.dataCompletenessScore).toBeGreaterThanOrEqual(80);

    const jsonLd: any = buildCompanySeoGeoJsonLd(sampleStore);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    const bizNode = jsonLd["@graph"].find((n: any) =>
      Array.isArray(n["@type"]) ? n["@type"].includes("LocalBusiness") : n["@type"] === "LocalBusiness",
    );
    expect(bizNode).toBeTruthy();
    expect(bizNode.taxID).toBe("12.345.678/0001-95");
    expect(bizNode.legalName).toBe("EXCELENCIA TOUR VIAGENS E TURISMO LTDA");
    expect(bizNode.sameAs).toContain("https://waesy.com.br/loja/excelencia-tour");

    const omniSeo = generateOmniPageSeo({
      document: {
        title: "Roteiros Internacionais",
        description: "Pacotes completos de viagem saindo de São Miguel do Oeste.",
        store_id: "store-123",
      },
      storeData: sampleStore,
      slug: "excelencia-roteiros",
    });

    expect(omniSeo.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/paginas/excelencia-roteiros")).toBe(true);
    const parsedScript = JSON.parse(omniSeo.scripts[0].children);
    const omniBiz = parsedScript["@graph"].find((n: any) =>
      Array.isArray(n["@type"]) ? n["@type"].includes("LocalBusiness") : n["@type"] === "LocalBusiness",
    );
    expect(omniBiz.taxID).toBe("12345678000195");
    expect(omniBiz.sameAs).toContain("https://waesy.com.br/loja/excelencia-tour");
  });

  it("builds canonical universal SEO/GEO heads across all dynamic vertical entities and extracts JSON-LD into Markdown", () => {
    // 1. Job Head (JobPosting)
    const jobHead = buildJobSeoHead({
      id: "job-101",
      title: "Desenvolvedor Full-Stack",
      company_name: "Tech Solutions",
      location: "Chapecó - SC",
      city: "Chapecó",
      state: "SC",
      salary_min_cents: 800000,
    });
    expect(jobHead.meta.some((m) => m.title?.includes("Desenvolvedor Full-Stack"))).toBe(true);
    expect(jobHead.meta.some((m) => m.name === "webmcp-type" && m.content === "job_posting")).toBe(true);
    expect(jobHead.meta.some((m) => m.name === "geo.region" && m.content === "BR-SC")).toBe(true);
    expect(jobHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/empregos/job-101")).toBe(true);

    // 2. Tourism Head (TouristTrip)
    const tourismHead = buildTourismSeoHead({
      id: "tour-202",
      title: "Excursão Serra Gaúcha & Vinhedos",
      price_cents: 120000,
      destination_city: "Gramado",
    });
    expect(tourismHead.meta.some((m) => m.name === "webmcp-type" && m.content === "tourism_experience")).toBe(true);
    expect(tourismHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/turismo/tour-202")).toBe(true);

    // 3. Service Booking Head (Service)
    const bookingHead = buildBookingServiceSeoHead({
      id: "serv-303",
      title: "Corte e Barba Tradicional",
      price_cents: 6000,
      store_name: "Barbearia Imperial",
    });
    expect(bookingHead.meta.some((m) => m.name === "webmcp-type" && m.content === "booking_service")).toBe(true);
    expect(bookingHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/agendar/serv-303")).toBe(true);

    // 4. Lead Form & Biolink Heads
    const formHead = buildLeadFormSeoHead({ slug: "campanha-natal", title: "Promoção Especial de Natal", store: { name: "Loja ABC" } });
    expect(formHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/f/campanha-natal")).toBe(true);

    const bioHead = buildBiolinkSeoHead({ slug: "joaosilva", title: "João Silva Oficial" });
    expect(bioHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/bio/joaosilva")).toBe(true);

    // 5. Community & Raffle Heads
    const commHead = buildCommunitySeoHead({ slug: "moradores-centro", title: "Moradores do Centro" });
    expect(commHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/c/moradores-centro")).toBe(true);

    const raffleHead = buildRaffleSeoHead({ id: "raf-505", title: "Sorteio de iPhone 16", storeName: "Eletro Magazine" });
    expect(raffleHead.links.some((l) => l.rel === "canonical" && l.href === "https://waesy.com.br/concurso/raf-505")).toBe(true);

    // 6. JSON-LD Extraction into Markdown for AI Agents
    const sampleHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Vaga de Desenvolvedor — Tech Solutions | Waesy</title>
          <meta name="description" content="Excelente oportunidade de carreira." />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "JobPosting",
              "title": "Desenvolvedor Full-Stack",
              "hiringOrganization": { "@type": "Organization", "name": "Tech Solutions" },
              "employmentType": "FULL_TIME",
              "offers": { "price": "8000.00", "priceCurrency": "BRL" },
              "address": { "addressLocality": "Chapecó", "addressRegion": "SC" }
            }
          </script>
        </head>
        <body>
          <h1>Desenvolvedor Full-Stack</h1>
          <h2>Requisitos da Vaga</h2>
          <p>Experiência em React, Node.js e bancos SQL relacionais.</p>
        </body>
      </html>
    `;

    const extractedMd = extractCleanMarkdownFromHtml(sampleHtml, "https://waesy.com.br/empregos/job-101");
    expect(extractedMd).toContain("## Ficha Técnica Estruturada (Schema.org / JSON-LD)");
    expect(extractedMd).toContain("Tech Solutions");
    expect(extractedMd).toContain("Chapecó - SC");
    expect(extractedMd).toContain("R$ 8000.00");
    expect(extractedMd).toContain("Requisitos da Vaga");
  });
});
