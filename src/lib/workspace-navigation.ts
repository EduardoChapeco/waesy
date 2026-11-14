import { Package, PackageCheck, Tags, Tag, Store, LayoutDashboard, Settings, Calendar, Users, ShoppingBag, Truck, Boxes, Banknote, FileText, LayoutTemplate, Link2, Image as ImageIcon, ClipboardList, ShieldAlert, Megaphone, Share2, Star, Bell, Flame, Kanban, Newspaper, Plus, Sliders, DollarSign, Ticket, ArrowRightLeft, Building2, ShieldCheck, UtensilsCrossed, ChefHat, Coins, Zap, MessageSquare, Scale, Wrench, MapPin, Palette, Target, LayoutGrid, Navigation, Briefcase, Plane, ShoppingCart, Eye, Receipt, AlertTriangle, RefreshCw, ArrowDownUp, Clock, Car, Smartphone, Layers, HeartPulse, GraduationCap, Dog, CarFront, PenTool, Layers2, FileSpreadsheet, Gift, Globe, Bus, Award, Bot, LifeBuoy, Compass, UserCheck, Lock, HandHeart, Database, Calculator, Wallet, BarChart3 } from "lucide-react";
import { resolveUnifiedNicheId } from "./niches/niche-ssot";
import { resolveStoreWorkspaceCapabilities } from "./architecture/module-plan-governance";

export type NavItem = {
  path: string;
  label: string;
  icon?: any;
  badge?: string | number;
};

export type NavSection = "master" | "niche" | "corporate";

export type NavGroup = {
  id: string;
  label: string;
  icon: any;
  section?: NavSection;
  badge?: string | number;
  items: NavItem[];
};

// ── DEFINIÇÃO DOS GRUPOS BASE DO SISTEMA ─────────────────────────────────────

// Módulos Mestres Universais (Linha Executiva Corporativa)
const GROUP_OVERVIEW: NavGroup = {
  id: "overview",
  label: "Painel",
  icon: LayoutDashboard,
  section: "master",
  items: [
    { path: "/workspace", label: "Visão Geral", icon: LayoutDashboard },
    { path: "/workspace/copilot", label: "Assessor IA", icon: Bot },
    { path: "/workspace/relatorios", label: "Relatórios", icon: FileSpreadsheet },
    { path: "/workspace/onboarding", label: "Ativação", icon: Layers },
    { path: "/workspace/onboarding/revisao", label: "Revisão de Ativação", icon: Layers },
  ],
};

const GROUP_MASTER_TASKS: NavGroup = {
  id: "master-tasks",
  label: "Tarefas",
  icon: ClipboardList,
  section: "master",
  items: [
    { path: "/workspace/tarefas", label: "Tarefas", icon: ClipboardList },
  ],
};

const GROUP_AGENTIC_INTELLIGENCE: NavGroup = {
  id: "intelligence-squads",
  label: "Inteligência",
  icon: Layers,
  section: "master",
  items: [
    { path: "/workspace/copilot", label: "Assessor IA", icon: Bot },
    { path: "/workspace/squads", label: "Squads", icon: Bot },
    { path: "/workspace/skills", label: "Skills", icon: Zap },
    { path: "/workspace/marketing/brand-kit", label: "Brand Kit", icon: Palette },
    { path: "/workspace/inteligencia/radar", label: "Radar", icon: Target },
    { path: "/workspace/conteudo/receitas", label: "Receitas", icon: ChefHat },
    { path: "/workspace/simulacao", label: "Simulações", icon: Sliders },
    { path: "/workspace/mining", label: "Mineração de Oportunidades", icon: Layers },
    { path: "/workspace/simlab/focus-group", label: "Focus Group", icon: Users },
    { path: "/workspace/viabilidade", label: "Estudo de Viabilidade", icon: Target },
    { path: "/workspace/marketing/canvas-bmc", label: "Modelo BMC", icon: Layers },
    { path: "/workspace/marketing/canvas-pecados", label: "Canvas Pecados", icon: Layers },
    { path: "/workspace/marketing/swot", label: "Matriz SWOT", icon: Target },
  ],
};

const GROUP_MASTER_INBOX: NavGroup = {
  id: "master-inbox",
  label: "Atendimento",
  icon: MessageSquare,
  section: "master",
  items: [
    { path: "/workspace/atendimento", label: "Visão Geral", icon: BarChart3 },
    { path: "/workspace/atendimento/chat", label: "Chat Ao Vivo", icon: MessageSquare },
    { path: "/workspace/atendimento/whatsapp", label: "Canais WhatsApp", icon: Smartphone },
    { path: "/workspace/atendimento/filas", label: "Filas", icon: Layers },
    { path: "/workspace/atendimento/atendentes", label: "Atendentes", icon: Users },
    { path: "/workspace/atendimento/horarios", label: "Horários", icon: Clock },
    { path: "/workspace/notificacoes", label: "Notificações", icon: Bell },
    { path: "/workspace/suporte", label: "Suporte", icon: LifeBuoy },
  ],
};

const GROUP_CRM_CLIENTS: NavGroup = {
  id: "crm-clients",
  label: "Relacionamento",
  icon: Users,
  section: "master",
  items: [
    { path: "/workspace/clientes", label: "Carteira de Clientes", icon: Users },
    { path: "/workspace/avaliacoes", label: "Avaliações", icon: Star },
  ],
};

const GROUP_TURISMO_CRM: NavGroup = {
  id: "tourism-crm",
  label: "Viajantes",
  icon: Users,
  section: "niche",
  items: [
    { path: "/workspace/clientes", label: "Viajantes", icon: Users },
    { path: "/workspace/turismo/vistos", label: "Vistos", icon: Globe },
    { path: "/workspace/turismo/documentos-ocr", label: "Documentos", icon: FileText },
  ],
};

// 1. Gastronomia
const GROUP_GASTRO_CATALOG: NavGroup = {
  id: "gastro-catalog",
  label: "Cardápio",
  icon: UtensilsCrossed,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Cardápio", icon: Package },
    { path: "/workspace/catalogo/categorias", label: "Categorias", icon: Tags },
    { path: "/workspace/catalogo/atributos", label: "Complementos", icon: Boxes },
    { path: "/workspace/estoque", label: "Insumos", icon: Boxes },
  ],
};

const GROUP_GASTRO_ORDERS: NavGroup = {
  id: "gastro-orders",
  label: "Pedidos",
  icon: ClipboardList,
  section: "niche",
  items: [
    { path: "/workspace/pedidos/gestor", label: "Gestor de Pedidos", icon: ClipboardList },
    { path: "/workspace/pedidos", label: "Histórico", icon: ShoppingBag },
    { path: "/workspace/reservas", label: "Reservas", icon: Calendar },
    { path: "/workspace/pdv/comandas", label: "Mesas", icon: UtensilsCrossed },
    { path: "/workspace/pdv/cozinha", label: "Cozinha", icon: ChefHat },
    { path: "/workspace/pedidos/tempo-preparo", label: "Preparo", icon: Clock },
    { path: "/workspace/pedidos/frota", label: "Despacho", icon: Truck },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/relatorios/gastronomia", label: "Relatórios", icon: FileSpreadsheet },
  ],
};

// 2. Varejo
const GROUP_RETAIL_CATALOG: NavGroup = {
  id: "retail-catalog",
  label: "Catálogo",
  icon: Package,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Produtos", icon: Package },
    { path: "/workspace/catalogo/tipos", label: "Tipos", icon: Layers },
    { path: "/workspace/catalogo/categorias", label: "Categorias", icon: Tags },
    { path: "/workspace/catalogo/colecoes", label: "Coleções", icon: Sliders },
    { path: "/workspace/catalogo/atributos", label: "Grades", icon: Boxes },
    { path: "/workspace/estoque", label: "Estoque", icon: Boxes },
    { path: "/workspace/estoque/alertas", label: "Reposição", icon: AlertTriangle },
    { path: "/workspace/estoque/movimentos", label: "Movimentações", icon: ArrowDownUp },
  ],
};

const GROUP_RETAIL_SALES: NavGroup = {
  id: "retail-sales",
  label: "Vendas",
  icon: ShoppingBag,
  section: "niche",
  items: [
    { path: "/workspace/pedidos", label: "Lista de Vendas", icon: ShoppingBag },
    { path: "/workspace/pedidos/expedicao", label: "Separação", icon: PackageCheck },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/pedidos/trocas", label: "Devoluções", icon: ArrowRightLeft },
    { path: "/workspace/logistica/tabelas", label: "Fretes", icon: Truck },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
    { path: "/workspace/comercial", label: "Funil", icon: Kanban },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
  ],
};

// 3. Serviços
const GROUP_SERVICES_AGENDA: NavGroup = {
  id: "services-agenda",
  label: "Agenda",
  icon: Calendar,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Horários", icon: Calendar },
    { path: "/workspace/agenda/recursos", label: "Profissionais", icon: Users },
    { path: "/workspace/pacotes", label: "Pacotes", icon: Ticket },
  ],
};

const GROUP_SERVICES_CATALOG: NavGroup = {
  id: "services-catalog",
  label: "Serviços",
  icon: Layers,
  section: "niche",
  items: [
    { path: "/workspace/agenda/servicos", label: "Serviços", icon: Layers },
    { path: "/workspace/catalogo/produtos", label: "Produtos", icon: Package },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
  ],
};

// 4. Locação
const GROUP_RENTAL_EVENTS: NavGroup = {
  id: "rental-events",
  label: "Locação",
  icon: Boxes,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Equipamentos", icon: Package },
    { path: "/workspace/agenda", label: "Disponibilidade", icon: Calendar },
    { path: "/workspace/orcamentos", label: "Contratos", icon: FileText },
    { path: "/workspace/imoveis/manutencoes", label: "Vistorias", icon: Wrench },
    { path: "/workspace/pedidos/expedicao", label: "Retiradas", icon: PackageCheck },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
  ],
};

