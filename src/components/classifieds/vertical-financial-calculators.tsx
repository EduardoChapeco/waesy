import { useMemo, useState } from "react";
import { BarChart3, Calculator, Home } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import {
  calcFipeDiscountSummary,
  calcPropertyFinancingMonthlyCents,
  calcRentalMonthlyTotalCents,
} from "@/lib/pricing/price-calculator";

export interface VerticalFinancialCalculatorsProps {
  nicheId: string;
  priceCents: number;
  attributes?: Record<string, unknown> | null;
}

function parsePositiveCents(
  attrs: Record<string, unknown>,
  centsKeys: string[],
  reaisKeys: string[]
): number {
  for (const key of centsKeys) {
    const val = Number(attrs[key]);
    if (Number.isFinite(val) && val > 0) return Math.round(val);
  }
  for (const key of reaisKeys) {
    const raw = attrs[key];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw * 100);
    }
    if (typeof raw === "string" && raw.trim()) {
      const num = Number.parseFloat(
        raw.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")
      );
      if (Number.isFinite(num) && num > 0) return Math.round(num * 100);
    }
  }
  return 0;
}

export function VerticalFinancialCalculators({
  nicheId,
  priceCents,
  attributes,
}: VerticalFinancialCalculatorsProps) {
  const attrs = attributes || {};
  const normalizedNiche = String(nicheId || "").toLowerCase();

  const isVehicle =
    normalizedNiche.includes("veic") || normalizedNiche.includes("auto");
  const isProperty =
    normalizedNiche.includes("imov") || normalizedNiche.includes("real");

  const fipeCents = useMemo(
    () =>
      isVehicle
        ? parsePositiveCents(
            attrs,
            ["fipe_cents", "fipe_price_cents"],
            ["fipe", "fipe_value", "valor_fipe"]
          )
        : 0,
    [isVehicle, attrs]
  );

  const fipeSummary = useMemo(
    () =>
      fipeCents > 0 ? calcFipeDiscountSummary({ priceCents, fipeCents }) : null,
    [fipeCents, priceCents]
  );

  const condoCents = useMemo(
    () =>
      isProperty
        ? parsePositiveCents(
            attrs,
            ["condo_fee_cents", "condominio_cents"],
            ["condominio", "condo_fee"]
          )
        : 0,
    [isProperty, attrs]
  );

  const iptuAnnualCents = useMemo(
    () =>
      isProperty
        ? parsePositiveCents(
            attrs,
            ["iptu_annual_cents", "iptu_cents"],
            ["iptu", "iptu_anual"]
          )
        : 0,
    [isProperty, attrs]
  );

  const operationType = String(
    attrs.operacao || attrs.transaction_type || attrs.purpose || ""
  ).toLowerCase();
  const isRental =
    isProperty &&
    (operationType.includes("alug") ||
      operationType.includes("loca") ||
      operationType.includes("rent") ||
      condoCents > 0);

  const rentalBreakdown = useMemo(
    () =>
      isRental && priceCents > 0
        ? calcRentalMonthlyTotalCents({
            rentCents: priceCents,
            condoCents,
            iptuAnnualCents,
          })
        : null,
    [isRental, priceCents, condoCents, iptuAnnualCents]
  );

  const showFinancing = isProperty && !operationType.includes("alug") && priceCents > 0;
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [years, setYears] = useState(25);
  const [monthlyInterestPct, setMonthlyInterestPct] = useState(0.85);

  const finResult = useMemo(() => {
    if (!showFinancing) return null;
    const clampedDown = Math.min(90, Math.max(0, downPaymentPct));
    const finAmountCents = Math.round(priceCents * (1 - clampedDown / 100));
    return {
      finAmountCents,
      ...calcPropertyFinancingMonthlyCents({
        finAmountCents,
        monthlyInterestPct,
        years,
      }),
    };
  }, [showFinancing, priceCents, downPaymentPct, monthlyInterestPct, years]);

  if (!fipeSummary && !rentalBreakdown && !finResult) {
    return null;
  }

  return (
    <div className="space-y-4 pt-3 border-t border-border/50">
      {fipeSummary ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Referência Tabela FIPE
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {formatMoney(fipeSummary.fipeCents)}
              </p>
            </div>
          </div>

          <Badge
            variant={
              fipeSummary.relation === "below"
                ? "success"
                : fipeSummary.relation === "above"
                ? "warning"
                : "secondary"
            }
          >
            {fipeSummary.relation === "below"
              ? `${Math.abs(fipeSummary.diffPct)}% abaixo da FIPE`
              : fipeSummary.relation === "above"
              ? `${fipeSummary.diffPct}% acima da FIPE`
              : "No valor da FIPE"}
          </Badge>
        </div>
      ) : null}

      {rentalBreakdown ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Home className="size-4 text-primary" aria-hidden="true" />
            <span>Pacote Mensal Estimado</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground tabular-nums">
            <div className="flex justify-between">
              <span>Aluguel base</span>
              <span className="font-medium text-foreground">
                {formatMoney(rentalBreakdown.rentCents)}
              </span>
            </div>
            {rentalBreakdown.condoCents > 0 ? (
              <div className="flex justify-between">
                <span>Condomínio</span>
                <span className="font-medium text-foreground">
                  {formatMoney(rentalBreakdown.condoCents)}
                </span>
              </div>
            ) : null}
            {rentalBreakdown.iptuMonthlyCents > 0 ? (
              <div className="flex justify-between">
                <span>IPTU mensal (anual / 12)</span>
                <span className="font-medium text-foreground">
                  {formatMoney(rentalBreakdown.iptuMonthlyCents)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border/60 pt-1 text-sm font-bold text-foreground">
              <span>Total mensal</span>
              <span>{formatMoney(rentalBreakdown.totalMonthlyCents)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {finResult ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Calculator className="size-4 text-primary" aria-hidden="true" />
              <span>Simulador de Financiamento</span>
            </span>
            <span className="text-xs font-bold text-primary tabular-nums">
              {formatMoney(finResult.monthlyPaymentCents)}/mês
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="fin-down" className="text-xs text-muted-foreground">
                Entrada (%)
              </Label>
              <Input
                id="fin-down"
                type="number"
                min={0}
                max={90}
                value={downPaymentPct}
                onChange={(e) =>
                  setDownPaymentPct(
                    Math.min(90, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="h-11 min-h-11 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fin-years" className="text-xs text-muted-foreground">
                Prazo (anos)
              </Label>
              <Input
                id="fin-years"
                type="number"
                min={1}
                max={35}
                value={years}
                onChange={(e) =>
                  setYears(Math.min(35, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-11 min-h-11 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="fin-rate" className="text-xs text-muted-foreground">
                Taxa (%/mês)
              </Label>
              <Input
                id="fin-rate"
                type="number"
                min={0}
                max={5}
                step="0.05"
                value={monthlyInterestPct}
                onChange={(e) =>
                  setMonthlyInterestPct(
                    Math.min(5, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="h-11 min-h-11 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground tabular-nums">
            {finResult.totalInstallments} parcelas sobre{" "}
            {formatMoney(finResult.finAmountCents)} financiados (Tabela Price).
          </p>
        </div>
      ) : null}
    </div>
  );
}
