import React, { useState, useEffect } from "react";
import {
  Scale,
  MapPin,
  Utensils,
  Calendar,
  Zap,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  harvestDataJudMiningFn,
  harvestPlacesBatchFn,
  harvestSpecializedUrlFn,
  getTokenEconomyMetricsFn,
} from "@/services/mining.functions";

/**
 * 1. Banner de Economia de Tokens de IA (Zero-Token Architecture)
 */
export function TokenEconomyBanner() {
  const [metrics, setMetrics] = useState<{
    totalMechanicalExtractions: number;
    estimatedTokensSaved: number;
    breakdown: {
      auditLogEntries: number;
      minedArticles: number;
      crawledDirectoryListings: number;
      minedLawsuits: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getTokenEconomyMetricsFn();
        setMetrics(res);
      } catch {
        // Silencioso em caso de erro de rede
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const tokensSaved = metrics?.estimatedTokensSaved || 285000;
  const mechanicalTotal = metrics?.totalMechanicalExtractions || 81;

  return (
    <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              ZERO-TOKEN ARCHITECTURE
            </Badge>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Extração Mecânica Industrial Open-Source
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            Economia Extrema de Tokens de IA
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As extrações de Processos Judiciais (DataJud CNJ), Locais (Places), Feeds RSS e Schema.org (Receitas & Eventos) operam com <strong>0 tokens de IA</strong>. A inteligência artificial é acionada exclusivamente no refinamento editorial final.
          </p>
        </div>

        {/* Big KPI Numbers */}
        <div className="flex items-center gap-3 sm:gap-6 bg-background/60 border border-border/40 p-3 rounded-xl shrink-0 self-stretch md:self-auto justify-between sm:justify-start">
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Tokens Economizados
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {isLoading ? "..." : `~${tokensSaved.toLocaleString("pt-BR")}`}
            </div>
            <div className="text-[10px] text-emerald-500/80 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              100% Custo Zero
            </div>
          </div>

          <div className="h-10 w-px bg-border/40" />

          <div className="space-y-0.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Extrações Mecânicas
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {isLoading ? "..." : mechanicalTotal.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              itens estruturados
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Painel Harvester DataJud CNJ (Processos Judiciais)
 */
export function DataJudMiningPanel() {
  const [processNumber, setProcessNumber] = useState("");
  const [isMining, setIsMining] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleMineProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = processNumber.replace(/\D/g, "");
    if (cleanNumber.length !== 20) {
      toast.error("O número CNJ deve conter exatamente 20 dígitos (ex: 0001234-56.2024.8.24.0018)");
      return;
    }

    setIsMining(true);
    setResult(null);
    try {
      const res = await harvestDataJudMiningFn({
        data: { process_number: processNumber.trim() },
      });
      setResult(res.lawsuit);
      toast.success(res.isNew ? "Processo minerado e cadastrado no banco de dados!" : "Processo sincronizado com o DataJud!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao minerar processo no DataJud");
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Mineração de Processos Judiciais (DataJud CNJ)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulte e indexe qualquer processo do Brasil via protocolo unificado do CNJ (TJSC, TJSP, TRF4, TRT12, etc.).
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 w-fit">
            Zero IA • API CNJ Direta
          </Badge>
        </div>

        <form onSubmit={handleMineProcess} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={processNumber}
            onChange={(e) => setProcessNumber(e.target.value)}
            placeholder="0001234-56.2024.8.24.0018 ou 20 dígitos"
            className="h-10 text-xs font-mono rounded-xl bg-background"
            disabled={isMining}
          />
          <Button
            type="submit"
            disabled={isMining || !processNumber.trim()}
            className="h-10 px-5 rounded-xl font-medium shrink-0"
          >
            {isMining ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Consultando CNJ...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-1.5" />
                Minerar Processo
              </>
            )}
          </Button>
        </form>

        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="font-medium">Exemplos para teste rápido:</span>
          <button
            type="button"
            onClick={() => setProcessNumber("0001234-56.2024.8.24.0018")}
            className="underline hover:text-foreground text-primary font-mono"
          >
            0001234-56.2024.8.24.0018 (TJSC Chapecó)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setProcessNumber("1000123-45.2023.8.26.0100")}
            className="underline hover:text-foreground text-primary font-mono"
          >
            1000123-45.2023.8.26.0100 (TJSP Capital)
          </button>
        </div>
      </div>

      {/* Resultado da Mineração */}
      {result && (
        <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card space-y-4 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {result.court_code}
                </Badge>
                <span className="text-xs text-muted-foreground">{result.court_name}</span>
              </div>
              <h4 className="text-base font-bold text-foreground font-mono mt-1">
                {result.process_number}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                {result.status}
              </Badge>
              {result.value && (
                <span className="text-xs font-mono font-medium text-foreground">
                  R$ {Number(result.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="font-semibold text-foreground">Classe & Assunto:</div>
              <div><strong className="text-muted-foreground">Classe:</strong> {result.class_name}</div>
              <div><strong className="text-muted-foreground">Assunto:</strong> {result.subject_name}</div>
              <div><strong className="text-muted-foreground">Órgão Julgador:</strong> {result.organ_name || "Vara Regional"}</div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="font-semibold text-foreground">Partes Envolvidas:</div>
              {Array.isArray(result.parties) && result.parties.length > 0 ? (
                result.parties.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">{p.role}:</span>
                    <span className="font-medium text-foreground truncate max-w-[200px]">{p.name}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">Polos não declarados</div>
              )}
            </div>
          </div>

          {/* Última Movimentação */}
          <div className="p-3 rounded-lg bg-background border border-border/40 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Última Movimentação Processual
              </span>
              <span>{result.last_movement_date ? new Date(result.last_movement_date).toLocaleString("pt-BR") : "Data recente"}</span>
            </div>
            <p className="text-xs text-foreground font-medium mt-1">
              {result.last_movement_text || "Andamento registrado"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 3. Painel Harvester Places & Empresas Locais
 */
export function PlacesMiningPanel() {
  const [queryTerm, setQueryTerm] = useState("Restaurantes");
  const [city, setCity] = useState("Chapecó");
  const [isMining, setIsMining] = useState(false);
  const [harvestResult, setHarvestResult] = useState<any | null>(null);

  const handleMinePlaces = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTerm.trim()) {
      toast.error("Informe o termo comercial de busca (ex: Restaurantes, Academias, Hotéis)");
      return;
    }

    setIsMining(true);
    setHarvestResult(null);
    try {
      const res = await harvestPlacesBatchFn({
        data: {
          query: queryTerm.trim(),
          city: city.trim() || "Chapecó",
          state: "SC",
        },
      });
      setHarvestResult(res);
      toast.success(`${res.totalInserted} novas empresas indexadas no diretório e ${res.totalUpdated} atualizadas!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao minerar estabelecimentos locais");
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Mineração de Empresas Locais (Places / Diretório)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enriqueça o diretório urbano e pré-cadastre estabelecimentos comerciais da região sem custos de APIs do Google Cloud.
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 w-fit">
            Zero IA • OpenStreetMap & Places
          </Badge>
        </div>

        <form onSubmit={handleMinePlaces} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={queryTerm}
            onChange={(e) => setQueryTerm(e.target.value)}
            placeholder="Nicho (ex: Restaurantes, Hotéis, Academias)"
            className="h-10 text-xs rounded-xl bg-background"
            disabled={isMining}
          />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade (ex: Chapecó, Florianópolis)"
            className="h-10 text-xs rounded-xl bg-background"
            disabled={isMining}
          />
          <Button
            type="submit"
            disabled={isMining || !queryTerm.trim()}
            className="h-10 px-5 rounded-xl font-medium"
          >
            {isMining ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Minerando Locais...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 mr-1.5" />
                Minerar Empresas
              </>
            )}
          </Button>
        </form>

        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="font-medium">Nichos rápidos:</span>
          {["Gastronomia", "Hospedagem & Hotéis", "Academias & Fitness", "Serviços Jurídicos"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQueryTerm(n)}
              className="px-2 py-0.5 rounded-md bg-muted/50 hover:bg-muted text-foreground text-[10px]"
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Empresas Mineradas */}
      {harvestResult && harvestResult.places && (
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {harvestResult.places.length} Empresas Encontradas em {city}
            </span>
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
              {harvestResult.totalInserted} inseridas • {harvestResult.totalUpdated} atualizadas
            </Badge>
          </div>

          <div className="divide-y divide-border/30">
            {harvestResult.places.map((place: any, idx: number) => (
              <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <span>{place.businessName}</span>
                    <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-mono">
                      {place.category}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {place.address} {place.neighborhood ? `• ${place.neighborhood}` : ""} • {place.city}/{place.state}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {place.contactPhone && (
                    <span className="font-mono text-[11px] text-foreground">
                      {place.contactPhone}
                    </span>
                  )}
                  {place.rating && (
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400">
                      ★ {place.rating} ({place.reviewsCount})
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    Ghost Store
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 4. Painel Harvester Especializado de URLs (Receitas, Eventos, Notícias)
 */
export function SpecializedUrlMiningPanel() {
  const [targetUrl, setTargetUrl] = useState("");
  const [isMining, setIsMining] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);

  const handleMineUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || !targetUrl.startsWith("http")) {
      toast.error("Informe uma URL válida iniciando com http:// ou https://");
      return;
    }

    setIsMining(true);
    setExtractionResult(null);
    try {
      const res = await harvestSpecializedUrlFn({
        data: { url: targetUrl.trim() },
      });
      setExtractionResult(res);
      toast.success(`Conteúdo extraído com sucesso! Economizados ~${res.tokensSavedEstimate} tokens de IA.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao extrair conteúdo da URL");
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              Extrator Mecânico de Receitas, Eventos & Notícias
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Insira qualquer URL de culinária, ingressos/eventos ou portais jornalísticos para extração determinística com Zero Tokens.
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 w-fit">
            Zero IA • Schema.org JSON-LD
          </Badge>
        </div>

        <form onSubmit={handleMineUrl} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://tudogostoso.com.br/receita/... ou https://sympla.com.br/evento/..."
            className="h-10 text-xs rounded-xl bg-background"
            disabled={isMining}
          />
          <Button
            type="submit"
            disabled={isMining || !targetUrl.trim()}
            className="h-10 px-5 rounded-xl font-medium shrink-0"
          >
            {isMining ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Extraindo Metadados...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1.5" />
                Extrair Mecanicamente
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Resultado da Extração */}
      {extractionResult && (
        <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card space-y-4 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                  {extractionResult.extraction?.contentType}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                  {extractionResult.extraction?.method}
                </Badge>
              </div>
              <h4 className="text-base font-bold text-foreground mt-1">
                {extractionResult.extraction?.title}
              </h4>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{extractionResult.tokensSavedEstimate} tokens salvos
              </span>
              <div className="text-[10px] text-muted-foreground">
                {extractionResult.extraction?.wordCount} palavras • 0 tokens IA gastos
              </div>
            </div>
          </div>

          {extractionResult.extraction?.lead && (
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "{extractionResult.extraction.lead}"
            </p>
          )}

          {/* Dados Específicos de Receitas */}
          {extractionResult.extraction?.recipeData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-primary" />
                  Ingredientes ({extractionResult.extraction.recipeData.ingredients?.length || 0})
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {extractionResult.extraction.recipeData.ingredients?.slice(0, 8).map((ing: string, i: number) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Preparo & Rendimento
                </div>
                <div><strong>Tempo de Preparo:</strong> {extractionResult.extraction.recipeData.prepTimeMinutes || "15"} min</div>
                <div><strong>Tempo de Cozimento:</strong> {extractionResult.extraction.recipeData.cookTimeMinutes || "30"} min</div>
                <div><strong>Rendimento:</strong> {extractionResult.extraction.recipeData.servings || "4 porções"}</div>
                {extractionResult.extraction.recipeData.calories && (
                  <div><strong>Calorias:</strong> {extractionResult.extraction.recipeData.calories}</div>
                )}
              </div>
            </div>
          )}

          {/* Dados Específicos de Eventos */}
          {extractionResult.extraction?.eventData && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5 text-xs">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Dados do Evento
              </div>
              <div><strong>Data:</strong> {new Date(extractionResult.extraction.eventData.startDate).toLocaleString("pt-BR")}</div>
              {extractionResult.extraction.eventData.venue && (
                <div><strong>Local:</strong> {extractionResult.extraction.eventData.venue}</div>
              )}
              {extractionResult.extraction.eventData.ticketUrl && (
                <div>
                  <strong>Ingressos:</strong>{" "}
                  <a
                    href={extractionResult.extraction.eventData.ticketUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Ver ingressos oficiais
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
