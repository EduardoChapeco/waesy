import React, { useState } from "react";
import { User, Building2, Phone, Mail, MapPin, Check, ChevronRight, ChevronLeft, Calendar, CreditCard, Tag, ShieldCheck, Loader2, FileText, DollarSign, HeartPulse, AlertTriangle, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createCustomer } from "@/services/crm.functions";
import { formatMoney } from "@/lib/money";
import { getUnifiedNicheSpec } from "@/lib/niches/niche-ssot";

const STEPS = ["Perfil", "Contato", "Endereço", "Saúde & Segmento", "Revisão"];

const CANAIS_AQUISICAO = [
 { value: "direct", label: "Direto / Balcão" },
 { value: "whatsapp", label: "WhatsApp" },
 { value: "indicacao", label: "Indicação de Cliente" },
 { value: "site", label: "Site / E-commerce" },
 { value: "instagram", label: "Instagram" },
 { value: "google", label: "Google / Busca" },
 { value: "parceria", label: "Parceria Comercial" },
 { value: "outros", label: "Outros Canais" },
];

const SUGGESTED_TAGS = [
 "VIP",
 "Corporativo",
 "Cliente Frequente",
 "Família",
 "Luxo",
 "Primeira Compra",
 "Excursão",
 "Passageiro Frequente",
 "Em Negociação",
];

export interface NewClientWizardProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
 teamMembers?: Array<{ id: string; fullName: string; role?: string }>;
 store?: any;
}

