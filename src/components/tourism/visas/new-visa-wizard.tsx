import React, { useState } from 'react';
import { Globe, User, Calendar, FileText, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createTravelVisa } from '@/services/travel-visas.functions';

interface NewVisaWizardProps {
 isOpen: boolean;
 onClose: () => void;
 onCreated?: () => void;
 storeId?: string;
}

export function NewVisaWizard({ isOpen, onClose, onCreated, storeId }: NewVisaWizardProps) {
 const [clientName, setClientName] = useState('');
 const [clientPassport, setClientPassport] = useState('');
 const [country, setCountry] = useState('Estados Unidos (EUA)');
 const [visaCategory, setVisaCategory] = useState('Turismo B1/B2');
 const [interviewDate, setInterviewDate] = useState('');
 const [notes, setNotes] = useState('');
 const [submitting, setSubmitting] = useState(false);

 const handleSubmit = async () => {
 if (!clientName.trim() || !country.trim()) {
 toast.error('Informe o nome do requerente e o país de destino.');
 return;
 }

 setSubmitting(true);
 try {
 await createTravelVisa({
 data: {
 store_id: storeId,
 client_name: clientName.trim(),
 client_passport: clientPassport.trim() || null,
 country: country.trim(),
 visa_category: visaCategory.trim(),
 interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
 notes: notes.trim() || null,
 },
 });

 toast.success('Processo consular iniciado com sucesso!');
 if (onCreated) onCreated();
 onClose();
 } catch (err: any) {
 toast.error(err?.message || 'Erro ao criar processo de visto');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-lg bg-card border border-border shadow-2xl">
 <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
 <Globe className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-foreground">
 Novo Processo de Visto / Passaporte
 </DialogTitle>
 <p className="text-[11px] text-muted-foreground">
 Controle de documentação consular, agendamento de CASV e entrevista
 </p>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Nome Completo do Passageiro / Requerente *</label>
 <Input
 value={clientName}
 onChange={(e) => setClientName(e.target.value)}
 placeholder="Ex: Mariana Souza Santos"
 className="h-10 text-xs rounded-lg"
 autoFocus
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Nº Passaporte</label>
 <Input
 value={clientPassport}
 onChange={(e) => setClientPassport(e.target.value)}
 placeholder="Ex: FY123456"
 className="h-10 text-xs rounded-lg uppercase font-mono"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">País de Destino *</label>
 <select
 value={country}
 onChange={(e) => setCountry(e.target.value)}
 className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground"
 >
 <option value="Estados Unidos (EUA)">Estados Unidos (EUA)</option>
 <option value="Canadá (eTA / Visto)">Canadá (eTA / Visto)</option>
 <option value="União Europeia (ETIAS / Shengen)">União Europeia (ETIAS / Shengen)</option>
 <option value="Reino Unido (UK ETA)">Reino Unido (UK ETA)</option>
 <option value="Japão (eVisa)">Japão (eVisa)</option>
 <option value="Austrália (eVisitor)">Austrália (eVisitor)</option>
 <option value="China (Visto de Negócios / Turismo)">China (Visto L/M)</option>
 <option value="Outro País">Outro País</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Categoria do Visto</label>
 <Input
 value={visaCategory}
 onChange={(e) => setVisaCategory(e.target.value)}
 placeholder="Ex: Turismo B1/B2, Estudante F1..."
 className="h-10 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Data da Entrevista Consular</label>
 <Input
 type="date"
 value={interviewDate}
 onChange={(e) => setInterviewDate(e.target.value)}
 className="h-10 text-xs rounded-lg"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Observações e Instruções do Cliente</label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Primeira solicitação, já viajou para Europa, precisa renovar passaporte antes de agendar..."
 rows={3}
 className="text-xs rounded-lg bg-muted/10 p-3"
 />
 </div>
 </div>

 <DialogFooter className="p-4 border-t border-border/70 bg-muted/10 flex items-center justify-between sm:justify-between">
 <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-xs">
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={submitting}
 onClick={handleSubmit}
 className="rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-1 shadow-md px-5"
 >
 <Check className="size-3.5" />
 {submitting ? 'Salvando...' : 'Iniciar Processo'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
