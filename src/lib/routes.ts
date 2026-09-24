/**
 * Typed route registry Commerce.
 * Programmatic single source of truth for navigation, permissions and phase
 * gating. MUST stay in sync with docs/ROUTES.md.
 *
 * Nothing here fetches or renders — it only describes routes so navigation,
 * gates and tests can rely on one canonical list.
 */

import type { Audience, Phase, Role } from "@/types/domain";

export interface RouteEntry {
 /** URL pattern (TanStack-style params use $, docs use :). */
 path: string;
 /** Human label (pt-BR) for menus/breadcrumbs. */
 label: string;
 description: string;
 audience: Audience;
 /** Roles allowed. `visitor` means publicly accessible. */
 roles: Role[];
 phase: Phase;
 /** Whether the path contains dynamic params. */
 dynamic?: boolean;
 /**
 * Sidebar navigation group label (admin only).
 * When set, the route appears in the admin sidebar under this group.
 * Omit for routes that should not appear in the sidebar.
 */
 navGroup?: string;
 /**
 * Lucide icon name string (resolved to LucideIcon in the shell).
 * Keep as string here to avoid coupling this module to React.
 */
 navIcon?: string;
 /** If true, badge Em breve next to the nav label. */
 navPlanned?: boolean;
}

/** Convert docs-style ":param" to TanStack "$param". */
export function toTanstackPath(path: string): string {
 return path.replace(/:([A-Za-z0-9_]+)/g, "$$$1");
}

