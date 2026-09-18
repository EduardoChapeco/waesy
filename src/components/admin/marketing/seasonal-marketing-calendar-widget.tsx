import { useState, useEffect } from "react";
import {
  Calendar,
  Sparkles,
  ChevronRight,
  Clock,
  TrendingUp,
  Tag,
  Zap,
  MapPin,
  ArrowUpRight,
  Gift,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCentralMarketingCalendar } from "@/services/central-knowledge.functions";
import type { HolidayDefinition } from "@/lib/data/holidays-calendar-catalog";
import { Link } from "@tanstack/react-router";

interface SeasonalMarketingCalendarWidgetProps {
  cityName?: string;
  stateCode?: string;
  sector?: string;
}

export function SeasonalMarketingCalendarWidget({
  cityName,
  stateCode,
  sector,
}: SeasonalMarketingCalendarWidgetProps) {
  const [events, setEvents] = useState<Array<HolidayDefinition & { date: string; days_until: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getCentralMarketingCalendar({
      data: {
        daysAhead: 60,
        sector,
        stateCode,
        cityName,
      },
    })
      .then((res) => {
        if (isMounted) {
          setEvents(res.marketing_events || []);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar calendário de marketing:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cityName, stateCode, sector]);

  if (isLoading) {
    return (
      <Card className="p-4 border-border/40 bg-card/60 rounded-2xl animate-pulse space-y-3 shadow-none">
        <div className="h-4 bg-muted/40 rounded w-1/3" />
        <div className="h-16 bg-muted/20 rounded-xl" />
      </Card>
    );
  }

  if (events.length === 0) {
    return null;
  }

  const primaryEvent = events[0];
  const upcomingList = events.slice(1, 4);

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "extremo":
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]">Impacto Extremo 🔥</Badge>;
      case "alto":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">Pico Comercial 🚀</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Oportunidade</Badge>;
    }
  };

  return (
    <Card className="p-4 sm:p-5 border-border/50 bg-card rounded-2xl shadow-sm space-y-4">
      {/* CABEÇALHO DO WIDGET */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Calendar className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Calendário Editorial & Vendas Sazonais</span>
              <Sparkles className="size-3 text-amber-500" />
            </h3>
            <p className="text-xs text-foreground font-medium">
              Próximas datas comemorativas e picos de demanda
            </p>
          </div>
        </div>
        <Link
          to="/workspace/marketing/promocoes"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Criar Campanha</span>
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {/* EVENTO EM DESTAQUE (PRÓXIMA JANELA) */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {primaryEvent.days_until === 0 ? "É HOJE!" : `Em ${primaryEvent.days_until} dias`}
            </span>
            <span className="text-muted-foreground text-xs">•</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {primaryEvent.date.split("-").reverse().join("/")}
            </span>
            {getImpactBadge(primaryEvent.commercial_impact)}
            {primaryEvent.city_name && (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4">
                <MapPin className="size-2.5" />
                <span>{primaryEvent.city_name}</span>
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-bold text-foreground">
            {primaryEvent.name}
          </h4>
          {primaryEvent.marketing_theme && (
            <p className="text-xs text-muted-foreground">
              Tema sugerido: <strong className="text-foreground">{primaryEvent.marketing_theme}</strong>
            </p>
          )}
          {primaryEvent.suggested_promotional_actions && primaryEvent.suggested_promotional_actions.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {primaryEvent.suggested_promotional_actions.map((act, i) => (
                <span key={i} className="text-[10px] bg-background border border-border/40 text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                  💡 {act}
                </span>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/workspace/marketing/promocoes"
          className="shrink-0"
        >
          <Button size="sm" className="rounded-xl text-xs font-bold h-8 gap-1.5 bg-primary text-primary-foreground">
            <Gift className="size-3.5" />
            <span>Ativar Oferta</span>
          </Button>
        </Link>
      </div>

      {/* PRÓXIMAS DATAS NO RADAR */}
      {upcomingList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {upcomingList.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl border border-border/30 bg-muted/20 flex flex-col justify-between gap-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground truncate">{item.name}</span>
                <span className="text-[10px] font-mono font-medium text-muted-foreground shrink-0">
                  em {item.days_until}d
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{item.date.split("-").reverse().slice(0, 2).join("/")}</span>
                {item.commercial_impact === "extremo" ? (
                  <span className="text-rose-500 font-bold text-[10px]">Pico Máximo</span>
                ) : (
                  <span className="text-[10px]">Comercial</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
