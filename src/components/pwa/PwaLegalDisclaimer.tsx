import React from "react";
import { ShieldCheck, ExternalLink, Info } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface PwaLegalDisclaimerProps {
  storeName: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const PwaLegalDisclaimer: React.FC<PwaLegalDisclaimerProps> = ({
  storeName,
  checked,
  onCheckedChange,
  disabled = false,
}) => {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5 text-xs text-muted-foreground select-none">
      <div className="flex items-start gap-2.5">
        <input
          id="pwa-terms-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          disabled={disabled}
          className="size-4.5 rounded border-border text-primary focus:ring-primary/40 mt-0.5 cursor-pointer disabled:cursor-not-allowed"
        />
        <label
          htmlFor="pwa-terms-checkbox"
          className="text-xs leading-relaxed text-foreground/90 cursor-pointer"
        >
          Li e concordo com os{" "}
          <Link
            to="/termos"
            target="_blank"
            className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
          >
            Termos Gerais do Waesy
            <ExternalLink className="size-2.5 inline" />
          </Link>{" "}
          e com a{" "}
          <Link
            to="/privacidade"
            target="_blank"
            className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
          >
            Política de Privacidade
            <ExternalLink className="size-2.5 inline" />
          </Link>
          .
        </label>
      </div>

      <div className="p-2 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-1 text-muted-foreground">
        <div className="flex items-center gap-1 font-semibold text-foreground/80">
          <Info className="size-3 text-primary shrink-0" />
          <span>Aviso de Responsabilidade Comercial</span>
        </div>
        <p className="leading-normal">
          O Waesy provê a infraestrutura tecnológica. A loja parceira{" "}
          <strong className="text-foreground">{storeName}</strong> é civil, fiscal e comercialmente
          responsável pelos produtos ofertados, qualidade, expedição, devoluções e emissão de notas
          fiscais conforme o Código de Defesa do Consumidor.
        </p>
      </div>
    </div>
  );
};