// 5. Assistência Técnica
const GROUP_TECH_REPAIR: NavGroup = {
  id: "tech-repair",
  label: "Assistência",
  icon: Wrench,
  section: "niche",
  items: [
    { path: "/workspace/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList },
    { path: "/workspace/agenda/servicos", label: "Mão de Obra", icon: Wrench },
    { path: "/workspace/catalogo/produtos", label: "Peças", icon: Package },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
  ],
};

// 5b. Oficina Mecânica
const GROUP_AUTOMOTIVE_WORKSHOP: NavGroup = {
  id: "automotive-workshop",
  label: "Oficina",
  icon: Wrench,
  section: "niche",
  items: [
    { path: "/workspace/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList },
    { path: "/workspace/agenda", label: "Revisões", icon: Calendar },
    { path: "/workspace/catalogo/produtos", label: "Peças", icon: Package },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/clientes", label: "Proprietários", icon: Users },
  ],
};

// 5c. Contabilidade & BPO Financeiro
const GROUP_ACCOUNTING: NavGroup = {
  id: "accounting",
  label: "Contábil",
  icon: Calculator,
  section: "niche",
  items: [
    { path: "/workspace/contador", label: "Painel Contábil", icon: Calculator },
    { path: "/workspace/ordens-servico", label: "Solicitações", icon: ClipboardList },
    { path: "/workspace/fiscal/nfe", label: "Notas Fiscais", icon: Receipt },
    { path: "/workspace/financeiro/faturas", label: "Honorários", icon: FileText },
    { path: "/workspace/clientes", label: "Empresas Clientes", icon: Users },
  ],
};

// 6. Advocacia
const GROUP_LEGAL: NavGroup = {
  id: "legal",
  label: "Jurídico",
  icon: Scale,
  section: "niche",
  items: [
    { path: "/workspace/advocacia", label: "Processos", icon: Scale },
    { path: "/workspace/agenda", label: "Audiências", icon: Calendar },
    { path: "/workspace/orcamentos", label: "Honorários", icon: FileText },
    { path: "/workspace/clientes", label: "Assistidos", icon: Users },
  ],
};

// 7. Imóveis
const GROUP_REAL_ESTATE: NavGroup = {
  id: "real-estate",
  label: "Imóveis",
  icon: Building2,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Imóveis", icon: Building2 },
    { path: "/workspace/imoveis/manutencoes", label: "Vistorias", icon: Wrench },
    { path: "/workspace/orcamentos", label: "Propostas", icon: FileText },
    { path: "/workspace/clientes", label: "Interessados", icon: Users },
  ],
};

// 8. Turismo Canônico (4 Pilares Operacionais sem Emojis)
const GROUP_TURISMO_COMMERCIAL: NavGroup = {
  id: "tourism-commercial",
  label: "Comercial",
  icon: Kanban,
  section: "niche",
  items: [
    { path: "/workspace/turismo", label: "Funil de Vendas", icon: Kanban },
    { path: "/workspace/turismo/oportunidades", label: "Oportunidades", icon: Target },
    { path: "/workspace/turismo/propostas", label: "Propostas", icon: FileText },
    { path: "/workspace/turismo/cotacoes", label: "Cotações", icon: Plane },
    { path: "/workspace/turismo/aereos", label: "Malha Aérea", icon: Plane },
    { path: "/workspace/turismo/corporativo", label: "Empresas", icon: Building2 },
    { path: "/workspace/empresa/viagens", label: "Viagens Corporativas", icon: Plane },
  ],
};

const GROUP_TURISMO_OPERATIONS: NavGroup = {
  id: "tourism-trips",
  label: "Operações",
  icon: Compass,
  section: "niche",
  items: [
    { path: "/workspace/turismo/viagens", label: "Viagens", icon: Compass },
    { path: "/workspace/turismo/grupos", label: "Grupos", icon: Bus },
    { path: "/workspace/turismo/frota", label: "Frota", icon: Bus },
    { path: "/workspace/turismo/vouchers", label: "Vouchers", icon: Ticket },
    { path: "/workspace/turismo/reacomodacao", label: "Reacomodação", icon: RefreshCw },
    { path: "/workspace/turismo/incidentes", label: "Suporte", icon: AlertTriangle },
  ],
};

const GROUP_TURISMO_BOARDING: NavGroup = {
  id: "tourism-boarding",
  label: "Embarque",
  icon: UserCheck,
  section: "niche",
  items: [
    { path: "/workspace/turismo/embarques", label: "Embarques", icon: Calendar },
  ],
};

const GROUP_TURISMO_CATALOG: NavGroup = {
  id: "tourism-catalog",
  label: "Catálogo",
  icon: Package,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Pacotes", icon: Package },
    { path: "/workspace/turismo/destinos", label: "Destinos", icon: MapPin },
    { path: "/workspace/turismo/hoteis", label: "Hotéis", icon: Building2 },
    { path: "/workspace/turismo/fornecedores", label: "Operadoras", icon: Building2 },
    { path: "/workspace/turismo/radar", label: "Radar", icon: Compass },
    { path: "/workspace/turismo/contratos", label: "Contratos", icon: FileText },
    { path: "/workspace/turismo/comissoes", label: "Comissões", icon: DollarSign },
  ],
};

const GROUP_WHATSAPP_AUTOMATIONS: NavGroup = {
  id: "whatsapp-automations",
  label: "WhatsApp",
  icon: MessageSquare,
  section: "corporate",
  items: [{ path: "/workspace/whatsapp/automacoes", label: "Automações", icon: Zap }],
};

const GROUP_TURISMO_MARKETING: NavGroup = {
  id: "tourism-marketing",
  label: "Vitrine",
  icon: Megaphone,
  section: "corporate",
  items: [
    { path: "/workspace/marketing/vitrine", label: "Vitrine", icon: LayoutGrid },
    { path: "/workspace/builder", label: "Construtor", icon: LayoutTemplate },
    { path: "/workspace/estudio", label: "Estúdio Criativo", icon: Palette },
    { path: "/workspace/cms/paginas", label: "Páginas", icon: FileText },
    { path: "/workspace/cms/bio", label: "Link Bio", icon: Link2 },
    { path: "/workspace/marketing/banners", label: "Banners", icon: ImageIcon },
    { path: "/workspace/marketing/promocoes", label: "Ofertas", icon: Flame },
    { path: "/workspace/marketing/concursos", label: "Sorteios", icon: Ticket },
    { path: "/workspace/marketing/anuncios", label: "Anúncios", icon: Megaphone },
    { path: "/workspace/marketing/social", label: "Social", icon: Share2 },
  ],
};

// 9. Recrutamento
const GROUP_JOBS: NavGroup = {
  id: "jobs",
  label: "Recrutamento",
  icon: Briefcase,
  section: "niche",
  items: [
    { path: "/workspace/empregos", label: "Vagas", icon: Briefcase },
    { path: "/workspace/empregos/candidatos", label: "Candidaturas", icon: Users },
    { path: "/workspace/curriculo/editor", label: "Currículos", icon: FileText },
    { path: "/workspace/clientes", label: "Talentos", icon: Users },
    { path: "/workspace/marketing/vitrine", label: "Carreiras", icon: Eye },
  ],
};

// 10. Eventos
const GROUP_EVENTS_TICKETS: NavGroup = {
  id: "events-tickets",
  label: "Eventos",
  icon: Ticket,
  section: "niche",
  items: [
    { path: "/workspace/eventos", label: "Ingressos", icon: Ticket },
    { path: "/workspace/marketing/banners", label: "Flyers", icon: ImageIcon },
    { path: "/workspace/financeiro/pagamentos", label: "Bilheteria", icon: DollarSign },
  ],
};

// 11. Veículos
const GROUP_VEHICLES: NavGroup = {
  id: "vehicles",
  label: "Veículos",
  icon: CarFront,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Veículos", icon: CarFront },
    { path: "/workspace/orcamentos", label: "Financiamentos", icon: FileText },
    { path: "/workspace/clientes", label: "Leads", icon: Users },
  ],
};

// 12. Pet
const GROUP_PET: NavGroup = {
  id: "pet",
  label: "Clínica Pet",
  icon: Dog,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Estética Pet", icon: Calendar },
    { path: "/workspace/agenda/servicos", label: "Vacinas", icon: HeartPulse },
    { path: "/workspace/catalogo/produtos", label: "Produtos Pet", icon: Package },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/clientes", label: "Tutores", icon: Users },
  ],
};

// 13. Supermercado
const GROUP_SUPERMARKET: NavGroup = {
  id: "supermarket",
  label: "Mercado",
  icon: ShoppingCart,
  section: "niche",
  items: [
    { path: "/workspace/marketing/encartes", label: "Encartes", icon: Flame },
    { path: "/workspace/catalogo/produtos", label: "Gôndolas", icon: Package },
    { path: "/workspace/catalogo/categorias", label: "Sessões", icon: Tags },
    { path: "/workspace/estoque/alertas", label: "Validades", icon: AlertTriangle },
    { path: "/workspace/pedidos/expedicao", label: "Separação", icon: PackageCheck },
    { path: "/workspace/pedidos/frota", label: "Entregas", icon: Truck },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
  ],
};

// 14. Farmácia
const GROUP_PHARMACY: NavGroup = {
  id: "pharmacy",
  label: "Farmácia",
  icon: HeartPulse,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Medicamentos", icon: Package },
    { path: "/workspace/pedidos", label: "Receituários", icon: ClipboardList },
    { path: "/workspace/pedidos/frota", label: "Tele-Entrega", icon: Truck },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/clientes", label: "Pacientes", icon: Users },
  ],
};

// 15. Redação
const GROUP_NEWS: NavGroup = {
  id: "news",
  label: "Redação",
  icon: Newspaper,
  section: "niche",
  items: [
    { path: "/workspace/noticias", label: "Matérias", icon: Newspaper },
    { path: "/workspace/noticias/novo", label: "Nova Matéria", icon: PenTool },
    { path: "/workspace/marketing/banners", label: "Publicidade", icon: ImageIcon },
    { path: "/workspace/marketing/vitrine", label: "Capa", icon: Eye },
  ],
};

// 16. Educação
const GROUP_EDUCATION: NavGroup = {
  id: "education",
  label: "Cursos",
  icon: GraduationCap,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Turmas", icon: Calendar },
    { path: "/workspace/agenda/servicos", label: "Cursos", icon: GraduationCap },
    { path: "/workspace/clientes", label: "Alunos", icon: Users },
    { path: "/workspace/orcamentos", label: "Matrículas", icon: FileText },
  ],
};

// 17. Atacado
const GROUP_WHOLESALE: NavGroup = {
  id: "wholesale",
  label: "Atacado",
  icon: Layers2,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Atacado", icon: Package },
    { path: "/workspace/catalogo/tabelas", label: "Tabelas PJ", icon: FileSpreadsheet },
    { path: "/workspace/b2b", label: "Empresas B2B", icon: Building2 },
    { path: "/workspace/orcamentos", label: "Cotações", icon: FileText },
    { path: "/workspace/pedidos", label: "Faturamento", icon: ShoppingBag },
    { path: "/workspace/clientes", label: "Distribuidores", icon: Users },
  ],
};

// Grupos Universais Corporativos
const GROUP_COMMERCIAL_SALES: NavGroup = {
  id: "commercial",
  label: "Comercial",
  icon: Users,
  section: "corporate",
  items: [
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
    { path: "/workspace/crm", label: "CRM", icon: Kanban },
    { path: "/workspace/comercial", label: "Funil", icon: Kanban },
    { path: "/workspace/atendimento", label: "Conversas", icon: MessageSquare },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
    { path: "/workspace/pdv", label: "Caixa PDV", icon: Store },
    { path: "/workspace/pedidos", label: "Vendas", icon: ShoppingBag },
  ],
};

