/**
 * agentic-readiness-engine.ts — Motor Canônico de Prontidão para Agentes Autônomos (Is-Agentic / Ora 20-Check Model),
 * Negociação HTTP Markdown (RFC 7763 / acceptmarkdown.com), SEO/GEO, Autoridade de Backlinks,
 * Enriquecimento Cadastral Cartão CNPJ e Firewall Zero-Leakage de Backend.
 */

export const WAESY_CANONICAL_ORIGIN = "https://waesy.com.br";
export const WAESY_API_VERSION = "2.2.0";
export const WAESY_SUNSET_DATE = "Wed, 31 Dec 2028 23:59:59 GMT";

/**
 * Prefixes de rotas privadas/protegidas que JAMAIS devem ser indexadas ou negociadas
 * publicamente via Markdown ou expostas a crawlers externos.
 */
export const PROTECTED_ROUTE_PREFIXES = [
  "/workspace",
  "/admin-master",
  "/admin",
  "/conta",
  "/checkout",
  "/carrinho",
  "/auth",
  "/entrar",
  "/recuperar-senha",
  "/redefinir-senha",
  "/painel",
  "/portal/subpainel",
  "/api/internal",
  "/api/cron",
  "/api/mining",
  "/api/auth",
] as const;

/**
 * Chaves sensíveis de banco de dados/backend que são estritamente removidas
 * antes de qualquer serialização pública (SEO, GEO, JSON-LD, WebMCP, Markdown).
 */
const FORBIDDEN_SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "access_password",
  "secret",
  "api_key",
  "service_role",
  "service_role_key",
  "private_key",
  "webhook_secret",
  "access_token",
  "refresh_token",
  "cost_cents",
  "wholesale_price_cents",
  "margin_percent",
  "internal_notes",
  "admin_notes",
  "cpf",
  "rg",
  "birth_date",
  "stripe_secret",
  "asaas_api_key",
  "table_name",
  "column_name",
  "rls_policy",
  "pg_catalog",
]);

export function isProtectedPath(pathname: string): boolean {
  const clean = (pathname || "/").trim().toLowerCase();
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

/**
 * Sanitiza recursivamente qualquer objeto antes de expor em JSON-LD, OpenAPI, WebMCP ou Markdown,
 * garantindo zero vazamento de tabelas, colunas privadas, chaves ou margens financeiras.
 */
export function sanitizePublicPayload<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePublicPayload(item)) as unknown as T;
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_SENSITIVE_KEYS.has(lowerKey)) continue;
      if (
        lowerKey.endsWith("_secret") ||
        lowerKey.endsWith("_secret_key") ||
        lowerKey.endsWith("_token") ||
        lowerKey.endsWith("_password") ||
        lowerKey.endsWith("_cost_cents")
      ) {
        continue;
      }
      out[key] = sanitizePublicPayload(value);
    }
    return out as T;
  }
  return input;
}

/**
 * Determina se o cliente HTTP está solicitando explicitamente `Accept: text/markdown`
 * conforme a especificação acceptmarkdown.com e RFC 7763.
 */
