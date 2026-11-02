import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, Edit3, Archive, Loader2, Save, Wrench, Star, HelpCircle, Percent, DollarSign, Calendar, Globe, MessageSquare } from "lucide-react";
import { ServiceSearchDialog } from "@/components/admin/services/service-search-dialog";
import type { OnDemandMarketplaceService } from "@/lib/data/services-catalog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SeoGeoOptimizationPanel, type SeoGeoMetadata } from "@/components/seo";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SheetPage } from "@/components/ui/sheet-page";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { listBookingServices, upsertBookingService, deleteBookingService } from "@/services/booking.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/agenda/servicos/")({
  head: () => ({ meta: [{ title: "Serviços | Workspace Waesy" }] }),
  component: ServicesIndexPage,
});

interface ServiceFormState {
  id?: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_reais: string;
  category: string;
  gender_target: string;
  image_url: string | null;
  status: "active" | "archived";
  price_type: "fixed" | "starting_at" | "on_request";
  additional_cost_reais: string;
  default_commission_type: "percentage" | "fixed";
  default_commission_value: string;
  return_days: number;
  pre_care_notes: string;
  post_care_notes: string;
}

const INITIAL_FORM: ServiceFormState = {
  title: "",
  description: "",
  duration_minutes: 30,
  price_reais: "50,00",
  category: "geral",
  gender_target: "todos",
  image_url: null,
  status: "active",
  price_type: "fixed",
  additional_cost_reais: "0,00",
  default_commission_type: "percentage",
  default_commission_value: "30",
  return_days: 30,
  pre_care_notes: "",
  post_care_notes: "",
};

