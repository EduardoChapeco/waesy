/**
 * _store.conta.verificacao.tsx — Autoatendimento de Verificação KYC & Selo Oficial
 * Submissão de Documentos Profissionais (OAB, CRC, CRM, CNH, CNPJ) e Biometria.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { 
 ShieldCheck, 
 IdentificationCard, 
 CheckCircle, 
 WarningCircle, 
 Clock, 
 UploadSimple, 
 Camera,
 Scales,
 Briefcase
} from "@phosphor-icons/react";
import { getMyKycStatus, submitKycVerification } from "@/services/kyc.functions";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/verificacao")({
 head: () => ({ meta: [{ title: "Verificação de Identidade & KYC | Waesy" }] }),
 loader: async () => {
 try {
 const kyc = await getMyKycStatus();
 return { kyc };
 } catch {
 return { kyc: { status: "pending_submission" } };
 }
 },
 component: KycVerificationPage,
});

function KycVerificationPage() {
 const { kyc } = ((Route.useLoaderData?.() as any) || {});
 const [isPending, startTransition] = useTransition();

 const [entityType, setEntityType] = useState<"individual" | "lawyer" | "accountant" | "doctor" | "driver" | "company">(
 (kyc?.entity_type as any) || "individual"
 );
 const [regNumber, setRegNumber] = useState(kyc?.registration_number || "");
 const [regState, setRegState] = useState(kyc?.registration_state || "SC");
 const [docFrontUrl, setDocFrontUrl] = useState(kyc?.document_front_url || "");
 const [selfieUrl, setSelfieUrl] = useState(kyc?.selfie_url || "");

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!docFrontUrl) {
 toast.error("Por favor, anexe a foto do seu documento de identificação.");
 return;
 }

 if (!selfieUrl) {
 toast.error("Por favor, tire ou anexe sua selfie segurando o documento.");
 return;
 }

 startTransition(async () => {
 try {
 await submitKycVerification({
 data: {
 entity_type: entityType,
 registration_number: regNumber || undefined,
 registration_state: regState || undefined,
 document_front_url: docFrontUrl,
 selfie_url: selfieUrl,
 },
 });
 toast.success("Documentos enviados com sucesso! A auditoria analisará seus dados em até 24h.");
 } catch (err: any) {
 toast.error(err.message || "Erro ao enviar documentos");
 }
 });
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
 {/* ── 1. Clean Minimalist Header ── */}
 <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
 <div className="flex items-center gap-3">
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
 Verificação
 </h1>
 {kyc?.status === "verified" && (
 <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
 Verificado
 </Badge>
 )}
 </div>
 </div>

 {/* Status Banner */}
 {kyc?.status === "verified" ? (
 <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-500">
 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
 <ShieldCheck className="h-7 w-7" />
 </div>
 <div>
 <h3 className="text-base font-bold">Perfil Verificado Oficialmente</h3>
 <p className="text-xs opacity-90">
 Selo de {kyc.badge_granted || "Profissional Verificado"} ativo na sua conta e vitrines.
 </p>
 </div>
 </div>
 ) : kyc?.status === "under_review" ? (
 <div className="mb-6 flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-500">
 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
 <Clock className="h-7 w-7" />
 </div>
 <div>
 <h3 className="text-base font-bold">Documentação em Auditoria</h3>
 <p className="text-xs opacity-90">
 Nossa equipe de compliance está validando seus dados. Você receberá um aviso assim que for aprovado.
 </p>
 </div>
 </div>
 ) : null}

 {/* Formulário de Envio */}
 <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Tipo de Perfil a ser Verificado
 </label>
 <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
 {[
 { id: "individual", label: "Cidadão / CPF", icon: IdentificationCard },
 { id: "lawyer", label: "Advogado (OAB)", icon: Scales },
 { id: "accountant", label: "Contador (CRC)", icon: Briefcase },
 { id: "driver", label: "Entregador (CNH)", icon: ShieldCheck },
 { id: "doctor", label: "Saúde (CRM/CRP)", icon: ShieldCheck },
 { id: "company", label: "Empresa (CNPJ)", icon: Briefcase },
 ].map((type) => {
 const Icon = type.icon;
 const isSelected = entityType === type.id;
 return (
 <button
 key={type.id}
 type="button"
 onClick={() => setEntityType(type.id as any)}
 className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
 isSelected
 ? "border-primary bg-primary/10 text-primary"
 : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
 }`}
 >
 <Icon className="h-6 w-6" />
 <span className="text-xs font-semibold">{type.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Campos Condicionais de Registro */}
 {entityType !== "individual" && (
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <div>
 <label className="text-xs font-bold text-foreground">
 Número do Registro ({entityType === "lawyer" ? "OAB" : entityType === "accountant" ? "CRC" : entityType === "company" ? "CNPJ" : "Registro de Classe"})
 </label>
 <input
 type="text"
 placeholder="Ex: 58941"
 value={regNumber}
 onChange={(e) => setRegNumber(e.target.value)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 required
 />
 </div>

 <div>
 <label className="text-xs font-bold text-foreground">Estado (UF)</label>
 <select
 value={regState}
 onChange={(e) => setRegState(e.target.value)}
 className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
 >
 <option value="SC">Santa Catarina (SC)</option>
 <option value="RS">Rio Grande do Sul (RS)</option>
 <option value="PR">Paraná (PR)</option>
 <option value="SP">São Paulo (SP)</option>
 <option value="RJ">Rio de Janeiro (RJ)</option>
 </select>
 </div>
 </div>
 )}

 {/* Upload de Documentos */}
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
 <div className="space-y-2">
 <label className="text-xs font-bold text-foreground">Documento Frente/Verso (RG, CNH ou Carteira)</label>
 <ImageUpload
 value={docFrontUrl || undefined}
 onChange={(url) => setDocFrontUrl(url || "")}
 bucket="cms-media"
 aspectPreset="widescreen"
 helperText="Anexe foto nítida do documento"
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-foreground">Selfie com Documento</label>
 <ImageUpload
 value={selfieUrl || undefined}
 onChange={(url) => setSelfieUrl(url || "")}
 bucket="cms-media"
 aspectPreset="square"
 helperText="Foto segurando o documento"
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-border">
 <button
 type="submit"
 disabled={isPending}
 className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
 >
 <ShieldCheck className="h-4 w-4" />
 {isPending ? "Enviando..." : "Submeter para Verificação"}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
