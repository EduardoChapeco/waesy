import * as React from "react";
import { cn } from "@/lib/utils";

export type DockingPosition =
 | "top-left"
 | "top-center"
 | "top-right"
 | "middle-left"
 | "center"
 | "middle-right"
 | "bottom-left"
 | "bottom-center"
 | "bottom-right";

export interface BuilderDockingMatrixProps {
 value?: DockingPosition | string;
 onChange: (pos: DockingPosition) => void;
}

const POSITIONS: { id: DockingPosition; label: string }[] = [
 { id: "top-left", label: "Superior Esquerdo" },
 { id: "top-center", label: "Superior Centro" },
 { id: "top-right", label: "Superior Direito" },
 { id: "middle-left", label: "Centro Esquerdo" },
 { id: "center", label: "Centro" },
 { id: "middle-right", label: "Centro Direito" },
 { id: "bottom-left", label: "Inferior Esquerdo" },
 { id: "bottom-center", label: "Inferior Centro" },
 { id: "bottom-right", label: "Inferior Direito" },
];

export function BuilderDockingMatrix({
 value = "center",
 onChange,
}: BuilderDockingMatrixProps) {
 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs font-bold text-foreground">
 <span>Ancoragem (Docking)</span>
 <span className="text-[10px] text-muted-foreground font-mono uppercase">{value}</span>
 </div>

 <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-center">
 {/* Matriz 3x3 de Ancoragem (Editor X Standard — Imagem 4) */}
 <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-card border border-border/70 shadow-2xs">
 {POSITIONS.map((pos) => {
 const isSelected = value === pos.id;

 return (
 <button
 key={pos.id}
 type="button"
 onClick={() => onChange(pos.id)}
 title={pos.label}
 className={cn(
 "size-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
 isSelected
 ? "bg-primary text-primary-foreground shadow-2xs ring-2 ring-primary/30"
 : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
 )}
 >
 <span
 className={cn(
 "size-2 rounded-full",
 isSelected ? "bg-primary-foreground" : "bg-muted-foreground/50"
 )}
 />
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
}
