import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageCircle,
  TrendingDown,
  Building2,
  DollarSign,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import {
  listSellerPortfolioRotaryQueueFn,
  RotaryQueueCustomerDTO,
  RotarySlaStatus,
} from "@/services/b2b-portfolio-routes.functions";

const WEEKDAYS = [
  { id: 1, label: "Segunda" },
  { id: 2, label: "Terça" },
  { id: 3, label: "Quarta" },
  { id: 4, label: "Quinta" },
  { id: 5, label: "Sexta" },
] as const;

export function RotaryQueueView() {
  const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [selectedWeekday, setSelectedWeekday] = useState<number>(() =>
    todayWeekday >= 1 && todayWeekday <= 5 ? todayWeekday : 1
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["seller-rotary-queue", selectedWeekday],
    queryFn: () =>
      listSellerPortfolioRotaryQueueFn({
        data: { targetWeekday: selectedWeekday },
      }),
  });

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
        <AlertTriangle className="size-6 text-destructive mx-auto" />
        <h3 className="text-sm font-bold text-foreground">Falha ao carregar carteira rotativa</h3>
        <p className="text-xs text-muted-foreground">Ocorreu um erro ao consultar os clientes desta rota.</p>
      </div>
    );
  }

  const allCustomers = data?.all || [];
  const dayCustomers = data?.todayQueue || [];
  const urgentCustomers = data?.urgentQueue || [];

  // Contadores de SLA para o dia selecionado
  const onTrackCount = dayCustomers.filter((c) => c.slaStatus === "on_track").length;
  const attentionCount = dayCustomers.filter((c) => c.slaStatus === "attention").length;
  const riskCount = dayCustomers.filter((c) => c.slaStatus === "risk").length;
  const churnCount = dayCustomers.filter((c) => c.slaStatus === "churn_loss").length;

  return (
    <div className="space-y-6">
      {/* ── 1. Top Bar com Seletor de Dia da Semana ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-2 px-3 py-1 text-xs font-bold uppercase">
              <Calendar className="size-3.5" />
              Fila Operacional Dia a Dia
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs font-semibold text-primary">
              <Clock className="size-3.5" />
              Ciclo de Recompra
            </Badge>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground mt-1">
            Carteira Rotativa de Clientes
          </h2>
          <p className="text-xs text-muted-foreground">
            Clientes organizados por dia de atenção semanal e risco dinâmico de churn.
          </p>
        </div>

        {/* Seletor de Dias (Padrão Touch 44px) */}
        <div className="carousel flex items-center gap-2 overflow-x-auto pb-1">
          {WEEKDAYS.map((wd) => {
            const isSelected = selectedWeekday === wd.id;
            const isToday = todayWeekday === wd.id;
            return (
              <button
                key={wd.id}
                type="button"
                onClick={() => setSelectedWeekday(wd.id)}
                className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                <span>{wd.label}</span>
                {isToday ? (
                  <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Grid de Saúde da Fila (SLA B2B) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase text-muted-foreground">No Prazo</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground">{onTrackCount}</p>
          <p className="text-2xs text-muted-foreground">Compras regulares</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase text-muted-foreground">Atenção</span>
            <Clock className="size-4 text-warning" />
          </div>
          <p className="text-xl font-bold font-mono text-warning">{attentionCount}</p>
          <p className="text-2xs text-muted-foreground">Reposição próxima</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase text-muted-foreground">Em Risco</span>
            <AlertTriangle className="size-4 text-destructive" />
          </div>
          <p className="text-xl font-bold font-mono text-destructive">{riskCount}</p>
          <p className="text-2xs text-muted-foreground">Prazo expirado</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase text-muted-foreground">Risco Churn</span>
            <TrendingDown className="size-4 text-destructive" />
          </div>
          <p className="text-xl font-bold font-mono text-destructive">{churnCount}</p>
          <p className="text-2xs text-muted-foreground">&gt; 150% do ciclo médio</p>
        </div>
      </div>

      {/* ── 3. Listagem de Clientes do Dia ── */}
      {dayCustomers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <Calendar className="size-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">
            Nenhum cliente agendado para este dia
          </h3>
          <p className="text-xs text-muted-foreground">
            Distribua clientes na carteira para organizar a rotina diária de contato e visitas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayCustomers.map((cust) => {
            const phoneDigits = cust.customerPhone ? cust.customerPhone.replace(/\D/g, "") : "";

            return (
              <div
                key={cust.portfolioId}
                className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        cust.slaStatus === "on_track"
                          ? "default"
                          : cust.slaStatus === "attention"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-xs"
                    >
                      {cust.slaStatus === "on_track"
                        ? "No Prazo"
                        : cust.slaStatus === "attention"
                        ? "Atenção"
                        : cust.slaStatus === "risk"
                        ? "Em Risco"
                        : "Churn"}
                    </Badge>
                    <span className="text-2xs font-mono text-muted-foreground">
                      Ciclo: {cust.avgRepurchaseDays}d
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground truncate">{cust.customerName}</h3>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {cust.priceTableName ? (
                      <p className="flex items-center gap-2 truncate">
                        <Building2 className="size-3.5 text-primary shrink-0" />
                        Tabela: <span className="font-semibold text-foreground">{cust.priceTableName}</span>
                      </p>
                    ) : null}
                    <p className="flex items-center gap-2">
                      <Clock className="size-3.5 text-muted-foreground shrink-0" />
                      Sem comprar há{" "}
                      <span className="font-bold text-foreground font-mono">
                        {cust.daysSinceLastOrder === 999 ? "nunca comprou" : `${cust.daysSinceLastOrder} dias`}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Ações Táteis do Cliente */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  {phoneDigits ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        trackAndOpenWhatsApp(
                          phoneDigits,
                          `Olá ${cust.customerName}! Tudo bem? Estou passando para verificar a reposição do seu estoque nesta semana.`
                        )
                      }
                      className="h-11 min-h-11 px-3 text-xs font-bold gap-2 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageCircle className="size-4" />
                      <span>WhatsApp</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
