import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
 Car,
 Bike,
 Truck,
 ArrowLeft,
 Loader2,
 User,
 Phone,
 CreditCard,
 CheckCircle2,
 XCircle,
 Clock,
 Ban,
 Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 listCouriers,
 updateCourier,
 type CourierSummaryDTO,
} from "@/services/fleet.functions";
import { toast } from "sonner";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/pedidos/entregadores/$id")({
 head: () => ({
 meta: [{ title: "Detalhe do Entregador | Workspace Waesy" }],
 }),
 loader: async ({ params }) => {
   try {
 const couriers = await listCouriers({ data: {} }).catch(() => []);
 const courier = couriers.find(
 (c: CourierSummaryDTO) => c.id === params.id,
 );
 return { courier: courier || null, id: params.id };
   } catch (err) {
     console.error("[loader:workspace.pedidos.entregadores.$id] Unhandled loader error:", err);
     return { courier: null, id: null };
   }
 },
 component: EntregadorDetailPage,
});

const VEHICLE_OPTIONS = [
 { value: "motorcycle", label: "Moto", icon: Bike },
 { value: "bicycle", label: "Bicicleta", icon: Bike },
 { value: "car", label: "Carro", icon: Car },
 { value: "van", label: "Van / Utilitário", icon: Truck },
 { value: "on_foot", label: "A Pé", icon: User },
 { value: "other", label: "Outro", icon: Truck },
];

const STATUS_OPTIONS = [
 {
 value: "available",
 label: "Disponível",
 icon: CheckCircle2,
 color: "text-emerald-600",
 },
 {
 value: "on_route",
 label: "Em Rota",
 icon: Truck,
 color: "text-info",
 },
 {
 value: "offline",
 label: "Offline",
 icon: Clock,
 color: "text-muted-foreground",
 },
 {
 value: "suspended",
 label: "Suspenso",
 icon: Ban,
 color: "text-destructive",
 },
];

