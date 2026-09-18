import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronRight, Play, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { completeSystemOnboarding, type SystemOnboardingStep } from "@/services/system-onboarding.functions";

export function WelcomeOnboardingModal({ initialSteps }: { initialSteps: SystemOnboardingStep[] }) {
  const [isOpen, setIsOpen] = useState(initialSteps.length > 0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const router = useRouter();

  const steps = initialSteps;
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  if (!isOpen || steps.length === 0) return null;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsFinishing(true);
    try {
      await completeSystemOnboarding();
      setIsOpen(false);
      toast.success("Tudo pronto! Bem-vindo(a) à plataforma.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar onboarding");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-4xl bg-card border border-border shadow-2xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] flex flex-col md:flex-row min-h-[500px]"
        >
          {/* Lado Esquerdo: Mídia (Vídeo ou Imagem) */}
          <div className="w-full md:w-1/2 bg-muted/30 relative overflow-hidden flex items-center justify-center min-h-[250px] md:min-h-full">
            {currentStep.media_url ? (
              currentStep.media_type === "video" ? (
                <video
                  src={currentStep.media_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <img
                  src={currentStep.media_url}
                  alt={currentStep.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <Play className="size-12 mb-4 opacity-50" />
                <p className="text-sm">Mídia em breve</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:hidden" />
          </div>

          {/* Lado Direito: Conteúdo e Controles */}
          <div className="w-full md:w-1/2 flex flex-col p-6 sm:p-10 justify-between bg-card relative z-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Passo {currentStepIndex + 1} de {steps.length}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                {currentStep.title}
              </h2>
              
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {currentStep.description || "Descubra como aproveitar o máximo da plataforma."}
              </p>
            </div>

            <div className="mt-12 flex flex-col gap-4">
              {/* Barra de Progresso */}
              <div className="flex gap-1.5 w-full">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                      idx <= currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Botão de Ação */}
              <Button
                size="lg"
                onClick={handleNext}
                disabled={isFinishing}
                className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all gap-2"
              >
                {isFinishing ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : isLastStep ? (
                  <>
                    <Check className="size-5" /> Começar a Usar
                  </>
                ) : (
                  <>
                    Próximo <ChevronRight className="size-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
