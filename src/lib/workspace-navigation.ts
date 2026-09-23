import {
  Package,
  Tags,
  Tag,
  Store,
  LayoutDashboard,
  Settings,
  Calendar,
  Users,
  ShoppingBag,
  Truck,
  Boxes,
  Banknote,
  FileText,
  LayoutTemplate,
  Link2,
  Image as ImageIcon,
  ClipboardList,
  ShieldAlert,
  Megaphone,
  Share2,
  Star,
  Bell,
  Flame,
  Kanban,
  Newspaper,
  Plus,
  Sliders,
  DollarSign,
  Ticket,
  ArrowRightLeft,
  Building2,
  ShieldCheck,
  UtensilsCrossed,
  ChefHat,
  Coins,
  Zap,
  MessageSquare,
  Scale,
  Wrench,
  MapPin,
  Palette,
  Target,
  LayoutGrid,
  Navigation,
  Briefcase,
  Plane,
  ShoppingCart,
  Eye,
  Receipt,
  AlertTriangle,
  ArrowDownUp,
  Clock,
  Car,
  Smartphone,
  Layers,
  HeartPulse,
  GraduationCap,
  Dog,
  CarFront,
  PenTool,
  Layers2,
  FileSpreadsheet,
  Gift,
  Globe,
  Bus,
  Award,
  Bot,
  LifeBuoy,
  Compass,
  UserCheck,
  Lock,
  HandHeart,
  Database,
} from "lucide-react";

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
  label: "Visão Geral",
  icon: LayoutDashboard,
  section: "master",
  items: [
    { path: "/workspace", label: "Dashboard Geral", icon: LayoutDashboard },
    { path: "/workspace/onboarding", label: "Setup & Ativação", icon: Layers },
  ],
};

const GROUP_MASTER_TASKS: NavGroup = {
  id: "master-tasks",
  label: "Tarefas & Rotina",
  icon: ClipboardList,
  section: "master",
  items: [
    { path: "/workspace/tarefas", label: "Tarefas & Equipe", icon: ClipboardList },
  ],
};


const GROUP_AGENTIC_INTELLIGENCE: NavGroup = {
  id: "intelligence-squads",
  label: "Squads & Inteligência",
  icon: Layers,
  section: "master",
  items: [
    { path: "/workspace/squads", label: "Squads Especializados", icon: Bot },
    { path: "/workspace/mining", label: "Mineração & Crawlers", icon: Database },
    { path: "/workspace/simlab/focus-group", label: "SimLab Focus Group", icon: Users },
    { path: "/workspace/inteligencia/radar", label: "Radar de Mercado & DNA", icon: Target },
    { path: "/workspace/marketing/canvas-pecados", label: "Canvas dos 7 Pecados", icon: Flame },
    { path: "/workspace/onboarding/revisao", label: "Onboarding & Catálogo Mestre", icon: Layers },
  ],
};

const GROUP_MASTER_INBOX: NavGroup = {
  id: "master-inbox",
  label: "Atendimento & Suporte",
  icon: MessageSquare,
  section: "master",
  items: [
    { path: "/workspace/atendimento", label: "Atendimento & WhatsApp", icon: MessageSquare },
    { path: "/workspace/avaliacoes", label: "Avaliações & Reputação", icon: Star },
    { path: "/workspace/notificacoes", label: "Central de Notificações", icon: Bell },
    { path: "/workspace/suporte", label: "Central de Suporte", icon: LifeBuoy },
  ],
};

// 1. Gastronomia
const GROUP_GASTRO_CATALOG: NavGroup = {
  id: "gastro-catalog",
  label: "Cardápio & Itens",
  icon: UtensilsCrossed,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Cardápio & Produtos", icon: Package },
    { path: "/workspace/catalogo/categorias", label: "Categorias do Menu", icon: Tags },
    { path: "/workspace/catalogo/atributos", label: "Adicionais & Opcionais", icon: Boxes },
    { path: "/workspace/estoque", label: "Controle de Insumos", icon: Boxes },
  ],
};

