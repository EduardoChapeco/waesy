import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Store,
  Camera,
  Layers,
  ShoppingBag,
  CreditCard,
  Truck,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Percent,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getOnboardingStatus } from "@/services/onboarding.functions";
import { MagicOnboardingCard } from "@/components/onboarding/magic-onboarding-card";

export const Route = createFileRoute("/workspace/onboarding/")({
  head: () => ({
    meta: [
      {
        title: "Onboarding & Ativação da Loja | Workspace Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const data = await getOnboardingStatus();
      return { onboarding: data };
    } catch (err) {
      console.error("[loader:workspace.onboarding.index] Error:", err);
      return {
        onboarding: {
          steps: [],
          totalSteps: 6,
          completedSteps: 0,
          partiallyConfiguredSteps: 0,
          progressPercentage: 0,
          isStoreReadyToSell: false,
        },
      };
    }
  },
  component: WorkspaceOnboardingPage,
});

interface NicheCopy {
  badgeLabel: string;
  title: string;
  subtitle: string;
  multimodalTitle: string;
  multimodalDescription: string;
  stepsSectionTitle: string;
}

const NICHE_COPIES: Record<string, NicheCopy> = {
  tourism: {
    badgeLabel: "Ativação de Turismo & Hospedagem",
    title: "Ativação da Agência & Experiências",
    subtitle: "Configure seus pacotes, excursões, meios de pagamento e canais de reserva direta para clientes e viajantes.",
    multimodalTitle: "Importação de Tarifários & Vouchers de Turismo",
    multimodalDescription: "Digitalize orçamentos em PDF ou crie pacotes completos com roteiro dia a dia sem digitação manual.",
    stepsSectionTitle: "Etapas de Fundamentação da Operação Turística",
  },
  restaurant: {
    badgeLabel: "Ativação de Gastronomia & Delivery",
    title: "Ativação do Restaurante & Cardápio",
    subtitle: "Cadastre seus pratos, defina taxas de entrega com MotoLink e ative pagamentos instantâneos via Pix e Cartão.",
    multimodalTitle: "Digitalização Rápida de Cardápio com IA",
    multimodalDescription: "Envie uma foto do seu cardápio físico para importar pratos, combos e adicionais automaticamente.",
    stepsSectionTitle: "Etapas de Ativação da Cozinha & Entregas",
  },
  services: {
    badgeLabel: "Ativação de Escritório & Serviços",
    title: "Ativação do Escritório & Serviços Profissionais",
    subtitle: "Defina sua grade de atendimento, tabela de honorários e canais seguros de cobrança e agendamento.",
    multimodalTitle: "Importação de Portfólio & Tabela de Serviços",
    multimodalDescription: "Digitalize sua tabela de serviços ou converta propostas em itens contratáveis com 1 clique.",
    stepsSectionTitle: "Etapas de Fundamentação da Consultoria / Escritório",
  },
  retail: {
    badgeLabel: "Ativação Comercial & Catálogo",
    title: "Ativação da Vitrine & Catálogo Comercial",
    subtitle: "Complete os passos essenciais para liberar pagamentos online, cálculo de frete automático e vitrine ativa.",
    multimodalTitle: "Ingestão Rápida com IA & Catálogo Mestre",
    multimodalDescription: "Fotografe seus produtos ou importe itens validados do catálogo comunitário sem digitação manual.",
    stepsSectionTitle: "Etapas de Fundamentação da Loja",
  },
};

function getNicheCopy(category?: string): NicheCopy {
  const normalized = (category || "").toLowerCase().trim();
  if (
    normalized.includes("turis") ||
    normalized.includes("viage") ||
    normalized.includes("hotel") ||
    normalized.includes("pousada") ||
    normalized.includes("experien") ||
    normalized.includes("chale")
  ) {
    return NICHE_COPIES.tourism;
  }
  if (
    normalized.includes("rest") ||
    normalized.includes("gastro") ||
    normalized.includes("aliment") ||
    normalized.includes("bar") ||
    normalized.includes("lanche") ||
    normalized.includes("pizz")
  ) {
    return NICHE_COPIES.restaurant;
  }
  if (
    normalized.includes("serv") ||
    normalized.includes("advoc") ||
    normalized.includes("jus") ||
    normalized.includes("consult") ||
    normalized.includes("saude") ||
    normalized.includes("imove")
  ) {
    return NICHE_COPIES.services;
  }
  return NICHE_COPIES.retail;
}

export default function WorkspaceOnboardingPage() {
  const { onboarding } = ((Route.useLoaderData?.() as any) || {});
  const niche = getNicheCopy(onboarding?.storeCategory);

  const categoryIcons: Record<string, any> = {
    fundamentos: Store,
    catalogo: ShoppingBag,
    vendas: CreditCard,
    divulgacao: Layers,
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. HEADER DE ATIVAÇÃO APPLE HIG ── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
                {niche.badgeLabel}
              </Badge>
              {onboarding.isStoreReadyToSell ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
                  <CheckCircle2 className="size-3" />
                  Pronta para Operar
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-semibold gap-1">
                  <Clock className="size-3 text-amber-500" />
                  Em Configuração
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {niche.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              {niche.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 bg-background/80 backdrop-blur-sm p-5 rounded-2xl border border-border/60">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black text-foreground">
                {onboarding.progressPercentage}%
              </span>
              <span className="text-xs text-muted-foreground font-semibold">concluído</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {onboarding.completedSteps} de {onboarding.totalSteps} etapas finalizadas
            </p>
            <div className="w-40 mt-1">
              <Progress value={onboarding.progressPercentage} className="h-2 rounded-full" />
            </div>
          </div>
        </div>

        {/* Banner de Ação Rápida: Ingestão Semântica por Nicho */}
        <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Camera className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                {niche.multimodalTitle}
                <Badge variant="outline" className="text-[10px] uppercase font-mono">1-Clique</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                {niche.multimodalDescription}
              </p>
            </div>
          </div>
          <Button asChild className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shrink-0 w-full sm:w-auto">
            <Link to="/workspace/onboarding/revisao">
              <span>Abrir Ingestão Inteligente</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. ONBOARDING MÁGICO VIA CRAWLER IA (THE TOLLBOOTH) ── */}
      <MagicOnboardingCard />

      {/* ── 3. LISTA DE ETAPAS DE CONFIGURAÇÃO MANUAL ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{niche.stepsSectionTitle}</h2>
          <span className="text-xs text-muted-foreground">Ordem recomendada de execução</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(onboarding.steps || []).map((step: any) => {
            const Icon = categoryIcons[step.category] || Sliders;
            const isDone = step.status === "completed";

            return (
              <div
                key={step.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isDone
                    ? "bg-card/40 border-border/50"
                    : "bg-card border-border/80 hover:border-primary/40 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{step.label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isDone ? "secondary" : "outline"}
                    className={`text-[10px] shrink-0 ${
                      isDone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent font-bold" : ""
                    }`}
                  >
                    {isDone ? "Concluído" : "Pendente"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-[11px] text-muted-foreground">
                    {step.details || (isDone ? "Configurado com sucesso" : "Requer preenchimento")}
                  </span>
                  <Button
                    asChild
                    variant={isDone ? "ghost" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1 rounded-lg"
                  >
                    <Link to={step.targetRoute as any}>
                      <span>{isDone ? "Revisar" : "Configurar"}</span>
                      <ChevronRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
