import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import {
  clampInstallments,
  normalizeSupplierPaymentPolicy,
  type InstallmentOptionDTO,
  type SupplierPaymentPolicy,
} from "@/lib/tourism/payment-policy";
import type { TravelSupplierDTO } from "@/types/travel-suppliers";

interface StudioSupplierInstallmentsCardProps {
  suppliers: TravelSupplierDTO[];
  resolvedInstallments: {
    maxCardInstallments: number;
    maxBoletoInstallments: number;
    cardInterestFree: boolean;
  };
  installmentsOptions?: InstallmentOptionDTO[] | null;
  onApplyPolicy: (policy: SupplierPaymentPolicy) => void;
}

export function StudioSupplierInstallmentsCard({
  suppliers,
  resolvedInstallments,
  installmentsOptions,
  onApplyPolicy,
}: StudioSupplierInstallmentsCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-3">
      <span className="text-xs font-bold text-foreground block">
        Fornecedor &amp; Parcelamento Sincronizado
      </span>

      {suppliers.length > 0 && (
        <div className="space-y-1">
          <Label className="text-2xs text-muted-foreground font-semibold">
            Sincronizar Política do Fornecedor
          </Label>
          <select
            value=""
            onChange={(e) => {
              const sup = suppliers.find((s) => s.id === e.target.value);
              if (!sup) return;
              onApplyPolicy(normalizeSupplierPaymentPolicy(sup));
              toast.success(`Condições de ${sup.name} aplicadas à proposta.`);
            }}
            className="w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium"
          >
            <option value="">Selecionar fornecedor para sincronizar...</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name} ({sup.max_card_installments ?? 12}x Cartão /{" "}
                {sup.max_boleto_installments ?? 12}x Boleto)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-2xs text-muted-foreground font-semibold">
            Cartão (1 a 36x)
          </Label>
          <Input
            type="number"
            min={1}
            max={36}
            value={resolvedInstallments.maxCardInstallments}
            onChange={(e) => {
              const nextCard = clampInstallments(e.target.value, 12);
              onApplyPolicy(
                normalizeSupplierPaymentPolicy({
                  maxCardInstallments: nextCard,
                  maxBoletoInstallments: resolvedInstallments.maxBoletoInstallments,
                  cardInterestFree: resolvedInstallments.cardInterestFree,
                  allowedPaymentMethods: ["pix", "credit_card", "boleto"],
                }),
              );
            }}
            className="h-11 text-xs font-mono rounded-lg"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-2xs text-muted-foreground font-semibold">
            Boleto (1 a 36x)
          </Label>
          <Input
            type="number"
            min={1}
            max={36}
            value={resolvedInstallments.maxBoletoInstallments}
            onChange={(e) => {
              const nextBoleto = clampInstallments(e.target.value, 12);
              onApplyPolicy(
                normalizeSupplierPaymentPolicy({
                  maxCardInstallments: resolvedInstallments.maxCardInstallments,
                  maxBoletoInstallments: nextBoleto,
                  cardInterestFree: resolvedInstallments.cardInterestFree,
                  allowedPaymentMethods: ["pix", "credit_card", "boleto"],
                }),
              );
            }}
            className="h-11 text-xs font-mono rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[12, 16, 18, 24].map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={
              resolvedInstallments.maxCardInstallments === preset ? "default" : "outline"
            }
            onClick={() =>
              onApplyPolicy(
                normalizeSupplierPaymentPolicy({
                  maxCardInstallments: preset,
                  maxBoletoInstallments: preset,
                  cardInterestFree: true,
                  allowedPaymentMethods: ["pix", "credit_card", "boleto"],
                }),
              )
            }
            className="h-11 text-2xs rounded-lg font-semibold"
          >
            Até {preset}x Sem Juros
          </Button>
        ))}
      </div>

      {installmentsOptions && installmentsOptions.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40 text-2xs">
          {installmentsOptions.map((opt, i) => (
            <div key={i} className="flex justify-between items-center text-muted-foreground">
              <span>
                {opt.installments_count}x{" "}
                {opt.method === "pix"
                  ? "à vista no Pix"
                  : opt.method === "boleto"
                    ? "no Boleto"
                    : "no Cartão"}
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatMoney(opt.installment_value_cents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
