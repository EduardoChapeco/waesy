import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VerticalLandingSectionDTO } from "@/lib/vertical-landing-types";

export interface VerticalLandingSectionsProps {
  sections: VerticalLandingSectionDTO[];
  defaultSignupHref: string;
}

export function VerticalLandingSections({
  sections,
  defaultSignupHref,
}: VerticalLandingSectionsProps) {
  const activeSections = sections.filter((s) => s.is_active);
  if (activeSections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10">
      {activeSections.map((section) => {
        const hasMedia = Boolean(section.media_desktop_url || section.media_mobile_url || section.video_url);
        const isSplitLeft = section.layout_variant === "split_left";
        const isGrid =
          section.layout_variant === "grid_2" ||
          section.layout_variant === "grid_3" ||
          section.layout_variant === "bento" ||
          section.section_type === "workflow_steps";

        if (isGrid && section.items_json.length > 0) {
          const colsClass =
            section.layout_variant === "grid_2"
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
          return (
            <section key={section.id} className="space-y-5">
              <div className="space-y-1">
                {section.badge_tag && (
                  <Badge variant="outline" className="text-2xs font-mono">
                    {section.badge_tag}
                  </Badge>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                    {section.subtitle}
                  </p>
                )}
              </div>

              <div className={colsClass}>
                {section.items_json.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-5 space-y-3"
                  >
                    {item.imageUrl && (
                      <div className="rounded-lg overflow-hidden border border-border/60 aspect-video bg-muted">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      {item.badge && (
                        <Badge variant="secondary" className="text-2xs font-mono">
                          {item.badge}
                        </Badge>
                      )}
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return (
          <section
            key={section.id}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            <div
              className={`${hasMedia ? "lg:col-span-6" : "lg:col-span-12"} space-y-4 ${
                isSplitLeft && hasMedia ? "lg:order-2" : "lg:order-1"
              }`}
            >
              {section.badge_tag && (
                <Badge variant="outline" className="text-2xs font-mono">
                  {section.badge_tag}
                </Badge>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {section.title}
              </h2>
              {section.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {section.subtitle}
                </p>
              )}
              {section.body && (
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {section.body}
                </p>
              )}

              {section.items_json.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {section.items_json.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="size-4 text-primary shrink-0 mt-1" />
                      <div>
                        <span className="font-semibold">{item.title}</span>
                        {item.description && (
                          <span className="text-muted-foreground"> — {item.description}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {section.cta_label && (
                <div className="pt-2">
                  <Button asChild variant="outline" className="h-11 min-h-11 px-5 text-xs font-semibold gap-2">
                    <a href={section.cta_href || defaultSignupHref}>
                      <span>{section.cta_label}</span>
                      <ArrowRight className="size-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {hasMedia && (
              <div className={`lg:col-span-6 ${isSplitLeft ? "lg:order-1" : "lg:order-2"}`}>
                {section.video_url ? (
                  <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video relative">
                    <video
                      src={section.video_url}
                      poster={section.media_desktop_url || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                    <span className="sr-only">
                      <Play className="size-4" />
                    </span>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-video">
                    {(section.media_desktop_url || section.media_mobile_url) && (
                      <img
                        src={section.media_desktop_url || section.media_mobile_url || ""}
                        alt={section.title}
                        className="hidden sm:block size-full object-cover"
                      />
                    )}
                    {(section.media_mobile_url || section.media_desktop_url) && (
                      <img
                        src={section.media_mobile_url || section.media_desktop_url || ""}
                        alt={section.title}
                        className="sm:hidden size-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
