import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitMobilityRating } from "@/services/mobility.functions";
import { toast } from "sonner";

interface MobilityRatingModalProps {
  requestId: string | null;
  driverName?: string;
  serviceType?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: () => void;
}

const RIDE_TAGS = [
  "Pontual",
  "Educado",
  "Carro Limpo",
  "Direção Segura",
  "Boa Conversa",
  "Ar-condicionado",
];

const DELIVERY_TAGS = [
  "Ágil",
  "Cuidado com o Pacote",
  "Pontual",
  "Educado",
  "Comprovante Legível",
];

const FREIGHT_TAGS = [
  "Cuidado com Móveis",
  "Pontual",
  "Prestativo",
  "Equipamento Adequado",
  "Ótima Ajuda",
];

export function MobilityRatingModal({
  requestId,
  driverName = "Motorista",
  serviceType = "ride_car",
  isOpen,
  onOpenChange,
  onRated,
}: MobilityRatingModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const availableTags =
    serviceType === "delivery_express"
      ? DELIVERY_TAGS
      : serviceType === "freight_van" || serviceType === "moving_truck"
      ? FREIGHT_TAGS
      : RIDE_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const ratingMutation = useMutation({
    mutationFn: () =>
      submitMobilityRating({
        data: {
          requestId: requestId!,
          roleReviewed: "courier",
          rating,
          comment: comment.trim() || undefined,
          tags: selectedTags,
        },
      }),
    onSuccess: () => {
      toast.success("Avaliação enviada com sucesso! Obrigado pelo feedback.");
      queryClient.invalidateQueries({ queryKey: ["customer-mobility-history"] });
      onRated?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registrar avaliação.");
    },
  });

  const handleSubmit = () => {
    if (!requestId) return;
    ratingMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Star className="size-4 fill-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                Avaliar Experiência
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Como foi o trajeto com {driverName}?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Estrelas 1-5 */}
          <div className="flex flex-col items-center justify-center py-2 space-y-1">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 rounded-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    aria-label={`${star} estrelas`}
                  >
                    <Star
                      className={`size-8 transition-colors ${
                        isActive
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-foreground">
              {rating === 5
                ? "Excelente!"
                : rating === 4
                ? "Muito bom!"
                : rating === 3
                ? "Regular"
                : rating === 2
                ? "Ruim"
                : "Muito insatisfeito"}
            </span>
          </div>

          {/* Tags de Avaliação */}
          <div className="space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Destaques positivos
            </span>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "bg-foreground text-background border-foreground shadow-xs"
                        : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {isSelected && <Check className="size-3 text-emerald-400" />}
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comentário Opcional */}
          <div className="space-y-1">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
              Comentário adicional (opcional)
            </span>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe uma mensagem para o motorista ou para a comunidade..."
              className="rounded-lg p-3 text-xs bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              Agora Não
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={ratingMutation.isPending}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              {ratingMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Enviando...</span>
                </div>
              ) : (
                <span>Enviar Avaliação</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
