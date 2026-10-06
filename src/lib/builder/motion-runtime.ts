export type StudioMotionTrigger = "none" | "fade_up" | "zoom_in" | "slide_left" | "slide_right" | "parallax" | "stagger";
export type StudioMotionHover = "none" | "lift" | "scale" | "glow";

export interface StudioMotionConfig {
  trigger?: StudioMotionTrigger;
  hover?: StudioMotionHover;
  durationMs?: number;
  delayMs?: number;
}

const DURATION_CLASSES: Record<number, string> = {
  150: "duration-150",
  200: "duration-200",
  300: "duration-300",
};

function durationClass(durationMs?: number): string {
  if (!durationMs) return "motion-safe:duration-300";
  const closest = Object.keys(DURATION_CLASSES)
    .map(Number)
    .sort((a, b) => Math.abs(a - durationMs) - Math.abs(b - durationMs))[0];
  return `motion-safe:${DURATION_CLASSES[closest]}`;
}

/**
 * Classes são geradas somente a partir de um vocabulário fechado. Todo movimento
 * não essencial passa pelo variant motion-safe; sem JS o conteúdo continua visível.
 */
export function resolveStudioMotionClasses(config?: StudioMotionConfig): string {
  if (!config || config.trigger === "none") return "";

  const classes = ["motion-safe:transition-transform motion-safe:transition-opacity", durationClass(config.durationMs)];
  const trigger = config.trigger;

  if (trigger === "fade_up") classes.push("motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both");
  if (trigger === "zoom_in") classes.push("motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:fill-mode-both");
  if (trigger === "slide_left") classes.push("motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-6 motion-safe:fill-mode-both");
  if (trigger === "slide_right") classes.push("motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-6 motion-safe:fill-mode-both");
  if (trigger === "parallax") classes.push("motion-safe:hover:-translate-y-1 motion-safe:transition-transform");
  if (trigger === "stagger") classes.push("motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both");

  if (config.hover === "lift") classes.push("motion-safe:hover:-translate-y-1 motion-safe:hover:ring-2 motion-safe:hover:ring-primary/30");
  if (config.hover === "scale") classes.push("motion-safe:hover:scale-105 motion-safe:transition-transform");
  if (config.hover === "glow") classes.push("motion-safe:hover:ring-2 motion-safe:hover:ring-primary/40");

  return classes.join(" ");
}