const GROUP_GASTRO_ORDERS: NavGroup = {
  id: "gastro-orders",
  label: "Pedidos & Cozinha",
  icon: ClipboardList,
  section: "niche",
  items: [
    { path: "/workspace/pedidos/gestor", label: "Gestor & SLAs (KDS)", icon: ClipboardList },
    { path: "/workspace/pdv/comandas", label: "Salão & Mesas", icon: UtensilsCrossed },
    { path: "/workspace/pdv/cozinha", label: "KDS Cozinha", icon: ChefHat },
    { path: "/workspace/reservas", label: "Reservas de Mesas", icon: Calendar },
    { path: "/workspace/pedidos", label: "Histórico de Vendas", icon: ShoppingBag },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/pedidos/frota", label: "Entregadores & Despacho", icon: Truck },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
  ],
};

// 2. Varejo & Moda
const GROUP_RETAIL_CATALOG: NavGroup = {
  id: "retail-catalog",
  label: "Catálogo & Estoque",
  icon: Package,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Produtos & Variações", icon: Package },
    { path: "/workspace/catalogo/categorias", label: "Categorias", icon: Tags },
    { path: "/workspace/catalogo/colecoes", label: "Coleções", icon: Sliders },
    { path: "/workspace/catalogo/atributos", label: "Grades (Cores/Tamanhos)", icon: Boxes },
    { path: "/workspace/estoque", label: "Estoque & Movimentos", icon: Boxes },
    { path: "/workspace/estoque/alertas", label: "Alertas de Reposição", icon: AlertTriangle },
  ],
};

const GROUP_RETAIL_SALES: NavGroup = {
  id: "retail-sales",
  label: "Vendas & Logística",
  icon: ShoppingBag,
  section: "niche",
  items: [
    { path: "/workspace/pedidos", label: "Todos os Pedidos", icon: ShoppingBag },
    { path: "/workspace/pedidos/gestor", label: "Gestor (Kanban)", icon: ClipboardList },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/pedidos/trocas", label: "Trocas & Devoluções", icon: ArrowRightLeft },
    { path: "/workspace/logistica/tabelas", label: "Fretes & Entregas", icon: Truck },
    { path: "/workspace/clientes", label: "Carteira de Clientes", icon: Users },
    { path: "/workspace/comercial", label: "Funil Comercial (Kanban)", icon: Kanban },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
  ],
};

// 3. Serviços & Beleza
const GROUP_SERVICES_AGENDA: NavGroup = {
  id: "services-agenda",
  label: "Agenda & Atendimentos",
  icon: Calendar,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Grade de Agendamentos", icon: Calendar },
    { path: "/workspace/agenda/recursos", label: "Profissionais & Salas", icon: Users },
    { path: "/workspace/pacotes", label: "Pacotes & Passes", icon: Ticket },
  ],
};

const GROUP_SERVICES_CATALOG: NavGroup = {
  id: "services-catalog",
  label: "Serviços & Produtos",
  icon: Layers,
  section: "niche",
  items: [
    { path: "/workspace/agenda/servicos", label: "Catálogo de Serviços", icon: Layers },
    { path: "/workspace/catalogo/produtos", label: "Produtos / Homecare", icon: Package },
    { path: "/workspace/pdv", label: "Comandas & PDV", icon: Store },
    { path: "/workspace/clientes", label: "Clientes / Pacientes", icon: Users },
  ],
};

// 4. Locação & Estruturas
const GROUP_RENTAL_EVENTS: NavGroup = {
  id: "rental-events",
  label: "Locação & Inventário",
  icon: Boxes,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Bens & Equipamentos", icon: Package },
    { path: "/workspace/agenda", label: "Agenda de Locação & Disponibilidade", icon: Calendar },
    { path: "/workspace/orcamentos", label: "Orçamentos & Contratos", icon: FileText },
    { path: "/workspace/pedidos/gestor", label: "Montagens & Despacho", icon: ClipboardList },
    { path: "/workspace/clientes", label: "Clientes / Produtores", icon: Users },
  ],
};

