import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExtensionWebStoreModal } from "@/components/extensions/ExtensionWebStoreModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getIngestStatusFn,
  issueIngestTokenFn,
  revokeIngestTokensFn,
} from "@/services/whatsapp-group-ingest.functions";

interface WhatsAppGroupIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppGroupIngestModal({ isOpen, onClose }: WhatsAppGroupIngestModalProps) {
  const queryClient = useQueryClient();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isDownloadingExtension, setIsDownloadingExtension] = useState(false);
  const [isWebStoreOpen, setIsWebStoreOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleDownloadExtension = async () => {
    setIsDownloadingExtension(true);
    try {
      const res = await fetch("/api/v1/extensions/download?type=whatsapp_extension", {
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 || err?.can_request) {
          setIsWebStoreOpen(true);
          toast.info("Acesso sob demanda. Veja as informações da extensão e solicite a liberação.");
        } else {
          toast.error(err?.error || "Acesso restrito para download desta extensão.");
        }
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let filename = "waesy-ingest-whatsapp-v2.1.zip";
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
      toast.error(err?.message || "Falha ao baixar extensão do WhatsApp.");
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  const { data: status, isLoading } = useQuery({
    queryKey: ["whatsapp-ingest-status"],
    queryFn: () => getIngestStatusFn(),
    enabled: isOpen,
  });

  const issueMutation = useMutation({
    mutationFn: () => issueIngestTokenFn({ data: { label: "Extensão Chrome Excelência Tour" } }),
    onSuccess: (res) => {
      setIssuedToken(res.token);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-ingest-status"] });
      toast.success("Novo token gerado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao emitir token de ingestão.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => revokeIngestTokensFn(),
    onSuccess: () => {
      setIssuedToken(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-ingest-status"] });
      toast.success("Tokens anteriores revogados com sucesso.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao revogar tokens.");
    },
  });

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const handleCopy = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="size-5 text-primary" />
              Integração Extensão WhatsApp (Grupos & Oportunidades)
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Gestão de credenciais exclusivas para sincronização automatizada e idempotente de contatos pré-CRM.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm">Verificando autorização do workspace...</p>
          </div>
        ) : !status?.isFeatureGranted ? (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <ShieldAlert className="size-5" />
              Acesso Restrito ao Recurso
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A ingestão de grupos do WhatsApp é uma funcionalidade restrita concedida exclusivamente ao workspace da{" "}
              <strong>Excelência Tour São Miguel do Oeste</strong>. Seu workspace atual não possui a grant{" "}
              <code className="text-xs bg-muted px-1 py-1 rounded">whatsapp_group_ingest</code>. Nenhuma sincronização externa pode ser autenticada.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Status do Workspace */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-foreground">
                    Workspace Habilitado: {status.storeName || "Excelência Tour SMO"}
                  </span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    {status.isAdminMasterBypass ? "Admin Master" : "Exclusivo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Garantia de isolamento server-side. Clientes cadastrados não são rebaixados para leads frios e números duplicados são consolidados automaticamente.
                </p>
              </div>
            </div>

            {/* Novo Token Emitido */}
            {issuedToken && (
              <div className="p-4 rounded-xl border border-warning/30 bg-warning/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-warning-strong font-semibold text-sm">
                    <AlertTriangle className="size-4" />
                    Token Gerado — Copie Agora
                  </div>
                  <Badge variant="outline" className="text-xs border-warning/30 text-warning-strong">
                    Válido por 90 dias
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Por segurança criptográfica de zero-trust, apenas o hash SHA-256 é armazenado no servidor. Este token não poderá ser visualizado novamente após fechar esta janela.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={issuedToken}
                    className="font-mono text-xs h-11 bg-background select-all"
                  />
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => handleCopy(issuedToken, false)}
                    className="h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copiedToken ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiedToken ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Dados para a Extensão */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">1. URL do Servidor Waesy</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={currentOrigin}
                  className="font-mono text-xs h-11 bg-muted/40 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(currentOrigin, true)}
                  className="h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copiedUrl ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedUrl ? "Copiado!" : "Copiar URL"}
                </Button>
              </div>
            </div>

            {/* Download e Instruções de Instalação */}
            <div className="rounded-xl border border-border p-4 space-y-4 bg-muted/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Download className="size-3.5 text-primary" />
                    Download da Extensão Oficial (Chrome)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pacote compactado com manifest V3 e painel amplo para WhatsApp Web.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDownloadingExtension}
                    onClick={handleDownloadExtension}
                    className="h-11 min-h-11 px-4 gap-2 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isDownloadingExtension ? (
                      <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    {isDownloadingExtension ? "Empacotando..." : "Baixar Extensão (.zip)"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWebStoreOpen(true)}
                    className="h-11 min-h-11 px-4 gap-2 font-semibold text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="size-4" />
                    Ver na Store / Acesso
                  </Button>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <Lock className="size-3.5" />
                  Passo a Passo de Instalação e Uso
                </h5>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Clique no botão acima para baixar o arquivo <strong>waesy-ingest-whatsapp-v2.2.zip</strong> e extraia o conteúdo em uma pasta de sua preferência (ou use <code className="bg-muted px-2 py-1 rounded">tools/whatsapp-extension</code>).
                  </li>
                  <li>
                    No Google Chrome ou Edge, acesse <code className="bg-muted px-2 py-1 rounded">chrome://extensions</code>, habilite o <strong>Modo do desenvolvedor</strong> e clique em <strong>Carregar sem compactação</strong> selecionando a pasta da extensão.
                  </li>
                  <li>
                    Abra a extensão, clique na aba <strong>Conexão Waesy</strong> e cole a <strong>URL do Servidor</strong> e o <strong>Token de Ingestão</strong> gerado acima.
                  </li>
                  <li>
                    No <strong>WhatsApp Web</strong>, abra o grupo desejado, clique no ícone da extensão e pressione <strong>Escanear Participantes</strong> para enviar ao CRM.
                  </li>
                </ol>
              </div>
            </div>

            {/* Gerenciamento de Tokens */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {status.hasActiveToken ? (
                  <span>
                    Status: <strong>{status.activeTokenCount} token(s) ativo(s)</strong>
                    {status.lastUsedAt && (
                      <span className="ml-1">
                        (último uso: {new Date(status.lastUsedAt).toLocaleDateString("pt-BR")})
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Nenhum token ativo no momento. Gere um novo token para conectar a extensão.</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {status.hasActiveToken && !confirmRevoke && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokeMutation.isPending}
                    onClick={() => setConfirmRevoke(true)}
                    className="h-11 min-h-11 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Revogar Tokens
                  </Button>
                )}

                {status.hasActiveToken && confirmRevoke && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => {
                        setConfirmRevoke(false);
                        revokeMutation.mutate();
                      }}
                      className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {revokeMutation.isPending ? "Revogando..." : "Confirmar Revogação"}
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
                  disabled={issueMutation.isPending}
                  onClick={() => issueMutation.mutate()}
                  className="h-11 min-h-11 px-4 text-xs font-semibold border-primary/50 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Key className="size-3.5 mr-2" />
                  {issueMutation.isPending ? "Gerando..." : "Gerar Novo Token"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 min-h-11 px-6 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ExtensionWebStoreModal
      isOpen={isWebStoreOpen}
      onClose={() => setIsWebStoreOpen(false)}
      extensionType="whatsapp_extension"
      onDownloadDirect={handleDownloadExtension}
    />
    </>
  );
}

