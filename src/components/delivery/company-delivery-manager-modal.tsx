import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bike, Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getCompanyDeliverySettings, saveCompanyDeliverySettings } from "@/services/company-delivery.functions";

export interface CompanyDeliveryManagerModalProps {
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyDeliveryManagerModal({
  storeId,
  isOpen,
  onClose,
}: CompanyDeliveryManagerModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hasOwnCouriers, setHasOwnCouriers] = useState(false);
  const [fixedFeeReais, setFixedFeeReais] = useState("10,00");
  const [freeAboveReais, setFreeAboveReais] = useState("150,00");
  const [motoboyInstructions, setMotoboyInstructions] = useState("");
  const [neighborhoods, setNeighborhoods] = useState<
    Array<{ neighborhood: string; fee_cents: number; active: boolean }>
  >([]);

  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState("12,00");

  useEffect(() => {
    if (!isOpen || !storeId) return;

    let isMounted = true;
    setLoading(true);

    getCompanyDeliverySettings({ data: { storeId } })
      .then((res: any) => {
        if (!isMounted) return;
        const s = res?.settings;
        if (s) {
          setHasOwnCouriers(Boolean(s.has_own_couriers));
          setFixedFeeReais(((s.fixed_delivery_fee_cents || 0) / 100).toFixed(2).replace(".", ","));
          if (s.free_delivery_above_cents) {
            setFreeAboveReais((s.free_delivery_above_cents / 100).toFixed(2).replace(".", ","));
          } else {
            setFreeAboveReais("");
          }
          setNeighborhoods(s.neighborhoods_rates || []);
          setMotoboyInstructions(s.motoboy_instructions || "");
        }
      })
      .catch(() => null)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, storeId]);

  const handleAddNeighborhood = () => {
    if (!newNeighborhood.trim()) return;
    const cents = Math.round(parseFloat(newNeighborhoodFee.replace(",", ".")) * 100) || 1000;
    setNeighborhoods((prev) => [
      ...prev,
      { neighborhood: newNeighborhood.trim(), fee_cents: cents, active: true },
    ]);
    setNewNeighborhood("");
    setNewNeighborhoodFee("12,00");
  };

  const handleRemoveNeighborhood = (index: number) => {
    setNeighborhoods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fixedCents = Math.round(parseFloat(fixedFeeReais.replace(",", ".")) * 100) || 0;
      const freeAboveCents = freeAboveReais.trim()
        ? Math.round(parseFloat(freeAboveReais.replace(",", ".")) * 100)
        : null;

      await saveCompanyDeliverySettings({
        data: {
          storeId,
          hasOwnCouriers,
          fixedDeliveryFeeCents: fixedCents,
          freeDeliveryAboveCents: freeAboveCents,
          neighborhoodsRates: neighborhoods,
          motoboyInstructions: motoboyInstructions.trim() || undefined,
        },
      });

      toast.success("Taxas de entrega salvas com sucesso!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar taxas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bike className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Taxas
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure o valor padrão de entrega da sua empresa para pedidos fechados via Classificados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Carregando taxas...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Taxa Fixa Padrão */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Taxa Padrão (R$)</Label>
                <Input
                  value={fixedFeeReais}
                  onChange={(e) => setFixedFeeReais(e.target.value)}
                  placeholder="10,00"
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Frete Grátis Acima de (R$)</Label>
                <Input
                  value={freeAboveReais}
                  onChange={(e) => setFreeAboveReais(e.target.value)}
                  placeholder="Ex: 150,00 (opcional)"
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            </div>

            {/* Possui Motoboys Próprios? */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Equipe Própria de Entregadores</Label>
                <p className="text-[11px] text-muted-foreground">
                  Sua loja possui entregadores fixos ou utiliza motoboys avulsos parceiros.
                </p>
              </div>
              <Switch checked={hasOwnCouriers} onCheckedChange={setHasOwnCouriers} />
            </div>

            {/* Taxas por Bairro */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Taxas Personalizadas por Bairro ({neighborhoods.length})</span>
                <span className="text-[10px] text-muted-foreground font-normal">Opcional</span>
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  value={newNeighborhood}
                  onChange={(e) => setNewNeighborhood(e.target.value)}
                  placeholder="Nome do bairro (ex: Centro)"
                  className="h-9 rounded-xl text-xs flex-1"
                />
                <Input
                  value={newNeighborhoodFee}
                  onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                  placeholder="R$ 12,00"
                  className="h-9 rounded-xl text-xs w-24 font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddNeighborhood}
                  className="h-9 rounded-xl text-xs font-bold"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {neighborhoods.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  {neighborhoods.map((n, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-background border border-border/60 text-xs"
                    >
                      <span className="font-medium text-foreground">{n.neighborhood}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px] font-bold">
                          R$ {(n.fee_cents / 100).toFixed(2).replace(".", ",")}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNeighborhood(idx)}
                          className="size-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instruções para o Motoboy */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-foreground">Instruções para o Motoboy</Label>
              <Input
                value={motoboyInstructions}
                onChange={(e) => setMotoboyInstructions(e.target.value)}
                placeholder="Ex: Retirar pacotes no balcão dos fundos com a atendente"
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl text-xs font-bold">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>Salvar Taxas</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
