import { useState } from "react";
import {
  Database,
  Server,
  Zap,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Cpu,
  Layers,
  Activity,
  HardDrive,
  Radio,
  Lock,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  testWaesyCloudHealth,
  generateJwtKeysFromSecret,
  autoBindWaesyCloudDatabase,
  switchDatabaseTarget,
  type WaesyCloudStatusDTO,
  type WaesyServiceHealthDTO,
} from "@/services/waesy-cloud.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface WaesyCloudIntegrationPanelProps {
  initialStatus?: WaesyCloudStatusDTO;
  onRefresh?: () => void;
}

export function WaesyCloudIntegrationPanel({
  initialStatus,
  onRefresh,
}: WaesyCloudIntegrationPanelProps) {
  const [activeTarget, setActiveTarget] = useState<
    "supabase_cloud" | "waesy_cloud_sovereign" | "custom_postgres"
  >(initialStatus?.activeTarget || "supabase_cloud");

  const [services, setServices] = useState<WaesyServiceHealthDTO[]>(
    initialStatus?.services || []
  );
  const [avgLatency, setAvgLatency] = useState<number | null>(
    initialStatus?.avgLatencyMs ?? 16
  );
  const [overallStatus, setOverallStatus] = useState<
    "healthy" | "degraded" | "offline" | "untested"
  >(initialStatus?.overallStatus || "healthy");

  // Auto-Bind Modal State
  const [isAutoBindOpen, setIsAutoBindOpen] = useState(false);
  const [autoBindUrl, setAutoBindUrl] = useState("http://165.176.204.120:8000");
  const [autoBindJwtSecret, setAutoBindJwtSecret] = useState(
    "WaesyCloud_JwtSecret_2026_Sovereign_Master_Key_32Chars"
  );
  const [autoBindDbUrl, setAutoBindDbUrl] = useState(
    "postgresql://waesy_admin:SuaSenhaSuperSegura123_Waesy@165.176.204.120:5432/waesy_production"
  );
  const [isBinding, setIsBinding] = useState(false);
  const [testedServices, setTestedServices] = useState<WaesyServiceHealthDTO[]>([]);

  // JWT Tool State
  const [jwtToolSecret, setJwtToolSecret] = useState("");
  const [generatedAnon, setGeneratedAnon] = useState("");
  const [generatedService, setGeneratedService] = useState("");
  const [isGeneratingJwt, setIsGeneratingJwt] = useState(false);

  // Healthcheck manual runner
  const [isTestingHealth, setIsTestingHealth] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleRunHealthCheck = async () => {
    setIsTestingHealth(true);
    try {
      const res = await testWaesyCloudHealth({
        data: { baseUrl: initialStatus?.targetBaseUrl || "http://localhost:54321" },
      });
      setServices(res.services);
      setAvgLatency(res.avgLatencyMs);
      setOverallStatus(res.overallStatus);
      toast.success("Diagnóstico dos 5 microsserviços concluído com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar saúde dos serviços.");
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handleGenerateJwtKeys = async () => {
    if (!jwtToolSecret || jwtToolSecret.length < 16) {
      toast.error("O JWT Secret deve conter pelo menos 16 caracteres.");
      return;
    }
    setIsGeneratingJwt(true);
    try {
      const res = await generateJwtKeysFromSecret({
        data: { jwtSecret: jwtToolSecret },
      });
      setGeneratedAnon(res.anonKey);
      setGeneratedService(res.serviceRoleKey);
      toast.success("Par de chaves gerado com algoritmo HMAC-SHA256!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar chaves.");
    } finally {
      setIsGeneratingJwt(false);
    }
  };

  const handleExecuteAutoBind = async () => {
    setIsBinding(true);
    try {
      // 1. Testa conectividade preliminar
      const health = await testWaesyCloudHealth({
        data: { baseUrl: autoBindUrl },
      });
      setTestedServices(health.services);

      // 2. Executa autovinculação e persiste chaves
      const res = await autoBindWaesyCloudDatabase({
        data: {
          baseUrl: autoBindUrl,
          jwtSecret: autoBindJwtSecret,
          databaseUrl: autoBindDbUrl,
          clusterName: "Waesy Cloud Soberano Local",
        },
      });

      setActiveTarget("waesy_cloud_sovereign");
      setServices(health.services);
      setOverallStatus(health.overallStatus);
      toast.success(res.message);
      setIsAutoBindOpen(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Erro na autovinculação do banco de dados.");
    } finally {
      setIsBinding(false);
    }
  };

  const handleSwitchTarget = async (
    target: "supabase_cloud" | "waesy_cloud_sovereign" | "custom_postgres"
  ) => {
    try {
      const res = await switchDatabaseTarget({ data: { target } });
      setActiveTarget(target);
      toast.success(res.message);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Falha ao alternar alvo de banco de dados.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── BANNER PRINCIPAL: VISÃO SOBERANA ───────────────────────────────── */}
      <div className="p-6 rounded-lg bg-card border border-border/70 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-md bg-primary/10 text-primary">
                <Database className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Waesy Cloud — Infraestrutura Soberana & BaaS
                </h2>
                <p className="text-xs text-muted-foreground">
                  Camada nativa de banco de dados, APIs PostgREST, Autenticação GoTrue, Storage S3 e Realtime CDC.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunHealthCheck}
              disabled={isTestingHealth}
              className="h-11 min-h-11 text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className={`size-4 ${isTestingHealth ? "animate-spin motion-reduce:animate-none" : ""}`} />
              Testar Saúde
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsAutoBindOpen(true)}
              className="h-11 min-h-11 text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="size-4" />
              Autovincular Waesy Cloud
            </Button>
          </div>
        </div>

        {/* ─── SWITCHER DE ALVO ATIVO ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Opção 1: Supabase Cloud */}
          <button
            type="button"
            onClick={() => handleSwitchTarget("supabase_cloud")}
            className={`p-4 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTarget === "supabase_cloud"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border/70 bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Supabase Cloud</span>
              {activeTarget === "supabase_cloud" ? (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">SaaS</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hospedagem gerenciada oficial externa na nuvem da Supabase.
            </p>
          </button>

          {/* Opção 2: Waesy Cloud Soberano */}
          <button
            type="button"
            onClick={() => handleSwitchTarget("waesy_cloud_sovereign")}
            className={`p-4 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTarget === "waesy_cloud_sovereign"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border/70 bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <Database className="size-3.5 text-primary" />
                Waesy Cloud Soberano
              </span>
              {activeTarget === "waesy_cloud_sovereign" ? (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Local / VPS</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stack completa própria (PostgreSQL 17, PostgREST, Auth e Storage).
            </p>
          </button>

          {/* Opção 3: PostgreSQL Customizado */}
          <button
            type="button"
            onClick={() => handleSwitchTarget("custom_postgres")}
            className={`p-4 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTarget === "custom_postgres"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border/70 bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">PostgreSQL Direto</span>
              {activeTarget === "custom_postgres" ? (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Externo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conexão TCP direta com banco de dados Postgres corporativo.
            </p>
          </button>
        </div>

        {/* ─── STATUS BAR ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 font-medium">
              <span
                className={`size-2.5 rounded-full ${
                  overallStatus === "healthy"
                    ? "bg-emerald-500"
                    : overallStatus === "degraded"
                    ? "bg-amber-500"
                    : "bg-destructive"
                }`}
              />
              Status: {overallStatus === "healthy" ? "Operacional (100%)" : overallStatus === "degraded" ? "Degradado" : "Offline"}
            </span>

            {avgLatency !== null && (
              <span className="text-muted-foreground">
                Latência Média: <strong className="text-foreground">{avgLatency} ms</strong>
              </span>
            )}

            <span className="text-muted-foreground">
              Alvo Atual: <strong className="text-foreground">{initialStatus?.targetBaseUrl || "http://localhost:54321"}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              PostgreSQL 17.2
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              AES-256 Vault Ativo
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── MATRIZ DE SAÚDE DOS 5 MICROSSERVIÇOS ────────────────────────────── */}
      <div className="p-6 rounded-lg bg-card border border-border/70 space-y-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Topologia dos 5 Microsserviços Waesy Cloud</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Mapeamento dos serviços independentes que compõem o ecossistema Supabase operando no cluster local ou VPS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc) => (
            <div
              key={svc.service}
              className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {svc.service === "postgres" && <Database className="size-4 text-primary" />}
                  {svc.service === "postgrest" && <Server className="size-4 text-primary" />}
                  {svc.service === "auth" && <KeyRound className="size-4 text-primary" />}
                  {svc.service === "storage" && <HardDrive className="size-4 text-primary" />}
                  {svc.service === "realtime" && <Radio className="size-4 text-primary" />}
                  <span className="text-xs font-bold">{svc.label}</span>
                </div>

                <Badge
                  variant={
                    svc.status === "healthy"
                      ? "default"
                      : svc.status === "degraded"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {svc.status}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground font-mono truncate" title={svc.url}>
                {svc.url}
              </p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                <span className="text-muted-foreground">Tempo de resposta:</span>
                <span className="font-semibold">
                  {svc.latencyMs !== null ? `${svc.latencyMs} ms` : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── GERADOR & INSPETOR DE TOKENS JWT CANÔNICOS ─────────────────────── */}
      <div className="p-6 rounded-lg bg-card border border-border/70 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Gerador Canônico de Chaves JWT (HS256)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Gere instantaneamente chaves `anon` e `service_role` perfeitamente válidas para o PostgREST a partir do seu `JWT_SECRET`.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="jwt-secret-input" className="text-xs font-semibold">
              JWT Secret do Cluster (mínimo 16 caracteres)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="jwt-secret-input"
                type="text"
                value={jwtToolSecret}
                onChange={(e) => setJwtToolSecret(e.target.value)}
                placeholder="Insira o JWT_SECRET configurado no .env do servidor..."
                className="h-11 min-h-11 text-xs font-mono"
              />
              <Button
                type="button"
                onClick={handleGenerateJwtKeys}
                disabled={isGeneratingJwt || !jwtToolSecret}
                className="h-11 min-h-11 px-5 text-xs font-bold shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Gerar Chaves
              </Button>
            </div>
          </div>

          {generatedAnon && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Chave Pública (Anon Key)</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedAnon, "Anon Key")}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" /> Copiar
                  </Button>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all line-clamp-2">
                  {generatedAnon}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Chave Secreta (Service Role Key)</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedService, "Service Role Key")}
                    className="h-7 text-xs gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" /> Copiar
                  </Button>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all line-clamp-2">
                  {generatedService}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── OFERTA COMERCIAL BAAS PARA LOJISTAS & USUÁRIOS ─────────────────── */}
      <div className="p-6 rounded-lg bg-card border border-border/70 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Waesy Cloud BaaS — Monetização e Multi-Tenant
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Comercialize instâncias de banco de dados e APIs relacionais para seus clientes e lojistas com faturamento integrado.
            </p>
          </div>

          <Badge variant="outline" className="text-xs font-semibold">
            {initialStatus?.baasStats.activeSubscriptions || 8} Assinaturas Ativas
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-2">
            <span className="text-xs font-bold text-foreground">Plano Starter (Compartilhado)</span>
            <p className="text-xs text-muted-foreground">
              Schema dedicado com RLS e par de chaves de API restritas por tenant. Ideal para pequenos comércios.
            </p>
            <div className="text-sm font-bold text-primary pt-2">Incluso no Pro</div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <span className="text-xs font-bold text-foreground">Plano Business (Schema Avançado)</span>
            <p className="text-xs text-muted-foreground">
              Até 5 GB de banco, 25 GB de storage S3, 500.000 requisições/mês e backups automáticos diários.
            </p>
            <div className="text-sm font-bold text-primary pt-2">R$ 89,00 / mês</div>
          </div>

          <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-2">
            <span className="text-xs font-bold text-foreground">Enterprise Dedicated Node</span>
            <p className="text-xs text-muted-foreground">
              Contêiner dedicado isolado (VPS Hetzner / Oracle), subdomínio próprio e conexão direta via porta 5432.
            </p>
            <div className="text-sm font-bold text-primary pt-2">R$ 290,00 / mês</div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: AUTOVINCULAR WAESY CLOUD (ZERO-TOUCH) ──────────────────── */}
      <Dialog open={isAutoBindOpen} onOpenChange={setIsAutoBindOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              Autovincular Waesy Cloud (Zero-Touch)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Conecte sua máquina local ou VPS dedicada ao ecossistema Waesy. O sistema executará teste de integridade nos 5 microsserviços e configurará as chaves criptográficas no cofre automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="autobind-url" className="text-xs font-semibold">
                URL Base do Gateway Waesy Cloud
              </Label>
              <Input
                id="autobind-url"
                type="url"
                value={autoBindUrl}
                onChange={(e) => setAutoBindUrl(e.target.value)}
                placeholder="http://localhost:54321 ou https://db.waesy.internal"
                className="h-11 min-h-11 text-xs mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Porta padrão do API Gateway Kong/Caddy local (54321 ou 8000).
              </p>
            </div>

            <div>
              <Label htmlFor="autobind-jwt-secret" className="text-xs font-semibold">
                JWT Secret do Servidor
              </Label>
              <Input
                id="autobind-jwt-secret"
                type="password"
                value={autoBindJwtSecret}
                onChange={(e) => setAutoBindJwtSecret(e.target.value)}
                placeholder="Insira o JWT_SECRET definido no docker-compose..."
                className="h-11 min-h-11 text-xs font-mono mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usado para calcular automaticamente as chaves `anon` e `service_role`.
              </p>
            </div>

            <div>
              <Label htmlFor="autobind-db-url" className="text-xs font-semibold">
                String de Conexão Postgres (Opcional para Pooler)
              </Label>
              <Input
                id="autobind-db-url"
                type="text"
                value={autoBindDbUrl}
                onChange={(e) => setAutoBindDbUrl(e.target.value)}
                placeholder="postgresql://postgres:postgres@localhost:54322/postgres"
                className="h-11 min-h-11 text-xs font-mono mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAutoBindOpen(false)}
              disabled={isBinding}
              className="h-11 min-h-11 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleExecuteAutoBind}
              disabled={isBinding || !autoBindUrl || !autoBindJwtSecret}
              className="h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Zap className={`size-4 ${isBinding ? "animate-spin motion-reduce:animate-none" : ""}`} />
              {isBinding ? "Executando Handshake..." : "Autovincular e Ativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
