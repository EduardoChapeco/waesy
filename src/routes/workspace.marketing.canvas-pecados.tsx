import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Target, Send, Copy, CheckCircle2, Users, RefreshCw, Share2, MessageCircle, Megaphone, Smartphone, ChevronRight, TrendingUp, Sliders, Flame, ShieldCheck, AlertTriangle, BookmarkCheck, ShoppingBag } from "lucide-react";
import { SEVEN_SINS_DEFINITIONS, SinType, generateSevenSinCopy, runSimLabPersonaTest, saveSevenSinHookToStore, listStoreProductsQuick, SimLabPersonaResult } from "@/services/seven-sins-simlab.functions";
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
  const [productName, setProductName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productsList, setProductsList] = useState<Array<{ id: string; title: string; price_cents: number | null }>>([]);
  const [targetChannel, setTargetChannel] = useState<
    "whatsapp" | "instagram_ad" | "push_notification" | "storefront_banner"
  >("whatsapp");

  const [generatedHook, setGeneratedHook] = useState<SevenSinHookDTO | null>(null);
  const [personaResults, setPersonaResults] = useState<SimLabPersonaResult[]>([]);

  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [savingDna, setSavingDna] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // ── CARREGAR PRODUTOS DA LOJA PARA O SELETOR ─────────────────────────────
  useEffect(() => {
    if (!storeId) return;
    listStoreProductsQuick({ data: { storeId } })
      .then((prods) => {
        if (prods && prods.length > 0) {
          setProductsList(prods);
        }
      })
      .catch((err) => console.warn("[canvas-pecados] Falha ao listar produtos:", err));
  }, [storeId]);

  // ── GERAR COPY AUTOMÁTICA DO PECADO SELECIONADO ───────────────────────────
  async function handleGenerateCopy(sinToUse = selectedSin) {
    if (!storeId) {
      setFeedback({ type: "error", message: "Nenhum workspace ativo foi identificado." });
      return;
    }
    if (!selectedProductId && !productName.trim()) {
      setFeedback({ type: "error", message: "Selecione um produto do catálogo ou informe o nome do produto." });
      return;
    }
    setGenerating(true);
    setPersonaResults([]);
    try {
      const hook = await generateSevenSinCopy({
        data: {
          storeId,
          sin: sinToUse,
          productId: selectedProductId || undefined,
          productNameFallback: productName,
          targetChannel: targetChannel,
        },
      });
      setGeneratedHook(hook);
      setFeedback({
        type: "success",
        message: `Rascunho de copy criado com a lente criativa "${sinToUse}". Revise todos os fatos antes de publicar.`,
      });
    } catch (err) {
      console.error("Erro ao gerar copy dos 7 pecados:", err);
      setFeedback({
        type: "error",
        message: "Erro ao estruturar a copy com o Agente V4. Tente novamente.",
      });
    } finally {
      setGenerating(false);
    }
  }

  // ── SALVAR GANCHO OFICIAL NO BRAND DNA DA LOJA ───────────────────────────
  async function handleSaveToBrandDna() {
    if (!generatedHook || !storeId) return;
    setSavingDna(true);
    try {
      const res = await saveSevenSinHookToStore({
        data: {
          storeId,
          sin: generatedHook.sin,
          hook: generatedHook,
        },
      });
      setFeedback({
        type: "success",
        message: res.message || "Gatilho salvo no Brand DNA da loja com sucesso!",
      });
    } catch (err) {
      console.error("Erro ao salvar no Brand DNA:", err);
      setFeedback({
        type: "error",
        message: "Falha ao salvar gatilho no Brand DNA da loja.",
      });
    } finally {
      setSavingDna(false);
    }
  }

  // ── EXECUTAR TESTE DO SIMLAB V2 ──────────────────────────────────────────
  async function handleRunSimLab() {
    if (!generatedHook) return;
    setSimulating(true);
    try {
      const results = await runSimLabPersonaTest({
        data: {
          storeId,
          sin: generatedHook.sin,
          copyHeadline: generatedHook.copy_headline,
          copyBody: generatedHook.copy_body,
        },
      });
      setPersonaResults(results);
    } catch (err) {
      console.error("Erro ao simular com personas:", err);
      setFeedback({
        type: "error",
        message: "Falha ao rodar simulação no SimLab V2.",
      });
    } finally {
      setSimulating(false);
    }
  }

  // Copiar para área de transferência
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setFeedback({
      type: "success",
      message: "Copiado para a área de transferência!",
    });
    setTimeout(() => setFeedback(null), 4000);
  }

  // Disparar no WhatsApp Web / Mobile
  function handleOpenWhatsApp() {
    if (!generatedHook) return;
    const fullText = `*${generatedHook.copy_headline}*\n\n${generatedHook.copy_body}\n\n${generatedHook.call_to_action}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      {/* ── HEADER EXECUTIVO COM SELO SILENCIOSO APPLE HIG ── */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-0 sm:px-0 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Lente criativa • requer revisão humana
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  SimLab qualitativo
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mt-1 text-foreground">
                Canvas de campanha e gatilhos criativos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gere rascunhos com diferentes lentes criativas. Reações sintéticas são exploratórias e não preveem conversões.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleGenerateCopy()}
                disabled={generating || !storeId || (!selectedProductId && !productName.trim())}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Gerando rascunho..." : "Gerar rascunho de copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEEDBACK ALERT ── */}
      {feedback && (
        <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-4">
          <div
            className={`p-4 rounded-lg border text-xs font-medium flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs underline opacity-80 hover:opacity-100 ml-4"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ── LENTES CRIATIVAS OPCIONAIS ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Lente criativa
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(Object.entries(SEVEN_SINS_DEFINITIONS) as [SinType, typeof SEVEN_SINS_DEFINITIONS[SinType]][]).map(
            ([sinKey, def]) => {
              const isSelected = selectedSin === sinKey;

              return (
                <button
                  key={sinKey}
                  type="button"
                  onClick={() => setSelectedSin(sinKey)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-card border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-card/50 border-border/50 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: def.color }}
                    />
                    <span className="text-xs font-bold capitalize text-foreground">
                      {sinKey}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
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
        <div className="p-4 rounded-lg bg-card border border-border/50 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          {/* Seletor ou Nome do Produto */}
          <div className="w-full sm:flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                Produto ou Serviço da Sua Loja
              </label>
              {productsList.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {productsList.length} itens no catálogo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {productsList.length > 0 && (
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProductId(id);
                    const found = productsList.find((p) => p.id === id);
                    if (found) setProductName(found.title);
                  }}
                  className="w-1/2 h-11 px-3 rounded-lg border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Digitar manualmente...</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.price_cents ? `(R$ ${(p.price_cents / 100).toFixed(2).replace(".", ",")})` : ""}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setSelectedProductId("");
                }}
                placeholder="Selecione um produto ou informe seu nome real"
                required
                className="flex-1 h-11 px-4 rounded-lg border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-muted-foreground block mb-1 uppercase tracking-wider">
              Canal de Disparo
            </label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as any)}
              className="w-full h-11 px-3 rounded-lg border border-border/60 bg-background text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram_ad">Instagram / Meta Ads</option>
              <option value="push_notification">Notificação Push</option>
              <option value="storefront_banner">Banner da vitrine</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── RASCUNHO E EXPLORAÇÃO QUALITATIVA ── */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: A Peça de Copy Pronta */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Copy Estruturada
              </h2>
              {generatedHook && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                  {generatedHook.sin}
                </span>
              )}
            </div>

            {generatedHook ? (
              <div className="bg-card border border-border/50 rounded-lg p-6 shadow-xs space-y-5">
                <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block">
                    Rascunho de headline
                  </span>
                  <p className="text-lg font-bold tracking-tight text-foreground mt-1">
                    &ldquo;{generatedHook.copy_headline}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block mb-1">
                    Corpo do Anúncio / Mensagem
                  </span>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {generatedHook.copy_body}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider block">
                      Chamada para Ação (CTA)
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {generatedHook.call_to_action}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          `*${generatedHook.copy_headline}*\n\n${generatedHook.copy_body}\n\n${generatedHook.call_to_action}`
                        )
                      }
                      className="h-10 px-4 inline-flex items-center gap-2 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="h-10 px-4 inline-flex items-center gap-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>

                {/* Ações de Governança e SimLab V2 */}
                <div className="pt-4 border-t border-border/30 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveToBrandDna}
                    disabled={savingDna}
                    className="w-full sm:w-1/2 h-11 inline-flex items-center justify-center gap-2 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <BookmarkCheck className={`w-4 h-4 ${savingDna ? "animate-spin text-primary" : "text-emerald-500"}`} />
                    {savingDna ? "Salvando..." : "Salvar no Brand DNA"}
                  </button>

                  <button
                    type="button"
                    onClick={handleRunSimLab}
                    disabled={simulating}
                    className="w-full sm:w-1/2 h-11 inline-flex items-center justify-center gap-2 rounded-lg text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <Users className="w-4 h-4" />
                    {simulating ? "Gerando respostas…" : "Explorar reações sintéticas"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 border border-dashed border-border/60 rounded-lg text-center bg-card/30">
                <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                <p className="text-sm font-medium text-foreground">Nenhuma copy gerada ainda</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Informe um produto real e gere um rascunho baseado somente nos fatos disponíveis.
                </p>
                <button
                  type="button"
                  onClick={() => handleGenerateCopy()}
                  disabled={generating || !storeId || (!selectedProductId && !productName.trim())}
                  className="h-10 px-4 inline-flex items-center gap-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar rascunho
                </button>
              </div>
            )}
          </div>

          {/* Coluna Direita: respostas hipotéticas do mesmo runtime SimLab */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Reações qualitativas sintéticas
              </h2>
              {personaResults.length > 0 && (
                <span className="text-xs text-muted-foreground font-mono">
                  {personaResults.length} respostas hipotéticas · sem forecast
                </span>
              )}
            </div>

            {personaResults.length > 0 ? (
              <div className="space-y-4">
                {personaResults.map((p) => (
                  <div
                    key={p.persona_id}
                    className="p-4 rounded-lg bg-card border border-border/50 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-border/40 flex items-center justify-center font-bold text-xs text-primary">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
                          <span className="text-xs text-muted-foreground">{p.archetype_label}</span>
                        </div>
                      </div>

                      <span className="rounded-full border border-border px-2 py-1 text-[10px]">IA · resposta sintética</span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30 text-xs text-foreground italic leading-relaxed">
                      {p.reaction_qualitative}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Origem: {p.profile_origin} · calibração: {p.calibration_status}. Não é depoimento de cliente.</p>

                    {p.primary_objection && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-1" />
                        <span>
                          <strong>Objeção:</strong> {p.primary_objection}{" "}
                          {p.recommended_fix && (
                            <span className="text-primary font-medium block mt-1">
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
              <div className="bg-card/40 border border-border/40 rounded-lg p-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm font-medium">Nenhuma exploração qualitativa executada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Após redigir a copy, gere respostas hipotéticas de perfis sintéticos. O resultado não estima conversão nem representa clientes reais.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
