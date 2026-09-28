import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Store, Zap, ArrowRight, CheckCircle2, TrendingUp, ShieldCheck, Building2, Users, Clock, Compass, CreditCard, Truck, FileSpreadsheet, Check, Loader2, Play, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPortalCompletoContent, registerWorkspaceProWaitlist } from "@/services/portal-completo.functions";
import { getUserSession } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/portal-completo")({
  head: () => ({
    meta: [
      { title: "Portal Completo e Workspace Pro | Waesy" },
      { name: "description", content: "Conheça os módulos avançados de gestão, PDV e automação do Waesy para sua empresa." },
    ],
  }),
  loader: async () => {
    try {
      const [content, session] = await Promise.all([
        getPortalCompletoContent().catch(() => null),
        getUserSession().catch(() => null),
      ]);
      return { content, session };
    } catch (err) {
      console.error("[loader:_store.portal-completo] Unhandled loader error:", err);
      return { content: null, session: null };
    }
  },
  component: PortalCompletoPage,
});

function PortalCompletoPage() {
  const { content: initialContent, session } = Route.useLoaderData() as any;

  const { data: pageData } = useQuery({
    queryKey: ["portal-completo-content"],
    queryFn: () => getPortalCompletoContent(),
    initialData: initialContent,
  });

  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState(session?.user?.email || "");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [niche, setNiche] = useState("servicos");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const waitlistMutation = useMutation({
    mutationFn: async () => {
      return await registerWorkspaceProWaitlist({
        data: {
          companyName: companyName.trim(),
          contactEmail: contactEmail.trim(),
          contactWhatsapp: contactWhatsapp.trim(),
          niche,
          notes: notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success("Inscrição confirmada! Você será notificado assim que o módulo for liberado.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Não foi possível registrar seu interesse.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || companyName.length < 2) {
      toast.error("Informe o nome da sua empresa.");
      return;
    }
    if (!contactWhatsapp.trim() || contactWhatsapp.replace(/\D/g, "").length < 8) {
      toast.error("Informe o WhatsApp comercial de contato.");
      return;
    }
    waitlistMutation.mutate();
  };

  const modules = pageData?.modules || [
    {
      id: "pdv",
      title: "PDV Cloud e Comandas",
      category: "Operação Comercial",
      description: "Emissão de pedidos em tempo real, painel de cozinha (KDS), comandas individuais e divisão de contas via PIX instantâneo.",
      icon: "Store",
      badge: "Alta Performance",
      useCase: "Ideal para restaurantes, cafeterias, conveniências e pontos de venda físicos com alto giro.",
    },
    {
      id: "estoque",
      title: "Estoque com Grade e Variações",
      category: "Logística & Catálogo",
      description: "Controle refinado por cor, tamanho, lote e validade. Alertas preventivos de ruptura de estoque e reposição automática.",
      icon: "Layers",
      badge: "Precisão Máxima",
      useCase: "Perfeito para lojas de vestuário, autopeças, materiais de construção e distribuidoras.",
    },
    {
      id: "motolink",
      title: "MotoLink e Frota Local",
      category: "Entrega Expressa",
      description: "Despacho autônomo com rastreamento GPS, precificação dinâmica de taxa de entrega com multiplicador de clima e comprovante digital.",
      icon: "Truck",
      badge: "Despacho Rápido",
      useCase: "Indispensável para operações de delivery próprio e entregas rápidas na mesma cidade.",
    },
    {
      id: "turismo",
      title: "Gestão de Turismo e Receptivo",
      category: "Viagens & Experiências",
      description: "Controle de lotação de excursões, alocação de poltronas em ônibus, rooming list de hotéis parceiros e vouchers com QR Code anti-fraude.",
      icon: "Compass",
      badge: "Módulo Especializado",
      useCase: "Projetado sob medida para agências de viagens, operadores turísticos e guias regionais.",
    },
    {
      id: "financeiro",
      title: "Conciliação e Livro Caixa",
      category: "Gestão Financeira",
      description: "Fechamento diário de turnos de operadores, conciliação bancária PIX e cartão, DRE simplificado e exportação para contabilidade.",
      icon: "CreditCard",
      badge: "Controle Total",
      useCase: "Para gestores e proprietários que necessitam de transparência e previsibilidade financeira.",
    },
    {
      id: "crm",
      title: "CRM e Automação de Retenção",
      category: "Marketing & Clientes",
      description: "Histórico completo de compras de cada cliente, campanhas automáticas de recompra e recuperação de clientes inativos via WhatsApp.",
      icon: "Users",
      badge: "Crescimento",
      useCase: "Aumente o LTV dos seus clientes com relacionamento automatizado e personalizado.",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Hero Silencioso Apple HIG */}
      <section className="relative overflow-hidden pt-10 pb-12 border-b border-border/60 bg-muted/20">
        <div className="max-w-4xl mx-auto px-0 sm:px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-border/70 text-muted-foreground text-xs font-mono font-medium">
            <Layers className="size-3 text-primary" />
            <span>Módulos Operacionais</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight max-w-2xl mx-auto">
            {pageData?.title || "Motores de Gestão Setorial"}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {pageData?.subtitle || "Sistemas de PDV, catálogo digital, logística de entregas e turismo integrados ao seu perfil comercial."}
          </p>

          <div className="flex items-center justify-center gap-2.5 pt-1">
            <Button asChild size="sm" className="h-10 px-5 rounded-xl font-bold text-xs gap-1.5 shadow-sm bg-foreground text-background hover:bg-foreground/90">
              <a href="#waitlist">
                <span>Solicitar Demonstração</span>
                <ArrowRight className="size-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 px-4 rounded-xl font-semibold text-xs border-border/70">
              <Link to="/conta/empresa">
                <span>Voltar ao Painel</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-10 space-y-12">
        {/* Grid de Módulos Operacionais Padronizados */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-foreground">
                Arquitetura Setorial
              </h2>
              <p className="text-xs text-muted-foreground">
                Módulos desenhados para a realidade de cada modelo de negócio.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              {modules.length} Módulos
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod: any) => (
              <div
                key={mod.id}
                className="bg-card rounded-2xl p-5 border border-border/60 shadow-2xs flex flex-col justify-between space-y-4 hover:border-foreground/30 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      {mod.category}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/20 bg-primary/5">
                      {mod.badge}
                    </Badge>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {mod.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Status: Integrado</span>
                  <span className="text-primary font-bold">Waesy</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Informação de Sincronização Contida */}
        <section className="bg-card rounded-2xl p-5 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground">
                Sincronização Nativa de Dados
              </h3>
              <p className="text-xs text-muted-foreground">
                Seus anúncios, produtos e negociações atuais continuam ativos ao habilitar qualquer módulo.
              </p>
            </div>
          </div>
        </section>

        {/* Formulário de Inscrição na Lista de Espera */}
        <section id="waitlist" className="max-w-lg mx-auto space-y-5">
          <div className="text-center space-y-1">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Ativação sob Demanda
            </Badge>
            <h2 className="text-xl font-bold text-foreground">
              Solicitar Demonstração
            </h2>
            <p className="text-xs text-muted-foreground">
              Informe os dados da sua empresa para alinhamento com a equipe de engenharia.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-card rounded-2xl p-8 border border-emerald-500/30 shadow-2xs text-center space-y-3">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="size-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Inscrição Recebida com Sucesso!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Nossa equipe entrará em contato via WhatsApp para agendar a demonstração exclusiva e liberar seu acesso prioritário.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm" className="h-10 rounded-xl text-xs">
                  <Link to="/conta/empresa">
                    Voltar ao Meu Painel da Empresa
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 border border-border/60 shadow-2xs space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Nome Comercial da Empresa *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                  className="h-11 rounded-xl text-xs bg-background"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">WhatsApp de Contato *</Label>
                  <Input
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="(49) 99999-9999"
                    className="h-11 rounded-xl text-xs bg-background font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">E-mail Corporativo</Label>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    type="email"
                    className="h-11 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Nicho Principal de Interesse</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicos">Prestação de Serviços</SelectItem>
                    <SelectItem value="gastronomia">Gastronomia e Restaurantes</SelectItem>
                    <SelectItem value="turismo">Turismo e Viagens</SelectItem>
                    <SelectItem value="comercio">Comércio e Varejo</SelectItem>
                    <SelectItem value="equipamentos">Locação de Equipamentos</SelectItem>
                    <SelectItem value="outros">Outro Segmento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Quais módulos você mais precisa hoje? (Opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: Preciso de controle de estoque com grade e despacho de motoboy..."
                  className="rounded-xl text-xs bg-background resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={waitlistMutation.isPending}
                  className="w-full h-12 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
                >
                  {waitlistMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Confirmando Inscrição...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Garantir Minha Vaga no Workspace Pro</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
