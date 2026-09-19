import { Home, MapPin, ShoppingBag, Tag, Calendar, Compass, User, LayoutDashboard, Bookmark, Handshake, Package, MessageSquare, Coins, Gift, CreditCard, RefreshCcw, Sliders, Flame, Clock, Heart, Plus, Search, SlidersHorizontal, Store, Layers, Utensils, Music, Shirt, HelpCircle, ShieldCheck, Building, Car, Truck, Laptop, Briefcase, Ticket, Mountain, Newspaper, Target, Trophy } from 'lucide-react';

export type ContentWidthMode =
 "social-feed" | "catalog" | "reading" | "workspace" | "full" | "media-detail";

export interface NavigationItem {
 to: string;
 label: string;
 icon: any;
 exact?: boolean;
 badge?: string | number;
 description?: string;
}

export interface NavigationGroup {
 id: string;
 title?: string;
 items: NavigationItem[];
}

export interface ContextAction {
 label: string;
 type: "dialog" | "navigate";
 to?: string;
 dialogType?: "publish_post" | "new_classified" | "new_event" | "new_product";
 icon?: any;
}

export interface ContextConfig {
 moduleId: string;
 title: string;
 subtitle?: string;
 groups: NavigationGroup[];
 action?: ContextAction;
 widthMode: ContentWidthMode;
 showContextSidebar: boolean;
}

/**
 * ─── Destinos Globais da Global Rail (8 Módulos Canônicos Independentes) ─────
 */
export const GLOBAL_DESTINATIONS: NavigationItem[] = [
  { to: "/diretorio", label: "Places", icon: Compass },
  { to: "/classificados", label: "Classificados", icon: Tag },
  { to: "/feed", label: "Feed", icon: MessageSquare },
  { to: "/noticias", label: "Notícias", icon: Newspaper },
  { to: "/empregos", label: "Empregos", icon: Briefcase },
  { to: "/eventos", label: "Eventos", icon: Ticket },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/afiliados", label: "Afiliados", icon: Target },
];

/**
 * ─── Grupos de Navegação da Área Pessoal ─────────────────────────────────────
 */
export const PERSONAL_NAV_GROUPS: NavigationGroup[] = [
 {
 id: "overview",
 title: "Minha Conta",
 items: [
 { to: "/conta", label: "Visão Geral", icon: User, exact: true },
 { to: "/conta/perfil", label: "Meu Perfil", icon: User },
 { to: "/convite", label: "Programa de Convites", icon: Gift },
 { to: "/conta/concursos", label: "Meus Sorteios", icon: Trophy },
 { to: "/conta/salvos", label: "Itens Salvos", icon: Bookmark },
 ],
 },
 {
    id: "social-negociacoes",
    title: "Negociações & Anúncios",
    items: [
      { to: "/conta/negociacoes", label: "Minhas Negociações", icon: Handshake },
 { to: "/conta/classificados", label: "Meus Anúncios", icon: Tag },
 { to: "/conta/conversas", label: "Mensagens", icon: MessageSquare },
 ],
 },
 {
 id: "commerce",
 title: "Compras & Pagamentos",
 items: [
 { to: "/conta/pedidos", label: "Minhas Compras", icon: Package },
 { to: "/conta/pacotes", label: "Pacotes & Aulas", icon: Ticket },
 { to: "/conta/pagamentos", label: "Pagamentos & Parcelas", icon: CreditCard },
 { to: "/conta/creditos", label: "Carteira & Créditos", icon: Coins },
 { to: "/conta/gift-cards", label: "Vales-Presente", icon: Gift },
 { to: "/conta/enderecos", label: "Endereços", icon: MapPin },
 { to: "/conta/trocas", label: "Trocas & Devoluções", icon: RefreshCcw },
 ],
 },
];

/**
 * ─── Grupos de Navegação do Feed Social (/feed) ─────────────────────────────
 */
export const FEED_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "feed-explore",
    title: "Feed da Comunidade",
    items: [
      { to: "/feed", label: "Para Você", icon: Sliders, exact: true },
      { to: "/feed?type=simple", label: "Fotos & Ideias", icon: MessageSquare },
      { to: "/feed?type=news", label: "Novidades Locais", icon: Flame },
      { to: "/feed?type=travel", label: "Roteiros", icon: Compass },
    ],
  },
];

/**
 * ─── Grupos de Navegação de Notícias (/noticias) ────────────────────────────
 */
