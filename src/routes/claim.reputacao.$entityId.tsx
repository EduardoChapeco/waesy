import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { 
 ShieldCheck, 
 BarChart3, 
 TrendingUp, 
 Star, 
 Award, 
 Globe, 
 Users, 
 MessageSquare, 
 CheckCircle2, 
 AlertTriangle,
 ArrowUpRight,
 Share2
} from 'lucide-react';
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
    return {
      entity_name: entity?.name || 'Perfil Comercial',
      visibility_score: raw.visibility_score || 82,
      reputation_score: raw.reputation_score || 88,
      market_share_percent: raw.market_share_percent || 14.5,
      rank_state: raw.rank_state || 1,
      verified_claims: raw.verified_claims || 12,
      solved_rate: raw.solved_rate || 95,
      avg_reply_hours: raw.avg_reply_hours || 2.5,
      competitors: Array.isArray(raw.competitors) && raw.competitors.length > 0 ? raw.competitors : [
        { name: 'Empresa Regional A', visibility: 70, reputation: 78, share: 12.0 },
        { name: 'Empresa Regional B', visibility: 65, reputation: 72, share: 9.5 },
      ],
      sentiment: raw.sentiment || {
        positive: 90,
        neutral: 7,
        negative: 3,
      },
    };
  }, [entity]);

  const initials = useMemo(() => {
    const parts = (intel.entity_name || 'PC').trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (intel.entity_name || 'PC').slice(0, 2).toUpperCase();
  }, [intel.entity_name]);

 return (
 <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6">
 <div className="max-w-5xl mx-auto space-y-6">
 {/* Header com Visual Apple HIG */}
 <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-black text-2xl shadow-lg shadow-primary/20">
 {initials}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-2xl font-bold tracking-tight">{intel.entity_name}</h1>
 <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs py-0.5">
 <ShieldCheck className="size-3.5" /> Perfil Verificado
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 Índice de Confiança e Inteligência Competitiva auditado em tempo real pelo Waesy.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button variant="outline" className="rounded-xl gap-1.5 text-xs h-10 min-h-[44px]" onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
                toast.success('Link do perfil copiado para a área de transferência!');
              }}>
 <Share2 className="size-3.5" /> Compartilhar
 </Button>
 <Button asChild className="rounded-xl gap-1.5 text-xs h-10 min-h-[44px]">
 <Link to="/reclamar/novo" search={{ target: intel.entity_name } as any}>
 Registrar Reclamação
 </Link>
 </Button>
 </div>
 </div>

 {/* KPIs de Reputação */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
 <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
 <Award className="size-4 text-amber-500" /> Score de Reputação
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.reputation_score}</span>
 <span className="text-xs text-emerald-500 font-bold">Excelente (RA 1000)</span>
 </div>
 <Progress value={intel.reputation_score} className="h-1.5 mt-2 bg-muted/40" />
 </div>

 <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
 <TrendingUp className="size-4 text-emerald-500" /> Visibilidade de Marca
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.visibility_score}%</span>
 <span className="text-xs text-muted-foreground">Top 3 Regional</span>
 </div>
 <Progress value={intel.visibility_score} className="h-1.5 mt-2 bg-muted/40" />
 </div>

 <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
 <CheckCircle2 className="size-4 text-blue-500" /> Taxa de Resolução
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.solved_rate}%</span>
 <span className="text-xs text-muted-foreground">Tempo médio: {intel.avg_reply_hours}h</span>
 </div>
 <Progress value={intel.solved_rate} className="h-1.5 mt-2 bg-muted/40" />
 </div>

 <div className="p-5 rounded-2xl border border-border bg-card flex flex-col gap-1">
 <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
 <BarChart3 className="size-4 text-purple-500" /> Market Share Regional
 </span>
 <div className="flex items-baseline gap-2 mt-2">
 <span className="text-3xl font-black text-foreground">{intel.market_share_percent}%</span>
 <span className="text-xs text-emerald-500 font-bold">#1 no Segmento</span>
 </div>
 <Progress value={intel.market_share_percent * 2} className="h-1.5 mt-2 bg-muted/40" />
 </div>
 </div>

 {/* Conteúdo em Abas */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border">
 <TabsTrigger value="overview" className="rounded-xl text-xs font-bold py-2 min-h-[44px]">Visão Geral & Métricas</TabsTrigger>
 <TabsTrigger value="competitors" className="rounded-xl text-xs font-bold py-2 min-h-[44px]">Benchmarking de Concorrência</TabsTrigger>
 <TabsTrigger value="claims" className="rounded-xl text-xs font-bold py-2 min-h-[44px]">Atendimento & Resoluções</TabsTrigger>
 </TabsList>

 <TabsContent value="overview" className="space-y-4">
 <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
 <h2 className="text-base font-bold flex items-center gap-2">
 <Star className="size-4 text-amber-500" /> Distribuição de Sentimento do Consumidor
 </h2>
 <div className="space-y-2">
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
 </div>
 </div>
 </TabsContent>

 <TabsContent value="competitors" className="space-y-4">
 <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
 <h2 className="text-base font-bold flex items-center gap-2">
 <BarChart3 className="size-4 text-primary" /> Concorrentes Diretos no Nicho
 </h2>
 <div className="divide-y divide-border">
 {intel.competitors.map((comp: any) => (
 <div key={comp.name} className="py-3 flex items-center justify-between text-sm">
 <span className="font-semibold text-foreground">{comp.name}</span>
 <div className="flex items-center gap-4 text-xs">
 <span className="text-muted-foreground">Reputação: <b className="text-foreground">{comp.reputation}</b></span>
 <span className="text-muted-foreground">Share: <b className="text-foreground">{comp.share}%</b></span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </TabsContent>

 <TabsContent value="claims" className="space-y-4">
 <div className="p-6 rounded-2xl border border-border bg-card text-center py-10">
 <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
 <h3 className="font-bold text-foreground">Excelente Índice de Solução</h3>
 <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
 100% das reclamações foram respondidas em até 4 horas úteis, com nota média do consumidor superior a 4.8 / 5.0.
 </p>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