// 5. Assistência Técnica
const GROUP_TECH_REPAIR: NavGroup = {
  id: "tech-repair",
  label: "Assistência & Vendas",
  icon: Wrench,
  section: "niche",
  items: [
    { path: "/workspace/pedidos/gestor", label: "Ordens de Serviço (OS)", icon: ClipboardList },
    { path: "/workspace/agenda/servicos", label: "Tabela de Mão de Obra", icon: Wrench },
    { path: "/workspace/catalogo/produtos", label: "Peças, Capinhas & Acessórios", icon: Package },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/orcamentos", label: "Orçamentos de Reparo", icon: FileText },
    { path: "/workspace/clientes", label: "Clientes", icon: Users },
  ],
};

// 6. Advocacia & Jurídico
const GROUP_LEGAL: NavGroup = {
  id: "legal",
  label: "Processos & Jurídico",
  icon: Scale,
  section: "niche",
  items: [
    { path: "/workspace/advocacia", label: "Processos & Prazos", icon: Scale },
    { path: "/workspace/agenda", label: "Audiências & Reuniões", icon: Calendar },
    { path: "/workspace/orcamentos", label: "Honorários & Propostas", icon: FileText },
    { path: "/workspace/clientes", label: "Clientes / Assistidos", icon: Users },
  ],
};

// 7. Imóveis
const GROUP_REAL_ESTATE: NavGroup = {
  id: "real-estate",
  label: "Imóveis & Vistorias",
  icon: Building2,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Catálogo de Imóveis", icon: Building2 },
    { path: "/workspace/imoveis/manutencoes", label: "Vistorias & Chamados", icon: Wrench },
    { path: "/workspace/orcamentos", label: "Propostas & Contratos", icon: FileText },
    { path: "/workspace/clientes", label: "Interessados / Clientes", icon: Users },
  ],
};

// 8. Turismo & Agência de Viagens — Especialização Modular Canônica
const GROUP_TURISMO_COMMERCIAL: NavGroup = {
  id: "tourism-commercial",
  label: "Comercial",
  icon: Kanban,
  section: "niche",
  items: [
    { path: "/workspace/comercial", label: "Funil de Vendas", icon: Kanban },
    { path: "/workspace/turismo/cotacoes", label: "Cotações Rápidas", icon: Plane },
    { path: "/workspace/turismo/propostas", label: "Propostas Studio", icon: FileSpreadsheet },
    { path: "/workspace/orcamentos", label: "Orçamentos Corporativos", icon: FileText },
  ],
};

const GROUP_TURISMO_OPERATIONS: NavGroup = {
  id: "tourism-trips",
  label: "Operações",
  icon: Compass,
  section: "niche",
  items: [
    { path: "/workspace/turismo/viagens", label: "Viagens & Reservas", icon: Compass },
    { path: "/workspace/turismo/aereos", label: "Bilhetes Aéreos", icon: Plane },
    { path: "/workspace/turismo/incidentes", label: "Incidentes", icon: AlertTriangle },
    { path: "/workspace/turismo/reacomodacao", label: "Reacomodação ANAC", icon: ShieldAlert },
    { path: "/workspace/turismo/embarques", label: "Embarques & Calendário", icon: Calendar },
    { path: "/workspace/turismo/vouchers", label: "Vouchers & Bilhetes", icon: Ticket },
    { path: "/workspace/turismo/contratos", label: "Contratos Digitais", icon: FileText },
    { path: "/workspace/turismo/vistos", label: "Vistos & Passaportes", icon: Globe },
    { path: "/workspace/turismo/radar", label: "Radar de Passageiros", icon: Navigation },
    { path: "/workspace/turismo/viagens?view=embarque", label: "Check-in Rápido", icon: UserCheck },
  ],
};

