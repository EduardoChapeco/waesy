import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  Clock,
  Lock,
  Globe,
  FileText,
  Laptop,
  X,
  Send,
  Loader2,
  ExternalLink,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExtensionAccessStatusFn,
  submitExtensionAccessRequestFn,
  type ExtensionPackageType,
  type ExtensionAccessStatusDTO,
} from "@/services/extensions-distributor.functions";

export interface ExtensionWebStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensionType: ExtensionPackageType;
  storeName?: string | null;
  onDownloadDirect?: (type: ExtensionPackageType) => void | Promise<void>;
}

const EXTENSION_CATALOG: Record<
  ExtensionPackageType,
  {
    name: string;
    version: string;
    tagline: string;
    category: string;
    description: string;
    badgeText: string;
    filename: string;
    features: { title: string; desc: string; icon: any }[];
    permissions: { host: string; why: string }[];
    requirements: string[];
    steps: string[];
  }
> = {
  infotravel_extension: {
    name: "Waesy Sync — Operadoras Infotravel",
    version: "v2.2.0",
    tagline: "Extração em 2º plano de reservas, passageiros, faturas e cotações em qualquer portal Infotravel (Orinter, FRT, Incomum, Schultz).",
    category: "Turismo & Operadoras",
    description:
      "A extensão Waesy Sync conecta qualquer portal Infotravel diretamente ao seu Waesy CRM. Extrai reservas e passageiros com isolamento de aba ativa, captura orçamentos passivos para o Radar e sincroniza com autenticação Bearer wae_... ou exportação CSV/JSON.",
    badgeText: "Exclusivo Agências Credenciadas",
    filename: "waesy-sync-infotravel-v2.2.zip",
    features: [
      {
        title: "Qualquer Portal Infotravel",
        desc: "Compatível nativamente com Orinter, FRT, Incomum, Schultz e qualquer subdomínio white-label via botão Ativar neste Portal.",
        icon: Zap,
      },
      {
        title: "Sincronização em Nuvem & CRM",
        desc: "Envia reservas, clientes, CPFs, datas de embarque e composição financeira direto para /api/v1/ingest/infotravel-reservations.",
        icon: Globe,
      },
      {
        title: "Radar de Cotações Passivo",
        desc: "Observa buscas aéreas, hotéis e carrinho Monte Seu Pacote para gerar oportunidades automáticas no pipeline.",
        icon: Layers,
      },
      {
        title: "Exportação CSV BR & JSON",
        desc: "Gera CSV com ponto-e-vírgula, UTF-8 BOM para Excel brasileiro e espelhamento opcional via coletor local (porta 3333).",
        icon: FileText,
      },
    ],
    permissions: [
      {
        host: "*://*.orinter.com.br/*, *://*.incomumviagens.com.br/*, *://*.frt.com.br/*, *://*.schultz.com.br/*, *://*/*infotravel*",
        why: "Leitura do DOM nas telas de Pesquisa de Reservas e Cotações Infotravel, mais ativação sob demanda em domínios customizados.",
      },
      {
        host: "API BFF Waesy (Bearer Token wae_...)",
        why: "Envio autenticado de cotações e reservas exclusivamente para a loja vinculada ao token.",
      },
    ],
    requirements: [
      "Navegadores Chromium (Google Chrome 100+, Microsoft Edge, Brave)",
      "Sessão ativa em qualquer portal Infotravel (Orinter, FRT, Incomum, Schultz ou white-label)",
      "Token wae_... gerado no painel Turismo > Operadoras Infotravel",
    ],
    steps: [
      "Faça o download do arquivo ZIP através do botão abaixo (ou use a pasta tools/infotravel-extension).",
      "Descompacte em uma pasta permanente no computador.",
      "Abra 'chrome://extensions' (ou 'edge://extensions') e ative o 'Modo do desenvolvedor'.",
      "Clique em 'Carregar sem compactação' e selecione a pasta extraída.",
      "Na aba Conexão Waesy da extensão, informe o servidor e cole seu Token wae_... para sincronizar com o CRM.",
    ],
  },
  whatsapp_extension: {
    name: "Waesy Ingest — WhatsApp Web Leads",
    version: "v2.2.0",
    tagline: "Captura com rolagem virtualizada, sanitização E.164 e envio em lotes idempotentes de grupos do WhatsApp Web.",
    category: "Comunicação & Vendas",
    description:
      "Extrai participantes de grupos e conversas do WhatsApp Web incluindo listas longas virtualizadas no painel de membros e modal 'Ver todos', normalizando telefones brasileiros (+55) sem rebaixar clientes já cadastrados.",
    badgeText: "Governança Zero-Trust",
    filename: "waesy-ingest-whatsapp-v2.2.zip",
    features: [
      {
        title: "Varredura com Auto-Scroll",
        desc: "Percorre automaticamente listas virtualizadas de participantes, atributos JID (@c.us) e subtítulos de grupos grandes.",
        icon: Zap,
      },
      {
        title: "Sanitização E.164 Brasil",
        desc: "Normaliza DDD + DDI +55 e preserva os nomes identificados no grupo ou painel de membros.",
        icon: ShieldCheck,
      },
      {
        title: "Lotes Idempotentes & CRM",
        desc: "Fatia listas grandes em lotes de até 500 contatos com contadores exatos de novos, mesclados e opt-out.",
        icon: Layers,
      },
      {
        title: "Modo Simulação (Dry-Run)",
        desc: "Valida e audita todos os contatos com o servidor antes de efetivar a gravação na fila comercial.",
        icon: FileText,
      },
    ],
    permissions: [
      {
        host: "https://web.whatsapp.com/*",
        why: "Leitura controlada do painel de participantes e conversas ativas no WhatsApp Web.",
      },
      {
        host: "API BFF Waesy (/api/v1/ingest/whatsapp-contacts)",
        why: "Transmissão autenticada via Bearer Token wae_... para o workspace da agência.",
      },
    ],
    requirements: [
      "Navegadores Chromium (Google Chrome 100+, Microsoft Edge, Brave)",
      "Sessão ativa no WhatsApp Web oficial (https://web.whatsapp.com)",
      "Token wae_... gerado em Turismo > Oportunidades > Extensão WhatsApp",
    ],
    steps: [
      "Baixe o ZIP ou utilize a pasta local tools/whatsapp-extension.",
      "Extraia em uma pasta permanente caso use o pacote ZIP.",
      "Acesse 'chrome://extensions' e ative o 'Modo do desenvolvedor'.",
      "Clique em 'Carregar sem compactação' e selecione a pasta.",
      "Configure URL e Token wae_... na aba Conexão Waesy e escaneie o grupo aberto.",
    ],
  },
  infotravel_miner: {
    name: "Waesy Miner — Extrator Autônomo & Coletor Local",
    version: "v2.2.0",
    tagline: "Automação Playwright local (miner.mjs) e servidor gravador HTTP (coletor.mjs na porta 3333) para grandes volumes em CSV/JSON.",
    category: "Automação & Dados",
    description:
      "Pacote local em Node.js + Playwright para extração massiva paginada com sessão persistente (.chrome-session) e servidor HTTP local (porta 3333) para espelhamento em disco dos dados capturados pela extensão Chrome.",
    badgeText: "Ferramenta Avançada",
    filename: "waesy-miner-infotravel-scripts.zip",
    features: [
      {
        title: "Extração Paginada Playwright",
        desc: "O script miner.mjs navega automaticamente pelas páginas de reservas com jitter randômico anti-bloqueio e retomada via progresso.json.",
        icon: Zap,
      },
      {
        title: "Coletor Local Porta 3333",
        desc: "O coletor.mjs recebe os envios da extensão Chrome em tempo real e grava no arquivo CSV canônico e JSON local.",
        icon: Laptop,
      },
      {
        title: "Launchers .bat em 1 Clique",
        desc: "Inclui iniciar_coletor_local.bat, iniciar_teste_piloto.bat e iniciar_extracao_completa.bat para operação rápida no Windows.",
        icon: Layers,
      },
      {
        title: "Envio Opcional ao CRM",
        desc: "Suporta argumentos --url, --server e --token para enviar reservas diretamente para /api/v1/ingest/infotravel-reservations.",
        icon: ShieldCheck,
      },
    ],
    permissions: [
      {
        host: "Ambiente Local (127.0.0.1:3333)",
        why: "Gravação de arquivos CSV/JSON na pasta output/ pelo servidor coletor.mjs.",
      },
      {
        host: "API de Ingestão Waesy (opcional)",
        why: "Envio opcional autenticado com --token=wae_... para o pipeline de reservas do workspace.",
      },
    ],
    requirements: [
      "Node.js 18+ instalado no computador",
      "Google Chrome, Microsoft Edge ou Chromium gerenciado pelo Playwright",
      "Acesso ativo ao portal Infotravel da operadora",
    ],
    steps: [
      "Baixe e extraia o arquivo ZIP em uma pasta permanente (ex: C:\\waesy-miner).",
      "Execute 'npm install' na pasta (ou dê dois cliques em iniciar_teste_piloto.bat).",
      "Para espelhar a extensão Chrome no disco, execute iniciar_coletor_local.bat.",
      "Para mineração em lote, execute iniciar_teste_piloto.bat ou iniciar_extracao_completa.bat e faça login no portal.",
      "Importe o CSV gerado em output/ na tela Turismo > Operadoras Infotravel.",
    ],
  },
};

