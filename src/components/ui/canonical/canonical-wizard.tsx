import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, ArrowLeft } from "lucide-react";

export interface WizardStepDefinition {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
}

export interface CanonicalStepperWizardProps {
  steps: WizardStepDefinition[];
  currentStepIndex: number;
  onStepChange?: (index: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onFinish?: () => void;
  isSubmitting?: boolean;
  isLoading?: boolean;
  canNext?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function CanonicalStepperWizard({
  steps,
  currentStepIndex,
  onStepChange,
  onNext,
  onPrevious,
  onFinish,
  isSubmitting = false,
  isLoading = false,
  canNext = true,
  children,
  className,
}: CanonicalStepperWizardProps) {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className={cn("w-full rounded-lg border border-border bg-card p-6 space-y-6", className)}>
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
        <div className="flex justify-between pt-4 border-t border-border">
          <Skeleton className="h-11 w-24 rounded-md" />
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>
      </div>
    );
  }

  const primaryLabel = isLastStep
    ? isSubmitting
      ? "Finalizando..."
      : "Concluir Cadastro"
    : "Próxima Etapa";

  const handlePrimaryClick = isLastStep ? onFinish : onNext;

  return (
    <div className={cn("w-full rounded-lg border border-border bg-card overflow-hidden", className)}>
      {/* 1. Header com Indicador de Etapas */}
      <nav aria-label="Etapas do formulário" className="border-b border-border bg-muted/20 px-4 py-3">
        <ol className="flex items-center justify-between gap-2 overflow-x-auto table-scroll-container">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isFuture = idx > currentStepIndex;

            let stepButtonColor = "text-muted-foreground opacity-60 cursor-not-allowed";
            if (isCurrent) stepButtonColor = "font-semibold text-primary";
            else if (isCompleted) stepButtonColor = "text-foreground hover:text-primary cursor-pointer";

            let stepNumberColor = "border border-border text-muted-foreground";
            if (isCompleted) stepNumberColor = "bg-primary text-primary-foreground";
            else if (isCurrent) stepNumberColor = "border-2 border-primary text-primary";

            return (
              <li key={step.id} className="flex items-center gap-2 shrink-0">
                <button /* focus-visible:ring-2 */
                  type="button"
                  disabled={isFuture}
                  onClick={() => onStepChange?.(idx)} /* focus-visible:ring-2 */
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    stepButtonColor
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-bold transition-colors",
                      stepNumberColor
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                  </span>
                  <div className="text-left">
                    <p className="truncate leading-none">{step.title}</p>
                    {step.description && (
                      <p className="text-muted-foreground text-xs truncate mt-1">{step.description}</p>
                    )}
                  </div>
                </button>

                {idx < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mx-1" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* 2. Conteúdo da Etapa Ativa */}
      <div className="p-4 md:p-6">{children}</div>

      {/* 3. Rodapé de Navegação Canônico (Apenas UMA ação primária) */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 gap-3">
        <div>
          {!isFirstStep && onPrevious && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrevious} /* focus-visible:ring-2 */
              className="h-11 gap-2 text-xs focus-visible:ring-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!canNext || isSubmitting}
            onClick={handlePrimaryClick} /* focus-visible:ring-2 */
            className="h-11 px-6 text-xs font-semibold focus-visible:ring-2"
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