export const NEWS_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "news-explore",
    title: "Portal de Notícias",
    items: [
      { to: "/noticias", label: "Todas as Notícias", icon: Newspaper, exact: true },
      { to: "/noticias?category=cidade", label: "Cidade & Região", icon: MapPin },
      { to: "/noticias?category=economia", label: "Negócios & Economia", icon: Flame },
      { to: "/noticias?category=cultura", label: "Cultura & Lazer", icon: Calendar },
    ],
  },
];

/**
 * ─── Grupos de Navegação de Afiliados (/afiliados) ──────────────────────────
 */
export const AFFILIATES_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "affiliates-explore",
    title: "Programa de Afiliados",
    items: [
      { to: "/afiliados", label: "Visão Geral", icon: Target, exact: true },
      { to: "/conta/tokens", label: "Meus Tokens & Saldo", icon: Coins },
      { to: "/workspace/financeiro/afiliados", label: "Painel Comercial", icon: LayoutDashboard },
    ],
  },
];

/**
 * ─── Grupos de Navegação do Mercado ─────────────────────────────────────────
 */
export const MARKET_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "market-explore",
    title: "Explorar Mercado",
    items: [
      { to: "/mercado", label: "Todos os Produtos", icon: ShoppingBag, exact: true },
      { to: "/ofertas", label: "Ofertas Relâmpago", icon: Flame },
      { to: "/mercado?sort=newest", label: "Novidades da Cidade", icon: Clock },
      { to: "/conta/salvos", label: "Lista de Desejos", icon: Heart },
    ],
  },
  {
    id: "market-niches",
    title: "Categorias",
    items: [
      { to: "/gastronomia", label: "Gastronomia", icon: Utensils },
      { to: "/mercado", label: "Mercado", icon: Store },
      { to: "/farmacia", label: "Farmácia", icon: Heart },
      { to: "/bebidas", label: "Bebidas", icon: Flame },
      { to: "/acougue", label: "Açougue", icon: Flame },
      { to: "/eletronicos", label: "Eletrônicos", icon: Laptop },
      { to: "/moda", label: "Moda", icon: Shirt },
      { to: "/casa", label: "Móveis", icon: Home },
      { to: "/limpeza", label: "Limpeza", icon: Package },
      { to: "/livros", label: "Livraria", icon: Store },
      { to: "/servicos", label: "Serviços", icon: Briefcase },
      { to: "/imoveis", label: "Imóveis", icon: Building },
      { to: "/beleza", label: "Beleza", icon: Sliders },
      { to: "/turismo", label: "Turismo", icon: Compass },
      { to: "/empregos", label: "Vagas", icon: Briefcase },
      { to: "/doacoes", label: "Doações", icon: Heart },
    ],
  },
];

/**
 * ─── Grupos de Navegação de Eventos (/eventos) ──────────────────────────────
 */
export const EVENTS_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "events-explore",
    title: "Eventos & Shows",
    items: [
      { to: "/eventos", label: "Todos os Eventos", icon: Ticket, exact: true },
      { to: "/eventos?category=shows", label: "Shows & Festivais", icon: Ticket },
      { to: "/eventos?category=gastronomico", label: "Gastronomia & Feiras", icon: Utensils },
      { to: "/conta/ingressos", label: "Meus Ingressos", icon: Ticket },
    ],
  },
];

/**
 * ─── Grupos de Navegação da Agenda Cultural (/agenda) ───────────────────────
 */
export const AGENDA_NAV_GROUPS: NavigationGroup[] = [
  {
    id: "agenda-explore",
    title: "Agenda Cultural",
    items: [
      { to: "/agenda", label: "Toda a Programação", icon: Calendar, exact: true },
      { to: "/agenda?when=today", label: "Hoje", icon: Clock },
      { to: "/agenda?when=tomorrow", label: "Amanhã", icon: Calendar },
      { to: "/agenda?when=weekend", label: "Este Fim de Semana", icon: Sliders },
      { to: "/agenda?when=next7", label: "Próximos 7 Dias", icon: Calendar },
      { to: "/agenda?when=month", label: "Este Mês", icon: Calendar },
    ],
  },
];

/**
 * ─── Grupos de Navegação do Mapa ────────────────────────────────────────────
 */
