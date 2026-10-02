import React, { useState } from "react";
import { Link2, Copy, Check, Share2, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { generatePassengerMagicLink } from "@/services/group-tour-tokens.functions";

interface GenerateMagicLinkModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 storeId: string;
 tourId: string;
 seatNumber?: number | null;
 initialPassengerName?: string;
 initialPassengerPhone?: string;
}

export function GenerateMagicLinkModal({
 open,
 onOpenChange,
 storeId,
 tourId,
 seatNumber,
 initialPassengerName = "",
 initialPassengerPhone = "",
}: GenerateMagicLinkModalProps) {
 const [passengerName, setPassengerName] = useState(initialPassengerName);
 const [passengerPhone, setPassengerPhone] = useState(initialPassengerPhone);
 const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
 const [copied, setCopied] = useState(false);
 const [loading, setLoading] = useState(false);

 const handleGenerate = async () => {
 try {
 setLoading(true);
 const res = await generatePassengerMagicLink({
 data: {
 store_id: storeId,
 tour_id: tourId,
 passenger_seat_number: seatNumber || null,
 passenger_name: passengerName || null,
 passenger_phone: passengerPhone || null,
 },
 });

 const origin = typeof window !== "undefined" ? window.location.origin : "";
 const url = `${origin}/m/excursao/${res.token}`;
 setGeneratedUrl(url);
 toast.success("Link mágico gerado!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao gerar link de passageiro");
 } finally {
 setLoading(false);
 }
 };

 const handleCopy = () => {
 if (!generatedUrl) return;
 navigator.clipboard.writeText(generatedUrl);
 setCopied(true);
 toast.success("Link copiado para a área de transferência!");
 setTimeout(() => setCopied(false), 2000);
 };

 const handleWhatsApp = () => {
 if (!generatedUrl) return;
 const msg = encodeURIComponent(
 `Olá! Segue o link para preenchimento dos dados e aceite dos termos da sua viagem: ${generatedUrl}`
 );
 window.open(`https://wa.me/${passengerPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md rounded-lg border-border/70 bg-card p-5 space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Link2 className="size-4 text-primary" />
 Link Mágico de Passageiro
 {seatNumber && (
 <span className="text-xs font-mono text-muted-foreground font-normal">
 (Poltrona #{seatNumber})
 </span>
 )}
 </DialogTitle>
 </DialogHeader>

 {!generatedUrl ? (
 <div className="space-y-4">
 <p className="text-xs text-muted-foreground leading-relaxed">
 Gere um link seguro para o passageiro preencher CPF, RG, data de nascimento, contato de emergência e aceitar o contrato em 3 toques no próprio celular.
 </p>

 <div className="space-y-2">
 <label className="text-xs font-semibold text-foreground">
 Nome do Passageiro (opcional)
 </label>
 <Input
 value={passengerName}
 onChange={(e) => setPassengerName(e.target.value)}
 placeholder="Ex: João da Silva"
 className="h-10 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs font-semibold text-foreground">
 WhatsApp / Celular (opcional)
 </label>
 <Input
 value={passengerPhone}
 onChange={(e) => setPassengerPhone(e.target.value)}
 placeholder="Ex: 49999999999"
 className="h-10 text-xs rounded-lg font-mono"
 />
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="button"
 onClick={handleGenerate}
 disabled={loading}
 className="w-full h-10 rounded-lg text-xs font-bold gap-2 cursor-pointer"
 >
 <Link2 className="size-3.5" />
 {loading ? "Gerando link..." : "Gerar Link de Preenchimento"}
 </Button>
 </DialogFooter>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-2">
 <span className="text-[11px] font-mono text-muted-foreground">
 Link de Acesso Único
 </span>
 <Input
 readOnly
 value={generatedUrl}
 className="h-9 text-xs rounded-lg font-mono bg-background select-all"
 />
 </div>

 <div className="flex flex-col sm:flex-row items-center gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={handleCopy}
 className="w-full sm:w-1/2 h-10 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
 >
 {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
 {copied ? "Copiado!" : "Copiar Link"}
 </Button>

 <Button
 type="button"
 onClick={handleWhatsApp}
 className="w-full sm:w-1/2 h-10 rounded-lg text-xs font-semibold gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 <Share2 className="size-3.5" /> Enviar no WhatsApp
 </Button>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
