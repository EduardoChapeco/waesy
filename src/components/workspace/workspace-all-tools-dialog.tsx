import { useState, useMemo } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CampaignDraftCard } from "@/components/adtech/campaign-draft-card";
import { orchestrateCampaignIntent } from "@/services/mcp-orchestrator.functions";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";
import {
 Search,
 X,
 Package,
 Tags,
 Boxes,
 ClipboardList,
 ShoppingBag,
 Store,
 Truck,
 Users,
 Sliders,
 Calendar,
 MessageSquare,
 Flame,
 Newspaper,
 DollarSign,
 Ticket,
 BarChart3,
 Building2,
 ExternalLink,
 ShieldCheck,
 Zap,
 ArrowRight,
 Settings,
 HelpCircle,
 FileSpreadsheet,
 Globe,
 Coins,
 Scale,
 Receipt,
 Eye,
 Megaphone,
 Share2,
 Star,
 Bell,
 Plane,
 Bus,
 FileText,
 ChefHat,
 Armchair,
 UtensilsCrossed,
 CreditCard,
 Percent,
 Layers,
 Award,
 Target,
  Sparkles,
  Mic,
  MicOff,
  Send,
  Loader2,
} from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { getNicheSemantics } from "@/lib/niche-semantics";

interface WorkspaceAllToolsDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 activeStore?: any;
}

function getFrequentToolsForNiche(semantics: any) {
  if (semantics.nicheId === "tourism") {
    return [
      {
        title: semantics.catalogTitle || "Roteiros",
        path: "/workspace/catalogo/produtos",
        icon: Package,
        badge: "Roteiros",
      },
      {
        title: "Central de Cotações",
        path: "/workspace/turismo/cotacoes",
        icon: Plane,
        badge: "Leads",
      },
      {
        title: "Lâminas Studio",
        path: "/workspace/turismo/propostas",
        icon: FileSpreadsheet,
        badge: "Studio",
      },
      {
        title: "Passageiros",
        path: "/workspace/clientes",
        icon: Users,
        badge: "CRM",
      },
      {
        title: "Financeiro",
        path: "/workspace/financeiro/caixa",
        icon: DollarSign,
        badge: "Caixa",
      },
      {
        title: "Configurações",
        path: "/workspace/configuracoes",
        icon: Settings,
        badge: "Ajustes",
      },
    ];
  }

  if (semantics.nicheId === "services") {
    return [
      {
        title: semantics.catalogTitle || "Serviços",
        path: "/workspace/agenda/servicos",
        icon: Layers,
        badge: "Serviços",
      },
      {
        title: "Agendamentos",
        path: "/workspace/agenda",
        icon: Calendar,
        badge: "Agenda",
      },
      {
        title: "Orçamentos",
        path: "/workspace/orcamentos",
        icon: FileSpreadsheet,
        badge: "Propostas",
      },
      {
        title: "Clientes",
        path: "/workspace/clientes",
        icon: Users,
        badge: "Contatos",
      },
      {
        title: "Financeiro",
        path: "/workspace/financeiro/caixa",
        icon: DollarSign,
        badge: "Caixa",
      },
      {
        title: "Configurações",
        path: "/workspace/configuracoes",
        icon: Settings,
        badge: "Ajustes",
      },
    ];
  }

  if (semantics.nicheId === "gastronomy") {
    return [
      {
        title: "Cardápio",
        path: "/workspace/catalogo/produtos",
        icon: Package,
        badge: "Menu",
      },
      {
        title: "Gestor de Pedidos",
        path: "/workspace/pedidos/gestor",
        icon: ClipboardList,
        badge: "Cozinha",
      },
      {
        title: "Comandas",
        path: "/workspace/pdv/comandas",
        icon: UtensilsCrossed,
        badge: "Mesas",
      },
      {
        title: "Frente de Caixa",
        path: "/workspace/pdv",
        icon: Store,
        badge: "Balcão",
      },
      {
        title: "Financeiro",
        path: "/workspace/financeiro/caixa",
        icon: DollarSign,
        badge: "Caixa",
      },
      {
        title: "Configurações",
        path: "/workspace/configuracoes",
        icon: Settings,
        badge: "Ajustes",
      },
    ];
  }

  // Padrão: Varejo / Comércio Geral
  return [
    {
      title: semantics.catalogTitle || "Produtos",
      path: "/workspace/catalogo/produtos",
      icon: Package,
      badge: "Catálogo",
    },
    {
      title: "Histórico de Vendas",
      path: "/workspace/pedidos",
      icon: ShoppingBag,
      badge: "Vendas",
    },
    {
      title: "Frente de Caixa",
      path: "/workspace/pdv",
      icon: Store,
      badge: "Balcão",
    },
    {
      title: "Clientes",
      path: "/workspace/clientes",
      icon: Users,
      badge: "Contatos",
    },
    {
      title: "Financeiro",
      path: "/workspace/financeiro/caixa",
      icon: DollarSign,
      badge: "Caixa",
    },
    {
      title: "Configurações",
      path: "/workspace/configuracoes",
      icon: Settings,
      badge: "Ajustes",
    },
  ];
}

