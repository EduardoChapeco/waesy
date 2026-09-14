import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  maskDocumentProgressive,
  cleanDocument,
  validateCpfMod11,
  validateCnpjMod11,
} from "@/lib/document-validator";
import { Check, ShieldCheck, AlertCircle } from "lucide-react";

export interface DocumentFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string, isValid: boolean, cleanDigits: string) => void;
  mode?: "cpf" | "cnpj" | "dynamic";
  showStatusIndicator?: boolean;
}

/**
 * DocumentField — Componente canônico de documento brasileiro (CPF / CNPJ).
 * - Padrão Apple HIG & Anti-AI Design: limpo, silencioso, responsivo.
 * - Máscara progressiva em tempo real enquanto digita.
 * - Modo dinâmico: alterna automaticamente entre CPF (11 dígitos) e CNPJ (14 dígitos).
 * - Validação oficial Módulo 11 da Receita Federal com indicador visual sutil.
 */
export const DocumentField = forwardRef<HTMLInputElement, DocumentFieldProps>(
  (
    {
      className,
      value = "",
      onChange,
      mode = "dynamic",
      showStatusIndicator = true,
      placeholder,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isTouched, setIsTouched] = useState(false);

    // Sincroniza valor inicial ou externo
    useEffect(() => {
      const masked = maskDocumentProgressive(value, mode);
      setDisplayValue(masked);
    }, [value, mode]);

    const clean = cleanDocument(displayValue);
    const isCpf = mode === "cpf" || (mode === "dynamic" && clean.length <= 11);
    const isComplete = isCpf ? clean.length === 11 : clean.length === 14;
    const isValid = isCpf ? validateCpfMod11(clean) : validateCnpjMod11(clean);

    const defaultPlaceholder =
      mode === "cpf"
        ? "000.000.000-00"
        : mode === "cnpj"
        ? "00.000.000/0000-00"
        : "CPF ou CNPJ";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const masked = maskDocumentProgressive(raw, mode);
      setDisplayValue(masked);

      const updatedClean = cleanDocument(masked);
      const isUpdatedCpf = mode === "cpf" || (mode === "dynamic" && updatedClean.length <= 11);
      const updatedValid = isUpdatedCpf
        ? validateCpfMod11(updatedClean)
        : validateCnpjMod11(updatedClean);

      onChange?.(masked, updatedValid, updatedClean);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsTouched(true);
      onBlur?.(e);
    };

    return (
      <div className="relative flex items-center w-full">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || defaultPlaceholder}
          maxLength={mode === "cpf" ? 14 : 18}
          className={cn(
            "font-mono tracking-tight text-foreground transition-colors",
            showStatusIndicator && isComplete && "pr-9",
            isTouched && isComplete && !isValid && "border-destructive/60 focus-visible:ring-destructive/30",
            isTouched && isComplete && isValid && "border-emerald-500/50 focus-visible:ring-emerald-500/30",
            className
          )}
          {...props}
        />

        {showStatusIndicator && isComplete && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none transition-all">
            {isValid ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center" title="Documento válido na Receita Federal">
                <Check className="size-4 stroke-[2.5]" />
              </span>
            ) : (
              <span className="text-destructive flex items-center" title="Dígito verificador inválido">
                <AlertCircle className="size-4" />
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

DocumentField.displayName = "DocumentField";
