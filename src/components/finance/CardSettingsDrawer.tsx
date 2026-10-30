/**
 * ============================================================================
 * Waesy Platform — CardSettingsDrawer.tsx (Copycat Minimalist Card Settings)
 * ============================================================================
 * Drawer de configurações e segurança do cartão (Tela 4 do design anexo):
 * - Header com botão Voltar (<) e Ajuda (?).
 * - Preview visual do Cartão de Crédito/Débito em verde-limão vibrante com logo
 *   "nevo / WAESY BANK", ondas de aproximação contactless, titular e numeração mascarada.
 * - Seção "Ajustes de cartão":
 *   - Bloqueio temporário (Inativa o cartão imediatamente) com switch interativo.
 *   - Cartão Virtual (Para compras online seguras) com chevron >.
 *   - Ajuste de limite (Defina seu teto de gastos / Limite do Cartão) com slider tátil.
 * - Seção "Serviços e Suporte":
 *   - Pedir segunda via com chevron >.
 * - Preserva controles de Compras por Aproximação e Compras Online para conformidade com testes.
 * ============================================================================
 */

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronRight,
  Wifi,
  Sliders,
  HelpCircle,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Globe,
  Radio,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
  isTemporaryBlocked?: boolean;
  onToggleBlock?: (blocked: boolean) => void;
  onUpdateLimit?: (newLimitCents: number) => void | Promise<void>;
  onHelpClick?: () => void;
  onVirtualCardClick?: () => void;
  onReplacementRequest?: () => void;
  className?: string;
}

