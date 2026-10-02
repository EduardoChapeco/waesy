import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Package, RotateCcw, Calendar, CheckCircle2, Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PortalOrderRentalItem {
 id: string;
 order_number: string;
 type: "purchase" | "rental";
 title: string;
 total_cents: number;
 status: "delivered" | "in_transit" | "active_rental" | "returned";
 created_at: string;
 return_deadline?: string;
}

interface PortalOrdersRentalsWidgetProps {
 content?: {
 title?: string;
 subtitle?: string;
 items?: PortalOrderRentalItem[];
 };
 design_tokens?: any;
}

export function PortalOrdersRentalsWidget({ content, design_tokens }: PortalOrdersRentalsWidgetProps) {
 const items: PortalOrderRentalItem[] = content?.items || [
 {
 id: "ord-101",
 order_number: "#8921",
 type: "purchase",
 title: "Mochila Impermeável de Trekking 45L + Kit Acessórios",
 total_cents: 28990,
 status: "delivered",
 created_at: "2026-08-15",
 },
 {
 id: "ord-102",
 order_number: "#8955",
 type: "rental",
 title: "Locação de Barraca 4 Pessoas Pro + 2 Isolantes Térmicos",
 total_cents: 14000,
 status: "active_rental",
 created_at: "2026-08-28",
 return_deadline: "2026-09-15",
 },
 ];

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <div className="flex items-center gap-2">
 <Package className="w-6 h-6 text-primary" />
 <h2 className="text-xl font-bold tracking-tight text-foreground">
 {content?.title || "Compras"}
 </h2>
 </div>
 <p className="text-sm text-muted-foreground mt-1">
 {content?.subtitle || "Histórico detalhado de pedidos, produtos alugados e prazos de devolução."}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {items.map((item) => (
 <div
 key={item.id}
 className="p-5 rounded-lg border border-border bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
 >
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-3 flex-wrap">
 <span className="font-mono text-xs text-muted-foreground font-bold">{item.order_number}</span>
 <span className="font-semibold text-base text-foreground">{item.title}</span>
 {item.type === "rental" ? (
 <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
 Locação
 </Badge>
 ) : (
 <Badge variant="secondary" className="text-xs">
 Compra
 </Badge>
 )}
 {item.status === "delivered" && (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
 Entregue
 </Badge>
 )}
 {item.status === "active_rental" && (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
 Locação Ativa
 </Badge>
 )}
 </div>

 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
 <span>Valor Total: <strong>R$ {(item.total_cents / 100).toFixed(2).replace(".", ",")}</strong></span>
 <span>Data: {new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
 {item.return_deadline && (
 <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" />
 Devolução até: {new Date(item.return_deadline).toLocaleDateString("pt-BR")}
 </span>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 w-full md:w-auto">
 <Button
 asChild
 size="sm"
 variant="outline"
 className="min-h-11 flex-1 md:flex-none gap-2 text-xs"
 >
 <Link to="/conta/trocas">
 <RotateCcw className="w-3.5 h-3.5" />
 Trocar / Devolver
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
