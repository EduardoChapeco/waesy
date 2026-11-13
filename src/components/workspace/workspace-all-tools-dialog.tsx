import { useState, useMemo } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CampaignDraftCard } from "@/components/adtech/campaign-draft-card";
import { orchestrateCampaignIntent } from "@/services/mcp-orchestrator.functions";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";
import { Search, Briefcase, X, Package, Tags, Boxes, ClipboardList, ShoppingBag, Store, Truck, Users, Sliders, Calendar, MessageSquare, Flame, Newspaper, DollarSign, Wallet, Ticket, BarChart3, Building2, ExternalLink, ShieldCheck, Zap, ArrowRight, Settings, HelpCircle, FileSpreadsheet, Globe, Coins, Scale, Receipt, Eye, Megaphone, Share2, Star, Bell, Plane, Bus, FileText, ChefHat, Armchair, UtensilsCrossed, CreditCard, Percent, Layers, Award, Target, CheckCircle2, Mic, MicOff, Send, Loader2, Heart, Trophy, Clock, Gift, RefreshCcw, AlertTriangle, ShoppingCart, Link2, Wrench, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    description: "Catálogo, cardápio, estoque, PDV e expedição",
    tools: [
      { title: "Produtos", path: "/workspace/catalogo/produtos", icon: Package },
      { title: "Tipos", path: "/workspace/catalogo/tipos", icon: Layers },
      { title: "Categorias", path: "/workspace/catalogo/categorias", icon: Tags },
      { title: "Variações", path: "/workspace/catalogo/atributos", icon: Boxes },
      { title: "Coleções", path: "/workspace/catalogo/colecoes", icon: Sliders },
      { title: "Tabelas", path: "/workspace/catalogo/tabelas", icon: Sliders },
      { title: "Pacotes", path: "/workspace/pacotes", icon: Boxes },
      { title: "Pedidos", path: "/workspace/pedidos/gestor", icon: ClipboardList },
      { title: "Vendas", path: "/workspace/pedidos", icon: ShoppingBag },
      { title: "Expedição", path: "/workspace/pedidos/expedicao", icon: Truck },
      { title: "Entregadores", path: "/workspace/pedidos/entregadores", icon: Truck },
      { title: "PDV", path: "/workspace/pdv", icon: Store },
      { title: "Comandas", path: "/workspace/pdv/comandas", icon: UtensilsCrossed },
      { title: "Cozinha", path: "/workspace/pdv/cozinha", icon: ChefHat },
      { title: "Reservas", path: "/workspace/reservas", icon: Armchair },
      { title: "Estoque", path: "/workspace/estoque", icon: Boxes },
      { title: "Movimentos", path: "/workspace/estoque/movimentos", icon: Boxes },
      { title: "Reposição", path: "/workspace/estoque/alertas", icon: Flame },
      { title: "Devoluções", path: "/workspace/pedidos/trocas", icon: Receipt },
      { title: "Manutenções", path: "/workspace/imoveis/manutencoes", icon: Wrench },
      { title: "Fretes", path: "/workspace/logistica/tabelas", icon: Truck },
      { title: "Faturas", path: "/workspace/logistica/faturas", icon: Receipt },
      { title: "Pontos Coleta", path: "/workspace/logistica/pudo", icon: Building2 },
      { title: "Frota", path: "/workspace/pedidos/frota", icon: Truck },
      { title: "Atacado", path: "/workspace/b2b", icon: Briefcase },
      { title: "Canais", path: "/workspace/integracoes/marketplaces", icon: Globe },
      { title: "Receitas", path: "/workspace/conteudo/receitas", icon: ChefHat },
    ],
  },
  {
    id: "engagement",
    title: "Atendimento",
    description: "Conversas, contatos, CRM, agenda e contratos",
    tools: [
      { title: "Painel", path: "/workspace/atendimento", icon: BarChart3 },
      { title: "Chat", path: "/workspace/atendimento/chat", icon: MessageSquare },
      { title: "WhatsApp", path: "/workspace/atendimento/whatsapp", icon: Smartphone },
      { title: "Filas", path: "/workspace/atendimento/filas", icon: Layers },
      { title: "Atendentes", path: "/workspace/atendimento/atendentes", icon: Users },
      { title: "Horários", path: "/workspace/atendimento/horarios", icon: Clock },
      { title: "Respostas", path: "/workspace/whatsapp/automacoes", icon: Zap },
      { title: "Notificações", path: "/workspace/notificacoes", icon: Bell },
      { title: "Clientes", path: "/workspace/clientes", icon: Users },
      { title: "Contatos", path: "/workspace/crm", icon: Target },
      { title: "Funil", path: "/workspace/comercial", icon: Target },
      { title: "Captação", path: "/workspace/captacao", icon: Briefcase },
      { title: "Sigilo", path: "/workspace/captacao/ndas", icon: FileText },
      { title: "Avaliações", path: "/workspace/avaliacoes", icon: Star },
      { title: "Depoimentos", path: "/workspace/cms/avaliacoes", icon: Star },
      { title: "Agenda", path: "/workspace/agenda", icon: Calendar },
      { title: "Salas", path: "/workspace/agenda/recursos", icon: Calendar },
      { title: "Orçamentos", path: "/workspace/orcamentos", icon: FileSpreadsheet },
      { title: "Ordens", path: "/workspace/ordens-servico", icon: Wrench },
      { title: "Contratos", path: "/workspace/contratos", icon: Scale },
      { title: "Processos", path: "/workspace/advocacia", icon: Scale },
      { title: "Licitações", path: "/workspace/licitacoes", icon: Scale },
      { title: "Qualidade", path: "/workspace/qualidade", icon: ShieldCheck },
      { title: "Doações", path: "/workspace/doacoes", icon: Heart },
      { title: "Associação", path: "/workspace/associacao", icon: Users },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Campanhas, vitrine, páginas, cupons e fidelidade",
    tools: [
      { title: "Vitrine", path: "/workspace/marketing/vitrine", icon: Eye },
      { title: "Construtor", path: "/workspace/builder", icon: Layers },
      { title: "Marca", path: "/workspace/marketing/brand-kit", icon: Layers },
      { title: "Banners", path: "/workspace/marketing/banners", icon: Megaphone },
      { title: "Hotpages", path: "/workspace/marketing/hotpages", icon: Globe },
      { title: "Biolink", path: "/workspace/cms/bio", icon: Link2 },
      { title: "Páginas", path: "/workspace/cms/paginas", icon: Globe },
      { title: "Menus", path: "/workspace/cms/navegacao", icon: Sliders },
      { title: "Calendário", path: "/workspace/cms/calendario", icon: Calendar },
      { title: "Promoções", path: "/workspace/marketing/promocoes", icon: Ticket },
      { title: "Fidelidade", path: "/workspace/marketing/fidelidade", icon: Award },
      { title: "Afiliados", path: "/workspace/marketing/afiliados", icon: Target },
      { title: "Conciliação", path: "/workspace/afiliados/conciliacao", icon: Coins },
      { title: "Campanhas", path: "/workspace/marketing/anuncios", icon: Zap },
      { title: "Briefings", path: "/workspace/marketing/briefing", icon: FileText },
      { title: "Encartes", path: "/workspace/marketing/encartes", icon: Newspaper },
      { title: "Formulários", path: "/workspace/marketing/formularios", icon: FileText },
      { title: "Presentes", path: "/workspace/marketing/gift-cards", icon: Gift },
      { title: "Sorteios", path: "/workspace/marketing/concursos", icon: Trophy },
      { title: "Patrocinadores", path: "/workspace/marketing/patrocinadores", icon: Award },
      { title: "Pixels", path: "/workspace/marketing/pixels", icon: Target },
      { title: "Conversões", path: "/workspace/marketing/telemetria", icon: BarChart3 },
      { title: "Carrinhos", path: "/workspace/marketing/carrinhos", icon: ShoppingCart },
      { title: "Negócios", path: "/workspace/marketing/canvas-bmc", icon: Layers },
      { title: "Estratégia", path: "/workspace/marketing/swot", icon: Target },
      { title: "Ofertas", path: "/workspace/marketing/canvas-pecados", icon: Flame },
      { title: "Estúdio", path: "/workspace/estudio", icon: Layers },
      { title: "Mídia", path: "/workspace/marketing/studio", icon: Layers },
      { title: "Redes", path: "/workspace/marketing/social", icon: Share2 },
      { title: "Stories", path: "/workspace/marketing/stories", icon: Globe },
      { title: "Vídeos", path: "/workspace/cms/stories", icon: Globe },
      { title: "Publicações", path: "/workspace/marketing/publicacoes", icon: Newspaper },
      { title: "Novo Post", path: "/workspace/mural/novo", icon: Megaphone },
      { title: "Notícias", path: "/workspace/noticias", icon: Newspaper },
      { title: "Novo Artigo", path: "/workspace/noticias/novo", icon: Newspaper },
    ],
  },
  {
    id: "tourism",
    title: "Turismo",
    description: "Cotações, propostas, roteiros, embarques e frota",
    tools: [
      { title: "Painel", path: "/workspace/turismo", icon: Plane },
      { title: "Cotações", path: "/workspace/turismo/cotacoes", icon: Plane },
      { title: "Oportunidades", path: "/workspace/turismo/oportunidades", icon: Target },
      { title: "Propostas", path: "/workspace/turismo/propostas", icon: FileSpreadsheet },
      { title: "Roteiros", path: "/workspace/turismo/viagens", icon: Plane },
      { title: "Embarques", path: "/workspace/turismo/embarques", icon: Bus },
      { title: "Excursões", path: "/workspace/turismo/grupos", icon: Bus },
      { title: "Hospedagem", path: "/workspace/turismo/hoteis", icon: Building2 },
      { title: "Destinos", path: "/workspace/turismo/destinos", icon: Globe },
      { title: "Tarifas", path: "/workspace/turismo/radar", icon: Target },
      { title: "Contratos", path: "/workspace/turismo/contratos", icon: FileText },
      { title: "Reacomodação", path: "/workspace/turismo/reacomodacao", icon: RefreshCcw },
      { title: "Incidentes", path: "/workspace/turismo/incidentes", icon: AlertTriangle },
      { title: "Fornecedores", path: "/workspace/turismo/fornecedores", icon: Users },
      { title: "Frota", path: "/workspace/turismo/frota", icon: Bus },
      { title: "Vistos", path: "/workspace/turismo/vistos", icon: Globe },
      { title: "Aéreos", path: "/workspace/turismo/aereos", icon: Plane },
      { title: "Corporativo", path: "/workspace/turismo/corporativo", icon: Briefcase },
      { title: "Empresas", path: "/workspace/empresa/viagens", icon: Briefcase },
      { title: "Comissões", path: "/workspace/turismo/comissoes", icon: Percent },
      { title: "Passaportes", path: "/workspace/turismo/documentos-ocr", icon: ShieldCheck },
      { title: "Vouchers", path: "/workspace/turismo/vouchers", icon: Ticket },
      { title: "Ingressos", path: "/workspace/eventos", icon: Calendar },
    ],
  },
  {
    id: "analytics",
    title: "Financeiro",
    description: "Faturamento, caixa, turnos, conciliação e fiscal",
    tools: [
      { title: "Resumo", path: "/workspace", icon: BarChart3 },
      { title: "Painel", path: "/workspace/financeiro", icon: DollarSign },
      { title: "Caixa", path: "/workspace/financeiro/caixa", icon: DollarSign },
      { title: "Lançamentos", path: "/workspace/financeiro/caixa/lancamentos", icon: DollarSign },
      { title: "Turnos", path: "/workspace/financeiro/caixa/turnos", icon: Receipt },
      { title: "Comprovantes", path: "/workspace/financeiro/comprovantes", icon: ShieldCheck },
      { title: "Recebíveis", path: "/workspace/financeiro/recebiveis", icon: Ticket },
      { title: "Despesas", path: "/workspace/financeiro/contas-pagar", icon: Receipt },
      { title: "Notas Fiscais", path: "/workspace/fiscal/nfe", icon: FileText },
      { title: "Contabilidade", path: "/workspace/contador", icon: FileSpreadsheet },
      { title: "Comissões", path: "/workspace/financeiro/comissoes", icon: Percent },
      { title: "Repasses", path: "/workspace/financeiro/afiliados", icon: Coins },
      { title: "Canais", path: "/workspace/financeiro/relatorios-canal", icon: BarChart3 },
      { title: "Cobranças", path: "/workspace/financeiro/faturas", icon: Receipt },
      { title: "Salários", path: "/workspace/financeiro/funcionarios", icon: Users },
      { title: "Metas", path: "/workspace/relatorios/metas", icon: Target, badge: "Metas" },
      { title: "Indicadores", path: "/workspace/relatorios", icon: Package },
      { title: "Gastronomia", path: "/workspace/relatorios/gastronomia", icon: UtensilsCrossed },
      { title: "Liquidações", path: "/workspace/financeiro/pagamentos", icon: Coins },
    ],
  },
  {
    id: "intelligence",
    title: "Inteligência",
    description: "Copiloto, automações, importação e tarefas",
    tools: [
      { title: "Copiloto", path: "/workspace/copilot", icon: Zap },
      { title: "Agentes", path: "/workspace/squads", icon: Zap },
      { title: "Habilidades", path: "/workspace/skills", icon: Zap },
      { title: "Viabilidade", path: "/workspace/viabilidade", icon: Target },
      { title: "Simulações", path: "/workspace/simulacao", icon: Sliders },
      { title: "Pesquisas", path: "/workspace/simlab/focus-group", icon: Users },
      { title: "Mercado", path: "/workspace/inteligencia/radar", icon: Target },
      { title: "Importação", path: "/workspace/mining", icon: Globe },
      { title: "Automações", path: "/workspace/automacoes", icon: Sliders },
      { title: "Créditos", path: "/workspace/tokens", icon: Coins },
      { title: "Tarefas", path: "/workspace/tarefas", icon: ClipboardList },
    ],
  },
  {
    id: "management",
    title: "Configurações",
    description: "Dados da loja, horários, equipe, vagas e integrações",
    tools: [
      { title: "Preferências", path: "/workspace/configuracoes", icon: Settings },
      { title: "Planos", path: "/workspace/configuracoes/planos", icon: Layers },
      { title: "Empresa", path: "/workspace/configuracoes/loja", icon: Building2 },
      { title: "Ativação", path: "/workspace/onboarding", icon: Layers },
      { title: "Revisão", path: "/workspace/onboarding/revisao", icon: Layers },
      { title: "Chaves", path: "/workspace/configuracoes/ai", icon: Zap },
      { title: "Modelos", path: "/workspace/configuracoes/inteligencia-artificial", icon: Sliders },
      { title: "Integrações", path: "/workspace/configuracoes/integracoes", icon: Globe },
      { title: "Parceiros", path: "/workspace/configuracoes/parceiros", icon: Users },
      { title: "Sessões", path: "/workspace/configuracoes/sessoes", icon: ShieldCheck },
      { title: "Aplicativo", path: "/workspace/configuracoes/pwa", icon: Globe },
      { title: "Privacidade", path: "/workspace/configuracoes/privacidade-loja", icon: ShieldCheck },
      { title: "Equipe", path: "/workspace/configuracoes/equipe", icon: Users },
      { title: "Ponto", path: "/workspace/rh/ponto", icon: Clock },
      { title: "Folha", path: "/workspace/rh/folha", icon: Wallet },
      { title: "Trabalhista", path: "/workspace/rh/compliance", icon: ShieldCheck },
      { title: "Candidatos", path: "/workspace/empregos/candidatos", icon: Briefcase, badge: "RH" },
      { title: "Vagas", path: "/workspace/empregos", icon: Briefcase },
      { title: "Currículos", path: "/workspace/curriculo/editor", icon: Briefcase },
      { title: "Conformidade", path: "/workspace/configuracoes/conformidade", icon: ShieldCheck },
      { title: "Fretes", path: "/workspace/configuracoes/fretes/cotacoes", icon: Truck },
      { title: "Unidades", path: "/workspace/lojas", icon: Building2 },
      { title: "Suporte", path: "/workspace/suporte", icon: HelpCircle },
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
      toast.success("Rascunho de copy gerado. Revise os fatos; não há estimativa de alcance nem publicação externa.");
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
 if (semantics.nicheId !== "gastronomy") {
 const gastroExclusivePaths = new Set([
 "/workspace/pedidos/gestor",
 "/workspace/pdv/comandas",
 "/workspace/pdv/cozinha",
 "/workspace/pedidos/tempo-preparo",
 "/workspace/reservas",
 "/workspace/relatorios/gastronomia",
 "/workspace/conteudo/receitas",
 ]);
 const courierPaths = new Set(["/workspace/pedidos/frota", "/workspace/pedidos/entregadores"]);
 const allowCouriers = ["retail", "supermarket", "pharmacy", "automotive"].includes(semantics.nicheId);
 baseSectors = baseSectors.map((s) => ({
 ...s,
 description: s.id === "commerce" ? "Gestão de vendas, catálogo, orçamentos e atendimento" : s.description,
 tools: s.tools.filter((t) => {
 if (gastroExclusivePaths.has(t.path)) return false;
 if (!allowCouriers && courierPaths.has(t.path)) return false;
 return true;
 }),
 }));
 }
 if (semantics.nicheId !== "tourism") {
 baseSectors = baseSectors.filter((s) => s.id !== "tourism");
 }

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
 <DialogContent className="sm:max-w-4xl max-h-5/6 sm:max-h-160 p-0 rounded-2xl border border-border/40 bg-background shadow-overlay overflow-hidden flex flex-col">
 {/* ── 1. Top Header com Busca Ampla (Padrão Meta Studio) ── */}
 <div className="p-4 sm:p-6 pb-4 border-b border-border/40 bg-card shrink-0 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-muted text-foreground flex items-center justify-center font-bold">
 <Sliders className="size-4" />
 </div>
 <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
 Todas as Ferramentas
 </DialogTitle>
 </div>
 <span className="text-2xs font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">
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
              placeholder="Pesquisar ferramentas ou ditar campanha (ex: Instagram, R$ 50/dia, 7 dias, produto X)..."
              className="h-11 min-h-11 pl-10 pr-20 text-base sm:text-sm rounded-xl bg-muted/60 border-transparent focus-visible:ring-2 focus-visible:ring-ring shadow-none"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleVoice}
                aria-label={isListeningVoice ? "Parar gravação" : "Comando por voz"}
                className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
                  "size-7 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0",
                  isListeningVoice
                    ? "bg-rose-500 text-foreground animate-pulse motion-reduce:animate-none"
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
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Destaque Spotlight para Ação de IA em Linguagem Natural */}
          {searchQuery.trim().length >= 3 && !mcpBlock && !isOrchestrating && (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
              onClick={() => handleExecuteAiCommand()}
              className="p-3 px-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between cursor-pointer group animate-in fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-6 rounded-lg bg-card text-foreground flex items-center justify-center shrink-0">
                  <Layers className="size-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-foreground truncate">
                    Gerar rascunho: &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-2xs text-muted-foreground truncate">
                    Cria rascunho de campanha com canal e orçamento informados.
                  </p>
                </div>
              </div>
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-2xs gap-1 shrink-0 font-medium h-6">
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
              <div className="py-12 p-6 rounded-2xl bg-card text-center space-y-3 animate-pulse motion-reduce:animate-none">
                <div className="size-12 rounded-xl bg-muted text-foreground flex items-center justify-center mx-auto">
                  <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Preparando campanha...
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Consultando produtos da loja e estruturando o rascunho de anúncio.
                </p>
              </div>
            )}

            {/* Proposta Dinâmica Renderizada (CampaignDraftCard) */}
            {mcpBlock && (
              <div className="space-y-3 pb-2 animate-in fade-in">
                <div className="flex items-center justify-between px-1">
                  <span className="text-2xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Resultado da Intenção MCP
                  </span>
                  <button
                    type="button"
                    onClick={() => setMcpBlock(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div className="space-y-3 pb-5 border-b border-border/40">
                <span className="text-2xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                  Usadas com frequência
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {frequentTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        onClick={() => onOpenChange(false)}
                        className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors duration-200 text-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="size-11 rounded-xl bg-card text-foreground flex items-center justify-center">
                          <Icon className="size-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground line-clamp-1">
                            {tool.title}
                          </p>
                          <span className="text-3xs font-mono text-muted-foreground block truncate">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSectors.map((sector) => (
                <div
                  key={sector.id}
                  className="rounded-2xl bg-muted/40 p-4 space-y-3"
                >
                  <div className="border-b border-border/40 pb-2">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>{sector.title}</span>
                    </h3>
                    <p className="text-2xs text-muted-foreground leading-tight mt-1">
                      {sector.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sector.tools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.path}
                          to={tool.path}
                          onClick={() => onOpenChange(false)}
                          className="flex items-center justify-between p-2 min-h-11 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                            <span className="truncate">{tool.title}</span>
                          </div>
                          {tool.badge && (
                            <Badge
                              variant="secondary"
                              className="text-3xs font-mono font-bold uppercase px-2 py-0 shrink-0 ml-1"
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
 <span className="text-2xs font-mono">Dica: Use as setas e Enter para navegar rápido</span>
 </div>
 <Link
 to="/workspace/configuracoes"
 onClick={() => onOpenChange(false)}
 className="text-2xs font-bold text-primary hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <span>Configurações do Espaço</span>
 <ArrowRight className="size-3" />
 </Link>
 </div>
 </DialogContent>
 </Dialog>
 );
}


