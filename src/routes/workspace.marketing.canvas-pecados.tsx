import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Target,
  Send,
  Copy,
  CheckCircle2,
  Users,
  RefreshCw,
  Share2,
  MessageCircle,
  Megaphone,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Sliders,
  Flame,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  SEVEN_SINS_DEFINITIONS,
  SinType,
  generateSevenSinCopy,
  runSimLabPersonaTest,
  SimLabPersonaResult,
} from "@/services/seven-sins-simlab.functions";
import { getStoreSettings } from "@/services/store.functions";
import { SevenSinHookDTO } from "@/types/squads-and-onboarding";

export const Route = createFileRoute("/workspace/marketing/canvas-pecados")({
  head: () => ({ meta: [{ title: "Canvas dos 7 Pecados Capitais | Waesy" }] }),
  loader: async () => {
    try {
    const store = await getStoreSettings().catch(() => null);
    return { store };
    } catch (err) {
      console.error("[loader:workspace.marketing.canvas-pecados] Unhandled loader error:", err);
      return { store: null };
    }
  },
  component: SevenSinsCanvasPage,
});

export function SevenSinsCanvasPage() {
  const { store } = (Route.useLoaderData() as any) || {};
  const storeId = store?.id || "";

  const [selectedSin, setSelectedSin] = useState<SinType>("orgulho");
  const [productName, setProductName] = useState("Combo Executivo Especial");
  const [targetChannel, setTargetChannel] = useState<
    "whatsapp" | "instagram_ad" | "push_notification" | "storefront_banner"
  >("whatsapp");

  const [generatedHook, setGeneratedHook] = useState<SevenSinHookDTO | null>(null);
  const [personaResults, setPersonaResults] = useState<SimLabPersonaResult[]>([]);

  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // ── GERAR COPY AUTOMÁTICA DO PECADO SELECIONADO ───────────────────────────
  async function handleGenerateCopy(sinToUse = selectedSin) {
    setGenerating(true);
    setPersonaResults([]);
    try {
      const hook = await generateSevenSinCopy(storeId, {
        sin: sinToUse,
        productNameFallback: productName,
        targetChannel: targetChannel,
      });
      setGeneratedHook(hook);
    } catch (err) {
      console.error("Erro ao gerar copy dos 7 pecados:", err);
      setFeedback("Erro ao estruturar a copy com o Agente V4. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  // ── EXECUTAR TESTE DO SIMLAB V2 ──────────────────────────────────────────
  async function handleRunSimLab() {
    if (!generatedHook) return;
    setSimulating(true);
    try {
      const results = await runSimLabPersonaTest({
        sin: generatedHook.sin,
        copyHeadline: generatedHook.copy_headline,
        copyBody: generatedHook.copy_body,
      });
      setPersonaResults(results);
    } catch (err) {
      console.error("Erro ao simular com personas:", err);
      setFeedback("Falha ao rodar simulação no SimLab V2.");
    } finally {
      setSimulating(false);
    }
  }

  // Copiar para área de transferência
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setFeedback("Copiado para a área de transferência!");
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      {/* ── HEADER EXECUTIVO COM SELO SILENCIOSO APPLE HIG ── */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-0 sm:px-0 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Framework Psicológico de Alta Conversão • V4 Company
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  SimLab V2 Enabled
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mt-1 text-foreground">
                Canvas de Conversão
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Crie anúncios e mensagens de WhatsApp ativando os 7 gatilhos subconscientes de compra e teste antes com personas sintéticas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleGenerateCopy()}
                disabled={generating}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Redigindo..." : "Redigir Copy do Pecado"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEEDBACK TOAST ── */}
      {feedback && (
        <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-4">
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── SELETOR DE PECADOS (GRADE DOS 7 GATILHOS) ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          1. Escolha a Alavanca Subconsciente (O Pecado Capital)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(Object.entries(SEVEN_SINS_DEFINITIONS) as [SinType, typeof SEVEN_SINS_DEFINITIONS[SinType]][]).map(
            ([sinKey, def]) => {
              const isSelected = selectedSin === sinKey;

              return (
                <button
                  key={sinKey}
                  type="button"
                  onClick={() => {
                    setSelectedSin(sinKey);
                    handleGenerateCopy(sinKey);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "bg-card border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-card/50 border-border/50 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: def.color }}
                    />
                    <span className="text-xs font-bold capitalize text-foreground">
                      {sinKey}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                    {def.subconscious}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* ── FORMULÁRIO DE PRODUTO & CANAL ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-6">
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:flex-1">
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">
              Produto ou Serviço da Sua Loja
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Combo Smash Burger Duplo, Pacote Gramado 4 Dias"
              className="w-full h-11 px-3.5 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="w-full sm:w-64">
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">
              Canal de Disparo
            </label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as any)}
              className="w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="whatsapp">WhatsApp (Conversão Direta)</option>
              <option value="instagram_ad">Instagram / Meta Ads</option>
              <option value="push_notification">Notificação Push</option>
              <option value="storefront_banner">Banner da Vitrine Digital</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO DA COPY GERADA & SIMLAB V2 ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: A Peça de Copy Pronta */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                2. Copy Estruturada pelo Head Copywriter V4
              </h2>
              {generatedHook && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                  {generatedHook.sin}
                </span>
              )}
            </div>

            {generatedHook ? (
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xs space-y-5">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
                    Headline de Alto Impacto
                  </span>
                  <p className="text-lg font-bold tracking-tight text-foreground mt-1">
                    &ldquo;{generatedHook.copy_headline}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block mb-1">
                    Corpo do Anúncio / Mensagem
                  </span>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {generatedHook.copy_body}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                      Chamada para Ação (CTA)
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      👉 {generatedHook.call_to_action}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `*${generatedHook.copy_headline}*\n\n${generatedHook.copy_body}\n\n👉 ${generatedHook.call_to_action}`
                      )
                    }
                    className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-medium border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Peça Completa
                  </button>
                </div>

                {/* Botão de Disparo do SimLab V2 */}
                <div className="pt-4 border-t border-border/30">
                  <button
                    type="button"
                    onClick={handleRunSimLab}
                    disabled={simulating}
                    className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <Users className="w-4 h-4" />
                    {simulating
                      ? "Consultando 5 Personas Sintéticas no SimLab V2..."
                      : "Testar Impacto no SimLab V2 (Previsão de Conversão)"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 border border-dashed border-border/60 rounded-2xl text-center bg-card/30">
                <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                <p className="text-sm font-medium text-foreground">Nenhuma copy gerada ainda</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Clique no botão &ldquo;Redigir Copy do Pecado&rdquo; no topo para gerar a primeira versão.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerateCopy()}
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar Agora
                </button>
              </div>
            )}
          </div>

          {/* Coluna Direita: Feedback das Personas Sintéticas do SimLab V2 */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                3. Relatório Forense SimLab V2 (Personas Sintéticas)
              </h2>
              {personaResults.length > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  Média:{" "}
                  <strong className="text-foreground">
                    {Math.round(
                      personaResults.reduce((acc, p) => acc + p.conversion_probability, 0) /
                        personaResults.length
                    )}
                    %
                  </strong>{" "}
                  conversão
                </span>
              )}
            </div>

            {personaResults.length > 0 ? (
              <div className="space-y-4">
                {personaResults.map((p) => (
                  <div
                    key={p.persona_id}
                    className="p-4 rounded-2xl bg-card border border-border/50 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatar_url || undefined}
                          alt={p.name}
                          className="w-10 h-10 rounded-full object-cover border border-border/40"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
                          <span className="text-xs text-muted-foreground">{p.archetype_label}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            p.conversion_probability >= 80
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : p.conversion_probability >= 65
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {p.conversion_probability}% propensão
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30 text-xs text-foreground italic leading-relaxed">
                      {p.reaction_verbatim}
                    </div>

                    {p.primary_objection && (
                      <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>Objeção:</strong> {p.primary_objection}{" "}
                          {p.recommended_fix && (
                            <span className="text-primary font-medium block mt-0.5">
                              Sugestão: {p.recommended_fix}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card/40 border border-border/40 rounded-2xl p-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-medium">Nenhum teste de persona executado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Após redigir a copy, clique no botão &ldquo;Testar Impacto no SimLab V2&rdquo; para simular o comportamento de 5 perfis demográficos sintéticos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
