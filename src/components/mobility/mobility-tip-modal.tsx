import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, QrCode, CreditCard, Banknote, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { sendMobilityTip } from "@/services/mobility.functions";
import { toast } from "sonner";

interface MobilityTipModalProps {
  requestId: string | null;
  driverName?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTipSent?: () => void;
}

const PRESET_TIPS = [
  { label: "R$ 5,00", cents: 500 },
  { label: "R$ 10,00", cents: 1000 },
  { label: "R$ 20,00", cents: 2000 },
];

export function MobilityTipModal({
  requestId,
  driverName = "Motorista",
  isOpen,
  onOpenChange,
  onTipSent,
}: MobilityTipModalProps) {
  const queryClient = useQueryClient();
  const [selectedTipCents, setSelectedTipCents] = useState<number>(500);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");

  const tipMutation = useMutation({
    mutationFn: (amountCents: number) =>
      sendMobilityTip({
        data: {
          requestId: requestId!,
          amountCents,
          paymentMethod,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["customer-mobility-history"] });
      queryClient.invalidateQueries({ queryKey: ["mobility-receipt", requestId] });
      onTipSent?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao enviar gorjeta.");
    },
  });

  const handleSubmit = () => {
    if (!requestId) return;
    let finalCents = selectedTipCents;
    if (isCustom) {
      const parsed = parseFloat(customValue.replace(/\D/g, "")) * 1; // cents
      if (!parsed || parsed < 100) {
        toast.error("O valor mínimo para gorjeta é R$ 1,00.");
        return;
      }
      finalCents = parsed;
    }
    tipMutation.mutate(finalCents);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Heart className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                Enviar Gorjeta
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Reconheça o serviço de {driverName}. 100% repassado ao condutor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Escolha o valor da contribuição
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_TIPS.map((tip) => (
                <button
                  key={tip.cents}
                  type="button"
                  onClick={() => {
                    setSelectedTipCents(tip.cents);
                    setIsCustom(false);
                  }}
                  className={`h-11 min-h-11 rounded-lg font-bold text-xs border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    !isCustom && selectedTipCents === tip.cents
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tip.label}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className={`w-full h-11 min-h-11 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isCustom
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/20 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Outro valor personalizado</span>
              </button>
            </div>

            {isCustom && (
              <div className="pt-2 animate-in fade-in">
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Ex: 15,00"
                  className="h-11 min-h-11 px-3 rounded-lg text-sm font-bold bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              </div>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Forma de Pagamento
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={`h-11 min-h-11 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  paymentMethod === "pix"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                <QrCode className="size-4" />
                <span>Pix Instantâneo</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`h-11 min-h-11 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  paymentMethod === "card"
                    ? "bg-foreground text-background border-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted"
                }`}
              >
                <CreditCard className="size-4" />
                <span>Cartão Salvo</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
            A taxa de governança do Waesy Go é R$ 0,00 sobre gorjetas. O valor integral vai diretamente para o profissional.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={tipMutation.isPending}
              className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              {tipMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Enviando...</span>
                </div>
              ) : (
                <span>
                  Confirmar • {formatMoney(isCustom ? (parseFloat(customValue) || 0) * 100 : selectedTipCents)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
