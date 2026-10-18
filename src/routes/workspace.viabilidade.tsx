import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Compass,
  DollarSign,
  Edit3,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoreSettings } from "@/services/store.functions";
import {
  listViabilityStudies,
  runCortexViabilityAndGeomarketingStudy,
  saveViabilityCanvasAndSwot,
  type ViabilityBusinessModelCanvas,
  type ViabilityStudyDTO,
  type ViabilitySwotMatrix,
} from "@/services/geomarketing-cortex.functions";
import { GeomarketingInteractiveMap } from "@/components/simlab/GeomarketingInteractiveMap";
import { NICHE_ECONOMIC_BENCHMARKS } from "@/lib/geo-analytics";

export const Route = createFileRoute("/workspace/viabilidade")({
  head: () => ({
    meta: [
      {
        title: "Estudo de Viabilidade | Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const [store, studies] = await Promise.all([
        getStoreSettings().catch(() => null),
        listViabilityStudies({ data: { limit: 10 } }).catch(() => []),
      ]);
      return { store, initialStudies: studies || [] };
    } catch (err) {
      console.error("[loader:workspace.viabilidade] Erro:", err);
      return { store: null, initialStudies: [] };
    }
  },
  component: WorkspaceViabilityPage,
});

const PRIORITY_CITIES = [
  { city: "Chapecó", state: "SC", address: "Avenida Getúlio Vargas, Centro" },
  { city: "São Miguel do Oeste", state: "SC", address: "Rua Marcílio Dias, Centro" },
  { city: "Pinhalzinho", state: "SC", address: "Avenida Brasília, Centro" },
  { city: "Maravilha", state: "SC", address: "Avenida Araucária, Centro" },
  { city: "Concórdia", state: "SC", address: "Rua do Comércio, Centro" },
  { city: "Lages", state: "SC", address: "Avenida Presidente Vargas, Centro" },
  { city: "Florianópolis", state: "SC", address: "Avenida Mauro Ramos, Centro" },
  { city: "São Paulo", state: "SP", address: "Rua dos Pinheiros, Pinheiros" },
];

const BMC_BLOCKS: Array<{
  key: keyof ViabilityBusinessModelCanvas;
  label: string;
  subtitle: string;
}> = [
  { key: "key_partners", label: "1. Parceiros-Chave", subtitle: "Alianças, logística e fornecedores" },
  { key: "key_activities", label: "2. Atividades-Chave", subtitle: "Processos essenciais de execução" },
  { key: "key_resources", label: "3. Recursos-Chave", subtitle: "Ativos físicos, digitais e equipe" },
  { key: "value_propositions", label: "4. Proposta de Valor", subtitle: "Diferencial competitivo central" },
  { key: "customer_relationships", label: "5. Relacionamento", subtitle: "Retenção, fidelidade e suporte" },
  { key: "channels", label: "6. Canais de Aquisição", subtitle: "Vitrine, tráfego de rua e delivery" },
  { key: "customer_segments", label: "7. Segmentos de Clientes", subtitle: "Público-alvo na isócrona local" },
  { key: "cost_structure", label: "8. Estrutura de Custos", subtitle: "Ocupação, CMV e taxas operacionais" },
  { key: "revenue_streams", label: "9. Fontes de Receita", subtitle: "Ticket base, combos e recorrência" },
];

