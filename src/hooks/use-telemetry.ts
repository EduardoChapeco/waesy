/**
 * use-telemetry.ts — Hook de Omni-Telemetria Invisível (Anti-Jank & Batch Buffer)
 *
 * Características de Elite:
 * 1. Fila em memória não bloqueante (O(1)) com esvaziamento em lote (Batching 4s).
 * 2. Suporte a navigator.sendBeacon e fetch keepalive no fechamento de aba/rota.
 * 3. Anti-Jank: processa envios via requestIdleCallback.
 * 4. Rastreadores atômicos: trackClick, trackDwell, trackSearch, trackPageView.
 */

import { useCallback, useEffect, useRef } from "react";
import { ingestTelemetryBatchFn } from "@/services/telemetry-affinity.functions";

export interface TelemetryEventPayload {
  eventType: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  ipMasked?: string;
  dwellTimeMs?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface SearchTelemetryPayload {
  query: string;
  niche?: string;
  resultsCount?: number;
  filters?: Record<string, any>;
  createdAt?: string;
}

// ── Fila Global Singleton (Cross-Component Buffer) ───────────────────────────
let globalEventsQueue: TelemetryEventPayload[] = [];
let globalSearchesQueue: SearchTelemetryPayload[] = [];
let flushTimeoutId: ReturnType<typeof setTimeout> | null = null;
const BATCH_INTERVAL_MS = 4000;
const MAX_BATCH_SIZE = 12;

function scheduleIdleFlush() {
  if (typeof window === "undefined") return;
  if (flushTimeoutId) return;

  flushTimeoutId = setTimeout(() => {
    flushTimeoutId = null;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => flushTelemetryQueue());
    } else {
      flushTelemetryQueue();
    }
  }, BATCH_INTERVAL_MS);
}

export function flushTelemetryQueue() {
  if (typeof window === "undefined") return;
  if (globalEventsQueue.length === 0 && globalSearchesQueue.length === 0) return;

  const eventsToSend = [...globalEventsQueue];
  const searchesToSend = [...globalSearchesQueue];
  globalEventsQueue = [];
  globalSearchesQueue = [];

  const payload = {
    events: eventsToSend,
    searches: searchesToSend,
  };

  // Tentar envio via TanStack Start Server Function
  ingestTelemetryBatchFn({ data: payload }).catch((err) => {
    // Falha silenciosa defensiva
    console.debug("[useTelemetry] Falha no flush assíncrono:", err);
  });
}

// Flush de emergência no descarregamento da página (sendBeacon / keepalive)
if (typeof window !== "undefined") {
  const emergencyFlush = () => {
    if (globalEventsQueue.length === 0 && globalSearchesQueue.length === 0) return;
    const eventsToSend = [...globalEventsQueue];
    const searchesToSend = [...globalSearchesQueue];
    globalEventsQueue = [];
    globalSearchesQueue = [];

    const payload = JSON.stringify({
      events: eventsToSend,
      searches: searchesToSend,
    });

    try {
      // Endpoint fallback se sendBeacon estiver disponível
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/_server/telemetry-batch", blob);
      } else {
        fetch("/_server/telemetry-batch", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignorar exceções de fechamento de página
    }
  };

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      emergencyFlush();
    }
  });
  window.addEventListener("beforeunload", emergencyFlush);
}

export function useTelemetry() {
  const trackClick = useCallback((ctaId: string, metadata?: Record<string, any>) => {
    if (typeof window === "undefined") return;

    globalEventsQueue.push({
      eventType: "click_cta",
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      metadata: { cta_id: ctaId, ...metadata },
      createdAt: new Date().toISOString(),
    });

    if (globalEventsQueue.length >= MAX_BATCH_SIZE) {
      flushTelemetryQueue();
    } else {
      scheduleIdleFlush();
    }
  }, []);

  const trackDwell = useCallback(
    (entityId: string, entityType: string, dwellMs: number, metadata?: Record<string, any>) => {
      if (typeof window === "undefined" || dwellMs < 1000) return;

      globalEventsQueue.push({
        eventType: "dwell",
        path: window.location.pathname,
        dwellTimeMs: Math.round(dwellMs),
        metadata: {
          entity_id: entityId,
          entity_type: entityType,
          ...metadata,
        },
        createdAt: new Date().toISOString(),
      });

      if (globalEventsQueue.length >= MAX_BATCH_SIZE) {
        flushTelemetryQueue();
      } else {
        scheduleIdleFlush();
      }
    },
    [],
  );

  const trackSearch = useCallback(
    (
      query: string,
      niche: string = "geral",
      resultsCount: number = 0,
      filters?: Record<string, any>,
    ) => {
      if (typeof window === "undefined" || !query || query.trim().length < 2) return;

      globalSearchesQueue.push({
        query: query.trim(),
        niche,
        resultsCount,
        filters: filters || {},
        createdAt: new Date().toISOString(),
      });

      if (globalSearchesQueue.length >= MAX_BATCH_SIZE) {
        flushTelemetryQueue();
      } else {
        scheduleIdleFlush();
      }
    },
    [],
  );

  const trackPageView = useCallback((customPath?: string, metadata?: Record<string, any>) => {
    if (typeof window === "undefined") return;

    globalEventsQueue.push({
      eventType: "pageview",
      path: customPath || window.location.pathname,
      referrer: document.referrer || undefined,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    });

    scheduleIdleFlush();
  }, []);

  return {
    trackClick,
    trackDwell,
    trackSearch,
    trackPageView,
    flush: flushTelemetryQueue,
  };
}

/**
 * Hook para medir tempo de permanência de um elemento na tela (Anti-Jank via IntersectionObserver)
 */
export function useDwellTracker(entityId?: string, entityType?: string, metadata?: Record<string, any>) {
  const { trackDwell } = useTelemetry();
  const startTimeRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !entityId || !entityType) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          startTimeRef.current = Date.now();
        } else if (startTimeRef.current) {
          const dwell = Date.now() - startTimeRef.current;
          if (dwell >= 1200) {
            trackDwell(entityId, entityType, dwell, metadata);
          }
          startTimeRef.current = null;
        }
      },
      { threshold: 0.5 },
    );

    const el = elementRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
      if (startTimeRef.current) {
        const dwell = Date.now() - startTimeRef.current;
        if (dwell >= 1200) {
          trackDwell(entityId, entityType, dwell, metadata);
        }
        startTimeRef.current = null;
      }
    };
  }, [entityId, entityType, metadata, trackDwell]);

  return elementRef;
}
