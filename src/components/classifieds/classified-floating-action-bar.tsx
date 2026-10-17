import React, { useState } from "react";
import { MessageCircle, Phone, Calendar, Users, Minus, Plus, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { toast } from "sonner";

export interface ClassifiedFloatingActionBarProps {
  priceCents?: number;
  priceDisplay?: string;
  priceConditionLabel?: string;
  installmentsText?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  isPrimaryLoading?: boolean;
  onStartChat?: () => void;
  isChatLoading?: boolean;
  whatsappPhone?: string | null;
  classifiedId?: string;
  classifiedTitle?: string;
  classifiedImage?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  isReadyPackage?: boolean;
  defaultDate?: string;
  className?: string;
}

export function ClassifiedFloatingActionBar({
  priceCents = 0,
  priceDisplay,
  priceConditionLabel,
  installmentsText,
  primaryActionLabel = "Tenho Interesse",
  onPrimaryAction,
  isPrimaryLoading = false,
  onStartChat,
  isChatLoading = false,
  whatsappPhone,
  classifiedId,
  classifiedTitle = "Anúncio",
  classifiedImage,
  storeId,
  isReadyPackage = false,
  defaultDate,
  className,
}: ClassifiedFloatingActionBarProps) {
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(defaultDate || "");
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomsCount, setRoomsCount] = useState(1);
  const [isCustomDateActive, setIsCustomDateActive] = useState(false);
  const [customDatesNote, setCustomDatesNote] = useState("");

  const cleanPhone = whatsappPhone ? whatsappPhone.replace(/\D/g, "") : null;

  const handleWhatsAppClick = () => {
    if (!cleanPhone) {
      toast.error("Contato de WhatsApp indisponível para este anúncio.");
      return;
    }
    trackAndOpenWhatsApp({
      phone: cleanPhone,
      message: `Olá! Vi o anúncio "${classifiedTitle}" no Waesy e tenho interesse.`,
      storeId: storeId || undefined,
      entityId: classifiedId,
      entityType: "classified",
      entityTitle: classifiedTitle,
    });
  };

  const handleConfirmReadyPackage = () => {
    if (cleanPhone) {
      const datesMsg = isCustomDateActive && customDatesNote
        ? `Outras datas desejadas: ${customDatesNote}`
        : selectedDate
        ? `Data selecionada: ${selectedDate}`
        : "Data padrão do pacote";
      const message = `Olá! Tenho interesse no pacote *${classifiedTitle}*.\n- ${datesMsg}\n- Hóspedes: ${guestsCount}\n- Quartos: ${roomsCount}\nID do pacote: ${classifiedId || "N/A"}`;
      trackAndOpenWhatsApp({
        phone: cleanPhone,
        message,
        storeId: storeId || undefined,
        entityId: classifiedId,
        entityType: "classified",
        entityTitle: classifiedTitle,
      });
      setIsPackageModalOpen(false);
      toast.success("Abrindo WhatsApp com sua solicitação preenchida!");
    } else if (onPrimaryAction) {
      setIsPackageModalOpen(false);
      onPrimaryAction();
    } else {
      toast.success("Solicitação registrada! O anunciante entrará em contato.");
      setIsPackageModalOpen(false);
    }
  };

  const handlePrimaryButtonClick = () => {
    if (isReadyPackage) {
      setIsPackageModalOpen(true);
      return;
    }
    if (onPrimaryAction) {
      onPrimaryAction();
    } else if (cleanPhone) {
      handleWhatsAppClick();
    } else if (onStartChat) {
      onStartChat();
    }
  };

  const formattedPrice = priceDisplay || (priceCents > 0 ? formatMoney(priceCents) : "Consulte");

  return (
    <>
      {/* Espaçador de folga para barra sticky inferior (pb-24 clearance) */}
      <div className="h-24 w-full" aria-hidden="true" />
      <nav
        aria-label="Ações de Contato e Compra"
        className={cn(
          "sticky bottom-0 z-30 bg-card/95 backdrop-blur-md border-t border-border/40 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 mobile-nav-hide-on-keyboard",
          className
        )}
      >
        {/* Lado Esquerdo: Preço em destaque & Condições */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-extrabold text-foreground font-mono truncate">
              {formattedPrice}
            </span>
            {priceConditionLabel && (
              <span className="text-xs text-muted-foreground font-medium truncate">
                {priceConditionLabel}
              </span>
            )}
          </div>
          {installmentsText && (
            <span className="text-xs text-muted-foreground font-mono truncate">
              {installmentsText}
            </span>
          )}
        </div>

        {/* Lado Direito: Ações Táteis de 44px */}
        <div className="flex items-center gap-2 shrink-0">
          {onStartChat && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onStartChat}
              disabled={isChatLoading}
              className="size-11 min-h-11 min-w-11 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Conversar no Chat do Waesy"
            >
              <MessageCircle className="size-5" />
            </Button>
          )}

          {cleanPhone && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleWhatsAppClick}
              className="size-11 min-h-11 min-w-11 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Chamar no WhatsApp"
            >
              <Phone className="size-5" />
            </Button>
          )}

          <Button
            type="button"
            onClick={handlePrimaryButtonClick}
            disabled={isPrimaryLoading}
            className="h-11 min-h-11 px-5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-105 active:scale-95 transition-transform shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isPrimaryLoading ? "Carregando..." : primaryActionLabel}
          </Button>
        </div>
      </nav>

      {/* ── Modal de Pacote Pronto (Ex: Pacote Natal Luz) ── */}
      {isReadyPackage && (
        <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
          <DialogContent className="max-w-md p-5 space-y-4 rounded-lg">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Configurar Pacote Selecionado
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Seus dados de seleção serão vinculados diretamente a este pacote.
              </DialogDescription>
            </DialogHeader>

            {/* Card do Pacote Selecionado */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              {classifiedImage ? (
                <img
                  src={classifiedImage}
                  alt={classifiedTitle}
                  className="size-12 rounded-lg object-cover border border-border/40 shrink-0"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground line-clamp-1">{classifiedTitle}</p>
                <p className="text-xs font-bold font-mono text-primary mt-1">{formattedPrice}</p>
              </div>
            </div>

            {/* Seleção de Data do Embarque / Check-in */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-primary" />
                <span>Data do Embarque / Check-in</span>
              </label>
              <div className="h-12 border border-border/70 rounded-lg flex items-center px-4 font-medium text-xs sm:text-sm bg-card focus-within:ring-2 focus-within:ring-primary">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-transparent text-foreground focus-visible:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Seletores Numéricos de Quantidade com Botões Táteis >= 44px */}
            <div className="grid grid-cols-2 gap-3">
              {/* Hóspedes */}
              <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" /> Hóspedes
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground">{guestsCount}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setGuestsCount((prev) => Math.max(1, prev - 1))}
                    disabled={guestsCount <= 1}
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Diminuir hóspedes"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="font-mono text-xs font-bold text-foreground">{guestsCount}</span>
                  <button
                    type="button"
                    onClick={() => setGuestsCount((prev) => prev + 1)}
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Aumentar hóspedes"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Quartos */}
              <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Quartos</span>
                  <span className="text-sm font-bold font-mono text-foreground">{roomsCount}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setRoomsCount((prev) => Math.max(1, prev - 1))}
                    disabled={roomsCount <= 1}
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Diminuir quartos"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="font-mono text-xs font-bold text-foreground">{roomsCount}</span>
                  <button
                    type="button"
                    onClick={() => setRoomsCount((prev) => prev + 1)}
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Aumentar quartos"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ação Secundária: Cotar em Outras Datas */}
            <div
              className={cn(
                "p-3 rounded-lg border transition-colors select-none",
                isCustomDateActive ? "bg-primary/5 border-primary/40" : "bg-muted/20 border-border/50"
              )}
            >
              <button
                type="button"
                onClick={() => setIsCustomDateActive(!isCustomDateActive)}
                className="w-full text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <span className="text-xs font-semibold text-foreground">
                  Deseja cotar este mesmo pacote em outras datas?
                </span>
                <span className="text-xs font-bold text-primary">
                  {isCustomDateActive ? "Sim" : "Opcional"}
                </span>
              </button>
              {isCustomDateActive && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <Input
                    placeholder="Ex: Feriado de Páscoa, Julho, 15 a 20 de Outubro..."
                    value={customDatesNote}
                    onChange={(e) => setCustomDatesNote(e.target.value)}
                    className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Botão de Confirmação Final */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPackageModalOpen(false)}
                className="h-11 min-h-11 flex-1 rounded-lg text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmReadyPackage}
                className="h-11 min-h-11 flex-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:brightness-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Confirmar e Cotar</span>
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
