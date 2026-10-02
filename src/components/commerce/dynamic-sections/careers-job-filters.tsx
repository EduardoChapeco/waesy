import * as React from "react";
import { Search, Filter, Briefcase, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CareersJobFiltersProps {
 content?: {
 departments?: string[];
 };
 design_tokens?: any;
 selectedDepartment?: string;
 onSelectDepartment?: (dept: string) => void;
 searchQuery?: string;
 onSearchChange?: (query: string) => void;
}

export function CareersJobFilters({
 content,
 design_tokens,
 selectedDepartment = "all",
 onSelectDepartment,
 searchQuery = "",
 onSearchChange,
}: CareersJobFiltersProps) {
 const departments = content?.departments || [
 "Todos os Setores",
 "Comercial & Vendas",
 "Engenharia & Produto",
 "Operações & Logística",
 "Atendimento & Suporte",
 "Financeiro & RH",
 ];

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-6 px-4", design_tokens?.className)}>
 <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
 <div className="relative w-full sm:max-w-xs">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 type="text"
 placeholder="Buscar vaga por cargo ou palavra-chave..."
 value={searchQuery}
 onChange={(e) => onSearchChange?.(e.target.value)}
 className="pl-10 min-h-11 rounded-lg text-xs bg-card"
 />
 </div>

 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
 {departments.map((dept, i) => {
 const key = i === 0 ? "all" : dept;
 const isSelected = selectedDepartment === key;
 return (
 <button
 key={dept}
 onClick={() => onSelectDepartment?.(key)}
 className={cn(
 "px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-11 border",
 isSelected
 ? "bg-primary text-primary-foreground border-primary shadow-sm"
 : "bg-card text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
 )}
 >
 {dept}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
}
