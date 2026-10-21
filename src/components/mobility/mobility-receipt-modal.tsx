import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  Car,
  Bike,
  Truck,
  Boxes,
  Loader2,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { getMobilityReceipt } from "@/services/mobility.functions";

interface MobilityReceiptModalProps {
  requestId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobilityReceiptModal({
  requestId,
  isOpen,
  onOpenChange,
}: MobilityReceiptModalProps) {
  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ["mobility-receipt", requestId],
    queryFn: () => (requestId ? getMobilityReceipt({ data: { requestId } }) : null),
    enabled: !!requestId && isOpen,
  });

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const getServiceIcon = (type?: string) => {
    switch (type) {
      case "ride_moto":
        return Bike;
      case "freight_van":
        return Truck;
      case "moving_truck":
        return Boxes;
      default:
        return Car;
    }
  };

  const ServiceIcon = getServiceIcon(receipt?.serviceType);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-screen overflow-y-auto no-scrollbar p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black text-foreground">
                  Comprovante Waesy Go
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  {receipt?.receiptNumber || "Carregando demonstrativo..."}
                </DialogDescription>
              </div>
            </div>
            {receipt && (
              <Badge variant="outline" className="text-xs uppercase font-mono">
                {receipt.serviceLabel}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-foreground" />
            <span className="text-xs">Carregando detalhes do recibo...</span>
          </div>
        )}

        {isError && (
          <div className="py-8 text-center space-y-2 text-destructive">
            <p className="text-xs font-semibold">Falha ao carregar detalhes do recibo.</p>
          </div>
        )}

        {!isLoading && !isError && receipt && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Status & Conclusão */}
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="font-bold">Serviço Concluído</span>
              </div>
              <span className="font-mono text-xs">
                {formatDate(receipt.completedAt)}
              </span>
            </div>

            {/* Trajeto */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground block">
                    Origem / Coleta
                  </span>
                  <p className="text-foreground font-medium truncate">
                    {receipt.originAddress}
                  </p>
                </div>
              </div>

              <div className="h-4 w-px bg-border ml-2 my-1" />

              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  B
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs uppercase font-bold text-muted-foreground block">
                    Destino / Entrega
                  </span>
                  <p className="text-foreground font-medium truncate">
                    {receipt.destinationAddress}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-muted-foreground font-mono">
                <span>Distância: {receipt.distanceKm} km</span>
                <span>Duração: ~{receipt.estimatedDurationMinutes} min</span>
              </div>
            </div>

            {/* Condutor Parceiro */}
            {receipt.courier && (
              <div className="p-3 rounded-lg bg-card border border-border/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center font-black text-foreground text-sm">
                    {receipt.courier.fullName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">
                      {receipt.courier.fullName}
                    </span>
                    <p className="text-muted-foreground text-xs">
                      {receipt.courier.vehicleModel || receipt.courier.vehicleType} • {receipt.courier.vehiclePlate || "Placa confirmada"}
                    </p>
                  </div>
                </div>
                {receipt.courier.rating && (
                  <div className="flex items-center gap-1 font-bold text-foreground">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span>{receipt.courier.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Demonstrativo Financeiro */}
            <div className="p-4 rounded-lg bg-card border border-border/80 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                Detalhamento dos Valores
              </span>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tarifa Base</span>
                  <span className="font-mono text-foreground font-semibold">
                    {formatMoney(receipt.breakdown.baseFareCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Distância Percorrida ({receipt.distanceKm} km)</span>
                  <span className="font-mono text-foreground font-semibold">
                    {formatMoney(receipt.breakdown.distanceFeeCents)}
                  </span>
                </div>

                {receipt.breakdown.helperFeeCents > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Ajudantes Adicionais</span>
                    <span className="font-mono text-foreground font-semibold">
                      {formatMoney(receipt.breakdown.helperFeeCents)}
                    </span>
                  </div>
                )}

                {receipt.breakdown.stairsFeeCents > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Taxa de Escadas / Acesso</span>
                    <span className="font-mono text-foreground font-semibold">
                      {formatMoney(receipt.breakdown.stairsFeeCents)}
                    </span>
                  </div>
                )}

                {receipt.breakdown.tipCents > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-bold">
                    <span>Gorjeta ao Motorista</span>
                    <span className="font-mono">
                      +{formatMoney(receipt.breakdown.tipCents)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-black text-foreground">
                  <span>Total Pago</span>
                  <span className="font-mono text-base">
                    {formatMoney(receipt.breakdown.totalCents)}
                  </span>
                </div>
              </div>

              {/* Nota de Governança 0% Abusiva */}
              <div className="pt-3 border-t border-dashed border-border/70 text-xs text-muted-foreground leading-snug space-y-1">
                <div className="flex items-center justify-between">
                  <span>Taxa Fixa Waesy Go (B.23):</span>
                  <span className="font-mono">{formatMoney(receipt.breakdown.platformFeeCents)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>Repasse Líquido ao Motorista:</span>
                  <span className="font-mono">{formatMoney(receipt.breakdown.driverEarningsCents)}</span>
                </div>
                <p className="opacity-80 pt-1">
                  0% de comissão percentual abusiva. 100% da gorjeta e 100% dos adicionais repassados ao parceiro.
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold gap-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                <Printer className="size-4" />
                <span>Imprimir / Salvar PDF</span>
              </Button>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