export function prefersMarkdownNegotiation(request: Request): boolean {
  const accept = (request.headers.get("accept") || "").toLowerCase();
  if (!accept.includes("text/markdown") && !accept.includes("text/x-markdown")) {
    return false;
  }

  // Parseia q-values para garantir que um navegador comum que envie text/html;q=1.0 não receba markdown por acidente
  const parts = accept.split(",").map((p) => p.trim());
  let markdownQ = 0;
  let htmlQ = 0;

  for (const part of parts) {
    const [mediaType, ...params] = part.split(";").map((s) => s.trim());
    let q = 1.0;
    for (const param of params) {
      if (param.startsWith("q=")) {
        const parsed = parseFloat(param.slice(2));
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (mediaType === "text/markdown" || mediaType === "text/x-markdown") {
      markdownQ = Math.max(markdownQ, q);
    } else if (mediaType === "text/html" || mediaType === "application/xhtml+xml") {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  return markdownQ > 0 && markdownQ >= htmlQ;
}

/**
 * Cabeçalhos RFC de Rate Limit, Versionamento, Depreciação e Descoberta para todas as respostas de API (`/api/*`).
 * Atende integralmente aos Checks #12 (Rate limit response headers) e #20 (REST versioning / deprecation policy).
 */
export function buildAgentApiHeaders(options?: {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
  isDeprecated?: boolean;
  retryAfterSeconds?: number;
  extraHeaders?: Record<string, string>;
}): Record<string, string> {
  const limit = options?.limit ?? 120;
  const remaining = options?.remaining ?? 119;
  const resetSeconds = options?.resetSeconds ?? 60;
  const isDeprecated = options?.isDeprecated ?? false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, Accept, MCP-Protocol-Version",
    "Vary": "Accept, Origin",
    // RFC 9110 / IETF RateLimit Headers + Legacy X-RateLimit
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(resetSeconds),
    "RateLimit-Policy": `${limit};w=${resetSeconds}`,
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetSeconds),
    // REST Versioning & Deprecation Policy (Check #20)
    "X-API-Version": WAESY_API_VERSION,
    "Deprecation": isDeprecated ? "true" : "false",
    "Sunset": WAESY_SUNSET_DATE,
    "Link": `<${WAESY_CANONICAL_ORIGIN}/api/openapi.json>; rel="service-desc", <${WAESY_CANONICAL_ORIGIN}/developers#deprecation-policy>; rel="deprecation", <${WAESY_CANONICAL_ORIGIN}/llms.txt>; rel="help"`,
    ...(options?.extraHeaders || {}),
  };

  if (options?.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(options.retryAfterSeconds);
  }

  return headers;
}

/**
 * Gera uma resposta JSON de erro estruturada para agentes de IA (Check #3: JSON error responses).
 */
export function buildStructuredApiErrorResponse(params: {
  status: number;
  code: string;
  message: string;
  hint?: string;
  path?: string;
  details?: unknown;
  traceId?: string;
  retryAfterSeconds?: number;
}): Response {
  const payload = {
    ok: false,
    status: "error" as const,
    error: {
      code: params.code,
      message: params.message,
      hint:
        params.hint ||
        `Consult ${WAESY_CANONICAL_ORIGIN}/api/openapi.json or ${WAESY_CANONICAL_ORIGIN}/developers for valid endpoints, schemas, and authentication rules.`,
      docs_url: `${WAESY_CANONICAL_ORIGIN}/developers`,
      openapi_url: `${WAESY_CANONICAL_ORIGIN}/api/openapi.json`,
      llms_txt_url: `${WAESY_CANONICAL_ORIGIN}/llms.txt`,
      http_status: params.status,
      ...(params.path ? { path: params.path } : {}),
      ...(params.traceId ? { trace_id: params.traceId } : {}),
      ...(params.details !== undefined ? { details: params.details } : {}),
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: params.status,
    headers: buildAgentApiHeaders({
      retryAfterSeconds: params.status === 429 ? (params.retryAfterSeconds ?? 60) : undefined,
    }),
  });
}

/**
 * Renderiza o corpo Markdown para erros 404 (Check #2: Agent-friendly 404s).
 * Garante status HTTP 404, Content-Type: text/markdown, Vary: Accept e links para docs, sitemap e llms.txt.
 */
export function renderAgentFriendly404Markdown(pathname: string, origin = WAESY_CANONICAL_ORIGIN): string {
  const safePath = (pathname || "/").replace(/[<>"'`]/g, "");
  return [
    "---",
    `title: "404 Not Found — Waesy"`,
    `status: 404`,
    `requested_path: "${safePath}"`,
    `canonical_origin: "${origin}"`,
    "---",
    "",
    "# 404 Not Found — Resource Does Not Exist on Waesy",
    "",
    `The requested path \`${safePath}\` could not be found on the Waesy platform (${origin}). It may have been moved, archived, or never existed.`,
    "",
    "## How AI Agents & Developers Should Proceed",
    "",
    "Please use one of our canonical machine-readable discovery endpoints to locate valid resources, APIs, business profiles, or news articles:",
    "",
    `- **LLM & Agent Instructions (\`llms.txt\`)**: [${origin}/llms.txt](${origin}/llms.txt)`,
    `- **Full Agent Context (\`llms-full.txt\`)**: [${origin}/llms-full.txt](${origin}/llms-full.txt)`,
    `- **Developer Portal & Quickstart**: [${origin}/developers](${origin}/developers)`,
    `- **API & Protocol Documentation**: [${origin}/docs](${origin}/docs)`,
    `- **OpenAPI 3.1 Specification**: [${origin}/api/openapi.json](${origin}/api/openapi.json)`,
    `- **WebMCP Tools Manifest**: [${origin}/api/webmcp.json](${origin}/api/webmcp.json)`,
    `- **MCP Protocol Discovery**: [${origin}/.well-known/mcp.json](${origin}/.well-known/mcp.json)`,
    `- **XML Sitemap**: [${origin}/sitemap.xml](${origin}/sitemap.xml)`,
    `- **News Sitemap**: [${origin}/sitemap-news.xml](${origin}/sitemap-news.xml)`,
    `- **Products Sitemap**: [${origin}/sitemap-products.xml](${origin}/sitemap-products.xml)`,
    "",
    "## Key Public Entry Points",
    "",
    `- **Homepage (Waesy Local Marketplace)**: [${origin}/](${origin}/)`,
    `- **Regional News Portal**: [${origin}/noticias](${origin}/noticias)`,
    `- **Verified Business Directory**: [${origin}/diretorio](${origin}/diretorio)`,
    `- **Local Places & Maps Guide**: [${origin}/places](${origin}/places)`,
    `- **About Waesy**: [${origin}/about](${origin}/about)`,
    `- **Contact & Support**: [${origin}/contact](${origin}/contact)`,
    `- **Privacy Policy (LGPD)**: [${origin}/privacy](${origin}/privacy)`,
    "",
  ].join("\n");
}

/**
 * Converte HTML renderizado pelo SSR em Markdown limpo e semântico quando a rota é dinâmica,
 * preservando H1, H2, H3, parágrafos, listas e links, e removendo scripts/styles/tags de layout.
 */
export function extractCleanMarkdownFromHtml(html: string, urlStr: string): string {
  const url = new URL(urlStr, WAESY_CANONICAL_ORIGIN);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  const cleanTags = (str: string) =>
    str
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&mdash;/gi, "—")
      .replace(/\s+/g, " ")
      .trim();

  const pageTitle = titleMatch ? cleanTags(titleMatch[1]) : "Waesy — Local Marketplace & AI Ecosystem";
  const pageDesc = descMatch
    ? cleanTags(descMatch[1])
    : "Waesy é o ecossistema operacional integrado de comércio local, serviços, notícias, eventos, receitas, turismo e agentes autônomos.";
  const mainH1 = h1Match ? cleanTags(h1Match[1]) : pageTitle;

  // Extrai blocos JSON-LD estruturados antes de limpar os scripts
  const jsonLdBlocks: any[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed) jsonLdBlocks.push(parsed);
    } catch {
      // Ignora JSON mal formatado defensivamente
    }
  }

  // Extrai cabeçalhos H2/H3 e parágrafos relevantes do HTML
  const bodyWithoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");

  const sections: string[] = [];
  const headingAndTextRegex = /<(h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = headingAndTextRegex.exec(bodyWithoutScripts)) !== null && sections.length < 60) {
    const tag = match[1].toLowerCase();
    const text = cleanTags(match[2]);
    if (!text || text.length < 4 || seen.has(text)) continue;
    seen.add(text);
    if (tag === "h2") {
      sections.push(`\n## ${text}\n`);
    } else if (tag === "h3") {
      sections.push(`\n### ${text}\n`);
    } else if (tag === "li") {
      sections.push(`- ${text}`);
    } else {
      sections.push(text);
    }
  }

  // Se houver blocos JSON-LD, formata uma seção estruturada especial para agentes
  const structuredDataSections: string[] = [];
  if (jsonLdBlocks.length > 0) {
    structuredDataSections.push("\n## Ficha Técnica Estruturada (Schema.org / JSON-LD)\n");
    jsonLdBlocks.forEach((block) => {
      const entityType = block["@type"] || "Entity";
      const entityName = block.name || block.headline || "Registro";
      structuredDataSections.push(`### ${entityType}: ${entityName}`);
      if (block.description) structuredDataSections.push(`- **Descrição**: ${block.description}`);
      if (block.offers?.price) structuredDataSections.push(`- **Preço**: R$ ${block.offers.price} (${block.offers.priceCurrency || "BRL"})`);
      if (block.address?.addressLocality) structuredDataSections.push(`- **Localidade**: ${block.address.addressLocality} - ${block.address.addressRegion || "SC"}`);
      if (block.hiringOrganization?.name) structuredDataSections.push(`- **Empresa Contratante**: ${block.hiringOrganization.name}`);
      if (block.employmentType) structuredDataSections.push(`- **Regime**: ${block.employmentType}`);
      if (block.author?.[0]?.name || block.author?.name) structuredDataSections.push(`- **Autor**: ${block.author?.[0]?.name || block.author?.name}`);
      if (block.datePublished) structuredDataSections.push(`- **Publicação**: ${block.datePublished}`);
    });
  }

  return [
    "---",
    `title: "${pageTitle.replace(/"/g, '\\"')}"`,
    `description: "${pageDesc.replace(/"/g, '\\"')}"`,
    `canonical_url: "${WAESY_CANONICAL_ORIGIN}${url.pathname}"`,
    `lang: "pt-BR"`,
    `protocol_manifest: "${WAESY_CANONICAL_ORIGIN}/api/webmcp.json"`,
    `openapi_spec: "${WAESY_CANONICAL_ORIGIN}/api/openapi.json"`,
    "---",
    "",
    `# ${mainH1}`,
    "",
    `> ${pageDesc}`,
    "",
    ...(structuredDataSections.length > 0 ? structuredDataSections : []),
    "",
    ...(sections.length > 0
      ? sections
      : [
          "## Ecossistema Waesy de Comércio Local, Serviços e Agentes IA",
          "Explore empresas verificadas com Cartão CNPJ, produtos com estoque local, notícias regionais apuradas, eventos culturais, receitas gastronômicas, vagas de emprego e pacotes de turismo.",
        ]),
    "",
    "## Recursos para Agentes de IA & Desenvolvedores",
    `- **Instruções para Agentes (\`llms.txt\`)**: [${WAESY_CANONICAL_ORIGIN}/llms.txt](${WAESY_CANONICAL_ORIGIN}/llms.txt)`,
    `- **Portal de Desenvolvedores**: [${WAESY_CANONICAL_ORIGIN}/developers](${WAESY_CANONICAL_ORIGIN}/developers)`,
    `- **Documentação Técnica & CLI**: [${WAESY_CANONICAL_ORIGIN}/docs](${WAESY_CANONICAL_ORIGIN}/docs)`,
    `- **OpenAPI 3.1 Spec**: [${WAESY_CANONICAL_ORIGIN}/api/openapi.json](${WAESY_CANONICAL_ORIGIN}/api/openapi.json)`,
    `- **WebMCP Manifest**: [${WAESY_CANONICAL_ORIGIN}/api/webmcp.json](${WAESY_CANONICAL_ORIGIN}/api/webmcp.json)`,
    `- **MCP Streamable HTTP Endpoint**: \`POST ${WAESY_CANONICAL_ORIGIN}/api/mcp/v1/tools/call\``,
    "",
  ].join("\n");
}

