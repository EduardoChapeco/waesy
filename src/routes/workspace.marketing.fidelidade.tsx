import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog";
import {
 Award,
 QrCode,
 Smartphone,
 Coffee,
 Utensils,
 Gift,
 Scissors,
 Plane,
 HeartHandshake,
 Check,
 Plus,
 Stamp,
 Users,
 CreditCard,
 Share2,
} from "lucide-react";
import {
 getStoreLoyaltyProgram,
 saveStoreLoyaltyProgram,
 listStoreLoyaltyCustomers,
 stampCustomerCard,
 redeemLoyaltyReward,
} from "@/services/loyalty.functions";
import type { CustomerLoyaltyCard } from "@/services/loyalty.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/marketing/fidelidade")({
 head: () => ({ meta: [{ title: "Programa de Fidelidade | Workspace Waesy" }] }),
 component: LoyaltyDashboardPage,
});

const STAMP_ICONS: Array<{ id: string; label: string; icon: any }> = [
 { id: "award", label: "Medalha", icon: Award },
 { id: "coffee", label: "Café", icon: Coffee },
 { id: "utensils", label: "Prato", icon: Utensils },
 { id: "gift", label: "Presente", icon: Gift },
 { id: "scissors", label: "Tesoura", icon: Scissors },
 { id: "plane", label: "Viagem", icon: Plane },
 { id: "heart", label: "Coração", icon: HeartHandshake },
];

