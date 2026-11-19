import * as React from "react";
import { Calendar, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PeriodFlexibilityMode,
  StructuredPeriodSpec,
} from "@/lib/travel/opportunity-matching-engine";

interface TravelPeriodTagsPickerProps {
  value: StructuredPeriodSpec;
  onChange: (nextPeriod: StructuredPeriodSpec) => void;
  label?: string;
  disabled?: boolean;
}

const SEASON_PRESETS: Array<{ id: string; label: string }> = [
  { id: "ferias_julho", label: "Férias de Julho" },
  { id: "reveillon", label: "Réveillon / Ano Novo" },
  { id: "carnaval", label: "Carnaval" },
  { id: "natal_luz", label: "Natal Luz" },
  { id: "feriados", label: "Feriados Prolongados" },
  { id: "alta_temporada", label: "Alta Temporada (Verão)" },
  { id: "baixa_temporada", label: "Baixa Temporada" },
];

function buildUpcomingMonths(count = 14): Array<{ key: string; label: string }> {
  const result: Array<{ key: string; label: string }> = [];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  for (let i = 0; i < count; i++) {
    const mm = String(m + 1).padStart(2, "0");
    result.push({
      key: `${y}-${mm}`,
      label: `${monthNames[m]}/${y}`,
    });
    m++;
    if (m >= 12) {
      m = 0;
      y++;
    }
  }
  return result;
}

function buildDisplayLabel(spec: StructuredPeriodSpec): string {
  if (spec.startDate) {
    const flexSuffix = spec.flexibilityDays > 0 ? ` (+/- ${spec.flexibilityDays}d)` : "";
    return `${spec.startDate}${spec.endDate ? ` a ${spec.endDate}` : ""}${flexSuffix}`;
  }
  if (spec.targetMonths.length > 0) {
    return spec.targetMonths.join(", ");
  }
  if (spec.seasonTags.length > 0) {
    return spec.seasonTags
      .map((id) => SEASON_PRESETS.find((s) => s.id === id)?.label || id)
      .join(", ");
  }
  if (spec.flexibleAnytime) {
    return "Datas flexíveis";
  }
  return "";
}

export function TravelPeriodTagsPicker({
  value,
  onChange,
  label = "Período & flexibilidade de datas",
  disabled = false,
}: TravelPeriodTagsPickerProps) {
  const baseId = React.useId();
  const startId = `${baseId}-start`;
  const endId = `${baseId}-end`;
  const tolId = `${baseId}-tolerance`;
  const upcomingMonths = React.useMemo(() => buildUpcomingMonths(14), []);

  const activeTab: "dates" | "months" | "seasons" | "anytime" = React.useMemo(() => {
    if (value.mode === "flexible_anytime" || value.flexibleAnytime) return "anytime";
    if (value.mode === "exact" || value.mode === "window") return "dates";
    if (value.mode === "month_list" || (!value.startDate && value.targetMonths.length > 0)) return "months";
    if (value.mode === "season_tag" || (!value.startDate && value.seasonTags.length > 0)) return "seasons";
    return "dates";
  }, [value]);

  const emit = (patch: Partial<StructuredPeriodSpec>) => {
    const merged: StructuredPeriodSpec = {
      ...value,
      ...patch,
    };
    merged.displayLabel = buildDisplayLabel(merged);
    onChange(merged);
  };

  const handleTabSwitch = (nextTab: "dates" | "months" | "seasons" | "anytime") => {
    let nextMode: PeriodFlexibilityMode = "exact";
    if (nextTab === "months") nextMode = "month_list";
    else if (nextTab === "seasons") nextMode = "season_tag";
    else if (nextTab === "anytime") nextMode = "flexible_anytime";
    else nextMode = value.flexibilityDays > 0 ? "window" : "exact";

    emit({
      mode: nextMode,
      flexibleAnytime: nextTab === "anytime",
      startDate: nextTab === "anytime" ? null : value.startDate || null,
      endDate: nextTab === "anytime" ? null : value.endDate || null,
    });
  };

  const toggleMonth = (ym: string) => {
    const exists = value.targetMonths.includes(ym);
    const nextMonths = exists
      ? value.targetMonths.filter((m) => m !== ym)
      : [...value.targetMonths, ym].sort();
    emit({
      mode: nextMonths.length > 0 ? "month_list" : value.startDate ? "window" : "unspecified",
      targetMonths: nextMonths,
      flexibleAnytime: false,
    });
  };

  const toggleSeason = (seasonId: string) => {
    const exists = value.seasonTags.includes(seasonId);
    const nextSeasons = exists
      ? value.seasonTags.filter((s) => s !== seasonId)
      : [...value.seasonTags, seasonId];
    emit({
      mode: nextSeasons.length > 0 ? "season_tag" : value.startDate ? "window" : "unspecified",
      seasonTags: nextSeasons,
      flexibleAnytime: false,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Calendar className="size-3.5 text-primary" />
          <span>{label}</span>
        </span>
        {value.displayLabel && (
          <span className="text-xs font-medium text-muted-foreground">{value.displayLabel}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "dates", label: "Datas" },
            { id: "months", label: "Meses alvo" },
            { id: "seasons", label: "Temporada" },
            { id: "anytime", label: "Flexível total" },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => handleTabSwitch(tab.id)}
              className={`min-h-11 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "dates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={startId} className="text-xs text-muted-foreground font-semibold">Data de ida</Label>
            <Input
              id={startId}
              type="date"
              disabled={disabled}
              value={value.startDate || ""}
              onChange={(e) => {
                const startDate = e.target.value || null;
                emit({
                  mode: startDate ? (value.flexibilityDays > 0 ? "window" : "exact") : "unspecified",
                  startDate,
                  flexibleAnytime: false,
                });
              }}
              className="h-11 min-h-11 text-base md:text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={endId} className="text-xs text-muted-foreground font-semibold">Data de volta</Label>
            <Input
              id={endId}
              type="date"
              disabled={disabled}
              value={value.endDate || ""}
              onChange={(e) => emit({ endDate: e.target.value || null })}
              className="h-11 min-h-11 text-base md:text-sm"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={tolId} className="text-xs text-muted-foreground font-semibold">Flexibilidade / Tolerância</Label>
            <Select
              disabled={disabled}
              value={String(value.flexibilityDays ?? 3)}
              onValueChange={(val) => {
                const days = Number(val);
                emit({
                  flexibilityDays: days,
                  mode: value.startDate ? (days > 0 ? "window" : "exact") : value.mode,
                });
              }}
            >
              <SelectTrigger id={tolId} className="h-11 min-h-11 text-base sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Data exata (0 dias)</SelectItem>
                <SelectItem value="3">Até 3 dias (+/-)</SelectItem>
                <SelectItem value="7">Até 7 dias (+/-)</SelectItem>
                <SelectItem value="15">Até 15 dias (+/-)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {activeTab === "months" && (
        <div className="flex flex-wrap gap-2">
          {upcomingMonths.map((m) => {
            const selected = value.targetMonths.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleMonth(m.key)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {selected && <Check className="size-3.5" />}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "seasons" && (
        <div className="flex flex-wrap gap-2">
          {SEASON_PRESETS.map((season) => {
            const selected = value.seasonTags.includes(season.id);
            return (
              <button
                key={season.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleSeason(season.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {selected && <Check className="size-3.5" />}
                <span>{season.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "anytime" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
          <Calendar className="size-4 text-primary shrink-0" />
          <span>Sem preferência fixa: oportunidades promocionais de qualquer mês entrarão no radar.</span>
        </div>
      )}
    </div>
  );
}
