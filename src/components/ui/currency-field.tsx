import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { formatCentsToBRL, parseBRLToCents } from "@/lib/money";

export interface CurrencyFieldProps
 extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
 value?: number | null; // Valor em centavos inteiros (ex: 80000 = R$ 800,00)
 onChange?: (value: number | undefined) => void;
 currencySymbol?: string | null;
 allowZero?: boolean;
 onEnter?: () => void;
 compact?: boolean;
}

/**
 * CurrencyField
 * Componente canônico de entrada monetária em BRL (Real Brasileiro).
 * - Digitação 100% livre com máscara progressiva em tempo real.
 * - Suporte a colar valores (ex: "R$ 1.500,00", "1500.50", "1500,50").
 * - Armazena e emite o valor sempre como número inteiro em centavos.
 * - Suporta modo compacto para tabelas e matrizes de preços.
 */
export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
 (
 {
 className,
 value,
 onChange,
 currencySymbol = "R$",
 allowZero = true,
 onEnter,
 compact = false,
 onBlur,
 onFocus,
 onKeyDown,
 placeholder = "0,00",
 ...props
 },
 ref
 ) => {
 const [displayValue, setDisplayValue] = useState("");

 // Sincroniza o valor externo (centavos) para a máscara visual
 useEffect(() => {
 if (value === undefined || value === null || isNaN(value)) {
 setDisplayValue("");
 } else if (value === 0) {
 setDisplayValue(allowZero ? "0,00" : "");
 } else {
 setDisplayValue(formatCentsToBRL(value));
 }
 }, [value, allowZero]);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const rawInput = e.target.value;

 // Extrai apenas os dígitos numéricos
 const rawDigits = rawInput.replace(/\D/g, "");

 if (!rawDigits) {
 setDisplayValue("");
 onChange?.(allowZero ? 0 : undefined);
 return;
 }

 const cents = parseInt(rawDigits, 10);
 if (isNaN(cents)) {
 setDisplayValue("");
 onChange?.(allowZero ? 0 : undefined);
 return;
 }

 if (cents === 0) {
 setDisplayValue("0,00");
 onChange?.(0);
 return;
 }

 const formatted = formatCentsToBRL(cents);
 setDisplayValue(formatted);
 onChange?.(cents);
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === "Enter" && onEnter) {
 e.preventDefault();
 onEnter();
 }
 onKeyDown?.(e);
 };

 if (currencySymbol === null || currencySymbol === "") {
 return (
 <Input
 ref={ref}
 type="text"
 inputMode="numeric"
 placeholder={placeholder}
 className={cn(
 "font-mono font-semibold",
 compact && "h-8 px-2 text-right text-xs",
 className
 )}
 value={displayValue}
 onChange={handleChange}
 onKeyDown={handleKeyDown}
 onBlur={onBlur}
 onFocus={onFocus}
 {...props}
 />
 );
 }

 return (
 <div className={cn("relative flex items-center", compact && "w-full")}>
 <span
 className={cn(
 "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none select-none",
 compact && "left-2 text-2xs"
 )}
 >
 {currencySymbol}
 </span>
 <Input
 ref={ref}
 type="text"
 inputMode="numeric"
 placeholder={placeholder}
 className={cn(
 "pl-9 font-mono font-semibold",
 compact && "h-8 pl-7 pr-2 text-right text-xs",
 className
 )}
 value={displayValue}
 onChange={handleChange}
 onKeyDown={handleKeyDown}
 onBlur={onBlur}
 onFocus={onFocus}
 {...props}
 />
 </div>
 );
 }
);

CurrencyField.displayName = "CurrencyField";
