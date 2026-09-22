import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Ticket,
  ArrowRight,
  Compass,
  Store,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  PartyPopper,
  Search,
  Loader2,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  lookupFounderTicket,
  type LaunchLandingSettingsDTO,
} from "@/services/launch.functions";
import type { CnpjCompanyDTO } from "@/services/public-apis.functions";
import { LaunchCarousel } from "@/components/landing/launch-carousel";
import { FounderSignupSheet } from "@/components/landing/founder-signup-sheet";
import { FounderSmartphoneMockup } from "@/components/landing/founder-smartphone-mockup";

interface LaunchHomeViewProps {
  initialSettings?: LaunchLandingSettingsDTO | null;
}

export function LaunchHomeView({ initialSettings }: LaunchHomeViewProps) {
  const settings: LaunchLandingSettingsDTO = initialSettings || {
    key: "default",
    hero_badge: "Circuito 2027 • Chapecó & São Miguel do Oeste",
    hero_title: "O novo ponto de encontro do comércio, turismo e conexões",
    hero_subtitle:
      "Uma experiência completa que conecta clientes aos melhores negócios da nossa região com tecnologia, eventos e benefícios exclusivos.",
    slides: [
      {
        id: "slide-1",
        title: "Shows Nacionais & Internacional",
        tag: "Música & Cultura",
        image_url:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "slide-2",
        title: "Feira de Negócios & Inovação",
        tag: "Conexões Regionais",
        image_url:
          "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "slide-3",
        title: "Workshops & Mentorias Executivas",
        tag: "Capacitação",
        image_url:
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "slide-4",
        title: "Sorteio de Viagens o Ano Inteiro 2027",
        tag: "Exclusivo Fundadores",
        image_url:
          "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    event_info: {
      circuito_title: "Circuito Internacional Waesy 2027",
      dates: "Temporada 2027",
      locations: "Chapecó & São Miguel do Oeste - SC",
      perks: [
        "Shows nacionais consagrados e atração internacional confirmada",
        "Feira de Negócios e Tecnologia com estandes para empresas parceiras",
        "Workshops práticos para lojistas, prestadores de serviços e empreendedores",
        "Sorteios de viagens nacionais e internacionais durante todo o ano de 2027",
        "Membros Fundadores com chances aumentadas nos sorteios oficiais",
      ],
    },
  };

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<{
    companyName: string;
    responsibleName: string;
    whatsapp: string;
    ticketNumber: string;
    city: string;
    companyDetails: CnpjCompanyDTO | null;
  } | null>(null);

  const [lookupQuery, setLookupQuery] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim() || lookupQuery.trim().length < 3) {
      toast.error("Digite ao menos 3 caracteres do seu WhatsApp ou Ticket");
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await lookupFounderTicket({ data: { query: lookupQuery.trim() } });
      if (res.found && res.lead) {
        setCreatedProfile({
          companyName:
            res.lead.company_name ||
            res.companyDetails?.tradeName ||
            res.companyDetails?.corporateName ||
            res.lead.name,
          responsibleName: res.lead.name,
          whatsapp: res.lead.whatsapp,
          ticketNumber: res.ticketNumber || res.lead.ticket_number,
          city: res.lead.city || "Chapecó / SMO",
          companyDetails: res.companyDetails,
        });
        toast.success(`Inscrição localizada! Ticket: ${res.lead.ticket_number}`);
      } else {
        toast.error("Nenhuma inscrição encontrada com este WhatsApp ou Ticket.", {
          description: "Você pode garantir sua vaga agora mesmo clicando no botão abaixo!",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar inscrição.");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Trigger automático ao rolar perto do final (70% do scroll)
  const hasAutoTriggeredRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (hasAutoTriggeredRef.current || createdProfile) return;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const progress = window.scrollY / scrollHeight;
      if (progress > 0.7) {
        hasAutoTriggeredRef.current = true;
        setIsSheetOpen(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [createdProfile]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 pb-28">
      {/* ── HEADER SUPERIOR ELEGANTE (APPLE HIG) ── */}
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-border/70">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Waesy */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground leading-none">
                waesy
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                plataforma regional
              </span>
            </div>
          </Link>

          {/* Ações do Topo */}
          <div className="flex items-center gap-2 sm:gap-2.5">
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

            {/* CTA Seja Fundador */}
            <Button
              size="sm"
              onClick={() => setIsSheetOpen(true)}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer hover:bg-primary/90"
            >
              <Sparkles className="size-3.5" />
              <span>Seja Fundador</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── CORPO PRINCIPAL ── */}
      <main className="max-w-5xl mx-auto px-4 pt-6 sm:pt-10 space-y-10 sm:space-y-14 flex-1">

        {/* 1. HERO SECTION */}
        <section className="text-center space-y-5 max-w-2xl mx-auto pt-2">
          <Badge
            variant="outline"
            className="rounded-full bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs animate-pulse"
          >
            <Sparkles className="size-3.5" />
            <span>{settings.hero_badge}</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight sm:leading-tight">
            {settings.hero_title}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {settings.hero_subtitle}
          </p>

          {/* Contador de Fundadores */}
          <div className="flex items-center justify-center gap-6 py-1">
            <div className="text-center">
              <div className="text-2xl font-black text-foreground font-mono">2027</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Circuito</div>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center">
              <div className="text-2xl font-black text-primary font-mono">100%</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Gratuito</div>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center">
              <div className="text-2xl font-black text-foreground font-mono">2&nbsp;<span className="text-primary">cidades</span></div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Chapecó &amp; SMO</div>
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => setIsSheetOpen(true)}
              className="w-full sm:w-auto h-12 rounded-2xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground px-6 gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Garantir Vaga de Membro Fundador</span>
              <ArrowRight className="size-4" />
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 rounded-2xl text-xs sm:text-sm font-semibold border-border/80 px-5 gap-1.5"
            >
              <a href="#circuito-2027">
                <span>Ver Programação &amp; Benefícios</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </a>
            </Button>
          </div>
        </section>

        {/* 2. CARROSSEL HORIZONTAL DE ATRAÇÕES */}
        <section className="space-y-2">
          <LaunchCarousel slides={settings.slides} />
        </section>

        {/* 3. SEÇÃO CIRCUITO INTERNACIONAL WAESY 2027 */}
        <section
          id="circuito-2027"
          className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/30 to-muted/10 p-6 sm:p-10 space-y-6"
        >
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <PartyPopper className="size-4" />
              <span>Evento & Conexões Regionais</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {settings.event_info?.circuito_title || "Circuito Internacional Waesy 2027"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Uma celebração que une empresas, empreendedores e famílias em Chapecó e São Miguel do Oeste com grandes atrações e tecnologia.
            </p>
          </div>

          {/* Destaques do Circuito */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {(settings.event_info?.perks || []).map((perk, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  0{i + 1}
                </div>
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {perk}
                </p>
              </div>
            ))}
          </div>

          {/* Card de Destaque: Sorteio Anual de Viagens */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-amber-500/10 border border-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Sorteio de Viagens o Ano Inteiro 2027
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                Clientes, usuários e lojistas credenciados concorrem a viagens exclusivas a cada mês de 2027. Membros Fundadores recebem tickets adicionais e chances aumentadas.
              </p>
            </div>
            <Button
              onClick={() => setIsSheetOpen(true)}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-11 px-5 shrink-0 shadow-xs cursor-pointer"
            >
              Participar da Lista
            </Button>
          </div>
        </section>

        {/* 4. DEMONSTRAÇÃO DO SMARTPHONE MOCKUP 3D COM CONSULTA DE INSCRIÇÃO */}
        <section className="space-y-4 pt-2 text-center">
          <div className="space-y-1">
            <Badge variant="outline" className="text-[11px] font-bold text-muted-foreground border-border">
              Visualização Antecipada
            </Badge>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Veja como sua empresa aparecerá na Waesy
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Perfil digital, vitrine de produtos, canal de WhatsApp direto e selo oficial de Membro Fundador.
            </p>
          </div>

          {/* Caixa de Consulta Rápida de Inscrição */}
          <form
            onSubmit={handleLookup}
            className="max-w-md mx-auto p-3 rounded-2xl bg-muted/20 border border-border/80 space-y-2 text-left"
          >
            <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Search className="size-3.5 text-primary" />
              <span>Já garantiu sua vaga? Consulte seu bilhete oficial da sorte:</span>
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Seu WhatsApp ou Ticket (ex: WF-2027-...)"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="h-10 rounded-xl text-xs bg-card"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isLookingUp}
                className="rounded-xl text-xs font-bold h-10 px-4 shrink-0 bg-primary text-primary-foreground cursor-pointer"
              >
                {isLookingUp ? <Loader2 className="size-3.5 animate-spin" /> : "Consultar"}
              </Button>
            </div>
          </form>

          <div className="pt-3">
            {createdProfile ? (
              <FounderSmartphoneMockup
                companyName={createdProfile.companyName}
                responsibleName={createdProfile.responsibleName}
                whatsapp={createdProfile.whatsapp}
                ticketNumber={createdProfile.ticketNumber}
                city={createdProfile.city}
                companyDetails={createdProfile.companyDetails}
                onReset={() => setCreatedProfile(null)}
              />
            ) : (
              <FounderSmartphoneMockup
                companyName="Sua Loja / Negócio Aqui"
                responsibleName="Seu Nome"
                whatsapp="49999999999"
                ticketNumber="WF-2027-EXEMPLO"
                city="Chapecó & São Miguel do Oeste"
              />
            )}
          </div>
        </section>

        {/* 5. NICHOS INTEGRADOS NO ECOSSISTEMA */}
        <section className="space-y-4 pt-2">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Tudo o que sua cidade e região precisam em um só lugar
            </h3>
            <p className="text-xs text-muted-foreground">
              Estruturado para valorizar o comércio local e o turismo regional.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                title: "Turismo & Roteiros",
                desc: "Pacotes, passagens e reservas de viagens locais",
                icon: Compass,
                to: "/turismo",
              },
              {
                title: "Comércio & PDV",
                desc: "Vendas ágeis no balcão e vitrine online integrada",
                icon: Store,
                to: "/explorar",
              },
              {
                title: "Agenda & Serviços",
                desc: "Agendamentos diretos e lembretes por WhatsApp",
                icon: CalendarDays,
                to: "/agenda",
              },
              {
                title: "Classificados & Vagas",
                desc: "Imóveis, veículos, oportunidades e classificados",
                icon: ShieldCheck,
                to: "/classificados",
              },
            ].map((nicho, idx) => (
              <Link
                key={idx}
                to={nicho.to as any}
                className="rounded-2xl border border-border/80 bg-card p-4 space-y-2 text-center flex flex-col items-center justify-center hover:border-primary/40 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
              >
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <nicho.icon className="size-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {nicho.title}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {nicho.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ── FLOATING DOCK NA THUMB ZONE INFERIOR (MOBILE & DESKTOP) ── */}
      <div className="fixed bottom-3 inset-x-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 p-2 shadow-xl flex items-center justify-between gap-3 ring-1 ring-black/5">
            <div className="pl-2 min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3 shrink-0" />
                <span className="truncate">Circuito 2027 Aberto</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                Chances multiplicadas no sorteio de viagens
              </p>
            </div>

            <Button
              onClick={() => setIsSheetOpen(true)}
              className="h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground px-4 gap-1.5 shrink-0 shadow-xs cursor-pointer hover:bg-primary/90"
            >
              <span>Garantir Vaga</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── SHEET MODAL DE INSCRIÇÃO ── */}
      <FounderSignupSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={(result) => {
          setCreatedProfile(result);
          window.scrollTo({ top: 850, behavior: "smooth" });
        }}
      />
    </div>
  );
}
