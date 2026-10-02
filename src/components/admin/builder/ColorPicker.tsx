import * as React from "react";
import { Input } from "@/components/ui/input";

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
 value={value || "#000000"}
 onChange={(e) => onChange(e.target.value)}
 className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
 />
 </div>
 <Input
 className="h-8 text-sm font-mono flex-1 bg-background uppercase"
 value={value || ""}
 onChange={(e) => onChange(e.target.value)}
 placeholder="#000000"
 />
 </div>
 </div>
 );
}
