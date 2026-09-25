import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Compass,
  Plus,
  Globe,
  Instagram,
  RefreshCw,
  Shield,
  Target,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sliders,
  DollarSign,
  AlertCircle,
  Palette,
  Eye,
  FileText,
} from "lucide-react";
import {
  listCompetitors,
  createCompetitor,
  captureAndAnalyzeCompetitor,
  getStoreBrandDna,
  updateStoreBrandDna,
} from "@/services/market-radar.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  MarketCompetitorDTO,
  CompetitorSnapshotDTO,
  BrandDnaProfileDTO,
} from "@/types/squads-and-onboarding";

export const Route = createFileRoute("/workspace/inteligencia/radar")({
  head: () => ({ meta: [{ title: "Radar de Mercado & Brand DNA | Waesy" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    return { store };
    } catch (err) {
      console.error("[loader:workspace.inteligencia.radar] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: MarketRadarPage,
});

export function MarketRadarPage() {
  const { store } = ((Route.useLoaderData?.() as any) || {});
  const storeId = store?.id || "";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<
    Array<MarketCompetitorDTO & { latest_snapshot?: CompetitorSnapshotDTO | null }>
  >([]);
  const [brandDna, setBrandDna] = useState<BrandDnaProfileDTO | null>(null);

  const [activeTab, setActiveTab] = useState<"radar" | "brand_dna" | "swot">("radar");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<
    (MarketCompetitorDTO & { latest_snapshot?: CompetitorSnapshotDTO | null }) | null
  >(null);

  // Formulário de novo concorrente
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── CARREGAMENTO INICIAL DOS DADOS REAIS ─────────────────────────────────
  async function loadData() {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [comps, dna] = await Promise.all([
        listCompetitors({ data: { storeId } }),
        getStoreBrandDna({ data: { storeId } }),
      ]);
      setCompetitors(comps || []);
      setBrandDna(dna || null);
      if (comps && comps.length > 0 && !selectedCompetitor) {
        setSelectedCompetitor(comps[0]);
      }
    } catch (err: any) {
      console.error("Erro ao carregar inteligência de mercado:", err);
      setFeedback({
        type: "error",
        message: "Não foi possível carregar os dados reais do radar.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [storeId]);

  // ── CRIAR NOVO CONCORRENTE ───────────────────────────────────────────────
  async function handleCreateCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setActionLoading("creating");
    try {
      const created = await createCompetitor({
        data: {
          storeId,
          name: newName.trim(),
          website_url: newWebsite.trim() || undefined,
          instagram_handle: newInstagram.trim() || undefined,
          notes: newNotes.trim() || undefined,
        },
      });

      await captureAndAnalyzeCompetitor({
        data: {
          competitorId: created.id,
          storeId,
        },
      });

      setFeedback({
        type: "success",
        message: `Concorrente "${created.name}" cadastrado e analisado com sucesso!`,
      });
      setShowAddModal(false);
      setNewName("");
      setNewWebsite("");
      setNewInstagram("");
      setNewNotes("");
      await loadData();
    } catch (err: any) {
      console.error("Erro ao criar concorrente:", err);
      setFeedback({
        type: "error",
        message: "Erro ao cadastrar concorrente. Tente novamente.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  // ── RECAPTURAR E REANALISAR SNAPSHOT ─────────────────────────────────────
  async function handleRefreshSnapshot(competitorId: string) {
    setActionLoading(`analyzing-${competitorId}`);
    try {
      await captureAndAnalyzeCompetitor({
        data: {
          competitorId,
          storeId,
        },
      });
      setFeedback({
        type: "success",
        message: "Análise forense e extração de DNA atualizadas com sucesso!",
      });
      await loadData();
    } catch (err: any) {
      console.error("Erro ao atualizar análise:", err);
      setFeedback({
        type: "error",
        message: "Falha na análise do concorrente.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      {/* ── HEADER EXECUTIVO COM SELO SILENCIOSO APPLE HIG ── */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-0 sm:px-0 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Inteligência Competitiva
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {competitors.length} concorrentes ativos
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mt-1 text-foreground">
                Radar de Concorrentes & Brand DNA
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monitoramento de mercado, arquétipos e posicionamento estratégico.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadData()}
                disabled={loading}
                className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium border border-border/60 bg-background hover:bg-muted/40 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Adicionar Concorrente
              </button>
            </div>
          </div>

          {/* Abas Silenciosas */}
          <div className="flex items-center gap-6 mt-6 border-t border-border/20 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab("radar")}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "radar"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Radar & Concorrentes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("brand_dna")}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "brand_dna"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              DNA da Sua Marca (Arquétipos & Tom)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("swot")}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === "swot"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Matriz SWOT & Ganchos de Ataque
            </button>
          </div>
        </div>
      </div>

      {/* ── ALERTA DE FEEDBACK ── */}
      {feedback && (
        <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-4">
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{feedback.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-6">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Carregando inteligência competitiva e DNA de marca...</p>
          </div>
        ) : (
          <>
            {/* ── ABA 1: RADAR DE CONCORRENTES ── */}
            {activeTab === "radar" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Coluna Esquerda: Lista de Concorrentes */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Concorrentes Monitorados ({competitors.length})
                    </h2>
                  </div>

                  {competitors.length === 0 ? (
                    <div className="p-8 border border-dashed border-border/60 rounded-2xl text-center bg-card/30">
                      <Compass className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                      <p className="text-sm font-medium text-foreground">Nenhum concorrente cadastrado</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Adicione o site ou Instagram dos seus principais concorrentes para extrair dados.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Cadastrar Primeiro Concorrente
                      </button>
                    </div>
                  ) : (
                    competitors.map((comp) => {
                      const isSelected = selectedCompetitor?.id === comp.id;
                      const snap = comp.latest_snapshot;
                      const dna = snap?.extracted_dna;

                      return (
                        <div
                          key={comp.id}
                          onClick={() => setSelectedCompetitor(comp)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-card border-primary/50 shadow-sm ring-1 ring-primary/20"
                              : "bg-card/50 border-border/50 hover:bg-card hover:border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-foreground tracking-tight">
                                {comp.name}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {comp.website_url && (
                                  <span className="flex items-center gap-1 hover:text-foreground">
                                    <Globe className="w-3 h-3" />
                                    {new URL(comp.website_url).hostname}
                                  </span>
                                )}
                                {comp.instagram_handle && (
                                  <span className="flex items-center gap-1 hover:text-foreground">
                                    <Instagram className="w-3 h-3" />
                                    @{comp.instagram_handle}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                snap?.pricing_signals?.tier === "luxury"
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : snap?.pricing_signals?.tier === "premium"
                                  ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              }`}
                            >
                              {snap?.pricing_signals?.tier || "Em análise"}
                            </span>
                          </div>

                          {dna && (
                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">
                                Arquétipo: <strong className="text-foreground">{dna.brand_archetype}</strong>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {dna.color_palette.slice(0, 4).map((c, idx) => (
                                  <span
                                    key={idx}
                                    className="w-3.5 h-3.5 rounded-full border border-border/40 shadow-xs"
                                    style={{ backgroundColor: c }}
                                    title={c}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Coluna Direita: Análise Forense & Detalhes do Concorrente Selecionado */}
                <div className="lg:col-span-7">
                  {selectedCompetitor ? (
                    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs space-y-6">
                      <div className="flex items-start justify-between border-b border-border/30 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                              {selectedCompetitor.name}
                            </h2>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              ID: {selectedCompetitor.id.slice(0, 8)}...
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Última análise forense:{" "}
                            {selectedCompetitor.latest_snapshot?.captured_at
                              ? new Date(selectedCompetitor.latest_snapshot.captured_at).toLocaleString("pt-BR")
                              : "Pendente"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRefreshSnapshot(selectedCompetitor.id)}
                          disabled={actionLoading === `analyzing-${selectedCompetitor.id}`}
                          className="h-10 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-medium border border-border/60 hover:bg-muted/40 transition-colors"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              actionLoading === `analyzing-${selectedCompetitor.id}` ? "animate-spin" : ""
                            }`}
                          />
                          Reanalisar Agora
                        </button>
                      </div>

                      {/* Dados Forenses do Snapshot */}
                      {selectedCompetitor.latest_snapshot ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                                Posicionamento de Preço
                              </span>
                              <span className="text-base font-bold text-foreground capitalize mt-0.5 block">
                                {selectedCompetitor.latest_snapshot.pricing_signals.tier}
                              </span>
                              <span className="text-[11px] text-muted-foreground mt-1 block">
                                Ticket médio ~R$ {selectedCompetitor.latest_snapshot.pricing_signals.average_ticket_estimate},00
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                                Intensidade Promocional
                              </span>
                              <span className="text-base font-bold text-foreground capitalize mt-0.5 block">
                                {selectedCompetitor.latest_snapshot.pricing_signals.promotional_intensity}
                              </span>
                              <span className="text-[11px] text-muted-foreground mt-1 block">
                                Agressividade em cupons e ofertas
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40">
                              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider block">
                                Arquétipo Dominante
                              </span>
                              <span className="text-base font-bold text-foreground mt-0.5 block">
                                {selectedCompetitor.latest_snapshot.extracted_dna.brand_archetype}
                              </span>
                              <span className="text-[11px] text-muted-foreground mt-1 block">
                                Psicologia de comunicação
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Brecha de Mercado (Oportunidade para a Sua Loja)
                            </h3>
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-foreground leading-relaxed">
                              {selectedCompetitor.latest_snapshot.extracted_dna.differentiation_gap}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Fraquezas Estratégicas do Concorrente
                            </h3>
                            <div className="space-y-2">
                              {selectedCompetitor.latest_snapshot.extracted_dna.weaknesses.map((w, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2.5 text-xs text-muted-foreground p-2.5 rounded-lg bg-card/40 border border-border/30"
                                >
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Ganchos de Marketing V4 para Explorar
                            </h3>
                            <div className="space-y-2">
                              {selectedCompetitor.latest_snapshot.marketing_hooks.map((h, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/40 text-xs"
                                >
                                  <span className="font-medium text-foreground">&ldquo;{h}&rdquo;</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(h);
                                      setFeedback({ type: "success", message: "Gancho copiado para a área de transferência!" });
                                    }}
                                    className="text-[11px] px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
                                  >
                                    Copiar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-sm text-muted-foreground mb-4">
                            Nenhum snapshot ou análise capturada para este concorrente ainda.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRefreshSnapshot(selectedCompetitor.id)}
                            className="h-11 px-5 inline-flex items-center gap-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Iniciar Análise Forense
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-card/40 border border-border/40 rounded-2xl p-12 text-center text-muted-foreground">
                      <p className="text-sm">Selecione um concorrente ao lado para ver a análise completa.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ABA 2: BRAND DNA DA SUA MARCA ── */}
            {activeTab === "brand_dna" && brandDna && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Identidade Canônica da Sua Loja
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Diretrizes semióticas, arquétipo de Jung e escala estética utilizadas por todos os squads de IA.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/30">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Arquétipo Primário de Jung
                        </label>
                        <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                          <span className="text-lg font-bold text-foreground block">
                            {brandDna.archetype}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {brandDna.archetype_justification}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Tom de Voz Oficial
                        </label>
                        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-sm font-medium text-foreground">
                          {brandDna.tone_of_voice}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Paleta Cromática Oficial (Apple HIG)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-3.5 rounded-xl bg-muted/20 border border-border/40">
                          {Object.entries(brandDna.color_palette).map(([key, val]) => (
                            <div key={key} className="text-center">
                              <div
                                className="w-full h-12 rounded-lg border border-border/30 shadow-xs mb-1"
                                style={{ backgroundColor: val }}
                              />
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                {key}
                              </span>
                              <span className="text-[10px] font-mono text-foreground block">
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Palavras Proibidas (Filtro Antijargão)
                        </label>
                        <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-muted/20 border border-border/40">
                          {brandDna.forbidden_words.map((w, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"
                            >
                              ✕ {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA 3: MATRIZ SWOT & GANCHOS DOS 7 PECADOS ── */}
            {activeTab === "swot" && brandDna && (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Matriz SWOT Estratégica
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Diagnóstico competitivo cruzado com os dados dos concorrentes monitorados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Forças (Strengths)
                      </span>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {brandDna.swot_analysis.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        Fraquezas (Weaknesses)
                      </span>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {brandDna.swot_analysis.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                        Oportunidades (Opportunities)
                      </span>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {brandDna.swot_analysis.opportunities.map((o, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-destructive block">
                        Ameaças (Threats)
                      </span>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {brandDna.swot_analysis.threats.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-destructive font-bold">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Ganchos Psicológicos (Os 7 Pecados Capitais)
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gatilhos subconscientes de alta conversão pré-configurados para a sua marca.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(brandDna.seven_sins_triggers).map(([sin, copy]) => (
                      <div
                        key={sin}
                        className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1.5"
                      >
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                          {sin}
                        </span>
                        <p className="text-xs text-foreground leading-relaxed">&ldquo;{copy}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL DE ADICIONAR CONCORRENTE ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border-t sm:border border-border/60 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto no-scrollbar shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                Cadastrar Novo Concorrente
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                O robô executará uma análise forense instantânea de DNA, preços e posicionamento.
              </p>
            </div>

            <form onSubmit={handleCreateCompetitor} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Nome do Concorrente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Burger King Centro, Padaria Real"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo.com.br"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  placeholder="@nomedamarca"
                  value={newInstagram}
                  onChange={(e) => setNewInstagram(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Observações Estratégicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Ponto forte em delivery nos fins de semana..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 px-4 rounded-xl text-sm font-medium border border-border/60 hover:bg-muted/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "creating"}
                  className="h-11 px-5 inline-flex items-center gap-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-95 transition-opacity"
                >
                  {actionLoading === "creating" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    "Cadastrar & Analisar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
