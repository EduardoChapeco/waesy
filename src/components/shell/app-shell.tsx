import { type ReactNode, useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { resolveContextNavigation } from "@/lib/navigation-registry";
import { TopBar } from "./top-bar";
import { ContextSidebar } from "./context-sidebar";
import { MobileNav } from "./mobile-nav";
import { CartSheet } from "@/components/commerce/cart-sheet";
import { InterestPickerModal } from "@/components/onboarding/interest-picker-modal";
import { GeolocationPermissionSheet } from "@/components/location/geolocation-permission-sheet";
import { PWAInstallBanner } from "@/components/commerce/pwa-install-banner";
import { OfflineIndicator } from "./offline-indicator";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { useWindowSizeClass } from "@/hooks/use-mobile";

function resolveCleanMobileTitle(pathname: string, fallbackTitle?: string): string {
  const map: Record<string, string> = {
    "/buscar": "Buscar",
    "/carrinho": "Carrinho",
    "/checkout": "Finalizar Pedido",
    "/notificacoes": "Notificações",
    "/afiliados": "Programa de Afiliados",
    "/agenda": "Agenda Cultural",
    "/agendar": "Agendamentos",
    "/servicos": "Serviços",
    "/classificados": "Classificados",
    "/diretorio": "Guia Local",
    "/empregos": "Vagas e Carreiras",
    "/eventos": "Eventos",
    "/noticias": "Notícias",
    "/imoveis": "Imóveis",
    "/turismo": "Turismo e Viagens",
    "/hospedagem": "Hospedagem",
    "/gastronomia": "Gastronomia",
    "/moda": "Moda",
    "/eletronicos": "Eletrônicos",
    "/pet": "Pet Shop",
    "/farmacia": "Farmácia",
    "/limpeza": "Limpeza",
    "/livros": "Livros",
    "/mercado": "Mercado",
    "/casa": "Casa e Decoração",
    "/acougue": "Açougue",
    "/bebidas": "Bebidas",
    "/construcao": "Construção",
    "/beleza": "Beleza e Estética",
    "/receitas": "Receitas",
    "/explorar": "Explorar",
    "/mural": "Comunidade",
    "/criar-negocio": "Criar Negócio",
    "/contato": "Atendimento",
    "/conta/pedidos": "Meus Pedidos",
    "/conta/enderecos": "Endereços",
    "/conta/financas": "Carteira Digital",
    "/conta/seguranca": "Segurança",
    "/conta/salvos": "Itens Salvos",
    "/conta/notificacoes": "Notificações",
    "/conta/classificados": "Meus Anúncios",
    "/conta/creditos": "Créditos",
    "/conta/tokens": "Tokens",
    "/conta/contratos": "Contratos",
    "/conta/curriculo": "Currículo",
    "/conta/candidaturas": "Candidaturas",
    "/conta/pacotes": "Pacotes",
    "/conta/pagamentos": "Pagamentos",
    "/conta/ingressos": "Ingressos",
    "/conta/gift-cards": "Gift Cards",
    "/conta/lojas": "Minhas Lojas",
    "/conta/metricas": "Métricas",
    "/conta/mobilidade": "Mobilidade",
    "/conta/negociacoes": "Negociações",
    "/conta/processos": "Processos",
    "/conta/suporte": "Suporte",
    "/conta/trocas": "Trocas e Devoluções",
    "/conta/verificacao": "Verificação Civil",
    "/conta/viagens": "Minhas Viagens",
  };
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (map[cleanPath]) return map[cleanPath];
  if (fallbackTitle) return fallbackTitle.replace(/\s+&\s+/g, " e ");
  const seg = cleanPath.split("/").filter(Boolean).pop() || "Waesy";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export interface AppShellProps {
 children: ReactNode;
 session?: any;
 brandSettings?: {
 logo_url?: string | null;
 favicon_url?: string | null;
 show_logo?: boolean;
 show_name?: boolean;
 platform_name?: string;
 } | null;
}

export function AppShell({ children, session, brandSettings }: AppShellProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { isCompact } = useWindowSizeClass();

 useEffect(() => {
   if (typeof window !== "undefined") {
     window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
     document.documentElement.scrollTop = 0;
     document.body.scrollTop = 0;
   }
   if (mainRef.current) {
     mainRef.current.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
     mainRef.current.scrollTop = 0;
   }
 }, [location.pathname]);

  // Check if current page is full-screen standalone auth page, landing form, or mobile customer portal
  const isStandalonePage =
    location.pathname.startsWith("/entrar") ||
    location.pathname.startsWith("/cadastro") ||
    location.pathname.startsWith("/cadastroantecipado") ||
    location.pathname.startsWith("/recuperar-senha") ||
    location.pathname.startsWith("/f/") ||
    location.pathname.startsWith("/m/") ||
    location.pathname.startsWith("/assinar/") ||
    location.pathname.startsWith("/proposta/") ||
    location.pathname.startsWith("/entrega/");

  if (isStandalonePage) {
    return (
      <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-x-hidden">
        {children}
      </div>
    );
  }

 const contextConfig = resolveContextNavigation(location.pathname, session);
 const isFullBleedPage =
 location.pathname.startsWith("/mapa") ||
 location.pathname.startsWith("/mobilidade");

  const isProfilePage =
    location.pathname.startsWith("/membro/") ||
    location.pathname.startsWith("/conta/perfil") ||
    location.pathname.startsWith("/loja") ||
    location.pathname.startsWith("/perfil-da-loja") ||
    location.pathname.startsWith("/diretorio/");

 const isFormPage =
 location.pathname.includes("/classificados/novo") ||
 location.pathname.endsWith("/novo") ||
 location.pathname.endsWith("/editar") ||
 location.pathname.includes("/catalogo/produtos/novo") ||
 location.pathname.includes("/marketing/anuncios/novo");

 // Em páginas imersivas de mapa, o mapa ocupa 100dvh sem header/footer interferindo
 if (isFullBleedPage) {
 return (
 <div className="h-[100dvh] w-full max-w-full bg-background text-foreground font-sans antialiased relative overflow-hidden flex flex-col">
 <main ref={mainRef} className="flex-1 size-full relative overflow-hidden p-0 m-0">
 {children}
 </main>
 <CartSheet />
 </div>
 );
 }

  const isDetailPage =
    (location.pathname.startsWith("/agendar/") && location.pathname !== "/agendar") ||
    (location.pathname.startsWith("/classificados/") && !location.pathname.includes("/novo")) ||
    location.pathname.startsWith("/produto/") ||
    location.pathname.startsWith("/evento/") ||
    (location.pathname.startsWith("/hospedagem/") && location.pathname !== "/hospedagem") ||
    (location.pathname.startsWith("/turismo/") && location.pathname !== "/turismo") ||
    location.pathname.startsWith("/imoveis/") ||
    location.pathname.startsWith("/veiculos/") ||
    location.pathname.startsWith("/vagas/") ||
    (location.pathname.startsWith("/empregos/") && location.pathname !== "/empregos");

  const isCleanMobileAppPage =
    location.pathname.includes("/buscar") ||
    location.pathname.includes("/conta") ||
    location.pathname.includes("/carrinho") ||
    location.pathname.includes("/checkout") ||
    location.pathname.includes("/notificacoes") ||
    location.pathname.includes("/membro") ||
    location.pathname.includes("/u/") ||
    location.pathname.includes("/afiliados") ||
    location.pathname.includes("/agenda") ||
    location.pathname.includes("/pedido") ||
    location.pathname.includes("/conversas") ||
    location.pathname.includes("/turismo") ||
    location.pathname.includes("/hospedagem") ||
    location.pathname.includes("/agendar") ||
    location.pathname.includes("/servicos") ||
    location.pathname.includes("/classificados") ||
    location.pathname.includes("/concurso") ||
    location.pathname.includes("/diretorio") ||
    location.pathname.includes("/empregos") ||
    location.pathname.includes("/eventos") ||
    location.pathname.includes("/noticias") ||
    location.pathname.includes("/imoveis") ||
    location.pathname.includes("/gastronomia") ||
    location.pathname.includes("/moda") ||
    location.pathname.includes("/eletronicos") ||
    location.pathname.includes("/pet") ||
    location.pathname.includes("/farmacia") ||
    location.pathname.includes("/limpeza") ||
    location.pathname.includes("/livros") ||
    location.pathname.includes("/doacoes") ||
    location.pathname.includes("/ofertas") ||
    location.pathname.includes("/salvos") ||
    location.pathname.includes("/negociacoes") ||
    location.pathname.includes("/explorar") ||
    location.pathname.includes("/entregador") ||
    location.pathname.includes("/criar-negocio") ||
    location.pathname.includes("/mural") ||
    location.pathname.includes("/mercado") ||
    location.pathname.includes("/casa") ||
    location.pathname.includes("/acougue") ||
    location.pathname.includes("/bebidas") ||
    location.pathname.includes("/construcao") ||
    location.pathname.includes("/beleza") ||
    location.pathname.includes("/receitas") ||
    location.pathname.includes("/voucher") ||
    location.pathname.includes("/curriculo") ||
    location.pathname.includes("/garcom") ||
    location.pathname.includes("/mobilidade") ||
    location.pathname.includes("/match-time") ||
    location.pathname.includes("/reputacao") ||
    location.pathname.includes("/reclamar") ||
    location.pathname.includes("/admin-master") ||
    location.pathname.includes("/veiculos") ||
    location.pathname.includes("/vagas") ||
    location.pathname.includes("/entrega") ||
    location.pathname.includes("/contato");

  const isFeedPage = location.pathname.startsWith("/feed");
  // isMarketingLanding removido (V99/FASE 1) — LP agora em /cadastroantecipado.

  const hasCustomPageMobileHeader =
    location.pathname === "/conta" ||
    location.pathname === "/conta/" ||
    location.pathname === "/agenda" ||
    location.pathname === "/afiliados" ||
    location.pathname === "/classificados" ||
    location.pathname === "/diretorio" ||
    location.pathname === "/diretorio/" ||
    location.pathname === "/imoveis" ||
    location.pathname === "/servicos" ||
    location.pathname === "/eventos" ||
    location.pathname === "/empregos" ||
    location.pathname === "/empregos/" ||
    location.pathname === "/agendar" ||
    location.pathname === "/agendar/" ||
    location.pathname === "/turismo" ||
    location.pathname === "/turismo/" ||
    location.pathname.startsWith("/doacoes") ||
    location.pathname.startsWith("/ofertas") ||
    location.pathname.startsWith("/conta/conversas") ||
    location.pathname.startsWith("/conta/agendamentos") ||
    location.pathname.startsWith("/conta/classificados") ||
    location.pathname.startsWith("/conta/negociacoes") ||
    location.pathname.startsWith("/conta/comissoes") ||
    location.pathname.startsWith("/conta/curriculo") ||
    location.pathname.startsWith("/conta/empresa") ||
    location.pathname.startsWith("/conta/ingressos") ||
    location.pathname.startsWith("/conta/notificacoes") ||
    location.pathname.startsWith("/conta/pedidos") ||
    location.pathname.startsWith("/destaques/") ||
    location.pathname.startsWith("/admin-master");

  const shouldRenderGlobalNativeMobileHeader =
    isCleanMobileAppPage &&
    !isProfilePage &&
    !isFormPage &&
    !isDetailPage &&
    !hasCustomPageMobileHeader;

  return (
    <div className="h-[100dvh] w-full max-w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans antialiased relative flex flex-col overflow-hidden">
      {/* ── Barra de Topo Horizontal (Ocultada no Mobile em Telas Nativas de App, Perfil, Formulário e Afiliados) ── */}
      <div className={isProfilePage || isFormPage || isCleanMobileAppPage || isDetailPage ? "hidden md:block" : ""}>
        <TopBar
          session={session}
          brandSettings={brandSettings}
        />
      </div>

      {/* ── Cabeçalho Nativo iOS Automático para Submódulos e Páginas Limpas Mobile ── */}
      {shouldRenderGlobalNativeMobileHeader && (
        <NativeMobileHeader
          title={resolveCleanMobileTitle(location.pathname, (contextConfig as any)?.title)}
          fallbackHref={location.pathname.startsWith("/conta/") ? "/conta" : "/"}
          mobileOnly
        />
      )}

      {/* ── Corpo Principal com Scrolls Independentes (Sidebar fixa + Main independente) ── */}
      <div className="flex-1 flex min-w-0 w-full max-w-full relative overflow-hidden">
        {/* Coluna Contextual Fixa com Scroll Próprio (Desktop apenas) */}
        {contextConfig.showContextSidebar !== false && (
          <ContextSidebar config={contextConfig} session={session} />
        )}

        {/* Viewport Central com Container Canônico Único + Container Query Anti-Jank */}
        <main
          ref={mainRef}
          className={`main-container-query flex-1 flex flex-col min-w-0 h-full w-full max-w-full overflow-y-auto no-scrollbar overflow-x-hidden ${
            isFeedPage || isCleanMobileAppPage
              ? "px-[1px] md:px-4 pt-0 md:pt-2.5 pb-24 md:pb-8"
              : isFormPage
              ? "px-[1px] md:px-6 pt-0 md:pt-3 pb-20 md:pb-8"
              : isDetailPage
              ? "px-[1px] md:px-6 py-0 md:py-2 pb-20 md:pb-8"
              : "px-[1px] md:px-6 pt-0 md:pt-2.5 pb-24 md:pb-8"
          }`}
        >
          <div className={`w-full mx-auto flex flex-col items-stretch min-w-0 flex-1 ${
            isFeedPage
              ? "max-w-2xl"
              : isFormPage 
              ? "max-w-7xl" 
              : "max-w-7xl 2xl:max-w-[1440px]"
          }`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation com Botão Criar Flutuante & Action Sheet (Ocultado em páginas de detalhe para liberar a barra de compra/conversão) */}
      {isCompact && !isDetailPage && <MobileNav session={session} userRole={session?.role} />}

      {/* Indicador Flutuante de Conexão Offline */}
      <OfflineIndicator />

      {/* Global Cart Slide-over */}
      <CartSheet />

      {/* Onboarding de Interesses da Comunidade */}
      <InterestPickerModal />

      {/* Solicitação Canônica de Localização (GPS Geolocation Sheet) */}
      <GeolocationPermissionSheet />

      {/* Banner Não-Intrusivo de Instalação PWA (Dispensável / Snooze 24h) */}
      <PWAInstallBanner
        storeName={brandSettings?.platform_name || "Waesy"}
        storeLogoUrl={brandSettings?.favicon_url || brandSettings?.logo_url || undefined}
      />
    </div>
  );
}
