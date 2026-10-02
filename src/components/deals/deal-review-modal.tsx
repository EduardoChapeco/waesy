import React, { useState } from "react";
import { Star, ShieldCheck, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { submitDealReview } from "@/services/deal-reviews.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DealReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle?: string;
  companyName?: string;
  onSuccess?: () => void;
}

export function DealReviewModal({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  companyName,
  onSuccess,
}: DealReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealId) return;

    setSubmitting(true);
    try {
      await submitDealReview({
        data: {
          dealId,
          rating,
          comment: comment.trim() || undefined,
        },
      });

      toast.success("Avaliação enviada com sucesso! Obrigado pelo feedback.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-lg bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              <ShieldCheck className="size-3" />
              <span>Avaliação Verificada</span>
            </Badge>
          </div>
          <DialogTitle className="text-lg font-black text-foreground tracking-tight pt-1">
            Como foi sua experiência?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {companyName ? `Avalie seu atendimento com ${companyName}` : "Seu feedback ajuda a manter a comunidade segura e com alta qualidade."}
            {dealTitle && <span className="block font-medium text-foreground mt-1">Ref: {dealTitle}</span>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Seletor de Estrelas Apple HIG */}
          <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/40 border border-border/30 gap-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    aria-label={`${star} estrelas`}
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        isFilled
                          ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                          : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-bold text-foreground">
              {rating === 5 && "⭐ Excelente / Perfeito"}
              {rating === 4 && "👍 Muito Bom"}
              {rating === 3 && "👌 Razoável"}
              {rating === 2 && "👎 Deixou a Desejar"}
              {rating === 1 && "⚠️ Ruim"}
            </span>
          </div>

          {/* Campo de Comentário Opcional */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              Comentário sobre o serviço / pacote
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte o que achou do atendimento, agilidade ou do pacote..."
              className="text-xs rounded-lg min-h-[90px] resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs rounded-lg"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 text-xs font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-sm"
            >
              {submitting ? "Enviando..." : "Publicar Avaliação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