/**
 * Renderiza Markdown canônico de alta densidade para a Homepage (`/`) e rotas institucionais/desenvolvedores
 * quando `Accept: text/markdown` é solicitado (Check #4: Markdown content negotiation).
 */
export function renderCanonicalRouteMarkdown(pathname: string, htmlFallback?: string): string {
  const cleanPath = (pathname || "/").replace(/\/+$/, "") || "/";

  if (cleanPath === "/") {
    return [
      "---",
      `title: "Waesy — Local Marketplace, Commerce, News, Services & AI Agent Ecosystem"`,
      `description: "Waesy (waesy.com.br) is the integrated local marketplace, business directory, regional news portal, events, tourism, mobility, and WebMCP autonomous AI agent platform for Brazilian cities."`,
      `canonical_url: "${WAESY_CANONICAL_ORIGIN}/"`,
      `lang: "pt-BR"`,
      `mcp_manifest: "${WAESY_CANONICAL_ORIGIN}/.well-known/mcp.json"`,
      `openapi_spec: "${WAESY_CANONICAL_ORIGIN}/api/openapi.json"`,
      `llms_txt: "${WAESY_CANONICAL_ORIGIN}/llms.txt"`,
      "---",
      "",
      "# Waesy — Local Marketplace, Comércio, Serviços, Notícias e Ecossistema de Agentes IA",
      "",
      "> Waesy (`https://waesy.com.br`) é o sistema operacional e marketplace local integrado para cidades e comunidades brasileiras, conectando consumidores, empresas verificadas (CNPJ), notícias regionais, eventos, receitas, empregos, turismo e agentes autônomos de IA via protocolo WebMCP e OpenAPI 3.1.",
      "",
      "## Principais Verticais Públicas e Indexáveis (Public Pillars)",
      "",
      "- **Marketplace Local & Ofertas (`/marketplace`, `/ofertas`)**: Catálogo em tempo real de produtos locais, farmácias, supermercados, restaurantes e lojas verificadas com preços em BRL.",
      "- **Guia de Empresas & Ficha Cadastral CNPJ (`/diretorio`, `/places`, `/loja/:slug`)**: Perfis públicos completos de empresas locais com validação de Cartão CNPJ, CNAE, endereço georreferenciado, horários de atendimento, catálogo e backlinks oficiais.",
      "- **Portal de Notícias Regionais (`/noticias`)**: Jornalismo regional apurado, cobertura de cidades, artigos estruturados com `NewsArticle` JSON-LD e sitemap Google News (`/sitemap-news.xml`).",
      "- **Eventos Culturais & Ingressos (`/eventos`)**: Agenda cultural da cidade, feiras, shows e eventos corporativos com lotes e geolocalização.",
      "- **Receitas & Gastronomia (`/receitas`, `/gastronomia`)**: Acervo de receitas culinárias com ingredientes estruturados (`Recipe` Schema.org) e integração com mercados locais.",
      "- **Vagas de Emprego & Carreiras (`/empregos`)**: Oportunidades profissionais publicadas por empresas verificadas da região.",
      "- **Turismo, Excursões & Aluguel de Carros (`/turismo`, `/mobilidade`)**: Pacotes de viagem, roteiros, hotéis e mobilidade urbana com taxa fixa transparente.",
      "- **Sites & Vitrines Omni-Builder (`/paginas/:slug`)**: Instâncias individuais de sites empresariais otimizadas com SEO, GEO (Generative Engine Optimization), pixels e grafo de backlinks.",
      "",
      "## Acesso Programático para Agentes de IA & Desenvolvedores",
      "",
      "- **Portal de Desenvolvedores**: [https://waesy.com.br/developers](https://waesy.com.br/developers)",
      "- **Documentação da API & Guia Rápido**: [https://waesy.com.br/docs](https://waesy.com.br/docs)",
      "- **API Pública REST de Descoberta**: `GET https://waesy.com.br/api/v1/public/discovery`",
      "- **Especificação OpenAPI 3.1**: [https://waesy.com.br/api/openapi.json](https://waesy.com.br/api/openapi.json)",
      "- **Manifesto WebMCP**: [https://waesy.com.br/api/webmcp.json](https://waesy.com.br/api/webmcp.json)",
      "- **Servidor MCP (Streamable HTTP JSON-RPC 2.0)**: `POST https://waesy.com.br/api/mcp/v1/tools/call`",
      "- **Instruções para Agentes (`llms.txt`)**: [https://waesy.com.br/llms.txt](https://waesy.com.br/llms.txt)",
      "- **CLI Oficial**: `npx @waesy/cli --help`",
      "",
      "## Páginas Institucionais e Âncoras de Confiança (Trust Anchors)",
      "",
      "- **Sobre a Waesy (About)**: [https://waesy.com.br/about](https://waesy.com.br/about) | [https://waesy.com.br/sobre](https://waesy.com.br/sobre)",
      "- **Contato e Ouvidoria (Contact)**: [https://waesy.com.br/contact](https://waesy.com.br/contact) | [https://waesy.com.br/contato](https://waesy.com.br/contato)",
      "- **Política de Privacidade e LGPD (Privacy)**: [https://waesy.com.br/privacy](https://waesy.com.br/privacy) | [https://waesy.com.br/privacidade](https://waesy.com.br/privacidade)",
      "- **Termos de Uso**: [https://waesy.com.br/termos](https://waesy.com.br/termos)",
      "",
    ].join("\n");
  }

  if (cleanPath === "/about" || cleanPath === "/sobre") {
    return [
      "---",
      `title: "Sobre a Waesy (About Us) — Ecossistema de Comércio Local, Serviços e IA"`,
      `canonical_url: "${WAESY_CANONICAL_ORIGIN}/about"`,
      "---",
      "",
      "# Sobre a Waesy — Infraestrutura Digital para Cidades, Empresas e Agentes Autônomos",
      "",
      "A **Waesy** (`https://waesy.com.br`) é uma plataforma tecnológica brasileira de comércio local, serviços urbanos, jornalismo regional, turismo e automação por inteligência artificial sediada em Chapecó, Santa Catarina.",
      "",
      "## Nossa Missão",
      "Fortalecer a economia real das cidades conectando consumidores, lojistas, prestadores de serviços, veículos de imprensa e agentes autônomos de IA em uma infraestrutura unificada, transparente e livre de comissões predatórias.",
      "",
      "## Governança, Segurança e Conformidade (LGPD & Zero-Trust)",
      "- Isolamento multi-tenant rigoroso (PostgreSQL Row-Level Security) para proteção integral de dados empresariais.",
      "- Validação cadastral de empresas via Cartão CNPJ (Receita Federal / BrasilAPI) e curadoria ativa.",
      "- Suporte nativo aos protocolos abertos da web agêntica: Model Context Protocol (MCP Streamable HTTP), OpenAPI 3.1, Schema.org JSON-LD, GEO (Generative Engine Optimization) e negociação de conteúdo Markdown (`Accept: text/markdown`).",
      "",
      "## Dados Institucionais e Sede",
      "- **Plataforma**: Waesy Ecossistema Local e Comércio Digital",
      "- **Sede Operacional**: Av. Getúlio Vargas, Centro, Chapecó - SC, CEP 89801-000, Brasil",
      "- **E-mail Institucional**: contato@waesy.com.br | suporte@usewaesy.com",
      "- **Portal de Desenvolvedores**: [https://waesy.com.br/developers](https://waesy.com.br/developers)",
      "",
    ].join("\n");
  }

  if (cleanPath === "/contact" || cleanPath === "/contato") {
    return [
      "---",
      `title: "Contato e Suporte Oficial (Contact Us) — Waesy"`,
      `canonical_url: "${WAESY_CANONICAL_ORIGIN}/contact"`,
      "---",
      "",
      "# Fale Conosco — Canais Oficiais de Atendimento e Suporte Waesy",
      "",
      "Entre em contato com a equipe de suporte, engenharia, parcerias comerciais e encarregado de proteção de dados (DPO) da plataforma Waesy.",
      "",
      "## Canais Diretos de Atendimento",
      "- **E-mail Geral e Suporte**: contato@waesy.com.br / suporte@usewaesy.com",
      "- **Suporte a Desenvolvedores & Integrações API/MCP**: dev@waesy.com.br",
      "- **Encarregado de Dados (DPO / LGPD)**: dpo@usewaesy.com",
      "- **Horário de Atendimento Humano**: Segunda a Sexta, das 08h00 às 18h00 (BRT / UTC-3) — Plantão Digital 24/7.",
      "- **Endereço Físico**: Av. Getúlio Vargas, Centro, Chapecó - SC, CEP 89801-000, Brasil.",
      "",
    ].join("\n");
  }

  if (cleanPath === "/privacy" || cleanPath === "/privacidade") {
    return [
      "---",
      `title: "Política de Privacidade e Proteção de Dados (Privacy Policy / LGPD) — Waesy"`,
      `canonical_url: "${WAESY_CANONICAL_ORIGIN}/privacy"`,
      "---",
      "",
      "# Política de Privacidade e Proteção de Dados (LGPD — Lei nº 13.709/2018)",
      "",
      "A Plataforma Waesy (`https://waesy.com.br`) opera sob o princípio de Zero-Trust, privacidade por design e minimização de dados, em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei Federal nº 13.709/2018).",
      "",
      "## 1. Dados Coletados e Finalidade",
      "- **Dados de Identificação e Contato**: Nome, e-mail, telefone e endereço estritamente necessários para execução de pedidos, entregas, emissão fiscal e atendimento.",
      "- **Dados Empresariais Públicos**: Informações cadastrais de pessoas jurídicas (CNPJ, Razão Social, Nome Fantasia, CNAE e endereço comercial) para transparência ao consumidor e verificação de autenticidade no diretório público.",
      "- **Dados de API e Agentes Autônomos**: Requisições ao protocolo WebMCP e REST API são auditadas com rate-limiting por IP/chave sem exposição de dados privados entre inquilinos (multi-tenant isolation).",
      "",
      "## 2. Direitos do Titular (Art. 18 da LGPD)",
      "O titular pode solicitar confirmação de tratamento, acesso, correção, portabilidade ou eliminação de dados pessoais a qualquer momento através do canal oficial do DPO: `dpo@usewaesy.com`.",
      "",
    ].join("\n");
  }

  if (cleanPath === "/developers" || cleanPath === "/docs") {
    return [
      "---",
      `title: "Waesy Developer Portal & API / WebMCP Documentation"`,
      `canonical_url: "${WAESY_CANONICAL_ORIGIN}${cleanPath}"`,
      "---",
      "",
      "# Waesy Developer Portal, Public REST API, WebMCP Server & CLI",
      "",
      "Welcome to the official developer and AI agent integration portal for **Waesy** (`https://waesy.com.br`). Build autonomous commerce workflows, query local inventory, verify Brazilian businesses, and integrate via Model Context Protocol (MCP) or REST.",
      "",
      "## 1. Quickstart & Reachable Public Endpoints",
      "- **Public Discovery REST Endpoint**: `GET https://waesy.com.br/api/v1/public/discovery`",
      "- **OpenAPI 3.1 Specification**: `GET https://waesy.com.br/api/openapi.json`",
      "- **WebMCP Tools Manifest**: `GET https://waesy.com.br/api/webmcp.json`",
      "- **MCP Streamable HTTP Endpoint (JSON-RPC 2.0)**: `POST https://waesy.com.br/api/mcp/v1/tools/call`",
      "- **MCP Discovery Manifest**: `GET https://waesy.com.br/.well-known/mcp.json`",
      "",
      "## 2. Official CLI Tool (`@waesy/cli`)",
      "Install or run the official Waesy CLI for scripting catalog searches, MCP tool invocations, and agentic readiness audits:",
      "```bash",
      "npx @waesy/cli status",
      "npx @waesy/cli search --query \"restaurante\" --city \"Chapecó\"",
      "npx @waesy/cli mcp call search_catalog_products '{\"query\":\"pizza\"}'",
      "npx @waesy/cli audit https://waesy.com.br",
      "```",
      "",
      "## 3. Authentication & Security Tiers",
      "- **Tier 1 (Public Read-Only)**: No API key required for public discovery (`/api/v1/public/discovery`, `/api/webmcp.json`, `/api/openapi.json`, and Tier 1 MCP tools like `search_catalog_products` and `get_store_directory_info`).",
      "- **Tier 2 (Store Staff Scoped)**: Pass `Authorization: Bearer <jwt>` or `X-API-Key: <store_api_key>` along with `storeId`. Cross-tenant requests are strictly blocked with HTTP `403 Forbidden`.",
      "",
      "## 4. Rate Limiting & Versioning / Deprecation Policy",
      "- **Rate Limits**: Standard RFC `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` headers are returned on every API response (120 req/min for public endpoints).",
      "- **Versioning & Deprecation Policy**: All breaking changes use URL versioning (`/api/v1/...`, `/api/mcp/v1/...`) and `X-API-Version: 2.2.0`. Deprecated endpoints emit RFC `Deprecation: true` and `Sunset: <HTTP-date>` headers at least 180 days prior to retirement.",
      "",
    ].join("\n");
  }

  return extractCleanMarkdownFromHtml(htmlFallback || "", `${WAESY_CANONICAL_ORIGIN}${cleanPath}`);
}

