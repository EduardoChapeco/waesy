import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sliders, Plus, Trash2, Edit2, Calendar, Layers, Clock, Ticket, DollarSign, Repeat, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 listWorkspacePackages,
 saveServicePackage,
 deleteServicePackage,
} from "@/services/service-packages.functions";
import { listBookingServices } from "@/services/booking.functions";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/pacotes/")({
 head: () => ({ meta: [{ title: "Gestão de Pacotes & Passes de Aulas | Workspace" }] }),
 component: WorkspacePackagesPage,
});

function WorkspacePackagesPage() {
 const queryClient = useQueryClient();
 const [isOpen, setIsOpen] = useState(false);
 const [editingPkg, setEditingPkg] = useState<any | null>(null);

 const { data: packages = [], isLoading } = useQuery({
 queryKey: ["workspace-packages"],
 queryFn: () => listWorkspacePackages(),
 });

 const { data: servicesRes } = useQuery({
 queryKey: ["booking-services-list"],
 queryFn: () => listBookingServices(),
 });

 const services = servicesRes?.data || [];

 const saveMutation = useMutation({
 mutationFn: async (payload: any) => {
 return await saveServicePackage({ data: payload });
 },
 onSuccess: () => {
 toast.success("Pacote de aulas salvo com sucesso!");
 setIsOpen(false);
 setEditingPkg(null);
 queryClient.invalidateQueries({ queryKey: ["workspace-packages"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao salvar pacote.");
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 return await deleteServicePackage({ data: { id } });
 },
 onSuccess: () => {
 toast.success("Pacote removido.");
 queryClient.invalidateQueries({ queryKey: ["workspace-packages"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao remover pacote.");
 },
 });

 const handleOpenNew = () => {
 setEditingPkg({
 title: "",
 description: "",
 service_id: services[0]?.id || "",
 total_credits: 10,
 price_cents: 15000,
 validity_days: 30,
 is_recurring: false,
 recurrence_interval: "monthly",
 is_active: true,
 });
 setIsOpen(true);
 };

 const handleOpenEdit = (pkg: any) => {
 setEditingPkg({ ...pkg });
 setIsOpen(true);
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <PageHeader
 title="Pacotes & Passes de Aulas"
 actions={
 <Button
 onClick={handleOpenNew}
 className="rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 h-9 text-xs"
 >
 <Plus className="size-3.5 mr-1.5" />
 Novo Pacote
 </Button>
 }
 />

 {packages.length === 0 ? (
 <EmptyState
 title="Nenhum pacote cadastrado"
 description="Crie passes de aulas, mensalidades ou combos de sessões com desconto."
 action={
 <Button onClick={handleOpenNew} className="rounded-xl font-bold text-xs h-9">
 <Plus className="size-3.5 mr-1.5" /> Criar Primeiro Pacote
 </Button>
 }
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {packages.map((pkg: any) => (
 <div
 key={pkg.id}
 className="p-5 rounded-2xl bg-card space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-all "
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Ticket size={16} />
 </span>
 <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">
 {pkg.total_credits} {pkg.total_credits === 1 ? "Sessão" : "Sessões"}
 </Badge>
 </div>
 <Badge
 className={`text-[10px] font-mono ${
 pkg.is_active
 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
 : "bg-muted text-muted-foreground "
 }`}
 >
 {pkg.is_active ? "Ativo" : "Inativo"}
 </Badge>
 </div>

 <div>
 <h3 className="text-base font-bold text-foreground leading-tight">
 {pkg.title}
 </h3>
 <span className="text-xs text-muted-foreground font-medium block mt-0.5">
 Serviço: {pkg.booking_services?.title || "Geral"}
 </span>
 </div>

 {pkg.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {pkg.description}
 </p>
 )}

 <div className="p-3 rounded-2xl bg-muted/40 flex items-center justify-between text-xs font-mono">
 <div>
 <span className="text-[10px] text-muted-foreground uppercase block">
 Preço do Pacote
 </span>
 <span className="text-sm font-black text-foreground">
 {formatMoney(pkg.price_cents)}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground uppercase block">
 Validade
 </span>
 <span className="text-xs font-bold text-foreground">
 {pkg.validity_days} dias
 </span>
 </div>
 </div>
 </div>

 <div className="pt-3 flex items-center justify-between">
 <span className="text-[11px] text-muted-foreground">
 {pkg.is_recurring ? "🔄 Assinatura Recorrente" : "🎟️ Compra Avulsa"}
 </span>
 <div className="flex items-center gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleOpenEdit(pkg)}
 className="h-8 px-3 rounded-xl border-border text-xs font-semibold"
 >
 <Edit2 className="size-3.5 mr-1" /> Editar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 if (confirm(`Remover pacote "${pkg.title}"?`)) {
 deleteMutation.mutate(pkg.id);
 }
 }}
 className="h-8 px-2 rounded-xl text-rose-500 hover:bg-rose-500/10"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* ── Sheet Lateral de Criação / Edição de Pacote (Eliminando Dialog Popup) ── */}
 <Sheet open={isOpen} onOpenChange={setIsOpen}>
 <SheetContent
 side="right"
 size="wide"
 className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col justify-between"
 >
 <div className="p-6 space-y-4">
 <SheetHeader className="pb-3 border-b border-border/60">
 <SheetTitle className="text-base font-bold text-foreground">
 {editingPkg?.id ? "Editar Pacote de Aulas / Serviços" : "Novo Pacote de Aulas / Serviços"}
 </SheetTitle>
 </SheetHeader>

 {editingPkg && (
 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Serviço Vinculado *</Label>
 <Select
 value={editingPkg.service_id}
 onValueChange={(val) => setEditingPkg({ ...editingPkg, service_id: val })}
 >
 <SelectTrigger className="rounded-xl h-10 text-xs">
 <SelectValue placeholder="Selecione o serviço..." />
 </SelectTrigger>
 <SelectContent>
 {services.map((s: any) => (
 <SelectItem key={s.id} value={s.id} className="text-xs">
 {s.title} ({s.duration_minutes} min)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Título do Pacote *</Label>
 <Input
 placeholder="ex: Combo 10 Aulas de Pilates, Plano Mensal 2x/Semana"
 value={editingPkg.title || ""}
 onChange={(e) => setEditingPkg({ ...editingPkg, title: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Descrição / Benefícios</Label>
 <Input
 placeholder="ex: Válido para horários matutinos e noturnos com reposição de até 2 aulas."
 value={editingPkg.description || ""}
 onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Qtd. de Aulas / Créditos *</Label>
 <Input
 type="number"
 min={1}
 value={editingPkg.total_credits || 1}
 onChange={(e) =>
 setEditingPkg({ ...editingPkg, total_credits: Number(e.target.value) })
 }
 className="rounded-xl h-10 text-xs font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Preço Total (R$) *</Label>
 <CurrencyField
 value={editingPkg.price_cents}
 onChange={(cents) =>
 setEditingPkg({
 ...editingPkg,
 price_cents: cents ?? 0,
 })
 }
 placeholder="0,00"
 allowZero={false}
 className="rounded-xl h-10 text-xs font-mono font-bold"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Validade (Dias) *</Label>
 <Input
 type="number"
 min={1}
 value={editingPkg.validity_days || 30}
 onChange={(e) =>
 setEditingPkg({ ...editingPkg, validity_days: Number(e.target.value) })
 }
 className="rounded-xl h-10 text-xs font-mono"
 />
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <Label className="text-xs font-bold block">Assinatura Recorrente</Label>
 <span className="text-[10px] text-muted-foreground">
 Renovação automática mensal
 </span>
 </div>
 <Switch
 checked={editingPkg.is_recurring}
 onCheckedChange={(val) => setEditingPkg({ ...editingPkg, is_recurring: val })}
 />
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-border/40">
 <div>
 <Label className="text-xs font-bold block">Status Ativo</Label>
 <span className="text-[10px] text-muted-foreground">
 Disponível para compra pública
 </span>
 </div>
 <Switch
 checked={editingPkg.is_active}
 onCheckedChange={(val) => setEditingPkg({ ...editingPkg, is_active: val })}
 />
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="p-6 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
 <Button
 variant="outline"
 onClick={() => setIsOpen(false)}
 className="rounded-xl text-xs font-bold border-border h-10 px-4 cursor-pointer"
 >
 Cancelar
 </Button>
 <Button
 disabled={saveMutation.isPending}
 onClick={() => saveMutation.mutate(editingPkg)}
 className="rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 h-10 px-5 cursor-pointer"
 >
 {saveMutation.isPending ? "Salvando..." : "Salvar Pacote"}
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 </div>
 );
}
