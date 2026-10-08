import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import type { NicheDefinition } from "@/types/classified-editor";
import { cn } from "@/lib/utils";

export type ClassifiedEditorStep = 2 | 3 | 4 | 5;

type DraftInfo = { step: number; savedAt: string };

export function ClassifiedEditorNavigation({
  niche,
  editId,
  currentStep,
  mobileTab,
  imagesCount,
  isSubmitting,
  isUploadingMedia,
  qualityScore,
  draftInfo,
  onBack,
  onPublish,
  onMobileTabChange,
  onStepChange,
  onRestoreDraft,
  onDiscardDraft,
}: {
  niche: NicheDefinition;
  editId?: string;
  currentStep: ClassifiedEditorStep;
  mobileTab: "edit" | "preview";
  imagesCount: number;
  isSubmitting: boolean;
  isUploadingMedia: boolean;
  qualityScore: number;
  draftInfo: DraftInfo | null;
  onBack: () => void;
  onPublish: () => void;
  onMobileTabChange: (tab: "edit" | "preview") => void;
  onStepChange: (step: ClassifiedEditorStep) => void;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
}) {
  return (
    <>
{/* ── Topbar Operacional Compacta & Sticky no Mobile ────────── */}
     <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 sm:static sm:border-0 sm:bg-transparent flex items-center justify-between gap-2 pb-3">
       <div className="flex items-center gap-2">
         <Button
           type="button"
           variant="ghost"
           size="icon"
           onClick={onBack}
           className="rounded-lg size-11 min-size-11 font-bold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           aria-label="Voltar"
         >
           <ArrowLeft className="size-5 sm:size-4" />
         </Button>

         <div className="hidden sm:flex items-center gap-2">
           <span className="text-muted-foreground text-xs">/</span>
           <Badge variant="outline" className="text-xs font-semibold gap-2">
             <niche.icon className="size-4 text-primary" />
             <span>{niche.title}</span>
           </Badge>
         </div>
       </div>

       {/* Mobile Switcher & Publicar / Salvar Action */}
       <div className="flex items-center gap-2">
         <div className="flex md:hidden bg-muted p-1 rounded-lg text-xs font-semibold">
           <button
             type="button"
             onClick={() => onMobileTabChange("edit")}
             className={`px-3 py-2 rounded-lg min-h-11 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
               mobileTab === "edit"
                 ? "bg-card text-foreground font-bold "
                 : "text-muted-foreground"
             }`}
           >
             Editar
           </button>
           <button
             type="button"
             onClick={() => onMobileTabChange("preview")}
             className={`px-3 py-2 rounded-lg min-h-11 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
               mobileTab === "preview"
                 ? "bg-card text-foreground font-bold "
                 : "text-muted-foreground"
             }`}
           >
             Prévia ({imagesCount})
           </button>
         </div>

         <Button
           onClick={onPublish}
           disabled={isSubmitting || isUploadingMedia}
           size="sm"
           className="rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground h-11 min-h-11 px-4"
         >
           {isSubmitting ? (
             <>
               <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
               <span>{editId ? "Salvando..." : "Publicando..."}</span>
             </>
           ) : (
             <>
               <Check className="size-4" />
               <span>{editId ? "Salvar Alterações" : "Publicar Anúncio"}</span>
             </>
           )}
         </Button>
       </div>
     </div>

     {/* ── 5-Step Adaptive Stepper Tracker (Media-First & Snap-X V121) ── */}
     <div className="w-full bg-card rounded-lg border border-border/60 p-2 sm:p-2">
       <div className="flex overflow-x-auto carousel snap-x snap-mandatory scrollbar-none gap-1 sm:grid sm:grid-cols-2 sm:grid-cols-5 sm:gap-2">
         {[
           { step: 1, label: "Nicho", short: "Nicho" },
           { step: 2, label: "Fotos e Mídia", short: "Mídia" },
           { step: 3, label: "Especificações", short: "Specs" },
           { step: 4, label: "Condições Comerciais", short: "Comercial" },
           { step: 5, label: "Prévia e Publicar", short: "Publicar" },
         ].map((s) => {
           const isCurrent = currentStep === s.step;
           const isPast = currentStep > s.step;
           return (
             <button
               key={s.step}
               type="button"
               onClick={() => {
                 if (s.step === 1) onBack();
                 else onStepChange(s.step as ClassifiedEditorStep);
               }}
               className={cn(
                 "flex items-center justify-center gap-2 py-2 px-3 sm:px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-center shrink-0 snap-center min-w-20 sm:min-w-0",
                 isCurrent
                   ? "bg-primary text-primary-foreground font-bold"
                   : isPast
                   ? "bg-muted/50 text-foreground hover:bg-muted"
                   : "text-muted-foreground hover:bg-muted/30 opacity-70"
               )}
             >
               <span
                 className={cn(
                   "size-5 rounded-full flex items-center justify-center text-xs font-mono shrink-0",
                   isCurrent
                     ? "bg-primary-foreground/20 text-primary-foreground"
                     : isPast
                     ? "bg-primary/15 text-primary"
                     : "bg-muted text-muted-foreground"
                 )}
               >
                 {isPast ? "" : s.step}
               </span>
               <span className="hidden sm:inline truncate">{s.label}</span>
               <span className="sm:hidden truncate">{s.short}</span>
             </button>
           );
         })}
       </div>
     </div>

     {/* ── Alerta Discreto de Rascunho Disponível ── */}
     {draftInfo && (
       <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
         <span className="text-muted-foreground">
           Rascunho não finalizado encontrado (Etapa {draftInfo.step} de 5).
         </span>
         <div className="flex items-center gap-2">
           <button
             type="button"
             onClick={onRestoreDraft}
             className="font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           >
             Restaurar
           </button>
           <span className="text-muted-foreground/40">•</span>
           <button
             type="button"
             onClick={onDiscardDraft}
             className="text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           >
             Descartar
           </button>
         </div>
       </div>
     )}

     {/* ── Barra de Score de Qualidade (Silenciosa & Informativa) ── */}
     <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-card border border-border/60 text-xs">
       <div className="flex items-center gap-2 flex-1 min-w-0">
         <span className="text-xs text-muted-foreground/75 font-bold text-muted-foreground uppercase tracking-wider shrink-0">
           Qualidade
         </span>
         <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-xs">
           <div
             className={cn(
               "h-full rounded-full transition-colors duration-300",
               qualityScore >= 80 ? "bg-emerald-500" : qualityScore >= 50 ? "bg-amber-500" : "bg-primary"
             )}
             style={{ width: `${qualityScore}%` }}
           />
         </div>
         <span className="font-mono font-bold text-foreground text-xs text-muted-foreground/75 shrink-0">{qualityScore}%</span>
       </div>
       <span className="text-xs text-muted-foreground/75 text-muted-foreground truncate hidden sm:inline">
         {qualityScore >= 80 ? "Excelente · Pronto para publicar" : qualityScore >= 50 ? "Bom · Adicione fotos e dados para 100%" : "Básico · Preencha mais campos"}
       </span>
     </div>
    </>
  );
}
