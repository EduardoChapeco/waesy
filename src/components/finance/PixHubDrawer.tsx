/**
 * ============================================================================
 * Waesy Platform — PixHubDrawer.tsx (Área Pix Unificada 99Pay Parity)
 * ============================================================================
 * Drawer nativo da Área Pix:
 * - 6 Cartões squircle de ações imediatas: Transferir, QR Code, Receber,
 *   Agendar Pix, Pix Copia e Cola, Pix no Cartão.
 * - Minhas Chaves Pix com cópia com 1 clique e feedback visual.
 * - CTAs táteis para cadastrar chaves e ajustar limites Pix.
 * Ref: Prints Captura de tela 2026-10-16 155905.png (Tela 1), unnamed (3).webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  QrCode,
  ArrowLeftRight,
  ArrowDownLeft,
  Calendar,
  Copy,
  CreditCard,
  Key,
  Shield,
  HelpCircle,
  Plus,
  Check,
  ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onSelectAction?: (actionId: "transfer" | "qrcode" | "receive" | "schedule" | "copy_paste" | "card_pix") => void;
  myKeys?: PixKeyItem[];
  userFullName?: string;
}

const DEFAULT_KEYS: PixKeyItem[] = [
  {
    id: "key-1",
    type: "cpf",
    label: "CPF",
    value: "500.345.324-12",
  },
  {
    id: "key-2",
    type: "email",
    label: "E-mail",
    value: "usuario@waesy.com",
  },
];

export function PixHubDrawer({
  open,
  onOpenChange,
  onSelectAction,
  myKeys = DEFAULT_KEYS,
  userFullName = "Você",
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

  const handleAction = (actionId: "transfer" | "qrcode" | "receive" | "schedule" | "copy_paste" | "card_pix") => {
    onSelectAction?.(actionId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88dvh] max-h-[88dvh] p-0 flex flex-col rounded-t-3xl border-t border-border bg-background z-50 overflow-hidden"
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header */}
        <SheetHeader className="px-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="text-base font-bold text-foreground tracking-tight">
              Área Pix
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Pagamentos e transferências 24h sem tarifas
            </p>
          </div>

          <button
            type="button"
            title="Ajuda Pix"
            aria-label="Ajuda Pix"
            onClick={() => toast.info("Central de Ajuda Pix")}
            className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <HelpCircle className="size-5" />
          </button>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar pb-12 pb-safe">
          {/* 6 Ações Principais em Grade Squircle */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleAction("transfer")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <ArrowLeftRight className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Transferir
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("qrcode")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <QrCode className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Ler QR Code
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("receive")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <ArrowDownLeft className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Receber
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("schedule")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <Calendar className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Agendar Pix
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("copy_paste")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <Copy className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Copia e Cola
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("card_pix")}
              className="h-24 min-h-24 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 active:bg-muted/70 active:scale-95 p-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground">
                <CreditCard className="size-5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate block w-full">
                Pix no Cartão
              </span>
            </button>
          </div>

          {/* Minhas Chaves Pix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Minhas Chaves Pix
              </span>
              <button
                type="button"
                onClick={() => toast.info("Cadastro de nova chave Pix")}
                className="text-xs font-bold text-primary hover:underline h-11 min-h-11 flex items-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              >
                + Cadastrar Chave
              </button>
            </div>

            <div className="space-y-2">
              {myKeys.map((k) => (
                <div
                  key={k.id}
                  className="rounded-2xl border border-border/70 bg-card p-3 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                      <Key className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-2xs font-bold text-muted-foreground uppercase block">
                        {k.label}
                      </span>
                      <span className="text-xs font-bold font-mono text-foreground truncate block">
                        {k.value}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyKey(k)}
                    aria-label={`Copiar chave ${k.label}`}
                    className="size-11 min-h-11 min-w-11 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {copiedKeyId === k.id ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botões de Ação Inferiores */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={() => toast.info("Gerenciador de Limites Diários")}
              variant="outline"
              className="w-full h-11 min-h-11 rounded-xl font-bold text-xs flex items-center justify-between px-4 border-border/70"
            >
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <span>Meus Limites Pix</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
