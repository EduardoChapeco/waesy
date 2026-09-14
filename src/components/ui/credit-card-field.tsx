import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  maskCreditCardNumber,
  maskCardExpiry,
  detectCardBrand,
  type CardBrand,
} from "@/lib/document-validator";
import { CreditCard, Lock } from "lucide-react";

export interface CreditCardNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (formatted: string, brand: CardBrand, cleanDigits: string) => void;
}

/**
 * CreditCardNumberInput — Entrada para número de cartão com máscara 4x4 e auto-detecção de bandeira.
 */
export const CreditCardNumberInput = forwardRef<HTMLInputElement, CreditCardNumberInputProps>(
  ({ className, value = "", onChange, placeholder = "0000 0000 0000 0000", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      setDisplayValue(maskCreditCardNumber(value));
    }, [value]);

    const brand = detectCardBrand(displayValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = maskCreditCardNumber(raw);
      setDisplayValue(formatted);

      const detected = detectCardBrand(formatted);
      const clean = formatted.replace(/\D/g, "");
      onChange?.(formatted, detected, clean);
    };

    const getBrandBadge = () => {
      switch (brand) {
        case "visa":
          return <span className="font-black italic text-blue-600 dark:text-blue-400 text-xs tracking-tighter">VISA</span>;
        case "mastercard":
          return (
            <div className="flex -space-x-1.5 items-center">
              <span className="size-3.5 rounded-full bg-red-500 opacity-90" />
              <span className="size-3.5 rounded-full bg-amber-500 opacity-90" />
            </div>
          );
        case "elo":
          return <span className="font-black text-amber-500 text-[11px] tracking-tight">elo</span>;
        case "amex":
          return <span className="font-bold text-sky-600 text-[10px] tracking-tight">AMEX</span>;
        case "hipercard":
          return <span className="font-bold text-red-600 text-[10px]">HIPER</span>;
        default:
          return <CreditCard className="size-4 opacity-50" />;
      }
    };

    return (
      <div className="relative flex items-center w-full">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={19}
          className={cn("font-mono tracking-wider text-foreground pr-10", className)}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none">
          {getBrandBadge()}
        </div>
      </div>
    );
  }
);

CreditCardNumberInput.displayName = "CreditCardNumberInput";

export interface CardExpiryInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (formatted: string, isValid: boolean) => void;
}

/**
 * CardExpiryInput — Entrada para data de validade com máscara MM/AA e checagem de calendário.
 */
export const CardExpiryInput = forwardRef<HTMLInputElement, CardExpiryInputProps>(
  ({ className, value = "", onChange, placeholder = "MM/AA", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      setDisplayValue(maskCardExpiry(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = maskCardExpiry(raw);
      setDisplayValue(formatted);

      let isValid = false;
      if (formatted.length === 5) {
        const [monthStr, yearStr] = formatted.split("/");
        const month = parseInt(monthStr, 10);
        const year = parseInt(`20${yearStr}`, 10);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (month >= 1 && month <= 12) {
          if (year > currentYear || (year === currentYear && month >= currentMonth)) {
            isValid = true;
          }
        }
      }

      onChange?.(formatted, isValid);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={5}
        className={cn("font-mono text-center tracking-wider", className)}
        {...props}
      />
    );
  }
);

CardExpiryInput.displayName = "CardExpiryInput";

export interface CardCvvInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (val: string) => void;
  brand?: CardBrand;
}

/**
 * CardCvvInput — Entrada de código de segurança (CVV) com máscara numérica e ícone de segurança.
 */
export const CardCvvInput = forwardRef<HTMLInputElement, CardCvvInputProps>(
  ({ className, value = "", onChange, brand = "unknown", placeholder = "123", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const maxLen = brand === "amex" ? 4 : 3;

    useEffect(() => {
      const digits = value.replace(/\D/g, "").slice(0, maxLen);
      setDisplayValue(digits);
    }, [value, maxLen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
      setDisplayValue(digits);
      onChange?.(digits);
    };

    return (
      <div className="relative flex items-center w-full">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLen}
          className={cn("font-mono text-center tracking-widest pr-8", className)}
          {...props}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none opacity-60">
          <Lock className="size-3.5" />
        </div>
      </div>
    );
  }
);

CardCvvInput.displayName = "CardCvvInput";
