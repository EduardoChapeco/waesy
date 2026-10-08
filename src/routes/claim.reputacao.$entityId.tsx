import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Star, Award, CheckCircle2, AlertTriangle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getEntityForClaim } from '@/services/claim-intelligence.functions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export const Route = createFileRoute('/claim/reputacao/$entityId')({
  head: ({ loaderData }: any) => ({
    meta: [{ title: `${loaderData?.entity?.name || "Reputação"} | Waesy Trust` }],
  }),
  loader: async ({ params }) => {
    try {
      const entity = await getEntityForClaim({ data: { entityId: params.entityId } });
      return { entity };
    } catch {
      return { entity: null };
    }
  },
  component: ClaimReputacaoPage,
});

function ClaimReputacaoPage() {
  const { entityId } = Route.useParams();
  const { entity } = (Route.useLoaderData() as any) || {};
  const [activeTab, setActiveTab] = useState('overview');

  const intel = useMemo(() => {
    const raw = entity?.intelligence || {};
    const hasVerifiedEvidence = raw.provenance_status === 'observed_verified';
    const verifiedNumber = (value: unknown) => hasVerifiedEvidence && typeof value === 'number' ? value : null;
    return {
      entity_name: entity?.name || 'Nome não informado',
      visibility_score: verifiedNumber(raw.visibility_score),
      reputation_score: verifiedNumber(raw.reputation_score),
      market_share_percent: verifiedNumber(raw.market_share_percent),
      rank_state: hasVerifiedEvidence ? raw.rank_state ?? null : null,
      verified_claims: verifiedNumber(raw.verified_claims),
      solved_rate: verifiedNumber(raw.solved_rate),
      avg_reply_hours: verifiedNumber(raw.avg_reply_hours),
      competitors: hasVerifiedEvidence && Array.isArray(raw.competitors) ? raw.competitors : [],
      sentiment: {
        positive: verifiedNumber(raw.sentiment?.positive),
        neutral: verifiedNumber(raw.sentiment?.neutral),
        negative: verifiedNumber(raw.sentiment?.negative),
      },
      hasVerifiedEvidence,
    };
  }, [entity]);

  const initials = useMemo(() => {
    const parts = intel.entity_name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return intel.entity_name.slice(0, 2).toUpperCase();
  }, [intel.entity_name]);

  if (!entity) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground grid place-items-center px-4">
        <div className="max-w-lg rounded-lg border border-border bg-card p-8 text-center space-y-3">
          <h1 className="text-xl font-bold">Perfil não encontrado</h1>
          <p className="text-sm text-muted-foreground">Não há um cadastro correspondente a este identificador. Nenhum perfil ou indicador foi criado automaticamente.</p>
          <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
        </div>
      </div>
    );
  }

 return (
 <div className="min-h-[100dvh] bg-background text-foreground py-10 px-4 sm:px-6">
 <div className="max-w-5xl mx-auto space-y-6">
 {/* Header com Visual Apple HIG */}
 <div className="p-6 sm:p-8 rounded-lg border border-border bg-card/60 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="size-16 rounded-lg bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-black text-2xl shadow-xs shadow-primary/20">
 {initials}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-2xl font-bold tracking-tight">{intel.entity_name}</h1>
 <Badge variant="outline" className="gap-1 text-muted-foreground text-xs py-1">
 <AlertTriangle className="size-3.5" /> Indicadores não verificados
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Indicadores só serão exibidos quando houver evidência e método verificáveis.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button variant="outline" className="rounded-lg gap-2 text-xs h-10 min-h-11" onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
                toast.success('Link do perfil copiado para a área de transferência!');
              }}>
 <Share2 className="size-3.5" /> Compartilhar
 </Button>
 <Button asChild className="rounded-lg gap-2 text-xs h-10 min-h-11">
 <Link to="/reclamar/novo" search={{ target: intel.entity_name } as any}>
 Registrar Reclamação
 </Link>
 </Button>
 </div>
 </div>

 {/* KPIs de Reputação */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
 <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
 <Award className="size-4 text-amber-500" /> Score de Reputação
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.reputation_score ?? "Sem dados"}</span>
 </div>
 {intel.reputation_score !== null && <Progress value={intel.reputation_score} className="h-1.5 mt-2 bg-muted/40" />}
 </div>

 <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
 <TrendingUp className="size-4 text-emerald-500" /> Visibilidade de Marca
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.visibility_score === null ? "Sem dados" : `${intel.visibility_score}%`}</span>
 </div>
 {intel.visibility_score !== null && <Progress value={intel.visibility_score} className="h-1.5 mt-2 bg-muted/40" />}
 </div>

 <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
 <CheckCircle2 className="size-4 text-blue-500" /> Taxa de Resolução
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.solved_rate === null ? "Sem dados" : `${intel.solved_rate}%`}</span>
 <span className="text-xs text-muted-foreground">Tempo médio: {intel.avg_reply_hours === null ? "não apurado" : `${intel.avg_reply_hours}h`}</span>
 </div>
 {intel.solved_rate !== null && <Progress value={intel.solved_rate} className="h-1.5 mt-2 bg-muted/40" />}
 </div>

 <div className="p-5 rounded-lg border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
 <BarChart3 className="size-4 text-purple-500" /> Market Share Regional
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.market_share_percent === null ? "Sem dados" : `${intel.market_share_percent}%`}</span>
 </div>
 {intel.market_share_percent !== null && <Progress value={Math.min(100, intel.market_share_percent)} className="h-1.5 mt-2 bg-muted/40" />}
 </div>
 </div>

 {/* Conteúdo em Abas */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <TabsList className="bg-muted/40 p-1 rounded-lg border border-border">
 <TabsTrigger value="overview" className="rounded-lg text-xs font-bold py-2 min-h-11">Visão Geral e Métricas</TabsTrigger>
 <TabsTrigger value="competitors" className="rounded-lg text-xs font-bold py-2 min-h-11">Benchmarking de Concorrência</TabsTrigger>
 <TabsTrigger value="claims" className="rounded-lg text-xs font-bold py-2 min-h-11">Atendimento e Resoluções</TabsTrigger>
 </TabsList>

 <TabsContent value="overview" className="space-y-4">
 <div className="p-6 rounded-lg border border-border bg-card space-y-4">
 <h2 className="text-base font-bold flex items-center gap-2">
 <Star className="size-4 text-amber-500" /> Distribuição de Sentimento do Consumidor
 </h2>
 {intel.sentiment.positive !== null && intel.sentiment.neutral !== null && intel.sentiment.negative !== null ? <div className="space-y-2">
 <div className="flex justify-between text-xs font-semibold">
 <span className="text-emerald-500">Positivo ({intel.sentiment.positive}%)</span>
 <span className="text-muted-foreground">Neutro ({intel.sentiment.neutral}%)</span>
 <span className="text-rose-500">Negativo ({intel.sentiment.negative}%)</span>
 </div>
 <div className="h-3 rounded-full bg-muted/40 overflow-hidden flex">
 <div style={{ width: `${intel.sentiment.positive}%` }} className="bg-emerald-500" />
 <div style={{ width: `${intel.sentiment.neutral}%` }} className="bg-amber-400" />
 <div style={{ width: `${intel.sentiment.negative}%` }} className="bg-rose-500" />
 </div>
 </div> : <p className="text-sm text-muted-foreground">Distribuição de sentimento indisponível: não há uma amostra de avaliações com fonte e método registrados.</p>}
 </div>
 </TabsContent>

 <TabsContent value="competitors" className="space-y-4">
 <div className="p-6 rounded-lg border border-border bg-card space-y-4">
 <h2 className="text-base font-bold flex items-center gap-2">
 <BarChart3 className="size-4 text-primary" /> Concorrentes Diretos no Nicho
 </h2>
                <div className="divide-y divide-border">
                  {intel.competitors.length > 0 ? (
                    intel.competitors.map((comp: any) => (
                      <div key={comp.name} className="py-3 flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{comp.name}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">Reputação: <b className="text-foreground">{comp.reputation}</b></span>
                          <span className="text-muted-foreground">Share: <b className="text-foreground">{comp.share}%</b></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">Dados de concorrentes verificados indisponíveis; ausência de cadastro não significa ausência de concorrentes.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="claims" className="space-y-4">
              <div className="p-6 rounded-lg border border-border bg-card text-center py-10">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold text-foreground">
                  {intel.verified_claims === null ? "Dados de atendimento indisponíveis" : `${intel.verified_claims} atendimentos registrados`}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {intel.verified_claims === null
                    ? "Não há contagem verificável de atendimentos, respostas ou resoluções para este perfil."
                    : intel.verified_claims > 0
                    ? `Foram encontrados ${intel.verified_claims} registros. Taxa de resolução: ${intel.solved_rate === null ? "não apurada" : `${intel.solved_rate}%`}; tempo médio: ${intel.avg_reply_hours === null ? "não apurado" : `${intel.avg_reply_hours}h`}.`
                    : "Nenhum atendimento foi registrado na fonte consultada."}
                </p>
              </div>
            </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
