import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plane,
  Download,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Clock,
  ExternalLink,
  Database,
  UploadCloud,
  FileUp,
  Key,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExtensionWebStoreModal } from "@/components/extensions/ExtensionWebStoreModal";
import type { ExtensionPackageType } from "@/services/extensions-distributor.functions";
import { ingestOperatorSyncBatch, listTravelOperatorSyncRuns } from "@/services/travel-operator-sync.functions";
import { parseOperatorCsvToSyncItems } from "@/lib/travel-operator-sync";
import {
  getIngestStatusFn,
  issueIngestTokenFn,
  revokeIngestTokensFn,
  type IngestStatusDTO,
} from "@/services/whatsapp-group-ingest.functions";

interface OperatorInfo {
  id: string;
  name: string;
  engine: string;
  loginUrl: string;
  active: boolean;
  status: "connected" | "pending" | "ready";
}

const DEFAULT_OPERATORS: OperatorInfo[] = [
  {
    id: "orinter",
    name: "Orinter Tour & Travel",
    engine: "Infotravel PrimeFaces",
    loginUrl: "https://online.orinter.com.br",
    active: true,
    status: "ready",
  },
  {
    id: "incomum",
    name: "Incomum Viagens",
    engine: "Infotravel PrimeFaces",
    loginUrl: "https://reservas.incomumviagens.com.br",
    active: true,
    status: "ready",
  },
  {
    id: "frt",
    name: "FRT Operadora",
    engine: "Infotravel PrimeFaces",
    loginUrl: "https://portal.frt.com.br",
    active: true,
    status: "ready",
  },
  {
    id: "schultz",
    name: "Schultz Operadora",
    engine: "Infotravel Standard",
    loginUrl: "https://reservas.schultz.com.br",
    active: false,
    status: "pending",
  },
];

