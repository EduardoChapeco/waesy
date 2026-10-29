import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { evaluateAgenticReadiness } from '@/lib/agentic/agentic-readiness-engine'

export const Route = createFileRoute('/_store/developers')({
  head: () => ({
    meta: [
      { title: 'Portal de Desenvolvedores e Agentes | Waesy Local Marketplace' },
      {
        name: 'description',
        content:
          'Documentacao oficial de APIs REST, OpenAPI 3.1, WebMCP, MCP Streamable HTTP JSON-RPC 2.0, CLI @waesy/cli, negociacao Markdown e motor de prontidao agentica Waesy.',
      },
      { property: 'og:title', content: 'Portal de Desenvolvedores e Agentes | Waesy Local Marketplace' },
      {
        property: 'og:description',
        content:
          'Integre agentes autonomos, LLMs e sistemas externos ao Waesy via MCP Streamable HTTP, OpenAPI 3.1, CLI e Markdown Content Negotiation.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://waesy.com.br/developers' },
      { property: 'og:image', content: 'https://waesy.com.br/pwa-512x512.png' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
    ],
    links: [{ rel: 'canonical', href: 'https://waesy.com.br/developers' }],
  }),
  component: DevelopersPortalPage,
})

function DevelopersPortalPage() {
  const [sampleTitle, setSampleTitle] = useState(
    'Waesy Local Marketplace — Comercio, Servicos, Noticias e Agentes IA',
  )
  const [sampleDescription, setSampleDescription] = useState(
    'Ecossistema operacional integrado de comercio local, servicos, classificados, portal de noticias verificado, diretorio de empresas com CNPJ e protocolo WebMCP.',
  )
  const [sampleH1, setSampleH1] = useState(
    'Waesy Local Marketplace, Comercio, Servicos e Portal da Cidade',
  )

  const readinessReport = useMemo(() => {
    return evaluateAgenticReadiness({
      url: 'https://waesy.com.br/',
      title: sampleTitle,
      description: sampleDescription,
      h1: sampleH1,
      bodyTextLength: 4200,
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
    })
  }, [sampleTitle, sampleDescription, sampleH1])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Portal de Desenvolvedores e Agentes Waesy',
    description:
      'Portal tecnico oficial do Waesy com especificacao OpenAPI 3.1, manifesto MCP Streamable HTTP JSON-RPC 2.0, CLI @waesy/cli, negociacao de conteudo Markdown e politica de versionamento REST.',
    url: 'https://waesy.com.br/developers',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Waesy Local Marketplace',
      url: 'https://waesy.com.br',
    },
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12 space-y-10 text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="space-y-4 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Waesy Developer & Agent Readiness Hub
        </p>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
          Portal de Desenvolvedores e Agentes
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Integre agentes de IA, clientes MCP, crawlers de busca generativa (GEO) e aplicacoes web ao
          ecossistema Waesy Local Marketplace usando padroes abertos: OpenAPI 3.1, MCP Streamable HTTP
          JSON-RPC 2.0, Markdown Content Negotiation (RFC 9110) e dados estruturados Schema.org.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/api/openapi.json"
            className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Especificacao OpenAPI 3.1
          </a>
          <a
            href="/.well-known/mcp.json"
            className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Manifesto MCP (.well-known/mcp.json)
          </a>
          <a
            href="/api/v1/public/discovery"
            className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Endpoint Public Discovery
          </a>
          <a
            href="/llms.txt"
            className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Guia LLMs (/llms.txt)
          </a>
        </div>
      </header>

      <section aria-labelledby="dev-endpoints-heading" className="space-y-4">
        <h2 id="dev-endpoints-heading" className="text-xl font-semibold">
          Endpoints e Artefatos Canonicos
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Recurso</th>
                <th className="px-4 py-3 font-semibold">Metodo e Caminho</th>
                <th className="px-4 py-3 font-semibold">Formato</th>
                <th className="px-4 py-3 font-semibold">Finalidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">Descoberta Publica</td>
                <td className="px-4 py-3 font-mono text-xs">GET /api/v1/public/discovery</td>
                <td className="px-4 py-3">application/json</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Status da plataforma, versao da API, links de documentacao e capacidades publicas.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">OpenAPI 3.1</td>
                <td className="px-4 py-3 font-mono text-xs">GET /api/openapi.json</td>
                <td className="px-4 py-3">application/json</td>
                <td className="px-4 py-3 text-muted-foreground">
                  100% das operacoes REST com operationId unico e schemas de resposta tipados.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">MCP Streamable HTTP</td>
                <td className="px-4 py-3 font-mono text-xs">POST /api/mcp/v1/tools/call</td>
                <td className="px-4 py-3">JSON-RPC 2.0 / REST</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Suporta initialize, ping, tools/list, tools/call, resources/list e prompts/list.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Manifesto WebMCP</td>
                <td className="px-4 py-3 font-mono text-xs">GET /api/webmcp.json</td>
                <td className="px-4 py-3">application/json</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Catalogo de ferramentas WebMCP para busca de ofertas, empresas, eventos e frete.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Instrucoes de Agente</td>
                <td className="px-4 py-3 font-mono text-xs">GET /.well-known/agent-instructions.md</td>
                <td className="px-4 py-3">text/markdown</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Regras When-to-Use, seguranca Zero-Trust e negociacao de conteudo Markdown.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="cli-tool" aria-labelledby="cli-heading" className="space-y-4 border-t border-border pt-8">
        <h2 id="cli-heading" className="text-xl font-semibold">
          Ferramenta CLI Oficial (@waesy/cli)
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Desenvolvedores e agentes com acesso a terminal podem consultar o ecossistema Waesy, testar a
          negociacao Markdown, invocar ferramentas MCP e executar auditorias de prontidao agentica via
          linha de comando.
        </p>
        <pre className="overflow-hidden rounded-2xl border border-border bg-muted/40 p-4 text-xs font-mono leading-relaxed">
{`# Verificar status da API e descoberta publica
npx @waesy/cli status --url https://waesy.com.br

# Buscar ofertas e empresas verificadas via MCP
npx @waesy/cli search "farmacia centro" --city "Sao Miguel do Oeste"

# Invocar handshake MCP JSON-RPC 2.0 (tools/list)
npx @waesy/cli mcp tools/list

# Auditar prontidao agentica (20 verificacoes Ora / Is-Agentic)
node scripts/waesy-cli.mjs audit https://waesy.com.br`}
        </pre>
      </section>

      <section id="markdown-negotiation" aria-labelledby="md-heading" className="space-y-4 border-t border-border pt-8">
        <h2 id="md-heading" className="text-xl font-semibold">
          Negociacao de Conteudo Markdown
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Todas as rotas publicas do Waesy implementam negociacao de conteudo HTTP conforme o padrao
          acceptmarkdown.com. Ao enviar o cabecalho <code>Accept: text/markdown</code>, o servidor
          responde com <code>Content-Type: text/markdown; charset=utf-8</code> e <code>Vary: Accept</code>,
          incluindo tambem respostas 404 estruturadas em Markdown para caminhos inexistentes.
        </p>
        <pre className="overflow-hidden rounded-2xl border border-border bg-muted/40 p-4 text-xs font-mono leading-relaxed">
{`# Obter a pagina inicial em Markdown estruturado para LLMs
curl -sS -L -i -H "Accept: text/markdown" https://waesy.com.br/

# Verificar resposta 404 amigavel para agentes em Markdown
curl -sS -L -i -H "Accept: text/markdown" https://waesy.com.br/caminho-inexistente`}
        </pre>
      </section>

      <section id="deprecation-policy" aria-labelledby="deprecation-heading" className="space-y-4 border-t border-border pt-8">
        <h2 id="deprecation-heading" className="text-xl font-semibold">
          Versionamento REST e Descontinuacao
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 rounded-2xl border border-border p-5">
            <h3 className="text-base font-semibold">Versionamento Semantico e Cabecalhos</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Todas as rotas sob <code>/api/v1/*</code> e <code>/api/mcp/v1/*</code> emitem os
              cabecalhos <code>X-API-Version: 2026-10-29.v1</code>, <code>Deprecation: false</code> e
              limites de taxa RFC (<code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>,
              <code>RateLimit-Reset</code>, <code>RateLimit-Policy</code>).
            </p>
          </div>
          <div className="space-y-2 rounded-2xl border border-border p-5">
            <h3 className="text-base font-semibold">Janela de Sunset de 180 Dias</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Qualquer alteracao incompativel gera uma nova versao (<code>/api/v2/*</code>). Endpoints
              marcados para descontinuacao passam a emitir <code>Deprecation: true</code> e o cabecalho
              RFC 8594 <code>Sunset</code> com antecedencia minima de 180 dias antes da desativacao.
            </p>
          </div>
        </div>
      </section>

      <section id="agentic-auditor" aria-labelledby="auditor-heading" className="space-y-4 border-t border-border pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="auditor-heading" className="text-xl font-semibold">
              Simulador Interno de Prontidao Agentica
            </h2>
            <p className="text-sm text-muted-foreground">
              Motor nativo Waesy baseado nas 20 verificacoes do modelo Ora / Is-Agentic + GEO e Backlinks.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-right">
            <span className="text-xs uppercase text-muted-foreground block">Score Atual</span>
            <span className="text-2xl font-bold text-primary">
              {readinessReport.overallScore}/100 ({readinessReport.grade})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Titulo da Pagina (&lt;title&gt;)</span>
            <input
              type="text"
              value={sampleTitle}
              onChange={(e) => setSampleTitle(e.target.value)}
              className="w-full h-11 min-h-11 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Cabecalho Principal (&lt;h1&gt;)</span>
            <input
              type="text"
              value={sampleH1}
              onChange={(e) => setSampleH1(e.target.value)}
              className="w-full h-11 min-h-11 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="space-y-2 text-sm lg:col-span-2">
            <span className="font-medium">Meta Description</span>
            <input
              type="text"
              value={sampleDescription}
              onChange={(e) => setSampleDescription(e.target.value)}
              className="w-full h-11 min-h-11 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Verificacao</th>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {readinessReport.checks.map((check) => (
                <tr key={check.id}>
                  <td className="px-4 py-3 font-mono text-xs">{check.number}</td>
                  <td className="px-4 py-3 font-medium">{check.title}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">
                    {check.category}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">{check.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{check.scorePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          to="/docs"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Documentacao Tecnica (/docs)
        </Link>
        <Link
          to="/about"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sobre a Waesy (/about)
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Contato Oficial (/contact)
        </Link>
        <Link
          to="/privacy"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Privacidade e LGPD (/privacy)
        </Link>
      </footer>
    </main>
  )
}