export default function LoyaltyDashboardPage() {
 const queryClient = useQueryClient();

 // Queries
 const { data: program, isLoading: loadingProgram } = useQuery({
 queryKey: ["loyalty-program"],
 queryFn: () => getStoreLoyaltyProgram(),
 });

 const { data: customers = [], isLoading: loadingCustomers } = useQuery({
 queryKey: ["loyalty-customers"],
 queryFn: () => listStoreLoyaltyCustomers(),
 });

 // Form State
 const [name, setName] = useState("");
 const [targetStamps, setTargetStamps] = useState(10);
 const [welcomeStamps, setWelcomeStamps] = useState(0);
 const [rewardDesc, setRewardDesc] = useState("");
 const [cardBgColor, setCardBgColor] = useState("#18181B");
 const [cardTextColor, setCardTextColor] = useState("#FFFFFF");
 const [stampIcon, setStampIcon] = useState("star");
 const [proximityAlerts, setProximityAlerts] = useState(false);

 // Sync initial program state
 useEffect(() => {
 if (program) {
 setName(program.name || "");
 setTargetStamps(program.target_stamps || 10);
 setWelcomeStamps(program.welcome_stamps || 0);
 setRewardDesc(program.reward_description || "");
 setCardBgColor(program.card_bg_color || "#18181B");
 setCardTextColor(program.card_text_color || "#FFFFFF");
 setStampIcon(program.stamp_icon || "star");
 setProximityAlerts(program.proximity_alerts_enabled || false);
 }
 }, [program]);

 // Mutations
 const { mutate: handleSave, isPending: isSaving } = useMutation({
 mutationFn: saveStoreLoyaltyProgram,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["loyalty-program"] });
 toast.success("Programa de fidelidade salvo com sucesso!");
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao salvar programa.");
 },
 });

 const { mutate: handleStamp, isPending: isStamping } = useMutation({
 mutationFn: stampCustomerCard,
 onSuccess: (card: any) => {
 const typedCard = card as CustomerLoyaltyCard;
 queryClient.invalidateQueries({ queryKey: ["loyalty-customers"] });
 toast.success(`Selo carimbado! O cliente possui ${typedCard.current_stamps} selos.`);
 setStampDialogOpen(false);
 setStampPhone("");
 setStampCustomerName("");
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao carimbar.");
 },
 });

 const { mutate: handleRedeem, isPending: isRedeeming } = useMutation({
 mutationFn: redeemLoyaltyReward,
 onSuccess: (res: any) => {
 const typedRes = res as { success: boolean; reward: string; remaining_stamps: number };
 queryClient.invalidateQueries({ queryKey: ["loyalty-customers"] });
 toast.success(`Recompensa resgatada com sucesso: ${typedRes.reward}!`);
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao resgatar.");
 },
 });

 // Stamp Modal State
 const [stampDialogOpen, setStampDialogOpen] = useState(false);
 const [stampPhone, setStampPhone] = useState("");
 const [stampCustomerName, setStampCustomerName] = useState("");
 const [stampsToAdd, setStampsToAdd] = useState(1);

 const SelectedIconComponent =
 STAMP_ICONS.find((i) => i.id === stampIcon)?.icon || Award;

 return (
 <div className="w-full space-y-6">
 <PageHeader
 title="Programa de Fidelidade Digital"
 actions={
 <div className="flex items-center gap-2">
 <Dialog open={stampDialogOpen} onOpenChange={setStampDialogOpen}>
 <DialogTrigger asChild>
 <Button className="gap-2 font-bold shadow-xs">
 <Stamp className="size-4" />
 Carimbar Selo
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle className="font-bold flex items-center gap-2">
 <Stamp className="size-5 text-primary" />
 Carimbar Cartão do Cliente
 </DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-2">
 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 WhatsApp / Telefone do Cliente *
 </Label>
 <Input
 placeholder="(49) 99999-9999"
 value={stampPhone}
 onChange={(e) => setStampPhone(e.target.value)}
 className="mt-1"
 />
 </div>
 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Nome do Cliente (Opcional)
 </Label>
 <Input
 placeholder="Ex: João da Silva"
 value={stampCustomerName}
 onChange={(e) => setStampCustomerName(e.target.value)}
 className="mt-1"
 />
 </div>
 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Quantidade de Selos
 </Label>
 <div className="flex items-center gap-2 mt-1">
 {[1, 2, 3, 5].map((n) => (
 <Button
 key={n}
 type="button"
 variant={stampsToAdd === n ? "default" : "outline"}
 size="sm"
 onClick={() => setStampsToAdd(n)}
 className="flex-1 font-bold"
 >
 +{n} {n === 1 ? "Selo" : "Selos"}
 </Button>
 ))}
 </div>
 </div>
 <Button
 onClick={() =>
 handleStamp({
 data: {
 phone: stampPhone,
 customer_name: stampCustomerName,
 stamps_to_add: stampsToAdd,
 },
 })
 }
 disabled={!stampPhone || isStamping}
 className="w-full font-bold mt-2"
 >
 {isStamping ? "Carimbando..." : "Confirmar e Carimbar"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 }
 />

 <Tabs defaultValue="config" className="w-full">
 <TabsList className="bg-muted/60 p-1 rounded-xl mb-6">
 <TabsTrigger value="config" className="rounded-lg font-bold text-xs gap-1.5">
 <CreditCard className="size-4" />
 Configurar Cartão & Wallet
 </TabsTrigger>
 <TabsTrigger value="customers" className="rounded-lg font-bold text-xs gap-1.5">
 <Users className="size-4" />
 Clientes & Selos ({customers.length})
 </TabsTrigger>
 </TabsList>

 {/* ABA 1: CONFIGURAÇÃO DO CARTÃO & PREVIEW AO VIVO */}
 <TabsContent value="config">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Formulário de Configurações */}
 <div className="lg:col-span-7 bg-card rounded-2xl border border-border/80 p-6 space-y-6 shadow-2xs">
 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Nome do Cartão de Fidelidade *
 </Label>
 <Input
 placeholder="Ex: Cartão Fidelidade Café & Delícias"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="mt-1 font-medium"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Quantidade de Selos (Meta)
 </Label>
 <Input
 type="number"
 min={3}
 max={25}
 value={targetStamps}
 onChange={(e) => setTargetStamps(parseInt(e.target.value, 10) || 10)}
 className="mt-1"
 />
 <p className="text-[11px] text-muted-foreground mt-1">Recomendado: 10 selos</p>
 </div>

 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Selos de Boas-Vindas
 </Label>
 <Input
 type="number"
 min={0}
 max={5}
 value={welcomeStamps}
 onChange={(e) => setWelcomeStamps(parseInt(e.target.value, 10) || 0)}
 className="mt-1"
 />
 <p className="text-[11px] text-muted-foreground mt-1">Selos que o cliente recebe ao cadastrar</p>
 </div>
 </div>

 <div>
 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Recompensa / Prêmio ao Completar *
 </Label>
 <Input
 placeholder="Ex: 1 Café Espresso Grátis, 1 Sobremesa da Casa, 10% de Desconto"
 value={rewardDesc}
 onChange={(e) => setRewardDesc(e.target.value)}
 className="mt-1"
 />
 </div>

 {/* Personalização Visual */}
 <div className="pt-4 border-t border-border/60 space-y-4">
 <h3 className="font-bold text-sm tracking-tight">Personalização do Passe Digital</h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <Label className="text-xs font-bold text-muted-foreground">Cor do Fundo do Cartão</Label>
 <div className="flex items-center gap-2 mt-1">
 <input
 type="color"
 value={cardBgColor}
 onChange={(e) => setCardBgColor(e.target.value)}
 className="size-9 rounded-lg cursor-pointer border border-border"
 />
 <Input
 value={cardBgColor}
 onChange={(e) => setCardBgColor(e.target.value)}
 className="font-mono text-xs uppercase"
 />
 </div>
 </div>

 <div>
 <Label className="text-xs font-bold text-muted-foreground">Cor do Texto</Label>
 <div className="flex items-center gap-2 mt-1">
 <input
 type="color"
 value={cardTextColor}
 onChange={(e) => setCardTextColor(e.target.value)}
 className="size-9 rounded-lg cursor-pointer border border-border"
 />
 <Input
 value={cardTextColor}
 onChange={(e) => setCardTextColor(e.target.value)}
 className="font-mono text-xs uppercase"
 />
 </div>
 </div>
 </div>

 <div>
 <Label className="text-xs font-bold text-muted-foreground">Ícone dos Selos</Label>
 <div className="flex flex-wrap gap-2 mt-1.5">
 {STAMP_ICONS.map((item) => {
 const Icon = item.icon;
 const isSelected = stampIcon === item.id;
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => setStampIcon(item.id)}
 className={cn(
 "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
 isSelected
 ? "bg-primary text-primary-foreground border-primary shadow-xs"
 : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
 )}
 >
 <Icon className="size-3.5" />
 {item.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 <Button
 onClick={() =>
 handleSave({
 data: {
 id: program?.id,
 name: name || "Cartão Fidelidade",
 target_stamps: targetStamps,
 welcome_stamps: welcomeStamps,
 reward_description: rewardDesc || "Recompensa Especial",
 card_bg_color: cardBgColor,
 card_text_color: cardTextColor,
 stamp_icon: stampIcon,
 proximity_alerts_enabled: proximityAlerts,
 status: "active",
 },
 })
 }
 disabled={isSaving}
 className="w-full font-bold h-11 text-sm shadow-xs"
 >
 {isSaving ? "Salvando Programa..." : "Salvar Programa de Fidelidade"}
 </Button>
 </div>

 {/* Simulador de Cartão Wallet em Tempo Real */}
 <div className="lg:col-span-5 flex flex-col items-center">
 <div className="w-full max-w-[340px] bg-card rounded-2xl border-4 border-foreground/10 p-4 shadow-xs space-y-4">
 {/* Cartão de Fidelidade Digital (Wallet Pass) */}
 <div
 style={{ backgroundColor: cardBgColor, color: cardTextColor }}
 className="rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[360px] relative overflow-hidden transition-all duration-300"
 >
 {/* Topo do Cartão */}
 <div className="flex items-start justify-between">
 <div>
 <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">
 Cartão Fidelidade
 </span>
 <h4 className="font-black text-lg leading-tight mt-0.5">
 {name || "Seu Cartão Fidelidade"}
 </h4>
 </div>
 <div className="size-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
 <SelectedIconComponent className="size-4" />
 </div>
 </div>

 {/* Grade de Selos */}
 <div className="my-4 py-3 bg-white/10 backdrop-blur-xs rounded-xl p-3">
 <div className="flex items-center justify-between text-xs font-bold mb-2">
 <span>Selos: 3/{targetStamps}</span>
 <span className="text-[10px] uppercase opacity-80">
 {rewardDesc || "Recompensa"}
 </span>
 </div>

 <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 justify-items-center">
 {Array.from({ length: targetStamps }).map((_, i) => {
 const isStamped = i < 3;
 return (
 <div
 key={i}
 className={cn(
 "size-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
 isStamped
 ? "bg-white text-black border-white shadow-xs"
 : "bg-black/20 text-white/40 border-white/20",
 )}
 >
 {isStamped ? <SelectedIconComponent className="size-4 text-emerald-600" /> : i + 1}
 </div>
 );
 })}
 </div>
 </div>

 {/* QR Code & Token */}
 <div className="bg-white text-black p-3 rounded-xl flex flex-col items-center justify-center space-y-1 shadow-xs">
 <div className="size-20 bg-muted/30 border border-border flex items-center justify-center rounded-lg">
 <QrCode className="size-16 text-foreground" />
 </div>
 <span className="font-mono text-[11px] font-bold tracking-wider">
 CARD-9821-4029
 </span>
 </div>
 </div>

  {/* Compatibilidade de Carteira Digital */}
  <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-muted-foreground pt-1">
  <span className="flex items-center gap-1.5">
  <Smartphone className="size-3.5 text-foreground" /> Carteira Digital & QR Code
  </span>
  </div>
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ABA 2: CLIENTES COM CARTÕES ATIVOS */}
 <TabsContent value="customers">
 <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-2xs">
 {customers.length === 0 ? (
 <div className="p-12 text-center text-muted-foreground">
 <Stamp className="size-10 mx-auto text-muted-foreground/40 mb-3" />
 <h4 className="font-bold text-base text-foreground">Nenhum cliente carimbado ainda</h4>
 <p className="text-xs mt-1">
 Use o botão "Carimbar Selo" acima no balcão ou caixa para fidelizar seu primeiro cliente.
 </p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Cliente / WhatsApp</TableHead>
 <TableHead>Código do Cartão</TableHead>
 <TableHead>Selos Atuais</TableHead>
 <TableHead>Total Acumulado</TableHead>
 <TableHead>Recompensas Resgatadas</TableHead>
 <TableHead className="text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {customers.map((c: any) => {
 const target = program?.target_stamps || 10;
 const canRedeem = c.current_stamps >= target;

 return (
 <TableRow key={c.id}>
 <TableCell>
 <div className="font-bold text-sm">{c.customer_name || "Cliente"}</div>
 <div className="text-xs text-muted-foreground font-mono">{c.customer_phone}</div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="font-mono text-xs">
 {c.card_token}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1.5">
 <span className="font-black text-sm">{c.current_stamps}</span>
 <span className="text-muted-foreground text-xs">/ {target}</span>
 {canRedeem && (
 <Badge variant="default" className="bg-emerald-600 text-white text-[10px] ml-1">
 Pronto p/ Resgate
 </Badge>
 )}
 </div>
 </TableCell>
 <TableCell className="text-sm font-medium">{c.total_stamps_earned} selos</TableCell>
 <TableCell className="text-sm font-medium">{c.total_rewards_redeemed}</TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setStampPhone(c.customer_phone);
 setStampCustomerName(c.customer_name || "");
 setStampDialogOpen(true);
 }}
 className="text-xs font-bold gap-1"
 >
 <Stamp className="size-3.5" /> + Carimbar
 </Button>
 {canRedeem && (
 <Button
 variant="default"
 size="sm"
 onClick={() => handleRedeem({ data: { card_id: c.id } })}
 disabled={isRedeeming}
 className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold gap-1"
 >
 <Gift className="size-3.5" /> Resgatar
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 )}
 </div>
 </TabsContent>
 </Tabs>
 </div>
 );
}
