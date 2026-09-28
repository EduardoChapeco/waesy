/**
 * store-personas-matrix.tsx — Matriz de Personas & Telemetria do Visitante (Transplante Purificado do SimLab)
 *
 * Arquitetura de Elite (50-Prompt Golden Codex):
 * 1. Bifurcação Perfeita: WhatsApp List no Mobile (<640px) + Bento Grid no Desktop (>1024px).
 * 2. Bottom Sheet no Mobile (100dvh) para inspeção profunda de Persona e Telemetria.
 * 3. Silêncio Visual: zero sparkles, títulos atômicos, tipografia limpa.
 * 4. Dados 100% reais do banco (ai_persona_profiles + search_history).
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Search,
  TrendingUp,
  Tag,
  DollarSign,
  Clock,
  Eye,
  Activity,
  Layers,
  ChevronRight,
  Filter,
  AlertCircle,
  X,
} from "lucide-react";
import { listStorePersonasOverview } from "@/services/ai-persona.functions";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const INTENT_MAP: Record<string, { label: string; color: string; desc: string }> = {
  ready_to_buy: {
    label: "Pronto para Comprar",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    desc: "Acessou checkout, adicionou itens ao carrinho ou contatou via WhatsApp",
  },
  warm: {
    label: "Interesse Ativo",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    desc: "Múltiplas visualizações com tempo de tela superior a 20s",
  },
  bargain_hunter: {
    label: "Buscador de Desconto",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    desc: "Pesquisou promoções, desapegos, cupons ou termos de preço baixo",
  },
  curious: {
    label: "Explorador",
    color: "bg-muted text-muted-foreground border-border/60",
    desc: "Navegação exploratória superficial",
  },
  vip: {
    label: "Perfil Premium",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    desc: "Ticket médio alto com intenção de compra imediata",
  },
};

export function StorePersonasMatrix() {
  const [selectedIntent, setSelectedIntent] = useState<
    "all" | "curious" | "warm" | "ready_to_buy" | "bargain_hunter" | "vip"
  >("all");
  const [activePersona, setActivePersona] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["store-personas-overview", selectedIntent],
    queryFn: () => listStorePersonasOverview({ data: { intent: selectedIntent, limit: 30 } }),
  });

  const personas = data?.personas || [];
  const topSearches = data?.topSearches || [];
  const intentCounts = data?.intentDistribution || {
    ready_to_buy: 0,
    warm: 0,
    curious: 0,
    bargain_hunter: 0,
    vip: 0,
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Painel de Distribuição de Intenção (Bento Row) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        {(Object.keys(INTENT_MAP) as Array<keyof typeof INTENT_MAP>).map((intentKey) => {
          const cfg = INTENT_MAP[intentKey];
          const count = intentCounts[intentKey] || 0;
          const isSelected = selectedIntent === intentKey;

          return (
            <button
              key={intentKey}
              type="button"
              onClick={() => setSelectedIntent(isSelected ? "all" : intentKey)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/60 bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground truncate">
                  {cfg.label}
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-foreground">
                  {count}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                {cfg.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── 2. Grade de Buscas Recentes & Demandas Não Atendidas (Zero Results) ── */}
      {topSearches.length > 0 && (
        <Card className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Tendências de Busca
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {topSearches.length} termos rastreados
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {topSearches.map((item, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                  item.zeroResults
                    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    : "bg-muted/50 border-border/50 text-foreground"
                }`}
                title={item.zeroResults ? "Busca com 0 resultados na loja (demanda não atendida)" : `${item.count} buscas`}
              >
                <span>{item.query}</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono px-1 py-0 h-4 border-border/40"
                >
                  {item.count}x
                </Badge>
                {item.zeroResults && (
                  <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">
                    Sem Estoque
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 3. Lista Bifurcada de Personas Rastradas ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Personas Preditivas
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {personas.length} ativas
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Carregando inteligência de personas...
          </div>
        ) : personas.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-border/60 text-center space-y-1">
            <Brain className="size-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">Nenhuma persona catalogada ainda</p>
            <p className="text-[11px] text-muted-foreground">
              Conforme visitantes pesquisam e interagem no catálogo, a IA construirá perfis de compra preditivos.
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile View: WhatsApp List Edge-to-Edge (<640px) ── */}
            <div className="block sm:hidden border-y border-border/40 divide-y divide-border/40 -mx-4 bg-card">
              {personas.map((p) => {
                const intentInfo = INTENT_MAP[p.intent_classification] || INTENT_MAP.curious;
                const topNiche = Array.isArray(p.top_niches) && p.top_niches[0] ? p.top_niches[0].split(":")[0] : "geral";
                const recentQuery = Array.isArray(p.recent_queries) && p.recent_queries[0] ? p.recent_queries[0] : null;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePersona(p)}
                    className="w-full flex items-center justify-between p-3.5 text-left active:bg-muted/40 transition-colors cursor-pointer min-h-[56px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                        <Activity className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {p.persona_code}
                          </p>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border ${intentInfo.color}`}
                          >
                            {intentInfo.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Nicho: <span className="font-semibold text-foreground capitalize">{topNiche}</span>
                          {recentQuery ? ` • "${recentQuery}"` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.avg_ticket_cents > 0 && (
                        <span className="text-xs font-mono font-bold text-foreground">
                          {formatMoney(p.avg_ticket_cents)}
                        </span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground/60" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Desktop View: Bento Grid (>=640px) ── */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {personas.map((p) => {
                const intentInfo = INTENT_MAP[p.intent_classification] || INTENT_MAP.curious;
                const topNiches = Array.isArray(p.top_niches) ? p.top_niches : [];
                const recentQueries = Array.isArray(p.recent_queries) ? p.recent_queries : [];

                return (
                  <Card
                    key={p.id}
                    className="p-4 rounded-2xl border border-border/60 bg-card hover:border-border transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <Activity className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {p.persona_code}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {p.interaction_count} interações
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono capitalize ${intentInfo.color}`}
                        >
                          {intentInfo.label}
                        </Badge>
                      </div>

                      {/* Afinidades e Buscas */}
                      <div className="mt-3 space-y-1.5">
                        {topNiches.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Tag className="size-3 text-primary shrink-0" />
                            <span className="truncate">
                              {topNiches.map((n: string) => n.split(":")[0]).join(", ")}
                            </span>
                          </div>
                        )}
                        {recentQueries.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Search className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate italic">
                              "{recentQueries.slice(0, 2).join('", "')}"
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Ticket Médio</span>
                        <p className="text-xs font-mono font-bold text-foreground">
                          {p.avg_ticket_cents > 0 ? formatMoney(p.avg_ticket_cents) : "Sob consulta"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActivePersona(p)}
                        className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1"
                      >
                        <Eye className="size-3.5" />
                        <span>Inspecionar</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 4. Bottom Sheet de Inspeção Profunda (100dvh no Mobile) ── */}
      <Sheet open={Boolean(activePersona)} onOpenChange={(open) => !open && setActivePersona(null)}>
        <SheetContent side="bottom" className="h-[90dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg mx-auto rounded-t-3xl sm:rounded-2xl p-0 overflow-hidden flex flex-col">
          {activePersona && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-4 sm:p-6 border-b border-border/40 shrink-0 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                      <Brain className="size-4" />
                    </span>
                    <SheetTitle className="text-base font-bold text-foreground">
                      {activePersona.persona_code}
                    </SheetTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono ${INTENT_MAP[activePersona.intent_classification]?.color}`}
                  >
                    {INTENT_MAP[activePersona.intent_classification]?.label}
                  </Badge>
                </div>
                <SheetDescription className="text-xs text-muted-foreground mt-1">
                  Telemetria preditiva do comprador compilada para os agentes de vendas da loja.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Resumo Financeiro */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="text-[10px] text-muted-foreground">Ticket Médio Estimado</span>
                    <p className="text-base font-mono font-bold text-foreground mt-0.5">
                      {activePersona.avg_ticket_cents > 0 ? formatMoney(activePersona.avg_ticket_cents) : "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="text-[10px] text-muted-foreground">Sensibilidade a Preço</span>
                    <p className="text-base font-mono font-bold text-foreground capitalize mt-0.5">
                      {activePersona.price_sensitivity || "balanced"}
                    </p>
                  </div>
                </div>

                {/* Termos de Busca Recentes */}
                {Array.isArray(activePersona.recent_queries) && activePersona.recent_queries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2">
                      Histórico de Pesquisas
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activePersona.recent_queries.map((q: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Afinidades por Categoria */}
                {Array.isArray(activePersona.top_niches) && activePersona.top_niches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2">
                      Afinidades de Nicho
                    </h3>
                    <div className="space-y-1.5">
                      {activePersona.top_niches.map((n: string, i: number) => {
                        const [niche, score] = n.split(":");
                        return (
                          <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-muted/40">
                            <span className="font-semibold capitalize text-foreground">{niche}</span>
                            <span className="font-mono text-muted-foreground">score {score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Contexto Token-Denso Compilado */}
                {activePersona.token_dense_context && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono mb-2">
                      Prompt Injection Context
                    </h3>
                    <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-100 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                      {JSON.stringify(activePersona.token_dense_context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
