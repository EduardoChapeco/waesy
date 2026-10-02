import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, WhatsappLogo, PaperPlaneTilt, SpinnerGap } from "@phosphor-icons/react";
import { requestPublicQuote, type PublicQuoteRequestInput } from "@/services/quotes.functions";
import { toast } from "sonner";

interface RequestQuoteModalProps {
 isOpen: boolean;
 onClose: () => void;
 storeId: string;
 storeName: string;
 storePhone?: string;
 defaultCategory?: string;
 categories?: string[];
}

export function RequestQuoteModal({
 isOpen,
 onClose,
 storeId,
 storeName,
 storePhone,
 defaultCategory = "",
 categories = [
 "Consultoria & Negócios",
 "Contabilidade & Fiscal",
 "Advocacia & Jurídico",
 "Engenharia & Arquitetura",
 "Obras & Reformas",
 "Terraplanagem & Escavação",
 "Eletricista & Manutenção",
 "Encanador & Hidráulica",
 "Pintura & Acabamentos",
 "Climatização & Ar-condicionado",
 "Limpeza & Diaristas",
 "Mecânica & Autoelétrica",
 "Tecnologia, Sites & Design",
 "Móveis Planejados",
 "Outros Serviços",
 ],
}: RequestQuoteModalProps) {
 const [name, setName] = useState("");
 const [phone, setPhone] = useState("");
 const [email, setEmail] = useState("");
 const [category, setCategory] = useState(defaultCategory || (categories[0] ?? "Outros Serviços"));
 const [description, setDescription] = useState("");
 const [urgency, setUrgency] = useState<"baixa" | "media" | "alta" | "urgente">("media");
 const [address, setAddress] = useState("");
 const [preferredDate, setPreferredDate] = useState("");
 const [budgetBrl, setBudgetBrl] = useState("");
 
 const [isLoading, setIsLoading] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!name.trim() || !phone.trim() || !description.trim()) {
 toast.error("Por favor, preencha os campos obrigatórios (Nome, Telefone e Descrição).");
 return;
 }

 setIsLoading(true);
 try {
 const budgetCents = budgetBrl ? Math.round(parseFloat(budgetBrl.replace(/\D/g, "")) * 1) : undefined;

 const payload: PublicQuoteRequestInput = {
 store_id: storeId,
 customer_name: name.trim(),
 customer_phone: phone.trim(),
 customer_email: email.trim() || undefined,
 service_category: category,
 project_description: description.trim(),
 urgency,
 location_address: address.trim() || undefined,
 preferred_date: preferredDate.trim() || undefined,
 estimated_budget_cents: budgetCents,
 };

 const result = await requestPublicQuote({ data: payload });
 if (result.success) {
 setIsSuccess(true);
 toast.success(result.message);
 }
 } catch (err: any) {
 toast.error(err?.message || "Não foi possível enviar a solicitação. Tente novamente.");
 } finally {
 setIsLoading(false);
 }
 };

 const handleResetAndClose = () => {
 setIsSuccess(false);
 setDescription("");
 onClose();
 };

 const handleWhatsAppRedirect = () => {
 if (!storePhone) return;
 const cleanPhone = storePhone.replace(/\D/g, "");
 const msg = encodeURIComponent(
 `Olá ${storeName}, solicitei um orçamento pelo Super App Waesy para o serviço "${category}". Meu nome é ${name}. Descrição: ${description}`
 );
 window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
 <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
 {isSuccess ? (
 <div className="py-6 flex flex-col items-center text-center space-y-4">
 <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <CheckCircle size={40} weight="fill" />
 </div>
 <div className="space-y-1">
 <DialogTitle className="text-xl font-bold">Solicitação Enviada com Sucesso!</DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground">
 Sua solicitação de orçamento foi entregue diretamente para <strong>{storeName}</strong>. Você receberá um retorno pelo WhatsApp ou e-mail informado.
 </DialogDescription>
 </div>

 {storePhone && (
 <div className="w-full pt-4 space-y-2">
 <p className="text-xs text-muted-foreground">Quer agilizar o atendimento?</p>
 <Button
 onClick={handleWhatsAppRedirect}
 className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold flex items-center justify-center gap-2"
 >
 <WhatsappLogo size={20} weight="fill" />
 Chamar no WhatsApp Agora
 </Button>
 </div>
 )}

 <Button variant="outline" onClick={handleResetAndClose} className="w-full mt-2">
 Concluir e Fechar
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">Solicitar Orçamento Gratuito</DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Envie os detalhes do seu projeto ou serviço para <strong>{storeName}</strong>.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3 pt-2 text-left">
 <div className="space-y-2">
 <Label htmlFor="category" className="text-xs font-semibold">
 Categoria do Serviço
 </Label>
 <Select value={category} onValueChange={setCategory}>
 <SelectTrigger id="category" className="h-10 text-sm">
 <SelectValue placeholder="Selecione o serviço" />
 </SelectTrigger>
 <SelectContent>
 {categories.map((cat) => (
 <SelectItem key={cat} value={cat}>
 {cat}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label htmlFor="name" className="text-xs font-semibold">
 Seu Nome *
 </Label>
 <Input
 id="name"
 required
 placeholder="Ex: João da Silva"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="h-10 text-sm"
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="phone" className="text-xs font-semibold">
 WhatsApp / Telefone *
 </Label>
 <Input
 id="phone"
 required
 placeholder="(49) 99999-9999"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="h-10 text-sm"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="email" className="text-xs font-semibold">
 E-mail (Opcional)
 </Label>
 <Input
 id="email"
 type="email"
 placeholder="joao@exemplo.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="h-10 text-sm"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="description" className="text-xs font-semibold">
 Descrição do Serviço / Necessidade *
 </Label>
 <Textarea
 id="description"
 required
 rows={3}
 placeholder="Descreva o que precisa, medidas, problemas a resolver ou detalhes específicos..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="text-sm resize-none"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label htmlFor="urgency" className="text-xs font-semibold">
 Nível de Urgência
 </Label>
 <Select value={urgency} onValueChange={(val: any) => setUrgency(val)}>
 <SelectTrigger id="urgency" className="h-10 text-sm">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="baixa">Sem pressa / Planejamento</SelectItem>
 <SelectItem value="media">Normal (Esta semana)</SelectItem>
 <SelectItem value="alta">Prioritário (Próximos dias)</SelectItem>
 <SelectItem value="urgente">🚨 Emergência / Imediato</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="preferredDate" className="text-xs font-semibold">
 Data ou Prazo Desejado
 </Label>
 <Input
 id="preferredDate"
 placeholder="Ex: Próxima segunda-feira"
 value={preferredDate}
 onChange={(e) => setPreferredDate(e.target.value)}
 className="h-10 text-sm"
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="address" className="text-xs font-semibold">
 Bairro ou Endereço do Serviço
 </Label>
 <Input
 id="address"
 placeholder="Ex: Centro, Rua das Flores ou Interior"
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 className="h-10 text-sm"
 />
 </div>
 </div>

 <DialogFooter className="pt-3 gap-2">
 <Button type="button" variant="ghost" onClick={handleResetAndClose} disabled={isLoading}>
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isLoading}
 className="bg-primary text-primary-foreground font-semibold flex items-center gap-2"
 >
 {isLoading ? (
 <>
 <SpinnerGap className="size-4 animate-spin" />
 Enviando...
 </>
 ) : (
 <>
 <PaperPlaneTilt size={16} weight="bold" />
 Solicitar Orçamento
 </>
 )}
 </Button>
 </DialogFooter>
 </form>
 )}
 </DialogContent>
 </Dialog>
 );
}
