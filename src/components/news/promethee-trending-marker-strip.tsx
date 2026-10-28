import React from "react";
import { Flame, Hash, Sparkles, TrendingUp } from "lucide-react";

export interface TrendingTopicItem {
  id: string;
  tag: string;
  label: string;
  context: string;
  readsCountLabel: string;
  category: string;
}

export const CANONICAL_TRENDING_TOPICS: TrendingTopicItem[] = [
  {
    id: "topic-1",
    tag: "ParqueTecnológico",
    label: "#ParqueTecnológico",
    context: "Inovação Regional & IA",
    readsCountLabel: "14,2k leituras",
    category: "Tecnologia",
  },
  {
    id: "topic-2",
    tag: "EconomiaRegional",
    label: "#EconomiaRegional",
    context: "Indústria, Agro & Empregos",
    readsCountLabel: "9,8k leituras",
    category: "Economia",
  },
  {
    id: "topic-3",
    tag: "TurismoLocal",
    label: "#TurismoLocal",
    context: "Gastronomia & Roteiros",
    readsCountLabel: "8,5k leituras",
    category: "Turismo",
  },
  {
    id: "topic-4",
    tag: "SegurançaIntegrada",
    label: "#SegurançaIntegrada",
    context: "Monitoramento Urbano & CCO",
    readsCountLabel: "12,1k leituras",
    category: "Segurança",
  },
  {
    id: "topic-5",
    tag: "InfraestruturaRegional",
    label: "#InfraestruturaRegional",
    context: "Obras & Desenvolvimento",
    readsCountLabel: "7,6k leituras",
    category: "Cidades",
  },
  {
    id: "topic-6",
    tag: "MobilidadeUrbana",
    label: "#MobilidadeUrbana",
    context: "Trânsito, Rodovias & Acessos",
    readsCountLabel: "6,9k leituras",
    category: "Cidades",
  },
];

export const CANONICAL_VALE_TRENDING_TOPICS = CANONICAL_TRENDING_TOPICS;

export interface PrometheeTrendingMarkerStripProps {
  topics?: TrendingTopicItem[];
  onSelectTopic?: (topic: TrendingTopicItem) => void;
  className?: string;
  title?: string;
}

export function PrometheeTrendingMarkerStrip({
  topics = CANONICAL_TRENDING_TOPICS,
  onSelectTopic,
  className = "",
  title = "Tópicos do Momento",
}: PrometheeTrendingMarkerStripProps) {
  return (
    <aside
      aria-label={title}
      className={`rounded-3xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {title}
          </h3>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          Em alta hoje
        </span>
      </div>

      {/* Régua de Tópicos com Efeito Marca-Texto (Threads Style) */}
      <div className="waesy-tab-strip flex flex-nowrap items-stretch gap-3 pb-2 pt-1 scroll-smooth snap-x snap-mandatory">
        {topics.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTopic?.(item)}
            className="w-64 sm:w-72 shrink-0 snap-start rounded-2xl border border-border/70 bg-card hover:bg-muted/40 p-3 text-left flex flex-col justify-between gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {index + 1} · {item.category}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {item.readsCountLabel}
              </span>
            </div>

            {/* Destaque com efeito marca-texto translúcido */}
            <div>
              <span className="inline-block rounded-md bg-amber-400/20 text-foreground font-black text-sm tracking-tight px-2 py-1">
                {item.label}
              </span>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {item.context}
              </p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
