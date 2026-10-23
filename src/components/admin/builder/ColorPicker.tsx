import * as React from "react";
import { Input } from "@/components/ui/input";

const DEFAULT_COLOR = [0, 0, 0] as const;
const defaultColorValue = `#${DEFAULT_COLOR.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

interface ColorPickerProps {
 value: string;
 onChange: (value: string) => void;
 label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
 return (
 <div className="flex flex-col gap-2">
 {label && <label className="text-xs font-medium">{label}</label>}
 <div className="flex items-center gap-2">
 <div className="relative w-8 h-8 rounded-lg overflow-hidden border shrink-0">
 <input
 type="color"
 value={value || defaultColorValue}
 onChange={(e) => onChange(e.target.value)}
 className="absolute -top-2 -left-2 size-16 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 />
 </div>
 <Input
 className="h-11 min-h-11 text-sm font-mono flex-1 bg-background uppercase focus-visible:ring-2 focus-visible:ring-ring"
 value={value || ""}
 onChange={(e) => onChange(e.target.value)}
 placeholder="Código de cor"
 />
 </div>
 </div>
 );
}