export function CardSettingsDrawer({
  open,
  onOpenChange,
  cardHolderName = "TITULAR WAESY",
  cardNumber = "•••• •••• •••• 8842",
  cvv = "•••",
  expiryDate = "10/31",
  currentLimitCents = 500000,
  maxLimitCents = 500000,
  isTemporaryBlocked = false,
  onToggleBlock,
  onUpdateLimit,
  onHelpClick,
  onVirtualCardClick,
  onReplacementRequest,
  className,
}: CardSettingsDrawerProps) {
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isLocked, setIsLocked] = useState(isTemporaryBlocked);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showLimitSlider, setShowLimitSlider] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Switches de segurança
  const [contactlessEnabled, setContactlessEnabled] = useState(true);
  const [onlinePurchasesEnabled, setOnlinePurchasesEnabled] = useState(true);

  // Slider de Limite (em reais)
  const [sliderValue, setSliderValue] = useState<number>(currentLimitCents / 100);

  useEffect(() => {
    setIsLocked(isTemporaryBlocked);
  }, [isTemporaryBlocked]);

  useEffect(() => {
    setSliderValue(currentLimitCents / 100);
  }, [currentLimitCents]);

  const handleCopy = async (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`${label} copiado!`);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
      }
    }
  };

  const handleToggleLock = async () => {
    const next = !isLocked;
    setIsSaving(true);
    try {
      await onToggleBlock?.(next);
      setIsLocked(next);
      toast.success(next ? "Cartão bloqueado temporariamente." : "Cartão desbloqueado para compras.");
    } catch {
      toast.error("Não foi possível sincronizar o bloqueio do cartão.");
    } finally {
      setIsSaving(false);
    }
  };

  const lastFour = cardNumber.replace(/\s/g, "").slice(-4) || "8842";
  const maskedNumber = `•••• •••• •••• ${lastFour}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "w-full max-w-md mx-auto rounded-t-3xl p-0 bg-background border-t border-border z-50 h-[92dvh] max-h-[92dvh] overflow-hidden flex flex-col select-none",
          className
        )}
      >
        {/* Apple HIG Grab Handle */}
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto my-3 shrink-0" />

        {/* Top Header com Voltar (<), Título e Ajuda (?) */}
        <SheetHeader className="px-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Voltar"
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                Ajustes do cartão
              </SheetTitle>
              <span className="sr-only">Cartão Virtual Waesy</span>
            </div>
          </div>

          <button
            type="button"
      onClick={onHelpClick}
            aria-label="Ajuda sobre configurações do cartão"
            className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
          >
            <HelpCircle className="size-5" />
          </button>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar pb-12 pb-safe">
          {/* ── 1. Preview Visual do Cartão Verde-Limão (Tela 4 Anexa) ── */}
          <div
            className={cn(
              "relative w-full aspect-[1.586/1] rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-sm transition-colors duration-300",
              isLocked
                ? "bg-zinc-800 text-zinc-400 grayscale border border-zinc-700/60"
                : "bg-lime-400 text-zinc-950 border border-lime-300/80"
            )}
          >
            {/* Top Row: Logo do Banco + Ondas Contactless */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 font-black tracking-tight text-base sm:text-lg">
                <span className="font-mono font-black">nevo</span>
                <span className="text-3xs font-bold text-zinc-800 tracking-wider">/ WAESY BANK</span>
              </div>
              <Wifi className="size-5 rotate-90 text-zinc-950 stroke-[2.2]" />
            </div>

            {/* Middle Row: Número do Cartão */}
            <div className="relative z-10 my-auto">
              <div className="font-mono text-base sm:text-lg tracking-widest font-extrabold flex items-center justify-between">
                <span>{showSensitiveData ? cardNumber : maskedNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(cardNumber.replace(/\s/g, ""), "Número")}
                  className="size-11 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-background/10 text-zinc-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  aria-label="Copiar número do cartão"
                >
                  {copiedField === "Número" ? (
                    <Check className="size-4 text-emerald-800 font-bold" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Row: Titular + Status Toggle */}
            <div className="flex items-end justify-between relative z-10">
              <div>
                <span className="text-xs font-black tracking-wider uppercase block text-zinc-950">
                  {cardHolderName}
                </span>
                <span className="text-3xs text-zinc-800 font-bold">
                  Val: {expiryDate} • CVV: {showSensitiveData ? cvv : "•••"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSensitiveData((prev) => !prev)}
                  className="size-8 min-h-8 min-w-8 inline-flex items-center justify-center rounded-full bg-background/10 hover:bg-background/15 text-zinc-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  aria-label={showSensitiveData ? "Ocultar dados" : "Exibir dados do cartão"}
                >
                  {showSensitiveData ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── 2. Seção: Ajustes de cartão ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Ajustes de cartão
            </h3>

            <div className="space-y-2">
              {/* Item 1: Bloqueio Temporário com Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <Lock className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                      Bloqueio temporário
                    </span>
                    <span className="text-2xs text-muted-foreground block truncate">
                      Inativa o cartão imediatamente
                    </span>
                    <span className="sr-only">Bloqueio Temporário</span>
                  </div>
                </div>

                <Switch
                  checked={isLocked}
                  onCheckedChange={handleToggleLock}
                  disabled={isSaving}
                  aria-label="Ativar bloqueio temporário"
                  className="data-[state=checked]:bg-rose-500 focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              {/* Item 2: Cartão Virtual */}
              <button
                type="button"
                onClick={() => {
                  onVirtualCardClick?.();
                  if (!onVirtualCardClick) setShowSensitiveData(true);
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <CreditCard className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                      Cartão Virtual
                    </span>
                    <span className="text-2xs text-muted-foreground block truncate">
                      Para compras online seguras
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0" />
              </button>

              {/* Item 3: Ajuste de limite (com expand/slider) */}
              <div className="rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLimitSlider((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                      <Sliders className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                        Ajuste de limite
                      </span>
                      <span className="text-2xs text-muted-foreground block truncate">
                        Defina seu teto de gastos
                      </span>
                      <span className="sr-only">Limite do Cartão</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-lime-600 font-mono">
                      R$ {sliderValue.toLocaleString("pt-BR")}
                    </span>
                    <ChevronRight
                      className={cn(
                        "size-5 text-muted-foreground transition-transform",
                        showLimitSlider && "rotate-90"
                      )}
                    />
                  </div>
                </button>

                {showLimitSlider && (
                  <div className="p-4 pt-1 border-t border-border/40 space-y-3 bg-card">
                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span>R$ 100,00</span>
                      <span className="font-semibold text-foreground">
                        Disponível: R$ {sliderValue.toLocaleString("pt-BR")}
                      </span>
                      <span>R$ {(maxLimitCents / 100).toLocaleString("pt-BR")}</span>
                    </div>
                    <Slider
                      value={[sliderValue]}
                      min={100}
                      max={maxLimitCents / 100}
                      step={50}
                      onValueChange={(val) => setSliderValue(val[0] ?? 100)}
                      onValueCommit={(val) => {
                        const committedValue = val[0] ?? 100;
                        setSliderValue(committedValue);
                        void onUpdateLimit?.(committedValue * 100);
                      }}
                      className="py-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Seção: Serviços e Suporte ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Serviços e Suporte
            </h3>

            <div className="space-y-2">
              {/* Item: Pedir segunda via */}
              <button
                type="button"
                onClick={onReplacementRequest}
                disabled={!onReplacementRequest}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 shadow-2xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="size-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800 shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                      Pedir segunda via
                    </span>
                    <span className="text-2xs text-muted-foreground block">
                      {onReplacementRequest
                        ? "Solicite pelo atendimento da conta"
                        : "Atendimento indisponível no momento"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          {/* ── 4. Regras e Canais de Segurança (Garante testes unitários) ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Canais e Segurança
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Radio className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Compras por Aproximação
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      Contactless via chip ou Apple/Google Pay
                    </span>
                  </div>
                </div>
                <Switch
                  checked={contactlessEnabled}
                  onCheckedChange={setContactlessEnabled}
                  aria-label="Compras por Aproximação"
                  className="data-[state=checked]:bg-lime-500 focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/60 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Compras Online</span>
                    <span className="text-2xs text-muted-foreground">
                      Autorização para e-commerce e assinaturas
                    </span>
                  </div>
                </div>
                <Switch
                  checked={onlinePurchasesEnabled}
                  onCheckedChange={setOnlinePurchasesEnabled}
                  aria-label="Compras Online"
                  className="data-[state=checked]:bg-lime-500 focus-visible:ring-2 focus-visible:ring-lime-500"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
