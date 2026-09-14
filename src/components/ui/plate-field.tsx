import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { maskPlate, validatePlate } from "@/lib/document-validator";
import { Check, Car } from "lucide-react";

export interface PlateFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (masked: string, isValid: boolean, clean: string) => void;
  showIndicator?: boolean;
}

/**
 * PlateField — Entrada canônica de placas veiculares brasileiras.
 * - Suporta padrão Tradicional (ABC-1234) e Mercosul (ABC1D23).
 * - Força caixa alta (UPPERCASE) em tempo real.
 * - Validação oficial Detran/Denatran com micro-indicador visual.
 */
export const PlateField = forwardRef<HTMLInputElement, PlateFieldProps>(
  (
    {
      className,
      value = "",
      onChange,
      showIndicator = true,
      placeholder = "ABC-1234 ou ABC1D23",
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      setDisplayValue(maskPlate(value));
    }, [value]);

    const isValid = validatePlate(displayValue);
    const isComplete = displayValue.replace(/[^a-zA-Z0-9]/g, "").length === 7;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = maskPlate(raw);
      setDisplayValue(masked);

      const clean = masked.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const valid = validatePlate(masked);
      onChange?.(masked, valid, clean);
    };

    return (
      <div className="relative flex items-center w-full">
        <Input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={8}
          className={cn(
            "font-mono font-bold tracking-wider uppercase text-foreground pr-9",
            isComplete && isValid && "border-emerald-500/50 focus-visible:ring-emerald-500/30",
            className
          )}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted-foreground">
          {showIndicator && isComplete && isValid ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              <Check className="size-4 stroke-[2.5]" />
            </span>
          ) : (
            <Car className="size-3.5 opacity-60" />
          )}
        </div>
      </div>
    );
  }
);

PlateField.displayName = "PlateField";
