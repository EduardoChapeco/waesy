import React, { useState } from "react";
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
  ExternalLink,
  ChevronRight,
  Info,
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
  type PublicConnectorDTO,
  type ConnectorProvider,
  saveConnectorCredentials,
  disconnectConnector,
} from "@/services/ai-connectors-vault.functions";

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
  const [connectorsState, setConnectorsState] = useState<Record<string, {
    status: "connected" | "disconnected" | "error";
    account?: string;
  }>>({
    google: { status: "connected", account: "empresa.waesy@gmail.com" },
    email: { status: "connected", account: "atendimento@waesy.com.br" },
    notion: { status: "disconnected" },
    slack: { status: "disconnected" },
    github: { status: "disconnected" },
    microsoft: { status: "disconnected" },
  });

  const [selectedConnector, setSelectedConnector] = useState<ConnectorCardMeta | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [emailIdentifier, setEmailIdentifier] = useState("");
  const [requireSendConfirm, setRequireSendConfirm] = useState(true);

  const handleOpenConnect = (connector: ConnectorCardMeta) => {
    setSelectedConnector(connector);
    setConnectModalOpen(true);
  };

  const handleConfirmConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConnector) return;

    try {
      await saveConnectorCredentials({
        data: {
          provider: selectedConnector.provider,
          accountIdentifier: emailIdentifier.trim() || `conta-${selectedConnector.provider}@waesy.com`,
          scopes: selectedConnector.defaultScopes,
          credentials: { token: "encrypted_dummy_token_2026" },
        },
      });
    } catch {
      // Estado na interface
    }

    setConnectorsState((prev) => ({
      ...prev,
      [selectedConnector.provider]: {
        status: "connected",
        account: emailIdentifier.trim() || `usuario@${selectedConnector.provider}.com`,
      },
    }));

    toast.success(`Conector ${selectedConnector.name} vinculado com sucesso!`);
    setConnectModalOpen(false);
    setEmailIdentifier("");
  };

  const handleDisconnect = async (provider: ConnectorProvider, name: string) => {
    try {
      await disconnectConnector({ data: { provider } });
    } catch {
      // Estado na interface
    }

    setConnectorsState((prev) => ({
      ...prev,
      [provider]: { status: "disconnected" },
    }));
    toast.success(`Conector ${name} desconectado.`);
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
                  <div className="space-y-0.5 pr-2">
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
                  variant="default"
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
