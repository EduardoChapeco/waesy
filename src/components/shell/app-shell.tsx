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
import { WaesyCopilotDrawer } from "@/components/chat/waesy-copilot-drawer";
import { SuperAppModuleDrawer } from "./SuperAppModuleDrawer";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { ActiveContextBanner } from "./context-banner";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { useSuperAppDrawer } from "@/lib/drawer-store";
import { cn } from "@/lib/utils";

function resolveCleanMobileTitle(pathname: string, fallbackTitle?: string): string {
  const map: Record<string, string> = {
    "/marketplace": "Marketplace",
    "/copilot": "Waesy Copilot",
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

/**
 * Determina se a rota ativa renderiza seu próprio NativeMobileHeader ou cabeçalho dedicado,
 * impedindo a renderização duplicada de cabeçalho global pelo AppShell.
 */
export function checkHasCustomPageMobileHeader(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";

  const exactCustomRoutes = new Set([
    "/",
    "/gastronomia",
    "/mercado",
    "/farmacia",
    "/bebidas",
    "/acougue",
    "/pet",
    "/conta",
    "/agenda",
    "/afiliados",
    "/classificados",
    "/marketplace",
    "/diretorio",
    "/imoveis",
    "/servicos",
    "/eventos",
    "/empregos",
    "/agendar",
    "/turismo",
    "/faq",
    "/moda",
    "/eletronicos",
    "/casa",
    "/construcao",
    "/beleza",
    "/limpeza",
    "/livros",
  ]);

  if (exactCustomRoutes.has(clean)) return true;

  const prefixCustomRoutes = [
    "/eventos",
    "/doacoes",
    "/ofertas",
    "/recuperar-senha",
    "/redefinir-senha",
    "/destaques",
    "/admin-master",
    "/conta/atividade",
    "/conta/avaliacoes",
    "/conta/candidaturas",
    "/conta/carnes",
    "/conta/creditos",
    "/conta/enderecos",
    "/conta/entregador",
    "/conta/eventos",
    "/conta/financas",
    "/conta/gift-cards",
    "/conta/lojas",
    "/conta/pacotes",
    "/conta/pagamentos",
    "/conta/salvos",
    "/conta/seguranca",
    "/conta/suporte",
    "/conta/tokens",
    "/conta/trocas",
    "/conta/viagens",
    "/conta/conversas",
    "/conta/agendamentos",
    "/conta/classificados",
    "/conta/negociacoes",
    "/conta/comissoes",
    "/conta/curriculo",
    "/conta/empresa",
    "/conta/ingressos",
    "/conta/contratos",
    "/conta/notificacoes",
    "/conta/pedidos",
    "/c",
  ];

  return prefixCustomRoutes.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
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
  const { isOpen: isSuperAppOpen, setOpen: setIsSuperAppOpen } = useSuperAppDrawer();

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
      <div className="min-h-dvh w-full bg-background text-foreground flex flex-col overflow-x-hidden">
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
 <div className="h-dvh w-full max-w-full bg-background text-foreground font-sans antialiased relative overflow-hidden flex flex-col">
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
    location.pathname === "/" ||
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
    location.pathname.includes("/marketplace") ||
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
    location.pathname.startsWith("/c/") ||
    location.pathname.includes("/c/") ||
    location.pathname.includes("/contato");

  const isFeedPage = location.pathname.startsWith("/feed");
  // isMarketingLanding removido (V99/FASE 1) — LP agora em /cadastroantecipado.

  const hasCustomPageMobileHeader = checkHasCustomPageMobileHeader(location.pathname);

  const isCopilotPage = location.pathname.startsWith("/copilot");

  const shouldRenderGlobalNativeMobileHeader =
    isCleanMobileAppPage &&
    !isProfilePage &&
    !isFormPage &&
    !isDetailPage &&
    !hasCustomPageMobileHeader &&
    !isCopilotPage;

  return (
    <div className="h-dvh w-full max-w-full bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans antialiased relative flex flex-col overflow-hidden">
      {/* ── Canvas Principal com Efeito Push Lateral (Threads / iOS Parity) ── */}
      <div
        id="app-push-canvas"
        className={cn(
          "size-full flex flex-col relative canvas-push-transition",
          isSuperAppOpen &&
            "max-md:canvas-pushed max-md:rounded-l-2xl max-md:overflow-hidden max-md:pointer-events-none max-md:border-l max-md:border-border/40"
        )}
      >
        {/* ── Barra de Topo Horizontal (Ocultada no Mobile em Telas Nativas de App, Perfil, Formulário, Copilot e Afiliados) ── */}
      <div className={isProfilePage || isFormPage || isCleanMobileAppPage || isDetailPage || isCopilotPage ? "hidden md:block" : ""}>
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

      {/* ── Banner Global de Contexto Não-Civil (Aviso de Identidade Ativa) ── */}
      <ActiveContextBanner session={session} />

      {/* ── Corpo Principal com Scrolls Independentes (Sidebar fixa + Main independente) ── */}
      <div className="flex-1 flex min-w-0 w-full max-w-full relative overflow-hidden">
        {/* Coluna Contextual Fixa com Scroll Próprio (Desktop apenas) */}
        {contextConfig.showContextSidebar !== false && (
          <ContextSidebar config={contextConfig} session={session} />
        )}

        {/* Viewport Central com Container Canônico Único + Container Query Anti-Jank */}
        <main
          ref={mainRef}
          className={`main-container-query flex-1 flex flex-col min-w-0 h-full w-full max-w-full ${
            isCopilotPage
              ? "p-0 m-0 overflow-hidden min-h-0"
              : isCleanMobileAppPage
              ? "overflow-y-auto no-scrollbar overflow-x-hidden px-0 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
              : isFeedPage
              ? "overflow-y-auto no-scrollbar overflow-x-hidden px-2 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
              : isFormPage
              ? "overflow-y-auto no-scrollbar overflow-x-hidden px-2 sm:px-6 md:px-8 pt-0 md:pt-4 pb-20 md:pb-8"
              : isDetailPage
              ? "overflow-y-auto no-scrollbar overflow-x-hidden px-2 sm:px-6 md:px-8 py-0 md:py-3 pb-20 md:pb-8"
              : "overflow-y-auto no-scrollbar overflow-x-hidden px-2 sm:px-6 md:px-8 pt-0 md:pt-3 pb-24 md:pb-8"
          }`}
        >
          <div className={`w-full mx-auto flex flex-col items-stretch min-w-0 flex-1 ${
            isCopilotPage
              ? "size-full max-w-none overflow-hidden min-h-0"
              : isFeedPage
              ? "max-w-2xl"
              : isFormPage 
              ? "max-w-7xl" 
              : "max-w-7xl 2xl:max-w-desktop"
          }`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation com Botão Criar Flutuante & Action Sheet (Ocultado em páginas de detalhe e no copilot para manter o input de chat acessível) */}
      {!isDetailPage && !isCopilotPage && <MobileNav session={session} userRole={session?.role} />}
      </div>

      {/* ── Menu Lateral Mobile Push Sheet (Paridade iFood & Threads) ── */}
      <SuperAppModuleDrawer
        open={isSuperAppOpen}
        onOpenChange={setIsSuperAppOpen}
        session={session}
        userRole={session?.role}
        brandName={brandSettings?.platform_name}
      />

      {/* Waesy Copilot Drawer Global Flutuante */}
      <WaesyCopilotDrawer session={session} />

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
