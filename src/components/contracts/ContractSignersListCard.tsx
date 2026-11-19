import React from "react";
import { Loader2, ScanLine, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTRACT_SIGNER_ROLE_GROUPS, type StudioSignerDraft } from "@/lib/contracts/signer-roles";
import { formatPhone, maskCpfProgressive } from "@/lib/document-validator";
import { cn } from "@/lib/utils";

interface ContractSignersListCardProps {
  signers: StudioSignerDraft[];
  selectedSignerIdx: number;
  isLocked: boolean;
  isProcessingOcr: number | null;
  onSelectSigner: (idx: number) => void;
  onUpdateSigner: (idx: number, patch: Partial<StudioSignerDraft>) => void;
  onRemoveSigner: (idx: number) => void;
  onSignerOcr: (idx: number, file?: File) => void;
}

export function ContractSignersListCard({
  signers,
  selectedSignerIdx,
  isLocked,
  isProcessingOcr,
  onSelectSigner,
  onUpdateSigner,
  onRemoveSigner,
  onSignerOcr,
}: ContractSignersListCardProps) {
  return (
    <div className="space-y-3">
      {signers.map((signer, idx) => {
        const isSelected = idx === selectedSignerIdx;
        return (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            onClick={() => onSelectSigner(idx)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSigner(idx);
              }
            }}
            className={cn(
              "rounded-lg p-3 space-y-3 transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-primary/60 bg-primary/5"
                : "border-border/70 bg-muted/20",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-3 rounded-full shrink-0 waesy-dyn-bg"
                  style={{ "--dyn-bg": signer.colorCode } as React.CSSProperties}
                />
                <span className="text-xs font-semibold text-foreground truncate">
                  {signer.name || `Signatário ${idx + 1}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!isLocked && (
                  <label className="inline-flex items-center gap-1 px-2 h-11 min-h-11 sm:h-8 sm:min-h-0 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer">
                    {isProcessingOcr === idx ? (
                      <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <ScanLine className="size-3.5" />
                    )}
                    <span>RG/CNH</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        onSignerOcr(idx, e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
                {!isLocked && signers.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remover signatário"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSigner(idx);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Input
                disabled={isLocked}
                placeholder="Nome completo"
                value={signer.name}
                onChange={(e) => onUpdateSigner(idx, { name: e.target.value })}
                className="h-9 text-xs bg-background"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  disabled={isLocked}
                  placeholder="WhatsApp (DDD)"
                  value={signer.phone}
                  onChange={(e) => onUpdateSigner(idx, { phone: formatPhone(e.target.value) })}
                  className="h-9 text-xs bg-background"
                />
                <Input
                  disabled={isLocked}
                  placeholder="E-mail"
                  value={signer.email}
                  onChange={(e) => onUpdateSigner(idx, { email: e.target.value })}
                  className="h-9 text-xs bg-background"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  disabled={isLocked}
                  placeholder="CPF (opc.)"
                  value={signer.cpf}
                  onChange={(e) => onUpdateSigner(idx, { cpf: maskCpfProgressive(e.target.value) })}
                  className="h-9 text-xs bg-background"
                />
                <Select
                  disabled={isLocked}
                  value={signer.dispatchChannel}
                  onValueChange={(v: any) => onUpdateSigner(idx, { dispatchChannel: v })}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="direct_link">Link Direto</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  disabled={isLocked}
                  value={signer.role}
                  onValueChange={(v: any) => onUpdateSigner(idx, { role: v })}
                >
                  <SelectTrigger className="h-11 min-h-11 sm:h-9 sm:min-h-0 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CONTRACT_SIGNER_ROLE_GROUPS.map((grp) => (
                      <SelectGroup key={grp.group}>
                        <SelectLabel className="text-2xs font-semibold text-muted-foreground">
                          {grp.group}
                        </SelectLabel>
                        {grp.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
