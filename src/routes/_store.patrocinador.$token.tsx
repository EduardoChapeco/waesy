import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicSponsorReport, type PublicSponsorReportDTO } from "@/services/news.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/patrocinador/$token")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.report?.sponsor
          ? `${loaderData.report.sponsor.name} | Relatório de Desempenho da Campanha`
          : "Relatório do Patrocinador | Waesy",
      },
      {
        name: "description",
        content: "Relatório de telemetria e desempenho de anúncio auditado em tempo real.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const data = await getPublicSponsorReport({
        data: { magicToken: params.token },
      }).catch(() => null);
      return { report: data || null };
    } catch (err) {
      console.error("[loader:_store.patrocinador.$token] error:", err);
      return { report: null };
    }
  },
  component: PublicSponsorReportPage,
});

function PublicSponsorReportPage() {
  const { report } = ((Route.useLoaderData() as any) || {}) as { report: PublicSponsorReportDTO | null };

  if (!report || !report.sponsor) {
    return (
      <div className="w-full max-w-xl mx-auto px-0 sm:px-4 py-24 text-center space-y-4">
        <div className="size-14 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-xl font-black text-foreground">Relatório Não Encontrado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O link mágico informado pode estar incorreto, expirado ou a campanha publicitária ainda não foi ativada.
        </p>
        <Button asChild variant="outline" className="rounded-xl font-bold mt-2">
          <Link to="/">
            Voltar ao Início
          </Link>
        </Button>
      </div>
    );
  }

  const { sponsor, newspaperName, newspaperLogo, newspaperCity, metrics, dailyPoints } = report;

  const handleShareLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do relatório copiado para a área de transferência!");
    }
  };

  const targetUrl = sponsor.target_url || sponsor.website_url;

  // Formata tempo de atenção
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs > 0 ? `${secs}s` : ""}`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Topo do Relatório: Veículo de Imprensa & Selo Auditado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border shadow-xs">
        <div className="flex items-center gap-3.5">
          {newspaperLogo ? (
            <img
              src={newspaperLogo}
              alt={newspaperName}
              className="size-12 rounded-xl object-cover border"
            />
          ) : (
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-base">
              {newspaperName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-primary tracking-wider">
                Consórcio de Imprensa
              </span>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">{newspaperCity || "Regional"}</span>
            </div>
            <h2 className="text-base font-bold text-foreground">{newspaperName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <CheckCircle2 className="size-3.5" />
            <span>Auditoria em Tempo Real</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareLink}
            className="rounded-xl font-bold text-xs gap-1.5 h-10 px-3.5 min-h-[44px]"
          >
            <Share2 className="size-3.5" />
            <span>Compartilhar</span>
          </Button>
        </div>
      </div>

      {/* ── Cabeçalho do Patrocinador ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {sponsor.logo_url && (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="size-10 rounded-lg object-contain bg-white p-1 border"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {sponsor.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Campanha da Rede Display • Veiculação Automatizada em Matérias e Feed
            </p>
          </div>
        </div>
      </div>

      {/* ── Grid de Métricas Principais (Apple HIG Clean) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card: Visualizações Reais */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Visualizações</span>
            <Eye className="size-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {metrics.totalImpressions.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            No viewport real por mais de 1s
          </p>
        </div>

        {/* Card: Cliques Registrados */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Cliques Únicos</span>
            <MousePointerClick className="size-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {metrics.totalClicks.toLocaleString("pt-BR")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Acessos ao seu site ou perfil
          </p>
        </div>

        {/* Card: Taxa de Conversão (CTR) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Taxa de Cliques (CTR)</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {metrics.ctrPercent}%
          </p>
          <p className="text-[11px] text-muted-foreground">
            Eficiência média da campanha
          </p>
        </div>

        {/* Card: Tempo Total de Atenção */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">Tempo de Atenção</span>
            <Clock className="size-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground font-mono tracking-tight truncate">
            {formatDuration(metrics.totalDurationSeconds)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Exposição ativa na tela dos leitores
          </p>
        </div>
      </div>

      {/* ── Prévia do Criativo Ativo da Rede Display ── */}
      <div className="p-6 rounded-2xl bg-card border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground">Criativo em Veiculação</h3>
            <p className="text-xs text-muted-foreground">
              Formato responsivo distribuído randomicamente nas matérias e feed do jornal
            </p>
          </div>
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start sm:self-auto"
            >
              <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1.5 h-10 px-3.5 min-h-[44px]">
                <span>Testar Destino</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </a>
          )}
        </div>

        <div className="space-y-3">
          {sponsor.video_url ? (
            <div className="rounded-xl overflow-hidden border bg-black aspect-16/9 max-w-xl mx-auto">
              <video
                src={sponsor.video_url}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="size-full object-cover"
              />
            </div>
          ) : sponsor.banner_url ? (
            <div className="rounded-xl overflow-hidden border bg-muted/40 max-w-xl mx-auto">
              <img
                src={sponsor.banner_url}
                alt={sponsor.name}
                className="w-full h-auto object-cover max-h-72"
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground">
              Nenhum banner ou vídeo cadastrado. O anúncio está sendo veiculado em formato textual.
            </div>
          )}

          {targetUrl && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <span className="font-bold text-foreground">Link de Destino:</span>
              <span className="font-mono truncate">{targetUrl}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Desempenho Diário de Telemetria ── */}
      {dailyPoints && dailyPoints.length > 0 && (
        <div className="p-6 rounded-2xl bg-card border space-y-4">
          <div className="space-y-0.5 border-b pb-4">
            <h3 className="text-sm font-bold text-foreground">Histórico de Visualizações e Cliques</h3>
            <p className="text-xs text-muted-foreground">
              Distribuição diária registrada pelos eventos de telemetria antifraude
            </p>
          </div>

          <div className="divide-y text-xs">
            {dailyPoints.map((point) => (
              <div
                key={point.date}
                className="py-2.5 flex items-center justify-between gap-4 font-mono"
              >
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>{new Date(point.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <div>
                    <span className="font-bold text-foreground">{point.impressions}</span> visualizações
                  </div>
                  <div>
                    <span className="font-bold text-foreground">{point.clicks}</span> cliques
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rodapé de Auditoria e Transparência ── */}
      <div className="p-4 rounded-xl bg-muted/30 border text-center text-[11px] text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">
          Relatório protegido por Token Criptográfico Exclusivo • Waesy Display Network
        </p>
        <p>
          Métricas calculadas exclusivamente com base em leitores humanos reais. Cliques repetidos ou
          robôs de busca são filtrados automaticamente pelas regras de integridade.
        </p>
      </div>
    </div>
  );
}
