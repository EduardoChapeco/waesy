import { Package, Tags, Tag, Store, LayoutDashboard, Settings, Calendar, Users, ShoppingBag, Truck, Boxes, Banknote, FileText, LayoutTemplate, Link2, Image as ImageIcon, ClipboardList, ShieldAlert, Megaphone, Share2, Star, Bell, Flame, Kanban, Newspaper, Plus, Sliders, DollarSign, Ticket, ArrowRightLeft, Building2, ShieldCheck, UtensilsCrossed, ChefHat, Coins, Zap, MessageSquare, Scale, Wrench, MapPin, Palette, Target, LayoutGrid, Navigation, Briefcase, Plane, ShoppingCart, Eye, Receipt, AlertTriangle, RefreshCw, ArrowDownUp, Clock, Car, Smartphone, Layers, HeartPulse, GraduationCap, Dog, CarFront, PenTool, Layers2, FileSpreadsheet, Gift, Globe, Bus, Award, Bot, LifeBuoy, Compass, UserCheck, Lock, HandHeart, Database, Calculator } from "lucide-react";

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
    { path: "/workspace/viabilidade", label: "Viabilidade", icon: Compass },
    { path: "/workspace/marketing/brand-kit", label: "Brand Kit", icon: Palette },
    { path: "/workspace/marketing/canvas-bmc", label: "Modelo BMC", icon: LayoutGrid },
    { path: "/workspace/marketing/swot", label: "Matriz SWOT", icon: Compass },
    { path: "/workspace/marketing/canvas-pecados", label: "7 Pecados", icon: Flame },
    { path: "/workspace/simlab/focus-group", label: "SimLab", icon: Users },
    { path: "/workspace/inteligencia/radar", label: "Radar", icon: Target },
    { path: "/workspace/mining", label: "Importações", icon: Database },
    { path: "/workspace/conteudo/receitas", label: "Receitas", icon: ChefHat },
    { path: "/workspace/simulacao", label: "Simulações", icon: Sliders },
    { path: "/workspace/onboarding/revisao", label: "Catálogo Mestre", icon: Layers },
    { path: "/workspace/design-system", label: "Design System", icon: Palette },
  ],
};