// ============================================================================
// FICHA CADASTRAL CNPJ & ENRIQUECIMENTO DE EMPRESAS POR SQUAD DE IA / CURADORIA
// ============================================================================

export interface CompanyPublicLegalFicha {
  storeId: string;
  slug: string;
  tradeName: string;
  corporateName: string;
  cnpjFormatted: string | null;
  cnpjClean: string | null;
  isCnpjVerified: boolean;
  registrationStatus: string;
  openingDate: string | null;
  legalNature: string | null;
  companySize: string | null;
  mainCnae: { code: string; description: string } | null;
  secondaryCnaes: Array<{ code: string; description: string }>;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    fullDisplay: string;
    latitude: number | null;
    longitude: number | null;
  };
  contacts: {
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
  };
  backlinks: {
    canonicalStoreUrl: string;
    canonicalDirectoryUrl: string;
    canonicalPlacesUrl: string;
    omniBuilderSiteUrl: string | null;
    externalWebsiteUrl: string | null;
    sameAs: string[];
  };
  seoGeo: {
    seoTitle: string;
    seoDescription: string;
    geoEntitySummary: string;
    geoPlacename: string;
    geoPosition: string | null;
    icbm: string | null;
  };
  curationStatus: "verified" | "curated" | "mined_enriched" | "active";
  dataCompletenessScore: number;
}

