import { createFileRoute } from "@tanstack/react-router";
import { MCP_TOOLS_MANIFEST } from "@/services/mcp-server.functions";
import {
  buildAgentApiHeaders,
  WAESY_API_VERSION,
  WAESY_CANONICAL_ORIGIN,
  WAESY_SUNSET_DATE,
} from "@/lib/agentic/agentic-readiness-engine";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/v1/public/discovery")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const city = (url.searchParams.get("city") || "Chapecó").trim();
        const query = (url.searchParams.get("q") || "").trim().toLowerCase();

        const publicTools = MCP_TOOLS_MANIFEST.filter((t) => t.tier === "public").map((t) => ({
          name: t.name,
          module: t.module,
          description: t.description,
          idempotent: t.idempotent ?? true,
        }));

        const pillars = [
          {
            id: "marketplace",
            name: "Marketplace Local & Ofertas",
            url: `${WAESY_CANONICAL_ORIGIN}/marketplace`,
            description: "Catálogo de produtos locais, supermercados, farmácias e lojas verificadas com preços em BRL.",
          },
          {
            id: "directory",
            name: "Guia de Empresas & Ficha Cadastral CNPJ",
            url: `${WAESY_CANONICAL_ORIGIN}/diretorio`,
            description: "Perfis empresariais verificados com Razão Social, Nome Fantasia, CNPJ, CNAE, endereço georreferenciado e contatos.",
          },
          {
            id: "places",
            name: "Waesy Places & Mapa Comercial",
            url: `${WAESY_CANONICAL_ORIGIN}/places`,
            description: "Estabelecimentos físicos com coordenadas geográficas, horários e rotas.",
          },
          {
            id: "news",
            name: "Portal de Notícias Regionais",
            url: `${WAESY_CANONICAL_ORIGIN}/noticias`,
            description: "Jornalismo regional apurado, cobertura de cidades e artigos estruturados em NewsArticle JSON-LD.",
          },
          {
            id: "events",
            name: "Agenda Cultural & Eventos",
            url: `${WAESY_CANONICAL_ORIGIN}/eventos`,
            description: "Shows, feiras, congressos e eventos comunitários com emissão de ingressos.",
          },
          {
            id: "recipes",
            name: "Receitas & Gastronomia",
            url: `${WAESY_CANONICAL_ORIGIN}/receitas`,
            description: "Acervo gastronômico estruturado com ingredientes e modo de preparo (Schema.org Recipe).",
          },
          {
            id: "jobs",
            name: "Vagas de Emprego & Carreiras",
            url: `${WAESY_CANONICAL_ORIGIN}/empregos`,
            description: "Oportunidades de trabalho publicadas por empresas locais verificadas.",
          },
          {
            id: "tourism",
            name: "Turismo, Roteiros & Mobilidade",
            url: `${WAESY_CANONICAL_ORIGIN}/turismo`,
            description: "Pacotes de viagem, excursões, aluguel de carros e mobilidade urbana Waesy Go.",
          },
        ].filter(
          (p) =>
            !query ||
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.id.includes(query),
        );

        const payload = {
          status: "ok",
          platform: "Waesy Local Marketplace & AI Ecosystem",
          version: WAESY_API_VERSION,
          canonicalOrigin: WAESY_CANONICAL_ORIGIN,
          activeCity: city,
          capabilities: {
            markdownNegotiation: true,
            mcpStreamableHttp: true,
            openApiVersion: "3.1.0",
            publicToolsCount: publicTools.length,
            totalToolsCount: MCP_TOOLS_MANIFEST.length,
          },
          deprecationPolicy: {
            versionHeader: "X-API-Version",
            deprecationHeader: "Deprecation",
            sunsetHeader: "Sunset",
            sunsetHorizon: WAESY_SUNSET_DATE,
            policyUrl: `${WAESY_CANONICAL_ORIGIN}/developers#deprecation-policy`,
          },
          pillars,
          publicMcpTools: publicTools,
          links: {
            homepage: WAESY_CANONICAL_ORIGIN,
            developers: `${WAESY_CANONICAL_ORIGIN}/developers`,
            docs: `${WAESY_CANONICAL_ORIGIN}/docs`,
            openapi: `${WAESY_CANONICAL_ORIGIN}/api/openapi.json`,
            webmcp: `${WAESY_CANONICAL_ORIGIN}/api/webmcp.json`,
            mcpDiscovery: `${WAESY_CANONICAL_ORIGIN}/.well-known/mcp.json`,
            mcpEndpoint: `${WAESY_CANONICAL_ORIGIN}/api/mcp/v1/tools/call`,
            llmsTxt: `${WAESY_CANONICAL_ORIGIN}/llms.txt`,
            llmsFullTxt: `${WAESY_CANONICAL_ORIGIN}/llms-full.txt`,
            sitemap: `${WAESY_CANONICAL_ORIGIN}/sitemap.xml`,
            about: `${WAESY_CANONICAL_ORIGIN}/about`,
            contact: `${WAESY_CANONICAL_ORIGIN}/contact`,
            privacy: `${WAESY_CANONICAL_ORIGIN}/privacy`,
          },
        };

        return new Response(JSON.stringify(payload, null, 2), {
          status: 200,
          headers: buildAgentApiHeaders({
            extraHeaders: {
              "Cache-Control": "public, max-age=300",
            },
          }),
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: buildAgentApiHeaders(),
        });
      },
    },
  },
} as never);
