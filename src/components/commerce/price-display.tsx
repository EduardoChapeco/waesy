import { cn } from "@/lib/utils";
import { formatMoney, type CurrencyCode } from "@/lib/money";

export function PriceDisplay({
  amountCents,
  priceCents,
  compareAtCents,
  currency = "BRL",
  className,
  size = "md",
}: {
  amountCents?: number;
  priceCents?: number;
  compareAtCents?: number | null;
  currency?: CurrencyCode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const effectiveAmount = amountCents ?? priceCents ?? 0;
  const hasCompare = typeof compareAtCents === "number" && compareAtCents > effectiveAmount;

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  } as const;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", sizes[size])}>
        {formatMoney(effectiveAmount, currency)}
      </span>
      {hasCompare ? (
        <span className="text-sm text-muted-foreground line-through">
          {formatMoney(compareAtCents!, currency)}
        </span>
      ) : null}
    </div>
  );
}
