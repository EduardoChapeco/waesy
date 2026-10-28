/**
 * cancellation-penalty-calculator-dialog.tsx — Simulador & Calculadora Canônica de Multas de Cancelamento
 * NORMAS: AGENTS.md (B.1 a B.41), Apple HIG, WCAG 2.2 AA
 */

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import {
  calculateCancellationPenalty,
  type CancellationPenaltyInput,
} from "@/lib/travel/cancellation-penalty-calculator";

interface CancellationPenaltyCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTripTotalCents?: number;
  departureDate?: string;
}

export function CancellationPenaltyCalculatorDialog({
  open,
  onOpenChange,
  defaultTripTotalCents = 1000000,
  departureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
}: CancellationPenaltyCalculatorDialogProps) {
  const [totalTripCents, setTotalTripCents] = useState(defaultTripTotalCents);
  const [airfareCents, setAirfareCents] = useState(Math.round(defaultTripTotalCents * 0.4));
  const [hotelCents, setHotelCents] = useState(Math.round(defaultTripTotalCents * 0.45));
  const [transferCents, setTransferCents] = useState(Math.round(defaultTripTotalCents * 0.15));

  const [bookingDate, setBookingDate] = useState(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [depDate, setDepDate] = useState(departureDate);
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().slice(0, 10));

  const [operatorRatePct, setOperatorRatePct] = useState(15);
  const [hotelFreeCancellationDays, setHotelFreeCancellationDays] = useState(5);

  const calculationInput: CancellationPenaltyInput = useMemo(() => {
    const depMs = new Date(depDate).getTime();
    const hotelFreeUntil = new Date(
      depMs - hotelFreeCancellationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    return {
      totalTripCents,
      airfareCents,
      hotelCents,
      transferCents,
      bookingDate,
      cancellationDate: cancelDate,
      departureDate: depDate,
      operatorRatePct,
      hotelFreeCancellationUntil: hotelFreeUntil,
      airfareRefundable: true,
      hotelRefundable: true,
      hasTransfer: transferCents > 0,
    };
  }, [
    totalTripCents,
    airfareCents,
    hotelCents,
    transferCents,
    bookingDate,
    cancelDate,
    depDate,
    operatorRatePct,
    hotelFreeCancellationDays,
  ]);

  const result = useMemo(
    () => calculateCancellationPenalty(calculationInput),
    [calculationInput]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-lg p-6 max-h-(--spacing-screen-90,90vh) overflow-y-auto no-scrollbar space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-primary shrink-0" />
            <DialogTitle className="text-base font-bold">
              Simulador de Multas de Cancelamento Pós-Emissão
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cálculo determinístico com blindagem dos 30% da agência, regra ANAC 24h, operadora e deadlines.
          </DialogDescription>
        </DialogHeader>

        {/* Inputs da Simulação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-4 rounded-lg border border-border/60">
          <div className="space-y-1">
            <Label className="text-xs">Valor Total do Pacote (R$)</Label>
            <Input
              type="number"
              value={totalTripCents / 100}
              onChange={(e) => setTotalTripCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Parcela Aéreo (R$)</Label>
            <Input
              type="number"
              value={airfareCents / 100}
              onChange={(e) => setAirfareCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Parcela Hospedagem (R$)</Label>
            <Input
              type="number"
              value={hotelCents / 100}
              onChange={(e) => setHotelCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Parcela Transfer / Terrestre (R$)</Label>
            <Input
              type="number"
              value={transferCents / 100}
              onChange={(e) => setTransferCents(Math.round(parseFloat(e.target.value || "0") * 100))}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Data da Emissão / Compra</Label>
            <Input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Data Prevista de Embarque</Label>
            <Input
              type="date"
              value={depDate}
              onChange={(e) => setDepDate(e.target.value)}
              className="h-11 min-h-11 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Banner de Resultado Final */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">
              Total Retido / Multas Aplicáveis
            </span>
            <p className="text-xl font-bold text-destructive">
              {formatMoney(result.totalPenaltyCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              Composto por honorários agência, operadora e fornecedores
            </p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">
              Total a Estornar / Reembolsar ao Cliente
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(result.netRefundCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              Saldo líquido devolvido após deduções contratuais
            </p>
          </div>
        </div>

        {/* Detalhamento das Multas */}
        <div className="space-y-2 text-xs border border-border/60 rounded-lg p-4 bg-card">
          <span className="font-bold text-foreground">Discriminação das Retenções Legítimas</span>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div>
                <span className="font-semibold text-foreground">Honorários da Agência (30%)</span>
                <p className="text-muted-foreground">Serviço de curadoria e intermediação cumprido na emissão</p>
              </div>
              <span className="font-bold text-foreground">{formatMoney(result.breakdown.agencyFeeCents)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Cancelamento Aéreo</span>
                  {result.breakdown.anacRuleApplied && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 text-xs py-0">
                      Isento ANAC 24h
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">Multa tarifária da Cia aérea</p>
              </div>
              <span className="font-bold text-foreground">{formatMoney(result.breakdown.airlinePenaltyCents)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div>
                <span className="font-semibold text-foreground">Taxa da Operadora ({operatorRatePct}%)</span>
                <p className="text-muted-foreground">Custo administrativo e operacional de estorno</p>
              </div>
              <span className="font-bold text-foreground">{formatMoney(result.breakdown.operatorFeeCents)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div>
                <span className="font-semibold text-foreground">Penalidade de Hospedagem</span>
                <p className="text-muted-foreground">
                  {result.breakdown.hotelPenaltyCents === 0
                    ? "Isento: cancelamento solicitado dentro do prazo gratuito do hotel"
                    : "Retenção da 1ª diária ou valor integral conforme política do hotel"}
                </p>
              </div>
              <span className="font-bold text-foreground">{formatMoney(result.breakdown.hotelPenaltyCents)}</span>
            </div>

            {transferCents > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <div>
                  <span className="font-semibold text-foreground">Multa de Transfer</span>
                  <p className="text-muted-foreground">Retenção caso cancelado a menos de 48h do serviço</p>
                </div>
                <span className="font-bold text-foreground">{formatMoney(result.breakdown.transferPenaltyCents)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Fechar Simulação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
