import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Clock, Store, Camera, Layers, ShoppingBag, CreditCard, ChevronRight, ShieldCheck, ArrowRight, Sliders, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/state/states";
import { getOnboardingStatus } from "@/services/onboarding.functions";
import { MagicOnboardingCard } from "@/components/onboarding/magic-onboarding-card";
import { getUnifiedNicheSpec } from "@/lib/niches/niche-ssot";

export const Route = createFileRoute("/workspace/onboarding/")({
  head: () => ({
    meta: [
      {
        title: "Onboarding | Workspace Waesy",
      },
    ],
  }),
  loader: async () => {
    try {
      const data = await getOnboardingStatus();
      const allErrored =
        Array.isArray(data?.steps) &&
        data.steps.length > 0 &&
        data.steps.every((s) => s.status === "technical_error");

      if (allErrored) {
        return {
          onboarding: null,
          loadError: "Não foi possível consultar o progresso da loja no banco de dados.",
        };
      }

      return { onboarding: data, loadError: null as string | null };
    } catch (err: any) {
      console.error("[loader:workspace.onboarding.index] Error:", err);
      return {
        onboarding: null,
        loadError: err?.message || "Não foi possível carregar o checklist de ativação.",
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
    title: "Ativação da Agência e Experiências",
    subtitle: "Configure seus pacotes, excursões, meios de pagamento e canais de reserva direta para clientes e viajantes.",
    multimodalTitle: "Importação de Tarifários & Vouchers de Turismo",
    multimodalDescription: "Digitalize orçamentos em PDF ou crie pacotes completos com roteiro dia a dia sem digitação manual.",
    stepsSectionTitle: "Etapas de Fundamentação da Operação Turística",
  },
  restaurant: {
    badgeLabel: "Ativação de Gastronomia & Delivery",
    title: "Ativação do Restaurante e Cardápio",
    subtitle: "Cadastre seus pratos, defina taxas de entrega com MotoLink e ative pagamentos instantâneos via Pix e Cartão.",
    multimodalTitle: "Digitalização Rápida de Cardápio com IA",
    multimodalDescription: "Envie uma foto do seu cardápio físico para importar pratos, combos e adicionais automaticamente.",
    stepsSectionTitle: "Etapas de Ativação da Cozinha & Entregas",
  },
};

function getNicheCopy(category?: string): NicheCopy {
  const spec = getUnifiedNicheSpec(category);
  if (spec.id === "tourism") return NICHE_COPIES.tourism;
  if (spec.id === "gastronomy") return NICHE_COPIES.restaurant;

  return spec.onboardingBlueprint;
}

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { onboarding = null, loadError = null } = ((Route.useLoaderData?.() as any) || {});

  if (loadError || !onboarding) {
    return (
      <div className="w-full px-0 sm:px-0 py-8">
        <ErrorState
          title="Erro ao carregar checklist de ativação"
          description={loadError || "Verifique sua conexão e tente atualizar novamente."}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  const niche = getNicheCopy(onboarding?.storeCategory);

  const categoryIcons: Record<string, any> = {
    fundamentos: Store,
    catalogo: ShoppingBag,
    vendas: CreditCard,
    divulgacao: Layers,
  };

  return (
    <div className="w-full px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. HEADER DE ATIVAÇÃO APPLE HIG ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium px-3 py-1 rounded-xl">
                {niche.badgeLabel}
              </Badge>
              {onboarding.isStoreReadyToSell ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium gap-1 rounded-xl">
                  <CheckCircle2 className="size-4" />
                  Pronta para Operar
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-medium gap-1 rounded-xl">
                  <Clock className="size-4 text-warning-strong" />
                  Em Configuração
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {niche.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              {niche.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto gap-2 shrink-0 bg-background/80 p-4 sm:p-5 rounded-xl border border-border/60">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-semibold text-foreground">
                {onboarding.progressPercentage}%
              </span>
              <span className="text-xs text-muted-foreground font-medium">concluído</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {onboarding.completedSteps} de {onboarding.totalSteps} etapas finalizadas
            </p>
            <div className="w-full sm:w-40 mt-1">
              <Progress value={onboarding.progressPercentage} className="h-2 rounded-full" />
            </div>
          </div>
        </div>

        {/* Atalho de Importação Documental */}
        <div className="p-4 sm:p-5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Camera className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {niche.multimodalTitle}
              </h3>
              <p className="text-xs text-muted-foreground">
                {niche.multimodalDescription}
              </p>
            </div>
          </div>
          <Button asChild className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 w-full sm:w-auto">
            <Link to="/workspace/onboarding/revisao">
              <span>Revisar Importação</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Atalho de Viabilidade & Geomarketing */}
        <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Estudo de Viabilidade Local
              </h3>
              <p className="text-xs text-muted-foreground">
                Consulte indicadores regionais e concorrentes próximos antes de expandir sua operação.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold gap-2 shrink-0 w-full sm:w-auto">
            <Link to={"/workspace/viabilidade" as any}>
              <span>Abrir Viabilidade</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. IMPORTAÇÃO DE DADOS VIA SITE OU PERFIL PÚBLICO ── */}
      <MagicOnboardingCard />

      {/* ── 3. LISTA DE ETAPAS DE CONFIGURAÇÃO MANUAL ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-base font-semibold text-foreground">{niche.stepsSectionTitle}</h2>
          <span className="text-xs text-muted-foreground">Ordem recomendada</span>
        </div>

        {(onboarding.steps || []).length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
            Nenhuma etapa pendente encontrada para este perfil.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(onboarding.steps || []).map((step: any) => {
            const Icon = categoryIcons[step.category] || Sliders;
            const isDone = step.status === "completed";
            const isError = step.status === "technical_error";

            return (
              <div
                key={step.id}
                className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between gap-4 ${
                  isError
                    ? "bg-card border-destructive/40"
                    : isDone
                      ? "bg-card border-border/50"
                      : "bg-card border-border/80 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isError
                          ? "bg-destructive/10 text-destructive"
                          : isDone
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-foreground"
                      }`}
                    >
                      {isError ? (
                        <AlertCircle className="size-5" />
                      ) : isDone ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{step.label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isError ? "destructive" : isDone ? "secondary" : "outline"}
                    className={`text-xs shrink-0 rounded-xl ${
                      isDone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent font-medium" : ""
                    }`}
                  >
                    {isError ? "Erro" : isDone ? "Concluído" : "Pendente"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground truncate">
                    {isError
                      ? step.details || "Falha ao verificar no banco"
                      : step.details || (isDone ? "Configurado" : "Requer preenchimento")}
                  </span>
                  <Button
                    asChild
                    variant={isDone ? "ghost" : "outline"}
                    size="sm"
                    className="h-11 min-h-11 px-4 text-xs font-semibold gap-1 rounded-xl shrink-0"
                  >
                    <Link to={step.targetRoute as any}>
                      <span>{isDone ? "Revisar" : "Configurar"}</span>
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
