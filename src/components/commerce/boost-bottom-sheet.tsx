import React, { useState } from "react";
import { Zap, CheckCircle2, Clock, Star, QrCode, Copy, ExternalLink, ShieldCheck, Check, AlertCircle, Eye, TrendingUp, Globe, Instagram, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { useIsMobile } from "@/hooks/use-mobile";

export interface BoostPlanOption {
  days: 7 | 15 | 30;
  title: string;
  priceCents: number;
  badge?: string;
  estimatedReach: string;
  dailyEstimate: string;
}

export const CANONICAL_BOOST_PLANS: BoostPlanOption[] = [
  {
    days: 7,
    title: "7 Dias",
    priceCents: 1990,
    badge: "Iniciante",
    estimatedReach: "1.500 - 3.500 pessoas",
    dailyEstimate: "~R$ 2,84/dia",
  },
  {
    days: 15,
    title: "15 Dias",
    priceCents: 3990,
    badge: "Mais Popular",
    estimatedReach: "4.000 - 9.000 pessoas",
    dailyEstimate: "~R$ 2,66/dia",
  },
  {
    days: 30,
    title: "30 Dias",
    priceCents: 6990,
    badge: "Melhor Custo",
    estimatedReach: "10.000 - 25.000 pessoas",
    dailyEstimate: "~R$ 2,33/dia",
  },
];

export interface BoostBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetItem: {
    id: string;
    title: string;
    priceCents?: number | null;
    imageUrl?: string | null;
    category?: string | null;
    locationCity?: string | null;
  } | null;
  onConfirmBoost: (planDays: 7 | 15 | 30) => Promise<any>;
  isLoading?: boolean;
  paymentResult?: {
    pixQrCode?: string | null;
    pixCopyPaste?: string | null;
    paymentLink?: string | null;
    provider?: string;
  } | null;
  onResetPayment?: () => void;
}