interface SectorTool {
  title: string;
  path: string;
  icon: any;
  badge?: string;
}

interface SectorGroup {
  id: string;
  title: string;
  description: string;
  tools: SectorTool[];
}

// ── GRADE SETORIAL COMPLETA DE FERRAMENTAS ──
const SECTOR_TOOL_GROUPS: SectorGroup[] = [
  {
    id: "commerce",
    title: "Comércio",
    description: "Gestão de cardápio, estoque, PDV e despacho de pedidos",
    tools: [
      { title: "Produtos", path: "/workspace/catalogo/produtos", icon: Package },
      { title: "Categorias", path: "/workspace/catalogo/categorias", icon: Tags },
      { title: "Adicionais", path: "/workspace/catalogo/atributos", icon: Boxes },
      { title: "Coleções", path: "/workspace/catalogo/colecoes", icon: Sliders },
      { title: "Gestor de Pedidos", path: "/workspace/pedidos/gestor", icon: ClipboardList },
      { title: "Histórico de Vendas", path: "/workspace/pedidos", icon: ShoppingBag },
      { title: "Frente de Caixa", path: "/workspace/pdv", icon: Store },
      { title: "Cozinha KDS", path: "/workspace/pdv/cozinha", icon: ChefHat },
      { title: "Reservas de Mesas", path: "/workspace/reservas", icon: Armchair },
      { title: "Entregadores", path: "/workspace/pedidos/frota", icon: Truck },
      { title: "Estoque", path: "/workspace/estoque", icon: Boxes },
      { title: "Alertas de Reposição", path: "/workspace/estoque/alertas", icon: Flame },
      { title: "Trocas e Devoluções", path: "/workspace/pedidos/trocas", icon: Receipt },
      { title: "Tabelas de Frete", path: "/workspace/logistica/tabelas", icon: Truck },
    ],
  },
  {
    id: "engagement",
    title: "Atendimento",
    description: "Atendimento multicanal, base de contatos e avaliações",
    tools: [
      { title: "Central de Chat", path: "/workspace/atendimento", icon: MessageSquare },
      { title: "Notificações", path: "/workspace/notificacoes", icon: Bell },
      { title: "Clientes", path: "/workspace/clientes", icon: Users },
      { title: "Avaliações", path: "/workspace/avaliacoes", icon: Star },
      { title: "Agenda", path: "/workspace/agenda", icon: Calendar },
      { title: "Orçamentos", path: "/workspace/orcamentos", icon: FileSpreadsheet },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Campanhas, biolinks, banners e ferramentas de conversão",
    tools: [
      { title: "Banners da Loja", path: "/workspace/marketing/banners", icon: Megaphone },
      { title: "Hotpages e Biolinks", path: "/workspace/marketing/hotpages", icon: Globe },
      { title: "Cupons e Promoções", path: "/workspace/marketing/promocoes", icon: Ticket },
      { title: "Anúncios e Campanhas", path: "/workspace/marketing/anuncios", icon: Zap },
      { title: "Redes Sociais", path: "/workspace/marketing/social", icon: Share2 },
      { title: "Avaliações", path: "/workspace/avaliacoes", icon: Star },
      { title: "Publicações", path: "/workspace/noticias", icon: Newspaper },
    ],
  },
  {
    id: "tourism",
    title: "Turismo",
    description: "Cotações, estúdio de lâminas, contratos com assinatura digital e excursões",
    tools: [
      { title: "Central de Cotações", path: "/workspace/turismo/cotacoes", icon: Plane },
      { title: "Lâminas Studio", path: "/workspace/turismo/propostas", icon: FileSpreadsheet },
      { title: "Hotéis e Resorts", path: "/workspace/turismo/hoteis", icon: Building2 },
      { title: "Destinos Turísticos", path: "/workspace/turismo/destinos", icon: Globe },
      { title: "Contratos Digitais", path: "/workspace/turismo/contratos", icon: FileText },
      { title: "Grupos Terrestres", path: "/workspace/turismo/grupos", icon: Bus },
      { title: "Passeios e Ingressos", path: "/workspace/eventos", icon: Calendar },
    ],
  },
  {
    id: "analytics",
    title: "Relatórios",
    description: "Indicadores de faturamento, vendas e fluxo de caixa",
    tools: [
      { title: "Visão Geral", path: "/workspace", icon: BarChart3 },
      { title: "Metas de Vendas", path: "/workspace/relatorios/metas", icon: Target, badge: "Preditivo" },
      { title: "Fluxo de Caixa", path: "/workspace/financeiro/caixa", icon: DollarSign },
      { title: "Contas a Pagar", path: "/workspace/financeiro/contas-pagar", icon: Receipt },
      { title: "Métricas Gerais", path: "/workspace/relatorios", icon: Package },
      { title: "Relatórios Gastronômicos", path: "/workspace/relatorios/gastronomia", icon: UtensilsCrossed },
      { title: "Pagamentos e Repasses", path: "/workspace/financeiro/pagamentos", icon: Coins },
    ],
  },
  {
    id: "management",
    title: "Configurações",
    description: "Operação da loja, horários, equipe e integrações",
    tools: [
      { title: "Identidade da Loja", path: "/workspace/configuracoes", icon: Settings },
      { title: "Recrutamento & Vagas", path: "/workspace/empregos/candidatos", icon: Briefcase, badge: "RH" },
      { title: "Tabelas de Frete", path: "/workspace/logistica/tabelas", icon: Truck },
      { title: "Equipe de Trabalho", path: "/workspace/configuracoes/equipe", icon: Users },
      { title: "Unidades e Filiais", path: "/workspace/lojas", icon: Building2 },
      { title: "Central de Suporte", path: "/workspace/suporte", icon: HelpCircle },
    ],
  },
];

export function WorkspaceAllToolsDialog({
  open,
  onOpenChange,
  activeStore,
}: WorkspaceAllToolsDialogProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mcpBlock, setMcpBlock] = useState<DynamicRenderableBlock | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const semantics = useMemo(() => getNicheSemantics(activeStore), [activeStore]);
  const frequentTools = useMemo(() => getFrequentToolsForNiche(semantics), [semantics]);

  const handleToggleVoice = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Reconhecimento de voz não suportado neste navegador. Digite sua instrução!");
      return;
    }
    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      setIsListeningVoice(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListeningVoice(false);
        handleExecuteAiCommand(transcript);
      };
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleExecuteAiCommand = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || searchQuery).trim();
    if (!promptToUse) {
      toast.error("Informe um comando ou instrução para a IA.");
      return;
    }
    setIsOrchestrating(true);
    setMcpBlock(null);
    try {
      const block = await orchestrateCampaignIntent({
        data: {
          prompt: promptToUse,
        },
      });
      setMcpBlock(block);
      toast.success("Proposta de anúncio gerada via MCP! Revise o mockup antes de aprovar.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao orquestrar comando com IA.");
    } finally {
      setIsOrchestrating(false);
    }
  };

  const isAiIntent = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return false;
    const q = searchQuery.toLowerCase();
    return (
      q.startsWith("cria") ||
      q.startsWith("gerar") ||
      q.startsWith("fazer") ||
      q.startsWith("anúncio") ||
      q.startsWith("anuncio") ||
      q.startsWith("campanha") ||
      q.startsWith("divulgar") ||
      q.startsWith("promover") ||
      q.includes(" r$") ||
      q.includes("reais") ||
      q.includes("meta ads") ||
      q.includes("instagram") ||
      q.includes("google")
    );
  }, [searchQuery]);

 // Filtro dinâmico por palavra-chave e priorização por nicho
 const filteredSectors = useMemo(() => {
 let baseSectors = [...SECTOR_TOOL_GROUPS];

 if (semantics.nicheId === "tourism") {
 const tourismIdx = baseSectors.findIndex((s) => s.id === "tourism");
 if (tourismIdx > -1) {
 const [tourismGroup] = baseSectors.splice(tourismIdx, 1);
 baseSectors = [tourismGroup, ...baseSectors];
 }
 // Oculta ferramentas gastronômicas irrelevantes para turismo
 baseSectors = baseSectors.map((s) => {
 if (s.id === "commerce") {
 return {
 ...s,
 description: "Gestão de produtos, cotações e orçamentos",
 tools: s.tools.filter((t) => !["/workspace/pdv/cozinha", "/workspace/reservas"].includes(t.path)),
 };
 }
 if (s.id === "analytics") {
 return {
 ...s,
 tools: s.tools.filter((t) => t.path !== "/workspace/relatorios/gastronomia"),
 };
 }
 return s;
 });
 }

 if (!searchQuery.trim()) return baseSectors;
 const q = searchQuery.toLowerCase();

 return baseSectors.map((sector) => ({
 ...sector,
 tools: sector.tools.filter(
 (t) =>
 t.title.toLowerCase().includes(q) ||
 sector.title.toLowerCase().includes(q) ||
 sector.description.toLowerCase().includes(q)
 ),
 })).filter((sector) => sector.tools.length > 0);
 }, [searchQuery, semantics]);

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 rounded-2xl border border-border/80 bg-background/98 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
 {/* ── 1. Top Header com Busca Ampla (Padrão Meta Studio) ── */}
 <div className="p-4 sm:p-6 pb-4 border-b border-border/60 bg-muted/15 shrink-0 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
 <Sliders className="size-4" />
 </div>
 <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
 Todas as Ferramentas
 </DialogTitle>
 </div>
 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">
 Workspace • {activeStore?.name || "Waesy"}
 </span>
 </div>

 <div className="relative flex items-center">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (mcpBlock) setMcpBlock(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  e.preventDefault();
                  handleExecuteAiCommand();
                }
              }}
              placeholder="Pesquisar ferramentas ou ditar comando (ex: 'Criar anúncio de R$ 50 para o produto X')..."
              className="h-10 pl-10 pr-20 text-xs sm:text-sm rounded-xl bg-card border-border/60 focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListeningVoice ? "Ouvindo... clique para parar" : "Falar comando por voz"}
                className={cn(
                  "size-7 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                  isListeningVoice
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {isListeningVoice ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              </button>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setMcpBlock(null);
                  }}
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Destaque Spotlight para Ação de IA em Linguagem Natural */}
          {searchQuery.trim().length >= 3 && !mcpBlock && !isOrchestrating && (
            <div
              onClick={() => handleExecuteAiCommand()}
              className="p-2.5 px-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between cursor-pointer group animate-in fade-in"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-foreground truncate">
                    Orquestrar com IA (MCP): &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Gera anúncio com criativo do produto, orçamento e segmentação
                  </p>
                </div>
              </div>
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] gap-1 shrink-0 font-medium h-6">
                <span>Enter</span>
                <ArrowRight className="size-3" />
              </Badge>
            </div>
          )}
        </div>

 {/* ── 2. Conteúdo Scrollável com Gôndola e Grid Setorial ── */}
 <ScrollArea className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar">
          <div className="space-y-6 max-w-5xl mx-auto pb-4">
            {/* Estado de Carregamento da IA MCP */}
            {isOrchestrating && (
              <div className="py-12 p-6 rounded-2xl border border-border/80 bg-card text-center space-y-3 animate-pulse">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Loader2 className="size-6 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Orquestrando Ação Dinâmica via MCP...
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  A inteligência está mapeando produtos da loja, gerando copy de alta conversão e calculando projeção de alcance e CPA.
                </p>
              </div>
            )}

            {/* Proposta Dinâmica Renderizada (CampaignDraftCard) */}
            {mcpBlock && (
              <div className="space-y-3 pb-2 animate-in fade-in">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Resultado da Intenção MCP
                  </span>
                  <button
                    type="button"
                    onClick={() => setMcpBlock(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    Voltar para Ferramentas
                  </button>
                </div>

                <CampaignDraftCard
                  block={mcpBlock}
                  onApproved={() => {
                    setTimeout(() => {
                      onOpenChange(false);
                      setMcpBlock(null);
                      router.invalidate();
                    }, 1200);
                  }}
                  onDiscard={() => setMcpBlock(null)}
                />
              </div>
            )}

            {!isOrchestrating && !mcpBlock && (
              <>
            {/* Seção: Usadas com frequência (Exibida quando não há busca ativa) */}
 {!searchQuery && (
 <div className="space-y-2.5 pb-5 border-b border-border/60">
 <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
 Usadas com frequência
 </span>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
 {frequentTools.map((tool) => {
 const Icon = tool.icon;
 return (
 <Link
 key={tool.path}
 to={tool.path}
 onClick={() => onOpenChange(false)}
 className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-center gap-2 shadow-2xs cursor-pointer active:scale-98"
 >
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
 <Icon className="size-5" />
 </div>
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
 {tool.title}
 </p>
 <span className="text-[9px] font-mono text-muted-foreground block truncate">
 {tool.badge}
 </span>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 )}

 {/* Grade de Setores Multicolunas */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {filteredSectors.map((sector) => (
 <div
 key={sector.id}
 className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-3 shadow-2xs"
 >
 <div className="border-b border-border/40 pb-2">
 <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <span>{sector.title}</span>
 </h3>
 <p className="text-[10px] text-muted-foreground leading-tight">
 {sector.description}
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
 {sector.tools.map((tool) => {
 const Icon = tool.icon;
 return (
 <Link
 key={tool.path}
 to={tool.path}
 onClick={() => onOpenChange(false)}
 className="flex items-center justify-between p-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group cursor-pointer"
 >
 <div className="flex items-center gap-2 min-w-0">
 <Icon className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
 <span className="truncate">{tool.title}</span>
 </div>
 {tool.badge && (
 <Badge
 variant="outline"
 className="text-[8px] font-mono font-bold uppercase px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20 shrink-0 ml-1"
 >
 {tool.badge}
 </Badge>
 )}
 </Link>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {filteredSectors.length === 0 && (
 <div className="py-12 text-center text-muted-foreground space-y-2">
 <p className="text-sm font-bold text-foreground">
 Nenhuma ferramenta encontrada para &quot;{searchQuery}&quot;
 </p>
 <p className="text-xs text-muted-foreground">
 Tente pesquisar por termos como &quot;pedidos&quot;, &quot;cardápio&quot;, &quot;estoque&quot; ou &quot;financeiro&quot;.
 </p>
 </div>
 )}
               </>
            )}
          </div>
        </ScrollArea>

        {/* ── 3. Rodapé com Atalho de Ajuda e Fechamento ── */}
 <div className="p-3 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-mono">Dica: Use as setas e Enter para navegar rápido</span>
 </div>
 <Link
 to="/workspace/configuracoes"
 onClick={() => onOpenChange(false)}
 className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
 >
 <span>Configurações do Espaço</span>
 <ArrowRight className="size-3" />
 </Link>
 </div>
 </DialogContent>
 </Dialog>
 );
}
