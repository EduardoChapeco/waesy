import React, { useState, useEffect, useCallback } from "react";
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Mail,
  FileText,
  Github,
  Globe,
  Lock,
  ShieldCheck,
  Server,
  Plus,
  Loader2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type ConnectorProvider,
  listUserConnectors,
  saveConnectorCredentials,
  disconnectConnector,
} from "@/services/ai-connectors-vault.functions";
import {
  type PublicExternalMcpServerDTO,
  listExternalMcpServers,
  registerExternalMcpServer,
  syncExternalMcpServerTools,
  toggleExternalMcpServer,
  deleteExternalMcpServer,
} from "@/services/mcp-connectors.functions";

export interface CopilotConnectorsCenterProps {
  className?: string;
}

interface ConnectorCardMeta {
  provider: ConnectorProvider;
  name: string;
  category: string;
  description: string;
  icon: any;
  defaultScopes: string[];
}

const SUPPORTED_CONNECTORS: ConnectorCardMeta[] = [
  {
    provider: "google",
    name: "Google Workspace",
    category: "Produtividade",
    description: "Leitura e busca em Google Drive, Google Docs, Planilhas e Calendar.",
    icon: Globe,
    defaultScopes: ["drive.readonly", "calendar.events", "spreadsheets"],
  },
  {
    provider: "microsoft",
    name: "Microsoft 365",
    category: "Produtividade",
    description: "Integração segura com OneDrive, Excel Online e Outlook.",
    icon: Globe,
    defaultScopes: ["onedrive.read", "user.read"],
  },
  {
    provider: "email",
    name: "Serviço de E-mail (IMAP / SMTP)",
    category: "Comunicação",
    description: "Busca de mensagens, redação de rascunhos e disparo assistido de e-mails.",
    icon: Mail,
    defaultScopes: ["email.read", "email.draft", "email.send_with_confirm"],
  },
  {
    provider: "notion",
    name: "Notion",
    category: "Conhecimento",
    description: "Consulta a bases de conhecimento, wikis e páginas de documentação da equipe.",
    icon: FileText,
    defaultScopes: ["pages.read", "databases.query"],
  },
  {
    provider: "slack",
    name: "Slack",
    category: "Comunicação",
    description: "Pesquisa em canais corporativos e notificações de conclusão de tarefas.",
    icon: Link2,
    defaultScopes: ["channels.read", "chat.write"],
  },
  {
    provider: "github",
    name: "GitHub",
    category: "Desenvolvimento",
    description: "Inspeção de repositórios, leitura de issues e auditoria de código-fonte.",
    icon: Github,
    defaultScopes: ["repo.readonly", "issues.read"],
  },
];

