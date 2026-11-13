import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, Edit3, Archive, Loader2, Save, Wrench, Star, HelpCircle, Percent, DollarSign, Calendar, Globe, MessageSquare, Boxes, Package, Trash2 } from "lucide-react";
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
import { listServiceConsumedMaterials, saveServiceConsumedMaterials } from "@/services/services-erp.functions";
import { listSupplies } from "@/services/gastronomy-supplies.functions";
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

 const [materials, setMaterials] = useState<
   Array<{ id: string; supply_id?: string; name: string; quantity: number; unit: string; cost_cents: number }>
 >([]);
 const [selectedSupplyId, setSelectedSupplyId] = useState<string>("");
 const [manualMaterialName, setManualMaterialName] = useState("");
 const [materialQty, setMaterialQty] = useState("1");
 const [materialUnit, setMaterialUnit] = useState("un");
 const [materialCostReais, setMaterialCostReais] = useState("0,00");

 const { data: storeSupplies = [] } = useQuery({
   queryKey: ["store-supplies-for-services"],
   queryFn: () => listSupplies({}).catch(() => []),

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

 const res = await upsertBookingService({
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
 guidelines: form.pre_care_notes.trim() || null,
 cancellation_policy: form.post_care_notes.trim() || null,
 },
 });
 const targetServiceId = (res as any)?.data?.id || form.id;
 if (targetServiceId) {
 await saveServiceConsumedMaterials({
 data: {
 serviceId: targetServiceId,
 materials: materials.map((m) => ({
 supply_id: m.supply_id || undefined,
 quantity: m.quantity,
 unit_measure: m.unit,
 tolerance_extra: 0,
 cost_cents: m.cost_cents,
 })),
 },
 }).catch((err) => console.error("Erro ao salvar insumos do serviço:", err));
 }
 return res;
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
 setMaterials([]);
 setIsSheetOpen(true);
 };

  const handleOpenEdit = async (service: any) => {
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
    try {
      const consumed = await listServiceConsumedMaterials({ data: { serviceId: service.id } });
      if (Array.isArray(consumed)) {
        setMaterials(
          consumed.map((c: any) => ({
            id: c.id,
            supply_id: c.supply_id || undefined,
            name: c.supplies?.name || c.products?.title || "Insumo",
            quantity: Number(c.quantity || 1),
            unit: c.unit_measure || c.supplies?.unit || "un",
            cost_cents: Number(c.cost_cents || c.supplies?.cost_cents_per_unit || 0),
          }))
        );
      }
    } catch {
      setMaterials([]);
    }
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
 <div className="space-y-6 w-full animate-in fade-in duration-200">
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
     <Star className="size-3.5 text-warning-strong" />
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
 <TabsList className="grid grid-cols-2 sm:grid-cols-5 max-w-xl h-auto sm:h-11 p-1 bg-muted/60 rounded-lg mb-4">
 <TabsTrigger value="cadastro" className="rounded-lg font-bold text-xs">
 Cadastro
 </TabsTrigger>
 <TabsTrigger value="regras" className="rounded-lg font-bold text-xs">
 Preço & Comissões
 </TabsTrigger>
 <TabsTrigger value="insumos" className="rounded-lg font-bold text-xs gap-2">
 <Boxes className="size-3.5 text-primary" />
 Insumos & Kit
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
 <SelectItem value="active" className="text-xs font-semibold text-foreground">● Ativo na Agenda</SelectItem>
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

 {/* ABA: INSUMOS & KIT DE PROCEDIMENTO (SERVIÇOS COMPOSTOS MULTI-NICHO) */}
 <TabsContent value="insumos" className="space-y-4 pt-1">
 <div className="p-4 rounded-lg bg-card border border-border/70 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <Boxes className="size-4 text-primary" />
 Kit de Materiais & Insumos do Procedimento
 </span>
 <p className="text-xs text-muted-foreground mt-1">
 Adicione os materiais gastos na execução (tintura, óleos, lâminas, xampus, luvas) para cálculo de margem real e baixa de estoque.
 </p>
 </div>
 </div>

 {/* Métricas de Custo e Lucro do Procedimento */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
 <div>
 <span className="text-2xs text-muted-foreground font-bold uppercase block">Preço do Serviço</span>
 <span className="text-sm font-black font-mono text-foreground">{form.price_reais ? `R$ ${form.price_reais}` : "R$ 0,00"}</span>
 </div>
 <div>
 <span className="text-2xs text-muted-foreground font-bold uppercase block">Custo dos Insumos</span>
 <span className="text-sm font-black font-mono text-foreground">
 {formatMoney(materials.reduce((acc, m) => acc + (m.cost_cents * m.quantity), 0))}
 </span>
 </div>
 <div>
 <span className="text-2xs text-muted-foreground font-bold uppercase block">Lucro Bruto Unitário</span>
 <span className="text-sm font-black font-mono text-foreground">
 {formatMoney(
 Math.max(
 0,
 Math.round((parseFloat(form.price_reais.replace(".", "").replace(",", ".")) || 0) * 100) -
 materials.reduce((acc, m) => acc + (m.cost_cents * m.quantity), 0)
 )
 )}
 </span>
 </div>
 <div>
 <span className="text-2xs text-muted-foreground font-bold uppercase block">Margem do Serviço</span>
 <Badge variant="secondary" className="font-mono text-xs mt-1">
 {(() => {
 const priceCents = Math.round((parseFloat(form.price_reais.replace(".", "").replace(",", ".")) || 0) * 100);
 const costCents = materials.reduce((acc, m) => acc + (m.cost_cents * m.quantity), 0);
 const profit = Math.max(0, priceCents - costCents);
 return priceCents > 0 ? `${Math.round((profit / priceCents) * 100)}%` : "0%";
 })()} Margem
 </Badge>
 </div>
 </div>

 {/* Formulário de Inclusão de Insumo */}
 <div className="p-3 bg-background rounded-lg border border-border/60 space-y-3">
 <span className="text-xs font-bold text-foreground block">Vincular Insumo ao Serviço</span>
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
 <div className="sm:col-span-5 space-y-1">
 <Label className="text-2xs font-bold">Insumo da Despensa / Almoxarifado</Label>
 <Select
 value={selectedSupplyId}
 onValueChange={(val) => {
 setSelectedSupplyId(val);
 const s = (storeSupplies as any[]).find((x) => x.id === val);
 if (s) {
 setManualMaterialName(s.name);
 setMaterialUnit(s.unit || "un");
 setMaterialCostReais((Number(s.cost_cents_per_unit || 0) / 100).toFixed(2).replace(".", ","));
 }
 }}
 >
 <SelectTrigger className="h-9 text-xs rounded-lg">
 <SelectValue placeholder="Selecionar do estoque..." />
 </SelectTrigger>
 <SelectContent className="max-h-56">
 {(storeSupplies as any[]).map((s) => (
 <SelectItem key={s.id} value={s.id} className="text-xs">
 {s.name} ({s.stock_on_hand} {s.unit} • {formatMoney(s.cost_cents_per_unit)})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="sm:col-span-3 space-y-1">
 <Label className="text-2xs font-bold">Ou Nome Manual</Label>
 <Input
 placeholder="Ex: Luvas látex"
 value={manualMaterialName}
 onChange={(e) => setManualMaterialName(e.target.value)}
 className="h-9 text-xs rounded-lg"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-2xs font-bold">Qtd ({materialUnit})</Label>
 <Input
 type="number"
 step="any"
 min="0.001"
 value={materialQty}
 onChange={(e) => setMaterialQty(e.target.value)}
 className="h-9 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Button
 type="button"
 size="sm"
 className="h-11 min-h-11 sm:h-9 sm:min-h-0 w-full rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
 onClick={() => {
 if (!manualMaterialName.trim()) {
 toast.error("Informe o nome ou selecione um insumo.");
 return;
 }
 const cleanCost = parseFloat(materialCostReais.replace(".", "").replace(",", ".")) || 0;
 setMaterials((prev) => [
 ...prev,
 {
 id: `mat-${Date.now()}`,
 supply_id: selectedSupplyId || undefined,
 name: manualMaterialName.trim(),
 quantity: Number(materialQty) || 1,
 unit: materialUnit || "un",
 cost_cents: Math.round(cleanCost * 100),
 },
 ]);
 setManualMaterialName("");
 setSelectedSupplyId("");
 setMaterialQty("1");
 setMaterialCostReais("0,00");
 }}
 >
 + Incluir
 </Button>
 </div>
 </div>
 </div>

 {/* Lista de Materiais Vinculados */}
 {materials.length === 0 ? (
 <p className="text-xs text-muted-foreground text-center py-4">
 Nenhum material vinculado a este procedimento ainda.
 </p>
 ) : (
 <div className="rounded-lg border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">Material / Insumo</TableHead>
 <TableHead className="text-xs text-center">Quantidade</TableHead>
 <TableHead className="text-xs text-right">Custo Unit.</TableHead>
 <TableHead className="text-xs text-right">Total</TableHead>
 <TableHead className="w-10"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {materials.map((m) => (
 <TableRow key={m.id}>
 <TableCell className="text-xs font-medium">{m.name}</TableCell>
 <TableCell className="text-xs text-center font-mono">{m.quantity} {m.unit}</TableCell>
 <TableCell className="text-xs text-right font-mono">{formatMoney(m.cost_cents)}</TableCell>
 <TableCell className="text-xs text-right font-mono font-bold text-foreground">
 {formatMoney(m.cost_cents * m.quantity)}
 </TableCell>
 <TableCell>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="size-11 min-h-11 min-w-11 sm:size-8 sm:min-h-0 sm:min-w-0 text-muted-foreground hover:text-destructive cursor-pointer"
 onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== m.id))}
 >
 <Trash2 className="size-3.5" />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
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