const GROUP_TURISMO_CATALOG: NavGroup = {
  id: "tourism-catalog",
  label: "Catálogo",
  icon: Package,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Pacotes & Roteiros", icon: Package },
    { path: "/workspace/turismo/destinos", label: "Destinos", icon: MapPin },
    { path: "/workspace/turismo/hoteis", label: "Hotéis & Resorts", icon: Building2 },
    { path: "/workspace/turismo/fornecedores", label: "Fornecedores", icon: Building2 },
  ],
};

const GROUP_TURISMO_FLEET_GROUPS: NavGroup = {
  id: "tourism-fleet-groups",
  label: "Frota & Grupos",
  icon: Bus,
  section: "niche",
  items: [
    { path: "/workspace/turismo/grupos", label: "Grupos & Excursões", icon: Users },
    { path: "/workspace/turismo/frota", label: "Frota de Ônibus", icon: Bus },
    { path: "/workspace/eventos", label: "Passeios & Ingressos", icon: Calendar },
  ],
};

const GROUP_TURISMO_CLIENTS: NavGroup = {
  id: "tourism-clients",
  label: "Passageiros",
  icon: Users,
  section: "niche",
  items: [
    { path: "/workspace/clientes", label: "Carteira de Passageiros", icon: Users },
    { path: "/workspace/pedidos", label: "Histórico de Emissões", icon: ShoppingBag },
  ],
};

const GROUP_TURISMO_MARKETING: NavGroup = {
  id: "tourism-marketing",
  label: "Vitrine",
  icon: Megaphone,
  section: "corporate",
  items: [
    { path: "/workspace/marketing/vitrine", label: "Vitrine Visual", icon: LayoutGrid },
    { path: "/workspace/cms/paginas", label: "Páginas & Roteiros", icon: FileText },
    { path: "/workspace/cms/bio", label: "Link da Bio", icon: Link2 },
    { path: "/workspace/marketing/banners", label: "Banners & Destaques", icon: ImageIcon },
    { path: "/workspace/marketing/promocoes", label: "Ofertas & Descontos", icon: Flame },
    { path: "/workspace/marketing/concursos", label: "Sorteios da Loja", icon: Ticket },
    { path: "/workspace/marketing/anuncios", label: "Campanhas Publicitárias", icon: Megaphone },
    { path: "/workspace/marketing/social", label: "Compartilhamento & Redes", icon: Share2 },
  ],
};


// 9. Empregos & Recrutamento
const GROUP_JOBS: NavGroup = {
  id: "jobs",
  label: "Vagas & Recrutamento",
  icon: Briefcase,
  section: "niche",
  items: [
    { path: "/workspace/empregos/candidatos", label: "Vagas & Candidaturas", icon: Briefcase },
    { path: "/workspace/clientes", label: "Banco de Talentos", icon: Users },
    { path: "/workspace/marketing/vitrine", label: "Página de Carreiras", icon: Eye },
  ],
};

// 10. Eventos, Shows & Ingressos
const GROUP_EVENTS_TICKETS: NavGroup = {
  id: "events-tickets",
  label: "Eventos & Ingressos",
  icon: Ticket,
  section: "niche",
  items: [
    { path: "/workspace/eventos", label: "Meus Eventos & Lotes", icon: Ticket },
    { path: "/workspace/marketing/banners", label: "Flyers & Divulgação", icon: ImageIcon },
    { path: "/workspace/clientes", label: "Participantes / Compradores", icon: Users },
    { path: "/workspace/financeiro/pagamentos", label: "Balanço de Ingressos", icon: DollarSign },
  ],
};

