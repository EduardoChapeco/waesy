import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Clock, Edit3, Archive, Loader2, Save, Wrench, Sparkles } from "lucide-react";
import { ServiceSearchDialog } from "@/components/admin/services/service-search-dialog";
import type { OnDemandMarketplaceService } from "@/lib/data/services-catalog";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { SheetPage } from "@/components/ui/sheet-page";
import { ImageUpload } from "@/components/ui/image-upload";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import {
 listBookingServices,
 upsertBookingService,
 deleteBookingService,
} from "@/services/booking.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/agenda/servicos/")({
 head: () => ({ meta: [{ title: "Serviços & Procedimentos | Workspace Waesy" }] }),
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
};

function ServicesIndexPage() {
 const queryClient = useQueryClient();
 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [isSearchCatalogOpen, setIsSearchCatalogOpen] = useState(false);
 const [form, setForm] = useState<ServiceFormState>(INITIAL_FORM);

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
   });
   setIsSheetOpen(true);
   toast.success(`Serviço "${srv.name}" importado. Todos os campos estão disponíveis para edição.`);
 };

 return (
 <div className="space-y-6 max-w-6xl animate-in fade-in duration-200">
 <PageHeader
 eyebrow="Agenda"
 title="Serviços"
 actions={
 <div className="flex items-center gap-2">
   <Button
     onClick={() => setIsSearchCatalogOpen(true)}
     variant="outline"
     size="sm"
     className="rounded-xl font-bold text-xs gap-1.5 border-border/60 hover:bg-muted/30 text-foreground shadow-sm"
   >
     <Sparkles className="size-3.5 text-amber-500" />
     <span>Importar do Catálogo</span>
   </Button>
   <Button onClick={handleOpenCreate} size="sm" className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground">
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
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
 </div>
 ) : services.length === 0 ? (
 <EmptyState
 title="Nenhum Serviço Cadastrado"
 description="Cadastre procedimentos, cortes, sessões ou atendimentos com duração e valor definidos."
 action={
 <Button onClick={handleOpenCreate} size="sm" className="rounded-xl font-bold text-xs">
 Cadastrar Primeiro Serviço
 </Button>
 }
 />
 ) : (
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/40">
 <TableHead className="w-12"></TableHead>
 <TableHead className="font-semibold text-xs">Serviço & Descrição</TableHead>
 <TableHead className="font-semibold text-xs">Duração</TableHead>
 <TableHead className="font-semibold text-xs">Preço</TableHead>
 <TableHead className="font-semibold text-xs">Status</TableHead>
 <TableHead className="text-right font-semibold text-xs w-[80px]">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border/40">
 {services.map((service: any) => (
 <TableRow key={service.id} className="group hover:bg-muted/20 transition-colors">
 <TableCell className="pl-4 pr-0">
 <div className="size-10 rounded-xl bg-muted/60 border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
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
 <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[320px] mt-0.5">
 {service.description}
 </div>
 )}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="font-mono text-[10px] gap-1">
 <Clock className="size-3" />
 {service.duration_minutes} min
 </Badge>
 </TableCell>
 <TableCell className="font-mono font-bold text-xs text-foreground">
 {formatMoney(service.price_cents)}
 </TableCell>
 <TableCell>
 <Badge variant={service.status === "active" ? "default" : "secondary"} className="text-[10px]">
 {service.status === "active" ? "● Ativo" : "● Arquivado"}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleOpenEdit(service)}
 className="size-7 rounded-lg"
 title="Editar Serviço"
 >
 <Edit3 className="size-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="size-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
 onClick={() => {
 if (confirm(`Deseja arquivar o serviço "${service.title}"?`)) {
 deleteMutation.mutate(service.id);
 }
 }}
 disabled={deleteMutation.isPending}
 title="Arquivar"
 >
 <Archive className="size-3.5" />
 </Button>
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
 <div className="space-y-4 p-1 pb-16">
 <div className="space-y-1.5">
 <Label htmlFor="service-title" className="text-xs font-bold text-foreground">
 Título do Serviço *
 </Label>
 <Input
 id="service-title"
 placeholder="Ex: Corte Degrade + Barba, Massagem..."
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 className="rounded-xl h-10 text-xs"
 autoFocus
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="service-desc" className="text-xs font-bold text-foreground">
 Descrição / Detalhes (Opcional)
 </Label>
 <Textarea
 id="service-desc"
 placeholder="Descreva o que está incluso no atendimento..."
 rows={3}
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 className="rounded-2xl text-xs resize-none"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Duração Estimada *</Label>
 <Select
 value={String(form.duration_minutes)}
 onValueChange={(val) => setForm({ ...form, duration_minutes: Number(val) })}
 >
 <SelectTrigger className="rounded-xl h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="15" className="text-xs">15 min</SelectItem>
 <SelectItem value="30" className="text-xs">30 min</SelectItem>
 <SelectItem value="45" className="text-xs">45 min</SelectItem>
 <SelectItem value="60" className="text-xs">1 hora (60 min)</SelectItem>
 <SelectItem value="90" className="text-xs">1h30 (90 min)</SelectItem>
 <SelectItem value="120" className="text-xs">2 horas (120 min)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="service-price" className="text-xs font-bold text-foreground">
 Preço (R$) *
 </Label>
 <Input
 id="service-price"
 placeholder="0,00"
 value={form.price_reais}
 onChange={(e) => setForm({ ...form, price_reais: e.target.value })}
 className="rounded-xl h-10 text-xs font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Público / Alvo</Label>
 <Select
 value={form.gender_target}
 onValueChange={(val) => setForm({ ...form, gender_target: val })}
 >
 <SelectTrigger className="rounded-xl h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="todos" className="text-xs">Todos (Unissex)</SelectItem>
 <SelectItem value="masculino" className="text-xs">Masculino</SelectItem>
 <SelectItem value="feminino" className="text-xs">Feminino</SelectItem>
 <SelectItem value="infantil" className="text-xs">Infantil</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Status de Exibição</Label>
 <Select
 value={form.status}
 onValueChange={(val: any) => setForm({ ...form, status: val })}
 >
 <SelectTrigger className="rounded-xl h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="active" className="text-xs font-semibold text-emerald-600">● Ativo na Agenda</SelectItem>
 <SelectItem value="archived" className="text-xs text-muted-foreground">● Arquivado / Oculto</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5 pt-1">
 <Label className="text-xs font-bold text-foreground">Foto Ilustrativa do Serviço</Label>
 <ImageUpload
 value={form.image_url}
 onChange={(url) => setForm({ ...form, image_url: url })}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Upload com recorte panorâmico 16:10 para exibição na página de agendamento"
 />
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsSheetOpen(false)}
 className="rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 onClick={() => saveMutation.mutate()}
 disabled={saveMutation.isPending || !form.title.trim()}
 className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-28"
 >
 {saveMutation.isPending ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
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
 </SheetPage>
 </div>
 );
}

