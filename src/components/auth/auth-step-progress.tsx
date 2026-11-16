import { cn } from "@/lib/utils";

export interface AuthStepProgressProps {
  currentStep: number;
  totalSteps: number;
  accent?: "primary" | "warning";
}

export function AuthStepProgress({
  currentStep,
  totalSteps,
  accent = "primary",
}: AuthStepProgressProps) {
  const safeTotal = Math.max(1, Math.min(4, totalSteps));
  const safeCurrent = Math.max(1, Math.min(safeTotal, currentStep));
  const activeColor = accent === "warning" ? "bg-warning" : "bg-primary";

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-valuenow={safeCurrent}
      aria-label={`Etapa ${safeCurrent} de ${safeTotal}`}
      className="flex items-center gap-2 w-full"
    >
      {Array.from({ length: safeTotal }).map((_, idx) => {
        const isActive = idx + 1 <= safeCurrent;
        return (
          <div
            key={idx}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
              isActive ? activeColor : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}
