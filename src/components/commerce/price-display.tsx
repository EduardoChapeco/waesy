import { cn } from "@/lib/utils";
import { formatMoney, type CurrencyCode } from "@/lib/money";

/**
 * PriceDisplay — formats server-provided integer cents only.
 * It performs NO commercial calculation (AGENTS.md rule 2). Discount/compare
 * values must already be computed server-side and passed in.
 */
export function PriceDisplay({
 amountCents,
 compareAtCents,
 currency = "BRL",
 className,
 size = "md",
}: {
 amountCents: number;
 compareAtCents?: number | null;
 currency?: CurrencyCode;
 className?: string;
 size?: "sm" | "md" | "lg";
}) {
 const hasCompare = typeof compareAtCents === "number" && compareAtCents > amountCents;

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
