import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { formatCep, validateCep } from "@/lib/document-validator";
import { Loader2, MapPin } from "lucide-react";

export interface AddressData {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
}

export interface CepFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (masked: string, cleanDigits: string) => void;
  onAddressFound?: (data: AddressData) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  autoLookup?: boolean;
}

/**
 * CepField — Componente canônico de CEP brasileiro (Código de Endereçamento Postal).
 * - Máscara estrita no padrão 00000-000.
 * - Busca assíncrona automática via ViaCEP e BrasilAPI de alta resiliência.
 * - Preenchimento automático de logradouro, bairro, cidade e estado.
 * - Spinner integrado sem tremor de layout (Zero FOUC/CLS).
 */
export const CepField = forwardRef<HTMLInputElement, CepFieldProps>(
  (
    {
      className,
      value = "",
      onChange,
      onAddressFound,
      onLoadingChange,
      autoLookup = true,
      placeholder = "00000-000",
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      setDisplayValue(formatCep(value));
    }, [value]);

    const performLookup = async (cep8: string) => {
      if (!autoLookup || !onAddressFound) return;
      setIsLoading(true);
      onLoadingChange?.(true);

      try {
        // Tenta ViaCEP primeiro
        const res = await fetch(`https://viacep.com.br/ws/${cep8}/json/`);
        const data = await res.json();

        if (!data.erro && data.localidade) {
          onAddressFound({
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
            ibge: data.ibge,
          });
          return;
        }

        // Fallback para BrasilAPI
        const fallbackRes = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep8}`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.city) {
          onAddressFound({
            street: fallbackData.street || "",
            neighborhood: fallbackData.neighborhood || "",
            city: fallbackData.city || "",
            state: fallbackData.state || "",
          });
        }
      } catch (err) {
        console.warn("[CepField] Falha na consulta de CEP:", err);
      } finally {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatCep(raw);
      setDisplayValue(formatted);

      const clean = formatted.replace(/\D/g, "");
      onChange?.(formatted, clean);

      if (clean.length === 8) {
        performLookup(clean);
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
          maxLength={9}
          className={cn("font-mono tracking-tight text-foreground pr-9", className)}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted-foreground">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <MapPin className="size-3.5 opacity-60" />
          )}
        </div>
      </div>
    );
  }
);

CepField.displayName = "CepField";
