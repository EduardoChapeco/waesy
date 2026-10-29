// motion-reduce: safe
/**
 * ============================================================================
 * Waesy Platform — CourierDashboardHeader.tsx (iFood Entregador & Apple HIG Parity)
 * ============================================================================
 * Cabeçalho operacional do entregador / condutor Waesy Go / MotoLink:
 * - Chave de disponibilidade (Online / Offline) com telemetria GPS ativa.
 * - Ganhos de hoje com atalho de saque Pix imediato para o Waesy Bank.
 * - Módulo de pareamento de maquininha de cartão via Bluetooth (POS).
 * Ref: ifood-thumb.jpg, unnamed (10).webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Bike,
  Car,
  Navigation,
  Power,
  CreditCard,
  Bluetooth,
  Battery,
  BatteryCharging,
  Wifi,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CourierDashboardHeaderProps {
  courierName?: string;
  vehicleType?: "moto" | "bike" | "car";
  rating?: number; // ex: 4.98
  totalDeliveries?: number;
  todayEarningsCents?: number;
  isOnline?: boolean;
  onToggleOnline?: (online: boolean) => void;
  onInstantPayoutClick?: () => void;
  className?: string;
}

export function CourierDashboardHeader({
  courierName = "CONDUTOR WAESY",
  vehicleType = "moto",
  rating = 4.98,
  totalDeliveries = 348,
  todayEarningsCents = 18450, // R$ 184,50
  isOnline = true,
  onToggleOnline,
  onInstantPayoutClick,
  className,
}: CourierDashboardHeaderProps) {
  const [onlineState, setOnlineState] = useState(isOnline);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<{
    name: string;
    batteryLevel: number;
    status: "connected" | "disconnected";
  } | null>({
    name: "Pax D190 Bluetooth",
    batteryLevel: 85,
    status: "connected",
  });

  const handleToggle = () => {
    const next = !onlineState;
    setOnlineState(next);
    onToggleOnline?.(next);
    if (next) {
      toast.success("Você está Online. Pronto para receber chamados e entregas!");
    } else {
      toast.info("Você está Offline. Notificações pausadas.");
    }
  };

  const handlePairDevice = async () => {
    setIsPairing(true);
    // Simula varredura Bluetooth Web API
    setTimeout(() => {
      setPairedDevice({
        name: "Moderninha Pro 2 (Bluetooth)",
        batteryLevel: 92,
        status: "connected",
      });
      setIsPairing(false);
      setIsBluetoothModalOpen(false);
      toast.success("Maquininha pareada com sucesso via Bluetooth!");
    }, 1500);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── 1. Card Principal de Status e Ganhos do Dia ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top: Perfil + Chave Online/Offline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {vehicleType === "moto" ? <Bike className="size-6" /> : <Car className="size-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-35 sm:max-w-none">
                  {courierName}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-3xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="size-3" />
                  {rating.toFixed(2)} 
                </span>
              </div>
              <span className="text-2xs text-muted-foreground uppercase tracking-wider block">
                {totalDeliveries} entregas concluídas
              </span>
            </div>
          </div>

          {/* Botão de Disponibilidade (Piso 44px) */}
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              "h-11 min-h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none",
              onlineState
                ? "bg-emerald-600 text-primary-foreground shadow-xs hover:bg-emerald-700"
                : "bg-muted text-muted-foreground border border-border/80 hover:text-foreground"
            )}
            aria-label={onlineState ? "Ficar Offline" : "Ficar Online"}
          >
            <Power className="size-4" />
            <span>{onlineState ? "Online" : "Offline"}</span>
          </button>
        </div>

        {/* Middle: Ganhos do Dia & Saque Imediato */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
          <div>
            <span className="text-2xs text-muted-foreground uppercase tracking-wider block">
              Ganhos de Hoje
            </span>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground mt-1">
              {formatMoney(todayEarningsCents)}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onInstantPayoutClick}
            className="rounded-xl h-11 min-h-11 px-3 text-xs font-semibold gap-2 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <span>Transferir</span>
            <ArrowUpRight className="size-4 text-primary" />
          </Button>
        </div>

        {/* Bottom: Widget da Maquininha Bluetooth (iFood Parity) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0",
                pairedDevice?.status === "connected"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Bluetooth className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">
                {pairedDevice ? pairedDevice.name : "Nenhuma maquininha conectada"}
              </span>
              <div className="flex items-center gap-2 text-3xs text-muted-foreground">
                {pairedDevice?.status === "connected" ? (
                  <>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Pronta para Cobrança
                    </span>
                    <span>• Bateria: {pairedDevice.batteryLevel}%</span>
                  </>
                ) : (
                  <span>Necessária para receber no débito/crédito</span>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBluetoothModalOpen(true)}
            className="rounded-xl h-11 min-h-11 px-3 text-2xs font-semibold border-border/80 hover:bg-muted shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {pairedDevice ? "Gerenciar" : "Parear"}
          </Button>
        </div>
      </div>

      {/* ── 2. Modal de Gerenciamento / Pareamento Bluetooth ── */}
      <Sheet open={isBluetoothModalOpen} onOpenChange={setIsBluetoothModalOpen}>
        <SheetContent
          side="bottom"
          className="w-full max-w-md mx-auto rounded-t-2xl sm:rounded-2xl p-5 bg-card border-border/80 shadow-xl"
        >
          <SheetHeader className="pb-3 border-b border-border/40 text-left">
            <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Bluetooth className="size-5 text-primary" />
              <span>Maquininha de Cartão Bluetooth</span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pt-3">
            {pairedDevice ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{pairedDevice.name}</h4>
                    <span className="text-3xs text-emerald-600 font-semibold">Conectada via Bluetooth BLE</span>
                  </div>
                  <Badge variant="outline" className="text-3xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Bateria {pairedDevice.batteryLevel}%
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPairedDevice(null);
                      toast.info("Maquininha desconectada.");
                    }}
                    className="flex-1 rounded-xl h-11 min-h-11 text-xs font-semibold border-border/80 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    Desconectar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      toast.success("Sinal de teste enviado para a maquininha.");
                    }}
                    className="flex-1 rounded-xl h-11 min-h-11 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Testar Conexão
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                  <Bluetooth className="size-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Buscar Maquininha Próxima</h4>
                  <p className="text-2xs text-muted-foreground max-w-xs mx-auto mt-1">
                    Ligue o Bluetooth da sua maquininha Stone, PagBank, Cielo ou Mercado Pago.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handlePairDevice}
                  disabled={isPairing}
                  className="w-full rounded-xl h-11 min-h-11 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isPairing ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Procurando dispositivos...</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="size-4" />
                      <span>Parear Nova Maquininha</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