export function CopilotConnectorsCenter({ className }: CopilotConnectorsCenterProps) {
  const [connectorsState, setConnectorsState] = useState<
    Record<string, { status: "connected" | "disconnected" | "error"; account?: string }>
  >({
    google: { status: "disconnected" },
    email: { status: "disconnected" },
    notion: { status: "disconnected" },
    slack: { status: "disconnected" },
    github: { status: "disconnected" },
    microsoft: { status: "disconnected" },
  });
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(true);

  const [mcpServers, setMcpServers] = useState<PublicExternalMcpServerDTO[]>([]);
  const [isLoadingMcp, setIsLoadingMcp] = useState(true);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [mcpName, setMcpName] = useState("");
  const [mcpDescription, setMcpDescription] = useState("");
  const [mcpEndpointUrl, setMcpEndpointUrl] = useState("");
  const [mcpTransport, setMcpTransport] = useState<"http_json_rpc" | "sse" | "streamable_http">("http_json_rpc");
  const [mcpAuthType, setMcpAuthType] = useState<"none" | "bearer" | "api_key_header" | "basic">("bearer");
  const [mcpAuthHeaderName, setMcpAuthHeaderName] = useState("x-api-key");
  const [mcpSecret, setMcpSecret] = useState("");
  const [isSavingMcp, setIsSavingMcp] = useState(false);
  const [busyMcpId, setBusyMcpId] = useState<string | null>(null);

  const [selectedConnector, setSelectedConnector] = useState<ConnectorCardMeta | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [emailIdentifier, setEmailIdentifier] = useState("");
  const [requireSendConfirm, setRequireSendConfirm] = useState(true);

  const refreshAllIntegrations = useCallback(async () => {
    setIsLoadingConnectors(true);
    setIsLoadingMcp(true);
    try {
      const [userConnectors, externalMcp] = await Promise.all([
        listUserConnectors().catch(() => []),
        listExternalMcpServers().catch(() => []),
      ]);
      const nextMap: Record<
        string,
        { status: "connected" | "disconnected" | "error"; account?: string }
      > = {
        google: { status: "disconnected" },
        email: { status: "disconnected" },
        notion: { status: "disconnected" },
        slack: { status: "disconnected" },
        github: { status: "disconnected" },
        microsoft: { status: "disconnected" },
      };
      for (const row of userConnectors) {
        nextMap[row.provider] = {
          status: row.status === "connected" ? "connected" : row.status === "error" ? "error" : "disconnected",
          account: row.accountIdentifier || undefined,
        };
      }
      setConnectorsState(nextMap);
      setMcpServers(Array.isArray(externalMcp) ? externalMcp : []);
    } finally {
      setIsLoadingConnectors(false);
      setIsLoadingMcp(false);
    }
  }, []);

  useEffect(() => {
    void refreshAllIntegrations();
  }, [refreshAllIntegrations]);

  const handleOpenConnect = (connector: ConnectorCardMeta) => {
    setSelectedConnector(connector);
    setEmailIdentifier("");
    setConnectModalOpen(true);
  };

  const handleConfirmConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector) return;

    const account = emailIdentifier.trim();
    if (!account) {
      toast.error("Informe a conta ou chave de identificação do conector.");
      return;
    }

    try {
      await saveConnectorCredentials({
        data: {
          provider: selectedConnector.provider,
          accountIdentifier: account,
          scopes: selectedConnector.defaultScopes,
          credentials: {
            account,
            requireSendConfirm: selectedConnector.provider === "email" ? requireSendConfirm : undefined,
            connected_at: new Date().toISOString(),
          },
        },
      });

      setConnectorsState((prev) => ({
        ...prev,
        [selectedConnector.provider]: {
          status: "connected",
          account,
        },
      }));

      toast.success(`Conector ${selectedConnector.name} vinculado com sucesso.`);
      setConnectModalOpen(false);
      setEmailIdentifier("");
    } catch (err: any) {
      toast.error(err?.message || `Falha ao vincular conector ${selectedConnector.name}.`);
    }
  };

  const handleRegisterMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpName.trim() || !mcpEndpointUrl.trim()) {
      toast.error("Informe o nome e a URL HTTPS do servidor MCP.");
      return;
    }

    setIsSavingMcp(true);
    try {
      const saved = await registerExternalMcpServer({
        data: {
          name: mcpName.trim(),
          description: mcpDescription.trim() || undefined,
          endpointUrl: mcpEndpointUrl.trim(),
          transport: mcpTransport,
          authType: mcpAuthType,
          authHeaderName: mcpAuthType === "api_key_header" ? mcpAuthHeaderName.trim() || "x-api-key" : undefined,
          secret: mcpAuthType !== "none" ? mcpSecret.trim() || undefined : undefined,
          syncOnSave: true,
        },
      });
      setMcpServers((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      if (saved.healthStatus === "error") {
        toast.error(saved.lastError || "Servidor salvo, mas falhou ao listar ferramentas MCP.");
      } else {
        toast.success(`Servidor "${saved.name}" conectado com ${saved.toolCount} ferramenta(s) MCP.`);
      }
      setMcpModalOpen(false);
      setMcpName("");
      setMcpDescription("");
      setMcpEndpointUrl("");
      setMcpSecret("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar servidor MCP externo.");
    } finally {
      setIsSavingMcp(false);
    }
  };

  const handleSyncMcp = async (serverId: string) => {
    setBusyMcpId(serverId);
    try {
      const updated = await syncExternalMcpServerTools({ data: { id: serverId } });
      setMcpServers((prev) => prev.map((s) => (s.id === serverId ? updated : s)));
      if (updated.healthStatus === "error") {
        toast.error(updated.lastError || "Falha ao sincronizar ferramentas MCP.");
      } else {
        toast.success(`${updated.toolCount} ferramenta(s) sincronizada(s) em "${updated.name}".`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao testar conexão com servidor MCP.");
    } finally {
      setBusyMcpId(null);
    }
  };

  const handleToggleMcp = async (server: PublicExternalMcpServerDTO, nextState: boolean) => {
    setBusyMcpId(server.id);
    setMcpServers((prev) => prev.map((s) => (s.id === server.id ? { ...s, isActive: nextState } : s)));
    try {
      await toggleExternalMcpServer({ data: { id: server.id, isActive: nextState } });
      toast.success(nextState ? `MCP "${server.name}" ativado.` : `MCP "${server.name}" pausado.`);
    } catch (err: any) {
      setMcpServers((prev) => prev.map((s) => (s.id === server.id ? { ...s, isActive: !nextState } : s)));
      toast.error(err?.message || "Erro ao alterar status do servidor MCP.");
    } finally {
      setBusyMcpId(null);
    }
  };

  const handleDeleteMcp = async (server: PublicExternalMcpServerDTO) => {
    setBusyMcpId(server.id);
    try {
      await deleteExternalMcpServer({ data: { id: server.id } });
      setMcpServers((prev) => prev.filter((s) => s.id !== server.id));
      toast.success(`Servidor "${server.name}" removido.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover servidor MCP.");
    } finally {
      setBusyMcpId(null);
    }
  };

  const handleDisconnect = async (provider: ConnectorProvider, name: string) => {
    try {
      await disconnectConnector({ data: { provider } });
      setConnectorsState((prev) => ({
        ...prev,
        [provider]: { status: "disconnected" },
      }));
      toast.success(`Conector ${name} desconectado.`);
    } catch (err: any) {
      toast.error(err?.message || `Erro ao desconectar ${name}.`);
    }
  };

  return (
    <div className={cn("space-y-6 max-w-5xl mx-auto p-4 sm:p-6", className)}>
      {/* ── Cabeçalho do Hub de Conectores ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Central de Conectores
            </h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Zero-Trust Vault
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conecte ferramentas externas com isolamento de contexto e cofre de credenciais server-side.
          </p>
        </div>

        <div className="flex items-center gap-2 text-2xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-xl border border-border/40">
          <Lock className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Tokens protegidos com criptografia simétrica AES-256</span>
        </div>
      </div>

      {/* ── Grade de Cards de Conectores (Squircles de Alta Legibilidade) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SUPPORTED_CONNECTORS.map((conn) => {
          const current = connectorsState[conn.provider] || { status: "disconnected" };
          const isConnected = current.status === "connected";
          const Icon = conn.icon;

          return (
            <div
              key={conn.provider}
              className={cn(
                "group rounded-2xl border p-5 transition-colors duration-200 flex flex-col justify-between space-y-4 bg-card",
                isConnected
                  ? "border-border/60 hover:border-primary/40 shadow-xs"
                  : "border-border/30 opacity-80 bg-muted/10"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {conn.name}
                      </h4>
                      <p className="text-2xs font-mono text-muted-foreground mt-1">
                        {conn.category}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-2xs font-semibold px-3 py-1 rounded-md shrink-0",
                      isConnected
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-muted/40 text-muted-foreground border-border/40"
                    )}
                  >
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {conn.description}
                </p>

                {isConnected && current.account && (
                  <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono bg-muted/40 px-3 py-1 rounded-md">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    <span className="truncate">{current.account}</span>
                  </div>
                )}
              </div>

              {/* Rodapé do Card com Ação Primária / Secundária */}
              <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                <span className="text-2xs text-muted-foreground">
                  {conn.defaultScopes.length} permissões ativas
                </span>

                {isConnected ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(conn.provider, conn.name)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 cursor-pointer"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenConnect(conn)}
                    className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl text-primary border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  >
                    Conectar Conta
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Servidores MCP Externos (Model Context Protocol Client) ── */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">
                Servidores MCP Externos
              </h3>
              <Badge variant="outline" className="text-2xs font-mono">
                JSON-RPC 2.0 / SSE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conecte qualquer servidor Model Context Protocol HTTPS remoto para expandir as ferramentas do Copilot.
            </p>
          </div>

          <Button
            type="button"
            variant="default"
            onClick={() => setMcpModalOpen(true)}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shrink-0"
          >
            <Plus className="size-4" />
            <span>Adicionar Servidor MCP</span>
          </Button>
        </div>

        {isLoadingMcp || isLoadingConnectors ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl border border-border/40 bg-muted/20 animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : mcpServers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center space-y-2 bg-muted/10">
            <Server className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">
              Nenhum servidor MCP externo conectado
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Cadastre um endpoint HTTPS MCP compatível (ex.: CRM, ERP, banco vetorial ou automações) para descobrir ferramentas via tools/list.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mcpServers.map((server) => {
              const isBusy = busyMcpId === server.id;
              return (
                <div
                  key={server.id}
                  className={cn(
                    "rounded-2xl border p-5 space-y-4 bg-card transition-colors",
                    server.isActive ? "border-border/60" : "border-border/30 opacity-75 bg-muted/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground truncate">
                          {server.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-2xs px-2 py-1",
                            server.healthStatus === "healthy"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : server.healthStatus === "error"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-muted text-muted-foreground border-border/40"
                          )}
                        >
                          {server.healthStatus === "healthy"
                            ? `${server.toolCount} tools`
                            : server.healthStatus}
                        </Badge>
                      </div>
                      <p className="text-2xs font-mono text-muted-foreground truncate">
                        {server.endpointUrl}
                      </p>
                      {server.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {server.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-center size-11 shrink-0">
                      <Switch
                        checked={server.isActive}
                        disabled={isBusy}
                        onCheckedChange={(checked) => void handleToggleMcp(server, checked)}
                        aria-label={`Ativar ou desativar MCP ${server.name}`}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>

                  {server.lastError && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-2xs text-destructive">
                      <AlertTriangle className="size-3.5 shrink-0 mt-1" />
                      <span className="break-words">{server.lastError}</span>
                    </div>
                  )}

                  {server.toolsManifest.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {server.toolsManifest.slice(0, 6).map((t) => (
                        <span
                          key={t.name}
                          className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-2xs font-mono text-foreground"
                          title={t.description || t.name}
                        >
                          <Wrench className="size-3 text-primary" />
                          {t.name}
                        </span>
                      ))}
                      {server.toolsManifest.length > 6 && (
                        <span className="rounded-md bg-muted/40 px-2 py-1 text-2xs text-muted-foreground">
                          +{server.toolsManifest.length - 6} tools
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-border/30 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                    <span className="font-mono">
                      {server.transport} {server.keyHint ? `• ${server.keyHint}` : "• público"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void handleSyncMcp(server.id)}
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <RefreshCw className={cn("size-3.5", isBusy && "animate-spin motion-reduce:animate-none")} />
                        <span>Sincronizar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => void handleDeleteMcp(server)}
                        aria-label={`Remover servidor ${server.name}`}
                        className="size-11 min-h-11 min-w-11 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Registro de Servidor MCP Externo ── */}
      <Dialog open={mcpModalOpen} onOpenChange={setMcpModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Conectar Servidor MCP Externo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              O endereço é validado contra SSRF e o segredo é cifrado em AES-256-GCM no cofre do servidor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterMcp} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Nome do Servidor
              </label>
              <Input
                value={mcpName}
                onChange={(e) => setMcpName(e.target.value)}
                placeholder="Ex: CRM Corporativo MCP"
                className="h-11 min-h-11 rounded-xl text-xs bg-muted/40"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Endpoint HTTPS MCP
              </label>
              <Input
                type="url"
                value={mcpEndpointUrl}
                onChange={(e) => setMcpEndpointUrl(e.target.value)}
                placeholder="https://mcp.suaempresa.com/sse"
                className="h-11 min-h-11 rounded-xl text-xs bg-muted/40 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Transporte
                </label>
                <select
                  value={mcpTransport}
                  onChange={(e) => setMcpTransport(e.target.value as any)}
                  className="w-full h-11 min-h-11 rounded-xl border border-border/40 bg-muted/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="http_json_rpc">HTTP JSON-RPC 2.0</option>
                  <option value="streamable_http">Streamable HTTP</option>
                  <option value="sse">SSE (Server-Sent Events)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Autenticação
                </label>
                <select
                  value={mcpAuthType}
                  onChange={(e) => setMcpAuthType(e.target.value as any)}
                  className="w-full h-11 min-h-11 rounded-xl border border-border/40 bg-muted/40 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key_header">Header API Key</option>
                  <option value="basic">HTTP Basic</option>
                  <option value="none">Sem Autenticação</option>
                </select>
              </div>
            </div>

            {mcpAuthType === "api_key_header" && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Nome do Header HTTP
                </label>
                <Input
                  value={mcpAuthHeaderName}
                  onChange={(e) => setMcpAuthHeaderName(e.target.value)}
                  placeholder="x-api-key"
                  className="h-11 min-h-11 rounded-xl text-xs bg-muted/40 font-mono"
                />
              </div>
            )}

            {mcpAuthType !== "none" && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Token / Chave Secreta
                </label>
                <Input
                  type="password"
                  value={mcpSecret}
                  onChange={(e) => setMcpSecret(e.target.value)}
                  placeholder="Cole o token secreto para o cofre"
                  className="h-11 min-h-11 rounded-xl text-xs bg-muted/40 font-mono"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Descrição (opcional)
              </label>
              <Input
                value={mcpDescription}
                onChange={(e) => setMcpDescription(e.target.value)}
                placeholder="Ferramentas expostas por este servidor"
                className="h-11 min-h-11 rounded-xl text-xs bg-muted/40"
              />
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMcpModalOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingMcp}
                className="h-11 min-h-11 px-5 text-xs font-semibold rounded-xl gap-2"
              >
                {isSavingMcp && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
                <span>Salvar e Descobrir Tools</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Conexão Segura ── */}
      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Conectar {selectedConnector?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Autorize o Copilot a consultar dados sob permissão declarativa estrita.
            </DialogDescription>
          </DialogHeader>

          {selectedConnector && (
            <form onSubmit={handleConfirmConnect} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Identificador da Conta ou E-mail
                </label>
                <Input
                  value={emailIdentifier}
                  onChange={(e) => setEmailIdentifier(e.target.value)}
                  placeholder="Ex: usuario@empresa.com"
                  className="h-11 min-h-11 rounded-xl text-xs bg-muted/40"
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Permissões Solicitadas:
                </span>
                <div className="space-y-1 text-2xs text-muted-foreground font-mono">
                  {selectedConnector.defaultScopes.map((scope) => (
                    <div key={scope} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                      <span>{scope}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedConnector.provider === "email" && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="space-y-1 pr-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Barreira de Envio de E-mails
                    </span>
                    <span className="text-2xs text-muted-foreground block">
                      Sempre exigir aprovação humana explícita antes do disparo.
                    </span>
                  </div>
                  <Switch
                    checked={requireSendConfirm}
                    onCheckedChange={setRequireSendConfirm}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConnectModalOpen(false)}
                  className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-11 min-h-11 px-5 text-xs font-semibold rounded-xl"
                >
                  Autorizar Conexão
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
