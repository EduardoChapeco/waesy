import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStoreSettings } from "@/services/store.functions";
import {
  getStoreBrandDna,
  updateStoreBrandDna,
} from "@/services/market-radar.functions";
import type { BrandDnaProfileDTO } from "@/types/squads-and-onboarding";
import { generateAiSwotAnalysis } from "@/services/canvas-bmc.functions";

export const Route = createFileRoute("/workspace/marketing/swot")({
  head: () => ({ meta: [{ title: "Matriz SWOT Estratégica | Waesy" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const dna = store?.id
        ? await getStoreBrandDna({ data: { storeId: store.id } }).catch(() => null)
        : null;
      return { store, initialDna: dna };
    } catch (err) {
      console.error("[loader:workspace.marketing.swot] Falha ao carregar dados:", err);
      return { store: null, initialDna: null };
    }
  },
  component: SwotMatrixPage,
});

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

const DEFAULT_SWOT: SwotData = {
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
};

type QuadrantKey = keyof SwotData;

interface QuadrantMeta {
  key: QuadrantKey;
  title: string;
  badge: string;
  subtitle: string;
  factorType: "Interno (Controlável)" | "Externo (Mercado)";
  colorClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const QUADRANTS: Record<QuadrantKey, QuadrantMeta> = {
  strengths: {
    key: "strengths",
    title: "Forças",
    badge: "Strengths",
    subtitle: "Diferenciais competitivos, competências centrais e vantagens internas.",
    factorType: "Interno (Controlável)",
    colorClass: "text-emerald-500 bg-emerald-500/10",
    borderClass: "border-emerald-500/30 hover:border-emerald-500/60",
    icon: ShieldCheck,
  },
  weaknesses: {
    key: "weaknesses",
    title: "Fraquezas",
    badge: "Weaknesses",
    subtitle: "Limitações operacionais, gargalos internos e vulnerabilidades.",
    factorType: "Interno (Controlável)",
    colorClass: "text-amber-500 bg-amber-500/10",
    borderClass: "border-amber-500/30 hover:border-amber-500/60",
    icon: AlertTriangle,
  },
  opportunities: {
    key: "opportunities",
    title: "Oportunidades",
    badge: "Opportunities",
    subtitle: "Tendências de consumo, brechas de mercado e expansão regional.",
    factorType: "Externo (Mercado)",
    colorClass: "text-sky-500 bg-sky-500/10",
    borderClass: "border-sky-500/30 hover:border-sky-500/60",
    icon: TrendingUp,
  },
  threats: {
    key: "threats",
    title: "Ameaças",
    badge: "Threats",
    subtitle: "Concorrência predatória, pressão inflacionária e riscos macroeconômicos.",
    factorType: "Externo (Mercado)",
    colorClass: "text-rose-500 bg-rose-500/10",
    borderClass: "border-rose-500/30 hover:border-rose-500/60",
    icon: ShieldAlert,
  },
};

export function SwotMatrixPage() {
  const { store, initialDna } = (Route.useLoaderData() as any) || {};
  const storeId = store?.id || "";

  const [swot, setSwot] = useState<SwotData>(
    initialDna?.swot_analysis || DEFAULT_SWOT
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<QuadrantKey, string>>({
    strengths: "",
    weaknesses: "",
    opportunities: "",
    threats: "",
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (initialDna?.swot_analysis) {
      setSwot(initialDna.swot_analysis);
    }
  }, [initialDna]);

  // ── MANIPULAÇÃO LOCAL DOS QUADRANTES ──────────────────────────────────────
  function handleAddItem(key: QuadrantKey) {
    const text = (newItemText[key] || "").trim();
    if (!text) return;

    setSwot((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), text],
    }));

    setNewItemText((prev) => ({ ...prev, [key]: "" }));
  }

  function handleRemoveItem(key: QuadrantKey, index: number) {
    setSwot((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
  }

  // ── SALVAR SWOT NO BANCO DE DADOS ──────────────────────────────────────────
  async function handleSave() {
    if (!storeId) {
      toast.error("Loja não autenticada.");
      return;
    }

    setIsSaving(true);
    try {
      await updateStoreBrandDna({
        data: {
          storeId,
          swot_analysis: swot,
        },
      });
      setLastSaved(new Date());
      toast.success("Matriz SWOT salva com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar Matriz SWOT.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── GERAR COM INTELIGÊNCIA ARTIFICIAL COGNITIVA ───────────────────────────
  async function handleGenerateAI() {
    if (!storeId) {
      toast.error("Loja não autenticada.");
      return;
    }

    setIsGenerating(true);
    toast.info("Consultor Estratégico IA operando...", {
      description: "Avaliando ecossistema local, forças e vulnerabilidades.",
    });

    try {
      const newSwot = await generateAiSwotAnalysis({
        data: { storeId },
      });

      setSwot(newSwot);
      setLastSaved(new Date());
      toast.success("Matriz SWOT gerada e atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar SWOT com IA.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── RENDERIZADOR DO QUADRANTE ─────────────────────────────────────────────
  function renderQuadrant(quadrantKey: QuadrantKey) {
    const meta = QUADRANTS[quadrantKey];
    const items = swot[quadrantKey] || [];
    const Icon = meta.icon;

    return (
      <div
        className={`flex flex-col rounded-lg border bg-card p-5 transition-colors ${meta.borderClass}`}
      >
        {/* Cabeçalho do Quadrante */}
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  {meta.title}
                </h3>
                <Badge variant="outline" className="text-xs uppercase font-mono">
                  {meta.badge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{meta.factorType}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {items.length}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {meta.subtitle}
        </p>

        {/* Lista de Itens */}
        <div className="flex-1 space-y-2 py-4 overflow-y-auto max-h-96">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <p className="text-xs">Nenhum ponto registrado.</p>
              <p className="text-xs mt-1">Clique em Gerar com IA ou adicione manualmente.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="group relative flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start gap-2 flex-1">
                  <span className="font-mono text-xs text-muted-foreground mt-1">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed text-foreground font-medium">
                    {item}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(quadrantKey, idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                  title="Remover ponto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Campo de Inserção Rápida */}
        <div className="border-t border-border/40 pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddItem(quadrantKey);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={newItemText[quadrantKey] || ""}
              onChange={(e) =>
                setNewItemText((prev) => ({ ...prev, [quadrantKey]: e.target.value }))
              }
              placeholder={`+ Adicionar em ${meta.title}...`}
              className="h-9 text-xs border-border/40 bg-background"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!newItemText[quadrantKey]?.trim()}
              className="h-9 w-9 p-0 flex-shrink-0"
              title="Adicionar"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      {/* ── BARRA SUPERIOR ── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-card/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Planejamento Estratégico
                </span>
                {lastSaved && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Salvo {lastSaved.toLocaleTimeString("pt-BR")}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-1 text-foreground">
                Matriz SWOT Estratégica
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Mapeamento analítico de forças, fraquezas, oportunidades e ameaças da empresa.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="h-11 px-4 rounded-lg text-xs font-medium gap-2"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Analisando Empresa..." : "Gerar com IA"}
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 px-4 rounded-lg text-xs font-medium gap-2"
              >
                <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
                {isSaving ? "Salvando..." : "Salvar Matriz"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID 2X2 DE QUADRANTES ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderQuadrant("strengths")}
          {renderQuadrant("weaknesses")}
          {renderQuadrant("opportunities")}
          {renderQuadrant("threats")}
        </div>
      </div>
    </div>
  );
}
