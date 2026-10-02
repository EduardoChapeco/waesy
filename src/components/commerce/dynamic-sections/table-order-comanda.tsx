import * as React from "react";
import { QrCode, Download, Printer, UtensilsCrossed, Smartphone, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TableOrderComandaProps {
 tableNumber?: string | number;
 storeName?: string;
 qrCodeUrl?: string;
 orderUrl?: string;
 wifiName?: string;
 wifiPassword?: string;
}

export function TableOrderComandaSection({
 tableNumber = "01",
 storeName,
 qrCodeUrl,
 orderUrl,
 wifiName = "Wi-Fi Clientes",
 wifiPassword,
}: TableOrderComandaProps) {
 const activeStoreName = storeName || "Restaurante & Gastronomia";
 const activeOrderUrl =
 orderUrl ||
 (typeof window !== "undefined"
 ? `${window.location.origin}/mesa/${tableNumber}`
 : `https://usewaesy.com/mesa/${tableNumber}`);
 const activeQrCode =
 qrCodeUrl ||
 `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeOrderUrl)}`;

 const handlePrint = () => {
 window.print();
 };

 return (
 <section className="py-10 bg-background w-full">
 <div className="max-w-md mx-auto px-4">
 {/* Cartão Físico / Digital de Comanda */}
 <div className="p-6 rounded-lg border border-border/80 bg-card shadow-lg text-center space-y-5 relative overflow-hidden">
 <div className="space-y-1">
 <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground uppercase">
 Autoatendimento no Salão
 </Badge>
 <h2 className="text-base font-bold text-foreground">{activeStoreName}</h2>
 </div>

 {/* Badge Gigante da Mesa / Comanda */}
 <div className="flex flex-col items-center justify-center py-2">
 <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest block">
 Mesa / Comanda
 </span>
 <span className="text-5xl font-black text-foreground font-mono tracking-tighter">
 {tableNumber}
 </span>
 </div>

 {/* QR Code Imersivo para Escaneamento */}
 <div className="p-4 rounded-lg bg-white border border-border/70 flex flex-col items-center justify-center space-y-2 max-w-[220px] mx-auto shadow-2xs">
 <img
 src={activeQrCode}
 alt={`QR Code da Mesa ${tableNumber}`}
 className="size-40 object-contain"
 />
 <span className="text-[10px] font-mono text-neutral-600 font-bold">
 Escaneie para fazer seu pedido
 </span>
 </div>

 {/* Informações de Conectividade do Estabelecimento */}
 {wifiName && (
 <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-left space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Wi-Fi:</span>
 <span className="font-semibold text-foreground font-mono">{wifiName}</span>
 </div>
 {wifiPassword && (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Senha:</span>
 <span className="font-semibold text-foreground font-mono">{wifiPassword}</span>
 </div>
 )}
 </div>
 )}

 {/* Botões de Ação para Garçons e Operadores */}
 <div className="flex items-center gap-2 pt-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handlePrint}
 className="flex-1 rounded-lg text-xs font-bold gap-2 border-border/80 bg-background hover:bg-muted"
 >
 <Printer className="size-3.5" />
 <span>Imprimir Display</span>
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={() => window.open(orderUrl, "_blank")}
 className="flex-1 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground"
 >
 <Smartphone className="size-3.5" />
 <span>Abrir Cardápio</span>
 </Button>
 </div>
 </div>
 </div>
 </section>
 );
}
