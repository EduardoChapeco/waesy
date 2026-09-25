import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Store,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  Layers,
  ShoppingBag,
  Boxes,
  Users,
  Briefcase,
  Bot,
  FileText,
  Search,
  Zap,
  Globe,
  Compass,
  UtensilsCrossed,
  Scale,
  Newspaper,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Check,
  Building2,
  TrendingUp,
  Sliders,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FounderSignupSheet } from "@/components/landing/founder-signup-sheet";
import type { LaunchLandingSettingsDTO } from "@/services/launch.functions";
import type { CnpjCompanyDTO } from "@/services/public-apis.functions";

interface EnterpriseLandingViewProps {
  initialSettings?: LaunchLandingSettingsDTO | null;
}

export function EnterpriseLandingView({ initialSettings }: EnterpriseLandingViewProps) {
  const [isFounderSheetOpen, setIsFounderSheetOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<{
    companyName: string;
    responsibleName: string;
    whatsapp: string;
    ticketNumber: string;
    city: string;
    companyDetails: CnpjCompanyDTO | null;
  } | null>(null);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 overflow-x-hidden">
      {/* ── 1. HEADER ENTERPRISE (APPLE HIG & STRIPE STANDARD - TOPO ÚNICO) ── */}
      <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo Waesy */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer shrink-0">
            <div className="size-9 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-foreground leading-none">
                waesy
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
                Enterprise
              </span>
            </div>
          </Link>

          {/* Navegação Desktop (lg+) — Links Inline Limpos */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2 text-xs font-semibold text-muted-foreground">
            <button
              type="button"
              onClick={() => scrollToSection("ecossistema")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Ecossistema
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("workspace")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Workspace ERP
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("builder")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Construtor Omni
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("ia")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Inteligência Artificial
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("conexoes")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Canais & Google
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("circuito")}
              className="px-3 py-2 rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              Circuito 2027
            </button>
          </nav>

          {/* Ações à Direita */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground h-9 px-3 gap-1.5"
            >
              <Link to="/explorar">
                <Store className="size-3.5" />
                <span>Explorar Vitrine</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-bold rounded-xl border-border/80 hover:bg-muted text-foreground h-9 px-3.5 gap-1.5 shadow-2xs cursor-pointer"
            >
              <Link to="/entrar">
                <LogIn className="size-3.5 text-primary" />
                <span>Entrar</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 h-9 px-4 gap-1.5 shadow-xs cursor-pointer"
            >
              <Link to="/criar-negocio">
                <span>Criar Negócio</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>

            {/* Menu Hamburger para Dispositivos Móveis (< lg) */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lg:hidden size-9 rounded-xl border border-border/70 flex items-center justify-center text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="size-4.5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-6 bg-background flex flex-col justify-between">
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between pb-4 border-b border-border/60">
                    <span className="font-extrabold text-lg tracking-tight">waesy</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      Menu
                    </Badge>
                  </div>

                  <nav className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection("ecossistema")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Ecossistema
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("workspace")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Workspace ERP & Operações
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("builder")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Construtor Omni
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("ia")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Inteligência Artificial
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("conexoes")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Conexões & Google
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("circuito")}
                      className="text-left py-2.5 px-3 rounded-xl hover:bg-muted/60 text-sm font-semibold text-foreground transition-colors"
                    >
                      Circuito 2027
                    </button>
                  </nav>
                </div>

                <div className="space-y-3 pt-6 border-t border-border/60">
                  <Button asChild className="w-full h-11 rounded-xl text-xs font-bold gap-2">
                    <Link to="/criar-negocio">
                      <span>Criar Meu Negócio</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-11 rounded-xl text-xs font-bold gap-2">
                    <Link to="/entrar">
                      <LogIn className="size-4 text-primary" />
                      <span>Acessar Painel Logado</span>
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION DE ALTO IMPACTO (APPLE HIG STANDARD) ── */}
      <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center space-y-6 sm:space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/40 text-foreground text-xs font-semibold shadow-2xs">
          <Sparkles className="size-3.5 text-primary" />
          <span>O Sistema Operacional Definitivo para Negócios Regionais</span>
        </div>

        <h1 className="text-3xl sm:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.12] max-w-4xl mx-auto [text-wrap:balance]">
          A plataforma unificada de comércio, ERP e inteligência para sua região.
        </h1>

        <p className="text-sm sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto [text-wrap:pretty]">
          Do construtor de e-commerce e cardápios online à gestão de equipe, recrutamento com IA, controle de estoque e sincronização com Google e Marketplaces.
        </p>

        {/* CTAs Principais */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-xs cursor-pointer"
          >
            <Link to="/criar-negocio">
              <span>Cadastrar Meu Negócio Gratuitamente</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-12 px-7 rounded-2xl text-sm font-bold border-border/80 hover:bg-muted text-foreground gap-2 cursor-pointer"
          >
            <Link to="/explorar">
              <Store className="size-4 text-primary" />
              <span>Ver Vitrine Comercial</span>
            </Link>
          </Button>
        </div>

        {/* Matriz de Prova de Confiança (4 Métricas Reais) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 pt-10 sm:pt-14 max-w-4xl mx-auto">
          <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/50 text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">350+</span>
            <p className="text-xs font-semibold text-muted-foreground">Módulos & Telas Nativas</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/50 text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-primary">100%</span>
            <p className="text-xs font-semibold text-muted-foreground">Server-Authoritative (Zero Fake)</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/50 text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-foreground">Multi-Tenant</span>
            <p className="text-xs font-semibold text-muted-foreground">RLS Deny-by-Default Isolado</p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/50 text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">24/7</span>
            <p className="text-xs font-semibold text-muted-foreground">Google, Meta & Marketplaces</p>
          </div>
        </div>
      </section>

      {/* ── 3. BENTO GRID ASSIMÉTRICO DE ECOSSISTEMA (ENTERPRISE BLUEPRINT) ── */}
      <section id="ecossistema" className="py-12 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-10 sm:space-y-14">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
            Arquitetura Modular
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Tudo o que sua empresa precisa em uma única infraestrutura.
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Elimine 10 assinaturas de softwares isolados. O Waesy integra operação, presença pública e crescimento num só lugar.
          </p>
        </div>

        {/* O Grid Bento Assimétrico */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* BLOCO 1 (Largo - 8 Colunas): Workspace ERP & Governança 360° */}
          <div
            id="workspace"
            className="lg:col-span-8 p-6 sm:p-8 rounded-3xl border border-border/70 bg-card flex flex-col justify-between space-y-6 shadow-2xs hover:border-foreground/20 transition-colors"
          >
            <div className="space-y-4">
              <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Boxes className="size-5.5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                  Gestão Empresarial & Operação
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  Workspace ERP: PDV, RH, Estoque e Recrutamento
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Controle financeiro de caixa com turnos e fechamento cego, comissão automática da equipe, gestão de ponto eletrônico com PIN e um módulo completo de Recrutamento (ATS) para publicação de vagas e triagem de currículos.
                </p>
              </div>

              {/* Sub-cards de Recursos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <ShoppingBag className="size-4 text-primary" />
                    <span>Frente de Caixa (PDV)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Operação veloz em tablets e desktops, com comandas, mesas e emissão de recibos.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Users className="size-4 text-primary" />
                    <span>RH & Recrutamento (ATS)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Gestão de colaboradores, holerites, ponto e triagem autônoma de candidatos.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">Módulos: /workspace/*</span>
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold gap-1 text-primary">
                <Link to="/workspace">
                  <span>Conhecer o Workspace</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* BLOCO 2 (Quadrado - 4 Colunas): Construtor Omni de Presença */}
          <div
            id="builder"
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl border border-border/70 bg-card flex flex-col justify-between space-y-6 shadow-2xs hover:border-foreground/20 transition-colors"
          >
            <div className="space-y-4">
              <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Layers className="size-5.5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider font-mono">
                  Presença & CMS Visual
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  Construtor Omni
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Crie páginas, vitrines de produtos, cardápios online com modificadores, biolinks para o Instagram e roteiros turísticos completos em minutos.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Editor visual estilo Framer / Wix nativo</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Cardápios com KDS para a cozinha</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Hub de Turismo com vouchers e contratos</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground font-mono">Zero código necessário</span>
            </div>
          </div>

          {/* BLOCO 3 (Quadrado - 4 Colunas): Motores de Inteligência Artificial */}
          <div
            id="ia"
            className="lg:col-span-4 p-6 sm:p-8 rounded-3xl border border-border/70 bg-card flex flex-col justify-between space-y-6 shadow-2xs hover:border-foreground/20 transition-colors"
          >
            <div className="space-y-4">
              <div className="size-11 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Bot className="size-5.5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">
                  Automação Autônoma
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  Motores de IA & OCR
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  IA SDR para atendimento e conversão 24h no WhatsApp, leitura multimodal OCR de contratos e notas fiscais e motor de precificação dinâmica.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>SDR Autônomo com qualificação de leads</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>OCR para digitalizar cardápios e tabelas</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <Check className="size-3.5 text-emerald-600" />
                  <span>Geração automatizada de encartes</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground font-mono">Inteligência Real no Banco</span>
            </div>
          </div>

          {/* BLOCO 4 (Largo - 8 Colunas): Conectividade Total & Canais */}
          <div
            id="conexoes"
            className="lg:col-span-8 p-6 sm:p-8 rounded-3xl border border-border/70 bg-card flex flex-col justify-between space-y-6 shadow-2xs hover:border-foreground/20 transition-colors"
          >
            <div className="space-y-4">
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Globe className="size-5.5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider font-mono">
                  Alcance & Distribuição
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  Conectividade Total: Google, Marketplaces e Imprensa
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Sincronize seu catálogo automaticamente com Google Meu Negócio, gere feeds XML/CSV para Instagram Shopping (Meta Ads), integre com marketplaces e participe do consórcio regional de notícias e do ecossistema jurídico JUS.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Search className="size-4 text-emerald-600" />
                    <span>Google Meu Negócio & Meta</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Sincronização contínua de horários, produtos e avaliações dos clientes.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                    <Newspaper className="size-4 text-emerald-600" />
                    <span>Imprensa & Notícias Locais</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Veiculação de comunicados e artigos patrocinados na rede de notícias regional.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">Integrações de API Reais</span>
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold gap-1 text-emerald-600">
                <Link to="/workspace/configuracoes/integracoes">
                  <span>Ver Integrações</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. CIRCUITO INTERNACIONAL 2027 & MEMBROS FUNDADORES ── */}
      <section id="circuito" className="py-12 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="p-6 sm:p-12 rounded-3xl bg-foreground text-background relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-left">
            <Badge className="bg-background/20 text-background border-none text-xs font-mono uppercase">
              Temporada Oficial 2027
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Circuito Internacional Waesy 2027
            </h2>
            <p className="text-xs sm:text-sm text-background/80 leading-relaxed">
              Garanta sua vaga como Membro Fundador em Chapecó e São Miguel do Oeste. Shows nacionais e internacionais, feira de negócios e tecnologia, capacitação executiva e sorteios de viagens durante todo o ano de 2027.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-background">
                <CheckCircle2 className="size-4 text-primary" />
                <span>100% Gratuito para Fundadores</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-background">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Acesso VIP a Shows & Feiras</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              onClick={() => setIsFounderSheetOpen(true)}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              <Sparkles className="size-4 mr-2" />
              <span>Garantir Meu Título de Fundador</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl text-xs sm:text-sm font-bold border-background/30 text-background hover:bg-background/10 cursor-pointer"
            >
              <Link to="/concursos">
                <span>Ver Sorteios & Prêmios</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 5. FOOTER CORPORATIVO LIMPO & SILENCIOSO ── */}
      <footer className="border-t border-border/60 bg-muted/20 py-12 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-sm">
              W
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">Waesy Platform</span> • Chapecó &amp; São Miguel do Oeste, SC.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground font-medium">
            <Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade &amp; LGPD</Link>
            <Link to="/contato" className="hover:text-foreground transition-colors">Suporte</Link>
            <Link to="/workspace" className="hover:text-foreground transition-colors">Workspace</Link>
            <Link to="/criar-negocio" className="hover:text-foreground transition-colors">Criar Negócio</Link>
          </div>
        </div>
      </footer>

      {/* Sheet de Cadastro de Membro Fundador */}
      <FounderSignupSheet
        isOpen={isFounderSheetOpen}
        onOpenChange={setIsFounderSheetOpen}
        onSuccess={(profile) => {
          setCreatedProfile(profile);
          setIsFounderSheetOpen(false);
        }}
      />
    </div>
  );
}
