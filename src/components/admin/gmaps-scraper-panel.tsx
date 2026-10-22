import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Play, RefreshCw, Save, ShieldCheck, Server, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { enrichListingContactsFn, type ContactEnrichmentResult } from "@/services/contact-enrichment.functions";
import {
  collectGmapsScrapeJob,
  getGmapsScraperSettings,
  saveGmapsScraperSettings,
  startGmapsScrapeJob,
  testGmapsScraperConnection,
} from "@/services/gmaps-scraper.functions";

type ConnectionState = { ok: boolean; latencyMs: number; error?: string } | null;
type RunState = { phase: "idle" | "running" | "done" | "error"; message?: string; found?: number; inserted?: number; updated?: number };

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 120;

export function GmapsScraperPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [tokenMasked, setTokenMasked] = useState("");
  const [depth, setDepth] = useState(3);
  const [extractEmail, setExtractEmail] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>(null);

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [run, setRun] = useState<RunState>({ phase: "idle" });
  const cancelled = useRef(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<ContactEnrichmentResult | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const s = await getGmapsScraperSettings();
      setBaseUrl(s.baseUrl);
      setTokenMasked(s.tokenMasked);
      setDepth(s.depth);
      setExtractEmail(s.extractEmail);
      setIsActive(s.isActive);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Falha ao carregar configuração.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    void load();
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      toast.error("Informe a URL do scraper.");
      return;
    }
    setIsSaving(true);
    try {
      await saveGmapsScraperSettings({
        data: { baseUrl: baseUrl.trim(), token: token.trim() || undefined, depth, extractEmail, isActive },
      });
      toast.success("Integração salva.");
      setToken("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setConnection(null);
    try {
      const res = await testGmapsScraperConnection({
        data: { baseUrl: baseUrl.trim() || undefined, token: token.trim() || undefined },
      });
      setConnection(res);
    } catch (err) {
      setConnection({ ok: false, latencyMs: 0, error: err instanceof Error ? err.message : "Falha no teste." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRun = async () => {
    if (!query.trim() || !city.trim()) {
      toast.error("Informe categoria e cidade.");
      return;
    }
    const input = { query: query.trim(), city: city.trim(), state: uf.trim().toUpperCase() || undefined };
    setRun({ phase: "running", message: "Enviando job ao scraper..." });
    try {
      const { jobId } = await startGmapsScrapeJob({ data: input });
      for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
        if (cancelled.current) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await collectGmapsScrapeJob({ data: { ...input, jobId } });
        if (res.status === "failed") {
          setRun({ phase: "error", message: "O scraper reportou falha no job." });
          return;
        }
        if (res.status === "ok") {
          setRun({ phase: "done", found: res.found, inserted: res.inserted, updated: res.updated });
          return;
        }
        setRun({ phase: "running", message: `Coletando... (${attempt * (POLL_INTERVAL_MS / 1000)}s)` });
      }
      setRun({ phase: "error", message: "Tempo esgotado aguardando o scraper." });
    } catch (err) {
      setRun({ phase: "error", message: err instanceof Error ? err.message : "Erro ao executar." });
    }
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichError(null);
    setEnrichResult(null);
    try {
      setEnrichResult(await enrichListingContactsFn({ data: { limit: 10, city: city.trim() || undefined } }));
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Erro ao enriquecer contatos.");
    } finally {
      setIsEnriching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        <span>Carregando</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 rounded-lg border border-destructive/40 text-sm text-destructive space-y-3" role="alert">
        <p>{loadError}</p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg border border-border/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <MapPin className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Google Maps Scraper</h3>
                <Badge variant="outline">{isActive ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">VPS com Docker. Alimenta o diretório de empresas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-4" />
            <span>Token criptografado</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-lg border border-border/70 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="gmaps-url">URL do scraper</Label>
          <Input
            id="gmaps-url"
            className="h-11"
            placeholder="https://maps.seudominio.com.br"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            inputMode="url"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gmaps-token">Token de acesso</Label>
          <Input
            id="gmaps-token"
            className="h-11"
            type="password"
            placeholder={tokenMasked || "Opcional, definido no proxy Caddy"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gmaps-depth">Profundidade</Label>
            <Input
              id="gmaps-depth"
              className="h-11"
              type="number"
              min={1}
              max={20}
              value={depth}
              onChange={(e) => setDepth(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 min-h-11">
            <Label htmlFor="gmaps-email">Extrair e-mail do site</Label>
            <Switch id="gmaps-email" checked={extractEmail} onCheckedChange={setExtractEmail} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 min-h-11">
          <Label htmlFor="gmaps-active">Integração ativa</Label>
          <Switch id="gmaps-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {connection && (
          <p role="status" className={`text-sm ${connection.ok ? "text-foreground" : "text-destructive"}`}>
            {connection.ok ? `Conectado (${connection.latencyMs} ms)` : `Falha: ${connection.error}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" isLoading={isSaving}>
            <Save /> Salvar
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Server />} Testar conexão
          </Button>
        </div>
      </form>

      <div className="p-6 rounded-lg border border-border/70 space-y-4">
        <h3 className="text-base font-bold text-foreground">Coleta manual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr] gap-3">
          <Input className="h-11" aria-label="Categoria" placeholder="Categoria (ex.: pizzarias)" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Input className="h-11" aria-label="Cidade" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input className="h-11" aria-label="UF" placeholder="UF" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={handleRun} disabled={!isActive || run.phase === "running"}>
          {run.phase === "running" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />} Coletar
        </Button>
        {!isActive && <p className="text-xs text-muted-foreground">Ative e salve a integração para coletar.</p>}
        {run.phase === "running" && <p role="status" className="text-sm text-muted-foreground">{run.message}</p>}
        {run.phase === "error" && <p role="alert" className="text-sm text-destructive">{run.message}</p>}
        {run.phase === "done" && (
          <p role="status" className="text-sm text-foreground">
            {run.found === 0
              ? "Nenhum resultado encontrado."
              : `${run.found} encontrados, ${run.inserted} novos, ${run.updated} atualizados.`}
          </p>
        )}
      </div>

      <div className="p-6 rounded-lg border border-border/70 space-y-4">
        <h3 className="text-base font-bold text-foreground">Enriquecer contatos</h3>
        <p className="text-xs text-muted-foreground">Lê o site de 10 empresas sem e-mail e salva e-mail, WhatsApp e redes sociais. Usa o pool gratuito Firecrawl e Steel.</p>
        <Button type="button" variant="outline" onClick={handleEnrich} disabled={isEnriching}>
          {isEnriching ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Mail />} Enriquecer
        </Button>
        {enrichError && <p role="alert" className="text-sm text-destructive">{enrichError}</p>}
        {enrichResult && (enrichResult.processed === 0 ? <p role="status" className="text-sm text-muted-foreground">Nenhuma empresa pendente.</p> : <p role="status" className="text-sm text-foreground">{`${enrichResult.processed} lidas, ${enrichResult.enriched} enriquecidas, ${enrichResult.skipped} sem contato, ${enrichResult.failed} com falha.`}</p>)}
      </div>
    </div>
  );
}
