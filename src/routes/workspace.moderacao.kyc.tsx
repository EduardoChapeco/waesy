import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle2, XCircle, Eye, Loader2, Filter, User, AlertTriangle, BadgeAlert } from "lucide-react";
import { toast } from "sonner";

import { listKycVerificationsForAdmin, auditKycVerification } from "@/services/kyc.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/workspace/moderacao/kyc")({
 head: () => ({ meta: [{ title: "Auditoria KYC | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const verifications = await listKycVerificationsForAdmin({ data: { status: "under_review" } });
 return { initialData: verifications };
 } catch {
 return { initialData: [] };
 }
 },
 component: KycAuditPage,
});

function KycAuditPage() {
 const { initialData } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();
 const [statusFilter, setStatusFilter] = useState("under_review");

 const { data: verifications, isLoading } = useQuery({
 queryKey: ["kyc-admin", statusFilter],
 queryFn: () => listKycVerificationsForAdmin({ data: { status: statusFilter } }),
 initialData: statusFilter === "under_review" ? initialData : undefined,
 });

 const { mutate: auditAction, isPending } = useMutation({
 mutationFn: auditKycVerification,
 onSuccess: () => {
 toast.success("Decisão de auditoria registrada com sucesso.");
 queryClient.invalidateQueries({ queryKey: ["kyc-admin"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao processar decisão.");
 },
 });

 const handleAudit = (id: string, decision: "verified" | "rejected", reason?: string) => {
 if (decision === "rejected" && !reason) {
 toast.error("Motivo da rejeição é obrigatório.");
 return;
 }
 auditAction({ data: { verification_id: id, decision, rejection_reason: reason } });
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <ShieldCheck size={28} className="text-emerald-600" /> Auditoria KYC e Identidade
 </h1>
 <p className="text-muted-foreground text-sm">Central de averiguação de selos oficiais (Identity Vault).</p>
 </div>
 <div className="flex items-center gap-2">
 <Filter size={16} className="text-muted-foreground" />
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder="Filtrar por Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="under_review">Em Análise</SelectItem>
 <SelectItem value="verified">Aprovados (Verificados)</SelectItem>
 <SelectItem value="rejected">Rejeitados</SelectItem>
 <SelectItem value="all">Todos</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {isLoading ? (
 <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" size={40} /></div>
 ) : verifications?.length === 0 ? (
 <div className="py-20 text-center space-y-4 bg-muted/10 rounded-2xl p-8 border border-dashed">
 <BadgeAlert size={48} className="text-muted-foreground/30 mx-auto" />
 <h2 className="text-lg font-bold text-foreground">Nenhuma submissão encontrada</h2>
 <p className="text-sm text-muted-foreground">Não há processos KYC pendentes na fila.</p>
 </div>
 ) : (
 <div className="grid gap-4">
 {verifications?.map((v: any) => (
 <div key={v.id} className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
 <div className="flex justify-between items-start">
 <div>
 <h3 className="font-bold text-lg flex items-center gap-2">
 <User size={20} className="text-primary" /> {v.profile?.full_name || "Usuário Desconhecido"}
 </h3>
 <div className="flex gap-2 text-xs text-muted-foreground mt-1">
 <span>CPF: {v.profile?.cpf || "Não Informado"}</span>
 <span>•</span>
 <span>Tipo: {v.entity_type}</span>
 {v.registration_number && (
 <>
 <span>•</span>
 <span>Doc: {v.registration_number}</span>
 </>
 )}
 </div>
 </div>
 <Badge variant={v.status === 'verified' ? 'default' : v.status === 'rejected' ? 'destructive' : 'secondary'}>
 {v.status}
 </Badge>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-2xl border">
 <div>
 <p className="text-xs font-bold mb-1">Doc Frente</p>
 {v.document_front_url ? (
 <a href={v.document_front_url} target="_blank" rel="noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
 <Eye size={14} /> Ver Documento
 </a>
 ) : <span className="text-xs text-muted-foreground">N/A</span>}
 </div>
 <div>
 <p className="text-xs font-bold mb-1">Doc Verso</p>
 {v.document_back_url ? (
 <a href={v.document_back_url} target="_blank" rel="noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
 <Eye size={14} /> Ver Documento
 </a>
 ) : <span className="text-xs text-muted-foreground">N/A</span>}
 </div>
 <div>
 <p className="text-xs font-bold mb-1">Selfie Liveness</p>
 {v.selfie_url ? (
 <a href={v.selfie_url} target="_blank" rel="noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
 <Eye size={14} /> Ver Selfie
 </a>
 ) : <span className="text-xs text-muted-foreground">N/A</span>}
 </div>
 <div>
 <p className="text-xs font-bold mb-1">Comprovante</p>
 {v.proof_of_address_url ? (
 <a href={v.proof_of_address_url} target="_blank" rel="noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
 <Eye size={14} /> Ver Comprovante
 </a>
 ) : <span className="text-xs text-muted-foreground">N/A</span>}
 </div>
 </div>

 {v.status === 'under_review' && (
 <div className="flex items-center gap-3 pt-2">
 <form 
 className="flex-1 flex gap-3" 
 onSubmit={(e: any) => { 
 e.preventDefault(); 
 handleAudit(v.id, "rejected", e.target.reason.value); 
 }}
 >
 <Input name="reason" placeholder="Motivo da rejeição (se houver)..." className="text-sm" />
 <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
 <XCircle size={16} className="mr-2" /> Rejeitar
 </Button>
 </form>
 <Button 
 variant="default" 
 size="sm" 
 className="bg-emerald-600 hover:bg-emerald-700" 
 disabled={isPending}
 onClick={() => handleAudit(v.id, "verified")}
 >
 <CheckCircle2 size={16} className="mr-2" /> Aprovar Selo Oficial
 </Button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