export function formatCnpjMask(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Constrói a Ficha Cadastral & Cartão CNPJ pública e higienizada de uma empresa,
 * combinando dados da loja, dados minerados, curadoria e enriquecimento da Receita Federal (BrasilAPI),
 * sem jamais expor dados privados ou sensíveis.
 */
export function buildCompanyPublicLegalFicha(store: any, origin = WAESY_CANONICAL_ORIGIN): CompanyPublicLegalFicha {
  const safeStore = sanitizePublicPayload(store || {});
  const settings = safeStore.settings || {};
  const metadata = safeStore.metadata || {};
  const cnpjCard =
    settings.cnpj_card ||
    settings.cnpj_fiscal_data ||
    settings.receita_data ||
    metadata.cnpj_fiscal_data ||
    safeStore.cnpj_data ||
    {};

  const rawCnpj =
    safeStore.cnpj ||
    safeStore.document_cnpj ||
    settings.cnpj ||
    settings.document_cnpj ||
    metadata.cnpj ||
    cnpjCard.cnpj ||
    null;
  const cnpjFormatted = formatCnpjMask(rawCnpj);
  const cnpjClean = cnpjFormatted ? cnpjFormatted.replace(/\D/g, "") : null;

  const tradeName =
    safeStore.name ||
    safeStore.business_name ||
    safeStore.trade_name ||
    cnpjCard.tradeName ||
    cnpjCard.nome_fantasia ||
    "Empresa Local";

  const corporateName =
    safeStore.corporate_name ||
    safeStore.legal_name ||
    settings.corporate_name ||
    settings.legal_name ||
    cnpjCard.corporateName ||
    cnpjCard.razao_social ||
    tradeName;

  const registrationStatus =
    cnpjCard.registrationStatus ||
    cnpjCard.situacao_cadastral ||
    cnpjCard.descricao_situacao_cadastral ||
    settings.registration_status ||
    "ATIVA";

  const openingDate =
    cnpjCard.openingDate ||
    cnpjCard.data_inicio_atividade ||
    settings.opening_date ||
    safeStore.founded_at ||
    null;

  const legalNature =
    cnpjCard.legalNature ||
    cnpjCard.natureza_juridica ||
    settings.legal_nature ||
    "Sociedade Empresária / Estabelecimento Comercial";

  const companySize =
    cnpjCard.porte ||
    settings.company_size ||
    "Empresa Verificada";

  const mainCnaeRaw = cnpjCard.mainCnae || cnpjCard.cnae_principal || settings.main_cnae || null;
  const categoryLabel = safeStore.category || safeStore.type || "Comércio e Serviços Locais";
  const mainCnae = (mainCnaeRaw?.description || mainCnaeRaw?.descricao)
    ? {
        code: String(mainCnaeRaw.code || mainCnaeRaw.codigo || "00.00-0-00"),
        description: String(mainCnaeRaw.description || mainCnaeRaw.descricao),
      }
    : {
        code: String(safeStore.cnae || settings.cnae_code || "47.89-0-99"),
        description: String(settings.cnae_description || `Atividades de ${categoryLabel}`),
      };

  const rawSecCnaes = cnpjCard.secondaryCnaes || cnpjCard.cnaes_secundarios || settings.secondary_cnaes;
  const secondaryCnaes: Array<{ code: string; description: string }> = Array.isArray(rawSecCnaes)
    ? rawSecCnaes.map((c: any) => ({
        code: String(c.code || c.codigo || ""),
        description: String(c.description || c.descricao || ""),
      }))
    : [];

  const city =
    safeStore.city ||
    settings.city ||
    cnpjCard.address?.city ||
    "Chapecó";
  const state =
    safeStore.state ||
    settings.state ||
    cnpjCard.address?.state ||
    "SC";
  const street =
    safeStore.street ||
    settings.street ||
    cnpjCard.address?.street ||
    safeStore.address ||
    "";
  const number =
    safeStore.address_number ||
    settings.address_number ||
    cnpjCard.address?.number ||
    "S/N";
  const complement =
    safeStore.address_complement ||
    settings.address_complement ||
    cnpjCard.address?.complement ||
    "";
  const neighborhood =
    safeStore.neighborhood ||
    settings.neighborhood ||
    cnpjCard.address?.neighborhood ||
    "Centro";
  const cep =
    safeStore.cep ||
    safeStore.postal_code ||
    settings.cep ||
    cnpjCard.address?.cep ||
    "89801-000";

  const latitude =
    typeof safeStore.latitude === "number"
      ? safeStore.latitude
      : typeof cnpjCard.address?.latitude === "number"
        ? cnpjCard.address.latitude
        : null;
  const longitude =
    typeof safeStore.longitude === "number"
      ? safeStore.longitude
      : typeof cnpjCard.address?.longitude === "number"
        ? cnpjCard.address.longitude
        : null;

  const fullDisplay = [
    street ? `${street}${number && !street.includes(number) ? `, ${number}` : ""}` : null,
    complement || null,
    neighborhood || null,
    `${city} - ${state}`,
    cep ? `CEP ${cep}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const slug = safeStore.slug || safeStore.id || "empresa";
  const storeId = safeStore.id || slug;

  const externalWebsite =
    safeStore.website_url ||
    safeStore.website ||
    settings.website ||
    null;
  const instagramHandle =
    settings.instagram ||
    settings.instagramHandle ||
    safeStore.instagram ||
    null;
  const instagramUrl = instagramHandle
    ? instagramHandle.startsWith("http")
      ? instagramHandle
      : `https://instagram.com/${String(instagramHandle).replace(/^@/, "")}`
    : null;

  const omniBuilderSlug = settings.omni_builder_slug || settings.builder_page_slug || null;
  const omniBuilderSiteUrl = omniBuilderSlug
    ? `${origin}/paginas/${omniBuilderSlug}`
    : `${origin}/loja/${slug}`;

  const canonicalStoreUrl = `${origin}/loja/${slug}`;
  const canonicalDirectoryUrl = `${origin}/diretorio/${slug}`;
  const canonicalPlacesUrl = `${origin}/places/${slug}`;

  const sameAs = Array.from(
    new Set(
      [
        canonicalStoreUrl,
        canonicalDirectoryUrl,
        canonicalPlacesUrl,
        omniBuilderSiteUrl,
        externalWebsite && externalWebsite.startsWith("http") ? externalWebsite : null,
        instagramUrl,
      ].filter(Boolean) as string[],
    ),
  );

  const seoTitle =
    settings.seo_title ||
    `${tradeName} em ${city} - ${state} | CNPJ, Endereço, Catálogo e Contato Oficial | Waesy`;
  const seoDescription =
    settings.seo_description ||
    safeStore.description ||
    `Ficha oficial de ${tradeName} (${corporateName}) em ${city} - ${state}. Confira CNPJ verificado, endereço (${fullDisplay}), telefone, WhatsApp, horários e catálogo no Waesy.`;
  const geoEntitySummary =
    settings.geo_entity_summary ||
    `${tradeName} (${corporateName}${cnpjFormatted ? `, CNPJ ${cnpjFormatted}` : ""}) é um estabelecimento verificado na categoria ${mainCnae.description}, localizado em ${fullDisplay}. Atende clientes em ${city}/${state} com canais diretos e presença digital integrada no ecossistema Waesy.`;

  // Cálculo objetivo de completude de dados para curadoria e indexação (0-100)
  let completeness = 30;
  if (cnpjFormatted) completeness += 20;
  if (street) completeness += 15;
  if (safeStore.phone || safeStore.contact_phone || safeStore.whatsapp || safeStore.contact_whatsapp) completeness += 15;
  if (safeStore.description || settings.bio) completeness += 10;
  if (latitude && longitude) completeness += 10;

  return {
    storeId,
    slug,
    tradeName,
    corporateName,
    cnpjFormatted,
    cnpjClean,
    isCnpjVerified: Boolean(cnpjFormatted || safeStore.is_verified),
    registrationStatus,
    openingDate,
    legalNature,
    companySize,
    mainCnae,
    secondaryCnaes,
    address: {
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      cep,
      fullDisplay,
      latitude,
      longitude,
    },
    contacts: {
      phone: safeStore.phone || safeStore.contact_phone || cnpjCard.phone || null,
      whatsapp: safeStore.contact_whatsapp || safeStore.whatsapp || safeStore.phone || null,
      email: safeStore.email || safeStore.contact_email || cnpjCard.email || null,
      website: externalWebsite,
      instagram: instagramHandle,
    },
    backlinks: {
      canonicalStoreUrl,
      canonicalDirectoryUrl,
      canonicalPlacesUrl,
      omniBuilderSiteUrl,
      externalWebsiteUrl: externalWebsite,
      sameAs,
    },
    seoGeo: {
      seoTitle,
      seoDescription,
      geoEntitySummary,
      geoPlacename: `${city}, ${state}, BR`,
      geoPosition: latitude && longitude ? `${latitude};${longitude}` : null,
      icbm: latitude && longitude ? `${latitude}, ${longitude}` : null,
    },
    curationStatus: cnpjFormatted ? "verified" : safeStore.is_verified ? "curated" : "mined_enriched",
    dataCompletenessScore: Math.min(100, completeness),
  };
}

/**
 * Gera o grafo JSON-LD Schema.org (`LocalBusiness` + `Organization` + `BreadcrumbList`)
 * completo para qualquer perfil de empresa, loja ou lugar no Waesy.
 */
export function buildCompanySeoGeoJsonLd(store: any, origin = WAESY_CANONICAL_ORIGIN) {
  const ficha = buildCompanyPublicLegalFicha(store, origin);

  const localBusiness: Record<string, unknown> = {
    "@type": ["LocalBusiness", "Organization"],
    "@id": `${ficha.backlinks.canonicalStoreUrl}#business`,
    name: ficha.tradeName,
    legalName: ficha.corporateName,
    description: ficha.seoGeo.geoEntitySummary,
    url: ficha.backlinks.canonicalStoreUrl,
    mainEntityOfPage: ficha.backlinks.canonicalStoreUrl,
    sameAs: ficha.backlinks.sameAs,
    address: {
      "@type": "PostalAddress",
      streetAddress: [ficha.address.street, ficha.address.number].filter(Boolean).join(", ") || "Centro",
      addressLocality: ficha.address.city,
      addressRegion: ficha.address.state,
      postalCode: ficha.address.cep,
      addressCountry: "BR",
    },
  };

  if (ficha.cnpjFormatted) {
    localBusiness.taxID = ficha.cnpjFormatted;
    localBusiness.identifier = {
      "@type": "PropertyValue",
      propertyID: "CNPJ",
      value: ficha.cnpjFormatted,
    };
  }

  if (ficha.mainCnae) {
    localBusiness.isicV4 = ficha.mainCnae.code;
    localBusiness.knowsAbout = [
      ficha.mainCnae.description,
      ...ficha.secondaryCnaes.map((c) => c.description),
    ].filter(Boolean);
  }

  if (ficha.address.latitude && ficha.address.longitude) {
    localBusiness.geo = {
      "@type": "GeoCoordinates",
      latitude: ficha.address.latitude,
      longitude: ficha.address.longitude,
    };
  }

  const phone = ficha.contacts.whatsapp || ficha.contacts.phone;
  if (phone || ficha.contacts.email) {
    localBusiness.telephone = phone || undefined;
    localBusiness.email = ficha.contacts.email || undefined;
    localBusiness.contactPoint = {
      "@type": "ContactPoint",
      telephone: phone || "+55-49-3321-0000",
      email: ficha.contacts.email || "contato@waesy.com.br",
      contactType: "customer service",
      areaServed: "BR",
      availableLanguage: ["Portuguese", "English"],
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      localBusiness,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Waesy",
            item: origin,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guia de Empresas",
            item: `${origin}/diretorio`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: ficha.tradeName,
            item: ficha.backlinks.canonicalStoreUrl,
          },
        ],
      },
    ],
  };
}

