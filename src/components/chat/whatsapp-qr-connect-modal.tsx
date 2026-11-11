import React, { useState, useEffect } from "react";
import {
  QrCode,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Plus,
  PowerOff,
  Radio,
  Globe,
  Building2,
  Copy,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  connectWhatsAppQrCodeInstance,
  syncWhatsAppInstanceStatus,
  disconnectWhatsAppInstance,
  saveWorkspaceWhatsAppInstance,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";

export interface WhatsAppQrConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instances: WhatsAppChannelInstanceDTO[];
  onInstancesUpdated: (instances?: WhatsAppChannelInstanceDTO[]) => void;
  canManageConnection?: boolean;
  isPlatformMaster?: boolean;
}

export function WhatsAppQrConnectModal({
  open,
  onOpenChange,
  instances = [],
  onInstancesUpdated,
  canManageConnection = true,
  isPlatformMaster = false,
}: WhatsAppQrConnectModalProps) {
  const [selectedMode, setSelectedMode] = useState<"qr_baileys" | "meta_official">("qr_baileys");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    instances[0]?.id || null,
  );
  const [displayName, setDisplayName] = useState(
    instances[0]?.display_name || "WhatsApp Principal",
  );
  const [instanceKey, setInstanceKey] = useState(
    instances[0]?.instance_key || "principal",
  );
  const [department, setDepartment] = useState(
    String(instances[0]?.public_config?.department || "Atendimento Geral"),
  );
  const [autoImportHistory, setAutoImportHistory] = useState(
    Boolean((instances[0]?.public_config as any)?.auto_import_history),
  );
  const [isGlobalMaster, setIsGlobalMaster] = useState(
    Boolean(instances[0]?.public_config?.is_global_master),
  );

  // Estado do QR Code ao vivo
  const [qrBase64, setQrBase64] = useState<string | null>(
    (instances[0]?.public_config?.qr_code_url as string) || null,
  );
  const [pairingCode, setPairingCode] = useState<string | null>(
    (instances[0]?.public_config?.pairing_code as string) || null,
  );
  const [connectionStatus, setConnectionStatus] = useState<string>(
    instances[0]?.status || "disconnected",
  );
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(
    instances[0]?.last_error_message || (instances[0]?.public_config?.last_error_message as string) || null,
  );
  const [qrGeneratedAt, setQrGeneratedAt] = useState<string | null>(
    (instances[0]?.public_config?.last_qr_generated_at as string) || null,
  );
  const [qrExpired, setQrExpired] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Campos API Oficial Meta
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");

  const activeInstance = !isCreatingNew
    ? ((instances || []).find((item) => item.id === selectedInstanceId) || instances?.[0] || null)
    : null;

  useEffect(() => {
    if (!isCreatingNew && activeInstance) {
      setSelectedInstanceId(activeInstance.id);
      setDisplayName(activeInstance.display_name);
      setInstanceKey(activeInstance.instance_key);
      setDepartment(String(activeInstance.public_config?.department || "Atendimento Geral"));
      setQrBase64((activeInstance.public_config?.qr_code_url as string) || null);
      setPairingCode((activeInstance.public_config?.pairing_code as string) || null);
      setConnectionStatus(activeInstance.status);
      setLastErrorMessage(activeInstance.last_error_message || (activeInstance.public_config?.last_error_message as string) || null);
      setQrGeneratedAt((activeInstance.public_config?.last_qr_generated_at as string) || null);
      setQrExpired(false);
      setIsGlobalMaster(Boolean(activeInstance.public_config?.is_global_master));
      setAutoImportHistory(Boolean((activeInstance.public_config as any)?.auto_import_history));
    }
  }, [activeInstance?.id, isCreatingNew]);

  // Verifica expiração do QR Code (60s sem leitura)
  useEffect(() => {
    if (!open || !qrBase64 || connectionStatus === "connected") {
      setQrExpired(false);
      return;
    }
    const checkExpiration = () => {
      if (!qrGeneratedAt) return;
      const elapsedMs = Date.now() - new Date(qrGeneratedAt).getTime();
      if (Number.isFinite(elapsedMs) && elapsedMs > 60_000) {
        setQrExpired(true);
      }
    };
    checkExpiration();
    const timer = setInterval(checkExpiration, 5000);
    return () => clearInterval(timer);
  }, [open, qrBase64, qrGeneratedAt, connectionStatus]);

  // Polling automático de 5s enquanto aguarda leitura do QR Code
  useEffect(() => {
    if (!open || !selectedInstanceId || connectionStatus === "connected") return;
    const interval = setInterval(async () => {
      try {
        const result = await syncWhatsAppInstanceStatus({
          data: { id: selectedInstanceId },
        });
        if (result?.state === "connected") {
          setConnectionStatus("connected");
          setQrBase64(null);
          setQrExpired(false);
          setLastErrorMessage(null);
          toast.success("Aparelho WhatsApp conectado e sincronizado!");
          onInstancesUpdated();
        } else if (result) {
          setConnectionStatus(result.state);
          if (result.qrCodeBase64) {
            setQrBase64(result.qrCodeBase64);
            setQrGeneratedAt(new Date().toISOString());
            setQrExpired(false);
          }
          if (result.pairingCode) {
            setPairingCode(result.pairingCode);
          }
          if (result.errorMessage) {
            setLastErrorMessage(result.errorMessage);
          }
        }
      } catch {
        // Silencioso durante polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [open, selectedInstanceId, connectionStatus]);

  const handleGenerateQrCode = async () => {
    if (!canManageConnection) {
      toast.error("Apenas gestores autorizados podem conectar ou reconectar aparelhos.");
      return;
    }
    setIsGenerating(true);
    setLastErrorMessage(null);
    setQrExpired(false);
    try {
      const result = await connectWhatsAppQrCodeInstance({
        data: {
          id: isCreatingNew ? undefined : selectedInstanceId || undefined,
          displayName: displayName.trim() || "WhatsApp Principal",
          instanceKey: instanceKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "principal",
          department: department.trim() || "Geral",
          isGlobalMaster: isPlatformMaster && isGlobalMaster,
          autoImportHistory,
        },
      });
      setIsCreatingNew(false);
      setSelectedInstanceId(result.instance.id);
      setQrBase64(result.qrCodeBase64);
      setPairingCode(result.pairingCode);
      setConnectionStatus(result.instance.status);
      setQrGeneratedAt(new Date().toISOString());
      setLastErrorMessage(result.errorMessage || null);
      onInstancesUpdated();

      if (result.connectionState === "connected") {
        toast.success("Este número já está conectado e ativo na VPS!");
      } else if (result.connectionState === "error" || result.errorMessage) {
        toast.error(result.errorMessage || "Servidor WhatsApp indisponível no momento.");
      } else if (result.qrCodeBase64) {
        toast.success("QR Code gerado ao vivo! Aponte a câmera do WhatsApp.");
      } else {
        toast.info("Instância registrada. Sincronizando QR Code com o gateway...");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar QR Code na VPS.";
      setLastErrorMessage(msg);
      setConnectionStatus("error");
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSync = async () => {
    if (!selectedInstanceId) return;
    setIsSyncing(true);
    try {
      const result = await syncWhatsAppInstanceStatus({
        data: { id: selectedInstanceId },
      });
      setConnectionStatus(result.state);
      if (result.state === "connected") {
        setQrBase64(null);
        setQrExpired(false);
        setLastErrorMessage(null);
        toast.success("WhatsApp conectado e operante!");
      } else {
        if (result.qrCodeBase64) {
          setQrBase64(result.qrCodeBase64);
          setQrGeneratedAt(new Date().toISOString());
          setQrExpired(false);
        }
        if (result.pairingCode) {
          setPairingCode(result.pairingCode);
        }
        setLastErrorMessage(result.errorMessage || null);
        toast.info(`Estado atual da instância: ${result.state}`);
      }
      onInstancesUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível sincronizar status.";
      setLastErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedInstanceId || !canManageConnection) return;
    setIsDisconnecting(true);
    try {
      await disconnectWhatsAppInstance({ data: { id: selectedInstanceId } });
      setConnectionStatus("disconnected");
      setQrBase64(null);
      setQrExpired(false);
      setLastErrorMessage(null);
      toast.success("Sessão do WhatsApp desconectada com segurança.");
      onInstancesUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao desconectar aparelho.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleStartNewNumber = () => {
    setIsCreatingNew(true);
    setSelectedInstanceId(null);
    setDisplayName(`WhatsApp Setor ${(instances?.length || 0) + 1}`);
    setInstanceKey(`setor_${(instances?.length || 0) + 1}`);
    setDepartment("Comercial");
    setQrBase64(null);
    setPairingCode(null);
    setQrExpired(false);
    setLastErrorMessage(null);
    setConnectionStatus("disconnected");
  };

  const handleSaveOfficialMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaPhoneId || !metaAccessToken) {
      toast.error("Informe o Phone Number ID e o Access Token Permanente da Meta.");
      return;
    }
    setIsGenerating(true);
    try {
      const saved = await saveWorkspaceWhatsAppInstance({
        data: {
          displayName: displayName || "WhatsApp Oficial Meta",
          provider: "meta_cloud_api",
          connectionMode: "official",
          instanceKey: instanceKey || "meta_oficial",
          isActive: true,
          isDefault: instances.length === 0,
          phoneNumberId: metaPhoneId,
          businessAccountId: metaWabaId || undefined,
          publicConfig: { department },
          capabilities: { templates: true, buttons: true, lists: true },
          secretPayload: {
            access_token: metaAccessToken,
            ...(metaVerifyToken ? { webhook_verify_token: metaVerifyToken } : {}),
          },
        },
      });
      setSelectedInstanceId(saved.id);
      toast.success("Canal Oficial Meta Cloud API configurado!");
      onInstancesUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar credenciais Meta.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="sm:max-w-4xl w-full p-6 space-y-5 rounded-2xl border-border/80">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                <Smartphone className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Conectar Aparelhos e Canais WhatsApp
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Conecte um único número para vários atendentes ou múltiplos números por setor.
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-3 py-1 font-semibold",
                connectionStatus === "connected"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : connectionStatus === "error"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-warning/15 text-warning-strong border-warning/30",
              )}
            >
              {connectionStatus === "connected"
                ? "Aparelho Conectado"
                : connectionStatus === "error"
                  ? "Falha de Conexão"
                  : "Aguardando Pareamento"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Seletor de Números / Instâncias da Loja */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          {instances.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setSelectedInstanceId(inst.id);
              }}
              className={cn(
                "h-11 min-h-11 px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isCreatingNew && (selectedInstanceId === inst.id || (!selectedInstanceId && instances[0]?.id === inst.id))
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  inst.status === "connected" ? "bg-emerald-500" : inst.status === "error" ? "bg-destructive" : "bg-warning",
                )}
              />
              <span>{inst.display_name}</span>
              <Badge variant="secondary" className="text-xs">
                {String(inst.public_config?.department || inst.instance_key)}
              </Badge>
            </button>
          ))}

          {isCreatingNew && (
            <Badge
              variant="outline"
              className="h-11 min-h-11 px-3 text-xs border-primary bg-primary/10 text-primary font-bold flex items-center gap-2"
            >
              <Plus className="size-3.5" />
              Novo Número (Configurando...)
            </Badge>
          )}

          {canManageConnection && !isCreatingNew && (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartNewNumber}
              className="h-11 min-h-11 text-xs gap-2"
            >
              <Plus className="size-4" />
              Adicionar outro número
            </Button>
          )}
        </div>

        {/* Escolha do Motor: QR Code Instantâneo (VPS) vs Meta Oficial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedMode("qr_baileys")}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedMode === "qr_baileys"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <QrCode className="size-4 text-primary" />
                Conexão via QR Code (Multi-Atendente)
              </span>
              <Badge variant="outline" className="text-xs">VPS Waesy</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Escaneie o código com o WhatsApp ou WhatsApp Business. Sem taxas por mensagem.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMode("meta_official")}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedMode === "meta_official"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                WhatsApp Cloud API (Meta Oficial)
              </span>
              <Badge variant="outline" className="text-xs">Graph API</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conexão oficial via WABA ID e Token Meta para disparos de templates aprovados.
            </p>
          </button>
        </div>

        {!canManageConnection ? (
          <div className="p-6 rounded-lg border border-border bg-muted/20 text-center space-y-2">
            <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">Visão de Operador de Atendimento</p>
            <p className="text-xs text-muted-foreground">
              O pareamento por QR Code e a desconexão de aparelhos são restritos aos gestores da loja (Proprietário, Administrador ou Gerente).
            </p>
          </div>
        ) : selectedMode === "qr_baileys" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 items-stretch">
            {/* Coluna Esquerda: Dados do Número, Setor e Ações da Conexão */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">Nome de Identificação do Aparelho</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex.: WhatsApp Comercial / Vendas"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Chave do Canal</Label>
                    <Input
                      value={instanceKey}
                      onChange={(e) =>
                        setInstanceKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))
                      }
                      placeholder="vendas_01"
                      className="h-11 min-h-11 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground">Setor Padrão</Label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Vendas, Suporte..."
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                </div>

                {isPlatformMaster && (
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGlobalMaster}
                      onChange={(e) => setIsGlobalMaster(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    <div className="text-xs">
                      <span className="font-bold flex items-center gap-1">
                        <Globe className="size-3.5 text-primary" />
                        Número Global Oficial Waesy
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Ativa auto-verificação de perfil civil, chamada Waesy Go e cotações aéreas.
                      </span>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 p-3 rounded-lg border border-border/70 bg-muted/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoImportHistory}
                    onChange={(e) => setAutoImportHistory(e.target.checked)}
                    className="size-4 accent-primary mt-1 cursor-pointer shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-semibold block text-foreground">
                      Importar conversas anteriores do aparelho
                    </span>
                    <span className="text-muted-foreground block text-xs leading-relaxed">
                      Sincroniza contatos, fotos e conversas existentes no aparelho para o atendimento.
                    </span>
                  </div>
                </label>
              </div>

              {/* Bloco de Ações do Aparelho */}
              <div className="pt-2">
                {connectionStatus === "connected" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="h-11 min-h-11 text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <RefreshCw className={cn("size-4", isSyncing && "animate-spin motion-reduce:animate-none")} />
                      Sincronizar Status
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="h-11 min-h-11 text-xs font-medium text-destructive hover:bg-destructive/10 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <PowerOff className="size-4" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      onClick={handleGenerateQrCode}
                      disabled={isGenerating}
                      className="w-full h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <QrCode className="size-4" />
                      {isGenerating ? "Gerando na VPS..." : qrBase64 ? "Atualizar QR Code" : "Gerar QR Code Ao Vivo"}
                    </Button>

                    {!isCreatingNew && selectedInstanceId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="w-full h-11 min-h-11 text-xs font-medium gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <RefreshCw className={cn("size-4", isSyncing && "animate-spin motion-reduce:animate-none")} />
                        Sincronizar Status
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Visor do QR Code e Status em Tempo Real */}
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-border/80 bg-muted/15 space-y-4 text-center">
              {isGenerating ? (
                <div className="flex flex-col items-center text-center space-y-3 py-10">
                  <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <RefreshCw className="size-7 animate-spin motion-reduce:animate-none" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">Conectando ao Gateway...</h4>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Iniciando sessão Baileys na VPS e requisitando handshake seguro em tempo real.
                    </p>
                  </div>
                </div>
              ) : connectionStatus === "connected" ? (
                <div className="flex flex-col items-center text-center space-y-4 py-4 w-full">
                  <div className="size-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">WhatsApp Conectado e Ativo</h4>
                    <p className="text-xs font-mono font-semibold text-foreground">
                      {activeInstance?.display_phone_number || "Sessão ativa na VPS"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs gap-2 py-1 px-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    <Radio className="size-3 text-emerald-500 animate-pulse" />
                    Online • Recebendo e enviando mensagens
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs pt-1">
                    Este aparelho está sincronizado com a central de atendimento e pronto para múltiplos atendentes.
                  </p>
                </div>
              ) : connectionStatus === "error" && lastErrorMessage && !qrBase64 ? (
                <div className="flex flex-col items-center text-center space-y-3 py-6">
                  <div className="size-14 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                    <AlertTriangle className="size-7" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-sm font-bold text-foreground">Falha de Comunicação com Gateway</h4>
                    <p className="text-xs text-muted-foreground break-words">
                      {lastErrorMessage}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateQrCode}
                    disabled={isGenerating}
                    className="h-11 min-h-11 text-xs gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Tentar Gerar Novamente
                  </Button>
                </div>
              ) : qrBase64 && qrExpired ? (
                <div className="flex flex-col items-center text-center space-y-3 py-6">
                  <div className="size-14 rounded-full bg-warning/15 text-warning-strong flex items-center justify-center">
                    <Clock className="size-7" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-sm font-bold text-foreground">QR Code Expirado</h4>
                    <p className="text-xs text-muted-foreground">
                      Por segurança, o código de pareamento expira após 60 segundos sem leitura.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerateQrCode}
                    disabled={isGenerating}
                    className="h-11 min-h-11 text-xs font-bold gap-2"
                  >
                    <RefreshCw className="size-4" />
                    Gerar Novo QR Code
                  </Button>
                </div>
              ) : qrBase64 ? (
                <div className="flex flex-col items-center space-y-3 w-full">
                  {/* design-lint-ignore DL-18 reason:"Fundo branco obrigatório para leitura óptica de QR Code por câmeras de smartphone" expiry:"2027-10-30" */}
                  <div className="size-52 bg-white p-3 rounded-xl border border-border flex items-center justify-center shadow-xs">
                    <img
                      src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                      alt="QR Code WhatsApp Waesy"
                      className="size-full object-contain"
                    />
                  </div>
                  {pairingCode && (
                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-card border border-border/80 w-full max-w-xs">
                      <div className="text-left min-w-0">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground block font-bold">Código de Pareamento</span>
                        <span className="font-mono text-sm font-bold tracking-widest text-foreground block">
                          {pairingCode}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 min-h-11 px-3 text-xs gap-1 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(pairingCode);
                          toast.success("Código copiado!");
                        }}
                      >
                        <Copy className="size-3.5" />
                        Copiar
                      </Button>
                    </div>
                  )}
                  <div className="w-full text-left bg-card border border-border/70 rounded-lg p-3 space-y-1 text-xs">
                    <span className="font-bold text-foreground block">Como escanear:</span>
                    <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
                      <li>No celular, abra o <strong>WhatsApp</strong>.</li>
                      <li>Toque em <strong>Aparelhos conectados &gt; Conectar um aparelho</strong>.</li>
                      <li>Aponte a câmera para o QR Code acima.</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-3 py-8">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/50">
                    <QrCode className="size-8" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-sm font-bold text-foreground">Aguardando Pareamento</h4>
                    <p className="text-xs text-muted-foreground">
                      Clique em <strong>Gerar QR Code Ao Vivo</strong> para emitir o código de conexão para o seu celular.
                    </p>
                  </div>
                  <div className="w-full text-left bg-card border border-border/70 rounded-lg p-3 space-y-1 text-xs mt-2">
                    <span className="font-bold text-foreground block">Como escanear:</span>
                    <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
                      <li>No celular, abra o <strong>WhatsApp</strong>.</li>
                      <li>Toque em <strong>Aparelhos conectados &gt; Conectar um aparelho</strong>.</li>
                      <li>Aponte a câmera para o QR Code.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Formulário Passo a Passo Meta Cloud API Oficial (Espelhando connect_ac.png) */
          <form onSubmit={handleSaveOfficialMeta} className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            <div className="md:col-span-7 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome da Conexão Oficial</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="WhatsApp Oficial Meta"
                  className="h-11 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Phone Number ID *</Label>
                  <Input
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    placeholder="Ex.: 1059283910293"
                    className="h-11 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">WABA Account ID *</Label>
                  <Input
                    value={metaWabaId}
                    onChange={(e) => setMetaWabaId(e.target.value)}
                    placeholder="Ex.: 984123049123"
                    className="h-11 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">System User Access Token Permanente *</Label>
                <Input
                  type="password"
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder="EAAG..."
                  className="h-11 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Webhook Verify Token</Label>
                <Input
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  placeholder="waesy_meta_verify_token"
                  className="h-11 text-xs font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isGenerating} className="h-11 min-h-11 text-xs font-bold">
                  {isGenerating ? "Configurando..." : "Vincular Conta Oficial Meta"}
                </Button>
              </div>
            </div>

            <div className="md:col-span-5 p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <h4 className="text-xs font-bold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Requisitos Meta Cloud API
              </h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Número de telefone válido registrado no Meta Business.</li>
                <li>Aplicativo criado em <strong>developers.facebook.com</strong> com o produto WhatsApp ativo.</li>
                <li>Perfil comercial verificado em modo Live.</li>
                <li>Token permanente gerado em Usuários do Sistema.</li>
                <li>Webhook apontado para <code>/api/webhooks/whatsapp</code>.</li>
              </ol>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
