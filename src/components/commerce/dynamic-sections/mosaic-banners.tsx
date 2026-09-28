import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";

export function MosaicBanners({ content }: { content: Record<string, unknown> }) {
  const banners = (Array.isArray(content.banners) ? content.banners : []) as any[];

  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-8 @md:px-6">
      <div
        className={`grid gap-4 ${banners.length === 1 ? "grid-cols-1" : banners.length === 2 ? "@md:grid-cols-2" : "@md:grid-cols-3"}`}
      >
        {banners.slice(0, 3).map((banner, index) => {
          const title = String(banner.title || "");
          const bg_url = String(banner.image_url || "");
          const link = String(banner.link || "");

          const inner = (
            <div className="group relative aspect-[16/10] @md:aspect-square overflow-hidden rounded-2xl bg-muted transition-transform hover:opacity-95 flex items-center justify-center">
              {bg_url ? (
                <>
                  <img
                    src={bg_url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
                  />
                  <img
                    src={bg_url}
                    alt={title || `Banner ${index + 1}`}
                    loading="lazy"
                    className="relative size-full object-contain @md:object-cover transition-transform duration-700 group-hover:scale-105 select-none"
                  />
                </>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <ImageOff className="size-10" aria-hidden />
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 opacity-80" />
              {/* Content */}
              {title && (
                <div className="absolute bottom-0 left-0 p-6 @md:p-8 z-10 pointer-events-none">
                  <h3 className="text-xl sm:text-2xl font-semibold text-white drop-shadow-sm">{title}</h3>
                </div>
              )}
            </div>
          );

          if (link) {
            return (
              <Link key={index} to={link as never} className="block">
                {inner}
              </Link>
            );
          }

          return <div key={index}>{inner}</div>;
        })}
      </div>
    </section>
  );
}
