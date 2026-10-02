import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket, Layers, Calendar, Clock, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { toast } from "sonner";

import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyServicePackageDirect } from "@/services/service-packages.functions";

interface ServicePackagesRailProps {
 packages: any[];
 title?: string;
 subtitle?: string;
}

export function ServicePackagesRail({
 packages,
 title = "Pacotes de Aulas & Passes com Desconto",
 subtitle = "Compre pacotes de sessões com desconto exclusivo e agende seus horários quando quiser.",
}: ServicePackagesRailProps) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
 const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
 const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
 const [customerName, setCustomerName] = useState("");
 const [customerPhone, setCustomerPhone] = useState("");

 const buyMutation = useMutation({
 mutationFn: async () => {
 if (!selectedPackage) throw new Error("Selecione um pacote.");
 if (!customerPhone.trim()) throw new Error("Informe seu WhatsApp/Telefone para vincular o pacote.");
 return await buyServicePackageDirect({
 data: {
 package_id: selectedPackage.id,
 payment_method: paymentMethod,
 customer_name: customerName.trim() || "Cliente",
 customer_phone: customerPhone.trim(),
 },
 });
 },
 onSuccess: (res: any) => {
 toast.success(
 `Pacote adquirido! Você recebeu ${res.total_credits} créditos na sua carteira.`,
 );
 setIsBuyModalOpen(false);
 setSelectedPackage(null);
 queryClient.invalidateQueries({ queryKey: ["my-customer-passes"] });
 router.navigate({ to: "/conta/pacotes" });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao adquirir pacote. Faça login para continuar.");
 },
 });

 if (!packages || packages.length === 0) return null;

 return (
 <section className="space-y-4 py-4">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-primary text-primary-foreground">
 Economia e Passes
 </span>
 </div>
 <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1">
 {title}
 </h2>
 <p className="text-xs text-muted-foreground">{subtitle}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {packages.map((pkg) => {
 const store = pkg.stores;
 const service = pkg.booking_services;

 return (
 <div
 key={pkg.id}
 className="p-5 rounded-lg bg-card space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-all group"
 >
 <div className="space-y-3">
 {/* Header com Loja e Badges */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 {store?.avatar_url ? (
 <img
 src={store.avatar_url}
 alt={store.name}
 className="size-7 rounded-full object-cover "
 />
 ) : (
 <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
 {store?.name?.substring(0, 2).toUpperCase()}
 </div>
 )}
 <span className="text-xs font-bold text-foreground leading-none">
 {store?.name}
 </span>
 </div>

 <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono font-bold px-2 py-1">
 {pkg.total_credits} {pkg.total_credits === 1 ? "Aula" : "Aulas/Sessões"}
 </Badge>
 </div>

 <div>
 <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
 {pkg.title}
 </h3>
 <span className="text-[11px] text-muted-foreground font-medium block mt-1">
 {service?.title} ({service?.duration_minutes || 60} min/sessão)
 </span>
 </div>

 {pkg.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {pkg.description}
 </p>
 )}

 {/* Preço e Validade */}
 <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between font-mono">
 <div>
 <span className="text-[9px] uppercase font-bold text-muted-foreground block">
 Valor do Pacote
 </span>
 <span className="text-base font-black text-foreground">
 {formatMoney(pkg.price_cents)}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[9px] uppercase font-bold text-muted-foreground block">
 Validade
 </span>
 <span className="text-xs font-bold text-foreground">
 {pkg.validity_days} dias
 </span>
 </div>
 </div>
 </div>

 <div className="pt-2 ">
 <Button
 onClick={() => {
 setSelectedPackage(pkg);
 setIsBuyModalOpen(true);
 }}
 className="w-full rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 "
 >
 <Ticket className="size-3.5 mr-2" />
 Comprar Pacote
 </Button>
 </div>
 </div>
 );
 })}
 </div>

 {/* ── Modal de Compra do Pacote ── */}
 <Dialog open={isBuyModalOpen} onOpenChange={setIsBuyModalOpen}>
 <DialogContent className="sm:max-w-md sm:rounded-lg sm:p-6 p-5">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold flex items-center gap-2">
 <Ticket className="size-5 text-primary" />
 Adquirir Passe de Aulas
 </DialogTitle>
 </DialogHeader>

 {selectedPackage && (
 <div className="space-y-4 py-2">
 <div className="p-4 rounded-lg bg-muted/40 space-y-2">
 <div className="flex justify-between items-start">
 <div>
 <h4 className="font-bold text-sm text-foreground">
 {selectedPackage.title}
 </h4>
 <span className="text-xs text-muted-foreground">
 {selectedPackage.stores?.name}
 </span>
 </div>
 <span className="text-base font-black font-mono text-foreground">
 {formatMoney(selectedPackage.price_cents)}
 </span>
 </div>

 <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono pt-2 ">
 <span className="flex items-center gap-1">
 <CheckCircle2 size={13} className="text-emerald-500" />
 {selectedPackage.total_credits} créditos
 </span>
 <span>•</span>
 <span>Válido por {selectedPackage.validity_days} dias</span>
 </div>
 </div>

 {/* Informações do Comprador */}
 <div className="space-y-3">
 <div className="space-y-1">
 <Label className="text-xs">Nome do Titular *</Label>
 <Input
 placeholder="Seu nome completo"
 value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 className="rounded-lg h-10 text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs">WhatsApp para Confirmação *</Label>
 <Input
 placeholder="(00) 00000-0000"
 value={customerPhone}
 onChange={(e) => setCustomerPhone(e.target.value)}
 className="rounded-lg h-10 text-xs font-mono"
 />
 </div>
 </div>

 {/* Forma de Pagamento */}
 <div className="space-y-2 pt-1">
 <Label className="text-xs font-bold">Forma de Pagamento:</Label>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setPaymentMethod("pix")}
 className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
 paymentMethod === "pix"
 ? "bg-foreground text-background border-foreground "
 : "bg-muted/40 border-border text-foreground hover:bg-muted"
 }`}
 >
 <Zap size={14} className="text-primary" /> Pix Imediato
 </button>
 <button
 type="button"
 onClick={() => setPaymentMethod("credit_card")}
 className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
 paymentMethod === "credit_card"
 ? "bg-foreground text-background border-foreground "
 : "bg-muted/40 border-border text-foreground hover:bg-muted"
 }`}
 >
 Cartão de Crédito
 </button>
 </div>
 </div>
 </div>
 )}

 <DialogFooter className="gap-2 pt-3 ">
 <Button
 variant="outline"
 onClick={() => setIsBuyModalOpen(false)}
 className="rounded-lg text-xs font-bold border-border"
 >
 Cancelar
 </Button>
 <Button
 disabled={buyMutation.isPending}
 onClick={() => buyMutation.mutate()}
 className="rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
 >
 {buyMutation.isPending ? "Processando..." : "Confirmar & Liberar Créditos"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </section>
 );
}
