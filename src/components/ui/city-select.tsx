import React, { useState, useMemo } from "react";
import { MapPin, Search, Plus } from "lucide-react";
import { BRAZILIAN_STATES } from "@/lib/constants/brazilian-states";
import { CANONICAL_CITIES, getCitiesByState, type CityRecord } from "@/lib/constants/cities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CitySelectProps {
 stateValue: string; // Ex: "SC"
 cityValue: string; // Ex: "Chapecó"
 onStateChange: (uf: string) => void;
 onCityChange: (city: string, record?: CityRecord) => void;
 labelCity?: string;
 labelState?: string;
 className?: string;
 disabled?: boolean;
}

export function CitySelect({
 stateValue = "SC",
 cityValue = "",
 onStateChange,
 onCityChange,
 labelCity = "Cidade",
 labelState = "Estado (UF)",
 className,
 disabled = false,
}: CitySelectProps) {
 const [citySearch, setCitySearch] = useState("");
 const [isCustomMode, setIsCustomMode] = useState(false);

 const availableCities = useMemo(() => {
 const list = getCitiesByState(stateValue);
 // Se o cityValue atual não estiver na lista canônica e não estiver vazio, adiciona temporariamente para não quebrar a seleção
 if (cityValue && !list.some((c) => c.name.toLowerCase() === cityValue.toLowerCase())) {
 const customRecord: CityRecord = {
 id: `custom-${cityValue.toLowerCase().replace(/\s+/g, "-")}`,
 name: cityValue,
 state: stateValue,
 label: `${cityValue} - ${stateValue}`,
 region: "Outra",
 };
 list.push(customRecord);
 }

 if (!citySearch.trim()) return list;
 const q = citySearch.toLowerCase().trim();
 return list.filter((c) => c.name.toLowerCase().includes(q));
 }, [stateValue, citySearch, cityValue]);

 const handleStateSelect = (uf: string) => {
 onStateChange(uf);
 const citiesOfState = getCitiesByState(uf);
 if (citiesOfState.length > 0) {
 onCityChange(citiesOfState[0].name, citiesOfState[0]);
 } else {
 onCityChange("", undefined);
 }
 setCitySearch("");
 setIsCustomMode(false);
 };

 const handleCitySelect = (cityName: string) => {
 if (cityName === "__CUSTOM_CITY__") {
 setIsCustomMode(true);
 return;
 }
 const match = availableCities.find((c) => c.name === cityName);
 onCityChange(cityName, match);
 setIsCustomMode(false);
 };

 return (
 <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-3", className)}>
 {/* 1. Seleção de Estado (UF) */}
 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">{labelState}</Label>
 <Select value={stateValue} onValueChange={handleStateSelect} disabled={disabled}>
 <SelectTrigger className="h-10 rounded-lg text-xs font-bold bg-muted/30 border-border">
 <SelectValue placeholder="UF" />
 </SelectTrigger>
 <SelectContent className="max-h-60 rounded-lg">
 {BRAZILIAN_STATES.map((st) => (
 <SelectItem key={st.uf} value={st.uf} className="text-xs font-medium">
 <span className="font-bold font-mono mr-2 text-foreground">{st.uf}</span>
 <span className="text-muted-foreground">({st.name})</span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* 2. Seleção de Cidade Canônica ou Entrada Manual */}
 <div className="space-y-2 sm:col-span-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-muted-foreground">{labelCity}</Label>
 <button
 type="button"
 onClick={() => setIsCustomMode(!isCustomMode)}
 className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
 >
 {isCustomMode ? "Voltar para lista de cidades" : "Outra cidade"}
 </button>
 </div>

 {isCustomMode || availableCities.length === 0 ? (
 <div className="relative">
 <Input
 placeholder="Digite o nome da sua cidade..."
 value={cityValue}
 onChange={(e) => onCityChange(e.target.value)}
 disabled={disabled}
 className="h-10 rounded-lg text-xs bg-muted/30 border-border pl-8 font-medium"
 />
 <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
 </div>
 ) : (
 <Select value={cityValue} onValueChange={handleCitySelect} disabled={disabled}>
 <SelectTrigger className="h-10 rounded-lg text-xs font-bold bg-muted/30 border-border">
 <div className="flex items-center gap-2 truncate">
 <MapPin size={13} className="text-primary shrink-0" />
 <SelectValue placeholder="Selecione a Cidade" />
 </div>
 </SelectTrigger>
 <SelectContent className="max-h-64 rounded-lg">
 <div className="p-2 sticky top-0 bg-popover z-10">
 <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg ">
 <Search size={12} className="text-muted-foreground shrink-0" />
 <input
 placeholder="Filtrar cidade..."
 value={citySearch}
 onChange={(e) => setCitySearch(e.target.value)}
 className="bg-transparent text-xs outline-none w-full text-foreground placeholder:text-muted-foreground"
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 />
 </div>
 </div>
 {availableCities.map((c) => (
 <SelectItem key={c.id} value={c.name} className="text-xs font-medium">
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 </div>
 </div>
 );
}
