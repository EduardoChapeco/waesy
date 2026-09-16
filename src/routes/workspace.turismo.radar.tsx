import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Shield,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  Info,
  Zap,
  Thermometer,
  DollarSign,
  MapPin,
  Eye,
  Search,
  ChevronRight,
  Plane,
  BadgeCheck,
  BarChart3,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkspaceCanonicalToolbar } from '@/components/workspace/workspace-canonical-toolbar';
import { WorkspaceDashboardSheet, type MetricCardItem } from '@/components/workspace/workspace-dashboard-sheet';
import { toast } from 'sonner';
import { getStoreSettings } from '@/services/store.functions';
import {
  listDestinationIntelligence,
  upsertDestinationIntelligence,
  listTravelAlerts,
  createTravelAlert,
} from '@/services/destination-intelligence.functions';
import type {
  DestinationIntelligence,
  TravelAlert,
  SafetyLevel,
  DestinationTrend,
} from '@/types/destination-intelligence';

export const Route = createFileRoute('/workspace/turismo/radar')({
  head: () => ({ meta: [{ title: 'Radar Global de Destinos & IA | Workspace Waesy' }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const storeId = store?.id || '';
      const [destRows, alertRows] = await Promise.all([
        storeId ? listDestinationIntelligence({ data: { store_id: storeId } }).catch(() => []) : [],
        storeId ? listTravelAlerts({ data: { store_id: storeId } }).catch(() => []) : [],
      ]);
      return { store, initialDestinations: destRows, initialAlerts: alertRows };
    } catch (err) {
      console.error('[loader:workspace.turismo.radar] Unhandled loader error:', err);
      return { store: null, initialDestinations: [], initialAlerts: [] };
    }
  },
  component: TurismoRadarPage,
});

function getTrendConfig(trend: DestinationTrend) {
  const map: Record<DestinationTrend, { icon: any; color: string; label: string; bg: string }> = {
    rising: { icon: TrendingUp, color: 'text-emerald-500', label: 'Alta Demanda', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    stable: { icon: Minus, color: 'text-blue-400', label: 'Estável', bg: 'bg-blue-400/10 border-blue-400/30' },
    falling: { icon: TrendingDown, color: 'text-rose-400', label: 'Queda', bg: 'bg-rose-400/10 border-rose-400/30' },
  };
  return map[trend] || map.stable;
}

function getSafetyConfig(level: SafetyLevel) {
  const map: Record<SafetyLevel, { icon: any; label: string; bg: string }> = {
    safe: { icon: BadgeCheck, label: 'Seguro', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    moderate: { icon: Shield, label: 'Atenção Moderada', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    caution: { icon: ShieldAlert, label: 'Cautela', bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
    warning: { icon: ShieldOff, label: 'Alerta', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-500' },
  };
  return map[level] || map.safe;
}

function getAlertConfig(severity: 'info' | 'warning' | 'critical') {
  const map = {
    info: { icon: Info, bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
    critical: { icon: ShieldOff, bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-400' },
  };
  return map[severity] || map.info;
}

function DemandBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-foreground">{score}</span>
    </div>
  );
}

export default function TurismoRadarPage() {
  const { store, initialDestinations, initialAlerts } = ((Route.useLoaderData?.() as any) || {});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeId = store?.id || '';

  const [search, setSearch] = useState('');
  const [filterContinent, setFilterContinent] = useState<string>('all');
  const [selectedDest, setSelectedDest] = useState<DestinationIntelligence | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isAddDestOpen, setIsAddDestOpen] = useState(false);
  const [isAddAlertOpen, setIsAddAlertOpen] = useState(false);

  // Form State Novo Destino
  const [formDestination, setFormDestination] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('BR');
  const [formContinent, setFormContinent] = useState('América do Sul');
  const [formDemandScore, setFormDemandScore] = useState(75);
  const [formTrend, setFormTrend] = useState<DestinationTrend>('rising');
  const [formSafetyLevel, setFormSafetyLevel] = useState<SafetyLevel>('safe');
  const [formCurrencyCode, setFormCurrencyCode] = useState('BRL');
  const [formAvgPackageBrl, setFormAvgPackageBrl] = useState('4500');
  const [formAvgDailyRateBrl, setFormAvgDailyRateBrl] = useState('400');
  const [formPeakSeason, setFormPeakSeason] = useState('Dezembro a Março');
  const [formAvgTemp, setFormAvgTemp] = useState('26');
  const [formTags, setFormTags] = useState('praia, família, natureza');
  const [formHighlights, setFormHighlights] = useState('Passeios turísticos, Centro Histórico, Gastronomia');
  const [formIsVisaRequired, setFormIsVisaRequired] = useState(false);

  // Form State Novo Alerta
  const [alertDestName, setAlertDestName] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [alertCategory, setAlertCategory] = useState<'health' | 'security' | 'weather' | 'operational' | 'visa' | 'currency'>('operational');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const destinationsData: DestinationIntelligence[] = initialDestinations || [];
  const alertsData: TravelAlert[] = initialAlerts || [];

  // Queries Reais
  const { data: destinations = destinationsData, refetch: refetchDests } = useQuery<DestinationIntelligence[]>({
    queryKey: ['destination-intelligence', storeId],
    queryFn: () => listDestinationIntelligence({ data: { store_id: storeId } }),
    enabled: Boolean(storeId),
    initialData: destinationsData,
  });

  const { data: alerts = alertsData, refetch: refetchAlerts } = useQuery<TravelAlert[]>({
    queryKey: ['travel-alerts', storeId],
    queryFn: () => listTravelAlerts({ data: { store_id: storeId } }),
    enabled: Boolean(storeId),
    initialData: alertsData,
  });

  // Mutations
  const createDestMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error('Loja não identificada');
      return upsertDestinationIntelligence({
        data: {
          destination: {
            store_id: storeId,
            destination: formDestination.trim(),
            country_code: formCountryCode.toUpperCase(),
            continent: formContinent,
            demand_score: Number(formDemandScore) || 50,
            trend: formTrend,
            safety_level: formSafetyLevel,
            currency_code: formCurrencyCode.toUpperCase(),
            avg_package_brl: Number(formAvgPackageBrl) || null,
            avg_daily_rate_brl: Number(formAvgDailyRateBrl) || null,
            peak_season: formPeakSeason.trim() || null,
            avg_temp_celsius: Number(formAvgTemp) || null,
            is_visa_required: formIsVisaRequired,
            tags: formTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
            highlights: formHighlights.split(',').map((h) => h.trim()).filter(Boolean),
          },
        },
      });
    },
    onSuccess: () => {
      toast.success('Destino adicionado com sucesso ao Radar de Inteligência!');
      setIsAddDestOpen(false);
      refetchDests();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao cadastrar destino.'),
  });

  const createAlertMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error('Loja não identificada');
      return createTravelAlert({
        data: {
          alert: {
            store_id: storeId,
            destination: alertDestName.trim(),
            severity: alertSeverity,
            category: alertCategory,
            title: alertTitle.trim(),
            description: alertDescription.trim(),
          },
        },
      });
    },
    onSuccess: () => {
      toast.success('Alerta operacional registrado com sucesso!');
      setIsAddAlertOpen(false);
      refetchAlerts();
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao registrar alerta.'),
  });

  const handleSeedCanonical = async () => {
    if (!storeId) return;
    try {
      const canonicalSeeds = [
        { destination: 'Gramado & Serra Gaúcha', country_code: 'BR', continent: 'América do Sul', demand_score: 94, trend: 'rising' as const, safety_level: 'safe' as const, currency_code: 'BRL', avg_package_brl: 3800, avg_daily_rate_brl: 550, peak_season: 'Junho a Agosto e Natal Luz', avg_temp_celsius: 16, tags: ['serra', 'romântico', 'gastronomia', 'inverno'], highlights: ['Lago Negro', 'Snowland', 'Rua Coberta', 'Mini Mundo'] },
        { destination: 'Maceió & Maragogi, AL', country_code: 'BR', continent: 'América do Sul', demand_score: 92, trend: 'rising' as const, safety_level: 'safe' as const, currency_code: 'BRL', avg_package_brl: 4200, avg_daily_rate_brl: 480, peak_season: 'Novembro a Março', avg_temp_celsius: 28, tags: ['praia', 'piscinas naturais', 'família'], highlights: ['Galés de Maragogi', 'Praia do Francês', 'Praia do Gunga'] },
        { destination: 'Orlando & Miami, EUA', country_code: 'US', continent: 'América do Norte', demand_score: 89, trend: 'stable' as const, safety_level: 'safe' as const, currency_code: 'USD', avg_package_brl: 9500, avg_daily_rate_brl: 850, peak_season: 'Outubro a Março', avg_temp_celsius: 26, is_visa_required: true, tags: ['parques', 'compras', 'família'], highlights: ['Universal Studios', 'Magic Kingdom', 'Outlet Premium'] },
      ];

      for (const item of canonicalSeeds) {
        await upsertDestinationIntelligence({
          data: {
            destination: {
              store_id: storeId,
              ...item,
            },
          },
        });
      }
      toast.success('Base canônica de destinos semeada com sucesso!');
      refetchDests();
    } catch (err: any) {
      toast.error('Erro ao semear destinos: ' + err?.message);
    }
  };

  const continents = useMemo(() => {
    const all = Array.from(new Set(destinations.map((d: DestinationIntelligence) => d.continent).filter(Boolean)));
    return ['all', ...all];
  }, [destinations]);

  const filtered = useMemo(() => {
    return destinations.filter((d: DestinationIntelligence) => {
      const matchSearch =
        d.destination.toLowerCase().includes(search.toLowerCase()) ||
        (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())));
      const matchContinent = filterContinent === 'all' || d.continent === filterContinent;
      return matchSearch && matchContinent;
    });
  }, [destinations, search, filterContinent]);

  const topAlerts = alerts.filter((a: TravelAlert) => a.is_active).slice(0, 5);

  const dashboardMetrics: MetricCardItem[] = useMemo(
    () => [
      {
        title: 'Destinos no Radar',
        value: destinations.length,
        description: 'Locais monitorados',
        icon: MapPin,
        color: 'blue',
      },
      {
        title: 'Destinos em Alta',
        value: destinations.filter((d: DestinationIntelligence) => d.trend === 'rising').length,
        description: 'Alta procura recente',
        icon: TrendingUp,
        color: 'emerald',
      },
      {
        title: 'Alertas Ativos',
        value: topAlerts.length,
        description: 'Operação e clima',
        icon: AlertTriangle,
        color: 'amber',
      },
      {
        title: 'Exigem Visto',
        value: destinations.filter((d: DestinationIntelligence) => d.is_visa_required).length,
        description: 'Suporte consular',
        icon: Shield,
        color: 'rose',
      },
    ],
    [destinations, topAlerts]
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── Toolbar Canônica de 2 Tiers (Apple HIG & Sem Colisões) ── */}
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: 'all', label: 'Todos os Continentes', icon: Globe, count: destinations.length },
          ...continents
            .filter((c) => c !== 'all')
            .map((c) => ({
              id: String(c),
              label: String(c),
              icon: MapPin,
              count: destinations.filter((d: DestinationIntelligence) => d.continent === c).length,
            })),
        ]}
        activeTab={filterContinent}
        onTabChange={setFilterContinent}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar destino, clima, praia, família, compras..."
        onMetricsClick={() => setIsMetricsOpen(true)}
        metricsBadge={destinations.length > 0 ? `${destinations.length} Monitorados` : undefined}
        secondaryAction={{
          label: '+ Registrar Alerta',
          icon: AlertTriangle,
          onClick: () => setIsAddAlertOpen(true),
          variant: 'outline',
        }}
        primaryAction={{
          label: 'Adicionar Destino ao Radar',
          icon: Plus,
          onClick: () => setIsAddDestOpen(true),
        }}
      />

      <WorkspaceDashboardSheet
        title="Telemetria de Inteligência de Mercado Turístico"
        open={isMetricsOpen}
        onOpenChange={setIsMetricsOpen}
        items={dashboardMetrics}
      />

      {/* ── Alertas Operacionais Ativos ── */}
      {topAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Alertas Operacionais & Câmbio em Tempo Real
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddAlertOpen(true)}
              className="text-xs text-primary h-10 sm:h-7 px-3 gap-1 rounded-xl cursor-pointer"
            >
              <Plus className="size-3.5" /> Adicionar Alerta
            </Button>
          </div>
          <div className="space-y-2">
            {topAlerts.map((alert: TravelAlert) => {
              const cfg = getAlertConfig(alert.severity);
              return (
                <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.bg}`}>
                  <div className={`size-2 rounded-full mt-1.5 shrink-0 ${cfg.dot} animate-pulse`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>
                        {alert.destination}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0.5 font-bold">
                        {alert.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-foreground mt-0.5">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Grid de Cards de Destino ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center bg-card/40 space-y-4">
          <Globe className="size-12 mx-auto text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Nenhum destino monitorado neste filtro</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Você pode cadastrar novos destinos sob demanda ou carregar a base canônica recomendada.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button
              variant="outline"
              size="default"
              onClick={handleSeedCanonical}
              className="h-11 sm:h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <TrendingUp className="size-3.5 text-amber-500" />
              <span>Semear Destinos Recomendados</span>
            </Button>
            <Button
              size="default"
              onClick={() => setIsAddDestOpen(true)}
              className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Novo Destino</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((dest: DestinationIntelligence) => {
            const trend = getTrendConfig(dest.trend);
            const safety = getSafetyConfig(dest.safety_level);
            const TrendIcon = trend.icon;
            const SafetyIcon = safety.icon;
            const isSelected = selectedDest?.id === dest.id;

            return (
              <div
                key={dest.id}
                onClick={() => setSelectedDest(isSelected ? null : dest)}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-2xs ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md'
                    : 'border-border/70 bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">{dest.continent}</span>
                      {dest.is_featured && <Star className="size-3 text-amber-400 fill-amber-400" />}
                      {dest.is_visa_required && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold">
                          VISTO
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base leading-tight truncate">
                      {dest.destination}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Melhor época: {dest.peak_season || 'Ano todo'}
                    </p>
                  </div>

                  <div className={`shrink-0 p-2 rounded-xl border text-xs font-bold flex items-center gap-1 ${trend.bg} ${trend.color}`}>
                    <TrendIcon className="size-3.5" />
                    <span className="hidden sm:inline">{trend.label}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Índice de Demanda
                    </span>
                  </div>
                  <DemandBar score={dest.demand_score} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center p-2 rounded-xl bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">Pacote Médio</p>
                    <p className="text-xs font-black text-foreground mt-0.5">
                      {dest.avg_package_brl ? `R$ ${(dest.avg_package_brl / 1000).toFixed(1)}k` : '—'}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">Diária Média</p>
                    <p className="text-xs font-black text-foreground mt-0.5">
                      {dest.avg_daily_rate_brl ? `R$ ${dest.avg_daily_rate_brl}` : '—'}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">Moeda / Câmbio</p>
                    <p className="text-xs font-black text-foreground mt-0.5 font-mono">
                      {dest.currency_code || 'BRL'}
                    </p>
                  </div>
                </div>

                {Array.isArray(dest.tags) && dest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dest.tags.slice(0, 4).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground capitalize border border-border/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <span className={`flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border ${safety.bg}`}>
                    <SafetyIcon className="size-3" />
                    {safety.label}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Thermometer className="size-3.5" />
                    <span className="text-xs font-medium">
                      {dest.avg_temp_celsius ? `${dest.avg_temp_celsius}°C` : '—'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-in fade-in duration-200">
                    {Array.isArray(dest.highlights) && dest.highlights.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                          <Zap className="size-3.5 text-amber-500" /> Destaques & Passeios
                        </h4>
                        <ul className="space-y-1">
                          {dest.highlights.map((h: string) => (
                            <li key={h} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ChevronRight className="size-3 shrink-0 text-primary" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: '/workspace/turismo/destinos' });
                        }}
                        className="flex-1 rounded-xl text-xs font-semibold h-11 sm:h-9 cursor-pointer"
                      >
                        <Eye className="size-3.5 mr-1" />
                        CMS do Destino
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({
                            to: '/workspace/turismo/cotacoes',
                          });
                        }}
                        className="flex-1 rounded-xl text-xs font-bold h-11 sm:h-9 bg-primary text-primary-foreground cursor-pointer shadow-2xs"
                      >
                        <Plane className="size-3.5 mr-1" />
                        Criar Cotação
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sheet Lateral: Adicionar Destino ao Radar (70% de Largura no Desktop) ── */}
      <Sheet open={isAddDestOpen} onOpenChange={setIsAddDestOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col bg-background border-l border-border overflow-hidden"
        >
          <SheetHeader className="p-6 pb-4 border-b border-border/70 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
                Inteligência de Mercado
              </Badge>
            </div>
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              <span>Adicionar Destino ao Radar Turístico</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Cadastre indicadores reais de demanda, sazonalidade e perfil orçamentário.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Destino *</Label>
                <Input
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  placeholder="Ex: Porto de Galinhas, PE ou Roma, Itália"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Continente</Label>
                <Select value={formContinent} onValueChange={setFormContinent}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="América do Sul">América do Sul</SelectItem>
                    <SelectItem value="América do Norte">América do Norte</SelectItem>
                    <SelectItem value="América Central">América Central</SelectItem>
                    <SelectItem value="Europa">Europa</SelectItem>
                    <SelectItem value="Ásia">Ásia</SelectItem>
                    <SelectItem value="África">África</SelectItem>
                    <SelectItem value="Oceania">Oceania</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código País (ISO 2)</Label>
                <Input
                  value={formCountryCode}
                  onChange={(e) => setFormCountryCode(e.target.value)}
                  placeholder="BR, US, PT, AR..."
                  maxLength={2}
                  className="h-10 rounded-xl uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tendência de Procura</Label>
                <Select value={formTrend} onValueChange={(v) => setFormTrend(v as DestinationTrend)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="rising">Alta Demanda (Subindo)</SelectItem>
                    <SelectItem value="stable">Estável</SelectItem>
                    <SelectItem value="falling">Queda / Baixa Temporada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Índice de Demanda (0 a 100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formDemandScore}
                  onChange={(e) => setFormDemandScore(Number(e.target.value))}
                  className="h-10 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nível de Segurança</Label>
                <Select value={formSafetyLevel} onValueChange={(v) => setFormSafetyLevel(v as SafetyLevel)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="safe">Seguro</SelectItem>
                    <SelectItem value="moderate">Atenção Moderada</SelectItem>
                    <SelectItem value="caution">Cautela Recomendada</SelectItem>
                    <SelectItem value="warning">Alerta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pacote Médio Sugerido (R$)</Label>
                <Input
                  value={formAvgPackageBrl}
                  onChange={(e) => setFormAvgPackageBrl(e.target.value)}
                  placeholder="Ex: 4500"
                  className="h-10 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Diária Média Hotel (R$)</Label>
                <Input
                  value={formAvgDailyRateBrl}
                  onChange={(e) => setFormAvgDailyRateBrl(e.target.value)}
                  placeholder="Ex: 450"
                  className="h-10 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Melhor Época / Sazonalidade</Label>
                <Input
                  value={formPeakSeason}
                  onChange={(e) => setFormPeakSeason(e.target.value)}
                  placeholder="Ex: Outubro a Março"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Temperatura Média (°C)</Label>
                <Input
                  type="number"
                  value={formAvgTemp}
                  onChange={(e) => setFormAvgTemp(e.target.value)}
                  placeholder="Ex: 27"
                  className="h-10 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tags & Perfis (separados por vírgula)</Label>
              <Input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="Ex: praia, família, compras, luxo, lua de mel"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Destaques e Atrativos Principais</Label>
              <Textarea
                value={formHighlights}
                onChange={(e) => setFormHighlights(e.target.value)}
                placeholder="Ex: Centro histórico, Piscinas naturais, Museus..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="visa-checkbox"
                checked={formIsVisaRequired}
                onChange={(e) => setFormIsVisaRequired(e.target.checked)}
                className="size-4 rounded"
              />
              <Label htmlFor="visa-checkbox" className="text-xs font-semibold cursor-pointer">
                Exige visto consular para brasileiros
              </Label>
            </div>
          </div>

          <SheetFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsAddDestOpen(false)} className="h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={() => createDestMutation.mutate()}
              disabled={createDestMutation.isPending || !formDestination.trim()}
              className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              {createDestMutation.isPending ? 'Salvando...' : 'Salvar no Radar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet Lateral: Registrar Alerta de Viagem (70% de Largura no Desktop) ── */}
      <Sheet open={isAddAlertOpen} onOpenChange={setIsAddAlertOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col bg-background border-l border-border overflow-hidden"
        >
          <SheetHeader className="p-6 pb-4 border-b border-border/70 bg-muted/20 shrink-0">
            <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              <span>Registrar Alerta Operacional ou de Câmbio</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Comunique aos consultores avisos meteorológicos, greves, exigências sanitárias ou taxas.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Destino Afetado *</Label>
              <Input
                value={alertDestName}
                onChange={(e) => setAlertDestName(e.target.value)}
                placeholder="Ex: Fernando de Noronha, BR ou Paris, França"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gravidade</Label>
                <Select value={alertSeverity} onValueChange={(v: any) => setAlertSeverity(v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="info">Informativo</SelectItem>
                    <SelectItem value="warning">Atenção / Moderado</SelectItem>
                    <SelectItem value="critical">Crítico / Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria</Label>
                <Select value={alertCategory} onValueChange={(v: any) => setAlertCategory(v)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="operational">Operacional / Taxas</SelectItem>
                    <SelectItem value="currency">Câmbio / Economia</SelectItem>
                    <SelectItem value="weather">Clima / Meteorologia</SelectItem>
                    <SelectItem value="security">Segurança</SelectItem>
                    <SelectItem value="visa">Visto / Documentação</SelectItem>
                    <SelectItem value="health">Saúde / Vacinas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Alerta *</Label>
              <Input
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="Ex: TPA Reajustada para 2026 / Dólar em Alta"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instrução / Detalhes para a Equipe *</Label>
              <Textarea
                value={alertDescription}
                onChange={(e) => setAlertDescription(e.target.value)}
                placeholder="Descreva a orientação aos consultores para aviso aos passageiros..."
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </div>

          <SheetFooter className="p-4 border-t border-border bg-card/60 flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsAddAlertOpen(false)} className="h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={() => createAlertMutation.mutate()}
              disabled={createAlertMutation.isPending || !alertDestName.trim() || !alertTitle.trim()}
              className="h-11 sm:h-9 px-5 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              {createAlertMutation.isPending ? 'Salvando...' : 'Publicar Alerta'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}