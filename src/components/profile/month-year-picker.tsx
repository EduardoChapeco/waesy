import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateExperienceDurationMonths, formatExperienceDurationMonths } from "@/lib/schemas/resume-experience.schema";

export const MONTHS = [
  { value: "1", label: "Janeiro", short: "Jan" },
  { value: "2", label: "Fevereiro", short: "Fev" },
  { value: "3", label: "Março", short: "Mar" },
  { value: "4", label: "Abril", short: "Abr" },
  { value: "5", label: "Maio", short: "Mai" },
  { value: "6", label: "Junho", short: "Jun" },
  { value: "7", label: "Julho", short: "Jul" },
  { value: "8", label: "Agosto", short: "Ago" },
  { value: "9", label: "Setembro", short: "Set" },
  { value: "10", label: "Outubro", short: "Out" },
  { value: "11", label: "Novembro", short: "Nov" },
  { value: "12", label: "Dezembro", short: "Dez" },
];

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => String(CURRENT_YEAR - i));

export interface MonthYearPickerValue {
  month?: number;
  year?: number;
}

export interface MonthYearPickerProps {
  label?: string;
  month?: number;
  year?: number;
  onChange: (value: { month?: number; year?: number; formatted: string }) => void;
  disabled?: boolean;
  className?: string;
  placeholderMonth?: string;
  placeholderYear?: string;
}

/**
 * ── APPLE HIG STRUCTURED MONTH/YEAR PICKER ──
 * Destrói inputs de texto livre ("Jan 2022") e impõe seletores independentes matemáticos.
 */
export function MonthYearPicker({
  label,
  month,
  year,
  onChange,
  disabled = false,
  className,
  placeholderMonth = "Mês",
  placeholderYear = "Ano",
}: MonthYearPickerProps) {
  const selectedMonth = month && month >= 1 && month <= 12 ? String(month) : "";
  const selectedYear = year && year >= 1960 ? String(year) : "";

  const handleMonthChange = (newVal: string) => {
    const m = parseInt(newVal, 10);
    const y = year || CURRENT_YEAR;
    const short = MONTHS.find((item) => item.value === String(m))?.short || "";
    const formatted = `${short} de ${y}`;
    onChange({ month: m, year: y, formatted });
  };

  const handleYearChange = (newVal: string) => {
    const y = parseInt(newVal, 10);
    const m = month || 1;
    const short = MONTHS.find((item) => item.value === String(m))?.short || "";
    const formatted = `${short} de ${y}`;
    onChange({ month: m, year: y, formatted });
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
          <Calendar className="size-3 text-muted-foreground" />
          <span>{label}</span>
        </Label>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Seletor de Mês */}
        <Select
          value={selectedMonth}
          onValueChange={handleMonthChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border/60 focus:border-primary transition-all">
            <SelectValue placeholder={placeholderMonth} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-56">
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label} ({m.short})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Seletor de Ano */}
        <Select
          value={selectedYear}
          onValueChange={handleYearChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border/60 focus:border-primary font-mono transition-all">
            <SelectValue placeholder={placeholderYear} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-56">
            {YEARS.map((y) => (
              <SelectItem key={y} value={y} className="text-xs font-mono">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * ── MOTOR MATEMÁTICO DE DATAS DE EXPERIÊNCIA ──
 * Grupo de datas Início + Fim + "Trabalho atualmente aqui" com telemetria visual de duração.
 */
export interface ExperienceDateRangeGroupProps {
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  isCurrent: boolean;
  onStartDateChange: (val: { month?: number; year?: number; formatted: string }) => void;
  onEndDateChange: (val: { month?: number; year?: number; formatted: string }) => void;
  onCurrentToggle: (isCurrent: boolean) => void;
  className?: string;
}

export function ExperienceDateRangeGroup({
  startMonth,
  startYear,
  endMonth,
  endYear,
  isCurrent,
  onStartDateChange,
  onEndDateChange,
  onCurrentToggle,
  className,
}: ExperienceDateRangeGroupProps) {
  // Cálculo matemático reativo de duração
  const durationMonths = React.useMemo(() => {
    return calculateExperienceDurationMonths(
      startYear,
      startMonth,
      endYear,
      endMonth,
      isCurrent
    );
  }, [startYear, startMonth, endYear, endMonth, isCurrent]);

  const durationText = React.useMemo(() => {
    return formatExperienceDurationMonths(durationMonths);
  }, [durationMonths]);

  return (
    <div className={cn("space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border/40", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Data de Início */}
        <MonthYearPicker
          label="Mês e Ano de Início *"
          month={startMonth}
          year={startYear}
          onChange={onStartDateChange}
        />

        {/* Data de Término ou Cargo Atual */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
            <Clock className="size-3 text-muted-foreground" />
            <span>Mês e Ano de Término</span>
          </Label>

          {isCurrent ? (
            <div className="h-9 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex items-center px-3 text-xs text-primary font-bold">
              ⚡ Cargo Atual (Presente)
            </div>
          ) : (
            <MonthYearPicker
              month={endMonth}
              year={endYear}
              onChange={onEndDateChange}
            />
          )}
        </div>
      </div>

      {/* Checkbox "Trabalho atualmente aqui" & Telemetria Matemática */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={isCurrent}
            onCheckedChange={(checked) => onCurrentToggle(checked === true)}
            className="rounded-md"
          />
          <span className="text-xs font-medium text-foreground">
            Trabalho atualmente neste cargo
          </span>
        </label>

        {/* Live Duration Counter */}
        {startYear && durationText && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            <span>Permanência:</span>
            <span>{durationText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Retrocompatibilidade total para código existente que usa MonthYearSelect
export { MonthYearPicker as MonthYearSelect };
