/**
 * ============================================================================
 * Waesy Platform — PixHubDrawer.tsx (Copycat Minimalist Pix Area Parity)
 * ============================================================================
 * Drawer nativo da Área Pix (Conforme tela 1 do design anexo):
 * - Header superior com botão Voltar (<), Título "Área Pix" e Ajuda (?).
 * - 6 Cartões squircle de ações imediatas em grade 3x2:
 *   1. Transferir
 *   2. Pagar QR Code
 *   3. Receber
 *   4. Agendar Pix
 *   5. Pix Copia e Cola
 *   6. Fazer Pix com cartão
 * - Seção "Minhas chaves" com visual de chave CPF e cópia em 1 toque.
 * - Três CTAs táteis proeminentes no rodapé:
 *   - "Cadastrar chave" (Verde limão primário proeminente h-12)
 *   - "Gerenciar chaves" (Neutro secundário h-12)
 *   - "Meus limites Pix" (Neutro secundário h-12)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  QrCode,
  ArrowDownLeft,
  Calendar,
  Copy,
  CreditCard,
  Key,
  HelpCircle,
  Check,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PixKeyItem {
  id: string;
  type: "cpf" | "email" | "phone" | "random";
  label: string;
  value: string;
}

export interface PixHubDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction?: (
    actionId: "transfer" | "qrcode" | "receive" | "schedule" | "copy_paste" | "card_pix"
  ) => void;
  myKeys?: PixKeyItem[];
  userFullName?: string;
  onRegisterKeyClick?: () => void;
  onManageKeysClick?: () => void;
  onPixLimitsClick?: () => void;
}

const DEFAULT_KEYS: PixKeyItem[] = [
  {
    id: "key-1",
    type: "cpf",
    label: "CPF",
    value: "500.345.324-12",
  },
];

export function PixHubDrawer({
  open,
  onOpenChange,
  onSelectAction,
  myKeys = DEFAULT_KEYS,
  userFullName = "Você",
  onRegisterKeyClick,
  onManageKeysClick,
  onPixLimitsClick,
}: PixHubDrawerProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleCopyKey = (key: PixKeyItem) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(key.value);
      setCopiedKeyId(key.id);
      toast.success(`Chave ${key.label} copiada!`);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const handleAction = (
    actionId: "transfer" | "qrcode" | "receive" | "schedule" | "copy_paste" | "card_pix"
  ) => {
    onSelectAction?.(actionId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] max-h-[92dvh] p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header com Voltar (<), Título "Área Pix" e Ajuda (?) */}
        <SheetHeader className="px-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Voltar"
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <ArrowLeft className="size-5" />
            </button>
            <SheetTitle className="text-lg font-bold text-foreground tracking-tight">
              Área Pix
            </SheetTitle>
          </div>

          <button
            type="button"
            title="Ajuda Pix"
            aria-label="Ajuda Pix"
            onClick={() => toast.info("Central de Ajuda Pix — Atendimento 24h")}
            className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            <HelpCircle className="size-5" />
          </button>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar pb-12 pb-safe">
          {/* 6 Ações Principais em Grade Squircle 3x2 idêntica ao design anexo */}
          <div className="grid grid-cols-3 gap-3">
            {/* 1. Transferir */}
            <button
              type="button"
              onClick={() => handleAction("transfer")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <ArrowLeftRight className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Transferir
              </span>
            </button>

            {/* 2. Pagar QR Code */}
            <button
              type="button"
              onClick={() => handleAction("qrcode")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <QrCode className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Pagar QR Code
              </span>
            </button>

            {/* 3. Receber */}
            <button
              type="button"
              onClick={() => handleAction("receive")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <ArrowDownLeft className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Receber
              </span>
            </button>

            {/* 4. Agendar Pix */}
            <button
              type="button"
              onClick={() => handleAction("schedule")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <Calendar className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Agendar Pix
              </span>
            </button>

            {/* 5. Pix Copia e Cola */}
            <button
              type="button"
              onClick={() => handleAction("copy_paste")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <Copy className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Pix Copia e Cola
              </span>
            </button>

            {/* 6. Fazer Pix com cartão */}
            <button
              type="button"
              onClick={() => handleAction("card_pix")}
              className="h-24 min-h-24 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/50 p-2 flex flex-col items-center justify-center gap-2 transition-all text-center cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <div className="size-10 rounded-xl bg-zinc-200/70 flex items-center justify-center text-zinc-900">
                <CreditCard className="size-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-800 truncate block w-full">
                Fazer Pix com cartão
              </span>
            </button>
          </div>

          {/* Seção: Minhas chaves */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Minhas chaves
            </h3>

            <div className="space-y-2">
              {myKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 shrink-0">
                      <Key className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-900 block truncate">
                        {key.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate block">
                        {key.value}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyKey(key)}
                    aria-label={`Copiar chave ${key.label}`}
                    className="size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center hover:bg-zinc-200/60 active:scale-95 text-zinc-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                  >
                    {copiedKeyId === key.id ? (
                      <Check className="size-5 text-emerald-600 font-bold" />
                    ) : (
                      <Copy className="size-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3 CTAs Táteis Inferiores Conforme Design do App */}
          <div className="space-y-2.5 pt-4">
            <button
              type="button"
              onClick={onRegisterKeyClick || (() => toast.info("Cadastro de nova chave Pix"))}
              className="w-full h-12 min-h-12 rounded-xl bg-lime-400 hover:bg-lime-500 active:bg-lime-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <span>Cadastrar chave</span>
            </button>

            <button
              type="button"
              onClick={onManageKeysClick || (() => toast.info("Gerenciador de chaves Pix"))}
              className="w-full h-12 min-h-12 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <span>Gerenciar chaves</span>
            </button>

            <button
              type="button"
              onClick={onPixLimitsClick || (() => toast.info("Ajuste de limites de transferência Pix"))}
              className="w-full h-12 min-h-12 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <span>Meus limites Pix</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