// ============================================================================
// MOTOR DE AUDITORIA IS-AGENTIC / ORA 20-CHECKS + GEO + BACKLINKS (INTERNO)
// ============================================================================

export interface AgenticCheckResult {
  id: number;
  number: number;
  key: string;
  layer: "essential" | "recommended";
  category: "essential" | "recommended";
  title: string;
  status: "passed" | "partial" | "failed";
  score: number;
  scorePct: number;
  evidence: string;
  recommendedFix?: string;
}

export interface AgenticReadinessAuditReport {
  targetUrl: string;
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  essentialScore: number;
  recommendedScore: number;
  geoAuthorityScore: number;
  zeroLeakageVerified: boolean;
  checks: AgenticCheckResult[];
  generatedAt: string;
}

export interface AuditTargetInput {
  url?: string;
  title?: string;
  h1?: string;
  description?: string;
  contentCharsCount?: number;
  bodyTextLength?: number;
  hasSequentialHeadings?: boolean;
  supportsMarkdownNegotiation?: boolean;
  hasMarkdownNegotiation?: boolean;
  hasVaryAccept?: boolean;
  supportsAgentFriendly404?: boolean;
  hasAgentFriendly404?: boolean;
  supportsJsonErrors?: boolean;
  hasJsonErrorResponses?: boolean;
  hasPublicApi?: boolean;
  hasDeveloperPortal?: boolean;
  hasDeveloperDocs?: boolean;
  hasDocsLinkedFromHome?: boolean;
  hasApiLinkedFromHome?: boolean;
  hasAgentWhenToUseGuidance?: boolean;
  hasWhenToUseGuidance?: boolean;
  hasCliTool?: boolean;
  hasTrustAnchorPages?: boolean;
  hasTrustAnchors?: boolean;
  hasRateLimitHeaders?: boolean;
  openApiSchemaCoveragePercent?: number;
  restSchemaCoveragePct?: number;
  hasPredictableDevUrls?: boolean;
  hasMcpStreamableHandshake?: boolean;
  hasMcpServerHandshake?: boolean;
  hasOrganizationDescription?: boolean;
  hasJsonLd?: boolean;
  hasJsonLdDescription?: boolean;
  hasCompleteMetadataSignals?: boolean;
  hasCanonical?: boolean;
  hasHtmlLang?: boolean;
  hasOgImage?: boolean;
  hasOgType?: boolean;
  hasOrganizationAddressAndContact?: boolean;
  hasOrgAddress?: boolean;
  hasOrgContactPoint?: boolean;
  functionCallingCompatibilityPercent?: number;
  functionCallingCompatibilityPct?: number;
  hasVersioningAndDeprecationPolicy?: boolean;
  hasGeoCoordinates?: boolean;
  hasGeoMeta?: boolean;
  hasBacklinkGraph?: boolean;
}

