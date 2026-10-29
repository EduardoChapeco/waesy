import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock, ShieldCheck, MessageSquare, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WAESY_CANONICAL_ORIGIN } from "@/lib/agentic/agentic-readiness-engine";

export const Route = createFileRoute("/_store/contact")({
  head: () => {
    const title = "Contato e Ouvidoria Oficial (Contact Us) | Waesy";
    const description =
      "Canais oficiais de contato, suporte ao consumidor, atendimento a empresas parceiras, imprensa, DPO (LGPD) e relações com desenvolvedores da Waesy.";
    const canonicalUrl = `${WAESY_CANONICAL_ORIGIN}/contact`;
    const ogImage = `${WAESY_CANONICAL_ORIGIN}/icons/icon-512x512.png`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "@id": `${canonicalUrl}#contactpage`,
      url: canonicalUrl,
      name: title,
      description,
      mainEntity: {
        "@type": "Organization",
        name: "Waesy",
        url: WAESY_CANONICAL_ORIGIN,
        email: "contato@waesy.com.br",
        telephone: "+55-49-3321-0000",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Av. Getúlio Vargas, Centro",
          addressLocality: "Chapecó",
          addressRegion: "SC",
          postalCode: "89801-000",
          addressCountry: "BR",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+55-49-3321-0000",
            email: "contato@waesy.com.br",
            contactType: "customer service",
            areaServed: "BR",
            availableLanguage: ["Portuguese", "English"],
          },
          {
            "@type": "ContactPoint",
            email: "dpo@usewaesy.com",
            contactType: "data protection officer",
            areaServed: "BR",
            availableLanguage: ["Portuguese", "English"],
          },
        ],
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
  component: ContactTrustAnchorPage,
});

function ContactTrustAnchorPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-6 py-6 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="outline" className="text-xs font-mono uppercase">
          Atendimento Oficial • Contact & Support
        </Badge>
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
          Fale Conosco — Atendimento, Ouvidoria e Suporte Técnico Waesy
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
          Entre em contato direto com a equipe oficial da Waesy (<strong>waesy.com.br</strong>) para suporte a
          compradores, credenciamento de empresas e lojas, imprensa regional, privacidade de dados (LGPD) e
          integrações via API / WebMCP.
        </p>
      </header>

      <section aria-label="Canais de atendimento" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Mail className="size-5" />
            <h2 className="text-base font-bold text-foreground">E-mail de Atendimento & Ouvidoria</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Canal oficial para consumidores, lojistas parceiros, solicitações comerciais e verificação de
            perfil empresarial (Cartão CNPJ):
          </p>
          <p className="text-xs font-mono font-bold text-foreground">
            contato@waesy.com.br • suporte@usewaesy.com
          </p>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Code2 className="size-5" />
            <h2 className="text-base font-bold text-foreground">Engenharia, API & Encarregado LGPD (DPO)</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Suporte técnico para integrações OpenAPI 3.1, protocolo WebMCP, webhooks transacionais e exercício
            de direitos do titular de dados (Art. 18 da LGPD):
          </p>
          <p className="text-xs font-mono font-bold text-foreground">
            dev@waesy.com.br • dpo@usewaesy.com
          </p>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="size-5" />
            <h2 className="text-base font-bold text-foreground">Endereço Físico & Sede Regional</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Av. Getúlio Vargas, Centro, Chapecó — Santa Catarina (SC), CEP 89801-000, Brasil.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="size-4 text-primary" />
            <span className="font-mono">+55 (49) 3321-0000</span>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Clock className="size-5" />
            <h2 className="text-base font-bold text-foreground">Horário de Operação & SLA</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Atendimento humano de Segunda a Sexta-feira, das 08h00 às 18h00 (Horário de Brasília — BRT).
            Monitoramento de infraestrutura e plantão digital 24/7.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" />
            <span>SLA de Resposta Técnica: até 4 horas úteis</span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/contato">
            <MessageSquare className="size-4" />
            <span>Abrir Formulário de Mensagem</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/about">Sobre a Waesy</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/privacy">Política de Privacidade</Link>
        </Button>
      </div>
    </div>
  );
}