const GROUP_MARKETING_VITRINE: NavGroup = {
  id: "marketing",
  label: "Marketing",
  icon: Megaphone,
  section: "corporate",
  items: [
    { path: "/workspace/marketing/vitrine", label: "Vitrine", icon: LayoutGrid },
    { path: "/workspace/builder", label: "Construtor", icon: LayoutTemplate },
    { path: "/workspace/estudio", label: "Estúdio Criativo", icon: Palette },
    { path: "/workspace/marketing/brand-kit", label: "Brand Kit", icon: Palette },
    { path: "/workspace/cms/paginas", label: "Páginas", icon: FileText },
    { path: "/workspace/cms/stories", label: "Stories", icon: Flame },
    { path: "/workspace/marketing/stories", label: "Stories de Marketing", icon: Flame },
    { path: "/workspace/cms/avaliacoes", label: "Avaliações", icon: Star },
    { path: "/workspace/cms/navegacao", label: "Navegação", icon: Navigation },
    { path: "/workspace/marketing/hotpages", label: "Hotpages", icon: LayoutTemplate },
    { path: "/workspace/marketing/studio", label: "Studio", icon: Palette },
    { path: "/workspace/cms/bio", label: "Link Bio", icon: Link2 },
    { path: "/workspace/marketing/banners", label: "Banners", icon: ImageIcon },
    { path: "/workspace/marketing/encartes", label: "Encartes", icon: Flame },
    { path: "/workspace/marketing/carrinhos", label: "Abandonos", icon: ShoppingCart },
    { path: "/workspace/marketing/promocoes", label: "Promoções", icon: Flame },
    { path: "/workspace/marketing/concursos", label: "Sorteios", icon: Ticket },
    { path: "/workspace/marketing/afiliados", label: "Afiliados", icon: Coins },
    { path: "/workspace/marketing/patrocinadores", label: "Patrocinadores", icon: Megaphone },
    { path: "/workspace/marketing/fidelidade", label: "Fidelidade", icon: Award },
    { path: "/workspace/marketing/gift-cards", label: "Gift Cards", icon: Gift },
    { path: "/workspace/marketing/pixels", label: "Pixels", icon: Target },
    { path: "/workspace/marketing/telemetria", label: "Telemetria", icon: Target },
    { path: "/workspace/marketing/formularios", label: "Formulários", icon: FileText },
    { path: "/workspace/marketing/publicacoes", label: "Publicações", icon: Newspaper },
    { path: "/workspace/mural/novo", label: "Novo no Mural", icon: PenTool },
    { path: "/workspace/marketing/briefing", label: "Briefing IA", icon: Bot },
    { path: "/workspace/marketing/anuncios", label: "Anúncios", icon: Megaphone },
    { path: "/workspace/integracoes/marketplaces", label: "Marketplaces", icon: Globe },
    { path: "/workspace/marketing/social", label: "Social", icon: Share2 },
    { path: "/workspace/cms/calendario", label: "Calendário", icon: Calendar },
  ],
};

const GROUP_LOGISTICS_EXPEDITION: NavGroup = {
  id: "logistics-expedition",
  label: "Logística",
  icon: Truck,
  section: "corporate",
  items: [
    { path: "/workspace/pedidos/expedicao", label: "Expedição", icon: Package },
    { path: "/workspace/pedidos/frota", label: "Despacho", icon: Truck },
    { path: "/workspace/pedidos/entregadores", label: "Entregadores", icon: Users },
    { path: "/workspace/pedidos/trocas", label: "Trocas", icon: ArrowRightLeft },
    { path: "/workspace/logistica/pudo", label: "Pontos PUDO", icon: MapPin },
    { path: "/workspace/logistica/tabelas", label: "Tabelas", icon: Navigation },
    { path: "/workspace/logistica/faturas", label: "CT-e", icon: Receipt },
    { path: "/workspace/configuracoes/fretes/cotacoes", label: "Cotações", icon: Calculator },
  ],
};

const GROUP_FINANCE_CLEAN: NavGroup = {
  id: "finance",
  label: "Financeiro",
  icon: Banknote,
  section: "corporate",
  items: [
    { path: "/workspace/financeiro", label: "Visão Financeira", icon: Banknote },
    { path: "/workspace/financeiro/caixa", label: "Caixa", icon: Banknote },
    { path: "/workspace/financeiro/caixa/lancamentos", label: "Lançamentos", icon: Receipt },
    { path: "/workspace/financeiro/caixa/turnos", label: "Turnos", icon: Clock },
    { path: "/workspace/relatorios", label: "Relatórios", icon: FileSpreadsheet },
    { path: "/workspace/relatorios/metas", label: "Metas", icon: Target },
    { path: "/workspace/financeiro/pagamentos", label: "Repasses", icon: DollarSign },
    { path: "/workspace/financeiro/contas-pagar", label: "Contas a Pagar", icon: Receipt },
    { path: "/workspace/financeiro/recebiveis", label: "Recebíveis", icon: Receipt },
    { path: "/workspace/financeiro/faturas", label: "Faturas", icon: Receipt },
    { path: "/workspace/financeiro/comprovantes", label: "Comprovantes", icon: ShieldCheck },
    { path: "/workspace/financeiro/relatorios-canal", label: "DRE", icon: FileSpreadsheet },
    { path: "/workspace/financeiro/afiliados", label: "Afiliados", icon: Coins },
    { path: "/workspace/afiliados/conciliacao", label: "Conciliação", icon: Receipt },
    { path: "/workspace/financeiro/funcionarios", label: "Pagamentos", icon: Users },
    { path: "/workspace/tokens", label: "Tokens", icon: Coins },
    { path: "/workspace/rh/folha", label: "Folha de Pagamento", icon: Wallet },
  ],
};


const GROUP_FISCAL_ACCOUNTING: NavGroup = {
  id: "fiscal-accounting",
  label: "Fiscal",
  icon: FileText,
  section: "corporate",
  items: [
    { path: "/workspace/fiscal/nfe", label: "Notas Fiscais", icon: Receipt },
    { path: "/workspace/contador", label: "Contabilidade", icon: FileSpreadsheet },
    { path: "/workspace/contratos", label: "Contratos", icon: FileText },
    { path: "/workspace/licitacoes", label: "Licitações", icon: Scale },
  ],
};

const GROUP_TEAM_RH: NavGroup = {
  id: "team-rh",
  label: "Equipe",
  icon: Users,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes/equipe", label: "Colaboradores", icon: Users },
    { path: "/workspace/rh/folha", label: "Folha de Pagamento", icon: Wallet },
    { path: "/workspace/rh/ponto", label: "Ponto", icon: Clock },
    { path: "/workspace/financeiro/comissoes", label: "Comissões", icon: Target },
    { path: "/workspace/rh/compliance", label: "Compliance", icon: ShieldCheck },
    { path: "/workspace/configuracoes/sessoes", label: "Sessões", icon: ShieldCheck },
  ],
};

const GROUP_DONATIONS_CAPTACAO: NavGroup = {
  id: "donations-captacao",
  label: "Captação",
  icon: Coins,
  section: "corporate",
  items: [
    { path: "/workspace/doacoes", label: "Doações", icon: Gift },
    { path: "/workspace/associacao", label: "Associação", icon: HandHeart },
    { path: "/workspace/captacao", label: "Investidores", icon: Coins },
    { path: "/workspace/captacao/ndas", label: "NDAs", icon: Lock },
  ],
};

import { getNicheSemantics } from "./niche-semantics";


const GROUP_SUPPORT_DESK: NavGroup = {
  id: "support-desk",
  label: "Suporte",
  icon: LifeBuoy,
  section: "corporate",
  items: [
    { path: "/workspace/suporte", label: "Atendimento", icon: LifeBuoy },
    { path: "/workspace/avaliacoes", label: "Avaliações", icon: Star },
    { path: "/workspace/pedidos/trocas", label: "Trocas", icon: ArrowRightLeft },
    { path: "/workspace/qualidade", label: "Qualidade", icon: Award },
    { path: "/workspace/notificacoes", label: "Alertas", icon: Bell },
  ],
};

const GROUP_GOVERNANCE_AUDIT: NavGroup = {
  id: "governance-audit",
  label: "Conformidade",
  icon: ShieldCheck,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes/conformidade", label: "Marketplace Oficial", icon: ShieldCheck },
    { path: "/workspace/qualidade", label: "Qualidade", icon: Award },
  ],
};

/**
 * Rotas isoladas exclusivamente para o Painel Admin Master (/admin-master/*).
 * Jamais devem ser renderizadas na barra lateral operacional do lojista (/workspace/*).
 */
export const ADMIN_MASTER_ISOLATED_ROUTES = [
  { path: "/workspace/design-system", redirectTo: "/admin-master/marca" },
  { path: "/workspace/moderacao", redirectTo: "/admin-master/denuncias" },
  { path: "/workspace/moderacao/kyc", redirectTo: "/admin-master/kyc" },
  { path: "/workspace/master/influencers", redirectTo: "/admin-master/curadoria" },
] as const;

const GROUP_SETTINGS: NavGroup = {
  id: "settings",
  label: "Ajustes",
  icon: Settings,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes", label: "Geral", icon: Settings },
    { path: "/workspace/configuracoes/loja", label: "Perfil da Loja", icon: Store },
    { path: "/workspace/configuracoes/planos", label: "Planos e Módulos", icon: Layers },
    { path: "/workspace/lojas", label: "Minhas Lojas", icon: Building2 },
    { path: "/workspace/configuracoes/conformidade", label: "Conformidade Fiscal", icon: ShieldCheck },
    { path: "/workspace/configuracoes/ai", label: "Chaves IA (BYOK)", icon: Zap },
    { path: "/workspace/configuracoes/pwa", label: "Aplicativo PWA", icon: Smartphone },
    { path: "/workspace/configuracoes/privacidade-loja", label: "Privacidade", icon: Lock },
    { path: "/workspace/configuracoes/sessoes", label: "Sessões e Acessos", icon: ShieldCheck },
    { path: "/workspace/integracoes/marketplaces", label: "Marketplaces", icon: Globe },
    { path: "/workspace/configuracoes/inteligencia-artificial", label: "Governança de IA", icon: Bot },
    { path: "/workspace/configuracoes/integracoes", label: "Integrações", icon: Link2 },
    { path: "/workspace/automacoes", label: "Automações", icon: Zap },
    { path: "/workspace/configuracoes/parceiros", label: "Fornecedores", icon: Building2 },
  ],
};

// ── RESOLVER INTELIGENTE DE NAVEGAÇÃO POR NICHO ──────────────────────────────

