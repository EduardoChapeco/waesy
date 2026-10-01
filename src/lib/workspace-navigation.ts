import { Package, Tags, Tag, Store, LayoutDashboard, Settings, Calendar, Users, ShoppingBag, Truck, Boxes, Banknote, FileText, LayoutTemplate, Link2, Image as ImageIcon, ClipboardList, ShieldAlert, Megaphone, Share2, Star, Bell, Flame, Kanban, Newspaper, Plus, Sliders, DollarSign, Ticket, ArrowRightLeft, Building2, ShieldCheck, UtensilsCrossed, ChefHat, Coins, Zap, MessageSquare, Scale, Wrench, MapPin, Palette, Target, LayoutGrid, Navigation, Briefcase, Plane, ShoppingCart, Eye, Receipt, AlertTriangle, ArrowDownUp, Clock, Car, Smartphone, Layers, HeartPulse, GraduationCap, Dog, CarFront, PenTool, Layers2, FileSpreadsheet, Gift, Globe, Bus, Award, Bot, LifeBuoy, Compass, UserCheck, Lock, HandHeart, Database, Calculator, Sparkles } from "lucide-react";

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
    { path: "/workspace", label: "Dashboard", icon: LayoutDashboard },
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
    { path: "/workspace/squads", label: "Squads", icon: Bot },
    { path: "/workspace/skills", label: "Skills", icon: Sparkles },
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
  ],
};

const GROUP_MASTER_INBOX: NavGroup = {
  id: "master-inbox",
  label: "Atendimento",
  icon: MessageSquare,
  section: "master",
  items: [
    { path: "/workspace/atendimento", label: "Conversas", icon: MessageSquare },
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

// 8. Turismo
const GROUP_TURISMO_COMMERCIAL: NavGroup = {
  id: "tourism-commercial",
  label: "Comercial",
  icon: Kanban,
  section: "niche",
  items: [
    { path: "/workspace/comercial", label: "Funil", icon: Kanban },
    { path: "/workspace/turismo/cotacoes", label: "Cotações", icon: Plane },
    { path: "/workspace/turismo/propostas", label: "Propostas", icon: FileSpreadsheet },
    { path: "/workspace/orcamentos", label: "Orçamentos", icon: FileText },
  ],
};

const GROUP_TURISMO_OPERATIONS: NavGroup = {
  id: "tourism-trips",
  label: "Operações",
  icon: Compass,
  section: "niche",
  items: [
    { path: "/workspace/turismo/viagens", label: "Viagens", icon: Compass },
    { path: "/workspace/turismo/aereos", label: "Aéreos", icon: Plane },
    { path: "/workspace/turismo/incidentes", label: "Incidentes", icon: AlertTriangle },
    { path: "/workspace/turismo/reacomodacao", label: "Reacomodação", icon: ShieldAlert },
    { path: "/workspace/turismo/embarques", label: "Embarques", icon: Calendar },
    { path: "/workspace/turismo/vouchers", label: "Vouchers", icon: Ticket },
    { path: "/workspace/turismo/contratos", label: "Contratos", icon: FileText },
    { path: "/workspace/turismo/vistos", label: "Vistos", icon: Globe },
    { path: "/workspace/turismo/radar", label: "Radar", icon: Navigation },
    { path: "/workspace/turismo/viagens?view=embarque", label: "Check-in", icon: UserCheck },
  ],
};

const GROUP_TURISMO_CATALOG: NavGroup = {
  id: "tourism-catalog",
  label: "Catálogo",
  icon: Package,
  section: "niche",
  items: [
    { path: "/workspace/catalogo/produtos", label: "Roteiros", icon: Package },
    { path: "/workspace/turismo/destinos", label: "Destinos", icon: MapPin },
    { path: "/workspace/turismo/hoteis", label: "Hotéis", icon: Building2 },
    { path: "/workspace/turismo/fornecedores", label: "Fornecedores", icon: Building2 },
  ],
};

const GROUP_TURISMO_FLEET_GROUPS: NavGroup = {
  id: "tourism-fleet-groups",
  label: "Frota",
  icon: Bus,
  section: "niche",
  items: [
    { path: "/workspace/turismo/grupos", label: "Excursões", icon: Users },
    { path: "/workspace/turismo/frota", label: "Ônibus", icon: Bus },
    { path: "/workspace/eventos", label: "Passeios", icon: Calendar },
  ],
};

const GROUP_TURISMO_CLIENTS: NavGroup = {
  id: "tourism-clients",
  label: "Passageiros",
  icon: Users,
  section: "niche",
  items: [
    { path: "/workspace/clientes", label: "Passageiros", icon: Users },
    { path: "/workspace/pedidos", label: "Emissões", icon: ShoppingBag },
  ],
};

const GROUP_TURISMO_MARKETING: NavGroup = {
  id: "tourism-marketing",
  label: "Vitrine",
  icon: Megaphone,
  section: "corporate",
  items: [
    { path: "/workspace/marketing/vitrine", label: "Vitrine", icon: LayoutGrid },
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
    { path: "/workspace/financeiro/caixa", label: "Caixa", icon: Banknote },
    { path: "/workspace/financeiro/caixa/lancamentos", label: "Lançamentos", icon: Receipt },
    { path: "/workspace/financeiro/caixa/turnos", label: "Turnos", icon: Clock },
    { path: "/workspace/relatorios/metas", label: "Metas", icon: Target },
    { path: "/workspace/financeiro/pagamentos", label: "Repasses", icon: DollarSign },
    { path: "/workspace/financeiro/contas-pagar", label: "Contas a Pagar", icon: Receipt },
    { path: "/workspace/financeiro/recebiveis", label: "Recebíveis", icon: Receipt },
    { path: "/workspace/financeiro/faturas", label: "Faturas", icon: Receipt },
    { path: "/workspace/financeiro/comprovantes", label: "Comprovantes", icon: ShieldCheck },
    { path: "/workspace/financeiro/relatorios-canal", label: "DRE", icon: FileSpreadsheet },
    { path: "/workspace/financeiro/afiliados", label: "Afiliados", icon: Coins },
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
    { path: "/workspace/captacao", label: "Investidores", icon: Coins },
    { path: "/workspace/captacao/ndas", label: "NDAs", icon: Lock },
  ],
};

import { getNicheSemantics } from "./niche-semantics";


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
import { getNicheManifest } from "./niche-manifest";

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

  const manifest = getNicheManifest(storeContext?.segment || storeContext?.niche_id);
  const groups = resolveWorkspaceNavigation(storeContext, options);
  const { t } = getNicheTranslation(storeContext);

  // Aplica metamorfose semântica nos rótulos de navegação
  return groups.map((group) => {
    // Traduz o título do grupo se for catálogo, vendas ou operações
    let groupLabel = group.label;
    if (group.id.includes("catalog")) groupLabel = t("catalog");
    if (group.id.includes("sales") || group.id.includes("orders")) groupLabel = t("orders");

    const items = group.items.map((item) => {
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
  });
}
