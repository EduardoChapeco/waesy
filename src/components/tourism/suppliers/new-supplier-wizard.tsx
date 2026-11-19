import React, { useEffect, useState } from 'react';
import { Building2, X, ChevronRight, ChevronLeft, Check, Percent, Phone, Mail, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SUPPLIER_KIND_LABELS, type SupplierKind, type TravelSupplierDTO } from '@/types/travel-suppliers';
import { createTravelSupplier, updateTravelSupplier } from '@/services/travel-suppliers.functions';

interface NewSupplierWizardProps {
 isOpen: boolean;
 onClose: () => void;
 onCreated?: () => void;
 storeId?: string;
 initialSupplier?: TravelSupplierDTO | null;
}

const STEPS = ['Identidade B2B', 'Localização', 'Comercial & Markups', 'Contatos & SLA'];

export function NewSupplierWizard({ isOpen, onClose, onCreated, storeId, initialSupplier }: NewSupplierWizardProps) {
 const isEditing = Boolean(initialSupplier?.id);
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
 const [maxCardInstallments, setMaxCardInstallments] = useState('12');
 const [maxBoletoInstallments, setMaxBoletoInstallments] = useState('12');
 const [cardInterestFree, setCardInterestFree] = useState(true);
 const [boletoRequiresDownpayment, setBoletoRequiresDownpayment] = useState(false);
 const [boletoDownpaymentPct, setBoletoDownpaymentPct] = useState('0');
 const [pixDiscountPct, setPixDiscountPct] = useState('0');
 const [allowedMethods, setAllowedMethods] = useState<string[]>(['pix', 'credit_card', 'boleto']);
 const [paymentTermsTemplate, setPaymentTermsTemplate] = useState('');
 const [notes, setNotes] = useState('');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');

 useEffect(() => {
   if (!isOpen) return;
   setStep(0);
   if (initialSupplier) {
     setName(initialSupplier.name || '');
     setLegalName(initialSupplier.legal_name || '');
     setKind(initialSupplier.kind || 'operator');
     setDocument(initialSupplier.document || '');
     setCity(initialSupplier.city || '');
     setState(initialSupplier.state || '');
     setCountry(initialSupplier.country || 'Brasil');
     setCommissionRate(String(initialSupplier.commission_rate ?? 10));
     setMaxCardInstallments(String(initialSupplier.max_card_installments ?? 12));
     setMaxBoletoInstallments(String(initialSupplier.max_boleto_installments ?? 12));
     setCardInterestFree(initialSupplier.card_interest_free ?? true);
     setBoletoRequiresDownpayment(Boolean(initialSupplier.boleto_requires_downpayment));
     setBoletoDownpaymentPct(String(initialSupplier.boleto_downpayment_pct ?? 0));
     setPixDiscountPct(String(initialSupplier.pix_discount_pct ?? 0));
     setAllowedMethods(
       Array.isArray(initialSupplier.allowed_payment_methods) && initialSupplier.allowed_payment_methods.length > 0
         ? initialSupplier.allowed_payment_methods
         : ['pix', 'credit_card', 'boleto']
     );
     setPaymentTermsTemplate(initialSupplier.payment_terms_template || '');
     setNotes(initialSupplier.notes || '');
     setEmail(initialSupplier.email || '');
     setPhone(initialSupplier.phone || '');
   } else {
     setName('');
     setLegalName('');
     setKind('operator');
     setDocument('');
     setCity('');
     setState('');
     setCountry('Brasil');
     setCommissionRate('10');
     setMaxCardInstallments('12');
     setMaxBoletoInstallments('12');
     setCardInterestFree(true);
     setBoletoRequiresDownpayment(false);
     setBoletoDownpaymentPct('0');
     setPixDiscountPct('0');
     setAllowedMethods(['pix', 'credit_card', 'boleto']);
     setPaymentTermsTemplate('');
     setNotes('');
     setEmail('');
     setPhone('');
   }
 }, [isOpen, initialSupplier]);

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
 const clampInst = (val: string) => Math.min(36, Math.max(1, Math.floor(Number(val) || 12)));
 const payload = {
   name: name.trim(),
   legal_name: legalName.trim() || null,
   kind,
   document: document.trim() || null,
   commission_rate: parseFloat(commissionRate) || 0,
   max_card_installments: clampInst(maxCardInstallments),
   max_boleto_installments: clampInst(maxBoletoInstallments),
   card_interest_free: cardInterestFree,
   boleto_requires_downpayment: boletoRequiresDownpayment,
   boleto_downpayment_pct: Math.min(100, Math.max(0, parseFloat(boletoDownpaymentPct) || 0)),
   pix_discount_pct: Math.min(100, Math.max(0, parseFloat(pixDiscountPct) || 0)),
   allowed_payment_methods: allowedMethods.length > 0 ? allowedMethods : ['pix', 'credit_card', 'boleto'],
   payment_terms_template: paymentTermsTemplate.trim() || null,
   notes: notes.trim() || null,
   email: email.trim() || null,
   phone: phone.trim() || null,
   city: city.trim() || null,
   state: state.trim() || null,
   country: country.trim() || 'Brasil',
 };

 if (isEditing && initialSupplier?.id) {
   await updateTravelSupplier({
     data: {
       id: initialSupplier.id,
       patch: payload,
     },
   });
   toast.success('Fornecedor atualizado com sucesso!');
 } else {
   await createTravelSupplier({
     data: {
       store_id: storeId,
       ...payload,
     },
   });
   toast.success('Fornecedor cadastrado com sucesso!');
 }
 if (onCreated) onCreated();
 onClose();
 } catch (err: any) {
 toast.error(err?.message || 'Erro ao salvar fornecedor');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-lg bg-card border border-border shadow-overlay">
 <DialogHeader className="p-5 border-b border-border/70 bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10 text-primary">
 <Building2 className="size-4" />
 </div>
 <div>
 <DialogTitle className="text-sm font-bold text-foreground">
 {isEditing ? 'Editar Fornecedor / Operadora' : 'Cadastrar Novo Fornecedor / Operadora'}
 </DialogTitle>
 <p className="text-2xs text-muted-foreground">
 Passo {step + 1} de {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong>
 </p>
 </div>
 </div>
 </DialogHeader>

 <div className="p-5 space-y-4 max-h-vh-65 overflow-y-auto no-scrollbar">
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
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground flex items-center gap-1">
 <Percent className="size-3 text-primary" />
 <span>Comissão Padrão (%)</span>
 </label>
 <Input
 type="number"
 value={commissionRate}
 onChange={(e) => setCommissionRate(e.target.value)}
 placeholder="Ex: 10, 12, 15"
 className="h-11 text-xs rounded-lg font-mono"
 min="0"
 max="100"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Desconto Pix (%)</label>
 <Input
 type="number"
 value={pixDiscountPct}
 onChange={(e) => setPixDiscountPct(e.target.value)}
 placeholder="Ex: 5"
 className="h-11 text-xs rounded-lg font-mono"
 min="0"
 max="100"
 />
 </div>
 </div>

 <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-3">
 <div className="text-xs font-bold text-foreground">Política de Parcelamento (Sincronizada com Cotações &amp; Propostas)</div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-muted-foreground">Máx. Parcelas Cartão (até 36x)</label>
 <Input
 type="number"
 value={maxCardInstallments}
 onChange={(e) => setMaxCardInstallments(e.target.value)}
 className="h-11 text-xs rounded-lg font-mono"
 min="1"
 max="36"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-semibold text-muted-foreground">Máx. Parcelas Boleto (até 36x)</label>
 <Input
 type="number"
 value={maxBoletoInstallments}
 onChange={(e) => setMaxBoletoInstallments(e.target.value)}
 className="h-11 text-xs rounded-lg font-mono"
 min="1"
 max="36"
 />
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 {[
   { id: 'pix', label: 'Pix' },
   { id: 'credit_card', label: 'Cartão' },
   { id: 'boleto', label: 'Boleto' },
   { id: 'financiamento_bancario', label: 'Financiamento' },
 ].map((m) => {
   const active = allowedMethods.includes(m.id);
   return (
     <Button
       key={m.id}
       type="button"
       variant={active ? 'default' : 'outline'}
       onClick={() =>
         setAllowedMethods((prev) =>
           prev.includes(m.id) ? (prev.length > 1 ? prev.filter((x) => x !== m.id) : prev) : [...prev, m.id]
         )
       }
       className="h-11 px-3 text-xs rounded-lg"
     >
       {m.label}
     </Button>
   );
 })}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer min-h-11">
 <input
 type="checkbox"
 checked={cardInterestFree}
 onChange={(e) => setCardInterestFree(e.target.checked)}
 className="size-4 rounded border-border accent-primary"
 />
 <span>Cartão sem juros</span>
 </label>

 <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer min-h-11">
 <input
 type="checkbox"
 checked={boletoRequiresDownpayment}
 onChange={(e) => setBoletoRequiresDownpayment(e.target.checked)}
 className="size-4 rounded border-border accent-primary"
 />
 <span>Boleto exige entrada</span>
 </label>
 </div>

 {boletoRequiresDownpayment && (
 <div className="space-y-1">
 <label className="text-xs font-semibold text-muted-foreground">Entrada mínima no Boleto (%)</label>
 <Input
 type="number"
 value={boletoDownpaymentPct}
 onChange={(e) => setBoletoDownpaymentPct(e.target.value)}
 className="h-11 text-xs rounded-lg font-mono"
 min="0"
 max="100"
 />
 </div>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Texto Padrão de Condições de Pagamento</label>
 <Input
 value={paymentTermsTemplate}
 onChange={(e) => setPaymentTermsTemplate(e.target.value)}
 placeholder="Ex: Em até 16x sem juros no cartão ou 5% OFF no Pix"
 className="h-11 text-xs rounded-lg"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-foreground">Instruções Financeiras e Prazos</label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Faturamento quinzenal com vencimento todo dia 15 e 30..."
 rows={3}
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
 className="rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-1  px-5"
 >
 <Check className="size-3.5" />
 {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Concluir Cadastro'}
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