export function resolveWorkspaceNavigation(
  storeData: any,
  options?: { isMasterMode?: boolean; additionalModules?: string[]; userRole?: string }
): NavGroup[] {
  // Se estiver no modo master/desenvolvedor, entrega todos os grupos organizados
  if (options?.isMasterMode) {
    return [
      GROUP_OVERVIEW,
      GROUP_MASTER_TASKS,
      GROUP_CRM_CLIENTS,
      GROUP_TURISMO_CRM,
      GROUP_MASTER_INBOX,
      GROUP_WHATSAPP_AUTOMATIONS,
      GROUP_AGENTIC_INTELLIGENCE,
      GROUP_COMMERCIAL_SALES,
      GROUP_TURISMO_COMMERCIAL,
      GROUP_TURISMO_OPERATIONS,
      GROUP_TURISMO_BOARDING,
      GROUP_TURISMO_CATALOG,
      GROUP_GASTRO_CATALOG,
      GROUP_GASTRO_ORDERS,
      GROUP_RETAIL_CATALOG,
      GROUP_RETAIL_SALES,
      GROUP_SERVICES_AGENDA,
      GROUP_SERVICES_CATALOG,
      GROUP_RENTAL_EVENTS,
      GROUP_TECH_REPAIR,
      GROUP_AUTOMOTIVE_WORKSHOP,
      GROUP_ACCOUNTING,
      GROUP_LEGAL,
      GROUP_REAL_ESTATE,
      GROUP_JOBS,
      GROUP_EVENTS_TICKETS,
      GROUP_VEHICLES,
      GROUP_PET,
      GROUP_SUPERMARKET,
      GROUP_PHARMACY,
      GROUP_NEWS,
      GROUP_EDUCATION,
      GROUP_WHOLESALE,
      GROUP_MARKETING_VITRINE,
      GROUP_LOGISTICS_EXPEDITION,
      GROUP_SUPPORT_DESK,
      GROUP_GOVERNANCE_AUDIT,
      GROUP_FINANCE_CLEAN,
      GROUP_FISCAL_ACCOUNTING,
      GROUP_TEAM_RH,
      GROUP_DONATIONS_CAPTACAO,
      GROUP_SETTINGS,
    ];
  }

  const semantics = getNicheSemantics(storeData);
  const unifiedNicheId = resolveUnifiedNicheId(storeData);
  const storeCaps =
    storeData &&
    typeof storeData === "object" &&
    (storeData.vertical_sku || storeData.subscription_status || storeData.quota_overrides)
      ? resolveStoreWorkspaceCapabilities(storeData)
      : null;
  let rawGroups: NavGroup[] = [];

  if (unifiedNicheId === "automotive") {
    rawGroups = [
      GROUP_OVERVIEW,
      GROUP_MASTER_TASKS,
      GROUP_CRM_CLIENTS,
      GROUP_MASTER_INBOX,
      GROUP_AUTOMOTIVE_WORKSHOP,
      GROUP_VEHICLES,
      GROUP_COMMERCIAL_SALES,
      GROUP_MARKETING_VITRINE,
      GROUP_LOGISTICS_EXPEDITION,
      GROUP_SUPPORT_DESK,
      GROUP_FINANCE_CLEAN,
      GROUP_FISCAL_ACCOUNTING,
      GROUP_TEAM_RH,
      GROUP_AGENTIC_INTELLIGENCE,
      GROUP_SETTINGS,
    ];
  } else if (unifiedNicheId === "accounting") {
    rawGroups = [
      GROUP_OVERVIEW,
      GROUP_MASTER_TASKS,
      GROUP_CRM_CLIENTS,
      GROUP_MASTER_INBOX,
      GROUP_ACCOUNTING,
      GROUP_COMMERCIAL_SALES,
      GROUP_MARKETING_VITRINE,
      GROUP_SUPPORT_DESK,
      GROUP_FINANCE_CLEAN,
      GROUP_FISCAL_ACCOUNTING,
      GROUP_TEAM_RH,
      GROUP_AGENTIC_INTELLIGENCE,
      GROUP_SETTINGS,
    ];
  } else switch (semantics.nicheId) {
    case "tourism":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_TURISMO_COMMERCIAL,
        GROUP_TURISMO_CRM,
        GROUP_TURISMO_OPERATIONS,
        GROUP_TURISMO_BOARDING,
        GROUP_TURISMO_CATALOG,
        GROUP_TURISMO_MARKETING,
        GROUP_MASTER_INBOX,
        GROUP_WHATSAPP_AUTOMATIONS,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "gastronomy":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_GASTRO_CATALOG,
        GROUP_GASTRO_ORDERS,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "services":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_SERVICES_AGENDA,
        GROUP_SERVICES_CATALOG,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "legal":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_LEGAL,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "jobs":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_JOBS,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "pharmacy":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_PHARMACY,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "wholesale":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_WHOLESALE,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "rental":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_RENTAL_EVENTS,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "tech_repair":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_TECH_REPAIR,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "pet":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_PET,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "supermarket":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_SUPERMARKET,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "events":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_EVENTS_TICKETS,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "vehicles":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_VEHICLES,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "real_estate":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_REAL_ESTATE,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "education":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_EDUCATION,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "news":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_NEWS,
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;

    case "retail":
    default:
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_CRM_CLIENTS,
        GROUP_MASTER_INBOX,
        GROUP_RETAIL_CATALOG,
        GROUP_RETAIL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_SUPPORT_DESK,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_DONATIONS_CAPTACAO,
        GROUP_AGENTIC_INTELLIGENCE,
        GROUP_SETTINGS,
      ];
      break;
  }

  // ── ENRIQUECIMENTO E FILTRAGEM MODULAR DINÂMICA ─────────────────────────────
  let resolvedGroups = rawGroups;
  const enabledModules: string[] | undefined =
    storeData?.settings?.enabled_modules ||
    storeData?.enabled_modules;

  if (enabledModules && Array.isArray(enabledModules) && enabledModules.length > 0) {
    const finalGroups: NavGroup[] = [];

    for (const group of rawGroups) {
      // Sempre preserva Overview, Master Tasks/Inbox, Financeiro, Fiscal, Logística, Suporte, Configurações e Grupos Primários do Nicho Ativo
      if (
        group.id === "overview" ||
        group.id === "master-tasks" ||
        group.id === "crm-clients" ||
        group.id === "tourism-crm" ||
        group.id === "events-tickets" ||
        group.id === "master-inbox" ||
        group.id === "intelligence-squads" ||
        group.id === "support-desk" ||
        group.id === "governance-audit" ||
        group.id === "finance" ||
        group.id === "fiscal-accounting" ||
        group.id === "logistics-expedition" ||
        group.id === "settings" ||
        group.id === "team-rh" ||
        group.id.startsWith(semantics.nicheId)
      ) {
        finalGroups.push(group);
        continue;
      }

      // Grupo de Marketing / Vitrine: filtra ou adiciona itens específicos
      if (group.id === "marketing") {
        const filteredItems = group.items.filter((item) => {
          if (item.path.includes("/workspace/estudio") && !enabledModules.includes("studio")) return false;
          if (item.path.includes("/workspace/cms/bio") && !enabledModules.includes("biolink")) return false;
          if (item.path.includes("/workspace/cms/paginas") && !enabledModules.includes("pages")) return false;
          return true;
        });

        // Adiciona Classificados caso habilitado
        if (enabledModules.includes("classifieds")) {
          const hasClassifieds = filteredItems.some((i) => i.path.includes("classificados"));
          if (!hasClassifieds) {
            filteredItems.push({
              path: "/conta/classificados",
              label: "Classificados Locais",
              icon: Megaphone,
            });
          }
        }

        finalGroups.push({ ...group, items: filteredItems });
        continue;
      }

      // Demais grupos operacionais: filtra itens como PDV, Frota e Estoque se desabilitados
      const filteredItems = group.items.filter((item) => {
        if (item.path === "/workspace/pdv" && !enabledModules.includes("pos")) return false;
        if (item.path.includes("/workspace/pedidos/frota") && !enabledModules.includes("delivery")) return false;
        if (item.path.includes("/workspace/estoque") && !enabledModules.includes("stock")) return false;
        if (item.path === "/workspace/pedidos/gestor" && !enabledModules.includes("orders")) return false;
        return true;
      });

      if (filteredItems.length > 0) {
        finalGroups.push({ ...group, items: filteredItems });
      }
    }

    // Inclusão de grupos complementares ativados pelo usuário
    if (enabledModules.includes("jobs") && !finalGroups.some((g) => g.id === "jobs")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_JOBS);
    }
    if (enabledModules.includes("events") && !finalGroups.some((g) => g.id === "events-tickets")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_EVENTS_TICKETS);
    }
    if (enabledModules.includes("news") && !finalGroups.some((g) => g.id === "news")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_NEWS);
    }
    if (enabledModules.includes("vehicles") && !finalGroups.some((g) => g.id === "vehicles")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_VEHICLES);
    }
    if (enabledModules.includes("real_estate") && !finalGroups.some((g) => g.id === "real-estate")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_REAL_ESTATE);
    }
    if (enabledModules.includes("tourism") && semantics.nicheId === "tourism" && !finalGroups.some((g) => g.id.startsWith("tourism"))) {
      finalGroups.splice(
        finalGroups.length - 2,
        0,
        GROUP_TURISMO_COMMERCIAL,
        GROUP_TURISMO_OPERATIONS,
        GROUP_TURISMO_BOARDING,
        GROUP_TURISMO_CATALOG
      );
    }
    if (enabledModules.includes("education") && !finalGroups.some((g) => g.id === "education")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_EDUCATION);
    }
    if ((enabledModules.includes("mining") || enabledModules.includes("intelligence")) && !finalGroups.some((g) => g.id === "intelligence-squads")) {
      finalGroups.splice(finalGroups.length - 2, 0, GROUP_AGENTIC_INTELLIGENCE);
    }

    resolvedGroups = finalGroups;
  }

  if (storeCaps && !storeCaps.exempt) {
    const capSet = new Set(storeCaps.capabilities);
    const hasErpModule = storeCaps.activeModules.includes("module_financial_erp");
    resolvedGroups = resolvedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (
            !capSet.has("delivery_logistics") &&
            (item.path.includes("/workspace/pedidos/frota") ||
              item.path.includes("/workspace/pedidos/entregadores"))
          ) {
            return false;
          }
          if (
            !hasErpModule &&
            !capSet.has("financial_ledger") &&
            item.path.startsWith("/workspace/fiscal/")
          ) {
            return false;
          }
          if (!capSet.has("service_orders") && item.path.startsWith("/workspace/ordens-servico")) {
            return false;
          }
          if (!capSet.has("agenda_services") && item.path === "/workspace/agenda") {
            return false;
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  // ── GOVERNANÇA GRANULAR DE RBAC POR CARGO / FUNÇÃO ───────────────────────────
  const userRole = (options?.userRole || "owner").toLowerCase();

  // Proprietário(a) e Administrador Geral possuem acesso irrestrito
  if (userRole === "owner" || userRole === "admin" || userRole === "proprietario") {
    return resolvedGroups;
  }

  // Gerente / Manager: acesso operacional completo, exceto configurações societárias/bancárias de titularidade
  if (userRole === "manager" || userRole === "gerente") {
    const OWNER_ONLY_PREFIXES = [
      "/workspace/configuracoes/seguranca",
      "/workspace/configuracoes/excluir",
      "/workspace/settings/danger-zone",
      "/workspace/assinatura",
      "/workspace/faturamento",
      "/workspace/financeiro/faturas",
      "/workspace/financeiro/dados-bancarios",
      "/workspace/financeiro/saques",
      "/workspace/financeiro/configuracao",
      "/workspace/configuracoes/integracoes",
      "/workspace/configuracoes/planos",
      "/workspace/configuracoes/ai",
      "/workspace/configuracoes/inteligencia-artificial",
      "/workspace/configuracoes/sessoes",
      "/workspace/configuracoes/privacidade-loja",
      "/workspace/configuracoes/parceiros",
      "/workspace/configuracoes/tokens",
      "/workspace/faturamento/tokens",
      "/workspace/financeiro/dre",
      "/workspace/financeiro/fechamento",
      "/workspace/configuracoes/fiscal",
      "/workspace/configuracoes/pagamentos",
    ];

    return resolvedGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !OWNER_ONLY_PREFIXES.some(
              (prefix) => item.path === prefix || item.path.startsWith(prefix + "/")
            )
        ),
      }))
      .filter((group) => group.items.length > 0);
  }

  // Operador de Caixa / Cashier: apenas PDV, Abertura/Fechamento de Caixa
  if (userRole === "cashier" || userRole === "caixa") {
    return [
      GROUP_OVERVIEW,
      {
        id: "pos-cashier",
        label: "Frente de Caixa",
        icon: ShoppingBag,
        items: [
          { path: "/workspace/pdv", label: "Frente de Caixa", icon: ShoppingBag },
          { path: "/workspace/pedidos", label: "Pedidos do Dia", icon: ShoppingCart },
          { path: "/workspace/financeiro/caixa", label: "Caixa do Turno", icon: Banknote },
        ],
      },
    ];
  }

  // Vendedor(a) / Atendente / Seller: Catálogo, Pedidos, Orçamentos, PDV, Clientes
  if (userRole === "seller" || userRole === "vendedor" || userRole === "atendente") {
    return resolvedGroups
      .filter((g) => g.id !== "settings" && g.id !== "marketing")
      .map((g) => {
        if (g.id === "finance") {
          return {
            ...g,
            items: g.items.filter((i) => i.path.includes("caixa") || i.path.includes("pagamentos")),
          };
        }
        return g;
      });
  }

  // Cozinha / Operador / Estoquista: KDS / Separação de Pedidos e Estoque
  if (userRole === "kitchen" || userRole === "operator" || userRole === "cozinha" || userRole === "estoquista") {
    return [
      GROUP_OVERVIEW,
      {
        id: "operations",
        label: "Expedição",
        icon: Boxes,
        items: [
          { path: "/workspace/pedidos/gestor", label: "Monitor KDS", icon: Clock },
          { path: "/workspace/pedidos", label: "Separação", icon: Package },
          { path: "/workspace/estoque", label: "Estoque", icon: Boxes },
        ],
      },
    ];
  }

  // Especialista / Profissional: Agenda, Meus Clientes e Comandas
  if (userRole === "specialist" || userRole === "profissional") {
    return [
      GROUP_OVERVIEW,
      {
        id: "specialist-agenda",
        label: "Minha Agenda",
        icon: Calendar,
        items: [
          { path: "/workspace/agenda", label: "Grade de Horários", icon: Calendar },
          { path: "/workspace/clientes", label: "Meus Clientes", icon: Users },
          { path: "/workspace/pdv", label: "Lançar Comanda", icon: ShoppingBag },
        ],
      },
    ];
  }

  // Financeiro / Contador / Faturamento: acesso focado em Finanças, Comissões, Contratos e Clientes
  if (userRole === "finance" || userRole === "financeiro" || userRole === "contador" || userRole === "billing") {
    return resolvedGroups
      .filter(
        (g) =>
          g.id === "overview" ||
          g.id === "finance" ||
          g.id === "billing" ||
          g.id === "customers" ||
          g.id === "tourism-catalog" ||
          g.id === "tourism-operations"
      )
      .map((g) => {
        if (g.id === "tourism-catalog") {
          return {
            ...g,
            items: g.items.filter(
              (i) =>
                i.path.includes("comissoes") ||
                i.path.includes("contratos") ||
                i.path.includes("fornecedores")
            ),
          };
        }
        if (g.id === "tourism-operations") {
          return {
            ...g,
            items: g.items.filter((i) => i.path.includes("viagens") || i.path.includes("vouchers")),
          };
        }
        return g;
      })
      .filter((g) => g.items.length > 0);
  }

  // Operacional de Turismo / Embarques / Suporte Pós-Venda: foco em Viagens, Embarques, Vouchers, Reacomodação e Clientes
  if (
    userRole === "operations" ||
    userRole === "operacional" ||
    userRole === "embarques" ||
    userRole === "suporte" ||
    userRole === "support"
  ) {
    return resolvedGroups
      .filter(
        (g) =>
          g.id === "overview" ||
          g.id === "tourism-operations" ||
          g.id === "tourism-boarding" ||
          g.id === "tourism-catalog" ||
          g.id === "customers" ||
          g.id === "orders"
      )
      .map((g) => {
        if (g.id === "tourism-catalog") {
          return {
            ...g,
            items: g.items.filter(
              (i) =>
                i.path.includes("hoteis") ||
                i.path.includes("fornecedores") ||
                i.path.includes("contratos")
            ),
          };
        }
        return g;
      })
      .filter((g) => g.items.length > 0);
  }

  // RH / Recrutador: Colaboradores, Vagas e Candidatos
  if (userRole === "rh" || userRole === "recruiter") {
    return [
      GROUP_OVERVIEW,
      {
        id: "rh-module",
        label: "Recrutamento",
        icon: Briefcase,
        items: [
          { path: "/workspace/configuracoes/equipe", label: "Colaboradores", icon: Users },
          { path: "/workspace/rh/folha", label: "Folha de Pagamento", icon: Wallet },
          { path: "/workspace/empregos/candidatos", label: "Candidaturas", icon: Briefcase },
          { path: "/workspace/clientes", label: "Banco de Talentos", icon: Users },
        ],
      },
    ];
  }

  return resolvedGroups;
}