// 11. Automóveis & Veículos
const GROUP_VEHICLES: NavGroup = {
  id: "vehicles",
  label: "Estoque de Veículos",
  icon: CarFront,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Estoque de Veículos", icon: CarFront },
    { path: "/workspace/orcamentos", label: "Propostas & Financiamento", icon: FileText },
    { path: "/workspace/clientes", label: "Leads & Interessados", icon: Users },
  ],
};

// 12. Pet Shop & Veterinária
const GROUP_PET: NavGroup = {
  id: "pet",
  label: "Pet Shop & Clínica",
  icon: Dog,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Grade de Banho, Tosa e Consultas", icon: Calendar },
    { path: "/workspace/agenda/servicos", label: "Procedimentos & Vacinas", icon: HeartPulse },
    { path: "/workspace/catalogo/produtos", label: "Rações, Farmácia & Acessórios", icon: Package },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/clientes", label: "Tutores & Pets", icon: Users },
  ],
};

// 13. Supermercado, Açougue & Hortifrúti
const GROUP_SUPERMARKET: NavGroup = {
  id: "supermarket",
  label: "Gôndolas & Hortifrúti",
  icon: ShoppingCart,
  section: "niche",
  items: [
    { path: "/workspace/marketing/encartes", label: "Encartes da Semana", icon: Flame },
    { path: "/workspace/catalogo/produtos", label: "Produtos (KG e Unidade)", icon: Package },
    { path: "/workspace/catalogo/categorias", label: "Sessões do Mercado", icon: Tags },
    { path: "/workspace/estoque/alertas", label: "Validades & Reposição", icon: AlertTriangle },
    { path: "/workspace/pedidos/gestor", label: "Separação de Pedidos", icon: ClipboardList },
    { path: "/workspace/pedidos/frota", label: "Entregas Locais", icon: Truck },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
  ],
};

// 14. Farmácia & Saúde
const GROUP_PHARMACY: NavGroup = {
  id: "pharmacy",
  label: "Farmácia & Cosméticos",
  icon: HeartPulse,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Medicamentos & OTC", icon: Package },
    { path: "/workspace/pedidos/gestor", label: "Receituários & Balcão", icon: ClipboardList },
    { path: "/workspace/pedidos/frota", label: "Tele-Entrega Express", icon: Truck },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/clientes", label: "Pacientes / Clientes", icon: Users },
  ],
};

// 15. Notícias & Redação de Jornal
const GROUP_NEWS: NavGroup = {
  id: "news",
  label: "Redação & Notícias",
  icon: Newspaper,
  section: "niche",
  items: [
    { path: "/workspace/noticias", label: "Todas as Matérias", icon: Newspaper },
    { path: "/workspace/noticias/novo", label: "Nova Reportagem", icon: PenTool },
    { path: "/workspace/marketing/banners", label: "Banners Publicitários", icon: ImageIcon },
    { path: "/workspace/marketing/vitrine", label: "Capa do Portal", icon: Eye },
  ],
};

// 16. Educação & Cursos
const GROUP_EDUCATION: NavGroup = {
  id: "education",
  label: "Cursos & Turmas",
  icon: GraduationCap,
  section: "niche",
  items: [
    { path: "/workspace/agenda", label: "Grade de Aulas & Workshops", icon: Calendar },
    { path: "/workspace/agenda/servicos", label: "Catálogo de Cursos", icon: GraduationCap },
    { path: "/workspace/clientes", label: "Alunos & Matrículas", icon: Users },
    { path: "/workspace/orcamentos", label: "Contratos & Propostas", icon: FileText },
  ],
};

// 17. Indústria, Atacado & B2B
const GROUP_WHOLESALE: NavGroup = {
  id: "wholesale",
  label: "Atacado & B2B",
  icon: Layers2,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Grade de Produtos & Caixas", icon: Package },
    { path: "/workspace/catalogo/tabelas", label: "Tabelas de Preço PJ", icon: FileSpreadsheet },
    { path: "/workspace/orcamentos", label: "Orçamentos em Lote", icon: FileText },
    { path: "/workspace/pedidos", label: "Faturamento & Pedidos", icon: ShoppingBag },
    { path: "/workspace/clientes", label: "Clientes PJ / Distribuidores", icon: Users },
  ],
};

