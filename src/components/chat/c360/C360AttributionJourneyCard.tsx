import { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactDateTime } from "@/lib/datetime";
import { computeCustomerTouchpointJourney } from "@/lib/attribution-journey";

interface C360AttributionJourneyCardProps {
  attribution: Record<string, any> | null;
  touchpoints: any[];
  pixelConversions: any[];
  isEditingAttribution: boolean;
  isSavingAttribution: boolean;
  attrPlatform: string;
  attrUtmSource: string;
  attrUtmMedium: string;
  attrAdId: string;
  attrCampaign: string;
  attrHeadline: string;
  onToggleEditing: () => void;
  onChangePlatform: (v: string) => void;
  onChangeUtmSource: (v: string) => void;
  onChangeUtmMedium: (v: string) => void;
  onChangeAdId: (v: string) => void;
  onChangeCampaign: (v: string) => void;
  onChangeHeadline: (v: string) => void;
  onSaveAttribution: () => void;
}

export function C360AttributionJourneyCard({
  attribution,
  touchpoints,
  pixelConversions,
  isEditingAttribution,
  isSavingAttribution,
  attrPlatform,
  attrUtmSource,
  attrUtmMedium,
  attrAdId,
  attrCampaign,
  attrHeadline,
  onToggleEditing,
  onChangePlatform,
  onChangeUtmSource,
  onChangeUtmMedium,
  onChangeAdId,
  onChangeCampaign,
  onChangeHeadline,
  onSaveAttribution,
}: C360AttributionJourneyCardProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  const journey = computeCustomerTouchpointJourney(
    Array.isArray(touchpoints) ? touchpoints : [],
    attribution || null,
  );

  const readableCampaignHierarchy = [
    attribution?.campaign_name || attribution?.campaign || attribution?.utm_campaign,
    attribution?.adset_name,
    attribution?.ad_name || attribution?.ad_headline,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
          <Target className="size-3.5 text-primary shrink-0" />
          <span>Origem, Anúncio e Pixel</span>
        </span>
        <button
          type="button"
          onClick={onToggleEditing}
          className="min-h-11 sm:min-h-8 px-3 py-1 rounded-md border border-border/70 bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isEditingAttribution ? "Fechar" : "Editar"}
        </button>
      </div>

      {!isEditingAttribution && (
        <>
          {journey.totalTouchpointsCount > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
                {journey.totalClicksCount} {journey.totalClicksCount === 1 ? "toque" : "toques"}
              </span>
              {journey.uniqueCampaignsCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-muted text-foreground font-medium">
                  {journey.uniqueCampaignsCount}{" "}
                  {journey.uniqueCampaignsCount === 1 ? "campanha" : "campanhas"}
                </span>
              )}
              {journey.uniqueAdsCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-muted text-foreground font-medium">
                  {journey.uniqueAdsCount}{" "}
                  {journey.uniqueAdsCount === 1 ? "anúncio" : "anúncios"}
                </span>
              )}
            </div>
          )}

          {attribution ? (
            <div className="space-y-1 text-xs">
              {(attribution.platform || attribution.utm_source || attribution.source) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Canal:</span>
                  <span className="font-semibold text-foreground text-right break-words">
                    {attribution.platform || attribution.utm_source || attribution.source}
                    {attribution.utm_medium ? ` / ${attribution.utm_medium}` : ""}
                  </span>
                </div>
              )}
              {readableCampaignHierarchy && (
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Campanha / Anúncio:</span>
                  <p className="font-semibold text-foreground break-words">
                    {readableCampaignHierarchy}
                  </p>
                </div>
              )}
              {!readableCampaignHierarchy && attribution.ad_id && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Anúncio:</span>
                  <span className="font-mono font-semibold text-foreground break-all text-right">
                    ID {attribution.ad_id}
                  </span>
                </div>
              )}
              {attribution.listing_title && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Oferta Waesy:</span>
                  <span className="font-semibold text-foreground text-right break-words">
                    {attribution.listing_title}
                  </span>
                </div>
              )}
              {journey.totalTouchpointsCount > 1 && journey.firstTouch && journey.lastTouch && (
                <div className="pt-1 space-y-1 text-xs text-muted-foreground border-t border-border/40">
                  <div className="flex items-start justify-between gap-2">
                    <span className="shrink-0 font-semibold text-foreground">1º Toque:</span>
                    <span className="text-right break-words">
                      {journey.firstTouch.campaignName || journey.firstTouch.adName || journey.firstTouch.channel}
                      {journey.firstTouch.occurredAt ? ` · ${formatCompactDateTime(journey.firstTouch.occurredAt)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="shrink-0 font-semibold text-foreground">Último Toque:</span>
                    <span className="text-right break-words">
                      {journey.lastTouch.campaignName || journey.lastTouch.adName || journey.lastTouch.channel}
                      {journey.lastTouch.occurredAt ? ` · ${formatCompactDateTime(journey.lastTouch.occurredAt)}` : ""}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {attribution.ctwa_clid && (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                    CTWA
                  </span>
                )}
                {(attribution.fbclid || attribution.fbc || attribution.fbp) && (
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                    Meta Pixel
                  </span>
                )}
                {attribution.gclid && (
                  <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono">
                    Google Ads
                  </span>
                )}
                {attribution.lead_code && (
                  <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                    #{attribution.lead_code}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Origem direta ou ainda sem parâmetros de anúncio vinculados.
            </p>
          )}

          {journey.timeline.length > 0 && (
            <div className="pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowTimeline((v) => !v)}
                className="w-full min-h-11 sm:min-h-8 flex items-center justify-between text-xs font-semibold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <span>Jornada cronológica ({journey.timeline.length})</span>
                {showTimeline ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {showTimeline && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {journey.timeline.map((tp, idx) => (
                    <div
                      key={tp.key}
                      className="rounded-lg bg-muted/40 px-2 py-2 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-foreground">
                        <span>
                          #{idx + 1} · {tp.channel}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {formatCompactDateTime(tp.occurredAt)}
                        </span>
                      </div>
                      {(tp.campaignName || tp.adName || tp.listingTitle) && (
                        <p className="text-muted-foreground break-words">
                          {[tp.campaignName, tp.adsetName, tp.adName, tp.listingTitle]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {tp.clickCount > 1 && (
                        <span className="inline-block font-mono text-primary font-semibold">
                          {tp.clickCount} interações registradas
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {pixelConversions.length > 0 && (
            <div className="pt-2 border-t border-border/50 flex items-center gap-1 flex-wrap">
              {pixelConversions.slice(0, 4).map((ev: any) => (
                <span
                  key={ev.id}
                  className={cn(
                    "px-2 py-1 rounded font-mono text-xs border",
                    ev.status === "delivered" || ev.status === "dispatched"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30",
                  )}
                  title={ev.response_data?.error || `${ev.event_name} (${ev.event_source || "capi"})`}
                >
                  CAPI: {ev.event_name}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {isEditingAttribution && (
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={attrPlatform}
              onChange={(e) => onChangePlatform(e.target.value)}
              placeholder="Plataforma (meta_ads, google_ads)"
              className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              value={attrUtmSource}
              onChange={(e) => onChangeUtmSource(e.target.value)}
              placeholder="UTM Source (ex: instagram)"
              className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={attrUtmMedium}
              onChange={(e) => onChangeUtmMedium(e.target.value)}
              placeholder="UTM Medium (ex: cpc, ctwa)"
              className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              value={attrAdId}
              onChange={(e) => onChangeAdId(e.target.value)}
              placeholder="ID do Anúncio (ad_id)"
              className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <input
            value={attrCampaign}
            onChange={(e) => onChangeCampaign(e.target.value)}
            placeholder="Nome da Campanha"
            className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            value={attrHeadline}
            onChange={(e) => onChangeHeadline(e.target.value)}
            placeholder="Título / Criativo do Anúncio"
            className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleEditing}
              className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg border border-border/70 bg-background text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSavingAttribution}
              onClick={onSaveAttribution}
              className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isSavingAttribution ? "Salvando..." : "Salvar Origem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