import { getNicheTranslation } from "./niche-dictionary";
import { getNicheManifest, type NicheModuleKey } from "./niche-manifest";

const PATH_TO_NICHE_MODULE: Record<string, NicheModuleKey> = {
  "/workspace/pedidos/gestor": "kds",
  "/workspace/pdv/cozinha": "kds",
  "/workspace/pedidos/kds": "kds",
  "/workspace/pedidos/tempo-preparo": "kds",
  "/workspace/pedidos/mesas": "tables",
  "/workspace/pdv/comandas": "tables",
  "/workspace/reservas": "tables",
  "/workspace/pedidos/frota": "couriers",
  "/workspace/pedidos/entregadores": "couriers",
  "/workspace/entregadores": "couriers",
  "/workspace/relatorios/gastronomia": "kds",
  "/workspace/conteudo/receitas": "kds",
  "/workspace/turismo/embarque": "boarding",
  "/workspace/turismo/embarques": "boarding",
  "/workspace/turismo/frota": "fleet",
  "/workspace/turismo/propostas": "proposals",
  "/workspace/turismo/cotacoes": "quotes",
  "/workspace/turismo/contratos": "contracts",
  "/workspace/turismo/aereos": "proposals",
  "/workspace/turismo/hoteis": "proposals",
  "/workspace/turismo/roteiros": "proposals",
  "/workspace/turismo/passageiros": "proposals",
  "/workspace/turismo": "proposals",
  "/workspace/simlab": "simlab",
  "/workspace/estoque": "inventory",
  "/workspace/tarefas": "tasks",
};

/**
 * The Semantic Sidebar Engine (Waesy Omni-Niche)
 *
 * Transforma dinamicamente o sidebar de navegação de acordo com o Nicho Ativo.
 * Se um módulo não pertence ao nicho da empresa, ele DESAPARECE completamente.
 * Adapta os rótulos de menu usando o Dicionário Universal de Nichos.
 */
export function getSidebarConfig(
  nicheIdOrStoreData: string | any,
  options?: { isMasterMode?: boolean; additionalModules?: string[]; userRole?: string }
): NavGroup[] {
  let storeContext = typeof nicheIdOrStoreData === "string"
    ? { segment: nicheIdOrStoreData, settings: { segment: nicheIdOrStoreData } }
    : nicheIdOrStoreData;

  const semantics = getNicheSemantics(storeContext);
  const manifest = getNicheManifest(semantics.nicheId || storeContext?.segment || storeContext?.niche_id);
  const groups = resolveWorkspaceNavigation(storeContext, options);
  const { t } = getNicheTranslation(storeContext);

  if (options?.isMasterMode) {
    return groups;
  }

  // Aplica metamorfose semântica nos rótulos de navegação e filtragem estrita pelo manifesto do nicho
  return groups
    .map((group) => {
      // Traduz o título do grupo se for catálogo, vendas ou operações
      let groupLabel = group.label;
      if (group.id.includes("catalog")) groupLabel = t("catalog");
      if (group.id.includes("sales") || group.id.includes("orders")) {
        groupLabel = group.label || "Vendas";
      }

      const items = group.items
        .filter((item) => {
          if (options?.additionalModules?.includes(item.path)) return true;
          const matchedModule = Object.entries(PATH_TO_NICHE_MODULE).find(([prefix]) =>
            item.path.startsWith(prefix)
          )?.[1];
          if (matchedModule && manifest.activeModules && !manifest.activeModules.includes(matchedModule)) {
            return false;
          }
          return true;
        })
        .map((item) => {
          let label = item.label;
          if (item.path === "/workspace/catalogo/produtos") label = t("items");
          if (item.path === "/workspace/catalogo/categorias") label = t("categories");
          if (item.path === "/workspace/catalogo/atributos") label = t("modifiers");
          if (item.path === "/workspace/pedidos/gestor") label = t("kds");
          if (item.path === "/workspace/pedidos") {
            label = group.id.includes("retail") || group.id.includes("commercial")
              ? "Lista de Vendas"
              : t("orders");
          }
          if (item.path === "/workspace/clientes") label = t("clients");
          if (item.path === "/workspace/estoque") label = t("stock");
          return { ...item, label };
        });

      return { ...group, label: groupLabel, items };
    })
    .filter((group) => group.items.length > 0);
}

