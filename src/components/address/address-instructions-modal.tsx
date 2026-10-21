"use client";

import React, { useState, useEffect } from "react";
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
import { updateAddressInstructions, type UserAddressDTO } from "@/services/addresses.functions";
import { toast } from "sonner";
import { Building, MapPin, Bell, Loader2, Check } from "lucide-react";

interface AddressInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: UserAddressDTO | null;
  onSuccess?: (updated: UserAddressDTO) => void;
}

export function AddressInstructionsModal({
  isOpen,
  onClose,
  address,
  onSuccess,
}: AddressInstructionsModalProps) {
  const [instructions, setInstructions] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [blockTower, setBlockTower] = useState("");
  const [intercomCode, setIntercomCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (address) {
      setInstructions(address.instructions || "");
      setReferencePoint(address.reference_point || "");
      setBlockTower(address.block_tower || "");
      setIntercomCode(address.intercom_code || "");
    }
  }, [address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address?.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await updateAddressInstructions({
        data: {
          id: address.id,
          instructions: instructions.trim() || null,
          reference_point: referencePoint.trim() || null,
          block_tower: blockTower.trim() || null,
          intercom_code: intercomCode.trim() || null,
        },
      });

      if (res.success && res.address) {
        toast.success("Indicações de entrega atualizadas com sucesso!");
        onSuccess?.(res.address);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar indicações.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!address) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="default" className="p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <span>Indicações para Entrega</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {address.street}, {address.number} — {address.neighborhood}, {address.city}/{address.state}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Ponto de Referência */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Ponto de referência</span>
            </Label>
            <Input
              placeholder="Ex: Em frente à praça, casa verde com muro cinza"
              value={referencePoint}
              onChange={(e) => setReferencePoint(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Ajuda o entregador a localizar seu imóvel com facilidade.
            </p>
          </div>

          {/* Condomínio / Edifício */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-1">
              <Building className="size-4 text-primary" />
              <span>Condomínio ou Prédio</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Bloco / Torre</Label>
                <Input
                  placeholder="Ex: Bloco 3, Torre A"
                  value={blockTower}
                  onChange={(e) => setBlockTower(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Interfone / Ramal</Label>
                <Input
                  placeholder="Ex: Apto 302, Interfone 12"
                  value={intercomCode}
                  onChange={(e) => setIntercomCode(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Instruções adicionais para o entregador */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Bell className="size-4 text-primary" />
              <span>Instruções adicionais</span>
            </Label>
            <Input
              placeholder="Ex: Deixar na portaria 24h, tocar interfone duas vezes"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 min-h-11 rounded-lg px-4 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 min-h-11 rounded-lg px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary transition-colors motion-reduce:transition-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-background" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Salvar Indicações</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