// Grupos Universais Corporativos
const GROUP_COMMERCIAL_SALES: NavGroup = {
  id: "commercial",
  label: "Comercial & CRM",
  icon: Users,
  section: "corporate",
  items: [
    { path: "/workspace/clientes", label: "Carteira de Clientes 360°", icon: Users },
    { path: "/workspace/comercial", label: "Funil de Vendas (Kanban)", icon: Kanban },
    { path: "/workspace/atendimento", label: "Atendimento & Chat", icon: MessageSquare },
    { path: "/workspace/orcamentos", label: "Orçamentos & Propostas", icon: FileText },
    { path: "/workspace/pdv", label: "Frente de Caixa (PDV)", icon: Store },
    { path: "/workspace/pedidos", label: "Histórico de Vendas", icon: ShoppingBag },
  ],
};

const GROUP_MARKETING_VITRINE: NavGroup = {
  id: "marketing",
  label: "Vitrine & Divulgação",
  icon: Megaphone,
  section: "corporate",
  items: [
    { path: "/workspace/marketing/vitrine", label: "Vitrine Visual (Builder)", icon: LayoutGrid },
    { path: "/workspace/marketing/brand-kit", label: "Brand Kit & Capa da Loja", icon: Palette },
    { path: "/workspace/cms/paginas", label: "Páginas & Landing Pages", icon: FileText },
    { path: "/workspace/cms/bio", label: "Link da Bio & Perfil", icon: Link2 },
    { path: "/workspace/marketing/banners", label: "Banners & Topo", icon: ImageIcon },
    { path: "/workspace/marketing/encartes", label: "Encartes & Tabloides", icon: Flame },
    { path: "/workspace/marketing/carrinhos", label: "Carrinhos Abandonados", icon: ShoppingCart },
    { path: "/workspace/marketing/promocoes", label: "Promoções & Cupons", icon: Flame },
    { path: "/workspace/marketing/concursos", label: "Sorteios da Loja", icon: Ticket },
    { path: "/workspace/marketing/fidelidade", label: "Programa de Fidelidade", icon: Award },
    { path: "/workspace/marketing/gift-cards", label: "Vales-Presente", icon: Gift },
    { path: "/workspace/marketing/pixels", label: "Pixels & Telemetria", icon: Target },
    { path: "/workspace/marketing/anuncios", label: "Campanhas de Anúncios", icon: Megaphone },
    { path: "/workspace/marketing/social", label: "Compartilhamento & Redes", icon: Share2 },
    { path: "/workspace/avaliacoes", label: "Avaliações & Prova Social", icon: Star },
  ],
};

const GROUP_LOGISTICS_EXPEDITION: NavGroup = {
  id: "logistics-expedition",
  label: "Logística & Expedição",
  icon: Truck,
  section: "corporate",
  items: [
    { path: "/workspace/pedidos/expedicao", label: "Expedição WMS & Picking", icon: Package },
    { path: "/workspace/pedidos/frota", label: "Despacho & Rotas", icon: Truck },
    { path: "/workspace/pedidos/entregadores", label: "Entregadores & Motoboys", icon: Users },
    { path: "/workspace/pedidos/trocas", label: "Trocas & Devoluções", icon: ArrowRightLeft },
    { path: "/workspace/logistica/pudo", label: "Pontos PUDO & Lockers", icon: MapPin },
    { path: "/workspace/logistica/tabelas", label: "Tabelas de Frete", icon: Navigation },
    { path: "/workspace/logistica/faturas", label: "Faturas de Frete & CT-e", icon: Receipt },
  ],
};

