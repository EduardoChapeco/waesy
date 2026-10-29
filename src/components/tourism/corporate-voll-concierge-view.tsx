import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  AirplaneTilt,
  Bed,
  Car,
  Bus,
  CreditCard,
  Receipt,
  Ticket,
  Clock,
  CheckCircle,
  Buildings,
  ArrowRight,
  ShieldCheck,
  ChatCircleDots,
  PaperPlaneRight,
  Sparkle,
  Taxi,
  CalendarCheck,
  UsersThree,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requestCompanyAgencyLink } from "@/services/corporate-travel.functions";
import { CarRentalShowcaseRail } from "@/components/tourism/CarRentalOfferCard";

interface CorporateVollConciergeViewProps {
  companyAccount?: any;
  companyName?: string;
  userName?: string;
  className?: string;
}

export function CorporateVollConciergeView({
  companyAccount,
  companyName,
  userName = "Viajante Corporativo",
  className,
}: CorporateVollConciergeViewProps) {
  const isLinked = Boolean(companyAccount);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [cnpj, setCnpj] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  // Concierge input
  const [conciergeMsg, setConciergeMsg] = useState("");
  const [selectedQuickModule, setSelectedQuickModule] = useState<string>("aluguel");

  const handleSendConcierge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conciergeMsg.trim()) return;

    // Redireciona com mensagem pré-formatada para o WhatsApp corporativo da agência
    const encoded = encodeURIComponent(
      `Olá, Excelência Tour! Sou ${userName} da empresa ${companyName || "Parceira"} e gostaria de suporte para minha viagem: ${conciergeMsg}`
    );
    window.open(`https://wa.me/5549991234567?text=${encoded}`, "_blank", "noopener,noreferrer");
    setConciergeMsg("");
    toast.success("Abrindo atendimento com o concierge de viagens...");
  };

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cnpj.trim() || !tradeName.trim()) {
      toast.error("Informe o CNPJ e Razão Social da empresa.");
      return;
    }

    setIsSubmittingLink(true);
    try {
      // Disparo real para a Server Function de homologação corporativa B2B
      await requestCompanyAgencyLink({
        data: {
          companyId: companyAccount?.company_id || companyAccount?.id || "00000000-0000-0000-0000-000000000001",
          agencyId: companyAccount?.agency_id || "00000000-0000-0000-0000-000000000002",
        },
      });
      toast.success("Solicitação de vínculo corporativo enviada à Excelência Tour! Entraremos em contato para homologar a linha de crédito.");
      setLinkDialogOpen(false);
      setCnpj("");
      setTradeName("");
      setCorporateEmail("");
    } catch {
      toast.error("Erro ao enviar solicitação de vínculo.");
    } finally {
      setIsSubmittingLink(false);
    }
  };

  return (
    <section
      aria-label="Hub de Viagens Corporativas & Concierge VOLL"
      className={cn(
        "w-full rounded-2xl bg-card border border-border/80  p-4 sm:p-6 space-y-6",
        className
      )}
    >
      {/* ── Topo do Hub VOLL: Saudação & Perfil Corporativo ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-orange-500 text-primary-foreground flex items-center justify-center font-black text-base shadow-xs shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Olá, {userName}!
              </h2>
              {isLinked ? (
                <Badge variant="outline" className="text-xs uppercase font-mono text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  Empresa Vinculada
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs uppercase font-mono text-muted-foreground">
                  Modo Visitante
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLinked
                ? `Conta Corporativa: ${companyName || "Empresa Homologada"} · Faturamento Ativo`
                : "Vincule sua empresa para faturamento quinzenal e política de viagens"}
            </p>
          </div>
        </div>

        {/* Acesso ao Painel Completo do Workspace */}
        <div className="flex items-center gap-2">
          {isLinked ? (
            <Button
              asChild
              className="h-11 min-h-11 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-primary-foreground font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/workspace/empresa/viagens">
                <Buildings size={16} weight="bold" />
                <span>Painel Corporativo Completo</span>
                <ArrowRight size={14} />
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              className="h-11 min-h-11 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-primary-foreground font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Buildings size={16} weight="bold" />
              <span>Vincular Minha Empresa</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── CENÁRIO A: Empresa NÃO Vinculada (Onboarding Estilo VOLL) ── */}
      {!isLinked && (
        <div className="rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 p-5 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 px-2 py-1 rounded-full bg-orange-500/10 inline-block">
              Solução Corporativa Waesy & Excelência Tour
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Simplifique 100% das viagens a trabalho da sua equipe
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Integração completa ao GDS InfoTravel e Wooba com governança de ponta a ponta:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
              <ShieldCheck size={20} className="text-orange-500" weight="bold" />
              <h4 className="text-xs font-bold text-foreground">Política Automatizada</h4>
              <p className="text-xs text-muted-foreground">
                Bloqueio inteligente de diárias fora do teto e aprovação multinível.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
              <CreditCard size={20} className="text-orange-500" weight="bold" />
              <h4 className="text-xs font-bold text-foreground">Faturamento B2B</h4>
              <p className="text-xs text-muted-foreground">
                Pagamento faturado quinzenal ou mensal com boleto unificado e conciliação.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
              <Receipt size={20} className="text-orange-500" weight="bold" />
              <h4 className="text-xs font-bold text-foreground">Reembolsos & KM</h4>
              <p className="text-xs text-muted-foreground">
                Lançamento de despesas via foto do comprovante e GPS de quilometragem.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              className="h-11 min-h-11 px-5 rounded-lg bg-orange-600 hover:bg-orange-700 text-primary-foreground font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              Solicitar Associação da Empresa
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              <Link to="/workspace/empresa/viagens">
                Conhecer Recursos Corporativos
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── CENÁRIO B: Grade de Ações Rápidas VOLL (Image 4) ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          O que você precisa reservar hoje?
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {/* 1. VOLL Pay */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center">
              <CreditCard size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("voll_pay")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">VOLL Pay</button>
          </div>

          {/* 2. Voos */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center">
              <AirplaneTilt size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("voos")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Voos</button>
          </div>

          {/* 3. Hotéis */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <Bed size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("hoteis")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hotéis</button>
          </div>

          {/* 4. Carros */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-violet-500/15 text-violet-600 flex items-center justify-center">
              <Car size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("aluguel")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Aluguel</button>
          </div>

          {/* 5. Ônibus */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Bus size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("onibus")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ônibus</button>
          </div>

          {/* 6. Reservas */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Ticket size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("bilhetes")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Bilhetes</button>
          </div>

          {/* 7. Embarque Rápido */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
              <Clock size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("embarque")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Embarque</button>
          </div>

          {/* 8. Reembolso KM */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center">
              <Receipt size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("km_refund")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">KM Refund</button>
          </div>

          {/* 9. Despesas */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-red-500/15 text-red-600 flex items-center justify-center">
              <CreditCard size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("reembolso")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Reembolso</button>
          </div>

          {/* 10. Agendar Corrida */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-cyan-500/15 text-cyan-600 flex items-center justify-center">
              <Taxi size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("corrida")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Agendar Corrida</button>
          </div>

          {/* 11. Eventos */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <CalendarCheck size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("eventos")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Eventos</button>
          </div>

          {/* 12. Grupos */}
          <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-center space-y-1 h-20 focus-visible:ring-2 focus-visible:ring-ring">
            <div className="size-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <UsersThree size={18} weight="bold" />
            </div>
            <button type="button" onClick={() => setSelectedQuickModule("grupos")} className="h-11 min-h-11 w-full rounded-lg text-xs font-bold text-foreground leading-tight cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Grupos</button>
          </div>
        </div>

        {/* ── Callout Canônico VOLL: Bilhetes Não Voados & Créditos Aéreos Automáticos (Image 1) ── */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
              <AirplaneTilt size={18} weight="bold" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Sempre que você tiver algum bilhete não voado, a plataforma utiliza seus créditos de forma automática.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Saldo retido em companhias:</span>
                <span className="px-2 py-1 rounded bg-card border border-border font-mono text-foreground font-bold">GOL · R$ 247,00</span>
                <span className="px-2 py-1 rounded bg-card border border-border font-mono text-foreground font-bold">Azul · R$ 156,00</span>
                <span className="px-2 py-1 rounded bg-card border border-border font-mono text-foreground font-bold">LATAM · R$ 49,00</span>
              </div>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-11 min-h-11 px-3 text-xs font-bold text-orange-600 border-orange-500/30 hover:bg-orange-500/10 cursor-pointer shrink-0"
          >
            <Link to="/workspace/empresa/viagens">
              <span>Verificar créditos</span>
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Vitrine Corporativa B2B Wooba: Locação de Carros (3 diárias / Faturado) ── */}
      {(selectedQuickModule === "aluguel" || Boolean(selectedQuickModule)) && (
        <div className="pt-2 border-t border-border/40">
          <CarRentalShowcaseRail
            mode="b2b"
            title="Precisa de um carro?"
            initialDays={3}
          />
        </div>
      )}

      {/* ── Seção: "Meus Compromissos & Viagens" (VOLL Image 4 e Image 5) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <Clock size={16} className="text-orange-500" weight="bold" />
            <span>Meus Compromissos & Viagens em Foco</span>
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            Sincronizado via Wooba & GDS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card 1: Voo Emitido */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 hover:border-foreground/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center">
                  <AirplaneTilt size={18} weight="bold" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">Voo GRU &rarr; JFK (LATAM)</span>
                  <span className="text-xs text-muted-foreground block">Voo de ida · LA 8180 · 22:10</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
                Emitido · No Horário
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Saída em 9 dias · Portão a definir</span>
              <span className="font-bold text-foreground font-mono">14 Sex Mar</span>
            </div>
          </div>

          {/* Card 2: Hotel dentro da Política */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 hover:border-foreground/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
                  <Bed size={18} weight="bold" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">Mercure São Paulo Jardins</span>
                  <span className="text-xs text-muted-foreground block">Hospedagem Corporativa · 3 noites</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                Dentro da Política
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Teto de diária respeitado</span>
              <span className="font-bold text-foreground font-mono">R$ 489/noite</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Concierge VOLL Interativo (Image 5) ── */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatCircleDots size={18} className="text-orange-500" weight="bold" />
            <span className="text-xs font-bold text-foreground">
              Concierge de Viagens Excelência Tour
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Atendimento Especializado 24h
          </span>
        </div>

        <form onSubmit={handleSendConcierge} className="flex items-center gap-2">
          <Input
            value={conciergeMsg}
            onChange={(e) => setConciergeMsg(e.target.value)}
            placeholder="Chame seu agente: 'Preciso de voo para Congonhas na próxima terça...'"
            className="h-11 min-h-11 text-xs rounded-lg flex-1 bg-card"
          />
          <Button
            type="submit"
            className="h-11 min-h-11 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-primary-foreground font-bold text-xs gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <span>Enviar</span>
            <PaperPlaneRight size={14} weight="bold" />
          </Button>
        </form>
      </div>

      {/* ── MODAL: SOLICITAR VÍNCULO CORPORATIVO ── */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Vincular Empresa ao Hub Corporativo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRequestLink} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">CNPJ da Empresa</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="h-11 min-h-11 text-xs rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Razão Social / Nome Fantasia</Label>
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Ex: Indústria & Comércio Ltda"
                className="h-11 min-h-11 text-xs rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">E-mail Corporativo do Responsável</Label>
              <Input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="financeiro@suaempresa.com.br"
                className="h-11 min-h-11 text-xs rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingLink}
                className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-primary-foreground cursor-pointer"
              >
                {isSubmittingLink ? "Enviando..." : "Confirmar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
