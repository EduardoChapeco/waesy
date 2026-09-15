import { useState, useEffect } from "react";
import { Sun, CloudRain, Cloud, Wind, Thermometer, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// WeatherWidget — Clima Real via wttr.in (API pública, sem API key)
// Uso: <WeatherWidget city="Jericoacoara, CE" className="..." />
// ─────────────────────────────────────────────────────────────────────────────

interface WeatherDay {
  day: string;
  maxTempC: number;
  minTempC: number;
  condition: "sun" | "cloud" | "rain" | "wind";
  conditionText: string;
  iconCode: number;
}

interface WeatherWidgetProps {
  city?: string;
  className?: string;
  compact?: boolean;
}

function resolveCondition(weatherCode: number): "sun" | "cloud" | "rain" | "wind" {
  if (weatherCode >= 200 && weatherCode <= 299) return "rain"; // thunderstorm
  if (weatherCode >= 300 && weatherCode <= 399) return "rain"; // drizzle
  if (weatherCode >= 500 && weatherCode <= 599) return "rain"; // rain
  if (weatherCode >= 600 && weatherCode <= 699) return "cloud"; // snow
  if (weatherCode >= 700 && weatherCode <= 799) return "wind"; // atmosphere
  if (weatherCode === 800) return "sun";                        // clear sky
  if (weatherCode >= 801) return "cloud";                       // clouds
  return "sun";
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

    // wttr.in: API pública gratuita, sem key. Formato JSON compacto.
    // Docs: https://wttr.in/:help
    const encoded = encodeURIComponent(city.trim());
    fetch(`https://wttr.in/${encoded}?format=j1&lang=pt`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const weather = data?.weather;
        if (!Array.isArray(weather) || weather.length === 0) {
          throw new Error("Dados de clima não encontrados.");
        }

        const parsed: WeatherDay[] = weather.slice(0, 3).map((w: any, idx: number) => {
          const date = w.date ? new Date(w.date) : new Date(Date.now() + idx * 86400000);
          const dayName = idx === 0 ? "Hoje" : idx === 1 ? "Amanhã" : DAYS_PT[date.getDay()];
          const hourly = w.hourly?.[4]; // meio-dia
          const code = parseInt(hourly?.weatherCode || "800", 10);
          return {
            day: dayName,
            maxTempC: parseInt(w.maxtempC || "28", 10),
            minTempC: parseInt(w.mintempC || "22", 10),
            condition: resolveCondition(code),
            conditionText: hourly?.weatherDesc?.[0]?.value || "Parcialmente nublado",
            iconCode: code,
          };
        });

        setDays(parsed);
        setLastCity(city);
      })
      .catch((err) => {
        console.warn("[WeatherWidget] Falha ao buscar clima:", err);
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