export function InfotravelIntegrationPanel() {
  const [operators, setOperators] = useState<OperatorInfo[]>(DEFAULT_OPERATORS);
  const [isCollectorActive, setIsCollectorActive] = useState(false);
  const [isCheckingCollector, setIsCheckingCollector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [totalMinedTrips, setTotalMinedTrips] = useState(0);
  const [totalMinedPax, setTotalMinedPax] = useState(0);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [webStoreType, setWebStoreType] = useState<ExtensionPackageType>("infotravel_extension");
  const [isWebStoreOpen, setIsWebStoreOpen] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<IngestStatusDTO | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [isIssuingToken, setIsIssuingToken] = useState(false);
  const [isRevokingTokens, setIsRevokingTokens] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const openStoreShowcase = (type: ExtensionPackageType) => {
    setWebStoreType(type);
    setIsWebStoreOpen(true);
  };

  const handleDownloadExtension = async (type: "infotravel_extension" | "infotravel_miner") => {
    setDownloadingType(type);
    try {
      const res = await fetch(`/api/v1/extensions/download?type=${type}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 || err?.can_request) {
          openStoreShowcase(type);
          toast.info("Acesso sob demanda. Veja as informações da extensão e solicite a liberação.");
        } else {
          toast.error(err?.error || "Acesso restrito para download desta extensão.");
        }
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let filename =
        type === "infotravel_extension"
          ? "waesy-sync-infotravel-v2.2.zip"
          : "waesy-miner-infotravel-scripts.zip";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch?.[1]) filename = filenameMatch[1];

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Download de "${filename}" concluído com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao realizar download.");
    } finally {
      setDownloadingType(null);
    }
  };

  const loadPersistedSyncStats = async () => {
    try {
      const runs = await listTravelOperatorSyncRuns({ data: { limit: 200 } });
      if (Array.isArray(runs) && runs.length > 0) {
        setTotalMinedTrips(runs.length);
      }
    } catch {
      // Mantém 0 quando não autenticado ou sem sincronizações
    }
  };

  const loadTokenStatus = async () => {
    try {
      const res = await getIngestStatusFn({ data: { featureKey: "infotravel_sync" } });
      setTokenStatus(res);
    } catch {
      // Sem permissão ou não autenticado
    }
  };

  const handleIssueToken = async () => {
    setIsIssuingToken(true);
    try {
      const res = await issueIngestTokenFn({
        data: {
          label: "Waesy Sync (Infotravel)",
          featureKey: "infotravel_sync",
        },
      });
      setIssuedToken(res.token);
      toast.success("Token Waesy Sync gerado! Copie agora para colar na extensão.");
      await loadTokenStatus();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar token Waesy Sync.");
    } finally {
      setIsIssuingToken(false);
    }
  };

  const handleRevokeTokens = async () => {
    setIsRevokingTokens(true);
    try {
      await revokeIngestTokensFn();
      setIssuedToken(null);
      setConfirmRevoke(false);
      toast.success("Tokens revogados com sucesso.");
      await loadTokenStatus();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao revogar tokens.");
    } finally {
      setIsRevokingTokens(false);
    }
  };

  const handleCopyText = (value: string, isUrl: boolean) => {
    navigator.clipboard.writeText(value);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success("Copiado para a área de transferência!");
  };

  const checkCollectorStatus = async () => {
    setIsCheckingCollector(true);
    try {
      const res = await fetch("http://127.0.0.1:3333/api/status", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCollectorActive(true);
        if (typeof data.totalTrips === "number") setTotalMinedTrips(data.totalTrips);
        if (typeof data.totalPax === "number") setTotalMinedPax(data.totalPax);
        toast.success("Coletor local ativo e comunicando na porta 3333.");
      } else {
        setIsCollectorActive(false);
      }
    } catch {
      setIsCollectorActive(false);
    } finally {
      setIsCheckingCollector(false);
    }
  };

  useEffect(() => {
    void loadPersistedSyncStats();
    void loadTokenStatus();
    void checkCollectorStatus();
  }, []);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      let parsedItems: any[] = [];

      if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsedItems = json;
        } else if (Array.isArray(json?.reservasColetadas)) {
          parsedItems = json.reservasColetadas;
        } else if (json) {
          parsedItems = [json];
        }
      } else if (file.name.endsWith(".csv")) {
        parsedItems = parseOperatorCsvToSyncItems(text, "orinter");
      }

      if (parsedItems.length === 0) {
        toast.error("Nenhum registro de reserva válido identificado no arquivo.");
        return;
      }

      const detectedOp = parsedItems[0]?.operatorSlug || "orinter";
      const res = await ingestOperatorSyncBatch({
        data: {
          operatorCode: detectedOp,
          items: parsedItems,
        },
      });

      setTotalMinedTrips((prev) => prev + res.newProcessed);
      setTotalMinedPax((prev) => prev + res.totalPax);

      toast.success(
        `Lote processado com sucesso: ${res.newProcessed} novas reservas e ${res.totalPax} passageiros sincronizados!`
      );
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar o arquivo de reservas.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const toggleOperator = (id: string) => {
    setOperators((prev) =>
      prev.map((op) => (op.id === id ? { ...op, active: !op.active } : op))
    );
    toast.success("Preferencia de operadora atualizada.");
  };

  return (
    <div className="space-y-6">
      {/* Header com badge de autoridade e status de sincronizacao */}
      <div className="rounded-lg border border-border/60 bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plane className="size-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Infotravel e Operadoras de Turismo
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronizacao bidirecional de reservas, historico de clientes, passageiros individuais e tarifas operacionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isCollectorActive ? "default" : "outline"}
              className="gap-2 px-3 py-1 text-xs"
            >
              <span
                className={`size-2 rounded-full ${
                  isCollectorActive ? "bg-emerald-400 animate-pulse motion-reduce:animate-none" : "bg-muted-foreground"
                }`}
              />
              <span>{isCollectorActive ? "Coletor Local Conectado" : "Aguardando Coletor Local"}</span>
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={checkCollectorStatus}
              disabled={isCheckingCollector}
              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className={`mr-2 size-3.5 ${isCheckingCollector ? "animate-spin motion-reduce:animate-none" : ""}`} />
              Verificar Conexao
            </Button>
          </div>
        </div>

        {/* Metricas Consolidadas */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <span className="text-2xs font-medium text-muted-foreground">Reservas Processadas</span>
            <div className="mt-1 text-2xl font-black text-foreground">{totalMinedTrips}</div>
            <span className="text-2xs text-emerald-500 font-medium">Historico consolidado</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <span className="text-2xs font-medium text-muted-foreground">Passageiros (Pax) Individuais</span>
            <div className="mt-1 text-2xl font-black text-foreground">{totalMinedPax}</div>
            <span className="text-2xs text-muted-foreground font-medium">Cadastros unicos</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <span className="text-2xs font-medium text-muted-foreground">Operadoras Mapeadas</span>
            <div className="mt-1 text-2xl font-black text-foreground">{operators.length}</div>
            <span className="text-2xs text-muted-foreground font-medium">Infotravel PrimeFaces</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <span className="text-2xs font-medium text-muted-foreground">Ledger Imutavel</span>
            <div className="mt-1 text-2xl font-black text-foreground">Perpetuo</div>
            <span className="text-2xs text-emerald-500 font-medium">travel_price_observations</span>
          </div>
        </div>
      </div>

      {/* Grid de Modos Operacionais (Extensao vs Extrator Local) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Extensao Chrome Manifest V3 */}
        <div className="rounded-lg border border-border/60 bg-card p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                  <Cpu className="size-4.5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Extensao Chrome Oficial</h3>
              </div>
              <Badge variant="outline" className="font-mono text-2xs">
                Manifest V3
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Opera em segundo plano enquanto a agencia de turismo emite reservas. Captura reservas, contatos,
              passageiros e status de boletos diretamente do DOM com intervalo randômico anti-bloqueio.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 border border-border/40">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Como instalar no Google Chrome:
              </span>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal pl-4">
                <li>
                  Acesse <code className="bg-background px-2 py-1 rounded text-2xs">chrome://extensions</code> no navegador.
                </li>
                <li>Ative o interruptor <strong>Modo do desenvolvedor</strong> no canto superior direito.</li>
                <li>Clique em <strong>Carregar sem compactacao</strong>.</li>
                <li>
                  Selecione a pasta:{" "}
                  <code className="bg-background px-2 py-1 rounded text-2xs font-mono break-all">
                    tools/infotravel-extension
                  </code>
                </li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              className="flex-1 h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              disabled={downloadingType === "infotravel_extension"}
              onClick={() => handleDownloadExtension("infotravel_extension")}
            >
              {downloadingType === "infotravel_extension" ? (
                <RefreshCw className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              {downloadingType === "infotravel_extension"
                ? "Empacotando..."
                : "Baixar Extensão (.zip)"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => openStoreShowcase("infotravel_extension")}
            >
              <ExternalLink className="mr-2 size-4" />
              Ver na Store / Acesso
            </Button>
          </div>
        </div>

        {/* Card 2: Extrator Autonomo Local (Playwright CLI) */}
        <div className="rounded-lg border border-border/60 bg-card p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <FileSpreadsheet className="size-4.5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Extrator Autonomo Local</h3>
              </div>
              <Badge variant="outline" className="font-mono text-2xs">
                Playwright + CSV
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Varre paginas inteiras de reservas em lote com sessao persistida (.chrome-session), gerando
              arquivos CSV formatados com BOM UTF-8 e ponto-e-virgula para abertura direta no Microsoft Excel.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 border border-border/40">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Clock className="size-3.5 text-primary" />
                Arquivos e Launchers em 1 Clique (tools/infotravel-miner/):
              </span>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  <strong className="text-foreground">iniciar_teste_piloto.bat:</strong> Varre as primeiras paginas para teste.
                </li>
                <li>
                  <strong className="text-foreground">iniciar_extracao_completa.bat:</strong> Varre todas as reservas com paginacao.
                </li>
                <li>
                  <strong className="text-foreground">abrir_pasta_dos_arquivos.bat:</strong> Abre o Excel e os arquivos CSV na hora.
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              disabled={downloadingType === "infotravel_miner"}
              onClick={() => handleDownloadExtension("infotravel_miner")}
            >
              {downloadingType === "infotravel_miner" ? (
                <RefreshCw className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              {downloadingType === "infotravel_miner"
                ? "Empacotando..."
                : "Baixar Scripts (.zip)"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => openStoreShowcase("infotravel_miner")}
            >
              <ExternalLink className="mr-2 size-4" />
              Ver na Store
            </Button>
          </div>
        </div>
      </div>

      {/* Token de Autenticação Bearer para Waesy Sync */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Credencial Bearer Waesy Sync</h3>
              <p className="text-xs text-muted-foreground">
                Cole a URL do servidor e o token wae_... na aba Conexão Waesy da extensão.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tokenStatus?.hasActiveToken && !confirmRevoke && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRevokingTokens}
                onClick={() => setConfirmRevoke(true)}
                className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Revogar Tokens
              </Button>
            )}

            {tokenStatus?.hasActiveToken && confirmRevoke && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isRevokingTokens}
                  onClick={handleRevokeTokens}
                  className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isRevokingTokens ? "Revogando..." : "Confirmar Revogação"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRevoke(false)}
                  className="h-11 min-h-11 px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isIssuingToken}
              onClick={handleIssueToken}
              className="h-11 min-h-11 px-4 text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Key className="mr-2 size-3.5" />
              {isIssuingToken ? "Gerando..." : "Gerar Novo Token"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              URL do Servidor Waesy
            </span>
            <div className="flex gap-2">
              <Input
                readOnly
                value={typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br"}
                className="h-11 font-mono text-xs bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  handleCopyText(
                    typeof window !== "undefined" ? window.location.origin : "https://waesy.com.br",
                    true
                  )
                }
                aria-label="Copiar URL do Servidor"
                className="h-11 min-h-11 w-11 px-0 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copiedUrl ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {issuedToken ? "Novo Token Gerado (Copie Agora)" : "Status dos Tokens"}
            </span>
            {issuedToken ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={issuedToken}
                  className="h-11 font-mono text-xs bg-muted/40 font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyText(issuedToken, false)}
                  aria-label="Copiar Token"
                  className="h-11 min-h-11 w-11 px-0 shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copiedToken ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
            ) : (
              <div className="h-11 rounded-md border border-border bg-muted/30 px-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {tokenStatus?.hasActiveToken
                    ? `${tokenStatus.activeTokenCount} token(s) ativo(s)`
                    : "Nenhum token ativo — clique em Gerar Novo Token"}
                </span>
                {tokenStatus?.lastUsedAt && (
                  <span className="text-2xs">
                    Último uso: {new Date(tokenStatus.lastUsedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Operadoras Conectadas */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Operadoras e Portais Compatíveis</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Motores Infotravel mapeados com seletores PrimeFaces e extratores de passageiros.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            {operators.filter((o) => o.active).length} ativas
          </Badge>
        </div>

        <div className="divide-y divide-border/40">
          {operators.map((op) => (
            <div key={op.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {op.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{op.name}</span>
                    <Badge variant={op.active ? "default" : "secondary"} className="text-2xs py-0 px-2">
                      {op.active ? "Habilitada" : "Desabilitada"}
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground break-words mt-1">
                    Motor: {op.engine} &middot; URL: {op.loginUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <a href={op.loginUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5 mr-2" />
                    Abrir Portal
                  </a>
                </Button>

                <Switch
                  checked={op.active}
                  onCheckedChange={() => toggleOperator(op.id)}
                  aria-label={`Ativar integracao com ${op.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Importacao Direta de Arquivos Extraidos (CSV / JSON) */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <UploadCloud className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Importacao de Dados de Operadoras</h3>
              <p className="text-xs text-muted-foreground">
                Importe os arquivos CSV ou JSON gerados pelo extrator ou pela extensao para sincronizar com o banco.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
            BOM UTF-8 &middot; Ponto-e-Virgula
          </Badge>
        </div>

        <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <FileUp className="size-8 text-muted-foreground/70" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              Selecione o arquivo exportado da pasta do minerador
            </p>
            <p className="text-2xs text-muted-foreground max-w-md">
              Suporta tanto o arquivo <code className="font-mono bg-background px-1 py-1 rounded text-2xs">clientes_excelencia_tour_oficial.csv</code> quanto <code className="font-mono bg-background px-1 py-1 rounded text-2xs">.json</code>.
            </p>
          </div>

          <div className="pt-1">
            <label
              htmlFor="operator-file-upload"
              className={`inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                isUploading
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              } focus-within:ring-2 focus-within:ring-ring`}
            >
              <UploadCloud className={`mr-2 size-4 ${isUploading ? "animate-bounce motion-reduce:animate-none" : ""}`} />
              <span>{isUploading ? "Processando e persistindo no banco..." : "Selecionar Arquivo CSV ou JSON"}</span>
              <input
                id="operator-file-upload"
                type="file"
                accept=".csv,.json"
                className="sr-only"
                disabled={isUploading}
                onChange={handleFileImport}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Inteligencia de Credito & Ledger Perpetuo */}
      <div className="rounded-lg border border-border/60 bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <Database className="size-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Inteligencia de Credito e Historico de Tarifas
            </h3>
            <p className="text-xs text-muted-foreground">
              Regras server-side com isolamento de perfil e registro imutavel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Desacoplamento Pagador vs Passageiro
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O poder de compra e historico de parcelamento pertencem unicamente ao pagador líder da compra.
              Beneficiários, filhos ou companheiros de viagem possuem historico solo e nao herdam limite sem lastro.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Auditoria de CNPJ &amp; Ledger Imutavel
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cargos executivos exigem validacao cadastral de CNPJ ativo com capital compativel. Todas as cotacoes
              OCR sao gravadas perpetuamente em <code>travel_price_observations</code> para modelos de demanda e sazonalidade.
            </p>
          </div>
        </div>
      </div>

      <ExtensionWebStoreModal
        isOpen={isWebStoreOpen}
        onClose={() => setIsWebStoreOpen(false)}
        extensionType={webStoreType}
        onDownloadDirect={(t) => handleDownloadExtension(t as any)}
      />
    </div>
  );
}
