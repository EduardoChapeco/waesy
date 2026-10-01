import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Layers, Megaphone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { type SponsorDTO } from "@/services/news.functions";
import { recordAdTelemetry } from "@/services/telemetry.functions";

export interface NewsSponsorBannerProps {
 sponsor: SponsorDTO;
 articleId?: string;
 placementType?: "news_top" | "news_in_article" | "news_footer" | "story_moment";
}

export function NewsSponsorBanner({
 sponsor,
 articleId,
 placementType = "news_in_article",
}: NewsSponsorBannerProps) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [hasImpressionRecorded, setHasImpressionRecorded] = useState(false);
 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const durationSecondsRef = useRef(0);

 useEffect(() => {
 const el = containerRef.current;
 if (!el) return;

 const observer = new IntersectionObserver(
 (entries) => {
 const entry = entries[0];
 if (entry.isIntersecting) {
 // 1. Grava impressão uma única vez por montagem
 if (!hasImpressionRecorded) {
 setHasImpressionRecorded(true);
 recordAdTelemetry({
 data: {
 store_id: sponsor.store_id,
 sponsor_id: sponsor.id,
 article_id: articleId,
 event_type: "view_impression",
 },
 }).catch(() => {});
 }

 // 2. Inicia contador de tempo de visualização ativa (Heartbeat)
 if (!timerRef.current) {
 timerRef.current = setInterval(() => {
 durationSecondsRef.current += 3;
 recordAdTelemetry({
 data: {
 store_id: sponsor.store_id,
 sponsor_id: sponsor.id,
 article_id: articleId,
 event_type: "view_duration",
 duration_seconds: durationSecondsRef.current,
 },
 }).catch(() => {});
 }, 3000);
 }
 } else {
 // Parar timer quando sair do viewport
 if (timerRef.current) {
 clearInterval(timerRef.current);
 timerRef.current = null;
 }
 }
 },
 { threshold: 0.5 },
 );

 observer.observe(el);

 return () => {
 observer.disconnect();
 if (timerRef.current) {
 clearInterval(timerRef.current);
 }
 };
 }, [sponsor.id, sponsor.store_id, articleId, hasImpressionRecorded]);

  const handleClick = () => {
    recordAdTelemetry({
      data: {
        store_id: sponsor.store_id,
        sponsor_id: sponsor.id,
        article_id: articleId,
        event_type: "click",
      },
    }).catch(() => {});

    const destination = sponsor.target_url || sponsor.website_url;
    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      ref={containerRef}
      className="my-6 p-4 sm:p-5 rounded-2xl border border-primary/20 bg-linear-to-br from-card via-muted/30 to-primary/5 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          <Megaphone className="size-3.5 text-primary" />
          <span>Conteúdo Patrocinado</span>
        </div>
        {sponsor.tier === "gold" && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            ★ Patrocinador Master
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {sponsor.video_url ? (
          <div
            onClick={handleClick}
            className="w-full sm:w-1/3 aspect-16/9 rounded-2xl overflow-hidden bg-black cursor-pointer hover:opacity-95 transition-opacity shrink-0 relative"
          >
            <video
              src={sponsor.video_url}
              autoPlay
              muted
              loop
              playsInline
              className="size-full object-cover"
            />
          </div>
        ) : sponsor.banner_url ? (
          <div
            onClick={handleClick}
            className="w-full sm:w-1/3 aspect-16/9 rounded-2xl overflow-hidden bg-muted cursor-pointer hover:opacity-95 transition-opacity shrink-0"
          >
            <img
              src={sponsor.banner_url}
              alt={sponsor.name}
              className="size-full object-cover"
            />
          </div>
        ) : sponsor.logo_url ? (
          <div
            onClick={handleClick}
            className="size-16 rounded-2xl bg-card p-2 flex items-center justify-center cursor-pointer shrink-0"
          >
            <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-full max-w-full object-contain aspect-square" width={48} height={48} loading="lazy" />
          </div>
        ) : null}

        <div className="flex-1 text-left space-y-1 w-full sm:w-auto">
          <h4 className="text-sm font-black text-foreground">{sponsor.name}</h4>
          {sponsor.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{sponsor.description}</p>
          )}
        </div>

        <Button
          onClick={handleClick}
          size="sm"
          className="rounded-xl font-bold gap-1.5 text-xs shrink-0 w-full sm:w-auto h-11 sm:h-9 min-h-[44px] sm:min-h-0"
        >
          <span>{sponsor.cta_label || "Conhecer"}</span>
          <ExternalLink className="size-3.5" />
        </Button>
      </div>
    </div>
 );
}
