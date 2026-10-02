import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UserCheck, CheckCircle2, XCircle, AlertCircle, FileText, Eye, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { listKycVerifications, reviewKycVerification } from "@/services/master.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/datetime";

import { ErrorState } from "@/components/state/states";

export const Route = createFileRoute("/admin-master/kyc")({
 head: () => ({ meta: [{ title: "Verificação Facial e KYC | Admin Waesy" }] }),
 loader: async () => {
 try {
 const kycList = await listKycVerifications({ data: { status: "all" } }).catch(() => []);
 return { kycList: kycList || [] };
 } catch {
 return { kycList: [] };
 }
 },
 component: AdminKycPage,
 errorComponent: () => (
 <div className="mx-auto max-w-xl px-4 py-20">
 <ErrorState
 title="Verificações KYC Indisponíveis"
 description="Não foi possível carregar a lista de verificações faciais no momento. Tente novamente."
 onRetry={() => {
 if (typeof window !== "undefined") window.location.reload();
 }}
 />
 </div>
 ),
});

function AdminKycPage() {
 const { kycList: initialList } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
 const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | "requires_resubmission" | null>(null);
 const [rejectionReason, setRejectionReason] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [filterStatus, setFilterStatus] = useState<string>("all");

 const filteredList = (initialList || []).filter((k: any) => {
 if (filterStatus === "all") return true;
 return k.status === filterStatus;
 });

 const handleOpenReview = (kyc: any, action: typeof reviewAction) => {
 setSelectedKyc(kyc);
 setReviewAction(action);
 setRejectionReason("");
 };

 const handleExecuteReview = async () => {
 if (!selectedKyc || !reviewAction) return;

 if (reviewAction === "rejected" && !rejectionReason.trim()) {
 toast.error("Informe a justificativa da recusa da verificação.");
 return;
 }

 setIsSubmitting(true);
 try {
 await reviewKycVerification({
 data: {
 kycId: selectedKyc.id,
 status: reviewAction,
 rejectionReason: rejectionReason || undefined,
 },
 });

 toast.success(
 reviewAction === "approved"
 ? "Usuário verificado com sucesso! Selo de autenticidade concedido."
 : "Status da verificação atualizado.",
 );

 setSelectedKyc(null);
 setReviewAction(null);
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao processar KYC");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
 <div>
 <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
 <UserCheck className="size-6 text-info" />
 Verificação e KYC
 </h1>
 <p className="text-sm text-muted-foreground">
 Auditoria de selfies, provas de vida e documentos oficiais para emissão do selo de perfil autêntico.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 variant={filterStatus === "all" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("all")}
 >
 Todos ({initialList?.length || 0})
 </Button>
 <Button
 variant={filterStatus === "pending" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("pending")}
 >
 Pendentes (
 {(initialList || []).filter((k: any) => k.status === "pending").length}
 )
 </Button>
 <Button
 variant={filterStatus === "approved" ? "default" : "outline"}
 size="sm"
 onClick={() => setFilterStatus("approved")}
 >
 Aprovados
 </Button>
 </div>
 </div>

 {filteredList.length === 0 ? (
 <div className="border-0 rounded-lg p-12 text-center">
 <ShieldCheck className="size-12 text-muted-foreground mx-auto mb-3 opacity-40" />
 <h3 className="text-base font-bold text-foreground">Nenhuma verificação na fila</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Todas as solicitações de verificação de identidade foram revisadas.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-6">
 {filteredList.map((k: any) => (
 <div
 key={k.id}
 className=" bg-card rounded-lg p-5 space-y-4"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
 <div className="flex items-center gap-2">
 <Badge
 variant={
 k.status === "approved"
 ? "default"
 : k.status === "pending"
 ? "destructive"
 : "secondary"
 }
 >
 {k.status === "approved"
 ? "✓ Verificado"
 : k.status === "pending"
 ? "Pendente de Aprovação"
 : "Recusado"}
 </Badge>
 <span className="text-xs font-mono uppercase font-bold text-muted-foreground">
 Doc: {k.document_type} • Nº {k.document_number}
 </span>
 </div>
 <span className="text-xs text-muted-foreground">
 Enviado em {formatDateTime(k.created_at)}
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <span className="text-[11px] font-bold uppercase text-muted-foreground block mb-2">
 Selfie / Prova de Vida
 </span>
 <div className="aspect-square rounded-lg overflow-hidden bg-muted/20">
 <img
 src={k.selfie_url}
 alt="Selfie"
 className="w-full h-full object-cover"
 />
 </div>
 </div>

 <div>
 <span className="text-[11px] font-bold uppercase text-muted-foreground block mb-2">
 Documento Oficial (Frente)
 </span>
 <div className="aspect-square rounded-lg overflow-hidden bg-muted/20">
 <img
 src={k.document_front_url}
 alt="Documento Frente"
 className="w-full h-full object-cover"
 />
 </div>
 </div>

 {k.document_back_url && (
 <div>
 <span className="text-[11px] font-bold uppercase text-muted-foreground block mb-2">
 Documento Oficial (Verso)
 </span>
 <div className="aspect-square rounded-lg overflow-hidden bg-muted/20">
 <img
 src={k.document_back_url}
 alt="Documento Verso"
 className="w-full h-full object-cover"
 />
 </div>
 </div>
 )}
 </div>

 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
 <div className="text-xs text-muted-foreground">
 Nome do Solicitante:{" "}
 <span className="font-bold text-foreground">{k.full_name}</span>
 </div>

 {k.status === "pending" && (
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 className="text-xs text-destructive border-destructive/30"
 onClick={() => handleOpenReview(k, "rejected")}
 >
 <XCircle className="size-3.5 mr-1" />
 Recusar
 </Button>
 <Button
 variant="default"
 size="sm"
 className="text-xs bg-info hover:bg-info font-bold"
 onClick={() => handleOpenReview(k, "approved")}
 >
 <CheckCircle2 className="size-3.5 mr-1" />
 Aprovar e Conceder Selo
 </Button>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Dialog de Confirmação de Revisão KYC */}
 <Dialog
 open={!!selectedKyc && !!reviewAction}
 onOpenChange={(open) => {
 if (!open) {
 setSelectedKyc(null);
 setReviewAction(null);
 }
 }}
 >
 <DialogContent>
 <DialogHeader>
 <DialogTitle>
 {reviewAction === "approved"
 ? "Aprovar Verificação de Identidade Facial"
 : "Recusar Verificação de Identidade"}
 </DialogTitle>
 <DialogDescription>
 {reviewAction === "approved"
 ? "O selo de perfil autêntico e verificado será concedido imediatamente."
 : "Informe o motivo para que o usuário possa corrigir os documentos."}
 </DialogDescription>
 </DialogHeader>

 {reviewAction === "rejected" && (
 <div className="space-y-2 py-2">
 <Label>Motivo da Recusa *</Label>
 <Textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder="Ex: Documento ilegível, selfie com reflexo ou nome divergente..."
 rows={3}
 />
 </div>
 )}

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => {
 setSelectedKyc(null);
 setReviewAction(null);
 }}
 >
 Cancelar
 </Button>
 <Button
 variant={reviewAction === "approved" ? "default" : "destructive"}
 onClick={handleExecuteReview}
 disabled={isSubmitting}
 className={reviewAction === "approved" ? "bg-info hover:bg-info" : ""}
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" /> Processando...
 </>
 ) : reviewAction === "approved" ? (
 "Confirmar Aprovação"
 ) : (
 "Confirmar Recusa"
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
