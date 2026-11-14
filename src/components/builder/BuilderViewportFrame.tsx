import * as React from "react";
import { Monitor, Smartphone, Tablet, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BuilderViewportMode = "desktop" | "tablet" | "mobile" | "native_app";
export type BuilderZoomMode = "fit" | 0.5 | 0.75 | 1;

export const VIEWPORT_LOGICAL_WIDTHS: Record<BuilderViewportMode, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
  native_app: 390,
};

export const VIEWPORT_LABELS: Record<BuilderViewportMode, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile Web",
  native_app: "App Nativo",
};

export interface BuilderViewportFrameProps {
  viewport: BuilderViewportMode;
  onChangeViewport?: (vp: BuilderViewportMode) => void;
  themeStyle?: React.CSSProperties;
  zoomMode?: BuilderZoomMode;
  onChangeZoomMode?: (zoom: BuilderZoomMode) => void;
  showControlsBar?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * BuilderViewportFrame — Janela de Visualização Contida com Scroll Interno
 *
 * Isola o canvas do site contra vazamentos horizontais/verticais no editor:
 * 1. Usa ResizeObserver para escalar automaticamente a largura lógica (1280/768/390px)
 *    ao espaço disponível sem comprimir layouts desktop nem escapar das bordas.
 * 2. Aplica `transform: translateZ(0)` no scrollport interno para prender qualquer
 *    elemento `position: fixed` ou `sticky` dentro da janela de visualização.
 */
export const BuilderViewportFrame: React.FC<BuilderViewportFrameProps> = ({
  viewport,
  onChangeViewport,
  themeStyle,
  zoomMode: controlledZoomMode,
  onChangeZoomMode,
  showControlsBar = true,
  children,
  className,
}) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [internalZoom, setInternalZoom] = React.useState<BuilderZoomMode>("fit");
  const zoomMode = controlledZoomMode ?? internalZoom;
  const setZoomMode = onChangeZoomMode ?? setInternalZoom;

  const [hostSize, setHostSize] = React.useState<{ width: number; height: number }>({
    width: 960,
    height: 700,
  });

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setHostSize({ width: rect.width, height: rect.height });
      }
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const logicalWidth = VIEWPORT_LOGICAL_WIDTHS[viewport];
  const horizontalPad = viewport === "desktop" ? 24 : 32;
  const verticalPad = 24;
  const usableWidth = Math.max(280, hostSize.width - horizontalPad);
  const usableHeight = Math.max(360, hostSize.height - verticalPad);

  const scale =
    zoomMode === "fit"
      ? Math.min(1, Math.max(0.32, usableWidth / logicalWidth))
      : zoomMode;

  const isScaledDown = scale < 0.995;
  const visualWidth = Math.round(logicalWidth * scale);
  const visualHeight = Math.max(320, usableHeight);
  const innerLogicalHeight = Math.round(visualHeight / scale);

  const zoomPercent = Math.round(scale * 100);

  return (
    <div
      className={cn(
        "flex-1 min-w-0 w-full h-full flex flex-col overflow-hidden bg-muted/20",
        className,
      )}
    >
      {showControlsBar && (
        <div className="h-12 px-3 sm:px-4 border-b border-border/70 bg-card/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xs font-mono font-semibold px-2 py-1 rounded-md bg-muted text-foreground shrink-0">
              {VIEWPORT_LABELS[viewport]} · {logicalWidth}px
            </span>
            {onChangeViewport && (
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "desktop", label: "PC", Icon: Monitor },
                    { id: "tablet", label: "Tablet", Icon: Tablet },
                    { id: "mobile", label: "Mobile", Icon: Smartphone },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeViewport(item.id)}
                    aria-label={`Visualizar em ${item.label}`}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-lg text-2xs font-bold flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      viewport === item.id
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <item.Icon className="size-3.5" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-2xs text-muted-foreground hidden sm:inline mr-1">
              Zoom {zoomPercent}%
            </span>
            {(
              [
                { id: "fit", label: "Ajustar" },
                { id: 0.75, label: "75%" },
                { id: 1, label: "100%" },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => setZoomMode(opt.id)}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-2xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-1",
                  zoomMode === opt.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {opt.id === "fit" && <Maximize2 className="size-3" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Área hospedeira medida pelo ResizeObserver; barra horizontal só aparece no zoom 100% se maior que a janela */}
      <div
        ref={hostRef}
        className="flex-1 min-w-0 w-full h-full overflow-auto flex items-start justify-center p-3 sm:p-4"
        data-testid="builder-viewport-host"
      >
        <div
          data-testid="builder-viewport-shell"
          data-builder-viewport={viewport}
          style={{
            width: `${visualWidth}px`,
            height: `${visualHeight}px`,
          }}
          className={cn(
            "relative overflow-hidden shrink-0 transition-colors duration-200 bg-background text-foreground",
            viewport === "native_app"
              ? "rounded-3xl border-4 border-foreground/25"
              : viewport === "mobile"
                ? "rounded-2xl border-2 border-border"
                : viewport === "tablet"
                  ? "rounded-xl border border-border"
                  : "rounded-lg border border-border/80",
          )}
        >
          <div
            data-testid="builder-viewport-scrollport"
            style={{
              ...themeStyle,
              width: `${logicalWidth}px`,
              height: `${innerLogicalHeight}px`,
              transform: isScaledDown ? `scale(${scale}) translateZ(0)` : "translateZ(0)",
              transformOrigin: "top left",
            }}
            className="@container bg-background text-foreground overflow-y-auto overflow-x-hidden flex flex-col relative overscroll-contain"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
