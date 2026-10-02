import * as React from "react";
import { useState } from "react";
import { Ruler, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SizeMeasurementRow {
 size: string;
 bustCm: string;
 waistCm: string;
 hipCm: string;
 lengthCm?: string;
}

export interface SizeGuideTableProps {
 title?: string;
 subtitle?: string;
 tip?: string;
 rows?: SizeMeasurementRow[];
}

const DEFAULT_ROWS: SizeMeasurementRow[] = [
 { size: "PP (36)", bustCm: "80 - 84", waistCm: "62 - 66", hipCm: "88 - 92", lengthCm: "98" },
 { size: "P (38)", bustCm: "84 - 88", waistCm: "66 - 70", hipCm: "92 - 96", lengthCm: "100" },
 { size: "M (40)", bustCm: "88 - 94", waistCm: "70 - 76", hipCm: "96 - 102", lengthCm: "102" },
 { size: "G (42)", bustCm: "94 - 100", waistCm: "76 - 82", hipCm: "102 - 108", lengthCm: "104" },
 { size: "GG (44)", bustCm: "100 - 108", waistCm: "82 - 90", hipCm: "108 - 116", lengthCm: "106" },
];

export function SizeGuideTableSection({
 title = "Guia de Medidas",
 subtitle = "Encontre o tamanho perfeito para o seu caimento ideal.",
 tip = "Dica: Para medir o busto, posicione a fita métrica na parte mais volumosa. Mantenha a fita reta e confortável.",
 rows = DEFAULT_ROWS,
}: SizeGuideTableProps) {
 return (
 <section className="py-12 bg-muted/20 w-full">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
 <div className="text-center max-w-xl mx-auto space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Tabela de Caimento
 </Badge>
 <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs">
 <div className="overflow-x-auto no-scrollbar ">
 <table className="w-full text-left text-xs">
 <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground uppercase font-mono text-[10px]">
 <tr>
 <th className="px-5 py-4 font-bold">Tamanho</th>
 <th className="px-5 py-4 font-bold">Busto (cm)</th>
 <th className="px-5 py-4 font-bold">Cintura (cm)</th>
 <th className="px-5 py-4 font-bold">Quadril (cm)</th>
 <th className="px-5 py-4 font-bold">Comprimento (cm)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {rows.map((row, idx) => (
 <tr key={idx} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-4 font-bold text-foreground">{row.size}</td>
 <td className="px-5 py-4 text-muted-foreground font-mono">{row.bustCm}</td>
 <td className="px-5 py-4 text-muted-foreground font-mono">{row.waistCm}</td>
 <td className="px-5 py-4 text-muted-foreground font-mono">{row.hipCm}</td>
 <td className="px-5 py-4 text-muted-foreground font-mono">{row.lengthCm || "-"}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {tip && (
 <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center gap-3 text-xs text-muted-foreground">
 <Ruler className="size-4 text-primary shrink-0" />
 <span>{tip}</span>
 </div>
 )}
 </div>
 </div>
 </section>
 );
}