const GROUP_MASTER_INBOX: NavGroup = {
  id: "master-inbox",
  label: "Atendimento",
  icon: MessageSquare,
  section: "master",
  items: [
    { path: "/workspace/atendimento", label: "Conversas", icon: MessageSquare },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
    { path: "/workspace/avaliacoes", label: "Avaliações", icon: Star },
    { path: "/workspace/notificacoes", label: "Notificações", icon: Bell },
    { path: "/workspace/suporte", label: "Suporte", icon: LifeBuoy },
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
    { path: "/workspace/pedidos/gestor", label: "Gestor KDS", icon: ClipboardList },
    { path: "/workspace/pdv/comandas", label: "Mesas", icon: UtensilsCrossed },
    { path: "/workspace/pdv/cozinha", label: "Cozinha", icon: ChefHat },
    { path: "/workspace/relatorios/gastronomia", label: "Tempo de Preparo", icon: Clock },
    { path: "/workspace/reservas", label: "Reservas", icon: Calendar },
    { path: "/workspace/pedidos", label: "Histórico", icon: ShoppingBag },
    { path: "/workspace/pdv", label: "PDV", icon: Store },
    { path: "/workspace/pedidos/frota", label: "Despacho", icon: Truck },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
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
    { path: "/workspace/pedidos", label: "Pedidos", icon: ShoppingBag },
    { path: "/workspace/pedidos/gestor", label: "Gestor", icon: ClipboardList },
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/pedidos/gestor", label: "Montagens", icon: ClipboardList },
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
    { path: "/workspace/pedidos/gestor", label: "Ordens de Serviço", icon: ClipboardList },
    { path: "/workspace/agenda/servicos", label: "Mão de Obra", icon: Wrench },
    { path: "/workspace/catalogo/produtos", label: "Peças", icon: Package },
    { path: "/workspace/pdv", label: "PDV", icon: Store },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
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
  label: "Vendas & Atendimento",
  icon: Kanban,
  section: "niche",
  items: [
    { path: "/workspace/turismo", label: "Atendimento", icon: Kanban },
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
    { path: "/workspace/clientes", label: "Passageiros", icon: Users },
    { path: "/workspace/turismo/vistos", label: "Vistos", icon: Globe },
    { path: "/workspace/turismo/documentos-ocr", label: "Documentos", icon: FileText },
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
    { path: "/workspace/clientes", label: "Participantes", icon: Users },
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
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/pedidos/gestor", label: "Separação", icon: ClipboardList },
    { path: "/workspace/pedidos/frota", label: "Entregas", icon: Truck },
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/pedidos/gestor", label: "Receituários", icon: ClipboardList },
    { path: "/workspace/pedidos/frota", label: "Tele-Entrega", icon: Truck },
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/b2b", label: "Central B2B (CNPJ)", icon: Building2 },
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
    { path: "/workspace/pdv", label: "PDV", icon: Store },
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
    { path: "/workspace/estudio", label: "Estúdio Criativo", icon: Palette },
    { path: "/workspace/marketing/brand-kit", label: "Brand Kit", icon: Palette },
    { path: "/workspace/marketing/canvas-bmc", label: "Modelo BMC", icon: LayoutDashboard },
    { path: "/workspace/marketing/swot", label: "Matriz SWOT", icon: Compass },
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
    { path: "/workspace/master/influencers", label: "Influenciadores", icon: Users },
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
    { path: "/workspace/afiliados/conciliacao", label: "Conciliação Afiliados", icon: Receipt },
    { path: "/workspace/tokens", label: "Tokens", icon: Coins },
    { path: "/workspace/financeiro/funcionarios", label: "Folha", icon: Users },
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
    { path: "/workspace/licitacoes", label: "Licitações B2G", icon: Scale },
  ],
};

const GROUP_TEAM_RH: NavGroup = {
  id: "team-rh",
  label: "Equipe",
  icon: Users,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes/equipe", label: "Colaboradores", icon: Users },
    { path: "/workspace/rh/ponto", label: "Ponto", icon: Clock },
    { path: "/workspace/financeiro/comissoes", label: "Comissões", icon: Target },
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
    { path: "/workspace/avaliacoes", label: "Avaliações & NPS", icon: Star },
    { path: "/workspace/pedidos/trocas", label: "Trocas & Garantias", icon: ArrowRightLeft },
    { path: "/workspace/qualidade", label: "Qualidade & SLA", icon: Award },
    { path: "/workspace/notificacoes", label: "Alertas Operacionais", icon: Bell },
  ],
};

const GROUP_GOVERNANCE_AUDIT: NavGroup = {
  id: "governance-audit",
  label: "Conformidade",
  icon: ShieldCheck,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes/conformidade", label: "Marketplace Oficial", icon: ShieldCheck },
    { path: "/workspace/moderacao", label: "Moderação", icon: ShieldAlert },
    { path: "/workspace/moderacao/kyc", label: "Auditoria KYC", icon: ShieldCheck },
    { path: "/workspace/qualidade", label: "Qualidade", icon: Award },
  ],
};

