import { useState, useRef } from "react";
import {
  CalendarDots,
  Trash,
  Plus,
  ForkKnife,
  Bed,
  Bus,
  Camera,
} from "@phosphor-icons/react";
import { ChevronDown, ChevronUp, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// ItineraryDay — Tipo Canônico
// ─────────────────────────────────────────────────────────────────────────────
export interface ItineraryDay {
  day_number: number;
  date: string;            // "YYYY-MM-DD" ou "Dia N"
  title: string;
  description: string;
  images: string[];        // URLs públicas das fotos do dia
  activities: string[];    // tags de atividades
  meals_included: Array<"breakfast" | "lunch" | "dinner">;
  transport?: string;      // "Ônibus fretado", "Avião", etc.
  hotel_name?: string;     // "Pousada Morro Branco"
}

interface ItineraryDayEditorProps {
  days: ItineraryDay[];
  onChange: (days: ItineraryDay[]) => void;
  onUploadImage?: (file: File, dayIndex: number) => Promise<string>;
  readOnly?: boolean;
  className?: string;
}

const MEAL_LABELS: Record<"breakfast" | "lunch" | "dinner", string> = {
  breakfast: "☕ Café",
  lunch: "🍽️ Almoço",
  dinner: "🌙 Jantar",
};

function createEmptyDay(dayNumber: number): ItineraryDay {
  return {
    day_number: dayNumber,
    date: `Dia ${dayNumber}`,
    title: "",
    description: "",
    images: [],
    activities: [],
    meals_included: [],
    transport: "",
    hotel_name: "",
  };
}

export function ItineraryDayEditor({
  days,
  onChange,
  onUploadImage,
  readOnly = false,
  className,
}: ItineraryDayEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(days.length > 0 ? 0 : null);
  const [uploadingDayIndex, setUploadingDayIndex] = useState<number | null>(null);
  const [activityInputs, setActivityInputs] = useState<Record<number, string>>({});
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateDay = (index: number, partial: Partial<ItineraryDay>) => {
    const next = [...days];
    next[index] = { ...next[index], ...partial };
    onChange(next);
  };

  const addDay = () => {
    const newDay = createEmptyDay(days.length + 1);
    onChange([...days, newDay]);
    setExpandedIndex(days.length); // expande o novo
  };

  const removeDay = (index: number) => {
    const next = days
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day_number: i + 1 }));
    onChange(next);
    if (expandedIndex !== null && expandedIndex >= next.length) {
      setExpandedIndex(next.length > 0 ? next.length - 1 : null);
    }
  };

  const toggleMeal = (index: number, meal: "breakfast" | "lunch" | "dinner") => {
    const current = days[index].meals_included || [];
    const next = current.includes(meal) ? current.filter((m) => m !== meal) : [...current, meal];
    updateDay(index, { meals_included: next });
  };

  const addActivity = (index: number) => {
    const input = (activityInputs[index] || "").trim();
    if (!input) return;
    const current = days[index].activities || [];
    if (current.includes(input)) return;
    updateDay(index, { activities: [...current, input] });
    setActivityInputs((prev) => ({ ...prev, [index]: "" }));
  };

  const removeActivity = (dayIndex: number, activity: string) => {
    updateDay(dayIndex, {
      activities: days[dayIndex].activities.filter((a) => a !== activity),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, dayIndex: number) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    if (!onUploadImage) {
      // Preview local
      const urls = files.map((f) => URL.createObjectURL(f));
      updateDay(dayIndex, { images: [...(days[dayIndex].images || []), ...urls] });
      return;
    }

    setUploadingDayIndex(dayIndex);
    try {
      const uploaded = await Promise.all(files.map((f) => onUploadImage(f, dayIndex)));
      updateDay(dayIndex, { images: [...(days[dayIndex].images || []), ...uploaded] });
      toast.success(`${uploaded.length} foto(s) adicionada(s) ao Dia ${dayIndex + 1}!`);
    } catch {
      toast.error("Falha ao enviar foto. Tente novamente.");
    } finally {
      setUploadingDayIndex(null);
    }
  };

  const removeImage = (dayIndex: number, imgIndex: number) => {
    const next = days[dayIndex].images.filter((_, i) => i !== imgIndex);
    updateDay(dayIndex, { images: next });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Lista de dias */}
      {days.map((day, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden"
          >
            {/* Cabeçalho clicável */}
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-black shrink-0">
                  {day.day_number}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                    {day.title || `Dia ${day.day_number} — sem título`}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {day.date} {day.hotel_name ? `• ${day.hotel_name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDay(index);
                    }}
                    className="size-6 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    aria-label={`Remover dia ${day.day_number}`}
                  >
                    <Trash className="size-3.5" />
                  </button>
                )}
                {isExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Conteúdo expandido */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
                {/* Data + Título */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                      <CalendarDots className="size-3.5" weight="bold" />
                      Data / Label
                    </label>
                    <input
                      type="text"
                      value={day.date}
                      onChange={(e) => updateDay(index, { date: e.target.value })}
                      readOnly={readOnly}
                      placeholder="22/01 ou Dia 1"
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                      Título do Dia
                    </label>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateDay(index, { title: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Chegada e Relaxamento"
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                    Descrição das Atividades
                  </label>
                  <textarea
                    value={day.description}
                    onChange={(e) => updateDay(index, { description: e.target.value })}
                    readOnly={readOnly}
                    placeholder="Descreva o programa do dia: passeios, horários, pontos de interesse..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-border/60 bg-background text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Refeições incluídas */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                    <ForkKnife className="size-3.5" weight="bold" />
                    Refeições Incluídas
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
                      const included = day.meals_included?.includes(meal);
                      return (
                        <button
                          key={meal}
                          type="button"
                          disabled={readOnly}
                          onClick={() => toggleMeal(index, meal)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all",
                            included
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/60"
                          )}
                        >
                          {MEAL_LABELS[meal]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transporte + Hotel */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                      <Bus className="size-3.5" weight="bold" />
                      Transporte
                    </label>
                    <input
                      type="text"
                      value={day.transport || ""}
                      onChange={(e) => updateDay(index, { transport: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Ônibus fretado, Avião..."
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                      <Bed className="size-3.5" weight="bold" />
                      Hotel / Pousada
                    </label>
                    <input
                      type="text"
                      value={day.hotel_name || ""}
                      onChange={(e) => updateDay(index, { hotel_name: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Pousada do Sol"
                      className="w-full h-9 px-3 rounded-xl border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Atividades (tags) */}
                {!readOnly && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                      Atividades / Tags
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activityInputs[index] || ""}
                        onChange={(e) =>
                          setActivityInputs((prev) => ({ ...prev, [index]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addActivity(index);
                          }
                        }}
                        placeholder="ex: Snorkeling, Trilha, Museu..."
                        className="flex-1 h-9 px-3 rounded-xl border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => addActivity(index)}
                        className="h-9 px-3 rounded-xl bg-primary/10 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/20 transition-colors"
                      >
                        + Adicionar
                      </button>
                    </div>
                    {day.activities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {day.activities.map((act) => (
                          <span
                            key={act}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-[11px] font-medium text-foreground"
                          >
                            {act}
                            <button
                              type="button"
                              onClick={() => removeActivity(index, act)}
                              className="size-3.5 rounded-full hover:bg-destructive/20 flex items-center justify-center"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fotos do dia */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                    <Camera className="size-3.5" weight="bold" />
                    Fotos do Dia
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {day.images.map((img, imgIdx) => (
                      <div key={imgIdx} className="relative size-16 sm:size-20 group">
                        <img
                          src={img}
                          alt={`Dia ${day.day_number} foto ${imgIdx + 1}`}
                          className="size-full object-cover rounded-xl border border-border/40"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeImage(index, imgIdx)}
                            className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="text-[10px] font-bold">×</span>
                          </button>
                        )}
                      </div>
                    ))}

                    {!readOnly && (
                      <>
                        <input
                          ref={(el) => { fileRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                        <button
                          type="button"
                          onClick={() => fileRefs.current[index]?.click()}
                          disabled={uploadingDayIndex === index}
                          className="size-16 sm:size-20 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/60 bg-muted/20 flex items-center justify-center transition-all active:scale-95"
                          aria-label="Adicionar foto ao dia"
                        >
                          {uploadingDayIndex === index ? (
                            <Loader2 className="size-5 animate-spin text-primary" />
                          ) : (
                            <ImagePlus className="size-5 text-muted-foreground" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Botão adicionar dia */}
      {!readOnly && (
        <button
          type="button"
          onClick={addDay}
          className="w-full h-11 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/60 bg-transparent hover:bg-muted/20 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-all active:scale-[0.99]"
        >
          <Plus className="size-4" weight="bold" />
          Adicionar Dia
        </button>
      )}

      {days.length === 0 && !readOnly && (
        <p className="text-[11px] text-muted-foreground text-center py-2">
          Nenhum dia cadastrado no roteiro.
        </p>
      )}
    </div>
  );
}
