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
 FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { createCourier, vehicleTypeEnum } from "@/services/fleet.functions";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/pedidos/entregadores/novo")({
 head: () => ({ meta: [{ title: "Novo Entregador | Workspace Waesy" }] }),
 component: NovoEntregadorPage,
});

const VEHICLE_OPTIONS = [
 { value: "motorcycle", label: "Moto", icon: Bike },
 { value: "bicycle", label: "Bicicleta", icon: Bike },
 { value: "car", label: "Carro", icon: Car },
 { value: "van", label: "Van / Utilitário", icon: Truck },
 { value: "on_foot", label: "A Pé", icon: User },
 { value: "other", label: "Outro", icon: Truck },
];

function NovoEntregadorPage() {
 const navigate = useNavigate();
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [form, setForm] = useState({
 name: "",
 phone: "",
 cpf: "",
 vehicle_type: "motorcycle" as string,
 vehicle_plate: "",
 default_fee_cents: 0,
 notes: "",
 });

 const feeReais = (form.default_fee_cents / 100).toFixed(2).replace(".", ",");

 function update(field: string, value: string | number) {
 setForm((prev) => ({ ...prev, [field]: value }));
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!form.name.trim()) {
 toast.error("Nome do entregador é obrigatório.");
 return;
 }

 setIsSubmitting(true);
 try {
 await createCourier({
 data: {
 name: form.name.trim(),
 phone: form.phone.trim() || undefined,
 cpf: form.cpf.trim() || undefined,
 vehicle_type: form.vehicle_type as any,
 vehicle_plate: form.vehicle_plate.trim() || undefined,
 default_fee_cents: form.default_fee_cents,
 notes: form.notes.trim() || undefined,
 },
 });
 toast.success(`Entregador "${form.name}" cadastrado com sucesso.`);
 navigate({ to: "/workspace/pedidos/entregadores" });
 } catch (err: any) {
 toast.error(err?.message || "Erro ao cadastrar entregador.");
 } finally {
 setIsSubmitting(false);
 }
 }

 return (
 <div className="flex flex-col h-full">
 <div className="flex items-center gap-3 mb-6">
 <NativeBackButton fallbackHref="/workspace/pedidos/entregadores" />
 <div>
 <h1 className="text-lg font-semibold text-foreground">
 Novo Entregador
 </h1>
 <p className="text-xs text-muted-foreground">
 Cadastre um entregador fixo na frota
 </p>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
 placeholder="Ex: João da Silva"
 className="rounded-xl h-11 border-border/60"
 required
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
 placeholder="(49) 99999-0000"
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
 placeholder="000.000.000-00"
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
 <Label className="text-xs font-semibold">
 Tipo de Veículo *
 </Label>
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
 Placa do Veículo
 </Label>
 <Input
 id="plate"
 value={form.vehicle_plate}
 onChange={(e) =>
 update("vehicle_plate", e.target.value.toUpperCase())
 }
 placeholder="ABC-1D23"
 className="rounded-xl h-11 uppercase border-border/60"
 />
 </div>
 </div>
 </div>

 {/* ── Financeiro ── */}
 <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
 <FileText className="size-3.5" />
 Financeiro & Observações
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
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
 placeholder="0,00"
 className="rounded-xl h-11"
 />
 <p className="text-[10px] text-muted-foreground">
 Valor padrão cobrado por cada entrega realizada
 </p>
 </div>
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
 placeholder="Anotações sobre o entregador, restrições, horários preferenciais..."
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
 type="submit"
 disabled={isSubmitting || !form.name.trim()}
 className="rounded-xl min-w-[140px]"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" />
 Cadastrando...
 </>
 ) : (
 "Cadastrar Entregador"
 )}
 </Button>
 </div>
 </form>
 </div>
 );
}
