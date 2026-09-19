import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Coins,
  Lock,
  Plus,
  ExternalLink,
  TrendingUp,
  Building,
  Users,
  Eye,
  ShieldCheck,
  FileSpreadsheet,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/commerce/page-header";
import { formatMoney } from "@/lib/money";
import { listStoreBusinessClassifieds, listStoreAllNdaSignatures } from "@/services/classifieds.functions";

export const Route = createFileRoute("/workspace/captacao/")({
  head: () => ({ meta: [{ title: "Captação de Investimento & M&A | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [businesses, ndas] = await Promise.all([
        listStoreBusinessClassifieds().catch(() => []),
        listStoreAllNdaSignatures().catch(() => []),
      ]);
      return { businesses: businesses || [], ndas: ndas || [] };
    } catch (err) {
      console.warn("[workspace.captacao] Loader fallback:", err);
      return { businesses: [], ndas: [] };
    }
  },
  component: WorkspaceCaptacaoHubPage,
});

function WorkspaceCaptacaoHubPage() {
  const loaderData = Route.useLoaderData();

  const { data: businesses = loaderData.businesses } = useQuery({
    queryKey: ["workspace", "business-classifieds"],
    queryFn: () => listStoreBusinessClassifieds(),
    initialData: loaderData.businesses,
  });

  const { data: ndas = loaderData.ndas } = useQuery({
    queryKey: ["workspace", "nda-signatures"],
    queryFn: () => listStoreAllNdaSignatures(),
    initialData: loaderData.ndas,
  });

  // Métricas agregadas reais (Zero Mocks)
  const totalValuationCents = businesses.reduce((acc: number, b: any) => {
    const val = b.attributes?.valuation_cents || b.price_cents || 0;
    return acc + Number(val);
  }, 0);

  const totalRevenueMonthlyCents = businesses.reduce((acc: number, b: any) => {
    return acc + Number(b.attributes?.monthly_revenue_cents || 0);
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── CABEÇALHO COM AÇÕES RÁPIDAS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader title="Captação de Investimento, M&A & Pontos" />
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestão estratégica de empresas à venda, repasse de pontos comerciais, captação de aportes e termos de confidencialidade (NDA).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button asChild variant="outline" size="sm" className="h-9 px-3.5 gap-2 rounded-xl text-xs font-semibold">
            <Link to="/workspace/captacao/ndas">
              <Lock className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>Ver NDAs Assinados</span>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold px-1.5 py-0 h-4">
                {ndas.length}
              </Badge>
            </Link>
          </Button>

          <Button asChild size="sm" className="h-9 px-3.5 gap-1.5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs">
            <Link to="/conta/classificados/novo" search={{ tipo: "negocio" }}>
              <Plus className="size-3.5" />
              <span>Novo Anúncio de Negócio</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 4 CARDS DE MÉTRICAS ESTRATÉGICAS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total em Valuation</span>
            <Coins className="size-4 text-primary" />
          </div>
          <strong className="text-base sm:text-xl font-bold font-mono text-foreground">
            {formatMoney(totalValuationCents)}
          </strong>
          <span className="text-[11px] text-muted-foreground">Soma de ativos e participações</span>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Oportunidades Ativas</span>
            <Briefcase className="size-4 text-emerald-500" />
          </div>
          <strong className="text-base sm:text-xl font-bold font-mono text-foreground">
            {businesses.length}
          </strong>
          <span className="text-[11px] text-muted-foreground">Empresas e pontos listados</span>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">NDAs Assinados</span>
            <Lock className="size-4 text-amber-500" />
          </div>
          <strong className="text-base sm:text-xl font-bold font-mono text-foreground">
            {ndas.length}
          </strong>
          <span className="text-[11px] text-muted-foreground">Investidores com acesso liberado</span>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Faturamento Mensal</span>
            <TrendingUp className="size-4 text-blue-500" />
          </div>
          <strong className="text-base sm:text-xl font-bold font-mono text-foreground">
            {formatMoney(totalRevenueMonthlyCents)}
          </strong>
          <span className="text-[11px] text-muted-foreground">Receita recorrente combinada</span>
        </div>
      </div>

      {/* ── LISTA DAS EMPRESAS E PONTOS COMERCIAIS ── */}
      <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="size-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Oportunidades em Carteira
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {businesses.length} {businesses.length === 1 ? "registro" : "registros"}
          </Badge>
        </div>

        {businesses.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <Briefcase className="size-10 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Nenhuma oportunidade anunciada ainda</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Publique sua empresa, franquia ou ponto comercial com proteção de sigilo por termo NDA e conecte-se a investidores qualificados.
              </p>
            </div>
            <Button asChild size="sm" className="h-9 px-4 rounded-xl text-xs font-bold">
              <Link to="/conta/classificados/novo" search={{ tipo: "negocio" }}>
                <Plus className="size-3.5 mr-1.5" />
                <span>Anunciar Empresa / Ponto</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {businesses.map((item: any) => {
              const attrs = item.attributes || {};
              const valuation = attrs.valuation_cents || item.price_cents || 0;
              const revenue = attrs.monthly_revenue_cents;
              const profit = attrs.net_profit_cents;
              const requiresNda = Boolean(attrs.requires_nda || attrs.is_confidential);
              const img = (Array.isArray(item.images) && item.images[0]) || (Array.isArray(item.media) && item.media[0]) || null;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="size-14 sm:size-16 rounded-xl bg-muted/40 border border-border/50 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={item.title} className="size-full object-cover" />
                      ) : (
                        <Briefcase className="size-6 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{item.title}</span>
                        {requiresNda && (
                          <Badge variant="outline" className="text-[10px] font-medium border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                            <Lock className="size-2.5 mr-1" />
                            NDA Ativo
                          </Badge>
                        )}
                        {attrs.advisor_supported && (
                          <Badge variant="outline" className="text-[10px] font-medium border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10">
                            <ShieldCheck className="size-2.5 mr-1" />
                            Assessorada
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {attrs.business_segment && <span>{attrs.business_segment}</span>}
                        {attrs.commercial_point_type && (
                          <span className="flex items-center gap-1">
                            • <Building className="size-3" />
                            {attrs.commercial_point_type}
                          </span>
                        )}
                        {attrs.area_sqm && <span>• {attrs.area_sqm} m²</span>}
                        {attrs.foundation_year && <span>• Desde {attrs.foundation_year}</span>}
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-xs font-mono flex-wrap">
                        <span className="text-foreground font-bold">
                          Valuation: {formatMoney(valuation)}
                        </span>
                        {revenue && (
                          <span className="text-muted-foreground">
                            Fat: {formatMoney(revenue)}/mês
                          </span>
                        )}
                        {profit && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Lucro: {formatMoney(profit)}/mês
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5 rounded-lg text-xs font-medium">
                      <Link to="/workspace/captacao/ndas">
                        <Users className="size-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                        <span>Ver Assinaturas</span>
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5 rounded-lg text-xs font-medium">
                      <Link to="/classificados/$id" params={{ id: item.id }}>
                        <Eye className="size-3.5 mr-1.5" />
                        <span>Vitrine</span>
                        <ArrowUpRight className="size-3 ml-0.5 opacity-60" />
                      </Link>
                    </Button>

                    <Button asChild size="sm" className="h-8 px-2.5 rounded-lg text-xs font-medium">
                      <Link to="/conta/classificados/novo" search={{ tipo: "negocio", editId: item.id }}>
                        <span>Editar</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