export interface MasterPillar {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  defaultPath: string;
  groups: NavGroup[];
  items: NavItem[];
}

interface MasterPillarDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  groupIds: string[];
}

const MASTER_PILLAR_DEFINITIONS: MasterPillarDefinition[] = [
  {
    id: "overview",
    label: "Painel",
    shortLabel: "Painel",
    description: "Visão executiva, tarefas, agenda e indicadores",
    icon: LayoutDashboard,
    groupIds: ["overview", "master-tasks"],
  },
  {
    id: "atendimento",
    label: "Atendimento",
    shortLabel: "Atendimento",
    description: "Conversas, WhatsApp e suporte",
    icon: MessageSquare,
    groupIds: ["master-inbox", "whatsapp-automations"],
  },
  {
    id: "crm",
    label: "Clientes",
    shortLabel: "Clientes",
    description: "Carteira de clientes, histórico e relacionamento",
    icon: Users,
    groupIds: ["crm-clients", "tourism-crm"],
  },
  {
    id: "comercial",
    label: "Vendas",
    shortLabel: "Vendas",
    description: "Pipeline comercial, propostas, pedidos e frente de caixa",
    icon: Kanban,
    groupIds: [
      "tourism-commercial",
      "commercial",
      "commercial-sales",
      "retail-sales",
      "gastro-orders",
      "services-agenda",
      "automotive-workshop",
      "legal",
      "real-estate",
      "vehicles",
      "wholesale",
      "donations-captacao",
    ],
  },
  {
    id: "eventos",
    label: "Eventos",
    shortLabel: "Eventos",
    description: "Gestão de eventos, ingressos e bilheteria",
    icon: Ticket,
    groupIds: ["events-tickets"],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    shortLabel: "Catálogo",
    description: "Produtos, pacotes, vitrine digital e campanhas",
    icon: Package,
    groupIds: [
      "tourism-catalog",
      "retail-catalog",
      "gastro-catalog",
      "services-catalog",
      "rental-events",
      "pet",
      "supermarket",
      "pharmacy",
      "news",
      "education",
      "tourism-marketing",
      "marketing",
    ],
  },
  {
    id: "logistica",
    label: "Logística",
    shortLabel: "Logística",
    description: "Operações, viagens, embarques, frota e expedição",
    icon: Truck,
    groupIds: [
      "tourism-trips",
      "tourism-boarding",
      "logistics-expedition",
      "tech-repair",
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    shortLabel: "Suporte",
    description: "Central de suporte, trocas e conformidade",
    icon: LifeBuoy,
    groupIds: ["support-desk", "governance-audit"],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    shortLabel: "Financeiro",
    description: "Fluxo de caixa, recebíveis, DRE e notas fiscais",
    icon: Banknote,
    groupIds: ["finance", "fiscal-accounting", "accounting"],
  },
  {
    id: "rh",
    label: "Equipe",
    shortLabel: "Equipe",
    description: "Colaboradores, ponto, comissões e vagas",
    icon: Users,
    groupIds: ["team-rh", "jobs"],
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    shortLabel: "IA",
    description: "Agentes autônomos, radar de mercado e simulações",
    icon: Bot,
    groupIds: ["intelligence-squads"],
  },
  {
    id: "configuracoes",
    label: "Ajustes",
    shortLabel: "Ajustes",
    description: "Perfil da empresa, integrações, lojas e segurança",
    icon: Settings,
    groupIds: ["settings"],
  },
];

type PillarOverride = Partial<Pick<MasterPillarDefinition, "label" | "shortLabel" | "description" | "icon">>;

const NICHE_MASTER_PILLAR_CONFIG: Record<
  string,
  {
    order?: string[];
    overrides: Record<string, PillarOverride>;
  }
> = {
  // Varejo, E-commerce, Supermercado, Farmácia & Atacado
  retail: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel", shortLabel: "Painel", description: "Visão executiva, tarefas, agenda e indicadores" },
      comercial: { label: "Vendas", shortLabel: "Vendas", description: "Pedidos, caixa, orçamentos, funil e devoluções", icon: ShoppingBag },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Base de clientes, histórico de compras e fidelidade", icon: Users },
      catalogo: { label: "Catálogo", shortLabel: "Catálogo", description: "Produtos, grades, estoque, vitrine e campanhas", icon: Package },
      logistica: { label: "Logística", shortLabel: "Logística", description: "Separação, romaneio, fretes, pontos e frota", icon: Truck },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Conversas, WhatsApp, clientes e relacionamento", icon: MessageSquare },
      suporte: { label: "Qualidade", shortLabel: "Suporte", description: "Trocas, garantias, avaliações e conformidade", icon: LifeBuoy },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "DRE, notas fiscais, fluxo de caixa e recebíveis", icon: Banknote },
      rh: { label: "Equipe", shortLabel: "Equipe", description: "Colaboradores, ponto, comissões e recrutamento", icon: Users },
    },
  },

  // Gastronomia e Delivery
  gastronomy: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Turno", shortLabel: "Turno", description: "Visão do turno, metas do dia e rotina da operação" },
      comercial: { label: "Pedidos", shortLabel: "Pedidos", description: "Gestor de pedidos, cozinha, mesas, comandas e caixa", icon: UtensilsCrossed },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Base de clientes, fidelidade, preferências e aniversários", icon: Users },
      catalogo: { label: "Cardápio", shortLabel: "Cardápio", description: "Produtos, complementos, ficha técnica, receitas e estoque", icon: ChefHat },
      logistica: { label: "Entregas", shortLabel: "Entregas", description: "Expedição, romaneio, frota e entregadores", icon: Truck },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Chat com clientes, WhatsApp e avaliações", icon: MessageSquare },
      suporte: { label: "Qualidade", shortLabel: "Qualidade", description: "Ocorrências de pedidos, auditoria sanitária e suporte", icon: Award },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Caixa do turno, repasses, DRE e emissão fiscal", icon: Banknote },
      rh: { label: "Equipe", shortLabel: "Equipe", description: "Cozinha, garçons, entregadores, escalas e comissões", icon: Users },
    },
  },

  // Beleza, Estética, Bem-Estar e Clínicas
  services: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Recepção", shortLabel: "Painel", description: "Indicadores diários, ocupação da agenda e tarefas" },
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Mapa de horários, fila de espera, salas e comandas", icon: Calendar },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Histórico de procedimentos, prontuários e retornos", icon: Users },
      catalogo: { label: "Serviços", shortLabel: "Serviços", description: "Procedimentos, pacotes de sessões, anamnese e vitrine", icon: HeartPulse },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Lembretes de retorno, WhatsApp e avaliações", icon: MessageSquare },
      rh: { label: "Profissionais", shortLabel: "Equipe", description: "Especialistas, escalas de atendimento, rateio e equipe", icon: Users },
      logistica: { label: "Insumos", shortLabel: "Insumos", description: "Consumo técnico por atendimento, revenda e compras", icon: Boxes },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Caixa, repasse de comissões, recebíveis e notas", icon: Banknote },
      suporte: { label: "Qualidade", shortLabel: "Qualidade", description: "Satisfação, termos LGPD, contratos e suporte", icon: ShieldCheck },
    },
  },

  // Turismo, Agências e Operadoras
  tourism: {
    order: ["overview", "comercial", "crm", "logistica", "catalogo", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Operação", shortLabel: "Painel", description: "Radar executivo, próximas saídas e tarefas da agência" },
      comercial: { label: "Cotações", shortLabel: "Cotações", description: "Funil comercial, oportunidades, propostas e vouchers", icon: Compass },
      crm: { label: "Viajantes", shortLabel: "Viajantes", description: "Base de passageiros, histórico de viagens e preferências", icon: Users },
      logistica: { label: "Embarques", shortLabel: "Embarques", description: "Viagens, rooming list, check-in, transfers e frota", icon: Bus },
      catalogo: { label: "Roteiros", shortLabel: "Roteiros", description: "Roteiros, pacotes, hotéis, disponibilidade e fornecedores", icon: Plane },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Caixa de entrada dos viajantes, WhatsApp e suporte", icon: MessageSquare },
      suporte: { label: "Reacomodação", shortLabel: "Suporte", description: "Incidentes em viagens, reacomodação e assessoria", icon: LifeBuoy },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Fluxo de caixa, comissões, bilhetagem e fiscal", icon: Banknote },
      rh: { label: "Guias", shortLabel: "Guias", description: "Agentes de viagem, guias credenciados e motoristas", icon: Users },
      inteligencia: { label: "Radar", shortLabel: "Radar", description: "Radar turístico, leitura de passaportes e assistentes", icon: Bot },
    },
  },

  // Jurídico e Advocacia
  legal: {
    order: ["overview", "comercial", "crm", "logistica", "atendimento", "catalogo", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Pauta", shortLabel: "Painel", description: "Visão da banca, prazos críticos e tarefas jurídicas" },
      comercial: { label: "Processos", shortLabel: "Processos", description: "Processos, casos consultivos, licitações e contratos", icon: Scale },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Base de clientes, partes contrárias, advogados e contatos", icon: Users },
      logistica: { label: "Prazos", shortLabel: "Prazos", description: "Audiências, diligências, prazos processuais e intimações", icon: Calendar },
      atendimento: { label: "Assistidos", shortLabel: "Atendimento", description: "Atendimento jurídico, propostas de honorários e termos", icon: MessageSquare },
      catalogo: { label: "Acervo", shortLabel: "Acervo", description: "Áreas de atuação, peças, pareceres e portal", icon: FileText },
      financeiro: { label: "Honorários", shortLabel: "Honorários", description: "Honorários contratuais, custas e fiscal", icon: Banknote },
      rh: { label: "Advogados", shortLabel: "Advogados", description: "Sócios, associados, correspondentes e rateio", icon: Briefcase },
      suporte: { label: "Compliance", shortLabel: "Compliance", description: "Governança, sigilo profissional, ética e auditoria", icon: ShieldCheck },
      inteligencia: { label: "Jurimetria", shortLabel: "Jurimetria", description: "Assessor jurídico, análise de peças e jurisprudência", icon: Bot },
    },
  },

  // Imobiliário
  real_estate: {
    order: ["overview", "catalogo", "comercial", "crm", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Carteira", shortLabel: "Painel", description: "Volume de vendas, locações ativas e visitas do dia" },
      catalogo: { label: "Imóveis", shortLabel: "Imóveis", description: "Imóveis para venda e locação, chaves e vitrine", icon: Building2 },
      comercial: { label: "Propostas", shortLabel: "Comercial", description: "Funil de visitas, propostas, captação e contratos", icon: Kanban },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Compradores, proprietários, locatários e fiadores", icon: Users },
      logistica: { label: "Vistorias", shortLabel: "Vistorias", description: "Laudos de vistoria, reparos, ordens de serviço e agenda", icon: Wrench },
      atendimento: { label: "Proprietários", shortLabel: "Atendimento", description: "Inquilinos, proprietários, interessados e WhatsApp", icon: MessageSquare },
      financeiro: { label: "Repasses", shortLabel: "Repasses", description: "Aluguéis, repasses a proprietários e comissões", icon: Banknote },
      rh: { label: "Corretores", shortLabel: "Corretores", description: "Equipe de corretores, plantões e rateio", icon: Users },
      suporte: { label: "Garantias", shortLabel: "Garantias", description: "Análise de crédito, fiança, aditivos e conformidade", icon: ShieldCheck },
    },
  },

  // Locação de Bens, Espaços e Temporada
  rental: {
    order: ["overview", "catalogo", "comercial", "crm", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Ocupação", shortLabel: "Painel", description: "Taxa de ocupação, retiradas e devoluções de hoje" },
      catalogo: { label: "Acervo", shortLabel: "Acervo", description: "Itens para locação, espaços, calendário e tabelas", icon: Building2 },
      comercial: { label: "Reservas", shortLabel: "Reservas", description: "Orçamentos, reservas, caução e contratos", icon: Calendar },
      crm: { label: "Locatários", shortLabel: "Clientes", description: "Base de clientes, contratos e histórico de locações", icon: Users },
      logistica: { label: "Vistorias", shortLabel: "Vistorias", description: "Entrega e devolução de equipamentos, laudos e manutenção", icon: Wrench },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Suporte ao locatário, WhatsApp e avaliações", icon: MessageSquare },
      financeiro: { label: "Cauções", shortLabel: "Financeiro", description: "Faturamento de diárias, garantias, caixa e recibos", icon: Banknote },
    },
  },

  // Supermercado e Hortifruti
  supermarket: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Caixa", shortLabel: "Caixa", description: "Caixas rápidos, pedidos online, pesagem e separação", icon: ShoppingCart },
      crm: { label: "Clube", shortLabel: "Clientes", description: "Base de clientes do clube de descontos e fidelidade", icon: Users },
      catalogo: { label: "Gôndolas", shortLabel: "Gôndolas", description: "Produtos, perecíveis, controle de validade e tabloides", icon: Package },
      logistica: { label: "Entregas", shortLabel: "Entregas", description: "Separação de pedidos, romaneio e entregadores", icon: Truck },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Fechamento de caixas, notas fiscais, DRE e fornecedores", icon: Banknote },
    },
  },

  // Farmácia e Drogaria
  pharmacy: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Balcão", shortLabel: "Balcão", description: "Frente de caixa farmacêutico, retenção de receitas e pedidos", icon: HeartPulse },
      crm: { label: "Pacientes", shortLabel: "Clientes", description: "Base de pacientes, fidelidade e receituários contínuos", icon: Users },
      catalogo: { label: "Medicamentos", shortLabel: "Farmácia", description: "Princípios ativos, psicotrópicos, validade e perfumaria", icon: Package },
      logistica: { label: "Entregas", shortLabel: "Entrega", description: "Despacho rápido de medicamentos, motoboys e reposição", icon: Truck },
      suporte: { label: "Conformidade", shortLabel: "Conformidade", description: "Rastreabilidade sanitária, farmacovigilância e suporte", icon: ShieldCheck },
    },
  },

  // Atacado e Distribuidora
  wholesale: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Atacado", shortLabel: "Vendas", description: "Pedidos em lote, carteira empresarial, orçamentos e licitações", icon: Briefcase },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Compradores corporativos, limites de crédito e contatos", icon: Users },
      catalogo: { label: "Tabelas", shortLabel: "Atacado", description: "Tabelas escalonadas por volume, caixas e estoque", icon: Boxes },
      logistica: { label: "Cargas", shortLabel: "Cargas", description: "Separação, cubagem, manifesto de carga e transportadoras", icon: Truck },
      financeiro: { label: "Faturamento", shortLabel: "Faturamento", description: "Análise de crédito, faturas, notas em lote e DRE", icon: Banknote },
      rh: { label: "Representantes", shortLabel: "Equipe", description: "Representantes comerciais, metas regionais e comissões", icon: Users },
    },
  },

  // Automotivo, Veículos e Mobilidade
  vehicles: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Pátio", shortLabel: "Painel", description: "Giro de pátio, ordens em andamento e indicadores" },
      comercial: { label: "Vendas", shortLabel: "Comercial", description: "Negociações, avaliação de troca, financiamento e contratos", icon: Car },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Proprietários, compradores e interessados em veículos", icon: Users },
      catalogo: { label: "Veículos", shortLabel: "Pátio", description: "Veículos em estoque, autopeças, vistorias e classificados", icon: Package },
      logistica: { label: "Frota", shortLabel: "Frota", description: "Movimentação de frota, condutores, preparação e entrega", icon: Truck },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Fluxo de caixa, consignados, repasses e notas", icon: Banknote },
      rh: { label: "Consultores", shortLabel: "Equipe", description: "Vendedores, técnicos, comissões e escala", icon: Users },
    },
  },

  // Assistência Técnica e Oficina
  tech_repair: {
    order: ["overview", "logistica", "comercial", "crm", "catalogo", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Bancada", shortLabel: "Bancada", description: "Fila de bancada, prazos de reparo e metas técnicas" },
      logistica: { label: "Ordens de Serviço", shortLabel: "Ordens", description: "Abertura de ordens, checklists de entrada, laudos e status", icon: Wrench },
      comercial: { label: "Orçamentos", shortLabel: "Orçamentos", description: "Aprovação de orçamentos, venda de acessórios e caixa", icon: FileSpreadsheet },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Proprietários de aparelhos, empresas conveniadas e contatos", icon: Users },
      catalogo: { label: "Peças", shortLabel: "Peças", description: "Tabela de mão de obra, estoque de peças e garantias", icon: Boxes },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Avisos de aparelho pronto, atendimento e pós-reparo", icon: MessageSquare },
      suporte: { label: "Garantias", shortLabel: "Garantias", description: "Retornos em garantia, controle de qualidade e termos", icon: ShieldCheck },
    },
  },

  // Pet Shop e Clínica Veterinária
  pet: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Mapa de banho e tosa, consultas veterinárias e caixa", icon: Dog },
      crm: { label: "Tutores", shortLabel: "Tutores", description: "Base de tutores, múltiplos pets e preferências", icon: Users },
      catalogo: { label: "Pet Shop", shortLabel: "Pet Shop", description: "Rações, medicamentos, clubes de banho e prontuários", icon: Package },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Ficha dos pets, carteira de vacinação e WhatsApp", icon: MessageSquare },
      rh: { label: "Veterinários", shortLabel: "Equipe", description: "Banhistas, tosadores, veterinários e comissões", icon: Users },
      logistica: { label: "Entregas", shortLabel: "Entregas", description: "Busca e entrega de pets, rotas e reposição de estoque", icon: Truck },
    },
  },

  // Eventos, Ingressos e Produções
  events: {
    order: ["overview", "eventos", "comercial", "crm", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      eventos: { label: "Eventos", shortLabel: "Eventos", description: "Gestão de eventos, ingressos e bilheteria", icon: Ticket },
      comercial: { label: "Bilheteria", shortLabel: "Bilheteria", description: "Venda de ingressos, virada de lotes, listas e mesas", icon: Ticket },
      crm: { label: "Participantes", shortLabel: "Clientes", description: "Base de compradores de ingressos e público", icon: Users },
      catalogo: { label: "Atrações", shortLabel: "Atrações", description: "Programação, páginas de evento, patrocinadores e cupons", icon: Calendar },
      logistica: { label: "Portaria", shortLabel: "Portaria", description: "Validação de entrada, credenciamento e fornecedores", icon: UserCheck },
      financeiro: { label: "Borderô", shortLabel: "Borderô", description: "Fechamento de borderô, repasses de bilheteria, bar e DRE", icon: Banknote },
      rh: { label: "Equipe", shortLabel: "Equipe", description: "Comissões de divulgadores, produtores e escala", icon: Users },
    },
  },

  // Automotivo e Oficina Mecânica Especializada
  automotive: {
    order: ["overview", "comercial", "crm", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Pátio", shortLabel: "Painel", description: "Boxes em atendimento, ordens abertas e metas" },
      comercial: { label: "Oficina", shortLabel: "Oficina", description: "Ordens de serviço, checklists, orçamentos e caixa", icon: Wrench },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Cadastro de clientes, placas e histórico de revisões", icon: Users },
      catalogo: { label: "Peças", shortLabel: "Peças", description: "Autopeças, óleos, kits de revisão e mão de obra", icon: Package },
      financeiro: { label: "Financeiro", shortLabel: "Financeiro", description: "Caixa, recebíveis, comissões e notas fiscais", icon: Banknote },
      rh: { label: "Mecânicos", shortLabel: "Mecânicos", description: "Técnicos, produtividade por box e comissões", icon: Users },
    },
  },

  // Salões de Beleza
  beauty_salon: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Recepção", shortLabel: "Painel", description: "Ocupação dos profissionais, retornos e faturamento" },
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Agendamentos, fila de atendimento e comandas", icon: Calendar },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Fórmulas químicas, alergias e alertas de retoque", icon: Users },
      catalogo: { label: "Serviços", shortLabel: "Serviços", description: "Cortes, coloração, mechas, pacotes e revenda", icon: HeartPulse },
      rh: { label: "Profissionais", shortLabel: "Equipe", description: "Especialistas, rateio e comissões", icon: Users },
    },
  },

  // Barbearia
  barbershop: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Cadeira", shortLabel: "Painel", description: "Ocupação diária dos barbeiros, clubes e comandas" },
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Horários por barbeiro, comandas e assinaturas", icon: Calendar },
      crm: { label: "Clientes", shortLabel: "Clientes", description: "Assinantes recorrentes, histórico de cortes e preferências", icon: Users },
      catalogo: { label: "Serviços", shortLabel: "Serviços", description: "Cortes, combos, pomadas e planos recorrentes", icon: Package },
      rh: { label: "Barbeiros", shortLabel: "Barbeiros", description: "Escalas, metas e repasse de comissão por barbeiro", icon: Users },
    },
  },

  // Clínica de Estética
  aesthetics_clinic: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Agendamento de sessões, cabines e planos de tratamento", icon: Calendar },
      crm: { label: "Pacientes", shortLabel: "Pacientes", description: "Fichas clínicas, evolução e termos de consentimento", icon: Users },
      catalogo: { label: "Protocolos", shortLabel: "Protocolos", description: "Protocolos faciais, corporais, sessões e cuidados", icon: HeartPulse },
    },
  },

  // Clínicas Médicas, Odontologia e Psicologia
  healthcare: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Consultas, salas, teleatendimento e confirmações", icon: Calendar },
      crm: { label: "Pacientes", shortLabel: "Pacientes", description: "Prontuário clínico, anamnese e lembretes de retorno", icon: Users },
      catalogo: { label: "Procedimentos", shortLabel: "Procedimentos", description: "Consultas, convênios, procedimentos e pacotes", icon: HeartPulse },
    },
  },
  dental: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Cadeiras odontológicas, retornos e orçamentos", icon: Calendar },
      crm: { label: "Pacientes", shortLabel: "Pacientes", description: "Histórico clínico, planos de tratamento e retornos", icon: Users },
      catalogo: { label: "Tratamentos", shortLabel: "Tratamentos", description: "Procedimentos odontológicos, implantes e ortodontia", icon: HeartPulse },
    },
  },
  psychology: {
    order: ["overview", "comercial", "crm", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda", shortLabel: "Agenda", description: "Sessões recorrentes, teleconsulta e confirmação", icon: Calendar },
      crm: { label: "Pacientes", shortLabel: "Pacientes", description: "Evolução clínica protegida, frequência e contratos", icon: Users },
      catalogo: { label: "Terapias", shortLabel: "Terapias", description: "Atendimento individual, casais e pacotes mensais", icon: HeartPulse },
    },
  },

  // Contabilidade
  accounting: {
    order: ["overview", "financeiro", "comercial", "crm", "atendimento", "catalogo", "rh", "logistica", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel", shortLabel: "Painel", description: "Vencimentos fiscais, solicitações de clientes e equipe" },
      financeiro: { label: "Fiscal", shortLabel: "Contábil", description: "Guias fiscais, notas, honorários mensais e DRE", icon: Calculator },
      comercial: { label: "Demandas", shortLabel: "Demandas", description: "Ordens de serviço contábeis, certidões e contratos", icon: ClipboardList },
      crm: { label: "Empresas", shortLabel: "Empresas", description: "Base de CNPJs atendidos, regimes tributários e contatos", icon: Users },
    },
  },

  // Educação, Cursos e Treinamentos
  education: {
    order: ["overview", "catalogo", "comercial", "crm", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      catalogo: { label: "Cursos", shortLabel: "Cursos", description: "Grade curricular, turmas, aulas, materiais e certificados", icon: GraduationCap },
      comercial: { label: "Matrículas", shortLabel: "Matrículas", description: "Funil de matrículas, bolsas, propostas e contratos", icon: Kanban },
      crm: { label: "Alunos", shortLabel: "Alunos", description: "Base de alunos matriculados, responsáveis e histórico", icon: Users },
      atendimento: { label: "Secretaria", shortLabel: "Secretaria", description: "Atendimento ao aluno, comunicados e avaliações", icon: MessageSquare },
      rh: { label: "Docentes", shortLabel: "Docentes", description: "Corpo docente, hora-aula, ponto e repasses", icon: Users },
      financeiro: { label: "Mensalidades", shortLabel: "Mensalidades", description: "Carnês, recorrência, inadimplência e caixa", icon: Banknote },
    },
  },

  // Portal de Notícias e Mídia
  news: {
    order: ["overview", "catalogo", "comercial", "crm", "atendimento", "inteligencia", "financeiro", "rh", "logistica", "suporte", "configuracoes"],
    overrides: {
      catalogo: { label: "Redação", shortLabel: "Redação", description: "Matérias, editorias, colunistas, stories e capa do portal", icon: Newspaper },
      comercial: { label: "Publicidade", shortLabel: "Publicidade", description: "Venda de espaços publicitários, propostas e contratos", icon: Megaphone },
      crm: { label: "Assinantes", shortLabel: "Assinantes", description: "Base de assinantes do portal, anunciantes e parceiros", icon: Users },
      atendimento: { label: "Leitores", shortLabel: "Atendimento", description: "Comentários, denúncias, boletins e WhatsApp", icon: MessageSquare },
      rh: { label: "Redatores", shortLabel: "Redatores", description: "Equipe editorial, colaboradores, pautas e pagamentos", icon: Users },
    },
  },

  // Recrutamento e Empregos
  jobs: {
    order: ["overview", "rh", "comercial", "crm", "atendimento", "catalogo", "financeiro", "logistica", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      rh: { label: "Vagas", shortLabel: "Vagas", description: "Pipeline de candidatos, vagas abertas e entrevistas", icon: Briefcase },
      comercial: { label: "Empresas", shortLabel: "Empresas", description: "Prospecção empresarial, propostas e contratos", icon: Kanban },
      crm: { label: "Candidatos", shortLabel: "Contatos", description: "Empresas contratantes e banco de talentos", icon: Users },
      atendimento: { label: "Atendimento", shortLabel: "Atendimento", description: "Comunicação com candidatos, talentos e WhatsApp", icon: MessageSquare },
      catalogo: { label: "Carreiras", shortLabel: "Portal", description: "Página de carreiras, pacotes e divulgação", icon: Globe },
      financeiro: { label: "Honorários", shortLabel: "Financeiro", description: "Faturamento de vagas fechadas e folha", icon: Banknote },
    },
  },
};

