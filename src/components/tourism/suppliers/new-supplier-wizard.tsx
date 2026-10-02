import React, { useState } from 'react';
import { Building2, X, ChevronRight, ChevronLeft, Check, Percent, Phone, Mail, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SUPPLIER_KIND_LABELS, type SupplierKind } from '@/types/travel-suppliers';
import { createTravelSupplier } from '@/services/travel-suppliers.functions';

interface NewSupplierWizardProps {
 isOpen: boolean;
 onClose: () => void;
 onCreated?: () => void;
 storeId?: string;
}

const STEPS = ['Identidade B2B', 'Localização', 'Comercial & Markups', 'Contatos & SLA'];

export function NewSupplierWizard({ isOpen, onClose, onCreated, storeId }: NewSupplierWizardProps) {
 const [step, setStep] = useState(0);
 const [submitting, setSubmitting] = useState(false);

 // Form states
 const [name, setName] = useState('');
 const [legalName, setLegalName] = useState('');
 const [kind, setKind] = useState<SupplierKind>('operator');
 const [document, setDocument] = useState('');
 const [city, setCity] = useState('');
 const [state, setState] = useState('');
 const [country, setCountry] = useState('Brasil');
 const [commissionRate, setCommissionRate] = useState('10');
 const [notes, setNotes] = useState('');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');

 const handleNext = () => {
 if (step === 0 && !name.trim()) {
 toast.error('Informe o Nome Fantasia do fornecedor para prosseguir.');
 return;
 }
 setStep((s) => Math.min(s + 1, STEPS.length - 1));
 };

 const handleBack = () => setStep((s) => Math.max(s - 1, 0));

 const handleSubmit = async () => {
 if (!name.trim()) {
 toast.error('Informe o Nome Fantasia.');
 return;
 }

 setSubmitting(true);
 try {
 await createTravelSupplier({
 data: {
 store_id: storeId,
 name: name.trim(),
 legal_name: legalName.trim() || null,
 kind,
 document: document.trim() || null,
 commission_rate: parseFloat(commissionRate) || 0,
 notes: notes.trim() || null,
 email: email.trim() || null,
 phone: phone.trim() || null,
 city: city.trim() || null,
 state: state.trim() || null,
 country: country.trim() || 'Brasil',
 },
 });

 toast.success('Fornecedor cadastrado com sucesso!');
 if (onCreated) onCreated();
 onClose();
 } catch (err: any) {
 toast.error(err?.message || 'Erro ao cadastrar fornecedor');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-lg bg-card border border-border shadow-2xl">
 <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10 text-primary">
 <Building2 className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-foreground">
 Cadastrar Novo Fornecedor / Operadora
 </DialogTitle>
 <p className="text-[11px] text-muted-foreground">
 Passo {step + 1} de {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong>
 </p>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">
 {step === 0 && (
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Nome Fantasia *</label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Operadora de Turismo, Viagens Promo, LATAM Airlines"
 className="h-10 text-xs rounded-lg"
 autoFocus
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Razão Social</label>
 <Input
 value={legalName}
 onChange={(e) => setLegalName(e.target.value)}
 placeholder="Ex: Razão Social da Operadora / Parceiro"
 className="h-10 text-xs rounded-lg"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Categoria / Tipo</label>
 <select
 value={kind}
 onChange={(e) => setKind(e.target.value as SupplierKind)}
 className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground"
 >
 {Object.entries(SUPPLIER_KIND_LABELS).map(([k, label]) => (
 <option key={k} value={k}>{label}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">CNPJ / Documento</label>
 <Input
 value={document}
 onChange={(e) => setDocument(e.target.value)}
 placeholder="00.000.000/0000-00"
 className="h-10 text-xs rounded-lg font-mono"
 />
 </div>
 </div>
 </div>
 )}

 {step === 1 && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Cidade Sede</label>
 <Input
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="Ex: São Paulo"
 className="h-10 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Estado (UF)</label>
 <Input
 value={state}
 onChange={(e) => setState(e.target.value)}
 placeholder="Ex: SP"
 className="h-10 text-xs rounded-lg uppercase"
 maxLength={2}
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">País</label>
 <Input
 value={country}
 onChange={(e) => setCountry(e.target.value)}
 placeholder="Ex: Brasil, Estados Unidos, Portugal"
 className="h-10 text-xs rounded-lg"
 />
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Percent className="size-3 text-primary" />
 <span>Comissão Padrão do Fornecedor (%)</span>
 </label>
 <Input
 type="number"
 value={commissionRate}
 onChange={(e) => setCommissionRate(e.target.value)}
 placeholder="Ex: 10, 12, 15"
 className="h-10 text-xs rounded-lg font-mono"
 min="0"
 max="100"
 />
 <p className="text-[10px] text-muted-foreground">
 Percentual repassado para a agência nas vendas deste operador.
 </p>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Instruções Financeiras e Prazos</label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Faturamento quinzenal com vencimento todo dia 15 e 30. Pagamento via boleto com desconto de 1%..."
 rows={4}
 className="text-xs rounded-lg bg-muted/10 p-3"
 />
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Mail className="size-3 text-primary" />
 <span>E-mail de Plantão / Reservas</span>
 </label>
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="reservas@operadora.com.br"
 className="h-10 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground flex items-center gap-2">
 <Phone className="size-3 text-emerald-500" />
 <span>WhatsApp / Telefone 24h Emergencial</span>
 </label>
 <Input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="(11) 99999-9999"
 className="h-10 text-xs rounded-lg font-mono"
 />
 </div>
 </div>
 )}
 </div>

 <DialogFooter className="p-4 border-t border-border/70 bg-muted/10 flex items-center justify-between sm:justify-between">
 <Button
 type="button"
 variant="outline"
 disabled={step === 0}
 onClick={handleBack}
 className="rounded-lg text-xs"
 >
 <ChevronLeft className="size-3.5 mr-1" />
 Voltar
 </Button>

 {step < STEPS.length - 1 ? (
 <Button
 type="button"
 onClick={handleNext}
 className="rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-1"
 >
 Avançar
 <ChevronRight className="size-3.5" />
 </Button>
 ) : (
 <Button
 type="button"
 disabled={submitting}
 onClick={handleSubmit}
 className="rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-1 shadow-md px-5"
 >
 <Check className="size-3.5" />
 {submitting ? 'Salvando...' : 'Concluir Cadastro'}
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
