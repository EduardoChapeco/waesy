/**
 * ============================================================================
 * Waesy Platform — CardSettingsDrawer.tsx (99Pay & Apple HIG Parity)
 * ============================================================================
 * Drawer de configurações e segurança do cartão de crédito/débito Waesy Bank:
 * - Preview visual imersivo do Cartão Virtual com efeito metálico, chip EMV,
 *   símbolo contactless e alternância de visibilidade do número e CVV.
 * - Chave de bloqueio temporário imediato (Zero-Trust).
 * - Ajuste dinâmico de limite com slider tátil.
 * - Controles de segurança por canal (Online, Aproximação, Internacional).
 * Ref: Captura de tela 2026-10-16 155905.png (Tela 4), unnamed (5).webp
 * ============================================================================
 */

import React, { useState } from "react";
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Sliders,
  Wifi,
  Globe,
  Radio,
  RefreshCw,
  Trash2,
  Cpu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatCents, cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CardSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardHolderName?: string;
  cardNumber?: string;
  cvv?: string;
  expiryDate?: string;
  currentLimitCents?: number;
  maxLimitCents?: number;
  onUpdateLimit?: (newLimitCents: number) => void;
  className?: string;
}

export function CardSettingsDrawer({
  open,
  onOpenChange,
  cardHolderName = "CLIENTE WAESY",
  cardNumber = "4892 5601 2348 9012",
  cvv = "842",
  expiryDate = "10/31",
  currentLimitCents = 500000,
  maxLimitCents = 1500000,
  onUpdateLimit,
  className,
}: CardSettingsDrawerProps) {
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Switches de segurança
  const [contactlessEnabled, setContactlessEnabled] = useState(true);
  const [onlinePurchasesEnabled, setOnlinePurchasesEnabled] = useState(true);
  const [internationalEnabled, setInternationalEnabled] = useState(false);

  // Slider de Limite (em reais)
  const [sliderValue, setSliderValue] = useState<number>(currentLimitCents / 100);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleToggleLock = () => {
    setIsLocked((prev) => {
      const next = !prev;
      if (next) {
        toast.warning("Cartão bloqueado temporariamente.");
      } else {
        toast.success("Cartão desbloqueado para uso.");
      }
      return next;
    });
  };

  const handleGenerateNewCvv = () => {
    toast.success("Novo código de segurança (CVV dinâmico) gerado.");
  };

  const maskedNumber = cardNumber
    .split(" ")
    .map((chunk, idx) => (idx < 3 ? "••••" : chunk))
    .join(" ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "w-full max-w-md mx-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 bg-card border-border/80 shadow-xl max-h-[92vh] overflow-y-auto no-scrollbar",
          className
        )}
      >
        <SheetHeader className="pb-3 border-b border-border/40 text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              <span>Cartão Virtual Waesy</span>
            </SheetTitle>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isLocked
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              )}
            >
              {isLocked ? "Bloqueado" : "Pronto para Uso"}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-5 pt-3">
          {/* ── 1. Visual Card Preview (Apple HIG / 99Pay) ── */}
          <div
            className={cn(
              "relative w-full aspect-[1.586/1] rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-md transition-all duration-300",
              isLocked
                ? "bg-zinc-800 text-zinc-400 grayscale"
                : "bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 text-zinc-50 border border-zinc-700/60"
            )}
          >
            {/* Top Row: Waesy Bank + Contactless */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5 font-bold tracking-wider text-xs sm:text-sm">
                <span className="text-primary font-mono font-black text-base">W</span>
                <span>WAESY BANK</span>
              </div>
              <Wifi className="size-5 rotate-90 opacity-80" />
            </div>

            {/* Middle Row: Chip + Sensitive Toggle */}
            <div className="flex items-center justify-between relative z-10 my-1">
              <div className="w-10 h-7 rounded-md bg-amber-400/90 border border-amber-300 flex items-center justify-center shadow-inner">
                <Cpu className="size-5 text-amber-900/80" />
              </div>
              <button
                type="button"
                onClick={() => setShowSensitiveData((prev) => !prev)}
                className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label={showSensitiveData ? "Ocultar dados" : "Exibir dados do cartão"}
              >
                {showSensitiveData ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            {/* Bottom Row: Card Numbers + Holder + Expiry */}
            <div className="space-y-2 relative z-10">
              <div className="font-mono text-base sm:text-lg tracking-widest font-semibold flex items-center justify-between">
                <span>{showSensitiveData ? cardNumber : maskedNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(cardNumber.replace(/\s/g, ""), "Número")}
                  className="size-9 inline-flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Copiar número do cartão"
                >
                  {copiedField === "Número" ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-zinc-400 pt-1">
                <div>
                  <span className="block text-3xs text-zinc-500">Titular</span>
                  <span className="font-medium text-zinc-200">{cardHolderName}</span>
                </div>
                <div>
                  <span className="block text-3xs text-zinc-500">Validade</span>
                  <span className="font-medium text-zinc-200">{expiryDate}</span>
                </div>
                <div>
                  <span className="block text-3xs text-zinc-500">CVV</span>
                  <span className="font-medium text-zinc-200">{showSensitiveData ? cvv : "•••"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Bloqueio Temporário (Zero-Trust) ── */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/40">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "size-10 rounded-xl flex items-center justify-center shrink-0",
                  isLocked ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                )}
              >
                {isLocked ? <Lock className="size-5" /> : <Unlock className="size-5" />}
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-foreground block">
                  Bloqueio Temporário
                </span>
                <span className="text-2xs text-muted-foreground">
                  {isLocked ? "Cartão bloqueado para novas compras" : "Desbloqueado para transações"}
                </span>
              </div>
            </div>

            <Switch
              checked={isLocked}
              onCheckedChange={handleToggleLock}
              className="data-[state=checked]:bg-rose-600"
              aria-label="Bloqueio Temporário do Cartão"
            />
          </div>

          {/* ── 3. Ajuste de Limite Dinâmico ── */}
          <div className="bg-card border border-border/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Limite do Cartão</span>
              </div>
              <span className="text-sm font-bold font-mono text-primary">
                {formatCents(Math.round(sliderValue * 100))}
              </span>
            </div>

            <Slider
              value={[sliderValue]}
              min={100}
              max={maxLimitCents / 100}
              step={100}
              onValueChange={(vals) => {
                const val = vals[0] ?? sliderValue;
                setSliderValue(val);
                onUpdateLimit?.(Math.round(val * 100));
              }}
              className="w-full h-8"
              aria-label="Ajuste de limite do cartão"
            />

            <div className="flex justify-between text-2xs text-muted-foreground">
              <span>Mínimo: R$ 100,00</span>
              <span>Máximo: {formatCents(maxLimitCents)}</span>
            </div>
          </div>

          {/* ── 4. Regras e Canais de Compra ── */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground block px-1">
              Canais e Segurança
            </span>

            <div className="divide-y divide-border/30 rounded-xl bg-muted/30 border border-border/40 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <Radio className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Compras por Aproximação</span>
                </div>
                <Switch
                  checked={contactlessEnabled}
                  onCheckedChange={setContactlessEnabled}
                  aria-label="Compras por Aproximação"
                />
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Compras Online e Assinaturas</span>
                </div>
                <Switch
                  checked={onlinePurchasesEnabled}
                  onCheckedChange={setOnlinePurchasesEnabled}
                  aria-label="Compras Online"
                />
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Uso Internacional</span>
                </div>
                <Switch
                  checked={internationalEnabled}
                  onCheckedChange={setInternationalEnabled}
                  aria-label="Uso Internacional"
                />
              </div>
            </div>
          </div>

          {/* ── 5. Ações Extras de Cartão ── */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateNewCvv}
              className="w-full rounded-xl h-11 min-h-11 text-xs font-semibold gap-2 border-border/80 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <RefreshCw className="size-4 text-primary" />
              <span>Gerar Novo CVV Dinâmico</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
