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
  instances,
  onInstancesUpdated,
  canManageConnection = true,
  isPlatformMaster = false,
}: WhatsAppQrConnectModalProps) {
  const [selectedMode, setSelectedMode] = useState<"qr_baileys" | "meta_official">("qr_baileys");
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Campos API Oficial Meta
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");

  const activeInstance = instances.find((item) => item.id === selectedInstanceId) || instances[0] || null;

  useEffect(() => {
    if (activeInstance) {
      setSelectedInstanceId(activeInstance.id);
      setDisplayName(activeInstance.display_name);
      setInstanceKey(activeInstance.instance_key);
      setDepartment(String(activeInstance.public_config?.department || "Atendimento Geral"));
      setQrBase64((activeInstance.public_config?.qr_code_url as string) || null);
      setPairingCode((activeInstance.public_config?.pairing_code as string) || null);
      setConnectionStatus(activeInstance.status);
      setIsGlobalMaster(Boolean(activeInstance.public_config?.is_global_master));
    }
  }, [activeInstance?.id]);

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
          toast.success("Aparelho WhatsApp conectado e sincronizado!");
          onInstancesUpdated();
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
    try {
      const result = await connectWhatsAppQrCodeInstance({
        data: {
          id: selectedInstanceId || undefined,
          displayName: displayName.trim() || "WhatsApp Principal",
          instanceKey: instanceKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "principal",
          department: department.trim() || "Geral",
          isGlobalMaster: isPlatformMaster && isGlobalMaster,
        },
      });
      setSelectedInstanceId(result.instance.id);
      setQrBase64(result.qrCodeBase64);
      setPairingCode(result.pairingCode);
      setConnectionStatus(result.instance.status);
      onInstancesUpdated();

      if (result.connectionState === "connected") {
        toast.success("Este número já está conectado e ativo na VPS!");
      } else if (result.qrCodeBase64) {
        toast.success("QR Code gerado ao vivo! Aponte a câmera do WhatsApp.");
      } else {
        toast.info("Instância registrada. Clique em atualizar status em alguns segundos.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR Code na VPS.");
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
        toast.success("WhatsApp conectado e operante!");
      } else {
        toast.info(`Estado atual da instância: ${result.state}`);
      }
      onInstancesUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível sincronizar status.");
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
      toast.success("Sessão do WhatsApp desconectada com segurança.");
      onInstancesUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao desconectar aparelho.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleStartNewNumber = () => {
    setSelectedInstanceId(null);
    setDisplayName(`WhatsApp Setor ${instances.length + 1}`);
    setInstanceKey(`setor_${instances.length + 1}`);
    setDepartment("Vendas & Comercial");
    setQrBase64(null);
    setPairingCode(null);
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
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto pt-safe-modal">
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
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-600 border-amber-500/30",
              )}
            >
              {connectionStatus === "connected" ? "Aparelho Conectado" : "Aguardando Pareamento"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Seletor de Números / Instâncias da Loja */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          {instances.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => setSelectedInstanceId(inst.id)}
              className={cn(
                "h-11 min-h-11 px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedInstanceId === inst.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  inst.status === "connected" ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              <span>{inst.display_name}</span>
              <Badge variant="secondary" className="text-2xs">
                {String(inst.public_config?.department || inst.instance_key)}
              </Badge>
            </button>
          ))}

          {canManageConnection && (
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
              <Badge variant="outline" className="text-2xs">VPS Waesy</Badge>
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
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
              <Badge variant="outline" className="text-2xs">Graph API</Badge>
            </div>
            <p className="text-2xs text-muted-foreground mt-1">
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            {/* Coluna Esquerda: Dados do Número e Setor */}
            <div className="md:col-span-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Nome de Identificação do Aparelho</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex.: WhatsApp Recepção / Vendas"
                  className="h-11 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Chave do Canal</Label>
                  <Input
                    value={instanceKey}
                    onChange={(e) =>
                      setInstanceKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))
                    }
                    placeholder="vendas_01"
                    className="h-11 text-xs font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Setor Padrão</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Vendas, Suporte, Mobilidade..."
                    className="h-11 text-xs"
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
                    <span className="text-2xs text-muted-foreground block">
                      Ativa auto-verificação de perfil civil, chamada de corrida/frete Waesy Go e cotações aéreas via WhatsApp.
                    </span>
                  </div>
                </label>
              )}

              <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-2">
                <p className="text-xs font-bold text-foreground">Como escanear:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Clique em <strong>Gerar QR Code Ao Vivo</strong> abaixo.</li>
                  <li>No celular, abra o WhatsApp &gt; <strong>Aparelhos conectados</strong>.</li>
                  <li>Toque em <strong>Conectar um aparelho</strong> e aponte para a tela.</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleGenerateQrCode}
                  disabled={isGenerating}
                  className="h-11 min-h-11 flex-1 text-xs font-bold gap-2"
                >
                  <QrCode className="size-4" />
                  {isGenerating ? "Gerando na VPS..." : "Gerar QR Code Ao Vivo"}
                </Button>

                {selectedInstanceId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="h-11 min-h-11 text-xs gap-2"
                  >
                    <RefreshCw className={cn("size-4", isSyncing && "animate-spin motion-reduce:animate-none")} />
                    Sincronizar
                  </Button>
                )}

                {selectedInstanceId && connectionStatus === "connected" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="h-11 min-h-11 text-xs text-destructive gap-2"
                  >
                    <PowerOff className="size-4" />
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            {/* Coluna Direita: Visor do QR Code em Tempo Real */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-border bg-muted/10 space-y-3">
              {connectionStatus === "connected" ? (
                <div className="flex flex-col items-center text-center space-y-3 py-6">
                  <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="size-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">WhatsApp Conectado e Ativo</h4>
                    <p className="text-xs text-muted-foreground">
                      {activeInstance?.display_phone_number || "Sessão autenticada na VPS Oracle Cloud"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-2xs gap-1">
                    <Radio className="size-3 text-emerald-500" />
                    Recebendo e enviando mensagens em tempo real
                  </Badge>
                </div>
              ) : qrBase64 ? (
                <>
                  {/* design-lint-ignore DL-18 reason:"Fundo branco obrigatório para leitura óptica de QR Code por câmeras de smartphone" expiry:"2027-10-30" */}
                  <div className="size-56 bg-white p-3 rounded-lg border border-border flex items-center justify-center">
                    <img
                      src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                      alt="QR Code WhatsApp Waesy"
                      className="size-full object-contain"
                    />
                  </div>
                  {pairingCode && (
                    <div className="text-center">
                      <span className="text-2xs text-muted-foreground block">Código de Pareamento:</span>
                      <span className="font-mono text-sm font-bold tracking-widest text-foreground">
                        {pairingCode}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-emerald-600 font-medium text-center">
                    Aguardando leitura pelo celular (atualização automática)...
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center text-center space-y-3 py-8">
                  <QrCode className="size-24 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Clique em <strong>Gerar QR Code Ao Vivo</strong> para requisitar um código instantâneo ao servidor WhatsApp.
                  </p>
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
