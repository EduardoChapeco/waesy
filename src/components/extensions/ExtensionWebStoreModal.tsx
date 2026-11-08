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
  Sparkles,
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
  onDownloadDirect?: (type: ExtensionPackageType) => void;
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
    name: "Waesy Sync — Infotravel Radar & Quotes",
    version: "v2.1.0",
    tagline: "Sincronização bidirecional em tempo real de cotações aéreas e hoteleiras entre o Infotravel e o Workspace Waesy.",
    category: "Turismo & Produtividade",
    description:
      "A extensão Waesy Sync para Infotravel elimina a digitação manual de pacotes e cotações. Ela intercepta pesquisas nos portais de consolidadoras parceiras, estruturando automaticamente trechos aéreos, tarifas, comissões e hotéis diretamente no funil comercial do CRM Turis.",
    badgeText: "Exclusivo Agências Credenciadas",
    filename: "waesy-sync-infotravel-v2.1.zip",
    features: [
      {
        title: "Captura Automática de Tarifas",
        desc: "Lê trechos, classes tarifárias, franquias de bagagem e valores net/brutos com 1 clique.",
        icon: Sparkles,
      },
      {
        title: "Radar de Oportunidades",
        desc: "Calcula a margem da agência em tempo real e sugere acréscimo de markup ou taxa de emissão.",
        icon: Layers,
      },
      {
        title: "Integração Direta com CRM",
        desc: "Envia o pacote diretamente para a proposta comercial do cliente em `_store.proposta`.",
        icon: Globe,
      },
      {
        title: "Exportação Multiformato",
        desc: "Gera relatórios em formato CSV no padrão brasileiro e arquivos JSON para conferência financeira.",
        icon: FileText,
      },
    ],
    permissions: [
      {
        host: "*.infotravel.com.br/*",
        why: "Acesso estrito à tela de resultados de buscas de voos e hotéis para leitura de tarifas.",
      },
      {
        host: "Domínio Waesy / API BFF",
        why: "Envio autenticado via Bearer token das cotações selecionadas para o servidor.",
      },
    ],
    requirements: [
      "Navegadores Chromium (Google Chrome 100+, Microsoft Edge, Brave, Opera)",
      "Acesso operacional ativo ao portal Infotravel da consolidadora",
      "Credenciais de operador ou agente no Workspace Waesy Turismo",
    ],
    steps: [
      "Faça o download do arquivo ZIP homologado através do botão abaixo.",
      "Descompacte o arquivo em uma pasta permanente no seu computador.",
      "Abra o Chrome e digite 'chrome://extensions' na barra de endereços.",
      "Ative a chave 'Modo do desenvolvedor' no canto superior direito.",
      "Clique em 'Carregar sem compactação' e selecione a pasta extraída.",
    ],
  },
  whatsapp_extension: {
    name: "Waesy Ingest — WhatsApp Web Leads",
    version: "v2.1.0",
    tagline: "Captura, sanitização telefônica e ingestão instantânea de contatos e grupos do WhatsApp Web para o CRM Waesy.",
    category: "Comunicação & Vendas",
    description:
      "Desenvolvida para operadores comerciais e gestores de viagens em grupo, esta extensão extrai com segurança os participantes de grupos e conversas abertas no WhatsApp Web, aplicando validação telefônica internacional (+55 DDD) e cadastrando leads automaticamente no pipeline comercial.",
    badgeText: "Governança Zero-Trust",
    filename: "waesy-ingest-whatsapp-v2.1.zip",
    features: [
      {
        title: "Extração Segura em 1 Clique",
        desc: "Lê nome e telefone de participantes de grupos públicos ou de viagens sem necessidade de cadastro manual.",
        icon: Sparkles,
      },
      {
        title: "Sanitização E.164 Brasil",
        desc: "Higieniza prefixos, remove pontuações e valida o 9º dígito em números de todas as regiões brasileiras.",
        icon: ShieldCheck,
      },
      {
        title: "Anti-Duplicidade Ativa",
        desc: "Verifica no CRM se o cliente já existe, associando histórico sem poluir o banco de contatos.",
        icon: Layers,
      },
      {
        title: "Modo Simulação (Dry-Run)",
        desc: "Permite revisar a lista de contatos capturados antes de efetivar o envio definitivo para o banco.",
        icon: FileText,
      },
    ],
    permissions: [
      {
        host: "https://web.whatsapp.com/*",
        why: "Acesso à interface do WhatsApp Web para listar participantes do grupo selecionado.",
      },
      {
        host: "Domínio Waesy / Ingest API",
        why: "Transmissão criptografada ponta a ponta dos contatos para `/api/v1/ingest/whatsapp-contacts`.",
      },
    ],
    requirements: [
      "Navegadores Chromium (Google Chrome 100+, Edge, Brave Browser)",
      "Sessão ativa no WhatsApp Web oficial no mesmo navegador",
      "Permissão de operador no módulo comercial do Workspace",
    ],
    steps: [
      "Baixe o arquivo ZIP da extensão disponibilizado após autorização.",
      "Extraia a pasta em um diretório local seguro.",
      "Acesse 'chrome://extensions' no seu navegador.",
      "Ative o 'Modo do desenvolvedor' no topo da página.",
      "Clique em 'Carregar sem compactação' e aponte para a pasta descompactada.",
    ],
  },
  infotravel_miner: {
    name: "Waesy Miner — Extratores & Scripts Locais",
    version: "v1.4.0",
    tagline: "Scripts de console e automações Node/Python para extração massiva de disponibilidades e tarifas em lote.",
    category: "Automação & Dados",
    description:
      "Pacote de ferramentas para desenvolvedores e operadores avançados que realizam cotações de grande volume ou auditoria de malha aérea. Contém scripts prontos para mineração programada de rotas e integração com o banco de dados Waesy.",
    badgeText: "Ferramenta Avançada",
    filename: "waesy-miner-infotravel-scripts.zip",
    features: [
      {
        title: "Varredura de Rotas em Lote",
        desc: "Pesquisa múltiplos pares de origem e destino sequencialmente para encontrar melhores tarifas.",
        icon: Sparkles,
      },
      {
        title: "Scripts Node.js e Python",
        desc: "Código aberto e limpo, sem dependências proprietárias pesadas, pronto para execução em linha de comando.",
        icon: Laptop,
      },
      {
        title: "Compatível com Puppeteer",
        desc: "Automatiza a navegação sem cabeça para geração de relatórios diários de flutuação de preços.",
        icon: Layers,
      },
      {
        title: "Schemas Zod Integrados",
        desc: "Validação rigorosa de cada objeto minerado antes do upload para a base de dados.",
        icon: ShieldCheck,
      },
    ],
    permissions: [
      {
        host: "Ambiente Local / Terminal",
        why: "Execução na máquina do operador via Node.js ou Python com chave de API local.",
      },
      {
        host: "API de Ingestão Waesy",
        why: "Upload dos lotes minerados para o módulo de turismo da agência.",
      },
    ],
    requirements: [
      "Node.js 18+ ou Python 3.10+ instalado na máquina local",
      "Terminal de comando (PowerShell, Bash ou Zsh)",
      "Token de API gerado nas configurações da loja",
    ],
    steps: [
      "Baixe o arquivo ZIP contendo os scripts e schemas.",
      "Descompacte no diretório de sua preferência.",
      "Abra o terminal na pasta e execute 'npm install' ou 'pip install -r requirements.txt'.",
      "Configure o arquivo .env local com seu token e URL da API Waesy.",
      "Execute o script de teste para validar a conexão.",
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
      onDownloadDirect(extensionType);
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
                <Button
                  variant="outline"
                  size="default"
                  disabled
                  className="h-11 min-h-11 px-6 font-semibold gap-2 opacity-80 cursor-not-allowed"
                >
                  <Clock className="size-4 text-warning-strong" />
                  <span>Aguardando Liberação</span>
                </Button>
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
                <h3 className="text-sm font-bold text-foreground">Passo a Passo de Instalação no Navegador</h3>
                <div className="space-y-2">
                  {meta.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-card flex items-start gap-3 text-xs"
                    >
                      <span className="size-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
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