const GROUP_FINANCE_CLEAN: NavGroup = {
  id: "finance",
  label: "Financeiro",
  icon: Banknote,
  section: "corporate",
  items: [
    { path: "/workspace/financeiro/caixa", label: "Fluxo de Caixa", icon: Banknote },
    { path: "/workspace/relatorios/metas", label: "Metas de Vendas & Forecast", icon: Target },
    { path: "/workspace/financeiro/pagamentos", label: "Pagamentos & Repasses", icon: DollarSign },
    { path: "/workspace/financeiro/contas-pagar", label: "Contas a Pagar & Despesas", icon: Receipt },
    { path: "/workspace/financeiro/recebiveis", label: "Recebíveis, Carnês & Malas", icon: Receipt },
    { path: "/workspace/financeiro/faturas", label: "Faturas da Plataforma & Planos", icon: Receipt },
    { path: "/workspace/financeiro/relatorios-canal", label: "DRE & Canais de Venda", icon: FileSpreadsheet },
    { path: "/workspace/financeiro/afiliados", label: "Comissões de Afiliados", icon: Coins },
    { path: "/workspace/financeiro/funcionarios", label: "Folha & Salários", icon: Users },
  ],
};

const GROUP_FISCAL_ACCOUNTING: NavGroup = {
  id: "fiscal-accounting",
  label: "Fiscal & Contábil",
  icon: FileText,
  section: "corporate",
  items: [
    { path: "/workspace/fiscal/nfe", label: "Notas Fiscais (NF-e/NFC-e)", icon: Receipt },
    { path: "/workspace/contador", label: "Portal do Contador", icon: FileSpreadsheet },
    { path: "/workspace/contratos", label: "Contratos Digitais", icon: FileText },
  ],
};

const GROUP_TEAM_RH: NavGroup = {
  id: "team-rh",
  label: "Equipe & RH",
  icon: Users,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes/equipe", label: "Colaboradores & Acessos", icon: Users },
    { path: "/workspace/rh/ponto", label: "Controle de Ponto & Turnos", icon: Clock },
    { path: "/workspace/financeiro/comissoes", label: "Comissões & Metas", icon: Target },
    { path: "/workspace/configuracoes/sessoes", label: "Sessões & Auditoria", icon: ShieldCheck },
  ],
};

const GROUP_DONATIONS_CAPTACAO: NavGroup = {
  id: "donations-captacao",
  label: "Doações & Captação",
  icon: Coins,
  section: "corporate",
  items: [
    { path: "/workspace/doacoes", label: "Doações & Solidariedade", icon: Gift },
    { path: "/workspace/captacao", label: "Captação de Investimento & M&A", icon: Coins },
    { path: "/workspace/captacao/ndas", label: "NDAs & Termos Assinados", icon: Lock },
  ],
};

import { getNicheSemantics } from "./niche-semantics";

