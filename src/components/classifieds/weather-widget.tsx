import { useState, useEffect } from "react";
import { Sun, CloudRain, Cloud, Wind, Thermometer, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCityWeather, type WeatherDayDTO } from "@/services/public-apis.functions";

// ─────────────────────────────────────────────────────────────────────────────
// WeatherWidget — Clima Real via BFF Server Function com Fallback e Cache (Regra 1 & 21)
// Uso: <WeatherWidget city="Jericoacoara, CE" className="..." />
// ─────────────────────────────────────────────────────────────────────────────

type WeatherDay = WeatherDayDTO;

interface WeatherWidgetProps {
  city?: string;
  className?: string;
  compact?: boolean;
}

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function WeatherIcon({ condition, className }: { condition: WeatherDay["condition"]; className?: string }) {
  if (condition === "rain") return <CloudRain className={cn("text-blue-400", className)} />;
  if (condition === "cloud") return <Cloud className={cn("text-gray-400", className)} />;
  if (condition === "wind") return <Wind className={cn("text-cyan-400", className)} />;
  return <Sun className={cn("text-amber-500", className)} />;
}

export function WeatherWidget({ city, className, compact = false }: WeatherWidgetProps) {
  const [days, setDays] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCity, setLastCity] = useState<string | null>(null);

  useEffect(() => {
    if (!city?.trim()) {
      setDays([]);
      return;
    }
    if (city === lastCity) return;

    setLoading(true);
    setError(null);

    getCityWeather({ data: { city: city.trim() } })
      .then((res) => {
        if (Array.isArray(res.days) && res.days.length > 0) {
          setDays(res.days);
          setLastCity(city);
        } else {
          setError("Clima indisponível");
        }
      })
      .catch((err) => {
        console.warn("[WeatherWidget] Falha ao buscar clima via BFF:", err);
        setError("Clima indisponível");
      })
      .finally(() => setLoading(false));
  }, [city, lastCity]);

  // Não renderiza nada se não há cidade configurada
  if (!city?.trim()) return null;

  return (
    <div className={cn("p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
          <Sun className="size-4 text-amber-500" />
          <span>Clima Previsto</span>
        </h4>
        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
          {city}
        </span>
      </div>

      {loading && (
        <div className="grid grid-cols-3 gap-2 text-center" aria-label="Carregando previsão do tempo">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-2 rounded-xl bg-background border border-border/30 animate-pulse space-y-1.5">
              <div className="h-2.5 bg-muted rounded w-8 mx-auto" />
              <div className="h-4 bg-muted rounded w-10 mx-auto" />
              <div className="size-4 bg-muted rounded-full mx-auto mt-0.5" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
          <span>{error} — verifique o nome da cidade</span>
        </div>
      )}

      {!loading && !error && days.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {days.map((w, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-background border border-border/30">
              <span className="text-[10.5px] text-muted-foreground block">{w.day}</span>
              <span className="font-extrabold text-sm text-foreground my-0.5 block">
                {w.maxTempC}°
              </span>
              {!compact && (
                <span className="text-[9px] text-muted-foreground/70 block">
                  mín {w.minTempC}°
                </span>
              )}
              <div className="flex justify-center mt-0.5">
                <WeatherIcon condition={w.condition} className="size-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