function formatBrlFromCents(cents: number): string {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function WorkspaceViabilityPage() {
  const loaderData = (Route.useLoaderData?.() as {
    store: any;
    initialStudies: ViabilityStudyDTO[];
  }) || { store: null, initialStudies: [] };

  const store = loaderData.store;
  const [studies, setStudies] = useState<ViabilityStudyDTO[]>(loaderData.initialStudies || []);
  const [activeStudy, setActiveStudy] = useState<ViabilityStudyDTO | null>(
    loaderData.initialStudies?.[0] || null,
  );

  // Estado do formulário de simulação (Pré-Negócio / Incubadora ou Loja Existente)
  const [businessName, setBusinessName] = useState<string>(
    activeStudy?.business_name || store?.name || " Bistrô & Café Especial Oeste",
  );
  const [nicheSlug, setNicheSlug] = useState<string>(
    activeStudy?.niche_slug || "gastronomia",
  );
  const [ideaDescription, setIdeaDescription] = useState<string>(
    activeStudy?.idea_description ||
      store?.description ||
      "Operação gastronômica com cafés especiais, brunches rápidos, pedidos digitais pelo celular e entrega expressa MotoLink em até 25 minutos.",
  );
  const [city, setCity] = useState<string>(activeStudy?.city || store?.city || "Chapecó");
  const [stateCode, setStateCode] = useState<string>(activeStudy?.state || store?.state || "SC");
  const [targetAddress, setTargetAddress] = useState<string>(
    activeStudy?.target_address || store?.address || "Avenida Getúlio Vargas, Centro",
  );
  const [radiusKm, setRadiusKm] = useState<number>(activeStudy?.radius_km || 2.0);
  const [baseTicketBrlInput, setBaseTicketBrlInput] = useState<string>(
    activeStudy ? (activeStudy.base_ticket_cents / 100).toFixed(0) : "58",
  );
  const [estimatedRentBrlInput, setEstimatedRentBrlInput] = useState<string>(
    activeStudy ? (activeStudy.estimated_rent_cents / 100).toFixed(0) : "3800",
  );

  // Navegação das 4 visões canônicas
  const [activeView, setActiveView] = useState<"map" | "cortex" | "comperator" | "canvas">("map");

  // Estados de carregamento, erro e edição in-page do BMC/SWOT
  const [isRunningStudy, setIsRunningStudy] = useState<boolean>(false);
  const [isSavingCanvas, setIsSavingCanvas] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [editableSwot, setEditableSwot] = useState<ViabilitySwotMatrix | null>(
    activeStudy?.swot_analysis || null,
  );
  const [editableBmc, setEditableBmc] = useState<ViabilityBusinessModelCanvas | null>(
    activeStudy?.bmc_canvas || null,
  );
  const [editableSummary, setEditableSummary] = useState<string>(
    activeStudy?.executive_summary || "",
  );

  useEffect(() => {
    if (activeStudy) {
      setEditableSwot(activeStudy.swot_analysis);
      setEditableBmc(activeStudy.bmc_canvas);
      setEditableSummary(activeStudy.executive_summary || "");
    }
  }, [activeStudy]);

  // Se ainda não há nenhum estudo salvo, executa uma simulação inicial automática ao montar
  useEffect(() => {
    if (!activeStudy && !isRunningStudy) {
      void executeStudy(undefined, undefined);
    }
  }, []);

  async function executeStudy(overrideLat?: number, overrideLon?: number) {
    setIsRunningStudy(true);
    setErrorMessage(null);
    setStatusBanner(null);

    try {
      const baseTicketCents = Math.max(
        500,
        Math.round((parseFloat(baseTicketBrlInput.replace(",", ".")) || 58) * 100),
      );
      const estimatedRentCents = Math.max(
        0,
        Math.round((parseFloat(estimatedRentBrlInput.replace(",", ".")) || 3500) * 100),
      );

      const result = await runCortexViabilityAndGeomarketingStudy({
        data: {
          storeId: store?.id || null,
          businessName: businessName.trim() || "Novo Negócio Local",
          nicheSlug,
          ideaDescription:
            ideaDescription.trim() || "Empreendimento local integrado à vitrine digital e delivery.",
          targetAddress: targetAddress.trim() || "Centro",
          city: city.trim() || "Chapecó",
          state: stateCode.trim() || "SC",
          latitude: overrideLat ?? null,
          longitude: overrideLon ?? null,
          radiusKm,
          baseTicketCents,
          estimatedRentCents,
        },
      });

      setActiveStudy(result);
      setStudies((prev) => [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 12));
      setStatusBanner(
        overrideLat !== undefined
          ? `Ponto territorial atualizado (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}) com Score ${result.viability_score}/100.`
          : `Estudo Cortex 360 concluído para ${result.city}/${result.state}: Veredito ${result.verdict} (${result.viability_score}/100).`,
      );
    } catch (err: any) {
      console.error("[WorkspaceViabilityPage] Erro na simulação:", err);
      setErrorMessage(
        err?.message || "Não foi possível concluir o estudo de geomarketing. Verifique os parâmetros.",
      );
    } finally {
      setIsRunningStudy(false);
    }
  }

  async function handleSaveCanvasAndSwot() {
    if (!activeStudy || !editableSwot || !editableBmc) return;
    setIsSavingCanvas(true);
    setErrorMessage(null);
    try {
      await saveViabilityCanvasAndSwot({
        data: {
          studyId: activeStudy.id,
          storeId: store?.id || activeStudy.store_id || null,
          swotAnalysis: editableSwot,
          bmcCanvas: editableBmc,
          executiveSummary: editableSummary,
        },
      });

      const updated: ViabilityStudyDTO = {
        ...activeStudy,
        swot_analysis: editableSwot,
        bmc_canvas: editableBmc,
        executive_summary: editableSummary,
      };
      setActiveStudy(updated);
      setStudies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setStatusBanner("Business Model Canvas (BMC) e Matriz SWOT salvos com sucesso!");
    } catch (err: any) {
      setErrorMessage(err?.message || "Falha ao salvar alterações do Canvas.");
    } finally {
      setIsSavingCanvas(false);
    }
  }

  function handleSelectCityPreset(preset: { city: string; state: string; address: string }) {
    setCity(preset.city);
    setStateCode(preset.state);
    setTargetAddress(preset.address);
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24">
      {/* ── 1. CABEÇALHO E NAVEGAÇÃO DE INCUBADORA / VIABILIDADE ── */}
      <div className="p-5 sm:p-6 rounded-lg border border-border/70 bg-card space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                Cortex 360 & Geomarketing GOAT
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">
                Modo Pré-Negócio & Loja Ativa
              </Badge>
              {activeStudy && (
                <Badge
                  variant={
                    activeStudy.verdict === "GO"
                      ? "secondary"
                      : activeStudy.verdict === "PIVOT"
                        ? "outline"
                        : "destructive"
                  }
                  className="text-xs font-bold"
                >
                  Veredito: {activeStudy.verdict} · {activeStudy.viability_score}/100
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Geomarketing e Viabilidade Cortex 360
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
              Valide ideias de negócio, escolha a esquina ideal no mapa por isócronas de captura (500m, 1km e 2km), descubra concorrentes via OpenStreetMap e calcule TAM/SAM/SOM + Preço Dinâmico antes de investir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="h-11 px-4 rounded-lg text-xs font-semibold gap-2">
              <Link to="/workspace/onboarding">
                <ArrowLeft className="size-4" />
                <span>Voltar ao Onboarding</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-4 rounded-lg text-xs font-semibold gap-2">
              <Link to="/workspace/inteligencia/radar">
                <Compass className="size-4" />
                <span>Radar de Marca</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Atalhos de Polos Regionais */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <span className="text-xs font-semibold text-muted-foreground block">
            Polos Calibrados Censo IBGE 2022 (Clique para preencher localidade):
          </span>
          <div className="flex flex-nowrap overflow-x-auto no-scrollbar tab-list gap-2 pb-1">
            {PRIORITY_CITIES.map((preset) => {
              const isCurrent = city.toLowerCase() === preset.city.toLowerCase();
              return (
                <Button
                  key={preset.city}
                  type="button"
                  variant={isCurrent ? "secondary" : "outline"}
                  onClick={() => handleSelectCityPreset(preset)}
                  className="h-11 px-3 rounded-lg text-xs font-semibold shrink-0 gap-1"
                >
                  <MapPin className="size-3.5 text-primary" />
                  <span>
                    {preset.city}/{preset.state}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Formulário Paramétrico da Ideia e Ponto Comercial */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executeStudy(undefined, undefined);
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-border/50"
        >
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Nome do Negócio ou Ideia *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Burger Artesanal Centro"
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Vertical / Nicho Econômico
            </label>
            <select
              value={nicheSlug}
              onChange={(e) => setNicheSlug(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {Object.entries(NICHE_ECONOMIC_BENCHMARKS).map(([slug, info]) => (
                <option key={slug} value={slug}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Endereço / Esquina Alvo
            </label>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="Rua / Avenida e Bairro"
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Cidade / UF
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Proposta de Valor e Diferencial Planejado
            </label>
            <input
              type="text"
              value={ideaDescription}
              onChange={(e) => setIdeaDescription(e.target.value)}
              placeholder="Descreva o produto, público e diferencial..."
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Ticket Base (R$)
            </label>
            <input
              type="number"
              min={5}
              step={1}
              value={baseTicketBrlInput}
              onChange={(e) => setBaseTicketBrlInput(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground block">
              Aluguel Estimado (R$)
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={estimatedRentBrlInput}
              onChange={(e) => setEstimatedRentBrlInput(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border/70 bg-background text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="md:col-span-3 flex items-end">
            <Button
              type="submit"
              variant="default"
              disabled={isRunningStudy}
              className="w-full h-11 px-5 rounded-lg text-xs font-bold gap-2"
            >
              {isRunningStudy ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Analisar Viabilidade</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Feedback de Erro ou Sucesso */}
      {errorMessage && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setErrorMessage(null)}
            className="h-11 px-3 rounded-lg text-xs font-semibold"
          >
            Fechar
          </Button>
        </div>
      )}

      {statusBanner && (
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStatusBanner(null)}
            className="h-11 px-3 rounded-lg text-xs font-semibold"
          >
            OK
          </Button>
        </div>
      )}

      {/* ── 2. RÉGUA HORIZONTAL DE ABAS (B.39) ── */}
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar tab-list gap-2 border-b border-border/60 pb-2">
        <Button
          type="button"
          variant={activeView === "map" ? "secondary" : "ghost"}
          onClick={() => setActiveView("map")}
          className="h-11 px-4 rounded-lg text-xs font-bold shrink-0 gap-2"
        >
          <MapPin className="size-4 text-primary" />
          <span>1. Mapa da Região</span>
        </Button>

        <Button
          type="button"
          variant={activeView === "cortex" ? "secondary" : "ghost"}
          onClick={() => setActiveView("cortex")}
          className="h-11 px-4 rounded-lg text-xs font-bold shrink-0 gap-2"
        >
          <TrendingUp className="size-4 text-primary" />
          <span>2. Mercado e Preço</span>
        </Button>

        <Button
          type="button"
          variant={activeView === "comperator" ? "secondary" : "ghost"}
          onClick={() => setActiveView("comperator")}
          className="h-11 px-4 rounded-lg text-xs font-bold shrink-0 gap-2"
        >
          <Layers className="size-4 text-primary" />
          <span>
            3. Concorrentes ({activeStudy?.comperator_matrix?.length || 0})
          </span>
        </Button>

        <Button
          type="button"
          variant={activeView === "canvas" ? "secondary" : "ghost"}
          onClick={() => setActiveView("canvas")}
          className="h-11 px-4 rounded-lg text-xs font-bold shrink-0 gap-2"
        >
          <Edit3 className="size-4 text-primary" />
          <span>4. Plano e Estratégia</span>
        </Button>
      </div>

      {/* Estado de Carregamento Inicial */}
      {isRunningStudy && !activeStudy ? (
        <div className="p-12 rounded-lg border border-border/60 bg-card flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-primary" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Processando Malha Territorial
            </h2>
            <p className="text-xs text-muted-foreground max-w-md">
              Consultando dados demográficos, mapeando a região e calculando viabilidade...
            </p>
          </div>
        </div>
      ) : !activeStudy ? (
        <div className="p-12 rounded-lg border border-dashed border-border/60 bg-card/40 text-center space-y-4">
          <Compass className="size-8 mx-auto text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Nenhum estudo executado
            </h2>
            <p className="text-xs text-muted-foreground">
              Preencha a ideia e a cidade acima para analisar o potencial da região.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void executeStudy(undefined, undefined)}
            className="h-11 px-5 rounded-lg text-xs font-bold gap-2"
          >
            <RefreshCw className="size-4" />
            <span>Gerar Estudo</span>
          </Button>
        </div>
      ) : (
        <>
          {/* ── VISÃO 1: MAPA DA REGIÃO ── */}
          {activeView === "map" && (
            <div className="space-y-6">
              {/* KPIs da Região */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Viabilidade Geral
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">
                      {activeStudy.viability_score}/100
                    </span>
                    <Badge
                      variant={
                        activeStudy.verdict === "GO"
                          ? "secondary"
                          : activeStudy.verdict === "PIVOT"
                            ? "outline"
                            : "destructive"
                      }
                      className="text-xs font-bold"
                    >
                      {activeStudy.verdict}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Potencial comercial estimado
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Acessibilidade Local
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">
                      {activeStudy.accessibility_index}/100
                    </span>
                    <span className="text-xs font-mono text-primary">
                      {activeStudy.gravitational_score} pts
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeStudy.urban_anchors.length} pontos de interesse próximos
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Concorrência (2 km)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">
                      {activeStudy.competitor_saturation_index}%
                    </span>
                    <span className="text-xs font-mono text-destructive">
                      {activeStudy.discovered_competitors.length} locais
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nível de saturação comercial
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    População Estimada
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">
                      {activeStudy.ibge_population.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">hab.</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Renda per capita ~ R$ {activeStudy.ibge_per_capita_income_brl.toLocaleString("pt-BR")}/mês
                  </p>
                </div>
              </div>

              {/* Mapa Interativo MapLibre com Isócronas e Clique na Esquina */}
              <GeomarketingInteractiveMap
                centerLat={activeStudy.latitude}
                centerLon={activeStudy.longitude}
                businessName={activeStudy.business_name}
                targetAddress={`${activeStudy.target_address} · ${activeStudy.city}/${activeStudy.state}`}
                isochroneGeojson={activeStudy.isochrone_geojson}
                competitors={activeStudy.discovered_competitors}
                anchors={activeStudy.urban_anchors}
                isSimulating={isRunningStudy}
                onSelectCoordinates={(lat, lon) => {
                  void executeStudy(lat, lon);
                }}
              />

              {/* Detalhamento dos 3 Anéis de Captura (Isócronas GOAT) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(activeStudy.isochrone_geojson?.features || []).map((feat) => (
                  <div
                    key={feat.properties.label}
                    className="p-4 rounded-lg border border-border/60 bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold">
                        Raio {feat.properties.radiusKm} km
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        Área: {feat.properties.areaKm2} km²
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {feat.properties.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tempo médio de deslocamento: {feat.properties.estimatedMinutes} min.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VISÃO 2: MERCADO E PREÇO ── */}
          {activeView === "cortex" && (
            <div className="space-y-6">
              {/* Estimativa de Mercado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-lg border border-border/60 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Mercado Total (Município)
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Estimativa
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-foreground">
                    {formatBrlFromCents(activeStudy.tam_monthly_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gasto mensal estimado da cidade na categoria do seu negócio.
                  </p>
                </div>

                <div className="p-5 rounded-lg border border-primary/30 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-primary">
                      Mercado Regional (2 km)
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Área de Atendimento
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-foreground">
                    {formatBrlFromCents(activeStudy.sam_monthly_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mercado atendido no raio próximo ao seu endereço.
                  </p>
                </div>

                <div className="p-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Faturamento Estimado
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Meta Mensal
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-foreground">
                    {formatBrlFromCents(activeStudy.som_monthly_cents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Projeção realista de faturamento para o seu ponto comercial.
                  </p>
                </div>
              </div>

              {/* Sugestão de Preço */}
              <div className="p-5 sm:p-6 rounded-lg border border-border/70 bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Sugestão de Preço
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Calculado a partir do custo base, demanda e concorrência local.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    Fator: {activeStudy.dynamic_price_multiplier}x
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-xs text-muted-foreground block">Ticket Base</span>
                    <span className="text-lg font-bold font-mono text-foreground mt-1 block">
                      {formatBrlFromCents(activeStudy.base_ticket_cents)}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-xs text-muted-foreground block">
                      Sentimento (α)
                    </span>
                    <span className="text-lg font-bold font-mono text-foreground mt-1 block">
                      {activeStudy.market_sentiment_alpha >= 0 ? "+" : ""}
                      {(activeStudy.market_sentiment_alpha * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-xs text-muted-foreground block">
                      Escassez Local (β)
                    </span>
                    <span className="text-lg font-bold font-mono text-foreground mt-1 block">
                      {activeStudy.local_scarcity_beta >= 0 ? "+" : ""}
                      {(activeStudy.local_scarcity_beta * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-xs text-muted-foreground block">
                      Pressão Concorrentes (γ)
                    </span>
                    <span className="text-lg font-bold font-mono text-destructive mt-1 block">
                      -{(activeStudy.competitor_pressure_gamma * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="text-xs font-bold text-primary block">
                      Preço Ótimo Cortex 360
                    </span>
                    <span className="text-xl font-black font-mono text-foreground mt-1 block">
                      {formatBrlFromCents(activeStudy.cortex_dynamic_price_cents)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
                  <strong className="text-foreground">Diagnóstico de Precificação:</strong>{" "}
                  {activeStudy.dynamic_price_rationale}
                </p>
              </div>

              {/* Simulação de Coorte Local SimLabs 4.0 & Ponto de Equilíbrio */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 p-5 rounded-lg border border-border/70 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground">
                      Viabilidade e Ponto de Equilíbrio
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      Pesquisa ({activeStudy.simlab_synthesis.sampleSize} perfis)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-xs text-muted-foreground block">
                        Aprovação Preço Base
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {activeStudy.simlab_synthesis.basePriceApprovalRatePct}%
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-xs text-muted-foreground block">
                        Aprovação Preço Sugerido
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {activeStudy.simlab_synthesis.dynamicPriceApprovalRatePct}%
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-xs text-muted-foreground block">
                        Ponto de Equilíbrio
                      </span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {activeStudy.simlab_synthesis.breakevenOrdersPerMonth} pedidos/mês
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-xs text-muted-foreground block">
                        Peso do Aluguel / Receita
                      </span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {activeStudy.simlab_synthesis.rentToRevenueRatioPct}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <span className="text-xs font-bold uppercase text-muted-foreground block">
                      Principais Objeções:
                    </span>
                    <ul className="space-y-2 text-xs text-foreground">
                      {(activeStudy.simlab_synthesis.topObjections || []).map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-1" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Opinião dos Clientes Locais */}
                <div className="lg:col-span-7 p-5 rounded-lg border border-border/70 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-foreground">
                      Opinião dos Clientes
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {activeStudy.simlab_synthesis.municipalityPreset}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(activeStudy.simlab_synthesis.personaVerbatims || []).map((pv, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground break-words">
                            {pv.personaName}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            Classe {pv.socialClass}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                          <span>Bairro: {pv.neighborhood}</span>
                          <span>Interesse: {pv.choiceProbabilityPct}%</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed break-words">
                          &ldquo;{pv.verbatim}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VISÃO 3: CONCORRENTES NA REGIÃO ── */}
          {activeView === "comperator" && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-lg border border-border/70 bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Concorrentes no Raio de {activeStudy.radius_km} km
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Locais e estabelecimentos mapeados na região pelo sistema.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono">
                    Preço Sugerido: {formatBrlFromCents(activeStudy.cortex_dynamic_price_cents)}
                  </Badge>
                </div>

                {activeStudy.comperator_matrix.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    Nenhum concorrente direto listado neste raio.
                  </div>
                ) : (
                  <div className="overflow-x-auto table border border-border/50 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-xs font-bold text-muted-foreground">
                          <th className="p-3">Concorrente / Operador</th>
                          <th className="p-3">Distância</th>
                          <th className="p-3">Ticket Estimado</th>
                          <th className="p-3">Posicionamento</th>
                          <th className="p-3">Pontos Fortes</th>
                          <th className="p-3">Brechas para Ataque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-xs">
                        {activeStudy.comperator_matrix.map((comp) => (
                          <tr key={comp.id} className="hover:bg-muted/20">
                            <td className="p-3 font-bold text-foreground">
                              <div>{comp.name}</div>
                              <span className="text-xs font-normal text-muted-foreground">
                                Fonte: {comp.source}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-foreground">
                              {comp.distanceKm.toFixed(2)} km
                            </td>
                            <td className="p-3 font-mono font-semibold text-foreground">
                              {formatBrlFromCents(comp.estimatedTicketCents)}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {comp.pricePositioning}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {comp.strengths.join(" · ")}
                            </td>
                            <td className="p-3 text-emerald-700 dark:text-emerald-400 font-medium">
                              {comp.weaknesses.join(" · ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VISÃO 4: BUSINESS MODEL CANVAS (BMC) & MATRIZ SWOT EDITÁVEIS IN-PAGE ── */}
          {activeView === "canvas" && editableSwot && editableBmc && (
            <div className="space-y-6">
              {/* Barra de Ação para Salvar Edições In-Page */}
              <div className="p-4 rounded-lg border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground">
                    Modelagem Estratégica Editável
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Edite diretamente qualquer bloco do Business Model Canvas ou da Matriz SWOT (1 item por linha) e salve no seu workspace.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSavingCanvas}
                  onClick={() => void handleSaveCanvasAndSwot()}
                  className="h-11 px-5 rounded-lg text-xs font-bold gap-2 shrink-0"
                >
                  {isSavingCanvas ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-4 text-primary" />
                      <span>Salvar Plano</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Resumo do Negócio Editável */}
              <div className="p-5 rounded-lg border border-border/70 bg-card space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground block">
                  Resumo do Negócio
                </label>
                <textarea
                  rows={2}
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Grid de 9 Blocos do Modelo de Negócio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BMC_BLOCKS.map((block) => {
                  const currentList = editableBmc[block.key] || [];
                  return (
                    <div
                      key={block.key}
                      className="p-4 rounded-lg border border-border/70 bg-card space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{block.label}</h3>
                        <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                      </div>
                      <textarea
                        rows={4}
                        value={currentList.join("\n")}
                        onChange={(e) => {
                          const lines = e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean);
                          setEditableBmc((prev) =>
                            prev ? { ...prev, [block.key]: lines } : prev,
                          );
                        }}
                        className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs text-foreground leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Matriz de Pontos Fortes, Melhorias, Oportunidades e Riscos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                    Pontos Fortes
                  </span>
                  <textarea
                    rows={4}
                    value={(editableSwot.strengths || []).join("\n")}
                    onChange={(e) =>
                      setEditableSwot((prev) =>
                        prev
                          ? {
                              ...prev,
                              strengths: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : prev,
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 block">
                    Pontos a Melhorar
                  </span>
                  <textarea
                    rows={4}
                    value={(editableSwot.weaknesses || []).join("\n")}
                    onChange={(e) =>
                      setEditableSwot((prev) =>
                        prev
                          ? {
                              ...prev,
                              weaknesses: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : prev,
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2">
                  <span className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 block">
                    Oportunidades
                  </span>
                  <textarea
                    rows={4}
                    value={(editableSwot.opportunities || []).join("\n")}
                    onChange={(e) =>
                      setEditableSwot((prev) =>
                        prev
                          ? {
                              ...prev,
                              opportunities: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : prev,
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                  <span className="text-xs font-bold uppercase text-destructive block">
                    Riscos e Desafios
                  </span>
                  <textarea
                    rows={4}
                    value={(editableSwot.threats || []).join("\n")}
                    onChange={(e) =>
                      setEditableSwot((prev) =>
                        prev
                          ? {
                              ...prev,
                              threats: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : prev,
                      )
                    }
                    className="w-full p-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Estudos Recentes */}
          {studies.length > 1 && (
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
              <span className="text-xs font-bold uppercase text-muted-foreground block">
                Estudos e Pontos Simulados Recentemente ({studies.length})
              </span>
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar tab-list gap-2">
                {studies.map((st) => (
                  <Button
                    key={st.id}
                    type="button"
                    variant={activeStudy.id === st.id ? "secondary" : "outline"}
                    onClick={() => setActiveStudy(st)}
                    className="h-11 px-3 rounded-lg text-xs font-semibold shrink-0 gap-2"
                  >
                    <span>{st.business_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {st.city} · {st.viability_score}/100
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