function inferNicheForPillars(groups: NavGroup[], storeDataOrNiche?: any): string {
  const SPECIALIZED_PILLAR_KEYS = new Set([
    "automotive",
    "accounting",
    "beauty_salon",
    "barbershop",
    "aesthetics_clinic",
    "healthcare",
    "dental",
    "psychology",
  ]);
  if (storeDataOrNiche) {
    const rawObj =
      typeof storeDataOrNiche === "string"
        ? { niche: storeDataOrNiche, segment: storeDataOrNiche }
        : storeDataOrNiche;
    const unified = resolveUnifiedNicheId(rawObj);
    if (SPECIALIZED_PILLAR_KEYS.has(unified) && NICHE_MASTER_PILLAR_CONFIG[unified]) {
      return unified;
    }
    return getNicheSemantics(rawObj).nicheId;
  }

  const groupIds = new Set(groups.map((g) => g.id));
  if (groupIds.has("automotive-workshop")) return "automotive";
  if (groupIds.has("accounting")) return "accounting";
  if (groupIds.has("gastro-orders") || groupIds.has("gastro-catalog")) return "gastronomy";
  if (groupIds.has("tourism-commercial") || groupIds.has("tourism-trips")) return "tourism";
  if (groupIds.has("services-agenda") || groupIds.has("services-catalog")) return "services";
  if (groupIds.has("legal")) return "legal";
  if (groupIds.has("real-estate")) return "real_estate";
  if (groupIds.has("rental-events")) return "rental";
  if (groupIds.has("supermarket")) return "supermarket";
  if (groupIds.has("pharmacy")) return "pharmacy";
  if (groupIds.has("wholesale")) return "wholesale";
  if (groupIds.has("vehicles")) return "vehicles";
  if (groupIds.has("tech-repair")) return "tech_repair";
  if (groupIds.has("pet")) return "pet";
  if (groupIds.has("events-tickets")) return "events";
  if (groupIds.has("education")) return "education";
  if (groupIds.has("news")) return "news";
  if (groupIds.has("jobs") && !groupIds.has("retail-catalog")) return "jobs";
  return "retail";
}