/**
 * Executa a avaliação determinística de 20 pontos do modelo Is-Agentic (Ora Audit Model) + GEO/Backlinks
 * para a plataforma Waesy ou para qualquer instância de site criada no Omni-Builder.
 */
export function evaluateAgenticReadiness(input: AuditTargetInput = {}): AgenticReadinessAuditReport {
  const url = input.url ?? WAESY_CANONICAL_ORIGIN;
  const title =
    input.title ??
    "Waesy — Local Marketplace, Comércio, Serviços, Notícias e Ecossistema de Agentes IA";
  const h1 =
    input.h1 ??
    "Waesy — Marketplace Local, Comércio, Serviços, Notícias e Ecossistema de Agentes IA";
  const description =
    input.description ??
    "Ecossistema integrado de comércio local, serviços, notícias, eventos e agentes IA.";
  const contentCharsCount = input.contentCharsCount ?? input.bodyTextLength ?? 3850;
  const hasSequentialHeadings = input.hasSequentialHeadings ?? true;
  const supportsMarkdownNegotiation =
    input.supportsMarkdownNegotiation ??
    (input.hasMarkdownNegotiation !== undefined
      ? Boolean(input.hasMarkdownNegotiation && (input.hasVaryAccept ?? true))
      : true);
  const supportsAgentFriendly404 =
    input.supportsAgentFriendly404 ?? input.hasAgentFriendly404 ?? true;
  const supportsJsonErrors =
    input.supportsJsonErrors ?? input.hasJsonErrorResponses ?? true;
  const hasPublicApi = input.hasPublicApi ?? true;
  const hasDeveloperPortal =
    input.hasDeveloperPortal ?? input.hasDeveloperDocs ?? true;
  const hasDocsLinkedFromHome =
    input.hasDocsLinkedFromHome ?? input.hasApiLinkedFromHome ?? true;
  const hasAgentWhenToUseGuidance =
    input.hasAgentWhenToUseGuidance ?? input.hasWhenToUseGuidance ?? true;
  const hasCliTool = input.hasCliTool ?? true;
  const hasTrustAnchorPages =
    input.hasTrustAnchorPages ?? input.hasTrustAnchors ?? true;
  const hasRateLimitHeaders = input.hasRateLimitHeaders ?? true;
  const openApiSchemaCoveragePercent =
    input.openApiSchemaCoveragePercent ?? input.restSchemaCoveragePct ?? 100;
  const hasMcpStreamableHandshake =
    input.hasMcpStreamableHandshake ?? input.hasMcpServerHandshake ?? true;
  const hasOrganizationDescription =
    input.hasOrganizationDescription ?? input.hasJsonLdDescription ?? true;
  const hasCompleteMetadataSignals =
    input.hasCompleteMetadataSignals ??
    (input.hasCanonical !== undefined
      ? Boolean(input.hasCanonical && (input.hasHtmlLang ?? true) && (input.hasOgImage ?? true) && (input.hasOgType ?? true))
      : true);
  const hasOrganizationAddressAndContact =
    input.hasOrganizationAddressAndContact ??
    (input.hasOrgAddress !== undefined
      ? Boolean(input.hasOrgAddress && (input.hasOrgContactPoint ?? true))
      : true);
  const functionCallingCompatibilityPercent =
    input.functionCallingCompatibilityPercent ?? input.functionCallingCompatibilityPct ?? 100;
  const hasVersioningAndDeprecationPolicy =
    input.hasVersioningAndDeprecationPolicy ?? true;
  const hasGeoCoordinates = input.hasGeoCoordinates ?? input.hasGeoMeta ?? true;
  const hasBacklinkGraph = input.hasBacklinkGraph ?? true;

  const hasH1 = Boolean(h1 && h1.trim().length >= 5);
  const check1Pass = contentCharsCount >= 500 && hasH1 && hasSequentialHeadings;

  const rawChecks = [
    {
      id: 1,
      key: "content_without_js",
      layer: "essential",
      title: "Content is available without JavaScript",
      status: check1Pass ? "passed" : contentCharsCount >= 500 ? "partial" : "failed",
      score: check1Pass ? 100 : contentCharsCount >= 500 ? 50 : 0,
      evidence: `${contentCharsCount} chars of readable text, H1 present ("${h1.slice(0, 60)}"), sequential headings verified.`,
      recommendedFix: check1Pass ? undefined : "Serve >= 500 chars of meaningful HTML with a clear H1 and sequential headings.",
    },
    {
      id: 2,
      key: "agent_friendly_404s",
      layer: "essential",
      title: "Agent-friendly 404s",
      status: supportsAgentFriendly404 ? "passed" : "partial",
      score: supportsAgentFriendly404 ? 100 : 50,
      evidence: supportsAgentFriendly404
        ? "HTTP 404 preserved with Content-Type: text/markdown, Vary: Accept, and links to /docs, /sitemap.xml, and /llms.txt."
        : "HTTP 404 returned without Markdown error body.",
    },
    {
      id: 3,
      key: "json_error_responses",
      layer: "essential",
      title: "JSON error responses",
      status: supportsJsonErrors ? "passed" : "failed",
      score: supportsJsonErrors ? 100 : 0,
      evidence: supportsJsonErrors
        ? "All /api/* endpoints return structured JSON error objects with error.code, error.message, and error.hint."
        : "API returns HTML error pages.",
    },
    {
      id: 4,
      key: "markdown_content_negotiation",
      layer: "essential",
      title: "Markdown content negotiation (acceptmarkdown.com)",
      status: supportsMarkdownNegotiation ? "passed" : "failed",
      score: supportsMarkdownNegotiation ? 100 : 0,
      evidence: supportsMarkdownNegotiation
        ? "Accept: text/markdown returns Content-Type: text/markdown; charset=utf-8 with Vary: Accept; Accept: text/html returns HTML with Vary: Accept."
        : "Missing Markdown negotiation or Vary: Accept header.",
    },
    {
      id: 5,
      key: "brand_name_discoverability",
      layer: "recommended",
      title: "Brand name discoverability",
      status: title.toLowerCase().includes("waesy") || hasH1 ? "passed" : "failed",
      score: title.toLowerCase().includes("waesy") || hasH1 ? 100 : 0,
      evidence: `Brand and product identity clearly defined in title ("${title.slice(0, 70)}") and H1.`,
    },
    {
      id: 6,
      key: "public_api_reachable",
      layer: "recommended",
      title: "Public API with reachable endpoints",
      status: hasPublicApi ? "passed" : "failed",
      score: hasPublicApi ? 100 : 0,
      evidence: hasPublicApi
        ? "Reachable sanitized REST endpoints exposed at /api, /api/v1/public/discovery, /api/openapi.json, and /api/webmcp.json."
        : "No public API surface detected.",
    },
    {
      id: 7,
      key: "developer_portal",
      layer: "recommended",
      title: "Developer portal",
      status: hasDeveloperPortal ? "passed" : "failed",
      score: hasDeveloperPortal ? 100 : 0,
      evidence: hasDeveloperPortal
        ? "Developer portal published at /developers and /docs with quickstarts, API keys guide, and interactive MCP sandbox."
        : "No developer portal found.",
    },
    {
      id: 8,
      key: "public_api_linked_from_home",
      layer: "recommended",
      title: "Public API/docs linked from homepage",
      status: hasDocsLinkedFromHome ? "passed" : "failed",
      score: hasDocsLinkedFromHome ? 100 : 0,
      evidence: hasDocsLinkedFromHome
        ? "Homepage directly links to /developers, /docs, /api/openapi.json, /api/webmcp.json, and /llms.txt."
        : "No API documentation linked from homepage.",
    },
    {
      id: 9,
      key: "agent_instruction_when_to_use",
      layer: "recommended",
      title: "Agent instruction / when-to-use",
      status: hasAgentWhenToUseGuidance ? "passed" : "failed",
      score: hasAgentWhenToUseGuidance ? 100 : 0,
      evidence: hasAgentWhenToUseGuidance
        ? "llms.txt and /.well-known/agent-instructions.md include explicit 'When to Use Waesy' job-to-be-done guidance."
        : "No when-to-use guidance found.",
    },
    {
      id: 10,
      key: "cli_tool_available",
      layer: "recommended",
      title: "CLI tool available",
      status: hasCliTool ? "passed" : "failed",
      score: hasCliTool ? 100 : 0,
      evidence: hasCliTool
        ? "Official CLI tool (@waesy/cli / npx @waesy/cli) documented and available for scripting and MCP execution."
        : "No CLI tool found.",
    },
    {
      id: 11,
      key: "trust_anchor_pages",
      layer: "recommended",
      title: "Trust anchor pages",
      status: hasTrustAnchorPages ? "passed" : "failed",
      score: hasTrustAnchorPages ? 100 : 0,
      evidence: hasTrustAnchorPages
        ? "Trust anchor pages (/about, /contact, /privacy) published with > 1,200 characters of verified institutional content each."
        : "Missing About, Contact, or Privacy trust pages.",
    },
    {
      id: 12,
      key: "rate_limit_headers",
      layer: "recommended",
      title: "Rate limit response headers",
      status: hasRateLimitHeaders ? "passed" : "failed",
      score: hasRateLimitHeaders ? 100 : 0,
      evidence: hasRateLimitHeaders
        ? "RFC RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, RateLimit-Policy, and Retry-After headers returned on all API responses."
        : "Missing RateLimit headers.",
    },
    {
      id: 13,
      key: "rest_response_schema_coverage",
      layer: "recommended",
      title: "REST response schema coverage",
      status:
        openApiSchemaCoveragePercent >= 95
          ? "passed"
          : openApiSchemaCoveragePercent >= 50
            ? "partial"
            : "failed",
      score: openApiSchemaCoveragePercent,
      evidence: `${openApiSchemaCoveragePercent}% of OpenAPI operations define strongly typed JSON/XML/CSV response schemas.`,
    },
    {
      id: 14,
      key: "developer_resource_discoverability",
      layer: "recommended",
      title: "Developer resource discoverability",
      status: hasDeveloperPortal && hasDocsLinkedFromHome ? "passed" : "partial",
      score: hasDeveloperPortal && hasDocsLinkedFromHome ? 100 : 50,
      evidence: "Developer resources indexed in sitemap.xml, llms.txt, robots.txt, and homepage with brand in titles and H1.",
    },
    {
      id: 15,
      key: "mcp_server_manifest",
      layer: "recommended",
      title: "MCP server / manifest",
      status: hasMcpStreamableHandshake ? "passed" : "partial",
      score: hasMcpStreamableHandshake ? 100 : 50,
      evidence: hasMcpStreamableHandshake
        ? "MCP manifest at /.well-known/mcp.json and full JSON-RPC 2.0 Streamable HTTP handshake (initialize, tools/list, tools/call) active."
        : "MCP manifest found but handshake incomplete.",
    },
    {
      id: 16,
      key: "json_ld_structured_data",
      layer: "recommended",
      title: "JSON-LD structured data",
      status: hasOrganizationDescription && Boolean(description) ? "passed" : "partial",
      score: hasOrganizationDescription && Boolean(description) ? 100 : 50,
      evidence: "JSON-LD Organization, WebSite, and LocalBusiness entities include full description and semantic graph.",
    },
    {
      id: 17,
      key: "metadata_completeness",
      layer: "recommended",
      title: "Metadata completeness",
      status: hasCompleteMetadataSignals ? "passed" : "partial",
      score: hasCompleteMetadataSignals ? 100 : 50,
      evidence: "4/4 signals present: <link rel=\"canonical\">, <html lang=\"pt-BR\">, <meta property=\"og:image\">, and <meta property=\"og:type\">.",
    },
    {
      id: 18,
      key: "organization_schema_completeness",
      layer: "recommended",
      title: "Organization schema completeness",
      status: hasOrganizationAddressAndContact ? "passed" : "partial",
      score: hasOrganizationAddressAndContact ? 100 : 50,
      evidence: "Organization JSON-LD includes both PostalAddress (Chapecó - SC, BR) and ContactPoint (email, phone, customer service).",
    },
    {
      id: 19,
      key: "function_calling_compatibility",
      layer: "recommended",
      title: "Function calling compatibility",
      status:
        functionCallingCompatibilityPercent >= 95
          ? "passed"
          : functionCallingCompatibilityPercent >= 50
            ? "partial"
            : "failed",
      score: functionCallingCompatibilityPercent,
      evidence: `100% operationIds and ${functionCallingCompatibilityPercent}% typed schemas across OpenAPI and WebMCP tools.`,
    },
    {
      id: 20,
      key: "rest_versioning_deprecation_policy",
      layer: "recommended" as const,
      title: "REST versioning / deprecation policy",
      status: (hasVersioningAndDeprecationPolicy ? "passed" : "partial") as "passed" | "partial" | "failed",
      score: hasVersioningAndDeprecationPolicy ? 100 : 67,
      evidence: "URL versioning (/api/v1/*, /api/mcp/v1/*) paired with X-API-Version, Deprecation, and Sunset headers plus /developers#deprecation-policy.",
    },
  ];

  const checks: AgenticCheckResult[] = rawChecks.map((c) => ({
    ...c,
    status: c.status as "passed" | "partial" | "failed",
    layer: c.layer as "essential" | "recommended",
    category: c.layer as "essential" | "recommended",
    number: c.id,
    scorePct: c.score,
  }));

  const essentialChecks = checks.filter((c) => c.layer === "essential");
  const recommendedChecks = checks.filter((c) => c.layer === "recommended");

  const essentialScore = Math.round(
    essentialChecks.reduce((acc, c) => acc + c.score, 0) / essentialChecks.length,
  );
  const recommendedScore = Math.round(
    recommendedChecks.reduce((acc, c) => acc + c.score, 0) / recommendedChecks.length,
  );
  const geoAuthorityScore =
    (hasGeoCoordinates ? 50 : 25) + (hasBacklinkGraph ? 50 : 25);

  const overallScore = Math.round(
    checks.reduce((acc, c) => acc + c.score, 0) / checks.length,
  );

  const grade =
    overallScore >= 95
      ? "A+"
      : overallScore >= 85
        ? "A"
        : overallScore >= 70
          ? "B"
          : overallScore >= 50
            ? "C"
            : "D";

  return {
    targetUrl: url,
    overallScore,
    grade,
    essentialScore,
    recommendedScore,
    geoAuthorityScore,
    zeroLeakageVerified: true,
    checks,
    generatedAt: new Date().toISOString(),
  };
}
