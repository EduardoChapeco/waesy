import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutGrid,
  Target,
  Zap,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Layers,
  Wrench,
  HeartHandshake,
  Truck,
  Building2,
  DollarSign,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getStoreSettings } from "@/services/store.functions";
import {
  getStoreBmc,
  saveStoreBmc,
  generateAiBmcFromStore,
  type StoreBmcDTO,
  type BmcBlockItem,
} from "@/services/canvas-bmc.functions";

export const Route = createFileRoute("/workspace/marketing/canvas-bmc")({
  head: () => ({ meta: [{ title: "Business Model Canvas | Waesy" }] }),
  loader: async () => {
    try {
      const store = await getStoreSettings().catch(() => null);
      const bmcData = store?.id
        ? await getStoreBmc({ data: { storeId: store.id } }).catch(() => null)
        : null;
      return { store, initialBmc: bmcData?.bmc || null };
    } catch (err) {
      console.error("[loader:workspace.marketing.canvas-bmc] Falha ao carregar dados:", err);
      return { store: null, initialBmc: null };
    }
  },
  component: BusinessModelCanvasPage,
});

const DEFAULT_BMC: StoreBmcDTO = {
  key_partners: [],
  key_activities: [],
  key_resources: [],
  value_propositions: [],
  customer_relationships: [],
  channels: [],
  customer_segments: [],
  cost_structure: [],
  revenue_streams: [],
  confidence: 1.0,
  edited_by_human: false,
};

type BmcKey = keyof Omit<StoreBmcDTO, "generated_by_job_id" | "ai_model" | "confidence" | "edited_by_human">;

