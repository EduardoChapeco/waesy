import React, { useState } from 'react';
import { Send, Copy, Download, Image as ImageIcon, Check, FileText, Phone, Layers, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { TravelProposalDTO } from '@/services/travel-proposal.functions';
import { exportElementAsPdf, exportElementAsImage } from '@/lib/pdf-export';
import { formatMoney } from '@/lib/money';

interface ProposalShareWhatsappModalProps {
 isOpen: boolean;
 onClose: () => void;
 proposal: TravelProposalDTO;
}

export function ProposalShareWhatsappModal({
 isOpen,
 onClose,
 proposal,
}: ProposalShareWhatsappModalProps) {
 const cleanPhone = (proposal.client_whatsapp || '').replace(/\D/g, '');
 const [recipientPhone, setRecipientPhone] = useState(cleanPhone);
 const [isExportingPdf, setIsExportingPdf] = useState(false);
 const [isExportingPng, setIsExportingPng] = useState(false);
 const [copiedText, setCopiedText] = useState(false);

 const publicUrl = typeof window !== 'undefined'
 ? `${window.location.origin}/proposta/${proposal.public_token}`
 : `/proposta/${proposal.public_token}`;

 const totalPriceFormatted = formatMoney(proposal.pricing?.total_price_cents || 0);
 const hotelHighlight = proposal.hotels?.[0]?.hotel_name || 'Hospedagem Selecionada';
 const f = proposal.flights?.[0] as any;
 const flightHighlight = f
 ? `Voo ${f.airline_name || f.airline || 'Aéreo'} (${f.origin_iata || f.origin || ''} ➔ ${f.destination_iata || f.destination || ''})`
 : 'Aéreo conforme roteiro';

 const defaultMessage = `Olá ${proposal.client_name}! ✈️🌟

Preparamos com muito carinho a sua proposta exclusiva de viagem para *${proposal.destination_city}*!

📌 *Resumo do Pacote:*
🗓️ *Período:* ${proposal.travel_start_date || 'A combinar'} até ${proposal.travel_end_date || 'A combinar'}
🏨 *Hotel:* ${hotelHighlight}
✈️ *Aéreo:* ${flightHighlight}
💰 *Valor Total:* *${totalPriceFormatted}* (com condições especiais de parcelamento)

📲 *Acesse sua Proposta Visual Interativa no link abaixo:*
${publicUrl}

Ficamos à disposição para tirar qualquer dúvida e garantir sua reserva! `;

 const [message, setMessage] = useState(defaultMessage);

 const handleCopyText = () => {
 navigator.clipboard.writeText(message);
 setCopiedText(true);
 toast.success('Mensagem copiada para a área de transferência!');
 setTimeout(() => setCopiedText(false), 2000);
 };

 const handleExportPdf = async () => {
 try {
 setIsExportingPdf(true);
 await exportElementAsPdf('proposal-canvas', `Proposta_${proposal.title.replace(/\s+/g, '_')}.pdf`);
 toast.success('PDF da proposta exportado com sucesso!');
 } catch (err: any) {
 toast.error('Erro ao exportar PDF: ' + err?.message);
 } finally {
 setIsExportingPdf(false);
 }
 };

 const handleExportPng = async () => {
 try {
 setIsExportingPng(true);
 await exportElementAsImage('proposal-canvas', `Lâmina_${proposal.title.replace(/\s+/g, '_')}.png`);
 toast.success('Lâmina em imagem PNG exportada com sucesso!');
 } catch (err: any) {
 toast.error('Erro ao exportar imagem: ' + err?.message);
 } finally {
 setIsExportingPng(false);
 }
 };

 const handleOpenWhatsApp = () => {
 const phoneToUse = recipientPhone.replace(/\D/g, '');
 const encoded = encodeURIComponent(message);
 const waUrl = phoneToUse
 ? `https://wa.me/55${phoneToUse}?text=${encoded}`
 : `https://wa.me/?text=${encoded}`;
 window.open(waUrl, '_blank');
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
 <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
 <Send className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-foreground">
 Compartilhar Proposta & Lâmina Visual
 </DialogTitle>
 <p className="text-[11px] text-muted-foreground">
 Envio 1-clique formatado para o WhatsApp do passageiro
 </p>
 </div>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
 {/* Destinatário */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Phone className="size-3.5 text-primary" />
 <span>WhatsApp do Cliente:</span>
 </label>
 <Input
 value={recipientPhone}
 onChange={(e) => setRecipientPhone(e.target.value)}
 placeholder="Ex: (49) 99999-9999"
 className="h-10 text-xs rounded-xl font-mono bg-muted/20"
 />
 </div>

 {/* Mensagem Formatada */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-foreground">Mensagem Comercial Formatada:</label>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleCopyText}
 className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
 >
 {copiedText ? <Check className="size-3 text-emerald-500 mr-1" /> : <Copy className="size-3 mr-1" />}
 {copiedText ? 'Copiado!' : 'Copiar Texto'}
 </Button>
 </div>
 <Textarea
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 rows={8}
 className="font-mono text-xs leading-relaxed rounded-2xl bg-muted/10 resize-none p-3.5 border-border/80"
 />
 </div>

 {/* Atalhos Rápidos de Exportação Visual de Lâminas */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
 Anexos & Lâminas de Alta Resolução:
 </span>
 <div className="grid grid-cols-2 gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isExportingPng}
 onClick={handleExportPng}
 className="h-9 rounded-xl text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted"
 >
 <ImageIcon className="size-3.5 text-primary" />
 {isExportingPng ? 'Gerando PNG...' : 'Baixar Lâmina (PNG)'}
 </Button>

 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isExportingPdf}
 onClick={handleExportPdf}
 className="h-9 rounded-xl text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted"
 >
 <Download className="size-3.5 text-rose-500" />
 {isExportingPdf ? 'Gerando PDF...' : 'Baixar Proposta (PDF)'}
 </Button>
 </div>
 </div>
 </div>

 <DialogFooter className="p-4 border-t border-border/70 bg-muted/10 flex items-center justify-between sm:justify-between">
 <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl text-xs">
 Fechar
 </Button>

 <Button
 type="button"
 onClick={handleOpenWhatsApp}
 className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md px-5"
 >
 <Send className="size-3.5" />
 Disparar no WhatsApp
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