function EntregadorDetailPage() {
 const navigate = useNavigate();
 const { courier, id } = ((Route.useLoaderData?.() as any) || {});
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [form, setForm] = useState({
 name: courier?.name || "",
 phone: courier?.phone || "",
 cpf: courier?.cpf || "",
 vehicle_type: courier?.vehicle_type || "motorcycle",
 vehicle_plate: courier?.vehicle_plate || "",
 default_fee_cents: courier?.default_fee_cents || 0,
 notes: courier?.notes || "",
 status: courier?.status || "available",
 });

 function update(field: string, value: string | number) {
 setForm((prev) => ({ ...prev, [field]: value }));
 }

 async function handleSave() {
 if (!form.name.trim()) {
 toast.error("Nome é obrigatório.");
 return;
 }

 setIsSubmitting(true);
 try {
 await updateCourier({
 data: {
 courier_id: id,
 data: {
 name: form.name.trim(),
 phone: form.phone.trim() || undefined,
 cpf: form.cpf.trim() || undefined,
 vehicle_type: form.vehicle_type as any,
 vehicle_plate: form.vehicle_plate.trim() || undefined,
 default_fee_cents: form.default_fee_cents,
 notes: form.notes.trim() || undefined,
 status: form.status as any,
 },
 },
 });
 toast.success("Entregador atualizado com sucesso.");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar entregador.");
 } finally {
 setIsSubmitting(false);
 }
 }

 if (!courier) {
 return (
 <div className="py-20">
 <EmptyState
 title="Entregador não encontrado"
 action={
 <Button
 onClick={() =>
 navigate({ to: "/workspace/pedidos/entregadores" })
 }
 className="rounded-xl"
 >
 Voltar para lista
 </Button>
 }
 />
 </div>
 );
 }

 const currentStatus = STATUS_OPTIONS.find(
 (s) => s.value === form.status,
 );

 return (
 <div className="flex flex-col h-full">
 {/* Header */}
 <div className="flex items-center justify-between gap-3 mb-6">
 <div className="flex items-center gap-3">
 <NativeBackButton fallbackHref="/workspace/pedidos/entregadores" />
 <div>
 <h1 className="text-lg font-semibold text-foreground">
 {courier.name}
 </h1>
 <p className="text-xs text-muted-foreground">
 Cadastrado em{" "}
 {new Date(courier.created_at).toLocaleDateString("pt-BR")}
 </p>
 </div>
 </div>

 <Badge
 variant={
 form.status === "available"
 ? "default"
 : form.status === "suspended"
 ? "destructive"
 : "secondary"
 }
 className="gap-1.5"
 >
 {currentStatus && <currentStatus.icon className="size-3" />}
 {currentStatus?.label || form.status}
 </Badge>
 </div>

 <div className="space-y-6 max-w-2xl">
 {/* ── Status ── */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Status Operacional
 </div>
 <Select
 value={form.status}
 onValueChange={(v) => update("status", v)}
 >
 <SelectTrigger className="rounded-xl h-11 max-w-xs border-border/60">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 {STATUS_OPTIONS.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 <span className="flex items-center gap-2">
 <opt.icon className={`size-4 ${opt.color}`} />
 {opt.label}
 </span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* ── Dados Pessoais ── */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
 <User className="size-3.5" />
 Dados Pessoais
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label htmlFor="name" className="text-xs font-semibold">
 Nome Completo *
 </Label>
 <Input
 id="name"
 value={form.name}
 onChange={(e) => update("name", e.target.value)}
 className="rounded-xl h-11 border-border/60"
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="phone" className="text-xs font-semibold">
 Telefone / WhatsApp
 </Label>
 <div className="relative">
 <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 id="phone"
 value={form.phone}
 onChange={(e) => update("phone", e.target.value)}
 className="rounded-xl h-11 pl-10 border-border/60"
 />
 </div>
 </div>

 <div className="space-y-1.5 sm:col-span-2">
 <Label htmlFor="cpf" className="text-xs font-semibold">
 CPF
 </Label>
 <div className="relative">
 <CreditCard className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 id="cpf"
 value={form.cpf}
 onChange={(e) => update("cpf", e.target.value)}
 className="rounded-xl h-11 pl-10 border-border/60"
 />
 </div>
 </div>
 </div>
 </div>

 {/* ── Veículo ── */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
 <Car className="size-3.5" />
 Veículo
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Tipo de Veículo</Label>
 <Select
 value={form.vehicle_type}
 onValueChange={(v) => update("vehicle_type", v)}
 >
 <SelectTrigger className="rounded-xl h-11 border-border/60">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 {VEHICLE_OPTIONS.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 <span className="flex items-center gap-2">
 <opt.icon className="size-4" />
 {opt.label}
 </span>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="plate" className="text-xs font-semibold">
 Placa
 </Label>
 <Input
 id="plate"
 value={form.vehicle_plate}
 onChange={(e) =>
 update("vehicle_plate", e.target.value.toUpperCase())
 }
 className="rounded-xl h-11 uppercase border-border/60"
 />
 </div>
 </div>
 </div>

 {/* ── Financeiro ── */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Taxa & Observações
 </div>

 <div className="space-y-1.5 max-w-xs">
 <Label htmlFor="fee" className="text-xs font-semibold">
 Taxa Padrão por Entrega (R$)
 </Label>
 <Input
 id="fee"
 type="number"
 min="0"
 step="0.01"
 value={(form.default_fee_cents / 100).toFixed(2)}
 onChange={(e) =>
 update(
 "default_fee_cents",
 Math.round(parseFloat(e.target.value || "0") * 100),
 )
 }
 className="rounded-xl h-11"
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="notes" className="text-xs font-semibold">
 Observações Internas
 </Label>
 <textarea
 id="notes"
 rows={3}
 value={form.notes}
 onChange={(e) => update("notes", e.target.value)}
 className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 </div>

 {/* ── Ações ── */}
 <div className="flex items-center justify-end gap-3 pt-2 pb-6">
 <Button
 type="button"
 variant="outline"
 onClick={() =>
 navigate({ to: "/workspace/pedidos/entregadores" })
 }
 className="rounded-xl"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleSave}
 disabled={isSubmitting || !form.name.trim()}
 className="rounded-xl min-w-[140px]"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" />
 Salvando...
 </>
 ) : (
 <>
 <Save className="size-4 mr-2" />
 Salvar Alterações
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 );
}