interface BlockMeta {
  key: BmcKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCKS_META: Record<BmcKey, BlockMeta> = {
  key_partners: {
    key: "key_partners",
    title: "Parcerias-Chave",
    subtitle: "Quem ajuda a viabilizar o negócio",
    icon: Building2,
  },
  key_activities: {
    key: "key_activities",
    title: "Atividades-Chave",
    subtitle: "Ações essenciais de entrega",
    icon: Wrench,
  },
  key_resources: {
    key: "key_resources",
    title: "Recursos-Chave",
    subtitle: "Ativos vitais (físicos, tech, equipe)",
    icon: Layers,
  },
  value_propositions: {
    key: "value_propositions",
    title: "Propostas de Valor",
    subtitle: "Problemas reais que solucionamos",
    icon: Target,
  },
  customer_relationships: {
    key: "customer_relationships",
    title: "Relacionamento",
    subtitle: "Como interagimos e retemos clientes",
    icon: HeartHandshake,
  },
  channels: {
    key: "channels",
    title: "Canais",
    subtitle: "Pontos de contato e entrega",
    icon: Truck,
  },
  customer_segments: {
    key: "customer_segments",
    title: "Segmentos de Clientes",
    subtitle: "Para quem estamos criando valor",
    icon: Users,
  },
  cost_structure: {
    key: "cost_structure",
    title: "Estrutura de Custos",
    subtitle: "Principais despesas operacionais",
    icon: Receipt,
  },
  revenue_streams: {
    key: "revenue_streams",
    title: "Fontes de Receita",
    subtitle: "Como o negócio monetiza",
    icon: DollarSign,
  },
};

export function BusinessModelCanvasPage() {
  const { store, initialBmc } = (Route.useLoaderData() as any) || {};
  const storeId = store?.id || "";

  const [bmc, setBmc] = useState<StoreBmcDTO>(initialBmc || DEFAULT_BMC);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (initialBmc) {
      setBmc(initialBmc);
    }
  }, [initialBmc]);

  // ── AÇÕES DE MANIPULAÇÃO ──────────────────────────────────────────────────
  function handleAddItem(key: BmcKey) {
    const text = (newItemText[key] || "").trim();
    if (!text) return;

    const newItem: BmcBlockItem = {
      id: `${key}-${Date.now()}`,
      text,
      confidence: 1.0,
    };

    setBmc((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newItem],
      edited_by_human: true,
    }));

    setNewItemText((prev) => ({ ...prev, [key]: "" }));
  }

  function handleRemoveItem(key: BmcKey, itemId: string) {
    setBmc((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.id !== itemId),
      edited_by_human: true,
    }));
  }

  // ── SALVAR BMC NO BANCO DE DADOS ──────────────────────────────────────────
  async function handleSave() {
    if (!storeId) {
      toast.error("Loja não autenticada.");
      return;
    }

    setIsSaving(true);
    try {
      await saveStoreBmc({
        data: {
          storeId,
          bmc,
        },
      });
      setLastSaved(new Date());
      toast.success("Business Model Canvas salvo com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar Canvas.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── GERAR COM INTELIGÊNCIA ARTIFICIAL ─────────────────────────────────────
  async function handleGenerateAI() {
    if (!storeId) {
      toast.error("Loja não autenticada.");
      return;
    }

    setIsGenerating(true);
    toast.info("Estrategista de Negócios IA em operação...", {
      description: "Analisando nicho, catálogo e arquétipo da empresa.",
    });

    try {
      const generated = await generateAiBmcFromStore({
        data: {
          storeId,
        },
      });
      setBmc(generated);
      setLastSaved(new Date());
      toast.success("Business Model Canvas estruturado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar BMC com IA. Verifique as credenciais no cofre.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── RENDERIZADOR DE BLOCO INDIVIDUAL ──────────────────────────────────────
  function renderBlock(key: BmcKey, extraClass = "") {
    const meta = BLOCKS_META[key];
    const items = bmc[key] || [];
    const Icon = meta.icon;

    return (
      <div
        className={`flex flex-col rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border ${extraClass}`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {meta.title}
              </h3>
              <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {items.length}
          </Badge>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 space-y-2 py-3 overflow-y-auto max-h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <p className="text-xs">Nenhum item adicionado.</p>
              <p className="text-xs mt-1">Use a IA ou digite abaixo.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-lg border border-border/40 bg-muted/20 p-3 text-xs transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-relaxed text-foreground font-medium flex-1">
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(key, item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                    title="Remover item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.evidence && (
                  <p className="mt-2 text-xs text-muted-foreground border-t border-border/30 pt-1 italic">
                    Fonte: {item.evidence}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Campo de Inserção Rápida */}
        <div className="border-t border-border/40 pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddItem(key);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={newItemText[key] || ""}
              onChange={(e) =>
                setNewItemText((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder="+ Adicionar item..."
              className="h-8 text-xs border-border/40 bg-background"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!newItemText[key]?.trim()}
              className="h-8 w-8 p-0 flex-shrink-0"
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
      {/* ── BARRA SUPERIOR SILENCIOSA ── */}
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
                {bmc.edited_by_human && (
                  <Badge variant="outline" className="text-xs">
                    Revisado por Humano
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-1 text-foreground">
                Business Model Canvas (BMC)
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Metodologia canônica de 9 blocos para visualização e evolução do modelo de negócio.
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
                <Zap className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Analisando Empresa..." : "Preencher com IA"}
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-11 px-4 rounded-lg text-xs font-medium gap-2"
              >
                <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
                {isSaving ? "Salvando..." : "Salvar Canvas"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID CANÔNICO DE OSTERWALDER (5 COLUNAS SUPERIORES + 2 COLUNAS DE CUSTO/RECEITA) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* PARTE SUPERIOR: 5 COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* COLUNA 1: Parcerias-Chave (Altura dupla) */}
          <div className="md:col-span-1 flex flex-col">
            {renderBlock("key_partners", "h-full min-h-96")}
          </div>

          {/* COLUNA 2: Atividades-Chave (superior) + Recursos-Chave (inferior) */}
          <div className="md:col-span-1 flex flex-col gap-4">
            {renderBlock("key_activities", "flex-1 min-h-56")}
            {renderBlock("key_resources", "flex-1 min-h-56")}
          </div>

          {/* COLUNA 3: Propostas de Valor (Centro - Altura dupla) */}
          <div className="md:col-span-1 flex flex-col">
            {renderBlock("value_propositions", "h-full min-h-96 border-primary/40 bg-card/80")}
          </div>

          {/* COLUNA 4: Relacionamento (superior) + Canais (inferior) */}
          <div className="md:col-span-1 flex flex-col gap-4">
            {renderBlock("customer_relationships", "flex-1 min-h-56")}
            {renderBlock("channels", "flex-1 min-h-56")}
          </div>

          {/* COLUNA 5: Segmentos de Clientes (Altura dupla) */}
          <div className="md:col-span-1 flex flex-col">
            {renderBlock("customer_segments", "h-full min-h-96")}
          </div>
        </div>

        {/* PARTE INFERIOR: ESTRUTURA DE CUSTOS & FONTES DE RECEITA (2 COLUNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderBlock("cost_structure", "min-h-56")}
          {renderBlock("revenue_streams", "min-h-56")}
        </div>
      </div>
    </div>
  );
}
