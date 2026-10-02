/**
 * ============================================================================
 * Waesy Platform — Coletor e Registro de Web Vitals Reais (Fase S35 - Bloco E)
 * ============================================================================
 * Medição nativa de Core Web Vitals (LCP, INP, CLS, TTFB, FCP) com zero-overhead,
 * classificação normativa BigTech, correlação por rota e despacho resiliente.
 */

export type MetricName = "LCP" | "INP" | "CLS" | "TTFB" | "FCP";
export type MetricRating = "good" | "needs-improvement" | "poor";
export type ViewportCategory = "compact" | "medium" | "expanded";

export interface WebVitalMetric {
  id: string;
  name: MetricName;
  value: number;
  delta: number;
  rating: MetricRating;
  routeId: string;
  viewportCategory: ViewportCategory;
  networkType?: string;
  timestamp: string;
}

export interface MetricSummary {
  metric: MetricName;
  p75: number;
  average: number;
  rating: MetricRating;
  samples: number;
}

/**
 * Classificação determinística de métricas conforme patamares de docs/PERFORMANCE.md
 */
export function rateMetric(name: MetricName, value: number): MetricRating {
  switch (name) {
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "TTFB":
      return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
    case "FCP":
      return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
  }
}

/**
 * Classifica a viewport atual conforme as faixas do Design System Waesy
 */
export function getViewportCategory(width?: number): ViewportCategory {
  const w = width ?? (typeof window !== "undefined" ? window.innerWidth : 1280);
  if (w < 600) return "compact";
  if (w < 840) return "medium";
  return "expanded";
}

/**
 * Recupera o tipo de conexão de rede atual se suportado pelo navegador
 */
export function getNetworkEffectiveType(): string | undefined {
  if (typeof navigator !== "undefined" && "connection" in navigator) {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    return conn?.effectiveType;
  }
  return undefined;
}

/**
 * Registro de Métricas com Ring Buffer em Memória
 */
class WebVitalsRegistry {
  private readonly maxCapacity: number;
  private readonly metrics: WebVitalMetric[] = [];

  constructor(maxCapacity = 500) {
    this.maxCapacity = maxCapacity;
  }

  public record(metric: WebVitalMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxCapacity) {
      this.metrics.shift();
    }
  }

  public getAll(): readonly WebVitalMetric[] {
    return this.metrics;
  }

  public getByRoute(routeId: string): WebVitalMetric[] {
    return this.metrics.filter((m) => m.routeId === routeId);
  }

  /**
   * Calcula resumo estatístico com P75 e rating médio
   */
  public getSummary(routeId?: string): Record<MetricName, MetricSummary> {
    const pool = routeId ? this.getByRoute(routeId) : this.metrics;
    const names: MetricName[] = ["LCP", "INP", "CLS", "TTFB", "FCP"];
    const result = {} as Record<MetricName, MetricSummary>;

    for (const name of names) {
      const values = pool.filter((m) => m.name === name).map((m) => m.value).sort((a, b) => a - b);
      if (values.length === 0) {
        result[name] = {
          metric: name,
          p75: 0,
          average: 0,
          rating: "good",
          samples: 0,
        };
        continue;
      }

      const p75Index = Math.min(Math.floor(values.length * 0.75), values.length - 1);
      const p75 = values[p75Index];
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = Number((sum / values.length).toFixed(name === "CLS" ? 3 : 1));

      result[name] = {
        metric: name,
        p75: Number(p75.toFixed(name === "CLS" ? 3 : 1)),
        average: avg,
        rating: rateMetric(name, p75),
        samples: values.length,
      };
    }

    return result;
  }

  public clear(): void {
    this.metrics.length = 0;
  }
}

export const webVitalsRegistry = new WebVitalsRegistry();

export interface CollectorOptions {
  routeId?: string;
  onMetric?: (metric: WebVitalMetric) => void;
  reportEndpoint?: string;
}

/**
 * Despacho resiliente de métrica (sendBeacon com fallback para fetch keepalive)
 */
export function dispatchMetric(metric: WebVitalMetric, reportEndpoint?: string): void {
  webVitalsRegistry.record(metric);

  if (!reportEndpoint || typeof window === "undefined") return;

  const payload = JSON.stringify(metric);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const success = navigator.sendBeacon(reportEndpoint, payload);
    if (success) return;
  }

  if (typeof fetch === "function") {
    fetch(reportEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Degradação sem exceção para evitar poluir a telemetria com falha de envio de métricas
    });
  }
}

/**
 * Inicializa a observação nativa de Core Web Vitals no ambiente do navegador.
 * Retorna função de cancelamento (teardown).
 */
export function initWebVitalsCollector(options: CollectorOptions = {}): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const routeId = options.routeId || window.location.pathname;
  const viewportCategory = getViewportCategory();
  const networkType = getNetworkEffectiveType();
  const observers: PerformanceObserver[] = [];

  const emitMetric = (name: MetricName, value: number, delta: number) => {
    const metric: WebVitalMetric = {
      id: `${name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      value: Number(value.toFixed(name === "CLS" ? 3 : 1)),
      delta: Number(delta.toFixed(name === "CLS" ? 3 : 1)),
      rating: rateMetric(name, value),
      routeId,
      viewportCategory,
      networkType,
      timestamp: new Date().toISOString(),
    };

    if (options.onMetric) {
      try {
        options.onMetric(metric);
      } catch {
        // Ignora erros no callback para manter o coletor isolado
      }
    }

    dispatchMetric(metric, options.reportEndpoint);
  };

  // 1. TTFB (Navigation Timing)
  try {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      const ttfb = Math.max(0, nav.responseStart - nav.requestStart);
      emitMetric("TTFB", ttfb, ttfb);
    }
  } catch {
    // Navigation timing não disponível
  }

  // 2. FCP (Paint Timing)
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          emitMetric("FCP", entry.startTime, entry.startTime);
          paintObserver.disconnect();
          break;
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
    observers.push(paintObserver);
  } catch {
    // Paint timing não suportado
  }

  // 3. LCP (Largest Contentful Paint)
  try {
    let lastLcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        lastLcpValue = lastEntry.startTime;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);

    // LCP congela ao descarregar ou primeira interação
    const onVisibilityHidden = () => {
      if (document.visibilityState === "hidden" && lastLcpValue > 0) {
        emitMetric("LCP", lastLcpValue, lastLcpValue);
        lastLcpValue = 0;
      }
    };
    window.addEventListener("visibilitychange", onVisibilityHidden, { once: true });
  } catch {
    // LCP não suportado
  }

  // 4. CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    observers.push(clsObserver);

    const emitCls = () => {
      if (clsValue > 0) {
        emitMetric("CLS", clsValue, clsValue);
      }
    };
    window.addEventListener("pagehide", emitCls, { once: true });
  } catch {
    // CLS não suportado
  }

  // 5. INP (Interaction to Next Paint)
  try {
    let maxDuration = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        if (duration > maxDuration) {
          maxDuration = duration;
        }
      }
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    observers.push(inpObserver);

    const emitInp = () => {
      if (maxDuration > 0) {
        emitMetric("INP", maxDuration, maxDuration);
      }
    };
    window.addEventListener("pagehide", emitInp, { once: true });
  } catch {
    // INP não suportado
  }

  return () => {
    observers.forEach((obs) => {
      try {
        obs.disconnect();
      } catch {
        // Ignora erro no disconnect
      }
    });
  };
}
