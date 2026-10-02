import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Car, Motorcycle, Truck } from "@phosphor-icons/react";

const MOBILITY_ICONS = [
 { icon: Car, label: "Carro" },
 { icon: Motorcycle, label: "Moto" },
 { icon: Truck, label: "Frete" },
];

export function MobilityQuickButton() {
 const [index, setIndex] = React.useState(0);
 const location = useLocation();
 const isActive = location.pathname === "/mobilidade";

 React.useEffect(() => {
 const interval = setInterval(() => {
 setIndex((prev) => (prev + 1) % MOBILITY_ICONS.length);
 }, 2800);
 return () => clearInterval(interval);
 }, []);

 const Current = MOBILITY_ICONS[index];
 const Icon = Current.icon;

 return (
 <Link
 to="/mobilidade"
 title="Mobilidade & Fretes: Carro, Moto e Caminhão"
 aria-label="Mobilidade Urbana & Fretes"
 className={`h-9 px-3 sm:px-3 rounded-lg border flex items-center gap-2 transition-all select-none group cursor-pointer shrink-0 ${
 isActive
 ? "bg-foreground text-background border-foreground scale-102"
 : "bg-card border-border text-foreground hover:bg-muted hover:border-foreground/30 "
 }`}
 >
 <div className="relative size-4 flex items-center justify-center overflow-hidden">
 <Icon
 key={index}
 size={16}
 weight="bold"
 className="text-foreground transition-all duration-300 animate-in fade-in zoom-in-75"
 />
 </div>
 <span className="hidden sm:inline text-xs font-bold tracking-tight">
 Mobilidade
 </span>
 <span className="hidden md:inline-block text-[10px] font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
 {Current.label}
 </span>
 </Link>
 );
}