export const MAP_NAV_GROUPS: NavigationGroup[] = [
 {
 id: "map-layers",
 title: "Camadas do Mapa",
 items: [
 { to: "/mapa", label: "Ver Tudo", icon: MapPin, exact: true },
 { to: "/mapa?type=moment", label: "Moments da Galera", icon: Flame },
 { to: "/mapa?type=store", label: "Lojas & Pontos", icon: Store },
 { to: "/mapa?type=event", label: "Eventos & Shows", icon: Calendar },
 ],
 },
];

/**
 * ─── Resolver Canônico de Contexto ──────────────────────────────────────────
 */
export function resolveContextNavigation(pathname: string, session?: any): ContextConfig {
 // 1. Área Pessoal
 if (pathname.startsWith("/conta")) {
 const isNewClassified = pathname.startsWith("/conta/classificados/novo");

 return {
 moduleId: "account",
 title: "Minha Área",
 subtitle: session?.email ? `@${session.email.split("@")[0]}` : undefined,
 groups: PERSONAL_NAV_GROUPS,
 action: {
 label: "Novo Anúncio",
 type: "navigate",
 to: "/conta/classificados/novo",
 icon: Plus,
 },
 widthMode: isNewClassified ? "reading" : "workspace",
 showContextSidebar: !isNewClassified,
 };
 }

 // 2. Mercado
 if (pathname.startsWith("/mercado")) {
 return {
 moduleId: "market",
 title: "Mercado Waesy",
 subtitle: "Marcas autorais e produtos da comunidade",
 groups: MARKET_NAV_GROUPS,
 action: {
 label: "Anunciar Desapego",
 type: "navigate",
 to: "/conta/classificados/novo",
 icon: Plus,
 },
 widthMode: "catalog",
 showContextSidebar: true,
 };
 }

 // 2.5. Mobilidade & Fretes
 if (pathname.startsWith("/mobilidade")) {
 return {
 moduleId: "mobility",
 title: "Mobilidade & Fretes",
 subtitle: "Corridas, entregas flash e mudanças na cidade",
 groups: [
 {
 id: "mobility-services",
 title: "Serviços",
 items: [
 { to: "/mobilidade", label: "Chamar Agora", icon: Car, exact: true },
 { to: "/conta/mobilidade", label: "Minhas Corridas", icon: Clock },
 { to: "/workspace/pedidos/frota", label: "Central de Despacho", icon: Truck },
 ],
 },
 ],
 action: {
 label: "Novo Chamado",
 type: "navigate",
 to: "/mobilidade",
 icon: Plus,
 },
 widthMode: "full",
 showContextSidebar: false,
 };
 }

 // 2.6. Turismo, Viagens & Lazer
 if (pathname.startsWith("/turismo") || pathname.startsWith("/viagens")) {
 return {
 moduleId: "tourism",
 title: "Turismo",
 subtitle: "Passeios, ecoturismo, cabanas e experiências regionais",
 groups: [
 {
 id: "tourism-categories",
 title: "Experiências",
 items: [
 { to: "/turismo", label: "Todos os Roteiros", icon: Compass, exact: true },
 { to: "/turismo?category=passeios", label: "Passeios", icon: Sliders },
 { to: "/turismo?category=hospedagens", label: "Hospedagem", icon: Building },
 { to: "/turismo?category=gastronomia_turistica", label: "Gastronomia", icon: Utensils },
 { to: "/turismo?category=aventura", label: "Aventura", icon: Mountain },
 ],
 },
 ],
 action: {
 label: "Cadastrar Passeio",
 type: "navigate",
 to: "/workspace/agenda/servicos",
 icon: Plus,
 },
 widthMode: "catalog",
 showContextSidebar: true,
 };
 }

  // 2.7. Classificados
  if (pathname.startsWith("/classificados")) {
    const isNew = pathname.startsWith("/classificados/novo") || pathname.startsWith("/conta/classificados/novo");
    return {
      moduleId: "classifieds",
      title: "Classificados",
      subtitle: "Compra e venda direta na comunidade",
      groups: [
        {
          id: "classifieds-nav",
          title: "Categorias",
          items: [
            { to: "/classificados", label: "Todos os Anúncios", icon: Tag, exact: true },
            { to: "/classificados?category=veiculos", label: "Veículos", icon: Car },
            { to: "/classificados?category=imoveis", label: "Imóveis", icon: Building },
            { to: "/classificados?category=negocios", label: "Negócios", icon: Briefcase },
            { to: "/classificados?category=doacoes", label: "Doações", icon: Heart },
            { to: "/classificados?category=tecnologia", label: "Tecnologia", icon: Laptop },
            { to: "/conta/classificados", label: "Meus Anúncios", icon: SlidersHorizontal },
          ],
        },
      ],
      action: {
        label: "Anunciar Grátis",
        type: "navigate",
        to: "/conta/classificados/novo",
        icon: Plus,
      },
      widthMode: isNew ? "reading" : "catalog",
      showContextSidebar: !isNew,
    };
  }

  // 2.8. Feed Social (Independente)
  if (pathname.startsWith("/feed")) {
    return {
      moduleId: "feed",
      title: "Feed",
      subtitle: "Publicações, fotos e interações da comunidade",
      groups: FEED_NAV_GROUPS,
      action: {
        label: "Publicar no Feed",
        type: "dialog",
        dialogType: "publish_post",
        icon: Plus,
      },
      widthMode: "social-feed",
      showContextSidebar: true,
    };
  }

  // 2.9. Notícias (Independente)
  if (pathname.startsWith("/noticias")) {
    return {
      moduleId: "news",
      title: "Notícias",
      subtitle: "Cobertura jornalística e artigos da cidade",
      groups: NEWS_NAV_GROUPS,
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

  // 2.10. Empregos (Independente)
  if (pathname.startsWith("/empregos")) {
    return {
      moduleId: "jobs",
      title: "Empregos",
      subtitle: "Vagas de emprego e oportunidades locais",
      groups: [
        {
          id: "jobs-categories",
          title: "Vagas",
          items: [
            { to: "/empregos", label: "Todas as Vagas", icon: Briefcase, exact: true },
            { to: "/empregos?type=clt", label: "Vagas CLT", icon: Building },
            { to: "/empregos?type=estagio", label: "Estágios", icon: Laptop },
          ],
        },
      ],
      action: {
        label: "Publicar Vaga",
        type: "navigate",
        to: "/workspace/vagas",
        icon: Plus,
      },
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

  // 3. Eventos (Independente de Agenda!)
  if (pathname.startsWith("/eventos") || pathname.startsWith("/evento")) {
    return {
      moduleId: "events",
      title: "Eventos",
      subtitle: "Shows, festas, festivais e ingressos",
      groups: EVENTS_NAV_GROUPS,
      action: {
        label: "Divulgar Evento",
        type: "navigate",
        to: "/workspace/eventos",
        icon: Plus,
      },
      widthMode: pathname.startsWith("/evento/") ? "media-detail" : "catalog",
      showContextSidebar: !pathname.startsWith("/evento/"),
    };
  }

  // 3.1. Agenda (Independente de Eventos!)
  if (pathname.startsWith("/agenda")) {
    return {
      moduleId: "agenda",
      title: "Agenda",
      subtitle: "Calendário e programação da cidade",
      groups: AGENDA_NAV_GROUPS,
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

  // 3.2. Afiliados (Independente!)
  if (pathname.startsWith("/afiliados")) {
    return {
      moduleId: "affiliates",
      title: "Afiliados",
      subtitle: "Programa de afiliados, indicações e saldo",
      groups: AFFILIATES_NAV_GROUPS,
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

 // 4. Mapa Urbano & Moments
 if (pathname.startsWith("/mapa")) {
 return {
 moduleId: "map",
 title: "Mapa Urbano",
 subtitle: "Explore a cena ao seu redor",
 groups: MAP_NAV_GROUPS,
 action: {
 label: "Novo Moment",
 type: "dialog",
 dialogType: "publish_post",
 icon: Plus,
 },
 widthMode: "full",
 showContextSidebar: false, // Mapa imersivo: sem sidebar contextual lateral
 };
 }

 // 4.5. Mobilidade Urbana & Corridas
 if (pathname.startsWith("/mobilidade")) {
 return {
 moduleId: "mobility",
 title: "Mobilidade & Corridas",
 subtitle: "Chame corridas e entregas em tempo real",
 groups: [],
 widthMode: "full",
 showContextSidebar: false, // Mapa imersivo: sem sidebar contextual lateral
 };
 }

  // 5. Places (Guia Telefônico & Comercial)
  if (pathname.startsWith("/diretorio") || pathname.startsWith("/membro")) {
    return {
      moduleId: "places",
      title: "Places",
      subtitle: "Guia comercial, telefones e locais da cidade",
      groups: [
        {
          id: "places-nav",
          title: "Guia da Cidade",
          items: [
            { to: "/diretorio", label: "Todos os Locais", icon: Compass, exact: true },
            { to: "/diretorio?category=gastronomia", label: "Gastronomia & Delivery", icon: Utensils },
            { to: "/diretorio?category=servicos", label: "Serviços & Autônomos", icon: Briefcase },
            { to: "/diretorio?category=comercio", label: "Comércio & Varejo", icon: Store },
            { to: "/conta/perfil", label: "Meu Perfil", icon: User },
          ],
        },
      ],
      action: {
        label: "Cadastrar Local",
        type: "navigate",
        to: "/criar-negocio",
        icon: Plus,
      },
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

  // 5.1. Classificados (Independente)
  if (pathname === "/classificados" || pathname === "/classificados/" || pathname.startsWith("/classificados?")) {
    return {
      moduleId: "classifieds",
      title: "Classificados",
      subtitle: "Imóveis, veículos, desapegos e serviços",
      groups: [
        {
          id: "classifieds-categories",
          title: "Categorias",
          items: [
            { to: "/classificados", label: "Todos os Anúncios", icon: Tag, exact: true },
            { to: "/classificados?category=real_estate", label: "Imóveis", icon: Building },
            { to: "/classificados?category=vehicle", label: "Veículos", icon: Car },
            { to: "/classificados?category=business", label: "Negócios", icon: Briefcase },
            { to: "/classificados?category=sale", label: "Desapego", icon: Laptop },
            { to: "/classificados?category=service", label: "Serviços", icon: Briefcase },
            { to: "/classificados?category=donation", label: "Doações", icon: Heart },
          ],
        },
        {
          id: "classifieds-personal",
          title: "Meus Anúncios",
          items: [
            { to: "/conta/classificados", label: "Gerenciar Anúncios", icon: Tag },
            { to: "/conta/classificados/novo", label: "Publicar Anúncio", icon: Plus },
          ],
        },
      ],
      action: {
        label: "Publicar Anúncio",
        type: "navigate",
        to: "/conta/classificados/novo",
        icon: Plus,
      },
      widthMode: "catalog",
      showContextSidebar: true,
    };
  }

 // 6. Produto / Classificado Detail
 if (pathname.startsWith("/produto/") || pathname.startsWith("/classificados/")) {
 return {
 moduleId: "item-detail",
 title: "Detalhe do Item",
 groups: [],
 widthMode: "media-detail",
 showContextSidebar: false,
 };
 }

 // 6.5. Abertura e Gestão de Negócios / Lojas
 if (pathname.startsWith("/criar-negocio") || pathname.startsWith("/conta/lojas")) {
 return {
 moduleId: "business-onboarding",
 title: "Espaços & Lojas",
 subtitle: "Gestão e abertura de novos negócios",
 groups: [
 {
 id: "business-nav",
 title: "Espaços",
 items: [
 { to: "/workspace/lojas", label: "Minhas Lojas", icon: Store },
 { to: "/criar-negocio", label: "Cadastrar Nova Loja", icon: Plus },
 { to: "/workspace", label: "Painel Operacional", icon: LayoutDashboard },
 ],
 },
 ],
 widthMode: "workspace",
 showContextSidebar: true,
 };
 }

 // 7. Páginas institucionais / Termos / FAQ / Políticas
 if (
 pathname.startsWith("/termos") ||
 pathname.startsWith("/privacidade") ||
 pathname.startsWith("/trocas-e-devolucoes") ||
 pathname.startsWith("/faq") ||
 pathname.startsWith("/politicas")
 ) {
 return {
 moduleId: "reading",
 title: "Institucional",
 groups: [
 {
 id: "institutional",
 items: [
 { to: "/termos", label: "Termos de Uso", icon: HelpCircle },
 { to: "/privacidade", label: "Privacidade e LGPD", icon: ShieldCheck },
 { to: "/trocas-e-devolucoes", label: "Trocas e Devoluções", icon: RefreshCcw },
 { to: "/faq", label: "Perguntas Frequentes", icon: HelpCircle },
 ],
 },
 ],
 widthMode: "reading",
 showContextSidebar: true,
 };
 }

 // 8. Padrão: Mural / Feed Social
 return {
 moduleId: "feed",
 title: "Mural da Comunidade",
 subtitle: "Publicações, novidades e moments da cidade",
 groups: FEED_NAV_GROUPS,
 action: {
 label: "Publicar",
 type: "dialog",
 dialogType: "publish_post",
 icon: Plus,
 },
 widthMode: "social-feed",
 showContextSidebar: true,
 };
}
