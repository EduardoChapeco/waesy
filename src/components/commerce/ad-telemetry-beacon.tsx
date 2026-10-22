import React, { useEffect, useRef } from "react";
import { recordAdTelemetry } from "@/services/telemetry.functions";
import { cn } from "@/lib/utils";

export interface AdTelemetryBeaconProps {
  children: React.ReactNode;
  storeId?: string | null;
  sponsorId?: string | null;
  articleId?: string | null;
  postId?: string | null;
  className?: string;
  onClick?: () => void;
}

/**
 * AdTelemetryBeacon
 * 
 * Monitora visibilidade no viewport e registra impressões reais (após 1s visível com >= 50% de área)
 * e cliques de forma bilateral e persistente no banco de dados.
 */
export function AdTelemetryBeacon({
  children,
  storeId,
  sponsorId,
  articleId,
  postId,
  className = "",
  onClick,
}: AdTelemetryBeaconProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const impressionRecordedRef = useRef(false);
  const visibleTimerRef = useRef<any>(null);

  // Obtém ou inicializa o hash de sessão anônima
  const getSessionHash = (): string => {
    if (typeof window === "undefined") return "server_ssr";
    try {
      let hash = sessionStorage.getItem("waesy_session_hash");
      if (!hash) {
        hash = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem("waesy_session_hash", hash);
      }
      return hash;
    } catch {
      return "anonymous";
    }
  };

  useEffect(() => {
    if (!containerRef.current || impressionRecordedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Conta 1 segundo antes de registrar a impressão para evitar falsos positivos de scroll rápido
            if (!visibleTimerRef.current && !impressionRecordedRef.current) {
              visibleTimerRef.current = setTimeout(() => {
                if (storeId) {
                  recordAdTelemetry({
                    data: {
                      store_id: storeId,
                      sponsor_id: sponsorId || undefined,
                      article_id: articleId || undefined,
                      post_id: postId || undefined,
                      event_type: "view_impression",
                      session_hash: getSessionHash(),
                      duration_seconds: 1,
                      scroll_percentage: Math.round(entry.intersectionRatio * 100),
                    },
                  }).catch(() => {});
                  impressionRecordedRef.current = true;
                }
              }, 1000);
            }
          } else {
            if (visibleTimerRef.current) {
              clearTimeout(visibleTimerRef.current);
              visibleTimerRef.current = null;
            }
          }
        });
      },
      { threshold: [0.5] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (visibleTimerRef.current) {
        clearTimeout(visibleTimerRef.current);
      }
    };
  }, [storeId, sponsorId, articleId, postId]);

  const handleClick = (e: React.MouseEvent) => {
    if (storeId) {
      recordAdTelemetry({
        data: {
          store_id: storeId,
          sponsor_id: sponsorId || undefined,
          article_id: articleId || undefined,
          post_id: postId || undefined,
          event_type: "click",
          session_hash: getSessionHash(),
          duration_seconds: 0,
          scroll_percentage: 0,
        },
      }).catch(() => {});
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(e as any); } } : undefined}
      onClick={handleClick}
      className={cn(className, onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary")}
    >
      {children}
    </div>
  );
}