function ServicesIndexPage() {
 const queryClient = useQueryClient();
 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [isSearchCatalogOpen, setIsSearchCatalogOpen] = useState(false);
 const [form, setForm] = useState<ServiceFormState>(INITIAL_FORM);
 const [seoGeo, setSeoGeo] = useState<SeoGeoMetadata>({
   seoTitle: "",
   seoDescription: "",
   keywords: [],
   allowAiIndexing: true,
 });

 const { data: res, isLoading } = useQuery({
 queryKey: ["booking-services"],
 queryFn: () => listBookingServices(),
 });

 const services = res?.data || [];

 const saveMutation = useMutation({
 mutationFn: async () => {
 const cleanPrice = parseFloat(form.price_reais.replace(".", "").replace(",", ".")) || 0;
 const price_cents = Math.round(cleanPrice * 100);

 return upsertBookingService({
 data: {
 id: form.id,
 title: form.title.trim(),
 description: form.description.trim() || null,
 duration_minutes: Number(form.duration_minutes),
 price_cents,
 category: form.category || null,
 gender_target: form.gender_target || null,
 image_url: form.image_url || null,
 status: form.status,
 },
 });
 },
 onSuccess: () => {
 toast.success(form.id ? "Serviço atualizado com sucesso." : "Novo serviço cadastrado.");
 setIsSheetOpen(false);
 setForm(INITIAL_FORM);
 queryClient.invalidateQueries({ queryKey: ["booking-services"] });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao salvar serviço.");
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 return deleteBookingService({ data: { id } });
 },
 onSuccess: () => {
 toast.success("Serviço arquivado com sucesso.");
 queryClient.invalidateQueries({ queryKey: ["booking-services"] });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao arquivar serviço.");
 },
 });

 const handleOpenCreate = () => {
 setForm(INITIAL_FORM);
 setIsSheetOpen(true);
 };

  const handleOpenEdit = (service: any) => {
    setForm({
      id: service.id,
      title: service.title || "",
      description: service.description || "",
      duration_minutes: service.duration_minutes || 30,
      price_reais: (Number(service.price_cents || 0) / 100).toFixed(2).replace(".", ","),
      category: service.category || "geral",
      gender_target: service.gender_target || "todos",
      image_url: service.image_url || null,
      status: service.status || "active",
      price_type: service.price_type || "fixed",
      additional_cost_reais: (Number(service.additional_cost_cents || 0) / 100).toFixed(2).replace(".", ","),
      default_commission_type: service.default_commission_type || "percentage",
      default_commission_value: String(service.default_commission_value || "30"),
      return_days: service.return_days || 30,
      pre_care_notes: service.guidelines || service.pre_care_notes || "",
      post_care_notes: service.cancellation_policy || service.post_care_notes || "",
    });
    setIsSheetOpen(true);
  };

  const handleSelectOnDemandService = (srv: OnDemandMarketplaceService) => {
    setForm({
      title: srv.name,
      description: srv.description,
      duration_minutes: srv.estimated_delivery_days === 1 ? 60 : 120,
      price_reais: (srv.estimated_avg_price_cents / 100).toFixed(2).replace(".", ","),
      category: srv.category.toLowerCase().includes("ti") || srv.category.toLowerCase().includes("tec") ? "tecnologia" : "geral",
      gender_target: "todos",
      image_url: null,
      status: "active",
      price_type: "fixed",
      additional_cost_reais: "0,00",
      default_commission_type: "percentage",
      default_commission_value: "30",
      return_days: 30,
      pre_care_notes: "",
      post_care_notes: "",
    });
    setIsSheetOpen(true);
    toast.success(`Serviço "${srv.name}" importado. Todos os campos estão disponíveis para edição.`);
  };

 return (
 <div className="space-y-6 max-w-6xl animate-in fade-in duration-200">
 <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
 eyebrow="Agenda"
 title="Serviços"
 actions={
 <div className="flex items-center gap-2">
   <Button
     onClick={() => setIsSearchCatalogOpen(true)}
     variant="outline"
     size="sm"
     className="rounded-lg font-bold text-xs gap-2 border-border/60 hover:bg-muted/30 text-foreground"
   >
     <Star className="size-3.5 text-amber-500" />
     <span>Importar do Catálogo</span>
   </Button>
   <Button onClick={handleOpenCreate} size="sm" className="rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground">
     <Plus className="size-3.5" />
     <span>Novo Serviço</span>
   </Button>
 </div>
 }
 />

 <ServiceSearchDialog
   open={isSearchCatalogOpen}
   onOpenChange={setIsSearchCatalogOpen}
   onSelectService={handleSelectOnDemandService}
 />

 {isLoading ? (
 <div className="h-40 flex items-center justify-center">
 <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
 </div>
 ) : services.length === 0 ? (
 <EmptyState /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
 title="Nenhum Serviço Cadastrado"
 description="Cadastre procedimentos, cortes, sessões ou atendimentos com duração e valor definidos."
 action={
 <Button onClick={handleOpenCreate} size="sm" className="rounded-lg font-bold text-xs">
 Cadastrar Primeiro Serviço
 </Button>
 }
 />
 ) : (
 <div className="bg-card rounded-lg border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/40">
 <TableHead className="w-12"></TableHead>
 <TableHead className="font-semibold text-xs">Serviço e Descrição</TableHead>
 <TableHead className="font-semibold text-xs">Duração</TableHead>
 <TableHead className="font-semibold text-xs">Preço</TableHead>
 <TableHead className="font-semibold text-xs">Status</TableHead>
 <TableHead className="text-right font-semibold text-xs w-20">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border/40">
 {services.map((service: any) => (
 <TableRow key={service.id} className="group hover:bg-muted/20 transition-colors">
 <TableCell className="pl-4 pr-0">
 <div className="size-10 rounded-lg bg-muted/60 border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
 {service.image_url ? (
 <img
 src={service.image_url}
 alt={service.title}
 className="size-full object-cover"
 />
 ) : (
 <Wrench className="size-4 text-muted-foreground" />
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="font-bold text-foreground text-xs">{service.title}</div>
 {service.description && (
 <div className="text-xs text-muted-foreground line-clamp-1 max-w-80 mt-1">
 {service.description}
 </div>
 )}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="font-mono text-xs gap-1">
 <Clock className="size-3" />
 {service.duration_minutes} min
 </Badge>
 </TableCell>
 <TableCell className="font-mono font-bold text-xs text-foreground">
 {formatMoney(service.price_cents)}
 </TableCell>
 <TableCell>
 <Badge variant={service.status === "active" ? "default" : "secondary"} className="text-xs">
 {service.status === "active" ? "● Ativo" : "● Arquivado"}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <CrudActionsMenu
                        entityName="Serviço"
                        onEdit={() => handleOpenEdit(service)}
                        onArchive={() => deleteMutation.mutate(service.id)}
                        archiveLabel="Arquivar Serviço"
                        onDelete={() => deleteMutation.mutate(service.id)}
                        deleteConfirmTitle="Arquivar Serviço?"
                        deleteConfirmDescription={`Deseja realmente arquivar o serviço "${service.title}"? Ele deixará de ser exibido para agendamentos.`}
                      />
                    </div>
                  </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}

 {/* Editor Drawer Lateral Canônico / Fullpage Mobile */}
 <SheetPage
 open={isSheetOpen}
 onOpenChange={setIsSheetOpen}
 title={form.id ? "Editar Serviço" : "Novo Serviço"}
 description="Configure os parâmetros de agendamento, duração e valor do serviço."
 >
 <TooltipProvider delayDuration={200}>
 <div className="space-y-4 p-1 pb-16">
 <Tabs defaultValue="cadastro" className="w-full">
 <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-lg h-auto sm:h-11 p-1 bg-muted/60 rounded-lg mb-4">
 <TabsTrigger value="cadastro" className="rounded-lg font-bold text-xs">
 Cadastro
 </TabsTrigger>
 <TabsTrigger value="regras" className="rounded-lg font-bold text-xs">
 Preço & Comissões
 </TabsTrigger>
 <TabsTrigger value="cuidados" className="rounded-lg font-bold text-xs">
 Cuidados & CRM
 </TabsTrigger>
 <TabsTrigger value="seo" className="rounded-lg font-bold text-xs">
 SEO & IA
 </TabsTrigger>
 </TabsList>

 {/* ABA 1: CADASTRO BÁSICO */}
 <TabsContent value="cadastro" className="space-y-4 pt-1">
 <div className="space-y-2">
 <Label htmlFor="service-title" className="text-xs font-bold text-foreground">
 Título do Serviço *
 </Label>
 <Input
 id="service-title"
 placeholder="Ex: Corte Degrade + Barba, Massagem..."
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 className="rounded-lg h-10 text-xs"
 autoFocus
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="service-desc" className="text-xs font-bold text-foreground">
 Descrição / Detalhes (Opcional)
 </Label>
 <Textarea
 id="service-desc"
 placeholder="Descreva o que está incluso no atendimento..."
 rows={3}
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 className="rounded-lg text-xs resize-none"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Duração Estimada *</Label>
 <Select
 value={String(form.duration_minutes)}
 onValueChange={(val) => setForm({ ...form, duration_minutes: Number(val) })}
 >
 <SelectTrigger className="rounded-lg h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="15" className="text-xs">15 min</SelectItem>
 <SelectItem value="30" className="text-xs">30 min</SelectItem>
 <SelectItem value="45" className="text-xs">45 min</SelectItem>
 <SelectItem value="60" className="text-xs">1 hora (60 min)</SelectItem>
 <SelectItem value="90" className="text-xs">1h30 (90 min)</SelectItem>
 <SelectItem value="120" className="text-xs">2 horas (120 min)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Público / Alvo</Label>
 <Select
 value={form.gender_target}
 onValueChange={(val) => setForm({ ...form, gender_target: val })}
 >
 <SelectTrigger className="rounded-lg h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="todos" className="text-xs">Todos (Unissex)</SelectItem>
 <SelectItem value="masculino" className="text-xs">Masculino</SelectItem>
 <SelectItem value="feminino" className="text-xs">Feminino</SelectItem>
 <SelectItem value="infantil" className="text-xs">Infantil</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Status de Exibição</Label>
 <Select
 value={form.status}
 onValueChange={(val: any) => setForm({ ...form, status: val })}
 >
 <SelectTrigger className="rounded-lg h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="active" className="text-xs font-semibold text-emerald-600">● Ativo na Agenda</SelectItem>
 <SelectItem value="archived" className="text-xs text-muted-foreground">● Arquivado / Oculto</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2 pt-1">
 <Label className="text-xs font-bold text-foreground">Foto Ilustrativa do Serviço</Label>
 <ImageUpload
 value={form.image_url}
 onChange={(url) => setForm({ ...form, image_url: url })}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Upload com recorte panorâmico 16:10 para exibição na página de agendamento"
 />
 </div>
 </TabsContent>

 {/* ABA 2: PREÇO & COMISSÕES */}
 <TabsContent value="regras" className="space-y-4 pt-1">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Label className="text-xs font-bold text-foreground">Modelo de Preço</Label>
 <Tooltip>
 <TooltipTrigger asChild>
 <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent className="max-w-xs text-xs">
 Define como o valor do serviço será exibido para o cliente no agendamento online.
 </TooltipContent>
 </Tooltip>
 </div>
 <Select
 value={form.price_type}
 onValueChange={(val: any) => setForm({ ...form, price_type: val })}
 >
 <SelectTrigger className="rounded-lg h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="fixed" className="text-xs">Preço Fixo</SelectItem>
 <SelectItem value="starting_at" className="text-xs">A partir de</SelectItem>
 <SelectItem value="on_request" className="text-xs">Sob Consulta / Avaliação</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="service-price" className="text-xs font-bold text-foreground">
 Preço de Venda (R$) *
 </Label>
 <Input
 id="service-price"
 placeholder="0,00"
 value={form.price_reais}
 onChange={(e) => setForm({ ...form, price_reais: e.target.value })}
 className="rounded-lg h-10 text-xs font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Label htmlFor="service-cost" className="text-xs font-bold text-foreground">
 Custo Adicional (R$)
 </Label>
 <Tooltip>
 <TooltipTrigger asChild>
 <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent className="max-w-xs text-xs">
 Valor desembolsado a mais para executar esse serviço. Este valor será descontado do valor total do serviço no relatório de Resultado Líquido.
 </TooltipContent>
 </Tooltip>
 </div>
 <Input
 id="service-cost"
 placeholder="0,00"
 value={form.additional_cost_reais}
 onChange={(e) => setForm({ ...form, additional_cost_reais: e.target.value })}
 className="rounded-lg h-10 text-xs font-mono"
 />
 </div>

 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Label className="text-xs font-bold text-foreground">Comissão Padrão</Label>
 <Tooltip>
 <TooltipTrigger asChild>
 <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent className="max-w-xs text-xs">
 Caso não seja definida comissão individual para o profissional parceiro, este valor padrão será aplicado.
 </TooltipContent>
 </Tooltip>
 </div>
 <div className="flex items-center gap-2">
 <Select
 value={form.default_commission_type}
 onValueChange={(val: any) => setForm({ ...form, default_commission_type: val })}
 >
 <SelectTrigger className="w-24 rounded-lg h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="percentage" className="text-xs">%</SelectItem>
 <SelectItem value="fixed" className="text-xs">R$</SelectItem>
 </SelectContent>
 </Select>
 <Input
 value={form.default_commission_value}
 onChange={(e) => setForm({ ...form, default_commission_value: e.target.value })}
 className="rounded-lg h-10 text-xs font-mono flex-1"
 placeholder={form.default_commission_type === "percentage" ? "30" : "25,00"}
 />
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ABA 3: CUIDADOS & CRM RETORNO */}
 <TabsContent value="cuidados" className="space-y-4 pt-1">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Label htmlFor="return-days" className="text-xs font-bold text-foreground">
 Tempo de Retorno (Dias para CRM)
 </Label>
 <Tooltip>
 <TooltipTrigger asChild>
 <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
 </TooltipTrigger>
 <TooltipContent className="max-w-xs text-xs">
 Defina em quantos dias seu cliente deve retornar para manutenção ou parte 2. O CRM disparará um lembrete automático via WhatsApp.
 </TooltipContent>
 </Tooltip>
 </div>
 <Input
 id="return-days"
 type="number"
 min="1"
 max="365"
 value={form.return_days}
 onChange={(e) => setForm({ ...form, return_days: Number(e.target.value) })}
 className="rounded-lg h-10 text-xs font-mono max-w-xs"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="pre-care" className="text-xs font-bold text-foreground">
 Orientações Pré-Atendimento (WhatsApp / Cartão)
 </Label>
 <Textarea
 id="pre-care"
 placeholder="Ex: Chegar sem maquiagem. Suspender uso de ácidos 48h antes..."
 rows={2}
 value={form.pre_care_notes}
 onChange={(e) => setForm({ ...form, pre_care_notes: e.target.value })}
 className="rounded-lg text-xs resize-none"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="post-care" className="text-xs font-bold text-foreground">
 Cuidados Pós-Atendimento (WhatsApp / Cartão)
 </Label>
 <Textarea
 id="post-care"
 placeholder="Ex: Não molhar a região por 24 horas. Evitar exposição solar direta..."
 rows={2}
 value={form.post_care_notes}
 onChange={(e) => setForm({ ...form, post_care_notes: e.target.value })}
 className="rounded-lg text-xs resize-none"
 />
 </div>
 </TabsContent>

 {/* ABA 4: SEO & GEO / DESCOBERTA AGÊNTICA */}
 <TabsContent value="seo" className="space-y-4 pt-1">
 <SeoGeoOptimizationPanel
 value={seoGeo}
 onChange={setSeoGeo}
 referenceTitle={form.title}
 referenceDescription={form.description}
 defaultOpen={true}
 />
 </TabsContent>
 </Tabs>

 <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsSheetOpen(false)}
 className="rounded-lg text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 onClick={() => saveMutation.mutate()}
 disabled={saveMutation.isPending || !form.title.trim()}
 className="rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground min-w-28 cursor-pointer"
 >
 {saveMutation.isPending ? (
 <>
 <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
 Salvando...
 </>
 ) : (
 <>
 <Save className="size-3.5" />
 Salvar Serviço
 </>
 )}
 </Button>
 </div>
 </div>
 </TooltipProvider>
 </SheetPage>
 </div>
 );
}