const GROUP_SETTINGS: NavGroup = {
  id: "settings",
  label: "Configurações",
  icon: Settings,
  section: "corporate",
  items: [
    { path: "/workspace/configuracoes", label: "Dados da Loja", icon: Settings },
    { path: "/workspace/configuracoes/sessoes", label: "Sessões & Auditoria", icon: ShieldCheck },
    { path: "/workspace/integracoes/marketplaces", label: "Hub de Marketplaces & Canais", icon: Globe },
    { path: "/workspace/configuracoes/inteligencia-artificial", label: "Inteligência Artificial (IAs)", icon: Bot },
    { path: "/workspace/configuracoes/integracoes", label: "Integrações & Domínios", icon: Link2 },
    { path: "/workspace/configuracoes/parceiros", label: "Parceiros & Fornecedores", icon: Building2 },
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
      GROUP_AGENTIC_INTELLIGENCE,
      GROUP_TURISMO_COMMERCIAL,
      GROUP_TURISMO_OPERATIONS,
      GROUP_TURISMO_CATALOG,
      GROUP_TURISMO_FLEET_GROUPS,
      GROUP_TURISMO_CLIENTS,
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
        GROUP_TURISMO_CATALOG,
        GROUP_TURISMO_FLEET_GROUPS,
        GROUP_TURISMO_CLIENTS,
        GROUP_TURISMO_MARKETING,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
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
        GROUP_COMMERCIAL_SALES,
        GROUP_MARKETING_VITRINE,
        GROUP_LOGISTICS_EXPEDITION,
        GROUP_FINANCE_CLEAN,
        GROUP_FISCAL_ACCOUNTING,
        GROUP_TEAM_RH,
        GROUP_DONATIONS_CAPTACAO,
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
      // Sempre preserva Overview, Master Tasks/Inbox, Financeiro, Fiscal, Logística, Configurações e Grupos Primários do Nicho Ativo
      if (
        group.id === "overview" ||
        group.id === "master-tasks" ||
        group.id === "master-inbox" ||
        group.id === "intelligence-squads" ||
        group.id === "finance" ||
        group.id === "fiscal-accounting" ||
        group.id === "logistics-expedition" ||
        group.id === "settings" ||
        group.id === "team-rh" ||
        group.id.startsWith("tourism") ||
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
    if (enabledModules.includes("tourism") && !finalGroups.some((g) => g.id.startsWith("tourism"))) {
      finalGroups.splice(
        finalGroups.length - 2,
        0,
        GROUP_TURISMO_COMMERCIAL,
        GROUP_TURISMO_OPERATIONS,
        GROUP_TURISMO_CATALOG,
        GROUP_TURISMO_FLEET_GROUPS,
        GROUP_TURISMO_CLIENTS
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

  // Gerente / Manager: acesso a quase tudo, exceto configurações bancárias/críticas
  if (userRole === "manager" || userRole === "gerente") {
    return resolvedGroups;
  }

  // Operador de Caixa / Cashier: apenas PDV, Abertura/Fechamento de Caixa
  if (userRole === "cashier" || userRole === "caixa") {
    return [
      GROUP_OVERVIEW,
      {
        id: "pos-cashier",
        label: "Frente de Caixa (PDV)",
        icon: ShoppingBag,
        items: [
          { path: "/workspace/pdv", label: "Abrir Frente de Caixa (PDV)", icon: ShoppingBag },
          { path: "/workspace/pedidos", label: "Pedidos & Vendas do Dia", icon: ShoppingCart },
          { path: "/workspace/financeiro/caixa", label: "Fluxo de Caixa & Turno", icon: Banknote },
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
        label: "Operações & Expedição",
        icon: Boxes,
        items: [
          { path: "/workspace/pedidos/gestor", label: "Gestor de Pedidos / KDS", icon: Clock },
          { path: "/workspace/pedidos", label: "Separação & Picking", icon: Package },
          { path: "/workspace/estoque", label: "Estoque & Insumos", icon: Boxes },
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
        label: "Minha Agenda & Atendimentos",
        icon: Calendar,
        items: [
          { path: "/workspace/agenda", label: "Minha Grade de Agendamentos", icon: Calendar },
          { path: "/workspace/clientes", label: "Meus Clientes", icon: Users },
          { path: "/workspace/pdv", label: "Lançar Comanda de Atendimento", icon: ShoppingBag },
        ],
      },
    ];
  }

  // RH / Recrutador: Colaboradores, Vagas e Candidatos
  if (userRole === "rh" || userRole === "recruiter") {
    return [
      GROUP_OVERVIEW,
      {
        id: "rh-module",
        label: "RH & Recrutamento",
        icon: Briefcase,
        items: [
          { path: "/workspace/configuracoes/equipe", label: "Colaboradores & Folha", icon: Users },
          { path: "/workspace/empregos/candidatos", label: "Vagas & Triagem (ATS)", icon: Briefcase },
          { path: "/workspace/clientes", label: "Banco de Talentos", icon: Users },
        ],
      },
    ];
  }

  return resolvedGroups;
}
