import React from "react";
import { cn } from "@/lib/utils";

export interface FluidNoiseSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
 variant?: "sky" | "sunset" | "emerald" | "violet" | "aurora" | "neutral";
 intensity?: "subtle" | "medium" | "vibrant";
 withNoise?: boolean;
 withGlassCard?: boolean;
 children?: React.ReactNode;
}

const NOISE_SVG_DATA_URI = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E`;

export function FluidNoiseSurface({
 variant = "sky",
 intensity = "medium",
 withNoise = true,
 withGlassCard = false,
 className,
 children,
 ...props
}: FluidNoiseSurfaceProps) {
 const getGradientClasses = () => {
 switch (variant) {
 case "sky":
 return intensity === "vibrant"
 ? "from-sky-400 via-blue-500 to-indigo-600 dark:from-sky-900 dark:via-blue-950 dark:to-slate-950"
 : "from-sky-100/90 via-blue-50/70 to-background dark:from-sky-950/40 dark:via-slate-900/60 dark:to-background";
 case "sunset":
 return intensity === "vibrant"
 ? "from-amber-400 via-orange-500 to-rose-600 dark:from-amber-950 dark:via-orange-950 dark:to-slate-950"
 : "from-amber-100/90 via-orange-50/70 to-background dark:from-amber-950/40 dark:via-stone-900/60 dark:to-background";
 case "emerald":
 return intensity === "vibrant"
 ? "from-emerald-400 via-teal-500 to-cyan-600 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950"
 : "from-emerald-100/90 via-teal-50/70 to-background dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-background";
 case "violet":
 return intensity === "vibrant"
 ? "from-purple-500 via-fuchsia-500 to-indigo-600 dark:from-purple-950 dark:via-fuchsia-950 dark:to-slate-950"
 : "from-purple-100/90 via-fuchsia-50/70 to-background dark:from-purple-950/40 dark:via-slate-900/60 dark:to-background";
 case "aurora":
 return "from-sky-200/80 via-emerald-100/60 to-purple-200/80 dark:from-sky-950/40 dark:via-emerald-950/30 dark:to-purple-950/40";
 case "neutral":
 default:
 return "from-muted/80 via-background to-muted/40";
 }
 };

 return (
 <div
 className={cn(
 "relative overflow-hidden rounded-lg bg-gradient-to-br transition-all duration-500",
 getGradientClasses(),
 className
 )}
 {...props}
 >
 {/* Background Liquid Light Orbs */}
 <div className="absolute -top-24 -left-24 size-72 rounded-full bg-white/40 dark:bg-white/5 blur-3xl pointer-events-none" />
 <div className="absolute -bottom-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

 {/* SVG Noise Overlay */}
 {withNoise && (
 <div
 className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60 dark:opacity-40"
 style={{ backgroundImage: `url("${NOISE_SVG_DATA_URI}")` }}
 />
 )}

 {/* Content wrapper */}
 <div className={cn("relative z-10", withGlassCard && "p-6 sm:p-8 bg-card rounded-lg border border-border/70")}>
 {children}
 </div>
 </div>
 );
}