export function BoostBottomSheet({
  open,
  onOpenChange,
  targetItem,
  onConfirmBoost,
  isLoading = false,
  paymentResult = null,
  onResetPayment,
}: BoostBottomSheetProps) {
  const isMobile = useIsMobile();
  const [selectedDays, setSelectedDays] = useState<7 | 15 | 30>(15);
  const [copiedPix, setCopiedPix] = useState(false);

  if (!targetItem) return null;

  const currentPlan = CANONICAL_BOOST_PLANS.find((p) => p.days === selectedDays)!;

  const handleCopyPix = () => {
    if (paymentResult?.pixCopyPaste && navigator.clipboard) {
      navigator.clipboard.writeText(paymentResult.pixCopyPaste);
      setCopiedPix(true);
      toast.success("Código PIX copiado para a área de transferência!");
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const content = (
    <div className="flex flex-col h-full justify-between space-y-4 p-5 sm:p-6">
      {/* ── Header do Boost ── */}
      <div className="space-y-4">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Zap className="size-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {paymentResult ? "Pagamento do Impulsionamento" : "Impulsionar com Tráfego Pago"}
              </h2>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {paymentResult
              ? "Escaneie o QR Code abaixo no app do seu banco para ativar o destaque imediatamente."
              : "Alcance milhares de clientes na sua cidade com tráfego pago local."}
          </p>
        </div>

        {/* ── Resumo do Anúncio (Miniatura Elegante) ── */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50">
          <div className="size-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/40">
            {targetItem.imageUrl ? (
              <img
                src={targetItem.imageUrl}
                alt={targetItem.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-muted-foreground/40 text-xs">
                Sem foto
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-xs font-bold text-foreground truncate">{targetItem.title}</p>
            {targetItem.priceCents != null && (
              <p className="text-xs font-mono font-bold text-foreground">
                {formatMoney(targetItem.priceCents)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {targetItem.locationCity || "Toda a Região"}
            </p>
          </div>
        </div>

        {/* ── Canais de Exibição (Waesy + Instagram + Google) ── */}
        {!paymentResult && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium">Veiculação:</span>
            <Badge variant="outline" className="text-[10px] gap-1.5 py-1 px-2.5 bg-background font-medium border-primary/30 text-foreground">
              <Star className="size-3 text-primary" /> Waesy Vitrine
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1.5 py-1 px-2.5 bg-background font-medium border-pink-500/30 text-foreground">
              <Instagram className="size-3 text-pink-500" /> Instagram Feed
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1.5 py-1 px-2.5 bg-background font-medium border-blue-500/30 text-foreground">
              <Globe className="size-3 text-blue-500" /> Google Search
            </Badge>
          </div>
        )}

        {/* ── ETAPA 1: Seleção de Orçamento / Plano ── */}
        {!paymentResult ? (
          <div className="space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Selecione o Período
            </span>

            {/* Pílulas de Seleção (Apple HIG) */}
            <div className="grid grid-cols-3 gap-2">
              {CANONICAL_BOOST_PLANS.map((plan) => {
                const isSelected = selectedDays === plan.days;
                return (
                  <button
                    key={plan.days}
                    type="button"
                    onClick={() => setSelectedDays(plan.days)}
                    className={`min-h-[64px] p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer active:scale-97 select-none ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/12 ring-2 ring-amber-500/20 shadow-xs"
                        : "border-border/60 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground">{plan.title}</span>
                    <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 mt-0.5">
                      {formatMoney(plan.priceCents)}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                      {plan.dailyEstimate}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Estimativa de Alcance Dinâmico */}
            <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <TrendingUp className="size-3.5 text-amber-600 dark:text-amber-400" />
                  Alcance Estimado na Cidade:
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                  {currentPlan.estimatedReach}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Prioridade máxima no topo das buscas, selo dourado de destaque e ativação de leilão local.
              </p>
            </div>
          </div>
        ) : (
          /* ── ETAPA 2: Checkout Real (PIX / Cartão) ── */
          <div className="space-y-4 py-2">
            {paymentResult.pixQrCode && (
              <div className="space-y-3 text-center">
                <div className="size-48 sm:size-52 mx-auto bg-white p-3 rounded-2xl border border-border/60 shadow-xs flex items-center justify-center">
                  <img
                    src={`data:image/png;base64,${paymentResult.pixQrCode}`}
                    alt="QR Code PIX"
                    className="size-full object-contain"
                  />
                </div>

                {paymentResult.pixCopyPaste && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyPix}
                    className="w-full h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="size-4 text-emerald-600" />
                        <span>Código PIX Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        <span>Copiar Código PIX (Copia e Cola)</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {paymentResult.paymentLink && (
              <Button asChild className="w-full h-11 rounded-xl text-xs font-bold gap-2">
                <a href={paymentResult.paymentLink} target="_blank" rel="noopener noreferrer">
                  <span>Pagar no Cartão</span>
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}

            <div className="text-center text-[11px] text-muted-foreground">
              Assim que o banco confirmar o pagamento, seu anúncio entra em destaque automaticamente.
            </div>
          </div>
        )}
      </div>

      {/* ── Footer / CTA ── */}
      <div className="pt-3 border-t border-border/40">
        {!paymentResult ? (
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => onConfirmBoost(selectedDays)}
            className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-amber-500 text-black hover:bg-amber-400 cursor-pointer shadow-xs active:scale-98 transition-all"
          >
            {isLoading ? (
              <span>Gerando Pagamento Seguro...</span>
            ) : (
              <>
                <Zap className="size-4 fill-current" />
                <span>Ativar Destaque • {formatMoney(currentPlan.priceCents)}</span>
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (onResetPayment) onResetPayment();
              onOpenChange(false);
            }}
            className="w-full h-10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Fechar Janela
          </Button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[90dvh] bg-card border-t border-border/70 overflow-y-auto no-scrollbar">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden bg-card border border-border/70 shadow-2xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
