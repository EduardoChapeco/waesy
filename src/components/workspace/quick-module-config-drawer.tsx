import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Clock, Power, Truck, ShoppingBag, Store, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { _saveStoreSettings } from "@/services/store.functions";
import { Link } from "@tanstack/react-router";

export interface QuickModuleConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  storeSettings?: any;
  onSettingsUpdated?: () => void;
  children?: React.ReactNode;
}

export function QuickModuleConfigDrawer({
  open,
  onOpenChange,
  moduleName,
  storeSettings,
  onSettingsUpdated,
  children,
}: QuickModuleConfigDrawerProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Estados locais derivados das configurações da loja
  const initialOrderTypes = storeSettings?.order_types || { delivery: true, takeout: true, dine_in: true };
  const [deliveryActive, setDeliveryActive] = useState<boolean>(initialOrderTypes.delivery ?? true);
  const [takeoutActive, setTakeoutActive] = useState<boolean>(initialOrderTypes.takeout ?? true);
  const [dineInActive, setDineInActive] = useState<boolean>(initialOrderTypes.dine_in ?? true);
  const isPaused = Boolean(storeSettings?.emergency_pause_until && new Date(storeSettings.emergency_pause_until).getTime() > Date.now());

  const handleSaveOperationalRules = async () => {
    setIsSaving(true);
    try {
      await _saveStoreSettings({
        name: storeSettings?.name || "Minha Loja",
        order_types: {
          delivery: deliveryActive,
          takeout: takeoutActive,
          dine_in: dineInActive,
        },
      });
      toast.success("Configurações operacionais salvas com sucesso!");
      onSettingsUpdated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmergencyPause = async (minutes: number | null) => {
    setIsSaving(true);
    try {
      const pauseUntil = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null;
      await _saveStoreSettings({
        name: storeSettings?.name || "Minha Loja",
        emergency_pause_until: pauseUntil,
      });
      toast.success(minutes ? `Recebimento pausado por ${minutes} minutos` : "Recebimento reaberto com sucesso!");
      onSettingsUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar pausa");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background">
        <SheetHeader className="p-6 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <SlidersHorizontal className="size-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-foreground">
                Ajustes Rápidos — {moduleName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Regras operacionais e preferências ativas em tempo real
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Status da Operação & Pausa de Emergência */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Disponibilidade Imediata
              </Label>
              <Badge variant="outline" className={isPaused ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"}>
                {isPaused ? "Pausado" : "Aberto"}
              </Badge>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-lg flex items-center justify-center ${isPaused ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                  <Power className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isPaused ? "Reabrir Operação" : "Pausa de Emergência"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPaused ? "Retomar recebimento de pedidos imediatamente" : "Suspender temporariamente se a demanda estiver alta"}
                  </p>
                </div>
              </div>

              {isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-10 rounded-lg font-medium border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => handleToggleEmergencyPause(null)}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Power className="size-4 mr-2" />}
                  Reabrir Agora
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-lg text-xs font-medium"
                    onClick={() => handleToggleEmergencyPause(30)}
                    disabled={isSaving}
                  >
                    <Clock className="size-3.5 mr-2" />
                    Pausar 30m
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-lg text-xs font-medium"
                    onClick={() => handleToggleEmergencyPause(60)}
                    disabled={isSaving}
                  >
                    <Clock className="size-3.5 mr-2" />
                    Pausar 1h
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Modalidades de Atendimento */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Modalidades de Atendimento
            </Label>
            <div className="rounded-lg border border-border/80 bg-card divide-y divide-border/60 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Truck className="size-4" />
                  </div>
                  <div>
                    <Label htmlFor="toggle-delivery" className="text-sm font-semibold cursor-pointer">
                      Delivery e Entrega
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receber pedidos para entrega em domicílio
                    </p>
                  </div>
                </div>
                <Switch
                  id="toggle-delivery"
                  checked={deliveryActive}
                  onCheckedChange={setDeliveryActive}
                />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div>
                    <Label htmlFor="toggle-takeout" className="text-sm font-semibold cursor-pointer">
                      Retirada no Balcão
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Cliente faz o pedido e retira no local
                    </p>
                  </div>
                </div>
                <Switch
                  id="toggle-takeout"
                  checked={takeoutActive}
                  onCheckedChange={setTakeoutActive}
                />
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Store className="size-4" />
                  </div>
                  <div>
                    <Label htmlFor="toggle-dine-in" className="text-sm font-semibold cursor-pointer">
                      Consumo no Local / Mesas
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Atendimento presencial e comandas
                    </p>
                  </div>
                </div>
                <Switch
                  id="toggle-dine-in"
                  checked={dineInActive}
                  onCheckedChange={setDineInActive}
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Customizações e Regras Específicas do Módulo */}
          {children ? (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Preferências do Módulo
              </Label>
              <div className="rounded-lg border border-border/80 bg-card divide-y divide-border/60 overflow-hidden">
                {children}
              </div>
            </div>
          ) : null}

          {/* Seção 4: Atalho para Configurações Avançadas */}
          <div className="pt-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full h-10 rounded-lg justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/workspace/configuracoes">
                <span>Painel Completo de Configurações</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-lg text-xs font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11 rounded-lg text-xs font-semibold"
            onClick={handleSaveOperationalRules}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Salvar Ajustes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
