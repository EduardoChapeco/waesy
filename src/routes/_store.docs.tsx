import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_store/docs')({
  head: () => ({
    meta: [
      { title: 'Documentacao Tecnica, API e WebMCP | Waesy Local Marketplace' },
      {
        name: 'description',
        content:
          'Guia de referencia tecnica do Waesy Local Marketplace: integracao MCP Streamable HTTP JSON-RPC 2.0, OpenAPI 3.1, SEO/GEO para Omni-Builder e perfis empresariais.',
      },
      { property: 'og:title', content: 'Documentacao Tecnica, API e WebMCP | Waesy Local Marketplace' },
      {
        property: 'og:description',
        content:
          'Referencia completa de endpoints publicos, schemas JSON, negociacao Markdown e governanca de dados Waesy.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://waesy.com.br/docs' },
      { property: 'og:image', content: 'https://waesy.com.br/pwa-512x512.png' },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1' },
    ],
    links: [{ rel: 'canonical', href: 'https://waesy.com.br/docs' }],
  }),
  component: TechnicalDocsPage,
})

function TechnicalDocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-8 text-foreground">
      <header className="space-y-3 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Waesy Documentation Center
        </p>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
          Documentacao da Plataforma e Protocolos
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Referencia oficial para integracao com o Waesy Local Marketplace, incluindo APIs REST
          publicas, Model Context Protocol (MCP), indexacao SEO/GEO e perfis verificados com CNPJ.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="space-y-3 rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold">1. Protocolo MCP Streamable HTTP</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O servidor MCP oficial do Waesy atende em <code>/api/mcp/v1/tools/call</code> utilizando
            JSON-RPC 2.0. Suporta os metodos <code>initialize</code>, <code>ping</code>,{' '}
            <code>tools/list</code>, <code>tools/call</code>, <code>resources/list</code> e{' '}
            <code>prompts/list</code>.
          </p>
          <a
            href="/.well-known/mcp.json"
            className="inline-flex items-center justify-center h-11 min-h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver /.well-known/mcp.json
          </a>
        </article>

        <article className="space-y-3 rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold">2. Especificacao OpenAPI 3.1</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todas as operacoes publicas e transacionais possuem <code>operationId</code> estavel,
            schemas de entrada e saida 100% tipados e respostas de erro padronizadas em JSON com{' '}
            <code>code</code>, <code>message</code>, <code>hint</code> e <code>docs_url</code>.
          </p>
          <a
            href="/api/openapi.json"
            className="inline-flex items-center justify-center h-11 min-h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Abrir /api/openapi.json
          </a>
        </article>

        <article className="space-y-3 rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold">3. SEO, GEO e Backlinks</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cada vitrine, noticia, receita, evento, pagina do Omni-Builder e perfil de empresa emite
            JSON-LD completo (<code>Organization</code>, <code>LocalBusiness</code>,{' '}
            <code>NewsArticle</code>, <code>Event</code>, <code>Recipe</code>) com coordenadas GEO e
            links de autoridade <code>sameAs</code>.
          </p>
          <a
            href="/sitemap.xml"
            className="inline-flex items-center justify-center h-11 min-h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Inspecionar /sitemap.xml
          </a>
        </article>

        <article className="space-y-3 rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold">4. Seguranca Zero-Trust e Limites</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Superficies administrativas (<code>/workspace</code>, <code>/admin-master</code>,{' '}
            <code>/conta</code>, <code>/checkout</code>) sao isoladas de indexacao e exigem sessao
            autenticada. Nenhuma tabela, coluna interna ou credencial e exposta em endpoints publicos.
          </p>
          <a
            href="/.well-known/agent-instructions.md"
            className="inline-flex items-center justify-center h-11 min-h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ler Instrucoes de Agente
          </a>
        </article>
      </section>

      <footer className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          to="/developers"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir para Portal de Desenvolvedores
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voltar ao Inicio
        </Link>
      </footer>
    </main>
  )
}
