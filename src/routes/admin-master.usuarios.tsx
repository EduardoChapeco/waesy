import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Search, ShieldAlert, FileText, Key, Ban, CheckCircle2, AlertTriangle, Loader2, Lock, Download, Copy } from "lucide-react";
import { listAllUsers, applyUserSanction, getUser360Dossier, adminTriggerPasswordReset, adminUpdateUserRole } from "@/services/master.functions";
import { triggerCivilIdentityRippleCascade } from "@/services/deep-core.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/datetime";

import { ErrorState } from "@/components/state/states";

export const Route = createFileRoute("/admin-master/usuarios")({
 head: () => ({ meta: [{ title: "Gestão Global de Usuários e Sanções | Admin Master" }] }),
 loader: async () => {
 try {
 const users = await listAllUsers().catch(() => []);
 return { users: users || [] };
 } catch {
 return { users: [] };
 }
 },
 component: AdminUsuariosPage,
 errorComponent: () => (
 <div className="mx-auto max-w-xl px-4 py-20">
 <ErrorState
 title="Painel de Usuários Indisponível"
 description="Não foi possível carregar os dados de usuários no momento. Verifique sua conexão e permissão de acesso."
 onRetry={() => {
 if (typeof window !== "undefined") window.location.reload();
 }}
 />
 </div>
 ),
});

