import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
 Scale,
 ShieldCheck,
 User,
 UserPlus,
 Users,
 Compass,
 DollarSign,
 FileText,
 Check,
 Plus,
 Trash2,
 ChevronRight,
 ChevronDown,
 Loader2,
 Calendar,
 FileSpreadsheet,
 Link2,
} from "lucide-react";
import { listCustomers, createCustomer } from "@/services/crm.functions";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import {
 createTravelContract,
 CANONICAL_TOURISM_CLAUSES,
 type ContractClauseDTO,
} from "@/services/travel-contract.functions";
import { formatMoney } from "@/lib/money";

interface NewTravelContractSheetProps {
  isOpen?: boolean;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (contractId: string) => void;
  onSuccess?: (options?: any) => Promise<any> | void;
  storeId?: string;
}

export function NewTravelContractSheet({
  isOpen,
  open,
  onOpenChange,
  onCreated,
  onSuccess,
}: NewTravelContractSheetProps) {
  const effectiveOpen = open !== undefined ? open : (isOpen ?? false);
  const queryClient = useQueryClient();

 // Modo ativo: 'proposal' | 'crm' | 'manual'
 const [activeTab, setActiveTab] = useState<"proposal" | "crm" | "manual">("proposal");

 // Dados do Contrato
 const [contractTitle, setContractTitle] = useState("");
 const [destination, setDestination] = useState("");
 const [travelStartDate, setTravelStartDate] = useState("");
 const [travelEndDate, setTravelEndDate] = useState("");
 const [packageSummary, setPackageSummary] = useState("");
 const [totalValueFormatted, setTotalValueFormatted] = useState("R$ 0,00");
 const [totalValueCents, setTotalValueCents] = useState<number>(0);
 const [paymentConditions, setPaymentConditions] = useState(
 "À vista via PIX (5% de desconto) ou em até 10x sem juros no cartão de crédito."
 );

 // Proposta vinculada
 const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

 // Dados do Contratante
 const [customerId, setCustomerId] = useState<string | null>(null);
 const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
 const [customerSearch, setCustomerSearch] = useState("");
 const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
 const [clientName, setClientName] = useState("");
 const [clientDocument, setClientDocument] = useState("");
 const [clientRg, setClientRg] = useState("");
 const [clientPhone, setClientPhone] = useState("");
 const [clientEmail, setClientEmail] = useState("");
 const [clientAddress, setClientAddress] = useState("");

 // Criação rápida de cliente no CRM
 const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
 const [quickFullName, setQuickFullName] = useState("");
 const [quickPhone, setQuickPhone] = useState("");
 const [quickEmail, setQuickEmail] = useState("");
 const [quickDocument, setQuickDocument] = useState("");
 const [quickAddress, setQuickAddress] = useState("");

 // Passageiros Acompanhantes
 const [passengers, setPassengers] = useState<Array<{ name: string; document: string; birthDate?: string }>>([]);

 // Cláusulas e Acordeão
 const [showClauses, setShowClauses] = useState(false);
 const [customClauses, setCustomClauses] = useState<ContractClauseDTO[]>([]);
 const [newClauseSection, setNewClauseSection] = useState("");
 const [newClauseText, setNewClauseText] = useState("");
 const [isAddingClause, setIsAddingClause] = useState(false);

 // Submissão
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Query de propostas de viagem da agência
 const { data: agencyProposals = [], isLoading: isLoadingProposals } = useQuery({
 queryKey: ["agency-proposals-for-contracts"],
 queryFn: () => listAgencyTravelProposals(),
 staleTime: 30_000,
 });

 // Query de clientes do CRM
 const { data: crmCustomers = [], isLoading: isLoadingCustomers } = useQuery({
 queryKey: ["crm-customers-search-contracts", customerSearch],
 queryFn: () => listCustomers({ data: { query: customerSearch.trim() } }),
 enabled: customerSearch.trim().length >= 1,
 staleTime: 30_000,
 });

 // Mutação para criar cliente rápido
 const quickCreateMutation = useMutation({
 mutationFn: (newCustomer: any) => createCustomer({ data: newCustomer }),
 onSuccess: (res: any) => {
 toast.success("Cliente cadastrado no CRM com sucesso!");
 setCustomerId(res.id);
 setSelectedCustomer({
 id: res.id,
 fullName: quickFullName,
 phone: quickPhone,
 email: quickEmail,
 document: quickDocument,
 });
 setClientName(quickFullName);
 setClientPhone(quickPhone);
 setClientEmail(quickEmail);
 setClientDocument(quickDocument);
 setClientAddress(quickAddress);
 setIsQuickCreateOpen(false);
 setQuickFullName("");
 setQuickPhone("");
 setQuickEmail("");
 setQuickDocument("");
 setQuickAddress("");
 queryClient.invalidateQueries({ queryKey: ["crm-customers-search-contracts"] });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao cadastrar cliente.");
 },
 });

 // Manipulador de Formatação de Dinheiro (Reais)
 const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const rawValue = e.target.value.replace(/\D/g, "");
 const cents = parseInt(rawValue || "0", 10);
 setTotalValueCents(cents);
 setTotalValueFormatted(formatMoney(cents));
 };

 // Importar de Proposta
 const handleSelectProposal = (prop: any) => {
 setSelectedProposalId(prop.id);
 setContractTitle(`Contrato de Viagem — ${prop.title || prop.destination_city}`);
 setDestination(prop.destination_city || "");
 setClientName(prop.client_name || "");
 setClientPhone(prop.client_whatsapp || "");
 setClientEmail(prop.client_email || "");

 if (prop.travel_start_date) setTravelStartDate(prop.travel_start_date);
 if (prop.travel_end_date) setTravelEndDate(prop.travel_end_date);

 // Resumo dos serviços a partir dos itens da proposta
 const flights = Array.isArray(prop.flights) && prop.flights.length > 0
 ? `Aéreo: ${prop.flights.map((f: any) => `${f.airline_name || "Cia"} (${f.origin_iata || ""} ➔ ${f.destination_iata || ""})`).join(", ")}.`
 : "";
 const hotels = Array.isArray(prop.hotels) && prop.hotels.length > 0
 ? `Hospedagem: ${prop.hotels.map((h: any) => `${h.hotel_name} (${h.room_type || ""})`).join(", ")}.`
 : "";
 const includes = Array.isArray(prop.includes) && prop.includes.length > 0
 ? `Inclusos: ${prop.includes.join(", ")}.`
 : "";

 const fullSummary = [
 `Destino: ${prop.destination_city || ""}.`,
 flights,
 hotels,
 includes,
 ]
 .filter(Boolean)
 .join(" ");

 setPackageSummary(fullSummary || `Prestação de serviços turísticos para ${prop.destination_city}.`);

 const totalCents = prop.pricing?.total_price_cents || 0;
 setTotalValueCents(totalCents);
 setTotalValueFormatted(formatMoney(totalCents));

 toast.success(`Dados da proposta "${prop.title}" importados!`);
 setActiveTab("manual");
 };

 // Selecionar do CRM
 const handleSelectCustomer = (c: any) => {
 setCustomerId(c.id);
 setSelectedCustomer(c);
 setClientName(c.fullName || c.name || c.full_name || "");
 setClientPhone(c.phone || "");
 setClientEmail(c.email || "");
 setClientDocument(c.document || c.taxId || "");
 if (c.city || c.addressLine) {
 setClientAddress([c.addressLine, c.city, c.state].filter(Boolean).join(" - "));
 }
 setIsCustomerDropdownOpen(false);
 setCustomerSearch("");
 toast.success(`Cliente ${c.fullName || c.name} vinculado!`);
 };

 const handleUnlinkCustomer = () => {
 setCustomerId(null);
 setSelectedCustomer(null);
 toast.info("Cliente desvinculado. Dados mantidos no formulário.");
 };

 // Presets de Condições de Pagamento
 const applyPaymentPreset = (text: string) => {
 setPaymentConditions(text);
 toast.success("Condição de pagamento aplicada!");
 };

 // Gerenciamento de Passageiros
 const handleAddPassenger = () => {
 setPassengers([...passengers, { name: "", document: "" }]);
 };

 const handleUpdatePassenger = (index: number, field: string, value: string) => {
 const next = [...passengers];
 next[index] = { ...next[index], [field]: value };
 setPassengers(next);
 };

 const handleRemovePassenger = (index: number) => {
 setPassengers(passengers.filter((_, i) => i !== index));
 };

 // Cálculo de Noites
 const nightsCount =
 travelStartDate && travelEndDate
 ? Math.max(
 1,
 Math.round(
 (new Date(travelEndDate).getTime() - new Date(travelStartDate).getTime()) /
 86400000
 )
 )
 : null;

 // Submissão do Contrato
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!clientName.trim() || !clientDocument.trim() || !clientPhone.trim()) {
 toast.error("Preencha nome completo, CPF e telefone do contratante.");
 return;
 }
 if (!destination.trim() || !packageSummary.trim()) {
 toast.error("Informe o destino e o resumo dos serviços contratados.");
 return;
 }
 if (totalValueCents <= 0) {
 toast.error("Informe o valor total do contrato.");
 return;
 }

 setIsSubmitting(true);
 try {
 const title =
 contractTitle.trim() ||
 `Contrato de Prestação de Serviços Turísticos — ${destination.trim()}`;

 const validPassengers = passengers
 .filter((p) => p.name.trim().length > 0)
 .map((p) => ({
 name: p.name.trim(),
 document: p.document.trim() || undefined,
 }));

 const payload = {
 proposalId: selectedProposalId || undefined,
 contractTitle: title,
 clientName: clientName.trim(),
 clientDocument: clientDocument.trim(),
 clientEmail: clientEmail.trim() || undefined,
 clientPhone: clientPhone.trim(),
 clientAddress: clientAddress.trim() || undefined,
 destination: destination.trim(),
 travelStartDate: travelStartDate || undefined,
 travelEndDate: travelEndDate || undefined,
 packageSummary: packageSummary.trim(),
 totalValueCents,
 paymentConditions: paymentConditions.trim(),
 passengers: validPassengers,
 customClauses: customClauses.length > 0 ? customClauses : undefined,
 };

 const res = await createTravelContract({ data: payload });

 toast.success("Contrato emitido e minuta jurídica gerada com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["agency-contracts"] });
 onOpenChange(false);

 if (onCreated) {
 onCreated(res.id);
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao emitir o contrato.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Sheet open={effectiveOpen} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border shadow-2xl"
 >
 {/* Header Premium do Contrato */}
 <SheetHeader className="p-6 pb-4 border-b border-border/70 bg-muted/20">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
 <Scale className="size-5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <span>Emitir Contrato Turístico & Assinatura</span>
 <Badge
 variant="outline"
 className="text-[10px] uppercase tracking-wider font-extrabold border-emerald-500/30 text-emerald-700 bg-emerald-500/10"
 >
 Validade Jurídica
 </Badge>
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Minuta com validade civil (MP 2.200-2/2001), conformidade Cadastur e link de assinatura digital.
 </SheetDescription>
 </div>
 </div>
 </div>

 {/* Abas de Modo */}
 <div className="pt-3">
 <Tabs
 value={activeTab}
 onValueChange={(v) => setActiveTab(v as any)}
 className="w-full"
 >
 <TabsList className="grid grid-cols-3 h-9 rounded-xl bg-muted/70 p-1 text-xs">
 <TabsTrigger
 value="proposal"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <FileSpreadsheet className="mr-1.5 size-3.5 text-primary" />
 Importar Proposta
 </TabsTrigger>
 <TabsTrigger
 value="crm"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <User className="mr-1.5 size-3.5" />
 Buscar no CRM
 </TabsTrigger>
 <TabsTrigger
 value="manual"
 className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
 >
 <FileText className="mr-1.5 size-3.5" />
 Contrato Sob Medida
 </TabsTrigger>
 </TabsList>
 </Tabs>
 </div>
 </SheetHeader>

 {/* Corpo do Sheet */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 text-xs">
 {/* ABA 1: IMPORTAR DE PROPOSTA DO STUDIO */}
 {activeTab === "proposal" && (
 <div className="space-y-4">
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-1">
 <p className="font-bold text-foreground">Importar Proposta Aprovada do Studio</p>
 <p className="text-muted-foreground text-[11px]">
 Selecione uma proposta já apresentada ao cliente. O contrato será preenchido automaticamente com destino, passageiros, itinerário e preço.
 </p>
 </div>

 {isLoadingProposals ? (
 <div className="py-12 text-center text-muted-foreground">
 <Loader2 className="size-6 animate-spin mx-auto mb-2" />
 <p>Carregando propostas da agência...</p>
 </div>
 ) : agencyProposals.length === 0 ? (
 <div className="p-8 text-center bg-card rounded-2xl border border-border/60 space-y-2">
 <FileText className="size-8 text-muted-foreground mx-auto" />
 <p className="font-bold text-foreground">Nenhuma proposta encontrada</p>
 <p className="text-muted-foreground text-[11px]">
 Crie uma proposta no Studio primeiro ou use o modo "Contrato Sob Medida".
 </p>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setActiveTab("manual")}
 className="mt-2 text-xs"
 >
 Ir para Preenchimento Sob Medida →
 </Button>
 </div>
 ) : (
 <div className="space-y-2.5">
 {agencyProposals.map((prop: any) => {
 const price = prop.pricing?.total_price_cents || 0;
 return (
 <div
 key={prop.id}
 onClick={() => handleSelectProposal(prop)}
 className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs"
 >
 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
 {prop.title || prop.destination_city}
 </span>
 <Badge
 variant="outline"
 className={`text-[9px] uppercase font-bold ${
 prop.status === "approved"
 ? "bg-emerald-50 text-emerald-700 border-emerald-300"
 : ""
 }`}
 >
 {prop.status === "approved" ? "✓ Aprovada" : prop.status}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground truncate">
 Passageiro: {prop.client_name} • Destino: {prop.destination_city}
 </p>
 </div>

 <div className="text-right shrink-0">
 <p className="font-mono font-bold text-foreground">
 {formatMoney(price)}
 </p>
 <Button
 type="button"
 size="sm"
 className="h-7 px-2.5 rounded-lg text-[10px] font-bold mt-1"
 >
 Emitir Contrato
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* ABA 2: VÍNCULO COM CRM */}
 {activeTab === "crm" && (
 <div className="space-y-4">
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-1">
 <p className="font-bold text-foreground">Vincular Cliente da Carteira (CRM)</p>
 <p className="text-muted-foreground text-[11px]">
 Pesquise por nome, CPF/CNPJ, WhatsApp ou e-mail para autopreencher todos os dados civis do contratante.
 </p>
 </div>

 <div className="relative">
 <Input
 value={customerSearch}
 onChange={(e) => {
 setCustomerSearch(e.target.value);
 setIsCustomerDropdownOpen(true);
 }}
 placeholder="🔍 Buscar cliente no CRM (Nome, CPF/CNPJ, WhatsApp)..."
 className="h-10 rounded-xl text-xs bg-muted/20 pl-3 pr-8 border-border/70"
 />
 {isLoadingCustomers && (
 <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
 )}
 </div>

 <div className="max-h-72 overflow-y-auto no-scrollbar space-y-2">
 {crmCustomers.length === 0 && customerSearch.trim().length >= 1 ? (
 <div className="p-4 text-center text-muted-foreground text-xs">
 Nenhum cliente encontrado com "{customerSearch}".
 </div>
 ) : (
 crmCustomers.map((c: any) => (
 <div
 key={c.id}
 onClick={() => {
 handleSelectCustomer(c);
 setActiveTab("manual");
 }}
 className="p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-3"
 >
 <div className="space-y-0.5 min-w-0">
 <p className="font-bold text-foreground truncate">{c.fullName || c.name}</p>
 <p className="text-[11px] text-muted-foreground truncate">
 {c.document && `CPF: ${c.document} • `}
 {c.phone && `Whats: ${c.phone} • `}
 {c.email}
 </p>
 </div>
 <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-bold shrink-0">
 Selecionar
 </Button>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* ABA 3 / FORMULÁRIO COMPLETO: MODO SOB MEDIDA */}
 {activeTab === "manual" && (
 <form id="new-contract-form" onSubmit={handleSubmit} className="space-y-5">
 {/* Card 1: Contratante & Qualificação Civil */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <User className="size-4 text-primary" />
 <span>Contratante (Titular Pagante)</span>
 </div>
 {customerId ? (
 <Badge
 variant="secondary"
 className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold"
 >
 ✓ Vinculado ao CRM
 </Badge>
 ) : (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
 className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary/80"
 >
 <UserPlus className="mr-1 size-3.5" />
 {isQuickCreateOpen ? "Fechar Cadastro" : "+ Cadastrar no CRM"}
 </Button>
 )}
 </div>

 {/* Subpainel retrátil de cadastro rápido */}
 {isQuickCreateOpen && (
 <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3 animate-in fade-in zoom-in-95">
 <span className="text-xs font-bold text-foreground">
 Novo Cliente no CRM da Agência
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold">Nome Completo *</Label>
 <Input
 placeholder="Ex: Carlos Eduardo Silveira"
 value={quickFullName}
 onChange={(e) => setQuickFullName(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold">CPF *</Label>
 <Input
 placeholder="000.000.000-00"
 value={quickDocument}
 onChange={(e) => setQuickDocument(e.target.value)}
 className="h-8 text-xs rounded-lg font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold">WhatsApp *</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={quickPhone}
 onChange={(e) => setQuickPhone(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-semibold">Endereço Residencial</Label>
 <Input
 placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
 value={quickAddress}
 onChange={(e) => setQuickAddress(e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 </div>
 </div>
 <Button
 type="button"
 size="sm"
 onClick={() => {
 if (!quickFullName.trim() || !quickPhone.trim() || !quickDocument.trim()) {
 toast.error("Informe nome, CPF e WhatsApp.");
 return;
 }
 quickCreateMutation.mutate({
 fullName: quickFullName.trim(),
 phone: quickPhone.trim(),
 email: quickEmail.trim() || null,
 document: quickDocument.trim(),
 addressLine: quickAddress.trim() || null,
 channel: "travel_contract",
 });
 }}
 disabled={quickCreateMutation.isPending}
 className="w-full h-8 text-xs rounded-lg font-bold"
 >
 {quickCreateMutation.isPending ? (
 <Loader2 className="mr-1.5 size-3.5 animate-spin" />
 ) : (
 <Check className="mr-1.5 size-3.5" />
 )}
 Salvar no CRM e Preencher
 </Button>
 </div>
 )}

 {/* Banner de Cliente Vinculado */}
 {selectedCustomer && (
 <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary shrink-0" />
 <span>
 Contratante: <strong>{clientName}</strong>
 {clientDocument && ` • CPF: ${clientDocument}`}
 </span>
 </div>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleUnlinkCustomer}
 className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
 >
 Desvincular
 </Button>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do Contratante *</Label>
 <Input
 placeholder="Nome completo do titular"
 value={clientName}
 onChange={(e) => setClientName(e.target.value)}
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">CPF do Contratante *</Label>
 <Input
 placeholder="000.000.000-00"
 value={clientDocument}
 onChange={(e) => setClientDocument(e.target.value)}
 className="h-9 text-xs rounded-xl font-mono"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">RG / Órgão Emissor</Label>
 <Input
 placeholder="0.000.000 SSP/SC"
 value={clientRg}
 onChange={(e) => setClientRg(e.target.value)}
 className="h-9 text-xs rounded-xl font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">WhatsApp / Telefone *</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={clientPhone}
 onChange={(e) => setClientPhone(e.target.value)}
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-bold">E-mail para Envio do Link de Assinatura</Label>
 <Input
 type="email"
 placeholder="cliente@email.com"
 value={clientEmail}
 onChange={(e) => setClientEmail(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1 sm:col-span-2">
 <Label className="text-[11px] font-bold">Endereço Residencial Completo</Label>
 <Input
 placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
 value={clientAddress}
 onChange={(e) => setClientAddress(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 {/* Card 2: Passageiros Acompanhantes */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Users className="size-4 text-primary" />
 <span>Passageiros Acompanhantes ({passengers.length})</span>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddPassenger}
 className="h-7 text-xs font-bold rounded-lg gap-1"
 >
 <Plus className="size-3.5" />
 Adicionar Passageiro
 </Button>
 </div>

 {passengers.length === 0 ? (
 <p className="text-[11px] text-muted-foreground">
 Se houver acompanhantes viajando junto com o titular, adicione-os aqui para constarem na minuta oficial.
 </p>
 ) : (
 <div className="space-y-2.5">
 {passengers.map((p, idx) => (
 <div
 key={idx}
 className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center gap-2"
 >
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
 <Input
 placeholder="Nome Completo do Passageiro"
 value={p.name}
 onChange={(e) => handleUpdatePassenger(idx, "name", e.target.value)}
 className="h-8 text-xs rounded-lg"
 />
 <Input
 placeholder="CPF ou Doc / Passaporte"
 value={p.document}
 onChange={(e) => handleUpdatePassenger(idx, "document", e.target.value)}
 className="h-8 text-xs rounded-lg font-mono"
 />
 </div>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemovePassenger(idx)}
 className="size-8 text-muted-foreground hover:text-destructive shrink-0"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Card 3: Viagem & Serviços Inclusos */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Compass className="size-4 text-primary" />
 <span>Dados da Viagem & Serviços</span>
 </div>
 {nightsCount !== null && (
 <Badge variant="secondary" className="text-[10px] font-bold bg-muted">
 🌙 {nightsCount} {nightsCount === 1 ? "Noite" : "Noites"}
 </Badge>
 )}
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título do Contrato (Opcional)</Label>
 <Input
 placeholder="Ex: Contrato de Viagem - Pacote Gramado & Vinhedos"
 value={contractTitle}
 onChange={(e) => setContractTitle(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Destino Principal *</Label>
 <Input
 placeholder="Ex: Gramado, RS"
 value={destination}
 onChange={(e) => setDestination(e.target.value)}
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data Início</Label>
 <Input
 type="date"
 value={travelStartDate}
 onChange={(e) => setTravelStartDate(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Data Término</Label>
 <Input
 type="date"
 value={travelEndDate}
 onChange={(e) => setTravelEndDate(e.target.value)}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Resumo dos Serviços Inclusos (Objeto do Contrato) *</Label>
 <Textarea
 rows={4}
 placeholder="Descreva detalhadamente: Passagens aéreas ida e volta com bagagem despachada, hospedagem no Hotel X com café da manhã, passeios inclusos, traslados in/out e apólice de seguro viagem..."
 value={packageSummary}
 onChange={(e) => setPackageSummary(e.target.value)}
 className="text-xs rounded-xl leading-relaxed"
 required
 />
 </div>
 </div>

 {/* Card 4: Condições Financeiras & Pagamento */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <DollarSign className="size-4 text-primary" />
 <span>Condições Financeiras & Pagamento</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Valor Total do Contrato (BRL) *</Label>
 <Input
 type="text"
 value={totalValueFormatted}
 onChange={handleMoneyChange}
 className="h-10 text-sm font-black font-mono rounded-xl bg-muted/20"
 required
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Forma de Liquidação</Label>
 <div className="h-10 flex items-center px-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
 <span>Assinatura Digital + Emissão com Vouchers</span>
 </div>
 </div>
 </div>

 {/* Chips de Presets de Condições Comerciais */}
 <div className="space-y-1.5 pt-1">
 <Label className="text-[11px] font-bold text-muted-foreground">
 Modelos Rápidos de Pagamento:
 </Label>
 <div className="flex flex-wrap gap-1.5">
 {[
 "⚡ Pix à Vista (5% de desconto)",
 "💳 Entrada de 20% + Saldo em até 10x sem juros no Cartão",
 "🤝 50% na Assinatura + 50% até 15 dias antes do Embarque",
 "📄 Boleto Bancário Faturado (Entrada + Saldo em até 6x)",
 ].map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => applyPaymentPreset(preset)}
 className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Condições de Pagamento Descritivas *</Label>
 <Textarea
 rows={2}
 value={paymentConditions}
 onChange={(e) => setPaymentConditions(e.target.value)}
 className="text-xs rounded-xl"
 required
 />
 </div>
 </div>

 {/* Card 5: Cláusulas Pétreas & Minuta Jurídica */}
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
 <button
 type="button"
 onClick={() => setShowClauses(!showClauses)}
 className="w-full flex items-center justify-between p-4 text-xs font-bold hover:bg-muted/30 transition-colors text-foreground"
 >
 <span className="flex items-center gap-2">
 <Scale className="size-4 text-primary" />
 <span>Cláusulas Contratuais da Minuta (5 Cláusulas Padrão Embratur)</span>
 </span>
 {showClauses ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
 </button>

 {showClauses && (
 <div className="p-4 pt-0 space-y-3 divide-y divide-border/40 text-[11px]">
 {CANONICAL_TOURISM_CLAUSES.map((c) => (
 <div key={c.number} className="pt-2.5 space-y-0.5">
 <p className="font-bold text-foreground">
 Art. {c.number} — {c.section}
 </p>
 <p className="text-muted-foreground leading-relaxed">{c.clause_text}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </form>
 )}
 </div>

 {/* Rodapé Fixo */}
 <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="rounded-xl text-xs font-semibold text-muted-foreground"
 >
 Cancelar
 </Button>

 {activeTab === "manual" ? (
 <Button
 type="submit"
 form="new-contract-form"
 disabled={isSubmitting}
 className="h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Gerando Minuta Jurídica...</span>
 </>
 ) : (
 <>
 <span>Gerar Contrato & Link de Assinatura</span>
 <ChevronRight className="size-4" />
 </>
 )}
 </Button>
 ) : (
 <Button
 type="button"
 onClick={() => setActiveTab("manual")}
 className="h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
 >
 <span>Avançar para Preenchimento</span>
 <ChevronRight className="size-4" />
 </Button>
 )}
 </div>
 </SheetContent>
 </Sheet>
 );
}
