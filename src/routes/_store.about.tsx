import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Building2, Globe, Code2, CheckCircle2, MapPin, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WAESY_CANONICAL_ORIGIN } from "@/lib/agentic/agentic-readiness-engine";

export const Route = createFileRoute("/_store/about")({
  head: () => {
    const title = "Sobre a Waesy (About Us) — Marketplace Local, Comércio, Notícias e IA | Waesy";
    const description =
      "Conheça a Waesy (waesy.com.br): infraestrutura digital e sistema operacional de comércio local, diretório de empresas verificadas com CNPJ, jornalismo regional, turismo e agentes autônomos de IA.";
    const canonicalUrl = `${WAESY_CANONICAL_ORIGIN}/about`;
    const ogImage = `${WAESY_CANONICAL_ORIGIN}/icons/icon-512x512.png`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${canonicalUrl}#aboutpage`,
      url: canonicalUrl,
      name: title,
      description,
      mainEntity: {
        "@type": "Organization",
        "@id": `${WAESY_CANONICAL_ORIGIN}/#organization`,
        name: "Waesy",
        legalName: "Waesy Tecnologia e Ecossistema Digital Ltda.",
        url: WAESY_CANONICAL_ORIGIN,
        description,
        logo: ogImage,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Av. Getúlio Vargas, Centro",
          addressLocality: "Chapecó",
          addressRegion: "SC",
          postalCode: "89801-000",
          addressCountry: "BR",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+55-49-3321-0000",
          email: "contato@waesy.com.br",
          contactType: "customer service",
          areaServed: "BR",
          availableLanguage: ["Portuguese", "English"],
        },
      },
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: AboutTrustAnchorPage,
});

export function AboutTrustAnchorPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-6 py-6 sm:py-12 space-y-8">
      <header className="space-y-4 border-b border-border pb-6">
        <Badge variant="outline" className="text-xs font-mono uppercase">
          Institucional & Governança • Trust Anchor
        </Badge>
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
          Sobre a Waesy — Ecossistema de Comércio Local, Serviços e Agentes IA
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
          A Waesy (<strong>waesy.com.br</strong>) é um sistema operacional integrado de comércio local,
          diretório empresarial verificado via Cartão CNPJ, portal de notícias regionais, eventos culturais,
          gastronomia, turismo, mobilidade urbana e automação por inteligência artificial para cidades e
          comunidades brasileiras.
        </p>
      </header>

      <section aria-labelledby="mission-heading" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="size-5" />
            <h2 id="mission-heading" className="text-base font-bold text-foreground">
              Missão e Economia Real
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Nossa missão é fortalecer o comércio e os serviços locais sem taxas abusivas, oferecendo a
            lojistas, prestadores de serviços, veículos de imprensa e criadores uma infraestrutura soberana
            com vitrines digitais (Omni-Builder), PDV, ERP financeiro, CRM Omnichannel e logística integrada.
          </p>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-5" />
            <h2 className="text-base font-bold text-foreground">
              Segurança Zero-Trust, LGPD e Verificação CNPJ
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Operamos sob arquitetura multi-tenant com isolamento estrito no banco de dados (Row-Level Security),
            criptografia em trânsito e repouso, conformidade integral com a LGPD (Lei nº 13.709/2018) e
            validação cadastral pública de empresas (Razão Social, Nome Fantasia, CNPJ, CNAE e geolocalização).
          </p>
        </div>
      </section>

      <section aria-labelledby="pillars-heading" className="p-6 rounded-lg border border-border bg-card space-y-4">
        <h2 id="pillars-heading" className="text-lg font-bold text-foreground">
          Pilares Públicos e Infraestrutura Agêntica (WebMCP & OpenAPI 3.1)
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Além da interface web e mobile nativa (Apple HIG), a Waesy é construída nativamente para a Web
          Agêntica, permitindo que mecanismos de busca (Google) e agentes autônomos (Claude, ChatGPT,
          Perplexity, Cursor) consultem catálogos, notícias, eventos e fichas cadastrais de empresas com
          precisão semântica através de Schema.org JSON-LD, GEO (Generative Engine Optimization), negociação
          de conteúdo Markdown (<code>Accept: text/markdown</code>) e protocolo MCP Streamable HTTP.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Marketplace & Diretório CNPJ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Empresas verificadas com ficha cadastral completa, catálogo de produtos e contato direto.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-foreground">
              <Globe className="size-4 text-primary" />
              <span>Portal de Notícias & Eventos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Jornalismo regional apurado, agenda cultural, receitas gastronômicas e vagas de emprego.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-foreground">
              <Code2 className="size-4 text-primary" />
              <span>Developer Portal & WebMCP</span>
            </div>
            <p className="text-xs text-muted-foreground">
              API pública REST, manifesto OpenAPI 3.1, servidor MCP Streamable HTTP e CLI oficial.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="hq-heading" className="p-6 rounded-lg border border-border bg-card space-y-4">
        <h2 id="hq-heading" className="text-base font-bold text-foreground">
          Dados Institucionais, Sede e Canais Oficiais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-primary shrink-0 mt-1" />
            <div>
              <span className="font-bold text-foreground block">Sede Operacional</span>
              <span className="text-muted-foreground">Av. Getúlio Vargas, Centro, Chapecó - SC, CEP 89801-000, Brasil</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="size-4 text-primary shrink-0 mt-1" />
            <div>
              <span className="font-bold text-foreground block">E-mail Institucional & DPO</span>
              <span className="text-muted-foreground font-mono">contato@waesy.com.br • dpo@usewaesy.com</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="size-4 text-primary shrink-0 mt-1" />
            <div>
              <span className="font-bold text-foreground block">Atendimento & Suporte</span>
              <span className="text-muted-foreground">Seg a Sex, 08h às 18h (BRT) • Plantão Digital 24/7</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/developers">
              <span>Portal de Desenvolvedores & API</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/contact">Fale Conosco</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/privacy">Política de Privacidade (LGPD)</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