function AdminUsuariosPage() {
 const { users: initialUsers } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [search, setSearch] = useState("");
 const [selectedUser, setSelectedUser] = useState<any | null>(null);
 const [dossierData, setDossierData] = useState<any | null>(null);
 const [isLoadingDossier, setIsLoadingDossier] = useState(false);

 // Sanction Modal States
 const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
 const [sanctionType, setSanctionType] = useState<string>("warning");
 const [sanctionReason, setSanctionReason] = useState("");
 const [durationDays, setDurationDays] = useState<number>(7);
 const [isApplyingSanction, setIsApplyingSanction] = useState(false);
 const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

 const handleRoleChange = async (userId: string, newRole: string) => {
   setUpdatingRoleId(userId);
   try {
     const res = await adminUpdateUserRole({
       data: { targetUserId: userId, newRole: newRole as any },
     });
     toast.success(res.message);
     router.invalidate();
   } catch (err: any) {
     toast.error(err?.message || "Erro ao alterar nível do usuário.");
   } finally {
     setUpdatingRoleId(null);
   }
 };

 const filteredUsers = (initialUsers || []).filter((u: any) => {
 if (!search.trim()) return true;
 const q = search.toLowerCase();
 return (
 u.full_name?.toLowerCase().includes(q) ||
 u.tax_id?.toLowerCase().includes(q) ||
 u.id?.toLowerCase().includes(q)
 );
 });

 const handleOpenDossier = async (user: any) => {
 setSelectedUser(user);
 setIsLoadingDossier(true);
 try {
 const res = await getUser360Dossier({ data: { userId: user.id } });
 setDossierData(res);
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao gerar dossiê judicial.");
 } finally {
 setIsLoadingDossier(false);
 }
 };

 const handleSendResetPassword = async (email: string) => {
 if (!confirm(`Deseja disparar um link mágico de redefinição de senha para ${email}?`)) return;
 try {
 const res = await adminTriggerPasswordReset({ data: { email } });
 toast.success(res.message);
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao enviar e-mail de recuperação");
 }
 };

 const handleApplySanction = async () => {
 if (!selectedUser) return;
 if (!sanctionReason.trim()) {
 toast.error("Informe o motivo da sanção disciplinar.");
 return;
 }

 setIsApplyingSanction(true);
 try {
 await applyUserSanction({
 data: {
 userId: selectedUser.id,
 sanctionType: sanctionType as any,
 reason: sanctionReason,
 durationDays: sanctionType === "ban_temporary" ? durationDays : undefined,
 },
 });

 // FASE 3 (V113): Dispara Efeito Cascata Cross-Module (Personas, Classificados, Vagas/Currículos e Ad-Tech)
 if (sanctionType !== "warning") {
 const cascadeRes = await triggerCivilIdentityRippleCascade({
 data: {
 targetProfileId: selectedUser.id,
 action: sanctionType.includes("permanent") ? "ban" : "suspend",
 reason: sanctionReason,
 },
 }).catch(() => null);

 if (cascadeRes?.ripple_effect) {
 const r = cascadeRes.ripple_effect;
 toast.success(
 `Cascata executada: ${r.archived_classifieds} classificados arquivados, ${r.withdrawn_job_applications} candidaturas retiradas e ${r.paused_ad_campaigns} campanhas pausadas.`
 );
 } else {
 toast.success("Sanção disciplinar e cascata sistêmica aplicadas!");
 }
 } else {
 toast.success("Sanção disciplinar aplicada com sucesso!");
 }
 setIsSanctionModalOpen(false);
 setSelectedUser(null);
 setSanctionReason("");
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao aplicar sanção");
 } finally {
 setIsApplyingSanction(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
 <div>
 <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
 <Users className="size-6 text-primary" />
 Usuários
 </h1>
 <p className="text-sm text-muted-foreground">
 Controle de acessos, emissão de dossiês probatórios judiciais e punições graduais.
 </p>
 </div>

 <div className="w-full sm:w-72">
 <Input
 placeholder="Buscar por nome, CPF ou ID..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>

 <div className=" bg-card rounded-xl overflow-hidden ">
 <div className="divide-y divide-border">
 {filteredUsers.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground text-sm">
 Nenhum usuário encontrado com os filtros atuais.
 </div>
 ) : (
 filteredUsers.map((u: any) => {
 const activeSanctions = (u.user_moderation_sanctions || []).filter(
 (s: any) => s.is_active,
 );

 return (
 <div
 key={u.id}
 className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
 >
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-bold text-sm text-foreground">
 {u.full_name || "Usuário sem nome"}
 </span>
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 {u.role}
 </Badge>
 {u.is_verified && (
 <Badge className="bg-info text-white text-[10px]">
 ✓ Verificado
 </Badge>
 )}
 {activeSanctions.length > 0 && (
 <Badge variant="destructive" className="text-[10px]">
 {activeSanctions.length} Sanção(ões) Ativa(s)
 </Badge>
 )}
 </div>
 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
 <span>CPF/Doc: {u.tax_id || "Não informado"}</span>
 <span>ID: {u.id.slice(0, 8)}...</span>
 <span>Cadastrado em {formatDateTime(u.created_at)}</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <div className="w-40">
 <Select
 value={u.role || "customer"}
 onValueChange={(val) => handleRoleChange(u.id, val)}
 disabled={updatingRoleId === u.id}
 >
 <SelectTrigger className="h-8 text-xs font-mono font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="customer">customer (Cliente)</SelectItem>
 <SelectItem value="store_owner">store_owner (Lojista)</SelectItem>
 <SelectItem value="operator">operator (Operador)</SelectItem>
 <SelectItem value="platform_admin">platform_admin (Master)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Button
 variant="outline"
 size="sm"
 className="text-xs gap-1.5"
 onClick={() => handleOpenDossier(u)}
 >
 <FileText className="size-3.5" />
 Dossiê 360º
 </Button>

 <Button
 variant="outline"
 size="sm"
 className="text-xs gap-1.5 text-amber-600 border-amber-500/30"
 onClick={() => {
 setSelectedUser(u);
 setIsSanctionModalOpen(true);
 }}
 >
 <ShieldAlert className="size-3.5" />
 Sanção
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>

 {/* SheetPage de Dossiê Judicial 360º */}
 <SheetPage
 open={!!dossierData || isLoadingDossier}
 onOpenChange={(open) => {
 if (!open) {
 setDossierData(null);
 setSelectedUser(null);
 }
 }}
 title="Perfil Detalhado do Usuário (360º)"
 size="lg"
 footer={
 <Button
 variant="outline"
 onClick={() => {
 setDossierData(null);
 setSelectedUser(null);
 }}
 className="h-11 px-4 rounded-xl text-xs font-bold"
 >
 Fechar
 </Button>
 }
 >

 {isLoadingDossier ? (
 <div className="py-12 flex justify-center items-center gap-2 text-sm text-muted-foreground">
 <Loader2 className="size-5 animate-spin" /> Carregando dados do usuário...
 </div>
 ) : dossierData ? (
 <div className="space-y-4 py-2">
 <div className="bg-muted/40 p-3 rounded-xl space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-muted-foreground">ID de Verificação de Segurança:</span>
 <Button
 variant="ghost"
 size="sm"
 className="h-6 text-[10px] gap-1"
 onClick={() => {
 navigator.clipboard.writeText(dossierData.sha256_certification);
 toast.success("Hash copiado!");
 }}
 >
 <Copy className="size-3" /> Copiar Hash
 </Button>
 </div>
 <p className="font-mono text-[11px] break-all text-primary font-bold">
 {dossierData.sha256_certification}
 </p>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 <div className="p-3 border rounded-lg bg-card">
 <span className="text-muted-foreground block text-[10px]">Pedidos / Compras</span>
 <span className="text-base font-bold font-mono">
 {dossierData.dossier.orders.length}
 </span>
 </div>
 <div className="p-3 border rounded-lg bg-card">
 <span className="text-muted-foreground block text-[10px]">Corridas e Fretes</span>
 <span className="text-base font-bold font-mono">
 {dossierData.dossier.mobility_rides.length}
 </span>
 </div>
 <div className="p-3 border rounded-lg bg-card">
 <span className="text-muted-foreground block text-[10px]">Agendamentos</span>
 <span className="text-base font-bold font-mono">
 {dossierData.dossier.appointments.length}
 </span>
 </div>
 <div className="p-3 border rounded-lg bg-card">
 <span className="text-muted-foreground block text-[10px]">Aceites de Termos</span>
 <span className="text-base font-bold font-mono">
 {dossierData.dossier.terms_acceptances.length}
 </span>
 </div>
 </div>

 {/* Detalhe dos Termos Aceitos (LGPD) */}
 <div className="space-y-2">
 <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Consentimento e Aceites Legais (LGPD)
 </h4>
 <div className="border rounded-lg p-3 bg-card space-y-2 text-xs">
 {dossierData.dossier.terms_acceptances.length === 0 ? (
 <p className="text-muted-foreground text-[11px]">
 Nenhum registro explícito de termos associado.
 </p>
 ) : (
 dossierData.dossier.terms_acceptances.map((t: any, idx: number) => (
 <div key={idx} className="flex justify-between border-b pb-1 last:border-0">
 <span className="font-semibold">{t.term_type} (v{t.version})</span>
 <span className="text-muted-foreground">
 {formatDateTime(t.accepted_at)}
 </span>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 ) : null}

 </SheetPage>

 {/* SheetPage de Aplicação de Sanção Disciplinar */}
 <SheetPage
 open={isSanctionModalOpen}
 onOpenChange={setIsSanctionModalOpen}
 title="Aplicar Sanção Disciplinar"
 size="default"
 footer={
 <>
 <Button variant="outline" onClick={() => setIsSanctionModalOpen(false)} className="h-11 px-4 rounded-xl text-xs font-bold">
 Cancelar
 </Button>
 <Button variant="destructive" onClick={handleApplySanction} disabled={isApplyingSanction} className="h-11 px-6 rounded-xl text-xs font-bold">
 {isApplyingSanction ? "Aplicando..." : "Confirmar Sanção"}
 </Button>
 </>
 }
 >
 <div className="space-y-4 py-2">
 <div className="space-y-1">
 <Label>Tipo de Sanção</Label>
 <Select value={sanctionType} onValueChange={setSanctionType}>
 <SelectTrigger>
 <SelectValue placeholder="Selecione a sanção..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="warning">Advertência Formal</SelectItem>
 <SelectItem value="mute_comments">Bloquear Comentários (Mute)</SelectItem>
 <SelectItem value="block_posts">Proibir Postagens no Mural</SelectItem>
 <SelectItem value="block_classifieds">Proibir Criação de Anúncios</SelectItem>
 <SelectItem value="block_commerce">Bloquear Compras / Transações</SelectItem>
 <SelectItem value="ban_temporary">Banimento Temporário (Dias)</SelectItem>
 <SelectItem value="ban_permanent">Banimento Permanente da Conta</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {sanctionType === "ban_temporary" && (
 <div className="space-y-1">
 <Label>Duração do Banimento (Dias)</Label>
 <Input
 type="number"
 min={1}
 value={durationDays}
 onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
 />
 </div>
 )}

 <div className="space-y-1">
 <Label>Motivo & Parecer do Auditor *</Label>
 <Textarea
 value={sanctionReason}
 onChange={(e) => setSanctionReason(e.target.value)}
 placeholder="Descreva a fundamentação legal ou violação de termos..."
 rows={3}
 />
 </div>
 </div>

 </SheetPage>
 </div>
 );
}