const GROUP_SETTINGS: NavGroup = {
  id: "settings",
  label: "Ajustes",
  icon: Settings,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes", label: "Geral", icon: Settings },
    { path: "/workspace/configuracoes/loja", label: "Perfil da Loja", icon: Store },
    { path: "/workspace/lojas", label: "Minhas Lojas", icon: Building2 },
    { path: "/workspace/configuracoes/conformidade", label: "Marketplace Oficial", icon: ShieldCheck },
    { path: "/workspace/configuracoes/ai", label: "Chaves IA", icon: Zap },
    { path: "/workspace/configuracoes/pwa", label: "Aplicativo PWA", icon: Smartphone },
    { path: "/workspace/configuracoes/privacidade-loja", label: "Privacidade", icon: Lock },
    { path: "/workspace/configuracoes/sessoes", label: "Auditoria", icon: ShieldCheck },
    { path: "/workspace/integracoes/marketplaces", label: "Marketplaces", icon: Globe },
    { path: "/workspace/configuracoes/inteligencia-artificial", label: "Automação", icon: Bot },
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
  let rawGroups: NavGroup[] = [];

  switch (semantics.nicheId) {
    case "tourism":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
        GROUP_MASTER_INBOX,
        GROUP_TURISMO_COMMERCIAL,
        GROUP_TURISMO_OPERATIONS,
        GROUP_TURISMO_BOARDING,
        GROUP_TURISMO_CATALOG,
        GROUP_TURISMO_MARKETING,
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
        GROUP_MASTER_INBOX,
        GROUP_GASTRO_CATALOG,
        GROUP_GASTRO_ORDERS,
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

    case "services":
      rawGroups = [
        GROUP_OVERVIEW,
        GROUP_MASTER_TASKS,
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
  "/workspace/pedidos/mesas": "tables",
  "/workspace/turismo/embarque": "boarding",
  "/workspace/turismo/embarques": "boarding",
  "/workspace/turismo/frota": "fleet",
  "/workspace/turismo/propostas": "proposals",
  "/workspace/turismo/cotacoes": "quotes",
  "/workspace/turismo/contratos": "contracts",
  "/workspace/simlab": "simlab",
  "/workspace/estoque": "inventory",
  "/workspace/tarefas": "tasks",
  "/workspace/entregadores": "couriers",
  "/workspace/pedidos/entregadores": "couriers",
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
      if (group.id.includes("sales") || group.id.includes("orders")) groupLabel = t("orders");

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
          if (item.path === "/workspace/pedidos") label = t("orders");
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
    label: "Painel & Rotina",
    shortLabel: "Painel",
    description: "Visão executiva, tarefas, agenda e indicadores",
    icon: LayoutDashboard,
    groupIds: ["overview", "master-tasks"],
  },
  {
    id: "atendimento",
    label: "Atendimento & SAC",
    shortLabel: "Atendimento",
    description: "Conversas, WhatsApp, clientes e relacionamento",
    icon: MessageSquare,
    groupIds: ["master-inbox", "whatsapp-automations"],
  },
  {
    id: "comercial",
    label: "Vendas & PDV",
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
      "legal",
      "real-estate",
      "events-tickets",
      "vehicles",
      "wholesale",
      "donations-captacao",
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo & Estoque",
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
    label: "Logística & Expedição",
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
    label: "Suporte & Qualidade",
    shortLabel: "Suporte",
    description: "Central de suporte, pós-venda, trocas e conformidade",
    icon: LifeBuoy,
    groupIds: ["support-desk", "governance-audit"],
  },
  {
    id: "financeiro",
    label: "Financeiro & Fiscal",
    shortLabel: "Financeiro",
    description: "Fluxo de caixa, recebíveis, DRE e notas fiscais",
    icon: Banknote,
    groupIds: ["finance", "fiscal-accounting"],
  },
  {
    id: "rh",
    label: "RH & Equipe",
    shortLabel: "RH",
    description: "Colaboradores, ponto, comissões e vagas",
    icon: Users,
    groupIds: ["team-rh", "jobs"],
  },
  {
    id: "inteligencia",
    label: "Inteligência",
    shortLabel: "IA & Dados",
    description: "Agentes autônomos, radar de mercado e simulações",
    icon: Bot,
    groupIds: ["intelligence-squads"],
  },
  {
    id: "configuracoes",
    label: "Configurações",
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
  // Varejo, E-commerce, Supermercado, Farmácia & Atacado (Padrão Mercado Livre / Shopify / VTEX / Bling)
  retail: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Rotina", shortLabel: "Painel", description: "Visão executiva, tarefas, agenda e indicadores" },
      comercial: { label: "Vendas & PDV", shortLabel: "Vendas", description: "Pedidos, frente de caixa, orçamentos, funil B2B e trocas/devoluções", icon: ShoppingBag },
      catalogo: { label: "Catálogo & Estoque", shortLabel: "Catálogo", description: "Produtos, grades, lotes/validade, curva ABC, vitrine e campanhas", icon: Package },
      logistica: { label: "Logística & Expedição", shortLabel: "Logística", description: "Separação, romaneio, fretes, pontos PUDO e frota", icon: Truck },
      atendimento: { label: "Atendimento & SAC", shortLabel: "Atendimento", description: "Conversas, WhatsApp, clientes e relacionamento", icon: MessageSquare },
      suporte: { label: "Qualidade & Pós-Venda", shortLabel: "Suporte", description: "Trocas, garantias, avaliações NPS e conformidade", icon: LifeBuoy },
      financeiro: { label: "Financeiro & Fiscal", shortLabel: "Financeiro", description: "DRE, NF-e/NFC-e, fluxo de caixa e recebíveis", icon: Banknote },
      rh: { label: "RH & Equipe", shortLabel: "RH", description: "Colaboradores, ponto, comissões e recrutamento", icon: Users },
    },
  },

  // Gastronomia & Delivery (Padrão iFood Partner / 99Food / Toast)
  gastronomy: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Turno", shortLabel: "Turno", description: "Visão do turno, metas do dia e rotina da operação" },
      comercial: { label: "Pedidos & KDS", shortLabel: "Pedidos", description: "Gestor de pedidos, monitor KDS, mesas, comandas e PDV", icon: UtensilsCrossed },
      catalogo: { label: "Cardápio & Insumos", shortLabel: "Cardápio", description: "Produtos, complementos, ficha técnica, receitas e estoque", icon: ChefHat },
      logistica: { label: "Despacho & Entregas", shortLabel: "Despacho", description: "Expedição, romaneio, frota e gestão de entregadores", icon: Truck },
      atendimento: { label: "Atendimento & Avaliações", shortLabel: "Atendimento", description: "Chat com clientes, WhatsApp, CRM e avaliações", icon: MessageSquare },
      suporte: { label: "Promoções & Qualidade", shortLabel: "Qualidade", description: "Ocorrências de pedidos, auditoria sanitária e suporte", icon: Award },
      financeiro: { label: "Financeiro & Repasses", shortLabel: "Financeiro", description: "Caixa do turno, repasses, DRE e emissão fiscal NFC-e", icon: Banknote },
      rh: { label: "Equipe & Motoboys", shortLabel: "Equipe", description: "Cozinha, garçons, entregadores, escalas e comissões", icon: Users },
    },
  },

  // Beleza, Estética, Bem-Estar & Clínicas (Padrão Belasis / Avec / Trinks / Doctoralia)
  services: {
    order: ["overview", "comercial", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Recepção", shortLabel: "Painel", description: "Indicadores diários, ocupação da agenda e tarefas" },
      comercial: { label: "Agenda & Recepção", shortLabel: "Agenda", description: "Mapa de horários, fila de espera, salas e comandas/PDV", icon: Calendar },
      catalogo: { label: "Pacotes & Serviços", shortLabel: "Serviços", description: "Procedimentos, pacotes de sessões, anamnese e vitrine", icon: HeartPulse },
      atendimento: { label: "Clientes & Fidelidade", shortLabel: "Clientes", description: "CRM, lembretes de retorno, WhatsApp e avaliações", icon: MessageSquare },
      rh: { label: "Profissionais & Comissões", shortLabel: "Equipe", description: "Especialistas, escalas de atendimento, rateio e RH", icon: Users },
      logistica: { label: "Estoque & Insumos", shortLabel: "Insumos", description: "Consumo técnico por atendimento, revenda e compras", icon: Boxes },
      financeiro: { label: "Financeiro & Fiscal", shortLabel: "Financeiro", description: "Caixa, repasse de comissões, recebíveis e NFS-e", icon: Banknote },
      suporte: { label: "Pós-Venda & Termos", shortLabel: "Pós-Venda", description: "Satisfação, termos LGPD, contratos e suporte", icon: ShieldCheck },
    },
  },

  // Turismo, Agências & Operadoras (Padrão Cadastur / Sabre / Schultz / Monde)
  tourism: {
    order: ["overview", "comercial", "logistica", "catalogo", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Operação", shortLabel: "Painel", description: "Radar executivo, próximas saídas e tarefas da agência" },
      comercial: { label: "Comercial & Cotação", shortLabel: "Cotação", description: "Funil CRM, oportunidades, propostas Studio, cotações e aéreo", icon: Compass },
      logistica: { label: "Operações & Embarques", shortLabel: "Embarques", description: "Viagens/saídas, rooming list, check-in QR, vouchers e frota", icon: Bus },
      catalogo: { label: "Catálogo & Tarifários", shortLabel: "Roteiros", description: "Roteiros, pacotes, hotéis, receptivos, fornecedores e contratos", icon: Plane },
      atendimento: { label: "Atendimento & Pós-Venda", shortLabel: "Atendimento", description: "Inbox viajantes, WhatsApp, passageiros e avaliações", icon: MessageSquare },
      suporte: { label: "SAC & Reacomodação", shortLabel: "SAC", description: "Incidentes em viagens, reacomodação, assessoria de vistos e LGPD", icon: LifeBuoy },
      financeiro: { label: "Financeiro & Câmbio", shortLabel: "Financeiro", description: "Fluxo de caixa, comissões, bilhetagem, borderô e fiscal", icon: Banknote },
      rh: { label: "Equipe & Guias", shortLabel: "Guias & RH", description: "Agentes de viagem, guias credenciados, motoristas e comissões", icon: Users },
      inteligencia: { label: "Inteligência & Radar", shortLabel: "IA & Radar", description: "Radar turístico, OCR de passaportes e Squads IA", icon: Bot },
    },
  },

  // Jurídico & Advocacia (Padrão Astrea / Jusbrasil / Projuris)
  legal: {
    order: ["overview", "comercial", "logistica", "atendimento", "catalogo", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Pauta", shortLabel: "Painel", description: "Visão da banca, prazos críticos e tarefas jurídicas" },
      comercial: { label: "Processos & Casos", shortLabel: "Processos", description: "Processos JUS, casos consultivos, licitações e contratos", icon: Scale },
      logistica: { label: "Agenda & Prazos", shortLabel: "Prazos", description: "Audiências, diligências, prazos processuais e intimações", icon: Calendar },
      atendimento: { label: "Clientes & Assistidos", shortLabel: "Clientes", description: "Atendimento jurídico, propostas de honorários, NDAs e LGPD", icon: MessageSquare },
      catalogo: { label: "Acervo & Minutas", shortLabel: "Acervo", description: "Áreas de atuação, peças, pareceres e portal institucional", icon: FileText },
      financeiro: { label: "Honorários & Financeiro", shortLabel: "Honorários", description: "Honorários contratuais/sucumbenciais, custas e fiscal", icon: Banknote },
      rh: { label: "Equipe & Correspondentes", shortLabel: "Advogados", description: "Sócios, advogados associados, correspondentes e rateio", icon: Briefcase },
      suporte: { label: "Compliance & Sigilo", shortLabel: "Compliance", description: "Governança, sigilo profissional, ética OAB e auditoria", icon: ShieldCheck },
      inteligencia: { label: "Jurimetria & IA", shortLabel: "IA Jurídica", description: "Assessor jurídico IA, análise de peças e jurisprudência", icon: Bot },
    },
  },

  // Imobiliário (Padrão QuintoAndar / Kenlo / Loft)
  real_estate: {
    order: ["overview", "catalogo", "comercial", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Carteira", shortLabel: "Painel", description: "VGV, locações ativas, visitas do dia e tarefas" },
      catalogo: { label: "Carteira de Imóveis", shortLabel: "Imóveis", description: "Imóveis para venda/locação, controle de chaves e vitrine", icon: Building2 },
      comercial: { label: "Comercial & Propostas", shortLabel: "Comercial", description: "Funil de visitas, propostas, captação e contratos digitais", icon: Kanban },
      logistica: { label: "Vistorias & Manutenções", shortLabel: "Vistorias", description: "Laudos de vistoria, reparos, ordens de serviço e agenda", icon: Wrench },
      atendimento: { label: "Atendimento & Proprietários", shortLabel: "Atendimento", description: "Inquilinos, proprietários, interessados e WhatsApp", icon: MessageSquare },
      financeiro: { label: "Financeiro & Repasses", shortLabel: "Repasses", description: "Aluguéis, repasses a proprietários, comissões e DIMOB", icon: Banknote },
      rh: { label: "Corretores & Comissões", shortLabel: "Corretores", description: "Equipe de corretores, plantões, CRECI e rateio", icon: Users },
      suporte: { label: "Garantias & Jurídico", shortLabel: "Garantias", description: "Análise de crédito, fiança, aditivos e conformidade", icon: ShieldCheck },
    },
  },

  // Locação de Bens, Espaços & Temporada
  rental: {
    order: ["overview", "catalogo", "comercial", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Ocupação", shortLabel: "Painel", description: "Taxa de ocupação, retiradas/devoluções de hoje e rotina" },
      catalogo: { label: "Acervo & Disponibilidade", shortLabel: "Acervo", description: "Itens para locação, espaços, calendário e tabelas", icon: Building2 },
      comercial: { label: "Reservas & Contratos", shortLabel: "Reservas", description: "Orçamentos, reservas, caução e contratos de locação", icon: Calendar },
      logistica: { label: "Check-in, Retirada & Vistoria", shortLabel: "Vistorias", description: "Entrega/devolução de equipamentos, laudos e manutenção", icon: Wrench },
      atendimento: { label: "Locatários & Atendimento", shortLabel: "Clientes", description: "Suporte ao locatário, WhatsApp e avaliações", icon: MessageSquare },
      financeiro: { label: "Financeiro & Cauções", shortLabel: "Financeiro", description: "Faturamento de diárias, garantias, caixa e recibos", icon: Banknote },
    },
  },

  // Supermercado & Hortifruti
  supermarket: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Frente de Caixa & Pedidos", shortLabel: "PDV & Vendas", description: "Caixas rápidos, pedidos online, pesagem e separação", icon: ShoppingCart },
      catalogo: { label: "Gôndolas, Lotes & Encartes", shortLabel: "Gôndolas", description: "Produtos, perecíveis, controle de validade e tabloides", icon: Package },
      logistica: { label: "Expedição & Entregas", shortLabel: "Entregas", description: "Picking de supermercado, romaneio e entregadores", icon: Truck },
      financeiro: { label: "Financeiro & Fiscal", shortLabel: "Financeiro", description: "Fechamento de caixas, NFC-e/NF-e, DRE e fornecedores", icon: Banknote },
    },
  },

  // Farmácia & Drogaria
  pharmacy: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "suporte", "financeiro", "rh", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Balcão, Receitas & PDV", shortLabel: "Balcão", description: "Frente de caixa farmacêutico, retenção de receitas e pedidos", icon: HeartPulse },
      catalogo: { label: "Medicamentos & Lotes", shortLabel: "Farmácia", description: "Princípios ativos, psicotrópicos, lotes/validade e perfumaria", icon: Package },
      logistica: { label: "Tele-Entrega & Estoque", shortLabel: "Entrega", description: "Despacho rápido de medicamentos, motoboys e reposição", icon: Truck },
      suporte: { label: "Anvisa, SNGPC & Qualidade", shortLabel: "Conformidade", description: "Rastreabilidade sanitária, farmacovigilância e pós-venda", icon: ShieldCheck },
    },
  },

  // Atacado & Distribuidora B2B
  wholesale: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Comercial B2B & Cotações", shortLabel: "Vendas B2B", description: "Pedidos em lote, carteira B2B, orçamentos e licitações", icon: Briefcase },
      catalogo: { label: "Tabelas, Grades & Atacado", shortLabel: "Atacado", description: "Tabelas escalonadas por volume, caixas master e estoque", icon: Boxes },
      logistica: { label: "Romaneio, Cargas & Frota", shortLabel: "Cargas", description: "Separação WMS, cubagem, manifesto de carga e transportadoras", icon: Truck },
      financeiro: { label: "Faturamento, Boletos & NF-e", shortLabel: "Faturamento", description: "Análise de crédito B2B, faturas, NF-e em lote e DRE", icon: Banknote },
      rh: { label: "Representantes & Comissões", shortLabel: "RCA & Equipe", description: "Representantes comerciais, metas regionais e comissões", icon: Users },
    },
  },

  // Automotivo, Veículos & Mobilidade
  vehicles: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Pátio", shortLabel: "Painel", description: "Giro de pátio, OS em andamento e indicadores" },
      comercial: { label: "Vendas, Propostas & OS", shortLabel: "Comercial", description: "Negociações, avaliação de troca, financiamento e contratos", icon: Car },
      catalogo: { label: "Estoque de Veículos & Peças", shortLabel: "Pátio", description: "Veículos em estoque, autopeças, vistorias e classificados", icon: Package },
      logistica: { label: "Frota, Despacho & Revisões", shortLabel: "Frota", description: "Movimentação de frota, condutores, preparação e entrega", icon: Truck },
      financeiro: { label: "Financeiro & Repasses", shortLabel: "Financeiro", description: "Fluxo de caixa, consignados, repasses, NF-e e DRE", icon: Banknote },
      rh: { label: "Consultores & Mecânicos", shortLabel: "Equipe", description: "Vendedores, técnicos, comissões e escala", icon: Users },
    },
  },

  // Assistência Técnica & Oficina
  tech_repair: {
    order: ["overview", "logistica", "comercial", "catalogo", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      overview: { label: "Painel & Bancada", shortLabel: "Bancada", description: "Fila de bancada, SLA de reparos e metas técnicas" },
      logistica: { label: "Ordens de Serviço & Bancada", shortLabel: "OS & Reparo", description: "Abertura de OS, checklists de entrada, laudos e status", icon: Wrench },
      comercial: { label: "Orçamentos & Balcão PDV", shortLabel: "Orçamentos", description: "Aprovação de orçamentos, venda de acessórios e frente de caixa", icon: FileSpreadsheet },
      catalogo: { label: "Peças, Componentes & Serviços", shortLabel: "Peças", description: "Tabela de mão de obra, estoque de peças e garantias", icon: Boxes },
      atendimento: { label: "Clientes & Avisos WhatsApp", shortLabel: "Clientes", description: "Avisos de aparelho pronto, atendimento e pós-reparo", icon: MessageSquare },
      suporte: { label: "Garantias & RMA", shortLabel: "Garantias", description: "Retornos em garantia, controle de qualidade e termos", icon: ShieldCheck },
    },
  },

  // Pet Shop & Clínica Veterinária
  pet: {
    order: ["overview", "comercial", "catalogo", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Agenda Banho/Tosa & Clínica", shortLabel: "Agenda Pet", description: "Mapa de banho e tosa, consultas veterinárias e PDV", icon: Dog },
      catalogo: { label: "Pet Shop, Vacinas & Pacotes", shortLabel: "Pet Shop", description: "Rações, medicamentos, clubes de banho e prontuários", icon: Package },
      atendimento: { label: "Tutores & Alertas de Vacina", shortLabel: "Tutores", description: "Ficha dos pets, carteira de vacinação e WhatsApp", icon: MessageSquare },
      rh: { label: "Veterinários & Groomers", shortLabel: "Equipe Pet", description: "Banhistas, tosadores, veterinários e comissões", icon: Users },
      logistica: { label: "Táxi Dog & Estoque", shortLabel: "Táxi Dog", description: "Busca e entrega de pets, rotas e reposição de estoque", icon: Truck },
    },
  },

  // Eventos, Ingressos & Produções
  events: {
    order: ["overview", "comercial", "catalogo", "logistica", "atendimento", "financeiro", "rh", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      comercial: { label: "Bilheteria, Lotes & PDV", shortLabel: "Bilheteria", description: "Venda de ingressos, virada de lotes, listas VIP e mesas", icon: Ticket },
      catalogo: { label: "Eventos, Atrações & Vitrine", shortLabel: "Eventos", description: "Programação, páginas de evento, patrocinadores e cupons", icon: Calendar },
      logistica: { label: "Portaria, Check-in & Produção", shortLabel: "Portaria", description: "Validação de QR Code, credenciamento, fornecedores e staff", icon: UserCheck },
      financeiro: { label: "Borderô & Financeiro", shortLabel: "Borderô", description: "Fechamento de borderô, repasses de bilheteria, bar e DRE", icon: Banknote },
      rh: { label: "Promoters, Staff & Equipe", shortLabel: "Promoters", description: "Comissões de promoters/afiliados, produtores e escala", icon: Users },
    },
  },

  // Educação, Cursos & Treinamentos
  education: {
    order: ["overview", "catalogo", "comercial", "atendimento", "rh", "logistica", "financeiro", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      catalogo: { label: "Cursos, Turmas & Conteúdo", shortLabel: "Cursos", description: "Grade curricular, turmas, aulas, materiais e certificados", icon: GraduationCap },
      comercial: { label: "Matrículas & Captação", shortLabel: "Matrículas", description: "Funil de matrículas, bolsas, propostas e contratos", icon: Kanban },
      atendimento: { label: "Secretaria & Alunos", shortLabel: "Alunos", description: "Atendimento ao aluno, comunicados, WhatsApp e avaliações", icon: MessageSquare },
      rh: { label: "Professores & Coordenação", shortLabel: "Docentes", description: "Corpo docente, hora-aula, ponto e repasses", icon: Users },
      financeiro: { label: "Mensalidades & Financeiro", shortLabel: "Mensalidades", description: "Carnês, recorrência, inadimplência, caixa e NFS-e", icon: Banknote },
    },
  },

  // Portal de Notícias, Mídia & Creators
  news: {
    order: ["overview", "catalogo", "comercial", "atendimento", "inteligencia", "financeiro", "rh", "logistica", "suporte", "configuracoes"],
    overrides: {
      catalogo: { label: "Redação, Pautas & Portal", shortLabel: "Redação", description: "Matérias, editorias, colunistas, stories e capa do portal", icon: Newspaper },
      comercial: { label: "Publicidade & Patrocínios", shortLabel: "Mídia Kit", description: "Venda de espaços publicitários, publiposts, propostas e contratos", icon: Megaphone },
      atendimento: { label: "Leitores & Comunidade", shortLabel: "Audiência", description: "Comentários, denúncias, newsletters e WhatsApp", icon: MessageSquare },
      rh: { label: "Jornalistas & Colunistas", shortLabel: "Redatores", description: "Equipe editorial, freelancers, pautas e pagamentos", icon: Users },
    },
  },

  // Recrutamento, RH & Agências de Emprego
  jobs: {
    order: ["overview", "rh", "comercial", "atendimento", "catalogo", "financeiro", "logistica", "suporte", "inteligencia", "configuracoes"],
    overrides: {
      rh: { label: "Vagas & Triagem ATS", shortLabel: "Vagas ATS", description: "Pipeline de candidatos, vagas abertas, currículo e entrevistas", icon: Briefcase },
      comercial: { label: "Empresas Clientes & R&S", shortLabel: "Empresas", description: "Prospecção B2B, propostas de hunting e contratos de R&S", icon: Kanban },
      atendimento: { label: "Candidatos & Talentos", shortLabel: "Talentos", description: "Comunicação com candidatos, banco de talentos e WhatsApp", icon: MessageSquare },
      catalogo: { label: "Portal de Carreiras & Testes", shortLabel: "Portal", description: "Página de carreiras, pacotes de R&S e divulgação", icon: Globe },
      financeiro: { label: "Honorários R&S & Financeiro", shortLabel: "Financeiro", description: "Faturamento de vagas fechadas, folha BPO e NFS-e", icon: Banknote },
    },
  },
};

function inferNicheForPillars(groups: NavGroup[], storeDataOrNiche?: any): string {
  if (storeDataOrNiche) {
    if (typeof storeDataOrNiche === "string") {
      return getNicheSemantics({ niche: storeDataOrNiche, segment: storeDataOrNiche }).nicheId;
    }
    return getNicheSemantics(storeDataOrNiche).nicheId;
  }

  const groupIds = new Set(groups.map((g) => g.id));
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
    const matchedGroups = groups.filter((g) => def.groupIds.includes(g.id));
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
  const leftoverGroups = groups.filter((g) => !assignedGroupIds.has(g.id) && g.items.length > 0);
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