export function NewClientWizard({
 isOpen,
 onClose,
 onSuccess,
 teamMembers = [],
 store,
}: NewClientWizardProps) {
 const nicheSpec = getUnifiedNicheSpec(store);
 const [step, setStep] = useState(0);
 const [submitting, setSubmitting] = useState(false);
 const [loadingCep, setLoadingCep] = useState(false);

 // Form State
 const [kind, setKind] = useState<"individual" | "company">("individual");
 const [fullName, setFullName] = useState("");
 const [legalName, setLegalName] = useState("");
 const [document, setDocument] = useState("");
 const [rg, setRg] = useState("");
 const [birthDate, setBirthDate] = useState("");

 const [email, setEmail] = useState("");
 const [phone, setPhone] = useState("");
 const [assignedTo, setAssignedTo] = useState<string>("none");

 const [zipcode, setZipcode] = useState("");
 const [addressLine, setAddressLine] = useState("");
 const [city, setCity] = useState("");
 const [state, setState] = useState("");
 const [channel, setChannel] = useState("direct");
 const [creditLimitReais, setCreditLimitReais] = useState("");
 const [tags, setTags] = useState<string[]>([]);
 const [tagInput, setTagInput] = useState("");
 const [notes, setNotes] = useState("");

 // Belasis / Paridade Clínica, Saúde & Estética
 const [gender, setGender] = useState<string>("uninformed");
 const [occupation, setOccupation] = useState("");
 const [referralSource, setReferralSource] = useState("");
 const [emergencyContactName, setEmergencyContactName] = useState("");
 const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
 const [allergies, setAllergies] = useState("");
 const [healthNotes, setHealthNotes] = useState("");
 const [lgpdAccepted, setLgpdAccepted] = useState(true);

 // Helpers de Formatação
 const formatCpfCnpj = (val: string) => {
 const digits = val.replace(/\D/g, "");
 if (kind === "individual") {
 // CPF: 000.000.000-00
 if (digits.length <= 11) {
 return digits
 .replace(/(\d{3})(\d)/, "$1.$2")
 .replace(/(\d{3})(\d)/, "$1.$2")
 .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
 }
 } else {
 // CNPJ: 00.000.000/0000-00
 if (digits.length <= 14) {
 return digits
 .replace(/(\d{2})(\d)/, "$1.$2")
 .replace(/(\d{3})(\d)/, "$1.$2")
 .replace(/(\d{3})(\d)/, "$1/$2")
 .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
 }
 }
 return val;
 };

 const formatPhone = (val: string) => {
 const digits = val.replace(/\D/g, "");
 if (digits.length <= 11) {
 return digits
 .replace(/(\d{2})(\d)/, "($1) $2")
 .replace(/(\d{5})(\d{4})$/, "$1-$2");
 }
 return val;
 };

 const handleCepSearch = async (cep: string) => {
 const cleanCep = cep.replace(/\D/g, "");
 if (cleanCep.length === 8) {
 setLoadingCep(true);
 try {
 const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
 const data = await res.json();
 if (!data.erro) {
 setCity(data.localidade || "");
 setState(data.uf || "");
 if (data.logradouro) {
 setAddressLine(`${data.logradouro}${data.bairro ? `, ${data.bairro}` : ""}`);
 }
 toast.success("Endereço localizado via CEP!");
 }
 } catch {
 // Fallback silencioso
 } finally {
 setLoadingCep(false);
 }
 }
 };

 const handleNext = () => {
 if (step === 0) {
 if (!fullName.trim()) {
 toast.error(kind === "company" ? "Informe a Razão Social ou Nome da Empresa" : "Informe o Nome Completo do cliente");
 return;
 }
 }
 if (step === 1) {
 if (!email.trim() && !phone.trim()) {
 toast.error("Informe ao menos um meio de contato (E-mail ou Telefone/WhatsApp)");
 return;
 }
 }
 setStep((s) => Math.min(s + 1, STEPS.length - 1));
 };

 const handleBack = () => {
 setStep((s) => Math.max(s - 1, 0));
 };

 const handleAddTag = (t: string) => {
 const clean = t.trim();
 if (clean && !tags.includes(clean)) {
 setTags([...tags, clean]);
 }
 setTagInput("");
 };

 const handleRemoveTag = (t: string) => {
 setTags(tags.filter((x) => x !== t));
 };

 const handleSubmit = async () => {
 setSubmitting(true);
 try {
 const creditCents = creditLimitReais
 ? Math.round(parseFloat(creditLimitReais.replace(",", ".")) * 100)
 : 0;

 await createCustomer({
 data: {
 kind,
 fullName: fullName.trim(),
 legalName: kind === "company" ? legalName.trim() || fullName.trim() : null,
 document: document.trim() || null,
 rg: rg.trim() || null,
 email: email.trim() || null,
 phone: phone.trim() || null,
 birthDate: birthDate || null,
 status: "active",
 channel,
 city: city.trim() || null,
 state: state.trim() || null,
 zipcode: zipcode.trim() || null,
 addressLine: addressLine.trim() || null,
 creditLimitCents: isNaN(creditCents) ? 0 : creditCents,
 assignedTo: assignedTo === "none" ? null : assignedTo,
 preferredProfessionalId: assignedTo === "none" ? null : assignedTo,
 tags,
 notes: notes.trim() || null,
 gender: gender === "uninformed" ? null : gender,
 occupation: occupation.trim() || null,
 referralSource: referralSource.trim() || null,
 emergencyContactName: emergencyContactName.trim() || null,
 emergencyContactPhone: emergencyContactPhone.trim() || null,
 lgpdAccepted,
 allergies: allergies.trim() || null,
 healthNotes: healthNotes.trim() || null,
 nicheMetadata: {
   niche_id: nicheSpec.id,
   niche_label: nicheSpec.label,
   vertical_sku: store?.vertical_sku || nicheSpec.defaultVerticalSku,
 },
 },
 });

 toast.success("Cliente cadastrado com sucesso na Carteira!");
 onSuccess();
 onClose();
 } catch (err: any) {
 toast.error(err.message || "Erro ao criar cliente.");
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <Sheet open={isOpen} onOpenChange={onClose}>
 <SheetContent
  size="wide"
  className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl p-0 flex flex-col h-full bg-background overscroll-contain"
 >
 {/* Header com Stepper */}
 <SheetHeader className="p-6 pb-4 border-b border-border">
 <div className="flex items-center justify-between">
 <SheetTitle className="text-xl font-bold flex items-center gap-2">
 <User className="size-5 text-primary" />
 <span>Novo Cliente na Carteira</span>
 </SheetTitle>
 <Badge variant="outline" className="font-mono text-xs">
 Passo {step + 1} de {STEPS.length}
 </Badge>
 </div>
 <SheetDescription className="text-xs text-muted-foreground">
 Cadastro unificado e perene de clientes, passageiros e contas corporativas B2B.
 </SheetDescription>

 {/* Stepper Visual */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
 {STEPS.map((s, idx) => (
 <div
 key={s}
 className={`flex items-center gap-2 py-1 px-2 rounded-lg text-xs font-semibold transition-colors duration-200 ${
 idx === step
 ? "bg-primary text-primary-foreground shadow-xs"
 : idx < step
 ? "bg-primary/15 text-primary"
 : "bg-muted text-muted-foreground opacity-60"
 }`}
 >
 <div className="size-4 rounded-full flex items-center justify-center text-xs font-bold">
 {idx < step ? <Check className="size-3" /> : idx + 1}
 </div>
 <span className="truncate">{s}</span>
 </div>
 ))}
 </div>
 </SheetHeader>

 {/* Formulário com Rolagem */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
 {/* PASSO 0: PERFIL */}
 {step === 0 && (
 <div className="space-y-5 animate-in fade-in duration-200">
 {/* Seletor PF vs PJ */}
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setKind("individual")}
 className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors duration-200 cursor-pointer ${
 kind === "individual"
 ? "border-primary bg-primary/5 text-primary shadow-xs"
 : "border-border hover:border-primary/40 bg-card text-muted-foreground"
 } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
 >
 <User className="size-7 mb-2" />
 <span className="font-bold text-sm">Pessoa Física (B2C)</span>
 <span className="text-xs text-muted-foreground">Passageiro, cliente individual</span>
 </button>

 <button
 type="button"
 onClick={() => setKind("company")}
 className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors duration-200 cursor-pointer ${
 kind === "company"
 ? "border-primary bg-primary/5 text-primary shadow-xs"
 : "border-border hover:border-primary/40 bg-card text-muted-foreground"
 } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
 >
 <Building2 className="size-7 mb-2" />
 <span className="font-bold text-sm">Empresa (PJ / B2B)</span>
 <span className="text-xs text-muted-foreground">Conta corporativa, agência parceira</span>
 </button>
 </div>

 {/* Campos Principais */}
 <div className="space-y-4">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">
 {kind === "company" ? "Nome Fantasia ou Apelido da Empresa *" : "Nome Completo *"}
 </Label>
 <Input
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder={kind === "company" ? "Ex: Tech Solutions Brasil" : "Ex: Mariana Silva Ramos"}
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 {kind === "company" && (
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Razão Social Oficial</Label>
 <Input
 value={legalName}
 onChange={(e) => setLegalName(e.target.value)}
 placeholder="Ex: Tech Solutions Serviços de Informática LTDA"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>
 )}

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">
 {kind === "company" ? "CNPJ" : "CPF"}
 </Label>
 <Input
 value={document}
 onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
 placeholder={kind === "company" ? "00.000.000/0000-00" : "000.000.000-00"}
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">
 {kind === "company" ? "Inscrição Estadual" : "RG / Órgão Emissor"}
 </Label>
 <Input
 value={rg}
 onChange={(e) => setRg(e.target.value)}
 placeholder={kind === "company" ? "Isento ou Nº" : "Ex: 4.888.777 SSP/SC"}
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">
 {kind === "company" ? "Data de Fundação" : "Data de Nascimento"}
 </Label>
 <Input
 type="date"
 value={birthDate}
 onChange={(e) => setBirthDate(e.target.value)}
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 {kind === "individual" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Gênero / Identidade</Label>
 <Select value={gender} onValueChange={setGender}>
 <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
 <SelectValue placeholder="Selecione..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="female">Feminino</SelectItem>
 <SelectItem value="male">Masculino</SelectItem>
 <SelectItem value="non_binary">Não-binário / Outro</SelectItem>
 <SelectItem value="uninformed">Prefere não informar</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Profissão / Ocupação</Label>
 <Input
 value={occupation}
 onChange={(e) => setOccupation(e.target.value)}
 placeholder="Ex: Arquiteta, Advogado, Autônomo..."
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* PASSO 1: CONTATO & RESPONSÁVEL */}
 {step === 1 && (
 <div className="space-y-5 animate-in fade-in duration-200">
 <div className="space-y-4">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Phone className="size-3.5 text-primary" />
 Telefone Principal / WhatsApp
 </Label>
 <Input
 value={phone}
 onChange={(e) => setPhone(formatPhone(e.target.value))}
 placeholder="(49) 99999-9999"
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 <span className="text-xs text-muted-foreground">
 Utilizado para envio de orçamentos, itinerários e contratos com 1-clique.
 </span>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Mail className="size-3.5 text-primary" />
 E-mail de Contato
 </Label>
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="cliente@exemplo.com.br"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <User className="size-3.5 text-primary" />
 Consultor / Vendedor Responsável (Conta Carteirizada)
 </Label>
 <Select value={assignedTo} onValueChange={setAssignedTo}>
 <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
 <SelectValue placeholder="Selecione um responsável..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Nenhum (Carteira Geral da Agência)</SelectItem>
 {teamMembers.map((m) => (
 <SelectItem key={m.id} value={m.id}>
 {m.fullName} {m.role ? `(${m.role})` : ""}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <span className="text-xs text-muted-foreground">
 O consultor responsável receberá notificações prioritárias sobre este cliente.
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <HeartPulse className="size-3.5 text-primary" />
 Contato de Emergência (Nome)
 </Label>
 <Input
 value={emergencyContactName}
 onChange={(e) => setEmergencyContactName(e.target.value)}
 placeholder="Ex: Cônjuge, Mãe ou Irmão"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Telefone de Emergência</Label>
 <Input
 value={emergencyContactPhone}
 onChange={(e) => setEmergencyContactPhone(formatPhone(e.target.value))}
 placeholder="(49) 99999-9999"
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Users className="size-3.5 text-primary" />
 Indicado Por (Referral / Member-Get-Member)
 </Label>
 <Input
 value={referralSource}
 onChange={(e) => setReferralSource(e.target.value)}
 placeholder="Ex: Indicado pelo cliente João Silva ou Campanha"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>
 </div>
 </div>
 )}

 {/* PASSO 2: ENDEREÇO & CRÉDITO */}
 {step === 2 && (
 <div className="space-y-5 animate-in fade-in duration-200">
 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
 <MapPin className="size-3 text-primary" />
 CEP
 </Label>
 <div className="relative">
 <Input
 value={zipcode}
 onChange={(e) => {
 const val = e.target.value;
 setZipcode(val);
 handleCepSearch(val);
 }}
 placeholder="89900-000"
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 {loadingCep && (
 <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none absolute right-3 top-3 text-primary" />
 )}
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Cidade</Label>
 <Input
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="São Miguel do Oeste"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Estado (UF)</Label>
 <Input
 value={state}
 onChange={(e) => setState(e.target.value.toUpperCase())}
 placeholder="SC"
 maxLength={2}
 className="h-10 rounded-lg text-xs bg-background uppercase text-center"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Logradouro / Bairro / Complemento</Label>
 <Input
 value={addressLine}
 onChange={(e) => setAddressLine(e.target.value)}
 placeholder="Ex: Rua Almirante Barroso, 450, Apto 201 - Centro"
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 <div className="space-y-3 pt-2 border-t border-border">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Canal de Origem / Aquisição</Label>
 <Select value={channel} onValueChange={setChannel}>
 <SelectTrigger className="h-10 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANAIS_AQUISICAO.map((c) => (
 <SelectItem key={c.value} value={c.value}>
 {c.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
 <DollarSign className="size-3 text-primary" />
 Limite de Crédito em Loja (R$)
 </Label>
 <Input
 value={creditLimitReais}
 onChange={(e) => setCreditLimitReais(e.target.value)}
 placeholder="0,00"
 className="h-10 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* PASSO 3: ANAMNESE, FICHA DO NICHO & SEGMENTO */}
 {step === 3 && (
 <div className="space-y-5 animate-in fade-in duration-200">
 <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
 <div className="flex items-center gap-2 text-xs font-bold text-primary">
 <HeartPulse className="size-4" />
 <span>
   {nicheSpec.id === "automotive"
     ? "Perfil Técnico, Frota & Observações"
     : `Ficha & Alertas de Atendimento — ${nicheSpec.shortLabel}`}
 </span>
 </div>
 <p className="text-xs text-muted-foreground">
   {nicheSpec.id === "automotive"
     ? "Registre observações de veículo, histórico de manutenção e preferências do condutor."
     : "Cadastre restrições clínicas, alergias e observações para alertar a equipe nos atendimentos."}
 </p>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <AlertTriangle className="size-3.5 text-warning" />
 Alergias & Restrições Clínicas / Químicas
 </Label>
 <Input
 value={allergies}
 onChange={(e) => setAllergies(e.target.value)}
 placeholder="Ex: Alergia a amônia, esmaltes, látex, frutos do mar, iodo..."
 className="h-10 rounded-lg text-xs bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Histórico Clínico & Cuidados Especiais</Label>
 <Textarea
 value={healthNotes}
 onChange={(e) => setHealthNotes(e.target.value)}
 placeholder="Ex: Gestante (2º trimestre), hipertensa, pele com sensibilidade, histórico de queloide..."
 className="h-20 rounded-lg text-xs bg-background resize-none"
 />
 </div>

 <div className="space-y-2 pt-2 border-t border-border">
 <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
 <Tag className="size-3 text-primary" />
 Tags de Segmentação
 </Label>
 <div className="flex gap-2">
 <Input
 value={tagInput}
 onChange={(e) => setTagInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleAddTag(tagInput);
 }
 }}
 placeholder="Adicione uma tag e pressione Enter..."
 className="h-9 rounded-lg text-xs bg-background"
 />
 <Button
 type="button"
 size="sm"
 onClick={() => handleAddTag(tagInput)}
 className="h-9 rounded-lg text-xs min-h-11 sm:min-h-0"
 >
 Adicionar
 </Button>
 </div>

 {tags.length > 0 && (
 <div className="flex flex-wrap gap-2 pt-1">
 {tags.map((t) => (
 <Badge
 key={t}
 variant="secondary"
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 handleRemoveTag(t);
 }
 }}
 className="text-xs font-semibold px-3 py-1 rounded-lg gap-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 onClick={() => handleRemoveTag(t)}
 >
 <span>{t}</span>
 <span className="text-xs opacity-60">×</span>
 </Badge>
 ))}
 </div>
 )}

 <div className="flex flex-wrap gap-1 pt-1">
 {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((st) => (
 <button
 key={st}
 type="button"
 onClick={() => handleAddTag(st)}
 className="text-xs px-2 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 + {st}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-2 pt-1">
 <Label className="text-xs font-semibold text-foreground">Observações Internas da Agência / Salão</Label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Preferências de horário, bebidas favoritas, tom de voz, particularidades..."
 className="h-20 rounded-lg text-xs bg-background resize-none"
 />
 </div>

 <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
 <input
 type="checkbox"
 checked={lgpdAccepted}
 onChange={(e) => setLgpdAccepted(e.target.checked)}
 className="size-4 mt-1 rounded text-primary focus:ring-primary"
 />
 <div className="text-xs">
 <span className="font-semibold text-foreground">Consentimento LGPD & Notificações Automatizadas</span>
 <p className="text-muted-foreground">
 Cliente expressa concordância para recebimento de lembretes de agendamento, orçamentos e avisos transacionais via WhatsApp/E-mail.
 </p>
 </div>
 </label>
 </div>
 )}

 {/* PASSO 4: REVISÃO & CONFIRMAÇÃO */}
 {step === 4 && (

 <div className="space-y-4 animate-in fade-in duration-200">
 <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
 <div className="flex items-center gap-3">
 <div className="size-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base ">
 {fullName[0]?.toUpperCase() || "C"}
 </div>
 <div>
 <h3 className="font-bold text-base text-foreground">{fullName}</h3>
 {legalName && (
 <p className="text-xs text-muted-foreground font-mono">{legalName}</p>
 )}
 <Badge variant="outline" className="mt-1 text-xs font-bold uppercase">
 {kind === "company" ? "Empresa (B2B)" : "Pessoa Física (B2C)"}
 </Badge>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/15 text-xs">
 <div>
 <span className="text-muted-foreground text-xs block">Documento</span>
 <span className="font-semibold text-foreground font-mono">
 {document || "Não informado"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground text-xs block">Contato</span>
 <span className="font-semibold text-foreground font-mono">
 {phone || email || "Não informado"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground text-xs block">Localização</span>
 <span className="font-semibold text-foreground">
 {city ? `${city} - ${state || "UF"}` : "Não informada"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground text-xs block">Canal de Aquisição</span>
 <span className="font-semibold text-foreground capitalize">
 {CANAIS_AQUISICAO.find((c) => c.value === channel)?.label || channel}
 </span>
 </div>
 </div>

 {tags.length > 0 && (
 <div className="pt-2 border-t border-primary/15">
 <span className="text-muted-foreground text-xs block mb-1">Tags</span>
 <div className="flex flex-wrap gap-1">
 {tags.map((t) => (
 <Badge key={t} variant="secondary" className="text-xs">
 {t}
 </Badge>
 ))}
 </div>
 </div>
 )}

 {(allergies || healthNotes) && (
 <div className="p-3 rounded-lg border border-warning/30 bg-warning/10 text-xs space-y-1">
 <div className="flex items-center gap-2 font-bold text-warning-strong">
 <AlertTriangle className="size-3.5" />
 <span>
   {nicheSpec.id === "automotive"
     ? "Observações Técnicas & Veículo"
     : "Alertas Clínicos & Anamnese"}
 </span>
 </div>
 {allergies && <p className="text-foreground font-medium">{nicheSpec.id === "automotive" ? "Observação:" : "Alergias:"} {allergies}</p>}
 {healthNotes && <p className="text-muted-foreground">{healthNotes}</p>}
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Footer com Botões de Navegação */}
 <div className="p-4 border-t border-border flex items-center justify-between bg-card/50">
 <Button
 type="button"
 variant="ghost"
 onClick={step === 0 ? onClose : handleBack}
 className="text-xs font-semibold"
 >
 {step === 0 ? "Cancelar" : "← Voltar"}
 </Button>

 {step < STEPS.length - 1 ? (
 <Button
 type="button"
 onClick={handleNext}
 className="text-xs font-bold gap-2 px-5 h-9 rounded-lg min-h-11 sm:min-h-0"
 >
 <span>Avançar</span>
 <ChevronRight className="size-3.5" />
 </Button>
 ) : (
 <Button
 type="button"
 disabled={submitting}
 onClick={handleSubmit}
 className="text-xs font-bold gap-2 px-6 h-9 rounded-lg bg-primary text-primary-foreground  min-h-11 sm:min-h-0"
 >
 {submitting ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Check className="size-3.5" />}
 <span>Salvar Cliente na Carteira</span>
 </Button>
 )}
 </div>
 </SheetContent>
 </Sheet>
 );
}
