import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WAESY_CANONICAL_ORIGIN } from "@/lib/agentic/agentic-readiness-engine";

export const Route = createFileRoute("/_store/privacy")({
  head: () => {
    const title = "Política de Privacidade e Proteção de Dados (Privacy Policy / LGPD) | Waesy";
    const description =
      "Política oficial de privacidade, governança Zero-Trust, isolamento multi-tenant e conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) na plataforma Waesy.";
    const canonicalUrl = `${WAESY_CANONICAL_ORIGIN}/privacy`;
    const ogImage = `${WAESY_CANONICAL_ORIGIN}/icons/icon-512x512.png`;

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
    };
  },
  component: PrivacyTrustAnchorPage,
});

function PrivacyTrustAnchorPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-6 py-6 sm:py-12 space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <Badge variant="outline" className="text-xs font-mono uppercase">
          LGPD Lei nº 13.709/2018 • Privacy Policy
        </Badge>
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
          Política de Privacidade, Segurança da Informação e Proteção de Dados (LGPD)
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
          Este documento estabelece como a Plataforma Waesy (<strong>waesy.com.br</strong>) coleta, processa,
          armazena e protege dados pessoais e empresariais sob arquitetura Zero-Trust, em estrita conformidade
          com a Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018) e padrões internacionais
          de privacidade.
        </p>
      </header>

      <section aria-label="Diretrizes de Privacidade" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="size-4" />
            <h2 className="text-sm font-bold text-foreground">1. Minimização & Zero-Trust</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Coletamos estritamente os dados necessários para prestação de serviços de comércio local, entrega,
            emissão fiscal e autenticação segura, sem comercialização de listas pessoais a terceiros.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Database className="size-4" />
            <h2 className="text-sm font-bold text-foreground">2. Isolamento Multi-Tenant</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Dados operacionais de lojas, margens financeiras, clientes e contratos são isolados por políticas
            PostgreSQL Row-Level Security (RLS) e nunca são expostos em rotas públicas ou APIs de agentes.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-4" />
            <h2 className="text-sm font-bold text-foreground">3. Direitos do Titular (Art. 18)</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Garantimos confirmação de tratamento, acesso, retificação, anonimização, portabilidade e exclusão
            de dados mediante requisição direta ao Encarregado de Dados (DPO).
          </p>
        </div>
      </section>

      <article className="p-6 rounded-lg border border-border bg-card space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span>4. Dados Públicos de Pessoas Jurídicas vs. Proteção de Dados Pessoais</span>
        </h2>
        <p>
          Para assegurar transparência e confiança nas relações de consumo no Diretório Empresarial e no
          Marketplace Local, os perfis públicos de estabelecimentos comerciais exibem informações cadastrais de
          natureza pública da pessoa jurídica (Razão Social, Nome Fantasia, número de inscrição no CNPJ,
          situação cadastral, atividade econômica CNAE e endereço comercial). Dados privados de representantes
          físicos (CPF, RG, credenciais bancárias e custos internos) permanecem estritamente protegidos e
          inacessíveis publicamente.
        </p>

        <h2 className="text-base font-bold text-foreground">
          5. Criptografia, Retenção e Governança de Agentes Autônomos (WebMCP)
        </h2>
        <p>
          Todas as comunicações utilizam TLS 1.3 em trânsito e criptografia AES-256 em repouso. O acesso de
          agentes de inteligência artificial via protocolo WebMCP e REST API é restrito às ferramentas de
          leitura pública sanitizada (Tier 1) ou a sessões autenticadas com escopo explícito por loja (Tier 2),
          registradas em trilha de auditoria imutável e protegidas por controle de taxa (RFC RateLimit).
        </p>

        <h2 className="text-base font-bold text-foreground">
          6. Contato do Encarregado pelo Tratamento de Dados Pessoais (DPO)
        </h2>
        <p>
          Para esclarecimentos, auditoria de consentimento ou requisições previstas na LGPD, contate nosso
          Encarregado de Proteção de Dados pelo e-mail <strong className="text-foreground font-mono">dpo@usewaesy.com</strong> ou
          acesse nossa página oficial de atendimento.
        </p>
      </article>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/privacidade">Ver Documento Legal Completo</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/contact">Falar com o DPO / Suporte</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Link to="/termos">Termos de Uso</Link>
        </Button>
      </div>
    </div>
  );
}