export function ExtensionWebStoreModal({
  isOpen,
  onClose,
  extensionType,
  storeName,
  onDownloadDirect,
}: ExtensionWebStoreModalProps) {
  const meta = EXTENSION_CATALOG[extensionType];

  const [activeTab, setActiveTab] = useState<"overview" | "privacy" | "install">("overview");
  const [statusData, setStatusData] = useState<ExtensionAccessStatusDTO | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Form State
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingStatus(true);

    getExtensionAccessStatusFn({ data: { type: extensionType } })
      .then((res) => {
        if (mounted) {
          setStatusData(res);
        }
      })
      .catch((err) => {
        console.warn("[ExtensionWebStoreModal] Erro ao carregar status:", err);
      })
      .finally(() => {
        if (mounted) setIsLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, extensionType]);

  const handleDownload = async () => {
    if (onDownloadDirect) {
      setIsDownloading(true);
      try {
        await onDownloadDirect(extensionType);
      } finally {
        setIsDownloading(false);
      }
      return;
    }

    setIsDownloading(true);
    try {
      const res = await fetch(`/api/v1/extensions/download?type=${extensionType}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Acesso restrito para download desta extensão.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let filename = meta.filename;
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
      toast.error(err?.message || "Falha no download da extensão.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim()) {
      toast.error("Informe seu nome para a solicitação.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitExtensionAccessRequestFn({
        data: {
          extensionType,
          requesterName: requesterName.trim(),
          requesterEmail: requesterEmail.trim() || undefined,
          justification: justification.trim() || undefined,
        },
      });

      toast.success("Solicitação enviada com sucesso ao Administrador Master!");
      setIsRequestFormOpen(false);

      // Atualiza o status local para pendente
      setStatusData((prev: ExtensionAccessStatusDTO | null) =>
        prev
          ? {
              ...prev,
              authorized: false,
              status: "pending",
              pendingRequest: {
                id: "new",
                createdAt: new Date().toISOString(),
                justification: justification.trim() || null,
                status: "pending",
              },
            }
          : null
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar solicitação de acesso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthorized = Boolean(statusData?.authorized);
  const isPending = statusData?.status === "pending";
  const isRejected = statusData?.status === "rejected";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden bg-card border border-border rounded-2xl shadow-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{meta.name}</DialogTitle>
        </DialogHeader>

        {/* Top Header / Web Store Hero */}
        <div className="relative bg-muted/40 border-b border-border p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground h-11 min-h-11 w-11 flex items-center justify-center rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar Vitrine"
          >
            <X className="size-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="size-16 sm:size-20 rounded-2xl bg-background border border-border flex items-center justify-center p-3 shrink-0">
              <Layers className="size-10 text-primary" />
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-3xs font-bold uppercase tracking-wider">
                  {meta.badgeText}
                </Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-mono">{meta.version}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{meta.category}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {meta.name}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {meta.tagline}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  Oferecido por Waesy Tecnologia
                </span>
                <span>•</span>
                <span>Agência Parceira Padrão: Excelência Tour SMO</span>
              </div>
            </div>
          </div>

          {/* Action Bar / Status Box */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="space-y-1">
              {isLoadingStatus ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Verificando credenciais da sua loja...</span>
                </div>
              ) : isAuthorized ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-2 py-1 px-3 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="size-3.5" />
                    <span>Acesso Autorizado para {storeName || statusData?.storeName || "Sua Agência"}</span>
                  </Badge>
                  {statusData?.isAdminMaster && (
                    <Badge variant="outline" className="text-xs">
                      Admin Master
                    </Badge>
                  )}
                </div>
              ) : isPending ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant="outline" className="gap-2 py-1 px-3 border-warning/50 bg-warning/10 text-warning-strong font-semibold w-fit">
                    <Clock className="size-3.5" />
                    <span>Solicitação em Análise pelo Administrador Master</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Enviada em {statusData?.pendingRequest?.createdAt ? new Date(statusData.pendingRequest.createdAt).toLocaleDateString("pt-BR") : "recente"}
                  </span>
                </div>
              ) : isRejected ? (
                <div className="space-y-1">
                  <Badge variant="destructive" className="gap-2 py-1 px-3 font-semibold">
                    <Lock className="size-3.5" />
                    <span>Acesso Não Liberado</span>
                  </Badge>
                  {statusData?.pendingRequest?.reviewNotes && (
                    <p className="text-xs text-muted-foreground italic">
                      Motivo: {statusData.pendingRequest.reviewNotes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-medium gap-1 text-muted-foreground">
                    <Lock className="size-3" />
                    <span>Acesso sob Demanda</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Disponível para agências credenciadas pelo Admin Master
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isAuthorized ? (
                <Button
                  variant="default"
                  size="default"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="h-11 min-h-11 px-6 font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isDownloading ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  <span>Baixar Extensão (.zip)</span>
                </Button>
              ) : isPending ? (
                <div
                  role="status"
                  className="inline-flex items-center justify-center h-11 min-h-11 px-5 rounded-xl border border-border bg-muted/50 text-sm font-semibold text-foreground gap-2"
                >
                  <Clock className="size-4 text-warning-strong shrink-0" />
                  <span>Aguardando Liberação</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setIsRequestFormOpen((prev) => !prev)}
                  className="h-11 min-h-11 px-6 font-semibold gap-2 border-primary/50 text-primary hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Send className="size-4" />
                  <span>Pedir Autorização de Acesso</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Form Inline para Solicitação */}
        {isRequestFormOpen && (
          <div className="p-6 bg-muted/20 border-b border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Solicitar Liberação de Extensão</h3>
                <p className="text-xs text-muted-foreground">
                  O Administrador Master receberá seu pedido no painel de governança e concederá a liberação.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRequestFormOpen(false)}
                className="h-11 min-h-11 w-11 p-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar formulário"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="req-name" className="text-xs font-semibold">
                    Nome do Operador ou Agência *
                  </Label>
                  <Input
                    id="req-name"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ex: Eduardo Ramos (Excelência Tour)"
                    className="h-11 min-h-11 text-xs rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="req-email" className="text-xs font-semibold">
                    E-mail de Notificação (Opcional)
                  </Label>
                  <Input
                    id="req-email"
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="operacional@agencia.com.br"
                    className="h-11 min-h-11 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="req-just" className="text-xs font-semibold">
                  Justificativa / Demanda Operacional *
                </Label>
                <Textarea
                  id="req-just"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Necessitamos capturar e sanitizar contatos de passageiros de excursões para envio de vouchers pelo CRM..."
                  rows={3}
                  className="text-xs p-3 rounded-lg resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestFormOpen(false)}
                  className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isSubmitting}
                  className="h-11 min-h-11 px-6 text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Confirmar e Enviar Pedido</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Body Tabs */}
        <div className="p-6 sm:p-8 space-y-6 max-h-96 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full h-auto sm:h-11 p-1 bg-muted/60 rounded-xl gap-1">
              <TabsTrigger value="overview" className="h-9 text-xs font-semibold cursor-pointer">
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="privacy" className="h-9 text-xs font-semibold cursor-pointer">
                Permissões & Privacidade
              </TabsTrigger>
              <TabsTrigger value="install" className="h-9 text-xs font-semibold cursor-pointer">
                Como Instalar
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground">O que esta ferramenta faz?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Recursos Principais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {meta.features.map((feat, idx) => {
                    const IconComp = feat.icon;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border bg-card space-y-2"
                      >
                        <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                          <IconComp className="size-4 text-primary shrink-0" />
                          <span>{feat.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PRIVACIDADE & PERMISSÕES */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Auditoria e Compromisso de Privacidade Waesy</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Todas as extensões do ecossistema Waesy são de código aberto auditado, operam estritamente
                  sob demanda pelo operador e não coletam históricos de navegação, cookies de terceiros ou dados
                  externos à aba em que estão ativas. Em total conformidade com a Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Domínios e Hosts Acessados</h3>
                <div className="space-y-2">
                  {meta.permissions.map((perm, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-mono font-bold text-foreground bg-muted px-2 py-1 rounded">
                        {perm.host}
                      </span>
                      <span className="text-muted-foreground sm:text-right">
                        {perm.why}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: COMO INSTALAR */}
            <TabsContent value="install" className="space-y-6 mt-0">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Requisitos de Sistema</h3>
                <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside">
                  {meta.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Instalação no Navegador</h3>
                <div className="space-y-2">
                  {meta.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card flex items-start gap-3 text-xs"
                    >
                      <span className="size-6 rounded-full bg-muted text-foreground font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-foreground leading-relaxed pt-1">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
