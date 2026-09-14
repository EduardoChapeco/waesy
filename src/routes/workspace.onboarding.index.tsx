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

export default function WorkspaceOnboardingPage() {
  const { onboarding } = ((Route.useLoaderData?.() as any) || {});

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
                Setup Guiado & Ativação 360°
              </Badge>
              {onboarding.isStoreReadyToSell ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
                  <CheckCircle2 className="size-3" />
                  Pronta para Vender
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-semibold gap-1">
                  <Clock className="size-3 text-amber-500" />
                  Em Configuração
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Ativação da Loja & Catálogo
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Complete os passos essenciais para liberar pagamentos online, cálculo de frete automático e publicação da sua vitrine oficial.
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

        {/* Banner de Ação Rápida: Ingestão de Catálogo Multimodal */}
        <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Camera className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                Ingestão Multimodal com IA & Catálogo Mestre
                <Badge variant="outline" className="text-[10px] uppercase font-mono">1-Clique</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Digitalize seu cardápio em foto ou busque 500 SKUs validados no Master Catalog sem digitação manual.
              </p>
            </div>
          </div>
          <Button asChild className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shrink-0 w-full sm:w-auto">
            <Link to="/workspace/onboarding/revisao">
              <span>Abrir Ingestão Multimodal</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. LISTA DE ETAPAS DE CONFIGURAÇÃO ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Etapas de Fundamentação da Loja</h2>
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
