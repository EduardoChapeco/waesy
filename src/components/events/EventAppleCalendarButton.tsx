import React, { useState, useMemo } from "react";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface EventAppleCalendarButtonProps {
  selectedDateFilter?: string;
  onSelectDateFilter?: (filter: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

const PRESET_DATE_OPTIONS = [
  { id: "all", label: "Todos os Dias", desc: "Ver programação completa" },
  { id: "today", label: "Hoje", desc: "Acontecendo hoje na cidade" },
  { id: "tomorrow", label: "Amanhã", desc: "Programação para amanhã" },
  { id: "weekend", label: "Fim de Semana", desc: "Sábado e domingo próximos" },
  { id: "next7", label: "Próximos 7 Dias", desc: "Atrações desta semana" },
  { id: "month", label: "Este Mês", desc: "Todos os eventos do mês atual" },
];

export function EventAppleCalendarButton({
  selectedDateFilter = "all",
  onSelectDateFilter,
  className = "",
}: EventAppleCalendarButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isCompact } = useWindowSizeClass();

  const now = useMemo(() => new Date(), []);

  // Determina o mês e dia a serem exibidos no ícone estilo Apple Calendar (iOS)
  const { displayMonth, displayDay } = useMemo(() => {
    if (selectedDateFilter === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return {
        displayMonth: MONTH_NAMES[tomorrow.getMonth()],
        displayDay: String(tomorrow.getDate()).padStart(2, "0"),
      };
    }

    if (selectedDateFilter && /^\d{4}-\d{2}-\d{2}$/.test(selectedDateFilter)) {
      const parts = selectedDateFilter.split("-");
      const monthIdx = parseInt(parts[1], 10) - 1;
      return {
        displayMonth: MONTH_NAMES[monthIdx] || MONTH_NAMES[now.getMonth()],
        displayDay: parts[2],
      };
    }

    // Padrão: dia e mês atuais
    return {
      displayMonth: MONTH_NAMES[now.getMonth()],
      displayDay: String(now.getDate()).padStart(2, "0"),
    };
  }, [selectedDateFilter, now]);

  const handleSelect = (filterId: string) => {
    onSelectDateFilter?.(filterId);
    setModalOpen(false);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      handleSelect(val);
    }
  };

  const modalContent = (
    <div className="space-y-4 p-4 sm:p-6 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRESET_DATE_OPTIONS.map((opt) => {
          const isSelected = selectedDateFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={cn(
                "w-full h-12 min-h-12 px-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                  : "bg-card border-border/70 hover:bg-muted text-foreground",
              )}
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-bold block truncate">{opt.label}</span>
                <span
                  className={cn(
                    "text-3xs block truncate",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {opt.desc}
                </span>
              </div>
              {isSelected && <Check className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Seletor de Data Específica */}
      <div className="pt-3 border-t border-border/60 space-y-2">
        <label className="text-xs font-bold text-foreground block">
          Ou escolha um dia específico no calendário
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={/^\d{4}-\d{2}-\d{2}$/.test(selectedDateFilter) ? selectedDateFilter : ""}
            onChange={handleCustomDateChange}
            className="w-full h-11 min-h-11 px-3 rounded-xl border border-border/80 bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {selectedDateFilter !== "all" && (
            <button
              type="button"
              onClick={() => handleSelect("all")}
              aria-label="Limpar filtro de data"
              className="h-11 min-h-11 px-3 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── BOTÃO QUADRADO ESTILO CALENDÁRIO APPLE (iOS) — 44x44px Ergonômico ── */}
      <button
        type="button"
        data-testid="event-apple-calendar-button"
        onClick={() => setModalOpen(true)}
        aria-label={`Filtrar eventos por dia. Dia ${displayDay} de ${displayMonth}`}
        title="Filtrar eventos por dia"
        className={cn(
          "size-11 min-w-11 min-h-11 rounded-2xl bg-card border border-border/80 shadow-md shadow-black/10 overflow-hidden",
          "flex flex-col items-center justify-center cursor-pointer select-none",
          "hover:bg-muted/40 active:scale-95 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 relative",
          className,
        )}
      >
        {/* Topo Vermelho/Primário com o Mês (Idêntico ao Apple Calendar) */}
        <span className="w-full bg-red-600 dark:bg-red-700 text-primary-foreground text-3xs font-black uppercase tracking-wider text-center py-1 leading-none block">
          {displayMonth}
        </span>
        {/* Dia em Fonte Forte no Centro */}
        <span className="text-sm font-black text-foreground text-center leading-none mt-1">
          {displayDay}
        </span>
      </button>

      {/* Modal / Sheet Adaptativo de Seleção de Dia */}
      {isCompact ? (
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent side="bottom" className="p-0 rounded-t-2xl bg-background border-t border-border outline-none">
            <SheetHeader className="p-4 pb-2 border-b border-border/50 text-left">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <CalendarIcon className="size-4 text-primary" />
                <span>Programação por Dia</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Selecione quando você deseja curtir eventos e shows na sua cidade.
              </SheetDescription>
            </SheetHeader>
            {modalContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
            <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-border/50">
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="size-4 text-primary" />
                <span>Programação por Dia</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Selecione quando você deseja curtir eventos e shows na sua cidade.
              </DialogDescription>
            </DialogHeader>
            {modalContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
