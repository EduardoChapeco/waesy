import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Layers, ShoppingBag, ShieldCheck, CheckCircle2, Globe, Bot, MessageSquare, Car, Tag, Newspaper } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/state/states";
import { COMMERCIAL_MODULE_CATALOG, STORE_PLANS } from "@/lib/architecture/module-plan-governance";
import { resolveSubsystemHref, type VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";
import { formatMoney } from "@/lib/money";

export interface WaesySalesTabsProps {
  subsystems: VerticalSubsystemDescriptor[];
  marketplaceProducts?: any[];
  places?: any[];
  classifieds?: any[];
  news?: any[];
  currentHost?: string;
}

export function WaesySalesTabs({
  subsystems,
  marketplaceProducts = [],
  places = [],
  classifieds = [],
  news = [],
  currentHost = "",
}: WaesySalesTabsProps) {
  const [tab, setTab] = useState("pro");

  const landingSubsystems = subsystems.filter((s) => s.isActive && s.showOnLanding);
  const marketplaceApp = subsystems.find((s) => s.id === "marketplace");
  const marketplaceLink = marketplaceApp
    ? resolveSubsystemHref(marketplaceApp, currentHost)
    : { href: "/marketplace", external: false };

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <div className="overflow-x-auto waesy-tab-strip pb-1">
        <TabsList className="inline-flex h-11 min-h-11 bg-muted/60 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="pro" className="h-9 px-4 text-xs font-semibold rounded-lg">Waesy Pro</TabsTrigger>
          <TabsTrigger value="verticais" className="h-9 px-4 text-xs font-semibold rounded-lg">Subsistemas Verticais</TabsTrigger>
          <TabsTrigger value="modulos" className="h-9 px-4 text-xs font-semibold rounded-lg">Módulos e Planos</TabsTrigger>
          <TabsTrigger value="marketplace" className="h-9 px-4 text-xs font-semibold rounded-lg">Waesy Marketplace</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pro" className="space-y-6 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Badge variant="outline" className="text-2xs font-mono">ERP + CRM + IA Unificado</Badge>
            <h2 className="text-xl font-bold text-foreground">Waesy Pro All-in-One</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Gestão completa para sua empresa operar vendas, estoque com grade, frente de caixa PDV, finanças, conciliação Pix, RH, contratos com assinatura e atendimento omnichannel WhatsApp.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary shrink-0" /><span>PDV, Comandas &amp; KDS</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary shrink-0" /><span>Financeiro, Boletos &amp; Pix</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary shrink-0" /><span>CRM 360 &amp; Chat WhatsApp</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary shrink-0" /><span>Copilot IA com Subagentes</span></div>
            </div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
                <a href="/painel">
                  <span>Acessar Waesy Pro</span>
                  <ArrowRight className="size-3.5" />
                </a>
              </Button>
              <Button asChild variant="ghost" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
                <Link to="/portal-completo">
                  <span>Módulos e Demonstração</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Badge variant="outline" className="text-2xs font-mono">Fluxo Ponta a Ponta</Badge>
            <h3 className="text-base font-bold text-foreground">Como os sistemas operam juntos</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <MessageSquare className="size-4 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-foreground">1. Captação no Talk CRM &amp; Marketplace</p>
                  <p className="text-muted-foreground">Pedidos, cotações WhatsApp e classificados caem direto na sua fila comercial.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="size-4 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-foreground">2. Processamento no Workspace Pro</p>
                  <p className="text-muted-foreground">Estoque, contratos digitais, fluxo de caixa e folha atualizam automaticamente.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Bot className="size-4 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-foreground">3. Automação pelo Waesy Copilot IA</p>
                  <p className="text-muted-foreground">Analisa dados, navega na web e executa fluxos operacionais com controle humano.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="verticais" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {landingSubsystems.map((sub) => {
            const link = resolveSubsystemHref(sub, currentHost);
            return (
              <div key={sub.id} className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{sub.name}</h3>
                    <Badge variant="secondary" className="text-2xs font-mono">{sub.canonicalDomain}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{sub.description}</p>
                  <p className="text-2xs text-foreground/80">{sub.howItWorks}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                  <Link
                    to="/sistemas/$slug"
                    params={{ slug: sub.id }}
                    className="inline-flex h-11 min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>Ver Página</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="inline-flex h-11 min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>Abrir App</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="modulos" className="space-y-6 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.values(COMMERCIAL_MODULE_CATALOG).map((mod) => (
            <div key={mod.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">{mod.name}</h3>
                <Badge variant="outline" className="font-mono text-xs">{formatMoney(mod.monthlyPriceCents)}/mês</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.values(STORE_PLANS).map((tier) => (
            <div key={tier.tier} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">{tier.name}</h4>
                <span className="text-xs font-mono font-bold text-primary">{formatMoney(tier.monthlyPriceCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {tier.maxStaffUsers >= 999 ? "Equipe ilimitada" : `Até ${tier.maxStaffUsers} usuário(s)`} • {tier.includedModules.length} módulo(s)
              </p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="marketplace" className="space-y-6 mt-0">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <Badge variant="outline" className="text-2xs font-mono gap-1">
              <ShoppingBag className="size-3" />
              <span>App Dedicado ao Comércio Local</span>
            </Badge>
            <h2 className="text-lg font-bold text-foreground">Waesy Marketplace + Vitrine da Cidade</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sua empresa escolhe se opera em modo 100% SaaS privado ou publica ofertas, classificados e lojas no Waesy Marketplace compartilhado.
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2 shrink-0">
            <a href={marketplaceLink.href} target={marketplaceLink.external ? "_blank" : undefined} rel={marketplaceLink.external ? "noopener noreferrer" : undefined}>
              <span>Abrir Waesy Marketplace</span>
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/marketplace" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold">Lojas &amp; Ofertas</span><ShoppingBag className="size-4 text-primary" /></div>
            <p className="text-lg font-bold font-mono text-foreground">{marketplaceProducts.length || places.length}</p>
            <p className="text-2xs text-muted-foreground">Ver produtos no Marketplace</p>
          </a>
          <a href="/classificados" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold">Classificados</span><Tag className="size-4 text-primary" /></div>
            <p className="text-lg font-bold font-mono text-foreground">{classifieds.length}</p>
            <p className="text-2xs text-muted-foreground">Abrir app Classificados</p>
          </a>
          <a href="/noticias" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold">Notícias</span><Newspaper className="size-4 text-primary" /></div>
            <p className="text-lg font-bold font-mono text-foreground">{news.length}</p>
            <p className="text-2xs text-muted-foreground">Abrir app Notícias</p>
          </a>
          <a href="/mobilidade" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold">Waesy Go</span><Car className="size-4 text-primary" /></div>
            <p className="text-lg font-bold font-mono text-foreground">R$ 0,99</p>
            <p className="text-2xs text-muted-foreground">Abrir app Mobilidade</p>
          </a>
        </div>

        {marketplaceProducts.length === 0 && places.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Vitrine pronta para ativação regional"
            description="Empresas verificadas podem publicar produtos diretamente no app Marketplace."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {marketplaceProducts.slice(0, 4).map((p: any) => (
              <a
                key={p.id}
                href={`/produto/${p.slug || p.id}`}
                className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                  <p className="text-2xs text-muted-foreground truncate">{p.storeName || "Empresa Verificada"}</p>
                </div>
                <span className="text-xs font-mono font-bold text-primary shrink-0">
                  {formatMoney(p.priceCents || p.price_cents || 0)}
                </span>
              </a>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
