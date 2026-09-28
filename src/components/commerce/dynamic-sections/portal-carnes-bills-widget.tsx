import * as React from "react";
import { useState } from "react";
import { QrCode, Copy, Check, Calendar, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PortalBillItem {
 id: string;
 installment_number: number;
 total_installments: number;
 due_date: string;
 amount_cents: number;
 status: "paid" | "pending" | "overdue";
 pix_copy_paste?: string;
 paid_at?: string;
}

interface PortalCarnesBillsWidgetProps {
 content?: {
 title?: string;
 subtitle?: string;
 bills?: PortalBillItem[];
 };
 design_tokens?: any;
}

export function PortalCarnesBillsWidget({ content, design_tokens }: PortalCarnesBillsWidgetProps) {
 const [selectedBill, setSelectedBill] = useState<PortalBillItem | null>(null);
 const [isPixModalOpen, setIsPixModalOpen] = useState(false);
 const [copied, setCopied] = useState(false);

 const bills: PortalBillItem[] = content?.bills || [
 {
 id: "bill-01",
 installment_number: 1,
 total_installments: 3,
 due_date: "2026-08-10",
 amount_cents: 35000,
 status: "paid",
 paid_at: "2026-08-09T10:15:00Z",
 },
 {
 id: "bill-02",
 installment_number: 2,
 total_installments: 3,
 due_date: "2026-09-10",
 amount_cents: 35000,
 status: "pending",
 pix_copy_paste: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406350.005802BR5925WIDER EXPERIENCIAS DIGITAIS6009SAO PAULO62070503***6304ABCD",
 },
 {
 id: "bill-03",
 installment_number: 3,
 total_installments: 3,
 due_date: "2026-10-10",
 amount_cents: 35000,
 status: "pending",
 pix_copy_paste: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406350.005802BR5925WIDER EXPERIENCIAS DIGITAIS6009SAO PAULO62070503***6304EFGH",
 },
 ];

 const copyPix = (text: string) => {
 navigator.clipboard.writeText(text);
 setCopied(true);
 toast.success("Código Copia e Cola PIX copiado com sucesso!");
 setTimeout(() => setCopied(false), 2000);
 };

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <div className="flex items-center gap-2">
 <QrCode className="w-6 h-6 text-primary" />
 <h2 className="text-xl font-bold tracking-tight text-foreground">
 {content?.title || "Carnê Digital"}
 </h2>
 </div>
 <p className="text-sm text-muted-foreground mt-1">
 {content?.subtitle || "Consulte suas faturas em aberto e pague instantaneamente com PIX sem taxas."}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {bills.map((bill) => (
 <div
 key={bill.id}
 className={cn(
 "p-5 rounded-2xl border transition-all duration-200 shadow-sm flex flex-col justify-between gap-4",
 bill.status === "paid"
 ? "bg-card/60 border-border/50 opacity-85"
 : bill.status === "overdue"
 ? "bg-rose-500/5 border-rose-500/30"
 : "bg-card border-border hover:border-primary/50"
 )}
 >
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-muted-foreground">
 Parcela {bill.installment_number} de {bill.total_installments}
 </span>
 {bill.status === "paid" && (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Paga
 </Badge>
 )}
 {bill.status === "pending" && (
 <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs flex items-center gap-1">
 <Calendar className="w-3 h-3" /> Em Aberto
 </Badge>
 )}
 {bill.status === "overdue" && (
 <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs flex items-center gap-1">
 <AlertTriangle className="w-3 h-3" /> Vencida
 </Badge>
 )}
 </div>

 <div className="text-2xl font-bold text-foreground">
 R$ {(bill.amount_cents / 100).toFixed(2).replace(".", ",")}
 </div>

 <div className="text-xs text-muted-foreground flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5" />
 Vencimento: {new Date(bill.due_date).toLocaleDateString("pt-BR")}
 </div>
 </div>

 <div>
 {bill.status === "paid" ? (
 <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
 <Check className="w-4 h-4" /> Quitado em {new Date(bill.paid_at || "").toLocaleDateString("pt-BR")}
 </div>
 ) : (
 <Button
 className="w-full min-h-[44px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
 onClick={() => {
 setSelectedBill(bill);
 setIsPixModalOpen(true);
 }}
 >
 <QrCode className="w-4 h-4" />
 Pagar com PIX
 </Button>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Modal PIX Copia e Cola */}
 <Dialog open={isPixModalOpen} onOpenChange={setIsPixModalOpen}>
 <DialogContent className="max-w-md rounded-2xl">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <QrCode className="w-5 h-5 text-emerald-600" />
 Pagamento Instantâneo via PIX
 </DialogTitle>
 <DialogDescription>
 Parcela {selectedBill?.installment_number} no valor de <strong>R$ {((selectedBill?.amount_cents || 0) / 100).toFixed(2).replace(".", ",")}</strong>
 </DialogDescription>
 </DialogHeader>

 <div className="flex flex-col items-center py-4 space-y-4">
 <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-border shadow-inner flex items-center justify-center">
 {/* Simulação visual do QR Code com SVG nativo */}
 <div className="w-full h-full border-4 border-black/80 rounded-lg p-2 flex flex-col justify-between">
 <div className="flex justify-between">
 <div className="w-8 h-8 bg-black"></div>
 <div className="w-8 h-8 bg-black"></div>
 </div>
 <div className="text-center font-mono text-[10px] text-black font-bold tracking-widest">
 PIX BANCO CENTRAL
 </div>
 <div className="flex justify-between">
 <div className="w-8 h-8 bg-black"></div>
 <div className="w-4 h-4 bg-emerald-600 rounded-full"></div>
 </div>
 </div>
 </div>

 <p className="text-xs text-muted-foreground text-center max-w-xs">
 Abra o aplicativo do seu banco, escolha a opção <strong>PIX Copia e Cola</strong> e cole o código abaixo:
 </p>

 <div className="w-full relative">
 <input
 type="text"
 readOnly
 value={selectedBill?.pix_copy_paste || ""}
 className="w-full pr-12 pl-3.5 py-2.5 rounded-xl border border-border bg-muted/50 text-xs font-mono select-all min-h-[44px]"
 />
 <Button
 size="sm"
 variant="ghost"
 onClick={() => copyPix(selectedBill?.pix_copy_paste || "")}
 className="absolute right-1 top-1 bottom-1 px-3 min-h-[36px]"
 >
 {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