export const PUBLIC_ROUTES: RouteEntry[] = [
 {
 path: "/",
 label: "Início",
 description: "Vitrine principal da loja",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 },
 {
 path: "/buscar",
 label: "Buscar",
 description: "Busca de produtos",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
  {
  path: "/agenda",
  label: "Agenda",
  description: "Agenda pessoal e compromissos",
  audience: "public",
  roles: ["visitor"],
  phase: 1,
  },
  {
  path: "/eventos",
  label: "Eventos",
  description: "Marketplace de eventos e festas",
  audience: "public",
  roles: ["visitor"],
  phase: 1,
  },
  {
  path: "/evento/:id",
  label: "Detalhes do Evento",
  description: "Página de evento e compra de ingressos",
  audience: "public",
  roles: ["visitor"],
  phase: 1,
  dynamic: true,
  },
  {
  path: "/afiliados",
  label: "Parceiros & Criadores",
  description: "Programa de parceiros, criadores e monetização",
  audience: "public",
  roles: ["visitor"],
  phase: 1,
  },

 {
 path: "/receitas",
    label: "Receitas",
    description: "Guia de receitas culinárias e gastronomia local",
    audience: "public",
    roles: ["visitor"],
    phase: 1,
  },
  {
    path: "/receitas/:id",
    label: "Detalhes da Receita",
    description: "Modo de preparo, ingredientes e impressão",
    audience: "public",
    roles: ["visitor"],
    phase: 1,
  },
  {
    path: "/diretorio",
 label: "Diretório",
 description: "Marcas e artistas",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/mercado",
 label: "Mercado",
 description: "Compre de marcas e lojistas",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/categoria/:slug",
 label: "Categoria",
 description: "Produtos por categoria",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 dynamic: true,
 },
 {
 path: "/colecao/:slug",
 label: "Coleção",
 description: "Produtos por coleção",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 dynamic: true,
 },
 {
 path: "/produto/:slug",
 label: "Produto",
 description: "Página de produto",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 dynamic: true,
 },
 {
 path: "/mural",
 label: "Mural",
 description: "Classificados da comunidade",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/convite",
 label: "Membros Fundadores & Indicação",
 description: "Programa de membros fundadores e embaixadores da comunidade",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/concursos",
 label: "Sorteios & Prêmios",
 description: "Sorteios e campanhas promocionais de empresas da região",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/stories",
 label: "Stories",
 description: "Conteúdo em stories",
 audience: "public",
 roles: ["visitor"],
 phase: 3,
 },
 {
 path: "/destaques/:slug",
 label: "Destaque",
 description: "Destaque permanente",
 audience: "public",
 roles: ["visitor"],
 phase: 3,
 dynamic: true,
 },
 {
 path: "/perfil-da-loja",
 label: "Perfil da loja",
 description: "Portfólio público da loja",
 audience: "public",
 roles: ["visitor"],
 phase: 3,
 },
 {
 path: "/links",
 label: "Links",
 description: "Link da bio",
 audience: "public",
 roles: ["visitor"],
 phase: 3,
 },
 {
 path: "/faq",
 label: "Perguntas frequentes",
 description: "Dúvidas comuns",
 audience: "public",
 roles: ["visitor"],
 phase: 3,
 },
 {
 path: "/contato",
 label: "Contato",
 description: "Fale com a loja",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 },
 {
 path: "/carrinho",
 label: "Carrinho",
 description: "Itens no carrinho",
 audience: "public",
 roles: ["visitor"],
 phase: 2,
 },
 {
 path: "/checkout",
 label: "Finalizar Compra",
 description: "Checkout: finalização",
 audience: "public",
 roles: ["visitor", "customer"],
 phase: 2,
 },

 {
 path: "/pedido/:publicToken/confirmacao",
 label: "Confirmação",
 description: "Confirmação do pedido",
 audience: "public",
 roles: ["visitor"],
 phase: 2,
 dynamic: true,
 },
 {
 path: "/gift-card/:claimToken",
 label: "Gift Card",
 description: "Resgate de gift card",
 audience: "public",
 roles: ["visitor"],
 phase: 4,
 dynamic: true,
 },
 {
 path: "/entrega/:token",
 label: "Painel do Entregador",
 description: "Link Mágico para Motoboy e Entrega com PIN",
 audience: "public",
 roles: ["visitor"],
 phase: 2,
 dynamic: true,
 },

 {
 path: "/politicas/:slug",
 label: "Políticas",
 description: "Página de política",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 dynamic: true,
 },
 {
 path: "/privacidade",
 label: "Privacidade",
 description: "Política de privacidade",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 },
 {
 path: "/termos",
 label: "Termos",
 description: "Termos de uso",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 },
 {
 path: "/trocas-e-devolucoes",
 label: "Trocas e devoluções",
 description: "Política de trocas",
 audience: "public",
 roles: ["visitor"],
 phase: 0,
 },
];

const CUSTOMER: Role[] = ["customer"];

export const CUSTOMER_ROUTES: RouteEntry[] = [
 {
 path: "/entrar",
 label: "Entrar",
 description: "Login da cliente",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/cadastro",
 label: "Cadastro",
 description: "Criar conta",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/recuperar-senha",
 label: "Recuperar senha",
 description: "Recuperação de senha",
 audience: "public",
 roles: ["visitor"],
 phase: 1,
 },
 {
 path: "/conta",
 label: "Minha conta",
 description: "Painel da cliente",
 audience: "customer",
 roles: CUSTOMER,
 phase: 1,
 },
 {
 path: "/conta/perfil",
 label: "Perfil",
 description: "Dados pessoais",
 audience: "customer",
 roles: CUSTOMER,
 phase: 1,
 },
 {
 path: "/conta/enderecos",
 label: "Endereços",
 description: "Endereços salvos",
 audience: "customer",
 roles: CUSTOMER,
 phase: 2,
 },
 {
 path: "/criar-negocio",
 label: "Criar Negócio / Coletivo",
 description: "Onboarding de Produtor Cultural",
 audience: "customer",
 roles: ["customer", "visitor"],
 phase: 1,
 },
 {
 path: "/conta/pedidos",
 label: "Pedidos",
 description: "Histórico de pedidos",
 audience: "customer",
 roles: CUSTOMER,
 phase: 2,
 },
 {
 path: "/conta/pedidos/:id",
 label: "Pedido",
 description: "Detalhe do pedido",
 audience: "customer",
 roles: CUSTOMER,
 phase: 2,
 dynamic: true,
 },
 {
 path: "/conta/pagamentos",
 label: "Pagamentos",
 description: "Pagamentos da cliente",
 audience: "customer",
 roles: CUSTOMER,
 phase: 2,
 },
 {
 path: "/conta/creditos",
 label: "Créditos",
 description: "Saldo de créditos",
 audience: "customer",
 roles: CUSTOMER,
 phase: 4,
 },
 {
 path: "/conta/gift-cards",
 label: "Gift cards",
 description: "Gift cards da cliente",
 audience: "customer",
 roles: CUSTOMER,
 phase: 4,
 },
 {
 path: "/conta/avaliacoes",
 label: "Avaliações",
 description: "Avaliações enviadas",
 audience: "customer",
 roles: CUSTOMER,
 phase: 3,
 },
 {
 path: "/conta/trocas",
 label: "Trocas",
 description: "Solicitações de troca",
 audience: "customer",
 roles: CUSTOMER,
 phase: 4,
 },

 {
 path: "/conta/conversas/:id",
 label: "Conversa",
 description: "Thread de conversa",
 audience: "customer",
 roles: CUSTOMER,
 phase: 4,
 dynamic: true,
 },
];

const STAFF: Role[] = ["owner", "admin", "manager"];
const STAFF_ALL: Role[] = [
 "owner",
 "admin",
 "manager",
 "seller",
 "stock",
 "finance",
 "content",
 "support",
];

export const WORKSPACE_ROUTES: RouteEntry[] = [
 {
 path: "/workspace",
 label: "Visão geral",
 description: "Dashboard do painel",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 0,
 navGroup: "Geral",
 navIcon: "LayoutDashboard",
 },
 {
 path: "/workspace/simulacao",
 label: "SimLab IA",
 description: "Enxame de Validação Preditiva com Personas",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 1,
 navGroup: "Geral",
 navIcon: "Sliders",
 },
 {
 path: "/workspace/mining",
 label: "Mineração & Crawlers",
 description: "Hub de Crawlers, RSS e Mineração de Dados",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 1,
 navGroup: "Inteligência",
 navIcon: "Database",
 },
 {
 path: "/workspace/onboarding",
 label: "Onboarding",
 description: "Primeiros passos",
 audience: "admin",
 roles: STAFF,
 phase: 0,
 navGroup: "Geral",
 navIcon: "Store",
 },
 {
 path: "/workspace/catalogo/produtos",
 label: "Produtos",
 description: "Lista de produtos",
 audience: "admin",
 roles: ["owner", "admin", "manager", "stock", "content"],
 phase: 1,
 navGroup: "Catálogo",
 navIcon: "Package",
 },
 {
 path: "/workspace/catalogo/produtos/novo",
 label: "Novo produto",
 description: "Cadastro de produto",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 1,
 },
 {
 path: "/workspace/catalogo/produtos/:id",
 label: "Editar produto",
 description: "Edição de produto",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 1,
 dynamic: true,
 },
 {
 path: "/workspace/catalogo/tipos",
 label: "Tipos de produto",
 description: "Schemas de atributos",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/catalogo/categorias",
 label: "Categorias",
 description: "Árvore de categorias",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/catalogo/categorias/novo",
 label: "Nova categoria",
 description: "Criar categoria",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/catalogo/categorias/:id",
 label: "Editar categoria",
 description: "Edição de categoria",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 dynamic: true,
 },
 {
 path: "/workspace/catalogo/colecoes",
 label: "Coleções",
 description: "Coleções curadas",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/catalogo/colecoes/novo",
 label: "Nova coleção",
 description: "Criar coleção",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/catalogo/colecoes/:id",
 label: "Editar coleção",
 description: "Edição de coleção",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 dynamic: true,
 },
 {
 path: "/workspace/catalogo/atributos",
 label: "Atributos",
 description: "Definições de atributos",
 audience: "admin",
 roles: STAFF,
 phase: 1,
 },
 {
 path: "/workspace/midias",
 label: "Mídias",
 description: "Biblioteca de mídia",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 1,
 },
 {
 path: "/workspace/estoque",
 label: "Estoque",
 description: "Estoque por variação",
 audience: "admin",
 roles: ["owner", "admin", "manager", "stock"],
 phase: 1,
 },
 {
 path: "/workspace/estoque/movimentos",
 label: "Movimentos",
 description: "Movimentos de estoque",
 audience: "admin",
 roles: ["owner", "admin", "manager", "stock"],
 phase: 1,
 },
 {
 path: "/workspace/estoque/alertas",
 label: "Alertas",
 description: "Alertas de estoque",
 audience: "admin",
 roles: ["owner", "admin", "manager", "stock"],
 phase: 1,
 },
 {
 path: "/workspace/pedidos",
 label: "Pedidos",
 description: "Lista de pedidos",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "finance"],
 phase: 2,
 },
 {
 path: "/workspace/pedidos/:id",
 label: "Pedido",
 description: "Detalhe do pedido",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "finance"],
 phase: 2,
 dynamic: true,
 },
 {
 path: "/workspace/pedidos/frota",
 label: "Frota & Despacho",
 description: "Gestão de motoboys e entregas com PIN",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "stock"],
 phase: 2,
 },
 {
 path: "/workspace/fretes",
 label: "Fretes",
 description: "Estratégias de frete",
 audience: "admin",
 roles: STAFF,
 phase: 2,
 },
 {
 path: "/workspace/fretes/tabelas",
 label: "Tabelas de frete",
 description: "Frete manual",
 audience: "admin",
 roles: STAFF,
 phase: 2,
 },
 {
 path: "/workspace/fretes/cotacoes",
 label: "Cotações",
 description: "Cotações manuais",
 audience: "admin",
 roles: STAFF,
 phase: 2,
 },
 {
 path: "/workspace/pagamentos",
 label: "Pagamentos",
 description: "Pagamentos recebidos",
 audience: "admin",
 roles: ["owner", "admin", "finance"],
 phase: 2,
 },
 {
 path: "/workspace/comprovantes",
 label: "Comprovantes",
 description: "Comprovantes manuais",
 audience: "admin",
 roles: ["owner", "admin", "finance"],
 phase: 2,
 },
 {
 path: "/workspace/clientes",
 label: "Clientes",
 description: "Lista de clientes",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "support"],
 phase: 4,
 },
 {
 path: "/workspace/clientes/:id",
 label: "Cliente",
 description: "Ficha 360 da cliente",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "support"],
 phase: 4,
 dynamic: true,
 },
 {
 path: "/workspace/suporte",
 label: "Suporte",
 description: "Atendimentos",
 audience: "admin",
 roles: ["owner", "admin", "manager", "support"],
 phase: 4,
 },
 {
 path: "/workspace/classificados",
 label: "Classificados",
 description: "Mural de classificados",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 4,
 },
 {
 path: "/workspace/classificados/novo",
 label: "Novo Classificado",
 description: "Criar classificado",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 4,
 },
 {
 path: "/workspace/classificados/:id",
 label: "Editar Classificado",
 description: "Edição de classificado",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 4,
 dynamic: true,
 },
 {
 path: "/workspace/conversas",
 label: "Conversas",
 description: "Chat com clientes",
 audience: "admin",
 roles: ["owner", "admin", "manager", "support"],
 phase: 4,
 },
 {
 path: "/workspace/pedidos/trocas",
 label: "Trocas",
 description: "Trocas e devoluções",
 audience: "admin",
 roles: ["owner", "admin", "manager", "support"],
 phase: 4,
 },
 {
 path: "/workspace/avaliacoes",
 label: "Avaliações",
 description: "Moderação de avaliações",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 },
 {
 path: "/workspace/cms/calendario",
 label: "Calendário Editorial",
 description: "Agendamento visual de stories, flyers e drops",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 navGroup: "Cultural",
 navIcon: "Calendar",
 },
 {
 path: "/workspace/cms/stories",
 label: "Stories & Moments",
 description: "Gestão e publicação de stories",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 },
 {
 path: "/workspace/cms/bio",
 label: "Bio Link & Cartão",
 description: "Página de biolink e links sociais",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 },
 {
 path: "/workspace/vitrine",
 label: "Vitrine (Home)",
 description: "Construtor visual da página inicial",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 navGroup: "Loja",
 navIcon: "LayoutTemplate",
 },
 {
 path: "/workspace/builder",
 label: "Páginas Extras & Bio Links",
 description: "Crie campanhas, bio links e landing pages",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 navGroup: "Marketing",
 navIcon: "FileText",
 },
 {
 path: "/workspace/builder/:documentId/editor",
 label: "Editor Dinâmico",
 description: "Editor de documentos",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 dynamic: true,
 },
 {
 path: "/workspace/builder/analytics",
 label: "Métricas do Builder",
 description: "Desempenho e conversões do Builder",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/events",
 label: "Eventos",
 description: "Gestão de eventos e lotes",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content", "seller"],
 phase: 4,
 navGroup: "Eventos",
 navIcon: "Calendar",
 },
 {
 path: "/workspace/marketing/promocoes",
 label: "Promoções & Ofertas",
 description: "Gestão de ofertas relâmpago, descontos e combos",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 1,
 navGroup: "Marketing",
 navIcon: "Flame",
 },
 {
 path: "/workspace/marketing/concursos",
 label: "Sorteios da Loja",
 description: "Gestão e apuração de sorteios e prêmios da loja",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 1,
 navGroup: "Marketing",
 navIcon: "Ticket",
 },
 {
 path: "/workspace/marketing/anuncios",
 label: "Campanhas de Anúncios",
 description: "Gestão de anúncios e alcance patrocinado",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 navGroup: "Marketing",
 navIcon: "Megaphone",
 },
 {
 path: "/workspace/marketing/anuncios/novo",
 label: "Novo Anúncio",
 description: "Criar campanha de anúncio patrocinado",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 3,
 },
 {
 path: "/workspace/marketing/gift-cards",
 label: "Gift Cards",
 description: "Gestão e emissão de cartões presente",
 audience: "admin",
 roles: ["owner", "admin", "manager", "finance"],
 phase: 3,
 },
 {
 path: "/workspace/events/new",
 label: "Novo Evento",
 description: "Criar evento",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 4,
 },
 {
 path: "/workspace/events/:eventId",
 label: "Editar Evento",
 description: "Edição de evento e lotes",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 4,
 dynamic: true,
 },
 {
 path: "/workspace/events/:eventId/checkin",
 label: "Check-in na Portaria",
 description: "Validação de Ingressos via QR Code",
 audience: "admin",
 roles: STAFF_ALL,
 phase: 4,
 dynamic: true,
 },

 {
 path: "/workspace/cms/navegacao",
 label: "Navegação",
 description: "Menus de navegação",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/cms/tema",
 label: "Tema",
 description: "Editor de tema",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/stories",
 label: "Stories",
 description: "Gestão de stories",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/destaques",
 label: "Destaques",
 description: "Destaques permanentes",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/perfil-publico",
 label: "Perfil público",
 description: "Portfólio da loja",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/link-da-bio",
 label: "Link da bio",
 description: "Página de links",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/marketing/cupons",
 label: "Cupons",
 description: "Cupons de desconto",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/marketing/seguidores",
 label: "Seguidores da Loja",
 description: "Lista de clientes seguindo a loja",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/marketing/ofertas-checkout",
 label: "Ofertas de Checkout",
 description: "Configuração de regras de Upsell no checkout",
 audience: "admin",
 roles: ["owner", "admin", "manager", "content"],
 phase: 4,
 },
 {
 path: "/workspace/marketing/gift-cards",
 label: "Gift cards",
 description: "Gestão de gift cards",
 audience: "admin",
 roles: ["owner", "admin", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/marketing/carrinhos",
 label: "Carrinhos",
 description: "Carrinhos abandonados",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/marketing/notificacoes",
 label: "Notificações",
 description: "Push e campanhas",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/marketing/feed",
 label: "Feeds",
 description: "Feeds Meta/Google",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/match-time",
 label: "Match Time",
 description: "Recomendação por swipe",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 5,
 },
 {
 path: "/workspace/criador",
 label: "Criador",
 description: "Criador de posts/arte",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 5,
 },
 {
 path: "/workspace/caixa",
 label: "Caixa",
 description: "Caixa e frente de loja",
 audience: "admin",
 roles: ["owner", "admin", "manager", "seller", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/caixa/turnos",
 label: "Turnos",
 description: "Turnos de caixa",
 audience: "admin",
 roles: ["owner", "admin", "manager", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/caixa/lancamentos",
 label: "Lançamentos",
 description: "Entradas e saídas de caixa",
 audience: "admin",
 roles: ["owner", "admin", "manager", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/comissoes",
 label: "Comissões",
 description: "Comissões da equipe",
 audience: "admin",
 roles: ["owner", "admin", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/equipe",
 label: "Equipe",
 description: "Usuários e papéis",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 1,
 },
 {
 path: "/workspace/relatorios",
 label: "Relatórios",
 description: "Relatórios e métricas",
 audience: "admin",
 roles: ["owner", "admin", "manager", "finance"],
 phase: 4,
 },
 {
 path: "/workspace/integracoes",
 label: "Integrações",
 description: "Conexões externas",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 5,
 },
 {
 path: "/workspace/configuracoes/loja",
 label: "Loja",
 description: "Dados da loja",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 0,
 },
 {
 path: "/workspace/configuracoes/pagamentos",
 label: "Métodos de Pagamento",
 description: "Configuração de Pix Manual, Ficha e taxas",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 2,
 },
 {
 path: "/workspace/configuracoes/politicas",
 label: "Políticas",
 description: "Políticas e termos",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 3,
 },
 {
 path: "/workspace/configuracoes/lgpd",
 label: "LGPD",
 description: "Privacidade e consentimentos",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 3,
 },
 {
 path: "/workspace/configuracoes/auditoria",
 label: "Auditoria",
 description: "Log de auditoria",
 audience: "admin",
 roles: ["owner", "admin"],
 phase: 4,
 },
 {
 path: "/workspace/configuracoes/seo",
 label: "SEO",
 description: "Configurações de SEO",
 audience: "admin",
 roles: ["owner", "admin", "content"],
 phase: 3,
 },
 {
 path: "/workspace/configuracoes/etapas",
 label: "Etapas da Loja",
 description: "Etapas para uma loja de sucesso",
 audience: "admin",
 roles: ["owner", "admin", "manager"],
 phase: 0,
 navGroup: "Operação",
 navIcon: "CheckSquare",
 },
];

export const ALL_ROUTES: RouteEntry[] = [...PUBLIC_ROUTES, ...CUSTOMER_ROUTES, ...WORKSPACE_ROUTES];

export function getRoute(path: string): RouteEntry | undefined {
 const exact = ALL_ROUTES.find((r) => r.path === path);
 if (exact) return exact;

 return ALL_ROUTES.find((r) => {
 if (!r.dynamic) return false;
 // Replace :param with [^/]+ for regex matching
 const regexPath = r.path.replace(/:[^/]+/g, "[^/]+");
 const regex = new RegExp(`^${regexPath}$`);
 return regex.test(path);
 });
}

export function hasRoleAccess(userRole: string | undefined | null, allowedRoles: Role[]): boolean {
 if (!userRole) return allowedRoles.includes("visitor");
 return allowedRoles.includes(userRole as Role);
}

// ---------------------------------------------------------------------------
// Admin sidebar navigation (canonical — AdminShell must consume this)
// ---------------------------------------------------------------------------

/**
 * A nav group entry for the admin sidebar.
 * Icons are referenced by name string (resolved to LucideIcon in the shell).
 */
export interface AdminNavItem {
 path: string;
 label: string;
 /** Lucide icon name. Resolved to the actual icon in admin-shell.tsx. */
 icon: string;
 planned?: boolean;
}

export interface AdminNavGroup {
 title: string;
 items: AdminNavItem[];
}

/**
 * Canonical admin sidebar navigation groups.
 * Update THIS list — never the NAV array inside admin-shell.tsx.
 * Keep in sync with docs/ROUTES.md.
 */
export const ADMIN_SIDEBAR_NAV: AdminNavGroup[] = [
 {
 title: "Meu Estúdio",
 items: [
 { path: "/admin", label: "Visão Geral", icon: "LayoutDashboard" },
 { path: "/admin/perfil-publico", label: "Meu Portfólio", icon: "Store" },
 { path: "/admin/avaliacoes", label: "Avaliações", icon: "Star" },
 ],
 },
 {
 title: "Eventos & Cultura",
 items: [
 { path: "/admin/events", label: "Meus Eventos", icon: "Calendar" },
 { path: "/admin/destaques", label: "Destaques (Highlights)", icon: "CircleDot" },
 { path: "/admin/stories", label: "Stories (Mural)", icon: "PlaySquare" },
 ],
 },
 {
 title: "Mercado & Estoque",
 items: [
 { path: "/admin/catalogo/produtos", label: "Mercadorias", icon: "Package" },
 { path: "/admin/estoque", label: "Estoque", icon: "Boxes" },
 { path: "/admin/catalogo/categorias", label: "Categorias", icon: "FolderTree" },
 { path: "/admin/catalogo/colecoes", label: "Coleções", icon: "Layers" },
 { path: "/admin/midias", label: "Mídias & Fotos", icon: "Images" },
 { path: "/admin/catalogo/atributos", label: "Atributos", icon: "Settings2" },
 { path: "/admin/catalogo/tipos", label: "Tipos de Produto", icon: "Settings" },
 ],
 },
 {
 title: "Vendas & Caixa",
 items: [
 { path: "/admin/pedidos", label: "Pedidos & Compras", icon: "ShoppingBag" },
 { path: "/admin/caixa", label: "PDV / Caixa Rápido", icon: "MonitorSmartphone" },
 { path: "/admin/pagamentos", label: "Pagamentos", icon: "CreditCard" },
 { path: "/admin/comprovantes", label: "Comprovantes Manuais", icon: "FileText" },
 { path: "/admin/pedidos/trocas", label: "Trocas & Devoluções", icon: "ArrowLeftRight" },
 { path: "/admin/comissoes", label: "Comissões da Equipe", icon: "Percent" },
 ],
 },
 {
 title: "Comunidade",
 items: [
 { path: "/admin/clientes", label: "Público & Clientes", icon: "Users" },
 { path: "/admin/conversas", label: "Chat & Mensagens", icon: "MessagesSquare" },
 { path: "/admin/suporte", label: "Tickets de Suporte", icon: "LifeBuoy" },
 { path: "/admin/classificados", label: "Meus Classificados", icon: "Tag" },
 { path: "/admin/marketing/seguidores", label: "Seguidores", icon: "Heart" },
 ],
 },
 {
 title: "Design & Presença",
 items: [
 { path: "/admin/vitrine", label: "Editor da Home", icon: "MonitorPlay" },
 { path: "/admin/cms/tema", label: "Cores & Estilo", icon: "Palette" },
 { path: "/admin/cms/navegacao", label: "Menus de Navegação", icon: "Menu" },
 { path: "/admin/builder", label: "Páginas Extras", icon: "FileText" },
 { path: "/admin/link-da-bio", label: "Link da Bio", icon: "Link2" },
 ],
 },
 {
 title: "Crescimento",
 items: [
 { path: "/admin/marketing/cupons", label: "Cupons de Desconto", icon: "Ticket" },
 { path: "/admin/match-time", label: "Ofertas Relâmpago", icon: "Zap" },
 { path: "/admin/marketing/ofertas-checkout", label: "Ofertas no Checkout", icon: "Sliders" },
 { path: "/admin/marketing/carrinhos", label: "Carrinhos Abandonados", icon: "ShoppingCart" },
 { path: "/admin/marketing/gift-cards", label: "Gift Cards", icon: "Gift" },
 { path: "/admin/marketing/notificacoes", label: "Notificações Push", icon: "BellRing" },
 { path: "/admin/criador", label: "Studio de Criação", icon: "Video" },
 { path: "/admin/marketing/feed", label: "Feed Meta/Google", icon: "Rss" },
 ],
 },
 {
 title: "Ajustes do Coletivo",
 items: [
 { path: "/admin/configuracoes/loja", label: "Dados e Setup", icon: "Store" },
 { path: "/admin/configuracoes/pagamentos", label: "Taxas & Pix Manual", icon: "Landmark" },
 { path: "/admin/fretes/tabelas", label: "Entregas & Frete", icon: "Truck" },
 { path: "/admin/integracoes", label: "Integrações (Pixels)", icon: "Plug" },
 { path: "/admin/configuracoes/politicas", label: "Termos & Políticas", icon: "ShieldCheck" },
 { path: "/admin/configuracoes/lgpd", label: "Privacidade LGPD", icon: "Lock" },
 { path: "/admin/configuracoes/seo", label: "SEO & Busca", icon: "Search" },
 { path: "/admin/equipe", label: "Acessos da Equipe", icon: "UserCog" },
 { path: "/admin/relatorios", label: "Métricas Financeiras", icon: "BarChart3" },
 { path: "/admin/configuracoes/auditoria", label: "Auditoria", icon: "ShieldAlert" },
 ],
 },
];

/** Bottom nav items for the admin mobile bar (also canonical). */
export const ADMIN_BOTTOM_NAV: AdminNavItem[] = [
 { path: "/admin", label: "Início", icon: "LayoutDashboard" },
 { path: "/admin/catalogo/produtos", label: "Produtos", icon: "Package" },
 { path: "/admin/pedidos", label: "Pedidos", icon: "ShoppingCart" },
 { path: "/admin/configuracoes/loja", label: "Ajustes", icon: "Settings" },
];