export function getMasterSidebarPillars(
  groups: NavGroup[],
  storeDataOrNiche?: any
): MasterPillar[] {
  if (!groups || groups.length === 0) return [];

  const nicheId = inferNicheForPillars(groups, storeDataOrNiche);
  const nicheConfig = NICHE_MASTER_PILLAR_CONFIG[nicheId];
  const manifest = getNicheManifest(nicheId);
  const isMasterMode =
    storeDataOrNiche?.isMasterMode === true ||
    (groups.some((g) => g.id.startsWith("tourism-")) &&
      groups.some((g) => g.id === "gastro-orders" || g.id === "gastro-catalog"));

  const filteredInputGroups = isMasterMode
    ? groups
    : groups
        .filter((g) => {
          if ((g.id === "gastro-orders" || g.id === "gastro-catalog") && nicheId !== "gastronomy") return false;
          if (g.id.startsWith("tourism-") && nicheId !== "tourism") return false;
          return true;
        })
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => {
            const matchedModule = Object.entries(PATH_TO_NICHE_MODULE).find(([prefix]) =>
              item.path.startsWith(prefix)
            )?.[1];
            if (matchedModule && manifest.activeModules && !manifest.activeModules.includes(matchedModule)) {
              return false;
            }
            return true;
          }),
        }))
        .filter((g) => g.items.length > 0);

  const orderedDefinitions: MasterPillarDefinition[] = (() => {
    const baseWithOverrides = MASTER_PILLAR_DEFINITIONS.map((def) => {
      const ov = nicheConfig?.overrides?.[def.id];
      return ov ? { ...def, ...ov } : def;
    });

    if (!nicheConfig?.order || nicheConfig.order.length === 0) {
      return baseWithOverrides;
    }

    const orderMap = new Map(nicheConfig.order.map((id, idx) => [id, idx]));
    return [...baseWithOverrides].sort((a, b) => {
      const idxA = orderMap.get(a.id) ?? 999;
      const idxB = orderMap.get(b.id) ?? 999;
      return idxA - idxB;
    });
  })();

  const assignedGroupIds = new Set<string>();
  const pillars: MasterPillar[] = [];

  for (const def of orderedDefinitions) {
    const matchedGroups = filteredInputGroups.filter((g) => def.groupIds.includes(g.id));
    for (const mg of matchedGroups) {
      assignedGroupIds.add(mg.id);
    }

    const dedupedItems: NavItem[] = [];
    const seenPaths = new Set<string>();
    for (const mg of matchedGroups) {
      for (const item of mg.items) {
        if (!seenPaths.has(item.path)) {
          seenPaths.add(item.path);
          dedupedItems.push(item);
        }
      }
    }

    if (dedupedItems.length > 0) {
      pillars.push({
        id: def.id,
        label: def.label,
        shortLabel: def.shortLabel,
        description: def.description,
        icon: def.icon,
        defaultPath: dedupedItems[0].path,
        groups: matchedGroups,
        items: dedupedItems,
      });
    }
  }

  // Caso algum grupo dinâmico não esteja mapeado, anexa no pilar Comercial/Operações para nunca ocultar submódulos
  const leftoverGroups = filteredInputGroups.filter((g) => !assignedGroupIds.has(g.id) && g.items.length > 0);
  if (leftoverGroups.length > 0) {
    const targetPillar = pillars.find((p) => p.id === "comercial") || pillars[0];
    if (targetPillar) {
      targetPillar.groups.push(...leftoverGroups);
      const seenPaths = new Set(targetPillar.items.map((i) => i.path));
      for (const lg of leftoverGroups) {
        for (const item of lg.items) {
          if (!seenPaths.has(item.path)) {
            seenPaths.add(item.path);
            targetPillar.items.push(item);
          }
        }
      }
    }
  }

  return pillars;
}


