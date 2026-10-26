import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plane,
  Download,
  FolderOpen,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  Database,
  UploadCloud,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ingestOperatorSyncBatch } from "@/services/travel-operator-sync.functions";

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
  const [totalMinedTrips, setTotalMinedTrips] = useState(14);
  const [totalMinedPax, setTotalMinedPax] = useState(38);

  const checkCollectorStatus = async () => {
    setIsCheckingCollector(true);
    try {
      const res = await fetch("http://127.0.0.1:3847/api/status", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCollectorActive(true);
        if (data.totalTrips) setTotalMinedTrips(data.totalTrips);
        if (data.totalPax) setTotalMinedPax(data.totalPax);
        toast.success("Coletor local ativo e comunicando na porta 3847.");
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
        parsedItems = Array.isArray(json) ? json : [json];
      } else if (file.name.endsWith(".csv")) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          // Extrai linhas da tabela ignorando BOM UTF-8
          const dataLines = lines.slice(1);
          const reservationsMap = new Map<string, any>();

          for (const line of dataLines) {
            const cols = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
            const id = cols[0];
            if (!id) continue;

            if (!reservationsMap.has(id)) {
              reservationsMap.set(id, {
                id,
                status: cols[1] || "Confirmada",
                criacao: cols[2] || "",
                contato: cols[3] || "",
                email: cols[4] || "",
                telefone: cols[5] || "",
                hotel: cols[12] || "",
                acomodacao: cols[13] || "",
                valorTotal: cols[14] || "0,00",
                taxas: cols[15] || "0,00",
                impostos: cols[16] || "0,00",
                formaPagto: cols[17] || "Faturado",
                statusPagto: cols[18] || "Aprovado",
                scoreConfianca: Number(cols[19]) || 80,
                bancoEmissor: cols[20] || "",
                parcelamento: cols[21] || "1x",
                comissao: cols[22] || "0,00",
                passageiros: [],
              });
            }

            const current = reservationsMap.get(id);
            const paxName = cols[6];
            if (paxName) {
              current.passageiros.push({
                nome: paxName,
                cpf: cols[7] || "",
                birthDate: cols[8] || "",
                tipo: cols[10] || "ADT",
                titular: cols[11]?.toLowerCase() === "sim" || current.passageiros.length === 0,
              });
            }
          }
          parsedItems = Array.from(reservationsMap.values());
        }
      }

      if (parsedItems.length === 0) {
        toast.error("Nenhum registro de reserva válido identificado no arquivo.");
        return;
      }

      const res = await ingestOperatorSyncBatch({
        data: {
          operatorCode: "orinter",
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

          <div className="pt-2 space-y-2">
            <Button
              variant="default"
              className="w-full h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                toast.info("A pasta da extensao esta localizada em tools/infotravel-extension.");
              }}
            >
              <Download className="mr-2 size-4" />
              Ver Pasta da Extensao Chrome
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
              onClick={() => {
                toast.info("Execute 'abrir_pasta_dos_arquivos.bat' na pasta tools/infotravel-miner.");
              }}
            >
              <FolderOpen className="mr-2 size-4" />
              Abrir Pasta dos Arquivos
            </Button>
            <Button
              variant="secondary"
              className="flex-1 h-11 min-h-11 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                toast.info("Execute 'iniciar_extracao_completa.bat' no terminal do Windows.");
              }}
            >
              <Play className="mr-2 size-4" />
              Executar Extrator
            </Button>
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
    </div>
  );
}
